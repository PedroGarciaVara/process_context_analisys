# Requerimiento 19 — KPI de contrato y plantilla RCA_TREE única

**Estado:** `spec_validada`  
**Autor:** `requirements-agent`  
**Fecha:** 2026-08-30  

## Overview

### Contexto

La aplicación mantiene contratos BPM en la tabla `contrato` y árboles RCA en
las tablas `node`, `relationship`, `causa` e `hipotesis`. Actualmente un
contrato puede existir sin una estructura RCA inicial, el KPI se denomina
`metrica`, y los análisis RCA consultan plantillas derivadas del conjunto de
causas existentes. El flujo de contratos expuesto por backend es el blueprint
de BPM bajo `/api/bpm/contracts`; el flujo RCA está bajo
`/api/rca-tree/...`.

### Objetivo

Integrar el criterio KPI/validación del contrato con una única plantilla RCA
por contrato. La creación y edición del contrato deberán mantener sincronizada
la pareja causa-hipótesis inicial. Los análisis RCA deberán consultar la
plantilla actual sin snapshots y representar por identidad persistente las
diferencias entre la plantilla actual y los elementos participantes del
análisis.

### Actores

- Usuario de la aplicación: crea, consulta, edita, analiza y elimina contratos
  y árboles RCA.
- Backend BPM/RCA_TREE: valida reglas de negocio, orquesta casos de uso y
  controla transacciones.
- PostgreSQL: persiste contratos, nodos, relaciones, causas, hipótesis y
  análisis.

### Glosario y nombres canónicos observados

- **Contrato:** registro `contrato`; identificador `contrato.id`.
- **Alcance BPM:** exactamente uno entre `contrato.bpm_process_id` (proceso)
  y `contrato.bpm_node_id` (operación BPM, nodo `pm_process_node` de tipo
  `operation`). `contrato.proceso_id` es la referencia canónica a `proceso`.
- **Plantilla RCA:** el conjunto estructural vigente vinculado al contrato:
  nodo `CONTRACT`, una `causa` raíz inicial y una `hipotesis` inicial, junto
  con sus filas `node` y `relationship`.
- **Análisis RCA:** registro `analisis_causas`, con resultados en
  `analisis_resultado` y/o detalle en `analisis_causas_detalle`.
- **KPI:** nuevo campo lógico `kpi_description`, almacenado en el contrato;
  sustituye al nombre funcional actual `metrica`.
- **Estructura inicial:** `CONTRACT -> CAUSE -> HYPOTHESIS`, con relaciones
  `CONTRACT--CAUSES-->CAUSE` y `CAUSE--HAS_HYPOTHESIS-->HYPOTHESIS`.

### Alcance

Incluye backend, dominio BPM/RCA_TREE, persistencia PostgreSQL, migración de
datos, contratos HTTP existentes y las vistas JavaScript de contratos, árbol
de causa y análisis. Se reutilizan los módulos existentes; no se crea un
nuevo bounded context.

## Functional Requirements

### FR-01 — Modelo funcional del contrato y alcance BPM

1. Cada contrato DEBERÁ pertenecer exactamente a un proceso BPM o a una
   operación BPM, nunca a ambos ni a ninguno.
2. El contrato DEBERÁ considerarse vigente desde su creación. No habrá
   versionado funcional; editar actualizará el mismo `contrato.id`.
3. `kpi_description` DEBERÁ ser obligatorio. La cadena exactamente vacía
   (`""`) será inválida; el comportamiento para `NULL`, ausente o espacios
   deberá alinearse con la validación técnica existente y quedar cubierto por
   pruebas, sin convertir una cadena no vacía en inválida por recorte no
   especificado.
4. `kpi_args` y `kpi_function` serán texto opcional, inicialmente `""`, se
   devolverán y mostrarán en UI, y no se ejecutarán en este requerimiento.
5. Los campos de alcance y sus validaciones se implementarán en el dominio
   BPM y en el caso de uso, no únicamente en la vista.

### FR-02 — Plantilla RCA única por contrato

1. Todo contrato nuevo DEBERÁ crear atómicamente su plantilla inicial:
   - un nodo lógico `CONTRACT` asociado al contrato;
   - una causa raíz en `causa` y su nodo `CAUSE`;
   - una hipótesis en `hipotesis` y su nodo `HYPOTHESIS`;
   - la relación estructural contrato-causa con semántica
     `CONTRACT--CAUSES-->CAUSE`;
   - la relación estructural causa-hipótesis con semántica
     `CAUSE--HAS_HYPOTHESIS-->HYPOTHESIS`.
