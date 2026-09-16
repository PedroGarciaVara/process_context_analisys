## Metadata
- Requirement ID: `requerimiento_21`
- Spec File: `./requeriments_spec_driven_development/requerimiento_21/spec.md`
- Status: `en_correccion`
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
- Created At: `2026-09-13`
- Last Updated: `2026-09-13`
- Authorship: `plan-task-agent`, sesión aislada, `gpt-5.6-luna`, `model_reasoning_effort=medium`
- Amendment provenance: `AMD-21-001` (Type B, Gate 1 y Gate 2 aprobados el 2026-09-13); `AMD-21-002` (Type B, Gate 1 aprobado «sí» y Gate 2 aprobado «aprobar», ambos el 2026-09-13).

---

## Objective

Corregir las diez incidencias de navegación, integridad de asociaciones, contexto
BPM/RCA, presentación y edición de resultados descritas en el spec, extendiendo la
SPA y los módulos BPM/RCA existentes, con pruebas backend y evidencia Playwright
real para cada criterio aplicable. El plan no autoriza implementación hasta la
aprobación humana de Gate 2. La corrección `AMD-21-001` fija además el join
`machine_operation_configuration JOIN maquina` como única fuente de membresía y
elimina/rechaza sus representaciones JSON duplicadas. AMD-21-002 añade el selector
buscable y la selección múltiple acumulativa sin cambiar esa fuente de verdad.

---

## Scope

### In Scope
- FR-21-01..FR-21-10 y AMD-21-002 (AC-21-18..23) en `uc_bib_solv/webapp` y en los módulos existentes
  `uc_bib_solv/modules/bpm` y `uc_bib_solv/modules/rca_tree`.
- Integridad backend y persistencia atómica sin tablas nuevas; solo modificar DDL
  o migraciones si una verificación demuestra necesidad compatible con el spec.
- Tests unitarios/integración para AC-21-11 y una suite Playwright con un escenario
  identificable por cada AC-21-01..10 y AC-21-18..23, conservando AC-21-02/13..17.
- Estado local transitorio de edición por IDs canónicos, selector buscable, botón
  “Seleccionar máquina”, recuadro de asociadas, eliminación/re-agregado y fixture
  E2E de más de 100 máquinas.
- Inspección visual de las capturas incrustadas en ambos ODT antes de retirar los
  paneles de FR-21-08/09.
- Evidencias por ejecución en
  `.playwright-artifacts/test-results/<timestamp>-req21/`.

### Out of Scope
- Migración de framework, rediseño visual general, nuevas tablas, roles/permisos o
  capacidades de análisis no descritas.
- Cambios en modelos, APIs, árbol o resultados compartidos para retirar únicamente
  presentación redundante.
- Restaurar, borrar, rebasear o atribuir cambios ya presentes en el worktree.

---

## Inputs
- Client requirement: `./requerimientos_cliente/solucionar_problemas_encontrados.odt`
- Client requirement: `./requerimientos_cliente/solucionar_problemas_encontrados_02.odt`
- Technical specification: `./requeriments_spec_driven_development/requerimiento_21/spec.md`
- Traceability: `./requerimientos_cliente/traza_requerimiento.md`
- Supporting code:
  - `./uc_bib_solv/webapp/js/views/{maquinas,bpm,rca}/`
  - `./uc_bib_solv/webapp/js/components/` y `js/api/`
  - `./uc_bib_solv/modules/{bpm,rca_tree}/`
  - `./db_management/schema.sql` y migraciones existentes
  - `./tests/unit/`, `./tests/integration/`, `./tests/e2e/`
- Supporting workflow: `.atl/sub-agent-registry.md`, `.atl/skill-registry.md`,
  `common_spec_driven_development/templates/task_plan.template.md`

---

## Assumptions
- Gate 1 está aprobado por el programador humano para `AMD-21-001` y `AMD-21-002`
  (respuesta «sí», 2026-09-13); Gate 2 de AMD-21-002 fue aprobado con «aprobar»
  el 2026-09-13.
- La URL, fixtures y credenciales de Playwright se resolverán con la configuración
  vigente del proyecto; nunca se inventarán datos de producción.
- Las pruebas de contrato/mock sirven como apoyo, pero no sustituyen la UI real ni
  permiten declarar conformidad si el backend, Chromium o fixtures bloquean el run.
- Cada dato creado por E2E usará prefijo `TEST_` y se limpiará en el propio test o
  `afterAll`, conforme a la skill de Playwright.
  - La lista exacta de archivos finales de la corrección se determinará durante T12; no se asume que
  todos los archivos actualmente modificados pertenecen a req-21.

---

## Dependencies
- Sub-agents:
  - `execute-agent` para implementación, solo tras Gate 2.
  - `ui-validation-orchestrator` para setup/generación/ejecución/recuperación/análisis UI.
  - `ui-log-analysis-agent` para `analysis-report.md` y candidatos NC.
  - `playwright-setup-agent`, `ui-test-generation-agent`, `ui-test-execution-agent`,
    `ui-log-recovery-agent` cuando el orquestador los active.
  - `nc-resolution-agent` si aparece una NC.
- Skills cargadas: `plan-task-agent`, `git-workflow`, `webapp-architecture`,
  `config-management`, `connections-management`, `data-model-management`,
  `domain-logic`, `frontend-design`, `web-design-guidelines`,
  `postgresql-primary-persistence`, `dash-callbacks`, `ui-test-structure`,
  `ui-log-recovery`, `playwright-dash-webapp`.
- Placement AMD-21-002: `webapp/js/views/bpm/operacion_form.js` y
  `operaciones_detalle.js` para render/estado/eventos; `webapp/js/api/process-modeling.js`
  solo para el contrato existente; dominio/aplicación/repositorio BPM existentes para
  validación y persistencia; tests unitarios/contrato bajo `tests/` y E2E bajo
  `tests/e2e/`. No crear módulo paralelo.
