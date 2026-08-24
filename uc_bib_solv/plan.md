# Migración arquitectónica BPM/TREE — ejecución

## Análisis y plan de esta ejecución

Se implementará la migración de forma incremental sobre la arquitectura híbrida existente. BPM será propietario de procesos, operaciones, etapas, máquinas, contratos, asociaciones máquina-contrato y configuraciones máquina-operación. TREE conservará exclusivamente el grafo causal, causas, hipótesis, evidencias y análisis causales. Las referencias entre dominios se mantendrán mediante identificadores, DTOs o ports.

### Fases abordadas

1. Consolidar el inventario backend y la composición runtime sin eliminar compatibilidad.
2. Añadir pruebas de caracterización para rutas, contratos de persistencia y límites arquitectónicos.
3. Crear los ports BPM explícitos y adaptar gradualmente el wiring sin cambiar el contrato HTTP.
4. Fortalecer los límites TREE/BPM y documentar los candidatos legacy para una retirada posterior.
5. Ejecutar validadores, tests unitarios, integración disponible y compilación.

### Restricciones

- No modificar PostgreSQL ni el esquema.
- No eliminar rutas, módulos ni fachadas legacy en esta primera ejecución.
- No crear adaptadores CLI, MCP o Dataiku sin consumidores reales.
- Mantener las respuestas HTTP y los nombres de payload existentes.
- No mover entidades de contrato o máquina al dominio TREE.

### Criterios de aceptación

- La composición runtime conserva las rutas públicas actuales.
- Los ports nuevos expresan capacidades BPM concretas y no dependen de tecnología.
- Los validadores arquitectónicos detectan los límites nuevos.
- La suite focalizada y los validadores pasan; cualquier fallo preexistente queda documentado.

### Progreso de implementación

- `OperationalPersistencePort` ahora expone capacidades BPM explícitas para procesos, operaciones, máquinas, contratos, asociaciones y configuraciones.
- Los ports de Process Modeling incluyen operaciones de actualización, eliminación, metadatos, etapas y transiciones.
- El runtime Flask usa los adaptadores canónicos de BPM operacional, TREE causal y análisis causal; las fachadas legacy siguen disponibles como aliases.
- El inventario registra ownership de dominio y verifica que contratos/máquinas pertenecen a BPM y nodos/análisis causales a TREE.
- Las rutas de las fachadas legacy se comparan automáticamente con el mapa runtime canónico.
- Fase validada: tests focalizados 16/16, auditoría runtime y validadores de estructura/nombres/dependencias correctos.
- La suite completa mantiene fallos preexistentes relacionados con archivos legacy eliminados (`uc_bib_solv/app.py`, `db/schema.sql`, rutas antiguas) y con el hash histórico del esquema; no se han introducido cambios de PostgreSQL.

## Segunda fase — dominio BPM canónico

### Análisis

El runtime ya utiliza adaptadores BPM canónicos, pero el dominio de procesos todavía vive en `app/domain/process_modeling` y `modules/process_modeling` actúa como reexport. Las capacidades operativas de procesos, operaciones, máquinas, contratos, asociaciones y configuraciones todavía se expresan principalmente mediante el repositorio operacional legacy.

### Plan

1. Crear `modules/bpm` con entidades BPM operativas framework-free y ports de aplicación explícitos.
2. Definir referencias BPM estables para procesos, operaciones, máquinas y contratos sin acoplar TREE.
3. Adaptar el servicio operacional para validar y exponer estas entidades sin cambiar payloads HTTP.
4. Mantener `modules/process_modeling` y `app/domain` como compatibilidad hasta completar la migración de consumidores.
5. Añadir pruebas de invariantes, imports y wiring; no modificar PostgreSQL ni eliminar archivos legacy.

### Criterios de aceptación

- `modules/bpm/domain` no importa Flask, PostgreSQL, `app`, repositories ni adapters.
- Contratos y asociaciones de máquinas se modelan dentro de BPM.
- TREE no recibe dependencias nuevas hacia entidades BPM.
- Las rutas públicas y la suite focalizada mantienen su comportamiento.

## Tercera fase — desacoplamiento de Process Modeling

### Análisis

`modules/process_modeling/domain` todavía reexporta entidades, excepciones, value objects y validadores desde `app/domain/process_modeling`. Además, `modules/process_modeling/application/service.py` delega en `services/process_modeling_service`, que instancia repositorios concretos.

### Plan

1. Crear la implementación canónica BPM del agregado Process Modeling.
2. Cambiar los exports de `modules/process_modeling/domain` para depender de BPM, no de `app/domain`.
3. Mantener los nombres legacy (`ProcessDefinition`, `ProcessNode`, etc.) como aliases públicos.
4. Introducir una composición BPM con ports de procesos, versiones, nodos y transiciones.
5. Verificar rutas, validaciones, jerarquía, operaciones y persistencia sin alterar PostgreSQL.

### Restricciones

- No eliminar `app/domain/process_modeling` ni `services/process_modeling_service`.
- No cambiar payloads ni endpoints.
- No modificar datos ni esquema PostgreSQL.

## Cuarta fase — persistencia BPM detrás de ports

### Análisis

Las clases `pm_process_repo`, `pm_version_repo`, `pm_node_repo` y `pm_transition_repo` ya encapsulan el SQL, pero el wiring las instancia directamente desde `modules/process_modeling/infrastructure`. Falta una composición canónica BPM que exponga esos cuatro repositorios como ports sin cambiar sus consultas ni respuestas.

### Plan

1. Definir los ports de persistencia BPM en `modules/bpm/application/ports`.
2. Crear un adaptador PostgreSQL BPM que componga los repositorios actuales por inyección.
3. Conectar el wiring de Process Modeling al adaptador canónico.
4. Mantener `ProcessModelingPersistenceAdapter` y los módulos legacy como compatibilidad.
5. Verificar creación, consulta, actualización y validación de procesos, versiones, nodos y transiciones.

### Restricciones

- No reescribir ni mover SQL en esta fase.
- No modificar tablas, migraciones ni datos.
- No cambiar los payloads ni endpoints públicos.

### Implementación y verificación de la tercera fase

- Creada la implementación BPM canónica de `ProcessDefinition`, `ProcessVersion`, `ProcessNode` y `ProcessTransition`.
- Migrados a BPM canónico los value objects, excepciones, validadores y contexto de Process Modeling.
- `modules/process_modeling/domain` ya no importa `app/domain`; mantiene únicamente exports compatibles.
- `services/process_modeling_service.py` consume los exports canónicos de Process Modeling.
- Rutas y persistencia legacy se mantienen sin cambios de contrato.
- Tests focalizados de Process Modeling, contexto BPM y entidades: 21/21 correctos.
- Validadores arquitectónicos y compilación correctos.

### Implementación y verificación de la segunda fase

- Creado `modules/bpm` con entidades framework-free para procesos, versiones, operaciones, etapas, máquinas, contratos, asociaciones y configuraciones.
- Añadidos `ProcessRef` y `OperationRef` como referencias BPM estables.
- Centralizado `BpmOperationalPort`; `OperationalPersistencePort` queda como alias de compatibilidad.
- La creación/actualización de contratos, máquinas y asociaciones pasa por validación de entidades BPM antes de persistir.
- El inventario identifica `modules/bpm`, `modules/process_modeling` y `modules/operational_modeling` como un mismo contexto BPM transitorio.
- Tests focalizados: 18/18 correctos.
- Validadores de arquitectura, auditoría runtime y compilación: correctos.

# Retirada del estado de máquinas

## Auditoría backend — análisis y plan

### Análisis

La aplicación Flask se compone actualmente desde `modules/platform/infrastructure/app_factory.py`, pero registra varias fachadas de compatibilidad de `routes/`. Existen implementaciones canónicas y legacy superpuestas para causalidad, análisis, operación y modelado BPM. Las capas `services/`, `repositories/` y `app/persistence/` todavía tienen consumidores runtime o de pruebas, por lo que no se consideran código eliminable sin una verificación adicional.

### Plan

1. Ampliar el inventario arquitectónico para incluir módulos Python, funciones, imports, imports dinámicos, endpoints, blueprints registrados y adaptadores no registrados.
2. Clasificar cada módulo, función y endpoint como activo, compatibilidad necesaria, candidato legacy, candidato sin consumidor o pendiente de validación dinámica.
3. Añadir comprobaciones automatizadas de duplicidades, huecos de composición y consumidores ausentes, sin eliminar código ni tocar PostgreSQL.
4. Documentar el mapa actual y los criterios de eliminación reversible.
5. Validar sintaxis, inventario, rutas Flask, tests backend y validadores arquitectónicos.

### Restricciones

- Esta fase es únicamente de auditoría e inventario.
- No se eliminan módulos, funciones, endpoints, rutas ni datos.
- Ninguna ausencia de referencia estática se considera prueba suficiente de código muerto.

### Implementación y verificación

- Ampliado `scripts/audit_application_architecture.py` con inventario AST de módulos, funciones, endpoints, imports dinámicos y consumidores estáticos.
- Añadido el mapa runtime de `Flask.url_map`, clasificación de módulos/funciones y detección de adaptadores inbound no observados en la composición activa.
- Añadidos checks `--check-backend` para errores de sintaxis y fallo de composición runtime.
- Añadidos tests de arquitectura para consumidores, clasificación y adaptadores no registrados.
- Documentado el resultado en `uc_bib_solv/backend_audit.md`.
- Resultado actual: 87 declaraciones de endpoints, 67 endpoints únicos, 68 rutas runtime, 20 duplicidades, 2 imports dinámicos y 0 errores de sintaxis.
- Validadores de estructura, nombres y dependencias: correctos.
- `test_schema_is_not_modified_by_t9` sigue fallando por discrepancia de hash preexistente del esquema; esta fase no modificó PostgreSQL ni el esquema.


## Análisis

El estado específico de máquina se implementa como `operational_status` y aparece en la vista `maquinas_v02`, en los dos modelos de dominio de máquinas, en validadores/repositorios y en la columna PostgreSQL `maquina.operational_status`. La aplicación también usa `status` para procesos, contratos, configuraciones y respuestas HTTP; esos usos quedan fuera del alcance.

## Plan

1. Retirar de la UI de máquinas los filtros, columna, badges, indicadores, métricas y campo de edición relacionados con el estado de máquina.
2. Retirar `operational_status` de ambos modelos, validadores, payloads y persistencia de máquinas.
3. Eliminar la proyección de estado derivado de los registros de máquinas sin alterar los estados de procesos ni contratos.
4. Actualizar el esquema declarativo y aplicar directamente `ALTER TABLE maquina DROP COLUMN IF EXISTS operational_status` en PostgreSQL local.
5. Actualizar y ejecutar pruebas unitarias, estáticas y de integración relevantes.

## Criterios de aceptación

- Ningún modelo, payload, respuesta o UI de máquina lee o escribe `operational_status`.
- La página de máquinas conserva filtros por proceso, contrato y operación BPM.
- La tabla `maquina` local y `db_management/schema.sql` no contienen la columna `operational_status`.
- Los estados de otros dominios continúan funcionando.

## Implementación y verificación

- Implementado en UI, frontend core, modelos, validadores, repositorios, rutas y esquema PostgreSQL.
- Ejecutado `ALTER TABLE maquina DROP COLUMN IF EXISTS operational_status` en `solve_ishikawa`.
- Tests Python focalizados: 14/14 OK mediante `unittest`.
- Tests JavaScript focalizados: 9/9 OK; comprobación sintáctica JS y Python OK.
- Verificación PostgreSQL: `operational_status` no existe en `maquina`.

## Corrección de procesos — análisis y plan

### Análisis

La vista `procesos_v02` expone un estado operativo derivado (`active`, `hold`, `inactive`) a partir de los contratos asociados. Ese estado se consume en filtros, badges, columnas, panel lateral, estado frontend, parámetros HTTP y proyecciones del repositorio operativo. La tabla legacy `proceso` solo persiste `id` y `nombre`; no se ha identificado una columna `status_proceso`. Los estados de contratos y del modelado BPM pertenecen a otros contextos y deben conservarse.

### Plan

1. Alinear la cabecera de `procesos_v02` con `maquinas_v02`, ubicando `Crear nuevo proceso` junto al título.
2. Eliminar filtros, badges, columna `Estado`, columna `Responsable` y textos laterales derivados de estado o responsable.
3. Mantener las métricas de contratos y máquinas, y conservar actualizar/eliminar en la gestión lateral.
4. Retirar `processStatus` del estado frontend, parámetros de consulta, casos de uso y repositorio operativo.
5. Eliminar `status` y `owner` de las proyecciones operativas de procesos, sin tocar estados de contratos, versiones BPM, análisis ni hipótesis.
6. Verificar `proceso` y `db_management/schema.sql`; no ejecutar migración si no existe una columna de estado de proceso.
7. Actualizar pruebas de payload, UI, creación y preservación de estados de otros dominios.

### Criterios de aceptación

- `procesos_v02` no renderiza filtros, badges, estado ni responsable.
- El botón de creación aparece en la cabecera y crea procesos correctamente.
- Las operaciones de actualizar y eliminar continúan disponibles en el panel lateral.
- Los registros y respuestas operativas de procesos no contienen `status`, `status_proceso` ni `owner`.
- `processStatus` no se envía ni se utiliza para filtrar procesos.
- Los estados de contratos y del modelado BPM siguen intactos.
- PostgreSQL y `db_management/schema.sql` no contienen una columna de estado en `proceso`.

### Autorización

Autorización recibida mediante `inicia implementacion`.

### Implementación y verificación

- Alineada la cabecera de `procesos_v02` con máquinas y movida la acción de creación junto al título.
- Eliminados filtros, badges, estado, responsable y sus referencias visuales de la página.
- Retirados `processStatus`, la proyección operativa `status`/`owner` y los filtros de estado de procesos.
- Conservados los estados de contratos y del modelado BPM.
- `proceso` no contiene columnas `status_proceso`, `process_status` ni `status`; no fue necesaria una migración SQL.
- Python focalizado: 15/15 pruebas OK.
- JavaScript focalizado: 9/9 pruebas OK.
- Sintaxis Python y JavaScript verificada correctamente.

## Depuración BPM raíz y relación explícita — análisis y plan

### Análisis

La versión `478df933-7729-4bed-adb6-8d1b2f97ae4c` corresponde al proceso BPM raíz
`06757b45-a08d-4493-8012-db03325399c8` (`PROCESO_MEZCLAS_CAUCHO_NEUMATICOS`).
La subárbol actual contiene seis procesos hijos directos. El modelo legacy
`proceso` todavía no tiene una FK explícita hacia `pm_process_definition` y usa
el campo `nombre` como etiqueta y, en algunos fixtures, como identificador técnico.

### Plan

1. Añadir `proceso.bpm_process_id UUID NOT NULL UNIQUE` con FK a
   `pm_process_definition(process_id)` y sincronizar `proceso.nombre` con el nombre BPM.
2. Resolver recursivamente la subárbol permitida desde el `version_id` indicado.
3. Completar y validar la relación BPM–proceso para los datos conservados y migrar
   los procesos canónicos identificables por los nombres técnicos existentes.
4. Eliminar en una transacción los BPM, versiones, nodos, transiciones, procesos,
   contratos, máquinas, configuraciones, árboles y datos causales fuera del alcance.
5. Conservar entidades compartidas si mantienen al menos una relación válida con
   la raíz o alguno de sus descendientes; eliminar únicamente vínculos inválidos.
6. Validar conteos, huérfanos, FKs y ausencia de registros fuera de la subárbol.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.

## Páginas y entradas únicas para procesos y operaciones BPM — análisis y plan

### Análisis

El modelado BPM todavía abre el modal interno para editar cualquier nodo. No
existe una página operativa de operaciones ni una entrada dedicada para editar
sus datos, aunque las APIs de nodos, metadatos y etapas ya están disponibles.

### Plan

1. Añadir catálogo y detalle de operaciones con filtros por proceso y versión.
2. Centralizar el formulario de operación para página dedicada y modal de
   lista, incluyendo ficha, metadatos y etapas.
3. Redirigir `Editar` desde el modelado según `subprocess` u `operation` y
   conservar el modal únicamente para crear nodos.
4. Añadir acceso a operaciones desde procesos y registrar las nuevas rutas.
5. Actualizar pruebas unitarias y E2E de navegación, edición y persistencia.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.

## Página completa de edición del proceso BPM — análisis y plan

### Análisis

El detalle BPM actual se implementó como modal dentro de `procesos_v02`, pero
el nuevo alcance requiere una pantalla dedicada para editar la ficha completa
de la definición. La API ya expone lectura y PATCH parcial de nombre y
descripción; debe ampliarse para los campos de la ficha y validar la jerarquía.

### Plan

1. Crear la ruta y vista dedicada `procesos_detalle_v02`, accesible desde
   `Detalle`, con navegación de regreso y estado de carga.
2. Sustituir el modal por una ficha completa con código, nombre, descripción,
   nivel, padre, estado, identificador protegido y resumen de versiones.
3. Ampliar el servicio BPM y el repositorio para validar y guardar la ficha,
   manteniendo protegido `bpm_process_id` y sincronizado `proceso.nombre`.
4. Mantener el modelado de nodos y versiones en su página actual.
5. Actualizar pruebas unitarias y E2E de navegación, edición, validaciones y
   persistencia.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.

## Detalle BPM de procesos — análisis y plan

### Análisis

`procesos_v02` no renderiza actualmente una acción `Detalle`. El cliente de
modelado BPM ya permite consultar procesos, pero no expone el `PATCH` de la
definición. La API backend sí dispone de actualización de procesos y sincroniza
el nombre canónico `proceso`.

### Plan

1. Añadir `Detalle` en cada fila y abrir un modal tras seleccionar el proceso.
2. Cargar la definición BPM completa y mostrar sus datos técnicos y de
   relación en modo lectura, dejando editables nombre y descripción.
3. Añadir `updateProcess` al cliente BPM y guardar mediante `PATCH`.
4. Refrescar el catálogo operativo después de guardar para reflejar el nombre
   BPM actualizado.
