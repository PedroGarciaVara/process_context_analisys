# Requerimiento 11 — Jerarquía multinivel para la descripción detallada de procesos

**Estado:** `identificado`
**Fecha:** 2026-07-20
**Origen:** observaciones del programador sobre `tests/test_descripcion_procesos.md`, la implementación de modelado de procesos y la validación del requerimiento 10.
**Modo de elaboración:** modo degradado autorizado; el subagente obligatorio `requirements-agent` no estaba disponible en la sesión.

## 1. Necesidad

La aplicación debe permitir describir un proceso industrial desde una visión general hasta el nivel de detalle necesario para representar cada operación, etapa, equipo, control y condición.

La jerarquía debe ser explícita, navegable, versionable y persistente. No debe depender del dibujo ni de la posición visual de los nodos.

El modelo debe evitar confundir:

- un nivel de abstracción del proceso;
- una etapa del proceso;
- un subproceso que puede descomponerse en otro grafo;
- una operación ejecutable;
- una actividad o paso detallado dentro de una operación.

## 2. Objetivo

Establecer una taxonomía única y extensible para describir procesos con niveles `nivel_0` hasta `nivel_n`, permitiendo ampliar cualquier parte del proceso sin duplicar el proceso padre ni perder la trazabilidad entre el resumen y el detalle.

## 3. Caso de uso de referencia

El proceso de referencia es la fabricación de mezclas de caucho para neumáticos:

```text
proceso_0: Fabricación de mezclas de caucho para neumáticos
├── proceso_1: Preparación de materias primas
│   ├── proceso_2: Preparación de cauchos
│   │   ├── operación: Aprovisionar cajones a RPS
│   │   ├── operación: Fabricar batch de NIP
│   │   └── operación: Trocear y talcar caucho
│   ├── proceso_2: Preparación de productos químicos
│   ├── proceso_2: Preparación de cargas reforzantes
│   ├── proceso_2: Preparación de aceites
│   └── proceso_2: Preparación de bloques de azufre
└── proceso_1: Fabricación de mezcla
    ├── operación_1: Verificar productos entrantes
    ├── operación_1: Mezclar y homogeneizar
    ├── operación_1: Enfriar en HA
    ├── operación_1: Incorporar azufre y homogeneizar en HF
    ├── operación_1: Verificar peso final
    └── operacion_1: Poner en forma, refrigerar, secar y apilar
            └── operacion_2: poner en forma
            └── operacion_2: anticolar
            └── operacion_2: refrigerar y secar
            └── operacion_2: apilado
                   └──  operacion_3: corte
                   └──  operacion_3: deteccion metal y segragacion
                   └──  operacion_3: apilado
                        └──  operacion_4: entrada paleta vacia
                        └──  operacion_4: ...
                   └──  operacion_3: pesado
                   └──  operacion_3: identificacion


```

Las preparaciones de materias primas son subprocesos independientes y paralelos; no deben representarse como una secuencia serial.

## 4. Definiciones obligatorias

### 4.1. Nivel

Un nivel (`nivel_0`, `nivel_1`, ..., `nivel_n`) expresa la profundidad de descripción o abstracción dentro de una jerarquía. `nivel_0` representa el proceso raíz o visión más general. `nivel_n` representa cualquier profundidad adicional necesaria.

El número de nivel no debe limitar artificialmente la profundidad máxima.

### 4.2. Proceso

Unidad de transformación con entradas, salidas, objetivo, alcance, versión y grafo propio. Puede ser raíz o estar vinculado como hijo de otro proceso.

### 4.3. Subproceso

Proceso hijo reutilizable o específico que se invoca desde un nodo del proceso padre. Debe conservar identidad, versión, entradas, salidas, relaciones y breadcrumbs propios.

### 4.4. Etapa

Agrupación lógica de actividades dentro de un proceso. Puede contener operaciones y subprocesos. Su finalidad es organizar el flujo y facilitar la comprensión, no sustituir al proceso hijo.

### 4.5. Operación

Acción ejecutable que transforma materiales, información o estado. Puede incluir parámetros, equipo, tiempos, temperaturas, cantidades, tolerancias, controles y resultados.

### 4.6. Detalle operativo

Descomposición opcional de una operación en pasos, controles, movimientos, mediciones o decisiones. Debe poder llegar hasta el detalle necesario sin cambiar el significado del nivel superior.

## 5. Requisitos funcionales

### RF-01 — Taxonomía explícita

El sistema deberá identificar en cada nodo o agrupación su naturaleza (`process`, `stage`, `subprocess`, `operation`, `activity`, `decision`, `measurement`, `input`, `output`, `stock` u otra tipología validada).

### RF-02 — Niveles sin límite fijo

