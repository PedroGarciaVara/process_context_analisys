# Especificación técnica — Requerimiento 10

**Estado:** `vencido` — requisito inicial reformulado; no continuar este flujo.  
**Versión:** 1.4 — vertical slice enmendado (AMD-005)  
**Autor:** `requirements-agent`  
**Fecha:** 2026-07-27

## Overview

El requerimiento introduce una capacidad independiente para modelar procesos industriales como un grafo dirigido, tipado, jerárquico y versionado. El diagrama será una proyección editable del modelo semántico persistido; las coordenadas, tamaños y estilos no serán la fuente de verdad.

El alcance completo descrito por el cliente incluye variantes, implementaciones técnicas, equipos, capacidades, resolución contextual, auditoría avanzada y consultas para agentes. Por tratarse de una iniciativa amplia, esta especificación define la primera entrega verificable como un vertical slice del núcleo semántico:

1. crear y consultar un proceso canónico;
2. crear una versión en estado borrador;
3. añadir nodos tipados y transiciones explícitas;
4. representar un subproceso mediante relación jerárquica;
5. reconstruir el árbol desde PostgreSQL;
6. visualizar y editar ese slice desde una página JavaScript aislada;
7. expandir subprocesos inline con breadcrumbs y retorno al padre;
8. validar invariantes básicas del grafo en backend y frontend;
9. retirar el panel lateral de procesos, conservar la selección dentro del contenido principal, habilitar scroll vertical global, añadir scroll vertical/horizontal propio a la zona de flujo y ofrecer pantalla completa condicionada para el flujo.
10. calcular un layout BPM determinista y recalculable según el tamaño real de nodos, ramas y expansiones jerárquicas.

La entrega no sustituye ni modifica el árbol causal existente. La navegación al nuevo módulo será independiente y deberá poder verificarse con tests API y una prueba UI mínima.

## Contexto técnico confirmado

- Producto objetivo: `uc_bib_solv/webapp_java`.
- Backend actual: Flask/Python en `uc_bib_solv/webapp_java/python-backend`, con `routes/`, `services/` y `repositories/`.
- Frontend actual: JavaScript puro modular en `uc_bib_solv/webapp_java/webapp`, con `js/api`, `js/core`, `js/components` y `js/views`.
- Persistencia actual: PostgreSQL mediante `app/persistence/db.py`; el esquema base se inicializa desde `db/schema.sql`.
- Existe un grafo genérico legacy (`node` y `relationship`) usado por causalidad. El modelado industrial de este requerimiento no debe reutilizar semánticamente esas tablas ni acoplarse a `causa`, `hipotesis`, `contrato` o `maquina`.
- La skill registrada `webapp-architecture` describe una arquitectura Dash/Dataiku, pero la aplicación objetivo es Flask + JavaScript puro. Por tanto, para este requerimiento se documenta explícitamente la continuidad con la arquitectura real de `webapp_java`; no se crearán páginas Dash, callbacks Dash ni un bootstrap `webapps/app.py`.

## Alcance del vertical slice

### Incluido

- Proceso canónico con código único, nombre, descripción opcional, nivel de abstracción, proceso padre opcional y estado.
- Versiones de proceso con número entero por proceso, descripción del cambio y estado inicial `draft`.
- Nodos de los tipos `input`, `output`, `operation`, `subprocess`, `decision` y `stock`.
- Transiciones dirigidas entre nodos de la misma versión, con tipo, etiqueta opcional y condición descriptiva opcional.
- Asociación de un nodo `subprocess` con otro proceso mediante `child_process_id`.
- Expansión inline de un `subprocess`/operación expandible en el mismo lienzo, sin duplicar ni mutar el proceso padre.
- Decisiones con ramas `Sí`/`No` y stocks con propiedades estructuradas de capacidad/cantidad inicial.
- Salidas explícitas `normal` y `waste` para reconstruir el resultado de un subproceso.
- Consulta de una versión completa incluyendo nodos, transiciones y breadcrumb jerárquico.
- Alta y edición de procesos, versiones, nodos y transiciones mientras la versión esté en `draft`.
- Validación de referencias, tipos permitidos, nombres/códigos obligatorios, ausencia de auto-relaciones y ausencia de ciclos jerárquicos.
- Página frontend independiente para listar procesos, abrir una versión y editar el grafo básico.
- Tests unitarios de dominio, tests de repositorio/API y un smoke test UI si el entorno de la webapp está disponible.

### No incluido en el slice

- Nodos `verification`, `measurement`, `transport`, `delay`, `event` y `document`; se reservarán para una fase posterior.
- Definiciones detalladas de operaciones, verificaciones, mediciones, parámetros, materiales, entradas/salidas cuantificadas y rutas NOK.
- Variantes, reglas de aplicabilidad, implementaciones técnicas, overrides, clases/modelos/máquinas, capacidades y bindings.
- Resolución de un proceso para producto, receta o máquina.
- Publicación/aprobación avanzada, comparación de versiones, auditoría completa, control de permisos y API de agente de solo lectura.
- Ejecución del proceso, PLC, MES, simulación, optimización, minería de procesos y edición colaborativa en tiempo real.

## Functional Requirements

### FR-01 — Catálogo de procesos

El sistema deberá permitir crear, listar, consultar y editar procesos canónicos independientes de máquinas. El código será único y estable; el nombre será obligatorio. El proceso deberá incluir, como mínimo:

- `process_id` UUID;
- `process_code` único;
- `name`;
- `description` opcional;
- `abstraction_level` entero no negativo;
- `parent_process_id` opcional;
- `status` (`draft` o `active` en el slice);
- fechas de creación y actualización.

La eliminación no forma parte del slice; si se necesita retirar un proceso se usará `status`.

### FR-02 — Versiones

Cada proceso podrá tener una o más versiones. `version_number` será único dentro del proceso y comenzará en 1. El slice soportará `draft` como estado editable; los estados `review`, `approved`, `published` y `obsolete` quedan reservados.

No se permitirá editar nodos ni transiciones de una versión que no esté en `draft`. Crear una nueva versión será la vía para modificar semántica de una versión no editable.

### FR-03 — Nodos semánticos