- Technical dependencies: SPA JavaScript y contratos HTTP existentes; PostgreSQL
  y sus transacciones/adaptadores; Node/Playwright/Chromium; fixture y URL E2E;
  acceso de lectura a los ODT y sus imágenes.

---

## Execution Strategy

Orden secuencial: primero separar el estado previo del worktree y reproducir las
incidencias; después fijar la referencia visual ODT y los contratos afectados;
luego implementar dominio/persistencia antes de los adaptadores HTTP y la UI;
finalmente generar y ejecutar Playwright, recuperar logs, analizar resultados y
corregir NC. Las áreas UI se mantienen separadas para limitar diffs y facilitar la
atribución. Para AMD-21-002 se añade baseline específico del editor, estado local
transitorio, UI dropdown/recuadro, integración con el guardado canónico y después
tests unitarios/contrato y Playwright real. Cada tarea produce evidencia o un bloqueo
explícito.

### Worktree safety protocol

Antes de cualquier edición, T1 debe guardar `git status --short`, `git diff`
(`--` y staged), lista de archivos no trackeados y snapshots hash/contenido de cada
archivo que T2 declare afectado. Los snapshots se guardarán fuera del conjunto de
entrega de req-21 o en una ruta de artefactos claramente marcada como preexistente.
No usar `git reset`, `checkout`, limpieza masiva ni `git add .`; revisar cada diff y
atribuir solo cambios producidos después de T1. Si un archivo está ya modificado,
preservar su contenido y aplicar un diff focalizado sobre la versión actual.

---

## Human Validation Gates

### Gate 1: Spec Validation
- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `approved`
- Evidence: `spec.md` registra la validación explícita del 2026-09-13.

### Gate 2: Task Plan Approval
- Required State Before Implementation: aprobación humana explícita de este archivo.
- Decision Owner: `programador_humano`
- Status: `approved`
- Evidence: aprobación humana explícita «aprobar» de AMD-21-002, recibida el
  2026-09-13; T21-T28 quedan autorizadas para `execute-agent`.
- Notes: `execute-agent` queda autorizado a ejecutar T21-T28 conforme al orden y
  restricciones del plan; no se adelanta Gate 3 ni se cierran NC previas.

