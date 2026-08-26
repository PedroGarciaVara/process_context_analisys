"""Process, version, node and transition domain entities."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from ..shared.exceptions import BpmDomainError
from ..shared.value_objects import OperationRef
from ..shared.value_objects import require_text as bpm_require_text
from ..shared.value_objects import require_uuid as bpm_require_uuid
from .exceptions import ProcessModelingError
from .value_objects import (
    NODE_TYPES, PROCESS_STATUSES, TRANSITION_TYPES, VERSION_STATUSES,
    NodeCode, ProcessCode, require_non_negative_int, require_text,
    require_uuid, validate_stock_properties,
)


@dataclass
class Process:
    """Canonical BPM process aggregate root."""

    process_id: str = field(default_factory=lambda: str(uuid4()))
    process_code: str = ""
    name: str = ""
    description: str | None = None
    parent_process_id: str | None = None
    abstraction_level: int = 0
    status: str = "draft"

    def __post_init__(self) -> None:
        self.process_id = require_uuid(self.process_id, "process_id")
        self.process_code = ProcessCode(self.process_code).value
        self.name = require_text(self.name, "name")
        if self.parent_process_id is not None:
            parent = bpm_require_uuid(self.parent_process_id, "parent_process_id")
            if parent == self.process_id:
                raise BpmDomainError("Un proceso no puede ser su propio padre", "hierarchy_cycle", "parent_process_id")
            self.parent_process_id = parent
        self.abstraction_level = require_non_negative_int(self.abstraction_level, "abstraction_level")
        if self.status not in PROCESS_STATUSES:
            raise ProcessModelingError("status de proceso no permitido", "invalid_process_status")

    def to_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


@dataclass(frozen=True)
class Operation:
    node_id: str
    version_id: str
    code: str
    name: str
    description: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "node_id", bpm_require_uuid(self.node_id, "node_id"))
        object.__setattr__(self, "version_id", bpm_require_uuid(self.version_id, "version_id"))
        object.__setattr__(self, "code", bpm_require_text(self.code, "code"))
        object.__setattr__(self, "name", bpm_require_text(self.name, "name"))
        object.__setattr__(self, "metadata", dict(self.metadata or {}))

    @property
    def reference(self) -> OperationRef:
        return OperationRef(self.node_id, self.version_id)


@dataclass(frozen=True)
class Stage:
    code: str
    name: str
    sequence: int
    description: str | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "code", bpm_require_text(self.code, "code"))
        object.__setattr__(self, "name", bpm_require_text(self.name, "name"))
        if isinstance(self.sequence, bool) or not isinstance(self.sequence, int) or self.sequence < 0:
            raise BpmDomainError("sequence debe ser un entero no negativo", "invalid_integer", "sequence")


@dataclass
class ProcessVersion:
    version_id: str = field(default_factory=lambda: str(uuid4()))
    process_id: str = ""
    version_number: int = 1
    change_description: str | None = None
    status: str = "draft"

    def __post_init__(self):
        self.version_id = require_uuid(self.version_id, "version_id")
        self.process_id = require_uuid(self.process_id, "process_id")
        if isinstance(self.version_number, bool) or not isinstance(self.version_number, int) or self.version_number < 1:
            raise ProcessModelingError("version_number debe ser un entero mayor que cero", "invalid_version_number")
        if self.status not in VERSION_STATUSES:
            raise ProcessModelingError("status de versión no permitido", "invalid_version_status")

    def to_dict(self):
        return self.__dict__.copy()


@dataclass
class ProcessNode:
    node_id: str = field(default_factory=lambda: str(uuid4()))
    version_id: str = ""
    node_code: str = ""
    node_type: str = "operation"
    name: str = ""
    description: str | None = None
    child_process_id: str | None = None
    output_role: str | None = None
    properties: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        self.node_id = require_uuid(self.node_id, "node_id")
        self.version_id = require_uuid(self.version_id, "version_id")
        self.node_code = NodeCode(self.node_code).value
        self.name = require_text(self.name, "name")
        if self.node_type not in NODE_TYPES:
            raise ProcessModelingError("tipo de nodo no permitido", "invalid_node_type")
        if self.child_process_id is not None:
            self.child_process_id = require_uuid(self.child_process_id, "child_process_id")
        if self.node_type == "subprocess" and not self.child_process_id:
            raise ProcessModelingError("un subprocess requiere child_process_id", "subprocess_child_required")
        if self.node_type != "subprocess" and self.child_process_id:
            raise ProcessModelingError("solo un subprocess puede declarar proceso hijo", "unexpected_child_process")
        if self.node_type == "output":
            self.output_role = self.output_role or "normal"
            if self.output_role not in {"normal", "waste"}:
                raise ProcessModelingError("output_role debe ser normal o waste", "invalid_output_role")
        elif self.output_role is not None:
            raise ProcessModelingError("solo un output puede declarar output_role", "unexpected_output_role")
        if self.node_type == "stock":
            self.properties = dict(self.properties or {})
            self.properties["stock"] = validate_stock_properties(self.properties)

    def to_dict(self):
        return self.__dict__.copy()


@dataclass
class ProcessTransition:
    transition_id: str = field(default_factory=lambda: str(uuid4()))
    version_id: str = ""
    source_node_id: str = ""
    target_node_id: str = ""
    transition_type: str = "sequence"
    label: str | None = None
    condition: str | None = None
    properties: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        self.transition_id = require_uuid(self.transition_id, "transition_id")
        self.version_id = require_uuid(self.version_id, "version_id")
        self.source_node_id = require_uuid(self.source_node_id, "source_node_id")
        self.target_node_id = require_uuid(self.target_node_id, "target_node_id")
        if self.source_node_id == self.target_node_id:
            raise ProcessModelingError("una transición no puede apuntar a sí misma", "self_transition")
        if self.transition_type not in TRANSITION_TYPES:
            raise ProcessModelingError("tipo de transición no permitido", "invalid_transition_type")

    def to_dict(self):
        return self.__dict__.copy()