El usuario podrá crear y editar nodos pertenecientes a una versión concreta. Cada nodo tendrá UUID, código único dentro de la versión, tipo, nombre obligatorio, descripción opcional y propiedades JSON extensibles.

El backend aceptará únicamente los seis tipos iniciales del slice. La UI deberá presentar estos tipos mediante etiquetas legibles, conservando el código técnico en el contrato.

Un nodo `subprocess` deberá incluir un `child_process_id` existente. Los nodos de otros tipos no podrán declarar proceso hijo.

Un nodo `decision` podrá emitir transiciones `branch`; el ejemplo verificable exige exactamente una rama etiquetada `Sí` y otra `No`. Un nodo `stock` deberá serializar un objeto estructurado `stock` con, como mínimo, `capacity`, `initial_quantity` y `unit`. El flujo de ejemplo usará `capacity: 24` e `initial_quantity: 24`; estos valores no se derivan de coordenadas ni de texto visual.

### FR-04 — Transiciones

El usuario podrá crear y eliminar transiciones dirigidas entre nodos de la misma versión. Una transición tendrá UUID, `source_node_id`, `target_node_id`, `transition_type`, etiqueta opcional, descripción/condición opcional y propiedades JSON.

La secuencia funcional dependerá de estas relaciones persistidas, nunca de la posición gráfica. No se permitirá una transición consigo misma ni una referencia a nodos de otra versión.

En el slice se aceptarán `sequence` y `branch`. Las transiciones `branch` de una decisión deberán tener etiquetas únicas dentro de la decisión y, para el flujo verificable, las etiquetas `Sí` y `No`. La transición `Sí` deberá llevar a una salida `output_role=normal`; la transición `No` deberá llevar a una salida `output_role=waste`.

### FR-05 — Jerarquía y breadcrumbs

El sistema deberá permitir abrir un proceso hijo desde un nodo `subprocess`/operación expandible y volver al proceso padre. La expansión preferida será inline: la tarjeta del nodo se reemplaza visualmente por el grafo de la versión hija en el mismo lienzo, manteniendo alrededor el contexto del proceso padre. La UI deberá mostrar botón `Contraer` y breadcrumb con el formato `Proceso padre > Operación 1`.

La expansión consultará el `child_process_id` y una versión concreta del proceso hijo. No copiará nodos al padre, no modificará la versión padre y no convertirá el zoom gráfico en una relación semántica. El estado de navegación podrá persistirse mediante hash/URL con `version_id` y `node_id`, siempre que la vista sea navegable y restaurable tras recarga.

La jerarquía se almacenará mediante relaciones explícitas entre procesos/nodos, no mediante profundidad calculada desde coordenadas. El dominio deberá rechazar una relación que introduzca recursividad jerárquica.

### FR-06 — Consulta reconstruible

La consulta de una versión deberá devolver un documento JSON estable con:

```json
{
  "process": {},
  "version": {},
  "breadcrumbs": [],
  "nodes": [],
  "transitions": [],
  "outputs": [],
  "subprocess_context": null,
  "validation": {"valid": true, "errors": []}
}
```

El orden de `nodes` y `transitions` deberá ser determinista. El documento deberá permitir reconstruir el grafo sin leer HTML, SVG, CSS, posiciones ni estado de sesión del navegador.

Los nodos `output` deberán incluir `output_role`, con valores `normal` o `waste`. `outputs` repetirá el identificador, código, nombre y rol de cada salida para consumo directo. Cuando la consulta sea una expansión, `subprocess_context` incluirá `parent_version_id`, `parent_node_id`, `child_version_id`, `normal_output_node_ids`, `waste_output_node_ids` y `parent_continuation_transition_ids`. La salida normal del hijo se conecta semánticamente con el flujo padre mediante la transición saliente del nodo `subprocess` en la versión padre; la salida `waste` es terminal dentro del hijo y no crea una continuación implícita en el padre.

### FR-07 — Validación semántica del slice

El caso de uso de validación deberá comprobar, como mínimo:

- código y nombre de proceso, versión y nodo no vacíos;
- códigos únicos dentro del ámbito correspondiente;
- tipos de nodo permitidos;
- referencias de proceso hijo, nodos origen y nodos destino existentes;
- transición sin auto-relación;
- nodo `subprocess` con proceso hijo y otros nodos sin proceso hijo;
- ausencia de ciclo en la jerarquía de procesos;
- ausencia de transición entre versiones diferentes.
- decisión con ramas `Sí` y `No` cuando se use el flujo verificable;
- `stock` con objeto estructurado completo y valores numéricos válidos;
- salida con `output_role` igual a `normal` o `waste`;
- rama `Sí` dirigida a una salida normal y rama `No` dirigida a una salida waste en el ejemplo verificable.

La validación podrá devolver varios errores identificados por código estable. Las operaciones de guardado que creen una referencia inválida deberán rechazarse con HTTP 400 y mensaje apto para la UI.

No se exige todavía que todo grafo arbitrario tenga input/output, accesibilidad completa o resolución general de rutas NOK; esas reglas se incorporarán progresivamente. Sí se exige el grafo de ejemplo definido en esta enmienda. El caso de uso deberá quedar diseñado para extender las reglas sin moverlas a la UI.

### FR-08 — API HTTP

Los adaptadores se ubicarán en `uc_bib_solv/webapp_java/python-backend/routes/process_modeling.py` y delegarán en `services/process_modeling_service.py`; no contendrán SQL ni reglas industriales.

El slice deberá exponer, como mínimo, estos contratos:

| Método | Ruta | Resultado |
|---|---|---|
| `GET` | `/api/process-modeling/processes` | Lista determinista de procesos |
| `POST` | `/api/process-modeling/processes` | Crea proceso, HTTP 201 |
| `GET` | `/api/process-modeling/processes/<process_id>` | Detalle del proceso y versiones |
| `POST` | `/api/process-modeling/processes/<process_id>/versions` | Crea versión draft, HTTP 201 |
| `GET` | `/api/process-modeling/versions/<version_id>` | Reconstruye versión completa |
| `PATCH` | `/api/process-modeling/versions/<version_id>` | Edita metadatos draft |
| `POST` | `/api/process-modeling/versions/<version_id>/nodes` | Crea nodo, HTTP 201 |
| `PATCH` | `/api/process-modeling/nodes/<node_id>` | Edita nodo draft |
| `POST` | `/api/process-modeling/versions/<version_id>/transitions` | Crea transición, HTTP 201 |
| `DELETE` | `/api/process-modeling/transitions/<transition_id>` | Elimina transición draft |
| `POST` | `/api/process-modeling/versions/<version_id>/validate` | Devuelve resultado de validación |

