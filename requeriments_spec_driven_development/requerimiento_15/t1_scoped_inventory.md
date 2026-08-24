# T1 — Scoped baseline inventory

Status: `completed_pending_human_review`
Requirement: `requerimiento_15`
Scope: `uc_bib_solv/`, its directly associated `tests/`, and read-only `db_management/schema.sql`.

This artifact records the state observed on 2026-08-17. It does not assert that any target module already exists.

## Deterministic scope counts

| Area | Observed inventory |
|---|---:|
| Target domains | 6: `causal_analysis`, `causal_tree`, `operational_modeling`, `process_modeling`, `agent_tools`, `platform` |
| Python source files under `uc_bib_solv` | 73 (excluding `__pycache__`) |
| JavaScript files under `uc_bib_solv/webapp/js` | 36 |
| CSS files under `uc_bib_solv/webapp/css` | 5 |
| Unit test files | 22 |
| Integration test files | 3 |
| E2E test files | 7 |
| Route declarations | 65 decorator registrations; 45 unique endpoint paths after aliases |
| Physical tables in `db_management/schema.sql` | 23 `CREATE TABLE IF NOT EXISTS` declarations |

## Attribution boundary

This inventory is a T1 observation only. It does not attribute any pre-existing
worktree modification, deletion, or untracked path to T1. The attribution
perimeter is limited to the four T1 artifacts in this directory; `db_management/schema.sql`
was read-only evidence and is outside the write perimeter. Reproduce the table
count with:

```bash
sed -nE 's/^[[:space:]]*CREATE TABLE IF NOT EXISTS[[:space:]]+([^ (]+).*/\1/p' db_management/schema.sql | wc -l
```

Expected result: `23`.

The six route modules are `analysis.py`, `causas.py`, `operational.py`, `process_modeling.py`, `bootstrap.py` and `health.py`. `backend_app.py` and `local_server.py` both register the route blueprints; this is a baseline duplication, not a T1 change.

## HTTP contract snapshot

All JSON route handlers use `uc_bib_solv.utils.http.ok`/`error` except where the route delegates through the same helper. Successful payloads are generally `{status: "ok", data: ...}`; bootstrap and health return the service payload through `ok`. Error mappings below are the observed mappings in the route layer and require contract snapshots in later migration phases.

### Platform

| Method | Path(s) | Inputs / behavior | Observed error behavior |
|---|---|---|---|
| GET | `/bootstrap`, `/api/bootstrap` | no parameters; `get_bootstrap_manifest()` | no route-level error mapping |
| GET | `/health`, `/api/health` | no parameters; `get_health_payload()` | no route-level error mapping |

### `causal_analysis`

| Method | Path | Inputs | Success / errors |
|---|---|---|---|
| GET | `/api/analyses` | query `limit` default `20`, `status`, `q` | `200`; `400` for `TypeError`/`ValueError` |
| GET | `/api/analysis-templates` | query `process_id`, converted to int | `200`; `400` for conversion/type errors |
| POST | `/api/analyses` | JSON body, default `{}` | `201`; `400` for type/value/key errors |
| GET | `/api/analyses/<int:analysis_id>` | path integer | `200` if found; `404` `Analisis no encontrado.` otherwise |
| PATCH | `/api/analyses/<int:analysis_id>` | JSON body, default `{}` | `200`; `400` for type/value errors |
| POST | `/api/analyses/<int:analysis_id>/results` | JSON body, default `{}` | `201`; `400` for type/value errors |

### `causal_tree`

