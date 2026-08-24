# Task Plan — requerimiento_06: Modelo de Hipótesis Estructuradas sobre DAG causal

## Metadata
- Requirement ID: `requerimiento_06`
- Spec File: `./requeriments_spec_driven_development/requerimiento_06/spec.md`
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
- Created At: `2026-05-31`
- Last Updated: `2026-05-31`

---

## Objective

Implementar el modelo de hipótesis estructuradas sobre el core causal DAG-first definido en `requerimiento_05`, de modo que cada hipótesis se persista como nodo canónico `HYPOTHESIS` con identidad compartida `hypothesis.node_id = node.id`, atributos de negocio en tablas satélite y un asistente UI de captura/edición en 5 bloques con vista previa final.

El resultado esperado no es una nueva persistencia aislada de hipótesis, sino la sustitución controlada del modelo local legacy `hipotesis(id, causa_id, ...)` por un agregado estructurado apoyado en `node`, `relationship`, `hypothesis`, `hypothesis_required_data` y `hypothesis_expected_evidence`.

---

## Scope

### In Scope
- Extender el esquema PostgreSQL local para soportar hipótesis estructuradas DAG-first.
- Reutilizar y/o completar los artefactos base de `requerimiento_05` para `node`, `relationship`, validaciones DAG y repositorios del grafo.
- Implementar persistencia transaccional para alta, edición, lectura y borrado de hipótesis estructuradas.
- Implementar validaciones de dominio para catálogos controlados, integridad semántica y relación obligatoria con la causa origen.
- Sustituir el uso operativo del repositorio legacy `app/persistence/hipotesis_repo.py` por un modelo DAG-first, sin identidad paralela de hipótesis.
- Integrar un asistente UI de 5 bloques, listas dinámicas y vista previa final dentro del flujo RCA existente.
- Mantener separación explícita entre `app/components/`, `app/callbacks/`, `app/domain/`, `app/persistence/` y `db/schema.sql`.
- Definir estrategia de migración/compatibilidad temporal desde el esquema legacy al nuevo agregado estructurado.
- Verificar que el guardado de hipótesis no dispara ejecución analítica ni introduce términos técnicos prohibidos en la UI.

### Out of Scope
- Ejecutar análisis automáticos, SQL analítico, Python analítico, API o MCP derivados de la hipótesis.
- Introducir un nuevo boundary top-level fuera de `app/` y `db/`.
- Rediseñar de forma completa pantallas RCA ajenas al flujo de hipótesis.
- Habilitar en esta fase reutilización interactiva avanzada de una misma hipótesis entre múltiples causas durante el alta UI.
- Definir un modelo de identidad legacy paralelo o una FK directa `causa_id` como fuente de verdad final.

---

## Inputs
- Technical specification:
  - `./requeriments_spec_driven_development/requerimiento_06/spec.md`
  - `./requeriments_spec_driven_development/requerimiento_05/spec.md`
- Baseline template:
  - `./common_spec_driven_development/templates/task_plan.template.md`
- Current implementation to evolve:
  - `./app/persistence/db.py`
  - `./app/persistence/hipotesis_repo.py`
  - `./app/persistence/causa_repo.py`
  - `./app/domain/arbol.py`
  - `./app/domain/analisis_causas.py`
  - `./app/pages/causa_detalle.py`
  - `./app/callbacks/causa_detalle_callbacks.py`
  - `./app/callbacks/hipotesis_callbacks.py`
  - `./app/components/panel_hipotesis.py`
  - `./app/components/panel_edicion.py`
  - `./db/schema.sql`
- Supporting docs:
  - `./AGENTS.md`
  - `./.atl/sub-agent-registry.md`
  - `./.atl/skill-registry.md`
  - `./requerimientos_cliente/traza_requerimiento.md`

---