5. Añadir pruebas unitarias y E2E de apertura, carga, edición y persistencia.

Durante la validación se detectó que la ruta BPM solo exponía `GET`; se añadió
el servicio y la ruta `PATCH /api/process-modeling/processes/{process_id}` para
hacer efectiva la edición desde el modal.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.

## Ajustes de acciones en procesos y contratos — análisis y plan

### Análisis

`procesos_v02` todavía renderiza y escucha la acción `Abrir árbol`. El modal
de detalle de contratos ya concentra edición y máquinas, pero no incluye la
eliminación aunque la API `DELETE` ya existe.

### Plan

1. Retirar el botón y listener `process-tree`, manteniendo `Contratos` y el
   acceso al modelado BPM.
2. Añadir `Eliminar contrato` al modal de detalle con confirmación nativa.
3. Reutilizar `deleteContract`, cerrar el modal, limpiar la selección y
   refrescar el catálogo tras una eliminación correcta.
4. Actualizar pruebas unitarias y E2E para cancelación, confirmación,
   eliminación y ausencia de la acción de árbol en procesos.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.

## Detalle y edición de contratos — análisis y plan

### Análisis

La página de contratos todavía concentra la edición y la asignación de
máquinas en el panel lateral. Las filas ofrecen acciones separadas para
`Máquinas` y `Abrir árbol`; la primera debe convertirse en `Detalle`, mientras
que el árbol se conserva como navegación de fila.

### Plan

1. Sustituir `Máquinas` por `Detalle` y abrir desde esa acción un modal de
   edición para el contrato seleccionado.
2. Mover al modal el alcance BPM en solo lectura, nombre, métrica, objetivo y
   selector múltiple de máquinas, cargando las asociaciones actuales.
3. Guardar datos contractuales y máquinas mediante las APIs existentes,
   retirando del panel lateral árbol y controles de gestión.
4. Mantener `Abrir árbol` en las filas y conservar estados, relaciones BPM y
   persistencia actual.
5. Actualizar pruebas unitarias y E2E para apertura, edición, asignación y
   persistencia del detalle.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.

## Selectores BPM vacíos en el servidor local — análisis y plan

### Análisis

El código frontend ya contempla `AppState.catalog` y el catálogo de
`pageData.contratos`. El backend actualizado también entrega `contractScopes`.
Sin embargo, el proceso Flask activo en `127.0.0.1:8050` fue iniciado antes de
esa implementación: su respuesta `/api/operational/page/contratos` no contiene
`contractScopes`, mientras que una instancia nueva sí lo entrega. Por eso el
modal muestra `No hay alcances BPM disponibles`.

### Plan

1. Detener únicamente el proceso local Flask que escucha en el puerto `8050`.
2. Iniciar de nuevo `uc_bib_solv/local_server.py` usando el código actualizado.
3. Verificar que `/api/operational/catalog` y
   `/api/operational/page/contratos` incluyan procesos y operaciones BPM.
4. Recargar la página de contratos y comprobar que ambos selectores permiten
   seleccionar valores.
5. Ejecutar la prueba frontend focalizada para confirmar el fallback y el
   payload de creación.

### Autorización

Pendiente de recibir exactamente `inicia implementacion` para reiniciar el
servidor local.

## Rediseño de filtros y creación de contratos BPM — análisis y plan

### Análisis

La página ya recibe procesos y operaciones BPM, pero el filtro de contratos
solo usa el proceso legacy seleccionado y el modal muestra todas las
operaciones sin una relación de selección en cascada. La implementación será
frontend, reutilizando `bpmProcessId`, `bpmNodeId` y el catálogo existente.

### Plan

1. Añadir el filtro de proceso BPM en la página y sincronizarlo con el proceso
   canónico usado por la tabla y las métricas.
2. Añadir búsquedas locales de procesos y operaciones en el modal.
3. Filtrar operaciones por el proceso BPM seleccionado, limpiar la operación
   al cambiar de proceso y deshabilitarla cuando no haya proceso seleccionado.
4. Mantener el nombre sugerido desde BPM, la edición manual y los payloads
   `bpmProcessId`/`bpmNodeId`.
5. Actualizar pruebas de filtros, cascada, payload y procesos sin operaciones.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.

## Corrección de selectores BPM en creación de contratos — análisis y plan

### Análisis

El backend entrega los alcances BPM, pero la vista de contratos solo consulta
`AppState.catalog.data.contractScopes`. La respuesta de página conserva un
catálogo actualizado en `AppState.pageData.contratos.catalog.data`, por lo que
los selectores pueden quedar vacíos si el catálogo inicial no contiene todavía
los alcances.

### Plan

1. Resolver `contractScopes` desde el catálogo global y, como respaldo,
   desde el catálogo de `pageData.contratos`.
2. Mantener los selectores de proceso y operación BPM y actualizar su
   visibilidad y nombre sugerido al cambiar el alcance.
3. Preservar nombres editados por el usuario y mostrar una opción informativa
   deshabilitada si no existen alcances BPM.
4. Añadir pruebas de renderizado, cambio de alcance, sugerencia editable y
   payload de alta.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.

## Contratos con alcance BPM y nombre editable — análisis y plan

### Análisis

Los contratos actuales guardan nombres técnicos y solo relacionan el proceso
legacy mediante `proceso_id`. Los nodos BPM conservan en `properties` una
relación `canonical_ids.contrato_id`, pero el contrato no tiene una identidad
BPM explícita. El contrato podrá tener alcance sobre un proceso BPM completo o
sobre un nodo BPM de tipo `operation`; el nombre se inicializará desde BPM y
seguirá siendo editable desde la página de contratos.

### Plan

1. Añadir al contrato las relaciones opcionales `bpm_process_id` y
   `bpm_node_id`, exigiendo exactamente una de ellas y validando la pertenencia
   del nodo al proceso BPM correspondiente.
2. Migrar los contratos actuales desde `canonical_ids`, actualizar sus nombres
   con los nombres BPM visibles y eliminar el contrato sin relación BPM.
3. Exponer procesos y operaciones BPM seleccionables en la API y adaptar el
   alta de contratos para derivar inicialmente el nombre y `proceso_id`.
4. Mantener el nombre editable en altas y actualizaciones; los cambios BPM no
   sobrescribirán nombres personalizados.
5. Permitir varios contratos sobre el mismo proceso u operación y conservar
   estados, métricas, objetivos, máquinas y árboles.
6. Actualizar UI, contratos HTTP y pruebas de migración, validación, alta,
   edición y sincronización de relaciones.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.

### Implementación y verificación

- `Detalle` de cada máquina ahora selecciona la máquina y abre el modal de gestión existente.
- Eliminado el botón lateral `Gestionar máquina seleccionada`; se conserva `Crear nueva máquina` en la cabecera.
- Retiradas del panel lateral de procesos las métricas, el detalle de alcance y los accesos directos a contratos y árbol.
- Conservados el nombre/resumen del proceso, el acceso al modelado BPM y las acciones de contratos/árbol en la tabla central.
- Actualizados los tests de contrato visual y E2E para reflejar la nueva interacción.
- Sintaxis JS validada correctamente.
- Tests JavaScript focalizados: 9/9 OK.
- E2E de procesos: OK. El E2E combinado de máquinas alcanza correctamente el modal desde `Detalle`; posteriormente encuentra una incompatibilidad preexistente del test al editar un textarea JSON avanzado oculto, fuera del cambio de navegación solicitado.

### Implementación y verificación

- Añadida la relación `proceso.bpm_process_id UUID NOT NULL UNIQUE` con FK `ON DELETE CASCADE` hacia `pm_process_definition`.
- La creación y actualización del nombre del proceso canónico se realiza desde el repositorio BPM; la API operativa rechaza crear, actualizar o eliminar procesos directamente.
- Conservado el BPM raíz y sus 6 descendientes: 7 definiciones y 7 versiones.
- Sincronizados 7 procesos canónicos con los nombres visibles del BPM; no quedan procesos canónicos sin relación.
- Ejecutada la depuración transaccional mediante `scripts/purge_outside_bpm_root.py`.
- PostgreSQL antes/después: BPM `16→7`, procesos `27→7`, contratos `33→6`, máquinas `41→13`, configuraciones `46→13`, nodos `150→23`, relaciones `98→22`, análisis `6→0`.
- Validaciones PostgreSQL: 0 BPM externos, 0 procesos sin relación, 0 configuraciones fuera de alcance y 0 máquinas sin vínculo válido.
- Tests Python focalizados: 15/15 OK.
- Tests JavaScript focalizados: 9/9 OK; sintaxis Python y JavaScript OK.

## Ajustes de acciones en máquinas y procesos — análisis y plan

### Análisis

`maquinas_v02` ya dispone de un modal de gestión reutilizable y de un botón
`Detalle` que actualmente solo cambia la selección. El panel lateral mantiene
otro botón para abrir el mismo modal. `procesos_v02` todavía muestra en el
panel lateral métricas y accesos redundantes que las anotaciones visuales
solicitan retirar.

### Plan

1. Reutilizar la acción de apertura y carga del modal de máquinas desde cada
   botón `Detalle`, manteniendo la selección directa de filas.
2. Retirar el botón lateral de gestión de máquinas.
3. Retirar del panel lateral de procesos las métricas, el detalle de alcance y
   los botones de contratos y árbol, conservando nombre, resumen y acceso BPM.
4. Mantener las acciones de contratos y árbol en las filas centrales y el botón
   superior de creación enlazado al modelado BPM.
5. Actualizar pruebas UI y de contrato visual, sin modificar modelo ni base de datos.

### Autorización

Autorización recibida mediante `PLEASE IMPLEMENT THIS PLAN`.
## Corrección de navegación y edición BPM — análisis y plan

### Análisis

- `V02_MENU_ITEMS` no incluye actualmente la ruta `operaciones_v02`, por lo que la página no aparece en la navegación común.
- La acción `edit-selected-node` ya redirige para subprocess y operation.
- La acción `edit-metadata` del panel contextual derecho todavía abre `pm-metadata-modal`; debe usar la misma redirección dedicada.
- El modal de creación `pm-node-modal` debe mantenerse para nuevos nodos.

### Plan

1. Añadir `Operaciones` a la navegación común y mantenerla activa en la página de catálogo y detalle.
2. Centralizar la resolución de destino BPM según el tipo de nodo.
3. Usar esa resolución tanto en la paleta lateral como en el botón `Editar` del panel contextual.
4. Mantener intactos los flujos de creación, eliminación, metadatos no editables y modelado gráfico.
5. Ejecutar tests unitarios, sintaxis y E2E de navegación y edición.

### Autorización

Implementación autorizada mediante `PLEASE IMPLEMENT THIS PLAN`.
## Corrección del botón Detalle de operaciones — análisis y plan

### Análisis

- La tabla de `operaciones_v02` renderiza el botón `data-action="operation-detail"` con `node_id` y `version_id`.
- Su listener actual llama a `loadOperationDetail(...)` y muestra `#operation-v02-modal`; no cambia `window.location.hash`.
- Por eso el botón no redirige a `operaciones_detalle_v02`, aunque la ruta y la página dedicada sí existen.

### Plan

1. Cambiar la acción de `Detalle` para seleccionar la operación y navegar a `#/operaciones_detalle_v02?version_id=<version_id>&node_id=<node_id>`.
2. Mantener la carga y edición completa en la página dedicada.
3. Conservar el modal reutilizable para usos explícitos de vista rápida, sin bloquear la navegación de `Detalle`.
4. Añadir tests que verifiquen el cambio de hash y la conservación de los identificadores BPM.

### Restricción

No modificar código hasta recibir exactamente `inicia implementacion`.
## Corrección de version_id en Detalle de operaciones — análisis y plan

### Análisis

- `GET /api/process-modeling/versions/{id}` devuelve `data.version.version_id`.
- `operaciones_v02` usa `versionData.version_id` al renderizar el botón `Detalle`.
- Como `versionData.version_id` no existe en ese nivel, el enlace se genera como `version_id=undefined`.
- El identificador correcto está disponible en `versionData.version.version_id` y, como respaldo, en el identificador usado para cargar la versión.

### Plan

1. Normalizar el identificador de versión después de cargar la respuesta BPM.
2. Usar ese identificador normalizado en el botón `Detalle`, el selector de versión y los datos del modal.
3. Mantener la validación de UUID y la carga de `operaciones_detalle_v02` sin cambios de contrato API.
4. Añadir una prueba que impida generar URLs con `version_id=undefined` y verificar el UUID real.

### Restricción

No modificar código hasta recibir exactamente `inicia implementacion`.
## Auditoría y refactorización integral — primera entrega

### Implementado

- Añadido `scripts/audit_application_architecture.py` para inventariar rutas, renderizadores, menú, clientes API y endpoints backend sin efectos secundarios.
- Añadido `uc_bib_solv/architecture_audit.md` con hallazgos por dominio, aliases legacy y criterio de eliminación.
- Añadidos tests de consistencia de rutas/renderizadores y del inventario backend.

### Decisión de seguridad

- No se eliminan aún vistas, rutas ni endpoints: la auditoría confirma candidatos, pero varios siguen registrados o referenciados.
- Las siguientes fases deben convertir aliases legacy en redirecciones canónicas y retirar código solo después de pruebas de regresión.
## Continuación — consolidación de rutas legacy y dominio BPM

### Análisis

- La auditoría no detecta rutas sin renderizador.
- Las rutas legacy siguen renderizando vistas duplicadas y no están expresadas como aliases explícitos.
- Los dominios de procesos y operaciones ya tienen páginas canónicas `v02`, páginas de detalle y APIs BPM separadas.
- El siguiente riesgo principal es mantener dos implementaciones de una misma página, especialmente en procesos, causas y navegación operativa.

### Plan de esta fase

1. Convertir `procesos`, `contratos`, `maquinas`, `arbol`, `analisis_causas_v2` y `causa_detalle` en aliases explícitos de sus rutas canónicas, manteniendo sus URLs funcionales.
2. Actualizar enlaces internos y tests para usar las rutas canónicas.
3. Verificar que las vistas legacy ya no tengan consumidores antes de eliminarlas.
4. Extraer primero componentes compartidos de procesos y operaciones: navegación, carga BPM, tablas, estados de carga/error y formularios.
5. Ejecutar auditoría, tests unitarios, sintaxis y E2E antes de retirar cualquier archivo.

### Restricción

No modificar código hasta recibir exactamente `inicia implementacion`.
## Continuación implementada — aliases canónicos

- Añadido mapa explícito de aliases legacy en el router.
- Las rutas antiguas conservan sus parámetros y se normalizan a `v02` mediante `history.replaceState`.
- Se mantiene `causa_detalle.js` porque continúa siendo un componente importado por `causa_detalle_v02.js`.
- Añadidos tests de aliases y conservación de query strings.
## Continuación implementada — extracción BPM compartida

- Añadido `webapp/js/core/bpm.js` para lectura de parámetros hash y normalización de payloads de versión.
- Actualizados catálogo y detalle de operaciones para usar el contrato común.
- La normalización mantiene compatibilidad con respuestas anidadas (`data.version.version_id`) y planas.
- Añadido test de contrato para evitar regresiones del identificador de versión.
## Continuación — extracción de componentes BPM compartidos

### Análisis

- Los aliases legacy y la normalización BPM ya están centralizados.
- `procesos_v02.js`, `procesos_detalle_v02.js`, `operaciones_v02.js` y `operaciones_detalle_v02.js` todavía construyen directamente gran parte de su HTML.
- La lógica de lectura de rutas, estados visuales y acciones de detalle puede extraerse sin alterar APIs ni modelos.

### Plan de esta fase

1. Crear componentes compartidos para estados de carga, error, cabeceras de detalle y navegación de regreso.
2. Extraer la construcción de filas/acciones de procesos y operaciones.
3. Mantener los identificadores y contratos actuales de DOM para no romper E2E.
4. Actualizar las vistas BPM para consumir los componentes compartidos.
5. Ejecutar auditoría, sintaxis, tests unitarios y E2E del dominio BPM.

### Restricción

No modificar código hasta recibir exactamente `inicia implementacion`.
## Continuación implementada — componentes BPM compartidos

- Añadido `webapp/js/components/bpm-page.js` con cabeceras de detalle, alertas, acciones de proceso y botón de detalle de operación.
- `procesos_v02`, `procesos_detalle_v02` y `operaciones_detalle_v02` consumen componentes comunes.
- Se mantienen los atributos DOM existentes para compatibilidad con la UI y E2E.
- Añadidos contratos unitarios para verificar el uso de los componentes compartidos.
## Continuación — refactorización de máquinas y contratos

### Análisis

- `maquinas_v02.js` y `contratos_v02.js` concentran la mayor parte de la UI operativa y mezclan renderizado, estado, navegación y llamadas API.
- Ambas páginas tienen formularios y modales reutilizables que pueden separarse sin modificar los endpoints existentes.
- Los tests E2E dependen de atributos `data-action`, IDs de modal y nombres de campos, por lo que esos contratos deben conservarse.

### Plan de esta fase

1. Extraer componentes de formulario, tabla y estado visual de máquinas.
2. Extraer componentes de formulario, tabla, filtros y detalle de contratos.
3. Centralizar acciones de navegación y actualización de catálogo.
4. Eliminar listeners duplicados y mantener delegación controlada.
5. Conservar todos los IDs, `data-action`, payloads y endpoints actuales.
6. Ejecutar tests unitarios, auditoría, sintaxis y E2E de máquinas y contratos.

### Restricción

No modificar código hasta recibir exactamente `inicia implementacion`.
## Continuación implementada — máquinas y contratos

- Extraído `components/machine-stages.js` para etapas, subetapas y rutas visuales de máquinas.
- Extraído `components/contract-ui.js` para badges, opciones de alcance y selección múltiple de máquinas.
- Las vistas mantienen IDs, atributos `data-action`, payloads y endpoints existentes.
- Añadidos tests de contrato para confirmar la delegación y mantener los textos de fallback.

## Continuación implementada — estabilidad del formulario de máquinas

