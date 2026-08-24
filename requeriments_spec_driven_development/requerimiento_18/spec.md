# Especificación técnica — Requerimiento 18

**Estado:** `spec_pendiente_validacion`
**Completitud:** parcial; existe una decisión funcional bloqueante pendiente.
**Autor:** `requirements-agent`
**Fecha:** 2026-08-20

## Overview

Se requiere ampliar el editor de operaciones BPM para que la edición guiada de
una operación incluya su información semántica mínima aunque esta se almacene en
JSON, y permita añadir campos descriptivos adicionales mediante título y
descripción.

La inspección del código muestra que el frontend activo es una SPA Flask/HTML/CSS/
JavaScript, no una webapp Dash en ejecución. La capacidad afectada es el editor de
Process Modeling, principalmente `uc_bib_solv/webapp/js/views/process-modeling.js`.

## Contrato real observado

### Nodo BPM

`pm_process_node` contiene, entre otros, los campos estructurales `node_id`,
`version_id`, `node_code`, `node_type`, `name`, `description` y `properties`.
`node_type='operation'` identifica una operación. `properties` es un objeto
JSONB abierto; el código normaliza `properties.etapas` con un sobre versionado
`{schema_version, etapas}` y puede proyectar `properties.canonical_ids`.

Fuente: `db_management/schema.sql`,
`uc_bib_solv/app/persistence/pm_process_repo.py` y
`uc_bib_solv/services/process_modeling_service.py`.

### Metadatos de nodo

`pm_process_node_metadata` mantiene una relación 1:1 con el nodo y un objeto
JSONB `metadata`. El endpoint existente es:

- `GET /api/process-modeling/nodes/<node_id>/metadata`
- `PATCH /api/process-modeling/nodes/<node_id>/metadata`

El cliente actual edita únicamente las propiedades de `metadata.data`. Para cada
propiedad conserva una representación de tipo: `string`, `number`, `boolean`,
`null` u `object/list` como JSON avanzado. El guardado envía un envelope conservando
las claves externas y reemplazando `data` por el objeto editado.

Fuentes: `uc_bib_solv/webapp/js/views/process-modeling.js`,
`uc_bib_solv/app/persistence/pm_process_repo.py` y
`db_management/schema.sql`.

### Proyección actual del visor

`buildMetadataSections()` combina `node.description`, `node.metadata`,
`metadata.data` y registros de contexto. Reconoce o muestra actualmente:

- `description`, con alias `operation_description` y `detailed_description`;
- `summary`;
- `objective`;
- `inputs` (Entradas);
- `outputs` (Salidas);
- `parameters` (Parámetros);
- `controls` y `quality_controls` (Controles);
- `contracts`, `declarative_contract`, `assignments` y
  `operation_machine_assignments` (Contratos y asignaciones);
- cualquier otra clave como `Clave: <key>`.

Esto es un contrato de presentación observado, no una autorización para declarar
que todas esas claves sean campos editables mínimos. Esa decisión queda abierta.

## Functional Requirements

### FR-01 — Modal de edición de operación

El cambio DEBERÁ extender el modal existente de edición de nodo en
`uc_bib_solv/webapp/js/views/process-modeling.js` o los componentes frontend
existentes que dicho módulo reutilice. No DEBERÁ crear una página, ruta frontend o
modal paralelo.

CUANDO el nodo seleccionado tenga `node_type='operation'`, EL SISTEMA DEBERÁ
mostrar en el modal los campos mínimos aprobados para la operación con sus valores
persistidos, incluso cuando esos valores procedan de JSON.

El modal DEBERÁ distinguir los campos estructurales del nodo (`name`, `description`
u otros confirmados) de los campos JSON semánticos y no deberá sobrescribir
propiedades JSON no editadas.

### FR-02 — Campos mínimos

El conjunto mínimo deberá incluir, como mínimo funcional solicitado, descripción,
entradas, salidas y parámetros. Los demás campos mínimos deberán quedar fijados por
la respuesta a Q-18-01 antes de implementar.

Cada campo deberá mostrar etiqueta legible, valor actual, tipo/forma esperada y
estado de validación. Para valores objeto/lista se reutilizará el contrato del
editor JSON compartido (`uc_bib_solv/webapp/js/components/json-editor.js`) o un
adaptador compatible, sin convertir silenciosamente un JSON estructurado en texto
plano.

### FR-03 — Campos adicionales

CUANDO el usuario active la acción de añadir campo adicional, EL SISTEMA DEBERÁ
mostrar controles para un título y una descripción.

CUANDO el usuario confirme un campo adicional válido, EL SISTEMA DEBERÁ incluirlo
en la representación JSON aprobada para la operación, conservando título y
descripción.

El contrato deberá definir cómo se identifica un campo adicional, cómo se evita o
resuelve la duplicidad de títulos, cómo se edita o elimina posteriormente y si el
título se usa como clave JSON o como valor dentro de una lista de objetos. Estas
decisiones quedan bloqueadas por Q-18-01.

### FR-04 — Guardado y reapertura

