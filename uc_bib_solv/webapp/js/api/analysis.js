import { requestJson } from "./client.js";

export function listAnalyses(limit = 20) {
  return requestJson(`/api/rca-tree/analyses?limit=${encodeURIComponent(limit)}`);
}

export function listAnalysisTemplates(processId = "") {
  const query = processId ? `?process_id=${encodeURIComponent(processId)}` : "";
  return requestJson(`/api/rca-tree/analyses/templates${query}`);
}

export function createAnalysis(payload) {
  return requestJson("/api/rca-tree/analyses", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchAnalysis(analysisId) {
  return requestJson(`/api/rca-tree/analyses/${analysisId}`);
}

export function updateAnalysis(analysisId, payload) {
  return requestJson(`/api/rca-tree/analyses/${analysisId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function saveAnalysisResult(analysisId, payload) {
  return requestJson(`/api/rca-tree/analyses/${analysisId}/results`, { method: "POST", body: JSON.stringify(payload) });
}

export function retrySaveAnalysisResult(analysisId, payload) {
  return saveAnalysisResult(analysisId, payload);
}

export function reopenAnalysis(analysisId) {
  return updateAnalysis(analysisId, { status: "abierto" });
}