2. El mapeo inicial DEBERÁ ser exacto:

   | Contrato | Causa | Hipótesis |
   |---|---|---|
   | `nombre` | `nombre` | `nombre` y `descripcion` |
   | `objetivo` | `descripcion` | `nombre` y `descripcion` |
   | `kpi_description` | — | `nombre` y `descripcion` |
   | `kpi_args` | — | `kpi_args` |
   | `kpi_function` | — | `kpi_function` |

   En la implementación, los campos persistentes existentes de hipótesis que
   representen el nombre, criterio o descripción DEBERÁN mapearse sin crear
   nombres alternativos no observados; la resolución exacta de columnas debe
   respetar el DDL final validado.
3. La creación DEBERÁ usar una sola transacción PostgreSQL. Si falla el
   contrato, nodo, causa, hipótesis o relación, DEBERÁ hacerse rollback
   completo: no podrá quedar ninguna parte de la plantilla.
4. Cada contrato DEBERÁ tener una sola plantilla activa. Las operaciones de
   reutilización de nodos no DEBERÁN convertir la plantilla inicial en una
   segunda plantilla del contrato.

### FR-03 — Sincronización bidireccional

1. Editar el contrato DEBERÁ sincronizar atómicamente su causa e hipótesis
   iniciales según el mapeo de FR-02.
2. Editar la causa o hipótesis inicial DEBERÁ sincronizar los campos
   correspondientes del contrato, dentro de la misma operación transaccional.
3. Si la sincronización deja `kpi_description` exactamente vacío, o falla
   cualquier escritura relacionada, DEBERÁ rechazarse toda la operación y
   restaurarse el estado anterior.
4. Las ediciones de causas e hipótesis no iniciales DEBERÁN seguir siendo
   editables conforme al árbol RCA actual y no DEBERÁN alterar el contrato,
   salvo que sean la causa o hipótesis inicial protegida.
5. El cambio de alcance proceso <-> operación DEBERÁ conservar los IDs del
   contrato, causa e hipótesis iniciales, actualizar la vinculación BPM y no
   crear estructura ni histórico nuevos.

### FR-04 — Protección y eliminación

1. La causa raíz inicial y la hipótesis inicial DEBERÁN estar protegidas
   contra borrado desde backend y UI. El backend será la autoridad aunque se
   intente invocar directamente el endpoint actual de borrado.
2. El resto de nodos continuará sujeto a las reglas RCA existentes de ciclos,
   reutilización, descendencia y referencias de análisis.
3. Eliminar un contrato DEBERÁ eliminar en cascada su plantilla completa y
   todos sus análisis RCA, resultados, participantes y detalles asociados.
4. La eliminación DEBERÁ ser transaccional y deberá resolver las restricciones
   actuales `RESTRICT` de `analisis_resultado`, `causa.parent_id` y relaciones
   antes de borrar el contrato, sin dejar huérfanos.
5. La UI DEBERÁ solicitar confirmación explícita e informar que se eliminarán
   el árbol RCA y los análisis asociados. Cancelar no realizará ninguna
   escritura.

### FR-05 — Migración total e idempotente

1. El despliegue DEBERÁ migrar `metrica` a `kpi_description`.
2. Contratos antiguos sin métrica deberán recibir exactamente
   `Pendiente de definir KPI`.
3. Contratos existentes sin plantilla deberán recibir una plantilla inicial
   usando los datos disponibles, aunque ya tengan RCA antiguo.
4. Si ya existe el vínculo objetivo generado para un contrato por una ejecución
   previa, la migración DEBERÁ reutilizarlo y no duplicar nodos, causas,
   hipótesis ni relaciones.
5. La migración podrá ejecutarse más de una vez con el mismo resultado lógico
   y deberá registrar o devolver errores por contrato sin confirmar partes
   incompletas.
6. No se conservarán snapshots ni históricos de plantillas.
7. La divergencia actual que deberá tratarse explícitamente en la migración
   total es:
   el esquema usa `metrica`, `causa.descripcion`, `hipotesis.descripcion` y
   relaciones RCA existentes `DEPENDS_ON`/`VERIFIED_BY`; el objetivo requiere
   `kpi_description`, una hipótesis con nombre y las semánticas
   `CAUSES`/`HAS_HYPOTHESIS`. La migración deberá transformar completamente
   los datos y estructuras al modelo objetivo, reemplazando físicamente los
   campos, estructuras y semánticas legacy. No se crearán elementos
   temporales, campos de compatibilidad, snapshots ni vías legacy; no habrá
   periodo de compatibilidad.

