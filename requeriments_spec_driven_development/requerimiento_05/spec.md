# Spec — requerimiento_05: Base de conocimiento causal corporativa en DAG PostgreSQL

## Metadata
- Requirement ID: `requerimiento_05`
- Estado: `vencido` — requisito inicial reformulado; no continuar este flujo.
- Autor del spec: `requirements-agent`
- Fecha: 2026-05-31
- Fuente: `requerimientos_cliente/requerimiento_05.md`

---

## Overview

Este requerimiento sustituye el modelo actual de **árboles causales independientes por contrato** por una **base de conocimiento causal corporativa reutilizable** persistida en PostgreSQL.

El sistema ya dispone hoy de:
- UI Dash y UI Java capaces de representar árboles causales derivados de una estructura jerárquica.
- un core de persistencia en PostgreSQL basado en `contrato`, `causa`, `hipotesis` y `analisis_causas`.
- reglas DAG limitadas al caso actual de un solo `parent_id` por causa.

El objetivo de este requerimiento es mover el core del dominio a un **grafo dirigido acíclico (DAG)** donde contratos, causas, hipótesis, máquinas y procesos sean **nodos corporativos reutilizables**, y sus vínculos se expresen mediante una tabla de relaciones.

Los árboles que ve el usuario pasan a ser una **proyección visual** de una porción del grafo; dejan de ser el modelo persistente principal.

Este cambio impacta al núcleo de dominio, persistencia, DDL, consultas de lectura, lógica de validación de integridad y migración de datos existentes.

---

## Functional Requirements

### FR-01: Sustitución del modelo actual por grafo corporativo

El sistema DEBERÁ dejar de tratar `causa` e `hipotesis` como árboles privados de un contrato y DEBERÁ pasar a tratarlos como nodos reutilizables de un grafo corporativo común.

- El modelo actual basado en:
  - `causa.contrato_id`
  - `causa.parent_id`
  - `hipotesis.causa_id`
  no seguirá siendo el modelo operativo principal para la funcionalidad causal.
- El nuevo modelo operativo DEBERÁ persistirse en PostgreSQL mediante:
  - tabla `node`
  - tabla `relationship`
- Un contrato existente podrá ser reutilizado como hijo causal de más de un contrato superior.
- Una causa existente podrá ser reutilizada por múltiples contratos o causas superiores.
- Una hipótesis existente podrá vincularse a más de un nodo superior cuando la semántica del caso lo requiera.
- La representación en árbol que consumen `app/pages/arbol.py`, `app/pages/analisis_causas_v2.py` y sus equivalentes en `uc_bib_solv/webapp_java/` DEBERÁ construirse dinámicamente a partir del grafo, no desde `parent_id`.

### FR-02: Tipos de nodo corporativos obligatorios

El sistema DEBERÁ soportar, como mínimo, los siguientes `node_type`:

- `CONTRACT`
- `CAUSE`
- `HYPOTHESIS`
- `MACHINE`
- `PROCESS`

Reglas funcionales:

- Cada nodo DEBERÁ existir una única vez por significado corporativo dentro del catálogo activo.
- Cada nodo DEBERÁ disponer de un `code` único y estable.
- `name` será obligatorio para todos los tipos.
- `description` será opcional.
- `status` podrá almacenar el estado funcional del nodo si aplica.

### FR-03: Tipos de relación obligatorios

El sistema DEBERÁ soportar, como mínimo, los siguientes `relationship_type`:

- `DEPENDS_ON`
- `CAUSES`
- `VERIFIED_BY`
- `BELONGS_TO`

Semántica mínima:

- `CONTRACT DEPENDS_ON CONTRACT|CAUSE`
- `CAUSE CAUSES CAUSE|HYPOTHESIS`
- `CONTRACT VERIFIED_BY HYPOTHESIS` y `CAUSE VERIFIED_BY HYPOTHESIS` cuando aplique
- `CONTRACT|CAUSE BELONGS_TO MACHINE|PROCESS`

La validación exacta de combinaciones válidas de `parent_node_type`, `child_node_type` y `relationship_type` DEBERÁ ejecutarse en backend antes de persistir.

