# Requerimiento 16 — Spec técnica: persistencia, UX JSON, navegación y limpieza de fixtures

> **Estado:** `done` (cierre administrativo)  
> **Gate 1:** aprobado por el programador por defecto (cierre administrativo)  
> **Gate 2:** aprobado por el programador por defecto (cierre administrativo)  
> **Gate 3 / validación final:** aprobado por el programador para cierre administrativo  
> **Fecha:** 2026-08-20  
> **Autor del artefacto:** requirements-agent  
> **Provenance:** generado en modo degradado autorizado por el programador humano.  
> **Motivo de contingencia:** `requirements-agent` no pudo completar la delegación obligatoria por restricción de runtime/red.  
> **Estado de workflow:** `done` por aprobación administrativa del programador; no se requieren validaciones adicionales.  
> **Verificación ambiental:** PostgreSQL, `pytest` y la ejecución E2E con Playwright no estuvieron disponibles; no se declaran como pasados.  
> **No incluye:** `task_plan.md` ni implementación de código

## Overview

Este requerimiento consolida cuatro problemas relacionados de la webapp JavaScript: limpieza segura de datos de prueba y grafos, menú lateral incompleto en Máquina, edición poco legible de campos JSONB y pérdida/no recuperación de datos de máquina genérica.

La implementación futura deberá mantener el boundary actual y aplicar una estrategia común de representación de JSON: modelo estructurado en UI, payload JSON nativo en API, validación de dominio/backend, persistencia en las tablas existentes y proyección equivalente al reabrir. Los campos de contexto y metadatos deberán clasificarse por editabilidad; no todo JSON de respuesta debe convertirse automáticamente en formulario.

## Alcance técnico y mapa de módulos existentes

| Área | Ubicación real inspeccionada | Responsabilidad actual / destino de la solución |
|---|---|---|
| Bootstrap y routing | `uc_bib_solv/webapp/js/app.js`, `core/router.js`, `views/index.js` | Resolver rutas, cargar catálogo/páginas y montar vistas. Mantener rutas y evitar resetear la selección al navegar. |
| Estado | `uc_bib_solv/webapp/js/core/state.js` | Estado de proceso, contrato, operación y máquina. Revisar la semántica de `setCurrentProcess`, `setCurrentContract` y `setCurrentOperation`, que hoy limpian selecciones descendientes. |
| Shell/menu | `uc_bib_solv/webapp/js/views/shell_v02.js`, `inicio.js`, `maquinas_v02.js` | Menús top/lateral. La lista local `MENU_ITEMS` de Máquina omite `modelado-procesos` y `contexto`; debe converger con la matriz autorizada. |
| Máquina UI | `uc_bib_solv/webapp/js/views/maquinas_v02.js` | Modal, tabs genérica/específica, carga de contexto, parseo actual con `JSON.parse`, guardado y refresco de catálogo. |
| API frontend | `uc_bib_solv/webapp/js/api/operational.js`, `api/client.js` | `createMachine`, `updateMachine`, `fetchMachineContext`; conservar contratos HTTP y errores estructurados. |
| Inbound backend | `uc_bib_solv/routes/operational.py`, `modules/operational_modeling/adapters/inbound/http/` | Rutas `/api/operational/machines`, `/context`, contratos HTTP y traducción de errores. |
| Casos de uso | `uc_bib_solv/modules/operational_modeling/application/use_cases.py` | Validación de payload de máquina y delegación a puerto de persistencia. |
| Dominio | `uc_bib_solv/modules/operational_modeling/domain/validators.py`, `entities.py`, `value_objects.py` y `uc_bib_solv/app/domain/machine_modeling/` | Reglas de nombre/estado/forma JSON y modelo de máquina; debe quedar una fuente normativa sin duplicidad activa. |
| Persistencia operativa | `uc_bib_solv/modules/operational_modeling/adapters/outbound/persistence.py`, `uc_bib_solv/repositories/operational_repository.py`, `uc_bib_solv/app/persistence/machine_model_repo.py`, `maquina_repo.py` | SQL, mapeo de JSONB y lectura/escritura. La solución deberá confirmar cuál adaptador canónico se usa en wiring y evitar que el contexto leído difiera del registro actualizado. |
| Esquema | `db_management/schema.sql` | Columnas JSONB y constraints de forma de `maquinas_tipo`, `maquina`, `machine_operation_configuration`, Process Modeling y contexto. No modificar en este requerimiento salvo enmienda. |
| Process Modeling UI | `uc_bib_solv/webapp/js/views/process-modeling.js`, `components/process-modeling/measurement.js`, `graph.js` | Edición de `pm_node_metadata.data` como campos por propiedad; objetos/listas siguen siendo textarea JSON. Debe integrarse en el inventario común. |
| Contexto UI | `uc_bib_solv/webapp/js/views/contexto.js` | Consulta y presentación de JSON estructurado en `<pre>`; clasificar como salida de solo lectura salvo decisión posterior. |
| Limpieza | `db_management/reset_db.py`, `scripts/cleanup_process_modeling_e2e.py`, `tests/java_analysis_fixture.py`, `tests/integration/test_graph_db_integration.py`, `tests/integration/test_process_modeling_db_integration.py`, `scripts/seed_*` | Definir allowlist, identificación, orden de dependencias, transacción y verificación posterior. `reset_db.py` es reset amplio de desarrollo y no es válido como limpieza E2E acotada. |
| Playwright | `playwright.config.js`, `tests/e2e/*.spec.js`, `tests/e2e/ok-reporter.js`, `.playwright-artifacts/test-results/` | Configuración existente con Chromium, workers=1 y artefactos por run; añadir casos del requerimiento siguiendo el contrato Dash/UI local disponible, sin generar aún el test. |

