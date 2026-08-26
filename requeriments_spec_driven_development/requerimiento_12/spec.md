# Especificación técnica — Requerimiento 12

**Estado:** `vencido` — requisito inicial reformulado; no continuar este flujo.  
**Versión:** 0.3 — enmienda `AMD-002` de tipo B  
**Autor:** `requirements-agent`  
**Fecha:** 2026-08-01  
**Gate siguiente:** validación humana de `spec.md`; no autoriza todavía `task_plan.md` ni implementación.

## 1. Overview

Requerimiento 12 define una capacidad generalista de UC_BIB_Solve para capturar, conservar y recuperar contexto estructurado de más de 1000 procesos industriales. El producto no se especializa en MACBU/BU: cualquier proceso aporta bloques, nodos, relaciones, declaraciones, hechos y evidencias que se almacenan con contratos comunes y extensibles.

El producto integra seis capas complementarias:

1. **Núcleo BPM relacional existente:** procesos, versiones, nodos y transiciones representan la semántica de flujo y sus relaciones.
2. **Detalle JSON/JSONB generalista:** cada bloque o nodo puede aportar propiedades declarativas, contexto y procedencia sin crear un esquema por proceso o dominio.
3. **Metodología causal existente:** plantillas, análisis, consignas, instrucciones y estructura de ejecución de árboles causales se conservan como contrato versionado y no se sustituyen por el contexto nuevo.
4. **Contexto RAG estructurado:** el conocimiento recuperable se compone de BPM, detalle estructurado, metodología, referencias, hechos y evidencias, con identidad, versión y procedencia.
5. **Hechos de ejecución/evidencias:** eventos observados, mediciones, inspecciones, intervenciones y soportes se conservan separados de las declaraciones vigentes.
6. **KPI bajo demanda:** los cálculos se exponen mediante endpoints cuando se soliciten; sus métricas/resultados calculados no se persisten como modelo de producto.

`proceso_BU_estructurado.md` es únicamente un **fixture/test de cobertura y gap discovery**. Es útil para comprobar si el contrato generalista puede representar un proceso complejo, pero no define un modelo especializado de MACBU/BU, una bounded context, tablas, entidades ni catálogos exclusivos.

## 2. Objetivo y actores

### Objetivo

Permitir que el sistema tome las claves y bloques relevantes de cualquier proceso, los organice en un contexto estructurado generalista, conserve trazabilidad y los recupere para técnicos, análisis causales y futuros consumidores RAG, manteniendo la compatibilidad con BPM, causalidad, plantillas y ejecución actuales.

### Actores

- **Técnico/analista:** consulta contexto, inicia y ejecuta análisis causal, registra decisiones y evidencias.
- **Responsable de proceso:** aporta o revisa declaraciones, bloques, versiones y procedencia.
- **Operador:** registra hechos de ejecución e intervenciones cuando el proceso lo requiera.
- **Consumidor RAG/agente:** recupera el mismo conocimiento estructurado mediante una representación no visual.
- **Backend/dominio/persistencia:** aplica contratos, validaciones, trazabilidad y almacenamiento.
- **Frontend:** presenta navegación, edición y consulta sin contener reglas de negocio.

## 3. Glosario

- **BPM relacional:** modelo persistente de procesos, versiones, nodos, transiciones y relaciones semánticas.
- **Bloque/nodo:** unidad de contexto que puede pertenecer a cualquier nivel o tipo semántico soportado por el BPM.
- **Detalle generalista:** objeto JSON/JSONB asociado a un bloque/nodo, con estructura contractual común y extensiones por familia.
- **Declaración:** conocimiento vigente sobre propósito, operación, parámetros, capacidades, contratos o condiciones.
- **Hecho de ejecución:** observación situada en una ejecución, lote, incidente o intervalo temporal.
- **Evidencia:** soporte de una observación, evaluación o decisión.
- **Metodología causal:** plantilla, prompt, consignas, instrucciones y estructura de ejecución que gobiernan el análisis de causas.
- **Contexto RAG:** conjunto recuperable de datos estructurados, relaciones, instrucciones versionadas, hechos y evidencias con procedencia.
- **Fixture BU:** caso de prueba de cobertura; no es un modelo de dominio dedicado.
- **KPI bajo demanda:** valor calculado por un endpoint usando entradas y versiones explícitas, sin persistir el resultado como métrica.

## 4. Alcance

### Incluido

