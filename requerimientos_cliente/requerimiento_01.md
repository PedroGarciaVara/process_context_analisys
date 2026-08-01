# Requerimiento 01 — Solve-Ishikawa: Sistema de Análisis Causal Estructurado

> **Estado:** `completo_pendiente_validacion`
> **Fecha:** 2026-04-21
> **Autor:** Por determinar
> **Fuente:** Conversación de brainstorming / diseño conceptual (requerimiento_01.md)

---

## 1. Contexto

En entornos industriales, el análisis de causa raíz (RCA) se realiza de forma manual, subjetiva y no reutilizable mediante diagramas de Ishikawa en papel o herramientas genéricas. Este proceso genera conocimiento experto que se pierde entre análisis y no permite aprendizaje acumulativo ni validación sistemática.

El proyecto **Solve-Ishikawa** digitaliza y estructura este proceso: permite al usuario definir un problema medible (**contrato**) sobre un proceso industrial, asociarle las máquinas implicadas, construir un árbol causal jerárquico (Ishikawa jerárquico / DAG) de forma interactiva, e identificar causas raíz de manera estructurada y persistente.

La **Fase 1** se construye como aplicación local (Python + Dash + PostgreSQL) sin integración con Dataiku, ML ni LLM. El objetivo es entregar una herramienta usable que sirva de base estructurada para las fases posteriores de scoring automático (Fase 2), ML/LLM (Fase 3) y un motor MCP de causa raíz reutilizable (Fase 4).

---

## 2. Objetivo

Construir una webapp local (Dash + PostgreSQL) que permita al usuario:
1. Definir contratos de proceso con objetivos medibles.
2. Asociar máquinas a los contratos.
3. Construir un árbol causal jerárquico de forma interactiva desde la UI.
4. Persistir el árbol en PostgreSQL y reconstruirlo íntegramente para cualquier proceso/contrato dado.

El sistema resultante debe ser la base de conocimiento causal estructurado sobre la que se añadirán capacidades analíticas en fases posteriores.

---

## 3. Actores

### Usuario (técnico / analista industrial)
Descripción: persona que usa la webapp para modelar análisis de causa raíz. En Fase 1 no hay distinción de roles; todos los usuarios tienen los mismos permisos (ver Q-04).

Puede:
- Crear, editar y eliminar procesos.
- Crear, editar, activar/desactivar y versionar contratos.
- Asociar y desasociar máquinas a contratos.
- Construir el árbol causal de forma interactiva (añadir, editar, eliminar causas y sub-causas).
- Marcar causas como causa raíz con justificación.
- Visualizar el árbol de causas de cualquier contrato.
- Definir hipótesis sobre causas (si se confirma en alcance de Fase 1 — ver Q-01).

### Sistema
Responsabilidades automáticas:
- Validar integridad del árbol causal (DAG obligatorio, sin ciclos, sin nodos huérfanos).
- Heredar `contrato_id` al crear un nodo hijo.
- Validar que `parent_id` pertenece al mismo contrato que el nodo hijo.
- Eliminar recursivamente los hijos al borrar un nodo (ON DELETE CASCADE).
- Reconstruir el árbol completo y determinista desde PostgreSQL a partir de `contrato_id`.
- Rechazar operaciones que violen las reglas de integridad con mensajes de error claros.

---

## 4. Glosario

- **Proceso**: unidad de producción o actividad industrial sobre la que se analiza un problema. Ejemplo: "pesado de cargas de negro de humo".
- **Contrato**: objetivo medible de rendimiento o calidad asociado a un proceso. Define "qué debe cumplirse". Ejemplo: "pesado de cargas en tiempo inferior a 150 min".
- **Métrica**: variable que se mide para evaluar el contrato (ej: tiempo, kg, ratio NOK).
- **Objetivo**: valor esperado de la métrica con operador (ej: `< 150 min`).
- **Máquina**: equipo físico implicado en la ejecución de un contrato.
- **Causa**: nodo del árbol causal que representa una posible causa de incumplimiento del contrato. Puede tener sub-causas hijas.
- **Efecto**: variante semántica de causa que representa un resultado intermedio del problema (no el origen final). En el árbol puede tener hijos.
- **Causa raíz**: causa sin hijos que representa el origen final del problema. No puede tener sub-causas. Debe justificarse.
- **Árbol causal**: estructura jerárquica DAG (grafo acíclico dirigido) de causas asociadas a un contrato, desde el incumplimiento hasta las causas raíz.
- **DAG (Directed Acyclic Graph)**: grafo dirigido sin ciclos. Obligatorio para el árbol causal. Los ciclos se validan en backend.
- **Categoría de causa**: clasificación al estilo Ishikawa clásico — máquina, método, material, mano de obra, entorno.
- **Hipótesis**: afirmación sobre una causa que puede ser validada o rechazada con evidencia. Tiene estado: pendiente / validada / rechazada. (Ver Q-01: alcance Fase 1 pendiente de confirmación.)
- **Evidencia**: dato, query o descripción de gráfico asociado a una causa o hipótesis para justificar su impacto. (Ver Q-02: alcance Fase 1 pendiente de confirmación.)
- **Nodo raíz del árbol**: causa sin `parent_id` (primer nivel del árbol, hijo directo del contrato).

---

## 5. Alcance

### Incluido en Fase 1
- Gestión CRUD de procesos.
- Gestión CRUD de contratos (con campo versión y activación/desactivación).
- Gestión CRUD de máquinas y asociación N:N a contratos (tabla pivote `CONTRATO_MAQUINA`).
- Construcción interactiva del árbol causal desde la UI: añadir nodo hijo (click "+"), editar nodo (modal/panel), eliminar nodo con hijos (cascade).
- Identificación y marcado de causa raíz con justificación obligatoria.
- Visualización del árbol causal con diferenciación visual por tipo (causa / efecto / causa raíz).
- Persistencia de todas las entidades en PostgreSQL local.
- Reconstrucción del árbol completo para un proceso y contrato dados.
- Validaciones de integridad en backend: ausencia de ciclos, `parent_id` válido, nodo raíz no puede tener hijos.

### Out of scope (Fase 1)
- Scoring automático de causas (Fase 2).
- Correlaciones, detección de anomalías, features ML (Fase 2).
- Motor LLM/RAG para interpretación o sugerencia de causas (Fase 3+).
- Integración con PI-Aveva, Oracle, Databricks (fases posteriores).
- Integración con Dataiku DSS como plataforma de despliegue (se retoma en Fase 2, ver D-01).
- Gestión de sesiones, autenticación y autorización por roles.
- Versionado de árboles causales y auditoría de cambios.
- Motor de ejecución automática de hipótesis sobre datos reales.
- Ranking automático de causas por impacto/probabilidad.
- Optimización avanzada de rendimiento para árboles > 200 nodos.

---

## 6. Modelo de datos afectado

