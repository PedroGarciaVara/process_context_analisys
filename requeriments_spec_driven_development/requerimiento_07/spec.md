# Spec — requerimiento_07: Generalización DAG con `CAUSE -> CONTRACT` y satélites descriptivos de causa/hipótesis

## Metadata
- Requirement ID: `requerimiento_07`
- Estado: `spec_pendiente_validacion`
- Autor del spec: `requirements-agent`
- Fecha: 2026-06-02
- Fuente: `requerimientos_cliente/requerimiento_07.md` + instrucción del programador en sesión
- Dependencias funcionales:
  - `requerimiento_05` define el DAG base `node` + `relationship`
  - `requerimiento_06` define el enriquecimiento estructurado de hipótesis sobre el DAG
- Supersession:
  - este requerimiento amplía y corrige la semántica estructural de `requerimiento_05`
  - este requerimiento sustituye partes del modelo persistente de `requerimiento_06` cuando todavía dependan de FK directa `hipotesis.causa_id` o de campos derivables desde `relationship`

---

## Overview

Este requerimiento evoluciona el Knowledge Graph causal para soportar una nueva firma estructural:

- `CAUSE -[DEPENDS_ON]-> CONTRACT`

y para completar la transición hacia un modelo DAG-first donde:

- `node` y `relationship` son la única fuente de verdad de identidad y estructura,
- `causa` deja de almacenar `contrato_id` y `parent_id`,
- `hypothesis` deja de almacenar `causa_id` y cualquier otro dato derivable de `relationship`,
- `causa` e `hypothesis` pasan a ser tablas satélite de atributos específicos de negocio.

El objetivo funcional es permitir encadenamientos causales entre contratos y causas en ambos sentidos soportados por el dominio, sin volver al modelo árbol/FK como fuente principal. El objetivo técnico es unificar persistencia, consultas recursivas, proyección de árbol, migración legacy y formularios frontend alrededor del grafo canónico.

---

## Functional Requirements

### FR-01: Fuente de verdad DAG-first obligatoria

El sistema DEBERÁ tratar `node` y `relationship` como única fuente de verdad para:

- identidad de `CONTRACT`, `CAUSE`, `HYPOTHESIS`, `PROCESS` y `MACHINE`,
- jerarquía y dependencias estructurales,
- relación entre causas e hipótesis,
- relaciones de pertenencia a proceso y máquina.

Las tablas `causa` e `hypothesis` NO DEBERÁN seguir definiendo estructura mediante FKs a contrato, padre o causa.

### FR-02: Nueva firma estructural obligatoria

El sistema DEBERÁ soportar explícitamente la firma:

- `CAUSE -[DEPENDS_ON]-> CONTRACT`

Esta firma queda confirmada por decisión humana y pasa a formar parte del conjunto permitido de relaciones estructurales del DAG.

### FR-03: Conjunto final de firmas permitidas

El backend DEBERÁ validar las firmas permitidas por tripleta `(parent_node_type, relationship_type, child_node_type)`.

Conjunto mínimo obligatorio tras este requerimiento:

- `CONTRACT -[DEPENDS_ON]-> CONTRACT`
- `CONTRACT -[DEPENDS_ON]-> CAUSE`
- `CAUSE -[CAUSES]-> CAUSE`
- `CAUSE -[DEPENDS_ON]-> CONTRACT`
- `CAUSE -[VERIFIED_BY]-> HYPOTHESIS`
- `CONTRACT -[VERIFIED_BY]-> HYPOTHESIS` solo como compatibilidad si ya existe uso previo, no como flujo nuevo obligatorio de este requerimiento
- `CONTRACT -[BELONGS_TO]-> MACHINE`
- `CONTRACT -[BELONGS_TO]-> PROCESS`
- `CAUSE -[BELONGS_TO]-> MACHINE`
- `CAUSE -[BELONGS_TO]-> PROCESS`

Reglas:

- `DEPENDS_ON` y `CAUSES` son relaciones estructurales y participan en la detección de ciclos y en la proyección del árbol.
- `VERIFIED_BY` y `BELONGS_TO` no crean jerarquía estructural del árbol causal.
- cualquier firma fuera de la matriz anterior DEBERÁ rechazarse en backend.

### FR-04: DAG acíclico también con la nueva firma

El sistema DEBERÁ seguir garantizando un DAG válido cuando se mezclen firmas:

- `CONTRACT -> CONTRACT`
- `CONTRACT -> CAUSE`
- `CAUSE -> CAUSE`
- `CAUSE -> CONTRACT`

