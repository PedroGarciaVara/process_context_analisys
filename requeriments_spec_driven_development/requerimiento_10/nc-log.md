# NC Log — requerimiento_10

## Metadata
- Requirement ID: `requerimiento_10`
- Spec File: `./requeriments_spec_driven_development/requerimiento_10/spec.md`
- Task Plan: `./requeriments_spec_driven_development/requerimiento_10/task_plan.md`
- Created At: `2026-07-20`
- Last Updated: `2026-07-27`

---

## Estado de cierre del requerimiento

Estado actual de NCs: `NCs abiertas`

---

## Registro de No Conformidades

### NC-001

| Campo | Valor |
|-------|-------|
| **ID** | NC-001 |
| **Fecha deteccion** | 2026-07-20 |
| **Detectado por** | `programador_humano` |
| **Descripcion** | La implementación de AMD-003 no cumple tres comportamientos UI: el flujo no aparece en la renderización inicial; los subformularios de nuevo nodo/transición se muestran en la antigua zona de layout de la lista de procesos y no ocupan anchura completa; y contraer/expandir durante pantalla completa provoca la salida del modo. |
| **Comportamiento esperado** | Según AMD-003, T15 y AC-17..AC-21: el grafo inicial debe renderizarse cuando la versión cargada esté disponible; el editor, formularios y flujo deben ocupar el layout principal de anchura completa sin recuperar el catálogo lateral; y fullscreen/fallback debe conservarse al expandir o contraer, junto con `version_id`, `node_id`, breadcrumbs, expansión, foco y datos de edición. |
| **Comportamiento observado** | Evidencia del programador humano: 1) la renderización inicial ya no muestra el flujo; 2) los subformularios de nuevo nodo aparecen en la zona de layout antigua de la lista de procesos; 3) cualquier acción de contraer/expandir al estar en pantalla completa hace salir de fullscreen. |
| **Causa raiz** | `implementation` — el spec AMD-003 y T15 cubren explícitamente los tres comportamientos. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-07-20 | NC abierta con evidencia del programador humano; se verificó que spec.md AMD-003 y T15 son coherentes y que la causa raíz es implementation. | `correccion iniciada` |
| 2026-07-20 | Corrección delegada a `execute-agent`, limitada al render inicial disponible, layout principal full-width y preservación de fullscreen/fallback, con pruebas regresivas para los tres fallos. Intento 1 de 2. | `segunda validacion pendiente` |
| 2026-07-20 | `execute-agent` corrigió `process-modeling.js`, `app.css` y `tests/e2e/process-modeling.spec.js`: wrapper estable de fullscreen, render explícito tras carga/restauración, layout de una columna full-width y foco/estado preservados en expand/collapse. Verificación: `node --check` UI/E2E OK; dominio 8/8; unitarios 44/44; E2E focalizado AMD-003 1/1 passed. | `correccion aplicada; validacion humana pendiente` |

### NC-002

