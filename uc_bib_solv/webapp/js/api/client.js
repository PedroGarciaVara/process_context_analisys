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
    let payload = null;
    try {
      payload = await response.json();
      const error = payload?.error && typeof payload.error === "object"
        ? payload.error
        : payload;
      if (error?.message) message = error.message;
    } catch (_error) {
      // Ignore body parse failures and keep the generic message.
    }
    const error = payload?.error && typeof payload.error === "object"
      ? payload.error
      : payload;
    throw Object.assign(new Error(message), {
      status: response.status,
      code: error?.code || "request_failed",
      details: error?.details,
      correlation_id: error?.correlation_id,
      field: error?.field || null,
      data: payload?.data,
    });
  }

  return response.json();
}

export function fetchBootstrap() {
  return requestJson("/api/bootstrap");
}

export function fetchOperationalCatalog() {
  return requestJson("/api/bpm/operational/catalog").then(unwrapApiData);
}

export function fetchOperationalPage(page, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson(`/api/bpm/operational/page/${page}${suffix}`).then(unwrapApiData);
}

/**
 * Operational endpoints expose the common HTTP envelope:
 * `{ status: "ok", data: <catalog-or-page> }`.
 *
 * The views consume the catalog/page contract itself, so unwrap this boundary
 * once in the API client. Keeping it here prevents every view and state helper
 * from having to know how the HTTP adapter wraps successful responses.
 */
export function unwrapApiData(payload) {
  if (
    payload
    && payload.status === "ok"
    && Object.prototype.hasOwnProperty.call(payload, "data")
  ) {
    return payload.data;
  }
  return payload;
}
