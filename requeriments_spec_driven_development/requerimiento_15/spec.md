# Requerimiento 15 — Arquitectura Domain-oriented Modular Monolith para `uc_bib_solv`

Estado: `spec_validada`
Versión: 2.0
Autor: `requirements-agent`
Fecha de inspección: 2026-08-17

Validación humana: Gate 1 y Gate 3 aprobados el 2026-08-20; el requerimiento queda `done`.

## Overview

Este documento transforma la instrucción del cliente en una especificación técnica para revisar y refactorizar incrementalmente `uc_bib_solv` hacia un **Domain-oriented Modular Monolith** con Clean/Hexagonal Architecture, sin romper el comportamiento observable existente.

La unidad de modularización será el dominio funcional. Cada dominio implementado o migrado deberá seguir esta forma:

```text
uc_bib_solv/modules/<domain>/
  domain/
  application/ports/
  adapters/inbound/
  adapters/outbound/
  infrastructure/
```

La dirección de dependencias será hacia dentro:

```text
inbound -> application -> domain
infrastructure -> application/ports y domain
outbound -> application/ports y domain
domain -> biblioteca estándar de Python únicamente, salvo dependencias aprobadas y verificadas como puramente de dominio
```

El objetivo no es extraer microservicios ni cambiar contratos de negocio, HTTP, persistencia o frontend. Es hacer explícitos los límites, trasladar gradualmente cada responsabilidad a su módulo y dejar validadores deterministas que impidan regresiones arquitectónicas.

## Evidencia del estado actual

La inspección se realizó sobre el árbol y fuentes presentes en `uc_bib_solv`, sin incluir otros cambios del worktree en este requerimiento.

- `uc_bib_solv` contiene 117 archivos listados por `rg --files`, además de cachés `__pycache__` no considerados fuente.
- El arranque Flask está duplicado en `backend_app.py` y `local_server.py`; ambos registran blueprints de `routes`.
- Las entradas HTTP están en `routes/analysis.py`, `causas.py`, `operational.py`, `process_modeling.py`, `bootstrap.py` y `health.py`.
- `routes/analysis.py` importa directamente `uc_bib_solv.repositories.analysis_repository`; ese repositorio usa `app.persistence.db.db_cursor` y contiene SQL para `analisis_causas`, `analisis_participante` y `analisis_resultado`.
- `routes/operational.py` importa directamente `repositories.operational_repository`; ese módulo mezcla SQL, `psycopg2.extras.Json`, composición de payloads, estados y validación de dominio.
- `repositories/causas_repository.py` mezcla composición de árbol y validaciones (`app.domain.graph`) con llamadas a muchos repositorios de `app.persistence`.
- `services/` existe, pero no todos los dominios pasan por él: `analysis.py` y `operational.py` acceden a repositorios desde la ruta; `process_modeling_service.py` sí coordina entidades, validadores y repositorios.
- `app/domain/` ya contiene `analisis_causas.py`, `arbol.py`, `causa_tags.py`, `graph.py`, `machine_modeling/` y `process_modeling/`. `process_modeling` ya expone entidades, value objects, excepciones, validadores, casos de uso/contexto y una interfaz.
- `app/persistence/` contiene `db.py` y repositorios de procesos, nodos, relaciones, causas, hipótesis, contratos, máquinas y análisis; es una frontera parcial, no todavía una frontera por dominio.
- `agent_tools/` contiene contratos, registro, validación y adaptadores (`contracts.py`, `registry.py`, `validation.py`, `adapters.py`, `builtin.py`). `ExistingBackendGateway` es una adaptación a la API backend existente.
- `webapp/` contiene `index.html`, CSS, APIs JS (`webapp/js/api/`), estado/eventos/utilidades (`webapp/js/core/`), componentes, servicios y vistas. Las vistas consumen `/api/bootstrap`, `/api/causas`, `/api/operational` y `/api/process-modeling`, entre otros.
- Los tests Python y JavaScript importan directamente tanto `uc_bib_solv.app.domain`/`app.persistence` como `uc_bib_solv.repositories`, `uc_bib_solv.services` y archivos de `webapp/js`; existen tests unitarios, integración PostgreSQL, smoke y E2E Playwright.
- `requirements.txt` incluye Flask, `psycopg2-binary`, Dash, Dash Cytoscape, Dash Bootstrap Components y `python-dotenv`. La presencia de estas dependencias no autoriza su importación desde `domain`.
- `db_management/schema.sql` contiene el modelo físico actual para causas/hipótesis/análisis, operación, máquinas y Process Modeling, incluidos `node`, `relationship`, `analisis_*`, `pm_*` y `machine_operation_configuration`.

