# T1 — Baseline phase allowlist

This is a temporary T1 inventory, not an authorization to retain the items permanently. No product file was edited to create this list.

| ID | Allowlisted baseline exception | Owner | Reason | Phase | Removal criterion |
|---|---|---|---|---|---|
| AL-15-001 | `uc_bib_solv/routes/`, `services/`, `repositories/`, `app/domain/`, `app/persistence/` legacy layout | execute-agent / domain owner | Existing runtime and tests consume these paths before migration | T1–T8 | Each domain has target boundaries and all consumers are redirected |
| AL-15-002 | `backend_app.py` and `local_server.py` duplicate blueprint registration | platform owner | Compatibility/startup surfaces observed in baseline | T1–T3 | One canonical composition path plus tested compatibility facade |
| AL-15-003 | Historical JS names such as `process-modeling.js`, `analisis_causas_v02.js`, `maquinas_v02.js`, `contratos_v02.js` | frontend owner | Public/static asset compatibility | T1–T9 | Replacement consumer map and regression evidence permit retirement/rename |
| AL-15-004 | Direct route/service/repository imports from listed tests and operational scripts | test/tooling owners | Tests and fixtures are direct consumers, including DB-backed tests | T1–T9 | Consumer-by-consumer redirect or explicit documented fixture exception |
| AL-15-005 | SQL, cursors, `psycopg2`, JSON persistence mapping under `app/persistence/` and legacy repositories | persistence owner | Current persistence boundary is split and is the subject of migration | T1–T8 | SQL and concrete connections exist only in authorized target outbound/infrastructure |
| AL-15-006 | `agent_tools` imports of legacy repositories/services in `adapters.py` | tools owner | Existing backend gateway compatibility | T1–T5 | Gateway uses public ports and no concrete implementation is imported by application/domain |

No allowlist entry grants permission to change `db_management/schema.sql`, add validators, move files, add shims, or alter code during T1.

## Attribution and snapshot boundary

The allowlist is not evidence that any pre-existing worktree change belongs to
T1. Attribution is limited to these four files:

- `t1_scoped_inventory.md`
- `t1_migration_matrix.csv`
- `t1_phase_allowlist.md`
- `t1_evidence.md`

`db_management/schema.sql` is a read-only reference. Before/after attribution
must use an explicit snapshot of `git status --porcelain=v1 --untracked-files=all`
and `git diff --name-only`; unrelated pre-existing entries remain excluded and
must not be reverted, staged, committed, or claimed as T1 output.
