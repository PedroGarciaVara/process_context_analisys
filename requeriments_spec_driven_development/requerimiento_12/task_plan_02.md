# Task Plan 02 — Aclaración y mejora del modelo máquina

## Metadata

- Requirement ID: `requerimiento_12`
- Spec File: `./requeriments_spec_driven_development/requerimiento_12/spec_02.md`
- Status: `implementado_pendiente_validacion`
- Allowed Status Values: `pending_human_validation`, `approved`, `in_progress`, `blocked`, `implementado_pendiente_validacion`, `no_conforme`, `en_correccion`, `done`
- Owner: `plan-task-agent`
- Created At: `2026-08-02`
- Last Updated: `2026-08-02`
- Authorship: actualización AMD-02-003 escrita por `plan-task-agent`; aprobación de Gate 2 registrada en esta sesión por instrucción explícita del programador humano.

---

## Objective

Extender el modelo actual de máquinas para representar de forma generalista y verificable `machine_type`, `machine` y `machine_operation_configuration`, manteniendo la compatibilidad con los modelos existentes y usando como identidad de operación el nodo BPM `pm_process_node.node_id`, junto con `process_version_id` y `process_id`.

La implementación deberá resolver la NC-006 con evidencia consistente entre PostgreSQL, dominio, API, contexto BPM/RCA y UI.

---

## Scope

### In Scope

- Inventario de `maquinas_tipo`, `maquina`, `registro_maquina`, `contrato`, `contrato_maquina` y BPM.
- Ampliación compatible de `machine_type` y `machine`.
- Decisión y posterior implementación de `machine_operation_configuration`.
- Identidad `operation_id = pm_process_node.node_id` para nodos `operation`.
- Persistencia de `process_version_id` y `process_id` como contexto de versión.
- Separación estricta entre `operation_id` y `contract_id`.
- Reglas de dominio para clasificar información común, permanente y contextual.
- Extensión de repositorios, servicios, rutas, contexto RCA y UI existente.
- Persistencia y lectura aditiva de `pm_process_node.properties.etapas` con `schema_version = 1`.
- Validador de árbol de exactamente dos niveles: etapa raíz y subetapa directa.
- Alta y modificación de máquina desde el modal existente, conservando el ID en PATCH.
- Editor visual de etapas/subetapas y ruta `Etapa › Subetapa` en el detalle de máquina, sin edición manual de JSON.
- Migración idempotente, compatibilidad hacia atrás y pruebas de persistencia/API/UI.
- Pruebas unitarias, de API y Playwright para alta, modificación, etapas, errores y estados de UI.
- Evidencia de corrección de NC-006.

### Out of Scope

- Inventario patrimonial, CMMS, mantenimiento, ubicaciones o control físico.
- Modelos o bounded contexts BU/MACBU.
- Eliminación inmediata de `registro_maquina`, `parent_maquina_id` o `activo`.
- Tablas auxiliares para parámetros, controles, medidas, elementos o zonas.
- Integración PLC/SCADA o IA externa.
- Reescritura de `spec.md`, `task_plan.md` o `nc-log.md`.
- Entidades, tablas o copias de `etapas` en `machine` o `machine_operation_configuration`.
- Editor de JSON, textarea de serialización o edición manual de la estructura de etapas.

---

## Inputs

- Client decision: `operacion = nodo BPM`.
- Technical specification: `./requeriments_spec_driven_development/requerimiento_12/spec_02.md`.
- Parent specification: `./requeriments_spec_driven_development/requerimiento_12/spec.md`.
- Existing plan context: `./requeriments_spec_driven_development/requerimiento_12/task_plan.md`.
- NC context: `./requeriments_spec_driven_development/requerimiento_12/nc-log.md`, especialmente `NC-006`.
- Source prompt: `./requeriments_spec_driven_development/requerimiento_12/promt_correcion_modelo_maquina.md`.
- Schema: `./db/schema.sql`.
- Existing domain/persistence/backend/frontend/test modules.
- Current context: `./context.md`.
- Current implementation surfaces: `app/domain/machine_modeling/`, `app/persistence/`, `uc_bib_solv/webapp_java/python-backend/`, `uc_bib_solv/webapp_java/webapp/js/`, `tests/unit/` y `tests/e2e/`.
- Amendment scope: `AMD-02-003`, AC-02-18..AC-02-21, FR-02-15..FR-02-19.

