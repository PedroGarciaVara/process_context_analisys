import { setRoute } from "./state.js";
import { renderView } from "../views/index.js";

const ROUTES = new Set([
  "inicio",
  "procesos",
  "procesos_v02",
  "procesos_detalle_v02",
  "operaciones_v02",
  "operaciones_detalle_v02",
  "contratos",
  "contratos_v02",
  "maquinas",
  "maquinas_v02",
  "causa_detalle",
  "causa_detalle_v02",
  "arbol",
  "arboles_v02",
  "analisis_causas_v2",
  "analisis_causas_v02",
  "modelado-procesos",
  "contexto",
]);

export const LEGACY_ROUTE_ALIASES = Object.freeze({
  procesos: "procesos_v02",
  contratos: "contratos_v02",
  maquinas: "maquinas_v02",
  arbol: "arboles_v02",
  analisis_causas_v2: "analisis_causas_v02",
  causa_detalle: "causa_detalle_v02",
});

export function createRouter(bus) {
  function resolveRoute() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const route = hash.split(/[?#]/)[0];
    if (!route) return "inicio";
    return ROUTES.has(route) ? (LEGACY_ROUTE_ALIASES[route] || route) : "inicio";
  }

  function render(state) {
    return renderView(resolveRoute(), state, bus);
  }

  function navigate(route) {
    const next = ROUTES.has(route) ? (LEGACY_ROUTE_ALIASES[route] || route) : "inicio";
    const hash = `#/${next}`;
    if (window.location.hash !== hash) {
      window.location.hash = hash;
      return;
    }
    setRoute(next);
    bus.emit("route:changed", next);
  }

  function start(onChange) {
    const update = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, "");
      const rawRoute = rawHash.split(/[?#]/)[0];
      const route = resolveRoute();
      setRoute(route);
      if (LEGACY_ROUTE_ALIASES[rawRoute]) {
        const queryIndex = rawHash.indexOf("?");
        const query = queryIndex >= 0 ? rawHash.slice(queryIndex) : "";
        const canonicalHash = `#/${route}${query}`;
        if (window.location.hash !== canonicalHash) {
          window.history.replaceState({}, "", canonicalHash);
        }
      }
      if (typeof onChange === "function") {
        onChange(route);
      }
    };

    window.addEventListener("hashchange", update);
    bus.on("navigate", navigate);

    if (!window.location.hash) {
      window.location.hash = "#/inicio";
      update();
      return;
    }

    update();
  }

  return { render, start, resolveRoute, navigate };
}