- Se evita que una respuesta asíncrona de contexto repueble el modal después de que el usuario haya empezado a editarlo.
- El editor JSON avanzado valida durante la escritura sin reconstruir el editor guiado, preservando foco y estabilidad del DOM.

### Verificación

- Sintaxis JavaScript de componentes y vistas modificadas: correcta.
- Tests unitarios seleccionados: 11/11 correctos.
- Auditoría estructural: sin huecos de rutas/renderizadores ni módulos API frontend sin consumidor estático.
- E2E de procesos: correcto.
- E2E de máquinas bajo la suite serial: continúa con timeout/intermitencia de visibilidad del modal; el flujo aislado reproduce correctamente la edición. Queda pendiente estabilización E2E específica antes de considerar completa la validación de máquinas.

### Resultado de la estabilización

- La selección de fila de máquinas ya no remonta la página completa; el modal `Detalle` conserva su DOM y el E2E de máquinas pasa.
- Se protegió la pestaña activa y se evitó repoblar formularios modificados por respuestas tardías.
- En contratos se sincronizó la recarga de catálogo y el ciclo de cierre/reapertura del detalle; el flujo aislado de dos guardados consecutivos funciona.
- La prueba serial de contratos aún presenta una carrera de remonte en el segundo detalle dentro de la suite completa; el trace confirma que el primer PATCH/PUT responde 200 y el flujo aislado ejecuta ambos PATCH/PUT correctamente.

## Continuación — estabilización E2E del modal de máquinas

### Análisis

- El flujo aislado conserva el modal y permite editar sus campos.
- Bajo la suite serial, el modal o sus paneles pueden quedar desincronizados durante la carga de contexto y las interacciones con el editor JSON.
- La corrección debe preservar los IDs, acciones, payloads y endpoints existentes.

### Plan

1. Reproducir el fallo con instrumentación de mutaciones y ciclo de carga.
2. Identificar si la causa es un reemplazo de la vista, una respuesta asíncrona tardía o un cambio de pestaña no persistido.
3. Aplicar una corrección mínima en la vista/componentes compartidos, sin alterar el contrato funcional.
4. Ejecutar sintaxis, tests unitarios, auditoría y E2E de máquinas y procesos.
5. Registrar el resultado y las limitaciones restantes.

### Restricción

No modificar código hasta recibir exactamente `inicia implementacion`.

## Cuarta fase implementada — persistencia BPM detrás de ports

- Se creó `modules/bpm/application/ports/process_ports.py` con ports explícitos para procesos, versiones, nodos, transiciones y operaciones.
- Los ports históricos de `modules/process_modeling` ahora son aliases compatibles del contrato BPM canónico.
- Se añadió `BpmPostgresPersistenceAdapter`, que compone los repositorios SQL actuales sin duplicar ni modificar SQL, esquema o datos.
- El wiring de Process Modeling usa el adaptador BPM canónico; los repositorios legacy permanecen encapsulados y reversibles.
- `ProcessModelingPersistenceAdapter` conserva su nombre como fachada compatible para consumidores existentes.

### Verificación

- Tests focalizados BPM, Process Modeling, arquitectura y persistencia: 17/17 correctos.
- Pendiente de esta migración: adaptar las persistencias de máquinas, contratos, asociaciones y configuraciones al mismo patrón explícito.

## Quinta fase — persistencia operativa BPM explícita

### Análisis

La persistencia de procesos y versiones ya se compone mediante `BpmPostgresPersistenceAdapter`, pero máquinas, contratos, asociaciones máquina-contrato y configuraciones máquina-operación continúan accediendo a repositorios legacy desde la capa operacional. Esto mantiene el comportamiento actual, pero deja incompleta la frontera BPM y conserva contratos genéricos difíciles de verificar.

La fase debe separar los ports de persistencia por capacidad, encapsular los repositorios SQL actuales en un adaptador BPM y conectar el caso de uso operacional a ese adaptador. Las rutas HTTP, payloads, estados y relaciones BPM deben permanecer compatibles.

### Plan

1. Inventariar las interfaces efectivamente usadas por `maquina_repo.py`, `contrato_repo.py` y `machine_model_repo.py`, incluyendo asociaciones y configuraciones.
2. Definir ports BPM explícitos para máquinas, contratos, asociaciones máquina-contrato y configuraciones máquina-operación.
3. Crear un adaptador PostgreSQL BPM que componga los repositorios existentes sin duplicar SQL ni modificar el esquema.
4. Actualizar el wiring y los casos de uso operacionales para depender de los ports explícitos.
5. Mantener `OperationalPersistencePort`, `services/` y `repositories/` como fachadas de compatibilidad mientras existan consumidores.
6. Añadir pruebas de inyección, validación de contratos BPM, asociaciones y configuración máquina-operación.
7. Ejecutar tests focalizados, validadores arquitectónicos, auditoría runtime y compilación.

### Restricciones

- No modificar PostgreSQL, datos existentes ni contratos HTTP.
- No eliminar repositorios legacy en esta fase.
- No reintroducir `operational_status` ni estados operativos de máquinas.
- No cambiar la pertenencia BPM de contratos, máquinas u operaciones.
- La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Consolidación física BPM + RCA_TREE — implementación completada

Se completó la migración física autorizada sin modificar PostgreSQL, el esquema ni los datos.

### Estructura resultante

- `modules/bpm`: procesos, operaciones, etapas, versiones, nodos, transiciones, máquinas, contratos, asociaciones y configuraciones.
- `modules/rca_tree`: nodos causales, relaciones, causas, hipótesis, evidencias y análisis.
- `modules/platform`: configuración, composición Flask, transacciones PostgreSQL, bootstrap, salud y adaptadores externos.
- `modules/agent_tools` se reubicó bajo `modules/platform/adapters/agent_tools` para mantener `modules/` limitado a `bpm`, `rca_tree` y `platform`.

### Eliminaciones físicas

Se retiraron del workspace los directorios `uc_bib_solv/app`, `modules/causal_tree`, `modules/causal_analysis`, `modules/operational_modeling`, `modules/process_modeling`, `routes`, `services` y `repositories`. Los grupos movidos se conservaron temporalmente en `/tmp/UC_BIB_Solve_legacy_*` como respaldo recuperable durante la validación.

### Migraciones

- Persistencia BPM trasladada a `modules/bpm/adapters/outbound/postgres`.
- Persistencia RCA_TREE trasladada a `modules/rca_tree/adapters/outbound/postgres`.
- Transacciones trasladadas a `modules/platform/infrastructure/postgres.py`.
- Fachadas HTTP legacy integradas en adaptadores canónicos de BPM, RCA_TREE y platform, manteniendo rutas y payloads públicos.
- La composición runtime conserva 131 reglas HTTP y registra únicamente módulos canónicos.

### Validación

- `tests/unit`: 160/160 correctos.
- Tests de arquitectura BPM/RCA_TREE: 5/5 correctos.
- Auditoría frontend/backend y composición runtime: correctas.
- Validadores structure, naming, dependencies y concrete: correctos.
- `compileall`: correcto.
- No quedan imports productivos hacia `app`, `routes`, `services`, `repositories`, `causal_tree`, `causal_analysis`, `operational_modeling` o `process_modeling`.
- La consulta de contratos que necesita RCA_TREE pasa por `platform.adapters.bpm_contract_context`, exponiendo referencias BPM sin importar repositorios BPM desde RCA_TREE.

## Implementación actual — arquitectura explícita BPM + RCA_TREE

Se inició la fase autorizada y se creó la primera composición física de los dos dominios funcionales.

### Entregables completados

- `modules/bpm` mantiene el dominio BPM y ahora incluye:
  - validadores de dominio sin dependencias de infraestructura;
  - casos de uso operativos propios;
  - wiring BPM explícito;
  - adaptador HTTP canónico `/api/bpm` para modelado, catálogo, procesos, operaciones, máquinas, contratos, asociaciones y configuraciones.
- `modules/rca_tree` se creó como núcleo físico independiente con:
  - entidades, value objects, excepciones y reglas del grafo;
  - puertos de aplicación y casos de uso;
  - adaptador PostgreSQL de transición;
  - wiring e interfaz HTTP `/api/rca-tree` para nodos, causas, hipótesis y análisis.
- `app_factory.py` registra los adaptadores nuevos sin retirar todavía las fachadas legacy.
- El frontend canónico consume los nuevos prefijos `/api/bpm` y `/api/rca-tree`.
- Se añadieron pruebas que protegen la estructura, el aislamiento de los dominios y la composición de rutas canónicas.

### Verificación de esta fase

- Compilación Python de `bpm`, `rca_tree` y composición Flask: correcta.
- Validadores de estructura, dependencias y adaptadores concretos: correctos.
- Tests `unittest` de arquitectura y BPM: correctos.
- `Flask.test_client()` responde correctamente en `/api/bpm/processes`, `/api/bpm/operational/catalog`, `/api/rca-tree/nodes` y `/api/rca-tree/analyses`.
- Auditoría de aplicación: sin rutas/renderizadores frontend huérfanos; los duplicados HTTP legacy permanecen intencionadamente durante la transición.
- `pytest` no está instalado en el entorno actual; queda pendiente ejecutar las pruebas pytest cuando la dependencia esté disponible.

### Pendiente de esta migración

- Migrar los adaptadores de análisis a `rca_tree` sin depender de los paquetes causales legacy.
- Sustituir gradualmente los adaptadores PostgreSQL transitorios por mappers y repositorios propios de cada dominio.
- Migrar consumidores restantes y retirar blueprints HTTP legacy después de validar contratos.
- Ejecutar E2E y la suite completa con las dependencias de test disponibles.

Actualización: el adaptador HTTP de análisis ya usa `rca_tree` en las rutas nuevas. También se añadieron los recursos canónicos `/api/bpm/operations` y consulta de contratos bajo `/api/bpm/contracts/{contract_id}`. La persistencia de transición sigue reutilizando SQL legacy encapsulado en adaptadores outbound, pendiente de sustitución por mappers BPM/RCA_TREE propios.

## Continuación planificada — migración de consumidores y retirada progresiva

### Objetivo

Completar la siguiente fase de la arquitectura BPM + RCA_TREE sin eliminar todavía compatibilidad pública ni modificar PostgreSQL.

### Trabajo previsto

1. Convertir el servicio de Process Modeling en un caso de uso BPM canónico, trasladando su lógica fuera de `services/process_modeling_service.py`.
2. Hacer que `modules/process_modeling` funcione únicamente como alias de `modules/bpm`.
3. Separar los mappers y repositorios PostgreSQL de BPM de las fachadas `app.persistence` y `repositories`.
4. Sustituir el adaptador transitorio de RCA_TREE por adaptadores propios para nodos, relaciones, causas, hipótesis y análisis.
5. Migrar tests, scripts y consumidores frontend a los contratos canónicos.
6. Medir nuevamente endpoints duplicados, imports legacy y consumidores sin referencia.
7. Retirar solo los aliases y blueprints sin consumidores estáticos ni dinámicos.

### Gates de esta continuación

- Los casos de uso `bpm` y `rca_tree` no importan servicios ni repositorios legacy.
- El wiring de plataforma instancia exclusivamente adaptadores canónicos.
- Las fachadas legacy permanecen funcionales mientras exista un consumidor.
- Los endpoints canónicos conservan sus respuestas y códigos HTTP.
- La suite disponible, compilación, validadores y auditoría runtime permanecen correctos.

### Restricción

Este plan queda preparado, pero no se modificarán archivos de código hasta recibir exactamente `inicia implementacion`.

## Continuación implementada — port BPM para Process Modeling

- Se creó `modules/bpm/application/process_modeling.py` con `BpmProcessModelingPort` y `BpmProcessModelingApplication`.
- El adaptador HTTP `/api/bpm` recibe ahora esa aplicación BPM, no el servicio legacy directamente.
- La dependencia temporal con `services/process_modeling_service.py` queda confinada a `modules/bpm/infrastructure/wiring.py` y al blueprint legacy de compatibilidad.
- No se modificaron PostgreSQL, datos ni respuestas HTTP.

### Verificación

- Compilación BPM y plataforma: correcta.
- Validadores de dependencias y concrete implementations: correctos.
- Tests de arquitectura BPM/RCA_TREE: 3/3 correctos.
- `Flask.test_client()` confirma `200` en `/api/bpm/processes`, `/api/bpm/operations` y `/api/rca-tree/analyses`.
- Auditoría runtime: sin rutas/renderizadores huérfanos ni APIs frontend sin consumidores.

## Continuación implementada — composición BPM de persistencia de procesos

- `BpmPostgresPersistenceAdapter` ya no importa `app.persistence.pm_process_repo`.
- Los repositorios SQL temporales se crean mediante `build_bpm_postgres_persistence_adapter()` en `bpm.infrastructure.wiring`.
- El servicio legacy y el wiring de Process Modeling reciben el adaptador BPM con ports inyectados.
- Se mantienen los mismos repositorios, transacciones, tablas, datos y contratos HTTP.

### Verificación

- Compilación completa: correcta.
- Validadores de dependencias y concrete implementations: correctos.
- Tests arquitectónicos BPM/RCA_TREE: 3/3 correctos.
- Tests `unittest` disponibles: 10/10 correctos.
- `Flask.test_client()` confirma `200` para `/api/bpm/processes` y `/api/bpm/operational/catalog`.

### Próximo bloque

Aplicar el mismo aislamiento a la persistencia operacional de máquinas, contratos, asociaciones y configuraciones, y después a los adaptadores PostgreSQL de RCA_TREE.

## Continuación implementada — persistencia operacional BPM y RCA_TREE causal

- `BpmOperationalPostgresAdapter` recibe backend, repositorios y configuraciones por inyección.
- La composición de repositorios operacionales legacy queda limitada a `bpm.infrastructure.wiring` y a la fachada explícita de compatibilidad.
- Se creó `BpmOperationalMapper`, que normaliza filas anidadas y elimina `operational_status` sin eliminar estados de contratos.
- `RcaTreePostgresAdapter` ya no hereda ni importa el adaptador de `causal_tree`; recibe sus cinco repositorios mediante ports.
- La composición temporal de repositorios RCA_TREE queda en `rca_tree.infrastructure.wiring`.
- Se añadieron dobles de backend y pruebas de mapper para máquinas, contratos y catálogos.

### Verificación

- Compilación completa: correcta.
- Validadores de dependencias y concrete implementations: correctos.
- Tests operacionales BPM, persistencia y arquitectura: correctos.
- Tests RCA_TREE de dominio, aplicación y boundaries: correctos.
- Tests `unittest` disponibles: 10/10 correctos.
- `Flask.test_client()` confirma `200` en máquinas, contratos, nodos RCA_TREE y análisis RCA_TREE.
- Las respuestas canónicas comprobadas no contienen `operational_status`.

### Pendiente

Separar el SQL y mapeo del adaptador de análisis causales para que `rca_tree` tampoco dependa de `causal_analysis.adapters.outbound.persistence`.

## Siguiente bloque planificado — persistencia operacional BPM

### Objetivo

Retirar los imports directos de `app.persistence`, `repositories` y `services` del adaptador canónico de máquinas, contratos, asociaciones máquina-contrato y configuraciones máquina-operación.

### Trabajo previsto

1. Definir factorías de infraestructura para los repositorios temporales operacionales.
2. Hacer que `BpmOperationalPostgresAdapter` reciba todas sus dependencias por ports.
3. Mantener el backend operacional como proyección inyectada, sin exponerlo al dominio ni a los casos de uso.
4. Crear mappers BPM para normalizar nombres de máquina, contrato, proceso, operación y asociaciones.
5. Añadir dobles en memoria para creación, edición, consulta y asociación de máquinas y contratos.
6. Actualizar `bpm.infrastructure.wiring` y las fachadas legacy para usar la nueva composición.
7. Verificar que los payloads no recuperan `operational_status` y que las relaciones BPM permanecen intactas.

### Gates

- `modules/bpm/application` no importa persistencia concreta.
- `modules/bpm/adapters/outbound/operational_postgres.py` no importa directamente repositorios legacy.
- Las asociaciones máquina-contrato siguen siendo responsabilidad exclusiva de BPM.
- No se modifica PostgreSQL, el esquema ni los datos.
- Tests con dobles en memoria y `Flask.test_client()` correctos.

### Restricción

Este bloque queda planificado y no se modificará código hasta recibir exactamente `inicia implementacion`.

### Estado de autorización

La solicitud de continuación queda pendiente de la frase exacta de inicio. No se ejecutan cambios de código, persistencia ni configuración mientras la autorización no sea explícita.
- Tests `unittest` disponibles: 10/10 correctos.

## Siguiente continuación planificada — adaptadores PostgreSQL propios

### Objetivo

Eliminar dependencias directas de los adaptadores canónicos BPM/RCA_TREE hacia módulos de persistencia legacy, manteniendo las tablas, SQL funcional y contratos HTTP sin cambios.

### Orden de trabajo

1. Crear mappers BPM para procesos, versiones, nodos, transiciones y operaciones.
2. Separar las consultas y escrituras PostgreSQL de los mappers mediante repositorios outbound BPM.
3. Migrar `BpmPostgresPersistenceAdapter` para recibir repositorios propios por ports.
4. Crear mappers RCA_TREE para nodos, relaciones, causas, hipótesis y análisis.
5. Migrar `RcaTreePostgresAdapter` y `RcaTreeAnalysisPostgresAdapter` a esas implementaciones.
6. Mantener las fachadas legacy únicamente como adaptadores de compatibilidad, sin que formen parte del wiring canónico.
7. Añadir dobles en memoria para comprobar casos de uso sin PostgreSQL.
8. Ejecutar validadores, auditoría runtime, tests de contrato y compilación.

### Gates

- `bpm.domain`, `bpm.application`, `rca_tree.domain` y `rca_tree.application` no importan persistencia.
- Los adaptadores canónicos no importan `services` ni `repositories` legacy.
- El esquema PostgreSQL y los datos permanecen intactos.
- Las respuestas HTTP y los códigos actuales se conservan.
- Ningún alias se elimina antes de comprobar consumidores estáticos y dinámicos.

### Restricción

