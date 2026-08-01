# Spec — requerimiento_01: Solve-Ishikawa — Sistema de Análisis Causal Estructurado (Fase 1)

## Metadata
- Requirement ID: `requerimiento_01`
- Estado: `spec_pendiente_validacion`
- Autor del spec: `requirements-agent`
- Fecha: 2026-05-27
- Fuente: requerimiento_01.md (estado `completo_pendiente_validacion`, gates auto-validados)

---

## Overview

El proyecto **Solve-Ishikawa** digitaliza y estructura el análisis de causa raíz (RCA) en entornos industriales. El proceso actual se realiza de forma manual, subjetiva y no reutilizable mediante diagramas de Ishikawa en papel o herramientas genéricas, generando conocimiento experto que se pierde entre análisis.

La **Fase 1** entrega una webapp local (Python + Dash + PostgreSQL) que permite a un técnico / analista industrial:
1. Definir contratos de proceso con objetivos medibles.
2. Asociar máquinas a los contratos.
3. Construir y mantener un árbol causal jerárquico (DAG) de forma interactiva desde la UI.
4. Definir hipótesis de aceptación / rechazo sobre las causas y gestionar su estado.
5. Crear, listar, cerrar y reabrir sesiones de análisis causal sobre un contrato, reutilizando el árbol causal existente como plantilla de análisis, desde la nueva página `analisis_causas`.
6. Registrar trazabilidad de evaluación, comentario y fecha sobre causas e hipótesis durante cada sesión.
7. Persistir todo en PostgreSQL y reconstruir el árbol y el historial de análisis íntegramente para cualquier proceso / contrato.

**Stack Fase 1:** Python + Dash (local) + PostgreSQL local. Sin Dataiku, sin ML, sin LLM, sin integraciones externas.

La Fase 1 es la base de conocimiento causal estructurado sobre la que se añadirán capacidades analíticas en fases posteriores (scoring Fase 2, ML/LLM Fase 3, motor MCP Fase 4).

---

## Functional Requirements

### FR-01: Gestión CRUD de Procesos

El sistema permite crear, consultar, editar y eliminar procesos industriales que sirven de contenedor de contratos.

- Un proceso tiene: `id` (PK auto) y `nombre` (TEXT NOT NULL).
- El nombre es obligatorio; el sistema rechaza la creación sin nombre.
- El sistema lista todos los procesos existentes.
- La eliminación de un proceso que tenga contratos asociados debe ser rechazada (o se eliminan en cascada solo si no hay datos de árbol — ver FR-02 y la regla CASCADE).
- Se utiliza la tabla `proceso`.

### FR-02: Gestión CRUD de Contratos

El sistema permite crear, consultar, editar, activar/desactivar y versionar contratos de rendimiento asociados a un proceso.

- Un contrato tiene: `id` (PK), `proceso_id` (FK → proceso.id, obligatorio), `nombre` (NOT NULL), `metrica` (TEXT), `objetivo` (TEXT libre, decisión D-11), `version` (INT DEFAULT 1), `activo` (BOOLEAN DEFAULT TRUE).
- El nombre y el proceso_id son obligatorios; el sistema rechaza la creación si faltan.
- El sistema permite activar o desactivar un contrato (toggle del campo `activo`).
- El sistema asigna `version = 1` al crear el contrato.
- El sistema lista contratos de un proceso con filtro por estado activo/inactivo.
- Se utiliza la tabla `contrato`.

### FR-03: Gestión CRUD de Máquinas

El sistema permite crear, consultar, editar y eliminar máquinas físicas del entorno industrial.

- Una máquina tiene: `id` (PK auto) y `nombre` (TEXT NOT NULL). Sin planta, tipo ni linea en Fase 1 (decisión D-10).
- El nombre es obligatorio; el sistema rechaza la creación sin nombre.
- El sistema lista todas las máquinas disponibles.
- Se utiliza la tabla `maquina`.

### FR-04: Asociación N:N Contrato ↔ Máquina

El sistema permite asociar y desasociar una o varias máquinas a un contrato.

- La relación se persiste en la tabla `contrato_maquina` (PK compuesta: `contrato_id` + `maquina_id`).
- La relación es N:N: un contrato puede tener muchas máquinas y una máquina puede estar en muchos contratos.
- El sistema permite desasociar una máquina de un contrato sin eliminar la máquina ni el contrato.
- El sistema muestra las máquinas actualmente asociadas a un contrato.
- El sistema usa `ON DELETE CASCADE` en `contrato_maquina` respecto al contrato.

### FR-05: Gestión CRUD de Causas (nodos del árbol base)

El sistema permite crear, consultar, editar y eliminar causas dentro del árbol causal base de un contrato.

