import { moveCausa } from "../api/causas.js";

function text(value, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function nodeVersion(node) {
  return node?.version ?? node?.expected_version ?? node?.version_id ?? node?.updated_at ?? null;
}

function nodeLabel(node) {
  return text(node?.nombre || node?.name || node?.descripcion, `Causa ${node?.id ?? "sin ID"}`);
}

function flattenTree(nodes, depth = 0, output = []) {
  (nodes || []).forEach((node) => {
    if (!node || String(node.node_type || node.tipo || "").toUpperCase() === "HYPOTHESIS") return;
    output.push({ node, depth });
    flattenTree(node.children, depth + 1, output);
  });
  return output;
}

function descendantIds(node, output = new Set()) {
  (node?.children || []).forEach((child) => {
    output.add(String(child.id));
    descendantIds(child, output);
  });
  return output;
}

function findNode(nodes, id) {
  return flattenTree(nodes).find(({ node }) => String(node.id) === String(id))?.node || null;
}

function currentParentId(nodes, causeId) {
  const found = flattenTree(nodes).find(({ node }) => (node.children || []).some((child) => String(child.id) === String(causeId)));
  return found?.node?.id ?? findNode(nodes, causeId)?.parent_id ?? null;
}

function countDescendants(node) {
  return descendantIds(node).size;
}

function protectedRoot(nodes, causeId) {
  return (nodes || []).some((node) => String(node.id) === String(causeId));
}

function create(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}

function errorDetails(error) {
  const payload = error?.data || error?.payload || {};
  const nested = payload.error || {};
  return {
    code: text(error?.code || nested.code || payload.code, "RCA_MOVE_FAILED"),
    correlation: text(error?.correlation_id || nested.correlation_id || payload.correlation_id, "no disponible"),
    message: text(error?.message || nested.message || payload.message, "No se pudo mover la causa."),
  };
}

export function createTreeMoveDialog({ onMove = moveCausa } = {}) {
  const overlay = create("div", "tree-move-dialog");
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "tree-move-dialog-title");
  overlay.setAttribute("aria-describedby", "tree-move-dialog-description tree-move-dialog-status");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "1000";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.background = "rgb(15 23 42 / 0.5)";

  const panel = create("section", "tree-move-dialog-panel");
  panel.tabIndex = -1;
  panel.style.maxWidth = "min(680px, calc(100vw - 2rem))";
  panel.style.maxHeight = "min(760px, calc(100vh - 2rem))";
  panel.style.overflow = "auto";
  panel.style.background = "#fff";
  panel.style.padding = "1.25rem";
  panel.style.borderRadius = "0.5rem";
  panel.style.boxShadow = "0 20px 70px rgb(15 23 42 / 0.3)";
  const title = create("h2", "tree-move-dialog-title", "Mover causa");
  title.id = "tree-move-dialog-title";
  const description = create("p", "tree-move-dialog-description", "Selecciona un nuevo padre. El movimiento se revisará antes de confirmar.");
  description.id = "tree-move-dialog-description";
  const status = create("p", "tree-move-dialog-status", "");
  status.id = "tree-move-dialog-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const close = create("button", "tree-move-dialog-close", "Cerrar");
  close.type = "button";
  close.dataset.moveDialogAction = "close";
  close.setAttribute("aria-label", "Cerrar mover causa");

  const summary = create("p", "tree-move-dialog-cause");
  const searchLabel = create("label", "tree-move-dialog-search-label", "Buscar padre");
  searchLabel.htmlFor = "tree-move-dialog-search";
  const search = create("input", "tree-move-dialog-search");
  search.id = "tree-move-dialog-search";
  search.name = "move_parent_search";
  search.type = "search";
  search.autocomplete = "off";
  search.placeholder = "Buscar por nombre o ID…";
  const candidates = create("div", "tree-move-dialog-candidates");
  candidates.setAttribute("role", "listbox");
  candidates.setAttribute("aria-label", "Padres disponibles");
  candidates.tabIndex = 0;
  const preview = create("section", "tree-move-dialog-preview");
  const previewTitle = create("h3", "", "Vista previa");
  const previewText = create("p", "tree-move-dialog-preview-text");
  const reasonLabel = create("label", "tree-move-dialog-reason-label", "Motivo (obligatorio)");
  reasonLabel.htmlFor = "tree-move-dialog-reason";
  const reason = create("textarea", "tree-move-dialog-reason");
  reason.id = "tree-move-dialog-reason";
  reason.name = "move_reason";
  reason.required = true;
  reason.rows = 3;
  reason.maxLength = 2000;
  reason.placeholder = "Explica por qué cambia la relación…";
  const error = create("p", "tree-move-dialog-error");
  error.hidden = true;
  error.setAttribute("role", "alert");
  const cancel = create("button", "tree-move-dialog-cancel", "Cancelar");
  cancel.type = "button";
  cancel.dataset.moveDialogAction = "close";
  const confirm = create("button", "tree-move-dialog-confirm", "Confirmar movimiento");
  confirm.type = "button";
  confirm.dataset.moveDialogAction = "confirm";

  const actions = create("div", "tree-move-dialog-actions");
  actions.append(cancel, confirm);
  preview.append(previewTitle, previewText);
  panel.append(title, close, description, status, summary, searchLabel, search, candidates, preview, reasonLabel, reason, error, actions);
  overlay.appendChild(panel);

  let model = null;
  let lastFocus = null;
  let selectedParentId = null;
  let pending = false;

  function updatePreview() {
    if (!model?.cause) return;
    const parent = selectedParentId === null ? null : findNode(model.tree, selectedParentId);
    const currentParent = model.currentParentId === null ? "Raíz" : nodeLabel(findNode(model.tree, model.currentParentId));
    const nextParent = parent ? nodeLabel(parent) : "Raíz";
    const descendantCount = countDescendants(model.cause);
    const preservedIds = new Set([String(model.cause.id), ...descendantIds(model.cause)]);
    const hypothesisCount = Object.entries(model.payload?.hypotheses_by_cause || {})
      .filter(([causeId]) => preservedIds.has(String(causeId)))
      .reduce((total, [, items]) => total + (Array.isArray(items) ? items.length : 0), 0);
    previewText.textContent = `Antes: ${currentParent}. Después: ${nextParent}. Se conservan ${descendantCount} descendiente(s), ${hypothesisCount} hipótesis y sus resultados/referencias.`;
    confirm.disabled = pending || model.isRoot || nodeVersion(model.cause) === null || selectedParentId === model.currentParentId || !text(reason.value);
  }

  function renderCandidates() {
    candidates.replaceChildren();
    if (!model) return;
    const query = text(search.value).toLocaleLowerCase("es");
    const filtered = model.candidates.filter(({ node }) => `${nodeLabel(node)} ${node.id}`.toLocaleLowerCase("es").includes(query));
    if (!filtered.length) {
      candidates.appendChild(create("p", "tree-move-dialog-empty", "No hay padres compatibles con la búsqueda."));
      return;
    }
    filtered.forEach(({ node, reason: candidateReason }) => {
      const button = create("button", "tree-move-dialog-candidate");
      button.type = "button";
      button.dataset.parentId = String(node.id);
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(String(selectedParentId) === String(node.id)));
      button.append(create("strong", "", nodeLabel(node)), create("span", "", `ID ${node.id} · ${candidateReason}`));
      button.addEventListener("click", () => {
        selectedParentId = node.id;
        renderCandidates();
        updatePreview();
      });
      candidates.appendChild(button);
    });
  }

  function closeDialog() {
    if (pending) return;
    overlay.hidden = true;
    document.removeEventListener("keydown", onKeyDown);
    lastFocus?.focus?.();
    lastFocus = null;
    model = null;
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(panel.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])"));
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
  }

  async function submit() {
    if (!model || pending) return;
    const trimmedReason = text(reason.value);
    if (!trimmedReason) {
      error.hidden = false;
      error.textContent = "Indica el motivo para poder confirmar el movimiento.";
      reason.focus();
      return;
    }
    if (nodeVersion(model.cause) === null) {
      error.hidden = false;
      error.textContent = "No se puede confirmar: la versión real de la causa no está disponible.";
      return;
    }
    pending = true;
    confirm.disabled = true;
    cancel.disabled = true;
    close.disabled = true;
    error.hidden = true;
    status.textContent = "Guardando movimiento…";
    try {
      const response = await onMove(model.cause.id, {
        parent_id: selectedParentId,
        expected_version: nodeVersion(model.cause),
        reason: trimmedReason,
      });
      status.textContent = "Movimiento guardado.";
      overlay.dispatchEvent(new CustomEvent("rca:cause-move-confirmed", { bubbles: true, detail: { causeId: model.cause.id, parentId: selectedParentId, response } }));
      pending = false;
      closeDialog();
    } catch (moveError) {
      const details = errorDetails(moveError);
      error.hidden = false;
      error.textContent = `${details.message} Código: ${details.code}. Correlación: ${details.correlation}. Puedes reintentar.`;
      status.textContent = "No se guardó ningún cambio.";
      confirm.textContent = "Reintentar movimiento";
      pending = false;
      cancel.disabled = false;
      close.disabled = false;
      updatePreview();
    }
  }

  function open({ causeId, parentId, tree = [], payload = {}, source = "keyboard" } = {}) {
    const cause = findNode(tree, causeId);
    if (!cause) return false;
    const descendants = descendantIds(cause);
    const currentId = currentParentId(tree, cause.id);
    const isRoot = protectedRoot(tree, cause.id);
    const candidatesList = flattenTree(tree)
      .filter(({ node }) => !descendants.has(String(node.id)) && String(node.id) !== String(cause.id))
      .map(({ node }) => ({
        node,
        reason: String(node.id) === String(currentId) ? "padre actual" : (isRoot ? "raíz protegida como destino" : "destino válido; el servidor vuelve a validar"),
      }));
    if (isRoot) {
      error.hidden = false;
      error.textContent = "La causa raíz protegida no se puede convertir en hija.";
    } else {
      error.hidden = true;
      error.textContent = "";
    }
    model = { cause, tree, payload, currentParentId: currentId, candidates: candidatesList, source, isRoot };
    selectedParentId = parentId !== undefined && parentId !== null ? parentId : currentId;
    lastFocus = document.activeElement;
    summary.textContent = `${nodeLabel(cause)} · versión ${text(nodeVersion(cause), "no disponible")}`;
    reason.value = "";
    search.value = "";
    status.textContent = `Origen: ${source === "drag" ? "arrastre" : "teclado"}.`;
    pending = false;
    confirm.textContent = "Confirmar movimiento";
    cancel.disabled = false;
    close.disabled = false;
    renderCandidates();
    updatePreview();
    overlay.hidden = false;
    document.addEventListener("keydown", onKeyDown);
    search.focus();
    return true;
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeDialog();
  });
  overlay.querySelectorAll('[data-move-dialog-action="close"]').forEach((button) => button.addEventListener("click", closeDialog));
  confirm.addEventListener("click", submit);
  search.addEventListener("input", renderCandidates);
  reason.addEventListener("input", updatePreview);

  return { element: overlay, open, close: closeDialog, isOpen: () => !overlay.hidden };
}
