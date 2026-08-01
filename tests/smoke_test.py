from __future__ import annotations

import time
import uuid
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.domain.arbol import validate_no_cycle
from app.persistence import (
    analisis_causas_detalle_repo,
    analisis_causas_repo,
    causa_repo,
    contrato_repo,
    hipotesis_repo,
    maquina_repo,
    node_repo,
    proceso_repo,
)


def run_smoke_test():
    suffix = str(uuid.uuid4())[:8]
    proceso = proceso_repo.create(f"Proceso_{suffix}")
    contrato = contrato_repo.create(proceso["id"], f"Contrato_{suffix}", "OEE", "<150 min")
    maquina = maquina_repo.create(f"Maquina_{suffix}")
    contrato_repo.add_maquina(contrato["id"], maquina["id"])

    raiz = causa_repo.create(contrato["id"], f"CausaRaiz_{suffix}", "Descripción", "causa", "metodo", None)
    hijo = causa_repo.create(contrato["id"], f"CausaHija_{suffix}", "Desc", "efecto", "maquina", raiz["id"])

    causas = causa_repo.get_by_contrato(contrato["id"])
    assert not validate_no_cycle(causas, raiz["id"], hijo["id"])
    assert validate_no_cycle(causas, hijo["id"], raiz["id"])

    hip = hipotesis_repo.create(
        hijo["id"],
        f"Hipotesis_{suffix}",
        "aceptacion",
        "criterio",
        "pendiente",
    )
    hipotesis_repo.update_estado(hip["id"], "validada")
    updated = hipotesis_repo.get_by_id(hip["id"])
    assert updated and updated["estado"] == "validada"
    assert node_repo.get_by_legacy_ref("causa", int(raiz["id"])) is not None
    assert node_repo.get_by_legacy_ref("hipotesis", int(hip["id"])) is not None

    analisis = analisis_causas_repo.create(
        contrato["id"],
        proceso["id"],
        maquina["id"],
        f"Persona_{suffix}",
        f"Apertura_{suffix}",
    )
    detalle = analisis_causas_detalle_repo.upsert(
        analisis["id"],
        "causa",
        "retenida",
        f"Comentario_{suffix}",
        causa_id=raiz["id"],
    )
    assert detalle["evaluacion"] == "retenida"
    assert detalle["node_id"] is not None
    assert analisis_causas_repo.get_open_by_contrato(contrato["id"])["id"] == analisis["id"]
    analisis_causas_repo.update_estado(analisis["id"], "cerrado")
    assert analisis_causas_repo.get_by_id(analisis["id"])["estado"] == "cerrado"

    tree = causa_repo.build_tree(causas)
    assert len(tree) >= 1

    proceso_repo.delete(proceso["id"]) if False else None

    start = time.perf_counter()
    _ = causa_repo.get_by_contrato(contrato["id"])
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 2000

    print("smoke_test OK")


if __name__ == "__main__":
    run_smoke_test()
