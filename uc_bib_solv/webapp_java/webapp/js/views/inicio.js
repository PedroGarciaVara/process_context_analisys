import { getCatalog, getContracts, getMachines, getProcesses, getSummary } from "../core/operational.js";
import { listAnalyses } from "../api/analysis.js";
import { setCurrentContract, setCurrentMachine, setCurrentProcess } from "../core/state.js";
import { createElement, escapeHtml, toHashRoute } from "../core/utils.js";

const FALLBACK_PROCESS_OPTIONS = [
  "Chemical Refining A-12",
  "Heat Treatment X-4",
  "Quality Assurance Loop",
];

const FALLBACK_CONTRACT_OPTIONS = [
  "MAINT-2024-GLOBAL",
  "OPS-SOUTH-WEST",
  "LOGI-TRANS-BLUE",
];

const FALLBACK_MACHINE_OPTIONS = [
  "Centrifuge C-404",
  "Boiler Unit B-2",
  "Turbine T-900",
];

const MAIN_MENU = [
  { route: "inicio", label: "Inicio", icon: "home" },
  { route: "maquinas_v02", label: "Maquina", icon: "settings" },
  { route: "procesos_v02", label: "Proceso", icon: "history" },
  { route: "contratos_v02", label: "Contrato", icon: "group" },
  { route: "arboles_v02", label: "Arbol", icon: "account_tree" },
  { route: "analisis_causas_v02", label: "Analisis causas", icon: "monitoring" },
  { route: "modelado-procesos", label: "Modelado procesos", icon: "account_tree" },
];

const RECENT_INVESTIGATIONS = [
  {
    id: "INV-402",
    accent: "bg-primary",
    status: "Activa",
    statusClass: "bg-secondary-container text-on-secondary-container",
    title: "Caida de presion hidraulica - Linea C",
    body: "Actualizada hace 4 horas por Sarah J.",
    button: "Reanudar",
    icon: "play_arrow",
    route: "arboles_v02",
  },
  {
    id: "INV-398",
    accent: "bg-primary opacity-50",
    status: "Completada",
    statusClass: "bg-surface-container-highest text-on-surface-variant",
    title: "Pico de vibracion en turbina T-900",
    body: "Archivada el 12 oct 2023",
    button: "Ver informe",
    icon: "visibility",
    route: "causa_detalle",
  },
  {
    id: "INV-415",
    accent: "bg-error",
    status: "Critica",
    statusClass: "bg-error-container text-on-error-container",
    title: "Fallo de valvula de seguridad Unidad 4",
    body: "Nueva evidencia pendiente de revision",
    button: "Reanudar",
    icon: "play_arrow",
    route: "analisis_causas_v02",
  },
];