### FR-04: Grafo acíclico e integridad estructural

El sistema DEBERÁ garantizar que el grafo causal operativo siga siendo un DAG válido.

- No se permitirá crear una relación que introduzca un ciclo.
- La validación de ciclos DEBERÁ ejecutarse en backend/dominio antes de `INSERT` o `UPDATE` de relaciones.
- El sistema DEBERÁ rechazar explícitamente:
  - auto-relaciones (`A -> A`)
  - ciclos transitivos (`A -> B -> C -> A`)
  - relaciones duplicadas semánticamente equivalentes entre el mismo parent y child con el mismo `relationship_type`
- La capa de persistencia DEBERÁ reforzar la integridad con:
  - FKs a `node(id)`
  - constraint de unicidad sobre `(parent_node_id, child_node_id, relationship_type)`
  - índices para lectura por padre y por hijo

### FR-05: Reutilización preferente frente a duplicación

Cuando un usuario quiera añadir un hijo causal a un nodo, la UI DEBERÁ ofrecer las siguientes opciones explícitas:

- crear nodo nuevo del tipo permitido
- vincular nodo existente del tipo permitido

Como mínimo, para contratos y causas, la UI deberá exponer:

- `Crear causa nueva`
- `Crear contrato nuevo`
- `Vincular causa existente`
- `Vincular contrato existente`

La opción de reutilizar nodos existentes DEBERÁ estar disponible antes de cerrar el flujo de creación.

### FR-06: Proyección visual en forma de árbol

La UI continuará mostrando una estructura jerárquica tipo árbol para la investigación causal.

- La vista árbol NO DEBERÁ exponer el grafo completo corporativo a nivel de interacción base.
- La vista DEBERÁ generarse recorriendo el grafo a partir de un nodo raíz seleccionado.
- La proyección visual DEBERÁ ser determinista para un mismo nodo raíz y un mismo criterio de orden.
- Si un nodo tiene múltiples padres en el grafo, la vista árbol DEBERÁ mostrar el nodo dentro de la rama desde la que fue alcanzado durante el recorrido actual.
- La detección de nodos reutilizados DEBERÁ quedar disponible para UI posterior mediante metadatos de respuesta, aunque la primera versión pueda seguir renderizando una vista tipo árbol simple.

### FR-07: Persistencia PostgreSQL y ubicación de responsabilidades

La arquitectura de persistencia para este requerimiento DEBERÁ quedar separada de forma explícita:

- `config/settings.py`
  - mantiene la configuración de conexión PostgreSQL.
- `app/persistence/db.py`
  - mantiene la creación de conexión y manejo de cursor/transacción.
- `db/schema.sql`
  - mantiene el DDL canónico del esquema operativo.
- `app/persistence/`
  - contendrá los repositorios SQL del grafo.
- `app/domain/`
  - contendrá las reglas de negocio y validaciones del DAG, sin SQL embebido.
- `app/callbacks/`, `app/pages/`, `app/components/`
  - consumirán casos de uso o repositorios ya preparados; no definen DDL ni validaciones estructurales del grafo.

Ubicación requerida de nuevos módulos:

- `app/domain/graph.py` o módulo equivalente dentro de `app/domain/`
  - reglas de integridad del grafo, validación de ciclos, validación de tipos de relación, proyección de árbol.
- `app/persistence/node_repo.py`
  - CRUD y búsquedas de nodos.
- `app/persistence/relationship_repo.py`
  - CRUD y consultas por padre/hijo de relaciones.
- `app/persistence/graph_query_repo.py`
  - consultas recursivas y construcción de payloads de árbol/vecindad si se separa la responsabilidad de los repositorios básicos.

No se justifica un nuevo directorio de primer nivel: la nueva capacidad pertenece al mismo bounded context causal ya alojado en `app/domain` y `app/persistence`.

### FR-08: Split obligatorio frontend / backend

La división de responsabilidades DEBERÁ ser la siguiente.

Frontend (`app/pages/`, `app/components/`, `app/callbacks/`, y `uc_bib_solv/webapp_java/webapp/`):

