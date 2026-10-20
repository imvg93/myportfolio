#!/usr/bin/env python3
"""Upsert only the three personal records explicitly approved for public chat retrieval.

Safe by default: performs validation only. Pass --apply to write to Supabase.
Professional approval-queue records are never included.
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_FILE = ROOT_DIR / "backend" / "data" / "v2_drafts" / "portfolio_data.v2.private.json"
APPROVED_IDS = {
    "v2_private_relationships_boundaries",
    "v2_private_lifestyle_daily_routine",
    "v2_private_family_financial_vow",
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Upsert the three allowlisted records to Supabase (default is validation only).",
    )
    args = parser.parse_args()

    load_dotenv(ROOT_DIR / ".env.local")
    load_dotenv(ROOT_DIR / ".env")

    if not DATA_FILE.is_file():
        print("Private source file is missing.", file=sys.stderr)
        return 1

    import json

    records: list[dict[str, Any]] = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    by_id = {str(record.get("source_id", "")): record for record in records}
    if set(by_id) != APPROVED_IDS:
        print("Private source file IDs do not match the approved allowlist; refusing to continue.", file=sys.stderr)
        return 1

    for record_id in APPROVED_IDS:
        record = by_id[record_id]
        if record.get("visibility") != "private" or not str(record.get("content", "")).strip():
            print("An approved record is missing content or is not marked private; refusing to continue.", file=sys.stderr)
            return 1

    if not args.apply:
        print(f"Validated {len(APPROVED_IDS)} visitor-approved private records. No database changes made.")
        return 0

    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not supabase_url or not service_role_key:
        print("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.", file=sys.stderr)
        return 1

    updated_at = datetime.now(timezone.utc).isoformat()
    payload = [
        {
            "source_id": record_id,
            "title": by_id[record_id]["title"],
            "category": by_id[record_id]["category"],
            "year": by_id[record_id].get("year"),
            "content": by_id[record_id]["content"],
            "visibility": "private",
            "updated_at": updated_at,
        }
        for record_id in sorted(APPROVED_IDS)
    ]
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{supabase_url}/rest/v1/portfolio_data?on_conflict=source_id",
                json=payload,
                headers=headers,
            )
    except httpx.HTTPError as error:
        print(f"Supabase request failed ({type(error).__name__}). No response data or secrets were printed.", file=sys.stderr)
        return 1

    if response.status_code not in (200, 201, 204):
        print(f"Supabase rejected the upsert (HTTP {response.status_code}). Response body was suppressed.", file=sys.stderr)
        return 1

    print(f"Upserted {len(payload)} owner-approved private records to Supabase with visibility=private.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