El estado Git observado antes de editar el artefacto presentaba numerosos cambios ajenos: modificaciones en `.atl/skill-registry.md`, `README.md`, `context.md`, tests y scripts; eliminaciones de `app/` y de la antigua copia `webapp_java/`; y nuevos archivos bajo `uc_bib_solv/`. Esos cambios se preservan conceptualmente y no forman parte del alcance ni se deben revertir como consecuencia de este requerimiento.

## Objetivo

Reorganizar incrementalmente `uc_bib_solv` para que cada dominio tenga un núcleo aislado, casos de uso y puertos explícitos, adaptadores de entrada/salida y wiring en infraestructura, manteniendo durante cada fase los endpoints, métodos, payloads, códigos HTTP, persistencia, navegación y resultados observables existentes.

## Actores

- **Usuario de la webapp**: consume las vistas y flujos actuales.
- **Frontend SPA**: adapta interacción, presentación, formato y llamadas HTTP.
- **Adaptador HTTP Flask**: transforma request/response y delega casos de uso.
- **Casos de uso de aplicación**: coordinan operaciones y puertos.
- **Núcleo de dominio**: aplica invariantes y reglas deterministas.
- **Adaptadores de persistencia/exteriores**: implementan puertos contra PostgreSQL u otros sistemas.
- **Mantenedor/CI**: ejecuta validadores arquitectónicos y regresión.

## Glosario y mapa de dominios

| Dominio objetivo | Evidencia actual | Ubicación objetivo inicial |
|---|---|---|
| `causal_analysis` | `routes/analysis.py`; `repositories/analysis_repository.py`; `app/domain/analisis_causas.py`; `app/persistence/analisis_causas_repo.py`, `analisis_causas_detalle_repo.py`; vistas/API `analysis.js` y `analisis_causas_v02.js` | `uc_bib_solv/modules/causal_analysis/` |
| `causal_tree` | `routes/causas.py`; `services/causas_service.py`, `causa_detail_service.py`; `repositories/causas_repository.py`, `causa_detail_repository.py`; `app/domain/arbol.py`, `graph.py`, `causa_tags.py`; `app/persistence/causa_repo.py`, `hipotesis_repo.py`, `node_repo.py`, `relationship_repo.py` | `uc_bib_solv/modules/causal_tree/` |
| `operational_modeling` | `routes/operational.py`; `repositories/operational_repository.py`; `services/operational_service.py`; `app/domain/machine_modeling/`; `app/persistence/contrato_repo.py`, `maquina_repo.py`, `proceso_repo.py`, `machine_model_repo.py`; vistas `maquinas_v02.js`, `procesos_v02.js`, `contratos_v02.js` | `uc_bib_solv/modules/operational_modeling/` |
| `process_modeling` | `routes/process_modeling.py`; `services/process_modeling_service.py`; `app/domain/process_modeling/`; `app/persistence/pm_*_repo.py`; API/componentes/vista `process-modeling.js` | `uc_bib_solv/modules/process_modeling/` |
| `agent_tools` | `agent_tools/contracts.py`, `registry.py`, `validation.py`, `adapters.py`, `builtin.py` | `uc_bib_solv/modules/agent_tools/` como módulo técnico orientado a capacidad de herramientas |
| `platform` | `backend_app.py`, `local_server.py`, `routes/bootstrap.py`, `routes/health.py`, `services/bootstrap_service.py`, `health_service.py`, `repositories/bootstrap_repository.py`, `health_repository.py`, `utils/http.py` | `uc_bib_solv/modules/platform/` y wiring de aplicación |

Este mapa es el baseline de inspección, no una afirmación de que los módulos objetivo ya existan. Si durante implementación se demuestra que dos límites son el mismo bounded context, podrán conservarse como dominios separados internamente solo con una decisión registrada y sin relajar las reglas de dependencia.

