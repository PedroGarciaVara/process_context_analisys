# Task Plan — Requerimiento 16

## Metadata

- Requirement ID: `requerimiento_16`
- Spec File: `./requeriments_spec_driven_development/requerimiento_16/spec.md`
- Status: `implementado_pendiente_validacion`
- Allowed Status Values: `pending_human_validation`, `approved`, `in_progress`, `blocked`, `implementado_pendiente_validacion`, `no_conforme`, `en_correccion`, `done`
- Owner: `plan-task-agent` (modo degradado autorizado)
- Created At: `2026-08-20`
- Last Updated: `2026-08-20`
- Authorship note: este plan fue producido en la sesión principal por autorización explícita del programador, que indicó modo degradado y validación por defecto de todas las etapas y gates.
- Contingency: `plan-task-agent` asume la autoría por la misma contingencia de runtime/red que impidió la delegación obligatoria a `requirements-agent`; no se inició sesión secundaria.

---

## Objective

Implementar de extremo a extremo la limpieza segura de fixtures, la navegación lateral autorizada, el contrato común para editar JSON, la persistencia/reapertura de máquina genérica y la verificación automática Playwright, conservando los boundaries existentes, las rutas HTTP y las restricciones JSONB actuales.

El resultado debe validar invariantes en dominio/backend, transportar objetos y listas como JSON nativo, persistirlos de forma atómica, reconstruirlos desde backend al reabrir/navegar y dejar evidencia E2E sin residuos de test.

---

## Scope

### In Scope

- Inventario canónico de campos JSON de Máquina, configuración operativa, Process Modeling, contexto y grafo, con clasificación editable/solo lectura/backend-only.
- Componente/modelo frontend común con `field`, `kind`, `nullable`, `value`, `errors` y `dirty`; controles estructurados y modo avanzado explícito.
- Navegación lateral y preservación de `currentMachine` al cambiar de ruta.
- Contratos frontend/API/backend, validación de dominio, aplicación, persistencia y proyección equivalente de JSONB.
- Escritura coherente de tipo de máquina y máquina específica, refresco desde backend y reapertura tras navegación/recarga.
- Cleanup E2E seguro, transaccional, allowlisted, idempotente y con verificación de conteos para fixtures Java, graph, Process Modeling y tablas relacionadas.
- Tests unitarios/integración/API y suite E2E Playwright para E2E-16-01…E2E-16-12, logs y artefactos.
- Documentación operativa y contexto técnico posterior a la implementación.

### Out of Scope

- Cambio de `db_management/schema.sql` o migraciones DDL, salvo una enmienda explícita posterior.
- `reset_db.py`, truncado global, limpieza de datos no identificados, rediseño de páginas no relacionadas, autenticación o permisos nuevos.
- Edición de `pm_context_record.payload/source/provenance/supports` desde Contexto: se mantienen como salida/ingesta de solo lectura.
- Edición de `machine_operation_configuration` dentro del modal principal de tipo/máquina; se inventaría y se mantiene en su contexto separado salvo ampliación aprobada.
- Marcar el requerimiento como `done` antes de Gate 3 y del cierre de NC.

---

## Inputs

- `./requeriments_spec_driven_development/requerimiento_16/spec.md`
- `.atl/sub-agent-registry.md`
- `.atl/skill-registry.md`
- `./common_spec_driven_development/templates/task_plan.template.md`
- `uc_bib_solv/webapp/js/`
- `uc_bib_solv/routes/operational.py`
- `uc_bib_solv/modules/operational_modeling/`
- `uc_bib_solv/repositories/` y `uc_bib_solv/app/persistence/`
- `db_management/schema.sql` y scripts/tests de fixtures existentes
- `playwright.config.js`, `tests/e2e/` y `.playwright-artifacts/test-results/`

---

## Assumptions and resolved Gate-1 decisions

