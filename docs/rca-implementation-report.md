# RCA — informe de integración, regresión y handoff (T14/NC-013)

Fecha: 2026-09-12  
Requirement: `RCA-UI-ARBOLES-ANALISIS`  
Estado: **implementado_pendiente_validacion**. Este informe no marca `done`: la validación final humana sigue pendiente.

## Alcance y delegación

El estado documentado corresponde al handoff de integración y a la resolución de NC-013. Se revisaron el `plan.md`, el contrato de reparenting, la auditoría de UI, el registro de NC, la revisión visual T13, las capas RCA, la migración/schema, la auditoría DB read-only, la confirmación live y las pruebas focales. Esta documentación no altera código, tests, migraciones, base de datos ni servidor.

La ejecución corresponde al sub-agente `execute-agent`, en sesión delegada aislada, con contexto T14 y entradas RCA indicadas por el orquestador. Se cargó la política `gpt-5.6-luna` con `model_reasoning_effort=medium`; skills aplicadas: `domain-logic`, `data-model-management`, `postgresql-primary-persistence`, `git-workflow` y revisión UI (`web-design-guidelines`/`frontend-design`).

## Matriz de pruebas y controles

| Área | Comando/evidencia | Resultado |
|---|---|---|
| Unit/integration RCA | Matriz RCA focal autorizada con `.venv` y `PYTHONPATH=.` | **24 tests Python + 9 subtests**, 0 fallos |
| Contratos JS RCA | Matriz RCA contractual autorizada con `node --test` | **16 passed**, 0 fallos |
| `git diff` | `git diff --check` | **PASS**, sin whitespace errors |
| Producción RCA | `rg '(print\(|debugger\b|console\.log|FIXME)'` sobre módulos RCA, APIs, componentes RCA, vistas y CSS | **Sin coincidencias de debug**; el resultado textual `class` de `routes.py` no es un hallazgo |
| Arquitectura segura | Controles de límites y subtests incluidos en la matriz NC-013 | **9 subtests pasados**; nombres y baseline de schema verificados. |

La invocación inicial con `pytest` del PATH falló porque no existe el comando global (`pytest: command not found`); la misma matriz se ejecutó correctamente con el intérprete del proyecto `.venv` y `PYTHONPATH=.`.

## Evidencia E2E/UI y confirmación live

La confirmación live autorizada se ejecutó contra el backend 8050 reiniciado con el código nuevo (PID de validación `759818`; ese proceso terminó al cerrar la sesión). La evidencia está en `.playwright-artifacts/rca-move-live-confirm/20260912T162739Z/`:

- `causa_02_01` (`id=366`) pasó de `parent_id=365` a `parent_id=364` (`causa_01`) mediante `PATCH 200`.
- La versión pasó de `1` a `2`; la relación primaria `CAUSES` quedó con `id=7052`.
- Se creó auditoría `id=a668...` con correlation ID `c81a...`; la recarga confirmó el nuevo padre.
- El feedback de UI **Nuevo padre** fue **PASS**.
- Tras cerrar la sesión, el orquestador restauró 8050 como runtime persistente independiente: PID operativo actual `782978`, PPID `1566`, SID `782978`, comando `.venv/bin/python uc_bib_solv/local_server.py`, debug desactivado. Health `ready/status ok` y `GET` del árbol confirman `causa_id=366`, `parent_id=364`, `version=2`.

El movimiento live ya no está omitido. El fixture científico live continúa omitido porque no existe un endpoint seguro de preparación y limpieza. La ejecución aislada T12 v3 en 8051 se conserva como evidencia complementaria:

- `.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/playwright.stdout.log`: **12 passed, 1 skipped**, 13 tests, 20.7 s; el stdout y `run-meta.txt` indican salida 0.
- El único caso omitido sigue siendo el fixture científico live; no se trata como PASS de integración científica.
- Los `ac-results.json` bajo `.../rca-final-e2e-v3/20260912T100758Z/` confirman MOVER-01/02/04, DATA-01, ERROR-01, RCA-01/02, RESP-01 en 1440/1280/768/390/200%, A11Y-01 y NC-VIS-05.
- Se revisaron los logs de consola/request failures de los lotes finales: los 409/500/503 son errores esperados de los escenarios; el `request-failures.log` responsive queda vacío, mientras el lote científico registra `PATCH .../parent net::ERR_ABORTED` en el escenario 409/ciclo esperado.
- `docs/rca-visual-review.md` declara **PASS visual técnico T13 v3** para NC-VIS-01..06. El cierre formal de NCs y la validación humana siguen pendientes; tampoco se ejecutaron axe/Lighthouse ni lector de pantalla.