- Una causa tiene: `id` (PK), `contrato_id` (FK → contrato.id, NOT NULL), `parent_id` (FK → causa.id, nullable, ON DELETE CASCADE — decisión D-04), `nombre` (TEXT NOT NULL), `descripcion` (TEXT), `tipo` (CHECK IN ('causa', 'efecto')), `categoria` (TEXT — máquina, método, material, mano de obra, entorno).
- El nombre y el contrato_id son obligatorios.
- Las causas de primer nivel tienen `parent_id = NULL`.
- Al crear un nodo hijo, el sistema hereda automáticamente `contrato_id` del nodo padre.
- El sistema valida que `parent_id` pertenece al mismo contrato que el nodo hijo.
- El borrado de una causa elimina recursivamente todos sus descendientes (ON DELETE CASCADE, silencioso — decisión D-04).
- El sistema no expone en Fase 1 ninguna acción funcional para marcar una causa como causa raíz.
- Se utilizan las tablas `causa` con índices en `causa(contrato_id)` y `causa(parent_id)`.

### FR-06: Validación de Integridad del Árbol Causal (DAG)

El sistema garantiza en todo momento que el árbol causal es un DAG válido (grafo acíclico dirigido).

- El sistema valida en backend Python la ausencia de ciclos antes de cada inserción de causa hija. La validación de ciclos no se delega a SQL (decisión D-02).
- El sistema rechaza cualquier inserción o modificación que introduzca un ciclo en el árbol, devolviendo un mensaje de error claro al usuario.
- El sistema valida que `parent_id` existe y pertenece al mismo contrato antes de insertar.
- Las operaciones de borrado recursivo se realizan dentro de una transacción de base de datos.

### FR-07: Gestión de sesiones de análisis causal (`analisis_causas`)

La nueva página `analisis_causas` permite crear, consultar, listar, cerrar y reabrir sesiones de análisis causal asociadas a un contrato.

- Una sesión tiene: `id` (PK), `contrato_id` (FK → contrato.id, NOT NULL), `estado` (CHECK IN ('abierto', 'cerrado') DEFAULT 'abierto'), `fecha_inicio` (TIMESTAMP), `fecha_cierre` (TIMESTAMP nullable), `fecha_reapertura` (TIMESTAMP nullable).
- El sistema permite múltiples sesiones por contrato.
- El sistema lista sesiones abiertas y cerradas de un contrato y permite filtrar por estado.
- El sistema reutiliza el árbol causal del contrato seleccionado como plantilla de análisis para cada sesión.
- `fecha_inicio`, `fecha_cierre` y `fecha_reapertura` se gestionan automáticamente como parte del ciclo de vida de la sesión.
- El sistema permite reabrir una sesión cerrada sin perder su historial de trazabilidad ni crear una nueva sesión duplicada.
- El sistema usa la sesión como contenedor de trazabilidad para agregaciones por proceso, contrato, máquina asociada y plantilla de contrato.

### FR-08: Trazabilidad de análisis (`analisis_causas_detalle`)

El sistema permite registrar la evaluación y el comentario de cada causa e hipótesis dentro de una sesión de análisis causal.

- Un detalle de análisis tiene: `id` (PK), `analisis_causa_id` (FK → analisis_causas.id, NOT NULL), `tipo_elemento` (CHECK IN ('causa', 'hipotesis')), `causa_id` (FK → causa.id, nullable), `hipotesis_id` (FK → hipotesis.id, nullable), `evaluacion` (TEXT), `comentario` (TEXT), `fecha_evaluacion` (TIMESTAMP).
- Para causas, `evaluacion` solo puede tomar los valores `retenida` o `evaluada`.
- Para hipótesis, `evaluacion` solo puede tomar los valores `validada` o `rechazada`.
- `fecha_evaluacion` se registra automáticamente al persistir cada detalle de análisis.
- Cada causa e hipótesis incluida en una sesión puede tener 0 o N registros de trazabilidad según el flujo funcional, pero cada registro individual pertenece a una única sesión.
- La estructura de las causas y las hipótesis es de solo lectura en la página de análisis; lo único editable son la evaluación y el comentario de trazabilidad.
- El sistema permite resumir la misma sesión tras reabrirla sin perder sus registros previos.

El sistema permite definir hipótesis de aceptación o rechazo sobre causas, y gestionar su estado.

- Una hipótesis tiene: `id` (PK), `causa_id` (FK → causa.id ON DELETE CASCADE, NOT NULL), `descripcion` (TEXT NOT NULL), `tipo` (CHECK IN ('aceptacion', 'rechazo')), `criterio_validacion` (TEXT — texto libre), `estado` (CHECK IN ('pendiente', 'validada', 'rechazada') DEFAULT 'pendiente').
- La descripción es obligatoria; el sistema rechaza la creación sin descripción.
- El sistema valida que la causa referenciada existe; rechaza la hipótesis si no existe.
- Una causa puede tener 0 o N hipótesis.
- El sistema permite cambiar el estado de una hipótesis entre: pendiente → validada, pendiente → rechazada, validada → rechazada (y viceversa).
- No hay tabla EVIDENCIA en Fase 1 (decisión D-06); el campo `criterio_validacion` es el sustituto textual.
- El flujo CRUD de hipótesis no expone campos de evaluación, comentario o fecha; esos datos pertenecen exclusivamente a `analisis_causas_detalle`.
- Se utiliza la tabla `hipotesis`.

