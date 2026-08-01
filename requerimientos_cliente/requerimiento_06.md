# REQ-RCA-002 - Modelo de Hipótesis Estructuradas para Descubrimiento de Capacidades Analíticas

## Objetivo

Las hipótesis representan el mecanismo mediante el cual una causa puede ser validada o descartada mediante evidencias objetivas.

En la fase inicial del proyecto RCA las hipótesis NO deberán implementarse como código, consultas SQL ni reglas Python.

El objetivo de esta fase es capturar conocimiento experto de forma homogénea y estructurada para permitir posteriormente:

* Descubrir capacidades analíticas reutilizables.
* Generar implementaciones automáticas.
* Construir catálogos de capacidades.
* Evolucionar hacia APIs y MCPs especializados.

---

# Problema a resolver

Actualmente una hipótesis suele describirse mediante texto libre.

Ejemplo:

"Comprobar si la velocidad media del motor principal ha sido inferior a 1200 rpm durante las últimas 24 horas."

Aunque un experto entiende perfectamente esta descripción, el sistema no puede:

* Compararla con otras hipótesis.
* Detectar patrones repetidos.
* Identificar capacidades reutilizables.
* Automatizar su ejecución.

Se requiere un modelo estructurado que mantenga la expresividad del experto pero permita análisis posteriores mediante LLM.

---

# Principios de diseño

## PD-001 - Captura orientada a negocio

El usuario describirá necesidades de análisis.

No deberá conocer:

* SQL.
* Python.
* APIs.
* MCP.
* Estructura técnica de datos.

---

## PD-002 - Separación conocimiento / implementación

La hipótesis describe:

* Qué quiere comprobarse.
* Qué datos necesita.
* Cómo debe evaluarse.

La hipótesis NO describe:

* Cómo obtener los datos.
* Cómo calcularlos técnicamente.

---

## PD-003 - Preparación para descubrimiento de capacidades

El modelo deberá permitir que un LLM identifique posteriormente patrones comunes como:

* Medias.
* Máximos.
* Mínimos.
* Conteos.
* Duraciones.
* Tendencias.
* Correlaciones.
* Comparaciones de curvas.
* Detección de anomalías.

---

# Modelo de datos

## Tabla hypothesis

```sql
CREATE TABLE hypothesis (

    id BIGSERIAL PRIMARY KEY,

    code VARCHAR(100) UNIQUE NOT NULL,

    name VARCHAR(255) NOT NULL,

    description TEXT NOT NULL,

    business_reason TEXT,

    process_name VARCHAR(255),

    machine_name VARCHAR(255),

    asset_name VARCHAR(255),

    analysis_window VARCHAR(100),

    analysis_method VARCHAR(100),

    decision_rule TEXT,

    expected_result VARCHAR(100),

    status VARCHAR(50),

    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## Tabla hypothesis_required_data

Una hipótesis puede requerir múltiples conceptos de negocio.

```sql
CREATE TABLE hypothesis_required_data (

    id BIGSERIAL PRIMARY KEY,

    hypothesis_id BIGINT NOT NULL,

    business_data_name VARCHAR(255) NOT NULL,

    description TEXT,

    CONSTRAINT fk_hypothesis_required_data
        FOREIGN KEY(hypothesis_id)
        REFERENCES hypothesis(id)
);
```

Ejemplos:

```text
Velocidad motor principal

Temperatura cilindro

Producción obtenida

Producción objetivo

Paradas de máquina

Consumo energético
```

---

## Tabla hypothesis_expected_evidence

Permite registrar qué evidencias espera obtener el experto.

```sql
CREATE TABLE hypothesis_expected_evidence (

    id BIGSERIAL PRIMARY KEY,

    hypothesis_id BIGINT NOT NULL,

    evidence_name VARCHAR(255) NOT NULL,

    description TEXT,

    CONSTRAINT fk_hypothesis_evidence
        FOREIGN KEY(hypothesis_id)
        REFERENCES hypothesis(id)
);
```

Ejemplos:

```text
velocidad_media

