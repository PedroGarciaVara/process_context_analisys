# Contexto técnico — UC_BIB_Solve

## Cierre del requerimiento 15

El requerimiento 15 está cerrado (`done`) tras aprobación humana de Gate 3. T1–T9 están completadas; los módulos canónicos viven bajo `uc_bib_solv/modules/`, los validadores arquitectónicos se ejecutan desde CI y los shims legacy se mantienen únicamente donde existen consumidores activos, con criterios de retirada en los reportes T9. `db_management/schema.sql` no fue modificado.

La documentación y este contexto fueron actualizados en modo degradado autorizado porque las sesiones obligatorias de `documentation-agent` y `context-agent` no pudieron inicializarse por restricciones de filesystem del runtime. Los resultados no deben interpretarse como una nueva validación funcional: los checks dependientes de pytest, PostgreSQL, smoke o Playwright siguen pendientes de un entorno compatible.

## Decisión de frontend

Dash queda retirado de la arquitectura y del runtime activos. La aplicación actual es una SPA estática de HTML/CSS/JavaScript servida por Flask. Las dependencias Dash restantes en `requirements.txt` y las referencias textuales de “paridad con Dash” son residuos legacy pendientes de limpieza, no componentes ejecutados por el arranque actual.

### Contratos vigentes de Requerimiento 16

- `webapp/js/components/json-editor.js` es el editor JSON compartido para Máquina y metadatos PM. `JSON_FIELD_CONTRACT` distingue objeto, lista y objeto-o-lista; `fieldModel` conserva `field`, `kind`, `nullable`, `value`, `errors` y `dirty`; `serializeFields` entrega valores JavaScript nativos y errores estructurados. El modo avanzado queda explícito para JSON abierto y el backend vuelve a validar.
- Máquina reconstruye sus campos desde las respuestas persistidas del backend después de guardar, reabrir y volver a entrar. `nominal_capacity` es objeto; las listas y formas objeto-o-lista conservan su contrato. `machine_operation_configuration` y el contexto no forman parte del modal principal.
- `V02_MENU_ITEMS` en `webapp/js/views/shell_v02.js` es la matriz común de navegación superior y lateral e incluye `modelado-procesos` y `contexto`. `state.js` conserva `currentMachine` al cambiar de ruta; los setters de proceso/contrato/operación solo limpian selecciones cuando cambia el alcance.
- La validación normativa vive en `modules/operational_modeling/domain/`; las rutas HTTP adaptan errores con código/campo y `modules/operational_modeling/infrastructure/wiring.py` conecta los casos de uso con `OperationalPersistenceAdapter`. PostgreSQL/JSONB es la persistencia operativa; `contexto.js` presenta contexto estructurado como salida de solo lectura.
- `scripts/cleanup_e2e_fixtures.py` es el cleanup E2E acotado: exige prefijo `TEST_` u ownership demostrado, resuelve dependencias, borra en una transacción y verifica residuos. No usar `reset_db.py`, `TRUNCATE` ni borrados globales para fixtures.
- El boundary Playwright está en `tests/e2e/`, con `playwright.config.js`, Chromium, un worker y salidas bajo `.playwright-artifacts/test-results/<run-id>/`. R16 se cubre en `tests/e2e/requerimiento-16.spec.js`; la URL se aporta mediante `UI_TEST_BASE_URL` o `E2E_DASH_BACKEND_URL`. La suite está implementada, pero PostgreSQL, backend/URL E2E y un entorno Chromium compatible no estuvieron disponibles para declarar una ejecución pasada.

## Stack actual

- Python 3.10+
- Flask para el servidor HTTP y el backend interno
- HTML/CSS/JavaScript modular para el frontend
- Router por hash y estado frontend compartido
- PostgreSQL como persistencia
- `psycopg2` y `python-dotenv`
- Node.js/npm y Playwright para pruebas E2E

## Arranque y entrypoints

- Arranque local: `scripts/run_webapp_java_local.sh`.
- Servidor Flask: `uc_bib_solv/local_server.py`.
- Documento SPA: `uc_bib_solv/webapp/index.html`.
- Backend Flask: `uc_bib_solv/`.
- Smoke test: `tests/smoke_test.py`.
- Esquema: `db_management/schema.sql`.

El servidor registra blueprints para health, bootstrap, operaciones, causas, análisis y process modeling. Las rutas de navegación no se resuelven como páginas Dash: Flask devuelve la SPA y el router JavaScript decide la vista mediante el hash.

## Arquitectura

### Frontend

- `webapp/js/app.js`: bootstrap del cliente y composición de la aplicación.
- `webapp/js/core/router.js`: navegación por hash.
- `webapp/js/core/state.js`: estado compartido del catálogo y selección actual.
- `webapp/js/core/process-modeling-state.js`: estado específico del editor BPM.
- `webapp/js/api/`: clientes HTTP de operaciones, causas, análisis y process modeling.
- `webapp/js/views/`: vistas de inicio, catálogo, árbol, causa, análisis y process modeling.
- `webapp/js/components/`: shell, modales, árbol y componentes BPM.
- `webapp/css/`: estilos generales, formularios, tablas, layout, modal y process modeling.

