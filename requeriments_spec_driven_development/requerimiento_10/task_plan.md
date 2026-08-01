## Metadata
- Requirement ID: `requerimiento_10`
- Spec File: `./requeriments_spec_driven_development/requerimiento_10/spec.md`
- Status: `implementado_pendiente_validacion`
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
- Created At: `2026-07-19`
- Last Updated: `2026-07-27` (AMD-005)

---

## Objective

Planificar un vertical slice incremental para modelado de procesos en `webapp_java`: persistir el bounded context `pm_*` en PostgreSQL, exponer sus casos de uso mediante Flask, integrarlo en el shell JavaScript existente y verificarlo con tests de dominio, persistencia/API, UI y no regresión. El plan empieza por un lote backend pequeño que permita ejecutar los primeros tests antes de completar la experiencia UI y las validaciones ampliadas.

---

## Scope

### In Scope
- Procesos canónicos, versiones `draft`, nodos `input`, `output`, `operation`, `subprocess`, `decision`, `stock` y transiciones `sequence`/`branch`.
- Tablas PostgreSQL aisladas con prefijo `pm_`, repositorios separados y uso de `app/persistence/db.py`.
- Dominio independiente de Flask, PostgreSQL y frontend, con entidades, value objects, interfaces, casos de uso, validadores y errores funcionales.
- Blueprint Flask, servicio de aplicación, contratos JSON/HTTP y registro en `python-backend/app.py`.
- Página hash `#/modelado-procesos`, API JS, estado local, componentes BPM/inspector/breadcrumbs, expansión inline, contraer/retorno, restauración por hash/URL y estados de carga, vacío, error y guardado.
- Enmienda AMD-003: retirada visual del catálogo lateral, selector compacto en shell/editor, scroll vertical global del documento y acción reversible de pantalla completa con Fullscreen API condicionada y fallback visual sin dependencias.
- Enmienda AMD-005: layout BPM determinista y recalculable, medición de tamaños reales, prevención de solapes, centrado vertical, lanes separados por el ancho máximo de subárbol, routing ortogonal claro, eliminación de edges redundantes y garantía de correspondencia entre transiciones semánticas y flujos visuales.
- Tests unitarios de dominio, tests de repositorio/API, smoke test UI cuando el entorno esté disponible y suite de no regresión.
- Tests puros de layout, DOM/SVG y E2E específicos para nodos heterogéneos, ramas anidadas, expansión/contracción, conectores y accesibilidad.

### Out of Scope
- Tipos de nodo posteriores a `decision`/`stock`, variantes, implementaciones técnicas, equipos, resolución contextual, publicación avanzada, permisos, auditoría completa y API de agentes.
- React, JointJS, Dash callbacks/páginas, ejecución de expresiones o semántica industrial no definida en el spec.
- Persistencia de coordenadas, cambios de endpoints, cambios de tablas `pm_*`, modificación del JSON semántico o adopción obligatoria de ELK/elkjs/JGraph/JointJS.
- Reutilización o migración semántica de `node`, `relationship`, `causa`, `hipotesis`, `proceso`, `contrato` o `maquina` legacy.
- Sincronización con otra BBDD: en este slice PostgreSQL es la fuente de verdad y no se introduce un mecanismo externo no pedido por el spec.

---

## Inputs
- Client requirement: no se requiere para planificar; el `spec.md` validado es la fuente canónica.
- Technical specification: `./requeriments_spec_driven_development/requerimiento_10/spec.md`
- Supporting docs:
  - `./context.md`
  - `./README.md`
  - `./common_spec_driven_development/templates/task_plan.template.md`
  - `.atl/sub-agent-registry.md`
  - `.atl/skill-registry.md`
  - `uc_bib_solv/webapp_java/python-backend/app.py`
  - `uc_bib_solv/webapp_java/python-backend/routes/`
  - `uc_bib_solv/webapp_java/python-backend/services/`
  - `uc_bib_solv/webapp_java/webapp/js/`
  - `app/domain/`
  - `app/persistence/db.py`
  - `app/persistence/`
  - `db/schema.sql`
  - `tests/`

---

## Assumptions
- Gate 1 está aprobado por `requirements-agent` para `spec.md` actualizado con AMD-004 el 2026-07-20; incluye las validaciones previas de AMD-002 y AMD-003.
- La aprobación histórica de Gate 2 para AMD-004 no autoriza AMD-005. Esta replanificación queda pendiente de aprobación humana antes de ejecutar T17–T21.
- La estructura real de `webapp_java` (Flask + JavaScript puro) prevalece para la implementación de este requerimiento sobre el contexto histórico Dash del proyecto.
- Se extenderán `app/domain` y `app/persistence` con módulos nuevos, sin alterar la semántica ni los contratos legacy.
- `db/schema.sql` sigue siendo el mecanismo de inicialización vigente. Si la ejecución descubre migraciones versionadas existentes, se añadirá el mismo DDL de forma idempotente sin cambios destructivos.
- Las decisiones de detalle que no cambien rutas, contratos, alcance o ubicación podrán resolverse durante ejecución por `execute-agent` aplicando las skills cargadas.
- El smoke test UI se ejecutará si el servidor, PostgreSQL y las dependencias del entorno están disponibles; si no, la limitación se documentará y se conservará la verificación automática equivalente.

---

## Dependencies
- Sub-agents / skills relevantes:
  - `plan-task-agent` para este artefacto.
  - `execute-agent` para implementar después de Gate 2.
  - `domain-logic` para fronteras, entidades, interfaces y casos de uso sin infraestructura.
  - `data-model-management` para DDL, constraints, índices, mapeos y repositorios.
  - `postgresql-primary-persistence` para PostgreSQL como fuente de verdad, conexión compartida y transacciones; no se adopta sincronización externa fuera de alcance.
  - `project-structure-sdd` para extender módulos existentes y mantener separado el bounded context.
  - `frontend-design` para una UI nativa, coherente, accesible y deliberada sin introducir framework gráfico obligatorio.
  - `git-workflow` para commits por tarea y commit del plan con `[skip ci]` tras aprobación.
  - `ui-test-structure`, `ui-log-recovery` y `playwright-dash-webapp` para estructura, evidencias y patrones E2E; el último se adaptará con cautela porque el target no es Dash y no se copiarán selectores, login ni iframes específicos de Dash.
  - `web-design-guidelines` para la revisión de nombres accesibles, foco, teclado, estados y scroll; `frontend-design` para conservar una composición nativa coherente sin introducir framework.
- `playwright-setup-agent`, `ui-test-generation-agent`, `ui-test-execution-agent` y `ui-log-recovery-agent` para coordinar setup, extensión/generación, ejecución y recuperación de evidencias cuando aplique.
- `webapp-architecture` para conservar la frontera Flask + JavaScript puro y evitar lógica de layout en el bootstrap o backend.
- `dash-callbacks` no aplica al target actual; se revisa únicamente como referencia de separación estado/render para expansión, sin introducir callbacks Dash.
- Technical dependencies:
  - Python/Flask, `psycopg2`, PostgreSQL local y configuración existente de `config/settings.py`.
  - Navegador y runner UI disponibles para el smoke test.
  - Suite existente de `tests/` ejecutable sin modificar sus fixtures salvo aislamiento explícito.

---

## Execution Strategy

La ejecución será vertical e incremental, manteniendo una frontera clara entre dominio, persistencia, API, integración del blueprint, frontend y tests. Primero se construirá un camino backend mínimo que permita crear proceso/versión, persistir y reconstruir un grafo pequeño; después se incorporarán los seis tipos, stock/decisión, expansión inline, bloqueo de versiones, jerarquía, validación completa y UI. Cada lote debe dejar evidencia ejecutable antes de abrir el siguiente.

### Lote 1 — Primer lote ejecutable y simple

Implementar únicamente el camino mínimo de persistencia y API necesario para ejecutar los primeros tests unitarios, de integración y API: DDL `pm_*`, entidades/contratos de dominio básicos, repositorios para proceso/versión/nodo/transición, servicio, endpoints de creación/consulta y registro del blueprint. La salida mínima continúa siendo un proceso con una versión draft, cuatro nodos (`input`, `operation`, `output`, `subprocess`) y dos transiciones reconstruibles mediante API, con sus tests iniciales verdes. `decision`, `stock`, expansión inline y salidas `normal`/`waste` se incorporan en tareas posteriores de AMD-002; no se bloquea el primer baseline ejecutable.

### Lote 2 — Extensión semántica AMD-002 y reglas funcionales

Añadir edición draft, bloqueo de versiones no editables, errores funcionales estables, validación semántica, `decision`, `stock`, ramas `Sí`/`No`, `output_role` normal/waste, expansión inline, breadcrumbs, contraer/retorno y transacciones atómicas. Reforzar tests de referencias, ciclos, tipos, UUID, determinismo, no mutación del padre y sobre JSON.

### Lote 3 — Frontend BPM, navegación y AMD-003

 Mantener la implementación ya completada de la vista, ruta, mapa de vistas y BPM; tras Gate 2 aplicar las correcciones UI de AMD-003/AMD-004 en los módulos existentes: conservar scroll global, añadir scroll vertical/horizontal interno coordinado en `.pm-flow-scroll` en modo normal y fullscreen/fallback, y preservar contexto y accesibilidad.

### Lote 4 — Verificación completa y cierre técnico

Ejecutar tests automáticos, smoke UI si está disponible, no regresión de rutas/causalidad/operational/health, rendimiento del grafo de prueba, revisión de imports y estructura, higiene pre-commit y preparación de evidencia para Gate 3. Las fases posteriores del spec quedan fuera de este plan.

---

## Human Validation Gates

### Gate 1: Spec Validation
- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `approved`
- Evidence:
  - `spec.md` actualizado con AMD-004 figura como `spec_validada` y fue producido/validado por `requirements-agent`.
  - AMD-002, AMD-003 y AMD-004 están integradas y validadas en Gate 1; el spec contiene AC-01..AC-22 y responsabilidades UI explícitas.

### Gate 2: Task Plan Approval
- Required State Before Implementation: aprobación humana explícita de este `task_plan.md`.
- Decision Owner: `programador_humano`
- Status: `approved`
- Evidence:
  - Validación humana explícita recibida el `2026-07-27`: `validar`.
  - AMD-005 queda aprobada y lista para ejecución por `execute-agent`.
- Notes:
  - La aprobación de AMD-004 y la corrección de NC-001 permanecen como historial; la validación actual habilita T17–T21.
  - No implica aprobación de Gate 3 ni cierre del requerimiento.

### Gate 3: Final Implementation Validation
- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `done` solo es válido tras conformidad final humana y ausencia de NCs abiertas o `in_correction`.

---

## Tasks

### T1. Preparar baseline de ejecución y contrato de persistencia — Lote 1
- Owner: `execute-agent`; revisión de datos por `data-model-management`.
- Paths previstos:
  - `db/schema.sql`
  - `db/` (solo si existe mecanismo de inicialización/migración aplicable)
  - `tests/integration/` y fixtures de PostgreSQL aislados
- Goal: dejar materializado el bounded context `pm_*` sin tocar tablas legacy y permitir que los primeros tests trabajen contra PostgreSQL real.
- Inputs:
  - FR-01..FR-06, FR-10, modelo de datos y AC-02/AC-03.
  - `db/schema.sql`, `app/persistence/db.py` y convenciones de tests existentes.
- Actions:
  - Definir `pm_process_definition`, `pm_process_version`, `pm_process_node` y `pm_process_transition` con UUID, FKs, estados, unicidades, checks, `JSONB` solo para propiedades e índices solicitados.
  - Garantizar `ON DELETE` coherente, SQL parametrizable desde repositorios y transacciones atómicas.
  - Preparar fixture/estrategia de limpieza que no borre ni modifique tablas del árbol causal.
  - Ejecutar el primer test de creación/lectura de proceso y versión tras inicializar el esquema.
- Output:
  - DDL idempotente y tests de persistencia iniciales con evidencia de UUID, código, nombre y versión.
- Status: `pending`

