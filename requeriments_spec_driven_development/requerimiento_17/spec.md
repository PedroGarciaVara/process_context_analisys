# Especificación técnica — Requerimiento 17

**Estado:** `spec_pendiente_validacion`
**Autor:** `requirements-agent`
**Fecha:** 2026-08-20

## Overview

La vista `Contrato` presenta actualmente la creación dentro del subpanel lateral “Gestión del contrato”, junto con las acciones de mantenimiento de un contrato existente. Esta agrupación dificulta descubrir la acción principal de crear.

El cambio solicitado separa la creación de la gestión del contrato: la página mostrará una acción “Crear contrato” en la zona superior y visible de la vista; al activarla abrirá un modal con los mismos datos que usa actualmente la creación; al confirmar se reutilizará el flujo existente de creación. El botón “Crear” se eliminará del subpanel lateral. Las acciones de actualizar, cambiar estado, eliminar y asignar máquinas permanecerán disponibles en dicho subpanel.

### Objetivo

Mejorar la descubribilidad y comprensión del flujo de alta de contratos sin modificar el contrato de datos, las reglas de negocio, la API ni las operaciones de gestión existentes.

### Usuario e historia de usuario

Como usuario de la gestión operativa,
quiero encontrar la acción de crear contrato en la parte superior de la página y completar el alta en un modal,
para iniciar el alta de forma clara sin confundirla con las acciones de mantenimiento del contrato seleccionado.

### Glosario

- **Contrato:** entidad operativa asociada a un proceso.
- **Gestión del contrato:** subpanel lateral contextual del contrato seleccionado.
- **Modal de creación:** diálogo superpuesto que contiene exclusivamente el formulario de alta existente.
- **Asignación de máquinas:** operación independiente que guarda el alcance de máquinas mediante la acción existente del subpanel.

## Functional Requirements

### FR-01 — Acción de creación visible

La vista `Contratos` DEBERÁ mostrar una acción primaria para crear un contrato en la zona superior de la página, dentro del encabezado o área de acciones inmediatamente asociada al título “Contratos”.

CUANDO la página se renderice, EL SISTEMA DEBERÁ mostrar la acción de creación sin requerir seleccionar previamente un contrato.

La acción DEBERÁ usar un elemento `<button>` accesible, conservar el lenguaje visual de las acciones primarias existentes y tener un texto específico equivalente a “Crear contrato”.

### FR-02 — Apertura del modal

CUANDO el usuario active la acción superior de creación, EL SISTEMA DEBERÁ abrir el modal de creación sin cambiar de ruta ni crear datos todavía.

El modal DEBERÁ seguir el patrón de modal existente en la SPA, incluyendo diálogo semántico (`role="dialog"`, `aria-modal="true"`), título asociado, cierre explícito y adaptación a viewport reducido.

El modal DEBERÁ poder cerrarse mediante:

1. la acción de cierre del encabezado;
2. la acción “Cancelar”;
3. la interacción de cierre exterior si ese comportamiento forma parte del patrón modal reutilizado en la vista.

Cerrar o cancelar DEBERÁ dejar intacto el catálogo y no DEBERÁ invocar la API de creación.

### FR-03 — Datos del formulario de creación

El modal DEBERÁ conservar exactamente los campos que usa el flujo actual de creación en `uc_bib_solv/webapp/js/views/contratos_v02.js`:

- `processId`: proceso;
- `name`: nombre;
- `metrica`: métrica;
- `objetivo`: objetivo.

No se DEBERÁ añadir ningún campo nuevo, cambiar nombres de propiedades ni convertir la asignación de máquinas en parte del alta.

Los controles DEBERÁN conservar las etiquetas y tipos de datos compatibles con el formulario actual. Cada control DEBERÁ tener una etiqueta asociada y un estado de foco visible.

### FR-04 — Confirmación de creación

CUANDO el usuario confirme el formulario, EL SISTEMA DEBERÁ invocar el cliente existente `createContract` con un payload equivalente a:

