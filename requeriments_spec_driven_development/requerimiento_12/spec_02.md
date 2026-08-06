# Especificación técnica suplementaria — Modelo máquina para RCA y contexto agéntico

## Metadatos

- **Título:** Aclaración y mejora del modelo/elemento máquina de requerimiento_12.
- **Parent requirement:** `requerimiento_12`.
- **Versión:** `spec_02` — suplemento independiente de `spec.md`.
- **Estado:** `spec_pendiente_validacion`.
- **Autor:** `requirements-agent`.
- **Fecha:** `2026-08-02`.
- **Enmienda:** `AMD-02-003` — enmienda tipo B, acumulada sobre `AMD-02-001` y `AMD-02-002`, especificada y pendiente de validación humana.
- **Referencias:**
  - `requeriments_spec_driven_development/requerimiento_12/promt_correcion_modelo_maquina.md`.
  - `requeriments_spec_driven_development/requerimiento_12/spec.md` — solo como contexto y contrato padre; no se modifica.
  - `requeriments_spec_driven_development/requerimiento_12/task_plan.md` — solo como contexto de compatibilidad; no se modifica.
  - `requeriments_spec_driven_development/requerimiento_12/nc-log.md`, especialmente `NC-006` — solo como contexto de la brecha de identidad/atributos/relaciones; no se modifica.
  - `db/schema.sql`, repositorios, servicios, rutas y proyecciones actuales del modelo canónico — inspección de solo lectura.

Este documento es una aclaración/mejora suplementaria. No reemplaza ni reescribe `spec.md`. La validación humana de `spec_02.md` es un gate obligatorio antes de planificar o implementar los cambios descritos aquí. La implementación no podrá cerrar `NC-006` únicamente por existir este documento: deberá aportar evidencia técnica y pasar nuevamente la validación humana de implementación.

## Overview

### Propósito

Definir un modelo generalista y verificable de máquinas para comprender el funcionamiento de un equipo, distinguir su tipo genérico de la unidad física, relacionar explícitamente la unidad con cada operación en la que participa y entregar contexto ordenado a consultas técnicas y agentes RCA.

El modelo lógico de máquinas tendrá exactamente estas tres entidades del dominio de máquinas:

1. `machine_type`: clase funcional genérica.
2. `machine`: unidad física concreta.
3. `machine_operation_configuration`: relación y configuración de una máquina para una operación.

`operation`, `process`, `contract`, BPM y los registros de contexto causal continúan siendo conceptos existentes e independientes. No se convierten en subentidades de `machine` ni se duplican dentro del nuevo modelo.

### Objetivos

- Evitar duplicar en cada unidad física la información común de su tipo.
- Separar inequívocamente lo permanente de la máquina de lo dependiente de una operación.
- Mantener identidad canónica y relaciones comprobables con proceso, contrato, BPM y contexto agéntico.
- Permitir reconstruir un contexto RCA sin inferir relaciones desde nombres, HTML, coordenadas o texto visual.
- Reutilizar la arquitectura y los modelos generales existentes sin crear un bounded context BU/MACBU.

### Límites del modelo

El modelo no es inventario industrial, CMMS, mantenimiento, patrimonio, catálogo comercial, gestión de ubicaciones ni control directo de equipos. Fabricante, modelo comercial, proveedor, número de serie, planta, línea, área, ubicación, años de fabricación/instalación, fecha de alta, observaciones administrativas y un indicador independiente `active` no forman parte de este suplemento.

## Functional Requirements

### FR-02-01 — Separación conceptual obligatoria

EL SISTEMA DEBERÁ mantener la siguiente separación:

```text
operation
    -> machine_operation_configuration
    -> machine
    -> machine_type
```

- `machine_type` describe el funcionamiento común de una clase funcional.
- `machine` identifica una unidad física y solo sus particularidades permanentes.
- `machine_operation_configuration` expresa la relación explícita máquina–operación y los datos que solo tienen sentido para esa combinación.
- `operation` seguirá siendo independiente y no se materializará como una copia de `machine`, `machine_type` o configuración.

EL SISTEMA NO DEBERÁ deducir la relación máquina–operación desde el contrato, el nombre de la máquina, el tipo de máquina o el RCA activo cuando no exista un vínculo persistido.

### FR-02-02 — Entidad `machine_type`

La entidad `machine_type` DEBERÁ contener como mínimo los siguientes campos lógicos:

| Campo | Obligatorio | Tipo conceptual | Regla |
|---|---:|---|---|
| `id` | Sí | identificador interno | Inmutable y único. |
| `name` | Sí | texto | Nombre funcional legible; no fabricante/modelo comercial. |
| `technology_description` | No | texto | Tecnología o mecanismo principal, en descripción corta. |
| `nominal_capacity` | No | objeto estructurado | Solo si ayuda a interpretar capacidad, ciclos, cantidades o causas RCA. |
| `operating_principle` | Sí | texto | Explicación general de funcionamiento. |
| `elements_zones_positions` | No | lista estructurada | Elementos, zonas y puestos funcionales genéricos. |
| `control_systems` | No | lista estructurada | Controles genéricos relevantes para RCA, no inventario exhaustivo de hardware. |
| `common_technical_characteristics` | No | lista/objeto estructurado | Características comunes a las unidades del tipo. |
| `common_limitations` | No | lista/objeto estructurado | Limitaciones comunes relevantes para interpretación o RCA. |
| `general_technical_description` | Sí | texto | Descripción técnica general del tipo. |

EL SISTEMA DEBERÁ conservar la información común en `machine_type` y no copiarla automáticamente en cada `machine`.

`nominal_capacity` podrá tener la forma `{value, unit, description}`. Los elementos de `elements_zones_positions` podrán tener `{code, name, type, description}`. Los controles de `control_systems` podrán tener `{name, description}`. La aplicación DEBERÁ validar que estos objetos sean JSON objeto/lista con la estructura contractual prevista, evitando JSON completamente libre.

### FR-02-03 — Entidad `machine`

La entidad `machine` DEBERÁ contener como mínimo los siguientes campos lógicos:

| Campo | Obligatorio | Tipo conceptual | Regla |
|---|---:|---|---|
| `id` | Sí | identificador interno | Identidad canónica estable de la unidad; no se sustituye por nombre. |
| `name` | Sí | texto | Nombre interno usado en el proceso, por ejemplo `BA01` o `PSA1`. |
| `machine_type_id` | Sí | FK a `machine_type` | Debe referenciar un tipo existente. |
| `contract_id` | No | FK/referencia a contrato existente | Asociación contextual de la máquina; no define su tipo. |
| `operational_status` | Sí | enumeración/texto controlado | Valores permitidos inicialmente: `ready`, `running`, `stopped`, `degraded`, `unavailable`, `unknown`. |
| `specific_description` | No | texto | Descripción funcional o técnica propia. |
| `specific_characteristics` | No | lista/objeto estructurado | Diferencias permanentes de la unidad. |
| `specific_parameters` | No | lista estructurada | Parámetros permanentes propios de la unidad. |
| `specific_operating_ranges` | No | lista estructurada | Rangos permanentes de funcionamiento. |
| `specific_limitations` | No | lista/objeto estructurado | Limitaciones permanentes de la unidad. |
| `specific_instructions` | No | lista/objeto estructurado | Instrucciones generales particulares de la unidad. |
| `differences_from_machine_type` | No | texto/objeto | Resumen explícito de diferencias frente al tipo. |

EL SISTEMA NO DEBERÁ añadir para este alcance campos de número de serie, código patrimonial, fabricante, proveedor, planta, línea, área, ubicación, año, fecha de alta, `active` o `activo` como segunda representación del estado. La presencia histórica de alguno de esos campos en tablas legadas deberá tratarse mediante compatibilidad de lectura/migración documentada, no como autorización para usarlo en el contexto RCA.

Los campos específicos DEBERÁN contener diferencias o valores permanentes de la unidad y no una copia de `machine_type`. Un parámetro permanente, rango permanente, limitación permanente o instrucción general DEBERÁ vivir en `machine` aunque también afecte a varias operaciones.

### FR-02-04 — Entidad `machine_operation_configuration`

La entidad `machine_operation_configuration` DEBERÁ persistirse como una tabla dedicada con ese propósito. No se reutilizará `contrato_maquina` como sustituto de la entidad nueva. `contrato_maquina` conservará su relación histórica contrato–máquina y solo podrá participar como fuente de compatibilidad o migración explícitamente trazada.

La tabla dedicada `machine_operation_configuration` DEBERÁ representar una relación explícita muchos-a-muchos entre unidades y operaciones:

| Campo | Obligatorio | Tipo conceptual | Regla |
|---|---:|---|---|
| `id` | Sí | identificador interno | Identidad de la configuración. |
| `machine_id` | Sí | FK a `machine` | Máquina física participante. |
| `operation_id` | Sí | identificador canónico del nodo BPM | Identifica un `pm_process_node.node_id` cuyo `node_type = 'operation'`; no es un código o nombre textual. |
| `process_version_id` | Sí | referencia a versión BPM | Contexto de versión del nodo; corresponde al `pm_process_version.version_id` del esquema actual. |
| `contract_id` | No | FK/referencia a contrato existente | Relación contractual separada y opcional; no define ni sustituye `operation_id`. |
| `specific_description` | No | texto | Cómo participa la unidad en esa operación. |
| `additional_inputs` | No | lista estructurada | Entradas adicionales de la combinación. |
| `specific_controls` | No | lista estructurada | Controles aplicables en esa operación. |
| `available_measurements` | No | lista estructurada | Medidas disponibles para analizar esa ejecución. |
| `specific_safety_rules` | No | lista estructurada | Reglas específicas de seguridad de la combinación. |
| `validation_status` | Sí | enumeración controlada | Estado de validación de la configuración; como mínimo `draft`, `validated`, `rejected`. |
| `valid_from` | No | fecha/hora | Inicio de vigencia. |
| `valid_to` | No | fecha/hora | Fin de vigencia; no puede preceder a `valid_from`. |

EL SISTEMA DEBERÁ validar que `operation_id` referencia un nodo existente de tipo `operation` y que pertenece a `process_version_id`. DEBERÁ imponer `UNIQUE(machine_id, process_version_id, operation_id)` para impedir relaciones duplicadas dentro de una versión BPM sin crear copias de la operación. La ausencia de datos específicos adicionales no elimina la relación: una combinación válida deberá poder persistirse con solo sus identidades, versión, estado y vigencia.

`machine_operation_configuration` NO DEBERÁ almacenar `specific_parameters`, rangos generales, capacidad aplicada, limitaciones permanentes, sistemas generales usados, instrucciones generales ni diferencias permanentes respecto del tipo. Esos datos pertenecen a `machine`.

Los campos específicos de configuración (`additional_inputs`, `specific_controls`, `available_measurements` y `specific_safety_rules`) DEBERÁN persistirse como JSONB u objetos equivalentes con contrato de estructura y validación de dominio/backend antes de escribirlos. La tabla dedicada DEBERÁ conservar en columnas relacionales las identidades y relaciones principales, incluido `contract_id` cuando exista.

### FR-02-05 — Regla de clasificación de información

Antes de persistir un campo, el caso de uso DEBERÁ clasificarlo así:

- Si es válido para la máquina independientemente de la operación, se guarda en `machine`.
- Si solo tiene sentido para una máquina ejecutando una operación concreta, se guarda en `machine_operation_configuration`.
- Si es común a unidades equivalentes, se guarda en `machine_type`.
- Si describe la definición, entradas, salidas, controles o medidas genéricas de la operación, permanece en `operation` y sus contratos BPM existentes.
- Si es un hecho observado, evidencia o resultado RCA, permanece en el mecanismo general `pm_context_record`/contratos causales correspondiente; no se convierte en atributo permanente de máquina.

### FR-02-06 — Identidad y cardinalidades

EL SISTEMA DEBERÁ garantizar:

- Un `machine_type` puede tener cero o muchas `machine`.
- Cada `machine` referencia exactamente un `machine_type`.
- Una `machine` puede asociarse a cero o un `contract_id` según el contrato existente y las reglas actuales de compatibilidad.
- Una `machine` puede participar en muchas operaciones.
- Una `operation` puede ejecutarse en muchas máquinas.
- Cada par máquina–operación tiene como máximo una `machine_operation_configuration`.
- `machine_id`, `machine_type_id`, `operation_id`, `process_version_id` y `contract_id` deberán conservar sus identidades canónicas; una etiqueta textual podrá acompañarlas, pero nunca sustituirlas. En particular, `operation_id` será el `node_id` del nodo BPM de tipo `operation`, preferentemente `pm_process_node.node_id`, y `process_version_id` será el contexto de versión/proceso.

EL SISTEMA NO DEBERÁ tratar `contract_id` como `machine_type_id`, ni tratar el nombre interno de una máquina como descripción de ubicación, ni interpretar una medida de configuración como parámetro permanente.

### FR-02-07 — Contexto de proceso, operación y contrato

La proyección de contexto DEBERÁ conservar separadas estas relaciones:

1. `process`/versión BPM define el proceso y sus nodos/transiciones.
2. `operation` sigue siendo un concepto independiente del modelo de máquinas y define la actividad y su descripción, entradas, salidas, controles y medidas genéricas. Su fuente canónica de identidad para este alcance es el nodo BPM de tipo `operation`: `operation_id = pm_process_node.node_id`, con `process_version_id = pm_process_node.version_id`/`pm_process_version.version_id` y su proceso como contexto.
3. `contract` mantiene su función canónica actual y podrá estar asociado a la máquina conforme al modelo legado.
4. `machine` aporta la unidad y el `machine_type` al que pertenece.
5. `machine_operation_configuration` aporta la participación de esa unidad en esa operación.

Un `contract` podrá relacionarse con el nodo/operación mediante `contract_id`, cuando exista esa relación en el modelo vigente. `contract_id` permanecerá separado y nunca sustituirá `operation_id`; `contrato.id` no podrá ser la identidad canónica de la operación BPM. La API podrá proyectar ambos identificadores cuando proceda, pero no podrá convertir globalmente `contract` en `operation` ni eliminar la entidad conceptual independiente de operación.

La relación BPM del nodo de operación DEBERÁ conservar `process_id`, `process_version_id`, `operation_id` y, cuando exista, `contract_id`/identidades canónicas de máquina como referencias explícitas. `process_version_id` deberá resolverse contra `pm_process_version.version_id` y `operation_id` contra `pm_process_node.node_id` dentro de esa versión. No se aceptarán enlaces solo textuales en JSONB ni asignaciones derivadas de la proximidad visual.

### FR-02-08 — Contexto RCA y agéntico

La recuperación de contexto para una máquina y una operación DEBERÁ entregar los bloques en este orden:

1. Operación: qué debe hacerse.
2. Tipo de máquina: cómo funciona genéricamente el equipo.
3. Máquina: qué particularidades permanentes tiene la unidad.
4. Configuración máquina–operación: cómo participa esa unidad en la operación.
5. Hechos, evidencias y metodología RCA aplicables, conservando su naturaleza y procedencia.

La proyección DEBERÁ incluir identidades canónicas, versión/procedencia y relaciones suficientes para reconstruir el contexto. El agente no deberá inferir tipo desde contrato, ubicación desde nombre, características comunes desde una particularidad ni parámetros permanentes desde medidas disponibles.

### FR-02-09 — Persistencia y JSONB

`machine_operation_configuration` DEBERÁ tener una tabla persistente dedicada en el modelo de datos y en el DDL/migrador vigente. La conexión y los repositorios permanecerán en la capa de persistencia existente; las entidades, invariantes, clasificación de campos y casos de uso permanecerán en la capa de dominio; la UI no definirá el modelo ni el DDL.

Los campos múltiples podrán persistirse en JSONB, pero la aplicación DEBERÁ validar sus estructuras antes de escribirlas y la persistencia DEBERÁ rechazar estructuras que no cumplan el contrato. No se crearán tablas independientes adicionales para parámetros, controles, medidas, elementos, zonas o puestos dentro de este alcance.

La separación conceptual entre entidades no se podrá degradar por guardar todo en un único JSONB de nodo. Las identidades y relaciones principales deberán permanecer en columnas/FK o en los mecanismos relacionales canónicos ya existentes; JSONB se reservará para atributos estructurados no relacionales.

### FR-02-10 — Arquitectura y ubicación esperada

Los cambios futuros derivados de esta especificación DEBERÁN extender módulos existentes, salvo decisión humana posterior documentada:

- **Dominio:** `app/domain/` o el límite funcional equivalente existente. Entidades/value objects, reglas de clasificación, validaciones de estados y casos de uso; sin imports de Flask, Dash, SQL, PostgreSQL, Dataiku o infraestructura.
- **Persistencia:** `app/persistence/`. Repositorios/adaptadores para `maquinas_tipo`/`machine_type`, `maquina`/`machine`, la tabla dedicada `machine_operation_configuration`, contratos y relaciones BPM/contexto. `contrato_maquina` se mantiene como adaptador/relación histórica de compatibilidad, no como la entidad nueva.
- **Esquema:** `db/schema.sql` y el inicializador/migrador vigente. Cualquier DDL deberá ser generalista, compatible e idempotente.
- **Backend/API:** rutas existentes bajo `uc_bib_solv/webapp_java/python-backend/routes/`, servicios bajo `services/` y repositorios actuales, extendiendo las rutas operacionales/proceso/contexto existentes cuando sea suficiente. No se creará otra aplicación HTTP.
- **Frontend/UI:** `uc_bib_solv/webapp_java/webapp/js/api/`, `js/core/`, `js/components/` y `js/views/`. La UI podrá seleccionar una máquina y mostrar los cuatro bloques, pero no podrá aplicar por sí sola las invariantes, resolver identidad ni decidir la clasificación de campos.
- **Tests:** tests de dominio sin BBDD real, tests de persistencia/API y pruebas UI sobre la superficie existente cuando aplique.

### FR-02-11 — UI

