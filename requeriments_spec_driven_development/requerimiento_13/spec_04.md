# Overview

- **Artefacto:** persistencia, compatibilidad y migración.
- **Estado:** `pendiente_aclaraciones`; depende de `T-00` (`spec_00`).
- **Actores:** backend/infraestructura, operador de migración, auditor y consumidores read-only.
- **Alcance:** modelo persistente para schemas/versiones, propuestas, estados, conflictos, score, evidencias, provenance y auditoría; estrategia para JSON libre legado.

## Functional Requirements

- **FR-02.4:** ubicación versionada explícita para schemas dentro de dominio/configuración, sin inventar archivo, registro, formato o selección.
- **FR-05:** persistir fuente canónica, evidencia, gap, inferencia y provenance suficiente para reconstruir origen, sin secretos.
- **FR-07.4/.5/.6/.8:** servicio no ejecuta SQL; repositorios/adaptadores viven en `app/persistence/`; modelo físico y constraints en `db/schema.sql` o mecanismo de migración autorizado; dominio separado; configuración sigue patrón del proyecto y no crea settings sin decisión.
- **FR-08.2:** auditoría consultable conserva actor, `trace_id`, recurso, acción, resultado, estado y provenance.
- **FR-01/03/04/06:** persistir datos necesarios para completitud, calidad/conflictos, estados e idempotencia solo tras aprobar el modelo.

## Non-Functional Requirements

- Compatibilidad/migración explícita para consumidores read-only y metadatos legados.
- Tests de dominio sin red, Dataiku ni PostgreSQL real.
- Constraints técnicos no sustituyen invariantes de dominio.
- SLA, tamaño, concurrencia, disponibilidad y retención quedan pendientes.

## Constraints and Assumptions

- Aplicar `T-00` y `data-model-management`: dominio no importa persistencia; repositorios implementan interfaces de dominio.
- No se inventan tablas, columnas, DDL, backfill, ventana de retención ni mecanismo de migración.
- El runtime de referencia y PostgreSQL están indisponibles; no se asume migración end-to-end.

## Out of Scope

- Escritura de DDL/migraciones en esta entrega, despliegue de modelo, proveedor de base de datos nuevo, secretos o rediseño fuera de process modeling.

## Acceptance Criteria técnicos medibles

- **AC-03:** registro persistido/resultado conserva versión de schema aplicada.
- **AC-04:** dos fuentes conflictivas se almacenan como referencias separadas, sin fusión.
- **AC-05:** componentes, versión de reglas y resultado reproducible son recuperables.
- **AC-06:** transición recuperable con estado anterior/nuevo, actor y `trace_id`.
- **AC-07:** la clave idempotente evita duplicados según modelo aprobado.
- **AC-09:** auditoría recuperable contiene campos requeridos y excluye secretos.
- **AC-11:** `tests/unit/process-modeling-metadata.test.mjs` y tests de servicio/dominio/persistencia cubren mapeos sin PostgreSQL real.
- **AC-12:** cada entidad/campo aprobado queda vinculado a una prueba concreta antes del plan.

## Questions for Clarification

- Aplican **Q01, Q02, Q03, Q04, Q05, Q07, Q09, Q10 y Q11** de `spec_00`; Q10 es el bloqueo principal. No se responde ninguna.

## Decision Log

- 2026-08-06 — Se mantiene `app/persistence/` y `db/schema.sql`/mecanismo autorizado como fronteras, sin seleccionar mecanismo nuevo.
- 2026-08-06 — Estado `pendiente_aclaraciones`; migración/backfill del JSON libre no decidido.

## Scope, actores, dependencias, módulos y exclusiones

- **Módulos afectados:** `app/persistence/`, interfaces/adaptadores process modeling, configuración existente y `db/schema.sql` o migración futura.
- **Dependencias:** `spec_00`; `spec_03` para ciclo/auditoría; `spec_02` para propuestas; `spec_05` para invariantes.
- **Auditoría cruzada:** ningún hijo contiene DDL; todo campo persistente tiene propietario dominio/persistencia y decisión Q10 trazable.

## Auditoría cruzada

Comparar cada dato persistido con su entidad/caso de uso, origen, versión y evento auditable; no tratar DDL o backfill no decididos como hechos.

## Correspondencia con el spec original

| IDs originales | Cobertura |
|---|---|
| FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-08 | Datos necesarios y trazabilidad |
| FR-07.4/.5/.6/.8 | Primarios aquí |
| NFR completo | Compatibilidad, operación, seguridad y aislamiento de tests; `T-00` |
| AC-03, AC-04, AC-05, AC-06, AC-07, AC-09, AC-11, AC-12 | Primarios aquí |
| AC-01, AC-02, AC-08, AC-10 | Consumidos por validación/UI/autorización |
| Q01..Q12 | Referenciadas en `spec_00`, sin decisiones nuevas |

### Índice exhaustivo de trazabilidad

| ID original | Cobertura en este spec |
|---|---|
| FR-01 | Datos de completitud |
| FR-02 | Schemas/versiones |
| FR-03 | Score/conflictos |
| FR-04 | Estados |
| FR-05 | Provenance/evidencias |
| FR-06 | Idempotencia de propuestas |
| FR-07 | Persistencia/configuración |
| FR-08 | Auditoría |
| AC-01 | Datos de validación |
| AC-02 | Ausencia de invención |
| AC-03 | Schema/version |
| AC-04 | Referencias de conflicto |
| AC-05 | Score reproducible |
| AC-06 | Transición trazable |
| AC-07 | Clave idempotente |
| AC-08 | Permisos registrados |
| AC-09 | Auditoría segura |
| AC-10 | Datos consumibles por UI |
| AC-11 | Mapeos aislados |
| AC-12 | Campos/pruebas |
