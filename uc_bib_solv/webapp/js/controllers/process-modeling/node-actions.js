export function createProcessModelingNodeActions({
  state,
  modelProcessId,
  getProcess,
  createNode,
  createNodeWithTransition,
  updateNode,
  deleteNode,
  createTransition,
  editor,
  message,
  closePaletteModal,
  navigateToSelectedNodeDetail,
}) {
  async function refreshProcess() {
    state.process = (await getProcess(modelProcessId())).data;
    editor();
  }

  function editSelectedNode() {
    const node = (state.process?.nodes || []).find((item) => String(item.node_id) === String(state.selectedNodeId));
    if (!node) return message("Selecciona un elemento del diagrama para editarlo.", true);
    return navigateToSelectedNodeDetail(node);
  }

  async function deleteSelectedNode() {
    const node = (state.process?.nodes || []).find((item) => String(item.node_id) === String(state.selectedNodeId));
    if (!node) return message("Selecciona un elemento del diagrama para eliminarlo.", true);
    if (!window.confirm(`¿Eliminar ${node.node_code} — ${node.name}? También se eliminarán sus relaciones.`)) return;
    await deleteNode(node.node_id);
    state.selectedNodeId = "";
    await refreshProcess();
    message("Elemento eliminado del flujo.");
  }

  function buildNodeData(formData) {
    const data = { node_type: formData.get("node_type"), name: formData.get("name"), description: formData.get("description") || null };
    if (data.node_type === "subprocess" && formData.get("child_process_id")) data.child_process_id = formData.get("child_process_id");
    if (data.node_type === "output") data.output_role = formData.get("output_role") || "normal";
    if (data.node_type === "stock") data.properties = { stock: { capacity: Number(formData.get("stock_capacity")), initial_quantity: Number(formData.get("stock_initial_quantity")), unit: formData.get("stock_unit") } };
    return data;
  }

  async function createPaletteNodeFromForm(form) {
    const formData = new FormData(form);
    const data = buildNodeData(formData);
    const parent = (state.process.nodes || []).find((node) => String(node.node_id) === String(state.selectedNodeId));
    const branch = parent?.node_type === "decision";
    const branchLabel = formData.get("label") || "";
    if (state.paletteModalMode === "create" && branch && !branchLabel) return message("Selecciona si el elemento pertenece a la rama Sí o a la rama No.", true);
    if (state.paletteModalMode === "edit") {
      await updateNode(state.editingNodeId, data);
      await refreshProcess();
      closePaletteModal();
      message("Elemento actualizado.");
      return;
    }
    const created = (await createNodeWithTransition(modelProcessId(), {
      node: data,
      transition: { source_node_id: state.selectedNodeId, transition_type: branch ? "branch" : "sequence", label: branch ? branchLabel : null },
    })).data;
    await refreshProcess();
    state.selectedNodeId = created.node.node_id;
    closePaletteModal();
    editor();
    message("Elemento guardado y conectado al flujo.");
  }

  async function createNodeFromForm(form) {
    const data = buildNodeData(new FormData(form));
    await createNode(modelProcessId(), data);
    await refreshProcess();
    message("Nodo guardado.");
  }

  async function createTransitionFromForm(form) {
    const formData = new FormData(form);
    await createTransition(modelProcessId(), {
      source_node_id: formData.get("source_node_id"),
      target_node_id: formData.get("target_node_id"),
      transition_type: formData.get("transition_type"),
      label: formData.get("label") || null,
    });
    await refreshProcess();
    message("Transición guardada.");
  }

  return { editSelectedNode, deleteSelectedNode, createPaletteNodeFromForm, createNodeFromForm, createTransitionFromForm };
}