El backend DEBERÁ rechazar:

- auto-relaciones,
- ciclos directos,
- ciclos transitivos mixtos, por ejemplo `CONTRACT -> CAUSE -> CONTRACT -> ... -> CONTRACT origen`,
- relaciones estructurales duplicadas entre los mismos nodos y tipo.

La validación de aciclicidad DEBERÁ operar sobre el subgrafo formado por `DEPENDS_ON` + `CAUSES`.

### FR-05: `causa` como tabla satélite descriptiva

La tabla `causa` DEBERÁ mantenerse, pero dejará de modelar estructura.

Estado final mínimo esperado:

- sin `contrato_id`
- sin `parent_id`
- con clave compartida `node_id` como identidad canónica de la causa
- con atributos específicos y no derivables del grafo

Campos mínimos obligatorios de `causa`:

- `node_id` PK/FK a `node.id`
- `type`
- `category`
- `created_at`
- `updated_at`

Campos descriptivos canónicos:

- `node.name` como título/nombre principal
- `node.description` como descripción principal

Análisis explícito del modelo:

- `causa` DEBERÁ permanecer como satélite descriptivo ligero.
- No se justifican en este requerimiento nuevos campos estructurales adicionales en `causa`, porque contrato padre, causa padre, proceso y máquina ya se representan mejor en `relationship`.
- Tampoco se justifican ahora campos más especializados como criticidad, owner, scoring o taxonomías analíticas avanzadas, ya que no han sido pedidos y cambiarían el dominio funcional.
- Sí se justifican `type` y `category` como clasificación propia de la causa, porque no son derivables de la topología del grafo.

### FR-06: `hypothesis` como tabla satélite específica

La tabla `hypothesis` DEBERÁ eliminar `causa_id` y cualquier otro dato derivable de `relationship`.

Estado final mínimo esperado:

- `node_id` PK/FK a `node.id`
- sin FK directa a `causa`
- integración obligatoria mediante `CAUSE -[VERIFIED_BY]-> HYPOTHESIS`

Distribución de atributos:

- `node.name`: nombre visible principal de la hipótesis
- `node.description`: descripción general de la hipótesis
- `hypothesis`: atributos específicos de negocio y análisis

Campos obligatorios en `hypothesis`:

- `node_id`
- `business_reason`
- `analysis_method`
- `expected_result`
- `created_at`
- `updated_at`

Campos opcionales en `hypothesis`:

- `industrial_process`
- `industrial_machine`
- `industrial_asset`
- `analysis_window`
- `decision_rule`
- `status`

Colecciones hijas obligatorias:

- `hypothesis_required_data`
- `hypothesis_expected_evidence`

Cada colección DEBERÁ preservar orden explícito mediante un campo `position` o equivalente determinista.

### FR-07: Enriquecimiento estructurado obligatorio de hipótesis

El modelo de hipótesis DEBERÁ soportar, como mínimo, el siguiente conjunto de conceptos del ejemplo de referencia:

- `hypothesis_id` como código funcional visible, persistido en `node.code`
- `name`
- `description`
- `business_reason`
- `industrial_context.process`
- `industrial_context.machine`
- `industrial_context.asset`
- `required_data[]`
- `analysis_window`
- `analysis_method`
- `decision_rule`
- `expected_evidence[]`
- `expected_result[]`

Reglas:

- `expected_result` DEBERÁ soportar al menos `VALIDAR_CAUSA` y `DESCARTAR_CAUSA`.
- la persistencia podrá normalizar los códigos internos a `VALIDATE_CAUSE` / `REJECT_CAUSE` si la implementación ya usa inglés, pero la spec exige equivalencia funcional explícita.
- `required_data` y `expected_evidence` DEBERÁN persistirse como listas hijas, no como texto libre concatenado.
- `industrial_context` DEBERÁ permanecer como contexto de negocio de la hipótesis, no como relación estructural obligatoria del DAG en este requerimiento.

### FR-08: Consultas y proyección de árbol generalizadas

La lógica de consulta y proyección NO DEBERÁ asumir ya que solo un `CONTRACT` puede tener descendencia estructural de tipo `CONTRACT` o `CAUSE`.

El backend DEBERÁ soportar recorridos estructurales mixtos:

- `CONTRACT -> CONTRACT -> CAUSE`
- `CONTRACT -> CAUSE -> CONTRACT`
- `CONTRACT -> CAUSE -> CAUSE`
- combinaciones transitivas de las anteriores