- Contrato generalista para describir cualquier proceso y sus bloques/nodos.
- Conservación del BPM relacional existente y su reconstrucción independiente de la UI.
- Detalle JSON/JSONB generalista, con `schema_version`, `source/provenance` y familia declarada.
- Separación de declaraciones vigentes, hechos de ejecución y evidencias.
- Recuperación de contexto estructurado para RAG y para vistas técnicas.
- Compatibilidad del flujo causal actual: contrato, plantilla, árbol, causa, hipótesis, evaluación, decisión, conclusión, reapertura y evidencias.
- Versionado y trazabilidad de proceso, plantilla, análisis, nodo, vínculo, hecho y procedencia cuando existan en los contratos actuales.
- Extensión de los módulos existentes de frontend, backend, dominio y persistencia.
- Cálculos KPI únicamente mediante endpoints bajo demanda, sin persistencia de métricas calculadas.
- Uso del fixture BU para descubrir huecos y verificar cobertura del contrato generalista.

### Reutilizable para cualquier proceso

- Identidad estable y aliases operativos.
- Tipos de nodo, relaciones BPM, versiones y procedencia.
- Estructura común de detalle JSON/JSONB.
- Separación declarativo/ejecución/evidencia.
- Contexto RAG y consultas de reconstrucción.
- Plantilla, prompt, consignas y trazabilidad de metodología causal.
- Contratos declarativos en texto libre y campos comunes, sin convertirlos en fórmulas automáticamente.

### Configurable por proceso/familia

- Claves y bloques relevantes que el proceso aporte.
- Familias de detalle y sus campos opcionales.
- Nombres, códigos, alias y unidades operativas.
- Relaciones entre sus nodos y recursos.
- Hechos, evidencias y fuentes que sea necesario registrar.
- Contratos declarativos y reglas de cálculo que se autoricen en el futuro.
- Catálogo de instrucciones adicionales, siempre subordinado a la metodología común y versionado.

### Fuera de alcance

- Modelo, bounded context, tablas, entidades o repositorios específicos para MACBU/BU, recetas, trolleys, bigbags, defectos o cualquier otro proceso fixture.
- Sustitución del BPM relacional por JSON/JSONB.
- Sustitución, reinterpretación u omisión de la metodología, plantilla, estructura de ejecución o consignas causales actuales.
- Integración automática con PLC, PI-AVEVA, Databricks u otras fuentes externas.
- Envío automático a una IA externa.
- Persistencia de KPI o métricas calculadas.
- Automatización de conclusiones causales o reglas `AND`/`OR` no definidas por la metodología actual.
- Control directo de máquinas o ejecución industrial.

## 5. Requisitos funcionales

### FR-01 — Contexto generalista y extensible

EL SISTEMA DEBERÁ aceptar procesos de dominios distintos mediante los mismos contratos de identidad, nodo, relación, detalle, hecho, evidencia y procedencia. EL SISTEMA NO DEBERÁ requerir una tabla, modelo persistente o bounded context por proceso, máquina o dominio.

EL SISTEMA DEBERÁ permitir que cada bloque/nodo declare una familia y un `schema_version`, conserve sus claves relevantes y mantenga extensiones JSON/JSONB sin perder la identidad ni las relaciones relacionales.

### FR-02 — Núcleo BPM relacional preservado

EL SISTEMA DEBERÁ mantener el modelo BPM relacional existente para procesos canónicos, versiones, nodos, transiciones y relaciones semánticas. Las relaciones de flujo, precedencia, jerarquía, referencias, entradas, salidas, decisiones y stocks que ya sean estructurales DEBERÁN permanecer fuera del JSON/JSONB.

EL SISTEMA DEBERÁ reconstruir la semántica sin depender de HTML, SVG, CSS, coordenadas, orden de renderizado ni estado local del navegador. Una máquina, equipo o recurso DEBERÁ seguir siendo un recurso asociado cuando la metodología BPM actual así lo define, no un nodo de flujo por el mero hecho de aparecer en un fixture.

### FR-03 — Detalle JSON/JSONB generalista por bloque/nodo

EL SISTEMA DEBERÁ guardar los detalles no estructurales de un bloque/nodo en el mecanismo JSON/JSONB existente, principalmente `pm_process_node_metadata.metadata` cuando aplique, con contrato común y extensiones controladas.

