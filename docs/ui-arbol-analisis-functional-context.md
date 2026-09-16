# Contexto funcional — Árbol RCA y análisis de causas

## Objetivo

Permitir definir una plantilla causal por proceso/contrato y ejecutar investigaciones trazables sobre una instantánea de esa plantilla. La plantilla organiza causas en árbol/DAG proyectado. La investigación registra indicio de apertura, hipótesis, evidencia, evaluación, conclusión y estado cerrado/reabierto.

## Flujos principales

1. `#/arboles`: filtrar proceso/objetivo, cargar nodos, seleccionar causa, consultar detalle, crear raíz/hija, editar, borrar o reutilizar nodo y gestionar hipótesis.
2. `#/causa_detalle`: crear/editar causa; modos de vinculación de causa/contrato reutilizable; crear/editar/borrar hipótesis.
3. `#/analisis_causas`: seleccionar proceso, operación, plantilla, fecha, participante, indicio y máquinas; importar plantilla y crear análisis.
4. `#/analisis_causas?contract_id=…&analysis_id=…`: evaluar cada hipótesis con evidencia y comentario, guardar apertura, cerrar con conclusión o reabrir.

## Entidades

- Proceso, operación, contrato/plantilla y máquina.
- Causa: `id`, `contrato_id`, `parent_id`, `nombre`, `tipo`, `categoria`, `descripcion`, responsable y metadatos.
- Hipótesis: `id`, `causa_id`, descripción, tipo, criterio de validación y estado.
- Análisis: contrato snapshot, fechas, indicio, participante, estado y resultados.
- Resultado de análisis: hipótesis, evaluación (`confirmada`/`descartada`), evidencia y conclusión.
- Proyección DAG: dependencias contractuales y nodos reutilizados/compartidos.

## Invariantes actuales y recomendadas

- La raíz inicial no se puede eliminar desde UI.
- Un análisis cerrado es solo lectura; reabrir requiere acción explícita.
- Evaluar hipótesis requiere evidencia no vacía.
- La jerarquía debe ser acíclica; todo reparenting debe validar self-parent y descendientes en backend.
- Mover una causa no debe perder hipótesis, resultados, referencias ni auditoría.
- Plantilla y análisis son conceptos distintos: el análisis debe conservar snapshot/comparación.

## Problemas conocidos

- No hay mover/reparenting de causa existente, ni endpoint cliente visible para cambiar `parent_id`.
- Conectores CSS con nombre `drop` son visuales; no son interacción drag/drop.
- Error de carga del árbol colapsa a un mensaje genérico y la eliminación ignora fallo HTTP (`catch(() => null)`).
- Accesibilidad semántica de árbol, foco de modales, labels/errores y teclado de zoom requieren revisión.
- Playwright runtime auditó una instancia aislada 8051 (health 200); 8050 no se tocó. En móvil se observó que el rail precede al contenido con desplazamiento vertical extremo (`.michelin-main` y panel contextual quedan miles de píxeles debajo del topbar), por lo que el layout responsive requiere corrección.

## Decisiones recomendadas

- Añadir comando `Mover causa…` accesible y usarlo como base de drag/drop opcional.
- Modal con padre actual/nuevo, búsqueda, preview, exclusión de subárbol y confirmación.
- Endpoint sugerido `PATCH /api/rca-tree/causes/{id}/parent` con `expected_version`; 409 para ciclos/conflictos.
- Registrar historial actor/fecha/motivo y proporcionar undo cuando sea posible.
- Modelar hipótesis con predicción, métrica, fuente, método, evidencia, umbral, decisión y acción de control.
- Mantener vistas árbol y lista; en móvil convertir inspector a panel inferior.

## Archivos editables relevantes

- Vistas: `uc_bib_solv/webapp/js/views/rca/arboles.js`, `analisis_causas.js`, `causa_detalle.js`.
- Shell/render: `js/components/tree-shell.js`, `tree-render.js`, `tree-actions.js`, `tree-data.js`.
- Detalle: `js/controllers/causa-detail-*.js`, `js/components/causa-detail/*.js`.
- APIs: `js/api/causas.js`, `js/api/analysis.js`.
- Estilos: `css/michelin-ui.css`, `app.css`, `layout.css`, `forms.css`.
- E2E existentes: `tests/e2e/arbol-selection.spec.js`, `analysis-workflow.spec.js`, `tree-root-cause.spec.js`.

## Contratos/API detectados

- Causas: `GET /api/rca-tree/nodes`, `GET /api/rca-tree/causes/detail`, `GET /api/rca-tree/causes/{id}`, `POST/PATCH/DELETE /api/rca-tree/causes…`.
- Hipótesis: `GET/POST /api/rca-tree/causes/{id}/hypotheses`, `PATCH/DELETE /api/rca-tree/hypotheses/{id}`, delete preview.
- Reutilización: búsqueda y enlace en `/api/rca-tree/causes/reusable/*`.
- Análisis: lista/templates, `POST /api/rca-tree/analyses`, lectura/`PATCH` por id y `POST /api/rca-tree/analyses/{id}/results`.
- No se detectó contrato de mover/reparentar; diseñarlo como operación atómica y versionada antes de implementar UI.

## Verificación pendiente

Reejecutar contra 8050 cuando esté disponible: navegación de ambas rutas, apertura de plantilla, selección de varias tarjetas, CRUD de causa/hipótesis sin datos persistentes huérfanos, OK/NO OK con evidencia, cierre/reapertura, estados vacíos/error, teclado y viewport 390/768/1280/1440. La ejecución aislada 8051 ya cubrió navegación, DOM, consola, requests y screenshots en 1440/390. Capturas están en `.playwright-artifacts/audits/2026-09-11-arbol-analisis/`.
