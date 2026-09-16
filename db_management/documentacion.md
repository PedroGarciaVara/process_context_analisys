# Despliegue del modelo PostgreSQL

## Objetivo

Documentar el despliegue reproducible del modelo persistente de UC_BIB_Solve.
El contrato vigente tiene dos artefactos: [`schema.sql`](schema.sql), único DDL
canónico, y [`init_db.py`](init_db.py), único script de inicialización y
despliegue. Este documento es operativo: no contiene credenciales ni ejecuta
ninguna conexión.

## Audiencia y alcance

- Mantenedores y operadores responsables de preparar PostgreSQL.
- Incluye prerrequisitos, configuración, ejecución, verificación, seguridad y
  recuperación.
- No incluye datos de prueba, fixtures, migraciones incrementales ni un
  mecanismo de reset destructivo.

## Estado actual

| Ruta | Responsabilidad | Cuándo modificar |
| --- | --- | --- |
| `schema.sql` | DDL acumulado del modelo: tablas, columnas compatibles, relaciones, checks, índices, funciones y triggers | Sólo al cambiar el modelo y revisar el impacto de compatibilidad |
| `init_db.py` | Lee `schema.sql`, obtiene una conexión y lo ejecuta en una única transacción | Sólo al cambiar el contrato de arranque |
| `../config/settings.py` | Carga variables de entorno desde `.env.local` y construye `DB_CONFIG` | Sólo al cambiar el contrato de configuración |
| `../uc_bib_solv/modules/platform/infrastructure/postgres.py` | Adaptador real `psycopg2` para `get_connection()` y `db_cursor()` | Sólo al cambiar la conexión PostgreSQL |

El runtime usa los repositorios PostgreSQL de BPM y RCA; no debe definir tablas
ni DDL desde la UI o desde esos repositorios.

## Prerrequisitos

1. PostgreSQL accesible desde el entorno donde se ejecutará el script.
2. Python del proyecto con las dependencias instaladas, en particular
   `psycopg2-binary` y `python-dotenv` (`requirements.txt`).
3. Un usuario PostgreSQL con permisos suficientes para crear o alterar el
   esquema objetivo, crear índices, funciones y triggers.
4. Una copia de seguridad verificada antes de aplicar cambios sobre una base
   con datos.

No se deben guardar contraseñas, URLs privadas ni valores reales en el
repositorio. El archivo versionable `.env.example` sólo sirve como plantilla;
los valores reales se proporcionan mediante `.env.local` ignorado por Git o
por el gestor de secretos del entorno.

## Configuración

`config/settings.py` carga `.env.local` y exige estas variables (también acepta
los alias `PG*`):

| Variable | Alias | Uso |
| --- | --- | --- |
| `DB_HOST` | `PGHOST` | Host PostgreSQL |
| `DB_NAME` | `PGDATABASE` | Base de datos objetivo |
| `DB_USER` | `PGUSER` | Usuario de conexión |
| `DB_PASSWORD` | `PGPASSWORD` | Secreto de conexión; nunca documentar su valor |
| `DB_PORT` | `PGPORT` | Puerto PostgreSQL |

La configuración de ejemplo se encuentra en [`.env.example`](../.env.example).
No se inventan valores por defecto para la base de datos.

## Despliegue

Desde la raíz del repositorio, con el entorno Python configurado:

```bash
python db_management/init_db.py
```

El script lee el DDL desde una ruta relativa a sí mismo, llama a
`get_connection()` y ejecuta todo `schema.sql` dentro del context manager de la
conexión. Si termina correctamente, PostgreSQL confirma la transacción; si una
sentencia falla, la transacción se revierte y la conexión se cierra. No se ha
ejecutado este comando como parte de la documentación.

### Idempotencia y límites

El DDL usa `CREATE ... IF NOT EXISTS`, `ALTER ... IF EXISTS` y
`ADD ... IF NOT EXISTS` en los puntos compatibles, además de comprobaciones
controladas para constraints y triggers. Por ello puede reutilizarse para una
instalación vacía o para alinear una instalación existente sin aplicar una
cadena separada de migraciones. Algunas sentencias de compatibilidad pueden
actualizar valores existentes (por ejemplo, completar un KPI pendiente), por lo
que toda ejecución contra datos reales requiere revisión y backup previo.

`schema.sql` es el único DDL vigente e `init_db.py` el único script de
despliegue. No existe una ruta soportada de migraciones incrementales ni un
`reset_db.py`; no se debe reconstruir ese flujo ni ejecutar `DROP` destructivos
como parte del arranque.

## Verificación posterior

La verificación debe ser de sólo lectura y realizarse con el mismo usuario o
con un usuario auditor. Como mínimo, comprobar que existen las tablas y que no
hay errores de conexión o permisos:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;

SELECT current_database(), current_user, version();
```

Para una revisión de cambios, comparar columnas, constraints, índices,
funciones y triggers de `information_schema`/`pg_catalog` con el contenido de
`schema.sql`. La comprobación confirma el estado instalado; no demuestra qué
archivo se ejecutó anteriormente.

## Seguridad, backup y recuperación

- Aplicar mínimo privilegio: separar, cuando sea posible, el usuario de
  despliegue del usuario de runtime.
- Transportar secretos mediante variables del entorno o un gestor de secretos;
  no imprimirlos en logs ni incluirlos en incidencias.
- Hacer backup lógico o físico verificado antes del despliegue y conservar la
  evidencia de su restaurabilidad.
- Ante un fallo, conservar el error y restaurar desde el backup siguiendo el
  procedimiento operativo aprobado; no intentar un rollback automático con
  `DROP`.
- Probar la restauración en un entorno aislado antes de cualquier recuperación
  de producción.

## Decisiones vigentes

| ID | Decisión | Racional | Alternativas rechazadas | Consecuencias | Archivos afectados | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-DB-001 | Mantener `schema.sql` como único DDL canónico | Evita divergencias entre una instalación nueva y una cadena de scripts | Migraciones incrementales independientes | Cada cambio de modelo debe consolidarse y revisarse en el DDL | `db_management/schema.sql` | Vigente |
| DEC-DB-002 | Usar `init_db.py` como único punto de despliegue | Centraliza conexión, lectura del DDL y transacción | Scripts paralelos o ejecución manual fragmentada | La configuración debe estar disponible antes de arrancar | `db_management/init_db.py` | Vigente |
| DEC-DB-003 | No ofrecer reset destructivo | Protege datos operativos y obliga a una recuperación respaldada | `reset_db.py`, `DROP` automático | La recuperación requiere backup y operación explícita | `db_management/` | Vigente |

## Relación con artefactos SDD

- Specs y planes históricos pueden mencionar el proceso que originó partes del
  modelo, pero no son instrucciones operativas actuales.
- Este documento describe el estado presente de `db_management`; el
  mantenimiento de `context.md` corresponde a `context-agent` si se solicita.
