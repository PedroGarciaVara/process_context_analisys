# Especificación técnica — Requerimiento 20

**Estado:** `implementado_pendiente_validacion`  
**Fecha:** 2026-09-03  
**Provenance:** escrito en modo degradado autorizado por el programador humano; no intervino `requirements-agent`.

## Overview

El editor de Modelado de procesos debe soportar tres mutaciones estructurales
del grafo persistido: insertar una operación entre dos operaciones conectadas,
eliminar una operación con reconexión opcional y hacer confluir dos operaciones
en una operación destino. La fuente de verdad seguirá siendo el grafo BPM
persistido, no las coordenadas ni el SVG. La entrega deberá validarse con tres
escenarios E2E Playwright, uno por cada capacidad. Los códigos de procesos y
nodos serán identidades asignadas automáticamente por el backend y no se
introducirán manualmente en la UI.

## Contexto técnico observado

- La UI activa es una SPA JavaScript en `uc_bib_solv/webapp`.
- La vista afectada es `uc_bib_solv/webapp/js/views/nodes/process-modeling.js`.
- El cliente HTTP es `uc_bib_solv/webapp/js/api/process-modeling.js`.
- Las acciones se concentran en `uc_bib_solv/webapp/js/controllers/process-modeling/node-actions.js`.
- La proyección gráfica está en `uc_bib_solv/webapp/js/components/process-modeling/graph.js`.
- El boundary backend es `uc_bib_solv/modules/bpm`, con dominio, aplicación,
  HTTP y repositorios PostgreSQL ya existentes.
- No existen literalmente `uc_bib_solv/services/process_modeling_service.py` ni
  `uc_bib_solv/app/persistence/pm_process_repo.py`; sus equivalentes son
  `ProcessModelingApplication` y
  `uc_bib_solv/modules/bpm/adapters/outbound/postgres/pm_process_repo.py`.

## Alcance

### Incluido

- Inserción sobre una transición dirigida existente.
- Eliminación con elección explícita entre reconectar o no reconectar.
- Múltiples transiciones explícitas hacia una misma operación.
- Validación de referencias, versión, duplicados, ciclos y tipos.
- Persistencia atómica, UI accesible, API, pruebas unitarias, integración y E2E.

### Fuera de alcance

- Crear un nodo merge implícito o una tabla de grafo nueva.
- Rediseñar layout, fullscreen, zoom, subprocesos o ramas no afectados.
- Undo/redo general, colaboración, permisos nuevos o causalidad.

## Requisitos funcionales

### FR-20-01 — Insertar operación

1. El usuario podrá seleccionar una transición `A → B` y activar “Insertar
   operación”.
2. La UI solicitará nombre y los campos estructurales actuales de una operación;
   el código será asignado por el servidor.
3. El backend validará que la transición y sus nodos pertenecen a la misma
   versión editable y ejecutará atómicamente:
   - crear `X` como operación;
   - sustituir `A → B` por `A → X` y `X → B`;
   - conservar los metadatos compatibles de la relación original según la
     política aprobada en Gate 1.
4. Si falla una validación, no se escribirá ninguna parte de la mutación.

### FR-20-02 — Eliminar operación

1. Al solicitar el borrado, la UI informará de predecesores y sucesores directos
   y ofrecerá “Eliminar y reconectar” o “Eliminar sin reconectar”.
2. La elección formará parte del comando backend; no se resolverá con requests
   independientes desde el navegador.
3. El backend eliminará atómicamente el nodo y sus relaciones directas y, si se
   solicitó, creará las reconexiones válidas.
4. Una reconexión que produzca duplicado, auto-relación, ciclo o tipo inválido
   rechazará la mutación completa y conservará el nodo.
5. Tras el éxito se refrescará desde API, se limpiará la selección y se anunciará
   el resultado con un mensaje accesible.

### FR-20-03 — Convergencia

1. El usuario podrá crear una transición desde una segunda operación hacia una
   operación que ya tenga un predecesor.
2. El backend aceptará múltiples predecesores cuando no haya duplicado,
   auto-relación, ciclo o incompatibilidad de tipo.
3. La UI mostrará dos conectores distintos y la lista de transiciones expondrá
   ambas relaciones.
4. No se creará un nodo intermedio ni una propiedad visual para representar la
   convergencia.