- seleccionar nodo raíz o contexto de árbol
- mostrar la proyección visual del árbol
- abrir flujos de crear/vincular nodo
- mostrar mensajes de error y confirmación
- prevenir acciones incompletas de interacción básica
- enviar al backend la intención del usuario y el payload validable

Backend / dominio / persistencia (`app/domain/`, `app/persistence/`, `db/`):

- validar si la combinación de nodos y relación es válida
- validar ausencia de ciclos
- resolver reutilización frente a creación
- persistir nodos y relaciones
- construir la proyección de árbol desde el grafo
- resolver consultas de padres, hijos y vecindad
- decidir qué nodos se pueden eliminar o bloquear por reutilización
- ejecutar migración de datos desde el esquema actual

Validación por capa:

- frontend: validaciones de formato, obligatoriedad básica y prevención de submits vacíos
- backend: validaciones de integridad, negocio, tipos, existencia, duplicidad, aciclicidad y reglas de borrado

### FR-09: Compatibilidad con análisis causal existente

El sistema DEBERÁ conservar la capacidad de realizar análisis causales y vistas de árbol ya existentes, pero re-apuntadas al nuevo core.

- `analisis_causas` y `analisis_causas_v2` seguirán existiendo como superficies funcionales.
- La trazabilidad de análisis (`analisis_causas`, `analisis_causas_detalle`) DEBERÁ mantenerse en alcance.
- La persistencia de trazabilidad DEBERÁ migrarse para referenciar nodos genéricos del grafo cuando deje de ser suficiente depender de `causa_id` o `hipotesis_id`.
- Mientras dure la migración, puede existir una fase técnica transitoria, pero el estado final esperado de este requerimiento es que el core causal operativo dependa de `node` y `relationship`.

### FR-10: Borrado con protección por reutilización

El sistema NO DEBERÁ permitir el borrado silencioso de un nodo reutilizado por múltiples padres.

- Si un nodo no tiene relaciones entrantes ni dependencias funcionales activas, podrá eliminarse según las reglas del dominio.
- Si un nodo está siendo utilizado por otros nodos, el sistema DEBERÁ bloquear el borrado o requerir una confirmación explícita en un flujo controlado.
- La decisión final de borrado se ejecutará en backend tras comprobar:
  - relaciones entrantes
  - relaciones salientes
  - trazabilidad de análisis asociada

### FR-11: Consultas mínimas obligatorias

El backend DEBERÁ exponer consultas equivalentes a las siguientes capacidades:

- obtener hijos inmediatos de un nodo
- obtener padres inmediatos de un nodo
- obtener subgrafo descendente desde un nodo raíz
- construir árbol visual ordenado desde un nodo raíz
- obtener candidatos reutilizables por tipo de nodo y filtro de texto

Las consultas recursivas DEBERÁN apoyarse en PostgreSQL y/o composición backend, pero el contrato funcional es obligatorio.

### FR-12: Migración del modelo existente

El requerimiento incluye migración de datos del esquema actual al nuevo esquema.

El proceso de migración DEBERÁ:

- crear las nuevas tablas `node` y `relationship`
- poblar nodos `PROCESS`, `MACHINE`, `CONTRACT`, `CAUSE` y `HYPOTHESIS` a partir de las tablas actuales
- crear relaciones:
  - `PROCESS`/`MACHINE`/`CONTRACT` según asociaciones existentes
  - `CAUSES` desde la jerarquía `causa.parent_id`
  - `VERIFIED_BY` desde `hipotesis.causa_id`
  - `BELONGS_TO` cuando existan asociaciones vigentes
- registrar una estrategia de mapeo entre IDs legacy y nodos nuevos para preservar trazabilidad durante la transición
- permitir reconstruir todas las vistas actuales sin pérdida funcional

La migración DEBERÁ dejar explícito el destino de las tablas legacy:

- o quedan como tablas transitorias solo de soporte de migración
- o quedan deprecadas para eliminación posterior

En cualquier caso, `causa.parent_id` y `hipotesis.causa_id` NO deben seguir siendo la fuente de verdad del dominio causal al cerrar este requerimiento.

---

## Persistence Architecture

### Esquema objetivo