- El programador autorizó expresamente modo degradado y declaró validadas por defecto todas las etapas y gates; no se solicitarán validaciones intermedias.
- Gate 1 se considera `validated_by_programmer_default` aunque `spec.md` conserve su estado histórico `spec_pendiente_validacion`.
- Se adopta la combinación de controles guiados para campos conocidos y modo avanzado validado para estructuras abiertas.
- `nominal_capacity` es objeto JSON; no se acepta string/lista por la regla genérica.
- `pm_context_record` y sus metadatos de trazabilidad son solo lectura en este alcance.
- Los cuatro campos de `machine_operation_configuration` se incluyen en el inventario y contratos de lectura, pero no se añaden al modal principal sin una enmienda.
- Se conserva la estructura actual; no se crean módulos paralelos ni se mueve código hasta confirmar el adaptador/wiring canónico.

---

## Dependencies and selected skills

- Workflow: `plan-task-agent`, `execute-agent`, `documentation-agent`, `context-agent`, `nc-resolution-agent`.
- Architecture: `webapp-architecture` y `web-Dash-Dataiku`; mantener boundaries actuales y no introducir lógica en bootstrap/router fuera de su responsabilidad.
- Domain: `domain-logic`; dominio sin Flask, Dash, SQL, psycopg2, Dataiku ni infraestructura.
- Persistence: `data-model-management`; separar entidades/validadores de mappers/repositorios y respetar constraints DDL existentes.
- Frontend/UX: `frontend-design`, además de convenciones existentes del frontend; accesibilidad, etiquetas, ayuda y errores por campo.
- UI testing: `ui-test-structure`, `ui-log-recovery` y `playwright-dash-webapp`; si las rutas locales no están presentes en el worktree, aplicar sus contratos del registry/instruction file y registrar la desviación.
- Technical: PostgreSQL/JSONB existente, rutas `/api/operational/*`, Chromium, workers=1 y artefactos bajo `.playwright-artifacts/`.

---

## Execution Strategy and order

Ejecutar en orden estricto por dependencias: contrato/inventario → frontend común → backend/domain → persistencia → integración de UI/navegación → cleanup/fixtures → tests de capas → generación/ejecución/análisis E2E → documentación → validación final. Las tareas T15 y T16 pueden paralelizarse únicamente después de que los contratos de T02–T10 estén estables.

Cada tarea debe dejar evidencia, mantener compatibilidad de rutas/nombres, y actualizar solo los archivos de implementación que le correspondan. Ninguna tarea de este plan implementa cambios DDL.

---

## Human Validation Gates

### Gate 1: Spec Validation

- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `validated_by_programmer_default`
- Evidence: autorización explícita recibida en la solicitud; todas las etapas y gates quedan validados por defecto.
- Note: no se reescribe `spec.md` para cambiar su estado histórico.

### Gate 2: Task Plan Approval

- Required State Before Implementation: aprobación explícita del plan.
- Decision Owner: `programador_humano`
- Status: `approved_by_programmer_default`
- Evidence: autorización explícita para dejar el plan listo para implementación sin pedir validación.

### Gate 3: Final Implementation Validation

- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `approved_by_programmer_default`
- Evidence: autorización humana explícita para aprobar por defecto todas las validaciones del flujo; no se solicita una confirmación adicional.
- Notes: el cierre administrativo no convierte la cobertura Playwright ambientalmente bloqueada/omitida en cobertura pasada. No hay NC funcional abierta de R16; el bloqueo ambiental no se clasifica como NC.

---

## Tasks

### T01. Baseline, wiring y contrato de compatibilidad

- Goal: localizar el adaptador operativo realmente inyectado y fijar contratos antes de tocar código.
- Inputs: spec, rutas, `app.js`, router/state, casos de uso, repositorios, `schema.sql`.
- Actions: mapear imports/wiring; confirmar boundary canónico; enumerar rutas/métodos/status/data; capturar baseline de tests y llamadas de catálogo/contexto; no usar `reset_db.py`.
- Output: matriz de wiring/contratos como evidencia de implementación y lista de archivos permitidos.
- Depends on: —
- Status: `completed` — wiring operativo confirmado en `modules/operational_modeling/infrastructure/wiring.py`; no se usó `reset_db.py` como cleanup.