### FR-20-04 — Integridad común

- Todas las mutaciones se limitarán a una versión en estado editable.
- Las referencias deberán resolver dentro del mismo proceso/versión.
- Se conservarán los datos semánticos de nodos no afectados.
- La validación de negocio vivirá en dominio/backend; el frontend solo hará
  validación inmediata de interacción y campos.

### FR-20-05 — Identidades automáticas

1. Al crear un proceso, el backend asignará el siguiente código global con el
   patrón `PROC-NNN`, ignorando cualquier código enviado por un cliente.
2. Al crear cualquier tipo de nodo, el backend asignará el siguiente código
   libre según su tipo (`OP-NNN`, `INPUT-NNN`, etc.), ignorando cualquier
   `node_code` enviado por un cliente.
3. Los códigos serán inmutables después de la creación; las actualizaciones
   solo podrán cambiar nombre, descripción y datos editables.
4. La asignación final del código de proceso se serializará en la transacción
   PostgreSQL mediante un bloqueo advisory y la restricción `UNIQUE` existente.
5. La UI mostrará los códigos como información de solo lectura cuando sea útil,
   pero no renderizará cuadros de texto para introducirlos.

## Placement y responsabilidades

### Frontend

Extender `process-modeling.js`, `node-actions.js`, el cliente API y, si procede,
`graph.js`. La UI será responsable de selección de edges, formularios,
confirmaciones, estados de carga/error/guardado, foco y mensajes accesibles. No
decidirá silenciosamente la política de reconexión ni omitirá validaciones del
backend.

### Dominio y aplicación

Extender `uc_bib_solv/modules/bpm/domain/processes/` y
`uc_bib_solv/modules/bpm/application/` con comandos/casos de uso para insertar,
eliminar/reconectar y conectar. Las reglas deberán ser independientes de Flask,
DOM, PostgreSQL y Playwright.

### HTTP y persistencia

Extender el blueprint existente
`uc_bib_solv/modules/bpm/adapters/inbound/http/process_modeling.py`, manteniendo
la base `/api/bpm`. Extender los repositorios existentes bajo
`uc_bib_solv/modules/bpm/adapters/outbound/postgres/` y el wiring actual. Las
mutaciones compuestas usarán una única transacción PostgreSQL.

El DDL seguirá en `db_management/schema.sql`. Inicialmente no se propone DDL
nuevo: la convergencia se representará como varias filas de transición con el
mismo destino. Si los constraints físicos impiden el comportamiento, deberá
reabrirse Gate 1 antes de añadir una migración.

## Modelo y contrato lógico

El contrato semántico afectado es:

```text
pm_process_node(node_id, version_id, node_type, node_code, name, description, properties)
pm_process_transition(transition_id, version_id, source_node_id, target_node_id,
                      transition_type, label, condition, properties)
```

El plan deberá confirmar los nombres físicos exactos en el DDL. No se persistirán
coordenadas ni un campo especial de merge. Los comandos lógicos serán:

```text
insert_operation_on_transition(version_id, transition_id, operation_payload)
delete_operation(node_id, reconnect: boolean)
create_transition(version_id, source_node_id, target_node_id, transition_payload)
```

## Requisitos no funcionales

- Atomicidad sin nodos o transiciones huérfanos.
- Errores JSON serializables y aptos para la UI.
- Diálogo etiquetado, foco visible, teclado y mensajes accesibles.
- Layout determinista y conectores convergentes distinguibles.
- Trazas, capturas y resumen por ejecución bajo `.playwright-artifacts/`.

## Preguntas de aclaración resueltas en Gate 1

### Q-20-01 — Reconexión con cardinalidad múltiple

Decisión aprobada: **C**. La opción “reconectar” solo estará disponible cuando
la operación tenga exactamente una entrada y una salida. Para cardinalidad
múltiple se podrá eliminar sin reconectar; el backend rechazará la reconexión
con un error accionable.

### Q-20-02 — Metadatos al dividir una transición

Decisión aprobada: copiar etiqueta, condición y metadatos compatibles en ambas
relaciones resultantes. Si un tipo concreto no admite copia, el backend deberá
rechazar la operación completa o aplicar una transformación explícita cubierta
por prueba; no se perderán silenciosamente esos datos.

### Q-20-03 — Tipos admitidos en la convergencia

