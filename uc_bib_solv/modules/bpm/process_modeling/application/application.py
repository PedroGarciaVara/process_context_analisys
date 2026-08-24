"""Explicit Process Modeling application composition."""

from .use_cases.context_records import CalculateContextKpi, CreateContextRecord, GetContext
from .use_cases.dependencies import ProcessModelingDependencies
from .use_cases.nodes import CreateNode, DeleteNode, GetNodeMetadata, UpdateNode, UpdateNodeMetadata
from .use_cases.operations import CreateOperation, DeleteOperation, GetOperation, UpdateOperationStages
from .use_cases.processes import CreateProcess, CreateVersion, GetProcess, ListProcesses, ListVersions, UpdateProcess
from .use_cases.transitions import CreateTransition, DeleteTransition
from .use_cases.versions import GetVersion, UpdateVersion, ValidateVersion


class ProcessModelingApplication:
    """Application facade composed from individually named use cases."""

    def __init__(self, persistence):
        dependencies = ProcessModelingDependencies(persistence)
        self._list_processes = ListProcesses(dependencies)
        self._get_process = GetProcess(dependencies)
        self._create_process = CreateProcess(dependencies)
        self._update_process = UpdateProcess(dependencies)
        self._list_versions = ListVersions(dependencies)
        self._create_version = CreateVersion(dependencies)
        self._get_version = GetVersion(dependencies)
        self._update_version = UpdateVersion(dependencies)
        self._create_node = CreateNode(dependencies)
        self._update_node = UpdateNode(dependencies)
        self._delete_node = DeleteNode(dependencies)
        self._get_node_metadata = GetNodeMetadata(dependencies)
        self._update_node_metadata = UpdateNodeMetadata(dependencies)
        self._get_operation = GetOperation(dependencies)
        self._create_operation = CreateOperation(dependencies)
        self._delete_operation = DeleteOperation(dependencies)
        self._update_operation_stages = UpdateOperationStages(dependencies)
        self._create_context_record = CreateContextRecord(dependencies)
        self._get_context = GetContext(dependencies)
        self._calculate_context_kpi = CalculateContextKpi()
        self._create_transition = CreateTransition(dependencies)
        self._delete_transition = DeleteTransition(dependencies)
        self._validate_version = ValidateVersion(dependencies)

    def list_processes(self): return self._list_processes.execute()
    def create_process(self, data): return self._create_process.execute(data)
    def get_process(self, process_id): return self._get_process.execute(process_id)
    def update_process(self, process_id, data): return self._update_process.execute(process_id, data)
    def list_versions(self, process_id): return self._list_versions.execute(process_id)
    def create_version(self, process_id, data): return self._create_version.execute(process_id, data)
    def get_version(self, version_id, expand_node_id=None): return self._get_version.execute(version_id, expand_node_id)
    def update_version(self, version_id, data): return self._update_version.execute(version_id, data)
    def create_node(self, version_id, data): return self._create_node.execute(version_id, data)
    def update_node(self, node_id, data): return self._update_node.execute(node_id, data)
    def delete_node(self, node_id): return self._delete_node.execute(node_id)
    def get_node_metadata(self, node_id): return self._get_node_metadata.execute(node_id)
    def update_node_metadata(self, node_id, data): return self._update_node_metadata.execute(node_id, data)
    def get_operation(self, operation_id): return self._get_operation.execute(operation_id)
    def create_operation(self, version_id, data): return self._create_operation.execute(version_id, data)
    def delete_operation(self, operation_id): return self._delete_operation.execute(operation_id)
    def update_operation_stages(self, operation_id, data): return self._update_operation_stages.execute(operation_id, data)
    def get_context(self, version_id, node_id=None, family=None, record_type=None): return self._get_context.execute(version_id, node_id, family, record_type)
    def create_context_record(self, node_id, data): return self._create_context_record.execute(node_id, data)
    def calculate_context_kpi(self, data): return self._calculate_context_kpi.execute(data)
    def create_transition(self, version_id, data): return self._create_transition.execute(version_id, data)
    def delete_transition(self, transition_id): return self._delete_transition.execute(transition_id)
    def validate_version(self, version_id): return self._validate_version.execute(version_id)


__all__ = ["ProcessModelingApplication"]
