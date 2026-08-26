# Requerimiento y especificación funcional y técnica  
## Aplicación web para modelado jerárquico de procesos industriales

**Versión:** 1.0  
**Estado:** Borrador inicial  
**Backend:** Python  
**Base de datos:** PostgreSQL  
**Frontend:** JavaScript puro  
**Tipo de aplicación:** Web  
**Modelo principal:** Base relacional con estructura de grafo dirigida, tipada, jerárquica y versionada

---

# 1. Propósito

El objetivo de la aplicación es permitir la creación, edición, consulta, versionado y explotación de procesos industriales mediante diagramas simbólicos.

La aplicación deberá representar los procesos desde niveles generales, como una cadena de valor o un esquema SIPOC, hasta niveles detallados de operaciones, verificaciones, mediciones, decisiones, transportes, stocks y subprocesos.

La fuente principal de conocimiento no será el dibujo ni el archivo gráfico generado por el editor. La fuente de verdad será un modelo relacional almacenado en PostgreSQL, diseñado como un grafo dirigido y tipado.

Este modelo deberá permitir que:

- una persona comprenda visualmente el proceso;
- una aplicación reconstruya el diagrama;
- un agente de inteligencia artificial interprete el proceso sin analizar imágenes;
- puedan consultarse entradas, salidas, secuencias, verificaciones, medidas, condiciones y rutas NOK;
- se diferencie el proceso industrial abstracto de su implementación concreta en una máquina;
- se resuelvan variantes por producto, materia prima, tecnología, modelo de máquina o máquina física;
- se conserve la trazabilidad del conocimiento general, las especializaciones y las excepciones.

---

# 2. Principios arquitectónicos

## 2.1. La base relacional es la fuente de conocimiento

El sistema no deberá depender de las coordenadas del diagrama para interpretar el proceso.

La secuencia entre operaciones deberá guardarse mediante relaciones explícitas entre nodos.

La aplicación deberá separar:

1. el modelo semántico industrial;
2. el modelo gráfico;
3. las reglas de especialización;
4. la configuración física de las máquinas;
5. las versiones del conocimiento.

La posición visual de un nodo podrá modificarse sin alterar el significado del proceso.

---

## 2.2. El proceso industrial es independiente de la máquina

Un proceso industrial representa qué transformación debe producirse y qué condiciones deben cumplirse.

La máquina representa cómo se implementa ese proceso en un activo físico concreto.

Ejemplo:

```text
Proceso industrial canónico:
Mezclado

Implementación antigua:
Carga manual + control visual + lectura manual de temperatura

Implementación moderna:
Dosificación automática + PLC + sensores + registro en PI
```

Ambas implementaciones deberán relacionarse con el mismo proceso canónico.

---

## 2.3. No duplicar procesos completos por máquina

No deberá crearse una copia completa del proceso para cada máquina.

Las diferencias deberán expresarse mediante:

- variantes;
- implementaciones técnicas;
- requisitos de capacidades;
- bindings de parámetros;
- modificaciones u overrides;
- excepciones específicas de máquina.

---

## 2.4. Resolución de general a específico

El sistema deberá resolver el proceso ejecutable combinando distintas capas:

```text
Proceso canónico
    +
Variante de producto o materia prima
    +
Implementación técnica
    +
Configuración del modelo de máquina
    +
Configuración de la máquina concreta
    +
Receta u orden de fabricación
    =
Proceso resuelto
```

Cada elemento del proceso resuelto deberá conservar la procedencia de la información utilizada.

---

## 2.5. Navegación jerárquica

Una operación podrá contener un subproceso.

La ampliación no deberá implementarse únicamente como zoom gráfico.

Cada subproceso deberá ser un proceso estructurado con su propio grafo, versión, entradas, salidas y reglas.

Ejemplo:

```text
Fabricación
└── Preparación
    └── Mezclado
        ├── Carga
        ├── Agitación
        ├── Control de temperatura
        └── Descarga
```

La interfaz deberá permitir navegar mediante breadcrumbs:

```text
Fabricación > Preparación > Mezclado > Control de temperatura
```

---

# 3. Alcance funcional

La primera versión deberá incluir:

- creación de procesos;
- creación de versiones;
- editor gráfico;
- nodos industriales tipados;
- conexiones y secuencias;
- subprocesos;
- entradas y salidas;
- operaciones;
- decisiones;
- verificaciones;
- mediciones;
- stocks;
- transportes;
- variantes;
- implementaciones técnicas;
- máquinas;
- capacidades;
- parámetros;
- resolución de procesos;
- validación;
- consulta por agentes;
- exportación estructurada;
- auditoría básica.

Quedan fuera de la primera versión:

- ejecución automática del proceso industrial;
- control directo de PLC;
- simulación avanzada de capacidad;
- optimización matemática;
- integración bidireccional con sistemas MES;
- minería automática de procesos;
- generación automática completa desde históricos;
- edición colaborativa simultánea en tiempo real.

---

# 4. Niveles de abstracción

El sistema deberá soportar al menos los siguientes niveles.

| Nivel | Tipo | Descripción |
|---|---|---|
| 0 | Cadena de valor | Representación general del flujo de producción |
| 1 | Macroproceso | Agrupación funcional de procesos |
| 2 | Proceso canónico | Definición industrial independiente de máquinas |
| 3 | Variante | Especialización por producto, materia prima o contexto |
| 4 | Implementación técnica | Implementación por tecnología, modelo o generación |
| 5 | Configuración física | Adaptación de una máquina concreta |
| 6 | Proceso resuelto | Resultado final para un contexto de ejecución |

Los niveles 0 a 2 representarán conocimiento general.

Los niveles 3 a 5 representarán especialización.

El nivel 6 será un resultado calculado y no deberá sustituir a las fuentes originales.

---

# 5. Modelo conceptual

## 5.1. Entidades principales

El dominio deberá diferenciar al menos las siguientes entidades:

- proceso;
- versión de proceso;
- nodo;
- transición;
- operación;
- decisión;
- verificación;
- medición;
- parámetro;
- material;
- producto;
- flujo de material o información;
- subproceso;
- variante;
- regla de aplicabilidad;
- implementación técnica;
- override;
- clase de equipo;
- modelo de equipo;
- equipo físico;
- capacidad;
- sistema de control;
- binding de parámetro;
- diagrama;
- nodo visual;
- conexión visual;
- usuario;
- auditoría.

---

## 5.2. Tipos de nodo

La primera versión deberá soportar:

| Código | Tipo | Uso |
|---|---|---|
| `input` | Entrada | Inicio material, información, energía o señal |
| `output` | Salida | Resultado del proceso |
| `operation` | Operación | Transformación o acción |
| `subprocess` | Subproceso | Operación con detalle interno |
| `decision` | Decisión | Evaluación con varias salidas |
| `verification` | Verificación | Comprobación de una condición |
| `measurement` | Medición | Obtención de un valor |
| `stock` | Stock | Almacenamiento o espera de producto |
| `transport` | Transporte | Movimiento de producto |
| `delay` | Espera | Espera planificada o no planificada |
| `event` | Evento | Suceso que inicia o modifica el flujo |
| `document` | Documento | Instrucción, registro o evidencia |

---

## 5.3. Relaciones principales

La base deberá representar relaciones tipadas.

Ejemplos:

- `contains`;
- `precedes`;
- `specializes`;
- `implements`;
- `instance_of`;
- `applies_to`;
- `consumes`;
- `produces`;
- `modifies`;
- `measures`;
- `verifies`;
- `requires`;
- `overrides`;
- `replaces`;
- `uses_system`;
- `has_capability`;
- `executed_on`;
- `located_in`;
- `binds_to`;
- `has_child_process`.

Las relaciones deberán almacenarse mediante claves foráneas y tipos controlados.

---

# 6. Modelo relacional propuesto

## 6.1. Tabla `bpm_process`

Representa el proceso canónico.

```sql
CREATE TABLE bpm_process (
    process_id UUID PRIMARY KEY,
    process_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objective TEXT,
    scope TEXT,
    abstraction_level INTEGER NOT NULL,
    parent_process_id UUID NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_process_parent
        FOREIGN KEY (parent_process_id)
        REFERENCES bpm_process(process_id)
);
```

---

## 6.2. Tabla `process_version`

```sql
CREATE TABLE process_version (
    process_version_id UUID PRIMARY KEY,
    process_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL,
    change_description TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    UNIQUE (process_id, version_number),
    FOREIGN KEY (process_id)
        REFERENCES bpm_process(process_id)
);
```

Estados permitidos:

- `draft`;
- `review`;
- `approved`;
- `published`;
- `obsolete`.

---

## 6.3. Tabla `process_node`

```sql
CREATE TABLE process_node (
    node_id UUID PRIMARY KEY,
    process_version_id UUID NOT NULL,
    node_code VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    semantic_code VARCHAR(150),
    child_process_id UUID,
    responsible_role_id UUID,
    properties_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE (process_version_id, node_code),
    FOREIGN KEY (process_version_id)
        REFERENCES process_version(process_version_id),
    FOREIGN KEY (child_process_id)
        REFERENCES bpm_process(process_id)
);
```

---

## 6.4. Tabla `process_transition`

La secuencia deberá depender de esta tabla y no de las coordenadas visuales.