### FR-06 — Ciclo de vida y consulta de análisis

1. `analisis_causas.estado` solo podrá ser `abierto` o `cerrado`; los nuevos
   análisis nacerán `abierto`.
2. Un análisis abierto será editable; uno cerrado será de solo lectura.
   Cerrado podrá reabrirse. Por ahora cualquier usuario podrá realizar estas
   acciones; no se añade autorización por rol.
3. Los análisis abiertos DEBERÁN consultar dinámicamente la plantilla vigente
   al cargar o refrescar; no se almacenará un snapshot de nombres,
   descripciones, KPI ni estructura.
4. Los análisis cerrados conservarán sus resultados por IDs persistentes y
   mostrarán también la comparación contra la plantilla actual, sin reescribir
   el histórico del resultado.
5. La comparación solo se hará por `causa.id` y `hipotesis.id`; no se
   compararán relaciones.
6. Elementos actuales ausentes cuando se creó el análisis DEBERÁN mostrarse
   con otro color y la marca exacta:
   `causa/hipótesis no existente en el momento del análisis`.
7. Elementos que pertenecieron al análisis pero ya no están en la plantilla
   actual DEBERÁN conservarse solo lectura y la UI DEBERÁ informar exactamente
   `X causas/hipótesis no encontradas en la plantilla actual`, con los conteos
   aplicables.

### FR-07 — Separación de responsabilidades y placement

- **Dominio BPM:** extender `uc_bib_solv/modules/bpm/domain/contracts` para
  representar KPI, argumentos, función y la invariante de alcance; las reglas
  no dependerán de Flask, SQL o Dash.
- **Aplicación BPM:** extender los casos de uso existentes bajo
  `uc_bib_solv/modules/bpm/application/use_cases/contracts` y sus puertos para
  crear, actualizar, eliminar y leer el contrato con sincronización RCA.
- **Dominio RCA_TREE:** extender
  `uc_bib_solv/modules/rca_tree/domain` para invariantes de plantilla,
  protección de nodos, comparación por identidad y estado de análisis.
- **Aplicación RCA_TREE:** extender los casos de uso existentes de causes,
  hypotheses, tree y analyses; la UI no implementará reglas de sincronización
  ni comparación de negocio.
- **Persistencia BPM:** extender
  `uc_bib_solv/modules/bpm/adapters/outbound/postgres/contrato_repo.py` y el
  adaptador operativo, usando la conexión existente de
  `uc_bib_solv/modules/platform/infrastructure/postgres.py`.
- **Persistencia RCA_TREE:** extender los adaptadores PostgreSQL existentes
  `causa_repo.py`, `hipotesis_repo.py`, `graph_sync.py`, repositorios de nodos,
  relaciones y `adapters/outbound/analysis_postgres.py`; el límite
  transaccional se expresará mediante el puerto existente de transacción.
- **HTTP:** conservar `/api/bpm/contracts` para contratos y
  `/api/rca-tree/causes`, `/api/rca-tree/hypotheses` y
  `/api/rca-tree/analyses` para RCA. Se añadirán o ampliarán respuestas solo
  cuando sean necesarias para exponer la funcionalidad, respetando el patrón
  `{status, data}` existente; no se inventarán rutas paralelas.
- **Frontend:** extender `uc_bib_solv/webapp/js/api/operational.js`,
  `analysis.js`, `causas.js`, `views/contratos_v02.js`,
  `views/causa_detalle.js`/`causa_detalle_v02.js` y
  `views/analisis_causas_v02.js`. La UI validará interacción inmediata,
  estados de carga, confirmaciones y presentación de diferencias; el backend
  validará siempre las invariantes.

### FR-08 — UX y errores

1. Las vistas de contrato deberán mostrar `kpi_description`, `kpi_args` y
   `kpi_function`; el campo KPI será obligatorio y los dos últimos mostrarán
   valor vacío inicialmente.
2. La vista de detalle RCA deberá identificar visualmente la causa y la
   hipótesis iniciales como protegidas y no ofrecer borrado para ellas.
3. La vista de análisis deberá indicar plantilla actual, estado del análisis,
   modo edición/solo lectura y diferencias por identidad.
4. Errores de validación devolverán HTTP 400 siguiendo los adaptadores
   actuales; recurso inexistente HTTP 404; transición de estado inválida o
   conflicto de edición HTTP 409; error inesperado de persistencia HTTP 500 o
   el mapeo de conflicto existente cuando el blueprint actual lo aplique.
