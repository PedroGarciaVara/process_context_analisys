# Requerimiento 12 — Marco de producto y relación unificada BPM-causalidad

**Estado:** `pendiente_aclaraciones`  
**Fecha:** 2026-07-30  
**Origen:** contexto recuperado de Engram, `requerimiento_11.md`, `requerimiento_10/spec.md` y observaciones del programador.  
**Tipo:** requerimiento marco de producto y alcance.

## 1. Contexto

UC_BIB_Solve deberá ayudar a analizar un proceso industrial a partir de un incidente concreto. Actualmente existen dos capacidades relacionadas, pero parcialmente separadas:

- un modelo BPM para representar cómo se estructura y se ejecuta el proceso;
- un modelo causal para explicar por qué se produce un incumplimiento o incidente y revisar hipótesis con evidencias.

Ambos modelos representan un único conocimiento industrial. El modelo BPM aporta la estructura operacional navegable y el modelo causal aporta el análisis explicativo trazable. `requerimiento_11` desarrolla la taxonomía multinivel y queda subordinado a este marco.

El núcleo BPM descrito en `requerimiento_10` fue un vertical slice inicial y todavía no expresa por completo la funcionalidad necesaria para cálculos automáticos, consultas agenticas y evolución del conocimiento. Este requerimiento recupera sus capacidades relevantes como parte del producto pendiente de aclaración e implementación.

## 2. Objetivo

Definir una visión unificada en la que BPM y causalidad sean dos representaciones complementarias del mismo conocimiento industrial, con trazabilidad entre procesos, versiones, operaciones, máquinas o puestos, contratos, incidentes, evidencias y resultados.

La primera etapa asistirá a técnicos humanos en el análisis de un incidente concreto y preparará una base de conocimiento útil para agentes posteriores. La base deberá conservar la información semántica completa del proceso, no solo la necesaria para dibujarlo, para no bloquear una segunda etapa de cálculos automáticos ni la implementación agentica.

## 3. Misión y principios de producto

La misión es **analizar un proceso**.

1. La unidad principal de trabajo es un incidente concreto.
2. En la primera etapa el técnico inicia el análisis y el sistema recibe el incumplimiento ya identificado. La prioridad de la etapa 2 serán los cálculos automáticos, las métricas, la propagación de condiciones y los resultados calculados sobre el grafo BPM-causalidad versionado.
3. El análisis parte de un contrato definido para un proceso; el contrato es la puerta de entrada obligatoria al análisis causal y ningún árbol causal podrá abrirse sin un contrato.
4. El análisis deberá cubrir sistemáticamente el proceso completo, incluyendo aguas arriba, aguas abajo y alternativas relevantes.
5. Causas, hipótesis y parámetros podrán mantenerse como texto libre en la primera etapa.
6. Una conclusión deberá poder relacionarse con su contexto, hipótesis, evidencia, operación y versión.
7. Las plantillas, procesos y contratos evolucionan mediante versiones sin reescribir históricos.
8. Cualquier técnico podrá modificar y publicar directamente una plantilla o árbol causal versionado en esta etapa.
9. Un análisis activo podrá actualizarse a una nueva versión de plantilla conservando el historial de reevaluaciones.
10. Cada análisis quedará fijado a la versión del proceso seleccionada al iniciarse; una nueva versión publicada solo afectará a análisis nuevos.
11. BPM y causalidad son un único conocimiento representado de dos maneras.
12. El proceso deberá conservarse como un modelo semántico dirigido, tipado, jerárquico y versionado.
13. El diagrama será una proyección editable del modelo semántico persistido. Coordenadas, tamaños y estilos no serán fuente de verdad.
14. La información deberá poder consultarse y reconstruirse sin leer HTML, SVG, CSS, posiciones ni estado visual.

## 4. Actores

- **Técnico analista:** inicia y desarrolla el análisis de un incidente, revisa hipótesis y registra evidencias.
- **Técnico aportador de conocimiento:** contribuye a la evolución de procesos, operaciones, plantillas, causas e hipótesis.
- **Responsable de contrato o proceso:** aporta o valida el contexto del proceso, contrato, versión y alcance.
- **Agente posterior:** consume una base de conocimiento preparada, trazable y versionada.
- **Producto UC_BIB_Solve:** conserva contexto, relaciones, versiones, historial y resultados.

## 5. Glosario

- **Proceso canónico:** definición estable con código único, nombre, nivel de abstracción y proceso padre opcional.
- **Versión del proceso:** definición independiente del proceso canónico, editable en borrador y conservada con historial.
- **Etapa:** agrupación de una parte del proceso desde lo general a lo particular.
- **Subproceso:** referencia a otro proceso y a una versión concreta, expandible inline sin duplicar ni mutar el padre.
- **Operación:** unidad operacional del catálogo BPM vinculable a causalidad, mediciones e implementación.
- **Actividad/detalle operativo:** descripción particular de cómo se realiza una operación.
- **Decisión:** elemento que dirige el flujo mediante ramas explícitas, inicialmente Sí y No.
- **Medición/control:** observación, parámetro, límite o control relacionado con un nivel del proceso.
- **Entrada, salida y stock:** elementos del flujo; las salidas pueden ser normal o desperdicio y el stock conserva capacidad, cantidad inicial y unidad.
- **Implementación concreta:** realización de un proceso u operación en una máquina, puesto o equipo, con sus capacidades y condiciones.
- **Contrato:** obligación o declaración industrial legible que expresa un objetivo, condición o marco de evaluación. En la fase 1 cualquier contrato expresado en texto libre será válido para el análisis humano, sin DSL obligatorio, estandarización ni cálculo automático exigible. Cuando el técnico los proporcione, conservará los campos mínimos comunes disponibles —métrica o indicador, operador, umbral, unidad o escala, sujeto o contexto, periodo, entradas, salida y versión— sin inventar los que falten. La distinción entre texto declarativo humano y regla ejecutable deberá conservarse explícitamente.
- **Contrato de entrada:** entidad versionada que representa esa obligación o declaración y constituye la puerta de entrada obligatoria del árbol causal. En la fase 1 un contrato válido para análisis humano podrá iniciar y abrir su árbol causal aunque sea texto libre y no calculable. En la etapa 2, contrato calculable será únicamente el que haya sido estandarizado o seleccionado como calculable conforme a reglas posteriores.
- **Incidente:** hecho concreto que inicia un análisis.
- **Evidencia:** información que permite revisar una hipótesis y fundamentar una conclusión.
- **Hipótesis:** proposición causal que evalúa una única causa dentro de una rama del árbol causal.
- **Evaluación de hipótesis:** resultado de revisar una hipótesis con sus evidencias disponibles; conserva uno de los tres estados `pendiente`, `validada` o `descartada`.
- **Conclusión de causa:** resultado agregado de las evaluaciones de las hipótesis que pertenecen a una causa y que alimenta la decisión sobre la rama de esa causa.
- **Hipótesis pendiente:** evaluación en falta de información o todavía no resuelta; no permite cerrar la evaluación de la hipótesis.
- **Hipótesis validada:** evaluación en la que la evidencia disponible apoya o acepta la hipótesis.
- **Hipótesis descartada:** evaluación en la que la evidencia y su justificación rechazan la hipótesis.
- **Rama descartada:** rama cuya continuidad se ha decidido no profundizar en ese momento a partir de una o más hipótesis evaluadas.
- **Rama reabierta:** rama previamente descartada cuya evaluación vuelve a estar disponible por decisión manual del técnico.
- **Versión fija del análisis:** versión del proceso seleccionada al iniciar el análisis y conservada como referencia inmutable para sus operaciones, causas, evidencias y demás relaciones BPM-causalidad.

