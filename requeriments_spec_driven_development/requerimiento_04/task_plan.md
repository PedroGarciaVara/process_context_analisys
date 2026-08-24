# Task Plan — requerimiento_04: Migración completa del frontend a webapp Java y reestructuración clean architecture

## Metadata
- Requirement ID: `requerimiento_04`
- Spec File: `./requeriments_spec_driven_development/requerimiento_04/spec.md`
- Status: `vencido`
- Allowed Status Values:
  - `pending_human_validation`
  - `approved`
  - `in_progress`
  - `blocked`
  - `implementado_pendiente_validacion`
  - `no_conforme`
  - `en_correccion`
  - `done`
- Owner: `plan-task-agent`
- Created At: `2026-05-30`
- Last Updated: `2026-05-30`

---

## Objective

Implementar la migración completa del frontend actual basado en Dash hacia una nueva `webapp_java` con HTML + CSS + JavaScript y backend `Python Flask` interno de Dataiku, reestructurando el producto bajo el boundary `uc_bib_solv/` y manteniendo `webapp_dash/` como fallback temporal.

La migración debe conservar la paridad funcional de todas las pantallas actuales y, de forma obligatoria, mantener el estándar visual y estructural de los árboles causales definido por las páginas actuales `arbol` y `analisis_causas_v2`.

---

## Functional Inventory

### Current pages to migrate

| Page | Route | Current responsibility | Relevant functions / callbacks |
| --- | --- | --- | --- |
| `inicio` | `/` | Selector inicial de proceso y contrato para abrir el árbol causal. | `app/pages/inicio.py` y callbacks en `app/callbacks/proceso_callbacks.py`: `inicio_contratos_options`, `configurar_enlace_arbol`. |
| `procesos` | `/procesos` | CRUD de procesos con tabla, selección y formulario. | `refresh_procesos`, `cargar_formulario`, `crud_proceso`, `_process_rows`. |
| `contratos` | `/contratos` | CRUD de contratos, filtro por activo, asociación de máquinas. | `load_contratos`, `cargar_formulario`, `crud_contrato`, `guardar_asociaciones`, `_contract_rows`, `_filtro_to_bool`, `_proceso_options`, `_maquina_options`. |
| `maquinas` | `/maquinas` | CRUD de máquinas con tabla y formulario. | `refresh_maquinas`, `cargar_formulario`, `crud_maquina`, `_maquina_rows`. |
| `causa_detalle` | `/causa-detalle` | Edición de causa e hipótesis, modales y navegación de detalle. | `_parse_search`, `_build_search`, `_context_message`, `_resolve_detail_context`, `_cause_form_values`, `_cause_save_label`, `_hipotesis_form_values`, `_hipotesis_save_label`, `_hipotesis_card`, `sync_detail_context`, `select_hipotesis`, `save_cause`, `save_hipotesis`, `open_delete_modal`, `confirm_delete`. |
| `arbol` | `/arbol` | Árbol causal de creación y navegación por contrato. | `_tree_title`, `_select_default_cause`, `sync_arbol_context`, `select_node`, `update_zoom`, `toggle_root_modal`, `save_root_cause`, `open_delete_modal`, `confirm_delete`. |
| `analisis_causas_v2` | `/analisis-causas-v2` | Árbol causal con flujo provisional de evaluación y panel lateral derecho. | `_parse_search`, `_first_contract`, `_resolve_context`, `_load_tree_context`, `_hydrate_pending_store`, `hydrate_context`, `render_dashboard`, `select_tree_node`, `update_hypothesis_note`, `update_hypothesis_state`, `update_zoom`, `toggle_root_modal`, `save_root_cause`, `save_changes`. |

### Canonical tree rendering standard to preserve

La nueva `webapp_java` debe tomar como referencia estricta el estándar actual implementado en:
- `app/components/panel_arbol.py`
- `app/components/panel_analisis_causas_v2.py`

Este estándar incluye, sin simplificación:
- árbol jerárquico ortogonal con conectores de 2px en `Slate-300`;
- cards de ancho fijo;
- panel lateral derecho fijo de detalle;
- topbar, sidebar contextual, canvas central y acciones de zoom;
- chips de estado y jerarquía visual industrial;
- conectores verticales y horizontales con continuidad visual;
- regla de render para hijos, tarjetas y paneles idéntica en ambos árboles;
- acciones funcionales de seleccionar nodo, crear raíz, crear hija, eliminar nodo y actualizar detalle;
- en `analisis_causas_v2`, flujo de evaluación provisional y acciones Verify/Discard con panel de hipótesis.

