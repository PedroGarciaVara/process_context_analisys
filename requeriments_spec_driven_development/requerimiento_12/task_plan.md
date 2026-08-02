# Task Plan — Requerimiento 12

## Metadata

- Requirement ID: `requerimiento_12`
- Spec File: `./requeriments_spec_driven_development/requerimiento_12/spec.md`
- Status: `en_correccion`
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
- Implementation owner after Gate 2: `execute-agent`
- Created At: `2026-08-01`
- Last Updated: `2026-08-02` (NC-001..NC-005 resueltas; NC-006 abierta; Gate 3 pendiente)
- Authorship: `plan-task-agent`, sesión aislada de planificación

---

## Objective

Extender UC_BIB_Solve para capturar, conservar, consultar y copiar contexto
estructurado generalista de procesos industriales, preservando el BPM
relacional, la metodología causal y los contratos actuales. La implementación
deberá reutilizar el detalle JSON/JSONB existente por bloque/nodo, separar
declaraciones, hechos y evidencias, ofrecer recuperación estructurada para
RAG, permitir edición/consulta desde la SPA, calcular KPI solo bajo demanda y
usar el fixture BU exclusivamente para descubrir gaps de cobertura.

El resultado esperado es una ampliación verificable del producto existente,
sin tablas, modelos, repositorios ni bounded contexts especializados para
BU/MACBU y sin sustituir las relaciones BPM o causales por JSON/JSONB.

---

## Scope

### In Scope

- Inventario de contratos actuales de BPM, causalidad, plantillas, prompts,
  consignas, instrucciones, análisis y sobres HTTP antes de modificar nada.
- Contrato de detalle JSON/JSONB generalista por bloque/nodo, con familia,
  `schema_version`, datos y `source/provenance`, reutilizando la persistencia
  existente.
- Distinción persistente y recuperable entre declaración vigente, hecho de
  ejecución y evidencia.
- Contexto estructurado recuperable para técnicos y consumidores RAG, con
  identificadores estables, relaciones, versiones y procedencia.
- Conservación explícita de la metodología causal actual y de su cadena
  `contrato -> análisis -> plantilla/metodología -> causa -> hipótesis ->
  evidencia/evaluación -> conclusión/decisión`.
- Extensiones coordinadas en `app/domain/`, `app/persistence/`,
  `uc_bib_solv/webapp_java/python-backend/routes/`,
  `uc_bib_solv/webapp_java/python-backend/services/` y
  `uc_bib_solv/webapp_java/webapp/js/`.
- UI para navegar, editar, consultar, copiar y presentar contexto, metodología,
  plantilla, prompt y consignas sin romper los árboles causales ni la navegación
  BPM.
- Endpoints KPI bajo demanda con entradas, versión y procedencia, sin persistir
  el resultado calculado.
- Ejecución del fixture `proceso_BU_estructurado.md` como prueba de cobertura y
  registro de gaps no representables.
- Pruebas unitarias, de integración/persistencia, API, regresión causal/BPM,
  UI/E2E y validación humana final.

### Out of Scope

- Tablas, modelos, repositorios, bounded contexts o catálogos exclusivos de
  BU/MACBU, recetas, trolleys, bigbags, defectos o cualquier concepto del
  fixture.
- Sustituir el BPM relacional o el modelo causal existente por JSON/JSONB.
- Integración automática con PLC, Nivel 1, Nivel 2, PI-AVEVA, Databricks u
  otras fuentes externas.
- Envío automático de datos a una IA externa o integración con una API de IA.
- Persistir KPI, snapshots calculados, métricas derivadas o fórmulas evaluadas
  como modelo de producto.
- Inferir conclusiones causales o aplicar reglas `AND`/`OR` no declaradas por
  la metodología vigente.
- Convertir contratos declarativos de texto libre en DSL o fórmulas obligatorias.
- Reemplazar la SPA HTML/CSS/JavaScript por Dash, React u otra aplicación.
- Automatizar control de máquinas o ejecución industrial.

---

## Inputs

- Client requirement: `./requerimientos_cliente/requerimiento_12.md`
- Technical specification: `./requeriments_spec_driven_development/requerimiento_12/spec.md`
- Canonical fixture: `./requeriments_spec_driven_development/requerimiento_12/proceso_BU_estructurado.md`
- Current project context: `./context.md`
- Project overview and commands: `./README.md`
- Precedent for format and rigor only:
  - `./requeriments_spec_driven_development/requerimiento_10/spec.md`
  - `./requeriments_spec_driven_development/requerimiento_10/task_plan.md`
- Registries:
  - `./.atl/sub-agent-registry.md`
  - `./.atl/skill-registry.md`
- Normative agent instructions:
  - `./common_spec_driven_development/sub_agents/plan-task-agent.md`
  - `./common_spec_driven_development/sub_agents/execute-agent.md`
- Loaded skills:
  - `./common_spec_driven_development/SKILLs/domain-logic/SKILL.md`
  - `./common_spec_driven_development/SKILLs/data-model-management/SKILL.md`
  - `./common_spec_driven_development/SKILLs/frontend-design/SKILL.md`
  - `./common_spec_driven_development/SKILLs/git-workflow/SKILL.md`
  - `./common_spec_driven_development/SKILLs/plan-task-agent/SKILL.md`
- Official baseline: `./common_spec_driven_development/templates/task_plan.template.md`

---

## Assumptions

- Gate 1 del `spec.md` está aprobado por el programador humano; el estado de
  entrada para este plan es `spec_validada`.
- Las preguntas no bloqueantes del spec no autorizan diseñar modelos
  especializados. Si una no representabilidad del fixture exige una decisión
  de contrato generalista, se registrará como gap y se escalará antes de crear
  un artefacto que cambie el alcance.
- `pm_process_definition`, `pm_process_version`, `pm_process_node`,
  `pm_process_transition` y el mecanismo existente de metadatos JSON/JSONB son
  la fuente de verdad del BPM ya validado; las relaciones estructurales no se
  trasladan a JSON.
- Las estructuras y repositorios causales actuales siguen siendo la fuente de
  verdad de contratos, análisis, causas, hipótesis, evaluaciones, evidencias,
  conclusiones, decisiones y reaperturas.
- La ubicación normativa es la descrita por FR-11: SPA en
  `webapp/js/...`, HTTP en `python-backend/routes/`, servicios en
  `python-backend/services/`, dominio en `app/domain/`, persistencia en
  `app/persistence/` y esquema en `db/schema.sql`.
- No se adoptará una dependencia frontend nueva ni una migración de datos no
  justificada por el inventario y aprobada en Gate 2.
- Los contratos exactos de fuentes KPI, retención, permisos detallados y
  taxonomías futuras se mantendrán como decisiones explícitas o gaps, sin
  impedir la primera implementación generalista definida por el spec.

---

## Dependencies

### Sub-agents and skills

- `plan-task-agent` authored this plan and mapped all ACs.
- `execute-agent` is the mandatory author of implementation changes. It may
  start only after explicit human approval of Gate 2 and confirmation that the
  spec remains `spec_validada`.
- `domain-logic` constrains invariants, use cases, abstract repository
  interfaces, and the prohibition of UI/Flask/SQL dependencies in the domain.
- `data-model-management` constrains DDL, persistence mappings, repository
  boundaries and separation between persistent records and domain entities.
- `frontend-design` constrains the production-grade SPA experience, states,
  accessibility and visual coherence while preserving the existing HTML/CSS/JS
  stack.
- `git-workflow` constrains atomic commits, branch usage and `[skip ci]` for
  plan/spec artifacts. No commit or push is authorized by this plan.
- Registered UI validation agents may be coordinated by the orchestrator for
  Playwright setup, generation, execution, log recovery and analysis when the
  environment supports them.

### Technical dependencies

