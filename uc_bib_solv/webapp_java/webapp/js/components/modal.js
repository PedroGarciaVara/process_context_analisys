import { createElement } from "../core/utils.js";

export function renderModal({
  title,
  header = null,
  body,
  footer = null,
  open = true,
  overlayClassName = "modal-overlay",
  dialogClassName = "modal-shell",
  headerClassName = "modal-header",
  bodyClassName = "modal-body",
  footerClassName = "modal-footer",
  overlayAttrs = {},
  dialogAttrs = {},
}) {
  const overlay = createElement("div", {
    className: open ? `${overlayClassName} is-open` : overlayClassName,
    attrs: overlayAttrs,
  });

  const dialog = createElement("section", {
    className: dialogClassName,
    attrs: dialogAttrs,
  });

  if (header) {
    if (typeof header === "string") {
      dialog.appendChild(
        createElement("header", {
          className: headerClassName,
          html: header,
        }),
      );
    } else {
      dialog.appendChild(header);
    }
  } else {
    dialog.appendChild(
      createElement("header", {
        className: headerClassName,
        html: `<h3>${title || ""}</h3>`,
      }),
    );
  }

  const content = createElement("div", { className: bodyClassName });
  if (body) {
    if (typeof body === "string") {
      content.innerHTML = body;
    } else {
      content.appendChild(body);
    }
  }
  dialog.appendChild(content);

  if (footer) {
    const footerNode = createElement("footer", { className: footerClassName });
    if (typeof footer === "string") {
      footerNode.innerHTML = footer;
    } else {
      footerNode.appendChild(footer);
    }
    dialog.appendChild(footerNode);
  }

  overlay.appendChild(dialog);
  return overlay;
}
