import { createMachine, fetchMachineContext, updateMachine } from "../../api/operational.js";
import { findMachine, findContract, getMachines, getContracts } from "../../core/operational.js";
import { setCurrentMachine } from "../../core/state.js";
import { readHashParams } from "../../core/bpm.js";
import { escapeHtml } from "../../core/utils.js";
import { bindHomeShell, createHomeShell } from "../bpm/shell.js";
import { renderDetailHeader } from "../../components/bpm-page.js";
import { mountStructuredEditors, readStructuredEditor, structuredEditorMarkup } from "../../components/json-editor.js";
import { stageEditorMarkup, stageDraftFromMachine } from "../../components/machine-stages.js";

const JSON_FIELDS = { "machine-page-type-capacity": "nominal_capacity", "machine-page-type-controls": "control_systems", "machine-page-type-limitations": "common_limitations", "machine-page-type-characteristics": "common_technical_characteristics", "machine-page-specific-characteristics": "specific_characteristics", "machine-page-specific-parameters": "specific_parameters", "machine-page-specific-ranges": "specific_operating_ranges", "machine-page-specific-limitations": "specific_limitations", "machine-page-specific-instructions": "specific_instructions", "machine-page-specific-differences": "differences_from_machine_type" };

function field(id, label, value = "", type = "text", extra = "") {
  const content = type === "json" ? structuredEditorMarkup(JSON_FIELDS[id] || id, value, { id }) : type === "textarea" ? `<textarea id="${id}" class="w-full min-h-20 border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm" ${extra}>${escapeHtml(value || "")}</textarea>` : `<input id="${id}" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm" type="${type}" value="${escapeHtml(value || "")}" ${extra}>`;
  return `<label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">${label}</span>${content}</label>`;
}

