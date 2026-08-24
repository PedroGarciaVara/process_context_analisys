import { findProcess, getProcesses, getSummary } from "../core/operational.js";
import { setCurrentProcess } from "../core/state.js";
import { createElement, escapeHtml, toHashRoute } from "../core/utils.js";
import { bindHomeShellV02, createHomeShellV02 } from "./shell_v02.js";
import { renderBpmProcessActions } from "../components/bpm-page.js";

function getRows(state) {
  return getProcesses(state);
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
          <a href="#/modelado-procesos" class="px-lg py-md bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center gap-sm hover:opacity-90" data-action="process-create">
            <span class="material-symbols-outlined">add</span>
            Crear nuevo proceso
          </a>
        </div>
      </section>

      <section class="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
          <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Procesos visibles</p>
          <h3 class="font-display-lg text-display-lg text-primary">${rows.length}</h3>
          <p class="text-[12px] text-on-surface-variant mt-sm">Registros operativos del catálogo actual.</p>
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
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Contratos</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Maquinas</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            ${rows.length ? rows.map((item) => `
              <tr class="hover:bg-surface-container-lowest transition-colors ${activeProcess && activeProcess.id === item.id ? "bg-secondary-container/20 border-l-4 border-l-primary" : ""}" data-process-row="${escapeHtml(item.id)}">
                <td class="px-lg py-md">
                  <div class="grid gap-1">
                    <strong class="font-title-lg text-title-lg text-primary">${escapeHtml(item.name)}</strong>
                  </div>
                </td>
                <td class="px-lg py-md font-body-sm text-body-sm">${item.contractCount}</td>
                <td class="px-lg py-md font-body-sm text-body-sm">${item.machineCount}</td>
                <td class="px-lg py-md">
                  <div class="flex justify-end gap-sm">
                    ${renderBpmProcessActions(item.id)}
                  </div>
                </td>
              </tr>
            `).join("") : `
              <tr><td colspan="4" class="px-lg py-xl text-center text-on-surface-variant">No hay procesos en el catálogo actual.</td></tr>
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

  return `
    <div class="p-lg border-b border-outline-variant bg-surface-container-low">
      <p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Proceso seleccionado</p>
      <h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(activeProcess?.name || "No hay proceso seleccionado")}</h2>
      <p class="font-body-sm text-body-sm text-on-surface-variant mt-sm">Proceso BPM asociado al catálogo operativo.</p>
    </div>
    <div class="p-lg space-y-lg">
      <div class="border-t border-outline-variant pt-lg space-y-md">
        <div>
          <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Gestión del proceso</h4>
          <p class="text-[12px] text-on-surface-variant">El nombre, la relación y el ciclo de vida se gestionan desde el modelado BPM.</p>
        </div>
        <a href="#/modelado-procesos" class="mt-md inline-flex w-full items-center justify-center px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90">Abrir modelado BPM</a>
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

      mountRoot.querySelectorAll("[data-action='process-detail']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          const processId = node.getAttribute("data-process-id") || null;
          setCurrentProcess(processId);
          if (eventBus) eventBus.emit("state:change");
          window.location.hash = toHashRoute("procesos_detalle_v02");
        });
      });

      mountRoot.querySelectorAll("[data-action='process-operations']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          setCurrentProcess(node.getAttribute("data-process-id") || null);
          if (eventBus) eventBus.emit("state:change");
          window.location.hash = toHashRoute("operaciones_v02");
        });
      });

    },
  };
}
