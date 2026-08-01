# Spec — requerimiento_04: Reestructuración clean architecture y migración completa del frontend a webapp Java

## Metadata
- Requirement ID: `requerimiento_04`
- Estado: `spec_validada`
- Autor del spec: `requirements-agent`
- Fecha: 2026-05-30
- Fuente: `requerimientos_cliente/requerimiento_04/requerimiento_04.md` y `requerimientos_cliente/requerimiento_04/instrucciones_migracion.md`

---

## Overview

Este requerimiento redefine la estructura del proyecto para adoptar una organización tipo **clean architecture** y prepara la migración completa del frontend actual basado en Dash hacia una nueva webapp estándar de **HTML + CSS + JavaScript** con backend **Python Flask interno de Dataiku**.

El objetivo funcional es doble:
1. Reordenar el proyecto para que el código de producto viva bajo un boundary explícito `uc_bib_solv/`, separado de los artefactos SDD y de los requerimientos del cliente.
2. Crear dos superficies de aplicación coexistentes:
   - `webapp_dash`: fallback temporal con la implementación actual en Dash.
   - `webapp_java`: nueva webapp objetivo con frontend HTML/CSS/JavaScript y backend Flask interno de Dataiku.

La migración debe ser completa en términos de frontend: toda la experiencia de usuario hoy implementada en Dash deberá tener su equivalente en la nueva webapp Java. Mientras la migración se valida, la versión Dash se conserva como fallback operativo.

El backend debe mantener acceso a las capacidades de Dataiku requeridas por el producto: Dataiku API, Datasets, SQLExecutor2, Managed Folders, Variables de Proyecto, LLMs y APIs internas.

---

## Functional Requirements

### FR-01: Reorganización del boundary principal del producto

El sistema DEBERÁ mover todo el código de producto al directorio principal `uc_bib_solv/`.

- El directorio `app/` actual DEBERÁ dejar de ser el boundary principal del producto.
- El nuevo boundary DEBERÁ concentrar el código de la solución y separar claramente:
  - `webapp_dash/` para el frontend actual en Dash,
  - `webapp_java/` para la nueva webapp objetivo.
- Los artefactos SDD (`requerimientos_cliente/`, `requeriments_spec_driven_development/`, `common_spec_driven_development/`) DEBERÁN permanecer fuera del boundary de producto.
- El código fuente de la aplicación DEBERÁ quedar organizado de forma que la responsabilidad de cada carpeta sea clara y estable.

### FR-02: Separación explícita entre fallback Dash y frontend objetivo Java

El sistema DEBERÁ mantener dos superficies funcionales coexistentes durante la transición.

- `uc_bib_solv/webapp_dash/` DEBERÁ contener todo el frontend actual de Dash.
- `uc_bib_solv/webapp_java/` DEBERÁ contener la nueva implementación objetivo del frontend migrado.
- La aplicación Dash actual DEBERÁ conservarse como fallback temporal mientras la migración se valida.
- La nueva webapp Java NO DEBERÁ depender de componentes Dash para su renderizado de interfaz.
- El fallback Dash NO DEBERÁ recibir nuevas capacidades funcionales que solo existan en la nueva webapp Java, salvo ajustes mínimos necesarios para mantener compatibilidad durante la transición.

### FR-03: Migración completa del frontend a webapp Java

El sistema DEBERÁ replicar en `webapp_java` toda la experiencia funcional de frontend existente en Dash.

- Cada pantalla, panel, modal, lista, tabla, flujo de edición y navegación visible hoy en Dash DEBERÁ tener su equivalente en la nueva webapp Java.
- La interfaz Java DEBERÁ implementar:
  - HTML para estructura y renderizado,
  - CSS para estilo y layout,
  - JavaScript para interacción, routing de cliente, estado local y llamadas `fetch()`.
- La UI Java NO DEBERÁ contener lógica de negocio.
- La lógica de negocio DEBERÁ residir en el backend Python Flask interno de Dataiku.
- La migración DEBERÁ conservar el comportamiento observable del frontend actual salvo aquellos ajustes que sean necesarios por el cambio de tecnología y que queden reflejados en este spec.

