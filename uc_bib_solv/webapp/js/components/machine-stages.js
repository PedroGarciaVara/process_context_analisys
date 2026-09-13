import { escapeHtml } from "../core/utils.js";

const mountedStageDrafts = new WeakMap();

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

export function mountStageEditor(editor, initialStages = []) {
  if (!editor || mountedStageDrafts.has(editor)) return;
  const draft = (initialStages || []).map((stage, index) => ({
    ...stage, id: stage.id || `stage-${Date.now()}-${index + 1}`, nombre: stage.nombre || "", orden: index + 1,
    subetapas: (stage.subetapas || []).map((child, childIndex) => ({ ...child, id: child.id || `stage-${Date.now()}-${index + 1}-${childIndex + 1}`, nombre: child.nombre || "", orden: childIndex + 1, subetapas: [] })),
  }));
  mountedStageDrafts.set(editor, draft);
  const list = editor.querySelector("[data-stage-list]"); const live = editor.querySelector("[data-stage-live]");
  const normalize = () => draft.forEach((stage, index) => { stage.orden = index + 1; stage.subetapas.forEach((child, childIndex) => { child.orden = childIndex + 1; }); });
  const render = () => { normalize(); if (list) list.innerHTML = stageEditorMarkup(draft); };
  const announce = (message) => { if (live) live.textContent = message; };
  editor.querySelector("[data-stage-add]")?.addEventListener("click", () => { draft.push({ id: `stage-${Date.now()}`, nombre: "", orden: draft.length + 1, subetapas: [] }); render(); list?.querySelector("[data-stage-index]:last-child [data-stage-name]")?.focus(); announce("Etapa añadida."); });
  list?.addEventListener("input", (event) => { const stageNode = event.target.closest("[data-stage-index]"); if (!stageNode) return; const index = Number(stageNode.dataset.stageIndex); if (event.target.matches("[data-stage-name]")) draft[index].nombre = event.target.value; if (event.target.matches("[data-substage-name]")) draft[index].subetapas[Number(event.target.closest("[data-substage-index]").dataset.substageIndex)].nombre = event.target.value; });
  list?.addEventListener("click", (event) => {
    const stageNode = event.target.closest("[data-stage-index]"); if (!stageNode) return;
    const index = Number(stageNode.dataset.stageIndex); let changed = false;
    if (event.target.closest("[data-stage-delete]")) { if (draft[index].subetapas.length && !window.confirm("La etapa contiene subetapas. ¿Eliminarla?")) return; draft.splice(index, 1); changed = true; announce("Etapa eliminada."); }
    const move = event.target.closest("[data-stage-move]")?.dataset.stageMove;
    if (move) { const target = move === "up" ? index - 1 : index + 1; if (target >= 0 && target < draft.length) { [draft[index], draft[target]] = [draft[target], draft[index]]; changed = true; announce("Etapa reordenada."); } }
    if (event.target.closest("[data-stage-add-substage]")) { draft[index].subetapas.push({ id: `${draft[index].id}-substage-${Date.now()}`, nombre: "", orden: draft[index].subetapas.length + 1, subetapas: [] }); changed = true; announce("Subetapa añadida."); }
    const substageNode = event.target.closest("[data-substage-index]"); const childIndex = substageNode ? Number(substageNode.dataset.substageIndex) : -1;
    if (event.target.closest("[data-substage-delete]")) { draft[index].subetapas.splice(childIndex, 1); changed = true; announce("Subetapa eliminada."); }
    const childMove = event.target.closest("[data-substage-move]")?.dataset.substageMove;
    if (childMove) { const children = draft[index].subetapas; const target = childMove === "up" ? childIndex - 1 : childIndex + 1; if (target >= 0 && target < children.length) { [children[childIndex], children[target]] = [children[target], children[childIndex]]; changed = true; announce("Subetapa reordenada."); } }
    if (changed) render();
  });
  render();
}

export function readStageEditor(editor) {
  const draft = mountedStageDrafts.get(editor) || [];
  return draft.map((stage, index) => ({ ...stage, nombre: String(stage.nombre || "").trim(), orden: index + 1, subetapas: stage.subetapas.map((child, childIndex) => ({ ...child, nombre: String(child.nombre || "").trim(), orden: childIndex + 1, subetapas: [] })) }));
}