Las respuestas seguirán el sobre usado por la webapp (`status`, `data` y `message` cuando corresponda). Los UUID inválidos o recursos inexistentes devolverán 400/404 según el caso; errores de integridad o concurrencia no deberán exponerse como trazas.

### FR-09 — Frontend independiente

El frontend se ubicará en módulos nuevos bajo:

- `uc_bib_solv/webapp_java/webapp/js/api/process-modeling.js` para llamadas HTTP;
- `uc_bib_solv/webapp_java/webapp/js/core/process-modeling-state.js` para estado local;
- `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/` para render del grafo, inspector y breadcrumbs;
- `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js` para la vista de página.

La ruta hash propuesta será `#/modelado-procesos`. La incorporación al router y al mapa de vistas deberá ser el único punto de integración con el shell existente.

La UI del slice deberá permitir:

- seleccionar procesos mediante un control compacto dentro del shell/editor principal, alimentado por la misma lista/API y estado local existentes; la eliminación del panel izquierdo es únicamente visual y no elimina la capacidad funcional de seleccionar procesos;
- abrir una versión;
- mostrar nodos y transiciones devueltos por API;
- mostrar breadcrumbs y entrar en un subproceso;
- crear un nodo de los seis tipos iniciales;
- crear una transición seleccionando origen/destino;
- editar nombre/descripción de nodo y proceso en draft;
- ejecutar validación y presentar errores sin perder los datos introducidos;
- mostrar estados de carga, vacío, error y guardado;
- renderizar tarjetas BPM diferenciadas: rombo para `decision`, doble rombo para `stock` y contorno expandible para `subprocess`;
- mostrar conectores visibles, una lista accesible de transiciones y acciones `Expandir`/`Contraer`;
- restaurar una expansión desde URL/hash y regresar al padre sin perder el contexto.

La vista no deberá renderizar un panel lateral izquierdo dedicado a mostrar todos los procesos. El selector alternativo deberá permanecer disponible antes y después de abrir una versión, tener etiqueta accesible y conservar el proceso seleccionado al recargar o restaurar el hash cuando exista contexto suficiente.

La totalidad de la página de modelado deberá poder desplazarse verticalmente con el scroll del documento. En modo no pantalla completa, la zona de flujo deberá disponer además de un viewport propio `.pm-flow-scroll` con `overflow-y: auto` y `overflow-x: auto`, de forma que el diagrama pueda desplazarse vertical y horizontalmente dentro de su zona sin eliminar el scroll global de la página. El viewport interno tendrá una altura mínima de 260 px en escritorio y 220 px en viewport de hasta 780 px, y una altura máxima no superior a `min(70vh, 720px)` cuando el contenido exceda ese límite; el documento seguirá alcanzando los formularios, mensajes, breadcrumbs y lista accesible de transiciones situados fuera del viewport. No se autoriza `overflow-y: hidden` en la zona de flujo.

En modo pantalla completa, el contenedor fullscreen y la zona `.pm-flow-scroll` deberán conservar scroll interno vertical y horizontal usable, sin cerrar ni abandonar el modo pantalla completa. El viewport interno podrá adaptarse al alto disponible, pero deberá conservar al menos 220 px de altura útil cuando el viewport lo permita y no deberá depender del scroll global del documento para alcanzar nodos o conectores del diagrama. El scroll global podrá seguir existiendo fuera del flujo cuando haya contenido adicional.

La zona de flujo deberá ofrecer una acción `Pantalla completa`/`Salir de pantalla completa`. Se evaluará primero la capacidad nativa de pantalla completa disponible en el navegador; si no existe, falla o no está autorizada por el entorno, se aplicará un fallback funcional que oculte temporalmente paneles secundarios no esenciales y maximice el área del flujo dentro de la página. La acción no añadirá dependencias ni cambiará la semántica, el contrato API o la persistencia. El estado de pantalla completa será reversible y no deberá perder selección, breadcrumbs, expansión ni datos de edición.

La posición visual, si se implementa, será metadata gráfica separada y no modificará la semántica. No se introduce React ni JointJS como dependencia obligatoria del slice; el renderer será JavaScript nativo compatible con el patrón actual.

### FR-12 — Layout BPM calculado y conectores legibles (AMD-005)

El renderer deberá separar modelo semántico, cálculo geométrico y pintura. Las coordenadas y dimensiones serán resultados recalculables, nunca fuente de verdad.

El layout deberá medir las dimensiones efectivas de tarjetas, etiquetas, puertos y contenedores antes de asignar coordenadas; usar un pipeline determinista por capas orientado verticalmente; evitar intersecciones entre bounding boxes y que un conector atraviese un nodo no incidente; centrar las cadenas verticales; y reservar un lane independiente por rama cuyo ancho incluya el máximo de sus nodos descendientes, etiquetas y márgenes.

Al expandir, contraer, cambiar texto/tamaño o cambiar viewport, se recalcularán el subgrafo afectado, sus ancestros/descendientes y el bounding box del lienzo. Expandir desplazará el resto cuando el hijo crezca; contraer eliminará el espacio reservado sin huecos ni solapes. El mismo grafo, tamaños y opciones producirá las mismas coordenadas y rutas.

Cada transición semántica visible se dibujará una sola vez, con conectores ortogonales o polilíneas de pocos segmentos, puertos y flecha inequívocos. No se crearán líneas auxiliares, diagonales decorativas ni duplicados por contenedor, breadcrumb o continuación implícita. Las etiquetas de rama estarán junto al tramo de salida. La lista accesible conservará todas las transiciones aunque el modo visual oculte relaciones de contexto.

La implementación podrá usar algoritmo propio o dependencia compatible con JavaScript puro. ELK Layered es la referencia recomendada para evaluar el pipeline por capas, minimización de cruces, grafos compuestos, separación y routing ortogonal; adoptar una dependencia nueva requiere justificarla en `task_plan.md` y respetar el bundle actual.

