# NC Log — RCA-UI-ARBOLES-ANALISIS

## Metadata y excepción de workflow

- Requirement ID: `RCA-UI-ARBOLES-ANALISIS`
- Plan: `./plan.md`
- Spec SDD canónica: `no existe`
- Task plan SDD canónico: `no existe`
- Artefacto de trabajo: `./plan.md` (`approved_by_request`)
- NC log creado: `2026-09-11`
- Última actualización: `2026-09-12` (T14 / v3)
- Actor clasificador: `nc-resolution-agent`
- Sesión: `/root/rca_nc_classify` (sesión delegada; id runtime no expuesto)
- Modelo: `gpt-5.6-luna`
- Razonamiento: `medium`
- Excepción: flujo NO-SDD autorizado explícitamente por el programador; `plan.md`
  es el artefacto de trabajo y este archivo documenta la excepción. No se
  modifican `plan.md`, ninguna spec/task plan canónica ni la traza global.

## Estado de cierre del requerimiento

Estado actual de NCs: `NCs abiertas; verificación técnica superada en NC-010/NC-011/NC-012/NC-013; Gate humano pendiente`

Las NCs registradas están en `in_correction`, con NC-001, NC-002, NC-003,
NC-004, NC-005, NC-006, NC-007, NC-009 y NC-008 continúan pendientes; NC-010 y
NC-011 completaron su intento 2/2 con verificación técnica positiva, NC-012
registra las dos correcciones atómicas de T14 y NC-013 registra el NO OK del
flujo MOVER. La evidencia positiva del rerun v3, la revisión visual T13 v3 y la
regresión T14 no cierran ninguna NC sin validación humana explícita. Ninguna NC
puede marcarse `resolved` antes del Gate humano.

## Registro de No Conformidades

### NC-001 — RCA-02 cerrado/reapertura (A+B)

| Campo | Valor |
|-------|-------|
| **ID** | NC-001 |
| **Fecha detección** | 2026-09-11 |
| **Detectado por** | `T11` / análisis del `nc-resolution-agent` |
| **Descripción** | El flujo de guardado de resultados no queda protegido de forma coherente frente a un análisis cerrado, incumpliendo RCA-02. La candidata A afecta al wiring canónico; la candidata B mantiene una expectativa legacy incompatible con el contrato nuevo. |
| **Comportamiento esperado** | Según `plan.md` RCA-02 y `docs/rca-reparenting-contract.md` §7: un análisis cerrado no muta; la reapertura explícita permite editar y conserva historial. El guardado debe bloquearse con `CausalTreeStateError` hasta reabrir. |
| **Comportamiento observado A** | `build_rca_tree_analysis_application` crea `ResultAdapter` sin `get()`. `SaveAnalysisResult._analysis_is_closed()` sólo consulta `get()` sobre el puerto de resultados, por lo que no detecta el cierre antes de intentar guardar. |
| **Comportamiento observado B** | `tests/unit/test_rca_tree_analysis_ports.py` (`test_update_and_result_use_explicit_ports`) cierra el análisis y todavía espera que `save_result` tenga éxito, contradiciendo RCA-02. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | El plan y el contrato ya definen RCA-02; no es una carencia o error de especificación. La implementación/wiring y el test legacy no completaron la adaptación al contrato. |
| **Punto de reentrada** | `execute-agent` |
| **Artefacto/ficheros mínimos a corregir** | `uc_bib_solv/modules/rca_tree/infrastructure/analysis_wiring.py`; `tests/unit/test_rca_tree_analysis_ports.py`. Revisar también `tests/unit/test_causal_analysis_t7.py` como prueba canónica, sin cambiar su intención de bloqueo/reapertura. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-09-11 | Clasificar A+B como una NC conjunta por compartir RCA-02 y delegar corrección mínima al `execute-agent`. | `corrección pendiente`; no se ha modificado código ni tests en esta fase. |

#### Comandos mínimos de cierre

El `execute-agent` debe ejecutar, como mínimo, la suite focalizada y la
regresión de análisis; después solicitar `validate-implementation`:

```bash
python -m pytest -q \
  tests/unit/test_causal_analysis_t7.py \
  tests/unit/test_rca_tree_analysis_ports.py \
  tests/unit/test_rca_scientific_evaluation.py
```

La validación debe comprobar explícitamente: cerrado bloquea, reapertura
explícita permite guardar, y no hay escritura antes de la reapertura. Sólo
tras pasar la verificación y recibir confirmación humana se cambia NC-001 a
`resolved`.

### NC-002 — T12 Playwright: mock de API intercepta módulos estáticos

| Campo | Valor |
|-------|-------|
| **ID** | NC-002 |
| **Fecha detección** | 2026-09-11 |
| **Detectado por** | `T12` / análisis del artefacto `attempt-3` |
| **Descripción** | La ejecución E2E aislada no llega a montar la SPA: el patrón de routing de los mocks captura también módulos JavaScript estáticos, provocando 11 fallas secundarias en los dos specs RCA. |
| **Comportamiento esperado** | Las rutas mock deben interceptar únicamente endpoints API (`/api/...`), mientras `/js/api/*.js` y el resto de módulos estáticos deben continuar sirviéndose con su contenido y MIME JavaScript correctos. |
| **Comportamiento observado** | `page.route("**/api/**", ...)` también coincide con rutas estáticas como `/js/api/*.js`; el handler responde JSON para esos módulos. La SPA falla por MIME/contenido incorrecto y no renderiza árbol, acciones, encabezado ni workspace científico; los selectores posteriores terminan en timeout. |
| **Fallos agrupados** | 11 fallas del intento 3: MOVER-01, MOVER-02/DATA-01, ERROR-01/DATA-01, MOVER-04 teclado/drag-drop, RCA-01/RCA-02 científico, RESP-01 en 1440/1280/768/390, A11Y-01/RESP-01 y ERROR-01/DATA-01 responsive. El test live omitido no se incluye. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | `plan.md` exige validar esos flujos y los specs declaran correctamente los endpoints esperados; el defecto está en la implementación del mock E2E, cuyo glob es demasiado amplio y contamina la carga de la aplicación. No es una carencia del alcance ni del plan. |
| **Punto de reentrada** | `execute-agent` |
| **Artefacto/ficheros mínimos a corregir** | `tests/e2e/rca-move-scientific.spec.js`; `tests/e2e/rca-responsive-a11y.spec.js`. Restringir los mocks a endpoints API sin interceptar `/js/api/*.js`; no modificar código de aplicación, `plan.md` ni NC-001. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-09-11 | Registrar como NC única las 11 fallas secundarias del intento 3 y delegar la corrección mínima de los dos mocks E2E al `execute-agent`. | `corrección pendiente`; no se han modificado tests ni código en esta fase. |
| 2026-09-11 | Rerun `2026-09-11T15-01-06Z-rca-t12b-rerun`: comprobar el síntoma de carga estática descrito originalmente. | El MIME/contenido JavaScript incorrecto de los módulos `/js/api/*.js` ya no se reproduce; quedan 7 fallos secundarios por `ReferenceError: mountRoot is not defined`, registrados en NC-003. NC-002 permanece `in_correction` hasta verificación técnica y validación humana. |
| 2026-09-11 | Rerun `2026-09-11T15-08-30Z-rca-t12b-rerun2`: volver a comprobar la carga estática tras la corrección del mock. | No se observan fallos de MIME ni de interceptación de módulos estáticos en esta ejecución; NC-002 permanece `in_correction` hasta verificación técnica y validación humana. Los nuevos fallos de fixture/selector se registran por separado en NC-004. |