### FR-09: Visualización del Árbol Causal (árbol de tarjetas — decisión D-07)

El sistema muestra el árbol causal de un contrato como árbol de tarjetas jerárquico interactivo usando `dash-cytoscape` o componente HTML recursivo.

- El usuario selecciona un proceso y un contrato; el sistema reconstruye y muestra el árbol completo desde PostgreSQL.
- Los nodos se diferencian visualmente por tipo: causa (color A) y efecto (color B).
- El sistema no muestra ni permite editar marca de causa raíz en Fase 1.
- Si un nodo tiene al menos una hipótesis en estado `validada`, el sistema muestra el borde del nodo en verde.
- Si un nodo tiene al menos una hipótesis en estado `rechazada` (y ninguna validada), el sistema muestra el borde del nodo en rojo.
- El usuario puede expandir y colapsar ramas del árbol.
- No se implementa visualización tipo espina de pescado clásica (decisión D-07).

### FR-10: Construcción Interactiva del Árbol desde la UI

El sistema permite construir y modificar el árbol causal directamente desde la interfaz sin salir de la vista del árbol.

- **Añadir hijo:** Click en botón "+" de una tarjeta → crea nueva causa hija con `parent_id` = tarjeta actual y `contrato_id` heredado → la nueva tarjeta aparece inmediatamente en el árbol.
- **Editar nodo:** Click en una tarjeta → abre panel / modal con campos: nombre, tipo (causa/efecto), categoría, descripción → al confirmar, el sistema persiste en PostgreSQL y actualiza la UI sin recargar el árbol completo.
- **Eliminar nodo:** Click en botón eliminar → el sistema elimina la causa y todos sus descendientes (CASCADE silencioso, decisión D-04) → actualiza la visualización.
- El sistema no ofrece ninguna acción para marcar una causa como causa raíz ni solicita justificación de causa raíz.
- Toda operación (crear, editar, eliminar) pasa por validación en backend antes de persistirse.
- Si una operación viola las reglas de integridad, el sistema muestra un mensaje de error y no aplica el cambio.

### FR-11: Persistencia y Reconstrucción del Árbol Causal

El sistema persiste todas las entidades en PostgreSQL y reconstruye el árbol y el historial de análisis de forma determinista.

- Todas las causas se almacenan con sus relaciones explícitas (`contrato_id`, `parent_id`).
- El sistema reconstruye el árbol completo para un `contrato_id` dado en cualquier momento.
- La reconstrucción es determinista: el mismo `contrato_id` produce siempre el mismo árbol.
- Múltiples contratos coexisten en la base de datos sin interferencias.
- Las sesiones de análisis `analisis_causas` y sus detalles `analisis_causas_detalle` se reconstruyen de forma determinista a partir de `contrato_id` y `estado`.
- El sistema permite listar sesiones abiertas y cerradas junto con sus totales de causas e hipótesis trazadas.
- Los índices `idx_causa_contrato ON causa(contrato_id)` e `idx_causa_parent ON causa(parent_id)` son obligatorios (no opcionales).

---

## Non-Functional Requirements

- **NFR-01 Integridad del árbol DAG**: El sistema garantiza en todo momento que el árbol causal es un DAG válido. La validación de ciclos se realiza en backend Python antes de cada inserción de nodo hijo. Las operaciones de borrado recursivo se envuelven en transacciones de base de datos.

- **NFR-02 Rendimiento de reconstrucción**: La reconstrucción de un árbol de hasta 200 nodos se completa en menos de 2 segundos. Los índices en `causa(contrato_id)` y `causa(parent_id)` son obligatorios para garantizar este rendimiento.

- **NFR-03 Interfaz reactiva**: La UI actualiza la visualización del árbol después de cada operación CRUD sin recargar el layout completo de la página. El sistema muestra feedback visual durante operaciones de escritura en base de datos (spinner, notificación, borde animado o equivalente).

- **NFR-04 Stack local autónomo**: La aplicación funciona completamente en entorno local (Python + Dash + PostgreSQL local) sin conexión a servicios externos en Fase 1. La conexión a PostgreSQL se gestiona mediante variables de entorno configurables (host, puerto, nombre de BD, usuario, contraseña).

- **NFR-05 Mensajes de error accionables**: Toda operación rechazada por el sistema por violación de integridad (ciclo detectado, parent_id inválido, nombre vacío, etc.) devuelve al usuario un mensaje de error descriptivo que identifica la causa del rechazo.

---

## Constraints and Assumptions

