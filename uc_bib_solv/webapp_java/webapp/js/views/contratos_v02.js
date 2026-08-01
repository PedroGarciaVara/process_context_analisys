import {
  filterMachines,
  findContract,
  findProcess,
  getContracts,
  getMachines,
  getProcesses,
  getSummary,
} from "../core/operational.js";
import { AppState, setCurrentContract, setCurrentMachine, setCurrentProcess } from "../core/state.js";
import { createElement, escapeHtml, toHashRoute } from "../core/utils.js";
import {
  createContract,
  deleteContract,
  fetchContractMachines,
  saveContractMachines,
  toggleContract,
  updateContract,
} from "../api/operational.js";
import { bindHomeShellV02, createHomeShellV02 } from "./shell_v02.js";

function contractStatusLabel(status) {
  const normalized = String(status || "closed").toLowerCase();
  if (normalized === "open") return "Abierto";
  if (normalized === "review") return "En revision";
  if (normalized === "closed") return "Cerrado";
  return status || "—";
}

function statusBadge(status) {
  const normalized = String(status || "closed").toLowerCase();
  if (normalized === "open") {
    return `<span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-green-100 text-green-800 text-[11px] font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>Abierto</span>`;
  }
  if (normalized === "review") {
    return `<span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>En revision</span>`;
  }
  return `<span class="inline-flex items-center gap-xs px-sm py-base rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-outline"></span>Cerrado</span>`;
}

