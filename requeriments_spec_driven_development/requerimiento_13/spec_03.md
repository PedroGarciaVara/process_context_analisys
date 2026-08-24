# Overview

- **Artefacto:** ciclo editorial, permisos y auditoría.
- **Estado:** `pendiente_aclaraciones`; depende de `T-00` (`spec_00`).
- **Actores:** proponente, revisor, aprobador, publicador, agente y auditor autorizado.
- **Alcance:** estados `draft`, `proposed`, `review`, `approved`, `published`, transiciones autorizadas y registro auditable.

## Functional Requirements

- **FR-04:** soportar los cinco estados; backend impide transiciones no autorizadas y registra actor, `trace_id`, timestamp, provenance, estado anterior/nuevo y motivo; transiciones, rechazo/retorno, concurrencia y edición de publicados quedan abiertas; frontend muestra estado/acción/razón.
- **FR-05:** cada transición y operación conserva fuente/provenance y distingue conflicto sin resolverlo automáticamente.
- **FR-06.3:** escritura efectiva, aprobación y publicación están protegidas por autorización backend; una tool read-only no obtiene escritura directa.
- **FR-07.3/.4:** API y servicio orquestan validación, estados, idempotencia y auditoría sin SQL directo ni UI en servicio.
- **FR-08:** verificar identidad, rol/scope y permiso en backend; cada mutación produce auditoría consultable con actor, `trace_id`, recurso, acción, resultado, estado y provenance sin secretos. Matriz, autoridad, segregación, retención y acceso están pendientes.

## Non-Functional Requirements

- Trazabilidad completa de validación/propuesta/revisión/aprobación/publicación.
- Backend como autoridad de autorización y consistencia.
- Auditoría segura, consultable y sin credenciales/secretos.
- Concurrencia, SLA, disponibilidad y retención no se asumen.

## Constraints and Assumptions

- Aplicar `T-00`; no se inventa matriz de permisos ni transición.
- El proveedor de identidad existente no se sustituye; se usa su identidad/rol/scope configurable cuando sea aprobado.
- No se diseña IAM enterprise, SIEM ni permisos por fila/columna.

## Out of Scope

- Provisioning de usuarios, nuevo proveedor IAM, auditoría avanzada/SIEM, publicación automática y cambios de consumidores no aprobados.

## Acceptance Criteria técnicos medibles

- **AC-06:** matriz aprobada cubre todas las transiciones permitidas y rechaza las no permitidas; cada resultado incluye estado anterior/nuevo, actor y `trace_id`.
- **AC-07:** una repetición idempotente no crea transición adicional.
- **AC-08:** intentos con permisos insuficientes para cada acción se rechazan en backend.
- **AC-09:** auditoría contiene actor, `trace_id`, recurso, acción, resultado y provenance, sin secretos/SQL/credenciales.
- **AC-10:** E2E muestra estado y acción solo cuando corresponde, y razón de rechazo.
- **AC-11:** `tests/unit/test_process_modeling_service.py`, `test_process_modeling_api.py` y `test_agent_tools.py` cubren ciclo/permisos/auditoría.
- **AC-12:** toda fila de ciclo, permisos y auditoría enlaza a pruebas concretas antes de aprobar el plan.

## Questions for Clarification

- Aplican **Q03, Q05, Q06, Q07, Q08, Q09, Q10, Q11** de `spec_00`; son bloqueantes Q05–Q07 y Q10–Q11. Q01/Q02/Q04 afectan condiciones de avance. No se responde ninguna.

## Decision Log

- 2026-08-06 — Se conserva el conjunto exacto de estados del original.
- 2026-08-06 — Estado `pendiente_aclaraciones`; no se decide autoridad ni permisos.

## Scope, actores, dependencias, módulos y exclusiones

- **Módulos afectados:** `routes/process_modeling.py`, `services/process_modeling_service.py`, dominio process modeling, persistencia/auditoría y tests existentes.
- **Dependencias:** `spec_00`; `spec_02` para propuestas; `spec_04` para estado/auditoría; `spec_01` para presentación; `spec_05` para validación.
- **Auditoría cruzada:** toda mutación debe tener permiso backend, transición de matriz y registro correlacionable.

## Auditoría cruzada

Comparar cada transición con estado anterior/nuevo, actor, trace, permiso, provenance y auditoría; ocultar controles UI no cuenta como autorización.

## Correspondencia con el spec original

| IDs originales | Cobertura |
|---|---|
| FR-01, FR-02, FR-03, FR-05, FR-06 | Condiciones y protección del ciclo |
| FR-04, FR-07.3/.4, FR-08 | Primarios aquí |
| NFR completo | Seguridad, trazabilidad, compatibilidad y operación; `T-00` |
| AC-06, AC-07, AC-08, AC-09, AC-10, AC-11, AC-12 | Primarios aquí |
| AC-01, AC-02, AC-03, AC-04, AC-05 | Gate/validación de `spec_05` |
| Q01..Q12 | Referenciadas en `spec_00`, sin decisiones nuevas |

### Índice exhaustivo de trazabilidad

| ID original | Cobertura en este spec |
|---|---|
| FR-01 | Precondición de completitud |
| FR-02 | Precondición de schema |
| FR-03 | Precondición de calidad/conflicto |
| FR-04 | Estados y transiciones |
| FR-05 | Provenance y conflicto |
| FR-06 | Protección de tools |
| FR-07 | API/servicio |
| FR-08 | Permisos y auditoría |
| AC-01 | Gate de validación |
| AC-02 | Gate sin invención |
| AC-03 | Gate schema |
| AC-04 | Conflicto |
| AC-05 | Score |
| AC-06 | Ciclo |
| AC-07 | Idempotencia |
| AC-08 | Autorización |
| AC-09 | Auditoría |
| AC-10 | Estado en UI |
| AC-11 | Tests de ciclo/API/tools |
| AC-12 | Trazabilidad |
