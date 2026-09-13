import { findContract, findMachine, findProcess } from "../../core/operational.js";
import { createElement, escapeHtml } from "../../core/utils.js";
import { setCurrentContract, setCurrentProcess } from "../../core/state.js";
import { resolveTreeDisplayContext } from "../../components/tree-data.js";
import { createTreePageShell } from "../../components/tree-shell.js";
import { bindHomeShell, createHomeShell } from "../bpm/shell.js";

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
  const fallbackContract = contracts.find(
    (item) => String(item.id) === String(fallbackState.currentContract || "")
      && (!fallbackState.currentProcess || String(item.processId) === String(fallbackState.currentProcess)),
  );

  return {
    contractId: routeContract?.id ?? fallbackContract?.id ?? null,
    processId: routeContract?.processId ?? fallbackState.currentProcess ?? fallbackContract?.processId ?? null,
  };
}

function buildTreeHero(state) {
  const process = state.currentProcess ? findProcess(state, state.currentProcess) : null;
  const contract = state.currentContract ? findContract(state, state.currentContract) : null;
  const machine = state.currentMachine ? findMachine(state, state.currentMachine) : null;
  const displayContext = resolveTreeDisplayContext({ contract }, state.catalog);
  const processName = displayContext.processName || process?.name || "Alcance operativo";
  const objective = displayContext.objective || contract?.objetivo || "";

  return `
    <section class="michelin-page-hero michelin-page-hero--blue space-y-sm mb-xl">
      <span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de trabajo del arbol causal</span>
      <div class="flex items-end justify-between gap-lg flex-wrap">
        <div>
          <h1 class="font-display-lg text-display-lg text-on-background">Arbol</h1>
          ${objective ? `<p class="tree-objective-title">${escapeHtml(objective)}</p>` : ""}
          <p class="font-body-md text-body-md text-secondary max-w-3xl mt-md">
            Navega el arbol causal operativo con el estandar industrial vigente. La proyeccion mantiene el renderer actual, pero ya puede incorporar contratos dependientes y sus causas resueltas automaticamente por backend.
          </p>
        </div>
        <span class="px-sm py-xs bg-primary-container text-on-primary text-[11px] font-bold rounded uppercase">${objective ? "Objetivo seleccionado" : "Alcance operativo"}</span>
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

function getTreeContracts(state, processId = "", objective = "") {
  const contracts = state.catalog?.data?.contratos || [];
  return contracts.filter((item) => {
    if (processId && String(item.processId) !== String(processId)) {
      return false;
    }
    if (objective && String(item.objetivo || "").trim() !== String(objective)) {
      return false;
    }
    return true;
  });
}

function getTreeObjectives(contracts) {
  return [...new Set(
    contracts
      .map((item) => String(item.objetivo || "").trim())
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, "es"));
}

function buildTreeSidebarControls(state) {
  const allContracts = state.catalog?.data?.contratos || [];
  const selectedContract = allContracts.find(
    (item) => String(item.id) === String(state.currentContract || ""),
  );
  const processId = state.currentProcess || selectedContract?.processId || "";
  const scopedContracts = getTreeContracts(state, processId);
  const objective = state.treeObjective ?? (processId ? selectedContract?.objetivo || "" : "");
  const processes = state.catalog?.data?.procesos || [];
  const processOptions = processes.map((item) => {
    const selected = String(processId) === String(item.id) ? " selected" : "";
    return `<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(item.name)}</option>`;
  }).join("");
  const objectiveOptions = getTreeObjectives(scopedContracts).map((item) => {
    const selected = objective === item ? " selected" : "";
    return `<option value="${escapeHtml(item)}"${selected}>${escapeHtml(item)}</option>`;
  }).join("");
  const selectedProcessName = processes.find((item) => String(item.id) === String(processId))?.name || "Todos los procesos";
  const selectedObjective = objective || "Todos los objetivos";
  return `
    <section class="tree-scope-toolbar mb-xl space-y-md">
      <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
        <div class="flex items-center gap-sm mb-sm">
          <span class="material-symbols-outlined text-primary">account_tree</span>
          <div>
            <p class="font-headline-sm text-headline-sm text-primary">Alcance del arbol</p>
            <p class="font-label-md text-label-md text-secondary">Selector de contrato</p>
          </div>
          </div>
        <label class="block space-y-xs mb-md">
          <span class="font-label-md text-label-md text-secondary">Proceso</span>
          <select id="arbol-v02-process-select" title="${escapeHtml(selectedProcessName)}" aria-describedby="arbol-v02-process-value" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
            <option value="">Todos los procesos</option>
            ${processOptions}
          </select>
          <span id="arbol-v02-process-value" class="tree-filter-value" tabindex="0">${escapeHtml(selectedProcessName)}</span>
        </label>
        <label class="block space-y-xs mb-md">
          <span class="font-label-md text-label-md text-secondary">Objetivo del contrato</span>
          <select id="arbol-v02-objective-select" title="${escapeHtml(selectedObjective)}" aria-describedby="arbol-v02-objective-value" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" ${processId && scopedContracts.length ? "" : "disabled"}>
            <option value="">Todos los objetivos</option>
            ${objectiveOptions}
          </select>
          <span id="arbol-v02-objective-value" class="tree-filter-value" tabindex="0">${escapeHtml(selectedObjective)}</span>
        </label>
        <div class="flex gap-sm flex-wrap">
          <button type="button" class="flex-1 bg-primary text-on-primary py-sm rounded-lg font-label-md text-label-md hover:bg-primary-container transition-all" data-action="tree-add-root-v02" ${state.currentContract ? "" : "disabled"}>
            Crear causa raiz
          </button>
          <button type="button" class="flex-1 border border-primary text-primary py-sm rounded-lg font-label-md text-label-md hover:bg-primary-container" data-action="tree-move-cause-v02" aria-label="Mover causa seleccionada…">
            Mover causa…
          </button>
        </div>
      </div>
    </section>
  `;
}

export function renderArboles(state) {
  const routeParams = readRouteParams();
  const routeScope = deriveTreeScopeFromRoute(routeParams, state.catalog, state);
  const routeContract = routeScope.contractId ? findContract(state, routeScope.contractId) : null;
  const viewState = {
    ...state,
    currentContract: routeScope.contractId,
    currentProcess: routeScope.processId,
    treeObjective: routeContract?.objetivo || state.treeObjective || "",
  };

  const treePage = createTreePageShell("arbol", viewState);
  const { root, mainSlot, rightSlot } = createHomeShell(viewState, { rightWidthClass: "w-[460px]" });

  const mainWrap = createElement("div", { className: "max-w-none mx-auto space-y-xl min-w-0" });
  mainWrap.innerHTML = buildTreeHero(viewState) + buildTreeSidebarControls(viewState);
  mainWrap.appendChild(treePage.main);
  mainSlot.appendChild(mainWrap);
  rightSlot.appendChild(treePage.detail);

  return {
    shellMode: "full",
    main: root,
    beforeUnmount() {
      treePage.beforeUnmount?.();
    },
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
      bindHomeShell(mountRoot);
      const processSelect = mountRoot.querySelector("#arbol-v02-process-select");
      const objectiveSelect = mountRoot.querySelector("#arbol-v02-objective-select");
      const updateScopeSummaries = () => {
        const processLabel = processSelect?.selectedOptions?.[0]?.textContent?.trim() || "Todos los procesos";
        const objectiveLabel = objectiveSelect?.selectedOptions?.[0]?.textContent?.trim() || "Todos los objetivos";
        const processSummary = mountRoot.querySelector("#arbol-v02-process-value");
        const objectiveSummary = mountRoot.querySelector("#arbol-v02-objective-value");
        if (processSelect) processSelect.title = processLabel;
        if (objectiveSelect) objectiveSelect.title = objectiveLabel;
        if (processSummary) processSummary.textContent = processLabel;
        if (objectiveSummary) objectiveSummary.textContent = objectiveLabel;
      };
      const applyContractScope = (processId, objective = "") => {
        currentState.treeObjective = objective;
        const scopedContracts = getTreeContracts(currentState, processId, objective);
        const currentContract = scopedContracts.find(
          (item) => String(item.id) === String(currentState.currentContract || ""),
        ) || scopedContracts[0] || null;
        if (processId) {
          setCurrentProcess(processId);
        } else {
          setCurrentContract(null);
        }
        if (currentContract) {
          setCurrentContract(currentContract.id);
        }
        // The route is the source of truth when the page is rendered again.
        // Keep it aligned with the newly selected scope, otherwise the old
        // contract in ?contract_id=... restores its previous process/objective.
        const nextHash = currentContract
          ? `#/arboles?contract_id=${encodeURIComponent(String(currentContract.id))}`
          : "#/arboles";
        if (window.location.hash !== nextHash) {
          window.history.replaceState(null, "", nextHash);
        }
        if (eventBus) {
          eventBus.emit("state:change");
        }
        updateScopeSummaries();
      };
      updateScopeSummaries();
      if (processSelect) {
        processSelect.addEventListener("change", () => {
          applyContractScope(processSelect.value || "", "");
        });
      }
      if (objectiveSelect) {
        objectiveSelect.addEventListener("change", () => {
          applyContractScope(processSelect?.value || "", objectiveSelect.value || "");
        });
      }
      const addRootBtn = mountRoot.querySelector("[data-action='tree-add-root-v02']");
      if (addRootBtn) {
        addRootBtn.addEventListener("click", () => {
          if (!currentState.currentContract) {
            return;
          }
          window.location.hash = `#/causa_detalle?contrato_id=${encodeURIComponent(String(currentState.currentContract))}`;
        });
      }
      const moveCauseBtn = mountRoot.querySelector("[data-action='tree-move-cause-v02']");
      if (moveCauseBtn) {
        moveCauseBtn.addEventListener("click", () => {
          moveCauseBtn.dispatchEvent(new CustomEvent("rca:cause-move-request", {
            bubbles: true,
            detail: {
              causeId: currentState.tree?.selectedNodeId || null,
              source: "keyboard",
            },
          }));
        });
      }
      if (typeof treePage.afterMount === "function") {
        treePage.afterMount(mountRoot, currentState, eventBus);
      }
    },
  };
}