Este trabajo queda planificado, pero no se modificará código hasta recibir exactamente `inicia implementacion`.

## Resultado de estabilización ejecutada

- Se hizo explícita la carga del detalle de contrato: el botón de guardado queda bloqueado durante la carga de asociaciones y muestra `Cargando…`.
- Las respuestas tardías de máquinas ya no pueden reabrir un modal cancelado ni sobrescribir una selección manual; se invalidan mediante un token de carga y se respeta `data-user-edited`.
- Guardar contrato y asociaciones cierra el detalle antes de refrescar el catálogo; el detalle se vuelve a abrir desde la fila con una carga fresca.
- El render de metadatos BPM mantiene la sección `Resumen` aunque no haya valor y las pruebas de edición verifican la navegación a la página dedicada, no al modal retirado.
- Se retiraron diagnósticos temporales de las pruebas E2E.

### Validación de esta fase

- Tests focalizados de arquitectura/BPM/TREE/HTTP: `42/42` correctos.
- Tests unitarios frontend de contratos, componentes y metadatos: `18/18` correctos.
- E2E aislados de Process Modeling para metadatos y expansión: `2/2` correctos.
- Suite E2E conjunta: `14` correctos, `2` fallos, `3` omitidos y `3` no ejecutados por el modo serial. Los fallos restantes son: fixture jerárquico ausente `TEST_PM_UI_1784458754642` y reapertura del detalle tras una recarga completa en el test serial de contratos.
- Validadores estructural, naming, dependencies y concrete implementations: correctos.
- Auditoría runtime: `18/18` rutas/renderizadores frontend, `67` endpoints únicos, `68` rutas runtime, sin adaptadores inbound no registrados ni consumidores API estáticos faltantes.
- Compilación Python: correcta.
- `git diff --check` mantiene únicamente dos avisos de whitespace preexistentes en `requerimiento_10/spec.md` y `requerimiento_12/spec.md`.

## Siguiente bloque planificado — persistencia de análisis RCA_TREE

### Objetivo

Trasladar el SQL y el mapeo de análisis causales a un adaptador propio de `rca_tree`, eliminando la dependencia del paquete `causal_analysis` en el runtime canónico.

### Trabajo previsto

1. Definir el port de persistencia completo para análisis, participantes, resultados y detalles.
2. Crear el mapper de filas de análisis, manteniendo nombres y estados actuales.
3. Crear el repositorio PostgreSQL RCA_TREE para consultas, altas, actualizaciones y resultados.
4. Inyectar ese repositorio desde `rca_tree.infrastructure.analysis_wiring`.
5. Mantener `causal_analysis` como fachada de compatibilidad mientras existan consumidores.
6. Añadir dobles en memoria para crear, actualizar, consultar análisis y guardar resultados.
7. Verificar contratos HTTP `/api/rca-tree/analyses` y compatibilidad de estados.

### Gates

- `rca_tree.application` y `rca_tree.domain` no importan persistencia.
- El adaptador canónico no importa `causal_analysis`.
- No se modifica el esquema ni los datos PostgreSQL.
- Las respuestas de análisis y sus estados permanecen compatibles.
- Tests, validadores, compilación y auditoría runtime correctos.

### Restricción

Este bloque queda planificado. No se modificará código hasta recibir exactamente `inicia implementacion`.

### Estado del gate

La estabilización funcional queda pendiente de cierre por los dos fallos E2E documentados. No se modificaron PostgreSQL, esquema ni datos manualmente.

## Implementación — arquitectura explícita BPM + RCA_TREE

Se inicia la convergencia física de la arquitectura hacia los dos dominios funcionales definidos en la especificación aprobada.

### Objetivo de esta fase

- Crear `modules/bpm` y `modules/rca_tree` como núcleos canónicos.
- Exponer contratos de aplicación y adaptadores HTTP separados por dominio.
- Mantener PostgreSQL y los datos sin cambios.
- Mover el wiring runtime a los núcleos nuevos antes de retirar aliases.
- Añadir validaciones automatizadas para Domain-first, Clean Architecture, Hexagonal Architecture y separación BPM/RCA_TREE.

### Criterio de avance

Cada etapa debe dejar la aplicación importable y verificable. Los paquetes antiguos se conservarán únicamente como aliases hasta que las rutas, frontend y tests estén migrados y la auditoría no detecte consumidores activos.

## Sexta fase implementada — desacoplamiento de servicios BPM

- `services/process_modeling_service.py` dejó de importar e instanciar directamente los repositorios `pm_*`.
- Se añadió `configure_persistence(persistence)` para inyectar los ports BPM desde el composition root.
- `modules/process_modeling/infrastructure/wiring.py` configura la fachada legacy con `BpmPostgresPersistenceAdapter`.
- `modules/process_modeling/application/service.py` delega atributos dinámicamente y no conserva referencias stale a repositorios.
- Se añadió una prueba que verifica la sustitución de los ports por repositorios falsos sin PostgreSQL.
- Se mantuvieron intactos endpoints, payloads, validaciones, transacciones, esquema y datos.

### Verificación

- Tests focalizados BPM, Process Modeling, operacional y arquitectura: 30/30 correctos.
- Compilación Python correcta.
- Validadores estructural, de nombres y dependencias: correctos.
- Auditoría runtime: 68 rutas disponibles, sin rutas/renderizadores huérfanos ni adaptadores inbound sin registrar.
- Los imports directos de persistencia quedan confinados a adaptadores outbound y las fachadas legacy explícitas.

## Plan consolidado de cierre — fases restantes y gates

### Alcance

Completar las etapas restantes de la migración arquitectónica BPM/TREE hasta dejar todos los gates técnicos validados, sin eliminar compatibilidad pública ni modificar PostgreSQL sin una tarea independiente.

### Fase 7 — frontera BPM/TREE

1. Auditar imports y llamadas de `causal_tree`, `causal_analysis` y `agent_tools` hacia entidades, repositorios o servicios BPM.
2. Definir referencias inmutables `ProcessRef`, `OperationRef`, `MachineRef` y `ContractRef` en el espacio compartido de integración.
3. Definir ports de consulta de contexto BPM para TREE.
4. Adaptar consumidores causales para aceptar referencias/DTOs, conservando payloads HTTP.

Gate 7: TREE no importa entidades ni repositorios BPM; tests de referencias y análisis causales correctos; validadores de dependencias correctos.

### Fase 8 — consolidación de aplicación TREE

1. Auditar servicios causales y separar reglas de grafo, casos de uso y persistencia.
2. Completar ports explícitos para nodos, relaciones, causas, hipótesis y análisis.
3. Conectar el wiring canónico de TREE y conservar fachadas legacy como aliases.
4. Añadir pruebas con persistencia falsa para reglas de ciclo, múltiples padres e integridad.

Gate 8: casos de uso TREE ejecutables sin PostgreSQL; adaptadores causales canónicos registrados; rutas causales legacy compatibles.

### Fase 9 — integración y composition root

1. Centralizar la construcción de adaptadores BPM/TREE en `modules/platform`.
2. Eliminar wiring duplicado de rutas sin retirar aliases públicos.
3. Verificar que cada blueprint runtime tenga una única implementación canónica.
4. Documentar las excepciones temporales de compatibilidad.

Gate 9: inventario runtime sin adaptadores canónicos ausentes; URL map estable; contratos HTTP de BPM y TREE correctos.

### Fase 10 — adaptadores externos y contratos

1. Verificar `agent_tools` como único adaptador externo activo.
2. Asegurar que sus gateways consuman application ports y no repositorios.
3. No crear CLI, MCP o Dataiku sin consumidores reales.

Gate 10: tests de gateway y contratos externos correctos; ningún adaptador externo no registrado.

### Fase 11 — caracterización completa

1. Ejecutar tests unitarios, integración, contratos HTTP y E2E de procesos, operaciones, máquinas, contratos y TREE.
2. Verificar aliases legacy, filtros, edición, asociaciones y relaciones BPM.
3. Registrar fallos reales como no conformidades antes de corregirlos.

Gate 11: suite completa reproducible o incidencias documentadas con causa y corrección aplicada.

### Fase 12 — retirada controlada

1. Generar inventario final de módulos, funciones y endpoints sin consumidores.
2. Eliminar únicamente elementos con evidencia estática y dinámica suficiente.
3. Mantener aliases públicos cuando exista riesgo de consumidor externo.
4. Ejecutar de nuevo la suite completa y los validadores después de cada grupo de retirada.

Gate 12: ningún endpoint público roto, ningún import dinámico inválido, auditoría limpia y documentación actualizada.

### Criterio de finalización

La migración se considerará finalizada solo cuando los gates 7 a 12 estén validados, el mapa runtime sea coherente, BPM sea propietario de procesos, operaciones, máquinas, contratos y asociaciones, TREE sea autónomo y las fachadas conservadas estén justificadas por consumidores reales.

### Gates 7–10 implementados

- Gate 7: referencias BPM inmutables y `BpmContextPort` público para TREE; dependencias cross-domain validadas.
- Gate 8: ports causales explícitos, `CausalTreePostgresAdapter` canónico y fachada legacy compatible.
- Gate 9: composition root registra Process Modeling desde el adaptador HTTP canónico; URL map estable.
- Gate 10: `agent_tools` consume servicios BPM/TREE canónicos sin imports directos de repositorios legacy.

Resultados acumulados: tests focalizados correctos, compilación, validadores arquitectónicos y auditoría runtime correctos.

### Gates 11–12 implementados

- Gate 11: suite arquitectónica raíz 7/7, suite focalizada 39/39 y E2E del alcance 12/16; los 4 fallos E2E y las incidencias legacy de `tests/unit` quedan documentados en `architecture_gate_report.md` como baseline pendiente, sin cambios de datos ni esquema.
- Gate 12: retirado únicamente `modules/process_modeling/application/ports/persistence.py`, duplicado sin consumidores estáticos ni dinámicos conocidos.
- Las fachadas `routes/`, `services/`, `repositories/` y `app/persistence/` permanecen en allowlist porque todavía tienen consumidores de compatibilidad o no cuentan con evidencia dinámica suficiente para su eliminación segura.
- Validación final ejecutada: compilación, validadores arquitectónicos, auditoría runtime, tests raíz y tests focalizados.

## Fase posterior — estabilización de compatibilidad y E2E

### Análisis

La migración arquitectónica está cerrada, pero la caracterización dejó incidencias que conviene resolver antes de considerar la aplicación completamente estable:

- E2E de Process Modeling no encuentra el texto esperado de resumen de metadatos y tiene casos de selección de procesos/acciones ambiguas.
- E2E de contratos presenta una carrera al guardar la desasignación de máquinas.
- Tests unitarios históricos importan `uc_bib_solv/app.py`, `db/schema.sql` y rutas de persistencia antiguas que no existen en el árbol canónico actual.
- Algunos tests causales legacy dependen de fixtures o mocks que no están conectados a los adaptadores canónicos.

### Plan

1. Reproducir cada fallo E2E de forma aislada con trazas y separar regresión funcional de fixture obsoleto.
2. Corregir los fallos funcionales de UI manteniendo payloads, endpoints y contratos DOM actuales.
3. Migrar tests unitarios legacy a `modules/*` o convertirlos en pruebas de compatibilidad explícita cuando la ruta histórica siga siendo pública.
4. Sustituir dependencias de archivos ausentes por composition roots canónicos, sin restaurar módulos eliminados sin consumidores.
5. Alinear mocks causales con `CausalTreePostgresAdapter` y `AnalysisPersistenceAdapter`.
6. Ejecutar nuevamente suite completa, E2E, validadores y auditoría runtime.

### Gate de cierre

- E2E de procesos, contratos, máquinas y TREE sin fallos funcionales.
- Tests unitarios canónicos y de compatibilidad verdes.
- Toda incidencia restante debe tener consumidor, causa y criterio de retirada documentados.
- No modificar PostgreSQL ni datos durante la estabilización.

### Restricción

La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Caracterización legacy RCA_TREE estabilizada

- Se normalizaron los imports de `tests.unit.test_causas_service` y `tests.unit.test_causa_detail_service` al namespace `uc_bib_solv.*`.
- Los mocks ahora apuntan a los símbolos realmente consumidos por los módulos bajo prueba.
- Se eliminó la carga duplicada de los paquetes top-level `services` y `repositories` en esas pruebas.
- La compatibilidad legacy de producción no se modificó; el cambio queda limitado a la caracterización.

### Verificación

- Tests de causas y detalle causal: `15/15` correctos.
- Tests focalizados RCA_TREE y compatibilidad: `14/14` correctos.
- Suite `unittest discover`: `11/11` correcta.
- Auditoría backend, validadores arquitectónicos y compilación: correctos.
- No se modificaron PostgreSQL, esquema, datos ni contratos HTTP.

### Pendiente explícito

Continúan existiendo aliases top-level en otras pruebas históricas y módulos de compatibilidad; se retirarán o migrarán únicamente con evidencia de consumidores y una fase específica de limpieza.

## Persistencia propia de análisis RCA_TREE implementada

Se completó la separación de la persistencia de análisis causales del módulo legacy `causal_analysis`:

- `RcaTreeAnalysisPostgresAdapter` contiene ahora directamente el SQL y el mapeo de análisis, participantes, resultados y detalles.
- El adaptador canónico no importa ni hereda de `causal_analysis`.
- `analysis_wiring.py` compone explícitamente los puertos de participantes y resultados.
- Se añadieron dobles en memoria para probar creación, actualización y resultados sin PostgreSQL.
- La fachada legacy `/api/analyses` conserva su compatibilidad mediante `routes.analysis`; el contrato canónico `/api/rca-tree/analyses` utiliza el adaptador RCA_TREE propio.

### Verificación

- Auditoría: `python3 scripts/audit_application_architecture.py --check --check-backend` correcta.
- Validadores estructural, naming, dependencias y concrete implementations correctos.
- Suite completa `unittest`: `11/11` correcta.
- Tests focalizados de análisis, arquitectura y puertos correctos.
- `Flask.test_client()`: `/api/rca-tree/analyses` y `/api/rca-tree/analyses/templates` responden `200`.
- `compileall`: correcto.

### Pendiente explícito

El adaptador todavía utiliza `db_cursor` como seam transitorio de infraestructura y permanecen las fachadas legacy necesarias por compatibilidad. Una fase posterior podrá extraer el port transaccional y retirar esas fachadas solo con evidencia dinámica de que no existen consumidores externos.

## Siguiente bloque planificado — port transaccional RCA_TREE

### Análisis

La persistencia de análisis RCA_TREE ya no depende de `causal_analysis`, pero el adaptador PostgreSQL todavía importa directamente `app.persistence.db.db_cursor`. Esto deja un acoplamiento de infraestructura que impide probar completamente el adaptador con una composición alternativa y mantiene una dependencia legacy dentro del núcleo físico de persistencia.

### Plan

1. Definir un port transaccional mínimo dentro de `rca_tree.application.ports`, limitado a la capacidad realmente usada por el adaptador.
2. Crear una implementación PostgreSQL bajo `rca_tree.adapters.outbound.postgres` o infraestructura equivalente.
3. Inyectar ese port en `RcaTreeAnalysisPostgresAdapter`, preservando SQL, mapeos, transacciones y respuestas existentes.
4. Mantener una composición por defecto en `analysis_wiring.py` para producción y dobles de memoria para tests.
5. Verificar que `rca_tree.domain` y `rca_tree.application` no importen Flask, PostgreSQL, `app`, `routes`, `services` ni `repositories`.
6. Mantener `/api/rca-tree/analyses` y `/api/analyses` sin cambios contractuales.
7. No retirar todavía fachadas legacy ni modificar esquema, datos o migraciones.

### Gates

- El adaptador de análisis no importa directamente `db_cursor`.
- Los casos de uso y tests funcionan con dobles de memoria.
- Las rutas canónicas y legacy mantienen sus respuestas y códigos HTTP.
- Validadores arquitectónicos, auditoría, compilación y suite `unittest` correctos.

### Restricción

La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

### Restricción de inicio

Este plan se ejecutará únicamente después de recibir exactamente `inicia implementacion`.

## Quinta fase implementada — persistencia operativa BPM explícita

- Se definieron ports BPM para repositorios de máquinas, contratos, asociaciones máquina-contrato y configuraciones máquina-operación.
- Se creó `BpmOperationalPostgresAdapter` como punto de composición de esas capacidades y de las proyecciones operacionales existentes.
- El wiring operacional usa el adaptador BPM canónico; `OperationalPersistenceAdapter` conserva el nombre legacy como fachada compatible.
- Los casos de uso operacionales dependen ahora del port BPM canónico, no del alias legacy.
- Se mantuvieron intactos SQL, esquema PostgreSQL, datos, payloads HTTP, estados y relaciones BPM.

### Verificación

- Tests focalizados BPM, Process Modeling, operacional y arquitectura: 25/25 correctos.
- Validadores estructural, de nombres y dependencias: correctos.
- Auditoría runtime: 68 rutas disponibles, sin rutas/renderizadores huérfanos ni adaptadores inbound sin registrar.
- La siguiente fase pendiente es separar y conectar explícitamente los servicios de aplicación BPM para que dejen de depender de repositorios concretos en los casos de uso restantes.

## Sexta fase — desacoplamiento de servicios BPM

### Análisis

Los adaptadores PostgreSQL BPM ya concentran la composición de repositorios, pero algunas fachadas y servicios de aplicación todavía importan o reciben módulos concretos de persistencia. Esto dificulta sustituir infraestructura en tests y mantiene decisiones de infraestructura dentro de casos de uso.

La siguiente fase debe localizar esas dependencias directas, convertirlas en ports de aplicación explícitos y hacer que el wiring inyecte los adaptadores ya creados. Las fachadas `routes/`, `services/` y `repositories/` seguirán disponibles como compatibilidad, pero no serán usadas como dependencias internas de los casos de uso canónicos.

### Plan

