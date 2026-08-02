# NC Log — requerimiento_12

## Metadata
- Requirement ID: `requerimiento_12`
- Spec File: `./requeriments_spec_driven_development/requerimiento_12/spec.md`
- Task Plan: `./requeriments_spec_driven_development/requerimiento_12/task_plan.md`
- Created At: `2026-08-01`
- Last Updated: `2026-08-02` (NC-001..NC-005 resueltas por validación humana; NC-006 abierta)

---

## Estado de cierre del requerimiento

Estado actual de NCs: `NC-006 abierta; Gate 3 pendiente; requerimiento bloqueado para cierre`

---

## Registro de No Conformidades

### NC-001

| Campo | Valor |
|-------|-------|
| **ID** | NC-001 |
| **Fecha deteccion** | 2026-08-01 |
| **Detectado por** | `programador_humano` durante validacion de Gate 3 |
| **Descripcion** | El fixture `proceso_BU_estructurado.md` no fue integrado/cargado como datos verificables en la version BPM `886ffe83-5235-4eb8-8c1d-528041518617`. La aplicacion local no permite verificar en esa instancia la creacion o presencia de nodos de proceso, operaciones, etapas, stocks y otros bloques, sus detalles estructurados, la incorporacion de maquinas al desglose ni las relaciones, contexto, metodologia y gaps descritos por el fixture. |
| **Comportamiento esperado** | El `task_plan.md` aprobado, T7, exige ejecutar el fixture BU como prueba de cobertura y registrar gaps; sus acciones incluyen convertir los ejemplos en datos/peticiones con contratos genericos y sus salidas incluyen datos/comandos de prueba repetibles. Para la validacion solicitada, esto debia materializarse en una carga/seed reproducible sobre la version BPM indicada y en evidencia UI/API consultable. El `spec.md` limita BU/MACBU a fixture de cobertura/gap discovery (FR-10, AC-13) y mantiene el modelo generalista. |
| **Comportamiento observado** | Solo se genero `tests/req12_fixture_coverage.md`, un reporte estatico de cobertura/gaps. No existe seed/carga del fixture BU para la version indicada ni evidencia de consulta UI/API de esa version; los scripts de seed existentes corresponden a otros fixtures/procesos y la URL local no estaba disponible durante la comprobacion (`curl` sin servicio en 8050/8051). |
| **Evidencia** | `spec.md`: overview y FR-10/AC-13 definen BU como fixture; `task_plan.md`: T7, especialmente Inputs/Actions/Outputs/Verification, exige ejecutar datos/peticiones y evidencia repetible pero no fija version BPM, seed ni validacion UI; `tests/req12_fixture_coverage.md`: reporte estatico sin carga; `scripts/seed_process_modeling_hierarchical_test.py`: seed de otro fixture `TEST_PM_UI_*`; `scripts/seed_process_node_metadata.py`: seed generico de metadatos de operaciones existentes, no del fixture BU ni de la version indicada; endpoint `GET /api/process-modeling/versions/<version_id>` existente en `uc_bib_solv/webapp_java/python-backend/routes/process_modeling.py`, sin datos cargados verificables. |
| **Causa raiz** | `task_plan` |
| **Punto de re-entrada** | `plan-task-agent` |
| **Estado** | `resolved` |
| **Validacion de cierre** | `resuelta`; validador: `programador_humano`; fecha: `2026-08-02` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-08-01 | NC registrada y clasificada como `task_plan`; se prepara handoff para completar T7/T8 con seed/carga generica reproducible y validacion de la version BPM indicada. `task_plan.md` no se modifica en esta fase por la regla de autoria del plan. | `correccion pendiente de plan-task-agent` |
| 2026-08-01 | `plan-task-agent` actualiza `task_plan.md` en reentrada: T7/T8 incluyen seed/carga generalista reproducible e idempotente para `886ffe83-5235-4eb8-8c1d-528041518617`, limpieza acotada, nodos/relaciones/detalles/recursos/metodologia/contexto, gaps y evidencia API/UI. | Plan corregido preparado para Gate 2; NC sigue abierta en `in_correction`. |
| 2026-08-01 | `plan-task-agent` confirma que el plan corregido quedó preparado para Gate 2. | NC-001 sigue abierta en `in_correction`. |
| 2026-08-02 | El programador humano confirma explícitamente el cierre de NC-001. | La evidencia de seed/carga, persistencia, API/UI, limpieza acotada e idempotencia queda validada para el alcance de la NC; NC-001 pasa a `resolved`. Gate 3 global permanece pendiente por NC-006. |

