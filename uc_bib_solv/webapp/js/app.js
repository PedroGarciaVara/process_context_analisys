import { AppState } from "./core/state.js";
import { createRouter } from "./core/router.js";
import { createEventBus } from "./core/events.js";
import { fetchBootstrap, fetchOperationalCatalog, fetchOperationalPage } from "./api/client.js";
import { renderView } from "./views/index.js";
import { buildOperationalPageParams } from "./core/operational.js";
import { setPageData } from "./core/state.js";

const OPERATIONAL_ROUTE_MAP = {
  inicio: "inicio",
  procesos: "procesos",
  contratos: "contratos",
  maquinas: "maquinas",
};

const root = document.getElementById("app-root");
const bus = createEventBus();
const router = createRouter(bus);
let operationalLoadToken = 0;

function applyCatalogDefaults(catalog, allowDefaults = true) {
  if (!allowDefaults) return;
  const defaults = catalog?.defaults || {};
  if (!AppState.currentProcess && defaults.processId) {
    AppState.currentProcess = defaults.processId;
  }
  if (!AppState.currentContract && defaults.contractId) {
    AppState.currentContract = defaults.contractId;
  }
  if (!AppState.currentMachine && defaults.machineId) {
    AppState.currentMachine = defaults.machineId;
  }
}

function applyPageSelections(route, payload) {
  const data = payload?.data || {};
  if (!AppState.currentProcess && data.selected_process_id) {
    AppState.currentProcess = data.selected_process_id;
  }
  if (!AppState.currentContract && data.selected_contract_id) {
    AppState.currentContract = data.selected_contract_id;
  }
  if (!AppState.currentMachine && data.selected_machine_id) {
    AppState.currentMachine = data.selected_machine_id;
  }
  if (route === "inicio" && payload?.catalog?.defaults) {
    applyCatalogDefaults(payload.catalog);
  }
}

async function loadOperationalPage(route) {
  const operationalRoute = OPERATIONAL_ROUTE_MAP[route];
  if (!operationalRoute) {
    return;
  }
  const params = buildOperationalPageParams(AppState, operationalRoute);
  const payload = await fetchOperationalPage(operationalRoute, params).catch(() => null);
  if (!payload) {
    return;
  }
  setPageData(operationalRoute, payload);
  applyPageSelections(operationalRoute, payload);
}

function mount() {
  const page = renderView(AppState.route || "inicio", AppState, bus);
  // The application shell normally owns scrolling inside its main column. The
  // process-modeling view is standalone, so let the document grow vertically
  // while it is mounted instead of clipping its content at the viewport.
  document.body.classList.toggle("pm-document-scroll", AppState.route === "modelado-procesos");
  document.body.classList.toggle("bpm-studio-document", AppState.route === "studio-procesos");
  root.innerHTML = "";
  root.appendChild(page.main);
  if (typeof page.afterMount === "function") {
    page.afterMount(root, AppState, bus);
  }
}

async function boot() {
  const bootstrapPromise = fetchBootstrap().catch(() => ({ app_name: "UC_BIB_Solve" }));
  const catalogPromise = fetchOperationalCatalog().catch(() => null);
  const [bootstrap, catalog] = await Promise.all([bootstrapPromise, catalogPromise]);
  AppState.bootstrap = bootstrap;
  AppState.catalog = catalog;
  applyCatalogDefaults(catalog);

  const refreshCurrentPage = async () => {
    const routeAtStart = AppState.route;
    const token = ++operationalLoadToken;
    // Swap the shell immediately so a slow API response cannot leave the
    // previous route visible during navigation.
    mount();
    await loadOperationalPage(AppState.route);
    if (token !== operationalLoadToken || AppState.route !== routeAtStart) {
      return;
    }
    mount();
  };

  const reloadCatalog = async () => {
    const nextCatalog = await fetchOperationalCatalog().catch(() => null);
    if (nextCatalog) {
      AppState.catalog = nextCatalog;
      // A refresh must preserve an intentional unscoped selection (for
      // example, immediately after creating a machine without a contract).
      applyCatalogDefaults(nextCatalog, false);
    }
    await refreshCurrentPage();
  };

  bus.on("state:change", refreshCurrentPage);
  bus.on("catalog:refresh", reloadCatalog);
  router.start(async (route) => {
    AppState.route = route;
    await refreshCurrentPage();
  });
}

boot();