| Entidad / Tabla    | Campo               | Tipo     | Restricciones                              | Notas                                         |
|--------------------|---------------------|----------|--------------------------------------------|-----------------------------------------------|
| PROCESO            | id                  | SERIAL   | PK                                         |                                               |
| PROCESO            | nombre              | TEXT     | NOT NULL                                   |                                               |
| CONTRATO           | id                  | SERIAL   | PK                                         |                                               |
| CONTRATO           | proceso_id          | INT      | FK → proceso.id, NOT NULL                  |                                               |
| CONTRATO           | nombre              | TEXT     | NOT NULL                                   |                                               |
| CONTRATO           | metrica             | TEXT     |                                            | ej: "tiempo", "kg", "ratio NOK" — ver Q-08    |
| CONTRATO           | objetivo            | TEXT     |                                            | ej: "< 150 min" — ver Q-08                    |
| CONTRATO           | version             | INT      | DEFAULT 1                                  | Para versionado futuro                        |
| CONTRATO           | activo              | BOOLEAN  | DEFAULT TRUE                               |                                               |
| MAQUINA            | id                  | SERIAL   | PK                                         |                                               |
| MAQUINA            | nombre              | TEXT     | NOT NULL                                   |                                               |
| MAQUINA            | tipo                | TEXT     |                                            |                                               |
| MAQUINA            | planta              | TEXT     |                                            |                                               |
| MAQUINA            | linea               | TEXT     |                                            | Ver Q-06: campo pendiente de confirmar        |
| CONTRATO_MAQUINA   | contrato_id         | INT      | FK → contrato.id                           | Tabla pivote N:N                              |
| CONTRATO_MAQUINA   | maquina_id          | INT      | FK → maquina.id                            |                                               |
| CAUSA              | id                  | SERIAL   | PK                                         |                                               |
| CAUSA              | contrato_id         | INT      | FK → contrato.id, NOT NULL                 |                                               |
| CAUSA              | parent_id           | INT      | FK → causa.id, nullable, ON DELETE CASCADE | NULL = nodo raíz del árbol                    |
| CAUSA              | nombre              | TEXT     | NOT NULL                                   |                                               |
| CAUSA              | descripcion         | TEXT     |                                            |                                               |
| CAUSA              | tipo                | TEXT     | CHECK IN ('causa', 'efecto')               |                                               |
| CAUSA              | categoria           | TEXT     |                                            | máquina, método, material, m. de obra, entorno|
| CAUSA              | es_causa_raiz       | BOOLEAN  | DEFAULT FALSE                              | Si TRUE no puede tener hijos                  |
| CAUSA              | justificacion_raiz  | TEXT     |                                            | Obligatorio si es_causa_raiz = TRUE           |
| HIPOTESIS          | id                  | SERIAL   | PK                                         | Ver Q-01 — incluir en Fase 1 por confirmar    |
| HIPOTESIS          | causa_id            | INT      | FK → causa.id, NOT NULL                    |                                               |
| HIPOTESIS          | descripcion         | TEXT     | NOT NULL                                   |                                               |
| HIPOTESIS          | tipo                | TEXT     | CHECK IN ('aceptacion', 'rechazo')         |                                               |
| HIPOTESIS          | criterio_validacion | TEXT     |                                            |                                               |
| HIPOTESIS          | estado              | TEXT     | CHECK IN ('pendiente','validada','rechazada') DEFAULT 'pendiente' | |
| HIPOTESIS          | evidencia_id        | INT      | nullable                                   | Referencia futura a tabla EVIDENCIA           |

**Índices recomendados (no opcionales):**
```sql
CREATE INDEX idx_causa_contrato ON causa(contrato_id);
CREATE INDEX idx_causa_parent   ON causa(parent_id);
```

---

## 7. Integraciones externas

No aplica en Fase 1. La aplicación es completamente standalone local (Dash + PostgreSQL local).

Integraciones planificadas para fases posteriores:
- Dataiku DSS (Fase 2): despliegue de webapp y acceso a conexiones gestionadas.
- PI-Aveva, Oracle, Databricks (Fase 3+): datos de series temporales y producción para validar hipótesis.

---

## 8. Historias de usuario y criterios de aceptación funcionales

### HU-01: Definir contrato de proceso

Como usuario,
quiero definir un contrato funcional para un proceso,
para establecer un objetivo medible de rendimiento o calidad.

#### Criterios de aceptación

1. CUANDO el usuario crea un contrato
   EL SISTEMA DEBERÁ solicitar: nombre (obligatorio), descripción, métrica asociada y valor objetivo.

2. EL SISTEMA DEBERÁ asociar cada contrato a un proceso existente (proceso_id obligatorio).

3. EL SISTEMA DEBERÁ permitir activar o desactivar un contrato (campo `activo`).

4. EL SISTEMA DEBERÁ asignar un número de versión al contrato en el momento de su creación.

5. SI el usuario intenta crear un contrato sin nombre o sin proceso asociado
   EL SISTEMA DEBERÁ mostrar un error de validación y no persistir el registro.

6. EL SISTEMA DEBERÁ permitir listar los contratos de un proceso filtrando por estado activo/inactivo.

---

### HU-02: Asociar máquinas al contrato

Como usuario,
quiero asociar una o varias máquinas a un contrato,
para acotar el contexto operativo del análisis causal.

#### Criterios de aceptación

1. CUANDO el usuario asocia máquinas a un contrato
   EL SISTEMA DEBERÁ permitir seleccionar múltiples máquinas (relación N:N contrato ↔ máquina).

2. EL SISTEMA DEBERÁ permitir filtrar las máquinas disponibles por planta y tipo de máquina.

3. CUANDO el usuario guarda la asociación
   EL SISTEMA DEBERÁ persistir la relación en la tabla CONTRATO_MAQUINA.

4. EL SISTEMA DEBERÁ permitir desasociar máquinas de un contrato sin eliminar la máquina.

---

### HU-03: Definir causas de primer nivel

Como usuario,
quiero definir las causas que pueden provocar el incumplimiento del contrato,
para estructurar el análisis de causa raíz.

#### Criterios de aceptación

1. CUANDO el usuario añade una causa de primer nivel a un contrato
   EL SISTEMA DEBERÁ solicitar: nombre (obligatorio), descripción, tipo (causa | efecto) y categoría (máquina, método, material, mano de obra, entorno).

2. EL SISTEMA DEBERÁ asignar automáticamente `contrato_id` y `parent_id = NULL` a las causas de primer nivel.

3. SI el usuario intenta crear una causa sin nombre
   EL SISTEMA DEBERÁ rechazar la operación con mensaje de error.

---

### HU-04: Construir árbol causal jerárquico

Como usuario,
quiero descomponer cada causa en sub-causas,
para identificar la causa raíz del problema.

#### Criterios de aceptación

1. CUANDO el usuario añade una sub-causa a una causa existente
   EL SISTEMA DEBERÁ crear el nodo hijo con `parent_id` = causa padre y `contrato_id` heredado del padre.

2. EL SISTEMA DEBERÁ soportar profundidad ilimitada de anidamiento.

3. EL SISTEMA DEBERÁ rechazar cualquier operación que cree un ciclo en el árbol (DAG obligatorio). La validación se realiza en backend.

4. SI el usuario intenta añadir una sub-causa a un nodo marcado como causa raíz (`es_causa_raiz = TRUE`)
   EL SISTEMA DEBERÁ rechazar la operación con mensaje de error.

5. EL SISTEMA DEBERÁ validar que el `parent_id` referenciado existe y pertenece al mismo contrato.

---

### HU-05: Identificar causa raíz

Como usuario,
quiero marcar una causa como causa raíz,
para indicar el punto final del análisis causal.

#### Criterios de aceptación

1. CUANDO el usuario marca una causa como causa raíz
   EL SISTEMA DEBERÁ establecer `es_causa_raiz = TRUE` y solicitar una justificación (texto obligatorio).

2. CUANDO una causa está marcada como causa raíz
   EL SISTEMA DEBERÁ rechazar cualquier intento de añadirle nodos hijos.

3. EL SISTEMA DEBERÁ permitir múltiples causas raíz en un mismo árbol causal.

