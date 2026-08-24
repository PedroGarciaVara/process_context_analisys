import { findProcess, getProcesses } from "../core/operational.js";
import { setCurrentProcess } from "../core/state.js";
import { escapeHtml, toHashRoute } from "../core/utils.js";
import { getProcess, listProcesses, updateProcess } from "../api/process-modeling.js";
import { bindHomeShellV02, createHomeShellV02 } from "./shell_v02.js";
import { renderDetailHeader, renderPageAlert } from "../components/bpm-page.js";

function optionsForParents(processes, currentId, selectedId) {
  return ['<option value="">Sin proceso padre</option>', ...processes
    .filter((item) => String(item.process_id) !== String(currentId))
    .map((item) => `<option value="${escapeHtml(item.process_id)}"${String(item.process_id) === String(selectedId || "") ? " selected" : ""}>${escapeHtml(item.process_code)} — ${escapeHtml(item.name)}</option>`)]
    .join("");
}

function buildPage(state, bpm, processes) {
  const operational = state.currentProcess ? findProcess(state, state.currentProcess) : getProcesses(state)[0];
  const currentId = bpm?.process_id || operational?.bpmProcessId || "";
  const versions = bpm?.versions || [];
  return `
    <div class="max-w-6xl mx-auto space-y-xl">
      ${renderDetailHeader({ eyebrow: "Ficha BPM", title: "Detalle del proceso", description: "Introduce y mantiene la información escrita de la definición BPM seleccionada.", backHref: "#/procesos_v02", backLabel: "Volver a procesos" })}
      ${renderPageAlert("process-page-alert")}
      ${bpm ? `
      <form id="process-page-form" class="space-y-lg" novalidate>
        <section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-lg">
          <div><h2 class="font-headline-sm text-headline-sm text-primary">Identificación BPM</h2><p class="text-[12px] text-on-surface-variant mt-xs">La relación canónica se mantiene vinculada a este identificador.</p></div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Identificador BPM</span><input class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm" value="${escapeHtml(currentId)}" readonly></label>
            <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Código BPM</span><input id="process-page-code" name="process_code" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm" value="${escapeHtml(bpm.process_code || "")}" required></label>
          </div>
        </section>
        <section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-lg">
          <div><h2 class="font-headline-sm text-headline-sm text-primary">Información descriptiva</h2></div>
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Nombre visible</span><input id="process-page-name" name="name" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm" value="${escapeHtml(bpm.name || "")}" required></label>
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Descripción</span><textarea id="process-page-description" name="description" rows="8" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${escapeHtml(bpm.description || "")}</textarea></label>
        </section>
        <section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-lg">
          <div><h2 class="font-headline-sm text-headline-sm text-primary">Jerarquía y clasificación</h2></div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Proceso padre</span><select id="process-page-parent" name="parent_process_id" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${optionsForParents(processes, currentId, bpm.parent_process_id)}</select></label>
            <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Nivel de abstracción</span><input id="process-page-level" name="abstraction_level" type="number" min="0" step="1" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm" value="${escapeHtml(bpm.abstraction_level ?? 0)}" required></label>
          </div>
        </section>
        <section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-lg">
          <div><h2 class="font-headline-sm text-headline-sm text-primary">Estado y versiones</h2></div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-lg"><label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Estado BPM</span><select id="process-page-status" name="status" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm"><option value="draft"${bpm.status === "draft" ? " selected" : ""}>Borrador</option><option value="active"${bpm.status === "active" ? " selected" : ""}>Activo</option></select></label><div class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Versiones existentes</span><p class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${versions.length} versión${versions.length === 1 ? "" : "es"}</p></div></div>
          <div class="space-y-xs">${versions.length ? versions.map((version) => `<div class="flex justify-between gap-md border-b border-outline-variant py-sm text-body-sm"><span>Versión ${escapeHtml(version.version_number)}</span><span class="text-on-surface-variant">${escapeHtml(version.status)}</span></div>`).join("") : '<p class="text-[12px] text-on-surface-variant">No hay versiones registradas.</p>'}</div>
        </section>
        <div class="flex justify-end gap-sm"><a href="#/modelado-procesos" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container">Abrir modelado BPM</a><button type="submit" id="process-page-save" data-action="process-page-save" class="px-lg py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90">Guardar cambios</button></div>
      </form>` : '<section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl">No se pudo cargar la definición BPM.</section>'}
    </div>`;
}