- PostgreSQL and the current initialization path through `db/schema.sql`.
- Existing Flask server and registered blueprints in
  `uc_bib_solv/webapp_java/python-backend/`.
- Existing JavaScript router, state, API clients, views and components under
  `uc_bib_solv/webapp_java/webapp/js/`.
- Existing BPM and causal repositories, services and tests.
- Existing HTTP response envelope and error conventions.
- Playwright/Chromium and the current E2E artifact conventions when available.

---

## Execution Strategy

The implementation is sequential and follows these mandatory macro phases:

1. inventory and compatibility contracts;
2. generalist JSON/JSONB detail;
3. structured/RAG context, provenance and declaration/fact/evidence separation;
4. backend, domain, repositories and routes;
5. UI editing/consultation/copying without breaking trees;
6. on-demand KPI endpoints without persistence;
7. reproducible BU fixture integration and gap discovery;
8. persistence/API/UI evidence, regression and final validation.

Each phase must first inspect the existing responsibility boundary and extend
the smallest compatible module. The first phase produces the baseline contract
and a compatibility matrix; later phases consume that baseline instead of
guessing current behavior. The second and third phases define general-purpose
representations and read projections; they must not create BU/MACBU models.

`execute-agent` owns implementation of all tasks T1–T8 after Gate 2. The
orchestrator coordinates the phase reports and human decisions but does not
implement tasks in this plan. NC-001 was classified as `task_plan`, so this
corrected plan re-enters Gate 2; the existing partial implementation is not
evidence that the corrected execution path was approved. After approval,
`execute-agent` must complete the fixture integration and evidence work before
the requirement can return to `implementado_pendiente_validacion` and Gate 3.

No task may silently alter existing causal semantics, remap historical
references when publishing a BPM version, persist geometry, infer a formula
from declarative text, or persist a calculated KPI.

---

## Human Validation Gates

### Gate 1: Spec Validation

- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `approved`
- Evidence:
  - `requerimiento_12/spec.md` records Gate 1 validation and AMD-002 as
    `integrated`.
  - The spec explicitly fixes scope, AC-01..AC-14, module placement,
    generalist JSON/JSONB constraints, KPI non-persistence and fixture policy.
- Effect: planning is authorized; implementation is not authorized.

### Gate 2: Task Plan Approval

- Required State Before Implementation: explicit human approval of this file.
- Decision Owner: `programador_humano`
- Status: `approved`
- Approval evidence: The programmer explicitly authorized continuation with the corrected plan on 2026-08-01.
- Re-entry reason: NC-001 was classified as `task_plan`; this corrected plan
  replaces the prior approval for the affected execution path.
- Evidence required:
  - Human reviews T1–T8, the NC-001 re-entry, AC traceability, paths,
    seed/cleanup contract, API/UI evidence and risks.
  - Human confirms that no task introduces a specialized BU/MACBU model.
  - Human explicitly authorizes `execute-agent` to implement the approved plan.
- Effect: `execute-agent` is authorized to execute the corrected T7/T8 path.

### Gate 3: Final Implementation Validation

- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending`
- Evidence required:
  - Unit, persistence/integration, API, regression and UI evidence is available.
  - AC-01..AC-14 are reviewed against the actual diff and runtime behavior.
  - Fixture gaps and environment limitations are classified and not hidden.
  - NC-001..NC-005 are `resolved`; NC-006 is `open` and blocks Gate 3 closure.
- Effect: only human conformance approval can move the requirement to `done`.

---

## Tasks

### T1. Inventario de compatibilidad BPM, causalidad, plantillas y consignas

- Objective:
  - Establish the current behavior baseline before modifying persistence,
    backend or UI. Identify exact contracts, version semantics, payloads,
    endpoints, repositories and rendering assumptions for BPM and causal work.
- Inputs:
  - `spec.md` FR-02, FR-06, FR-07, FR-11 and AC-02, AC-06, AC-07, AC-14.
  - `context.md`, `README.md`, req10 as format precedent only.
  - Existing `db/schema.sql`, BPM/causal repositories, services, routes,
    frontend API clients, views, tree components and current tests.
  - `proceso_BU_estructurado.md` only as a later coverage vocabulary source.
- Actions:
  - Inventory BPM definitions, versions, nodes, transitions, metadata,
    hierarchies and existing reconstruction queries. Record which fields are
    relational and which are already JSON/JSONB.
  - Inventory causal contracts, analyses, templates, prompts, instructions,
    consignas, hypotheses, evaluations, evidences, conclusions, branch
    decisions and reopen flows, including current states and HTTP envelopes.
  - Inventory frontend tree/BPM navigation, selection, expansion and copy
    behavior to identify compatibility-sensitive selectors and state.
  - Produce a compatibility matrix: current contract, owner module, expected
    extension point, regression command/test, and forbidden semantic change.
  - Record any missing support as a named compatibility gap; do not solve a gap
    by inventing a specialized model or by changing a historical contract.
- Outputs:
  - Compatibility matrix and baseline notes persisted only as the planning
    output of the implementation task if the current project convention already
    has a suitable report location; otherwise evidence remains in the phase
    report and tests. This plan itself does not authorize another artifact.
  - Concrete extension points for T2–T8 and a list of contracts that must remain
    byte/shape compatible where the spec requires it.
- Dependencies:
  - Gate 1 approved; no implementation dependency.
  - Must precede T2–T8.
  - `execute-agent` must reread the registries and relevant skills before acting.
- Expected files/modules:
  - Read: `db/schema.sql`, `app/domain/`, `app/persistence/`,
    `uc_bib_solv/webapp_java/python-backend/routes/analysis.py`,
    `causas.py`, `process_modeling.py`, corresponding services/repositories,
    `webapp/js/api/`, `js/core/`, `js/components/`, `js/views/` and tests.
  - No new specialized directory or BU/MACBU file.
- Verification:
  - Every current BPM/causal contract named by FR-06/FR-07 has an owner and a
    regression check.
  - A review confirms the methodology artifacts are included explicitly and are
    not treated as derived UI text.
  - A negative search confirms no proposed product object/table is named BU or
    MACBU.
- Initial status: `pending` (blocked until Gate 2 approval for execution).
- Status: `completed`

### T2. Contrato de detalle JSON/JSONB generalista por bloque/nodo

- Objective:
  - Define and implement, using the existing persistence mechanism, a common
    detail envelope for blocks/nodes with `family`, `schema_version`, `data`,
    `source` and `provenance`, while keeping BPM and causal relationships in
    their existing relational/graph structures.
- Inputs:
  - T1 compatibility matrix.
  - Spec FR-01, FR-02, FR-03, FR-11 and AC-01, AC-02, AC-03, AC-14.
  - Existing `pm_process_node_metadata.metadata`, BPM repositories and
    `db/schema.sql`.
  - `domain-logic` and `data-model-management` constraints.
- Actions:
  - Define validation/mapping rules for stable owner identity, context type,
    family, schema version, data, source and provenance. Preserve unknown
    extensions without turning each key into a column or entity.
  - Reuse the current node metadata path and repository conventions. If an
    existing general-purpose mechanism lacks a required capability, document the
    gap and plan the smallest general extension in the same mechanism; do not
    add a BU/MACBU table, model, repository or bounded context.
  - Keep process/version/node/transition identity and structural relations
    relational. Keep graphical coordinates out of the semantic contract.
  - Define compatibility behavior for legacy metadata, missing optional fields,
    unknown families and schema-version evolution without silently changing
    historical references.
  - Define transaction and error behavior for create/update/read and malformed
    JSON/JSONB payloads.
- Outputs:
  - Generalist domain contract/value objects or validators where required.
  - Persistence mapping/repository extension and idempotent schema adjustment
    only if T1 proves it is necessary; no concrete new specialized table is
    authorized by this plan.
  - Stable read/write payload contract and compatibility tests.
- Dependencies:
  - T1; `domain-logic`, `data-model-management`.
  - Gate 2 approval before any code or DDL is changed.
- Expected files/modules:
  - `app/domain/` existing capability modules or the closest existing general
    capability boundary; no domain imports from Flask/SQL/UI.
  - `app/persistence/` existing BPM/node metadata repositories and mappers.
  - `db/schema.sql` only for a general, justified, backward-compatible change.
  - Existing backend repository/service paths only where needed to expose the
    contract.
- Verification:
  - Persist and reload a node detail containing all envelope fields and an
    unknown extension; identity and BPM relations remain intact.
  - Verify legacy metadata remains readable and no table/model/repository name
    references BU/MACBU or a fixture-only concept.
  - Verify relationships are reconstructed without HTML/SVG/CSS/coordinates.
  - Verify malformed payloads fail with stable functional errors and no partial
    write.
- Initial status: `pending` (depends on T1 and Gate 2).
- Status: `completed`

### T3. Contexto estructurado/RAG, procedencia y separación semántica

- Objective:
  - Build a reconstructible read context shared by technical UI consumers and
    future RAG consumers, separating declarations, execution facts and evidence
    without replacing existing BPM/causal sources of truth.
- Inputs:
  - T1 compatibility matrix and T2 generalist detail contract.
  - Spec FR-04, FR-05, FR-06, FR-07, FR-08, FR-09 and AC-04, AC-05, AC-06,
    AC-08, AC-09, AC-14.
  - Existing causal detail/evidence repositories, BPM queries and methodology
    artifacts identified in T1.
  - Fixture categories only as examples of possible facts/evidence, not product
    entities.
- Actions:
  - Define a stable read projection containing process/version/node identity,
    BPM relations, general detail, methodology artifacts, declarations, facts,
    evidences, links and provenance.
  - Define filters/anchors for process, version, node, family, analysis,
    contract, incident, execution and source when identifiers exist.
  - Preserve declaration version and source separately from fact timestamp,
    execution/interval, quality and origin. Preserve evidence references to the
    fact, evaluation or decision it supports.
  - Include template, execution structure, prompt, consignas and instructions
    with their version/tracing; keep declarative text as text and never infer a
    formula from it.
  - Define behavior for absent optional identifiers and for evidence/fact types
    that the fixture mentions but the current contract cannot represent. Record
    the gap at the general contract level rather than creating a fixture model.
  - Ensure technical and RAG outputs are two projections of the same knowledge,
    not competing sources of truth.
- Outputs:
  - Context read contract, use-case/service boundary and provenance rules.
  - General read/query result suitable for API and UI consumption.
  - Tests proving that facts do not overwrite declarations and evidence remains
    traceable.
- Dependencies:
  - T1 and T2; must precede route/UI exposure in T4/T5.
  - `domain-logic` for semantic separation and invariants.
- Expected files/modules:
  - `app/domain/` context contracts/use cases/interfaces.
  - `app/persistence/` composition queries and mappings using existing
    repositories.
  - `python-backend/services/` application orchestration only; no UI rules.
  - No external RAG index, external AI connector or fixture-specific model.
- Verification:
  - A context query for a version/filter contains BPM, detail, methodology,
    facts/evidences, relations and provenance in a non-visual structure.
  - Saving a fact leaves the declaration unchanged; evidence points to its
    supported fact/evaluation/decision where available.
  - A causal analysis with multiple hypotheses keeps manual conclusion and
    decision metadata and never applies an undeclared `AND`/`OR` rule.
  - The same fixture data can be consumed by a technical projection and a RAG
    projection without semantic divergence.
- Initial status: `pending` (depends on T2 and Gate 2).
- Status: `completed`

### T4. Integración backend, dominio, repositorios y rutas HTTP

- Objective:
  - Expose the generalist context and detail operations through the existing
    Flask architecture while preserving causal/BPM API contracts and domain
    boundaries.
- Inputs:
  - T1 compatibility matrix, T2 detail contract and T3 context contract.
  - Spec FR-07, FR-09, FR-11, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07,
    AC-08, AC-09, AC-11, AC-14.
  - Existing `routes/analysis.py`, `routes/causas.py`,
    `routes/process_modeling.py`, services, repositories and HTTP utilities.
- Actions:
  - Extend existing blueprints or the already registered equivalent routes;
    do not create a second Flask application or an ad hoc API family.
  - Add service orchestration for context retrieval, detail read/write,
    declaration/fact/evidence operations and causal/BPM links using domain
    use cases and injected repository interfaces.
  - Keep routes responsible for HTTP adaptation, status codes, envelope and
    safe error messages; keep SQL out of routes/services and invariants out of
    the UI.
  - Preserve current causal endpoints, states, payloads, evidence links,
    reopens, branch decisions and historical BPM references.
  - Define authorization/filter propagation according to existing permission
    behavior without exposing secrets or internal traces.
  - Verify version publication/creation does not silently remap historical
    analysis, contract, node, evidence or methodology references.
- Outputs:
  - Backward-compatible Flask routes, application services, domain interfaces,
    repository implementations and mapping changes.
  - Stable 400/404/409/5xx behavior and documented request/response fixtures in
    tests; no endpoint that persists a calculated KPI.
- Dependencies:
  - T1–T3; Gate 2 approval.
  - PostgreSQL and current test/bootstrap setup for integration verification.
- Expected files/modules:
  - `uc_bib_solv/webapp_java/python-backend/routes/analysis.py`,
    `causas.py`, `process_modeling.py` or equivalent registered route module.
  - `uc_bib_solv/webapp_java/python-backend/services/` existing services.
  - `app/domain/` and `app/persistence/` existing capability boundaries.
  - `db/schema.sql` only if T2/T3 prove a general backward-compatible schema
    adjustment is required.
- Verification:
  - API tests cover context/detail success, malformed payloads, missing identity,
    filters, version references and safe errors.
  - Existing causal/BPM API regression tests pass with unchanged envelopes,
    states and relations.
  - Static/import checks confirm domain has no Flask, SQL, PostgreSQL, UI,
    Dash, Dataiku or external API dependency.
  - A diff review confirms no specialized BU/MACBU persistence artifact.
- Initial status: `pending` (depends on T1–T3 and Gate 2).
- Status: `completed`

### T5. UI de edición, consulta y copia sin romper árboles BPM/causales

- Objective:
  - Provide a coherent SPA workflow for selecting a context, editing and
    consulting detail, facts and evidence, copying structured context, and
    reading methodology/template/prompt/consignas without putting business rules
    in JavaScript or breaking tree/BPM navigation.
- Inputs:
  - T1 compatibility inventory and T4 API contracts.
  - Spec FR-05, FR-06, FR-07, FR-08, FR-12 and AC-05, AC-06, AC-07, AC-08,
    AC-09, AC-11, AC-12, AC-14.
  - Existing router, shared state, API clients, causal tree views/components,
    process modeling views/components and CSS conventions.
  - `frontend-design` constraints and current HTML/CSS/JS stack.
- Actions:
  - Extend existing `js/api/`, `js/core/`, `js/components/` and `js/views/`
    modules; reuse the current router/state patterns and avoid a parallel app.
  - Implement context selection, loading/empty/error/saved states, detail
    editing/consultation, declaration/fact/evidence presentation, provenance
    visibility and copy-to-clipboard/manual export behavior.
  - Expose template, common prompt, execution structure, instructions and
    consignas as readable/copyable Markdown. Do not send content to an external
    AI service.
  - Preserve BPM tree hierarchy, causal tree expansion, selections,
    breadcrumbs, historical references and explicit causal decisions. UI
    validation may improve feedback but cannot replace backend/domain rules.
  - Ensure UI displays the same semantic identifiers and provenance as the
    context endpoint and does not derive meaning from DOM order, SVG, CSS or
    coordinates.
  - Add accessible labels, keyboard operation, focus behavior and visible
    feedback for copy/error/empty/loading states.
- Outputs:
  - SPA changes under the existing `webapp/js/...` and CSS modules as required.
  - UI tests and stable selectors/fixtures for context, copy, methodology and
    regression flows.
- Dependencies:
  - T4 API contracts; `frontend-design`; Gate 2 approval.
  - Existing browser/E2E setup where available.
- Expected files/modules:
  - `uc_bib_solv/webapp_java/webapp/js/api/`
  - `uc_bib_solv/webapp_java/webapp/js/core/`
  - `uc_bib_solv/webapp_java/webapp/js/components/`
  - `uc_bib_solv/webapp_java/webapp/js/views/`
  - Existing `css/` files only when needed; no Dash pages/callbacks.
- Verification:
  - UI can load, edit, consult and copy context and can read Markdown
    methodology without external network calls.
  - Existing BPM and causal tree navigation/expansion/regression flows remain
    functional, including empty/loading/error states.
  - UI source contains no KPI calculation, causal conclusion rule, SQL or
    invariant that belongs to domain/backend.
  - Playwright or equivalent browser checks confirm copy content includes stable
    identifiers and provenance, not only rendered labels.
- Initial status: `pending` (depends on T4 and Gate 2).
- Status: `completed`

### T6. Endpoints KPI bajo demanda sin persistencia

- Objective:
  - Expose only the KPI calculations explicitly supported by the general
    contract as on-demand responses with reproducible inputs/version/provenance,
    without persisting metrics or changing declaration source data.
- Inputs:
  - T1 compatibility inventory, T3 context/provenance contract and T4 service
    boundaries.
  - Spec FR-08, FR-09, AC-09, AC-10, AC-11, AC-14.
  - Fixture KPI descriptions only as coverage examples; exact future source
    catalogs remain non-blocking questions from the spec.
- Actions:
  - Define allowed request inputs, explicit process/version/context filters and
    response provenance using existing HTTP conventions.
  - Keep declarative KPI fields distinct from calculated values. Reject or
    leave unsupported formulas as declarative text rather than evaluating them
    implicitly.
  - Calculate in a service/domain use case through explicit inputs; return
    result and reproduction metadata in the response.
  - Ensure route/service transaction behavior cannot insert KPI rows, snapshots,
    cached metric models or overwrite source declarations.
  - Add authorization and validation consistent with existing APIs, without
    exposing source secrets or internal stack traces.
- Outputs:
  - One or more documented on-demand KPI endpoints only where the general
    contract has sufficient inputs; unsupported fixture KPI gaps are recorded,
    not guessed.
  - Tests and a post-request persistence inspection proving non-persistence.
- Dependencies:
  - T3 and T4; no dependency on external Level 1/2/PI/Databricks connectors.
  - Gate 2 approval.
- Expected files/modules:
  - Existing `python-backend/routes/` and `services/` modules.
  - `app/domain/` calculation use case/interfaces only when reusable rules are
    defined; `app/persistence/` read repositories only.
  - No KPI table, calculated snapshot schema or specialized fixture model.
- Verification:
  - Endpoint returns a calculation with inputs, version and provenance.
  - Before/after database inspection shows no inserted metric/KPI/snapshot and
    unchanged declaration source.
  - Repeating the same request with the same inputs/version is reproducible
    within the contract's stated precision.
  - Declarative text can start a human analysis without a DSL or automatic
    `alcanzado`/`no alcanzado` persistence.
- Initial status: `pending` (depends on T3/T4 and Gate 2).
- Status: `completed`

### T7. Seed/carga reproducible del fixture BU para cobertura y gap discovery

- Objective:
  - Exercise the generalist contract with the full BU fixture vocabulary and
    produce explicit coverage/gap evidence without turning BU/MACBU into a
    product model.
- Inputs:
  - T2–T6 contracts and implemented endpoints/UI.
  - Entire `requeriments_spec_driven_development/requerimiento_12/proceso_BU_estructurado.md`.
  - Spec FR-01, FR-03, FR-04, FR-05, FR-09, FR-10, AC-01, AC-03, AC-04,
    AC-05, AC-10, AC-13, AC-14.
- Actions:
  - Resolve and assert the exact target BPM version
    `886ffe83-5235-4eb8-8c1d-528041518617`; fail the seed if it is absent or if
    the operation would silently create or remap another version.
  - Define and implement, through the existing generic process-modeling
    contracts, a deterministic fixture load/reseed under `scripts/` (prefer
    extending an existing generic process seed; add a req12 helper there only
    when extension is not safe). The load must be repeatable from a clean
    fixture-owned state and emit the target version, identifiers and counts as
    machine-readable evidence.
  - Map the fixture's process, blocks, stages, operations and stocks to
    generalist BPM nodes; create their structural relations with the existing
    node/transition/relationship mechanisms. Represent each detected
    machine/equipment/resource in the existing BPM meaning (resource
    association or generalist node where the current contract requires it),
    and include it in the persisted breakdown rather than leaving it only in
    prose.
  - Persist a generalist JSON/JSONB detail document for every loaded node,
    including the common envelope (`family`, `schema_version`, `data`,
    `source/provenance`) and a stable reference to the fixture section/source.
    Do not promote fixture keys into columns or specialized entities.
  - Load methodology/context through the existing versioned contracts for
    template, execution structure, prompt, consignas, instructions,
    declarations, execution facts and evidences. Link them to the target
    version/node and preserve their provenance; do not create BU/MACBU
    methodology entities.
  - Define cleanup, idempotency and reseed behavior: identify only fixture-owned
    rows by the target version plus deterministic fixture provenance/seed
    revision and stable external keys (a `TEST_` prefix is only an identifier,
    never a model). Remove child records in dependency-safe order, preserve the
    process/version and unrelated/user-authored rows, and provide a dry-run
    count. Run cleanup/reseed transactionally or with an equivalent rollback
    guarantee, and document expected counts before and after reseed.
  - Make repeated loads upsert the same generic identities, preserve IDs and
    produce the same final projection. A failed load must roll back its own
    writes, report created/updated/skipped/deleted counts, and leave unrelated
    target-version data unchanged.
  - Check coverage for identities, aliases, machines/resources, blocks,
    relations, execution facts, inspections, defects, stops, decisions,
    materials, tags, recipes, interleaving, source/version/quality and KPI
    descriptions.
  - For every unrepresentable or underspecified element, register a gap with
    fixture section, generic contract affected, impact and proposed follow-up
    in `proceso_BU_estructurado.md`, `nc-log.md`, or the existing fixture gap
    artifact. A gap must remain visible in the evidence package; it must not be
    silently dropped or resolved by adding a BU/MACBU model.
  - Verify that a second process with different families can use the same
    contract and that fixture names do not leak into product-wide invariants.
  - Verify that external source mentions remain provenance placeholders only;
    no connector or ingestion is implemented.
- Outputs:
  - Reproducible seed/load helper and documented cleanup/reseed commands under
    the existing `scripts/` convention, targeting only
    `886ffe83-5235-4eb8-8c1d-528041518617`.
  - Fixture-driven coverage/gap report under the existing test conventions,
    containing the target version, loaded node/relation/metadata/resource
    counts, gap IDs and exact commands used. Use the current
    `tests/req12_fixture_coverage.md` rather than creating an ad hoc product
    directory.
  - No BU/MACBU schema or specialized implementation artifact.
- Dependencies:
  - T2–T6; must run after Gate 2 approval and before final verification T8.
  - Any gap that changes FR/AC, module placement, or execution order reopens
    the amendment/spec gate instead of being silently resolved in T7.
- Expected files/modules:
  - Existing `tests/unit/`, `tests/integration/`, `tests/e2e/` or current fixture
    locations.
  - Existing generic API/domain/persistence modules only.
  - No new BU/MACBU model path.
- Verification:
  - AC-13 evidence states explicitly that BU/MACBU is fixture coverage/gap
    discovery, and every gap is classified as generic contract/configuration,
    source integration future work, or non-blocking terminology.
  - Static review finds no BU/MACBU table, column, domain entity, repository,
    bounded context or universal rule.
  - The same tests pass with at least one non-BU family fixture or synthetic
    generic family.
  - KPI examples do not create persisted metrics.
  - Seed evidence proves the exact target version contains the expected
    generalist nodes, relations, resource/machine references and non-empty
    JSON/JSONB detail for every loaded node; a second run is idempotent and
    does not duplicate fixture-owned rows.
- Initial status: `pending` (depends on T2–T6 and Gate 2).
- Status: `completed` (reentrada correctiva ejecutada; Gate 3 pendiente).

#### T7/T8 execution evidence — 2026-08-01 (actualizada por intento 2 de NC-002)

- `scripts/seed_req12_bu_fixture.py` valida y carga únicamente la versión BPM
  `886ffe83-5235-4eb8-8c1d-528041518617`; falla si no existe o no está en
  `draft`, no crea versiones y no remapea otra UUID.
- Comando reproducible: `python scripts/seed_req12_bu_fixture.py --json`.
  Dry-run: `python scripts/seed_req12_bu_fixture.py --dry-run --json`.
- La evidencia previa del agente decía runtime bloqueado/no acreditado; fue
  superada por la verificación runtime real posterior a la corrección:
  PostgreSQL activo y `python3 scripts/seed_req12_bu_fixture.py --json`
  terminó con exit `0` para el target exacto
  `886ffe83-5235-4eb8-8c1d-528041518617`. Carga: `16 nodes/15
  transitions/14 resources/4 gaps`; `description_evidence`: `operations13`,
  `with_description13`, `without_description0`; después:
  `nodes16/transitions15/metadata16/context31`.
- `scripts/seed_req12_bu_fixture.py` consume el `node_id` devuelto por
  `RETURNING` de metadata. Verificación focalizada: 8 pruebas unitarias OK y
  `py_compile` OK.
- Carga representativa: 16 nodos generalistas, 15 relaciones, 16 detalles con
  envelope `family/schema_version/data/source/provenance`, 14 recursos,
  metodología/contexto, hechos/evidencias y 4 gaps explícitos.
- Persistencia/API: GET exacta de la versión objetivo HTTP 200, con
  `data.nodes 18`, `operations13`, `descriptions13/13` y
  `process.process_description` funcional. Contexto SQL: `29 declarations + 1
  evidence + 1 fact` y `13 operation_contract records`.
- UI: Playwright verificó la URL exacta
  `http://127.0.0.1:8050/#/modelado-procesos?version_id=886ffe83-5235-4eb8-8c1d-528041518617`,
  con 13 tarjetas de operación y 13 descripciones no vacías, con texto
  funcional de dosificación.
