"""Application composition for BPM process-modeling use cases."""

from .use_cases.context.context_records import CalculateContextKpi, CreateContextRecord, GetContext
from .use_cases.nodes import CreateProcessNode, CreateProcessNodeWithTransition, DeleteOperation, DeleteProcessNode, GetNodeMetadata, InsertOperationOnTransition, UpdateNodeMetadata, UpdateProcessNode
from .use_cases.operations import GetProcessOperation, UpdateProcessOperationStages
from .use_cases.process_modeling_dependencies import ProcessModelingDependencies
from .use_cases.processes import (
    CreateProcess,
    DeleteProcess,
    GetProcess,
    ListProcesses,
    UpdateProcess,
    ValidateProcess,
)
from .use_cases.transitions import CreateTransition, DeleteTransition, UpdateTransition


class ProcessModelingApplication:
    """Explicit application facade composed from individual use cases."""

    def __init__(self, processes, nodes, transitions):
        dependencies = ProcessModelingDependencies(processes, nodes, transitions)
        self._list_processes = ListProcesses(dependencies)
        self._get_process = GetProcess(dependencies)
        self._create_process = CreateProcess(dependencies)
        self._update_process = UpdateProcess(dependencies)
        self._delete_process = DeleteProcess(dependencies)
        self._validate_process = ValidateProcess(dependencies)
        self._create_node = CreateProcessNode(dependencies)
        self._create_node_with_transition = CreateProcessNodeWithTransition(dependencies)
        self._update_node = UpdateProcessNode(dependencies)
        self._delete_node = DeleteProcessNode(dependencies)
        self._insert_operation = InsertOperationOnTransition(dependencies)
        self._delete_operation = DeleteOperation(dependencies)
        self._get_node_metadata = GetNodeMetadata(dependencies)
        self._update_node_metadata = UpdateNodeMetadata(dependencies)
        self._get_operation = GetProcessOperation(dependencies)
        self._update_operation_stages = UpdateProcessOperationStages(dependencies)
        self._create_context_record = CreateContextRecord(dependencies)
        self._get_context = GetContext(dependencies)
        self._calculate_context_kpi = CalculateContextKpi()
        self._create_transition = CreateTransition(dependencies)
        self._update_transition = UpdateTransition(dependencies)
        self._delete_transition = DeleteTransition(dependencies)

    def list_processes(self): return self._list_processes.execute()
    def create_process(self, data): return self._create_process.execute(data)
    def get_process(self, process_id, expand_node_id=None): return self._get_process.execute(process_id, expand_node_id)
    def update_process(self, process_id, data): return self._update_process.execute(process_id, data)
    def delete_process(self, process_id, cascade=False): return self._delete_process.execute(process_id, cascade)
    def validate_process(self, process_id): return self._validate_process.execute(process_id)
    def create_node(self, process_id, data): return self._create_node.execute(process_id, data)
    def create_node_with_transition(self, process_id, data): return self._create_node_with_transition.execute(process_id, data)
    def update_node(self, node_id, data): return self._update_node.execute(node_id, data)
    def delete_node(self, node_id): return self._delete_node.execute(node_id)
    def insert_operation(self, process_id, transition_id, data): return self._insert_operation.execute(process_id, transition_id, data)
    def delete_operation(self, node_id, reconnect=False): return self._delete_operation.execute(node_id, reconnect)
    def get_node_metadata(self, node_id): return self._get_node_metadata.execute(node_id)
    def update_node_metadata(self, node_id, data): return self._update_node_metadata.execute(node_id, data)
    def update_operation_stages(self, operation_id, data): return self._update_operation_stages.execute(operation_id, data)
    def get_context(self, process_id, node_id=None, family=None, record_type=None): return self._get_context.execute(process_id, node_id, family, record_type)
    def create_context_record(self, node_id, data): return self._create_context_record.execute(node_id, data)
    def calculate_context_kpi(self, data):
        # TODO fase calculo automatico KPI: integrar con kpi_description,
        # kpi_args y kpi_function de los contratos en una fase posterior.
        return self._calculate_context_kpi.execute(data)
    def create_transition(self, process_id, data): return self._create_transition.execute(process_id, data)
    def update_transition(self, transition_id, data): return self._update_transition.execute(transition_id, data)
    def delete_transition(self, transition_id): return self._delete_transition.execute(transition_id)


__all__ = ["ProcessModelingApplication"]
