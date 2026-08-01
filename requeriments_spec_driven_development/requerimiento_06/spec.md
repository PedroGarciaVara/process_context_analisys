# Spec — requerimiento_06: Modelo de Hipótesis Estructuradas sobre DAG causal

## Metadata
- Requirement ID: `requerimiento_06`
- Estado: `spec_pendiente_validacion`
- Autor del spec: `requirements-agent`
- Fecha: 2026-05-31
- Fuente: `requerimientos_cliente/requerimiento_06.md`
- Dependencia funcional: `requerimiento_05` define el Knowledge Graph base (`node` + `relationship`) y sus tipos/relaciones iniciales.

---

## Overview

Este requerimiento extiende el modelo causal introducido en `requerimiento_05` para que las hipótesis dejen de ser descripciones libres mínimas y pasen a capturarse como conocimiento estructurado, reutilizable y analizable.

La hipótesis sigue siendo un nodo canónico del Knowledge Graph de tipo `HYPOTHESIS`, pero ahora incorpora atributos estructurados de negocio y dos colecciones hijas:
1. datos de negocio requeridos,
2. evidencias esperadas.

El objetivo funcional es permitir que un experto industrial describa qué quiere comprobar, con qué contexto y bajo qué regla de decisión, sin introducir implementación técnica. El objetivo técnico es dejar la información preparada para descubrimiento posterior de capacidades analíticas por LLM y para futuras fases de automatización.

Este requerimiento no reemplaza el DAG de `requerimiento_05`; lo especializa. La persistencia canónica de identidad y relaciones sigue en `node` y `relationship`. Los atributos específicos de hipótesis se guardan en tablas satélite con clave compartida `hypothesis.node_id`.

---

## Functional Requirements

### FR-01: Hipótesis como nodo canónico del grafo

El sistema DEBERÁ persistir cada hipótesis como un nodo único del Knowledge Graph.

- La fila canónica se almacenará en `node`.
- `node.node_type` DEBERÁ ser `HYPOTHESIS`.
- La identidad de la hipótesis DEBERÁ ser `hypothesis.node_id`, compartiendo el mismo identificador que `node.id`.
- No se permitirá un identificador independiente de hipótesis desacoplado del grafo.
- La descripción general del nodo DEBERÁ permanecer disponible en `node.description`.
- El alta de una hipótesis DEBERÁ crear de forma transaccional:
  - una fila en `node`,
  - una fila en `hypothesis`,
  - cero o más filas en `hypothesis_required_data`,
  - cero o más filas en `hypothesis_expected_evidence`,
  - al menos una relación `VERIFIED_BY` desde la causa origen hacia la hipótesis.

### FR-02: Modelo estructurado de atributos de hipótesis

El sistema DEBERÁ almacenar los atributos específicos de hipótesis en una tabla satélite `hypothesis`.

Campos obligatorios:
- `node_id` PK/FK a `node.id`
- `name`
- `business_reason`
- `analysis_method`
- `expected_result`

Campos opcionales:
- `process_name`
- `machine_name`
- `asset_name`
- `analysis_window`
- `decision_rule`
- `status`

Reglas:
- `name` DEBERÁ ser el título visible principal de la hipótesis.
- `business_reason` DEBERÁ capturar el motivo de negocio.
- `analysis_method` DEBERÁ almacenar un valor controlado.
- `expected_result` DEBERÁ almacenar un valor controlado.
- `status` DEBERÁ representar el ciclo de vida operativo de la definición de hipótesis, no el resultado de una evaluación puntual de un análisis RCA.
- La regla de decisión DEBERÁ almacenarse como texto libre en `decision_rule`.

### FR-03: Datos de negocio requeridos

El sistema DEBERÁ permitir registrar múltiples conceptos de negocio requeridos por hipótesis.

- Se utilizará la tabla `hypothesis_required_data`.
- Cada fila DEBERÁ pertenecer a una hipótesis mediante `hypothesis_required_data.hypothesis_node_id` FK a `hypothesis.node_id`.
- Cada fila DEBERÁ incluir `business_data_name`.
- `description` será opcional.
- El orden de captura DEBERÁ preservarse mediante un campo de secuencia explícito o un orden determinista equivalente definido en implementación.
- El usuario DEBERÁ describir conceptos de negocio, no nombres de columnas ni expresiones SQL.

### FR-04: Evidencias esperadas

El sistema DEBERÁ permitir registrar múltiples evidencias esperadas por hipótesis.