- Tests unitarios/integración: 14 OK; tests de contrato del seed: 6 OK.
  E2E existente: 12 pass, 1 skip, 2 fallos preexistentes por selector
  ambiguo `Editar`; se deja como límite de regresión no relacionado con T7.
- Esquema: la instancia local inicialmente carecía de `pm_context_record`;
  se ejecutó el inicializador idempotente existente `python db/init_db.py`,
  sin reset ni DDL específico de BU/MACBU.
- NC-001..NC-005 quedan cerradas únicamente por validación humana explícita.
  NC-006 permanece `open`, con reentrada `execute-agent`; Gate 3 sigue
  pendiente y el plan queda en `en_correccion`.

### T8. Pruebas, regresión API/UI y validación final

- Objective:
  - Produce the evidence package for AC-01..AC-14, verify backward
    compatibility, classify environment limits and prepare Gate 3 without
    auto-closing the requirement.
- Inputs:
  - Completed T1–T7 implementation and reports.
  - `spec.md`, compatibility matrix, fixture gap report and existing test suite.
  - Current Playwright configuration/artifact conventions and registered UI
    validation agents when available.
- Actions:
  - Run domain unit tests for envelope validation, declaration/fact/evidence
    separation, provenance, causal invariants, manual conclusions and KPI
    non-persistence rules.
  - Run PostgreSQL persistence/integration tests for legacy BPM/causal data,
    metadata round-trip, context reconstruction, version references, facts and
    evidence. Confirm transaction rollback and no destructive changes.
  - Run API tests for new context/detail/KPI contracts and all current
    analysis/causal/process-modeling routes, including status, envelopes and
    error behavior.
  - Run UI regression/E2E for BPM trees, causal trees, context consultation,
    Markdown copy, loading/empty/error states and absence of external AI calls.
    Use Flask + JavaScript patterns; do not apply Dash-specific selectors,
    iframes or login assumptions.
  - Run the reproducible cleanup/reseed/load sequence for the exact BPM
    version `886ffe83-5235-4eb8-8c1d-528041518617`; capture command, exit code,
    target version and before/after counts in the Gate 3 evidence package.
  - Run persistence/integration assertions that the target version contains
    the fixture-owned generalist nodes, structural relations, detected
    machine/resource breakdown and one valid JSON/JSONB detail envelope per
    loaded node. Repeat the seed and prove idempotency and preservation of
    unrelated target-version data.
  - Run API verification against the target version using the existing
    process-modeling version/context/detail routes. Evidence must identify the
    exact UUID and prove node/relationship counts, node details,
    machines/resources, methodology/context references and the linked gap
    artifact; a response for another version is not acceptable evidence.
  - Run UI verification against the existing SPA process-modeling surface for
    that same UUID. Capture the URL/route, rendered generalist breakdown,
    relationships, machine/resource entries, selected-node JSON detail and
    visible gap/evidence reference after reload. Use existing HTML/JavaScript
    selectors and artifact conventions; a static Markdown report alone is not
    a UI/API assertion.
  - Run fixture coverage tests and inspect the gap matrix.
  - Run static hygiene and architecture checks: domain imports, no secrets or
    stack traces in responses, no specialized BU/MACBU artifacts, no KPI writes,
    no unapproved files, no geometry as semantic persistence.
  - Record commands, outcomes, artifacts and environment limitations. A test
    unavailable because PostgreSQL/browser is absent is an explicit limitation,
    not a passing functional result.
  - Set requirement state to `implementado_pendiente_validacion` only after
    `execute-agent` reports implementation complete; leave Gate 3 pending.