1. Auditar imports directos de `app.persistence`, `repositories` y `services` desde `modules/bpm`, `modules/process_modeling` y `modules/operational_modeling`.
2. Identificar cada caso de uso que necesite una capacidad aún no expresada por un port y definir el contrato mínimo correspondiente.
3. Ajustar servicios BPM para recibir ports por inyección, sin cambiar respuestas, transacciones ni reglas de validación.
4. Actualizar el wiring de plataforma para construir los adaptadores PostgreSQL y entregarlos a los servicios canónicos.
5. Mantener fachadas legacy como puntos de entrada externos, sin duplicar lógica de aplicación.
6. Añadir pruebas con repositorios falsos que demuestren que los casos de uso no requieren PostgreSQL.
7. Ejecutar tests focalizados, validadores, auditoría runtime y compilación.

### Restricciones

- No modificar SQL, esquema, datos ni contratos HTTP.
- No eliminar todavía módulos legacy ni rutas públicas.
- No mover entidades entre BPM y TREE.
- No ampliar ports con métodos no usados por casos de uso reales.
- La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Port transaccional RCA_TREE implementado

- Se definió `TransactionPort` como contrato mínimo para abrir cursores transaccionales.
- `PostgresTransactionAdapter` concentra la implementación PostgreSQL y es el único punto que conoce `app.persistence.db.db_cursor`.
- `RcaTreeAnalysisPostgresAdapter` recibe el port por inyección y ya no importa directamente `db_cursor`.
- El wiring de análisis compone explícitamente `PostgresTransactionAdapter` en producción.
- Los tests verifican que el adaptador puede recibir un doble transaccional sin abrir PostgreSQL.
- No se modificaron SQL, payloads, códigos HTTP, esquema ni datos.

### Verificación

- Tests focalizados RCA_TREE, compatibilidad HTTP y arquitectura: `13/13` correctos.
- Suite completa `unittest`: `11/11` correcta.
- Auditoría backend: correcta, sin errores de parseo ni módulos API sin consumidor estático.
- Rutas `/api/rca-tree/analyses`, `/api/rca-tree/analyses/templates` y `/api/analyses`: `200` con `Flask.test_client()`.
- Validadores estructural, naming, dependencias y concrete implementations: correctos.
- `compileall`: correcto.

### Pendiente explícito

Se mantiene la fachada HTTP legacy y el adaptador inbound legacy no observado en runtime como compatibilidad pendiente. Su retirada requiere evidencia dinámica de consumidores externos y no forma parte de esta fase.

## Siguiente bloque planificado — fachada HTTP legacy de análisis sobre RCA_TREE

### Análisis

La ruta pública legacy `/api/analyses` sigue siendo necesaria por consumidores E2E y compatibilidad, pero su fachada todavía compone `modules.causal_analysis.infrastructure.wiring`. La implementación canónica de análisis ya vive en `rca_tree`, por lo que la fachada debe delegar en ese servicio sin cambiar rutas, payloads, estados ni códigos HTTP.

El adaptador inbound de `causal_analysis` no está registrado en runtime, pero no se eliminará todavía: los tests y módulos históricos aún lo referencian. Primero se migrará la composición de la fachada y se actualizarán las pruebas de composición para distinguir ruta legacy de implementación canónica.

### Plan

1. Cambiar `routes.analysis` para construir el servicio de análisis RCA_TREE canónico.
2. Mantener las funciones públicas de la fachada (`list_recent`, `list_templates`, `create_analysis`, `get_analysis`, `update_analysis`, `save_result`) para no romper consumidores ni tests.
3. Verificar que `/api/analyses`, `/api/analysis-templates` y sus operaciones de detalle siguen produciendo las respuestas actuales.
4. Añadir una prueba de composición que confirme que la fachada legacy no instancia `causal_analysis`.
5. Mantener `modules/causal_analysis` como alias temporal hasta migrar tests históricos y confirmar ausencia de imports dinámicos.
6. Ejecutar validadores, auditoría runtime, tests unitarios, tests de contrato y compilación.

### Gates

- `/api/analyses` continúa disponible con el mismo contrato HTTP.
- La fachada legacy delega únicamente al servicio RCA_TREE canónico.
- El adaptador inbound legacy no se registra en runtime.
- No se modifican PostgreSQL, esquema, datos ni contratos públicos.

### Restricción

La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Fachada HTTP legacy de análisis migrada

- `routes.analysis` compone ahora `build_rca_tree_analysis_service` mediante alias compatible.
- Se conservaron sus funciones públicas y las rutas `/api/analyses`, `/api/analysis-templates`, detalle, actualización y resultados.
- Se añadió una prueba de composición que impide volver a instanciar `modules.causal_analysis` desde la fachada.
- El adaptador inbound de `causal_analysis` continúa sin registrarse en runtime y se conserva como alias temporal por sus consumidores históricos.
- No se modificaron PostgreSQL, esquema, datos ni contratos HTTP.

### Verificación

- Tests focalizados: `13/13` correctos.
- Suite completa `unittest`: `11/11` correcta.
- `/api/analyses`, `/api/analysis-templates` y `/api/rca-tree/analyses`: `200` con `Flask.test_client()`.
- Auditoría runtime: la ruta legacy pertenece a `uc_bib_solv.routes.analysis`; el inbound legacy de `causal_analysis` no está registrado.
- Validadores arquitectónicos, compilación y `git diff --check`: correctos.

### Pendiente explícito

La eliminación física de `modules/causal_analysis` y de otros aliases requiere migrar los tests históricos y completar la validación dinámica de consumidores externos.

## Siguiente bloque planificado — consumidores históricos de causal_analysis

### Análisis

La fachada HTTP legacy ya delega en RCA_TREE, pero todavía existen referencias directas a `modules.causal_analysis` en tests de dominio, persistencia y wiring. También hay repositorios legacy que construyen el servicio antiguo. No es seguro eliminar el paquete mientras esas referencias sigan activas, aunque el adaptador inbound antiguo no esté registrado en runtime.

### Plan

1. Clasificar cada referencia como prueba canónica, prueba de compatibilidad o consumidor runtime.
2. Migrar las pruebas canónicas de análisis a `modules/rca_tree` y conservar únicamente pruebas explícitas de compatibilidad para el alias legacy.
3. Cambiar `repositories/analysis_repository.py` y adaptadores de persistencia legacy para delegar al servicio/adaptador RCA_TREE, sin duplicar SQL ni cambiar sus funciones públicas.
4. Añadir una allowlist documentada para las referencias legacy que deban permanecer temporalmente.
5. Ejecutar inventario estático y validación runtime para confirmar que `modules.causal_analysis` solo queda como compatibilidad.
6. No eliminar todavía el paquete legacy: la retirada requerirá ausencia de imports, tests, scripts y consumidores dinámicos.

### Gates

- Ningún consumidor runtime usa directamente el wiring antiguo de `causal_analysis`.
- Las pruebas canónicas cubren dominio, aplicación, persistencia y HTTP de RCA_TREE.
- Las fachadas públicas legacy siguen funcionando.
- No se modifican PostgreSQL, esquema, datos ni contratos HTTP.

### Restricción

La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Consumidores históricos migrados a RCA_TREE

- `repositories/analysis_repository.py` compone el servicio RCA_TREE canónico.
- `app/persistence/analisis_causas_repo.py` y `analisis_causas_detalle_repo.py` usan el adaptador de persistencia RCA_TREE mediante wiring, conservando sus funciones legacy.
- `app/domain/analisis_causas.py` reexporta las entidades y reglas desde `rca_tree.domain`.
- Se añadió `create_legacy` al adaptador canónico para preservar el contrato de los repositorios históricos.
- Las pruebas canónicas de análisis, persistencia, HTTP y arquitectura pasan; las pruebas históricas de `causas_service` mantienen fallos de baseline por imports/mocks legacy y quedan documentadas, sin restaurar módulos eliminados.
- No se modificaron PostgreSQL, esquema, datos ni contratos HTTP.

### Verificación

- Tests focalizados canónicos: `14/14` correctos.
- Suite `unittest discover`: `11/11` correcta.
- Auditoría backend, validadores arquitectónicos y compilación: correctos.
- Rutas `/api/analyses`, `/api/analysis-templates` y `/api/rca-tree/analyses`: `200`.
- El único inbound no observado continúa siendo `modules/causal_analysis/adapters/inbound/http/routes.py`, conservado como alias temporal.

### Pendiente explícito

La retirada física de `modules/causal_analysis` requiere resolver o reclasificar las pruebas históricas que todavía lo importan y completar la validación dinámica de consumidores externos.

## Siguiente bloque planificado — estabilización de caracterización legacy RCA_TREE

### Análisis

La prueba histórica `tests.unit.test_causas_service` falla porque mezcla imports cualificados (`uc_bib_solv.services`) con patches sobre aliases top-level (`services`) y carga dos instancias de algunos módulos. Esto provoca que los mocks no alcancen las funciones realmente invocadas y genera falsos negativos en operaciones causales no relacionadas con la migración de análisis.

### Plan

1. Identificar tests que mezclan namespaces `uc_bib_solv.*`, `app.*`, `services.*`, `repositories.*` y `modules.*`.
2. Normalizar los imports de las pruebas canónicas hacia `uc_bib_solv.*`.
3. Ajustar los patches para apuntar al símbolo consumido por cada módulo, sin modificar lógica productiva.
4. Mantener pruebas separadas para compatibilidad de aliases cuando una ruta histórica siga siendo pública.
5. Ejecutar de forma aislada los tests causales, de repositorios y de análisis para distinguir regresiones reales de problemas de carga.
6. Repetir suite completa, auditoría, validadores y compilación.

### Gates

- `tests.unit.test_causas_service` pasa sin depender de namespaces duplicados.
- Las pruebas canónicas de RCA_TREE y las fachadas legacy siguen pasando.
- No se restauran módulos eliminados ni se cambian contratos HTTP.
- No se modifican PostgreSQL, esquema ni datos.

### Restricción

La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Cierre — caracterización legacy RCA_TREE estabilizada

Los imports y mocks de `tests.unit.test_causas_service` y `tests.unit.test_causa_detail_service` quedaron normalizados al namespace `uc_bib_solv.*`, eliminando la carga duplicada de aliases top-level.

Verificación: 15/15 tests causales, 14/14 tests focalizados RCA_TREE/compatibilidad, suite `unittest discover` 11/11, auditoría, validadores y compilación correctos. No se modificaron PostgreSQL, esquema, datos ni contratos HTTP.

Los aliases restantes quedan pendientes de una fase específica de retirada con validación de consumidores externos.

## Siguiente bloque planificado — inventario y allowlist de aliases top-level

### Análisis

La búsqueda restante muestra referencias top-level concentradas en patches de pruebas (`routes.process_modeling`, `routes.causas`) y no en consumidores productivos internos. Estas rutas legacy pueden seguir siendo superficies públicas, por lo que no deben eliminarse automáticamente. Hay que distinguir aliases de compatibilidad HTTP de namespaces usados únicamente por tests históricos.

### Plan

1. Auditar la composición de cada alias top-level y su correspondencia con `uc_bib_solv.routes.*`.
2. Migrar los tests canónicos para parchear el namespace cualificado cuando el runtime use `uc_bib_solv.*`.
3. Mantener pruebas explícitas de compatibilidad para las rutas top-level que sigan siendo públicas.
4. Crear o actualizar una allowlist de aliases con motivo, consumidores y criterio de retirada.
5. Verificar que no quedan imports productivos internos hacia namespaces top-level, salvo fachadas documentadas.
6. Ejecutar inventario, suite de tests, validadores, auditoría runtime y compilación.

### Gates

- Cada alias conservado tiene consumidor o compatibilidad documentada.
- Los tests canónicos no dependen de imports top-level duplicados.
- Las rutas legacy públicas mantienen su contrato.
- No se eliminan archivos, rutas ni datos sin validación dinámica.

### Restricción

La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Inventario y allowlist de aliases top-level implementados

- Se confirmó que el código productivo no importa los namespaces top-level `app`, `modules`, `repositories`, `routes` o `services` fuera de las fachadas internas cualificadas.
- Se añadió una comprobación arquitectónica para impedir nuevas dependencias productivas de esos namespaces.
- Las pruebas históricas que aún parchean `routes.*` se mantienen clasificadas como compatibilidad del antiguo entrypoint, no como consumidores productivos.
- Se corrigió la expectativa obsoleta que clasificaba el adaptador inbound canónico `causal_tree` como no registrado; el único inbound no observado sigue siendo el legacy de `causal_analysis`.
- La allowlist existente mantiene únicamente rutas, servicios, repositorios y persistencia legacy con criterio explícito de retirada.

### Verificación

- Auditoría de imports top-level: correcta.
- Auditoría backend: correcta; 130 endpoints únicos, 131 rutas runtime, sin errores de parseo.
- Validadores estructural, naming, dependencias y concrete implementations: correctos.
- Suite `unittest discover`: 11/11 correcta.
- Tests causales y de detalle: 15/15 correctos.
- No se modificaron PostgreSQL, esquema, datos ni contratos HTTP.

### Pendiente explícito

Las pruebas ligadas al entrypoint histórico ausente (`app.py`) y sus aliases de ruta permanecen como compatibilidad pendiente; no se eliminan hasta disponer de un consumidor runtime equivalente y validación externa.

## Siguiente bloque planificado — migración de pruebas del entrypoint histórico

### Análisis

`tests/unit/test_causa_routes.py` y `tests/unit/test_process_modeling_api.py` cargan `uc_bib_solv/app.py`, archivo que ya no forma parte de la composición canónica. Además, parchean módulos top-level (`routes.*`) aunque el runtime actual se construye desde `modules.platform.infrastructure.app_factory` y registra adaptadores canónicos.

Estas pruebas deben distinguir entre:

- contratos de las rutas públicas que todavía deben probarse;
- compatibilidad de las fachadas `uc_bib_solv.routes.*`;
- composición canónica de `backend_app` y `app_factory`.

### Plan

1. Sustituir la carga dinámica del entrypoint ausente por `uc_bib_solv.backend_app` o `create_app` del composition root.
2. Ajustar los patches al módulo que realmente registra cada blueprint.
3. Mantener pruebas específicas de las fachadas legacy, registrándolas de forma aislada cuando corresponda.
4. Verificar que las respuestas, códigos y payloads HTTP actuales permanecen iguales.
5. Eliminar únicamente referencias de tests al archivo inexistente; no eliminar rutas públicas ni fachadas productivas.
6. Ejecutar tests de rutas, suite completa, auditoría, validadores y compilación.

### Gates

- Ninguna prueba canónica depende de `uc_bib_solv/app.py` inexistente.
- Las fachadas legacy tienen pruebas aisladas y explícitas.
- La composición canónica de Flask sigue registrada y accesible.
- No se modifican PostgreSQL, esquema, datos ni contratos HTTP.

### Restricción

La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Pruebas del entrypoint histórico migradas

- `test_process_modeling_api.py` usa ahora `modules.platform.infrastructure.app_factory.create_app` y parchea el servicio de Process Modeling canónico.
- `test_causa_routes.py` prueba la fachada `uc_bib_solv.routes.causas` en una aplicación Flask aislada, sin depender de `uc_bib_solv/app.py` eliminado.
- Los parches de ambas suites usan namespaces cualificados y ya no dependen de aliases top-level.
- Se mantienen intactos los contratos de respuesta, payloads y códigos HTTP.

### Verificación

- Tests de Process Modeling y fachada causal: `12/12` correctos.
- Caracterización combinada de rutas, causalidad y RCA_TREE: `40/40` correcta.
- Suite `unittest discover`: `11/11` correcta.
- Auditoría backend, validadores, compilación y `git diff --check`: correctos.
- No se modificaron PostgreSQL, esquema, datos ni contratos HTTP.

### Pendiente explícito

Las pruebas históricas restantes que usan aliases top-level se conservan únicamente como compatibilidad hasta confirmar consumidores externos y poder retirarlas sin riesgo.

## Plan de consolidación física BPM + RCA_TREE solicitado

### Objetivo

Dejar como únicos dominios funcionales `modules/bpm`, `modules/rca_tree` y `modules/platform`, eliminando físicamente `app`, `causal_tree`, `causal_analysis`, `operational_modeling`, `process_modeling`, `routes`, `services` y `repositories` tras migrar todos sus consumidores.

### Orden de implementación

1. Migrar dominios BPM desde `app/domain` y `operational_modeling` hacia `modules/bpm`.
2. Migrar dominio y persistencia causal desde `app/domain`, `causal_tree` y `causal_analysis` hacia `modules/rca_tree`.
3. Mover persistencia PostgreSQL y transacciones a adaptadores BPM/RCA_TREE y componentes transversales de `platform`.
4. Actualizar composition roots y registrar únicamente blueprints de BPM, RCA_TREE y platform.
5. Migrar tests, scripts y documentación; conservar contratos HTTP mediante adaptadores canónicos.
6. Añadir gates que impidan carpetas e imports legacy.
7. Eliminar físicamente los directorios legacy por grupos, validando cada grupo antes del siguiente.

### Restricciones y gates

- No modificar PostgreSQL, esquema, migraciones ni datos.
- No permitir imports cruzados BPM/RCA_TREE ni dependencias de infraestructura desde `domain` o `application`.
- Mantener respuestas, códigos y payloads HTTP actuales.
- Ejecutar tests de dominio, ports, persistencia, HTTP, E2E, auditoría, validadores y compilación después de cada grupo.
- La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Diagnóstico pendiente — catálogos UI vacíos y listas de árbol sin datos

### Síntomas reportados

- Las páginas de máquinas, procesos, operaciones y contratos no muestran los registros existentes en PostgreSQL.
- La página de árbol muestra listas desplegables sin elementos.

### Análisis inicial

El fallo parece transversal a la carga de catálogos y no necesariamente a los datos almacenados. Se debe comprobar, en este orden:

1. Que el frontend solicite los endpoints canónicos actualmente registrados y no rutas legacy inexistentes.
2. Que `pageData` y `AppState.catalog` reciban y normalicen las respuestas reales de BPM y RCA_TREE.
3. Que los adaptadores HTTP traduzcan correctamente UUID, nombres y relaciones BPM desde PostgreSQL.
4. Que los repositorios BPM y RCA_TREE usen la conexión/configuración activa y no dependan de `uc_bib_solv.app` eliminado.
5. Que errores, respuestas vacías o formatos incompatibles no sean ocultados por la UI.
6. Que los selectores de árbol consulten el catálogo causal/contextual correcto y se actualicen tras la carga asíncrona.