### T2. Modelar entidades y casos de uso mínimos — Lote 1
- Owner: `execute-agent`; revisión de fronteras por `domain-logic`.
- Paths previstos:
  - `app/domain/process_modeling/__init__.py`
  - `app/domain/process_modeling/entities.py`
  - `app/domain/process_modeling/value_objects.py`
  - `app/domain/process_modeling/interfaces.py`
  - `app/domain/process_modeling/use_cases.py`
  - `app/domain/process_modeling/exceptions.py`
  - `app/domain/process_modeling/validators.py`
  - `app/domain/process_modeling/tests/`
- Goal: definir el contrato funcional independiente de Flask, psycopg2 y PostgreSQL para crear/consultar el grafo mínimo.
- Inputs:
  - FR-01..FR-07, FR-10 y restricciones de `domain-logic`.
- Actions:
  - Crear entidades/value objects para proceso, versión, nodo y transición, con estados/tipos del slice y datos extensibles separados.
  - Definir interfaces abstractas para repositorios y casos de uso para alta/consulta mínima.
  - Encapsular validaciones reutilizables y excepciones funcionales; dejar extensible la validación posterior sin exigir reglas fuera del spec.
  - Añadir tests unitarios sin Flask, psycopg2, SQL, red ni variables de entorno.
- Output:
  - Núcleo de dominio testeable y contratos que puedan implementar los repositorios concretos.
- Status: `completed`

### T3. Implementar repositorios PostgreSQL del bounded context — Lote 1
- Owner: `execute-agent`; revisión de persistencia por `data-model-management` y `postgresql-primary-persistence`.
- Paths previstos:
  - `app/persistence/pm_process_repo.py`
  - `app/persistence/pm_version_repo.py`
  - `app/persistence/pm_node_repo.py`
  - `app/persistence/pm_transition_repo.py`
  - `app/persistence/` (mapper/DTO separado solo si hace falta)
  - `tests/integration/` y `tests/unit/`
- Goal: implementar adaptadores concretos que cumplan interfaces de dominio y reconstruyan el grafo desde PostgreSQL de forma determinista.
- Inputs:
  - T1/T2, `app/persistence/db.py`, AC-02/AC-03/AC-08.
- Actions:
  - Reutilizar exclusivamente `db_cursor()`/conexión existente; no crear conexiones en rutas, servicios UI ni dominio.
  - Usar SQL parametrizado, commit/rollback transaccional y mapeo dominio-persistencia explícito.
  - Ordenar procesos, nodos y transiciones de forma estable y verificar que las coordenadas no son necesarias.
  - Añadir tests de repositorio para cuatro nodos y dos transiciones, relaciones intra-versión y lectura posterior al cierre de transacción.
- Output:
  - Repositorios `pm_*` aislados y evidencia de reconstrucción API-ready del grafo mínimo.
- Status: `pending`

### T4. Crear servicio de aplicación y API mínima — Lote 1
- Owner: `execute-agent`; revisión de contrato HTTP por `execute-agent` y tests de rutas.
- Paths previstos:
  - `uc_bib_solv/webapp_java/python-backend/services/process_modeling_service.py`
  - `uc_bib_solv/webapp_java/python-backend/routes/process_modeling.py`
  - `tests/unit/` y `tests/integration/`
- Goal: exponer el primer camino HTTP sin SQL ni reglas industriales en la ruta.
- Inputs:
  - T2/T3, FR-08, FR-10, AC-02/AC-03/AC-08.
- Actions:
  - Implementar inicialmente `GET/POST /api/process-modeling/processes`, `GET/POST .../versions`, `GET .../versions/<version_id>`, creación de nodos y transiciones.
  - Mantener el sobre `status`/`data`/`message`, códigos 201/400/404 y manejo de errores sin trazas.
  - Delegar parseo/serialización a la ruta y composición/casos de uso a `process_modeling_service.py`.
  - Cubrir con Flask test client el caso de proceso, versión, cuatro nodos, dos transiciones y lectura determinista.
- Output:
  - API mínima ejecutable con tests que cubren AC-02/AC-03 y parte de AC-08.
- Status: `completed`

### T5. Registrar el blueprint sin regresión — Lote 1
- Owner: `execute-agent`; revisión de no regresión por `execute-agent`.
- Paths previstos:
  - `uc_bib_solv/webapp_java/python-backend/app.py`
  - `uc_bib_solv/webapp_java/python-backend/routes/process_modeling.py`
  - `tests/smoke_test.py` y tests de rutas existentes (solo ajustes estrictamente necesarios y no semánticos)
- Goal: hacer accesible la API nueva manteniendo intactas las rutas legacy.
- Inputs:
  - T4, FR-11 y AC-01/AC-09.
- Actions:
  - Registrar el blueprint nuevo en `create_app()` y actualizar el índice raíz solo para documentar endpoints si corresponde al patrón actual.
  - No mover ni reescribir blueprints `operational`, `causas`, `analysis`, `bootstrap` o `health`.
  - Ejecutar smoke y tests existentes inmediatamente después de la integración.
- Output:
  - Aplicación arrancable con blueprint de modelado y evidencia temprana de no regresión.
- Status: `completed`

### T6. Completar reglas draft, validación y jerarquía — Lote 2
- Owner: `execute-agent`; revisión de dominio/persistencia por `domain-logic` y `data-model-management`.
- Paths previstos:
  - `app/domain/process_modeling/{entities.py,value_objects.py,use_cases.py,validators.py,exceptions.py}`
  - `app/persistence/pm_*.py`
  - `uc_bib_solv/webapp_java/python-backend/services/process_modeling_service.py`
  - `uc_bib_solv/webapp_java/python-backend/routes/process_modeling.py`
  - `tests/unit/`, `tests/integration/`
- Goal: cubrir las reglas funcionales que hacen seguro y extensible el slice.
- Inputs:
  - FR-02, FR-05, FR-07, FR-08, AC-04/AC-05/AC-06/AC-08.
- Actions:
  - Añadir PATCH de metadatos draft, PATCH de nodo, DELETE de transición y endpoint de validación.
  - Rechazar cambios en versiones no draft sin mutación parcial.
  - Implementar validación de campos vacíos, unicidad, tipos, referencias, `subprocess`, auto-transición, cruce de versiones y ciclos jerárquicos.
  - Crear subproceso, breadcrumbs raíz→versión abierta y errores con códigos estables aptos para UI.
  - Añadir tests positivos y negativos, incluyendo rollback y determinismo.
- Output:
  - Backend funcional completo del slice y cobertura de AC-04..AC-06.
- Status: `completed_with_environment_limit`

### T7. Construir frontend JavaScript independiente — Lote 3
- Owner: `execute-agent`; revisión visual/accesibilidad por `frontend-design`.
- Paths previstos:
  - `uc_bib_solv/webapp_java/webapp/js/api/process-modeling.js`
  - `uc_bib_solv/webapp_java/webapp/js/core/process-modeling-state.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/`
  - `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js`
  - `uc_bib_solv/webapp_java/webapp/js/core/router.js`
  - `uc_bib_solv/webapp_java/webapp/js/views/index.js`
  - CSS existente solo si se requiere estilo del nuevo módulo, manteniendo separación.
- Goal: entregar la página `#/modelado-procesos` para explorar y editar el grafo básico sin convertir la UI en fuente de verdad.
- Inputs:
  - FR-09/FR-10, T4/T6, patrones de `webapp/js/api`, `core`, `components` y `views`.
- Actions:
  - Implementar cliente HTTP, estado local y render nativo para listado, selección, versión, nodos, transiciones, inspector y breadcrumbs.
  - Añadir creación/edición de nodos y transiciones, entrada a subproceso, validación y feedback de carga/vacío/error/guardado.
  - Integrar únicamente la ruta hash y el mapa de vistas; no introducir React/JointJS ni lógica industrial en componentes.
  - Mantener los datos del formulario ante errores de validación y representar etiquetas legibles con códigos técnicos preservados.
  - Esta tarea conserva la implementación completada; los cambios nuevos de AMD-003 quedan aislados en T15 y no se duplican aquí.
- Output:
  - Vista aislada, funcional y coherente con el shell actual, con semántica proveniente de API.
- Status: `completed_with_environment_limit`

### T8. Estrategia y cobertura de tests unitarios e integración/API — Lote 1 y ampliación progresiva
- Owner: `execute-agent`; revisión de contratos por `domain-logic`, `data-model-management` y `postgresql-primary-persistence`.
- Paths previstos:
  - `app/domain/process_modeling/tests/`
  - `tests/unit/`
  - `tests/integration/`
  - `tests/fixtures/` o fixtures locales de cada suite si la estructura existente lo requiere
- Goal: establecer desde el primer lote una pirámide de tests que cubra dominio, validadores, casos de uso, servicios, repositorios, API, persistencia y no regresión, ampliándola por fases sin esperar al frontend.
- Inputs:
  - T1..T6, FR-01..FR-08, FR-10/FR-11 y AC-01..AC-09.
- Actions:
  - En el Lote 1, crear tests unitarios de entidades, value objects, validadores y casos de uso mínimos; usar dobles de repositorio y no depender de Flask, red o PostgreSQL.
  - Crear tests unitarios de `process_modeling_service.py` para composición, mapeo de errores y sobre de respuesta sin ejecutar SQL directo.
  - Crear tests de repositorio/integración con PostgreSQL para transacciones, UUID, constraints, orden determinista, persistencia tras cerrar transacción, referencias y aislamiento de tablas `pm_*`.
  - Crear tests API con Flask test client para rutas, 201/400/404, payload `status/data/message`, errores funcionales sin trazas y no mutación tras rechazo.
  - Incorporar progresivamente tests negativos de T6: no-draft, ciclos, referencias entre versiones, tipos no permitidos, `subprocess` y auto-transiciones.
  - Ejecutar, como mínimo cuando la estructura lo permita: `python3 -m unittest discover -s app/domain/process_modeling/tests -p 'test_*.py'`, `python3 -m unittest discover -s tests/unit -p 'test_*.py'`, `python3 -m unittest discover -s tests/integration -p 'test_*.py'` y `python3 tests/smoke_test.py`.
  - Marcar dependencias de PostgreSQL/entorno y separar fallos de infraestructura de fallos funcionales; no debilitar assertions para hacer pasar la suite.
- Exit criteria:
  - El Lote 1 tiene tests unitarios de dominio/validadores/casos de uso y al menos un flujo de repositorio/API que crea y reconstruye el grafo mínimo.
  - Los servicios relevantes tienen cobertura de éxito y error; los tests de integración demuestran commit/rollback y no contaminación legacy.
  - La suite existente de no regresión sigue ejecutable y cada AC cubierto por esta tarea tiene evidencia reproducible.
- Output:
  - Estrategia de tests versionable, suites unitarias e integración/API ejecutables y matriz de resultados por AC.
- Status: `completed_with_environment_limit`

### T9. Setup, generación/extensión y ejecución E2E con Playwright — Lote 3 y ampliación progresiva
- Owner: `execute-agent`; coordinación de setup/ejecución UI por los agentes registrados cuando corresponda; validación final por `programador_humano`.
- Paths previstos:
  - `playwright.config.ts` si no existe una configuración válida
  - `tests/e2e/process-modeling.spec.ts` (o el nombre equivalente de la suite existente)
  - `scripts/` para helpers de ejecución/captura si son necesarios
  - `.playwright-artifacts/test-results/<timestamp>/`
  - `.playwright-artifacts/reports/`
- Goal: validar la UI real de `webapp_java` mediante Playwright y producir evidencia navegable, extendiendo la suite existente si Playwright ya está configurado.
- Inputs:
  - T7/T8/T15, FR-09/FR-10, AC-01/AC-05/AC-06/AC-07/AC-08/AC-09 y AC-17..AC-21.
  - `ui-test-structure`, `ui-log-recovery`, `playwright-dash-webapp` adaptada al target Flask + JavaScript puro.
