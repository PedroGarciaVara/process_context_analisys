## Metadata
- Requirement ID: `requerimiento_07`
- Spec File: `./requeriments_spec_driven_development/requerimiento_07/spec.md`
- Status: `pending_human_validation`
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
- Created At: `2026-06-02`
- Last Updated: `2026-06-02`

---

## Objective

Planificar la migracion de `requerimiento_07` hacia un modelo DAG-first donde `node` + `relationship` sean la fuente unica de verdad estructural, `causa` y `hypothesis` queden como satelites descriptivos, y ambas UIs consuman consultas/proyecciones canónicas sin depender de `parent_id`, `contrato_id` ni `causa_id` como verdad estructural.

---

## Scope

### In Scope
- Evolucion de `db/schema.sql` y scripts de migracion para el modelo final DAG-first.
- Eliminacion progresiva de dependencias estructurales en `causa` y `hipotesis`/`hypothesis`.
- Validacion de firmas permitidas y deteccion de ciclos mixtos en `app/domain/graph.py`.
- Reescritura de repositorios y queries recursivas para soportar `CAUSE -[DEPENDS_ON]-> CONTRACT`.
- Adaptacion de Dash (`app/`) y webapp Java (`uc_bib_solv/webapp_java/`) al modelo canonico.
- Migracion de `analisis_causas_detalle` hacia `node_id` como referencia canonica.
- Verificacion automatica/manual, checks de migracion y bucle de no conformidad.

### Out of Scope
- Rediseño visual no exigido por el spec.
- Nuevas taxonomias avanzadas de causa o hipotesis fuera de `type`, `category` y atributos explicitados en la spec.
- Inferencia retroactiva automatica de relaciones `CAUSE -> CONTRACT` desde historicos no estructurados.
- Cierre del flujo `/document`; esa fase corresponde despues a `documentation-agent` y `context-agent`.

---

## Inputs
- Client requirement: `./requerimientos_cliente/requerimiento_07.md`
- Technical specification: `./requeriments_spec_driven_development/requerimiento_07/spec.md`
- Supporting docs:
  - `./common_spec_driven_development/templates/task_plan.template.md`
  - `./.atl/sub-agent-registry.md`
  - `./.atl/skill-registry.md`
  - `./common_spec_driven_development/sub_agents/plan-task-agent.md`
  - `./common_spec_driven_development/SKILLs/plan-task-agent/SKILL.md`
  - `./common_spec_driven_development/SKILLs/data-model-management/SKILL.md`
  - `./common_spec_driven_development/SKILLs/domain-logic/SKILL.md`
  - `./common_spec_driven_development/SKILLs/webapp-architecture/SKILL.md`
  - `./common_spec_driven_development/SKILLs/web-Dash-Dataiku/SKILL.md`
  - `./common_spec_driven_development/SKILLs/postgresql-primary-persistence/SKILL.md`
  - `./db/schema.sql`
  - `./db/migrate_graph.py`
  - `./app/domain/graph.py`
  - `./app/persistence/graph_query_repo.py`
  - `./app/persistence/causa_repo.py`
  - `./app/persistence/hipotesis_repo.py`
  - `./app/callbacks/causa_detalle_callbacks.py`
  - `./uc_bib_solv/webapp_java/python-backend/repositories/causas_repository.py`

---

## Assumptions
- Gate 1 de validacion del `spec.md` se considera aprobado por decision explicita del programador humano en esta sesion, aunque el metadata del spec siga en `spec_pendiente_validacion`.
- Se mantiene PostgreSQL como persistencia operativa principal y `db/schema.sql` como DDL canónico.
- La implementacion debe extender los modulos ya existentes en `app/domain/`, `app/persistence/`, `app/pages/`, `app/callbacks/` y `uc_bib_solv/webapp_java/python-backend/` salvo necesidad tecnica justificada.
- El nombre fisico final de la tabla de hipotesis puede quedar como `hypothesis` o mantenerse temporalmente como `hipotesis` por compatibilidad, pero el agregado funcional final debe cumplir la spec y dejar de depender de `causa_id`.

---

## Dependencies
- Sub-agents / skills relevantes:
  - `plan-task-agent`
  - `execute-agent`
  - `documentation-agent`
  - `context-agent`
  - `data-model-management`
  - `domain-logic`
  - `webapp-architecture`
  - `web-Dash-Dataiku`
  - `postgresql-primary-persistence`
