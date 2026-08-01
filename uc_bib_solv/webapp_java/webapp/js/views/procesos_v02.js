import { filterContracts, filterMachines, findProcess, getProcesses, getSummary } from "../core/operational.js";
import { AppState, setCurrentProcess } from "../core/state.js";
import { createElement, escapeHtml, toHashRoute } from "../core/utils.js";
import { createProcess, deleteProcess, updateProcess } from "../api/operational.js";
import { bindHomeShellV02, createHomeShellV02 } from "./shell_v02.js";

function processStatusLabel(status) {
  const normalized = String(status || "inactive").toLowerCase();
  if (normalized === "active") return "Activo";
  if (normalized === "hold") return "En espera";
  if (normalized === "inactive") return "Inactivo";
  return status || "—";
}

function statusBadge(status) {
  const normalized = String(status || "inactive").toLowerCase();
  if (normalized === "active") {
    return `<span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-green-100 text-green-800 text-[11px] font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>Activo</span>`;
  }
  if (normalized === "hold") {
    return `<span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>En espera</span>`;
  }
  return `<span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-outline"></span>Inactivo</span>`;
}

function getRows(state) {
  const activeFilter = state.filters.processStatus || "all";
  return getProcesses(state).filter((item) => activeFilter === "all" || item.status === activeFilter);
}

function getActiveProcess(state, rows) {
  const current = state.currentProcess ? findProcess(state, state.currentProcess) : null;
  if (current && rows.some((item) => item.id === current.id)) {
    return current;
  }
  return rows[0] || null;
}