- Outputs:
  - Unit/integration/API/UI evidence, AC matrix with links to tests/results,
    regression report, fixture gap report, hygiene report and Gate 3 package.
  - No automatic transition to `done` and no automatic closure of NCs.
- Dependencies:
  - T1–T7 completed after this correction; Gate 2 status is `approved` for
    this exact corrected plan. Until then T8 remains pending and cannot
    authorize implementation.
  - `execute-agent` authors implementation; UI validation agents may execute
    their registered phases in isolated sessions when available.
  - Gate 3 human review is mandatory after this task.
- Expected files/modules:
  - Existing `app/domain/**/tests/`, `tests/unit/`, `tests/integration/`,
    `tests/e2e/`, `scripts/` and the current
    `tests/req12_fixture_coverage.md`; no ad hoc product directory.
  - `.playwright-artifacts/test-results/<timestamp>/` for generated evidence,
    excluded from product source unless current convention says otherwise.
  - No changes to README/context/spec are included in this plan unless a
    separate documentation phase is authorized after Gate 3.
- Verification:
  - All AC-01..AC-14 have direct evidence in the traceability matrix below,
    including exact-version seed, persistence, API and UI evidence for NC-001.
  - Existing BPM and causal regression suites preserve contracts and historical
    references; any pre-existing failure is separated from new regressions.
  - Full diff confirms layer separation and absence of specialized models.
  - Gate 3 checklist is complete enough for human conformance validation.