- Technical dependencies:
  - Esquema actual con tablas legacy `causa`, `hipotesis`, `analisis_causas_detalle`, `node`, `relationship`
  - Backend Dash en `app/`
  - Backend puente + UI Java en `uc_bib_solv/webapp_java/`
  - Scripts de bootstrap/migracion en `db/`

---

## Execution Strategy

La implementacion debe ejecutarse en capas y con compatibilidad transitoria controlada:

1. Consolidar primero el modelo persistente final y el plan de migracion reversible.
2. Endurecer despues el dominio y las firmas estructurales, incluyendo el nuevo `CAUSE -[DEPENDS_ON]-> CONTRACT`.
3. Reescribir consultas/proyecciones y repositorios para que trabajen con `node_id` y `relationship` como canon.
4. Adaptar a continuacion Dash y la webapp Java para consumir solo payloads canonicos y formularios estructurados.
5. Cerrar con backfill, checks anti-regresion, pruebas funcionales y Gate 3 humano.

La razon del orden es evitar que las UIs consuman un modelo intermedio inestable y asegurar que la migracion de datos tenga soporte de dominio y repositorios antes de cambiar flujos de guardado/lectura.

---

## Human Validation Gates

### Gate 1: Spec Validation
- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `approved`
- Evidence:
  - El programador humano indico explicitamente en esta sesion que Gate 1 debe tratarse como aprobado para `requerimiento_07`.

### Gate 2: Task Plan Approval
- Required State Before Implementation: aprobacion humana explicita de este `task_plan.md`.
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `execute-agent` no debe implementar este plan hasta que Gate 2 este aprobado.

### Gate 3: Final Implementation Validation
- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `done` solo es valido tras conformidad final humana y ausencia de NCs abiertas o `en_correccion`.

---

## Tasks

### T1. Diseñar el esquema final DAG-first y el contrato de persistencia
- Goal: dejar definido el esquema final de `causa`, `hypothesis`, tablas hijas e indices sin mantener FKs estructurales legacy como fuente canonica.
- Inputs:
  - `db/schema.sql`
  - FR-01 a FR-07, FR-10 a FR-13
- Actions:
  - remodelar `causa` como satelite con `node_id` canonico, `type`, `category`, `created_at`, `updated_at` y sin `contrato_id`/`parent_id` en la tabla canonica final
  - definir la tabla canonica de hipotesis sin `causa_id`, con `node_id`, `business_reason`, `analysis_method`, `expected_result`, contexto industrial y timestamps
  - crear o ajustar tablas hijas ordenadas para `hypothesis_required_data` y `hypothesis_expected_evidence`
  - adaptar `analisis_causas_detalle` para que `node_id` sea la referencia canonica y dejar `causa_id`/`hipotesis_id` solo como soporte transitorio si hiciera falta
  - asegurar indices minimos y unicidad logica sobre `relationship`
- Output:
  - DDL final en `db/schema.sql`
  - decision documentada en el plan sobre nombre/transicion de `hipotesis` a `hypothesis`
- Status: `pending`

### T2. Implementar migracion y backfill reversibles del grafo y satelites
- Goal: ejecutar una migracion por fases que preserve arboles legacy, no invente relaciones nuevas y permita reejecucion controlada.
- Inputs:
  - `db/migrate_graph.py`
  - `db/init_db.py`
  - T1
  - FR-11 a FR-13
- Actions:
  - crear fases de transicion: alta de nuevas columnas/tablas, backfill de `node`/`relationship`, backfill de `causa.node_id` y `hypothesis.node_id`, migracion de `analisis_causas_detalle`
  - mapear atributos legacy de hipotesis hacia `node` + satelite con trazabilidad explicita
  - prohibir cualquier backfill que infiera `CAUSE -> CONTRACT` sin fuente explicita
  - definir orden de retirada de columnas/FKs/indices legacy solo cuando las lecturas y escrituras canónicas esten activas
  - dejar la migracion idempotente o reejecutable de forma controlada
- Output:
  - script(s) de migracion actualizados
  - estrategia de rollback o rerun documentada en comentarios operativos del script
- Status: `pending`