---

### NC-002

| Campo | Valor |
|-------|-------|
| **ID** | NC-002 |
| **Fecha deteccion** | 2026-08-01 |
| **Detectado por** | `programador_humano` durante validacion de Gate 3 |
| **Descripcion** | En la version BPM exacta `886ffe83-5235-4eb8-8c1d-528041518617`, ninguna operacion muestra descripcion en la webapp de modelado de procesos. |
| **Comportamiento esperado** | Cada operacion debe conservar una descripcion persistida y visible en la tarjeta/flujo o panel de contexto; API y UI deben conservar la semantica del nodo. |
| **Comportamiento observado** | La webapp no muestra descripcion para ninguna operacion en `http://127.0.0.1:8050/#/modelado-procesos?version_id=886ffe83-5235-4eb8-8c1d-528041518617`. La reproduccion runtime y la respuesta API/DB no pudieron completarse en esta sesion porque 8050 y PostgreSQL no estaban disponibles. La evidencia estatica muestra que el repositorio proyecta `description`, pero no acredita su presencia/visibilidad runtime en la version objetivo. |
| **Evidencia** | URL exacta aportada por el programador; `curl` a la URL y a `GET /api/process-modeling/versions/886ffe83-5235-4eb8-8c1d-528041518617` devuelve error de conexion; `pg_isready` indica que `/var/run/postgresql:5432` no responde; `spec.md` FR-03/AC-02/AC-03; `task_plan.md` T7/T8 exige persistencia, API y UI; `app/persistence/pm_process_repo.py` contiene fallback de `description` desde metadata; `graph.js` solo puede renderizar lo recibido como `node.description`/metadata. |
| **Causa raiz** | `implementation` |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `resolved` |
| **Intento** | 2 |
| **Validacion de cierre** | `resuelta`; validador: `programador_humano`; fecha: `2026-08-02` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-08-01 | `nc-resolution-agent` registra NC-002 y clasifica `implementation`; se delega diagnostico/correccion a `execute-agent` en sesion aislada con modelo `gpt-5.6-luna` y razonamiento `medium`. | Correccion pendiente; no se cierra NC-002 ni el requerimiento. |
| 2026-08-01 | La sesion aislada de `execute-agent` se intento mediante `codex exec --ephemeral --model gpt-5.6-luna -c model_reasoning_effort=medium`; fallo antes de ejecutar la tarea con `failed to initialize in-process app-server client: Read-only file system`. | No hubo agente corrector ejecutado, no hay cambios de codigo ni pruebas correctivas; NC-002 permanece `in_correction` y requiere reintento con el runtime de delegacion operativo. |
| 2026-08-01 | Intento 2 completado por `execute-agent` en sesión aislada `019fbedb-1fac-71e1-94de-4225f91e4a3f`, con `gpt-5.6-luna` y `model_reasoning_effort=medium`. `scripts/seed_req12_bu_fixture.py` se corrigió para consumir el `node_id` devuelto por `RETURNING` de metadata. Verificación estática: 8 pruebas unitarias OK y `py_compile` OK. | Evidencia runtime documentada: `seed --json` exit 0 para la versión `886ffe83-5235-4eb8-8c1d-528041518617`; antes `nodes16/transitions15/metadata16/context18`, cleanup `16/15/18`, después `16/15/16/18`, `operations13`, `with_description13`, `without_description0`; API GET exacta HTTP 200 con `13/13` descripciones; Playwright en la URL exacta mostró 13 tarjetas de operación y 13 descripciones no vacías. La webapp no estaba disponible inicialmente y fue levantada temporalmente para esta verificación. Corrección técnicamente evidenciada; NC-002 permanece `in_correction`, con cierre y Gate 3 pendientes de validación humana. |
| 2026-08-01 | El programador humano revalida la misma URL y comunica que sigue sin mostrarse ninguna descripción. La observación confirma que NC-002 no puede cerrarse. Sus dos intentos ya están agotados: se activa el escalado humano obligatorio. La corrección adicional se registra separadamente como NC-003 y no reinicia ni oculta el contador de NC-002. | NC-002 permanece `in_correction`; no se autoriza un tercer intento silencioso ni el cierre automático. |
| 2026-08-02 | El programador humano confirma explícitamente el cierre de NC-002. | La evidencia técnica posterior y la validación humana de cierre quedan registradas; NC-002 pasa a `resolved`. Gate 3 global permanece pendiente por NC-006. |