## 6. Alcance

Este requerimiento incluye:

- consolidar la misión de analizar un proceso y el foco inicial en incidentes concretos;
- permitir recorrer causalmente el árbol desde las primeras causas asociadas al contrato, evaluando las hipótesis de cada causa;
- relacionar formalmente cada hipótesis con una única causa, permitir varias evidencias por hipótesis y conservar su estado (`pendiente`, `validada` o `descartada`) como entrada de la conclusión de esa causa y de la decisión de su rama;
- distinguir entre el método recomendado de profundización y la capacidad obligatoria de revisar manualmente ramas previamente descartadas;
- conservar las decisiones de descarte y reapertura de ramas y la trazabilidad de quién las tomó, por qué y cuándo;
- establecer BPM y causalidad como un único conocimiento con dos representaciones complementarias;
- definir un proceso dirigido, tipado, jerárquico y versionado, separado de su diagrama;
- distinguir proceso canónico, versiones independientes y sus historiales;
- representar procesos con código único, nombre, nivel de abstracción y proceso padre opcional;
- conservar nodos semánticos de tipo `input`, `output`, `operation`, `subprocess`, `decision` y `stock`;
- conservar decisiones con ramas Sí/No, salidas `normal`/`waste` y stocks con `capacity`, `initial_quantity` y `unit`;
- permitir subprocesos referidos a un proceso y versión concretos, con expansión inline preferida, breadcrumbs y retorno;
- tratar transiciones como relaciones semánticas dirigidas, nunca como líneas decorativas;
- validar ciclos, referencias, compatibilidad de tipos y transiciones inválidas;
- permitir reconstruir el proceso completo desde información semántica, sin depender del estado visual;
- separar semántica, disposición recalculable y renderizado;
- enlazar operaciones del catálogo BPM con causas, incidentes, máquinas o puestos, evidencias y contratos;
- fijar cada análisis a la versión del proceso seleccionada al iniciarse y conservar esa referencia en sus causas, operaciones, evidencias y relaciones BPM-causalidad;
- impedir que una nueva versión publicada reinterprete o cambie análisis abiertos o históricos; esa nueva versión solo podrá ser utilizada por análisis iniciados posteriormente;
- registrar máquinas como entidades con identidad propia y un campo `especificaciones` de tipo JSONB controlado, manteniendo sus relaciones con procesos y operaciones sin convertir la máquina en un nodo BPM de flujo;
- preparar variantes, implementaciones técnicas, equipos, capacidades, consultas para agentes, auditoría, comparación de versiones y resolución contextual;
- dejar preparada como prioridad de etapa 2 la ejecución de cálculos automáticos, métricas, propagación de condiciones y resultados calculados sobre el grafo BPM-causalidad versionado;
- conservar para esos cálculos las entradas semánticas, relaciones explícitas, procedencias y versiones fijas necesarias para reproducir el resultado sin depender del diagrama;
- conservar en fase 1 el contrato legible en texto libre y, cuando estén disponibles, sus campos mínimos comunes, sin inventar datos ausentes ni exigir un DSL o una fórmula ejecutable;
- distinguir en fase 1 el texto declarativo humano de cualquier regla ejecutable, sin convertir automáticamente texto libre en fórmula ni afirmar que todo contrato es calculable;
- analizar en fase 2 los contratos existentes, descubrir patrones y diseñar reglas de estandarización para hacer calculables los contratos que proceda, incluyendo la posterior selección o validación de contratos calculables;
- conservar, cuando exista en la etapa 2, la fórmula o regla ejecutable, sus referencias de entrada, la estructura JSONB controlada, el resultado `alcanzado`/`no alcanzado`, el contrato y las versiones utilizadas; en la fase 1 no se exigirá ni inventará ese resultado;
- preparar consultas estructuradas que permitan obtener el subgrafo versionado, sus datos de entrada, relaciones aplicables, condiciones propagadas y resultados calculados, diferenciando definiciones declarativas de hechos de ejecución;
- mostrar en la aplicación una página de instrucciones con la plantilla común y el prompt común en formato Markdown, para que los técnicos puedan copiarlos y utilizarlos manualmente en una IA externa desde el navegador;
- bloquear o subordinar `requerimiento_11` hasta validar este marco y resolver las decisiones de gobernanza pendientes.

## 7. Fuera de alcance

- cálculo automático de métricas en la primera etapa;
- soluciones automáticas no sustentadas por evidencia;
- ejecución de operaciones, control de máquinas o integración PLC/MES;
- simulación, optimización o minería automática;
- sustitución del análisis humano inicial;
- fijar detalles técnicos de endpoints, carpetas, tablas o interfaces;
- permisos y autenticación completos, salvo la política de negocio ya confirmada;
- cerrar la arquitectura de granularidad sin decisión humana;
- implementación completa de todas las capacidades futuras antes de sus propios requerimientos.
- integración directa mediante API con cualquier IA; en esta etapa el uso de IA externa será manual mediante copia del Markdown mostrado por la aplicación. Esta integración queda reservada para la etapa 2.

## 8. Modelo conceptual y capacidades recuperadas de requerimiento_10

```text
Conocimiento industrial común
├── BPM: estructura operacional navegable
│   ├── procesos canónicos y versiones
│   ├── etapas, subprocesos y operaciones
│   ├── entradas, salidas, stocks y decisiones
│   └── implementaciones por máquina, puesto o equipo
└── Causalidad: análisis explicativo trazable
    ├── incidente e incumplimiento
    ├── plantilla o árbol causal versionado
    ├── causas, hipótesis, parámetros y evidencias
    └── resultados, historial y reevaluaciones
```

El modelo de procesos será un grafo dirigido, tipado, jerárquico y versionado. El proceso canónico será independiente de sus versiones. Las versiones serán editables en estado de borrador y conservarán historial. Las transiciones expresarán precedencia, alternativa, entrada/salida, composición, referencia o almacenamiento según su significado; su cardinalidad y compatibilidad deberán validarse.

El método recomendado para el recorrido causal partirá de las primeras causas asociadas al contrato. Cada hipótesis evaluará una única causa y podrá relacionarse con una o varias evidencias. La evaluación de la hipótesis conservará uno de los estados `pendiente`, `validada` o `descartada`, alimentará la conclusión de esa causa y la decisión sobre su rama. `Pendiente` representará falta de información o evaluación aún no resuelta; `validada` indicará que la evidencia disponible apoya o acepta la hipótesis; y `descartada` indicará que la evidencia y su justificación la rechazan. La aplicación deberá permitir al técnico reevaluar una hipótesis o reabrir una rama previamente descartada cuando considere que una evaluación incompleta pudo haber descartado una causa real. El método recomendado orienta el recorrido, pero no limita esta capacidad obligatoria de revisión humana.

