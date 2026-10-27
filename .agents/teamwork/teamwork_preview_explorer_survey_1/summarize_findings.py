"""
summarize_findings.py
Extract and summarize all findings from scan_results.json into human-readable detail.
"""

import sys
import json
from pathlib import Path

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

RESULTS_FILE = Path(r"d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\scan_results.json")

def main():
    with open(RESULTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    summary = data["summary"]
    dead_links = data["dead_links"]
    broken_anchors = data["broken_anchors"]
    file_analyses = data["file_analyses"]
    
    print("=== SUMMARY STATS ===")
    print(json.dumps(summary, indent=2))
    
    print("\n=== DEAD LINKS & BROKEN PATHS ===")
    for dl in dead_links:
        print(f"[{dl['status']}] {dl['source_file']}:{dl['line']}")
        print(f"   Text: {dl['text']}")
        print(f"   Target: {dl['target']}")
        print(f"   Details: {dl['details']}\n")
        
    print("\n=== BROKEN ANCHORS ===")
    for ba in broken_anchors:
        print(f"[{ba['status']}] {ba['source_file']}:{ba['line']}")
        print(f"   Text: {ba['text']}")
        print(f"   Target: {ba['target']}")
        print(f"   Details: {ba['details']}\n")
        
    print("\n=== FORMATTING & SYNTAX ISSUES ===")
    total_unclosed_blocks = 0
    total_missing_lang = 0
    total_table_issues = 0
    total_hierarchy_issues = 0
    
    for rel, f_data in file_analyses.items():
        cb_issues = f_data.get("code_block_issues", [])
        tb_issues = f_data.get("table_issues", [])
        hi_issues = f_data.get("heading_hierarchy_issues", [])
        
        unclosed = [i for i in cb_issues if "Unclosed" in i["issue"]]
        missing_lang = [i for i in cb_issues if "Missing language tag" in i["issue"]]
        
        total_unclosed_blocks += len(unclosed)
        total_missing_lang += len(missing_lang)
        total_table_issues += len(tb_issues)
        total_hierarchy_issues += len(hi_issues)
        
        if unclosed or missing_lang or tb_issues or hi_issues:
            print(f"\nFile: {rel}")
            if unclosed:
                for u in unclosed:
                    print(f"  [UNCLOSED CODE BLOCK] Line {u['line']}: {u['issue']}")
            if missing_lang:
                print(f"  [MISSING LANG TAG] {len(missing_lang)} code blocks missing language tag (e.g. lines: {[m['line'] for m in missing_lang[:5]]}...)")
            if tb_issues:
                for t in tb_issues:
                    print(f"  [TABLE ISSUE] Line {t['line']}: {t['issue']} -> {t['content']}")
            if hi_issues:
                for h in hi_issues:
                    print(f"  [HEADING JUMP] Line {h['line']}: {h['issue']} ('{h['text']}')")
                    
    print("\n=== AGGREGATED FORMATTING TOTALS ===")
    print(f"Unclosed code fences: {total_unclosed_blocks}")
    print(f"Missing language tags: {total_missing_lang}")
    print(f"Table syntax issues: {total_table_issues}")
    print(f"Heading hierarchy skips: {total_hierarchy_issues}")

if __name__ == "__main__":
    main()
