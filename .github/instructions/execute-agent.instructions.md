# Execute Agent

## Objetivo

Implementar el trabajo definido en un `task_plan.md` aprobado, manteniendo conformidad con el `spec.md`.

## Entradas

- `requeriments_spec_driven_development/requerimiento_xx/task_plan.md`
- `requeriments_spec_driven_development/requerimiento_xx/spec.md`
- skills relevantes listadas en `.atl/skill-registry.md`

## Resultado esperado

- cambios de codigo y estructura
- evidencia de validacion
- lista de bloqueos o no conformidades si aparecen

## Politica de invocacion

Este rol debe ejecutarse mediante delegacion aislada del orquestador para implementaciones sustantivas.

El orquestador no debe absorber la implementacion tecnica sustantiva en el hilo principal si existe este rol como responsable de la fase.

## Reglas

- No saltarse tareas ni cambiar alcance sin elevarlo.
- Reutilizar patrones existentes antes de crear nuevos modulos.
- Verificar build, tests o chequeos existentes cuando aplique.
- Si detectas una desviacion respecto al spec, reportar no conformidad en vez de ocultarla.

## Modelos de datos en el execute-task

Si el `task_plan.md` incluye tareas de modelo de datos, el agente NO debe ejecutar
CREATE TABLE ni ALTER TABLE directamente. En su lugar:

1. Crear o modificar el dataset en Dataiku DSS (schema + conexion).
2. Si se necesita DDL custom (indices, constraints, tablas sin dataset):
   - Escribir el DDL en `{main_module}/scenarios_Dataiku/scenarios_sdd/despliegue_modelos.py`
     dentro de `create_update_data_models()`.
3. Marcar las tareas de modelo de datos como listas para la fase `deploy-data-models`.
4. Reportar al orquestador que hay tareas DATA pendientes de despliegue.

El orquestador activara `deploy-data-models` (via `data-model-deploy-agent`) despues
de que `execute-task` complete. Solo entonces se ejecutaran los CREATE/ALTER TABLE.

### Senales de tarea DATA en el task_plan

- Prefijo `DATA:` en el titulo de la tarea
- Etiqueta `[modelo-datos]`
- Menciones de: CREATE TABLE, ALTER TABLE, nuevo modelo, nueva entidad,
  `despliegue_modelos.py`, `ddl_generator`, schema DSS

## Checklist de higiene pre-commit (F-1)

Antes de marcar una tarea como completada y proponer el commit, el agente debe
escanear los archivos modificados en busca de artefactos de depuracion.

### Comando de escaneo obligatorio

```powershell
# Ejecutar sobre los archivos .py modificados en esta tarea
git diff --name-only HEAD | Where-Object { $_ -match '\.py$' } | ForEach-Object {
    Select-String -Path $_ -Pattern 'print\(|# DEBUG|# FIXME|# TODO|breakpoint\(\)|pdb\.set_trace\(\)|pdb\.post_mortem\(\)' -CaseSensitive:$false
}
```

O con grep si el entorno lo soporta:

```bash
git diff --name-only HEAD | grep '\.py$' | xargs grep -n "print(\|# DEBUG\|# FIXME\|# TODO\|breakpoint()\|pdb\." 2>/dev/null
```

### Patrones que deben resolverse antes del commit

| Patron | Accion requerida |
|--------|-----------------|
| `print(` | Reemplazar por `logger.debug()` o eliminar si es traza temporal |
| `# DEBUG` | Eliminar la linea o el bloque de debug |
| `# FIXME` | Resolver o crear issue — no commitear FIXME sin decision |
| `# TODO` | Si es trabajo aplazado, registrar en `task_plan.md` antes de commitear |
| `breakpoint()` | Eliminar obligatoriamente — rompe ejecucion en produccion |
| `pdb.set_trace()` | Eliminar obligatoriamente |
| `pdb.post_mortem()` | Eliminar obligatoriamente |

### Excepciones permitidas

- `# TODO(req-XX):` con referencia explicita al requerimiento y fecha: se puede commitear
  si queda registrado en el `task_plan.md` del requerimiento correspondiente.
- `print(` en archivos `scripts/` o `tests/` de ejecucion local: aceptable si el archivo
  no se importa desde codigo de produccion.

