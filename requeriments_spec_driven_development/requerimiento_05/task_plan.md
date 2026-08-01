# Task Plan — requerimiento_05: Migración del core causal desde árbol legacy a DAG corporativo en PostgreSQL

## Metadata
- Requirement ID: `requerimiento_05`
- Spec File: `./requeriments_spec_driven_development/requerimiento_05/spec.md`
- Status: `en_correccion`
- Allowed Status Values:
  - `pending_human_validation`
  - `approved`
  - `in_progress`
  - `blocked`
  - `implementado_pendiente_validacion`
  - `no_conforme`
  - `en_correccion`
  - `done`
- Owner: `plan-task-agent`
- Created At: `2026-05-31`
- Last Updated: `2026-05-31`

---

## Objective

Planificar una migración controlada del modelo causal actual basado en `causa.parent_id` y `hipotesis.causa_id` hacia un core corporativo en forma de DAG sobre PostgreSQL, manteniendo continuidad funcional en Dash y `webapp_java`, preservando la trazabilidad de análisis y cerrando el requerimiento con el nuevo modelo `node` + `relationship` como única fuente de verdad operativa.

---

## Functional Inventory

### Legacy data structures and current source of truth

| Legacy artifact | Current role | Migration expectation |
| --- | --- | --- |
| `db/schema.sql` tablas `proceso`, `contrato`, `maquina`, `contrato_maquina`, `causa`, `hipotesis`, `analisis_causas`, `analisis_causas_detalle` | Modelo relacional operativo actual | Ampliar con `node` + `relationship` y estrategia explícita de transición |
| `app/persistence/causa_repo.py` | CRUD y lectura jerárquica de causas | Reapuntar a repositorios de grafo o dejarlo como adaptador transitorio |
| `app/persistence/hipotesis_repo.py` | Persistencia de hipótesis por `causa_id` | Migrar a enlaces `VERIFIED_BY` y nodos `HYPOTHESIS` |
| `app/persistence/contrato_repo.py` | Gestión de contratos y asociaciones | Reutilizar para catálogo, integrando grafo para navegación causal |
| `app/domain/arbol.py` | Reglas actuales del árbol y validaciones básicas DAG | Evolucionar a proyección de árbol desde grafo o delegar en `app/domain/graph.py` |
| `app/domain/analisis_causas.py` | Lógica de análisis causal existente | Reapuntar a IDs de nodo y consultas de grafo |

### Current UI consumers that assume tree/private-contract semantics

| Surface | Relevant files | Required adaptation |
| --- | --- | --- |
| Dash tree navigation | `app/pages/arbol.py`, `app/callbacks/causa_callbacks.py`, `app/components/panel_arbol.py` | Consumir proyección de árbol generada desde `relationship` |
| Dash causal analysis | `app/pages/analisis_causas_v2.py`, `app/callbacks/analisis_causas_v2_callbacks.py`, `app/components/panel_analisis_causas_v2.py` | Mantener flujo actual usando backend basado en nodos genéricos |
| Dash cause detail | `app/pages/causa_detalle.py`, `app/callbacks/causa_detalle_callbacks.py`, `app/components/panel_edicion.py`, `app/components/panel_hipotesis.py` | Soportar crear/vincular nodos y mostrar reutilización |
| Java webapp tree UI | `uc_bib_solv/webapp_java/webapp/js/components/tree-render.js`, `tree-data.js`, `tree-actions.js`, `js/views/arboles_v02.js`, `js/views/analisis_causas_v02.js` | Consumir payloads de grafo proyectado y exponer flujos crear/vincular |
| Java backend | `uc_bib_solv/webapp_java/python-backend/routes/causas.py`, `services/causas_service.py`, `repositories/causas_repository.py`, `services/causa_detail_service.py`, `repositories/causa_detail_repository.py` | Exponer APIs compatibles con el nuevo core DAG |

### Compatibility phases required by this plan