No se acepta una versión simplificada, genérica o “parecida” del árbol en la migración.

---

## Scope

### In Scope
- Reorganización del boundary del producto bajo `uc_bib_solv/`.
- Separación explícita entre `webapp_dash/` como fallback y `webapp_java/` como objetivo.
- Migración completa del frontend actual a `webapp_java`.
- Implementación del frontend Java con HTML/CSS/JavaScript y comunicación por `fetch()`.
- Implementación del backend Python Flask interno de Dataiku con capas `routes`, `services`, `repositories` y `utils`.
- Migración de todas las páginas actuales inventariadas arriba.
- Preservación del estándar de árbol causal de `arbol` y `analisis_causas_v2`.
- Conservación temporal de la aplicación Dash como fallback mientras se valida la migración.

### Out of Scope
- Nuevas funcionalidades de negocio no presentes hoy.
- Rediseño funcional del dominio causal más allá de la paridad actual.
- Eliminación inmediata de `webapp_dash/` antes de validación final.
- Cambios de esquema de datos no requeridos por la migración.
- Nuevos mecanismos de autenticación o autorización no solicitados.
- Integraciones externas adicionales no definidas en el spec.

---

## Inputs
- Client requirement: `./requerimientos_cliente/requerimiento_04/requerimiento_04.md`
- Supporting migration notes: `./requerimientos_cliente/requerimiento_04/instrucciones_migracion.md`
- Technical specification: `./requeriments_spec_driven_development/requerimiento_04/spec.md`
- Existing Dash page inventory:
  - `app/pages/inicio.py`
  - `app/pages/procesos.py`
  - `app/pages/contratos.py`
  - `app/pages/maquinas.py`
  - `app/pages/causa_detalle.py`
  - `app/pages/arbol.py`
  - `app/pages/analisis_causas_v2.py`
- Existing callback inventory:
  - `app/callbacks/proceso_callbacks.py`
  - `app/callbacks/contrato_callbacks.py`
  - `app/callbacks/maquina_callbacks.py`
  - `app/callbacks/causa_detalle_callbacks.py`
  - `app/callbacks/causa_callbacks.py`
  - `app/callbacks/analisis_causas_v2_callbacks.py`
- Canonical tree components:
  - `app/components/panel_arbol.py`
  - `app/components/panel_analisis_causas_v2.py`
- Supporting docs:
  - `./README.md`
  - `./requerimientos_cliente/traza_requerimiento.md`

---

## Assumptions
- El inventario de páginas y callbacks actuales es la fuente de verdad para la equivalencia funcional.
- La UI Java debe reproducir la experiencia actual sin introducir variaciones visibles no justificadas.
- El estándar de árbol de `arbol` y `analisis_causas_v2` es la referencia visual y estructural obligatoria para la migración.
- El fallback Dash se mantiene operativo durante toda la validación de la nueva webapp Java.
- El backend Flask interno de Dataiku es suficiente para exponer las operaciones requeridas sin crear un backend externo adicional.

---

## Dependencies
- Sub-agents / skills relevantes:
  - `requirements-agent`
  - `plan-task-agent`
  - `execute-agent`
  - `documentation-agent`
  - `context-agent`
  - `webapp-architecture`
  - `project-structure-sdd`
  - `frontend-design`
  - `web-design-guidelines`
  - `git-workflow`
- Technical dependencies:
  - compatibilidad con runtime de Dataiku Webapp
  - acceso interno a Dataiku API, datasets, SQLExecutor2, Managed Folders y Variables de Proyecto
  - backend Flask para servir la UI y exponer APIs
  - coexistencia temporal con la app Dash actual

---

## Execution Strategy

1. Congelar el inventario funcional del frontend actual y convertirlo en mapa de migración página por página.
2. Reorganizar el boundary del producto bajo `uc_bib_solv/` y separar `webapp_dash/` de `webapp_java/`.
3. Crear la base de `webapp_java` con `index.html`, CSS, JavaScript modular, router, cliente HTTP y backend Flask interno.
4. Migrar primero la navegación y las pantallas base (`inicio`, `procesos`, `contratos`, `maquinas`).
5. Migrar después `causa_detalle`, preservando edición de causas, hipótesis y modales.
6. Migrar `arbol` y `analisis_causas_v2` como componentes de máxima criticidad visual, usando el estándar actual como contrato inmutable.
7. Implementar capas backend para Dataiku y conectar toda la UI Java exclusivamente por `fetch()`.
8. Mantener `webapp_dash/` como fallback funcional durante toda la transición.
9. Verificar paridad funcional, consistencia visual y cumplimiento del estándar del árbol antes de pasar a validación humana final.

