# Task Plan — Requerimiento 15

## Metadata

- Requirement ID: `requerimiento_15`
- Spec File: `./requeriments_spec_driven_development/requerimiento_15/spec.md`
- Status: `done`
- Allowed Status Values:
  - `pending_human_validation`
  - `approved`
  - `in_progress`
  - `blocked`
  - `implementado_pendiente_validacion`
  - `no_conforme`
  - `en_correccion`
  - `done`
- Owner: `plan-task-agent`
- Created At: `2026-08-17`
- Last Updated: `2026-08-20`

## Objective

Migrar incrementalmente `uc_bib_solv` a un monolito modular orientado a dominios, con Clean/Hexagonal Architecture, manteniendo los contratos HTTP, persistencia, frontend y comportamiento observable actuales. El resultado debe incluir módulos por capacidad, puertos explícitos, wiring reversible, validadores arquitectónicos deterministas y evidencia de regresión por fase.

## Scope

### In Scope

- Perímetro exclusivo: `uc_bib_solv/` y sus tests/evidencias directamente asociados.
- Módulos `causal_analysis`, `causal_tree`, `operational_modeling`, `process_modeling`, `agent_tools` y `platform` bajo `uc_bib_solv/modules/`.
- Capas `domain`, `application/ports`, `adapters/inbound`, `adapters/outbound` e `infrastructure` según necesidad de cada módulo.
- Migración incremental de rutas, servicios, repositorios, dominios existentes, gateway de herramientas y wiring.
- Validadores en `uc_bib_solv/architecture_validators/` y pruebas en `tests/architecture/`.
- Pruebas de dominio aisladas, aplicación con fakes, adaptadores, contrato HTTP, persistencia, frontend, smoke, integración y E2E aplicables.
- Matrices legacy→target, allowlists justificadas, shims delgados y criterios de retirada.

### Out of Scope

- Cambiar `db_management/schema.sql`, tablas, columnas, índices, datos o motor PostgreSQL.
- Cambiar reglas de negocio, rutas, métodos, payloads, códigos HTTP, nombres públicos, UX, permisos o autenticación.
- Reescribir todo el frontend, renombrar assets históricos o extraer microservicios.
- Restaurar, borrar, limpiar o incorporar cambios ajenos del worktree; en particular `app/`, `webapp_java/`, scripts, tests y documentos fuera del perímetro validado.
- Crear una segunda implementación activa de una operación ya migrada.
- Comenzar implementación antes de la aprobación humana de este plan (Gate 2).

## Inputs

- Client requirement: `./requerimientos_cliente/requerimiento_15.md`
- Technical specification: `./requeriments_spec_driven_development/requerimiento_15/spec.md`
- Planning template: `./common_spec_driven_development/templates/task_plan.template.md`
- Normative registries:
  - `.atl/sub-agent-registry.md`
  - `.atl/skill-registry.md`
- Loaded skills:
  - `common_spec_driven_development/SKILLs/plan-task-agent/SKILL.md`
  - `common_spec_driven_development/SKILLs/project-structure-sdd/SKILL.md`
  - `common_spec_driven_development/SKILLs/domain-logic/SKILL.md`
  - `common_spec_driven_development/SKILLs/git-workflow/SKILL.md`
- Supporting implementation inventory: `uc_bib_solv/` tree, including `backend_app.py`, `local_server.py`, `routes/`, `services/`, `repositories/`, `app/domain/`, `app/persistence/`, `agent_tools/`, `webapp/` and existing `tests/`.
- Physical persistence source: `db_management/schema.sql` (read-only for this requirement).

## Assumptions

- Gate 1 (spec validation) is approved by the human programmer; the `spec.md` header is `spec_validada`.
- The six-domain map in the spec remains the baseline: `causal_analysis`, `causal_tree`, `operational_modeling`, `process_modeling`, `agent_tools`, `platform`.
- Existing legacy modules are treated as compatibility surfaces until their consumers are inventoried and redirected. No deletion is planned solely because a target module exists.
- Exact internal filenames may be selected by `execute-agent` only when they follow the stated layer, naming and ownership rules; public routes and assets retain their existing names.
- PostgreSQL, server and E2E availability may vary. Verification must distinguish environmental blocking from functional failure and must not invent a passing result.
- Every phase is independently reversible through wiring/facade changes and is human-validated before the next phase.

