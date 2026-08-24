import { createElement, escapeHtml, toHashRoute } from "../core/utils.js";

export const V02_MENU_ITEMS = [
  { route: "inicio", label: "Inicio", icon: "home" },
  { route: "maquinas_v02", label: "Maquina", icon: "settings" },
  { route: "procesos_v02", label: "Proceso", icon: "history" },
  { route: "operaciones_v02", label: "Operaciones", icon: "account_tree" },
  { route: "contratos_v02", label: "Contrato", icon: "group" },
  { route: "arboles_v02", label: "Arbol", icon: "account_tree" },
  { route: "analisis_causas_v02", label: "Analisis causas", icon: "monitoring" },
  { route: "modelado-procesos", label: "Modelado procesos", icon: "account_tree" },
  { route: "contexto", label: "Contexto", icon: "data_object" },
];

function buildTopMenu(state) {
  return V02_MENU_ITEMS.map((item) => {
    const active = state.route === item.route || (item.route === "operaciones_v02" && state.route === "operaciones_detalle_v02");
    return `
      <a class="font-title-lg text-title-lg ${active ? "text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed pb-1" : "text-secondary dark:text-secondary-fixed-dim hover:text-primary-container dark:hover:text-primary-fixed"} cursor-pointer transition-all duration-200 active:opacity-70" href="#/${escapeHtml(item.route)}" data-route="${escapeHtml(item.route)}">
        ${escapeHtml(item.label)}
      </a>
    `;
  }).join("");
}

function buildSideMenu(state) {
  return V02_MENU_ITEMS.map((item) => {
    const active = state.route === item.route || (item.route === "operaciones_v02" && state.route === "operaciones_detalle_v02");
    return `
      <button type="button" class="w-full flex items-center gap-md px-md py-sm ${active ? "bg-surface-container-highest text-primary" : "text-on-surface-variant dark:text-on-secondary-fixed-variant hover:bg-surface-container-highest dark:hover:bg-surface-variant"} transition-colors duration-150 ease-in-out font-label-md text-label-md" data-route="${escapeHtml(item.route)}" data-action="sidebar-nav">
        <span class="material-symbols-outlined">${escapeHtml(item.icon)}</span> ${escapeHtml(item.label)}
      </button>
    `;
  }).join("");
}

export function createHomeShellV02(state, options = {}) {
  const rightWidthClass = options.rightWidthClass || "w-[420px]";
  const root = createElement("div", {
    className: "bg-surface font-body-md text-on-surface overflow-hidden h-screen flex flex-col w-full",
  });

  root.innerHTML = `
    <header class="flex justify-between items-center px-lg h-16 w-full sticky top-0 z-50 bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline">
      <div class="flex items-center gap-xl">
        <span class="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">Industrial RCA</span>
        <nav class="hidden md:flex items-center gap-md">
          ${buildTopMenu(state)}
        </nav>
      </div>
      <div class="flex items-center gap-md">
        <button type="button" class="material-symbols-outlined text-primary cursor-pointer p-base rounded-full hover:bg-surface-container-highest" data-action="notifications">notifications</button>
        <button type="button" class="material-symbols-outlined text-primary cursor-pointer p-base rounded-full hover:bg-surface-container-highest" data-action="account">account_circle</button>
      </div>
    </header>
    <div class="flex flex-1 overflow-hidden">
      <aside class="flex flex-col h-full border-r border-outline-variant p-md bg-surface-container dark:bg-surface-container-low w-[380px] shrink-0">
        <div class="mb-xl px-sm">
          <div class="flex items-center gap-sm mb-base">
            <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-fixed">
              <span class="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <p class="font-headline-sm text-headline-sm text-primary">Investigacion activa</p>
              <p class="font-label-md text-label-md text-secondary">INV-2023-004</p>
            </div>
          </div>
        </div>
        <div data-shell-sidebar-top></div>
        <nav class="flex-1 space-y-1">
          ${buildSideMenu(state)}
        </nav>
        <div class="mt-auto" data-shell-sidebar-bottom></div>
        <div class="border-t border-outline-variant pt-md space-y-1">
          <button type="button" class="w-full flex items-center gap-md px-md py-sm text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-highest rounded-lg transition-colors" data-action="help">
            <span class="material-symbols-outlined">help</span> Ayuda
          </button>
          <button type="button" class="w-full flex items-center gap-md px-md py-sm text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-highest rounded-lg transition-colors" data-action="signout">
            <span class="material-symbols-outlined">logout</span> Cerrar sesion
          </button>
        </div>
      </aside>
      <main class="flex-1 overflow-y-auto bg-surface p-xl min-w-0" data-shell-main></main>
      <aside class="${escapeHtml(rightWidthClass)} shrink-0 border-l border-outline-variant bg-surface-container-lowest overflow-y-auto" data-shell-right></aside>
    </div>
  `;

  return {
    root,
    mainSlot: root.querySelector("[data-shell-main]"),
    rightSlot: root.querySelector("[data-shell-right]"),
    sidebarTopSlot: root.querySelector("[data-shell-sidebar-top]"),
    sidebarBottomSlot: root.querySelector("[data-shell-sidebar-bottom]"),
  };
}

export function bindHomeShellV02(root) {
  root.querySelectorAll("[data-route]").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.preventDefault();
      const route = node.getAttribute("data-route");
      if (route) {
        window.location.hash = toHashRoute(route);
      }
    });
  });

  root.querySelectorAll("[data-action='notifications'], [data-action='account'], [data-action='help'], [data-action='signout']").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.preventDefault();
    });
  });
}
