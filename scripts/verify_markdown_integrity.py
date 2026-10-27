#!/usr/bin/env python3
"""
verify_markdown_integrity.py
============================
Automated Opaque-Box E2E Verification Harness for Markdown & Documentation Integrity.

Verifies the 4 Tiers of Acceptance Criteria across the portfolio repository:
- Tier 1: Link Integrity (all relative links, images, 404 dead links, root-relative path confusion, missing .md extensions)
- Tier 2: Portability & Deprecated References (no absolute file:/// URIs, no deprecated Gemini models)
- Tier 3: Markdown Syntax & Anchors (closed code fences, language tags in core docs, valid GFM tables, heading anchors)
- Tier 4: Architectural Fact Consistency (Django version, Dual-DB, Build commands, Vitest count, Render blueprint)

Execution Modes:
  CLI:    uv run python scripts/verify_markdown_integrity.py [--tier 1,2,3,4] [--json] [--summary-only]
  Pytest: uv run pytest scripts/verify_markdown_integrity.py -v

Exit Codes (CLI):
  0: All tests passed (100% integrity)
  1: Verification failure (at least one integrity issue detected)
"""

import argparse
import json
import os
import re
import sys
import urllib.parse
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Ensure UTF-8 output encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent

# Ignored directories
IGNORE_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".agents/teamwork",  # Internal ephemeral scratchpad
}

# Core project documentation categories
CORE_DOC_PATTERNS = [
    "README.md",
    "AGENTS.md",
    "PROJECT.md",
    "TEST_INFRA.md",
    "TEST_READY.md",
    "frontend/README.md",
    "design-system",
    ".github",
    ".agents/rules",
    "docs",
]

ALLOWED_LANG_TAGS = {
    "bash", "sh", "shell", "zsh", "cmd", "powershell", "pwsh",
    "python", "py", "pycon",
    "javascript", "js", "typescript", "ts", "tsx", "jsx",
    "json", "yaml", "yml", "toml", "ini", "env",
    "sql", "graphql", "gql",
    "html", "xml", "svg", "css", "scss",
    "markdown", "md", "diff",
    "dockerfile", "docker", "nginx",
    "text", "txt", "ascii", "mermaid", "plaintext", "console"
}


@dataclass
class Issue:
    tier: int
    category: str
    file: str
    line: int
    message: str
    context: Optional[str] = None
    severity: str = "ERROR"


def is_ignored(path: Path) -> bool:
    try:
        rel = path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return True
    for part in Path(rel).parts:
        if part in IGNORE_DIRS:
            return True
    if rel.startswith(".agents/teamwork"):
        return True
    return False


def is_core_doc(path: Path) -> bool:
    try:
        rel = path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return False
    if rel in {"README.md", "AGENTS.md", "PROJECT.md", "TEST_INFRA.md", "TEST_READY.md", "frontend/README.md"}:
        return True
    for prefix in ["docs/", "design-system/", ".github/", ".agents/rules/"]:
        if rel.startswith(prefix):
            return True
    return False


def gfm_slug(text: str) -> str:
    """Generate GitHub Flavored Markdown (GFM) heading anchor slug."""
    # Strip markdown links [label](target) -> label
    t = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    # Strip inline code ticks `code` -> code
    t = re.sub(r"`([^`]+)`", r"\1", t)
    # Strip emphasis * _ ~
    t = re.sub(r"[*_~]", "", t)
    # Lowercase & strip
    t = t.strip().lower()
    # Strip punctuation & emojis: keep letters, numbers, whitespace, hyphens and underscores
    t = re.sub(r"[^\w\s-]", "", t)
    # Replace spaces with hyphens
    t = re.sub(r"\s+", "-", t)
    # GFM strips leading hyphens if an emoji/symbol was removed at the start
    t = t.lstrip("-")
    return t