| Method | Path | Inputs | Success / errors |
|---|---|---|---|
| GET | `/causas`, `/api/causas` | query `view`, `selected_cause_id`, `contract_id`, `zoom`; invalid numeric values fall back to `None`/`1.0` | `200` tree payload |
| GET | `/api/causas/detail` | query args forwarded to detail service | `200`; broad service exceptions are not caught here |
| GET | `/api/causas/<int:causa_id>` | path integer | `200` detail |
| GET | `/api/causas/<int:causa_id>/hipotesis` | path integer | `200` hypotheses |
| POST | `/api/causas` | JSON; `editor_mode=new_contract` selects contract-node path | `201`; broad exception mapped by `error` |
| PATCH | `/api/causas/<int:causa_id>` | JSON plus injected `causa_id` | `200`; broad exception mapped by `error` |
| DELETE | `/api/causas/<int:causa_id>` | path integer | `200`; `404` on exception |
| GET | `/api/causas/reusable/search` | query args | `200`; broad exception mapped by `error` |
| POST | `/api/causas/reusable/link` | JSON body | `201`; broad exception mapped by `error` |
| POST | `/api/causas/<int:causa_id>/hipotesis` | JSON plus injected `cause_id` | `201`; broad exception mapped by `error` |
| PATCH | `/api/hipotesis/<int:hipotesis_id>` | JSON plus injected `hypothesis_id` | `200`; broad exception mapped by `error` |
| GET | `/api/hipotesis/<int:hipotesis_id>/delete-preview` | path integer | `200`; `404` on exception |
| DELETE | `/api/hipotesis/<int:hipotesis_id>` | path integer | `200`; `404` on exception |

### `operational_modeling`

| Method | Path | Inputs / key behavior | Success / errors |
|---|---|---|---|
| GET | `/api/operational/catalog` | query `version_id` | `200`; `400` on `ValueError` |
| GET | `/api/operational/page/<page>` | path page, query args | `200`; `400` on `ValueError` |
| GET/POST | `/api/operational/processes` | GET query `status`; POST JSON | GET `200`; POST `201`, `400` on value error |
| PATCH/DELETE | `/api/operational/processes/<process_id>` | path plus JSON for PATCH | `200`; `400` on value error |
| GET/POST | `/api/operational/contracts` | GET query `process_id`/`processId`, `status`; POST JSON | GET `200`; POST `201`, `400` on value error |
| PATCH/POST/DELETE | `/api/operational/contracts/<contract_id>` and `/toggle` | path plus JSON where applicable | `200`/`400` per value error |
| GET/PUT | `/api/operational/contracts/<contract_id>/machines` | GET path; PUT JSON machine set | `200`; `400` on value error |
| GET/POST | `/api/operational/machines` | GET aliases `processId`, `legacy_process_id`, `process_id`, `contract_id`/`contractId`, `operation_id`/`operationId`, `process_version_id`/`processVersionId`, `status`, `bpm_process_id`; POST JSON | GET `200`; POST `201`; machine validation `400` with domain code |
| PATCH/DELETE | `/api/operational/machines/<machine_id>` | path plus JSON for PATCH | `200`; validation `400`; persistence fallback `409` for update |
| GET | `/api/operational/machines/<machine_id>/context` | query operation/process-version aliases | `200`; `400` on value error |
| PATCH | `/api/operational/operations/<operation_id>/stages` | JSON body | `200`; `404`/`400` domain errors; `409` persistence fallback |
| GET/POST | `/api/operational/machines/<machine_id>/configurations` | GET path; POST JSON validated with machine id | GET `200`; POST `201`; `400` on value error |

### `process_modeling`