| Phase | Goal | Exit condition |
| --- | --- | --- |
| `P0` | Inventario y freeze funcional | Alcance y consumidores legacy identificados |
| `P1` | Introducción aditiva del nuevo esquema | `node` y `relationship` creados sin romper el flujo actual |
| `P2` | Migración y dualidad controlada de datos | Mapeo legacy→node disponible y datos cargados |
| `P3` | Cambio de lecturas y validaciones al core DAG | Dash y Java leen del grafo proyectado |
| `P4` | Corte final de fuente de verdad | `causa.parent_id` y `hipotesis.causa_id` dejan de ser la referencia operativa |

---

## Scope

### In Scope
- Evolución del esquema PostgreSQL para introducir `node` y `relationship`.
- Definición del modelo de dominio DAG y de sus invariantes.
- Repositorios SQL y consultas recursivas para lectura de hijos, padres, subgrafo y árbol proyectado.
- Migración de datos legacy con estrategia auditable de mapeo de IDs.
- Adaptación de backend Dash y backend Java al nuevo core.
- Adaptación de frontends Dash y `webapp_java` para flujos de crear/vincular y consumo de proyecciones de árbol.
- Protección de borrado, validación de ciclos, validación de combinaciones de tipos y bloqueo de duplicados.
- Estrategia de compatibilidad temporal y corte final del modelo legacy.
- Verificación funcional, de migración, de trazabilidad y de rendimiento.

### Out of Scope
- Introducción de Neo4j u otro motor de grafos.
- Exploración libre del grafo corporativo completo por el usuario final.
- Rediseño visual amplio de Dash o `webapp_java` más allá de lo necesario para soportar reutilización y proyección DAG.
- Nuevos algoritmos de scoring, ranking, ML o LLM.
- Versionado temporal avanzado de nodos/relaciones no exigido por el spec.

---

## Inputs
- Client requirement: `./requerimientos_cliente/requerimiento_05.md`
- Technical specification: `./requeriments_spec_driven_development/requerimiento_05/spec.md`
- Supporting docs:
  - `./context.md`
  - `./README.md`
  - `./requerimientos_cliente/traza_requerimiento.md`
- Data model and bootstrap artifacts:
  - `db/schema.sql`
  - `db/init_db.py`
  - `config/settings.py`
  - `app/persistence/db.py`
- Current domain and persistence modules:
  - `app/domain/arbol.py`
  - `app/domain/analisis_causas.py`
  - `app/persistence/causa_repo.py`
  - `app/persistence/hipotesis_repo.py`
  - `app/persistence/contrato_repo.py`
  - `app/persistence/analisis_causas_repo.py`
  - `app/persistence/analisis_causas_detalle_repo.py`
- Current Dash consumers:
  - `app/pages/arbol.py`
  - `app/pages/analisis_causas_v2.py`
  - `app/pages/causa_detalle.py`
  - `app/callbacks/causa_callbacks.py`
  - `app/callbacks/analisis_causas_v2_callbacks.py`
  - `app/callbacks/causa_detalle_callbacks.py`
- Current Java consumers:
  - `uc_bib_solv/webapp_java/python-backend/routes/causas.py`
  - `uc_bib_solv/webapp_java/python-backend/services/causas_service.py`
  - `uc_bib_solv/webapp_java/python-backend/repositories/causas_repository.py`
  - `uc_bib_solv/webapp_java/python-backend/services/causa_detail_service.py`
  - `uc_bib_solv/webapp_java/python-backend/repositories/causa_detail_repository.py`
  - `uc_bib_solv/webapp_java/webapp/js/components/tree-render.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/tree-data.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/tree-actions.js`
  - `uc_bib_solv/webapp_java/webapp/js/views/arboles_v02.js`
  - `uc_bib_solv/webapp_java/webapp/js/views/analisis_causas_v02.js`

---

## Assumptions
- La instrucción humana de esta fase confirma que el `spec.md` está validado, aunque su metadata aún muestre `spec_pendiente_validacion`.
- El modelo actual en `causa` e `hipotesis` sigue disponible para migración y contraste hasta completar `P4`.
- Se admite convivencia técnica temporal de lectura legacy solo como puente de migración; no como estado final.
- La ruta preferida para nuevas reglas de dominio es `app/domain/graph.py`, manteniendo `app/domain/arbol.py` como adaptador o módulo de compatibilidad si resulta necesario.
- La migración puede introducir artefactos auxiliares de mapeo en PostgreSQL o scripts en `db/` siempre que su responsabilidad quede explícita y no cambie el bounded context.
- Las superficies Dash y Java deben converger sobre el mismo contrato backend de proyección de árbol y operaciones de grafo, evitando duplicar reglas de integridad en frontend.