## Assumptions
- El programador humano validó `requerimiento_05/spec.md` y `requerimiento_06/spec.md` el `2026-05-31`, aunque el campo `Estado` dentro de ambos artefactos aún no refleje esa validación.
- `requerimiento_06` no puede cerrarse correctamente si el core mínimo de `requerimiento_05` no está implementado o no está disponible para reutilización en la rama de trabajo.
- La persistencia PostgreSQL local seguirá centralizada en `app/persistence/db.py`; no se introducirá otra capa de conexión.
- Si hace falta compatibilidad temporal con pantallas o consultas existentes, esa compatibilidad se resolverá en repositorios/adaptadores, no manteniendo dos fuentes de verdad funcionales.
- La política exacta de borrado de nodos compartidos seguirá la integridad DAG aprobada en `requerimiento_05`; este plan no inventa una semántica distinta.

---

## Dependencies
- Sub-agents / skills relevantes:
  - `plan-task-agent`
  - `execute-agent`
  - `documentation-agent`
  - `context-agent`
  - `data-model-management`
  - `domain-logic`
  - `postgresql-primary-persistence`
  - `project-structure-sdd`
  - `git-workflow`
- Technical dependencies:
  - disponibilidad del core DAG-first de `requerimiento_05`:
    - `db/schema.sql` con `node` y `relationship`
    - repositorios base del grafo en `app/persistence/`
    - validaciones de dominio del DAG en `app/domain/`
  - infraestructura PostgreSQL ya existente en `app/persistence/db.py`
  - flujos RCA existentes en `app/pages/causa_detalle.py` y callbacks asociados
  - capacidad de ejecutar migración local del esquema y backfill controlado de hipótesis legacy

### Dependency Handling with `requerimiento_05`
- `requerimiento_05` es prerequisito estructural, no solo referencia documental.
- Antes de implementar tareas específicas de `requerimiento_06`, el `execute-agent` debe verificar si el core de `requerimiento_05` ya existe en la rama actual o si debe incorporarse primero.
- Si falta cualquiera de estos activos de `requerimiento_05`, `requerimiento_06` debe quedar `blocked` hasta resolver la dependencia:
  - tablas `node` y `relationship`;
  - validaciones DAG y semántica de `VERIFIED_BY`;
  - repositorios base de nodos/relaciones;
  - política de integridad/borrado del grafo.
- `requerimiento_06` no debe reimplementar un mini-core propio de hipótesis para “avanzar” sin `requerimiento_05`.

---

## Execution Strategy

Orden de ejecución recomendado:

1. Validar la base efectiva de `requerimiento_05` y fijar los puntos de extensión exactos en `db/`, `app/persistence/` y `app/domain/`.
2. Evolucionar el esquema a modelo DAG-first para hipótesis estructuradas, incluyendo tablas satélite, constraints e índices, sin conservar `hipotesis.causa_id` como verdad final.
3. Implementar la capa de persistencia del agregado de hipótesis sobre `node` + `relationship` + satélites y plan de migración desde legacy.
4. Implementar casos de uso y validaciones de dominio para integridad semántica, catálogos, transaccionalidad y borrado consistente.
5. Integrar la UI de captura/edición en el flujo existente de detalle RCA, separando componentes, callbacks y backend.
6. Sustituir lecturas/escrituras legacy del flujo de hipótesis para que todo el camino funcional opere sobre el nuevo agregado.
7. Verificar DDL, transacciones, lectura por causa, edición, borrado, UX y ausencia de ejecución analítica.
8. Dejar explícitos rollout, compatibilidad temporal, y puntos de reentrada para NC o enmiendas.

Principios operativos:
- El modelo canónico de identidad es `node.id` / `hypothesis.node_id`; no se admite una identidad adicional de hipótesis por conveniencia.
- La UI envía payload estructurado; la orquestación transaccional y las reglas de integridad viven en backend/domain.
- La compatibilidad temporal, si existe, se encapsula en repositorios y migración, no en divergencia funcional del modelo.
- Las tareas de migración y sustitución del legacy deben preceder a la validación final; no se acepta cerrar el requerimiento dejando el flujo principal sobre `hipotesis(causa_id, ...)`.

