# Requerimiento 16 — Persistencia y UX consistente del modelo de máquinas

> **Estado:** `spec_pendiente_validacion`  
> **Gate 1:** pendiente de validación humana  
> **Fecha:** 2026-08-20  
> **Autor:** requirements-agent  
> **Provenance:** generado en modo degradado autorizado por el programador humano.  
> **Motivo de contingencia:** `requirements-agent` no pudo completar la delegación obligatoria por restricción de runtime/red.  
> **Estado de workflow:** Gate 1 pendiente de validación humana; no crear `task_plan.md`.  
> **Verificación futura:** el plan automático E2E con Playwright es obligatorio para la implementación futura.  
> **Fuente:** observaciones del programador y captura referenciada del modal Gestión de máquina

## 1. Contexto

La webapp JavaScript permite navegar por procesos, contratos, máquinas, modelado de procesos y contexto estructurado. En Gestión de máquina > Editar máquina existen campos persistidos como JSON para la máquina genérica y específica. La interfaz actual los presenta como `textarea` con JSON manual; la captura muestra especialmente Capacidad nominal, Sistemas de control, Limitaciones comunes y Campos soportados/características comunes, junto con un error de validación de Capacidad nominal.

La inspección del repositorio identifica además:

- una base de datos con tablas legacy (`proceso`, `contrato`, `maquinas_tipo`, `maquina`) y tablas de Process Modeling/graph relacionadas;
- un fixture Java que crea `Proceso fixture Java` y un grafo causal completo;
- tests de integración que crean procesos `IT GRAPH ...` y otros procesos de proceso/modelado;
- un script de limpieza que solo cubre una parte de los prefijos de Process Modeling;
- un menú específico de `maquinas_v02` que no conserva los accesos autorizados a Modelado-Procesos y Contexto;
- estado de selección en memoria que puede resetear la máquina al cambiar proceso, contrato u operación;
- un contrato backend que valida forma JSON, pero no ofrece una estrategia común de edición legible para todos los formularios y modales.

## 2. Objetivo

Conseguir que la gestión de máquinas, la navegación relacionada, la persistencia JSON y la limpieza de datos de test sean consistentes, legibles, recuperables y verificables mediante pruebas automáticas E2E con Playwright, sin dejar datos de prueba huérfanos ni romper el grafo de Process Modeling.

## 3. Actores

### Usuario autorizado de la aplicación

Puede consultar y editar máquinas, máquinas genéricas, configuraciones máquina-operación y metadatos de Process Modeling según sus permisos.

### Mantenedor/desarrollador de tests

Puede ejecutar fixtures, tests de integración y E2E; el sistema debe permitir identificar y limpiar de forma segura únicamente sus datos de prueba.

### Sistema

- DEBERÁ conservar las rutas y accesos autorizados durante la navegación.
- DEBERÁ convertir, validar, guardar y recuperar los campos estructurados sin exigir JSON manual para las operaciones normales.
- DEBERÁ rechazar payloads inválidos sin escribir cambios parciales.
- DEBERÁ limpiar fixtures y artefactos de test mediante identificadores y prefijos explícitos, nunca mediante un truncado indiscriminado en un flujo E2E.

## 4. Glosario

- **Máquina genérica / tipo de máquina**: registro de `maquinas_tipo` que describe capacidades comunes.
- **Máquina específica**: registro de `maquina` asociado a un tipo, con propiedades permanentes del activo.
- **Configuración máquina-operación**: vínculo contextual entre una máquina, una operación BPM y su versión de proceso.
- **Campo JSON**: campo cuya representación persistida es JSONB y cuyo valor puede ser objeto, lista o, cuando el contrato lo permita, nulo.
- **IT graph**: datos de integración que materializan nodos y relaciones del grafo causal.
- **Fixture Java**: datos creados por `tests/java_analysis_fixture.py`, incluyendo `Proceso fixture Java` y sus dependencias.
- **Reapertura**: cerrar o abandonar un modal/página, volver a navegar y comprobar que el valor guardado se recupera desde backend.

## 5. Alcance

### Incluido

- Limpieza segura de datos de fixtures y procesos/artefactos de test, incluyendo fixture Java, IT graph y fixtures E2E/Process Modeling identificables.
- Conservación en el menú lateral de Máquina de los accesos autorizados a `modelado-procesos` y `contexto`.
- UX legible y común para entrada de los JSON del modal Gestión de máquina.
- Conversión frontend/backend, validación de forma y reglas, persistencia y recuperación equivalente.
- Corrección de pérdida de datos de máquina genérica al salir y volver a entrar.
- Inventario y estrategia común de todos los campos JSON de formularios, modales y vistas identificados en el repositorio.
- Plan de pruebas automáticas E2E con Playwright incluido dentro del `spec.md`.

