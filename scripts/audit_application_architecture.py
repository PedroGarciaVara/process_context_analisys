#!/usr/bin/env python3
"""Build a conservative dependency inventory for the application.

This is intentionally static: it never edits source files or contacts the
database. It is used before removing legacy routes, views, or endpoints.
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEBAPP = ROOT / "uc_bib_solv" / "webapp"
JS = WEBAPP / "js"
BACKEND = ROOT / "uc_bib_solv"

DOMAIN_OWNERSHIP = (
    ("uc_bib_solv/modules/bpm", "BPM", "canonical BPM domain, application ports and adapters"),
    ("uc_bib_solv/modules/bpm/process_modeling", "BPM", "procesos, versiones, nodos, operaciones y transiciones BPM"),
    ("uc_bib_solv/modules/bpm/adapters/outbound/postgres", "BPM", "persistencia de procesos, máquinas, contratos y configuraciones"),
    ("uc_bib_solv/modules/rca_tree", "TREE", "grafo causal, análisis, causas, hipótesis y relaciones"),
    ("uc_bib_solv/modules/platform", "PLATFORM", "configuración, wiring y bootstrap"),
    ("uc_bib_solv/agent_tools", "ADAPTER", "frontera de herramientas para agentes"),
)

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def source(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def unique(values):
    return sorted(set(values))


def backend_files():
    return sorted(
        path
        for path in BACKEND.rglob("*.py")
        if "/tests/" not in path.as_posix()
        and path.name != "__pycache__"
    )


def module_name(path: Path) -> str:
    return ".".join(path.relative_to(ROOT).with_suffix("").parts)


def _constant_string(node):
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None


def _route_declarations(path: Path, tree: ast.AST):
    declarations = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for decorator in node.decorator_list:
                if not isinstance(decorator, ast.Call) or not isinstance(decorator.func, ast.Attribute):
                    continue
                if decorator.func.attr not in {"get", "post", "put", "patch", "delete"}:
                    continue
                route = _constant_string(decorator.args[0]) if decorator.args else None
                if route:
                    declarations.append({
                        "method": decorator.func.attr.upper(),
                        "path": route,
                        "owner": str(path.relative_to(ROOT)),
                        "line": node.lineno,
                        "kind": "decorator",
                    })
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "add_url_rule":
            route = _constant_string(node.args[0]) if node.args else None
            if not route:
                continue
            methods = []
            for keyword in node.keywords:
                if keyword.arg == "methods" and isinstance(keyword.value, (ast.List, ast.Tuple, ast.Set)):
                    methods = [item.value.upper() for item in keyword.value.elts if isinstance(item, ast.Constant) and isinstance(item.value, str)]
            declarations.extend({
                "method": method,
                "path": route,
                "owner": str(path.relative_to(ROOT)),
                "line": node.lineno,
                "kind": "add_url_rule",
            } for method in methods or ["UNKNOWN"])
    return declarations


def _definitions(path: Path, tree: ast.AST):
    definitions = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            name = node.name
            if name.startswith("_"):
                continue
            kind = "class" if isinstance(node, ast.ClassDef) else "function"
            definitions.append({
                "module": module_name(path),
                "name": name,
                "kind": kind,
                "owner": str(path.relative_to(ROOT)),
                "line": node.lineno,
            })
    return definitions


def _static_module_edges(files):
    edges = defaultdict(list)
    dynamic = []
    for path in files:
        try:
            tree = ast.parse(source(path), filename=str(path))
        except SyntaxError as exc:
            dynamic.append({"file": str(path.relative_to(ROOT)), "error": str(exc)})
            continue
        current = module_name(path)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    edges[current].append(alias.name)
            elif isinstance(node, ast.ImportFrom) and node.module:
                edges[current].append(node.module)
            elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in {"__import__", "import_module"}:
                value = _constant_string(node.args[0]) if node.args else None
                dynamic.append({
                    "file": str(path.relative_to(ROOT)),
                    "line": node.lineno,
                    "call": node.func.id,
                    "module": value or "dynamic",
                })
            elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "import_module":
                value = _constant_string(node.args[0]) if node.args else None
                dynamic.append({
                    "file": str(path.relative_to(ROOT)),
                    "line": node.lineno,
                    "call": "import_module",
                    "module": value or "dynamic",
                })
    return edges, dynamic


def _ownership_for(path: str):
    for prefix, domain, responsibility in DOMAIN_OWNERSHIP:
        if prefix.endswith("_") and "/" not in prefix.rsplit("_", 1)[-1]:
            if path.startswith(prefix):
                return domain, responsibility
        elif path == prefix or path.startswith(prefix + "/"):
            return domain, responsibility
    return "UNRESOLVED", "responsabilidad pendiente de clasificación"


def ownership_inventory():
    result = []
    for path in backend_files():
        relative = str(path.relative_to(ROOT))
        domain, responsibility = _ownership_for(relative)
        result.append({
            "file": relative,
            "domain": domain,
            "responsibility": responsibility,
        })
    return result


def _runtime_route_inventory():
    try:
        from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app

        app = create_app()
        routes = []
        for rule in app.url_map.iter_rules():
            methods = sorted(rule.methods - {"HEAD", "OPTIONS"})
            routes.extend({
                "method": method,
                "path": rule.rule,
                "endpoint": rule.endpoint,
                "module": getattr(app.view_functions.get(rule.endpoint), "__module__", None),
            } for method in methods)
        return {"available": True, "routes": routes}
    except Exception as exc:  # pragma: no cover - environment/database dependent
        return {"available": False, "routes": [], "error": f"{type(exc).__name__}: {exc}"}


def frontend_inventory():
    router = source(JS / "core" / "router.js")
    views = source(JS / "views" / "index.js")
    shell = source(JS / "views" / "shell_v02.js")
    app = source(JS / "app.js")
    routes = unique(re.findall(r'"([^"\n]+)"', router.split("const ROUTES", 1)[1].split("]);", 1)[0]))
    renderers = unique(value.strip('"\'') for value in re.findall(r'^\s*(["\'\w-]+):\s*render\w+', views, re.MULTILINE))
    menu_routes = unique(re.findall(r'route:\s*"([^"]+)"', shell))
    operational_routes = unique(re.findall(r'^\s*([\w-]+):\s*"([^"]+)"', app.split("const OPERATIONAL_ROUTE_MAP", 1)[1].split("};", 1)[0], re.MULTILINE))

    api_exports = {}
    for path in sorted((JS / "api").glob("*.js")):
        names = re.findall(r'export\s+(?:const|function|async function)\s+(\w+)', source(path))
        api_exports[path.stem] = names
    api_consumers = {}
    for api in (JS / "api").glob("*.js"):
        stem = api.stem
        consumers = []
        for path in JS.rglob("*.js"):
            if path == api:
                continue
            if re.search(rf'from\s+["\'].*(?:api/)?{re.escape(stem)}\.js["\']', source(path)):
                consumers.append(str(path.relative_to(ROOT)))
        api_consumers[stem] = sorted(consumers)

    route_renderer_gap = {
        "routes_without_renderers": sorted(set(routes) - set(renderers)),
        "renderers_without_routes": sorted(set(renderers) - set(routes)),
        "menu_routes_without_routes": sorted(set(menu_routes) - set(routes)),
    }
    return {
        "routes": routes,
        "renderers": renderers,
        "menu_routes": menu_routes,
        "operational_route_map": dict(operational_routes),
        "route_renderer_gap": route_renderer_gap,
        "api_exports": api_exports,
        "api_consumers": api_consumers,
        "legacy_candidates": [
            "procesos",
            "contratos",
            "maquinas",
            "arbol",
            "causa_detalle",
            "analisis_causas_v2",
        ],
    }


def backend_inventory():
    files = backend_files()
    declarations = []
    definitions = []
    parse_errors = []
    for path in files:
        try:
            tree = ast.parse(source(path), filename=str(path))
        except SyntaxError as exc:
            parse_errors.append({"file": str(path.relative_to(ROOT)), "error": str(exc)})
            continue
        declarations.extend(_route_declarations(path, tree))
        definitions.extend(_definitions(path, tree))

    grouped = defaultdict(list)
    for declaration in declarations:
        grouped[(declaration["method"], declaration["path"])].append(declaration)
    edges, dynamic_imports = _static_module_edges(files)
    source_by_path = {str(path.relative_to(ROOT)): source(path) for path in files}
    function_consumers = []
    for definition in definitions:
        needle = re.compile(rf"\b{re.escape(definition['name'])}\b")
        consumers = [path for path, text in source_by_path.items() if path != definition["owner"] and needle.search(text)]
        classification = "active" if consumers else "candidate_without_static_consumer"
        if definition["owner"].startswith("uc_bib_solv/routes/") or definition["owner"].startswith("uc_bib_solv/services/") or definition["owner"].startswith("uc_bib_solv/repositories/") or definition["owner"].startswith("uc_bib_solv/app/persistence/"):
            classification = "compatibility_or_legacy" if consumers else "candidate_legacy_pending_dynamic_validation"
        function_consumers.append({**definition, "consumers": consumers, "classification": classification})

    active = _runtime_route_inventory()
    active_modules = {route["module"] for route in active["routes"] if route.get("module")}
    inbound_adapters = []
    for path in files:
        relative = str(path.relative_to(ROOT))
        if "/adapters/inbound/http/" not in relative:
            continue
        has_routes = any(item["owner"] == relative for item in declarations)
        if has_routes:
            inbound_adapters.append({
                "module": module_name(path),
                "file": relative,
                "registered_at_runtime": module_name(path) in active_modules,
                "classification": "active" if module_name(path) in active_modules else "adapter_not_observed_in_runtime_map",
            })

    duplicate_declarations = {
        f"{method} {path}": owners
        for (method, path), owners in sorted(grouped.items())
        if len(owners) > 1
    }
    modules = []
    all_modules = {module_name(path): str(path.relative_to(ROOT)) for path in files}
    imported_modules = {target for values in edges.values() for target in values}
    for module, file in sorted(all_modules.items()):
        consumers = sorted(owner for owner, targets in edges.items() if any(target == module or target.startswith(module + ".") for target in targets))
        if consumers:
            classification = "active"
        elif file.startswith(("uc_bib_solv/routes/", "uc_bib_solv/services/", "uc_bib_solv/repositories/", "uc_bib_solv/app/persistence/")):
            classification = "candidate_legacy_pending_dynamic_validation"
        else:
            classification = "candidate_without_static_consumer"
        modules.append({"module": module, "file": file, "consumers": consumers, "classification": classification})
    return {
        "endpoint_count": len(declarations),
        "unique_endpoint_count": len(grouped),
        "duplicate_endpoint_definitions": duplicate_declarations,
        "endpoints": sorted(f"{method} {path}" for method, path in grouped),
        "endpoint_declarations": declarations,
        "runtime": active,
        "modules": modules,
        "functions": function_consumers,
        "inbound_adapters": inbound_adapters,
        "dynamic_imports": dynamic_imports,
        "parse_errors": parse_errors,
        "classification_counts": {
            "modules": {key: sum(item["classification"] == key for item in modules) for key in sorted({item["classification"] for item in modules})},
            "functions": {key: sum(item["classification"] == key for item in function_consumers) for key in sorted({item["classification"] for item in function_consumers})},
        },
        "ownership": ownership_inventory(),
    }


def inventory():
    return {"frontend": frontend_inventory(), "backend": backend_inventory()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="write the inventory as JSON")
    parser.add_argument("--check", action="store_true", help="fail on route/renderer consistency gaps")
    parser.add_argument("--check-backend", action="store_true", help="fail on backend parse errors or runtime map failure")
    args = parser.parse_args()
    result = inventory()
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        frontend = result["frontend"]
        backend = result["backend"]
        print(f"frontend routes={len(frontend['routes'])} renderers={len(frontend['renderers'])} menu={len(frontend['menu_routes'])}")
        print(f"backend endpoints={backend['unique_endpoint_count']} unique ({backend['endpoint_count']} declarations)")
        print("routes without renderers:", ", ".join(frontend["route_renderer_gap"]["routes_without_renderers"]) or "none")
        print("renderers without routes:", ", ".join(frontend["route_renderer_gap"]["renderers_without_routes"]) or "none")
        print("duplicate backend endpoint definitions:", len(backend["duplicate_endpoint_definitions"]))
        runtime = backend["runtime"]
        print(f"backend runtime routes={len(runtime['routes'])} available={runtime['available']}")
        print("backend inbound adapters not observed at runtime:", ", ".join(
            item["file"] for item in backend["inbound_adapters"] if not item["registered_at_runtime"]
        ) or "none")
        print("backend dynamic imports:", len(backend["dynamic_imports"]))
        print("backend parse errors:", len(backend["parse_errors"]))
        print("API modules without static consumers:", ", ".join(name for name, consumers in frontend["api_consumers"].items() if not consumers) or "none")
    if args.check and any(result["frontend"]["route_renderer_gap"].values()):
        raise SystemExit(1)
    if args.check_backend:
        backend = result["backend"]
        if backend["parse_errors"] or not backend["runtime"]["available"]:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