function buildOptions(items, fallback, selectedValue) {
  const source = Array.isArray(items) && items.length ? items : fallback;

  return source
    .map((item) => {
      const label = typeof item === "string" ? item : item?.name || item?.label || item?.id || String(item);
      const value = typeof item === "string" ? item : item?.id || item?.value || label;
      const selected = selectedValue !== null && selectedValue !== undefined && String(selectedValue) === String(value) ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function buildRecentCard(card) {
  return `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col group transition-all hover:translate-y-[-4px] hover:shadow-lg">
      <div class="h-2 ${card.accent}"></div>
      <div class="p-md space-y-sm flex-1 flex flex-col">
        <div class="flex justify-between items-start">
          <span class="font-mono-sm text-mono-sm bg-surface-container px-sm py-[2px] rounded text-secondary">${escapeHtml(card.id)}</span>
          <span class="px-sm py-[2px] rounded-full ${card.statusClass} font-label-md text-label-md">${escapeHtml(card.status)}</span>
        </div>
        <h3 class="font-title-lg text-title-lg text-on-background line-clamp-2">${escapeHtml(card.title)}</h3>
        <p class="font-body-sm text-body-sm text-secondary flex-1">${escapeHtml(card.body)}</p>
        <button
          type="button"
          class="w-full mt-md ${card.button === "Ver informe" ? "border border-outline text-secondary" : "bg-primary text-on-primary"} font-label-md text-label-md py-sm rounded hover:opacity-90 transition-all flex items-center justify-center gap-sm"
          data-route="${escapeHtml(card.route)}"
          data-action="recent-card"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">${escapeHtml(card.icon)}</span>
          ${escapeHtml(card.button)}
        </button>
      </div>
    </div>
  `;
}

function buildAnalysisCard(analysis) {
  const open = analysis.estado === "abierto";
  const route = `#/analisis_causas_v02?contract_id=${encodeURIComponent(String(analysis.contrato_id))}&analysis_id=${encodeURIComponent(String(analysis.id))}`;
  const date = String(analysis.fecha_apertura || analysis.fecha_inicializacion || "").slice(0, 10);
  return `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col group transition-all hover:translate-y-[-4px] hover:shadow-lg" data-analysis-card data-analysis-status="${escapeHtml(analysis.estado)}" data-analysis-search="${escapeHtml(`${analysis.id} ${analysis.proceso_nombre || ""} ${analysis.contrato_nombre || ""} ${analysis.indicio_apertura || ""}`)}">
      <div class="h-2 ${open ? "bg-primary" : "bg-outline"}"></div>
      <div class="p-md space-y-sm flex-1 flex flex-col">
        <div class="flex justify-between items-start gap-sm"><span class="font-mono-sm text-mono-sm bg-surface-container px-sm py-[2px] rounded text-secondary">AN-${escapeHtml(analysis.id)}</span><span class="px-sm py-[2px] rounded-full ${open ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-highest text-on-surface-variant"} font-label-md text-label-md">${open ? "Abierto" : "Cerrado"}</span></div>
        <h3 class="font-title-lg text-title-lg text-on-background line-clamp-2">${escapeHtml(analysis.indicio_apertura || analysis.descripcion_apertura || "Analisis sin indicio")}</h3>
        <p class="font-body-sm text-body-sm text-secondary flex-1">${escapeHtml(analysis.proceso_nombre || "Proceso no indicado")} · ${escapeHtml(analysis.contrato_nombre || "Plantilla no indicada")} · ${escapeHtml(date)}</p>
        <p class="text-[12px] text-on-surface-variant">${escapeHtml(analysis.resultado_count || 0)} resultados trazados</p>
        <button type="button" class="w-full mt-md ${open ? "bg-primary text-on-primary" : "border border-outline text-secondary"} font-label-md text-label-md py-sm rounded hover:opacity-90" data-action="recent-analysis" data-analysis-url="${escapeHtml(route)}">${open ? "Abrir analisis" : "Ver analisis"}</button>
      </div>
    </div>
  `;
}

function buildTopMenu(state) {
  return MAIN_MENU.map((item) => {
    const active = state.route === item.route;
    return `
      <a class="font-title-lg text-title-lg ${active ? "text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed pb-1" : "text-secondary dark:text-secondary-fixed-dim hover:text-primary-container dark:hover:text-primary-fixed"} cursor-pointer transition-all duration-200 active:opacity-70" href="#/${escapeHtml(item.route)}" data-route="${escapeHtml(item.route)}">
        ${escapeHtml(item.label)}
      </a>
    `;
  }).join("");
}

function buildSideMenu(state) {
  return MAIN_MENU.map((item) => {
    const active = state.route === item.route;
    return `
      <button type="button" class="w-full flex items-center gap-md px-md py-sm ${active ? "bg-surface-container-highest text-primary" : "text-on-surface-variant dark:text-on-secondary-fixed-variant hover:bg-surface-container-highest dark:hover:bg-surface-variant"} transition-colors duration-150 ease-in-out font-label-md text-label-md" data-route="${escapeHtml(item.route)}" data-action="sidebar-nav">
        <span class="material-symbols-outlined">${escapeHtml(item.icon)}</span> ${escapeHtml(item.label)}
      </button>
    `;
  }).join("");
}

function buildPageHtml(state) {
  const processes = getProcesses(state);
  const contracts = getContracts(state);
  const machines = getMachines(state);
  const summary = getSummary(state);
  const catalog = getCatalog(state);

  const processOptions = buildOptions(
    processes,
    FALLBACK_PROCESS_OPTIONS,
    state.currentProcess || catalog?.defaults?.processId,
  );
  const contractOptions = buildOptions(
    contracts,
    FALLBACK_CONTRACT_OPTIONS,
    state.currentContract || catalog?.defaults?.contractId,
  );
  const machineOptions = buildOptions(
    machines,
    FALLBACK_MACHINE_OPTIONS,
    state.currentMachine || catalog?.defaults?.machineId,
  );

  return `
    <header class="flex justify-between items-center px-lg h-16 w-full sticky top-0 z-50 bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline">
      <div class="flex items-center gap-xl">
        <span class="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">Industrial RCA</span>
        <nav class="hidden md:flex items-center gap-md">
          ${buildTopMenu(state)}
        </nav>
      </div>
      <div class="flex items-center gap-md">
        <button type="button" class="material-symbols-outlined text-primary cursor-pointer p-base rounded-full hover:bg-surface-container-highest" data-action="notifications">notifications</button>
        <button type="button" class="material-symbols-outlined text-primary cursor-pointer p-base rounded-full hover:bg-surface-container-highest" data-action="account">account_circle</button>
      </div>
    </header>
    <div class="flex flex-1 overflow-hidden">
      <aside class="flex flex-col h-full border-r border-outline-variant p-md bg-surface-container dark:bg-surface-container-low w-[380px] shrink-0">
        <div class="mb-xl px-sm">
          <div class="flex items-center gap-sm mb-base">
            <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-fixed">
              <span class="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <p class="font-headline-sm text-headline-sm text-primary">Investigacion activa</p>
              <p class="font-label-md text-label-md text-secondary">INV-2023-004</p>
            </div>
          </div>
        </div>
        <nav class="flex-1 space-y-1">
          ${buildSideMenu(state)}
        </nav>
        <div class="mt-auto border-t border-outline-variant pt-md space-y-1">
          <button type="button" class="w-full bg-primary text-on-primary py-sm rounded-lg mb-md font-label-md text-label-md hover:bg-primary-container transition-all" data-route="causa_detalle" data-action="add-evidence">Anadir evidencia</button>
          <button type="button" class="w-full flex items-center gap-md px-md py-sm text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-highest rounded-lg transition-colors" data-action="help">
            <span class="material-symbols-outlined">help</span> Ayuda
          </button>
          <button type="button" class="w-full flex items-center gap-md px-md py-sm text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-highest rounded-lg transition-colors" data-action="signout">
            <span class="material-symbols-outlined">logout</span> Cerrar sesion
          </button>
        </div>
      </aside>
      <main class="flex-1 overflow-y-auto bg-surface p-xl">
        <div class="max-w-6xl mx-auto space-y-xl">
          <section class="space-y-sm">
            <span class="font-label-md text-label-md text-primary tracking-widest uppercase">Entrada operativa</span>
            <h1 class="font-display-lg text-display-lg text-on-background">Bienvenido de nuevo</h1>
            <p class="font-body-md text-body-md text-secondary max-w-2xl">
              Selecciona un proceso o una maquina para iniciar un nuevo Arbol Causal o reanudar una investigacion reciente.
            </p>
          </section>
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-xl">
            <div class="lg:col-span-8 bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div class="flex items-center gap-sm mb-lg">
                <span class="material-symbols-outlined text-primary">filter_list</span>
                <h2 class="font-headline-sm text-headline-sm text-primary">Selectores de contexto</h2>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl">
                <div class="space-y-xs">
                  <label class="font-label-md text-label-md text-secondary" for="rca-process-select">Process</label>
                  <select id="rca-process-select" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
                    ${processOptions}
                  </select>
                </div>
                <div class="space-y-xs">
                  <label class="font-label-md text-label-md text-secondary" for="rca-contract-select">Contract</label>
                  <select id="rca-contract-select" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
                    ${contractOptions}
                  </select>
                </div>
                <div class="space-y-xs">
                  <label class="font-label-md text-label-md text-secondary" for="rca-machine-select">Machine</label>
                  <select id="rca-machine-select" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
                    ${machineOptions}
                  </select>
                </div>
              </div>
              <div class="flex gap-md">
                <button type="button" class="bg-primary text-on-primary px-lg py-sm rounded font-label-md text-label-md hover:opacity-90 transition-opacity" data-action="open-tree">
                  Abrir arbol de investigacion
                </button>
                <button type="button" class="border border-outline text-primary px-lg py-sm rounded font-label-md text-label-md hover:bg-surface-container transition-colors" data-route="procesos" data-action="view-processes">
                  Ver todos los procesos
                </button>
              </div>
            </div>
            <div class="lg:col-span-4 flex flex-col gap-md">
              <div class="flex-1 bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between group hover:border-primary transition-colors cursor-default">
                <div>
                  <p class="font-label-md text-label-md text-secondary">Investigaciones activas</p>
                  <p class="font-display-lg text-display-lg text-primary">12</p>
                </div>
                <span class="material-symbols-outlined text-primary opacity-20 group-hover:opacity-100 transition-opacity" style="font-size: 48px;">monitoring</span>
              </div>
              <div class="flex-1 bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between group hover:border-primary transition-colors cursor-default">
                <div>
                  <p class="font-label-md text-label-md text-secondary">Hipotesis validadas</p>
                  <p class="font-display-lg text-display-lg text-primary">84</p>
                </div>
                <span class="material-symbols-outlined text-primary opacity-20 group-hover:opacity-100 transition-opacity" style="font-size: 48px;">check_circle</span>
              </div>
              <div class="flex-1 bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center justify-between group hover:border-primary transition-colors cursor-default">
                <div>
                  <p class="font-label-md text-label-md text-secondary">Tareas pendientes</p>
                  <p class="font-display-lg text-display-lg text-error">07</p>
                </div>
                <span class="material-symbols-outlined text-error opacity-20 group-hover:opacity-100 transition-opacity" style="font-size: 48px;">assignment_late</span>
              </div>
            </div>
          </div>
          <section class="space-y-md">
            <div class="flex justify-between items-center border-b border-outline-variant pb-base gap-md flex-wrap">
              <h2 class="font-headline-sm text-headline-sm text-primary">Investigaciones recientes</h2>
              <div class="flex gap-sm items-center flex-wrap">
                <input id="recent-analysis-search" type="search" placeholder="Buscar analisis" class="border border-outline rounded-lg px-sm py-xs text-[12px]">
                <select id="recent-analysis-status" class="border border-outline rounded-lg px-sm py-xs text-[12px]"><option value="abierto">Abiertos</option><option value="todos">Todos</option><option value="cerrado">Cerrados</option></select>
              </div>
            </div>
            <div id="recent-analysis-list" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md"><div class="text-sm text-secondary">Cargando analisis...</div></div>
            <div class="border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-lg group cursor-pointer hover:border-primary transition-colors" data-route="analisis_causas_v02" data-action="new-investigation">
                <span class="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors" style="font-size: 48px;">add_circle</span>
                <p class="font-label-md text-label-md text-outline group-hover:text-primary transition-colors mt-md">Abrir nueva investigacion</p>
              </div>
          </section>
          <section class="grid grid-cols-1 xl:grid-cols-12 gap-xl items-center bg-primary-container text-on-primary-fixed p-xl rounded-xl relative overflow-hidden">
            <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 24px 24px;"></div>
            <div class="xl:col-span-7 space-y-md relative z-10">
              <h2 class="font-display-lg text-display-lg">Analisis avanzado de causa raiz</h2>
              <p class="font-body-md text-body-md opacity-80">
                El motor de Arbol Causal transforma fallos industriales complejos en diagramas logicos y navegables. Identifica factores humanos, debilidades sistemicas y condiciones latentes con un solo clic.
              </p>
              <div class="flex flex-wrap gap-md pt-md">
                <div class="flex items-center gap-sm bg-white/10 px-md py-base rounded-full backdrop-blur-sm">
                  <span class="material-symbols-outlined text-on-tertiary-fixed" style="font-size: 16px;">account_tree</span>
                  <span class="font-label-md text-label-md">Arbol logico</span>
                </div>
                <div class="flex items-center gap-sm bg-white/10 px-md py-base rounded-full backdrop-blur-sm">
                  <span class="material-symbols-outlined text-on-tertiary-fixed" style="font-size: 16px;">timeline</span>
                  <span class="font-label-md text-label-md">Secuencia de eventos</span>
                </div>
                <div class="flex items-center gap-sm bg-white/10 px-md py-base rounded-full backdrop-blur-sm">
                  <span class="material-symbols-outlined text-on-tertiary-fixed" style="font-size: 16px;">verified</span>
                  <span class="font-label-md text-label-md">Auditoria de evidencias</span>
                </div>
              </div>
            </div>
            <div class="xl:col-span-5 relative h-48 md:h-64 z-10 flex items-center justify-center">
              <img
                class="rounded-lg shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 border-4 border-white/20"
                alt="Visualizacion de panel con nodos y conexiones que representa un diagrama industrial de causa raiz."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5OeVha6mwKdWD_4TpxHBAVYWYMCmGUglSEvUBh10cB-Ui_Zn8aBOFTqUe_TnEUppH1hIrQmZM2C65BX-KAR9JawjZu2mBn9wERjlNkcxDcGCiMpnW3XeSqfluCzAcR37B9ENlUnNUq1rnG-0u-AF8xEhxhSvD7Qa4bGGbK7MjDGQD6LfspoWowjeucXrlvemDA2guOffBH3ZV09PHht2AI-S0ppkaAg3o1huIwniAeq9Io9bZMG8YcsswCn2BHa-6b8DkRzo7wtw"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  `;
}

function bindRouteNavigation(node, route, bus) {
  if (!route) {
    return;
  }
  window.location.hash = toHashRoute(route);
}

export function renderInicio(state, bus) {
  const root = createElement("div", {
    className: "bg-surface font-body-md text-on-surface overflow-hidden h-screen flex flex-col w-full",
  });
  root.innerHTML = buildPageHtml(state);

  return {
    shellMode: "full",
    main: root,
    afterMount(mountRoot, currentState, eventBus) {
      document.title = "Industrial RCA - Inicio";
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");

      const routeLinks = mountRoot.querySelectorAll("[data-route]");
      routeLinks.forEach((item) => {
        item.addEventListener("click", (event) => {
          const route = item.getAttribute("data-route");
          const action = item.getAttribute("data-action");

          if (item.tagName === "A") {
            event.preventDefault();
          }

          if (action === "notifications" || action === "account" || action === "help" || action === "signout") {
            event.preventDefault();
            return;
          }

          if (action === "open-tree") {
            event.preventDefault();
            bindRouteNavigation(item, "arboles_v02", eventBus);
            return;
          }

          if (action === "view-processes") {
            event.preventDefault();
            bindRouteNavigation(item, "procesos_v02", eventBus);
            return;
          }

          if (action === "see-archive") {
            event.preventDefault();
            bindRouteNavigation(item, "procesos_v02", eventBus);
            return;
          }

          if (action === "new-investigation") {
            event.preventDefault();
            window.location.hash = "#/analisis_causas_v02";
            return;
          }

          if (action === "recent-analysis") {
            event.preventDefault();
            window.location.hash = item.getAttribute("data-analysis-url") || "#/analisis_causas_v02";
            return;
          }

          if (action === "recent-card") {
            event.preventDefault();
            bindRouteNavigation(item, route || "inicio", eventBus);
            return;
          }

          if (action === "add-evidence") {
            event.preventDefault();
            bindRouteNavigation(item, "causa_detalle", eventBus);
            return;
          }

          if (action === "sidebar-nav") {
            event.preventDefault();
            bindRouteNavigation(item, route || "inicio", eventBus);
            return;
          }

          if (route) {
            event.preventDefault();
            bindRouteNavigation(item, route, eventBus);
          }
        });
      });

      const processSelect = mountRoot.querySelector("#rca-process-select");
      const contractSelect = mountRoot.querySelector("#rca-contract-select");
      const machineSelect = mountRoot.querySelector("#rca-machine-select");

      if (processSelect) {
        processSelect.addEventListener("change", () => {
          const value = processSelect.value || null;
          setCurrentProcess(value);
          if (eventBus) {
            eventBus.emit("state:change");
          }
        });
      }

      if (contractSelect) {
        contractSelect.addEventListener("change", () => {
          const value = contractSelect.value || null;
          setCurrentContract(value);
          if (eventBus) {
            eventBus.emit("state:change");
          }
        });
      }

      if (machineSelect) {
        machineSelect.addEventListener("change", () => {
          const value = machineSelect.value || null;
          setCurrentMachine(value);
          if (eventBus) {
            eventBus.emit("state:change");
          }
        });
      }

      const recentList = mountRoot.querySelector("#recent-analysis-list");
      const recentSearch = mountRoot.querySelector("#recent-analysis-search");
      const recentStatus = mountRoot.querySelector("#recent-analysis-status");
      let recentAnalyses = [];
      const renderRecentAnalyses = () => {
        const query = (recentSearch?.value || "").trim().toLowerCase();
        const status = recentStatus?.value || "abierto";
        const filtered = recentAnalyses.filter((item) => {
          const matchesStatus = status === "todos" || item.estado === status;
          const haystack = `${item.id} ${item.proceso_nombre || ""} ${item.contrato_nombre || ""} ${item.indicio_apertura || ""}`.toLowerCase();
          return matchesStatus && haystack.includes(query);
        });
        recentList.innerHTML = filtered.length ? filtered.map(buildAnalysisCard).join("") : `<div class="text-sm text-secondary">No hay analisis que coincidan.</div>`;
        recentList.querySelectorAll("[data-action='recent-analysis']").forEach((button) => button.addEventListener("click", () => { window.location.hash = button.dataset.analysisUrl; }));
      };
      recentSearch?.addEventListener("input", renderRecentAnalyses);
      recentStatus?.addEventListener("change", renderRecentAnalyses);
      listAnalyses(100).then((response) => { recentAnalyses = response.data || []; renderRecentAnalyses(); }).catch(() => { recentList.innerHTML = `<div class="text-sm text-secondary">No se pudieron cargar los analisis.</div>`; });
    },
  };
}
