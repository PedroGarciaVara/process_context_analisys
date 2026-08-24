# Task Plan - requerimiento_01: Solve-Ishikawa Fase 1

## Metadata
- Requirement ID: `requerimiento_01`
- Spec File: `./requeriments_spec_driven_development/requerimiento_01/spec.md`
- Status: `vencido`
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
- Created At: `2026-05-27`
- Last Updated: `2026-05-27`

---

## Objective

Implementar la Fase 1 de Solve-Ishikawa en la estructura actual del repositorio, preservando la app Dash local con PostgreSQL y ampliando el modelo para soportar:

- historial de sesiones `analisis_causas` con estados `abierto` y `cerrado`
- trazabilidad detallada en `analisis_causas_detalle`
- eliminación del marcado funcional de causa raíz en el flujo base del arbol
- eliminación de campos y comportamiento de evaluacion en el CRUD base de hipotesis

El resultado esperado es una base funcional y verificable que mantenga los CRUD existentes, pero alineada al contrato actualizado del `spec.md`.

---

## Scope

### In Scope
- Ajuste del esquema PostgreSQL en `db/schema.sql` y del bootstrap de inicializacion en `db/init_db.py`
- Normalizacion de `config/settings.py` para lectura de variables de entorno de BD y arranque local
- Refactor del dominio en `app/domain/` para validar DAG, ciclo de vida de sesiones y trazabilidad
- Refactor de repositorios en `app/persistence/` para el modelo actual de procesos, contratos, maquinas, causas, hipotesis, sesiones y detalles
- Refactor de callbacks en `app/callbacks/` para la nueva pagina `analisis_causas`, el flujo de resume/cierre/reapertura y la limpieza de la logica antigua
- Refactor de layouts y componentes en `app/pages/` y `app/components/` para:
  - quitar el marcado de causa raiz del flujo base
  - quitar campos de evaluacion del CRUD base de hipotesis
  - exponer la nueva pagina de sesiones y su trazabilidad
- Verificacion de ACs, regresion de UI y validacion humana final

### Out of Scope
- Scoring automatico de causas
- ML, LLM, RAG o integraciones externas
- Dataiku DSS y cualquier backend no local
- Autenticacion, roles o multiusuario
- Espina de pescado clasica si el arbol de tarjetas existente sigue siendo suficiente
- Versionado historico de arboles o auditoria avanzada fuera de la trazabilidad de sesiones

---

## Inputs
- Client requirement: `./requerimientos_cliente/requerimiento_01.md`
- Technical specification: `./requeriments_spec_driven_development/requerimiento_01/spec.md`
- Current task plan: `./requeriments_spec_driven_development/requerimiento_01/task_plan.md`
- Baseline template: `./common_spec_driven_development/templates/task_plan.template.md`
- Supporting docs:
  - `./README.md`
  - `./context.md`
  - `./entorno.md`
  - `./db/schema.sql`
  - `./config/settings.py`
  - `./app/pages/`
  - `./app/callbacks/`
  - `./app/persistence/`
  - `./app/domain/`

---

## Assumptions
- La base local de PostgreSQL puede re-inicializarse desde `db/schema.sql` durante la validacion.
- La estructura actual bajo `app/` es canonica y no se va a reemplazar por un nuevo arbol de carpetas.
- La visualizacion del arbol puede seguir siendo la implementacion actual de tarjetas HTML recursivas, porque el `spec.md` permite HTML recursivo o `dash-cytoscape`.
- Los agregados de sesion por proceso, contrato y maquinas asociadas se calcularan por consulta y join, no por duplicacion de columnas, salvo que una validacion posterior exija cache materializado.
- Los campos legacy que no existen en el `spec.md` deben retirarse del flujo base aunque hoy esten presentes en el repo, en especial `tags`, `es_causa_raiz`, `justificacion_raiz` y `titulo`.

---