### FR-10 — Separación de responsabilidades

**Frontend/UI:** routing hash, render, selección, formularios, feedback, validación inmediata de campos claramente vacíos y adaptación de JSON a componentes. No decidirá invariantes de negocio ni escribirá PostgreSQL.

Para AMD-003, frontend/UI también será responsable de retirar la representación del catálogo lateral, renderizar el selector alternativo, aplicar el scroll vertical global y gestionar el estado visual reversible de pantalla completa/fallback. Para AMD-004, frontend/UI será responsable de mantener dos niveles de desplazamiento coordinados: scroll global del documento y scroll vertical/horizontal del viewport del flujo en modo normal y fullscreen. La acción de pantalla completa no introduce responsabilidades de backend/domain.

Para AMD-005, frontend/UI será responsable de medir cajas renderizadas, construir una entrada de layout sin HTML/CSS, invocar el calculador, aplicar coordenadas/rutas, recalcular después de expandir/contraer y exponer la lista alternativa accesible. No decidirá la semántica de transiciones ni inventará relaciones para corregir geometría.

**Backend/routes:** parseo HTTP, códigos de estado y serialización. No contendrá reglas de dominio ni SQL directo.

**Backend/services:** casos de uso de aplicación, composición de repositorios, transacciones y mapeo de errores funcionales a respuestas.

**Dominio:** entidades/value objects/casos de uso y validadores de proceso, versión, nodo, transición y jerarquía. El dominio no importará Flask, psycopg2, PostgreSQL, JavaScript, HTML ni módulos de infraestructura.

**Persistencia:** repositorios concretos y mapeo SQL. El acceso a conexión permanecerá en `app/persistence/db.py`; los repositorios del slice se crearán como módulos separados bajo `app/persistence/` y no modificarán la semántica de los repositorios de causalidad.

Para AMD-005 no se añade persistencia obligatoria de coordenadas. Si se conserva una posición manual en el futuro, será metadata gráfica versionada y no sustituirá al algoritmo ni alterará la semántica.

### FR-11 — Integración en Flask

`uc_bib_solv/webapp_java/python-backend/app.py` registrará el blueprint del nuevo módulo manteniendo las rutas actuales. El módulo no deberá cambiar las respuestas ni los flujos existentes de `operational`, `causas`, `analysis`, `bootstrap` o `health`.

## Modelo de datos y persistencia

La fuente de verdad será PostgreSQL. Para mantener aislado el bounded context, el slice deberá crear tablas con prefijo `pm_` o equivalente inequívoco, en lugar de reutilizar `proceso`, `node`, `relationship`, `causa` o `hipotesis`.

El modelo mínimo será:

- `pm_process_definition`: proceso canónico y relación padre opcional;
- `pm_process_version`: versión y estado;
- `pm_process_node`: nodos de una versión y `child_process_id` opcional;
- `pm_process_transition`: relaciones dirigidas de una versión.

`pm_process_node` deberá poder persistir `output_role` para nodos `output` y un objeto estructurado `stock` para nodos `stock` (`capacity`, `initial_quantity`, `unit`). El repositorio y el dominio validarán que esos datos no se usen como sustituto de relaciones. Las salidas normal y waste serán nodos persistidos y las transiciones `branch` serán las relaciones persistidas que las alcanzan.

Las tablas deberán usar UUID, claves foráneas, restricciones de unicidad y `ON DELETE` coherentes con el dominio. Deben existir índices para códigos, proceso de versión, `source_node_id`, `target_node_id` y `child_process_id`. Los campos extensibles usarán `JSONB` solo para propiedades no estructurales; proceso, versión, tipo y relaciones no se esconderán en JSON.

El esquema se documentará en `db/schema.sql`, siguiendo el mecanismo de inicialización existente. Si durante el plan se confirma un mecanismo de migraciones versionadas, este mismo modelo deberá materializarse además en una migración idempotente; no se autoriza modificar tablas existentes de forma destructiva. La conexión seguirá siendo la de `app/persistence/db.py` y no se crearán conexiones en rutas, servicios de UI ni dominio.

## Domain placement

Se creará el módulo independiente `app/domain/process_modeling/` con, como mínimo, `entities.py`, `value_objects.py`, `interfaces.py`, `use_cases.py`, `validators.py`, `exceptions.py` y tests unitarios. La elección extiende el boundary de dominio ya existente sin convertir `app/domain` en una capa Flask.

La infraestructura concreta se ubicará en `app/persistence/pm_process_repo.py`, `pm_version_repo.py`, `pm_node_repo.py` y `pm_transition_repo.py` o una partición equivalente por responsabilidad. La API pública permanecerá bajo `uc_bib_solv/webapp_java/python-backend`.

## Non-Functional Requirements

- **Mantenibilidad:** módulos separados por capacidad; sin lógica industrial en vistas, callbacks inexistentes o rutas.
- **Integridad:** todas las escrituras usarán SQL parametrizado y transacciones; una operación inválida no dejará datos parcialmente persistidos.
- **Determinismo:** las consultas ordenarán resultados y devolverán contratos JSON estables.
- **Rendimiento inicial:** la carga de un grafo de prueba de hasta 100 nodos y 200 transiciones deberá completarse en menos de 2 segundos en entorno local, excluyendo arranque del servidor.
- **Seguridad básica:** no se ejecutarán expresiones recibidas en `condition_expression` ni contenido JSON como código. La autenticación/autorización completa queda fuera del slice, pero el diseño no deberá impedir añadirla al servicio HTTP.
- **Compatibilidad:** la webapp deberá seguir arrancando y las rutas existentes deberán mantener su comportamiento.
- **Observabilidad:** errores funcionales deberán quedar identificados en la respuesta y registrarse en backend sin incluir secretos ni payloads completos innecesarios.

## Constraints and Assumptions

