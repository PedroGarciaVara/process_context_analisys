# T5 — Evidencia de migración de `agent_tools` mediante public ports

Fecha: 2026-08-19  
Requerimiento: `requerimiento_15`  
Estado T5: `completed`  
Estado global: `implementado_pendiente_validacion`  
Gate 3: pendiente; T5 no declara conformidad final ni `done`.

## Gobernanza y entradas

- Rol ejecutor: `execute-agent`, actuando directamente en esta sesión; no se abrió otra sesión Codex.
- Session ID: no expuesto por el runtime API de esta sesión.
- Modelo solicitado: `gpt-5.6-luna`; esfuerzo: `medium`.
- Inputs leídos antes de editar: `.atl/sub-agent-registry.md`, `.atl/skill-registry.md`, `common_spec_driven_development/sub_agents/execute-agent.md`, `spec.md`, `task_plan.md`, `nc-log.md` y evidencias T1–T4.
- Skills cargadas: `project-structure-sdd`, `domain-logic`, `data-model-management`, `connections-management` y `git-workflow`.
- Alcance: exclusivamente T5. No se modificaron T6+, `db_management/schema.sql`, frontend ni schema SQL; no se hizo commit ni push.
- Gate de continuación: T4 se consideró validada por la instrucción humana `validar y continuar`; Gate 3 global sigue pendiente.

## Implementación canónica

Se creó y consolidó `uc_bib_solv/modules/agent_tools/` con las fronteras requeridas:

- `domain/`: `ToolRequest`, `ToolContext`, `ToolResult`, errores y validación framework-free.
- `application/ports/`: `ToolCatalogPort` inbound y `BackendGateway` outbound como contratos públicos.
- `application/use_cases.py`: `ToolDefinition`, `ToolRegistry`, manifest determinista, handlers y adaptación de argumentos/trazas.
- `adapters/inbound/tools.py`: construcción del registro desde un puerto inyectado.
- `adapters/outbound/backend_gateway.py`: `ExistingBackendGateway`, único adaptador concreto que conserva las llamadas legacy a servicios/repositorios.
- `infrastructure/wiring.py`: composición explícita del gateway inyectado y del registro.

Se preservaron los ocho nombres de herramientas, `ToolRequest`, `ToolResult`, `ToolContext`, códigos (`required_argument`, `invalid_argument`, `invalid_arguments`, `invalid_tool_request`, `tool_not_found`, `duplicate_tool`), payloads y provenance/trazabilidad.

Los módulos legacy `agent_tools/contracts.py`, `errors.py`, `validation.py`, `adapters.py`, `registry.py` y `builtin.py` quedaron como shims delegadores/reexportadores hacia el módulo canónico. No contienen una segunda implementación activa.

## Consumidores y criterio de retirada

- Consumidor de compatibilidad verificado: `tests/unit/test_agent_tools.py`.
- La búsqueda de `agent_tools`, `ToolRequest`, `ToolResult` y `ExistingBackendGateway` fue revisada para conservar imports públicos existentes.
- Los shims se podrán retirar cuando la búsqueda de imports legacy sea cero fuera de tests de compatibilidad y exista evidencia de regresión verde sobre el puerto canónico.

## Verificación ejecutada

| Comando | Resultado |
|---|---|
| `python3 -m unittest tests.unit.test_agent_tools tests.unit.test_agent_tools_ports` | PASS, 4 tests |
| `python3 -m compileall -q uc_bib_solv/modules/agent_tools uc_bib_solv/agent_tools tests/unit/test_agent_tools.py tests/unit/test_agent_tools_ports.py` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-structure` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-dependencies` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-naming` | BLOQUEADO por diagnósticos legacy preexistentes fuera de `modules/agent_tools`; no emitió diagnósticos T5 |
| `python3 -m uc_bib_solv.architecture_validators` | BLOQUEADO por los mismos diagnósticos legacy de naming |
| `python3 -m pytest ...` | BLOQUEADO ambientalmente: `pytest` no está instalado |
| `sha256sum db_management/schema.sql` | Sin cambio: `f85ab20439d4ebf68bbd0ed49e1f3d0748db00276b58d17cef8ad298c8fe0866` |

El escaneo de aislamiento del dominio no encontró imports productivos prohibidos. La prueba de integración usa un fake gateway y no requiere PostgreSQL, red ni frontend.

## Estado y bloqueos

- T5 queda marcada como `completed` en `task_plan.md`.
- El requerimiento permanece `implementado_pendiente_validacion`; `done` está prohibido hasta Gate 3 humano.
- No hay bloqueos funcionales de T5. Quedan documentadas la limitación ambiental de `pytest` y los diagnósticos legacy de naming, ambos preexistentes/fuera de T5.
- No se hizo commit ni push.