---

## Assumptions

- Gate 1 — validación humana de `spec_02.md`: aprobado por instrucción explícita del programador humano.
- `operation_id` será `pm_process_node.node_id` y deberá corresponder a un nodo `node_type = 'operation'`.
- `process_version_id` será `pm_process_version.version_id`; `process_id` aportará el contexto del proceso.
- `contract_id` seguirá siendo una identidad separada y no sustituirá a `operation_id`.
- `maquinas_tipo` y `maquina` son candidatos de reutilización, sujetos al inventario de compatibilidad.
- `contrato_maquina` no se reinterpretará como configuración máquina–operación sin decisión documentada.
- Los campos legados se conservarán hasta disponer de evidencia de consumidores y una decisión humana.
- `etapas` pertenece a la operación BPM y se leerá/escribirá dentro de `pm_process_node.properties`; las máquinas participantes solo la proyectan en su contexto.
- Las operaciones históricas sin `etapas` se expondrán como `[]`; la envolvente persistida/API usará `schema_version = 1` y conservará las demás propiedades.
- Gate 2 está aprobado; la implementación AMD-02-003 queda en `implementado_pendiente_validacion` hasta Gate 3.

---

## Dependencies

### Sub-agents and skills

- `plan-task-agent`: autor de esta actualización de planificación.
- `execute-agent`: implementación posterior, solo tras Gate 2.
- `nc-resolution-agent`: gestión de nuevas NC durante la corrección.
- `data-model-management`: entidades, DDL, FKs, constraints y migración.
- `domain-logic`: invariantes y clasificación de información fuera de UI/SQL.
- `webapp-architecture`, `frontend-design`: responsabilidades y presentación UI existente.
- `postgresql-primary-persistence`: PostgreSQL como fuente de verdad.
- `playwright-dash-webapp`: validación E2E cuando la superficie UI sea aplicable.

### Technical dependencies

- PostgreSQL y `db/schema.sql`.
- `app/domain/process_modeling/` y módulos de dominio RCA.
- `app/persistence/maquina_repo.py`, `contrato_repo.py`, repositorios BPM y contexto.
- `uc_bib_solv/webapp_java/python-backend/`.
- Frontend bajo `uc_bib_solv/webapp_java/webapp/js/`.
- Tests unitarios, integración y Playwright existentes.

---

## Execution Strategy

La ejecución deberá ser secuencial. Primero se cerrará el mapa de compatibilidad y las decisiones que afectan al DDL. Después se implementarán dominio y persistencia, posteriormente API/contexto y UI, y finalmente se ejecutarán las verificaciones de regresión y la evidencia de NC-006.

Con el Gate 2 aprobado, queda habilitada la ejecución de las tareas mediante `execute-agent`, manteniendo la secuencia definida.

---

## Human Validation Gates

### Gate 1: Spec Validation

- Required State Before Planning: `spec_02.md` validado.
- Decision Owner: `programador_humano`.
- Status: `approved`.
- Evidence: instrucción explícita del programador humano solicitando validar `spec_02.md` y generar este plan.

### Gate 2: Task Plan Approval (reabierto por AMD-02-003)

- Required State Before Implementation: aprobación humana explícita de `task_plan_02.md`.
- Decision Owner: `programador_humano`.
- Status: `approved`.
- Historical evidence: aprobación humana anterior para el alcance AMD-02-002 y migración de datos existentes; se conserva como antecedente y no cubre AMD-02-003.
- Evidence: el programador humano aprobó explícitamente `task_plan_02.md` para AMD-02-003 en esta sesión, incluyendo persistencia/lectura de `etapas`, editor visual, alta/modificación y pruebas AC-02-18..AC-02-21.
- Rule: queda habilitada la implementación mediante `execute-agent`.

### Gate 3: Final Implementation Validation