---

## Human Validation Gates

### Gate 1: Spec Validation
- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `pending`
- Evidence:
  - Este `task_plan.md` se apoya en el `spec.md` validado por el programador humano.

### Gate 2: Task Plan Approval
- Required State Before Implementation: aprobación humana explícita de este `task_plan.md`.
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `execute-agent` no debe implementar este plan hasta que Gate 2 esté aprobado.

### Gate 3: Final Implementation Validation
- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `done` solo es válido tras conformidad final humana y ausencia de NCs abiertas o `in_correction`.

---

## Tasks

### T1. Baseline funcional y mapa de migración
- Goal: inventariar con precisión el frontend actual y fijar el contrato de equivalencia funcional para la migración.
- Inputs:
  - `app/pages/*.py`
  - `app/callbacks/*.py`
  - `app/components/panel_arbol.py`
  - `app/components/panel_analisis_causas_v2.py`
- Actions:
  - documentar rutas, responsabilidades y callbacks de cada página;
  - mapear cada pantalla actual a su equivalente en `webapp_java`;
  - fijar `arbol` y `analisis_causas_v2` como estándar visual/estructural no negociable;
  - detectar dependencias de navegación entre páginas.
- Output:
  - mapa de migración funcional y lista de referencia para el resto de tareas.
- Status: `pending`

### T2. Reestructuración del boundary y separación Dash / Java
- Goal: organizar el código bajo `uc_bib_solv/` con separación explícita entre fallback Dash y objetivo Java.
- Inputs:
  - estado actual del repositorio
  - spec validado
- Actions:
  - mover/ubicar el código de producto bajo `uc_bib_solv/`;
  - separar `webapp_dash/` como fallback temporal;
  - crear `webapp_java/` como boundary del frontend objetivo;
  - ajustar importaciones y puntos de arranque para evitar mezcla de capas.
- Output:
  - estructura de carpetas alineada con el spec.
- Status: `pending`

### T3. Esqueleto técnico de `webapp_java`
- Goal: crear la base técnica de la nueva webapp Java con frontend modular y backend Flask interno.
- Inputs:
  - `instrucciones_migracion.md`
  - spec validado
  - inventario funcional de T1
- Actions:
  - crear `webapp_java/webapp/index.html`;
  - crear estructura `css/`, `js/core/`, `js/api/`, `js/views/`, `js/components/`, `js/services/`;
  - crear `webapp_java/python-backend/app.py` y carpetas `routes/`, `services/`, `repositories/`, `utils/`;
  - definir el patrón de carga de vistas, routing y cliente HTTP;
  - dejar listo el esqueleto para migrar páginas sin mezclar lógica de negocio.
- Output:
  - base operativa de la nueva webapp Java.
- Status: `pending`

### T4. Migración de navegación y páginas operativas base
- Goal: migrar la experiencia de navegación y las páginas de catálogo/selección.
- Inputs:
  - `inicio`
  - `procesos`
  - `contratos`
  - `maquinas`
  - callbacks asociados
- Actions:
  - migrar la pantalla inicial con selector de proceso y contrato;
  - migrar CRUD de procesos;
  - migrar CRUD de contratos y asociación de máquinas;
  - migrar CRUD de máquinas;
  - mantener tablas, filtros y estados de selección equivalentes;
  - conectar las vistas nuevas al backend Flask mediante `fetch()`.
- Output:
  - páginas base de operación migradas en `webapp_java`.
- Status: `pending`

### T5. Migración de detalle de causa e hipótesis
- Goal: trasladar el flujo de edición de causa e hipótesis sin pérdida de comportamiento.
- Inputs:
  - `app/pages/causa_detalle.py`
  - `app/components/panel_edicion.py`
  - `app/components/panel_hipotesis.py`
  - `app/callbacks/causa_detalle_callbacks.py`
- Actions:
  - migrar contexto de detalle por query string o selección;
  - migrar edición de causa;
  - migrar listado y edición de hipótesis;
  - migrar modales de eliminación;
  - preservar navegación de retorno al árbol;
  - exponer las operaciones del detalle vía backend Flask.
- Output:
  - pantalla de detalle funcional equivalente a la actual.
- Status: `pending`

### T6. Migración del árbol causal de creación con estándar visual preservado
- Goal: implementar en `webapp_java` el árbol causal de creación respetando exactamente el estándar visual y estructural actual de `arbol`.
- Inputs:
  - `app/pages/arbol.py`
  - `app/components/panel_arbol.py`
  - `app/callbacks/causa_callbacks.py`