- Actions:
  - Verificar primero si `playwright.config.*`, scripts npm y estructura `tests/`/`.playwright-artifacts/` ya existen; si existen, extenderlos sin duplicar setup. Si no existen, planificar setup mínimo conforme a `ui-test-structure`, sin instalar dependencias durante esta fase de planificación.
  - Generar o ampliar un spec E2E para navegar a `#/modelado-procesos`, comprobar selector compacto, apertura de dos procesos, breadcrumbs, nodos y transiciones, creación/edición, validación y persistencia tras recarga.
  - Cubrir estados vacío, carga, error y guardado mediante fixtures, datos de prueba aislados o backend controlado; no depender de datos legacy ni de selectores internos de Dash.
  - Adaptar el patrón `playwright-dash-webapp`: usar la URL local/backend Flask real, no iframes Dataiku, no `.dash-select-cell`, no login DSS y no `waitForFunction` específico de `dcc.Loading` salvo que exista un equivalente real en la UI JavaScript.
  - Capturar consola, fallos de red y respuestas HTTP con status >= 400. En modo local recuperar delta y snapshot del log backend si existe `E2E_BACKEND_LOG_PATH`; en modo remoto usar el endpoint/log disponible, siguiendo `ui-log-recovery`.
  - Escribir resultados por AC y artefactos en `.playwright-artifacts/test-results/<timestamp>/` (`summary`, logs, screenshots/traces y reporte HTML cuando aplique), excluyendo artefactos generados de Git.
  - Para AMD-003, comprobar altura global del documento y alcanzabilidad del final sin depender de scroll interno; probar fullscreen nativo cuando esté disponible y fallback cuando no lo esté, incluyendo reversibilidad, foco, teclado y conservación de `version_id`, `node_id`, breadcrumbs y expansión.
  - Ejecutar, cuando el setup esté disponible: `npx playwright test tests/e2e/process-modeling.spec.ts --reporter=list`; conservar también un comando de suite completa documentado por la configuración.
- Exit criteria:
  - El E2E navega a la ruta hash y demuestra los flujos solicitados sin falsos positivos de alerta: las ediciones se verifican tras recarga o nueva consulta.
  - Los estados vacío/error y los errores de validación quedan observables, sin perder datos introducidos.
  - Existe una carpeta de artefactos por ejecución cuando el entorno permite ejecutar Playwright; si no, queda documentada la causa y la cobertura API/unitaria equivalente.
- Output:
  - Suite E2E de webapp-java o extensión de la existente, configuración/commands necesarios y artefactos de evidencia cuando se ejecute.
- Status: `completed`

### T10. Rendimiento, no regresión, higiene y preparación de Gate 3 — Lote 4
- Owner: `execute-agent`; validación final por `programador_humano`.
- Paths previstos:
  - `tests/smoke_test.py`
  - `tests/unit/`, `tests/integration/`, `tests/e2e/`
  - `.playwright-artifacts/` (solo como salida local de ejecución)
  - todos los paths modificados por T1..T16
- Goal: demostrar AC-01..AC-22 con verificaciones repetibles, rendimiento inicial, accesibilidad y no regresión del producto.
- Inputs:
  - Implementación T1..T16, AC-01..AC-22, resultados unitarios/integración/API/Playwright y `README.md`/`context.md`.
- Actions:
  - Ejecutar la suite completa: tests unitarios de dominio/validadores/casos de uso/servicios, tests de repositorio/API/integración, Playwright si está disponible y `python3 tests/smoke_test.py`.
  - Medir la carga del grafo de hasta 100 nodos/200 transiciones en entorno local y registrar resultado frente al límite de 2 segundos excluyendo arranque.
  - Revisar imports del dominio para confirmar ausencia de Flask/psycopg2/PostgreSQL/JS/HTML/infrastructure.
  - Ejecutar tests de causalidad, operational, analysis y health sin alterar sus tablas/contratos.
  - Ejecutar higiene pre-commit (`print(`, `# DEBUG`, `# FIXME`, `breakpoint()` en producción), revisar diff y confirmar que no hay cambios destructivos en tablas existentes.
  - Revisar que el diff de AMD-003 solo afecte presentación/estado UI, CSS y pruebas, sin tablas, endpoints, servicios, dominio, persistencia ni dependencias nuevas.
- Exit criteria:
  - AC-01..AC-22 tienen evidencia o una limitación de entorno explícitamente documentada.
  - No hay regresiones en la suite existente, ni artefactos E2E fuera de `.playwright-artifacts/`, ni NC abierta sin clasificar.
  - Se puede preparar el estado `implementado_pendiente_validacion` sin cerrar automáticamente el requerimiento.
- Output:
  - Evidencia de no regresión y paquete de validación para Gate 3; no cerrar automáticamente el requerimiento.
- Status: `pending`

### T11. Extender dominio para decisión, stock y expansión jerárquica — AMD-002 / Lote 2
- Owner: `execute-agent`; revisión de fronteras por `domain-logic`.
- Paths previstos:
  - `app/domain/process_modeling/entities.py`
  - `app/domain/process_modeling/value_objects.py`
  - `app/domain/process_modeling/interfaces.py`
  - `app/domain/process_modeling/use_cases.py`
  - `app/domain/process_modeling/validators.py`
  - `app/domain/process_modeling/exceptions.py`
  - `app/domain/process_modeling/tests/`
- Goal: incorporar los seis tipos del spec y las invariantes de AMD-002 sin trasladar reglas al frontend ni mutar el proceso padre durante una expansión.
- Inputs:
  - FR-03..FR-07, FR-09/FR-10, AC-11..AC-16 y AMD-002 aprobada en Gate 1.
- Actions:
  - Extender tipos permitidos con `decision` y `stock`; validar `stock.capacity`, `stock.initial_quantity` y `unit`, incluyendo el caso verificable de capacidad/cantidad inicial 24.
  - Validar `output_role` `normal`/`waste` en nodos output y ramas `Sí`/`No` en decisiones, con destinos y unicidad conforme al spec.
  - Modelar la expansión como consulta/contexto inmutable de versión hija: `child_process_id`, breadcrumbs, outputs y continuación padre; no copiar nodos ni escribir en la versión padre.
  - Mantener interfaces extensibles para seleccionar una versión hija concreta y restaurar el contexto desde `version_id`/`node_id` sin introducir semántica de coordenadas.
  - Añadir tests unitarios de entidades, value objects, validadores y casos de uso para decisiones incompletas, stock inválido, outputs y no mutación.
- Output:
  - Dominio AMD-002 aislado y testeable, con errores funcionales estables para API/UI.
- Status: `completed`

### T12. Extender DDL, repositorios y API para el grafo ampliado — AMD-002 / Lote 2
- Owner: `execute-agent`; revisión por `data-model-management` y `postgresql-primary-persistence`.
- Paths previstos:
  - `db/schema.sql`
  - `app/persistence/pm_process_repo.py`
  - `app/persistence/pm_version_repo.py`
  - `app/persistence/pm_node_repo.py`
  - `app/persistence/pm_transition_repo.py`
  - `uc_bib_solv/webapp_java/python-backend/services/process_modeling_service.py`
  - `uc_bib_solv/webapp_java/python-backend/routes/process_modeling.py`
  - `tests/unit/`, `tests/integration/`
- Goal: persistir y servir el modelo AMD-002 con transacciones, orden determinista y consulta expandible, sin modificar tablas ni contratos legacy.
- Inputs:
  - T1..T4/T6/T11, FR-03..FR-08, modelo `pm_*` y AC-11..AC-15.
- Actions:
  - Añadir al modelo persistente los campos estructurales `output_role` y `stock` (`capacity`, `initial_quantity`, `unit`) según el mecanismo idempotente vigente, manteniendo relaciones y tipos fuera de JSONB.
  - Extender mapeos/repositorios para `decision`, `stock`, outputs normal/waste, `child_process_id`, breadcrumbs ordenados, `outputs` y `subprocess_context`.
  - Mantener SQL parametrizado, commit/rollback y consultas de hijo separadas; garantizar que consultar/expandir no inserta ni duplica filas en el padre.
  - Extender el servicio y adaptadores HTTP existentes con los contratos necesarios para consultar versión hija, expansión, contracción y restauración por identificadores, sin inventar rutas fuera del spec.
  - Añadir tests PostgreSQL de persistencia/recarga, referencias padre-hijo, ramas `Sí`/`No`, stock 24, outputs y no mutación del padre; añadir tests API de errores y sobre JSON.
- Output:
  - DDL/repositorios/servicio/API capaces de reconstruir el grafo padre+hijo y el contexto de expansión.
- Status: `completed`

### T13. Implementar UI BPM, expansión inline y restauración por hash/URL — AMD-002 / Lote 3
- Owner: `execute-agent`; revisión visual y de interacción por `frontend-design`.
- Paths previstos:
  - `uc_bib_solv/webapp_java/webapp/js/api/process-modeling.js`
  - `uc_bib_solv/webapp_java/webapp/js/core/process-modeling-state.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/`
  - `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js`
  - `uc_bib_solv/webapp_java/webapp/js/core/router.js`
  - `uc_bib_solv/webapp_java/webapp/js/views/index.js`
  - CSS del módulo únicamente si es necesario para las formas BPM.
- Goal: permitir crear, consultar, expandir, contraer y recargar el grafo AMD-002 con una UI JavaScript operable sin depender exclusivamente del dibujo.
- Inputs:
  - T7/T11/T12, FR-05/FR-06/FR-09/FR-10, AC-11/AC-14/AC-15/AC-16.
- Actions:
  - Renderizar tarjetas BPM diferenciadas: rombo para `decision`, doble rombo para `stock`, contorno expandible para `subprocess`, conectores visibles y lista accesible de transiciones.
  - Mostrar ramas `Sí`/`No`, stock 24, outputs normal/waste y contexto de continuación sin convertir etiquetas o estilos en fuente semántica.
  - Expandir inline el hijo dentro del lienzo padre, conservar contexto, mostrar breadcrumb `Proceso padre > Operación 1`, ofrecer `Contraer`/volver al padre y restaurar mediante `version_id`/`node_id` en hash/URL.
  - Tras recarga, volver a consultar PostgreSQL mediante API y reconstruir la misma expansión; al contraer no enviar escrituras al padre.
  - Mantener estados loading, vacío, error y guardado, y conservar los datos introducidos ante errores de validación.
- Output:
  - Vista BPM integrada y navegable con expansión/restauración verificable.
- Status: `completed`

### T14. Tests AMD-002 de dominio, PostgreSQL/API y Playwright real — Lotes 2–4
- Owner: `execute-agent`; coordinación E2E por `ui-validation-orchestrator`, `ui-test-generation-agent`, `ui-test-execution-agent` y `ui-log-recovery-agent` cuando aplique.
- Paths previstos:
  - `app/domain/process_modeling/tests/`
  - `tests/unit/`
  - `tests/integration/`
  - `tests/e2e/process-modeling.spec.ts` o extensión equivalente de la suite existente
  - `playwright.config.*`, `scripts/` solo si faltan setup/helpers
  - `.playwright-artifacts/test-results/<timestamp>/` y `.playwright-artifacts/reports/`
- Goal: verificar de forma progresiva AC-11..AC-16 con tests unitarios, integración PostgreSQL/API y Playwright contra la webapp real.
- Inputs:
  - T11/T12/T13, AC-11..AC-16, `ui-test-structure`, `ui-log-recovery` y `playwright-dash-webapp` adaptada a Flask + JavaScript puro.
