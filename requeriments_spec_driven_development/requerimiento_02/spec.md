# Spec — requerimiento_02: Árbol Causal RCA Independiente

## Metadata
- Requirement ID: `requerimiento_02`
- Estado: `vencido` — requisito inicial reformulado; no continuar este flujo.
- Autor del spec: `requirements-agent`
- Fecha: 2026-05-27
- Fuente: solicitud humana + referencia de diseño en `requerimientos_cliente/requerimiento_02/DESIGN.md`, `code.html` y `screen.png`

---

## Overview

Este requerimiento añade una **nueva página Dash independiente** para análisis causal tipo RCA, inspirada en la referencia visual del directorio `requerimientos_cliente/requerimiento_02/`.

La nueva página no sustituye a la página existente `analisis_causas` ni a la vista `arbol`. Debe registrarse como una **ruta separada** y coexistir con las páginas actuales sin romper sus contratos.

La experiencia objetivo es una pantalla de investigación con:
1. barra superior con contexto de la investigación,
2. navegación lateral,
3. lienzo central con árbol causal de tarjetas y conectores,
4. panel fijo de detalle del nodo seleccionado,
5. controles de zoom/pan,
6. leyenda de estados,
7. acciones de evaluación sobre hipótesis y causas.

La implementación debe reutilizar los datos ya persistidos del dominio causal existente cuando sea posible, sin introducir un nuevo modelo de datos si el actual cubre el flujo. La referencia visual es vinculante para la composición UI/UX, la jerarquía visual y los tokens de estilo.

Ruta propuesta para la nueva página: `/analisis-causas-v2`.

---

## Functional Requirements

### FR-01: Ruta independiente y contexto de apertura

El sistema deberá registrar una nueva página Dash independiente con ruta propia distinta de `/analisis-causas` y `/arbol`.

- La ruta propuesta es `/analisis-causas-v2`.
- La página deberá poder abrirse con contexto por query params, como mínimo `contrato_id` y opcionalmente `analisis_id` y `causa_id`.
- Si no se envía contexto, el sistema deberá seleccionar de forma determinista un contrato disponible y, si existe, la sesión de análisis abierta más reciente.
- La carga de esta página no deberá modificar el comportamiento, layout ni callbacks de `analisis_causas` ni de `arbol`.

### FR-02: Shell visual basado en la referencia

La página deberá reproducir la estructura visual de la referencia:

- barra superior fija con nombre del producto, título de la investigación y acciones globales;
- barra lateral izquierda con navegación y acción principal;
- área central para el árbol causal;
- panel derecho fijo para detalles del nodo;
- leyenda de estados y controles flotantes de zoom.

La navegación lateral deberá mostrar al menos los elementos:

- `Tree View` como sección activa,
- `Evidence Log`,
- `Timeline`,
- `Contributors`,
- `Settings`.

Solo `Tree View` será funcional en este requerimiento; el resto podrán ser enlaces inertes o placeholders hasta futuros requerimientos.

### FR-03: Árbol causal en lienzo interactivo

El sistema deberá renderizar el árbol causal del contexto seleccionado como un lienzo navegable de tarjetas conectadas.

- Cada nodo deberá mostrarse como una tarjeta con título, categoría/tipo y descripción breve.
- Los conectores entre nodos deberán seguir un trazado ortogonal visualmente similar al de la referencia.
- El árbol deberá soportar niveles jerárquicos múltiples sin romper el layout.
- El nodo raíz deberá destacarse como problema principal o nodo principal de la investigación.
- El nodo seleccionado deberá recibir un estado visual de foco activo.
- El sistema deberá mostrar una leyenda de estados con, al menos, `Retained`, `Discarded` y `Pending`.

### FR-04: Detalle del nodo seleccionado

El panel derecho deberá mostrar el detalle del nodo seleccionado.

- El panel deberá incluir estado, identificador o nombre del nodo, descripción, categoría y responsable si existe en los datos.
- El panel deberá listar las hipótesis asociadas al nodo seleccionado.
- Cada hipótesis deberá mostrar su identificador, descripción o resumen, estado de revisión y un campo de nota o referencia de evidencia.
- El panel deberá permitir editar el estado de revisión de la hipótesis mediante acciones explícitas de `Verify` y `Discard`.
- El panel deberá permitir capturar una nota breve asociada a la evaluación.

