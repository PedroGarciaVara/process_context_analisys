from __future__ import annotations

import time
import uuid
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import validate_no_cycle
from uc_bib_solv.modules.bpm.adapters.outbound.postgres import (
    contrato_repo,
    maquina_repo,
    proceso_repo,
)
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import (
    analysis_detail_repository,
    analysis_repository,
    causa_repo,
    hipotesis_repo,
    node_repo,
)


def run_smoke_test():
    suffix = str(uuid.uuid4())[:8]
    proceso = proceso_repo.create(f"Proceso_{suffix}")
    contrato = contrato_repo.create(proceso["id"], f"Contrato_{suffix}", "OEE", "<150 min")
    maquina = maquina_repo.create(f"Maquina_{suffix}")
    contrato_repo.add_maquina(contrato["id"], maquina["id"])

    raiz = causa_repo.create(contrato["id"], f"CausaRaiz_{suffix}", "Descripción", "causa", "metodo", None)
    hijo = causa_repo.create(contrato["id"], f"CausaHija_{suffix}", "Desc", "efecto", "maquina", raiz["id"])

    causas = causa_repo.list_by_contract(contrato["id"])
    assert not validate_no_cycle(causas, raiz["id"], hijo["id"])
    assert validate_no_cycle(causas, hijo["id"], raiz["id"])

    hip = hipotesis_repo.create(
        hijo["id"],
        f"Hipotesis_{suffix}",
        "aceptacion",
        "criterio",
        "pendiente",
    )
    hipotesis_repo.update_status(hip["id"], "validada")
    updated = hipotesis_repo.get_by_id(hip["id"])
    assert updated and updated["estado"] == "validada"
    assert node_repo.get_for_cause(int(raiz["id"])) is not None
    assert node_repo.get_for_hypothesis(int(hip["id"])) is not None

    analisis = analysis_repository.create(
        contrato["id"],
        proceso["id"],
        maquina["id"],
        f"Persona_{suffix}",
        f"Apertura_{suffix}",
    )
    detalle = analysis_detail_repository.upsert(
        analisis["id"],
        "causa",
        "retenida",
        f"Comentario_{suffix}",
        causa_id=raiz["id"],
    )
    assert detalle["evaluacion"] == "retenida"
    assert detalle["node_id"] is not None
    assert analysis_repository.get_open_by_contract(contrato["id"])["id"] == analisis["id"]
    analysis_repository.update_status(analisis["id"], "cerrado")
    assert analysis_repository.get_by_id(analisis["id"])["estado"] == "cerrado"

    tree = causa_repo.build_tree(causas)
    assert len(tree) >= 1

    proceso_repo.delete(proceso["id"]) if False else None

    start = time.perf_counter()
    _ = causa_repo.list_by_contract(contrato["id"])
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 2000

    print("smoke_test OK")


if __name__ == "__main__":
    run_smoke_test()
