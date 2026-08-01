export function renderProcessList(processes) {
  if (!processes.length) return '<p class="pm-empty">No hay procesos modelados todavía.</p>';
  return processes.map((item) => `<button type="button" class="pm-process" data-pm-process="${item.process_id}"><strong>${item.process_code}</strong><span>${item.name}</span></button>`).join("");
}