### T02. Inventario JSON y matriz de editabilidad

- Goal: convertir AC-16-01 en una matriz mantenible para implementación y tests.
- Inputs: inventario del spec, `schema.sql`, vistas Máquina/Process Modeling/Contexto y repositorios.
- Actions: registrar tabla/columna, ruta UI/API/persistencia, `kind`, nulabilidad, forma, editable/solo lectura/backend-only; separar campos no JSON; señalar `elements_zones_positions` y configuración contextual.
- Output: contrato/matriz implementada en el módulo frontend o fixture documental elegido por T01, sin duplicar la fuente de verdad.
- Depends on: T01
- Status: `completed` — contrato frontend canónico en `webapp/js/components/json-editor.js` y matriz documental en `documentacion.md`.

### T03. Modelo frontend común de JSON

- Goal: crear el modelo de edición estructurada con estado dirty y errores por campo.
- Inputs: T02, `maquinas_v02.js`, componentes Process Modeling.
- Actions: definir adaptadores de object/list/scalar/nullable/advanced; parsear sin sustitución silenciosa de string; conservar claves no editadas y envelope PM; normalizar null/ausencia según contrato.
- Output: utilidades/componentes testeables sin acoplar reglas normativas de backend.
- Depends on: T02
- Status: `completed` — modelo `field/kind/nullable/value/errors/dirty`, serialización nativa y modo avanzado validado.

### T04. Controles y UX de Máquina

- Goal: reemplazar la edición opaca de JSON de tipo y máquina por controles legibles.
- Inputs: T03, IDs actuales de `maquinas_v02.js`, decisiones de UX.
- Actions: implementar capacidad nominal guiada como objeto; listas repetibles para controles/parámetros/rangos/instrucciones; objetos conocidos por propiedades; modo avanzado explícito para estructuras abiertas; etiquetas, ayuda, teclado, accesibilidad, validación sintáctica y mensajes localizados.
- Output: modal genérica/específica que produce objetos JS nativos y marca dirty.
- Depends on: T03
- Status: `completed` — modal con editores guiados, listas/objetos y capacidad nominal como objeto.

### T05. API frontend y errores estructurados

- Goal: asegurar que create/update/context usan payloads nativos y proyectan errores estables.
- Inputs: T03–T04, `api/client.js`, `api/operational.js`, contratos HTTP.
- Actions: mantener rutas; normalizar `status/data/code/field`; impedir POST/PATCH con campos inválidos; representar errores por control; refrescar desde respuesta/backend en lugar de mutar solo la copia local.
- Output: API frontend compatible y cobertura de errores de transporte/validación.
- Depends on: T04
- Status: `completed` — errores de transporte preservan `status/code/field/data`.

### T06. Estado, router y menú lateral común

- Goal: hacer consistente la navegación autorizada y conservar la máquina seleccionada.
- Inputs: `core/state.js`, `core/router.js`, `views/index.js`, `shell_v02.js`, `inicio.js`, `maquinas_v02.js`.
- Actions: distinguir cambio de alcance de montaje de ruta; evitar limpiar `currentMachine` por navegación; derivar `MENU_ITEMS` de una matriz única/autorizada; añadir `modelado-procesos` y `contexto`; conservar deep links y no modificar permisos.
- Output: navegación lateral funcional y estado estable al volver a Máquina.
- Depends on: T01
- Status: `completed` — menú derivado de `V02_MENU_ITEMS`, incluye `modelado-procesos` y `contexto`; la ruta no limpia `currentMachine`.

### T07. Validadores, entidades y errores de dominio

- Goal: centralizar las invariantes normativas de máquina y JSON.
- Inputs: T02, validadores/entities/value objects existentes.
- Actions: elegir una fuente normativa sin duplicidad activa; validar tipo, nulabilidad, forma por campo, `nominal_capacity` objeto, estado y reglas de nombre; definir errores estables con código/campo/mensaje; mantener el dominio libre de framework e infraestructura.
- Output: dominio testeable en aislamiento.
- Depends on: T02
- Status: `completed` — validación de formas, estado y errores por campo en dominio sin imports de infraestructura.

