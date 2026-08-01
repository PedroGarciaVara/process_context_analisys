export async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch (_error) {
      // Ignore body parse failures and keep the generic message.
    }
    throw new Error(message);
  }

  return response.json();
}

export function fetchBootstrap() {
  return requestJson("/api/bootstrap");
}

export function fetchOperationalCatalog() {
  return requestJson("/api/operational/catalog");
}

export function fetchOperationalPage(page, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson(`/api/operational/page/${page}${suffix}`);
}

export function fetchCausas(view = "arbol", params = {}) {
  const query = new URLSearchParams({ view });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  return requestJson(`/api/causas?${query.toString()}`);
}
