from pathlib import Path

from uc_bib_solv.modules.bpm.domain.processes.context import ContextDetail, ContextRecord, calculate_kpi
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from .dependencies import ProcessModelingDependencies, jsonable
from .versions import GetVersion


class CreateContextRecord:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, node_id, data):
        node = self.dependencies.nodes.get(node_id)
        if not node:
            raise NotFoundError("Nodo no encontrado")
        record = ContextRecord.from_payload(data).to_dict()
        result = self.dependencies.nodes.create_context_record(str(node_id), str(node["version_id"]), record)
        return jsonable(result)


class GetContext:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies
        self.get_version = GetVersion(dependencies)

    def execute(self, version_id, node_id=None, family=None, record_type=None):
        payload = self.get_version.execute(version_id)
        records = self.dependencies.nodes.list_context_records(node_id=node_id, version_id=version_id, record_type=record_type)
        if family:
            records = [
                item for item in records
                if (item.get("payload") or {}).get("family") == family
                or (item.get("payload") or {}).get("data", {}).get("family") == family
            ]
        methodology = []
        for name in ("promt.md", "agents.md"):
            path = Path(__file__).resolve().parents[5] / name
            if path.exists():
                methodology.append({"name": name, "version": "repository", "source": {"path": name}, "content": path.read_text(encoding="utf-8")})
        return jsonable({
            "process": payload.get("process"),
            "version": payload.get("version"),
            "nodes": payload.get("nodes", []),
            "transitions": payload.get("transitions", []),
            "details": [{"node_id": item.get("node_id"), "metadata": item.get("metadata") or {}} for item in payload.get("nodes", []) if not node_id or str(item.get("node_id")) == str(node_id)],
            "records": records,
            "methodology": methodology,
            "filters": {"version_id": str(version_id), "node_id": node_id, "family": family, "record_type": record_type},
            "provenance": {"source": "UC_BIB_Solve", "representation": "structured_context"},
        })


class CalculateContextKpi:
    def execute(self, data):
        if not isinstance(data, dict):
            raise ProcessModelingError("El payload KPI debe ser un objeto JSON", "invalid_kpi_payload")
        return calculate_kpi(data.get("values") or [], version=str(data.get("version") or ""), source=data.get("source"))