Cada hipótesis deberá conservar la relación explícita con la causa que evalúa. Sus evidencias se conservarán mediante una relación una-a-muchas y no se inferirán por proximidad visual. El estado de la evaluación de la hipótesis (`pendiente`, `validada` o `descartada`) deberá conservarse como resultado trazable, relacionarse con la conclusión de causa y alimentar la decisión de la rama sin ocultar qué hipótesis y evidencias la originaron. La aplicación deberá conservar la distinción entre evaluación de hipótesis, estado de evaluación, conclusión de causa, decisión sobre la rama y profundización efectiva.

Cada decisión de descarte o reapertura de una rama deberá conservar, cuando se realice, quién la tomó, por qué y cuándo, junto con su relación con la conclusión de causa, las hipótesis y evidencias que la motivaron. Una evaluación `pendiente` deberá poder trazarse hasta las evidencias ausentes o insuficientes. Una reapertura deberá conservar la relación con la decisión previa y permitir reevaluar la hipótesis sin perder el historial.

Cada análisis conservará la identidad de la versión del proceso seleccionada al iniciarse. Las referencias del análisis a causas, operaciones, evidencias, incidentes, resultados y demás relaciones BPM-causalidad deberán incluir o resolver contra esa misma versión fija. La publicación posterior de otra versión no actualizará, reinterpretará ni remapeará automáticamente un análisis abierto o histórico; la versión nueva quedará disponible para análisis iniciados después.

Un subproceso referenciará otro proceso y una versión concreta. Su expansión inline conservará breadcrumbs y retorno, no duplicará registros ni mutará el padre. La disposición del diagrama podrá recalcularse cuando cambien contenidos, tamaños o expansión, sin cambiar el modelo semántico.

Las capacidades futuras previstas son variantes, implementaciones técnicas, equipos, capacidades, contratos, consultas estructuradas para agentes, auditoría, comparación semántica de versiones y resolución contextual. La prioridad de la etapa 2 será habilitar cálculos automáticos, métricas, propagación de condiciones y resultados calculados sobre el grafo BPM-causalidad versionado. Al iniciar la etapa 2 se analizarán los contratos existentes, se descubrirán patrones y se diseñarán reglas de estandarización para hacer calculables los contratos que proceda. Deberán poder añadirse sin reinterpretar transiciones existentes ni depender de coordenadas.

Los cálculos de etapa 2 deberán consumir datos semánticos persistidos y relaciones explícitas del grafo, incluyendo cuando aplique entradas, salidas, stocks, operaciones, decisiones, mediciones/controles, condiciones, causas, hipótesis, evidencias, implementaciones y hechos de ejecución. Solo se calcularán contratos que hayan sido estandarizados o seleccionados como calculables al iniciar la etapa 2; los contratos de fase 1 que permanezcan como texto declarativo no se convertirán automáticamente ni se presentarán como calculables. Cada resultado calculado deberá conservar la procedencia de sus entradas, las relaciones utilizadas, el proceso y la versión fija del análisis a los que corresponda, además de distinguirse de los documentos declarativos JSONB y de sus hechos observados.

Las consultas preparadas para esta etapa deberán poder recuperar de forma reproducible el contexto versionado del cálculo: nodos y relaciones alcanzables, entradas aplicables, condiciones de precedencia o alternativa, datos causales relacionados, definiciones y hechos de ejecución permitidos por el alcance. La publicación de una nueva versión no deberá modificar los datos de entrada ni reinterpretar resultados calculados de análisis abiertos o históricos; un cálculo sobre una versión posterior constituirá un resultado distinto y trazable.

### 8.1 Decisión confirmada sobre el modelo de máquinas y modelos asociados

En esta fase no se implementará un modelo relacional detallado para todas las propiedades de una máquina ni para todos los modelos asociados. Se mantendrán las entidades y relaciones principales que necesiten identidad y trazabilidad, con campos de especificaciones o atributos de tipo JSONB controlado para recetas, reglas de compatibilidad/requisitos, ejecuciones, mediciones, capacidades y otros datos asociados.

El JSONB se ubicará en el nivel semántico que corresponda: a nivel de proceso cuando la información sea global al proceso; a nivel de operación cuando sea particular de una operación; y a nivel de máquina o recurso cuando sea particular de una máquina, puesto o equipo. La ubicación no convertirá esos datos en nodos BPM ni ocultará las relaciones semánticas que deban conservarse.

Se mantendrá una entidad `máquina` con identidad estable y un campo `especificaciones` de tipo JSONB.

El JSONB no será un contenedor de JSON arbitrario. Sus valores deberán construirse e introducirse mediante una plantilla de especificaciones y un prompt controlado, de forma que produzcan una estructura consistente y validable. Para cada contexto y familia existirá un único documento declarativo vigente. Para el ejemplo de máquina MI, el conjunto mínimo previsible de campos será:

```text
family
machine_code
speed_mode
capacity_kg
supports_silane
capabilities
notes
source/provenance
schema_version
```

Se utilizará una plantilla única y un prompt único, comunes a todas las familias de información y a todos los niveles semánticos. Ese contrato común deberá definir, como mínimo, los nombres de campo, tipos esperados, campos obligatorios u opcionales, unidades cuando apliquen, valores permitidos o convenciones controladas, reglas de ausencia y la forma de registrar `source/provenance` y `schema_version`. La familia se determinará conforme a la plantilla común y deberá quedar identificada en el documento validado. `schema_version` identificará únicamente la versión del contrato o estructura de la plantilla; no representará una versión histórica del dato. `source/provenance` conservará el origen o procedencia del contenido, no un historial de cambios. La plantilla/prompt no autorizará a inferir hechos no aportados como si fueran hechos confirmados; las especificaciones declaradas deberán conservar su procedencia y distinguir datos desconocidos, no aplicables o pendientes de confirmar cuando el formato elegido lo permita.

Cuando se reemplace el contenido de un documento declarativo, EL SISTEMA DEBERÁ sustituir el documento vigente del contexto y familia correspondientes sin conservar versiones anteriores ni historial funcional de su contenido JSONB. Esta política de reemplazo no impedirá conservar por separado los hechos de ejecución real que el alcance exija registrar: esos hechos pertenecerán al contexto de ejecución o batch, se relacionarán con las definiciones aplicables y no sobrescribirán el documento declarativo vigente.

La máquina conservará una relación explícita con el proceso, la operación o la implementación técnica a la que aplique. Esa relación será semántica y consultable, pero la máquina no se incorporará como nodo BPM ni como paso, transición, decisión, entrada, salida o stock del flujo. La máquina describe el recurso o la implementación asociada; el proceso y la operación conservan la semántica de ejecución del flujo.

