 Especificación detallada — Modelo simplificado de máquinas para RCA y contexto agéntico

## 1. Objetivo

Remodelar el modelo de máquinas utilizando únicamente tres entidades:

1. `machine_type`
2. `machine`
3. `machine_operation_configuration`

El modelo debe contener exclusivamente la información necesaria para:

- Comprender el funcionamiento genérico de una máquina.
- Diferenciar una máquina física respecto a su tipo genérico.
- Relacionar las máquinas con las operaciones del proceso.
- Proporcionar contexto estructurado a los agentes RCA.
- Identificar elementos, controles, medidas, limitaciones y diferencias relevantes.
- Evitar duplicar información común entre máquinas equivalentes.

El modelo no pretende funcionar como:

- Inventario industrial completo.
- Sistema de mantenimiento.
- CMMS.
- Registro patrimonial.
- Catálogo comercial de fabricantes y modelos.
- Sistema de gestión de ubicaciones.

---

# 2. Estructura conceptual

El contexto debe organizarse en tres niveles:

```text
machine_type
    ↓
machine
    ↓
machine_operation_configuration

Su significado es:

machine_type: definición genérica de una clase funcional de máquina.
machine: unidad física concreta y diferencias respecto al tipo genérico.
machine_operation_configuration: relación entre una máquina y una operación.

La operación continúa siendo una entidad independiente del modelo de máquinas.

La relación general es:

operation
    ↓
machine_operation_configuration
    ↓
machine
    ↓
machine_type
3. Principios de modelado
3.1 No duplicar información

La información común a todas las máquinas equivalentes debe almacenarse en:

machine_type

Las características permanentes de una máquina física concreta deben almacenarse en:

machine

La información que solamente tiene sentido para una máquina al ejecutar una operación determinada debe almacenarse en:

machine_operation_configuration
3.2 Criterio para incluir campos

Un campo debe incluirse únicamente cuando aporte valor para:

Interpretar el proceso.
Comprender el funcionamiento de la máquina.
Generar hipótesis RCA.
Identificar posibles causas.
Conocer limitaciones o diferencias.
Localizar elementos o zonas relevantes.
Identificar controles y medidas disponibles.
Construir contexto para un agente.

Los datos administrativos o patrimoniales que no aporten valor al RCA deben excluirse.

4. Entidad machine_type
4.1 Propósito

machine_type representa una clase funcional genérica de máquina.

No representa necesariamente:

Un fabricante.
Un modelo comercial.
Una familia comercial.
Una referencia de catálogo.

Representa el funcionamiento común compartido por varias máquinas físicas.

Ejemplos:

Báscula automática.
Sistema de alimentación.
Mezclador.
Transportador.
Sistema de enfriamiento.
Estación de inspección.
4.2 Campos
machine_type
- id
- name
- technology_description
- nominal_capacity
- operating_principle
- elements_zones_positions
- control_systems
- common_technical_characteristics
- common_limitations
- general_technical_description
4.3 Definición de campos
Campo	Obligatorio	Descripción
id	Sí	Identificador interno del tipo de máquina.
name	Sí	Nombre funcional y legible del tipo de máquina.
technology_description	No	Descripción corta de la tecnología o mecanismo principal utilizado.
nominal_capacity	No	Capacidad genérica de referencia cuando sea relevante para el RCA.
operating_principle	Sí	Explicación general de cómo funciona este tipo de máquina.
elements_zones_positions	No	Elementos, zonas o puestos funcionales que componen la máquina genérica.
control_systems	No	Sistemas de control genéricos utilizados por este tipo de máquina.
common_technical_characteristics	No	Características técnicas comunes a todas las máquinas de este tipo.
common_limitations	No	Limitaciones comunes que pueden afectar al funcionamiento o al RCA.
general_technical_description	Sí	Descripción técnica general del tipo de máquina.
4.4 Campos eliminados

No deben incluirse los siguientes campos:

Fabricante.
Modelo comercial.
Familia.
Interfaces.
Proveedor.
Número de serie.
Año de fabricación.
Información comercial.
4.5 Campo technology_description

Debe contener una descripción corta, no una clasificación comercial.

Ejemplos:

Pesaje gravimétrico mediante células de carga.
Mezcla interna por rotores accionados eléctricamente.
Transporte neumático de material.
4.6 Campo nominal_capacity

Debe utilizarse únicamente cuando la capacidad ayude a interpretar:

Diferencias de comportamiento.
Limitaciones.
Tiempos de ciclo.
Cantidades procesadas.
Posibles causas de pérdida de rendimiento.

Puede almacenarse como una estructura sencilla:

{
  "value": 250,
  "unit": "kg",
  "description": "Capacidad nominal por ciclo"
}

No es necesario crear una tabla independiente.

4.7 Campo elements_zones_positions

Debe describir la estructura funcional genérica de la máquina.

Ejemplo:

[
  {
    "code": "ZONE_FEED",
    "name": "Zona de alimentación",
    "type": "zone",
    "description": "Zona de entrada y preparación del material"
  },
  {
    "code": "WEIGHING_SYSTEM",
    "name": "Sistema de pesaje",
    "type": "element",
    "description": "Conjunto encargado de medir el peso"
  },
  {
    "code": "DISCHARGE_POSITION",
    "name": "Puesto de descarga",
    "type": "position",
    "description": "Punto de transferencia hacia la siguiente operación"
  }
]

No se debe crear una tabla adicional para estos elementos en esta versión.

4.8 Campo control_systems

Debe describir los sistemas de control comunes y relevantes para el RCA.

Ejemplo:

[
  {
    "name": "Control secuencial",
    "description": "Gestiona las etapas de alimentación, pesaje y descarga"
  },
  {
    "name": "Control de peso",
    "description": "Compara el peso real con el objetivo y su tolerancia"
  },
  {
    "name": "Interlocks de descarga",
    "description": "Impiden la descarga si no se cumplen las condiciones previas"
  }
]

No debe convertirse en un inventario exhaustivo de hardware.

5. Entidad machine
5.1 Propósito

machine representa una unidad física concreta dentro de la aplicación.

Ejemplos:

PSA1.
PSA2.
BA01.
BA02.

Debe contener:

Su identificación en la aplicación.
Su nombre interno.
El tipo de máquina al que pertenece.
El contrato asociado.
Su estado operativo.
Sus diferencias permanentes respecto al tipo genérico.
5.2 Campos
machine
- id
- name
- machine_type_id
- contract_id
- operational_status
- specific_description
- specific_characteristics
- specific_parameters
- specific_operating_ranges
- specific_limitations
- specific_instructions
- differences_from_machine_type
5.3 Definición de campos
Campo	Obligatorio	Descripción
id	Sí	Identificador único de la máquina dentro de la aplicación.
name	Sí	Nombre interno utilizado para identificar la máquina.
machine_type_id	Sí	Referencia al tipo genérico de máquina.
contract_id	No	Contrato asociado a la máquina.
operational_status	Sí	Estado operativo actual relevante para la investigación.
specific_description	No	Descripción funcional o técnica específica de la máquina.
specific_characteristics	No	Características particulares que la diferencian de otras máquinas del mismo tipo.
specific_parameters	No	Parámetros permanentes propios de la máquina.
specific_operating_ranges	No	Rangos generales propios de la máquina.
specific_limitations	No	Limitaciones permanentes de esta máquina.
specific_instructions	No	Instrucciones particulares aplicables a esta unidad.
differences_from_machine_type	No	Resumen explícito de las diferencias respecto al tipo genérico.
5.4 Identificación

El campo id es el identificador de la máquina dentro de la aplicación.

No es necesario añadir otro campo para:

Número de serie.
Código de activo.
Identificador de fabricante.

El campo name debe contener el nombre interno con el que la máquina es conocida en el proceso.

Ejemplo:

id: 3
name: PSA1
5.5 Estado operativo

Se mantiene un único campo:

operational_status

Valores orientativos:

ready
running
stopped
degraded
unavailable
unknown

No es necesario un campo adicional:

active

El estado operativo aporta suficiente contexto para RCA.

5.6 Campos eliminados

No deben incluirse:

Número de serie.
Planta.
Línea.
Área.
Ubicación.
Año de fabricación.
Año de instalación.
Proveedor.
Activa o inactiva.
Fecha de alta.
Observaciones.

El nombre interno ya contiene o permite interpretar el contexto organizativo necesario para la aplicación.

5.7 Características específicas

Los campos específicos deben almacenar exclusivamente diferencias respecto a machine_type.

Ejemplo de descripción genérica
El tipo de máquina utiliza un sistema de pesaje gravimétrico con validación
automática de tolerancia.
Ejemplo de descripción específica
BA01 utiliza una versión anterior del control de peso y requiere un tiempo
de estabilización superior al resto de básculas.

No se debe copiar en machine toda la descripción de machine_type.

5.8 Parámetros específicos

machine.specific_parameters debe contener parámetros permanentes de la máquina.

Ejemplo:

[
  {
    "name": "Tiempo de estabilización",
    "value": 10,
    "unit": "s",
    "description": "Tiempo mínimo antes de validar el peso"
  },
  {
    "name": "Número máximo de correcciones",
    "value": 3,
    "unit": null,
    "description": "Intentos permitidos antes de generar error"
  }
]

No se debe crear una tabla específica de parámetros.

5.9 Rangos específicos

machine.specific_operating_ranges debe contener rangos permanentes de funcionamiento.

Ejemplo:

[
  {
    "name": "Rango de pesaje",
    "minimum": 2,
    "maximum": 250,
    "unit": "kg"
  },
  {
    "name": "Tolerancia de peso",
    "minimum": -0.5,
    "maximum": 0.5,
    "unit": "kg"
  }
]
5.10 Limitaciones específicas

Ejemplo:

[
  {
    "name": "Sensibilidad a vibraciones",
    "description": "El pesaje puede verse afectado durante la descarga de BA03"
  },
  {
    "name": "Control no redundante",
    "description": "Dispone de una única señal de confirmación de descarga"
  }
]
6. Entidad machine_operation_configuration
6.1 Propósito

machine_operation_configuration representa la relación explícita entre:

Una máquina física.
Una operación.

La entidad es necesaria para resolver una relación muchos-a-muchos:

Una operación puede ejecutarse en varias máquinas.
Una máquina puede participar en varias operaciones.

No debe duplicar las características permanentes de la máquina.

6.2 Campos
machine_operation_configuration
- id
- machine_id
- operation_id
- specific_description
- additional_inputs
- specific_controls
- available_measurements
- specific_safety_rules
- validation_status
- valid_from
- valid_to
6.3 Definición de campos
Campo	Obligatorio	Descripción
id	Sí	Identificador interno de la relación.
machine_id	Sí	Máquina física que ejecuta la operación.
operation_id	Sí	Operación ejecutada por la máquina.
specific_description	No	Descripción de cómo participa esta máquina en la operación.
additional_inputs	No	Entradas adicionales necesarias para esta combinación.
specific_controls	No	Controles que aplican a esta máquina dentro de esta operación.
available_measurements	No	Medidas disponibles para analizar esta ejecución.
specific_safety_rules	No	Reglas de seguridad específicas de esta combinación.
validation_status	Sí	Estado de validación de la configuración.
valid_from	No	Inicio de vigencia.
valid_to	No	Fin de vigencia.
7. Justificación de machine_operation_configuration

La entidad no es redundante porque la relación entre máquina y operación debe existir aunque no tenga información específica adicional.

Ejemplo:

BA01 puede ejecutar la operación de dosificación.

Esta relación no debe deducirse:

Del contrato.
Del nombre de la máquina.
Del tipo de máquina.
De la investigación RCA activa.

Debe persistirse explícitamente.

Además, determinados datos pueden depender de la combinación máquina-operación:

Entradas adicionales.
Controles utilizados.
Medidas disponibles.
Reglas de seguridad.
Descripción específica de ejecución.
8. Información que no debe almacenarse en machine_operation_configuration

Los siguientes datos deben permanecer en machine cuando son permanentes:

Parámetros particulares.
Rangos generales de operación.
Limitaciones de la máquina.
Instrucciones particulares generales.
Diferencias respecto al tipo genérico.
Características técnicas específicas.

Por tanto, se eliminan de machine_operation_configuration:

specific_parameters
operating_ranges
applied_capacity
specific_limitations
systems_used
specific_instructions
differences_from_generic_operation
9. Regla para decidir entre machine y machine_operation_configuration
Guardar en machine

Cuando la información es válida para la máquina independientemente de la operación.

Ejemplos:

BA01 tiene un tiempo de estabilización mínimo de 10 segundos.
PSA1 no dispone de una segunda señal de confirmación.
BA03 tiene un rango máximo de 250 kg.
PSA2 utiliza una versión anterior de la lógica de control.
Guardar en machine_operation_configuration

Cuando la información solo tiene sentido dentro de una operación determinada.

Ejemplos:

En la operación de dosificación, BA01 utiliza la señal SCALE_STABLE.
En la operación de descarga, PSA1 requiere la entrada DISCHARGE_READY.
Para esta operación se encuentra disponible la medida WEIGHT_REAL.
Durante la operación de limpieza debe activarse el modo manual.
10. Campos estructurados

Para mantener únicamente tres tablas, los campos con múltiples elementos pueden almacenarse inicialmente como JSONB.

Campos JSONB de machine_type
nominal_capacity
elements_zones_positions
control_systems
common_technical_characteristics
common_limitations
Campos JSONB de machine
specific_characteristics
specific_parameters
specific_operating_ranges
specific_limitations
specific_instructions
Campos JSONB de machine_operation_configuration
additional_inputs
specific_controls
available_measurements
specific_safety_rules

Los objetos JSON deben tener estructuras definidas y validadas por la aplicación.

No se deben guardar objetos completamente libres sin esquema.

11. Modelo relacional final
machine_type
- id
- name
- technology_description
- nominal_capacity
- operating_principle
- elements_zones_positions
- control_systems
- common_technical_characteristics
- common_limitations
- general_technical_description

machine
- id
- name
- machine_type_id
- contract_id
- operational_status
- specific_description
- specific_characteristics
- specific_parameters
- specific_operating_ranges
- specific_limitations
- specific_instructions
- differences_from_machine_type

machine_operation_configuration
- id
- machine_id
- operation_id
- specific_description
- additional_inputs
- specific_controls
- available_measurements
- specific_safety_rules
- validation_status
- valid_from
- valid_to
12. Cardinalidades
machine_type 1 ─── N machine

machine N ─── 1 contract

machine N ─── N operation
        mediante machine_operation_configuration

Debe existir una restricción única:

UNIQUE(machine_id, operation_id)

Esto evita duplicar la misma relación máquina-operación.

13. Ejemplo completo
machine_type
{
  "id": 2,
  "name": "Báscula automática de dosificación",
  "technology_description": "Pesaje gravimétrico mediante células de carga",
  "nominal_capacity": {
    "value": 250,
    "unit": "kg",
    "description": "Capacidad nominal por ciclo"
  },
  "operating_principle": "Recibe la receta, alimenta los componentes, estabiliza el peso, valida la tolerancia y descarga el contenido.",
  "elements_zones_positions": [
    {
      "name": "Tolva de alimentación",
      "type": "element"
    },
    {
      "name": "Sistema de pesaje",
      "type": "zone"
    },
    {
      "name": "Puesto de descarga",
      "type": "position"
    }
  ],
  "control_systems": [
    {
      "name": "Control secuencial",
      "description": "Gestiona la secuencia de alimentación, pesaje y descarga"
    },
    {
      "name": "Control de tolerancia",
      "description": "Valida el peso real respecto al peso objetivo"
    }
  ],
  "common_technical_characteristics": [
    "Alimentación secuencial",
    "Validación automática del peso",
    "Descarga controlada"
  ],
  "common_limitations": [
    "Sensibilidad a vibraciones",
    "Necesidad de estabilización antes de validar el peso"
  ],
  "general_technical_description": "Sistema automático de dosificación utilizado para preparar cantidades controladas de componentes."
}
machine
{
  "id": 5,
  "name": "BA01",
  "machine_type_id": 2,
  "contract_id": 4,
  "operational_status": "ready",
  "specific_description": "Primera báscula del sistema de dosificación.",
  "specific_characteristics": [
    "Utiliza la primera versión del sistema de control de peso",
    "Dispone de una única señal de confirmación de descarga"
  ],
  "specific_parameters": [
    {
      "name": "Tiempo mínimo de estabilización",
      "value": 10,
      "unit": "s"
    }
  ],
  "specific_operating_ranges": [
    {
      "name": "Rango de pesaje",
      "minimum": 2,
      "maximum": 250,
      "unit": "kg"
    }
  ],
  "specific_limitations": [
    "Mayor tiempo de estabilización que BA02",
    "Posible influencia de vibraciones durante la descarga de BA03"
  ],
  "specific_instructions": [
    "Esperar la confirmación de estabilidad antes de validar el peso"
  ],
  "differences_from_machine_type": "Control de peso de primera generación y confirmación de descarga no redundante."
}
machine_operation_configuration
{
  "id": 18,
  "machine_id": 5,
  "operation_id": 7,
  "specific_description": "BA01 pesa los componentes químicos de baja cantidad dentro de la operación de dosificación.",
  "additional_inputs": [
    {
      "name": "HOPPER_AVAILABLE",
      "description": "Confirmación de disponibilidad de la tolva"
    }
  ],
  "specific_controls": [
    {
      "name": "WEIGHT_OK",
      "description": "Confirma que el peso está dentro de tolerancia"
    },
    {
      "name": "SCALE_STABLE",
      "description": "Confirma que el peso se encuentra estabilizado"
    }
  ],
  "available_measurements": [
    {
      "name": "WEIGHT_REAL",
      "description": "Peso real medido",
      "unit": "kg"
    },
    {
      "name": "STABILIZATION_TIME",
      "description": "Tiempo necesario para estabilizar el peso",
      "unit": "s"
    }
  ],
  "specific_safety_rules": [
    {
      "name": "Bloqueo de descarga",
      "description": "No permitir descarga si SCALE_STABLE es falso"
    }
  ],
  "validation_status": "validated",
  "valid_from": null,
  "valid_to": null
}
14. Información mostrada en la UI

Al seleccionar una máquina, la UI debe mostrar cuatro bloques.

14.1 Operación

Información recuperada de la operación:

Nombre.
Descripción.
Entradas.
Salidas.
Controles genéricos.
Medidas genéricas.
14.2 Tipo de máquina

Información recuperada de machine_type:

Nombre.
Tecnología.
Capacidad nominal.
Principio de funcionamiento.
Elementos, zonas y puestos.
Sistemas de control.
Características técnicas comunes.
Limitaciones comunes.
Descripción técnica general.
14.3 Máquina específica

Información recuperada de machine:

ID.
Nombre interno.
Contrato.
Estado operativo.
Descripción específica.
Características particulares.
Parámetros.
Rangos de operación.
Limitaciones.
Instrucciones.
Diferencias respecto al tipo.
14.4 Configuración máquina-operación

Información recuperada de machine_operation_configuration:

Descripción específica dentro de la operación.
Entradas adicionales.
Controles específicos.
Medidas disponibles.
Reglas de seguridad.
Estado de validación.
Vigencia.
15. Uso para contexto agéntico

El agente debe recibir el contexto en este orden:

1. Descripción de la operación.
2. Descripción del tipo de máquina.
3. Descripción de la máquina específica.
4. Configuración de la máquina para la operación.

Esto permite distinguir claramente:

Qué debe hacerse
→ operation

Cómo funciona genéricamente el equipo
→ machine_type

Qué particularidades tiene la unidad seleccionada
→ machine

Cómo participa esa unidad en la operación
→ machine_operation_configuration

El agente no debe interpretar:

El contrato como tipo de máquina.
El nombre de la máquina como descripción completa de ubicación.
Una particularidad específica como característica común.
Una medida disponible como parámetro permanente.
16. Criterios de aceptación
El modelo de máquinas contiene únicamente tres entidades.
No se crean tablas adicionales para parámetros, controles, medidas o elementos.
machine_type almacena la descripción funcional y técnica común.
machine almacena las particularidades permanentes de una unidad física.
machine_operation_configuration relaciona explícitamente máquina y operación.
El contrato se mantiene como relación de la máquina.
El contrato no se utiliza para identificar el tipo de máquina.
Se eliminan fabricante, modelo comercial y familia.
Se eliminan número de serie, planta, línea, área y ubicación.
Se eliminan años de fabricación e instalación.
Se eliminan proveedor, fecha de alta y observaciones.
No existe un campo independiente de máquina activa o inactiva.
El estado operativo se mantiene como único campo de estado.
Los parámetros y rangos permanentes se almacenan en machine.
Las limitaciones permanentes se almacenan en machine.
Los controles dependientes de la operación se almacenan en machine_operation_configuration.
Las medidas disponibles para una operación se almacenan en machine_operation_configuration.
Los elementos, zonas y puestos genéricos se almacenan en machine_type.
Los campos múltiples pueden utilizar JSONB con esquema validado.
La UI muestra separadamente operación, tipo de máquina, máquina específica y configuración máquina-operación.
Existe una restricción única para machine_id + operation_id.
Las descripciones específicas almacenan diferencias y no duplican las descripciones genéricas.