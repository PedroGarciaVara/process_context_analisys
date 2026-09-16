# Revisión visual T13 — Árbol RCA y análisis científico

Fecha: 2026-09-12  
Alcance: revisión manual de las capturas finales de T12/T10, comparación con la auditoría original y comprobación visual de responsive, modal, estados de error, inspector, canvas y reapertura científica. No se modificó código ni tests.

## Estado final v3 — recheck T13 tras NC-010 (intento 2/2)

Se inspeccionó el lote [`rca-final-e2e-v3`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/), incluyendo las capturas obligatorias y las resoluciones representativas. Este bloque es el veredicto técnico de esta revisión; no cierra NCs ni sustituye la validación humana.

| NC visual | Estado técnico v3 | Evidencia y comprobación concreta |
|---|---|---|
| **NC-VIS-01** modal 409 | **PASS visual técnico** | [`mover-409-retry.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-02-323Z-rca-move-scientific/mover-409-retry.png), 1280×720: título, explicación, selección/preview, motivo y `Cerrar`, `Cancelar`, `Reintentar movimiento` son visibles y accionables dentro del diálogo. |
| **NC-VIS-02** zoom 200% equivalente | **PASS visual técnico** | [`zoom-200-equivalent-640px.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-12-421Z-rca-responsive-a11y/zoom-200-equivalent-640px.png): a 640 CSS px la cabecera, contexto, cue de exploración, lienzo, acción y toolbar son legibles; no se observa clipping/overflow documental. La continuación queda contenida en el lienzo, con affordance explícita de desplazamiento horizontal. |
| **NC-VIS-03** tablet 768 | **PASS visual técnico** | [`viewport-768x1024.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-12-421Z-rca-responsive-a11y/viewport-768x1024.png): cabecera, marca, ruta `Inicio`, hero, filtros y acciones no se solapan ni se recortan. |
| **NC-VIS-04** continuación canvas | **PASS visual técnico** | [`viewport-1440x1000.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-12-421Z-rca-responsive-a11y/viewport-1440x1000.png), [`viewport-1280x800.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-12-421Z-rca-responsive-a11y/viewport-1280x800.png) y [`mover-confirmado.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-02-323Z-rca-move-scientific/mover-confirmado.png): el aviso y la toolbar/leyenda hacen descubrible que el árbol continúa dentro del lienzo. |
| **NC-VIS-05** filtros largos | **PASS visual técnico** | [`filters-long-390x844.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-12-421Z-rca-responsive-a11y/filters-long-390x844.png): los valores largos se truncan de forma explícita en el control y se exponen completos en los resúmenes auxiliares; no hay truncado silencioso. |
| **NC-VIS-06** stepper científico | **PASS visual técnico** | [`scientific-stepper-reopen.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-02-323Z-rca-move-scientific/scientific-stepper-reopen.png): las cinco fases `Definir`, `Medir`, `Analizar`, `Validar` y `Controlar` aparecen identificables, numeradas (1–5), sin recorte; `Controlar` queda marcada como fase actual y la siguiente acción es legible. |

**Estado técnico T13:** **PASS visual técnico en v3**, con las seis NC-VIS verificadas en las capturas finales. El estado del requerimiento permanece `implementado_pendiente_validacion`: la validación humana sigue pendiente y no se marca `done` ni se cambia el estado de cierre de ninguna NC.

### Evidencia funcional y errores esperados

