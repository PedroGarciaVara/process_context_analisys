export function createProcessModelingExpansion({ state, modelProcessId, getProcess, writeModelingHash, editor, message, focusFullscreenControl }) {
  async function expandSubprocess(nodeId, depth = 0, requestedParentProcessId = "") {
    const activeProcess = depth === 0 ? state.process : state.expansionStack.find((item) => String(item.process?.process_id) === String(requestedParentProcessId))?.process || state.expansionStack[depth - 1]?.process;
    const parentProcessId = activeProcess?.process_id || modelProcessId();
    const node = (activeProcess?.nodes || []).find((item) => String(item.node_id) === String(nodeId));
    if (!node) throw new Error("No se encontró el nodo de expansión.");
    if (node.node_type !== "subprocess" || !node.child_process_id) throw new Error("El nodo seleccionado no tiene un subproceso expandible.");
    if (!parentProcessId) throw new Error("No hay un proceso padre seleccionado.");
    const payload = await getProcess(parentProcessId, { expandNodeId: nodeId });
    if (!payload?.data?.subprocess_context) throw new Error("La API no devolvió el contexto del subproceso.");
    const entry = { parentProcessId, nodeId, depth, process: payload.data, expandedHeight: null, nodeName: node.name, label: payload.data.subprocess_context?.breadcrumb_label || `${activeProcess?.name || state.selectedProcess?.name || "Proceso padre"} > ${node.name}` };
    state.expansionStack = state.expansionStack.filter((item) => !(String(item.parentProcessId) === String(parentProcessId) && String(item.nodeId) === String(nodeId)));
    state.expansionStack.push(entry);
    writeModelingHash(modelProcessId(), state.expansionStack.map((item) => item.nodeId));
    editor();
    if (state.fullscreen) focusFullscreenControl();
  }

  function collapseSubprocess(nodeId = "") {
    if (!nodeId && state.openedFromParent) {
      const parent = state.openedFromParent;
      state.process = parent.process; state.selectedProcess = parent.selectedProcess; state.expansionStack = parent.expansionStack || []; state.openedFromParent = null; state.zoom = 1;
      if (modelProcessId()) writeModelingHash(modelProcessId(), state.expansionStack.map((item) => item.nodeId));
      editor(); return;
    }
    state.expansionStack = nodeId ? state.expansionStack.filter((item) => String(item.nodeId) !== String(nodeId)) : state.expansionStack.slice(0, -1);
    if (state.expansionStack.length) writeModelingHash(modelProcessId(), state.expansionStack.map((item) => item.nodeId));
    else if (modelProcessId()) writeModelingHash(modelProcessId());
    editor();
    if (state.fullscreen) focusFullscreenControl();
  }

  function openSubprocessOnly(nodeId, depth = 0) {
    const expansion = state.expansionStack.find((item) => String(item.nodeId) === String(nodeId) && Number(item.depth) === Number(depth));
    if (!expansion?.process) return message("Expande primero el subproceso para abrirlo.", true);
    state.openedFromParent = { process: state.process, selectedProcess: state.selectedProcess, expansionStack: state.expansionStack };
    state.process = expansion.process; state.selectedProcess = expansion.process.process || expansion.process || state.selectedProcess; state.expansionStack = []; state.selectedNodeId = ""; state.zoom = 1;
    writeModelingHash(expansion.process?.subprocess_context?.child_process_id || expansion.process?.process_id || "");
    editor();
  }

  return { expandSubprocess, collapseSubprocess, openSubprocessOnly };
}