Impacto obligatorio en proyección:

- la proyección de árbol deberá construirse recorriendo el subgrafo estructural (`DEPENDS_ON`, `CAUSES`) desde un nodo raíz seleccionado,
- si el recorrido alcanza un `CAUSE -> CONTRACT`, el contrato hijo deberá entrar en la proyección y podrá seguir expandiéndose hacia contratos o causas descendientes,
- la proyección deberá seguir siendo determinista,
- la respuesta deberá marcar nodos reutilizados cuando un nodo aparezca alcanzable por más de un camino,
- la proyección deberá cortar ramas ya visitadas para evitar bucles visuales, incluso cuando el backend rechaza ciclos persistidos.

### FR-09: Split obligatorio frontend / backend

#### Frontend/UI

Dash (`app/pages/`, `app/components/`, `app/callbacks/`) y la UI Java (`uc_bib_solv/webapp_java/webapp/`) DEBERÁN encargarse de:

- presentar el árbol proyectado,
- permitir crear o vincular relaciones estructurales desde el contexto del nodo actual,
- distinguir los flujos:
  - crear causa nueva,
  - vincular causa existente,
  - vincular contrato existente desde una causa,
  - crear/editar hipótesis estructuradas,
- validar obligatoriedad básica y formato,
- mostrar errores funcionales devueltos por backend.

La UI NO DEBERÁ usar `parent_id`, `contrato_id` o `causa_id` como fuente de verdad estructural persistente.

#### Backend / dominio / persistencia

`app/domain/` y `app/persistence/` DEBERÁN encargarse de:

- validar firmas permitidas,
- validar ausencia de ciclos,
- crear y actualizar relaciones estructurales,
- materializar satélites `causa` e `hypothesis`,
- reconstruir árbol, subgrafo e hipótesis agregadas,
- resolver compatibilidad transitoria con tablas legacy,
- garantizar transaccionalidad de los cambios de grafo.

### FR-10: Arquitectura de persistencia y ubicación de módulos

La implementación DEBERÁ extender la estructura existente del proyecto; no se justifica un nuevo top-level boundary.

Ubicación obligatoria:

- `db/schema.sql`
  - DDL canónico del esquema final
- `app/persistence/db.py`
  - conexión y transacciones
- `app/domain/graph.py`
  - validación de firmas, validación de ciclos y proyección estructural
- `app/persistence/node_repo.py`
  - CRUD y búsquedas de nodos
- `app/persistence/relationship_repo.py`
  - CRUD de relaciones
- `app/persistence/graph_query_repo.py`
  - recorridos recursivos, proyección y búsquedas reutilizables
- `app/persistence/causa_repo.py`
  - agregado de causa y creación/edición basada en `node` + satélite
- `app/persistence/hipotesis_repo.py`
  - agregado de hipótesis estructurada y sus listas hijas
- `app/callbacks/causa_detalle_callbacks.py`
  - adaptación de formularios y acciones de UI Dash
- `uc_bib_solv/webapp_java/python-backend/repositories/` y `services/`
  - adaptación del backend puente para dejar de depender de `parent_id` y `causa_id` como modelo canónico

### FR-11: Evolución de esquema obligatoria

`db/schema.sql` DEBERÁ evolucionar al menos con estos cambios:

- ampliar la matriz validada por el dominio para incluir `CAUSE -[DEPENDS_ON]-> CONTRACT`
- remodelar `causa` a satélite con `node_id` y sin `contrato_id`/`parent_id`
- renombrar o sustituir `hipotesis` por `hypothesis` como tabla satélite canónica, o mantener nombre legacy solo si la implementación decide compatibilidad temporal; en cualquier caso el estado final funcional deberá cumplir esta spec
- eliminar `causa_id` de la tabla canónica de hipótesis
- mantener/crear tablas hijas para datos requeridos y evidencias esperadas
- adaptar `analisis_causas_detalle` para usar `node_id` como referencia canónica; `causa_id` e `hipotesis_id` podrán quedar solo durante transición controlada

Índices mínimos obligatorios:

- `node(node_type)`
- `node(code)`
- `relationship(parent_node_id)`
- `relationship(child_node_id)`
- `relationship(relationship_type)`
- unicidad lógica de `relationship`
- índices por FK en satélites y tablas hijas

### FR-12: Estrategia de migración desde tablas legacy

La migración DEBERÁ ejecutarse en fases explícitas y reversibles.