### FR-04: Arquitectura interna del frontend Java

El sistema DEBERÁ organizar `webapp_java` siguiendo el patrón definido por `instrucciones_migracion.md`.

Estructura obligatoria:

```text
uc_bib_solv/
  webapp_java/
    webapp/
      index.html
      css/
      js/
        app.js
        core/
        api/
        views/
        components/
        services/
    python-backend/
      app.py
      routes/
      services/
      repositories/
      utils/
```

Responsabilidades obligatorias:

- `webapp/index.html` DEBERÁ ser el punto de entrada visual del frontend Java.
- `webapp/css/` DEBERÁ contener los estilos de presentación.
- `webapp/js/core/` DEBERÁ contener router, estado, eventos y utilidades puras de UI.
- `webapp/js/api/` DEBERÁ encapsular las llamadas `fetch()` hacia el backend.
- `webapp/js/views/` DEBERÁ contener las pantallas o vistas de la aplicación.
- `webapp/js/components/` DEBERÁ contener componentes reutilizables.
- `webapp/js/services/` DEBERÁ contener servicios de UI como notificaciones o permisos de frontend.
- `python-backend/routes/` DEBERÁ contener únicamente handlers HTTP.
- `python-backend/services/` DEBERÁ contener reglas de negocio y orquestación.
- `python-backend/repositories/` DEBERÁ contener acceso a datasets, SQLExecutor2, Managed Folders o APIs de Dataiku.
- `python-backend/utils/` DEBERÁ contener funciones auxiliares compartidas.

### FR-05: Integración con Dataiku desde el backend interno

El sistema DEBERÁ preservar el acceso de backend a las capacidades de Dataiku.

- El backend Python Flask interno DEBERÁ poder acceder a:
  - Dataiku API,
  - Datasets,
  - SQLExecutor2,
  - Managed Folders,
  - Variables de Proyecto,
  - LLMs y APIs internas.
- Las rutas HTTP DEBERÁN actuar como capa de entrada y salida, sin contener reglas de negocio complejas.
- Los servicios DEBERÁN orquestar las operaciones.
- Los repositorios DEBERÁN concentrar la interacción con las fuentes de datos o servicios externos.
- La UI Java DEBERÁ consumir estas capacidades exclusivamente mediante `fetch()`.

### FR-06: Navegación y paridad funcional

El sistema DEBERÁ mantener la paridad funcional de navegación respecto al frontend actual.

- Las pantallas y flujos actuales DEBERÁN existir en la nueva webapp Java con equivalencia funcional.
- La navegación DEBERÁ ser multipágina o SPA según la organización final del frontend, pero siempre con separación clara entre vistas.
- Las validaciones visuales DEBERÁN ejecutarse en frontend.
- Las validaciones de integridad y negocio DEBERÁN ejecutarse en backend.

---

## Non-Functional Requirements

### NFR-01: Separación de responsabilidades

La interfaz Java NO DEBERÁ mezclar lógica de negocio con renderizado.

### NFR-02: Mantenibilidad

La estructura de carpetas DEBERÁ permitir evolución independiente de frontend, backend y fallback Dash sin mezclar responsabilidades.

### NFR-03: Compatibilidad Dataiku

La solución DEBERÁ ser compatible con el modelo de webapp de Dataiku y con acceso interno a sus APIs y recursos.

### NFR-04: Continuidad operativa durante la migración

La versión Dash DEBERÁ permanecer operativa como fallback mientras la nueva webapp Java se valida.

### NFR-05: Consistencia visual y UX

La nueva webapp Java DEBERÁ mantener una experiencia de usuario consistente con el producto actual, evitando cambios no justificados en interacción o jerarquía funcional.

---

## Constraints and Assumptions

