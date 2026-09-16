# Plan de tareas — Requerimiento 20

## Metadata

- Requirement ID: `requerimiento_20`
- Spec File: `./requeriments_spec_driven_development/requerimiento_20/spec.md`
- Status: `implementado_pendiente_validacion`
- Provenance: escrito en modo degradado autorizado; no intervino `plan-task-agent`.
- Owner: `plan-task-agent` (contingencia: orchestrator autorizado)
- Created At: `2026-09-03`
- Last Updated: `2026-09-03`

## Objective

Implementar inserción de operación, eliminación con reconexión opcional y
convergencia de dos operaciones sobre el grafo BPM existente, con persistencia
atómica, UI accesible, códigos automáticos de backend y tres escenarios E2E Playwright.

## Scope

### In Scope

- Extender dominio, aplicación, HTTP, repositorios y frontend BPM existentes.
- Mantener PostgreSQL y las tablas `pm_*` como fuente de verdad.
- Crear tests unitarios, integración/API y tres E2E trazables a los AC.
- No permitir edición manual de `process_code` ni `node_code`.

### Out of Scope

- Nuevo modelo de grafo, nodo merge implícito, undo/redo, colaboración,
  permisos, causalidad o rediseño general del layout.

## Inputs

- `./requeriments_spec_driven_development/requerimiento_20/spec.md`
- `./context.md`, `./README.md`
- `./.atl/sub-agent-registry.md`, `./.atl/skill-registry.md`
- `./common_spec_driven_development/templates/task_plan.template.md`
- `uc_bib_solv/webapp/js/views/nodes/process-modeling.js`
- `uc_bib_solv/webapp/js/controllers/process-modeling/node-actions.js`
- `uc_bib_solv/webapp/js/components/process-modeling/graph.js`
- `uc_bib_solv/webapp/js/api/process-modeling.js`
- `uc_bib_solv/modules/bpm/domain/`
- `uc_bib_solv/modules/bpm/application/`
- `uc_bib_solv/modules/bpm/adapters/inbound/http/process_modeling.py`
- `uc_bib_solv/modules/bpm/adapters/outbound/postgres/`
- `db_management/schema.sql`, `tests/unit/`, `tests/e2e/`

## Assumptions

- La autorización humana de modo degradado cubre la autoría de todas las fases.
- La reconexión se limita a una operación con exactamente una entrada y una salida.
- La inserción copia metadatos compatibles de la transición original a ambos edges.
- La convergencia de este requerimiento usa relaciones `sequence` entre operaciones.
- Se reutilizarán los módulos BPM existentes y no se creará una frontera paralela.
- La convergencia se representa mediante varias relaciones hacia un mismo destino,
- Los E2E usarán fixtures identificables y limpieza en `finally`, sin truncado.
- La asignación de códigos de proceso se serializará en PostgreSQL y los códigos
  se conservarán en cualquier actualización.

## Dependencies

### Skills y agentes

- `domain-logic`, `data-model-management`, `frontend-design`,
  `web-design-guidelines`, `ui-test-structure` y configuración Playwright.
- Ejecución degradada autorizada sin `execute-agent` ni agentes UI si fuera necesario.

### Technical dependencies

- PostgreSQL, servidor Flask/SPA, Playwright y Chromium.
- Fixture BPM aislado con nodos `OP-A`, `OP-B`, `OP-C`.

## Execution Strategy

1. Validar el spec y resolver Q-20-01..03.
2. Auditar DDL, reglas y repositorios; fijar payloads/endpoints.
3. Implementar dominio y aplicación, después persistencia y HTTP.
4. Añadir controles UI, selección de edges y representación de convergencias.
5. Ejecutar unitarias e integración.
6. Generar y ejecutar exactamente tres E2E, analizar artefactos y limpiar fixtures.
7. Entregar `implementado_pendiente_validacion`; solo la validación humana permite
   `done`.

## Human Validation Gates

### Gate 1: Spec Validation

- Required State Before Planning: `spec_validada`.
- Decision Owner: `programador_humano`.
- Status: `approved`.
- Q-20-01, Q-20-02 y Q-20-03 fueron resueltas mediante la validación humana de
  2026-09-03 y quedan registradas en el spec.

### Gate 2: Task Plan Approval

- Required State Before Implementation: aprobación humana explícita del plan.
- Decision Owner: `programador_humano`.
- Status: `approved`.
- Implementación autorizada tras la validación humana de 2026-09-03.

### Gate 3: Final Implementation Validation

