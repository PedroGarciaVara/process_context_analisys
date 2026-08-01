from __future__ import annotations

from .entities import ProcessDefinition, ProcessNode, ProcessTransition, ProcessVersion
from .validators import validate_graph


class ProcessModelingUseCases:
    """Small framework-free application boundary, useful with test doubles."""

    def __init__(self, processes, versions, nodes, transitions):
        self.processes = processes
        self.versions = versions
        self.nodes = nodes
        self.transitions = transitions

    def create_process(self, **data):
        entity = ProcessDefinition(**data)
        return self.processes.create(entity)

    def create_version(self, **data):
        entity = ProcessVersion(**data)
        return self.versions.create(entity)

    def create_node(self, **data):
        entity = ProcessNode(**data)
        return self.nodes.create(entity)

    def create_transition(self, **data):
        entity = ProcessTransition(**data)
        return self.transitions.create(entity)

    def validate(self, nodes, transitions, parent_by_process=None):
        return validate_graph(nodes, transitions, parent_by_process)