4. SI una causa que se intenta marcar como causa raíz ya tiene hijos en el árbol
   EL SISTEMA DEBERÁ mostrar un error de validación y no aplicar el marcado.

---

### HU-06: Asociar evidencia a causas

Como usuario,
quiero asociar datos o evidencias a una causa,
para justificar su impacto en el incumplimiento del contrato.

#### Criterios de aceptación

1. CUANDO el usuario asocia evidencia a una causa
   EL SISTEMA DEBERÁ permitir registrar: referencia a dataset, query SQL o descripción de gráfico.

2. EL SISTEMA DEBERÁ permitir añadir un comentario técnico libre asociado a la evidencia.

*Nota: Ver Q-02 — se requiere confirmación de si HU-06 está en alcance de Fase 1.*

---

### HU-07: Visualizar árbol causal

Como usuario,
quiero visualizar el árbol de causas de un contrato,
para entender la estructura del problema y el estado del análisis.

#### Criterios de aceptación

1. CUANDO el usuario selecciona un proceso y un contrato
   EL SISTEMA DEBERÁ mostrar el árbol causal completo reconstruido desde PostgreSQL.

2. EL SISTEMA DEBERÁ diferenciar visualmente los nodos por tipo: causa (color A), efecto (color B), causa raíz (color especial).

3. EL SISTEMA DEBERÁ permitir expandir y colapsar nodos del árbol.

4. SI un nodo tiene hipótesis en estado "validada"
   EL SISTEMA DEBERÁ mostrarlo con borde verde.

5. SI un nodo tiene hipótesis en estado "rechazada"
   EL SISTEMA DEBERÁ mostrarlo con borde rojo.

*Nota: Ver Q-03 — se requiere confirmación del tipo de visualización (árbol jerárquico vs espina de pescado Ishikawa clásico).*

---

### HU-08: Definir hipótesis de aceptación/rechazo sobre causas

Como usuario,
quiero definir una hipótesis para cada causa,
para poder validar si realmente impacta en el incumplimiento del contrato.

#### Criterios de aceptación

1. CUANDO el usuario crea una hipótesis sobre una causa
   EL SISTEMA DEBERÁ solicitar: descripción (obligatoria), tipo (aceptación | rechazo) y criterio de validación (texto).

2. EL SISTEMA DEBERÁ permitir que una causa tenga entre 0 y N hipótesis asociadas.

3. EL SISTEMA DEBERÁ gestionar el estado de cada hipótesis: pendiente, validada, rechazada.

4. EL SISTEMA DEBERÁ permitir asociar una referencia de evidencia a una hipótesis (campo opcional).

5. SI la causa referenciada no existe
   EL SISTEMA DEBERÁ rechazar la creación de la hipótesis con mensaje de error.

*Nota: Ver Q-01 — se requiere confirmación de si HU-08 está en alcance de Fase 1.*

---

### HU-09: Construcción interactiva del árbol desde la UI

Como usuario,
quiero construir el árbol de causas directamente desde la interfaz de la webapp,
para modelar el análisis de causa raíz de forma ágil e intuitiva.

#### Criterios de aceptación

1. CUANDO el usuario hace click en el botón "+" de una tarjeta causa
   EL SISTEMA DEBERÁ crear una nueva causa hija con `parent_id` = tarjeta actual y `contrato_id` heredado, y mostrarla inmediatamente en el árbol.

2. CUANDO el usuario hace click en el botón eliminar de una tarjeta
   EL SISTEMA DEBERÁ eliminar la causa y todos sus descendientes de forma recursiva (ON DELETE CASCADE) y actualizar la visualización.

3. CUANDO el usuario hace click en una tarjeta para editarla
   EL SISTEMA DEBERÁ mostrar un panel o modal con los campos editables: nombre, tipo (causa/efecto), categoría, descripción.

4. CUANDO el usuario confirma la edición
   EL SISTEMA DEBERÁ persistir los cambios en PostgreSQL y reflejarlos en la UI sin recargar el árbol completo.

5. EL SISTEMA DEBERÁ validar en backend toda operación (crear, editar, eliminar) antes de persistirla.

6. SI una operación de creación o edición viola las reglas de integridad del árbol
   EL SISTEMA DEBERÁ mostrar un mensaje de error al usuario y no aplicar el cambio.

---

### HU-10: Persistencia y reconstrucción del árbol causal

Como usuario,
quiero que el sistema persista las causas en PostgreSQL,
para poder reconstruir el árbol completo de cualquier proceso y contrato en cualquier momento.

#### Criterios de aceptación

1. EL SISTEMA DEBERÁ almacenar todas las causas en PostgreSQL con sus relaciones explícitas (`contrato_id`, `parent_id`).

2. CUANDO el usuario selecciona un proceso y un contrato
   EL SISTEMA DEBERÁ reconstruir el árbol completo desde la base de datos manteniendo la jerarquía (`parent_id`).

3. EL SISTEMA DEBERÁ garantizar que la reconstrucción es determinista: mismo `contrato_id` produce siempre el mismo árbol.

4. EL SISTEMA DEBERÁ soportar múltiples contratos simultáneamente en la base de datos sin interferencias.

5. EL SISTEMA DEBERÁ validar al insertar una causa que su `parent_id` pertenece al mismo contrato.

6. EL SISTEMA DEBERÁ rechazar cualquier inserción o modificación que introduzca un ciclo en el árbol.

---

## 9. Requisitos no funcionales

### RNF-1: Integridad de datos — Consistencia del árbol causal
Categoría: Integridad / Consistencia

Descripción: El sistema debe garantizar en todo momento que el árbol causal es un DAG válido (sin ciclos, sin nodos huérfanos, sin referencias a contratos distintos).

Criterios:
- EL SISTEMA DEBERÁ validar en backend la ausencia de ciclos antes de cada inserción de causa hija.
- EL SISTEMA DEBERÁ usar transacciones de base de datos para operaciones de borrado recursivo.
- EL SISTEMA DEBERÁ rechazar operaciones que violen la integridad con un mensaje de error claro al usuario.

### RNF-2: Rendimiento — Reconstrucción del árbol
Categoría: Rendimiento

Descripción: La reconstrucción del árbol debe ser fluida para árboles de tamaño típico en uso industrial (hasta ~200 nodos).

Criterios:
- EL SISTEMA DEBERÁ reconstruir un árbol de hasta 200 nodos en menos de 2 segundos.
- EL SISTEMA DEBERÁ disponer de índices en `causa(contrato_id)` y `causa(parent_id)` para optimizar las consultas de reconstrucción.

### RNF-3: Usabilidad — Interfaz reactiva
Categoría: Usabilidad

Descripción: La UI debe responder de forma inmediata a las acciones del usuario sin recargas de página completas.

Criterios:
- EL SISTEMA DEBERÁ actualizar la visualización del árbol tras cada operación CRUD sin recargar el layout completo de la página.
- EL SISTEMA DEBERÁ mostrar feedback visual al usuario durante operaciones de escritura en base de datos.

### RNF-4: Portabilidad — Stack local autónomo
Categoría: Portabilidad / Operación

Descripción: La aplicación de Fase 1 debe funcionar completamente en entorno local sin dependencias de servicios externos.

Criterios:
- EL SISTEMA DEBERÁ funcionar con Python + Dash + PostgreSQL local sin conexión a servicios externos en Fase 1.
- EL SISTEMA DEBERÁ gestionar la conexión a PostgreSQL mediante variables de entorno configurables.

---

## 10. Ambigüedades pendientes