---

### NC-003

| Campo | Valor |
|-------|-------|
| **ID** | NC-003 |
| **Fecha deteccion** | 2026-08-01 |
| **Detectado por** | `nc-resolution-agent` a partir de la revalidación humana de NC-002 y del alcance explícito de la corrección |
| **NC relacionada** | NC-002; la relación no sustituye, cierra ni reinicia NC-002 |
| **Descripcion** | La implementación previa podía producir valores no vacíos, pero no acreditaba que las descripciones fueran derivadas de `proceso_BU_estructurado.md` ni que máquinas identificadas, procesos y contratos quedaran integrados en los contratos BPM/contexto genéricos existentes. La revalidación humana además mantiene el síntoma visible en la versión exacta `886ffe83-5235-4eb8-8c1d-528041518617`. |
| **Comportamiento esperado** | El fixture debe alimentar descripciones funcionales reales de proceso, operaciones y recursos/máquinas, incluyendo objetivo, entradas, salidas, controles, parámetros y desconocidos cuando aplique. Las asignaciones operación-máquina y los contratos deben persistirse mediante `pm_process_node`, `pm_process_node_metadata` y `pm_context_record`/contratos BPM existentes, conservarse en la API exacta y mostrarse en la UI. No se crean tablas, modelos, rutas ni repositorios especializados BU/MACBU. |
| **Comportamiento observado** | La evidencia previa del agente indicaba runtime bloqueado/no acreditado porque PostgreSQL y 8050 no estaban disponibles. Esa evidencia fue superada por la verificación runtime real posterior a la corrección: PostgreSQL activo, seed, persistencia, API y Playwright ejecutados sobre la versión exacta objetivo. |
| **Evidencia** | La evidencia previa del agente decía explícitamente runtime bloqueado/no acreditado; queda superada por esta verificación posterior. `PostgreSQL activo`; `python3 scripts/seed_req12_bu_fixture.py --json` terminó con exit `0`; target exacto `886ffe83-5235-4eb8-8c1d-528041518617`; carga `16 nodes/15 transitions/14 resources/4 gaps`; `description_evidence`: `operations13`, `with_description13`, `without_description0`; conteos posteriores `nodes16/transitions15/metadata16/context31` tras `after nodes16/transitions15/metadata16/context31`; API GET exacta HTTP 200 con `data.nodes 18`, `operations13`, `descriptions13/13` y `process.process_description` funcional; contexto SQL `29 declarations + 1 evidence + 1 fact` y `13 operation_contract records`; Playwright en la URL exacta mostró `13 operation cards` y `13 non-empty descriptions`, con texto funcional de dosificación. |
| **Causa raiz** | `implementation` |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `resolved` |
| **Intento** | 1 de NC-003; no modifica el límite agotado de NC-002 |
| **Validacion de cierre** | `resuelta`; validador: `programador_humano`; fecha: `2026-08-02` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-08-01 | `nc-resolution-agent` registra NC-003 como alcance de implementación separado, vinculado a la revalidación de NC-002. Se delega a `execute-agent` en sesión aislada `019fbee7-116f-74f3-b750-93588929246e`, con `gpt-5.6-luna` y `model_reasoning_effort=medium`. | Corrección implementada y pendiente de verificación runtime/humana; NC-003 permanece `in_correction`. |
| 2026-08-01 | El corrector deriva descripciones funcionales desde el fixture, añade detalles de proceso/operación/recurso, contratos de operación y asignaciones operación-máquina en el contexto genérico existente, y ajusta los fallbacks de renderizado. | Verificación estática OK; PostgreSQL y 8050 no responden, por lo que no hay evidencia positiva de seed/API/UI runtime. NC-003 no se cierra. |
| 2026-08-01 | Verificación runtime real posterior a la corrección: PostgreSQL activo; `python3 scripts/seed_req12_bu_fixture.py --json` exit `0`; target exacto `886ffe83-5235-4eb8-8c1d-528041518617`; carga `16 nodes/15 transitions/14 resources/4 gaps`; `description_evidence operations13, with_description13, without_description0`; después `nodes16/transitions15/metadata16/context31`. | La evidencia previa del agente que decía runtime bloqueado/no acreditado queda superada: API GET exacta HTTP 200, `data.nodes 18`, `operations13`, `descriptions13/13`, `process.process_description` funcional; contexto SQL `29 declarations + 1 evidence + 1 fact` y `13 operation_contract records`; Playwright exacto con `13 operation cards` y `13 non-empty descriptions` con texto funcional de dosificación. NC-003 permanece `in_correction`; Gate 3 pendiente. |
| 2026-08-02 | El programador humano confirma explícitamente el cierre de NC-003. | La evidencia técnica posterior y la validación humana de cierre quedan registradas; NC-003 pasa a `resolved`. Gate 3 global permanece pendiente por NC-006. |

