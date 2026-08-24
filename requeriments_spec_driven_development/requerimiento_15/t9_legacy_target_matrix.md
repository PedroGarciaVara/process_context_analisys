# T9 — Legacy → target closure matrix

Fecha: 2026-08-19. Esta matriz cubre únicamente el cierre T9; no atribuye a T9
los cambios preexistentes del worktree.

| Legacy surface | Canonical target/public port | Current consumers or seam | Decision | Removal criterion |
|---|---|---|---|---|
| `routes/analysis.py`, `repositories/analysis_repository.py`, `app/persistence/analisis_causas*.py` | `modules/causal_analysis` inbound/application/outbound | Flask registration, compatibility tests | Retain delegation facades; no duplicate SQL in the facade | Zero runtime imports outside target registration/tests and green HTTP/persistence regression |
| `routes/causas.py`, `services/causas_service.py`, `repositories/causas*.py`, `app/persistence/*graph*` | `modules/causal_tree` public service and ports | Flask registration, DB fixtures, legacy tests | Retain public route/repository seams during migration | Zero active graph/cause implementation outside target outbound adapter |
| `routes/operational.py`, `services/operational_service.py`, `repositories/operational_repository.py` | `modules/operational_modeling` use cases and ports | Frontend route contract and compatibility service | Retain route/service facades; route delegates to target wiring | All runtime consumers use target inbound/application path and contract tests stay green |
| `routes/process_modeling.py`, `services/process_modeling_service.py`, `app/domain/process_modeling/*`, `app/persistence/pm_process_repo.py` | `modules/process_modeling` ports, adapters and wiring | Public route, legacy service tests, injected wiring | Retain imports required by compatibility wiring; no removal with nonzero references | Legacy import count zero outside compatibility tests and delegation/regression evidence green |
| `agent_tools/*.py` | `modules/agent_tools` contracts, registry and gateway port | Existing tool callers and compatibility tests | Retain re-export shims; `ExistingBackendGateway` remains one adapter seam | Zero imports of legacy symbols outside compatibility tests |
| `backend_app.py`, `local_server.py`, `routes/bootstrap.py`, `routes/health.py` | `modules/platform` factory and inbound adapters | Startup/public import callers | Retain startup facades as delegation-only | One canonical composition path plus startup/health contract evidence |

No shim was retired in T9: each listed seam has a nonzero consumer/reference or
is still required by a public compatibility import. No duplicate active outbound
implementation was introduced; the concrete-implementation validator is green.