```js
{
  processId,
  name,
  metrica,
  objetivo,
}
```

La implementación DEBERÁ conservar la ruta y el contrato HTTP actual de creación (`POST /api/operational/contracts`). No se requiere modificar backend, persistencia ni esquema.

SI la creación es exitosa, EL SISTEMA DEBERÁ conservar el comportamiento vigente de seleccionar el proceso y el contrato creados cuando la respuesta los proporcione, actualizar el catálogo mediante el mecanismo existente y comunicar el resultado al usuario.

Tras una creación exitosa, el modal DEBERÁ cerrarse o quedar en un estado de finalización inequívoco antes de permitir una nueva alta; la implementación deberá mantener una única acción de confirmación durante la petición.

SI la API devuelve un error, EL SISTEMA DEBERÁ mantener el modal abierto, mostrar el mensaje de error en el contexto del formulario y permitir corregir o cancelar. El mensaje deberá exponerse también a tecnologías de asistencia mediante una región `aria-live="polite"` o equivalente.

### FR-05 — Estados del modal

El modal DEBERÁ contemplar estos estados observables:

| Estado | Comportamiento |
|---|---|
| `closed` | El modal no es visible; la página mantiene su estado normal. |
| `open` | El modal es visible, el formulario está disponible y no se ha enviado una petición. |
| `submitting` | La petición de creación está en curso; se evita el doble envío y se conserva una indicación de progreso. |
| `success` | La creación terminó correctamente; se comunica el resultado, se actualiza el catálogo y el modal se cierra según FR-04. |
| `error` | La creación falló; el modal permanece visible, los datos introducidos se conservan y se muestra un error accionable. |

### FR-06 — Separación de acciones de gestión

El subpanel lateral “Gestión del contrato” NO DEBERÁ mostrar un botón “Crear” ni otra acción duplicada de creación.

El subpanel DEBERÁ conservar, con sus condiciones actuales de disponibilidad y su comportamiento existente:

- actualizar;
- activar/desactivar o cambiar el estado;
- eliminar;
- guardar el alcance o asignación de máquinas.

La eliminación seguirá siendo una operación separada y no se alterará su flujo en este requerimiento.

### FR-07 — Responsabilidades frontend/backend

**Frontend — `uc_bib_solv/webapp/js/views/contratos_v02.js`:**

- renderizar la acción superior;
- renderizar el modal y sus cuatro campos existentes;
- controlar apertura, cierre, cancelación y estados del modal;
- reutilizar `createContract` y el mecanismo existente de refresco/selección;
- mantener las acciones de actualización, estado, eliminación y asignación en el subpanel;
- gestionar accesibilidad, foco, errores visibles y prevención de doble envío.

**Backend — `uc_bib_solv/routes/operational.py`, servicios y persistencia operativa:**

- no requiere cambios de endpoint, payload, validaciones, dominio ni persistencia;
- seguirá recibiendo y validando el mismo contrato de creación;
- seguirá devolviendo la respuesta actual usada para seleccionar y refrescar el catálogo.

Si durante la implementación se detecta que el backend actual no soporta el payload ya usado por la vista, eso será una no conformidad o incidencia independiente, no una ampliación silenciosa de este requerimiento.

## Non-Functional Requirements

### RNF-01 — Accesibilidad

El modal DEBERÁ tener nombre accesible, controles etiquetados, cierre operable por teclado, foco visible y mensajes de error anunciables. El foco no DEBERÁ quedar oculto bajo el overlay. El overlay/modal DEBERÁ contener el desplazamiento en viewport pequeños sin provocar desplazamiento horizontal de la página.

### RNF-02 — Consistencia visual

La acción superior y el modal DEBERÁN reutilizar clases, componentes, tokens y patrones de la SPA existentes. No se DEBERÁ introducir una biblioteca visual nueva, un estilo paralelo ni una estética distinta para esta vista.

### RNF-03 — Compatibilidad responsive