## Dependencies
- Sub-agents / skills relevantes:
  - `plan-task-agent` - autoria del plan
  - `execute-agent` - implementacion posterior
  - `data-model-management` - DDL, constraints y persistencia
  - `domain-logic` - reglas de negocio y casos de uso
  - `dash-callbacks` - estado explicito, render maestro y callbacks robustos
  - `postgresql-primary-persistence` - PostgreSQL como fuente de verdad
  - `webapp-architecture` - reparto de responsabilidades en `app/pages/`, `app/callbacks/` y `app/components/`
  - `git-workflow` - commits atomicos, gates y validacion antes de push
- Technical dependencies:
  - PostgreSQL local accesible por variables de entorno
  - Dash y `dash_bootstrap_components`
  - `psycopg2` o el driver usado por la capa `app/persistence/db.py`
  - El arranque local `run.py` / `app/server.py` debe seguir funcionando sin cambios estructurales mayores

---

## Execution Strategy

Orden de ejecucion recomendado:

1. **Modelo de datos y configuracion**: primero porque define el contrato fisico de tablas, estados, claves y defaults que consumen todos los demas niveles.
2. **Dominio**: despues, para fijar las reglas de negocio del DAG, el ciclo de vida de sesiones y la trazabilidad sin acoplarse a SQL o Dash.
3. **Persistencia**: a continuacion, para implementar los repositorios y queries que materializan el modelo y las reglas del dominio.
4. **Callbacks**: luego, para adaptar la UI a las operaciones del dominio y a los repositorios, usando stores y refresh keys como unica fuente de estado visible.
5. **Paginas y componentes**: despues, para exponer la nueva pagina `analisis_causas`, retirar controles obsoletos y mantener la navegacion coherente.
6. **Verificacion**: al final, para cerrar el circuito con pruebas automatizadas, checks SQL y validacion humana.

Notas de estrategia:
- El flujo base del arbol no debe conservar ningun control funcional para marcar causa raiz.
- El CRUD base de hipotesis no debe exponer evaluacion, comentario ni fecha.
- La pagina `analisis_causas` debe ser la unica responsable de la trazabilidad de evaluacion y comentario sobre causas e hipotesis.
- Seguir `git-workflow`: commits atomicos por bloque de trabajo cuando sea posible, sin push a `main` hasta pasar Gate 3.

---

## Human Validation Gates

### Gate 1: Spec Validation
- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `pending`
- Evidence:
  - El `spec.md` es la entrada tecnica de esta planificacion.
  - Si el humano detecta ambiguedad funcional, el flujo debe volver a `spec.md` antes de implementar.

### Gate 2: Task Plan Approval
- Required State Before Implementation: aprobacion humana explicita de este `task_plan.md`.
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `execute-agent` no debe empezar la implementacion hasta que este plan quede aprobado.
  - Cualquier cambio de alcance despues de esta aprobacion debe entrar por enmienda o NC, segun corresponda.

### Gate 3: Final Implementation Validation
- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `done` solo es valido tras conformidad final humana y sin NCs abiertas o `in_correction`.
  - La validacion final debe comprobar tanto base de datos como comportamiento UI.

---

## Tasks

### T1. Alinear el modelo de datos y la configuracion local
- Goal: dejar `db/schema.sql`, `db/init_db.py` y `config/settings.py` alineados con el nuevo contrato de sesiones, trazabilidad y CRUD base del `spec.md`.
- Inputs:
  - `./requeriments_spec_driven_development/requerimiento_01/spec.md`
  - `./db/schema.sql`
  - `./db/init_db.py`
  - `./config/settings.py`
