import { createElement, clearNode, escapeHtml } from "../../core/utils.js";
import {
  createCausa,
  createContractNode,
  createHypothesis,
  deleteHypothesis,
  fetchCausaDetail,
  fetchHypothesisDeletePreview,
  linkReusableNode,
  searchReusableNodes,
  updateCausa,
  updateHypothesis,
} from "../../api/causas.js";
import {
  renderContextBanner,
  renderDeleteModalShell,
  renderHypothesisList,
  setDeleteModalContent,
} from "../../components/detail-panels.js";
import { AppState, setCurrentContract, setCurrentProcess } from "../../core/state.js";
import { getContracts } from "../../core/operational.js";
import { bindHomeShell, createHomeShell } from "../bpm/shell.js";
import { createCausaDetailHypothesisActions } from "../../controllers/causa-detail-hypotheses.js";
import { createCausaDetailReusableNodeActions } from "../../controllers/causa-detail-reusable-nodes.js";
import { createCausaDetailCauseActions } from "../../controllers/causa-detail-cause-actions.js";
import { createCausaDetailEditor } from "../../controllers/causa-detail-editor.js";
import { buildDetailField, setDetailSelectOptions } from "../../components/causa-detail/shared-fields.js";
import { createHypothesisCard } from "../../components/causa-detail/hypothesis-card.js";
import { createEditorCard } from "../../components/causa-detail/editor-card.js";
import { createReusableNodeSearch } from "../../components/causa-detail/reusable-node-search.js";

export function buildCausaDetalleHash(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return `#/causa_detalle${query ? `?${query}` : ""}`;
}

function buildTreeHash(contractId) {
  return contractId
    ? `#/arboles?contract_id=${encodeURIComponent(String(contractId))}`
    : "#/arboles";
}

function readRouteParams() {
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  const query = queryIndex >= 0 ? hash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);
  return {
    contrato_id: params.get("contrato_id") || "",
    causa_id: params.get("causa_id") || "",
    parent_id: params.get("parent_id") || "",
    hipotesis_id: params.get("hipotesis_id") || "",
  };
}

export function getEditorModeOptions(params = {}) {
  const hasCause = Boolean(params.causa_id);
  const hasParentCause = Boolean(params.parent_id);

  if (hasCause) {
    return [
      { value: "edit_cause", label: "Editar causa", kind: "edit" },
    ];
  }

  if (hasParentCause) {
    return [
      { value: "new_cause", label: "Crear causa nueva", kind: "create" },
      { value: "link_existing_cause", label: "Vincular causa existente", kind: "link" },
      { value: "link_existing_contract", label: "Vincular contrato existente", kind: "link" },
    ];
  }

  return [
    { value: "new_cause", label: "Crear causa nueva", kind: "create" },
    { value: "new_contract", label: "Crear contrato nuevo", kind: "create" },
    { value: "link_existing_cause", label: "Vincular causa existente", kind: "link" },
    { value: "link_existing_contract", label: "Vincular contrato existente", kind: "link" },
  ];
}

function isLinkMode(mode) {
  return mode === "link_existing_cause" || mode === "link_existing_contract";
}

function getLinkNodeType(mode) {
  return mode === "link_existing_contract" ? "CONTRACT" : "CAUSE";
}