El formulario DEBERÁ seguir siendo usable en escritorio y viewport móvil: el diálogo deberá limitar su altura, permitir scroll interno cuando proceda y mantener acciones de cancelar/confirmar alcanzables.

### RNF-04 — Integridad funcional

El cambio DEBERÁ ser exclusivamente de presentación e interacción frontend. No DEBERÁ cambiar nombres de campos, endpoints, estados persistidos, reglas de negocio ni el flujo de asignación de máquinas.

### RNF-05 — Rendimiento y errores

La apertura del modal DEBERÁ ser inmediata con los datos de referencia ya disponibles en el estado de la vista. La creación seguirá siendo asíncrona; mientras espera, el usuario deberá distinguir que la petición está en curso y no podrá provocar envíos duplicados.

## Responsabilidades frontend/backend

La distribución de responsabilidades queda fijada en FR-07. No se crea modelo de datos, conexión, migración ni script DDL. El backend existente sigue siendo la autoridad para validación de negocio y persistencia; el frontend solo gestiona presentación, validación de interacción y estado transitorio del modal.

## Ubicación de módulos

La implementación DEBERÁ extender el módulo existente `uc_bib_solv/webapp/js/views/contratos_v02.js`, que es propietario de la vista Contratos y de sus listeners actuales.

Podrá reutilizar los componentes existentes `uc_bib_solv/webapp/js/components/modal.js` y los estilos existentes de `uc_bib_solv/webapp/css/modal.css` si encajan con el patrón actual. Si la vista ya mantiene el patrón inline de modal usado por otras vistas V02, podrá seguir ese patrón sin crear un módulo paralelo.

No se DEBERÁ crear una nueva página, ruta, endpoint, servicio, repositorio, tabla, migración o módulo backend para este requerimiento. Los cambios de estilos, si fueran imprescindibles, se limitarán a los archivos CSS existentes de la SPA y formarán parte del mismo cambio de UI.

## Alcance

Incluye:

- mover la entrada de creación a una zona superior y visible;
- abrir un modal al activarla;
- trasladar al modal los cuatro datos del flujo de creación actual;
- ejecutar la creación mediante la API existente;
- mostrar estados, éxito y error del modal;
- retirar el botón Crear del subpanel;
- conservar actualizar, estado, eliminar y asignación.

## Out of Scope

- cambios en campos, nombres de propiedades o reglas de validación del contrato;
- creación de nuevos endpoints o cambios backend;
- cambios en el modelo PostgreSQL, DDL o migraciones;
- incorporación de asignación de máquinas al alta;
- rediseño de la tabla, filtros, navegación a máquinas o árbol causal;
- cambios en actualizar, estado, eliminar o asignar máquinas distintos de mantenerlos disponibles;
- cambio de librería de modales o sistema visual global;
- modificación de otras vistas de procesos, máquinas o árboles.

## Acceptance Criteria

### AC-01 — Acción superior

**CUANDO** se renderiza la vista `Contratos`, **EL SISTEMA DEBERÁ** mostrar una única acción primaria de creación en la zona superior asociada al encabezado.

**Criterio verificable:** inspección DOM de `renderContratosV02`/prueba UI confirma un botón de creación superior visible y accionable sin contrato seleccionado, y no depende del subpanel lateral.

### AC-02 — Apertura sin persistencia

**CUANDO** se activa la acción superior, **EL SISTEMA DEBERÁ** mostrar un diálogo de creación y **NO DEBERÁ** ejecutar `POST /api/operational/contracts` hasta confirmar.

**Criterio verificable:** prueba UI intercepta la red, abre el modal, comprueba `role="dialog"` y verifica cero solicitudes POST antes del submit.

### AC-03 — Campos sin invención

**CUANDO** el modal está abierto, **EL SISTEMA DEBERÁ** mostrar los campos `processId`, `name`, `metrica` y `objetivo`, y ningún campo adicional de creación.

**Criterio verificable:** prueba UI o revisión de markup identifica las cuatro etiquetas/controles y compara el payload del POST con esas cuatro propiedades.

### AC-04 — Creación compatible