## Inventario real de campos JSON

### A. Gestión de Máquina

| Campo persistido | Tabla/columna | UI actual | Forma permitida observada | Validación/persistencia existente | Requisito de UX |
|---|---|---|---|---|---|
| `nominal_capacity` / Capacidad nominal | `maquinas_tipo.nominal_capacity` | `#machine-v02-type-capacity`, textarea | objeto | `jsonb_typeof = object`; frontend `parseModalJson` exige objeto/lista genérico, lo que permite un contrato incorrecto y produce el error observado | Editor guiado de propiedades de capacidad; validación de campos y mensaje localizado. |
| `control_systems` / Sistemas de control | `maquinas_tipo.control_systems` | `#machine-v02-type-controls`, textarea | lista | `jsonb_typeof = array` y validación backend/domain | Editor de lista repetible, con añadir/eliminar/reordenar si aplica. |
| `common_limitations` / Limitaciones comunes | `maquinas_tipo.common_limitations` | `#machine-v02-type-limitations`, textarea | objeto o lista | constraint permite objeto/lista; backend debe conservar la forma | Editor estructurado que indique la forma elegida y no fuerce JSON crudo. |
| `common_technical_characteristics` / Campos soportados/características comunes | `maquinas_tipo.common_technical_characteristics` | `#machine-v02-type-characteristics`, textarea | objeto o lista | constraint permite objeto/lista | Editor de campos/valores o lista según contrato aprobado. |
| `elements_zones_positions` | `maquinas_tipo.elements_zones_positions` | No aparece como control visible en el modal inspeccionado | lista | constraint exige array | Incluir en inventario y decidir si se añade al modal o se marca backend-only. |
| `specific_characteristics` | `maquina.specific_characteristics` | `#machine-v02-specific-characteristics`, textarea | objeto o lista | constraint permite objeto/lista | Editor común de objeto/lista. |
| `specific_parameters` | `maquina.specific_parameters` | `#machine-v02-specific-parameters`, textarea | lista | constraint exige array | Editor de lista repetible. |
| `specific_operating_ranges` | `maquina.specific_operating_ranges` | `#machine-v02-specific-ranges`, textarea | lista | constraint exige array | Editor de rangos con campos de límite/unidad, sujeto a contrato final. |
| `specific_limitations` | `maquina.specific_limitations` | `#machine-v02-specific-limitations`, textarea | objeto o lista | constraint permite objeto/lista | Editor estructurado. |
| `specific_instructions` | `maquina.specific_instructions`, | `#machine-v02-specific-instructions`, textarea | lista | constraint exige array | Editor de lista repetible. |
| `differences_from_machine_type` | `maquina.differences_from_machine_type` | `#machine-v02-specific-differences`, textarea | objeto o lista | constraint permite objeto/lista | Editor estructurado y recuperación equivalente. |
| `additional_inputs` | `machine_operation_configuration.additional_inputs` | Contexto/operación, no como bloque JSON independiente en el modal inspeccionado | lista | constraint exige array | Inventariar; no añadir al modal de tipo/máquina sin decisión de alcance. |
| `specific_controls` | `machine_operation_configuration.specific_controls` | Igual | lista | constraint exige array | Inventariar; editor contextual separado si es editable. |
| `available_measurements` | `machine_operation_configuration.available_measurements` | Igual | lista | constraint exige array | Inventariar; editor contextual separado si es editable. |
| `specific_safety_rules` | `machine_operation_configuration.specific_safety_rules` | Igual | lista | constraint exige array | Inventariar; editor contextual separado si es editable. |