### FR-05: Persistencia de evaluaciones y guardado explícito

La página deberá permitir que las decisiones de evaluación se gestionen con un flujo explícito de guardado.

- Los cambios de `Verify` / `Discard` y las notas de evidencia deberán poder mantenerse en estado provisional hasta que el usuario confirme `Save Changes`.
- Al pulsar `Save Changes`, el sistema deberá persistir los cambios en el almacenamiento existente del dominio causal.
- El guardado deberá refrescar el árbol y el panel de detalle sin recarga completa de la página.
- Si no hay cambios pendientes, el sistema deberá evitar escrituras innecesarias.

### FR-06: Creación de causas raíz desde la vista

La página deberá exponer una acción `Add Root Cause` desde la navegación lateral.

- La acción deberá abrir un flujo de creación para una nueva causa de primer nivel asociada al contrato seleccionado.
- La causa creada deberá guardarse con `parent_id = NULL`.
- Tras la creación, el árbol deberá refrescarse y mostrar el nuevo nodo sin salir de la página.

---

## Constraints and Assumptions

- La nueva página debe coexistir con `analisis_causas` y `arbol`; no es un reemplazo.
- Se reutilizarán, cuando aplique, los repositorios y tablas ya existentes del dominio causal y de sesiones de análisis.
- No se requiere un nuevo esquema de base de datos si el actual cubre la funcionalidad descrita.
- La referencia `DESIGN.md` define un sistema visual industrial, minimalista y analítico que debe tratarse como binding para esta página.
- La implementación debe seguir el contrato de arquitectura Dash modular del proyecto.
- `app.py` no debe incorporar lógica de negocio; solo bootstrap y registro de la nueva página, conforme a la arquitectura del repositorio.
- Las secciones `Evidence Log`, `Timeline`, `Contributors` y `Settings` no forman parte funcional de este requerimiento.

### UI / UX binding from design reference

- Tipografía principal: `Inter`.
- Tipografía técnica / metadatos: `JetBrains Mono`.
- Color primario: `#1a365d`.
- Superficies claras con alto contraste funcional.
- Radios pequeños, geométricos, no pill.
- Conectores de árbol de 2px con routing ortogonal.
- Panel derecho fijo de `380px` en escritorio amplio.
- Separación del árbol con gutter horizontal de `64px` y vertical de `40px`.
- Estados visuales obligatorios:
  - verde para retenido/verificado,
  - rojo para descartado,
  - ámbar para pendiente,
  - foco activo en azul primario.

---

## Acceptance Criteria

### AC — FR-01: Ruta independiente y contexto

| ID | Criterio |
|----|----------|
| AC-01 | La aplicación registra una ruta nueva independiente. **Criterio:** existe una página accesible en `/analisis-causas-v2` y las rutas `/analisis-causas` y `/arbol` siguen resolviendo igual tras el cambio. |
| AC-02 | La página acepta contexto por query params. **Criterio:** abrir `/analisis-causas-v2?contrato_id=1&analisis_id=7&causa_id=9` carga la vista con ese contexto o muestra error controlado si el contexto no existe. |
| AC-03 | La carga sin contexto es determinista. **Criterio:** sin query params, la página selecciona el mismo contrato base y la misma sesión abierta prioritaria según la regla definida en backend. |

### AC — FR-02: Shell visual

| ID | Criterio |
|----|----------|
| AC-04 | La página muestra barra superior, sidebar, lienzo central, panel derecho y leyenda. **Criterio:** el DOM renderiza esas 5 zonas visibles en la vista desktop. |
| AC-05 | La navegación lateral contiene los 5 elementos definidos. **Criterio:** `Tree View`, `Evidence Log`, `Timeline`, `Contributors` y `Settings` aparecen en la barra lateral; `Tree View` aparece como activo. |
| AC-06 | Solo `Tree View` es funcional en este requerimiento. **Criterio:** los otros elementos no ejecutan lógica de negocio nueva ni requieren nuevas tablas o callbacks específicos en este requerimiento. |

### AC — FR-03: Árbol causal