---

## Dependencies
- Sub-agents / skills relevantes:
  - `requirements-agent`
  - `plan-task-agent`
  - `execute-agent`
  - `documentation-agent`
  - `context-agent`
  - `data-model-management`
  - `domain-logic`
  - `postgresql-primary-persistence`
  - `webapp-architecture`
  - `web-Dash-Dataiku`
  - `dash-callbacks`
- Technical dependencies:
  - PostgreSQL operativo accesible desde `app/persistence/db.py`
  - `psycopg2` y configuración en `config/settings.py`
  - Soporte de consultas SQL recursivas en PostgreSQL
  - Capacidad de ejecutar scripts de inicialización/migración desde `db/`
  - Suite de tests Python en `tests/`
  - Backends Dash y Java desplegables en el entorno actual

---

## Execution Strategy

1. Fijar primero el inventario funcional, el contrato de compatibilidad y la secuencia de corte, porque el riesgo principal no está en crear tablas sino en no romper las dos UIs ni la trazabilidad de análisis.
2. Introducir el esquema DAG de forma aditiva en PostgreSQL, con DDL, constraints, índices y mecanismo de mapeo legacy→node antes de cambiar consumidores.
3. Separar con claridad dominio y persistencia: reglas de aciclicidad, combinaciones válidas, borrado protegido y proyección de árbol en `app/domain/`; SQL y CTEs recursivas en `app/persistence/`.
4. Migrar y validar los datos existentes antes de reapuntar las lecturas de Dash y Java, para evitar que los consumidores cambien contra un grafo incompleto.
5. Cambiar backend y APIs por capas: primero repositorios y casos de uso, después adaptadores Dash, después backend Java, y por último los frontends.
6. Mantener una fase de compatibilidad explícita con dualidad controlada de datos/lecturas mientras se ejecutan pruebas de regresión y validación humana.
7. Cerrar con un cutover explícito donde `relationship` pasa a ser la única fuente de verdad y las referencias estructurales legacy quedan deprecadas o solo para soporte transitorio documentado.

---

## Human Validation Gates

### Gate 1: Spec Validation
- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `approved`
- Evidence:
  - La petición de esta fase indica explícitamente que el spec de `requerimiento_05` ya ha sido validado por el humano.

### Gate 2: Task Plan Approval
- Required State Before Implementation: aprobación humana explícita de este `task_plan.md`.
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `execute-agent` no debe comenzar T1-T11 hasta que Gate 2 quede aprobado.
  - Cualquier ajuste material del plan por enmienda tipo C obliga a reabrir este gate.

### Gate 3: Final Implementation Validation
- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - La validación final debe cubrir migración, integridad DAG, continuidad funcional en Dash/Java y cierre de la compatibilidad legacy.

### Human checkpoints inside execution

| Checkpoint | Trigger | Human decision required |
| --- | --- | --- |
| `HC-01` | Fin de T2 | Aprobar el diseño de transición y el mecanismo de mapeo legacy |
| `HC-02` | Fin de T5 | Aprobar resultados de ensayo de migración y estrategia de rollback |
| `HC-03` | Fin de T8 | Aprobar que Dash y Java ya consumen el core DAG sin regresiones críticas |
| `HC-04` | Fin de T10 | Aprobar el corte final del modelo legacy como no-fuente-de-verdad |

---

## Tasks

### T1. Inventario de impacto y baseline de compatibilidad
- Goal: fijar el mapa completo de dependencias funcionales y técnicas antes de tocar esquema o consumidores.
- Inputs:
  - `spec.md`
  - `context.md`
  - módulos `app/domain/`, `app/persistence/`, `app/pages/`, `app/callbacks/`
  - módulos `uc_bib_solv/webapp_java/python-backend/` y `webapp/`