La ubicación contextual del documento JSONB se determinará por el propietario semántico al que describa: `proceso` para información global del proceso, `operación` para información propia de una operación y `máquina/recurso` para información propia de una máquina, puesto o equipo. La clave funcional del documento estará formada por el tipo de contexto, la identidad estable del propietario y la familia declarada por la plantilla común. La restricción de unicidad será `(context_type, context_id, family)`, con un único documento declarativo vigente por combinación. La versión del proceso, el contrato o la variante no crearán por sí mismos otro documento JSONB ni formarán parte de esa unicidad; sus relaciones aplicables deberán resolverse fuera del contenido JSONB. Si una futura regla necesitara documentos diferenciados por esos ámbitos, deberá introducir una relación semántica explícita y una decisión de alcance posterior.

Las propiedades que posteriormente requieran consulta frecuente, restricciones propias, cálculos, validaciones independientes o relaciones con otras entidades podrán migrarse desde el JSONB a estructuras normalizadas sin romper la identidad de la entidad propietaria ni sus referencias existentes. Esto aplica a máquinas y a los modelos asociados de proceso, operación, receta, compatibilidad/requisitos, ejecución, medición y capacidad. La migración deberá preservar el contenido vigente, la procedencia, la versión de esquema y la trazabilidad entre la representación anterior y la nueva, sin convertir el JSONB declarativo en un historial de versiones.

Las especificaciones declaradas de una máquina, proceso, operación, receta, compatibilidad o capacidad no representan por sí mismas los hechos de ejecución real de un batch. Los valores observados durante una ejecución, como máquina efectivamente utilizada, velocidad real, capacidad utilizada, parámetros medidos, incidencias, receta aplicada o resultados, podrán conservarse como datos de ejecución en el contexto de ejecución/batch correspondiente si el alcance los exige. Deberán relacionarse con las definiciones aplicables y no sobrescribir el documento declarativo vigente.

No se crearán todavía tablas detalladas de capacidades, compatibilidad, requisitos, recetas, mediciones o ejecuciones solo para descomponer sus propiedades. Sí deberán conservarse las identidades, relaciones, procedencia, versiones de esquema y límites semánticos necesarios para que una futura normalización no pierda significado.

### 8.2 Riesgos y limitaciones del JSONB controlado

- El JSONB controlado reduce el coste inicial y permite evolucionar el catálogo, pero no ofrece por sí mismo la misma garantía de tipos, restricciones, índices o relaciones que una estructura normalizada.
- La consistencia depende de mantener la plantilla, el prompt controlado, la validación y la versión de esquema alineados; cambios del contrato no identificados podrían producir estructuras incompatibles.
- Las consultas, cálculos y restricciones sobre propiedades anidadas pueden ser más complejos o menos eficientes hasta que esas propiedades se normalicen.
- El contenido generado por prompt puede omitir, malinterpretar o inventar valores si no se conserva la fuente y no se valida contra el esquema; por ello la procedencia y el estado de confirmación forman parte de la semántica mínima.
- No se crearán todavía tablas detalladas de capacidades, compatibilidad, requisitos, recetas, mediciones o ejecuciones. Estas materias quedan como evolución futura y no deberán perderse: la identidad de cada entidad, sus asociaciones con proceso/operación/recurso, la procedencia, el esquema y la distinción entre definición y ejecución deberán permitir incorporarlas después. Si el alcance exige registrar hechos de ejecución, estos se conservarán como datos de ejecución separados, no como versiones del documento declarativo.

### 8.3 UX de instrucciones y uso manual de IA externa

EL SISTEMA DEBERÁ ofrecer una página de instrucciones accesible desde la aplicación. La página DEBERÁ mostrar la plantilla común y el prompt común en Markdown legible y copiable por los técnicos.

CUANDO un técnico copie la plantilla o el prompt, EL SISTEMA DEBERÁ permitir utilizar el contenido manualmente en una IA externa desde el navegador, sin enviar automáticamente datos a esa IA ni ejecutar una integración de API.

La página DEBERÁ indicar que `schema_version`, `source/provenance` y los datos de contexto deberán conservarse conforme al contrato común. La integración directa con IA y cualquier automatización de envío o recepción quedan reservadas para la etapa 2.

## 9. Modelo de granularidad y relaciones

La aplicación deberá distinguir estos niveles. La tabla clasifica su papel de negocio, pero deja abierta qué elementos son nodos del grafo.

| Elemento | Papel | Clasificación semántica |
|---|---|---|
| Proceso/capacidad o proceso canónico | Objeto industrial con identidad, nivel y relación padre opcional. | Nodo semántico y/o contenedor jerárquico, según el contexto del grafo. |
| Versión del proceso | Definición independiente, editable en borrador y con historial. | Contexto del grafo o identidad semántica propia. |
| Etapa | Agrupa una parte del proceso. | Nodo o agrupación contextual vinculable a causalidad. |
| Subproceso | Referencia a proceso y versión concreta, expandible y navegable. | Nodo compuesto o relación jerárquica contextual. |
| Operación | Unidad del catálogo vinculable a causalidad y a una implementación, siempre dentro de la versión fija del análisis. | Unidad semántica del grafo vinculable a causalidad. |
| Actividad/detalle operativo | Explica la ejecución particular de una operación. | Nodo semántico o dato estructurado asociado. |
| Decisión | Dirige alternativas Sí/No. | Elemento semántico del grafo vinculable a causalidad. |
| Medición/control | Conserva observaciones, parámetros, límites o controles. | Nodo o dato semántico vinculable a causalidad según su alcance. |
| Entrada, salida y stock | Representan flujo y almacenamiento; salida normal/desperdicio y stock con capacidad, cantidad inicial y unidad. | Nodos semánticos de flujo o almacenamiento vinculables a causalidad. |
| Implementación por máquina/puesto/equipo | Identifica la realización y su relación con el proceso u operación; la máquina mantiene especificaciones JSONB controladas y no es nodo del flujo. | Entidad/recurso asociado y relación semántica explícita; las capacidades detalladas, compatibilidad y recetas quedan para evolución futura. |

Las causas, hipótesis y evidencias podrán vincularse a cualquier nodo semántico BPM del análisis: entrada, salida, stock, decisión, medición/control, operación, etapa o subproceso. Cada vínculo deberá identificar el tipo y la identidad del nodo, el proceso y la versión fija a los que pertenece, y su papel en la trazabilidad. Un elemento causal podrá tener varios vínculos cuando el análisis necesite cubrir más de un nodo, sin duplicar la causa, hipótesis o evidencia.

Las referencias causales del análisis deberán conservar la versión fija del proceso a la que pertenecen. Un vínculo solo será válido si el nodo existe en esa versión y es alcanzable mediante las relaciones semánticas persistidas. No se permitirán vínculos causales a nodos de otra versión ni remapeos implícitos por publicación de versiones posteriores. La publicación de una versión posterior no modificará las relaciones existentes entre análisis, causas, hipótesis, evidencias y nodos BPM.

La trazabilidad deberá poder recorrerse en ambos sentidos: desde una conclusión hacia sus causas, hipótesis, evidencias y nodos BPM relacionados, y desde cualquier nodo BPM hacia los análisis y elementos causales que lo referencien. Las relaciones de evidencia con una causa o hipótesis y las relaciones con nodos BPM deberán conservarse explícitamente; no se inferirán únicamente por proximidad visual, pertenencia de pantalla o posición en el diagrama.