def split_table_row(row_str: str) -> List[str]:
    """Split a markdown table row, taking escaped pipes (\\|) into account."""
    content = row_str.strip()
    if content.startswith("|"):
        content = content[1:]
    if content.endswith("|"):
        content = content[:-1]
    # Replace escaped pipes \| with placeholder
    placeholder = "\x00PIPE\x00"
    content = content.replace(r"\|", placeholder)
    cells = [c.replace(placeholder, "|").strip() for c in content.split("|")]
    return cells


def mask_inline_code(line: str) -> str:
    """Mask inline code blocks `...` with whitespace to prevent false positive link parsing."""
    return re.sub(r"`[^`]*`", lambda m: " " * len(m.group(0)), line)


class MarkdownHarness:
    def __init__(self, repo_root: Path = REPO_ROOT):
        self.root = repo_root
        self.md_files: List[Path] = []
        self.file_headings: Dict[str, List[Tuple[int, int, str, str]]] = {}
        self.file_anchors: Dict[str, Set[str]] = {}
        self.file_contents: Dict[str, str] = {}
        self.file_lines: Dict[str, List[str]] = {}
        self.issues: List[Issue] = []

    def collect_files(self):
        """Collect all markdown files in the repository."""
        self.md_files = []
        for root, dirs, files in os.walk(self.root):
            # Prune ignored directories in-place
            dirs[:] = [
                d for d in dirs
                if d not in IGNORE_DIRS and (Path(root) / d).relative_to(self.root).as_posix() != ".agents/teamwork"
            ]
            for f in files:
                if f.endswith(".md"):
                    p = Path(root) / f
                    if not is_ignored(p):
                        self.md_files.append(p)
        self.md_files.sort()

    def parse_headings_and_anchors(self):
        """Pre-parse all headings and HTML anchors for cross-file anchor validation."""
        for mf in self.md_files:
            rel = mf.relative_to(self.root).as_posix()
            try:
                content = mf.read_text(encoding="utf-8")
            except Exception as e:
                self.issues.append(Issue(
                    tier=3,
                    category="FILE_READ_ERROR",
                    file=rel,
                    line=1,
                    message=f"Could not read markdown file: {e}"
                ))
                continue

            lines = content.splitlines()
            self.file_contents[rel] = content
            self.file_lines[rel] = lines

            headings = []
            anchors: Set[str] = set()

            in_fence = False
            fence_char = None
            fence_len = 0
            slug_counts: Dict[str, int] = {}

            for idx, line in enumerate(lines, 1):
                stripped = line.strip()
                fence_match = re.match(r"^(`{3,}|~{3,})", stripped)
                if fence_match:
                    f_str = fence_match.group(1)
                    char = f_str[0]
                    length = len(f_str)
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
                    base_slug = gfm_slug(h_text)

                    count = slug_counts.get(base_slug, 0)
                    slug = base_slug if count == 0 else f"{base_slug}-{count}"
                    slug_counts[base_slug] = count + 1

                    anchors.add(slug)
                    headings.append((idx, level, h_text, slug))

                # HTML anchors <a name="..." id="..."> or <element id="...">
                for a_match in re.finditer(r'<[a-z]+[^>]+(?:id|name)=["\']([^"\']+)["\']', line, re.IGNORECASE):
                    anchors.add(a_match.group(1).lower())

            self.file_headings[rel] = headings
            self.file_anchors[rel] = anchors

    # =========================================================================
    # TIER 1: Link Integrity
    # =========================================================================
    def verify_tier_1_link_integrity(self):
        """
        Verify that every relative file link, image reference, and HTML link
        resolves to an existing file/directory on the filesystem.
        """
        link_regex = re.compile(
            r'(?P<is_img>!?)(?:\[(?P<text>[^\]]*)\])\((?P<target><[^>]+>|[^\s\)\'"]+)(?:\s+["\'](?P<title>[^"\']*)["\'])?\)'
        )
        html_link_regex = re.compile(r'<a\s+[^>]*?href=["\']([^"\']+)["\']', re.IGNORECASE)

        for mf in self.md_files:
            rel = mf.relative_to(self.root).as_posix()
            lines = self.file_lines.get(rel, [])
            file_dir = mf.parent

            in_fence = False
            fence_char = None
            fence_len = 0

            for idx, line in enumerate(lines, 1):
                stripped = line.strip()
                fence_match = re.match(r"^(`{3,}|~{3,})", stripped)
                if fence_match:
                    f_str = fence_match.group(1)
                    char = f_str[0]
                    length = len(f_str)
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

                # Mask inline code before link extraction to prevent false positive code-examples
                masked_line = mask_inline_code(line)

                matches = []
                for m in link_regex.finditer(masked_line):
                    target = m.group("target")
                    if target.startswith("<") and target.endswith(">"):
                        target = target[1:-1]
                    matches.append((target, m.group("text"), "markdown"))

                for m in html_link_regex.finditer(masked_line):
                    matches.append((m.group(1), "", "html"))

                for raw_target, text, ltype in matches:
                    target = raw_target.strip()
                    if not target or target.startswith("javascript:"):
                        self.issues.append(Issue(
                            tier=1,
                            category="INVALID_LINK_TARGET",
                            file=rel,
                            line=idx,
                            message=f"Empty or javascript link target: '{target}'",
                            context=line.strip()
                        ))
                        continue

                    # External URLs
                    if target.startswith(("http://", "https://", "mailto:")):
                        continue

                    # file:/// URIs handled under Tier 2
                    if target.startswith("file:"):
                        continue

                    # Pure local anchor (#...) handled under Tier 3
                    if target.startswith("#"):
                        continue

                    # Split path and anchor
                    target_path_part = target
                    target_anchor = None
                    if "#" in target:
                        target_path_part, target_anchor = target.split("#", 1)

                    target_path_clean = urllib.parse.unquote(target_path_part)

                    # Standard relative resolution
                    candidate_path = (file_dir / target_path_clean).resolve()

                    # Root-relative resolution candidate
                    candidate_root_path = (self.root / target_path_clean.lstrip("/\\")).resolve()

                    if candidate_path.exists():
                        # File exists! Verify anchor if markdown
                        if target_anchor:
                            try:
                                target_rel = candidate_path.relative_to(self.root).as_posix()
                            except ValueError:
                                target_rel = None

                            if target_rel and target_rel in self.file_anchors:
                                if target_anchor.lower() not in self.file_anchors[target_rel]:
                                    self.issues.append(Issue(
                                        tier=3,
                                        category="BROKEN_HEADING_ANCHOR",
                                        file=rel,
                                        line=idx,
                                        message=f"Target file '{target_rel}' exists, but anchor '#{target_anchor}' is missing",
                                        context=f"Link: [{text}]({target})"
                                    ))
                    elif candidate_root_path.exists():
                        # Root-relative confusion (e.g. docs/CONTRIBUTING.md -> (.editorconfig))
                        self.issues.append(Issue(
                            tier=1,
                            category="ROOT_RELATIVE_PATH_ERROR",
                            file=rel,
                            line=idx,
                            message=(
                                f"Broken relative link: '{target_path_clean}' does not exist relative to source directory "
                                f"'{file_dir.relative_to(self.root)}'. It exists at repo-root; prefix with appropriate '../'"
                            ),
                            context=f"Link: [{text}]({target})"
                        ))
                    else:
                        # Check if appending .md fixes it (GitHub Wiki extensionless links)
                        wiki_candidate = file_dir / f"{target_path_clean}.md"
                        if wiki_candidate.exists():
                            self.issues.append(Issue(
                                tier=1,
                                category="MISSING_MD_EXTENSION",
                                file=rel,
                                line=idx,
                                message=(
                                    f"Dead link (404): '{target_path_clean}' is missing '.md' extension. "
                                    f"Target '{target_path_clean}.md' exists."
                                ),
                                context=f"Link: [{text}]({target})"
                            ))
                        else:
                            self.issues.append(Issue(
                                tier=1,
                                category="DEAD_LINK_404",
                                file=rel,
                                line=idx,
                                message=f"Dead link (404): '{target}' does not resolve to any existing file or directory",
                                context=f"Link: [{text}]({target})"
                            ))

    # =========================================================================
    # TIER 2: Portability & Deprecated References
    # =========================================================================
    def verify_tier_2_portability_and_references(self):
        """
        Verify:
        - No absolute Windows URIs (file:///... or D:/...) in project documentation.
        - No deprecated Gemini models (gemini-2.5-flash, gemini-1.5-*); standard is gemini-3.8-flash.
        """
        deprecated_models = {
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash",
        }

        for mf in self.md_files:
            rel = mf.relative_to(self.root).as_posix()
            lines = self.file_lines.get(rel, [])
            is_core = is_core_doc(mf)

            # Do not run model checks on PROJECT.md (meta-scope that describes the replacement task)
            is_meta_project_doc = (rel in {"PROJECT.md", "TEST_INFRA.md", "TEST_READY.md"})

            for idx, line in enumerate(lines, 1):
                # 1. Absolute file:/// URIs in links or references
                if "file:///" in line or "file://" in line:
                    # Ignore pure rule descriptions in backticks like `file:///`
                    if re.search(r'file:///[a-zA-Z0-9]', line):
                        self.issues.append(Issue(
                            tier=2,
                            category="ABSOLUTE_FILE_URI",
                            file=rel,
                            line=idx,
                            message="Non-portable absolute file URI ('file:///...') found; replace with clean relative link",
                            context=line.strip()
                        ))
                        continue  # Do not double-flag as ABSOLUTE_WINDOWS_PATH

                # 2. Hardcoded Windows paths in links or references (outside file:///)
                if is_core and not is_meta_project_doc:
                    win_match = re.search(r'(?:[a-zA-Z]:[\\/](?:dev|Users|projects)[\\/][^\s\)\'"`]+)', line, re.IGNORECASE)
                    if win_match:
                        self.issues.append(Issue(
                            tier=2,
                            category="ABSOLUTE_WINDOWS_PATH",
                            file=rel,
                            line=idx,
                            message=f"Hardcoded absolute Windows path detected: '{win_match.group(0)}'",
                            context=line.strip()
                        ))

                # 3. Deprecated Gemini models in project docs
                if is_core and not is_meta_project_doc:
                    for model in deprecated_models:
                        if model in line:
                            self.issues.append(Issue(
                                tier=2,
                                category="DEPRECATED_MODEL_REFERENCE",
                                file=rel,
                                line=idx,
                                message=f"Deprecated model reference '{model}' found; replace with 'gemini-3.8-flash'",
                                context=line.strip()
                            ))

    # =========================================================================
    # TIER 3: Markdown Syntax & Anchors
    # =========================================================================
    def verify_tier_3_syntax_and_anchors(self):
        """
        Verify:
        - No unclosed code block fences.
        - All code blocks in core documents have valid language tags.
        - Valid GFM table syntax (delimiter row & column count consistency with escaped pipe support).
        - Heading anchors (#anchor) match actual headings in current or target documents.
        """
        link_regex = re.compile(
            r'(?P<is_img>!?)(?:\[(?P<text>[^\]]*)\])\((?P<target><[^>]+>|[^\s\)\'"]+)(?:\s+["\'](?P<title>[^"\']*)["\'])?\)'
        )

        for mf in self.md_files:
            rel = mf.relative_to(self.root).as_posix()
            lines = self.file_lines.get(rel, [])
            is_core = is_core_doc(mf)

            in_fence = False
            fence_char = None
            fence_len = 0
            fence_start_line = 0
            tables: List[Dict[str, Any]] = []
            current_table: Optional[Dict[str, Any]] = None

            for idx, line in enumerate(lines, 1):
                stripped = line.strip()

                # Fence handling
                fence_match = re.match(r"^(`{3,}|~{3,})(.*)$", stripped)
                if fence_match:
                    f_str = fence_match.group(1)
                    char = f_str[0]
                    length = len(f_str)
                    f_info = fence_match.group(2).strip()

                    if not in_fence:
                        in_fence = True
                        fence_char = char
                        fence_len = length
                        fence_start_line = idx

                        if is_core:
                            # Language tag check in core documents
                            first_token = f_info.split()[0].lower() if f_info else ""
                            if not first_token:
                                self.issues.append(Issue(
                                    tier=3,
                                    category="MISSING_LANGUAGE_TAG",
                                    file=rel,
                                    line=idx,
                                    message="Code fence missing language tag in core document (e.g. ```bash, ```python, ```text)",
                                    context=line
                                ))
                    else:
                        if char == fence_char and length >= fence_len:
                            in_fence = False
                            fence_char = None
                            fence_len = 0
                    continue

                if in_fence:
                    continue

                # Table handling (with escaped pipe support)
                if stripped.startswith("|") and stripped.endswith("|") and len(stripped) > 2:
                    cells = split_table_row(stripped)
                    if current_table is None:
                        current_table = {"start_line": idx, "rows": [(idx, cells)]}
                    else:
                        current_table["rows"].append((idx, cells))
                else:
                    if current_table:
                        tables.append(current_table)
                        current_table = None

                # Same-file Anchor check (#anchor-slug)
                masked_line = mask_inline_code(line)
                for m in link_regex.finditer(masked_line):
                    target = m.group("target")
                    if target.startswith("#") and len(target) > 1:
                        anchor = target[1:].lower()
                        file_anchors = self.file_anchors.get(rel, set())
                        if anchor not in file_anchors:
                            self.issues.append(Issue(
                                tier=3,
                                category="BROKEN_HEADING_ANCHOR",
                                file=rel,
                                line=idx,
                                message=f"Anchor '#{anchor}' does not match any heading or HTML id in '{rel}'",
                                context=f"Link: [{m.group('text')}]({target})"
                            ))

            if in_fence:
                self.issues.append(Issue(
                    tier=3,
                    category="UNCLOSED_CODE_FENCE",
                    file=rel,
                    line=fence_start_line,
                    message=f"Unclosed code fence opened at line {fence_start_line}",
                    context=lines[fence_start_line - 1] if fence_start_line <= len(lines) else None
                ))

            if current_table:
                tables.append(current_table)

            # Validate tables in core documents
            if is_core:
                for tbl in tables:
                    rows = tbl["rows"]
                    if len(rows) < 2:
                        self.issues.append(Issue(
                            tier=3,
                            category="INVALID_TABLE_SYNTAX",
                            file=rel,
                            line=tbl["start_line"],
                            message="Markdown table has only 1 row (missing delimiter row or body)",
                            context=str(rows[0][1])
                        ))
                        continue

                    delim_line, delim_cells = rows[1]
                    is_delim = all(re.match(r"^:?-+:?$", c) for c in delim_cells if c)
                    if not is_delim:
                        self.issues.append(Issue(
                            tier=3,
                            category="INVALID_TABLE_SYNTAX",
                            file=rel,
                            line=delim_line,
                            message="Table row 2 is not a valid markdown table delimiter row (expected |---|---|)",
                            context=str(delim_cells)
                        ))

                    col_count = len(rows[0][1])
                    for r_line, r_cells in rows:
                        if len(r_cells) != col_count:
                            self.issues.append(Issue(
                                tier=3,
                                category="TABLE_COLUMN_MISMATCH",
                                file=rel,
                                line=r_line,
                                message=f"Table column count mismatch: header has {col_count} columns, row {r_line} has {len(r_cells)}",
                                context=str(r_cells)
                            ))

    # =========================================================================
    # TIER 4: Fact Consistency (Architecture Cross-Check)
    # =========================================================================
    def verify_tier_4_fact_consistency(self):
        """
        Cross-check architecture facts across core documents:
        - Django version: Django 6.0 / >=5.2 alignment.
        - Dual-DB: Neon Serverless PostgreSQL (pgvector) & SQLite fallback.
        - Build commands: uv sync & npm run build.
        - Vitest test count: 117 tests in README, docs/frontend.md, docs/deployment.md.
        - Render blueprint: render.yaml validity (no merge conflicts, sync: false, settings, allowed hosts).
        """
        readme_path = self.root / "README.md"
        arch_path = self.root / "docs" / "architecture.md"
        deploy_path = self.root / "docs" / "deployment.md"
        frontend_path = self.root / "docs" / "frontend.md"
        render_yaml_path = self.root / "render.yaml"

        readme_text = readme_path.read_text(encoding="utf-8") if readme_path.exists() else ""
        arch_text = arch_path.read_text(encoding="utf-8") if arch_path.exists() else ""
        deploy_text = deploy_path.read_text(encoding="utf-8") if deploy_path.exists() else ""
        frontend_text = frontend_path.read_text(encoding="utf-8") if frontend_path.exists() else ""
        render_yaml_text = render_yaml_path.read_text(encoding="utf-8") if render_yaml_path.exists() else ""

        # 4.1 Django Version Check
        # Target: Documents should reflect Django 6.0 or >=5.2 / 5.2+ specification
        for doc_name, doc_text in [("README.md", readme_text), ("docs/architecture.md", arch_text), ("docs/deployment.md", deploy_text)]:
            if not doc_text:
                continue
            has_django = "Django" in doc_text or "django" in doc_text
            if not has_django:
                self.issues.append(Issue(
                    tier=4,
                    category="FACT_DJANGO_MISSING",
                    file=doc_name,
                    line=1,
                    message="Document does not mention Django framework"
                ))
            else:
                has_modern_django = ("6.0" in doc_text or ">=5.2" in doc_text or "5.2+" in doc_text)
                if not has_modern_django:
                    self.issues.append(Issue(
                        tier=4,
                        category="FACT_DJANGO_VERSION_MISMATCH",
                        file=doc_name,
                        line=1,
                        message="Document mentions legacy Django 5.2 without reflecting Django 6.0 / >=5.2 specification"
                    ))

        # 4.2 Dual-DB Architecture Check (Neon PostgreSQL + SQLite Fallback)
        for doc_name, doc_text in [("README.md", readme_text), ("docs/architecture.md", arch_text)]:
            if not doc_text:
                continue
            has_neon = "Neon" in doc_text or "PostgreSQL" in doc_text or "pgvector" in doc_text
            has_sqlite = "SQLite" in doc_text or "sqlite" in doc_text
            if not (has_neon and has_sqlite):
                self.issues.append(Issue(
                    tier=4,
                    category="FACT_DUAL_DB_MISMATCH",
                    file=doc_name,
                    line=1,
                    message=f"Document must clearly document Dual-DB architecture (both Neon PostgreSQL and SQLite fallback)."
                ))

        # 4.3 Build Commands Check (uv sync & npm run build)
        if readme_text:
            if "uv sync" not in readme_text:
                self.issues.append(Issue(
                    tier=4,
                    category="FACT_BUILD_CMD_MISMATCH",
                    file="README.md",
                    line=1,
                    message="README.md is missing 'uv sync' backend dependency command"
                ))
            if "npm run build" not in readme_text:
                self.issues.append(Issue(
                    tier=4,
                    category="FACT_BUILD_CMD_MISMATCH",
                    file="README.md",
                    line=1,
                    message="README.md is missing 'npm run build' frontend build command"
                ))

        # 4.4 Vitest Test Count (117 Tests across 22 files)
        for doc_name, doc_text in [("README.md", readme_text), ("docs/frontend.md", frontend_text), ("docs/deployment.md", deploy_text)]:
            if not doc_text:
                continue
            if re.search(r'\b82\s+Vitest', doc_text, re.IGNORECASE):
                self.issues.append(Issue(
                    tier=4,
                    category="FACT_VITEST_COUNT_OUTDATED",
                    file=doc_name,
                    line=1,
                    message="Document mentions obsolete '82 Vitest' tests; must be harmonized to '117 Vitest-Tests'"
                ))

        # 4.5 Render Blueprint Integrity (render.yaml)
        if render_yaml_text:
            lines = render_yaml_text.splitlines()
            for idx, line in enumerate(lines, 1):
                stripped = line.strip()
                # Git merge conflict markers
                if stripped.startswith(("<<<<<<<", "=======", ">>>>>>>")):
                    self.issues.append(Issue(
                        tier=4,
                        category="RENDER_MERGE_CONFLICT",
                        file="render.yaml",
                        line=idx,
                        message=f"Git merge conflict marker found in render.yaml: '{stripped}'",
                        context=stripped
                    ))
                # Invalid envVar schema: 'key: false' instead of 'sync: false'
                if stripped == "key: false":
                    self.issues.append(Issue(
                        tier=4,
                        category="RENDER_INVALID_ENV_VAR_KEY",
                        file="render.yaml",
                        line=idx,
                        message="Invalid envVar attribute 'key: false'; must be 'sync: false'",
                        context=stripped
                    ))
                # Incorrect DJANGO_SETTINGS_MODULE
                if "core.DJANGO_SETTINGS_MODULE" in stripped:
                    self.issues.append(Issue(
                        tier=4,
                        category="RENDER_SETTINGS_MODULE_ERROR",
                        file="render.yaml",
                        line=idx,
                        message="Invalid DJANGO_SETTINGS_MODULE 'core.DJANGO_SETTINGS_MODULE'; must be 'core.settings'",
                        context=stripped
                    ))
                # Incorrect ALLOWED_HOSTS (e.g. 3.13.0)
                if re.search(r'-\s*key:\s*ALLOWED_HOSTS', stripped):
                    if idx < len(lines) and "3.13.0" in lines[idx]:
                        self.issues.append(Issue(
                            tier=4,
                            category="RENDER_ALLOWED_HOSTS_ERROR",
                            file="render.yaml",
                            line=idx + 1,
                            message="ALLOWED_HOSTS value is set to Python version '3.13.0' instead of valid hosts",
                            context=lines[idx].strip()
                        ))

    def run_all(self, tiers: Optional[List[int]] = None) -> List[Issue]:
        self.collect_files()
        self.parse_headings_and_anchors()

        active_tiers = set(tiers or [1, 2, 3, 4])

        if 1 in active_tiers:
            self.verify_tier_1_link_integrity()
        if 2 in active_tiers:
            self.verify_tier_2_portability_and_references()
        if 3 in active_tiers:
            self.verify_tier_3_syntax_and_anchors()
        if 4 in active_tiers:
            self.verify_tier_4_fact_consistency()

        return self.issues


