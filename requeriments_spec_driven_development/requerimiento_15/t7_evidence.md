# T7 — Evidencia de migración de `causal_analysis`

Fecha: 2026-08-19  
Requerimiento: `requerimiento_15`  
Estado T7: `completed`  
Estado global: `implementado_pendiente_validacion`  
Gate 3: pendiente; T7 no declara conformidad final ni `done`.

## Gobernanza y alcance

- Rol: `execute-agent`, actuando directamente en esta sesión; no se abrió otra sesión Codex.
- Modelo solicitado: `gpt-5.6-luna`; esfuerzo: `medium`.
- Inputs cargados: `.atl/sub-agent-registry.md`, `.atl/skill-registry.md`, `common_spec_driven_development/sub_agents/execute-agent.md`, `spec.md`, `task_plan.md`, `nc-log.md` y evidencias T1–T6.
- Skills aplicadas: `project-structure-sdd`, `domain-logic`, `data-model-management`, `connections-management` y `git-workflow`.
- Alcance exclusivo: T7. No se modificó T8+, `db_management/schema.sql`, ni se hizo commit/push.
- La instrucción humana `validar y continuar` se tomó como validación de T6; Gate 3 global sigue pendiente.

## Implementación

Se creó `uc_bib_solv/modules/causal_analysis/` con las cinco fronteras requeridas:

- `domain/`: entidades `Analysis`, `AnalysisParticipant`, `AnalysisResult` e invariantes de estado, transición, tipo e identidad sin Flask, PostgreSQL, SQL ni conexiones.
- `application/ports/`: puertos explícitos `CausalAnalysisPort`, `ParticipantPort` y `ResultPort`.
- `application/use_cases.py`: creación, lectura, actualización, listados y guardado de resultados mediante puertos inyectados.
- `adapters/inbound/http/`: blueprint canónico conservado como adaptador HTTP.
- `adapters/outbound/persistence.py`: único adaptador SQL/mapeo para análisis, participantes, resultados y compatibilidad con `analisis_causas_detalle`.
- `infrastructure/wiring.py`: composición reversible y fake-friendly.

`uc_bib_solv/routes/analysis.py` conserva blueprint, métodos, rutas, payloads, estados y mensajes de error observables, pero delega en el servicio de aplicación. `repositories/analysis_repository.py`, `app/persistence/analisis_causas_repo.py`, `app/persistence/analisis_causas_detalle_repo.py` y `app/domain/analisis_causas.py` quedaron como fachadas de compatibilidad sin SQL activo.

No se modificó JavaScript porque `analysis.js` y `analisis_causas_v02.js` ya consumen los contratos preservados.

## Tests y verificaciones

| Comando | Resultado |
|---|---|
| `python3 -m unittest tests.unit.test_causal_analysis_t7 tests.unit.test_causal_analysis_http_t7 tests.unit.test_causal_analysis_persistence_t7` | PASS, 7 tests |
| `python3 -m compileall -q uc_bib_solv/modules/causal_analysis uc_bib_solv/routes/analysis.py uc_bib_solv/repositories/analysis_repository.py tests/unit/test_causal_analysis_t7.py tests/unit/test_causal_analysis_http_t7.py` | PASS |
| `node --check` sobre JS de análisis | PASS; no hubo JS modificado |
| `python3 -m uc_bib_solv.architecture_validators --check-structure` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-dependencies` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-naming` | BLOQUEADO por diagnósticos legacy preexistentes fuera de T7; no reporta `causal_analysis` |
| `pytest` | Limitación ambiental heredada: paquete no instalado |

## Estado y bloqueos

- T7 queda marcada `completed`; T8+ permanecen `pending`.
- El requerimiento permanece `implementado_pendiente_validacion`; Gate 3 humano sigue pendiente.
- No hay bloqueo funcional conocido de T7. Persisten las limitaciones ambientales ya documentadas: `pytest` ausente, PostgreSQL/E2E no reclamados y diagnósticos legacy globales de naming fuera del módulo canónico.
- No se hizo commit ni push.
