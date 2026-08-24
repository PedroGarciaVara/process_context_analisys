# Task Plan - requerimiento_02: Analisis Causas V2 Independiente

## Metadata
- Requirement ID: `requerimiento_02`
- Spec File: `./requeriments_spec_driven_development/requerimiento_02/spec.md`
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
- Created At: `2026-05-27`
- Last Updated: `2026-05-27`

---

## Objective

Implementar una pagina Dash nueva e independiente en `/analisis-causas-v2` que coexista con las paginas existentes `analisis_causas` y `arbol`, reutilice los datos persistidos del dominio causal actual cuando sea posible y reproduzca la referencia visual industrial vinculante del directorio `requerimientos_cliente/requerimiento_02/`.

El resultado esperado es una experiencia de investigacion RCA con:
- ruta propia y contexto por query params,
- shell visual con top bar, sidebar, lienzo causal, panel de detalle y leyenda,
- arbol causal interactivo con seleccion activa,
- panel de detalle con evaluacion de hipotesis,
- guardado explicito de cambios provisionales,
- flujo de alta de causa raiz de primer nivel,
- coexistencia sin romper los contratos actuales de `analisis_causas` y `arbol`.

---

## Scope

### In Scope
- Registrar la nueva pagina Dash en una ruta independiente y enlazarla desde la navegacion global sin alterar el comportamiento de las paginas existentes.
- Construir el shell visual de la pagina v2 siguiendo la referencia industrial: top bar, sidebar, canvas central, panel derecho fijo, leyenda y controles flotantes.
- Renderizar el arbol causal del contexto seleccionado con nodos, conectores ortogonales, foco visual y leyenda de estados.
- Implementar el panel de detalle del nodo seleccionado con estados, metadatos y evaluacion de hipotesis.
- Gestionar cambios provisionales en stores de Dash y persistirlos solo al pulsar `Save Changes`.
- Exponer `Add Root Cause` como flujo de alta de una causa de primer nivel asociada al contrato seleccionado.
- Reutilizar los repositorios y tablas existentes del dominio causal cuando cubran el flujo.
- Verificar que la pagina nueva no rompe las rutas, callbacks ni layouts de `analisis_causas` y `arbol`.

### Out of Scope
- Crear un nuevo esquema de base de datos si el actual cubre el requerimiento.
- Implementar funcionalidad real para `Evidence Log`, `Timeline`, `Contributors` o `Settings`.
- Reescribir la pagina existente `analisis_causas` o la vista `arbol` mas alla de los puntos de integracion necesarios.
- Introducir scoring, ML, LLM, MCP u otras capacidades analiticas no pedidas.
- Cambiar la semantica del dominio causal base fuera de lo necesario para la pagina v2.

---

## Inputs

- Client requirement source package: `./requerimientos_cliente/requerimiento_02/`
- Technical specification: `./requeriments_spec_driven_development/requerimiento_02/spec.md`
- Design reference:
  - `./requerimientos_cliente/requerimiento_02/DESIGN.md`
  - `./requerimientos_cliente/requerimiento_02/code.html`
  - `./requerimientos_cliente/requerimiento_02/screen.png`
- Existing implementation context:
  - `./app/pages/analisis_causas.py`
  - `./app/pages/arbol.py`
  - `./app/callbacks/analisis_causas_callbacks.py`
  - `./app/persistence/analisis_causas_repo.py`
  - `./app/persistence/analisis_causas_detalle_repo.py`
  - `./app/persistence/causa_repo.py`
  - `./app/persistence/hipotesis_repo.py`
  - `./app/components/navbar.py`
  - `./app/callbacks/__init__.py`
  - `./app/domain/analisis_causas.py`
  - `./app/domain/arbol.py`
- Baseline template: `./common_spec_driven_development/templates/task_plan.template.md`
- Supporting docs:
  - `./context.md`
  - `./requerimientos_cliente/traza_requerimiento.md`

---

## Assumptions

