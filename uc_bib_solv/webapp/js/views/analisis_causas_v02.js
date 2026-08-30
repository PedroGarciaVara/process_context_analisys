import { createAnalysis, fetchAnalysis, listAnalysisTemplates, updateAnalysis } from "../api/analysis.js";
import { findContract, findMachine, findProcess } from "../core/operational.js";
import { createElement, escapeHtml } from "../core/utils.js";
import { createTreePageShell } from "../components/tree-shell.js";
import { bindHomeShellV02, createHomeShellV02 } from "./shell_v02.js";

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

function buildHero(state, analysis = null) {
  const process = findProcess(state, analysis?.proceso_id || state.currentProcess);
  const contract = findContract(state, analysis?.contrato_id || state.currentContract);
  const machine = findMachine(state, analysis?.maquina_id || state.currentMachine);
  return `
    <section class="space-y-sm mb-xl">
      <span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de trabajo de investigacion</span>
      <div class="flex items-end justify-between gap-lg flex-wrap">
        <div>
          <h1 class="font-display-lg text-display-lg text-on-background">Analisis causas</h1>
          <p class="font-body-md text-body-md text-secondary max-w-3xl">Abre una investigacion desde una plantilla causal, registra el indicio y deja trazabilidad de cada evaluacion hasta la conclusion final.</p>
        </div>
        <span class="px-sm py-xs bg-primary-container text-on-primary text-[11px] font-bold rounded uppercase">${escapeHtml(contract?.name || machine?.name || process?.name || "Nuevo analisis")}</span>
      </div>
    </section>
  `;
}

