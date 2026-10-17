from fastapi import APIRouter, HTTPException, status
import logging
from ..schemas.chat import AskRequest, AskResponse, AskSource, ChatMessage
from ..services.rag_service import rag_service
from ..services.llm_service import llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Ask Q&A"])


@router.post(
    "/ask",
    response_model=AskResponse,
    summary="Direct Q&A with Vector Citations",
    description="Takes a question, searches Pinecone for personal context chunks, and returns cited answer."
)
async def ask_endpoint(payload: AskRequest):
    """
    Direct Q&A endpoint with structured citations and Pinecone vector search.
    """
    try:
        question = payload.question.strip()
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question cannot be empty."
            )

        # Retrieve relevant context & cited sources
        rag_context, raw_sources = await rag_service.retrieve_context(question, top_k=5)

        # Build message and generate reply
        messages = [ChatMessage(role="user", content=question)]
        answer, _ = await llm_service.generate_chat_reply(messages, rag_context)

        sources = [
            AskSource(
                index=s["index"],
                id=s["id"],
                score=s["score"],
                metadata=s["metadata"]
            )
            for s in raw_sources
        ]

        return AskResponse(
            answer=answer,
            sources=sources
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error processing /api/ask: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while answering your question: {str(e)}"
        )
