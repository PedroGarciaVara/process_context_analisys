# Contexto técnico — UC_BIB_Solve

## Decisión de frontend

Dash queda retirado de la arquitectura y del runtime activos. La aplicación actual es una SPA estática de HTML/CSS/JavaScript servida por Flask. Las dependencias Dash restantes en `requirements.txt` y las referencias textuales de “paridad con Dash” son residuos legacy pendientes de limpieza, no componentes ejecutados por el arranque actual.

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
- Servidor Flask: `uc_bib_solv/webapp_java/local_server.py`.
- Documento SPA: `uc_bib_solv/webapp_java/webapp/index.html`.
- Backend Flask: `uc_bib_solv/webapp_java/python-backend/`.
- Smoke test: `tests/smoke_test.py`.
- Esquema: `db/schema.sql`.

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

- `python-backend/routes/`: blueprints y adaptación HTTP.
- `python-backend/services/`: servicios de aplicación.
- `python-backend/repositories/`: consultas y persistencia usadas por los servicios.
- `python-backend/utils/`: utilidades HTTP y normalización.

### Dominio y persistencia compartidos

- `app/domain/`: reglas del árbol causal y entidades/validadores de process modeling.
- `app/persistence/`: repositorios PostgreSQL operativos, causales y de process modeling.
- `db/schema.sql`: modelo relacional, constraints, índices y tablas UUID del bounded context BPM.

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

- `pm_process_definition`
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

## Deuda y límites conocidos

- `requirements.txt` conserva dependencias Dash no utilizadas por el runtime actual.
- Algunas vistas contienen texto legacy de “paridad con Dash”.
- README/context históricos pueden haber descrito entrypoints inexistentes; este archivo y el README actualizado deben ser la referencia actual.
- La relación conceptual entre causalidad y process modeling aún no está cerrada.
- Los estados SDD y NCs requieren reconciliación y validación humana Gate 3.
- No está confirmado un sistema de migraciones PostgreSQL versionadas.