- **Stack:** Python 3.x + Dash (Plotly) + PostgreSQL local. Sin Dataiku DSS en Fase 1.
- **Single-user local:** La aplicación es de uso individual en local. Sin concurrencia, sin locking optimista ni pesimista (decisión D-09).
- **Sin autenticación ni roles:** Un solo actor con acceso total. Sin gestión de sesiones, sin control de acceso por roles (decisión D-08).
- **Causas no compartidas entre contratos:** Cada causa pertenece a exactamente un contrato (`contrato_id` obligatorio, decisión D-03).
- **Árbol causal es DAG:** La estructura es un grafo acíclico dirigido. Los ciclos se detectan en Python antes de persistir (decisión D-02).
- **Borrado silencioso en cascada:** El borrado de una causa elimina recursivamente sus descendientes sin confirmación adicional en Fase 1 (decisión D-04).
- **MAQUINA = solo id + nombre:** Los campos `planta`, `tipo` y `linea` no existen en Fase 1 (decisión D-10).
- **Objetivo = texto libre:** El campo `objetivo` del contrato es TEXT sin estructura interna en Fase 1 (decisión D-11).
- **Hipótesis incluidas en Fase 1:** La tabla `hipotesis` y los estados visuales en tarjetas (borde verde/rojo) están en alcance de Fase 1 (decisión D-05).
- **Evidencias excluidas de Fase 1:** No hay tabla `evidencia` en Fase 1; el campo `criterio_validacion` de hipótesis es el sustituto textual (decisión D-06).
- **Sesiones de análisis causal:** La tabla `analisis_causas` funciona como historial de sesiones por contrato con estados `abierto`/`cerrado`; `analisis_causas_detalle` almacena la trazabilidad de causas e hipótesis.
- **Plantilla de análisis:** La estructura del árbol causal base del contrato seleccionado se reutiliza como plantilla para cada sesión de análisis; la página `analisis_causas` no crea un árbol nuevo, solo registra trazabilidad sobre el árbol base.
- **PostgreSQL local:** Se asume una instancia PostgreSQL accesible en local con credenciales configuradas por variables de entorno.
- **Profundidad de árbol ilimitada:** El sistema soporta profundidad de anidamiento sin límite técnico fijo (límite práctico: ~200 nodos para NFR-02).

---

## Out of Scope

- **HU-06 Evidencias:** Sin tabla `EVIDENCIA`, sin UI de adjuntar datasets/queries/gráficos. Pospuesto a Fase 2.
- **Marcado de causa raíz:** Sin acción funcional ni justificación de causa raíz en la UI de Fase 1.
- **Visualización tipo espina de pescado clásica (Ishikawa):** Solo árbol de tarjetas jerárquico. La espina de pescado se considera para fases posteriores (decisión D-07).
- **Autenticación y autorización:** Sin login, sin roles, sin gestión de sesiones (decisión D-08).
- **Multiusuario y concurrencia:** Sin soporte de múltiples usuarios simultáneos, sin locking (decisión D-09).
- **Campos planta / tipo / linea en MAQUINA:** Solo `id` + `nombre` en Fase 1 (decisión D-10).
- **Campo objetivo estructurado:** Sin parseo operador/valor/unidad. Solo texto libre (decisión D-11).
- **Scoring automático de causas:** Fase 2.
- **ML / LLM / RAG:** Fase 3+.
- **Motor MCP de causa raíz reutilizable:** Fase 4.
- **Integración con Dataiku DSS:** Fase 2 en adelante (decisión D-01).
- **Integración con PI-Aveva, Oracle, Databricks:** Fases 3+.
- **Versionado de árboles causales y auditoría de cambios:** No en Fase 1.
- **Ranking automático de causas por impacto / probabilidad:** No en Fase 1.
- **Optimización para árboles > 200 nodos:** No en alcance de Fase 1.

---

## Acceptance Criteria

### AC — FR-01: Procesos

| ID | Criterio |
|----|----------|
| AC-01 | El sistema persiste un proceso nuevo con nombre válido. **Criterio:** `INSERT INTO proceso(nombre) VALUES ('Test'); SELECT id FROM proceso WHERE nombre='Test'` retorna 1 fila. |
| AC-02 | El sistema rechaza crear un proceso sin nombre. **Criterio:** `INSERT INTO proceso(nombre) VALUES (NULL)` lanza error NOT NULL; la UI muestra mensaje de validación y no persiste. |
| AC-03 | El sistema lista todos los procesos existentes. **Criterio:** `SELECT COUNT(*) FROM proceso` es ≥ N tras insertar N procesos; la UI los muestra en un selector o lista. |
| AC-04 | El sistema permite editar el nombre de un proceso existente. **Criterio:** `UPDATE proceso SET nombre='Nuevo' WHERE id=1; SELECT nombre FROM proceso WHERE id=1` retorna 'Nuevo'. |
| AC-05 | El sistema permite eliminar un proceso sin contratos asociados. **Criterio:** `DELETE FROM proceso WHERE id=X` ejecuta sin error cuando no existen contratos con `proceso_id=X`. |

### AC — FR-02: Contratos