- Required State Before Closure: `implementado_pendiente_validacion`.
- Decision Owner: `programador_humano`.
- Status: `pending`.
- Rule: `done` requiere evidencia completa y NC-006 cerrada por validación humana.

---

## Tasks

### T1. Inventario y mapa de compatibilidad

- Goal: identificar tablas, campos, repositorios, endpoints, proyecciones y consumidores actuales.
- Inputs: `db/schema.sql`, `app/domain/`, `app/persistence/`, backend, frontend, tests y NC-006.
- Actions:
  - Mapear `maquinas_tipo` a `machine_type`.
  - Mapear `maquina` a `machine`.
  - Identificar consumidores de `activo`, `parent_maquina_id`, `registro_maquina` y `contrato_maquina`.
  - Identificar nodos BPM `operation` y su versión.
  - Documentar campos legados que se mantienen, proyectan o deprecian.
- Output: matriz de compatibilidad y decisión de continuidad.
- Status: `completed`.

### T2. Diseño de la tabla dedicada machine_operation_configuration

- Goal: concretar el diseño de la tabla dedicada aprobada para `machine_operation_configuration`.
- Inputs: matriz T1, `contrato_maquina`, `pm_process_node`, `pm_process_version`, consumidores API/UI y decisión humana de opción A.
- Actions:
  - Definir columnas/FK para `machine_id`, `operation_id`, `process_version_id` y `contract_id` opcional.
  - Definir JSONB validado para entradas, controles, medidas y reglas de seguridad.
  - Definir `validation_status`, vigencia y `UNIQUE(machine_id, process_version_id, operation_id)`.
  - Definir compatibilidad de lectura con `contrato_maquina` sin convertirla en la entidad nueva.
- Output: diseño lógico y matriz de compatibilidad de la tabla dedicada; ningún cambio de esquema en esta tarea.
- Exit criteria: diseño alineado con AMD-02-002 y listo para T4.
- Status: `completed`.

### T3. Modelo de dominio y validaciones

- Goal: expresar invariantes sin acoplamiento a SQL, Flask o UI.
- Inputs: diseño T2 y FR-02-01..FR-02-08.
- Actions:
  - Definir entidades/value objects o ampliar el límite existente en `app/domain/`.
  - Validar clasificación tipo/máquina/configuración.
  - Validar `operation_id` como nodo BPM `operation` dentro de `process_version_id`.
  - Validar estados, vigencias y unicidad funcional.
  - Mantener `contract_id` separado.
- Output: reglas de dominio y tests unitarios.
- Status: `completed`.

### T4. Persistencia y DDL compatible

- Goal: persistir los tres niveles con integridad referencial e idempotencia.
- Inputs: T1, T2, T3, `data-model-management`, `postgresql-primary-persistence`.
- Actions:
  - Ampliar tablas/modelos existentes solo donde proceda.
  - Crear la tabla dedicada `machine_operation_configuration`.
  - Añadir FKs/validaciones para tipo, máquina, versión BPM y nodo operation.
  - Aplicar `UNIQUE(machine_id, process_version_id, operation_id)`.
  - Mantener JSONB estructurado sin tablas auxiliares adicionales.
  - Preparar migración reversible/idempotente y compatibilidad con campos legados.
- Output: cambios en `db/schema.sql`, repositorios y mapeadores, sujetos a Gate 2.
- Status: `completed`.

### T5. Servicios, API y contexto BPM/RCA

- Goal: exponer y reconstruir el contexto canónico.
- Inputs: T3, T4, rutas/repositorios existentes, AC-02-08..AC-02-11.
- Actions:
  - Extender servicios y rutas existentes.
  - Exponer por separado `operation_id`, `process_version_id`, `process_id` y `contract_id`.
  - Rechazar nodos inexistentes/no operation, duplicados, JSONB inválido y vigencias invertidas.
  - Recuperar contexto en orden operación → tipo → máquina → configuración → RCA.
  - Mantener contratos HTTP históricos o versionar cambios incompatibles.
- Output: API/contexto verificable y pruebas de contrato.
- Status: `completed`.

### T6. Frontend de detalle máquina

