from dataclasses import dataclass
from typing import Any, Callable, Mapping

from ..domain.contracts import ToolContext, ToolRequest, ToolResult
from ..domain.errors import AgentToolError, ToolNotFoundError
from ..domain.validation import object_args, optional_int, required
from .ports.outbound import BackendGateway as BackendToolPort

ToolHandler = Callable[[Mapping[str, Any], ToolContext], Any]


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: ToolHandler
    read_only: bool = True

    def manifest(self) -> dict[str, Any]:
        return {"name": self.name, "description": self.description, "input_schema": self.input_schema, "read_only": self.read_only}


class ToolRegistry:
    def __init__(self, definitions: list[ToolDefinition] | None = None):
        self._definitions: dict[str, ToolDefinition] = {}
        for definition in definitions or []:
            self.register(definition)

    def register(self, definition: ToolDefinition) -> None:
        if not definition.name or definition.name in self._definitions:
            raise AgentToolError(f"Nombre de tool inválido o duplicado: {definition.name}", "duplicate_tool")
        self._definitions[definition.name] = definition

    def get(self, name: str) -> ToolDefinition:
        try:
            return self._definitions[name]
        except KeyError as exc:
            raise ToolNotFoundError(name) from exc

    def manifest(self) -> list[dict[str, Any]]:
        return [self._definitions[name].manifest() for name in sorted(self._definitions)]

    def invoke(self, name: str, request: ToolRequest | None = None, **arguments: Any) -> ToolResult:
        definition = self.get(name)
        request = request or ToolRequest(arguments=arguments)
        args = object_args(request.arguments)
        context = ToolContext(request.trace_id, name, actor=request.actor)
        try:
            return ToolResult(definition.handler(args, context), context)
        except AgentToolError:
            raise
        except (ValueError, TypeError) as exc:
            raise AgentToolError(str(exc), "invalid_tool_request") from exc


def create_definitions(port: BackendToolPort) -> list[ToolDefinition]:
    def process_catalog(args, trace):
        return {"processes": port.process_catalog(), "provenance": trace.provenance()}
    def process(args, trace):
        required(args, "process_id")
        return port.process(args["process_id"])
    def bpm_version(args, trace):
        required(args, "version_id")
        return port.version(args["version_id"], args.get("expand_node_id"))
    def structured_context(args, trace):
        required(args, "version_id")
        return port.context(args["version_id"], args.get("node_id"), args.get("family"), args.get("record_type"))
    def causal_tree(args, trace):
        required(args, "view")
        if args["view"] not in {"arbol", "analisis_causas_v2"}:
            raise ValueError("view debe ser arbol o analisis_causas_v2")
        return port.tree(args["view"], optional_int(args, "contract_id"))
    def machine(args, trace):
        required(args, "machine_id")
        return port.machine_context(int(args["machine_id"]))
    def contracts(args, trace):
        return {"contracts": port.contracts(args.get("process_id")), "provenance": trace.provenance()}
    def kpi(args, trace):
        required(args, "values", "version")
        payload = dict(args)
        payload["source"] = {**(payload.get("source") or {}), **trace.provenance()}
        return port.calculate_kpi(payload)

    common = {"type": "object", "additionalProperties": False}
    return [
        ToolDefinition("process.catalog", "Descubre procesos BPM disponibles.", {**common, "properties": {}}, process_catalog),
        ToolDefinition("process.get", "Obtiene un proceso y sus versiones.", {**common, "required": ["process_id"], "properties": {"process_id": {}}}, process),
        ToolDefinition("bpm.version", "Reconstruye una versión BPM con nodos, transiciones y relaciones.", {**common, "required": ["version_id"], "properties": {"version_id": {}, "expand_node_id": {}}}, bpm_version),
        ToolDefinition("context.get", "Recupera contexto estructurado, detalles, metodología, hechos y evidencias.", {**common, "required": ["version_id"], "properties": {"version_id": {}, "node_id": {}, "family": {}, "record_type": {}}}, structured_context),
        ToolDefinition("causal.tree", "Consulta el árbol causal existente sin alterar su semántica.", {**common, "required": ["view"], "properties": {"view": {"enum": ["arbol", "analisis_causas_v2"]}, "contract_id": {"type": ["integer", "string"]}}}, causal_tree),
        ToolDefinition("machine.context", "Consulta máquina, operaciones BPM, contratos y asignaciones.", {**common, "required": ["machine_id"], "properties": {"machine_id": {}}}, machine),
        ToolDefinition("contract.list", "Lista contratos del catálogo operativo y sus relaciones de proceso.", {**common, "properties": {"process_id": {}}}, contracts),
        ToolDefinition("kpi.calculate", "Calcula un KPI bajo demanda; no persiste el resultado.", {**common, "required": ["values", "version"], "properties": {"values": {"type": "array"}, "version": {"type": "string"}, "source": {"type": "object"}}}, kpi),
    ]
