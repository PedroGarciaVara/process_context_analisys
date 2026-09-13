"""Replace the shared manual layout overrides for a BPM process."""

from uc_bib_solv.modules.bpm.application.dto.serialization import jsonable
from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.domain.processes.layout import ProcessLayout


class ReplaceProcessLayout:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id, payload):
        process = self.dependencies.process(process_id)
        layout = ProcessLayout.from_payload(process["process_id"], payload)
        layout.assert_nodes_belong_to(node["node_id"] for node in process.get("nodes", []))
        positions = self.dependencies.layouts.replace_for_process(
            layout.process_id, layout.as_records()
        )
        return jsonable({
            "process_id": layout.process_id,
            "strategy": "manual_overrides",
            "positions": positions,
        })