- Actions:
  - Definir en `db/schema.sql` las tablas y constraints del contrato actual:
    - `proceso`
    - `contrato`
    - `maquina`
    - `contrato_maquina`
    - `causa`
    - `hipotesis`
    - `analisis_causas`
    - `analisis_causas_detalle`
  - Mantener los `ON DELETE CASCADE` y las claves foraneas que exige el spec.
  - Asegurar los indices obligatorios de `causa(contrato_id)` y `causa(parent_id)`.
  - Ajustar el modelo `causa` para que solo exponga los campos del spec y retirar del flujo base las piezas legacy de raiz y tags.
  - Ajustar el modelo `hipotesis` para que siga el spec: sin `titulo` ni campos de evaluacion del analisis base.
  - Definir los checks de estados:
    - sesion: `abierto` / `cerrado`
    - detalle causa: `retenida` / `evaluada`
    - detalle hipotesis: `validada` / `rechazada`
    - hipotesis base: `pendiente` / `validada` / `rechazada`
  - Actualizar `db/init_db.py` para seguir siendo idempotente y cargar el nuevo schema.
  - Normalizar `config/settings.py` para leer `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD` con compatibilidad local razonable.
- Output:
  - `db/schema.sql` actualizado
  - `db/init_db.py` actualizado
  - `config/settings.py` alineado con la conexion local
- ACs covered:
  - AC-01 to AC-02
  - AC-06 to AC-12
  - AC-13 to AC-20
  - AC-21 to AC-26
  - AC-31 to AC-41
  - AC-57
  - AC-60 to AC-63
- Status: `pending`

### T2. Refactorizar la logica de dominio
- Goal: centralizar en `app/domain/` las reglas de DAG, ciclo de vida de sesiones, trazabilidad y estados visuales sin depender de Dash ni SQL.
- Inputs:
  - `./requeriments_spec_driven_development/requerimiento_01/spec.md`
  - `./app/domain/arbol.py`
  - `./app/domain/causa_tags.py`
  - contratos funcionales del nuevo modelo de datos
- Actions:
  - Refactorizar `app/domain/arbol.py` para que:
    - valide ciclos de forma reutilizable
    - calcule el estado visual de hipotesis para el arbol
    - deje de depender de `es_causa_raiz` y de cualquier UI de marcaje de raiz
  - Introducir la logica de dominio de sesiones en `app/domain/analisis_causas.py`:
    - abrir sesion
    - cerrar sesion
    - reabrir sesion
    - mantener historial
    - validar transiciones permitidas
  - Definir reglas de trazabilidad:
    - un detalle de causa solo admite `retenida` o `evaluada`
    - un detalle de hipotesis solo admite `validada` o `rechazada`
    - la evaluacion y el comentario se gestionan en la pagina de analisis, no en el CRUD base
  - Definir validaciones reutilizables para:
    - `parent_id` en el mismo contrato
    - ausencia de ciclos directos y transitivos
    - ausencia de acciones de causa raiz en el flujo base
    - preservacion de historial al reabrir sesiones
  - Mantener el dominio libre de imports de Dash, SQL o repositorios concretos.
- Output:
  - Modulos de dominio actualizados o nuevos bajo `app/domain/`
  - Reglas reutilizables para sesiones, trazabilidad y DAG
- ACs covered:
  - AC-24
  - AC-27 to AC-30
  - AC-32 to AC-34
  - AC-42 to AC-47
  - AC-61 to AC-63
- Status: `pending`

### T3. Actualizar la capa de persistencia
- Goal: implementar los repositorios PostgreSQL que soportan el nuevo modelo de datos y las consultas de negocio sin SQL en capas superiores.
- Inputs:
  - `./db/schema.sql`
  - `./config/settings.py`
  - `./app/domain/`
  - `./app/persistence/db.py`
  - repositorios actuales en `./app/persistence/`
