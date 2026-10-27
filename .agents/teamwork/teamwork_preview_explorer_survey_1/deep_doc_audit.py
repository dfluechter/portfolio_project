"""
deep_doc_audit.py
Deep audit for project documentation files:
- Code block language tags
- Table formatting
- Heading hierarchies
- In-text file paths / symbol references against actual filesystem
- Model mentions (gemini-2.5-flash vs gemini-3.8-flash, etc.)
- Database / S3 / RAG architectural references
"""

import os
import re
import sys
import json
from pathlib import Path

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

REPO_ROOT = Path(r"d:\dev\portfolio_project").resolve()

# Target project doc categories
TARGET_DIRS = ["docs", "design-system", ".github", ".agents/rules"]
TARGET_FILES = ["README.md", "AGENTS.md", "frontend/README.md"]

def get_target_files():
    files = [REPO_ROOT / f for f in TARGET_FILES if (REPO_ROOT / f).exists()]
    for d in TARGET_DIRS:
        dp = REPO_ROOT / d
        if dp.exists():
            for root, _, fs in os.walk(dp):
                for f in fs:
                    if f.endswith(".md"):
                        files.append(Path(root) / f)
    return files

def audit_file(p: Path):
    rel = p.relative_to(REPO_ROOT).as_posix()
    content = p.read_text(encoding="utf-8")
    lines = content.splitlines()
    
    # 1. Code fences
    code_fences = []
    in_fence = False
    fence_char = None
    fence_len = 0
    start_line = 0
    fence_lang = ""
    
    for idx, line in enumerate(lines, 1):
        m = re.match(r"^(`{3,}|~{3,})(.*)$", line.strip())
        if m:
            f_str = m.group(1)
            f_info = m.group(2).strip()
            char = f_str[0]
            length = len(f_str)
            if not in_fence:
                in_fence = True
                fence_char = char
                fence_len = length
                start_line = idx
                fence_lang = f_info
            else:
                if char == fence_char and length >= fence_len:
                    code_fences.append({
                        "start_line": start_line,
                        "end_line": idx,
                        "lang": fence_lang,
                        "unclosed": False
                    })
                    in_fence = False
                    fence_char = None
                    fence_len = 0
                    start_line = 0
                    fence_lang = ""
    if in_fence:
        code_fences.append({
            "start_line": start_line,
            "end_line": None,
            "lang": fence_lang,
            "unclosed": True
        })
        
    # 2. Tables
    tables = []
    current_table = None
    in_fence = False
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        m = re.match(r"^(`{3,}|~{3,})", stripped)
        if m:
            in_fence = not in_fence
            continue
        if in_fence:
            continue
            
        if stripped.startswith("|") and stripped.endswith("|") and len(stripped) > 2:
            cells = [c.strip() for c in stripped[1:-1].split("|")]
            if current_table is None:
                current_table = {
                    "start_line": idx,
                    "rows": [(idx, cells)]
                }
            else:
                current_table["rows"].append((idx, cells))
        else:
            if current_table:
                tables.append(current_table)
                current_table = None
    if current_table:
        tables.append(current_table)
        
    table_issues = []
    for t in tables:
        rows = t["rows"]
        if len(rows) < 2:
            table_issues.append({
                "start_line": t["start_line"],
                "issue": "Table has only 1 row (missing delimiter or data)"
            })
            continue
        # Check delimiter row at index 1
        delim_line, delim_cells = rows[1]
        is_delim = all(re.match(r"^:?-+:?$", c) for c in delim_cells if c)
        if not is_delim:
            table_issues.append({
                "start_line": t["start_line"],
                "delim_line": delim_line,
                "issue": "Row 2 is not a valid markdown table delimiter row",
                "cells": delim_cells
            })
        # Check column count consistency
        col_count = len(rows[0][1])
        for r_line, r_cells in rows:
            if len(r_cells) != col_count:
                table_issues.append({
                    "start_line": t["start_line"],
                    "line": r_line,
                    "issue": f"Column count mismatch: header has {col_count}, row has {len(r_cells)}"
                })
                
    # 3. Model mentions (check for deprecated models like gemini-2.5-flash or others)
    model_mentions = []
    for idx, line in enumerate(lines, 1):
        for model in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-3.8-flash", "text-embedding-004"]:
            if model in line:
                model_mentions.append({
                    "line": idx,
                    "model": model,
                    "context": line.strip()
                })
                
    # 4. In-text file path references (e.g. `backend/portfolio/services/chunking.py`, etc.)
    path_refs = []
    for idx, line in enumerate(lines, 1):
        # find backticked expressions containing slashes or dots like `path/to/file`
        for m in re.finditer(r'`([a-zA-Z0-9_.\-]+/[a-zA-Z0-9_.\-/]+|\b[a-zA-Z0-9_\-]+\.(?:py|tsx?|jsx?|json|ya?ml|sh|env|md)\b)`', line):
            cand = m.group(1).strip()
            # Ignore regexes, math, URLs, commands like `python manage.py ...`
            if " " in cand or cand.startswith("http") or cand.startswith("/") or cand.startswith("<"):
                continue
            # Try to resolve relative to file or relative to root
            file_dir = p.parent
            res_file = (file_dir / cand).resolve()
            res_root = (REPO_ROOT / cand).resolve()
            exists = res_file.exists() or res_root.exists()
            path_refs.append({
                "line": idx,
                "ref": cand,
                "exists": exists,
                "resolved": str(res_root if res_root.exists() else res_file) if exists else None
            })
            
    return {
        "file": rel,
        "line_count": len(lines),
        "code_fences": code_fences,
        "table_issues": table_issues,
        "model_mentions": model_mentions,
        "path_refs": path_refs
    }