Fase mínima obligatoria:

1. crear/ajustar tablas nuevas y columnas de transición sin borrar todavía las legacy;
2. poblar `node` y `relationship` para todo el catálogo actual;
3. backfill de `causa.node_id` y `hypothesis.node_id`;
4. migrar atributos específicos desde tablas actuales al modelo satélite final;
5. migrar referencias funcionales de lectura/escritura para que usen `node` + `relationship`;
6. migrar `analisis_causas_detalle` a `node_id` como referencia principal;
7. eliminar FKs estructurales legacy:
   - `causa.contrato_id`
   - `causa.parent_id`
   - `hipotesis.causa_id`
8. eliminar o deprecar índices legacy asociados a esas FKs;
9. cerrar compatibilidad temporal y dejar las tablas finales sin dependencia estructural redundante.

Reglas de migración:

- la migración NO DEBERÁ inventar relaciones `CAUSE -> CONTRACT` a partir del histórico si no existen datos que las representen;
- los árboles legacy actuales deberán seguir reconstruyéndose tras la migración usando las relaciones ya existentes `CONTRACT -> CAUSE` y `CAUSE -> CAUSE`;
- la nueva firma `CAUSE -> CONTRACT` queda disponible para nuevas operaciones y para futuros datos, no se exige inferencia retroactiva desde `causa.parent_id`;
- los datos legacy de `hipotesis.descripcion`, `tipo`, `criterio_validacion`, `estado` deberán mapearse a `node.description`, `hypothesis.status`, `hypothesis.decision_rule` u otros campos destino definidos en implementación, con trazabilidad explícita.

### FR-13: Compatibilidad funcional transitoria

Durante la migración, los repositorios podrán mantener adaptadores o lecturas transitorias para no romper la UI en un único paso.

Pero el estado final obligatorio es:

- sin escrituras nuevas a `causa.parent_id`,
- sin escrituras nuevas a `causa.contrato_id`,
- sin escrituras nuevas a `hipotesis.causa_id`,
- consultas funcionales resueltas desde el grafo y satélites.

### FR-14: Flujos funcionales obligatorios

El sistema DEBERÁ soportar como mínimo estos flujos:

- desde un contrato:
  - crear o vincular causa descendiente,
  - vincular contrato descendiente,
- desde una causa:
  - crear o vincular subcausa,
  - vincular contrato descendiente mediante `CAUSE -[DEPENDS_ON]-> CONTRACT`,
  - crear o editar hipótesis estructurada,
- desde una hipótesis:
  - editar sus atributos específicos y listas hijas.

### FR-15: Consultas mínimas obligatorias

El backend DEBERÁ exponer consultas equivalentes a:

- obtener hijos estructurales inmediatos de un nodo
- obtener padres estructurales inmediatos de un nodo
- obtener subgrafo estructural descendente desde un contrato o causa raíz
- construir árbol visual determinista desde un nodo raíz
- obtener hipótesis de una causa a través de `relationship`
- obtener una hipótesis estructurada completa por `node_id`
- buscar contratos o causas reutilizables por texto

---

## Non-Functional Requirements

- La proyección de un subgrafo estructural de hasta 300 nodos DEBERÁ completarse en menos de 2 segundos en entorno local con índices aplicados.
- Las operaciones de creación/edición de nodo satélite + relaciones DEBERÁN ser transaccionales.
- La migración DEBERÁ ser idempotente o reejecutable de forma controlada.
- El sistema DEBERÁ mantener trazabilidad suficiente para diagnosticar incidencias de migración entre IDs legacy y `node_id`.
- La UI NO DEBERÁ degradarse a payloads inconsistentes por mezclar modelo legacy y canónico en la misma operación.

---

## Constraints and Assumptions

- Se mantiene PostgreSQL como persistencia operativa canónica.
- Se reutiliza la estructura actual `app/domain/`, `app/persistence/`, `app/pages/`, `app/callbacks/`, `app/components/`.
- La decisión humana confirmada en esta sesión fija la firma nueva como `CAUSE -[DEPENDS_ON]-> CONTRACT`.
- `CONTRACT -[VERIFIED_BY]-> HYPOTHESIS` queda solo como compatibilidad posible de `requerimiento_05`; no es un flujo nuevo requerido por este alcance.
- `industrial_context` de hipótesis se modela como atributo de negocio de la hipótesis, no como relación estructural obligatoria a `PROCESS` o `MACHINE`.
- `node.name` y `node.description` se mantienen como superficie descriptiva principal para `CAUSE` y `HYPOTHESIS`; los satélites almacenan únicamente atributos específicos no derivables.