---

### NC-004

| Campo | Valor |
|-------|-------|
| **ID** | NC-004 |
| **Fecha deteccion** | 2026-08-01 |
| **Detectado por** | `programador_humano` durante revalidación UI de NC-003 |
| **NC relacionada** | NC-003; no sustituye, cierra ni reinicia NC-001/NC-002/NC-003 |
| **Descripcion** | En la URL exacta `http://127.0.0.1:8050/#/modelado-procesos?version_id=886ffe83-5235-4eb8-8c1d-528041518617`, el panel derecho en modo lectura no muestra la descripción funcional ni los bloques enriquecidos del nodo; la información solo aparece al pulsar `Editar`, dentro del JSON. |
| **Comportamiento esperado** | Sin editar JSON, el panel debe mostrar cuando existan la descripción funcional, objetivo, entradas, salidas, parámetros, controles y contratos/asignaciones, reutilizando la proyección JSONB/API existente. |
| **Comportamiento observado** | El panel de lectura no presenta la descripción funcional persistida ni los bloques solicitados, aunque el formulario de edición permite inspeccionarlos como documento JSON. |
| **Evidencia** | URL aportada por el programador; `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js` (`renderMetadataPanel(false)`); `uc_bib_solv/webapp_java/webapp/js/api/process-modeling.js`; `app/persistence/pm_process_repo.py`; `graph.js`; `measurement.js`; `spec.md` FR-03/AC-02/AC-03 y `task_plan.md` T5/T7/T8. |
| **Causa raiz** | `implementation` |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `resolved` |
| **NC relacionada: intento** | 1 de NC-004; no modifica el límite agotado ni el escalado de NC-002 |
| **Validacion de cierre** | `resuelta`; validador: `programador_humano`; fecha: `2026-08-02` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-08-01 | `nc-resolution-agent` registra NC-004 como desviación de implementación separada y correlativa, vinculada a NC-003. Se delega la corrección a `execute-agent` en sesión aislada con `gpt-5.6-luna` y `model_reasoning_effort=medium`. | Corrección pendiente; NC-001/NC-002/NC-003/NC-004 permanecen abiertas y NC-002 conserva su escalado. |
| 2026-08-01 | Primera sesión aislada intentó abrir una sesión hija y falló por `Read-only file system`; no hubo cambios. Reintento ejecutado en la sesión `019fbef8-8cdb-7a80-96ac-a8061495c4ed` con `gpt-5.6-luna` y `model_reasoning_effort=medium`, que aplicó la corrección en frontend y tests. | Tests JS focalizados/regresión y tests Python de API/servicio/contexto OK; PostgreSQL/8050 no disponibles y Chromium Playwright bloqueado por sandbox. NC-004 sigue `in_correction`; Gate 3 humano pendiente. |
| 2026-08-02 | El programador humano confirma explícitamente el cierre de NC-004. | La corrección frontend y sus pruebas quedan aceptadas para el alcance de la NC; NC-004 pasa a `resolved`. Gate 3 global permanece pendiente por NC-006. |

### NC-005

