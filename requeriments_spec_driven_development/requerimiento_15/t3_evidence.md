# T3 — Evidencia de límites de plataforma y composición reversible

Fecha: 2026-08-19  
Requerimiento: `requerimiento_15`  
Estado de tarea: `completed`  
Estado global: `implementado_pendiente_validacion`  
Alcance: únicamente T3. No se modificaron frontend, dominios T4+, ni `db_management/schema.sql`.

## Gates y NC

- Sub-agente: `execute-agent` (sesión de ejecución aislada del flujo; sin commit ni push).
- Modelo: `gpt-5.6-luna`; `model_reasoning_effort=medium`.
- Inputs cargados: registros `.atl`, instrucciones de `execute-agent`, skills de estructura, dominio, configuración, conexiones y git, `spec.md`, `task_plan.md`, `nc-log.md`, `t1_evidence.md` y `t2_evidence.md`.
- Gate 2: aprobado explícitamente por el programador humano mediante `continuar con T3` el 2026-08-19.
- NC-002: `resolved` tras `AUDIT_PASS` técnico T2 del 2026-08-19 y la confirmación humana explícita anterior.
- Gate 3: pendiente; este artefacto no declara conformidad final ni `done`.

## Implementación

Se creó `uc_bib_solv/modules/platform/` con las cinco fronteras obligatorias:

- `application/ports/platform_ports.py`: contratos `HealthProvider` y `BootstrapProvider`.
- `adapters/inbound/http/`: factories de blueprints Flask para `/health`, `/api/health`, `/bootstrap` y `/api/bootstrap`; los providers se inyectan explícitamente.
- `infrastructure/config.py`: configuración de host, puerto, debug y reloader desde entorno.
- `infrastructure/wiring.py`: composición explícita de los providers actuales legacy.
- `infrastructure/app_factory.py`: factory común, lifecycle `run_app` y dos modos reversibles (backend JSON y servidor SPA).
- `domain/` y `adapters/outbound/`: namespaces preparados sin introducir lógica externa en domain ni persistencia nueva.

Las fachadas `uc_bib_solv/backend_app.py`, `uc_bib_solv/local_server.py`, `routes/health.py` y `routes/bootstrap.py` conservan sus imports públicos y delegan al wiring/adaptadores de plataforma. Las rutas funcionales posteriores continúan registrándose desde sus módulos legacy; no se migraron T4+.

## Verificación

| Comando | Resultado |
|---|---|
| `python3 -m unittest tests.unit.test_platform_boundaries` | PASS, 4 tests |
| `python3 -m compileall -q ...` sobre platform, fachadas, rutas y test T3 | PASS |
| `python3 -m uc_bib_solv.architecture_validators --check-structure` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-dependencies` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-naming` | Bloqueado por diagnósticos legacy preexistentes fuera de T3; no reporta archivos bajo `uc_bib_solv/modules/platform/` |
| `python3 -m pytest -q tests/unit/test_platform_boundaries.py` | Bloqueo ambiental esperado: `pytest` no está instalado; no se instaló ninguna dependencia |
| `sha256sum db_management/schema.sql` | `f85ab20439d4ebf68bbd0ed49e1f3d0748db00276b58d17cef8ad298c8fe0866`, sin cambio |

Los contratos observables verificados mantienen status 200, payload de health, manifest de bootstrap y el startup SPA. La advertencia `ResourceWarning` de Flask al servir el índice no produjo fallo y queda fuera del alcance de T3.

## Perímetro y siguiente paso

Cambios atribuibles a T3: módulo platform, dos fachadas de rutas, dos fachadas de startup y `tests/unit/test_platform_boundaries.py`, además de este artefacto y actualizaciones de estado scoped. No se revirtieron cambios preexistentes del worktree ni se modificó schema.

Siguiente paso: validación humana focalizada de T3/Gate 3 parcial; después, solo con aprobación, T4. El requerimiento permanece `implementado_pendiente_validacion` y no se marca `done`.
