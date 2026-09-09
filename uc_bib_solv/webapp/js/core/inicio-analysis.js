/** Pure projections used by the Inicio analysis dashboard. */
export function analysisOperationOptions(machines, processId = "") {
  const operations = new Map();
  (machines || []).forEach((machine) => (machine.operations || [])
    .filter((operation) => !processId || String(operation.operational_process_id ?? machine.processId) === String(processId))
    .forEach((operation) => {
      const value = `${operation.operation_id}|${operation.process_id}`;
      if (!operations.has(value)) operations.set(value, { value, label: `${operation.name || operation.node_name || "Operación"} · ${operation.process_name || "Proceso"}` });
    }));
  return [...operations.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function analysisContractOptions(contracts, machines, processId = "", operationKey = "") {
  if (!processId && !operationKey) return contracts || [];
  const [operationId, operationProcessId] = operationKey.split("|");
  const eligible = new Set();
  (machines || []).forEach((machine) => {
    const operations = (machine.operations || []).filter((operation) => {
      const inProcess = !processId || String(operation.operational_process_id ?? machine.processId) === String(processId);
      const inOperation = !operationKey || (String(operation.operation_id) === String(operationId) && (!operationProcessId || String(operation.process_id) === String(operationProcessId)));
      return inProcess && inOperation;
    });
    operations.forEach((operation) => { if (operation.contract_id != null) eligible.add(String(operation.contract_id)); });
    if (!operationKey && operations.length) (machine.contractIds || []).forEach((id) => eligible.add(String(id)));
  });
  return (contracts || []).filter((contract) => eligible.has(String(contract.id)));
}

export function countCauseNodes(nodes) {
  return (nodes || []).reduce((count, node) => count + (node?.node_type === "CAUSE" ? 1 : 0) + countCauseNodes(node?.children), 0);
}

export function filterAnalyses(items, filters, machines) {
  const { status = "", processId = "", operationKey = "", contractId = "", machineId = "", query = "" } = filters || {};
  const [operationId, operationProcessId] = operationKey.split("|");
  return (items || []).filter((item) => {
    const machine = (machines || []).find((candidate) => String(candidate.id) === String(item.maquina_id));
    const operationMatch = !operationKey || Boolean(item.operation_id
      ? String(item.operation_id) === String(operationId)
      : machine?.operations?.some((operation) => String(operation.operation_id) === String(operationId) && (!operationProcessId || String(operation.process_id) === String(operationProcessId))));
    const haystack = `${item.id} ${item.proceso_nombre || ""} ${item.contrato_nombre || ""} ${item.indicio_apertura || ""}`.toLowerCase();
    return (!status || item.estado === status) && (!processId || String(item.proceso_id) === String(processId))
      && (!contractId || String(item.contrato_id) === String(contractId)) && (!machineId || String(item.maquina_id) === String(machineId))
      && operationMatch && (!query || haystack.includes(query.trim().toLowerCase()));
  });
}