El detalle podrá incluir, según disponibilidad, misión, objetivo, descripción de operación, modo de funcionamiento, parámetros declarativos, indicadores relevantes, contrato de operación, identidad externa, alias, unidad, fuente, procedencia y `schema_version`. Estos campos describen el contexto; no crean tablas implícitas ni convierten cada clave en una entidad especializada.

La clave funcional de un documento declarativo generalista será la combinación de contexto/propietario estable y familia conforme al mecanismo existente. El contrato NO deberá exigir que versión de proceso, contrato causal o variante se conviertan automáticamente en nuevas tablas de detalle. Los cambios deberán respetar el comportamiento histórico del almacenamiento vigente y las decisiones de versionado aprobadas para cada capa.

### FR-04 — Declaraciones, hechos y evidencias

EL SISTEMA DEBERÁ distinguir:

- declaración vigente: definición, regla, parámetro, capacidad, contrato o instrucción aplicable;
- hecho de ejecución: evento, timestamp, lectura, incidencia, inspección, intervención, consumo o resultado observado;
- evidencia: documento, gráfica, fotografía, validación, plantilla, comentario u otro soporte.

Un hecho DEBERÁ conservar, cuando exista, su ejecución/intervalo, origen, calidad, referencia al bloque/nodo y declaración aplicable. Un hecho NO DEBERÁ sobrescribir la declaración vigente ni presentarse como una nueva versión de ella. Una evidencia DEBERÁ conservar su referencia al hecho, evaluación o decisión que soporta cuando esa relación esté disponible.

### FR-05 — Contexto RAG recuperable

EL SISTEMA DEBERÁ poder devolver un contexto estructurado reconstruible que combine BPM, detalles JSON/JSONB, metodología causal, relaciones, hechos, evidencias, versiones y procedencia relevantes para una consulta.

La recuperación DEBERÁ poder filtrar o anclar el resultado por proceso, versión, bloque/nodo, familia, análisis, contrato, incidente, ejecución y origen cuando esos identificadores existan. La representación RAG DEBERÁ conservar claves estables y relaciones explícitas; no DEBERÁ depender del texto visual ni de inferencias por proximidad.

Técnicos y consumidores RAG DEBERÁN leer el mismo conocimiento base. Una vista técnica podrá resumir o presentar diferente formato, pero no podrá alterar la semántica ni ocultar la procedencia requerida para reconstrucción.

### FR-06 — Metodología y plantillas de árboles causales

EL SISTEMA DEBERÁ conservar sin cambios semánticos la metodología existente de árboles causales, incluyendo su plantilla de análisis, plantilla/estructura de ejecución, prompt, consignas e instrucciones actuales. Estos artefactos DEBERÁN formar parte explícita del contexto versionado y de la trazabilidad del análisis.

La nueva capa BPM/contexto NO DEBERÁ romper, sustituir, reinterpretar, omitir ni convertir en fórmulas calculables las consignas existentes. Las instrucciones declarativas se conservarán como contratos de metodología. Solo una regla que la metodología defina explícitamente como calculable podrá pasar a un cálculo bajo demanda.

### FR-07 — Compatibilidad causal hacia atrás

EL SISTEMA DEBERÁ seguir soportando los contratos, análisis, plantillas, causas, hipótesis, evaluaciones, evidencias, reaperturas, decisiones de rama y endpoints existentes. La cadena mínima DEBERÁ seguir siendo explícita:

`contrato -> análisis -> plantilla/metodología -> causa -> hipótesis -> evidencia/evaluación -> conclusión/decisión`.

Cada hipótesis DEBERÁ referirse a una única causa y conservar los estados actuales `pendiente`, `validada` o `descartada`. La conclusión de causa y la decisión de rama DEBERÁN conservar autor, fecha, justificación y referencias a las evaluaciones/evidencias según la metodología actual. EL SISTEMA NO DEBERÁ inferir una conclusión nueva por reglas `AND`/`OR` no declaradas.

Cuando se vinculen elementos causales con BPM, el vínculo DEBERÁ conservar tipo, identidad, papel, proceso/versión y procedencia. No se permitirán vínculos inferidos desde la posición visual ni remapeos silenciosos por publicar una nueva versión.

### FR-08 — Contratos declarativos y fórmulas

EL SISTEMA DEBERÁ conservar el contrato declarativo legible en texto libre y los campos comunes realmente aportados. NO DEBERÁ convertir texto libre en fórmula ni exigir DSL ejecutable para iniciar un análisis humano.