### T3. Endurecer la validacion de dominio y firmas estructurales
- Goal: actualizar la logica de dominio para validar la matriz final de firmas y detectar ciclos mixtos sobre el subgrafo estructural.
- Inputs:
  - `app/domain/graph.py`
  - FR-02 a FR-04
  - T1
- Actions:
  - añadir `("CAUSE", "DEPENDS_ON", "CONTRACT")` a la matriz permitida
  - verificar que `DEPENDS_ON` y `CAUSES` se tratan como relaciones estructurales para firmas, aciclicidad y proyeccion
  - mantener rechazo de autorrelaciones, duplicados logicos y ciclos transitivos mixtos
  - revisar las firmas auxiliares y mensajes de error de dominio para que sirvan tanto a Dash como a la webapp Java
- Output:
  - dominio actualizado en `app/domain/graph.py`
  - tests unitarios de dominio para combinaciones validas e invalidas y ciclos mixtos
- Status: `pending`

### T4. Refactorizar repositorios canónicos de causa e hipotesis al modelo satelite
- Goal: mover las operaciones de escritura/lectura a agregados basados en `node` + `relationship` + satelite, sin escritura nueva de FKs legacy estructurales.
- Inputs:
  - `app/persistence/causa_repo.py`
  - `app/persistence/hipotesis_repo.py`
  - `app/persistence/node_repo.py`
  - `app/persistence/relationship_repo.py`
  - T1
  - T3
- Actions:
  - cambiar `causa_repo` para crear/editar causa via `node` + satelite y relaciones estructurales en vez de `contrato_id`/`parent_id`
  - soportar desde causa tanto `CAUSES` hacia subcausa como `DEPENDS_ON` hacia contrato descendiente
  - cambiar `hipotesis_repo` para crear/editar/borrar el agregado estructurado por `node_id`, listas hijas y vinculo `CAUSE -[VERIFIED_BY]-> HYPOTHESIS`
  - mantener adaptadores transitorios solo donde la UI legacy todavia lo necesite durante la migracion
  - garantizar transaccionalidad de nodo + satelite + relaciones + colecciones hijas
- Output:
  - repositorios canónicos actualizados
  - contratos de retorno alineados con `node_id` como identidad principal
- Status: `pending`

### T5. Generalizar consultas recursivas y proyeccion determinista del arbol
- Goal: dejar de asumir que solo un contrato tiene descendencia estructural y soportar recorridos mixtos con nodos reutilizados.
- Inputs:
  - `app/persistence/graph_query_repo.py`
  - `app/domain/graph.py`
  - FR-08 y FR-15
  - T3
  - T4
- Actions:
  - reescribir los recorridos recursivos para proyectar el subgrafo estructural desde un `CONTRACT` o `CAUSE` raiz usando `DEPENDS_ON` + `CAUSES`
  - incluir en la proyeccion el caso `CONTRACT -> CAUSE -> CONTRACT -> CAUSE`
  - marcar `reused_node_ids` o equivalente y cortar ramas ya visitadas para evitar bucles visuales
  - exponer consultas minimas obligatorias: hijos/padres estructurales, subgrafo descendente, arbol visual, hipotesis por causa via `relationship`, agregado completo por `node_id`, busqueda reutilizable por texto
  - eliminar reconstrucciones funcionales basadas en `parent_id` o `causa_id` salvo compatibilidad transitoria encapsulada
- Output:
  - `graph_query_repo.py` y helpers relacionados adaptados
  - pruebas de consulta/proyeccion con nodos reutilizados y recorridos mixtos
- Status: `pending`

### T6. Adaptar la UI Dash al modelo canonico y a la captura estructurada de hipotesis
- Goal: actualizar paginas, callbacks y componentes Dash para operar contra payloads canonicos y formularios acordes al modelo final.
- Inputs:
  - `app/pages/causa_detalle.py`
  - `app/callbacks/causa_detalle_callbacks.py`
  - `app/callbacks/causa_callbacks.py`
  - `app/callbacks/hipotesis_callbacks.py`
  - `app/pages/arbol.py`
  - `app/pages/analisis_causas_v2.py`
  - T4
  - T5
  - `webapp-architecture`
  - `web-Dash-Dataiku`
