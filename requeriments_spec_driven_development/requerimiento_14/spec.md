# Especificación técnica — Requerimiento 14

**Estado:** `descartado`

**Decisión:** No implementar este requerimiento. Su alcance se considera solapado y sustituido por el requerimiento 15, que define la arquitectura domain-first hexagonal vigente.

**Naturaleza:** propuesta/especificación técnica únicamente. Este documento no es una implementación ni autoriza todavía movimientos, renombrados o cambios de código.

## Overview

El objetivo es reorganizar la solución para separar con claridad la implementación del producto, la persistencia PostgreSQL, la gestión del esquema de base de datos, los scripts operativos, las pruebas y los artefactos SDD. La reorganización debe conservar el comportamiento funcional actual.

La implementación del producto quedará bajo `uc_bib_solv/`, con los límites siguientes:

```text
uc_bib_solv/
  domain/
  application/
  infrastructure/
    postgres/
  config/
  backend/
  webapp_java/          # solo frontend
```

Los artefactos SDD quedarán separados bajo un nuevo directorio raíz `sdd/`, que contendrá físicamente `requerimientos_cliente/`, `requeriments_spec_driven_development/` y `common_spec_driven_development/`. `tests/` permanecerá fuera de la implementación del producto. `scripts/` continuará siendo el lugar de los scripts generales de arranque y tests.

El estado actual documentado incluye una SPA HTML/CSS/JavaScript servida por Flask, PostgreSQL, lógica de dominio en `app/domain/`, persistencia en `app/persistence/`, esquema en `db/schema.sql`, backend en `uc_bib_solv/webapp_java/python-backend/` y frontend en `uc_bib_solv/webapp_java/webapp/`. La reorganización es estructural: no debe introducir cambio funcional.

## Functional Requirements

### FR-01 — Estructura objetivo y placement exacto

La implementación del producto debe estar contenida en `uc_bib_solv/` y respetar estas responsabilidades:

- `uc_bib_solv/domain/`: entidades, value objects, validadores, excepciones, interfaces abstractas y casos de uso de negocio organizados por capacidad funcional. No contiene UI, SQL, modelos ORM, conexiones, variables de entorno ni detalles de framework.
- `uc_bib_solv/application/`: orquestación de casos de uso, DTOs/adaptadores de aplicación y contratos necesarios para coordinar entradas y salidas. No debe convertirse en una segunda capa de persistencia ni contener presentación.
- `uc_bib_solv/infrastructure/postgres/`: conexión PostgreSQL, repositorios concretos, modelos técnicos de persistencia, mappers y adaptadores PostgreSQL. Implementa interfaces definidas por el dominio.
- `uc_bib_solv/config/`: carga y exposición de configuración de aplicación y entornos. Las credenciales y secretos se obtienen de variables de entorno o mecanismos locales equivalentes; no se hardcodean.
- `uc_bib_solv/backend/`: entrypoints HTTP Flask, blueprints/rutas, serialización HTTP y adaptadores de entrada. Invoca aplicación/dominio y no duplica reglas de negocio.
- `uc_bib_solv/webapp_java/`: exclusivamente frontend estático HTML/CSS/JavaScript, incluyendo vistas, componentes, estado, router y clientes HTTP. No debe contener backend Python, acceso a PostgreSQL, DDL ni reglas de negocio persistentes.

La separación anterior no implica crear microservicios ni modificar el comportamiento del producto.

### FR-02 — Migración conceptual de `app/persistence`

La responsabilidad de `app/persistence` se migrará conceptualmente a `uc_bib_solv/infrastructure/postgres/`.

El mapeo de transición es:

| Origen actual | Destino conceptual | Regla |
|---|---|---|
| `app/persistence/db.py` | `uc_bib_solv/infrastructure/postgres/` | conexión y configuración técnica de PostgreSQL |
| repositorios de `app/persistence/` | `uc_bib_solv/infrastructure/postgres/` | repositorios concretos y consultas |
| sincronización/grafo de persistencia | `uc_bib_solv/infrastructure/postgres/` | adaptadores técnicos, manteniendo contratos funcionales |
| entidades, validadores y casos de uso de `app/domain/` | `uc_bib_solv/domain/` | separación de reglas de negocio respecto de persistencia |