| ID   | Pregunta | Impacto si no se resuelve | Estado |
|------|----------|--------------------------|--------|
| Q-01 | ¿La Fase 1 incluye la funcionalidad de hipótesis (HU-08, tabla HIPOTESIS)? El borrador define US-08 en detalle pero la descripción inicial de Fase 1 menciona solo "causas manuales + reglas simples". | Alto — determina si se crea la tabla HIPOTESIS, si la UI muestra estados de hipótesis en las tarjetas (bordes verde/rojo en HU-07) y si el modelo de datos debe incluir HIPOTESIS desde el inicio. | `resuelta` |
| Q-02 | ¿La Fase 1 incluye la funcionalidad de evidencias (HU-06, asociar dataset/query/gráfico a una causa)? El borrador la introduce como "historia clave" pero no la liga explícitamente al alcance de Fase 1. | Alto — determina si se necesita tabla EVIDENCIA, UI para adjuntar evidencias y la lógica de asociación causa-evidencia. | `resuelta` |
| Q-03 | ¿La visualización del árbol (HU-07) debe ser jerárquica vertical/horizontal (tarjetas de árbol tipo nodos), o debe ser visual tipo Ishikawa clásico (espina de pescado)? El borrador recomienda "árbol vertical, tarjetas expandibles (no Ishikawa clásico aún)" pero no es una decisión definitiva del cliente. | Alto — impacta en la elección del componente Dash para la visualización (dash-cytoscape, plotly tree, HTML recursivo) y en el diseño completo de la UI. | `resuelta` |
| Q-04 | ¿El usuario final de la webapp es siempre un único actor sin roles diferenciados (técnico = analista = administrador)? ¿O existen roles con permisos distintos (ej: un rol puede crear procesos/máquinas pero otro solo puede construir árboles)? | Alto — si hay roles, se necesita gestión de sesiones, autenticación y control de acceso en backend y UI. Si es single-role, no se necesita. | `resuelta` |
| Q-05 | ¿La Fase 1 soporta múltiples usuarios simultáneos (acceso concurrente a la webapp) o es una herramienta single-user local (un usuario a la vez)? El borrador menciona "concurrencia (dos usuarios editando)" como riesgo pero no define el comportamiento esperado. | Alto — si es multiusuario concurrente, se requiere manejo de conflictos de escritura. Si es single-user, no se necesita locking. | `resuelta` |
| Q-06 | ¿Debe añadirse el campo `linea` al modelo de MAQUINA? HU-02 indica "filtrar por planta, línea, tipo de máquina" pero el modelo implícito del borrador solo incluye `planta` y `tipo` en la entidad MAQUINA. | Medio — si no se añade, el filtro por línea no es implementable en Fase 1. | `resuelta` |
| Q-07 | ¿La eliminación de una causa con hijos en Fase 1 debe ser automática y silenciosa (CASCADE sin confirmación) o debe mostrar un diálogo de confirmación al usuario antes de borrar el subárbol? El borrador presenta ambas opciones explícitamente. | Medio — afecta al flujo UX de HU-09. En Fase 1 se asume CASCADE (D-04), pero si hay datos valiosos bajo el nodo el usuario podría borrarlos por error. | `resuelta` |
| Q-08 | ¿El campo `objetivo` del contrato es texto libre (ej: "< 150 min") o debe estructurarse en campos separados (operador, valor numérico, unidad) para soportar validación automática en Fase 2? | Medio — en Fase 1 puede ser texto libre, pero si Fase 2 necesita parsear el objetivo, un campo estructurado desde el inicio evita migración posterior. | `resuelta` |

---

## 11. Decisiones tomadas

| ID   | Decisión | Fecha | Registrada por |
|------|----------|-------|----------------|
| D-01 | Stack Fase 1: Python + Dash local + PostgreSQL local. Sin Dataiku, sin ML, sin LLM en Fase 1. Dataiku se incorpora en Fase 2. | 2026-04-21 | Humano (borrador inicial) |
| D-02 | El árbol causal es un DAG obligatorio. Los ciclos se validan en backend Python, no en SQL (las restricciones SQL de ciclos son complejas en PostgreSQL). | 2026-04-21 | Humano (borrador) |
| D-03 | En Fase 1 las causas no se comparten entre contratos. Cada causa pertenece a exactamente un contrato (`contrato_id` obligatorio). | 2026-04-21 | Humano (borrador) |
| D-04 | El borrado de causas en Fase 1 usa ON DELETE CASCADE (borrado silencioso del subárbol). El "modo seguro con confirmación" se pospone a fase posterior. Pendiente de validar por humano — ver Q-07. | 2026-04-21 | Agente (inferido del borrador: "Opción A fase 1 — simple: ON DELETE CASCADE") |
| D-05 | HU-08 (Hipótesis de aceptación/rechazo) **SÍ entra en Fase 1**. Se crea la tabla HIPOTESIS. La UI muestra estados de hipótesis en las tarjetas del árbol (bordes verde/rojo). | 2026-04-21 | Humano |
| D-06 | HU-06 (Evidencias) **NO entra en Fase 1**. Sin tabla EVIDENCIA. Las hipótesis pueden tener campo `criterio_validacion` (texto libre) como sustituto mínimo. Se pospone a Fase 2. | 2026-04-21 | Humano |
| D-07 | Visualización del árbol (HU-07): **árbol de tarjetas jerárquico** (vertical u horizontal) con `dash-cytoscape` o componente HTML recursivo. Sin espina de pescado clásica en Fase 1. | 2026-04-21 | Humano |
| D-08 | **Un solo rol de usuario** en Fase 1. Sin autenticación, sin gestión de sesiones, sin control de acceso. Todo el mundo puede realizar todas las acciones. | 2026-04-21 | Humano |
| D-09 | Fase 1 es **single-user local**. Sin concurrencia, sin locking. Herramienta de uso individual en local. | 2026-04-21 | Humano (inferido de D-08 y stack local) |
| D-10 | Tabla MAQUINA en Fase 1: **solo `id` y `nombre`**. Sin `planta`, `tipo` ni `linea`. Los filtros por planta/línea/tipo se posponen a fases posteriores. | 2026-04-21 | Humano |
| D-11 | Campo `objetivo` del CONTRATO: **texto libre** (`TEXT`). El parseo estructurado (operador/valor/unidad) se pospone a Fase 2. | 2026-04-21 | Humano |

---

## Versión inicial del requerimiento

*(Esta sección se elimina cuando el requerimiento está completo y validado por el humano.)*

idea para proyecto. Solve-isikawa.

primera version en python + dash local + postgresql local (no dataiku)

La idea tiene potencial, pero ahora mismo es demasiado abstracta para ser útil. “Solve-Ishikawa” puede convertirse en algo interesante si lo aterrizas como producto concreto.
1. Qué es la base: Diagrama de Ishikawa

También llamado “diagrama causa-efecto” o “espina de pescado”.

    Se usa para análisis de causa raíz (RCA)

    Estructura:

        Problema (cabeza)

        Categorías (huesos principales: máquina, método, material, mano de obra…)

        Sub-causas (ramificaciones)

👉 Problema real: en industria se hace manual, subjetivo y no reutilizable.
2. Idea “Solve-Ishikawa” (bien definida)
Concepto

Un sistema que convierte datos + contexto industrial en un Ishikawa dinámico y accionable.

No solo dibujar → resolver causas raíz automáticamente o semi-automáticamente.
3. Propuesta de arquitectura (alineada contigo)
🧠 Core

    Motor de generación de causas:

        Reglas (determinísticas)

        ML (correlaciones)

        LLM (interpretación contextual)

