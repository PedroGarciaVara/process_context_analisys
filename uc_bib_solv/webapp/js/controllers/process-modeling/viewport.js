export function createProcessModelingViewport({ state, editor }) {
  let relayoutFrame = 0;
  const fullscreenButton = () => `<button class="pm-secondary" type="button" data-pm-action="toggle-fullscreen" aria-expanded="${state.fullscreen ? "true" : "false"}" aria-controls="pm-flow-zone">${state.fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}</button>`;
  const zoomControls = () => `<div class="pm-zoom-controls" aria-label="Controles de escala del diagrama"><button class="pm-secondary" type="button" data-pm-action="zoom-out" aria-label="Reducir zoom">−</button><span aria-live="polite">${Math.round(state.zoom * 100)}%</span><button class="pm-secondary" type="button" data-pm-action="zoom-in" aria-label="Aumentar zoom">+</button><button class="pm-secondary" type="button" data-pm-action="zoom-fit">Ajustar</button></div>`;
  const focusFullscreenControl = () => document.querySelector('[data-pm-action="toggle-fullscreen"]')?.focus();
  const updateFullscreenDom = () => {
    document.querySelector(".pm-page")?.classList.toggle("is-pm-focus-mode", state.fullscreen && state.fullscreenMode === "fallback");
    document.querySelector(".pm-bpm")?.classList.toggle("is-pm-focus-mode", state.fullscreen && state.fullscreenMode === "fallback");
    document.querySelectorAll('[data-pm-action="toggle-fullscreen"]').forEach((control) => {
      control.setAttribute("aria-expanded", state.fullscreen ? "true" : "false");
      control.textContent = state.fullscreen ? "Salir de pantalla completa" : "Pantalla completa";
    });
  };
  const setZoom = (value) => { state.zoom = Math.min(1, Math.max(0.35, Math.round(value * 20) / 20)); editor(); };
  const fitFlow = () => {
    const flow = document.querySelector(".pm-flow-scroll");
    const canvas = document.querySelector(".pm-flow");
    if (!flow || !canvas) return;
    setZoom(Math.min(1, Math.max(320, flow.clientWidth - 12) / canvas.offsetWidth, Math.max(220, flow.clientHeight - 12) / canvas.offsetHeight));
  };
  const scheduleRelayout = () => { if (relayoutFrame) cancelAnimationFrame(relayoutFrame); relayoutFrame = requestAnimationFrame(() => { relayoutFrame = 0; editor(); }); };
  const toggleFullscreen = async () => {
    if (state.fullscreen) {
      if (state.fullscreenMode === "native" && document.fullscreenElement && typeof document.exitFullscreen === "function") { try { await document.exitFullscreen(); } catch (_error) { /* reversible local state */ } }
      state.fullscreen = false; state.fullscreenMode = null; updateFullscreenDom(); focusFullscreenControl(); return;
    }
    const root = document.getElementById("pm-fullscreen-root");
    if (root && typeof root.requestFullscreen === "function" && document.fullscreenEnabled !== false) {
      try { await root.requestFullscreen(); state.fullscreen = true; state.fullscreenMode = "native"; updateFullscreenDom(); focusFullscreenControl(); return; } catch (_error) { /* fallback */ }
    }
    state.fullscreen = true; state.fullscreenMode = "fallback"; updateFullscreenDom(); focusFullscreenControl();
  };
  return { fullscreenButton, zoomControls, setZoom, fitFlow, scheduleRelayout, toggleFullscreen, focusFullscreenControl, updateFullscreenDom };
}