- Actions:
  - Crear repositorios nuevos para sesiones y trazabilidad:
    - `app/persistence/analisis_causas_repo.py`
    - `app/persistence/analisis_causas_detalle_repo.py`
  - Refactorizar los repositorios existentes para ajustarlos al spec:
    - `proceso_repo.py`
    - `contrato_repo.py`
    - `maquina_repo.py`
    - `causa_repo.py`
    - `hipotesis_repo.py`
  - Exponer operaciones de persistencia para:
    - CRUD base de procesos, contratos, maquinas, causas e hipotesis
    - asociacion y desasociacion contrato-maquina
    - listado de contratos por proceso y estado activo/inactivo
    - reconstruccion determinista del arbol por contrato
    - CRUD de sesiones `analisis_causas`
    - insercion y lectura de `analisis_causas_detalle`
    - resumen de sesiones por proceso, contrato, maquinas asociadas y estado
  - Retirar de persistencia cualquier soporte para:
    - marcado de causa raiz
    - titulo de hipotesis
    - campos de evaluacion del CRUD base de hipotesis
    - tags de causa si quedan fuera del contrato final
  - Garantizar transacciones donde el spec las requiere, especialmente en borrados recursivos y cambios de estado sensibles.
  - Mantener lecturas directas contra PostgreSQL, sin cache intermedio fuera de la BD.
- Output:
  - Repositorios actualizados y/o nuevos en `app/persistence/`
  - Consultas y helpers de lectura/escritura alineados con el contrato del spec
- ACs covered:
  - AC-01 to AC-26
  - AC-31 to AC-41
  - AC-48 to AC-56
  - AC-57
  - AC-60 to AC-63
- Status: `pending`

### T4. Rehacer callbacks y flujos dinamicos de Dash
- Goal: orquestar desde `app/callbacks/` los flujos de CRUD, seleccion, resume de sesiones y trazabilidad usando `dash-callbacks` como patron.
- Inputs:
  - `./app/domain/`
  - `./app/persistence/`
  - `./app/pages/`
  - `./app/components/`
  - `./common_spec_driven_development/SKILLs/dash-callbacks/SKILL.md`
- Actions:
  - Ajustar los callbacks existentes de procesos, contratos, maquinas, arbol y detalle para que sigan el contrato actualizado.
  - Eliminar cualquier callback o rama de codigo que siga permitiendo marcar una causa como raiz desde el flujo base.
  - Eliminar cualquier callback o control que exponga evaluacion/commentario/fecha en el CRUD base de hipotesis.
  - Crear `app/callbacks/analisis_causas_callbacks.py` con los callbacks de `analisis_causas` para:
    - listar sesiones por contrato y por estado
    - crear sesion
    - cerrar sesion
    - reabrir sesion sin duplicarla
    - seleccionar sesion activa para trazabilidad
    - registrar trazabilidad de causa e hipotesis
  - Usar `dcc.Store` como fuente de verdad para:
    - proceso seleccionado
    - contrato seleccionado
    - sesion activa
    - elemento del arbol expandido
    - refresh key de render
  - Seguir el patron de `dash-callbacks`:
    - callback maestro de render para listados dinamicos
    - callbacks de accion separados de callbacks de render
    - uso de `n_clicks_timestamp` si hay botones dinamicos por fila
  - Mantener mensajes de error accionables y no dejar la UI en estado incoherente tras un fallo.
- Output:
  - `app/callbacks/` actualizado con el flujo de sesiones y la limpieza del flujo base
  - Estado UI consistente y sin dependencias fragiles entre rerender y seleccion
- ACs covered:
  - AC-03
  - AC-11
  - AC-16
  - AC-20
  - AC-31 to AC-34
  - AC-42 to AC-52
  - AC-58 to AC-61
- Status: `pending`

### T5. Actualizar paginas y componentes de UI
- Goal: exponer la nueva pagina `analisis_causas`, limpiar controles obsoletos y mantener una separacion clara entre layouts y callbacks.
- Inputs:
  - `./app/pages/`
  - `./app/components/`
  - `./app/callbacks/`
  - `./app/domain/`
  - `./app/persistence/`
