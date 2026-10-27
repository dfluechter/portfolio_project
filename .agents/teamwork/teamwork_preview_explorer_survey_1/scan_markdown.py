"""
scan_markdown.py
Comprehensive Markdown and Link Audit Script for portfolio_project.
"""

import os
import re
import sys
import json
import urllib.parse
from pathlib import Path

REPO_ROOT = Path(r"d:\dev\portfolio_project").resolve()

# Directories to ignore
IGNORE_DIRS = {
    ".git", ".venv", "node_modules", ".mypy_cache", ".pytest_cache", 
    ".ruff_cache", "dist", "build", ".next", "__pycache__"
}

def is_ignored(path: Path) -> bool:
    for part in path.parts:
        if part in IGNORE_DIRS:
            return True
    return False

def get_category(rel_path: str) -> str:
    parts = Path(rel_path).parts
    if len(parts) == 1:
        return "Root"
    elif parts[0] == "docs":
        if len(parts) > 1 and parts[1] == "adrs":
            return "Docs/ADR"
        elif len(parts) > 1 and parts[1] == "specs":
            return "Docs/Specs"
        elif len(parts) > 1 and parts[1] == "wiki":
            return "Docs/Wiki"
        else:
            return "Docs/Core"
    elif parts[0] == "frontend":
        return "Frontend"
    elif parts[0] == "design-system":
        return "Design System"
    elif parts[0] == ".github":
        return "GitHub"
    elif parts[0] == ".agents":
        if len(parts) > 1 and parts[1] == "rules":
            return "Agents/Rules"
        elif len(parts) > 1 and parts[1] == "skills":
            return "Agents/Skills"
        elif len(parts) > 1 and parts[1] == "teamwork":
            return "Agents/Teamwork"
        return "Agents/Other"
    return "Other"

def gfm_slug(text: str) -> str:
    # Remove markdown formatting like code ticks, links, bold, italics
    t = re.sub(r"`([^`]+)`", r"\1", text)
    t = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", t)
    t = re.sub(r"[*_~]", "", t)
    # Lowercase
    t = t.strip().lower()
    # Remove punctuation chars except hyphen, underscore, spaces, and alphanumeric (including unicode)
    # GFM removes characters that are not letters, numbers, spaces, or hyphens/underscores
    t = re.sub(r"[^\w\s-]", "", t)
    # Replace spaces with hyphens
    t = re.sub(r"\s+", "-", t)
    return t

def extract_headings_and_anchors(content: str):
    slugs = set()
    headings = []
    
    # Track code fence state to ignore headings inside code blocks
    in_fence = False
    fence_char = None
    fence_len = 0
    
    lines = content.splitlines()
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        fence_match = re.match(r"^(`{3,}|~{3,})", stripped)
        if fence_match:
            fence_str = fence_match.group(1)
            char = fence_str[0]
            length = len(fence_str)
            if not in_fence:
                in_fence = True
                fence_char = char
                fence_len = length
                continue
            else:
                if char == fence_char and length >= fence_len:
                    in_fence = False
                    fence_char = None
                    fence_len = 0
                    continue
        if in_fence:
            continue
            
        # Markdown ATX headings (# ...)
        h_match = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if h_match:
            level = len(h_match.group(1))
            h_text = h_match.group(2).strip()
            # GFM anchor
            slug = gfm_slug(h_text)
            slugs.add(slug)
            headings.append((idx, level, h_text, slug))
            
        # HTML anchors <a name="..." or id="..."> or <span id="...">
        for a_match in re.finditer(r'<[a-z]+[^>]+(?:id|name)=["\']([^"\']+)["\']', line, re.IGNORECASE):
            slugs.add(a_match.group(1).lower())
            
    return headings, slugs