## Dependencies

- Sub-agents:
  - `execute-agent`: executes this plan only after Gate 2 approval.
  - `ui-validation-orchestrator` and its registered UI agents if the applicable E2E environment is available.
  - `nc-resolution-agent`: handles any open non-conformity after validation.
  - `documentation-agent` and `context-agent`: update documentation only after Gate 3/conformance decisions, if requested by the workflow.
- Skills:
  - `project-structure-sdd`: target directories stay inside the product root; extend an existing responsibility before introducing a new top-level boundary.
  - `domain-logic`: reusable rules, entities, value objects and use cases stay framework-free in `domain`; external needs are ports.
  - `git-workflow`: atomic, requirement-scoped commits; plan/spec artifacts use `spec(req-15): ... [skip ci]`; no push to `main` before human validation.
- Technical dependencies:
  - Python test/runtime dependencies in `uc_bib_solv/requirements.txt` or repository configuration.
  - Flask and PostgreSQL integration for adapter/contract tests when available.
  - Node.js for `node --check` and existing JavaScript unit/E2E tests.
  - Existing CI commands documented by the repository.

## Execution Strategy

Execute strictly in layers and phases, with a human evidence gate after every phase:

1. Freeze a scoped baseline and build deterministic architectural guardrails before moving runtime code.
2. Isolate platform startup, configuration, health/bootstrap and dependency composition while preserving legacy import facades.
3. Migrate the lower-risk, already-structured `process_modeling` and `agent_tools` capabilities.
4. Migrate `causal_tree` and `causal_analysis`, explicitly separating reusable graph/causal rules from HTTP and persistence and consolidating analysis repositories.
5. Migrate `operational_modeling`, separating machine/process/contract rules from payload composition and PostgreSQL access.
6. Close boundaries: redirect remaining consumers, prove zero active duplicate implementations, retire only justified shims, and make validators mandatory in CI without changing public contracts.

Within each phase the order is: inventory/contract snapshot → domain/application contracts → outbound adapters → inbound adapters → infrastructure wiring/facades → focused tests → phase evidence and human review. No big-bang move, schema migration or unrelated worktree cleanup is permitted.

## Human Validation Gates

### Gate 1: Spec Validation

- Required State Before Planning: `spec_validada`.
- Decision Owner: `programador_humano`.
- Status: `approved`.
- Evidence: the human programmer approved Gate 1; the validation is recorded in `spec.md`.
- Constraint: if the human later rejects any map, validator location or shim policy, classify it as a spec amendment, update `spec.md` through the requirements workflow, and regenerate this plan before implementation.

### Gate 2: Task Plan Approval

- Required State Before Implementation: explicit human approval of this `task_plan.md`.
- Decision Owner: `programador_humano`.
- Status: `approved`.
- Evidence: explicit human instruction `continuar con T3` on 2026-08-19 approved continuation of T3 and closed NC-002 after the recorded T2 `AUDIT_PASS`.
- Evidence required: approval recorded in the workflow and a reviewed diff limited to the intended plan/spec artifacts.
- Execute-agent constraint: do not implement, move, delete or rename product files until Gate 2 is approved.
- Suggested artifact commit after approval: `spec(req-15): aprobar plan de arquitectura modular [skip ci]`.

### Gate 3: Final Implementation Validation

- Required State Before Closure: `done`.
- Decision Owner: `programador_humano`.
- Status: `approved`.
- Evidence: all applicable automatic checks, phase evidence, contract comparison, regression results, clean NC state and explicit human conformance decision; Gate 3 was approved on 2026-08-20.
- Closure result: `done`; no NC is `open` or `in_correction`, and applicable environment limitations have a documented disposition.

## Tasks

### T1. Establish scoped baseline and migration matrix

- Goal: freeze observable contracts and legacy ownership without modifying product behavior or absorbing unrelated worktree changes.
- Inputs:
  - `uc_bib_solv/backend_app.py`, `local_server.py`, `routes/`, `services/`, `repositories/`, `app/domain/`, `app/persistence/`, `agent_tools/`, `webapp/`.
  - Existing Python, JavaScript, integration, smoke and E2E tests.
  - `db_management/schema.sql`.