| Campo | Valor |
|-------|-------|
| **ID** | NC-005 |
| **Fecha deteccion** | 2026-08-01 |
| **Detectado por** | `programador_humano` durante revalidación de persistencia del fixture |
| **Descripcion** | Las máquinas, procesos/operaciones y contratos sembrados para la versión BPM `886ffe83-5235-4eb8-8c1d-528041518617` no están creados o relacionados de forma verificable con los modelos canónicos existentes de la aplicación. El seed actual deja recursos y asignaciones como nombres/IDs textuales en JSONB/contexto auxiliar, sin garantizar correspondencia con `proceso`, `contrato`, `maquina` y `contrato_maquina`, ni una relación canónica operación↔máquina. |
| **Comportamiento esperado** | Cada proceso, operación genérica única, máquina y contrato del fixture debe existir en el modelo canónico correspondiente o portar una clave explícita, consistente y verificable hacia él. La relación operación↔máquina debe conservar cardinalidad muchos-a-muchos y sus particularidades sin duplicar operaciones por máquina. API, UI, PostgreSQL y seed idempotente deben exponer la misma identidad relacional. No se crean modelos/tablas/rutas BU/MACBU. |
| **Comportamiento observado** | El diagnóstico inicial indicaba que `scripts/seed_req12_bu_fixture.py` solo persistía `pm_process_node`, `pm_process_node_metadata` y `pm_context_record`, con asignaciones textuales y sin verificación canónica; también indicaba que el runtime seguía bloqueado. Ese diagnóstico inicial queda superado por la verificación del 2026-08-01: el seed exacto se ejecutó dos veces sobre PostgreSQL y la API/UI fueron verificadas sobre la versión exacta. La validación humana del 2026-08-01 confirma la finalización de NC-005. |
| **Evidencia** | `db/schema.sql` define `proceso(id)`, `maquina(id)`, `contrato(id, proceso_id)` y `contrato_maquina(contrato_id, maquina_id)` con FKs; `app/persistence/{proceso,maquina,contrato}_repo.py` y `routes/operational.py` son los módulos existentes. La sesión de implementación de `execute-agent` `019fbf26-13a8-7211-93d4-e1dac9d76503` y la segunda corrección de test `019fbf2a-c4ae-7a62-b877-2bb819899c49`, con `gpt-5.6-luna` y `medium`, acreditan: ejecución de `scripts/seed_req12_bu_fixture.py` dos veces contra PostgreSQL real; target exacto `886ffe83-5235-4eb8-8c1d-528041518617`; proceso canónico `id 2`; 6 contratos/operaciones; 14 máquinas canónicas; 13 enlaces `contrato_maquina`; 0 duplicados; 0 huérfanos; 6/6 operaciones con descripción; 31 tests Python OK; Playwright exacto «muestra el contexto funcional enriquecido en modo lectura» OK; tras reinicio controlado de 8050, API con 11 nodes, 6 operations, 6 descriptions, 6 canonical_relations y `process_id`/`contract_id`/`machine_ids`; API operational/catalog con target process `id 2`, 6 contratos y 13 máquinas; segunda ejecución idempotente con los mismos conteos y relaciones; `py_compile` y `git diff --check` OK. El servidor 8050 se reinició solo para recargar código, sin commit/push. |
| **Causa raiz** | `implementation` |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `resolved` |
| **Intento** | 1 de NC-005 |
| **Validacion de cierre** | `resuelta`; validador: `programador_humano`; fecha: `2026-08-01`. El programador humano validó explícitamente la finalización de NC-005 sobre la evidencia técnica posterior registrada en este bloque. |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-08-01 | Se registra NC-005 como desviación de implementación. Se coordina `execute-agent` en sesión aislada para investigar y corregir usando los modelos canónicos existentes, manteniendo abiertas NC-001..NC-004 y sin cerrar el requerimiento. | Corrección pendiente; PostgreSQL no disponible en el diagnóstico inicial. |
| 2026-08-01 | `execute-agent` ejecuta el intento 1 en la sesión delegada `019fbf22-02bb-77c3-b7b7-1814b7b54377`, con sesión interna `019fbf22-c37c-75b0-816c-a0e80d367b97`, modelo `gpt-5.6-luna` y razonamiento `medium`. Modifica solo el seed y sus pruebas: `proceso` canónico determinista; un `contrato` por operación genérica; máquinas canónicas; relación M:N `contrato_maquina`; IDs explícitos en BPM/contexto; cleanup BPM acotado e idempotente, sin remapeo histórico. | Corrección estática completada; NC-005 sigue `in_correction` y abierta. |
| 2026-08-01 | Verificación independiente inicial: `python3 -m unittest tests/unit/test_req12_fixture_seed.py` → 16 OK; `compileall` → OK; `git diff --check` → OK. El corrector reporta 65 pruebas unitarias y 22 focalizadas. | En ese momento no había evidencia PostgreSQL/API/UI disponible; este diagnóstico queda expresamente superado por la verificación runtime posterior registrada abajo. NC-005 no se cierra y requiere Gate 3 humano. |
| 2026-08-01 | Sesión de implementación `execute-agent` `019fbf26-13a8-7211-93d4-e1dac9d76503` y segunda corrección de test `019fbf2a-c4ae-7a62-b877-2bb819899c49`, con `gpt-5.6-luna` y `medium`, aportan verificación posterior: `scripts/seed_req12_bu_fixture.py` ejecutado dos veces contra PostgreSQL real para `886ffe83-5235-4eb8-8c1d-528041518617`; proceso canónico `id 2`; 6 contratos/operaciones; 14 máquinas; 13 enlaces `contrato_maquina`; 0 duplicados, 0 huérfanos y 6/6 operaciones con descripción. | Tests focalizados/regresión: 31 tests Python OK y Playwright exacto «muestra el contexto funcional enriquecido en modo lectura» OK. Tras reiniciar controladamente 8050 solo para recargar código: API con 11 nodes, 6 operations, 6 descriptions, 6 canonical_relations y `process_id`/`contract_id`/`machine_ids`; API operational/catalog con process `id 2`, 6 contratos y 13 máquinas. La segunda ejecución conserva conteos y relaciones; `py_compile` y `git diff --check` OK. La evidencia antigua de runtime bloqueado queda superada. NC-005 permanece `in_correction`/`pending`; Gate 3 humano requerido. |
| 2026-08-01 | Verificación adicional que deja expresamente superada la evidencia de runtime bloqueado del diagnóstico inicial: `execute-agent` `019fbf26-13a8-7211-93d4-e1dac9d76503` y corrección de test `019fbf2a-c4ae-7a62-b877-2bb819899c49`, con `gpt-5.6-luna` y razonamiento `medium`, ejecutaron dos veces el seed exacto en PostgreSQL para `version_id=886ffe83-5235-4eb8-8c1d-528041518617`. | Proceso canónico `2`; `6` contratos/operaciones; `14` máquinas canónicas; `13` enlaces `contrato_maquina`; `0` huérfanos; `0` duplicados; `6/6` descripciones. `31` tests Python OK y Playwright exacto del contexto funcional OK. API tras reinicio en `8050`: `11` nodes, `6` operations, `6` descriptions y `6` `canonical_relations` con `process_id`/`contract_id`/`machine_ids`. API operational/catalog: proceso `2` con `6` contratos y `13` máquinas. `py_compile` y `git diff --check` OK. NC-005 sigue `in_correction`, validación pendiente y Gate 3 humano requerido; NC-001..NC-004 siguen abiertas. |
| 2026-08-01 | El programador humano valida explícitamente la finalización de NC-005. | Cierre confirmado sobre la evidencia técnica anterior: seed idempotente en PostgreSQL, proceso canónico `2`, `6` contratos/operaciones, `14` máquinas, `13` enlaces `contrato_maquina`, `0` huérfanos, `0` duplicados, API con relaciones canónicas y Playwright exacto OK. NC-005 pasa a `resolved`; NC-001..NC-004 permanecen sin cambios. |