function buildMachineMarkup(machine, context, state, isNew = false) {
  const type = context?.machine_type || {}; const current = context?.machine || machine || {};
  const contracts = getContracts(state); const stages = stageDraftFromMachine({ ...(machine || {}), ...current }); const contractId = current.contract_id || current.contractId || machine?.contract_id || machine?.contractId || "";
  return `<div class="max-w-5xl mx-auto space-y-xl">${renderDetailHeader({ eyebrow: "Ficha operativa", title: isNew ? "Nueva máquina" : (current.name || current.nombre || "Máquina"), description: "Información completa editable de la máquina.", backHref: "#/maquinas", backLabel: "Volver a máquinas" })}<div id="machine-detail-alert" class="hidden rounded-lg border px-md py-sm text-[12px]" role="status" aria-live="polite"></div><form id="machine-detail-form" class="space-y-lg" novalidate><div class="border-b border-outline-variant" role="tablist" aria-label="Tipo de máquina"><button type="button" role="tab" id="machine-page-tab-type" aria-controls="machine-page-panel-type" aria-selected="true" tabindex="0" data-machine-page-tab="type" class="px-md py-sm text-label-md font-label-md text-primary border-b-2 border-primary">Máquina genérica</button><button type="button" role="tab" id="machine-page-tab-specific" aria-controls="machine-page-panel-specific" aria-selected="false" tabindex="-1" data-machine-page-tab="specific" class="px-md py-sm text-label-md font-label-md text-secondary">Máquina específica</button></div><section id="machine-page-panel-type" role="tabpanel" aria-labelledby="machine-page-tab-type" data-machine-page-panel="type" class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-lg"><div><h2 class="font-headline-sm text-headline-sm text-primary">Máquina genérica</h2></div><div class="grid grid-cols-1 md:grid-cols-2 gap-md">${field("machine-page-type-name", "Nombre tipo", type.name || type.nombre)}${field("machine-page-type-technology", "Descripción técnica / tecnología", type.technology_description)}${field("machine-page-type-principle", "Principio de funcionamiento", type.operating_principle, "textarea", "required")}${field("machine-page-type-general-description", "Descripción técnica general", type.general_technical_description, "textarea", "required")}${field("machine-page-type-capacity", "Capacidad nominal", type.nominal_capacity, "json")}${field("machine-page-type-controls", "Sistemas de control", type.control_systems, "json")}${field("machine-page-type-limitations", "Limitaciones comunes", type.common_limitations, "json")}${field("machine-page-type-characteristics", "Campos soportados / características comunes", type.common_technical_characteristics, "json")}</div></section><section id="machine-page-panel-specific" role="tabpanel" aria-labelledby="machine-page-tab-specific" data-machine-page-panel="specific" hidden class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-lg"><div><h2 class="font-headline-sm text-headline-sm text-primary">Máquina específica</h2></div><div class="grid grid-cols-1 md:grid-cols-2 gap-md">${field("machine-page-name", "Nombre", current.nombre || current.name, "text", "required")}${field("machine-page-specific-description", "Descripción específica", current.specific_description, "textarea")}${field("machine-page-specific-characteristics", "Características", current.specific_characteristics, "json")}${field("machine-page-specific-parameters", "Parámetros", current.specific_parameters, "json")}${field("machine-page-specific-ranges", "Rangos", current.specific_operating_ranges, "json")}${field("machine-page-specific-limitations", "Limitaciones específicas", current.specific_limitations, "json")}${field("machine-page-specific-instructions", "Instrucciones", current.specific_instructions, "json")}${field("machine-page-specific-differences", "Diferencias frente al tipo", current.differences_from_machine_type, "json")}<label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Contrato (contexto separado)</span><select id="machine-page-contract" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm"><option value="">Sin contrato</option>${contracts.map((item) => `<option value="${escapeHtml(item.id)}"${String(item.id) === String(contractId) ? " selected" : ""}>${escapeHtml(item.name || item.nombre || "Contrato")}</option>`).join("")}</select></label></div></section><section class="rounded-lg border border-primary/20 bg-primary/5 p-md space-y-sm"><div class="flex items-center justify-between gap-sm"><div><h3 class="font-label-md text-primary">Etapas de la operación BPM</h3><p class="text-[11px] text-on-surface-variant">Añade etapas y subetapas directas de la operación BPM.</p></div><button type="button" class="px-sm py-xs bg-primary text-on-primary rounded" data-stage-add>+ Añadir etapa</button></div><div class="space-y-sm" id="machine-page-stages-list">${stageEditorMarkup(stages)}</div></section><div class="flex justify-end"><button type="submit" id="machine-page-save" class="px-lg py-sm bg-primary text-on-primary text-label-md font-label-md rounded">${isNew ? "Crear máquina" : "Guardar cambios"}</button></div></form></div>`;
}

function readJsonInputs(root) {
  return Object.entries(JSON_FIELDS).reduce((result, [id, key]) => {
    const editor = root.querySelector(`#${id}`)?.closest("[data-json-editor]") || root.querySelector(`[data-json-editor="${key}"]`);
    const checked = readStructuredEditor(editor);
    if (checked.errors.length) throw new Error(checked.errors[0].message);
    result[key] = checked.value;
    return result;
  }, {});
}

function buildMachinePayload(root, machine, context, currentState, stages) {
  const json = readJsonInputs(root); const selectedOperation = machine?.operations?.find((item) => item.operation_id === machine.selectedOperationId) || machine?.operations?.[0]; const contract = findContract(currentState, root.querySelector("#machine-page-contract").value);
  return { name: root.querySelector("#machine-page-name").value, contractId: root.querySelector("#machine-page-contract").value, processId: contract?.processId || "", machine_type: { id: context.machine_type?.id, name: root.querySelector("#machine-page-type-name").value, technology_description: root.querySelector("#machine-page-type-technology").value, operating_principle: root.querySelector("#machine-page-type-principle").value, general_technical_description: root.querySelector("#machine-page-type-general-description").value, nominal_capacity: json.nominal_capacity, control_systems: json.control_systems, common_limitations: json.common_limitations, common_technical_characteristics: json.common_technical_characteristics }, specific_description: root.querySelector("#machine-page-specific-description").value, specific_characteristics: json.specific_characteristics, specific_parameters: json.specific_parameters, specific_operating_ranges: json.specific_operating_ranges, specific_limitations: json.specific_limitations, specific_instructions: json.specific_instructions, differences_from_machine_type: json.differences_from_machine_type, ...(selectedOperation ? { operation_id: selectedOperation.operation_id, process_id: selectedOperation.process_id, etapas: stages } : {}) };
}

