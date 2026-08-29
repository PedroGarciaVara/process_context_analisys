export function createCausaDetailCauseActions({ state, refs, appState, readRouteParams, isLinkMode, buildCausaDetalleHash, createCausa, createContractNode, linkReusableNode, updateCausa, setAlert, refreshDetail }) {
  async function saveCause() {
    const routeContractId = readRouteParams().contrato_id;
    const activeContractId = state.detail?.contract_id || routeContractId || appState.currentContract;
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

  return { saveCause };
}
