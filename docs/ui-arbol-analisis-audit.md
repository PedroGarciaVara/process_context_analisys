# Auditoría UX/UI y funcional — Árboles y Análisis de causas

Fecha: 2026-09-11  
Sesión: `audit_rca_ui` · modelo solicitado `gpt-5.6-luna` · razonamiento `medium`  
Alcance: `http://127.0.0.1:8050/#/arboles` y `#/analisis_causas`, más los módulos locales indicados por el encargo. No se modificó código funcional, tests ni datos.

## Resumen ejecutivo

La solución tiene una base visual coherente con Michelin/Flow Studio: hero azul, rail/contexto lateral, canvas de árbol, tarjetas y panel de detalle. La separación entre plantilla causal (`arboles`) y ejecución de investigación (`analisis_causas`) es conceptualmente correcta. La ejecución real en 8051 confirmó CRUD de causa e hipótesis, reutilización de nodos, evaluación preparada para evidencia y la pantalla de apertura; la ruta de análisis sin `analysis_id` no crea ningún dato.

El mayor vacío funcional es la reubicación de causas existentes. La UI ofrece crear raíz, crear hija, editar, eliminar y vincular una causa/contrato reutilizable, pero no expone una operación para cambiar `parent_id` de una causa existente. Los elementos CSS llamados `acv2-tree-parent-drop`/`acv2-tree-child-drop` son conectores visuales, no zonas de arrastre: no hay `draggable`, listeners de `dragstart`/`drop`, comando “Mover” ni endpoint de reparenting en el alcance inspeccionado. Esto impide corregir una jerarquía sin borrar y recrear, y es especialmente peligroso en un árbol causal donde el orden causal cambia la interpretación.

P0 recomendado: incorporar un comando explícito “Mover causa” (drag/drop como acelerador, nunca como único mecanismo), con previsualización, prevención de ciclos, validación de contrato y confirmación con resumen antes de persistir. P1: hacer visible el ciclo científico causa → hipótesis → evidencia/cálculo → aceptar/rechazar → conclusión/acción; mejorar accesibilidad de estados, modales, controles de zoom y textos de error. P2: compactar el espacio de apertura del análisis y añadir historial/undo.

## Evidencia Playwright runtime

Se arrancó una instancia aislada en `127.0.0.1:8051` y se comprobó `GET /api/health` con respuesta `200` y `ready:true`. 8050 no se tocó. Playwright CLI (Chromium headless) navegó ambas rutas en 1440×1000 y 390×844, capturando DOM, texto, consola, respuestas fallidas y screenshots.

Comandos ejecutados:

```bash
WEBAPP_JAVA_PORT=8051 WEBAPP_JAVA_DEBUG=0 bash ./scripts/run_webapp_java_local.sh >.playwright-artifacts/audits/2026-09-11-arbol-analisis/server-8051.log 2>&1 &
curl -fsS http://127.0.0.1:8051/api/health
node --input-type=module - <<'NODE'
import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
for (const route of ['#/arboles','#/analisis_causas']) {
  await page.goto('http://127.0.0.1:8051/'+route,{waitUntil:'networkidle'});
  await page.screenshot({path:'...'});
}
NODE
kill "$PID"
```

Artefactos: [.playwright-artifacts/audits/2026-09-11-arbol-analisis/](../.playwright-artifacts/audits/2026-09-11-arbol-analisis/). Incluyen `health-8051.json`, `server-8051.log`, PID, screenshots `runtime-arboles-1440.png`, `runtime-analisis-1440.png`, sus equivalentes 390px, DOM, texto, info JSON y `runtime-logs.json`. No hubo requests fallidas ni errores de página; sólo warning de Tailwind CDN.

