from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.application.use_cases.nodes.create_process_node import CreateProcessNode


class CreateProcessOperation:
    """Create an operation as a typed BPM operation node."""

    def __init__(self, dependencies: ProcessModelingDependencies):
        self.create_node = CreateProcessNode(dependencies)

    def execute(self, process_id, data):
        payload = dict(data)
        payload["node_type"] = "operation"
        return self.create_node.execute(process_id, payload)