Cuando la UI muestre el detalle de una máquina seleccionada, DEBERÁ presentar bloques diferenciados y no mezclar sus campos:

- Operación: nombre, descripción, entradas, salidas, controles y medidas genéricas.
- Tipo de máquina: nombre, tecnología, capacidad, principio, elementos/zonas/puestos, controles, características, limitaciones y descripción general.
- Máquina específica: identidad, nombre, contrato, estado, descripción, características, parámetros, rangos, limitaciones, instrucciones y diferencias.
- Configuración máquina–operación: descripción de participación, entradas adicionales, controles, medidas disponibles, reglas de seguridad, validación y vigencia.

La UI DEBERÁ representar estados de carga, vacío, error y ausencia de configuración sin inventar datos. La edición/selección DEBERÁ enviar identificadores canónicos y el backend DEBERÁ repetir las validaciones.

### FR-02-12 — API y errores

Las rutas existentes de máquinas, contratos, proceso-modelado y contexto DEBERÁN conservar sus contratos compatibles. Si se amplían respuestas, los campos nuevos deberán ser aditivos o versionados sin cambiar silenciosamente el significado de los campos actuales.

Las operaciones de lectura deberán poder recuperar una máquina por `machine_id`, su `machine_type`, contrato relacionado, operaciones configuradas y proyección RCA. La respuesta deberá distinguir `operation_id` (nodo BPM), `process_version_id` (versión/proceso) y `contract_id` (contrato relacionado, si existe). Las operaciones de escritura deberán rechazar:

- `machine_type_id` inexistente.
- `operation_id` inexistente, no perteneciente a `process_version_id` o cuyo nodo no sea de tipo `operation`.
- segundo vínculo para la misma máquina, versión BPM y nodo de operación.
- estado o JSONB fuera del contrato.
- vigencia invertida.
- referencias textuales sin identidad canónica cuando la relación sea estructural.

Los errores funcionales deberán devolver códigos HTTP y mensajes seguros conforme al patrón existente, sin trazas internas.

### FR-02-13 — Migración y compatibilidad

La implementación DEBERÁ empezar por un inventario de datos y un mapa de compatibilidad, sin borrar datos ni ejecutar migraciones destructivas automáticamente.

- `maquinas_tipo` es el candidato de persistencia legado para `machine_type`, sujeto a comprobar que sus columnas se puedan ampliar o mapear sin conservar semántica comercial/administrativa.
- `maquina` es el candidato de persistencia legado para `machine`; `nombre` puede proyectarse como `name` y `maquinas_tipo_id` como `machine_type_id` si las referencias son válidas.
- `contrato_maquina` conserva la relación canónica histórica contrato–máquina. No deberá reinterpretarse silenciosamente como configuración máquina–operación: deberá incorporar o mapear explícitamente `operation_id` como `pm_process_node.node_id` y `process_version_id` como versión BPM, manteniendo `contract_id` separado.
- `machine_operation_configuration` se creará y gestionará como tabla persistente dedicada, con `machine_id`, `operation_id`, `process_version_id`, `contract_id` opcional separado, campos específicos JSONB validados, `validation_status`, `valid_from`, `valid_to` y `UNIQUE(machine_id, process_version_id, operation_id)`. `contrato_maquina` no se adaptará ni reinterpretará como sustituto de esta entidad; se conservará para compatibilidad histórica.
- Los registros BPM/contexto existentes deberán conservarse y enlazarse mediante IDs canónicos. Los JSONB históricos no se reescribirán de forma silenciosa ni se usarán como única fuente de verdad relacional.
- La migración deberá inventariar `contrato_maquina`, crear o actualizar de forma idempotente la tabla dedicada y poblarla solo mediante mapeos explícitos y verificables de `machine_id`, `operation_id`, `process_version_id` y `contract_id` cuando existan. No deberá borrar ni cambiar semánticamente los registros históricos de `contrato_maquina`; una segunda ejecución no deberá duplicar tipos, máquinas, configuraciones ni relaciones.

### FR-02-14 — Relación con `NC-006`

Esta especificación responde a la brecha conceptual descrita en `NC-006`: identidad estable, atributos separados y relaciones verificables de máquina con proceso, operación/contrato, BPM y contexto. La implementación futura deberá demostrar la trazabilidad completa desde la máquina canónica hasta la proyección API/UI y el contexto RCA.

`NC-006` seguirá siendo un registro independiente y abierto hasta que la implementación corregida sea validada por el programador humano. Este suplemento no cambia su estado ni sus artefactos.

### FR-02-15 — Enmienda AMD-02-003: alta, modificación y verificación de máquina

La enmienda amplía el alcance de `spec_02.md` sin sustituir las decisiones de `AMD-02-001` ni `AMD-02-002`.

1. El caso de uso de gestión de máquina DEBERÁ soportar alta y modificación desde el modal existente de `maquinas_v02`.
2. La alta DEBERÁ crear la máquina y devolver su identidad canónica; la modificación DEBERÁ conservarla y actualizar únicamente los campos enviados.
3. El backend DEBERÁ ser la autoridad para validar identidad, tipo, estado, campos estructurados y `etapas`; la UI solo hará validación inmediata, composición de controles y presentación de errores.
4. La entrega DEBERÁ incluir pruebas unitarias de dominio/servicio/repositorio y pruebas E2E Playwright del flujo observable de alta y modificación. No será suficiente probar solo la apertura del modal.
5. Las pruebas DEBERÁN comprobar persistencia, respuesta HTTP, relectura del detalle y ausencia de edición manual del JSON de etapas.

### FR-02-16 — Campo `etapas` del modelo de operación

La operación BPM (`pm_process_node` con `node_type = 'operation'`) DEBERÁ exponer un campo lógico `etapas` para registrar una jerarquía de etapas y subetapas. `etapas` pertenece a la operación, no a `machine` ni a `machine_operation_configuration`; varias máquinas de una operación leerán el mismo árbol. No se creará una entidad de máquina, tabla auxiliar por etapa ni bounded context nuevo.

