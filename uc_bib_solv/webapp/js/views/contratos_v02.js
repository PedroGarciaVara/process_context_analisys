import {
  filterMachines,
  findContract,
  findProcess,
  getContracts,
  getContractScopes,
  getMachines,
  getProcesses,
  getSummary,
} from "../core/operational.js";
import { AppState, setCurrentContract, setCurrentProcess } from "../core/state.js";
import { createElement, escapeHtml, toHashRoute } from "../core/utils.js";
import {
  createContract,
  deleteContract,
  fetchContractMachines,
  saveContractMachines,
  updateContract,
} from "../api/operational.js";
import { bindHomeShellV02, createHomeShellV02 } from "./shell_v02.js";
import { statusBadge, buildMachineMultiOptions, buildContractScopeOptions, buildContractProcessFilterOptions } from "../components/contract-ui.js";

function getRows(state) {
  const activeFilter = state.filters.contractStatus || "all";
  const bpmProcessFilter = state.filters.contractProcessBpmId || "";
  const process = bpmProcessFilter
    ? getProcesses(state).find((item) => String(item.bpmProcessId) === String(bpmProcessFilter))
    : null;
  return getContracts(state).filter((item) => {
    if (state.currentProcess && item.processId !== state.currentProcess) return false;
    if (process && String(item.processId) !== String(process.id)) return false;
    if (activeFilter !== "all" && item.status !== activeFilter) return false;
    return true;
  });
}

function getActiveContract(state, rows) {
  const current = state.currentContract ? findContract(state, state.currentContract) : null;
  if (current && rows.some((item) => item.id === current.id)) {
    return current;
  }
  return rows[0] || null;
}

