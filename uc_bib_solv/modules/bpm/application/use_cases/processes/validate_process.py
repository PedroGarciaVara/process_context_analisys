"""Use case for validating a persisted BPM process graph."""

from __future__ import annotations

from uc_bib_solv.modules.bpm.domain.processes.entities import Process
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError
from uc_bib_solv.modules.bpm.domain.processes.rules import validate_graph
from uc_bib_solv.modules.bpm.domain.shared.exceptions import BpmDomainError


class ValidateProcess:
    """Validate process, graph and process hierarchy without mutating state."""

    def __init__(self, dependencies):
        self.dependencies = dependencies

    def execute(self, process_id):
        process = self.dependencies.processes.get(process_id)
        if not process:
            raise NotFoundError("Proceso no encontrado")

        errors = []
        try:
            Process(
                process_id=process.get("process_id", process_id),
                process_code=process.get("process_code", ""),
                name=process.get("name", ""),
                description=process.get("description"),
                parent_process_id=process.get("parent_process_id"),
                abstraction_level=process.get("abstraction_level", 0),
                status=process.get("status", "draft"),
            )
        except (ValueError, TypeError, BpmDomainError) as exc:
            errors.append({
                "code": getattr(exc, "code", "invalid_process"),
                "field": getattr(exc, "field", "process"),
                "message": str(exc),
            })

        graph = validate_graph(
            process.get("nodes", []),
            process.get("transitions", []),
            self._parent_by_process(process),
            require_complete_decisions=True,
        )
        errors.extend(graph["errors"])
        return {"valid": not errors, "errors": errors}

    def _parent_by_process(self, process):
        """Build the hierarchy snapshot when the repository exposes one."""
        processes = getattr(self.dependencies.processes, "list", None)
        if not callable(processes):
            rows = [process]
        else:
            rows = processes()
        return {
            str(row["process_id"]): str(row["parent_process_id"])
            for row in rows
            if row.get("process_id") and row.get("parent_process_id")
        }


__all__ = ["ValidateProcess"]