El contrato tendrá exactamente dos niveles: etapas raíz y subetapas directas. La persistencia se realizará dentro de `pm_process_node.properties` bajo la clave `etapas`, preservando las demás propiedades del nodo; la API normalizará esa ubicación a `operation.etapas`. No se crearán una columna o tabla paralela ni se aceptarán alias como `stages` o `subetapas_json`.

```json
{
  "operation_id": "<identidad-canónica-de-operación>",
  "etapas": [
    {
      "id": "<id-estable-de-etapa>",
      "nombre": "Preparación",
      "orden": 1,
      "subetapas": [
        {
          "id": "<id-estable-de-subetapa>",
          "nombre": "Verificar presión",
          "orden": 1,
          "subetapas": []
        }
      ]
    }
  ]
}
```

Reglas canónicas:

- `etapas` será `[]` cuando no haya etapas; no será `null` en la respuesta normal de una operación.
- La envolvente de persistencia/API usará `schema_version = 1` cuando exponga metadata de esquema; no se añadirá como propiedad de cada nodo.
- Cada nodo tendrá `id`, `nombre`, `orden` y `subetapas`; `nombre` será texto no vacío y se serializará en UTF-8.
- Los identificadores serán estables dentro de la operación y no se regenerarán al editar el nombre o reordenar; el backend será quien los asigne en el alta.
- `orden` será entero positivo y determinará el orden de hermanos. La UI enviará la secuencia resultante; el backend validará que no existan órdenes duplicados entre hermanos.
- `subetapas` será siempre un array; un nodo hoja lo representará como `[]`.
- Las subetapas solo podrán ser hijas directas de una etapa raíz; una profundidad mayor será rechazada con `invalid_stage_depth`.
- No se aceptarán claves de identidad basadas en nombre, posición visual, HTML, índice de array o texto libre.
- El backend rechazará JSON mal formado, tipos incorrectos, nombres vacíos, IDs duplicados en el árbol, órdenes duplicados entre hermanos, referencias circulares representadas por IDs y versiones de esquema no soportadas, con error 400 y código funcional estable.
- La persistencia conservará el JSON canónico sin depender del formato visual del editor. La serialización de respuesta será determinista: propiedades en el orden del contrato, nodos ordenados por `orden` y sin claves auxiliares de presentación.
- El campo deberá quedar enlazado a la identidad canónica de la operación y no podrá copiarse silenciosamente a cada máquina participante.

### FR-02-17 — Dominio, persistencia, API y compatibilidad de `etapas`

- **Dominio:** extender `app/domain/machine_modeling/` o el módulo de dominio de operación existente con un value object/validador de árbol, invariantes, errores funcionales y casos de uso de alta, modificación, reordenación y eliminación. No importará Flask, SQL, PostgreSQL ni módulos de UI.
- **Persistencia:** extender `app/persistence/` y los repositorios de process modeling para leer/escribir `pm_process_node.properties.etapas`. El valor persistido será JSONB canónico con `schema_version: 1` y `etapas`; no se crearán tablas de etapas ni se copiará el árbol a `machine_operation_configuration`.
- **Esquema/migración:** extender `db/schema.sql` y el mecanismo migrador vigente de forma idempotente, sin pérdida ni reinterpretación destructiva. Las operaciones históricas sin esa clave proyectarán `etapas: []`; una segunda ejecución no cambiará conteos, IDs ni árboles existentes.
- **Backend/API:** ampliar las rutas, servicios y repositorios existentes. Las lecturas de operación y `/api/operational/machines/<machine_id>/context` devolverán `operation.etapas`; las escrituras desde el modal transportarán `operation_id`, `process_version_id` y `etapas`, y el backend actualizará solo `properties.etapas`, sin duplicarlo en `machine`.
- **Compatibilidad:** las respuestas actuales conservarán sus campos; `etapas` será aditivo. Clientes que no lo envíen conservarán el valor existente en PATCH y obtendrán `[]` para registros sin etapas. No se aceptará un segundo campo equivalente (`stages`, `subetapas_json` o similar).
- **Errores:** 400 para contrato inválido, 404 para operación/máquina inexistente, 409 para conflicto de versión o actualización concurrente si el patrón existente lo soporta, y 500 solo para fallo interno sin exponer SQL/trazas.

### FR-02-18 — Editor de etapas/subetapas en el modal

El modal existente deberá incorporar una sección visible denominada `Etapas` en el detalle de máquina y en el flujo de gestión de máquina.

- El técnico creará una etapa con un control de nombre y el botón `Añadir etapa`.
- Cada etapa podrá añadir subetapas directas mediante `Añadir subetapa`; la UI mostrará la jerarquía con indentación, contador y orden visible. No habrá control para añadir subetapas a una subetapa.
- La UI permitirá editar el nombre, reordenar hermanos y eliminar nodos con confirmación cuando tengan descendientes.
- La UI generará internamente el objeto JSON canónico y lo enviará en el payload; no mostrará un textarea JSON, editor de código, botón de pegar JSON ni control que permita editar manualmente la serialización.
- Antes de guardar, la UI impedirá nombres vacíos, órdenes inválidos y estructuras incompletas, y mostrará el error junto al nodo afectado. El backend repetirá todas las validaciones.
- En carga se mostrará un indicador; sin etapas se mostrará `Sin etapas definidas` y una acción para añadir la primera; en fallo de carga o guardado se conservará el formulario y se mostrará un mensaje seguro con opción de reintento.
- En el detalle de máquina, la etapa actual se mostrará junto al bloque de operación/configuración cuando exista una operación seleccionada; la vista deberá mostrar la ruta jerárquica `Etapa › Subetapa` sin presentar el JSON bruto. Sin etapas se mostrará explícitamente `Sin etapas definidas`, nunca una etapa inventada.
- La UI no resolverá la identidad de operación desde el nombre: enviará `operation_id` y `process_version_id` canónicos ya seleccionados por el contexto existente. Si no hay operación BPM seleccionada, el editor se mostrará deshabilitado y el modal podrá guardar cambios de máquina que no afecten a `etapas`.
- El alta de una máquina podrá crear también el tipo de máquina según el flujo actual; la edición de `etapas` solo se ejecutará cuando exista una operación BPM seleccionada y el backend confirme que pertenece a `process_version_id`.