- Goal: mostrar los cuatro bloques sin mezclar semánticas.
- Inputs: T5, componentes bajo `webapp/js/api`, `js/core`, `js/components` y `js/views`.
- Actions:
  - Ampliar la vista `maquinas_v02` y clientes API existentes.
  - Mostrar operación, tipo, máquina y configuración por separado.
  - Implementar estados de carga, vacío, error y configuración ausente.
  - Enviar IDs canónicos, sin resolver identidad en frontend.
- Output: UI compatible y prueba E2E cuando el entorno esté disponible.
- Status: `completed`.

### T7. Migración, fixture y regresión

- Goal: migrar los datos existentes al nuevo modelo y demostrar compatibilidad e idempotencia.
- Inputs: T1, T2, T4, T5, `db/schema.sql`, datos de `maquinas_tipo`, `maquina`, `contrato`, `contrato_maquina`, nodos BPM `operation`, scripts/tests existentes y AC-02-14..AC-02-16.
- Actions:
  - Crear un inventario previo con conteos, claves y relaciones de los datos origen.
  - Mapear `maquinas_tipo` a `machine_type` y `maquina` a `machine`, conservando IDs o una tabla de correspondencia explícita.
  - Resolver cada relación existente `contrato_maquina` hacia `machine_operation_configuration` solo cuando exista un nodo BPM `operation`, `process_version_id` y `contract_id` verificables.
  - Crear configuraciones con `operation_id = pm_process_node.node_id`; registrar excepciones y no inventar relaciones desde nombres o texto.
  - Migrar atributos específicos al nivel correcto: comunes a `machine_type`, permanentes a `machine` y contextuales a la tabla dedicada.
  - Ejecutar la migración en modo transaccional, acotado e idempotente, con respaldo o estrategia de reversión verificable.
  - Repetir la migración y demostrar que no duplica tipos, máquinas, configuraciones ni enlaces.
  - Comprobar que `registro_maquina`, `parent_maquina_id`, `activo` y los registros históricos de `contrato_maquina` no se eliminan ni reinterpretan sin decisión aprobada.
  - Proyectar las operaciones históricas sin `properties.etapas` como `etapas: []` y añadir únicamente `schema_version = 1` donde corresponda, sin borrar ni sobrescribir otras propiedades.
  - Repetir la migración de etapas y demostrar que no cambia conteos, IDs ni árboles existentes.
  - Ejecutar la regresión histórica disponible; las pruebas nuevas de AMD-02-003 se planifican en T12.
- Output: script/migración idempotente, matriz de correspondencias, inventario de operaciones sin etapas, informe de excepciones, conteos antes/después, evidencia de reversión y regresión.
- Status: `in_progress`.

### T8. Evidencia y validación de NC-006

- Goal: preparar el paquete de evidencia para Gate 3.
- Inputs: T1–T7, AC-02-01..AC-02-21, `spec_02.md`, `nc-log.md`.
- Actions:
  - Verificar identidad canónica de cada máquina objetivo.
  - Verificar relaciones máquina–proceso, máquina–nodo BPM operation, contrato y contexto.
  - Registrar consultas SQL, respuestas API, evidencia UI y resultados de pruebas.
  - Incorporar evidencia específica de alta/modificación, round-trip de `etapas`, errores 400/404/409, compatibilidad aditiva y ruta visual de etapa.
  - Reabrir T3–T7 si la causa de una desviación es implementación; solicitar nueva enmienda si la causa es spec o plan.
- Output: paquete de validación humana y propuesta de cierre NC-006.
- Status: `pending`.

### T9. Dominio y casos de uso de etapas y gestión de máquina

- Goal: añadir las invariantes de `etapas` y los contratos de alta/modificación sin acoplar el dominio a Flask, SQL, PostgreSQL ni UI.
- Inputs: FR-02-15..FR-02-17, FR-02-19, AC-02-18..AC-02-20, `app/domain/machine_modeling/` y patrones de tests unitarios existentes.
- Actions:
  - Definir el value object/validador del árbol con `schema_version = 1`, nodos `id`/`nombre`/`orden`/`subetapas`, hojas como `[]` y profundidad máxima de dos niveles.
  - Validar nombres, tipos, IDs duplicados, órdenes duplicados entre hermanos, referencias circulares representadas por IDs y versiones no soportadas mediante errores funcionales estables.
  - Mantener IDs al modificar nombre, orden o subetapas y distinguir PATCH parcial sin `etapas` de actualización explícita del árbol.
  - Coordinar alta y modificación de máquina, conservando la identidad en PATCH y delegando la autoridad de validación al backend.