## Alcance

### Incluido

1. Inventariar y clasificar todo código Python de backend, `agent_tools`, tests y los assets JS/HTML/CSS que consumen o exponen cada capacidad.
2. Crear y migrar progresivamente los módulos objetivo bajo `uc_bib_solv/modules/<domain>/` con las cinco zonas obligatorias.
3. Extraer reglas de negocio, entidades, value objects, excepciones y validadores al `domain/` de su capacidad.
4. Definir casos de uso y puertos en `application/`, y contratos de salida/input donde corresponda.
5. Convertir rutas Flask, bootstrap, scripts y gateway de herramientas en adaptadores inbound.
6. Convertir repositorios, clientes PostgreSQL y gateways externos en adaptadores outbound que implementen puertos.
7. Centralizar el wiring, composición de dependencias, configuración y lifecycle en `infrastructure/`.
8. Mantener compatibilidad temporal mediante fachadas o shims delgados cuando sean necesarios para consumidores existentes; no podrán contener lógica duplicada ni nuevas dependencias.
9. Añadir validadores deterministas de estructura, naming, source/target, capas, dominios, aislamiento de `domain` y uso de implementaciones concretas.
10. Ampliar pruebas unitarias de dominio, aplicación con fakes, adaptadores, HTTP, integración de persistencia y regresión frontend/E2E en proporción a cada migración.

### Fuera del perímetro del producto afectado

No se incluyen modificaciones a otros directorios del worktree, aunque estén modificados, eliminados o sin seguimiento en Git. En particular, no se incluyen restauraciones o limpieza de `app/`, `webapp_java/`, scripts, tests ni documentos ajenos a `uc_bib_solv`.

## Estado objetivo y reglas arquitectónicas

### Estructura

Cada módulo de dominio deberá contener al menos:

```text
modules/<domain>/
  domain/
    entities.py, value_objects.py, services.py, exceptions.py, validators.py, interfaces.py (según necesidad)
  application/
    ports/inbound/     # contratos de casos de uso si se separan por dirección
    ports/outbound/    # contratos requeridos por aplicación/dominio
    use_cases.py       # o submódulos snake_case por caso de uso
  adapters/inbound/
    http/              # Flask, DTOs HTTP, parsing y serialización
    tools/             # si el dominio se expone a agent_tools
  adapters/outbound/
    persistence/       # implementaciones PostgreSQL y mappers
    external/           # clientes/gateways no persistentes
  infrastructure/
    wiring.py           # composición e inyección de dependencias
    config.py           # solo configuración de infraestructura, si aplica
```

Los subdirectorios no necesarios podrán omitirse solo cuando el módulo no exponga esa dirección; `domain`, `application/ports`, `adapters/inbound`, `adapters/outbound` e `infrastructure` son los límites canónicos del módulo.

### Reglas de dependencia

- `domain` no importará Flask, Dash, Dataiku, `psycopg2`, SQL, HTTP clients, variables de entorno, secretos, filesystem, `app.persistence`, `repositories`, `services`, `routes`, `webapp` ni `infrastructure`.
- `domain` no instanciará implementaciones concretas ni abrirá conexiones.
- `application` dependerá de contratos de `domain`/`application/ports`, no de Flask, SQL ni implementaciones concretas.
- `adapters/inbound` solo adaptará entradas externas y llamará a casos de uso/puertos de entrada; no contendrá invariantes reutilizables ni acceso a persistencia.
- `adapters/outbound` implementará puertos y concentrará SQL, conexiones, mappers y llamadas externas.
- `infrastructure` ensamblará implementaciones concretas mediante inyección explícita. Un caso de uso no podrá hacer imports dinámicos para seleccionar un repositorio concreto.
- Un dominio no importará otro dominio directamente para reutilizar internals. La colaboración deberá expresarse mediante puerto/contrato de aplicación, value object estable o un servicio de dominio explícitamente aprobado.
- Los módulos de plataforma podrán depender de módulos funcionales para wiring/adaptación, pero los módulos funcionales no dependerán de `platform`.

### Naming