function buildCenter(state) {
  const rows = getRows(state);
  const activeContract = getActiveContract(state, rows);
  const process = activeContract ? findProcess(state, activeContract.processId) : state.currentProcess ? findProcess(state, state.currentProcess) : null;
  const summary = getSummary(state);

  return `
    <div class="max-w-6xl mx-auto space-y-xl">
      <section class="space-y-sm">
        <span class="font-label-md text-label-md text-primary tracking-widest uppercase">Espacio de contratos</span>
        <div class="flex items-end justify-between gap-lg flex-wrap">
          <div>
            <h1 class="font-display-lg text-display-lg text-on-background">Contratos</h1>
            <p class="font-body-md text-body-md text-secondary max-w-3xl">
              Gestiona los contratos operativos del proceso seleccionado y navega directamente a maquinas o al arbol causal desde el panel central.
            </p>
          </div>
          <div class="flex items-center gap-md flex-wrap justify-end">
            <span class="px-sm py-xs bg-primary-container text-on-primary text-[11px] font-bold rounded uppercase">${escapeHtml(process?.name || "Todos los procesos")}</span>
            <button type="button" class="px-lg py-md bg-primary text-on-primary text-label-md font-label-md rounded-lg hover:opacity-90 shadow-sm" data-action="contract-create-open" aria-haspopup="dialog">
              Crear contrato
            </button>
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm">
        <div class="flex items-center gap-sm mb-lg">
          <span class="material-symbols-outlined text-primary">description</span>
          <h2 class="font-headline-sm text-headline-sm text-primary">Filtros de contrato</h2>
        </div>
        <div class="flex gap-sm flex-wrap">
          <label class="flex items-center gap-sm text-label-md text-secondary" for="contract-process-filter">
            <span>Proceso BPM</span>
            <select id="contract-process-filter" class="border border-outline rounded p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
              ${buildContractProcessFilterOptions(getContractScopes(state), state.filters.contractProcessBpmId || getProcesses(state).find((item) => String(item.id) === String(state.currentProcess))?.bpmProcessId || "")}
            </select>
          </label>
          <button type="button" class="px-md py-sm ${(state.filters.contractStatus || "all") === "all" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-contract-filter="all">Todos</button>
          <button type="button" class="px-md py-sm ${(state.filters.contractStatus || "all") === "open" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-contract-filter="open">Abierto</button>
          <button type="button" class="px-md py-sm ${(state.filters.contractStatus || "all") === "review" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-contract-filter="review">En revision</button>
          <button type="button" class="px-md py-sm ${(state.filters.contractStatus || "all") === "closed" ? "bg-primary text-on-primary" : "bg-surface-container hover:bg-surface-container-high"} text-label-md font-label-md rounded transition-colors" data-contract-filter="closed">Cerrado</button>
        </div>
      </section>

      <section class="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
          <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Contratos visibles</p>
          <h3 class="font-display-lg text-display-lg text-primary">${rows.length}</h3>
          <p class="text-[12px] text-on-surface-variant mt-sm">Contratos disponibles en el alcance del proceso actual.</p>
        </div>
        <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
          <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Maquinas vinculadas</p>
          <h3 class="font-display-lg text-display-lg text-primary">${activeContract ? activeContract.machineCount : summary.maquinas}</h3>
          <p class="text-[12px] text-on-surface-variant mt-sm">Activos operativos asociados al alcance del contrato.</p>
        </div>
        <div class="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm border-t-4 border-t-primary">
          <p class="text-on-surface-variant font-label-md text-label-md mb-xs">Proceso activo</p>
          <h3 class="font-display-lg text-display-lg text-primary">${escapeHtml(process?.name || "Todos")}</h3>
          <p class="text-[12px] text-on-surface-variant mt-sm">Contexto heredado por la navegacion a maquinas y arboles.</p>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-left border-collapse">
          <thead class="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Contrato</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Proceso</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Maquinas</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant">Estado</th>
              <th class="px-lg py-md font-label-md text-label-md text-on-surface-variant text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            ${rows.length ? rows.map((item) => `
              <tr class="hover:bg-surface-container-lowest transition-colors ${activeContract && activeContract.id === item.id ? "bg-secondary-container/20 border-l-4 border-l-primary" : ""}" data-contract-row="${escapeHtml(item.id)}">
                <td class="px-lg py-md">
                  <div class="grid gap-1">
                    <strong class="font-title-lg text-title-lg text-primary">${escapeHtml(item.name)}</strong>
                  </div>
                </td>
                <td class="px-lg py-md font-body-sm text-body-sm">${escapeHtml(item.processName || "—")}</td>
                <td class="px-lg py-md font-body-sm text-body-sm">${item.machineCount}</td>
                <td class="px-lg py-md">${statusBadge(item.status)}</td>
                <td class="px-lg py-md">
                  <div class="flex justify-end gap-sm">
                    <button type="button" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="contract-detail" data-contract-id="${escapeHtml(item.id)}">Detalle</button>
                    <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="contract-tree" data-contract-id="${escapeHtml(item.id)}">Abrir arbol</button>
                  </div>
                </td>
              </tr>
            `).join("") : `
              <tr><td colspan="5" class="px-lg py-xl text-center text-on-surface-variant">No hay contratos para el filtro actual.</td></tr>
            `}
          </tbody>
        </table>
      </section>

      ${buildDetailModal(
        activeContract,
        getMachines(state),
        activeContract ? filterMachines(state, activeContract.processId, activeContract.id, "all").map((item) => item.id) : [],
        Boolean(state.contractDetailOpen && activeContract && String(state.contractDetailOpen) === String(activeContract.id)),
      )}

      <div id="contract-create-v02-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="contract-create-v02-title" aria-describedby="contract-create-v02-description" aria-hidden="true" data-modal-state="closed">
        <form class="modal-card contract-create-modal" data-contract-create-form novalidate>
          <div class="modal-card__accent"></div>
          <header class="modal-card__header flex items-start justify-between gap-md">
            <div>
              <h2 id="contract-create-v02-title" class="modal-card__title">Crear contrato</h2>
              <p id="contract-create-v02-description" class="detail-modal-note">Completa los datos del nuevo contrato operativo.</p>
            </div>
          </header>
          <div class="modal-card__body contract-create-modal__body">
            <div id="contract-create-v02-alert" class="hidden rounded-lg border px-md py-sm text-[12px]" role="status" aria-live="polite"></div>
            <label class="block space-y-xs" for="contract-create-v02-scope-type">
              <span class="font-label-md text-label-md text-secondary">Alcance BPM</span>
              <select id="contract-create-v02-scope-type" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" required>
                <option value="process">Proceso BPM</option>
                <option value="operation">Operación BPM</option>
              </select>
            </label>
            <label class="block space-y-xs" for="contract-create-v02-process-search">
              <span class="font-label-md text-label-md text-secondary">Buscar proceso BPM</span>
              <input id="contract-create-v02-process-search" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="search" placeholder="Filtrar procesos..." autocomplete="off">
            </label>
            <label class="block space-y-xs" for="contract-create-v02-process-scope">
              <span class="font-label-md text-label-md text-secondary">Proceso BPM</span>
              <select id="contract-create-v02-process-scope" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" required>
                ${buildContractScopeOptions(getContractScopes(state).processes, state.currentProcess ? (getProcesses(state).find((item) => String(item.id) === String(state.currentProcess))?.bpmProcessId || "") : "")}
              </select>
            </label>
            <div class="space-y-xs hidden" data-contract-scope-field="operation">
              <label class="block space-y-xs" for="contract-create-v02-operation-search">
                <span class="font-label-md text-label-md text-secondary">Buscar operación BPM</span>
                <input id="contract-create-v02-operation-search" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="search" placeholder="Filtrar operaciones..." autocomplete="off">
              </label>
              <label class="block space-y-xs" for="contract-create-v02-operation-scope">
              <span class="font-label-md text-label-md text-secondary">Operación BPM</span>
              <select id="contract-create-v02-operation-scope" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
                ${buildContractScopeOptions(getContractScopes(state).operations)}
              </select>
              </label>
              <p id="contract-create-v02-operation-help" class="text-[12px] text-on-surface-variant"></p>
            </div>
            <label class="block space-y-xs" for="contract-create-v02-name">
              <span class="font-label-md text-label-md text-secondary">Nombre</span>
              <input id="contract-create-v02-name" name="name" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" placeholder="Nombre del contrato" required>
            </label>
            <label class="block space-y-xs" for="contract-create-v02-metrica">
              <span class="font-label-md text-label-md text-secondary">Metrica</span>
              <input id="contract-create-v02-metrica" name="metrica" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" placeholder="Metrica">
            </label>
            <label class="block space-y-xs" for="contract-create-v02-objetivo">
              <span class="font-label-md text-label-md text-secondary">Objetivo</span>
              <input id="contract-create-v02-objetivo" name="objetivo" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" placeholder="Objetivo">
            </label>
          </div>
          <footer class="modal-card__footer">
            <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="contract-create-cancel">Cancelar</button>
            <button type="submit" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="contract-create-submit">Crear contrato</button>
          </footer>
        </form>
      </div>
    </div>
  `;
}

