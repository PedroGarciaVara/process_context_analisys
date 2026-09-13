import { createAnalysis, fetchAnalysis, listAnalysisTemplates, saveAnalysisResult, updateAnalysis } from "../../api/analysis.js";
import { getContractScopes, getMachines } from "../../core/operational.js";
import { createElement, escapeHtml } from "../../core/utils.js";
import { createTreePageShell } from "../../components/tree-shell.js";
import { bindHomeShell, createHomeShell } from "../bpm/shell.js";

function readRouteParams() {
  const queryIndex = (window.location.hash || "").indexOf("?");
  const params = new URLSearchParams(queryIndex >= 0 ? window.location.hash.slice(queryIndex + 1) : "");
  return {
    contractId: params.get("contract_id") || "",
    analysisId: params.get("analysis_id") || "",
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function buildHero() {
  return `
    <section class="michelin-page-hero michelin-page-hero--blue space-y-sm mb-xl">
      <span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de trabajo de investigacion</span>
      <div class="flex items-end justify-between gap-lg flex-wrap">
        <div>
          <h1 class="font-display-lg text-display-lg text-on-background">Analisis causas</h1>
          <p class="font-body-md text-body-md text-secondary max-w-3xl">Abre una investigacion desde una plantilla causal, registra el indicio y deja trazabilidad de cada evaluacion hasta la conclusion final.</p>
        </div>
      </div>
    </section>
  `;
}

function buildOpenPanel(state) {
  const processes = state.catalog?.data?.procesos || [];
  const initialProcess = processes[0]?.id || "";
  const scopes = getContractScopes(state);
  const operations = scopes.operations.filter((item) => String(item.processId) === String(initialProcess));
  const machines = getMachines(state);
  const renderOptions = (items, emptyLabel) => `<option value="">${escapeHtml(emptyLabel)}</option>${items.map((item) => `<option value="${escapeHtml(item.value ?? item.id)}">${escapeHtml(item.label ?? item.name)}</option>`).join("")}`;
  return `
    <section class="max-w-4xl mx-auto space-y-lg">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
        <p class="font-label-md text-label-md text-primary uppercase tracking-widest">Paso 1</p>
        <h2 class="font-headline-lg text-headline-lg text-primary mt-xs">Abrir nuevo analisis</h2>
        <p class="font-body-md text-body-md text-secondary mt-sm">Selecciona el proceso y carga una plantilla de causas existente para iniciar la investigacion.</p>
        <div class="grid md:grid-cols-2 gap-lg mt-xl">
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Proceso del analisis</span><select id="analysis-process-select" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"><option value="">Selecciona proceso</option>${processes.map((item) => `<option value="${escapeHtml(item.id)}"${String(item.id) === String(initialProcess) ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Operacion</span><select id="analysis-operation-select" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low">${renderOptions(operations, "Nivel proceso")}</select></label>
          <label class="block space-y-xs md:col-span-2"><span class="font-label-md text-label-md text-secondary">Contrato / plantilla de causas</span><select id="analysis-template-select" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"><option value="">Cargando contratos...</option></select></label>
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Dia de apertura</span><input id="analysis-opening-date" type="date" value="${today()}" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"></label>
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Participante inicial</span><input id="analysis-participant" type="text" value="Usuario" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"></label>
        </div>
        <label class="block space-y-xs mt-lg"><span class="font-label-md text-label-md text-secondary">Indicio que origina la apertura</span><textarea id="analysis-opening-indication" rows="4" placeholder="Describe el evento, desviacion o evidencia que inicia el analisis" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"></textarea></label>
        <label class="block space-y-xs mt-lg"><span class="font-label-md text-label-md text-secondary">Maquinas involucradas</span><select id="analysis-machine-select" multiple size="4" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low">${renderOptions(machines.filter((item) => String(item.processId) === String(initialProcess)), "Selecciona una o varias maquinas")}</select><span class="text-[12px] text-on-surface-variant">Puedes seleccionar varias máquinas del alcance elegido.</span></label>
        <div id="analysis-open-alert" class="hidden rounded-lg border px-md py-sm text-[12px] mt-lg"></div>
        <button id="analysis-open-button" type="button" class="mt-lg px-lg py-md bg-primary text-on-primary rounded-lg font-label-md">Importar plantilla y abrir analisis</button>
      </div>
    </section>
  `;
}

function buildWorkspacePanel() {
  return `
    <div class="p-lg border-b border-outline-variant bg-surface-container-low">
      <p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Seguimiento del analisis</p>
      <h2 class="font-headline-md text-headline-md text-primary mt-xs">Trazabilidad</h2>
      <p id="analysis-workspace-status" class="text-[12px] text-on-surface-variant mt-sm">Cargando analisis...</p>
    </div>
    <div class="p-lg space-y-lg">
      <nav class="analysis-stepper" aria-label="Ciclo de investigación">
        <ol class="analysis-stepper__list">
          ${["Definir", "Medir", "Analizar", "Validar", "Controlar"].map((step, index) => `<li class="analysis-stepper__step${index === 0 ? " is-active" : ""}" data-step-index="${index}"><span class="analysis-stepper__index">${index + 1}</span><span>${step}</span></li>`).join("")}
        </ol>
        <p id="analysis-stepper-current" class="analysis-stepper__current" aria-live="polite">Fase actual: Definir</p>
        <p id="analysis-stepper-next" class="analysis-stepper__next">Siguiente acción: selecciona una hipótesis y documenta el indicio.</p>
        <p class="text-[12px] text-on-surface-variant">Guía de trabajo: cada paso registra información aportada por el equipo; no se automatizan cálculos ni decisiones.</p>
      </nav>
      <div id="analysis-template-differences" class="p-md bg-surface-container-low rounded-lg border border-outline-variant text-[12px]" aria-live="polite">Comparando plantilla actual por IDs...</div>
      <div class="space-y-sm">
        <h3 class="font-label-md text-label-md text-primary uppercase">Apertura</h3>
        <label class="block space-y-xs"><span class="text-[12px] text-secondary">Dia</span><input id="analysis-open-date" type="date" class="w-full border border-outline rounded-lg p-sm"></label>
        <label class="block space-y-xs"><span class="text-[12px] text-secondary">Indicio</span><textarea id="analysis-indication" rows="3" class="w-full border border-outline rounded-lg p-sm"></textarea></label>
        <button id="analysis-save-opening" type="button" class="px-md py-sm border border-outline-variant rounded-lg text-primary">Guardar apertura</button>
      </div>
      <div class="space-y-sm border-t border-outline-variant pt-lg">
        <h3 class="font-label-md text-label-md text-primary uppercase">Cierre</h3>
        <textarea id="analysis-final-conclusion" rows="4" placeholder="Conclusion final del analisis" class="w-full border border-outline rounded-lg p-sm"></textarea>
        <button id="analysis-close-button" type="button" class="px-md py-sm border border-primary text-primary rounded-lg">Guardar conclusion y cerrar</button>
        <button id="analysis-reopen-button" type="button" class="hidden px-md py-sm border border-primary text-primary rounded-lg">Reabrir analisis</button>
      </div>
      <section class="analysis-scientific-workspace border-t border-outline-variant pt-lg" aria-labelledby="analysis-scientific-title">
        <p class="font-label-md text-label-md text-primary uppercase tracking-widest">Ficha de hipótesis</p>
        <h3 id="analysis-scientific-title" class="font-headline-md text-headline-md text-primary mt-xs">Cadena científica</h3>
        <p class="text-[12px] text-on-surface-variant mt-sm">Selecciona una hipótesis en el árbol para documentar su predicción, medición y decisión.</p>
        <input id="analysis-scientific-hypothesis-id" type="hidden" name="hypothesis_id" value="">
        <div class="detail-scientific-grid mt-md">
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Predicción</span><textarea id="analysis-prediction" name="prediccion" rows="2" placeholder="Qué debería observarse…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></textarea></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Criterio de validación</span><textarea id="analysis-criterion" name="criterio_validacion" rows="2" placeholder="Qué confirma o rechaza la hipótesis…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></textarea></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Métrica</span><input id="analysis-metric" name="metrica" type="text" placeholder="Métrica…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Unidad</span><input id="analysis-unit" name="unidad" type="text" placeholder="Unidad…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Fuente de datos</span><input id="analysis-source" name="fuente_datos" type="text" placeholder="Fuente…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Periodo</span><input id="analysis-period" name="periodo" type="text" placeholder="Periodo…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Método / datos</span><textarea id="analysis-method" name="metodo" rows="2" placeholder="Método de observación y datos…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></textarea></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Cálculo</span><textarea id="analysis-calculation" name="calculo" rows="2" placeholder="Fórmula y resultado aportado; no se calcula automáticamente…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></textarea></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Umbral</span><input id="analysis-threshold" name="umbral" type="text" placeholder="Umbral o rango…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Evidencia</span><textarea id="analysis-evidence" name="evidencia" rows="3" placeholder="Referencia o evidencia observada…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></textarea></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Decisión</span><select id="analysis-decision" name="decision" class="w-full border border-outline rounded-lg p-sm"><option value="pendiente">Pendiente</option><option value="confirmada">Confirmada</option><option value="rechazada">Rechazada</option><option value="inconclusa">Inconclusa</option></select></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Justificación</span><textarea id="analysis-justification" name="justificacion" rows="2" placeholder="Obligatoria si la decisión es inconclusa…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></textarea></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Acción / control</span><textarea id="analysis-control-action" name="accion_control" rows="2" placeholder="Acción posterior a la decisión…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></textarea></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Responsable</span><input id="analysis-control-owner" name="responsable_accion" type="text" placeholder="Persona o rol…" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></label>
          <label class="block space-y-xs"><span class="text-[12px] text-secondary">Fecha de control</span><input id="analysis-control-date" name="fecha_control" type="date" autocomplete="off" class="w-full border border-outline rounded-lg p-sm"></label>
        </div>
        <p id="analysis-scientific-help" class="text-[12px] text-on-surface-variant mt-sm" aria-live="polite">Los campos antiguos se muestran aunque estén vacíos para guiar su completado.</p>
        <button id="analysis-save-scientific" type="button" class="mt-md px-md py-sm border border-primary text-primary rounded-lg">Guardar ficha de hipótesis</button>
      </section>
      <div id="analysis-workspace-alert" class="hidden rounded-lg border px-md py-sm text-[12px]"></div>
    </div>
  `;
}

function updateAnalysisStepper(root, analysis) {
  const result = Array.isArray(analysis?.results) ? analysis.results[0] : null;
  const evidence = String(result?.evidencia || result?.evidence || "").trim();
  const decision = String(result?.decision || result?.evaluation || result?.evaluacion || "pendiente").toLowerCase();
  const indication = String(analysis?.indicio_apertura || analysis?.descripcion_apertura || "").trim();
  const control = String(result?.accion_control || result?.control_action || "").trim();
  let current = 0;
  let next = "Selecciona una hipótesis y documenta el indicio.";
  if (indication) { current = 1; next = "Registra la medición y la fuente de datos."; }
  if (result) { current = evidence ? 3 : 2; next = evidence ? "Revisa el criterio y registra una decisión explícita." : "Añade evidencia observable antes de decidir."; }
  if (result && decision !== "pendiente") { current = 4; next = control ? "Mantén el control documentado y revisa sus resultados." : "Define la acción o control posterior a la decisión."; }
  if (analysis?.estado === "cerrado") next = "Análisis cerrado: reabre explícitamente para editar o documentar el control.";
  const labels = ["Definir", "Medir", "Analizar", "Validar", "Controlar"];
  root.querySelectorAll(".analysis-stepper__step").forEach((step) => {
    const index = Number(step.dataset.stepIndex);
    const active = index === current;
    step.classList.toggle("is-active", active);
    step.classList.toggle("is-complete", index < current);
    if (active) step.setAttribute("aria-current", "step"); else step.removeAttribute("aria-current");
  });
  const currentNode = root.querySelector("#analysis-stepper-current");
  const nextNode = root.querySelector("#analysis-stepper-next");
  if (currentNode) currentNode.textContent = `Fase actual: ${labels[current]}`;
  if (nextNode) nextNode.textContent = `Siguiente acción: ${next}`;
}

function setAlert(node, message, tone = "success") {
  node.textContent = message;
  node.className = `rounded-lg border px-md py-sm text-[12px] ${tone === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`;
  node.setAttribute("role", tone === "success" ? "status" : "alert");
  node.setAttribute("aria-live", "polite");
}

function classifyAnalysisError(error) {
  const status = Number(error?.status || 0);
  if (status === 403) return "forbidden";
  if (status === 0 || (typeof navigator !== "undefined" && navigator.onLine === false)) return "offline";
  return "error";
}

function errorSummary(error, fallback = "No se pudo cargar el análisis.") {
  const code = String(error?.code || error?.data?.code || "RCA_ANALYSIS_FAILED");
  const correlation = String(error?.correlation_id || error?.data?.correlation_id || "no disponible");
  return `${error?.message || fallback} Código: ${code}. Correlación: ${correlation}.`;
}

const scientificFieldIds = {
  hypothesis_id: "analysis-scientific-hypothesis-id",
  prediccion: "analysis-prediction",
  criterio_validacion: "analysis-criterion",
  metrica: "analysis-metric",
  unidad: "analysis-unit",
  fuente_datos: "analysis-source",
  periodo: "analysis-period",
  metodo: "analysis-method",
  calculo: "analysis-calculation",
  umbral: "analysis-threshold",
  evidencia: "analysis-evidence",
  decision: "analysis-decision",
  justificacion: "analysis-justification",
  accion_control: "analysis-control-action",
  responsable_accion: "analysis-control-owner",
  fecha_control: "analysis-control-date",
};

function readScientificForm(root) {
  return Object.fromEntries(Object.entries(scientificFieldIds).map(([key, id]) => [key, root.querySelector(`#${id}`)?.value || ""]));
}

function fillScientificForm(root, result = {}) {
  Object.entries(scientificFieldIds).forEach(([key, id]) => {
    const control = root.querySelector(`#${id}`);
    const legacyKey = ({ evidencia: "evidence", justificacion: "conclusion", decision: "evaluation" })[key];
    if (control) control.value = result[key] || (legacyKey ? result[legacyKey] : "") || result[`legacy_${key}`] || "";
  });
  const decision = root.querySelector("#analysis-decision");
  if (decision && (result.evaluation || result.evaluacion)) decision.value = result.evaluation || result.evaluacion;
}

function validateScientificForm(values) {
  const decision = String(values.decision || "pendiente").toLowerCase();
  if (["confirmada", "rechazada", "descartada"].includes(decision)) {
    if (!String(values.criterio_validacion || "").trim()) {
      return "Una decisión confirmada o rechazada necesita criterio o umbral.";
    }
    if (!String(values.evidencia || "").trim()) return "Una decisión confirmada o rechazada necesita evidencia.";
  }
  if (decision === "inconclusa" && !String(values.justificacion || "").trim()) return "Una decisión inconclusa necesita justificación.";
  return "";
}

async function loadTemplates(select, processId, allowedContractIds = null) {
  const response = await listAnalysisTemplates(processId);
  const templates = (response.data || []).filter((item) => !allowedContractIds || allowedContractIds.has(String(item.id)));
  select.innerHTML = templates.length
    ? templates.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)} (${item.causa_count} causas, ${item.hypothesis_count} hipotesis)</option>`).join("")
    : `<option value="">No hay plantillas para este proceso</option>`;
}

function scopedContracts(state, processId, operationId = "") {
  const contracts = state.catalog?.data?.contratos || [];
  return contracts.filter((item) => {
    if (String(item.processId) !== String(processId)) return false;
    if (!operationId) return item.scopeType === "process" || !item.bpmNodeId;
    return item.scopeType === "operation" && String(item.bpmNodeId || "") === String(operationId);
  });
}

function scopedMachines(state, processId, operationId = "") {
  return getMachines(state).filter((item) => {
    if (String(item.processId) !== String(processId)) return false;
    if (!operationId) return true;
    return (item.operations || []).some((operation) => String(operation.operation_id) === String(operationId));
  });
}

export function renderAnalisisCausasShell(state) {
  const route = readRouteParams();
  if (!route.analysisId) {
    const { root, mainSlot, rightSlot } = createHomeShell(state, { rightWidthClass: "w-[420px]" });
    mainSlot.innerHTML = buildHero(state) + buildOpenPanel(state);
    rightSlot.innerHTML = `<div class="p-lg"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Flujo</p><p class="font-headline-md text-primary mt-sm">Preparar, evaluar, cerrar</p><p class="text-[12px] text-on-surface-variant mt-sm">La plantilla seleccionada conserva el arbol causal y sus hipotesis para registrar la traza del analisis.</p></div>`;
    return {
      shellMode: "full",
      main: root,
      afterMount(mountRoot, currentState, eventBus) {
        document.title = "Industrial RCA - Nuevo analisis";
        bindHomeShell(mountRoot);
        const processSelect = mountRoot.querySelector("#analysis-process-select");
        const operationSelect = mountRoot.querySelector("#analysis-operation-select");
        const machineSelect = mountRoot.querySelector("#analysis-machine-select");
        const templateSelect = mountRoot.querySelector("#analysis-template-select");
        const alertNode = mountRoot.querySelector("#analysis-open-alert");
        const renderScopedOptions = (select, items, emptyLabel) => {
          select.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>${items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.label || `Maquina ${item.id}`)}</option>`).join("")}`;
        };
        const refreshScope = () => {
          const processId = processSelect.value;
          const operationId = operationSelect.value;
          const contracts = scopedContracts(currentState, processId, operationId);
          renderScopedOptions(machineSelect, scopedMachines(currentState, processId, operationId), "Selecciona una o varias maquinas");
          loadTemplates(templateSelect, processId, new Set(contracts.map((item) => String(item.id)))).catch((error) => setAlert(alertNode, error.message, "error"));
        };
        const refreshOperations = () => {
          const operations = getContractScopes(currentState).operations.filter((item) => String(item.processId) === String(processSelect.value));
          operationSelect.innerHTML = `<option value="">Nivel proceso</option>${operations.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")}`;
          refreshScope();
        };
        refreshOperations();
        processSelect.addEventListener("change", refreshOperations);
        operationSelect.addEventListener("change", refreshScope);
        mountRoot.querySelector("#analysis-open-button").addEventListener("click", async () => {
          try {
            const machineIds = [...machineSelect.selectedOptions].map((item) => item.value).filter(Boolean);
            const response = await createAnalysis({
              process_id: processSelect.value,
              template_contract_id: templateSelect.value,
              machine_id: machineIds[0] || null,
              machine_ids: machineIds,
              opening_date: mountRoot.querySelector("#analysis-opening-date").value,
              indication: mountRoot.querySelector("#analysis-opening-indication").value,
              participant: mountRoot.querySelector("#analysis-participant").value,
            });
            const analysis = response.data;
            window.location.hash = `#/analisis_causas?contract_id=${encodeURIComponent(analysis.contrato_id)}&analysis_id=${encodeURIComponent(analysis.id)}`;
          } catch (error) {
            setAlert(alertNode, error.message, "error");
          }
        });
      },
    };
  }

  // The analysis view has a distinct tree contract: it exposes hypothesis
  // evaluation and persists evidence/results instead of editing the template.
  // Keep this identifier aligned with the backend projection and renderer.
  const treePage = createTreePageShell("analisis_causas_v2", state);
  const { root, mainSlot, rightSlot } = createHomeShell(state, { rightWidthClass: "w-[460px]" });
  const mainWrap = createElement("div", { className: "max-w-none mx-auto space-y-xl min-w-0" });
  mainWrap.innerHTML = buildHero();
  mainWrap.appendChild(treePage.main);
  mainSlot.appendChild(mainWrap);
  const workspace = createElement("aside", { className: "analysis-workspace-panel" });
  workspace.innerHTML = buildWorkspacePanel();
  // The hypothesis result is edited directly on the selected hypothesis card.
  // The former duplicate scientific-chain form exposed a second, conflicting
  // persistence model, so keep the workspace focused on opening/closing work.
  workspace.querySelector(".analysis-scientific-workspace")?.remove();
  // Keep the workflow state at the top of the active inspector; node details
  // remain available immediately after it without burying the stepper.
  rightSlot.append(workspace, treePage.detail);

  return {
    shellMode: "full",
    main: root,
    beforeUnmount() {
      treePage.beforeUnmount?.();
    },
    afterMount(mountRoot, currentState, eventBus) {
      document.title = "Industrial RCA - Analisis causas";
      bindHomeShell(mountRoot);
      if (typeof treePage.afterMount === "function") treePage.afterMount(mountRoot, currentState, eventBus);
      const alertNode = mountRoot.querySelector("#analysis-workspace-alert");
      const statusNode = mountRoot.querySelector("#analysis-workspace-status");
      const retryNode = createElement("button", { className: "px-md py-sm border border-outline-variant rounded-lg text-primary", text: "Reintentar carga" });
      retryNode.type = "button";
      retryNode.hidden = true;
      retryNode.setAttribute("aria-label", "Reintentar carga del análisis");
      statusNode?.insertAdjacentElement("afterend", retryNode);
      let analysisReadOnly = false;
      let analysisFormDirty = false;
      const captureForm = () => Object.fromEntries(Array.from(mountRoot.querySelectorAll(".analysis-workspace-panel input, .analysis-workspace-panel textarea, .analysis-workspace-panel select")).map((node) => [node.id, node.value]));
      const restoreForm = (snapshot) => Object.entries(snapshot || {}).forEach(([id, value]) => { const node = mountRoot.querySelector(`#${id}`); if (node) node.value = value; });
      const loadAnalysis = async ({ preserveDraft = analysisFormDirty } = {}) => {
        const draft = preserveDraft ? captureForm() : null;
        statusNode.textContent = "Cargando análisis…";
        statusNode.setAttribute("role", "status");
        statusNode.setAttribute("aria-live", "polite");
        retryNode.hidden = true;
        try {
          const response = await fetchAnalysis(route.analysisId);
          const analysis = response.data;
          updateAnalysisStepper(mountRoot, analysis);
          if (draft) restoreForm(draft);
          else {
            mountRoot.querySelector("#analysis-open-date").value = String(analysis.fecha_apertura || analysis.fecha_inicializacion || "").slice(0, 10);
            mountRoot.querySelector("#analysis-indication").value = analysis.indicio_apertura || analysis.descripcion_apertura || "";
            mountRoot.querySelector("#analysis-final-conclusion").value = analysis.conclusion_final || "";
          }
        const resultCount = analysis.results?.length || 0;
        statusNode.textContent = `Analisis #${analysis.id} · ${analysis.estado} · ${analysis.estado === "cerrado" ? "cerrado" : "editable"} · ${resultCount} resultados trazados${resultCount ? "" : " · Aún no hay resultados registrados."}`;
        statusNode.dataset.state = (analysis.results || []).length ? "ready" : "empty";
        const comparison = analysis.template_comparison || {};
        const differenceNode = mountRoot.querySelector("#analysis-template-differences");
        if (differenceNode) {
          const newCount = (comparison.new_ids || []).length;
          const missingCount = (comparison.missing_ids || []).length;
          differenceNode.innerHTML = `<strong>Plantilla actual</strong><br>${newCount ? `${newCount} elemento(s) nuevo(s): causa/hipótesis no existente en el momento del análisis.` : "Sin elementos nuevos."}<br>${missingCount ? comparison.missing_message : "0 causas/hipótesis no encontradas en la plantilla actual"}`;
          differenceNode.dataset.missingCount = String(missingCount);
        }
        const readOnly = analysis.estado === "cerrado";
        analysisReadOnly = readOnly;
        ["#analysis-open-date", "#analysis-indication", "#analysis-final-conclusion", "#analysis-save-opening"].forEach((selector) => {
          const node = mountRoot.querySelector(selector);
          if (node) node.disabled = readOnly;
        });
        const closeButton = mountRoot.querySelector("#analysis-close-button");
        const reopenButton = mountRoot.querySelector("#analysis-reopen-button");
        if (closeButton) closeButton.disabled = readOnly;
        if (reopenButton) reopenButton.classList.toggle("hidden", !readOnly);
        Object.values(scientificFieldIds).forEach((id) => {
          const node = mountRoot.querySelector(`#${id}`);
          if (node) node.disabled = readOnly;
        });
        const firstResult = Array.isArray(analysis.results) ? analysis.results[0] : null;
        const scientificHypothesis = mountRoot.querySelector("#analysis-scientific-hypothesis-id");
        if (firstResult && scientificHypothesis && !scientificHypothesis.value && !draft) fillScientificForm(mountRoot, firstResult);
        if (!draft) analysisFormDirty = false;
        } catch (error) {
          if (draft) restoreForm(draft);
          const kind = classifyAnalysisError(error);
          const message = kind === "forbidden"
            ? "No tienes permisos para consultar este análisis. Solicita acceso al responsable."
            : kind === "offline"
              ? "No hay conexión con el servicio. El formulario queda intacto; reintenta cuando vuelva la red."
              : errorSummary(error);
          statusNode.textContent = message;
          statusNode.dataset.state = kind;
          statusNode.setAttribute("role", "alert");
          statusNode.setAttribute("aria-live", "polite");
          retryNode.hidden = false;
          throw error;
        }
      };
      retryNode.addEventListener("click", () => loadAnalysis({ preserveDraft: true }).catch(() => null));
      loadAnalysis().catch((error) => setAlert(alertNode, errorSummary(error), "error"));
      mountRoot.addEventListener("input", (event) => {
        if (event.target.closest(".analysis-workspace-panel") && event.target.id !== "analysis-scientific-hypothesis-id") analysisFormDirty = true;
      });
      mountRoot.addEventListener("click", (event) => {
        const hypothesisNode = event.target.closest("[data-hypothesis-id]");
        if (!hypothesisNode || !mountRoot.contains(hypothesisNode)) return;
        const id = hypothesisNode.getAttribute("data-hypothesis-id");
        const field = mountRoot.querySelector("#analysis-scientific-hypothesis-id");
        if (field) field.value = id || "";
        const help = mountRoot.querySelector("#analysis-scientific-help");
        if (help) help.textContent = id ? `Hipótesis #${id} seleccionada. Documenta la cadena y guarda la ficha.` : "Selecciona una hipótesis en el árbol.";
      });
      mountRoot.querySelector("#analysis-save-scientific")?.addEventListener("click", async () => {
        if (analysisReadOnly) {
          setAlert(alertNode, "El análisis está cerrado y no admite cambios. Reábrelo explícitamente para editar.", "error");
          return;
        }
        const values = readScientificForm(mountRoot);
        if (!values.hypothesis_id) {
          setAlert(alertNode, "Selecciona una hipótesis en el árbol antes de guardar su ficha.", "error");
          return;
        }
        const validationMessage = validateScientificForm(values);
        if (validationMessage) {
          setAlert(alertNode, validationMessage, "error");
          return;
        }
        try {
          await saveAnalysisResult(route.analysisId, {
            element_type: "hipotesis",
            hypothesis_id: Number(values.hypothesis_id),
            evaluation: values.decision,
            evidence: values.evidencia,
            conclusion: values.justificacion || values.decision,
            ...values,
          });
          analysisFormDirty = false;
          setAlert(alertNode, "Ficha científica guardada.");
          if (eventBus) await eventBus.emit("analysis:refresh");
        } catch (error) {
          // Keep every input intact so a transient API error can be retried.
          setAlert(alertNode, errorSummary(error, "No se pudo guardar la ficha científica."), "error");
        }
      });
      mountRoot.querySelector("#analysis-save-opening").addEventListener("click", async () => {
        try {
          await updateAnalysis(route.analysisId, { opening_date: mountRoot.querySelector("#analysis-open-date").value, indication: mountRoot.querySelector("#analysis-indication").value });
          setAlert(alertNode, "Apertura guardada.");
        } catch (error) { setAlert(alertNode, errorSummary(error, "No se pudo guardar la apertura."), "error"); }
      });
      mountRoot.querySelector("#analysis-close-button").addEventListener("click", async () => {
        try {
          await updateAnalysis(route.analysisId, { status: "cerrado", conclusion: mountRoot.querySelector("#analysis-final-conclusion").value });
          await loadAnalysis();
          if (eventBus) await eventBus.emit("analysis:refresh");
          setAlert(alertNode, "Analisis cerrado y conclusion guardada.");
        } catch (error) { setAlert(alertNode, errorSummary(error, "No se pudo cerrar el análisis."), "error"); }
      });
      mountRoot.querySelector("#analysis-reopen-button").addEventListener("click", async () => {
        try {
          await updateAnalysis(route.analysisId, { status: "abierto" });
          await loadAnalysis();
          if (eventBus) await eventBus.emit("analysis:refresh");
          setAlert(alertNode, "Analisis reabierto.");
        } catch (error) { setAlert(alertNode, errorSummary(error, "No se pudo reabrir el análisis."), "error"); }
      });
    },
  };
}
