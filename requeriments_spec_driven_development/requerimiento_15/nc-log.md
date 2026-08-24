# NC Log — requerimiento_15

## Metadata
- Requirement ID: `requerimiento_15`
- Spec File: `./requeriments_spec_driven_development/requerimiento_15/spec.md`
- Task Plan: `./requeriments_spec_driven_development/requerimiento_15/task_plan.md`
- Created At: `2026-08-17`
- Last Updated: `2026-08-20`

---

## Estado de cierre del requerimiento

Estado actual de NCs: `NCs resueltas`

Las NC-001 y NC-002 están resueltas. Gate 3 fue aprobado por el programador
humano el 2026-08-20 y el requerimiento queda `done`.

---

## Registro de No Conformidades

### NC-001

| Campo | Valor |
|-------|-------|
| **ID** | NC-001 |
| **Fecha deteccion** | 2026-08-17 |
| **Detectado por** | `validate-implementation` — auditoría independiente T1 |
| **Descripcion** | La evidencia T1 no es conforme: el inventario/evidencia reporta 20 tablas aunque `db_management/schema.sql` contiene 23 declaraciones `CREATE TABLE IF NOT EXISTS`; `t1_migration_matrix.csv` declara 8 columnas pero sus filas contienen 11 campos sin quoting válido; y no existe atribución temporal reproducible de cambios productivos porque el worktree ya contenía numerosos untracked, deletions y modificaciones. |
| **Comportamiento esperado** | Los cuatro artefactos T1 deben ser internamente consistentes, reproducibles y limitar explícitamente la atribución de cambios al alcance de T1, sin modificar código funcional ni archivos ajenos. |
| **Comportamiento observado** | Conteo de tablas incorrecto (20 vs 23), CSV estructuralmente inválido (8 cabeceras vs 11 campos por fila) y evidencia de cambios productivos no atribuible de forma robusta al intento T1. |
| **Causa raiz** | `implementation` — generación del artefacto T1 |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `resolved` |
| **Validacion de cierre** | `AUDIT_PASS` — auditoría independiente T1; cierre humano explícito confirmado el 2026-08-17 |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-08-17 | Auditoría independiente T1 registró las tres discrepancias y clasificó la causa raíz como `implementation`. Se inicia intento de corrección 1 con `execute-agent`, limitado a `t1_scoped_inventory.md`, `t1_evidence.md`, `t1_migration_matrix.csv` y/o `t1_phase_allowlist.md`. | `corrección en curso; auditoría posterior pendiente` |
| 2026-08-17 | Auditoría independiente posterior T1: `AUDIT_PASS`. Verificados los cuatro artefactos: conteo de 23 tablas, CSV con 8 campos en cabecera y filas, y delimitación temporal reproducible sin atribuir cambios preexistentes. El programador humano confirmó explícitamente el cierre de NC-001 y la continuación de todas las tareas. | `resolved` |

### NC-002

| Campo | Valor |
|-------|-------|
| **ID** | NC-002 |
| **Fecha deteccion** | 2026-08-17 |
| **Detectado por** | `validate-implementation` — auditoría independiente T2 |
| **Descripcion** | La implementación de los validadores arquitectónicos T2 no cumple completamente el contrato de diagnósticos y excepciones: los diagnósticos de estructura, naming de path y duplicidad no incluyen línea explícita, y la función `_allowlisted` no se utiliza para aplicar las excepciones allowlisted. |
| **Comportamiento esperado** | Conforme a `spec.md` AC-02–AC-04, AC-10 y `task_plan.md` T2, cada diagnóstico aplicable debe contener explícitamente archivo, línea, regla, origen, destino y mensaje; las excepciones documentadas deben evaluarse mediante la allowlist autorizada. |
| **Comportamiento observado** | `check_structure`, el diagnóstico de naming de path y `check_duplicate_implementations` emiten línea `0`/no explícita; `_allowlisted` está definida pero no es invocada por el flujo de validación. T2 permanece `blocked`. |
| **Causa raiz** | `implementation` — implementación de los validadores T2 |
| **Punto de re-entrada** | `execute-agent` |
| **Intento** | `1 de 2` |
| **Estado** | `resolved` |
| **Validacion de cierre** | `AUDIT_PASS técnico 2026-08-19; confirmación humana explícita "continuar con T3" el 2026-08-19` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-08-17 | Auditoría independiente T2 registró la ausencia de línea explícita en diagnósticos de estructura, naming de path y duplicidad, además del no uso de `_allowlisted`. Se clasifica la causa raíz como `implementation` y se inicia el intento de corrección 1; T2 queda bloqueada. | `corrección pendiente; requiere execute-agent y nueva validación de T2` |
| 2026-08-18 | `execute-agent` reanudó exactamente en T2/NC-002, intento 1: verificó el código existente, confirmó líneas explícitas, invocación efectiva de `_allowlisted`, determinismo y allowlists; no hubo cambios funcionales. Ejecutó checks del producto, fixtures negativos, comprobación directa y compilación. | `verificación técnica conforme; NC-002 sigue in_correction hasta auditoría independiente de cierre` |
| 2026-08-19 | `execute-agent` corrigió únicamente los fallbacks de línea de diagnósticos y amplió la prueba de allowlist legacy; repitió checks CLI, seis fixtures negativos, 11 pruebas directas y compilación. `pytest` sigue no disponible en el entorno. | `corrección técnica preparada; NC-002 sigue in_correction y T2 blocked hasta auditoría independiente` |
| 2026-08-19 | Auditoría independiente de cierre: checks CLI de estructura, naming, dependencias, concrete-implementations y combined mode pasan con exit `0` en la raíz de producto; los seis fixtures inválidos (`invalid_structure`, `invalid_naming`, `invalid_dependencies`, `invalid_cross_domain`, `invalid_concrete`, `invalid_combined`) devuelven exit `1`; cada `Diagnostic` emitido tiene `file` no vacío, `line > 0`, `rule`, `origin`, `target` y `message` no vacíos; la salida renderizada coincide con la salida ordenada; allowlist directa: ruta/repositorio legacy `true`, ruta del módulo objetivo `false`; instrumentación monkeypatch de `runner._allowlisted` registra 7 llamadas durante naming/dependencies/concrete; `compileall` de validator/tests de arquitectura y parseo AST pasan. `pytest` no puede ejecutarse: `/usr/bin/python3: No module named pytest`. | `AUDIT_PASS técnico: la desviación original queda demostrablemente corregida; cierre humano posterior registrado en la siguiente entrada` |
| 2026-08-19 | Confirmación humana explícita: `continuar con T3`. | `NC-002 resolved; Gate 2 aprobado; T2 desbloqueada` |

---

## Tabla resumen

| NC | Causa raiz | Estado | Punto re-entrada | Cierre |
|----|------------|--------|-----------------|--------|
| NC-001 | `implementation` | `resolved` | `execute-agent` | `AUDIT_PASS` + cierre humano 2026-08-17 |
| NC-002 | `implementation` | `resolved` | `execute-agent` | `AUDIT_PASS técnico 2026-08-19 + confirmación humana explícita 2026-08-19; intento 1 de 2; T2 desbloqueada` |