5. Un error de transacción deberá mostrar un mensaje accionable y no presentar
   la operación como guardada.

## Non-Functional Requirements

- **Consistencia:** toda operación que cambie contrato y plantilla deberá ser
  atómica en PostgreSQL y mantener integridad referencial.
- **Idempotencia:** la migración y la generación de plantilla deberán poder
  reintentarse sin duplicados.
- **Trazabilidad:** los IDs persistentes de contrato, causa, hipótesis y
  análisis serán la única clave de comparación; no se introducirá snapshot.
- **Arquitectura:** el dominio no importará Flask, Dash, psycopg2, SQL,
  Dataiku ni módulos de infraestructura; los repositorios concretos vivirán
  en adaptadores PostgreSQL.
- **Migración total:** los campos, estructuras y vías legacy afectados por la
  migración deberán ser reemplazados físicamente por el modelo objetivo, sin
  elementos temporales, capas de compatibilidad ni periodo de coexistencia.
- **Pruebas:** deberán existir pruebas unitarias de reglas/casos de uso sin
  BBDD real y pruebas de integración PostgreSQL para constraints,
  transacciones, migración, cascada y comparación de análisis.
- **Rendimiento:** las consultas de plantilla y diferencia deberán filtrar por
  contrato/análisis y usar índices de las claves foráneas; no se establece un
  SLA nuevo en las decisiones confirmadas.

## Constraints and Assumptions

- PostgreSQL y `db_cursor()` son la infraestructura persistente vigente.
- `db_management/schema.sql` es el DDL canónico actual y las migraciones
  controladas deberán vivir en `db_management` sin modificar la conexión
  existente.
- Los módulos actuales BPM y RCA_TREE se amplían en sus boundaries existentes;
  no se crea un top-level module nuevo.
- Todo contrato se crea vigente y no se mantiene histórico de contrato ni de
  plantilla.
- Cualquier usuario puede editar/reabrir análisis por ahora.
- `kpi_args` y `kpi_function` son texto descriptivo y no ejecutable en esta
  fase.
- La relación de plantilla debe ser única por contrato; los árboles RCA
  editables adicionales siguen sujetos a las reglas actuales de reutilización.
- No se comparan relaciones entre snapshots porque no hay snapshots.
- Riesgo técnico no bloqueante: el DDL actual no contiene literalmente
  `kpi_description`, `kpi_args`, `kpi_function`, `node.name`/descripción de
  hipótesis ni `HAS_HYPOTHESIS`; la migración y el mapper deberán definir y
  dejar cubierta por el DDL validado la representación física del modelo
  objetivo, eliminando la representación legacy afectada.

## Out of Scope

- Ejecutar funciones KPI o interpretar `kpi_args`.
- Versionado, snapshots, auditoría histórica o restauración de plantillas.
- Comparación de relaciones.
- Roles, permisos por usuario, autenticación nueva o autorización adicional.
- Cambiar el motor de base de datos o la conexión PostgreSQL.
- Rediseñar el DAG RCA completo, el catálogo de máquinas o el modelado BPM no
  relacionado.
- Nuevas integraciones externas, jobs Dataiku o APIs fuera de los endpoints
  BPM/RCA_TREE existentes.

## Acceptance Criteria técnicos medibles

- **AC-01:** una prueba de creación con contrato de proceso y otra con
  operación verifican una fila `contrato`, exactamente un nodo `CONTRACT`, una
  causa raíz, una hipótesis inicial y las dos relaciones requeridas; una
  creación sin alcance o con ambos alcances responde 400.
- **AC-02:** una consulta PostgreSQL verifica que cada contrato tiene una sola
  pareja inicial identificable por vínculo persistente y que no existen
  duplicados después de repetir la operación idempotente.
- **AC-03:** crear o actualizar con `kpi_description = ''` responde 400 y una
  consulta posterior demuestra que no cambió ninguna fila de contrato, causa,
  hipótesis, nodo o relación.
- **AC-04:** editar contrato y editar causa/hipótesis inicial comprueba el
  mapeo exacto de FR-02 y que todos los IDs permanecen iguales.
- **AC-05:** cambiar `bpm_process_id` a `bpm_node_id` y volver verifica igualdad
  de `contrato.id`, causa e hipótesis y ausencia de nodos/relaciones de
  plantilla adicionales.