### B. Modelado de procesos y contexto

| Campo | Ubicación | UI/uso | Estrategia requerida |
|---|---|---|---|
| `pm_node_metadata.metadata.data.*` | `pm_node_metadata.metadata`, `process-modeling.js` funciones `metadataEditFields` y `mergeEditedMetadataData` | Modal `#pm-metadata-modal`; cada propiedad escalar tiene control tipado, objetos/listas usan textarea JSON | Reutilizar el contrato común de tipos, parseo, error por campo y recuperación; preservar envelope y claves no editadas. |
| `pm_process_node.properties` y `properties.etapas` | `schema.sql`, `process_modeling_service.py`, `process-modeling.js` | Etapas se editan con controles estructurados; properties se proyecta en el grafo | Mantener etapas como estructura versionada; no degradarlas a texto JSON. |
| `pm_context_record.payload` | `schema.sql`, `services/process_modeling_service.py`, `views/contexto.js` | Consulta de contexto; se muestra JSON formateado | Solo lectura en este requerimiento, con errores de carga visibles. |
| `pm_context_record.source`, `provenance`, `supports` | mismos módulos | Consulta/trazabilidad | Solo lectura/ingesta; validar objeto cuando se reciba y no confundir salida con formulario editable. |
| `node.metadata` / `relationship.metadata` | `schema.sql`, graph repositories | Proyección de grafo y contexto | No exponer edición genérica en Máquina; limpiar solo si el nodo pertenece a fixture autorizado. |

### C. Campos no JSON que deben quedar fuera de la abstracción JSON

Los inputs de nombre, estado, descripciones, proceso, contrato, stock y fechas no son campos JSON por sí mismos. Pueden compartir componentes de formulario y errores, pero no deben serializarse como JSON por conveniencia.

## Requisitos funcionales técnicos

### FR-16-01 — Contrato común de edición estructurada

La UI DEBERÁ representar cada campo editable con un modelo que distinga al menos: `field`, `kind`, `nullable`, `value`, `errors` y `dirty`. Las listas DEBERÁN poder editarse como filas/elementos; los objetos conocidos DEBERÁN poder editarse por propiedades; los campos de esquema abierto DEBERÁN disponer de un modo avanzado claramente separado y validado.

La UI NO DEBERÁ enviar una cadena JSON como sustituto silencioso de un objeto/lista. Antes de llamar a `createMachine`/`updateMachine`, deberá construir un objeto JS nativo y conservar nulos permitidos como `null` o ausencia según contrato.

### FR-16-02 — Conversión y validación backend

El backend DEBERÁ aceptar únicamente el payload JSON HTTP nativo, validar tipo, nulabilidad, forma por campo y reglas de dominio antes de persistir. La validación frontend es de interacción y usabilidad; la backend/domain es normativa.

Para `nominal_capacity`, el contrato DEBERÁ ser explícito: objeto JSON o la forma aprobada en Gate 1; no se deberá aplicar la regla genérica objeto/lista si la columna exige objeto. Los errores DEBERÁN incluir código estable, campo y mensaje apto para mostrarse junto al control.

