from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessVersion
from .get_process import GetProcess


class CreateProcessVersion:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies
        self.get_process = GetProcess(dependencies)

    def execute(self, process_id, data):
        self.get_process.execute(process_id)
        entity = ProcessVersion(
            process_id=process_id,
            **{
                key: value
                for key, value in data.items()
                if key in {"version_id", "version_number", "change_description"}
            },
        )
        return jsonable(self.dependencies.versions.create(process_id, entity.to_dict()))
