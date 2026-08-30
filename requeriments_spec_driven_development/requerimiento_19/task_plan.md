# Plan de tareas — Requerimiento 19

## Metadata

- Requirement ID: `requerimiento_19`
- Spec File: `./requeriments_spec_driven_development/requerimiento_19/spec.md`
- Status: `in_progress`
- Allowed Status Values: `pending_human_validation`, `approved`, `in_progress`, `blocked`, `implementado_pendiente_validacion`, `no_conforme`, `en_correccion`, `done`
- Owner: `plan-task-agent`
- Created At: `2026-08-30`
- Last Updated: `2026-08-30`

---

## Objective

Integrar `kpi_description`, `kpi_args` y `kpi_function` en el contrato BPM y
mantener una única plantilla RCA_TREE inicial por contrato, con creación,
edición, eliminación, migración total e idempotente y comparación de análisis
por IDs persistentes. La implementación debe conservar los boundaries actuales
de BPM y RCA_TREE, mantener PostgreSQL como persistencia operativa y dejar el
resultado listo para validación humana.

## Scope

### In Scope

- Modelo y DDL de contrato, plantilla `CONTRACT -> CAUSE -> HYPOTHESIS`, estados de análisis, constraints, índices y migración total desde el modelo legacy.
- Reglas de dominio y casos de uso BPM/RCA_TREE para alcance exclusivo, KPI, plantilla única, sincronización bidireccional, protección, cascada y comparación por identidad.
- Adaptadores PostgreSQL, puertos de transacción, rollback, idempotencia y mapeos hacia las entidades de dominio.
- Endpoints actuales `/api/bpm/contracts`, `/api/rca-tree/causes`, `/api/rca-tree/hypotheses` y `/api/rca-tree/analyses`, con sus códigos HTTP y forma `{status, data}`.
- Vistas y APIs JavaScript de contratos, causa/hipótesis y análisis, incluyendo confirmación de cascada, protección y estados/diferencias.
- Pruebas unitarias sin BBDD real, integración PostgreSQL y UI/E2E en las ubicaciones existentes del repositorio.
- Verificación de fronteras arquitectónicas, migración repetible, limpieza de datos de prueba y validación manual final.

### Out of Scope

- Ejecutar o interpretar funciones KPI, versionado, snapshots, histórico de plantillas o comparación de relaciones.
- Roles, autorización nueva, autenticación, integraciones externas, nuevos bounded contexts, nuevas rutas paralelas o cambio de conexión/motor PostgreSQL.
- Rediseño general del DAG RCA, catálogo de máquinas o modelado BPM no relacionado.

## Inputs

- Technical specification: `./requeriments_spec_driven_development/requerimiento_19/spec.md`
- Planning template: `./common_spec_driven_development/templates/task_plan.template.md`
- Sub-agent instructions: `./common_spec_driven_development/sub_agents/plan-task-agent.md`
- Registries: `./.atl/sub-agent-registry.md`, `./.atl/skill-registry.md`
- Domain skill: `./common_spec_driven_development/SKILLs/domain-logic/SKILL.md`
- Persistence/model skill: `./common_spec_driven_development/SKILLs/data-model-management/SKILL.md`
- PostgreSQL skill: `./common_spec_driven_development/SKILLs/postgresql-primary-persistence/SKILL.md`
- Callback skill: `./common_spec_driven_development/SKILLs/dash-callbacks/SKILL.md`
- UI test skill: `./common_spec_driven_development/agents_UI_test/skills/ui-test-structure/SKILL.md`
- Dash Playwright instructions: `./.github/instructions/skill-playwright-dash-webapp.instructions.md`
- Canonical DDL/migration locations: `./db_management/schema.sql`, `./db_management/migrate_graph.py`
- Existing BPM module: `./uc_bib_solv/modules/bpm`
- Existing RCA_TREE module: `./uc_bib_solv/modules/rca_tree`
- Existing frontend: `./uc_bib_solv/webapp/js`
- Existing test roots: `./tests/unit`, `./tests/integration`, `./tests/e2e`

## Assumptions

