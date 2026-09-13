import { getStructuredContext } from "../../api/process-modeling.js";
import { bindHomeShell, createHomeShell } from "../bpm/shell.js";

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));

export function renderContexto() {
  const { root, mainSlot, rightSlot } = createHomeShell({ route: "contexto" }, { rightWidthClass: "w-[360px]" });
  mainSlot.classList.add("context-page");
  mainSlot.innerHTML = `<header class="michelin-page-hero michelin-page-hero--blue context-page__header"><p class="context-eyebrow">Contexto estructurado</p><h1>Consulta BPM, metodología y trazabilidad</h1><p>La misma proyección sirve para la vista técnica y consumidores RAG. Las declaraciones, hechos y evidencias permanecen separados.</p></header><form id="context-form" class="context-form"><label for="context-version-id">ID de versión</label><input id="context-version-id" required placeholder="UUID de la versión BPM"><button class="context-primary" type="submit">Cargar contexto</button></form><div id="context-feedback" role="status" aria-live="polite"></div><section id="context-result" class="context-result" aria-live="polite"><p class="context-muted">Selecciona una versión para empezar.</p></section>`;
  rightSlot.innerHTML = `<div class="p-lg"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Proyección semántica</p><h2 class="font-headline-md text-primary mt-sm">Contexto agent-ready</h2><p class="text-[12px] text-on-surface-variant mt-sm">Consulta identificadores, relaciones, procedencia y evidencias sin abandonar el marco de navegación del producto.</p></div>`;
  return { main: root, afterMount(mountRoot) { bindHomeShell(mountRoot); afterMountContexto(mountRoot); } };
}

export function afterMountContexto(root) {
  const form = root.querySelector("#context-form");
  const feedback = root.querySelector("#context-feedback");
  const result = root.querySelector("#context-result");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const processId = root.querySelector("#context-version-id").value;
    feedback.textContent = "Cargando contexto…";
    try {
      const response = await getStructuredContext(String(processId).trim());
      const data = response.data || {};
      const text = JSON.stringify(data, null, 2);
      result.innerHTML = `<div class="context-result__toolbar"><strong>${esc(data.process?.name || "Proceso")}</strong><button type="button" class="context-secondary" id="context-copy">Copiar JSON estructurado</button></div><pre class="context-result__json">${esc(text)}</pre>`;
      root.querySelector("#context-copy").addEventListener("click", async () => {
        await navigator.clipboard.writeText(text);
        feedback.textContent = "Contexto copiado con identificadores y procedencia.";
      });
      feedback.textContent = "Contexto cargado.";
    } catch (error) {
      feedback.textContent = error.message;
      result.innerHTML = '<p class="context-muted">No se pudo cargar el contexto. Revisa el identificador y los permisos.</p>';
    }
  });
}
