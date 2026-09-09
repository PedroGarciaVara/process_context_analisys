from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.dto.commands import ProcessCommand
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.entities import Process
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError


class CreateProcess:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, data):
        values = ProcessCommand.from_payload(data).to_dict()
        # The persistence boundary allocates the final identity under its
        # transaction lock.  Keep a non-client placeholder solely so the
        # domain entity can be validated before the adapter is called.
        values["process_code"] = "PENDING"
        entity = Process(**values)
        if entity.parent_process_id:
            parent = self.dependencies.processes.get(entity.parent_process_id)
            if not parent:
                raise NotFoundError("Proceso padre no encontrado")
            if str(parent.get("process_id")) == str(entity.process_id) or self.dependencies.hierarchy_contains(entity.parent_process_id, entity.process_id):
                raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
        return jsonable(self.dependencies.processes.create(entity.to_dict()))