**CUANDO** se confirma el formulario con datos válidos, **EL SISTEMA DEBERÁ** llamar al endpoint existente con el payload actual, refrescar el catálogo y aplicar la selección de la respuesta como hace el flujo previo.

**Criterio verificable:** prueba con endpoint interceptado comprueba método, ruta, payload, cierre/estado de éxito y emisión del refresco de catálogo.

### AC-05 — Error recuperable

**SI** la API responde con error, **EL SISTEMA DEBERÁ** mantener abierto el modal, conservar los valores y mostrar un mensaje accionable anunciado con `aria-live` o mecanismo equivalente.

**Criterio verificable:** prueba UI fuerza respuesta 4xx/5xx y comprueba visibilidad del diálogo, persistencia de valores y mensaje accesible.

### AC-06 — Estados y doble envío

**CUANDO** la petición está pendiente, **EL SISTEMA DEBERÁ** mostrar el estado `submitting` y bloquear el doble envío; **CUANDO** finaliza correctamente, **EL SISTEMA DEBERÁ** pasar por `success` y cerrar o finalizar el modal.

**Criterio verificable:** prueba UI retrasa la respuesta, hace dos activaciones y comprueba una sola solicitud; después comprueba el resultado y la actualización visual.

### AC-07 — Acciones conservadas

**CUANDO** se renderiza el subpanel “Gestión del contrato”, **EL SISTEMA DEBERÁ** ocultar/eliminar el botón Crear y conservar actualizar, cambiar estado, eliminar y guardar asignación de máquinas.

**Criterio verificable:** revisión DOM/prueba UI confirma ausencia de `[data-action="contract-create"]` en el subpanel y presencia de `[data-action="contract-update"]`, `[data-action="contract-toggle"]`, `[data-action="contract-delete"]` y `[data-action="contract-save-machines"]` con sus condiciones vigentes.

### AC-08 — Accesibilidad responsive

**CUANDO** el modal se abre en escritorio o viewport móvil, **EL SISTEMA DEBERÁ** mantener título accesible, etiquetas, foco visible, cierre por teclado y scroll interno sin pérdida de las acciones.

**Criterio verificable:** prueba de accesibilidad/UI en viewport de escritorio y móvil verifica roles, nombres accesibles, navegación por teclado y ausencia de overflow horizontal bloqueante.

## Preguntas para aclaración

No quedan preguntas bloqueantes para redactar esta especificación: el requerimiento define la nueva ubicación, el modal, la retirada del botón y las acciones que se conservan; la vista existente define los cuatro campos del alta.

La validación humana de esta especificación sigue pendiente. Cualquier preferencia sobre el texto exacto de la etiqueta, la posición concreta dentro del encabezado o el comportamiento opcional de cierre al hacer clic fuera del diálogo deberá resolverse durante la validación o mediante una enmienda antes de planificar la implementación.

## Decision Log

| Fecha | Decisión | Responsable | Motivo |
|---|---|---|---|
| 2026-08-20 | El frontend activo es la SPA Flask/HTML/CSS/JavaScript; no se trata como una página Dash. | `requirements-agent`, basado en `context.md` | El contexto vigente identifica Dash como legacy retirado del runtime. |
| 2026-08-20 | La creación reutiliza exactamente `processId`, `name`, `metrica` y `objetivo`. | `requirements-agent`, basado en `contratos_v02.js` | Son las propiedades que el handler actual envía a `createContract`. |
| 2026-08-20 | La asignación de máquinas permanece fuera del modal y en su acción existente. | `requirements-agent`, basado en `contratos_v02.js` | La asignación usa una operación independiente `saveContractMachines`. |
| 2026-08-20 | No se modifican API, backend, persistencia ni esquema. | `requirements-agent`, derivado del alcance solicitado | El cambio solicitado es de descubribilidad y flujo UI. |
| 2026-08-20 | El estado queda `spec_pendiente_validacion`. | `requirements-agent` | La aprobación de la especificación corresponde al programador humano antes del plan y la implementación. |