- El frontend se interpreta como JavaScript puro, según el propio requerimiento y el contexto real; no se implementa Java como tecnología ejecutada en navegador.
- El vertical slice inicial es una fase confirmada de la iniciativa y debe poder validarse de forma independiente antes de abordar el modelo completo.
- La aplicación web objetivo es `webapp_java` Flask + JavaScript puro, no una webapp Dash. La skill Dash se usa solo para detectar que no aplica y no se copiará su estructura.
- Se reutilizan las capas y utilidades de conexión existentes, pero no la semántica legacy de causalidad.
- No se define todavía una política de usuarios/roles para este slice; `created_by`, aprobación y auditoría completa se incorporarán con la fase de versionado/seguridad.
- No se requiere una decisión adicional del programador para cerrar este draft; las decisiones tecnológicas de detalle que no alteren contratos quedan para `task_plan.md`.

## Out of Scope

- Implementación completa de las 18 entidades y todas las tablas propuestas en el documento bruto.
- Resolución general-a-específico, procedencia por override y proceso ejecutable.
- Equipos físicos, control systems, tags, PLC, MES y recetas.
- Expresiones condicionales ejecutables, motor de reglas, simulación u optimización.
- Roles, autenticación, autorización fina y API pública de agentes.
- Exportación final para agentes, MCP, auditoría de negocio y comparación visual/semántica avanzada.
- Migración de datos de causalidad o sustitución del árbol causal actual.

## Acceptance Criteria

### AC-01 — Aislamiento y arranque

La aplicación arranca con el blueprint y la vista de modelado registrados; las rutas existentes y el smoke test previo siguen pasando.

### AC-02 — Persistencia básica

Un test de integración crea un proceso y una versión draft en PostgreSQL, los consulta después de cerrar la transacción y verifica que los UUID, código, nombre y versión se conservan.

### AC-03 — Grafo reconstruible

Un test crea al menos un `input`, un `operation`, un `output` y dos transiciones; `GET /api/process-modeling/versions/<id>` devuelve los cuatro nodos y las dos relaciones, y la secuencia puede reconstruirse sin coordenadas.

### AC-04 — Edición draft y bloqueo no draft

Los cambios de nodo/transición en `draft` se guardan. Un intento equivalente sobre una versión no editable devuelve 400 y no modifica el registro.

### AC-05 — Jerarquía

Un test crea un proceso hijo, lo asocia a un nodo `subprocess`, consulta el padre y el hijo, y verifica breadcrumbs completos y ordenados. Una asociación que cierre un ciclo padre-hijo es rechazada.

### AC-06 — Validación

La API devuelve errores identificables para nombre vacío, tipo no permitido, nodo hijo inexistente, transición con nodo de otra versión, auto-transición y `subprocess` sin hijo. La UI muestra esos errores sin perder el formulario.

### AC-07 — Frontend mínimo

Un smoke test UI navega a `#/modelado-procesos`, carga el listado, abre una versión, visualiza breadcrumbs y nodos, crea un nodo y verifica la actualización visible tras una respuesta HTTP exitosa. También verifica los estados vacío y error mediante fixtures o backend controlado.

### AC-08 — Contrato y modularidad

Los tests verifican el sobre JSON documentado, códigos HTTP 201/400/404, orden determinista y que dominio no importa Flask/psycopg2. Una revisión de estructura confirma que no se añadió lógica industrial a `app.py`, rutas o componentes visuales.

### AC-09 — No regresión

Los tests existentes de causalidad, operational y health continúan pasando, y no se modifican sus tablas ni contratos públicos.

### AC-10 — Preparación evolutiva

El modelo y los nombres de tipos permiten añadir posteriormente verificaciones, mediciones, variantes, implementaciones, equipos y contratos de agente sin reinterpretar las transiciones existentes ni usar coordenadas como semántica.

### AC-17 — Catálogo sin panel izquierdo y selección conservada

La ruta `#/modelado-procesos` no renderiza un `<aside>` o panel lateral de catálogo de procesos. El smoke test selecciona al menos dos procesos desde el selector situado en el shell/editor principal, abre una versión y verifica que el proceso seleccionado y su grafo se actualizan mediante la API existente.

### AC-18 — Scroll vertical global

Con una página cuyo contenido exceda la altura del viewport, el test UI verifica que `document.documentElement.scrollHeight > window.innerHeight`, que el final del editor, formularios, mensajes y lista accesible de transiciones es alcanzable mediante el scroll del documento y que no existe un contenedor de modelado que oculte ese contenido con `overflow-y: hidden`. En modo no pantalla completa, el elemento `.pm-flow-scroll` deberá tener `overflow-y: auto` y `overflow-x: auto`, una altura computada entre 220 px y `min(70vh, 720px)` según el viewport, y deberá permitir desplazar hasta el extremo inferior y derecho de un flujo que exceda ambas dimensiones sin modificar el hash ni perder el contexto.

### AC-19 — Pantalla completa condicionada y fallback

Cuando el entorno permite la capacidad nativa de pantalla completa, activar `Pantalla completa` expande la zona de flujo, cambia el nombre/estado accesible de la acción y permite salir sin perder `version_id`, `node_id`, breadcrumbs ni expansión. Mientras permanece activa, el viewport `.pm-flow-scroll` conserva `overflow-y: auto` y `overflow-x: auto` y el test desplaza ambos ejes sin que `document.fullscreenElement`/el fallback equivalente deje el modo fullscreen. Cuando la capacidad no está disponible o falla, la misma acción activa el fallback que oculta paneles secundarios y maximiza visualmente el flujo; el test verifica que la acción sigue siendo reversible y que el grafo permanece visible.

### AC-22 — Scroll interno del flujo en ambos modos

Con un fixture de flujo cuyo lienzo supere la altura y anchura disponibles, un test UI verifica en modo normal que el documento mantiene scroll vertical global y que `.pm-flow-scroll` permite alcanzar el último nodo mediante scroll vertical interno y el extremo derecho mediante scroll horizontal interno. Repite la verificación en fullscreen nativo o fallback, manteniendo visible el modo fullscreen durante ambos desplazamientos. En todos los casos se conservan `version_id`, `node_id`, breadcrumbs, `expansionStack`, proceso seleccionado y foco del control de fullscreen; no se realizan peticiones API ni mutaciones de dominio por desplazar.

### AC-20 — Accesibilidad de los nuevos controles

El selector de proceso y las acciones de pantalla completa tienen nombre accesible, foco visible, orden de teclado operable y estado expuesto (`aria-expanded` o equivalente cuando aplique). La salida de pantalla completa también es posible mediante teclado cuando el navegador lo soporte y el foco retorna a un control existente de la vista.