El sistema deberá guardar el nivel numérico y la relación padre-hijo, permitiendo `nivel_0` y cualquier `nivel_n` sin limitar la profundidad a un número fijo de niveles.

### RF-03 — Separación semántica

El sistema deberá impedir que una etapa, una operación y un subproceso se traten como equivalentes. Las reglas de creación, navegación, validación y renderizado deberán conservar sus diferencias.

### RF-04 — Descomposición progresiva

El usuario deberá poder comenzar con un proceso resumido y añadir detalle posteriormente, manteniendo los identificadores, versiones, relaciones y trazabilidad del nivel superior.

### RF-05 — Navegación jerárquica

La UI deberá permitir entrar y salir de cada subproceso o nivel mediante breadcrumbs, mostrar el contexto padre y conservar el punto de retorno.

### RF-06 — Paralelismo explícito

El modelo deberá representar ramas paralelas y convergencias sin imponer una secuencia artificial. En el caso de referencia, las preparaciones de cauchos, químicos, cargas, aceites y azufre deberán converger posteriormente en fabricación de mezclas.

### RF-07 — Detalle operativo configurable

Una operación deberá poder ampliar su detalle con parámetros, unidades, tolerancias, materiales, equipos, capacidades, tiempos, temperaturas, fotografías, coordenadas, sensores, validaciones y observaciones, sin obligar a completar datos que todavía no estén disponibles.

### RF-08 — Datos pendientes trazables

Los datos aún no formalizados —recetas, CDC, MCC, NIP, lotes, reglas de blocaje, talco, HA, HF, despaletizado y producto no conforme— deberán conservarse como información pendiente/provisional y no como valores inventados.

### RF-09 — Validación estructural

La API deberá validar ciclos, referencias inexistentes, niveles incoherentes, hijos incompatibles y transiciones inválidas, permitiendo una relación padre-subproceso válida.

### RF-10 — Compatibilidad con el modelo existente

La solución deberá extender el grafo dirigido, tipado, jerárquico y versionado del requerimiento 10 sin romper los procesos, versiones, nodos, transiciones, stocks, ramas ni breadcrumbs ya persistidos.

## 6. Criterios de aceptación

- **CA-01:** Se puede crear un proceso `nivel_0` y consultar su estructura jerárquica desde la API.
- **CA-02:** Se puede crear una etapa dentro de un proceso y distinguirla de una operación y un subproceso.
- **CA-03:** Se puede ampliar un subproceso a varios niveles (`nivel_1`, `nivel_2` y al menos un nivel adicional) conservando breadcrumbs y contexto padre.
- **CA-04:** Las ramas paralelas de preparación se representan sin transiciones seriales entre preparaciones independientes.
- **CA-05:** Una operación puede almacenar detalle operativo estructurado y datos pendientes sin perder la descripción original.
- **CA-06:** La validación rechaza ciclos reales y acepta la relación válida entre proceso padre y subproceso hijo.
- **CA-07:** El render BPM muestra la jerarquía y el paralelismo sin convertir etiquetas de transiciones de secuencia en nodos semánticos.
- **CA-08:** La implementación conserva las verificaciones ya realizadas: persistencia PostgreSQL, reconstrucción de grafos, expansión de `PREP_CAUCHO`, ramas `Sí`/`No`, stock final y navegación UI.
- **CA-09:** Se añaden pruebas de dominio, API, persistencia y UI para niveles, etapas, operaciones, subprocesos, paralelismo y ampliación multinivel.
- **CA-10:** La documentación identifica qué aspectos del proceso de caucho siguen pendientes de modelado específico.

## 7. Observaciones heredadas de la validación

La prueba de descripción de procesos confirmó que el sistema ya puede representar procesos, subprocesos, nodos tipados, transiciones, stocks, decisiones y navegación jerárquica. También confirmó la corrección del render paralelo y la convergencia hacia fabricación de mezclas.

La misma prueba dejó como pendientes la formalización de recetas y tolerancias, CDC/MCC, maestro de materias primas y NIP, lotes, blocaje, parámetros de máquinas, fotografías/coordenadas, sensores y tratamiento de no conformes. Este requerimiento debe convertir esas observaciones en extensiones planificables, sin fingir que ya son entidades completas.

## 8. Fuera de alcance inicial

- Control directo de PLC o máquinas.
- Ejecución automática de órdenes de fabricación.
- Sustitución del árbol causal existente.
- Simulación avanzada u optimización matemática.
- Generación automática completa desde históricos.

## 9. Trazabilidad y siguiente paso

Este archivo es un requerimiento cliente pendiente de análisis. El siguiente paso es validarlo humanamente y, posteriormente, solicitar a `requirements-agent` o al agente autorizado la elaboración de su `spec.md`. No debe iniciarse implementación hasta disponer de especificación y plan aprobados.
