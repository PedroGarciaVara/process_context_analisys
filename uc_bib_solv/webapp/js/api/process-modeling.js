import { requestJson } from "./client.js";

const base = "/api/bpm";
const call = (path, options) => requestJson(`${base}${path}`, options);
export const listProcesses = () => call("/processes");
export const getProcess = (id, options = {}) => {
  const query = new URLSearchParams();
  if (options.expandNodeId) query.set("expand_node_id", String(options.expandNodeId));
  const suffix = query.toString() ? `?${query}` : "";
  return call(`/processes/${encodeURIComponent(id)}${suffix}`);
};
export const updateProcess = (id, data) => call(`/processes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteProcess = (id, options = {}) => {
  const query = options.cascade ? "?cascade=true" : "";
  return call(`/processes/${encodeURIComponent(id)}${query}`, { method: "DELETE" });
};
export const createProcess = (data) => call("/processes", { method: "POST", body: JSON.stringify(data) });
export const createNode = (processId, data) => call(`/processes/${encodeURIComponent(processId)}/nodes`, { method: "POST", body: JSON.stringify(data) });
export const createNodeWithTransition = (processId, data) => call(`/processes/${encodeURIComponent(processId)}/nodes-with-transition`, { method: "POST", body: JSON.stringify(data) });
export const updateNode = (nodeId, data) => call(`/nodes/${encodeURIComponent(nodeId)}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteNode = (nodeId) => call(`/nodes/${encodeURIComponent(nodeId)}`, { method: "DELETE" });
export const insertOperation = (processId, transitionId, data) => call(`/processes/${encodeURIComponent(processId)}/transitions/${encodeURIComponent(transitionId)}/insert-operation`, { method: "POST", body: JSON.stringify(data) });
export const deleteOperation = (nodeId, reconnect) => call(`/nodes/${encodeURIComponent(nodeId)}/operation-delete`, { method: "POST", body: JSON.stringify({ reconnect: Boolean(reconnect) }) });
export const getNodeMetadata = (nodeId) => call(`/nodes/${encodeURIComponent(nodeId)}/metadata`);
export const updateNodeMetadata = (nodeId, metadata) => call(`/nodes/${encodeURIComponent(nodeId)}/metadata`, { method: "PATCH", body: JSON.stringify({ metadata }) });
export const updateOperationStages = (operationId, processId, etapas) => call(`/operations/${encodeURIComponent(operationId)}/stages`, { method: "PATCH", body: JSON.stringify({ operation_id: operationId, process_id: processId, etapas }) });
export const getStructuredContext = (processId, params = {}) => {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query}` : "";
  return call(`/processes/${encodeURIComponent(processId)}/context${suffix}`);
};
export const createContextRecord = (nodeId, record) => call(`/nodes/${encodeURIComponent(nodeId)}/context-records`, { method: "POST", body: JSON.stringify(record) });
export const calculateKpi = (payload) => call("/kpis", { method: "POST", body: JSON.stringify(payload) });
export const createTransition = (processId, data) => call(`/processes/${encodeURIComponent(processId)}/transitions`, { method: "POST", body: JSON.stringify(data) });
export const updateTransition = (transitionId, data) => call(`/transitions/${encodeURIComponent(transitionId)}`, { method: "PATCH", body: JSON.stringify(data) });
export const validateProcess = (processId) => call(`/processes/${encodeURIComponent(processId)}/validate`, { method: "POST", body: "{}" });