La implementación deberá actualizar todos los consumidores de `app/persistence` en la misma operación y eliminar inmediatamente `app/persistence` y sus rutas antiguas. No se permite dejar imports rotos, duplicar dos fuentes de verdad de persistencia, conservar rutas antiguas ni introducir módulos shim temporales para `app.domain` o `app.persistence`. No se podrán cambiar contratos funcionales sin una decisión explícita.

### FR-03 — Reubicación del backend

El backend Flask actualmente asociado a `webapp_java/python-backend/` deberá quedar representado por `uc_bib_solv/backend/`. Las rutas, servicios de aplicación, adaptadores HTTP y utilidades se reubicarán según responsabilidad, manteniendo endpoints, payloads, códigos de respuesta, health checks y comportamiento de arranque salvo que una validación humana apruebe otra cosa.

`webapp_java/` no podrá seguir siendo contenedor del backend una vez completada la reorganización objetivo. El frontend conservará sus clientes HTTP y actualizará únicamente las referencias necesarias para alcanzar los mismos endpoints.

### FR-04 — Responsabilidades de frontend, backend y dominio

- El frontend gestiona presentación, navegación por hash, estado de interacción, layout/medidas visuales y validación inmediata de interacción.
- El backend gestiona transporte HTTP, autenticación/configuración si ya existe, adaptación de entradas, serialización, errores HTTP y composición de dependencias.
- El dominio gestiona reglas funcionales reutilizables, invariantes, validaciones de negocio, entidades, value objects y casos de uso.
- La infraestructura gestiona conexiones externas, SQL, repositorios, mapeos y restricciones técnicas de almacenamiento.

Las reglas de negocio no podrán permanecer solamente en callbacks, vistas, rutas, scripts o repositorios. La UI no definirá tablas ni DDL. Los modelos de persistencia no se tratarán como entidades de dominio salvo que sean independientes de persistencia y framework.

### FR-05 — Dirección de dependencias e imports prohibidos

La dirección esperada es:

```text
webapp_java -> backend -> application -> domain
infrastructure/postgres -> domain (interfaces/contratos)
scripts -> application/backend/config según su función
tests -> componentes bajo prueba
```

`domain/` no podrá importar `webapp_java`, `backend`, `application` de presentación, `infrastructure`, Flask, SQL/driver PostgreSQL, variables de entorno, secretos, clientes HTTP ni librerías de UI. `webapp_java/` no podrá importar Python, PostgreSQL o DDL. `backend/` no podrá acceder directamente a tablas cuando exista un caso de uso o repositorio que deba mediar el acceso.

Todos los imports, referencias de paquetes, configuración de ejecución, scripts y tests afectados se actualizarán al nuevo placement en la misma operación, sin alterar la funcionalidad. No podrán quedar imports ni referencias a las rutas antiguas.

### FR-06 — `db/` pasa a `db_management/`

El directorio `db/` se renombrará conceptualmente a `db_management/` y será propietario de:

- DDL y definición del esquema.
- Despliegue/aplicación del esquema.
- Migraciones.
- Actualización de modelos de base de datos.
- Seeds y fixtures de base de datos.

Los modelos técnicos y mappers de runtime pertenecen a `infrastructure/postgres`; el DDL, las migraciones y los seeds pertenecen a `db_management`. Las entidades y reglas de dominio no se trasladan a `db_management`.

### FR-07 — Scripts, tests y SDD

- `scripts/` permanece fuera de `uc_bib_solv/` y conserva los scripts generales de arranque y tests.
- `tests/` permanece fuera de `uc_bib_solv/` y conserva las pruebas unitarias, integración, API, smoke y E2E.
- `sdd/` es un nuevo directorio raíz que separa los artefactos de proceso de los artefactos del producto y contiene físicamente `requerimientos_cliente/`, `requeriments_spec_driven_development/` y `common_spec_driven_development/`.

La ubicación exacta de otros artefactos auxiliares no descritos aquí no se decidirá por inferencia y queda sujeta a las preguntas de aclaración.

### FR-08 — Entrypoints y eliminación de rutas antiguas