- Output: contratos de dominio/casos de uso y tests unitarios aislados de BBDD real.
- Status: `pending`.

### T10. Persistencia, migración y API aditiva de etapas

- Goal: persistir y leer etapas exclusivamente en `pm_process_node.properties.etapas`, preservando propiedades existentes y exponiéndolas como `operation.etapas`.
- Inputs: T7, T9, `app/persistence/pm_process_repo.py`, repositorios/servicios/rutas existentes, `db/schema.sql`, FR-02-16..FR-02-17 y AC-02-20..AC-02-21.
- Actions:
  - Extender el mapeo de nodos para normalizar `etapas: []` cuando falte y serializar determinísticamente el árbol válido con `schema_version = 1`.
  - Implementar lectura/escritura parcial que actualice solo `properties.etapas`, conserve claves no relacionadas y no copie el árbol a máquina/configuración.
  - Extender de forma aditiva las rutas de operaciones y el contexto de máquina; transportar `operation_id`, `process_version_id` y `etapas`, con 400/404/409 según el contrato vigente y mensajes sin trazas internas.
  - Mantener compatibilidad de clientes que no envían `etapas` y preparar migración/inicialización idempotente para operaciones históricas.
  - Cubrir round-trip JSONB, persistencia vacía, idempotencia, concurrencia/versionado si existe el patrón actual, alta 201, modificación 200 y relectura.
- Output: cambios planificados en `db/schema.sql`/migrador, repositorios, servicios y rutas existentes, con pruebas unitarias/API de persistencia.
- Status: `pending`.

### T11. Editor visual del modal y detalle de máquina

- Goal: permitir gestionar etapas desde `maquinas_v02` mediante controles estructurados y mostrar la ruta de etapa sin exponer JSON manual.
- Inputs: T5, T6, T9, T10, FR-02-18, `uc_bib_solv/webapp_java/webapp/js/views/maquinas_v02.js`, clientes API/componentes/estilos existentes y `context.md`.
- Actions:
  - Añadir la sección visible `Etapas` al alta, modificación y detalle, habilitándola solo con operación BPM seleccionada.
  - Implementar alta de etapa/subetapa directa, edición de nombre, reordenación de hermanos y eliminación confirmada de descendientes; no ofrecer tercer nivel.
  - Generar internamente el payload canónico, conservar IDs estables y enviar IDs BPM canónicos; no añadir textarea, editor de código, pegado ni edición manual de JSON.
  - Mostrar carga, `Sin etapas definidas`, errores seguros con reintento, validación junto al nodo y la ruta `Etapa › Subetapa` en el detalle.
  - Mantener los campos históricos y el estado del formulario después de errores de carga/guardado.
- Output: ampliación de la UI existente y pruebas de comportamiento JavaScript/E2E preparadas para la superficie actual.
- Status: `pending`.

### T12. Verificación AMD-02-003 y evidencia de reentrada

- Goal: demostrar AC-02-18..AC-02-21 sobre el flujo observable completo y preparar la nueva validación humana.
- Inputs: T7–T11, `tests/unit/`, `tests/integration/`, `tests/e2e/`, `playwright.config.js`, `ui-test-structure`, `playwright-dash-webapp` cuando aplique, y NC-006.
- Actions:
  - Ejecutar tests unitarios de alta/modificación, validador de dos niveles, serialización determinista, errores y no pérdida en PATCH parcial.
  - Ejecutar tests de API/persistencia para 201/200, round-trip, `properties` preservadas, `[]`, errores 400/404/409 y migración idempotente.
  - Crear/ajustar Playwright en `tests/e2e/` para abrir el modal, crear máquina con operación, añadir etapa/subetapa, guardar, releer, modificar y verificar la ruta; comprobar ausencia de editor JSON y limpiar/restaurar fixture.
  - Verificar estados de carga, vacío, fallo de lectura y fallo de guardado sin perder datos introducidos; registrar artefactos en `.playwright-artifacts/` según la estructura vigente.
  - Consolidar matriz AC-02-18..AC-02-21, regresión histórica y evidencia para T8/NC-006; no cerrar NC-006 ni Gate 3 automáticamente.
