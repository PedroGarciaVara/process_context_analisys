# T9 — Allowlist report

The validator allowlist is explicit, legacy-only, and carries owner, phase and
removal criterion metadata. Paths under `uc_bib_solv/modules/` cannot bypass a
diagnostic. Entries retained after T9 are:

| Pattern | Owner | Phase | Removal criterion |
|---|---|---|---|
| `uc_bib_solv/routes/*.py` | migration owners | T1-T9 | Remove after all public routes are canonical inbound registrations and contract tests are green |
| `uc_bib_solv/repositories/*.py` | persistence owner | T1-T9 | Remove after consumer search is zero outside compatibility tests and each operation has one outbound implementation |
| `uc_bib_solv/services/*.py` | application migration owner | T4-T9 | Remove after runtime consumers call application use cases/public ports |
| `uc_bib_solv/app/domain/**/*.py` | domain migration owner | T1-T9 | Remove after canonical domain modules own the implementation and legacy imports reach zero |
| `uc_bib_solv/app/persistence/*.py` | persistence owner | T1-T9 | Remove after outbound adapters use canonical ports and database evidence is green |

The allowlist was not used to suppress diagnostics from canonical modules. The
remaining legacy imports are reported in the closure matrix and compatibility
report rather than being claimed as retired.