| ID | Criterio |
|----|----------|
| AC-06 | El sistema persiste un contrato con nombre, proceso_id, metrica y objetivo válidos. **Criterio:** `SELECT id FROM contrato WHERE nombre='C1' AND proceso_id=1` retorna 1 fila tras la creación. |
| AC-07 | El sistema asigna `version=1` y `activo=TRUE` por defecto al crear un contrato. **Criterio:** `SELECT version, activo FROM contrato WHERE id=X` retorna `1, true`. |
| AC-08 | El sistema rechaza crear un contrato sin nombre. **Criterio:** `INSERT INTO contrato(proceso_id, nombre) VALUES (1, NULL)` lanza error NOT NULL; la UI muestra mensaje de validación. |
| AC-09 | El sistema rechaza crear un contrato sin proceso_id. **Criterio:** `INSERT INTO contrato(nombre) VALUES ('C1')` lanza error NOT NULL en `proceso_id`; la UI muestra mensaje de validación. |
| AC-10 | El sistema permite activar y desactivar un contrato. **Criterio:** Tras toggle: `SELECT activo FROM contrato WHERE id=X` alterna entre `true` y `false`. |
| AC-11 | El sistema lista contratos de un proceso filtrando por activo/inactivo. **Criterio:** `SELECT * FROM contrato WHERE proceso_id=1 AND activo=TRUE` retorna solo los contratos activos del proceso 1. |
| AC-12 | El campo `objetivo` acepta texto libre sin restricción de formato. **Criterio:** `INSERT INTO contrato(..., objetivo) VALUES (..., '< 150 min')` persiste sin error. |

### AC — FR-03: Máquinas

| ID | Criterio |
|----|----------|
| AC-13 | El sistema persiste una máquina con nombre válido. **Criterio:** `INSERT INTO maquina(nombre) VALUES ('Prensa 1'); SELECT id FROM maquina WHERE nombre='Prensa 1'` retorna 1 fila. |
| AC-14 | El sistema rechaza crear una máquina sin nombre. **Criterio:** `INSERT INTO maquina(nombre) VALUES (NULL)` lanza error NOT NULL; la UI muestra mensaje de validación. |
| AC-15 | La tabla `maquina` no tiene columnas `planta`, `tipo` ni `linea`. **Criterio:** `SELECT column_name FROM information_schema.columns WHERE table_name='maquina'` retorna solo `id` y `nombre`. |
| AC-16 | El sistema lista todas las máquinas existentes. **Criterio:** `SELECT COUNT(*) FROM maquina` es ≥ N tras insertar N máquinas; la UI las muestra en un selector. |

### AC — FR-04: Asociación Contrato ↔ Máquina

| ID | Criterio |
|----|----------|
| AC-17 | El sistema persiste la asociación N:N entre contrato y máquina. **Criterio:** `INSERT INTO contrato_maquina(contrato_id, maquina_id) VALUES (1,1); SELECT * FROM contrato_maquina WHERE contrato_id=1 AND maquina_id=1` retorna 1 fila. |
| AC-18 | El sistema permite asociar múltiples máquinas a un mismo contrato. **Criterio:** `SELECT COUNT(*) FROM contrato_maquina WHERE contrato_id=1` es ≥ 2 tras asociar 2 máquinas. |
| AC-19 | El sistema permite desasociar una máquina de un contrato sin eliminar máquina ni contrato. **Criterio:** `DELETE FROM contrato_maquina WHERE contrato_id=1 AND maquina_id=1`; `SELECT id FROM maquina WHERE id=1` y `SELECT id FROM contrato WHERE id=1` siguen retornando 1 fila. |
| AC-20 | La UI muestra las máquinas asociadas a un contrato seleccionado. **Criterio:** Al seleccionar contrato X en la UI, la lista de máquinas muestra exactamente los registros de `SELECT maquina_id FROM contrato_maquina WHERE contrato_id=X`. |

### AC — FR-05: Causas (nodos del árbol)

| ID | Criterio |
|----|----------|
| AC-21 | El sistema persiste una causa de primer nivel con `parent_id = NULL`. **Criterio:** `INSERT INTO causa(contrato_id, nombre, tipo) VALUES (1,'C1','causa'); SELECT parent_id FROM causa WHERE nombre='C1'` retorna NULL. |
| AC-22 | El sistema persiste una sub-causa con `parent_id` del nodo padre y hereda `contrato_id`. **Criterio:** `SELECT contrato_id, parent_id FROM causa WHERE id=X` retorna el mismo `contrato_id` que el padre y `parent_id` igual al id del padre. |
| AC-23 | El sistema rechaza crear una causa sin nombre. **Criterio:** `INSERT INTO causa(contrato_id, nombre) VALUES (1, NULL)` lanza error NOT NULL; la UI muestra mensaje de validación. |
| AC-24 | El sistema rechaza crear una causa con `parent_id` de un contrato diferente. **Criterio:** Intentar crear una causa en `contrato_id=2` con `parent_id` de una causa del `contrato_id=1` retorna error de validación en backend y no persiste. |
| AC-25 | El borrado de una causa elimina recursivamente todos sus descendientes. **Criterio:** Dado un nodo raíz con 3 descendientes, `DELETE FROM causa WHERE id=raiz`; `SELECT COUNT(*) FROM causa WHERE contrato_id=X` disminuye en 4 (raíz + 3 descendientes). |
| AC-26 | Los índices obligatorios existen. **Criterio:** `SELECT indexname FROM pg_indexes WHERE tablename='causa'` incluye `idx_causa_contrato` e `idx_causa_parent`. |

### AC — FR-06: Integridad DAG