| Campo | Valor |
|-------|-------|
| **ID** | NC-002 |
| **Fecha deteccion** | 2026-07-27 |
| **Detectado por** | `ui-log-analysis-agent` |
| **Descripcion** | AMD-005 no cumple el centrado horizontal exigido por AC-25 en el renderizado E2E del BPM: el nodo final `STOCK_MEZCLAS` queda desplazado respecto a `FAB_MEZCLA`. |
| **Comportamiento esperado** | Según `spec.md`, AC-25, y `task_plan.md`, T17/T18/T21: una cadena vertical debe quedar centrada con diferencia máxima de 1 px entre los centros X; las ramas adyacentes deben reservar su anchura sin solaparse. |
| **Comportamiento observado** | En el test `renderiza las preparaciones en paralelo y centra el stock final` (`tests/e2e/process-modeling.spec.js:142`), Playwright observó `Math.abs(positions.STOCK_MEZCLAS.left - positions.FAB_MEZCLA.left) = 7`, frente al umbral esperado `< 1`. La ejecución fue parcial y terminó con 2 fallos; el servidor respondió HTTP 200 en `http://127.0.0.1:8050`. |
| **Evidencia** | `.playwright-artifacts/test-results/2026-07-27T09-59-14/summary.json`, `analysis-report.md`; captura, trace, vídeo y `error-context.md` en `.playwright-artifacts/test-results/2026-07-27T09-59-15/process-modeling-renderiza-b8657-elo-y-centra-el-stock-final/`. |
| **Causa raiz** | `implementation` — `spec.md` y `task_plan.md` describen explícitamente el centrado de AC-25, la tolerancia de 1 px y las tareas de layout correspondientes; la unidad de layout pasa, pero el comportamiento integrado del navegador no cumple. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-07-27 | NC abierta a partir de la evidencia de `ui-log-analysis-agent` del run Playwright `2026-07-27T09-59-14`; se registró la desviación concreta de 7 px frente a AC-25 `<1 px`. | `correccion iniciada` |
| 2026-07-27 | Clasificación contrastada con `spec.md` AC-25 y `task_plan.md` T17/T18/T21: no hay ambigüedad real; causa raíz `implementation`, reentrada `execute-agent`. Intento 1 de 2. | `execute-agent pendiente` |
| 2026-07-27 | Se intentó coordinar la sesión correctora; este entorno no expone una herramienta de sesiones de subagentes aisladas. No se modificó código ni se declaró la corrección ejecutada. | `contingencia abierta; requiere ejecución por execute-agent` |
| 2026-07-27 | `execute-agent` corrector inspeccionó `layout.js`, `measurement.js`, `graph.js` y la evidencia Playwright. Se corrigió la causa de la desviación: las tarjetas de una cadena vertical compartían centro lógico, pero conservaban anchos DOM distintos. El layout asigna ahora una anchura de columna común igual al máximo de la cadena y el renderer aplica `position.width`; se añadieron aserciones puras para `left`, `width` y centrado. Verificaciones locales OK; no se ejecutó una nueva sesión Playwright. | `corrección aplicada; permanece in_correction y requiere nueva validación Playwright` |
| 2026-07-27 | Validación Playwright `2026-07-27T10-10-44`: `FAB_MEZCLA` y `STOCK_MEZCLAS` quedaron con centro X idéntico (`931 px`, delta `0 px`). | `corrección técnica verificada; Gate 3 humano pendiente` |

### NC-003

| Campo | Valor |
|-------|-------|
| **ID** | NC-003 |
| **Fecha deteccion** | 2026-07-27 |
| **Detectado por** | `ui-log-analysis-agent` |
| **Descripcion** | AMD-005 no permite expandir de forma independiente el subproceso `OP3` después de expandir `OP1.1` y `OP2` en el fixture jerárquico. |
| **Comportamiento esperado** | Según `spec.md`, AC-23/AC-24/AC-25 y T18/T20/T21 de `task_plan.md`: cada subproceso debe poder expandirse independientemente; el relayout debe recalcular el subárbol afectado, ancestros, descendientes y bounding box sin solapes ni interferencias de otras ramas. |
| **Comportamiento observado** | En el run Playwright `2026-07-27T10-10-44`, el test `fixture jerárquico permite expandir OP1.1, OP2 y OP3` falló al intentar expandir `OP3`: el subárbol ya expandido de `OP2` intercepta el clic, el botón de expansión se desprende del DOM y vence el timeout de 15 s (`tests/e2e/process-modeling.spec.js:399`). |
| **Evidencia** | `.playwright-artifacts/test-results/2026-07-27T10-10-44/summary.json`, `analysis-report.md` y `.playwright-artifacts/test-results/2026-07-27T10-10-44/process-modeling-fixture-j-5501b-te-expandir-OP1-1-OP2-y-OP3/` (captura, trace, vídeo y `error-context.md`). |
| **Causa raiz** | `implementation` preliminar — el spec exige expansión independiente y relayout sin solapes, y el plan incluye tareas explícitas para expansión/contracción y ramas anidadas; la desviación ocurre en la interacción/renderizado integrado. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-07-27 | NC abierta a partir del análisis del run Playwright `2026-07-27T10-10-44`; se confirmó que el centrado de NC-002 pasa, pero falla la expansión independiente de `OP3`. | `correccion iniciada` |
| 2026-07-27 | Clasificación preliminar contrastada con `spec.md` y `task_plan.md`: no se observa ambigüedad; causa raíz `implementation`, reentrada `execute-agent`. Intento 1 de 2. | `execute-agent pendiente` |
| 2026-07-27 | Corrección pendiente de coordinación/ejecución por `execute-agent`; no se modifica código inline ni se cierra NC-002 o NC-003. | `in_correction; nueva validación Playwright requerida` |
| 2026-07-27 | Se ajustó `measurement.js` para estimar el bounding box de capas y reservar la anchura/altura real del subflujo expandido antes de pintar. La prueba jerárquica pasó `1/1` y la regresión focalizada pasó `4/4`. | `corrección técnica verificada; Gate 3 humano pendiente` |