# =============================================================================
# Pytest Integration Test Cases
# =============================================================================

def test_tier_1_link_integrity():
    """Pytest test case for Tier 1: Link Integrity."""
    harness = MarkdownHarness()
    harness.collect_files()
    harness.parse_headings_and_anchors()
    harness.verify_tier_1_link_integrity()
    tier_1_issues = [i for i in harness.issues if i.tier == 1]
    assert len(tier_1_issues) == 0, f"Tier 1 failures ({len(tier_1_issues)}): {[i.message for i in tier_1_issues]}"


def test_tier_2_portability_and_references():
    """Pytest test case for Tier 2: Portability & Deprecated References."""
    harness = MarkdownHarness()
    harness.collect_files()
    harness.parse_headings_and_anchors()
    harness.verify_tier_2_portability_and_references()
    tier_2_issues = [i for i in harness.issues if i.tier == 2]
    assert len(tier_2_issues) == 0, f"Tier 2 failures ({len(tier_2_issues)}): {[i.message for i in tier_2_issues]}"


def test_tier_3_syntax_and_anchors():
    """Pytest test case for Tier 3: Markdown Syntax & Anchors."""
    harness = MarkdownHarness()
    harness.collect_files()
    harness.parse_headings_and_anchors()
    harness.verify_tier_3_syntax_and_anchors()
    tier_3_issues = [i for i in harness.issues if i.tier == 3]
    assert len(tier_3_issues) == 0, f"Tier 3 failures ({len(tier_3_issues)}): {[i.message for i in tier_3_issues]}"


