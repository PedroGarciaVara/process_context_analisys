# Especificación técnica — Fuente de contexto BPM y escritura mediante agent_tools en TEST

## Overview

- **Requerimiento:** `requerimiento_13`.
- **Objetivo:** crear y validar en TEST una fuente de contexto BPM que conserve las capacidades de lectura y exponga, mediante una superficie `agent_tools` equivalente y trazable, las operaciones de escritura ya existentes en las rutas actuales para las siete áreas operativas confirmadas.
- **Estado:** `vencido` — requisito inicial reformulado; no continuar este flujo.
- **Actores:** usuario humano y agente, mediante las interfaces existentes y la superficie `agent_tools` equivalente.
- **Alcance:** seis tipos BPM actuales (`input`, `output`, `operation`, `subprocess`, `decision` y `stock`), capacidades de lectura existentes y operaciones de escritura ya existentes en las rutas actuales para BPM, procesos, contratos, máquinas, árboles, hipótesis y análisis.

## Requisitos funcionales

### FR-01. Crear y validar contexto BPM

1. El backend deberá aceptar los seis tipos actuales mediante sus modelos y validaciones existentes.
2. Una descripción vacía será válida cuando el contrato de validación existente lo permita.
3. No se añadirá catálogo ni versionado de `incomplete_reason`.
4. No se inventarán descripciones ni se presentarán inferencias como hechos.

### FR-02. Conservar contexto, procedencia y trazabilidad

1. El sistema conservará de forma simple el contexto y la procedencia disponible, incluido `actor` y `trace_id` cuando los proporcionen las interfaces existentes.
2. Los datos incompatibles se conservarán separados, con sus procedencias disponibles y una marca de incompatibilidad.
3. No se implementarán fusión, prioridad automática, scoring ni resolución automática de conflictos.
4. La trazabilidad deberá permitir asociar cada operación de lectura o escritura con el actor y el `trace_id` disponibles, sin generar valores ficticios ni persistir secretos.

### FR-03. Guardar y dejar disponible

1. Guardar un contexto válido deberá dejarlo disponible/publicado directamente para los consumidores autorizados, conforme al contrato actual.
2. No se añadirán estados `draft`, `review` ni `approved`, ni un workflow separado de publicación o aprobación.
3. Se permitirán peticiones repetidas sin una capa adicional de idempotencia.

### FR-04. Superficie agent_tools para escritura existente

1. La superficie `agent_tools` equivalente deberá exponer las operaciones de escritura ya existentes en las rutas actuales, preservando sus contratos de entrada, salida, validación, permisos efectivos, persistencia y errores observables.
2. No se inventan endpoints ni nombres concretos de tools en este spec. La correspondencia exacta entre cada operación de escritura existente y la superficie `agent_tools` se determinará por inspección de las rutas actuales durante la implementación, sin crear una segunda arquitectura.
3. La superficie deberá cubrir exactamente estas siete áreas de escritura:

| Área | Cobertura medible requerida |
|---|---|
| BPM `process_modeling` | Exponer las operaciones de escritura BPM ya existentes en sus rutas actuales, incluyendo los seis tipos BPM y sus validaciones vigentes. |
| Procesos | Exponer las operaciones de alta, modificación y eliminación que ya existan para procesos, conservando el contrato vigente de cada operación aplicable. |
| Contratos | Exponer las operaciones de alta, modificación y eliminación que ya existan para contratos, conservando sus validaciones y asociaciones actuales. |
| Máquinas | Exponer las operaciones de alta, modificación y eliminación que ya existan para máquinas, conservando sus validaciones y relaciones actuales. |
| Árboles | Exponer las operaciones de escritura ya existentes para árboles, nodos y relaciones, sin alterar la semántica vigente de navegación o vinculación. |
| Hipótesis | Exponer las operaciones de escritura ya existentes para hipótesis y sus datos/evidencias asociados cuando formen parte del contrato actual. |
| Análisis | Exponer las operaciones de escritura ya existentes para sesiones, participantes, resultados y detalles de análisis cuando formen parte del contrato actual. |

4. La cobertura de cada área será verificable mediante una matriz de correspondencia operación existente → operación expuesta en `agent_tools`, con resultado, validación, permiso efectivo, persistencia y `trace_id` documentados en la evidencia de implementación. La matriz no autoriza nombres nuevos ni operaciones que no existan en las rutas actuales.
5. Todas las capacidades de lectura actuales deberán conservarse sin reducción y deberán seguir disponibles con sus contratos y permisos efectivos vigentes.

### FR-05. Autorización y responsabilidades

1. La escritura mediante `agent_tools` no crea autorización nueva: cada operación se someterá a las validaciones actuales del backend y al mismo mecanismo de permisos efectivo de la ruta actual equivalente.
2. No se añadirán roles, scopes, políticas RBAC paralelas, bypass de permisos ni autorización adicional específica para agentes.
3. El backend/dominio será la autoridad final para validación, permisos, reglas de negocio, persistencia y trazabilidad.
4. El frontend será un adaptador de captura, invocación y presentación: mostrará formularios y resultados, aplicará únicamente validaciones de presentación no contradictorias y nunca podrá sustituir las validaciones o permisos del backend.
5. La UI y los mensajes visibles para el usuario estarán en español.

