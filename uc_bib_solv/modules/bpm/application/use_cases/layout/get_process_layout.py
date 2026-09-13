"""Read the shared manual layout overrides for a BPM process."""

from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies


class GetProcessLayout:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id):
        process = self.dependencies.process(process_id)
        positions = self.dependencies.layouts.list_for_process(process["process_id"])
        return jsonable({
            "process_id": process["process_id"],
            "strategy": "manual_overrides",
            "positions": positions,
        })
