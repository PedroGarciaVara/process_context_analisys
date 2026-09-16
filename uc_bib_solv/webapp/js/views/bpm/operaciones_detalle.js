import { getNodeMetadata, getProcess, updateNode, updateNodeMetadata, updateOperationStages, getOperationMachines, replaceOperationMachines } from "../../api/process-modeling.js";
import { getContracts, getMachines } from "../../core/operational.js";
import { escapeHtml } from "../../core/utils.js";
import { readHashParams, normalizeProcessPayload } from "../../core/bpm.js";
import { bindHomeShell, createHomeShell } from "./shell.js";
import { mountOperationForm, operationFormBody, readOperationForm } from "./operacion_form.js";
import { renderDetailHeader } from "../../components/bpm-page.js";

function params() { return readHashParams(); }

export async function loadOperationDetail(processId, nodeId) {
  const response = await getProcess(processId);
  const payload = normalizeProcessPayload(response);
  const node = (payload.nodes || []).find((item) => String(item.node_id) === String(nodeId));
  if (!node || node.node_type !== "operation") throw new Error("La selección no corresponde a una operación BPM.");
  const metadataResponse = await getNodeMetadata(nodeId).catch(() => ({ data: { metadata: node.metadata || {} } }));
  return { ...node, metadata: metadataResponse?.data?.metadata || node.metadata || {}, process: payload.process };
}

async function saveOperation(operation, form) {
  const data = readOperationForm(form);
  await updateNode(operation.node_id, { name: data.name, description: data.description });
  await updateNodeMetadata(operation.node_id, data.metadata);
  await updateOperationStages(operation.node_id, operation.process_id, data.stages);
  await replaceOperationMachines(operation.node_id, operation.process_id, [...(form._operationMachineState?.selectedIds || new Set())]);
}

async function mountOperationMachines(form, operation) {
  const target = form.querySelector("[data-operation-machines]");
  if (!target) return;
  target.innerHTML = '<p class="text-secondary" data-operation-machines-status>Cargando catálogo…</p>';
  const result = await getOperationMachines(operation.node_id, operation.process_id);
  const selectedIds = new Set((result?.data?.machineIds || result?.machineIds || []).map(Number));
  const machines = (result?.data?.catalog || result?.catalog || []).filter((machine) => Number.isFinite(Number(machine.id)));
  const byId = new Map(machines.map((machine) => [Number(machine.id), machine]));
  form._operationMachineState = { selectedIds, machines, byId };
  const render = () => {
    const state = form._operationMachineState;
    const selected = [...state.selectedIds].map((id) => state.byId.get(id)).filter(Boolean);
    target.innerHTML = `<div class="space-y-md"><label class="block space-y-xs" for="operation-machine-select"><span class="font-label-md text-label-md text-secondary">Catálogo de máquinas</span><select id="operation-machine-select" data-operation-machine-select class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm"><option value="">Selecciona una máquina…</option>${state.machines.map((machine) => { const id = Number(machine.id); return `<option value="${id}"${state.selectedIds.has(id) ? " disabled" : ""}>${escapeHtml(machine.name || `Máquina ${id}`)}</option>`; }).join("")}</select></label><button type="button" data-operation-machine-add class="inline-flex px-md py-sm bg-primary text-on-primary rounded text-label-md" aria-label="Seleccionar máquina">Seleccionar máquina</button><section class="border border-outline-variant rounded-lg p-md space-y-sm" data-operation-machine-selected aria-live="polite"><h3 class="font-label-md text-label-md text-secondary">Máquinas seleccionadas</h3>${selected.length ? `<ul class="space-y-xs">${selected.map((machine) => `<li class="flex items-center justify-between gap-sm" data-operation-machine-member="${Number(machine.id)}"><span>${escapeHtml(machine.name || `Máquina ${machine.id}`)}</span><button type="button" data-operation-machine-remove="${Number(machine.id)}" class="text-primary underline" aria-label="Eliminar ${escapeHtml(machine.name || `Máquina ${machine.id}`)}">Eliminar</button></li>`).join("")}</ul>` : '<p class="text-secondary" data-operation-machine-empty>No hay máquinas seleccionadas.</p>'}</section><span class="sr-only" data-operation-machine-live aria-live="polite"></span></div>`;
    const select = target.querySelector("[data-operation-machine-select]");
    target.querySelector("[data-operation-machine-add]")?.addEventListener("click", () => {
      const id = Number(select?.value);
      if (!state.byId.has(id) || state.selectedIds.has(id)) return;
      state.selectedIds.add(id);
      render();
      target.querySelector("[data-operation-machine-live]").textContent = "Máquina añadida.";
    });
    target.querySelectorAll("[data-operation-machine-remove]").forEach((button) => button.addEventListener("click", () => {
      state.selectedIds.delete(Number(button.dataset.operationMachineRemove));
      render();
      target.querySelector("[data-operation-machine-live]").textContent = "Máquina eliminada.";
    }));
  };
  render();
}