- Actions:
  - Enumerate endpoints, methods, parameters, response envelopes, status/error behavior and frontend consumers for analysis, causes, operational, Process Modeling, bootstrap and health.
  - Classify legacy files and consumers into the six-domain map; include direct imports from tests/scripts.
  - Record SQL/table ownership, transaction boundaries, expected query counts and serialization behavior without changing schema.
  - Create the versioned legacy→target migration matrix and phase allowlist in the agreed implementation-owned location under `uc_bib_solv/` or `tests/`, excluding unrelated files.
  - Capture baseline outputs for contract/regression commands that are available; label unavailable services as environmental limitations.
- Output:
  - Scoped inventory, endpoint/contract snapshots, ownership matrix, allowlist baseline and phase evidence.
- Status: `done`
- Verification: inventory is deterministic and complete for all domains and routes; no out-of-scope file is changed.

### T2. Implement architecture validator entry point and test fixtures

- Goal: create deterministic architectural gates before migration work can proceed.
- Inputs:
  - Validator requirements in `spec.md`.
  - Target module convention `uc_bib_solv/modules/<domain>/...`.
  - T1 inventory and allowlist.
- Actions:
  - Add versionable `uc_bib_solv/architecture_validators/` with module entry point supporting `--check-structure`, `--check-naming`, `--check-dependencies`, `--check-concrete-implementations` and the combined/default check path.
  - Use AST classification for source/target, layer, domain and concrete implementation checks; sort filesystem traversal and all diagnostics lexicographically.
  - Implement explicit, reviewed allowlists for legacy naming/dependency/script exceptions with owner, reason, phase and removal criterion.
  - Add deterministic positive/negative fixtures and tests under `tests/architecture/` for missing directories, invalid names, forbidden imports, cross-domain internals, concrete repository construction, SQL/domain isolation, duplicate implementations and documented exceptions.
  - Ensure failures return exit code `1` and stable diagnostics containing file, line where applicable, rule, origin, target and message.
- Output:
  - `uc_bib_solv/architecture_validators/` and `tests/architecture/` with runnable CLI and fixtures.
- Status: `done`
- Verification: AC-02 through AC-08 and AC-12 validator portions pass, including deliberate failing fixtures.

### T3. Create platform boundaries and reversible composition

- Goal: isolate startup and lifecycle wiring without changing registration or HTTP behavior.
- Inputs:
  - `uc_bib_solv/backend_app.py`, `local_server.py`, `routes/bootstrap.py`, `routes/health.py`, `services/bootstrap_service.py`, `health_service.py`, `repositories/bootstrap_repository.py`, `health_repository.py`, `utils/http.py`.
  - T1 contract snapshots and T2 validators.
- Actions:
  - Create `uc_bib_solv/modules/platform/` with required boundaries, placing app factory/configuration/lifecycle composition in `infrastructure/` and HTTP adapters in `adapters/inbound/http/`.
  - Move only platform responsibilities; keep `db_management/schema.sql` and connection secrets outside domain.
  - Wire functional modules through explicit factories/ports and preserve legacy startup/facade imports where existing consumers require them.
  - Add delegation tests for shims and bootstrap/health contract tests.
- Output:
  - Platform module, reversible wiring, documented facade consumers and phase evidence.
- Status: `done`
- Verification: startup, `/health`, `/api/bootstrap` and relevant error behavior remain equivalent; `--check-dependencies` passes for new platform code.

### T4. Migrate `process_modeling` by layers

- Goal: use the existing domain model as the first functional migration and preserve Process Modeling APIs and persistence semantics.
- Inputs:
  - `uc_bib_solv/app/domain/process_modeling/`.
  - `uc_bib_solv/services/process_modeling_service.py`, `routes/process_modeling.py`, `app/persistence/pm_*_repo.py`.
  - `uc_bib_solv/webapp/js/api/process-modeling.js`, `webapp/js/components/process-modeling/`, `webapp/js/views/process-modeling.js` and existing tests.
- Actions:
  - Establish `uc_bib_solv/modules/process_modeling/{domain,application/ports,adapters/inbound,adapters/outbound,infrastructure}`.
  - Relocate/adapt entities, value objects, exceptions, validators and use cases into framework-free domain/application boundaries; no Flask, PostgreSQL, network, filesystem or environment imports in domain.
  - Define inbound/use-case contracts and outbound ports for PM nodes, processes, transitions and versions; map existing `pm_*` repositories into outbound persistence with injected connection/factory.
  - Convert Flask route handling and serialization to inbound adapters; compose implementations in infrastructure; keep legacy service/repository shims delegation-only and deprecated where needed.
  - Preserve frontend API names and response fields; adjust only imports/wiring required for the same contract.
  - Add domain, application-fake, adapter, route, JS and applicable E2E regression tests.