El esquema objetivo mínimo en `db/schema.sql` DEBERÁ incluir:

- `node`
- `relationship`
- índices por `node_type`, `code`
- índices por `relationship.parent_node_id`
- índices por `relationship.child_node_id`
- constraint única por relación lógica

DDL base esperado:

```sql
CREATE TABLE node (
    id BIGSERIAL PRIMARY KEY,
    node_type VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE relationship (
    id BIGSERIAL PRIMARY KEY,
    parent_node_id BIGINT NOT NULL REFERENCES node(id) ON DELETE RESTRICT,
    child_node_id BIGINT NOT NULL REFERENCES node(id) ON DELETE RESTRICT,
    relationship_type VARCHAR(50) NOT NULL,
    weight NUMERIC(10,4),
    sequence INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (parent_node_id, child_node_id, relationship_type)
);
```

### Colocación de artefactos

- DDL y evolución de esquema:
  - `db/schema.sql`
  - scripts auxiliares en `db/` solo si el equipo decide separarlos en una siguiente fase
- conexión y transacciones:
  - `app/persistence/db.py`
- repositorios SQL:
  - `app/persistence/`
- reglas de dominio:
  - `app/domain/`

### Separación modelo persistente vs lógica de dominio

- `node` y `relationship` son el modelo persistente.
- La semántica de “qué tipos se pueden relacionar” y “qué constituye un ciclo inválido” pertenece al dominio, no al frontend.
- Los repositorios implementan acceso SQL; no deciden por sí solos las reglas de negocio.

---

## Data Model Placement

### Modelo persistente

Vive en:

- `db/schema.sql`
- `app/persistence/node_repo.py`
- `app/persistence/relationship_repo.py`

### Reglas de dominio

Viven en:

- `app/domain/graph.py` o equivalente

Responsabilidades:

- validar aciclicidad
- validar combinaciones de tipos
- transformar subgrafo en árbol visual
- decidir restricciones de borrado

### Adaptación de vistas existentes

La proyección hacia las vistas actuales se implementará consumiendo el nuevo modelo desde:

- `app/callbacks/causa_callbacks.py`
- `app/callbacks/analisis_causas_v2_callbacks.py`
- `app/components/panel_arbol.py`
- `uc_bib_solv/webapp_java/webapp/js/components/tree-render.js`

Estas capas consumen payloads ya resueltos; no realizan consultas SQL directas ni validan el DAG corporativo.

---

## Non-Functional Requirements

### NFR-01: PostgreSQL como persistencia única operativa

La fuente de verdad de este requerimiento seguirá siendo PostgreSQL.

- No se introduce Neo4j ni otro motor de grafos.
- La lógica de recorrido y validación se resuelve con PostgreSQL + backend Python.

### NFR-02: Continuidad funcional

La migración al grafo no deberá eliminar la capacidad actual de:

- listar procesos
- listar contratos
- navegar el árbol visual
- evaluar hipótesis
- ejecutar análisis causales existentes

### NFR-03: Rendimiento de construcción de árbol

La construcción del árbol visual desde un nodo raíz para un subgrafo de hasta 200 nodos deberá completarse en tiempo adecuado para uso interactivo local.

Criterio operativo objetivo:
- respuesta backend inferior a 2 segundos en entorno local de referencia

### NFR-04: Trazabilidad de migración

El sistema deberá permitir auditar cómo una entidad legacy fue transformada al nuevo grafo.

- Debe existir estrategia de mapeo entre IDs antiguos y nuevos nodos.
- La migración no debe dejar datos huérfanos sin regla documentada.

### NFR-05: Mensajes de error accionables

Toda operación rechazada por:

- ciclo detectado
- nodo inexistente
- tipo de relación inválido
- borrado bloqueado por reutilización
- duplicado lógico

deberá devolver un mensaje claro al usuario.

---

## Constraints and Assumptions

- Persistencia obligatoria en PostgreSQL, sin cambio de motor.
- El impacto en core es alto y afecta dominio, persistencia, UI y migración.
- La estructura vigente del proyecto se reutiliza:
  - dominio en `app/domain/`
  - persistencia en `app/persistence/`
  - DDL en `db/`
  - configuración en `config/`
