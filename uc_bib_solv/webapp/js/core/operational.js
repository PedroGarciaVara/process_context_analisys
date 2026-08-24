const EMPTY_CATALOG = {
  pages: {},
  summary: {
    procesos: 0,
    contratos: 0,
    maquinas: 0,
  },
  defaults: {
    processId: null,
    contractId: null,
    machineId: null,
  },
  data: {
    procesos: [],
    contratos: [],
    maquinas: [],
  },
};

export function getCatalog(state) {
  return state?.catalog || EMPTY_CATALOG;
}

export function getOperationalPageData(state, route) {
  return state?.pageData?.[route] || null;
}

export function getOperationalData(state) {
  return getCatalog(state).data || EMPTY_CATALOG.data;
}

export function getPageMeta(state, route) {
  return getOperationalPageData(state, route)?.page_meta || getCatalog(state).pages?.[route] || {};
}

export function getProcesses(state) {
  return getOperationalData(state).procesos || [];
}

export function getContracts(state) {
  return getOperationalData(state).contratos || [];
}

export function getMachines(state) {
  return getOperationalData(state).maquinas || [];
}

export function getContractScopes(state) {
  const globalScopes = getOperationalData(state).contractScopes;
  const pageCatalog = getOperationalPageData(state, "contratos")?.catalog;
  const pageScopes = pageCatalog?.data?.contractScopes;
  const scopes = globalScopes && (globalScopes.processes?.length || globalScopes.operations?.length)
    ? globalScopes
    : pageScopes;
  return {
    processes: Array.isArray(scopes?.processes) ? scopes.processes : [],
    operations: Array.isArray(scopes?.operations) ? scopes.operations : [],
  };
}

export function getOperations(state) {
  const byKey = new Map();
  getMachines(state).forEach((machine) => {
    (machine.operations || []).forEach((operation) => {
      const key = `${operation.operation_id}|${operation.process_version_id}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: key,
          operationId: operation.operation_id,
          processVersionId: operation.process_version_id,
          // The machine page selects the legacy numeric process. Keep the BPM
          // UUID separately so it can be sent as the canonical operation scope.
          processId: operation.legacy_process_id ?? operation.processId ?? null,
          bpmProcessId: operation.process_id,
          name: displayName(operation, "Operación sin nombre"),
          nodeCode: operation.node_code,
          processName: operation.process_name || operation.processName || "",
          versionNumber: operation.version_number,
          etapas: operation.etapas || [],
          schemaVersion: operation.etapas_schema_version || 1,
        });
      }
    });
  });
  return [...byKey.values()];
}

export function getSummary(state) {
  return getCatalog(state).summary || EMPTY_CATALOG.summary;
}

export function findProcess(state, processId) {
  return getProcesses(state).find((item) => String(item.id) === String(processId)) || null;
}

export function findContract(state, contractId) {
  return getContracts(state).find((item) => String(item.id) === String(contractId)) || null;
}

export function findMachine(state, machineId) {
  return getMachines(state).find((item) => String(item.id) === String(machineId)) || null;
}

export function getProcessOptions(state, includeAll = false) {
  const items = getProcesses(state);
  const options = items.map((item) => ({
    label: displayName(item, "Proceso sin nombre"),
    value: item.id,
  }));
  return includeAll ? [{ label: "All processes", value: "" }, ...options] : options;
}

export function getContractOptions(state, includeAll = false) {
  const items = getContracts(state);
  const options = items.map((item) => ({
    label: displayName(item, "Contrato sin nombre"),
    value: item.id,
  }));
  return includeAll ? [{ label: "All contracts", value: "" }, ...options] : options;
}

export function getMachineOptions(state, includeAll = false) {
  const items = getMachines(state);
  const options = items.map((item) => ({
    label: displayName(item, "Máquina sin nombre"),
    value: item.id,
  }));
  return includeAll ? [{ label: "All machines", value: "" }, ...options] : options;
}

export function filterContracts(state, processId = null, status = "all") {
  return getContracts(state).filter((item) => {
    if (processId && String(item.processId) !== String(processId)) return false;
    if (status && status !== "all" && item.status !== status) return false;
    return true;
  });
}

export function filterMachines(state, processId = null, operationKey = null) {
  return getMachines(state).filter((item) => {
    if (processId && String(item.processId) !== String(processId)) return false;
    if (operationKey) {
      const [operationId, processVersionId] = String(operationKey).split("|");
      if (!(item.operations || []).some((operation) => (
        String(operation.operation_id) === operationId
        && String(operation.process_version_id) === processVersionId
      ))) return false;
    }
    return true;
  });
}

export function resolveSelectionLabel(state, kind, id) {
  if (!id) return "none";
  if (kind === "process") {
    const item = findProcess(state, id);
    return item ? displayName(item, "Proceso sin nombre") : "Proceso no disponible";
  }
  if (kind === "contract") {
    const item = findContract(state, id);
    return item ? displayName(item, "Contrato sin nombre") : "Contrato no disponible";
  }
  if (kind === "machine") {
    const item = findMachine(state, id);
    return item ? displayName(item, "Máquina sin nombre") : "Máquina no disponible";
  }
  return id;
}

export function getProcessScopeSummary(state, processId) {
  const process = findProcess(state, processId);
  if (!process) {
    return null;
  }
  return {
    id: process.id,
    name: process.name,
    owner: process.owner,
    contracts: process.contractCount || 0,
    machines: process.machineCount || 0,
    status: process.status,
  };
}

export function getContractScopeSummary(state, contractId) {
  const contract = findContract(state, contractId);
  if (!contract) {
    return null;
  }
  return {
    id: contract.id,
    name: contract.name,
    processId: contract.processId,
    processName: contract.processName,
    machines: contract.machineCount || 0,
    status: contract.status,
    updated: contract.updated,
  };
}

export function getMachineScopeSummary(state, machineId) {
  const machine = findMachine(state, machineId);
  if (!machine) {
    return null;
  }
  return {
    id: machine.id,
    name: machine.name,
    contractId: machine.contractId,
    contractName: machine.contractName,
    processId: machine.processId,
    processName: machine.processName,
    area: machine.area,
  };
}

export function buildOperationalPageParams(state, route) {
  const params = {};
  if (route === "inicio") {
    if (state.currentProcess) params.process_id = state.currentProcess;
    if (state.currentContract) params.contract_id = state.currentContract;
    if (state.currentMachine) params.machine_id = state.currentMachine;
    return params;
  }

  if (route === "procesos") {
    return params;
  }

  if (route === "contratos") {
    if (state.currentProcess) params.process_id = state.currentProcess;
    if (state.currentContract) params.contract_id = state.currentContract;
    params.status = state.filters?.contractStatus || "all";
    return params;
  }

  if (route === "maquinas") {
    if (state.currentProcess) params.processId = state.currentProcess;
    if (state.currentOperation) {
      const [operationId, processVersionId] = String(state.currentOperation).split("|");
      params.operation_id = operationId;
      params.process_version_id = processVersionId;
      const operation = getOperations(state).find((item) => item.id === state.currentOperation);
      if (operation?.bpmProcessId) params.process_id = operation.bpmProcessId;
    }
    return params;
  }

  return params;
}
import { displayName } from "./utils.js";