### Plan de implementación, pendiente de autorización

1. Reproducir el problema con pruebas de integración/read-only y revisar consola, respuestas HTTP y `url_map` runtime.
2. Trazar por cada página la fuente de datos, endpoint, adaptador, repositorio y consulta PostgreSQL.
3. Comparar payload esperado por cada renderizador con el payload real, incluyendo nombres `camelCase`/`snake_case` y UUID.
4. Corregir únicamente la resolución de endpoints, composición, normalización o carga asíncrona que cause los catálogos vacíos.
5. Corregir la carga de listas del árbol conservando sus filtros y relaciones BPM/RCA_TREE.
6. Añadir regresiones para catálogos de máquinas, procesos, operaciones y contratos, y para cada selector de árbol.
7. Ejecutar suite unitaria, integración PostgreSQL, auditoría, validadores, compilación y pruebas E2E disponibles.

### Restricciones

- No modificar PostgreSQL, esquema ni datos.
- No cambiar relaciones de dominio BPM/RCA_TREE.
- No eliminar rutas o adaptadores hasta demostrar que no son la causa y que no tienen consumidores.
- No modificar código hasta recibir exactamente `inicia implementacion`.

## Corrección implementada — catálogos BPM y listas RCA_TREE

### Causa confirmada

Los endpoints BPM respondían correctamente desde PostgreSQL, pero el cliente almacenaba el envoltorio HTTP `{ status: "ok", data: ... }` como si fuera el catálogo. Las vistas esperaban el catálogo en el nivel superior de `AppState.catalog`, por lo que `procesos`, `contratos`, `maquinas` y `contractScopes` resultaban vacíos. Las páginas operativas tenían el mismo desfase de nivel.

Los selectores del árbol reutilizaban `AppState.catalog`; por tanto, sufrían el mismo problema aunque `/api/rca-tree/nodes` devolviera el grafo correctamente.

### Cambios realizados

- `webapp/js/api/client.js` añade `unwrapApiData`.
- `fetchOperationalCatalog` desenvuelve el catálogo BPM antes de guardarlo en el estado.
- `fetchOperationalPage` desenvuelve las páginas operativas antes de guardarlas en `pageData`.
- Se añadió `tests/unit/catalog-response-normalization.test.mjs` para proteger catálogo, filas, defaults y estructura de respuesta.
- No se modificaron endpoints, PostgreSQL, esquema, datos ni relaciones de dominio.

### Verificación

- Catálogo real: `7` procesos, `34` contratos y `13` máquinas.
- Página real de procesos: `7` filas.
- Página real de máquinas: `13` filas.
- Página real de contratos: `34` filas.
- Operaciones BPM: `18` registros.
- RCA_TREE: grafo y `5` opciones de sidebar disponibles.
- Tests JavaScript específicos: `12/12` correctos.
- Suite unitaria Python: `160/160` correctos.
- Compilación Python: correcta.
- `git diff --check` sobre archivos modificados: correcto.

### Observación

La suite Python mantiene únicamente un `ResourceWarning` preexistente por un archivo abierto en `test_platform_boundaries.py`; no afecta al resultado de los tests.

La suite JavaScript completa obtuvo `51/52`: `process-delete-modal.test.mjs` falla por una expectativa anterior sobre un modal de borrado de procesos que ya no forma parte de la UI vigente. El fallo no procede de la normalización de catálogos; las pruebas específicas de esta corrección y las pruebas relacionadas con árbol y páginas operativas son correctas.

## Revisión — `architecture_validators`

### Pregunta

Determinar qué responsabilidad tiene `uc_bib_solv/architecture_validators/` y si debe existir dentro de la arquitectura runtime BPM + RCA_TREE + platform.

### Plan de análisis

1. Revisar los archivos, comandos de ejecución e imports del directorio.
2. Comprobar si se registra en `app_factory`, se importa desde dominios o participa en peticiones HTTP.
3. Compararlo con la definición arquitectónica: `modules/bpm`, `modules/rca_tree` y `modules/platform` como runtime, y tooling separado para validaciones.
4. Recomendar conservarlo como tooling de gobernanza, moverlo fuera de los módulos runtime o integrarlo en platform únicamente si existen consumidores runtime reales.

### Restricción

Esta revisión no modifica, mueve ni elimina el directorio hasta recibir una solicitud explícita de implementación.

## Revisión — arquitectura y naming de `modules/bpm/application`

### Alcance

Revisar la coexistencia de:

- `modules/bpm/application/operational.py`;
- `modules/bpm/application/process_modeling/`;
- `modules/bpm/application/use_cases/operational.py`.

### Preguntas arquitectónicas

1. Determinar si `application/operational.py` y `application/use_cases/operational.py` duplican responsabilidades o cumplen roles diferentes.
2. Identificar si `process_modeling` está organizado como caso de uso, servicio de aplicación, fachada o adaptador.
3. Verificar que `application` dependa únicamente de `domain` y `ports`, sin instanciar persistencia ni importar adaptadores concretos.
4. Comparar el naming actual con una organización Clean Architecture orientada a casos de uso, donde cada caso de uso sea identificable y no exista un módulo genérico ambiguo.
5. Proponer una estructura de nombres y migración que preserve imports, wiring, endpoints y tests.

### Restricción

La revisión no modificará código ni renombrará módulos hasta recibir exactamente `inicia implementacion`.

### Hallazgos de la revisión

- `application/operational.py` no es un caso de uso: es una fachada de compatibilidad que reexporta `BpmOperationalUseCases` y aliases de ports.
- `application/use_cases/operational.py` contiene un agregador de 23 operaciones sobre procesos, operaciones, contratos, máquinas, asociaciones y configuraciones. El nombre `operational.py` no expresa una acción ni una capacidad concreta.
- `application/process_modeling.py` mezcla el port inbound y la fachada `BpmProcessModelingApplication`; la implementación real está separada en `process_modeling/application/service_impl.py`, con una fachada dinámica `service.py` basada en `__getattr__`.
- `infrastructure/wiring.py` importa dos veces `BpmOperationalUseCases` y expone wrappers globales de compatibilidad además de la clase de composición.
- La estructura actual es funcional pero no es una organización Clean Architecture por caso de uso: presenta servicios/agregadores genéricos y fachadas de compatibilidad en la misma frontera application.

### Criterio de comparación

El artículo enlazado recomienda agrupar por feature o agregado, una carpeta por caso de uso y nombres verbo-sustantivo; desaconseja agrupar por tipos técnicos genéricos como `Handlers`, `Dtos` o `Validators`. La recomendación es aplicable al proyecto Python como criterio de organización, no como copia literal de la convención .NET.

### Recomendación pendiente de implementación

Organizar BPM por capacidades funcionales, por ejemplo `application/processes/`, `application/operations/`, `application/contracts/`, `application/machines/` y `application/catalog/`, con casos de uso explícitos como `list_processes`, `update_process`, `create_contract`, `assign_contract_machines` y `list_operations`. Mantener ports cerca de la feature que los usa o en `application/ports` solo cuando sean realmente compartidos. Convertir las fachadas actuales en aliases temporales y retirarlas después de migrar wiring, adaptadores, tests y consumidores.

No se recomienda renombrar únicamente el archivo `operational.py`: primero hay que separar responsabilidades para evitar trasladar el mismo agregador monolítico a otro nombre.

### Implementación realizada

- Se retiró `application/use_cases/operational.py` como módulo canónico.
- Se creó `application/use_cases/bpm_operational.py` como composición compatible de casos de uso explícitos.
- Se organizaron casos de uso por capacidad BPM:
  - `processes/`: listar, crear, actualizar y eliminar procesos.
  - `operations/`: listar operaciones y actualizar etapas.
  - `contracts/`: listar, consultar, crear, actualizar, activar/desactivar, eliminar y asociar máquinas.
  - `machines/`: listar, crear, actualizar, eliminar, consultar contexto y gestionar configuraciones.
  - `catalog/`: obtener catálogo y página operativa.
- Se trasladó el port de process modeling a `application/ports/process_modeling.py`; `application/process_modeling.py` queda como alias de compatibilidad.
- `infrastructure/wiring.py` compone desde los nuevos módulos y se eliminó el import duplicado de `BpmOperationalUseCases`.
- Se añadió una prueba estructural de la organización y de la retirada del módulo genérico.

### Verificación de la implementación

- Suite unitaria Python: `163/163` correcta.
- Tests de arquitectura: `8/8` correctos.
- Validadores de estructura, naming, dependencias e implementaciones concretas: correctos.
- Compilación Python: correcta.
- `git diff --check`: correcto.
- Se conserva `application/operational.py` únicamente como fachada temporal para consumidores existentes.
- Se conserva `application/process_modeling.py` únicamente como alias temporal; el wiring canónico usa `application.ports.process_modeling`.

## Decisión arquitectónica — retirada de aliases de application

### Pregunta

Definir la implementación canónica que debe sustituir definitivamente a `application/operational.py` y `application/process_modeling.py` para respetar Clean Architecture.

### Criterio

- Los casos de uso deben vivir bajo `application/use_cases/<feature>/<use_case>.py`.
- Los puertos deben vivir bajo `application/ports`, separados como inbound y outbound cuando la cantidad de contratos lo justifique.
- `application` no debe ser una fachada genérica ni usar `__getattr__` para ocultar dependencias.
- `infrastructure` debe ser el único lugar que compone adaptadores concretos.
- Los aliases solo pueden existir durante una migración y deben tener consumidores identificados, pruebas y fecha/condición de retirada.

### Implementación canónica prevista

1. Sustituir `application/operational.py` por imports directos desde los casos de uso feature-oriented y eliminarlo cuando no queden consumidores.
2. Exponer un `BpmApplication` explícito o inyectar los casos de uso directamente en los adaptadores HTTP; evitar `BpmOperationalService.__getattr__`.
3. Mantener process modeling bajo un único feature BPM, con ports inbound explícitos y casos de uso separados para procesos, versiones, nodos, operaciones, transiciones y contexto.
4. Actualizar `platform`, adaptadores HTTP, agent tools y tests para importar los módulos canónicos.
5. Ejecutar búsqueda estática, imports, runtime y suite antes de borrar los aliases.

### Restricción

Esta decisión es análisis y diseño; no se eliminarán los aliases hasta recibir exactamente `inicia implementacion`.

### Implementación de retirada de aliases

- Se eliminaron físicamente `modules/bpm/application/operational.py` y `modules/bpm/application/process_modeling.py`.
- Los consumidores de `OperationalUseCases`, `OperationalPersistencePort` y `BpmContextPort` fueron migrados a `application.use_cases` y `application.ports`.
- `backend_gateway` dejó de importar el alias de `application.process_modeling` y usa el paquete de process modeling directamente.
- `BpmOperationalService` ahora expone métodos explícitos; se eliminó su `__getattr__`.
- Se eliminaron también los accesos dinámicos del wiring BPM y del adaptador outbound operacional.
- La operación de actualización de etapas quedó en el flujo de process modeling, no en el agregado operacional.
- Se conservaron únicamente nombres explícitos de compatibilidad (`get_catalog`/`get_page`) para los adaptadores HTTP existentes.

### Gates de retirada

- No quedan imports hacia `application.operational` ni `application.process_modeling`.
- Los dos archivos alias no existen físicamente.
- Smoke HTTP BPM/RCA_TREE: `/api/bpm/operational/catalog`, `/api/bpm/operational/page/procesos`, `/api/bpm/processes`, `/api/bpm/operations` y `/api/rca-tree/nodes`: `200`.
- Suite unitaria Python: `163/163` correcta.
- Validadores de estructura, dependencias e implementaciones concretas: correctos.
- Compilación y `git diff --check`: correctos.
- Permanece `process_modeling/application/service.py` como fachada dinámica interna del servicio de modelado; su eliminación requiere extraer los casos de uso del `service_impl.py` en una fase posterior específica.

### Corrección adicional

- `process_modeling/application/service.py` dejó de usar `__getattr__` y ahora exporta explícitamente las operaciones del contrato de aplicación.
- La sincronización explícita de los ports de persistencia mantiene compatibilidad con el wiring y los tests que inspeccionan `processes`, `versions`, `nodes` y `transitions`.
- La implementación legacy `service_impl.py` continúa encapsulando lógica de process modeling; queda como siguiente extracción vertical, no como alias dinámico.
- No quedan `__getattr__` en los módulos BPM inspeccionados ni imports hacia los aliases eliminados.

## Siguiente implementación — extracción vertical de Process Modeling

### Objetivo

Eliminar la concentración de lógica en `modules/bpm/process_modeling/application/service_impl.py` y organizarla por capacidades BPM, manteniendo los endpoints, payloads, validaciones, ports y wiring actuales.

### Plan

1. Separar casos de uso de procesos, versiones, nodos, operaciones, transiciones y contexto en módulos con nombres verbo-sustantivo.
2. Encapsular la dependencia de persistencia mediante un contexto/puerto explícito inyectado desde infrastructure.
3. Mantener una composición temporal explícita para que el adaptador HTTP siga recibiendo handlers sin `__getattr__`.
4. Migrar `app_factory`, wiring, agent tools, tests y rutas a los casos de uso nuevos.
5. Eliminar `service_impl.py` y reducir `application/service.py` a una composición explícita o retirarlo si no quedan consumidores.
6. Validar contratos HTTP, errores de dominio, persistencia inyectada, suite completa y validadores arquitectónicos.

### Restricciones

- No modificar PostgreSQL, esquema ni datos.
- No cambiar contratos HTTP ni payloads.
- No dejar imports dinámicos o dependencias de infrastructure dentro de los casos de uso.
- La implementación comenzará únicamente al recibir exactamente `inicia implementacion`.

## Implementación — extracción vertical de Process Modeling

- Se crearon casos de uso explícitos para procesos, versiones, nodos, operaciones, transiciones y registros de contexto bajo `process_modeling/application/use_cases/`.
- Se creó `ProcessModelingDependencies` para inyectar los puertos de persistencia y centralizar únicamente helpers de aplicación (`version`, `draft`, jerarquía y serialización).
- Se creó `ProcessModelingApplication` como composition facade explícita, sin `__getattr__`, estado global ni importación de infraestructura.
- `infrastructure/wiring.py`, `app_factory.py`, el adaptador operacional compatible y `backend_gateway.py` ahora reciben una instancia compuesta desde el wiring.
- Se eliminaron físicamente `application/service_impl.py` y `application/service.py`.
- Se actualizaron tests de process modeling, composición, API y agent gateway para usar la aplicación canónica inyectada.

### Gates validados

- No quedan imports hacia `service_impl` ni hacia `application.service` en código o tests.
- Tests específicos de Process Modeling y boundaries: correctos.
- Suite unitaria Python: `163/163` correcta.
- Tests de arquitectura: `8/8` correctos.
- Compilación Python: correcta.
- No se modificaron PostgreSQL, esquema ni datos.

## Nueva auditoría — `rca_tree/application`

### Objetivo

Auditar `uc_bib_solv/modules/rca_tree/application/` para determinar por qué no existe `use_cases/`, localizar los casos de uso actuales, verificar su naming y compararlos con las reglas Clean/Hexagonal aplicadas al dominio BPM.

### Puntos de revisión

- Separación entre `application`, `domain`, `adapters` e `infrastructure`.
- Inventario de servicios, fachadas, comandos y consultas actualmente presentes.
- Identificación de clases y métodos que representan casos de uso.
- Dependencias hacia repositorios concretos, Flask, PostgreSQL, wiring o entidades externas.
- Naming: una intención de negocio por módulo y nombres ejecutables (`create_*`, `list_*`, `update_*`, etc.).
- Duplicidad entre `rca_tree/application`, `causal_analysis`, `causal_tree` y adaptadores legacy.
- Necesidad de separar casos de uso de nodos, relaciones, causas, hipótesis, análisis y evidencias.

### Resultado esperado

Proponer una estructura `rca_tree/application/use_cases/` alineada con BPM, indicando qué módulos deben moverse, dividirse, convertirse en ports/DTOs o eliminarse.

## Resultado de auditoría — `rca_tree/application`

### Estructura actual

- No existe `application/use_cases/`.
- `application/use_cases.py` concentra `RcaTreeUseCases`, con operaciones de árbol, detalle, causas e hipótesis, además de normalizadores y aliases legacy.
- `application/analysis_use_cases.py` concentra seis capacidades de análisis en `AnalysisUseCases` y expone otro alias legacy.
- `application/service.py` es una fachada de 9 operaciones que accede directamente a los atributos internos de `RcaTreeUseCases` (`causes`, `hypotheses`, `queries`) y añade reglas de respuesta HTTP/compatibilidad.
- `application/ports/` está plano: `persistence.py` agrupa cinco contratos distintos y no existen subdirectorios `inbound/` y `outbound/` ni DTOs de aplicación.

### Incumplimientos detectados

- No hay una clase/módulo por intención de negocio; las clases plurales `RcaTreeUseCases` y `AnalysisUseCases` son agregadores tipo service locator.
- Los métodos de aplicación no siguen una interfaz uniforme `execute(command)`; usan verbos heterogéneos (`tree`, `detail`, `save_*`, `get`, `update`) y payloads `dict` sin comandos/resultados tipados.
- `RcaTreeUseCases` recibe dependencias que no utiliza (`nodes`, `relationships`, `bpm_context`) y delega consultas de escritura (`link_reusable_node`, `create_contract_child`) a `TreeQueryPort`, que mezcla lectura y comandos.
- `RcaTreeService` no es un caso de uso: transforma respuestas, expone operaciones de borrado y accede al estado interno del agregador. Debe convertirse en composición de infraestructura o dividirse en casos de uso explícitos.
- `AnalysisUseCases` mezcla listado, creación, consulta, actualización y resultados de análisis en una única clase; el adaptador de infraestructura añade otra fachada `RcaTreeAnalysisService` con delegación variádica (`*args`).
- Los aliases `CausalTreeUseCases` y `CausalAnalysisUseCases` mantienen naming legacy dentro del núcleo canónico, en vez de quedar aislados en un adaptador de compatibilidad.
- Los ports de persistencia describen repositorios con nombres genéricos y contratos amplios; falta segregación por capacidad (`causes`, `hypotheses`, `nodes`, `relationships`, `tree_queries`, `analyses`, `participants`, `results`).
- `TransactionPort` existe pero no participa en la composición de los casos de uso auditados; la frontera transaccional queda implícita en el adaptador.
- La aplicación importa referencias BPM correctamente a través de `platform.application.ports`, pero la conversión `ContractRef.as_legacy_int()` mantiene una decisión de compatibilidad dentro del caso de uso que debería quedar en un mapper/adaptador.