### NC-006

| Campo | Valor |
|-------|-------|
| **ID** | NC-006 |
| **Fecha deteccion** | 2026-08-02 |
| **Detectado por** | `programador_humano` durante la revisión de cierre de Gate 3 |
| **Descripcion** | El elemento canónico máquina requiere revisión/corrección de identidad, atributos y relaciones verificables con proceso, operación, contrato, BPM y contexto. La evidencia existente acredita conteos, claves y enlaces del seed, pero no autoriza inferir que cada identidad/atributo relacional del modelo máquina quedó completamente verificado para el contrato generalista. |
| **Comportamiento esperado** | Cada máquina debe conservar una identidad canónica estable, atributos suficientes y relaciones verificables con el proceso, la operación/contrato y los registros BPM/contexto existentes, con trazabilidad consistente entre persistencia, API y proyección. La solución debe seguir siendo generalista y reutilizar los modelos, tablas, rutas y repositorios existentes. |
| **Comportamiento observado** | La revisión de cierre identifica una brecha pendiente de comprobación/corrección sobre el elemento máquina y sus relaciones cruzadas. No se añade evidencia runtime nueva en esta apertura. |
| **Evidencia** | Evidencia existente de NC-005: proceso canónico `2`, 6 contratos/operaciones, 14 máquinas, 13 enlaces `contrato_maquina`, API con relaciones canónicas y contexto BPM. Esa evidencia se conserva como base de revisión, pero no se amplía ni se interpreta como prueba completa de NC-006. |
| **Causa raiz** | `implementation` |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `open` |
| **Validacion de cierre** | `pendiente`; requiere corrección, evidencia verificable y nueva validación humana Gate 3 |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-08-02 | Se abre NC-006 y se clasifica como desviación de `implementation`: el `spec.md` y el `task_plan.md` ya cubren el modelo generalista, la identidad canónica y las relaciones, por lo que la reentrada corresponde a `execute-agent`. | NC-006 permanece `open`; no se inventa evidencia runtime, no se modifica `spec.md`, y Gate 3 queda pendiente. |
| 2026-08-02 | Contrato de corrección: revisar/corregir identidad, atributos y relaciones verificables del elemento máquina con proceso, operación, contrato, BPM y contexto; comprobar consistencia e idempotencia usando artefactos existentes. | Prohibido crear tablas, entidades, rutas o repositorios BU/MACBU. Sesión correctora aún no iniciada; no existe session id de corrección que registrar. |