### Gate 3: Final Implementation Validation
- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending` (global; NC-005 validada individualmente)
- Notes: requiere revisión de diff, tests backend, run Playwright completo,
  `analysis-report.md` sin NC abiertas y verificación manual de capturas.

---

## Tasks

### T1. Diagnóstico reproducible y baseline del worktree
- Goal: distinguir cambios de req-21 de cambios preexistentes y establecer una
  reproducción verificable de las diez incidencias.
- Inputs: spec, `git status/diff`, rutas SPA/BPM/RCA, fixtures y URL disponibles.
- Actions:
  - Inventariar archivos potencialmente afectados por FR-21-01..10 y registrar
    propietario funcional (UI, API, dominio o persistencia).
  - Tomar snapshots por archivo afectado (hash y copia legible) y registrar estado
    staged/unstaged/untracked; no modificar ni limpiar cambios previos.
  - Reproducir cada incidencia con comandos o pasos observables y anotar el
    resultado esperado/actual; marcar bloqueos de entorno.
- Output: `diagnostic-req21.md` o reporte de trabajo en artefactos del run, matriz
  de archivos y baseline; ningún cambio funcional.
- Status: `done`
- Evidence: baseline exacto y snapshots en `artifacts/req21-baseline/`; diagnóstico
  reproducible en `diagnostic-req21.md`. No se restauraron ni limpiaron cambios previos.

### T2. Contratos y referencia visual de los dos ODT
- Goal: fijar exactamente paneles, zonas, rutas, payloads y selectores que deben
  conservarse antes de eliminar presentación.
- Inputs: ambos ODT, capturas incrustadas, T1, código de vistas/componentes.
- Actions:
  - Renderizar/inspeccionar visualmente las capturas, especialmente primera
    captura del segundo ODT para FR-21-08 y panel “Cadena científica”/símbolo
    “solo lectura” para FR-21-09.
  - Documentar identificadores DOM, accesibilidad, endpoints, contratos de datos,
    estados de carga/error y dependencias compartidas del árbol/resultados.
  - Confirmar que el plan extiende módulos existentes y que no requiere nuevo
    bounded context ni tabla.
- Output: matriz de referencia visual/contratos y lista final de archivos afectados
  que actualiza los snapshots de T1; decisión explícita de preservación de modelos.
- Status: `done`
- Evidence: ODT convertidos a PDF/PNG en `artifacts/req21-baseline/`; paneles y
  contratos documentados en `diagnostic-req21.md`. No se crean tablas ni contextos.

### T3. Backend, dominio e integridad transaccional
- Goal: hacer obligatorias en backend las reglas de existencia, pertenencia,
  edición y atomicidad.
- Inputs: T1-T2, casos de uso/repositorios BPM/RCA y schema/migraciones actuales.
- Actions:
  - Reutilizar `modules/bpm` para validar máquinas existentes y relaciones de
    operación/contrato, rechazando inválidos sin mutación parcial.
  - Reutilizar `modules/rca_tree` para validar hipótesis, estado editable/cerrado
    y guardar evaluación/evidencia/conclusión en una transacción atómica.
  - Mantener conexiones en adaptadores PostgreSQL, respetar Clean Architecture y
    no duplicar reglas en JavaScript; no crear tablas.
  - Ajustar HTTP solo para errores accionables y contratos ya vigentes.
- Output: cambios backend focalizados y cobertura de errores/rollback; DDL solo si
  la verificación lo justifica y queda documentado.
- Status: `done`
- Evidence: `save_contract_machines` valida catálogo y reemplaza relaciones en
  transacción única; `analysis_postgres.save` valida estado y pertenencia de causa/
  hipótesis antes de mutar. Persistencia existente conservada, sin DDL nuevo.

### T4. UI máquinas: navegación, tabs y asociación
- Goal: resolver FR-21-01..03 conservando rutas y formularios existentes.
- Inputs: T2-T3, vistas `maquinas`, router, componentes y APIs BPM.
- Actions:
  - Cambiar Crear máquina a la ruta SPA de detalle en modo creación, sin modal,
    con estados de guardado/error equivalentes al detalle.
  - Mostrar Máquina genérica/específica como tabs accesibles, montando solo panel
    activo y preservando valores editados.
  - Limitar selector de asociación a catálogo real, mostrar rechazo accionable y
    mantener relación válida tras guardado/recarga.
- Output: diff focalizado UI/API adaptadora, accesibilidad y regresiones cubiertas.
- Status: `done`
- Evidence: navegación a `maquinas_detalle?new=1`, tabs del modal legacy y filtros
  de catálogo ya presentes en el baseline previo; se preservaron y verificaron con
  tests Node focalizados. La validación UI real queda para T8/T9.

### T5. UI contratos, operaciones y procesos: contexto y filtro
- Goal: resolver FR-21-04..07 en las vistas BPM existentes.
- Inputs: T2-T3, vistas `bpm/{contratos,operaciones,operaciones_detalle,procesos,procesos_detalle}`.
- Actions:
  - Cargar filtro inicial de contratos y lista solo después de respuesta de
    catálogo, sin estado vacío prematuro ni reload manual.
  - Mostrar en operación contratos, máquinas, descripción y acción al flujo BPM
    con jerarquía del patrón Procesos.
  - Mostrar descripción del proceso seleccionado y estado explícito sin descripción;
    actualizar al cambiar selección.
  - En contrato, filtrar asociadas por relaciones persistidas, ofrecer selector de
    disponibles, guardar y refrescar tras recarga.
- Output: diff UI focalizado, estados loading/empty/error accesibles y contratos
  de API preservados.
- Status: `done`
- Evidence: contratos/operaciones/procesos ya proyectan contexto y descripción en
  las vistas actuales; contratos exponen selector `available`/`assigned` y el
  backend ahora garantiza asociación atómica. Playwright pendiente.

### T6. UI RCA: eliminación quirúrgica y edición de resultados
- Goal: resolver FR-21-08..10 sin romper árbol, resultados ni modelo compartido.
- Inputs: T2-T3, vistas/componentes RCA, referencia ODT.
- Actions:
  - Retirar exclusivamente el panel identificado en T2 del árbol, verificando
    selección, zoom, acciones, navegación y carga de nodos.
  - Retirar “Cadena científica”, sus modelos de presentación y símbolo “solo
    lectura” solo donde corresponda, sin eliminar datos/APIs/hipótesis/resultados.
  - Añadir controles editables, loading y errores accionables para análisis abierto
    y nuevo; conservar rechazo con motivo en análisis cerrado.
- Output: diff RCA focalizado y evidencia de que los modelos compartidos siguen
  disponibles para árbol/resultados.
- Status: `done`
- Evidence: árbol conserva selección/zoom/acciones y el análisis usa evaluación de
  hipótesis inline; se retiró el texto visible de solo lectura del inspector y se
  protegió el desmontaje del panel científico legacy. Playwright pendiente.

### T7. Tests unitarios e integración backend
- Goal: probar invariantes independientes de la UI y cubrir AC-21-11.
- Inputs: T3, patrones existentes en `tests/unit` y `tests/integration`.
- Actions:
  - Testear máquina inexistente: rechazo y cero relaciones creadas/eliminadas.
  - Testear payload/hipótesis inválidos: rollback y ausencia de escritura parcial.
  - Testear análisis cerrado: rechazo de edición y motivo de dominio; incluir
    transacción/atomicidad con repositorios reales o integración apropiada.
  - Ejecutar solo tests focalizados y reportar por separado fallos de la suite
    amplia o del entorno.
- Output: tests y reporte reproducible de AC-21-11.
- Status: `done`
- Evidence: tests Node focalizados 15/15; tests Python RCA/BPM ejecutados con
  `.venv/bin/python -m pytest`, 19 passed y 5 fallos preexistentes de KPI en
  `test_bpm_domain.py`/`test_contract_bpm_scope.py`. No se ejecutó Playwright.

### T8. Setup y generación de suite Playwright
- Goal: producir escenarios E2E reales, uno por AC-21-01..10, con estructura y
  artefactos canónicos.
- Inputs: spec, T2-T6, `ui-test-structure`, `ui-log-recovery`,
  `playwright-dash-webapp`, configuración/fixtures.
- Actions:
  - Delegar setup si falta a `playwright-setup-agent` y generación a
    `ui-test-generation-agent`, coordinados por `ui-validation-orchestrator`.
  - Crear casos identificables `AC-21-01` ... `AC-21-10`, registrar `acResults[id]`
    antes del expect final y adjuntar screenshot/respuesta relevante.
  - Usar URL/backend real (no iframe exterior ni mocks como prueba final),
    selectores accesibles, esperar respuestas/alertas y recargar para toda
    persistencia de UPDATE/ADD.
  - Limpiar datos `TEST_` creados; no pasar silenciosamente si faltan fixtures.
- Output: specs Playwright en `tests/` y contrato de salida para `ac-results.json`.
- Status: `done`
- Evidence: suite real y escenarios AC-21-01..10 presentes en el run
  `2026-09-13_10-30-00-req21-rerun1/`, con entradas 1:1 en `ac-results.json`.

### T9. Ejecución UI, recuperación de logs y análisis
- Goal: obtener evidencia completa y detectar bloqueos/NC sin declarar conformidad
  prematuramente.
- Inputs: T8, URL/backend, credenciales/storage state, variables E2E.
- Actions:
  - Delegar el flujo completo a `ui-validation-orchestrator`; usar ejecución,
    recuperación y análisis registrados por los agentes del registry.
  - Ejecutar en carpeta única `.playwright-artifacts/test-results/<timestamp>-req21/`
    con `ac-results.json`, screenshots, `summary.json`, console/network logs,
    request/response errors, backend/scenario logs cuando estén disponibles y
    `analysis-report.md` de `ui-log-analysis-agent`.
  - Verificar correspondencia 1:1 AC-21-01..10; cada entrada debe incluir `passed`,
    detalle y enlaces a evidencia. Si Chromium/backend/fixtures/auth bloquean,
    registrar bloqueo y mantener estado no conforme/pending, nunca PASS.
- Output: carpeta de run completa, reporte de análisis y lista de candidatos NC.
- Status: `en_correccion`
- Evidence: `summary.json` registra 10 pass/0 fail/0 skip; `analysis-report.md`
  PASS sin candidatos NC nuevos, pero Gate 3 humano detectó falsos positivos:
  “Solo lectura” sigue visible y el flujo real OK/NO OK no persiste. NC-003/NC-004
  reabren T9 para validación completa. El rerun
  `2026-09-13_15-30-00-req21-nc4-rerun2` obtiene 9 pass/1 fail: ambos POST de
  AC-21-10 responden 201 con payload completo, pero el GET posterior devuelve
  resultados históricos; se registra NC-004-PERSIST.

### T10. Correcciones, regresión y preparación de Gate 3
- Goal: cerrar defectos encontrados y preparar validación humana final.
- Inputs: T7-T9, diffs desde snapshots T1, análisis-report, spec.
- Actions:
  - Si hay NC, delegar a `nc-resolution-agent`, clasificar raíz (`spec`,
    `task_plan` o `implementation`) y reentrar en la fase correcta; máximo dos
    intentos antes de escalar.
  - Repetir tests backend y run Playwright completo tras cada corrección relevante;
    conservar artefactos separados y revisar diff atribuido a req-21.
  - Realizar revisión manual de capturas, accesibilidad, no regresión de rutas,
    árbol, selección, zoom, navegación y datos; higiene pre-commit sin DEBUG/FIXME.
- Output: implementación en `implementado_pendiente_validacion`, run final,
  matriz AC/NFR y paquete para Gate 3; no marcar `done`.
- Status: `en_correccion`
- Evidence: regresión final Node 48/48; regresión Python T7 14/14; `py_compile`,
  `node --check`, `git diff --check` y validación estructural de artefactos
  correctos. NC-003/NC-004 abiertas tras rechazo de Gate 3; se requiere
  corrección delegada a `execute-agent`, tests focalizados y nuevo Playwright
  completo antes de solicitar validación humana. El intento 2 de NC-004 corrige
  la entrada (OK/NO OK HTTP 201 con `decision_justification`) pero deja abierta
  NC-004-PERSIST por lectura histórica; alcanzado el máximo de dos intentos,
  cualquier intento 3 requiere decisión humana explícita.

### T11. Documentación y trazabilidad posterior a validación
- Goal: actualizar documentación solo después de la validación humana final.
- Inputs: resultado Gate 3, artefactos finales, estado real del worktree.
- Actions:
  - Delegar a `documentation-agent` y `context-agent` si Gate 3 es conforme.
  - Actualizar `traza_requerimiento.md` al estado real y proponer commits por tarea
    según `git-workflow`; usar `spec(req-21)...[skip ci]` para artefactos SDD y no
    hacer push sin autorización humana.
- Output: documentación/contexto/traza actualizados y propuesta de commit, o
  registro de bloqueo si Gate 3 no está aprobado.
- Status: `pending`

### T12. Baseline y atribución de la corrección AMD-21-001
- Goal: aislar la corrección de la enmienda frente al worktree sucio y a las tareas
  previas de req21.
- Inputs: `git status --short`, diffs staged/unstaged, snapshots T1, spec AMD-21-001,
  `nc-log.md` y esquema/repositorios actuales.
- Actions: registrar hash/contenido de cada archivo que se vaya a tocar, localizar
  todas las lecturas/escrituras de `equipment`, `canonical_ids.maquina_ids` y
  `operation_machine_assignments`, reproducir `R12_BU_EVACUACION` y la aceptación de
  `ffff`; no limpiar, resetear ni atribuir cambios preexistentes.
- Output: baseline/diff ownership y matriz de superficies afectadas, sin cambios
  funcionales. Status: `done`.
- Evidence AMD-21-001/NC-005: implementación atribuida a los archivos BPM/UI
  listados en T13-T17; backup y reconciliación registrados en T18.

### T13. Comando canónico de dominio/aplicación para reemplazar miembros
- Goal: exponer un único comando para reemplazar o retirar el conjunto de máquinas
  de una operación usando IDs canónicos.
- Inputs: `uc_bib_solv/modules/bpm` y sus casos de uso/contratos existentes, reglas
  FR-21-02/02A y compatibilidad de operación/proceso/contrato.
- Actions: definir o extender el comando existente `replace/remove operation
  machines`, aceptar solo `maquina.id`, validar catálogo y compatibilidad antes de
  mutar, y devolver errores funcionales estables; no crear bounded context, tabla,
  fallback JSON ni duplicar reglas en UI.
- Output: contrato de aplicación reutilizable por API, SPA, RCA/contexto y agentes,
  con tests unitarios de dominio. Status: `done`.
- Evidence: comando `OperationMachineAssociationCommand` y caso de uso
  `replace_operation_machines`; 20 tests Python y 13 subtests ejecutados.

### T14. Repositorio PostgreSQL y transacción atómica
- Goal: hacer que `machine_operation_configuration JOIN maquina` sea la única
  persistencia de pertenencia.
- Inputs: repositorios/adaptadores PostgreSQL bajo `uc_bib_solv/modules/bpm`,
  `db_management/schema.sql` y migraciones vigentes.
- Actions: validar todas las máquinas y compatibilidad en la misma transacción antes
  de borrar/insertar; usar constraints/consulta canónica existente, hacer rollback
  completo ante cualquier ID inválido y no añadir tabla; consultar PG directo tras
  escribir, sin cache Dataiku/JSON.
- Output: implementación de persistencia y pruebas de rollback, replace/remove y
  reload. Status: `done`.
- Evidence: reemplazo transaccional conserva retenidas; ejecución local dejó solo
  EV01/id13 y la segunda ejecución produjo UPDATE/DELETE `ROWCOUNT 0`.

### T15. Contrato HTTP/API de IDs canónicos
- Goal: transportar exclusivamente IDs de máquina y rechazar contratos legacy.
- Inputs: rutas/adaptadores HTTP existentes de `modules/bpm`, T13-T14 y clientes
  `uc_bib_solv/webapp/js/api`.
- Actions: aceptar listas de IDs canónicos, responder 4xx con código estable para
  `ffff`, IDs inexistentes/incompatibles o claves `equipment`,
  `canonical_ids.maquina_ids` y `operation_machine_assignments`; garantizar que un
  rechazo no escriba filas ni conserve la copia legacy.
- Output: contrato documentado y pruebas API de rechazo, reemplazo, retirada y
  persistencia. Status: `done`.
- Evidence: GET/PUT `/api/bpm/operations/<operation_id>/machines`, validación 4xx
  estable y pruebas de ruta/puerto; Node: 13 tests.

### T16. Selector SPA y eliminación del editor duplicado
- Goal: seleccionar máquinas desde el catálogo canónico y retirar `equipment` como
  almacenamiento de membresía.
- Inputs: vistas/componentes existentes `uc_bib_solv/webapp/js/views/{maquinas,bpm}`,
  API T15 y patrón de formularios actual.
- Actions: poblar selector con catálogo/IDs, enviar el comando T13, mostrar errores
  accionables y estado tras recarga; eliminar el editor genérico de
  `metadata.data.equipment` y cualquier escritura/lectura equivalente, preservando
  atributos descriptivos que no sean listas de miembros.
- Output: diff UI focalizado, accesible y sin representación duplicada. Status:
  `done`.
- Evidence: selector accesible por IDs canónicos, `equipment` retirado del editor
  genérico y limpieza de metadata histórica antes de enviar.

### T17. Unificación de todas las lecturas y proyecciones
- Goal: garantizar que tabla, panel derecho, detalle, API, contexto/RCA y agentes
  deriven exactamente del join canónico.
- Inputs: T13-T16, proyecciones BPM/RCA/contexto y consumidores/agentes existentes.
- Actions: sustituir consultas de JSON/caché por una proyección compartida o consultas
  al repositorio canónico, comprobar que no exista fallback cuando el join está vacío,
  y verificar que `R12_BU_EVACUACION` muestre solo EV01 tras retirar EV02.
- Output: matriz de consumidores auditada y pruebas de lectura directa/recarga. Status:
  `done`.
- Evidence: lecturas de operación/máquina derivan de `machine_operation_configuration
  JOIN maquina`; no quedan claves JSON prohibidas tras reconciliación.

### T18. Reconciliación idempotente de históricos
- Goal: eliminar de forma controlada las claves históricas sin permitir que JSON
  sobrescriba filas canónicas.
- Inputs: datos históricos, T14/T17, `requerimiento_12/spec_02.md` y evidencia de
  `R12_BU_EVACUACION`.
- Actions: crear/usar el mecanismo de reconciliación existente, con modo dry-run,
  auditoría y ejecución idempotente; retirar `metadata.data.equipment`,
  `canonical_ids.maquina_ids` y `operation_machine_assignments` como membresía,
  detectar divergencias y confirmar que tras eliminar EV02 permanece únicamente la
  fila EV01 en la relación canónica.
- Output: reporte de divergencias cero en segunda ejecución y evidencia de no
  duplicación, sin nueva tabla/bounded context. Status: `done`.
- Evidence: migración `20260913_req21_canonical_operation_machines.sql` ejecutada
  en local; backup `artifacts/req21-reconciliation-backup-20260913_163641.json`;
  21 filas metadata procesadas, cero claves prohibidas y MOC final únicamente EV01.

### T19. Tests backend/API y E2E reales de AMD-21-001
- Goal: cubrir las invariantes nuevas y reemplazar el falso positivo de
  `tests/e2e/requerimiento-21-ui.spec.js`.
- Inputs: T13-T18, `tests/unit`, `tests/integration`, `tests/e2e`, skills
  `ui-test-structure` y `playwright-dash-webapp`.
- Actions: añadir tests focalizados para IDs inválidos, rollback atómico,
  replace/remove/reload, limpieza idempotente y cero fallbacks/duplicados; añadir o
  corregir Playwright contra backend real (no mocks) para AC-21-02 y AC-21-13..17,
  registrando `acResults` antes de cada expect, evidencia y limpieza `TEST_`.
- Output: tests y run con `ac-results.json`, screenshots, logs y resultados de cada
  AC; un entorno bloqueado se reporta como bloqueo, nunca como PASS. Status: `done`.
- Evidence: Python 20 tests y 13 subtests; Node 13 tests; Playwright run
  `2026-09-13_16-45-10-req21-nc5` 1/1, AC-21-02/13..17 6/6, sin nuevos
  candidatos NC.

### T20. Verificación, revisión y entrega a Gate 3
- Goal: preparar la implementación conforme sin hacer commit/push.
- Inputs: T12-T19, diffs atribuidos, NC-001..NC-004-PERSIST y reportes UI.
- Actions: ejecutar regresión focalizada y revisión de higiene/diff; resolver NC solo
  mediante `nc-resolution-agent` y respetar el límite de intentos; revisar AC/NFR,
  accesibilidad, rollback, cero duplicados y lecturas canónicas.
- Output: matriz de evidencia y estado `implementado_pendiente_validacion`, sin
  commit/push; Gate 3 queda pendiente de decisión humana. Status: `done`.
- Evidence: regresión focalizada, compilación/sintaxis y diff check correctos;
  T12-T20 quedan entregadas como `implementado_pendiente_validacion`. NC-005
  queda resuelta por aprobación humana explícita («sí») en Gate 3 el 2026-09-13;
  NC-001..NC-004-PERSIST siguen abiertas/en corrección y el Gate 3 global
  permanece pendiente.

---

### T21. Baseline del editor AMD-21-002 y atribución
- Goal: reproducir la lista masiva actual y aislar los archivos que cambiarán.
- Inputs: T12/T16/T19, `operacion_form.js`, `operaciones_detalle.js`, API y worktree.
- Actions: registrar status/diffs/snapshots de archivos afectados; inspeccionar DOM,
  labels, flujo de carga y guardado; documentar el comportamiento actual con catálogo
  grande, sin modificar código ni atribuir cambios ajenos.
- Output: `diagnostic-req21-amd21-002.md` o evidencia equivalente en el run, con
  baseline de selectores, responsabilidades y ownership. Status: `completed`.

### T22. Estado transitorio y componente de dropdown buscable
- Goal: modelar el conjunto en edición por IDs canónicos, sin persistencia paralela.
- Inputs: T21, contrato `getOperationMachines` y catálogo `maquina`.
- Actions: extender el componente/formulario existente en `operacion_form.js` para
  un único dropdown nativo/buscable y estado local `Set` de IDs; cargar asociadas del
  join como estado inicial; excluir/deshabilitar seleccionadas; no guardar en
  `metadata.data.equipment`, `canonical_ids.maquina_ids` ni
  `operation_machine_assignments`, ni usar cache como fuente.
- Output: componente/estado UI con empty/loading/error accesibles y DOM no masivo.
  Status: `completed`.

### T23. Alta explícita, recuadro de asociadas y eliminación/re-agregado
- Goal: implementar el comportamiento acumulativo exigido por AC-21-18..21.
- Inputs: T22 y patrones visuales existentes de la SPA.
- Actions: añadir botón visible y accesible con texto exacto “Seleccionar máquina”;
  agregar sin sustitución ni duplicados; renderizar un recuadro separado limitado a
  seleccionadas; mostrar empty state explícito; proporcionar eliminación individual,
  re-agregado y actualización de opciones; mantener foco, nombres accesibles y
  mensajes de estado.
- Output: UI operable con tres máquinas y catálogo >100 sin lista permanente.
  Status: `completed`.

### T24. Integración con guardado y lectura canónica
- Goal: conectar el estado acumulado al comando existente sin cambiar el modelo.
- Inputs: T22-T23, `api/process-modeling.js`, `replace_operation_machines`, repositorio
  PostgreSQL y T13-T17.
- Actions: enviar solo la lista deduplicada de IDs al PUT existente; conservar
  validación/atomicidad; tras guardar consultar la respuesta y, tras recargar,
  hidratar desde `machine_operation_configuration JOIN maquina`; verificar que una
  baja no deja filas parciales ni lectura JSON/fallback. No DDL ni tablas nuevas.
- Output: integración UI/API y evidencia de conjunto visible = conjunto del join.
  Status: `completed`.

### T25. Tests unitarios, contrato y regresión focalizada
- Goal: probar invariantes de estado, contrato canónico y regresión previa.
- Inputs: T22-T24, tests existentes Node/Python y T19.
- Actions: cubrir acumulación/dedupe/exclusión/empty/re-agregado y serialización solo
  de IDs; cubrir contrato de persistencia/reload y ausencia de las tres listas
  prohibidas; repetir AC-21-02 y AC-21-13..17, sin marcar como cubiertos por mocks
  únicamente.
- Output: tests focalizados reproducibles y reporte separado de fallos baseline.
  Status: `completed`.

### T26. Playwright real AC-21-18..23 con fixture >100 y cleanup
- Goal: obtener evidencia UI real de todos los criterios de AMD-21-002.
- Inputs: T24-T25, `ui-test-structure`, `playwright-dash-webapp`, fixture/URL reales.
- Actions: delegar setup/generación/ejecución al flujo UI registrado; crear escenarios
  identificables AC-21-18..23 con `acResults` escrito antes del expect; usar dropdown,
  botón, búsqueda, tres máquinas, empty, delete/re-add, catálogo >100, save/reload;
  conservar screenshots/logs/respuestas; aislar datos `TEST_` y limpiar en `afterAll`.
  Repetir regresión Playwright AC-21-02/13..17 en el mismo ciclo o suite atribuible.
- Output: `.playwright-artifacts/test-results/<timestamp>-req21-amd21-002/` con
  `ac-results.json` 1:1, summary, capturas y logs. Status: `pending` (flujo UI formal).

### T27. Verificación directa de persistencia y representaciones duplicadas
- Goal: demostrar que la selección visible y la base canónica coinciden exactamente.
- Inputs: T24-T26, conexión PostgreSQL, payloads/red y T18/T19.
- Actions: consultar directamente `machine_operation_configuration JOIN maquina`
  antes/después de guardar, eliminar y recargar; comprobar conjunto único, ausencia
  de filas parciales y cero lecturas/escrituras/retención de `equipment`,
  `canonical_ids.maquina_ids` y `operation_machine_assignments`; ejecutar auditoría
  de divergencias/reconciliación idempotente si el fixture lo requiere.
- Output: reporte de persistencia y grep/auditoría sin representaciones duplicadas.
  Status: `pending` (requiere fixture/consulta directa).

### T28. Revisión AMD-21-002 y preparación de Gate 3
- Goal: integrar evidencias sin cerrar NC previas ni declarar conformidad global.
- Inputs: T21-T27, NC-001..NC-004-PERSIST y reportes de análisis UI.
- Actions: revisar diff contra snapshots, accesibilidad/loading/error, regresión
  AC-21-02/13..17, matriz AC-21-18..23/NFR-21-06 y cleanup; delegar cualquier NC a
  `nc-resolution-agent` y respetar máximo de intentos; dejar Gate 3 global pendiente.
- Output: paquete de validación AMD-21-002 con estado `implementado_pendiente_validacion`
  solo después de ejecución, sin commit/push. Status: `pending` (Gate 3).

## Acceptance Criteria Traceability

| AC | Covered by | Required evidence / condition |
| --- | --- | --- |
| AC-21-01 | T4, T8-T9 | Scenario `AC-21-01`, URL detalle creación, sin modal, formulario y captura |
| AC-21-02 | T13-T17, T19 | Rechazo de `ffff`/inexistente, asociación por ID canónico y persistencia desde join tras reload |
| AC-21-03 | T4, T8-T9 | Tabs accesibles, solo panel activo y screenshot de ambos estados |
| AC-21-04 | T5, T8-T9 | Respuesta inicial, filtro seleccionado y lista correcta sin reload manual |
| AC-21-05 | T5, T17, T8-T9 | Contratos, máquinas, descripción y acción BPM visibles/accionables, con máquinas derivadas del join |
| AC-21-06 | T5, T8-T9 | Descripción del proceso cambia con selección y estado vacío explícito |
| AC-21-07 | T3, T5, T8-T9 | Asociadas persistidas, selector disponible, save y verificación tras reload |
| AC-21-08 | T2, T6, T8-T9 | Panel exacto ausente y árbol/selección/zoom/acciones operativos |
| AC-21-09 | T2, T6, T8-T9 | Sin “Cadena científica”, modelos visuales ni símbolo; árbol/resultados presentes |
| AC-21-10 | T3, T6, T8-T9 | Abierto/nuevo guarda y persiste; cerrado rechaza con motivo |
| AC-21-11 | T13-T15, T19 | Tests unitarios/integración de existencia, rollback y solo lectura |
| AC-21-12 | T8-T10 | `ac-results.json` 1:1, capturas/logs/reportes; cualquier bloqueo impide conformidad |
| AC-21-13 | T15-T16, T19 | API 4xx estable para `ffff`/IDs inexistentes, cero filas y error accionable en UI |
| AC-21-14 | T14, T17-T19 | Retirada de EV02 deja solo EV01 en join y en todas las lecturas/proyecciones tras reload |
| AC-21-15 | T13-T15, T19 | Reemplazo inválido falla atómicamente y conserva exactamente el conjunto previo |
| AC-21-16 | T15-T17, T19 | Payloads y lecturas sin `equipment`, `canonical_ids.maquina_ids`, `operation_machine_assignments` ni fallback |
| AC-21-17 | T18-T19 | Reconciliación idempotente, divergencias cero y ausencia de duplicados en segunda ejecución |
| AC-21-18 | T21-T23, T26 | Dropdown de catálogo, botón “Seleccionar máquina”, nombre accesible y sin lista masiva |
| AC-21-19 | T22-T24, T26-T27 | Tres altas acumulativas, recuadro exacto, sin duplicados y opciones excluidas/deshabilitadas |
| AC-21-20 | T22-T23, T26 | Empty explícito, eliminación individual y re-agregado sin sustituir restantes |
| AC-21-21 | T21-T23, T26 | Fixture >100, búsqueda/filtrado, DOM no masivo y recuadro limitado |
| AC-21-22 | T24, T26-T27 | Guardar, recargar, conservar conjunto único y baja tras nueva recarga |
| AC-21-23 | T24-T27 | IDs canónicos únicamente, join coincide con UI y cero listas/fallbacks duplicados |

---

## Verification Plan

### Automatic / Command-Line Verification
- T1: baseline y snapshots comprobables; `git diff --check` sobre archivos de req-21.
- T7/T19: tests unitarios/integración/API focalizados de BPM/RCA; IDs inválidos,
  rollback, replace/remove/reload, reconciliación y luego regresión relevante.
- T21-T25: inspección del baseline, tests de estado local acumulativo/dedupe,
  contrato UI/API de IDs y regresión explícita AC-21-02/13..17.
- T26: Playwright real AC-21-18..23 con fixture >100, búsqueda, empty,
  eliminación/re-agregado y save/reload; cleanup `TEST_` obligatorio.
- T27: consulta PostgreSQL directa del join canónico y auditoría/grep de ausencia de
  `metadata.data.equipment`, `canonical_ids.maquina_ids` y
  `operation_machine_assignments` como pertenencia o fallback.
- T8-T9: Playwright real con URL/backend y fixtures; cada test escribe su resultado
  antes de la aserción final y conserva evidencia por AC.
- Validar estructura de artefactos, JSON parseable, `passed` booleano, 1:1 de IDs,
  ausencia de AC omitidos, logs de consola/red y reporte del analizador.
- No considerar mocks, contract tests ni un run parcial como evidencia UI suficiente.
- Para AC-21-13..17, comprobar mediante consulta PG directa que el JSON nunca
  sobreescribe la relación canónica y que no quedan representaciones duplicadas.
- Para AC-21-18..23, exigir `ac-results.json` 1:1, evidencia de accesibilidad y
  prueba de que el recuadro coincide exactamente con el join tras guardar/recargar.

### Manual Verification
- Gate 2: revisar tareas, orden, placement, riesgos y preservación del worktree.
- Inspeccionar capturas ODT y capturas finales lado a lado para confirmar el panel
  exacto retirado y que la eliminación es solo de presentación.
- Revisar foco, nombres accesibles, estados loading/error/empty y navegación.
- Gate 3: revisar diff focalizado contra snapshots T1, matriz AC/NFR, logs y NCs;
  solo el programador humano puede declarar conformidad.

---

## Non-Conformity Loop

### Policy
- No cambiar a `done` si una AC carece de escenario/evidencia, si UI real no pudo
  ejecutarse o si hay NC `open`/`in_correction`.
- Clasificar toda desviación como `spec`, `task_plan` o `implementation` y delegar
  su gestión a `nc-resolution-agent`.
- `spec` vuelve a Gate 1; `task_plan` vuelve a Gate 2; `implementation` corrige
  código y repite T7-T10/Gate 3. Tras dos intentos, escalar al humano.

### Open Non-Conformities
- NC-001 (`implementation`, `in_correction`): AC-21-01 falla en
  `#/maquinas_detalle?new=1` por lectura de `contract_id` sobre contexto indefinido;
  corrección delegada a `execute-agent`.
