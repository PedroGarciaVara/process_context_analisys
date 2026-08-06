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
import { createElement, escapeHtml, toHashRoute } from "../core/utils.js";
import { createMachine, fetchMachineContext, updateMachine } from "../api/operational.js";

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
    state.currentOperation || null,
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

function structuredText(value) {
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function stageDraftFromMachine(activeMachine) {
  const selected = activeMachine?.operations?.find((item) => item.operation_id === activeMachine.selectedOperationId)
    || activeMachine?.operations?.[0];
  return (selected?.etapas || []).map((stage, index) => ({
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
}

function stageEditorMarkup(stages) {
  if (!stages.length) return '<p class="text-[12px] text-on-surface-variant" data-stage-empty>Sin etapas definidas.</p>';
  return stages.map((stage, index) => `
    <div class="rounded-lg border border-outline-variant p-sm space-y-sm" data-stage-index="${index}">
      <div class="flex gap-sm items-center">
        <input class="flex-1 border border-outline rounded p-sm bg-surface-container-low" data-stage-name value="${escapeHtml(stage.nombre)}" aria-label="Nombre etapa ${index + 1}">
        <button type="button" class="px-sm py-xs border border-outline rounded" data-stage-move="up" aria-label="Subir etapa">↑</button>
        <button type="button" class="px-sm py-xs border border-outline rounded" data-stage-move="down" aria-label="Bajar etapa">↓</button>
        <button type="button" class="px-sm py-xs border border-outline rounded" data-stage-add-substage>Añadir subetapa</button>
        <button type="button" class="px-sm py-xs text-red-700 border border-red-200 rounded" data-stage-delete>Eliminar</button>
      </div>
      <div class="ml-lg space-y-xs" data-substages>
        ${stage.subetapas.map((child, childIndex) => `<div class="flex gap-sm items-center" data-substage-index="${childIndex}"><span class="text-[11px] text-on-surface-variant">↳</span><input class="flex-1 border border-outline rounded p-sm bg-surface-container-low" data-substage-name value="${escapeHtml(child.nombre)}" aria-label="Nombre subetapa ${index + 1}.${childIndex + 1}"><button type="button" class="px-sm py-xs border border-outline rounded" data-substage-move="up" aria-label="Subir subetapa">↑</button><button type="button" class="px-sm py-xs border border-outline rounded" data-substage-move="down" aria-label="Bajar subetapa">↓</button><button type="button" class="px-sm py-xs text-red-700" data-substage-delete>Eliminar</button></div>`).join("")}
      </div>
    </div>`).join("");
}

function stagePathsMarkup(activeMachine) {
  const operation = activeMachine?.operations?.find((item) => item.operation_id === activeMachine.selectedOperationId) || activeMachine?.operations?.[0];
  const stages = operation?.etapas || [];
  if (!stages.length) return '<p class="text-[12px] text-on-surface-variant">Sin etapas definidas.</p>';
  return stages.flatMap((stage) => (stage.subetapas?.length ? stage.subetapas.map((child) => `<div class="text-[12px] text-primary">${escapeHtml(stage.nombre)} › ${escapeHtml(child.nombre)}</div>`) : [`<div class="text-[12px] text-primary">${escapeHtml(stage.nombre)}</div>`])).join("");
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
      ${inputType === "textarea"
        ? `<textarea id="${id}" class="w-full min-h-20 border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" ${extra}>${escapeHtml(value)}</textarea>`
        : `<input id="${id}" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="${inputType}" value="${escapeHtml(value)}" ${extra}>`}
    </label>`;
  return `
    <div id="machine-v02-modal" class="hidden fixed inset-0 z-[100] items-center justify-center bg-black/40 p-lg" role="dialog" aria-modal="true" aria-labelledby="machine-v02-modal-title">
      <div class="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-surface-container-lowest shadow-2xl border border-outline-variant">
        <div class="flex items-start justify-between gap-lg p-lg border-b border-outline-variant">
          <div><p class="font-label-md text-label-md text-primary uppercase tracking-widest">Gestión de máquina</p><h2 id="machine-v02-modal-title" class="font-headline-md text-headline-md text-primary">${activeMachine ? "Editar máquina" : "Nueva máquina"}</h2><p class="text-[12px] text-on-surface-variant mt-xs">El contrato y la operación BPM se mantienen como contexto separado.</p></div>
          <button type="button" class="p-sm rounded-full hover:bg-surface-container" aria-label="Cerrar gestión de máquina" data-action="machine-modal-close">✕</button>
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
            ${field("machine-v02-type-capacity", "Capacidad nominal (JSON)", structuredText(type.nominal_capacity), "textarea")}
            ${field("machine-v02-type-controls", "Sistemas de control (JSON)", structuredText(type.control_systems), "textarea")}
            ${field("machine-v02-type-limitations", "Limitaciones comunes (JSON)", structuredText(type.common_limitations), "textarea")}
            ${field("machine-v02-type-characteristics", "Campos soportados / características comunes (JSON)", structuredText(type.common_technical_characteristics), "textarea")}
          </section>
          <section id="machine-v02-panel-machine" role="tabpanel" data-machine-panel="machine" class="hidden grid grid-cols-1 md:grid-cols-2 gap-md">
            ${field("machine-v02-name-field", "Nombre", machine.nombre || machine.name || "", "text", "required")}
            <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Estado operativo</span><select id="machine-v02-status-field" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm"><option value="unknown">Desconocido</option>${["ready", "running", "stopped", "degraded", "unavailable"].map((value) => `<option value="${value}"${String(machine.operational_status || "unknown") === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>
            ${field("machine-v02-specific-description", "Descripción específica", machine.specific_description || "", "textarea")}
            ${field("machine-v02-specific-characteristics", "Características (JSON)", structuredText(machine.specific_characteristics), "textarea")}
            ${field("machine-v02-specific-parameters", "Parámetros (JSON)", structuredText(machine.specific_parameters), "textarea")}
            ${field("machine-v02-specific-ranges", "Rangos (JSON)", structuredText(machine.specific_operating_ranges), "textarea")}
            ${field("machine-v02-specific-limitations", "Limitaciones (JSON)", structuredText(machine.specific_limitations), "textarea")}
            ${field("machine-v02-specific-instructions", "Instrucciones (JSON)", structuredText(machine.specific_instructions), "textarea")}
            ${field("machine-v02-specific-differences", "Diferencias frente al tipo (JSON/texto)", structuredText(machine.differences_from_machine_type), "textarea")}
            <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Contrato (contexto separado)</span><select id="machine-v02-contract-field" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm"><option value="">Sin contrato</option>${contracts.map((item) => `<option value="${escapeHtml(item.id)}"${String(machine.contract_id || machine.contractId || "") === String(item.id) ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
            <div class="md:col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-md space-y-sm" data-stage-editor>
              <div class="flex items-center justify-between gap-sm"><div><h3 class="font-label-md text-primary">Etapas</h3><p class="text-[11px] text-on-surface-variant">${hasOperation ? "Añade etapas y subetapas directas de la operación BPM." : "Selecciona una operación BPM para editar etapas."}</p></div><button type="button" class="px-sm py-xs bg-primary text-on-primary rounded" data-stage-add ${hasOperation ? "" : "disabled"}>+ Añadir etapa</button></div>
              <div class="space-y-sm" id="machine-v02-stages-list">${stageEditorMarkup(stageDraft)}</div>
            </div>
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
  const status = String(activeMachine?.status || "hold").toLowerCase();
  const process = activeMachine ? findProcess(state, activeMachine.processId) : null;
  const contract = activeMachine ? findContract(state, activeMachine.contractId) : null;
  const score = healthScore(status);

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
        <div>
          <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Identidades canónicas</h4>
          <div class="space-y-sm p-md rounded-lg border border-primary/20 bg-primary/5">
            <div class="flex justify-between gap-md font-body-sm text-body-sm">
              <span class="text-on-surface-variant">operation_id</span>
              <span class="font-mono-sm text-primary text-right break-all">${escapeHtml(activeMachine?.selectedOperationId || "—")}</span>
            </div>
            <div class="flex justify-between gap-md font-body-sm text-body-sm">
              <span class="text-on-surface-variant">process_version_id</span>
              <span class="font-mono-sm text-primary text-right break-all">${escapeHtml(activeMachine?.selectedProcessVersionId || "—")}</span>
            </div>
            <div class="flex justify-between gap-md font-body-sm text-body-sm">
              <span class="text-on-surface-variant">process_id BPM</span>
              <span class="font-mono-sm text-primary text-right break-all">${escapeHtml(activeMachine?.selectedBpmProcessId || "—")}</span>
            </div>
            <div class="flex justify-between gap-md font-body-sm text-body-sm">
              <span class="text-on-surface-variant">contract_id</span>
              <span class="font-mono-sm text-primary text-right">${escapeHtml(activeMachine?.selectedOperationContractId ?? activeMachine?.contractId ?? "—")}</span>
            </div>
          </div>
        </div>
        <div id="machine-v02-context-blocks" class="space-y-sm" aria-live="polite">
          <p class="text-[12px] text-on-surface-variant">Selecciona una máquina para cargar el contexto canónico.</p>
        </div>
        <div class="border-t border-outline-variant pt-lg"><h4 class="font-label-md text-on-surface-variant uppercase mb-sm">Etapas de la operación</h4><div id="machine-v02-stage-detail" class="space-y-xs">${stagePathsMarkup(activeMachine)}</div></div>
        <div class="space-y-sm pt-md">
          <button type="button" class="w-full py-md border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg flex items-center justify-center gap-md hover:bg-surface-container" data-action="machine-open-contract" ${activeMachine ? "" : "disabled"}>
            <span class="material-symbols-outlined">description</span>
            Abrir contexto de contrato
          </button>
        </div>
        <div class="border-t border-outline-variant pt-lg space-y-md">
          <button type="button" class="w-full py-md bg-primary text-on-primary rounded-lg font-label-md" data-action="machine-modal-open">Gestionar máquina</button>
        </div>
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
                  Revisa la capa operativa de maquinas, filtra por operación BPM y proceso, y mantiene el detalle del activo visible a la derecha mientras decides el siguiente paso del RCA.
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
                <label class="font-label-md text-label-md text-secondary" for="machine-v02-operation">Operación BPM</label>
                <select id="machine-v02-operation" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
                  ${buildOptions(operations, state.currentOperation, "Todas las operaciones BPM")}
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
          block("Operación BPM", operation ? `${operation.name || "Sin nombre"} · operation_id ${operation.operation_id} · versión ${operation.process_version_id}\nprocess_id ${operation.process_id || "—"}` : "Sin configuración de operación"),
          block("Tipo de máquina", type?.name ? `${type.name} · machine_type_id ${type.id || "—"}\n${type.general_technical_description || ""}` : "Sin tipo de máquina"),
          block("Máquina específica", machine ? `${machine.nombre || machine.name || "Sin nombre"} · machine_id ${machine.machine_id || machine.id || "—"}\nEstado: ${machine.operational_status || "unknown"}` : "Sin detalle de máquina"),
          block("Configuración máquina–operación", configuration ? `${configuration.specific_description || "Sin descripción"}\ncontract_id: ${configuration.contract_id || "—"}\nValidación: ${configuration.validation_status || "draft"}` : "No existe configuración para esta operación"),
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
      const activeMachine = currentMachine();
      const populateManagementModal = (context) => {
        if (!managementModal || !context) return;
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
        setValue("machine-v02-status-field", machine.operational_status || "unknown");
        setValue("machine-v02-specific-description", machine.specific_description);
        setValue("machine-v02-specific-characteristics", machine.specific_characteristics);
        setValue("machine-v02-specific-parameters", machine.specific_parameters);
        setValue("machine-v02-specific-ranges", machine.specific_operating_ranges);
        setValue("machine-v02-specific-limitations", machine.specific_limitations);
        setValue("machine-v02-specific-instructions", machine.specific_instructions);
        setValue("machine-v02-specific-differences", machine.differences_from_machine_type);
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
        managementModal.querySelectorAll("[data-machine-tab]").forEach((node) => {
          const selected = node.getAttribute("data-machine-tab") === tab;
          node.setAttribute("aria-selected", String(selected));
          node.classList.toggle("border-primary", selected);
          node.classList.toggle("text-primary", selected);
          node.classList.toggle("border-transparent", !selected);
          node.classList.toggle("text-on-surface-variant", !selected);
        });
        managementModal.querySelectorAll("[data-machine-panel]").forEach((node) => {
          node.classList.toggle("hidden", node.getAttribute("data-machine-panel") !== tab);
        });
      };
      mountRoot.querySelector("[data-action='machine-modal-open']")?.addEventListener("click", () => {
        setModalVisible(true);
        const machine = currentMachine();
        if (machine) fetchMachineContext(machine.id).then((response) => populateManagementModal(response?.data)).catch(() => {});
      });
      mountRoot.querySelectorAll("[data-action='machine-modal-close'], [data-action='machine-modal-cancel']").forEach((node) => {
        node.addEventListener("click", () => setModalVisible(false));
      });
      managementModal?.querySelectorAll("[data-machine-tab]").forEach((node) => {
        node.addEventListener("click", () => setModalTab(node.getAttribute("data-machine-tab") || "type"));
      });
      managementModal?.addEventListener("click", (event) => {
        if (event.target === managementModal) setModalVisible(false);
      });

      const parseModalJson = (id, label) => {
        const value = managementModal?.querySelector(`#${id}`)?.value?.trim() || "";
        if (!value) return null;
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed !== "object" || parsed === null) throw new Error("debe ser un objeto o una lista");
          return parsed;
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
          const selectedOperation = activeMachine?.operations?.find((item) => item.operation_id === activeMachine.selectedOperationId) || activeMachine?.operations?.[0];
          const payload = {
            name: machineName,
            contractId,
            processId: contract?.processId || "",
            operational_status: managementModal.querySelector("#machine-v02-status-field")?.value || "unknown",
            machine_type: {
              id: activeMachine?.machineContext?.machine_type?.id,
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
          const response = activeMachine ? await updateMachine(activeMachine.id, payload) : await createMachine(payload);
          const savedMachine = response?.data || null;
          if (savedMachine?.id) setCurrentMachine(savedMachine.id);
          if (contract?.processId) setCurrentProcess(contract.processId);
          setCurrentContract(contractId || null);
          setModalAlert(activeMachine ? "Machine updated." : "Machine created.", "success");
          setModalVisible(false);
          await refreshCatalog();
        } catch (error) {
          setModalAlert(error.message, "danger");
        }
      });
    },
  };
}
