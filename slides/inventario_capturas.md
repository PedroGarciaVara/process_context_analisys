# Inventario de capturas

Las capturas `01`–`06` son PNG nuevos tomados con Playwright/Chromium contra Flask local el 30-08-2026. Las imágenes `modelado_bpm_*` son PNG históricos reutilizados. La demo usa el proceso `TFM_DEMO_1788104782421_PROC`, `process_id` `4cda3697-8024-41ce-aaeb-a0988eff073a`.

| Archivo | Pantalla / flujo | Qué demuestra | Ruta o interacción para reproducirla | Estado |
|---|---|---|---|---|
| `capturas/modelado_bpm_vista_completa.png` | Modelado de procesos, vista completa | Cabecera de modelado, selección de proceso, formularios, paleta BPM, lienzo y lista de relaciones. | `#/modelado-procesos`; seleccionar un proceso con datos y desplazar la página. | Reutilizada; captura histórica de evidencia UI |
| `capturas/modelado_bpm_subprocesos_expandido.png` | Diagrama BPM en pantalla completa | Subprocesos expandidos, nodos de entrada y relaciones dirigidas; incluye control para salir de pantalla completa. | `#/modelado-procesos`; seleccionar un proceso y expandir un subproceso; activar pantalla completa. | Reutilizada; captura histórica de evidencia UI |
| `capturas/modelado_bpm_panel_metadatos.png` | Modelado BPM con elemento seleccionado | Paleta de tipos, grafo, selección de una operación y panel lateral de metadatos industriales. | `#/modelado-procesos`; seleccionar un proceso y una tarjeta del grafo. | Reutilizada; captura histórica de evidencia UI |
| `capturas/modelado_bpm_decision_ramas.png` | Diagrama BPM con decisión | Nodo de decisión y dos salidas etiquetadas `Sí` y `No`, conectadas a outputs `MEZCLA_OK` y `MEZCLA_NOK`. | `#/modelado-procesos`; seleccionar un proceso cuyo grafo contenga una decisión y sus ramas; activar pantalla completa si procede. | Reutilizada; captura histórica de evidencia UI |
| `capturas/01-bpm-proceso-operaciones.png` | BPM, proceso y operaciones | Proceso demo y operaciones `OP-001`, `OP-002`, `OP-003`. El proceso se creó desde UI; las operaciones se crearon mediante API Playwright porque el proceso vacío exige nodo padre. | `#/modelado-procesos`; seleccionar el BPM demo. | Nueva; Playwright local |
| `capturas/02-bpm-descripciones.png` | BPM, descripción | Panel de contexto de la operación demo; se documentan “Preparar materia prima” (`OP-001`) y “Procesar lote” (`OP-002`). No se inventa descripción para `OP-003`. | Seleccionar el segundo nodo en `#/modelado-procesos`. | Nueva; Playwright local |
| `capturas/03-maquinas.png` | Máquinas | Máquina `352` con descripción y contrato `216`; muestra el bloqueo de configuración. | `#/maquinas`; filtrar el proceso demo. | Nueva; Playwright local; tres configuraciones respondieron `409 persistence_error` y no persistieron |
| `capturas/04-contrato.png` | Contratos | Contrato RCA demo dentro del proceso demo. | `#/contratos`; filtrar el proceso demo. | Nueva; Playwright local |
| `capturas/05-template-rca.png` | Árbol / template RCA | Causa raíz e hipótesis del contrato demo. | `#/arboles`; seleccionar el proceso demo. | Nueva; Playwright local |
| `capturas/06-analisis-rca.png` | Análisis RCA | Análisis importado desde la plantilla, con indicio y conclusión cerrada. | `#/analisis_causas?contract_id=216&analysis_id=26`. | Nueva; Playwright local |

## Procedencia

Las cuatro imágenes históricas se copiaron desde `requeriments_spec_driven_development/requerimiento_10/`. Las seis nuevas proceden de la sesión local documentada en `flujo_demo.md`. No se copian artefactos de tests completos, trazas, vídeos ni credenciales.

## Pantallas no capturadas

La única evidencia incompleta es la asociación máquina–operación: la API devolvió HTTP 409 y la captura 03 lo refleja.
