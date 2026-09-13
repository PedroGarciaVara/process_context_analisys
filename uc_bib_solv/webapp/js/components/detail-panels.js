import { createElement, escapeHtml } from "../core/utils.js";
import { renderModal } from "./modal.js";

function formatContextLabel(label) {
  const normalized = String(label || "").trim().toLowerCase();
  return ({
    mode: "Modo",
    contract: "Contrato",
    contract_id: "Contrato",
    cause: "Causa",
    cause_id: "Causa",
    parent: "Causa padre",
    parent_id: "Causa padre",
    hypothesis: "Hipotesis",
    hypothesis_id: "Hipotesis",
    status: "Estado",
    type: "Tipo",
  })[normalized] || String(label || "");
}

function formatContextValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ({
    new_root: "Nueva raiz",
    new_child: "Nueva hija",
    edit_cause: "Editar causa",
    edit_hipotesis: "Editar hipotesis",
    pending: "Pendiente",
    retained: "Validada",
    discarded: "Rechazada",
  })[normalized] || String(value || "");
}

function renderContextItem(item) {
  const element = createElement("div", { className: "context-chip" });
  element.append(
    createElement("span", { className: "context-chip__label", text: formatContextLabel(item.label) }),
    createElement("strong", { className: "context-chip__value", text: formatContextValue(item.value) }),
  );
  return element;
}

function renderDefinitionMeta(label, value, fallback) {
  const block = createElement("div", { className: "detail-mini-meta" });
  block.append(
    createElement("span", { className: "detail-mini-meta__label", text: label }),
    createElement("strong", { className: "detail-mini-meta__value", text: value || fallback }),
  );
  return block;
}

export function renderContextBanner(payload) {
  const section = createElement("section", { className: "detail-context-banner" });
  const header = createElement("div", { className: "detail-context-banner__header" });
  header.append(
    createElement("p", { className: "detail-kicker", text: "Contexto de detalle" }),
    createElement("h2", {
      className: "detail-context-banner__title",
      text: payload.ready ? "Contexto listo" : "Esperando seleccion de contrato",
    }),
    createElement("p", {
      className: "detail-context-banner__subtitle",
      text: payload.context_message || "Datos de contexto cargados desde el backend.",
    }),
  );

  const items = createElement("div", { className: "detail-context-banner__items" });
  (payload.context_items || []).forEach((item) => items.appendChild(renderContextItem(item)));

  section.append(header, items);
  return section;
}

export function renderHypothesisCard(hypothesis, selected = false) {
  const card = createElement("article", {
    className: `detail-hypothesis-card${selected ? " is-selected" : ""}`,
    attrs: { "data-hypothesis-id": String(hypothesis.id) },
  });

  const top = createElement("div", { className: "detail-hypothesis-card__top" });
  top.append(
    createElement("div", { className: "detail-hypothesis-card__title", text: hypothesis.nombre || hypothesis.name || hypothesis.descripcion || "Hipotesis sin titulo" }),
  );

  const body = createElement("div", { className: "detail-hypothesis-card__body" });
  body.append(
    createElement("p", {
      className: "detail-hypothesis-card__text",
      text: hypothesis.descripcion || "Sin descripcion.",
    }),
    createElement("div", { className: "detail-hypothesis-card__meta", children: [
      renderDefinitionMeta("Criterio de validación", hypothesis.criterio_validacion, "Sin criterio de validación."),
      renderDefinitionMeta("Método de cálculo", hypothesis.metodo || hypothesis.method, "Sin método de cálculo."),
    ] }),
  );

  const actions = createElement("div", { className: "detail-hypothesis-card__actions" });
  actions.append(
    createElement("button", {
      className: "action-link",
      text: "Editar",
      attrs: {
        type: "button",
        "data-hypothesis-action": "edit",
        "data-hypothesis-id": String(hypothesis.id),
      },
    }),
    createElement("button", {
      className: "action-link action-link--danger",
      text: "Eliminar",
      attrs: {
        type: "button",
        "data-hypothesis-action": "delete",
        "data-hypothesis-id": String(hypothesis.id),
      },
    }),
  );

  card.append(top, body, actions);
  return card;
}

export function renderHypothesisList(hypotheses, selectedId) {
  const list = createElement("div", { className: "detail-hypothesis-list" });
  if (!hypotheses || hypotheses.length === 0) {
    list.append(
      createElement("div", {
        className: "detail-empty-state",
        text: "No hay hipotesis registradas para esta causa.",
      }),
    );
    return list;
  }

  hypotheses.forEach((hypothesis) => {
    list.appendChild(renderHypothesisCard(hypothesis, selectedId !== null && Number(selectedId) === Number(hypothesis.id)));
  });
  return list;
}

export function renderDeleteModalShell() {
  const header = createElement("div", {
    className: "modal-card__header",
    children: [
      createElement("div", { className: "modal-card__accent" }),
      createElement("div", {
        children: [
          createElement("p", { className: "detail-kicker", text: "Zona de riesgo" }),
          createElement("h3", {
            className: "modal-card__title",
            text: "Confirmar eliminacion",
            attrs: { id: "rca-delete-modal-title" },
          }),
        ],
      }),
    ],
  });

  const body = createElement("div", { attrs: { "data-modal-body": "true" } });
  const footer = createElement("div", {
    children: [
      createElement("button", {
        className: "btn btn-secondary",
        text: "Cancelar",
        attrs: { type: "button", "data-modal-action": "cancel" },
      }),
      createElement("button", {
        className: "btn btn-danger",
        text: "Eliminar",
        attrs: { type: "button", "data-modal-action": "confirm" },
      }),
    ],
  });

  return renderModal({
    header,
    body,
    footer,
    open: false,
    overlayClassName: "modal-overlay",
    dialogClassName: "modal-card",
    bodyClassName: "modal-card__body",
    footerClassName: "modal-card__footer",
    overlayAttrs: {
      "aria-hidden": "true",
      "data-modal-kind": "rca-delete",
    },
    dialogAttrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "rca-delete-modal-title",
    },
  });
}

export function setDeleteModalContent(modal, preview) {
  const title = modal.querySelector(".modal-card__title");
  const body = modal.querySelector("[data-modal-body]");
  const confirm = modal.querySelector('[data-modal-action="confirm"]');
  const cancel = modal.querySelector('[data-modal-action="cancel"]');

  if (title) title.textContent = preview?.title || "Confirmar eliminacion";
  if (body) {
    body.innerHTML = `
      <p>${escapeHtml(preview?.message || "Esta accion no se puede deshacer.")}</p>
      <p class="detail-modal-note">${escapeHtml(preview?.detail || "")}</p>
    `;
  }
  if (confirm) {
    const canDelete = preview?.can_delete !== false;
    confirm.textContent = preview?.confirm_label || "Eliminar";
    confirm.disabled = !canDelete;
    confirm.setAttribute("aria-disabled", String(!canDelete));
    confirm.classList.toggle("opacity-50", !canDelete);
    confirm.classList.toggle("cursor-not-allowed", !canDelete);
  }
  if (cancel) cancel.textContent = preview?.cancel_label || "Cancelar";
}
