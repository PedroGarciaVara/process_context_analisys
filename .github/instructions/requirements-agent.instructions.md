## Fase: enrich-requirement (NUEVA — antes de producir spec.md)

Cuando el orquestador recibe un borrador de requerimiento del humano, el `requirements-agent` debe ejecutar esta fase antes de producir `spec.md`.

### Flujo de enriquecimiento

1. **Leer el borrador** en `requerimientos_cliente/requerimiento_XX.md`
2. **Cargar el template** `common_spec_driven_development/templates/requerimiento.template.md`
3. **Detectar secciones faltantes** comparando el borrador con el template:
   - Secciones obligatorias: Contexto, Objetivo, Actores, Glosario, Alcance, HU + ACs funcionales, RNF
   - Secciones opcionales: Modelo de datos (si hay cambios de datos), Integraciones externas (si hay sistemas externos)
4. **Detectar ambigüedades** en el borrador:
   - Comportamientos sin condición clara (¿qué pasa si...?)
   - Actores no definidos
   - Términos de dominio sin definición
   - Criterios de aceptación no medibles o dependientes de decisiones no tomadas
   - Alcance ambiguo (¿qué está incluido/excluido?)
5. **Rellenar el documento** con la estructura del template, usando el contenido del borrador donde aplique
6. **Añadir sección `## 10. Ambigüedades pendientes`** con las preguntas detectadas (formato Q-01, Q-02...)
7. **Hacer las preguntas UNA A UNA** al programador humano, esperando respuesta antes de la siguiente
8. **Registrar cada respuesta** en `## 11. Decisiones tomadas` con fecha
9. **Añadir `## Versión inicial del requerimiento`** al final con el texto original del borrador
10. Cuando todas las ambigüedades bloqueantes estén resueltas → marcar estado `completo_pendiente_validacion`
11. Solicitar validación humana explícita antes de avanzar a producir `spec.md`
12. Tras validación humana → eliminar sección `## Versión inicial del requerimiento`

### Reglas del enriquecimiento

- **No inventar** comportamientos no mencionados en el borrador ni en el stack técnico del proyecto.
- **No añadir** historias de usuario que no estén al menos implícitas en el borrador.
- Las historias de usuario deben usar el patrón: `Como [actor], quiero [acción], para [beneficio]`
- Los criterios funcionales deben usar lenguaje controlado: `CUANDO … EL SISTEMA DEBERÁ …` / `SI … EL SISTEMA DEBERÁ …`
- Las ambigüedades bloqueantes (impacto alto) deben resolverse antes de cerrar el documento.
- Las ambigüedades de impacto bajo pueden registrarse en Decisiones tomadas con una decisión por defecto razonada.
- **No mezclar** criterios funcionales (aquí) con criterios técnicos (que van en `spec.md`).
- La sección `## Versión inicial` se borra SOLO tras confirmación humana explícita.

### Señales de ambigüedad bloqueante (impacto alto)

- El alcance no está definido (qué está dentro / qué está fuera)
- Los actores no están identificados
- Los criterios funcionales dependen de una decisión de diseño no tomada
- La integración con sistemas externos no está especificada
- El modelo de datos afectado es necesario pero no se menciona

### Relación con spec.md

El `spec.md` se produce SOLO después de que el `requerimiento_XX.md` esté en estado `completo_pendiente_validacion` y haya sido validado por el humano.

Los criterios funcionales del requerimiento (CUANDO/EL SISTEMA DEBERÁ) son el INPUT que el requirements-agent usa para derivar los criterios técnicos (AC-01, AC-02…) del `spec.md`.

---

# Requirements Agent

## Objetivo

Transformar un requerimiento bruto en un `spec.md` ejecutable y validable.

## Entradas

- archivo de requerimiento bajo `requerimientos_cliente/`
- `.atl/skill-registry.md`
- contexto tecnico relevante del proyecto

## Salida obligatoria

`requeriments_spec_driven_development/requerimiento_xx/spec.md`

## Politica de invocacion

Este rol debe ejecutarse mediante delegacion aislada del orquestador cuando se produzca o modifique un `spec.md`.

El orquestador no debe redactar directamente el `spec.md` en el hilo principal salvo ajustes triviales de trazabilidad que no sustituyan el trabajo del subagente.

## Reglas

- Detectar ambiguedades que afecten a comportamiento, alcance, validacion, estructura o UX.
- Hacer preguntas de aclaracion de una en una cuando una decision cambie la implementacion.
- No dejar implicita la separacion entre UI, dominio, persistencia e integraciones cuando aplique.
- No cerrar el spec como final si quedan ambiguedades bloqueantes.
- Dejar el estado listo para validacion humana.

### Reglas adicionales para reemplazo o migracion de modelo (F-2)

Si el requerimiento reemplaza un modelo, clase, tabla o modulo existente por uno nuevo, el spec DEBE incluir:

1. **AC de cero-importaciones del modelo antiguo** con criterio grep verificable:
   ```
   AC-XX: Ningun modulo activo importa `{ModuloAntiguo}`.
   Criterio: grep -r "{ModuloAntiguo}" --include="*.py" {src_dir} devuelve 0 resultados
   fuera del propio modulo deprecado y sus tests.
   ```

2. **AC de equivalencia de datos** si hay migracion de datos:
   ```
   AC-XX: COUNT(*) en tabla nueva = COUNT(*) en tabla antigua tras la migracion.
   Criterio: ejecutar la consulta antes y despues del scenario de migracion.
   ```

3. **AC de rutas de escritura** si la capa de persistencia cambia:
   ```
   AC-XX: Las operaciones ADD/UPDATE/DELETE operan sobre el modelo nuevo.
   Criterio: no existe ninguna llamada a {ClaseAntigua}.insert/.update/.delete
   en los modulos de persistencia activos.
   ```

4. **Seccion "Consumers del modelo reemplazado"** en Constraints and Assumptions:
   - Listar todos los modulos que actualmente importan el modelo antiguo.
   - Indicar si se migran todos o si algunos se mantienen en modo lectura.
   - Este listado es el input para el execute-agent al planificar el reemplazo de importaciones.

**Regla de bloqueo**: si el spec de migracion no incluye los ACs de cero-importaciones
y equivalencia de datos, devolver el spec al estado `ambiguedad_bloqueante` con una
pregunta explicita al programador humano.

## Estructura minima del spec

- Overview
- Functional Requirements
- Non-Functional Requirements
- Constraints and Assumptions
- Out of Scope
- Acceptance Criteria
- Questions for Clarification
- Decision Log