## Capas, archivos y contratos revisados

La implementación conserva la separación prevista: reglas/invariantes y excepciones en `modules/rca_tree/domain`; casos de uso/puertos en `application`; transacción y repositorios PostgreSQL en `adapters/outbound/postgres`; wiring en `infrastructure`; HTTP en `adapters/inbound/http/routes.py`; adaptadores de API/UI en `webapp/js`. La operación `PATCH /api/rca-tree/causes/{cause_id}/parent` exige `parent_id`, `expected_version` y `reason`, añade correlation ID y traduce not-found/estado/validación a respuestas diferenciadas. La UI de comando y drag/drop convergen en el mismo evento/payload y el drop no persiste por sí solo.

Los endpoints RCA existentes de nodos, detalle, CRUD de causas/hipótesis, reusable nodes y análisis se mantienen bajo `/api/rca-tree/...`; el nuevo PATCH es aditivo. La búsqueda del código no encontró una segunda familia conceptual de endpoints legacy para reparenting o análisis que compita con este contrato. La revisión no autoriza afirmar compatibilidad con rutas externas no presentes en el repositorio.

## Esquema live, despliegue y rollback

El estado vigente del esquema se define en `db_management/schema.sql` y se
despliega exclusivamente mediante `db_management/init_db.py`. El DDL conserva
operaciones aditivas/idempotentes (`IF EXISTS`/`IF NOT EXISTS`) y recreación
controlada de constraints/triggers para instalaciones existentes; no existe ya
una migración incremental separada que deba ejecutarse antes o después.

La auditoría DB read-only confirmó equivalencia estructural completa en live:
`causa.version`, tabla de auditoría, trigger append-only, índices, foreign keys y
campos científicos. No existe un ledger que pruebe qué archivo o ejecución
concreta aplicó el esquema; la auditoría confirma el resultado, no su
procedencia. El runtime persistente actual de 8050 es el PID `782978` (PPID
`1566`, SID `782978`), con debug desactivado; health `ready/status ok` y el GET
del árbol confirman `causa_id=366`, `parent_id=364`, `version=2`.

No existe un rollback ejecutable seguro en el repositorio. No hay `reset_db.py`
ni `DROP` automático: una reversión requiere backup, revisión de consumidores y
operación explícita posterior. Las futuras modificaciones deben repetir la
auditoría read-only y consolidarse en `schema.sql` para evitar divergencias.

## Solapamientos, riesgos y pendientes

- El diff global contiene numerosos cambios BPM/otros módulos ajenos a T14; se preservaron. La revisión de RCA confirma un diff amplio en UI/CSS compartidos, por lo que la aprobación humana debe comprobar el alcance final antes de integrar.
- Las dos correcciones arquitectónicas atómicas de T14 pasan el control seguro; no quedan fallos arquitectónicos focales pendientes.
- El movimiento live está confirmado con PATCH, persistencia, auditoría y reload; sólo queda omitido el fixture científico live por falta de endpoint de preparación seguro y limpiable.
- Las seis NC visuales tienen PASS técnico en T13 v3; su cierre formal y la validación humana siguen pendientes. La migración live y el restart del backend ya están confirmados; debe conservarse la comprobación read-only porque no existe ledger de procedencia.
- No se hizo commit ni push. El árbol de trabajo ya estaba sucio con cambios previos; esta fase sólo actualiza documentación autorizada.

## Conclusión de handoff

La regresión focal RCA pasa: **24 tests Python + 9 subtests**, **16 Node** y `git diff --check`; la evidencia live confirma movimiento, auditoría y reload, y el único skip restante es el fixture científico live. La entrega queda en **implementado_pendiente_validacion**, condicionada a validación humana y cierre formal de NCs; no se marca `done`.