La relación causal mínima será: `hipótesis -> causa`, `hipótesis -> evidencias` (una hipótesis puede tener muchas evidencias), `hipótesis -> evaluación`, `evaluaciones -> conclusión de causa` y `conclusión de causa -> decisión de rama`. Cada relación deberá conservar el análisis, el árbol o plantilla versionada, la versión fija del proceso cuando aplique y la procedencia temporal necesaria para reconstruir el razonamiento. La ausencia o insuficiencia de información no romperá la cadena: se registrará explícitamente y podrá provocar una reapertura.

Deberán preservarse, cuando apliquen, las relaciones de pertenencia, composición, precedencia, alternativa, referencia, entrada/salida, almacenamiento, medición, implementación y trazabilidad causal. Posiciones, tamaños y estilos serán datos visuales recalculables, nunca relaciones de negocio.

## 10. Historias de usuario

### HU-01 — Analizar un incidente

Como técnico analista, quiero iniciar un análisis desde un incumplimiento ya identificado, para investigar sus causas dentro del contexto real del incidente.

### HU-02 — Recorrer el proceso completo

Como técnico analista, quiero recorrer el proceso desde lo general a lo particular, incluyendo aguas arriba, aguas abajo, alternativas y subprocesos, para no limitar el análisis a una operación aislada.

### HU-03 — Vincular conocimiento trazable

Como técnico analista, quiero asociar causas, hipótesis y evidencias a cualquier nodo semántico BPM de la versión fija, para que una conclusión sea explicable, reconstruible y reutilizable.

### HU-04 — Conservar la evolución

Como técnico aportador, quiero versionar procesos, plantillas y contratos sin alterar históricos ni análisis abiertos, para evolucionar el conocimiento.

### HU-05 — Preparar cálculos y agentes

Como responsable del producto, quiero que toda la semántica del proceso y sus relaciones pueda consultarse sin interpretar el diagrama, para habilitar cálculos automáticos y agentes posteriores.

## 11. Criterios funcionales de negocio

### CF-01 — Inicio y cobertura

CUANDO un técnico inicia un análisis, EL SISTEMA DEBERÁ conservar el incidente, el incumplimiento, el periodo, la dimensión del contexto y la versión del proceso seleccionada. EL SISTEMA DEBERÁ permitir considerar el proceso completo, aguas arriba, aguas abajo y alternativas relevantes.

### CF-02 — Relación BPM-causalidad

CUANDO se registre una causa, hipótesis o evidencia, EL SISTEMA DEBERÁ permitir vincularla a uno o varios nodos semánticos BPM de tipo entrada, salida, stock, decisión, medición/control, operación, etapa o subproceso dentro de la versión fija del análisis. EL SISTEMA DEBERÁ conservar en cada vínculo el tipo e identidad del nodo, el proceso y la versión fija, y el papel de la relación en la trazabilidad.

SI el nodo no existe en la versión fija, EL SISTEMA DEBERÁ rechazar el vínculo. EL SISTEMA NO DEBERÁ inferir vínculos por posición visual, proximidad, etiquetas renderizadas o pertenencia a una pantalla. CUANDO existan variantes, EL SISTEMA DEBERÁ identificar la máquina o puesto concreto mediante una relación semántica separada del nodo BPM.

### CF-03 — Proceso y versión

EL SISTEMA DEBERÁ conservar el proceso canónico con código único, nombre, nivel de abstracción y proceso padre opcional. CUANDO se cree una versión, EL SISTEMA DEBERÁ conservar una definición independiente, editable en borrador y con historial.

### CF-04 — Grafo semántico

EL SISTEMA DEBERÁ conservar nodos `input`, `output`, `operation`, `subprocess`, `decision` y `stock`, y transiciones como relaciones dirigidas. EL SISTEMA DEBERÁ conservar ramas Sí/No, salidas normal/desperdicio y propiedades estructuradas de stock.

### CF-05 — Subprocesos

CUANDO un nodo sea un subproceso, EL SISTEMA DEBERÁ referenciar un proceso y una versión concreta, permitir expansión inline preferida, mostrar breadcrumbs y permitir retorno sin duplicar ni mutar el padre.

### CF-06 — Reconstrucción y layout

EL SISTEMA DEBERÁ permitir consultar y reconstruir la semántica sin leer HTML, SVG, CSS, posiciones, tamaños, estilos ni estado visual. EL SISTEMA DEBERÁ recalcular el layout y el renderizado sin modificar la semántica.

### CF-07 — Integridad

CUANDO se cree o relacione un elemento, EL SISTEMA DEBERÁ validar ciclos, referencias inexistentes, compatibilidad de tipos y transiciones inválidas. EL SISTEMA DEBERÁ conservar evidencias, hipótesis y resultados sin presentar soluciones no sustentadas.

### CF-08 — Versionado causal y contractual

CUANDO cambie una plantilla o contrato, EL SISTEMA DEBERÁ crear una nueva versión sin reinterpretar históricos. CUANDO un análisis activo se actualice, EL SISTEMA DEBERÁ conservar las evaluaciones y versiones anteriores. La actualización de una plantilla no podrá cambiar la versión fija del proceso ni las referencias BPM-causalidad del análisis.

### CF-14 — Versión fija por análisis

CUANDO se inicie un análisis, EL SISTEMA DEBERÁ fijar la versión del proceso seleccionada y conservarla como referencia del análisis.

SI se publica una nueva versión del proceso, EL SISTEMA NO DEBERÁ reinterpretar, remapear ni actualizar automáticamente análisis abiertos o históricos; la nueva versión solo podrá seleccionarse al iniciar análisis posteriores.

EL SISTEMA DEBERÁ conservar la referencia a la versión fija en las relaciones del análisis con causas, hipótesis, evidencias y nodos BPM, de forma que esas relaciones sigan siendo reconstruibles aunque existan versiones posteriores.

### CF-09 — Evolución y preparación de cálculos

EL SISTEMA DEBERÁ dejar preparadas relaciones y consultas para variantes, implementaciones técnicas, equipos, capacidades, contratos, auditoría, comparación de versiones, consultas agenticas y resolución contextual.

EL SISTEMA DEBERÁ priorizar para la etapa 2 los cálculos automáticos, las métricas, la propagación de condiciones y los resultados calculados sobre el grafo BPM-causalidad versionado. Las consultas deberán exponer las entradas semánticas, relaciones, procedencias, condiciones y versión fija necesarias para ejecutar y reproducir cada cálculo.

CUANDO se obtenga un resultado calculado, EL SISTEMA DEBERÁ conservar su relación con el proceso, la versión fija, los nodos y relaciones utilizados, las entradas consumidas y la procedencia de cada dato. EL SISTEMA NO DEBERÁ sobrescribir definiciones declarativas, hechos de ejecución ni resultados de otra versión.