- Actions:
  - sustituir el uso de `contrato_id`, `parent_id`, `causa_id` como verdad estructural por `node_id` + contexto de relacion
  - soportar los flujos obligatorios: crear/vincular causa, vincular contrato desde causa, crear/editar hipotesis estructurada
  - ampliar formularios de hipotesis para `business_reason`, `analysis_method`, `expected_result`, listas hijas y contexto industrial
  - consumir errores funcionales del backend sin recrear reglas de negocio en callbacks
  - mantener `app.py` fuera del alcance salvo que cambie alta/baja de paginas; si eso ocurre, aplicar gate humano C-13
- Output:
  - callbacks, paginas y componentes Dash alineados con el modelo DAG-first
  - payloads UI consistentes sin mezcla de verdad legacy/canonica
- Status: `pending`

### T7. Adaptar backend puente y UI Java al modelo canonico
- Goal: eliminar la dependencia funcional de `parent_id`/`causa_id` en el backend Python de la webapp Java y en sus vistas JS.
- Inputs:
  - `uc_bib_solv/webapp_java/python-backend/repositories/causas_repository.py`
  - `uc_bib_solv/webapp_java/python-backend/services/causas_service.py`
  - `uc_bib_solv/webapp_java/webapp/js/views/causa_detalle.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/tree-data.js`
  - `uc_bib_solv/webapp_java/webapp/js/api/causas.js`
  - T4
  - T5
- Actions:
  - refactorizar resolucion de contexto padre/hijo para que soporte `CAUSE -> CONTRACT` y proyecciones mixtas
  - cambiar payloads de detalle/arbol/hipotesis para que la identidad principal sea `node_id`
  - adaptar formularios y acciones JS al agregado estructurado de hipotesis y a la vinculacion de nodos reutilizables
  - retirar dependencias funcionales de arboles construidos por `parent_id`
- Output:
  - backend puente y frontend Java compatibles con el modelo final
  - flujos de arbol y detalle soportados en ambas UIs
- Status: `pending`

### T8. Ejecutar cierre de migracion, verificacion y control de regresion
- Goal: verificar que el sistema funciona con el modelo final, conservar comportamiento legacy requerido y preparar Gate 3.
- Inputs:
  - T1 a T7
  - AC-01 a AC-14
- Actions:
  - añadir pruebas automáticas de dominio, repositorios y proyeccion para firmas, ciclos, recorridos mixtos, reutilizacion y agregado de hipotesis
  - ejecutar checks de migracion sobre catalogo legacy para asegurar que los arboles actuales siguen proyectandose y que no se generan `CAUSE -> CONTRACT` inventados
  - verificar que no quedan escrituras nuevas a `causa.parent_id`, `causa.contrato_id` ni `hipotesis.causa_id`
  - validar manualmente ambos UIs sobre flujos de contrato, causa e hipotesis
  - preparar evidencia de salida para `implementado_pendiente_validacion`
- Output:
  - suite de verificacion automatica
  - checklist manual ejecutable
  - evidencia para Gate 3
- Status: `pending`

---

## Acceptance Criteria Traceability

| AC | Covered by |
| --- | --- |
| AC-01 | T3, T8 |
| AC-02 | T3, T8 |
| AC-03 | T1, T2, T8 |
| AC-04 | T1, T4, T5, T8 |
| AC-05 | T1, T2, T4, T8 |
| AC-06 | T1, T4, T6, T7, T8 |
| AC-07 | T5, T7, T8 |
| AC-08 | T5, T7, T8 |
| AC-09 | T6, T7, T8 |
| AC-10 | T2, T5, T8 |
| AC-11 | T2, T8 |
| AC-12 | T1, T2, T4, T8 |
| AC-13 | T4, T5, T8 |
| AC-14 | Gate 1 aprobado; este plan cubre ejecucion mediante T1 a T8 |

---

## Verification Plan

### Automatic / Command-Line Verification
- Tests unitarios de `app/domain/graph.py` para matriz de firmas permitidas, firmas rechazadas y ciclos mixtos con `CAUSE -> CONTRACT`.
- Tests de repositorios para alta/edicion/borrado de causa e hipotesis con `node_id` como identidad canonica.
- Tests de consultas recursivas/proyeccion para:
  - `CONTRACT -> CONTRACT -> CAUSE`
  - `CONTRACT -> CAUSE -> CONTRACT`
  - `CONTRACT -> CAUSE -> CAUSE`
  - nodos reutilizados y corte de ramas visitadas
