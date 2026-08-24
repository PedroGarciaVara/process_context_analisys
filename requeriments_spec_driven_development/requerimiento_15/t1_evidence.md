# T1 — Phase evidence (NC-001, intento de corrección 2)

## Temporal attribution boundary

La atribución de esta corrección queda delimitada por el snapshot tomado
inmediatamente antes de editar, el 2026-08-17. Ningún cambio productivo,
de test, de schema o de otro archivo del worktree preexistente se atribuye a
T1. Solo se atribuyen los cuatro artefactos listados en `T1 output boundary`.
Hashes SHA-256 del snapshot previo a esta corrección:

- `t1_scoped_inventory.md`: `944ff61fb5e7521add56e603b3ed6059b8bdd117aa7e2727a831cfa6b3b3b10b`
- `t1_evidence.md`: `cba0174a3b1d33a188cd4fc04efa5b536c65b274cdaf21b2bdfec635a0d3f9ab`
- `t1_migration_matrix.csv`: `4648a5a6d760e3683fb9c8c486412527bd4571e6a049f790d25e96b7ec1d705c`
- `t1_phase_allowlist.md`: `c89c691616967028f992ccfcfd288f01b4c983cfe6fd15b68bf7c5465c86ba42`
- `db_management/schema.sql` (solo lectura): `f85ab20439d4ebf68bbd0ed49e1f3d0748db00276b58d17cef8ad298c8fe0866`

Los hashes de nombres del worktree previos fueron `cf883acff40aa5f9666341ab3f46366fe9b0af084c93ccd1fcff96c1ee5d9bc1` para `git status --porcelain=v1 --untracked-files=all` y `b8916cc24fc10736e02d65b9aa998d8efec5521e7b482709433d67100fd2ddb1` para `git diff --name-only`. Los cambios previos no se atribuyen a este intento ni se revierten.

## Session and governance

- Sub-agent: `execute-agent` (mandatory route for implementation phase).
- Session: isolated execute-agent session as requested by the human programmer; no orchestrator-authored product changes.
- Execution profile evidence: model `gpt-5.6-luna`; `model_reasoning_effort=medium`.
- Gates: Gate 1 stated validated by the human programmer; Gate 2 stated explicitly approved. T1 only.
- T2 and all later tasks: not executed and not marked complete.
- No commit and no push.

## Commands and results

| Command | Result |
|---|---|
| `git rev-parse --show-toplevel` | `/home/pedro/proyectos visual studio code/UC_BIB_Solve` |
| `git status --short` | Extensive pre-existing modifications/deletions/untracked paths; preserved and excluded from T1 changes |
| `rg --files uc_bib_solv tests \| sort` | Inventory read; 73 Python source files, 36 JS files, 22 unit, 3 integration and 7 E2E test files counted |
| AST route scan over `uc_bib_solv/routes/*.py` | 65 decorator registrations and 45 unique paths after `/bootstrap`, `/health`, and `/causas` aliases |
| `rg` SQL/connection/import scans | Ownership and direct consumers recorded in `t1_scoped_inventory.md` and `t1_migration_matrix.csv` |
| schema scan for `CREATE TABLE IF NOT EXISTS` | 23 physical table declarations recorded; schema not modified |
| `sed -nE 's/^[[:space:]]*CREATE TABLE IF NOT EXISTS[[:space:]]+([^ (]+).*/\\1/p' db_management/schema.sql` | 23 table names listed; reproducible read-only count |
| `python3` with `csv.reader` over `t1_migration_matrix.csv` | PASS after correction: header and every data row contain exactly 8 fields |
| `sha256sum` over the four T1 artifacts and `schema.sql` | PASS after correction; post-correction hashes are recorded in the final report |
| `for f in $(rg --files uc_bib_solv/webapp/js -g '*.js' \| sort); do node --check "$f"; done` | PASS for all 36 JS files |
| `python -m pytest ...` focused baseline | BLOCKED: `.venv/bin/python: No module named pytest`; no dependency installation attempted |
| `python3 -m unittest discover -s tests/unit -p 'test_*.py'` | `Ran 77 tests`; `FAILED (failures=2, errors=13)`. Existing failures include missing legacy paths (`uc_bib_solv/app.py`, root `app/`, root `db/schema.sql`), DB-backed calls and assertion mismatches. No test files changed. |
| `python tests/smoke_test.py` | Environmental DB blocker: `psycopg2.OperationalError`, local PostgreSQL socket `/var/run/postgresql/.s.PGSQL.5432`, `Operation not permitted`. The script returned shell code 0 despite printing the traceback; this is not treated as a pass. |
| final scoped `git status --short` and `git diff -- ...` | Performed after artifact creation; only the four T1 artifacts are attributable to this phase. Existing unrelated worktree state remains untouched. |

## Coverage and limitations

Covered: all six target domains, all six route files and aliases, backend startup, services, repositories, current domain/persistence code, agent tools, frontend API modules, JS consumers, unit/integration/E2E references, operational scripts, and all physical schema tables.

Not claimed: live HTTP response snapshots, PostgreSQL query counts from a running database, smoke success, Playwright execution, or pytest results. Those require services/dependencies unavailable in this environment and belong to later verification work.

## Risk disposition

- The worktree has broad unrelated changes and deletions; no cleanup or restoration was attempted.
- `tests/unit` contains baseline failures/errors that cannot be attributed to T1 because T1 changes no product/test code.
- The current source tree has legacy path assumptions and split persistence ownership; these are recorded as migration risks and temporary allowlist entries.
- Query/transaction counts are ownership observations only; runtime measurements remain pending PostgreSQL availability.

## T1 output boundary

Written only under `requeriments_spec_driven_development/requerimiento_15/`:

1. `t1_scoped_inventory.md`
2. `t1_migration_matrix.csv`
3. `t1_phase_allowlist.md`
4. `t1_evidence.md`

No `spec.md`, `task_plan.md`, `nc-log.md`, `traza_requerimiento.md`, product code, test code, schema, commit, or push was changed. `NC-001` remains `in_correction`; this report does not close it. Independent audit and human validation remain pending.

## Correction verification snapshot

The final verification command records post-correction SHA-256 values for the
four allowed artifacts and confirms that the schema hash remains unchanged.
Because the artifacts are untracked in this worktree, attribution is proved by
comparing the pre-edit and post-edit snapshots, then checking only the four
allowlisted paths with `git diff --name-only --` and
`git status --short --untracked-files=all`. No other path is considered T1.

Post-correction snapshot recorded by read-only validation:

- `git status --porcelain=v1 --untracked-files=all` names SHA-256:
  `20cd87b3d00cb2d0abddfd868bdd30934937485d43779076893ac1233785820d`
- `git diff --name-only` SHA-256:
  `49bdd96b2dbab2de42c5737edfcc17c1d1a189b04ad7c0f72fa653e309784a35`
- `t1_scoped_inventory.md`: `26f4ac7abbe4b6bcbcf0256b369a4c512fd74462efa2864116eca19d424c2e31`
- `t1_migration_matrix.csv`: `70d7e562db778d471cf6b73645c6fb33672cc2f02a15f752b96d9ef1335b0a3b`
- `t1_phase_allowlist.md`: `54d101f9273721c2d5c5d3b475a1eec6fb7ac55c948ac3034859138e6b0f5605`
- `db_management/schema.sql`: `f85ab20439d4ebf68bbd0ed49e1f3d0748db00276b58d17cef8ad298c8fe0866`

The SHA-256 of this evidence file is generated after the final edit; reproduce
it with the same `sha256sum` command instead of using an embedded self-hash.