---

## Out of Scope

- Automatizar análisis analíticos a partir de `decision_rule`.
- Inferir automáticamente nuevas relaciones `CAUSE -> CONTRACT` desde datos históricos no estructurados.
- Rediseñar visualmente la UI más allá de los cambios necesarios para soportar el nuevo modelo.
- Eliminar en este requerimiento toda la deuda técnica histórica no relacionada con causa/hipótesis/grafo.

---

## Acceptance Criteria

| ID | Criterio |
| --- | --- |
| AC-01 | El dominio acepta `CAUSE -[DEPENDS_ON]-> CONTRACT` y rechaza firmas no permitidas. **Criterio:** existen validaciones en backend para la matriz final de firmas y tests para alta válida e inválida. |
| AC-02 | La validación de ciclos detecta un ciclo mixto que use `CAUSE -> CONTRACT`. **Criterio:** intentar persistir una relación que cierre un ciclo estructural retorna error de dominio y no escribe en BD. |
| AC-03 | `causa` deja de contener `contrato_id` y `parent_id`. **Criterio:** en el esquema final esas columnas no existen o están fuera de la tabla canónica en uso. |
| AC-04 | `causa` queda como satélite descriptivo con `node_id` canónico. **Criterio:** existe FK/PK o unicidad obligatoria hacia `node.id` y la lectura funcional de una causa se reconstruye desde `node` + `causa` + `relationship`. |
| AC-05 | La tabla canónica de hipótesis no contiene `causa_id`. **Criterio:** la asociación causa-hipótesis se resuelve mediante `relationship` con `VERIFIED_BY`. |
| AC-06 | El modelo de hipótesis persiste `business_reason`, `analysis_method`, `expected_result`, listas de `required_data` y `expected_evidence`. **Criterio:** una hipótesis del ejemplo de referencia puede guardarse y reconstruirse íntegramente. |
| AC-07 | La proyección estructural soporta el recorrido `CONTRACT -> CAUSE -> CONTRACT -> CAUSE`. **Criterio:** una consulta recursiva o caso de prueba devuelve el árbol proyectado completo y determinista. |
| AC-08 | Los nodos reutilizados se reportan en la proyección. **Criterio:** cuando un nodo es alcanzable por múltiples ramas, la respuesta incluye `reused_node_ids` o metadato equivalente. |
| AC-09 | Los formularios Dash y Java dejan de depender de `parent_id`/`causa_id` como fuente de verdad estructural. **Criterio:** los flujos de guardado construyen relaciones sobre `node` + `relationship` y no escriben FKs legacy estructurales. |
| AC-10 | La migración conserva el comportamiento de los árboles legacy actuales. **Criterio:** un contrato con raíces `CONTRACT -> CAUSE` previas sigue proyectándose correctamente tras la migración. |
| AC-11 | La migración no genera relaciones `CAUSE -> CONTRACT` inventadas. **Criterio:** el script de backfill solo crea esas relaciones cuando exista una fuente explícita definida para ellas. |
| AC-12 | `analisis_causas_detalle` usa `node_id` como referencia canónica. **Criterio:** la trazabilidad de análisis puede seguir apuntando a causas e hipótesis tras eliminar las FKs estructurales legacy. |
| AC-13 | Los repositorios de lectura de hipótesis devuelven el agregado completo por `node_id`. **Criterio:** una consulta backend devuelve `node`, `hypothesis`, `required_data[]` y `expected_evidence[]` ordenados. |
| AC-14 | El spec deja a `requerimiento_07` listo para planificación. **Criterio:** no quedan ambigüedades bloqueantes abiertas sobre firma, persistencia, migración ni proyección. |

---

## Questions for Clarification

No quedan preguntas bloqueantes abiertas en esta iteración.

---

## Decision Log

- 2026-06-02 — Programador humano confirma la nueva firma estructural obligatoria: `CAUSE -[DEPENDS_ON]-> CONTRACT`.
- 2026-06-02 — `requirements-agent` fija `node` + `relationship` como fuente de verdad y redefine `causa` e `hypothesis` como satélites de atributos específicos.
- 2026-06-02 — `requirements-agent` determina que `causa` debe permanecer como satélite descriptivo ligero; no se añaden nuevos campos estructurados adicionales más allá de clasificación propia (`type`, `category`) y timestamps.