function buildDetailModal(activeContract, allMachines, selectedMachineIds, isOpen = false) {
  return `
    <div id="contract-detail-v02-modal" class="modal-overlay${isOpen ? " is-open" : ""}" role="dialog" aria-modal="true" aria-labelledby="contract-detail-v02-title" aria-hidden="${String(!isOpen)}" data-modal-state="${isOpen ? "open" : "closed"}">
      <form class="modal-card contract-create-modal" data-contract-detail-form novalidate>
        <div class="modal-card__accent"></div>
        <header class="modal-card__header flex items-start justify-between gap-md">
          <div>
            <h2 id="contract-detail-v02-title" class="modal-card__title">Detalle del contrato</h2>
            <p class="detail-modal-note">Edita los datos y las máquinas asociadas al contrato.</p>
          </div>
        </header>
        <div class="modal-card__body contract-create-modal__body">
          <div id="contract-detail-v02-alert" class="hidden rounded-lg border px-md py-sm text-[12px]" role="status" aria-live="polite"></div>
          <div class="block space-y-xs">
            <span class="font-label-md text-label-md text-secondary">Alcance BPM</span>
            <p class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm">${escapeHtml(activeContract ? `${activeContract.scopeType === "operation" ? "Operación BPM" : "Proceso BPM"} · ${activeContract.bpmNodeId || activeContract.bpmProcessId || activeContract.processName || "Sin alcance"}` : "Sin contrato seleccionado")}</p>
          </div>
          <label class="block space-y-xs" for="contract-detail-v02-name">
            <span class="font-label-md text-label-md text-secondary">Nombre</span>
            <input id="contract-detail-v02-name" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" value="${escapeHtml(activeContract?.name || "")}" required>
          </label>
          <label class="block space-y-xs" for="contract-detail-v02-metrica">
            <span class="font-label-md text-label-md text-secondary">Métrica</span>
            <input id="contract-detail-v02-metrica" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" value="${escapeHtml(activeContract?.metrica || "")}">
          </label>
          <label class="block space-y-xs" for="contract-detail-v02-objetivo">
            <span class="font-label-md text-label-md text-secondary">Objetivo</span>
            <input id="contract-detail-v02-objetivo" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" value="${escapeHtml(activeContract?.objetivo || "")}">
          </label>
          <label class="block space-y-xs" for="contract-detail-v02-machines">
            <span class="font-label-md text-label-md text-secondary">Máquinas asociadas</span>
            <select id="contract-detail-v02-machines" multiple class="w-full min-h-[140px] border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
              ${buildMachineMultiOptions(allMachines, selectedMachineIds)}
            </select>
          </label>
        </div>
        <footer class="modal-card__footer">
          <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="contract-detail-cancel">Cancelar</button>
          <button type="button" class="px-md py-sm border border-red-200 text-red-700 text-label-md font-label-md rounded hover:bg-red-50" data-action="contract-detail-delete">Eliminar contrato</button>
          <button type="button" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="contract-detail-save">Guardar cambios</button>
        </footer>
      </form>
    </div>
  `;
}