### AC-21 — No cambio de backend/domain

Los tests de API, dominio y persistencia de AC-02..AC-10 siguen pasando sin cambios de contrato derivados de AMD-003/AMD-004; una revisión de cambios confirma que las enmiendas solo añaden responsabilidades de presentación/estado UI y no crean tablas, endpoints ni dependencias nuevas.

## Fases posteriores

1. **Editor industrial ampliado:** tipos restantes, inputs/outputs detallados, verificaciones, mediciones, validación de accesibilidad y rutas NOK avanzadas.
2. **Versionado y gobierno:** review/approval/publish, comparación, auditoría, usuarios y permisos.
3. **Equipos e implementaciones:** clases, modelos, máquinas, capacidades, bindings y diferencias respecto al proceso canónico.
4. **Variantes y resolución:** aplicabilidad, prioridades, overrides, conflictos y procedencia.
5. **Contrato para agentes:** exportación estructurada completa, consultas semánticas y resolución contextual de solo lectura.
6. **Escala/operación:** paginación, grafos de 1.000 nodos, multi-planta, rendimiento, integración MES/PLC y colaboración, según nuevos requerimientos.

## Questions for Clarification

No quedan preguntas bloqueantes para validar el vertical slice definido en esta especificación. Las siguientes decisiones pertenecen a fases posteriores y no bloquean la primera implementación:

- mecanismo definitivo de migraciones separado de `db/schema.sql`;
- identidad de usuario y estrategia de permisos;
- catálogo definitivo de tipos de nodo y DSL de condiciones;
- formato final de exportación para agentes y resolución contextual;
- librería gráfica, si la escala futura demuestra que el renderer nativo no es suficiente.
- soporte exacto de pantalla completa en navegadores/entornos concretos; AMD-003 queda condicionada a la capacidad del entorno y cuenta con fallback funcional, por lo que no bloquea la validación.

## Decision Log

| Fecha | Decisión | Responsable | Motivo |
|---|---|---|---|
| 2026-07-19 | Tratar el requerimiento como iniciativa incremental y especificar primero un vertical slice del núcleo semántico | requirements-agent, conforme al contexto del orquestador | Permite ejecutar tests y validar una funcionalidad independiente sin inventar la implementación completa |
| 2026-07-19 | Target técnico: Flask/Python + JavaScript puro de `uc_bib_solv/webapp_java` | requirements-agent, conforme al contexto y estructura inspeccionada | La skill `webapp-architecture` registrada es para Dash/Dataiku y no describe la aplicación objetivo |
| 2026-07-19 | Aislar el modelo industrial con tablas y módulos `pm_*` | requirements-agent | Evita contaminar o reinterpretar el grafo legacy de causalidad |
| 2026-07-19 | Primera entrega: procesos, versiones draft, seis tipos de nodo, transiciones, decisiones, stocks y subprocesos | requirements-agent, conforme a AMD-002 | El slice demuestra persistencia, API, dominio, UI BPM, navegación jerárquica y salidas normal/waste |
| 2026-07-20 | Eliminar el panel izquierdo solo elimina su representación; la selección funcional se conserva mediante un selector compacto dentro del shell/editor, reutilizando la lista/API y el estado existentes | programador_humano; evaluación técnica de requirements-agent | La UI inspeccionada ya dispone de `listProcesses`, `processOptions`, `state.selectedProcess` y apertura por hash; no se altera el backend |
| 2026-07-20 | Añadir scroll vertical al documento completo y pantalla completa condicionada con fallback reversible que maximiza el flujo y oculta paneles secundarios | programador_humano; evaluación técnica de requirements-agent | La modificación es de presentación/estado UI; la capacidad nativa puede variar por navegador y el fallback evita una dependencia o API nueva |
| 2026-07-20 | Añadir scroll vertical y horizontal propio dentro de `.pm-flow-scroll` en modo normal y mantenerlo usable dentro de fullscreen, conservando simultáneamente el scroll vertical global | programador_humano; evaluación técnica de requirements-agent | El código actual usa `.pm-flow-scroll` para el eje horizontal y delega el eje vertical al documento; AMD-004 completa el viewport interno sin cambiar backend, dominio, API o persistencia |

## Amendments

### AMD-001
- Fecha: `2026-07-19`
- Tipo: `C (enmienda plan)`
- Descripción: el programador humano solicita explicitar en el `task_plan.md` la estrategia incremental de tests unitarios de dominio/validadores/casos de uso/servicios, tests de repositorio/API/integración y tests E2E con Playwright para `webapp_java`, incluyendo evidencias en `.playwright-artifacts/` cuando aplique.
- Estado: `integrated`
- Fase de reentrada: `validate-task-plan`
- Validación humana: `pendiente (Gate 2)`
- Notas: no modifica FR ni AC; el plan adapta las restricciones de `ui-test-structure`, `ui-log-recovery` y `playwright-dash-webapp` al frontend Flask + JavaScript puro.

### AMD-002
- Fecha: `2026-07-19`
- Tipo: `B (enmienda de especificación)`
- Descripción: se adopta el modelo de zoom semántico con expansión inline preferida de subprocesos, breadcrumbs, botón `Contraer`, restauración por URL/hash y consulta inmutable de la versión hija. El slice incorpora `decision` y `stock`, ramas `Sí`/`No`, stock estructurado con capacidad/cantidad inicial 24 y salidas explícitas `normal`/`waste`.
- Estado: `integrated`
- Fase de reentrada: `validate-spec`
- Validación humana: `aprobada (Gate 1)`
- Alcance preservado: variantes, máquinas y resolución general-a-específico continúan fuera del slice.

### AMD-003
- Fecha: `2026-07-20`
- Tipo: `B (enmienda de especificación)`
- Origen: `programador_humano`
- Descripción: eliminar el panel izquierdo donde se muestran todos los procesos, añadir scroll vertical a la totalidad de la página y ofrecer un botón para expandir la zona de flujo a pantalla completa cuando sea viable.
- Estado: `integrated`
- Fase de reentrada: `validate-spec`
- Validación humana: `aprobada (Gate 1)`
- Evidencia exacta: `"El programador humano ha validado explícitamente el spec en esta sesión."`
- Decisiones: la selección de procesos se conserva mediante un selector dentro del shell/editor; el fullscreen se implementa de forma condicionada a compatibilidad/autorización del navegador o entorno y dispone de fallback reversible para ocultar paneles secundarios y maximizar el flujo.
- Alcance preservado: no se modifican API, dominio, persistencia, semántica de nodos/transiciones ni fases posteriores.