- Actions:
  - migrar árbol jerárquico ortogonal con las mismas reglas de conectores;
  - mantener cards de ancho fijo, panel lateral derecho y top context;
  - migrar selección de nodo, zoom, creación de raíz, creación de hija y eliminación;
  - preservar la relación visual padre-hijos y el comportamiento del modal de confirmación;
  - validar que el DOM/CSS del árbol Java reproduzca el patrón actual sin simplificación.
- Output:
  - árbol causal de creación migrado con paridad visual y funcional.
- Status: `pending`

### T7. Migración del árbol de análisis con evaluación provisional
- Goal: trasladar `analisis_causas_v2` como referencia de árbol causal estándar con flujo de evaluación.
- Inputs:
  - `app/pages/analisis_causas_v2.py`
  - `app/components/panel_analisis_causas_v2.py`
  - `app/callbacks/analisis_causas_v2_callbacks.py`
- Actions:
  - migrar el layout de análisis con topbar, sidebar, canvas y panel derecho;
  - conservar el estándar exacto de renderizado del árbol y de las cards de hipótesis;
  - migrar el flujo provisional de evaluación, notas y botones Verify/Discard;
  - migrar creación de raíz, selección de nodo, zoom y persistencia de cambios;
  - asegurar que `arbol` y `analisis_causas_v2` comparten el mismo lenguaje visual de árbol causal.
- Output:
  - dashboard de análisis migrado y alineado con el estándar vigente.
- Status: `pending`

### T8. Backend Flask/Dataiku y capa de acceso a datos
- Goal: construir la capa backend que permita a la UI Java operar sin depender de Dash.
- Inputs:
  - funcionalidades actuales de repositorios y persistencia
  - requerimientos de acceso a Dataiku
- Actions:
  - implementar rutas HTTP en `python-backend/routes/`;
  - implementar servicios de negocio en `python-backend/services/`;
  - implementar repositorios para datasets, SQLExecutor2, Managed Folders y variables del proyecto;
  - exponer operaciones equivalentes a las actuales de procesos, contratos, máquinas, causas, hipótesis y análisis;
  - garantizar que la UI solo consuma esta capa mediante `fetch()`.
- Output:
  - backend interno funcional y desacoplado de la interfaz.
- Status: `pending`

### T9. Coexistencia, fallback y traspaso operativo
- Goal: asegurar que la nueva webapp Java convive con el fallback Dash durante la validación.
- Inputs:
  - estructura final de `webapp_dash/`
  - estructura final de `webapp_java/`
- Actions:
  - mantener la app Dash operativa como fallback;
  - evitar que el fallback reciba lógica funcional exclusiva del nuevo frontend;
  - documentar rutas y decisiones de coexistencia;
  - verificar que el traspaso no rompe el arranque ni la navegación.
- Output:
  - coexistencia operativa validable entre ambas superficies.
- Status: `pending`

### T10. Verificación de paridad funcional y visual
- Goal: comprobar que la migración cumple el spec y que el estándar de árbol no se degrada.
- Inputs:
  - implementación completa
  - spec validado
- Actions:
  - ejecutar verificación sintáctica y de build en backend Python;
  - revisar inventario de páginas migradas contra el mapa de T1;
  - validar visualmente el árbol de `arbol` y `analisis_causas_v2` en la nueva webapp;
  - comprobar que el fallback Dash sigue operativo;
  - asegurar que no hay reglas de negocio en la UI Java.
- Output:
  - evidencias de conformidad para Gate 3.
- Status: `pending`

---

## Acceptance Criteria Traceability

| AC | Covered by |
| --- | --- |
| AC-01 | T1, T2 |
| AC-02 | T2, T9 |
| AC-03 | T2, T3 |
| AC-04 | T4, T5, T6, T7 |
| AC-05 | T8 |
| AC-06 | T3, T4, T5, T6, T7, T8 |
| AC-07 | T2, T9 |

---

## Verification Plan

### Automatic / Command-Line Verification
- Validar estructura esperada de `webapp_java` y `webapp_dash`.
- Ejecutar compilación/sanity check de los módulos Python backend.
- Verificar que las rutas y módulos Java/HTML/CSS/JS referenciados existan.
- Comprobar que la UI Java consume backend por `fetch()` y no por componentes Dash.
- Revisar que no existan simplificaciones del árbol respecto al estándar de `arbol` y `analisis_causas_v2`.

