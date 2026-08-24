import { AppState } from "../core/state.js";

export function findNodeById(nodes, nodeId) {
  const target = String(nodeId);
  const stack = [...(nodes || [])];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    if (String(node.id) === target) {
      return node;
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      stack.unshift(...node.children);
    }
  }
  return null;
}

export function findParentId(nodes, nodeId) {
  const target = String(nodeId);
  const stack = [...(nodes || [])];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node || !Array.isArray(node.children)) {
      continue;
    }
    for (const child of node.children) {
      if (String(child.id) === target) {
        return node.id;
      }
    }
    stack.unshift(...node.children);
  }
  return null;
}

export function removeNodeById(nodes, nodeId) {
  const target = String(nodeId);
  return (nodes || [])
    .filter((node) => String(node.id) !== target)
    .map((node) => ({
      ...node,
      children: Array.isArray(node.children) && node.children.length > 0
        ? removeNodeById(node.children, target)
        : [],
    }));
}

export function normalizeHiddenNodeIds(hiddenIds) {
  if (hiddenIds instanceof Set) {
    return new Set(Array.from(hiddenIds, (value) => String(value)));
  }
  return new Set((hiddenIds || []).map((value) => String(value)));
}

export function pruneTree(nodes, hiddenIds) {
  const hidden = normalizeHiddenNodeIds(hiddenIds);
  return (nodes || [])
    .filter((node) => !hidden.has(String(node.id)))
    .map((node) => ({
      ...node,
      children: Array.isArray(node.children) && node.children.length > 0
        ? pruneTree(node.children, hidden)
        : [],
    }));
}

export function clonePayload(payload) {
  return JSON.parse(JSON.stringify(payload || {}));
}

function looksLikeTechnicalIdentifier(value) {
  const text = String(value || "").trim();
  return !text || /^BPM:/i.test(text) || /^[A-Z0-9_:-]+$/.test(text);
}

export function readableTreeContractLabel(contract = {}) {
  const processName = String(contract.processName || contract.process_name || "").trim();
  const objective = String(contract.objetivo || contract.objective || "").trim();
  const name = String(contract.name || contract.nombre || "").trim();
  if (processName && objective) return `${processName} · ${objective}`;
  if (processName) return processName;
  if (objective) return objective;
  if (name && !looksLikeTechnicalIdentifier(name)) return name;
  return "Contrato seleccionado";
}

export function resolveTreeDisplayContext(payload = {}, catalog = {}) {
  const contracts = catalog?.data?.contratos || [];
  const processes = catalog?.data?.procesos || [];
  const payloadContract = payload.contract || {};
  const contract = contracts.find((item) => String(item.id) === String(payloadContract.id)) || payloadContract;
  const processId = contract.processId ?? contract.proceso_id ?? payloadContract.proceso_id;
  const process = processes.find((item) => String(item.id) === String(processId));
  return {
    processName: String(process?.name || contract.processName || contract.process_name || "").trim(),
    objective: String(contract.objetivo || contract.objective || payloadContract.objetivo || "").trim(),
    contractLabel: readableTreeContractLabel(contract),
  };
}

export function buildHypothesisOverrides(hypothesesByCause, overrides) {
  const output = {};
  Object.entries(hypothesesByCause || {}).forEach(([causeId, items]) => {
    output[causeId] = (items || []).map((item) => {
      const nextState = overrides[String(item.id)];
      return nextState ? { ...item, estado: nextState } : { ...item };
    });
  });
  return output;
}

export function resolveActiveTreeContractId(initialState, runtimeState) {
  return runtimeState?.currentContract || AppState.currentContract || initialState?.currentContract || "";
}

export function chooseFallbackNode(tree, hiddenIds, preferredId) {
  const hidden = normalizeHiddenNodeIds(hiddenIds);
  const preferred = preferredId !== null && preferredId !== undefined ? findNodeById(tree, preferredId) : null;
  if (preferred && !hidden.has(String(preferred.id))) {
    return preferred;
  }
  const roots = (tree || []).filter((node) => !hidden.has(String(node.id)));
  return roots[0] || null;
}

export function readStatus(value) {
  const normalized = String(value || "pending").trim().toLowerCase();
  if (["validada", "confirmada", "aceptada", "retenida", "retained"].includes(normalized)) return "retained";
  if (["rechazada", "discarded", "descartada"].includes(normalized)) return "discarded";
  return "pending";
}
