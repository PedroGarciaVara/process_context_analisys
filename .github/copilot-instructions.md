# Copilot CLI - entrada del flujo SDD

Este repositorio usa un flujo SDD adaptado a Copilot CLI.

## Que debe hacer Copilot al recibir trabajo de desarrollo

1. Identificar si la peticion corresponde a:
   - captura de requerimientos
   - redaccion o validacion de spec
   - planificacion
   - implementacion
   - documentacion o contexto
2. Leer `.atl/sub-agent-registry.md` y `.atl/skill-registry.md`.
3. Aplicar las instrucciones detalladas de `.github/instructions/*.instructions.md`.
4. Mantener la separacion entre:
   - `requerimientos_cliente`
   - `spec.md`
   - `task_plan.md`
   - implementacion
5. Delegar cada fase SDD sustantiva al subagente correspondiente usando trabajo aislado o en segundo plano.
6. Limitar el hilo principal del orquestador a clasificacion, aclaraciones, lanzamiento de subagentes y consolidacion de resultados.

## Ubicaciones canonicas

- requerimientos brutos: `requerimientos_cliente/`
- traza de estados: `requerimientos_cliente/traza_requerimiento.md`
- specs y planes: `requeriments_spec_driven_development/requerimiento_xx/`
- plantillas: `common_spec_driven_development/templates/`

## Criterios de disciplina

- No improvisar un `spec.md` final sin resolver ambiguedades materiales.
- No improvisar un `task_plan.md` si el spec no es ejecutable.
- No implementar sin plan validado por humano cuando el trabajo sea sustantivo.
- No producir directamente en el hilo principal artefactos sustantivos si existe un subagente registrado para esa fase.
- Registrar las decisiones importantes en el propio artefacto.

## Pistas de uso para el programador humano

- Usa `/plan` para forzar una fase de planificacion.
- Usa `/tasks` para revisar tareas o subagentes en segundo plano.
- Usa `/instructions` para comprobar que Copilot esta leyendo las instrucciones del repositorio.
- Si quieres contexto global fuera del repositorio, ejecuta `common_spec_driven_development/instrucciones_sdd/setup_copilot_cli.ps1`.
