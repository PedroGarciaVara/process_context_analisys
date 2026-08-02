# Corrección de la integración de procesos industriales mediante agente

## Contexto

La aplicación permite introducir una descripción en lenguaje natural de un proceso industrial. Un agente interpreta esa descripción, genera una representación estructurada del proceso y guarda el resultado en PostgreSQL para su posterior visualización y consulta.

La base de datos debe funcionar como una fuente de conocimiento relacional, interpretable tanto por la aplicación como por futuros agentes.

Se han detectado dos errores conceptuales y funcionales en la integración actual.

---

# Problemas detectados

## Error 1: pérdida de las descripciones de las operaciones

El agente identifica las operaciones o etapas del proceso, pero sus descripciones no se están guardando correctamente.

Cada operación debe conservar una descripción propia que explique, como mínimo:

* Qué se hace en la operación.
* Cuál es su objetivo dentro del proceso.
* Qué transformación se produce.
* Qué entradas recibe.
* Qué salidas genera.
* Qué condiciones, parámetros o controles relevantes se mencionan.
* Qué información no ha podido determinarse.

No debe guardarse únicamente el nombre de la operación.

Ejemplo incorrecto:

```json
{
  "name": "Mezclado"
}
```

Ejemplo esperado:

```json
{
  "name": "Mezclado",
  "description": "Combinación de las materias primas hasta obtener una mezcla homogénea con la composición requerida para la etapa posterior.",
  "objective": "Obtener una mezcla uniforme.",
  "inputs": ["Materia prima A", "Materia prima B"],
  "outputs": ["Mezcla preparada"]
}
```

No es obligatorio que el modelo actual tenga exactamente estos campos, pero debe existir al menos una descripción persistente por operación. Los datos estructurados adicionales deben conservarse cuando el modelo ya los soporte.

---

## Error 2: creación de operaciones diferentes por máquina

El agente está generando operaciones a nivel de máquina aunque la descripción corresponde a un proceso general.

Esto es conceptualmente incorrecto.

Una operación industrial representa una actividad funcional genérica, independiente de la máquina concreta que la ejecuta.

Ejemplo:

```text
Operación genérica:
Extrusión
```

Puede ser ejecutada por:

```text
Extrusora 01
Extrusora 02
Extrusora 03
```

Las tres máquinas no deben generar tres operaciones distintas llamadas:

```text
Extrusión Extrusora 01
Extrusión Extrusora 02
Extrusión Extrusora 03
```

Debe existir una única operación genérica:

```text
Extrusión
```

y cada máquina debe relacionarse con ella mediante una entidad o relación específica que contenga sus particularidades.

---

# Regla de modelado obligatoria

Separar explícitamente los siguientes conceptos:

## 1. Proceso

Representa el proceso industrial general.

Ejemplos:

* Fabricación del producto X.
* Preparación de mezcla.
* Extrusión y acabado.

## 2. Operación o etapa

Representa una actividad funcional genérica del proceso.

Ejemplos:

* Dosificación.
* Mezclado.
* Calentamiento.
* Extrusión.
* Inspección.
* Embalaje.

La operación debe ser independiente de la máquina.

## 3. Máquina

Representa un activo físico que puede ejecutar una operación.

Ejemplos:

* Mezcladora M01.
* Mezcladora M02.
* Extrusora E01.

## 4. Configuración o particularidad de ejecución

Representa cómo una operación genérica se ejecuta en una máquina concreta.

Debe permitir guardar información como:

* Parámetros específicos.
* Capacidades.
* Restricciones.
* Diferencias tecnológicas.
* Secuencia particular.
* Automatismos disponibles.
* Controles adicionales.
* Año o versión de la instalación.
* Productos o materiales compatibles.
* Observaciones específicas.

La información específica de una máquina no debe incorporarse a la identidad ni a la descripción general de la operación.

---

# Cardinalidades esperadas

El modelo debe soportar:

```text
Un proceso
    tiene muchas operaciones.

Una operación
    puede pertenecer o reutilizarse en uno o varios procesos,
    según el diseño actual del sistema.

Una operación
    puede ser ejecutada por muchas máquinas.

Una máquina
    puede ejecutar una o varias operaciones.

La relación operación-máquina
    puede contener atributos y particularidades propias.
```

Por tanto, la relación entre operación y máquina es conceptualmente muchos-a-muchos.

Si el modelo actual utiliza versiones, variantes, capacidades o asignaciones, reutilizar esa entidad cuando represente correctamente esta relación. No crear una tabla duplicada sin analizar previamente el modelo existente.

---

# Comportamiento esperado del agente

El agente debe interpretar primero el nivel de abstracción solicitado por el usuario.

Cuando el usuario describe un proceso general:

1. Identificar una única secuencia de operaciones genéricas.
2. Crear una descripción funcional para cada operación.
3. Identificar las máquinas mencionadas.
4. Relacionar las máquinas con las operaciones que pueden ejecutar.
5. Guardar las particularidades de cada máquina en la relación, configuración o variante correspondiente.
6. No duplicar operaciones por la existencia de varias máquinas.
7. No incorporar el identificador de la máquina al nombre de la operación.
8. No inventar operaciones diferentes cuando solo existen diferencias de ejecución.