- Initial status: `pending` (depends on T1–T7 and Gate 2).
- Status: `completed` (evidencia ejecutada; 2 fallos E2E preexistentes quedan
  clasificados como límite de regresión y Gate 3 sigue pendiente).

---

## Acceptance Criteria Traceability

| AC | Covered by | Verification evidence required |
| --- | --- | --- |
| AC-01 | T1, T2, T7, T8 | Compatibility/schema diff review; negative search for BU/MACBU artifacts; exact-version seed and second generic-family fixture test. |
| AC-02 | T1, T2, T3, T4, T7, T8 | BPM inventory plus exact-version persistence/API/UI reconstruction from relational structures; no HTML/SVG/CSS/coordinate dependency. |
| AC-03 | T2, T4, T7, T8 | JSON/JSONB round-trip with family, schema version, data and provenance for every loaded node; no table per family; fixture coverage. |
| AC-04 | T3, T4, T7, T8 | Persistence test proving declaration, execution fact and evidence remain distinct and fact writes do not overwrite declarations. |
| AC-05 | T3, T4, T5, T7, T8 | Context endpoint/query and UI test for the exact target version containing BPM, detail, methodology, relations, facts/evidence and provenance. |
| AC-06 | T1, T3, T5, T8 | Methodology inventory plus API/UI read/copy test for template, execution structure, prompt, consignas and instructions with version/tracing. |
| AC-07 | T1, T4, T5, T8 | Existing causal/BPM API and UI regression suite covering contracts, analyses, templates, causes, hypotheses, evaluations, reopenings and evidence. |
| AC-08 | T1, T3, T4, T5, T8 | Multiple-hypothesis test preserving manual evaluation/conclusion/decision metadata and negative check for undeclared `AND`/`OR` inference. |
| AC-09 | T3, T4, T6, T8 | Human analysis can start from declarative text; no DSL required; database inspection confirms no automatic reached/not-reached persistence. |
| AC-10 | T3, T6, T7, T8 | KPI endpoint test with explicit inputs/version/provenance; before/after persistence inspection proves no metric, KPI or snapshot write during fixture reseed. |
| AC-11 | T1, T4, T5, T6, T8 | File/module ownership review; domain import check; UI/API tests proving rules remain in backend/domain and layers use FR-11 locations. |
| AC-12 | T5, T8 | Browser test reads and copies Markdown methodology without outbound AI request; accessibility and feedback states checked. |
| AC-13 | T1, T7, T8 | Exact-version fixture load/reseed, coverage/gap matrix and API/UI evidence explicitly label BU/MACBU as test-only; static review proves no specialized schema/model. |
| AC-14 | T1, T3, T4, T8 | Versioning regression creates/publishes a new BPM version and confirms historical analysis, methodology, contract, node and evidence references are unchanged. |

No AC is left unowned. T8 is the final evidence aggregator, not a substitute
for the layer-specific checks in T1–T7.

## Historical execute-agent progress and evidence — 2026-08-01

The following evidence predates NC-001 and does not close the corrected plan
path. It is retained for traceability only; the exact-version seed, persistence
assertions and API/UI evidence required below remain pending re-execution after
Gate 2 approval.

- T1 completed: inventory confirmed `pm_process_node_metadata` as the existing
  general JSONB detail path, relational BPM tables as the source of truth, and
  causal contracts/templates/results under the existing analysis modules.
- T2 completed: added the domain `ContextDetail` envelope and preserved legacy
  metadata; the generic `pm_context_record` DDL separates declarations, facts
  and evidence without fixture-specific structures.
- T3 completed: added the structured context projection with BPM nodes,
  transitions, details, records, methodology references, filters and
  provenance. Facts carry `execution_id`; evidence carries explicit `supports`.
- T4 completed: extended the existing process-modeling blueprint/service/repository
  with context read/write and KPI-on-demand routes. No second Flask app or API
  family was introduced.
- T5 completed: added the existing SPA router/API/view surface for loading and
  copying structured context with visible loading, error and status feedback.
- T6 completed: added `POST /api/process-modeling/kpis`; calculation is
  in-memory/on-demand and returns inputs, version and provenance. No KPI write
  path exists.
- T7 pre-NC result: added `tests/req12_fixture_coverage.md` with generic
  coverage and explicit gaps, but no reproducible load into the target BPM
  version. This is the omission recorded as NC-001.
- T8 pre-NC result: targeted domain/API-compatible tests, full unit suite,
  Python compilation, JavaScript syntax checks and hygiene scan ran, but the
  exact-version persistence/API/UI evidence was not produced. Gate 3 remains
  blocked by NC-001.

### Verification evidence

- `python3 -m unittest tests.unit.test_req12_context tests.unit.test_process_modeling_validation tests.unit.test_process_modeling_service tests.unit.test_process_modeling_api` → 9 passed.
- `python3 -m unittest discover -s tests/unit -p 'test_*.py'` → 47 passed.
- `python3 -m compileall -q app uc_bib_solv/webapp_java/python-backend` → passed.
- `node --check` on the new/modified context JavaScript modules → passed.
- Required debug scan → no production debug artifacts; the literal `Blueprint`
  identifier is a grep false positive for `print(` and is not a debug call.
- Verificación runtime posterior a la corrección: PostgreSQL activo;
  `python3 scripts/seed_req12_bu_fixture.py --json` exit `0`; target exacto
  `886ffe83-5235-4eb8-8c1d-528041518617`; `16 nodes/15 transitions/14
  resources/4 gaps`; `description_evidence operations13,
  with_description13, without_description0`; después
  `nodes16/transitions15/metadata16/context31`; API GET exacta HTTP 200,
  `data.nodes 18`, `operations13`, `descriptions13/13`,
  `process.process_description` funcional; contexto SQL `29 declarations + 1
  evidence + 1 fact` y `13 operation_contract records`; Playwright exacto con
  13 tarjetas y 13 descripciones no vacías con texto funcional de
  dosificación.

### Gaps and limits

- The generic DDL is prepared in `db/schema.sql` but was not applied to
  PostgreSQL in this phase; deployment belongs to the registered data-model
  deployment phase.
- La webapp no estaba disponible inicialmente y fue levantada temporalmente
  para la verificación runtime posterior; esa limitación inicial fue superada
  por la evidencia positiva de API/UI descrita arriba. La evidencia técnica no
  sustituye la validación humana de Gate 3.
- Fixture mentions of external PLC/PI/AVEVA/Nivel 1/2 sources, exact KPI source
  catalogs, and underspecified inspection/marking signals remain explicit
  generic-contract gaps.

### Implementation state

`en_correccion` for the corrected implementation evidence. NC-001..NC-005
are `resolved` by explicit human validation; NC-006 remains `open`, no push
was performed, Gate 3 sigue pendiente y the requirement was not marked `done`.

---

## Verification Plan

### Automatic / Command-Line Verification

- Use the existing Python unit and integration commands from `README.md` and
  the current test layout; add only targeted commands required by T1–T8.
- Run domain tests without PostgreSQL, Flask, UI, network or external source
  imports where the domain-logic skill requires isolation.
- Run PostgreSQL integration tests against an isolated/test database or the
  project-approved local setup; inspect before/after rows for no KPI writes and
  no declaration overwrite.
- Run API tests against Flask with deterministic fixtures and verify envelopes,
  status codes, rollback and non-leakage of internal traces.