- `spec.md` está en `spec_validada`; Gate 1 debe quedar confirmado por el programador humano antes de ejecutar.
- Se extenderán los módulos existentes; no se creará un top-level module ni una vía legacy de compatibilidad.
- `db_management/schema.sql` seguirá siendo el DDL canónico y la conexión vigente en `uc_bib_solv/modules/platform/infrastructure/postgres.py` no se modificará.
- La resolución de columnas físicas de hipótesis y de vínculos únicos se cerrará contra el DDL real antes de implementar; si cambia una decisión de modelo, deberá volver a Gate 1.
- `kpi_args` y `kpi_function` se almacenan como texto descriptivo y permanecen sin ejecución.
- Cualquier usuario puede editar/reabrir análisis durante este requerimiento.
- La migración total puede requerir transformar físicamente datos legacy antes de eliminar columnas/semánticas legacy; no habrá tablas, campos, snapshots ni APIs de compatibilidad coexistentes después de la migración.
- Los tests UI respetarán la estructura existente basada en `tests/e2e/*.spec.js` cuando no exista una configuración TypeScript real; los artefactos, si se ejecutan, irán a `.playwright-artifacts/`.

## Dependencies

### Sub-agents y skills

- `execute-agent`: implementación posterior, únicamente tras aprobación de este plan.
- `ui-validation-orchestrator`, `ui-test-generation-agent`, `ui-test-execution-agent` y `ui-log-analysis-agent`: fase UI opcional/posterior según disponibilidad y Gate 2.
- `domain-logic`, `data-model-management`, `postgresql-primary-persistence`, `dash-callbacks`, `ui-test-structure` y `playwright-dash-webapp`.

### Technical dependencies

- PostgreSQL operativo y `db_cursor()`/conexión existente.
- DDL y datos actuales de `contrato`, `node`, `relationship`, `causa`, `hipotesis`, `analisis_causas`, `analisis_resultado`, `analisis_participante` y `analisis_causas_detalle`.
- Puertos y adaptador transaccional actuales de RCA_TREE en `uc_bib_solv/modules/rca_tree/application/ports/outbound/transaction.py` y `uc_bib_solv/modules/rca_tree/adapters/outbound/transaction_postgres.py`.
- Entorno Dash/Dataiku y credenciales/URL para E2E, si Gate 2 autoriza la ejecución UI.

## Execution Strategy

1. Confirmar Gate 1 y levantar un inventario técnico de DDL, columnas, FKs,
   endpoints, mappers y fixtures reales. Registrar cualquier divergencia que
   cambie el plan antes de escribir código.
2. Definir primero el modelo físico y la migración total, incluyendo constraints
   e índices; la migración debe convertir datos legacy, reutilizar vínculos
   objetivo existentes y ser reejecutable sin duplicados ni partes parciales.
3. Implementar dominio BPM y RCA_TREE sin imports de Flask, Dash, psycopg2,
   SQL ni infraestructura; después extender casos de uso y puertos.
4. Implementar adaptadores PostgreSQL y wiring con una transacción única para
   cada operación de contrato/plantilla/sincronización/cascada. Toda escritura
   operativa debe confirmarse o revertirse completa.
5. Adaptar HTTP conservando rutas y contrato `{status, data}`, y después el
   frontend como adaptador: validación inmediata, estados de carga,
   confirmaciones, stores explícitos y render centralizado donde aplique.
6. Cubrir unitarias, integración PostgreSQL, pruebas HTTP y E2E; verificar
   persistencia tras recarga, códigos HTTP, idempotencia, ausencia de legacy,
   fronteras arquitectónicas y limpieza de datos `TEST_`.
7. Entregar en `implementado_pendiente_validacion`; el cierre depende de Gate 3
   humano y de que no existan NC `open` o `in_correction`.

## Human Validation Gates

### Gate 1: Spec Validation

- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `approved` — validado por el programador humano.
- Evidence: `spec.md` contiene FR-01..FR-08, AC-01..AC-12, AMD-001, placement, restricciones y preguntas sin bloqueos de negocio.
- Stop condition: si el DDL objetivo, la identificación de pareja inicial o la eliminación física legacy requiere una decisión no cubierta, reabrir `spec.md` y no ejecutar.

### Gate 2: Task Plan Approval

