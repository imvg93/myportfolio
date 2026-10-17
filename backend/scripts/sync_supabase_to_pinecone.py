#!/usr/bin/env python3
"""
Synchronizes public portfolio data from Supabase (or normalized dataset) to Pinecone.
Embeds text chunks locally using sentence-transformers 'all-MiniLM-L6-v2' (384 dimensions).
No external embedding API calls or credits required.

Note on HF API:
  The legacy endpoint api-inference.huggingface.co was fully decommissioned.
  The replacement is router.huggingface.co/hf-inference/models/{model_id} (requires credits).
  This script uses local inference to avoid that dependency.

Guarantees:
- Only records with visibility == 'public' are embedded and upserted.
- Strict 384-dimension vector assertion.
- Metadata includes visibility: 'public' for runtime safety.
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from typing import List, Dict, Any
import httpx
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")

LOCAL_DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "v2_drafts" / "portfolio_data.v2.public.json"
AUTHORITATIVE_DATASET_FILE = Path(__file__).resolve().parent.parent / "data" / "v2_drafts" / "portfolio_data.v2.normalized.json"
EXPECTED_DIMENSION = 384
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def require_env(name: str) -> str:
    val = os.getenv(name, "").strip()
    if not val:
        print(f"❌ Error: Required environment variable missing: {name}", file=sys.stderr)
        sys.exit(1)
    return val


def get_authoritative_portfolio_ids() -> List[str]:
    """
    Loads the authoritative 25-record portfolio dataset to establish exact ID boundaries.
    If the file is missing or contains an unexpected record count, returns an empty list
    so that any deletion operation is safely aborted.
    """
    if not AUTHORITATIVE_DATASET_FILE.exists():
        return []
    try:
        with open(AUTHORITATIVE_DATASET_FILE, "r", encoding="utf-8") as f:
            items = json.load(f)
        if len(items) == 25:
            return [r["source_id"] for r in items if "source_id" in r]
    except Exception:
        return []
    return []


def handle_targeted_pruning(index, public_records: List[Dict[str, Any]], prune_enabled: bool, dry_run: bool):
    """
    Safe, targeted cleanup mechanism for vectors that belong to this portfolio
    dataset but are no longer public.
    
    Safeguards:
    - Never uses delete_all=True or unscoped deletes.
    - Rejects execution if authoritative portfolio ID list cannot be established.
    - Confines deletion candidates strictly to the known portfolio dataset ID namespace.
    - Only executes if --prune-nonpublic is explicitly specified and not in dry-run mode.
    """
    if not prune_enabled:
        return

    authoritative_ids = get_authoritative_portfolio_ids()
    if not authoritative_ids or len(authoritative_ids) != 25:
        print(
            "⚠️ Pruning safeguard triggered: Cannot establish complete authoritative 25-record portfolio ID list. "
            "Aborting pruning safely without modifying Pinecone.",
            file=sys.stderr
        )
        return

    public_ids = {r.get("source_id") or str(r.get("id")) for r in public_records}
    # Target strictly portfolio IDs that are no longer public
    ids_to_prune = sorted([sid for sid in authoritative_ids if sid not in public_ids])

    if not ids_to_prune:
        print("✅ Cleanup check: Zero non-public portfolio vectors need pruning.")
        return

    if dry_run:
        print(f"\n🔍 DRY-RUN MODE: --prune-nonpublic is set. Would safely delete {len(ids_to_prune)} non-public portfolio vector IDs: {ids_to_prune}. Zero Pinecone deletes executed.")
        return

    if index is None:
        print("❌ Error: Pinecone index not provided for pruning.", file=sys.stderr)
        return

    print(f"\n🗑️ Executing safe targeted pruning for {len(ids_to_prune)} non-public portfolio vector IDs: {ids_to_prune}...")
    index.delete(ids=ids_to_prune)
    print(f"✅ Targeted pruning complete. Removed {len(ids_to_prune)} non-public vectors.")


# ──────────────────────────────────────────────────────────
# Local embedding (primary — no API credits required)
# ──────────────────────────────────────────────────────────
_local_model = None


def _load_local_model():
    """Lazy-load the sentence-transformers model on first use."""
    global _local_model
    if _local_model is not None:
        return _local_model
    try:
        from sentence_transformers import SentenceTransformer
        print(f"📥 Loading local model '{EMBEDDING_MODEL}' (first run downloads ~90 MB)...")
        _local_model = SentenceTransformer(EMBEDDING_MODEL)
        print(f"✅ Local model loaded. Dimension: {_local_model.get_sentence_embedding_dimension()}")
        return _local_model
    except ImportError:
        raise RuntimeError(
            "sentence-transformers is not installed. "
            "Run: backend/venv/bin/pip install sentence-transformers"
        )


def get_embedding_local(text: str) -> List[float]:
    """Generate 384-dim embedding using local sentence-transformers (no API, no credits)."""
    model = _load_local_model()
    vector = model.encode(text, normalize_embeddings=True).tolist()
    if len(vector) != EXPECTED_DIMENSION:
        raise ValueError(
            f"Local embedding dimension mismatch: expected {EXPECTED_DIMENSION}, got {len(vector)}"
        )
    return vector


# ──────────────────────────────────────────────────────────
# HF Router API fallback (requires credits / PRO plan)
# Updated URL: router.huggingface.co replaces the defunct
# api-inference.huggingface.co (decommissioned 2025)
# ──────────────────────────────────────────────────────────
def to_single_vector(raw_embedding: Any) -> List[float]:
    if isinstance(raw_embedding, list) and len(raw_embedding) > 0 and isinstance(raw_embedding[0], list):
        length = len(raw_embedding[0])
        sums = [0.0] * length
        for token_vec in raw_embedding:
            for j in range(length):
                sums[j] += float(token_vec[j] or 0.0)
        return [s / len(raw_embedding) for s in sums]
    return [float(x) for x in raw_embedding]


def get_embedding_hf_api(hf_api_key: str, text: str) -> List[float]:
    """HF Router API path — requires active credits. Kept for future use."""
    url = f"https://router.huggingface.co/hf-inference/models/{EMBEDDING_MODEL}"
    headers = {
        "Authorization": f"Bearer {hf_api_key}",
        "Content-Type": "application/json",
    }
    payload = {"inputs": text, "options": {"wait_for_model": True}}

    with httpx.Client(timeout=35.0) as client:
        resp = client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(f"HF API embedding error ({resp.status_code}): {resp.text[:300]}")
        vector = to_single_vector(resp.json())
        if len(vector) != EXPECTED_DIMENSION:
            raise ValueError(f"Embedding dimension mismatch: expected {EXPECTED_DIMENSION}, got {len(vector)}")
        return vector


def get_embedding(text: str) -> List[float]:
    """Primary embedding entry point — always uses local model."""
    return get_embedding_local(text)


def fetch_public_records() -> List[Dict[str, Any]]:
    """Fetch public records from Supabase if configured, otherwise fallback to local normalized dataset."""
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if supabase_url and service_role_key:
        print(f"📡 Querying Supabase: public.portfolio_data WHERE visibility = 'public'...")
        endpoint = f"{supabase_url}/rest/v1/portfolio_data?visibility=eq.public"
        headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
        }
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(endpoint, headers=headers)
                if resp.status_code == 200:
                    records = resp.json()
                    if records:
                        print(f"✅ Fetched {len(records)} public records directly from Supabase!")
                        return records
        except Exception as e:
            print(f"⚠️ Supabase fetch warning: {e}. Falling back to local v2 public dataset.", file=sys.stderr)

    if LOCAL_DATA_FILE.exists():
        print(f"📂 Loading public records from local dataset: {LOCAL_DATA_FILE.name}")
        with open(LOCAL_DATA_FILE, "r", encoding="utf-8") as f:
            all_records = json.load(f)
        return [r for r in all_records if r.get("visibility") == "public"]

    print(f"❌ Error: No data source available. Run generate_v2_dataset.py first.", file=sys.stderr)
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Synchronize public portfolio records to Pinecone")
    parser.add_argument("--dry-run", action="store_true", help="Validate embedding dimension and records without upserting to Pinecone")
    parser.add_argument("--prune-nonpublic", action="store_true", help="Explicitly enable safe, targeted pruning of non-public portfolio vectors")
    args = parser.parse_args()

    records = fetch_public_records()
    print(f"📋 Found {len(records)} public records eligible for Pinecone indexation.")

    # Validate that ZERO private records are in this list
    private_leaks = [r for r in records if r.get("visibility") != "public"]
    if private_leaks:
        print(f"❌ CRITICAL SECURITY ERROR: Non-public records found in sync list! Aborting.", file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print("\n🔍 DRY-RUN MODE: All public records verified. No Pinecone changes made.")
        if args.prune_nonpublic:
            handle_targeted_pruning(None, records, prune_enabled=True, dry_run=True)
        return

    pinecone_key = require_env("PINECONE_API_KEY")
    pinecone_index_name = require_env("PINECONE_INDEX_NAME")

    # Pre-load local model so the download happens before Pinecone connection
    _load_local_model()

    print(f"🌲 Connecting to Pinecone index: '{pinecone_index_name}'...")
    from pinecone import Pinecone
    pc = Pinecone(apiKey=pinecone_key)
    index = pc.Index(pinecone_index_name)

    # Check stats if available
    try:
        stats = index.describe_index_stats()
        print(f"   Current vector count in index: {stats.get('total_vector_count', 'unknown')}")
    except Exception as e:
        print(f"⚠️ Notice: describe_index_stats: {e}")

    # Safe targeted pruning if explicitly enabled
    if args.prune_nonpublic:
        handle_targeted_pruning(index, records, prune_enabled=True, dry_run=False)

    print(f"⚡ Generating {EXPECTED_DIMENSION}-dim embeddings with Hugging Face ({EMBEDDING_MODEL})...")
    vectors_to_upsert = []

    for i, r in enumerate(records):
        source_id = r.get("source_id") or str(r.get("id"))
        content = r.get("content", "")
        title = r.get("title", f"Record {source_id}")
        category = r.get("category", "General")
        year = r.get("year")

        try:
            vec = get_embedding(content)
            metadata = {
                "source_id": source_id,
                "title": title,
                "category": category,
                "content": content,
                "visibility": "public"
            }
            if year is not None:
                metadata["year"] = int(year)

            vectors_to_upsert.append({
                "id": str(source_id),
                "values": vec,
                "metadata": metadata
            })
            print(f"[{i+1}/{len(records)}] Embedded: '{title}' ({source_id}) ✅")
            time.sleep(0.2)  # Avoid HF rate limits
        except Exception as err:
            print(f"❌ Failed to embed '{title}': {err}", file=sys.stderr)

    if not vectors_to_upsert:
        print("❌ No vectors generated. Exiting.", file=sys.stderr)
        sys.exit(1)

    print(f"\n🚀 Upserting {len(vectors_to_upsert)} vectors to Pinecone index '{pinecone_index_name}'...")
    index.upsert(vectors=vectors_to_upsert)

    print("=" * 60)
    print("🎉 Pinecone Synchronization Complete!")
    print(f"   Target Index:     {pinecone_index_name}")
    print(f"   Model:            {EMBEDDING_MODEL}")
    print(f"   Vector Dimension: {EXPECTED_DIMENSION}")
    print(f"   Vectors Synced:   {len(vectors_to_upsert)} (All flagged visibility='public')")
    print("=" * 60)


if __name__ == "__main__":
    main()
