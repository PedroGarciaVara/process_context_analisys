export function createCausaDetailEditor({ state, refs, readRouteParams, getEditorModeOptions, getEditorConfig, isLinkMode, getLinkNodeType, renderReusableSummary, createElement, clearNode }) {
  function setMode(mode) {
    state.editorMode = mode;
    if (!isLinkMode(mode)) state.selectedReusableNode = null;
    if (state.selectedReusableNode && state.selectedReusableNode.node_type !== getLinkNodeType(mode)) state.selectedReusableNode = null;
  }

  function resolveMode(payload) {
    if (payload?.causa_id) {
      state.editorMode = "edit_cause";
      return;
    }
    const options = getEditorModeOptions(readRouteParams());
    if (!options.some((option) => option.value === state.editorMode)) state.editorMode = options[0]?.value || "new_cause";
    if (!isLinkMode(state.editorMode)) state.selectedReusableNode = null;
    else if (state.selectedReusableNode && state.selectedReusableNode.node_type !== getLinkNodeType(state.editorMode)) state.selectedReusableNode = null;
  }

  function renderModeSelector(payload) {
    clearNode(refs.editorModeWrap);
    refs.editorModeWrap.setAttribute("role", "tablist");
    refs.editorModeWrap.setAttribute("aria-label", "Modo del editor de causa");
    refs.editorModeWrap.setAttribute("aria-orientation", "horizontal");
    const options = getEditorModeOptions(readRouteParams());
    if (payload?.causa_id) {
      refs.editorModeWrap.classList.add("is-hidden");
      refs.editorModePanel.removeAttribute("aria-labelledby");
      return;
    }
    refs.editorModeWrap.classList.remove("is-hidden");
    options.forEach((option) => {
      const isActive = state.editorMode === option.value;
      const tabId = `cd-editor-mode-${option.value}`;
      const tab = createElement("button", {
        className: `detail-mode-selector__button${isActive ? " is-active" : ""}`,
        text: option.label,
        attrs: {
          type: "button",
          id: tabId,
          role: "tab",
          "aria-selected": isActive ? "true" : "false",
          "aria-controls": "cd-editor-mode-panel",
          tabindex: isActive ? "0" : "-1",
          "data-editor-mode": option.value,
        },
      });
      refs.editorModeWrap.appendChild(tab);
      if (isActive) refs.editorModePanel.setAttribute("aria-labelledby", tabId);
    });
  }

  function renderSearchSummary(config) {
    clearNode(refs.linkSummary);
    refs.linkSummary.appendChild(state.selectedReusableNode
      ? renderReusableSummary(state.selectedReusableNode)
      : createElement("div", { className: "detail-empty-state detail-empty-state--compact", text: config.emptySelection || "Selecciona un nodo reutilizable." }));
  }

  function applyConfig(payload) {
    const modeConfig = getEditorConfig(state.editorMode, payload);
    refs.editorHelp.textContent = modeConfig.help;
    refs.causeNameLabel.textContent = modeConfig.nameLabel || "Nombre";
    refs.causeCategoryLabel.textContent = modeConfig.categoryLabel || "Categoria";
    refs.causeDescriptionLabel.textContent = modeConfig.descriptionLabel || "Descripcion";
    refs.causeTypeField.classList.toggle("is-hidden", modeConfig.typeVisible === false);
    refs.causeSave.textContent = modeConfig.saveLabel;
    refs.linkSearch.textContent = modeConfig.searchButtonLabel || "Buscar nodo existente";
    const linkMode = isLinkMode(state.editorMode);
    refs.linkActions.classList.toggle("is-hidden", !linkMode);
    refs.editorFields.classList.toggle("is-hidden", linkMode);
    renderSearchSummary(modeConfig);
  }

  return { setMode, resolveMode, renderModeSelector, renderSearchSummary, applyConfig };
}
