# T9 — Evidence: boundary closure, CI validation and shim policy

Fecha: 2026-08-19  
Requerimiento: `requerimiento_15`  
Estado T9: `completed`  
Estado global: `implementado_pendiente_validacion`  
Gate 3: pendiente; T9 no declara conformidad final ni `done`.

## Governance and scope

- Role: isolated `execute-agent`; model requested `gpt-5.6-luna`, effort `medium`.
- Session ID: not exposed by the runtime API; no identifier is invented.
- Inputs read: `.atl/sub-agent-registry.md`, `.atl/skill-registry.md`, `common_spec_driven_development/sub_agents/execute-agent.md`, required five skills, `spec.md`, approved `task_plan.md`, `nc-log.md`, and `t1_evidence.md` through `t8_evidence.md`.
- Scope: T9 only. T10 was not started. `db_management/schema.sql` was not edited. No documentation/context handoff was performed.
- Baseline: extensive pre-existing modified/deleted/untracked paths were recorded with `git status --short` before edits and preserved.

## Changes

- Corrected deterministic naming validation for private helpers, private constants and `__main__.py` entrypoints, without weakening canonical module checks.
- Extended the legacy allowlist with explicit T9 owners, phases and removal criteria; canonical modules remain non-allowlistable.
- Added `.github/workflows/architecture-validation.yml` to run all four validator commands and boundary tests with deterministic non-zero failure behavior; no deployment behavior was added.
- Added `tests/architecture/test_t9_boundaries.py` for validator enforcement, allowlist metadata and schema immutability.
- Produced `t9_legacy_target_matrix.md`, `t9_allowlist_report.md`, `t9_shim_retirement_report.md`, `t9_compatibility_report.md` and `t9_phase_evidence_index.md`.

## Verification

| Check | Result |
|---|---|
| `python3 -m uc_bib_solv.architecture_validators --check-structure` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-naming` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-dependencies` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations` | PASS, exit 0 |
| `python3 -m unittest tests.architecture.test_architecture_validators tests.architecture.test_t9_boundaries` | PASS, 3 tests |
| `python3 -m compileall -q uc_bib_solv/architecture_validators tests/architecture` | PASS |
| `node --check` over discovered JS/MJS files | PASS, exit 0 |
| `db_management/schema.sql` hash | Unchanged: `f85ab20439d4ebf68bbd0ed49e1f3d0748db00276b58d17cef8ad298c8fe0866` |
| Broader Python/unit, PostgreSQL integration, smoke and Playwright/E2E | Not claimed green; environment/worktree availability limitations are retained from prior evidence and recorded in compatibility report |

## Shim and legacy disposition

Remaining legacy imports were classified in `t9_legacy_target_matrix.md`.
Reference counts are nonzero for public route/service/domain/persistence and
agent-tools compatibility surfaces, so no shim was retired. The duplicate active
outbound check is green. Retained shims have explicit owner and removal criteria.

## Reporting contract

- No commit was created.
- No push was performed.
- Requirement state remains `implementado_pendiente_validacion`.
- Next step: human Gate 3 validation; T10/documentation handoff remains outside this execution.
