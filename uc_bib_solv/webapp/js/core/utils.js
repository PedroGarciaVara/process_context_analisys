export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const DISPLAY_NAME_KEYS = [
  "name", "label", "title", "nombre", "etiqueta", "titulo",
  "name_es", "label_es", "title_es", "nombre_es", "etiqueta_es", "titulo_es",
  "name_es_es", "label_es_es", "title_es_es",
];

function isTechnicalIdentifier(value) {
  const text = String(value || "").trim();
  return !text
    || /^\d+$/.test(text)
    || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)
    || /^(?:bpm[:_\-]|(?:operation|process|node|version|machine|contract)[_:\-]?\d|[A-Z][A-Z0-9]*(?:[_-][A-Z0-9]+)+$)/i.test(text)
    || /(?:^|[_:\-])(id|uuid|metadata|code)(?:$|[_:\-])/i.test(text);
}

/** Return a human-facing name without exposing IDs, BPM codes, or metadata. */
export function displayName(value, fallback = "Sin nombre") {
  const candidates = typeof value === "object" && value !== null
    ? DISPLAY_NAME_KEYS.map((key) => value[key])
    : [value];
  const readable = candidates.find((candidate) => !isTechnicalIdentifier(candidate));
  return readable === undefined ? fallback : String(readable).trim();
}

export function createElement(tagName, options = {}) {
  const node = document.createElement(tagName);

  if (options.className) {
    node.className = options.className;
  }

  if (options.text !== undefined) {
    node.textContent = options.text;
  }

  if (options.html !== undefined) {
    node.innerHTML = options.html;
  }

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        node.setAttribute(key, String(value));
      }
    });
  }

  if (Array.isArray(options.children)) {
    options.children.forEach((child) => {
      if (child) node.appendChild(child);
    });
  }

  return node;
}

export function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function toHashRoute(route) {
  return `#/${route}`;
}

export function isNode(value) {
  return typeof Node !== "undefined" && value instanceof Node;
}

export function formatCount(value, suffix) {
  return `${value} ${suffix}`;
}