- Actions:
  - Crear `app/pages/analisis_causas.py` como nueva pagina para sesiones y trazabilidad.
  - Mantener `app/pages/arbol.py` como vista del arbol base, pero sin control de marcado de raiz.
  - Refactorizar `app/pages/causa_detalle.py` para que el CRUD base de causa e hipotesis sea solo de edicion estructural.
  - Refactorizar `app/components/panel_hipotesis.py` para eliminar evaluacion/comentario/fecha del CRUD base.
  - Añadir `app/components/panel_analisis_causas.py` o un componente equivalente si la pagina necesita un editor dedicado para evaluacion y comentario.
  - Refactorizar `app/components/panel_edicion.py` y `app/components/tarjeta_causa.py` para retirar:
    - controles de raiz
    - badges o campos legacy no incluidos en el spec
  - Actualizar `app/components/navbar.py` para enlazar la nueva pagina.
  - Mantener `app/pages/inicio.py`, `procesos.py`, `contratos.py` y `maquinas.py` coherentes con el flujo nuevo de seleccion y navegado.
  - Verificar que los layouts pueden instanciarse sin excepciones y que la navegacion no depende de estado implicito.
- Output:
  - Nuevas y/o actualizadas paginas y componentes Dash en `app/pages/` y `app/components/`
  - Navegacion actualizada con la nueva pagina `analisis_causas`
- ACs covered:
  - AC-29
  - AC-42 to AC-47
  - AC-48 to AC-52
  - AC-60 to AC-61
- Status: `pending`

### T6. Verificacion, regresion y cierre tecnico
- Goal: dejar evidencia de que el sistema cumple el spec antes de la validacion humana final.
- Inputs:
  - `./requeriments_spec_driven_development/requerimiento_01/spec.md`
  - implementacion completa en `app/`, `db/`, `config/`
  - `./tests/` existentes o nuevos
- Actions:
  - Crear o ampliar pruebas automatizadas para:
    - introspeccion del schema
    - repositorios de persistencia
    - reglas de dominio
    - callbacks criticos
  - Validar por SQL:
    - tablas y columnas esperadas
    - indices obligatorios
    - defaults y checks
    - cascadas
    - ausencia de columnas legacy en el flujo base
  - Validar por UI:
    - CRUD base de procesos, contratos, maquinas y causas
    - ausencia de marcado de raiz en el arbol
    - CRUD base de hipotesis sin campos de evaluacion
    - pagina `analisis_causas` con crear/cerrar/reabrir/listar sesiones y trazabilidad
  - Ejecutar smoke checks de arranque local y guardar cualquier NC detectada para el flujo de correccion.
- Output:
  - Evidencia de pruebas y regresion
  - Lista de verificacion para Gate 3
- ACs covered:
  - AC-01 to AC-63
- Status: `pending`

---

## Acceptance Criteria Traceability

| AC | Covered by |
| --- | --- |
| AC-01 to AC-05 | T1, T3, T4, T5, T6 |
| AC-06 to AC-12 | T1, T3, T4, T5, T6 |
| AC-13 to AC-16 | T1, T3, T4, T5, T6 |
| AC-17 to AC-20 | T1, T3, T4, T5, T6 |
| AC-21 to AC-26 | T1, T2, T3, T4, T5, T6 |
| AC-27 to AC-30 | T2, T3, T4, T5, T6 |
| AC-31 to AC-34 | T1, T2, T3, T4, T5, T6 |
| AC-35 to AC-41 | T1, T3, T4, T5, T6 |
| AC-42 to AC-47 | T2, T4, T5, T6 |
| AC-48 to AC-52 | T3, T4, T5, T6 |
| AC-53 to AC-56 | T1, T3, T5, T6 |
| AC-57 to AC-59 | T1, T3, T4, T5, T6 |
| AC-60 to AC-63 | T1, T2, T4, T5, T6 |

---

## Verification Plan

### Automatic / Command-Line Verification
- `python -m pytest` o el subconjunto equivalente de `tests/` para:
  - schema
  - repositorios
  - dominio
  - callbacks