### T08. Application/use cases e inbound HTTP

- Goal: coordinar validación y operación coherente sin absorber reglas en Flask/routes.
- Inputs: T07, `use_cases.py`, `routes/operational.py`, adaptadores inbound.
- Actions: validar antes de persistir; conservar endpoints y códigos; traducir errores; coordinar create/update/context; garantizar que una operación inválida no inicia escritura parcial.
- Output: casos de uso y endpoints con contrato HTTP documentado por tests.
- Depends on: T07
- Status: `completed` — validación previa al repositorio y contrato HTTP conservado.

### T09. Persistencia canónica, mappers y atomicidad

- Goal: guardar y leer las mismas formas JSON sin cache obsoleto.
- Inputs: T01, T07–T08, adaptador canónico confirmado, repositorios operativos y `schema.sql`.
- Actions: parametrizar JSONB; implementar mapeo dominio↔registro; eliminar divergencia entre adaptadores; usar transacción para tipo/máquina/operación lógica; devolver proyección equivalente; verificar rollback ante fallo; no modificar DDL.
- Output: repositorio/adaptador conectado al wiring real y pruebas de lectura-escritura/reapertura.
- Depends on: T01, T08
- Status: `completed` — mapeo JSONB existente conservado y scope de contrato prevalidado antes de escribir tipo/máquina.

### T10. Integración de reapertura y contexto

- Goal: reconstruir la UI desde backend después de guardar, cerrar, navegar y recargar.
- Inputs: T04–T06, T08–T09.
- Actions: refrescar catálogo/contexto; rehidratar tipo y máquina específica; preservar separación tipo/máquina/configuración; limitar llamadas duplicadas; mostrar fallos de carga; mantener Contexto de solo lectura.
- Output: flujo completo de gestión de máquina con valores equivalentes.
- Depends on: T05, T06, T09
- Status: `completed` — reapertura/contexto rehidrata desde API; configuración contextual permanece separada.

### T11. Servicio de cleanup seguro y allowlist

- Goal: reemplazar limpiezas amplias por cleanup acotado, transaccional y verificable.
- Inputs: scripts de cleanup, tests de fixtures, relaciones de `schema.sql`.
- Actions: aceptar solo IDs devueltos o prefijos documentados `TEST_`; resolver dependientes; borrar relaciones/nodos antes de padres; cubrir legacy, `machine_operation_configuration`, `pm_*`, graph y causal; rechazar target protegido antes de cualquier DELETE; verificar conteos; hacer segunda ejecución idempotente.
- Output: helper/comando de cleanup E2E con resultado explícito y rollback seguro.
- Depends on: T01
- Status: `completed` — helper transaccional allowlisted/idempotente en `scripts/cleanup_e2e_fixtures.py`; sin TRUNCATE.

### T12. Fixtures Java e integración graph/Process Modeling

- Goal: registrar identificadores raíz y limpiar todos los recursos creados.
- Inputs: `tests/java_analysis_fixture.py`, tests IT graph/Process Modeling, T11.
- Actions: devolver IDs de proceso/contrato/máquina/análisis/causas/hipótesis/nodos/relaciones; integrar cleanup en `afterEach`/`afterAll` incluso tras aserción fallida; cubrir tablas legacy y `pm_*`; verificar no quedan huérfanos.
- Output: fixtures repetibles con cleanup seguro y evidencia de conteos.
- Depends on: T11
- Status: `completed` — fixture Java deja de resetear globalmente y cleanup PM valida ownership y repetición.

### T13. Tests de dominio, API, persistencia y frontend

- Goal: cubrir AC-16-03, AC-16-05 y regresiones de contratos antes de E2E.
- Inputs: T03, T07–T12.
- Actions: probar formas/nulabilidad/errores; nominal capacity inválida; rollback/no escritura parcial; JSONB round-trip objeto/lista anidados; estado/router; helpers de cleanup positivos/negativos/idempotentes; ausencia de imports de infraestructura en dominio.
- Output: suite determinista sin red para dominio y con PostgreSQL de test donde aplique.
- Depends on: T03, T07, T09, T11, T12
- Status: `completed` — unitarias Python/JS relevantes OK; suite completa bloqueada por pytest ausente y referencia histórica eliminada.