### FR-02-19 — Pruebas unitarias y E2E exigibles por AMD-02-003

Las pruebas deberán seguir los patrones actuales: tests Python `unittest`/suite unitaria para dominio y persistencia aislada, tests JavaScript del proyecto para comportamiento de UI cuando aplique y Playwright en `tests/e2e/` para E2E.

Pruebas unitarias mínimas:

1. Alta de máquina: payload válido, identidad devuelta y `etapas` serializado con el contrato canónico.
2. Modificación de máquina: conserva el ID, modifica nombre/datos y no borra `etapas` cuando el PATCH no incluye el campo.
3. Árbol válido: orden, hojas con `subetapas: []`, IDs estables y serialización determinista.
4. Árbol inválido: nombre vacío, tipo incorrecto, ID duplicado, orden duplicado entre hermanos, versión no soportada y profundidad mayor de dos niveles; cada caso devuelve el error funcional esperado.
5. Persistencia: `[]` para vacío, round-trip JSONB sin mutación y migración idempotente.
6. API: 400/404/409 según contrato, respuesta aditiva y ausencia de trazas internas.

E2E mínimas:

1. Abrir `maquinas_v02`, seleccionar una máquina, abrir el modal y comprobar la sección `Etapas` y el estado inicial.
2. Crear una máquina desde el modal con una operación BPM seleccionada, añadir al menos una etapa y una subetapa mediante controles, guardar, esperar `POST` 201, cerrar/releer y verificar que la jerarquía aparece en el detalle de esa operación.
3. Modificar la máquina creada, renombrar una etapa y reordenar o eliminar una subetapa mediante controles, esperar `PATCH` 200 y verificar persistencia tras recarga.
4. Comprobar que el modal no contiene textarea/editor de JSON para `etapas` y que el request contiene el JSON generado por los controles.
5. Comprobar estados de carga, vacío y error de guardado sin perder los datos introducidos; limpiar/restaurar el fixture para no dejar cambios de prueba.

Estos criterios amplían, sin sustituir, `AC-02-12`, `AC-02-13`, `AC-02-14` y `AC-02-15`.

## Non-Functional Requirements

- **NFR-02-01 — Integridad:** las FK, unicidad y validaciones de dominio deberán impedir máquinas huérfanas, tipos inexistentes, configuraciones duplicadas y rangos temporales inválidos.
- **NFR-02-02 — Trazabilidad:** una proyección de máquina deberá poder recorrerse hasta tipo, operación, proceso/versión, contrato cuando aplique, BPM y registros de contexto/evidencia relacionados.
- **NFR-02-03 — Compatibilidad:** los endpoints y consumidores actuales de `maquina`, `contrato_maquina`, análisis causal y proceso-modelado deberán seguir funcionando o disponer de una versión explícita; no se permite cambio silencioso de semántica.
- **NFR-02-04 — Generalidad:** el modelo deberá ser aplicable a procesos distintos del fixture BU y no podrá introducir nombres, tablas o reglas exclusivas de BU/MACBU.
- **NFR-02-05 — Separación de capas:** las invariantes estarán en dominio/backend; la UI solo realizará validación inmediata y presentación; persistencia no contendrá reglas de negocio reutilizables.
- **NFR-02-06 — Rendimiento verificable:** una lectura de detalle máquina–operación deberá resolverse con consultas acotadas al identificador solicitado y sin depender del render de la SPA; el umbral de rendimiento deberá heredarse del contrato de API existente si está definido.
- **NFR-02-07 — Seguridad:** las respuestas no expondrán secretos, SQL ni trazas internas; se respetarán permisos y filtros existentes.
- **NFR-02-08 — Evolución:** los JSONB tendrán esquema/versión y procedencia; la evolución de campos no romperá las claves relacionales.
- **NFR-02-09 — Editor seguro:** ningún técnico podrá editar manualmente el JSON de `etapas`; la única fuente de cambios será el editor estructurado del modal.
- **NFR-02-10 — Determinismo:** el mismo árbol lógico producirá la misma serialización canónica y el mismo orden de presentación después de guardar y recargar.

## Constraints and Assumptions

### Restricciones confirmadas por el prompt y el contexto

1. El alcance del modelo de máquinas contiene solo `machine_type`, `machine` y `machine_operation_configuration` como entidades de dominio de máquinas.
2. No se crearán tablas auxiliares para parámetros, controles, medidas, elementos, zonas o puestos.
3. No se crearán modelos, tablas, rutas, repositorios ni bounded contexts específicos de BU/MACBU.
4. El proceso, la operación, el contrato, BPM, metodología causal y contexto generalista existentes se preservan.
5. Los atributos repetitivos o de cardinalidad múltiple podrán ser JSONB con estructura validada.
6. `operational_status` es el único estado operativo de la máquina; no se añadirá un booleano independiente `active` para el nuevo contrato.
7. El ID canónico es la identidad principal; el nombre es una etiqueta interna legible.
8. `machine_operation_configuration` será una tabla persistente dedicada. No se reutilizará `contrato_maquina` como sustituto; esta última se conservará para compatibilidad histórica.
9. La tabla dedicada tendrá `machine_id`, `operation_id = pm_process_node.node_id` para `node_type='operation'`, `process_version_id = pm_process_version.version_id`, `contract_id` opcional separado, campos específicos JSONB validados, `validation_status`, `valid_from`, `valid_to` y `UNIQUE(machine_id, process_version_id, operation_id)`.

### Supuestos conservadores para validar

- Se reutilizarán primero `maquinas_tipo` y `maquina` porque ya existen en `db/schema.sql` y tienen repositorios activos. La equivalencia completa de campos y la eliminación/ignorancia de campos legados deberán verificarse durante la planificación.
- La fuente canónica de `operation_id` será el nodo BPM `pm_process_node.node_id` de tipo `operation`, junto con `process_version_id`/proceso. Los contratos podrán aportar `contract_id` y relaciones contextuales, pero nunca la identidad de operación. El mismo código, nombre textual o `contrato.id` no podrá sustituir al `node_id`.
- `contract_id` en `machine` representa asociación contextual y no determina el tipo de máquina ni sustituye el vínculo máquina–operación.