El entrypoint de arranque y los comandos de tests deberán seguir siendo utilizables después de la reorganización y usar exclusivamente las ubicaciones nuevas. Se actualizarán referencias a módulos, rutas de archivos, imports, configuración y scripts en la misma operación, y se eliminarán inmediatamente las rutas antiguas. El servidor continuará sirviendo la SPA y exponiendo las APIs existentes; el frontend continuará consumiéndolas con el mismo contrato. Quedan prohibidos los aliases o módulos shim temporales para `app.domain` y `app.persistence`, así como cualquier otra compatibilidad temporal que mantenga esas rutas antiguas.

La compatibilidad se comprobará tanto desde el arranque documentado como desde los tests existentes. No se permitirá ni justificará ningún alias o módulo shim temporal para `app.domain` o `app.persistence`; los entrypoints y tests deberán referenciar exclusivamente las ubicaciones nuevas.

## Non-Functional Requirements

- **Compatibilidad funcional:** no cambiar funcionalidades, contratos HTTP, semántica de datos, validaciones de negocio ni comportamiento observable salvo decisión aprobada.
- **Arquitectura:** respetar Clean Architecture; dominio independiente de UI, framework y base de datos; persistencia separada de entidades de dominio.
- **Seguridad:** no introducir secretos en el código ni en los artefactos de reorganización. La configuración seguirá dependiendo de variables de entorno o configuración local no versionada.
- **Mantenibilidad:** cada archivo deberá tener un único dueño arquitectónico claro; no se mantendrán duplicados de módulos como solución permanente.
- **Trazabilidad:** los cambios de imports, entrypoints, configuración y scripts deberán poder relacionarse con el placement objetivo.
- **Operabilidad:** el arranque local, los comandos de preparación de BD y la ejecución de tests deberán ser reproducibles con la configuración existente.
- **Verificación:** los tests se ejecutarán después de la reorganización; los resultados no equivalen por sí solos a validación humana final.

## Constraints and Assumptions

### Constraints confirmadas

- El frontend activo es HTML/CSS/JavaScript servido por Flask; Dash no forma parte del frontend ejecutable actual.
- PostgreSQL es la persistencia actual.
- `scripts/` debe seguir siendo el lugar de scripts generales de arranque/tests.
- `tests/` debe quedar fuera de la implementación del producto.
- La estructura objetivo y los límites de `webapp_java`, `db_management` y `sdd` son obligatorios para este requerimiento.
- `sdd/` será un nuevo directorio raíz y contendrá físicamente `requerimientos_cliente/`, `requeriments_spec_driven_development/` y `common_spec_driven_development/`.
- No se permite cambio funcional.
- La conexión PostgreSQL no debe estar hardcodeada.
- Los artefactos SDD deben quedar separados del árbol de producto.
- Se conservarán `schema.sql` y los scripts existentes para DDL, despliegue, migraciones, actualización de modelos y seeds; no se introducirá ninguna herramienta nueva.

### Límites de esta especificación

No se introducirá ninguna herramienta nueva para gestionar el esquema o las migraciones. El inventario de consumidores y rutas antiguas deberá completarse antes de eliminar las ubicaciones actuales; no se autoriza una estrategia de aliases o módulos shim temporales para `app.domain` o `app.persistence`.

## Out of Scope

- Nuevas funcionalidades de negocio o cambios de UX.
- Rediseño de endpoints, payloads, tablas, reglas de validación o contratos de API.
- Reintroducción de Dash u otro framework frontend.
- Cambio de motor de base de datos o rediseño del modelo relacional.
- Implementación de nuevas migraciones de negocio no necesarias para el renombrado/reorganización.
- Creación de microservicios, despliegue cloud o cambios de infraestructura operativa no exigidos por el placement.
- Limpieza general de dependencias legacy no relacionada con imports o arranque, salvo que impida la compatibilidad objetivo.
- Modificación de los tests para ocultar regresiones.
- Cambios en archivos SDD distintos del `spec.md` de este requerimiento durante esta fase.

## Riesgos y mitigaciones