Decisión aprobada: en este requerimiento la convergencia se limita a relaciones
`sequence` entre operaciones. Las relaciones `branch` quedan fuera de alcance.

## Acceptance Criteria

- **AC-20-01 / E2E-20-01:** con `OP-A → OP-B`, la UI inserta `OP-X`; tras guardar
  y recargar existen exactamente `OP-A → OP-X` y `OP-X → OP-B`, no existe la
  relación original y se conserva el nombre de `OP-X`.
- **AC-20-02 / E2E-20-02:** con `OP-A → OP-B → OP-C`, la UI muestra las dos
  opciones; al reconectar, tras guardar y recargar no existe `OP-B` y existe
  `OP-A → OP-C`. La alternativa sin reconectar se cubrirá en un fixture aislado.
- **AC-20-03 / E2E-20-03:** con `OP-A → OP-C`, el usuario crea `OP-B → OP-C`;
  tras recargar `OP-C` tiene ambos predecesores y se ven dos conectores.
- **AC-20-04:** unitarias cubren duplicado, auto-enlace, ciclo y referencia a
  otra versión.
- **AC-20-05:** integración demuestra commit o rollback total de cada mutación.
- **AC-20-06:** la recarga hidrata desde API y no solo desde estado local.
- **AC-20-07:** una acción inválida no cambia persistencia y muestra error.
- **AC-20-08:** crear un proceso o nodo sin código manual devuelve un código
  generado por backend; la UI no contiene campos editables `process_code` ni
  `node_code`, y una actualización no permite cambiar dichas identidades.

## Dependencias y riesgos

- La UI actual no tiene confirmada la selección de transiciones; puede requerir
  cambios de `graph.js`.
- El borrado actual elimina relaciones sin reconectar; no debe componerse con
  requests independientes.
- Debe auditarse que `assert_graph_consistent` permita indegree mayor que uno.
- Los E2E existentes están en `tests/e2e/*.spec.js`; no se ha confirmado un
  fixture BPM dedicado ni la disponibilidad de Chromium.

## Decision Log

| ID | Fecha | Decisión | Responsable | Estado |
|---|---|---|---|---|
| D-20-01 | 2026-09-03 | Se crea el requerimiento 20; no se reactivan los req. 10 ni 18. | Programador / Orchestrator | Confirmada |
| D-20-02 | 2026-09-03 | Se reutiliza el boundary existente `uc_bib_solv/modules/bpm` y la SPA actual. | Inspección técnica | Confirmada |
| D-20-03 | 2026-09-03 | La convergencia se representa con transiciones explícitas al mismo destino. | Orchestrator en modo degradado | Confirmada |
| D-20-04 | 2026-09-03 | Se autoriza modo degradado sin delegación para todas las fases SDD. | Programador humano | Confirmada |
| D-20-05 | 2026-09-03 | “Validar y continuar” aprueba el spec y el plan; se adopta reconexión solo para cardinalidad 1→1, copia de metadatos al dividir y convergencia `sequence` entre operaciones. | Programador humano / Orchestrator | Confirmada |
| D-20-06 | 2026-09-03 | Enmienda aprobada: códigos de proceso y nodo se generan exclusivamente en backend; se reutiliza `next_node_code`, se añade `next_process_code`, la asignación de proceso se serializa en PostgreSQL y los códigos quedan inmutables. | Programador humano / Orchestrator en modo degradado | Confirmada |

## Amendments

| ID | Fecha | Tipo | Cambio | Estado |
|---|---|---|---|---|
| AMD-20-01 | 2026-09-03 | B | Eliminar entradas manuales de códigos de proceso y nodo; generar, proteger y conservar las identidades en backend. | Implementada, pendiente Gate 3 |

## Reporte de fase

- Fase: enmienda de especificación e implementación.
- Agente obligatorio: no utilizado por autorización explícita de modo degradado.
- Skills consultadas: `requirement-doc`, `data-model-management`, `domain-logic`,
  `frontend-design`, `web-design-guidelines`, `git-workflow` y patrones de UI
  Playwright registrados en `.atl/skill-registry.md`.
- Artefactos escritos: este `spec.md`, con AMD-20-01; implementación y pruebas actualizadas.
- Próximo paso: validación humana Gate 3 contra AC-20-01..08.
