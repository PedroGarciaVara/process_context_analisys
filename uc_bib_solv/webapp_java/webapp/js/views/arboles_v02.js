import { findContract, findMachine, findProcess } from "../core/operational.js";
import { createElement, escapeHtml } from "../core/utils.js";
import { setCurrentContract, setCurrentProcess } from "../core/state.js";
import { createTreePageShell } from "../components/tree-shell.js";
import { bindHomeShellV02, createHomeShellV02 } from "./shell_v02.js";

function readRouteParams() {
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  const query = queryIndex >= 0 ? hash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);
  return {
    contract_id: params.get("contract_id") || "",
  };
}

export function deriveTreeScopeFromRoute(params, catalog, fallbackState = {}) {
  const routeContractId = params?.contract_id ? Number(params.contract_id) : null;
  const contracts = catalog?.data?.contratos || [];
  const routeContract = Number.isFinite(routeContractId)
    ? contracts.find((item) => String(item.id) === String(routeContractId))
    : null;

  return {
    contractId: routeContract?.id ?? fallbackState.currentContract ?? null,
    processId: routeContract?.processId ?? fallbackState.currentProcess ?? null,
  };
}

function buildTreeHero(state) {
  const process = state.currentProcess ? findProcess(state, state.currentProcess) : null;
  const contract = state.currentContract ? findContract(state, state.currentContract) : null;
  const machine = state.currentMachine ? findMachine(state, state.currentMachine) : null;

  return `
    <section class="space-y-sm mb-xl">
      <span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de trabajo del arbol causal</span>
      <div class="flex items-end justify-between gap-lg flex-wrap">
        <div>
          <h1 class="font-display-lg text-display-lg text-on-background">Arbol</h1>
          <p class="font-body-md text-body-md text-secondary max-w-3xl">
            Navega el arbol causal operativo con el estandar industrial vigente. La proyeccion mantiene el renderer actual, pero ya puede incorporar contratos dependientes y sus causas resueltas automaticamente por backend.
          </p>
        </div>
        <span class="px-sm py-xs bg-primary-container text-on-primary text-[11px] font-bold rounded uppercase">${escapeHtml(contract?.name || machine?.name || process?.name || "Alcance operativo")}</span>
      </div>
      <div class="rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm shadow-sm">
        <div class="flex items-start gap-sm">
          <span class="material-symbols-outlined text-primary mt-[1px]">device_hub</span>
          <div class="space-y-xs">
            <p class="font-label-md text-label-md text-primary uppercase tracking-wide">Proyeccion DAG activa</p>
            <p class="font-body-sm text-body-sm text-secondary max-w-3xl">
              Si el contrato seleccionado depende de otros contratos, el arbol puede mostrarlos ya expandidos dentro del mismo alcance sin requerir una interaccion adicional.
            </p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function buildTreeSidebarControls(state) {
  const contractOptions = (state.catalog?.data?.contratos || []).map((item) => {
    const selected = String(state.currentContract || "") === String(item.id) ? " selected" : "";
    return `<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(item.id)} - ${escapeHtml(item.name)}</option>`;
  }).join("");

  return `
    <section class="mb-xl px-sm space-y-md">
      <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
        <div class="flex items-center gap-sm mb-sm">
          <span class="material-symbols-outlined text-primary">account_tree</span>
          <div>
            <p class="font-headline-sm text-headline-sm text-primary">Alcance del arbol</p>
            <p class="font-label-md text-label-md text-secondary">Selector de contrato</p>
          </div>
        </div>
        <label class="block space-y-xs mb-md">
          <span class="font-label-md text-label-md text-secondary">Contrato</span>
          <select id="arbol-v02-contract-select" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
            <option value="">Selecciona contrato</option>
            ${contractOptions}
          </select>
        </label>
        <button type="button" class="w-full bg-primary text-on-primary py-sm rounded-lg font-label-md text-label-md hover:bg-primary-container transition-all" data-action="tree-add-root-v02" ${state.currentContract ? "" : "disabled"}>
          Crear causa raiz
        </button>
      </div>
    </section>
  `;
}

export function renderArbolesV02(state) {
  const routeParams = readRouteParams();
  const routeScope = deriveTreeScopeFromRoute(routeParams, state.catalog, state);
  const viewState = {
    ...state,
    currentContract: routeScope.contractId,
    currentProcess: routeScope.processId,
  };

  const treePage = createTreePageShell("arbol", viewState);
  const { root, mainSlot, rightSlot, sidebarTopSlot } = createHomeShellV02(viewState, { rightWidthClass: "w-[460px]" });

  const mainWrap = createElement("div", { className: "max-w-none mx-auto space-y-xl min-w-0" });
  mainWrap.innerHTML = buildTreeHero(viewState);
  mainWrap.appendChild(treePage.main);
  mainSlot.appendChild(mainWrap);
  rightSlot.appendChild(treePage.detail);
  if (sidebarTopSlot) {
    sidebarTopSlot.innerHTML = buildTreeSidebarControls(viewState);
  }

  return {
    shellMode: "full",
    main: root,
    afterMount(mountRoot, currentState, eventBus) {
      document.title = "Industrial RCA - Arbol";
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      if (routeScope.processId) {
        setCurrentProcess(routeScope.processId);
      }
      if (routeScope.contractId) {
        setCurrentContract(routeScope.contractId);
      }
      bindHomeShellV02(mountRoot);
      const contractSelect = mountRoot.querySelector("#arbol-v02-contract-select");
      if (contractSelect) {
        contractSelect.addEventListener("change", () => {
          const nextContractId = contractSelect.value ? Number(contractSelect.value) : null;
          const nextContract = (currentState.catalog?.data?.contratos || []).find(
            (item) => String(item.id) === String(nextContractId || ""),
          );
          if (nextContract?.processId) {
            setCurrentProcess(nextContract.processId);
          }
          setCurrentContract(nextContractId);
          if (eventBus) {
            eventBus.emit("state:change");
          }
        });
      }
      const addRootBtn = mountRoot.querySelector("[data-action='tree-add-root-v02']");
      if (addRootBtn) {
        addRootBtn.addEventListener("click", () => {
          if (!currentState.currentContract) {
            return;
          }
          window.location.hash = `#/causa_detalle_v02?contrato_id=${encodeURIComponent(String(currentState.currentContract))}`;
        });
      }
      if (typeof treePage.afterMount === "function") {
        treePage.afterMount(mountRoot, currentState, eventBus);
      }
    },
  };
}