def analyze_markdown_file(file_path: Path):
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as e:
        return {"error": str(e), "path": str(file_path)}
        
    rel_path = file_path.relative_to(REPO_ROOT).as_posix()
    category = get_category(rel_path)
    lines = content.splitlines()
    line_count = len(lines)
    char_count = len(content)
    
    headings, anchors = extract_headings_and_anchors(content)
    
    # 1. Heading hierarchy check
    heading_hierarchy_issues = []
    prev_level = 0
    for l_num, level, text, slug in headings:
        if prev_level > 0 and level > prev_level + 1:
            heading_hierarchy_issues.append({
                "line": l_num,
                "prev_level": prev_level,
                "current_level": level,
                "text": text,
                "issue": f"Skipped heading level: H{prev_level} -> H{level}"
            })
        prev_level = level
        
    # 2. Code blocks check
    code_block_issues = []
    in_fence = False
    fence_char = None
    fence_len = 0
    fence_start_line = 0
    fence_lang = ""
    
    table_issues = []
    
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        fence_match = re.match(r"^(`{3,}|~{3,})(.*)$", stripped)
        if fence_match:
            fence_str = fence_match.group(1)
            char = fence_str[0]
            length = len(fence_str)
            info = fence_match.group(2).strip()
            
            if not in_fence:
                in_fence = True
                fence_char = char
                fence_len = length
                fence_start_line = idx
                fence_lang = info
                if not info:
                    code_block_issues.append({
                        "line": idx,
                        "issue": "Missing language tag in code fence",
                        "fence": fence_str
                    })
            else:
                if char == fence_char and length >= fence_len:
                    in_fence = False
                    fence_char = None
                    fence_len = 0
                    fence_start_line = 0
        elif not in_fence:
            # Check Markdown table syntax
            # If line looks like a table row: starts and ends with |
            if stripped.startswith("|") and stripped.endswith("|") and len(stripped) > 2:
                # Check delimiter row
                cells = [c.strip() for c in stripped[1:-1].split("|")]
                # If next line or this line is delimiter:
                is_delimiter = all(re.match(r"^:?-+:?$", c) for c in cells if c)
                if is_delimiter and len(cells) < 1:
                    table_issues.append({
                        "line": idx,
                        "issue": "Invalid table delimiter row",
                        "content": stripped
                    })
                    
    if in_fence:
        code_block_issues.append({
            "line": fence_start_line,
            "issue": f"Unclosed code fence starting at line {fence_start_line}",
            "fence": fence_char * fence_len
        })
        
    # 3. Link extraction
    # Patterns:
    # Markdown links: [text](url "title")
    # Images: ![alt](url "title")
    # Autolinks: <url>
    # HTML: <a href="url">
    
    raw_links = []
    
    # We parse line by line to keep line numbers and ignore code fences
    in_fence = False
    fence_char = None
    fence_len = 0
    
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        fence_match = re.match(r"^(`{3,}|~{3,})", stripped)
        if fence_match:
            fence_str = fence_match.group(1)
            char = fence_str[0]
            length = len(fence_str)
            if not in_fence:
                in_fence = True
                fence_char = char
                fence_len = length
                continue
            else:
                if char == fence_char and length >= fence_len:
                    in_fence = False
                    fence_char = None
                    fence_len = 0
                    continue
        if in_fence:
            continue
            
        # Inline code should be masked to avoid false positives in links, but let's be careful
        # Markdown links:
        # Regex: (?P<type>!?\[)(?P<text>[^\]]*)\]\((?P<raw_target><[^>]+>|[^\s\)]+)(?:\s+["'](?P<title>[^"']*)["'])?\)
        for m in re.finditer(r'(?P<is_img>!?)(?:\[(?P<text>[^\]]*)\])\((?P<target><[^>]+>|[^\s\)\'"]+)(?:\s+["\'](?P<title>[^"\']*)["\'])?\)', line):
            target = m.group("target")
            if target.startswith("<") and target.endswith(">"):
                target = target[1:-1]
            raw_links.append({
                "line": idx,
                "type": "image" if m.group("is_img") == "!" else "markdown",
                "text": m.group("text"),
                "target": target,
                "full_match": m.group(0)
            })
            
        # Autolinks: <http...> or <file:///...> or <mailto:...>
        for m in re.finditer(r'<((?:https?|file|mailto):[^>]+)>', line):
            raw_links.append({
                "line": idx,
                "type": "autolink",
                "text": m.group(1),
                "target": m.group(1),
                "full_match": m.group(0)
            })
            
        # HTML <a> tags:
        for m in re.finditer(r'<a\s+[^>]*?href=["\']([^"\']+)["\']', line, re.IGNORECASE):
            raw_links.append({
                "line": idx,
                "type": "html",
                "text": "",
                "target": m.group(1),
                "full_match": m.group(0)
            })
            
    return {
        "path": rel_path,
        "abs_path": str(file_path),
        "category": category,
        "line_count": line_count,
        "char_count": char_count,
        "headings": headings,
        "anchors": list(anchors),
        "heading_hierarchy_issues": heading_hierarchy_issues,
        "code_block_issues": code_block_issues,
        "table_issues": table_issues,
        "raw_links": raw_links
    }

