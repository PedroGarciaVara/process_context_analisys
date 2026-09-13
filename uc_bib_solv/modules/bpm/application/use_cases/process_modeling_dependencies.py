"""Injected persistence dependencies for BPM process-modeling use cases."""

from __future__ import annotations

from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotDraftError, NotFoundError, ProcessModelingError


class ProcessModelingDependencies:
    """Application-facing repository dependencies for BPM modeling."""

    def __init__(self, processes, nodes, transitions, layouts):
        self.processes = processes
        self.nodes = nodes
        self.transitions = transitions
        self.layouts = layouts

    def process(self, process_id):
        try:
            value = self.processes.get(process_id)
        except (ValueError, TypeError):
            raise ProcessModelingError("process_id debe ser un UUID válido", "invalid_uuid")
        if not value:
            raise NotFoundError("Proceso no encontrado")
        return value

    def hierarchy_contains(self, start_process_id, target_process_id):
        current_id = str(start_process_id)
        target_id = str(target_process_id)
        visited = set()
        while current_id:
            if current_id == target_id:
                return True
            if current_id in visited:
                raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
            visited.add(current_id)
            current = self.processes.get(current_id)
            current_id = str(current.get("parent_process_id")) if current and current.get("parent_process_id") else ""
        return False