- Se utilizará la tabla `hypothesis_expected_evidence`.
- Cada fila DEBERÁ pertenecer a una hipótesis mediante `hypothesis_expected_evidence.hypothesis_node_id` FK a `hypothesis.node_id`.
- Cada fila DEBERÁ incluir `evidence_name`.
- `description` será opcional.
- El orden de captura DEBERÁ preservarse mediante un campo de secuencia explícito o un orden determinista equivalente definido en implementación.

### FR-05: Relación obligatoria con el grafo causal

El sistema DEBERÁ mantener la integración completa con el DAG de `requerimiento_05`.

- La hipótesis seguirá siendo un nodo `HYPOTHESIS`.
- La relación entre causa e hipótesis DEBERÁ persistirse en `relationship`.
- La relación DEBERÁ usar `relationship_type = 'VERIFIED_BY'`.
- La causa será el `parent_node_id`.
- La hipótesis será el `child_node_id`.
- La creación de una hipótesis desde una causa DEBERÁ crear esa relación en la misma transacción que el nodo y sus tablas satélite.
- Una hipótesis podrá ser reutilizada por varias causas solo si una fase posterior lo habilita explícitamente; en este requerimiento, la UI de alta queda acoplada a una causa origen concreta y crea una relación `VERIFIED_BY` inicial única.

### FR-06: Valores controlados

El sistema DEBERÁ soportar los siguientes valores controlados para `analysis_method`:

- `AVG`
- `MAX`
- `MIN`
- `SUM`
- `COUNT`
- `DURATION`
- `TREND`
- `CORRELATION`
- `CURVE_COMPARISON`
- `ANOMALY_DETECTION`
- `CUSTOM`

El sistema DEBERÁ soportar los siguientes valores controlados para `expected_result`:

- `VALIDATE_CAUSE`
- `REJECT_CAUSE`
- `INCONCLUSIVE`

La UI DEBERÁ mostrar etiquetas legibles en español, pero la persistencia DEBERÁ usar estos códigos canónicos.

### FR-07: Asistente de captura en 5 bloques

El sistema DEBERÁ exponer la creación y edición de hipótesis mediante un asistente/formulario estructurado de 5 bloques:

1. Información general
2. Contexto industrial
3. Datos necesarios
4. Método de análisis
5. Regla de decisión

Contenido obligatorio por bloque:

- Bloque 1:
  - `name`
  - descripción general de la hipótesis
  - `business_reason`
- Bloque 2:
  - `process_name`
  - `machine_name`
  - `asset_name`
- Bloque 3:
  - lista dinámica de `hypothesis_required_data`
- Bloque 4:
  - `analysis_method`
  - `analysis_window`
- Bloque 5:
  - `decision_rule`
  - `expected_result`
  - lista dinámica de `hypothesis_expected_evidence`

La UI DEBERÁ permitir crear, editar y eliminar elementos de listas dinámicas sin recargar la página completa.

### FR-08: Vista previa RCA final

El sistema DEBERÁ mostrar una vista previa final antes de confirmar el guardado.

- La vista previa DEBERÁ resumir los 5 bloques.
- La vista previa DEBERÁ usar lenguaje de negocio.
- La vista previa NO DEBERÁ exponer SQL, Python, API, MCP ni detalles de implementación.
- El guardado definitivo DEBERÁ partir del contenido validado en esta vista.

### FR-09: Separación frontend/backend obligatoria

La responsabilidad funcional DEBERÁ quedar separada explícitamente:

Frontend/UI:
- renderizar el asistente de 5 bloques,
- gestionar navegación entre bloques,
- validar obligatoriedad básica de campos,
- gestionar listas dinámicas de datos requeridos y evidencias esperadas,
- mostrar ejemplos industriales, mensajes de error y vista previa final,
- enviar el payload estructurado al backend.

Backend/domain:
- validar integridad semántica,
- validar códigos controlados,
- validar la existencia y compatibilidad del nodo causa origen,
- orquestar la transacción de creación/edición/borrado,
- crear y mantener `node`, `relationship` y tablas satélite,
- impedir estados inconsistentes o relaciones huérfanas.

Persistencia:
- ejecutar DDL,
- materializar inserts/updates/deletes,
- consultar hipótesis estructuradas y reconstruir su agregado.

### FR-10: Arquitectura de persistencia y ubicación de módulos

La implementación DEBERÁ extender la estructura actual del proyecto en `app/` sin crear un nuevo boundary top-level.