### FR-16-03 — Persistencia y recuperación

La escritura de tipo de máquina y máquina específica DEBERÁ ser atómica respecto a su operación lógica: un fallo de validación o persistencia no puede dejar solo una parte del modal guardada. La lectura de `fetchMachineContext` y la respuesta de update/create DEBERÁN proyectar los mismos nombres y formas JSON que consume la UI.

Después de guardar, la UI DEBERÁ refrescar catálogo/contexto desde backend, no solo modificar la copia local. Al reabrir el modal y tras salir/volver a entrar en Máquina, los campos DEBERÁN reconstruirse desde la respuesta persistida.

### FR-16-04 — Estado y navegación

La selección de máquina DEBERÁ conservarse cuando el usuario navegue a una ruta autorizada y vuelva, siempre que el registro siga dentro del alcance. Los setters de estado deberán diferenciar un cambio intencional de alcance de un cambio de ruta; no se aceptará limpiar `currentMachine` como efecto lateral de montar la página.

La matriz de menú deberá ser única o derivada de una fuente común para que Máquina incluya `modelado-procesos` y `contexto` cuando el usuario esté autorizado.

### FR-16-05 — Limpieza segura

La limpieza E2E DEBERÁ usar IDs devueltos por la creación o prefijos `TEST_`/prefijos fixture documentados, con allowlist exacta. Deberá ejecutarse en transacción, borrar primero dependientes y después padres, incluir nodos y relaciones asociadas, y verificar conteos posteriores.

El fixture Java deberá poder limpiarse por un identificador raíz o por sus identificadores devueltos, cubriendo proceso, contrato, máquina, análisis, causas, hipótesis, `node` y `relationship`. Los tests IT graph y Process Modeling deberán registrar sus IDs y limpiar `pm_*`, graph y tablas legacy relacionadas. Un target no perteneciente a la allowlist deberá producir error y cero operaciones destructivas.

## Responsabilidades por capa

| Capa | Obligaciones |
|---|---|
| Frontend/UI | Renderizar controles estructurados, etiquetas/ayuda, estado dirty, validación sintáctica/interactiva, errores por campo, serialización a objeto JS, selección/navegación y reapertura desde API. No será fuente única de invariantes. |
| Inbound/API | Mantener rutas/métodos/códigos, parsear JSON HTTP, normalizar errores a `status/data/code/field` y no aceptar formatos ambiguos sin compatibilidad documentada. |
| Application | Coordinar create/update/context, aplicar validadores de dominio y asegurar que la escritura use una operación coherente. |
| Domain | Definir tipos permitidos, nulabilidad, reglas de `nominal_capacity` y resto de campos, estados de máquina y errores estables; sin Flask, SQL ni psycopg2. |
| Outbound/persistencia | Mapear objeto/lista a JSONB con parámetros, leer sin cache obsoleto después de escribir, respetar transacciones y proyectar la forma canónica. |
| DB/schema | Mantener constraints JSONB existentes como última barrera; cualquier cambio DDL requiere enmienda explícita. |
| Test/operación | Crear datos con prefijo/IDs de test, limpiar en `afterEach`/`afterAll` con recuperación segura, escribir artefactos y fallar si quedan huérfanos. |

## Plan de pruebas automáticas E2E con Playwright

Este plan forma parte del requisito y de su estrategia de verificación. No crea tests ni `task_plan.md` en esta fase.

### Precondiciones y datos

1. Backend webapp disponible mediante `UI_TEST_BASE_URL` o URL equivalente y PostgreSQL de test accesible.
2. Usuario E2E autorizado para Máquina, Modelado-Procesos y Contexto; si existen roles distintos, ejecutar una matriz por rol.
3. Crear un tipo/máquina con identificadores `TEST_REQ16_<timestamp>` y guardar los IDs de respuesta.
4. Payload válido mínimo de tipo: nombre, principio, descripción y `nominal_capacity` como objeto; listas para controles y características donde aplique.
5. Payload inválido: capacidad nominal con forma no permitida, JSON truncado en modo avanzado y lista con elemento inválido.
6. Fixtures existentes: fixture Java y un conjunto IT graph/Process Modeling con IDs capturados; no usar `reset_db.py` como cleanup del caso E2E.