### Regla de cierre de tarea

Una tarea del `task_plan.md` NO puede marcarse como `done` si el escaneo devuelve
hits en archivos de produccion (`webapps/`, `ModeloDatos/`, `persistencia_dataset_dss/`,
`control_capacity/`, `scenarios_Dataiku/`).

---

## Checklist de reemplazo de modelo (F-2)

Cuando una tarea implica **reemplazar o deprecar un modelo, clase o modulo existente**,
el agente debe verificar que el `spec.md` incluye un AC de cero-importaciones.

### Verificacion previa a la tarea

Antes de iniciar la tarea de reemplazo:

1. Identificar el nombre del modelo/modulo antiguo (p.ej. `UC121_Limits`, `OldCache`, `legacy_model`).
2. Verificar que el `spec.md` del requerimiento contiene un AC con criterio grep:

```
AC-XX: Ningun modulo activo importa `{ModuloAntiguo}`.
Criterio de verificacion: `grep -r "{ModuloAntiguo}" --include="*.py" {src_dir}` devuelve 0 resultados
en archivos que no sean el propio modulo deprecado ni los tests del modulo deprecado.
```

Si ese AC no existe, **escalar al requirements-agent** antes de implementar.

### Verificacion al cerrar la tarea

```powershell
# Ejemplo para UC121_Limits
$hits = Get-ChildItem -Path . -Filter "*.py" -Recurse |
    Select-String -Pattern "from.*UC121_Limits|import.*UC121_Limits" |
    Where-Object { $_.Path -notmatch "UC121_Limits\.py|test_UC121_Limits" }
if ($hits.Count -gt 0) {
    Write-Warning "BLOQUEADO: $($hits.Count) archivos aun importan el modulo antiguo"
    $hits | Format-Table Path, LineNumber, Line
}
```

Si quedan importaciones, la tarea NO puede cerrarse — es una NC de implementacion.

---



Cargar skill `git-workflow` antes de producir cualquier commit.

- **Verificar el git root antes de cualquier operacion git:** ejecutar `git rev-parse --show-toplevel`.
  En proyectos Dataiku el git root suele ser el modulo Python principal, no el directorio padre.
  Si `.git` no existe, seguir el protocolo de inicializacion de la skill `git-workflow`.
- **Verificar autenticacion HTTPS** si el entorno es corporativo con SSH deshabilitado.
  Ver seccion "Autenticacion HTTPS en entornos corporativos" de la skill `git-workflow`.
- Hacer un commit por cada tarea completada del `task_plan.md` (commits atomicos).
- Proponer mensaje al humano antes de ejecutar: `<tipo>(req-XX): <descripcion>`.
- `git add` solo con archivos especificos, nunca `git add .` sin revisar `git status`.
- No hacer `git push` directamente — el push lo gestiona el orquestador en `git-push-main` (fase 6).
- Si la tarea incluye cambios en `create_update_data_models()`, hacer commit separado `data(req-XX)` y luego `chore: limpiar create_update_data_models [skip ci]` tras el deploy.

### Orden obligatorio git push → GIT_DEPLOY → PUBLISH_DATA_MODELS

El agente NO debe trigger GIT_DEPLOY antes de que el push haya llegado al remoto,
ni lanzar PUBLISH_DATA_MODELS antes de GIT_DEPLOY.
El orden correcto es:
1. `git push origin main` — el codigo llega al remoto
2. `GIT_DEPLOY` — DSS hace `git pull` y actualiza la libreria de codigo activa
3. `PUBLISH_DATA_MODELS` (si hay modelos de datos) — ahora ejecuta con el codigo nuevo

Ver skill `git-workflow` seccion "Orden obligatorio de operaciones con Dataiku CI/CD".

### Tipos de commit por tipo de tarea

| Tarea en task_plan | Tipo de commit |
|--------------------|----------------|
| Nueva funcionalidad | `feat(req-XX)` |
| Bug fix o correccion | `fix(req-XX)` |
| Nuevo modelo de datos | `data(req-XX)` |
| Refactor sin cambio funcional | `refactor(req-XX)` |
| Nuevo test o actualizacion de test | `test(req-XX)` |
| Solo documentacion | `docs(req-XX) [skip ci]` |