| Method | Path family | Inputs | Success / errors |
|---|---|---|---|
| GET/POST | `/api/process-modeling/processes` | GET none; POST JSON | GET `200`; POST `201`; shared `_call` maps not-found `404`, domain/value `400`, fallback `409` |
| GET/POST | `/api/process-modeling/processes/<process_id>` and `/versions` | path; JSON for version creation | GET `200`; create `201`; shared mappings |
| GET/PATCH | `/api/process-modeling/versions/<version_id>` | GET optional `expand_node_id`; PATCH JSON | `200`; shared mappings |
| POST | `/api/process-modeling/versions/<version_id>/nodes` | JSON | `201`; shared mappings |
| PATCH/DELETE | `/api/process-modeling/nodes/<node_id>` | JSON for PATCH | `200`; shared mappings |
| GET/PATCH | `/api/process-modeling/nodes/<node_id>/metadata` | PATCH JSON `{metadata: ...}` | `200`; shared mappings |
| GET | `/api/process-modeling/operations/<operation_id>` | path | `200`; shared mappings |
| PATCH | `/api/process-modeling/operations/<operation_id>/stages` | JSON | `200`; shared mappings |
| GET | `/api/process-modeling/versions/<version_id>/context` | query `node_id`, `family`, `record_type` | `200`; shared mappings |
| POST | `/api/process-modeling/nodes/<node_id>/context-records` | JSON | `201`; shared mappings |
| POST | `/api/process-modeling/kpis` | JSON | `200`; shared mappings |
| POST/DELETE | `/api/process-modeling/versions/<version_id>/transitions`, `/api/process-modeling/transitions/<transition_id>` | JSON for create; path for delete | create `201`, delete `200`; shared mappings |
| POST | `/api/process-modeling/versions/<version_id>/validate` | no body required | `200`; shared mappings |

## Frontend consumers

The direct API consumers are:

- `webapp/js/api/analysis.js`: six analysis operations.
- `webapp/js/api/causas.js`: tree/detail/cause/hypothesis/reusable-node operations.
- `webapp/js/api/operational.js`: process, contract, machine, context, stages and configuration operations.
- `webapp/js/api/process-modeling.js`: process/version/node/metadata/context/KPI/transition/validation operations.
- `webapp/js/api/client.js`: bootstrap, operational catalog/page, and the legacy `/causas` fetch path.
- Views/components under `webapp/js/views/`, `webapp/js/components/`, `webapp/js/core/` consume these APIs; filenames are preserved as compatibility assets.

## Test and script consumers

Direct import/reference consumers found by AST/import and path search include:

- Domain/unit: `tests/test_graph_domain.py`, `tests/unit/test_graph_domain.py`, `test_machine_modeling_domain.py`, `test_process_modeling_validation.py`, `test_req12_context.py`, `test_agent_tools.py`.
- Legacy repository/service/API: `test_causa_detail_service.py`, `test_causas_service.py`, `test_causa_routes.py`, `test_process_modeling_api.py`, `test_process_modeling_service.py`, `test_graph_query_repo.py`, `test_machine_repo_json_null.py`, `test_req12_fixture_seed.py`, `test_req12_machine_projection.py`.
- Integration/smoke: `tests/integration/test_graph_db_integration.py`, `test_tree_db_integration.py`, `test_process_modeling_db_integration.py`, `tests/java_analysis_fixture.py`, `tests/smoke_test.py`.
- E2E/frontend: all seven files under `tests/e2e/`, especially `analysis-workflow.spec.js`, `process-modeling.spec.js`, and `req12-machine-context.spec.js`; frontend unit files under `tests/unit/*.test.mjs` and `test_causa_detalle_frontend.py`.
- Operational scripts referenced by the worktree include `scripts/check_postgres_pm.py`, `scripts/ensure_process_node_metadata.py`, `scripts/seed_process_modeling_hierarchical_test.py`, `scripts/seed_process_node_metadata.py`, and `scripts/cleanup_process_modeling_e2e.py`; these are observed consumers or fixtures and are not modified by T1.

## Current ownership observations

- HTTP ownership is in `routes/`; startup registration is duplicated in `backend_app.py` and `local_server.py`.
- Application coordination is split between `services/` and direct repository calls in `routes/analysis.py` and `routes/operational.py`.
- Persistence is duplicated/split between `repositories/` and `app/persistence/`; `app/persistence/db.py` owns `db_cursor`/connection creation.
- Domain rules currently live in `app/domain/`, including graph, causal, machine-modeling and process-modeling rules.
- `agent_tools/` has contracts/registry/validation/adapters and its adapter imports legacy services/repositories.
- No `uc_bib_solv/modules/` target tree existed in the inspected baseline.