🗂️ Data layer

    Integración con:

        PI-Aveva (series temporales)

        Oracle / Databricks (producción, calidad)

    Feature engineering:

        agregados por lote / serie

        anomalías

        correlaciones

🧩 Capa semántica (clave)

    Taxonomía de causas:

        Máquina

        Método

        Material

        Operador

        Entorno

👉 Aquí puedes usar:

    vector search (Databricks)

    o PostgreSQL + embeddings

4. Funcionalidades clave (diferenciadoras)
1. Generación automática de Ishikawa

Input:

    máquina

    rango temporal

    defecto / KPI NOK

Output:

    árbol de causas con peso/probabilidad

2. Ranking de causas

No solo listar:
Causa	Impacto	Evidencia
Temperatura alta	0.82	correlación + desviación
Lote materia prima	0.67	clustering
3. Drill-down dinámico

Click en causa → ver:

    series temporales

    eventos

    correlaciones

4. Aprendizaje continuo

    Feedback del técnico:

        “esta causa fue correcta”

    Ajuste del modelo

5. Integración con tu ecosistema

Muy importante para ti:

    Front: Dash en Dataiku

    Backend:

        pipelines en Dataiku

        consultas a Databricks

    Futuro:

        MCP especializado en RCA

5. Evolución por fases (realista)
Fase 1 (rápida, alto valor)

    UI tipo Ishikawa en Dash

    causas manuales + reglas simples

    conexión a datasets

👉 objetivo: producto usable
Fase 2

    scoring automático de causas

    correlaciones + anomalías

    primeras features ML

Fase 3

    LLM + RAG:

        interpretación de contexto

        sugerencias de causas

    integración con tu sistema SDD (skills de análisis)

Fase 4 (muy potente)

    MCP “Root Cause Engine”

    reutilizable en toda la empresa

6. Diferenciación real (lo que lo hace potente)

Esto NO es un diagrama:

Es un sistema que:

    conecta datos industriales reales

    aprende de decisiones humanas

    propone causas con evidencia

👉 mezcla de:

    BI

    ML

    LLM

    conocimiento experto

7. Riesgos (importante que los veas)

    ❌ Ruido en datos industriales

    ❌ Correlación ≠ causalidad

    ❌ LLM inventando causas (hay que acotarlo)

    ❌ Falta de adopción si no es simple

8. Nombre y enfoque

“Solve-Ishikawa” funciona, pero conceptualmente es más:

    Root Cause Intelligence Platform

    Industrial RCA Engine

    Smart Ishikawa

9. Siguiente paso (concreto)

Define esto antes de avanzar:

    Caso real:

        “defectos en máquina X”

    Dataset concreto

    3–5 causas típicas conocidas

Con eso se puede diseñar un MVP en Dash + Dataiku en 1–2 iteraciones.

Si quieres, en el siguiente paso te bajo esto a:

    estructura de carpetas (clean architecture)

    modelo de datos

    endpoints / API

    primer flujo en Dataiku

sin teoría, solo implementación.

vamos a definir la fase uno a base de historias de usuario para despues poder comprender mejor el entorno.  
- como usuario, para un porceso quiero poder definir una fucnionalidad o contrato. ejemplo: pesado de cargas de negro de humo en un tiempo inferior a 150cmin.
- como usuario quiero poder definir la maquina/maquinas implicadas en el contrato
- como usuario quiero poder identificar las causas que pueden probocar que no alcance el contrato, será una relacion 1:N  (será importante poder discernir/marcar si es causa o efecto)
- de este primer nivel iran bajando niveles con relaciones 1:N hasta llegar a la causa primera de cada arbol

Correcto enfoque: estás definiendo el modelo conceptual del sistema (no la UI).
Voy a estructurarlo en historias de usuario formales + modelo implícito + reglas de negocio para que luego puedas implementarlo directamente (Dash + Dataiku).
1. Dominio base (lo que realmente estás modelando)

Estás definiendo 4 entidades clave:

    Proceso

    Contrato (objetivo medible)

    Máquinas

    Árbol causal (Ishikawa jerárquico)

2. Historias de usuario (bien formalizadas)
2.1 Definición de contrato
Escritura

Historia US-01 – Definir contrato de proceso

Como usuario
quiero definir un contrato funcional para un proceso
para poder establecer un objetivo medible de rendimiento o calidad

Criterios de aceptación:

    El contrato debe tener:

        nombre

        descripción

        métrica asociada (ej: tiempo, kg, ratio NOK…)

        valor objetivo (ej: < 150 min)

    Debe poder versionarse

    Debe poder activarse/desactivarse

2.2 Asociación a máquinas
Escritura

Historia US-02 – Asociar máquinas al contrato

Como usuario
quiero asociar una o varias máquinas a un contrato
para acotar el contexto operativo del análisis

Criterios de aceptación:

    Relación N contrato ↔ máquina

    Se debe poder filtrar por:

        planta

        línea

        tipo de máquina

    Debe permitir herencia futura (ej: contrato por familia de máquinas)

2.3 Definición de causas (nivel 1)
Escritura

Historia US-03 – Definir causas de primer nivel

Como usuario
quiero definir las causas que pueden provocar el incumplimiento del contrato
para estructurar el análisis de causa raíz

Criterios de aceptación:

    Relación 1 (contrato → causas)

    Cada causa debe tener:

        nombre

        descripción

        tipo: {causa, efecto}

        categoría (ej: máquina, método, material…)

    Debe poder marcarse como:

        causa directa

        efecto intermedio

2.4 Jerarquía de causas (árbol)
Escritura

Historia US-04 – Construir árbol causal jerárquico

Como usuario
quiero descomponer cada causa en sub-causas
para identificar la causa raíz del problema

Criterios de aceptación:

    Relación recursiva 1 (causa → sub-causas)

    Profundidad ilimitada

    Cada nodo debe poder:

        tener hijos o no

        marcarse como causa raíz

    Debe evitarse:

        ciclos (grafo acíclico obligatorio)

2.5 Identificación de causa raíz
Escritura

Historia US-05 – Identificar causa raíz

Como usuario
quiero marcar una causa como causa raíz
para indicar el punto final del análisis

Criterios de aceptación:

    Una causa raíz:

        no puede tener hijos

    Puede haber múltiples causas raíz en un mismo árbol

    Debe poder justificarse (campo texto obligatorio)

3. Modelo de datos implícito (clave para implementación)
3.1 Entidades

PROCESO
- id
- nombre

CONTRATO
- id
- proceso_id
- nombre
- metrica
- objetivo
- version
- activo

MAQUINA
- id
- nombre
- tipo
- planta

CONTRATO_MAQUINA
- contrato_id
- maquina_id

3.2 Árbol causal (core del sistema)

CAUSA
- id
- contrato_id
- parent_id (nullable)
- nombre
- descripcion
- tipo (causa | efecto)
- categoria
- es_causa_raiz (bool)
- nivel (opcional, derivado)

👉 Este diseño te permite:

    árbol completo

    queries recursivas

    futura analítica

4. Reglas de negocio (críticas)

Estas son las que hacen el sistema sólido:
4.1 Integridad del árbol

    No ciclos (DAG obligatorio)

    Un nodo no puede ser padre de sí mismo

    Una causa raíz no puede tener hijos

4.2 Semántica causa vs efecto

    Una causa puede tener hijos

    Un efecto debería tender a ser hoja o nodo intermedio

👉 Esto será importante cuando metas ML/LLM
4.3 Coherencia del contrato

    Toda causa pertenece a un contrato

    No se comparten causas entre contratos (en fase 1)