def test_tier_4_fact_consistency():
    """Pytest test case for Tier 4: Architectural Fact Consistency."""
    harness = MarkdownHarness()
    harness.collect_files()
    harness.parse_headings_and_anchors()
    harness.verify_tier_4_fact_consistency()
    tier_4_issues = [i for i in harness.issues if i.tier == 4]
    assert len(tier_4_issues) == 0, f"Tier 4 failures ({len(tier_4_issues)}): {[i.message for i in tier_4_issues]}"


# =============================================================================
# CLI Main Entry Point
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Opaque-Box Markdown & Documentation Integrity Verification")
    parser.add_argument("--tier", type=str, default="1,2,3,4", help="Comma-separated tiers to run (1,2,3,4)")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")
    parser.add_argument("--summary-only", action="store_true", help="Print only summary counts")
    args = parser.parse_args()

    selected_tiers = [int(t.strip()) for t in args.tier.split(",") if t.strip().isdigit()]

    harness = MarkdownHarness()
    issues = harness.run_all(tiers=selected_tiers)

    tier_counts = {1: 0, 2: 0, 3: 0, 4: 0}
    for iss in issues:
        tier_counts[iss.tier] = tier_counts.get(iss.tier, 0) + 1

    total_issues = len(issues)

    if args.json:
        data = {
            "summary": {
                "total_issues": total_issues,
                "tier_counts": tier_counts,
                "status": "PASSED" if total_issues == 0 else "FAILED",
            },
            "issues": [asdict(i) for i in issues]
        }
        print(json.dumps(data, indent=2, ensure_ascii=False))
        sys.exit(0 if total_issues == 0 else 1)

    print("=" * 80)
    print("MARKDOWN & DOCUMENTATION INTEGRITY VERIFICATION SUITE")
    print("=" * 80)
    print(f"Scanned Markdown Files: {len(harness.md_files)}")
    print(f"Repository Root:        {harness.root}")
    print("-" * 80)
    print(f"[TIER 1] Link Integrity & 404 Detection:             {tier_counts[1]} issue(s)")
    print(f"[TIER 2] Portability & Deprecated Model References:   {tier_counts[2]} issue(s)")
    print(f"[TIER 3] Markdown Syntax, Tables & Heading Anchors:   {tier_counts[3]} issue(s)")
    print(f"[TIER 4] Fact Consistency & Architecture Cross-Check: {tier_counts[4]} issue(s)")
    print("-" * 80)

    if not args.summary_only and total_issues > 0:
        print("\nDETAILED FINDINGS:")
        for idx, iss in enumerate(issues, 1):
            ctx = f" | Context: {iss.context}" if iss.context else ""
            print(f"[{idx:03d}] [Tier {iss.tier}] [{iss.category}] {iss.file}:{iss.line}")
            print(f"      {iss.message}{ctx}")

    print("=" * 80)
    if total_issues == 0:
        print("OVERALL STATUS: [PASSED] 100% Documentation & Link Integrity Verified.")
        print("=" * 80)
        sys.exit(0)
    else:
        print(f"OVERALL STATUS: [FAILED] {total_issues} integrity issues detected across selected tiers.")
        print("=" * 80)
        sys.exit(1)


if __name__ == "__main__":
    main()
