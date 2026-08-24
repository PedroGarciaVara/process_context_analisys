# T8 — Evidencia de migración de `operational_modeling`

Fecha: 2026-08-19  
Estado T8: `completed`  
Estado global: `implementado_pendiente_validacion`  
Gate 3: pendiente; T8 no declara conformidad final ni `done`.

## Gobernanza y alcance

- Rol: `execute-agent`, ejecutado en una sesión secundaria aislada; session id: `01a01b95-a947-7600-9fa9-6613314a8909`.
- Modelo solicitado por el entorno: `gpt-5.6-luna`; esfuerzo: `medium`.
- Inputs leídos: `.atl/sub-agent-registry.md`, `.atl/skill-registry.md`, `common_spec_driven_development/sub_agents/execute-agent.md`, `spec.md`, `task_plan.md`, `nc-log.md` y evidencias T1–T7.
- Skills cargadas y aplicadas: `project-structure-sdd`, `domain-logic`, `data-model-management`, `connections-management` y `git-workflow`.
- Alcance exclusivo: T8. No se modificó T9+, `db_management/schema.sql`, frontend ni se hizo commit/push.
- La instrucción humana `validar y continuar` valida T7; Gate 3 global sigue pendiente.

## Implementación

Se creó `uc_bib_solv/modules/operational_modeling/` con:

- `domain/`: entidades, value objects, excepciones y validadores puros para nombres, ids, estados, JSON estructurado y payloads de máquina/contrato/proceso.
- `application/ports/` y `application/use_cases.py`: puerto de persistencia y casos de uso inyectables para catálogo, páginas y operaciones CRUD.
- `adapters/inbound/http/`: factory de blueprint HTTP canónico para catálogo y páginas, con parsing/status/error mapping en el borde.
- `adapters/outbound/persistence.py`: adaptador inyectable que conserva como backend SQL autorizado el repositorio operativo existente, incluyendo sus consultas parametrizadas, `psycopg2.extras.Json` y `db_cursor()` transaccional.
- `infrastructure/wiring.py`: composition root con factory de conexiones disponible para inyección y servicio lazy compatible.

`routes/operational.py` usa el servicio canónico para las operaciones existentes; `services/operational_service.py` delega catálogo y payload de página al mismo wiring. Los nombres públicos, métodos, envelopes, estados y códigos observables se conservan. Las operaciones BPM y configuración mantienen sus fachadas existentes mientras el adaptador canónico concentra el acceso de aplicación.

## Tests y verificaciones

| Comando | Resultado |
|---|---|
| `python3 -m unittest tests.unit.test_operational_modeling_t8` | PASS, 5 tests |
| `python3 -m compileall -q` sobre módulo, route, service y test T8 | PASS |
| `python3 -m uc_bib_solv.architecture_validators --check-structure` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-dependencies` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-naming` | BLOQUEADO por diagnósticos legacy preexistentes fuera de `modules/operational_modeling` |
| `node --check` sobre todos los JS del frontend | PASS; no se modificó JavaScript |
| import de `uc_bib_solv.routes.operational` | PASS; blueprint `operational` cargado |
| `sha256sum db_management/schema.sql` | Sin cambio: `f85ab20439d4ebf68bbd0ed49e1f3d0748db00276b58d17cef8ad298c8fe0866` |

`pytest` no está instalado en el entorno y PostgreSQL/E2E no están disponibles; no se reclaman esas verificaciones. No hay bloqueo funcional observado en los tests aislados de T8.

## Estado

- T8 queda `completed` en `task_plan.md`.
- El requerimiento conserva el estado global `implementado_pendiente_validacion`.
- Gate 3 humano sigue pendiente y no se marca `done`.
- No se registró NC nueva.