5. Qué tienes realmente en fase 1

No estás construyendo aún IA.

Estás construyendo:

    Un motor estructurado de conocimiento causal

Esto es clave para:

    fase 2 → scoring

    fase 3 → ML

    fase 4 → MCP

6. Lo que falta (y deberías añadir ya)

Te faltan 2 historias clave:
6.1 Evidencia (muy importante)
Escritura

Historia US-06 – Asociar evidencia a causas

Como usuario
quiero asociar datos o evidencias a una causa
para justificar su impacto en el contrato

Criterios de aceptación:

    Se puede asociar:

        dataset

        query

        gráfico

    Debe poder añadirse comentario técnico

6.2 Visualización (mínima pero necesaria)
Escritura

Historia US-07 – Visualizar árbol Ishikawa

Como usuario
quiero visualizar el árbol de causas
para entender la estructura del problema

Criterios de aceptación:

    Visualización jerárquica

    Colores por tipo (causa/efecto)

    Expansión/colapso de nodos

7. Siguiente paso lógico

Ahora ya puedes pasar a:
→ Diseño técnico

    estructura Dash (callbacks + estado)

    endpoints Dataiku

    queries SQL (árbol recursivo)

    modelo físico (PostgreSQL o dataset Dataiku)

Si quieres, en el siguiente paso te hago:

    esquema SQL completo

    endpoints API tipo Dataiku

    estructura de proyecto (clean architecture adaptado a tu stack)

directamente listo para implementar.

nueva historia:
- como usuario para cada causa quiero poder establecer la hipotesis de aceptacion/rechazo
- como usuario quiero poder construir el arbol desde la UI, añadiendo nuevas tarjetas hija haciendo click en la tarjeta padre. o eliminar la tarjeta

Buen avance. Estas dos historias ya entran en la interacción y validación del modelo, no solo en definición. Las formalizo y bajo a reglas implementables.
1. Hipótesis sobre causas
Escritura

Historia US-08 – Definir hipótesis de aceptación/rechazo

Como usuario
quiero definir una hipótesis para cada causa
para poder validar si realmente impacta en el incumplimiento del contrato

Criterios de aceptación:

    Cada causa puede tener 0..N hipótesis asociadas

    Una hipótesis debe tener:

        descripción

        tipo: {aceptación, rechazo}

        criterio de validación (texto o lógica)

    Debe poder marcarse estado:

        pendiente

        validada

        rechazada

    Debe permitir asociar evidencia (datasets, gráficos, queries)

1.1 Interpretación correcta (importante)

Esto introduce un nuevo concepto:

👉 No validas la causa directamente → validas hipótesis sobre la causa

Ejemplo:

    Causa: “Temperatura alta”

    Hipótesis:

        H1: “Si temperatura > X → aumenta tiempo ciclo” → aceptación

        H2: “No hay correlación con tiempo ciclo” → rechazo

1.2 Modelo de datos asociado

HIPOTESIS
- id
- causa_id
- descripcion
- tipo (aceptacion | rechazo)
- criterio_validacion
- estado (pendiente | validada | rechazada)
- evidencia_id (opcional)

1.3 Reglas de negocio

    Una causa puede tener múltiples hipótesis

    Una hipótesis no puede existir sin causa

    El estado de la causa en el futuro podrá derivarse de:

        hipótesis validadas

        scoring (fase 2+)

2. Construcción del árbol desde UI
Escritura

Historia US-09 – Construcción interactiva del árbol desde UI

Como usuario
quiero construir el árbol de causas directamente desde la interfaz
para poder modelar el análisis de forma ágil e intuitiva

Criterios de aceptación:

    Se puede:

        añadir causa hija desde una causa padre (click)

        eliminar una causa

        editar una causa

    La creación debe:

        heredar automáticamente el contrato_id

        asignar correctamente el parent_id

    La eliminación:

        debe eliminar recursivamente los hijos (o pedir confirmación)

    La UI debe reflejar los cambios en tiempo real

3. Comportamiento UI esperado (clave para Dash)
3.1 Interacciones mínimas
Añadir nodo

    botón “+” en tarjeta

    acción:

        crea nueva causa con:

            parent_id = nodo actual

            contrato_id heredado

Eliminar nodo

    botón “🗑”

    opciones:

        modo simple (fase 1):

            borrar nodo + hijos

        modo seguro (futuro):

            warning si tiene hijos

Editar nodo

    click en tarjeta → panel lateral/modal

    edición:

        nombre

        tipo (causa/efecto)

        categoría

3.2 Estructura visual recomendada

    Tarjetas tipo árbol (no Ishikawa clásico aún)

    Jerarquía vertical u horizontal

    Estados visuales:

        causa raíz → color especial

        hipótesis validadas → borde verde

        rechazadas → rojo

4. Modelo técnico para UI (Dash)

Necesitas un estado tipo:

tree = [
    {
        "id": "1",
        "parent_id": None,
        "label": "Problema",
        "children": [
            {
                "id": "2",
                "parent_id": "1",
                "label": "Temperatura",
                "children": []
            }
        ]
    }
]

👉 Pero en backend:

    SIEMPRE estructura plana (tabla)

    UI reconstruye árbol

5. Reglas críticas (no opcionales)
5.1 Integridad al crear

    parent_id debe existir

    contrato_id obligatorio

5.2 Integridad al borrar

    evitar nodos huérfanos

    transacción completa (importante en Dataiku SQL)

5.3 Consistencia UI ↔ backend

    UI no es fuente de verdad

    backend valida todo

6. Lo que acabas de añadir (visión global)

Con estas dos historias ya tienes:
Nivel 1

    definición del problema (contrato)

Nivel 2

    estructura causal

Nivel 3

    validación científica (hipótesis)

👉 Esto ya no es un Ishikawa simple.

Es:

    Sistema de análisis causal estructurado + validación experimental

7. Siguiente hueco que aparece (muy importante)

Te falta una historia crítica que ahora es evidente:
7.1 Ejecución de hipótesis

Sin esto, el sistema se queda teórico.

Si quieres, el siguiente paso debería ser:

    ejecutar hipótesis sobre datos reales

    automatizar validación (SQL / Python / ML)

Si continuamos, puedo definirte:

    US-10 → ejecución de hipótesis

    US-11 → scoring automático de causas

    diseño de callbacks Dash para el árbol

directamente conectados con Dataiku.

nueva historia:
- el sistema debe persisitir las tarjetas en una base de datos postgresql y ser capaz de reconstruirlo para un proceso y contrato dado.

Esta historia introduce el estado persistente del sistema. Sin esto, todo lo anterior es efímero. La formalizo y la bajo directamente a diseño técnico.
1. Persistencia y reconstrucción
Escritura

Historia US-10 – Persistencia y reconstrucción del árbol causal

Como usuario
quiero que el sistema persista las tarjetas (causas) en una base de datos PostgreSQL
para poder reconstruir el árbol completo para un proceso y contrato dado

Criterios de aceptación:

    Todas las causas deben almacenarse en PostgreSQL

    Debe existir relación explícita:

        proceso → contrato → causas

    El sistema debe poder:

        reconstruir el árbol completo a partir de la base de datos

        mantener la jerarquía (parent_id)

    La reconstrucción debe ser determinista (mismo input → mismo árbol)

    Debe soportar múltiples contratos simultáneamente

2. Modelo físico (PostgreSQL)
2.1 Tablas mínimas

-- PROCESO
CREATE TABLE proceso (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL
);