Solo se podrán crear operaciones diferentes cuando exista una diferencia funcional real.

Ejemplo de diferencia funcional:

```text
Corte por láser
Corte mecánico
```

Pueden ser operaciones diferentes si representan actividades, controles, entradas, salidas o transformaciones distintas.

Ejemplo que no justifica operaciones diferentes:

```text
Mezclado en Mezcladora 01
Mezclado en Mezcladora 02
```

En este caso debe mantenerse una única operación `Mezclado`, salvo que la descripción demuestre que son actividades funcionalmente diferentes.

---

# Contrato de salida del agente

Revisar el esquema estructurado que genera el agente.

La salida debe separar al menos:

```json
{
  "process": {},
  "operations": [],
  "machines": [],
  "operation_machine_assignments": [],
  "flows": []
}
```

Ejemplo conceptual:

```json
{
  "process": {
    "name": "Proceso de fabricación de producto X",
    "description": "Proceso general desde la preparación de materias primas hasta el producto final."
  },
  "operations": [
    {
      "temporary_id": "op_01",
      "name": "Mezclado",
      "description": "Combinación de las materias primas hasta obtener una mezcla homogénea.",
      "sequence": 1
    }
  ],
  "machines": [
    {
      "temporary_id": "machine_01",
      "name": "Mezcladora M01"
    },
    {
      "temporary_id": "machine_02",
      "name": "Mezcladora M02"
    }
  ],
  "operation_machine_assignments": [
    {
      "operation_ref": "op_01",
      "machine_ref": "machine_01",
      "description": "Ejecuta el mezclado mediante control manual de velocidad.",
      "specific_parameters": {}
    },
    {
      "operation_ref": "op_01",
      "machine_ref": "machine_02",
      "description": "Ejecuta el mezclado con regulación automática de velocidad y temperatura.",
      "specific_parameters": {}
    }
  ],
  "flows": []
}
```

Adaptar los nombres al dominio y a las clases existentes. No introducir este esquema literalmente si el proyecto ya dispone de entidades equivalentes.

---

# Persistencia

Revisar todo el flujo de persistencia:

```text
Texto introducido por el usuario
    → prompt del agente
    → respuesta estructurada
    → validación del esquema
    → transformación a entidades del dominio
    → repositorios o servicios
    → PostgreSQL
    → lectura desde API
    → visualización en frontend
```

Determinar en qué punto se pierden las descripciones.

Comprobar expresamente:

* Que el esquema de salida del LLM incluye `description`.
* Que el parser no elimina el campo.
* Que el DTO o modelo de validación admite el campo.
* Que el servicio de aplicación lo transmite.
* Que el ORM lo asigna.
* Que la columna de PostgreSQL existe.
* Que las operaciones de inserción y actualización guardan el valor.
* Que la API devuelve la descripción.
* Que el frontend utiliza la descripción recibida.

No aplicar un valor vacío o genérico para ocultar el problema.

Cuando el agente no pueda generar una descripción fiable, debe devolver una advertencia o un campo explícitamente incompleto, no inventar conocimiento industrial.

---

# Normalización y deduplicación

Antes de crear una operación nueva, comprobar si ya existe una operación equivalente dentro del proceso que se está importando.

La detección no debe depender solamente de igualdad literal.

Normalizar inicialmente:

* Mayúsculas y minúsculas.
* Espacios.
* Acentos cuando corresponda.
* Identificadores de máquina añadidos al nombre.
* Numeraciones sin significado funcional.

Ejemplos que deben considerarse candidatos a una misma operación:

```text
Mezclado M01
Mezclado M02
MEZCLADO
Mezclado - máquina 3
```

La normalización debe proponer:

```text
Mezclado
```

No realizar fusiones automáticas cuando pueda existir una diferencia funcional real. En casos ambiguos, devolver una advertencia de revisión.

La identidad de una operación no puede depender del identificador de la máquina.

---

# Cambios requeridos

## Fase 1: análisis

Antes de modificar código:

1. Localizar el prompt de extracción o integración de procesos.
2. Localizar el esquema JSON, DTO, Pydantic model o contrato equivalente.
3. Identificar los modelos de dominio relacionados con:

   * proceso;
   * operación o etapa;
   * máquina;
   * relación operación-máquina;
   * descripción;
   * secuencia y flujos.
4. Localizar el servicio encargado de persistir el resultado del agente.
5. Localizar las tablas y migraciones correspondientes.
6. Localizar los endpoints y componentes del frontend que muestran el proceso.
7. Explicar la causa concreta de cada uno de los dos errores.

No modificar el modelo de datos antes de comprobar si ya existe una entidad adecuada para representar las particularidades por máquina.

## Fase 2: implementación

Aplicar los cambios mínimos coherentes en todas las capas afectadas:

* Prompt o instrucciones del agente.
* Contrato estructurado de salida.
* Validación.
* Transformación a objetos del dominio.
* Persistencia.
* Consultas.
* API.
* Frontend, cuando sea necesario.
* Migraciones, solo si son necesarias.
* Pruebas.

Evitar solucionar el problema únicamente mediante instrucciones textuales al LLM si el modelo de datos o la persistencia continúan siendo incorrectos.

## Fase 3: datos ya existentes

Analizar si existen operaciones duplicadas por máquina en la base de datos actual.

Preparar una estrategia segura para:

1. Detectar grupos candidatos a duplicado.
2. Identificar la operación genérica.
3. Conservar todas las relaciones y descripciones específicas.
4. Mover las particularidades de cada máquina a la relación o configuración correspondiente.
5. Evitar pérdida de trazabilidad.
6. No fusionar automáticamente registros ambiguos.

No ejecutar migraciones destructivas sobre datos existentes sin dejar una migración reproducible y pruebas de integridad.

---

# Casos de prueba obligatorios

## Caso 1: dos máquinas ejecutan la misma operación

Entrada conceptual:

```text
El proceso comienza con el mezclado de las materias primas.
El mezclado puede realizarse en la Mezcladora M01 o en la Mezcladora M02.
La M01 dispone de control manual.
La M02 regula automáticamente la velocidad y la temperatura.
Después, la mezcla pasa a extrusión.
```

Resultado esperado:

```text
Operaciones:
1. Mezclado
2. Extrusión

Máquinas:
- Mezcladora M01
- Mezcladora M02

Relaciones:
- Mezclado → M01, particularidad: control manual.
- Mezclado → M02, particularidad: regulación automática de velocidad y temperatura.
```

Debe existir una única operación `Mezclado`.

La operación `Mezclado` debe tener una descripción funcional persistida.

---

## Caso 2: máquinas diferentes en operaciones diferentes

Entrada conceptual:

```text
La dosificación se realiza en el dosificador D01.
El mezclado se realiza en la mezcladora M01.
```

Resultado esperado:

```text
Operaciones:
- Dosificación
- Mezclado

Máquinas:
- D01
- M01
```

No deben fusionarse operaciones funcionalmente diferentes.

---

## Caso 3: misma operación con diferencias tecnológicas

Entrada conceptual:

```text
La extrusión puede ejecutarse en E01 o E02.
E01 requiere ajuste manual de presión.
E02 dispone de regulación automática.
```

Resultado esperado:

```text
Una única operación:
- Extrusión

Dos configuraciones o relaciones:
- Extrusión/E01: ajuste manual.
- Extrusión/E02: regulación automática.
```

---

## Caso 4: descripción obligatoria

Para cada operación generada, verificar que:

```text
description IS NOT NULL
AND trim(description) <> ''
```

La prueba debe comprobar el resultado guardado en la base de datos, no solamente la respuesta del agente.

---

## Caso 5: actualización idempotente

Importar dos veces la misma descripción.

Resultado esperado:

* No se duplican las operaciones.
* No se duplican las máquinas.
* No se duplican las relaciones.
* Se mantienen las descripciones.
* Las actualizaciones controladas no eliminan información previa.

---

## Caso 6: ambigüedad

Entrada conceptual:

```text
La máquina M01 realiza un tratamiento especial.
La máquina M02 realiza el tratamiento normal.
```

Si no existe suficiente información para determinar si son la misma operación o dos operaciones diferentes:

* No inventar la clasificación.
* Marcar el elemento para revisión.
* Mantener el texto original como evidencia.
* Informar de la ambigüedad.

---

# Criterios de aceptación

La corrección se considerará terminada cuando:

1. Todas las operaciones importadas tengan una descripción persistida y recuperable.
2. Una misma operación general no se duplique por cada máquina.
3. Las particularidades de las máquinas se almacenen fuera de la definición genérica de la operación.
4. El nombre de una operación no incluya automáticamente nombres o códigos de máquina.
5. La secuencia del proceso se construya mediante operaciones genéricas.
6. Las máquinas puedan relacionarse con una o varias operaciones.
7. Las diferencias funcionales reales sigan pudiendo crear operaciones distintas.
8. La importación repetida sea idempotente.
9. Existan pruebas unitarias y de integración para los casos anteriores.
10. Las pruebas comprueben los datos realmente persistidos en PostgreSQL.
11. No se pierdan relaciones ni datos existentes.
12. La interfaz muestre la descripción general de la operación y, de forma separada, las particularidades de cada máquina.

---

# Entrega requerida

Al finalizar, presentar:

1. Diagnóstico de la causa raíz de cada error.
2. Archivos modificados.
3. Cambios realizados por capa.
4. Decisiones sobre el modelo de dominio.
5. Migraciones creadas.
6. Pruebas añadidas.
7. Resultado de las pruebas.
8. Ejemplo del JSON generado antes y después.
9. Ejemplo de los registros persistidos.
10. Riesgos o ambigüedades pendientes.

No limitarse a describir una solución. Inspeccionar el repositorio, implementar los cambios y ejecutar las pruebas disponibles.