### Riesgos de arquitectura

- El esquema actual contiene `maquinas_tipo`, `maquina`, `registro_maquina`, `contrato` y `contrato_maquina`; algunos campos legados (`activo`, `parent_maquina_id`, `registro_maquina`) no pertenecen al nuevo contexto RCA. La implementación deberá documentar si se mantienen para consumidores existentes, se ignoran en la proyección o se migran en una fase separada.
- El esquema actual no contiene todos los campos de `machine_type`/`machine` ni una tabla evidente con todos los campos de configuración. La decisión de DDL debe basarse en el mapa de compatibilidad y no en una reinterpretación silenciosa.
- La API actual calcula estado de máquina desde contratos/enlaces; deberá distinguir esa proyección de `operational_status` persistido.

## Out of Scope

- Reescritura de `spec.md`, `task_plan.md`, `nc-log.md`, trazas o requerimientos de origen.
- Implementación de código, DDL, migraciones, endpoints, componentes UI o tests; este documento solo especifica su comportamiento esperado.
- Inventario, mantenimiento, CMMS, patrimonio, ubicaciones, fabricación, instalación, proveedores, catálogo comercial y número de serie.
- Nuevas entidades de primer nivel para BU/MACBU, procesos concretos, fabricantes o familias comerciales.
- Tablas separadas para elementos, zonas, puestos, parámetros, controles, medidas o reglas.
- Control físico de máquinas, integración PLC/SCADA, telemetría automática o sincronización externa.
- Automatización de hipótesis, conclusiones RCA o reglas `AND`/`OR` no definidas por la metodología causal.
- Sustitución del BPM relacional o del contexto generalista por un documento JSON monolítico.

## Acceptance Criteria

- **AC-02-01 — Entidades:** una inspección de diseño y esquema identifica exactamente tres entidades lógicas del modelo de máquinas: `machine_type`, `machine` y `machine_operation_configuration`, y verifica que la tercera tiene una tabla persistente dedicada; no aparecen entidades BU/MACBU ni tablas auxiliares para sus listas estructuradas.
- **AC-02-02 — Tipo genérico:** una prueba de persistencia crea un `machine_type` con principio, descripción general y al menos un bloque estructurado; dos máquinas del mismo tipo recuperan la información común desde el tipo sin duplicarla en sus campos específicos.
- **AC-02-03 — Identidad física:** una prueba SQL/API demuestra que cada `machine` tiene ID estable, nombre, `machine_type_id` válido y `operational_status` controlado; una máquina con tipo inexistente es rechazada.
- **AC-02-04 — Separación de permanencia:** una prueba de dominio clasifica un parámetro/rango/limitación permanente en `machine` y rechaza su almacenamiento como configuración de operación.
- **AC-02-05 — Configuración explícita:** una prueba de persistencia crea una fila en la tabla dedicada para `machine_id`, `process_version_id` y un `operation_id` que referencia un nodo BPM de tipo `operation`, con `contract_id` opcional separado y aunque sus campos específicos estén vacíos; una segunda inserción del mismo triple falla por `UNIQUE(machine_id, process_version_id, operation_id)` o produce una respuesta idempotente sin duplicado.
- **AC-02-06 — Configuración contextual:** una prueba verifica que entradas adicionales, controles, medidas y reglas de seguridad se recuperan de `machine_operation_configuration`, mientras los parámetros/rangos permanentes se recuperan de `machine`.
- **AC-02-06a — JSONB y estados:** una prueba de persistencia acepta los campos específicos JSONB solo cuando cumplen su contrato estructural, rechaza una estructura inválida, valida `validation_status` y rechaza una vigencia en la que `valid_to` precede a `valid_from`.
- **AC-02-07 — Cardinalidad e identidad:** una consulta de integridad no encuentra configuraciones huérfanas, tipos inexistentes, pares duplicados ni enlaces máquina–operación que solo tengan IDs textuales sin referencia canónica.
- **AC-02-08 — Contrato y operación:** una prueba de API/contexto muestra por separado `operation_id` (`pm_process_node.node_id`), `process_version_id` y `contract_id` cuando ambos conceptos existen; `contrato.id` no se usa como `operation_id` ni como sustituto universal de operación.
- **AC-02-09 — BPM/contexto:** para una versión BPM concreta, la proyección incluye `process_id`, `process_version_id`, el `operation_id` del nodo de tipo `operation`, máquina, tipo, configuración, contrato cuando aplique y procedencia; el resultado puede reconstruirse sin HTML, SVG, CSS, coordenadas, código o nombre textual como identidad.
- **AC-02-10 — Contexto agéntico:** una prueba de contrato verifica el orden operación → tipo → máquina → configuración y confirma que cada bloque conserva sus IDs, origen y significado.
- **AC-02-11 — RCA:** un análisis causal existente puede recuperar la máquina canónica y su contexto sin alterar la cadena contrato → análisis → causa → hipótesis → evidencia/evaluación; el nuevo modelo no genera una conclusión RCA automática.
- **AC-02-12 — UI:** al seleccionar una máquina, la vista muestra cuatro bloques diferenciados y estados vacío/carga/error; no muestra parámetros permanentes dentro de la configuración ni características del tipo como si fueran específicas.
- **AC-02-13 — API y validación:** las rutas existentes o sus extensiones devuelven errores 4xx para IDs inexistentes, JSONB inválido, estados no permitidos, vigencias invertidas y duplicados; no exponen trazas internas.
- **AC-02-14 — Compatibilidad:** la regresión de los endpoints actuales de máquinas, contratos, `contrato_maquina`, proceso-modelado y RCA sigue pasando, y una respuesta ampliada mantiene los campos históricos o documenta una versión explícita; `contrato_maquina` no se usa como entidad nueva.
- **AC-02-15 — Migración idempotente:** la carga/migración de datos existente ejecutada dos veces conserva el mismo número de tipos, máquinas, configuraciones y enlaces, crea o actualiza la tabla dedicada sin duplicados y conserva sin reinterpretación destructiva los registros históricos de `contrato_maquina`.
- **AC-02-16 — Generalidad:** el mismo contrato se aplica a un fixture no BU con otro tipo y operaciones distintas sin crear esquema o repositorio especializado.
- **AC-02-17 — NC-006:** el paquete de evidencia de implementación acredita para cada máquina objetivo la identidad canónica, tipo, atributos, proceso, operación/contrato, enlaces BPM/contexto y consistencia entre PostgreSQL, API y UI; la validación humana confirma el cierre por separado.
- **AC-02-18 — AMD-02-003 alta/modificación:** una prueba unitaria y una E2E comprueban alta y modificación desde el modal, conservando el ID en PATCH, respuesta 201/200, relectura persistida y regresión de los campos existentes.
- **AC-02-19 — AMD-02-003 etapas:** una prueba unitaria valida el round-trip del JSON canónico y sus errores; una E2E crea una etapa y subetapa con controles visuales, verifica la jerarquía en detalle y confirma que no existe editor manual de JSON.
- **AC-02-20 — AMD-02-003 estados:** pruebas unitarias/API/E2E cubren `[]`, carga, fallo de lectura, fallo de guardado, nombre vacío, orden inválido, duplicados y versión no soportada, con códigos/mensajes seguros.
- **AC-02-21 — AMD-02-003 compatibilidad:** una migración idempotente deja `etapas: []` en operaciones históricas sin duplicar ni borrar datos, y los endpoints existentes siguen respondiendo con sus campos previos más el campo aditivo.