- [AC mover/científico](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-02-323Z-rca-move-scientific/ac-results.json): `MOVER-01`, `MOVER-02`, `MOVER-04`, `DATA-01`, `ERROR-01`, `RCA-01` y `RCA-02` pasan.
- [AC responsive/a11y](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-12-421Z-rca-responsive-a11y/ac-results.json): `RESP-01` en 1440/1280/768/390/200%, `A11Y-01`, `NC-VIS-05`, `ERROR-01` y `DATA-01` pasan.
- La consola registra `409 Conflict` (ciclo de movimiento), `500 Internal Server Error` (fallo de borrado) y `503 Service Unavailable` (error/retry); son respuestas mockeadas/esperadas por los casos de error y no regresiones. El `PATCH` 409 en `request-failures.log` es el rechazo esperado del intento de ciclo. `playwright_exit_code=0` en [`run-meta.txt`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/run-meta.txt).
- También se revisaron [`viewport-390x844.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-12-421Z-rca-responsive-a11y/viewport-390x844.png) y [`viewport-1440x1000.png`](../.playwright-artifacts/rca-final-e2e-v3/20260912T100758Z/2026-09-12T10-08-12-421Z-rca-responsive-a11y/viewport-1440x1000.png); no se observan regresiones visuales frente a los criterios ya aprobados.

## Estado actual — recheck final T13 (`rca-final-e2e-v2`)

Esta sección prevalece sobre los hallazgos históricos más abajo. Se inspeccionaron visualmente las tres capturas nuevas obligatorias y las capturas representativas de modal, canvas y responsive; la evidencia automatizada se mantiene separada de la legibilidad observada.

| Criterio | Estado actual | Evidencia final y juicio visual |
|---|---|---|
| **NC-VIS-01** modal 409 | **PASS visual técnico** | [`mover-409-retry.png`](../.playwright-artifacts/rca-final-e2e-v2/2026-09-12T09-56-14-926Z-rca-move-scientific/mover-409-retry.png), 1280×720: título, explicación, preview, motivo, `Cerrar`, `Cancelar` y `Reintentar movimiento` son visibles y accionables dentro del diálogo. |
| **NC-VIS-02** zoom 200% | **ABIERTO P1** | [`zoom-200-effective-390px.png`](../.playwright-artifacts/rca-final-e2e-v2/2026-09-12T09-56-26-484Z-rca-responsive-a11y/zoom-200-effective-390px.png), 780×1688: la tarjeta y el canvas conservan una composición horizontal que desborda la columna; texto y controles quedan cortados/solapados y no aparece una affordance horizontal suficiente. |
| **NC-VIS-03** tablet 768 | **PASS visual técnico** | [`viewport-768x1024.png`](../.playwright-artifacts/rca-final-e2e-v2/2026-09-12T09-56-26-484Z-rca-responsive-a11y/viewport-768x1024.png): marca completa, cabecera sin solape y ruta `Inicio` visible. |
| **NC-VIS-04** continuación canvas | **PASS visual técnico** | [`viewport-1440x1000.png`](../.playwright-artifacts/rca-final-e2e-v2/2026-09-12T09-56-26-484Z-rca-responsive-a11y/viewport-1440x1000.png) y [`mover-confirmado.png`](../.playwright-artifacts/rca-final-e2e-v2/2026-09-12T09-56-14-926Z-rca-move-scientific/mover-confirmado.png): el aviso de desplazamiento y la toolbar/leyenda hacen descubrible la continuación. |
| **NC-VIS-05** filtros largos | **PASS visual técnico** | [`filters-long-390x844.png`](../.playwright-artifacts/rca-final-e2e-v2/2026-09-12T09-56-26-484Z-rca-responsive-a11y/filters-long-390x844.png): los controles muestran truncado explícito y los resúmenes auxiliares exponen el valor completo; no es truncado silencioso. |
| **NC-VIS-06** stepper científico | **ABIERTO P2** | [`scientific-stepper-reopen.png`](../.playwright-artifacts/rca-final-e2e-v2/2026-09-12T09-56-14-926Z-rca-move-scientific/scientific-stepper-reopen.png): la fase actual (`Controlar`) y siguiente acción son legibles, pero la secuencia visible sólo contiene `Definir`, `Medir`, `Analizar`; `Validar` y `Controlar` no aparecen como pasos del stepper. |

**Resultado de la revalidación:** no procede marcar T13 como PASS técnico global. Quedan exactamente NC-VIS-02 (P1, reflow/overflow a 200%) y NC-VIS-06 (P2, secuencia incompleta del stepper). NC-VIS-01, 03, 04 y 05 pasan técnicamente en esta revisión visual. El estado sigue siendo `implementado_pendiente_validacion`, a la espera de corrección de esos dos defectos y validación humana.

**NC-011 — metodología de evidencia:** la nueva captura de zoom tiene geometría identificable (780×1688, equivalente a 390 CSS px con factor 2), `filters-long-390x844.png` ejercita etiquetas largas y `scientific-stepper-reopen.png` sitúa el workspace/stepper en el encuadre. Por tanto, la insuficiencia metodológica anterior queda **resuelta para esta revalidación**: la evidencia ya permite distinguir un defecto real de producto (NC-VIS-02/06) de una captura mal preparada. Esto no cierra NC-010 ni sustituye la validación humana.

## Resultado ejecutivo

### Registro histórico: revalidación post-correcciones A+B (NC-010)

Se inspeccionaron todas las capturas finales de [`rca-nc010-a`](../.playwright-artifacts/rca-nc010-a/) y [`rca-nc010-b`](../.playwright-artifacts/rca-nc010-b/), incluyendo 1440×1000, 1280×800, 768×1024, 390×844, 200% y el flujo 409/reapertura científica. La segunda ejecución de B reproduce las mismas conclusiones visuales que la primera.

| Subcaso | Estado tras A+B | Evidencia visual final |
|---|---|---|
| **NC-VIS-01** modal 409 | **CERRADO visualmente** | [`mover-409-retry.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-34-55-085Z-rca-move-scientific/mover-409-retry.png), 1280×720: título, contenido, `Cerrar`, `Cancelar` y `Reintentar movimiento` quedan dentro del diálogo y accionables. |
| **NC-VIS-02** zoom 200% | **ABIERTO P1** | [`zoom-200.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-35-05-660Z-rca-responsive-a11y/zoom-200.png): el nombre/objetivo se rompe carácter a carácter y la tarjeta/canvas siguen cortados por la columna visible; no hay reflow legible ni affordance horizontal suficiente. |
| **NC-VIS-03** tablet 768 | **CERRADO visualmente** | [`viewport-768x1024.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-35-05-660Z-rca-responsive-a11y/viewport-768x1024.png): marca completa, header sin solape y ruta `Inicio` visible; el contenido no queda bajo una cabecera recortada. |
| **NC-VIS-04** continuación canvas | **CERRADO visualmente** | [`viewport-1440x1000.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-35-05-660Z-rca-responsive-a11y/viewport-1440x1000.png), [`viewport-768x1024.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-35-05-660Z-rca-responsive-a11y/viewport-768x1024.png) y [`mover-confirmado.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-34-55-085Z-rca-move-scientific/mover-confirmado.png): el aviso “Desplaza horizontalmente para explorar el árbol completo” y la toolbar/leyenda hacen descubrible la continuación. |
| **NC-VIS-05** filtros largos | **PASS visual observado; cobertura limitada** | En [`viewport-1440x1000.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-35-05-660Z-rca-responsive-a11y/viewport-1440x1000.png), [`viewport-768x1024.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-35-05-660Z-rca-responsive-a11y/viewport-768x1024.png) y [`viewport-390x844.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-35-05-660Z-rca-responsive-a11y/viewport-390x844.png), los valores mostrados (`Todos los procesos`/`Todos los objetivos`) son completos. Estas capturas no ejercitan un valor largo seleccionado; no se infiere tooltip ni comportamiento de foco para ese caso. |
| **NC-VIS-06** stepper científico | **ABIERTO P2** | [`scientific-reopen.png`](../.playwright-artifacts/rca-nc010-b/2026-09-12T09-34-55-085Z-rca-move-scientific/scientific-reopen.png): se ve `Cadena científica` y el formulario, pero no aparece el stepper `Definir → Medir → Analizar → Validar → Controlar`, ni fase actual/siguiente acción. |

