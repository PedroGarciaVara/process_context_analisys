from __future__ import annotations

from typing import Iterable


CAUSA_TAG_DEFS = (
    {"value": "maquina", "label": "Máquina", "color": "#2563EB"},
    {"value": "metodo", "label": "Método", "color": "#059669"},
    {"value": "mano de obra", "label": "Mano de obra", "color": "#D97706"},
    {"value": "medida", "label": "Medida", "color": "#7C3AED"},
)

CAUSA_TAG_VALUES = tuple(tag["value"] for tag in CAUSA_TAG_DEFS)
CAUSA_TAG_OPTIONS = [{"label": tag["label"], "value": tag["value"]} for tag in CAUSA_TAG_DEFS]
CAUSA_TAG_LABELS = {tag["value"]: tag["label"] for tag in CAUSA_TAG_DEFS}
CAUSA_TAG_COLORS = {tag["value"]: tag["color"] for tag in CAUSA_TAG_DEFS}
CAUSA_TAG_BUTTON_IDS = {tag["value"]: f"causa-tag-{tag['value'].replace(' ', '-')}-btn" for tag in CAUSA_TAG_DEFS}


def normalize_causa_tags(tags: Iterable[str] | str | None) -> list[str]:
    if not tags:
        return []
    raw_tags = [tags] if isinstance(tags, str) else list(tags)
    normalized: list[str] = []
    seen: set[str] = set()
    for tag in raw_tags:
        if tag is None:
            continue
        candidate = " ".join(str(tag).strip().lower().split())
        if candidate in CAUSA_TAG_COLORS and candidate not in seen:
            seen.add(candidate)
            normalized.append(candidate)
    return [tag for tag in CAUSA_TAG_VALUES if tag in seen]


def causa_tag_label(tag: str) -> str:
    return CAUSA_TAG_LABELS.get(tag, tag.title())


def causa_tag_color(tag: str) -> str:
    return CAUSA_TAG_COLORS.get(tag, "#6B7280")


def causa_tag_button_id(tag: str) -> str:
    return CAUSA_TAG_BUTTON_IDS[tag]