- NC-002 (`implementation`, `in_correction`): AC-21-03 no renderiza las tabs de
  máquina genérica/específica por el mismo fallo de inicialización de la vista;
  corrección agrupada y delegada a `execute-agent`.
- NC-003 (`implementation`, `in_correction`): sigue visible “Solo lectura” en
  nodos del árbol/análisis; requiere inventario y retirada quirúrgica de todas
  las fuentes visuales, preservando la protección de análisis cerrado.
- NC-004 (`implementation`, `in_correction`): el flujo OK/NO OK de hipótesis
  abiertas rechaza evidencia/criterio y no persiste; requiere corregir contrato,
  payload y prueba E2E completa, incluyendo reload y caso cerrado. El contrato
  de entrada ya responde 201 en ambos casos, pero NC-004-PERSIST mantiene el
  defecto de lectura posterior.
- NC-004-PERSIST (`implementation`, `in_correction`): GET posterior a los POST
  201 no devuelve los resultados recién guardados; máximo de dos intentos
  consumido y escalado humano obligatorio antes de cualquier intento 3.

---

## Risks
- Worktree muy sucio puede mezclar cambios previos con req-21; T1 snapshots y revisión
  por archivo son obligatorios.
- ODT/capturas pueden identificar un panel distinto al supuesto; T2 bloquea T6 si
  no hay referencia visual inequívoca.