- Output:
  - Canonical Process Modeling module, shims/consumer register, tests and phase evidence.
- Status: `done`
- Verification: AC-01, AC-03, AC-04, AC-05, AC-07, AC-08, AC-09, AC-11, AC-12, AC-13, AC-14, AC-16.

### T5. Migrate `agent_tools` through public ports

- Goal: preserve tool contracts while removing direct coupling to legacy backend implementations.
- Inputs:
  - `uc_bib_solv/agent_tools/contracts.py`, `registry.py`, `validation.py`, `adapters.py`, `builtin.py`, `errors.py`.
  - Existing `tests/unit/test_agent_tools.py` and gateway consumers.
- Actions:
  - Create `uc_bib_solv/modules/agent_tools/` with domain/application ports, inbound tools adapters and outbound gateway adapters; preserve `ToolRequest`, `ToolResult`, names, codes and traceability.
  - Define ports for backend use cases/gateways; inject the existing backend gateway from infrastructure instead of importing concrete repositories from use cases.
  - Keep compatibility imports only as delegation shims and register consumers/removal criteria.
  - Add isolated contract/validation tests and integration tests with a fake gateway.
- Output:
  - Canonical tools module, public-port wiring, delegation tests and evidence.
- Status: `done` (T5 implementation evidence recorded; Gate 3 approved)
- Verification: AC-06, AC-07, AC-09, AC-11, AC-12 and AC-16; tool names and result contracts remain unchanged.

### T6. Migrate `causal_tree` and causal domain rules

- Goal: separate tree/graph/cause/hypothesis invariants from HTTP composition and PostgreSQL access.
- Inputs:
  - `uc_bib_solv/routes/causas.py`.
  - `uc_bib_solv/services/causas_service.py`, `causa_detail_service.py`.
  - `uc_bib_solv/repositories/causas_repository.py`, `causa_detail_repository.py`.
  - `uc_bib_solv/app/domain/arbol.py`, `graph.py`, `causa_tags.py`.
  - `uc_bib_solv/app/persistence/causa_repo.py`, `hipotesis_repo.py`, `node_repo.py`, `relationship_repo.py`, `graph_query_repo.py`, `graph_sync.py`.
  - Existing tree/cause unit, integration, route and frontend tests.
- Actions:
  - Establish `uc_bib_solv/modules/causal_tree/` with domain entities/value objects/services/exceptions/validators, application use cases and ports, inbound HTTP adapters, outbound persistence adapters and infrastructure wiring.
  - Move reusable cycle/relationship/tree/tag invariants into domain; keep request parsing, JSON and status mapping in inbound.
  - Define explicit ports for causes, hypotheses, nodes and relationships; keep SQL, cursors, row mapping and persistent serialization in outbound/infrastructure only.
  - Replace route/service direct repository access with injected use cases; retain only delegation shims required by inventoried consumers.
  - Add fake-based domain/application tests, persistence tests, route contract tests and frontend regression coverage.
- Output:
  - Canonical causal tree module, ownership matrix update, no-duplication evidence and phase evidence.
- Status: `done`
- Verification: AC-01, AC-04 through AC-13, AC-16; causal graph rules are testable without Flask/PostgreSQL.

### T7. Migrate `causal_analysis` and consolidate analysis persistence

- Goal: make analysis operations use application ports/use cases while eliminating competing active repository implementations.
- Inputs:
  - `uc_bib_solv/routes/analysis.py`, `repositories/analysis_repository.py`.
  - `uc_bib_solv/app/domain/analisis_causas.py`.
  - `uc_bib_solv/app/persistence/analisis_causas_repo.py`, `analisis_causas_detalle_repo.py` and related schema tables.
  - `uc_bib_solv/webapp/js/api/analysis.js`, `webapp/js/views/analisis_causas_v02.js` and contract tests.