function queryProcess(state) {
  const query = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const bpmId = query.get("bpm_process_id");
  if (bpmId) return getProcesses(state).find((item) => String(item.bpmProcessId) === String(bpmId)) || null;
  return state.currentProcess ? findProcess(state, state.currentProcess) : getProcesses(state)[0];
}

export function renderProcesosDetalleV02(state, bus) {
  const { root, mainSlot, rightSlot } = createHomeShellV02(state, { rightWidthClass: "w-[280px]" });
  mainSlot.innerHTML = buildPage(state, null, []);
  rightSlot.innerHTML = '<div class="p-lg"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Proceso seleccionado</p><p class="text-[12px] text-on-surface-variant mt-sm">Edición de la ficha BPM.</p></div>';
  return { shellMode: "full", main: root, afterMount(mountRoot, currentState, eventBus) {
    document.title = "Industrial RCA - Detalle BPM";
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    bindHomeShellV02(mountRoot);
    const process = queryProcess(currentState);
    if (!process?.bpmProcessId) return;
    Promise.all([getProcess(process.bpmProcessId), listProcesses()]).then(([response, listResponse]) => {
      const data = response?.data || null;
      const processList = listResponse?.data || [];
      const mainSlotNode = mountRoot.querySelector("[data-shell-main]");
      const rightSlotNode = mountRoot.querySelector("[data-shell-right]");
      if (mainSlotNode) mainSlotNode.innerHTML = buildPage(currentState, data, processList);
      if (rightSlotNode) rightSlotNode.innerHTML = `<div class="p-lg border-b border-outline-variant bg-surface-container-low"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Proceso seleccionado</p><h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(data?.name || process.name)}</h2><p class="text-[12px] text-on-surface-variant mt-sm">Ficha BPM editable.</p></div>`;
      const form = mountRoot.querySelector("#process-page-form");
      const alert = mountRoot.querySelector("#process-page-alert");
      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const payload = { process_code: form.process_code.value.trim(), name: form.name.value.trim(), description: form.description.value.trim() || null, parent_process_id: form.parent_process_id.value || null, abstraction_level: Number(form.abstraction_level.value), status: form.status.value };
        try {
          const save = mountRoot.querySelector("#process-page-save");
          save.disabled = true;
          save.textContent = "Guardando…";
          await updateProcess(process.bpmProcessId, payload);
          if (alert) { alert.textContent = "Proceso BPM actualizado."; alert.className = "rounded-lg border px-md py-sm text-[12px] border-green-200 bg-green-50 text-green-700"; }
          if (eventBus) eventBus.emit("catalog:refresh");
          save.disabled = false;
          save.textContent = "Guardar cambios";
        } catch (error) {
          if (alert) { alert.textContent = error.message || "No se pudo guardar el proceso BPM."; alert.className = "rounded-lg border px-md py-sm text-[12px] border-red-200 bg-red-50 text-red-700"; }
          const save = mountRoot.querySelector("#process-page-save");
          if (save) { save.disabled = false; save.textContent = "Guardar cambios"; }
        }
      });
    }).catch(() => {
      const alert = mountRoot.querySelector("#process-page-alert");
      if (alert) { alert.textContent = "No se pudo cargar la definición BPM."; alert.className = "rounded-lg border px-md py-sm text-[12px] border-red-200 bg-red-50 text-red-700"; }
    });
  } };
}