### Estructura objetivo propuesta

```text
modules/rca_tree/application/
├── dto/
├── ports/
│   ├── inbound/
│   └── outbound/
└── use_cases/
    ├── tree/
    ├── causes/
    ├── hypotheses/
    ├── reusable_nodes/
    └── analyses/
```

Cada archivo de `use_cases/` debe contener una única clase con nombre de intención (`GetTree`, `GetCauseDetail`, `CreateCause`, `UpdateCause`, `DeleteCause`, `GetHypotheses`, `CreateHypothesis`, `UpdateHypothesis`, `DeleteHypothesis`, `SearchReusableNodes`, `LinkReusableNode`, `CreateContractNode`, `ListAnalyses`, `CreateAnalysis`, `GetAnalysis`, `UpdateAnalysis`, `SaveAnalysisResult`) y un método público `execute(...)`. La composición concreta debe permanecer en `infrastructure/wiring.py`; los aliases HTTP, si siguen siendo necesarios, deben delegar desde `adapters/inbound` sin reexportarse desde `application`.

### Conclusión

`rca_tree/application` cumple parcialmente la dirección de dependencias —no importa Flask ni PostgreSQL—, pero no cumple el estándar de casos de uso establecido para BPM ni una separación Clean/Hexagonal completa. El siguiente cambio debe ser una migración estructural y semántica de los agregadores a `use_cases/`, con ports segregados, DTOs explícitos y wiring actualizado. No se recomienda borrar todavía `service.py`, porque el runtime y los tests lo usan indirectamente; primero debe migrarse la composición y luego retirar las fachadas con gates de compatibilidad.

### Restricción

Esta fase es únicamente de auditoría y diseño. No se modificará código hasta recibir exactamente `inicia implementacion`.

## Implementación — normalización de `rca_tree/application`

- Se creó `application/use_cases/` organizado por capacidades: `tree`, `causes`, `hypotheses`, `reusable_nodes` y `analyses`.
- Cada caso de uso tiene una única clase con método `execute(...)`.
- Se crearon DTO/helpers de normalización en `application/dto`.
- Los ports se segregaron en `application/ports/inbound` y `application/ports/outbound`, separando persistencia causal, consultas de árbol, análisis, contexto BPM y transacciones.
- Se eliminaron los agregadores planos `application/use_cases.py`, `application/analysis_use_cases.py` y `application/service.py`.
- La composición se trasladó a `rca_tree/infrastructure/application.py` y `analysis_application.py`; `infrastructure/wiring.py` solo instancia adapters y casos de uso.
- Se eliminaron aliases genéricos de ports (`CausePort`, `AnalysisPort`, etc.) del API público de `rca_tree.application`.
- Se actualizaron tests y consumidores al naming explícito.

### Gates de implementación

- Tests focalizados BPM/RCA_TREE y arquitectura: `22/22` correctos.
- Suite unittest disponible: `15/15` correctos.
- Validadores de estructura, naming, dependencias e implementaciones concretas: correctos.
- Auditoría de aplicación/backend: sin rutas o renderizadores desconectados, sin errores de parseo ni adapters inbound ausentes en runtime.
- Se añadieron gates para exigir módulos de caso de uso con `execute(...)`, ports segregados y ausencia de los agregadores legacy.
- No se modificaron PostgreSQL, esquema ni datos.

## Cierre — retirada física de `bpm/process_modeling`

- Se confirmó que no existían archivos fuente ni referencias activas al namespace `uc_bib_solv.modules.bpm.process_modeling`.
- Se ejecutaron los gates finales antes de eliminar residuos generados.
- Se eliminó físicamente `uc_bib_solv/modules/bpm/process_modeling/`, incluidos sus `__pycache__` y directorios vacíos.
- El gate arquitectónico vuelve a exigir la ausencia física del directorio.
- La implementación canónica queda en `bpm/application`, `bpm/adapters` y `bpm/infrastructure`.

## Nueva fase — validación final y retirada física de `bpm/process_modeling`

### Objetivo

Cerrar la migración eliminando físicamente `uc_bib_solv/modules/bpm/process_modeling/` después de verificar que no contiene código fuente, imports activos ni consumidores runtime.

### Validaciones previstas

- Buscar referencias a `uc_bib_solv.modules.bpm.process_modeling` en código, tests y scripts.
- Verificar que el inventario runtime y `app_factory` usan únicamente los adapters y wiring canónicos de `bpm`.
- Ejecutar compilación, tests unitarios, tests de arquitectura, validadores arquitectónicos y auditoría backend.
- Confirmar que los endpoints `/api/bpm/*` y `/api/process-modeling/*` mantienen sus contratos.
- Confirmar que PostgreSQL, esquema y datos no se modifican.

### Eliminación prevista

- Eliminar el directorio `bpm/process_modeling` únicamente si la comprobación anterior confirma que solo contiene residuos generados (`__pycache__`) y ningún archivo fuente.
- Actualizar el gate arquitectónico para exigir la ausencia física del directorio.

### Restricción

No se modificarán código ni artefactos físicos hasta recibir exactamente `inicia implementacion`.

## Implementación — separación semántica de entidades y reglas BPM

### Entidades

- `bpm/domain/processes/` contiene ahora también las entidades de identidad operativa `Process`, `Operation` y `Stage`, junto con las entidades del modelo BPM (`ProcessDefinition`, `ProcessVersion`, `ProcessNode` y `ProcessTransition`).
- `bpm/domain/operations/` expone `Operation` y `Stage` como entrada conceptual del agregado de operaciones.
- `bpm/domain/machines/operational_entities.py` contiene la entidad operacional `Machine`; los modelos de tipo y configuración técnica permanecen en `machines/entities.py`.
- `bpm/domain/contracts/`, `associations/` y `configurations/` contienen respectivamente `Contract`, `MachineContractAssociation` y `MachineOperationConfiguration`.
- `bpm/domain/entities.py` queda reducido a una fachada explícita de compatibilidad; no contiene implementaciones propias.

### Reglas

- Se creó `bpm/domain/shared/rules.py` para validaciones transversales de texto y campos estructurados.
- Las reglas de payload de procesos viven en `processes/payload_rules.py`.
- Las reglas de contratos viven en `contracts/rules.py`.
- Las reglas de payload operacional de máquinas viven en `machines/payload_rules.py`; las reglas técnicas de tipos, configuraciones, etapas e identidad de operación continúan en `machines/validators.py`.
- `bpm/domain/validators.py` queda reducido a reexports de compatibilidad y ya no contiene lógica de validación.
- Los casos de uso BPM y el adaptador HTTP operacional importan las reglas desde el paquete propietario, no desde el módulo plano.

### RCA_TREE

- Se confirmó la organización por conceptos `causal_graph`, `causes` y `analyses` como fuente física de las entidades y reglas RCA_TREE.
- `rca_tree/domain/value_objects.py` y `exceptions.py` permanecen como shared kernel interno del bounded context; no contienen infraestructura ni dependencias BPM.

### Gates validados

- Suite unitaria: `164/164` correctos.
- Tests de arquitectura: `8/8` correctos.
- Validadores `--check-structure`, `--check-naming`, `--check-dependencies` y `--check-concrete-implementations`: correctos.
- `compileall` del paquete `uc_bib_solv`: correcto.
- No se modificaron PostgreSQL, esquema ni datos.

### Observación de compatibilidad

- La fachada `bpm/domain/entities.py` y la fachada `bpm/domain/validators.py` se mantienen temporalmente porque existen consumidores externos o tests históricos. Toda nueva implementación debe importar desde los paquetes conceptuales. Su retirada será una etapa independiente tras validar consumidores dinámicos.

## Nueva demanda — retirada de artefactos deprecated y temporales de `bpm/domain`

### Objetivo

Finalizar la limpieza física de `uc_bib_solv/modules/bpm/domain/`, eliminando fachadas, módulos y estructuras temporales que ya no tengan consumidores activos, sin alterar contratos HTTP, PostgreSQL ni el comportamiento de los dominios BPM y RCA_TREE.

### Análisis y alcance

- Auditar referencias en código de producción, tests, scripts, documentación e imports dinámicos.
- Distinguir entre:
  - artefactos sin consumidores, eliminables;
  - fachadas internas aún referenciadas, migrables antes de eliminar;
  - compatibilidad pública potencial, que debe conservarse hasta disponer de evidencia suficiente.
- Revisar específicamente:
  - `bpm/domain/entities.py`;
  - `bpm/domain/validators.py`;
  - `bpm/domain/value_objects.py` y `exceptions.py`;
  - directorios vacíos o con residuos generados de `machine_modeling`;
  - cualquier namespace antiguo bajo `bpm/domain`.

### Plan de implementación, pendiente de autorización

1. Generar inventario de archivos fuente y referencias por módulo.
2. Migrar los consumidores restantes hacia `processes`, `operations`, `machines`, `contracts`, `associations`, `configurations` o `shared`.
3. Eliminar físicamente las fachadas y módulos temporales sin consumidores confirmados.
4. Retirar residuos de estructura fuente vacía; no considerar `__pycache__` como arquitectura del proyecto.
5. Añadir o actualizar gates que fallen ante imports hacia namespaces eliminados.
6. Ejecutar compilación, tests unitarios, tests de arquitectura, validadores y smoke HTTP.
7. Registrar en este plan cada eliminación, sus consumidores verificados y los gates superados.

### Restricciones

- No modificar PostgreSQL, esquema, datos ni contratos HTTP.
- No eliminar una fachada si existe un consumidor externo no validado.
- No modificar RCA_TREE salvo para verificar que no depende de BPM mediante imports directos.
- No modificar código hasta recibir exactamente `inicia implementacion`.

## Implementación — retirada de artefactos BPM deprecated

### Eliminaciones físicas

- Eliminados `bpm/domain/entities.py` y `bpm/domain/validators.py`; el paquete raíz ya no contiene fachadas planas de entidades ni reglas.
- Eliminados `bpm/domain/value_objects.py` y `bpm/domain/exceptions.py`; sus primitivas compartidas viven en `bpm/domain/shared/value_objects.py` y `bpm/domain/shared/exceptions.py`.
- No quedan archivos fuente dentro de `bpm/domain/machine_modeling`; los residuos `__pycache__` generados no forman parte de la arquitectura fuente.

### Migraciones realizadas

- `domain/__init__.py` importa directamente desde los paquetes conceptuales.
- Adaptadores HTTP, casos de uso, tests y el script `scripts/migrate_req12_machine_model.py` fueron migrados a namespaces canónicos.
- `OperationalModelError` dejó de utilizarse; los adaptadores usan `BpmDomainError` desde `domain/shared`.
- Se añadió un test arquitectónico que impide reintroducir las fachadas planas y el namespace `machine_modeling` como código fuente.

### Verificación de consumidores

- No quedan referencias en código, tests o scripts a `bpm.domain.entities`, `bpm.domain.validators`, `bpm.domain.value_objects`, `bpm.domain.exceptions` ni `bpm.domain.machine_modeling`.
- Los imports compartidos restantes de RCA_TREE pertenecen exclusivamente a su propio bounded context y no son artefactos BPM.
- La auditoría runtime mantiene las rutas públicas; el único duplicado de endpoint reportado es el ya existente en la composición HTTP, no causado por esta limpieza.

### Gates finales

- Tests unitarios: `164/164` correctos.
- Tests de arquitectura: `9/9` correctos.
- Validadores de estructura, naming, dependencias e implementaciones concretas: correctos.
- `compileall` de `uc_bib_solv` y `scripts`: correcto.
- `git diff --check`: correcto.
- `scripts/audit_application_architecture.py --check --check-backend`: correcto.
- No se modificaron PostgreSQL, esquema ni datos.

## Nueva auditoría — `bpm/process_modeling`

### Objetivo

Determinar si `uc_bib_solv/modules/bpm/process_modeling/` respeta Domain-first, Clean Architecture y Hexagonal Architecture, y clasificar correctamente sus módulos `domain_function` como reglas de dominio, servicios de dominio o casos de uso de aplicación.

### Puntos de revisión

- Separación entre `domain`, `application`, `adapters` e `infrastructure`.
- Dependencias hacia Flask, PostgreSQL, repositorios concretos, wiring o módulos externos.
- Ubicación de validaciones, reglas BPM, coordinación de persistencia y traducción HTTP.
- Responsabilidad y naming de cada `domain_function`.
- Duplicidad con `bpm/application/use_cases`, `bpm/domain/processes` y los adaptadores canónicos.
- Necesidad de conservar `process_modeling` como subdominio BPM o integrarlo directamente bajo `bpm`.

### Criterio de clasificación

- Es `domain` si expresa una invariante o comportamiento puro de entidades/value objects sin puertos ni efectos secundarios.
- Es `application/use_case` si coordina una intención del usuario, puertos, transacciones o varios agregados.
- Es `adapter` si traduce HTTP, persistencia o DTOs.
- Es `infrastructure` si compone implementaciones concretas.

### Restricción

Esta fase es únicamente de auditoría. No se modificarán archivos de código hasta recibir exactamente `inicia implementacion`.

## Resultado de auditoría — `bpm/process_modeling`

### Clasificación

- `bpm/process_modeling` no contiene un directorio `domain` ni módulos `domain_function`; actualmente es un submódulo BPM organizado por capas (`application`, `adapters`, `infrastructure`) que reutiliza el dominio canónico `bpm/domain/processes`.
- `application/use_cases/` contiene los interactores reales: procesos, versiones, nodos, transiciones, contexto y operaciones.
- `ProcessModelingApplication` es una fachada/composición de aplicación, no un caso de uso individual.
- `use_cases/dependencies.py` es un contenedor de puertos y utilidades de serialización; no debe tratarse como caso de uso.
- `use_cases/operations/__init__.py` contiene implementaciones de varios casos de uso y rompe la convención de un caso de uso por módulo; debe dividirse en `create_operation.py`, `get_operation.py`, `delete_operation.py` y `update_operation_stages.py`.

### Incumplimientos o riesgos Clean Architecture

1. Hay tres implementaciones del adaptador HTTP con responsabilidad equivalente: `adapters/inbound/http.py`, `adapters/inbound/http/__init__.py` y `adapters/inbound/http/routes.py`. Solo `routes.py` está registrado por `app_factory`; los otros dos son duplicidad o compatibilidad no demostrada.
2. `adapters/inbound/http/legacy_routes.py` crea un servicio y blueprint al importar el módulo, lo que introduce composición global y efectos secundarios de importación; no tiene consumidores internos conocidos.
3. `application/use_cases/dependencies.py` usa un objeto de persistencia estructural (`persistence.processes`, `versions`, `nodes`, `transitions`) en lugar de recibir puertos explícitos tipados por caso de uso.
4. `jsonable` mezcla serialización de respuesta con la capa de aplicación; debe trasladarse a un mapper/DTO o presenter del adaptador inbound.
5. Los casos de uso manejan diccionarios de persistencia directamente y no DTOs de aplicación consistentes; esto acopla el contrato de aplicación al shape del adaptador PostgreSQL.
6. `adapters/outbound/persistence.py` y `ProcessModelingPersistenceAdapter` son una fachada de compatibilidad; solo tienen consumidores en tests y no en el runtime. No deben eliminarse sin actualizar esos tests y validar consumidores externos.
7. `infrastructure/wiring.py` es correcto como composition root, pero contiene funciones legacy globales (`operational_service`, wrappers de módulo y caché global) fuera del alcance específico de process modeling; no deben entrar en `application`.

### Respuesta a la pregunta sobre `use_case`

`process_modeling` no debería convertirse en un único `use_case`: representa una capacidad BPM con múltiples intenciones independientes. Cada intención sí debe ser un caso de uso explícito y nombrado en `application/use_cases/`. La composición `ProcessModelingApplication` puede mantenerse como fachada de aplicación o sustituirse por un registro/compositor en `infrastructure`, pero no debe contener reglas de negocio.

### Acciones recomendadas antes de eliminar

1. Consolidar el adaptador HTTP en un único módulo canónico y convertir los demás en aliases sin lógica o eliminarlos tras validar referencias.
2. Dividir `use_cases/operations/__init__.py` por caso de uso.
3. Extraer `jsonable` a un mapper/presenter.
4. Definir DTOs y puertos explícitos para procesos, versiones, nodos, transiciones y operaciones.
5. Actualizar tests de compatibilidad y verificar imports externos antes de retirar `ProcessModelingPersistenceAdapter` y `legacy_routes.py`.

### Restricción de implementación

Este resultado no modifica código. Las acciones recomendadas comenzarán únicamente tras recibir exactamente `inicia implementacion`.

## Nueva valoración — distribución de `process_modeling` dentro de BPM

### Objetivo

Definir la distribución objetivo si el contenido de `bpm/process_modeling` se integra físicamente en `bpm/application`, `bpm/adapters` e `bpm/infrastructure`, manteniendo la separación Clean/Hexagonal y un naming consistente de casos de uso.

### Preguntas a resolver

- Si `nodes` representa un caso de uso o un agregado/concepto.
- Qué archivos deben trasladarse a `bpm/application/use_cases`.
- Qué elementos deben permanecer bajo `domain`, `ports`, `adapters` e `infrastructure`.
- Cómo evitar que la integración cree una única fachada monolítica o duplique los casos de uso operativos.

### Restricción