| Riesgo | Mitigación exigida |
|---|---|
| Consumidores no inventariados o rutas antiguas residuales apuntan a `app.*` o al backend dentro de `webapp_java` | Completar y revisar el inventario de consumidores, ejecutar checks de imports, referencias, configuración, scripts y tests antes de eliminar las rutas antiguas, y repetirlos después de la eliminación. |
| Se mezclan modelos persistentes con entidades de dominio | Mantener mappers/modelos técnicos en `infrastructure/postgres` y reglas/invariantes en `domain`. |
| El entrypoint deja de arrancar por cambios de rutas | Verificar el script de arranque, importarlo/ejecutarlo en entorno local y realizar smoke test. |
| DDL, seeds y migraciones quedan repartidos | Hacer `db_management/` propietario único de esos artefactos y comprobar que los scripts los referencian allí. |
| Se alteran contratos HTTP accidentalmente | Comparar rutas, payloads, códigos y respuestas antes/después mediante tests existentes. |
| La eliminación inmediata rompe un consumidor no detectado | Bloquear la eliminación hasta completar la verificación previa de consumidores y rutas, actualizar todos los afectados en la misma operación y comprobar que no quedan imports, aliases, shims ni referencias a las ubicaciones antiguas. |
| La reorganización puede alterar la gestión existente del esquema o sus scripts | Conservar `schema.sql` y los scripts existentes para DDL, despliegue, migraciones, actualización de modelos y seeds, sin introducir ninguna herramienta nueva. |

## Acceptance Criteria

- **AC-01:** Existe un árbol de producto bajo `uc_bib_solv/` con `domain/`, `application/`, `infrastructure/postgres/`, `config/`, `backend/` y `webapp_java/`; `webapp_java/` contiene solo frontend.
- **AC-02:** Cada responsabilidad de `app/persistence` tiene un destino trazable en `infrastructure/postgres`, sin acceso de dominio a PostgreSQL ni duplicación permanente.
- **AC-03:** `db_management/` es el único propietario de DDL, despliegue, migraciones, actualización de modelos y seeds; ninguna de esas responsabilidades queda en frontend o dominio.
- **AC-04:** `scripts/` conserva los scripts generales de arranque/tests y `tests/` permanece fuera de `uc_bib_solv/`.
- **AC-05:** `sdd/` contiene separadamente `requerimientos_cliente/` y `requeriments_spec_driven_development/`, sin mezclarlos con la implementación del producto.
- **AC-06:** El análisis de imports confirma que se respetan las dependencias permitidas y que no existen imports prohibidos de dominio hacia UI/framework/DB/infraestructura.
- **AC-07:** El entrypoint documentado arranca el servidor Flask, sirve la SPA y registra las APIs existentes sin cambio funcional.
- **AC-08:** Los comandos de preparación/comprobación de BD y los scripts de tests apuntan a sus nuevas ubicaciones y siguen siendo ejecutables.
- **AC-09:** La configuración continúa sin secretos hardcodeados y el acceso PostgreSQL usa la configuración existente o su equivalente compatible.
- **AC-10:** Se ejecutan, después de la reorganización, smoke, unitarios, integración, API y E2E disponibles según sus precondiciones; se conserva evidencia de resultados y cualquier fallo se clasifica antes de cerrar.
- **AC-11:** La validación humana confirma que no hubo cambio funcional y aprueba explícitamente la implementación; la ejecución automática no marca el requerimiento como `done`.

## Secuencia de verificación posterior

1. Revisar el árbol y el inventario origen-destino sin ejecutar cambios funcionales.
2. Ejecutar comprobaciones de imports y compilación/carga de módulos.
3. Verificar configuración, entrypoints y scripts de base de datos en entorno local.
4. Arrancar la aplicación con el script existente o su referencia actualizada y ejecutar el smoke test.
5. Ejecutar tests unitarios.
6. Ejecutar tests de integración y API con PostgreSQL disponible y la configuración requerida.
7. Ejecutar tests E2E/UI con la aplicación levantada.
8. Comparar contratos HTTP y resultados funcionales con la línea base disponible.
9. Registrar fallos como no conformidades, si los hubiera; no tratarlos como una justificación para cambiar el alcance.

## Questions for Clarification

