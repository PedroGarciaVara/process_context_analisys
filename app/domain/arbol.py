"""Adaptadores de dominio legacy para árbol causal."""

from __future__ import annotations

from typing import Any

from app.domain.graph import would_create_cycle


def validate_no_cycle(causas: list[dict[str, Any]], new_parent_id: int | None, new_child_id: int | None) -> bool:
    """
    Adaptador de compatibilidad para validación de ciclos sobre la proyección legacy.
    """
    if new_parent_id is None or new_child_id is None:
        return False
    edges = [
        {
            "parent_node_id": int(causa["parent_id"]),
            "child_node_id": int(causa["id"]),
            "relationship_type": "CAUSES",
        }
        for causa in causas
        if causa.get("id") is not None and causa.get("parent_id") is not None
    ]
    return would_create_cycle(edges, int(new_parent_id), int(new_child_id), relationship_type="CAUSES")


def get_hypothesis_visual_state(hipotesis: list[dict[str, Any]]) -> str:
    estados = {h.get("estado") for h in hipotesis}
    if "validada" in estados:
        return "borde-verde"
    if "rechazada" in estados:
        return "borde-rojo"
    return ""