| ID | Criterio |
|----|----------|
| AC-07 | El lienzo renderiza el árbol causal del contexto seleccionado. **Criterio:** el número de nodos visuales coincide con el número de causas recuperadas para el contexto seleccionado. |
| AC-08 | Los nodos están conectados con trazado ortogonal. **Criterio:** la UI muestra conectores de 2px con cambios de dirección en ángulo recto, no curvas. |
| AC-09 | El nodo seleccionado recibe foco visual. **Criterio:** al seleccionar un nodo, su tarjeta cambia a estado activo con resaltado en azul primario y sombra sutil. |
| AC-10 | La leyenda de estados está presente. **Criterio:** el componente de leyenda muestra al menos tres estados: retenido, descartado y pendiente. |

### AC — FR-04: Detalle del nodo

| ID | Criterio |
|----|----------|
| AC-11 | Seleccionar un nodo actualiza el panel derecho. **Criterio:** al hacer click en una tarjeta del árbol, el panel derecho muestra sus datos y su lista de hipótesis asociadas. |
| AC-12 | El panel incluye las acciones `Verify` y `Discard` por hipótesis. **Criterio:** cada hipótesis renderizada muestra ambos controles y un campo para nota o referencia. |
| AC-13 | El panel muestra metadatos del nodo. **Criterio:** el panel expone título, descripción, categoría y estado del nodo, y el estado visual corresponde al estado persistido. |

### AC — FR-05: Guardado

| ID | Criterio |
|----|----------|
| AC-14 | Las decisiones de evaluación pueden quedar en estado provisional. **Criterio:** cambiar `Verify` / `Discard` no altera la base de datos hasta pulsar `Save Changes`. |
| AC-15 | `Save Changes` persiste cambios en un único guardado lógico. **Criterio:** tras pulsar el botón, los cambios quedan almacenados y se recuperan tras refrescar la página o reabrir la ruta. |
| AC-16 | El guardado no recarga toda la página. **Criterio:** la UI se actualiza mediante callbacks o actualizaciones parciales sin `window.location.reload()`. |

### AC — FR-06: Creación de causa raíz

| ID | Criterio |
|----|----------|
| AC-17 | `Add Root Cause` abre el flujo de creación. **Criterio:** el botón lateral muestra un modal, panel o pantalla de alta para una causa de primer nivel asociada al contrato seleccionado. |
| AC-18 | La nueva causa se crea como nodo de primer nivel. **Criterio:** la persistencia genera un registro con `parent_id = NULL` y el árbol se refresca mostrando el nuevo nodo. |

### AC — NFR / UI

| ID | Criterio |
|----|----------|
| AC-19 | La UI respeta la escala visual de la referencia. **Criterio:** se verifican `Inter`, `JetBrains Mono`, radio pequeño, conectores de 2px y panel derecho de `380px` en escritorio ancho. |
| AC-20 | La vista es responsive. **Criterio:** por debajo de `xl`, el panel derecho deja de ser fijo lateral y la página se reorganiza sin overflow horizontal permanente. |
| AC-21 | La vista soporta una carga razonable de nodos. **Criterio:** un árbol de 200 nodos se renderiza sin error y mantiene interacción básica de selección y guardado en tiempos aceptables para uso local. |

---

## Questions for Clarification

Sin preguntas bloqueantes. La ambigüedad principal fue resuelta: el alcance es una página nueva e independiente, no una variante interna de `analisis_causas`.

---

## Decision Log

| ID | Decisión | Razón |
|----|----------|-------|
| D-01 | La nueva funcionalidad se implementa como ruta independiente `/analisis-causas-v2`. | Evita colisiones funcionales con `analisis_causas` y hace explícita la coexistencia de ambas experiencias. |
| D-02 | La referencia visual `requerimiento_02/DESIGN.md` es vinculante para layout, jerarquía visual y tokens de UI. | La solicitud del usuario exige seguir esas reglas de diseño como base del nuevo frontend. |
| D-03 | La nueva página reutiliza, cuando aplica, los datos y repositorios del dominio causal existente. | Reduce duplicación y evita introducir un nuevo esquema de datos innecesario para un cambio de interfaz. |
| D-04 | Las secciones `Evidence Log`, `Timeline`, `Contributors` y `Settings` se consideran fuera de alcance funcional en este requerimiento. | El objetivo principal es el visor RCA y su interacción base; esas áreas pueden abrirse en requerimientos posteriores. |

---

## Amendments

Sin enmiendas registradas en este momento.