1. **No bloqueante si se aprueba una decisión:** ¿los servicios actuales de `python-backend/services/` deben mapearse a `application/` y las rutas a `backend/` manteniendo sus nombres, o se requiere otra partición explícita?
2. **No bloqueante si se aprueba una decisión:** ¿`config/` debe quedar exclusivamente dentro de `uc_bib_solv/`, o debe conservarse un punto de compatibilidad para el `config/` actual de la raíz?

La pregunta bloqueante sobre la gestión de migraciones queda resuelta: se mantendrán `schema.sql` y los scripts existentes para DDL, despliegue, migraciones, actualización de modelos y seeds, sin introducir ninguna herramienta nueva.

La pregunta sobre módulos shim temporales para `app.domain`/`app.persistence` queda resuelta: se actualizarán todos los consumidores en la misma operación, se eliminarán inmediatamente las rutas antiguas y no se permitirán aliases ni módulos shim temporales.

## Decision Log

| ID | Fecha | Decisión | Responsable | Estado |
|---|---|---|---|---|
| D-14-01 | 2026-08-11 | El estado del artefacto es `spec_pendiente_validacion`; es una propuesta, no una implementación. | Requerimiento del cliente | Confirmada |
| D-14-02 | 2026-08-11 | La implementación del producto se separa de los artefactos SDD; el producto queda bajo `uc_bib_solv/`. | Requerimiento del cliente + skills cargadas | Pendiente de validación humana |
| D-14-03 | 2026-08-11 | `app/persistence` tiene como destino conceptual `uc_bib_solv/infrastructure/postgres/`. | Requerimiento del cliente | Pendiente de validación humana |
| D-14-04 | 2026-08-11 | `db/` pasa a ser `db_management/` con responsabilidad de DDL, despliegue, migraciones, actualización de modelos y seeds. | Requerimiento del cliente | Pendiente de validación humana |
| D-14-05 | 2026-08-11 | Decisión histórica superseded/sustituida por D-14-08: la cuestión de migraciones ya está resuelta por la decisión humana de mantener `schema.sql` y los scripts existentes sin introducir una herramienta nueva. La estrategia de compatibilidad temporal de imports queda resuelta por D-14-07. | Requisitos-agent / contexto disponible | Superseded por D-14-08 |
| D-14-06 | 2026-08-11 | `sdd/` será un nuevo directorio raíz que contendrá físicamente `requerimientos_cliente/`, `requeriments_spec_driven_development/` y `common_spec_driven_development/`; no se conservarán en la raíz actual como ubicación física objetivo. | Decisión humana | Confirmada |
| D-14-07 | 2026-08-11 | Todos los consumidores se actualizarán en la misma operación, las rutas antiguas se eliminarán inmediatamente y quedan prohibidos los aliases o módulos shim temporales para `app.domain` y `app.persistence`. | Decisión humana | Confirmada |
| D-14-08 | 2026-08-12 | Se mantendrán `schema.sql` y los scripts existentes para DDL, despliegue, migraciones, actualización de modelos y seeds; no se introducirá ninguna herramienta nueva. La pregunta bloqueante sobre migraciones queda resuelta. | Decisión humana | Confirmada |

## Gates humanos

El requerimiento queda descartado antes de Gate 1. No se elaborará `task_plan.md`, no se ejecutará implementación y no se realizarán movimientos, renombrados ni eliminaciones de código basados en este documento.

1. **Gate 1 — Validación de especificación:** el programador humano revisa este `spec.md`, responde las preguntas bloqueantes o autoriza explícitamente las decisiones conservadoras y cambia el estado a `spec_validada` solo cuando el alcance, placement y compatibilidad sean aceptados.
2. **Gate 2 — Aprobación del task plan:** después de Gate 1, el `task_plan.md` debe ser elaborado según esta especificación y aprobado explícitamente antes de mover, renombrar o modificar implementación.
3. **Gate 3 — Validación final de implementación:** después de ejecutar la reorganización y la secuencia de tests, el programador humano compara la implementación con este documento, revisa evidencias y confirma conformidad. Solo entonces podría pasar a `done`; hasta ese momento el estado permanece `implementado_pendiente_validacion` o el estado de corrección que corresponda.

La aprobación de los tests por sí sola no sustituye ninguno de los tres gates.
