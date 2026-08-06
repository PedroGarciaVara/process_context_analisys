from __future__ import annotations

from typing import Any

from .adapters import BackendGateway, ExistingBackendGateway
from .contracts import ToolContext
from .registry import ToolDefinition, ToolRegistry
from .validation import optional_int, required


def _definitions(gateway: BackendGateway) -> list[ToolDefinition]:
    def process_catalog(args, trace):
        return {"processes": gateway.process_catalog(), "provenance": trace.provenance()}

    def process(args, trace):
        required(args, "process_id")
        return gateway.process(args["process_id"])

    def bpm_version(args, trace):
        required(args, "version_id")
        return gateway.version(args["version_id"], args.get("expand_node_id"))

    def structured_context(args, trace):
        required(args, "version_id")
        return gateway.context(args["version_id"], args.get("node_id"), args.get("family"), args.get("record_type"))

    def causal_tree(args, trace):
        required(args, "view")
        if args["view"] not in {"arbol", "analisis_causas_v2"}:
            raise ValueError("view debe ser arbol o analisis_causas_v2")
        return gateway.tree(args["view"], optional_int(args, "contract_id"))

    def machine(args, trace):
        required(args, "machine_id")
        return gateway.machine_context(int(args["machine_id"]))

    def contracts(args, trace):
        return {"contracts": gateway.contracts(args.get("process_id")), "provenance": trace.provenance()}

    def kpi(args, trace):
        required(args, "values", "version")
        payload = dict(args)
        payload["source"] = {**(payload.get("source") or {}), **trace.provenance()}
        return gateway.calculate_kpi(payload)

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


def build_default_registry(gateway: BackendGateway | None = None) -> ToolRegistry:
    return ToolRegistry(_definitions(gateway or ExistingBackendGateway()))