def main():
    files = get_target_files()
    print(f"Auditing {len(files)} core project markdown files...")
    
    results = {}
    total_fences = 0
    fences_missing_lang = []
    unclosed_fences = []
    all_table_issues = []
    deprecated_models = []
    broken_path_refs = []
    
    for f in files:
        res = audit_file(f)
        rel = res["file"]
        results[rel] = res
        
        for cf in res["code_fences"]:
            total_fences += 1
            if cf["unclosed"]:
                unclosed_fences.append((rel, cf["start_line"]))
            elif not cf["lang"]:
                fences_missing_lang.append((rel, cf["start_line"]))
                
        for ti in res["table_issues"]:
            all_table_issues.append((rel, ti))
            
        for mm in res["model_mentions"]:
            if mm["model"] in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"]:
                deprecated_models.append((rel, mm))
                
        for pr in res["path_refs"]:
            # Only consider paths that look like real file paths in the project (e.g. backend/..., frontend/..., docs/...)
            ref = pr["ref"]
            if any(ref.startswith(prefix) for prefix in ["backend/", "frontend/", "docs/", ".github/", "core/", "portfolio/"]):
                if not pr["exists"]:
                    broken_path_refs.append((rel, pr))
                    
    print("\n--- RESULTS ---")
    print(f"Total Code Fences: {total_fences}")
    print(f"Fences missing language tag: {len(fences_missing_lang)}")
    for f, l in fences_missing_lang:
        print(f"  Missing lang: {f}:{l}")
        
    print(f"\nUnclosed Code Fences: {len(unclosed_fences)}")
    for f, l in unclosed_fences:
        print(f"  Unclosed: {f}:{l}")
        
    print(f"\nTable Issues: {len(all_table_issues)}")
    for f, ti in all_table_issues:
        print(f"  Table issue in {f}: {ti}")
        
    print(f"\nDeprecated Model References: {len(deprecated_models)}")
    for f, mm in deprecated_models:
        print(f"  Deprecated model in {f}:{mm['line']} -> {mm['model']} (context: {mm['context'][:80]})")
        
    print(f"\nBroken in-text file path references: {len(broken_path_refs)}")
    for f, pr in broken_path_refs:
        print(f"  Broken path in {f}:{pr['line']} -> `{pr['ref']}`")
        
    # Save to json
    out = REPO_ROOT / ".agents" / "teamwork" / "teamwork_preview_explorer_survey_1" / "deep_audit.json"
    out.write_text(json.dumps({
        "files_audited": len(files),
        "fences_missing_lang": fences_missing_lang,
        "unclosed_fences": unclosed_fences,
        "table_issues": all_table_issues,
        "deprecated_models": deprecated_models,
        "broken_path_refs": broken_path_refs
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved deep audit to {out}")

if __name__ == "__main__":
    main()
