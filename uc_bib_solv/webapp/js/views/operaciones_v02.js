import { getProcess, getVersion } from "../api/process-modeling.js";
import { findProcess, getProcesses } from "../core/operational.js";
import { setCurrentProcess } from "../core/state.js";
import { normalizeVersionPayload } from "../core/bpm.js";
import { escapeHtml } from "../core/utils.js";
import { bindHomeShellV02, createHomeShellV02 } from "./shell_v02.js";
import { operationFormBody } from "./operacion_form.js";
import { renderBpmOperationDetailButton } from "../components/bpm-page.js";

function currentOperationalProcess(state) {
  return state.currentProcess ? findProcess(state, state.currentProcess) : getProcesses(state)[0];
}

function modal(operation) {
  return `<div id="operation-v02-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/40 p-lg" role="dialog" aria-modal="true" aria-labelledby="operation-v02-modal-title"><div class="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-surface-container-lowest border border-outline-variant p-lg shadow-xl"><div class="flex items-center justify-between gap-md mb-lg"><div><h2 id="operation-v02-modal-title" class="font-headline-md text-headline-md text-primary">Detalle de operación</h2><p class="text-[12px] text-secondary">Edición rápida de la ficha BPM.</p></div><button type="button" data-action="operation-modal-close" class="px-md py-sm border border-outline-variant rounded">Cerrar</button></div><div id="operation-modal-alert" class="hidden mb-md rounded-lg border px-md py-sm text-[12px]"></div><form id="operation-modal-form" novalidate>${operationFormBody(operation, { processName: operation.process?.name, versionLabel: `v${operation.version?.version_number || "—"}` })}<div class="flex justify-end gap-sm mt-lg"><button type="button" data-action="operation-modal-cancel" class="px-md py-sm border border-outline-variant rounded">Cancelar</button><button type="submit" class="px-lg py-sm bg-primary text-on-primary rounded" data-action="operation-modal-save">Guardar cambios</button></div></form></div></div>`;
}