### Backend

- `uc_bib_solv/routes/`: blueprints y adaptación HTTP.
- `uc_bib_solv/services/`: servicios de aplicación.
- `uc_bib_solv/repositories/`: consultas y persistencia usadas por los servicios.
- `uc_bib_solv/utils/`: utilidades HTTP y normalización.

### Dominio y persistencia compartidos

- `uc_bib_solv/app/domain/`: reglas del árbol causal y entidades/validadores de process modeling.
- `uc_bib_solv/app/persistence/`: repositorios PostgreSQL operativos, causales y de process modeling.
- `db_management/schema.sql`: modelo relacional, constraints, índices y tablas UUID del bounded context BPM.

## Funcionalidades

### Catálogo operativo

Procesos, contratos y máquinas con operaciones CRUD. Los contratos pueden asociarse a varias máquinas mediante `contrato_maquina`.

### Árbol causal

Árbol de causas y efectos por contrato, con creación, edición, borrado, detalle, navegación jerárquica y búsqueda/vinculación de nodos reutilizables. Las hipótesis se asocian a causas y tienen estados pendiente, validada o rechazada.

### Análisis causa-raíz

Sesiones asociadas a contrato/proceso/máquina, plantillas, participantes y resultados de causas o hipótesis. La evaluación contextual se separa del registro estructural reutilizable.

### Process modeling

Definiciones y versiones de procesos con estados de ciclo de vida. Las versiones contienen nodos de entrada, salida, operación, subproceso, decisión y stock, además de transiciones secuenciales o de rama. El backend valida referencias, jerarquía, ciclos, decisiones y propiedades de stock.

### Editor visual BPM

El cliente calcula medidas, layout y conectores sin persistir geometría. Soporta expansión inline de subprocesos, breadcrumbs, relayout, zoom, ajuste al flujo, lista accesible, scroll en ambos ejes y fullscreen/fallback reversible.

### Flujo operativo R16

1. Las vistas Máquina/PM proyectan datos JSON mediante el contrato común y mantienen edición guiada, dirty state y validación de interacción.
2. La API recibe JSON nativo; dominio/casos de uso validan forma, nulabilidad e identidad antes de delegar al wiring y a PostgreSQL.
3. La respuesta persistida vuelve a hidratar la UI; la selección de Máquina permanece al navegar dentro del alcance autorizado y Contexto se consulta sin edición.
4. Las pruebas E2E crean o identifican fixtures `TEST_`, registran artefactos y deben ejecutar cleanup allowlisted aun cuando una aserción falle.

## Modelo de datos

### Operativo y causal

- `proceso`
- `contrato`
- `maquinas_tipo`
- `maquina`
- `registro_maquina`
- `contrato_maquina`
- `node` y `relationship` como grafo canónico
- `causa` e `hipotesis`
- `hypothesis_required_data` y `hypothesis_expected_evidence`
- `analisis_causas`, `analisis_participante`, `analisis_resultado`, `analisis_causas_detalle`

### Process modeling

- `bpm_process`
- `pm_process_version`
- `pm_process_node`
- `pm_process_transition`

El modelo BPM se mantiene como bounded context independiente del modelo causal. Sigue pendiente definir el enlace formal entre una operación BPM, un contrato, una máquina, una causa, una hipótesis y una sesión de análisis.

## Configuración

`config/settings.py` carga `.env` y admite `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, junto con sus equivalentes `PG*`. El servidor Flask usa `WEBAPP_JAVA_HOST`, `WEBAPP_JAVA_PORT` y `WEBAPP_JAVA_DEBUG`.

## Reglas importantes

- La conexión PostgreSQL no debe estar hardcodeada.
- Las operaciones de process modeling draft se validan antes de publicar.
- Los nodos `subprocess` deben referenciar un proceso hijo.
- Los nodos `stock` deben tener capacidad, cantidad inicial válida y unidad.
- Las decisiones deben mantener ramas coherentes.
- Las transiciones no pueden ser autorreferentes.
- El layout se calcula en frontend y no debe convertirse en persistencia de negocio.
- Dash no debe volver a considerarse el frontend activo sin una decisión explícita de producto.
- Los contratos JSON compartidos no deben duplicarse por vista ni convertir campos no JSON en texto JSON por conveniencia.
- La evidencia E2E omitida o bloqueada por entorno no equivale a una prueba pasada; Gate 3 permanece pendiente de validación ambiental.

## Deuda y límites conocidos

- `requirements.txt` conserva dependencias Dash no utilizadas por el runtime actual.
- Algunas vistas contienen texto legacy de “paridad con Dash”.
- README/context históricos pueden haber descrito entrypoints inexistentes; este archivo y el README actualizado deben ser la referencia actual.
- La relación conceptual entre causalidad y process modeling aún no está cerrada.
- Los estados SDD y NCs del requerimiento 15 fueron reconciliados tras la aprobación humana de Gate 3; cualquier cambio futuro debe abrir un nuevo ciclo SDD.
- No está confirmado un sistema de migraciones PostgreSQL versionadas.
