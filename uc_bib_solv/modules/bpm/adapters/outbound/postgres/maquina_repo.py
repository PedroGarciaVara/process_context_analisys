from __future__ import annotations

from psycopg2.extras import Json

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


MACHINE_FIELDS = (
    "specific_description",
    "specific_characteristics",
    "specific_parameters",
    "specific_operating_ranges",
    "specific_limitations",
    "specific_instructions",
    "differences_from_machine_type",
)


def _db_json_value(value):
    """Keep Python None as SQL NULL; encode only real JSON structures."""
    return None if value is None else Json(value)


def create(nombre: str, machine_type_id: int | None = None, **fields) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre de la máquina es obligatorio.")
    with db_cursor() as cur:
        columns = ["nombre"]
        values = [nombre.strip()]
        if machine_type_id is not None:
            columns.append("maquinas_tipo_id")
            values.append(int(machine_type_id))
        for field in MACHINE_FIELDS:
            if field in fields:
                columns.append(field)
                values.append(_db_json_value(fields[field]) if field != "specific_description" else fields[field])
        placeholders = ", ".join(["%s"] * len(values))
        cur.execute(
            f"INSERT INTO maquina({', '.join(columns)}) VALUES ({placeholders}) RETURNING *",
            tuple(values),
        )
        return dict(cur.fetchone())


def get_all() -> list[dict]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM maquina ORDER BY id")
        return [dict(r) for r in cur.fetchall()]


def get_by_id(maquina_id: int) -> dict | None:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM maquina WHERE id=%s", (maquina_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def update(maquina_id: int, nombre: str, machine_type_id: int | None = None, **fields) -> dict:
    if not nombre or not nombre.strip():
        raise ValueError("El nombre de la máquina es obligatorio.")
    with db_cursor() as cur:
        assignments = ["nombre=%s"]
        values = [nombre.strip()]
        if machine_type_id is not None:
            assignments.append("maquinas_tipo_id=%s")
            values.append(int(machine_type_id))
        for field in MACHINE_FIELDS:
            if field in fields:
                assignments.append(f"{field}=%s")
                values.append(_db_json_value(fields[field]) if field != "specific_description" else fields[field])
        values.append(maquina_id)
        cur.execute(
            f"UPDATE maquina SET {', '.join(assignments)} WHERE id=%s RETURNING *",
            tuple(values),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Máquina no encontrada.")
        return dict(row)


def delete(maquina_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute("DELETE FROM maquina WHERE id=%s", (maquina_id,))
        return cur.rowcount > 0