- Actions:
  - identificar todas las lecturas y escrituras que hoy dependen de `causa.parent_id`, `hipotesis.causa_id` o del supuesto “árbol privado por contrato”;
  - clasificar consumidores por capa: dominio, persistencia, Dash backend, Dash UI, Java backend, Java UI;
  - documentar qué operaciones deben mantenerse estables durante `P1-P3`;
  - fijar el contrato mínimo de compatibilidad para `analisis_causas`, `analisis_causas_v2`, `arbol` y `causa_detalle`.
- Output:
  - inventario de impacto y matriz de compatibilidad que alimenta el resto de tareas.
- Status: `pending`

### T2. Diseño técnico de transición y modelo persistente objetivo
- Goal: traducir el spec a un diseño ejecutable de tablas, relaciones, mapping y fases de corte.
- Inputs:
  - T1
  - `db/schema.sql`
  - `data-model-management`
  - `postgresql-primary-persistence`
- Actions:
  - definir estructura final de `node` y `relationship`, tipos permitidos, constraints e índices;
  - decidir el mecanismo de trazabilidad legacy→node, incluyendo si se usa tabla explícita de mapping o columnas de referencia transitoria;
  - especificar tratamiento de `analisis_causas` y `analisis_causas_detalle` para referenciar nodos genéricos;
  - documentar fases `P1-P4`, rollback de migración y criterio de retirada del modelo estructural legacy;
  - elevar a checkpoint humano `HC-01` antes de ejecutar la migración.
- Output:
  - diseño técnico aprobado para esquema, mapping y transición.
- Status: `pending`

### T3. Evolución de esquema PostgreSQL y artefactos de inicialización/migración
- Goal: materializar el nuevo esquema operativo sin romper la base actual.
- Inputs:
  - T2
  - `db/schema.sql`
  - `db/init_db.py`
  - `config/settings.py`
  - `app/persistence/db.py`
- Actions:
  - ampliar `db/schema.sql` con `node`, `relationship`, índices, FKs y unicidad lógica;
  - añadir artefactos en `db/` para inicialización/migración idempotente según convenga al proyecto;
  - preparar soporte de conexión/transacción para operaciones de migración y consultas recursivas;
  - asegurar que el DDL y los scripts pueden ejecutarse repetidamente en entorno local de referencia.
- Output:
  - esquema DAG disponible y artefactos de inicialización/migración listos para ejecución.
- Status: `pending`

### T4. Implementación del dominio DAG y de sus invariantes
- Goal: mover la semántica del grafo a la capa de dominio, sin depender de UI ni SQL embebido.
- Inputs:
  - T2
  - `app/domain/arbol.py`
  - `app/domain/analisis_causas.py`
  - `domain-logic`
- Actions:
  - crear `app/domain/graph.py` o módulo equivalente en `app/domain/`;
  - implementar reglas de validación de ciclos, auto-relaciones, combinaciones `node_type`/`relationship_type`, duplicados lógicos y borrado protegido;
  - definir la construcción de árbol visual como proyección determinista de un subgrafo;
  - adaptar `app/domain/arbol.py` y `app/domain/analisis_causas.py` para consumir el nuevo núcleo sin dejar reglas duplicadas.
- Output:
  - capa de dominio DAG reutilizable por Dash y Java.
- Status: `pending`

### T5. Repositorios SQL y consultas recursivas del grafo
- Goal: encapsular acceso a nodos, relaciones, migración y proyecciones en la capa de persistencia.
- Inputs:
  - T3
  - T4
  - `app/persistence/causa_repo.py`
  - `app/persistence/hipotesis_repo.py`
  - `app/persistence/contrato_repo.py`
  - `data-model-management`
- Actions:
  - crear `app/persistence/node_repo.py`, `relationship_repo.py` y `graph_query_repo.py`;
  - implementar CRUD, búsquedas por tipo/código, lecturas por padre/hijo y obtención de candidatos reutilizables;
  - implementar consultas recursivas para subgrafo descendente y árbol visual ordenado;
  - adaptar o envolver `causa_repo.py`, `hipotesis_repo.py` y `contrato_repo.py` para que los consumidores existentes puedan transicionar sin drift;
  - cubrir explícitamente consultas mínimas de FR-11.
- Output:
  - repositorios DAG y adaptadores de compatibilidad listos para consumo.
- Status: `pending`