function page(state, process, version, operations) {
  const selected = version?.version_id || "";
  const versions = process?._bpmVersions || [];
  const processes = getProcesses(state);
  return `<div class="max-w-6xl mx-auto space-y-xl"><div class="flex items-end justify-between gap-lg flex-wrap"><div><span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de operaciones</span><h1 class="font-display-lg text-display-lg text-on-background">Operaciones</h1><p class="font-body-md text-body-md text-secondary">Consulta y edita las operaciones del proceso BPM seleccionado.</p></div><a href="#/procesos_v02" class="px-md py-sm border border-outline-variant rounded text-label-md">Volver a procesos</a></div><section class="grid grid-cols-1 md:grid-cols-3 gap-lg"><div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl border-t-4 border-t-primary"><p class="text-on-surface-variant text-label-md">Operaciones visibles</p><h3 class="font-display-lg text-display-lg text-primary">${operations.length}</h3><p class="text-[12px] text-secondary mt-sm">Nodos de tipo operación de la versión seleccionada.</p></div><div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl border-t-4 border-t-primary"><p class="text-on-surface-variant text-label-md">Proceso BPM</p><h3 class="font-headline-md text-headline-md text-primary">${escapeHtml(process?.name || version?.process?.name || "—")}</h3></div><div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl border-t-4 border-t-primary"><p class="text-on-surface-variant text-label-md">Versión</p><h3 class="font-display-lg text-display-lg text-primary">${escapeHtml(String(version?.version_number || "—"))}</h3></div></section><section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg"><div class="flex items-end gap-lg flex-wrap"><label class="grid gap-xs flex-1 min-w-[240px]"><span class="text-label-md text-secondary">Proceso BPM</span><select id="operation-process-filter" class="border border-outline rounded p-sm">${processes.map((item) => `<option value="${escapeHtml(item.id)}"${String(item.id) === String(process?.id) ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label><label class="grid gap-xs min-w-[180px]"><span class="text-label-md text-secondary">Versión BPM</span><select id="operation-version-filter" class="border border-outline rounded p-sm">${versions.map((item) => `<option value="${escapeHtml(item.version_id)}"${String(item.version_id) === String(selected) ? " selected" : ""}>Versión ${escapeHtml(item.version_number)} · ${escapeHtml(item.status)}</option>`).join("")}</select></label></div></section><section class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"><table class="w-full text-left border-collapse"><thead class="bg-surface-container-low border-b border-outline-variant"><tr><th class="px-lg py-md text-label-md text-secondary">Código</th><th class="px-lg py-md text-label-md text-secondary">Operación</th><th class="px-lg py-md text-label-md text-secondary">Descripción</th><th class="px-lg py-md text-label-md text-secondary text-right">Acciones</th></tr></thead><tbody class="divide-y divide-outline-variant">${operations.length ? operations.map((item) => `<tr data-operation-row="${escapeHtml(item.node_id)}"><td class="px-lg py-md font-body-sm">${escapeHtml(item.node_code || "—")}</td><td class="px-lg py-md font-title-lg text-primary">${escapeHtml(item.name || "—")}</td><td class="px-lg py-md text-body-sm text-secondary">${escapeHtml(item.description || "—")}</td><td class="px-lg py-md text-right">${renderBpmOperationDetailButton(item.node_id, version.version_id)}</td></tr>`).join("") : `<tr><td colspan="4" class="px-lg py-xl text-center text-secondary">No hay operaciones en esta versión BPM.</td></tr>`}</tbody></table></section>${modal(operations[0] || { node_id: "", node_type: "operation", process: process, version: version })}</div>`;
}

export function renderOperacionesV02(state, bus) {
  const { root, mainSlot, rightSlot } = createHomeShellV02(state);
  mainSlot.innerHTML = '<div class="max-w-6xl mx-auto"><p class="text-secondary">Cargando operaciones BPM…</p></div>';
  rightSlot.innerHTML = "";
  return { shellMode: "full", main: root, afterMount(mountRoot, currentState, eventBus) {
    document.title = "Industrial RCA - Operaciones";
    bindHomeShellV02(mountRoot);
    const process = currentOperationalProcess(currentState);
    if (!process?.bpmProcessId) return;
    getProcess(process.bpmProcessId).then(async (processResponse) => {
      const bpm = processResponse?.data || {};
      const requestedVersion = new URLSearchParams(window.location.hash.split("?")[1] || "").get("version_id");
      const version = (bpm.versions || []).find((item) => String(item.version_id) === String(requestedVersion)) || (bpm.versions || []).find((item) => item.status === "draft") || (bpm.versions || [])[0];
      if (!version?.version_id) throw new Error("El proceso BPM no tiene versiones disponibles.");
      const versionResponse = await getVersion(version.version_id);
      const { data: versionData, version: resolvedVersion } = normalizeVersionPayload(versionResponse, version.version_id);
      const operations = (versionData.nodes || []).filter((item) => item.node_type === "operation").map((item) => ({ ...item, process: bpm, version: resolvedVersion }));
      const main = mountRoot.querySelector("[data-shell-main]");
      if (main) main.innerHTML = page(currentState, { ...process, _bpmVersions: bpm.versions || [] }, resolvedVersion, operations);
      mountRoot.querySelectorAll("[data-action='operation-detail']").forEach((button) => button.addEventListener("click", async () => {
        const versionId = button.dataset.versionId || "";
        const nodeId = button.dataset.nodeId || "";
        window.location.hash = `#/operaciones_detalle_v02?version_id=${encodeURIComponent(versionId)}&node_id=${encodeURIComponent(nodeId)}`;
      }));
      mountRoot.querySelector("#operation-version-filter")?.addEventListener("change", (event) => {
        window.location.hash = `#/operaciones_v02?version_id=${encodeURIComponent(event.target.value)}`;
      });
      mountRoot.querySelector("#operation-process-filter")?.addEventListener("change", (event) => {
        setCurrentProcess(event.target.value || null);
        window.location.hash = "#/operaciones_v02";
      });
    }).catch((error) => { const main = mountRoot.querySelector("[data-shell-main]"); if (main) main.innerHTML = `<div class="max-w-6xl mx-auto text-red-700">${escapeHtml(error.message)}</div>`; });
  } };
}
