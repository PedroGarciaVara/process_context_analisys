# Auditoría de arquitectura de la aplicación

Fecha de la primera auditoría: 2026-08-23

## Resultado inicial

El frontend tiene un router único en `webapp/js/core/router.js` y un registro de renderizadores en `webapp/js/views/index.js`. La navegación común se construye en `shell_v02.js`. La auditoría está automatizada en `scripts/audit_application_architecture.py` y no modifica código ni datos.

## Hallazgos por dominio

| Dominio | Estado observado | Acción segura inmediata |
|---|---|---|
| Inicio | Vista activa y punto de entrada de navegación | Mantener; extraer navegación común en fase posterior |
| Procesos BPM | Existen catálogo, detalle y modelado; hay aliases `procesos`/`procesos_v02` | Mantener ambos hasta verificar consumidores; canonizar gradualmente |
| Operaciones BPM | Catálogo y detalle dedicados; dependencias de versión y nodo | Mantener; añadir contrato de payload normalizado |
| Máquinas | Vista grande con lógica de tabla, contexto y modal | Extraer componentes por comportamiento, sin borrar APIs todavía |
| Contratos | Vista grande con filtros, creación y detalle | Extraer formulario, tabla y acciones; conservar estados y alcance BPM |
| Árboles | Componentes compartidos de datos, render y shell | Mantener hasta completar trazabilidad con análisis causales |
| Análisis causales | Vista v02 y servicios de análisis consumidos por inicio/árbol | Mantener endpoints y flujo actual |
| Causas | `causa_detalle.js` es legacy y `causa_detalle_v02.js` es la vista actual | Verificar todos los enlaces antes de retirar el legacy |
| Contexto | Vista pequeña que consume el cliente BPM | Mantener |
| Modelado BPM | Vista monolítica; concentra grafo, edición, creación y navegación | Extraer servicios/componentes por fases; no reescribir de una vez |

## Compatibilidad de rutas

Se mantienen registradas las rutas actuales. Los candidatos legacy detectados son:

- `procesos` → `procesos_v02`;
- `contratos` → `contratos_v02`;
- `maquinas` → `maquinas_v02`;
- `arbol` → `arboles_v02`;
- `causa_detalle` → `causa_detalle_v02`;
- `analisis_causas_v2` → `analisis_causas_v02`.

No se eliminan en esta entrega porque siguen formando parte del router o aparecen en tests/enlaces. La siguiente fase debe convertirlos en aliases explícitos o demostrar que pueden retirarse.

## Backend

El backend conserva fachadas legacy en `uc_bib_solv/routes`, pero la composición runtime ya utiliza los adaptadores canónicos para BPM operacional, TREE causal y análisis causal. Process Modeling continúa detrás de su fachada compatible porque todavía comparte wiring con el servicio histórico. La herramienta registra rutas duplicadas y consumidores antes de eliminar endpoints. Ningún endpoint se elimina en esta entrega.

## Criterio de eliminación

Un archivo, ruta, export o endpoint solo podrá eliminarse cuando la auditoría confirme ausencia de referencias en frontend, backend, tests, scripts y documentación, y cuando exista una prueba de regresión para la ruta canónica.

## Siguiente fase

Refactorizar incrementalmente el dominio de procesos/operaciones BPM, empezando por contratos compartidos de navegación, carga y errores. Después continuar con máquinas, contratos, árboles/análisis y modelado BPM.