- Run the req12 fixture seed/reseed against the exact BPM UUID
  `886ffe83-5235-4eb8-8c1d-528041518617`; record the deterministic cleanup,
  idempotency result, node/relation/resource/metadata counts and machine-readable
  evidence under the existing `scripts/`, `tests/` and artifact conventions.
- Query that same UUID through the existing version, context and node-detail
  API routes and assert the loaded generalist nodes, relations, machine/resource
  breakdown, JSON/JSONB envelope and linked gap record. Then exercise the
  existing SPA route with the same UUID and capture rendered node detail and
  relationship evidence after reload.
- Run JavaScript syntax/unit checks and Playwright against the Flask-served SPA
  when configured. Adapt any UI agent patterns to HTML/CSS/JavaScript; never
  import Dash-specific assumptions.
- Run static checks for:
  - domain imports of Flask/SQL/PostgreSQL/UI/Dash/Dataiku/external clients;
  - names and schema changes containing BU/MACBU or fixture-only concepts;
  - writes to calculated KPI/metric/snapshot storage;
  - accidental coordinate/layout persistence;
  - secrets, `print(`, `# DEBUG`, `# FIXME` and `breakpoint()` in production
    files, following repository hygiene conventions.

### Manual Verification

- Human reviews the compatibility matrix and confirms no causal/BPM semantic
  regression.
- Human reviews generic JSON/JSONB envelope and provenance behavior with a
  non-BU example.
- Human opens the SPA, navigates BPM and causal trees, consults/edits/copies
  context and methodology, and checks empty/loading/error states.
- Human verifies that a declarative contract starts a human analysis without a
  formula and that no automatic causal conclusion appears.
- Human reviews the full fixture gap report and confirms that nonrepresentable
  items are gaps, not specialized product models.
- Human validates the implementation at Gate 3; automated tests alone never
  transition the requirement to `done`.

---

## Non-Conformity Loop

### Policy

- If Gate 3 or any delegated validation detects a mismatch, keep the global
  state out of `done` and register an NC with evidence, owner, attempt number,
  and root cause.
- Classify every NC as exactly one of:
  - `spec`: the requirement is ambiguous, incomplete or incorrect;
  - `task_plan`: the approved plan omitted/misordered/misplaced required work;
  - `implementation`: code, schema, API, UI or tests do not conform to the
    approved spec and plan.
- Route correction as follows:
  - `spec` -> `requirements-agent` updates `spec.md`; return to Gate 1 and
    regenerate or amend this plan.
  - `task_plan` -> `plan-task-agent` updates this file; return to Gate 2.
  - `implementation` -> `execute-agent` corrects only the approved scope; rerun
    affected verification and return to Gate 3.
- Use the registered `nc-resolution-agent` for lifecycle registration and
  re-entry coordination when the workflow invokes it.
- Maximum two correction attempts without mandatory human escalation, following
  the project governance. An NC `open` or `in_correction` blocks `done`.
- A fixture gap is not automatically an NC: it becomes an NC only if the
  implementation contradicts the approved generic contract or hides the gap.

### Open Non-Conformities

#### NC-001 — resuelta por validación humana

- Root cause: `task_plan`.
- Current state: `resolved`.
- Required re-entry: this corrected plan must return to Gate 2; after human
  approval, `execute-agent` re-runs T7/T8 and then Gate 3 is repeated.
- Correction contract: load the fixture into BPM version
  `886ffe83-5235-4eb8-8c1d-528041518617` with generic nodes, relations,
  machine/resource references and JSON/JSONB detail; prove persistence/API/UI
  visibility; define cleanup/idempotency/reseed; and expose every gap in the
  fixture/gap artifact or `nc-log.md`.
- Closure evidence: exact-version seed output, before/after cleanup counts,
  idempotent second-run result, persistence assertions, API response evidence,
  UI evidence after reload and human Gate 3 validation. A static coverage
  report alone cannot close this NC.
- Specialized BU/MACBU tables, entities, routes, repositories or bounded
  contexts remain prohibited.

#### NC-002 — resuelta por validación humana

- Root cause: `implementation`.
- Current state: `resolved`.
- Required re-entry: `execute-agent`; after correction, repeat
  `validate-implementation` / Gate 3.
- Correction contract: verify the exact target version
  `886ffe83-5235-4eb8-8c1d-528041518617` through the existing persistence,
  API and SPA flow; ensure every operation has a non-empty persisted
  description, that the API projection preserves it, and that the card/flow
  or context panel renders it without replacing node semantics with UI text.
  Add or repair targeted tests/seed data only within the approved generic BPM
  contracts. Do not close NC-001, NC-002 or the requirement automatically.
- Closure evidence: PostgreSQL row/query evidence, exact-version API response,
  browser evidence at the supplied URL after reload, focused regression tests,
  and human Gate 3 validation. Unavailable services remain explicit
  limitations and cannot be reported as PASS.

#### NC-004 — resuelta por validación humana

- Root cause: `implementation`.
- Current state: `resolved`.
- Related NC: `NC-003`; this entry does not reset or close `NC-002`, whose
  two-attempt limit and mandatory human escalation remain in force.
- Required re-entry: `execute-agent`; after correction, repeat
  `validate-implementation` / Gate 3.
- Correction contract: in read-only mode, project the existing node
  `description` and JSONB metadata/context into visible sections for the
  functional description, objective, inputs, outputs, parameters, controls,
  and contracts/assignments when present. Do not require JSON editing and do
  not add BU/MACBU-specific models, routes, tables, or repositories.
  - Closure evidence: focused frontend/unit tests, exact-version API evidence
  proving the source payload, and Playwright evidence when the supplied runtime
  is available; NC-006 remains open until human Gate 3 validation.

#### NC-005 — resuelta por validación humana

- Root cause: `implementation`.
- Current state: `resolved`.
- Required re-entry: `execute-agent`; after correction, repeat
  `validate-implementation` / Gate 3.
- Correction contract: identify and use the existing canonical `proceso`,
  `maquina`, `contrato` and `contrato_maquina` models/repositories/API. Ensure
  the exact target version's process, one generic operation per functional
  activity, machines and contracts are persisted or carry explicit stable
  canonical IDs, and verify operation↔machine cardinality without textual-only
  JSONB links or BU/MACBU models. Preserve scoped idempotency and unrelated
  rows. Add integration/unit/API/UI evidence and SQL assertions for orphaned,
  duplicated and mismatched identities.
- Closure evidence: PostgreSQL queries with counts/IDs/FK joins for the exact
  UUID, repeatable seed output, API and SPA evidence at the supplied URL,
  focused regression tests, and human Gate 3 validation. This NC does not
  close NC-001..NC-004 or the requirement automatically.

#### NC-005 correction history

| Date | Agent/session | Action | Result |
|------|---------------|--------|--------|
| 2026-08-01 | `execute-agent`; delegated `019fbf22-02bb-77c3-b7b7-1814b7b54377`; execution `019fbf22-c37c-75b0-816c-a0e80d367b97`; `gpt-5.6-luna`, medium | Reused existing canonical tables/repos: deterministic `proceso`; one canonical `contrato` per generic BPM operation; canonical `maquina`; M:N `contrato_maquina`; explicit canonical IDs in BPM properties/context; scoped cleanup/idempotency; focused orphan/duplicate/text-only guards. | La verificación estática inicial se completó cuando PostgreSQL/API/UI no estaban disponibles; esa limitación queda superada por la evidencia runtime posterior de la fila siguiente. Corrección técnica completada; el cierre humano se registra en la fila del 2026-08-02. |
| 2026-08-01 | `execute-agent`; implementation `019fbf26-13a8-7211-93d4-e1dac9d76503`; second test correction `019fbf2a-c4ae-7a62-b877-2bb819899c49`; `gpt-5.6-luna`, medium | Evidence-only lifecycle update: seed executed twice against real PostgreSQL for exact version `886ffe83-5235-4eb8-8c1d-528041518617`; canonical process `id 2`, 6 contracts/operations, 14 machines, 13 `contrato_maquina` links, 0 duplicates/orphans, 6/6 operation descriptions; API, operational/catalog, idempotency, Python/Playwright, `py_compile` and `git diff --check` evidence recorded. | The previous runtime-blocked evidence is superseded. Evidencia técnica completa para NC-005; el cierre humano se registra en la fila del 2026-08-02. |
| 2026-08-02 | `programador_humano` | Cierre humano explícito de NC-005 sobre la evidencia técnica registrada. | NC-005 queda `resolved`; NC-006 queda abierta y mantiene Gate 3 pendiente. |