### T6. Migración de datos legacy y ensayo de trazabilidad
- Goal: poblar el nuevo grafo a partir del modelo actual sin pérdida funcional ni opacidad de mapping.
- Inputs:
  - T3
  - T5
  - datos existentes en PostgreSQL
  - `analisis_causas` y `analisis_causas_detalle`
- Actions:
  - migrar `PROCESS`, `MACHINE`, `CONTRACT`, `CAUSE` y `HYPOTHESIS` a nodos corporativos;
  - crear relaciones `CAUSES`, `VERIFIED_BY`, `BELONGS_TO` y `DEPENDS_ON` derivadas del modelo vigente;
  - registrar mapping auditable entre IDs legacy y IDs/nodos nuevos;
  - ejecutar ensayo de migración repetible sobre entorno local o copia controlada;
  - comprobar reconstrucción de vistas actuales y elevar resultados a `HC-02`.
- Output:
  - datos legacy migrados al DAG con evidencia de trazabilidad y ensayo ejecutado.
- Status: `pending`

### T7. Adaptación del backend Dash al nuevo core de grafo
- Goal: cambiar el backend de la webapp Dash para operar sobre nodos y relaciones sin romper la UX existente.
- Inputs:
  - T4
  - T5
  - T6
  - `app/callbacks/causa_callbacks.py`
  - `app/callbacks/analisis_causas_v2_callbacks.py`
  - `app/callbacks/causa_detalle_callbacks.py`
  - `app/pages/arbol.py`
  - `app/pages/analisis_causas_v2.py`
  - `app/pages/causa_detalle.py`
  - `dash-callbacks`
- Actions:
  - reapuntar callbacks y páginas para pedir árboles proyectados, nodos reutilizables y operaciones de crear/vincular;
  - mantener en frontend solo validaciones de interacción básica y mensajes de error;
  - asegurar que la UI Dash no decide integridad DAG ni borrado protegido;
  - preservar el comportamiento de `panel_arbol`, `panel_analisis_causas_v2`, `panel_edicion` y `panel_hipotesis`.
- Output:
  - superficie Dash funcional sobre el core DAG.
- Status: `pending`

### T8. Adaptación del backend y frontend Java al nuevo core de grafo
- Goal: alinear `webapp_java` con el mismo contrato DAG usado por Dash.
- Inputs:
  - T4
  - T5
  - T6
  - `uc_bib_solv/webapp_java/python-backend/routes/causas.py`
  - `uc_bib_solv/webapp_java/python-backend/services/causas_service.py`
  - `uc_bib_solv/webapp_java/python-backend/repositories/causas_repository.py`
  - `uc_bib_solv/webapp_java/python-backend/services/causa_detail_service.py`
  - `uc_bib_solv/webapp_java/python-backend/repositories/causa_detail_repository.py`
  - `uc_bib_solv/webapp_java/webapp/js/components/tree-render.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/tree-data.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/tree-actions.js`
  - `uc_bib_solv/webapp_java/webapp/js/views/arboles_v02.js`
  - `uc_bib_solv/webapp_java/webapp/js/views/analisis_causas_v02.js`
- Actions:
  - exponer desde el backend Java las mismas capacidades funcionales de lectura/escritura del grafo;
  - adaptar render y acciones del árbol para consumir la proyección desde `relationship`;
  - añadir flujos UI de “crear nuevo” y “vincular existente” para contratos y causas, y extender a hipótesis cuando proceda;
  - mantener mensajes de error claros y comportamiento coherente con Dash;
  - elevar a `HC-03` la confirmación de que ambas UIs ya están alineadas con el core DAG.
- Output:
  - `webapp_java` compatible con el modelo DAG y con continuidad funcional.
- Status: `pending`

### T9. Migración de trazabilidad de análisis y reglas de borrado
- Goal: cerrar los huecos funcionales que dependen de IDs legacy o de semántica árbol.
- Inputs:
  - T4
  - T5
  - T6
  - `app/persistence/analisis_causas_repo.py`
  - `app/persistence/analisis_causas_detalle_repo.py`
  - `app/domain/analisis_causas.py`
