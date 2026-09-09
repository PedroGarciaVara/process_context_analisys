import { toHashRoute } from "../core/utils.js";

function buildRoute(route, params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return `${toHashRoute(route)}${queryString ? `?${queryString}` : ""}`;
}

export function buildDetailRoute(contractId, causeId) {
  return buildRoute("causa_detalle", {
    contrato_id: contractId,
    causa_id: causeId,
  });
}

export function buildChildRoute(contractId, parentId) {
  return buildRoute("causa_detalle", {
    contrato_id: contractId,
    parent_id: parentId,
  });
}

export function buildCreateCauseRoute(mode, contractId, selectedNodeId) {
  return buildRoute("causa_detalle", {
    contrato_id: contractId,
    ...(mode === "analisis_causas_v2" && selectedNodeId ? { causa_id: selectedNodeId } : {}),
  });
}

export function buildDeleteModalCopy(cause, { protectedRoot = false } = {}) {
  if (protectedRoot) {
    return {
      title: "No se puede eliminar la causa raíz inicial",
      message: `'${cause?.nombre || `Causa ${cause?.id}`}’ es el nodo inicial del árbol.`,
      detail: "La causa raíz inicial es obligatoria para conservar la plantilla del árbol. Puedes eliminar sus causas hijas, pero no este nodo.",
      confirm_label: "No se puede eliminar",
      cancel_label: "Cerrar",
      can_delete: false,
    };
  }
  return {
    title: "Confirmar eliminacion de causa",
    message: `Vas a eliminar '${cause?.nombre || `Causa ${cause?.id}`}'.`,
    detail: "Esta accion elimina el nodo del arbol de trabajo en la vista actual.",
    confirm_label: "Eliminar",
    cancel_label: "Cancelar",
    can_delete: true,
  };
}

export function increaseZoom(zoom) {
  return Math.min(2.0, Number((Number(zoom || 1) + 0.1).toFixed(2)));
}

export function decreaseZoom(zoom) {
  return Math.max(0.5, Number((Number(zoom || 1) - 0.1).toFixed(2)));
}

export function resetZoom() {
  return 1.0;
}