---

### NC-004

| Campo | Valor |
|-------|-------|
| **ID** | NC-004 |
| **Fecha deteccion** | 2026-07-27 |
| **Detectado por** | `ui-log-analysis-agent` |
| **Descripcion** | La llegada de fuentes provocó una recomposición del grafo mientras el usuario/test interactuaba con él; el viewport quedó momentáneamente sin sus estilos de overflow. |
| **Comportamiento esperado** | El grafo montado debe conservar su DOM interactivo y `overflow-x/y: auto` durante scroll y expansión/contracción. |
| **Comportamiento observado** | Run `2026-07-27T10-29-26`: AMD-004 recibió `overflowX=""` en vez de `auto`; la captura mostró temporalmente solo formularios. |
| **Evidencia** | `.playwright-artifacts/test-results/2026-07-27T10-29-26/` |
| **Causa raiz** | `implementation` — el callback de fuentes reemplazaba el DOM del grafo después de montarlo. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-07-27 | Se evitó el relayout provocado exclusivamente por fuentes cuando `.pm-flow-scroll` ya está montado; se conservan los relayout explícitos. | `corrección aplicada` |
| 2026-07-27 | AMD-004 aislado pasó `1/1`; la regresión focalizada de listado, fixture jerárquico, AMD-003 y AMD-004 pasó `4/4`. | `corrección técnica verificada; Gate 3 humano pendiente` |

### NC-005

| Campo | Valor |
|-------|-------|
| **ID** | NC-005 |
| **Fecha deteccion** | 2026-07-27 |
| **Detectado por** | `programador_humano` |
| **Descripcion** | La URL con seis subprocesos hermanos en `expansion_path` restauraba solo el primero; además, el subflujo de `FAB_MEZCLA` necesitaba `1771 px` mientras su tarjeta reservaba `1350 px`, ocultando tarjetas internas. |
| **Comportamiento esperado** | Todas las expansiones hermanas deben restaurarse y cada tarjeta contenedora debe reservar el ancho real de su layout interno. |
| **Causa raiz** | `implementation` — restauración de hash tratada como ruta exclusivamente anidada y estimación de ancho menor que el layout real. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-07-27 | `restoreFromHash` admite varias expansiones del mismo proceso raíz; la medición reserva el ancho calculado por subárboles y carriles; el contenedor interno conserva el flujo visible. | `corrección aplicada` |
| 2026-07-27 | URL exacta verificada: `6/6` subprocesos expandidos, `0` solapamientos entre tarjetas no anidadas, `FAB_MEZCLA` reserva `1835 px` frente a un subflujo de `1771 px`; regresión Playwright `5/5`. | `corrección técnica verificada; Gate 3 humano pendiente` |

## Tabla resumen

| NC | Causa raiz | Estado | Punto re-entrada | Cierre |
|----|------------|--------|-----------------|--------|
| NC-001 | `implementation` | `in_correction` | `execute-agent` | `pendiente de Gate 3 humano` |
| NC-002 | `implementation` | `in_correction` | `execute-agent` | `pendiente de nueva validación y Gate 3 humano` |
| NC-003 | `implementation` | `in_correction` | `execute-agent` | `pendiente de corrección, nueva validación y Gate 3 humano` |
| NC-004 | `implementation` | `in_correction` | `execute-agent` | `corrección técnica verificada; pendiente de Gate 3 humano` |
| NC-005 | `implementation` | `in_correction` | `execute-agent` | `corrección técnica verificada; pendiente de Gate 3 humano` |