### Casos y cobertura

| ID | Caso | Datos/precondiciones | Aserciones mínimas |
|---|---|---|---|
| E2E-16-01 | Menú lateral en Máquina | Login; navegar `#/maquinas_v02` | Existen accesos visibles/autorizados a `#/modelado-procesos` y `#/contexto`; no hay redirección inesperada. |
| E2E-16-02 | Navegación y retorno conserva selección | Máquina TEST seleccionada; ir a Modelado-Procesos y Contexto; volver a Máquina | La máquina seleccionada y su nombre/ID siguen siendo los mismos; la UI vuelve a pedir/mostrar contexto del mismo ID. |
| E2E-16-03 | Abrir modal y editar tipo genérico | Abrir Gestión de máquina; usar controles de capacidad, controles, limitaciones y características | Los campos no son únicamente un textarea JSON manual; añadir/quitar/modificar refleja el modelo estructurado y marca el formulario dirty. |
| E2E-16-04 | Validación de capacidad nominal | Introducir valor inválido y guardar | El modal permanece abierto, el error identifica Capacidad nominal, no se hace una escritura exitosa y el error es accesible. |
| E2E-16-05 | Guardar y reabrir | Editar todos los campos JSON del tipo con objeto/listas anidadas | Respuesta HTTP exitosa; cerrar/reabrir recupera valores equivalentes; comparar `JSON.stringify` normalizado o snapshot semántico. |
| E2E-16-06 | Salir y volver a Máquina | Tras guardar, cambiar de ruta y volver sin recargar y con recarga completa | Se recuperan tipo/máquina desde backend y no desde un formulario vacío o selección de otra máquina. |
| E2E-16-07 | Campos específicos/contextuales | Editar máquina específica y, si está dentro del alcance aprobado, configuración máquina-operación | Cada campo se valida según lista/objeto; reapertura conserva separación tipo/máquina/configuración. |
| E2E-16-08 | Metadatos de Process Modeling | Seleccionar nodo con `metadata.data` con scalar, boolean, número, objeto y lista | El modal conserva tipos; objetos/listas inválidos muestran error; guardar y volver a seleccionar conserva envelope y claves no editadas. |
| E2E-16-09 | Contexto de solo lectura | Navegar Contexto con una versión válida e inválida | JSON estructurado se muestra legible; error de versión/permisos es visible y no ofrece escritura accidental. |
| E2E-16-10 | Limpieza segura positiva | Ejecutar cleanup con IDs/prefijos creados por E2E, Java fixture e IT graph | Conteos posteriores son cero para todos los dependientes, nodos y relaciones del fixture; datos no TEST permanecen. |
| E2E-16-11 | Limpieza segura negativa | Ejecutar cleanup con ID existente sin prefijo permitido o prefijo desconocido | Comando/API falla antes de borrar; verificar que el registro protegido sigue existiendo. |
| E2E-16-12 | Repetición idempotente | Ejecutar cleanup dos veces sobre el mismo conjunto | Primera ejecución limpia; segunda no borra fuera de alcance y devuelve resultado explícito/idempotente. |

### Reglas de automatización y artefactos

- Usar `playwright.config.js`, `tests/e2e/` y `.playwright-artifacts/test-results/<run-id>/`.
- Seguir la URL backend directa cuando el despliegue sea Dataiku, evitando iframe; en local usar `UI_TEST_BASE_URL`.
- Cada caso que inserte datos deberá usar `TEST_` + timestamp y registrar IDs; el cleanup se intentará aunque falle una aserción.
- Cada caso deberá registrar resultado, respuesta relevante y screenshot/trace en fallo. El resumen deberá indicar casos omitidos por falta de entorno, no presentarlos como pasados.
- Verificar requests 4xx/5xx, consola y ausencia de residuos al terminar.

## Criterios de aceptación técnicos