Al finalizar se terminó exclusivamente el proceso iniciado para 8051 y se verificó que el puerto quedó libre. La evidencia visual de móvil revela un problema de layout real: aunque el DOM contiene el contenido, `.michelin-main` aparece después del rail con `y≈4437px` en Árboles y `y≈2355px` en Análisis; la captura 390px muestra principalmente el rail y oculta el contenido útil sin scroll inicial. Esto se clasifica como P0/P1 de responsive, no como inferencia.

## Mapa de tareas de usuario

| Tarea | Ruta | Estado actual | Riesgo/observación |
|---|---|---|---|
| Elegir proceso, objetivo/contrato y ver árbol | Árboles | Implementado | El alcance se filtra por selects; el árbol puede proyectar dependencias DAG. |
| Seleccionar causa y ver contexto | Ambas | Implementado | La tarjeta es botón; el detalle aparece a la derecha. |
| Crear causa raíz | Árboles/detalle | Implementado | Requiere contrato; raíz inicial protegida contra borrado. |
| Crear causa hija | Árboles/detalle | Implementado | Se pasa `parent_id` en la ruta/formulario. |
| Editar causa | Detalle | Implementado | Campos nombre, tipo, categoría y descripción. |
| Reubicar causa existente | Árboles | Ausente | No hay control UI ni contrato de API identificado. |
| Reutilizar/vincular nodo | Detalle | Implementado | Búsqueda modal; semántica es enlace/reutilización, no reparenting. |
| Crear/editar/borrar hipótesis | Detalle | Implementado | Con criterio de validación y estado. |
| Abrir análisis desde plantilla | Análisis | Implementado | Proceso, operación, plantilla, fecha, participante, indicio y máquinas. |
| Evaluar hipótesis con evidencia | Análisis | Implementado | OK/NO OK; evidencia obligatoria. |
| Guardar conclusión, cerrar/reabrir | Análisis | Implementado | Cerrado pasa a solo lectura; reabrir vuelve a editar. |
| Recuperar errores/estado vacío | Ambas | Parcial | Hay mensajes, pero la auditabilidad y el foco accesible deben reforzarse. |

## Inventario funcional actual

- `arboles.js` compone hero, selectores de proceso/objetivo, acción “Crear causa raíz” y `createTreePageShell("arbol")`.
- `tree-render.js` crea tarjetas de 320px, líneas/conectores, resumen de hipótesis, estados pendiente/retenida/descartada y detalle.
- `tree-shell.js` carga `/api/rca-tree/nodes`, selecciona nodos, cambia zoom, crea rutas de detalle, elimina con modal y actualiza estados de hipótesis.
- `causa_detalle.js` y sus componentes soportan modos editar/crear/vincular causa/contrato, búsqueda reutilizable y modales `role="dialog"`.
- `causas.js` expone GET/POST/PATCH/DELETE de causas e hipótesis y POST de enlace reutilizable. No expone mover/reparentar.
- `analisis_causas.js` separa apertura de investigación y workspace de trazabilidad. Guarda apertura, resultados de hipótesis, conclusión, cierre y reapertura.
- `analysis.js` expone lista/creación/lectura/actualización de análisis y guardado de resultados.
- Los tests existentes cubren selección, apertura/evaluación/cierre de análisis y CRUD básico; no cubren mover causa, ciclos, teclado, responsive real ni fallos de red.

## Hallazgos priorizados

### P0 — No existe una operación segura para reubicar causas

**Evidencia:** `tree-render.js` sólo produce conectores `acv2-tree-parent-drop`/`acv2-tree-child-drop`; `tree-shell.js` registra selección, zoom, alta y borrado, pero ningún evento de drag/drop o comando move. `tree-actions.js` sólo construye rutas de detalle. `causas.js` no contiene función/end-point de `move`, `reparent` o actualización de `parent_id`.

**Impacto:** el usuario no puede corregir una relación causal sin recrear nodos; puede perder hipótesis, evidencia y referencias. También se favorece una jerarquía “de plantilla” aunque la investigación demuestre otra cadena.

