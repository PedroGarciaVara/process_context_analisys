from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError


class GetProcess:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id):
        try:
            value = self.dependencies.processes.get(process_id)
        except (ValueError, TypeError):
            raise ProcessModelingError("process_id debe ser un UUID válido", "invalid_uuid")
        if not value:
            raise NotFoundError("Proceso no encontrado")
        return jsonable(value)