- **AC-16-01 Inventario:** el spec contiene todos los campos JSON encontrados en `schema.sql`, `maquinas_tipo`, `maquina`, `machine_operation_configuration`, `pm_node_metadata`, `pm_process_node`, `pm_context_record`, `node` y `relationship`, con ruta de UI/backend/persistencia y clasificación editable/solo lectura.
- **AC-16-02 UX JSON:** Playwright comprueba que los cuatro campos destacados y los campos específicos se editan con controles estructurados o modo avanzado explícito, con etiquetas y errores por campo.
- **AC-16-03 Capacidad nominal:** una forma inválida no genera POST/PATCH exitoso; la respuesta visible incluye campo/código y el modal sigue abierto.
- **AC-16-04 Persistencia:** un objeto y una lista anidados guardados se recuperan equivalentes tras cerrar/reabrir, navegar fuera y recargar.
- **AC-16-05 Backend:** tests de dominio/API comprueban forma, nulabilidad, errores estables y que no hay escritura parcial cuando falla un campo JSON.
- **AC-16-06 Navegación:** desde Máquina se ven y funcionan Modelado-Procesos y Contexto para cada rol autorizado; la selección de máquina no se limpia solo por cambiar de ruta.
- **AC-16-07 Limpieza:** los casos positivos dejan cero datos del fixture en tablas legacy, `machine_operation_configuration`, `pm_*`, `node` y `relationship` que les correspondan, y los casos negativos no borran registros protegidos.
- **AC-16-08 Repetibilidad:** dos ejecuciones consecutivas con datos nuevos pasan y no dejan filas `TEST_`/fixture; la segunda limpieza es segura e idempotente.
- **AC-16-09 Artefactos:** cada run escribe resumen, logs y artefactos Playwright bajo `.playwright-artifacts/`.
- **AC-16-10 Gate:** el requisito permanece `spec_pendiente_validacion` hasta aprobación humana explícita; no se permite implementar ni crear `task_plan.md` antes de Gate 1.

## Requisitos no funcionales y restricciones

- Seguridad: SQL parametrizado; allowlist de cleanup; transacción; no truncado global E2E.
- Integridad: constraints JSONB y relaciones FK existentes siguen siendo válidos.
- Usabilidad: etiquetas, ayuda, mensajes de error accesibles, teclado y preservación de valores no modificados.
- Compatibilidad: conservar rutas `/api/operational/*`, nombres de campos y forma general `status/data` salvo aprobación.
- Rendimiento: abrir/reabrir no deberá multiplicar indefinidamente llamadas de catálogo/contexto; medir requests del caso E2E y registrar cualquier cambio relevante.
- Worktree: existen cambios ajenos y eliminaciones extensas; la implementación futura deberá limitarse a los módulos del inventario y no restaurar ni limpiar cambios no relacionados.

## Preguntas para aclaración

1. **Q-16-01 (bloqueante de UX):** ¿Se aprueba la combinación de controles guiados para campos conocidos y editor avanzado opcional para estructuras abiertas? Alternativas: solo filas/propiedades; solo editor formateado; combinación.
2. **Q-16-02 (operación de cleanup):** ¿Debe existir un comando manual de recuperación además del cleanup automático de cada E2E?
3. **Q-16-03 (permisos):** ¿Qué roles tienen autorización para ver Modelado-Procesos y Contexto desde Máquina y deben cubrirse en Playwright?
4. **Q-16-04 (configuración contextual):** ¿Los cuatro campos de `machine_operation_configuration` se editan dentro de Gestión de máquina en este requerimiento o solo se inventarían y se deja su UX para una fase posterior?
5. **Q-16-05 (compatibilidad de datos):** ¿Existen valores históricos de `nominal_capacity` con forma lista o string que deban migrarse/adaptarse, o la solución puede rechazar esos valores y mostrar corrección requerida?

## Decisiones y supuestos explícitos