Ubicación obligatoria:
- lógica de conexión PostgreSQL: `app/persistence/db.py`
- repositorios SQL de hipótesis estructuradas y sus satélites: `app/persistence/`
- reglas de negocio / agregación / validaciones de dominio de hipótesis: `app/domain/`
- componentes visuales del asistente: `app/components/`
- callbacks de interacción y orquestación UI: `app/callbacks/`
- página o panel de detalle que aloje el asistente: `app/pages/` y/o el flujo ya existente en `causa_detalle`
- DDL / evolución de esquema: `db/schema.sql`

Reglas adicionales:
- `app/persistence/hipotesis_repo.py` DEBERÁ evolucionar o delegar hacia el nuevo modelo DAG-first; no deberá mantenerse como propietario de una tabla aislada `hipotesis(causa_id, ...)` fuera del grafo.
- La UI NO DEBERÁ escribir SQL ni decidir el modelo de datos.
- `db/schema.sql` DEBERÁ convertirse en la fuente declarativa del nuevo esquema persistente local.

### FR-11: Sustitución del modelo local anterior de hipótesis

El sistema DEBERÁ reemplazar el modelo actual local de hipótesis desacoplado del DAG.

- El esquema actual basado en `hipotesis.id` y `hipotesis.causa_id` queda obsoleto para este alcance.
- La implementación DEBERÁ migrar a:
  - `node`
  - `relationship`
  - `hypothesis`
  - `hypothesis_required_data`
  - `hypothesis_expected_evidence`
- La consulta de hipótesis por causa DEBERÁ resolverse a través de `relationship` + `node` + `hypothesis`.
- Si se requiere compatibilidad temporal, esta deberá resolverse en la capa de repositorio, no duplicando la fuente de verdad.

### FR-12: Reglas de integridad

El sistema DEBERÁ aplicar las siguientes reglas:

- no podrá existir una fila `hypothesis` sin su fila `node` correspondiente;
- no podrá existir `hypothesis_required_data` ni `hypothesis_expected_evidence` sin hipótesis padre;
- no podrá existir una hipótesis estructurada asociada a una causa mediante FK directa fuera del grafo;
- `node.code` DEBERÁ seguir siendo único a nivel corporativo;
- `analysis_method` y `expected_result` DEBERÁN estar restringidos a catálogos válidos;
- el borrado de una hipótesis DEBERÁ eliminar sus tablas satélite y sus relaciones del grafo de forma consistente;
- el borrado de una causa con hipótesis relacionadas DEBERÁ respetar la política de integridad definida para el grafo en `requerimiento_05`; no se podrá dejar nodos `HYPOTHESIS` huérfanos.

### FR-13: Consultas de lectura obligatorias

El sistema DEBERÁ soportar como mínimo estas lecturas:

- obtener todas las hipótesis de una causa:
  - mediante `relationship.relationship_type = 'VERIFIED_BY'`
- obtener una hipótesis estructurada completa por `node_id`
- obtener los datos requeridos de una hipótesis
- obtener las evidencias esperadas de una hipótesis
- reconstruir un agregado listo para UI con:
  - nodo base,
  - atributos satélite,
  - listas ordenadas de datos requeridos,
  - listas ordenadas de evidencias esperadas

### FR-14: Restricción de no implementación analítica

En esta fase el sistema DEBERÁ capturar conocimiento, no ejecutar análisis.

- NO se implementarán consultas SQL analíticas generadas desde hipótesis.
- NO se implementarán reglas Python que validen automáticamente la causa.
- NO se implementarán capacidades, catálogo, API ni MCP derivados.
- El modelo solo deja preparada la información para fases futuras.

---

## Non-Functional Requirements

### NFR-01: Integridad transaccional

La creación, edición y borrado de una hipótesis estructurada DEBERÁN ejecutarse de forma transaccional sobre `node`, `relationship` y tablas satélite.

### NFR-02: Continuidad arquitectónica con el DAG

La solución DEBERÁ preservar el patrón DAG-first definido en `requerimiento_05`. No se admitirán atajos tree-centric ni FKs directas que conviertan a hipótesis en un submodelo ajeno al grafo.

### NFR-03: UX no técnica

La UI DEBERÁ evitar terminología técnica y permitir completar una hipótesis de complejidad normal en menos de 3 minutos.

### NFR-04: Rendimiento de lectura