```sql
CREATE TABLE process_transition (
    transition_id UUID PRIMARY KEY,
    process_version_id UUID NOT NULL,
    source_node_id UUID NOT NULL,
    target_node_id UUID NOT NULL,
    transition_type VARCHAR(50) NOT NULL,
    label VARCHAR(255),
    condition_expression TEXT,
    condition_language VARCHAR(50),
    condition_description TEXT,
    priority INTEGER,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    properties_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    FOREIGN KEY (process_version_id)
        REFERENCES process_version(process_version_id),
    FOREIGN KEY (source_node_id)
        REFERENCES process_node(node_id),
    FOREIGN KEY (target_node_id)
        REFERENCES process_node(node_id)
);
```

---

## 6.5. Tabla `operation_definition`

```sql
CREATE TABLE operation_definition (
    node_id UUID PRIMARY KEY,
    operation_type VARCHAR(100),
    instruction TEXT,
    expected_duration_seconds INTEGER,
    minimum_duration_seconds INTEGER,
    maximum_duration_seconds INTEGER,
    execution_mode VARCHAR(50),
    automation_level VARCHAR(50),
    completion_criterion TEXT,
    failure_behavior TEXT,
    FOREIGN KEY (node_id)
        REFERENCES process_node(node_id)
);
```

---

## 6.6. Tabla `verification_definition`

```sql
CREATE TABLE verification_definition (
    node_id UUID PRIMARY KEY,
    verification_type VARCHAR(100) NOT NULL,
    method TEXT,
    acceptance_expression TEXT,
    expression_language VARCHAR(50),
    sampling_plan TEXT,
    required_evidence TEXT,
    FOREIGN KEY (node_id)
        REFERENCES process_node(node_id)
);
```

---

## 6.7. Tabla `parameter_definition`