### Fuera de alcance

- No crear `task_plan.md`.
- No implementar código en este requerimiento.
- No cambiar el modelo físico, renombrar tablas ni eliminar datos de negocio.
- No sustituir el grafo de Process Modeling por otro modelo.
- No ampliar permisos: solo se conservarán accesos ya autorizados.
- No convertir las respuestas de consulta de Contexto en formularios editables si no existe una autorización funcional explícita.

## 6. Modelo de datos afectado

| Entidad / Tabla | Campos JSON relevantes | Responsabilidad observada |
|---|---|---|
| `maquinas_tipo` | `nominal_capacity`, `elements_zones_positions`, `control_systems`, `common_technical_characteristics`, `common_limitations` | Capacidades comunes de la máquina genérica; restricciones de forma en `schema.sql`. |
| `maquina` | `specific_characteristics`, `specific_parameters`, `specific_operating_ranges`, `specific_limitations`, `specific_instructions`, `differences_from_machine_type` | Propiedades específicas persistentes; restricciones de forma en `schema.sql`. |
| `machine_operation_configuration` | `additional_inputs`, `specific_controls`, `available_measurements`, `specific_safety_rules` | Datos contextuales por máquina-operación; el esquema exige listas JSON. |
| `pm_process_node` | `properties` y `properties.etapas` | Propiedades y etapas versionadas de nodos BPM. |
| `pm_node_metadata` | `metadata` | Metadatos editables del nodo, con contrato de objeto JSON. |
| `pm_context_record` | `payload`, `source`, `provenance`, `supports` | Contexto estructurado y trazabilidad; son principalmente lectura/ingesta contextual. |
| `node` / `relationship` | `metadata` | Grafo canónico y relaciones; no se deben limpiar salvo que pertenezcan a un fixture identificado. |

## 7. Historias de usuario y criterios de aceptación funcionales

### HU-1: Navegar sin perder accesos

Como usuario autorizado, quiero navegar a Máquina y seguir viendo Modelado-Procesos y Contexto en el menú lateral, para cambiar de área sin perder las capacidades disponibles.

1. CUANDO el usuario navegue a Máquina, EL SISTEMA DEBERÁ mostrar en el menú lateral los accesos autorizados a Modelado-Procesos y Contexto.
2. CUANDO el usuario seleccione uno de esos accesos, EL SISTEMA DEBERÁ navegar a la ruta correspondiente sin redirigir a Inicio ni ocultar el acceso por un cambio de selección.

### HU-2: Editar JSON sin escribir JSON manual

Como usuario de gestión de máquinas, quiero editar los datos estructurados mediante controles legibles, para poder guardar capacidades y características sin conocer la sintaxis JSON.

1. CUANDO el usuario abra Gestión de máquina, EL SISTEMA DEBERÁ presentar controles guiados o editores estructurados etiquetados para Capacidad nominal, Sistemas de control, Limitaciones comunes y Campos soportados/características comunes.
2. CUANDO el usuario añada, quite o modifique un elemento, EL SISTEMA DEBERÁ mantener una representación estructurada equivalente al contrato persistido.
3. SI un valor no cumple la forma o regla del campo, EL SISTEMA DEBERÁ mostrar el error junto al campo y no cerrar el modal como si se hubiera guardado.

### HU-3: Recuperar datos persistidos

Como usuario, quiero que una máquina genérica conserve sus datos al salir y volver a entrar, para confiar en que la edición se ha guardado.

1. CUANDO el usuario guarde una máquina y vuelva a abrir Gestión de máquina, EL SISTEMA DEBERÁ mostrar los mismos valores estructurados, incluyendo valores anidados, listas y nulos permitidos.
2. CUANDO el usuario navegue fuera de Máquina y vuelva a entrar, EL SISTEMA DEBERÁ recuperar la selección y los datos persistidos según el alcance autorizado, sin sustituirlos por un formulario vacío o por valores de otra máquina.

### HU-4: Limpiar tests sin afectar negocio

Como mantenedor de tests, quiero limpiar fixtures identificables, para repetir pruebas sin dejar residuos ni borrar datos reales.

