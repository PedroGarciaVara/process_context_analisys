import { requestJson } from "./client.js";

const base = "/api/bpm";
const call = (path, options) => requestJson(`${base}${path}`, options);
export const listProcesses = () => call("/processes");
export const getProcess = (id) => call(`/processes/${encodeURIComponent(id)}`);
export const updateProcess = (id, data) => call(`/processes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
export const createProcess = (data) => call("/processes", { method: "POST", body: JSON.stringify(data) });
export const listVersions = (processId) => call(`/processes/${encodeURIComponent(processId)}/versions`);
export const createVersion = (processId, data) => call(`/processes/${encodeURIComponent(processId)}/versions`, { method: "POST", body: JSON.stringify(data) });
export const getVersion = (id, { expandNodeId } = {}) => {
  const query = expandNodeId ? `?expand_node_id=${encodeURIComponent(expandNodeId)}` : "";
  return call(`/versions/${encodeURIComponent(id)}${query}`);
};
export const createNode = (versionId, data) => call(`/versions/${encodeURIComponent(versionId)}/nodes`, { method: "POST", body: JSON.stringify(data) });
export const updateNode = (nodeId, data) => call(`/nodes/${encodeURIComponent(nodeId)}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteNode = (nodeId) => call(`/nodes/${encodeURIComponent(nodeId)}`, { method: "DELETE" });
export const getNodeMetadata = (nodeId) => call(`/nodes/${encodeURIComponent(nodeId)}/metadata`);
export const updateNodeMetadata = (nodeId, metadata) => call(`/nodes/${encodeURIComponent(nodeId)}/metadata`, { method: "PATCH", body: JSON.stringify({ metadata }) });
export const updateOperationStages = (operationId, processVersionId, etapas) => call(`/operations/${encodeURIComponent(operationId)}/stages`, { method: "PATCH", body: JSON.stringify({ operation_id: operationId, process_version_id: processVersionId, etapas }) });
export const getStructuredContext = (versionId, params = {}) => {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query}` : "";
  return call(`/versions/${encodeURIComponent(versionId)}/context${suffix}`);
};
export const createContextRecord = (nodeId, record) => call(`/nodes/${encodeURIComponent(nodeId)}/context-records`, { method: "POST", body: JSON.stringify(record) });
export const calculateKpi = (payload) => call("/kpis", { method: "POST", body: JSON.stringify(payload) });
export const createTransition = (versionId, data) => call(`/versions/${encodeURIComponent(versionId)}/transitions`, { method: "POST", body: JSON.stringify(data) });
export const validateVersion = (versionId) => call(`/versions/${encodeURIComponent(versionId)}/validate`, { method: "POST", body: "{}" });
