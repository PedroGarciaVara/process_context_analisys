import { escapeHtml } from "../core/utils.js";

export function statusBadge(status) {
  const normalized = String(status || "closed").toLowerCase();
  if (normalized === "open") return `<span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-green-100 text-green-800 text-[11px] font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>Abierto</span>`;
  if (normalized === "review") return `<span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>En revision</span>`;
  return `<span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-outline"></span>Cerrado</span>`;
}

export function buildMachineMultiOptions(items, selectedIds = []) {
  const selectedSet = new Set((selectedIds || []).map((value) => String(value)));
  return items.map((item) => `<option value="${escapeHtml(item.id)}"${selectedSet.has(String(item.id)) ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
}

export function buildContractScopeOptions(items, selectedValue = "") {
  if (!items.length) return '<option value="" disabled selected>No hay alcances BPM disponibles</option>';
  return items.map((item) => `<option value="${escapeHtml(item.id)}"${String(selectedValue) === String(item.id) ? " selected" : ""}>${escapeHtml(item.name)}${item.processName ? ` — ${escapeHtml(item.processName)}` : ""}</option>`).join("");
}

export function buildContractProcessFilterOptions(scopes, selectedValue = "") {
  const options = ['<option value="">Todos los procesos</option>'];
  for (const item of scopes.processes || []) options.push(`<option value="${escapeHtml(item.id)}"${String(selectedValue) === String(item.id) ? " selected" : ""}>${escapeHtml(item.name)}</option>`);
  return options.join("");
}