**Resultado actualizado:** A+B resuelven NC-VIS-01, NC-VIS-03 y NC-VIS-04. NC-VIS-02 permanece como P1 y NC-VIS-06 como P2; NC-VIS-05 no muestra fallo en el estado capturado, pero necesita una captura con un valor largo para una comprobación concluyente. Por tanto, **NC-010 sigue abierta y la fase queda en `implementado_pendiente_validacion`**, pendiente de corrección visual adicional y validación humana.

La evidencia automatizada se mantiene separada: los `ac-results.json` de B registran `MOVER-01/02/04`, `RCA-01/02`, `RESP-01` y `A11Y-01` como pasados, pero no prueban legibilidad visual a 200%, presencia del stepper ni cierre por sí solos. No se ejecutaron axe, Lighthouse ni lector de pantalla.

### Registro histórico de la auditoría pre A+B

La corrección del rail móvil era efectiva ya antes de A+B: el contenido principal empezaba en `y=125px` en 390/768px, frente a los valores originales aproximados `y=4437px` (Árboles) y `y=2355px` (Análisis). El sistema visual era coherente con Michelin/Flow Studio: navy/yellow, hero fotográfico, tarjetas blancas, rail contextual y controles de alta prioridad claramente destacados.

La revisión visual no queda cerrada sin corrección. Persisten cuatro problemas observables:

1. **P1 — El diálogo de mover se recorta verticalmente** en la captura 1280×720 del flujo 409: título parcialmente fuera de pantalla y pie/acciones no visibles.
2. **P1 — El zoom 200% no conserva una lectura útil**: el canvas tiene contenido horizontal cortado, el texto de la tarjeta queda truncado y no se ve una affordance de scroll horizontal.
3. **P1 — El breakpoint tablet deja la cabecera/nav visualmente recortada** en 768×1024; sólo se ve una parte del nombre de marca y el rail compacto muestra únicamente “Inicio”, sin menú o indicación del resto de navegación.
4. **P1 — El canvas sigue apareciendo como contenido cortado/sin affordance**: en escritorio y móvil comienza por debajo del viewport y el toolbar queda muy por debajo, sin minimapa/barra de scroll evidente en la primera vista.

Hay además dos observaciones P2: truncado silencioso de valores largos en los selectores de proceso/objetivo y ausencia visible del stepper científico previsto en la pantalla de reapertura.

## Evidencia inspeccionada

Se usó inspección de imagen sobre todas las capturas representativas:

- [1440×1000 final](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/viewport-1440x1000.png), [1280×800 final](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/viewport-1280x800.png), [768×1024 final](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/viewport-768x1024.png), [390×844 final](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/viewport-390x844.png), [zoom 200%](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/zoom-200.png).
- [Mover confirmado](../.playwright-artifacts/test-results/2026-09-12T09-17-49-355Z-rca-move-scientific/mover-confirmado.png), [409/retry](../.playwright-artifacts/test-results/2026-09-12T09-17-49-355Z-rca-move-scientific/mover-409-retry.png), [reapertura científica](../.playwright-artifacts/test-results/2026-09-12T09-17-49-355Z-rca-move-scientific/scientific-reopen.png), [error/retry](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/error-retry.png).
- Capturas T10 de comparación: [Árboles final](../.playwright-artifacts/rca-t10/final-arboles-1440x1000.png), [Árboles 768](../.playwright-artifacts/rca-t10/final-arboles-768x1024.png), [Árboles 390](../.playwright-artifacts/rca-t10/final-arboles-390x844.png), [Análisis final](../.playwright-artifacts/rca-t10/final-analisis_causas-1440x1000.png), [Análisis 390](../.playwright-artifacts/rca-t10/final-analisis_causas-390x844.png), y [captura original 390/200%](../.playwright-artifacts/rca-t10/arboles-390-200pct.png).

La comparación funcional de origen está en [la auditoría original](ui-arbol-analisis-audit.md) y el contexto en [functional-context](ui-arbol-analisis-functional-context.md).

## Métricas objetivas disponibles

Los valores proceden de [`metrics-final.json`](../.playwright-artifacts/rca-t10/metrics-final.json); no son estimaciones de la captura.

