import { requestJson } from "./client.js";

export function fetchCausas(view = "arbol", params = {}) {
  const query = new URLSearchParams({ view });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") query.set(key, String(value));
  });
  return requestJson(`/api/rca-tree/nodes?${query.toString()}`);
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function jsonOptions(method, body) {
  return {
    method,
    body: JSON.stringify(body || {}),
  };
}

export function listCausas(view = "arbol", params = {}) {
  return fetchCausas(view, params);
}

export function fetchCausaDetail(params = {}) {
  return requestJson(`/api/rca-tree/causes/detail${buildQuery(params)}`);
}

export function fetchCausaById(causaId) {
  return requestJson(`/api/rca-tree/causes/${causaId}`);
}

export function fetchCausaHypotheses(causaId) {
  return requestJson(`/api/rca-tree/causes/${causaId}/hypotheses`);
}

export function createCausa(payload) {
  return requestJson("/api/rca-tree/causes", jsonOptions("POST", payload));
}

export function createContractNode(payload) {
  return requestJson("/api/rca-tree/causes", jsonOptions("POST", {
    ...payload,
    editor_mode: "new_contract",
  }));
}

export function updateCausa(causaId, payload) {
  return requestJson(`/api/rca-tree/causes/${causaId}`, jsonOptions("PATCH", payload));
}

export function moveCausa(causaId, payload) {
  return requestJson(`/api/rca-tree/causes/${causaId}/parent`, jsonOptions("PATCH", payload));
}

export function retryMoveCausa(causaId, payload) {
  return moveCausa(causaId, payload);
}

export function deleteCausa(causaId) {
  return requestJson(`/api/rca-tree/causes/${causaId}`, { method: "DELETE" });
}

export function createHypothesis(causaId, payload) {
  return requestJson(`/api/rca-tree/causes/${causaId}/hypotheses`, jsonOptions("POST", payload));
}

export function updateHypothesis(hypothesisId, payload) {
  return requestJson(`/api/rca-tree/hypotheses/${hypothesisId}`, jsonOptions("PATCH", payload));
}

export function fetchHypothesisDeletePreview(hypothesisId) {
  return requestJson(`/api/rca-tree/hypotheses/${hypothesisId}/delete-preview`);
}

export function deleteHypothesis(hypothesisId) {
  return requestJson(`/api/rca-tree/hypotheses/${hypothesisId}`, { method: "DELETE" });
}

export function searchReusableNodes(params = {}) {
  return requestJson(`/api/rca-tree/causes/reusable/search${buildQuery(params)}`);
}

export function linkReusableNode(payload) {
  return requestJson("/api/rca-tree/causes/reusable/link", jsonOptions("POST", payload));
}