- Directorios, módulos Python, funciones, variables y claves internas nuevas: `snake_case`.
- Clases, excepciones y Protocol/ABC: `PascalCase`.
- Constantes de módulo: `UPPER_SNAKE_CASE`.
- Nombres de dominio: `snake_case`, estables y orientados a capacidad, no a pantalla o tabla.
- Rutas HTTP y nombres de campos públicos existentes se conservan aunque usen convenciones históricas; no se consideran incumplimiento interno si existe un contrato de compatibilidad documentado.
- Archivos JS existentes con nombres kebab-case y nombres de endpoint públicos quedan preservados durante la migración; los archivos JS nuevos seguirán `snake_case` cuando la toolchain lo permita o documentarán una excepción de compatibilidad.

## Requisitos funcionales

- RF-01: El sistema DEBERÁ conservar el comportamiento observable de cada endpoint actual mientras se migra su implementación: ruta, método, parámetros, códigos HTTP, forma JSON, nombres de campos, estados de error y semántica de lectura/escritura.
- RF-02: Cada capacidad del mapa de dominios DEBERÁ tener un módulo bajo `uc_bib_solv/modules/<domain>/` y una matriz de trazabilidad desde sus ubicaciones legacy.
- RF-03: Los casos de uso DEBERÁN coordinar cada operación funcional y DEBERÁN ser invocables sin Flask, PostgreSQL, red ni frontend.
- RF-04: Toda regla reutilizable de negocio DEBERÁ ejecutarse en `domain`, incluyendo invariantes de análisis causal, ciclo/relaciones del árbol, validaciones de modelado de máquinas y Process Modeling.
- RF-05: Las validaciones de sintaxis, tipos, query parameters, JSON y códigos HTTP DEBERÁN residir en inbound; las invariantes funcionales DEBERÁN residir en domain y ser aplicables a cualquier adaptador.
- RF-06: Todo acceso a PostgreSQL, cursor, transacción, SQL, mapeo de filas y serialización persistente DEBERÁ residir en outbound/infrastructure del módulo propietario, con `db_management/schema.sql` como fuente física mientras no se apruebe una migración de esquema.
- RF-07: Los contratos de persistencia y servicios externos DEBERÁN declararse como puertos; las implementaciones concretas DEBERÁN estar fuera de `domain` y ser inyectadas desde `infrastructure`.
- RF-08: `analysis_repository.py`, `operational_repository.py`, `causas_repository.py` y equivalentes legacy DEBERÁN migrarse sin mantener dos implementaciones activas para la misma operación. Un shim temporal solo delegará al módulo canónico, registrará consumidores y tendrá criterio de retirada.
- RF-09: `agent_tools` DEBERÁ consumir casos de uso/gateways definidos por puertos, conservando nombres de herramientas, contratos `ToolRequest`/`ToolResult`, códigos y trazabilidad existentes.
- RF-10: El frontend DEBERÁ continuar usando sus APIs actuales; podrá mantener validación de UX, estado de carga y presentación, pero no será la fuente única de invariantes de negocio.
- RF-11: Cada fase de migración DEBERÁ poder activarse de forma incremental y ser reversible mediante wiring/fachada, sin cambios de esquema ni extracción de servicio.
- RF-12: Los validadores arquitectónicos DEBERÁN producir resultados deterministas, con salida legible y código de retorno no cero ante incumplimiento.

## Requisitos no funcionales

- RNF-01 — Compatibilidad: no se cambiará el contrato público salvo aprobación humana documentada.
- RNF-02 — Aislamiento: los tests unitarios de `domain` no requerirán Flask, PostgreSQL, red, secretos, Dataiku, Dash ni variables de entorno.
- RNF-03 — Determinismo: los validadores no dependerán del orden del filesystem, timestamps, red ni estado de base de datos; deberán ordenar sus entradas y salidas.
- RNF-04 — Seguridad: no se moverán secretos a `domain`; SQL existente y nuevo seguirá parametrizado.
- RNF-05 — Mantenibilidad: cada dependencia inter-capa e inter-dominio será visible mediante imports y wiring, no mediante globals ocultos o service locator implícito.
- RNF-06 — Regresión: las suites existentes aplicables deberán continuar pasando o quedar justificadamente adaptadas, con evidencia de equivalencia de contrato.
- RNF-07 — Rendimiento: la refactorización no deberá introducir llamadas duplicadas ni cambios deliberados en el número de consultas; cualquier diferencia medible deberá registrarse como riesgo y aprobarse.

