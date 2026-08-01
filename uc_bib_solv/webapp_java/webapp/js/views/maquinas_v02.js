import {
  filterMachines,
  findContract,
  findMachine,
  findProcess,
  getContracts,
  getMachines,
  getProcesses,
  getSummary,
} from "../core/operational.js";
import { AppState, setCurrentContract, setCurrentMachine, setCurrentProcess } from "../core/state.js";
import { createElement, escapeHtml, toHashRoute } from "../core/utils.js";
import { createMachine, deleteMachine, updateMachine } from "../api/operational.js";

const MENU_ITEMS = [
  { route: "inicio", label: "Inicio", icon: "home" },
  { route: "maquinas_v02", label: "Maquina", icon: "settings" },
  { route: "procesos_v02", label: "Proceso", icon: "history" },
  { route: "contratos_v02", label: "Contrato", icon: "group" },
  { route: "arboles_v02", label: "Arbol", icon: "account_tree" },
  { route: "analisis_causas_v02", label: "Analisis causas", icon: "monitoring" },
];

function buildOptions(items, selectedValue, placeholder) {
  const options = [`<option value="">${escapeHtml(placeholder)}</option>`];
  items.forEach((item) => {
    const selected = String(selectedValue || "") === String(item.id) ? " selected" : "";
    options.push(`<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(item.name)}</option>`);
  });
  return options.join("");
}

function statusBadge(status) {
  const normalized = String(status || "hold").toLowerCase();
  if (normalized === "ready") {
    return `
      <span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-green-100 text-green-800 text-[11px] font-bold uppercase">
        <span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>
        Lista
      </span>
    `;
  }
  if (normalized === "warning") {
    return `
      <span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
        Alerta
      </span>
    `;
  }
  return `
    <span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold uppercase">
      <span class="w-1.5 h-1.5 rounded-full bg-outline"></span>
      En espera
    </span>
  `;
}

function healthScore(status) {
  if (status === "ready") return { value: "98/100", tone: "text-green-600" };
  if (status === "warning") return { value: "84/100", tone: "text-amber-700" };
  return { value: "72/100", tone: "text-slate-600" };
}

function getVisibleMachines(state) {
  return filterMachines(
    state,
    state.currentProcess || null,
    state.currentContract || null,
    state.filters.machineStatus || "all",
  );
}

function getActiveMachine(state, rows) {
  const current = state.currentMachine ? findMachine(state, state.currentMachine) : null;
  if (current && rows.some((item) => item.id === current.id)) {
    return current;
  }
  return rows[0] || null;
}

function buildTopMenu(state) {
  return MENU_ITEMS.map((item) => {
    const active = state.route === item.route;
    return `
      <a class="font-title-lg text-title-lg ${active ? "text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed pb-1" : "text-secondary dark:text-secondary-fixed-dim hover:text-primary-container dark:hover:text-primary-fixed"} cursor-pointer transition-all duration-200 active:opacity-70" href="#/${escapeHtml(item.route)}" data-route="${escapeHtml(item.route)}">
        ${escapeHtml(item.label)}
      </a>
    `;
  }).join("");
}

function buildSideMenu(state) {
  return MENU_ITEMS.map((item) => {
    const active = state.route === item.route;
    return `
      <button type="button" class="w-full flex items-center gap-md px-md py-sm ${active ? "bg-surface-container-highest text-primary" : "text-on-surface-variant dark:text-on-secondary-fixed-variant hover:bg-surface-container-highest dark:hover:bg-surface-variant"} transition-colors duration-150 ease-in-out font-label-md text-label-md" data-route="${escapeHtml(item.route)}" data-action="sidebar-nav">
        <span class="material-symbols-outlined">${escapeHtml(item.icon)}</span> ${escapeHtml(item.label)}
      </button>
    `;
  }).join("");
}