function buildRight(state) {
  const rows = getRows(state);
  const activeContract = getActiveContract(state, rows);
  const process = activeContract ? findProcess(state, activeContract.processId) : null;
  const machines = activeContract ? filterMachines(state, activeContract.processId, activeContract.id, "all") : [];
  return `
    <div class="p-lg border-b border-outline-variant bg-surface-container-low">
      <p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Contrato seleccionado</p>
      <h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(activeContract?.name || "No hay contrato seleccionado")}</h2>
      <p class="font-body-sm text-body-sm text-on-surface-variant mt-sm">${escapeHtml(process?.name || "Sin proceso")} con ${machines.length} maquinas vinculadas a este contrato.</p>
    </div>
    <div class="p-lg">
      <p class="text-[12px] text-on-surface-variant">Selecciona <strong>Detalle</strong> en una fila para editar el contrato y sus máquinas asociadas.</p>
    </div>
  `;
}

export function renderContratosV02(state, bus) {
  const { root, mainSlot, rightSlot } = createHomeShellV02(state);
  mainSlot.innerHTML = buildCenter(state);
  rightSlot.innerHTML = buildRight(state);

  return {
    shellMode: "full",
    main: root,
    afterMount(mountRoot, currentState, eventBus) {
      document.title = "Industrial RCA - Gestion de contratos";
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      bindHomeShellV02(mountRoot);

      mountRoot.querySelectorAll("[data-contract-filter]").forEach((node) => {
        node.addEventListener("click", () => {
          AppState.filters.contractStatus = node.getAttribute("data-contract-filter") || "all";
          if (eventBus) eventBus.emit("state:change");
        });
      });

      mountRoot.querySelector("#contract-process-filter")?.addEventListener("change", (event) => {
        const bpmProcessId = event.target.value || "";
        AppState.filters.contractProcessBpmId = bpmProcessId;
        const process = bpmProcessId
          ? getProcesses(currentState).find((item) => String(item.bpmProcessId) === String(bpmProcessId))
          : null;
        setCurrentProcess(process?.id || null);
        if (eventBus) eventBus.emit("state:change");
      });

      mountRoot.querySelectorAll("[data-contract-row]").forEach((node) => {
        node.addEventListener("click", (event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          const contractId = node.getAttribute("data-contract-row") || null;
          const contract = contractId ? findContract(currentState, contractId) : null;
          if (contract) {
            setCurrentProcess(contract.processId);
          }
          setCurrentContract(contractId);
          if (eventBus) eventBus.emit("state:change");
        });
      });

      mountRoot.querySelectorAll("[data-action='contract-detail']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          if (AppState.contractDetailCloseTimer) {
            window.clearTimeout(AppState.contractDetailCloseTimer);
            AppState.contractDetailCloseTimer = null;
          }
          const contractId = node.getAttribute("data-contract-id") || null;
          const contract = contractId ? findContract(currentState, contractId) : null;
          if (contract) {
            setCurrentProcess(contract.processId);
          }
          setCurrentContract(contractId);
          AppState.contractDetailOpen = contractId;
          if (eventBus) eventBus.emit("state:change");
        });
      });

      mountRoot.querySelectorAll("[data-action='contract-tree']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          const contractId = node.getAttribute("data-contract-id") || null;
          const contract = contractId ? findContract(currentState, contractId) : null;
          if (contract) {
            setCurrentProcess(contract.processId);
          }
          setCurrentContract(contractId);
          if (eventBus) eventBus.emit("state:change");
          window.location.hash = toHashRoute("arboles_v02");
        });
      });

      const detailModal = mountRoot.querySelector("#contract-detail-v02-modal");
      const detailForm = mountRoot.querySelector("[data-contract-detail-form]");
      const detailAlert = mountRoot.querySelector("#contract-detail-v02-alert");
      const detailNameInput = mountRoot.querySelector("#contract-detail-v02-name");
      const detailMetricInput = mountRoot.querySelector("#contract-detail-v02-metrica");
      const detailTargetInput = mountRoot.querySelector("#contract-detail-v02-objetivo");
      const detailMachinesInput = mountRoot.querySelector("#contract-detail-v02-machines");
      const detailSaveButton = mountRoot.querySelector("[data-action='contract-detail-save']");
      detailMachinesInput?.addEventListener("change", () => {
        detailMachinesInput.dataset.userEdited = "true";
      });
      const createModal = mountRoot.querySelector("#contract-create-v02-modal");
      const createForm = mountRoot.querySelector("[data-contract-create-form]");
      const createScopeTypeInput = mountRoot.querySelector("#contract-create-v02-scope-type");
      const createProcessSearchInput = mountRoot.querySelector("#contract-create-v02-process-search");
      const createProcessScopeInput = mountRoot.querySelector("#contract-create-v02-process-scope");
      const createOperationSearchInput = mountRoot.querySelector("#contract-create-v02-operation-search");
      const createOperationScopeInput = mountRoot.querySelector("#contract-create-v02-operation-scope");
      const createOperationHelp = mountRoot.querySelector("#contract-create-v02-operation-help");
      const createNameInput = mountRoot.querySelector("#contract-create-v02-name");
      const createMetricInput = mountRoot.querySelector("#contract-create-v02-metrica");
      const createTargetInput = mountRoot.querySelector("#contract-create-v02-objetivo");
      const createAlert = mountRoot.querySelector("#contract-create-v02-alert");
      const createSubmit = mountRoot.querySelector("[data-action='contract-create-submit']");
      let createPreviousFocus = null;
      let createSubmitting = false;
      let detailLoadToken = 0;
      const setCreateState = (state, message = "", tone = "neutral") => {
        if (!createModal) return;
        createModal.dataset.modalState = state;
        const open = state !== "closed";
        createModal.classList.toggle("is-open", open);
        createModal.setAttribute("aria-hidden", String(!open));
        if (createAlert) {
          createAlert.textContent = message;
          createAlert.className = message ? `rounded-lg border px-md py-sm text-[12px] ${tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}` : "hidden rounded-lg border px-md py-sm text-[12px]";
        }
        if (createSubmit) {
          createSubmit.disabled = state === "submitting";
          createSubmit.textContent = state === "submitting" ? "Creando…" : "Crear contrato";
          createSubmit.setAttribute("aria-busy", String(state === "submitting"));
        }
      };
      const setDetailState = (state, message = "", tone = "neutral") => {
        if (!detailModal) return;
        detailModal.dataset.modalState = state;
        detailModal.classList.toggle("is-open", state !== "closed");
        detailModal.setAttribute("aria-hidden", String(state === "closed"));
        if (detailAlert) {
          detailAlert.textContent = message;
          detailAlert.className = message
            ? `rounded-lg border px-md py-sm text-[12px] ${tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`
            : "hidden rounded-lg border px-md py-sm text-[12px]";
        }
        const submit = detailSaveButton;
        if (submit) {
          submit.disabled = state === "submitting" || state === "loading";
          submit.textContent = state === "submitting" ? "Guardando…" : state === "loading" ? "Cargando…" : "Guardar cambios";
        }
      };
      const closeDetailModal = () => {
        detailLoadToken += 1;
        AppState.contractDetailOpen = null;
        setDetailState("closed");
      };
      detailModal?.querySelector("[data-action='contract-detail-cancel']")?.addEventListener("click", closeDetailModal);
      detailModal?.querySelector("[data-action='contract-detail-delete']")?.addEventListener("click", async () => {
        const contract = currentContract();
        if (!contract || !window.confirm("¿Eliminar este contrato? Esta acción no se puede deshacer.")) return;
        try {
          detailLoadToken += 1;
          setDetailState("submitting");
          await deleteContract(contract.id);
          setCurrentContract(null);
          setDetailState("closed");
          await refreshCatalog();
        } catch (error) {
          setDetailState("error", error.message || "No se pudo eliminar el contrato.", "danger");
        }
      });
      // Keep the primary action reliable after catalog refreshes/remounts:
      // submit the current form explicitly from the button click.
      detailSaveButton?.addEventListener("click", (event) => {
        event.preventDefault();
        detailForm?.requestSubmit();
      });
      const closeCreateModal = () => {
        if (createSubmitting) return;
        setCreateState("closed");
        createForm?.reset();
        if (createNameInput) delete createNameInput.dataset.userEdited;
        if (createScopeTypeInput) createScopeTypeInput.value = "process";
        if (createProcessScopeInput && currentState.currentProcess) {
          const process = findProcess(currentState, currentState.currentProcess);
          createProcessScopeInput.value = String(process?.bpmProcessId || "");
        }
        createPreviousFocus?.focus?.();
        createPreviousFocus = null;
      };
      const openCreateModal = () => {
        if (!createModal) return;
        createPreviousFocus = document.activeElement;
        if (createScopeTypeInput) createScopeTypeInput.value = "process";
        if (createProcessScopeInput && currentState.currentProcess) {
          const process = findProcess(currentState, currentState.currentProcess);
          createProcessScopeInput.value = String(process?.bpmProcessId || "");
        }
        renderProcessScopeOptions();
        updateScopeControls();
        setCreateState("open");
        window.setTimeout(() => createScopeTypeInput?.focus(), 0);
      };
      const getScopeCatalog = () => getContractScopes(currentState);
      const selectedProcessScope = () => getScopeCatalog().processes.find((item) => String(item.id) === String(createProcessScopeInput?.value));
      const renderProcessScopeOptions = () => {
        if (!createProcessScopeInput) return;
        const scopes = getScopeCatalog();
        const search = String(createProcessSearchInput?.value || "").trim().toLocaleLowerCase();
        const selectedValue = createProcessScopeInput.value;
        const filtered = scopes.processes.filter((item) => String(item.name || "").toLocaleLowerCase().includes(search));
        createProcessScopeInput.innerHTML = buildContractScopeOptions(filtered, selectedValue);
        if (selectedValue && filtered.some((item) => String(item.id) === String(selectedValue))) {
          createProcessScopeInput.value = selectedValue;
        }
      };
      const renderOperationScopeOptions = () => {
        if (!createOperationScopeInput) return;
        const scopes = getScopeCatalog();
        const processId = selectedProcessScope()?.id;
        const search = String(createOperationSearchInput?.value || "").trim().toLocaleLowerCase();
        const operations = processId
          ? scopes.operations.filter((item) => String(item.bpmProcessId) === String(processId))
          : [];
        const filtered = operations.filter((item) => String(item.name || "").toLocaleLowerCase().includes(search));
        createOperationScopeInput.disabled = !processId || !filtered.length;
        createOperationScopeInput.required = createScopeTypeInput?.value === "operation";
        createOperationScopeInput.innerHTML = filtered.length
          ? buildContractScopeOptions(filtered, createOperationScopeInput.value)
          : `<option value="" disabled selected>${processId ? "Este proceso no tiene operaciones" : "Selecciona primero un proceso"}</option>`;
        if (createOperationHelp) {
          createOperationHelp.textContent = processId
            ? `${operations.length} operación${operations.length === 1 ? "" : "es"} disponible${operations.length === 1 ? "" : "s"} para el proceso seleccionado.`
            : "Selecciona un proceso BPM para cargar sus operaciones.";
        }
      };
      const updateScopeControls = ({ clearOperation = false } = {}) => {
        const scopeType = createScopeTypeInput?.value || "process";
        if (clearOperation && createOperationScopeInput) createOperationScopeInput.value = "";
        renderOperationScopeOptions();
        const operationField = mountRoot.querySelector('[data-contract-scope-field="operation"]');
        operationField?.classList.toggle("hidden", scopeType !== "operation");
        updateSuggestedContractName();
      };
      const updateSuggestedContractName = () => {
        const scopeType = createScopeTypeInput?.value || "process";
        const scopes = getScopeCatalog();
        const selected = scopeType === "operation"
          ? scopes.operations.find((item) => String(item.id) === String(createOperationScopeInput?.value))
          : scopes.processes.find((item) => String(item.id) === String(createProcessScopeInput?.value));
        if (selected && createNameInput && !createNameInput.dataset.userEdited) createNameInput.value = selected.name || "";
      };
      createScopeTypeInput?.addEventListener("change", () => updateScopeControls({ clearOperation: true }));
      createProcessSearchInput?.addEventListener("input", () => {
        renderProcessScopeOptions();
        updateScopeControls({ clearOperation: true });
      });
      createProcessScopeInput?.addEventListener("change", () => updateScopeControls({ clearOperation: true }));
      createOperationSearchInput?.addEventListener("input", () => updateScopeControls());
      createOperationScopeInput?.addEventListener("change", updateSuggestedContractName);
      createNameInput?.addEventListener("input", () => { createNameInput.dataset.userEdited = "true"; });
      const refreshCatalog = async () => {
        if (eventBus) await eventBus.emit("catalog:refresh");
      };
      const currentContract = () => {
        const rows = getRows(AppState);
        return getActiveContract(AppState, rows);
      };
      mountRoot.querySelector("[data-action='contract-create-open']")?.addEventListener("click", openCreateModal);
      mountRoot.querySelectorAll("[data-action='contract-create-close'], [data-action='contract-create-cancel']").forEach((node) => {
        node.addEventListener("click", closeCreateModal);
      });
      createForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (createSubmitting) return;
        if (!createForm.reportValidity()) return;
        createSubmitting = true;
        setCreateState("submitting");
        try {
          const scopeType = createScopeTypeInput?.value || "process";
          if (scopeType === "operation" && (!createProcessScopeInput?.value || !createOperationScopeInput?.value)) {
            throw new Error("Selecciona un proceso y una operación BPM antes de crear el contrato.");
          }
          const response = await createContract({
            ...(scopeType === "operation"
              ? { bpmNodeId: createOperationScopeInput?.value || "" }
              : { bpmProcessId: createProcessScopeInput?.value || "" }),
            name: createNameInput?.value || "",
            metrica: createMetricInput?.value || "",
            objetivo: createTargetInput?.value || "",
          });
          const contract = response?.data || null;
          if (contract?.processId) {
            setCurrentProcess(contract.processId);
          }
          if (contract?.id) {
            setCurrentContract(contract.id);
          }
          setCreateState("success", "Contrato creado.", "success");
          await refreshCatalog();
        } catch (error) {
          createSubmitting = false;
          setCreateState("error", error.message || "No se pudo crear el contrato.", "danger");
          createNameInput?.focus();
        }
        if (createModal?.dataset.modalState === "success") {
          createSubmitting = false;
          closeCreateModal();
        }
      });

      detailForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const contract = currentContract();
        if (!contract) {
          setDetailState("error", "Selecciona un contrato antes de guardar.", "danger");
          return;
        }
        if (!detailForm.reportValidity()) return;
        try {
          setDetailState("submitting");
          await updateContract(contract.id, {
            name: detailNameInput?.value || "",
            metrica: detailMetricInput?.value || "",
            objetivo: detailTargetInput?.value || "",
          });
          await saveContractMachines(contract.id, Array.from(detailMachinesInput?.selectedOptions || []).map((item) => Number(item.value)));
          setDetailState("success", "Contrato actualizado.", "success");
          // Saving completes the current editing session. The refreshed
          // catalog starts with the detail modal closed; reopening it loads a
          // fresh association snapshot.
          AppState.contractDetailOpen = null;
          setDetailState("closed");
          await refreshCatalog();
        } catch (error) {
          setDetailState("error", error.message, "danger");
        }
      });
      const detailContractId = AppState.contractDetailOpen;
      AppState.contractDetailOpen = null;
      if (detailContractId && String(currentContract()?.id) === String(detailContractId)) {
        const loadToken = ++detailLoadToken;
        setDetailState("loading");
        fetchContractMachines(detailContractId)
          .then((response) => {
            if (loadToken !== detailLoadToken) return;
            const machineIds = response?.data?.machineIds || [];
            if (detailMachinesInput?.dataset.userEdited !== "true") {
              Array.from(detailMachinesInput?.options || []).forEach((option) => {
                option.selected = machineIds.includes(Number(option.value));
              });
            }
            setDetailState("open");
          })
          .catch(() => {
            if (loadToken === detailLoadToken) setDetailState("open");
          });
      }
    },
  };
}