- Fixtures, autenticación, backend o Chromium pueden impedir evidencia E2E; registrar
  bloqueo sin falsear conformidad.
- Contratos compartidos de árbol/resultados pueden romperse con una eliminación UI;
  T2/T6 y regresión Playwright lo deben detectar.
- Condiciones de carrera en filtros/alertas y persistencia pueden producir falsos
  positivos; esperar respuesta y recargar según la skill Playwright.
- Diferencias entre tests mock/contract y backend real; solo T9 satisface NFR UI.

---

## Verification Checklist
- [x] Gate 1 confirmado para `AMD-21-001` y `spec.md` permanece `spec_validada`.
- [x] Gate 2 aprobado explícitamente por el programador humano para `AMD-21-001`.
- [x] Gate 2 de `AMD-21-002` aprobado explícitamente («aprobar», 2026-09-13).
- [ ] T1 snapshots y baseline preservan cambios ajenos; diff req-21 focalizado.
- [ ] Referencia visual de ambos ODT inspeccionada antes de T6.
- [ ] Backend valida invariantes y atomicidad sin tabla nueva injustificada.
- [ ] AC-21-01..10 tienen escenarios Playwright reales identificables.
- [ ] AC-21-02 y AC-21-13..17 tienen escenarios Playwright/API reales, sin el falso
  positivo de `tests/e2e/requerimiento-21-ui.spec.js`.