La carga de una hipótesis estructurada completa para edición o consulta DEBERÁ completarse en menos de 500 ms en entorno local con volúmenes bajos/medios de uso.

### NFR-05: Mantenibilidad

La separación entre UI, dominio y persistencia DEBERÁ permitir evolucionar los catálogos, tablas satélite y futuras capacidades sin reescribir el modelo base del grafo.

---

## Constraints and Assumptions

- **Decisión aprobada por humano:** la hipótesis se persiste como nodo canónico del grafo usando `hypothesis.node_id` como PK/FK a `node.id`.
- **Dependencia obligatoria:** `requerimiento_06` extiende el modelo de `requerimiento_05`; no lo sustituye.
- **Persistencia local actual:** PostgreSQL local a través de la infraestructura ya existente en `app/persistence/db.py`.
- **Boundary actual del producto:** la implementación debe extender `app/`, `db/` y la estructura vigente del repositorio; no se crea una nueva arquitectura top-level en este requerimiento.
- **Fuente de verdad del grafo:** `node` y `relationship`.
- **Tablas satélite:** solo almacenan atributos específicos de hipótesis y sus listas hijas.
- **Sin ejecución analítica:** la hipótesis captura intención de negocio, no lógica ejecutable.
- **UI acoplada a causa origen:** en este requerimiento la creación nace desde una causa concreta del flujo RCA.
- **Lenguaje de persistencia:** códigos controlados canónicos en inglés; etiquetas de UI en español.

---

## Out of Scope

- Ejecución automática de hipótesis sobre datasets o series temporales.
- Generación de SQL, Python, API o MCP a partir de la hipótesis.
- Descubrimiento automático de capacidades por LLM.
- Reutilización UI avanzada de una misma hipótesis entre múltiples causas dentro del mismo turno de captura.
- Rediseño completo de todas las páginas RCA fuera del flujo específico de hipótesis.
- Integraciones externas adicionales.

---

## Acceptance Criteria

### AC — FR-01 / FR-02: identidad y persistencia canónica

| ID | Criterio |
|----|----------|
| AC-01 | Crear una hipótesis genera una fila en `node` con `node_type='HYPOTHESIS'`. **Criterio:** `SELECT node_type FROM node WHERE id=:node_id` retorna `HYPOTHESIS`. |
| AC-02 | La fila satélite comparte identidad con el nodo. **Criterio:** `SELECT node_id FROM hypothesis WHERE node_id=:node_id` retorna la misma clave primaria que `node.id`. |
| AC-03 | No existe identificador alternativo desacoplado. **Criterio:** el esquema final de `hypothesis` usa `node_id` como PK y no contiene una PK surrogate independiente para identidad funcional. |
| AC-04 | `name`, `business_reason`, `analysis_method` y `expected_result` se persisten correctamente. **Criterio:** tras guardar una hipótesis, `SELECT name, business_reason, analysis_method, expected_result FROM hypothesis WHERE node_id=:node_id` retorna los valores enviados. |

### AC — FR-03 / FR-04: tablas satélite hijas

| ID | Criterio |
|----|----------|
| AC-05 | Una hipótesis puede guardar múltiples datos requeridos. **Criterio:** tras guardar 3 conceptos, `SELECT COUNT(*) FROM hypothesis_required_data WHERE hypothesis_node_id=:node_id` retorna `3`. |
| AC-06 | Una hipótesis puede guardar múltiples evidencias esperadas. **Criterio:** tras guardar 2 evidencias, `SELECT COUNT(*) FROM hypothesis_expected_evidence WHERE hypothesis_node_id=:node_id` retorna `2`. |
| AC-07 | Las tablas hijas no admiten orfandad. **Criterio:** insertar una fila con `hypothesis_node_id` inexistente falla por FK. |

### AC — FR-05 / FR-12: integración con el DAG

| ID | Criterio |
|----|----------|
| AC-08 | Crear una hipótesis desde una causa crea la relación `VERIFIED_BY`. **Criterio:** `SELECT 1 FROM relationship WHERE parent_node_id=:cause_id AND child_node_id=:node_id AND relationship_type='VERIFIED_BY'` retorna 1 fila. |
| AC-09 | La consulta de hipótesis por causa ya no depende de `hipotesis.causa_id`. **Criterio:** el repositorio de lectura obtiene hipótesis mediante join con `relationship` y no requiere una FK directa `causa_id` en `hypothesis`. |
| AC-10 | El borrado de la hipótesis elimina tablas satélite y relaciones asociadas sin dejar residuos. **Criterio:** tras borrar `node_id=:node_id`, `SELECT COUNT(*)` en `hypothesis`, `hypothesis_required_data`, `hypothesis_expected_evidence` y `relationship` para esa clave retorna `0`. |

