import {
  filterMachines,
  findContract,
  findMachine,
  findProcess,
  getContracts,
  getMachines,
  getOperations,
  getProcesses,
  getSummary,
} from "../core/operational.js";
import { AppState, setCurrentContract, setCurrentMachine, setCurrentOperation, setCurrentProcess } from "../core/state.js";
import { createElement, displayName, escapeHtml, toHashRoute } from "../core/utils.js";
import { createMachine, fetchMachineContext, updateMachine } from "../api/operational.js";
import { mountStructuredEditors, structuredEditorMarkup, validateJsonField } from "../components/json-editor.js";
import { V02_MENU_ITEMS } from "./shell_v02.js";
import { stageDraftFromMachine, stageEditorMarkup, stagePathsMarkup } from "../components/machine-stages.js";

const MENU_ITEMS = V02_MENU_ITEMS;

function catalogName(item, fallback = "Sin nombre") {
  if (item === null || item === undefined) return fallback;
  if (typeof item === "string" || typeof item === "number") return String(item) || fallback;
  return item.name || item.nombre || item.label || item.title || displayName(item, fallback);
}

function buildOptions(items, selectedValue, placeholder) {
  const options = [`<option value="">${escapeHtml(placeholder)}</option>`];
  items.forEach((item) => {
    const selected = String(selectedValue || "") === String(item.id) ? " selected" : "";
    options.push(`<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(catalogName(item))}</option>`);
  });
  return options.join("");
}