function getEditorConfig(mode, payload) {
  if (mode === "new_contract") {
    return {
      title: "Alta de contrato reutilizable",
      help: "Crea un contrato hijo heredando el proceso del contrato activo. El KPI y el objetivo se sincronizan con su plantilla RCA.",
      nameLabel: "Nombre del contrato",
      categoryLabel: "Metrica",
      descriptionLabel: "Objetivo",
      typeVisible: false,
      saveLabel: "Crear contrato hijo",
    };
  }

  if (mode === "link_existing_contract") {
    return {
      title: "Vinculo de contrato existente",
      help: payload?.parent_id
        ? "Busca un contrato ya existente y vinculalo como descendiente estructural de la causa activa sin duplicarlo."
        : "Busca un contrato corporativo ya existente y vinculalo como hijo del contrato activo sin duplicarlo.",
      saveLabel: "Vincular contrato existente",
      searchButtonLabel: "Buscar contrato existente",
      emptySelection: "Todavia no has seleccionado un contrato reutilizable.",
    };
  }

  if (mode === "link_existing_cause") {
    return {
      title: "Vinculo de causa existente",
      help: payload?.parent_id
        ? "Busca una causa ya registrada para enlazarla como hija de la causa activa."
        : "Busca una causa ya registrada para reutilizarla bajo el contrato activo.",
      saveLabel: "Vincular causa existente",
      searchButtonLabel: "Buscar causa existente",
      emptySelection: "Todavia no has seleccionado una causa reutilizable.",
    };
  }

  if (payload?.causa_id) {
    return {
      title: "Edicion de causa",
      help: "Actualiza la causa activa y mantiene la gestion de hipotesis en el mismo contexto industrial.",
      nameLabel: "Nombre",
      categoryLabel: "Categoria",
      descriptionLabel: "Descripcion",
      typeVisible: true,
      saveLabel: payload.labels?.cause_save || "Actualizar causa",
    };
  }

  return {
    title: payload?.parent_id ? "Alta de causa hija" : "Alta de causa raiz",
    help: payload?.parent_id
      ? "Crea una causa hija nueva o reutiliza una ya existente para continuar el arbol desde la causa padre."
      : "Crea una nueva causa raiz o reutiliza contratos y causas existentes bajo el contrato activo.",
    nameLabel: "Nombre",
    categoryLabel: "Categoria",
    descriptionLabel: "Descripcion",
    typeVisible: true,
    saveLabel: payload?.labels?.cause_save || "Guardar causa",
  };
}

function renderReusableSummary(node) {
  if (!node) {
    return createElement("div", {
      className: "detail-empty-state detail-empty-state--compact",
      text: "Selecciona primero un contrato o una causa reutilizable.",
    });
  }

  const wrapper = createElement("article", { className: "detail-reusable-card is-selected" });
  const meta = (node.meta || []).join(" · ");
  wrapper.append(
    createElement("div", {
      className: "detail-reusable-card__top",
      children: [
        createElement("div", {
          children: [
            createElement("div", { className: "detail-reusable-card__title", text: node.name || "Nodo sin nombre" }),
            createElement("div", {
              className: "detail-reusable-card__subtitle",
              text: [node.code, meta].filter(Boolean).join(" · ") || "Sin metadata adicional",
            }),
          ],
        }),
        createElement("span", {
          className: "status-chip tone-primary",
          text: node.node_type === "CONTRACT" ? "Contrato" : "Causa",
        }),
      ],
    }),
    createElement("p", {
      className: "detail-reusable-card__text",
      text: node.detail_text || node.description || "Sin detalle descriptivo.",
    }),
  );
  return wrapper;
}

