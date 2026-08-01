# Skill: UI Validation — Flujo multi-agente de testing de UI con Playwright

## Proposito

Define el flujo estandar y reutilizable para validacion de UI de webapps usando Playwright
en un entorno multi-agente (Codex CLI o Copilot CLI).

Cubre: setup de Playwright, generacion de tests, ejecucion, recuperacion de logs y
analisis de resultados con deteccion de candidatos NC.

---

## Fases del flujo

```
setup -> generate-tests -> execute-tests -> recover-logs -> analyze-logs -> report
```

## Bootstrap obligatorio

Leer siempre estos archivos antes de comenzar:

1. `common_spec_driven_development/agents_UI_test/instruction.md`
2. `common_spec_driven_development/agents_UI_test/sub-agent-registry.md`
3. `common_spec_driven_development/agents_UI_test/skill-registry.md`

## Carpeta canonica de artefactos

```
.playwright-artifacts/
├── test-results/
│   └── YYYY-MM-DD_HH-MM-SS/
│       ├── summary.json
│       ├── console.log
│       ├── request-failures.log
│       ├── response-errors.log
│       ├── backend-delta.log       (modo local)
│       ├── remote-backend-log.txt  (modo remoto)
│       └── analysis-report.md      (producido por ui-log-analysis-agent)
└── reports/
    └── index.html
```

## Regla de integracion con el flujo SDD

En el flujo SDD, la fase de tests de UI se inserta **entre `execute-task` y `validate-implementation`**,
pero solo si el requerimiento incluye componente de UI:

```
execute-task
    │
    ├─ [si hay UI] execute-ui-tests
    │       └─ analyze-ui-test-results
    │
validate-implementation
```

Si los tests de UI producen candidatos NC, registrarlos en el documento de trazabilidad
del requerimiento antes de pasar a `validate-implementation`.

## Sub-agentes disponibles

| Sub-agente | Fase |
|-----------|------|
| `playwright-setup-agent` | setup |
| `ui-test-generation-agent` | generate-tests |
| `ui-test-execution-agent` | execute-tests |
| `ui-log-recovery-agent` | recover-logs |
| `ui-log-analysis-agent` | analyze-logs |
| `ui-validation-orchestrator` | coordinacion end-to-end |

## Auth remota

Para targets protegidos con SSO, leer:
`common_spec_driven_development/agents_UI_test/remote-auth.instruction.md`

## Cuando usar este flujo

- El requerimiento incluye una webapp con interfaz de usuario.
- Se necesita evidencia de validacion de UI para cerrar la fase de implementacion.
- Se quiere detectar NCs de UI antes de documentar la implementacion como completa.

## Cuando NO usar este flujo

- El requerimiento es exclusivamente de backend/datos sin interfaz de usuario.
- El entorno no tiene Node.js disponible para instalar Playwright.
- La webapp no tiene URL accesible para la prueba (sin despliegue disponible).