Una fórmula, regla, entrada, resultado o clasificación calculable DEBERÁ distinguirse del contrato declarativo y solo podrá evaluarse bajo demanda mediante un endpoint autorizado. Las instrucciones y consignas no calculables DEBERÁN seguir siendo contexto declarativo versionado.

### FR-09 — Hechos y KPI bajo demanda

EL SISTEMA DEBERÁ conservar hechos de ejecución únicamente cuando formen parte del alcance del proceso o análisis y con sus referencias de procedencia. Los KPI descriptivos dentro del detalle son declaraciones de indicadores relevantes; no son valores calculados.

Cuando se solicite un KPI, el backend podrá calcularlo con entradas y versiones explícitas y devolverlo por endpoint. El resultado DEBERÁ incluir procedencia suficiente para reproducirlo, pero NO DEBERÁ insertarse como métrica persistente, tabla de KPI, snapshot calculado ni modificación de la declaración fuente.

### FR-10 — Fixture/test BU y gap discovery

EL SISTEMA DEBERÁ poder usar `proceso_BU_estructurado.md` para probar si el contrato generalista cubre identidades, recursos, bloques, relaciones, hechos, evidencias, defectos, inspecciones, decisiones y procedencia del caso BU.

Las menciones a MACBU, BU, mezcla, lote, receta, trolley, RFID, bigbag, PSA, BA, SO, EV, defectos o imbricación DEBERÁN tratarse como datos de fixture, ejemplos de claves o gaps por resolver. No DEBERÁN generar tablas/modelos dedicados, nombres de bounded context, reglas universales del producto ni requisitos de cobertura para los otros procesos.

### FR-11 — Responsabilidades y ubicación en módulos existentes

- **Frontend:** `uc_bib_solv/webapp_java/webapp/js/api/`, `js/core/`, `js/components/` y `js/views/` para navegación, selección de contexto, visualización de BPM/causalidad, formularios, estados vacío/carga/error y página Markdown de instrucciones. No contendrá invariantes, cálculos de KPI ni reglas causales.
- **Backend HTTP:** `uc_bib_solv/webapp_java/python-backend/routes/` para adaptar solicitudes/respuestas, códigos HTTP y contratos JSON existentes. Se extenderán rutas existentes de `causas.py` y `analysis.py` o equivalentes ya registrados; no se inventará otra aplicación.
- **Servicios de aplicación:** `uc_bib_solv/webapp_java/python-backend/services/` para orquestar casos de uso, validación de payload, recuperación de contexto, registro de hechos/evidencias y cálculo bajo demanda.
- **Dominio:** módulos de dominio existentes bajo `app/domain/` o el límite equivalente ya usado por el repositorio, sin importar Flask, SQL, PostgreSQL, Dash, Dataiku ni APIs externas. Aquí vivirán invariantes, value objects, contratos abstractos y reglas reutilizables.
- **Persistencia:** `app/persistence/` para conexión, repositorios, mapeos, sincronización y consultas. Se reutilizarán `db.py`, repositorios de `contrato`, `analisis_causas`, `analisis_causas_detalle`, `causa`, `hipotesis`, nodos, relaciones y los repositorios BPM existentes.
- **Esquema:** `db/schema.sql` y el flujo de inicialización vigente para cualquier ajuste generalista aprobado. No se crearán DDL ni carpetas específicas de BU/MACBU.

### FR-12 — Página de instrucciones

EL SISTEMA DEBERÁ exponer desde la UI la plantilla común, el prompt común y las instrucciones/consignas versionadas en Markdown legible y copiable. La página podrá servir el contexto para uso manual en una IA externa, pero NO DEBERÁ enviar datos automáticamente ni requerir integración API de IA en esta fase.

## 6. Requisitos no funcionales

- **Compatibilidad:** las consultas y operaciones actuales de BPM, causalidad, plantillas y análisis seguirán funcionando con sus sobres JSON/HTTP, estados y relaciones vigentes.
- **Trazabilidad:** una conclusión, hecho o evidencia deberá poder recorrerse hasta su análisis, contrato, metodología, proceso/versión, nodo y origen aplicables.
- **Reconstruibilidad:** el significado deberá poder reconstruirse desde datos persistidos, sin render ni coordenadas.
- **Escalabilidad de modelo:** más de 1000 procesos deberán compartir el mismo contrato generalista, sin explosión de esquemas especializados.
- **Evolución:** `schema_version` identificará el contrato estructural y `source/provenance` el origen; sus cambios no romperán claves ni relaciones existentes.
- **Separación de capas:** UI, servicios, dominio y persistencia mantendrán las fronteras descritas en FR-11.
- **Seguridad de datos:** las respuestas no deberán exponer secretos ni trazas internas; los endpoints de contexto respetarán los permisos y filtros existentes del producto.