#### Comando mínimo de cierre

Tras la corrección, ejecutar de nuevo exactamente los dos specs en el backend
aislado y solicitar `validate-implementation`:

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-move-scientific.spec.js \
  tests/e2e/rca-responsive-a11y.spec.js --reporter=list
```

La validación debe comprobar que los módulos `/js/api/*.js` reciben MIME y
contenido JavaScript, que desaparece el fallo de montaje de la SPA y que los
11 casos agrupados ejecutan sus aserciones reales. Sólo tras pasar la
verificación y recibir confirmación humana se cambia NC-002 a `resolved`.

### NC-003 — T12 rerun: `mountRoot` no definido bloquea el montaje de la SPA

| Campo | Valor |
|-------|-------|
| **ID** | NC-003 |
| **Fecha detección** | 2026-09-11 |
| **Detectado por** | `T12` / rerun `2026-09-11T15-01-06Z-rca-t12b-rerun` |
| **Descripción** | Tras corregir el enrutado de mocks, el shell del árbol lanza un error de JavaScript durante `afterMount`, impidiendo montar la SPA y provocando 7 fallos secundarios en los dos specs RCA. |
| **Comportamiento esperado** | `afterMount(root, ...)` debe registrar listeners y montar el diálogo en el nodo raíz recibido; las páginas de árbol/análisis deben cargar y ejecutar sus aserciones funcionales. |
| **Comportamiento observado** | `uc_bib_solv/webapp/js/components/tree-shell.js:504` referencia `mountRoot`, aunque el parámetro de `afterMount` se llama `root`; el `ReferenceError` aparece como error común de página. El rerun registra 4 pass, 7 fail y 1 skip. |
| **Fallos agrupados** | 7 fallos secundarios: MOVER-01/MOVER-04 comando; MOVER-02/DATA-01 ciclo 409; ERROR-01/DATA-01 borrado; MOVER-04 teclado/drag-drop; RCA-01/RCA-02 científico; A11Y-01/RESP-01 árbol/foco/zoom; ERROR-01/DATA-01 estados de error. Los 4 casos responsive de viewport pasan y el fixture live omitido no se incluye. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | `plan.md` y los specs ya exigen el montaje y los flujos funcionales; el defecto es una referencia de variable incorrecta en la implementación del shell, no una carencia del alcance ni del plan. |
| **Punto de reentrada** | `execute-agent` |
| **Artefacto/fichero mínimo a corregir** | `uc_bib_solv/webapp/js/components/tree-shell.js` — sustituir la referencia de `mountRoot` por el parámetro `root` en el listener y el `appendChild`; no modificar NC-001, NC-002, `plan.md` ni los dos specs E2E. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-09-11 | Clasificar los 7 fallos del rerun como una NC de implementación y delegar la corrección mínima de `tree-shell.js` al `execute-agent`. | `corrección pendiente`; no se ha modificado código en esta fase. |
| 2026-09-11 | Rerun `2026-09-11T15-08-30Z-rca-t12b-rerun2`: comprobar si reaparece `mountRoot`. | No se observa `ReferenceError: mountRoot is not defined` en esta ejecución; NC-003 permanece `in_correction` hasta verificación técnica y validación humana. |

#### Comando mínimo de cierre

Tras la corrección, ejecutar de nuevo exactamente los dos specs en el backend
aislado y solicitar `validate-implementation`:

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-move-scientific.spec.js \
  tests/e2e/rca-responsive-a11y.spec.js --reporter=list
```

La validación debe comprobar que no reaparece ningún `ReferenceError` de
`mountRoot`, que la SPA monta árbol/análisis y que los 7 casos agrupados
ejecutan sus aserciones reales. Sólo tras pasar la verificación y recibir
confirmación humana se cambia NC-003 a `resolved`.

### NC-004 — T12 Playwright: fixture de árbol y locator responsive ambiguo

| Campo | Valor |
|-------|-------|
| **ID** | NC-004 |
| **Fecha detección** | 2026-09-11 |
| **Detectado por** | `T12` / análisis del artefacto `2026-09-11T15-08-30Z-rca-t12b-rerun2` |
| **Descripción** | Diez fallos de los dos specs E2E provienen de la implementación de los tests: seis mocks de `/api/rca-tree/nodes` devuelven un envelope `{data: payload}` que el consumidor de árbol no desenvuelve, y cuatro aserciones responsive usan un locator global que resuelve dos controles de mover intencionales. |
| **Comportamiento esperado** | Los mocks deben reproducir el contrato consumido por `listCausas()`/`tree-shell` y dejar el árbol e hipótesis renderizables. El test responsive debe localizar el control de mover contractual y accionable, sin asumir unicidad global cuando existen controles de alcance y contextual distintos. |
| **Comportamiento observado** | El árbol queda vacío y fallan los selectores `[data-node-id]`, `[data-hypothesis-id]` y `treeitem` porque el payload está bajo `data`. En los cuatro viewports responsive, `getByRole('button', { name: /Mover causa seleccionada/i })` resuelve dos botones (`tree-move-cause-v02` y `tree-move-cause`), produciendo error de strict mode. |
| **Fallos agrupados** | 10 fallos: 6 de shape de fixture (incluidos MOVER/DELETE/teclado, científico y árbol semántico) y 4 de locator responsive en 1440, 1280, 768 y 390 px. El 503 de error anidado se registra aparte en NC-005; no se incluye el fixture live omitido. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | `plan.md` define los criterios T12 y el análisis identifica contratos y controles existentes; la desviación está en la implementación de los mocks/selectores del test. Se agrupa porque ambas correcciones pertenecen a la misma tarea T12, tienen el mismo punto de reentrada (`execute-agent`) y sólo afectan a sus dos specs E2E, aunque se mantienen descritas como dos subproblemas verificables. |
| **Punto de reentrada** | `execute-agent` |
| **Artefacto/ficheros mínimos a corregir** | `tests/e2e/rca-move-scientific.spec.js`; `tests/e2e/rca-responsive-a11y.spec.js`. En los mocks exitosos de `/api/rca-tree/nodes`, devolver `treePayload()` al nivel consumido por el árbol; en responsive, acotar el locator a `data-action`/toolbar contractual y comprobar `toBeEnabled()` sólo tras seleccionar una causa cuando corresponda. No modificar código de aplicación, `plan.md` ni NC-001–NC-003. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-09-11 | Registrar conjuntamente los grupos de fixture y locator del rerun2 y delegar la corrección mínima de los dos specs al `execute-agent`. | `corrección pendiente`; no se han modificado tests ni código de aplicación en esta fase. |
| 2026-09-11 | Rerun3 `rca-rerun3-20260911_172104`: el fixture y el locator responsive ya no reproducen sus fallos; el lote registra 6 pass, 5 fail y 1 skip. | NC-004 permanece `in_correction` hasta verificación técnica y validación humana; los 5 fallos restantes se registran en NC-006. |

#### Comando mínimo de cierre

Tras la corrección, ejecutar de nuevo exactamente los dos specs en el backend
aislado y solicitar `validate-implementation`:

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-move-scientific.spec.js \
  tests/e2e/rca-responsive-a11y.spec.js --reporter=list
```

La validación debe comprobar que el árbol renderiza los nodos e hipótesis
esperados, que el árbol semántico ya no queda vacío, que los cuatro viewports
responsive no producen strict mode y que las aserciones reales de T12 se
ejecutan. Sólo tras pasar la verificación y recibir confirmación humana se
cambia NC-004 a `resolved`.

### NC-005 — Cliente API: envelope de error anidado no normalizado

| Campo | Valor |
|-------|-------|
| **ID** | NC-005 |
| **Fecha detección** | 2026-09-11 |
| **Detectado por** | `T12` / análisis del artefacto `2026-09-11T15-08-30Z-rca-t12b-rerun2` |
| **Descripción** | La respuesta 503 con `{error: {code, message, correlation_id}}` se presenta con el mensaje genérico `Request failed: 503`, perdiendo el código `RCA_TREE_UNAVAILABLE`, el mensaje de servicio y la correlación `test-offline`. |
| **Comportamiento esperado** | `requestJson()` debe aceptar errores planos y el envelope anidado, propagando a la capa UI `message`, `code`, `correlation_id` y datos estructurados para que el estado de error sea accionable y trazable. |
| **Comportamiento observado** | `uc_bib_solv/webapp/js/api/client.js` sólo lee `payload.message` y construye el error sin normalizar `payload.error.message`, `payload.error.code` ni `payload.error.correlation_id`; `tree-shell.js` recibe por ello el fallback genérico. |
| **Fallos agrupados** | 1 fallo ERROR-01/DATA-01 responsive; el 503 es deliberadamente producido por el mock y no es un error del servidor real. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | El plan exige estados de error recuperables y el test expresa el envelope contractual; el defecto está en el parser de producción, no en una omisión del alcance ni en el selector/fixture de T12. |
| **Punto de reentrada** | `execute-agent` |
| **Artefacto/fichero mínimo a corregir** | `uc_bib_solv/webapp/js/api/client.js` — normalizar `payload.error || payload`, conservar compatibilidad con errores planos y propagar `message`, `code`, `correlation_id` y `data` estructurados. No modificar el mock 503 ni `tree-shell.js` salvo que la corrección demuestre una incompatibilidad contractual adicional. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-09-11 | Registrar el fallo de normalización del envelope 503 como NC de producción independiente y delegar la corrección mínima de `client.js` al `execute-agent`. | `corrección pendiente`; no se ha modificado código en esta fase. |
| 2026-09-11 | Rerun3 `rca-rerun3-20260911_172104`: el caso 503 muestra mensaje y retry accionables; `ERROR-01` y `DATA-01` pasan. | NC-005 permanece `in_correction` hasta verificación técnica y validación humana; no se marca resuelta automáticamente. |

#### Comando mínimo de cierre

Tras la corrección, ejecutar de nuevo exactamente los dos specs en el backend
aislado y solicitar `validate-implementation`:

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-move-scientific.spec.js \
  tests/e2e/rca-responsive-a11y.spec.js --reporter=list
```

La validación debe comprobar que el caso 503 muestra el mensaje de servicio,
`RCA_TREE_UNAVAILABLE` y `test-offline`, y que los errores planos existentes
siguen siendo compatibles. Sólo tras pasar la verificación y recibir
confirmación humana se cambia NC-005 a `resolved`.

### NC-006 — Diálogo de mover causa oculto intercepta eventos de puntero

| Campo | Valor |
|-------|-------|
| **ID** | NC-006 |
| **Fecha detección** | 2026-09-11 |
| **Detectado por** | `T12` / rerun3 `rca-rerun3-20260911_172104` |
| **Descripción** | Cinco fallos restantes del rerun3 se deben a que el overlay `.tree-move-dialog[hidden]` sigue participando en la interacción y bloquea los controles visibles del árbol. |
| **Comportamiento esperado** | Un diálogo con atributo `hidden` no debe renderizarse ni interceptar eventos; sólo el diálogo abierto debe ocupar la capa modal y recibir foco/eventos. |
| **Comportamiento observado** | `tree-move-dialog.js` crea el overlay con `overlay.hidden = true`, pero `michelin-ui.css` aplica `.tree-move-dialog { display: grid !important; }`, anulando el comportamiento UA de `[hidden]`. La capa oculta queda sobre la UI y Playwright informa que intercepta los eventos de puntero. El rerun3 registra 5 fallos, 6 pass y 1 skip. |
| **Fallos agrupados** | Los 5 fallos restantes del rerun3, secundarios a la intercepción del overlay; `MOVER-04`, los cuatro viewports `RESP-01` y `ERROR-01`/`DATA-01` pasan. El caso live omitido no se incluye. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | `plan.md` exige que el comando de movimiento sea accionable y que los estados modales no bloqueen la UI; `tree-move-dialog.js` mantiene correctamente el estado `hidden`. La regla CSS de producción contradice ese contrato y causa la intercepción, por lo que no es una carencia del plan ni del alcance. |
| **Punto de reentrada** | `execute-agent` |
| **Artefacto/fichero mínimo a corregir** | `uc_bib_solv/webapp/css/michelin-ui.css` — preservar el comportamiento de `[hidden]` (por ejemplo, sobrescribiendo explícitamente `.tree-move-dialog[hidden]` con `display: none !important` y aplicando el layout sólo al estado visible). `tree-move-dialog.js` es sólo lectura y no debe modificarse salvo que la corrección evidencie una incompatibilidad adicional. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-09-11 | Registrar los 5 fallos del rerun3 como NC de implementación y delegar la corrección mínima de `michelin-ui.css` al `execute-agent`. | `corrección pendiente`; no se ha modificado código en esta fase. |
| 2026-09-12 | Rerun4-retry2 `20260912T085431Z`: DELETE sigue seleccionando el diálogo de mover oculto mediante `.last()`; la intercepción de MOVER/A11Y corresponde además al toolbar no accionable, registrado en NC-007. | NC-006 permanece `in_correction`; evidencia adicional, no cierre. |
| 2026-09-12 | Rerun6 (`20260912T091745Z-rca-t12b-rerun6`): el lote T12 registra `11 passed, 1 skipped`; esta evidencia automatizada no sustituye la comprobación visual de T13 ni cierra NC-006. | NC-006 permanece `in_correction`; NC-010 registra los defectos visuales observados. |

#### Comando mínimo de cierre

Tras la corrección, ejecutar de nuevo exactamente los dos specs en el backend
aislado y solicitar `validate-implementation`:

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-move-scientific.spec.js \
  tests/e2e/rca-responsive-a11y.spec.js --reporter=list
```

La validación debe comprobar que `.tree-move-dialog[hidden]` no tiene layout ni
intercepta punteros, que el diálogo visible sigue abriéndose con foco correcto,
y que desaparecen los 5 fallos agrupados. Sólo tras pasar la verificación y
recibir confirmación humana se cambia NC-006 a `resolved`.

### NC-007 — Comando Mover no accionable en producto (MOVER-01/MOVER-02/A11Y-01)

| Campo | Valor |
|-------|-------|
| **ID** | NC-007 |
| **Fecha detección** | 2026-09-12 |
| **Detectado por** | `T12` / análisis `20260912T085431Z-rca-t12b-rerun4-retry2` |
| **Descripción** | El comando visible `Mover causa…` no puede recibir el click real en desktop ni móvil. |
| **Comportamiento esperado** | Conforme a `plan.md` T06/T10/T12 y MOVER-01/MOVER-02/A11Y-01, el control visible debe ser accionable con pointer/teclado y abrir el diálogo de movimiento en 390, 768, 1280 y 1440 px. |
| **Comportamiento observado** | En MOVER-01/MOVER-02, la tarjeta del canvas intercepta el punto porque `.acv2-tree-toolbar` hereda `pointer-events:none`; en A11Y-01 el header sticky móvil puede interceptar además el auto-scroll. El flujo no llega a abrir el diálogo 409. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | El plan define el comando accesible y la cobertura responsive; la desviación está en CSS/orden de hit-testing de producción, no en el alcance ni en el plan. |
| **Punto de reentrada** | `execute-agent` |
| **Artefacto/ficheros mínimos a corregir** | `uc_bib_solv/webapp/css/app.css`; `uc_bib_solv/webapp/css/michelin-ui.css` sólo si la verificación confirma la cobertura del header sticky. No usar `force`, sleeps ni cambiar el locator contractual. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|---|---|---|
| 2026-09-12 | Registrar MOVER-01/MOVER-02/A11Y-01 como NC de producto y delegar la corrección mínima de hit-testing/scroll al `execute-agent`. | `corrección pendiente`; no se ha modificado código en esta fase. |
| 2026-09-12 | Rerun5 (`2026-09-12T09-07-09Z` / `2026-09-12T09-07-46Z`): el click real del puntero sobre `Mover causa…` ya atraviesa el toolbar y los cuatro viewports responsive pasan. | Evidencia técnica positiva, pero NC-007 permanece `in_correction`: el cierre requiere la verificación conjunta del flujo completo y validación humana; los defectos de fixture MOVER-02 y expectativa de foco se registran en NC-009. |
| 2026-09-12 | Rerun6 (`20260912T091745Z-rca-t12b-rerun6`): el lote T12 registra `11 passed, 1 skipped`; la revisión T13 todavía observa clipping del modal/canvas/header y no se marca cierre automático. | NC-007 permanece `in_correction`; NC-010 agrupa los hallazgos visuales de integración. |

#### Comando mínimo de cierre

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-move-scientific.spec.js \
  tests/e2e/rca-responsive-a11y.spec.js --reporter=list
```

La validación debe demostrar click real y foco/ESC del diálogo en los cuatro
viewports, sin `force`, y que el botón no queda bajo el header sticky móvil.
Sólo después de verificación técnica y validación humana puede pasar a `resolved`.

### NC-008 — Especificación E2E: diálogo DELETE y fixture científico incompletos (B+C agrupadas)

| Campo | Valor |
|-------|-------|
| **ID** | NC-008 |
| **Fecha detección** | 2026-09-12 |
| **Detectado por** | `T12` / análisis `20260912T085431Z-rca-t12b-rerun4-retry2` |
| **Descripción** | El spec E2E selecciona un diálogo oculto para DELETE y confirma una decisión `confirmada` sin criterio ni evidencia requeridos. |
| **Comportamiento esperado** | DELETE debe actuar sobre `.modal-overlay.is-open` y verificar el error 500; el caso científico debe completar `#analysis-criterion` y `#analysis-evidence` antes de guardar `confirmada`, manteniendo las aserciones de rechazo contractual. |
| **Comportamiento observado** | `.last()` selecciona el `tree-move-dialog` oculto añadido después del modal de borrado; el flujo científico recibe correctamente `Una decisión confirmada o rechazada necesita criterio o umbral.` porque no rellena criterio/evidencia. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | B y C son defectos del mismo actor de T12 en el mismo fichero y comparten `execute-agent`/reentrada; se agrupan como una única NC de implementación de tests, con dos correcciones independientes y verificables. La UI y su validador están actuando conforme al contrato. |
| **Punto de reentrada** | `execute-agent` |
| **Artefacto/fichero mínimo a corregir** | `tests/e2e/rca-move-scientific.spec.js` — acotar DELETE a `.modal-overlay.is-open` y completar criterio/evidencia para `confirmada`. No debilitar validaciones ni modificar código de producto. |
| **Estado** | `in_correction` |
| **Intento** | 2 de máximo 2 sin escalado (subcaso científico pendiente) |
| **Validación de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|---|---|---|
| 2026-09-12 | Registrar B+C conjuntamente por compartir spec, actor corrector, fichero y reentrada; delegar ajustes mínimos al `execute-agent`. | `corrección pendiente`; no se han modificado tests ni código en esta fase. |
| 2026-09-12 | Rerun5: el subcaso DELETE pasa técnicamente (`ERROR-01` y `DATA-01`); el subcaso científico sigue fallando porque, tras recarga, el mock conserva la conclusión `confirmada` en `#analysis-justification` y el test no limpia ese campo antes de esperar el rechazo. | NC-008 queda en `in_correction`, intento 2; el fallo científico es una corrección pendiente del test, no un defecto de producto. Al ser el segundo intento, cualquier nueva corrección sin cierre requiere escalado humano. |
| 2026-09-12 | Rerun6 (`20260912T091745Z-rca-t12b-rerun6`): el lote T12 registra `11 passed, 1 skipped`; la evidencia automatizada no altera el subcaso científico pendiente ni la exigencia de escalado tras el segundo intento. | NC-008 permanece `in_correction`, intento 2; sin cierre automático. |

#### Comando mínimo de cierre

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-move-scientific.spec.js \
  tests/e2e/rca-responsive-a11y.spec.js --reporter=list
```

La validación debe comprobar que DELETE usa el modal visible y que el POST
científico contiene criterio/evidencia antes de esperar `Ficha científica
guardada`, conservando el rechazo de decisiones incompletas. Para el subcaso
científico pendiente, el test debe limpiar explícitamente
`#analysis-justification` tras la recarga antes de afirmar el rechazo. Comando
mínimo del subcaso pendiente:

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-move-scientific.spec.js \
  --grep="ficha científica valida decisiones, persiste y respeta cerrado/reapertura" --reporter=list
```

Sólo después de verificación técnica y validación humana puede pasar a
`resolved`; el subcaso DELETE ya tiene evidencia técnica de paso.

### NC-009 — Especificación E2E: fixture MOVER-02 y expectativa de foco A11Y-01

| Campo | Valor |
|-------|-------|
| **ID** | NC-009 |
| **Fecha detección** | 2026-09-12 |
| **Detectado por** | `T12` / análisis del rerun5 y revisión de los dos specs E2E |
| **Descripción** | Dos aserciones del spec E2E no corresponden al fixture ni al contrato de foco: MOVER-02 trata como descendiente de la fuente a un nodo ubicado bajo un hermano, y A11Y-01 espera foco en el nodo tras `Escape` aunque el diálogo fue invocado desde el control `Mover causa…`. |
| **Comportamiento esperado** | MOVER-02 debe excluir sólo la propia fuente y sus descendientes reales; el nodo `103`, bajo el hermano `102`, es un destino válido cuando la fuente seleccionada es `101`. A11Y-01 debe comprobar que al cerrar con `Escape` el foco vuelve al control invocador `[data-action=tree-move-cause]`. |
| **Comportamiento observado** | El test espera que `TEST_RCA_DESCENDANT` no exista aunque la fuente `101` no tiene hijos y `103` cuelga de `102`; además, tras hacer click en `[data-action=tree-move-cause]`, el test espera foco en el nodo en vez del control que abrió el diálogo. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | `plan.md` y el contrato de producto definen la exclusión de descendientes y el retorno de foco al invocador. La desviación está en el fixture/aserciones de los tests E2E, no en la especificación ni en la implementación de producto. |
| **Punto de reentrada** | `execute-agent` |
| **Artefactos/ficheros mínimos a corregir** | `tests/e2e/rca-move-scientific.spec.js`; `tests/e2e/rca-responsive-a11y.spec.js`. Ajustar sólo el fixture/aserción de MOVER-02 y la aserción de foco A11Y-01; no modificar código de producto ni `plan.md`. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|---|---|---|
| 2026-09-12 | Registrar conjuntamente los defectos MOVER-02 y A11Y-01 por compartir actor corrector, specs E2E y reentrada; delegar la corrección mínima al `execute-agent`. | `corrección pendiente`; no se han modificado tests ni código en esta fase. |
| 2026-09-12 | Rerun6 (`20260912T091745Z-rca-t12b-rerun6`): el lote T12 registra `11 passed, 1 skipped`; la revisión visual separada mantiene el hallazgo de legibilidad/affordance en 200% y no cierra NC-009. | NC-009 permanece `in_correction`; sin cierre automático. |

#### Comando mínimo de cierre

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-move-scientific.spec.js \
  tests/e2e/rca-responsive-a11y.spec.js --reporter=list
```

La validación debe demostrar que MOVER-02 excluye sólo la fuente y sus
descendientes reales, que `103` sigue siendo destino válido desde `101`, y que
`Escape` devuelve el foco a `[data-action=tree-move-cause]`. Sólo después de
verificación técnica y validación humana puede pasar a `resolved`.

### NC-010 — Integración visual T10/T13: clipping, legibilidad y affordances (NC-VIS-01..06)

| Campo | Valor |
|-------|-------|
| **ID** | NC-010 |
| **Fecha detección** | 2026-09-12 |
| **Detectado por** | `T13` / revisión visual `docs/rca-visual-review.md` sobre capturas T12/T10 |
| **Descripción** | NC-VIS-02 (P1, legibilidad/reflow a 200%) y NC-VIS-06 (P2, secuencia completa del stepper científico) fueron las desviaciones remanentes del intento 2/2. La revalidación v3 declara PASS visual técnico para NC-VIS-01..06. Se mantienen agrupadas porque proceden de la fase visual T13, verifican criterios definidos en T10/T13 y comparten la superficie CSS/layout de producción; el PASS técnico no equivale a cierre formal ni validación humana. |
| **Comportamiento esperado** | El diálogo 409 es completamente legible y accionable; el layout refluye de forma útil a 200%; el breakpoint 768px conserva marca y navegación; canvas/inspector muestran una continuación descubrible; filtros largos permiten revisar el valor completo; y la reapertura científica muestra el stepper planificado. |
| **Comportamiento observado** | En el intento 2/2, `NC-VIS-02` **P1** no tenía evidencia defendible a 640 CSS px y `NC-VIS-06` **P2** sólo mostraba 3/5 fases. Tras la corrección, `zoom-200-equivalent-640px.png` muestra legibilidad y overflow contenido en el canvas, y `scientific-stepper-reopen.png` muestra las cinco fases identificables. El estado técnico actual de ambos subcasos es PASS; queda pendiente el Gate humano. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | `plan.md` ya exige en T10 responsive, canvas, inspector, toolbar, labels y zoom 200%, y en T13 exige capturas, clipping y severidad. La desviación está en la integración visual de la implementación existente; no requiere modificar el alcance ni el plan. |
| **Punto de reentrada** | `execute-agent` |
| **Artefactos/ficheros mínimos a corregir** | Correcciones paralelas de intento 2: (A) `uc_bib_solv/webapp/css/forms.css`, adaptando el grid de cinco fases para que las cinco sean identificables dentro del inspector estrecho sin ocultar la fase actual/siguiente y conservando targets/foco accesibles; (B) `tests/e2e/rca-responsive-a11y.spec.js`, rehaciendo la evidencia de 200% con viewport de 640 CSS px efectivo (viewport de prueba 640, sin CSS `zoom`), comprobando overflow horizontal únicamente en el canvas y ausencia de overflow documental. No modificar NC-011 técnicamente ni cerrar ninguna NC en esta fase. |
| **Estado** | `in_correction` |
| **Intento** | 2 de máximo 2 sin escalado; corrección técnica superada en v3, sin tercer intento automático |
| **Validación de cierre** | Verificación técnica superada por T13 v3; validación humana explícita pendiente. No `resolved`. |

#### Justificación de agrupación y orden de corrección

`NC-VIS-02` y `NC-VIS-06` se mantienen como una única NC de integración UI
porque T10 define la superficie compartida de estilos/layout y T13 detectó los
dos defectos en la misma revisión visual; además, se pueden verificar por
capturas independientes dentro del mismo reingreso `execute-agent`. Las
correcciones del intento 2 son paralelas: (A) adapta el grid de cinco fases en
`forms.css`; (B) corrige la metodología de evidencia responsive para representar
640 CSS px efectivos. `NC-011` conserva su estado técnico separado y pendiente
de validación humana.

#### Alcance mínimo verificable por subcaso

| Subcaso | Severidad | Cierre visual mínimo |
|---|---:|---|
| NC-VIS-01 | P1 | En 1280×720 el título, contenido, cierre y retry/acciones del diálogo 409 quedan visibles o dentro de un scroll interno evidente; el diálogo abierto conserva foco y no bloquea el cierre. |
| NC-VIS-02 | P1 | Con viewport de prueba de 640 CSS px (equivalente a 1280px al 200%, sin CSS `zoom`), los textos siguen siendo legibles; el overflow horizontal pertenece sólo al canvas, con cue/scroll navegable, y `document.documentElement.scrollWidth <= document.documentElement.clientWidth`. |
| NC-VIS-03 | P1 | En 768×1024 la marca no se corta y existe una ruta visible para recuperar las secciones de navegación, sin solape de header/rail. |
| NC-VIS-04 | P1 | Canvas e inspector muestran una señal de continuación (scrollbar, gradiente, minimapa, ruta o control equivalente) y el toolbar permanece descubrible; no se presenta como una pantalla terminada/cortada. |
| NC-VIS-05 | P2 | Proceso/objetivo usan valor completo al foco/hover o truncado explícito con `title`/ayuda accesible. |
| NC-VIS-06 | P2 | En el inspector estrecho las cinco fases `Definir → Medir → Analizar → Validar → Controlar` son identificables mediante grid adaptativo o desplazamiento horizontal explícito; la fase actual, la siguiente acción y el foco/teclado son verificables sin inferir la progresión desde el formulario. |

#### Comandos mínimos de cierre

Tras A y B, repetir la revisión visual T13 con capturas exactas en
`1280×720`, `768×1024`, `390×844` y una captura de viewport de prueba `640×1000`
sin CSS `zoom` que represente 200% de un viewport de 1280px. La captura de 640
debe mostrar las cinco fases del stepper o su scroll horizontal explícito, y el
canvas debe ser el único contenedor con overflow horizontal; añadir asserts de
`document.documentElement.scrollWidth <= clientWidth`, overflow del canvas,
las cinco etiquetas del stepper y la fase actual/siguiente. Conservar la
comparación 1440×1000 y la evidencia de foco/teclado. No afirmar validación de
lector de pantalla, axe o Lighthouse si no se ejecutan. Sólo después de esa
verificación técnica y de la validación humana explícita puede pasar NC-010 a
`resolved`. Si el intento 2 no cumple, escalar obligatoriamente al programador
humano y no iniciar un tercer intento automático.

#### Historial de correcciones

| Fecha | Acción | Resultado |
|---|---|---|
| 2026-09-12 | Registrar NC-VIS-01..06 como NC-010 de implementación, agrupada por T10/T13 y delegar la corrección secuencial A→B al `execute-agent`. | `corrección pendiente`; no se ha modificado código ni tests en esta fase. |
| 2026-09-12 | Rerun6 `20260912T091745Z-rca-t12b-rerun6`: T12 registra `11 passed, 1 skipped`; T13 conserva NC-VIS-01..06 por evidencia visual de clipping/legibilidad/affordance. | NC-010 permanece `in_correction`, intento 1; la evidencia positiva automatizada no resuelve la NC ni sustituye la validación humana. |

| 2026-09-12 | Revisión de la evidencia T13/T12: el stepper sí existe y el workspace se antepone al detalle; la captura científica quedó desplazada por el scroll interno del inspector. El test de zoom aplica `document.documentElement.style.zoom='200%'` sobre 390 px (≈195 px CSS), y los filtros sólo usan valores cortos. | Estas limitaciones pertenecen a la implementación de la evidencia E2E, no invalidan ni rebajan NC-VIS-01..06. Se registra NC-011 separada; NC-010 conserva sus severidades y permanece `in_correction`. |
| 2026-09-12 | Intento 2/2: revisión visual final confirma que NC-VIS-01/03/04/05 pasan; permanecen NC-VIS-02 (P1) y NC-VIS-06 (P2). La lista del stepper conserva `min-width: 560px` en un inspector de aproximadamente 390px y sólo muestra 3/5 fases; la evidencia de 200% usa CSS `zoom` sobre 780px y no representa un viewport efectivo de 640 CSS px. | Se delegan dos correcciones paralelas: `forms.css` para grid adaptativo de cinco fases y `rca-responsive-a11y.spec.js` para evidencia a 640 CSS px sin CSS `zoom`, con overflow sólo de canvas y sin overflow documental. NC-010 sigue `in_correction`, intento 2/2; si falla, escalar obligatoriamente al programador humano. NC-011 permanece técnicamente pasada pero pendiente de validación humana. |
| 2026-09-12 | Revalidación v3 tras el intento 2/2: lote `.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/` con 12 pasadas y 1 omitida; `docs/rca-visual-review.md` v3 declara PASS visual técnico para NC-VIS-01..06. | Verificación técnica superada; NC-010 permanece `in_correction` únicamente por Gate/validación humana pendiente. No se marca `resolved`. |

### NC-011 — Evidencia E2E visual insuficiente para stepper, zoom y filtros

| Campo | Valor |
|-------|-------|
| **ID** | NC-011 |
| **Fecha detección** | 2026-09-12 |
| **Detectado por** | Revisión NC de `T12/T13`; análisis de `tests/e2e/rca-responsive-a11y.spec.js`, `tests/e2e/rca-move-scientific.spec.js` y `final/analisis_causas.js` |
| **Descripción** | NC-011 registró históricamente tres insuficiencias de evidencia visual: scroll interno no normalizado, geometría de zoom no comparable y ausencia de valores largos en filtros. Tras el intento 2/2 y la revalidación v3, esos tres subcasos cuentan con evidencia técnica reproducible; el registro se conserva hasta el Gate humano. |
| **Comportamiento esperado** | La prueba debe preparar el estado visual que quiere demostrar y comprobarlo con aserciones observables: tras resetear el scroll del inspector, el stepper debe tener fase actual y estados visible/actual/siguiente; el escenario de zoom debe usar un viewport equivalente a al menos 320 px CSS (o una configuración documentada equivalente) y comprobar cue/affordance, foco y legibilidad; un filtro seleccionado con etiqueta larga debe verificar título/summary accesible y captura del valor completo o del truncado explícito. |
| **Comportamiento observado** | En el intento 2/2 se observaron el scroll interno conservado, el cálculo incorrecto de `200%` y fixtures cortos. En v3, la captura científica se normaliza al stepper, el zoom usa el equivalente de 640 CSS px y `filters-long-390x844.png` ejercita etiquetas largas con `title`/resumen accesible. El estado técnico actual es PASS; no implica cierre humano. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | `plan.md` y NC-VIS-05/06 ya definen qué debe demostrarse. La discrepancia está en la implementación de los specs/acciones de captura y sus fixtures: el test no normaliza el scroll, usa una geometría de zoom no comparable y no selecciona datos largos. No es una omisión del spec ni del plan y no debe mezclarse con los defectos visuales de producto de NC-010. |
| **Punto de reentrada** | `execute-agent` |
| **Artefactos/ficheros mínimos a corregir** | `tests/e2e/rca-responsive-a11y.spec.js` únicamente; corregir la normalización del factor de zoom y el fixture/mock del catálogo operacional para conservar el envelope anidado que consume la aplicación. No modificar `tests/e2e/rca-move-scientific.spec.js`, `final/analisis_causas.js`, código de aplicación, plan ni NC-VIS/NC-010 en esta corrección. |
| **Estado** | `in_correction` |
| **Intento** | 2 de máximo 2 sin escalado; corrección técnica superada en v3, sin tercer intento automático |
| **Validación de cierre** | Verificación técnica superada por el lote v3; validación humana explícita pendiente. No `resolved`. |

#### Acciones mínimas verificables

1. **Stepper/reapertura:** después de navegar o seleccionar la hipótesis, localizar el contenedor scrollable del inspector/workspace y ponerlo explícitamente en `scrollTop = 0` (o usar `scrollIntoView` del stepper). Capturar la vista y asertar que el stepper es visible, que existe una fase marcada como actual y que la fase siguiente tiene estado/label verificable; no inferir ausencia a partir de una captura desplazada.
2. **Zoom 200%:** en `tests/e2e/rca-responsive-a11y.spec.js`, normalizar `document.documentElement.style.zoom` como factor numérico (`200%` debe convertirse en `2`, no en `200`) antes de calcular `effectiveCssWidth`; conservar la aserción de al menos 320 px CSS, cue de continuación/scroll, foco navegable y texto legible.
3. **Filtro largo:** en el mismo spec, hacer que el mock de `/api/bpm/operational/catalog` devuelva el envelope operacional anidado que realmente consume la aplicación (sin aplanarlo al objeto equivocado), y conservar la selección de proceso `1`, objetivo largo, `title`/summary accesible y screenshot con el control enfocado.

#### Historial de correcciones

| Fecha | Acción | Resultado |
|---|---|---|
| 2026-09-12 | Separar la insuficiencia de la evidencia de test de NC-010 y registrarla como NC-011 de implementación. | `corrección pendiente`; no se han modificado tests ni código en esta fase. |
| 2026-09-12 | Intento 2: el rerun final ejecuta 13 pruebas (`10 passed, 2 failed, 1 skipped`). El fallo de zoom calcula `780 / parseFloat('200%') = 3.9`; el fallo de filtros no encuentra el proceso largo porque el mock desempaqueta el catálogo a un objeto sin `catalog.data`. | `NC-011` permanece `in_correction`, intento 2/2: corregir únicamente `tests/e2e/rca-responsive-a11y.spec.js` normalizando `200%` a factor `2` y ajustando el fixture al envelope anidado contractual. No se cierra ni se modifica NC-010. |
| 2026-09-12 | Revalidación v3 tras el intento 2/2: `tests/e2e/rca-responsive-a11y.spec.js` pasa los casos de zoom equivalente, stepper/scroll, filtro largo/title-summary y estados de error dentro del lote `.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/` (12 pasadas, 1 omitida en el lote completo). | Verificación técnica superada; NC-011 permanece `in_correction` únicamente por Gate/validación humana pendiente. No se marca `resolved`. |

#### Comando mínimo de cierre

```bash
env -u RUN_RCA_LIVE_E2E \
  UI_TEST_BASE_URL=http://127.0.0.1:8051 \
  E2E_ARTIFACTS_DIR=.playwright-artifacts/test-results \
  npx playwright test --config=playwright.config.js \
  tests/e2e/rca-responsive-a11y.spec.js --reporter=list
```

La validación debe comprobar las aserciones de stepper/scroll, zoom equivalente
y legibilidad, y filtro largo/title-summary, además de conservar los resultados
previos. Si este intento 2 no pasa, debe escalarse al programador humano; no se
autoriza un tercer intento automático. Sólo tras verificación técnica y
confirmación humana puede cambiarse NC-011 a `resolved`; NC-010 no se cierra ni
se reclasifica por este registro.

### NC-012 — T14: nombres de adaptadores y baseline de schema desactualizado

| Campo | Valor |
|-------|-------|
| **ID** | NC-012 |
| **Fecha detección** | 2026-09-12 |
| **Detectado por** | `T14` / `docs/rca-implementation-report.md` |
| **Descripción** | La primera revisión T14 detectó dos desviaciones de integración: los adaptadores se habían nombrado `_ScientificAnalysisPersistence` y `_CausalReparentingAdapter`, incumpliendo la convención PascalCase; además, el test arquitectónico mantenía el SHA de baseline anterior aunque `db_management/schema.sql` había cambiado intencionalmente con la persistencia RCA/BPM aditiva. |
| **Comportamiento esperado** | Los nombres de las clases de infraestructura deben cumplir PascalCase (`ScientificAnalysisPersistence`, `CausalReparentingAdapter`) y el baseline del test debe corresponder exactamente al schema intencional vigente, sin ocultar cambios no autorizados. |
| **Comportamiento observado** | La nomenclatura inicial no cumplía PascalCase y `tests/architecture/test_t9_boundaries.py` comparaba el schema modificado con el hash histórico `49514c8bfeedc07601099dc160221df433935ebd4e3e68453020e31b56bce35d`, produciendo una desviación de arquitectura aunque el cambio DDL era intencional y estaba en alcance. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | Las convenciones arquitectónicas y el carácter intencional del cambio de schema ya estaban definidos; la desviación se produjo en la implementación de nombres y en la actualización omitida del baseline. No es una carencia del plan ni del alcance. |
| **Punto de reentrada** | `execute-agent` → `validate-implementation` |
| **Artefactos/ficheros afectados** | `uc_bib_solv/modules/rca_tree/infrastructure/analysis_wiring.py::ScientificAnalysisPersistence`; `uc_bib_solv/modules/rca_tree/infrastructure/wiring.py::CausalReparentingAdapter`; `tests/architecture/test_t9_boundaries.py`; `db_management/schema.sql`. Hashes post-corrección: `analysis_wiring.py` SHA-256 `b318d2da95d79851f695d5e8eb024eca8cbe737c7c2d4b87fee87ff8362ce984`; `wiring.py` SHA-256 `7084532a260666f17e9e020e753b7091f795daf433d57bee682430e702c81338`; `test_t9_boundaries.py` SHA-256 `4b27e975b47cc70af029e628d160f7642de08aaef31f09fe82aec444f22c0930`; `schema.sql` SHA-256 `841aae7aefec181f7751f2b5943a08043fbc9aff034a7ad5778c7bc2ec6ab625`. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | Verificación técnica superada; Gate/validación humana pendiente. No `resolved`. |

#### Historial de correcciones

| Fecha | Acción | Resultado |
|---|---|---|
| 2026-09-12 | T14 corrigió atómicamente los dos nombres a PascalCase y actualizó el baseline de `tests/architecture/test_t9_boundaries.py` al SHA vigente de `db_management/schema.sql`. | Corrección técnica aplicada, intento 1; la matriz focal pasa. NC-012 permanece `in_correction` hasta validación humana. |
| 2026-09-12 | Revalidación T14: `PYTHONPATH=. ./.venv/bin/pytest -q tests/unit/test_rca_reparenting.py tests/unit/test_rca_scientific_evaluation.py tests/integration/test_rca_reparenting_integration.py tests/unit/test_causal_analysis_t7.py tests/unit/test_rca_tree_analysis_ports.py` → `31 passed`; `node --test tests/unit/rca-tree-interactions-contract.test.mjs tests/unit/rca-scientific-ui-contract.test.mjs tests/unit/rca-resilience-contract.test.mjs tests/unit/tree-display-contract.test.mjs` → `15 passed`; `PYTHONPATH=. ./.venv/bin/pytest -q tests/architecture/test_t9_boundaries.py tests/unit/test_process_modeling_layers.py tests/unit/test_process_modeling_module_boundaries.py` → `13 passed, 9 subtests passed`; `git diff --check` → PASS. | Verificación técnica superada; no se marca `resolved` sin Gate humano. |

### NC-013 — MOVER: versión omitida y feedback visual de destino incompleto (A+B)

| Campo | Valor |
|-------|-------|
| **ID** | NC-013 |
| **Fecha detección** | 2026-09-12 |
| **Detectado por** | NO OK del programador / evidencia Playwright read-only en `.playwright-artifacts/rca-move-nc-user/20260912T104029Z/` y `20260912T104207Z/` |
| **Descripción** | El flujo MOVER tiene dos desviaciones coordinadas: (A) el botón de confirmación permanece deshabilitado aunque el destino y motivo sean válidos porque la proyección de `/api/rca-tree/nodes` no incluye `causa.version`; (B) durante dragover el destino aplica clases/estado (`acv2-tree-drop-valid acv2-tree-drop-active`) pero no muestra un borde, outline, halo o shadow visible que identifique el nuevo padre. |
| **Comportamiento esperado** | MOVER-01/MOVER-04 deben permitir confirmar con causa `364` (`causa_01`), destino válido `371` (`causa_03`), contrato `3`, `version` vigente `1` y motivo no vacío; el destino activo debe tener feedback visual perceptible, además del estado DOM, y el estado inválido debe diferenciarse visualmente. |
| **Comportamiento observado** | En `20260912T104029Z`, la API/DOM proyectan causa `364` con padre `264` pero sin `version`; el diálogo muestra `causa_01 · versión no disponible`, el destino `371` como válido y el botón `Confirmar movimiento` con `disabled=true` aun con destino/motivo válidos. En `20260912T104207Z`, el target `371` recibe las clases `acv2-tree-drop-valid acv2-tree-drop-active`, pero los estilos computados son `border: 0px none`, `outline: none` y `box-shadow: none`. La lectura DB read-only confirma `causa.version BIGINT NOT NULL DEFAULT 1` y la migración está materialmente aplicada; A es una proyección del repositorio, no una desviación DDL. |
| **Causa raíz** | `implementation` |
| **Justificación de clasificación** | `plan.md` ya exige MOVER-01/MOVER-04 y feedback de interacción. La persistencia contiene la columna/versionado requerido y el problema A está en la proyección backend; B está en la capa CSS/UI pese a que el estado de dragover sí se calcula. No es una carencia del spec ni del plan. |
| **Punto de reentrada** | `execute-agent` → `validate-implementation` |
| **Corrección mínima coordinada** | (A) En `uc_bib_solv/modules/rca_tree/adapters/outbound/postgres/graph_query_repo.py`, proyectar `causa.version` en los nodos/detalle consumidos por `/api/rca-tree/nodes` y añadir tests de contrato/proyección. (B) En los estilos RCA (`uc_bib_solv/webapp/css/michelin-ui.css` y/o hoja que gobierne las clases `acv2-tree-drop-*`), mostrar borde/halo/badge visible para el nuevo padre y un estado inválido distinguible; añadir tests CSS/UI. Después ejecutar Playwright real read-only y un caso mock de PATCH, sin mutar DB durante la comprobación. |
| **Estado** | `in_correction` |
| **Intento** | 1 de máximo 2 sin escalado |
| **Validación de cierre** | Verificación técnica superada; Gate humano pendiente. No `resolved`. |

#### Evidencia y alcance

- Evidencia A: `causa_01` id `364`, padre actual `264`, versión live `1`; destino `causa_03` id `371`, ambos en contrato `3`. `network-payload-relevant.json` y `report.json` de `20260912T104029Z` muestran que la respuesta de nodos no entrega `version`, que el diálogo muestra “versión no disponible” y que `tree-move-dialog-confirm` está deshabilitado.
- Evidencia B: `report.json` de `20260912T104029Z` muestra el target `371` con `acv2-tree-drop-valid acv2-tree-drop-active`, pero `border: 0px none`, `outline: none` y `box-shadow: none`; la captura es `dragover-target.png`.
- `20260912T104207Z` aporta la comprobación read-only posterior y `valid-target-confirm-state.png`; no se autoriza inferir un PATCH persistido ni declarar éxito del movimiento.
- La DB read-only confirma `causa.version BIGINT NOT NULL DEFAULT 1` y la migración materialmente aplicada; no modificar DDL para resolver A.
- Evidencia live v3: servidor 8050 reiniciado (PID `759818`); `GET /api/rca-tree/nodes` entrega `version: 1`. En `.playwright-artifacts/rca-move-live-confirm/20260912T162739Z/`, el botón queda habilitado y el movimiento real autorizado traslada `causa_02_01` id `366`/node `1812` de padre id `365` a `causa_01` id `364`/node `1808`.
- El único `PATCH /api/rca-tree/causes/366/parent` devuelve `200`, `expected_version: 1`, versión resultante `2`, correlation `c81aeabf-1ebc-43d7-8807-b16696a95949`, auditoría `a6681927-3b3d-4414-816f-f476d32e7345` y relación primaria `CAUSES` id `7052`, con `parent_id: 364`; tras reload el nodo aparece con `aria-level=3` bajo `causa_01`.
- La comprobación visual dragover read-only es PASS: tarjeta interna con borde azul de `2px`, halo de `4px`, fondo y badge `Nuevo padre`; el reset limpia el estado. La matriz focal registra Python `24 passed, 9 subtests`, Node `16 passed` y `git diff --check` PASS. La DB confirma de nuevo la migración materialmente aplicada.

#### Historial de correcciones

| Fecha | Acción | Resultado |
|---|---|---|
| 2026-09-12 | Clasificar el NO OK como NC-013 agrupada A+B de `implementation`, por compartir el flujo MOVER y el mismo reingreso; no modificar spec/plan. | Corrección pendiente; intento 1/2, `in_correction`. |
| 2026-09-12 | Corrección y verificación técnica: proyección live de `version`, botón habilitado, movimiento UI real autorizado y feedback dragover visible/resettable. Artefactos: `.playwright-artifacts/rca-move-live-confirm/20260912T162739Z/`. | Verificación técnica superada; NC-013 permanece `in_correction` exclusivamente por Gate humano pendiente. No `resolved`. |

#### Cierre mínimo

La validación técnica quedó demostrada con `version: 1`, confirmación habilitada,
un PATCH live único con auditoría/relación primaria y feedback visual read-only.
Debe conservarse además un caso mock de PATCH para regresión sin mutar DB. Sólo
tras esta evidencia y el Gate humano podrá cambiarse NC-013 a `resolved`.

## Hallazgos excluidos de este plan

### Hallazgo externo C — no es NC abierta de RCA-UI-ARBOLES-ANALISIS

`tests/integration/test_tree_db_integration.py` falla por el contrato BPM
requerido `bpm_process_id`/`bpm_node_id`. El fallo es preexistente, pertenece a
la integración BPM y queda fuera del alcance de T11/RCA-02. Se conserva como
hallazgo excluido/preexistente; no se registra como NC abierta ni se asigna al
`execute-agent` de esta corrección.

## Tabla resumen

| NC | Causa raíz | Estado | Punto reentrada | Actor corrector | Cierre |
|----|------------|--------|-----------------|-----------------|--------|
| NC-001 (A+B) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `pendiente` |
| NC-002 (11 fallas T12) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `pendiente` |
| NC-003 (7 fallas T12 rerun) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `pendiente` |
| NC-004 (10 fallas T12 fixture+selector) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `pendiente` |
| NC-005 (503 envelope anidado) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `pendiente` |
| NC-006 (5 fallas rerun3 overlay oculto) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `pendiente` |
| NC-007 (MOVER-01/MOVER-02/A11Y-01 producto) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `pendiente` |
| NC-008 (DELETE + científico E2E B+C; intento 2 científico) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `pendiente` |
| NC-009 (MOVER-02 fixture + A11Y-01 foco E2E) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `pendiente` |
| NC-010 (NC-VIS-01..06 integración visual T10/T13; P1×4/P2×2) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `verificación técnica OK; Gate humano pendiente` |
| NC-011 (evidencia E2E stepper/zoom/filtro largo) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `verificación técnica OK; Gate humano pendiente` |
| NC-012 (T14: PascalCase + baseline schema) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `verificación técnica OK; Gate humano pendiente` |
| NC-013 (MOVER: version projection + dragover feedback A+B) | `implementation` | `in_correction` | `execute-agent` | `execute-agent` | `verificación técnica OK; Gate humano pendiente` |

## Decisión de agrupación A+B

A y B se registran como una sola NC porque son dos evidencias del mismo
criterio RCA-02 y deben cerrarse con una única corrección coordinada y una
verificación conjunta. A es la manifestación de producción/wiring; B es la
expectativa legacy que debe alinearse con el mismo contrato. Si la corrección
revela causas independientes o una de ellas no queda cubierta, se abrirá una
NC correlativa en el siguiente intento; no se presume resuelta por esta
agrupación.

## Protocolo de cierre

1. `execute-agent` corrige sólo los ficheros mínimos indicados.
2. Se ejecutan los comandos focalizados y se documentan resultados.
3. Se reentra en `validate-implementation`.
4. El programador humano valida explícitamente; antes de eso ninguna NC,
   incluidas NC-010, NC-011 y NC-012 con verificación técnica superada y NC-013
   en corrección, puede pasar a `resolved` y el requerimiento no puede pasar a
   `done`.