#### NC-006 — modelo/elemento canónico máquina

- Root cause: `implementation`.
- Current state: `open`.
- Required re-entry: `execute-agent`; después repetir `validate-implementation` / Gate 3.
- Scope: revisar y corregir identidad canónica, atributos y relaciones
  verificables del elemento máquina con proceso, operación, contrato, BPM y
  contexto, reutilizando los modelos, tablas, rutas y repositorios existentes.
- Evidence boundary: usar la evidencia existente como punto de partida, sin
  inventar evidencia runtime nueva ni afirmar verificaciones no ejecutadas.
- Prohibition: no crear tablas, entidades, rutas o repositorios BU/MACBU; el
  modelo debe permanecer generalista.
- Closure evidence: comprobaciones reproducibles de identidad, atributos,
  claves y relaciones cruzadas, consistencia de persistencia/API/contexto y
  validación humana Gate 3.
- NC-006 bloquea `done`; no existe todavía session id de corrección.

#### Historial de corrección de NC-001 en este plan

| Fecha | Autor | Acción | Resultado |
|-------|-------|--------|-----------|
| 2026-08-01 | `plan-task-agent` | Reentrada de planning: T7/T8 se endurecen con seed/carga determinista sobre `886ffe83-5235-4eb8-8c1d-528041518617`, contratos generalistas para nodos/operaciones/etapas/stocks/detalles/recursos/relaciones/metodología/contexto, limpieza acotada, idempotencia, registro de gaps y evidencia API/UI. | Plan corregido preparado para Gate 2; NC-001 permanece `in_correction` y abierta a validación. |

---

## Risks

- **Backward compatibility:** extending BPM, causal, template and HTTP
  contracts can break old payloads, states or historical references. T1 and T8
  require a baseline matrix and regression suite before closure.
- **Causal methodology drift:** context/RAG composition may accidentally omit,
  reinterpret or calculate a prompt, template, consigna or decision. T1/T3/T5
  require explicit versioned methodology artifacts and negative tests for
  undeclared rules.
- **RAG provenance:** a flattened text projection could lose identity,
  relations or source. T3 requires a structured projection with stable keys and
  explicit provenance shared with the technical UI.
- **Generalist JSONB evolution:** optional families/schema versions can become
  implicit specialized models or corrupt legacy metadata. T2 requires one
  common envelope, controlled extensions, round-trip tests and no per-family
  tables.
- **KPI non-persistence:** a service/cache or ORM shortcut could insert derived
  metrics or overwrite declarations. T6/T8 require database before/after
  inspection and no KPI model.
- **Fixture leakage:** BU/MACBU vocabulary can be mistaken for product scope.
  T7 requires a gap matrix, generic-family test and negative schema/model scan.
- **Unresolved future catalogs:** exact source, retention, permission and KPI
  taxonomies remain non-blocking only while no task needs to hard-code them; if
  they change placement/order/verification, reopen via amendment.
- **Layer boundary regression:** UI or routes may absorb business rules; domain
  may import infrastructure. T4/T5/T8 include import and responsibility checks.
- **Environment limitations:** PostgreSQL, Flask server or Chromium may be
  unavailable. Record the limitation and preserve equivalent unit/API evidence;
  do not mark an unavailable check as passed.
- **Version remapping:** adding a BPM version may silently change old causal
  links. T1/T4/T8 require immutable historical references and explicit version
  anchors.
- **Fixture reseed contamination:** broad cleanup could delete unrelated data in
  the target version or a non-idempotent seed could duplicate nodes. T7/T8
  require deterministic fixture-owned identifiers, scoped cleanup, rollback (or
  equivalent), before/after counts and a second-run idempotency assertion.
- **False coverage evidence:** a static fixture report or a response from a
  different version could appear to validate NC-001. T7/T8 require the exact
  UUID in seed output, persistence checks, API responses and UI evidence.

---

## Verification Checklist

- [x] `spec.md` is recorded as `spec_validada` and Gate 1 is approved.
- [ ] Gate 2 human approval explicitly authorizes `execute-agent`.
- [ ] T1 inventory and compatibility matrix completed.
- [ ] T2 generalist JSON/JSONB contract verified without specialized models.
- [ ] T3 structured context, RAG projection, provenance and semantic separation verified.
- [ ] T4 backend/domain/repository/route integration verified.
- [ ] T5 UI consultation/edit/copy and BPM/causal regression verified.
- [ ] T6 KPI endpoint verified as on-demand and non-persistent.
- [ ] T7 BU fixture coverage/gap discovery completed without product-model leakage.
- [ ] T8 unit, integration, API, regression and UI evidence collected.
- [ ] NC-001 exact-version seed/load/reseed evidence collected for
  `886ffe83-5235-4eb8-8c1d-528041518617`.
- [ ] NC-001 persistence, API and UI evidence verifies nodes, relations,
  machine/resources, JSON/JSONB details and visible gaps for that UUID.
- [ ] NC-001 cleanup is scoped, idempotent and preserves unrelated target-version
  data.
- [ ] NC-005 canonical process/operation/machine/contract identity and
  operation↔machine relations are persisted or explicitly keyed, with no
  orphaned, duplicated or textual-only links.
- [ ] All AC-01..AC-14 have evidence and no unexplained failure.
- [ ] Domain imports respect Clean Architecture boundaries.
- [ ] No secrets, internal traces, debug markers or destructive schema changes.
- [ ] No BU/MACBU specialized table, column, entity, repository or bounded context.
- [ ] No calculated KPI/metric/snapshot persisted.
- [ ] Gate 3 human validation performed.
- [ ] NC-006 is resolved after execute-agent correction and human Gate 3 validation.
- [ ] Requirement state reflects reality and is not auto-set to `done`.

---

## Closure Rule

Change the global requirement state to `done` only when:

- Gate 1 is approved (already evidenced in `spec.md`).
- Gate 2 status is `approved` for this exact plan.
- `execute-agent` completes T1–T8 or documents a human-approved non-applicable
  task without losing AC coverage.
- AC-01..AC-14 each have direct verification evidence.
- Backward compatibility, causal methodology, RAG provenance, JSONB
  generalization, KPI non-persistence and fixture gap policy are reviewed.
- Gate 3 is approved by the programmer after reviewing implementation, tests,
  UI behavior and environment limitations.
- NC-006 must be `resolved`; while it is `open`, correction evidence is not
  closed and the requirement cannot reach `done`.
- `traza_requerimiento.md` reflects the actual final state.

Until those conditions hold, post-execution status must be
`implementado_pendiente_validacion`, never `done`.

---

## Amendments

No type C amendment was created: this update is the NC-001 correction loop,
not a new functional requirement or a human-initiated scope amendment. The
correction is recorded in `## Non-Conformity Loop / Open Non-Conformities`, T7,
T8, the traceability matrix and the verification checklist. A later change that
adds or reorders work without changing FR/AC must be recorded as a type C plan
amendment, return to Gate 2, and be authored by `plan-task-agent`. A change to
FR/AC must update `spec.md` through `requirements-agent`, return to Gate 1 and
regenerate or adjust this plan only after human validation.
