# Overview

- **Artefacto:** validación, calidad, scoring y estrategia de pruebas.
- **Estado:** `pendiente_aclaraciones`; depende de `T-00` (`spec_00`).
- **Actores:** backend/dominio, frontend, agente, QA y auditor.
- **Alcance:** validación de contrato en doble capa, incompletitud, conflictos, scoring reproducible y cobertura técnica.

## Functional Requirements

- **FR-01:** reutilizar/extender `app/domain/process_modeling/validators.py` y `context.py`; rechazar descripción vacía sin motivo controlado; no inventar texto; errores con código/campo/mensaje.
- **FR-02:** seleccionar schema versionado por tipo, validar frontend y backend, siendo backend autoridad antes de aceptar/proponer/aprobar/publicar.
- **FR-03:** detectar faltantes, evidencias ausentes, inferencias, conflictos e incompatibilidades; calcular score reproducible con componentes y versión de reglas; fórmula, escala, umbrales y efecto quedan abiertos; no fusionar conflictos.
- **FR-04/05/06/08:** validar precondiciones de estado, trazabilidad, idempotencia, autorización y auditoría en los puntos de integración; la ejecución editorial/tool/persistencia vive en specs hermanos.
- **FR-07.3/.4/.5:** mantener validación en dominio/servicio/API, sin reglas en UI, SQL directo o dependencias de infraestructura en dominio.

## Non-Functional Requirements

- Mismo resultado semántico frontend/backend para la misma violación.
- Resultado de score determinista para mismo input y versión de reglas.
- Tests unitarios aislables de red/Dataiku/PostgreSQL real.
- Cobertura de seguridad, trazabilidad, accesibilidad y compatibilidad según `T-00`.
- No se fijan SLA, tamaños ni concurrencia sin Q11.

## Constraints and Assumptions

- Aplicar `T-00`; no decidir fórmula/thresholds ni catálogo.
- La validación es dominio/backend, con feedback frontend; no se traslada negocio a la UI.
- Los criterios AC que requieren fórmula, matriz o modelo solo pueden cerrarse después de las decisiones humanas correspondientes.

## Out of Scope

- Inventar fórmulas, thresholds, campos de schema, permisos, migración, DDL, tests nuevos o implementación en esta entrega.

## Acceptance Criteria técnicos medibles

- **AC-01:** matriz por tipo de nodo cubre descripción ausente, motivo válido/incorrecto y schema incompatible en frontend/backend con código/campo identificables.
- **AC-02:** prueba automatizada impide avanzar sin descripción/motivo y demuestra ausencia de texto inventado.
- **AC-03:** prueba por tipo confirma schema/version en resultado y provenance.
- **AC-04:** prueba conserva dos conflictos sin fusión.
- **AC-05:** prueba verifica componentes, versión de reglas y resultado reproducible usando fórmula/umbrales aprobados.
- **AC-06:** prueba cubre transiciones autorizadas/no autorizadas según matriz aprobada y trazabilidad.
- **AC-07:** prueba repite clave idempotente sin duplicado/transición adicional según decisión.
- **AC-08:** prueba rechaza permisos insuficientes en backend.
- **AC-09:** prueba verifica auditoría completa sin secretos/SQL/credenciales.
- **AC-10:** E2E verifica accesibilidad y visibilidad diferenciada de estados.
- **AC-11:** cubre `app/domain/process_modeling/tests/`, `tests/unit/test_process_modeling_validation.py`, `test_process_modeling_service.py`, `test_process_modeling_api.py`, `test_agent_tools.py` y `tests/unit/process-modeling-metadata.test.mjs`.
- **AC-12:** la matriz original queda completa con IDs concretos de tests antes de aprobar el plan.

## Questions for Clarification

- Aplican **Q01, Q02, Q03, Q04, Q05, Q06, Q07, Q08, Q09, Q10 y Q11** de `spec_00`; Q04 bloquea AC-05. Q12 aplica al AC-10 y permanece en `spec_01`. No se responde ninguna.

## Decision Log

- 2026-08-06 — Backend es autoridad final; frontend ofrece feedback equivalente.
- 2026-08-06 — Estado `pendiente_aclaraciones`; score y matrices no están decididos.

## Scope, actores, dependencias, módulos y exclusiones

- **Módulos afectados:** `app/domain/process_modeling/context.py`, `validators.py`, tests de dominio/validación/servicio/API/tools/UI.
- **Dependencias:** `spec_00`; consume contratos de `spec_01`–`spec_04` para verificar integración.
- **Auditoría cruzada:** cada AC-01..AC-12 debe tener test concreto y cada regla debe tener capa propietaria; no duplicar la tabla transversal.

## Auditoría cruzada

Ejecutar el mismo caso en frontend/backend y comparar código, campo, versión, score y provenance; comprobar que cada AC-01–AC-12 tiene prueba identificable.

## Correspondencia con el spec original

| IDs originales | Cobertura |
|---|---|
| FR-01, FR-02, FR-03 | Primarios aquí |
| FR-04, FR-05, FR-06, FR-07, FR-08 | Validaciones de integración; detalle en `spec_02`–`spec_04` |
| NFR completo | Consistencia, determinismo, seguridad, accesibilidad, compatibilidad y operación; `T-00` |
| AC-01..AC-12 | Primarios aquí como estrategia de verificación; ejecución distribuida por módulos |
| Q01..Q12 | Referenciadas en `spec_00`; Q12 en `spec_01`, sin decisiones nuevas |

### Índice exhaustivo de trazabilidad

| ID original | Cobertura en este spec |
|---|---|
| FR-01 | Validación de completitud |
| FR-02 | Validación de schema |
| FR-03 | Calidad/conflicto/score |
| FR-04 | Precondiciones de ciclo |
| FR-05 | Provenance |
| FR-06 | Idempotencia/errores |
| FR-07 | Capas y módulos |
| FR-08 | Autorización/auditoría |
| AC-01 | Matriz de validación |
| AC-02 | No invención |
| AC-03 | Schema/version |
| AC-04 | Conflicto |
| AC-05 | Score |
| AC-06 | Transiciones |
| AC-07 | Idempotencia |
| AC-08 | Autorización |
| AC-09 | Auditoría |
| AC-10 | UI/E2E |
| AC-11 | Suite de tests |
| AC-12 | Matriz final |