- Verificacion SQL contra PostgreSQL local:
  - tablas `analisis_causas` y `analisis_causas_detalle`
  - `idx_causa_contrato` y `idx_causa_parent`
  - defaults de `version`, `activo` y estados
  - ausencia de columnas legacy en el flujo base
- Smoke check de arranque local con `run.py` o `app/server.py`
- Reintentos de operaciones de borrado y reapertura para confirmar transacciones y preservacion de trazabilidad

### Manual Verification
- Crear proceso, contrato, maquina y asociacion para comprobar que los CRUD base siguen funcionando
- Crear un arbol con causas e hipotesis y verificar que ya no existe accion visible para marcar causa raiz
- Abrir, cerrar y reabrir una sesion en `analisis_causas` y confirmar que el historial no se pierde
- Verificar que la pagina base de hipotesis no muestra campos de evaluacion, comentario ni fecha
- Verificar que la pagina `analisis_causas` si permite editar evaluacion y comentario
- Confirmar que la UI actualiza sin recargar la pagina completa

---

## Non-Conformity Loop

### Policy
- Si la validacion final detecta una no conformidad, no marcar el requerimiento como `done`.
- Clasificar la causa raiz como:
  - `spec`
  - `task_plan`
  - `implementation`
- Reentrada segun causa:
  - `spec` -> corregir `spec.md` y volver a Gate 1
  - `task_plan` -> corregir `task_plan.md` y volver a Gate 2
  - `implementation` -> corregir la implementacion y volver a Gate 3
- Ninguna NC abierta o `in_correction` puede coexistir con `done`.

### Open Non-Conformities
- Ninguna registrada al crear este plan.

---

## Risks
- El repo actual ya contiene logica legacy para `tags`, `titulo`, `es_causa_raiz` y `justificacion_raiz`; si no se retira de forma coherente en todas las capas, aparecera divergencia entre schema, dominio y UI.
- La nueva pagina `analisis_causas` introduce estado de sesion y resume; si los `dcc.Store` no son la fuente de verdad unica, la UI puede editar la sesion equivocada.
- Los borrados en cascada y la reapertura de sesiones necesitan transacciones y tests especificos para evitar estados intermedios.
- El arbol base y la pagina de analisis comparten entidades, pero no comparten contrato de edicion; mezclar ambos flujos volveria a introducir la evaluacion en el CRUD base.
- La validacion final depende de PostgreSQL local disponible y de que el schema pueda re-inicializarse sin residuos de ejecuciones anteriores.

---

## Verification Checklist
- [ ] `spec.md` validado por el programador humano.
- [ ] `task_plan.md` aprobado para ejecucion.
- [ ] `db/schema.sql` alineado con el modelo de sesiones y trazabilidad.
- [ ] `analisis_causas` creado y navegable desde la UI.
- [ ] El flujo base ya no expone marcado de causa raiz.
- [ ] El CRUD base de hipotesis ya no expone campos de evaluacion, comentario ni fecha.
- [ ] La trazabilidad de `analisis_causas_detalle` funciona para causas e hipotesis.
- [ ] Los indices obligatorios existen.
- [ ] Las cascadas y reaperturas pasan la verificacion transaccional.
- [ ] La UI se actualiza sin recarga completa.
- [ ] No hay `print(`, `breakpoint()` ni marcadores de depuracion en codigo de produccion.
- [ ] No hay NCs abiertas o `in_correction`.
- [ ] Validacion final humana completada.

---

## Closure Rule

Marcar el requerimiento como `done` solo cuando:

- Gate 1 este aprobado.
- Gate 2 este aprobado.
- Gate 3 este aprobado por el programador humano.
- Todas las tareas esten completadas o justificadas como no aplicables.
- No existan NCs abiertas o `in_correction`.
- La implementacion refleje el contrato del `spec.md` sin controles de raiz en el flujo base ni evaluacion en el CRUD base de hipotesis.
- `traza_requerimiento.md` y los artefactos de cierre reflejen el estado real.
