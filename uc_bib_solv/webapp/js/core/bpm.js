export function readHashParams(hash = window.location.hash) {
  const queryIndex = hash.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : "");
}

export function normalizeVersionPayload(response, fallbackVersionId = "") {
  const data = response?.data || response || {};
  const version = {
    ...(data.version || {}),
    ...data,
    version_id: data.version?.version_id || data.version_id || fallbackVersionId,
  };
  return { data, version };
}
