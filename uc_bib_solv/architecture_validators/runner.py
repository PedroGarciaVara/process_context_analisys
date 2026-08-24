"""AST-based, deterministic architecture validators.

The runner deliberately accepts a project root so tests can exercise both
conforming and deliberately broken fixtures without mutating product code.
"""

from __future__ import annotations

import argparse
import ast
import fnmatch
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .allowlist import ALLOWLIST

MANDATORY = ("domain", "application/ports", "adapters/inbound", "adapters/outbound", "infrastructure")
SNAKE = re.compile(r"^[a-z][a-z0-9_]*$")
PASCAL = re.compile(r"^[A-Z][A-Za-z0-9]*$")
CONSTANT = re.compile(r"^[A-Z][A-Z0-9_]*$")
FORBIDDEN_DOMAIN_WORDS = (
    "flask", "dash", "dataiku", "psycopg2", "db_cursor", "os.environ", "dotenv",
    "requests", "urllib", "httpx", "socket", "infrastructure", "adapters.outbound",
    "app.persistence", "repositories", "routes", "services",
)
SQL_WORDS = ("SELECT", "INSERT", "UPDATE", "DELETE", "CREATE TABLE", "ALTER TABLE")
CONCRETE_WORDS = ("repository", "client", "gateway", "connection", "session")


@dataclass(frozen=True, order=True)
class Diagnostic:
    file: str
    line: int
    rule: str
    origin: str
    target: str
    message: str

    def render(self) -> str:
        return f"{self.file}:{self.line} | {self.rule} | {self.origin} -> {self.target} | {self.message}"


def _python_files(root: Path) -> list[Path]:
    return sorted((p for p in root.rglob("*.py") if "__pycache__" not in p.parts), key=lambda p: p.as_posix())


def _relative(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def _module_name(node: ast.AST) -> str:
    if isinstance(node, ast.Import):
        return ",".join(alias.name for alias in node.names)
    if isinstance(node, ast.ImportFrom):
        return "." * node.level + (node.module or "")
    return ""


def _origin(path: Path, root: Path) -> str:
    rel = _relative(path, root).split("/")
    try:
        i = rel.index("modules")
        return "/".join(rel[i : i + 3])
    except ValueError:
        return "/".join(rel[:-1]) or "."


def _layer(path: Path, root: Path) -> str:
    rel = _relative(path, root).split("/")
    try:
        i = rel.index("modules")
        if rel[i + 2] == "adapters" and len(rel) > i + 3:
            return f"adapters/{rel[i + 3]}"
        return rel[i + 2]
    except (ValueError, IndexError):
        return ""


def _allowlisted(rel: str) -> bool:
    # Allowlist entries are compatibility exceptions for legacy surfaces only.
    # A target module must never be able to bypass an architectural diagnostic.
    if rel.startswith("uc_bib_solv/modules/"):
        return False
    return any(fnmatch.fnmatch(rel, entry.pattern) for entry in ALLOWLIST)


def check_structure(root: Path) -> list[Diagnostic]:
    diagnostics: list[Diagnostic] = []
    modules = root / "uc_bib_solv" / "modules"
    if not modules.exists():
        return diagnostics
    for module in sorted((p for p in modules.iterdir() if p.is_dir()), key=lambda p: p.name):
        for required in MANDATORY:
            path = module / required
            if not path.is_dir():
                diagnostics.append(Diagnostic(_relative(path, root), 1, "structure", f"modules/{module.name}", required, "mandatory directory is missing"))
    return diagnostics


def check_naming(root: Path) -> list[Diagnostic]:
    diagnostics: list[Diagnostic] = []
    modules = root / "uc_bib_solv" / "modules"
    if not modules.exists():
        return diagnostics
    for path in _python_files(root / "uc_bib_solv"):
        rel = _relative(path, root)
        if _allowlisted(rel):
            continue
        if path.suffix == ".py" and not SNAKE.match(path.stem) and path.name not in {"__init__.py", "__main__.py"}:
            diagnostics.append(Diagnostic(rel, 1, "naming", "path", path.name, "Python module must use snake_case"))
        if path.suffix != ".py":
            continue
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=rel)
        except SyntaxError as exc:
            diagnostics.append(Diagnostic(rel, exc.lineno or 1, "naming", "syntax", "", "cannot inspect invalid Python"))
            continue
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and not node.name.startswith("_") and not SNAKE.match(node.name):
                diagnostics.append(Diagnostic(rel, node.lineno, "naming", "function", node.name, "function must use snake_case"))
            elif isinstance(node, ast.ClassDef) and not PASCAL.match(node.name):
                diagnostics.append(Diagnostic(rel, node.lineno, "naming", "class", node.name, "class must use PascalCase"))
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id.lstrip("_").isupper() and not CONSTANT.match(target.id.lstrip("_")):
                        diagnostics.append(Diagnostic(rel, target.lineno, "naming", "constant", target.id, "constant must use UPPER_SNAKE_CASE"))
    return diagnostics


def _is_cross_domain(name: str, origin: str) -> bool:
    # The composition root is explicitly responsible for wiring adapters from
    # multiple domains.  Cross-domain checks apply to domain/application code,
    # not to infrastructure or inbound/outbound adapter composition.
    origin_parts = origin.split("/")
    if len(origin_parts) >= 3 and origin_parts[2] in {"infrastructure", "adapters"}:
        return False
    parts = name.split(".")
    if "modules" not in parts:
        return False
    idx = parts.index("modules")
    if len(parts) <= idx + 2:
        return False
    target_context = parts[idx + 1]
    origin_context = origin.split("/")[1] if len(origin.split("/")) > 1 else ""
    transitional_contexts = {
        "BPM": {"bpm"},
        "TREE": {"rca_tree"},
    }
    if any(origin_context in contexts and target_context in contexts for contexts in transitional_contexts.values()):
        return False
    return target_context != origin_context