## Ubicación concreta y responsabilidades

| Responsabilidad | Estado observado | Destino canónico |
|---|---|---|
| Arranque/wiring Flask | `backend_app.py`, `local_server.py` | `modules/platform/infrastructure/` y adaptadores inbound de cada módulo |
| HTTP de análisis | `routes/analysis.py` | `causal_analysis/adapters/inbound/http/` |
| Análisis y resultados | `repositories/analysis_repository.py`, `app/persistence/analisis_*` | `causal_analysis/application/`, `adapters/outbound/persistence/` |
| Árbol, causas e hipótesis | `routes/causas.py`, servicios/repositorios, `app/domain/arbol.py`, `graph.py` | `causal_tree/` por capa |
| Procesos, contratos y máquinas | `routes/operational.py`, `operational_repository.py`, `machine_modeling` | `operational_modeling/` por capa |
| Process Modeling | `routes/process_modeling.py`, `process_modeling_service.py`, `app/domain/process_modeling`, `pm_*` | `process_modeling/` por capa |
| Herramientas | `agent_tools/*.py` | `agent_tools/` por capa; el gateway existente pasa a outbound |
| SQL/conexiones | `app/persistence/db.py`, repositorios y `db_management/schema.sql` | outbound/infrastructure por módulo; el esquema físico queda en `db_management/` |
| UI | `webapp/js/api`, `core`, `components`, `views`, CSS/HTML | se conserva en `webapp/`; solo se ajustan imports/contratos si una fase lo exige |

## Fases incrementales

1. **Baseline y guardas**: congelar el inventario de endpoints/imports/contratos; introducir validadores y pruebas de contrato sin mover comportamiento.
2. **Platform y composición**: aislar arranque, configuración, health/bootstrap y wiring; mantener fachadas de importación.
3. **Módulos de menor riesgo**: migrar `agent_tools` y `process_modeling`, que ya tienen contratos y dominio identificable, manteniendo APIs legacy.
4. **Causalidad**: separar `causal_tree` y `causal_analysis`; consolidar repositorios de análisis y eliminar duplicidad mediante shim temporal si los consumidores lo requieren.
5. **Operational modeling**: separar composición/persistencia de reglas de máquina, contratos, procesos y operaciones.
6. **Cierre de fronteras**: eliminar consumidores de rutas/servicios/repositorios legacy, hacer que validadores sean obligatorios en CI y retirar shims solo tras confirmar referencias cero y regresión verde.

Cada fase deberá terminar con validación humana de la evidencia antes de avanzar a la siguiente. No se autoriza un big-bang rewrite.

## Validadores deterministas obligatorios

La implementación deberá añadir un entry point versionable en `uc_bib_solv/architecture_validators/` y pruebas bajo `tests/architecture/` (los nombres exactos de módulos internos seguirán naming normativo). El entry point recomendado es `python -m uc_bib_solv.architecture_validators`.

Como mínimo, los validadores deberán comprobar:

1. **Estructura**: cada módulo tiene los directorios obligatorios y no hay código productivo fuera de un límite reconocido sin regla explícita.
2. **Naming**: rutas nuevas, módulos, funciones, clases y constantes respetan `snake_case`, `PascalCase` y `UPPER_SNAKE_CASE`; las excepciones legacy se enumeran en allowlist versionada.
3. **Source/target**: cada import se clasifica por origen y destino (`domain`, `application`, inbound, outbound, infrastructure, otro dominio, externo) mediante AST, no por coincidencia textual frágil.
4. **Capas**: se rechazan imports prohibidos, por ejemplo `domain -> infrastructure`, `domain -> Flask/psycopg2`, inbound -> outbound directo y application -> implementación concreta.
5. **Dominios**: se rechazan imports de internals de otro dominio; solo se permiten contratos públicos/puertos declarados.
6. **Aislamiento de domain**: se rechazan imports y referencias a `Flask`, `Dash`, `Dataiku`, `psycopg2`, SQL, `os.environ`, `dotenv`, sockets, clientes HTTP, filesystem y módulos de infraestructura.
7. **Implementaciones concretas**: se rechaza que casos de uso instancien o importen repositorios/clientes concretos; se exige inyección desde wiring.
8. **Duplicidad**: se detecta que una operación canónica no tenga dos implementaciones outbound activas ni shims con SQL propio.
9. **Excepciones documentadas**: cada excepción a la matriz de dependencia o naming debe incluir propietario, motivo, fase y criterio de retirada.

