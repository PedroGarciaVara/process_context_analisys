export function createProcessModelingState() {
  return { status: "loading", processes: [], selectedProcess: null, process: null, expansionStack: [], openedFromParent: null, message: "", fullscreen: false, fullscreenMode: null, selectedNodeId: "", selectedTransitionId: "", selectedNodeContextRecords: [], selectedNodeContextDetail: null, paletteModalType: "", paletteModalMode: "create", editingNodeId: "", zoom: 1 };
}