- El modelo persistente actual del dominio causal es suficiente para esta pagina v2 y no requiere DDL nuevo.
- La semantica de `Add Root Cause` es crear una causa con `parent_id = NULL` asociada al contrato seleccionado.
- Si no llega `causa_id` por query params, la pagina puede seleccionar de forma determinista el nodo raiz disponible del contrato o dejar el panel vacio si no existe ninguna causa.
- La informacion de `responsable` solo se mostrara si el registro lo trae; no se fuerza nueva persistencia para este campo.
- Los elementos `Evidence Log`, `Timeline`, `Contributors` y `Settings` quedan como placeholders visuales sin logica funcional.
- Los cambios provisionales de `Verify` / `Discard` y notas se guardan solo en memoria de la pagina hasta `Save Changes`.
- La convivencia con `analisis_causas` y `arbol` se limita a registro de ruta, navegacion y callbacks compartidos; no hay redisenos transversales.

---

## Dependencies

- Sub-agents / skills relevantes:
  - `plan-task-agent`
  - `execute-agent`
  - `webapp-architecture`
  - `frontend-design`
  - `dash-callbacks`
  - `domain-logic`
  - `data-model-management`
  - `postgresql-primary-persistence`
  - `git-workflow`
- Technical dependencies:
  - Dash Pages y el registro de callbacks actual del proyecto.
  - Repositorios actuales de causa, hipotesis y sesiones de analisis.
  - Bootstrap/estilos existentes de la app local.
  - PostgreSQL local ya configurado por `app/persistence/db.py` y `config/settings.py`.

---

## Execution Strategy

Orden de ejecucion recomendado:

1. **Routing y bootstrap de pagina**: registrar la nueva ruta y su callback module sin romper las rutas existentes.
2. **Shell visual / layout**: construir la composicion principal con la jerarquia visual del reference design.
3. **Render del arbol**: transformar los datos del dominio en tarjetas conectadas, seleccionables y estables.
4. **Panel de detalle**: mostrar metadatos y acciones de revision sobre el nodo seleccionado.
5. **Estado provisional y guardado**: separar edicion local de persistencia y aplicar guardado explicito solo cuando haya cambios.
6. **Backend / acceso a datos**: incorporar solo los helpers minimos necesarios para la resolucion determinista del contexto y la lectura/escritura del flujo v2.
7. **Verificacion y regresion**: validar sintaxis, rutas, coexistencia y comportamiento funcional con el dataset local.

Principios operativos:
- Usar `dcc.Store` como fuente de verdad del estado visible de la UI.
- Mantener callbacks de accion separados del callback maestro de render.
- Reusar repositorios existentes antes de introducir nuevos modulos de persistencia.
- No tocar el comportamiento de `analisis_causas` y `arbol` mas alla de las referencias de navegacion necesarias.
- Seguir `git-workflow`: commits atomicos por bloque cuando sea posible y sin push a `main` hasta aprobar Gate 3.

---

## Human Validation Gates

### Gate 1: Spec Validation
- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `pending`
- Evidence:
  - El `spec.md` validado define la ruta nueva, el scope y las restricciones de coexistencia.
  - Si aparece una ambiguedad de arquitectura, persistencia o UX que cambie el plan, el flujo debe volver a `spec.md`.

### Gate 2: Task Plan Approval
- Required State Before Implementation: aprobacion humana explicita de este `task_plan.md`.
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `execute-agent` no debe empezar la implementacion hasta que este plan quede aprobado.
  - Cualquier desviacion de alcance despues de esta aprobacion debe entrar como enmienda o NC, segun corresponda.

### Gate 3: Final Implementation Validation
- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `done` solo es valido tras conformidad final humana y sin NCs abiertas o en correccion.
  - La validacion final debe comprobar ruta, coexistencia, UI, guardado, y flujo de alta de causa raiz.

---

## Tasks

### T1. Routing y bootstrap de pagina
- Goal: registrar la nueva pagina `analisis-causas-v2` y su integracion basica sin alterar el comportamiento de `analisis_causas` ni `arbol`.
- Inputs:
  - `./requeriments_spec_driven_development/requerimiento_02/spec.md`
  - `./app/pages/analisis_causas.py`
  - `./app/pages/arbol.py`
  - `./app/components/navbar.py`
  - `./app/callbacks/__init__.py`