- Actions:
  - Establish `uc_bib_solv/modules/causal_analysis/` with domain/application/inbound/outbound/infrastructure boundaries.
  - Extract analysis invariants and result modeling to framework-free domain; define use cases and ports for causal analysis, participant and result operations.
  - Consolidate SQL and mappers into the canonical outbound persistence implementation; if legacy consumers remain, make `repositories/analysis_repository.py` a delegation-only shim with a zero-SQL test and removal criterion.
  - Adapt `routes/analysis.py` to inbound use-case invocation and preserve all methods, payload fields, statuses and error semantics.
  - Add unit, application fake, outbound, HTTP contract and frontend tests, including read/write/update behavior and query-count observations.
- Output:
  - Canonical analysis module, single active persistence implementation, shim evidence and phase evidence.
- Status: `done`
- Verification: AC-01, AC-08 through AC-13, AC-15 and AC-16.

### T8. Migrate `operational_modeling`

- Goal: separate machine/process/contract/operation rules and persistence while preserving operational API behavior.
- Inputs:
  - `uc_bib_solv/routes/operational.py`, `repositories/operational_repository.py`, `services/operational_service.py`.
  - `uc_bib_solv/app/domain/machine_modeling/`.
  - `uc_bib_solv/app/persistence/contrato_repo.py`, `maquina_repo.py`, `proceso_repo.py`, `machine_model_repo.py`.
  - `uc_bib_solv/webapp/js/api/operational.js`, `core/operational.js`, `views/maquinas_v02.js`, `procesos_v02.js`, `contratos_v02.js` and existing tests.
- Actions:
  - Establish `uc_bib_solv/modules/operational_modeling/` with domain rules/value objects/exceptions/validators, application ports/use cases, inbound HTTP adapters, outbound persistence and infrastructure wiring.
  - Move machine/operation invariants and payload-independent validation into domain; keep JSON/query/status validation and presentation shaping inbound.
  - Preserve parameterized SQL, `psycopg2` JSON mapping, transaction boundaries and schema ownership in outbound/infrastructure; inject connections/factories.
  - Redirect operational routes and legacy service/repository entry points through use cases; ensure only one active implementation per operation.
  - Add isolated domain tests, fake application tests, outbound read/write/upsert/transaction tests, HTTP contract tests, `node --check` and applicable frontend/E2E tests.
- Output:
  - Canonical operational module, compatibility evidence, query/transaction comparison and phase evidence.
- Status: `done`
- Verification: AC-01, AC-04 through AC-15 and AC-16.

### T9. Close boundaries, enforce CI validation and retire shims

- Goal: make the target architecture enforceable and remove compatibility layers only after evidence proves they are unused and behavior remains equivalent.
- Inputs:
  - All migrated modules and phase matrices/evidence.
  - Validator suite and existing CI configuration/commands.
  - Consumer search results across runtime, tests and scripts.
- Actions:
  - Classify and resolve every remaining legacy import; update allowed exceptions with owner, phase and removal criterion or redirect the consumer to a public port.
  - Prove no duplicate active outbound implementation exists for each migrated operation; remove shims only when reference count is zero and delegation/regression evidence is green.
  - Make architecture validator commands part of the repository CI path without adding unrelated deployment behavior; preserve deterministic output and non-zero failures.
  - Run complete applicable Python, JavaScript, integration, smoke and E2E suites; capture environmental blockers separately.
  - Produce final legacy→target matrix, allowlist report, shim retirement report, compatibility report and phase commit/evidence index.
- Output:
  - Enforced boundaries, retired or explicitly retained shims, final validation evidence and closure recommendation.
- Status: `done`
- Verification: AC-01 through AC-16, especially AC-10, AC-12, AC-15 and AC-16.

### T10. Final human validation and documentation handoff

- Goal: prepare the implementation for Gate 3 and close the requirement only after explicit human conformance validation.
- Inputs:
  - T1–T9 artifacts, test results, diffs and NC log.
- Actions:
  - Verify every AC against executable evidence and document any unavailable environment as a blocker with impact and next action.
  - Run hygiene checks on changed production files (`print(`, `# DEBUG`, `# FIXME`, `breakpoint()`), scoped to this requirement.
  - Present the implementation diff with out-of-scope worktree changes excluded; request human validation.
  - If accepted, route documentation/context updates to `documentation-agent`/`context-agent` and update requirement trace only through the appropriate delegated workflow.
- Output:
  - Gate 3 decision package; status remained `implementado_pendiente_validacion` until human approval and is now `done`.