| ID | Decisión / supuesto | Evidencia | Estado |
|---|---|---|---|
| D-16-01 | Se conserva `uc_bib_solv/webapp` como frontend y `modules/operational_modeling` como boundary backend operativo. | Árbol e imports inspeccionados. | Propuesta pendiente Gate 1 |
| D-16-02 | `db_management/schema.sql` permanece fuente de restricciones JSONB; no se cambia DDL en este artefacto. | Constraints observados en líneas de `maquinas_tipo`, `maquina`, configuración y PM. | Aplicable salvo enmienda |
| D-16-03 | Contexto `payload/source/provenance/supports` se considera salida/ingesta de solo lectura para este alcance. | `views/contexto.js` y servicios de contexto. | Pendiente confirmación |
| D-16-04 | La limpieza E2E será acotada por IDs/prefijos allowlisted y no usará `reset_db.py`. | `reset_db.py` hace `TRUNCATE ... CASCADE`; no es seguro como cleanup de un E2E. | Propuesta pendiente Gate 1 |
| D-16-05 | La solución no crea `task_plan.md` y el plan Playwright vive en este spec. | Instrucción del programador. | Confirmada |

## Out of scope

- Implementación de frontend/backend, migraciones DDL, scripts de cleanup o tests Playwright.
- Cambios de permisos no aprobados, autenticación o rediseño de páginas no relacionadas.
- Limpieza masiva de la base de datos fuera de fixtures identificados.
- Reemplazo de Process Modeling, contexto estructurado o grafo causal.
- Marcado de `done`, aprobación de Gate 1 o creación de `task_plan.md`.

## Decision Log

| ID | Fecha | Decisión | Responsable |
|---|---|---|---|
| D-16-06 | 2026-08-20 | El spec queda cerrado administrativamente como `done`; Gate 1, Gate 2 y Gate 3 se consideran aprobados por el programador por defecto, sin reabrir preguntas históricas ni ampliar el alcance funcional. | programador humano |
| D-16-07 | 2026-08-20 | El inventario se construyó con rutas reales del worktree y se preservan cambios ajenos observados en `git status`. | requirements-agent |
| D-16-08 | 2026-08-20 | El cierre administrativo preserva como no ejecutadas las verificaciones dependientes de PostgreSQL, `pytest` y Playwright; no se presentan como pasadas. | programador humano |

## Reporte de fase

- Sub-agente lógico solicitado por el programador: `requirements-agent`.
- Modo de generación: degradado, autorizado explícitamente por el programador humano el 2026-08-20.
- Motivo de contingencia: `requirements-agent` no pudo completar la delegación obligatoria por restricción de runtime/red.
- Ejecución: directa en la sesión principal, sin delegar a otro agente, conforme a la instrucción explícita del programador.
- Modelo: runtime actual de Codex; no se inició una sesión secundaria ni se dispuso de un `session_id` separado.
- Skills/instrucciones leídas: `.atl/sub-agent-registry.md`, `.atl/skill-registry.md`, `common_spec_driven_development/sub_agents/requirements-agent.md`, `common_spec_driven_development/SKILLs/requirement-doc/SKILL.md`, `webapp-architecture`, `web-Dash-Dataiku`, `data-model-management`, `domain-logic`, `frontend-design`, `dash-callbacks`, `postgresql-primary-persistence`, `web-design-guidelines`, `ui-test-structure` y `.github/instructions/skill-playwright-dash-webapp.instructions.md`.
- Archivos inspeccionados: `AGENTS.md`, `context.md`, `git status --short`, `db_management/schema.sql`, `db_management/reset_db.py`, `scripts/cleanup_process_modeling_e2e.py`, `tests/java_analysis_fixture.py`, tests de integración graph/process modeling, `playwright.config.js`, `package.json`, `uc_bib_solv/webapp/js/app.js`, `core/router.js`, `core/state.js`, `views/index.js`, `views/shell_v02.js`, `views/inicio.js`, `views/maquinas_v02.js`, `views/process-modeling.js`, `views/contexto.js`, APIs, rutas, servicios, casos de uso, validadores y adaptadores de persistencia relevantes.
- Archivos escritos: `requerimientos_cliente/requerimiento_16.md` y `requeriments_spec_driven_development/requerimiento_16/spec.md`.
- Archivos de producto modificados: ninguno.
- `task_plan.md`: no creado.
- Estado resultante: `done` por cierre administrativo; Gate 1, Gate 2 y Gate 3 aprobados por el programador.
- Verificación ambiental preservada: PostgreSQL, `pytest` y Playwright no estuvieron disponibles y no se declaran como pasados.