function renderReusableResults(items, selectedNodeId) {
  const list = createElement("div", { className: "detail-reusable-results" });
  if (!items || items.length === 0) {
    list.appendChild(createElement("div", {
      className: "detail-empty-state",
      text: "No hay coincidencias con los filtros actuales.",
    }));
    return list;
  }

  items.forEach((item) => {
    const article = createElement("article", {
      className: `detail-reusable-card${Number(selectedNodeId) === Number(item.node_id) ? " is-selected" : ""}`,
    });
    const metaText = (item.meta || []).join(" · ");
    const chips = createElement("div", { className: "detail-reusable-card__chips" });
    if (item.reused) {
      chips.appendChild(createElement("span", {
        className: "status-chip tone-warning",
        text: "Reutilizado",
      }));
    }
    if (item.already_linked) {
      chips.appendChild(createElement("span", {
        className: "status-chip tone-neutral",
        text: "Ya vinculado",
      }));
    }

    article.append(
      createElement("div", {
        className: "detail-reusable-card__top",
        children: [
          createElement("div", {
            children: [
              createElement("div", {
                className: "detail-reusable-card__title",
                text: item.name || "Nodo sin nombre",
              }),
              createElement("div", {
                className: "detail-reusable-card__subtitle",
                text: [item.code, metaText].filter(Boolean).join(" · ") || "Sin metadata adicional",
              }),
            ],
          }),
          chips,
        ],
      }),
      createElement("p", {
        className: "detail-reusable-card__text",
        text: item.detail_text || item.description || "Sin detalle descriptivo.",
      }),
      createElement("div", {
        className: "detail-reusable-card__footer",
        children: [
          createElement("span", {
            className: "detail-reusable-card__context",
            text: item.context_label || "Sin contexto",
          }),
          createElement("button", {
            className: "btn btn-secondary",
            text: item.already_linked ? "Ya vinculado" : "Seleccionar",
            attrs: {
              type: "button",
              "data-link-node-id": String(item.node_id),
              disabled: item.already_linked ? "true" : null,
            },
          }),
        ],
      }),
    );
    list.appendChild(article);
  });

  return list;
}

