import { escapeHtml } from "../../core/utils.js";

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
    <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Metadatos JSON</span><textarea name="metadata" rows="7" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${escapeHtml(JSON.stringify(metadata, null, 2))}</textarea></label>
    <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Etapas JSON</span><textarea name="stages" rows="7" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${escapeHtml(JSON.stringify(stages, null, 2))}</textarea></label>`;
}

export function readOperationForm(form) {
  let metadata;
  let stages;
  try { metadata = JSON.parse(form.metadata.value || "{}"); } catch { throw new Error("Los metadatos deben ser un JSON válido."); }
  try { stages = JSON.parse(form.stages.value || "[]"); } catch { throw new Error("Las etapas deben ser un JSON válido."); }
  if (!Array.isArray(stages)) throw new Error("Las etapas deben ser una lista JSON.");
  return { name: form.name.value.trim(), description: form.description.value.trim() || null, metadata, stages };
}
