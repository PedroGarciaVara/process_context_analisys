import { requestJson } from "./client.js";

function jsonOptions(method, body) {
  return {
    method,
    body: JSON.stringify(body || {}),
  };
}

export function createProcess(payload) {
  return requestJson("/api/bpm/operational/processes", jsonOptions("POST", payload));
}

export function updateProcess(processId, payload) {
  return requestJson(`/api/bpm/operational/processes/${processId}`, jsonOptions("PATCH", payload));
}

export function deleteProcess(processId) {
  return requestJson(`/api/bpm/operational/processes/${processId}`, { method: "DELETE" });
}

export function createContract(payload) {
  return requestJson("/api/bpm/contracts", jsonOptions("POST", payload));
}

export function updateContract(contractId, payload) {
  return requestJson(`/api/bpm/contracts/${contractId}`, jsonOptions("PATCH", payload));
}

export function toggleContract(contractId) {
  return requestJson(`/api/bpm/contracts/${contractId}/toggle`, jsonOptions("POST"));
}

export function deleteContract(contractId) {
  return requestJson(`/api/bpm/contracts/${contractId}`, { method: "DELETE" });
}

export function fetchContractMachines(contractId) {
  return requestJson(`/api/bpm/contracts/${contractId}/machines`);
}

export function saveContractMachines(contractId, machineIds) {
  return requestJson(
    `/api/bpm/contracts/${contractId}/machines`,
    jsonOptions("PUT", { machine_ids: machineIds }),
  );
}

export function createMachine(payload) {
  return requestJson("/api/bpm/machines", jsonOptions("POST", payload));
}

export function updateMachine(machineId, payload) {
  return requestJson(`/api/bpm/machines/${machineId}`, jsonOptions("PATCH", payload));
}

export function deleteMachine(machineId) {
  return requestJson(`/api/bpm/machines/${machineId}`, { method: "DELETE" });
}

export function fetchMachineContext(machineId, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson(`/api/bpm/machines/${machineId}/context${suffix}`);
}

export function updateOperationStages(operationId, processVersionId, etapas) {
  return requestJson(`/api/bpm/operations/${operationId}/stages`, jsonOptions("PATCH", {
    operation_id: operationId,
    process_version_id: processVersionId,
    etapas,
  }));
}

export function createMachineOperationConfiguration(machineId, payload) {
  return requestJson(`/api/bpm/machines/${machineId}/configurations`, jsonOptions("POST", payload));
}