- Status: `done`
- Closure note: Gate 3 was approved by the human programmer. `documentation-agent` and `context-agent` could not initialize because of runtime filesystem restrictions; after explicit degraded-mode authorization, the orchestrator wrote `documentacion.md` and updated `context.md`, recording the contingency.
- Verification: AC-17 workflow gate, closure checklist and all applicable AC evidence.

## Acceptance Criteria Traceability

| AC | Covered by |
| --- | --- |
| AC-01 — mapa completo | T1, T3–T9; final matrix in T9 |
| AC-02 — structure validator | T2, T9 |
| AC-03 — naming validator and legacy allowlist | T1, T2, T9 |
| AC-04 — AST source/target dependencies | T2, T4–T8, T9 |
| AC-05 — domain isolation | T2, T4–T8, T9 |
| AC-06 — inter-domain public ports | T2, T4–T8, T9 |
| AC-07 — concrete implementation injection | T2, T3–T8 |
| AC-08 — SQL/connections placement | T1, T3–T8, T9 |
| AC-09 — inbound routes only | T3–T8, T9 |
| AC-10 — no duplicate active implementations/shim policy | T1, T6–T9 |
| AC-11 — HTTP contract compatibility | T1, T3–T8, T9–T10 |
| AC-12 — isolated domain tests | T2, T4–T8, T9–T10 |
| AC-13 — outbound persistence behavior | T1, T4, T6–T8, T9 |
| AC-14 — frontend compatibility | T1, T4, T6–T8, T9–T10 |
| AC-15 — global regression and environmental distinction | T1, T4–T9, T10 |
| AC-16 — incremental evidence per phase | T1, T3–T9 |
| AC-17 — human workflow gate | Gate 1, Gate 2, T10/Gate 3 |

## Verification Plan

### Automatic / Command-Line Verification

- `find uc_bib_solv/modules -maxdepth 3 -type d | sort` and the T1 migration matrix.
- `python -m uc_bib_solv.architecture_validators --check-structure` (exit `0` compliant, `1` negative fixture).
- `python -m uc_bib_solv.architecture_validators --check-naming`.
- `python -m uc_bib_solv.architecture_validators --check-dependencies`.
- `python -m uc_bib_solv.architecture_validators --check-concrete-implementations`.
- `pytest tests/architecture tests/unit` plus new domain/application tests, with no PostgreSQL/network for domain tests.
- Focused route/contract tests for bootstrap, health, analysis, causes, operational and Process Modeling; compare snapshots before/after.
- Adapter tests using fakes and, when available, PostgreSQL integration tests for read/write/update/upsert/transactions.
- `node --check` for every modified JavaScript file and existing JS unit tests.
- Existing smoke and Playwright/E2E commands where environment is available; report unavailable server/database as environmental blocker.
- Scoped hygiene search for forbidden debug markers and prohibited imports/SQL in domain; validator AST output is normative over textual grep.

### Manual Verification

- Confirm each domain has an owner, target path, migration matrix and no undocumented exception.
- Inspect representative dependency direction: inbound→application→domain and infrastructure/outbound→ports/domain only.
- Compare endpoint routes, methods, payloads, status/error semantics, frontend API names and navigation before/after.
- Confirm `db_management/schema.sql` is unchanged and no secrets/configuration entered domain.
- Review query/transaction count evidence and any performance delta.
- Review shim consumers, deprecation markers and removal criteria before accepting retirement.
- Human programmer validates each phase before the next, then performs Gate 3 conformance review.

## Non-Conformity Loop

### Policy

- Any mismatch against the approved spec, public contract, architecture matrix or this plan blocks advancement and `done`.
- Register every NC as `NC-XXX` in the requirement's NC log with description, evidence, root cause, affected AC/task, attempt number and state.
- Classify root cause as `spec`, `task_plan` or `implementation`:
  - `spec`: return to requirements workflow, update `spec.md`, re-run Gate 1 and regenerate this plan.
  - `task_plan`: update this plan through `plan-task-agent`, re-run Gate 2 before execution resumes.
  - `implementation`: route correction to `execute-agent`, rerun the affected task checks and Gate 3.
- Maximum two correction attempts without human escalation. At attempt three, stop and request a human decision.
- Preserve unrelated worktree changes during diagnosis and correction; never use broad reset/cleanup commands.
- `done` requires zero NCs in `open` or `in_correction`.

### Non-Conformities