- Actions:
  - migrar o adaptar persistencia de análisis para referenciar nodos genéricos cuando sea necesario;
  - comprobar que hipótesis, detalle y seguimiento siguen siendo trazables tras la migración;
  - implementar y verificar reglas de borrado con protección por reutilización y dependencias activas;
  - confirmar que el backend devuelve mensajes claros ante ciclo, relación inválida, duplicado o borrado bloqueado.
- Output:
  - trazabilidad de análisis preservada y reglas de borrado/corrección cerradas.
- Status: `pending`

### T10. Cutover de fuente de verdad y retirada del modelo estructural legacy
- Goal: completar el cambio de fuente de verdad y dejar el legado solo como soporte transitorio o deprecado.
- Inputs:
  - T6
  - T7
  - T8
  - T9
- Actions:
  - eliminar dependencias operativas sobre `causa.parent_id` e `hipotesis.causa_id` en consultas y construcción de árbol;
  - dejar explícito si las tablas/columnas legacy quedan deprecadas, read-only o reservadas solo para soporte de transición;
  - ejecutar validaciones de cero-regresión sobre ambos frontends;
  - elevar a `HC-04` la decisión humana de corte final.
- Output:
  - nuevo core DAG consolidado como única fuente de verdad operativa.
- Status: `pending`

### T11. Verificación integrada, rendimiento y cierre para validación humana
- Goal: producir la evidencia necesaria para Gate 3 y para un eventual bucle de corrección.
- Inputs:
  - T1-T10
  - `tests/unit/`
  - `tests/integration/`
  - `tests/smoke_test.py`
- Actions:
  - ampliar o crear tests unitarios para dominio DAG, reglas de combinación, duplicados y borrado protegido;
  - ampliar o crear tests de integración para repositorios, migración y reconstrucción de árbol desde PostgreSQL;
  - ejecutar smoke/regresión sobre Dash y `webapp_java`;
  - medir objetivo de rendimiento para subgrafo de hasta 200 nodos;
  - preparar evidencia de conformidad contra AC y estado `implementado_pendiente_validacion`.
- Output:
  - paquete de verificación listo para revisión humana final.
- Status: `pending`

---

## Acceptance Criteria Traceability

| AC | Covered by |
| --- | --- |
| AC-01 | T2, T3 |
| AC-02 | T5, T10 |
| AC-03 | T2, T4, T5 |
| AC-04 | T2, T4, T5 |
| AC-05 | T4, T11 |
| AC-06 | T4, T11 |
| AC-07 | T3, T4, T11 |
| AC-08 | T4, T9, T11 |
| AC-09 | T4, T7, T8, T11 |
| AC-10 | T7, T8, T11 |
| AC-11 | T4, T7, T8 |
| AC-12 | T6, T11 |
| AC-13 | T2, T6, T11 |
| AC-14 | T6, T7, T8, T11 |
| AC-15 | T5, T11 |
| AC-16 | T2, T3, T10 |

---

## Verification Plan

### Automatic / Command-Line Verification
- Ejecutar inicialización/migración de esquema en entorno local controlado y validar creación de `node` + `relationship`.
- Ejecutar tests unitarios del dominio para:
  - ciclo directo e indirecto
  - auto-relación
  - combinación inválida de tipos
  - duplicado lógico
  - borrado bloqueado
- Ejecutar tests de integración para:
  - migración legacy→graph
  - queries por padre/hijo
  - obtención de subgrafo descendente
  - construcción de árbol proyectado
  - trazabilidad de análisis sobre nodos
- Ejecutar smoke/regresión existentes y ampliados para Dash y `webapp_java`.
- Ejecutar comprobación de rendimiento con subgrafo de hasta 200 nodos y objetivo < 2 s en backend local de referencia.
- Ejecutar búsqueda de higiene para confirmar que no quedan rutas operativas apoyadas en `causa.parent_id` o `hipotesis.causa_id` como fuente de verdad del árbol.

### Manual Verification
- Validar desde Dash:
  - navegación del árbol
  - alta de nodo nuevo
  - vinculación de nodo existente
  - mensajes de error por ciclo, duplicado y tipo inválido
  - borrado protegido
- Validar desde `webapp_java` los mismos flujos y consistencia del payload de árbol.
- Validar sobre un contrato legacy real que la vista árbol reconstruida tras la migración es funcionalmente equivalente.
- Verificar con revisión humana los checkpoints `HC-01` a `HC-04`.
- Confirmar que el estado final esperado deja el modelo legacy fuera de la fuente de verdad operativa.

