import { fetchCausas, requestJson } from "./client.js";

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
  return requestJson(`/api/causas/detail${buildQuery(params)}`);
}

export function fetchCausaById(causaId) {
  return requestJson(`/api/causas/${causaId}`);
}

export function fetchCausaHypotheses(causaId) {
  return requestJson(`/api/causas/${causaId}/hipotesis`);
}

export function createCausa(payload) {
  return requestJson("/api/causas", jsonOptions("POST", payload));
}

export function createContractNode(payload) {
  return requestJson("/api/causas", jsonOptions("POST", {
    ...payload,
    editor_mode: "new_contract",
  }));
}

export function updateCausa(causaId, payload) {
  return requestJson(`/api/causas/${causaId}`, jsonOptions("PATCH", payload));
}

export function deleteCausa(causaId) {
  return requestJson(`/api/causas/${causaId}`, { method: "DELETE" });
}

export function createHypothesis(causaId, payload) {
  return requestJson(`/api/causas/${causaId}/hipotesis`, jsonOptions("POST", payload));
}

export function updateHypothesis(hypothesisId, payload) {
  return requestJson(`/api/hipotesis/${hypothesisId}`, jsonOptions("PATCH", payload));
}

export function fetchHypothesisDeletePreview(hypothesisId) {
  return requestJson(`/api/hipotesis/${hypothesisId}/delete-preview`);
}

export function deleteHypothesis(hypothesisId) {
  return requestJson(`/api/hipotesis/${hypothesisId}`, { method: "DELETE" });
}

export function searchReusableNodes(params = {}) {
  return requestJson(`/api/causas/reusable/search${buildQuery(params)}`);
}

export function linkReusableNode(payload) {
  return requestJson("/api/causas/reusable/link", jsonOptions("POST", payload));
}