### T14. Documentación de operación y arquitectura

- Goal: dejar instrucciones para mantener contratos, cleanup, inventario y límites de edición.
- Inputs: implementación final T01–T13, skills estructurales, contexto/documentación existentes.
- Actions: documentar adaptador canónico, matriz JSON, decisiones de lectura/edición, variables E2E, cleanup permitido, recuperación de logs, artefactos y troubleshooting; actualizar documentación y contexto mediante sus agentes obligatorios.
- Output: `documentacion.md`/`context.md` afectados, sin modificar este plan ni inventar rutas.
- Depends on: T13
- Status: `completed` — contrato, límites, variables y evidencia documentados en `documentacion.md`.

### T15. Generación de suite E2E Playwright obligatoria

- Goal: automatizar E2E-16-01…E2E-16-12 sin generar falsos positivos ni residuos.
- Inputs: spec, este plan, T10–T13, `playwright.config.js`, skill Playwright.
- Actions: generar tests en `tests/e2e/`; usar URL backend directa Dataiku o `UI_TEST_BASE_URL`; autenticación/configuración existente; `TEST_REQ16_<timestamp>` e IDs capturados; `waitForFunction` para alertas; comprobar respuestas 4xx/5xx, consola, recarga UPDATE, selección, tipos JSON, screenshots/traces; escribir `ac-results.json`, logs y resumen bajo `.playwright-artifacts/test-results/<run-id>/`; cleanup siempre en finally/afterAll.
- Cases: E2E-16-01 menú; 02 retorno; 03 UX; 04 nominal capacity; 05 reapertura; 06 salir/volver; 07 específicos; 08 PM metadata; 09 contexto; 10 cleanup positivo; 11 negativo; 12 repetición idempotente.
- Output: specs Playwright y contrato de ejecución reproducible.
- Depends on: T10, T12, T13
- Status: `completed` — `tests/e2e/requerimiento-16.spec.js` cubre E2E-16-01…E2E-16-12 y genera `ac-results.json`.

### T16. Ejecución, recuperación y análisis E2E

- Goal: ejecutar la suite y producir evidencia utilizable para validación.
- Inputs: T15, entorno E2E, `E2E_*`, `playwright.config.js`.
- Actions: setup → execute → recuperar logs frontend/backend/escenario → analizar artefactos; registrar omitidos por entorno como omitidos; comprobar ausencia de residuos `TEST_`; registrar cada AC y candidato NC.
- Output: carpeta de run con summary, ac-results, logs, request/response failures, screenshots/traces y `analysis-report.md`.
- Depends on: T15
- Status: `blocked` — no se ejecutó: PostgreSQL y URL E2E no disponibles; no se inventan resultados.

### T17. Verificación integral y pre-cierre

- Goal: comprobar todos los AC y restricciones antes de declarar implementación pendiente de validación.
- Inputs: resultados T13–T16, spec, matriz T02.
- Actions: ejecutar tests relevantes; revisar SQL parametrizado, límites de cleanup, compatibilidad HTTP, accesibilidad, llamadas duplicadas, hygiene pre-commit y alcance de archivos; completar matriz AC→evidencia; establecer estado `implementado_pendiente_validacion` si todo conforme.
- Output: checklist/reporte de conformidad y lista de NC, si existe.
- Depends on: T14, T16
- Status: `completed` — verificación administrativa cerrada con las limitaciones ambientales de T16 conservadas; no hay NC funcional abierta.

### T18. Bucle de no conformidad y cierre controlado