### Manual Verification
- Navegar por `inicio`, `procesos`, `contratos`, `maquinas`, `causa_detalle`, `arbol` y `analisis_causas_v2` en la nueva webapp.
- Confirmar que el árbol causal conserva:
  - ancho de card,
  - conectores ortogonales,
  - panel lateral derecho,
  - acciones de selección, alta, hija y borrado,
  - flujo de evaluación provisional en `analisis_causas_v2`.
- Confirmar que la app Dash sigue disponible como fallback temporal.

---

## Non-Conformity Loop

### Policy
- Si la validación final detecta una no conformidad, no cambiar el estado global a `done`.
- Clasificar la causa raíz como:
  - `spec`
  - `task_plan`
  - `implementation`
- Reabrir el flujo según causa:
  - `spec` -> actualizar `spec.md`, volver a Gate 1 y regenerar o ajustar `task_plan.md`.
  - `task_plan` -> corregir `task_plan.md` y volver a Gate 2.
  - `implementation` -> corregir implementación y repetir Gate 3.
- Cualquier NC `open` o `in_correction` bloquea `done`.

### Open Non-Conformities
- Ninguna registrada al crear el plan.

---

## Risks
- La migración del árbol causal puede degradar la relación visual entre padre, hijos, líneas y panel lateral si se simplifica el DOM o el CSS.
- La coexistencia temporal de Dash y Java puede introducir duplicidad de rutas o confusión de navegación si no se separan bien los entrypoints.
- El backend Flask interno puede requerir ajuste fino para reproducir exactamente el acceso a Dataiku de la capa actual.
- La paridad visual de `analisis_causas_v2` es sensible a pequeños cambios de espaciado, por lo que la validación manual es obligatoria.
- Si se migra la navegación antes de cerrar el inventario funcional, pueden aparecer huecos entre la UI nueva y los callbacks equivalentes.

---

## Verification Checklist
- [ ] `spec.md` validado por el programador humano.
- [ ] `task_plan.md` aprobado para ejecución.
- [ ] Inventario funcional de páginas y callbacks documentado.
- [ ] El estándar del árbol de `arbol` y `analisis_causas_v2` se preserva como contrato de UI.
- [ ] `webapp_dash/` sigue operativo como fallback.
- [ ] `webapp_java/` existe con frontend y backend separados.
- [ ] La UI Java consume backend por `fetch()`.
- [ ] Todas las tareas están completadas o justificadas como no aplicables.
- [ ] Escaneo de higiene pre-commit: sin `print(`, `# DEBUG`, `# FIXME`, `breakpoint()` en archivos de producción.
- [ ] Validación final humana realizada.
- [ ] No conformidades cerradas.
- [ ] Estado final actualizado correctamente.

---

## Closure Rule

Cambiar el estado global a `done` solo cuando:
- Gate 1 esté aprobado.
- Gate 2 esté aprobado.
- Gate 3 esté aprobado por el programador humano.
- Todas las tareas estén completadas o justificadas como no aplicables sin romper AC.
- No existan NCs abiertas o `in_correction`.
- `traza_requerimiento.md` refleje el estado final real.

---

## Amendments

*Esta sección se añade al `spec.md` del requerimiento padre, no al `task_plan.md`,
cuando se captura una enmienda via la fase `receive-amendment`. Es acumulativa:
cada entrada tiene su propio ID.*

### Estructura por entrada

```markdown
### AMD-001
- Fecha: YYYY-MM-DD
- Tipo: A (documentacion) | B (refinamiento spec) | C (enmienda plan) | D (expansion alcance)
- Descripcion: [descripcion breve del aporte recibido]
- Estado: `captured` | `integrated` | `rejected`
- Fase de re-entrada: [validate-spec | validate-task-plan | new-requirement | ninguna]
- Validacion humana: [pendiente | aprobado | rechazado]
- Notas: [decisiones o contexto relevante]
```

### Tipos de enmienda

| Tipo | Artefacto afectado | Gate requerido | Transicion de estado |
| --- | --- | --- | --- |
| A - Documentacion | `spec.md` Decision Log | No | Sin cambio de estado |
| B - Refinamiento spec | `spec.md` + esta seccion | Si, Gate 1 | estado_actual -> `en_enmienda` -> `spec_pendiente_validacion` |
| C - Enmienda plan | `task_plan.md` + `## Amendments` en spec | Si, Gate 2 | estado_actual -> `en_enmienda` -> `en_implementacion` |
| D - Expansion alcance | nuevo `requerimiento_xx` vinculado | Si, nuevo ciclo | padre sin cambio; nuevo req `identificado` |

### IDs de enmienda

Los IDs son correlativos por requerimiento: `AMD-001`, `AMD-002`...
No colisionan con IDs de NC (`NC-001`...).