- Actions:
  - Crear la nueva pagina Dash en `app/pages/analisis_causas_v2.py` con `register_page` y ruta `/analisis-causas-v2`.
  - Crear el callback module de la pagina v2 y registrar su importacion en `app/callbacks/__init__.py`.
  - Añadir enlace de navegacion a la nueva pagina en `app/components/navbar.py` sin modificar los enlaces existentes.
  - Definir IDs exclusivos con prefijo `analisis-causas-v2-` para evitar colisiones con las paginas actuales.
  - Implementar la resolucion inicial de query params `contrato_id`, `analisis_id` y `causa_id` con fallback determinista.
- Output:
  - Nueva ruta accesible en `/analisis-causas-v2`.
  - Nueva pagina registrada y visible desde la navegacion.
  - Callback module preparado para la pagina v2.
- Status: `pending`

### T2. Shell visual y layout
- Goal: construir la composicion visual de la pagina v2 segun la referencia industrial vinculante.
- Inputs:
  - `./requerimientos_cliente/requerimiento_02/DESIGN.md`
  - `./requerimientos_cliente/requerimiento_02/code.html`
  - `./requerimientos_cliente/requerimiento_02/screen.png`
  - `./app/pages/analisis_causas.py`
  - `./app/pages/arbol.py`
- Actions:
  - Montar top bar con nombre de producto, titulo de investigacion y zona de acciones globales sin inventar funciones nuevas.
  - Montar sidebar con `Tree View` activo y `Evidence Log`, `Timeline`, `Contributors` y `Settings` como placeholders inertes.
  - Reservar el lienzo central, el panel derecho fijo y la leyenda de estados segun la referencia.
  - Incluir el boton `Add Root Cause` en la zona lateral o equivalente de la shell para abrir el flujo de alta.
  - Aplicar los tokens visuales vinculantes: `Inter`, `JetBrains Mono`, `#1a365d`, radios pequenos, conectores de 2px, panel derecho de 380px y gutters 64/40.
  - Asegurar comportamiento responsive por debajo de `xl` sin overflow horizontal permanente.
- Output:
  - Layout funcional y consistente con la referencia.
  - Secciones visuales clave de la pagina v2 definidas sin logica de negocio embebida.
- Status: `pending`

### T3. Render del arbol causal
- Goal: mostrar el arbol causal del contexto seleccionado como lienzo interactivo de tarjetas conectadas.
- Inputs:
  - `./app/domain/arbol.py`
  - `./app/persistence/causa_repo.py`
  - `./app/persistence/hipotesis_repo.py`
  - `./app/components/tarjeta_causa.py`
  - `./requeriments_spec_driven_development/requerimiento_02/spec.md`
- Actions:
  - Reutilizar la reconstruccion del arbol desde `causa_repo.build_tree`.
  - Crear la capa de presentacion para nodos tipo tarjeta con titulo, categoria/tipo y descripcion breve.
  - Dibujar conectores ortogonales de 2px y respetar la separacion visual de la referencia.
  - Resaltar el nodo raiz y el nodo seleccionado con foco activo.
  - Mostrar la leyenda de estados `Retained`, `Discarded` y `Pending` como mapeo visual del dominio.
  - Mantener el render estable para arboles de hasta 200 nodos sin recarga completa.
- Output:
  - Canvas causal interactivo y navegable.
  - Estado visual consistente por nodo y seleccion activa visible.
- Status: `pending`

### T4. Panel de detalle
- Goal: mostrar y editar la informacion del nodo seleccionado y sus hipotesis asociadas.
- Inputs:
  - `./app/persistence/analisis_causas_detalle_repo.py`
  - `./app/persistence/hipotesis_repo.py`
  - `./app/persistence/causa_repo.py`
  - `./app/domain/analisis_causas.py`
- Actions:
  - Renderizar metadatos del nodo seleccionado: identificador o nombre, estado, descripcion, categoria y responsable si existe.
  - Listar las hipotesis asociadas con id, descripcion o resumen, estado de revision y campo de nota o referencia de evidencia.
  - Exponer controles `Verify` y `Discard` por hipotesis.
  - Mantener el panel sincronizado con el nodo seleccionado sin recarga de pagina.
  - Separar el render del detalle de la logica de persistencia mediante stores y callbacks de accion.