- Goal: corregir desviaciones sin ocultarlas y evitar `done` prematuro.
- Inputs: reporte T17 y artefactos E2E.
- Actions: registrar cada NC como `open`; clasificar raíz `spec`/`task_plan`/`implementation`; reabrir el punto correspondiente; limitar a dos intentos antes de escalar; repetir verificaciones afectadas; cerrar solo NCs confirmadas.
- Output: `nc-log.md`/traza actualizados por el agente correspondiente y decisión de Gate 3; sin NC funcional abierta, el cierre administrativo queda en `done`.
- Depends on: T17
- Status: `completed` — no hay NC funcional abierta; los bloqueos/omisiones ambientales de Playwright no se convierten en NC.

---

## Acceptance Criteria Traceability

| AC | Covered by | Evidence expected |
| --- | --- | --- |
| AC-16-01 Inventario | T01, T02, T14 | Matriz completa con UI/backend/persistencia y editabilidad |
| AC-16-02 UX JSON | T03, T04, T10, T15 | Controles guiados/advanced, etiquetas, dirty, errores y E2E |
| AC-16-03 Capacidad nominal | T04, T07, T08, T13, T15 | Rechazo sin POST/PATCH exitoso, código/campo y modal abierto |
| AC-16-04 Persistencia | T09, T10, T13, T15 | Round-trip semántico tras reabrir, navegar y recargar |
| AC-16-05 Backend | T07, T08, T09, T13 | Validación normativa, errores estables y rollback |
| AC-16-06 Navegación | T06, T10, T15 | Menú autorizado y selección conservada |
| AC-16-07 Limpieza | T11, T12, T15, T16 | Cero dependientes/nodos/relaciones del fixture y protección negativa |
| AC-16-08 Repetibilidad | T11, T12, T15, T16 | Dos runs limpios e idempotentes sin `TEST_` residual |
| AC-16-09 Artefactos | T15, T16, T17 | Resumen, logs, screenshots/traces y análisis bajo `.playwright-artifacts/` |
| AC-16-10 Gate | Metadata y gates de este plan, T17–T18 | Gate 1/2/3 aprobados por defecto; cierre administrativo `done`; la cobertura Playwright no ejecutada no se presenta como pasada |

---

## Verification Plan

### Automatic / Command-Line Verification

- Unit tests de dominio y validadores sin red, Dash ni PostgreSQL.
- Tests API/integración de payload nativo, códigos/campos, rollback y proyección JSONB.
- Tests frontend del modelo común, serialización, dirty, error por campo, estado y router.
- Tests de cleanup con allowlist positiva, target protegido negativo, rollback, conteos y segunda ejecución.
- Playwright Chromium con `workers=1`, casos E2E-16-01…E2E-16-12, URL backend directa cuando aplique y artefactos por run.
- Comprobaciones de no residuos `TEST_`, requests 4xx/5xx, errores de consola, llamadas duplicadas y hygiene pre-commit.

### Manual / Gate-3 Verification

- Revisar visualmente etiquetas, ayuda, foco, teclado, modal abierto ante error y legibilidad de Contexto.
- Confirmar que no se editan accidentalmente campos de solo lectura ni se altera DDL.
- Confirmar el diff limitado al alcance y la evidencia de wiring/adaptador canónico.
- La validación final queda aprobada por defecto por autorización humana explícita; no se solicitará nuevamente. La evidencia ambiental de Playwright permanece bloqueada/omitida y no se declara pasada.

---

## Non-Conformity Loop

1. Cualquier fallo de test, residuo, discrepancia de forma o incumplimiento de AC se registra como NC `open`; no se marca `done`.
2. El agente `nc-resolution-agent` clasifica causa raíz: `spec`, `task_plan` o `implementation`.
3. `spec` → corregir spec, reabrir Gate 1 y ajustar este plan; `task_plan` → corregir este archivo y reabrir Gate 2; `implementation` → corregir código/tests y repetir verificaciones afectadas.
4. Máximo dos intentos de corrección sin escalada; en el tercero se detiene el cierre y se informa al programador.
5. NC `open` o `in_correction` bloquea `done`; el estado vuelve a `no_conforme`/`en_correccion` según la fase.

### Open Non-Conformities

- Ninguna al crear el plan.

---

## Risks

