"""Injected persistence dependencies for BPM process-modeling use cases."""

from __future__ import annotations

from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotDraftError, NotFoundError, ProcessModelingError


class ProcessModelingDependencies:
    """Application-facing repository dependencies for BPM modeling."""

    def __init__(self, persistence):
        self.processes = persistence.processes
        self.versions = persistence.versions
        self.nodes = persistence.nodes
        self.transitions = persistence.transitions

    def version(self, version_id):
        try:
            value = self.versions.get(version_id)
        except (ValueError, TypeError):
            raise ProcessModelingError("version_id debe ser un UUID válido", "invalid_uuid")
        if not value:
            raise NotFoundError("Versión no encontrada")
        return value

    def draft(self, version_id):
        value = self.version(version_id)
        if value["status"] != "draft":
            raise NotDraftError()
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