---

## Human Validation Gates

### Gate 1: Spec Validation
- Required State Before Planning: `spec_validada`
- Decision Owner: `programador_humano`
- Status: `approved`
- Evidence:
  - El usuario indicó explícitamente que `requerimiento_05/spec.md` y `requerimiento_06/spec.md` fueron validados.
  - La decisión crítica `hypothesis.node_id` como PK/FK a `node.id` fue aprobada por humano y se trata como vinculante.

### Gate 2: Task Plan Approval
- Required State Before Implementation: aprobación humana explícita de este `task_plan.md`.
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `execute-agent` no debe implementar este plan hasta que Gate 2 esté aprobado.
  - Si durante la ejecución aparece una dependencia faltante de `requerimiento_05`, el flujo debe pasar a `blocked` y escalarse antes de introducir workarounds.

### Gate 3: Final Implementation Validation
- Required State Before Closure: `implementado_pendiente_validacion`
- Decision Owner: `programador_humano`
- Status: `pending`
- Notes:
  - `done` solo es válido tras validación humana final, ausencia de NCs abiertas o `en_correccion`, y confirmación de que el flujo operativo ya no depende del modelo legacy de hipótesis.

---

## Tasks

### T1. Baseline de dependencia con `requerimiento_05`
- Goal: asegurar que la implementación de `requerimiento_06` parte del core DAG-first correcto y no recrea un modelo paralelo.
- Inputs:
  - `./requeriments_spec_driven_development/requerimiento_05/spec.md`
  - `./requeriments_spec_driven_development/requerimiento_06/spec.md`
  - `./db/schema.sql`
  - `./app/domain/`
  - `./app/persistence/`
- Actions:
  - verificar qué partes de `requerimiento_05` ya existen en la rama actual;
  - identificar huecos bloqueantes en tablas, repositorios o reglas DAG;
  - fijar los módulos concretos que `requerimiento_06` debe extender en vez de duplicar;
  - documentar explícitamente que `VERIFIED_BY` y `HYPOTHESIS` reutilizan el contrato del req05.
- Output:
  - baseline técnico de dependencia y decisión de continuidad con req05.
- Status: `pending`

### T2. Evolución DDL DAG-first para hipótesis estructuradas
- Goal: extender `db/schema.sql` para soportar el agregado estructurado de hipótesis sin identidad legacy.
- Inputs:
  - `./db/schema.sql`
  - contrato de datos de `requerimiento_05` y `requerimiento_06`
- Actions:
  - definir/ajustar DDL de `hypothesis`, `hypothesis_required_data` y `hypothesis_expected_evidence`;
  - asegurar `hypothesis.node_id` como PK/FK a `node.id`;
  - definir FKs, `ON DELETE`, constraints de catálogos válidos o refuerzo equivalente en backend;
  - definir índices mínimos para lecturas por `hypothesis_node_id`, secuencia y joins con `relationship`;
  - retirar del esquema operativo la dependencia funcional de `hipotesis.id` y `hipotesis.causa_id`;
  - dejar `db/schema.sql` como fuente declarativa del estado final aprobado.
- Output:
  - DDL final del modelo estructurado DAG-first.
- Status: `pending`

### T3. Estrategia de migración y compatibilidad temporal del modelo legacy
- Goal: planificar y ejecutar el paso desde `hipotesis(causa_id, ...)` al nuevo agregado sin duplicar fuentes de verdad.
- Inputs:
  - esquema legacy actual
  - nuevo DDL de T2
  - datos locales existentes
- Actions:
  - definir mapeo de registros legacy a `node`, `relationship` y `hypothesis`;
  - definir cómo poblar `node.description` y atributos satélite a partir de la estructura antigua;
  - definir backfill de relaciones `VERIFIED_BY` desde la causa legacy a la hipótesis nodo;
  - decidir si hay una fase transitoria de lectura compatible y encapsularla en repositorio;
  - definir rollback técnico y criterios de finalización de la migración;
  - verificar que no queda una FK directa legacy como contrato operativo final.