temperatura_maxima

numero_paradas

duracion_total_paradas
```

---

# Valores controlados

## analysis_method

Inicialmente deberá soportar:

```text
AVG
MAX
MIN
SUM
COUNT
DURATION
TREND
CORRELATION
CURVE_COMPARISON
ANOMALY_DETECTION
CUSTOM
```

Estos valores serán utilizados posteriormente para descubrir capacidades comunes.

---

## expected_result

Inicialmente:

```text
VALIDATE_CAUSE
REJECT_CAUSE
INCONCLUSIVE
```

---

# Relación con el grafo causal

Una hipótesis continuará siendo un nodo del tipo:

```text
HYPOTHESIS
```

según el modelo definido para el Knowledge Graph.

La relación con causas continuará realizándose mediante:

```text
VERIFIED_BY
```

---

# Diseño de interfaz de usuario

## Objetivo UX

La creación de hipótesis debe poder realizarla un experto industrial sin conocimientos técnicos.

La interfaz debe parecer un formulario de análisis RCA y no una herramienta de programación.

---

# Estructura visual

La creación de hipótesis se realizará mediante un asistente de 5 bloques.

---

## Bloque 1 - Información general

Campos:

```text
Nombre de la hipótesis
Descripción de la hipótesis
Motivo de negocio
```

Ejemplo:

Nombre:
Velocidad insuficiente

Descripción:
La velocidad media del motor principal es inferior a la necesaria para mantener la producción objetivo.

Motivo:
Una reducción de velocidad provoca una disminución del caudal de producción.

````

---

## Bloque 2 - Contexto industrial

Campos:

```text
Proceso

Máquina

Activo
````

Todos opcionales.

Permiten contextualizar la hipótesis.

---

## Bloque 3 - Datos necesarios

Componente tipo lista dinámica.

Botón:

```text
+ Añadir dato necesario
```

Ejemplos:

```text
Velocidad motor principal

Producción obtenida

Producción objetivo
```

El usuario describe conceptos de negocio, no nombres de columnas.

---

## Bloque 4 - Método de análisis

Campo desplegable:

```text
Media
Máximo
Mínimo
Suma
Conteo
Duración
Tendencia
Correlación
Comparación de curvas
Detección de anomalías
Otro
```

Campo adicional:

```text
Ventana temporal
```

Ejemplos:

```text
Últimas 24 horas

Último turno

Últimos 30 días

Campaña actual
```

---

## Bloque 5 - Regla de decisión

Campo de texto libre.

Ejemplo:

```text
La hipótesis se valida si la velocidad media es inferior a 1200 rpm.
```

Campo adicional:

```text
Resultado esperado
```

Opciones:

```text
Validar causa

Descartar causa

Resultado no concluyente
```

---

# Requisitos ergonómicos

## UX-001

Todos los campos deberán mostrar ejemplos reales industriales.

---

## UX-002

La creación completa de una hipótesis no deberá requerir más de 3 minutos.

---

## UX-003

La interfaz deberá evitar terminología técnica.

No mostrar:

```text
SQL
API
Python
Capacidad
MCP
```

---

## UX-004

La interfaz deberá mostrar una vista previa final tipo ficha RCA.

---

# Evolución futura prevista

Las hipótesis creadas mediante este modelo deberán servir como entrada para procesos automáticos que permitan:

1. Agrupar hipótesis similares.
2. Descubrir capacidades repetidas.
3. Generar un catálogo corporativo de capacidades analíticas.
4. Implementar dichas capacidades en Python.
5. Exponerlas mediante API.
6. Exponerlas posteriormente mediante MCP.

---

# Resultado esperado

El sistema deberá permitir capturar conocimiento experto industrial de forma homogénea, facilitando posteriormente que un LLM descubra capacidades analíticas reutilizables sin requerir que los usuarios diseñen implementaciones técnicas desde el inicio.
