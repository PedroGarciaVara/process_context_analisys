import { escapeHtml } from "../core/utils.js";

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