function renderMachineStatus(root, message, error = false) { const alert = root.querySelector("#machine-detail-alert"); alert.textContent = message; alert.className = `rounded-lg border px-md py-sm text-[12px] ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`; }
function bindStageEvents(root, draft) {
  const list = root.querySelector("#machine-page-stages-list");
  const normalize = () => draft.forEach((stage, index) => { stage.orden = index + 1; stage.subetapas.forEach((child, childIndex) => { child.orden = childIndex + 1; }); });
  const render = () => { normalize(); if (list) list.innerHTML = stageEditorMarkup(draft); };
  root.querySelector("[data-stage-add]")?.addEventListener("click", () => { draft.push({ id: `stage-${Date.now()}`, nombre: "", orden: draft.length + 1, subetapas: [] }); render(); list?.querySelector("[data-stage-index]:last-child [data-stage-name]")?.focus(); });
  list?.addEventListener("input", (event) => { const node = event.target.closest("[data-stage-index]"); if (!node) return; const index = Number(node.dataset.stageIndex); if (event.target.matches("[data-stage-name]")) draft[index].nombre = event.target.value; if (event.target.matches("[data-substage-name]")) draft[index].subetapas[Number(event.target.closest("[data-substage-index]").dataset.substageIndex)].nombre = event.target.value; });
  list?.addEventListener("click", (event) => {
    const node = event.target.closest("[data-stage-index]"); if (!node) return;
    const index = Number(node.dataset.stageIndex); let changed = false;
    if (event.target.closest("[data-stage-delete]")) { draft.splice(index, 1); changed = true; }
    const move = event.target.closest("[data-stage-move]")?.dataset.stageMove;
    if (move) { const target = move === "up" ? index - 1 : index + 1; if (target >= 0 && target < draft.length) { [draft[index], draft[target]] = [draft[target], draft[index]]; changed = true; } }
    if (event.target.closest("[data-stage-add-substage]")) { draft[index].subetapas.push({ id: `${draft[index].id}-substage-${Date.now()}`, nombre: "", orden: draft[index].subetapas.length + 1, subetapas: [] }); changed = true; }
    const childNode = event.target.closest("[data-substage-index]"); const childIndex = childNode ? Number(childNode.dataset.substageIndex) : -1;
    if (event.target.closest("[data-substage-delete]")) { draft[index].subetapas.splice(childIndex, 1); changed = true; }
    const childMove = event.target.closest("[data-substage-move]")?.dataset.substageMove;
    if (childMove) { const children = draft[index].subetapas; const target = childMove === "up" ? childIndex - 1 : childIndex + 1; if (target >= 0 && target < children.length) { [children[childIndex], children[target]] = [children[target], children[childIndex]]; changed = true; } }
    if (changed) render();
  });
}
async function saveMachine(root, machine, context, currentState, stages) { const save = root.querySelector("#machine-page-save"); save.disabled = true; try { const payload = buildMachinePayload(root, machine, context, currentState, stages); const response = machine ? await updateMachine(machine.id, payload) : await createMachine(payload); if (response?.data?.id) setCurrentMachine(response.data.id); renderMachineStatus(root, machine ? "Máquina actualizada." : "Máquina creada."); } catch (error) { renderMachineStatus(root, error.message, true); } finally { save.disabled = false; } }
function bindMachineEvents(root, machine, context, currentState, stages) {
  mountStructuredEditors(root);
  root.querySelector("#machine-detail-form")?.addEventListener("submit", async (event) => { event.preventDefault(); if (!event.currentTarget.reportValidity()) return; await saveMachine(root, machine, context, currentState, stages); });
  const tabs = [...root.querySelectorAll("[data-machine-page-tab]")];
  tabs.forEach((tab) => { tab.innerHTML = `<span role="heading" aria-level="2">${escapeHtml(tab.textContent)}</span>`; });
  const selectTab = (active, focus = false) => {
    tabs.forEach((node, index) => {
      const selected = node.dataset.machinePageTab === active;
      node.setAttribute("aria-selected", String(selected));
      node.tabIndex = selected ? 0 : -1;
      node.classList.toggle("border-primary", selected);
      node.classList.toggle("text-primary", selected);
      node.classList.toggle("border-transparent", !selected);
      node.classList.toggle("text-secondary", !selected);
      const panel = root.querySelector(`[data-machine-page-panel="${node.dataset.machinePageTab}"]`);
          // Equivalent to the legacy `panel.hidden = !selected` contract,
          // expressed from the active tab so both panels stay mutually exclusive.
          if (panel) panel.hidden = panel.dataset.machinePagePanel !== active;
      if (selected && focus) node.focus();
    });
  };
  tabs.forEach((tab, index) => {
    tab.classList.add("focus-visible:ring-2", "focus-visible:ring-primary");
    tab.addEventListener("click", () => selectTab(tab.dataset.machinePageTab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(tabs[next].dataset.machinePageTab, true);
    });
  });
  selectTab(tabs[0]?.dataset.machinePageTab || "type");
  bindStageEvents(root, stages);
}
function renderMachineSidebar(root, context, machine) { const current = context?.machine || machine || {}; root.innerHTML = `<div class="p-lg border-b border-outline-variant bg-surface-container-low"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Máquina seleccionada</p><h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(current.name || current.nombre || "Sin nombre")}</h2><p class="text-[12px] text-on-surface-variant mt-sm">Detalle completo del activo operativo.</p></div><div class="p-lg"><p class="text-[12px] text-on-surface-variant">${escapeHtml(context?.operation?.name || "Sin operación BPM")}</p></div>`; }
async function loadMachineContext(machine) { const response = await fetchMachineContext(machine.id); return response?.data || {}; }

