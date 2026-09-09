import { getNodeMetadata, getProcess, updateNode, updateNodeMetadata, updateOperationStages } from "../../api/process-modeling.js";
import { findProcess, getProcesses } from "../../core/operational.js";
import { escapeHtml } from "../../core/utils.js";
import { readHashParams, normalizeProcessPayload } from "../../core/bpm.js";
import { bindHomeShell, createHomeShell } from "./shell.js";
import { operationFormBody, readOperationForm } from "./operacion_form.js";
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
      if (right) right.innerHTML = `<div class="p-lg"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Operación seleccionada</p><h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(operation.name)}</h2><p class="text-[12px] text-on-surface-variant mt-sm">${escapeHtml(operation.process?.name || "Proceso BPM")}</p></div>`;
      const form = mountRoot.querySelector("#operation-detail-form");
      const alert = mountRoot.querySelector("#operation-detail-alert");
      form?.addEventListener("submit", async (event) => { event.preventDefault(); if (!form.reportValidity()) return; const save = mountRoot.querySelector("#operation-detail-save"); try { save.disabled = true; save.textContent = "Guardando…"; await saveOperation(operation, form); alert.textContent = "Operación actualizada."; alert.className = "rounded-lg border px-md py-sm text-[12px] border-green-200 bg-green-50 text-green-700"; save.disabled = false; save.textContent = "Guardar cambios"; } catch (error) { alert.textContent = error.message; alert.className = "rounded-lg border px-md py-sm text-[12px] border-red-200 bg-red-50 text-red-700"; save.disabled = false; save.textContent = "Guardar cambios"; } });
    }).catch((error) => { if (main) main.innerHTML = `<div class="max-w-5xl mx-auto"><p class="text-red-700">${escapeHtml(error.message)}</p></div>`; });
  } };
}

export { saveOperation };
