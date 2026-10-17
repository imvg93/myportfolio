#!/usr/bin/env python3
"""
Normalizes raw JSON profile files into a single, clean, deduplicated dataset
ready for ingestion into Supabase (public.portfolio_data) and Pinecone.

Source files read (read-only):
- ai-json.json (extracts records 001–008, deduplicates record 009)
- gireesh_ai_profile_009.json (chunks psychological & productivity profile)
- mydata.json (enriches technical skills, education, projects, and private family history)

Output:
- backend/data/normalized_portfolio_data.json
"""

import json
import re
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

DEFAULT_RAW_DIR = Path("/Volumes/Windows-SSD/Users/giris/OneDrive/Desktop/personal info")
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "normalized_portfolio_data.json"


def parse_year(year_val: Any) -> Optional[int]:
    """Extract integer year from string range (e.g. '1999–2005' -> 1999) or int."""
    if year_val is None:
        return None
    if isinstance(year_val, int):
        return year_val
    match = re.search(r"\b(19\d{2}|20\d{2})\b", str(year_val))
    return int(match.group(1)) if match else None


def load_ai_json_part1(file_path: Path) -> List[Dict[str, Any]]:
    """Load records 001–008 from ai-json.json, cleanly ignoring duplicate 009."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the closing array bracket of Part 1 (lines 1–58)
    cutoff = content.find("]\n{")
    if cutoff != -1:
        part1_str = content[:cutoff + 1].strip()
    else:
        part1_str = content.strip()

    items = json.loads(part1_str)
    records = []

    for item in items:
        item_id = str(item.get("id", ""))
        title = item.get("title", "")
        category = item.get("category", "General")
        year_range = item.get("year_range")
        content_text = item.get("content", "").strip()

        # 002 contains sensitive family history & turning point
        visibility = "private" if item_id == "002" else "public"

        records.append({
            "source_id": f"bio_{item_id}",
            "title": title,
            "category": category,
            "year": parse_year(year_range),
            "content": content_text,
            "metadata": {
                "source_file": "ai-json.json",
                "original_id": item_id,
                "year_range": year_range,
                "type": "narrative_summary"
            },
            "visibility": visibility
        })

    return records


def load_profile_009(file_path: Path) -> List[Dict[str, Any]]:
    """Parse sections from gireesh_ai_profile_009.json into discrete structured chunks."""
    with open(file_path, "r", encoding="utf-8") as f:
        prof = json.load(f)

    records = []

    # 1. Future Goals & Vision (Public)
    goals = prof.get("future_goals_and_vision", {})
    if goals:
        text_parts = []
        for k, v in goals.items():
            if isinstance(v, dict):
                desc = v.get("description") or v.get("vision") or str(v)
                text_parts.append(f"{k.replace('_', ' ').title()}: {desc}")
            elif isinstance(v, str):
                text_parts.append(f"{k.replace('_', ' ').title()}: {v}")
        records.append({
            "source_id": "prof_future_goals",
            "title": "Professional Vision, Future Goals and Mission",
            "category": "Vision & Goals",
            "year": 2025,
            "content": "\n".join(text_parts),
            "metadata": {
                "source_file": "gireesh_ai_profile_009.json",
                "section": "future_goals_and_vision",
                "type": "psychological_profile"
            },
            "visibility": "public"
        })

    # 2. Work Style & Productivity (Public)
    work = prof.get("work_style_and_productivity", {})
    if work:
        text_parts = []
        for k, v in work.items():
            if isinstance(v, dict):
                desc = v.get("description") or str(v)
                text_parts.append(f"{k.replace('_', ' ').title()}: {desc}")
            elif isinstance(v, list):
                text_parts.append(f"{k.replace('_', ' ').title()}: {'; '.join(str(x) for x in v)}")
            elif isinstance(v, str):
                text_parts.append(f"{k.replace('_', ' ').title()}: {v}")
        records.append({
            "source_id": "prof_work_style",
            "title": "Work Style, Productivity, Focus and Core Strengths",
            "category": "Work Style",
            "year": 2025,
            "content": "\n".join(text_parts),
            "metadata": {
                "source_file": "gireesh_ai_profile_009.json",
                "section": "work_style_and_productivity",
                "type": "psychological_profile"
            },
            "visibility": "public"
        })

    # 3. Personality & Mindset (Public summary, general mindset)
    mindset = prof.get("personality_and_mindset", {})
    if mindset:
        text_parts = []
        for k, v in mindset.items():
            if k in ["traits", "stress_handling", "emotional_summary"]:
                desc = v.get("description") if isinstance(v, dict) else str(v)
                text_parts.append(f"{k.replace('_', ' ').title()}: {desc}")
        records.append({
            "source_id": "prof_mindset_philosophy",
            "title": "Core Personality Traits and Stress Management Approach",
            "category": "Personality",
            "year": 2025,
            "content": "\n".join(text_parts),
            "metadata": {
                "source_file": "gireesh_ai_profile_009.json",
                "section": "personality_and_mindset",
                "type": "psychological_profile"
            },
            "visibility": "public"
        })

    # 4. Emotional Reactions & Triggers (Private)
    emotions = prof.get("emotions_and_reactions", {})
    anger = mindset.get("anger_triggers")
    if emotions or anger:
        text_parts = []
        if anger:
            text_parts.append(f"Anger Triggers: {anger.get('description') if isinstance(anger, dict) else anger}")
        for k, v in emotions.items():
            desc = v.get("description") if isinstance(v, dict) else str(v)
            text_parts.append(f"{k.replace('_', ' ').title()}: {desc}")
        records.append({
            "source_id": "prof_emotions_triggers",
            "title": "Private Emotional Reactions and Trigger Responses",
            "category": "Personal Psychology",
            "year": None,
            "content": "\n".join(text_parts),
            "metadata": {
                "source_file": "gireesh_ai_profile_009.json",
                "section": "emotions_and_reactions",
                "type": "sensitive_profile"
            },
            "visibility": "private"
        })

    # 5. Interpersonal Connections & Detachment (Private)
    rel = prof.get("relationships_and_connections", {})
    if rel:
        text_parts = []
        for k, v in rel.items():
            desc = v.get("description") if isinstance(v, dict) else str(v)
            text_parts.append(f"{k.replace('_', ' ').title()}: {desc}")
        records.append({
            "source_id": "prof_relationships_values",
            "title": "Personal Relationships, Attachment and Boundary Values",
            "category": "Personal Psychology",
            "year": None,
            "content": "\n".join(text_parts),
            "metadata": {
                "source_file": "gireesh_ai_profile_009.json",
                "section": "relationships_and_connections",
                "type": "sensitive_profile"
            },
            "visibility": "private"
        })

    # 6. Daily Routine & Habits (Private)
    habits = prof.get("daily_life_and_habits", {})
    lifestyle = prof.get("lifestyle_and_health_preferences", {})
    if habits or lifestyle:
        text_parts = []
        for k, v in {**habits, **lifestyle}.items():
            desc = v.get("description") if isinstance(v, dict) else str(v)
            text_parts.append(f"{k.replace('_', ' ').title()}: {desc}")
        records.append({
            "source_id": "prof_daily_lifestyle",
            "title": "Personal Routine, Diet, Sleep and Lifestyle Habits",
            "category": "Personal Lifestyle",
            "year": None,
            "content": "\n".join(text_parts),
            "metadata": {
                "source_file": "gireesh_ai_profile_009.json",
                "section": "daily_life_and_lifestyle",
                "type": "sensitive_profile"
            },
            "visibility": "private"
        })

    return records


def load_mydata_json(file_path: Path) -> List[Dict[str, Any]]:
    """Extract granular technical details, project facts, and private family history."""
    with open(file_path, "r", encoding="utf-8") as f:
        mydata = json.load(f)

    records = []

    # 1. Technical Skills & Learning Methodology (Public)
    skills = mydata.get("skills_and_knowledge", {})
    if skills:
        text_parts = [
            f"Technical Skills: {', '.join(skills.get('technical_skills', [])) if isinstance(skills.get('technical_skills'), list) else skills.get('technical_skills')}",
            f"Strongest Skill: {skills.get('strongest_skill')}",
            f"Learning Focus: {skills.get('learning_focus')}",
            f"Learning Style: {skills.get('learning_style')}",
            f"Non-Technical Skills: {skills.get('non_technical_skills')}",
            f"Learning Method: {skills.get('learning_method')}"
        ]
        records.append({
            "source_id": "detail_tech_skills",
            "title": "Technical Skills Breakdown and Continuous Learning Method",
            "category": "Skills and Knowledge",
            "year": 2025,
            "content": "\n".join([p for p in text_parts if p]),
            "metadata": {
                "source_file": "mydata.json",
                "section": "skills_and_knowledge",
                "type": "granular_fact"
            },
            "visibility": "public"
        })

    # 2. Key Projects & Business Experience (Public)
    achievements = mydata.get("achievements_and_milestones", {})
    career = mydata.get("career", {})
    if achievements or career:
        text_parts = [
            f"Major Project: {achievements.get('projects')}",
            f"Major Achievement: {achievements.get('major_achievement')}",
            f"Career Start & Fields: {career.get('start')} - {career.get('fields')}",
            f"Business Experience: {career.get('business_experience')}",
            f"Challenges Overcome: {career.get('challenges')}",
            f"Mentoring & Leadership: {achievements.get('mentoring_and_support')}"
        ]
        records.append({
            "source_id": "detail_projects_career",
            "title": "Key Engineering Projects, Business Portal and Career Milestones",
            "category": "Achievements and Projects",
            "year": 2024,
            "content": "\n".join([p for p in text_parts if p]),
            "metadata": {
                "source_file": "mydata.json",
                "section": "career_and_achievements",
                "type": "granular_fact"
            },
            "visibility": "public"
        })

    # 3. Education Details (Public)
    edu = mydata.get("education", {})
    if edu:
        text_parts = [
            f"College & Degree: {edu.get('college')}",
            f"Schooling: {edu.get('schooling')}",
            f"Favorite Subjects: {edu.get('favorite_subjects')}",
            f"Activities: {edu.get('activities')}",
            f"Memorable Moment: {edu.get('memorable_moment')}"
        ]
        records.append({
            "source_id": "detail_education",
            "title": "Academic Education and Extracurricular Background",
            "category": "Education",
            "year": parse_year(edu.get("college")),
            "content": "\n".join([p for p in text_parts if p]),
            "metadata": {
                "source_file": "mydata.json",
                "section": "education",
                "type": "granular_fact"
            },
            "visibility": "public"
        })

    # 4. Intimate Family History (Private)
    fam = mydata.get("family", {})
    personal = mydata.get("personal", {})
    if fam:
        members_str = ""
        if isinstance(fam.get("members"), list):
            members_str = " | ".join([f"{m.get('relation')} ({m.get('status')}): {m.get('description', '')}" for m in fam.get("members")])
        text_parts = [
            f"Birth Place: {personal.get('birth', {}).get('place') if isinstance(personal.get('birth'), dict) else ''}",
            f"Family Details: {fam.get('family_description')}",
            f"Family Members: {members_str}",
            f"Turning Point: {fam.get('turning_point')}",
            f"Relationship Summary: {fam.get('relationship_summary')}"
        ]
        records.append({
            "source_id": "detail_family_private",
            "title": "Confidential Family Background and Personal Turning Point",
            "category": "Family",
            "year": 2012,
            "content": "\n".join([p for p in text_parts if p]),
            "metadata": {
                "source_file": "mydata.json",
                "section": "family",
                "type": "sensitive_fact"
            },
            "visibility": "private"
        })

    return records


def main():
    raw_dir = Path(os.environ.get("RAW_JSON_DIR", DEFAULT_RAW_DIR))
    print(f"📂 Reading source files from: {raw_dir}")

    ai_json_path = raw_dir / "ai-json.json"
    profile_009_path = raw_dir / "gireesh_ai_profile_009.json"
    mydata_path = raw_dir / "mydata.json"

    for p in [ai_json_path, profile_009_path, mydata_path]:
        if not p.exists():
            print(f"❌ Error: Required source file not found: {p}", file=sys.stderr)
            sys.exit(1)

    all_records: List[Dict[str, Any]] = []

    # 1. Parse ai-json.json Part 1 (001–008)
    ai_records = load_ai_json_part1(ai_json_path)
    all_records.extend(ai_records)
    print(f"✅ Loaded {len(ai_records)} narrative records from ai-json.json (deduplicated record 009)")

    # 2. Parse gireesh_ai_profile_009.json
    prof_records = load_profile_009(profile_009_path)
    all_records.extend(prof_records)
    print(f"✅ Loaded {len(prof_records)} profile records from gireesh_ai_profile_009.json")

    # 3. Parse mydata.json
    mydata_records = load_mydata_json(mydata_path)
    all_records.extend(mydata_records)
    print(f"✅ Loaded {len(mydata_records)} granular records from mydata.json")

    # Deduplication and schema check
    seen_ids = set()
    public_count = 0
    private_count = 0

    for r in all_records:
        sid = r["source_id"]
        if sid in seen_ids:
            print(f"❌ Duplicate source_id detected: {sid}", file=sys.stderr)
            sys.exit(1)
        seen_ids.add(sid)

        if r["visibility"] == "public":
            public_count += 1
        elif r["visibility"] == "private":
            private_count += 1
        else:
            print(f"❌ Invalid visibility '{r['visibility']}' on {sid}", file=sys.stderr)
            sys.exit(1)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_records, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print(f"🎉 Dataset normalization complete! Saved to: {OUTPUT_PATH}")
    print(f"   Total Chunks: {len(all_records)}")
    print(f"   Public (Searchable in AI): {public_count}")
    print(f"   Private (Protected from AI): {private_count}")
    print("=" * 60)


if __name__ == "__main__":
    main()