- **NC-001** — `resolved`. Causa raíz: `implementation` (generación de artefactos T1). La auditoría independiente posterior obtuvo `AUDIT_PASS`: los cuatro artefactos T1 cumplen la corrección (23 tablas, CSV válido de 8 campos y atribución temporal reproducible delimitada al perímetro T1). El programador humano confirmó explícitamente el cierre el 2026-08-17.
- La corrección quedó limitada a `t1_scoped_inventory.md`, `t1_evidence.md`, `t1_migration_matrix.csv` y `t1_phase_allowlist.md`; no se modificaron código ni esquema. El flujo continúa en implementación y puede avanzar con T2–T10.
- **NC-002** — `resolved`. Causa raíz: `implementation` (validadores T2), intento `1 de 2`, reentrada `execute-agent`. La auditoría independiente T2 obtuvo `AUDIT_PASS` el 2026-08-19 y la confirmación humana explícita `continuar con T3` del 2026-08-19 cierra la NC y desbloquea T2.

## Risks

- The worktree has extensive unrelated additions, modifications and deletions; broad commands could corrupt scope or create false regression results. Mitigation: explicit paths, scoped diffs and no cleanup/restoration.
- Legacy duplication across `repositories/` and `app/persistence/` can hide consumers in tests/scripts. Mitigation: T1 reference inventory, delegation tests and zero-reference proof before shim removal.
- Shared graph and Process Modeling tables may cross domain boundaries. Mitigation: preserve schema, transactions and explicit ports; compare query behavior before/after.
- `routes/operational.py` mixes rules, payload composition and SQL. Mitigation: move reusable invariants to domain, request/response concerns inbound, persistence outbound, and test each boundary.
- AST classification may miss relative/dynamic imports or operational scripts. Mitigation: deterministic AST plus explicit, temporary allowlist and consumer review.
- PostgreSQL/server/E2E may be unavailable. Mitigation: isolate domain tests, use fakes, distinguish environment blockers from functional failures, and do not claim unexecuted evidence.
- Historical frontend names conflict with internal naming conventions. Mitigation: preserve public assets/contracts and document only narrowly scoped exceptions.
- Refactoring can change query counts or error semantics. Mitigation: baseline snapshots, query/transaction observations and Gate 3 human comparison.

## Verification Checklist

- [x] Gate 1 evidence is confirmed by the human programmer; any stale spec status is resolved through the proper workflow if required.
- [x] Gate 2 approval is explicit before `execute-agent` starts; recorded by human instruction `continuar con T3` on 2026-08-19.
- [x] T1 inventory covers every route, domain, legacy consumer, frontend API and persistence owner.
- [x] `uc_bib_solv/architecture_validators/` and `tests/architecture/` are deterministic and negative fixtures fail with exit `1`.
- [x] Every target module has the required boundaries or a documented, approved omission.
- [x] Domain tests run without Flask, PostgreSQL, network, secrets, Dataiku, Dash or environment variables.
- [x] No domain imports infrastructure, persistence, routes, services, webapp, SQL, external clients or concrete adapters.
- [x] Inbound adapters do not access outbound directly; application does not import concrete implementations.
- [x] SQL, cursors, connections, mappers and persistent serialization are limited to authorized outbound/infrastructure locations.
- [x] Legacy shims contain no SQL or duplicated business logic and have removal criteria.
- [x] Existing HTTP, frontend and persistence contracts are compared before/after.
- [x] `db_management/schema.sql` and unrelated worktree changes remain untouched.
- [x] Python, JavaScript, integration, smoke and E2E checks are green where available, with environmental blockers recorded.
- [x] Hygiene scan has no debug markers in changed production files.
- [x] All AC-01…AC-17 have evidence and no open NC remains.
- [x] Gate 3 human validation is explicit before changing status to `done`.

## Closure Rule

Change the global status to `done` only when Gate 1, Gate 2 and Gate 3 are approved; T1–T10 are complete or explicitly justified as not applicable; all AC-01…AC-17 have evidence; `db_management/schema.sql` and unrelated worktree changes remain intact; no NC is `open` or `in_correction`; the final compatibility/regression report is accepted; and `traza_requerimiento.md` reflects the real final state.

## Amendments

This plan contains no amendments at creation time. Any subsequent plan change must be captured as `AMD-XXX` in the parent `spec.md` under the project's amendment protocol, with Gate 2 re-validation for a type C amendment.