- Required State Before Implementation: aprobación humana explícita de este archivo.
- Decision Owner: `programador_humano`
- Status: `approved` — aprobado por el programador humano para implementación.
- Notes: `execute-agent` no implementará mientras el estado no sea `approved`. La aprobación debe cubrir especialmente la migración total sin compatibilidad, el placement real y la estrategia de cascada.

### Gate 3: Final Implementation Validation

- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending`
- Evidence: informe de tests, diff de DDL/migración, verificación de AC-01..AC-12, revisión manual UI y ausencia de NC abiertas.
- Notes: solo la conformidad humana permite `done`.

## Tasks

### T01. Inventario de modelo, placement y baseline

- Goal: cerrar el mapa de implementación contra archivos realmente existentes y detectar divergencias antes de modificar código.
- Inputs: `spec.md`, `db_management/schema.sql`, `db_management/migrate_graph.py`, módulos BPM/RCA_TREE, `uc_bib_solv/webapp/js`, tests existentes.
- Actions:
  - Inspeccionar columnas/FKs/constraints actuales y localizar la representación física de `metrica`, hipótesis y relaciones legacy.
  - Mapear contrato a `uc_bib_solv/modules/bpm/domain/contracts`, casos de uso bajo `.../application/use_cases/contracts`, repositorio `.../adapters/outbound/postgres/contrato_repo.py` y adaptador operativo real.
  - Mapear RCA a `uc_bib_solv/modules/rca_tree/domain`, casos de uso de `causes`, `hypotheses`, `tree`, `analyses` y adaptadores PostgreSQL existentes.
  - Confirmar APIs reales en `uc_bib_solv/modules/*/adapters/inbound/http` y frontend real en `uc_bib_solv/webapp/js/api` y `uc_bib_solv/webapp/js/views`.
- Output: inventario/decisiones de implementación en el informe de ejecución; no crear rutas paralelas.
- Status: `pending`

### T02. Datos, DDL y migración total sin compatibilidad

- Goal: convertir el modelo físico legacy al modelo objetivo y dejar una migración transaccional, repetible y auditable por contrato.
- Inputs: resultado T01, `db_management/schema.sql`, `db_management/migrate_graph.py`, restricciones FR-05/AC-02/AC-07.
- Actions:
  - Definir en `schema.sql` `kpi_description`, `kpi_args`, `kpi_function`, nombre/descripción de hipótesis según columnas reales, unicidad de plantilla por contrato, estados `abierto`/`cerrado`, FKs, constraints e índices.
  - Transformar `metrica` a `kpi_description`, rellenar exactamente `Pendiente de definir KPI` cuando corresponda y convertir `DEPENDS_ON`/`VERIFIED_BY` al modelo `CAUSES`/`HAS_HYPOTHESIS` requerido.
  - Generar faltantes para contratos sin plantilla incluso con RCA antiguo, reutilizando por vínculo persistente objetivo y evitando duplicados.
  - Ejecutar cada contrato como unidad atómica; registrar/devolver el error del contrato y no confirmar partes incompletas.
  - Eliminar físicamente las columnas, estructuras y vías legacy afectadas una vez transformadas; no crear alias, snapshots, tablas temporales ni periodo de compatibilidad.
- Output: `db_management/schema.sql` y migración controlada en `db_management` preparados para ejecución idempotente.
- Status: `pending`

### T03. Dominio BPM: contrato, KPI y alcance

- Goal: representar invariantes BPM sin dependencia de infraestructura.
- Inputs: FR-01, FR-03, FR-04, FR-07, AC-01/03/04/05/11.
- Actions:
  - Extender `uc_bib_solv/modules/bpm/domain/contracts/entities.py`, `rules.py` y excepciones/valores existentes para KPI obligatorio, texto opcional y exactamente un alcance.
  - Modelar comandos/resultado funcionales sin SQL ni Flask/Dash y conservar el mismo `contrato.id` en ediciones y cambio proceso-operación.
  - Añadir tests unitarios de entradas vacías, `NULL`/ausentes según contrato técnico, ambos/ningún alcance y conservación de identidad.
- Output: reglas y entidades BPM verificables de forma aislada.
- Status: `pending`

### T04. Dominio RCA_TREE: plantilla, protección y análisis

- Goal: centralizar invariantes RCA y comparación por identidad persistente.
- Inputs: FR-02..FR-06, FR-07, AC-02/04/06/08/09/10/11.
- Actions:
  - Extender entidades/reglas existentes de `uc_bib_solv/modules/rca_tree/domain` para estructura inicial, plantilla única, nodos protegidos y cascada.
  - Representar ciclo de análisis `abierto`/`cerrado`, edición solo en abierto, reapertura y comparación exclusivamente por `causa.id`/`hipotesis.id`.
  - Definir resultados funcionales para elementos nuevos, ausentes y conteos/marcas exactos, sin snapshot ni comparación de relaciones.
  - Añadir tests unitarios de invariantes, estados y diferencias sin BBDD real.
- Output: reglas RCA_TREE reutilizables por API y UI.
- Status: `pending`

### T05. Aplicación BPM y orquestación de casos de uso

- Goal: coordinar creación, lectura, actualización, eliminación y cambio de alcance junto con la plantilla RCA.
- Inputs: T03/T04, puertos existentes en `uc_bib_solv/modules/bpm/application/ports` y `.../rca_tree/application/ports`.
- Actions:
  - Extender los casos existentes en `uc_bib_solv/modules/bpm/application/use_cases/contracts` y sus DTOs/puertos.
  - Definir operaciones de alta/edición/borrado que deleguen la creación y sincronización de causa/hipótesis a puertos, no a la UI.
  - Mantener los IDs persistentes en cambio proceso-operación y rechazar KPI vacío antes de cualquier confirmación.
  - Coordinar borrado de dependencias RCA/análisis respetando `RESTRICT`, en una sola operación funcional.
- Output: casos de uso BPM/RCA coordinados y testeables con dobles.
- Status: `pending`

### T06. Aplicación RCA_TREE y ciclo de análisis

- Goal: exponer casos de uso de causas, hipótesis, árbol y análisis con las nuevas reglas.
- Inputs: T04, casos existentes bajo `uc_bib_solv/modules/rca_tree/application/use_cases`.
- Actions:
  - Extender creación/edición/borrado para proteger la pareja inicial y permitir el comportamiento actual de elementos no iniciales.
  - Extender análisis para estado inicial abierto, cierre/reapertura, bloqueo de contenido cerrado y lectura dinámica de plantilla.
  - Construir la comparación por IDs persistentes, preservando resultados históricos y devolviendo marcas/conteos definidos.
- Output: casos de uso RCA_TREE sin lógica de negocio en callbacks o vistas.
- Status: `pending`

### T07. PostgreSQL, adaptadores, transacciones e idempotencia

- Goal: implementar persistencia concreta y garantías atómicas sobre la conexión PostgreSQL existente.
- Inputs: T02/T05/T06, `uc_bib_solv/modules/platform/infrastructure/postgres.py`, repositorios y adaptadores existentes.
- Actions:
  - Extender `uc_bib_solv/modules/bpm/adapters/outbound/postgres/contrato_repo.py`, `operational_postgres.py` y mappers/wiring reales.
  - Extender en RCA_TREE `causa_repo.py`, `hipotesis_repo.py`, `graph_sync.py`, `node_repo.py`, `relationship_repo.py`, `analysis_postgres.py`, repositorios de análisis y `transaction_postgres.py` solo donde corresponda.
  - Ejecutar contrato, plantilla, sincronización y relaciones en una transacción; rollback completo ante fallo o KPI inválido.
  - Usar consultas directas PostgreSQL tras escritura, constraints/FKs/índices y patrones `ON CONFLICT` o upsert equivalente para idempotencia; no confiar en cache Dataiku para verificar persistencia.
  - Resolver orden de borrado de `analisis_resultado`, participantes, detalles, relaciones, nodos y padres sin huérfanos.
- Output: adaptadores y wiring que implementan los puertos de aplicación y soportan retry seguro.
- Status: `pending`

### T08. HTTP y contratos de error

- Goal: conservar las rutas existentes y exponer los datos mínimos requeridos con códigos consistentes.
- Inputs: T05/T06/T07, rutas reales en `uc_bib_solv/modules/bpm/adapters/inbound/http` y `uc_bib_solv/modules/rca_tree/adapters/inbound/http/routes.py`.
- Actions:
  - Ampliar `/api/bpm/contracts`, `/api/rca-tree/causes`, `/api/rca-tree/hypotheses` y `/api/rca-tree/analyses` sin rutas paralelas.
  - Mantener `{status, data}` y mapear validación a 400, inexistente a 404, conflicto/transición a 409 y persistencia inesperada al mapeo 500 vigente.
  - Cubrir DELETE protegido, cascada confirmada desde cliente y respuestas de comparación/estado.
  - Añadir pruebas de contrato HTTP para AC-01/03/06/08/12.
- Output: adaptadores HTTP compatibles y verificables.
- Status: `pending`

### T09. Frontend de contratos, RCA y análisis

- Goal: reflejar el modelo y las reglas sin duplicar lógica de negocio.
- Inputs: T08, FR-07/FR-08, skill `dash-callbacks` y archivos reales de `uc_bib_solv/webapp/js`.
- Actions:
  - Extender `uc_bib_solv/webapp/js/api/operational.js`, `analysis.js`, `causas.js` y las vistas `contratos_v02.js`, `causa_detalle.js`, `causa_detalle_v02.js`, `analisis_causas_v02.js`.
  - Mostrar los tres campos KPI, proteger visualmente causa/hipótesis iniciales, confirmar la cascada y presentar estado, plantilla actual, marcas y conteos exactos.
  - Mantener validación inmediata, loading/error accionable y backend como autoridad.
  - En listas dinámicas, usar stores explícitos (`expanded_item_id`, `refresh_key` o equivalentes existentes) y un único render maestro; no usar estado implícito ni callbacks competidores.
  - Verificar persistencia tras recarga y no presentar como guardada una operación fallida.
- Output: frontend actualizado en rutas reales, sin endpoints alternativos ni reglas de dominio duplicadas.
- Status: `pending`

### T10. Pruebas unitarias y fronteras arquitectónicas

- Goal: demostrar reglas, casos de uso, mappers y ausencia de dependencias prohibidas.
- Inputs: T03/T04/T05/T06/T07, patrones existentes en `tests/unit`.
- Actions:
  - Añadir/ajustar pruebas en `tests/unit` para KPI/alcance, plantilla, sincronización, protección, estados, comparación, idempotencia simulada y errores.
  - Verificar AC-11 con el auditor existente y búsqueda explícita de imports de Flask, Dash, psycopg2, SQL o infraestructura en `domain`.
  - Mantener dobles de repositorio/transacción; ninguna prueba unitaria dependerá de BBDD real o red.
- Output: suite unitaria y de boundaries reproducible.
- Status: `pending`

### T11. Pruebas de integración PostgreSQL y migración

- Goal: validar constraints, transacciones, datos transformados y cascada contra PostgreSQL.
- Inputs: T02/T07, fixtures/patrones en `tests/integration`.
- Actions:
  - Cubrir creación por proceso/operación, pareja única, rollback, sincronización bidireccional, cambio de alcance, protección, cascada y estados.
  - Ejecutar migración sobre datos legacy representativos y repetirla; comprobar conteos, valor pendiente, semánticas objetivo, ausencia de legacy y ausencia de huérfanos.
  - Validar análisis abierto/cerrado, diferencias por IDs y conservación de resultados sin snapshots ni relaciones comparadas.
  - Aislar/limpiar datos de prueba y registrar errores por contrato sin confirmaciones parciales.
- Output: evidencias PostgreSQL para AC-01..AC-10 y AC-12.
- Status: `pending`

### T12. Pruebas UI/E2E y artefactos

- Goal: demostrar los recorridos visibles de contrato, RCA y análisis.
- Inputs: T09, T11, tests existentes `tests/e2e/analysis-workflow.spec.js`, `tests/e2e/tree-root-cause.spec.js`, `tests/e2e/process-contract-delete.spec.js`, skills UI.
- Actions:
  - Extender la suite en `tests/e2e` real del repositorio, usando URL de backend Dash sin iframe, `.dash-select-cell`, espera de alertas con `waitForFunction` y timeout suficiente.
  - Registrar resultados por AC, usar datos `TEST_` con timestamp y limpiar siempre las filas creadas.
  - Verificar ADD con alerta y conteo, UPDATE tras recarga/reselección y DELETE con conteo antes/después.
  - Guardar resultados y logs en `.playwright-artifacts/test-results/` cuando el entorno esté disponible; no inventar rutas de tests TypeScript si no están configuradas.
- Output: pruebas E2E y artefactos para AC-06/09/12, o bloqueo explícito si faltan URL/credenciales/Playwright.
- Status: `pending`

### T13. Verificación integral, higiene y preparación de Gate 3

- Goal: consolidar evidencia de conformidad y detectar NC antes de la validación humana.
- Inputs: resultados T01..T12, spec aprobado, diff de implementación y DDL.
- Actions:
  - Ejecutar la matriz AC-01..AC-12, revisión de rutas, imports, ausencia física de legacy, rollback, idempotencia y limpieza de `TEST_`.
  - Revisar que no existan `print(`, `# DEBUG`, `# FIXME` ni `breakpoint()` en producción y que no haya snapshots/compatibilidad no autorizados.
  - Preparar informe de implementación y dejar el requerimiento en `implementado_pendiente_validacion`.
  - Si hay desviaciones, registrarlas como NC y reentrar por el bucle definido abajo; no cerrar automáticamente.
- Output: evidencia para Gate 3 y lista de decisiones/NC.
- Status: `pending`

## Acceptance Criteria Traceability

| AC | Covered by |
| --- | --- |
| AC-01 | T02, T03, T05, T07, T08, T11 |
| AC-02 | T02, T04, T07, T11 |
| AC-03 | T03, T05, T07, T08, T11 |
| AC-04 | T03, T04, T05, T06, T07, T11 |
| AC-05 | T03, T05, T07, T11 |
| AC-06 | T04, T05, T06, T07, T08, T09, T11, T12 |
| AC-07 | T02, T07, T11 |
| AC-08 | T04, T06, T08, T11, T12 |
| AC-09 | T04, T06, T09, T11, T12 |
| AC-10 | T04, T06, T11, T12 |
| AC-11 | T03, T04, T10, T13 |
| AC-12 | T08, T09, T10, T11, T12, T13 |

## Verification Plan

### Automatic / Command-Line Verification

- Ejecutar las suites unitarias y de integración existentes/añadidas desde `tests/unit` y `tests/integration` con PostgreSQL de prueba configurado.
- Ejecutar auditorías de arquitectura y búsqueda de imports prohibidos en `uc_bib_solv/modules/*/domain`.
- Aplicar el DDL/migración en una base controlada, ejecutar dos veces y consultar conteos, constraints, FKs, índices, valores KPI y ausencia de legacy.
- Ejecutar pruebas HTTP y E2E desde `tests/e2e` si hay entorno Dash; almacenar artefactos bajo `.playwright-artifacts/`.
- Verificar higiene pre-commit y que no se han modificado archivos fuera del alcance aprobado.

### Manual Verification

- Confirmar Gate 1 y Gate 2 antes de implementar.
- Revisar visualmente campos KPI, protección de nodos, confirmación de eliminación, modos abierto/cerrado, marcas y mensajes exactos.
- Revisar que un fallo de transacción no deja datos parciales ni muestra éxito.
- Comparar la matriz AC-01..AC-12 y el diff de DDL contra `spec.md`; decidir Gate 3.

## Non-Conformity Loop

### Policy

- Una desviación respecto del spec aprobado es NC, no una ampliación implícita.
- Registrar cada NC con ID correlativo `NC-001`, estado y causa raíz `spec`, `task_plan` o `implementation`.
- `spec` -> actualizar `spec.md`, volver a Gate 1 y revisar/regenerar este plan.
- `task_plan` -> corregir este archivo, volver a Gate 2 y no ejecutar tareas afectadas.
- `implementation` -> corregir mediante `execute-agent`, repetir verificaciones y volver a Gate 3.
- Cualquier NC `open` o `in_correction` bloquea `done`; máximo dos intentos de corrección antes de escalar al programador humano.

### Open Non-Conformities

- Ninguna registrada al crear el plan.

### NC Checklist

- [ ] NC registrada con evidencia reproducible y causa raíz.
- [ ] Impacto sobre AC y tareas identificado.
- [ ] Artefacto correcto reabierto y gate correspondiente restablecido.
- [ ] Corrección verificada con la prueba que falló y regresión relacionada.
- [ ] Validación humana realizada antes de cerrar la NC.

## Risks

| Riesgo | Impacto/mitigación |
| --- | --- |
| El spec nombra ubicaciones genéricas o inexistentes frente al layout real; el frontend real es `uc_bib_solv/webapp/js` y el backend real `uc_bib_solv/modules`. | Evitar `webapps/`, `infrastructure/repositories/` o rutas paralelas no existentes; T01 debe confirmar cada placement y registrar cualquier excepción antes de T02. |
| `ui-test-structure` y la instrucción Playwright describen `tests/*.spec.ts`, `playwright.config.ts` y scripts auxiliares, pero el repositorio inspeccionado usa `tests/e2e/*.spec.js` y no se ha confirmado esa configuración. | Reutilizar la suite JS existente en T12; si se requiere migración estructural, escalar como decisión de Gate 2 y no inventar archivos durante la ejecución. |
| El DDL actual usa `metrica`, `causa.descripcion`, relaciones `DEPENDS_ON`/`VERIFIED_BY` y puede no tener columnas objetivo. | T01/T02 deben resolver el mapeo físico y probar migración total; cualquier ambigüedad que altere el modelo vuelve a Gate 1. |
| FKs `RESTRICT` y dependencias de análisis pueden dejar borrados parciales. | T07/T11 deben ordenar el borrado dentro de una única transacción y probar rollback/huérfanos. |
| Reintentos de migración o generación pueden duplicar plantilla, nodos o relaciones. | Constraint de unicidad, vínculo persistente y `ON CONFLICT`/upsert; repetir migración en T11. |
| Callbacks que compiten por render o estado implícito pueden expandir/editar otra fila. | T09 debe usar stores explícitos, timestamps/identidad y un único callback de render según `dash-callbacks`. |
| Cache Dataiku puede ocultar una escritura confirmada o revertirla. | T07/T11/T12 deben leer directamente PostgreSQL tras escrituras y verificar UPDATE con recarga. |
| Entorno remoto, URL, credenciales o Playwright no disponibles. | T12 queda bloqueada solo para E2E, se conservan pruebas unitarias/integración/HTTP y se escala la evidencia faltante a Gate 3. |

## Verification Checklist

- [ ] `spec.md` validado por el programador humano (Gate 1).
- [ ] Este `task_plan.md` aprobado explícitamente (Gate 2).
- [ ] DDL canónico y migración total eliminan físicamente legacy afectado, sin compatibilidad ni snapshots.
- [ ] Tareas T01..T13 completadas o justificadas como no aplicables.
- [ ] AC-01..AC-12 tienen evidencia y no hay criterios sin dueño.
- [ ] Tests unitarios sin BBDD real y tests de integración PostgreSQL ejecutados.
- [ ] Pruebas HTTP verifican rutas, `{status, data}` y códigos 400/404/409/500.
- [ ] E2E, si procede, usa URL backend, `.dash-select-cell`, espera de alertas, recarga para UPDATE y datos `TEST_` limpios.
- [ ] Auditoría confirma fronteras de dominio y ausencia de imports prohibidos.
- [ ] Higiene pre-commit sin `print(`, `# DEBUG`, `# FIXME` ni `breakpoint()` en producción.
- [ ] No existen NC abiertas o `in_correction`.
- [ ] Gate 3 validado por el programador humano antes de `done`.

## Closure Rule

Cambiar el estado global a `done` únicamente cuando Gate 1, Gate 2 y Gate 3
estén aprobados; T01..T13 estén completadas o justificadas; la matriz
AC-01..AC-12 tenga evidencia conforme; la migración total no conserve vías
legacy; no queden datos de prueba ni huérfanos; y `nc-log.md`/`traza_requerimiento.md`
reflejen el estado real sin NC `open` o `in_correction`.

## Amendments

Las enmiendas se registrarán en `spec.md` conforme al protocolo del proyecto.
La única enmienda conocida al crear este plan es `AMD-001`, que obliga a una
migración total sin compatibilidad y queda incorporada en T02, T07, T11 y la
matriz de riesgos.