def main():
    print(f"Scanning repository at {REPO_ROOT}...")
    md_files = []
    for root, dirs, files in os.walk(REPO_ROOT):
        # Filter dirs in-place
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for f in files:
            if f.endswith(".md"):
                p = Path(root) / f
                if not is_ignored(p):
                    md_files.append(p)
                    
    print(f"Found {len(md_files)} Markdown files.")
    
    file_analyses = {}
    for mf in md_files:
        rel = mf.relative_to(REPO_ROOT).as_posix()
        file_analyses[rel] = analyze_markdown_file(mf)
        
    # Map of all anchors per file
    file_anchors = {rel: set(data["anchors"]) for rel, data in file_analyses.items() if "anchors" in data}
    
    # Now validate all links
    all_link_results = []
    dead_links = []
    broken_anchors = []
    root_relative_confusion = []
    file_uri_links = []
    external_links = []
    valid_links = []
    
    for rel, data in file_analyses.items():
        if "raw_links" not in data:
            continue
        file_dir = (REPO_ROOT / rel).parent
        
        for lk in data["raw_links"]:
            target = lk["target"].strip()
            line = lk["line"]
            ltype = lk["type"]
            text = lk["text"]
            
            link_record = {
                "source_file": rel,
                "line": line,
                "type": ltype,
                "text": text,
                "target": target,
                "status": "UNKNOWN",
                "details": ""
            }
            
            # Case 1: Empty or javascript:
            if not target or target.startswith("javascript:"):
                link_record["status"] = "INVALID_TARGET"
                link_record["details"] = "Empty target or javascript link"
                dead_links.append(link_record)
                all_link_results.append(link_record)
                continue
                
            # Case 2: External HTTP/HTTPS/Mailto
            if target.startswith("http://") or target.startswith("https://") or target.startswith("mailto:"):
                link_record["status"] = "EXTERNAL"
                link_record["details"] = "External URL or mailto"
                external_links.append(link_record)
                all_link_results.append(link_record)
                continue
                
            # Case 3: file:/// URI
            if target.startswith("file:"):
                file_uri_links.append(link_record)
                # Parse file uri
                parsed_target = target
                # e.g. file:///d:/dev/portfolio_project/... or file:///d%3A/...
                m = re.match(r"^file:///(?:(?P<drive>[a-zA-Z]):|(?P<drive_enc>[a-zA-Z])%3A)?(?P<path>.*)$", target)
                if m:
                    drive = m.group("drive") or m.group("drive_enc") or ""
                    path_part = urllib.parse.unquote(m.group("path"))
                    if drive:
                        resolved_path = Path(f"{drive.upper()}:{path_part}")
                    else:
                        resolved_path = Path(path_part)
                else:
                    resolved_path = Path(urllib.parse.unquote(target[7:]))
                    
                # Split anchor if any
                target_anchor = None
                if "#" in str(resolved_path):
                    s_path, target_anchor = str(resolved_path).split("#", 1)
                    resolved_path = Path(s_path)
                    
                if resolved_path.exists():
                    link_record["status"] = "VALID_FILE_URI"
                    link_record["details"] = f"Points to existing local file: {resolved_path}"
                    valid_links.append(link_record)
                else:
                    link_record["status"] = "BROKEN_FILE_URI"
                    link_record["details"] = f"File URI does not exist: {resolved_path}"
                    dead_links.append(link_record)
                all_link_results.append(link_record)
                continue

            # Case 4: Pure Anchor (#heading-slug)
            if target.startswith("#"):
                anchor = target[1:].lower()
                target_anchor = anchor
                if anchor in file_anchors.get(rel, set()):
                    link_record["status"] = "VALID_SAME_FILE_ANCHOR"
                    link_record["details"] = f"Anchor #{anchor} exists in current file"
                    valid_links.append(link_record)
                else:
                    link_record["status"] = "BROKEN_SAME_FILE_ANCHOR"
                    link_record["details"] = f"Anchor #{anchor} NOT found in current file"
                    broken_anchors.append(link_record)
                all_link_results.append(link_record)
                continue
                
            # Case 5: Relative or Root-relative path with optional anchor
            # Split path and anchor
            target_path_str = target
            target_anchor = None
            if "#" in target:
                target_path_str, target_anchor = target.split("#", 1)
                target_anchor = target_anchor.lower()
                
            target_path_clean = urllib.parse.unquote(target_path_str)
            
            # Check 5a: Standard relative resolution from file_dir
            candidate_path = (file_dir / target_path_clean).resolve()
            
            # Check 5b: Repo-root relative resolution (if someone wrote [foo](docs/foo.md) from inside docs/)
            candidate_root_path = (REPO_ROOT / target_path_clean.lstrip("/\\")).resolve()
            
            if candidate_path.exists():
                # Target exists!
                # If target is directory or file
                if target_anchor:
                    # check anchor in target file if it's markdown
                    try:
                        target_rel = candidate_path.relative_to(REPO_ROOT).as_posix()
                    except ValueError:
                        target_rel = None
                    if target_rel and target_rel in file_anchors:
                        if target_anchor in file_anchors[target_rel]:
                            link_record["status"] = "VALID_RELATIVE_LINK_WITH_ANCHOR"
                            link_record["details"] = f"Points to {candidate_path} with anchor #{target_anchor}"
                            valid_links.append(link_record)
                        else:
                            link_record["status"] = "BROKEN_TARGET_ANCHOR"
                            link_record["details"] = f"File {target_rel} exists, but anchor #{target_anchor} is missing"
                            broken_anchors.append(link_record)
                    else:
                        # Non-markdown or outside repo
                        link_record["status"] = "VALID_RELATIVE_LINK"
                        link_record["details"] = f"Target exists: {candidate_path} (anchor #{target_anchor} unverified)"
                        valid_links.append(link_record)
                else:
                    link_record["status"] = "VALID_RELATIVE_LINK"
                    link_record["details"] = f"Points to existing path: {candidate_path}"
                    valid_links.append(link_record)
            elif candidate_root_path.exists():
                # Exists only from repo root! That's a broken relative link (path confusion)
                link_record["status"] = "ROOT_RELATIVE_PATH_ERROR"
                link_record["details"] = f"Broken relative path! Does not exist relative to source file directory, but exists relative to repo root: {candidate_root_path}"
                root_relative_confusion.append(link_record)
                dead_links.append(link_record)
            else:
                # Dead link / does not exist anywhere
                link_record["status"] = "DEAD_LINK_404"
                link_record["details"] = f"Target does not exist on filesystem: attempted {candidate_path} and {candidate_root_path}"
                dead_links.append(link_record)
                
            all_link_results.append(link_record)
            
    summary = {
        "total_markdown_files": len(file_analyses),
        "total_links_found": len(all_link_results),
        "total_valid_links": len(valid_links),
        "total_external_links": len(external_links),
        "total_dead_links": len(dead_links),
        "total_broken_anchors": len(broken_anchors),
        "total_root_relative_confusion": len(root_relative_confusion),
        "total_file_uri_links": len(file_uri_links),
    }
    
    output_data = {
        "summary": summary,
        "dead_links": dead_links,
        "broken_anchors": broken_anchors,
        "file_analyses": file_analyses
    }
    
    out_json = REPO_ROOT / ".agents" / "teamwork" / "teamwork_preview_explorer_survey_1" / "scan_results.json"
    out_json.write_text(json.dumps(output_data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Results written to {out_json}")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