function buildRightPanel(activeMachine, state) {
  const status = String(activeMachine?.status || "hold").toLowerCase();
  const process = activeMachine ? findProcess(state, activeMachine.processId) : null;
  const contract = activeMachine ? findContract(state, activeMachine.contractId) : null;
  const score = healthScore(status);
  const contracts = getContracts(state);

  return `
    <aside class="w-[420px] shrink-0 border-l border-outline-variant bg-surface-container-lowest overflow-y-auto">
      <div class="p-lg border-b border-outline-variant bg-surface-container-low">
        <div class="flex justify-between items-start mb-md gap-md">
          <div>
            <p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Maquina seleccionada</p>
            <h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(activeMachine?.name || "No hay maquina seleccionada")}</h2>
          </div>
          ${statusBadge(status)}
        </div>
        <div class="relative w-full aspect-video rounded-lg overflow-hidden border border-outline-variant mb-md bg-surface">
          <img alt="${escapeHtml(activeMachine?.name || "Maquina")}" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf2Qi7bKFL6LrJd4nxkfQ0fKFLl6IRvbgbeVjnWbENCBQn5N8hn9WkPC9aqs9XuoRxabPyPsg-RuG2siQimV2e5TIyoacFL_-dnED2_BrS3_ZjlzB4PRS8DrO3fZmjn6DWub1g4PfI1LwgR7Pa-AoLYXpeoV61OiJEuxMzlqxgB5vxAYxyIxIj8QIiTK-7hVKLhoR9l32S4O3zHa4xCQuaJ68u955yJaL6U-arY3h2L7IOi6tmDJC0wg9b-F02o5WZyigvcI8cnfc" />
          <div class="absolute top-2 right-2 ${status === "ready" ? "bg-green-500" : status === "warning" ? "bg-amber-500" : "bg-slate-500"} text-white px-sm py-base text-[10px] font-bold rounded">ACTIVA</div>
        </div>
        <div class="grid grid-cols-2 gap-sm">
          <div class="p-sm bg-white rounded border border-outline-variant">
            <p class="text-[10px] text-on-surface-variant uppercase font-bold">Indice de salud</p>
            <p class="text-title-lg font-bold ${score.tone}">${score.value}</p>
          </div>
          <div class="p-sm bg-white rounded border border-outline-variant">
            <p class="text-[10px] text-on-surface-variant uppercase font-bold">Ciclo de trabajo</p>
            <p class="text-title-lg font-bold text-primary">24/7</p>
          </div>
        </div>
      </div>
      <div class="p-lg space-y-lg">
        <div>
          <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Ficha tecnica</h4>
          <div class="space-y-sm">
            <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed">
              <span class="text-on-surface-variant">ID maquina</span>
              <span class="font-mono-sm text-primary">${escapeHtml(activeMachine?.id || "—")}</span>
            </div>
            <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed">
              <span class="text-on-surface-variant">Area</span>
              <span class="text-primary">${escapeHtml(activeMachine?.area || "—")}</span>
            </div>
            <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed">
              <span class="text-on-surface-variant">Proceso</span>
              <span class="text-primary">${escapeHtml(process?.name || "—")}</span>
            </div>
            <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed">
              <span class="text-on-surface-variant">Contrato</span>
              <span class="text-primary">${escapeHtml(contract?.name || "—")}</span>
            </div>
          </div>
        </div>
        <div>
          <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Proceso actual</h4>
          <div class="p-md bg-surface-container-low rounded-lg border border-outline-variant">
            <p class="font-label-md text-label-md text-primary mb-xs">${escapeHtml(process?.name || "No hay proceso seleccionado")}</p>
            <div class="w-full bg-outline-variant h-1 rounded-full mb-sm">
              <div class="bg-primary h-1 rounded-full" style="width: ${status === "ready" ? "74%" : status === "warning" ? "48%" : "28%"}"></div>
            </div>
            <p class="text-[11px] text-on-surface-variant">Fin estimado: ${status === "ready" ? "45 min" : status === "warning" ? "90 min" : "2 h"}</p>
          </div>
        </div>
        <div class="space-y-sm pt-md">
          <button type="button" class="w-full py-md bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-md hover:opacity-90" data-action="machine-open-tree" ${activeMachine ? "" : "disabled"}>
            <span class="material-symbols-outlined">account_tree</span>
            Abrir arbol de investigacion
          </button>
          <button type="button" class="w-full py-md border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg flex items-center justify-center gap-md hover:bg-surface-container" data-action="machine-open-contract" ${activeMachine ? "" : "disabled"}>
            <span class="material-symbols-outlined">description</span>
            Abrir contexto de contrato
          </button>
        </div>
        <div class="border-t border-outline-variant pt-lg space-y-md">
          <div>
            <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Gestion de maquina</h4>
            <p class="text-[12px] text-on-surface-variant">Paridad con Dash: crear, actualizar y eliminar maquinas manteniendo el alcance del contrato.</p>
          </div>
          <div id="machine-v02-alert" class="hidden rounded-lg border px-md py-sm text-[12px]"></div>
          <label class="block space-y-xs">
            <span class="font-label-md text-label-md text-secondary">Nombre</span>
            <input id="machine-v02-name-field" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" placeholder="Nombre de maquina" value="${escapeHtml(activeMachine?.name || "")}">
          </label>
          <label class="block space-y-xs">
            <span class="font-label-md text-label-md text-secondary">Contrato</span>
            <select id="machine-v02-contract-field" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
              <option value="">Sin contrato</option>
              ${contracts.map((item) => `<option value="${escapeHtml(item.id)}"${String(activeMachine?.contractId || "") === String(item.id) ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
            </select>
          </label>
          <div class="grid grid-cols-3 gap-sm">
            <button type="button" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="machine-create">Crear</button>
            <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="machine-update" ${activeMachine ? "" : "disabled"}>Actualizar</button>
            <button type="button" class="px-md py-sm border border-red-200 text-red-700 text-label-md font-label-md rounded hover:bg-red-50" data-action="machine-delete" ${activeMachine ? "" : "disabled"}>Eliminar</button>
          </div>
        </div>
      </div>
    </aside>
  `;
}

function buildMainContent(state) {
  const processes = getProcesses(state);
  const contracts = getContracts(state).filter((item) => !state.currentProcess || item.processId === state.currentProcess);
  const rows = getVisibleMachines(state);
  const activeMachine = getActiveMachine(state, rows);
  const summary = getSummary(state);
  const selectedContract = state.currentContract ? findContract(state, state.currentContract) : null;
  const selectedProcess = state.currentProcess ? findProcess(state, state.currentProcess) : null;

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
            <span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de maquinas</span>
            <div class="flex items-end justify-between gap-lg flex-wrap">
              <div>
                <h1 class="font-display-lg text-display-lg text-on-background">Maquinas</h1>
                <p class="font-body-md text-body-md text-secondary max-w-3xl">
                  Revisa la capa operativa de maquinas, filtra por proceso y contrato, y mantiene el detalle del activo visible a la derecha mientras decides el siguiente paso del RCA.
                </p>
              </div>
              <span class="px-sm py-xs bg-primary-container text-on-primary text-[11px] font-bold rounded uppercase">
                ${escapeHtml(selectedContract?.name || selectedProcess?.name || "Todos los alcances")}
              </span>
            </div>
          </section>

          <section class="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm">
            <div class="flex items-center gap-sm mb-lg">
              <span class="material-symbols-outlined text-primary">precision_manufacturing</span>
              <h2 class="font-headline-sm text-headline-sm text-primary">Filtros de maquinas</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-md items-end">
              <div class="space-y-xs">
                <label class="font-label-md text-label-md text-secondary" for="machine-v02-process">Proceso</label>
                <select id="machine-v02-process" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
                  ${buildOptions(processes, state.currentProcess, "Todos los procesos")}
                </select>
              </div>
              <div class="space-y-xs">
                <label class="font-label-md text-label-md text-secondary" for="machine-v02-contract">Contrato</label>
                <select id="machine-v02-contract" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
                  ${buildOptions(contracts, state.currentContract, "Todos los contratos")}
                </select>
              </div>
              <div class="flex gap-sm flex-wrap">
                <button type="button" class="px-md py-sm ${state.filters.machineStatus === "all" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-status-filter="all">Todas</button>
                <button type="button" class="px-md py-sm ${state.filters.machineStatus === "ready" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-status-filter="ready">Lista</button>
                <button type="button" class="px-md py-sm ${state.filters.machineStatus === "warning" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-status-filter="warning">Alerta</button>
                <button type="button" class="px-md py-sm ${state.filters.machineStatus === "hold" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-status-filter="hold">En espera</button>
              </div>
            </div>
          </section>

          <section class="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
              <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Maquinas visibles</p>
              <h3 class="font-display-lg text-display-lg text-primary">${rows.length}</h3>
              <p class="text-[12px] text-on-surface-variant mt-sm">Activos operativos filtrados en el alcance actual.</p>
            </div>
            <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
              <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Alcance del proceso</p>
              <h3 class="font-display-lg text-display-lg text-primary">${escapeHtml(selectedProcess?.name || "Todos")}</h3>
              <div class="w-full bg-surface-container rounded-full h-1.5 mt-md">
                <div class="bg-primary h-1.5 rounded-full" style="width: ${selectedProcess ? "72%" : "100%"}"></div>
              </div>
            </div>
            <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
              <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Tamano del catalogo</p>
              <h3 class="font-display-lg text-display-lg text-primary">${summary.maquinas}</h3>
              <p class="text-[12px] text-on-surface-variant mt-sm">Registros de maquinas disponibles en el catalogo.</p>
            </div>
          </section>

          <section class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <table class="w-full text-left border-collapse">
              <thead class="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">ID maquina</th>
                  <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Nombre</th>
                  <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Area</th>
                  <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Estado</th>
                  <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                ${rows.length ? rows.map((item) => `
                  <tr class="hover:bg-surface-container-lowest transition-colors ${activeMachine && activeMachine.id === item.id ? "bg-secondary-container/20 border-l-4 border-l-primary" : ""}" data-machine-row="${escapeHtml(item.id)}">
                    <td class="px-lg py-md font-mono-sm text-mono-sm">${escapeHtml(item.id)}</td>
                    <td class="px-lg py-md">
                      <div class="grid gap-1">
                        <strong class="font-title-lg text-title-lg text-primary">${escapeHtml(item.name)}</strong>
                        <span class="font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(item.contractName || "Sin contrato")}</span>
                      </div>
                    </td>
                    <td class="px-lg py-md font-body-sm text-body-sm">${escapeHtml(item.area || "—")}</td>
                    <td class="px-lg py-md">${statusBadge(item.status)}</td>
                    <td class="px-lg py-md">
                      <div class="flex justify-end gap-sm">
                        <button type="button" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="machine-tree" data-machine-id="${escapeHtml(item.id)}">Abrir arbol</button>
                        <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="machine-select" data-machine-id="${escapeHtml(item.id)}">Detalle</button>
                      </div>
                    </td>
                  </tr>
                `).join("") : `
                  <tr>
                    <td colspan="5" class="px-lg py-xl text-center text-on-surface-variant">No se encontraron maquinas para el alcance seleccionado.</td>
                  </tr>
                `}
              </tbody>
            </table>
            <div class="px-lg py-md bg-surface-container-lowest border-t border-outline-variant flex justify-between items-center">
              <span class="font-label-md text-label-md text-on-surface-variant">Mostrando ${rows.length} de ${summary.maquinas} maquinas</span>
              <div class="flex gap-sm">
                <button type="button" class="p-sm border border-outline-variant rounded hover:bg-surface-container material-symbols-outlined" aria-label="Pagina anterior">chevron_left</button>
                <button type="button" class="p-sm border border-outline-variant rounded hover:bg-surface-container material-symbols-outlined" aria-label="Pagina siguiente">chevron_right</button>
              </div>
            </div>
          </section>
        </div>
      </main>
      ${buildRightPanel(activeMachine, state)}
    </div>
  `;
}

function goToRoute(route) {
  window.location.hash = toHashRoute(route);
}

export function renderMaquinasV02(state, bus) {
  const root = createElement("div", {
    className: "bg-surface font-body-md text-on-surface overflow-hidden h-screen flex flex-col w-full",
  });
  root.innerHTML = buildMainContent(state);

  return {
    shellMode: "full",
    main: root,
    afterMount(mountRoot, currentState, eventBus) {
      document.title = "Industrial RCA - Maquinas";
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");

      mountRoot.querySelectorAll("[data-route]").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          const route = node.getAttribute("data-route");
          if (route) goToRoute(route);
        });
      });

      mountRoot.querySelectorAll("[data-action='sidebar-nav']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          const route = node.getAttribute("data-route");
          if (route) goToRoute(route);
        });
      });

      mountRoot.querySelectorAll("[data-status-filter]").forEach((node) => {
        node.addEventListener("click", () => {
          AppState.filters.machineStatus = node.getAttribute("data-status-filter") || "all";
          if (eventBus) eventBus.emit("state:change");
        });
      });

      const processSelect = mountRoot.querySelector("#machine-v02-process");
      if (processSelect) {
        processSelect.addEventListener("change", () => {
          setCurrentProcess(processSelect.value || null);
          if (eventBus) eventBus.emit("state:change");
        });
      }

      const contractSelect = mountRoot.querySelector("#machine-v02-contract");
      if (contractSelect) {
        contractSelect.addEventListener("change", () => {
          setCurrentContract(contractSelect.value || null);
          if (eventBus) eventBus.emit("state:change");
        });
      }

      mountRoot.querySelectorAll("[data-machine-row]").forEach((node) => {
        node.addEventListener("click", (event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          const machineId = node.getAttribute("data-machine-row");
          setCurrentMachine(machineId || null);
          if (eventBus) eventBus.emit("state:change");
        });
      });

      mountRoot.querySelectorAll("[data-action='machine-select']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          const machineId = node.getAttribute("data-machine-id");
          setCurrentMachine(machineId || null);
          if (eventBus) eventBus.emit("state:change");
        });
      });

      mountRoot.querySelectorAll("[data-action='machine-tree']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          const machineId = node.getAttribute("data-machine-id");
          const machine = machineId ? findMachine(currentState, machineId) : null;
          if (machine) {
            setCurrentProcess(machine.processId);
            setCurrentContract(machine.contractId);
            setCurrentMachine(machine.id);
          }
          goToRoute("arboles_v02");
        });
      });

      const openTree = mountRoot.querySelector("[data-action='machine-open-tree']");
      if (openTree) {
        openTree.addEventListener("click", (event) => {
          event.preventDefault();
          goToRoute("arboles_v02");
        });
      }

      const openContract = mountRoot.querySelector("[data-action='machine-open-contract']");
      if (openContract) {
        openContract.addEventListener("click", (event) => {
          event.preventDefault();
          goToRoute("contratos_v02");
        });
      }

      mountRoot.querySelectorAll("[data-action='notifications'], [data-action='account'], [data-action='help'], [data-action='signout']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
        });
      });

      const addEvidence = mountRoot.querySelector("[data-action='add-evidence']");
      if (addEvidence) {
        addEvidence.addEventListener("click", (event) => {
          event.preventDefault();
          goToRoute("causa_detalle_v02");
        });
      }

      const alertNode = mountRoot.querySelector("#machine-v02-alert");
      const nameInput = mountRoot.querySelector("#machine-v02-name-field");
      const contractField = mountRoot.querySelector("#machine-v02-contract-field");
      const setAlert = (message, tone = "neutral") => {
        if (!alertNode) return;
        if (!message) {
          alertNode.textContent = "";
          alertNode.className = "hidden rounded-lg border px-md py-sm text-[12px]";
          return;
        }
        const toneClass = tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-amber-200 bg-amber-50 text-amber-700";
        alertNode.textContent = message;
        alertNode.className = `rounded-lg border px-md py-sm text-[12px] ${toneClass}`;
      };
      const refreshCatalog = async () => {
        if (eventBus) eventBus.emit("catalog:refresh");
      };
      const currentMachine = () => {
        const rows = getVisibleMachines(AppState);
        return getActiveMachine(AppState, rows);
      };

      mountRoot.querySelector("[data-action='machine-create']")?.addEventListener("click", async () => {
        try {
          const contractId = contractField?.value || "";
          const contract = contractId ? findContract(AppState, contractId) : null;
          const response = await createMachine({
            name: nameInput?.value || "",
            contractId,
            processId: contract?.processId || "",
          });
          const machine = response?.data || null;
          if (machine?.processId) {
            setCurrentProcess(machine.processId);
          }
          if (machine?.contractId) {
            setCurrentContract(machine.contractId);
          }
          if (machine?.id) {
            setCurrentMachine(machine.id);
          }
          setAlert("Machine created.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });

      mountRoot.querySelector("[data-action='machine-update']")?.addEventListener("click", async () => {
        const machine = currentMachine();
        if (!machine) {
          setAlert("Select a machine before updating.", "warning");
          return;
        }
        try {
          const contractId = contractField?.value || "";
          const contract = contractId ? findContract(AppState, contractId) : null;
          await updateMachine(machine.id, {
            name: nameInput?.value || "",
            contractId,
            processId: contract?.processId || "",
          });
          if (contract?.processId) {
            setCurrentProcess(contract.processId);
          }
          setCurrentContract(contractId || null);
          setAlert("Machine updated.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });

      mountRoot.querySelector("[data-action='machine-delete']")?.addEventListener("click", async () => {
        const machine = currentMachine();
        if (!machine) {
          setAlert("Select a machine before deleting.", "warning");
          return;
        }
        try {
          await deleteMachine(machine.id);
          setCurrentMachine(null);
          setAlert("Machine deleted.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });
    },
  };
}