Para el flujo funcional y de cálculo de la etapa 2, EL SISTEMA DEBERÁ, en este orden: primero identificar los contratos aplicables que hayan sido estandarizados o seleccionados como calculables; después calcularlos mediante la regla ejecutable disponible y sus entradas declaradas y validadas; después clasificar cada contrato como alcanzado o no alcanzado; después, únicamente para cada contrato calculable no alcanzado, abrir y calcular su árbol causal en el orden definido por el propio árbol; y finalmente descartar las ramas que no tengan impacto conforme a las hipótesis aplicables. EL SISTEMA NO DEBERÁ convertir automáticamente en fórmula un contrato de fase 1 expresado en texto libre ni presentar como calculable un contrato que no haya sido estandarizado o seleccionado como tal. EL SISTEMA NO DEBERÁ permitir abrir ni calcular un árbol causal sin un contrato de entrada válido y versionado; en la fase 1, la validez para abrir el árbol será humana y declarativa, no calculable. Cada paso de etapa 2 deberá conservar sus entradas, resultados, hipótesis, ramas descartadas y procedencia, junto con la regla ejecutable cuando exista, la estructura JSONB validada, el proceso, el contrato y sus versiones y la versión fija del análisis.

Este flujo deberá distinguir el texto declarativo del contrato, su eventual regla ejecutable y la evaluación causal posterior. En la fase 1, el contrato válido para análisis humano será suficiente para abrir el árbol causal y no se registrará ni inferirá una clasificación `alcanzado`/`no alcanzado`. En la etapa 2, la clasificación `alcanzado`/`no alcanzado` será una decisión explícita del cálculo del contrato y podrá condicionar el flujo calculado posterior. Las reglas concretas del contrato, sus entradas y salidas, la clasificación, la estandarización o selección de contratos calculables y el impacto de las hipótesis no podrán inferirse a partir de la interfaz, del diagrama ni de valores por defecto.

### CF-16 — Recorrido recomendado y revisión manual de ramas

CUANDO un técnico recorra el árbol causal de un análisis, EL SISTEMA DEBERÁ permitirle comenzar por las primeras causas asociadas al contrato y evaluar las hipótesis de cada causa.

SI una hipótesis queda `pendiente`, EL SISTEMA DEBERÁ identificar que existe falta de información o una evaluación aún no resuelta, sin tratarla como validada ni descartada.

SI una hipótesis queda `validada`, EL SISTEMA DEBERÁ identificar que la evidencia disponible la apoya o acepta según la justificación registrada.

SI una hipótesis queda `descartada`, EL SISTEMA DEBERÁ identificar que la evidencia disponible y su justificación la rechazan.

EL SISTEMA DEBERÁ permitir que el técnico evalúe manualmente hipótesis de una rama previamente descartada y reabra dicha rama cuando lo decida, incluida la situación en que considere que una hipótesis incompleta pudo haber descartado una causa real.

CUANDO el técnico descarte una rama o la reabra, EL SISTEMA DEBERÁ exigir una justificación y conservar la evidencia disponible relacionada con la decisión. SI no existe información suficiente, EL SISTEMA DEBERÁ permitir registrar la hipótesis como `pendiente` sin convertirla en `descartada` ni `validada`. Una reapertura DEBERÁ registrar una nueva justificación y conservar la relación con la decisión previa, las hipótesis y las evidencias disponibles.

EL SISTEMA DEBERÁ distinguir únicamente entre la evaluación de una hipótesis —`pendiente`, `validada` o `descartada`— y la decisión sobre la rama —descartada o reabierta—, sin inventar una taxonomía adicional de estados. EL SISTEMA DEBERÁ conservar, para cada evaluación y decisión registrada, quién la tomó, por qué, cuándo, las hipótesis relacionadas, la evidencia disponible y la justificación correspondiente.

EL SISTEMA DEBERÁ relacionar cada hipótesis con una única causa, permitir una o varias evidencias por hipótesis y registrar una evaluación con estado `pendiente`, `validada` o `descartada`. EL SISTEMA DEBERÁ usar esos estados y sus evidencias para formar la conclusión de la causa y usar esa conclusión como entrada de la decisión de su rama, conservando las relaciones entre causa, hipótesis, evaluación, estado, evidencias, conclusión y decisión.

EL SISTEMA DEBERÁ distinguir la evaluación de una hipótesis —`pendiente`, `validada` o `descartada`—, la conclusión de causa, la decisión sobre la rama —descartada o reabierta— y la profundización efectiva. EL SISTEMA NO DEBERÁ inventar estados concretos adicionales. EL SISTEMA DEBERÁ conservar, para cada evaluación, conclusión y decisión registrada, quién la tomó, por qué, cuándo, las hipótesis relacionadas, la evidencia disponible, la información ausente o insuficiente y la justificación correspondiente.

### CF-10 — Especificaciones controladas por nivel semántico

EL SISTEMA DEBERÁ conservar las propiedades asociadas de proceso, operación, máquina o recurso mediante JSONB controlado cuando todavía no exista un modelo relacional detallado. EL SISTEMA DEBERÁ ubicar cada estructura en el nivel que corresponda: proceso, operación o máquina/recurso. EL SISTEMA DEBERÁ identificar la familia conforme a la plantilla común y mantener un único documento declarativo vigente para cada combinación de tipo de contexto, identidad estable del propietario y familia. La unicidad funcional será `(context_type, context_id, family)`; la versión del proceso, el contrato y la variante no formarán parte de esa clave. Si se reemplaza el contenido, EL SISTEMA DEBERÁ sustituirlo sin conservar versiones anteriores ni historial funcional del JSONB. EL SISTEMA DEBERÁ aplicar a todas las familias y niveles un contrato común único, compuesto por una plantilla única y un prompt único, con estructura consistente. `schema_version` solo identificará la versión del contrato o estructura de la plantilla y `source/provenance` conservará el origen, no el historial.

### CF-15 — Contrato declarativo en fase 1 y estandarización para cálculo en fase 2

CUANDO se cree o publique un contrato en fase 1, EL SISTEMA DEBERÁ conservar su expresión legible en texto libre y los campos mínimos comunes que el técnico proporcione, sin inventar los ausentes. EL SISTEMA NO DEBERÁ exigir un DSL, una fórmula ejecutable ni cálculo automático por el mero hecho de registrar el contrato.

EL SISTEMA DEBERÁ distinguir el texto declarativo humano de cualquier regla ejecutable y no deberá convertir automáticamente el primero en la segunda.

AL INICIAR LA FASE 2, EL SISTEMA DEBERÁ analizar los contratos existentes, descubrir patrones y diseñar reglas de estandarización que permitan hacer calculables los contratos que proceda. CUANDO un contrato sea estandarizado o seleccionado como calculable, EL SISTEMA DEBERÁ conservar la regla ejecutable, sus entradas declaradas y validadas, la estructura JSONB controlada aplicable, el resultado calculado, la clasificación `alcanzado`/`no alcanzado` y la procedencia de cada dato. EL SISTEMA NO DEBERÁ afirmar que todo contrato de fase 1 es calculable ni sustituir una regla de una versión por la de otra. En la fase 1, cualquier contrato válido en texto libre podrá abrir el árbol causal para análisis humano, sin exigir cálculo ni registrar clasificación contractual.