- Output:
  - Panel derecho operativo con informacion del nodo y sus hipotesis.
  - Controles de evaluacion visibles y ligados al estado provisional.
- Status: `pending`

### T5. Estado provisional, guardado y alta de causa raiz
- Goal: permitir edicion provisional de evaluaciones y persistencia explicita con `Save Changes`, ademas del alta de causas raiz.
- Inputs:
  - `./app/persistence/analisis_causas_detalle_repo.py`
  - `./app/persistence/causa_repo.py`
  - `./app/persistence/analisis_causas_repo.py`
  - `./app/domain/analisis_causas.py`
- Actions:
  - Introducir stores para cambios pendientes, nodo seleccionado, refresh key y resultado del ultimo guardado.
  - Registrar `Verify` / `Discard` y notas como cambios provisionales sin escribir en base de datos.
  - Comparar el estado provisional con el estado persistido y evitar escrituras cuando no haya diferencias.
  - Persistir el lote de cambios solo al pulsar `Save Changes`, usando la infraestructura de detalle ya existente.
  - Refrescar arbol y panel tras el guardado sin recarga completa de pagina.
  - Implementar el flujo de `Add Root Cause` para crear una causa de primer nivel con `parent_id = NULL` y refrescar el arbol.
  - Verificar que la creacion de causa raiz usa el contrato seleccionado y no altera los contratos ni paginas existentes.
- Output:
  - Flujo de edicion provisional funcionando.
  - Guardado explicito sin escrituras innecesarias.
  - Alta de causa raiz disponible desde la vista v2.
- Status: `pending`

### T6. Backend y acceso a datos de apoyo
- Goal: introducir solo los helpers minimos necesarios para la resolucion determinista del contexto y la proyeccion de datos de la pagina v2.
- Inputs:
  - `./app/persistence/contrato_repo.py`
  - `./app/persistence/analisis_causas_repo.py`
  - `./app/persistence/causa_repo.py`
  - `./app/persistence/hipotesis_repo.py`
  - `./app/domain/analisis_causas.py`
- Actions:
  - Reutilizar los repositorios actuales antes de crear nuevas funciones.
  - Si el flujo lo requiere, agregar helpers puros para resolver el contexto por defecto y mapear estados de visualizacion.
  - Mantener la logica de negocio fuera de Dash y la persistencia concreta fuera de `domain/`.
  - Evitar cualquier cambio de esquema o tabla salvo que una validacion tecnica demuestre que es estrictamente necesario.
  - Mantener la compatibilidad con el dominio causal actual y con las paginas existentes.
- Output:
  - Helpers minimos y focalizados para soportar la pagina v2.
  - Ningun cambio innecesario de esquema o contrato existente.
- Status: `pending`

### T7. Verificacion y regresion
- Goal: validar que la pagina v2 cumple el spec y no rompe el comportamiento existente.
- Inputs:
  - `./requeriments_spec_driven_development/requerimiento_02/spec.md`
  - Codigo implementado en los pasos T1 a T6
  - `./tests/smoke_test.py`
- Actions:
  - Ejecutar verificacion de sintaxis para los archivos tocados.
  - Ejecutar el smoke test local disponible si la conexion a PostgreSQL del entorno lo permite.
  - Verificar manualmente que `/analisis-causas-v2`, `/analisis-causas` y `/arbol` resuelven correctamente.
  - Comprobar el flujo completo: seleccion de contexto, seleccion de nodo, edicion provisional, `Save Changes`, refresh y alta de causa raiz.
  - Revisar que la UI respeta la referencia visual y el comportamiento responsive.
  - Confirmar que no hay regresiones en la navegacion global ni en los callbacks compartidos.
- Output:
  - Evidencia de verificacion tecnica y funcional.
  - Resultado apto para validacion humana final o registro de no conformidad.
- Status: `pending`

---

## Acceptance Criteria Traceability

