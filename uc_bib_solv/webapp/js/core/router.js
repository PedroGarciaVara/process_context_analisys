import { setRoute } from "./state.js";
import { renderView } from "../views/index.js";

const ROUTES = new Set([
  "inicio",
  "procesos",
  "contratos",
  "contratos_detalle",
  "maquinas",
  "maquinas_detalle",
  "causa_detalle",
  "procesos_detalle",
  "operaciones",
  "operaciones_detalle",
  "arboles",
  "analisis_causas",
  "studio-procesos",
  "contexto",
]);

export function createRouter(bus) {
  function resolveRoute() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const route = hash.split(/[?#]/)[0];
    if (!route) return "inicio";
    return ROUTES.has(route) ? route : "inicio";
  }

  function render(state) {
    return renderView(resolveRoute(), state, bus);
  }

  function navigate(route) {
    const next = ROUTES.has(route) ? route : "inicio";
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
      const route = resolveRoute();
      setRoute(route);
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