**Recomendación:** añadir “Mover causa” explícito y persistente; permitir elegir nuevo padre mediante árbol navegable/búsqueda. Drag/drop puede ser atajo sobre esa misma operación. Confirmar: causa, padre actual, nuevo padre, descendientes afectados, hipótesis y alcance. Persistir atómicamente.

### P0 — Prevención de ciclos no es una garantía visible de producto

**Evidencia:** el cliente recorre jerarquía con `findNodeById`, `findParentId`, `removeNodeById` y render recursivo; no se encuentra validación de ancestro/ciclo en la UI ni un contrato de move que la exponga.

**Impacto:** un reparenting futuro podría generar ciclos, render infinito o un DAG inválido.

**Recomendación:** validar en servidor (self-parent, descendiente como padre, contrato cruzado, raíz), devolver 409 con explicación; en cliente deshabilitar candidatos inválidos y anunciar el motivo.

### P0 — En móvil el contenido principal queda desplazado después del rail

**Evidencia runtime:** en 390×844, `runtime-arboles-390.png` muestra el rail vertical ocupando la pantalla. El DOM sí contiene hero, filtros, árbol y detalle, pero medición de bounding boxes sitúa `.michelin-main` en `y=4437px` y el panel contextual en `y=7292px`; en Análisis, `.michelin-main` empieza en `y=2355px`. `scrollWidth=390` y no hay overflow horizontal: el problema es orden/flujo vertical, no una simple tarjeta ancha.

**Impacto:** el usuario móvil no descubre el trabajo principal ni el botón de apertura sin atravesar una navegación excesivamente alta; la pantalla aparenta estar vacía o rota.

**Recomendación:** en ≤768px convertir rail en barra compacta/hamburguesa o colocarlo como navegación horizontal de altura fija; asegurar que main sea el primer contenido después del topbar y que el panel contextual sea acordeón/bottom sheet. Añadir test de visibilidad de `h1` y acción primaria en viewport 390×844.

### P1 — El ciclo científico está presente, pero no es suficientemente legible

**Evidencia:** en análisis cada hipótesis tiene criterio, textarea de evidencia, comentario y botones “OK”/“NO OK”; el cierre sólo pide “Conclusión final del análisis”.

**Impacto:** el usuario puede registrar un resultado, pero no se obliga a declarar variable/medición, fuente, método, ventana temporal, umbral, cálculo o acción posterior. La trazabilidad queda dispersa entre tarjeta y panel.

**Recomendación:** convertir la evaluación en ficha estructurada: hipótesis falsable, predicción, métrica/unidad, fuente, periodo, cálculo/enlace, evidencia, resultado, decisión, responsable y acción de control. Mostrar la cadena en una línea de tiempo por hipótesis.

### P1 — Estados de error y carga tienen baja recuperación

**Evidencia:** `tree-shell.js` reemplaza el canvas por “No hay datos de arbol disponibles.” ante cualquier error y registra sólo `console.error`; `analisis_causas.js` muestra mensaje en alertas.

**Impacto:** se pierde distinción entre sin contrato, sin causas, API caída, permisos y datos corruptos; no hay “Reintentar”, diagnóstico ni preservación del formulario.

**Recomendación:** estados separados (loading/empty/error/offline/forbidden), mensaje accionable, botón retry, código de correlación y `aria-live="polite"`; mantener datos no enviados.

### P1 — Accesibilidad de árbol y zoom incompleta

**Evidencia:** las tarjetas son botones, pero el árbol no declara `role="tree"`, `role="treeitem"`, nivel, expansión o relación padre-hijo. El zoom se expresa visualmente como `ZOOM x`; no se observa etiqueta accesible en el inventario de código. El modal de búsqueda sí declara `role="dialog"` y `aria-modal`.

**Impacto:** lectores de pantalla y teclado no reciben estructura causal; la navegación entre cientos de nodos es costosa.