- No se crea un nuevo directorio top-level para el grafo porque la responsabilidad sigue perteneciendo al bounded context causal existente.
- La UI seguirá mostrando un árbol como abstracción principal para el usuario final, aunque el modelo persistente sea un grafo.
- El objetivo final de este requerimiento es reemplazar el modelo operativo de árboles independientes por contrato; no mantener ambos modelos como equivalentes permanentes.

---

## Out of Scope

- Introducir un motor de grafos externo distinto de PostgreSQL.
- Exponer al usuario final una exploración libre del grafo corporativo completo en esta fase.
- Rediseñar toda la UX causal más allá de lo necesario para soportar crear/vincular nodos reutilizables.
- Añadir scoring automático, ML, LLM o ranking causal.
- Definir una política avanzada de versionado temporal de nodos o relaciones si no es necesaria para cerrar la migración base.

---

## Migration Impact

### Impacto en esquema

Se deberán modificar o ampliar al menos:

- [db/schema.sql](/home/pedro/proyectos visual studio code/UC_BIB_Solve/db/schema.sql)

Con efectos sobre:

- creación de `node`
- creación de `relationship`
- índices y constraints
- eventual deprecación de dependencias estructurales sobre `causa.parent_id` y `hipotesis.causa_id`

### Impacto en backend

Se deberán crear o refactorizar:

- [app/domain/arbol.py](/home/pedro/proyectos visual studio code/UC_BIB_Solve/app/domain/arbol.py)
- [app/persistence/causa_repo.py](/home/pedro/proyectos visual studio code/UC_BIB_Solve/app/persistence/causa_repo.py)
- [app/persistence/hipotesis_repo.py](/home/pedro/proyectos visual studio code/UC_BIB_Solve/app/persistence/hipotesis_repo.py)
- [app/persistence/contrato_repo.py](/home/pedro/proyectos visual studio code/UC_BIB_Solve/app/persistence/contrato_repo.py)

Y previsiblemente añadir:

- `app/domain/graph.py`
- `app/persistence/node_repo.py`
- `app/persistence/relationship_repo.py`
- `app/persistence/graph_query_repo.py`

### Impacto en frontend

Se deberán adaptar las superficies que hoy asumen árbol privado por contrato:

- [app/pages/arbol.py](/home/pedro/proyectos visual studio code/UC_BIB_Solve/app/pages/arbol.py)
- [app/callbacks/causa_callbacks.py](/home/pedro/proyectos visual studio code/UC_BIB_Solve/app/callbacks/causa_callbacks.py)
- [app/callbacks/analisis_causas_v2_callbacks.py](/home/pedro/proyectos visual studio code/UC_BIB_Solve/app/callbacks/analisis_causas_v2_callbacks.py)
- [app/components/panel_arbol.py](/home/pedro/proyectos visual studio code/UC_BIB_Solve/app/components/panel_arbol.py)
- [uc_bib_solv/webapp_java/webapp/js/components/tree-render.js](/home/pedro/proyectos visual studio code/UC_BIB_Solve/uc_bib_solv/webapp_java/webapp/js/components/tree-render.js)

La adaptación consiste en consumir proyecciones del grafo y en añadir flujos de reutilización de nodos existentes.

---

## Acceptance Criteria

### AC — Modelo y persistencia

| ID | Criterio |
|----|----------|
| AC-01 | El esquema PostgreSQL incorpora `node` y `relationship`. **Criterio:** `db/schema.sql` define ambas tablas con FKs, timestamps e índice/constraint de unicidad de relaciones. |
| AC-02 | El modelo operativo deja de depender de `causa.parent_id` como fuente de verdad. **Criterio:** la construcción del árbol visual y las consultas de hijos/padres se alimentan desde `relationship`. |
| AC-03 | Los tipos de nodo obligatorios están soportados. **Criterio:** existen validaciones y persistencia para `CONTRACT`, `CAUSE`, `HYPOTHESIS`, `MACHINE` y `PROCESS`. |
| AC-04 | Los tipos de relación obligatorios están soportados. **Criterio:** existen validaciones y persistencia para `DEPENDS_ON`, `CAUSES`, `VERIFIED_BY` y `BELONGS_TO`. |