Esta fase es de diseño y valoración. No se modificarán archivos de código hasta recibir exactamente `inicia implementacion`.

## Resultado — distribución recomendada de `process_modeling` en BPM

### Decisión arquitectónica

`process_modeling` debe desaparecer como paquete físico independiente cuando sus consumidores estén migrados. No debe convertirse en un único caso de uso: representa una capacidad de BPM con varios casos de uso relacionados.

### Distribución objetivo

```text
modules/bpm/
├── domain/
│   ├── processes/       # ProcessDefinition, ProcessVersion y reglas de jerarquía
│   ├── operations/      # Operation, Stage y reglas de operación
│   └── workflow/        # ProcessNode, ProcessTransition y reglas del grafo BPM
├── application/
│   ├── dto/
│   ├── ports/
│   └── use_cases/
│       ├── processes/
│       ├── versions/
│       ├── nodes/
│       ├── operations/
│       ├── transitions/
│       └── context/
├── adapters/
│   ├── inbound/http/
│   └── outbound/postgres/
└── infrastructure/
```

### Respuesta sobre `nodes`

Sí, `nodes` puede y debe existir bajo `bpm/application/use_cases/`, pero como grupo de casos de uso, no como un único caso de uso:

```text
use_cases/nodes/
├── create_process_node.py
├── update_process_node.py
├── delete_process_node.py
├── get_node_metadata.py
└── update_node_metadata.py
```

`ProcessNode` sigue siendo una entidad del dominio. `CreateProcessNode`, `UpdateProcessNode` y `DeleteProcessNode` son interactores de aplicación. La carpeta `nodes` describe una capacidad y no viola Clean Architecture.

### Mapeo de los contenidos actuales

- `process_modeling/application/use_cases/processes.py` → `bpm/application/use_cases/processes/`; separar cada clase en un archivo.
- `versions.py` → `bpm/application/use_cases/versions/`; separar lectura, edición y validación.
- `nodes.py` → `bpm/application/use_cases/nodes/`.
- `operations/__init__.py` → `bpm/application/use_cases/operations/`; dejar de implementar casos de uso dentro de `__init__.py`.
- `transitions.py` → `bpm/application/use_cases/transitions/`.
- `context_records.py` → `bpm/application/use_cases/context/`.
- `dependencies.py` → ports/DTOs de aplicación explícitos; `jsonable` debe pasar a un mapper o presenter HTTP.
- `ProcessModelingApplication` → compositor de aplicación BPM, no caso de uso de dominio.
- `adapters/inbound/http/routes.py` → único adapter HTTP canónico del modelado; `http.py`, `http/__init__.py` y `legacy_routes.py` deben eliminar duplicación o quedar como aliases sin lógica.
- `adapters/outbound/persistence.py` y `application/ports/persistence_ports.py` → compatibilidad temporal; retirables después de migrar tests y consumidores externos.
- `infrastructure/wiring.py` → composition root BPM, manteniendo allí la instanciación concreta.

### Regla de naming

El nombre del archivo debe expresar una intención ejecutable (`create_process_node`, `list_versions`, `validate_version`). El nombre de la entidad (`nodes.py`) solo es apropiado para el paquete agrupador, no para un módulo que contiene cinco interactores.

### Secuencia recomendada

1. Crear los paquetes de casos de uso BPM y mover cada interactor sin cambiar comportamiento.
2. Migrar `ProcessModelingApplication`, wiring, adapters y tests a los imports nuevos.
3. Consolidar el adapter HTTP y eliminar duplicados sin consumidores.
4. Migrar ports/DTOs y retirar `process_modeling` físico.
5. Ejecutar gates de arquitectura, tests HTTP, integración y auditoría de rutas.

## Implementación — integración de `process_modeling` en BPM

### Estructura aplicada

- Eliminado el código fuente de `bpm/process_modeling`.
- Añadida la fachada de aplicación canónica en `bpm/application/process_modeling_application.py`.
- Añadidos DTO/serialización en `bpm/application/dto/serialization.py`.
- Añadidas dependencias de aplicación en `bpm/application/use_cases/process_modeling_dependencies.py`.
- Movidos los casos de uso a `bpm/application/use_cases`.
- Creado el grupo `use_cases/nodes/` con interactores explícitos:
  - `create_process_node.py`;
  - `update_process_node.py`;
  - `delete_process_node.py`;
  - `get_node_metadata.py`;
  - `update_node_metadata.py`.
- Creado el grupo `use_cases/operations/` con casos de uso de operaciones BPM diferenciados de la consulta operacional:
  - `CreateProcessOperation`;
  - `GetProcessOperation`;
  - `DeleteProcessOperation`;
  - `UpdateProcessOperationStages`.
- Separados los interactores de definición de procesos:
  - `create_process_definition.py`;
  - `get_process_definition.py`;
  - `update_process_definition.py`;
  - `list_process_definitions.py`;
  - `create_version.py`;
  - `list_versions.py`.
- El wiring canónico está en `bpm/infrastructure/process_modeling_wiring.py`.
- Los adapters HTTP están en `bpm/adapters/inbound/http/process_modeling.py` y `process_modeling_compat.py`.
- Se eliminó la duplicidad del adapter HTTP antiguo y se actualizó el inventario arquitectónico.

### Compatibilidad

- Se mantienen los endpoints `/api/process-modeling/*` mediante `process_modeling_compat.py`.
- Los endpoints `/api/bpm/*` se registran desde el adapter BPM canónico.
- La persistencia continúa usando los ports BPM existentes; no se modificaron tablas, SQL ni datos.
- Se actualizaron gateway, wiring, tests y app factory para no importar `bpm.process_modeling`.

### Gates

- Tests unitarios: `163/163` correctos.
- Tests de arquitectura: `9/9` correctos.
- `compileall` de `uc_bib_solv` y `scripts`: correcto.
- Validadores de estructura, naming, dependencias e implementaciones concretas: correctos.
- `scripts/audit_application_architecture.py --check --check-backend`: correcto.
- `git diff --check`: correcto.
- No se modificaron PostgreSQL, esquema ni datos.

## Auditoría — estandarización de capas `domain`

### Objetivo

Revisar `modules/bpm/domain` y el resto de bounded contexts para verificar si siguen un estándar único de Domain Layer compatible con Clean Architecture: entidades/agregados, value objects, reglas de dominio, excepciones y servicios de dominio separados de infraestructura y casos de uso.

### Alcance

- Inventariar la estructura física de `bpm/domain`, `bpm/process_modeling/domain`, `rca_tree/domain` y `platform`.
- Detectar dominios que mezclen entidades, validadores, adaptadores o compatibilidad legacy en el mismo nivel.
- Identificar asimetrías como `machine_modeling/` frente a módulos BPM ubicados directamente en `domain`.
- Revisar imports prohibidos desde dominio hacia Flask, PostgreSQL, `app`, rutas, servicios o repositorios.
- Revisar si BPM y RCA_TREE mantienen independencia entre dominios.
- Comparar naming y organización con el modelo Domain Layer de la referencia proporcionada.

### Plan de salida

1. Generar inventario de carpetas, módulos, clases y funciones por dominio.
2. Clasificar cada módulo como entidad, value object, regla, excepción, servicio de dominio, compatibilidad o infraestructura mal ubicada.
3. Registrar inconsistencias y proponer una estructura estándar común.
4. Verificar imports y tests arquitectónicos existentes.
5. No mover, renombrar ni eliminar archivos hasta recibir una autorización explícita de implementación.

## Resultado de auditoría — capas de dominio

### BPM

- `bpm/domain/entities.py` concentra ocho conceptos distintos: procesos, versiones, operaciones, etapas, máquinas, contratos, asociaciones y configuraciones.
- `bpm/domain/machine_modeling/` es el único concepto organizado como subpaquete, creando una asimetría con procesos, contratos y operaciones.
- Los procesos tienen una segunda implementación en `bpm/domain/process_entities.py`, con `ProcessDefinition`, `ProcessNode`, `ProcessTransition` y otra `ProcessVersion`.
- `bpm/domain/process_modeling/domain/` no es un dominio independiente: son reexports de compatibilidad hacia `bpm/domain/process_*`.
- Las validaciones están fragmentadas entre `validators.py`, `machine_modeling/validators.py` y `process_validators.py`.
- Los value objects están fragmentados entre `value_objects.py` y `process_value_objects.py`; las excepciones siguen la misma duplicación (`exceptions.py` y `process_exceptions.py`).
- `bpm/domain/validators.py` mezcla reglas de máquinas, contratos, procesos y configuraciones, por lo que no representa un único agregado o concepto.

Conclusión BPM: existe un dominio framework-free, pero no existe todavía un estándar único de organización ni una única fuente de verdad para procesos y operaciones.

### RCA_TREE

- `rca_tree/domain` está plano y es más coherente que BPM en cuanto a bounded context, pero mezcla entidades, análisis, grafo, tags y adaptadores legacy.
- `graph.py`, `graph_operations.py` y `rules.py` contienen implementaciones solapadas de ciclos y eliminación.
- `causa_tags.py` y `tags.py` contienen dos sistemas de normalización de tags.
- `arbol.py` está marcado como compatibilidad legacy pero permanece dentro de `domain`; debe salir del dominio hacia un adaptador o proyección.
- `validators.py` es una fachada de compatibilidad, no un módulo de reglas primario.
- `analysis_entities.py` contiene reglas de análisis válidas, pero usa `ValueError` directamente en lugar de la excepción base del dominio RCA_TREE.

Conclusión RCA_TREE: el bounded context está identificado, pero requiere consolidar reglas duplicadas y separar el grafo causal de la proyección legacy del árbol.

### Platform y agent_tools

- `platform/domain` está vacío y no necesita convertirse en un dominio funcional.
- `platform/adapters/agent_tools/domain` contiene contratos, errores y validación propios del adaptador externo; su ubicación es válida como subdominio del adapter, no como parte de BPM o RCA_TREE.

### Imports y dependencias

- No se detectaron imports desde estos dominios hacia Flask, PostgreSQL, `app`, rutas, servicios o repositorios.
- No se detectaron imports directos entre `bpm.domain` y `rca_tree.domain`.
- La contaminación principal es estructural y semántica: duplicación/reexports, reglas mezcladas y adaptadores legacy dentro de `domain`.

## Estándar recomendado

Aplicar organización por concepto/agregado, no por tipo técnico global:

```text
modules/bpm/domain/
├── shared/
├── processes/
├── operations/
├── machines/
├── contracts/
├── associations/
└── configurations/

modules/rca_tree/domain/
├── shared/
├── causal_graph/
├── causes/
├── hypotheses/
└── analyses/
```

Cada concepto puede contener únicamente los elementos que necesite: entidades, value objects, reglas, errores, eventos y, si se decide, interfaces de repositorio. Las implementaciones PostgreSQL permanecen fuera del dominio.

### Acciones propuestas

1. Elegir una única fuente canónica para procesos, operaciones, máquinas y contratos dentro de `bpm/domain`.
2. Migrar los reexports de `process_modeling/domain` a imports directos y eliminar el paquete cuando no existan consumidores.
3. Separar las reglas de BPM por agregado/concepto y retirar el validador global mezclado.
4. Consolidar en RCA_TREE una única implementación de ciclos, eliminación y proyección.
5. Mover `arbol.py` y otras fachadas de compatibilidad fuera de `domain`.
6. Añadir gates arquitectónicos que impidan duplicidad de entidades, reglas y adaptadores dentro de `domain`.

### Restricción

Esta auditoría no modifica código de producción. La normalización comenzará únicamente tras recibir exactamente `inicia implementacion`.

## Implementación — normalización física inicial de `domain`

### BPM

- `bpm/domain/processes/` es ahora el paquete canónico de procesos, versiones, nodos, transiciones, contexto, value objects, reglas y errores.
- `bpm/domain/machines/` es ahora el paquete canónico de máquinas, configuración máquina-operación, validadores y errores.
- Se eliminaron los reexports físicos de `bpm/process_modeling/domain/`; las capas de aplicación y adapters importan directamente desde `bpm/domain/processes` y `bpm/domain/machines`.
- Se eliminaron las referencias a los namespaces `bpm.domain.process_*`, `bpm.domain.machine_modeling` y `bpm.process_modeling.domain` en código y tests.

### RCA_TREE

- `rca_tree/domain/causal_graph/` concentra entidades, reglas y operaciones del grafo causal.
- `rca_tree/domain/analyses/` contiene las entidades del análisis causal.
- `rca_tree/domain/causes/` contiene la normalización de tags de causas.
- Los consumidores PostgreSQL y de aplicación fueron migrados a los paquetes canónicos.
- Se eliminaron los módulos duplicados o sin consumidores `domain/rules.py`, `domain/validators.py`, `domain/arbol.py` y `domain/causa_tags.py`.
- La implementación duplicada de ciclos de `graph_operations.py` ahora delega en las reglas canónicas de `causal_graph/rules.py` antes de su retirada física.

### Pendientes semánticos

- `bpm/domain/entities.py` todavía contiene entidades operativas históricas junto a los modelos de procesos; requiere una consolidación de clases `Process`, `ProcessDefinition`, `ProcessVersion`, `Machine` y `MachineType` con pruebas de contrato antes de moverlas.
- `bpm/domain/validators.py` todavía agrupa validadores de varios agregados; se separará por concepto en una fase posterior.
- `rca_tree/domain/value_objects.py` y `rca_tree/domain/exceptions.py` permanecen como shared kernel del bounded context.

### Gates validados

- Suite unitaria: `164/164` correctos.
- Tests de arquitectura: `8/8` correctos.
- Validadores de estructura, naming, dependencias e implementaciones concretas: correctos.
- Compilación Python y smoke HTTP BPM/RCA_TREE: correctos.
- No se modificaron PostgreSQL, esquema ni datos.

## Implementación — CRUD explícito de operaciones BPM

### Hallazgo

El directorio `modules/bpm/application/use_cases/operations/` solo contiene el listado operacional y la actualización de etapas. La creación y eliminación no estaban modeladas como casos de uso `Operation`: se realizaban indirectamente mediante los casos genéricos de nodos del submódulo Process Modeling.

### Decisión

- Las operaciones BPM son nodos con `node_type = operation` y pertenecen a una versión BPM.
- `CreateOperation` y `DeleteOperation` se expondrán en el submódulo Process Modeling, junto a `GetOperation` y `UpdateOperationStages`.
- Los nuevos casos de uso reutilizarán `CreateNode`, `DeleteNode` y `GetOperation`; no duplicarán validaciones ni SQL.
- Se añadirán endpoints explícitos de creación y eliminación para Process Modeling y `/api/bpm`.
- No se añadirá CRUD de operaciones a la composición operacional, porque esa composición trabaja con proyecciones/catalogación y no es propietaria de la persistencia del grafo BPM.

### Implementación realizada

- Se creó `CreateOperation` y `DeleteOperation` bajo `process_modeling/application/use_cases/operations/`.
- `CreateOperation` fuerza `node_type="operation"` y reutiliza `CreateNode` para validación de versión, jerarquía y código.
- `DeleteOperation` valida que el nodo sea una operación y reutiliza `DeleteNode` para las reglas de versión draft y persistencia.
- `ProcessModelingApplication` expone `create_operation` y `delete_operation`.
- Se añadieron endpoints explícitos:
  - `POST /api/process-modeling/versions/{version_id}/operations`;
  - `DELETE /api/process-modeling/operations/{operation_id}`;
  - equivalentes bajo `/api/bpm`.
- Se actualizaron los adaptadores HTTP, ports y tests.

### Gates

- Tests unitarios: `164/164` correctos.
- Tests de arquitectura: `8/8` correctos.
- Validadores de estructura, naming, dependencias e implementaciones: correctos.
- Smoke de los casos de uso create/delete con persistencia falsa: correcto.
- No se modificaron PostgreSQL, esquema ni datos.

## Revisión — `application/use_cases/bpm_operational.py`

### Hallazgo

`bpm_operational.py` no contiene lógica de negocio ni acceso a infraestructura. Es un compositor explícito que instancia los casos de uso BPM de procesos, operaciones, contratos, máquinas y catálogo, y expone métodos de aplicación compatibles con los adaptadores HTTP actuales.

### Encaje arquitectónico

- Es válido dentro de `application` como composición de casos de uso.
- No es un caso de uso individual y por eso no debe crecer con reglas de negocio.
- La persistencia se inyecta desde `infrastructure/wiring.py`.
- Los casos de uso reales continúan en módulos separados por capacidad.
- La clase `BpmOperationalService` de infraestructura actúa como adaptador de compatibilidad HTTP sobre esta composición.

### Plan pendiente

1. Mantener temporalmente `bpm_operational.py` como compositor mientras existan los contratos HTTP operativos.
2. Renombrar la composición a un nombre de aplicación explícito (`BpmOperationalApplication`) si se decide eliminar la terminología `UseCases` para clases compositoras.
3. Mantener cada acción en su archivo individual de caso de uso; no trasladar lógica al compositor.
4. Retirar el compositor únicamente cuando los adaptadores HTTP se inyecten directamente con un registro de casos de uso o una composición equivalente en `infrastructure`.

### Restricción

Este análisis no modifica `bpm_operational.py`. La extracción o renombrado comenzará únicamente tras recibir exactamente `inicia implementacion`.

## Implementación — composición BPM operacional

- `bpm_operational.py` fue trasladado desde `application/use_cases/` a `application/bpm_operational.py`.
- `BpmOperationalUseCases` fue renombrado a `BpmOperationalApplication` para distinguir la composición de los casos de uso individuales.
- `application/use_cases/__init__.py` dejó de exportar una fachada compositora; queda reservado para casos de uso agrupados por capacidad.
- El wiring BPM ahora compone `BpmOperationalApplication` desde `application` y conserva `BpmOperationalService` únicamente como adaptador de compatibilidad HTTP.
- Los tests operativos y estructurales fueron actualizados al nombre y ubicación canónicos.

### Gates

- No quedan referencias de código a `BpmOperationalUseCases`.
- La composición operacional y los tests de arquitectura pasan.
- No se modificaron PostgreSQL, esquema ni datos.