CUANDO el usuario guarde cambios válidos, EL SISTEMA DEBERÁ enviar JSON nativo al
endpoint/caso de uso que resulte canónico tras Q-18-01, conservar los campos no
modificados y actualizar la vista con la respuesta persistida.

CUANDO el usuario cierre y vuelva a abrir el modal, EL SISTEMA DEBERÁ reconstruir
los controles desde la respuesta del backend y mostrar valores semánticamente
equivalentes a los guardados.

SI existe un error de forma, tipo o persistencia, EL SISTEMA DEBERÁ mantener el
modal abierto, identificar el campo afectado y no presentar el cambio como guardado.

### FR-05 — Separación frontend/backend/dominio

**Frontend (`uc_bib_solv/webapp/js/views/process-modeling.js` y componentes
existentes):** renderizado, estado transitorio del modal, añadir/editar/eliminar
filas de campos adicionales, conversión de controles a valores JavaScript nativos,
validación de interacción y mensajes accesibles.

**Dominio/caso de uso (`uc_bib_solv/modules/process_modeling/domain/` y
`application/` o el boundary canónico vigente):** validar que el nodo sea una
operación editable, que la forma JSON aprobada sea válida, que no se pierdan
propiedades protegidas y que los títulos/descripciones cumplan las reglas
confirmadas. No deberá depender de Dash, DOM o PostgreSQL.

**Persistencia (`uc_bib_solv/app/persistence/pm_process_repo.py` o adaptador
canónico equivalente):** leer/escribir el objeto JSONB aprobado y mantener la
relación `pm_process_node_metadata` si esa es la fuente elegida. No se deberá
crear una tabla o columna nueva sin una enmienda explícita.

### FR-06 — Compatibilidad y fuentes protegidas

La implementación deberá conservar `properties.etapas`, `properties.canonical_ids`,
la descripción estructural y las claves de metadatos no editadas, salvo decisión
explícita en contrario. El editor no deberá convertir etapas, relaciones,
geometría ni identificadores técnicos en campos descriptivos editables.

## Non-Functional Requirements

- Accesibilidad: etiquetas asociadas, foco visible, navegación por teclado,
  anuncios de error y diálogo con nombre accesible.
- Integridad: guardado atómico del JSON validado; ningún JSON inválido deberá
  sustituir el valor persistido.
- Compatibilidad: mantener el patrón de SPA actual, clientes HTTP existentes y
  respuestas JSON serializables.
- Usabilidad: los valores complejos deberán conservar edición guiada o modo
  avanzado explícito, siguiendo el contrato común del editor JSON.
- Trazabilidad: no introducir una segunda fuente de verdad para una misma
  propiedad sin documentar el mapeo y la precedencia.

## Constraints and Assumptions

- La UI activa observada es `uc_bib_solv/webapp`, servida por Flask; las skills
  Dash se cargaron por instrucción, pero no describen el runtime activo.
- La persistencia actual usa PostgreSQL JSONB y `db_management/schema.sql` es la
  fuente observada de constraints.
- El backend ya exige que `pm_process_node_metadata.metadata` sea un objeto JSON.
- No se autoriza modificar implementación, DDL, migraciones ni endpoints durante
  esta fase de requisitos.
- No se asume todavía si los campos mínimos viven en `metadata.data`, en el
  envelope `metadata`, en `properties` o repartidos entre columna estructural y
  JSON; la decisión está registrada como bloqueante.

## Ubicación de módulos

La futura implementación deberá reutilizar el módulo existente de Process
Modeling. La UI se extenderá en `uc_bib_solv/webapp/js/views/process-modeling.js`
y, solo si el contrato común lo requiere, en
`uc_bib_solv/webapp/js/components/json-editor.js` o un componente existente.

La validación reutilizable deberá permanecer en el boundary de dominio/casos de
uso de `uc_bib_solv/modules/process_modeling/`. La persistencia deberá extender el
repositorio/adaptador existente, sin crear una nueva frontera de producto.

## Modelo de datos y persistencia

No se propone cambio DDL en esta fase. El modelo observado es:

| Concepto | Persistencia actual | Nota |
|---|---|---|
| Nodo BPM | `pm_process_node.description`, `pm_process_node.properties` | `properties` es JSONB objeto; `etapas` tiene contrato propio. |
| Metadatos del nodo | `pm_process_node_metadata.metadata` | JSONB objeto, 1:1 con nodo. |
| Datos semánticos editados hoy | `pm_process_node_metadata.metadata.data` | El modal actual solo genera controles para estas propiedades. |

Conexión: infraestructura PostgreSQL existente mediante `db_cursor()` y el wiring
canónico. Modelo técnico: repositorio PM existente. Dominio: validación y caso de
uso independiente de conexión. DDL: `db_management/schema.sql`, sin cambio
propuesto.

## Out of Scope

- Cambios en layout del grafo, etapas, transiciones, subprocesos o stock.
- Rediseño general del editor JSON de máquinas.
- Nuevos roles, autenticación o permisos.
- Migración masiva de datos históricos.
- Nuevas tablas/columnas, cambios de DDL o creación de un endpoint paralelo.
- Implementación y pruebas antes de la validación humana de esta spec.

## Acceptance Criteria

