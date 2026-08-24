import { escapeHtml } from "../core/utils.js";

export function stageDraftFromMachine(activeMachine) {
  const selected = activeMachine?.operations?.find((item) => item.operation_id === activeMachine.selectedOperationId) || activeMachine?.operations?.[0];
  return (selected?.etapas || []).map((stage, index) => ({
    id: stage.id || `stage-${index + 1}`,
    nombre: stage.nombre || "",
    orden: index + 1,
    subetapas: (stage.subetapas || []).map((child, childIndex) => ({ id: child.id || `stage-${index + 1}-substage-${childIndex + 1}`, nombre: child.nombre || "", orden: childIndex + 1, subetapas: [] })),
  }));
}

export function stageEditorMarkup(stages) {
  if (!stages.length) return '<p class="text-[12px] text-on-surface-variant" data-stage-empty>Sin etapas definidas.</p>';
  return stages.map((stage, index) => `<div class="rounded-lg border border-outline-variant p-sm space-y-sm" data-stage-index="${index}"><div class="flex gap-sm items-center"><input class="flex-1 border border-outline rounded p-sm bg-surface-container-low" data-stage-name value="${escapeHtml(stage.nombre)}" aria-label="Nombre etapa ${index + 1}"><button type="button" class="px-sm py-xs border border-outline rounded" data-stage-move="up" aria-label="Subir etapa">↑</button><button type="button" class="px-sm py-xs border border-outline rounded" data-stage-move="down" aria-label="Bajar etapa">↓</button><button type="button" class="px-sm py-xs border border-outline rounded" data-stage-add-substage>Añadir subetapa</button><button type="button" class="px-sm py-xs text-red-700 border border-red-200 rounded" data-stage-delete>Eliminar</button></div><div class="ml-lg space-y-xs" data-substages>${stage.subetapas.map((child, childIndex) => `<div class="flex gap-sm items-center" data-substage-index="${childIndex}"><span class="text-[11px] text-on-surface-variant">↳</span><input class="flex-1 border border-outline rounded p-sm bg-surface-container-low" data-substage-name value="${escapeHtml(child.nombre)}" aria-label="Nombre subetapa ${index + 1}.${childIndex + 1}"><button type="button" class="px-sm py-xs border border-outline rounded" data-substage-move="up" aria-label="Subir subetapa">↑</button><button type="button" class="px-sm py-xs border border-outline rounded" data-substage-move="down" aria-label="Bajar subetapa">↓</button><button type="button" class="px-sm py-xs text-red-700" data-substage-delete>Eliminar</button></div>`).join("")}</div></div>`).join("");
}

export function stagePathsMarkup(activeMachine) {
  const operation = activeMachine?.operations?.find((item) => item.operation_id === activeMachine.selectedOperationId) || activeMachine?.operations?.[0];
  const stages = operation?.etapas || [];
  if (!stages.length) return '<p class="text-[12px] text-on-surface-variant">Sin etapas definidas.</p>';
  return stages.flatMap((stage) => (stage.subetapas?.length ? stage.subetapas.map((child) => `<div class="text-[12px] text-primary">${escapeHtml(stage.nombre)} › ${escapeHtml(child.nombre)}</div>`) : [`<div class="text-[12px] text-primary">${escapeHtml(stage.nombre)}</div>`])).join("");
}