### AC — FR-06: valores controlados

| ID | Criterio |
|----|----------|
| AC-11 | `analysis_method` solo admite valores del catálogo definido. **Criterio:** persistir `MEDIAN` falla por validación backend o constraint de esquema. |
| AC-12 | `expected_result` solo admite valores del catálogo definido. **Criterio:** persistir `UNKNOWN` falla por validación backend o constraint de esquema. |
| AC-13 | La UI muestra etiquetas de negocio en español y persiste códigos canónicos. **Criterio:** seleccionar `Media` en UI persiste `AVG` en BD. |

### AC — FR-07 / FR-08: UX del asistente

| ID | Criterio |
|----|----------|
| AC-14 | La UI renderiza 5 bloques estructurados. **Criterio:** el DOM o layout contiene secciones distinguibles para los 5 bloques definidos. |
| AC-15 | La UI permite añadir y eliminar filas dinámicas de datos requeridos y evidencias sin recarga completa. **Criterio:** la interacción actualiza el estado de la pantalla mediante callbacks parciales. |
| AC-16 | La UI muestra una vista previa RCA final antes de guardar. **Criterio:** existe una pantalla o panel resumen con todos los campos capturados y acción explícita de confirmación. |
| AC-17 | La UI no expone terminología técnica prohibida. **Criterio:** la pantalla de captura no muestra `SQL`, `Python`, `API`, `MCP` ni `capacidad` como términos de interacción principal. |

### AC — FR-09 / FR-10 / FR-11: separación por capas y ubicación

| ID | Criterio |
|----|----------|
| AC-18 | La conexión PostgreSQL sigue centralizada en `app/persistence/db.py`. **Criterio:** el código nuevo no crea una capa paralela de conexión fuera de ese módulo. |
| AC-19 | Las validaciones de integridad semántica viven en backend. **Criterio:** guardar una hipótesis con `analysis_method` inválido falla aunque el payload se fuerce fuera de la UI. |
| AC-20 | El DDL del nuevo modelo vive en `db/schema.sql`. **Criterio:** el archivo define `node`, `relationship`, `hypothesis`, `hypothesis_required_data` y `hypothesis_expected_evidence` conforme al modelo aprobado. |
| AC-21 | El flujo de hipótesis reutiliza la estructura `app/components`, `app/callbacks`, `app/domain` y `app/persistence`. **Criterio:** los cambios de implementación quedan ubicados en esos directorios y no en rutas ad hoc. |

### AC — FR-14: no ejecución analítica

| ID | Criterio |
|----|----------|
| AC-22 | Guardar una hipótesis no ejecuta análisis sobre datos productivos. **Criterio:** el flujo persiste la definición sin disparar jobs, queries analíticas ni evaluaciones automáticas. |

---

## Questions for Clarification

Sin preguntas bloqueantes. La decisión estructural crítica fue resuelta por el programador humano:
- persistir `HYPOTHESIS` como nodo canónico compartiendo identidad `hypothesis.node_id = node.id`.

---

## Decision Log

| ID | Decisión | Responsable | Motivo |
|----|----------|-------------|--------|
| D-01 | La identidad canónica de hipótesis será `hypothesis.node_id` como PK/FK a `node.id`. | Programador humano | Mantiene continuidad DAG-first con `requerimiento_05` y evita duplicar identidades. |
| D-02 | Los atributos específicos de hipótesis vivirán en tablas satélite separadas del nodo base. | Requirements-agent | Separa identidad/relaciones del grafo de los atributos especializados de negocio. |
| D-03 | La relación causa → hipótesis seguirá modelándose mediante `relationship_type='VERIFIED_BY'`. | Requerimiento cliente + requirements-agent | Conserva el contrato semántico definido en `requerimiento_05`. |
| D-04 | La implementación debe extender la estructura actual `app/` y `db/schema.sql`. | Requirements-agent | Alinea el spec con el codebase real y evita inventar nuevos boundaries. |
| D-05 | Este requerimiento captura conocimiento; no ejecuta análisis. | Requerimiento cliente | El objetivo de negocio es estructuración homogénea para fases posteriores. |

---

## Amendments

Sin enmiendas registradas en este momento.
