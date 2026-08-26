from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.entities import Process
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from .get_process import GetProcess


class UpdateProcess:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies
        self.get_process = GetProcess(dependencies)

    def execute(self, process_id, data):
        current = self.get_process.execute(process_id)
        values = {
            "process_id": current["process_id"],
            "process_code": data.get("process_code", current.get("process_code")),
            "name": data.get("name", current.get("name")),
            "description": data.get("description", current.get("description")),
            "abstraction_level": data.get("abstraction_level", current.get("abstraction_level", 0)),
            "parent_process_id": data.get("parent_process_id", current.get("parent_process_id")),
            "status": data.get("status", current.get("status", "draft")),
        }
        entity = Process(**values)
        if entity.parent_process_id:
            parent = self.dependencies.processes.get(entity.parent_process_id)
            if not parent:
                raise NotFoundError("Proceso padre no encontrado")
            if str(entity.parent_process_id) == str(entity.process_id) or self.dependencies.hierarchy_contains(entity.parent_process_id, entity.process_id):
                raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
        result = self.dependencies.processes.update(process_id, entity.to_dict())
        if not result:
            raise NotFoundError("Proceso no encontrado")
        return jsonable(result)