- **Stack objetivo:** HTML + CSS + JavaScript + Python Flask interno de Dataiku.
- **Boundary principal:** el proyecto DEBERÁ vivir bajo `uc_bib_solv/`.
- **Fallback temporal:** la app Dash actual se conservará temporalmente durante la validación de la migración.
- **Migración completa del frontend:** toda la experiencia actual de Dash DEBERÁ tener equivalente en `webapp_java`.
- **Sin cambios de dominio por defecto:** este requerimiento no introduce nuevas reglas de negocio ni un nuevo modelo funcional de negocio.
- **Sin nuevo modelo de datos obligatorio:** no se requiere un cambio de esquema como parte intrínseca de la migración del frontend.
- **Compatibilidad Dataiku obligatoria:** se mantiene acceso a API, datasets, SQLExecutor2, Managed Folders, variables y APIs internas.
- **Arquitectura clean:** la separación por capas y responsabilidades será obligatoria para backend y frontend.

---

## Out of Scope

- Nuevas funcionalidades de negocio no presentes en la experiencia actual.
- Rediseño funcional del dominio causal o ampliaciones funcionales del producto.
- Eliminación inmediata del fallback Dash antes de la validación de la nueva webapp Java.
- Cambio de esquema de base de datos no requerido por la migración.
- Autenticación, autorización o RBAC nuevos, salvo que un requerimiento posterior los introduzca.
- Integraciones externas adicionales no mencionadas en `instrucciones_migracion.md`.

---

## Acceptance Criteria

### AC-01: Boundary de producto reorganizado

El sistema DEBERÁ exponer el código de producto bajo `uc_bib_solv/` y mantener los artefactos SDD fuera de ese boundary.

**Criterio:** existe el directorio `uc_bib_solv/` como root funcional del producto y no existe lógica de producto mezclada en la raíz de SDD.

### AC-02: Fallback Dash separado

La implementación Dash actual DEBERÁ quedar confinada a `webapp_dash/`.

**Criterio:** todo el frontend Dash del producto reside dentro de `uc_bib_solv/webapp_dash/`.

### AC-03: Webapp Java creada

El sistema DEBERÁ disponer de una nueva webapp Java con la estructura obligatoria definida en este spec.

**Criterio:** existen `uc_bib_solv/webapp_java/webapp/` y `uc_bib_solv/webapp_java/python-backend/` con sus subdirectorios funcionales.

### AC-04: Paridad de frontend

La nueva webapp Java DEBERÁ cubrir la misma experiencia funcional visible que el frontend Dash actual.

**Criterio:** cada pantalla, modal, tabla, panel y flujo relevante del frontend actual tiene equivalente funcional en la nueva webapp Java.

### AC-05: Backend con acceso a Dataiku

El backend DEBERÁ poder acceder a Dataiku API, datasets, SQLExecutor2, Managed Folders, Variables de Proyecto y APIs internas.

**Criterio:** existen rutas backend que ejercitan esas capacidades sin que la UI Java acceda directamente a dichas fuentes.

### AC-06: Separación de capas

La UI Java DEBERÁ consumir el backend mediante `fetch()` y no contener reglas de negocio.

**Criterio:** la lógica de negocio vive en `python-backend/services/` y el acceso a datos en `python-backend/repositories/`.

### AC-07: Continuidad temporal

La app Dash DEBERÁ permanecer operativa como fallback durante la migración.

**Criterio:** la versión Dash sigue disponible hasta validación expresa de la webapp Java.

---

## Questions for Clarification

Sin preguntas bloqueantes. El alcance fue confirmado:
- migración completa del frontend,
- conservación temporal del fallback Dash.

---

## Decision Log

| ID | Decisión | Responsable | Motivo |
|----|----------|-------------|--------|
| D-01 | La migración abarcará todo el frontend actual de Dash. | Programador humano | Se confirmó que el alcance es migración completa, no parcial. |
| D-02 | La versión Dash actual se conservará temporalmente como fallback mientras se valida la nueva webapp Java. | Programador humano | Permite continuidad operativa durante la transición. |
| D-03 | El boundary principal del producto será `uc_bib_solv/`, con separación explícita entre `webapp_dash/` y `webapp_java/`. | Requirements-agent | Alinea el repo con la estructura clean architecture solicitada y con la instrucción de migración. |
| D-04 | La nueva webapp Java usará HTML/CSS/JavaScript en frontend y Python Flask interno de Dataiku en backend. | Requirements-agent | Es la arquitectura objetivo definida en `instrucciones_migracion.md`. |

---

## Amendments

Sin enmiendas registradas en este momento.
