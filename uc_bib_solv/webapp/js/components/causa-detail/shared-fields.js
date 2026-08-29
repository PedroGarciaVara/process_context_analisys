import { createElement, clearNode } from "../../core/utils.js";

export function buildDetailField(label, control, key) {
  return createElement("label", {
    className: "form-field",
    attrs: key ? { "data-field-key": key } : {},
    children: [
      createElement("span", { className: "field-label", text: label, attrs: key ? { "data-field-label": key } : {} }),
      control,
    ],
  });
}

export function setDetailSelectOptions(select, options, value) {
  clearNode(select);
  options.forEach((option) => select.appendChild(createElement("option", { text: option.label, attrs: { value: option.value } })));
  select.value = value || options[0]?.value || "";
}