### FR-06. Persistencia y fronteras técnicas

1. Se reutilizarán los módulos y fronteras frontend/backend/dominio/persistencia existentes; no se creará una arquitectura paralela.
2. La lógica de conexión seguirá en la capa de conexión/configuración PostgreSQL existente; la lógica de modelo, repositorio y DDL seguirá en los componentes existentes de persistencia y `db/schema.sql` o equivalente vigente.
3. El dominio y los servicios existentes conservarán la responsabilidad de reglas y casos de uso; las rutas actuales seguirán adaptando HTTP y `agent_tools` será una superficie equivalente, no un nuevo origen de reglas.
4. Se reutilizarán conexión, modelos, repositorios y persistencia existentes, sin migración destructiva, eliminación de modelos antiguos ni rediseño de esquema.
5. Solo se modificarán componentes existentes o se añadirán piezas estrictamente necesarias para exponer las operaciones existentes y demostrar el flujo, sin crear tablas o campos por anticipado.

### FR-07. Errores observables y no filtración de secretos

1. Las operaciones expuestas deberán devolver los errores observables que ya defina el contrato actual: resultado de éxito o fallo, indicación de validación/autorización/no encontrado/conflicto/error interno cuando corresponda y el formato de respuesta ya utilizado por la ruta equivalente.
2. Los errores de validación y permisos deberán ser distinguibles por el consumidor sin revelar detalles internos innecesarios; los mensajes visibles estarán en español cuando sean mensajes de usuario.
3. Los errores, respuestas, trazas y logs no deberán incluir contraseñas, tokens, claves, secretos de conexión ni payloads confidenciales fuera de lo estrictamente permitido por las interfaces existentes.
4. Ante un fallo, el sistema deberá conservar el `trace_id` disponible para diagnóstico sin exponer secretos y deberá evitar presentar como persistida una escritura que el backend haya rechazado.

## Requisitos no funcionales

- La validación operativa se limitará al entorno TEST y a un máximo de 20 usuarios/agentes concurrentes.
- La retención será indefinida solo si ya está prevista por la persistencia existente; no se añadirá una política nueva.
- La trazabilidad será reproducible por operación mediante `actor` y `trace_id` cuando estén disponibles, sin inventar identidad ni almacenar secretos.
- La exposición de escritura deberá conservar los contratos y validaciones actuales, sin introducir una superficie de privilegio adicional.

## Restricciones y supuestos confirmados

- AMD-001 es una enmienda de tipo B: modifica el alcance y los requisitos del `spec.md`, requiere Gate 1 y deja el estado `spec_pendiente_validacion` hasta validación humana.
- La decisión humana confirmada es exponer mediante `agent_tools` equivalentes todas las operaciones de escritura ya existentes en las rutas actuales para las siete áreas enumeradas, usando únicamente las validaciones actuales del backend.
- La exposición no crea autorización nueva y usa el mismo mecanismo de permisos efectivo de las rutas actuales; no se añaden roles ni scopes.
- No se inventan endpoints ni nombres concretos de tools; se preservan los contratos existentes y la superficie equivalente se trazará durante la implementación.
- Se mantienen los seis tipos BPM y sus validaciones actuales.
- Las descripciones pueden estar vacías cuando el contrato vigente lo permita y no se añade catálogo/versionado de `incomplete_reason`.
- Guardar equivale a dejar disponible/publicado directamente conforme al comportamiento actual, sin workflow de publicación.
- Las incompatibilidades no se fusionan ni se resuelven automáticamente.
- Se conservan las capacidades de lectura actuales.
- Se reutilizan interfaces, permisos, persistencia, modelos y repositorios existentes; no hay migración destructiva, eliminación de modelos ni rediseño de esquema.
- Las peticiones repetidas están permitidas y no requieren idempotencia adicional.
- El alcance operativo es TEST, con un máximo de 20 usuarios/agentes concurrentes, UI/mensajes en español y sin persistencia de secretos.

## Fuera de alcance

- BU, MACBU, tipos BPM nuevos y cualquier entorno distinto de TEST.
- Crear endpoints, nombres concretos de tools, contratos paralelos, roles, scopes, bypass de autorización o permisos nuevos.
- Reducir, sustituir o rediseñar las capacidades de lectura existentes.
- Scoring, prioridades automáticas, umbrales, fusión o resolución automática de conflictos.
- Descripción obligatoria, generación automática de texto y catálogo/versionado de `incomplete_reason`.
- Estados `draft`, `review`, `approved` y cualquier workflow de publicación o aprobación separada.
- Nueva idempotencia, migración destructiva, eliminación de modelos antiguos, rediseño de persistencia, política nueva de retención o persistencia de secretos.
- Funcionalidad no necesaria para demostrar la exposición trazable de las operaciones de escritura ya existentes en las siete áreas.

