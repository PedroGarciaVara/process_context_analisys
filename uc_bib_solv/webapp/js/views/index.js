import { renderInicio } from "./inicio/inicio.js";
import { renderMaquinas } from "./maquinas/maquinas.js";
import { renderProcesos } from "./bpm/procesos.js";
import { renderProcesosDetalle } from "./bpm/procesos_detalle.js";
import { renderOperaciones } from "./bpm/operaciones.js";
import { renderOperacionesDetalle } from "./bpm/operaciones_detalle.js";
import { renderContratos } from "./bpm/contratos.js";
import { renderContratosDetalle } from "./bpm/contratos_detalle.js";
import { renderMaquinasDetalle } from "./maquinas/maquinas_detalle.js";
import { renderCausaDetallePage } from "./rca/causa_detalle.js";
import { renderArboles } from "./rca/arboles.js";
import { renderAnalisisCausasShell } from "./rca/analisis_causas.js";
import { renderProcessModeling } from "./nodes/process-modeling.js";
import { renderProcessStudio } from "./bpm/studio.js";
import { renderContexto } from "./contexto/contexto.js";

const VIEW_RENDERERS = {
  inicio: renderInicio,
  procesos: renderProcesos,
  procesos_detalle: renderProcesosDetalle,
  operaciones: renderOperaciones,
  operaciones_detalle: renderOperacionesDetalle,
  contratos: renderContratos,
  contratos_detalle: renderContratosDetalle,
  maquinas: renderMaquinas,
  maquinas_detalle: renderMaquinasDetalle,
  causa_detalle: renderCausaDetallePage,
  arboles: renderArboles,
  analisis_causas: renderAnalisisCausasShell,
  "modelado-procesos": renderProcessModeling,
  "studio-procesos": renderProcessStudio,
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
    procesos_detalle: "Detalle de proceso",
    operaciones: "Operaciones",
    operaciones_detalle: "Detalle de operación",
    contratos: "Contrato",
    contratos_detalle: "Detalle de contrato",
    maquinas: "Maquina",
    maquinas_detalle: "Detalle de máquina",
    causa_detalle: "Detalle de causa",
    arboles: "Arbol",
    analisis_causas: "Analisis causas",
    "modelado-procesos": "Modelado de procesos",
    "studio-procesos": "Industrial Flow Studio",
    contexto: "Contexto estructurado",
  };
  return labels[route] || "Inicio";
}