- Output:
  - plan de migración ejecutable y criterio claro de retirada del modelo anterior.
- Status: `pending`

### T4. Repositorios de persistencia del agregado de hipótesis
- Goal: implementar la capa SQL necesaria para crear, leer, actualizar y borrar hipótesis estructuradas sobre el grafo.
- Inputs:
  - `./app/persistence/db.py`
  - repositorios base del grafo provenientes de req05
  - `./app/persistence/hipotesis_repo.py`
- Actions:
  - evolucionar `app/persistence/hipotesis_repo.py` o delegar desde él hacia el nuevo modelo DAG-first;
  - implementar operaciones transaccionales que creen/editen `node`, `relationship`, `hypothesis` y tablas hijas en una misma unidad de trabajo;
  - implementar lecturas:
    - hipótesis por causa vía `relationship`
    - agregado completo por `node_id`
    - listas ordenadas de datos requeridos y evidencias;
  - implementar borrado consistente del agregado y sus relaciones;
  - encapsular cualquier compatibilidad temporal sin exponer el legacy al resto de capas.
- Output:
  - repositorios SQL operativos del agregado de hipótesis estructuradas.
- Status: `pending`

### T5. Dominio y casos de uso de hipótesis estructuradas
- Goal: concentrar las reglas reutilizables de negocio e integridad fuera de la UI.
- Inputs:
  - `./app/domain/`
  - repositorios definidos en T4
  - catálogos y restricciones del spec
- Actions:
  - crear o extender módulos de `app/domain/` para representar el agregado y sus validaciones;
  - validar catálogos `analysis_method` y `expected_result`;
  - validar obligatoriedad semántica de campos y compatibilidad del nodo causa origen;
  - validar que la relación a persistir sea `VERIFIED_BY` con semántica correcta;
  - orquestar create/update/delete con transaccionalidad y errores de dominio claros;
  - mantener fuera del dominio cualquier SQL directo o lógica Dash.
- Output:
  - casos de uso y validaciones de dominio listos para ser invocados desde callbacks/UI.
- Status: `pending`

### T6. Componentes UI del asistente y vista previa final
- Goal: construir la superficie visual de captura/edición en 5 bloques con lenguaje de negocio.
- Inputs:
  - `./app/components/panel_hipotesis.py`
  - `./app/components/panel_edicion.py`
  - `./app/pages/causa_detalle.py`
  - spec de req06
- Actions:
  - diseñar/ajustar componentes para los 5 bloques obligatorios;
  - incorporar listas dinámicas de datos requeridos y evidencias;
  - mostrar etiquetas en español para catálogos persistidos en códigos canónicos;
  - construir una vista previa final RCA antes de guardar;
  - evitar exposición de términos técnicos prohibidos y mantener la UI acoplada al flujo de causa origen.
- Output:
  - componentes visuales del asistente y preview final integrables en la página de detalle.
- Status: `pending`

### T7. Callbacks y orquestación UI del flujo de hipótesis
- Goal: conectar la UI con los casos de uso backend sin mezclar responsabilidades.
- Inputs:
  - `./app/callbacks/causa_detalle_callbacks.py`
  - `./app/callbacks/hipotesis_callbacks.py`
  - componentes de T6
  - dominio/persistencia de T4-T5
- Actions:
  - implementar navegación entre bloques y validaciones básicas de obligatoriedad;
  - implementar add/remove/edit de listas dinámicas sin recarga completa;
  - construir el payload estructurado a enviar al backend;
  - cargar una hipótesis existente para edición desde el agregado reconstruido;
  - integrar el guardado/borrado con mensajes de error y confirmación;
  - asegurar que la UI no decide el modelo de datos ni escribe SQL.
