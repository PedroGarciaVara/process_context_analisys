export function readHashParams(hash = window.location.hash) {
  const queryIndex = hash.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : "");
}

export function normalizeProcessPayload(response, fallbackProcessId = "") {
  const data = response?.data || response || {};
  const version = {
    ...(data.version || {}),
    ...data,
    process_id: data.process_id || fallbackProcessId,
  };
  return { data, version };
}