- Actions:
  - Unit tests: validar tipos `decision`/`stock`, stock 24, ramas, output roles, breadcrumbs, expansión inmutable y restauración de contexto en casos de uso/validadores/servicios.
  - Integration/API tests: crear padre+hijo y `subprocess`, consultar/expandir sin duplicados, persistir stock 24, decision Sí/No, outputs normal/waste, recargar y comprobar padre sin mutación; cubrir 400/404 y rollback.
  - Playwright real: navegar a `#/modelado-procesos`, listar procesos, abrir versión, crear/consultar el flujo `input → operation 1.1 → operation 1.2 → stock(24) → decision`, renderizar formas/conectores, expandir subprocess, verificar breadcrumbs, contraer, recargar con hash/URL y confirmar restauración.
  - Cubrir estados vacío/error/loading y una validación negativa visible; verificar ediciones mediante recarga/consulta posterior, no solo por mensajes de éxito.
  - Registrar consola, fallos de red, respuestas >=400, screenshots/traces y resultados por AC en `.playwright-artifacts/test-results/<timestamp>/`; recuperar logs backend local/remoto según `ui-log-recovery` cuando estén disponibles.
  - Ejecutar comandos mínimos: `python3 -m unittest discover -s app/domain/process_modeling/tests -p 'test_*.py'`, `python3 -m unittest discover -s tests/unit -p 'test_*.py'`, `python3 -m unittest discover -s tests/integration -p 'test_*.py'` y, con Playwright configurado, `npx playwright test tests/e2e/process-modeling.spec.ts --reporter=list`.
- Exit criteria:
  - AC-11..AC-16 tienen evidencia de unit, integración/API y E2E o una limitación de entorno explícita y reproducible.
  - La expansión se restaura desde API/PG, la contracción no muta el padre y el flujo de decisión/stock/outputs se reconstruye sin coordenadas.
  - Los artefactos UI se guardan en la ubicación normativa y no se introducen patrones Dash incompatibles con `webapp_java`.
- Output:
  - Matriz de resultados AMD-002, tests ejecutables y artefactos Playwright/logs cuando el entorno permita la ejecución.
- Status: `completed_with_environment_limit`

### T15. Integrar AMD-003 en shell/editor y pruebas de accesibilidad — AMD-003 / Lote 3
- Owner: `execute-agent`; revisión visual y de accesibilidad por `frontend-design` y `web-design-guidelines`.
- Paths previstos:
  - `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js`
  - `uc_bib_solv/webapp_java/webapp/js/core/process-modeling-state.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/` únicamente si el control de flujo lo requiere
  - `uc_bib_solv/webapp_java/webapp/css/app.css` o la hoja CSS existente que ya gobierne `.pm-*`
  - `uc_bib_solv/webapp_java/webapp/js/core/router.js` y `uc_bib_solv/webapp_java/webapp/js/views/index.js` solo para verificar que no se rompe la integración; no se prevén cambios de ruta
  - `tests/e2e/process-modeling.spec.js` o la suite equivalente existente
- Goal: implementar exclusivamente la presentación y el estado UI descritos por AMD-003, preservando la selección, el contexto del editor y todos los contratos existentes.
- Inputs:
  - `spec.md` AMD-003, AC-17..AC-21, T7/T13, contexto codebase-memory y Engram.
  - `shell()` con el `<aside>` actual, `editor()`/`processOptions()`, `createProcessModelingState()`, API JS existente, router/mapa de vistas y CSS `.pm-*` existente.
- Actions:
  - Retirar visualmente el panel izquierdo de catálogo y renderizar un `<label>`/`<select>` compacto dentro del shell/editor, alimentado por `state.processes`, conservando `state.selectedProcess`, apertura de versión y restauración hash cuando exista contexto.
  - Asegurar scroll vertical del documento (`html`/`body`/shell/editor y contenedores del modelado) sin `overflow-y: hidden` que oculte contenido esencial ni exigir un viewport BPM con scroll interno para alcanzar formularios, mensajes o `.pm-transitions`; revisar reglas CSS existentes antes de añadir reglas nuevas.
  - Añadir acción accesible `Pantalla completa`/`Salir de pantalla completa` para la zona de flujo. Intentar Fullscreen API solo cuando la capacidad/autorización exista; ante ausencia o rechazo, activar fallback reversible que oculte paneles secundarios no esenciales y maximice visualmente el flujo, sin librerías ni cambios de API.
  - Mantener durante entrada/salida nativa o fallback `version_id`, `node_id`, breadcrumbs, expansión y datos de edición; exponer nombre, estado (`aria-expanded` o equivalente), foco visible, orden de teclado y retorno de foco.
  - Añadir/ajustar pruebas UI para dos procesos, scroll global, fullscreen nativo/fallback, reversibilidad, accesibilidad y ausencia de cambios backend/domain. No duplicar pruebas ya cubiertas por T14; extender la suite existente.
- Output:
  - UI AMD-003 implementada en los módulos existentes, CSS localizado y pruebas E2E reproducibles con evidencia por AC-17..AC-21.
- Status: `completed`

### Evidencia de implementación — T15 / AMD-003 — 2026-07-20
- Se retiró el `<aside>` de catálogo y se conservó la selección con `#pm-process-selector`, alimentado por `state.processes` y sincronizado con `state.selectedProcess`; la apertura sigue usando `getProcess`/`getVersion` y conserva el hash, breadcrumbs, expansión y datos de edición.
- Se añadió `Pantalla completa`/`Salir de pantalla completa` con Fullscreen API condicionada a capacidad/autorización; ante ausencia o rechazo se activa `.is-pm-focus-mode`, reversible y sin dependencias. El control expone nombre accesible, `aria-expanded`, foco visible, teclado y retorno de foco.
- Se eliminó el límite vertical del viewport BPM y el `overflow-y: hidden`; el canvas conserva únicamente el overflow horizontal necesario, dejando formularios, mensajes y `.pm-transitions` dentro del scroll del documento.
- Se extendió `tests/e2e/process-modeling.spec.js` para AC-17..AC-20: ausencia de `<aside>`, selección de dos procesos, scroll global, fallback fullscreen, reversibilidad, foco y estado accesible. AC-21 se verificó mediante revisión de cambios limitada a UI/estado/CSS/tests.
- Verificación: `UI_TEST_BASE_URL=http://127.0.0.1:8051 bash scripts/run_ui_tests.sh tests/e2e/process-modeling.spec.js --reporter=list` → 10/10 passed; dominio 8/8; unitarios 44/44; `node --check` de módulos UI y E2E → OK.
- Limitación: el primer intento directo contra `127.0.0.1:8051` falló con `ERR_CONNECTION_REFUSED`; se arrancó el servidor mediante `scripts/run_ui_tests.sh` y la suite completa pasó. Se generaron artefactos bajo `.playwright-artifacts/test-results/`.
- Estado: `implementado_pendiente_validacion`; Gate 3 permanece `pending`, no se marca `done`.

### T16. Corregir scroll interno coordinado y conservar fullscreen — AMD-004 / NC-001 / Lote 3
- Owner: `execute-agent`; revisión visual, de accesibilidad y E2E por `frontend-design`, `web-design-guidelines` y los agentes UI registrados cuando aplique.
- Paths previstos:
  - `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/graph.js`
  - `uc_bib_solv/webapp_java/webapp/css/app.css`
  - `tests/e2e/process-modeling.spec.js` o extensión equivalente de la suite existente
  - `.playwright-artifacts/test-results/<timestamp>/` como salida de ejecución, no como fuente de cambios
- Goal: corregir NC-001 incorporando AMD-004 sin cambiar backend, dominio, API, persistencia, semántica ni dependencias, manteniendo la UI AMD-003 ya implementada.
- Inputs:
  - `spec.md` AMD-004, AC-18/AC-19/AC-22, T15, historial de NC-001 y estado actual de `.pm-flow-scroll`, `pm-fullscreen-root`, `state.fullscreen`, `state.fullscreenMode` y `state.expansionStack`.
- Actions:
  - En modo no pantalla completa, asegurar que `.pm-flow-scroll` tenga scroll vertical y horizontal interno (`overflow-y: auto; overflow-x: auto`) con altura computada entre 220 px y `min(70vh, 720px)` según viewport, sin eliminar el scroll vertical global de `html`/`body`/página.
  - En fullscreen nativo y fallback, conservar el mismo viewport desplazable y permitir ambos ejes mientras el modo permanece activo; no reemplazarlo por un overflow oculto ni trasladar el scroll al documento como única vía.
  - Mantener `version_id`, `node_id`, breadcrumbs, `expansionStack`, proceso seleccionado, foco del control fullscreen y estado reversible durante scroll, expansión/contracción y entrada/salida de fullscreen; desplazar no debe emitir peticiones API ni mutaciones de dominio.
  - Resolver la interacción con la corrección de NC-001: no reintroducir la desaparición inicial del flujo, la anchura de layout antigua de formularios ni la salida de fullscreen al expandir/contraer. Conservar los fixes ya aplicados y extenderlos solo donde el viewport coordinado lo requiera.
  - Añadir o ampliar pruebas Playwright para fixture con overflow en ambos ejes, modo normal, fullscreen nativo o fallback, scroll global simultáneo, conservación de contexto/foco y ausencia de requests API por desplazamiento. Mantener AC-17..AC-21 y no duplicar la cobertura ya completada por T15.
- Output:
  - Scroll interno vertical/horizontal funcional en modo normal y fullscreen/fallback, scroll global conservado, pruebas E2E reproducibles y evidencia de corrección de NC-001 pendiente de validación Gate 3.
- Status: `completed`

### Evidencia de implementación — T16 / AMD-004 + NC-001 — 2026-07-20
- `.pm-flow-scroll` conserva el scroll global de la página y ahora usa límites internos accesibles en ambos ejes: `overflow-x:auto`, `overflow-y:auto`, altura entre 220 px y `min(70vh, 720px)`, scrollbar visible y foco visible.
- El mismo viewport interno permanece usable en fallback y dentro de `pm-fullscreen-root:fullscreen`; expandir/contraer subprocesos mantiene `state.fullscreen`, el modo visual, el hash/contexto, breadcrumbs, expansión y el foco del control de fullscreen.
- `renderEditorHtml` conserva la posición interna disponible al reemplazar el contenido del editor, evitando que el rerender de expansión/contracción desplace el viewport de forma arbitraria.
- Se añadió un E2E específico con fixture de lienzo grande para verificar scroll vertical/horizontal en modo normal y fallback fullscreen, scroll global simultáneo, ausencia de requests API por desplazar, conservación de hash y expandir/contraer sin salir de fullscreen. La regresión NC-001 mantiene el flujo inicial visible y los formularios full-width.
- Verificación: `node --check` de `process-modeling.js`, `graph.js` y `process-modeling.spec.js` → OK; dominio 8/8; unitarios 44/44; E2E focal T16/AMD-004 → 1/1 passed; regresión AMD-003/NC-001 → 1/1 passed.
- Limitación: el primer intento directo sin servidor disponible produjo `ERR_CONNECTION_REFUSED`; las ejecuciones válidas se realizaron arrancando el entorno con `scripts/run_ui_tests.sh`, generando artefactos timestampados en `.playwright-artifacts/test-results/`.
- Estado: `implementado_pendiente_validacion`; Gate 3 permanece `pending`; NC-001 continúa `in_correction` y no se marca `resolved` ni `done`.

---

### T17. Separar modelo semántico, medición y layout puro — AMD-005 / Lote 3
- Owner: `execute-agent`; revisión de fronteras por `webapp-architecture`, `frontend-design` y `domain-logic`.
- Paths previstos:
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/graph.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/layout.js` o módulo equivalente dentro de la carpeta existente
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/measurement.js` o módulo equivalente si la separación lo requiere
  - `uc_bib_solv/webapp_java/webapp/js/core/process-modeling-state.js`
- Goal: convertir el layout en una proyección pura y determinista del JSON semántico, sin persistir coordenadas ni alterar relaciones.
- Inputs: `spec.md` AMD-005, FR-12, AC-23/AC-24/AC-25/AC-27/AC-29, nodos/transiciones existentes y módulos actuales.
- Actions:
  - Definir una entrada de layout con nodos, transiciones, dimensiones efectivas, opciones y viewport; conservar tipos, origen, destino, orden y pertenencia a rama sin reordenar, fusionar, duplicar ni inventar flujos.
  - Medir tarjetas, etiquetas, puertos y contenedores después de estilos y fuentes; agrupar lecturas DOM y escrituras DOM por fases, evitando lecturas de layout durante la construcción del render.
  - Implementar pipeline por capas: medición, profundidad, anchura de subárbol/lane, colocación centrada y bounding box del canvas; la adopción de ELK/elkjs solo podrá ocurrir tras justificar bundle, licencia, rendimiento y compatibilidad.
  - Invalidar el cálculo en expansión, contracción, resize, cambio de contenido, fuentes y restauración de hash; actualizar de forma atómica estado, canvas y rutas.
