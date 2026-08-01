import { createElement, escapeHtml } from "../core/utils.js";
import { setCurrentContract, setCurrentProcess } from "../core/state.js";
import { getContracts } from "../core/operational.js";
import { createHomeShellV02, bindHomeShellV02 } from "./shell_v02.js";
import { renderCausaDetalle } from "./causa_detalle.js";

function readRouteParams() {
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  const query = queryIndex >= 0 ? hash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);
  return {
    contrato_id: params.get("contrato_id") || "",
    causa_id: params.get("causa_id") || "",
    parent_id: params.get("parent_id") || "",
    hipotesis_id: params.get("hipotesis_id") || "",
  };
}

export function deriveScopeFromDetailParams(params, catalog) {
  const contractId = params?.contrato_id ? Number(params.contrato_id) : null;
  if (!Number.isFinite(contractId)) {
    return { contractId: null, processId: null };
  }
  const contracts = catalog?.data?.contratos || [];
  const contract = contracts.find((item) => String(item.id) === String(contractId));
  return {
    contractId,
    processId: contract?.processId ?? null,
  };
}

function buildRightPanel(params, catalog) {
  const mode = params.hipotesis_id
    ? "Editar hipotesis"
    : params.causa_id
      ? "Editar causa"
      : params.parent_id
        ? "Nueva causa hija o vinculo"
        : "Nueva raiz o contrato";

  const contract = getContracts({ catalog }).find((item) => String(item.id) === String(params.contrato_id));
  return `
    <div class="p-lg border-b border-outline-variant bg-surface-container-low">
      <p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Espacio de detalle</p>
      <h2 class="font-headline-md text-headline-md text-primary mt-xs">Causa detalle</h2>
      <p class="font-body-sm text-body-sm text-on-surface-variant mt-sm">Crea y edita causas e hipotesis manteniendo la misma envolvente industrial del resto del producto.</p>
    </div>
    <div class="p-lg space-y-lg">
      <div class="grid grid-cols-2 gap-sm">
        <div class="p-sm bg-white rounded border border-outline-variant">
          <p class="text-[10px] text-on-surface-variant uppercase font-bold">Modo</p>
          <p class="text-title-lg font-bold text-primary">${escapeHtml(mode)}</p>
        </div>
        <div class="p-sm bg-white rounded border border-outline-variant">
          <p class="text-[10px] text-on-surface-variant uppercase font-bold">Contrato</p>
          <p class="text-title-lg font-bold text-primary">${escapeHtml(contract?.name || "—")}</p>
        </div>
      </div>
      <div class="p-md bg-surface-container-low rounded-lg border border-outline-variant">
        <p class="font-label-md text-label-md text-primary mb-xs">Flujo esperado</p>
        <p class="text-[12px] text-on-surface-variant">1. Elige entre crear o reutilizar. 2. Guarda el vinculo o la causa/contrato. 3. Vuelve al arbol y continua ramificando.</p>
      </div>
    </div>
  `;
}

export function renderCausaDetalleV02(state = {}) {
  const params = readRouteParams();
  const { root, mainSlot, rightSlot } = createHomeShellV02(
    { route: "causa_detalle_v02" },
    { rightWidthClass: "w-[420px]" },
  );
  const mainWrap = createElement("div", { className: "max-w-6xl mx-auto" });
  const detailView = renderCausaDetalle();
  detailView.classList.add("detail-page--single-column");
  mainWrap.appendChild(detailView);
  mainSlot.appendChild(mainWrap);
  rightSlot.innerHTML = buildRightPanel(params, state.catalog);

  return {
    shellMode: "full",
    main: root,
    afterMount(mountRoot, currentState) {
      document.title = "Industrial RCA - Causa detalle";
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      const scope = deriveScopeFromDetailParams(params, currentState?.catalog);
      if (scope.processId) {
        setCurrentProcess(scope.processId);
      }
      if (scope.contractId) {
        setCurrentContract(scope.contractId);
      }
      bindHomeShellV02(mountRoot);
    },
  };
}
