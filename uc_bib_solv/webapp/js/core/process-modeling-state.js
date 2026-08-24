export function createProcessModelingState() {
  return { status: "loading", processes: [], selectedProcess: null, version: null, expansionStack: [], openedFromParent: null, message: "", fullscreen: false, fullscreenMode: null, selectedNodeId: "", selectedNodeContextRecords: [], paletteModalType: "", paletteModalMode: "create", editingNodeId: "", zoom: 1 };
}
