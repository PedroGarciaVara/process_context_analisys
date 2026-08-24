import { deleteCausa, listCausas, updateHypothesis } from "../api/causas.js";
import { fetchAnalysis, saveAnalysisResult } from "../api/analysis.js";
import {
  AppState,
  hideTreeNode,
  setCurrentContract,
  setCurrentProcess,
  setTreeHypothesisStatus,
  setTreeSelection,
  setTreeZoom,
} from "../core/state.js";
import { renderDeleteModalShell, setDeleteModalContent } from "./detail-panels.js";
import {
  buildChildRoute,
  buildCreateCauseRoute,
  buildDeleteModalCopy,
  buildDetailRoute,
  decreaseZoom,
  increaseZoom,
  resetZoom,
} from "./tree-actions.js";
import {
  buildHypothesisOverrides,
  chooseFallbackNode,
  clonePayload,
  findParentId,
  pruneTree,
  removeNodeById,
  resolveTreeDisplayContext,
  resolveActiveTreeContractId,
} from "./tree-data.js";
import { renderDetailPanel, renderMain, renderSidebar, renderTreeCanvas } from "./tree-render.js";

export {
  normalizeHiddenNodeIds,
  pruneTree,
  resolveActiveTreeContractId,
} from "./tree-data.js";

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined && text !== null) {
    element.textContent = text;
  }
  return element;
}