def check_dependencies(root: Path) -> list[Diagnostic]:
    diagnostics: list[Diagnostic] = []
    modules = root / "uc_bib_solv" / "modules"
    if not modules.exists():
        return diagnostics
    for path in _python_files(modules):
        rel = _relative(path, root)
        origin = _origin(path, root)
        layer = _layer(path, root)
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=rel)
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if not isinstance(node, (ast.Import, ast.ImportFrom)):
                continue
            target = _module_name(node)
            normalized = target.lstrip(".").lower()
            rule = None
            message = ""
            if layer == "domain" and any(word in normalized for word in FORBIDDEN_DOMAIN_WORDS):
                rule, message = "domain-isolation", "domain imports an external, persistence or outer-layer dependency"
            elif layer == "domain" and target.startswith(".") and any(part in normalized for part in ("infrastructure", "adapters", "application")):
                rule, message = "domain-isolation", "domain may not import application, adapters or infrastructure"
            elif layer == "inbound" and ("adapters.outbound" in normalized or ".outbound" in normalized or "repositories" in normalized):
                rule, message = "layer-dependency", "inbound may not import outbound or legacy repositories directly"
            elif layer == "application" and ("adapters" in normalized or "infrastructure" in normalized or any(word in normalized for word in CONCRETE_WORDS)):
                rule, message = "layer-dependency", "application may depend on ports, not concrete adapters"
            elif _is_cross_domain(target, origin) and ".application.ports" not in target:
                rule, message = "domain-dependency", "cross-domain imports must use public application ports"
            if rule:
                if not _allowlisted(rel):
                    diagnostics.append(Diagnostic(rel, getattr(node, "lineno", 1), rule, origin, target, message))
    return diagnostics


def check_concrete_implementations(root: Path) -> list[Diagnostic]:
    diagnostics: list[Diagnostic] = []
    modules = root / "uc_bib_solv" / "modules"
    if not modules.exists():
        return diagnostics
    seen: dict[tuple[str, str], list[tuple[Path, int]]] = {}
    for path in _python_files(modules):
        rel = _relative(path, root)
        origin = _origin(path, root)
        layer = _layer(path, root)
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=rel)
        except SyntaxError:
            continue
        if layer in ("application", "domain"):
            for node in ast.walk(tree):
                if isinstance(node, (ast.Import, ast.ImportFrom)):
                    target = _module_name(node)
                    if any(word in target.lower() for word in CONCRETE_WORDS):
                        if not _allowlisted(rel):
                            diagnostics.append(Diagnostic(rel, node.lineno, "concrete-implementation", origin, target, "use cases and domain must receive ports by injection"))
                elif isinstance(node, ast.Call):
                    name = node.func.id if isinstance(node.func, ast.Name) else getattr(node.func, "attr", "")
                    if any(word in name.lower() for word in CONCRETE_WORDS) and not name.lower().startswith("fake"):
                        if not _allowlisted(rel):
                            diagnostics.append(Diagnostic(rel, node.lineno, "concrete-implementation", origin, name, "concrete implementation must be instantiated by infrastructure wiring"))
        if layer == "adapters/outbound":
            for node in tree.body:
                if isinstance(node, ast.ClassDef) and any(word in node.name.lower() for word in CONCRETE_WORDS):
                    key = (origin.split("/")[1], re.sub(r"[^a-z0-9]", "", node.name.lower()).replace("repository", ""))
                    seen.setdefault(key, []).append((path, node.lineno))
        if layer == "domain":
            for node in ast.walk(tree):
                if isinstance(node, ast.Constant) and isinstance(node.value, str):
                    upper = node.value.upper()
                    if any(sql in upper for sql in SQL_WORDS):
                        if not _allowlisted(rel):
                            diagnostics.append(Diagnostic(rel, getattr(node, "lineno", 1), "domain-isolation", origin, "SQL", "domain must not contain SQL"))
    for (domain, operation), paths in sorted(seen.items()):
        if operation and len(paths) > 1:
            for path, line in sorted(paths, key=lambda item: item[0].as_posix()):
                rel = _relative(path, root)
                if not _allowlisted(rel):
                    diagnostics.append(Diagnostic(rel, line, "duplicate-implementation", f"modules/{domain}/adapters/outbound", operation, "multiple active outbound implementations share an operation"))
    return diagnostics


def run_checks(root: Path, checks: Iterable[str]) -> list[Diagnostic]:
    result: list[Diagnostic] = []
    for check in checks:
        result.extend({
            "structure": check_structure,
            "naming": check_naming,
            "dependencies": check_dependencies,
            "concrete_implementations": check_concrete_implementations,
        }[check](root))
    return sorted(set(result))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run deterministic architecture checks")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--check-structure", action="store_true")
    group.add_argument("--check-naming", action="store_true")
    group.add_argument("--check-dependencies", action="store_true")
    group.add_argument("--check-concrete-implementations", action="store_true")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    selected = [name for name, enabled in (
        ("structure", args.check_structure), ("naming", args.check_naming),
        ("dependencies", args.check_dependencies), ("concrete_implementations", args.check_concrete_implementations),
    ) if enabled]
    diagnostics = run_checks(args.root.resolve(), selected or ("structure", "naming", "dependencies", "concrete_implementations"))
    for diagnostic in diagnostics:
        print(diagnostic.render())
    return 1 if diagnostics else 0
