import { deleteCausa, listCausas, moveCausa, updateHypothesis } from "../api/causas.js";
import { fetchAnalysis, saveAnalysisResult } from "../api/analysis.js";
import {
  AppState,
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
  pruneTree,
  resolveTreeDisplayContext,
  resolveActiveTreeContractId,
} from "./tree-data.js";
import { renderDetailPanel, renderMain, renderSidebar, renderTreeCanvas } from "./tree-render.js";
import { createTreeMoveDialog } from "./tree-move-dialog.js";

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

function errorDetails(error) {
  return {
    status: Number(error?.status || 0),
    code: String(error?.code || error?.data?.code || "RCA_REQUEST_FAILED"),
    correlation: String(error?.correlation_id || error?.data?.correlation_id || "no disponible"),
    message: String(error?.message || "No se pudo cargar el árbol."),
  };
}

function networkState(error) {
  const details = errorDetails(error);
  if (details.status === 403) return "forbidden";
  if (details.status === 0 || (typeof navigator !== "undefined" && navigator.onLine === false)) return "offline";
  return "error";
}

function createTreePage(mode, state) {
  let sidebar = renderSidebar({ sidebar: null, contract: null });
  let main = renderMain({ top_context: null, zoom: 1.0, legend: [] });
  let detail = createElement("div", "acv2-detail-panel");
  detail.appendChild(createElement("div", "acv2-detail-card"));
  const deleteModalTemplate = renderDeleteModalShell();
  let teardown = null;

  const page = {
    sidebar,
    main,
    detail,
    beforeUnmount() {
      teardown?.();
      teardown = null;
    },
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
      let deleteTrigger = null;
      let loadToken = 0;
      let disposed = false;
      let deletePending = false;
      let analysisResultsByHypothesis = {};
      const moveDialog = createTreeMoveDialog({ onMove: moveCausa });
      const openMoveDialog = (detail = {}) => {
        if (mode === "analisis_causas_v2" || !currentPayload) return;
        const causeId = detail.causeId ?? selectedCauseId ?? currentPayload.selected_cause_id;
        moveDialog.open({
          causeId,
          parentId: detail.parentId,
          tree: currentPayload.tree || [],
          payload: currentPayload,
          source: detail.source || "keyboard",
        });
      };

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
        document.removeEventListener("keydown", onDeleteModalKeyDown);
        if (!disposed) deleteTrigger?.focus?.();
        deleteTrigger = null;
      };

      const onDeleteModalKeyDown = (event) => {
        if (!modalNode || modalNode.getAttribute("aria-hidden") !== "false") return;
        if (event.key === "Escape") {
          event.preventDefault();
          closeDeleteModal();
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = Array.from(modalNode.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex=\"-1\"])"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      const openDeleteModal = (cause) => {
        if (mode === "analisis_causas_v2") return;
        if (!cause || !modalNode) {
          return;
        }
        deleteTargetId = Number(cause.id);
        const isRootCause = (currentPayload?.tree || []).some((root) => String(root.id) === String(cause.id));
        setDeleteModalContent(modalNode, buildDeleteModalCopy(cause, { protectedRoot: isRootCause }));
        deleteTrigger = document.activeElement;
        modalNode.classList.add("is-open");
        modalNode.setAttribute("aria-hidden", "false");
        document.addEventListener("keydown", onDeleteModalKeyDown);
        modalNode.querySelector('[data-modal-action="cancel"]')?.focus();
      };

      const setTreeStatus = (kind, message, { retry = false } = {}) => {
        const old = treeSlot.querySelector("[data-tree-network-status]");
        if (old) old.remove();
        Array.from(treeSlot.children).filter((child) => child.textContent === "Cargando arbol...").forEach((child) => child.remove());
        const status = createElement("div", `acv2-empty-state acv2-network-state acv2-network-state--${kind}`);
        status.dataset.treeNetworkStatus = kind;
        status.setAttribute("role", kind === "error" || kind === "forbidden" ? "alert" : "status");
        status.setAttribute("aria-live", "polite");
        status.appendChild(createElement("p", "acv2-network-state__message", message));
        if (retry) {
          const button = createElement("button", "btn btn-secondary", "Reintentar");
          button.type = "button";
          button.dataset.action = "tree-retry";
          button.addEventListener("click", () => loadPayload());
          status.appendChild(button);
        }
        treeSlot.prepend(status);
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

      const evaluateAnalysisHypothesis = async (hypothesis, evaluation, evidence, criterion, decisionJustification, errorNode) => {
        if (!String(evidence || "").trim() || !String(criterion || "").trim()) {
          if (errorNode) errorNode.textContent = "Una decisión confirmada o rechazada requiere evidencia y criterio.";
          if (errorNode) errorNode.hidden = false;
          return;
        }
        const justification = String(decisionJustification || "").trim();
        if (evaluation === "descartada" && !justification) {
          if (errorNode) errorNode.textContent = "Una decisión NO OK requiere justificación.";
          if (errorNode) errorNode.hidden = false;
          return;
        }
        try {
          const response = await saveAnalysisResult(analysisId, {
            element_type: "hipotesis",
            hypothesis_id: Number(hypothesis.id),
            evaluation,
            evidence: String(evidence).trim(),
            validation_criterion: String(criterion).trim(),
            conclusion: justification || (evaluation === "confirmada" ? "Hipotesis aceptada" : "Hipotesis rechazada"),
            decision_justification: justification || null,
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
        if (disposed || !currentPayload) {
          return;
        }

        const payload = derivePayload();
        payload.display_context = resolveTreeDisplayContext(payload, AppState.catalog);
        const processId = runtimeState?.currentProcess || state?.currentProcess || "";
        payload.contract_options = (AppState.catalog?.data?.contratos || [])
          .filter((item) => !processId || String(item.processId) === String(processId))
          .map((item) => ({
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
            onEvaluateHypothesis: (hypothesis, evaluation, evidence, criterion, comment, errorNode) => evaluateAnalysisHypothesis(hypothesis, evaluation, evidence, criterion, comment, errorNode),
          }),
        );
        const modalNodeClone = deleteModalTemplate.cloneNode(true);
        detailNode.appendChild(detailCardNode);

        // This overlay is viewport-scoped, so it must live outside the sticky
        // detail panel's clipping and stacking boundaries.
        document.querySelectorAll('.modal-overlay[data-modal-kind="rca-delete"]').forEach((node) => node.remove());
        document.body.appendChild(modalNodeClone);

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

        const moveButton = createElement("button", "acv2-tree-move-action", "Mover causa…");
        moveButton.type = "button";
        moveButton.dataset.action = "tree-move-cause";
        moveButton.setAttribute("aria-label", "Mover causa seleccionada…");
        moveButton.disabled = mode === "analisis_causas_v2" || !activeCause;
        moveButton.addEventListener("click", () => {
          const event = new CustomEvent("rca:cause-move-request", {
            bubbles: true,
            detail: { causeId: activeCause?.id ?? selectedCauseId, parentId: undefined, source: "keyboard" },
          });
          moveButton.dispatchEvent(event);
        });
        const toolbar = mainNode.querySelector(".acv2-tree-toolbar");
        if (toolbar) toolbar.prepend(moveButton);

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
          modalConfirm.addEventListener("click", async () => {
            if (deleteTargetId === null || deleteTargetId === undefined) {
              closeDeleteModal();
              return;
            }
            if (deletePending) return;
            deletePending = true;
            modalConfirm.disabled = true;
            const cancel = modalNode.querySelector('[data-modal-action="cancel"]');
            if (cancel) cancel.disabled = true;
            const body = modalNode.querySelector("[data-modal-body]");
            const pending = createElement("p", "detail-modal-note", "Eliminando… El nodo seguirá visible hasta confirmar el servidor.");
            pending.setAttribute("role", "status");
            pending.setAttribute("aria-live", "polite");
            body?.appendChild(pending);
            try {
              await deleteCausa(deleteTargetId);
              closeDeleteModal();
              await loadPayload();
            } catch (error) {
              const details = errorDetails(error);
              const failure = createElement("p", "detail-modal-note", `${details.message} Código: ${details.code}. Correlación: ${details.correlation}. El nodo sigue visible; reintenta.`);
              failure.setAttribute("role", "alert");
              body?.appendChild(failure);
              modalConfirm.disabled = false;
              if (cancel) cancel.disabled = false;
            } finally {
              deletePending = false;
            }
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
        if (disposed) return;
        const token = ++loadToken;
        setTreeStatus("loading", "Cargando árbol…");
        try {
          const activeContractId = routeContractId || resolveActiveTreeContractId(state, runtimeState);
          if (!activeContractId) {
            currentPayload = {
              view: mode,
              contract: null,
              analysis: null,
              top_context: { title: "No hay contratos", subtitle: "Selecciona un contrato para visualizar el árbol." },
              sidebar: { nav: [], action_label: "Add Root Cause" },
              zoom,
              selected_cause_id: null,
              tree: [],
              hypotheses_by_cause: {},
              detail: { cause: null, hypotheses: [], mode, context_message: "Selecciona un contrato para visualizar el árbol." },
              legend: [],
            };
            selectedCauseId = null;
            syncTreeState();
            renderPage();
            setTreeStatus("empty", "No hay contrato seleccionado. Selecciona un contrato para visualizar el árbol.");
            return;
          }
          const payload = await listCausas(mode, {
            contract_id: activeContractId,
            selected_cause_id: selectedCauseId,
            zoom,
          });
          if (disposed || token !== loadToken) {
            return;
          }
          currentPayload = payload;
          if (mode === "analisis_causas_v2" && analysisId) {
            const analysisResponse = await fetchAnalysis(analysisId);
            // The tree endpoint selects the most relevant analysis for a
            // contract, but this route may explicitly target an older or
            // already closed analysis. Keep the URL analysis as the source
            // of truth for status, evidence and non-editable rendering.
            currentPayload.analysis = analysisResponse.data;
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
            if (disposed || token !== loadToken) {
              return;
            }
            currentPayload = refreshed;
          } else {
            selectedCauseId = payload.selected_cause_id || visible?.id || null;
            syncTreeState();
          }
          if (disposed || token !== loadToken) return;
          renderPage();
          if (!Array.isArray(currentPayload?.tree) || currentPayload.tree.length === 0) {
            setTreeStatus("empty", "El contrato no tiene causas todavía.");
          } else {
            const status = treeSlot.querySelector("[data-tree-network-status]");
            if (status) status.remove();
          }
        } catch (error) {
          if (disposed || token !== loadToken) return;
          window.console?.error?.(error);
          const details = errorDetails(error);
          const kind = networkState(error);
          const message = kind === "forbidden"
            ? "No tienes permisos para consultar este árbol. Solicita acceso al responsable del contrato."
            : kind === "offline"
              ? "No hay conexión con el servicio. Comprueba la red y reintenta."
              : `${details.message} Código: ${details.code}. Correlación: ${details.correlation}.`;
          treeSlot.replaceChildren();
          setTreeStatus(kind, message, { retry: true });
        }
      };

      const removeAnalysisRefresh = mode === "analisis_causas_v2" && eventBus
        ? eventBus.on("analysis:refresh", loadPayload)
        : null;

      const onMoveRequest = (event) => {
        openMoveDialog(event.detail || {});
      };
      const onMoveConfirmed = () => {
        window.setTimeout(() => loadPayload(), 200);
      };
      root.addEventListener("rca:cause-move-request", onMoveRequest);
      moveDialog.element.addEventListener("rca:cause-move-confirmed", onMoveConfirmed);
      root.appendChild(moveDialog.element);

      teardown = () => {
        disposed = true;
        loadToken += 1;
        closeDeleteModal();
        document.removeEventListener("keydown", onDeleteModalKeyDown);
        document.querySelectorAll('.modal-overlay[data-modal-kind="rca-delete"]').forEach((node) => node.remove());
        moveDialog.close();
        root.removeEventListener("rca:cause-move-request", onMoveRequest);
        moveDialog.element.removeEventListener("rca:cause-move-confirmed", onMoveConfirmed);
        removeAnalysisRefresh?.();
      };

      loadPayload();
    },
  };

  return page;
}

export function createTreePageShell(mode, state) {
  return createTreePage(mode, state);
}
