# Data Model Deploy Agent — Instrucciones para Copilot CLI

## Rol

Automatizar el ciclo de publicacion de modelos de datos en proyectos Dataiku DSS.
El desarrollador humano solo crea el dataset en la UI de Dataiku (define la conexion
y el schema de columnas). Este agente orquesta todo lo demas.

Este agente **coordina pero no genera DDL directamente**. El DDL lo genera el
escenario DSS `PUBLISH_DATA_MODELS` a partir de la definicion de los datasets.

---

## Cuando activar este agente

- El desarrollador ha creado o modificado uno o mas datasets en Dataiku DSS.
- Se quiere desplegar modelos de datos sin escribir DDL manualmente.
- Se detecta que una tabla no existe en la BD pero si el dataset en DSS.
- Se quiere sincronizar el estado de las tablas de BD con los schemas DSS.

---

## Flujo automatico

```
1. [Desarrollador] Crea dataset en Dataiku UI
      → define conexion (PostgreSQL / Oracle / Databricks)
      → define columnas y tipos en el schema del dataset

2. [Este agente] Verifica prerequisitos:
      → DSS_SITE_URL, DSS_API_KEY, DSS_PROJECT_KEY disponibles
      → Escenario PUBLISH_DATA_MODELS existe en el proyecto DSS
      → REPO_PATH y PROJECT_NAME configurados en variables del proyecto DSS

3. [Este agente] Triggerea escenario PUBLISH_DATA_MODELS via POST:
      POST {DSS_SITE_URL}/public/api/projects/{DSS_PROJECT_KEY}/scenarios/PUBLISH_DATA_MODELS/run
      Headers: Authorization: Basic {DSS_API_KEY}
      Body: {}

4. [DSS] Escenario PUBLISH_DATA_MODELS ejecuta:
      a. Lee todos los datasets SQL del proyecto (dss_dataset_reader.py)
      b. Para cada dataset: genera DDL segun convenciones de naming (ddl_generator.py)
      c. Ejecuta CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN
      d. Ejecuta create_update_data_models() para DDL custom (si tiene contenido)

5. [Este agente] Poll del estado hasta SUCCESS / FAILED / timeout (30 intentos x 10s)

6. [Este agente] Reporta resultado:
      → SUCCESS: tablas desplegadas, lista de datasets procesados
      → FAILED:  errores detallados, datasets con problemas
```

---

## Variables de entorno requeridas

Las variables se gestionan via la skill `project-variables-management`.
Acceder siempre a traves de `project_variables.py`, nunca por `os.environ` directo.

```python
from {main_module}.config.project_variables import vars as pv
run_url = pv.scenario_run_url("PUBLISH_DATA_MODELS")
headers = pv.auth_header()
```

| Variable | Descripcion | Fuente prod |
|----------|-------------|-------------|
| `DSS_SITE_URL` | URL base del servidor DSS | GitHub Secret |
| `DSS_API_KEY` | API key de autenticacion DSS | GitHub Secret |
| `DSS_PROJECT_KEY` | Clave del proyecto DSS | GitHub Secret |

Variables del proyecto DSS (configuradas en DSS, no en el runner):
| Variable DSS | Descripcion | Fuente prod |
|-------------|-------------|-------------|
| `PROJECT_NAME` | Nombre del proyecto para las convenciones de naming | Variable DSS |
| `REPO_PATH` | Ruta absoluta del repositorio en el servidor DSS | Variable DSS |
| `ORACLE_SCHEMA` | Schema Oracle para naming de tablas | Variable DSS |
| `DATABRICKS_CATALOG` | Catalogo Databricks | Variable DSS |
| `DATABRICKS_SCHEMA` | Schema Databricks | Variable DSS |

Ver catalogo completo: `common_spec_driven_development/variables/README.md`

---

## Convenciones de naming aplicadas automaticamente

| Motor | Formato | Ejemplo |
|-------|---------|---------|
| PostgreSQL | `PROYECTO_nombre_tabla` | `UC121_limites` |
| Oracle | `SCHEMA.PROYECTO_nombre_tabla` | `UC121_SCH.UC121_limites` |
| Databricks | `catalogo.schema.proyecto_nombre_tabla` (minusculas) | `main.uc121_sch.uc121_limites` |

El nombre logico de la tabla se toma del nombre del dataset en DSS.

---

## Recetas DSS requeridas en el proyecto

| Escenario DSS | Receta | Descripcion |
|---------------|--------|-------------|
| `GIT_DEPLOY` | `dss_scenario_git_deploy.py` | git pull + restart webapp |
| `PUBLISH_DATA_MODELS` | `dss_scenario_publish_data_models.py` | lee datasets + genera + ejecuta DDL |

Ver `common_spec_driven_development/ci_cd/README.md` para instrucciones de instalacion.

## Rutas de referencia en el proyecto UC121

| Modulo | Ruta |
|--------|------|
| DDL generator | `uc121_process_control/scenarios_Dataiku/scenarios_sdd/ddl_generator.py` |
| Dataset reader | `uc121_process_control/scenarios_Dataiku/scenarios_sdd/dss_dataset_reader.py` |
| DDL custom | `uc121_process_control/scenarios_Dataiku/scenarios_sdd/despliegue_modelos.py` |
| Receta GIT_DEPLOY | `uc121_process_control/scenarios_Dataiku/scenarios_sdd/dss_scenario_git_deploy.py` |
| Receta PUBLISH_DATA_MODELS | `uc121_process_control/scenarios_Dataiku/scenarios_sdd/dss_scenario_publish_data_models.py` |

---

## Flujo de DDL custom (override manual)

Para DDL que no puede derivarse del schema DSS (indices, constraints especiales,
tablas sin dataset asociado), usar la funcion manual:

```
1. Escribir DDL en uc121_process_control/scenarios_Dataiku/scenarios_sdd/despliegue_modelos.py → create_update_data_models()
2. git commit + push a main
3. CI/CD ejecuta PUBLISH_DATA_MODELS (que incluye la llamada a create_update_data_models())
4. Limpiar la funcion (dejar solo pass) y hacer push
```

El agente puede encargarse de los pasos 2-4 si se le indica.

---

## Tipos DSS soportados por motor

| Tipo DSS | PostgreSQL | Oracle | Databricks |
|----------|-----------|--------|------------|
| string | VARCHAR(n) / TEXT | VARCHAR2(n) | STRING / VARCHAR(n) |
| int | INTEGER | NUMBER(10) | INT |
| bigint | BIGINT | NUMBER(19) | BIGINT |
| double / float | NUMERIC(18,6) | NUMBER(18,6) | DOUBLE / FLOAT |
| boolean | BOOLEAN | CHAR(1) Y/N | BOOLEAN |
| date | DATE | DATE | DATE |
| timestamp | TIMESTAMP | TIMESTAMP | TIMESTAMP |
| array / object | TEXT | CLOB | STRING |

---

## Cuando NO usar este agente

- El dataset DSS no tiene columnas definidas (schema vacio).
- La conexion DSS no es de tipo SQL (ej. filesystem, S3, HDFS).
- Se necesita DDL complejo con triggers, stored procedures o vistas (usar DDL custom).
- El escenario `PUBLISH_DATA_MODELS` no esta configurado en el proyecto DSS.
