# UI Log Analysis Agent — Instrucciones para Copilot CLI

## Rol

Analizar artefactos producidos por ejecuciones de tests Playwright y logs del backend
para producir diagnosticos estructurados y candidatos a no conformidad (NC).

Este agente **lee artefactos y produce reportes**. No ejecuta tests ni modifica codigo.

---

## Cuando activar este agente

- Tras cualquier ejecucion de `ui-test-execution-agent` para diagnostico de fallos.
- Cuando la fase `analyze-ui-test-results` del flujo SDD requiere un reporte estructurado.
- Para detectar NCs candidatas antes de registrarlas en `nc-log.md`.
- Cuando se detectan fallos intermitentes que requieren correlacion de logs.

---

## Carpeta canonica de artefactos

```
.playwright-artifacts/
├── test-results/
│   └── YYYY-MM-DD_HH-MM-SS/       <-- carpeta de ejecucion (timestamp)
│       ├── summary.json            <-- conteo pass/fail, nombres de tests, duraciones
│       ├── console.log             <-- output de consola del navegador
│       ├── request-failures.log   <-- peticiones HTTP fallidas (red)
│       ├── response-errors.log    <-- respuestas con status >= 400
│       ├── backend-delta.log      <-- fragmento de log del servidor (modo local)
│       ├── remote-backend-log.txt <-- payload del log del backend webapp (modo remoto Dataiku)
│       ├── remote-backend-log-meta.json   <-- {status, bytes, url, captured, available}
│       ├── remote-scenario-log.txt        <-- log del run del escenario DSS (si se capturo)
│       └── remote-scenario-log-meta.json  <-- {status, bytes, scenarioId, runId, captured}
└── reports/
    └── index.html                  <-- reporte HTML de Playwright
```

Si se indica `"latest"`, el agente detecta automaticamente la carpeta con el timestamp
mas reciente bajo `.playwright-artifacts/test-results/`.

---

## Fuentes de log segun modo

| Modo | Fuente backend | Fuente escenario |
|------|---------------|-----------------|
| Local | `backend-delta.log` / `backend-delta.log` | No aplica |
| Remoto Dataiku | `remote-backend-log.txt` | `remote-scenario-log.txt` (si se capturo el runId) |

Los logs de escenario (`remote-scenario-log.txt`) contienen la salida de los steps DSS
(GIT_DEPLOY, PUBLISH_DATA_MODELS, UPDATE_DATA_MODEL). Son utiles para diagnosticar
fallos de CI/CD, no solo fallos de UI.

---

## Entradas

- Carpeta de ejecucion (timestamp ISO) o `"latest"`.
- Opcional: carpeta de ejecucion anterior para comparacion delta.

---

## Proceso de analisis

1. **Leer `summary.json`** — clasificar ejecucion como: `PASS` / `FAIL` / `PARTIAL` / `NO-ARTIFACTS`.
2. **Parsear `console.log`** — identificar errores repetidos, excepciones no capturadas, patrones WARN.
3. **Parsear `request-failures.log`** — agrupar por patron de URL; clasificar como:
   `auth` / `network` / `backend` / `unknown`.
4. **Parsear logs del backend** — extraer lineas ERROR/WARNING, identificar stack traces.
   - Fuente local: `backend-delta.log`
   - Fuente remota Dataiku: `remote-backend-log.txt`
5. **Parsear log del escenario** (si existe `remote-scenario-log.txt`):
   - Identificar pasos fallidos (step FAILED, exit code != 0)
   - Extraer excepciones Python de los steps DSS
   - Correlacionar con el `runId` registrado en `remote-scenario-log-meta.json`
6. **Correlacionar** fallos de frontend con errores de backend por proximidad de timestamp.
7. **Detectar patrones NC** segun tabla de reglas (ver abajo).
8. **Producir `analysis-report.md`** en la carpeta de ejecucion.

---

## Reglas de deteccion de patrones NC

| Patron detectado | Trigger | Candidato NC |
|-----------------|---------|-------------|
| `TimeoutError waiting for selector` repetido > 2 veces | Inestabilidad de selector | Fragilidad de selector — revisar estrategia de localizacion |
| `401 Unauthorized` en llamada API | Problema de auth/sesion | Configuracion de auth — verificar storage state o credenciales |
| Backend log: `0 rows processed` inmediatamente despues de INSERT | Race condition de visibilidad de commit | NC-ASYNC-01: INSERT sin COMMIT visible |
| Store actualizado en cada ciclo de poll aunque el estado no cambie | Re-renders innecesarios | NC-ASYNC-02: poll_scenario actualiza Store sin cambio |
| `write_with_schema` seguido de lectura con datos obsoletos | Cache Dataiku revierte UPDATE | NC-PG-01: usar _read_pg_direct() via SQLExecutor2 |
| Payload de Store > 100KB segun logs de red | Store con arrays de datos completos | NC-PG-02: usar _trim_result_for_store() |
| Test falla por element detached o stale | Componente recreado durante poll | NC-ASYNC-04: guard `if not n_prev and not n_next: raise PreventUpdate` |

---

## Salida obligatoria

### `analysis-report.md` (en la carpeta de ejecucion)

```markdown
# UI Test Analysis Report — YYYY-MM-DD_HH-MM-SS

## Estado de la ejecucion
- Estado: PASS | FAIL | PARTIAL | NO-ARTIFACTS
- Tests: N pass, N fail, N skip
- Duracion total: Xs

## Errores principales
(lista de los errores mas frecuentes con conteo)

## Candidatos NC detectados
(tabla con patron, evidencia en logs, recomendacion)

## Errores del backend
(lineas ERROR/WARNING del log del servidor)

## Recomendaciones
(lista de acciones concretas)
```

### Dict de resumen (para el orquestador)

```json
{
  "run_folder": "YYYY-MM-DD_HH-MM-SS",
  "status": "PASS | FAIL | PARTIAL | NO-ARTIFACTS",
  "test_counts": {"pass": 0, "fail": 0, "skip": 0},
  "top_errors": [{"message": "...", "count": 0, "type": "selector|auth|network|unknown"}],
  "nc_candidates": [{"pattern": "NC-ASYNC-01", "evidence": "...", "recommendation": "..."}],
  "backend_errors": [{"line": "...", "timestamp": "..."}],
  "recommendations": ["..."]
}
```

---

## Integracion con `nc-resolution-agent`

Si `nc_candidates` no esta vacio:
- Los candidatos alimentan el `nc-log.md` del requerimiento afectado con estado `open`.
- El `nc-resolution-agent` confirma o corrige la clasificacion antes de ejecutar correccion.
- No registrar NCs directamente sin pasar por el `nc-resolution-agent`.

---

## Cuando NO usar este agente

- Si `summary.json` no existe: ejecutar primero `ui-test-execution-agent`.
- Si se necesita solo el estado pass/fail sin diagnostico: leer `summary.json` directamente.