- Output: calculador testeable sin DOM, contrato de medición y coordinación de invalidación documentada en el módulo.
- Status: `completed`

### T18. Colocar ramas anidadas y evitar solapes — AMD-005 / Lote 3
- Owner: `execute-agent`; revisión visual por `frontend-design`.
- Paths previstos:
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/layout.js` o equivalente
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/lanes.js` o equivalente
  - `uc_bib_solv/webapp_java/webapp/css/app.css`
- Goal: producir la composición aprobada para cadenas verticales, ramas múltiples y bifurcaciones aguas abajo.
- Inputs: T17, AC-23/AC-25, imágenes aprobadas `bpm-layout-flujo-centrado.png`, `bpm-layout-expansion-recalculada.png` y `bpm-layout-multiples-ramas-aguas-abajo.png`.
- Actions:
  - Centrar cadenas verticales por el centro de su lane con tolerancia máxima de 1 px.
  - Reservar un lane exclusivo por rama; calcular su anchura con el máximo de nodos descendientes, etiquetas y márgenes, desplazando lanes adyacentes para que ninguna rama se renderice físicamente debajo de otra a la que no pertenece.
  - Recalcular ancestros, descendientes y bounding box al expandir/contraer subprocesos; eliminar el espacio reservado al contraer y mantener el flujo padre en el mismo lienzo.
  - Verificar bounding boxes, etiquetas largas, márgenes, canvas y conectores incidentes antes de pintar; no ocultar solapes mediante `overflow` o z-index.
- Output: posiciones y dimensiones de nodos/lanes sin intersecciones para fixtures heterogéneos y multinivel.
- Status: `completed`