- Required State Before Closure: `implementado_pendiente_validacion`.
- Decision Owner: `programador_humano`.
- Status: `pending`.
- Comprobar los tres E2E, persistencia tras recarga, errores y NCs.

## Tasks

### T01. Contrato y baseline

- Goal: confirmar modelo físico y decisiones funcionales.
- Inputs: spec, DDL, reglas, repositorios, endpoints y tests.
- Actions: resolver Q-20-01..03; verificar FKs, constraints, versión editable,
  selección de edges y fixture BPM; confirmar indegree múltiple.
- Output: contrato de comandos, endpoints, política de reconexión y baseline.
- Status: `completed`

### T02. Dominio y aplicación

- Goal: implementar reglas reutilizables para las tres mutaciones.
- Inputs: T01, `domain/processes`, casos de uso y DTOs.
- Actions: definir comandos/resultados; validar referencias, duplicados,
  auto-enlaces, ciclos, tipos y cardinalidad; cubrir éxitos y rechazos.
- Output: casos de uso sin dependencias de UI/infraestructura y tests unitarios.
- Status: `completed`

### T03. Persistencia y transacciones

- Goal: materializar cada comando con commit/rollback atómico.
- Inputs: T01/T02, repositorios PM, conexión y DDL.
- Actions: reemplazar edge en inserción; borrar y reconectar según política;
  conservar convergencias; probar rollback y ausencia de huérfanos; tocar DDL
  solo si T01 lo exige y tras reabrir Gate 1.
- Output: persistencia verificable en PostgreSQL.
- Status: `completed`

### T04. API HTTP

- Goal: exponer comandos en `/api/bpm` con errores estables.
- Inputs: T02/T03, blueprint y cliente API.
- Actions: fijar payloads; serializar grafo actualizado; añadir tests de contrato;
  asegurar que 4xx/5xx no dejan escrituras parciales.
- Output: endpoints compatibles y documentados por pruebas.
- Status: `completed`

### T05. UI y proyección gráfica

- Goal: hacer operables las capacidades en la vista existente.
- Inputs: T04, `process-modeling.js`, `node-actions.js`, `graph.js` y estilos.
- Actions: selección/acción de transición; modal de inserción; confirmación con
  dos opciones de borrado; selección de origen/destino; estados y accesibilidad;
  dos conectores visibles y deterministas.
- Output: editor UI funcional sin reglas de negocio duplicadas.
- Status: `completed`

### T06. Tests de capas y no regresión

- Goal: verificar la solución antes de E2E.
- Inputs: T02–T05 y suites existentes.
- Actions: unitarias de invariantes; integración PostgreSQL con fixture y rollback;
  tests JS de proyección; no regresión de ramas, subprocesos y metadata.
- Output: resultados automáticos y candidatos NC.
- Status: `completed`

### T07. Tres E2E Playwright

- Goal: validar cada supuesto solicitado con persistencia tras recarga.
- Inputs: spec/plan aprobados, fixture, URL y estructura `tests/e2e/*.spec.js`.
- Actions:
  - `E2E-20-01`: crear `OP-A → OP-B`, insertar `OP-X`, recargar y verificar los
    dos edges y ausencia del original.
  - `E2E-20-02`: crear `OP-A → OP-B → OP-C`, mostrar las dos opciones, ejecutar la
    reconexión aprobada, recargar y verificar `OP-A → OP-C`; cubrir la alternativa
    sin reconexión con fixture aislado.
  - `E2E-20-03`: crear `OP-A → OP-C`, añadir `OP-B → OP-C`, recargar y verificar
    dos predecesores y dos conectores.
  - Capturar requests/responses, trazas, screenshots y limpiar en `finally`.
- Output: tres specs E2E trazables a AC-20-01..03.
- Status: `completed`

### T08. Ejecución, análisis y Gate 3

- Goal: reunir evidencia de conformidad.
- Inputs: T06/T07, servidor, PostgreSQL, navegador y entorno.
- Actions: ejecutar los tres E2E y no regresión; guardar artefactos bajo
  `.playwright-artifacts/test-results/<timestamp>/`; analizar logs; documentar
  bloqueo ambiental si Chromium no inicia; mapear AC a evidencia y registrar NCs.
- Output: dossier para validación humana, estado `implementado_pendiente_validacion`.
- Status: `completed`

### T09. Enmienda de identidades automáticas

- Goal: eliminar la introducción manual de códigos y consolidar su generación
  en backend.