| ID | Criterio |
|----|----------|
| AC-27 | El sistema detecta y rechaza la introducción de un ciclo directo. **Criterio:** Dado A → B, intentar crear B → A (o A → A) retorna error de validación backend ("ciclo detectado") y no persiste la causa. |
| AC-28 | El sistema detecta y rechaza la introducción de un ciclo transitivo. **Criterio:** Dado A → B → C, intentar crear C → A retorna error de validación backend ("ciclo detectado") y no persiste. |
| AC-29 | El sistema no expone ninguna acción de marcado como causa raíz en la UI del árbol. **Criterio:** El layout/DOM de la página del árbol no contiene control visible para marcar causa raíz ni justificación asociada. |
| AC-30 | El borrado recursivo ocurre dentro de una transacción. **Criterio:** Si el borrado de un nodo falla a mitad del subárbol (simulado), `SELECT COUNT(*) FROM causa WHERE contrato_id=X` retorna el mismo valor que antes del intento — el árbol no queda en estado parcial. |

### AC — FR-07: Sesiones de análisis causal

| ID | Criterio |
|----|----------|
| AC-31 | El sistema lista múltiples sesiones `analisis_causas` para un mismo contrato. **Criterio:** `SELECT COUNT(*) FROM analisis_causas WHERE contrato_id=1` es ≥ 2 tras crear dos sesiones; la UI permite filtrarlas por `abierto` y `cerrado`. |
| AC-32 | El sistema permite cerrar y reabrir una sesión sin duplicarla ni perder trazabilidad. **Criterio:** Tras `UPDATE analisis_causas SET estado='cerrado' WHERE id=X` y posterior reapertura, `SELECT estado, fecha_cierre, fecha_reapertura FROM analisis_causas WHERE id=X` refleja el cambio y `SELECT COUNT(*) FROM analisis_causas_detalle WHERE analisis_causa_id=X` no disminuye. |
| AC-33 | El sistema registra trazabilidad de causas e hipótesis con evaluación, comentario y fecha. **Criterio:** `SELECT tipo_elemento, evaluacion, comentario, fecha_evaluacion FROM analisis_causas_detalle WHERE analisis_causa_id=X` retorna filas persistidas para causas e hipótesis; las causas solo usan `retenida` o `evaluada` y las hipótesis solo `validada` o `rechazada`. |
| AC-34 | El sistema agrupa/lista sesiones por proceso, contrato, máquinas asociadas y plantilla de contrato. **Criterio:** Una consulta de agregación por `proceso_id`, `contrato_id` y `estado` devuelve los mismos totales que la UI muestra en el listado de `analisis_causas`. |

### AC — FR-08: Hipótesis

| ID | Criterio |
|----|----------|
| AC-35 | El sistema persiste una hipótesis con `descripcion`, `tipo` y `estado='pendiente'` por defecto. **Criterio:** `SELECT estado FROM hipotesis WHERE id=X` retorna `pendiente` tras la creación. |
| AC-36 | El sistema rechaza crear una hipótesis sin descripción. **Criterio:** `INSERT INTO hipotesis(causa_id, descripcion) VALUES (1, NULL)` lanza error NOT NULL; la UI muestra mensaje de validación. |
| AC-37 | El sistema rechaza crear una hipótesis con `causa_id` inexistente. **Criterio:** `INSERT INTO hipotesis(causa_id, descripcion) VALUES (99999, 'H1')` lanza error FK; el backend retorna mensaje de error al usuario. |
| AC-38 | El sistema permite cambiar el estado de una hipótesis a `validada` o `rechazada`. **Criterio:** `UPDATE hipotesis SET estado='validada' WHERE id=X; SELECT estado FROM hipotesis WHERE id=X` retorna `validada`. |
| AC-39 | El sistema rechaza estados no definidos para una hipótesis. **Criterio:** `UPDATE hipotesis SET estado='aprobada' WHERE id=X` lanza error CHECK constraint. |
| AC-40 | El borrado de una causa elimina en cascada sus hipótesis. **Criterio:** Dado causa X con 2 hipótesis, `DELETE FROM causa WHERE id=X`; `SELECT COUNT(*) FROM hipotesis WHERE causa_id=X` retorna 0. |
| AC-41 | Una causa puede tener entre 0 y N hipótesis. **Criterio:** `SELECT COUNT(*) FROM hipotesis WHERE causa_id=X` puede ser 0 sin errores. Se pueden insertar ≥ 2 hipótesis para la misma causa sin conflicto. |

### AC — FR-09: Visualización del Árbol