## Questions for Clarification

No quedan preguntas bloqueantes en AMD-02-003. El contrato queda sujeto a validación humana; la implementación no podrá comenzar hasta aprobar esta especificación.

## Decision Log

| Fecha | Decisión | Responsable/origen |
|---|---|---|
| 2026-08-02 | Se crea un suplemento independiente `spec_02.md`; `spec.md`, `task_plan.md`, `nc-log.md`, traza y código permanecen sin cambios. | `requirements-agent`, instrucción humana |
| 2026-08-02 | El modelo lógico de máquinas queda limitado a `machine_type`, `machine` y `machine_operation_configuration`. | Prompt de corrección |
| 2026-08-02 | `operation` sigue siendo independiente; la configuración es una relación explícita M:N, no una inferencia del contrato o nombre. | Prompt de corrección |
| 2026-08-02 | La información común vive en `machine_type`, la permanente en `machine` y la contextual en `machine_operation_configuration`. | Prompt de corrección |
| 2026-08-02 | Los campos múltiples se modelan como JSONB validado y no como tablas auxiliares. | Prompt de corrección + `data-model-management` |
| 2026-08-02 | Se mantiene la identidad canónica existente y se prohíben enlaces estructurales solo textuales en JSONB. | `NC-006`, `spec.md`, inspección de arquitectura |
| 2026-08-02 | `maquinas_tipo` y `maquina` son candidatos de reutilización por continuidad arquitectónica; la equivalencia final y el tratamiento de `contrato_maquina` quedan abiertos para decisión humana. | Inspección de `db/schema.sql` y repositorios |
| 2026-08-02 | No se introducen modelos, tablas, rutas ni repositorios BU/MACBU. | Prompt de corrección y `spec.md` |
| 2026-08-02 | La validación humana de este suplemento es un gate previo a planificación/implementación y no equivale al cierre de `NC-006`. | `requirements-agent` |
| 2026-08-02 | `AMD-02-001` (tipo B): `operation_id` es el identificador canónico del nodo BPM de tipo `operation`, preferentemente `pm_process_node.node_id`, con `process_version_id`/`pm_process_version.version_id` y `process_id` como contexto de versión/proceso. `operation` permanece independiente del modelo de máquinas. | Decisión humana nueva; `requirements-agent` |
| 2026-08-02 | `contract_id` permanece separado: el contrato puede relacionarse con el nodo/operación, pero `contract.id` no puede sustituir `operation_id`. Se elimina la pregunta previa sobre usar el contrato como identidad de operación. | Decisión humana nueva; `requirements-agent` |
| 2026-08-02 | El vínculo máquina–operación deberá persistir la versión BPM o aplicar una regla explícita de resolución; código, nombre textual y proximidad visual no sustituyen al `node_id`. La aclaración requiere validación humana antes de planificar o implementar. | Decisión humana nueva; `requirements-agent` |
| 2026-08-02 | `AMD-02-002` (tipo B): se aprueba `machine_operation_configuration` como tabla persistente dedicada. No se reutilizará `contrato_maquina` como sustituto; esta se conserva para compatibilidad histórica. La tabla dedicada tendrá `machine_id`, `operation_id = pm_process_node.node_id` para `node_type='operation'`, `process_version_id = pm_process_version.version_id`, `contract_id` opcional separado, campos específicos JSONB validados, `validation_status`, `valid_from`, `valid_to` y `UNIQUE(machine_id, process_version_id, operation_id)`. | Decisión humana; `requirements-agent` |
| 2026-08-02 | Validación humana explícita de `AMD-02-002` y de la especificación completa; el estado del documento pasa a `spec_validada`. | Programador humano |
| 2026-08-02 | `AMD-02-003` (tipo B): se incorpora la necesidad de verificar con pruebas unitarias y E2E el alta/modificación de máquina, añadir `etapas` al modelo de operación, mostrar la etapa en el detalle y editarla mediante controles estructurados sin JSON manual. La definición final de entidad propietaria y profundidad queda pendiente de la pregunta bloqueante; el documento pasa a `pendiente_aclaraciones`. | Solicitud del programador; `requirements-agent` |
| 2026-08-02 | `AMD-02-003` (tipo B) queda concretada para validación: `etapas` pertenece a la operación BPM (`pm_process_node`), se persiste dentro de `properties.etapas`, usa `schema_version=1`, admite exactamente etapas raíz y subetapas directas, y se edita exclusivamente con controles visuales del modal. El backend valida y normaliza; la UI compone el árbol y presenta errores. El estado pasa a `spec_pendiente_validacion`. | `requirements-agent`, tras inspección de código/tests y solicitud humana |