function buildCenter(state) {
  const rows = getRows(state);
  const activeProcess = getActiveProcess(state, rows);
  const summary = getSummary(state);

  return `
    <div class="max-w-6xl mx-auto space-y-xl">
      <section class="space-y-sm">
        <span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de procesos</span>
        <div class="flex items-end justify-between gap-lg flex-wrap">
          <div>
            <h1 class="font-display-lg text-display-lg text-on-background">Procesos</h1>
            <p class="font-body-md text-body-md text-secondary max-w-3xl">
              Revisa el catalogo de procesos, centra el alcance industrial actual y accede directamente a contratos o arboles desde el espacio central.
            </p>
          </div>
          <span class="px-sm py-xs bg-primary-container text-on-primary text-[11px] font-bold rounded uppercase">${escapeHtml(activeProcess?.name || "Todos los procesos")}</span>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm">
        <div class="flex items-center gap-sm mb-lg">
          <span class="material-symbols-outlined text-primary">tune</span>
          <h2 class="font-headline-sm text-headline-sm text-primary">Filtros de proceso</h2>
        </div>
        <div class="flex gap-sm flex-wrap">
          <button type="button" class="px-md py-sm ${(state.filters.processStatus || "all") === "all" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-process-filter="all">Todos</button>
          <button type="button" class="px-md py-sm ${(state.filters.processStatus || "all") === "active" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-process-filter="active">Activo</button>
          <button type="button" class="px-md py-sm ${(state.filters.processStatus || "all") === "hold" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-process-filter="hold">En espera</button>
          <button type="button" class="px-md py-sm ${(state.filters.processStatus || "all") === "inactive" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-process-filter="inactive">Inactivo</button>
        </div>
      </section>

      <section class="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
          <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Procesos visibles</p>
          <h3 class="font-display-lg text-display-lg text-primary">${rows.length}</h3>
          <p class="text-[12px] text-on-surface-variant mt-sm">Registros operativos filtrados por el estado actual.</p>
        </div>
        <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
          <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Contratos en catalogo</p>
          <h3 class="font-display-lg text-display-lg text-primary">${summary.contratos}</h3>
          <p class="text-[12px] text-on-surface-variant mt-sm">Alcances comerciales vinculados a procesos.</p>
        </div>
        <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
          <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Maquinas en catalogo</p>
          <h3 class="font-display-lg text-display-lg text-primary">${summary.maquinas}</h3>
          <p class="text-[12px] text-on-surface-variant mt-sm">Activos disponibles para la investigacion RCA.</p>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-left border-collapse">
          <thead class="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Proceso</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Responsable</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Contratos</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Maquinas</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Estado</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            ${rows.length ? rows.map((item) => `
              <tr class="hover:bg-surface-container-lowest transition-colors ${activeProcess && activeProcess.id === item.id ? "bg-secondary-container/20 border-l-4 border-l-primary" : ""}" data-process-row="${escapeHtml(item.id)}">
                <td class="px-lg py-md">
                  <div class="grid gap-1">
                    <strong class="font-title-lg text-title-lg text-primary">${escapeHtml(item.name)}</strong>
                    <span class="font-mono-sm text-mono-sm text-on-surface-variant">${escapeHtml(item.id)}</span>
                  </div>
                </td>
                <td class="px-lg py-md font-body-sm text-body-sm">${escapeHtml(item.owner || "—")}</td>
                <td class="px-lg py-md font-body-sm text-body-sm">${item.contractCount}</td>
                <td class="px-lg py-md font-body-sm text-body-sm">${item.machineCount}</td>
                <td class="px-lg py-md">${statusBadge(item.status)}</td>
                <td class="px-lg py-md">
                  <div class="flex justify-end gap-sm">
                    <button type="button" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="process-contracts" data-process-id="${escapeHtml(item.id)}">Contratos</button>
                    <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="process-tree" data-process-id="${escapeHtml(item.id)}">Abrir arbol</button>
                  </div>
                </td>
              </tr>
            `).join("") : `
              <tr><td colspan="6" class="px-lg py-xl text-center text-on-surface-variant">No hay procesos para el filtro actual.</td></tr>
            `}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function buildRight(state) {
  const rows = getRows(state);
  const activeProcess = getActiveProcess(state, rows);
  const contracts = activeProcess ? filterContracts(state, activeProcess.id, "all") : [];
  const machines = activeProcess ? filterMachines(state, activeProcess.id, null, "all") : [];

  return `
    <div class="p-lg border-b border-outline-variant bg-surface-container-low">
      <p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Proceso seleccionado</p>
      <h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(activeProcess?.name || "No hay proceso seleccionado")}</h2>
      <p class="font-body-sm text-body-sm text-on-surface-variant mt-sm">Responsable ${escapeHtml(activeProcess?.owner || "—")} con ${contracts.length} contratos y ${machines.length} maquinas en alcance.</p>
    </div>
    <div class="p-lg space-y-lg">
      <div class="grid grid-cols-2 gap-sm">
        <div class="p-sm bg-white rounded border border-outline-variant">
          <p class="text-[10px] text-on-surface-variant uppercase font-bold">Contratos</p>
          <p class="text-title-lg font-bold text-primary">${contracts.length}</p>
        </div>
        <div class="p-sm bg-white rounded border border-outline-variant">
          <p class="text-[10px] text-on-surface-variant uppercase font-bold">Maquinas</p>
          <p class="text-title-lg font-bold text-primary">${machines.length}</p>
        </div>
      </div>
      <div>
        <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Detalle del alcance</h4>
        <div class="space-y-sm">
          <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed"><span class="text-on-surface-variant">ID del proceso</span><span class="font-mono-sm text-primary">${escapeHtml(activeProcess?.id || "—")}</span></div>
          <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed"><span class="text-on-surface-variant">Responsable</span><span class="text-primary">${escapeHtml(activeProcess?.owner || "—")}</span></div>
          <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed"><span class="text-on-surface-variant">Estado</span><span class="text-primary">${escapeHtml(processStatusLabel(activeProcess?.status))}</span></div>
        </div>
      </div>
      <div class="space-y-sm pt-md">
        <button type="button" class="w-full py-md bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-md hover:opacity-90" data-action="right-open-contracts" ${activeProcess ? "" : "disabled"}>
          <span class="material-symbols-outlined">description</span>
          Abrir contratos
        </button>
        <button type="button" class="w-full py-md border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg flex items-center justify-center gap-md hover:bg-surface-container" data-action="right-open-tree" ${activeProcess ? "" : "disabled"}>
          <span class="material-symbols-outlined">account_tree</span>
          Abrir arbol de investigacion
        </button>
      </div>
      <div class="border-t border-outline-variant pt-lg space-y-md">
        <div>
          <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Gestion del proceso</h4>
          <p class="text-[12px] text-on-surface-variant">Paridad con Dash: crear, actualizar y eliminar procesos del catalogo operativo.</p>
        </div>
        <div id="process-v02-alert" class="hidden rounded-lg border px-md py-sm text-[12px]"></div>
        <div class="space-y-sm">
          <label class="block space-y-xs">
            <span class="font-label-md text-label-md text-secondary">Nombre</span>
            <input id="process-v02-name" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" placeholder="Nombre del proceso" value="${escapeHtml(activeProcess?.name || "")}">
          </label>
        </div>
        <div class="grid grid-cols-3 gap-sm">
          <button type="button" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="process-create">Crear</button>
          <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="process-update" ${activeProcess ? "" : "disabled"}>Actualizar</button>
          <button type="button" class="px-md py-sm border border-red-200 text-red-700 text-label-md font-label-md rounded hover:bg-red-50" data-action="process-delete" ${activeProcess ? "" : "disabled"}>Eliminar</button>
        </div>
      </div>
    </div>
  `;
}

export function renderProcesosV02(state, bus) {
  const { root, mainSlot, rightSlot } = createHomeShellV02(state);
  mainSlot.innerHTML = buildCenter(state);
  rightSlot.innerHTML = buildRight(state);

  return {
    shellMode: "full",
    main: root,
    afterMount(mountRoot, currentState, eventBus) {
      document.title = "Industrial RCA - Gestion de procesos";
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      bindHomeShellV02(mountRoot);

      mountRoot.querySelectorAll("[data-process-filter]").forEach((node) => {
        node.addEventListener("click", () => {
          AppState.filters.processStatus = node.getAttribute("data-process-filter") || "all";
          if (eventBus) eventBus.emit("state:change");
        });
      });

      mountRoot.querySelectorAll("[data-process-row]").forEach((node) => {
        node.addEventListener("click", (event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          setCurrentProcess(node.getAttribute("data-process-row") || null);
          if (eventBus) eventBus.emit("state:change");
        });
      });

      mountRoot.querySelectorAll("[data-action='process-contracts']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          setCurrentProcess(node.getAttribute("data-process-id") || null);
          if (eventBus) eventBus.emit("state:change");
          window.location.hash = toHashRoute("contratos_v02");
        });
      });

      mountRoot.querySelectorAll("[data-action='process-tree']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          setCurrentProcess(node.getAttribute("data-process-id") || null);
          if (eventBus) eventBus.emit("state:change");
          window.location.hash = toHashRoute("arboles_v02");
        });
      });

      const openContracts = mountRoot.querySelector("[data-action='right-open-contracts']");
      if (openContracts) {
        openContracts.addEventListener("click", (event) => {
          event.preventDefault();
          window.location.hash = toHashRoute("contratos_v02");
        });
      }

      const openTree = mountRoot.querySelector("[data-action='right-open-tree']");
      if (openTree) {
        openTree.addEventListener("click", (event) => {
          event.preventDefault();
          window.location.hash = toHashRoute("arboles_v02");
        });
      }

      const alertNode = mountRoot.querySelector("#process-v02-alert");
      const nameInput = mountRoot.querySelector("#process-v02-name");
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
      const currentProcessId = () => {
        const rows = getRows(AppState);
        return getActiveProcess(AppState, rows)?.id || null;
      };

      mountRoot.querySelector("[data-action='process-create']")?.addEventListener("click", async () => {
        try {
          const response = await createProcess({ name: nameInput?.value || "" });
          const processId = response?.data?.id || null;
          if (processId) {
            setCurrentProcess(processId);
          }
          setAlert("Proceso creado.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });

      mountRoot.querySelector("[data-action='process-update']")?.addEventListener("click", async () => {
        const processId = currentProcessId();
        if (!processId) {
          setAlert("Selecciona un proceso antes de actualizar.", "warning");
          return;
        }
        try {
          await updateProcess(processId, { name: nameInput?.value || "" });
          setAlert("Proceso actualizado.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });

      mountRoot.querySelector("[data-action='process-delete']")?.addEventListener("click", async () => {
        const processId = currentProcessId();
        if (!processId) {
          setAlert("Selecciona un proceso antes de eliminar.", "warning");
          return;
        }
        try {
          await deleteProcess(processId);
          setCurrentProcess(null);
          setAlert("Proceso eliminado.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });
    },
  };
}