- Output: resultados reproducibles de tests, artefactos Playwright, matriz de trazabilidad y paquete de validación humana.
- Status: `pending`.

---

## Acceptance Criteria Traceability

| AC | Covered by | Evidence |
|---|---|---|
| AC-02-01 | T1, T4 | Inspección de entidades y DDL sin modelos auxiliares/BU |
| AC-02-02 | T3, T4, T7 | Persistencia de tipo y reutilización sin duplicación |
| AC-02-03 | T3, T4, T5 | FK, estado y rechazo de tipo inexistente |
| AC-02-04 | T3, T5 | Test de clasificación permanente/contextual |
| AC-02-05 | T2, T4, T7 | Unicidad por máquina, versión y nodo BPM |
| AC-02-06 | T3, T4, T5 | Lectura separada de campos permanentes/contextuales |
| AC-02-07 | T4, T7 | Consultas de huérfanos, duplicados y enlaces textuales |
| AC-02-08 | T5 | API separa `operation_id`, versión y contrato |
| AC-02-09 | T5, T8 | Proyección BPM reconstruible y con procedencia |
| AC-02-10 | T5, T6 | Contrato de contexto y cuatro bloques |
| AC-02-11 | T5, T8 | Regresión RCA y trazabilidad causal |
| AC-02-12 | T6, T7 | UI con bloques y estados de interacción |
| AC-02-13 | T3, T5, T7 | Errores 4xx y validación de payload |
| AC-02-14 | T5, T7 | Regresión de máquinas, contratos, BPM y RCA |
| AC-02-15 | T4, T7 | Migración/seed idempotente |
| AC-02-16 | T1, T7 | Fixture generalista no BU |
| AC-02-17 | T8 | Evidencia final y validación humana de NC-006 |
| AC-02-18 | T9, T10, T11, T12 | Alta/modificación 201/200, ID estable, relectura y regresión |
| AC-02-19 | T9, T10, T11, T12 | Round-trip canónico, etapa/subetapa visual y ausencia de editor JSON |
| AC-02-20 | T9, T10, T11, T12 | `[]`, estados UI, errores de árbol, API y mensajes seguros |
| AC-02-21 | T7, T10, T12 | Migración idempotente, propiedades preservadas y respuesta aditiva |

---

## Verification Plan

### Automatic / Command-Line Verification

- Tests unitarios de dominio para clasificación, estados, vigencias e identidad BPM.
- Tests de persistencia para FKs, unicidad, JSONB y ausencia de huérfanos.
- Verificación de migración con conteos antes/después, correspondencias de IDs, excepciones no mapeadas y segunda ejecución idempotente.
- Tests de API para respuestas compatibles y errores 4xx.
- Tests unitarios/API para alta 201, modificación 200, PATCH parcial, `etapas: []`, `schema_version = 1`, round-trip y errores 400/404/409.
- Ejecución idempotente de la migración/fixture.
- Regresión de tests existentes de proceso, contrato, máquina y RCA.
- `py_compile` y `git diff --check`.
- Playwright sobre la vista de máquinas si el servidor y entorno están disponibles.
- Playwright para crear/modificar desde el modal, añadir etapa/subetapa, verificar la ruta tras recarga y comprobar que no existe editor JSON.

### Manual Verification

- Aprobar T2 antes de cualquier DDL.
- Revisar que `contract_id` nunca sea usado como `operation_id`.
- Revisar cuatro bloques UI y estados vacío/carga/error.
- Revisar que `etapas` solo vive en `pm_process_node.properties` y que la API la normaliza como `operation.etapas`.
- Revisar validador de dos niveles, IDs estables, serialización determinista y preservación de propiedades no relacionadas.
- Revisar evidencia PostgreSQL/API/UI para una versión BPM exacta.
- Validar finalmente la corrección de NC-006.

