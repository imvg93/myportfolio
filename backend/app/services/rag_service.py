from typing import List, Dict, Any, Tuple, Optional
import logging
import httpx
from ..config import settings

logger = logging.getLogger(__name__)

# Never return records containing the owner's father-related personal history,
# including IDs that may remain in older Pinecone indexes with stale metadata.
OWNER_PRIVATE_FAMILY_SOURCE_IDS = {
    "v2_private_family_history",
    "v2_private_emotional_reactions",
    "owner_restricted_family_history",
    "owner_restricted_emotional_reactions",
    "girish_qa_027",
    "family_background_raw_private_20261020",
    "bio_002",
    "bio_003",
    "detail_family_private",
}


def to_single_vector(raw_embedding: Any) -> List[float]:
    """Convert HF token-level matrix or raw vector into a single 1D sentence embedding."""
    if isinstance(raw_embedding, list) and len(raw_embedding) > 0 and isinstance(raw_embedding[0], list):
        # Average across tokens to produce single sentence vector
        length = len(raw_embedding[0])
        sums = [0.0] * length
        for token_vec in raw_embedding:
            for j in range(length):
                sums[j] += float(token_vec[j] or 0.0)
        return [s / len(raw_embedding) for s in sums]
    elif isinstance(raw_embedding, list):
        return [float(x) for x in raw_embedding]
    raise ValueError("Invalid embedding structure received from model.")


class RAGService:
    """Service handling vector embedding generation and Pinecone similarity search."""

    def __init__(self):
        self._pinecone_client = None
        self._index = None

    def _get_pinecone_index(self):
        """Lazy load and cache Pinecone client & index."""
        if self._index is not None:
            return self._index

        if not settings.PINECONE_API_KEY:
            logger.warning("PINECONE_API_KEY is not configured.")
            return None

        try:
            from pinecone import Pinecone
            self._pinecone_client = Pinecone(apiKey=settings.PINECONE_API_KEY)
            self._index = self._pinecone_client.Index(settings.PINECONE_INDEX_NAME)
            return self._index
        except Exception as e:
            logger.error("Failed to initialize Pinecone client: %s", e)
            return None

    async def get_embedding(self, text: str) -> List[float]:
        """Generate 384-dim vector embedding using Hugging Face inference API."""
        if not settings.HUGGINGFACE_API_KEY:
            raise ValueError("HUGGINGFACE_API_KEY is not configured.")

        url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{settings.EMBEDDING_MODEL}"
        headers = {
            "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "inputs": text,
            "options": {"wait_for_model": True}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Hugging Face embedding request failed ({resp.status_code}): {resp.text}"
                )
            data = resp.json()

        return to_single_vector(data)

    async def retrieve_context(self, query: str, top_k: int = 5) -> Tuple[str, List[Dict[str, Any]]]:
        """Retrieve relevant context chunks from Pinecone given a user query."""
        index = self._get_pinecone_index()
        if not index:
            return "", []

        try:
            vector = await self.get_embedding(query)
            query_res = index.query(
                vector=vector,
                top_k=top_k,
                include_metadata=True,
                filter={
                    "$and": [
                        {"visibility": {"$eq": "public"}},
                        {"source_id": {"$nin": sorted(OWNER_PRIVATE_FAMILY_SOURCE_IDS)}},
                    ]
                }
            )

            matches = query_res.get("matches", []) if isinstance(query_res, dict) else getattr(query_res, "matches", [])
            sources = []
            context_blocks = []

            for idx, match in enumerate(matches):
                metadata = getattr(match, "metadata", None) or (match.get("metadata", {}) if isinstance(match, dict) else {})
                content = metadata.get("content", "")
                title = metadata.get("title", f"Source {idx + 1}")
                year = metadata.get("year")
                year_str = f" (Year: {year})" if year else ""

                if content:
                    context_blocks.append(f"- {title}{year_str}: {content}")

                match_id = getattr(match, "id", None) or (match.get("id") if isinstance(match, dict) else None)
                score = getattr(match, "score", None) or (match.get("score") if isinstance(match, dict) else None)

                sources.append({
                    "index": idx,
                    "id": match_id,
                    "score": score,
                    "metadata": metadata
                })

            if not context_blocks:
                return "", sources

            rag_context = (
                "Use the following personal context when helpful. "
                "If irrelevant to the user question, answer normally but stay consistent with it:\n"
                + "\n".join(context_blocks)
            )
            return rag_context, sources

        except Exception as e:
            logger.warning("RAG retrieval failed gracefully: %s", e)
            return "", []


rag_service = RAGService()