- Inputs: AMD-20-01, `next_node_code`, repositorio PostgreSQL y fichas BPM.
- Actions: añadir `next_process_code`; ignorar códigos recibidos al crear;
  serializar la asignación PostgreSQL; hacer códigos inmutables en PATCH;
  retirar entradas de proceso/nodo de las vistas y adaptar regresiones/E2E.
- Output: AC-20-08 cubierto con pruebas de aplicación, contrato y E2E.
- Status: `completed`

## Implementation and Verification Results

- Unitarias BPM y regresión: `python3 -m unittest tests.unit.test_process_structure_editing tests.unit.test_process_modeling_validation tests.unit.test_process_node_with_transition tests.unit.test_process_modeling_layers` — **9 passed**.
- Sintaxis JavaScript y `git diff --check` — **OK**.
- E2E focalizados: `npx playwright test tests/e2e/process-structure-editing.spec.js --reporter=line` — **3 passed**.
- Generación automática: `next_process_code` y creación BPM ignoran código de
  cliente; fichas de proceso/operación no renderizan entradas de código — **OK**.
- Regresión E2E BPM: `npx playwright test tests/e2e/process-modeling.spec.js tests/e2e/process-structure-editing.spec.js --reporter=line` — **9 passed**.
- Estado actual: `implementado_pendiente_validacion`; no se declara `done` hasta Gate 3 humano.

## Acceptance Criteria Traceability

| AC | Covered by |
|---|---|
| AC-20-01 / E2E-20-01 | T02, T03, T04, T05, T07, T08 |
| AC-20-02 / E2E-20-02 | T02, T03, T04, T05, T07, T08 |
| AC-20-03 / E2E-20-03 | T02, T03, T04, T05, T07, T08 |
| AC-20-04 | T02, T06 |
| AC-20-05 | T03, T04, T06 |
| AC-20-06 | T04, T05, T07, T08 |
| AC-20-07 | T02, T03, T04, T05, T06 |
| AC-20-08 | T02, T04, T05, T09 |

## Verification Plan

### Automatic / Command-Line Verification

- Tests unitarios de dominio/casos de uso.
- Tests de repositorio/API con rollback.
- Tests JS de selección y proyección de edges.
- Tres E2E Playwright y suite UI BPM relevante.
- Revisión de `summary.json`, consola, errores de requests, trazas y capturas.

### Manual Verification

- Confirmar visualmente inserción y las dos opciones de borrado.
- Confirmar dos flechas convergentes distinguibles y lista de transiciones correcta.
- Probar teclado, foco y mensajes de error.
- Validar Gate 3 contra spec, plan y decisiones Q-20-01..03.

## Non-Conformity Loop

- No marcar `done` por completar tests automáticos.
- Clasificar NC como `spec`, `task_plan` o `implementation`.
- NC de spec: actualizar spec, Gate 1 y regenerar plan.
- NC de plan: corregir plan y volver a Gate 2.
- NC de implementación: corregir y repetir T06–T08.
- Cualquier NC `open` o `in_correction` bloquea el cierre.

### Open Non-Conformities

- Ninguna al crear este plan.

## Risks

| Riesgo | Mitigación |
|---|---|
| Política ambigua al borrar cardinalidad múltiple | Resolver Q-20-01 antes de implementar. |
| Metadatos al dividir edge | Resolver Q-20-02 y probar por tipo. |
| `branch` y `sequence` incompatibles | Resolver Q-20-03 y acotar comandos. |
| UI sin selección de edges | Extender `graph.js` con IDs/acciones y tests aislados. |
| Constraints físicos impiden convergencia | Auditar DDL y reabrir Gate 1. |
| Chromium no inicia por sandbox | Conservar evidencia y ejecutar cobertura API/unitaria. |
| Fixtures huérfanos | Cleanup por IDs/prefijos en `finally` y auditoría de residuos. |

## Verification Checklist

- [ ] Modo degradado autorizado y registrado.
- [ ] `spec.md` validado (Gate 1).
- [ ] Q-20-01..03 resueltas o aprobadas.
- [ ] `task_plan.md` aprobado (Gate 2).
- [ ] T01–T08 completadas.
- [ ] Tres E2E ejecutados con artefactos.
- [ ] Persistencia verificada tras recarga.
- [ ] Fixtures limpiados sin truncado global.
- [x] AMD-20-01 implementada; pendiente validación humana Gate 3.
- [ ] Sin NCs abiertas.
- [ ] Validación final humana (Gate 3).

## Closure Rule

Solo pasar a `done` con Gate 1, Gate 2 y Gate 3 aprobados, los tres E2E conformes,
decisiones registradas, fixtures limpios y ausencia de NCs abiertas.