## 7. Modelo de datos y contratos

### Relacional BPM y causal

Se preservan las tablas/modelos BPM existentes (`bpm_process`, `pm_process_version`, `pm_process_node`, `pm_process_transition` y sus metadatos/relaciones) y las estructuras actuales de `contrato`, `analisis_causas`, `analisis_causas_detalle`, causas e hipótesis. La implementación deberá mapear legado y grafo sin duplicar la semántica.

### JSON/JSONB generalista

El objeto de detalle deberá permitir, sin exigir todos los campos:

```json
{
  "context_type": "process|node|resource|execution|evidence",
  "context_id": "stable-owner-id",
  "family": "declared-family",
  "schema_version": "contract-version",
  "data": {},
  "source": {"system": "...", "reference": "..."},
  "provenance": {"captured_at": "...", "quality": "..."}
}
```

El ejemplo es un contrato conceptual, no autoriza una tabla nueva ni convierte las claves de `data` en columnas obligatorias. Las relaciones BPM y causales permanecerán en sus estructuras relacionales/graph actuales.

### RAG

La salida RAG será una proyección de lectura compuesta por identificadores, relaciones, detalle, metodología, hechos y evidencias. No será una fuente alternativa de verdad ni sustituirá la persistencia relacional.

## 8. Decisiones de compatibilidad y supuestos confirmados

- Se extiende el producto actual; no se crea producto, aplicación ni carpeta raíz nueva.
- El BPM relacional y la metodología causal existentes son fuentes de verdad preservadas.
- JSON/JSONB es una capa de detalle generalista, no reemplaza relaciones ni crea modelos especializados.
- BU/MACBU es fixture para cobertura/gaps, no bounded context ni esquema de producto.
- Contratos declarativos pueden ser texto libre; no son fórmulas por defecto.
- KPI y métricas calculadas se solicitan por endpoint y no se persisten.
- La ingestión automática externa y la integración API con IA quedan fuera de esta fase.

## 9. Acceptance Criteria

- **AC-01:** Una inspección de los cambios de esquema no encuentra tablas, columnas, modelos, repositorios ni bounded contexts nombrados para BU/MACBU o conceptos exclusivos del fixture; el mismo contrato se puede aplicar a un segundo proceso con familias distintas.
- **AC-02:** Las relaciones BPM existentes se conservan en sus estructuras relacionales y una consulta puede reconstruir proceso, versión, nodos y transiciones sin leer HTML/SVG/CSS ni coordenadas.
- **AC-03:** Un bloque/nodo puede guardar detalle JSON/JSONB generalista con `family`, `schema_version`, datos y procedencia, sin convertir relaciones BPM en JSON ni exigir una tabla por familia.
- **AC-04:** Una prueba de persistencia/consulta distingue declaración vigente, hecho de ejecución y evidencia; guardar un hecho no sobrescribe la declaración ni la convierte en versión de hecho.
- **AC-05:** Una consulta de contexto devuelve, para una versión y filtro dados, BPM, detalle, metodología causal, relaciones, hechos/evidencias y procedencia mediante una estructura no dependiente del render.
- **AC-06:** El contexto recuperado incluye explícitamente la plantilla, estructura de ejecución, prompt, consignas e instrucciones de metodología que gobiernan el análisis causal, con su versión y trazabilidad.
- **AC-07:** Los flujos actuales de contratos, análisis, plantillas, causas, hipótesis, evaluaciones, reaperturas y evidencias mantienen sus endpoints, estados y relaciones; una regresión de API/UI lo verifica.
- **AC-08:** Una causa con varias hipótesis conserva evaluaciones y conclusión/decisión manual según la metodología vigente, sin que el contexto nuevo introduzca una regla automática `AND`/`OR`.
- **AC-09:** Un texto contractual declarativo puede abrir un análisis humano sin DSL/fórmula; ningún valor `alcanzado`/`no alcanzado` se persiste automáticamente por registrar ese texto.
- **AC-10:** Un endpoint de KPI puede devolver un cálculo bajo demanda con entradas, versión y procedencia, y una comprobación posterior confirma que no se insertó métrica, KPI calculado ni snapshot persistente.
- **AC-11:** Frontend, rutas, servicios, dominio y persistencia se encuentran en los módulos existentes descritos en FR-11; el dominio no importa UI/Flask/SQL y la UI no contiene invariantes ni cálculos de negocio.
- **AC-12:** La página Markdown permite consultar/copiar plantilla, prompt y consignas sin realizar llamadas a una IA externa.
- **AC-13:** El fixture BU identifica en su propia trazabilidad que es cobertura/gap discovery y no modelo especializado; sus claves se pueden mapear al contrato generalista o registrarse como gap sin crear esquema dedicado.
- **AC-14:** Una nueva versión BPM no remapea silenciosamente análisis históricos ni cambia sus referencias de metodología, contrato, nodo o evidencia.