## Criterios de aceptación técnicos medibles

- **AC-01:** las pruebas de validación de los contratos existentes cubren `input`, `output`, `operation`, `subprocess`, `decision` y `stock` sin cambiar sus reglas.
- **AC-02:** una prueba guarda un contexto con descripción vacía, cuando es válido según el contrato existente, sin exigir un `incomplete_reason` catalogado.
- **AC-03:** una prueba de guardar y consultar verifica la conservación del contexto y de la procedencia disponible, incluido `actor` y `trace_id` cuando existan, y su disponibilidad/publicación directa.
- **AC-04:** una prueba con datos incompatibles verifica que las procedencias se conservan, la incompatibilidad queda marcada y los datos no se fusionan.
- **AC-05:** una matriz y pruebas de contrato demuestran cobertura de las siete áreas de escritura de FR-04, con una correspondencia uno a uno entre cada operación de escritura ya existente aplicable y su exposición `agent_tools` equivalente, sin endpoints o nombres inventados.
- **AC-06:** una prueba por área confirma que la operación expuesta conserva la validación, el resultado, la persistencia y el mecanismo de permisos efectivo de la ruta actual equivalente.
- **AC-07:** una prueba o revisión de contrato confirma que todas las capacidades de lectura existentes siguen disponibles y no cambian sus permisos ni respuestas.
- **AC-08:** una prueba verifica que el flujo usa únicamente autorización vigente, permite peticiones repetidas y no introduce roles, scopes, bypass ni idempotencia adicional.
- **AC-09:** pruebas de error verifican respuestas observables para validación, autorización, recurso inexistente, conflicto y fallo interno según los contratos actuales, con mensajes de usuario en español y sin secretos en respuestas, trazas ni logs.
- **AC-10:** una comprobación en TEST verifica el máximo de 20 usuarios/agentes concurrentes.
- **AC-11:** una revisión de cambios confirma la reutilización de persistencia y modelos existentes y la ausencia de migración destructiva, eliminación de modelos antiguos, rediseño de esquema o nueva política de retención.

## Preguntas para aclaración

No quedan preguntas bloqueantes: la opción 1 de AMD-001 fue confirmada por el programador humano. La validación pendiente es el Gate 1 de esta especificación actualizada.

## Registro de decisiones

- **2026-08-06 — programador humano:** consolidación bajo el objetivo de crear y validar una fuente de contexto BPM robusta en TEST con solución mínima.
- **2026-08-06 — programador humano:** se mantienen los seis tipos BPM, sus validaciones actuales, descripciones vacías cuando el contrato lo permite y ausencia de catálogo/versionado de `incomplete_reason`.
- **2026-08-06 — programador humano:** guardar deja disponible/publicado directamente; sin workflow de publicación.
- **2026-08-06 — programador humano:** contexto y procedencia simples; sin scoring, prioridad automática, resolución automática ni fusión de datos incompatibles.
- **2026-08-06 — programador humano:** se conservan las capacidades de lectura y se exponen mediante `agent_tools` equivalentes todas las operaciones de escritura ya existentes en las rutas actuales para BPM `process_modeling`, procesos, contratos, máquinas, árboles, hipótesis y análisis.
- **2026-08-06 — programador humano:** la escritura usa únicamente las validaciones actuales del backend y el mismo mecanismo de permisos efectivo de las rutas actuales; no se añaden roles ni scopes, y no se inventan endpoints ni nombres concretos de tools.
- **2026-08-06 — programador humano:** se reutilizan interfaces, persistencia, modelos y repositorios; sin idempotencia adicional, migración destructiva, eliminación de modelos antiguos ni rediseño de esquema.
- **2026-08-06 — programador humano:** entorno TEST, máximo de 20 usuarios/agentes concurrentes, retención indefinida solo si ya está prevista y UI/mensajes en español.

## Amendments

### AMD-001

- **Fecha:** 2026-08-06
- **Tipo:** B — refinamiento de `spec.md`
- **Descripción:** exponer mediante una superficie `agent_tools` equivalente y trazable las operaciones de escritura ya existentes en las rutas actuales para BPM `process_modeling`, procesos, contratos, máquinas, árboles, hipótesis y análisis, conservando todas las capacidades de lectura y aplicando únicamente validaciones y permisos efectivos actuales del backend.
- **Estado:** `integrated`
- **Fase de re-entrada:** `validate-spec`
- **Gate requerido:** Gate 1
- **Validación humana:** `pendiente`
- **Decisión humana:** opción 1 confirmada el 2026-08-06 por el programador humano.
- **Notas:** se rectifican las prohibiciones incompatibles con la exposición equivalente de escritura; no se autorizan endpoints ni nombres concretos de tools nuevos, roles, scopes, bypass de permisos, rediseño de esquema, migración destructiva ni pérdida de capacidades de lectura.