### AC — Integridad y dominio

| ID | Criterio |
|----|----------|
| AC-05 | El backend rechaza ciclos. **Criterio:** intentar persistir `A -> B`, `B -> C`, `C -> A` devuelve error controlado y no escribe la tercera relación. |
| AC-06 | El backend rechaza relaciones inválidas por tipo. **Criterio:** una combinación no permitida de `node_type` y `relationship_type` devuelve error controlado. |
| AC-07 | El backend evita duplicados lógicos. **Criterio:** no puede persistirse dos veces la misma combinación `parent_node_id`, `child_node_id`, `relationship_type`. |
| AC-08 | El borrado de un nodo reutilizado está protegido. **Criterio:** si un nodo tiene más de un padre o dependencias activas, el backend bloquea el borrado o exige confirmación explícita según el flujo aprobado. |

### AC — Frontend / backend split

| ID | Criterio |
|----|----------|
| AC-09 | La UI sigue mostrando árbol. **Criterio:** desde un nodo raíz seleccionado se renderiza una jerarquía navegable sin exponer el grafo completo al usuario final. |
| AC-10 | La UI permite reutilizar conocimiento. **Criterio:** al añadir un hijo, existen opciones visibles para crear nodo nuevo o vincular nodo existente. |
| AC-11 | La UI no decide integridad del grafo. **Criterio:** la validación final de ciclos, compatibilidad de tipos y borrado protegido ocurre en backend aunque el frontend haga validaciones básicas. |

### AC — Migración

| ID | Criterio |
|----|----------|
| AC-12 | Los datos legacy se migran al nuevo esquema. **Criterio:** procesos, máquinas, contratos, causas e hipótesis existentes generan nodos y relaciones equivalentes en `node` y `relationship`. |
| AC-13 | La migración preserva trazabilidad. **Criterio:** existe un mecanismo documentado para relacionar IDs legacy con nodos nuevos durante la transición. |
| AC-14 | Las vistas actuales siguen reconstruibles. **Criterio:** una vista árbol para un contrato existente sigue pudiendo renderizarse tras la migración usando el nuevo core. |

### AC — Rendimiento y operación

| ID | Criterio |
|----|----------|
| AC-15 | La construcción de subárboles es interactiva. **Criterio:** un subgrafo de hasta 200 nodos se proyecta a árbol visual en menos de 2 segundos en entorno local de referencia. |
| AC-16 | PostgreSQL sigue siendo la única persistencia operativa del core causal. **Criterio:** no se introduce un motor de grafos adicional para cumplir este requerimiento. |

---

## Questions for Clarification

Sin preguntas bloqueantes. El requerimiento define de forma suficiente:

- sustitución del modelo por DAG corporativo
- persistencia en PostgreSQL
- reutilización de contratos, causas e hipótesis
- representación UI en árbol como proyección del grafo

---

## Decision Log

| ID | Decisión | Responsable | Motivo |
|----|----------|-------------|--------|
| D-01 | El nuevo core causal se implementa sobre PostgreSQL con tablas `node` y `relationship`. | Programador humano / requerimiento cliente | El requerimiento lo indica explícitamente y el contexto confirma que la persistencia sigue en PostgreSQL. |
| D-02 | La estructura vigente del repositorio se reutiliza: dominio en `app/domain/`, persistencia en `app/persistence/` y DDL en `db/`. | requirements-agent | La capacidad nueva pertenece al mismo bounded context causal ya existente; no se justifica un nuevo directorio top-level. |
| D-03 | La UI seguirá mostrando árbol aunque el modelo persistente sea grafo. | Programador humano / requerimiento cliente | El requerimiento establece que el árbol es una representación visual de una porción del grafo. |
| D-04 | El estado final esperado reemplaza el modelo operativo basado en `causa.parent_id` e `hipotesis.causa_id` como fuente de verdad. | requirements-agent | Es la consecuencia necesaria para cumplir el cambio de core solicitado y evitar duplicación de conocimiento. |

---

## Amendments

Sin enmiendas registradas en este momento.