- Output:
  - callbacks del asistente operativos y alineados con separación frontend/backend.
- Status: `pending`

### T8. Sustitución del consumo legacy en el flujo RCA
- Goal: asegurar que el camino funcional principal de hipótesis opera ya sobre el modelo DAG-first.
- Inputs:
  - flujo existente de detalle RCA
  - repositorios y callbacks adaptados
  - estrategia de migración de T3
- Actions:
  - sustituir consultas por causa que hoy dependan de `hipotesis.causa_id`;
  - adaptar renderizados, tarjetas y selección de hipótesis al agregado por `node_id`;
  - revisar puntos de integración con `analisis_causas` y detalle para evitar regresiones;
  - comprobar que el legacy queda aislado o eliminado del flujo principal;
  - añadir verificación explícita de cero dependencia funcional del antiguo modelo donde aplique.
- Output:
  - flujo RCA de hipótesis consumiendo el agregado estructurado sobre el grafo.
- Status: `pending`

### T9. Verificación técnica, migración local y validación de rollout
- Goal: demostrar conformidad funcional, integridad técnica y seguridad del cambio antes de Gate 3.
- Inputs:
  - implementación resultante de T1-T8
  - dataset local / base local de desarrollo
  - spec y criterios de aceptación
- Actions:
  - ejecutar verificación de sintaxis y tests/chequeos disponibles;
  - ejecutar validaciones SQL/manuales sobre creación, lectura, edición, borrado y migración;
  - comprobar que el guardado no dispara análisis ni jobs;
  - validar tiempos de lectura razonables en entorno local y estabilidad básica del formulario;
  - preparar evidencia para Gate 3 y criterios de rollback si la migración local detecta inconsistencias.
- Output:
  - evidencia de verificación, validación de rollout local y lista de riesgos residuales.
- Status: `pending`

---

## Acceptance Criteria Traceability

| AC | Covered by |
| --- | --- |
| AC-01 | T2, T4, T9 |
| AC-02 | T2, T4, T9 |
| AC-03 | T1, T2, T3, T8 |
| AC-04 | T2, T4, T5, T9 |
| AC-05 | T2, T4, T6, T7, T9 |
| AC-06 | T2, T4, T6, T7, T9 |
| AC-07 | T2, T9 |
| AC-08 | T1, T4, T5, T9 |
| AC-09 | T3, T4, T8, T9 |
| AC-10 | T2, T4, T5, T9 |
| AC-11 | T2, T5, T9 |
| AC-12 | T2, T5, T9 |
| AC-13 | T6, T7, T9 |
| AC-14 | T6, T9 |
| AC-15 | T6, T7, T9 |
| AC-16 | T6, T7, T9 |
| AC-17 | T6, T9 |
| AC-18 | T1, T4, T9 |
| AC-19 | T5, T7, T9 |
| AC-20 | T2, T9 |
| AC-21 | T1, T4, T5, T6, T7, T8 |
| AC-22 | T5, T7, T9 |

---

## Verification Plan

### Automatic / Command-Line Verification
- Ejecutar chequeos de sintaxis Python sobre módulos nuevos o modificados en `app/`.
- Ejecutar pruebas automatizadas disponibles para dominio/persistencia si el repositorio ya dispone de ellas; si no existen, crear al menos cobertura focalizada para validaciones de dominio críticas.
- Validar SQL/DDL en entorno local:
  - existencia y definición de `node`, `relationship`, `hypothesis`, `hypothesis_required_data`, `hypothesis_expected_evidence`;
  - constraints de PK/FK, unicidad y catálogos;
  - consultas de lectura por causa y por `node_id`.
- Ejecutar consultas de verificación alineadas con AC-01..AC-12 y AC-20.
- Ejecutar búsquedas de higiene y sustitución legacy:
  - localizar referencias activas a `hipotesis.causa_id` y validar si son solo transitorias/migratorias;
  - localizar uso de SQL directo en UI para confirmar que no se introdujo.