export function renderCausaDetalle() {
  const deleteModal = renderDeleteModalShell();
  deleteModal.setAttribute("data-modal-kind", "delete");
  const searchModal = createReusableNodeSearch();
  const root = createElement("section", { className: "view-shell detail-page" });

  root.append(
    createElement("div", {
      className: "detail-page__hero",
      children: [
        createElement("div", {
          children: [
            createElement("p", { className: "detail-kicker", text: "Detalle causal" }),
            createElement("h1", { className: "detail-page__title", text: "Detalle de causa" }),
            createElement("p", {
              className: "detail-page__subtitle",
              text: "Shell industrial para edicion de causa, vinculacion DAG y gestion de hipotesis.",
            }),
          ],
        }),
        createElement("div", {
          className: "detail-page__hero-actions",
          children: [
            createElement("a", {
              className: "btn btn-secondary",
              text: "Volver al arbol",
              attrs: { href: "#/arboles", id: "cd-back-link" },
            }),
            createElement("div", {
              className: "detail-mode-wrap",
              attrs: { id: "cd-mode-chip" },
            }),
          ],
        }),
      ],
    }),
    createElement("div", { className: "detail-page__context", attrs: { id: "cd-context" } }),
    createElement("div", { className: "detail-page__alert", attrs: { id: "cd-alert" } }),
    createElement("div", {
      className: "detail-page__grid",
      children: [createEditorCard(), createHypothesisCard()],
    }),
    deleteModal,
    searchModal,
  );

  const refs = {
    context: root.querySelector("#cd-context"),
    alert: root.querySelector("#cd-alert"),
    modeChip: root.querySelector("#cd-mode-chip"),
    editorModeWrap: root.querySelector("#cd-editor-mode-wrap"),
    editorModePanel: root.querySelector("#cd-editor-mode-panel"),
    editorHelp: root.querySelector("#cd-editor-help"),
    editorFields: root.querySelector("#cd-editor-fields"),
    linkActions: root.querySelector("#cd-link-actions"),
    linkSummary: root.querySelector("#cd-link-summary"),
    linkSearch: root.querySelector("#cd-link-search"),
    linkClear: root.querySelector("#cd-link-clear"),
    causeName: root.querySelector("#cd-cause-name"),
    causeType: root.querySelector("#cd-cause-type"),
    causeCategory: root.querySelector("#cd-cause-category"),
    causeDescription: root.querySelector("#cd-cause-description"),
    causeSave: root.querySelector("#cd-cause-save"),
    causeCreationFeedback: root.querySelector("#cd-cause-creation-feedback"),
    causeCancel: root.querySelector("#cd-cause-cancel"),
    causeExit: root.querySelector("#cd-cause-exit"),
    causeNameLabel: root.querySelector('[data-field-label="name"]'),
    causeCategoryLabel: root.querySelector('[data-field-label="category"]'),
    causeDescriptionLabel: root.querySelector('[data-field-label="description"]'),
    causeTypeField: root.querySelector('[data-field-key="type"]'),
    hypothesisTitle: root.querySelector("#cd-hypothesis-title"),
    hypothesisDescription: root.querySelector("#cd-hypothesis-description"),
    hypothesisCriterion: root.querySelector("#cd-hypothesis-criterion"),
    hypothesisMethod: root.querySelector("#cd-hypothesis-method"),
    hypothesisSave: root.querySelector("#cd-hypothesis-save"),
    hypothesisCreationFeedback: root.querySelector("#cd-hypothesis-creation-feedback"),
    hypothesisNew: root.querySelector("#cd-hypothesis-new"),
    hypothesisList: root.querySelector("#cd-hypothesis-list"),
    backLink: root.querySelector("#cd-back-link"),
    deleteModal: root.querySelector('[data-modal-kind="delete"]'),
    deleteModalConfirm: root.querySelector('[data-modal-kind="delete"] [data-modal-action="confirm"]'),
    deleteModalCancel: root.querySelector('[data-modal-kind="delete"] [data-modal-action="cancel"]'),
    searchModal: root.querySelector('[data-modal-kind="search"]'),
    searchModalCard: root.querySelector('[data-modal-kind="search"] .detail-search-modal'),
    searchTitle: root.querySelector("#cd-search-title"),
    searchSubtitle: root.querySelector("#cd-search-subtitle"),
    searchText: root.querySelector("#cd-search-text"),
    searchRun: root.querySelector("#cd-search-run"),
    searchStatus: root.querySelector("#cd-search-status"),
    searchResults: root.querySelector("#cd-search-results"),
    searchClose: root.querySelector("#cd-search-close"),
  };

  const state = {
    detail: null,
    activeHypothesisId: null,
    deletePreview: null,
    editorMode: null,
    searchNodeType: "CAUSE",
    searchResults: [],
    selectedReusableNode: null,
  };

  let creationFeedbackEpoch = 0;

  function clearCreationFeedback({ invalidate = true, token } = {}) {
    if (token !== undefined && token !== creationFeedbackEpoch) return false;
    if (invalidate) creationFeedbackEpoch += 1;
    [refs.causeCreationFeedback, refs.hypothesisCreationFeedback].forEach((node) => {
      if (!node) return;
      node.hidden = true;
      node.textContent = "";
    });
    return true;
  }

  function beginCreationAttempt() {
    creationFeedbackEpoch += 1;
    clearCreationFeedback({ invalidate: false });
    return creationFeedbackEpoch;
  }

  function showCreationFeedback(message, token) {
    if (token !== creationFeedbackEpoch) return;
    const node = message === "Causa creada" ? refs.causeCreationFeedback : refs.hypothesisCreationFeedback;
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
  }

  const hypothesisActions = createCausaDetailHypothesisActions({
    state,
    refs,
    createHypothesis,
    updateHypothesis,
    deleteHypothesis,
    fetchHypothesisDeletePreview,
    setDeleteModalContent,
    setAlert,
    setModalVisible,
    refreshDetail: (options) => refreshDetail(options),
    clearCreationFeedback,
    beginCreationAttempt,
    showCreationFeedback,
  });
  const editorActions = createCausaDetailEditor({
    state,
    refs,
    readRouteParams,
    getEditorModeOptions,
    getEditorConfig,
    isLinkMode,
    getLinkNodeType,
    renderReusableSummary,
    createElement,
    clearNode,
  });
  const reusableNodeActions = createCausaDetailReusableNodeActions({
    state,
    refs,
    isLinkMode,
    getLinkNodeType,
    searchReusableNodes,
    renderReusableResults,
    renderSearchSummary: editorActions.renderSearchSummary,
    applyEditorConfig: editorActions.applyConfig,
    setModalVisible,
    escapeHtml,
    createElement,
  });
  const causeActions = createCausaDetailCauseActions({
    state,
    refs,
    appState: AppState,
    readRouteParams,
    isLinkMode,
    buildCausaDetalleHash,
    createCausa,
    createContractNode,
    linkReusableNode,
    updateCausa,
    setAlert,
    refreshDetail: (options) => refreshDetail(options),
    clearCreationFeedback,
    beginCreationAttempt,
    showCreationFeedback,
  });

  setDetailSelectOptions(refs.causeType, [
    { label: "Causa", value: "causa" },
    { label: "Efecto", value: "efecto" },
  ], "causa");

  function setModeChip(mode) {
    clearNode(refs.modeChip);
    refs.modeChip.appendChild(createElement("span", {
      className: "status-chip tone-primary",
      text: ({
        new_root: "Nueva raiz",
        edit_cause: "Editar causa",
        new_child: "Nueva hija",
        edit_hipotesis: "Editar hipotesis",
        new_contract: "Contrato hijo",
        link_existing_cause: "Vincular causa",
        link_existing_contract: "Vincular contrato",
      }[mode] || "Detalle"),
    }));
  }

  function setAlert(type, message) {
    refs.alert.innerHTML = "";
    if (!message) return;
    refs.alert.appendChild(createElement("div", {
      className: `alert-banner alert-banner--${type}`,
      text: message,
    }));
  }

  function setModalVisible(modal, isOpen) {
    modal.classList.toggle("is-open", Boolean(isOpen));
    modal.setAttribute("aria-hidden", isOpen ? "false" : "true");
    if (modal === refs.searchModal && isOpen) {
      refs.searchResults.scrollTop = 0;
      refs.searchModalCard?.focus();
    }
  }

  function renderDetail(payload) {
    refs.alert.innerHTML = "";
    clearNode(refs.context);
    refs.context.appendChild(renderContextBanner(payload));
    editorActions.resolveMode(payload);
    setModeChip(state.editorMode === "edit_cause" ? payload.mode : state.editorMode);
    editorActions.renderModeSelector(payload);
    editorActions.applyConfig(payload);

    clearNode(refs.hypothesisList);
    refs.hypothesisList.appendChild(renderHypothesisList(payload.hypotheses || [], state.activeHypothesisId));

    // The canonical causal-tree API returns the record under `cause` while
    // the legacy service returned the normalized `cause_form` object.
    const causeForm = payload.cause_form || payload.cause || {};
    refs.causeName.value = causeForm.nombre || "";
    refs.causeType.value = causeForm.tipo || "causa";
    refs.causeCategory.value = causeForm.categoria || "";
    refs.causeDescription.value = causeForm.descripcion || "";

    const hypothesisForm = payload.hypothesis_form || {};
    refs.hypothesisTitle.value = hypothesisForm.nombre || hypothesisForm.titulo || hypothesisForm.title || hypothesisForm.descripcion || "";
    refs.hypothesisDescription.value = hypothesisForm.descripcion || "";
    refs.hypothesisCriterion.value = hypothesisForm.criterio_validacion || "";
    if (refs.hypothesisMethod) refs.hypothesisMethod.value = hypothesisForm.metodo || hypothesisForm.method || "";
    refs.hypothesisSave.textContent = payload.labels?.hypothesis_save || "Guardar hipotesis";

    if (refs.backLink) {
      refs.backLink.setAttribute("href", buildTreeHash(payload.contract_id || ""));
    }

    const canEditDetail = Boolean(payload.ready);
    const canEditHypotheses = Boolean(payload.causa_id);
    [refs.causeName, refs.causeType, refs.causeCategory, refs.causeDescription, refs.causeSave, refs.causeCancel,
      refs.linkSearch, refs.linkClear].forEach((node) => {
      node.disabled = !canEditDetail;
    });
    [refs.hypothesisTitle, refs.hypothesisDescription, refs.hypothesisCriterion, refs.hypothesisMethod,
      refs.hypothesisSave, refs.hypothesisNew].forEach((node) => {
      if (node) node.disabled = !canEditHypotheses;
    });
  }

  async function refreshDetail({ feedbackToken } = {}) {
    clearCreationFeedback({ token: feedbackToken, invalidate: feedbackToken === undefined });
    const payload = await fetchCausaDetail(readRouteParams());
    state.detail = payload;
    state.activeHypothesisId = payload.hipotesis_id ? Number(payload.hipotesis_id) : null;
    renderDetail(payload);
  }

  function selectEditorMode(nextMode, restoreFocus = false) {
    if (!state.detail || !nextMode || nextMode === state.editorMode) return;
    editorActions.setMode(nextMode);
    editorActions.renderModeSelector(state.detail);
    editorActions.applyConfig(state.detail);
    if (restoreFocus) {
      Array.from(refs.editorModeWrap.querySelectorAll("[data-editor-mode]"))
        .find((tab) => tab.getAttribute("data-editor-mode") === nextMode)?.focus();
    }
    setModeChip(nextMode);
    clearCreationFeedback();
  }

  refs.editorModeWrap.addEventListener("click", (event) => {
    const button = event.target.closest("[data-editor-mode]");
    if (!button || !state.detail) return;
    const nextMode = button.getAttribute("data-editor-mode");
    selectEditorMode(nextMode);
  });

  refs.editorModeWrap.addEventListener("keydown", (event) => {
    const tabs = Array.from(refs.editorModeWrap.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(event.target);
    if (currentIndex < 0 || tabs.length < 2) return;
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === currentIndex) return;
    event.preventDefault();
    selectEditorMode(tabs[nextIndex].getAttribute("data-editor-mode"), true);
  });

  refs.linkSearch.addEventListener("click", () => reusableNodeActions.openSearch());
  refs.linkClear.addEventListener("click", () => reusableNodeActions.clearSelected());
  refs.searchRun.addEventListener("click", () => reusableNodeActions.runSearch());
  refs.searchClose.addEventListener("click", () => reusableNodeActions.closeSearch());
  refs.searchText.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      reusableNodeActions.runSearch();
    }
  });
  refs.searchResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-link-node-id]");
    if (!button) return;
    const nodeId = Number(button.getAttribute("data-link-node-id"));
    reusableNodeActions.selectResult(nodeId);
  });

  refs.hypothesisList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-hypothesis-action]");
    if (!button) return;
    const hypothesisId = button.getAttribute("data-hypothesis-id");
    const action = button.getAttribute("data-hypothesis-action");
    if (action === "edit") {
      hypothesisActions.editHypothesis(hypothesisId);
    }
    if (action === "delete") {
      hypothesisActions.openDeleteModal(hypothesisId);
    }
  });

  refs.causeSave.addEventListener("click", () => causeActions.saveCause());
  refs.hypothesisSave.addEventListener("click", () => hypothesisActions.saveHypothesis());
  refs.hypothesisNew.addEventListener("click", () => hypothesisActions.clearHypothesisForm());
  refs.causeCancel.addEventListener("click", () => refreshDetail());
  refs.causeExit.addEventListener("click", () => {
    window.location.hash = buildTreeHash(state.detail?.contract_id || readRouteParams().contrato_id);
  });
  refs.deleteModalCancel.addEventListener("click", () => {
    state.deletePreview = null;
    setModalVisible(refs.deleteModal, false);
  });
  refs.deleteModalConfirm.addEventListener("click", () => hypothesisActions.confirmDelete());
  [refs.causeName, refs.causeType, refs.causeCategory, refs.causeDescription,
    refs.hypothesisTitle, refs.hypothesisDescription, refs.hypothesisCriterion, refs.hypothesisMethod]
    .filter(Boolean)
    .forEach((field) => field.addEventListener("input", clearCreationFeedback));
  setAlert("warning", "Cargando contexto de detalle...");

  refreshDetail().catch((error) => {
    refs.alert.innerHTML = "";
    refs.alert.appendChild(createElement("div", {
      className: "detail-page__error",
      html: `<strong>No se pudo cargar el detalle.</strong><p>${escapeHtml(error.message)}</p>`,
    }));
  });

  return root;
}

