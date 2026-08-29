export function readHashParams(hash = window.location.hash) {
  const queryIndex = hash.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : "");
}

export function normalizeProcessPayload(response) {
  return response?.data || response || {};
}