| Viewport/ruta | Main | Canvas | Inspector/contexto | Lectura visual |
|---|---:|---:|---:|---|
| 1440×1000 Árboles | `x=104,y=60,w=918,h=940`, `scrollH=1348` | `x=159,y=784,w=808,h=570`, `scrollH=568` | `x=1022,y=60,w=418,h=940` | Sólo ~216px del canvas quedan dentro del viewport; toolbar en `y=1257`. |
| 1280×800 Árboles | `x=104,y=60,w=786,h=740`, `scrollH=1244` | `x=159,y=820,w=676,h=430`, `scrollH=428` | `x=890,y=60,w=390,h=740` | Canvas empieza 20px por debajo del borde inferior del viewport. |
| 768×1024 Árboles | `x=0,y=125,w=768,h=1305` | `x=44,y=892,w=680,h=430` | `x=0,y=1430,w=768,h=532` | Rail compacto corregido, pero canvas/inspector requieren mucho scroll. |
| 390×844 Árboles | `x=0,y=125,w=390,h=1305` | `x=44,y=892,w=302,h=430` | `x=0,y=1430,w=390,h=439` | H1 y acciones sí son visibles; árbol e inspector no aparecen en la primera pantalla. |
| 390×844 Análisis | `x=0,y=125,w=390,h=1450` | — | `y=1575` | Apertura visible; el panel contextual queda fuera de la primera pantalla. |

La auditoría anterior medía `.michelin-main` aproximadamente en `y=4437px` en Árboles y `y=2355px` en Análisis; el valor final `y=125px` confirma la resolución del defecto P0 de orden del rail.

## Checklist por criterio

| Criterio | Estado | Evidencia y límites |
|---|---|---|
| **MOVER-01** | **PASS técnico / NC visual P1** | `ac-results.json` pasa preview, confirmación y PATCH; la captura 409 muestra causa/padre/preview/razón/código. El diálogo no presenta completo su pie de acciones dentro de 1280×720. |
| **MOVER-02** | **PASS técnico / NC visual P1** | `ac-results.json` pasa exclusión y 409 explicativo; el mensaje visible incluye `RCA_CYCLE_DETECTED`, correlación y “Puedes reintentar”. La acción de retry no es visible en la captura recortada. |
| **MOVER-04** | **PASS** | La ejecución T12 registra teclado y drag/drop en el mismo diálogo/PATCH; no se observa una divergencia visual entre comandos. |
| **RCA-01** | **PASS técnico / observación P2** | T12 pasa evidencia/criterio/decisión. La reapertura muestra “Cadena científica”, pero la vista capturada no hace visible una secuencia `Definir → Medir → Analizar → Validar → Controlar`; la progresión se percibe como formulario largo. |
| **RCA-02** | **PASS técnico** | T12 pasa cerrado/reapertura. La captura conserva la conclusión y muestra el estado de trabajo; no se afirma validación de lector de pantalla. |
| **A11Y-01** | **NC visual P1 / PASS automatizado parcial** | T12 registra `role=tree/treeitem`, foco del diálogo y Escape. Visualmente, 200% no refluye de forma legible y el modal 409 está recortado. No se ejecutaron axe ni Lighthouse. No hay evidencia de validación con lector de pantalla. |
| **RESP-01** | **NC visual P1 / PASS automatizado parcial** | T12 pasa h1/acción y `scrollWidth` en 1440/1280/768/390; visualmente persisten cabecera tablet recortada, canvas fuera de la primera vista y zoom 200% con contenido cortado. “Sin overflow horizontal” no equivale a “contenido largo legible”. |

## Hallazgos visuales

### NC-VIS-01 — Modal de mover no cabe completo en el viewport

- **Severidad:** P1.
- **Evidencia:** [`mover-409-retry.png`](../.playwright-artifacts/test-results/2026-09-12T09-17-49-355Z-rca-move-scientific/mover-409-retry.png), 1280×720. El encabezado “Mover causa” queda cortado por el borde superior y el pie de acciones/reintento no aparece antes del borde inferior; el fondo sí muestra el diálogo abierto.
- **Impacto:** el usuario puede leer el conflicto pero no descubre de forma fiable cómo cerrar o reintentar; el estado de error no es operacionalmente completo.
- **Recomendación mínima:** en `uc_bib_solv/webapp/js/components/tree-move-dialog.js` y los estilos del diálogo (`uc_bib_solv/webapp/css/michelin-ui.css`), limitar la caja a `max-height: calc(100dvh - 32px)` con `overflow-y:auto`, mantener encabezado y pie accionable visibles/sticky y comprobar 1280×720 y 390×844.

### NC-VIS-02 — 200% conserva geometría horizontal, no lectura