| AC | Covered by |
| --- | --- |
| AC-01 | T1, T7 |
| AC-02 | T1, T7 |
| AC-03 | T1, T6, T7 |
| AC-04 | T2 |
| AC-05 | T2 |
| AC-06 | T2 |
| AC-07 | T3 |
| AC-08 | T3 |
| AC-09 | T3 |
| AC-10 | T3 |
| AC-11 | T4 |
| AC-12 | T4 |
| AC-13 | T4 |
| AC-14 | T5 |
| AC-15 | T5 |
| AC-16 | T5, T7 |
| AC-17 | T2, T5 |
| AC-18 | T5 |
| AC-19 | T2, T7 |
| AC-20 | T2, T7 |
| AC-21 | T3, T7 |

---

## Verification Plan

### Automatic / Command-Line Verification
- `python3 -m py_compile` para los nuevos modulos y los archivos tocados en la pagina v2, callbacks, dominio y helpers.
- `python3 tests/smoke_test.py` si el entorno local de PostgreSQL y la configuracion del proyecto estan disponibles.
- Reintento de la verificacion si aparece un fallo de sintaxis, import circular o dependencia de entorno.

### Manual Verification
- Abrir `/analisis-causas-v2` y confirmar que el shell visual coincide con la referencia.
- Abrir `/analisis-causas` y `/arbol` y confirmar que siguen resolviendo igual.
- Seleccionar un contrato, un analisis abierto y un nodo; validar que el panel derecho cambia correctamente.
- Marcar hipotesis con `Verify` y `Discard`, comprobar que el estado queda provisional hasta `Save Changes`.
- Confirmar que `Save Changes` persiste y que un refresh recupera el estado guardado.
- Ejecutar `Add Root Cause` y verificar que se crea una causa de primer nivel con refresco inmediato del arbol.
- Validar responsive behavior sin overflow horizontal permanente por debajo de `xl`.

---

## Non-Conformity Loop

### Policy
- Si la validacion final detecta una no conformidad, no cambiar el estado global a `done`.
- Clasificar la causa raiz como:
  - `spec`
  - `task_plan`
  - `implementation`
- Reabrir el flujo segun la causa:
  - `spec` -> actualizar `spec.md`, volver a Gate 1 y regenerar o ajustar `task_plan.md`.
  - `task_plan` -> corregir `task_plan.md` y volver a Gate 2.
  - `implementation` -> corregir la implementacion y repetir Gate 3.
- Cualquier NC en estado `open` o `in_correction` bloquea `done`.

### Open Non-Conformities
- Ninguna registrada al crear el plan.

---

## Risks

- La composicion visual puede requerir ajustes finos para mantener fidelidad a la referencia sin introducir complejidad innecesaria en Dash.
- El render del arbol puede degradarse si el estado visible no se centraliza en stores y callbacks bien separados.
- El flujo de guardado puede introducir escrituras innecesarias si no se compara correctamente el estado provisional con el persistido.
- La navegacion global puede romperse si el nuevo enlace o el registro de callbacks se modifica sin respetar el orden actual de inicializacion.
- La informacion de `responsable` puede no existir en todas las filas; el panel debe degradar con gracia sin bloquear el render.

---

## Verification Checklist

- [ ] `spec.md` validado por el programador humano.
- [ ] `task_plan.md` aprobado para ejecucion.
- [ ] Gate 1 aprobado, Gate 2 aprobado y Gate 3 pendiente o aprobado segun fase.
- [ ] Tareas completadas o justificadas como no aplicables.
- [ ] Escaneo de higiene pre-commit: sin `print(`, `# DEBUG`, `# FIXME`, `breakpoint()` en archivos de produccion.
- [ ] Verificacion de coexistencia: las rutas existentes siguen resolviendo tras el cambio.
- [ ] Validacion final humana realizada.
- [ ] No conformidades cerradas.
- [ ] Estado final actualizado correctamente.

---

## Closure Rule

Cambiar el estado global a `done` solo cuando:
- Gate 1 este aprobado.
- Gate 2 este aprobado.
- Gate 3 este aprobado por el programador humano.
- Todas las tareas esten completadas o justificadas como no aplicables sin romper los AC.
- No existan NCs abiertas o en `in_correction`.
- La traza del requerimiento refleje el estado final real.
