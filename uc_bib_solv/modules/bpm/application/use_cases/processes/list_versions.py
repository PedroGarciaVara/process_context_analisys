from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from .get_process import GetProcess


class ListProcessVersions:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.get_process = GetProcess(dependencies)

    def execute(self, process_id):
        process = self.get_process.execute(process_id)
        return jsonable(process.get("versions", []))
