import { requestJson } from "./client.js";

function jsonOptions(method, body) {
  return {
    method,
    body: JSON.stringify(body || {}),
  };
}

export function createProcess(payload) {
  return requestJson("/api/operational/processes", jsonOptions("POST", payload));
}

export function updateProcess(processId, payload) {
  return requestJson(`/api/operational/processes/${processId}`, jsonOptions("PATCH", payload));
}

export function deleteProcess(processId) {
  return requestJson(`/api/operational/processes/${processId}`, { method: "DELETE" });
}

export function createContract(payload) {
  return requestJson("/api/operational/contracts", jsonOptions("POST", payload));
}

export function updateContract(contractId, payload) {
  return requestJson(`/api/operational/contracts/${contractId}`, jsonOptions("PATCH", payload));
}

export function toggleContract(contractId) {
  return requestJson(`/api/operational/contracts/${contractId}/toggle`, jsonOptions("POST"));
}

export function deleteContract(contractId) {
  return requestJson(`/api/operational/contracts/${contractId}`, { method: "DELETE" });
}

export function fetchContractMachines(contractId) {
  return requestJson(`/api/operational/contracts/${contractId}/machines`);
}

export function saveContractMachines(contractId, machineIds) {
  return requestJson(
    `/api/operational/contracts/${contractId}/machines`,
    jsonOptions("PUT", { machine_ids: machineIds }),
  );
}

export function createMachine(payload) {
  return requestJson("/api/operational/machines", jsonOptions("POST", payload));
}

export function updateMachine(machineId, payload) {
  return requestJson(`/api/operational/machines/${machineId}`, jsonOptions("PATCH", payload));
}

export function deleteMachine(machineId) {
  return requestJson(`/api/operational/machines/${machineId}`, { method: "DELETE" });
}