### AMD-004
- Fecha: `2026-07-20`
- Tipo: `B (enmienda de especificación)`
- Origen: `programador_humano`
- Descripción: añadir scroll vertical propio dentro de la zona de flujo cuando la vista esté en modo no pantalla completa, manteniendo también el scroll vertical global de la página.
- Estado: `integrated`
- Fase de reentrada: `validate-spec`
- Validación humana: `aprobada (Gate 1)`
- Evidencia exacta: `El programador humano ha indicado explícitamente: validar e implementar.`
- Decisiones: el viewport `.pm-flow-scroll` tendrá scroll vertical y horizontal propio en modo normal y fullscreen; el documento conservará su scroll vertical global; los dos niveles deberán coexistir sin pérdida de contexto ni cambios de backend/domain/API/persistencia.
- Alcance preservado: AMD-003, el resto del vertical slice y todas las fases posteriores permanecen vigentes.

## Acceptance Criteria — AMD-002

### AC-11 — Subproceso hijo y expansión inline

Un test de integración crea un proceso padre, una versión hija y un nodo `subprocess` con `child_process_id`; la consulta devuelve ambos grafos sin duplicar registros en el padre. Un smoke test UI expande la tarjeta, muestra el grafo hijo en el mismo lienzo, conserva el contexto padre, muestra `Proceso padre > Operación 1` y permite `Contraer`.

### AC-12 — Decisión Sí/No

Un test crea una decisión con dos transiciones `branch` etiquetadas `Sí` y `No`, y verifica que ambas etiquetas y destinos aparecen en el contrato JSON y en la lista accesible de transiciones. Una decisión incompleta es rechazada por validación.

### AC-13 — Stock estructurado 24

Un test persiste y reconstruye un nodo `stock` con `stock.capacity = 24`, `stock.initial_quantity = 24` y unidad definida. La respuesta conserva esos valores como datos estructurados, independientemente de la representación visual.

### AC-14 — Salidas normal y waste

El flujo de ejemplo `input → operation 1.1 → operation 1.2 → stock(24) → decision` se persiste y reconstruye. La rama `Sí` alcanza un nodo `output` con `output_role=normal` y la rama `No` alcanza un nodo `output` con `output_role=waste`; el contrato incluye ambos roles y el contexto de continuación del subproceso.

### AC-15 — Persistencia, recarga y no mutación

Tras recargar la página con `version_id`/`node_id` en la URL/hash, la expansión y breadcrumbs se restauran desde PostgreSQL. Al contraer o volver al padre, una consulta de la versión padre demuestra que sus nodos, transiciones y versión no fueron mutados ni duplicados.

### AC-16 — UI BPM y estados operativos

La UI muestra formas diferenciadas para decisión, stock y subprocess, conectores visibles, lista accesible de transiciones y estados loading, vacío y error. La navegación de expansión y retorno es operable sin depender exclusivamente del dibujo.

## Gate de validación

AMD-002, AMD-003, AMD-004 y AMD-005 permanecen integradas y validadas por Gate 1. Evidencia: el programador humano indicó explícitamente `validar` el 2026-07-27 para el spec completo. El alcance no cambia y `task_plan.md` no se modifica con esta validación.

## AMD-005 — Layout BPM, ramas y conectores

### Amendment

- Fecha: `2026-07-27`
- Tipo: `B (enmienda de especificación)`
- Origen: `programador_humano`
- Estado: `integrated; validada (Gate 1)`
- Validación humana: `aprobada el 2026-07-27`
- Evidencia: el programador humano indicó explícitamente `validar` para el spec completo.
- Fase de reentrada: `validate-spec`
- Objetivo: evitar solapes, recalcular posiciones tras expansión/contracción o cambio de tamaño, centrar flujos verticales, separar físicamente ramas horizontales por el ancho máximo aguas abajo, aclarar conectores y retirar líneas visuales de ruido.
- Alcance preservado: no se añaden entidades, endpoints ni persistencia geométrica; la continuidad Flask + JavaScript puro prevalece sobre la skill Dash/Dataiku.

### Decisiones de diseño

El layout será una proyección recalculable del grafo semántico. Usará un pipeline determinista por capas, inspirado en Sugiyama/ELK Layered: medición de cajas, asignación de capas, minimización de cruces, colocación y routing. Se medirán tamaños reales de tarjetas, etiquetas, puertos y contenedores antes de calcular coordenadas.

El flujo principal será vertical y sus cadenas se centrarán por columna/lane. Cada rama tendrá un lane exclusivo; su anchura incluirá el máximo de nodos descendientes, etiquetas y márgenes. Los subprocesos serán compuestos: al expandir se recalcularán hijo, ancestros, descendientes y bounding box del lienzo; al contraer se eliminará el espacio reservado. El mismo grafo, tamaños, viewport y opciones producirá las mismas coordenadas y rutas dentro de 1 px.

Cada transición semántica visible se dibujará una sola vez, preferentemente con routing ortogonal/polilínea de pocos segmentos, puertos y flecha inequívocos. No se crearán líneas auxiliares, diagonales decorativas ni duplicados por breadcrumbs, contenedores o continuación implícita. La lista accesible conservará todas las transiciones aunque el modo visual reduzca relaciones de contexto.

No se obliga a adoptar una dependencia nueva. Podrá evaluarse ELK/elkjs o un algoritmo propio compatible con JavaScript puro; la decisión debe justificarse en `task_plan.md` por bundle, licencia, rendimiento y compatibilidad con Flask + JS puro.

### Decision Log — AMD-005