## 10. Preguntas no bloqueantes

1. Catálogo final de familias y nombres de campos opcionales para cada proceso.
2. Contrato exacto de los endpoints KPI y fuentes que quedarán habilitadas en la fase futura.
3. Taxonomía definitiva de eventos, calidad de dato y evidencias de cada planta.
4. Política de retención y permisos detallada para hechos/evidencias cuando se concrete la fase de ejecución.
5. Selección final del mecanismo de indexación/recuperación RAG, siempre que conserve la fuente relacional y la trazabilidad.

Estas preguntas no bloquean la validación de este spec porque el contrato generalista, las fronteras y la compatibilidad quedan definidos sin fijar esos catálogos futuros.

## 11. Amendments

### AMD-002

- **Fecha:** 2026-08-01.
- **Tipo:** B — reestructuración completa del spec por aclaración de alcance.
- **Motivo:** `proceso_BU_estructurado.md` es exclusivamente fixture/test de cobertura y gap discovery; el producto debe servir a más de 1000 procesos con contexto generalista.
- **Cambios:** se separan núcleo BPM relacional, detalle JSON/JSONB, metodología causal, contexto RAG, hechos/evidencias y KPI bajo demanda; se prohíben modelos especializados BU/MACBU; se explicita compatibilidad hacia atrás y ubicación en módulos existentes.
- **Trazabilidad:** sustituye y consolida las interpretaciones de AMD-001 sin cambiar la obligación de preservar BPM/causalidad; el fixture BU queda etiquetado conforme a `proceso_BU_estructurado.md`.
- **Estado:** `integrated`; validada por el programador humano en Gate 1.
- **Reentrada:** `analyze-plan`.

## 12. Decision Log

| Fecha | Decisión | Origen |
|---|---|---|
| 2026-08-01 | El producto es generalista para más de 1000 procesos; BU/MACBU es fixture de cobertura y gap discovery. | Aclaración humana |
| 2026-08-01 | BPM relacional conserva relaciones semánticas; JSON/JSONB solo aporta detalle generalista por bloque/nodo. | Aclaración humana |
| 2026-08-01 | Plantilla, estructura de ejecución, metodología, prompt, consignas e instrucciones causales se preservan y se versionan en la trazabilidad. | Aclaración humana |
| 2026-08-01 | El contexto estructurado compartido es recuperable como RAG y no depende del render visual. | Aclaración humana |
| 2026-08-01 | Declaraciones, hechos de ejecución y evidencias se almacenan con significados separados. | Requisito consolidado |
| 2026-08-01 | KPI/métricas se calculan bajo demanda mediante endpoints y no se persisten. | Aclaración humana |
| 2026-08-01 | Se reutilizan módulos existentes de frontend, backend, dominio y persistencia; no se crean carpetas especializadas por proceso. | Continuidad arquitectónica |
| 2026-08-01 | El programador humano valida explícitamente el `spec.md`; el estado pasa a `spec_validada` y queda habilitada la planificación. | Validación humana Gate 1 |
| 2026-08-01 | El programador humano aprueba explícitamente `task_plan.md`; Gate 2 queda aprobado y la implementación puede comenzar mediante `execute-agent`. | Validación humana Gate 2 |

## 13. Estado de salida

`spec.md` queda validado por el programador humano en Gate 1. La autoría final de la reestructuración corresponde a `requirements-agent`. Las preguntas abiertas son no bloqueantes; el siguiente paso es elaborar y aprobar `task_plan.md` antes de implementar.
