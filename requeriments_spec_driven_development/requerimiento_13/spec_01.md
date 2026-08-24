# Overview

- **Artefacto:** experiencia de usuario y presentación accesible de process modeling.
- **Estado:** `pendiente_aclaraciones`; depende de `T-00` (`spec_00`).
- **Actores:** usuario humano autenticado, agente como origen de propuesta y backend como autoridad.
- **Alcance:** formulario/visor de descripción y metadatos, gaps, evidencias, inferencias, conflictos, score, ciclo y errores.

## Functional Requirements

- **FR-01:** mostrar descripción, `incomplete_reason` permitido y estados de gap/evidencia/inferencia; errores por campo con código y mensaje accionable.
- **FR-02:** mostrar la versión de JSON Schema aplicada y el resultado de validación; el backend sigue siendo autoridad.
- **FR-03:** exponer faltantes, evidencias ausentes, inferencias, conflictos, incompatibilidades y componentes/versión del score sin fusionar conflictos.
- **FR-04:** mostrar estado actual, acción disponible y razón accionable de rechazo.
- **FR-05:** distinguir visualmente declaración, hecho, evidencia e inferencia y localizar referencias sin secretos.
- **FR-07.1/.2:** extender `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js`; modal con foco gestionado, teclado, nombre/rol semántico, labels, asociación de errores, contraste y no dependencia exclusiva del color. Copy/componentes quedan abiertos.
- **FR-07.3:** consumir únicamente contratos API aprobados; no inventar rutas, verbos ni códigos HTTP.
- **FR-08:** controles mutadores solo se muestran como disponibles al actor autorizado, sin sustituir el control backend.

## Non-Functional Requirements

- Accesibilidad verificable por teclado y tecnología de asistencia.
- Errores frontend equivalentes a backend y seguros para cliente.
- Estados de carga, vacío, conflicto, rechazo y error no ocultarán información relevante ni secretos.
- No se fijan SLA, límites ni copy no aprobados.

## Constraints and Assumptions

- Aplicar `T-00`; no duplicar reglas transversales.
- Se mantiene la ubicación de módulo indicada por FR-07.1 y la convención UI existente.
- Q12 permanece pendiente; no se inventa idioma, copy o componentes.

## Out of Scope

- Rediseño general, IAM, permisos de fila/columna, nuevas rutas no aprobadas, publicación automática y BU/MACBU.

## Acceptance Criteria técnicos medibles

- **AC-01:** matriz de descripción/motivo/schema inválido muestra campo, código y mensaje en frontend y backend.
- **AC-04:** interfaz muestra dos referencias conflictivas separadas y etiqueta conflicto.
- **AC-06:** cada transición autorizada muestra estado y acción; cada rechazo muestra razón.
- **AC-08:** un usuario sin permiso no obtiene acción mutadora efectiva aunque manipule la UI.
- **AC-10:** `tests/e2e/process-modeling.spec.js` y `tests/e2e/bpm-ml-generated-validation.spec.js` verifican teclado, foco, labels/roles, errores asociados y distinción gap/evidencia/inferencia/conflicto.
- **AC-11:** se cubre el punto frontend `tests/unit/process-modeling-metadata.test.mjs` y los E2E indicados.
- **AC-12:** la matriz de trazabilidad del original queda enlazada a IDs concretos antes del plan.

## Questions for Clarification

- Aplican **Q01, Q02, Q03, Q04, Q05, Q06, Q07, Q08, Q09, Q10, Q11 y Q12** de `spec_00`; Q12 bloquea decisiones visuales y las demás condicionan estados/datos mostrados. No se responde ninguna.

## Decision Log

- 2026-08-06 — La UI es adaptador/presentación; las reglas permanecen en backend/dominio según `T-00`.
- 2026-08-06 — Estado `pendiente_aclaraciones`; copy y componentes no decididos.

## Scope, actores, dependencias, módulos y exclusiones

- **Módulo afectado:** `uc_bib_solv/webapp_java/webapp/js/views/process-modeling.js` y pruebas frontend/E2E existentes.
- **Dependencias:** `spec_00`; API/servicio de `spec_02` y `spec_03`; persistencia de `spec_04`; validación de `spec_05`.
- **Auditoría cruzada:** cada elemento visible debe mapear a FR-01..FR-05/07/08 y a un AC; ninguna regla de autorización debe existir solo en UI.

## Auditoría cruzada

Verificar que cada campo visible mantiene fuente/provenance, que el backend rechaza lo inválido y que la UI no convierte inferencias o conflictos en hechos.

## Correspondencia con el spec original

| IDs originales | Cobertura |
|---|---|
| FR-01, FR-02, FR-03, FR-04, FR-05, FR-07, FR-08 | Presentación, feedback y consumo seguro |
| FR-06 | Solo errores/resultado de tools; ejecución en `spec_02` |
| NFR completo | Accesibilidad, consistencia, seguridad y límites; transversal `T-00` |
| AC-01, AC-04, AC-06, AC-08, AC-10, AC-11, AC-12 | Primarios aquí |
| AC-02, AC-03, AC-05, AC-07, AC-09 | Se verifican en hijos y se reflejan en UI cuando corresponda |
| Q01..Q12 | Referenciadas en `spec_00`, sin decisiones nuevas |

### Índice exhaustivo de trazabilidad

| ID original | Cobertura en este spec |
|---|---|
| FR-01 | Campo, incompletitud y errores visibles |
| FR-02 | Schema/version visible |
| FR-03 | Gaps, conflictos y score visibles |
| FR-04 | Estado, acción y rechazo visibles |
| FR-05 | Fuente, evidencia e inferencia visibles |
| FR-06 | Resultado seguro de tools |
| FR-07 | Módulo frontend y consumo API |
| FR-08 | Disponibilidad visual condicionada a permiso backend |
| AC-01 | Matriz y errores |
| AC-02 | Bloqueo de avance reflejado |
| AC-03 | Versión schema mostrada |
| AC-04 | Conflictos separados |
| AC-05 | Resultado score mostrado |
| AC-06 | Estado/transición mostrados |
| AC-07 | Resultado idempotente mostrado sin duplicado |
| AC-08 | Acción no autorizada no efectiva |
| AC-09 | Auditoría no expone secretos |
| AC-10 | E2E accesible |
| AC-11 | Tests frontend/E2E/unit asociados |
| AC-12 | Trazabilidad de pruebas |
