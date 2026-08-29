import { escapeHtml } from "../core/utils.js";

export function renderDetailHeader({ eyebrow, title, description, backHref, backLabel }) {
  return `<div class="flex items-center justify-between gap-lg flex-wrap"><div><span class="font-label-md text-label-md text-primary tracking-widest uppercase">${escapeHtml(eyebrow)}</span><h1 class="font-display-lg text-display-lg text-on-background">${escapeHtml(title)}</h1><p class="font-body-md text-body-md text-secondary">${escapeHtml(description)}</p></div><a href="${escapeHtml(backHref)}" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container">${escapeHtml(backLabel)}</a></div>`;
}

export function renderPageAlert(id) {
  return `<div id="${escapeHtml(id)}" class="hidden rounded-lg border px-md py-sm text-[12px]" role="status" aria-live="polite"></div>`;
}

export function renderBpmProcessActions(processId) {
  return `<button type="button" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="process-contracts" data-process-id="${escapeHtml(processId)}">Contratos</button><button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="process-operations" data-process-id="${escapeHtml(processId)}">Operaciones</button><button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="process-detail" data-process-id="${escapeHtml(processId)}">Detalle</button>`;
}

export function renderBpmOperationDetailButton(nodeId, processId) {
  return `<button type="button" class="px-md py-sm bg-primary text-on-primary rounded text-label-md" data-action="operation-detail" data-node-id="${escapeHtml(nodeId)}" data-process-id="${escapeHtml(processId)}">Detalle</button>`;
}