function getRows(state) {
  const activeFilter = state.filters.contractStatus || "all";
  return getContracts(state).filter((item) => {
    if (state.currentProcess && item.processId !== state.currentProcess) return false;
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

function buildOptionMarkup(items, selectedValue) {
  return items.map((item) => {
    const selected = String(selectedValue || "") === String(item.id) ? " selected" : "";
    return `<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(item.name)}</option>`;
  }).join("");
}

function buildMachineMultiOptions(items, selectedIds = []) {
  const selectedSet = new Set((selectedIds || []).map((value) => String(value)));
  return items.map((item) => {
    const selected = selectedSet.has(String(item.id)) ? " selected" : "";
    return `<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(item.name)}</option>`;
  }).join("");
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
          <span class="px-sm py-xs bg-primary-container text-on-primary text-[11px] font-bold rounded uppercase">${escapeHtml(process?.name || "Todos los procesos")}</span>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm">
        <div class="flex items-center gap-sm mb-lg">
          <span class="material-symbols-outlined text-primary">description</span>
          <h2 class="font-headline-sm text-headline-sm text-primary">Filtros de contrato</h2>
        </div>
        <div class="flex gap-sm flex-wrap">
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
                    <span class="font-mono-sm text-mono-sm text-on-surface-variant">${escapeHtml(item.id)}</span>
                  </div>
                </td>
                <td class="px-lg py-md font-body-sm text-body-sm">${escapeHtml(item.processName || "—")}</td>
                <td class="px-lg py-md font-body-sm text-body-sm">${item.machineCount}</td>
                <td class="px-lg py-md">${statusBadge(item.status)}</td>
                <td class="px-lg py-md">
                  <div class="flex justify-end gap-sm">
                    <button type="button" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="contract-machines" data-contract-id="${escapeHtml(item.id)}">Maquinas</button>
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
    </div>
  `;
}

function buildRight(state) {
  const rows = getRows(state);
  const activeContract = getActiveContract(state, rows);
  const process = activeContract ? findProcess(state, activeContract.processId) : null;
  const machines = activeContract ? filterMachines(state, activeContract.processId, activeContract.id, "all") : [];
  const leadMachine = machines[0] || null;
  const processes = getProcesses(state);
  const allMachines = getMachines(state);
  const selectedMachineIds = machines.map((item) => item.id);

  return `
    <div class="p-lg border-b border-outline-variant bg-surface-container-low">
      <p class="font-label-md text-label-md text-secondary uppercase tracking-widest">Contrato seleccionado</p>
      <h2 class="font-headline-md text-headline-md text-primary mt-xs">${escapeHtml(activeContract?.name || "No hay contrato seleccionado")}</h2>
      <p class="font-body-sm text-body-sm text-on-surface-variant mt-sm">${escapeHtml(process?.name || "Sin proceso")} con ${machines.length} maquinas vinculadas a este contrato.</p>
    </div>
    <div class="p-lg space-y-lg">
      <div class="grid grid-cols-2 gap-sm">
        <div class="p-sm bg-white rounded border border-outline-variant">
          <p class="text-[10px] text-on-surface-variant uppercase font-bold">Maquinas</p>
          <p class="text-title-lg font-bold text-primary">${machines.length}</p>
        </div>
        <div class="p-sm bg-white rounded border border-outline-variant">
          <p class="text-[10px] text-on-surface-variant uppercase font-bold">Estado</p>
          <p class="text-title-lg font-bold text-primary">${escapeHtml(contractStatusLabel(activeContract?.status))}</p>
        </div>
      </div>
      <div>
        <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Maquina principal</h4>
        <div class="p-md bg-surface-container-low rounded-lg border border-outline-variant">
          <p class="font-label-md text-label-md text-primary mb-xs">${escapeHtml(leadMachine?.name || "No hay maquina en alcance")}</p>
          <p class="text-[11px] text-on-surface-variant">${escapeHtml(leadMachine?.area || "Sin area")} · ${escapeHtml(leadMachine?.status || "Sin estado")}</p>
        </div>
      </div>
      <div class="space-y-sm pt-md">
        <button type="button" class="w-full py-md bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-md hover:opacity-90" data-action="right-open-machines" ${activeContract ? "" : "disabled"}>
          <span class="material-symbols-outlined">settings</span>
          Abrir maquinas
        </button>
        <button type="button" class="w-full py-md border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg flex items-center justify-center gap-md hover:bg-surface-container" data-action="right-open-tree" ${activeContract ? "" : "disabled"}>
          <span class="material-symbols-outlined">account_tree</span>
          Abrir arbol de investigacion
        </button>
      </div>
      <div class="border-t border-outline-variant pt-lg space-y-md">
        <div>
          <h4 class="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Gestion del contrato</h4>
          <p class="text-[12px] text-on-surface-variant">Paridad con Dash: crear, actualizar, cambiar el estado activo, eliminar y asignar maquinas.</p>
        </div>
        <div id="contract-v02-alert" class="hidden rounded-lg border px-md py-sm text-[12px]"></div>
        <label class="block space-y-xs">
          <span class="font-label-md text-label-md text-secondary">Proceso</span>
          <select id="contract-v02-process" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
            ${buildOptionMarkup(processes, activeContract?.processId || state.currentProcess || "")}
          </select>
        </label>
        <label class="block space-y-xs">
          <span class="font-label-md text-label-md text-secondary">Nombre</span>
          <input id="contract-v02-name" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" placeholder="Nombre del contrato" value="${escapeHtml(activeContract?.name || "")}">
        </label>
        <label class="block space-y-xs">
          <span class="font-label-md text-label-md text-secondary">Metrica</span>
          <input id="contract-v02-metrica" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" placeholder="Metrica" value="${escapeHtml(activeContract?.metrica || "")}">
        </label>
        <label class="block space-y-xs">
          <span class="font-label-md text-label-md text-secondary">Objetivo</span>
          <input id="contract-v02-objetivo" class="w-full border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none" type="text" placeholder="Objetivo" value="${escapeHtml(activeContract?.objetivo || "")}">
        </label>
        <label class="block space-y-xs">
          <span class="font-label-md text-label-md text-secondary">Maquinas</span>
          <select id="contract-v02-machines" multiple class="w-full min-h-[140px] border border-outline rounded-lg p-sm bg-surface-container-low font-body-sm focus:ring-1 focus:ring-primary outline-none">
            ${buildMachineMultiOptions(allMachines, selectedMachineIds)}
          </select>
        </label>
        <div class="grid grid-cols-2 gap-sm">
          <button type="button" class="px-md py-sm bg-primary text-on-primary text-label-md font-label-md rounded hover:opacity-90" data-action="contract-create">Crear</button>
          <button type="button" class="px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="contract-update" ${activeContract ? "" : "disabled"}>Actualizar</button>
          <button type="button" class="px-md py-sm border border-amber-200 text-amber-700 text-label-md font-label-md rounded hover:bg-amber-50" data-action="contract-toggle" ${activeContract ? "" : "disabled"}>${activeContract?.activo ? "Desactivar" : "Activar"}</button>
          <button type="button" class="px-md py-sm border border-red-200 text-red-700 text-label-md font-label-md rounded hover:bg-red-50" data-action="contract-delete" ${activeContract ? "" : "disabled"}>Eliminar</button>
        </div>
        <button type="button" class="w-full px-md py-sm border border-outline-variant text-on-surface-variant text-label-md font-label-md rounded hover:bg-surface-container" data-action="contract-save-machines" ${activeContract ? "" : "disabled"}>Guardar alcance de maquinas</button>
      </div>
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

      mountRoot.querySelectorAll("[data-action='contract-machines']").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          const contractId = node.getAttribute("data-contract-id") || null;
          const contract = contractId ? findContract(currentState, contractId) : null;
          if (contract) {
            setCurrentProcess(contract.processId);
          }
          setCurrentContract(contractId);
          if (contract) {
            const machines = filterMachines(currentState, contract.processId, contract.id, "all");
            setCurrentMachine(machines[0] ? machines[0].id : null);
          }
          if (eventBus) eventBus.emit("state:change");
          window.location.hash = toHashRoute("maquinas_v02");
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

      const openMachines = mountRoot.querySelector("[data-action='right-open-machines']");
      if (openMachines) {
        openMachines.addEventListener("click", (event) => {
          event.preventDefault();
          window.location.hash = toHashRoute("maquinas_v02");
        });
      }

      const openTree = mountRoot.querySelector("[data-action='right-open-tree']");
      if (openTree) {
        openTree.addEventListener("click", (event) => {
          event.preventDefault();
          window.location.hash = toHashRoute("arboles_v02");
        });
      }

      const alertNode = mountRoot.querySelector("#contract-v02-alert");
      const processInput = mountRoot.querySelector("#contract-v02-process");
      const nameInput = mountRoot.querySelector("#contract-v02-name");
      const metricInput = mountRoot.querySelector("#contract-v02-metrica");
      const targetInput = mountRoot.querySelector("#contract-v02-objetivo");
      const machinesInput = mountRoot.querySelector("#contract-v02-machines");
      const setAlert = (message, tone = "neutral") => {
        if (!alertNode) return;
        if (!message) {
          alertNode.textContent = "";
          alertNode.className = "hidden rounded-lg border px-md py-sm text-[12px]";
          return;
        }
        const toneClass = tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-amber-200 bg-amber-50 text-amber-700";
        alertNode.textContent = message;
        alertNode.className = `rounded-lg border px-md py-sm text-[12px] ${toneClass}`;
      };
      const refreshCatalog = async () => {
        if (eventBus) eventBus.emit("catalog:refresh");
      };
      const currentContract = () => {
        const rows = getRows(AppState);
        return getActiveContract(AppState, rows);
      };
      const selectedMachineIds = () => Array.from(machinesInput?.selectedOptions || []).map((item) => Number(item.value));

      mountRoot.querySelector("[data-action='contract-create']")?.addEventListener("click", async () => {
        try {
          const response = await createContract({
            processId: processInput?.value || "",
            name: nameInput?.value || "",
            metrica: metricInput?.value || "",
            objetivo: targetInput?.value || "",
          });
          const contract = response?.data || null;
          if (contract?.processId) {
            setCurrentProcess(contract.processId);
          }
          if (contract?.id) {
            setCurrentContract(contract.id);
          }
          setAlert("Contrato creado.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });

      mountRoot.querySelector("[data-action='contract-update']")?.addEventListener("click", async () => {
        const contract = currentContract();
        if (!contract) {
          setAlert("Selecciona un contrato antes de actualizar.", "warning");
          return;
        }
        try {
          await updateContract(contract.id, {
            processId: processInput?.value || "",
            name: nameInput?.value || "",
            metrica: metricInput?.value || "",
            objetivo: targetInput?.value || "",
          });
          if (processInput?.value) {
            setCurrentProcess(Number(processInput.value));
          }
          setAlert("Contrato actualizado.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });

      mountRoot.querySelector("[data-action='contract-toggle']")?.addEventListener("click", async () => {
        const contract = currentContract();
        if (!contract) {
          setAlert("Selecciona un contrato antes de cambiar el estado.", "warning");
          return;
        }
        try {
          await toggleContract(contract.id);
          setAlert("Estado del contrato actualizado.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });

      mountRoot.querySelector("[data-action='contract-delete']")?.addEventListener("click", async () => {
        const contract = currentContract();
        if (!contract) {
          setAlert("Selecciona un contrato antes de eliminar.", "warning");
          return;
        }
        try {
          await deleteContract(contract.id);
          setCurrentContract(null);
          setAlert("Contrato eliminado.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });

      mountRoot.querySelector("[data-action='contract-save-machines']")?.addEventListener("click", async () => {
        const contract = currentContract();
        if (!contract) {
          setAlert("Selecciona un contrato antes de asignar maquinas.", "warning");
          return;
        }
        try {
          await saveContractMachines(contract.id, selectedMachineIds());
          setAlert("Alcance de maquinas actualizado.", "success");
          await refreshCatalog();
        } catch (error) {
          setAlert(error.message, "danger");
        }
      });

      if (currentContract()) {
        fetchContractMachines(currentContract().id)
          .then((response) => {
            const machineIds = response?.data?.machineIds || [];
            Array.from(machinesInput?.options || []).forEach((option) => {
              option.selected = machineIds.includes(Number(option.value));
            });
          })
          .catch(() => null);
      }
    },
  };
}
