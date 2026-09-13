import { escapeHtml } from "../../core/utils.js";
import { mountOperationMetadataEditor, operationMetadataMarkup, readOperationMetadata } from "../../components/operation-metadata-editor.js";
import { mountStageEditor, readStageEditor, stageEditorMarkup } from "../../components/machine-stages.js";

export function operationFormBody(operation, context = {}) {
  const metadata = operation?.metadata || operation?.properties || {};
  const stages = operation?.etapas || operation?.properties?.etapas || [];
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-lg">
      <div class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Identificador del nodo</span><p class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${escapeHtml(operation?.node_id || "—")}</p></div>
      <div class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Tipo de nodo</span><p class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${escapeHtml(operation?.node_type || "operation")}</p></div>
      <div class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Proceso BPM</span><p class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${escapeHtml(context.processName || operation?.process_name || "—")}</p></div>
    </div>
    <div class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Código de operación</span><p id="operation-page-code" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${escapeHtml(operation?.node_code || "Asignado por el servidor")}</p></div>
    <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Nombre</span><input name="name" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm" value="${escapeHtml(operation?.name || "")}" required></label>
    <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Descripción</span><textarea name="description" rows="5" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${escapeHtml(operation?.description || "")}</textarea></label>
    ${operationMetadataMarkup(metadata)}
    <fieldset class="operation-stage-editor" data-operation-stage-editor><legend>Etapas de la operación</legend><p>Descompón el trabajo en etapas y subetapas ordenadas.</p><button type="button" class="operation-stage-add" data-stage-add>+ Añadir etapa</button><div data-stage-list>${stageEditorMarkup(stages)}</div><span class="sr-only" data-stage-live aria-live="polite"></span></fieldset>`;
}

export function readOperationForm(form) {
  const metadata = readOperationMetadata(form);
  const stages = readStageEditor(form.querySelector("[data-operation-stage-editor]"));
  if (stages.some((stage) => !stage.nombre || stage.subetapas.some((child) => !child.nombre))) throw new Error("Todas las etapas y subetapas necesitan un nombre.");
  return { name: form.name.value.trim(), description: form.description.value.trim() || null, metadata, stages };
}

export function mountOperationForm(form, operation) {
  mountOperationMetadataEditor(form, operation?.metadata || operation?.properties || {});
  mountStageEditor(form.querySelector("[data-operation-stage-editor]"), operation?.etapas || operation?.properties?.etapas || []);
}