| Fecha | Decisión vinculante | Responsable | Aplicación |
|---|---|---|---|
| 2026-07-27 | El programador confirma que las imágenes generadas son correctas. La implementación deberá asegurar que cada flujo generado y su representación visual corresponden con las reglas de implementación del proceso, especialmente en ramas múltiples y bifurcaciones aguas abajo. | `programador_humano` | Las reglas semánticas de origen, destino, tipo, orden y pertenencia a rama prevalecen sobre cualquier ajuste geométrico. El layout no podrá reordenar, fusionar, duplicar ni representar como perteneciente a otra rama un flujo válido; AC-25, AC-26 y AC-29 son criterios vinculantes de conformidad. |

### Buenas prácticas y referencias analizadas

- BPMN: [OMG Business Process Model and Notation](https://www.omg.org/intro/Business_Process_Modeling.pdf) y [BPMN Sections 1–2](https://www.omg.org/bpmn/Documents/BPMN_Sections_1_and_2.pdf). Se adopta la separación entre semántica y representación; no se afirma conformidad BPMN completa para este slice.
- UML: [OMG UML 2.5.1](https://www.omg.org/spec/UML/) y [UML Diagram Interchange](https://www.omg.org/spec/UML/machine-readable). Se toma como referencia la separación entre metamodelo y datos de intercambio; no se introduce un modelo UML.
- Layout: [ELK Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) y [su pipeline de cinco fases](https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html), por minimización de cruces, grafos compuestos, colocación y routing ortogonal.
- Proyectos GitHub: [bpmn-io/bpmn-js](https://github.com/bpmn-io/bpmn-js) como toolkit BPMN web; [clientIO/joint](https://github.com/clientIO/joint) por puertos, jerarquía, layouts y routing SVG; [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid) por render reproducible desde descripción. Son referencias de diseño, no dependencias obligatorias.
- Accesibilidad: [WAI Accessibility Principles](https://www.w3.org/WAI/fundamentals/accessibility-principles/), [MDN accessible web applications](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Accessible_web_applications_and_widgets) y [Web Interface Guidelines](https://vercel.com/design/guidelines): teclado, foco visible, targets operables y alternativa no visual.

### Responsabilidades y módulos afectados

- `uc_bib_solv/webapp_java/webapp/js/components/process-modeling/`: separar medición/layout, nodos, conectores, lanes/compuestos y lista accesible.
- `uc_bib_solv/webapp_java/webapp/js/core/process-modeling-state.js`: invalidar y recalcular ante expansión, contracción, cambio de contenido, resize y hash; conservar selección y foco.
- `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js`: coordinar medición tras estilos/fuentes, viewport, fullscreen/fallback y actualización atómica.
- `uc_bib_solv/webapp_java/webapp/js/api/process-modeling.js`: mantiene el contrato; consume el grafo semántico existente.
- `app/domain/process_modeling/`, `app/persistence/` y `db/schema.sql`: no tienen cambios funcionales obligatorios; no se persisten coordenadas como regla de negocio.
- Frontend: mide y pinta geometría, pero no inventa relaciones ni decide invariantes semánticas. Backend/domain: permanece fuente de verdad del grafo, sin cambios de API por AMD-005.
- `tests/unit/`, `tests/integration/`, `tests/e2e/` y `.playwright-artifacts/test-results/`: alojan fixtures, pruebas y evidencias.

### Acceptance Criteria — AMD-005

- **AC-23 Sin solapes:** con nodos heterogéneos y etiquetas largas, ningún bounding box visible se intersecta, ningún conector atraviesa un nodo no incidente y todas las etiquetas quedan dentro del lienzo; la separación se compara con el margen configurado.
- **AC-24 Recalculo:** al expandir un subproceso, el hijo aparece, el lienzo crece y los nodos posteriores se desplazan sin solaparse; al contraer, desaparece el espacio reservado. Dos ejecuciones idénticas coinciden dentro de 1 px.
- **AC-25 Centrado y ramas:** en una cadena vertical de cuatro nodos, los centros X difieren como máximo 1 px salvo corrección documentada. En dos ramas de anchos distintos, lanes adyacentes no se superponen y cada lane incluye el máximo ancho aguas abajo más márgenes.
- **AC-26 Conectores y ruido:** hay exactamente un elemento visual por transición semántica visible; no hay líneas auxiliares equivalentes y cada ruta tiene como máximo 4 segmentos salvo excepción registrada. Flecha, origen, destino y etiqueta son identificables; la lista accesible conserva el 100 % de las transiciones.
- **AC-27 Determinismo/rendimiento:** con idénticos JSON, viewport, fuentes, tamaños y opciones, coordenadas, bounding box y rutas coinciden dentro de 1 px. Un fixture de 100 nodos/150 transiciones calcula en menos de 500 ms en Chromium local, o usa Web Worker/lotes sin bloquear la interacción.
- **AC-28 Accesibilidad:** por teclado se puede enfocar cada nodo, activar Expandir/Contraer, identificar origen/destino/etiqueta en la lista alternativa y volver al nodo expandido conservando foco visible.
- **AC-29 No regresión:** pasan las suites API, dominio y persistencia existentes sin cambios de endpoints, tablas `pm_*`, JSON semántico ni reglas causales; el diff no persiste geometría ni crea relaciones nuevas.

### Estrategia de verificación

Primero se ejecutarán tests puros del layout con JSON y dimensiones sintéticas; después tests DOM/SVG en Chromium para bounding boxes y rutas; luego Playwright para expansión, contracción, ramas, foco y fullscreen; finalmente API/dominio/persistencia y smoke/no regresión. Cada fallo se clasificará como `spec`, `task_plan` o `implementation`; no se suavizarán umbrales para ocultar solapes.

### Riesgos y mitigaciones

- Fuentes o contenido pueden cambiar dimensiones: medir tras estilos/fuentes y observar resize.
- Grafos grandes pueden bloquear el hilo: mantener cálculo puro y evaluar Web Worker/lotes si AC-27 falla.
- Routing ortogonal puede aumentar el lienzo: limitar bend points y probar ramas anchas.
- Una dependencia puede romper bundle/licencia: revisar compatibilidad y licencia antes de adoptarla.
- Reducir líneas puede ocultar contexto: lista accesible completa y cardinalidad semántica en fixtures.
- Navegadores/zoom pueden variar píxeles: viewport y fuentes controlados, tolerancia 1 px y sin coordenadas absolutas como única evidencia.
