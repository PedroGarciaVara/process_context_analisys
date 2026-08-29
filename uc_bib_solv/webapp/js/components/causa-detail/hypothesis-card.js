import { createElement } from "../../core/utils.js";
import { buildDetailField } from "./shared-fields.js";

export function createHypothesisCard() {
  const card = createElement("section", { className: "detail-card" });
  card.append(
    createElement("div", { className: "detail-card__header", children: [
      createElement("div", { className: "detail-card__title", text: "Hipotesis" }),
      createElement("div", { className: "detail-card__subtitle", text: "Crea, edita y elimina hipotesis vinculadas a la causa activa." }),
    ] }),
    createElement("div", { className: "detail-card__body", children: [
      buildDetailField("Descripcion", createElement("textarea", { className: "input-control control-textarea", attrs: { id: "cd-hypothesis-description", rows: "4", placeholder: "Descripcion de la hipotesis" } })),
      buildDetailField("Tipo", createElement("select", { className: "input-control control-input", attrs: { id: "cd-hypothesis-type" } })),
      buildDetailField("Criterio de validacion", createElement("textarea", { className: "input-control control-textarea", attrs: { id: "cd-hypothesis-criterion", rows: "3", placeholder: "Criterio de validacion" } })),
    ] }),
    createElement("div", { className: "detail-card__footer", children: [
      createElement("button", { className: "btn btn-primary", text: "Guardar hipotesis", attrs: { type: "button", id: "cd-hypothesis-save" } }),
      createElement("button", { className: "btn btn-secondary", text: "Nueva hipotesis", attrs: { type: "button", id: "cd-hypothesis-new" } }),
    ] }),
    createElement("div", { className: "detail-hypothesis-section", children: [
      createElement("div", { className: "detail-hypothesis-section__header", text: "Hipotesis existentes" }),
      createElement("div", { className: "detail-hypothesis-section__list", attrs: { id: "cd-hypothesis-list" } }),
    ] }),
  );
  return card;
}