Los criterios siguientes quedan condicionados a resolver Q-18-01.

- **AC-18-01:** para una operación con valores persistidos, el modal muestra
  descripción, entradas, salidas, parámetros y el conjunto adicional aprobado,
  con sus valores equivalentes.
- **AC-18-02:** el payload de guardado conserva la fuente JSON aprobada, las
  propiedades no editadas y los tipos JSON válidos.
- **AC-18-03:** el usuario puede añadir un campo indicando título y descripción;
  tras guardar, cerrar y reabrir, ambos valores aparecen equivalentes.
- **AC-18-04:** los títulos duplicados o vacíos reciben la regla de validación
  aprobada y no generan una escritura inválida.
- **AC-18-05:** un JSON inválido o error backend mantiene el modal abierto,
  muestra error accesible y no reemplaza el valor persistido.
- **AC-18-06:** `etapas`, `canonical_ids`, identificadores y propiedades no
  editadas permanecen intactos tras un guardado parcial.
- **AC-18-07:** la prueba de contrato verifica que la reapertura hidrata desde la
  respuesta persistida y no desde únicamente el estado local del navegador.

## Questions for Clarification

### Q-18-01 — Bloqueante: contrato de campos y ubicación de persistencia

Para cerrar el contrato de implementación, ¿cuál opción se aprueba?

**A.** Editar los mínimos `description`, `inputs`, `outputs`, `parameters`,
`controls` y `contracts/assignments` dentro de `pm_process_node_metadata.metadata.data`;
guardar cada campo adicional como objeto `{title, description}` en una lista
`additional_fields` dentro de ese mismo `data`.

**B.** Editar solo `description`, `inputs`, `outputs` y `parameters` en
`metadata.data`; mantener `controls` y `contracts/assignments` en solo lectura;
guardar los adicionales en `metadata.data.additional_fields` como lista de
objetos `{title, description}`.

**C.** Mantener los mínimos semánticos en `metadata.data`, pero guardar los
adicionales como claves del objeto `data` usando el título como clave y la
descripción como valor.

**D.** Otra definición: indicar conjunto exacto, fuente (`node.description`,
`metadata`, `metadata.data` o `properties`), forma JSON de los campos adicionales,
regla de duplicados y si `controls`/`contracts/assignments` son editables.

La respuesta es bloqueante porque cambia el payload, la fuente de verdad, la
validación, la migración/compatibilidad y los criterios E2E.

## Decision Log

| ID | Fecha | Decisión | Responsable | Estado |
|---|---|---|---|---|
| D-18-01 | 2026-08-20 | El frontend activo es la SPA Flask/HTML/CSS/JavaScript y el editor afectado es Process Modeling. | `requirements-agent`, basado en `context.md` y árbol activo | Confirmada por inspección |
| D-18-02 | 2026-08-20 | El visor actual reconoce descripción, entradas, salidas, parámetros, controles y contratos/asignaciones, además de claves libres. | `requirements-agent`, basado en `process-modeling.js` | Observación técnica; no equivale a decisión de editabilidad |
| D-18-03 | 2026-08-20 | No se inventa la fuente JSON ni la forma de `additional_fields` hasta responder Q-18-01. | `requirements-agent` | Bloqueante |
| D-18-04 | 2026-08-20 | El artefacto queda `spec_pendiente_validacion`; no se crea `task_plan.md` ni se modifica implementación. | `requirements-agent` | Pendiente Gate 1 |

## Reporte de fase y persistencia

- Agente: `requirements-agent`.
- Modelo y esfuerzo solicitados por el contrato del proyecto: `gpt-5.6-luna`,
  `model_reasoning_effort=medium`.
- Sesión: aislada según la solicitud del programador; no se creó sesión secundaria
  adicional desde este runtime.
- Registros leídos: `.atl/sub-agent-registry.md`, `.atl/skill-registry.md`.
- Instrucciones/agente leídos: `common_spec_driven_development/sub_agents/requirements-agent.md` y
  `/home/pedro/.codex/skills/requirements-agent/SKILL.md`.
- Skills cargadas: `requirement-doc`, `webapp-architecture`,
  `web-Dash-Dataiku`, `frontend-design`, `domain-logic`,
  `data-model-management`.
- Código y contexto inspeccionados: `context.md`,
  `uc_bib_solv/webapp/js/views/process-modeling.js`,
  `uc_bib_solv/webapp/js/components/json-editor.js`,
  `uc_bib_solv/app/persistence/pm_process_repo.py`,
  `uc_bib_solv/services/process_modeling_service.py`,
  `uc_bib_solv/modules/process_modeling/`,
  `db_management/schema.sql` y rutas HTTP de Process Modeling.
- Archivos escritos por este agente: `requerimiento_18.md` y `spec.md` dentro de
  `requeriments_spec_driven_development/requerimiento_18/`.
- Archivos de implementación o fuera del nuevo requerimiento modificados: ninguno.
- Pregunta abierta: Q-18-01.
- Siguiente paso: el programador humano debe responder Q-18-01 y validar Gate 1;
  después `requirements-agent` actualiza la spec y solo entonces puede intervenir
  `plan-task-agent`.