-- CONTRATO
CREATE TABLE contrato (
    id SERIAL PRIMARY KEY,
    proceso_id INT REFERENCES proceso(id),
    nombre TEXT,
    metrica TEXT,
    objetivo TEXT,
    version INT,
    activo BOOLEAN DEFAULT TRUE
);

-- CAUSA (árbol)
CREATE TABLE causa (
    id SERIAL PRIMARY KEY,
    contrato_id INT REFERENCES contrato(id),
    parent_id INT REFERENCES causa(id),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT CHECK (tipo IN ('causa', 'efecto')),
    categoria TEXT,
    es_causa_raiz BOOLEAN DEFAULT FALSE
);

2.2 Índices (no opcional)

CREATE INDEX idx_causa_contrato ON causa(contrato_id);
CREATE INDEX idx_causa_parent ON causa(parent_id);

👉 Esto es crítico para reconstrucción rápida.
3. Reconstrucción del árbol
3.1 Query base

SELECT *
FROM causa
WHERE contrato_id = :contrato_id;

3.2 Reconstrucción en Python (backend)

def build_tree(causas):
    nodes = {c["id"]: {**c, "children": []} for c in causas}
    root = []

    for c in nodes.values():
        if c["parent_id"]:
            parent = nodes[c["parent_id"]]
            parent["children"].append(c)
        else:
            root.append(c)

    return root

3.3 Alternativa SQL (recursiva)

PostgreSQL permite:

WITH RECURSIVE tree AS (
    SELECT *, 0 AS level
    FROM causa
    WHERE parent_id IS NULL AND contrato_id = :contrato_id

    UNION ALL

    SELECT c.*, t.level + 1
    FROM causa c
    JOIN tree t ON c.parent_id = t.id
)
SELECT * FROM tree;

👉 Útil para:

    orden

    niveles

    debugging

4. Reglas de persistencia (críticas)
4.1 Inserción

    Siempre guardar:

        contrato_id

        parent_id (nullable)

    Validar:

        parent pertenece al mismo contrato

4.2 Borrado

Dos opciones:
Opción A (fase 1 – simple)

ON DELETE CASCADE

👉 elimina todo el subárbol
Opción B (más controlada)

    borrar manualmente recursivo

    pedir confirmación en UI

4.3 Consistencia

    No permitir:

        parent_id inexistente

        ciclos

👉 (los ciclos los controlas en backend, no en SQL)
5. Flujo completo (end-to-end)
Crear nodo desde UI

    Usuario hace click “+”

    Front envía:

{
  "nombre": "Temperatura alta",
  "parent_id": 12,
  "contrato_id": 3
}

    Backend:

    valida

    inserta en PostgreSQL

Cargar árbol

    Usuario selecciona contrato

    Backend:

        query causas

        build_tree()

    Front:

        renderiza árbol

6. Integración con tu stack (Dataiku)
Backend típico:

    Python API (Dataiku o servicio externo)

    Conexión PostgreSQL:

        psycopg2 o sqlalchemy

Alternativa (muy alineada contigo):

    usar Dataiku como orquestador

    PostgreSQL como storage

    Dash como frontend

7. Riesgos reales

    ❌ árboles grandes → problemas de performance

    ❌ reconstrucción frecuente → carga innecesaria

    ❌ concurrencia (dos usuarios editando)

👉 Fase 1:

    no optimices demasiado aún

    prioriza consistencia

8. Lo que ya tienes construido (importante)

Con esta historia ya tienes:

    modelo persistente

    árbol reconstruible

    base para:

        versionado

        ML

        auditoría

9. Siguiente paso lógico

Ahora aparece un nuevo problema:

👉 control de versiones del árbol

Porque:

    los árboles cambian

    necesitas histórico

Si seguimos, el siguiente bloque debería ser:

    versionado de contratos y árboles

    auditoría de cambios

    multiusuario

Eso es lo que convierte esto en sistema industrial real, no demo.

el sistema elegido será dataiku y dash

Perfecto. Esto cambia decisiones clave: no es un sistema genérico web, es un webapp Dash dentro de Dataiku DSS con PostgreSQL como storage.

Voy a aterrizar la fase 1 a tu stack real.
1. Arquitectura objetivo (fase 1)
Componentes

[ Dash Webapp (Dataiku) ]
        │
        │ callbacks (UI → lógica)
        ▼
[ Python backend (mismo app.py) ]
        │
        ├── Dataiku API / SQLExecutor2
        └── psycopg2 / SQLAlchemy
        ▼
[ PostgreSQL (árbol causal persistido) ]

👉 En fase 1:

    TODO vive en la webapp Dash

    No necesitas API externa aún

2. Decisión crítica (correcta en tu contexto)
❗ NO usar datasets de Dataiku para el árbol

Motivo:

    necesitas jerarquía (parent_id)

    operaciones frecuentes (insert/delete)

    integridad

👉 Usa PostgreSQL directamente.
3. Estructura del proyecto Dash (dentro de Dataiku)

Siguiendo lo que ya haces (modularización):

/app
 ├── app.py
 ├── callbacks/
 │    ├── tree_callbacks.py
 │    ├── crud_callbacks.py
 │
 ├── services/
 │    ├── causa_service.py
 │    ├── contrato_service.py
 │
 ├── repositories/
 │    ├── causa_repository.py
 │    ├── db_connection.py
 │
 ├── components/
 │    ├── tree_view.py
 │    ├── causa_card.py
 │
 └── utils/
      ├── tree_builder.py

👉 Esto es clean architecture ligera adaptada a Dash
4. Capa de acceso a datos (PostgreSQL)
4.1 Conexión (reutilizable)

# repositories/db_connection.py

import psycopg2
import os