El resultado deberá listar archivo, línea, regla, origen, destino y mensaje estable; los fallos se ordenarán lexicográficamente y devolverán exit code `1`.

## Compatibilidad, persistencia y frontend/backend

- La API HTTP actual es el contrato de compatibilidad. Las rutas listadas en la evidencia y cualquier ruta descubierta en inventario deberán probarse con snapshot/contrato antes y después.
- Durante la migración, una fachada legacy podrá conservar `uc_bib_solv.services.*` o `uc_bib_solv.repositories.*` si existen consumidores, pero solo delegará a un caso de uso/puerto canónico; deberá estar marcada como deprecated y cubierta por un test de delegación.
- No se cambia `db_management/schema.sql`, nombres de tablas, columnas, índices ni datos en este requerimiento. Cualquier cambio físico requiere nuevo requerimiento o enmienda aprobada.
- `db.py` dejará de ser una dependencia transversal implícita; cada adaptador outbound recibirá la conexión/factory por wiring y el módulo propietario será el único responsable del acceso a sus tablas.
- El frontend conserva `webapp/index.html`, CSS, APIs, componentes, estado y vistas. La validación de formato/presencia para UX puede seguir allí; el backend/domain vuelve a validar toda regla funcional.
- La evidencia de regresión debe cubrir unit tests Python, tests JavaScript, tests de rutas, integración PostgreSQL cuando esté disponible, smoke tests y E2E existentes aplicables.

## Criterios de aceptación técnicos

- **AC-01 — Mapa completo:** `find uc_bib_solv/modules -maxdepth 3 -type d | sort` y el inventario de migración cubren todos los dominios de la tabla; no queda una capacidad sin propietario documentado.
- **AC-02 — Estructura:** el validador ejecutado con `python -m uc_bib_solv.architecture_validators --check-structure` termina con exit `0` para módulos conformes y `1` ante un directorio obligatorio ausente.
- **AC-03 — Naming:** `python -m uc_bib_solv.architecture_validators --check-naming` detecta un fixture deliberadamente inválido y no reporta falsos positivos sobre excepciones legacy allowlisted.
- **AC-04 — Source/target:** `python -m uc_bib_solv.architecture_validators --check-dependencies` emite para cada import origen, destino, regla y línea; un fixture `domain` que importe `psycopg2` falla con exit `1`.
- **AC-05 — Domain aislado:** `rg -n "Flask|Dash|Dataiku|psycopg2|db_cursor|os\.environ|requests|SELECT|INSERT|UPDATE|DELETE|infrastructure|adapters\.outbound" uc_bib_solv/modules/*/domain` devuelve cero coincidencias productivas; el validador AST es la prueba normativa.
- **AC-06 — Dependencias inter-dominio:** un fixture que importe `modules/other_domain/domain` desde otro dominio falla; un import de un puerto público permitido pasa.
- **AC-07 — Implementaciones concretas:** un caso de uso que instancie `Postgres*Repository` falla `--check-concrete-implementations`; el wiring que inyecte un fake/implementación al puerto pasa.
- **AC-08 — SQL y conexiones:** un análisis AST/`rg` confirma que SQL, `db_cursor`, `get_connection`, `psycopg2` y mappers persistentes activos están solo en `adapters/outbound` o `infrastructure` autorizados, salvo allowlist de scripts operativos explícitamente registrada.
- **AC-09 — Rutas:** las rutas Flask no importan outbound ni repositorios legacy y solo invocan puertos/casos de uso de entrada; se verifica con el validador y con inspección AST de `routes`/inbound.
- **AC-10 — Duplicidad:** no existen dos implementaciones activas para cada operación migrada; shims, si quedan, no contienen SQL ni consumidores nuevos y tienen prueba de delegación.
- **AC-11 — Contrato HTTP:** la suite de contrato compara rutas, métodos, códigos, `status/data`, nombres de campos, errores y casos de éxito de análisis, causas, operacional y Process Modeling antes/después; todas las comparaciones pasan.
- **AC-12 — Dominio sin externos:** `pytest tests/architecture tests/unit` y los tests de dominio nuevos se ejecutan sin conexión PostgreSQL ni red; las pruebas de reglas pasan en aislamiento.
- **AC-13 — Persistencia:** las pruebas de adaptadores outbound cubren lectura, escritura, update/upsert y transacciones de cada operación migrada con fakes o PostgreSQL de integración; no se modifica el esquema existente.
- **AC-14 — Frontend:** `node --check` sobre JS modificado y tests unitarios/E2E aplicables confirman que las vistas siguen resolviendo las APIs y estados actuales.
- **AC-15 — Regresión global:** los comandos de CI documentados por el repositorio para Python, JavaScript, integración y E2E terminan satisfactoriamente; si PostgreSQL o el entorno E2E no está disponible, la evidencia debe distinguir bloqueo ambiental de fallo funcional y no inventar resultados.
- **AC-16 — Incrementalidad:** cada fase deja un commit/artefacto de evidencia con matriz legacy→target, allowlist vigente, pruebas ejecutadas y plan de retirada de shims; ninguna fase requiere mover todo el sistema simultáneamente.
- **AC-17 — Gate humano:** Gate 1 y Gate 3 fueron aprobados explícitamente por el programador humano el 2026-08-20; el requerimiento queda `done`.