export function deriveScopeFromDetailParams(params, catalog) {
  const contractId = params?.contrato_id ? Number(params.contrato_id) : null;
  if (!Number.isFinite(contractId)) return { contractId: null, processId: null };
  const contract = (catalog?.data?.contratos || []).find((item) => String(item.id) === String(contractId));
  return { contractId, processId: contract?.processId ?? null };
}

function buildRightPanel(params, catalog) {
  const mode = params.hipotesis_id
    ? "Editar hipotesis"
    : params.causa_id
      ? "Editar causa"
      : params.parent_id
        ? "Nueva causa hija o vinculo"
        : "Nueva raiz";
  const contract = getContracts({ catalog }).find((item) => String(item.id) === String(params.contrato_id));
  const readableContractName = contract?.objetivo || contract?.objective || contract?.name || "—";
  return `<div class="p-lg border-b border-outline-variant bg-surface-container-low"><p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Espacio de detalle</p><h2 class="font-headline-md text-headline-md text-primary mt-xs">Causa detalle</h2><p class="font-body-sm text-body-sm text-on-surface-variant mt-sm">Crea y edita causas e hipotesis manteniendo la misma envolvente industrial del resto del producto.</p></div><div class="p-lg space-y-lg"><div class="grid grid-cols-1 gap-sm"><div class="p-sm bg-white rounded border border-outline-variant"><p class="text-[10px] text-on-surface-variant uppercase font-bold">Modo</p><p class="text-title-lg font-bold text-primary">${escapeHtml(mode)}</p></div><div class="p-sm bg-white rounded border border-outline-variant"><p class="text-[10px] text-on-surface-variant uppercase font-bold">Contrato</p><p class="text-title-lg font-bold text-primary break-words whitespace-normal">${escapeHtml(readableContractName)}</p></div></div><div class="p-md bg-surface-container-low rounded-lg border border-outline-variant"><p class="font-label-md text-label-md text-primary mb-xs">Flujo esperado</p><p class="text-[12px] text-on-surface-variant">1. Crea o reutiliza una causa. 2. Guarda el vínculo. 3. Vuelve al árbol y continúa ramificando.</p></div></div>`;
}

export function renderCausaDetallePage(state = {}) {
  const params = readRouteParams();
  const { root, mainSlot, rightSlot } = createHomeShell(
    { route: "causa_detalle" },
    { rightWidthClass: "w-[420px]" },
  );
  const mainWrap = createElement("div", { className: "max-w-6xl mx-auto" });
  const detailView = renderCausaDetalle();
  detailView.classList.add("detail-page--single-column", "detail-page--causal-only");
  mainWrap.appendChild(detailView);
  mainSlot.appendChild(mainWrap);
  rightSlot.innerHTML = buildRightPanel(params, state.catalog);
  return {
    shellMode: "full",
    main: root,
    afterMount(mountRoot, currentState) {
      document.title = "Industrial RCA - Causa detalle";
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      const scope = deriveScopeFromDetailParams(params, currentState?.catalog);
      if (scope.processId) setCurrentProcess(scope.processId);
      if (scope.contractId) setCurrentContract(scope.contractId);
      bindHomeShell(mountRoot);
    },
  };
}
