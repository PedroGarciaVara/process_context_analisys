import { getStructuredContext } from "../api/process-modeling.js";
import { createElement } from "../core/utils.js";

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));

export function renderContexto() {
  const main = createElement("main", { className: "context-page" });
  main.innerHTML = `<header class="context-page__header"><p class="pm-eyebrow">Contexto estructurado</p><h1>Consulta BPM, metodología y trazabilidad</h1><p>La misma proyección sirve para la vista técnica y consumidores RAG. Las declaraciones, hechos y evidencias permanecen separados.</p></header><form id="context-form" class="context-form"><label for="context-version-id">ID de versión</label><input id="context-version-id" required placeholder="UUID de la versión BPM"><button class="pm-primary" type="submit">Cargar contexto</button></form><div id="context-feedback" role="status" aria-live="polite"></div><section id="context-result" class="context-result" aria-live="polite"><p class="pm-metadata-muted">Selecciona una versión para empezar.</p></section>`;
  return { main, afterMount: afterMountContexto };
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
      result.innerHTML = `<div class="context-result__toolbar"><strong>${esc(data.process?.name || "Proceso")}</strong><button type="button" class="pm-secondary" id="context-copy">Copiar JSON estructurado</button></div><pre class="context-result__json">${esc(text)}</pre>`;
      root.querySelector("#context-copy").addEventListener("click", async () => {
        await navigator.clipboard.writeText(text);
        feedback.textContent = "Contexto copiado con identificadores y procedencia.";
      });
      feedback.textContent = "Contexto cargado.";
    } catch (error) {
      feedback.textContent = error.message;
      result.innerHTML = '<p class="pm-metadata-muted">No se pudo cargar el contexto. Revisa el identificador y los permisos.</p>';
    }
  });
}
