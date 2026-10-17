#!/usr/bin/env python3
"""
@deprecated OBSOLETE - Use `backend/scripts/sync_supabase_to_pinecone.py` instead.
This legacy script relied on SUPABASE_JSON_URL storage blobs instead of Supabase public.portfolio_data.
"""

import os
import sys
import time
import random
from pathlib import Path
from typing import List, Dict, Any
import httpx
from dotenv import load_dotenv

# Load environment variables from root or backend
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")

EXPECTED_DIMENSION = 384
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def require_env(name: str) -> str:
    val = os.getenv(name, "").strip()
    if not val:
        print(f"❌ Error: Missing required environment variable: {name}", file=sys.stderr)
        sys.exit(1)
    return val


def to_single_vector(raw_embedding: Any) -> List[float]:
    """Average token-level embeddings if 2D matrix is returned."""
    if isinstance(raw_embedding, list) and len(raw_embedding) > 0 and isinstance(raw_embedding[0], list):
        length = len(raw_embedding[0])
        sums = [0.0] * length
        for token_vec in raw_embedding:
            for j in range(length):
                sums[j] += float(token_vec[j] or 0.0)
        return [s / len(raw_embedding) for s in sums]
    return [float(x) for x in raw_embedding]


def get_embedding(hf_api_key: str, text: str) -> List[float]:
    url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{EMBEDDING_MODEL}"
    headers = {
        "Authorization": f"Bearer {hf_api_key}",
        "Content-Type": "application/json",
    }
    payload = {"inputs": text, "options": {"wait_for_model": True}}

    with httpx.Client(timeout=30.0) as client:
        resp = client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(f"HF embedding error ({resp.status_code}): {resp.text}")
        return to_single_vector(resp.json())


def main():
    print("🚀 Starting Pinecone Upload via Python...")

    pinecone_key = require_env("PINECONE_API_KEY")
    pinecone_index_name = require_env("PINECONE_INDEX_NAME")
    hf_key = require_env("HUGGINGFACE_API_KEY")
    supabase_json_url = require_env("SUPABASE_JSON_URL")

    print(f"📦 Target Index: {pinecone_index_name}")
    print(f"🔗 Source JSON: {supabase_json_url}")

    # Fetch data
    print("📥 Fetching biographical knowledge JSON...")
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(supabase_json_url)
        if resp.status_code != 200:
            print(f"❌ Failed to fetch JSON: HTTP {resp.status_code}", file=sys.stderr)
            sys.exit(1)
        items = resp.json()

    if not isinstance(items, list):
        print("❌ Error: Expected JSON output to be a list of records.", file=sys.stderr)
        sys.exit(1)

    print(f"📝 Found {len(items)} knowledge records to process.")

    # Connect to Pinecone
    try:
        from pinecone import Pinecone
        pc = Pinecone(apiKey=pinecone_key)
        index = pc.Index(pinecone_index_name)
    except Exception as e:
        print(f"❌ Failed to connect to Pinecone: {e}", file=sys.stderr)
        sys.exit(1)

    uploaded_count = 0
    skipped_count = 0
    failed_count = 0

    for i, record in enumerate(items):
        record_id = record.get("id")
        content = record.get("content")
        title = record.get("title", f"Record {record_id}")
        category = record.get("category")
        year = record.get("year")

        if not record_id or not content:
            print(f"⚠️ Skipping item {i}: missing id or content.")
            skipped_count += 1
            continue

        try:
            vector = get_embedding(hf_key, str(content))
            if len(vector) != EXPECTED_DIMENSION:
                print(f"⚠️ Vector dimension mismatch: {len(vector)} != {EXPECTED_DIMENSION}")

            metadata: Dict[str, Any] = {"content": str(content)}
            if title:
                metadata["title"] = str(title)
            if category:
                metadata["category"] = str(category)
            if year:
                try:
                    metadata["year"] = int(year)
                except ValueError:
                    pass

            index.upsert([
                {
                    "id": str(record_id),
                    "values": vector,
                    "metadata": metadata
                }
            ])

            uploaded_count += 1
            print(f"[{uploaded_count}/{len(items)}] Uploaded: '{title}' ✅")

        except Exception as err:
            failed_count += 1
            print(f"❌ Error uploading record {record_id}: {err}", file=sys.stderr)

        # Gentle pause to avoid rate limits
        time.sleep(random.uniform(0.3, 0.5))

    print("\n" + "=" * 50)
    print("🎉 Pinecone Knowledge Ingestion Complete!")
    print(f"   Uploaded: {uploaded_count}")
    print(f"   Skipped:  {skipped_count}")
    print(f"   Failed:   {failed_count}")
    print("=" * 50)


if __name__ == "__main__":
    main()