**Recomendación:** árbol semántico o vista alternativa de lista; roving tabindex, flechas, Home/End, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded`; botones de zoom con `aria-label`, tooltip y atajos opcionales.

### P1 — La acción destructiva se actualiza de forma optimista

**Evidencia:** al confirmar eliminación, `deleteCausa(deleteTargetId).catch(() => null)` ignora el error y oculta el nodo localmente antes de asegurar respuesta exitosa.

**Impacto:** UI puede afirmar una eliminación que falló y desincronizarse del backend.

**Recomendación:** estado pending; sólo ocultar tras 2xx; ante fallo restaurar y presentar error; añadir undo si la API lo permite.

### P1 — En escritorio el árbol se corta por el viewport de trabajo

**Evidencia runtime:** a 1440×1000 el body reporta altura 1000px exacta; la captura de Árboles muestra la cabecera del canvas y la primera tarjeta cortada en el borde inferior, mientras el panel derecho permanece alto. El canvas usa `overflow`/altura del shell y el árbol real es más alto.

**Impacto:** se pierde la percepción de estructura completa y se obliga a descubrir scroll dentro de un área poco evidente.

**Recomendación:** canvas con altura mínima calculada, scroll interno claramente indicado, minimapa y botón “enfocar ruta”; evitar que el screenshot/viewport parezca el final del árbol.

### P2 — Densidad y jerarquía pueden degradarse en árboles anchos

**Evidencia:** tarjetas fijas de 320px, `forest` de ancho máximo y `zoom` CSS; panel lateral de 390–460px en rutas RCA y breakpoints centrados en 1120/1280px.

**Impacto:** en laptop/tablet habrá scroll horizontal y pérdida de contexto; en móvil puede resultar difícil comparar ramas.

**Recomendación:** mantener canvas desplazable con minimapa/breadcrumb y vista lista; colapsar ramas; permitir foco “ruta hasta raíz”; no depender sólo de zoom.

### P2 — Etiquetas y botones son ambiguos para tareas críticas

**Evidencia:** “+ Hija”, “Eliminar”, “OK”, “NO OK” y “Abrir detalle” son compactos; “OK” no explicita “confirmar hipótesis” y “NO OK” no explicita “rechazar”.

**Impacto:** mayor carga cognitiva y riesgo de error en usuarios no familiarizados con RCA.

**Recomendación:** verbos completos, icono + texto, confirmación semántica y ayuda contextual.

## Modelo mental propuesto

1. **Problema/objetivo:** definir gap contra estándar, alcance, proceso, operación, máquina, métrica y fecha.
2. **Mapa causal:** causas como nodos de una jerarquía editable; cada arista expresa “contribuye a” y tiene padre único en árbol o referencias múltiples explícitas en DAG.
3. **Hipótesis:** cada causa puede tener una o varias hipótesis falsables, no sólo una etiqueta de estado.
4. **Prueba:** registrar predicción, método, dato/evidencia, cálculo, fuente y criterio.
5. **Decisión:** retenida/descartada/inconclusa con justificación; mantener alternativas descartadas.
6. **Acción y control:** contramedida, responsable, fecha, métrica post-cambio y control/estándar actualizado.

La UI debe hacer visible la diferencia entre plantilla (editable), investigación (snapshot/versionada) y proyección DAG (nodos compartidos). Un vínculo reutilizable no debe confundirse con mover una causa dentro del mismo árbol.

## Propuesta UI profesional coherente con Michelin/Flow Studio

- Cabecera: breadcrumb `RCA / [proceso] / [objetivo]`, estado de investigación, versión de plantilla y acciones primarias.
- Cuerpo de tres zonas: rail de alcance y filtros; canvas causal central; inspector contextual derecho.
- Barra del canvas: “Añadir causa”, “Mover”, “Conectar/reutilizar”, expandir/colapsar, ruta a raíz, minimapa y zoom etiquetado.
- Tarjeta: tipo/categoría, nombre, relación causal, badges de hipótesis (pendiente/confirmada/descartada), responsable y menú `…` con mover/editar/duplicar/eliminar.
- Inspector: padre actual, ancestros, descendientes, hipótesis, evidencia y actividad; sticky en escritorio y bottom sheet en móvil.
- Análisis: stepper `Definir → Medir → Analizar → Validar → Controlar`, con progreso y bloqueos visibles. ASQ describe DMAIC como enfoque estructurado para procesos existentes que no cumplen estándares o expectativas; la navegación propuesta alinea el producto con ese modelo.
- Empty state: explica qué falta y ofrece acción directa (“Selecciona un contrato”, “Crea causa raíz”, “Importa plantilla”). Error state: distingue causa y ofrece retry.

## Propuesta concreta de mover causas

### Comando recomendado

En menú de causa: `Mover causa…`. Abre modal/panel con:

1. Causa seleccionada y padre actual.
2. Selector de nuevo padre con árbol filtrable, búsqueda y breadcrumb.
3. Exclusiones deshabilitadas: la propia causa y todo su subárbol; tooltip “No puedes mover una causa debajo de sí misma o de un descendiente”.
4. Vista previa “antes/después”, número de descendientes e hipótesis que se conservan.
5. Confirmación explícita: `Mover causa` / `Cancelar`.

Drag/drop opcional: `draggable=true` en tarjeta, targets “Convertir en hija de…” y “Colocar después de…” con feedback de foco/teclado. El drop debe abrir la misma previsualización y no persistir inmediatamente. Alternativa accesible obligatoria: comando y diálogo.

### Contrato recomendado (diseño, no implementado)

`PATCH /api/rca-tree/causes/{id}/parent` con `{parent_id: number|null, expected_version}`. Respuestas 200 con árbol afectado y `moved_from/moved_to`; 409 para ciclo, padre inexistente, contrato distinto o versión obsoleta; 422 para reglas de negocio. Registrar auditoría actor/fecha/motivo. Resolver en backend antes de aceptar el cambio.

## Flujo de hipótesis científico

`Causa observada` → `Hipótesis falsable` → `Predicción y métrica` → `Diseño de prueba` → `Datos/evidencia` → `Cálculo o comparación con umbral` → `Confirmar / rechazar / inconclusa` → `Contramedida` → `Medición post-cambio` → `Control/estándar`.

La práctica Lean de 5 Whys no exige exactamente cinco preguntas: el objetivo es seguir la cadena hasta una causa raíz verificable. Lean Enterprise Institute advierte contra quedarse en el síntoma o en culpar a personas y recomienda observar el trabajo y probar factores. Una causa raíz debe tratarse como hipótesis hasta ser probada, y una solución también debe verificarse; esta es una inferencia de diseño que justifica los campos de evidencia y medición, no una afirmación de que el código actual los implemente.

## Accesibilidad y responsive

- Asociar cada input a `label` visible; no usar sólo placeholder.
- Añadir `aria-describedby` para ayuda/criterio/error y `aria-live` para guardado, retry y validación.
- Focus trap y retorno de foco en modales; Escape/click fuera con confirmación si hay cambios.
- Contraste AA para chips amarillo/azul/rojo; no depender únicamente de color: texto e icono.
- Targets táctiles ≥44px; evitar botones de 2rem para acciones frecuentes sin alternativa.
- Soporte teclado para seleccionar, mover y expandir nodos; anunciar reordenación.
- En ≤768px: canvas horizontal con minimapa, inspector como panel inferior, toolbar sticky y filtros colapsables; no comprimir tres columnas simultáneamente.
- Probar 390×844, 768×1024, 1280×800 y 1440×1000 con zoom de navegador 200%.

## Referencias web primarias/autoritativas

- [ASQ — DMAIC](https://asq.org/quality-resources/dmaic): define DMAIC como enfoque estructurado de mejora de procesos existentes y detalla fases, medición y control.
- [Lean Enterprise Institute — 5 Whys](https://www.lean.org/lexicon-terms/5-whys/): finalidad de profundizar más allá del síntoma y conectar causa raíz con contramedida.
- [Lean Enterprise Institute — Clarifying the 5 Whys](https://www.lean.org/the-lean-post/articles/five-whys-animation/): observar el trabajo, seguir la cadena causal y verificar la contramedida.
- [Lean Enterprise Institute — Problem? What Problem?](https://www.lean.org/the-lean-post/articles/problem-what-problem/): una causa raíz y una solución son hipótesis hasta probarse científicamente.
- [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): reglas consultadas frescas para revisión de interfaz; la guía exige revisar estados, accesibilidad, interacción y responsive.

Hechos de fuentes: se limitan a los conceptos descritos en cada enlace. Inferencias de diseño: modelo mental, UX de mover, stepper y contrato propuesto.

## Criterios verificables recomendados

- `MOVER-01`: menú y comando accesible por teclado mueven una causa a un nuevo padre con confirmación y persistencia tras recarga.
- `MOVER-02`: propio nodo/descendientes aparecen deshabilitados como destino; servidor rechaza ciclos con 409.
- `MOVER-03`: el vínculo de hipótesis, evidencia, resultados y referencias permanece intacto tras mover.
- `MOVER-04`: drag/drop y comando equivalente producen el mismo payload y auditoría.
- `RCA-01`: cada hipótesis muestra criterio, evidencia, resultado y conclusión; no se puede evaluar sin evidencia.
- `RCA-02`: análisis cerrado es solo lectura y conserva resultados tras recarga; reabrir restaura edición explícita.
- `A11Y-01`: Lighthouse/axe sin violaciones críticas; árbol navegable por teclado y modal con foco atrapado.
- `RESP-01`: 390×844 no pierde acciones ni requiere zoom del navegador; 200% mantiene lectura y foco.
- `ERROR-01`: API caída muestra estado diferenciable y botón retry sin borrar formulario no guardado.
- `DATA-01`: borrar o mover sólo cambia UI después de confirmación HTTP exitosa; fallos restauran estado.

## Reporte de fase

- Sub-agente/tarea canónica: `ui-validation-orchestrator` / auditoría UX/UI funcional.
- Skills cargadas: `web-design-guidelines`, `frontend-design`, `playwright-dash-webapp`; se leyó la skill de control de Browser. La guía Web Interface Guidelines se consultó desde su URL oficial antes de revisar.
- Archivos leídos: registry `.atl`, instrucciones del agente UI, skill files, vistas RCA, shell/render/actions/data, controllers `causa-detail-*`, componentes `causa-detail/*`, CSS Michelin/app/layout/forms, APIs RCA/analysis y tres tests E2E solicitados.
- Búsquedas/fuentes: ASQ, Lean Enterprise Institute, Web Interface Guidelines de Vercel (enlaces arriba).
- Comandos Playwright: script Chromium headless para ambas rutas en 1440×1000 y 390×844; error de conexión documentado.
- Artefactos escritos: este informe y carpeta de evidencia bajo `.playwright-artifacts/audits/2026-09-11-arbol-analisis/`.
- Bloqueos: navegador integrado no disponible; se usó Playwright CLI sobre la instancia aislada 8051. 8050 no fue tocado.
- Limpieza: proceso PID registrado en `server-8051.pid` terminado; comprobación final de `ss -ltn` confirmó 8051 libre.
- Recomendación de límites para tareas atómicas: (1) contrato/backend de reparenting y validación de ciclos; (2) comando/diálogo accesible de mover; (3) drag/drop sobre el mismo comando; (4) evaluación científica versionada; (5) estados de error/retry y sincronización optimista; (6) suite Playwright runtime con datos de prueba y limpieza; (7) auditoría accesible/responsive cuando 8050 esté operativo.