### T19. Simplificar y enrutar conectores semánticos — AMD-005 / Lote 3
- Owner: `execute-agent`; revisión de accesibilidad y UI por `web-design-guidelines` y `frontend-design`.
- Paths previstos:
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/graph.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/connectors.js` o equivalente
  - `uc_bib_solv/webapp_java/webapp/css/app.css`
- Goal: hacer legibles las uniones y retirar líneas visuales que aportan ruido sin perder transiciones.
- Inputs: T17/T18, AC-26 y AC-29, contrato actual `nodes`/`transitions`.
- Actions:
  - Dibujar exactamente un elemento visual por transición semántica visible, con origen, destino, flecha y etiqueta identificables.
  - Usar routing ortogonal/polilínea de cuatro segmentos como máximo salvo excepción registrada; evitar cruces de nodos no incidentes, diagonales decorativas, duplicados por breadcrumbs y líneas auxiliares equivalentes.
  - Mantener cardinalidad y orden semántico aunque se reduzca el ruido visual; exponer todas las transiciones en la lista accesible.
  - Aplicar foco, contraste y estados hover/focus sin convertir las líneas en la única forma de entender el flujo.
- Output: SVG/rutas limpias, una por transición, con lista alternativa completa.
- Status: `completed`

### T20. Integrar expansión, resize y accesibilidad del relayout — AMD-005 / Lote 3
- Owner: `execute-agent`; revisión por `web-design-guidelines` y `ui-test-structure`.
- Paths previstos:
  - `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js`
  - `uc_bib_solv/webapp_java/webapp/js/core/process-modeling-state.js`
  - `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/`
  - `tests/e2e/process-modeling.spec.js`
- Goal: conectar el calculador con la interacción real sin perder estado, foco, scroll ni deep-link.
- Inputs: T17–T19, AC-24/AC-28, AMD-003/AMD-004 y estado actual de fullscreen, expansión y hash.
- Actions:
  - Ejecutar el relayout después de expandir/contraer, cambios de tamaño, fuentes, resize y restauración URL/hash, conservando `version_id`, `node_id`, breadcrumbs, expansion stack y modo fullscreen/fallback.
  - Hacer operables por teclado todos los nodos y controles Expandir/Contraer, con foco visible, retorno al nodo expandido y lista accesible con origen/destino/etiqueta.
  - Mantener scroll global e interno coordinados y evitar requests API o mutaciones semánticas causadas por desplazamiento o cálculo geométrico.
  - Añadir fixtures de varias ramas, bifurcaciones aguas abajo, etiquetas largas y expansión anidada; reutilizar la suite Playwright y artefactos bajo `.playwright-artifacts/`.
- Output: integración UI funcional y accesible, con evidencia de expansión, contracción, foco, ramas y fullscreen.
- Status: `completed`

### T21. Verificar AMD-005, no regresión y preparar Gate 3 — Lote 4
- Owner: `execute-agent`; coordinación UI por `ui-validation-orchestrator` cuando aplique; validación final por `programador_humano`.
- Paths previstos:
  - `tests/unit/` y `tests/fixtures/`
  - `tests/e2e/process-modeling.spec.js`
  - `tests/integration/` y `tests/smoke_test.py`
  - `.playwright-artifacts/test-results/<timestamp>/`
- Goal: demostrar AC-23–AC-29 y dejar el requerimiento en `implementado_pendiente_validacion`, nunca en `done` automáticamente.
- Inputs: T17–T20, suites existentes y `ui-test-structure`/`ui-log-recovery`.
- Actions:
  - Ejecutar tests puros con dimensiones sintéticas; tests DOM/SVG en Chromium para bounding boxes, lanes, segmentos y cardinalidad de edges; y E2E para expansión, contracción, ramas anidadas, foco, scroll y fullscreen.
  - Ejecutar fixture de 100 nodos/150 transiciones y medir cálculo por debajo de 500 ms en Chromium local; si falla, evaluar lotes/Web Worker conforme al spec y registrar la decisión.
  - Ejecutar suites API, dominio, persistencia y smoke existentes; confirmar que no cambian endpoints, tablas `pm_*`, JSON semántico, reglas causales ni persistencia geométrica.
  - Generar matriz de resultados por AC, capturar consola/red/logs disponibles y clasificar cada fallo como `spec`, `task_plan` o `implementation`.
- Output: evidencia reproducible, matriz AC-23–AC-29, reporte de riesgos/limitaciones y paquete para Gate 3.
- Status: `completed_with_environment_limit`

## Acceptance Criteria Traceability

| AC | Covered by | Evidence expected |
| --- | --- | --- |
| AC-01 | T5, T9, T10 | Arranque, blueprint/vista registradas, smoke previo y suite de no regresión verdes. |
| AC-02 | T1, T3, T4, T8, T10 | Tests unitarios/integración/API de proceso y versión tras cierre de transacción. |
| AC-03 | T2, T3, T4, T8, T9 | Cuatro nodos, dos transiciones y GET determinista reconstruible sin coordenadas. |
| AC-04 | T6, T8, T9 | Tests API de edición draft/bloqueo y E2E de edición verificada tras recarga. |
| AC-05 | T6, T8, T9 | Tests de jerarquía/ciclos y E2E de breadcrumbs/subproceso. |
| AC-06 | T6, T8, T9 | Tests de errores API y E2E de validación sin pérdida de formulario. |
| AC-07 | T7, T9, T10 | Playwright de ruta, listado, versión, nodos, creación/edición y estados vacío/error. |
| AC-08 | T2, T4, T6, T8, T9, T10 | Tests de sobre/códigos HTTP, determinismo, imports, modularidad y no regresión. |
| AC-09 | T5, T8, T9, T10 | Tests de regresión backend y E2E/artefactos UI sin alterar módulos legacy. |
| AC-10 | T2, T6, T7, T9, T10 | Tests de dominio/UI y revisión de extensibilidad sin semántica basada en coordenadas. |
| AC-11 | T11, T12, T13, T14 | Integración padre/hijo, expansión inline, breadcrumbs, `Contraer` y contexto sin duplicación. |
| AC-12 | T11, T12, T14 | Unit/integration/API de decisión incompleta y ramas `Sí`/`No` en JSON/UI accesible. |
| AC-13 | T11, T12, T14 | Unit/integration/API y E2E de `stock.capacity=24`, `initial_quantity=24`, `unit`. |
| AC-14 | T11, T12, T13, T14 | Flujo persistido, outputs normal/waste y contexto de continuación del subproceso. |
| AC-15 | T12, T13, T14 | Recarga por `version_id`/`node_id`, restauración y comprobación de no mutación del padre. |
| AC-16 | T13, T14, T10 | Formas BPM, conectores, lista accesible, loading/vacío/error y navegación operable. |
| AC-17 | T15, T9, T10 | No existe `<aside>`/catálogo lateral; selector compacto permite seleccionar al menos dos procesos y actualiza proceso/grafo mediante la API existente. |
| AC-18 | T15, T16, T9, T10 | Scroll vertical global del documento y `.pm-flow-scroll` interno vertical/horizontal en modo normal, con contenido final alcanzable y sin ocultación vertical. |
| AC-19 | T15, T16, T9, T10 | Fullscreen nativo/fallback reversible conserva el viewport interno en ambos ejes, el modo activo, estado accesible, versión, nodo, breadcrumbs y expansión. |
| AC-20 | T15, T9, T10 | Selector y controles de fullscreen con nombre accesible, foco visible, teclado, estado expuesto y retorno de foco. |
| AC-21 | T15, T16, T10, T8 | Diff y tests confirman que AMD-003/AMD-004 solo tocan presentación/estado UI/CSS/pruebas, sin backend, dominio, API, persistencia o dependencias nuevas. |
| AC-22 | T16, T9, T10 | Fixture con lienzo mayor que el viewport permite scroll interno vertical/horizontal en normal y fullscreen/fallback, conserva contexto/foco y no genera requests ni mutaciones. |
| AC-23 | T17, T18, T19, T21 | Tests puros y DOM/SVG demuestran ausencia de intersecciones, etiquetas dentro del canvas y conectores sin atravesar nodos no incidentes. |
| AC-24 | T17, T18, T20, T21 | E2E de expansión/contracción verifica crecimiento y liberación del espacio, desplazamiento de descendientes y determinismo dentro de 1 px. |
| AC-25 | T17, T18, T21 | Fixture de cadena vertical y ramas de anchuras distintas verifica centrado, lanes no solapados y reserva por máximo de subárbol. |
| AC-26 | T19, T20, T21 | Tests de cardinalidad y routing verifican una representación por transición, máximo de 4 segmentos salvo excepción y lista accesible completa. |
| AC-27 | T17, T21 | Tests con JSON/viewport/fuentes controlados verifican determinismo dentro de 1 px y fixture de 100 nodos/150 transiciones bajo 500 ms o decisión Web Worker/lotes registrada. |
| AC-28 | T20, T21 | Playwright y revisión manual verifican teclado, foco visible, Expandir/Contraer, retorno al nodo y alternativa origen/destino/etiqueta. |
| AC-29 | T17, T19, T20, T21 | Diff y suites API/dominio/persistencia/smoke confirman que no cambian endpoints, tablas, JSON, reglas causales ni relaciones; no se persiste geometría. |

---

## Verification Plan

### Automatic / Command-Line Verification
- Gate 1: evidencia de aprobación humana registrada en este plan.
- Lote 1: `python3 -m unittest discover -s app/domain/process_modeling/tests -p 'test_*.py'`, `python3 -m unittest discover -s tests/unit -p 'test_*.py'`, `python3 -m unittest discover -s tests/integration -p 'test_*.py'`, Flask test client y `python3 tests/smoke_test.py` para AC-02/AC-03 y primer baseline.
- Lote 2: tests negativos de validación, rollback, bloqueo no-draft, ciclos, referencias cruzadas y contratos 400/404.
- AMD-002: tests unitarios de decisión/stock/outputs/expansión; integración PostgreSQL/API de padre+hijo, stock 24, ramas y no mutación; y Playwright real de creación, consulta, expansión, contraer, recarga y render BPM para AC-11..AC-16.
- AMD-003: Playwright/UI de selección de al menos dos procesos sin `<aside>`, scroll global y alcanzabilidad del contenido, fullscreen nativo/fallback reversible, conservación del contexto y accesibilidad de selector/acciones; no se requieren cambios de tests unitarios, integración, API o persistencia.
- AMD-004/NC-001: Playwright/UI sobre fixture con overflow vertical y horizontal para `.pm-flow-scroll` en modo normal y fullscreen/fallback; verificar scroll global simultáneo, `scrollTop`/`scrollLeft`, conservación de hash/contexto/foco y ausencia de requests API durante desplazamiento.
- AMD-005: tests puros de `layout` con JSON y dimensiones sintéticas; tests DOM/SVG en Chromium para bounding boxes, lanes, etiquetas, cardinalidad de edges y segmentos; E2E para expansión/contracción, ramas anidadas, foco, scroll y fullscreen. Usar lecturas/escrituras DOM agrupadas y no medir durante el render.
- AMD-005 rendimiento: fixture controlado de 100 nodos/150 transiciones con umbral de 500 ms; si no se cumple, evaluar lotes/Web Worker y documentar la decisión sin degradar la precisión geométrica.
- Lote 3: `npx playwright test tests/e2e/process-modeling.spec.ts --reporter=list` si existe configuración válida; si no, setup/extensión conforme a `ui-test-structure`, con URL Flask/local y sin patrones Dash no aplicables.
- Lote 3/4: cada ejecución UI escribe evidencias en `.playwright-artifacts/test-results/<timestamp>/`; `ui-log-recovery` captura consola, fallos de red, respuestas >=400 y logs backend disponibles.
- Rendimiento local del grafo de 100 nodos/200 transiciones con umbral de 2 segundos, excluyendo arranque.
- Suite existente: tests unitarios, repositorio/API/integración, Playwright y cualquier comando documentado por la configuración real del proyecto.
- Higiene: búsqueda de `print(`, `# DEBUG`, `# FIXME`, `breakpoint()` en producción y revisión de imports prohibidos del dominio.

### Manual Verification
- Gate 2: revisar que cada tarea tenga owner/path/output, que el Lote 1 sea ejecutable de forma independiente y que los lotes posteriores no amplíen el spec.
- Gate 3: navegar manualmente a `#/modelado-procesos`, listar/abrir una versión, entrar en breadcrumbs, crear/editar y validar un grafo; comprobar feedback de carga, vacío, error y guardado.
- AMD-002: abrir el flujo padre/hijo, expandir inline, comprobar `Proceso padre > Operación 1`, contraer, recargar con hash/URL y verificar que el padre no cambia.
- AMD-003: comprobar visualmente que no existe catálogo lateral, seleccionar dos procesos desde el selector compacto, hacer scroll hasta el final del documento, activar/desactivar fullscreen nativo o fallback y verificar que el foco/contexto/expansión se conservan.
- AMD-003: ejecutar revisión de accesibilidad de controles con teclado, foco visible, nombre accesible y estado de fullscreen; confirmar que el diff no contiene cambios de backend/domain/API/persistencia.
- AMD-004: comprobar manualmente que el viewport de flujo sigue siendo usable en ambos ejes fuera y dentro de fullscreen, que la página conserva su scroll global y que expandir/contraer no saca al usuario del modo fullscreen ni pierde contexto.
- AMD-005: comparar las tres imágenes aprobadas con fixtures de flujo vertical, expansión y ramas múltiples aguas abajo; comprobar que cada transición visible corresponde al origen/destino/tipo/orden semántico y que ninguna rama queda físicamente bajo otra.
- AMD-005: revisar teclado, foco visible, nombres accesibles, lista alternativa completa, etiquetas largas, estados de carga/vacío/error y ausencia de líneas auxiliares redundantes.
- Confirmar que el árbol causal y las páginas legacy conservan su comportamiento y que no se reutilizan sus tablas semánticamente.
- Confirmar que no se aprueba `done` por el mero hecho de que los agentes terminen: requiere validación humana explícita.

---

## Non-Conformity Loop

### Policy
- Si la validación final detecta una no conformidad, no cambiar el estado global a `done`.
- Clasificar la causa raíz como:
  - `spec`
  - `task_plan`
  - `implementation`
- Registrar cada NC con identificador y estado en `nc-log.md` siguiendo el agente registrado `nc-resolution-agent`.
- Reabrir el flujo según causa:
  - `spec` -> actualizar `spec.md`, volver a Gate 1 y regenerar/ajustar este plan.
  - `task_plan` -> corregir este `task_plan.md` y volver a Gate 2.
  - `implementation` -> corregir la implementación con `execute-agent` y repetir Gate 3.
- Cualquier NC `open` o `in_correction` bloquea `done`. Tras dos intentos de corrección, escalar obligatoriamente al programador humano según el workflow.

### Open Non-Conformities
- **NC-001** (`implementation`, `in_correction`, 2026-07-20): la validación humana detectó que el flujo no aparece en la renderización inicial, los subformularios de nuevo nodo/transición permanecen en una zona de layout antigua en vez de ocupar anchura completa y contraer/expandir provoca la salida de fullscreen. Reentrada: `execute-agent`, intento 1 de 2; T16 integra AMD-004 en la misma corrección. Corrección previa aplicada en `process-modeling.js`, `app.css` y `tests/e2e/process-modeling.spec.js`; `node --check`, dominio 8/8, unitarios 44/44 y E2E focalizado AMD-003 1/1 passed. Debe conservar AC-17..AC-21 y añadir AC-22; permanece `open/in_correction`, pendiente validación humana Gate 3, y no se marca `resolved`.
- **NC-002** (`implementation`, `in_correction`, 2026-07-27): Playwright observó inicialmente una diferencia horizontal de 7 px entre `STOCK_MEZCLAS` y `FAB_MEZCLA`, incumpliendo AC-25 `<1 px`. La corrección de `execute-agent` produjo 0 px en el run `2026-07-27T10-10-44`, pero NC-002 permanece abierta hasta validación humana Gate 3. Evidencia: `.playwright-artifacts/test-results/2026-07-27T09-59-14/summary.json`, `.playwright-artifacts/test-results/2026-07-27T10-10-44/summary.json` y sus informes.
- **NC-003** (`implementation`, `in_correction`, 2026-07-27): el test `fixture jerárquico permite expandir OP1.1, OP2 y OP3` falla al expandir `OP3`: el subárbol de `OP2` intercepta el clic, el botón se desprende del DOM y vence el timeout. El spec y T18/T20/T21 exigen expansión independiente y relayout sin solapes. Reentrada: `execute-agent`, intento 1 de 2. Evidencia: `.playwright-artifacts/test-results/2026-07-27T10-10-44/summary.json`, `analysis-report.md` y la carpeta de artefactos del fallo. No se marca `resolved`; requiere corrección y nueva validación `validate-implementation`.

---

## Risks
- El spec y `context.md` reflejan stacks distintos; el plan fija Flask + JavaScript puro como target explícito del spec y evita copiar arquitectura Dash.
- El mecanismo de migraciones no está confirmado; T1 debe inspeccionarlo antes de materializar DDL, sin modificar tablas existentes de forma destructiva.
- La disponibilidad de PostgreSQL, servidor web y navegador puede impedir el smoke UI; se debe separar fallo de entorno de fallo funcional y conservar tests API/unitarios.
- La integración en `app.py`, router y mapa de vistas puede introducir regresiones; T5 y T9 exigen smoke y suite legacy antes de avanzar.
- Ciclos jerárquicos y referencias entre versiones pueden producir persistencia parcial si no se transaccionan; T3/T6 deben verificar rollback y constraints.
- El renderer nativo puede quedarse corto a escala futura; no es riesgo bloqueante del slice mientras la semántica permanezca fuera de coordenadas y se cumpla el límite inicial.
- Fullscreen nativo depende de permisos y capacidades del navegador; T15 exige fallback reversible y separa limitación de entorno de fallo funcional.
- Las reglas CSS existentes pueden introducir scroll interno u ocultar contenido; T15 debe inspeccionar `.pm-*`, `html`, `body` y contenedores antes de ajustar, sin inventar una nueva capa de scroll.
- La coordinación de dos scrolls puede provocar que el documento o el viewport capturen el eje equivocado; T16 debe verificar ambos ejes en modo normal y fullscreen/fallback y conservar el foco sin cambiar el hash.
- La corrección de NC-001 sigue abierta: T16 debe integrarse en el intento de corrección actual, conservar su historial y no declararla `resolved` antes de Gate 3.
- El esquema existente contiene tablas de nombres parecidos; prefijo `pm_`, repositorios separados y revisión de diff deben impedir contaminación semántica.
- La medición de tamaños reales puede variar por fuentes, zoom o navegador; fijar viewport/fuentes en pruebas, medir tras estilos y mantener tolerancia de 1 px.
- NC-002 confirma una desviación integrada de centrado: el test unitario de layout pasa, pero el DOM renderizado presenta 7 px. La corrección debe verificar la geometría final en navegador, no solo el cálculo puro.
- NC-003 evidencia una interferencia de interacción durante expansión anidada: el relayout debe actualizar posiciones y hit-testing de los controles antes de que se intente expandir la siguiente rama.
- La complejidad de ramas anidadas puede producir cruces o lanes insuficientes; validar subárboles anchos antes de pintar y bloquear la entrega si falla AC-23/AC-25.
- El routing ortogonal puede añadir ruido o aumentar el lienzo; limitar segmentos, preservar la lista accesible y registrar cualquier excepción de AC-26.
- El renderer puede bloquear el hilo con grafos grandes; medir AC-27 antes de decidir Web Worker/lotes, sin introducir una dependencia obligatoria no aprobada.

---

## Evidencia de ejecución — continuación 2026-07-19

### Delegación y skills
- Sub-agente: `execute-agent`; instrucciones cargadas desde `common_spec_driven_development/sub_agents/execute-agent.md`.
- Sesión aislada: no disponible en este entorno; se aplicó el contrato del agente en la sesión coordinadora y se registra la limitación.
- Contexto: `spec.md`, este plan, `context.md`, `README.md`, implementación parcial `process_modeling`, registros `.atl` y skills indicadas por el programador.
- Skills aplicadas: dominio, modelo de datos, PostgreSQL, estructura, configuración, frontend, git y UI (`ui-test-structure`, `ui-log-recovery`, adaptación JS de `playwright-dash-webapp`).

### Cambios y comandos
- Backend: validación de duplicados/ciclos/referencias, listado de versiones, API estable y blueprint documentado.
- Frontend: `#/modelado-procesos`, cliente API, estado, lista, grafo, breadcrumbs, validación y estados loading/empty/error/saved.
- Tests nuevos: validación de dominio, API Flask controlada y E2E con fixtures HTTP, sin Dash/JointJS.
- `python3 -m compileall -q app uc_bib_solv/webapp_java/python-backend`: OK.
- Suites dominio/unit: OK, 4 + 40 tests; tests nuevos: OK, 4 tests.
- `node --check` de módulos JS nuevos: OK.
- PostgreSQL: OK con permisos ampliados; conexión confirmada contra `solve_ishikawa` como usuario `pedro` mediante el socket `/var/run/postgresql/.s.PGSQL.5432`. Las tablas `pm_*` quedaron confirmadas.
- Servidor webapp-java: arrancado en `8051`.
- `npx playwright test tests/e2e/process-modeling.spec.js --reporter=list`: OK, 1/1 en 10.6 s contra el servidor real; el flujo creó, leyó y eliminó datos en PostgreSQL.
- `cleanup_process_modeling_e2e.py`: corregido el `sys.path` para permitir la ejecución del cleanup del E2E.
- Suite legacy completa: mantiene fallos preexistentes del bounded context causal; quedan documentados como no atribuibles a `requerimiento_10` y no se modifican en este cierre.

### Trazabilidad AC
- Evidencia automática parcial: AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08 y AC-09.
- AC-02/AC-03/AC-04/AC-05/AC-06 y AC-07 cuentan ahora con evidencia real de persistencia y E2E; la suite legacy causal conserva fallos preexistentes, por lo que la no regresión global queda pendiente de validación humana.

## Verification Checklist
- [x] `spec.md` actualizado con AMD-004 validado en Gate 1 por `requirements-agent`.
- [x] `task_plan.md` aprobado para ejecución de AMD-005.
- [x] Gate 2 de AMD-005 aprobado el `2026-07-27`; Gate 3 pendiente.
- [x] Lote 1 ejecutado; persistencia real verificada contra PostgreSQL y tablas `pm_*`.
- [x] Tareas previas completadas; Playwright real y persistencia confirmados para el alcance anterior.
- [x] T15 AMD-003 completada y verificada.
- [x] T16 AMD-004/NC-001 completada y verificada en ambos modos de scroll.
- [x] T17 AMD-005 completada: renderer separado en medición + layout puro + pintura SVG/HTML.
- [x] T18 AMD-005 completada: cadenas verticales centradas y ramas con lanes separados por el ancho máximo del subárbol.
- [x] T19 AMD-005 completada: conectores ortogonales simplificados, una ruta visual por transición visible y lista accesible completa.
- [x] T20 AMD-005 completada: relayout tras resize/carga de fuentes con preservación de fullscreen, scroll y contexto.
- [x] T21 verificada: `node --check`, `node --test` y Playwright contra `http://127.0.0.1:8050` verdes; la regresión focalizada pasó `4/4`.

### Evidencia de implementación — T17–T21 / AMD-005 — 2026-07-27
- Se separó el renderer BPM en tres piezas dentro de `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/`: `measurement.js` (dimensiones derivadas de contenido), `layout.js` (cálculo puro y determinista de posiciones/rutas) y `graph.js` (pintura HTML/SVG y accesibilidad).
- El layout deja de depender de tamaños fijos: calcula dimensiones por nodo según contenido real, expande subprocesos sin solapes y reserva lanes por rama usando el ancho máximo de cada subárbol.
- Las cadenas secuenciales verticales quedan centradas en su lane; las bifurcaciones usan rutas ortogonales de hasta 4 segmentos y etiquetas de rama ancladas al tramo de salida.
- `process-modeling.js` invalida y recompone el layout al redimensionar ventana, terminar de cargar fuentes y salir de fullscreen nativo, manteniendo `version_id`, `node_id`, expansión, foco y scroll interno.
- Tests añadidos:
  - `tests/unit/process-modeling-layout.test.mjs`
  - ajuste de cobertura existente vía `tests/unit/process-modeling-graph.test.mjs`
- Verificación automática ejecutada:
  - `node --check uc_bib_solv/webapp_java/webapp/js/components/process-modeling/graph.js`
  - `node --check uc_bib_solv/webapp_java/webapp/js/components/process-modeling/layout.js`
  - `node --check uc_bib_solv/webapp_java/webapp/js/components/process-modeling/measurement.js`
  - `node --check uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js`
  - `node --test tests/unit/process-modeling-graph.test.mjs tests/unit/process-modeling-layout.test.mjs`
  - `python3 -m unittest app.domain.process_modeling.tests.test_domain app.domain.process_modeling.tests.test_amd002_domain tests.unit.test_process_modeling_validation`
  - `python3 -m compileall -q app uc_bib_solv/webapp_java/python-backend`
- Verificación UI/E2E completada contra el servidor local activo en `http://127.0.0.1:8050`: Playwright ejecutó la regresión focalizada y el flujo jerárquico real.
- Estado final del requerimiento: `implementado_pendiente_validacion`. Gate 3 sigue `pending`; no se marca `done`.
- [x] Test API controlado y test unitario de dominio ejecutados.
- [x] Tests unitarios de dominio/validadores/casos de uso/servicios ejecutados.
- [x] Test de integración PostgreSQL específico de `process_modeling` ejecutado contra `pm_*`, incluyendo error y no persistencia.
- [x] E2E Playwright real ejecutado contra servidor Flask y Chromium gestionado; artefactos timestampados generados.
- [ ] Suite legacy completa sin fallos: persisten fallos causales preexistentes, documentados y fuera del alcance de este requerimiento.
- [ ] Escaneo de higiene pre-commit: sin `print(`, `# DEBUG`, `# FIXME`, `breakpoint()` en producción.
- [ ] Validación de imports del dominio y separación de capas realizada.
- [ ] Validación final humana realizada (Gate 3).
- [ ] No conformidades cerradas.
- [ ] NC-001 permanece `in_correction`; no está resuelta.
- [ ] NC-002 permanece `in_correction`; Playwright verificó delta de centrado `0 px`; pendiente Gate 3 humano.
- [ ] NC-003 permanece `in_correction`; la expansión jerárquica y la regresión focalizada pasan; pendiente Gate 3 humano.
- [ ] NC-004 permanece `in_correction`; se estabilizó la recomposición por fuentes y AMD-004 pasa; pendiente Gate 3 humano.
- [ ] Estado global de AMD-005 actualizado a `implementado_pendiente_validacion` tras T21.

---

## Closure Rule

Cambiar el estado global a `done` solo cuando:
- Gate 1 esté aprobado.
- Gate 2 esté aprobado explícitamente por el programador humano para AMD-005.
- Todas las tareas aplicables estén completadas y los AC-01..AC-29 tengan evidencia.
- Gate 3 esté aprobado por el programador humano tras revisar implementación, tests, UI disponible y no regresión.
- No existan NCs `open` o `in_correction`.
- `traza_requerimiento.md` refleje el estado final real.

Tras Gate 2, AMD-005 queda lista para ejecución; después de T17–T21 debe pasar a `implementado_pendiente_validacion` hasta Gate 3. No debe cambiarse a `done` automáticamente.

La aprobación histórica de Gate 2 mediante `validar e implementar` cubre AMD-004/T16. La decisión humana `validar` del `2026-07-27` aprueba AMD-005 y desbloquea T17–T21.

---

## AMD-005 — Replanificación del layout BPM

- Fecha: `2026-07-27`
- Tipo: `B (enmienda de especificación integrada en el plan)`
- Referencia: `spec.md`, AMD-005, AC-23–AC-29.
- Autor del plan: `plan-task-agent`.
- Estado del plan: `approved`.
- Fase de reentrada: `validate-task-plan`.
- Validación humana: `aprobada el 2026-07-27` mediante la instrucción explícita `validar`.
- Alcance: layout puro y determinista en el frontend JavaScript existente; medición real, relayout completo, centrado, lanes por subárbol, conectores ortogonales, reducción de ruido, accesibilidad y no regresión.
- Restricciones: no cambiar backend/domain/API/persistencia/JSON semántico; no persistir coordenadas; no adoptar dependencia gráfica obligatoria sin decisión justificada.
- Referencias visuales vinculantes:
  - `requeriments_spec_driven_development/requerimiento_10/bpm-layout-flujo-centrado.png`
  - `requeriments_spec_driven_development/requerimiento_10/bpm-layout-expansion-recalculada.png`
  - `requeriments_spec_driven_development/requerimiento_10/bpm-layout-multiples-ramas-aguas-abajo.png`

## Amendments

### AMD-001
- Fecha: `2026-07-19`
- Tipo: `C (enmienda plan)`
- Descripción: incorporar explícitamente tests unitarios de dominio/validadores/casos de uso/servicios, tests de repositorio/API/integración y tests E2E Playwright para la UI de `webapp_java`, con ejecución incremental desde el Lote 1 y artefactos `.playwright-artifacts/` cuando aplique.
- Estado: `integrated`
- Estado de planificación: `validada/aprobada` en Gate 2.
- Fase de reentrada: `validate-task-plan`
- Validación humana: `aprobada (Gate 2)`
- Notas: no modifica FR ni AC; añade tareas T8/T9, amplía T10, comandos, criterios de salida, matriz de trazabilidad y checklist. Los patrones Dash de `playwright-dash-webapp` se adaptan al frontend Flask + JavaScript puro y no se copian selectores/iframes/login DSS.

### AMD-002
- Fecha: `2026-07-19`
- Tipo: `B (enmienda de especificación)`
- Descripción: extender el plan con `decision` y `stock`, stock estructurado con capacidad/cantidad inicial 24, ramas `Sí`/`No`, outputs `normal`/`waste`, expansión inline de subprocess con `child_process_id`, breadcrumbs, contraer/volver al padre, restauración por hash/URL y no mutación del padre; cubrirlo con unit, PostgreSQL/API y Playwright real.
- Estado: `integrated`
- Fase de reentrada: `validate-spec`
- Validación humana: `aprobada (Gate 1)`; Gate 2 `aprobado`
- Notas: AC-11..AC-16 quedan trazados a T11..T14. La ejecución de AMD-002 fue completada tras la aprobación de Gate 2; la validación final de conformidad permanece en Gate 3. El Lote 1 conserva un baseline ejecutable de cuatro tipos antes de incorporar la extensión AMD-002.

### Evidencia de ejecución AMD-002
- Estado de ejecución: `completada` según confirmación explícita del programador humano.
- Cobertura planificada/evidenciada: T11 dominio y validadores; T12 DDL/repositorios/API; T13 UI BPM, expansión inline, breadcrumbs, contraer y restauración hash/URL; T14 tests unitarios, PostgreSQL/API y Playwright real.
- Trazabilidad: AC-11..AC-16 están asignados a T11..T14 y sus verificaciones incluyen creación, consulta, expansión, contracción, recarga, renderizado, no mutación del padre, stock 24, ramas `Sí`/`No` y outputs normal/waste.
- Estado de cierre: `implementado_pendiente_validacion`; Gate 3 sigue pendiente y no se marca `done`.

### Evidencia adicional de ejecución — PostgreSQL y E2E real — 2026-07-19

- Se añadió `tests/integration/test_process_modeling_db_integration.py`, aislado al bounded context `pm_*`; no modifica fixtures ni tablas legacy.
- Se añadió `scripts/check_postgres_pm.py`, que reutiliza `config/settings.py`/`app.persistence.db`, verifica conexión y puede aplicar `db/schema.sql` idempotentemente con `--apply-schema`.
- PostgreSQL real: conectado a `solve_ishikawa` como `pedro`; las cuatro tablas `pm_*` presentes; `python3 scripts/check_postgres_pm.py --apply-schema`: `OK`.
- Integración real: 2 tests ejecutados, 2 `OK`; cubren reconstrucción tras cierre de transacciones y rechazo/no persistencia de auto-transición.
- Playwright: `playwright.config.js` usa Chromium gestionado, configura `outputDir` timestampado bajo `.playwright-artifacts/test-results/`, traza/capturas en fallo y el E2E captura consola, fallos de red y respuestas >=400.
- `tests/e2e/process-modeling.spec.js` usa API Flask/PostgreSQL real para crear proceso, versión, tres nodos y dos transiciones; no usa `page.route` ni fixtures HTTP. Resultado: 1 test `passed`; `afterAll` limpió la fila creada y la consulta final dejó `0` filas `TEST_PM_E2E_*`.
- Se corrigió `scripts/cleanup_process_modeling_e2e.py` para resolver la raíz por `__file__` y escapar el patrón SQL `LIKE` como `%%`; `py_compile` y `node --check` pasan.
- Limitación separada: la suite legacy de integración había fallado antes por el bloqueo de socket del sandbox (`Operation not permitted`); no se atribuye a `pm_*` y no se modificaron sus fixtures ni tablas.
- Estado: `implementado_pendiente_validacion`; Gate 3 y la decisión humana sobre la suite legacy permanecen pendientes. No se marca `done`.

### Evidencia de implementación — Adaptación visual BPM del grafo — 2026-07-19

- Alcance: sustituir la presentación flex del grafo por un lienzo BPM derivado de `nodes`/`transitions`, sin convertir el flujo en imagen estática ni mover reglas al frontend.
- Archivos: `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/graph.js`, `uc_bib_solv/webapp_java/webapp/css/app.css` y `tests/e2e/process-modeling.spec.js`.
- Implementación: layout determinista por profundidad vertical y filas horizontales para bifurcaciones; overlay SVG con flechas rojas; tarjetas `pm-bpm-card-input/output`, `operation`, `subprocess` y clases preparadas para `decision`/`stock`; leyenda BPM; lista accesible `.pm-transitions`; hover/focus y scroll responsive.
- Referencia aplicada: composición y lenguaje de tarjetas de `tree-render.js`/`acv2-tree-card`, con formas BPM inspiradas en `requerimientos_cliente/BPM.png`.
- Evidencia Playwright real contra webapp-java `8051` y PostgreSQL: `npx playwright test tests/e2e/process-modeling.spec.js --reporter=list` → 4/4 passed en 15.2 s. El test verifica 5 tarjetas, 1 input, 3 operaciones, 1 output y 4 `.pm-edge`; captura generada en `.playwright-artifacts/test-results/2026-07-19T12-25-07/process-modeling-crea-un-p-6d6e9-fo-desde-los-formularios-UI/process-modeling-bpm.png`.
- Verificación offline: `node --check` OK; dominio 4/4; unitarios 44/44; `compileall` OK.
- Estado: `implementado_pendiente_validacion`; Gate 3 sigue pendiente y no se marca `done`.

### Evidencia histórica de implementación previa — Scroll interno del viewport BPM — 2026-07-19

- `graph.js`: el viewport `.pm-flow-scroll` incorpora `role="region"`, `tabindex="0"` y etiqueta accesible; el canvas sigue derivándose de nodos/transiciones y conserva sus dimensiones calculadas.
- `app.css`: `.pm-flow-scroll` usa `overflow: auto`, `max-height: min(70vh, 760px)`, `min-height`, `overscroll-behavior: contain`, scrollbar visible/usable, foco accesible y ajustes responsive móvil. `.pm-flow` permanece `flex: 0 0 auto` y no se encoge.
- `process-modeling.spec.js`: se verifica overflow auto/scroll en ambos ejes, existencia de overflow y modificación efectiva de `scrollLeft`/`scrollTop` mediante DOM.
- Verificación real contra webapp-java `8051` y PostgreSQL: Playwright `4/4 passed` en 25.4 s; `node --check` OK; dominio 4/4; unitarios 44/44.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.

### AMD-003 — Replanificación tras spec validado — 2026-07-20
- Fecha: `2026-07-20`
- Tipo: `B (enmienda de especificación)`
- Referencia: `spec.md`, AMD-003, AC-17..AC-21.
- Descripción: retirar visualmente el panel izquierdo de catálogo; conservar la selección mediante selector compacto en shell/editor; habilitar scroll vertical global del documento; añadir `Pantalla completa`/`Salir de pantalla completa` con Fullscreen API cuando sea posible y fallback reversible sin dependencias.
- Estado: `integrated`
- Fase de reentrada: `validate-task-plan`
- Validación humana: `aprobada (Gate 1)`; `aprobada (Gate 2)` mediante la instrucción exacta `validar` recibida en esta sesión.
- Notas de planificación: se añade T15 y se amplían T9/T10, trazabilidad, verificación y checklist. T15 se limita a frontend/CSS/pruebas UI y no duplica T7/T13 ya completadas; la aprobación no autoriza cambios de backend, dominio, API, persistencia, semántica ni alcance.
- Contexto usado: `process-modeling.js` (`shell`, `editor`, `processOptions`, `state.selectedProcess`, `afterMount`), `process-modeling-state.js`, `api/process-modeling.js`, `router.js`/`views/index.js`, inspección codebase-memory y memorias Engram del proyecto `uc_bib_solve`.

### AMD-004 — Replanificación de scroll interno coordinado — 2026-07-20
- Fecha: `2026-07-20`
- Tipo: `B (enmienda de especificación)`
- Referencia: `spec.md`, AMD-004, AC-18/AC-19/AC-22.
- Descripción: añadir scroll vertical y horizontal interno en `.pm-flow-scroll` en modo no pantalla completa y mantener ambos ejes utilizables en fullscreen nativo/fallback, conservando simultáneamente el scroll vertical global de página, contexto, foco y accesibilidad.
- Estado: `integrated`
- Estado de planificación: `validada/aprobada` en Gate 2.
- Fase de reentrada: `validate-task-plan` seguida de `execute-task`.
- Validación humana: Gate 1 `aprobado por requirements-agent`; Gate 2 `aprobada` mediante la instrucción exacta `validar e implementar`.
- Integración NC: T16 corrige NC-001 dentro del intento `in_correction` existente; la NC conserva historial y permanece abierta/no resuelta hasta Gate 3.
- Notas: no modifica backend, dominio, API, persistencia, semántica ni dependencias; amplía T15/T9/T10 solo para verificación y añade T16 sin duplicar T15.
- Contexto usado: `process-modeling.js` (`pm-fullscreen-root`, `state.fullscreen`, `state.fullscreenMode`, `state.expansionStack`), `graph.js` (`.pm-flow-scroll`), `app.css`, `tests/e2e/process-modeling.spec.js`, codebase-memory y Engram (`uc_bib_solve`).

### Alineación geométrica de conectores BPM — 2026-07-19

- Se eliminó el escalado exclusivo de tarjetas en subflujos; ahora tarjetas y SVG comparten la misma escala y coordenadas.
- Las conexiones usan el ancho real de inputs/outputs circulares y el tamaño de las tarjetas expandidas para unir centro inferior con centro superior.
- Playwright multinivel real: `1 passed`; comprobación geométrica de tarjetas y paths SVG sin desplazamiento visual.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.

### Expansiones simultáneas y altura adaptativa — 2026-07-19

- Se sustituyó la expansión única por un conjunto de expansiones identificadas por `parentVersionId + nodeId`, permitiendo mantener abiertas `OP1`, `OP2` y `OP3` simultáneamente.
- La altura de cada tarjeta se estima a partir del número de capas del subflujo; los subprocesos simples ya no reservan el espacio completo del flujo complejo de `OP1`.
- La expansión anidada de `OP1.1` conserva el contexto de su versión padre.
- Playwright real: fixture multinivel con `OP1`, `OP2`, `OP3` simultáneos y `OP1.1` anidado: `1 passed`; sin solapamiento entre tarjetas padre.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.

### Verificación jerárquica multinivel — 2026-07-19

- El fixture `TEST_PM_UI_1784458754642` incorpora subprocesos para `OP2` y `OP3`.
- `OP1.1` dentro del subflujo de `OP1` también es un subprocess expandible con su propio flujo hijo.
- La UI mantiene un stack de expansión y permite expandir `OP1` → `OP1.1` dentro del mismo canvas, además de `OP2` y `OP3`.
- Playwright real: `fixture jerárquico permite expandir OP1.1, OP2 y OP3` → `1 passed`; dominio `8/8`; `node --check` OK.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.

### Corrección de solape del flujo posterior — 2026-07-19

- Se amplió la reserva vertical del contenedor expandido y se desplazaron las tarjetas posteriores (`Operación 2`, `Operación 3` y salida).
- Las flechas se recalculan usando la altura real del contenedor, saliendo por su parte inferior.
- Verificación real sobre el fixture persistente: no hay solape; el subflujo permanece dentro del único canvas BPM.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.

### Ajuste de conexiones con subproceso expandido — 2026-07-19

- El layout BPM aumenta la altura del nodo expandido, desplaza los nodos posteriores y recalcula los extremos de las flechas.
- El flujo padre completo permanece visible: la conexión desde `Operación 1` sale por la parte inferior del contenedor hacia `Operación 2` y continúa hasta la salida.
- Verificación real: un único `.pm-flow`, subflujo dentro de la tarjeta y Playwright focalizado `1 passed`.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.

### Corrección de expansión en el mismo lienzo BPM — 2026-07-19

- La expansión del subproceso ya no genera un segundo diagrama inferior: el subdiagrama hijo se renderiza dentro de la tarjeta contenedora `Operación 1`, dentro del único `.pm-flow` desplazable.
- Se conserva el flujo padre, se muestran las conexiones y tarjetas del hijo dentro de `.pm-subprocess-container`, y la contracción vuelve al diagrama padre.
- Playwright focalizado: único `.pm-flow`, contenedor hijo dentro de la tarjeta subprocess, stock 24, ramas Sí/No y contracción correcta: `1 passed`.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.

### Incidencia y corrección de cleanup del E2E UI — 2026-07-19

- Incidencia: el primer escenario UI creó correctamente el proceso `TEST_PM_UI_*` y completó su flujo, pero falló en `afterAll` porque `scripts/cleanup_process_modeling_e2e.py` solo aceptaba `process_code LIKE 'TEST_PM_E2E_%'`.
- Corrección: el helper define la allowlist cerrada `TEST_PM_E2E_`/`TEST_PM_UI_`, valida el `process_id` como UUID y ejecuta `DELETE` parametrizado por UUID y `LIKE ANY(%s)`. No puede borrar procesos ajenos ni filas fuera de esos prefijos de prueba.
- Verificación: `python3 -m py_compile scripts/cleanup_process_modeling_e2e.py`: OK; `node --check` de los módulos UI y E2E: OK; dominio: 4/4; unitarios: 44/44.
- E2E real contra webapp-java en `8051` y PostgreSQL: 3/3 tests passed en 18.8 s; el flujo de creación UI limpió correctamente los procesos creados y no dejó filas de prueba.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.

### Verificación de apertura desde catálogo real — 2026-07-19

- Se añadió el test `carga un proceso TEST existente desde el catálogo real` en `tests/e2e/process-modeling.spec.js`.
- El test abre `/index.html#/modelado-procesos`, espera el `GET /api/process-modeling/processes`, localiza un código `TEST_PM_UI_`/`TEST_PM_E2E_`, hace click en `[data-pm-process]` y verifica breadcrumbs de versión, `.pm-node` y `.pm-transitions`.
- No crea datos por API ni usa `page.route`/fixtures HTTP. Si el catálogo está vacío, verifica explícitamente `No hay procesos modelados todavía.`; si hay catálogo sin proceso de prueba, marca la condición como omitida, evitando un falso fallo.
- Resultado real contra webapp-java en `8051` y PostgreSQL: `npx playwright test tests/e2e/process-modeling.spec.js --reporter=list` → 4/4 passed en 18.0 s. El proceso `TEST_PM_*` existente se cargó correctamente y el editor se actualizó.
- `node --check` de la prueba y de `process-modeling.js`: OK. No fue necesario modificar la lógica de apertura.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.

### Corrección de evento de expansión y verificación focalizada — 2026-07-19

- Incidencia: la tarjeta expandible no tenía un selector de evento específico; la delegación genérica podía dejar el click de tarjeta/botón sin ejecutar el flujo observable. Además, `collapseSubprocess()` limpiaba el contexto antes de recuperar `parentVersionId`.
- Corrección: `graph.js` expone `data-pm-expand-node` en tarjeta y botón; `process-modeling.js` prioriza ese evento en la delegación de click, evita doble despacho y conserva el identificador padre antes de limpiar el estado al contraer. No se modificó backend ni se escribieron datos.
- Test añadido: `tests/e2e/process-modeling.spec.js`, sobre el proceso fijo `TEST_PM_UI_1784458754642`; espera el catálogo real, pulsa `[data-pm-process]`, pulsa el botón de la tarjeta `subprocess`, verifica el `GET` de expansión 200, `subprocess_context`, breadcrumbs, `.pm-inline-child`, nodos/transiciones y no mutación del padre mediante consulta GET.
- Evidencia: `node --check` de `process-modeling.js`, `graph.js` y la suite E2E: OK; dominio `python3 -m unittest discover -s app/domain/process_modeling/tests -p 'test_*.py'`: 8/8 OK; Playwright real con `UI_TEST_BASE_URL=http://127.0.0.1:8051 npx playwright test tests/e2e/process-modeling.spec.js --grep "TEST_PM_UI_1784458754642" --reporter=list`: 1/1 passed; regresión catálogo + expansión semántica: 2/2 passed.
- Limitación de ejecución: un primer comando sin `UI_TEST_BASE_URL` intentó el valor por defecto `8050` y obtuvo `ERR_CONNECTION_REFUSED`; repetido explícitamente contra el servidor real `8051`, pasó. No se alteraron datos existentes.
- Estado: `implementado_pendiente_validacion`; no se marca `done`.