---

## Non-Conformity Loop

### Policy

- Cualquier NC abierta o `in_correction` bloquea `done`.
- Clasificar causa raíz como `spec`, `task_plan` o `implementation`.
- `spec`: actualizar `spec_02.md`, volver a Gate 1 y revisar este plan.
- `task_plan`: corregir `task_plan_02.md` y volver a Gate 2.
- `implementation`: volver a T3–T8 mediante `execute-agent` y repetir Gate 3.
- NC-006 permanece abierta hasta que la validación humana confirme la evidencia completa.

### Open Non-Conformities

- `NC-006`: abierta; identidad, atributos y relaciones verificables del modelo máquina pendientes de corrección y validación.

---

## Risks

- Reinterpretar `contrato_maquina` como operación y romper consumidores existentes.
- Confundir `contract_id` con `operation_id`.
- Crear configuraciones duplicadas entre versiones BPM.
- Eliminar campos legados que todavía tengan consumidores.
- Mezclar estado contractual derivado con `operational_status`.
- Persistir relaciones estructurales únicamente en JSONB/texto.
- Ejecutar DDL antes de resolver las preguntas abiertas de `spec_02`.
- Regresión de la UI actual de contratos/máquinas.
- Sobrescribir propiedades ajenas al actualizar `properties.etapas`; mitigar con merge parcial y round-trip.
- Aceptar árboles de más de dos niveles o regenerar IDs al reordenar; mitigar con validador de dominio y pruebas de PATCH.
- Romper clientes existentes al ampliar respuestas; mitigar con contrato aditivo y default `[]`.
- E2E no reproducible por runtime/credenciales/fixture; registrar el bloqueo sin afirmar evidencia no ejecutada.

---

## Verification Checklist

- [x] Gate 1 — `spec_02.md` validado por el programador humano.
- [x] Gate 2 — `task_plan_02.md` de AMD-02-003 aprobado explícitamente por el programador humano; la aprobación histórica queda conservada como antecedente.
- [ ] T2 aprobado antes de modificar DDL.
- [ ] `operation_id` validado como `pm_process_node.node_id` de tipo `operation`.
- [ ] `contract_id` separado y probado.
- [ ] Persistencia de tipo, máquina y configuración verificada.
- [ ] Compatibilidad de `registro_maquina`, `parent_maquina_id` y `activo` decidida.
- [ ] API/contexto y UI verificados.
- [x] Persistencia de `pm_process_node.properties.etapas` con `schema_version = 1` y default `[]` verificada en pruebas unitarias/proyección.
- [x] Editor visual sin JSON manual y ruta `Etapa › Subetapa` implementados.
- [ ] Pruebas unitarias, API/persistencia y Playwright de alta/modificación/etapas ejecutadas (E2E pendiente por entorno).
- [ ] Idempotencia y regresión verificadas.
- [ ] T9–T12 completadas tras la aprobación de Gate 2 (T12 pendiente de E2E/API de entorno).
- [ ] NC-006 cerrada por validación humana.
- [ ] Gate 3 aprobado.

---

## Degraded Mode Record

- `execute-agent` no pudo iniciar en dos intentos por timeout del catálogo/runtime MCP.
- Con modo degradado autorizado, la implementación fue completada directamente por el orquestador en los módulos de dominio, backend, frontend y pruebas indicados.
- El estado queda en `implementado_pendiente_validacion`; Gate 3, NC-006 y `done` permanecen pendientes de validación humana.

## Closure Rule

El estado solo podrá pasar a `done` cuando:

- Gate 1 esté aprobado.
- Gate 2 esté aprobado.
- T1–T12 estén completadas o justificadas.
- Todos los AC-02-01..AC-02-21 tengan evidencia.
- No existan NC abiertas o `in_correction`.
- NC-006 esté validada y cerrada por el programador humano.
- Gate 3 confirme conformidad de implementación.

---