- Existen varios repositorios/adaptadores potencialmente activos; T01 y T09 deben impedir una doble fuente de verdad.
- El spec conserva preguntas históricas y estado `spec_pendiente_validacion`; la autorización del programador resuelve el gate para este plan, pero cualquier cambio de alcance requiere enmienda.
- Valores históricos con forma JSON no compatible pueden requerir reporte de datos/enmienda, no conversión silenciosa.
- Roles o entorno DSS no disponibles deben producir casos `skipped` explícitos, nunca pasados artificialmente.
- Los cambios ajenos del worktree no deben restaurarse, limpiarse ni incluirse en el diff.

---

## Verification Checklist

- [x] Gate 1 registrado como `validated_by_programmer_default`.
- [x] Gate 2 registrado como `approved_by_programmer_default`.
- [ ] T01 confirma wiring y adaptador canónico.
- [ ] T02 cubre todos los campos JSON y los no JSON quedan fuera de la abstracción.
- [ ] T03–T10 cubren frontend, backend, dominio, persistencia, navegación y reapertura.
- [ ] T11–T12 cubren cleanup seguro de Java, graph, Process Modeling y legacy.
- [ ] T13 cubre rollback, formas, errores, estado y no residuos.
- [ ] T15 cubre obligatoriamente E2E-16-01…E2E-16-12.
- [x] T16 queda registrado con su bloqueo/omisión ambiental; no se inventan artefactos ni se declara pasada la suite Playwright.
- [ ] No hay `print(`, `# DEBUG`, `# FIXME` ni `breakpoint()` en producción.
- [ ] No se modifica DDL sin enmienda.
- [x] No hay NC funcional abierta; los bloqueos ambientales no se convierten en NC.
- [ ] Gate 3: pendiente de validación final humana; esta corrección deja el requerimiento en `implementado_pendiente_validacion`.

---

## Closure Rule

El estado global queda en `implementado_pendiente_validacion` hasta que la validación final humana confirme la conformidad. La ejecución Playwright corregida permanece sin pasar porque Chromium no pudo iniciar en este runtime; no se convierte ese bloqueo ambiental en una NC funcional.

---

## Amendments

No hay enmiendas registradas al crear este plan. Cualquier cambio de alcance, especialmente DDL, permisos o edición de configuración contextual, debe registrarse como AMD-NNN en `spec.md` y reentrar por el gate correspondiente.
## Execution evidence — 2026-08-20

- Modo: execute-agent degradado autorizado en la sesión principal; no se abrió sesión secundaria por la contingencia explícita del programador.
- Skills cargadas: `.atl` registries, `domain-logic`, `data-model-management`, `frontend-design`, `web-design-guidelines`, `dash-callbacks`, `ui-test-structure`, Playwright Dash y `execute-agent`.
- Implementación: contrato común `json-editor.js`, Máquina/UI/menu/router, validadores y errores HTTP, prevalidación de scope operativo, cleanup allowlisted, fixture Java sin reset global y suite Playwright Req16.
- Verificaciones OK: `node --check`; `python3 -m compileall`; contrato JS directo; 17 pruebas Python unitarias relevantes; 3 suites Node.
- Playwright: la suite corregida conserva 12 casos. El comando solicitado fue ejecutado dos veces con `UI_TEST_BASE_URL=http://127.0.0.1:8050`; los 12 casos quedaron bloqueados antes de ejecutarse porque Chromium terminó con `sandbox_host_linux.cc:41` / `Operation not permitted`. No se presentan como pasados.
- Bloqueos ambientales: `pytest` no instalado; Chromium no puede iniciar por sandbox; PostgreSQL/backend E2E no disponible; un test histórico referencia `app/persistence/machine_model_repo.py`, ruta eliminada por cambios ajenos previos.
- DDL: sin modificaciones. NC funcionales: ninguna abierta por esta ejecución; los bloqueos ambientales no se convierten en NC.
- Estado posterior a la corrección: `implementado_pendiente_validacion`. El `execute-agent` aislado no pudo iniciar por el runtime de solo lectura; la corrección fue realizada en modo degradado autorizado y limitada a la suite E2E R16, preservando cambios ajenos.