- **AC-06:** DELETE sobre la causa o hipótesis inicial responde error de
  negocio y conserva ambas filas; DELETE de contrato confirmado elimina el
  contrato, nodos, relaciones, causas, hipótesis y registros de
  `analisis_causas`, `analisis_resultado`, `analisis_participante` y
  `analisis_causas_detalle` asociados.
- **AC-07:** ejecutar la migración dos veces deja el mismo conteo por contrato
  y asigna exactamente `Pendiente de definir KPI` a contratos antiguos sin
  métrica.
- **AC-08:** crear un análisis produce `estado='abierto'`; actualizar a
  `cerrado` bloquea cambios de contenido, permite transición de retorno a
  `abierto`, y un estado distinto de esos dos responde 400/409 según el
  adaptador.
- **AC-09:** tras crear un análisis, añadir una causa/hipótesis a la plantilla
  hace que la consulta del análisis la muestre como nueva, con color distinto
  y la marca definida; eliminar de la plantilla un elemento referenciado por
  el análisis lo muestra solo lectura y el conteo `X` correcto.
- **AC-10:** la comparación de un análisis no emite ni persiste diferencias de
  relaciones y conserva resultados por `causa.id`/`hipotesis.id`.
- **AC-11:** las pruebas de frontera verifican que el dominio BPM/RCA_TREE no
  importa Flask, Dash, psycopg2, SQL ni infraestructura.
- **AC-12:** la UI muestra los tres campos KPI, confirmación de cascada,
  protección de nodos iniciales y estados abierto/cerrado; las pruebas HTTP
  verifican los códigos y forma de respuesta existentes.

## Questions for Clarification

No hay preguntas de negocio bloqueantes. La estrategia concreta de ejecución
de la migración se definirá en el plan técnico, pero deberá cumplir la
migración total y las restricciones de AMD-001.

## Amendments

| ID | Fecha | Enmienda | Impacto | Responsable |
|---|---|---|---|---|
| AMD-001 | 2026-08-30 | La migración será total: no se crearán elementos temporales ni de compatibilidad, no se conservarán campos, estructuras ni vías legacy y no habrá periodo de compatibilidad. | Modifica FR-05, restricciones, alcance de migración y criterios de aceptación relacionados. | Programador |

## Decision Log

| Fecha | Decisión | Responsable |
|---|---|---|
| 2026-08-30 | Cada contrato pertenece exactamente a proceso u operación BPM. | Programador |
| 2026-08-30 | Contratos vigentes, sin versionado; las ediciones reutilizan el mismo registro. | Programador |
| 2026-08-30 | `kpi_description` obligatorio; `kpi_args` y `kpi_function` opcionales, visibles y no ejecutables. | Programador |
| 2026-08-30 | Migrar `metrica`; usar exactamente `Pendiente de definir KPI` cuando falte. | Programador |
| 2026-08-30 | Crear contrato y plantilla inicial en una transacción atómica con estructura CONTRACT-CAUSE-HYPOTHESIS. | Programador |
| 2026-08-30 | Sincronización bidireccional atómica con rollback por KPI vacío o cualquier fallo. | Programador |
| 2026-08-30 | Una plantilla activa por contrato; cambio proceso/operación conserva IDs y no crea históricos. | Programador |
| 2026-08-30 | Causa e hipótesis iniciales protegidas; eliminar contrato elimina cascada RCA/análisis con confirmación UI. | Programador |
| 2026-08-30 | Migración idempotente; generar faltantes incluso con RCA antiguo, sin duplicar vínculos existentes. | Programador |
| 2026-08-30 | Análisis solo `abierto`/`cerrado`; nuevos abiertos; abiertos editables, cerrados solo lectura y reabribles; cualquier usuario. | Programador |
| 2026-08-30 | Sin snapshots; análisis abierto consulta plantilla actual dinámicamente. | Programador |
| 2026-08-30 | Comparación únicamente por IDs persistentes; no comparar relaciones; mostrar marcas y conteos definidos. | Programador |
| 2026-08-30 | AMD-001: migración total sin elementos temporales, compatibilidad ni vías legacy. | Programador |
| 2026-08-30 | Los nombres y estructuras físicas legacy observados se transforman al modelo objetivo durante la migración total; no se conservan capas legacy ni se inventan APIs paralelas. | requirements-agent, basado en inspección del repositorio |
| 2026-08-30 | El programador valida humanamente el contenido del spec y autoriza avanzar a planificación. | Programador |
| 2026-08-30 | Estado del artefacto: `spec_validada`; puede pasar a planificación. | Orchestrator |
