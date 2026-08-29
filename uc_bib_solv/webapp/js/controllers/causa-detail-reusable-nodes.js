export function createCausaDetailReusableNodeActions({ state, refs, isLinkMode, getLinkNodeType, searchReusableNodes, renderReusableResults, renderSearchSummary, applyEditorConfig, setModalVisible, escapeHtml, createElement }) {
  async function runSearch() {
    if (!state.detail?.ready) return;
    const nodeType = getLinkNodeType(state.editorMode);
    state.searchNodeType = nodeType;
    refs.searchStatus.textContent = "Buscando...";
    clearNode(refs.searchResults);
    try {
      const payload = await searchReusableNodes({
        node_type: nodeType,
        text: refs.searchText.value,
        contract_id: state.detail.contract_id,
        parent_id: state.detail.parent_id,
        limit: 20,
      });
      state.searchResults = payload.items || [];
      refs.searchStatus.textContent = `${payload.count || 0} resultados`;
      refs.searchResults.appendChild(renderReusableResults(state.searchResults, state.selectedReusableNode?.node_id));
    } catch (error) {
      refs.searchStatus.textContent = "Busqueda fallida";
      refs.searchResults.appendChild(createElement("div", {
        className: "detail-page__error",
        html: `<strong>No se pudo completar la busqueda.</strong><p>${escapeHtml(error.message)}</p>`,
      }));
    }
  }

  function openSearch() {
    if (!isLinkMode(state.editorMode)) return;
    const label = state.editorMode === "link_existing_contract" ? "contrato" : "causa";
    refs.searchTitle.textContent = `Selecciona ${label} reutilizable`;
    refs.searchSubtitle.textContent = `Filtra ${label}s por descripcion, proceso, codigo o metadata de negocio.`;
    setModalVisible(refs.searchModal, true);
    void runSearch();
  }

  function closeSearch() {
    setModalVisible(refs.searchModal, false);
  }

  function clearSelected() {
    state.selectedReusableNode = null;
    if (state.detail) applyEditorConfig(state.detail);
  }

  function selectResult(nodeId) {
    const selected = state.searchResults.find((item) => Number(item.node_id) === Number(nodeId));
    if (!selected) return;
    state.selectedReusableNode = selected;
    if (state.detail) applyEditorConfig(state.detail);
    closeSearch();
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  return { runSearch, openSearch, closeSearch, clearSelected, selectResult };
}