## Riesgos

- El worktree tiene cambios ajenos extensos y eliminaciones de copias anteriores; mezclar baseline puede ocultar consumidores o producir falsas regresiones.
- Hay duplicidad real entre `repositories/` y `app/persistence/`, especialmente en análisis y operacional; retirarla sin inventario puede romper imports directos de tests/scripts.
- `db_management/schema.sql` contiene modelos legacy y Process Modeling relacionados; separar dominios sin respetar claves compartidas puede cambiar transacciones.
- `routes/operational.py` y `repositories/operational_repository.py` contienen tanto acceso a datos como composición/reglas; separar responsabilidades puede cambiar errores o payloads.
- `causal_tree` y `causal_analysis` comparten causas, hipótesis, nodos y relaciones; la frontera requiere contratos explícitos para evitar acoplamiento circular.
- Tests de integración dependen de PostgreSQL local y E2E de un servidor web; la disponibilidad ambiental puede impedir verificación completa.
- El frontend usa nombres históricos/kebab-case y contratos públicos no equivalentes a naming interno; renombrarlos indiscriminadamente rompe cargas estáticas.
- La clasificación AST debe contemplar imports relativos, imports dinámicos y scripts; las excepciones deben ser pequeñas, explícitas y temporales.

## Fuera de alcance

- Cambiar reglas de negocio, UI, UX, permisos, autenticación o contratos HTTP por conveniencia arquitectónica.
- Cambiar tablas, DDL, datos, motor PostgreSQL, migraciones o nombres de columnas.
- Extraer microservicios, desplegar nuevos servicios o introducir un framework de inversión de control que no sea necesario.
- Reescribir todo el frontend o renombrar APIs/rutas públicas.
- Incluir cambios ajenos del worktree, restaurar eliminaciones o limpiar archivos no pertenecientes a `uc_bib_solv`.
- Crear o editar `task_plan.md` en esta fase.

## Ambigüedades y decisiones conservadoras

No se detectó una ambigüedad bloqueante para producir este spec porque la instrucción fija arquitectura, dirección de dependencias, naming, validación y alcance. Quedan decisiones de implementación no bloqueantes que deberán confirmarse o ajustarse durante la validación humana:

1. **Nombre exacto del dominio causal**: se propone separar `causal_tree` y `causal_analysis` porque el código y tablas muestran capacidades distintas; no se fusionan sin evidencia de que formen un único bounded context.
2. **Nombre del entry point de validadores**: se propone `uc_bib_solv.architecture_validators`; la ubicación concreta puede ajustarse si la toolchain del repositorio exige otro entry point, manteniendo los mismos checks y determinismo.
3. **Scripts operativos**: se propone allowlist explícita para scripts que necesiten DB por operación de soporte; no se consideran parte de `domain` ni de los módulos de runtime.
4. **Legacy shims**: se permite conservarlos solo cuando la evidencia de consumidores lo exija; la implementación deberá decidir su retirada fase a fase y registrarla.
5. **JS nuevo**: se conserva la compatibilidad de nombres de assets existentes; los nombres internos nuevos seguirán la convención que permita la toolchain y cualquier excepción se registrará.