function buildOpenPanel(state) {
  const processes = state.catalog?.data?.procesos || [];
  const initialProcess = processes[0]?.id || "";
  return `
    <section class="max-w-4xl mx-auto space-y-lg">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
        <p class="font-label-md text-label-md text-primary uppercase tracking-widest">Paso 1</p>
        <h2 class="font-headline-lg text-headline-lg text-primary mt-xs">Abrir nuevo analisis</h2>
        <p class="font-body-md text-body-md text-secondary mt-sm">Selecciona el proceso y carga una plantilla de causas existente para iniciar la investigacion.</p>
        <div class="grid md:grid-cols-2 gap-lg mt-xl">
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Proceso del analisis</span><select id="analysis-process-select" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"><option value="">Selecciona proceso</option>${processes.map((item) => `<option value="${escapeHtml(item.id)}"${String(item.id) === String(initialProcess) ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Plantilla de causas</span><select id="analysis-template-select" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"><option value="">Cargando plantillas...</option></select></label>
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Dia de apertura</span><input id="analysis-opening-date" type="date" value="${today()}" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"></label>
          <label class="block space-y-xs"><span class="font-label-md text-label-md text-secondary">Participante inicial</span><input id="analysis-participant" type="text" value="Usuario" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"></label>
        </div>
        <label class="block space-y-xs mt-lg"><span class="font-label-md text-label-md text-secondary">Indicio que origina la apertura</span><textarea id="analysis-opening-indication" rows="4" placeholder="Describe el evento, desviacion o evidencia que inicia el analisis" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low"></textarea></label>
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
      </div>
      <div id="analysis-workspace-alert" class="hidden rounded-lg border px-md py-sm text-[12px]"></div>
    </div>
  `;
}

function setAlert(node, message, tone = "success") {
  node.textContent = message;
  node.className = `rounded-lg border px-md py-sm text-[12px] ${tone === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`;
}

async function loadTemplates(select, processId) {
  const response = await listAnalysisTemplates(processId);
  const templates = response.data || [];
  select.innerHTML = templates.length
    ? templates.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)} (${item.causa_count} causas, ${item.hypothesis_count} hipotesis)</option>`).join("")
    : `<option value="">No hay plantillas para este proceso</option>`;
}

export function renderAnalisisCausasV02Shell(state) {
  const route = readRouteParams();
  if (!route.analysisId) {
    const { root, mainSlot, rightSlot } = createHomeShellV02(state, { rightWidthClass: "w-[420px]" });
    mainSlot.innerHTML = buildHero(state) + buildOpenPanel(state);
    rightSlot.innerHTML = `<div class="p-lg"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Flujo</p><p class="font-headline-md text-primary mt-sm">Preparar, evaluar, cerrar</p><p class="text-[12px] text-on-surface-variant mt-sm">La plantilla seleccionada conserva el arbol causal y sus hipotesis para registrar la traza del analisis.</p></div>`;
    return {
      shellMode: "full",
      main: root,
      afterMount(mountRoot, currentState, eventBus) {
        document.title = "Industrial RCA - Nuevo analisis";
        bindHomeShellV02(mountRoot);
        const processSelect = mountRoot.querySelector("#analysis-process-select");
        const templateSelect = mountRoot.querySelector("#analysis-template-select");
        const alertNode = mountRoot.querySelector("#analysis-open-alert");
        loadTemplates(templateSelect, processSelect.value).catch((error) => setAlert(alertNode, error.message, "error"));
        processSelect.addEventListener("change", () => loadTemplates(templateSelect, processSelect.value).catch((error) => setAlert(alertNode, error.message, "error")));
        mountRoot.querySelector("#analysis-open-button").addEventListener("click", async () => {
          try {
            const response = await createAnalysis({
              process_id: processSelect.value,
              template_contract_id: templateSelect.value,
              opening_date: mountRoot.querySelector("#analysis-opening-date").value,
              indication: mountRoot.querySelector("#analysis-opening-indication").value,
              participant: mountRoot.querySelector("#analysis-participant").value,
            });
            const analysis = response.data;
            window.location.hash = `#/analisis_causas_v02?contract_id=${encodeURIComponent(analysis.contrato_id)}&analysis_id=${encodeURIComponent(analysis.id)}`;
          } catch (error) {
            setAlert(alertNode, error.message, "error");
          }
        });
      },
    };
  }

  const treePage = createTreePageShell("analisis_causas_v2", state);
  const { root, mainSlot, rightSlot } = createHomeShellV02(state, { rightWidthClass: "w-[460px]" });
  const mainWrap = createElement("div", { className: "max-w-none mx-auto space-y-xl min-w-0" });
  mainWrap.innerHTML = buildHero(state);
  mainWrap.appendChild(treePage.main);
  mainSlot.appendChild(mainWrap);
  const workspace = createElement("aside", { className: "analysis-workspace-panel" });
  workspace.innerHTML = buildWorkspacePanel();
  rightSlot.append(treePage.detail, workspace);

  return {
    shellMode: "full",
    main: root,
    afterMount(mountRoot, currentState, eventBus) {
      document.title = "Industrial RCA - Analisis causas";
      bindHomeShellV02(mountRoot);
      if (typeof treePage.afterMount === "function") treePage.afterMount(mountRoot, currentState, eventBus);
      const alertNode = mountRoot.querySelector("#analysis-workspace-alert");
      const statusNode = mountRoot.querySelector("#analysis-workspace-status");
      const loadAnalysis = async () => {
        const response = await fetchAnalysis(route.analysisId);
        const analysis = response.data;
        mountRoot.querySelector("#analysis-open-date").value = String(analysis.fecha_apertura || analysis.fecha_inicializacion || "").slice(0, 10);
        mountRoot.querySelector("#analysis-indication").value = analysis.indicio_apertura || analysis.descripcion_apertura || "";
        mountRoot.querySelector("#analysis-final-conclusion").value = analysis.conclusion_final || "";
        statusNode.textContent = `Analisis #${analysis.id} · ${analysis.estado} · ${analysis.estado === "cerrado" ? "solo lectura" : "editable"} · ${analysis.results?.length || 0} resultados trazados`;
        const comparison = analysis.template_comparison || {};
        const differenceNode = mountRoot.querySelector("#analysis-template-differences");
        if (differenceNode) {
          const newCount = (comparison.new_ids || []).length;
          const missingCount = (comparison.missing_ids || []).length;
          differenceNode.innerHTML = `<strong>Plantilla actual</strong><br>${newCount ? `${newCount} elemento(s) nuevo(s): causa/hipótesis no existente en el momento del análisis.` : "Sin elementos nuevos."}<br>${missingCount ? comparison.missing_message : "0 causas/hipótesis no encontradas en la plantilla actual"}`;
          differenceNode.dataset.missingCount = String(missingCount);
        }
        const readOnly = analysis.estado === "cerrado";
        ["#analysis-open-date", "#analysis-indication", "#analysis-final-conclusion", "#analysis-save-opening"].forEach((selector) => {
          const node = mountRoot.querySelector(selector);
          if (node) node.disabled = readOnly;
        });
      };
      loadAnalysis().catch((error) => setAlert(alertNode, error.message, "error"));
      mountRoot.querySelector("#analysis-save-opening").addEventListener("click", async () => {
        try {
          await updateAnalysis(route.analysisId, { opening_date: mountRoot.querySelector("#analysis-open-date").value, indication: mountRoot.querySelector("#analysis-indication").value });
          setAlert(alertNode, "Apertura guardada.");
        } catch (error) { setAlert(alertNode, error.message, "error"); }
      });
      mountRoot.querySelector("#analysis-close-button").addEventListener("click", async () => {
        try {
          await updateAnalysis(route.analysisId, { status: "cerrado", conclusion: mountRoot.querySelector("#analysis-final-conclusion").value });
          await loadAnalysis();
          setAlert(alertNode, "Analisis cerrado y conclusion guardada.");
        } catch (error) { setAlert(alertNode, error.message, "error"); }
      });
    },
  };
}