- **Severidad:** P1.
- **Evidencia:** [`zoom-200.png`](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/zoom-200.png), 390×1688. “TEST_RCA…” y “Sin descrip…” se cortan a la derecha; el canvas y el botón “Mover causa…” exceden la columna visible y no hay scroll horizontal visible en la captura. La captura T10 [`arboles-390-200pct.png`](../.playwright-artifacts/rca-t10/arboles-390-200pct.png) muestra el mismo patrón.
- **Impacto:** `RESP-01-200` pasa sólo que se renderiza/captura; no demuestra lectura ni foco utilizables.
- **Recomendación mínima:** en `uc_bib_solv/webapp/css/michelin-ui.css`/`layout.css`, aplicar reflow real a 200% (tarjeta y toolbar a una columna, `min-width:0`, wrapping de texto) o exponer explícitamente un contenedor con `overflow-x:auto`, scrollbar/affordance y foco navegable.

### NC-VIS-03 — Breakpoint 768px recorta marca y oculta navegación

- **Severidad:** P1.
- **Evidencia:** [`viewport-768x1024.png`](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/viewport-768x1024.png) y [`final-arboles-768x1024.png`](../.playwright-artifacts/rca-t10/final-arboles-768x1024.png). En la franja superior el texto de marca aparece parcialmente cortado; el rail compacto sólo muestra “Inicio”, sin botón/menú para recuperar Árbol, Análisis, ayuda u otras secciones. El comportamiento de 390px sí muestra una marca completa, por lo que el defecto está concentrado en el breakpoint intermedio.
- **Impacto:** pérdida de orientación y de navegación disponible en tablet; también debilita la apariencia profesional por solape/corte del header.
- **Recomendación mínima:** en `uc_bib_solv/webapp/css/layout.css`/`michelin-ui.css`, fijar una sola geometría de header para 768px, reservar altura real para marca/nav y mostrar menú/rail expandible o al menos la ruta activa con acceso a las demás secciones.

### NC-VIS-04 — Canvas/inspector sin affordance de continuación

- **Severidad:** P1.
- **Evidencia:** métricas finales y [`viewport-1440x1000.png`](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/viewport-1440x1000.png), [`viewport-1280x800.png`](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/viewport-1280x800.png), [`viewport-390x844.png`](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/viewport-390x844.png). A 1440 el canvas inicia en `y=784` y su toolbar en `y=1257`; a 1280 inicia en `y=820`; a 390 inicia en `y=892` y el inspector en `y=1430`. En la primera vista no hay minimapa, scrollbar evidente, breadcrumb de ruta ni control “enfocar ruta”.
- **Impacto:** aunque no existe overflow horizontal del documento, la composición puede parecer terminada/cortada y exige descubrir scroll interno o scroll de página sin señal suficiente.
- **Recomendación mínima:** en `uc_bib_solv/webapp/css/michelin-ui.css`/`layout.css`/`tree-render.js`, hacer visible la affordance de scroll del canvas (scrollbar/gradiente/flecha/minimapa), mantener toolbar sticky dentro de la zona de trabajo y convertir inspector móvil en bottom sheet/acordeón cercano a la selección.

### NC-VIS-05 — Truncado silencioso de filtros largos

- **Severidad:** P2.
- **Evidencia:** [`final-arboles-1440x1000.png`](../.playwright-artifacts/rca-t10/final-arboles-1440x1000.png), [`final-arboles-768x1024.png`](../.playwright-artifacts/rca-t10/final-arboles-768x1024.png) y [`viewport-390x844.png`](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/viewport-390x844.png). Los valores de Proceso/Objetivo terminan cortados (“Preparación de produ…”, “...de la r…” o “...dentro...”) sin elipsis/tooltip visible ni forma de revisar el valor completo.
- **Recomendación mínima:** en `uc_bib_solv/webapp/css/forms.css`/`michelin-ui.css`, usar truncado explícito con `text-overflow: ellipsis` y `title`/ayuda accesible, o aumentar el control/mostrar el valor completo al foco.

### NC-VIS-06 — Stepper científico no visible en reapertura