### CF-11 — Máquina como recurso asociado, no como nodo BPM

EL SISTEMA DEBERÁ conservar la relación explícita entre máquina, proceso, operación o implementación técnica cuando exista. EL SISTEMA NO DEBERÁ representar la máquina como nodo BPM, transición, decisión, entrada, salida, stock o paso del flujo.

### CF-12 — Evolución y separación de hechos

EL SISTEMA DEBERÁ permitir que propiedades de máquina, recetas, compatibilidad/requisitos, capacidades, mediciones u otros modelos asociados que requieran consultas, restricciones, cálculos o relaciones propias se migren posteriormente a estructuras normalizadas sin cambiar la identidad ni romper referencias existentes. EL SISTEMA DEBERÁ separar los documentos declarativos actuales de los hechos observados durante la ejecución real de un batch. SI el alcance exige registrar hechos de ejecución, EL SISTEMA DEBERÁ conservarlos como datos del contexto de ejecución/batch relacionados con las definiciones aplicables; no serán versiones del JSONB declarativo ni sobrescribirán el documento vigente.

### CF-13 — Instrucciones Markdown y uso manual de IA externa

EL SISTEMA DEBERÁ mostrar en una página de instrucciones la plantilla común y el prompt común en formato Markdown legible y copiable.

CUANDO un técnico consulte la página, EL SISTEMA DEBERÁ permitirle copiar manualmente la plantilla o el prompt para utilizarlos en una IA externa desde el navegador. EL SISTEMA NO DEBERÁ enviar automáticamente el contenido a una IA externa ni requerir una API de IA en esta etapa.

## 12. Requisitos no funcionales de negocio

- **Trazabilidad:** una conclusión deberá poder seguirse hasta incidente, evidencia, operación, recurso, proceso, plantilla, contrato y versiones relacionados.
- **Consistencia semántica:** BPM y causalidad no duplicarán conceptos con referencias independientes.
- **Reconstruibilidad:** una consulta deberá devolver suficiente información para reconstruir procesos, versiones, nodos y relaciones sin interpretar la interfaz.
- **Separación semántica/visual:** coordenadas, tamaños y estilos serán recalculables y no datos de negocio.
- **Historial:** los cambios no borrarán ni reinterpretarán silenciosamente análisis históricos.
- **Evolución:** el modelo podrá crecer desde texto libre y ejemplos reales hacia estandarización, cálculos y agentes.
- **Calculabilidad reproducible:** los cálculos, métricas, propagaciones y resultados deberán poder reconstruirse a partir de entradas semánticas, relaciones explícitas, procedencia y versión fija, sin interpretar la disposición visual.
- **Separación de resultados:** los resultados calculados se distinguirán de definiciones declarativas, hechos de ejecución y evidencias originales, manteniendo referencias trazables a cada entrada utilizada.

## 13. Decisión incorporada y siguiente pregunta única

La decisión sobre las relaciones BPM-causalidad queda integrada: causas, hipótesis y evidencias pueden vincularse a cualquier nodo semántico BPM —entradas, salidas, stocks, decisiones, mediciones/controles, operaciones, etapas y subprocesos— mediante relaciones explícitas, potencialmente múltiples, que conservan tipo, identidad, papel y versión fija. La existencia del nodo en la versión fija es condición de validez; no se permiten inferencias visuales, referencias cruzadas de versión ni remapeos automáticos. La trazabilidad deberá recorrerse desde conclusiones hacia el proceso y desde nodos BPM hacia los análisis relacionados.

La prioridad de etapa 2 queda concretada como un flujo ordenado y condicionado por contrato: al iniciar esa etapa, identificar contratos calculables, calcularlos, clasificar cada uno como alcanzado o no alcanzado, abrir y calcular a continuación —solo para cada contrato calculable no alcanzado— su árbol causal en orden y descartar finalmente las ramas sin impacto según las hipótesis. En la fase 1, cualquier contrato expresado en texto libre que sea válido para el análisis humano abrirá el árbol causal, aunque no sea calculable; no se registrará ni inventará una clasificación alcanzado/no alcanzado. El contrato es la entidad de entrada y la puerta obligatoria del análisis causal. El cálculo del contrato y el análisis causal posterior son operaciones diferenciadas. Cada resultado de etapa 2 deberá conservar trazabilidad bidireccional entre contrato, versión evaluada, árbol causal, incidente, entradas, resultados, hipótesis, ramas descartadas y procedencia, incluida la versión fija del análisis.

La respuesta humana confirma la estandarización de contratos se tratará al iniciar la fase 2. En la fase 1 cualquier contrato expresado en texto libre es válido para el análisis humano, puede iniciar y abrir su árbol causal y no requiere ser calculable ni estandarizado. El cálculo automático y la clasificación `alcanzado`/`no alcanzado` quedan reservados para la fase 2, después de la estandarización o selección de contratos calculables. No se convertirá automáticamente el texto libre en fórmula ni se inventarán resultados contractuales en la fase 1.

La respuesta humana confirma la relación formal `hipótesis -> causa`, la relación una-a-muchas `hipótesis -> evidencias`, y que la evaluación de cada hipótesis alimenta la conclusión de su causa y la decisión de la rama. Las hipótesis conservarán únicamente los estados `pendiente`, `validada` y `descartada`: `pendiente` representa falta de información o evaluación aún no resuelta; `validada` indica apoyo o aceptación según la evidencia disponible; y `descartada` indica rechazo según la evidencia y su justificación. La cadena deberá conservar trazabilidad bidireccional, reaperturas e historial de decisiones sin inferencias visuales ni pérdida de relaciones previas.

**Siguiente pregunta bloqueante al programador humano:** ¿Cómo deberá derivarse la conclusión y el estado de una causa a partir de varias hipótesis relacionadas con ella?

- **A) La causa queda `validada` si al menos una hipótesis está validada y ninguna está descartada; queda `descartada` si todas están descartadas; en los demás casos queda `pendiente` (recomendado):** define una precedencia explícita y conserva los casos mixtos como no resueltos.
- **B) La causa queda `descartada` si alguna hipótesis está descartada, `validada` si todas están validadas y `pendiente` en cualquier combinación restante:** prioriza el rechazo de una hipótesis, pero puede descartar una causa con evidencia contradictoria.
- **C) La conclusión de causa no se deriva automáticamente: el técnico debe seleccionar explícitamente `pendiente`, `validada` o `descartada` y justificarla:** conserva el juicio humano, pero requiere una decisión adicional aunque existan evaluaciones suficientes.
- **D) Otra opción:** indique la regla exacta de combinación, precedencia y justificación requerida.

## 14. Decisiones tomadas y estado de confirmación

### Confirmado