- Checks de migracion/backfill sobre `db/migrate_graph.py` verificando:
  - poblado correcto de `node` y `relationship`
  - backfill de satelites
  - ausencia de relaciones `CAUSE -> CONTRACT` inferidas sin fuente
  - migracion de `analisis_causas_detalle` hacia `node_id`
- Greps de higiene estructural para detectar escrituras o dependencias residuales sobre:
  - `causa.parent_id`
  - `causa.contrato_id`
  - `hipotesis.causa_id`

### Manual Verification
- Dash:
  - crear causa desde contrato
  - vincular causa existente
  - vincular contrato descendiente desde causa
  - crear/editar hipotesis estructurada con listas hijas
  - navegar el arbol proyectado con nodos reutilizados
- Webapp Java:
  - repetir los mismos flujos funcionales desde arbol y detalle
  - comprobar que los errores de dominio se muestran correctamente
- Migracion:
  - abrir un contrato legacy con arbol `CONTRACT -> CAUSE` preexistente y verificar que se sigue proyectando igual tras la migracion
  - comprobar que analisis historicos siguen trazando a causa/hipotesis mediante `node_id`

---

## Non-Conformity Loop

### Policy
- Si la validacion final detecta una no conformidad, no cambiar el estado global a `done`.
- Clasificar la causa raiz como:
  - `spec`
  - `task_plan`
  - `implementation`
- Reabrir el flujo segun causa:
  - `spec` -> actualizar `spec.md`, volver a Gate 1 y regenerar o ajustar `task_plan.md`.
  - `task_plan` -> corregir `task_plan.md` y volver a Gate 2.
  - `implementation` -> corregir implementacion y repetir Gate 3.
- Cualquier NC `open` o `en_correccion` bloquea `done`.
- En este requerimiento, cualquier NC sobre migracion de datos o mezcla de modelo legacy/canonico debe tratarse como prioritaria antes de exponer la funcionalidad a usuarios.

### Open Non-Conformities
- Ninguna registrada al crear el plan.

---

## Risks
- La coexistencia temporal de columnas legacy y modelo canónico puede producir payloads incoherentes si las UIs mezclan ambos contratos en la misma transaccion.
- La migracion de `analisis_causas_detalle` es sensible porque debe preservar trazabilidad historica mientras cambian las referencias canónicas.
- El backend Java ya contiene logica que asume raices por `parent_id is None`; si no se cambia junto con las queries, el arbol puede degradarse aunque el backend Dash quede correcto.
- Cambiar el nombre fisico `hipotesis` -> `hypothesis` puede aumentar el coste de compatibilidad; si se hace, debe aislarse con adaptadores claros.
- Si algun cambio exige tocar el `app.py` de una webapp Dash en Dataiku DSS, se activa el gate humano C-13 de copia manual y restart.

---

## Verification Checklist
- [x] `spec.md` validado por el programador humano.
- [ ] `task_plan.md` aprobado para ejecucion.
- [ ] Gate 1 aprobado, Gate 2 aprobado y Gate 3 pendiente o aprobado segun fase.
- [ ] Tareas completadas o justificadas como no aplicables.
- [ ] Escaneo de higiene pre-commit: sin `print(`, `# DEBUG`, `# FIXME`, `breakpoint()` en archivos de produccion.
- [ ] Si el spec reemplaza un modelo: AC de cero-importaciones o cero-escrituras funcionales a FKs legacy verificado con grep.
- [ ] Validacion final humana realizada.
- [ ] No conformidades cerradas.
- [ ] Estado final actualizado correctamente.

---

## Closure Rule

Cambiar el estado global a `done` solo cuando:
- Gate 1 este aprobado.
- Gate 2 este aprobado.
- Gate 3 este aprobado por el programador humano.
- Todas las tareas esten completadas o justificadas como no aplicables sin romper AC.
- No existan NCs abiertas o `en_correccion`.
- La migracion haya retirado la dependencia funcional de `causa.parent_id`, `causa.contrato_id` y `hipotesis.causa_id` como verdad estructural.
- `traza_requerimiento.md` refleje el estado final real.