export function renderOperacionesDetalle(state, bus) {
  const { root, mainSlot, rightSlot } = createHomeShell(state, { rightWidthClass: "w-[560px]" });
  mainSlot.innerHTML = `<div class="max-w-5xl mx-auto"><p class="text-secondary">Cargando operación BPM…</p></div>`;
  rightSlot.innerHTML = "";
  return { shellMode: "full", main: root, afterMount(mountRoot, currentState, eventBus) {
    document.title = "Industrial RCA - Detalle de operación";
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    bindHomeShell(mountRoot);
    const query = params();
    const processId = query.get("process_id");
    const nodeId = query.get("node_id");
    const main = mountRoot.querySelector("[data-shell-main]");
    const right = mountRoot.querySelector("[data-shell-right]");
    if (!processId || !nodeId) { if (main) main.innerHTML = '<div class="max-w-5xl mx-auto"><p class="text-red-700">Faltan los identificadores de proceso y operación.</p></div>'; return; }
    loadOperationDetail(processId, nodeId).then((operation) => {
      if (main) main.innerHTML = `<div class="max-w-5xl mx-auto space-y-xl">${renderDetailHeader({ eyebrow: "Ficha de operación", title: operation.name, description: "Información editable de la operación BPM.", backHref: "#/operaciones", backLabel: "Volver a operaciones" })}<div id="operation-detail-alert" class="hidden rounded-lg border px-md py-sm text-[12px]"></div><form id="operation-detail-form" class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-lg" novalidate>${operationFormBody(operation, { processName: operation.process?.name })}<div class="flex justify-end gap-sm"><button type="submit" id="operation-detail-save" data-action="operation-detail-save" class="px-lg py-sm bg-primary text-on-primary text-label-md font-label-md rounded">Guardar cambios</button></div></form></div>`;
      const contracts = getContracts(currentState).filter((contract) => contract.scopeType === "operation" && String(contract.bpmNodeId) === String(operation.node_id));
      const machines = getMachines(currentState).filter((machine) => (machine.operations || []).some((item) => String(item.operation_id) === String(operation.node_id) && String(item.process_id) === String(operation.process_id)));
      if (right) right.innerHTML = `<div class="p-lg border-b border-outline-variant bg-surface-container-low"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Operación seleccionada</p><h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(operation.name)}</h2><p class="text-[12px] text-on-surface-variant mt-sm">${escapeHtml(operation.description || "Sin descripción")}</p></div><div class="p-lg space-y-lg"><a class="inline-flex w-full justify-center px-md py-sm bg-primary text-on-primary rounded text-label-md" href="#/studio-procesos?processId=${encodeURIComponent(operation.process_id)}&selectedNodeId=${encodeURIComponent(operation.node_id)}">Abrir flujo BPM</a><section><h3 class="font-label-md text-label-md text-secondary uppercase mb-sm">Contratos asignados</h3>${contracts.length ? contracts.map((contract) => `<a class="block text-primary underline text-sm" href="#/contratos_detalle?contract_id=${encodeURIComponent(contract.id)}">${escapeHtml(contract.name)}</a>`).join("") : `<p class="text-[12px] text-on-surface-variant">Sin contratos asignados.</p>`}</section><section><h3 class="font-label-md text-label-md text-secondary uppercase mb-sm">Máquinas asociadas</h3>${machines.length ? `<ul class="list-disc pl-lg text-sm">${machines.map((machine) => `<li>${escapeHtml(machine.name || "Sin nombre")}</li>`).join("")}</ul>` : `<p class="text-[12px] text-on-surface-variant">Sin máquinas asociadas.</p>`}</section></div>`;
      const form = mountRoot.querySelector("#operation-detail-form");
      const alert = mountRoot.querySelector("#operation-detail-alert");
      mountOperationForm(form, operation);
      mountOperationMachines(form, operation).catch((error) => { const target = form.querySelector("[data-operation-machines]"); if (target) target.innerHTML = `<p class="text-red-700" role="alert">No se pudo cargar el catálogo de máquinas: ${escapeHtml(error.message)}</p>`; });
      form?.addEventListener("submit", async (event) => { event.preventDefault(); if (!form.reportValidity()) return; const save = mountRoot.querySelector("#operation-detail-save"); try { save.disabled = true; save.textContent = "Guardando…"; await saveOperation(operation, form); alert.textContent = "Operación actualizada."; alert.className = "rounded-lg border px-md py-sm text-[12px] border-green-200 bg-green-50 text-green-700"; save.disabled = false; save.textContent = "Guardar cambios"; } catch (error) { alert.textContent = error.message; alert.className = "rounded-lg border px-md py-sm text-[12px] border-red-200 bg-red-50 text-red-700"; save.disabled = false; save.textContent = "Guardar cambios"; } });
    }).catch((error) => { if (main) main.innerHTML = `<div class="max-w-5xl mx-auto"><p class="text-red-700">${escapeHtml(error.message)}</p></div>`; });
  } };
}

export { saveOperation };
