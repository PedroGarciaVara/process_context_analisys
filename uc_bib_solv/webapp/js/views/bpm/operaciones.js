import { getProcess } from "../../api/process-modeling.js";
import { findProcess, getProcesses } from "../../core/operational.js";
import { setCurrentProcess } from "../../core/state.js";
import { escapeHtml } from "../../core/utils.js";
import { bindHomeShell, createHomeShell } from "./shell.js";
import { renderBpmOperationDetailButton } from "../../components/bpm-page.js";

function currentProcess(state) {
  return state.currentProcess ? findProcess(state, state.currentProcess) : getProcesses(state)[0];
}

function page(state, process, operations) {
  const processes = getProcesses(state);
  return `<div class="max-w-6xl mx-auto space-y-xl"><div class="flex items-end justify-between gap-lg flex-wrap"><div><span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de operaciones</span><h1 class="font-display-lg text-display-lg text-on-background">Operaciones</h1><p class="font-body-md text-body-md text-secondary">Consulta y edita las operaciones del proceso BPM seleccionado.</p></div><a href="#/procesos" class="px-md py-sm border border-outline-variant rounded text-label-md">Volver a procesos</a></div><section class="grid grid-cols-1 md:grid-cols-2 gap-lg"><div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl"><p class="text-on-surface-variant text-label-md">Operaciones visibles</p><h3 class="font-display-lg text-display-lg text-primary">${operations.length}</h3></div><div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl"><p class="text-on-surface-variant text-label-md">Proceso BPM</p><h3 class="font-headline-md text-headline-md text-primary">${escapeHtml(process?.name || "—")}</h3></div></section><section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg"><label class="grid gap-xs"><span class="text-label-md text-secondary">Proceso BPM</span><select id="operation-process-filter" class="border border-outline rounded p-sm">${processes.map((item) => `<option value="${escapeHtml(item.id || item.process_id)}"${String(item.id || item.process_id) === String(process?.process_id) ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label></section><section class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden"><table class="w-full text-left border-collapse"><thead class="bg-surface-container-low border-b border-outline-variant"><tr><th class="px-lg py-md text-label-md text-secondary">Código</th><th class="px-lg py-md text-label-md text-secondary">Operación</th><th class="px-lg py-md text-label-md text-secondary">Descripción</th><th class="px-lg py-md text-label-md text-secondary text-right">Acciones</th></tr></thead><tbody class="divide-y divide-outline-variant">${operations.length ? operations.map((item) => `<tr><td class="px-lg py-md">${escapeHtml(item.node_code || "—")}</td><td class="px-lg py-md text-primary">${escapeHtml(item.name || "—")}</td><td class="px-lg py-md text-secondary">${escapeHtml(item.description || "—")}</td><td class="px-lg py-md text-right">${renderBpmOperationDetailButton(item.node_id, process.process_id)}</td></tr>`).join("") : `<tr><td colspan="4" class="px-lg py-xl text-center text-secondary">No hay operaciones en este proceso BPM.</td></tr>`}</tbody></table></section></div>`;
}

export function renderOperaciones(state) {
  const { root, mainSlot, rightSlot } = createHomeShell(state);
  mainSlot.innerHTML = '<div class="max-w-6xl mx-auto"><p class="text-secondary">Cargando operaciones BPM…</p></div>';
  rightSlot.innerHTML = '<div class="p-lg border-b border-outline-variant bg-surface-container-low"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Contexto BPM</p><h2 class="font-headline-md text-headline-md text-primary mt-xs">Operaciones</h2><p class="font-body-sm text-body-sm text-on-surface-variant mt-sm">Selecciona una operación para consultar o editar su ficha.</p></div><div class="p-lg"><p class="text-[12px] text-on-surface-variant">El proceso seleccionado se conserva al cambiar de página.</p></div>';
  return { shellMode: "full", main: root, afterMount(mountRoot, currentState) {
    document.title = "Industrial RCA - Operaciones";
    bindHomeShell(mountRoot);
    const selected = currentProcess(currentState);
    if (!selected?.bpmProcessId) return;
    getProcess(selected.bpmProcessId).then((response) => {
      const process = response?.data || {};
      const operations = (process.nodes || []).filter((item) => item.node_type === "operation");
      const main = mountRoot.querySelector("[data-shell-main]");
      if (main) main.innerHTML = page(currentState, process, operations);
      const context = mountRoot.querySelector("[data-shell-right]");
      if (context) context.innerHTML = `<div class="p-lg border-b border-outline-variant bg-surface-container-low"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Proceso seleccionado</p><h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(process.name || "Sin nombre")}</h2><p class="font-body-sm text-body-sm text-on-surface-variant mt-sm">${operations.length} operaciones BPM disponibles.</p></div><div class="p-lg"><p class="text-[12px] text-on-surface-variant">Usa <strong>Detalle</strong> para abrir la ficha de una operación.</p></div>`;
      mountRoot.querySelector("#operation-process-filter")?.addEventListener("change", (event) => {
        setCurrentProcess(event.target.value || null);
        window.location.hash = "#/operaciones";
      });
    }).catch((error) => {
      const main = mountRoot.querySelector("[data-shell-main]");
      if (main) main.innerHTML = `<div class="max-w-6xl mx-auto text-red-700">${escapeHtml(error.message)}</div>`;
    });
  } };
}