| ID | Criterio |
|----|----------|
| AC-42 | La UI muestra el árbol completo del contrato seleccionado, reconstruido desde PostgreSQL. **Criterio:** El número de tarjetas / nodos renderizados en la UI es igual a `SELECT COUNT(*) FROM causa WHERE contrato_id=X`. |
| AC-43 | Los nodos de tipo `causa` y tipo `efecto` se muestran con colores visualmente distintos. **Criterio:** Inspeccionando el DOM o el JSON de elementos de cytoscape, los nodos `tipo='causa'` y `tipo='efecto'` tienen clases CSS / estilos diferentes. |
| AC-44 | Los nodos no muestran marca ni badge de causa raíz en Fase 1. **Criterio:** El layout/DOM del árbol no contiene control visible para marcar causa raíz ni clase visual reservada para ese estado. |
| AC-45 | Un nodo con hipótesis `validada` muestra borde verde. **Criterio:** Dado un nodo con al menos 1 hipótesis en estado `validada`, el borde del nodo en la UI es verde. `SELECT id FROM hipotesis WHERE causa_id=X AND estado='validada'` retorna ≥ 1 fila. |
| AC-46 | Un nodo sin hipótesis validadas pero con hipótesis `rechazada` muestra borde rojo. **Criterio:** Dado un nodo con hipótesis solo en estado `rechazada`, el borde es rojo. Nodo sin hipótesis rechazadas no muestra borde rojo. |
| AC-47 | El usuario puede expandir y colapsar ramas del árbol en la UI. **Criterio:** Click en un nodo padre contrae sus hijos visualmente; segundo click los expande. |

### AC — FR-10: Construcción Interactiva desde la UI

| ID | Criterio |
|----|----------|
| AC-48 | Click en "+" de una tarjeta crea una causa hija y la muestra inmediatamente en el árbol. **Criterio:** Tras el click y confirmación del formulario, `SELECT COUNT(*) FROM causa WHERE parent_id=X` aumenta en 1 y la nueva tarjeta aparece en la UI sin recarga completa de página. |
| AC-49 | Click en editar abre un modal/panel con los campos actuales del nodo. **Criterio:** Los valores del modal (nombre, tipo, categoría, descripción) coinciden con `SELECT nombre, tipo, categoria, descripcion FROM causa WHERE id=X`. |
| AC-50 | Confirmar la edición persiste los cambios y actualiza la UI sin recargar el árbol completo. **Criterio:** Tras editar el nombre del nodo X en la UI, `SELECT nombre FROM causa WHERE id=X` retorna el nuevo nombre; el árbol sigue mostrando todos los demás nodos sin reinicio. |
| AC-51 | Click en eliminar borra la causa y sus descendientes (CASCADE) y actualiza la visualización. **Criterio:** Tras confirmar el borrado del nodo X con N descendientes, `SELECT COUNT(*) FROM causa WHERE id=X OR parent_id IN (subárbol de X)` retorna 0; los nodos desaparecen de la UI. |
| AC-52 | Una operación inválida (ciclo, parent inválido, nombre vacío) muestra mensaje de error en la UI y no altera el árbol. **Criterio:** El árbol antes y después del intento inválido tiene el mismo `COUNT(*) FROM causa WHERE contrato_id=X`; la UI muestra un componente de error con texto descriptivo. |

### AC — FR-11: Persistencia y Reconstrucción

| ID | Criterio |
|----|----------|
| AC-53 | El árbol se reconstruye íntegramente para un `contrato_id` dado. **Criterio:** `SELECT id, parent_id, nombre FROM causa WHERE contrato_id=X ORDER BY id` retorna todas las causas con sus relaciones; la UI renderiza el mismo número de nodos que filas retornadas. |
| AC-54 | La reconstrucción es determinista. **Criterio:** Realizando dos reconstrucciones consecutivas del mismo contrato, el orden y los identificadores de los nodos en la UI son idénticos. |
| AC-55 | Múltiples contratos coexisten sin interferencias. **Criterio:** `SELECT COUNT(*) FROM causa WHERE contrato_id=1` no cambia al insertar causas en `contrato_id=2`. |
| AC-56 | El sistema completa la reconstrucción de un árbol de 200 nodos en menos de 2 segundos. **Criterio:** Insertar 200 causas para un contrato; medir el tiempo desde la solicitud de reconstrucción hasta el render completo en la UI — debe ser < 2 000 ms. |

### AC — NFR

| ID | Criterio |
|----|----------|
| AC-57 | La conexión a PostgreSQL se configura mediante variables de entorno. **Criterio:** El código fuente no contiene strings de conexión hardcodeadas. Las variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (o equivalentes en `.env`) se leen al arrancar la aplicación. |
| AC-58 | La UI actualiza el árbol tras una operación CRUD sin recargar la página completa. **Criterio:** El navegador no realiza una recarga completa (`window.location.reload`) al añadir, editar o eliminar un nodo. El árbol se actualiza mediante un callback Dash. |
| AC-59 | La UI muestra feedback visual durante operaciones de escritura. **Criterio:** Tras iniciar una operación de escritura, la UI muestra un indicador de carga (spinner, borde animado o notificación) antes de confirmar el resultado. |
| AC-60 | La gestión CRUD de hipótesis base no expone campos de evaluación, comentario ni fecha. **Criterio:** El formulario y el modelo de persistencia de `hipotesis` solo incluyen `descripcion`, `tipo`, `criterio_validacion` y `estado`; no aparecen controles ni columnas de evaluación de análisis. |
| AC-61 | La página `analisis_causas` permite editar solo evaluación y comentario sobre causas e hipótesis. **Criterio:** Los campos estructurales de causas e hipótesis aparecen en modo lectura o no editables y los controles editables se limitan a evaluación y comentario. |
| AC-62 | Las evaluaciones de causa en `analisis_causas_detalle` solo aceptan `retenida` o `evaluada`. **Criterio:** `INSERT INTO analisis_causas_detalle(..., tipo_elemento='causa', evaluacion='otra')` lanza error CHECK o validación backend; los valores permitidos persisten correctamente. |
| AC-63 | Las evaluaciones de hipótesis en `analisis_causas_detalle` solo aceptan `validada` o `rechazada`. **Criterio:** `INSERT INTO analisis_causas_detalle(..., tipo_elemento='hipotesis', evaluacion='otra')` lanza error CHECK o validación backend; los valores permitidos persisten correctamente. |