1. CUANDO termine un test que cree datos, EL SISTEMA DE TEST DEBERÁ eliminar sus filas dependientes, nodos y relaciones asociados mediante identificadores o prefijos de test permitidos.
2. SI un identificador no coincide con la allowlist de test, EL SISTEMA DE TEST DEBERÁ abortar la limpieza sin modificar ese registro.
3. CUANDO se limpie el fixture Java o IT graph, EL SISTEMA DE TEST DEBERÁ dejar cero filas/relaciones del fixture y conservar intactos los datos no pertenecientes al fixture.

### HU-5: Estrategia común de campos JSON

Como responsable técnico, quiero un inventario común de campos JSON de todas las páginas, para evitar que cada formulario resuelva de forma diferente la entrada, validación, persistencia, salida y errores.

1. EL SISTEMA DEBERÁ documentar cada campo JSON descubierto, su ruta, dueño funcional, tipo permitido, consumidor y estrategia de edición o solo lectura.
2. CUANDO un campo JSON sea editable, EL SISTEMA DEBERÁ aplicar una conversión, validación, persistencia, reapertura y error coherentes con el resto de campos.

## 8. Requisitos no funcionales

### RNF-1: Seguridad de datos de test

La limpieza DEBERÁ ser explícita, transaccional, auditable y acotada a fixtures identificados; no DEBERÁ depender de `TRUNCATE` global durante un E2E.

### RNF-2: Accesibilidad y legibilidad

Los editores JSON DEBERÁN tener etiquetas, ayuda de formato, estado de error accesible y controles operables por teclado.

### RNF-3: Compatibilidad

La solución DEBERÁ mantener las rutas HTTP actuales y los nombres de campos persistidos salvo decisión documentada en Gate 1.

### RNF-4: Verificación reproducible

La suite Playwright DEBERÁ guardar trazas, capturas y resumen por ejecución bajo `.playwright-artifacts/` y limpiar sus propios datos.

## 9. Ambigüedades pendientes

| ID | Pregunta | Impacto | Estado |
|---|---|---|---|
| Q-16-01 | ¿La UX guiada preferida es (A) editor por filas/claves y valores con controles por tipo, (B) editor JSON con formato, ayuda y validación, o (C) combinación: controles guiados para listas/objetos conocidos y editor avanzado opcional? | Alto: cambia el diseño y los casos E2E. | `pendiente` |
| Q-16-02 | ¿La limpieza debe ejecutarse solo al finalizar cada test, o también existir como comando de recuperación manual para residuos huérfanos? | Medio: cambia el contrato operativo de scripts. | `pendiente` |
| Q-16-03 | ¿Qué roles/permisos concretos pueden ver Modelado-Procesos y Contexto desde Máquina? | Alto: cambia la matriz de navegación y las aserciones E2E. | `pendiente` |

## 10. Decisiones tomadas

| ID | Decisión | Fecha | Registrada por |
|---|---|---|---|
| D-16-01 | El perímetro frontend principal es `uc_bib_solv/webapp`; el backend operativo es `uc_bib_solv/modules/operational_modeling` con fachadas HTTP existentes. | 2026-08-20 | requirements-agent |
| D-16-02 | `db_management/schema.sql` es la fuente observada de restricciones JSONB; no se autoriza cambiar DDL en esta fase de requisitos. | 2026-08-20 | requirements-agent |
| D-16-03 | La estrategia E2E deberá cubrir navegación, edición JSON, persistencia/reapertura y limpieza segura; no se creará `task_plan.md`. | 2026-08-20 | requirements-agent |

## Versión inicial del requerimiento

- Limpiar de forma segura la base de datos de procesos/artefactos de test, incluyendo proceso fixture Java e IT graph.
- Al navegar a Máquina deben conservarse en el menú izquierdo los accesos autorizados a Modelado-Procesos y Contexto.
- Los campos persistidos como JSON del modal Gestión de Máquina > Editar máquina deben tener una UX legible sin exigir JSON manual, con conversión/validación backend y recuperación equivalente al reabrir.
- Corregir que los datos de máquina genérica no se guarden o no se recuperen al salir y volver a entrar.
- Inventariar todos los campos JSON de formularios y modales de todas las páginas y definir estrategia común.
- La captura muestra Capacidad nominal, Sistemas de control, Limitaciones comunes y Campos soportados/características comunes, todos JSON, y el error de capacidad nominal.
- Incluir un plan de pruebas automáticas E2E con Playwright, sin implementar código en esta fase.