### Manual Verification
- Crear una hipótesis nueva desde una causa concreta y comprobar:
  - aparición de nodo `HYPOTHESIS`;
  - creación de fila satélite;
  - creación de `VERIFIED_BY`;
  - persistencia correcta de listas dinámicas;
  - vista previa final antes de confirmar.
- Editar una hipótesis existente y comprobar reconstrucción completa del agregado.
- Eliminar una hipótesis y comprobar borrado consistente de satélites y relación.
- Forzar payload inválido fuera de UI para verificar rechazo backend de catálogos y semántica.
- Confirmar visualmente que la UI usa lenguaje de negocio y no expone `SQL`, `Python`, `API`, `MCP` ni `capacidad`.
- Confirmar que guardar una hipótesis no dispara análisis, jobs ni evaluaciones automáticas.
- Validar que el flujo principal de detalle RCA ya no depende operativamente del modelo legacy de hipótesis.

### Rollout / Migration Verification
- Ejecutar la migración local sobre una base representativa y validar conteos antes/después.
- Verificar que cada hipótesis legacy migrada queda enlazada con su causa origen mediante `VERIFIED_BY`.
- Verificar que no quedan hipótesis estructuradas huérfanas ni filas hijas sin padre.
- Definir rollback técnico si la migración falla a mitad de camino o si el agregado resultante no se reconstruye correctamente para UI.

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
  - `implementation` -> corregir código, DDL o migración y repetir Gate 3.
- Cualquier NC `open` o `in_correction` bloquea `done`.
- Si la NC revela una rotura de dependencia con `requerimiento_05`, la corrección debe empezar por esa dependencia antes de tocar el flujo específico de hipótesis.

### Open Non-Conformities
- Ninguna registrada al crear el plan.

---

## Risks
- El core efectivo de `requerimiento_05` puede no estar todavía implementado en la rama actual, bloqueando parte del plan.
- La migración desde `hipotesis(causa_id, ...)` puede dejar compatibilidades parciales si no se aíslan correctamente los accesos legacy.
- La sustitución del flujo de lectura por causa puede introducir regresiones en `causa_detalle` o análisis causal si persisten supuestos tree-centric.
- La política de borrado y reutilización del grafo puede requerir ajustes finos si los datos legacy contienen relaciones inconsistentes.
- La UI del asistente puede crecer en complejidad de estado si no se delimita bien qué valida frontend y qué valida backend.
- Si los catálogos controlados se implementan solo en UI, se incumplirá AC-11/AC-12; la validación backend es obligatoria.

---

## Verification Checklist
- [ ] `requerimiento_05/spec.md` y `requerimiento_06/spec.md` validados por el programador humano.
- [ ] Gate 2 aprobado explícitamente antes de implementar.
- [ ] La dependencia de `requerimiento_05` está disponible o resuelta antes de T2-T8.
- [ ] `db/schema.sql` define el modelo final DAG-first de hipótesis estructuradas.
- [ ] La identidad funcional de hipótesis es `hypothesis.node_id` y no existe modelo paralelo operativo.
- [ ] Las lecturas por causa usan `relationship` + `node` + `hypothesis`.
- [ ] El flujo UI de 5 bloques y vista previa final está operativo.
- [ ] El guardado/borrado es transaccional y consistente.
- [ ] La migración/compatibilidad temporal está verificada y no deja dos fuentes de verdad activas.
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
- Las tareas T1-T9 estén completadas o justificadas como no aplicables sin romper ningún AC.
- La dependencia con `requerimiento_05` esté resuelta en implementación real, no solo a nivel de spec.
- El flujo principal de hipótesis opere sobre `node`, `relationship`, `hypothesis`, `hypothesis_required_data` y `hypothesis_expected_evidence`.
- No existan NCs abiertas o `in_correction`.
- `traza_requerimiento.md` refleje el estado final real.
