# UC_BIB_Solve — aplicación web de análisis causal y modelado de procesos

Aplicación local con frontend estático **HTML/CSS/JavaScript**, backend **Flask** y persistencia **PostgreSQL**. Permite gestionar el contexto operativo, construir árboles causales, registrar hipótesis y análisis causa-raíz, y modelar procesos industriales.

Dash queda retirado de la arquitectura y del arranque actuales. Las dependencias Dash que aún aparecen en `requirements.txt` y algunos textos de “paridad con Dash” son residuos legacy pendientes de limpieza; no forman parte del frontend ejecutable.

## Requisitos

- Python 3.10+
- PostgreSQL local
- Node.js/npm para Playwright y los tests E2E
- Chromium gestionado por Playwright para las pruebas de UI

## Instalación

```bash
cd "/home/pedro/proyectos visual studio code/UC_BIB_Solve"
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
npm install
```

## Configuración

La configuración se carga desde variables de entorno y `.env.local` mediante `config/settings.py`. Las variables de base de datos son obligatorias; consulta [`.env.example`](.env.example) para los nombres esperados, sin valores reales.

| Variable | Requisito / ejemplo | Uso |
| --- | --- | --- |
| `DB_HOST` / `PGHOST` | Obligatoria; sin valor por defecto | Host o socket de PostgreSQL |
| `DB_NAME` / `PGDATABASE` | Obligatoria; sin valor por defecto | Base de datos |
| `DB_USER` / `PGUSER` | Obligatoria; sin valor por defecto | Usuario |
| `DB_PASSWORD` / `PGPASSWORD` | Obligatoria; sin valor por defecto | Contraseña |
| `DB_PORT` / `PGPORT` | Obligatoria; sin valor por defecto | Puerto |
| `WEBAPP_JAVA_HOST` | `127.0.0.1` | Host del servidor Flask |
| `WEBAPP_JAVA_PORT` | `8050` | Puerto del servidor Flask |
| `WEBAPP_JAVA_DEBUG` | `1` en el script | Modo debug del servidor local |
| `APP_PORT` / `APP_DEBUG` | `8050` / `true` | Compatibilidad con configuración histórica |

## Base de datos

Crear la base si es necesario y desplegar el esquema canónico:

```bash
createdb -h /var/run/postgresql -U pedro solve_ishikawa
python3 db_management/init_db.py
```

`db_management/schema.sql` es el único DDL vigente y `db_management/init_db.py`
es el único script soportado para desplegarlo. Consulta
[`db_management/documentacion.md`](db_management/documentacion.md) para
prerrequisitos, transacciones, verificación, backup y seguridad. No se deben
usar rutas alternativas para aplicar el esquema.

El esquema incluye el modelo operativo/causal (`proceso`, `contrato`, `maquina`, `causa`, `hipotesis`, análisis y grafo canónico) y el bounded context de modelado de procesos (`bpm_process`, `pm_process_node`, `pm_process_transition`). Cada proceso posee un único grafo mutable; no se persiste histórico de versiones.

## Arranque

El punto de entrada actual es el servidor Flask que sirve la SPA JavaScript:

```bash
. .venv/bin/activate
./scripts/run_webapp_java_local.sh
```

La aplicación queda disponible en `http://127.0.0.1:8050`.

El script ejecuta `uc_bib_solv/local_server.py`, que:

1. crea la aplicación Flask;
2. registra los blueprints HTTP;
3. sirve `webapp/index.html`;
4. sirve los assets estáticos HTML/CSS/JavaScript;
5. devuelve la SPA para las rutas de navegación del frontend;
6. expone las APIs bajo `/api/...`.

## Funcionalidades principales

- Catálogo operativo de procesos, contratos y máquinas.
- Asociación N:N entre contratos y máquinas.
- Árbol causal por contrato con causas, efectos e hipótesis.
- Búsqueda y vinculación de nodos causales reutilizables.
- Sesiones de análisis causa-raíz y resultados trazables.
- Procesos industriales y sus grafos operativos.
- Nodos BPM de entrada, salida, operación, subproceso, decisión y stock.
- Transiciones secuenciales y ramas con etiquetas/condiciones.
- Validación de grafos y jerarquías.
- Expansión inline de subprocesos, breadcrumbs y relayout.
- Scroll interno/global, fullscreen nativo o fallback reversible.
- Bootstrap y health checks.

## Arquitectura principal

```text
HTML/CSS/JavaScript (webapp)
        ↓ clientes API y router por hash
Flask (uc_bib_solv/routes)
        ↓
Servicios de aplicación
        ↓
Repositorios webapp + app/persistence
        ↓
PostgreSQL
```

Rutas relevantes:

- `uc_bib_solv/webapp/`: SPA, vistas, componentes, estado, CSS y clientes API.
- `uc_bib_solv/routes/`: endpoints Flask.
- `uc_bib_solv/services/`: casos de uso y payloads.
- `uc_bib_solv/repositories/`: persistencia usada por el backend Flask.
- `app/domain/`: reglas de dominio y validadores, especialmente process modeling.
- `app/persistence/`: repositorios PostgreSQL compartidos y legado.
- `db_management/schema.sql`: DDL PostgreSQL.
- `tests/`: pruebas unitarias, integración, API, smoke y E2E.

## Tests

Smoke test:

```bash
python3 tests/smoke_test.py
```

Tests Python:

```bash
python3 -m unittest discover -s tests/unit -p 'test_*.py'
python3 -m unittest discover -s tests/integration -p 'test_*.py'
```

Tests E2E de process modeling:

```bash
UI_TEST_BASE_URL=http://127.0.0.1:8051 \
bash scripts/run_ui_tests.sh tests/e2e/process-modeling.spec.js
```

Los artefactos se guardan en `.playwright-artifacts/test-results/<timestamp>/`.

## Estado y deuda conocida

- La documentación histórica que describía una app Dash debe considerarse obsoleta.
- Dash no se arranca ni se sirve; quedan dependencias y referencias legacy que deben eliminarse o justificarse.
- El modelo causal y el modelo de process modeling todavía tienen integración conceptual pendiente.
- El mecanismo de migraciones versionadas de base de datos no está confirmado.
- El estado SDD y las no conformidades de `requerimiento_10` requieren validación humana final.
- No se debe interpretar el paso de tests técnicos como cierre automático de un requerimiento.
