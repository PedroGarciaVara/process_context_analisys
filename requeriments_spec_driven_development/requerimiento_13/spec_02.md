# Overview

- **Artefacto:** flujo de contexto y propuesta de agent tools.
- **Estado:** `pendiente_aclaraciones`; depende de `T-00` (`spec_00`).
- **Actores:** agente, usuario/actor autenticado, backend y auditor.
- **Alcance:** consulta de contexto y propuesta de descripciones/metadatos sin publicar; autorización efectiva queda en backend.

## Functional Requirements

- **FR-01:** validar que toda propuesta tenga descripción o motivo controlado, sin inventar texto y con errores por campo.
- **FR-02:** validar la propuesta contra schema versionado y devolver versión, fuente/evidencia y naturaleza del valor.
- **FR-03:** devolver faltantes, evidencias ausentes, inferencias, conflictos, incompatibilidades y score reproducible/versionado cuando esté aprobado.
- **FR-05:** incluir fuente canónica, provenance, actor y `trace_id`; conservar fuentes incompatibles.
- **FR-06:** ampliar tools existentes para contexto/propuesta; validar entrada, incluir trazabilidad, ser idempotentes y no convertir propuesta en publicación; errores sin secretos/SQL/trazas internas. Nombres, payloads, scopes, autoridad y sincronía están pendientes.
- **FR-07.3/.4/.5/.7:** contratos API pasan por rutas/servicio/dominio; tools permanecen en `uc_bib_solv/webapp_java/python-backend/agent_tools/` y separan contratos/validación/registro/adaptadores de casos de uso.
- **FR-08:** cualquier escritura efectiva, revisión, aprobación o publicación exige permiso backend.

## Non-Functional Requirements

- Repetir la misma propuesta con la misma clave no crea duplicados ni transiciones adicionales.
- Respuestas y logs no contienen secretos, SQL, credenciales ni trazas internas.
- Operaciones correlacionables por actor y `trace_id`.

## Constraints and Assumptions

- Aplicar `T-00`; las tools actuales read-only se mantienen compatibles salvo decisión aprobada.
- No se decide contrato de tool, clave/ventana de idempotencia ni proceso síncrono/asíncrono.
- El dominio no llama directamente a APIs externas, SQL, Dataiku o UI.

## Out of Scope

- Publicación directa desde tool, sustitución IAM, provisioning de usuarios, secretos y diseño de tool definitivo antes de Q08/Q09.

## Acceptance Criteria técnicos medibles

- **AC-01/02:** propuesta inválida por descripción/motivo es rechazada con campo/código y no genera texto inventado.
- **AC-03:** por tipo de nodo se verifica schema/version en resultado/provenance.
- **AC-04:** conflicto conserva referencias separadas.
- **AC-07:** repetición con misma clave no crea duplicado ni transición adicional; valores se basan en decisión aprobada.
- **AC-08:** permisos insuficientes para proponer/revisar/aprobar/publicar son rechazados por backend.
- **AC-09:** auditoría contiene actor, `trace_id`, recurso, acción, resultado y provenance sin secretos.
- **AC-11:** `tests/unit/test_agent_tools.py` y `tests/unit/test_process_modeling_api.py` cubren contratos, errores e idempotencia.
- **AC-12:** tools, idempotencia y auditoría aparecen con IDs de prueba concretos antes del plan.

## Questions for Clarification

- Aplican **Q01, Q02, Q03, Q04, Q06, Q07, Q08, Q09, Q10, Q11** de `spec_00`; especialmente Q08 y Q09 son bloqueantes. Q05 y Q12 se referencian por efectos en ciclo/UI. No se responde ninguna.

## Decision Log

- 2026-08-06 — Las tools proponen/consultan; no publican directamente.
- 2026-08-06 — Estado `pendiente_aclaraciones`; contrato e idempotencia abiertos.

## Scope, actores, dependencias, módulos y exclusiones

- **Módulos afectados:** `uc_bib_solv/webapp_java/python-backend/agent_tools/`, `routes/process_modeling.py`, `services/process_modeling_service.py` y tests de tools/API.
- **Dependencias:** `spec_00`; `spec_03` para autorización/auditoría; `spec_04` para persistencia; `spec_05` para validación.
- **Auditoría cruzada:** cada tool debe trazar input→validación→propuesta y no contener lógica duplicada del dominio.

## Auditoría cruzada

Repetir una propuesta con la misma clave y comprobar ausencia de duplicados; verificar que ninguna tool muta directamente ni filtra secretos o trazas internas.

## Correspondencia con el spec original

| IDs originales | Cobertura |
|---|---|
| FR-01, FR-02, FR-03, FR-05, FR-06, FR-07, FR-08 | Primarios aquí |
| FR-04 | Consume estados de `spec_03` |
| NFR completo | Idempotencia, seguridad y trazabilidad; `T-00` |
| AC-01, AC-02, AC-03, AC-04, AC-07, AC-08, AC-09, AC-11, AC-12 | Primarios aquí |
| AC-05, AC-06, AC-10 | Consumidos de `spec_05`, `spec_03`, `spec_01` |
| Q01..Q12 | Referenciadas en `spec_00`, sin decisiones nuevas |

### Índice exhaustivo de trazabilidad

| ID original | Cobertura en este spec |
|---|---|
| FR-01 | Validación de propuesta |
| FR-02 | Schema/version de propuesta |
| FR-03 | Calidad/conflictos/score |
| FR-04 | Consumo de estados |
| FR-05 | Provenance y trazabilidad |
| FR-06 | Tools de contexto/propuesta |
| FR-07 | Fronteras API/servicio/dominio/tools |
| FR-08 | Autorización backend |
| AC-01 | Rechazo de propuesta inválida |
| AC-02 | No invención |
| AC-03 | Schema/version |
| AC-04 | Conflicto |
| AC-05 | Score |
| AC-06 | Transición trazable |
| AC-07 | Idempotencia |
| AC-08 | Permisos |
| AC-09 | Auditoría |
| AC-10 | Integración UI cuando aplica |
| AC-11 | Tests tools/API |
| AC-12 | IDs de pruebas |
