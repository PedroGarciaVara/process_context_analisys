# Task Plan - Requerimiento 08

> **Modo degradado:** este plan fue producido por el orquestador tras la
> autorizacion explicita del programador humano porque `requirements-agent` no
> pudo escribir el spec y `plan-task-agent` no fue ejecutado. Requiere revision
> humana durante Gate 2.

## Metadata
- Requirement ID: `requerimiento_08`
- Spec File: `./requeriments_spec_driven_development/requerimiento_08/spec.md`
- Status: `vencido`
- Owner: `orchestrator (degraded mode)`
- Created At: `2026-07-18`
- Last Updated: `2026-07-18`

## Objective

Consolidar el producto en la webapp Java, corregir el CRUD seleccionable,
reconstruir el modelo de analisis trazable, limpiar la base y dejar un fixture
automatizado para validar el flujo completo plantilla -> analisis.

## Scope

### In Scope
- Eliminacion de Dash del producto.
- CRUD seleccionable en las paginas Java y APIs necesarias.
- Reset transaccional de PostgreSQL.
- Modelo de maquinas tipo/registro/submaquina.
- Plantilla causal, apertura de analisis y trazabilidad de evidencia/conclusion.
- Fixture y pruebas automaticas/manuales del escenario completo.

### Out of Scope
- Nuevas paginas Dash o compatibilidad futura con Dash.
- Integraciones externas no necesarias para la ejecucion local.

## Dependencies
- `execute-agent` para la implementacion.
- Skills: `data-model-management`, `domain-logic`, `postgresql-primary-persistence`, `git-workflow`.
- PostgreSQL accesible mediante `config/settings.py`.

## Human Validation Gates
- Gate 1: spec aprobado por instruccion explicita de modo degradado; pendiente revision formal.
- Gate 2: plan aprobado por instruccion de comenzar implementacion; pendiente revision humana del detalle.
- Gate 3: validacion final humana obligatoria antes de `done`.

## Execution Strategy

1. Eliminar la superficie Dash y asegurar que Java queda como unico arranque.
2. Corregir esquema/migraciones y crear reset seguro.
3. Implementar dominio, repositorios y APIs de CRUD/maquinas/analisis.
4. Adaptar las vistas Java a seleccion, edicion, eliminacion y trazabilidad.
5. Crear fixture reproducible, ejecutar pruebas y preparar checklist manual.

## Tasks

### T1. Retirar Dash
- Goal: eliminar codigo ejecutable Dash y sus rutas de producto.
- Actions: localizar imports/arranques, retirar `app/` y `webapp_dash`, actualizar entrypoints/documentacion/tests.
- Output: Java como unico producto ejecutable.
- Status: `completed`

### T2. Reset e inicializacion PostgreSQL
- Goal: partir de una base vacia con DDL valido.
- Actions: corregir orden del DDL, crear script transaccional de reset y verificar secuencias/foreign keys.
- Output: `db/reset_db.py` o equivalente y esquema inicializable.
- Status: `completed`

### T3. Modelo y dominio de maquinas
- Goal: implementar tipos, registros y jerarquia de submaquinas.
- Actions: DDL, repositorios, servicios, endpoints y validacion de ciclos/eliminacion.
- Output: CRUD completo de tres niveles.
- Status: `in_progress`

### T4. CRUD seleccionable Java
- Goal: todas las tablas editables permiten seleccionar cualquier registro y operar update/delete.
- Actions: seleccionar filas, hidratar formularios, confirmar eliminacion, refrescar estado y cubrir procesos, maquinas, contratos y entidades causales.
- Output: UI y APIs consistentes.
- Status: `in_progress`

### T5. Plantilla y analisis trazable
- Goal: separar plantilla causal de resultados de analisis.
- Actions: modelo de analisis/resultados, evidencia/conclusion por causa e hipotesis, endpoints y flujo de apertura desde Java/Inicio.
- Output: reconstruccion completa del analisis.
- Status: `in_progress`

### T6. Presentacion y navegacion
- Goal: ocultar metadata/IDs y corregir enlaces de Inicio y detalle.
- Actions: actualizar renderers, paneles, rutas y textos; eliminar acciones de evaluacion en la plantilla.
- Output: UX Java conforme.
- Status: `in_progress`

### T7. Fixture y pruebas end-to-end
- Goal: validar el escenario solicitado sobre base limpia.
- Actions: crear proceso, maquina, contrato, arbol de 3 niveles/9 causas, 1-2 hipotesis por causa, abrir analisis, guardar resultados y reconstruir traza.
- Output: script/test reproducible y checklist manual Java.
- Status: `completed`

### T8. Verificacion y cierre
- Goal: preparar Gate 3.
- Actions: compileall, unittest/pytest, tests Java, reset/reseed, higiene de referencias Dash, prueba manual y reporte de evidencias.
- Output: `implementado_pendiente_validacion`.
- Status: `in_progress`

## Acceptance Criteria Traceability

| AC | Tasks |
| --- | --- |
| AC-01 | T1, T8 |
| AC-02 | T4, T8 |
| AC-03 | T2, T7, T8 |
| AC-04 | T3, T4, T8 |
| AC-05 | T5, T7 |
| AC-06 | T5, T6, T7 |
| AC-07 | T5, T7, T8 |
| AC-08 | T5, T6, T8 |
| AC-09 | T6, T8 |
| AC-10 | T7, T8 |

## Verification Plan

### Automatic
- `python3 -m compileall -q app db uc_bib_solv` mientras existan archivos legacy y, tras T1, solo `db` y `uc_bib_solv`.
- `python3 -m unittest discover -s tests`.
- Fixture contra PostgreSQL limpio y consultas de conteo/trazabilidad.
- Pruebas Java de seleccion/update/delete y rutas API.
- `rg` de imports y entrypoints Dash residuales.

### Manual
- Seleccionar primera, intermedia y ultima fila en cada tabla Java.
- Editar y eliminar con confirmacion y comprobar persistencia tras recarga.
- Crear plantilla, abrir analisis, completar resultados y reconstruir la traza.

## Risks
- El DDL actual tiene dependencias invalidas y FKs legacy.
- El repositorio `.git` no es valido en el workspace actual.
- El reset de base es destructivo y debe ejecutarse solo sobre la base configurada para desarrollo/pruebas.

## Closure Rule

No marcar `done` hasta que el programador humano valide Gate 3, el fixture pase y no existan no conformidades abiertas.