---

## Non-Conformity Loop

### Policy
- Si la validación final detecta una no conformidad, no cambiar el estado global a `done`.
- Clasificar la causa raíz como:
  - `spec`
  - `task_plan`
  - `implementation`
- Reabrir el flujo según causa:
  - `spec` -> actualizar `spec.md`, volver a Gate 1 y regenerar este `task_plan.md`.
  - `task_plan` -> ajustar este `task_plan.md`, volver a Gate 2 y relanzar implementación según corresponda.
  - `implementation` -> corregir ejecución de T3-T11 y repetir Gate 3.
- Cualquier NC `open` o `in_correction` bloquea `done`.
- Para este requerimiento, una NC de migración que comprometa integridad, trazabilidad o continuidad funcional obliga a volver al último checkpoint humano aprobado antes del corte final.

### Open Non-Conformities
- `NC-001` (`implementation`, `in_correction`, re-entry `execute-agent`): la implementacion actual soporta persistencia y consulta basica de `CONTRACT -> CONTRACT` con `DEPENDS_ON`, pero no expone la recuperacion/proyeccion funcional del subgrafo descendente desde contrato raiz atravesando `CONTRACT -> CONTRACT -> CAUSE`. La correccion debe extender el core de consulta/proyeccion y anadir cobertura de tests para ese recorrido.

---

## Risks
- Riesgo de regresión alta por coexistencia de dos frontends consumidores del mismo dominio.
- Riesgo de mapping ambiguo entre entidades legacy y nodos corporativos si no se aprueba explícitamente en `HC-01`.
- Riesgo de dejar dualidad permanente si `P4` no incluye corte real de fuente de verdad.
- Riesgo de rendimiento en consultas recursivas si índices, orden o payloads no se ajustan correctamente.
- Riesgo de inconsistencias si Dash y Java implementan contratos diferentes para crear/vincular nodos.
- Riesgo de pérdida de trazabilidad de análisis si `analisis_causas` y `analisis_causas_detalle` no migran coordinadamente.
- Riesgo de borrado destructivo si las reglas de reutilización no se centralizan en dominio/backend.

---

## Verification Checklist
- [ ] El `spec.md` ha sido validado por el programador humano y Gate 1 está aprobado.
- [ ] El programador humano aprueba este `task_plan.md` antes de ejecutar T1-T11.
- [ ] Existe inventario completo de consumidores legacy y contrato de compatibilidad.
- [ ] `node` y `relationship` están definidos con FKs, índices y unicidad lógica.
- [ ] Existe estrategia auditable de mapping legacy→node.
- [ ] Las reglas DAG viven en backend/dominio y no solo en frontend.
- [ ] Dash consume proyección de árbol desde el core DAG.
- [ ] `webapp_java` consume el mismo core DAG y expone crear/vincular nodos.
- [ ] `causa.parent_id` y `hipotesis.causa_id` ya no son la fuente de verdad operativa al cierre.
- [ ] Se han ejecutado pruebas unitarias, de integración, smoke y validación manual.
- [ ] El objetivo de rendimiento para 200 nodos se ha medido y documentado.
- [ ] No hay NCs abiertas o `in_correction`.
- [ ] Gate 3 queda aprobado por el programador humano antes de marcar `done`.

---

## Closure Rule

Cambiar el estado global a `done` solo cuando:
- Gate 1 esté aprobado.
- Gate 2 esté aprobado.
- Gate 3 esté aprobado por el programador humano.
- T1-T11 estén completadas o justificadas como no aplicables sin romper AC.
- Los checkpoints `HC-01` a `HC-04` tengan resolución humana explícita.
- Dash y `webapp_java` estén validados contra el nuevo core DAG.
- La migración legacy→graph tenga evidencia de trazabilidad y de continuidad funcional.
- `causa.parent_id` y `hipotesis.causa_id` hayan dejado de ser fuente de verdad operativa.
- No existan NCs abiertas o `in_correction`.
- `traza_requerimiento.md` refleje el estado real final del requerimiento.
