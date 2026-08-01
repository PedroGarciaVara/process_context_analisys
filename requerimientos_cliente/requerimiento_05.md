# REQ-RCA-001 - Modelo de conocimiento causal basado en grafo dirigido acíclico (DAG)

## Objetivo

La aplicación RCA no debe almacenar árboles independientes por contrato.

Debe implementarse una base de conocimiento causal corporativa reutilizable basada en un grafo dirigido acíclico (Directed Acyclic Graph - DAG), permitiendo reutilizar contratos, causas e hipótesis entre diferentes análisis e investigaciones.

Los árboles mostrados al usuario serán únicamente una representación visual de una porción del grafo.

---

# Problema a resolver

Actualmente un contrato puede tener múltiples causas.

Sin embargo, algunas de esas causas son en realidad otros contratos de nivel inferior ya definidos dentro del sistema.

Ejemplo:

```text
Contrato:
Producción diaria > 3000 piezas

├─ Tiempo ciclo < 10 s
├─ Disponibilidad > 90 %
└─ Scrap < 2 %
```

Donde:

```text
Tiempo ciclo < 10 s
```

es a su vez un contrato completo con su propio árbol causal.

Duplicar dicho árbol dentro de todos los contratos superiores generaría:

* Duplicación de conocimiento.
* Inconsistencias.
* Elevado mantenimiento.
* Pérdida de trazabilidad.

Por este motivo los contratos deben poder reutilizar otros contratos existentes.

---

# Requisitos funcionales

## RF-001 - Modelo de grafo

El sistema deberá almacenar la información mediante nodos y relaciones.

El modelo conceptual será:

```text
Nodo
  |
  +-- Nodo
  |
  +-- Nodo
```

sin restricciones de tipo entre niveles.

---

## RF-002 - Relaciones múltiples

Un nodo podrá tener:

* Ningún hijo.
* Uno o varios hijos.

Un nodo podrá tener:

* Ningún padre.
* Uno o varios padres.

Por tanto:

* No se implementará una estructura árbol tradicional.
* Se implementará una estructura de grafo.

---

## RF-003 - Reutilización de conocimiento

Un contrato podrá ser utilizado por múltiples contratos superiores.

Ejemplo:

```text
Producción > 3000
        |
        +---- Tiempo ciclo < 10s

OEE > 85%
        |
        +---- Tiempo ciclo < 10s
```

El contrato:

```text
Tiempo ciclo < 10s
```

deberá existir una única vez en la base de datos.

---

## RF-004 - Visualización en forma de árbol

La interfaz de usuario continuará mostrando una estructura jerárquica tipo árbol.

Dicha estructura será generada dinámicamente recorriendo el grafo desde el nodo seleccionado.

El usuario no visualizará la complejidad interna del grafo.

---

## RF-005 - Tipos de nodos

El sistema deberá soportar inicialmente los siguientes tipos:

### CONTRACT

Representa una condición de negocio o proceso que debe cumplirse.

Ejemplos:

* Producción > 3000 piezas/día
* Tiempo ciclo < 10 s
* Scrap < 2 %

---

### CAUSE

Representa una causa potencial.

Ejemplos:

* Velocidad insuficiente
* Avería mecánica
* Falta de operador

---

### HYPOTHESIS

Representa una hipótesis verificable.

Ejemplos:

* Velocidad media < 1200 rpm
* Existe parada > 30 min

---

### MACHINE

Representa un activo físico.

Ejemplos:

* Extrusora 01
* Línea 03

---

### PROCESS

Representa una etapa o proceso industrial.

Ejemplos:

* Mezcla
* Extrusión
* Curado

---

# Modelo de datos

## Tabla node

```sql
CREATE TABLE node (
    id BIGSERIAL PRIMARY KEY,

    node_type VARCHAR(50) NOT NULL,

    code VARCHAR(100) UNIQUE NOT NULL,

    name VARCHAR(255) NOT NULL,

    description TEXT,

    status VARCHAR(50),

    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## Tabla relationship

```sql
CREATE TABLE relationship (
    id BIGSERIAL PRIMARY KEY,

    parent_node_id BIGINT NOT NULL,
    child_node_id BIGINT NOT NULL,

    relationship_type VARCHAR(50) NOT NULL,

    weight NUMERIC(10,4),

    sequence INTEGER,

    created_at TIMESTAMP,

    CONSTRAINT fk_parent
        FOREIGN KEY(parent_node_id)
        REFERENCES node(id),

    CONSTRAINT fk_child
        FOREIGN KEY(child_node_id)
        REFERENCES node(id)
);
```

---

# Tipos de relación

Inicialmente deberán soportarse:

## DEPENDS_ON

Indica dependencia causal.

Ejemplo:

```text
Producción > 3000
        |
DEPENDS_ON
        |
Tiempo ciclo < 10s
```

---

## CAUSES

Indica causalidad directa.

Ejemplo:

```text
Tiempo ciclo < 10s
        |
CAUSES
        |
Velocidad insuficiente
```

---

## VERIFIED_BY

Relaciona causas o contratos con hipótesis verificables.

Ejemplo:

```text
Velocidad insuficiente
        |
VERIFIED_BY
        |
RPM media < 1200
```

---

## BELONGS_TO

Permite relacionar nodos con máquinas o procesos.

Ejemplo:

```text
Velocidad insuficiente
        |
BELONGS_TO
        |
Extrusora 01
```

---

# Restricciones obligatorias

## RC-001 - Grafo acíclico

No se permitirán ciclos.

No será válido:

```text
A -> B
B -> C
C -> A
```

Antes de crear una nueva relación el sistema deberá validar que no genera un ciclo.

---

## RC-002 - Reutilización obligatoria

Cuando un usuario desee añadir un hijo a un nodo, la interfaz deberá permitir:

```text
Crear causa nueva

Crear contrato nuevo

Vincular causa existente

Vincular contrato existente
```

La reutilización deberá ser la opción preferente frente a la duplicación.

---

## RC-003 - Integridad referencial

No podrá eliminarse un nodo que esté siendo utilizado por otros nodos sin validación explícita del usuario.

---

# Consultas requeridas

## Obtener hijos

```sql
SELECT *
FROM relationship
WHERE parent_node_id = :node_id;
```

---

## Obtener padres

```sql
SELECT *
FROM relationship
WHERE child_node_id = :node_id;
```

---

## Construir árbol visual

Partiendo de un nodo raíz:

```text
CONTRACT
```

el sistema deberá recorrer recursivamente todas las relaciones descendentes para generar la representación visual del árbol RCA.

---

# Resultado esperado

El sistema deberá evolucionar desde una gestión de árboles RCA independientes hacia una base de conocimiento causal industrial reutilizable, donde contratos, causas e hipótesis puedan ser compartidos por múltiples análisis, manteniendo trazabilidad completa y evitando la duplicación de conocimiento.
