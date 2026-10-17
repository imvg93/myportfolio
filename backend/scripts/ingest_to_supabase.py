#!/usr/bin/env python3
"""
Ingests normalized portfolio data into Supabase table public.portfolio_data.
Uses the Supabase PostgREST API with SUPABASE_SERVICE_ROLE_KEY.

Features:
- Idempotent upsert matching on unique constraint: source_id.
- Supports --dry-run mode for pre-flight testing.
- Reports record counts by visibility.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any
import httpx
from dotenv import load_dotenv

# Load env variables from root or backend
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "v2_drafts" / "portfolio_data.v2.normalized.json"

EXPECTED_COUNT = 25
EXPECTED_PUBLIC = 14
EXPECTED_PRIVATE = 11
REQUIRED_FIELDS = ["source_id", "title", "category", "content", "visibility"]


def require_env(name: str) -> str:
    val = os.getenv(name, "").strip()
    if not val:
        print(f"❌ Error: Required environment variable missing: {name}", file=sys.stderr)
        print("   Please ensure it is set in .env.local or .env at project root.", file=sys.stderr)
        sys.exit(1)
    return val


def validate_dataset(records: List[Dict[str, Any]]):
    """Enforces strict validation on dataset structure, counts, unique IDs, and visibility."""
    if len(records) != EXPECTED_COUNT:
        print(f"❌ Error: Dataset record count mismatch! Expected {EXPECTED_COUNT}, got {len(records)}.", file=sys.stderr)
        sys.exit(1)

    seen_ids = set()
    public_count = 0
    private_count = 0

    for i, r in enumerate(records):
        for field in REQUIRED_FIELDS:
            if field not in r or r[field] is None or (isinstance(r[field], str) and not r[field].strip()):
                print(f"❌ Error: Record at index {i} missing or empty required field '{field}'.", file=sys.stderr)
                sys.exit(1)

        sid = r["source_id"].strip()
        if sid in seen_ids:
            print(f"❌ Error: Duplicate source_id detected '{sid}' at index {i}.", file=sys.stderr)
            sys.exit(1)
        seen_ids.add(sid)

        vis = r["visibility"].strip()
        if vis == "public":
            public_count += 1
        elif vis == "private":
            private_count += 1
        else:
            print(f"❌ Error: Invalid visibility '{vis}' on record '{sid}'. Must be 'public' or 'private'.", file=sys.stderr)
            sys.exit(1)

    if public_count != EXPECTED_PUBLIC or private_count != EXPECTED_PRIVATE:
        print(
            f"❌ Error: Visibility breakdown mismatch! Expected {EXPECTED_PUBLIC} public and {EXPECTED_PRIVATE} private, "
            f"got {public_count} public and {private_count} private.",
            file=sys.stderr
        )
        sys.exit(1)

    if len(seen_ids) != EXPECTED_COUNT:
        print(f"❌ Error: Unique source_id count {len(seen_ids)} != {EXPECTED_COUNT}.", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Ingest portfolio records into Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Validate records without sending to Supabase")
    args = parser.parse_args()

    if not DATA_FILE.exists():
        print(f"❌ Error: Normalized data file not found at {DATA_FILE}", file=sys.stderr)
        print("   Please run: python backend/scripts/generate_v2_dataset.py first.", file=sys.stderr)
        sys.exit(1)

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)

    # Strict validation executed before any network calls or writes
    validate_dataset(records)

    public_records = [r for r in records if r.get("visibility") == "public"]
    private_records = [r for r in records if r.get("visibility") == "private"]
    print(f"📦 Loaded & Validated {len(records)} records from {DATA_FILE.name}")
    print(f"   Public (Verified):  {len(public_records)}")
    print(f"   Private (Verified): {len(private_records)}")

    if args.dry_run:
        print("\n🔍 DRY-RUN MODE: All 25 records verified successfully (14 public, 11 private). No database changes made.")
        return

    supabase_url = require_env("SUPABASE_URL").rstrip("/")
    service_role_key = require_env("SUPABASE_SERVICE_ROLE_KEY")

    endpoint = f"{supabase_url}/rest/v1/portfolio_data"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    # Add timestamp
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = []
    for r in records:
        item = {**r, "updated_at": now_iso}
        payload.append(item)

    print(f"\n🚀 Upserting {len(payload)} records into Supabase table public.portfolio_data...")

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(endpoint, json=payload, headers=headers)
            if resp.status_code not in (200, 201):
                print(f"❌ Supabase Upsert Failed (HTTP {resp.status_code}):", file=sys.stderr)
                print(resp.text, file=sys.stderr)
                sys.exit(1)

            data = resp.json()
            print("=" * 60)
            print(f"🎉 Successfully upserted {len(data)} records to public.portfolio_data!")
            print(f"   Public records:  {len([r for r in data if r.get('visibility') == 'public'])}")
            print(f"   Private records: {len([r for r in data if r.get('visibility') == 'private'])}")
            print("=" * 60)
    except Exception as e:
        print(f"❌ Connection error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
