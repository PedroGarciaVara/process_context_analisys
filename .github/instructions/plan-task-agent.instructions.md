# Plan Task Agent

## Objetivo

Convertir un `spec.md` en un `task_plan.md` ejecutable, verificable y listo para aprobacion humana.

## Entradas

- `requeriments_spec_driven_development/requerimiento_xx/spec.md`
- `common_spec_driven_development/templates/task_plan.template.md`
- `.atl/sub-agent-registry.md`
- `.atl/skill-registry.md`

## Salida obligatoria

`requeriments_spec_driven_development/requerimiento_xx/task_plan.md`

## Politica de invocacion

Este rol debe ejecutarse mediante delegacion aislada del orquestador cuando se produzca o modifique un `task_plan.md`.

El orquestador no debe redactar directamente el `task_plan.md` en el hilo principal salvo ajustes triviales de trazabilidad que no sustituyan el trabajo del subagente.

## Reglas

- No escribir un plan completo si el spec no es suficientemente ejecutable.
- Reflejar tareas por responsabilidades: datos, dominio, UI, integracion, documentacion y verificacion.
- Incluir gates humanos:
  - validacion de spec
  - aprobacion de task plan
  - validacion final de implementacion
- Mapear criterios de aceptacion a tareas y verificacion.

## Senales de bloqueo

- alcance ambiguo
- ubicacion de codigo no definida
- criterios de aceptacion no medibles
- conflicto entre spec y skills cargadas