- **Opción C — alcance de las relaciones BPM-causalidad:** causas, hipótesis y evidencias pueden vincularse a cualquier nodo semántico BPM: entradas, salidas, stocks, decisiones, mediciones/controles, operaciones, etapas y subprocesos.
- La misión del producto es analizar un proceso.
- La primera etapa asiste a técnicos humanos y prepara conocimiento para agentes posteriores.
- La prioridad de la etapa 2 son los cálculos automáticos, las métricas, la propagación de condiciones y los resultados calculados sobre el grafo BPM-causalidad versionado, después de analizar contratos existentes, descubrir patrones y estandarizar o seleccionar contratos calculables.
- Los cálculos de etapa 2 deberán apoyarse en entradas semánticas, relaciones explícitas, procedencia y versiones fijas, y sus resultados deberán conservar trazabilidad reproducible.
- Las consultas preparadas deberán recuperar el contexto versionado, las entradas aplicables, las relaciones utilizadas y la procedencia necesaria para ejecutar o reproducir cálculos sin depender del diagrama.
- La unidad principal es un incidente concreto cuyo incumplimiento inicial ya está identificado.
- Las causas, hipótesis y parámetros pueden ser texto libre en la primera etapa.
- Las causas, hipótesis y evidencias pueden vincularse a cualquier nodo semántico BPM: entradas, salidas, stocks, decisiones, mediciones/controles, operaciones, etapas y subprocesos.
- Cada relación BPM-causalidad conserva tipo, identidad, papel de trazabilidad, proceso y versión fija; puede haber varios vínculos por elemento causal y no se permiten inferencias visuales ni cruces de versión.
- Plantillas, contratos, procesos y versiones conservan históricos sin reescritura silenciosa.
- BPM y causalidad son un único conocimiento representado de dos maneras.
- El núcleo funcional recuperado de `requerimiento_10` incluye grafo semántico, procesos canónicos, versiones, nodos, transiciones, subprocesos, decisiones, stocks, salidas y layout separado.
- `requerimiento_11` queda subordinado hasta validar este marco.
- La simplificación del modelo se aplica también a recetas, compatibilidad/requisitos, ejecuciones, mediciones, capacidades y demás modelos asociados: inicialmente se usarán JSONB controlados, no JSON arbitrario ni un modelo relacional detallado para todas sus propiedades.
- El JSONB se ubicará a nivel de proceso, operación o máquina/recurso según el alcance de la información.
- Para cada contexto y familia se conservará un único documento declarativo vigente; al reemplazarlo no se conservarán versiones anteriores ni historial funcional de su contenido JSONB.
- `schema_version` solo identificará la versión del contrato o estructura de la plantilla, y `source/provenance` conservará el origen del contenido, no su historial.
- El contexto JSONB se identifica por la identidad estable de un proceso, operación o máquina/recurso; la familia se determina conforme a la plantilla común.
- La unicidad JSONB es `(context_type, context_id, family)`, con un único documento declarativo vigente por combinación; la versión del proceso, el contrato y la variante quedan fuera de esa clave.
- El reemplazo del documento JSONB sustituye el contenido vigente sin conservar versiones anteriores ni historial funcional del JSONB.
- Los documentos declarativos actuales se distinguirán de los hechos de ejecución; estos últimos solo se registrarán como datos de ejecución del batch si el alcance los exige y no sobrescribirán definiciones.
- Se utilizarán una plantilla única y un prompt único, comunes para todas las familias de información y todos los niveles semánticos, con `schema_version` y `source/provenance` como parte del contrato común.
- La plantilla común y el prompt común se mostrarán en una página de instrucciones de la aplicación en formato Markdown copiable para uso manual en una IA externa; no habrá integración de API con IA en esta etapa y la integración directa queda reservada para la etapa 2.
- La identidad y las relaciones semánticas se conservarán fuera del JSONB cuando corresponda; la máquina no será un nodo BPM.
- Los datos de definición se distinguirán de los hechos de ejecución real de un batch.
- Cada análisis queda fijado a la versión del proceso seleccionada al iniciarse.
- Las referencias de análisis, causas, hipótesis, evidencias y nodos BPM conservan la versión fija del análisis.
- Una nueva versión publicada no reinterpreta ni actualiza análisis abiertos o históricos; solo afecta a análisis nuevos.
- Al iniciar la etapa 2 se analizarán los contratos existentes y se definirán reglas de estandarización o selección de contratos calculables; después se calcularán y clasificarán los contratos calculables y se ejecutará el flujo causal calculado que corresponda.
- El cálculo del contrato se distinguirá del análisis causal posterior.
- El contrato será la entidad de entrada obligatoria del análisis causal; no podrá abrirse un árbol causal sin contrato.
- Los contratos estarán versionados y el flujo conservará la trazabilidad entre contrato, versión evaluada, árbol causal, incidente, entradas, resultados, hipótesis, ramas descartadas y procedencia de cada paso cuando esos datos existan.
- Un contrato es una obligación o declaración industrial versionada, válida para análisis humano aunque esté expresada en texto libre; sus campos comunes y eventual regla ejecutable se conservarán solo cuando hayan sido aportados o definidos en la etapa correspondiente. La salida objetiva `alcanzado`/`no alcanzado` pertenece a la evaluación calculada de la etapa 2, no al contrato exigible en fase 1.
- El ejemplo confirmado de contrato es: “el rendimiento de la máquina MI30 debe ser mayor o igual al 93%”.
- En fase 1 los contratos se expresan en texto libre; se conservan los campos mínimos comunes disponibles sin inventar ausencias y se distingue el texto declarativo de una regla ejecutable.
- En fase 2 se analizarán contratos existentes, se descubrirán patrones y se diseñarán reglas de estandarización para hacer calculables los contratos que proceda.
- No se convertirá automáticamente texto libre en fórmula ni se afirmará que todo contrato de fase 1 es calculable.
- Para descartar o reabrir una rama se exige una justificación y se conserva la evidencia disponible; la falta de información puede registrarse sin convertirla en descarte ni confirmación, y la reapertura exige una nueva justificación.
- Las hipótesis conservan únicamente los estados `pendiente`, `validada` y `descartada`; `pendiente` representa falta de información o evaluación aún no resuelta, `validada` indica apoyo o aceptación según la evidencia disponible y `descartada` indica rechazo según la evidencia y su justificación. Las decisiones de rama conservan `descartada` o `reabierta`, sin añadir una taxonomía innecesaria.
- Cada evaluación y decisión conserva autor, momento, justificación cuando corresponda, evidencias disponibles e hipótesis relacionadas; una reapertura mantiene la relación con la decisión previa.
- Una hipótesis evalúa una única causa, puede tener varias evidencias y produce una evaluación con estado `pendiente`, `validada` o `descartada` que alimenta la conclusión de esa causa y la decisión de su rama.
- Las cadenas `hipótesis -> causa`, `hipótesis -> evidencias`, `hipótesis -> evaluación -> conclusión de causa -> decisión de rama` se conservan explícitamente, incluyendo estados pendientes, reapertura e historial.

### Pendiente

- Definir cómo se deriva la conclusión y el estado de una causa a partir de varias hipótesis, mediante la pregunta única de la sección 13.

## 15. Versión inicial

Este documento consolida el objetivo y alcance recuperados de las fuentes obligatorias e incorpora las capacidades funcionales relevantes de `requerimiento_10`. Permanece en `pendiente_aclaraciones` y no constituye una especificación técnica ni autoriza implementación.
