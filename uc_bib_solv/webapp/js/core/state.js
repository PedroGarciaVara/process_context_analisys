export const AppState = {
  bootstrap: null,
  catalog: null,
  pageData: {},
  user: null,
  route: "inicio",
  filters: {},
  currentProcess: null,
  currentContract: null,
  currentOperation: null,
  currentMachine: null,
  currentCause: null,
  tree: {
    zoom: 1,
    selectedNodeId: null,
    hiddenNodeIds: [],
    hypothesisStates: {},
  },
};

export function setRoute(route) {
  AppState.route = route;
}

export function setCurrentProcess(processId) {
  AppState.currentProcess = processId;
  AppState.currentContract = null;
  AppState.currentOperation = null;
  AppState.currentMachine = null;
}

export function setCurrentContract(contractId) {
  AppState.currentContract = contractId;
  AppState.currentOperation = null;
  AppState.currentMachine = null;
}

export function setCurrentOperation(operationKey, processId = null) {
  AppState.currentOperation = operationKey || null;
  if (operationKey) {
    AppState.currentProcess = processId || null;
  }
  AppState.currentContract = null;
  AppState.currentMachine = null;
}

export function setCurrentMachine(machineId) {
  AppState.currentMachine = machineId;
}

export function resetSelection() {
  AppState.currentProcess = null;
  AppState.currentContract = null;
  AppState.currentOperation = null;
  AppState.currentMachine = null;
}

export function setTreeSelection(nodeId) {
  AppState.tree.selectedNodeId = nodeId === null || nodeId === undefined || nodeId === "" ? null : Number(nodeId);
}

export function setTreeZoom(zoom) {
  AppState.tree.zoom = Number.isFinite(Number(zoom)) ? Number(zoom) : 1;
}

export function hideTreeNode(nodeId) {
  const target = Number(nodeId);
  if (!Number.isFinite(target)) {
    return;
  }
  const current = Array.isArray(AppState.tree.hiddenNodeIds) ? AppState.tree.hiddenNodeIds : [];
  if (!current.includes(target)) {
    AppState.tree.hiddenNodeIds = current.concat(target);
  }
}

export function setTreeHypothesisStatus(hypothesisId, status) {
  const target = Number(hypothesisId);
  if (!Number.isFinite(target)) {
    return;
  }
  const current = AppState.tree.hypothesisStates || {};
  AppState.tree.hypothesisStates = {
    ...current,
    [String(target)]: String(status),
  };
}

export function setPageData(route, payload) {
  AppState.pageData[route] = payload;
}