## Tabla resumen

| NC | Causa raiz | Estado | Punto re-entrada | Cierre |
|----|------------|--------|-----------------|--------|
| NC-001 | `task_plan` | `resolved` | `plan-task-agent` | `2026-08-02 — programador_humano` |
| NC-002 | `implementation` | `resolved` | `execute-agent` | `2026-08-02 — programador_humano` |
| NC-003 | `implementation` | `resolved` | `execute-agent` | `2026-08-02 — programador_humano` |
| NC-004 | `implementation` | `resolved` | `execute-agent` | `2026-08-02 — programador_humano` |
| NC-005 | `implementation` | `resolved` | `execute-agent` | `2026-08-01 — programador_humano` |
| NC-006 | `implementation` | `open` | `execute-agent` | `pendiente — Gate 3 bloqueado` |

---

## Handoff de correccion

NC-001..NC-005 quedan resueltas por validación humana explícita. NC-006 queda
abierta y bloquea el cierre del requerimiento; Gate 3 permanece pendiente.

NC-006 requiere reentrada en `execute-agent` porque el spec y el plan ya
cubren el contrato generalista de máquina y la desviación se limita a la
implementación verificable de identidad, atributos y relaciones. La revisión
debe usar los modelos canónicos existentes y no inventar evidencia runtime.
Queda prohibido crear tablas, entidades, rutas o repositorios BU/MACBU.

La corrección de NC-006 debe conservar el modelo generalista y no crear
tablas, entidades, rutas o repositorios BU/MACBU:

1. Revisar/corregir la identidad canónica y los atributos del elemento máquina,
   manteniendo el modelo generalista y los repositorios/modelos existentes.
2. Verificar relaciones máquina↔proceso, máquina↔operación/contrato y sus
   claves en BPM/contexto, con consistencia entre persistencia y proyección.
3. Ejecutar únicamente verificaciones reproducibles disponibles; no afirmar
   pruebas runtime no ejecutadas ni convertir evidencia de NC-005 en cierre de
   NC-006.

La reentrada técnica corresponde a `execute-agent`; después debe repetirse
`validate-implementation` (Gate 3).

Estado de reentrada: NC-006 está `open`, el requerimiento permanece en
`en_correccion` y Gate 3 está bloqueado hasta la corrección y validación
humana de NC-006.

---

## Protocolo de uso

- Una NC `open` o `in_correction` bloquea `done`.
- Esta NC no se cierra sin corrección y validación humana explícita.
- El máximo de intentos de corrección sin escalado es dos.
