# T6 — Evidencia de migración de `causal_tree`

Fecha: 2026-08-19  
Requerimiento: `requerimiento_15`  
Estado T6: `completed`  
Estado global: `implementado_pendiente_validacion`  
Gate 3: pendiente; T6 no declara conformidad final ni `done`.

## Gobernanza y alcance

- Rol ejecutor: `execute-agent`, actuando directamente en esta sesión; no se abrió otra sesión Codex.
- Modelo solicitado: `gpt-5.6-luna`; esfuerzo: `medium`.
- Inputs cargados: `.atl/sub-agent-registry.md`, `.atl/skill-registry.md`, `common_spec_driven_development/sub_agents/execute-agent.md`, `spec.md`, `task_plan.md`, `nc-log.md` y evidencias T1–T5.
- Skills aplicadas: `project-structure-sdd`, `domain-logic`, `data-model-management`, `connections-management` y `git-workflow`.
- Alcance exclusivo: T6. No se tocaron T7+, `db_management/schema.sql`, ni se hizo commit/push.

## Implementación

Se creó `uc_bib_solv/modules/causal_tree/` con:

- `domain/`: entidades `Cause`, `Hypothesis`, `Node`, `Relationship`; value objects para IDs, tipos y tags; invariantes de firmas de relación, ciclos, borrado seguro, proyección DAG→árbol y normalización de tags; excepciones y validadores sin Flask, PostgreSQL, Dataiku, SQL o conexiones.
- `application/ports/`: puertos explícitos `CausePort`, `HypothesisPort`, `NodePort`, `RelationshipPort` y `TreeQueryPort`.
- `application/use_cases.py` y `application/service.py`: casos de uso inyectables para árbol, detalle, alta/edición/borrado de causas e hipótesis, búsqueda/enlace de nodos reutilizables y creación de contrato hijo.
- `adapters/inbound/http/routes.py`: adaptador HTTP canónico con parsing de query/JSON, delegación a aplicación y mapeo de errores/status.
- `adapters/outbound/persistence.py`: adaptador canónico que encapsula la persistencia existente y expone repositorios de causa, hipótesis, nodos, relaciones y consultas; el dominio/aplicación no conocen SQL ni cursores.
- `infrastructure/wiring.py`: composición explícita y reversible, incluyendo inyección de fakes.

`uc_bib_solv/routes/causas.py` conserva los nombres públicos y el blueprint como shim de compatibilidad del adaptador inbound, delegando en el servicio canónico. No se modificó el frontend porque sus endpoints y payloads no requieren cambios.

## Tests añadidos

- `tests/unit/test_causal_tree_domain_t6.py`: invariantes de relaciones, ciclos, proyección y tags sin Flask/PostgreSQL.
- `tests/unit/test_causal_tree_application_t6.py`: casos de uso con fake de persistencia.

## Verificaciones

| Comando | Resultado |
|---|---|
| `python3 -m unittest tests.unit.test_causal_tree_domain_t6 tests.unit.test_causal_tree_application_t6` | PASS, 5 tests |
| `python3 -m compileall -q uc_bib_solv/modules/causal_tree ...` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-structure` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-dependencies` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations` | PASS, exit 0 |
| `node --check` sobre archivos JS modificados existentes | PASS, exit 0; no se modificó JavaScript en T6 |
| tests legacy de rutas | Bloqueados por eliminación preexistente de `uc_bib_solv/app.py` en el worktree; restaurarlo queda fuera de T6 |
| `pytest` | Limitación ambiental ya registrada: módulo no instalado; los tests legacy ejecutados con `unittest` también requieren PostgreSQL local en varios casos |

No se modificó `db_management/schema.sql`. El estado global permanece `implementado_pendiente_validacion`; la validación humana de Gate 3 sigue pendiente.
