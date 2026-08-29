BASE_PAGES = (
    {
        "id": "inicio",
        "path": "/",
        "label": "Inicio",
        "title": "Inicio",
        "description": "Entrada principal para seleccionar proceso y contrato.",
        "nav_group": "base",
        "nav_order": 1,
    },
    {
        "id": "procesos",
        "path": "/procesos",
        "label": "Procesos",
        "title": "Procesos",
        "description": "Mantenimiento de procesos.",
        "nav_group": "base",
        "nav_order": 2,
    },
    {
        "id": "contratos",
        "path": "/contratos",
        "label": "Contratos",
        "title": "Contratos",
        "description": "Mantenimiento de contratos y asociaciones.",
        "nav_group": "base",
        "nav_order": 3,
    },
    {
        "id": "maquinas",
        "path": "/maquinas",
        "label": "Maquinas",
        "title": "Maquinas",
        "description": "Mantenimiento de maquinas.",
        "nav_group": "base",
        "nav_order": 4,
    },
)

TREE_PAGES = (
    {
        "id": "causa_detalle",
        "path": "/causa-detalle",
        "label": "Detalle causa",
        "title": "Detalle de causa",
        "description": "Edicion de causa e hipotesis.",
        "nav_group": "causal",
        "nav_order": 5,
    },
    {
        "id": "arbol",
        "path": "/arbol",
        "label": "Arbol",
        "title": "Arbol causal",
        "description": "Creacion y navegacion del arbol causal.",
        "nav_group": "causal",
        "nav_order": 6,
    },
    {
        "id": "analisis_causas_v2",
        "path": "/analisis-causas-v2",
        "label": "Analisis causas v2",
        "title": "Analisis causas v2",
        "description": "Arbol causal con evaluacion provisional.",
        "nav_group": "causal",
        "nav_order": 7,
    },
)


def _page_catalog() -> list[dict]:
    return [*BASE_PAGES, *TREE_PAGES]


def get_boundary_manifest() -> dict:
    return {
        "product_root": "uc_bib_solv",
        "target_java": "webapp_java",
    }


def get_page_catalog() -> list[dict]:
    return list(_page_catalog())


def get_bootstrap_manifest() -> dict:
    pages = get_page_catalog()
    base_pages = [page for page in pages if page["nav_group"] == "base"]
    return {
        "app_name": "UC_BIB_Solve",
        "boundary": get_boundary_manifest(),
        "pages": pages,
        "base_pages": base_pages,
        "navigation": {
            "primary": base_pages,
            "tree": [page for page in pages if page["nav_group"] == "causal"],
        },
        "render_standard": {
            "tree_shell": "panel_arbol/panel_analisis_causas_v2",
            "connectors": "2px_slate300_orthogonal",
            "cards": "fixed_width_industrial",
            "detail_panel": "fixed_right_sidebar",
        },
        "operational_catalog": "/api/bpm/operational/catalog",
        "operational_pages": {
            "inicio": "/api/bpm/operational/page/inicio",
            "procesos": "/api/bpm/operational/page/procesos",
            "contratos": "/api/bpm/operational/page/contratos",
            "maquinas": "/api/bpm/operational/page/maquinas",
        },
        "tree_views": {
            "arbol": "/api/rca-tree/nodes?view=arbol",
            "analisis_causas_v2": "/api/rca-tree/nodes?view=analisis_causas_v2",
        },
    }