def get_connection():
    return psycopg2.connect(
        host=os.getenv("PG_HOST"),
        dbname=os.getenv("PG_DB"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        port=5432
    )

👉 En Dataiku:

    usa variables de proyecto o conexiones gestionadas

4.2 Repository (core)

# repositories/causa_repository.py

from .db_connection import get_connection

def get_causas_by_contrato(contrato_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, parent_id, nombre, tipo, categoria, es_causa_raiz
        FROM causa
        WHERE contrato_id = %s
    """, (contrato_id,))

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return rows

5. Reconstrucción del árbol (backend)

# utils/tree_builder.py

def build_tree(rows):
    nodes = {
        r[0]: {
            "id": r[0],
            "parent_id": r[1],
            "label": r[2],
            "tipo": r[3],
            "categoria": r[4],
            "children": []
        }
        for r in rows
    }

    root = []

    for node in nodes.values():
        if node["parent_id"]:
            parent = nodes[node["parent_id"]]
            parent["children"].append(node)
        else:
            root.append(node)

    return root

6. Servicio (lógica de negocio)

# services/causa_service.py

from repositories.causa_repository import get_causas_by_contrato
from utils.tree_builder import build_tree

def get_tree(contrato_id):
    rows = get_causas_by_contrato(contrato_id)
    return build_tree(rows)

7. UI en Dash (clave)
7.1 Concepto

No intentes un Ishikawa clásico en fase 1.

👉 Usa:

    árbol vertical

    tarjetas expandibles

7.2 Componente básico

# components/tree_view.py

from dash import html

def render_node(node):
    return html.Div([
        html.Div(node["label"], className="card"),
        html.Button("+", id={"type": "add", "id": node["id"]}),
        html.Button("🗑", id={"type": "delete", "id": node["id"]}),
        html.Div([
            render_node(child) for child in node["children"]
        ], className="children")
    ])

def render_tree(tree):
    return html.Div([render_node(n) for n in tree])

8. Callback clave (carga inicial)

# callbacks/tree_callbacks.py

from dash.dependencies import Input, Output
from services.causa_service import get_tree
from components.tree_view import render_tree

def register_callbacks(app):

    @app.callback(
        Output("tree-container", "children"),
        Input("contrato-selector", "value")
    )
    def load_tree(contrato_id):
        if not contrato_id:
            return "Selecciona contrato"

        tree = get_tree(contrato_id)
        return render_tree(tree)

9. CRUD desde UI
Añadir nodo

def insert_causa(nombre, parent_id, contrato_id):
    # INSERT INTO causa ...

Eliminar nodo (fase 1)

👉 recomendación:

    usar ON DELETE CASCADE

    backend simple

10. Flujo completo en tu sistema

    Usuario selecciona contrato

    Dash → callback

    Backend:

        query PostgreSQL

        reconstruye árbol

    UI renderiza

11. Decisiones que has tomado (y son correctas)

✔ Dataiku como entorno
✔ Dash como frontend
✔ PostgreSQL como storage
✔ Modelo jerárquico explícito

👉 Esto es industrializable, no un prototipo.
12. Lo que aparece ahora (siguiente problema real)

Con esta arquitectura, el siguiente cuello es:
🔴 Estado en Dash

    cómo mantener:

        nodo seleccionado

        edición en curso

        sincronización con DB

👉 necesitarás:

    dcc.Store

    o estado server-side

13. Siguiente paso recomendado

El siguiente bloque lógico es:
→ Diseño de callbacks completos

    add node

    delete node

    edit node

    refresh parcial

y evitar:

    recargar todo el árbol cada vez

Si quieres, en el siguiente paso te diseño:

    sistema completo de callbacks (pattern-matching IDs bien hecho)

    gestión de estado en Dash

    estrategia para no romper rendimiento

directamente aplicable a tu webapp en Dataiku.

- para dentro de dataiku utilizaremos executor 2

Buena decisión. Usar SQLExecutor2 encaja mejor con tu entorno (credenciales gestionadas, logging, integración con escenarios).

Voy a ajustar la arquitectura anterior específicamente a Dataiku + Dash + SQLExecutor2.
1. Cambio clave en arquitectura
Antes

    psycopg2 directo

Ahora

    Dataiku como gateway SQL

Dash (callbacks)
   ↓
services (lógica)
   ↓
repositories (SQLExecutor2)
   ↓
PostgreSQL (via conexión Dataiku)

👉 Ventajas:

    no gestionas credenciales manualmente

    logging integrado

    coherente con tus pipelines

2. Conexión con SQLExecutor2
2.1 Inicialización

import dataiku
from dataiku import SQLExecutor2

def get_executor(connection):
    return SQLExecutor2(connection=connection)

👉 connection = nombre conexión en Dataiku
(ej: "POSTGRES_PROD")
3. Repository adaptado (core real)
3.1 Lectura de causas

# repositories/causa_repository.py

from dataiku import SQLExecutor2

CONNECTION = "POSTGRES_CONN"

def get_causas_by_contrato(contrato_id):
    executor = SQLExecutor2(connection=CONNECTION)

    query = f"""
        SELECT 
            id,
            parent_id,
            nombre,
            tipo,
            categoria,
            es_causa_raiz
        FROM causa
        WHERE contrato_id = {contrato_id}
    """

    df = executor.query_to_df(query)

    return df.to_dict("records")

⚠️ Nota importante (seguridad)

En fase 1 puedes usar f-strings, pero:

👉 en cuanto evoluciones:

    parametriza queries

    evita SQL injection

4. Inserción de nodos (SQLExecutor2)

def insert_causa(nombre, parent_id, contrato_id):
    executor = SQLExecutor2(connection=CONNECTION)

    query = f"""
        INSERT INTO causa (nombre, parent_id, contrato_id, tipo)
        VALUES ('{nombre}', {parent_id if parent_id else 'NULL'}, {contrato_id}, 'causa')
    """

    executor.exec_recipe_fragment(query)

🔴 Detalle crítico

    query_to_df → SELECT

    exec_recipe_fragment → INSERT / UPDATE / DELETE

👉 esto es clave en Dataiku
5. Eliminación (recomendado)
Opción simple (fase 1)

En PostgreSQL:

FOREIGN KEY (parent_id) REFERENCES causa(id) ON DELETE CASCADE

Luego:

def delete_causa(causa_id):
    executor = SQLExecutor2(connection=CONNECTION)

    query = f"DELETE FROM causa WHERE id = {causa_id}"

    executor.exec_recipe_fragment(query)

👉 elimina todo el subárbol automáticamente
6. Servicio (sin cambios conceptuales)

# services/causa_service.py

from repositories.causa_repository import get_causas_by_contrato
from utils.tree_builder import build_tree

def get_tree(contrato_id):
    rows = get_causas_by_contrato(contrato_id)
    return build_tree(rows)

7. Integración con Dash (flujo real)
Callback típico

@app.callback(
    Output("tree-container", "children"),
    Input("contrato-selector", "value")
)
def load_tree(contrato_id):
    if not contrato_id:
        return "Selecciona contrato"

    tree = get_tree(contrato_id)
    return render_tree(tree)

8. Problema real que introduces (y debes controlar)
🔴 SQLExecutor2 NO es transaccional por defecto

Esto implica:

    varias operaciones seguidas → riesgo inconsistencia

    errores intermedios → estado parcial

Solución fase 1

    operaciones simples (1 query = 1 acción)

    evitar lógica compleja en DB

Solución fase 2+

    usar post_queries=["COMMIT"]

    o agrupar lógica en procedimientos

9. Logging (muy útil en Dataiku)

import logging

logger = logging.getLogger(__name__)

def insert_causa(...):
    logger.info(f"Inserting causa: {nombre}")

👉 aparecerá en logs de webapp
10. Performance (realista en tu caso)

SQLExecutor2:

    no es ultra rápido

    pero suficiente para:

        árboles < 1k nodos

👉 fase 1 OK
11. Decisión importante que has tomado

Estás convergiendo a:

    Dataiku como backend lógico + PostgreSQL como storage + Dash como UI

Esto encaja perfectamente con:

    tu uso de pipelines

    tu futuro MCP

    integración con Databricks

12. Siguiente problema que aparece

Ahora que usas SQLExecutor2:
🔴 gestión de IDs

Necesitas recuperar el ID insertado:

RETURNING id

Ejemplo

query = """
INSERT INTO causa (nombre, contrato_id)
VALUES ('test', 1)
RETURNING id
"""

👉 pero SQLExecutor2 no siempre lo devuelve directo → tendrás que:

    hacer SELECT posterior

    o usar UUIDs (mejor opción)

13. Recomendación técnica clave

👉 Usa UUID en lugar de SERIAL

Evita problemas de:

    concurrencia

    recuperación de ID

    sincronización UI

14. Siguiente paso lógico

Ahora el siguiente bloque crítico es:
→ Callbacks completos de CRUD

    add node (pattern matching)

    delete node

    edición inline

    actualización parcial del árbol

Si seguimos, te diseño:

    callbacks Dash con pattern IDs (bien hechos)

    gestión de estado (dcc.Store)

    evitar re-render completo del árbol

directamente listo para copiar en tu webapp Dataiku.


## testeo

para el testeo asegurar que es posible crear el arbol contrato 1, causa 1.1 causa 1.2, causa 1.1.1, causa 1.1.2, causa 1.1.2.1 