- [ ] AC-21-11 tiene tests unitarios/integración backend.
- [ ] AC-21-18..23 tienen tareas, escenarios Playwright reales y evidencia completa.
- [ ] Regresión AC-21-02/13..17 repetida tras AMD-21-002.
- [ ] Run contiene `ac-results.json` 1:1, capturas, console/network, summary y logs.
- [ ] `analysis-report.md` fue producido por `ui-log-analysis-agent`.
- [ ] No se declara conformidad por mocks, run parcial o entorno bloqueado.
- [ ] Accesibilidad, persistencia tras reload y no regresión manual verificadas.
- [ ] NCs cerradas y Gate 3 aprobado antes de `done`.
- [ ] Higiene pre-commit revisada; no push sin autorización humana.

---

## Closure Rule

Cambiar el estado global a `done` solo cuando Gate 1, Gate 2 (incluida AMD-21-002) y Gate 3 estén
aprobados; T1-T20 estén completadas o justificadas; AC-21-01..17 y NFR-21-01..05
estén cubiertos con evidencia, T21-T28 estén completadas o justificadas y AC-21-18..23/NFR-21-06
estén cubiertos con evidencia; la ejecución UI real no tenga bloqueos; no existan
NC abiertas o `in_correction`; el diff esté atribuido y revisado; y
`traza_requerimiento.md` refleje el estado final real. Hasta entonces, el estado
de este plan y del requerimiento no puede adelantarse a `done`.