function createTreePage(mode, state) {
  let sidebar = renderSidebar({ sidebar: null, contract: null });
  let main = renderMain({ top_context: null, zoom: 1.0, legend: [] });
  let detail = createElement("div", "acv2-detail-panel");
  detail.appendChild(createElement("div", "acv2-detail-card"));
  const deleteModalTemplate = renderDeleteModalShell();

  const page = {
    sidebar,
    main,
    detail,
    afterMount(root, _currentState, eventBus) {
      const treeSlot = main.querySelector(".acv2-canvas-shell");
      if (!treeSlot) {
        return;
      }
      const runtimeState = _currentState;
      const routeQuery = new URLSearchParams((window.location.hash || "").split("?")[1] || "");
      const analysisId = routeQuery.get("analysis_id");
      const routeContractId = routeQuery.get("contract_id");

      let currentPayload = null;
      let selectedCauseId = state?.tree?.selectedNodeId || null;
      let zoom = Number(state?.tree?.zoom || 1);
      let hiddenNodeIds = new Set(Array.isArray(state?.tree?.hiddenNodeIds) ? state.tree.hiddenNodeIds : []);
      let hypothesisOverrides = { ...(state?.tree?.hypothesisStates || {}) };
      let deleteTargetId = null;
      let modalNode = null;
      let loadToken = 0;
      let analysisResultsByHypothesis = {};

      const syncTreeState = () => {
        setTreeSelection(selectedCauseId);
        setTreeZoom(zoom);
        AppState.tree.hiddenNodeIds = Array.from(hiddenNodeIds);
        AppState.tree.hypothesisStates = { ...hypothesisOverrides };
      };

      const derivePayload = () => {
        const payload = clonePayload(currentPayload);
        payload.tree = pruneTree(payload.tree || [], hiddenNodeIds);
        payload.hypotheses_by_cause = buildHypothesisOverrides(payload.hypotheses_by_cause || {}, hypothesisOverrides);
        if (mode === "analisis_causas_v2") {
          Object.values(payload.hypotheses_by_cause).forEach((hypotheses) => hypotheses.forEach((hypothesis) => {
            const result = analysisResultsByHypothesis[String(hypothesis.id)];
            if (result) hypothesis.analysis_result = result;
          }));
        }
        const activeCause = chooseFallbackNode(payload.tree, hiddenNodeIds, selectedCauseId || payload.selected_cause_id);
        payload.selected_cause_id = activeCause ? activeCause.id : null;
        payload.zoom = zoom;
        payload.detail = {
          ...(payload.detail || {}),
          cause: activeCause,
          hypotheses: activeCause ? payload.hypotheses_by_cause[String(activeCause.id)] || [] : [],
          mode,
        };
        return payload;
      };

      const openDetailRoute = (cause) => {
        if (mode === "analisis_causas_v2") return;
        if (!cause) {
          return;
        }
        window.location.hash = buildDetailRoute(currentPayload?.contract?.id, cause.id);
      };

      const openChildRoute = (cause) => {
        if (mode === "analisis_causas_v2") return;
        if (!cause) {
          return;
        }
        window.location.hash = buildChildRoute(currentPayload?.contract?.id, cause.id);
      };

      const closeDeleteModal = () => {
        if (!modalNode) {
          return;
        }
        modalNode.classList.remove("is-open");
        modalNode.setAttribute("aria-hidden", "true");
        deleteTargetId = null;
      };

      const openDeleteModal = (cause) => {
        if (mode === "analisis_causas_v2") return;
        if (!cause || !modalNode) {
          return;
        }
        deleteTargetId = Number(cause.id);
        setDeleteModalContent(modalNode, buildDeleteModalCopy(cause));
        modalNode.classList.add("is-open");
        modalNode.setAttribute("aria-hidden", "false");
      };

      const applyHypothesisStatus = async (hypothesis, nextStatus) => {
        if (mode === "analisis_causas_v2") return;
        if (!hypothesis) {
          return;
        }
        hypothesisOverrides[String(hypothesis.id)] = nextStatus;
        setTreeHypothesisStatus(hypothesis.id, nextStatus);
        syncTreeState();
        renderPage();
        try {
          await updateHypothesis(hypothesis.id, {
            descripcion: hypothesis.descripcion || "",
            tipo: hypothesis.tipo || "aceptacion",
            criterio_validacion: hypothesis.criterio_validacion || "",
            estado: nextStatus === "retained" ? "retenida" : "descartada",
          });
        } catch (error) {
          window.console?.warn?.("Hypothesis update fell back to local state only", error);
        }
      };

      const evaluateAnalysisHypothesis = async (hypothesis, evaluation, evidence, errorNode) => {
        if (!String(evidence || "").trim()) {
          if (errorNode) errorNode.hidden = false;
          return;
        }
        try {
          const response = await saveAnalysisResult(analysisId, {
            element_type: "hipotesis",
            hypothesis_id: Number(hypothesis.id),
            evaluation,
            evidence: String(evidence).trim(),
            conclusion: evaluation === "confirmada" ? "Hipotesis aceptada" : "Hipotesis rechazada",
          });
          analysisResultsByHypothesis[String(hypothesis.id)] = response.data;
          renderPage();
        } catch (error) {
          if (errorNode) {
            errorNode.textContent = error.message;
            errorNode.hidden = false;
          }
        }
      };

      const renderPage = () => {
        if (!currentPayload) {
          return;
        }

        const payload = derivePayload();
        payload.display_context = resolveTreeDisplayContext(payload, AppState.catalog);
        payload.contract_options = (AppState.catalog?.data?.contratos || []).map((item) => ({
          id: item.id,
          name: item.name,
          processId: item.processId,
          processName: item.processName,
          objetivo: item.objetivo,
        }));
        const activeCause = payload.detail?.cause || null;
        const sidebarNode = renderSidebar(payload);
        const mainNode = renderMain(payload);
        const detailNode = createElement("div", `acv2-detail-panel ${mode === "analisis_causas_v2" ? "analysis-detail-panel" : ""}`.trim());
        const detailCardNode = createElement("div", "acv2-detail-card");
        detailCardNode.appendChild(
          renderDetailPanel(payload, {
            onOpenDetail: openDetailRoute,
            onNewChild: openChildRoute,
            onDelete: openDeleteModal,
            onVerifyHypothesis: (hypothesis) => applyHypothesisStatus(hypothesis, "retained"),
            onDiscardHypothesis: (hypothesis) => applyHypothesisStatus(hypothesis, "discarded"),
            onEvaluateHypothesis: (hypothesis, evaluation, evidence, errorNode) => evaluateAnalysisHypothesis(hypothesis, evaluation, evidence, errorNode),
          }),
        );
        const modalNodeClone = deleteModalTemplate.cloneNode(true);
        detailCardNode.appendChild(modalNodeClone);
        detailNode.appendChild(detailCardNode);

        sidebar.replaceWith(sidebarNode);
        main.replaceWith(mainNode);
        detail.replaceWith(detailNode);
        sidebar = sidebarNode;
        main = mainNode;
        detail = detailNode;
        modalNode = modalNodeClone;

        const canvas = mainNode.querySelector(".acv2-canvas-shell");
        if (canvas) {
          canvas.replaceChildren(renderTreeCanvas(payload));
        }

        const zoomLabel = mainNode.querySelector(".acv2-context-overline");
        if (zoomLabel) {
          zoomLabel.textContent = `ZOOM ${Number(zoom || 1).toFixed(2)}x`;
        }

        const zoomButtons = Array.from(mainNode.querySelectorAll(".acv2-zoom-btn"));
        if (zoomButtons[0]) {
          zoomButtons[0].addEventListener("click", () => {
            zoom = increaseZoom(zoom);
            syncTreeState();
            loadPayload();
          });
        }
        if (zoomButtons[1]) {
          zoomButtons[1].addEventListener("click", () => {
            zoom = decreaseZoom(zoom);
            syncTreeState();
            loadPayload();
          });
        }
        if (zoomButtons[2]) {
          zoomButtons[2].addEventListener("click", () => {
            zoom = resetZoom();
            syncTreeState();
            loadPayload();
          });
        }

        const sidebarAction = sidebarNode.querySelector(".acv2-sidebar-primary");
        if (sidebarAction) {
          if (mode === "analisis_causas_v2") {
            sidebarAction.disabled = true;
          }
          sidebarAction.addEventListener("click", () => {
            if (mode === "analisis_causas_v2") return;
            const contractId = payload.contract?.id || "";
            const selectedNode = activeCause || payload.tree?.[0] || null;
            window.location.hash = buildCreateCauseRoute(mode, contractId, selectedNode?.id);
          });
        }

        const contractSelect = sidebarNode.querySelector("select");
        if (contractSelect && !contractSelect.disabled) {
          contractSelect.addEventListener("change", () => {
            const nextContractId = contractSelect.value ? Number(contractSelect.value) : null;
            const nextContract = (AppState.catalog?.data?.contratos || []).find(
              (item) => String(item.id) === String(nextContractId || ""),
            );
            setCurrentContract(nextContractId);
            if (nextContract?.processId) {
              setCurrentProcess(nextContract.processId);
              setCurrentContract(nextContractId);
            }
            selectedCauseId = null;
            hiddenNodeIds = new Set();
            hypothesisOverrides = {};
            syncTreeState();
            if (eventBus) {
              eventBus.emit("state:change");
            } else {
              loadPayload();
            }
          });
        }

        const modalCancel = modalNode.querySelector('[data-modal-action="cancel"]');
        const modalConfirm = modalNode.querySelector('[data-modal-action="confirm"]');
        if (modalCancel) {
          modalCancel.addEventListener("click", closeDeleteModal);
        }
        if (modalConfirm) {
          modalConfirm.addEventListener("click", () => {
            if (deleteTargetId === null || deleteTargetId === undefined) {
              closeDeleteModal();
              return;
            }
            deleteCausa(deleteTargetId).catch(() => null);
            hiddenNodeIds.add(deleteTargetId);
            hideTreeNode(deleteTargetId);
            const nextTree = removeNodeById(currentPayload.tree || [], deleteTargetId);
            const fallback = chooseFallbackNode(nextTree, hiddenNodeIds, findParentId(currentPayload.tree || [], deleteTargetId));
            selectedCauseId = fallback ? fallback.id : null;
            syncTreeState();
            closeDeleteModal();
            loadPayload();
          });
        }
        mainNode.addEventListener("tree:select-node", (event) => {
          const nodeId = event.detail?.nodeId;
          if (nodeId !== null && nodeId !== undefined) {
            selectedCauseId = Number(nodeId);
            syncTreeState();
            loadPayload();
          }
        });
      };

      const loadPayload = async () => {
        const token = ++loadToken;
        try {
          const activeContractId = routeContractId || resolveActiveTreeContractId(state, runtimeState);
          const payload = await listCausas(mode, {
            contract_id: activeContractId,
            selected_cause_id: selectedCauseId,
            zoom,
          });
          if (token !== loadToken) {
            return;
          }
          currentPayload = payload;
          if (mode === "analisis_causas_v2" && analysisId) {
            const analysisResponse = await fetchAnalysis(analysisId);
            analysisResultsByHypothesis = Object.fromEntries(
              (analysisResponse.data?.results || [])
                .filter((result) => result.tipo_elemento === "hipotesis")
                .map((result) => [String(result.hipotesis_id), result]),
            );
          }
          const visible = chooseFallbackNode(payload.tree || [], hiddenNodeIds, payload.selected_cause_id);
          if (visible && String(visible.id) !== String(payload.selected_cause_id || "")) {
            selectedCauseId = visible.id;
            syncTreeState();
            const refreshedContractId = routeContractId || resolveActiveTreeContractId(state, runtimeState);
            const refreshed = await listCausas(mode, {
              contract_id: refreshedContractId,
              selected_cause_id: selectedCauseId,
              zoom,
            });
            if (token !== loadToken) {
              return;
            }
            currentPayload = refreshed;
          } else {
            selectedCauseId = payload.selected_cause_id || visible?.id || null;
            syncTreeState();
          }
          renderPage();
        } catch (error) {
          window.console?.error?.(error);
          treeSlot.replaceChildren(createElement("div", "acv2-empty-state", "No hay datos de arbol disponibles."));
        }
      };

      loadPayload();
    },
  };

  return page;
}

export function createTreePageShell(mode, state) {
  return createTreePage(mode, state);
}