```sql
CREATE TABLE parameter_definition (
    parameter_id UUID PRIMARY KEY,
    parameter_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_type VARCHAR(50) NOT NULL,
    unit VARCHAR(50),
    source_type VARCHAR(50),
    semantic_definition TEXT,
    properties_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

---

## 6.8. Tabla `node_measurement`

```sql
CREATE TABLE node_measurement (
    node_measurement_id UUID PRIMARY KEY,
    node_id UUID NOT NULL,
    parameter_id UUID NOT NULL,
    measurement_role VARCHAR(50),
    target_value NUMERIC,
    lower_limit NUMERIC,
    upper_limit NUMERIC,
    warning_lower_limit NUMERIC,
    warning_upper_limit NUMERIC,
    expression TEXT,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    frequency_type VARCHAR(50),
    frequency_value VARCHAR(100),
    FOREIGN KEY (node_id)
        REFERENCES process_node(node_id),
    FOREIGN KEY (parameter_id)
        REFERENCES parameter_definition(parameter_id)
);
```

---

## 6.9. Tabla `process_item`

```sql
CREATE TABLE process_item (
    item_id UUID PRIMARY KEY,
    item_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    properties_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

Tipos iniciales:

- `raw_material`;
- `intermediate_product`;
- `finished_product`;
- `information`;
- `document`;
- `energy`;
- `utility`;
- `signal`;
- `waste`.

---

## 6.10. Tabla `node_item_flow`

```sql
CREATE TABLE node_item_flow (
    node_item_flow_id UUID PRIMARY KEY,
    node_id UUID NOT NULL,
    item_id UUID NOT NULL,
    flow_direction VARCHAR(50) NOT NULL,
    quantity_expression TEXT,
    unit VARCHAR(50),
    required BOOLEAN NOT NULL DEFAULT TRUE,
    state_before TEXT,
    state_after TEXT,
    FOREIGN KEY (node_id)
        REFERENCES process_node(node_id),
    FOREIGN KEY (item_id)
        REFERENCES process_item(item_id)
);
```

---

# 7. Variantes de proceso

## 7.1. Tabla `process_variant`

```sql
CREATE TABLE process_variant (
    variant_id UUID PRIMARY KEY,
    base_process_id UUID NOT NULL,
    variant_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL,
    FOREIGN KEY (base_process_id)
        REFERENCES bpm_process(process_id)
);
```

---

## 7.2. Tabla `variant_applicability`

```sql
CREATE TABLE variant_applicability (
    applicability_id UUID PRIMARY KEY,
    variant_id UUID NOT NULL,
    subject_type VARCHAR(50) NOT NULL,
    subject_id UUID,
    condition_expression TEXT,
    condition_language VARCHAR(50),
    priority INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (variant_id)
        REFERENCES process_variant(variant_id)
);
```

`subject_type` podrá tomar valores como:

- `product`;
- `product_family`;
- `material`;
- `material_family`;
- `recipe`;
- `production_order`;
- `site`.

---

# 8. Equipos y máquinas

## 8.1. Tabla `equipment_class`

```sql
CREATE TABLE equipment_class (
    equipment_class_id UUID PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT
);
```

---

## 8.2. Tabla `equipment_model`

```sql
CREATE TABLE equipment_model (
    equipment_model_id UUID PRIMARY KEY,
    equipment_class_id UUID NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    generation VARCHAR(100),
    technology VARCHAR(255),
    valid_from_year INTEGER,
    valid_to_year INTEGER,
    FOREIGN KEY (equipment_class_id)
        REFERENCES equipment_class(equipment_class_id)
);
```

---

## 8.3. Tabla `equipment`

```sql
CREATE TABLE equipment (
    equipment_id UUID PRIMARY KEY,
    equipment_model_id UUID NOT NULL,
    equipment_code VARCHAR(100) UNIQUE NOT NULL,
    serial_number VARCHAR(150),
    installation_year INTEGER,
    site_id UUID,
    area_id UUID,
    line_id UUID,
    status VARCHAR(30) NOT NULL,
    properties_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    FOREIGN KEY (equipment_model_id)
        REFERENCES equipment_model(equipment_model_id)
);
```

---

## 8.4. Tabla `capability`

```sql
CREATE TABLE capability (
    capability_id UUID PRIMARY KEY,
    capability_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_type VARCHAR(50) NOT NULL,
    unit VARCHAR(50)
);
```

---

## 8.5. Tabla `equipment_capability`

```sql
CREATE TABLE equipment_capability (
    equipment_capability_id UUID PRIMARY KEY,
    equipment_id UUID NOT NULL,
    capability_id UUID NOT NULL,
    value_numeric NUMERIC,
    value_text TEXT,
    value_boolean BOOLEAN,
    unit VARCHAR(50),
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    FOREIGN KEY (equipment_id)
        REFERENCES equipment(equipment_id),
    FOREIGN KEY (capability_id)
        REFERENCES capability(capability_id)
);
```

---

## 8.6. Tabla `operation_capability_requirement`

```sql
CREATE TABLE operation_capability_requirement (
    requirement_id UUID PRIMARY KEY,
    node_id UUID NOT NULL,
    capability_id UUID NOT NULL,
    comparison_operator VARCHAR(10),
    required_numeric NUMERIC,
    required_text TEXT,
    required_boolean BOOLEAN,
    unit VARCHAR(50),
    mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (node_id)
        REFERENCES process_node(node_id),
    FOREIGN KEY (capability_id)
        REFERENCES capability(capability_id)
);
```

---

# 9. Implementaciones técnicas

## 9.1. Tabla `process_implementation`

```sql
CREATE TABLE process_implementation (
    implementation_id UUID PRIMARY KEY,
    process_id UUID NOT NULL,
    implementation_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    equipment_class_id UUID,
    equipment_model_id UUID,
    control_system_type VARCHAR(100),
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL,
    FOREIGN KEY (process_id)
        REFERENCES bpm_process(process_id),
    FOREIGN KEY (equipment_class_id)
        REFERENCES equipment_class(equipment_class_id),
    FOREIGN KEY (equipment_model_id)
        REFERENCES equipment_model(equipment_model_id)
);
```

---

## 9.2. Tabla `operation_implementation`

```sql
CREATE TABLE operation_implementation (
    operation_implementation_id UUID PRIMARY KEY,
    canonical_node_id UUID NOT NULL,
    implementation_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    instruction TEXT,
    execution_mode VARCHAR(50),
    control_system_id UUID,
    equipment_resource_id UUID,
    properties_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    FOREIGN KEY (canonical_node_id)
        REFERENCES process_node(node_id),
    FOREIGN KEY (implementation_id)
        REFERENCES process_implementation(implementation_id)
);
```

---

# 10. Overrides y especializaciones

## 10.1. Tabla `process_override`

```sql
CREATE TABLE process_override (
    override_id UUID PRIMARY KEY,
    scope_type VARCHAR(50) NOT NULL,
    scope_id UUID NOT NULL,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id UUID NOT NULL,
    override_type VARCHAR(50) NOT NULL,
    property_path VARCHAR(255),
    value_json JSONB,
    reason TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ
);
```

Tipos de ámbito:

- `variant`;
- `equipment_class`;
- `equipment_model`;
- `equipment`;
- `site`;
- `recipe`;
- `production_order`.

Tipos de modificación:

- `replace_property`;
- `disable_node`;
- `enable_node`;
- `insert_node`;
- `replace_node`;
- `replace_transition`;
- `replace_condition`;
- `add_measurement`;
- `remove_measurement`;
- `replace_measurement_limit`;
- `add_capability_requirement`;
- `remove_capability_requirement`.

Cada override deberá incluir:

- origen;
- motivo;
- prioridad;
- vigencia;
- entidad objetivo;
- valor anterior;
- valor nuevo;
- usuario creador;
- fecha.

---

# 11. Bindings de parámetros físicos

El parámetro industrial deberá ser independiente del tag concreto utilizado por cada máquina.

Ejemplo:

```text
Parámetro semántico:
Temperatura de producto

MX-01:
DB12.DBD20

MX-05:
PI-AF: Mezclador05|Product Temperature

MX-08:
OPC-UA: ns=4;s=MX08.Temp.Product
```

## Tabla `equipment_parameter_binding`

```sql
CREATE TABLE equipment_parameter_binding (
    binding_id UUID PRIMARY KEY,
    equipment_id UUID NOT NULL,
    parameter_id UUID NOT NULL,
    source_system_id UUID,
    source_reference TEXT NOT NULL,
    data_type VARCHAR(50),
    conversion_expression TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    FOREIGN KEY (equipment_id)
        REFERENCES equipment(equipment_id),
    FOREIGN KEY (parameter_id)
        REFERENCES parameter_definition(parameter_id)
);
```

---

# 12. Modelo visual

El modelo visual deberá mantenerse separado del modelo semántico.

## 12.1. Tabla `diagram`

```sql
CREATE TABLE diagram (
    diagram_id UUID PRIMARY KEY,
    process_version_id UUID NOT NULL,
    diagram_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    viewport_x NUMERIC,
    viewport_y NUMERIC,
    zoom NUMERIC,
    layout_version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (process_version_id)
        REFERENCES process_version(process_version_id)
);
```

---

## 12.2. Tabla `diagram_node`

```sql
CREATE TABLE diagram_node (
    diagram_node_id UUID PRIMARY KEY,
    diagram_id UUID NOT NULL,
    node_id UUID NOT NULL,
    position_x NUMERIC NOT NULL,
    position_y NUMERIC NOT NULL,
    width NUMERIC,
    height NUMERIC,
    rotation NUMERIC,
    collapsed BOOLEAN NOT NULL DEFAULT FALSE,
    style_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    FOREIGN KEY (diagram_id)
        REFERENCES diagram(diagram_id),
    FOREIGN KEY (node_id)
        REFERENCES process_node(node_id)
);
```

---

## 12.3. Tabla `diagram_edge`

```sql
CREATE TABLE diagram_edge (
    diagram_edge_id UUID PRIMARY KEY,
    diagram_id UUID NOT NULL,
    transition_id UUID NOT NULL,
    source_port VARCHAR(100),
    target_port VARCHAR(100),
    vertices_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    style_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    FOREIGN KEY (diagram_id)
        REFERENCES diagram(diagram_id),
    FOREIGN KEY (transition_id)
        REFERENCES process_transition(transition_id)
);
```

---

# 13. Editor gráfico

## 13.1. Tecnología

El frontend se implementará en JavaScript puro.

Se recomienda una librería de diagramación como JointJS Community.

La aplicación deberá evitar dependencias de React en la primera versión.

---

## 13.2. Funciones básicas

El editor deberá permitir:

- crear nodos;
- mover nodos;
- redimensionar nodos;
- eliminar nodos;
- crear conexiones;
- modificar conexiones;
- editar etiquetas;
- hacer zoom;
- desplazar el lienzo;
- ajustar a cuadrícula;
- seleccionar varios elementos;
- copiar y pegar;
- deshacer y rehacer;
- centrar el diagrama;
- mostrar minimapa;
- guardar automáticamente;
- validar el grafo;
- abrir subprocesos;
- volver al proceso padre;
- mostrar el origen de especializaciones.

---

## 13.3. Simbología inicial

| Tipo | Representación |
|---|---|
| Operación | Rectángulo con borde azul |
| Decisión | Rombo con borde azul |
| Stock | Doble rombo con borde rojo |
| Transporte | Línea negra con indicador rojo |
| Input | Círculo con borde verde |
| Output | Círculo con borde verde |
| Subproceso | Operación con indicador `+` |
| Medición | Símbolo específico con identificador de parámetro |
| Verificación | Símbolo específico con resultado OK/NOK |

La apariencia no deberá determinar la semántica.

Cada nodo visual deberá estar ligado a un `process_node`.

---

# 14. Backend Python

## 14.1. Responsabilidades

El backend deberá encargarse de:

- acceso a PostgreSQL;
- validación;
- control de transacciones;
- creación de versiones;
- publicación;
- auditoría;
- resolución de variantes;
- resolución de implementaciones;
- aplicación de overrides;
- verificación de capacidades;
- reconstrucción de grafos;
- generación de contratos JSON;
- búsqueda;
- exportación;
- API para agentes.

---

## 14.2. Estructura modular recomendada

```text
backend/
├── api/
│   ├── processes.py
│   ├── diagrams.py
│   ├── variants.py
│   ├── equipment.py
│   ├── resolution.py
│   └── agents.py
├── domain/
│   ├── process.py
│   ├── graph.py
│   ├── variant.py
│   ├── equipment.py
│   └── rules.py
├── services/
│   ├── process_service.py
│   ├── graph_validation_service.py
│   ├── resolution_service.py
│   ├── version_service.py
│   └── export_service.py
├── repositories/
│   ├── process_repository.py
│   ├── graph_repository.py
│   ├── equipment_repository.py
│   └── variant_repository.py
├── schemas/
│   ├── process_schema.py
│   ├── graph_schema.py
│   └── resolved_process_schema.py
└── database/
    ├── connection.py
    ├── migrations/
    └── models/
```

---

## 14.3. Framework recomendado

Se recomienda FastAPI por:

- definición clara de contratos;
- generación OpenAPI;
- validación con Pydantic;
- integración sencilla con agentes;
- tipado;
- modularidad;
- facilidad de testing.

Para persistencia se podrá utilizar:

- SQLAlchemy;
- Alembic;
- psycopg;
- Pydantic.

---

# 15. API REST inicial

## Procesos

```text
POST   /api/processes
GET    /api/processes
GET    /api/processes/{process_id}
PUT    /api/processes/{process_id}
POST   /api/processes/{process_id}/versions
GET    /api/processes/{process_id}/versions
POST   /api/processes/{process_id}/publish
```

## Nodos y transiciones

```text
POST   /api/process-versions/{version_id}/nodes
PUT    /api/nodes/{node_id}
DELETE /api/nodes/{node_id}

POST   /api/process-versions/{version_id}/transitions
PUT    /api/transitions/{transition_id}
DELETE /api/transitions/{transition_id}
```

## Diagramas

```text
GET    /api/process-versions/{version_id}/diagram
PUT    /api/process-versions/{version_id}/diagram
POST   /api/diagrams/{diagram_id}/layout
```

## Variantes

```text
POST   /api/processes/{process_id}/variants
GET    /api/processes/{process_id}/variants
PUT    /api/variants/{variant_id}
POST   /api/variants/{variant_id}/applicability
```

## Equipos

```text
POST   /api/equipment
GET    /api/equipment
GET    /api/equipment/{equipment_id}
PUT    /api/equipment/{equipment_id}
POST   /api/equipment/{equipment_id}/capabilities
```

## Resolución

```text
POST   /api/processes/{process_id}/resolve
GET    /api/resolved-processes/{resolution_id}
```

## Agentes

```text
GET /api/agent/processes/{process_id}/summary
GET /api/agent/processes/{process_id}/graph
GET /api/agent/processes/{process_id}/inputs-outputs
GET /api/agent/processes/{process_id}/measurements
GET /api/agent/processes/{process_id}/decisions
GET /api/agent/processes/{process_id}/failure-paths
GET /api/agent/processes/{process_id}/subprocesses
POST /api/agent/processes/{process_id}/resolve
```

---

# 16. Resolución del proceso

## 16.1. Entrada

```json
{
  "process_id": "uuid",
  "equipment_id": "uuid",
  "product_id": "uuid",
  "recipe_id": "uuid",
  "production_order_id": "uuid"
}
```

---

## 16.2. Algoritmo obligatorio

1. Obtener la versión publicada del proceso canónico.
2. Cargar el grafo canónico.
3. Identificar variantes aplicables.
4. Ordenar variantes por prioridad.
5. Obtener clase, modelo y máquina.
6. Obtener capacidades de la máquina.
7. Seleccionar la implementación técnica aplicable.
8. Aplicar overrides de variante.
9. Aplicar overrides de clase de equipo.
10. Aplicar overrides de modelo.
11. Aplicar overrides de máquina.
12. Aplicar overrides de receta u orden.
13. Resolver parámetros físicos.
14. Validar requisitos de capacidades.
15. Validar coherencia del grafo resultante.
16. Generar contrato estructurado.
17. Registrar la trazabilidad de resolución.

---

## 16.3. Prioridad

```text
Proceso canónico
    <
Variante
    <
Clase de equipo
    <
Modelo de equipo
    <
Equipo físico
    <
Receta
    <
Orden de producción
```

La mayor especificidad tendrá prioridad.

Los conflictos deberán detectarse y registrarse.

---

# 17. Contrato para agentes

La aplicación deberá generar un contrato estable.

```json
{
  "schema_version": "1.0",
  "process": {
    "id": "PROC-MIXING",
    "version": 4,
    "name": "Mezclado",
    "objective": "Obtener una mezcla homogénea",
    "scope": "Desde la carga hasta la descarga"
  },
  "context": {
    "product": "PRODUCT-001",
    "equipment": "MX-05",
    "recipe": "REC-103"
  },
  "resolved_from": {
    "canonical_version": "4",
    "variants": ["HIGH_VISCOSITY"],
    "implementation": "MIXER_GEN2",
    "overrides": ["OVR-MX05-002"]
  },
  "inputs": [],
  "outputs": [],
  "nodes": [],
  "transitions": [],
  "measurements": [],
  "verifications": [],
  "resources": [],
  "capability_requirements": [],
  "subprocesses": [],
  "warnings": []
}
```

Cada nodo deberá incluir:

- identificador;
- código;
- tipo;
- nombre;
- descripción;
- origen;
- inputs;
- outputs;
- operaciones;
- verificaciones;
- parámetros;
- límites;
- recursos;
- rutas de salida;
- proceso hijo;
- procedencia de la especialización.

---

# 18. Consultas mínimas para agentes

El sistema deberá poder responder:

- ¿Cuáles son las entradas del proceso?
- ¿Cuáles son sus salidas?
- ¿Cuál es la secuencia principal?
- ¿Qué operaciones contiene?
- ¿Qué verificaciones existen?
- ¿Qué medidas se toman?
- ¿Qué límites tiene cada parámetro?
- ¿Qué sucede ante un resultado NOK?
- ¿Qué máquinas pueden ejecutar el proceso?
- ¿Qué capacidades requiere?
- ¿Qué diferencias tiene una máquina concreta?
- ¿Qué variante se aplica a un producto?
- ¿Qué subprocesos contiene?
- ¿Qué pasos fueron modificados por un override?
- ¿Cuál es la fuente física de cada parámetro?
- ¿Qué elementos provienen del proceso canónico?
- ¿Qué elementos provienen de una especialización?

---

# 19. Validaciones obligatorias

## 19.1. Grafo

- al menos un input;
- al menos un output;
- ningún nodo inaccesible;
- ninguna transición sin origen;
- ninguna transición sin destino;
- ningún nodo intermedio sin salida;
- ningún subproceso inexistente;
- ausencia de recursividad jerárquica inválida;
- detección de ciclos no autorizados.

## 19.2. Decisiones

- mínimo dos salidas;
- todas las salidas con condición o salida por defecto;
- solo una salida por defecto;
- prioridad explícita cuando exista solapamiento;
- ruta NOK identificada.

## 19.3. Operaciones

- nombre;
- descripción o instrucción;
- criterio de finalización;
- inputs y outputs cuando apliquen;
- recursos obligatorios;
- comportamiento ante fallo.

## 19.4. Mediciones

- parámetro;
- tipo de dato;
- unidad;
- fuente;
- criterio de aceptación;
- límite inferior menor o igual al superior;
- acción ante valor NOK.

## 19.5. Variantes

- proceso base existente;
- regla de aplicabilidad válida;
- prioridad;
- ausencia de overrides contradictorios no resueltos;
- trazabilidad del cambio.

## 19.6. Máquinas

- clase y modelo;
- capacidades;
- bindings de parámetros;
- estado;
- vigencia;
- compatibilidad con los requisitos del proceso.

---

# 20. Versionado

No se deberán modificar versiones publicadas.

Un cambio semántico deberá generar una nueva versión.

Se consideran cambios semánticos:

- añadir o eliminar nodos;
- cambiar secuencia;
- cambiar una condición;
- cambiar un límite;
- cambiar inputs u outputs;
- cambiar una operación;
- cambiar una verificación;
- cambiar requisitos de capacidad;
- cambiar una relación con un subproceso.

Los cambios de posición, tamaño o estilo visual no deberán requerir por sí mismos una nueva versión semántica.

---

# 21. Auditoría

El sistema deberá registrar:

- usuario;
- fecha;
- entidad;
- operación;
- valor anterior;
- valor nuevo;
- versión;
- motivo;
- origen;
- identificador de sesión.

Tabla recomendada:

```sql
CREATE TABLE audit_event (
    audit_event_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL
);
```

---

# 22. Requisitos no funcionales

## 22.1. Mantenibilidad

- backend modular;
- frontend modular;
- contratos tipados;
- migraciones versionadas;
- tests automáticos;
- separación entre dominio, API y persistencia;
- ausencia de lógica industrial dentro de componentes visuales.

## 22.2. Rendimiento

- carga de un diagrama estándar en menos de 3 segundos;
- navegación entre subprocesos en menos de 2 segundos;
- guardado incremental;
- consultas indexadas;
- paginación;
- resolución de un proceso estándar en menos de 5 segundos.

## 22.3. Seguridad

- autenticación;
- autorización por roles;
- control de lectura y edición;
- parametrización de SQL;
- validación de entradas;
- bloqueo de expresiones ejecutables no autorizadas;
- auditoría;
- protección frente a inyección.

## 22.4. Escalabilidad

- procesos con al menos 1.000 nodos;
- subprocesos anidados;
- miles de máquinas;
- cientos de variantes;
- múltiples plantas;
- múltiples versiones.

---

# 23. Roles iniciales

## Administrador

- configura catálogos;
- gestiona usuarios;
- gestiona tipos;
- gestiona permisos.

## Diseñador de procesos

- crea procesos;
- edita borradores;
- crea variantes;
- define reglas.

## Experto industrial

- valida contenido;
- aprueba versiones;
- define criterios y parámetros.

## Responsable de activos

- mantiene máquinas;
- mantiene capacidades;
- mantiene bindings.

## Lector

- consulta procesos publicados.

## Agente

- accede mediante API de solo lectura;
- obtiene contratos estructurados;
- solicita resoluciones contextualizadas.

---

# 24. Casos de uso principales

## CU-01. Crear proceso canónico

El usuario crea un proceso independiente de máquinas.

## CU-02. Dibujar secuencia

El usuario añade nodos y transiciones.

## CU-03. Añadir subproceso

El usuario transforma una operación en nodo con proceso hijo.

## CU-04. Definir medición

El usuario asocia un parámetro, fuente, unidad y límites.

## CU-05. Definir decisión

El usuario crea salidas condicionadas.

## CU-06. Crear variante

El usuario crea una especialización por producto o materia prima.

## CU-07. Crear implementación técnica

El usuario define cómo una tecnología ejecuta operaciones canónicas.

## CU-08. Registrar máquina

El usuario registra clase, modelo, año y capacidades.

## CU-09. Vincular parámetros físicos

El usuario asocia parámetros semánticos con tags físicos.

## CU-10. Resolver proceso

El usuario selecciona proceso, producto y máquina.

## CU-11. Consultar diferencias

El sistema muestra qué elementos son generales y cuáles específicos.

## CU-12. Publicar versión

El sistema valida y publica.

## CU-13. Consultar mediante agente

Un agente obtiene un contrato estructurado.

---

# 25. Fases de implementación

## Fase 1. Núcleo semántico

- modelo PostgreSQL;
- procesos;
- versiones;
- nodos;
- transiciones;
- operaciones;
- parámetros;
- verificaciones;
- API básica;
- validación;
- tests.

## Fase 2. Editor gráfico

- JavaScript;
- JointJS;
- símbolos;
- conexiones;
- guardado;
- zoom;
- breadcrumbs;
- subprocesos.

## Fase 3. Equipos e implementaciones

- clases;
- modelos;
- máquinas;
- capacidades;
- implementaciones;
- bindings.

## Fase 4. Variantes y overrides

- reglas de aplicabilidad;
- prioridades;
- resolución;
- detección de conflictos.

## Fase 5. API para agentes

- contratos;
- consultas semánticas;
- resolución contextual;
- futura exposición mediante MCP.

## Fase 6. Versionado avanzado

- comparación;
- aprobación;
- impacto;
- auditoría completa.

---

# 26. Criterios de aceptación

La primera versión será aceptada cuando:

1. se pueda crear un proceso con nodos y transiciones;
2. el proceso pueda reconstruirse desde PostgreSQL;
3. la secuencia no dependa de coordenadas;
4. se pueda navegar a un subproceso;
5. se puedan definir entradas y salidas;
6. se puedan definir verificaciones y medidas;
7. se pueda definir una variante;
8. se pueda registrar una máquina;
9. se puedan definir capacidades;
10. se pueda definir una implementación técnica;
11. se pueda resolver un proceso para una máquina y producto;
12. el resultado indique la procedencia de cada modificación;
13. un agente pueda obtener el proceso mediante JSON;
14. se detecten rutas NOK;
15. se impida publicar grafos inválidos;
16. los cambios semánticos generen versiones;
17. los cambios visuales no modifiquen la semántica;
18. todos los cambios importantes queden auditados.

---

# 27. Regla final de diseño

> La aplicación debe almacenar el conocimiento industrial como un grafo relacional, tipado, jerárquico y versionado. El diagrama será una representación visual del grafo. El proceso canónico definirá qué debe ocurrir y las variantes, implementaciones, capacidades y overrides definirán cómo se ejecuta en un contexto productivo concreto.

---

# 28. Suposición tecnológica

En este documento se interpreta “frontend en Java” como **frontend en JavaScript puro**, en coherencia con una aplicación web y con el contexto técnico definido previamente.

Si se requiere realmente Java para el frontend, deberá redefinirse la arquitectura, ya que un navegador no ejecuta Java como tecnología frontend estándar.
