from uc_bib_solv.modules.bpm.application.use_cases.process_modeling_dependencies import ProcessModelingDependencies
from uc_bib_solv.modules.bpm.application.use_cases.nodes.delete_process_node import DeleteProcessNode
from .get_operation import GetProcessOperation


class DeleteProcessOperation:
    """Delete an operation only after validating its BPM node type."""

    def __init__(self, dependencies: ProcessModelingDependencies):
        self.get_operation = GetProcessOperation(dependencies)
        self.delete_node = DeleteProcessNode(dependencies)

    def execute(self, operation_id):
        self.get_operation.execute(operation_id)
        return self.delete_node.execute(operation_id)
