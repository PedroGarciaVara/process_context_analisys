import { createElement, clearNode, escapeHtml } from "../core/utils.js";
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
} from "../api/causas.js";
import {
  renderContextBanner,
  renderDeleteModalShell,
  renderHypothesisList,
  setDeleteModalContent,
} from "../components/detail-panels.js";
import { AppState } from "../core/state.js";

export function buildCausaDetalleHash(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return `#/causa_detalle_v02${query ? `?${query}` : ""}`;
}

function buildTreeHash(contractId) {
  return contractId
    ? `#/arboles_v02?contract_id=${encodeURIComponent(String(contractId))}`
    : "#/arboles_v02";
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
      help: "Crea un contrato hijo heredando el proceso del contrato activo. El campo Categoria se guarda como metrica y Descripcion como objetivo.",
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

function buildField(label, control, key) {
  const field = createElement("label", {
    className: "form-field",
    attrs: key ? { "data-field-key": key } : {},
  });
  const labelNode = createElement("span", {
    className: "field-label",
    text: label,
    attrs: key ? { "data-field-label": key } : {},
  });
  field.append(labelNode, control);
  return field;
}

function setSelectOptions(select, options, value) {
  clearNode(select);
  options.forEach((option) => {
    select.appendChild(
      createElement("option", {
        text: option.label,
        attrs: { value: option.value },
      }),
    );
  });
  select.value = value || options[0]?.value || "";
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

function createSearchModalShell() {
  return createElement("div", {
    className: "modal-overlay",
    attrs: {
      "data-modal-kind": "search",
      "aria-hidden": "true",
      role: "dialog",
      "aria-modal": "true",
    },
    children: [
      createElement("section", {
        className: "modal-card detail-search-modal",
        attrs: { tabindex: "-1" },
        children: [
          createElement("div", { className: "modal-card__accent" }),
          createElement("div", {
            className: "modal-card__header",
            children: [
              createElement("p", { className: "detail-kicker", text: "Busqueda corporativa" }),
              createElement("h3", {
                className: "modal-card__title",
                text: "Selecciona un nodo reutilizable",
                attrs: { id: "cd-search-title" },
              }),
              createElement("p", {
                className: "detail-modal-note",
                text: "Filtra por nombre, codigo, descripcion, proceso o metadata relevante.",
                attrs: { id: "cd-search-subtitle" },
              }),
            ],
          }),
          createElement("div", {
            className: "modal-card__body",
            children: [
              buildField(
                "Texto libre",
                createElement("input", {
                  className: "input-control control-input",
                  attrs: {
                    id: "cd-search-text",
                    type: "text",
                    placeholder: "Descripcion, proceso, contrato, codigo...",
                  },
                }),
                "search",
              ),
              createElement("div", {
                className: "detail-search-toolbar",
                children: [
                  createElement("button", {
                    className: "btn btn-primary",
                    text: "Buscar",
                    attrs: { type: "button", id: "cd-search-run" },
                  }),
                  createElement("span", {
                    className: "detail-modal-note",
                    text: "0 resultados",
                    attrs: { id: "cd-search-status" },
                  }),
                ],
              }),
              createElement("div", {
                className: "detail-search-results-wrap",
                attrs: { id: "cd-search-results" },
              }),
            ],
          }),
          createElement("div", {
            className: "modal-card__footer",
            children: [
              createElement("button", {
                className: "btn btn-secondary",
                text: "Cancelar",
                attrs: { type: "button", id: "cd-search-close" },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createEditorCard() {
  const card = createElement("section", { className: "detail-card" });
  card.append(
    createElement("div", {
      className: "detail-card__header",
      children: [
        createElement("div", { className: "detail-card__title", text: "Editor de causa" }),
        createElement("div", {
          className: "detail-card__subtitle",
          text: "Gestiona altas nuevas o reutilizacion de contratos y causas sin romper el flujo industrial actual.",
        }),
      ],
    }),
    createElement("div", {
      className: "detail-card__body",
      children: [
        createElement("div", { className: "detail-mode-selector", attrs: { id: "cd-editor-mode-wrap" } }),
        createElement("div", { className: "detail-editor-help", attrs: { id: "cd-editor-help" } }),
        createElement("div", {
          className: "detail-link-actions",
          attrs: { id: "cd-link-actions" },
          children: [
            createElement("div", { attrs: { id: "cd-link-summary" } }),
            createElement("div", {
              className: "detail-link-actions__footer",
              children: [
                createElement("button", {
                  className: "btn btn-primary",
                  text: "Buscar nodo existente",
                  attrs: { type: "button", id: "cd-link-search" },
                }),
                createElement("button", {
                  className: "btn btn-secondary",
                  text: "Limpiar seleccion",
                  attrs: { type: "button", id: "cd-link-clear" },
                }),
              ],
            }),
          ],
        }),
        createElement("div", {
          className: "detail-editor-fields",
          attrs: { id: "cd-editor-fields" },
          children: [
            buildField(
              "Nombre",
              createElement("input", {
                className: "input-control control-input",
                attrs: { id: "cd-cause-name", type: "text", placeholder: "Nombre de la causa" },
              }),
              "name",
            ),
            buildField(
              "Tipo",
              createElement("select", {
                className: "input-control control-input",
                attrs: { id: "cd-cause-type" },
              }),
              "type",
            ),
            buildField(
              "Categoria",
              createElement("input", {
                className: "input-control control-input",
                attrs: { id: "cd-cause-category", type: "text", placeholder: "Categoria" },
              }),
              "category",
            ),
            buildField(
              "Descripcion",
              createElement("textarea", {
                className: "input-control control-textarea",
                attrs: { id: "cd-cause-description", rows: "5", placeholder: "Descripcion de la causa" },
              }),
              "description",
            ),
          ],
        }),
      ],
    }),
    createElement("div", {
      className: "detail-card__footer",
      children: [
        createElement("button", {
          className: "btn btn-primary",
          text: "Guardar causa",
          attrs: { type: "button", id: "cd-cause-save" },
        }),
        createElement("button", {
          className: "btn btn-secondary",
          text: "Cancelar",
          attrs: { type: "button", id: "cd-cause-cancel" },
        }),
        createElement("button", {
          className: "btn btn-secondary",
          text: "Salir",
          attrs: { type: "button", id: "cd-cause-exit" },
        }),
      ],
    }),
  );
  return card;
}

function createHypothesisCard() {
  const card = createElement("section", { className: "detail-card" });
  card.append(
    createElement("div", {
      className: "detail-card__header",
      children: [
        createElement("div", { className: "detail-card__title", text: "Hipotesis" }),
        createElement("div", { className: "detail-card__subtitle", text: "Crea, edita y elimina hipotesis vinculadas a la causa activa." }),
      ],
    }),
    createElement("div", {
      className: "detail-card__body",
      children: [
        buildField(
          "Descripcion",
          createElement("textarea", {
            className: "input-control control-textarea",
            attrs: { id: "cd-hypothesis-description", rows: "4", placeholder: "Descripcion de la hipotesis" },
          }),
        ),
        buildField(
          "Tipo",
          createElement("select", {
            className: "input-control control-input",
            attrs: { id: "cd-hypothesis-type" },
          }),
        ),
        buildField(
          "Criterio de validacion",
          createElement("textarea", {
            className: "input-control control-textarea",
            attrs: { id: "cd-hypothesis-criterion", rows: "3", placeholder: "Criterio de validacion" },
          }),
        ),
      ],
    }),
    createElement("div", {
      className: "detail-card__footer",
      children: [
        createElement("button", {
          className: "btn btn-primary",
          text: "Guardar hipotesis",
          attrs: { type: "button", id: "cd-hypothesis-save" },
        }),
        createElement("button", {
          className: "btn btn-secondary",
          text: "Nueva hipotesis",
          attrs: { type: "button", id: "cd-hypothesis-new" },
        }),
      ],
    }),
    createElement("div", {
      className: "detail-hypothesis-section",
      children: [
        createElement("div", { className: "detail-hypothesis-section__header", text: "Hipotesis existentes" }),
        createElement("div", { className: "detail-hypothesis-section__list", attrs: { id: "cd-hypothesis-list" } }),
      ],
    }),
  );
  return card;
}

export function renderCausaDetalle() {
  const deleteModal = renderDeleteModalShell();
  deleteModal.setAttribute("data-modal-kind", "delete");
  const searchModal = createSearchModalShell();
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
              attrs: { href: "#/arboles_v02", id: "cd-back-link" },
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
    causeCancel: root.querySelector("#cd-cause-cancel"),
    causeExit: root.querySelector("#cd-cause-exit"),
    causeNameLabel: root.querySelector('[data-field-label="name"]'),
    causeCategoryLabel: root.querySelector('[data-field-label="category"]'),
    causeDescriptionLabel: root.querySelector('[data-field-label="description"]'),
    causeTypeField: root.querySelector('[data-field-key="type"]'),
    hypothesisDescription: root.querySelector("#cd-hypothesis-description"),
    hypothesisType: root.querySelector("#cd-hypothesis-type"),
    hypothesisStatus: root.querySelector("#cd-hypothesis-status"),
    hypothesisCriterion: root.querySelector("#cd-hypothesis-criterion"),
    hypothesisSave: root.querySelector("#cd-hypothesis-save"),
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

  setSelectOptions(refs.causeType, [
    { label: "Causa", value: "causa" },
    { label: "Efecto", value: "efecto" },
  ], "causa");

  setSelectOptions(refs.hypothesisType, [
    { label: "Aceptacion", value: "aceptacion" },
    { label: "Rechazo", value: "rechazo" },
  ], "aceptacion");


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

  function resolveEditorMode(payload) {
    if (payload?.causa_id) {
      state.editorMode = "edit_cause";
      return;
    }
    const options = getEditorModeOptions(readRouteParams());
    if (!options.some((option) => option.value === state.editorMode)) {
      state.editorMode = options[0]?.value || "new_cause";
    }
    if (!isLinkMode(state.editorMode)) {
      state.selectedReusableNode = null;
    } else if (state.selectedReusableNode && state.selectedReusableNode.node_type !== getLinkNodeType(state.editorMode)) {
      state.selectedReusableNode = null;
    }
  }

  function renderEditorModeSelector(payload) {
    clearNode(refs.editorModeWrap);
    const options = getEditorModeOptions(readRouteParams());
    if (payload?.causa_id) {
      refs.editorModeWrap.classList.add("is-hidden");
      return;
    }
    refs.editorModeWrap.classList.remove("is-hidden");
    options.forEach((option) => {
      refs.editorModeWrap.appendChild(createElement("button", {
        className: `detail-mode-selector__button${state.editorMode === option.value ? " is-active" : ""}`,
        text: option.label,
        attrs: {
          type: "button",
          "data-editor-mode": option.value,
        },
      }));
    });
  }

  function renderSearchSummary(config) {
    clearNode(refs.linkSummary);
    refs.linkSummary.appendChild(
      state.selectedReusableNode
        ? renderReusableSummary(state.selectedReusableNode)
        : createElement("div", {
          className: "detail-empty-state detail-empty-state--compact",
          text: config.emptySelection || "Selecciona un nodo reutilizable.",
        }),
    );
  }

  function applyEditorConfig(payload) {
    const config = getEditorConfig(state.editorMode, payload);
    refs.editorHelp.textContent = config.help;
    refs.causeNameLabel.textContent = config.nameLabel || "Nombre";
    refs.causeCategoryLabel.textContent = config.categoryLabel || "Categoria";
    refs.causeDescriptionLabel.textContent = config.descriptionLabel || "Descripcion";
    refs.causeTypeField.classList.toggle("is-hidden", config.typeVisible === false);
    refs.causeSave.textContent = config.saveLabel;
    refs.linkSearch.textContent = config.searchButtonLabel || "Buscar nodo existente";

    const linkMode = isLinkMode(state.editorMode);
    refs.linkActions.classList.toggle("is-hidden", !linkMode);
    refs.editorFields.classList.toggle("is-hidden", linkMode);
    renderSearchSummary(config);
  }

  function renderDetail(payload) {
    refs.alert.innerHTML = "";
    clearNode(refs.context);
    refs.context.appendChild(renderContextBanner(payload));
    resolveEditorMode(payload);
    setModeChip(state.editorMode === "edit_cause" ? payload.mode : state.editorMode);
    renderEditorModeSelector(payload);
    applyEditorConfig(payload);

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
    refs.hypothesisDescription.value = hypothesisForm.descripcion || "";
    refs.hypothesisType.value = hypothesisForm.tipo || "aceptacion";
    refs.hypothesisCriterion.value = hypothesisForm.criterio_validacion || "";
    if (refs.hypothesisStatus) refs.hypothesisStatus.value = hypothesisForm.estado || "pendiente";
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
    [refs.hypothesisDescription, refs.hypothesisType, refs.hypothesisStatus, refs.hypothesisCriterion,
      refs.hypothesisSave, refs.hypothesisNew].forEach((node) => {
      if (node) node.disabled = !canEditHypotheses;
    });
  }

  async function refreshDetail() {
    const payload = await fetchCausaDetail(readRouteParams());
    state.detail = payload;
    state.activeHypothesisId = payload.hipotesis_id ? Number(payload.hipotesis_id) : null;
    renderDetail(payload);
  }

  async function runReusableSearch() {
    if (!state.detail?.ready) {
      return;
    }
    const nodeType = getLinkNodeType(state.editorMode);
    state.searchNodeType = nodeType;
    refs.searchStatus.textContent = "Buscando...";
    clearNode(refs.searchResults);

    try {
      const payload = await searchReusableNodes({
        node_type: nodeType,
        text: refs.searchText.value,
        contract_id: state.detail?.contract_id,
        parent_id: state.detail?.parent_id,
        limit: 20,
      });
      state.searchResults = payload.items || [];
      refs.searchStatus.textContent = `${payload.count || 0} resultados`;
      refs.searchResults.appendChild(
        renderReusableResults(state.searchResults, state.selectedReusableNode?.node_id),
      );
    } catch (error) {
      refs.searchStatus.textContent = "Busqueda fallida";
      refs.searchResults.appendChild(createElement("div", {
        className: "detail-page__error",
        html: `<strong>No se pudo completar la busqueda.</strong><p>${escapeHtml(error.message)}</p>`,
      }));
    }
  }

  function openSearchModal() {
    if (!isLinkMode(state.editorMode)) {
      return;
    }
    const label = state.editorMode === "link_existing_contract" ? "contrato" : "causa";
    refs.searchTitle.textContent = `Selecciona ${label} reutilizable`;
    refs.searchSubtitle.textContent = `Filtra ${label}s por descripcion, proceso, codigo o metadata de negocio.`;
    setModalVisible(refs.searchModal, true);
    runReusableSearch();
  }

  function closeSearchModal() {
    setModalVisible(refs.searchModal, false);
  }

  async function handleSaveCause() {
    const routeContractId = readRouteParams().contrato_id;
    const activeContractId = state.detail?.contract_id || routeContractId || AppState.currentContract;
    if (!activeContractId && !state.detail?.causa_id) {
      setAlert("warning", "Selecciona un contrato antes de guardar.");
      return;
    }

    try {
      if (state.editorMode === "new_contract") {
        const response = await createContractNode({
          contract_id: state.detail?.contract_id,
          nombre: refs.causeName.value,
          categoria: refs.causeCategory.value,
          descripcion: refs.causeDescription.value,
        });
        window.location.hash = buildCausaDetalleHash({ contrato_id: response?.contract?.id });
        return;
      }

      if (isLinkMode(state.editorMode)) {
        if (!state.selectedReusableNode?.node_id) {
          setAlert("warning", "Selecciona primero el nodo reutilizable que quieres vincular.");
          return;
        }
        const response = await linkReusableNode({
          contract_id: state.detail?.contract_id,
          parent_id: state.detail?.parent_id,
          child_node_id: state.selectedReusableNode.node_id,
        });
        setAlert("success", response.message || "Nodo vinculado.");
        await refreshDetail();
        return;
      }

      const payload = {
        contract_id: activeContractId,
        causa_id: state.detail?.causa_id,
        parent_id: state.detail?.parent_id,
        nombre: refs.causeName.value,
        tipo: refs.causeType.value,
        categoria: refs.causeCategory.value,
        descripcion: refs.causeDescription.value,
      };

      const response = payload.causa_id
        ? await updateCausa(payload.causa_id, payload)
        : await createCausa(payload);

      setAlert("success", response.message || "Causa guardada.");
      if (!payload.causa_id && response?.cause?.id) {
        window.history.replaceState({}, "", buildCausaDetalleHash({
          contrato_id: response.cause.contrato_id || state.detail?.contract_id,
          causa_id: response.cause.id,
        }));
      }
      await refreshDetail();
    } catch (error) {
      setAlert("danger", error.message);
    }
  }

  async function handleSaveHypothesis() {
    if (!state.detail?.causa_id) {
      setAlert("warning", "Carga una causa antes de editar hipotesis.");
      return;
    }

    try {
      const payload = {
        cause_id: state.detail.causa_id,
        hypothesis_id: state.activeHypothesisId,
        descripcion: refs.hypothesisDescription.value,
        tipo: refs.hypothesisType.value,
        criterio_validacion: refs.hypothesisCriterion.value,
        estado: refs.hypothesisStatus?.value || "pendiente",
      };

      const response = state.activeHypothesisId
        ? await updateHypothesis(state.activeHypothesisId, payload)
        : await createHypothesis(state.detail.causa_id, payload);

      setAlert("success", response.message || "Hipotesis guardada.");
      state.activeHypothesisId = null;
      await refreshDetail();
    } catch (error) {
      setAlert("danger", error.message);
    }
  }

  function clearHypothesisForm() {
    state.activeHypothesisId = null;
    refs.hypothesisDescription.value = "";
    refs.hypothesisType.value = "aceptacion";
    refs.hypothesisCriterion.value = "";
    if (refs.hypothesisStatus) refs.hypothesisStatus.value = "pendiente";
    refs.hypothesisSave.textContent = "Guardar hipotesis";
  }

  function clearSelectedReusableNode() {
    state.selectedReusableNode = null;
    if (state.detail) {
      applyEditorConfig(state.detail);
    }
  }

  function editHypothesis(hypothesisId) {
    const hypotheses = state.detail?.hypotheses || [];
    const selected = hypotheses.find((item) => Number(item.id) === Number(hypothesisId));
    if (!selected) return;
    state.activeHypothesisId = Number(hypothesisId);
    refs.hypothesisDescription.value = selected.descripcion || "";
    refs.hypothesisType.value = selected.tipo || "aceptacion";
    refs.hypothesisCriterion.value = selected.criterio_validacion || "";
    if (refs.hypothesisStatus) refs.hypothesisStatus.value = selected.estado || "pendiente";
    refs.hypothesisSave.textContent = "Actualizar hipotesis";
  }

  async function openDeleteModal(hypothesisId) {
    try {
      const preview = await fetchHypothesisDeletePreview(hypothesisId);
      state.deletePreview = preview;
      setDeleteModalContent(refs.deleteModal, preview);
      setModalVisible(refs.deleteModal, true);
    } catch (error) {
      setAlert("danger", error.message);
    }
  }

  async function confirmDelete() {
    if (!state.deletePreview?.hipotesis_id) return;
    try {
      await deleteHypothesis(state.deletePreview.hipotesis_id);
      setAlert("success", "Hipotesis eliminada.");
      state.deletePreview = null;
      setModalVisible(refs.deleteModal, false);
      clearHypothesisForm();
      await refreshDetail();
    } catch (error) {
      setAlert("danger", error.message);
    }
  }

  refs.editorModeWrap.addEventListener("click", (event) => {
    const button = event.target.closest("[data-editor-mode]");
    if (!button || !state.detail) return;
    const nextMode = button.getAttribute("data-editor-mode");
    if (!nextMode || nextMode === state.editorMode) return;
    state.editorMode = nextMode;
    if (!isLinkMode(nextMode)) {
      state.selectedReusableNode = null;
    }
    setModeChip(nextMode);
    renderEditorModeSelector(state.detail);
    applyEditorConfig(state.detail);
  });

  refs.linkSearch.addEventListener("click", openSearchModal);
  refs.linkClear.addEventListener("click", clearSelectedReusableNode);
  refs.searchRun.addEventListener("click", runReusableSearch);
  refs.searchClose.addEventListener("click", closeSearchModal);
  refs.searchText.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runReusableSearch();
    }
  });
  refs.searchResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-link-node-id]");
    if (!button) return;
    const nodeId = Number(button.getAttribute("data-link-node-id"));
    const selected = state.searchResults.find((item) => Number(item.node_id) === nodeId);
    if (!selected) return;
    state.selectedReusableNode = selected;
    if (state.detail) {
      applyEditorConfig(state.detail);
    }
    closeSearchModal();
  });

  refs.hypothesisList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-hypothesis-action]");
    if (!button) return;
    const hypothesisId = button.getAttribute("data-hypothesis-id");
    const action = button.getAttribute("data-hypothesis-action");
    if (action === "edit") {
      editHypothesis(hypothesisId);
    }
    if (action === "delete") {
      openDeleteModal(hypothesisId);
    }
  });

  refs.causeSave.addEventListener("click", handleSaveCause);
  refs.hypothesisSave.addEventListener("click", handleSaveHypothesis);
  refs.hypothesisNew.addEventListener("click", clearHypothesisForm);
  refs.causeCancel.addEventListener("click", () => refreshDetail());
  refs.causeExit.addEventListener("click", () => {
    window.location.hash = buildTreeHash(state.detail?.contract_id || readRouteParams().contrato_id);
  });
  refs.deleteModalCancel.addEventListener("click", () => {
    state.deletePreview = null;
    setModalVisible(refs.deleteModal, false);
  });
  refs.deleteModalConfirm.addEventListener("click", confirmDelete);
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