export function renderMaquinasDetalle(state) {
  const { root, mainSlot, rightSlot } = createHomeShell(state, { rightWidthClass: "w-[560px]" }); mainSlot.innerHTML = '<div class="max-w-5xl mx-auto"><p class="text-secondary">Cargando máquina…</p></div>';
  return { shellMode: "full", main: root, afterMount: async (mountRoot, currentState) => { bindHomeShell(mountRoot); const query = readHashParams(); const id = query.get("machine_id"); const isNew = query.get("new") === "1"; const machine = findMachine(currentState, id) || getMachines(currentState).find((item) => String(item.id) === String(id)); const main = mountRoot.querySelector("[data-shell-main]"); const sidebar = mountRoot.querySelector("[data-shell-right]"); if (!machine && !isNew) { main.innerHTML = '<div class="max-w-5xl mx-auto"><p class="text-red-700">No se encontró la máquina solicitada.</p></div>'; return; } setCurrentMachine(machine?.id || null); try { const context = machine ? await loadMachineContext(machine) : {}; main.innerHTML = buildMachineMarkup(machine, context, currentState, isNew); renderMachineSidebar(sidebar, context, machine || {}); const stages = stageDraftFromMachine({ ...(machine || {}), ...(context.machine || {}) }); bindMachineEvents(mountRoot, machine, context, currentState, stages); } catch (error) { main.innerHTML = `<div class="max-w-5xl mx-auto"><p class="text-red-700">${escapeHtml(error.message)}</p></div>`; } } };
}
