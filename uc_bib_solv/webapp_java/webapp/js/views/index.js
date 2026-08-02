import { renderInicio } from "./inicio.js";
import { renderMaquinasV02 } from "./maquinas_v02.js";
import { renderProcesosV02 } from "./procesos_v02.js";
import { renderContratosV02 } from "./contratos_v02.js";
import { renderCausaDetalleV02 } from "./causa_detalle_v02.js";
import { renderArbolesV02 } from "./arboles_v02.js";
import { renderAnalisisCausasV02Shell } from "./analisis_causas_v02.js";
import { renderProcessModeling } from "./process-modeling.js";
import { renderContexto } from "./contexto.js";

const VIEW_RENDERERS = {
  inicio: renderInicio,
  procesos: renderProcesosV02,
  contratos: renderContratosV02,
  maquinas: renderMaquinasV02,
  maquinas_v02: renderMaquinasV02,
  procesos_v02: renderProcesosV02,
  contratos_v02: renderContratosV02,
  causa_detalle: renderCausaDetalleV02,
  causa_detalle_v02: renderCausaDetalleV02,
  arbol: renderArbolesV02,
  analisis_causas_v2: renderAnalisisCausasV02Shell,
  arboles_v02: renderArbolesV02,
  analisis_causas_v02: renderAnalisisCausasV02Shell,
  "modelado-procesos": renderProcessModeling,
  contexto: renderContexto,
};

export function renderView(route, state, bus) {
  const renderer = VIEW_RENDERERS[route] || renderInicio;
  const output = renderer(state, bus);
  if (output && typeof output === "object" && "main" in output) {
    return output;
  }
  return { main: output };
}

export function getRouteLabel(route) {
  const labels = {
    inicio: "Inicio",
    procesos: "Proceso",
    procesos_v02: "Proceso",
    contratos: "Contrato",
    contratos_v02: "Contrato",
    maquinas: "Maquina",
    maquinas_v02: "Maquina",
    causa_detalle: "Detalle de causa",
    causa_detalle_v02: "Detalle de causa",
    arbol: "Arbol",
    arboles_v02: "Arbol",
    analisis_causas_v2: "Analisis causas",
    analisis_causas_v02: "Analisis causas",
    "modelado-procesos": "Modelado de procesos",
    contexto: "Contexto estructurado",
  };
  return labels[route] || "Inicio";
}