function getVisibleMachines(state) {
  return filterMachines(
    state,
    state.currentProcess || null,
    state.currentOperation || null,
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

function structuredText(value) {
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function selectedOperationForMachine(activeMachine) {
  if (!activeMachine) return null;
  return activeMachine.operations?.find((item) => item.operation_id === activeMachine.selectedOperationId)
    || activeMachine.operations?.find((item) => item.operation_id === AppState.currentOperation?.split("|")[0])
    || activeMachine.operations?.[0]
    || null;
}

function buildMachineManagementModal(activeMachine, state) {
  const context = activeMachine?.machineContext || {};
  const type = context.machine_type || {};
  const machine = context.machine || activeMachine || {};
  const contracts = getContracts(state);
  const stageDraft = stageDraftFromMachine(activeMachine);
  const hasOperation = Boolean(activeMachine?.selectedOperationId || activeMachine?.operations?.length);
  const field = (id, label, value = "", inputType = "text", extra = "") => `
    <label class="block space-y-xs">
      <span class="font-label-md text-label-md text-secondary">${label}</span>
        ${inputType === "json"
          ? structuredEditorMarkup(({ "machine-v02-type-capacity": "nominal_capacity", "machine-v02-type-controls": "control_systems", "machine-v02-type-limitations": "common_limitations", "machine-v02-type-characteristics": "common_technical_characteristics", "machine-v02-specific-characteristics": "specific_characteristics", "machine-v02-specific-parameters": "specific_parameters", "machine-v02-specific-ranges": "specific_operating_ranges", "machine-v02-specific-limitations": "specific_limitations", "machine-v02-specific-instructions": "specific_instructions", "machine-v02-specific-differences": "differences_from_machine_type" }[id] || id), value, { id })
          : inputType === "textarea"
        ? `<textarea id="${id}" class="w-full min-h-20 border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" ${extra}>${escapeHtml(value)}</textarea>`
        : `<input id="${id}" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="${inputType}" value="${escapeHtml(value)}" ${extra}>`}
    </label>`;
  return `
    <div id="machine-v02-modal" class="hidden fixed inset-0 z-[100] items-center justify-center bg-black/40 p-lg" role="dialog" aria-modal="true" aria-labelledby="machine-v02-modal-title">
      <div class="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-surface-container-lowest shadow-2xl border border-outline-variant">
        <div class="flex items-start justify-between gap-lg p-lg border-b border-outline-variant">
          <div><p class="font-label-md text-label-md text-primary uppercase tracking-widest">Gestión de máquina</p><h2 id="machine-v02-modal-title" class="font-headline-md text-headline-md text-primary">${activeMachine ? "Editar máquina" : "Nueva máquina"}</h2><p class="text-[12px] text-on-surface-variant mt-xs">El contrato y la operación BPM se mantienen como contexto separado.</p></div>
        </div>
        <div class="flex gap-sm px-lg pt-md border-b border-outline-variant" role="tablist" aria-label="Nivel de máquina">
          <button type="button" id="machine-v02-tab-type" class="px-md py-sm border-b-2 border-primary text-primary font-label-md" role="tab" aria-selected="true" data-machine-tab="type">Máquina genérica</button>
          <button type="button" id="machine-v02-tab-machine" class="px-md py-sm border-b-2 border-transparent text-on-surface-variant font-label-md" role="tab" aria-selected="false" data-machine-tab="machine">Máquina específica</button>
        </div>
        <div class="p-lg">
          <section id="machine-v02-panel-type" role="tabpanel" data-machine-panel="type" class="grid grid-cols-1 md:grid-cols-2 gap-md">
            ${field("machine-v02-type-name", "Nombre tipo", type.name || type.nombre || "")}
            ${field("machine-v02-type-technology", "Descripción técnica / tecnología", type.technology_description || "")}
            ${field("machine-v02-type-principle", "Principio de funcionamiento", type.operating_principle || "", "textarea", "required")}
            ${field("machine-v02-type-general-description", "Descripción técnica general", type.general_technical_description || "", "textarea", "required")}
            ${field("machine-v02-type-capacity", "Capacidad nominal", type.nominal_capacity, "json")}
            ${field("machine-v02-type-controls", "Sistemas de control", type.control_systems, "json")}
            ${field("machine-v02-type-limitations", "Limitaciones comunes", type.common_limitations, "json")}
            ${field("machine-v02-type-characteristics", "Campos soportados / características comunes", type.common_technical_characteristics, "json")}
          </section>
          <section id="machine-v02-panel-machine" role="tabpanel" data-machine-panel="machine" class="hidden grid grid-cols-1 md:grid-cols-2 gap-md">
            ${field("machine-v02-name-field", "Nombre", machine.nombre || machine.name || "", "text", "required")}
            ${field("machine-v02-specific-description", "Descripción específica", machine.specific_description || "", "textarea")}
            ${field("machine-v02-specific-characteristics", "Características", machine.specific_characteristics, "json")}
            ${field("machine-v02-specific-parameters", "Parámetros", machine.specific_parameters, "json")}
            ${field("machine-v02-specific-ranges", "Rangos", machine.specific_operating_ranges, "json")}
            ${field("machine-v02-specific-limitations", "Limitaciones específicas", machine.specific_limitations, "json")}
            ${field("machine-v02-specific-instructions", "Instrucciones", machine.specific_instructions, "json")}
            ${field("machine-v02-specific-differences", "Diferencias frente al tipo", machine.differences_from_machine_type, "json")}
            <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Contrato (contexto separado)</span><select id="machine-v02-contract-field" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm"><option value="">Sin contrato</option>${contracts.map((item) => `<option value="${escapeHtml(item.id)}"${String(machine.contract_id || machine.contractId || "") === String(item.id) ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
          </section>
          <section class="mt-lg rounded-lg border border-primary/20 bg-primary/5 p-md space-y-sm" data-stage-editor>
            <div class="flex items-center justify-between gap-sm"><div><h3 class="font-label-md text-primary">Etapas de la operación BPM</h3><p class="text-[11px] text-on-surface-variant">${hasOperation ? "Añade etapas y subetapas directas de la operación BPM para la máquina genérica y la específica." : "Selecciona una operación BPM para editar etapas."}</p></div><button type="button" class="px-sm py-xs bg-primary text-on-primary rounded" data-stage-add ${hasOperation ? "" : "disabled"}>+ Añadir etapa</button></div>
            <div class="space-y-sm" id="machine-v02-stages-list">${stageEditorMarkup(stageDraft)}</div>
          </section>
          <div id="machine-v02-alert" class="hidden rounded-lg border px-md py-sm text-[12px] mt-lg" aria-live="polite"></div>
          <div class="flex justify-end gap-sm mt-lg pt-md border-t border-outline-variant">
            <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant rounded-lg font-label-md" data-action="machine-modal-cancel">Cancelar</button>
            <button type="button" class="px-md py-sm bg-primary text-on-primary rounded-lg font-label-md" data-action="machine-save">Guardar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function buildRightPanel(activeMachine, state) {
  const process = activeMachine ? findProcess(state, activeMachine.processId) : null;
  const contract = activeMachine ? findContract(state, activeMachine.contractId) : null;
  const selectedOperation = selectedOperationForMachine(activeMachine);
  const processLabel = catalogName(process, activeMachine?.processName || selectedOperation?.processName || "—");
  const contractLabel = catalogName(contract, activeMachine?.contractName || "—");
  const areaLabel = activeMachine?.area || activeMachine?.processName || selectedOperation?.processName || "—";
  return `
    <aside class="w-[420px] shrink-0 border-l border-outline-variant bg-surface-container-lowest overflow-y-auto">
      <div class="p-lg border-b border-outline-variant bg-surface-container-low">
        <div class="flex justify-between items-start mb-md gap-md">
          <div>
            <p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Maquina seleccionada</p>
            <h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(activeMachine?.name || "No hay maquina seleccionada")}</h2>
          </div>
        </div>
      </div>
      <div class="p-lg space-y-lg">
        <div>
          <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Ficha tecnica</h4>
          <div class="space-y-sm">
            <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed">
            <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed">
              <span class="text-on-surface-variant">Area</span>
            <span class="machine-v02-readable text-primary">${escapeHtml(catalogName(areaLabel, "—"))}</span>
            </div>
            <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed">
              <span class="text-on-surface-variant">Proceso</span>
              <span class="machine-v02-readable text-primary">${escapeHtml(processLabel)}</span>
            </div>
            <div class="flex justify-between font-body-sm text-body-sm py-base border-b border-outline-variant border-dashed">
              <span class="text-on-surface-variant">Contrato</span>
              <span class="machine-v02-readable text-primary">${escapeHtml(contractLabel)}</span>
            </div>
          </div>
        </div>
        <div>
          <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Proceso actual</h4>
          <div class="p-md bg-surface-container-low rounded-lg border border-outline-variant">
            <p class="machine-v02-readable font-label-md text-label-md text-primary mb-xs">${escapeHtml(catalogName(process, activeMachine?.processName || selectedOperation?.processName || "No hay proceso seleccionado"))}</p>
            <div class="w-full bg-outline-variant h-1 rounded-full mb-sm">
              <div class="bg-primary h-1 rounded-full" style="width: ${status === "ready" ? "74%" : status === "warning" ? "48%" : "28%"}"></div>
            </div>
            <p class="text-[11px] text-on-surface-variant">Fin estimado: ${status === "ready" ? "45 min" : status === "warning" ? "90 min" : "2 h"}</p>
          </div>
        </div>
        <div id="machine-v02-context-blocks" class="space-y-sm" aria-live="polite">
          <p class="text-[12px] text-on-surface-variant">Selecciona una máquina para cargar el contexto canónico.</p>
        </div>
        <div class="border-t border-outline-variant pt-lg"><h4 class="font-label-md text-on-surface-variant uppercase mb-sm">Etapas de la operación</h4><div id="machine-v02-stage-detail" class="space-y-xs">${stagePathsMarkup(activeMachine)}</div></div>
      </div>
      ${buildMachineManagementModal(activeMachine, state)}
    </aside>
  `;
}

function buildMainContent(state) {
  const processes = getProcesses(state);
  const contracts = getContracts(state).filter((item) => !state.currentProcess || item.processId === state.currentProcess);
  // BPM process UUIDs are a separate canonical identity from the legacy
  // operational process selector; do not match them by text or numeric ID.
  const operations = getOperations(state).filter(
    (item) => !state.currentProcess || String(item.processId) === String(state.currentProcess),
  );
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
          <button type="button" class="w-full flex items-center gap-md px-md py-sm text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-highest rounded-lg transition-colors" data-action="help">
            <span class="material-symbols-outlined">help</span> Ayuda
          </button>
          <button type="button" class="w-full flex items-center gap-md px-md py-sm text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-highest rounded-lg transition-colors" data-action="signout">
            <span class="material-symbols-outlined">logout</span> Cerrar sesion
          </button>
        </div>
      </aside>
      <main class="machine-v02-main flex-1 overflow-y-auto bg-surface p-xl">
        <div class="max-w-6xl mx-auto space-y-xl">
          <section class="space-y-sm">
            <span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de maquinas</span>
            <div class="flex items-end justify-between gap-lg flex-wrap">
              <div>
                <h1 class="font-display-lg text-display-lg text-on-background">Maquinas</h1>
                <p class="font-body-md text-body-md text-secondary max-w-3xl">
                  Revisa la capa operativa de maquinas, filtra por operación BPM y proceso, y mantiene el detalle del activo visible a la derecha mientras decides el siguiente paso del RCA.
                </p>
              </div>
              <button type="button" class="px-lg py-md bg-primary text-on-primary rounded-lg font-label-md shadow-sm hover:opacity-90" data-action="machine-modal-new"><span class="material-symbols-outlined align-middle mr-xs">add</span>Crear nueva máquina</button>
            </div>
          </section>

          <section class="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm">
            <div class="flex items-center gap-sm mb-lg">
              <span class="material-symbols-outlined text-primary">precision_manufacturing</span>
              <h2 class="font-headline-sm text-headline-sm text-primary">Filtros de maquinas</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-md items-end">
              <div class="space-y-xs">
                <label class="font-label-md text-label-md text-secondary" for="machine-v02-process">Proceso</label>
                <select id="machine-v02-process" class="machine-v02-select w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
                  ${buildOptions(processes, state.currentProcess, "Todos los procesos")}
                </select>
              </div>
              <div class="space-y-xs">
                <label class="font-label-md text-label-md text-secondary" for="machine-v02-operation">Operación BPM</label>
                <select id="machine-v02-operation" class="machine-v02-select w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
                  ${buildOptions(operations, state.currentOperation, "Todas las operaciones BPM")}
                </select>
              </div>
            </div>
          </section>

          <section class="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
              <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Maquinas visibles</p>
              <h3 class="font-display-lg text-display-lg text-primary">${rows.length}</h3>
              <p class="text-[12px] text-on-surface-variant mt-sm">Activos operativos filtrados en el alcance actual.</p>
            </div>
            <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
              <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Alcance del proceso</p>
              <h3 class="machine-v02-readable font-display-lg text-display-lg text-primary">${escapeHtml(displayName(selectedProcess, "Todos"))}</h3>
              <div class="w-full bg-surface-container rounded-full h-1.5 mt-md">
                <div class="bg-primary h-1.5 rounded-full" style="width: ${selectedProcess ? "72%" : "100%"}"></div>
              </div>
            </div>
          </section>

          <section class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <table class="machine-v02-table w-full text-left border-collapse">
              <thead class="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Nombre</th>
                  <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Area</th>
                  <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                ${rows.length ? rows.map((item) => `
                  <tr class="hover:bg-surface-container-lowest transition-colors ${activeMachine && activeMachine.id === item.id ? "bg-secondary-container/20 border-l-4 border-l-primary" : ""}" data-machine-row="${escapeHtml(item.id)}">
                    <td class="px-lg py-md">
                      <div class="grid gap-1">
                        <strong class="machine-v02-readable font-title-lg text-title-lg text-primary">${escapeHtml(displayName(item, "Máquina sin nombre"))}</strong>
                        <span class="machine-v02-readable font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(displayName({ name: item.contractName, label: item.contract_name, title: item.contractTitle }, "Sin contrato"))}</span>
                      </div>
                    </td>
                    <td class="machine-v02-readable px-lg py-md font-body-sm text-body-sm">${escapeHtml(item.area || item.processName || item.operations?.[0]?.process_name || "—")}</td>
                    <td class="px-lg py-md">
                      <div class="flex justify-end gap-sm">
                        <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="machine-select" data-machine-id="${escapeHtml(item.id)}">Detalle</button>
                      </div>
                    </td>
                  </tr>
                `).join("") : `
                  <tr>
                    <td colspan="3" class="px-lg py-xl text-center text-on-surface-variant">No se encontraron maquinas para el alcance seleccionado.</td>
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
      mountStructuredEditors(mountRoot);

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

      const processSelect = mountRoot.querySelector("#machine-v02-process");
      if (processSelect) {
        processSelect.addEventListener("change", () => {
          setCurrentProcess(processSelect.value || null);
          if (eventBus) eventBus.emit("state:change");
        });
      }

      const operationSelect = mountRoot.querySelector("#machine-v02-operation");
      if (operationSelect) {
        operationSelect.addEventListener("change", () => {
          const operation = getOperations(AppState).find((item) => item.id === operationSelect.value);
          setCurrentOperation(operationSelect.value || null, operation?.processId || null);
          if (eventBus) eventBus.emit("state:change");
        });
      }

      mountRoot.querySelectorAll("[data-machine-row]").forEach((node) => {
        node.addEventListener("click", (event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          const machineId = node.getAttribute("data-machine-row");
          setCurrentMachine(machineId || null);
          // Selection is local UI state. Avoid remounting the complete page
          // here: a fast follow-up click on Detalle must keep the modal in
          // the same DOM tree while the row selection is updated.
          mountRoot.querySelectorAll("[data-machine-row]").forEach((row) => {
            const selected = row.getAttribute("data-machine-row") === machineId;
            row.classList.toggle("bg-secondary-container/20", selected);
            row.classList.toggle("border-l-4", selected);
            row.classList.toggle("border-l-primary", selected);
          });
        });
      });

      mountRoot.querySelectorAll("[data-action='machine-select']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          const machineId = node.getAttribute("data-machine-id");
          setCurrentMachine(machineId || null);
          openManagementModal(machineId);
        });
      });

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

      const refreshCatalog = async () => {
        if (eventBus) await eventBus.emit("catalog:refresh");
      };
      const currentMachine = () => {
        const rows = getVisibleMachines(AppState);
        return getActiveMachine(AppState, rows);
      };
      const contextBlocks = mountRoot.querySelector("#machine-v02-context-blocks");
      const renderContext = (context) => {
        if (!contextBlocks) return;
        const block = (title, value) => `<section class="rounded-lg border border-outline-variant bg-surface-container-low p-sm"><h4 class="font-label-md text-label-md text-primary uppercase mb-xs">${title}</h4><p class="text-[12px] text-on-surface-variant whitespace-pre-wrap">${escapeHtml(value || "Sin datos")}</p></section>`;
        const operation = context?.operation;
        const type = context?.machine_type;
        const machine = context?.machine;
        const configurations = context?.machine_operation_configurations || [];
        const configuration = AppState.currentOperation
          ? configurations.find((item) => {
            const [operationId, processVersionId] = String(AppState.currentOperation).split("|");
            return String(item.operation_id) === operationId
              && String(item.process_version_id) === processVersionId;
          })
          : configurations[0];
        contextBlocks.innerHTML = [
          block("Operación BPM", operation ? `${operation.name || "Sin nombre"}\nEtapas configuradas: ${(operation.etapas || []).length}` : "Sin configuración de operación"),
          block("Tipo de máquina", type?.name ? `${type.name}\n${type.general_technical_description || ""}` : "Sin tipo de máquina"),
          block("Máquina específica", machine ? `${machine.nombre || machine.name || "Sin nombre"}` : "Sin detalle de máquina"),
          block("Configuración máquina–operación", configuration ? `${configuration.specific_description || "Sin descripción"}\nValidación: ${configuration.validation_status || "draft"}` : "No existe configuración para esta operación"),
        ].join("");
      };
      const loadContext = async () => {
        const machine = currentMachine();
        if (!contextBlocks || !machine) return;
        contextBlocks.innerHTML = '<p class="text-[12px] text-on-surface-variant">Cargando contexto…</p>';
        try {
          const contextParams = {};
          if (AppState.currentOperation) {
            const [operationId, processVersionId] = String(AppState.currentOperation).split("|");
            contextParams.operation_id = operationId;
            contextParams.process_version_id = processVersionId;
          }
          const response = await fetchMachineContext(machine.id, contextParams);
          renderContext(response?.data);
        } catch (error) {
          contextBlocks.innerHTML = `<p class="rounded-lg border border-red-200 bg-red-50 p-sm text-[12px] text-red-700">No se pudo cargar el contexto: ${escapeHtml(error.message)}</p>`;
        }
      };
      loadContext();

      const managementModal = mountRoot.querySelector("#machine-v02-modal");
      let activeMachine = currentMachine();
      let editingMachine = activeMachine;
      let modalDirty = false;
      let activeModalTab = "type";
      const populateManagementModal = (context) => {
        if (!managementModal || !context || modalDirty) return;
        if (activeMachine) activeMachine.machineContext = context;
        const type = context.machine_type || {};
        const machine = context.machine || {};
        const setValue = (id, value) => {
          const node = managementModal.querySelector(`#${id}`);
          if (node && value !== null && value !== undefined) node.value = typeof value === "string" ? value : JSON.stringify(value, null, 2);
        };
        setValue("machine-v02-type-name", type.name || type.nombre);
        setValue("machine-v02-type-technology", type.technology_description);
        setValue("machine-v02-type-principle", type.operating_principle);
        setValue("machine-v02-type-general-description", type.general_technical_description);
        setValue("machine-v02-type-capacity", type.nominal_capacity);
        setValue("machine-v02-type-controls", type.control_systems);
        setValue("machine-v02-type-limitations", type.common_limitations);
        setValue("machine-v02-type-characteristics", type.common_technical_characteristics);
        setValue("machine-v02-name-field", machine.nombre || machine.name);
        setValue("machine-v02-specific-description", machine.specific_description);
        setValue("machine-v02-specific-characteristics", machine.specific_characteristics);
        setValue("machine-v02-specific-parameters", machine.specific_parameters);
        setValue("machine-v02-specific-ranges", machine.specific_operating_ranges);
        setValue("machine-v02-specific-limitations", machine.specific_limitations);
        setValue("machine-v02-specific-instructions", machine.specific_instructions);
        setValue("machine-v02-specific-differences", machine.differences_from_machine_type);
        const operation = context.operation || selectedOperationForMachine(activeMachine);
        if (operation) {
          stageDraft = (operation.etapas || []).map((stage, index) => ({
            id: stage.id || `stage-${index + 1}`,
            nombre: stage.nombre || "",
            orden: index + 1,
            subetapas: (stage.subetapas || []).map((child, childIndex) => ({
              id: child.id || `stage-${index + 1}-substage-${childIndex + 1}`,
              nombre: child.nombre || "",
              orden: childIndex + 1,
              subetapas: [],
            })),
          }));
          renderStages();
          setModalTab(activeModalTab);
        }
      };
      let stageDraft = stageDraftFromMachine(activeMachine);
      const stageList = managementModal?.querySelector("#machine-v02-stages-list");
      const renderStages = () => {
        if (stageList) stageList.innerHTML = stageEditorMarkup(stageDraft);
      };
      managementModal?.querySelector("[data-stage-add]")?.addEventListener("click", () => {
        stageDraft.push({ id: `stage-${Date.now()}`, nombre: "", orden: stageDraft.length + 1, subetapas: [] });
        renderStages();
      });
      stageList?.addEventListener("input", (event) => {
        const stageNode = event.target.closest("[data-stage-index]");
        if (!stageNode) return;
        const stageIndex = Number(stageNode.dataset.stageIndex);
        if (event.target.matches("[data-stage-name]")) stageDraft[stageIndex].nombre = event.target.value;
        if (event.target.matches("[data-substage-name]")) {
          const childIndex = Number(event.target.closest("[data-substage-index]").dataset.substageIndex);
          stageDraft[stageIndex].subetapas[childIndex].nombre = event.target.value;
        }
      });
      stageList?.addEventListener("click", (event) => {
        const stageNode = event.target.closest("[data-stage-index]");
        if (!stageNode) return;
        const stageIndex = Number(stageNode.dataset.stageIndex);
        let changed = false;
        if (event.target.closest("[data-stage-delete]")) {
          if (stageDraft[stageIndex].subetapas.length && !window.confirm("La etapa tiene subetapas. ¿Eliminar todos sus descendientes?")) return;
          stageDraft.splice(stageIndex, 1);
          changed = true;
        }
        const stageMove = event.target.closest("[data-stage-move]")?.dataset.stageMove;
        if (stageMove) {
          const target = stageMove === "up" ? stageIndex - 1 : stageIndex + 1;
          if (target >= 0 && target < stageDraft.length) {
            [stageDraft[stageIndex], stageDraft[target]] = [stageDraft[target], stageDraft[stageIndex]];
            changed = true;
          }
        }
        if (event.target.closest("[data-stage-add-substage]")) {
          stageDraft[stageIndex].subetapas.push({ id: `${stageDraft[stageIndex].id}-substage-${stageDraft[stageIndex].subetapas.length + 1}`, nombre: "", orden: stageDraft[stageIndex].subetapas.length + 1, subetapas: [] });
          changed = true;
        }
        const substageNode = event.target.closest("[data-substage-index]");
        const childIndex = substageNode ? Number(substageNode.dataset.substageIndex) : -1;
        if (event.target.closest("[data-substage-delete]")) {
          stageDraft[stageIndex].subetapas.splice(childIndex, 1);
          changed = true;
        }
        const substageMove = event.target.closest("[data-substage-move]")?.dataset.substageMove;
        if (substageMove) {
          const children = stageDraft[stageIndex].subetapas;
          const target = substageMove === "up" ? childIndex - 1 : childIndex + 1;
          if (target >= 0 && target < children.length) {
            [children[childIndex], children[target]] = [children[target], children[childIndex]];
            changed = true;
          }
        }
        if (changed) renderStages();
      });
      const modalAlert = managementModal?.querySelector("#machine-v02-alert");
      const setModalAlert = (message, tone = "neutral") => {
        if (!modalAlert) return;
        if (!message) {
          modalAlert.textContent = "";
          modalAlert.className = "hidden rounded-lg border px-md py-sm text-[12px] mt-lg";
          return;
        }
        const toneClass = tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-amber-200 bg-amber-50 text-amber-700";
        modalAlert.textContent = message;
        modalAlert.className = `rounded-lg border px-md py-sm text-[12px] mt-lg ${toneClass}`;
      };
      const setModalVisible = (visible) => {
        if (!managementModal) return;
        managementModal.classList.toggle("hidden", !visible);
        managementModal.classList.toggle("flex", visible);
      };
      const setModalTab = (tab) => {
        if (!managementModal) return;
        activeModalTab = tab === "machine" ? "machine" : "type";
        managementModal.querySelectorAll("[data-machine-tab]").forEach((node) => {
          const selected = node.getAttribute("data-machine-tab") === activeModalTab;
          node.setAttribute("aria-selected", String(selected));
          node.classList.toggle("border-primary", selected);
          node.classList.toggle("text-primary", selected);
          node.classList.toggle("border-transparent", !selected);
          node.classList.toggle("text-on-surface-variant", !selected);
        });
        managementModal.querySelectorAll("[data-machine-panel]").forEach((node) => {
          node.classList.toggle("hidden", node.getAttribute("data-machine-panel") !== activeModalTab);
        });
      };
      const openManagementModal = (machineId = null) => {
        if (machineId) setCurrentMachine(machineId);
        activeMachine = currentMachine();
        editingMachine = activeMachine;
        modalDirty = false;
        setModalVisible(true);
        const machine = activeMachine;
        if (machine) {
          const selectedOperation = selectedOperationForMachine(machine);
          const params = selectedOperation
            ? { operation_id: selectedOperation.operation_id, process_version_id: selectedOperation.process_version_id }
            : {};
          fetchMachineContext(machine.id, params).then((response) => populateManagementModal(response?.data)).catch(() => {});
        }
      };
      mountRoot.querySelector("[data-action='machine-modal-new']")?.addEventListener("click", () => {
        editingMachine = null;
        modalDirty = false;
        managementModal?.querySelectorAll("input, textarea").forEach((node) => { node.value = ""; });
        stageDraft = [];
        renderStages();
        setModalTab("type");
        setModalVisible(true);
      });
      mountRoot.querySelectorAll("[data-action='machine-modal-cancel']").forEach((node) => {
        node.addEventListener("click", () => setModalVisible(false));
      });
      managementModal?.querySelectorAll("[data-machine-tab]").forEach((node) => {
        node.addEventListener("click", () => setModalTab(node.getAttribute("data-machine-tab") || "type"));
      });
      managementModal?.addEventListener("input", () => {
        modalDirty = true;
      });
      const parseModalJson = (id, label) => {
        const value = managementModal?.querySelector(`#${id}`)?.value?.trim() || "";
        if (!value) return null;
        try {
          const parsed = JSON.parse(value);
          const field = ({ "machine-v02-type-capacity": "nominal_capacity", "machine-v02-type-controls": "control_systems", "machine-v02-type-limitations": "common_limitations", "machine-v02-type-characteristics": "common_technical_characteristics", "machine-v02-specific-characteristics": "specific_characteristics", "machine-v02-specific-parameters": "specific_parameters", "machine-v02-specific-ranges": "specific_operating_ranges", "machine-v02-specific-limitations": "specific_limitations", "machine-v02-specific-instructions": "specific_instructions", "machine-v02-specific-differences": "differences_from_machine_type" }[id] || id);
          const checked = validateJsonField(field, parsed);
          if (checked.errors.length) throw new Error(checked.errors[0].message);
          return checked.value;
        } catch (error) {
          throw new Error(`${label} ${error.message}`);
        }
      };
      managementModal?.querySelector("[data-action='machine-save']")?.addEventListener("click", async () => {
        try {
          const value = (id) => managementModal.querySelector(`#${id}`)?.value?.trim() || "";
          const typeName = value("machine-v02-type-name");
          const operatingPrinciple = value("machine-v02-type-principle");
          const generalDescription = value("machine-v02-type-general-description");
          const machineName = value("machine-v02-name-field");
          if (!typeName || !operatingPrinciple || !generalDescription || !machineName) {
            throw new Error("Completa nombre, principio, descripción general y nombre de máquina.");
          }
          const contractId = value("machine-v02-contract-field");
          const contract = contractId ? findContract(AppState, contractId) : null;
          const selectedOperation = selectedOperationForMachine(editingMachine);
          const payload = {
            name: machineName,
            contractId,
            processId: contract?.processId || "",
            machine_type: {
              id: editingMachine?.machineContext?.machine_type?.id,
              name: typeName,
              technology_description: value("machine-v02-type-technology"),
              operating_principle: operatingPrinciple,
              general_technical_description: generalDescription,
              nominal_capacity: parseModalJson("machine-v02-type-capacity", "Capacidad nominal"),
              control_systems: parseModalJson("machine-v02-type-controls", "Sistemas de control"),
              common_limitations: parseModalJson("machine-v02-type-limitations", "Limitaciones comunes"),
              common_technical_characteristics: parseModalJson("machine-v02-type-characteristics", "Características comunes"),
            },
            specific_description: value("machine-v02-specific-description"),
            specific_characteristics: parseModalJson("machine-v02-specific-characteristics", "Características específicas"),
            specific_parameters: parseModalJson("machine-v02-specific-parameters", "Parámetros"),
            specific_operating_ranges: parseModalJson("machine-v02-specific-ranges", "Rangos"),
            specific_limitations: parseModalJson("machine-v02-specific-limitations", "Limitaciones específicas"),
            specific_instructions: parseModalJson("machine-v02-specific-instructions", "Instrucciones"),
            differences_from_machine_type: parseModalJson("machine-v02-specific-differences", "Diferencias frente al tipo"),
            ...(selectedOperation ? {
              operation_id: selectedOperation.operation_id,
              process_version_id: selectedOperation.process_version_id,
              etapas: stageDraft.map((stage, index) => ({ ...stage, orden: index + 1, subetapas: stage.subetapas.map((child, childIndex) => ({ ...child, orden: childIndex + 1, subetapas: [] })) })),
            } : {}),
          };
          const response = editingMachine ? await updateMachine(editingMachine.id, payload) : await createMachine(payload);
          const savedMachine = response?.data || null;
          if (savedMachine?.id) setCurrentMachine(savedMachine.id);
          if (contract?.processId) setCurrentProcess(contract.processId);
          setCurrentContract(contractId || null);
          setModalAlert(editingMachine ? "Máquina actualizada." : "Máquina creada.", "success");
          setModalVisible(false);
          await refreshCatalog();
        } catch (error) {
          setModalAlert(error.message, "danger");
        }
      });
    },
  };
}