Estas decisiones son conservadoras y no autorizan cambios de comportamiento. Si el programador humano considera que alguna cambia el alcance, deberá enmendar este spec antes de planificar.

## Decision Log

| ID | Fecha | Decisión | Motivo/evidencia | Responsable |
|---|---|---|---|---|
| D-15-01 | 2026-08-17 | El perímetro es exclusivamente `uc_bib_solv`; no se absorben cambios ajenos del worktree. | `git status --short` mostró cambios fuera y dentro del árbol; la instrucción exige conservar el alcance. | `requirements-agent` |
| D-15-02 | 2026-08-17 | La migración será incremental y compatible, con fachadas temporales solo si son necesarias. | Existen imports directos a `repositories`, `services` y `app.*` desde tests/scripts. | `requirements-agent` |
| D-15-03 | 2026-08-17 | `db_management/schema.sql` permanece fuente del modelo físico y no se modifica. | La instrucción pide arquitectura, no cambio de persistencia; el esquema contiene tablas compartidas. | `requirements-agent` |
| D-15-04 | 2026-08-17 | Se propone el mapa funcional `causal_analysis`, `causal_tree`, `operational_modeling`, `process_modeling`, `agent_tools` y `platform`. | Evidencia de rutas, servicios, repositorios, dominios existentes y frontend/API. | `requirements-agent` |
| D-15-05 | 2026-08-17 | Las excepciones legacy de naming/dependencias deben ser allowlists temporales y verificables. | Se observan nombres históricos y capas parcialmente migradas; bloquear todo de golpe rompería compatibilidad. | `requirements-agent` |
| D-15-06 | 2026-08-17 | La validación humana del spec es Gate 1 antes de `task_plan.md` e implementación. | Contrato SDD y skill `requirements-agent`. | `requirements-agent` |

## Preguntas pendientes

No hay preguntas bloqueantes pendientes. El mapa de dominios propuesto, la ubicación del validador y la política de shims descrita en D-15-02/D-15-04/D-15-05 quedan aceptados mediante la validación humana de Gate 1.

## Gate de validación humana

Gate 1 (validación del spec): `aprobado` por el programador humano.

Gate 3 (validación final de implementación): `aprobado` por el programador humano el 2026-08-20.

El requisito queda en estado `done`; las NC están resueltas y la evidencia T1–T10 queda cerrada conforme al plan.

## Reporte de fase

- Sub-agente: `requirements-agent`.
- Sesión: aislada; este agente es el único autor del artefacto final.
- Modelo: `gpt-5.6-luna`.
- Reasoning effort: `medium`.
- Skills leídas: `requirement-doc`, `project-structure-sdd`, `domain-logic`; además se leyeron `.atl/sub-agent-registry.md`, `.atl/skill-registry.md` y `common_spec_driven_development/sub_agents/requirements-agent.md` como carga normativa.
- Archivos/árboles inspeccionados: `requerimientos_cliente/requerimiento_15.md`; spec anterior completo; `git status --short`, diff del target y último commit; árbol completo de `uc_bib_solv`; fuentes Python de `backend_app.py`, `local_server.py`, `agent_tools/`, `app/domain/`, `app/persistence/`, `routes/`, `services/`, `repositories/`, `utils/`; frontend `webapp/index.html`, `webapp/js/` y `webapp/css/`; `requirements.txt`; `db_management/schema.sql` y scripts/configuración/tests relevantes mediante búsquedas de imports, rutas, SQL, dependencias y referencias cruzadas.
- Artefacto escrito: `./requeriments_spec_driven_development/requerimiento_15/spec.md`.
- Cambios realizados por esta fase: únicamente reemplazo del `spec.md` indicado; no se implementó código, no se movió ni borró código y no se creó ni editó `task_plan.md`.