- **Severidad:** P2.
- **Evidencia:** [`scientific-reopen.png`](../.playwright-artifacts/test-results/2026-09-12T09-17-49-355Z-rca-move-scientific/scientific-reopen.png). La vista muestra “Cadena científica” y campos, pero no la navegación de fases planificada; el panel está además parcialmente fuera del encuadre vertical.
- **Recomendación mínima:** en `uc_bib_solv/webapp/js/views/rca/analisis_causas.js`/`uc_bib_solv/webapp/css/michelin-ui.css`, hacer persistente y visible el stepper/progreso junto a la ficha, con fase actual, bloqueos y siguiente acción.

## Estados y affordances

- **PASS visual:** paleta Michelin coherente, contraste aparente fuerte en navy/blanco/amarillo, jerarquía hero → alcance → canvas → inspector, acciones primarias amarillas y tarjetas con bordes/espaciado consistentes. Los botones de acción principales en 390px tienen altura visual aproximada de 44px.
- **PASS técnico con evidencia automatizada:** `11 passed, 1 skipped` en [playwright-list.log](../.playwright-artifacts/test-results/20260912T091745Z-rca-t12b-rerun6/playwright-list.log); los resultados AC están en [move/scientific](../.playwright-artifacts/test-results/2026-09-12T09-17-49-355Z-rca-move-scientific/ac-results.json) y [responsive/a11y](../.playwright-artifacts/test-results/2026-09-12T09-17-59-279Z-rca-responsive-a11y/ac-results.json).
- **409/retry:** el texto es semántico y útil (`RCA_CYCLE_DETECTED`, correlación y posibilidad de reintento), pero el encuadre no deja visible el control final; ver NC-VIS-01.
- **Error 503:** la ejecución registra error/retry accionable y no afirma éxito; la captura no permite verificar visualmente todos los controles, por lo que la conclusión procede del AC automatizado, no de una afirmación de layout completo.
- **Foco/modal:** el flujo automatizado pasa foco y Escape. La evidencia visual no contiene una captura del foco tras cada transición; no se debe interpretar como validación de lector de pantalla.
- **Touch targets:** las acciones primarias son razonables en móvil; los iconos compactos de check/cierre de las tarjetas parecen pequeños y deben verificarse con bounding boxes/teclado antes de declarar cumplimiento total de 44px.
- **Contraste:** no se ejecutó medición programática de contraste; el juicio es visual y no sustituye axe/Lighthouse.

## Automatización y límites

- Playwright: `11 passed, 1 skipped`; el caso live omitido está explicitado en `playwright-list.log`.
- Requests fallidos esperados: 409, 500 y 503 aparecen en `console.log`; `request-failures.log` queda vacío en los dos lotes revisados.
- **No se ejecutaron axe ni Lighthouse.**
- **No hubo validación con lector de pantalla**, ni debe inferirse de los checks de roles/atributos de Playwright.
- La revisión visual se hizo sobre las imágenes enumeradas arriba; no se alteró el servidor 8050 ni se hicieron cambios de producto.

## Conclusión histórica de fase T13 (antes de `rca-final-e2e-v2`)

**Estado actualizado: NC visual abierta; no recomendar `done`.** Tras A+B, NC-VIS-01, NC-VIS-03 y NC-VIS-04 tienen cierre técnico visual en las capturas finales. NC-VIS-02 permanece abierta como P1 por la ilegibilidad a 200%; NC-VIS-06 permanece abierta como P2 por la ausencia del stepper. NC-VIS-05 no presenta truncado en los valores mostrados, pero requiere cubrir explícitamente un valor largo seleccionado. La corrección adicional debe repetirse con las capturas afectadas y pasar validación humana.

Fuente normativa de revisión de interfaz: [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultada el 2026-09-12.

## Cierre actual de esta revisión

**T13 técnico: NO PASS global; pendiente de corrección.** El recheck final confirma el cierre visual técnico de NC-VIS-01, NC-VIS-03, NC-VIS-04 y NC-VIS-05. Permanecen abiertas **NC-VIS-02 (P1)** y **NC-VIS-06 (P2)**, con las capturas finales enlazadas arriba. **NC-011 queda metodológicamente resuelta en esta iteración**, pero su evidencia no implica que los dos defectos de producto estén resueltos. No se ejecutaron axe, Lighthouse ni lector de pantalla; la validación humana sigue pendiente.