---

## Questions for Clarification

Sin preguntas bloqueantes. Todas las ambigüedades (Q-01 a Q-08) han sido resueltas y las decisiones registradas (D-01 a D-11).

---

## Decision Log

| ID | Decisión | Razón |
|----|----------|-------|
| D-01 | Stack Fase 1: Python + Dash local + PostgreSQL local. Sin Dataiku, sin ML, sin LLM. Dataiku se incorpora en Fase 2. | Prioridad de entrega rápida de una herramienta usable; desacoplamiento del stack de producción Dataiku. |
| D-02 | El árbol causal es un DAG obligatorio. Los ciclos se validan en backend Python, no en SQL. | Las restricciones SQL de ciclos en grafos auto-referenciales son complejas en PostgreSQL; la validación en Python es más mantenible. |
| D-03 | En Fase 1 las causas no se comparten entre contratos. Cada causa pertenece a exactamente un contrato (`contrato_id` obligatorio). | Simplificación del modelo en Fase 1; el sharing de causas entre contratos añade complejidad de integridad no justificada en esta fase. |
| D-04 | El borrado de causas usa ON DELETE CASCADE (borrado silencioso del subárbol). El modo seguro con confirmación se pospone. | Simplicidad de UX en Fase 1; el usuario técnico comprende el riesgo. Se revisará en Fase 2 cuando haya datos de producción. |
| D-05 | HU-08 (Hipótesis) **SÍ entra en Fase 1**. Se crea la tabla `hipotesis`. La UI muestra estados de hipótesis en las tarjetas (bordes verde/rojo). | Las hipótesis son un elemento central del análisis causal estructurado; sin ellas la herramienta pierde valor diferencial frente a un Ishikawa en papel. |
| D-06 | HU-06 (Evidencias) **NO entra en Fase 1**. Sin tabla `evidencia`. El campo `criterio_validacion` en hipótesis es el sustituto textual. | La gestión de evidencias requiere integración con fuentes de datos externas (PI-Aveva, Oracle) que no están disponibles en Fase 1. |
| D-07 | Visualización del árbol: árbol de tarjetas jerárquico con `dash-cytoscape` o componente HTML recursivo. Sin espina de pescado clásica. | El árbol de tarjetas es más adecuado para una estructura DAG profunda y permite interactividad nativa (expand/collapse, click en nodo). La espina de pescado clásica no escala bien con múltiples niveles de sub-causas. |
| D-08 | Un solo rol de usuario en Fase 1. Sin autenticación, sin gestión de sesiones, sin control de acceso. | Herramienta local single-user; añadir auth en Fase 1 aumentaría la complejidad sin beneficio. |
| D-09 | Fase 1 es single-user local. Sin concurrencia, sin locking. | Consecuencia directa de D-08 y del stack local; simplifica el modelo de datos y la lógica de escritura. |
| D-10 | Tabla `maquina` en Fase 1: solo `id` y `nombre`. Sin `planta`, `tipo` ni `linea`. | Los filtros por planta/línea/tipo requieren un catálogo de activos industriales que no está disponible en Fase 1. La asociación contrato-máquina ya delimita el contexto operativo. |
| D-11 | Campo `objetivo` del contrato: texto libre (`TEXT`). El parseo estructurado (operador/valor/unidad) se pospone a Fase 2. | En Fase 1 no hay motor de validación automática de objetivos; el texto libre es suficiente para comunicar el contrato al usuario analista. |
| D-12 | `analisis_causas` se modela como historial de sesiones por contrato con estados `abierto`/`cerrado`. El árbol causal base se reutiliza como plantilla de análisis y la trazabilidad se almacena en `analisis_causas_detalle`. | La opción de sesión única no cubría la necesidad de histórico, reanudación y agregación por proceso/contrato/máquina/plantilla. |

---

## Amendments

| ID | Enmienda | Fecha | Motivo |
|----|----------|-------|--------|
| AMD-001 | `analisis_causas` pasa a ser una tabla de historial de sesiones por contrato con estados `abierto`/`cerrado`; se añade `analisis_causas_detalle` para trazabilidad y se elimina la acción funcional de marcar causa raíz del flujo `arbol`. | 2026-05-27 | Aclaración humana sobre el alcance del análisis causal y su reanudación. |