---

## Amendments

### AMD-21-001
- Fecha: `2026-09-13`
- Tipo: `B` (refinamiento de spec integrado en este plan)
- Descripción: la pertenencia operación–máquina usa exclusivamente
  `machine_operation_configuration JOIN maquina`; se eliminan/rechazan las tres
  representaciones JSON/lista duplicadas, con comando dedicado, IDs canónicos,
  validación, atomicidad y reconciliación de `R12_BU_EVACUACION`.
- Estado: `integrated`
- Fase de re-entrada: `validate-task-plan`
- Validación humana: `Gate 1 aprobado («sí»); Gate 2 aprobado («validar»), ambos
  el 2026-09-13; Gate 3 pendiente`
- Notas: T12-T20 son el paquete correctivo añadido; las tareas previas y NC history
  se conservan sin atribuirlas a esta enmienda. No se modifica `spec.md` en esta fase.

### AMD-21-002
- Fecha: `2026-09-13`
- Tipo: `B` (refinamiento de spec integrado en este plan)
- Descripción: selector desplegable buscable/filtrable desde catálogo canónico,
  botón “Seleccionar máquina”, selección acumulativa sin duplicados, recuadro separado
  de asociadas, eliminación/re-agregado, empty state, escalabilidad >100 y coherencia
  guardar/recargar; se mantiene exclusivamente el join canónico y se prohíben las
  representaciones paralelas.
- Estado: `integrated`
- Fase de re-entrada: `validate-task-plan`
- Validación humana: Gate 1 aprobado («sí», 2026-09-13); Gate 2 aprobado
  («aprobar», 2026-09-13); Gate 3 pendiente.
- Notas: T21-T28 son el paquete de implementación/verificación añadido; T12-T20,
  NC-005 resuelta y NC-001..NC-004-PERSIST abiertas se conservan. Esta actualización
  no implementa código, no modifica DDL ni cierra Gate 3.
