import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(repo_root))

from scripts.verify_markdown_integrity import MarkdownHarness, is_ignored, IGNORE_DIRS

def test_vendor_skills_options():
    print("=== TEST VENDOR SKILLS HANDLING STRATEGIES ===\n")

    # Strategie A: Fix direkt in neon-functions/SKILL.md (ohne Skript-Änderung)
    h_a = MarkdownHarness(repo_root)
    h_a.collect_files()
    h_a.parse_headings_and_anchors()
    # Simuliere TEST_INFRA.md Fixes
    h_a.file_lines["TEST_INFRA.md"][8] = "```text"
    h_a.file_lines["TEST_INFRA.md"][34] = h_a.file_lines["TEST_INFRA.md"][34].replace("`|---|---|`", r"`\|---\|---\|`")
    # Fix in neon-functions
    h_a.file_anchors[".agents/skills/neon-functions/SKILL.md"].add("hono")
    issues_a = h_a.run_all([1, 2, 3, 4])
    # run_all re-reads, so use direct verify
    h_a.issues = []
    h_a.verify_tier_1_link_integrity()
    h_a.verify_tier_2_portability_and_references()
    h_a.verify_tier_3_syntax_and_anchors()
    h_a.verify_tier_4_fact_consistency()
    print(f"Strategie A (Fix in SKILL.md + Fix in TEST_INFRA.md): {len(h_a.issues)} Issues, {len(h_a.md_files)} gescannte Dateien")

    # Strategie B: Ausschluss von .agents/skills in IGNORE_DIRS
    IGNORE_DIRS.add(".agents/skills")
    h_b = MarkdownHarness(repo_root)
    h_b.collect_files()
    h_b.parse_headings_and_anchors()
    h_b.file_lines["TEST_INFRA.md"][8] = "```text"
    h_b.file_lines["TEST_INFRA.md"][34] = h_b.file_lines["TEST_INFRA.md"][34].replace("`|---|---|`", r"`\|---\|---\|`")
    h_b.issues = []
    h_b.verify_tier_1_link_integrity()
    h_b.verify_tier_2_portability_and_references()
    h_b.verify_tier_3_syntax_and_anchors()
    h_b.verify_tier_4_fact_consistency()
    print(f"Strategie B (Ignore .agents/skills in Harness + Fix in TEST_INFRA.md): {len(h_b.issues)} Issues, {len(h_b.md_files)} gescannte Dateien")

    # Strategie C: Tier 3 Anchor Check nur auf Core Docs & Docs/Wiki beschränken
    # (wie in TEST_INFRA.md Zeile 35 spezifiziert)
    # Wenn ein Link in einem Non-Core Dokument einen broken Anchor hat, wird er nicht beachtet

if __name__ == "__main__":
    test_vendor_skills_options()
