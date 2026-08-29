# Plan de implementación incremental de la auditoría arquitectónica

Fecha: 2026-08-29  
Base: `AUDITORIA_ARQUITECTURA.md`  
Modo: implementación incremental fuera del flujo SDD  
Estado: en progreso

## Progreso actual

- Fase 0 — línea base: completada.
- Fase 1 — consolidación de migraciones PostgreSQL: completada.
- Fase 2 — segregación de ports BPM: en progreso.
  - Port de catálogo separado y consulta individual de contratos: completado.
  - Retirada de mutaciones operativas inválidas: completado.
  - Retirada de la fachada `BpmOperationalService`: completado.
  - Unificación del filtro de máquinas (`bpm_process_id` como único identificador BPM): completado.
  - Firma explícita de `BpmOperationalApplication.list_machines`: completado.
  - Port específico `OperationalOperationsPort`: completado.
  - Separación de ports de consulta y comando de máquinas: completado.
  - Separación de ports de consulta y comando de contratos: completado.
  - Separación de ports de consulta y comando de asociaciones contrato–máquina: completado.
  - Separación de ports de consulta y comando de configuraciones: completado.
  - Retirada del port monolítico `BpmOperationalPort` sin consumidores: completado.
  - Sustitución de `ExistingBackendGateway` por `BackendToolsAdapter`: completado.
- Fase 4 — limpieza RCA_TREE: completada.
  - Eliminación de nomenclatura y APIs de compatibilidad de referencias de contrato: completada.
- Próximo subincremento: segregar las capacidades BPM restantes y formalizar los límites de agregado.

## Objetivo

Cerrar de forma definitiva los puntos ARC-006, ARC-007 y ARC-009, consolidar las migraciones PostgreSQL históricas y eliminar fachadas de compatibilidad que ya no tienen consumidores conocidos, manteniendo la aplicación funcional en cada incremento.

## Estado de partida verificado

- ARC-001, ARC-002, ARC-003, ARC-004, ARC-005 y ARC-008: cerrados.
- ARC-009: abierto de forma controlada; ARC-006 y ARC-007 cerrados.
- Backend: 20/20 tests Python.
- Frontend: 54/54 tests JavaScript.
- Runtime: 65 endpoints declarados y 65 rutas disponibles, sin duplicados.
- PostgreSQL configurado: `solve_ishikawa`.
- `pm_process_version`: ausente.
- Columnas legacy de `node`: ausentes.
- Procesos, contratos y máquinas sin `node_id`: 0.
- Colisiones de ownership: 0.
- T9: 4/4 tests OK.

## Principios de ejecución

1. Un incremento debe dejar el sistema compilable y verificable.
2. No se crearán aliases nuevos ni capas de compatibilidad adicionales.
3. No se eliminará una fachada hasta migrar todos sus consumidores internos y verificar rutas runtime.
4. La validación de pertenencia entre contextos se hará mediante ports, nunca mediante imports directos a repositorios concretos.
5. PostgreSQL seguirá siendo la fuente de verdad; las migraciones serán idempotentes o tendrán precondiciones explícitas.
6. No se introducirá CQRS, event sourcing, eventos de dominio ni agregados artificiales sin una regla de consistencia que lo justifique.
7. Cada incremento incluirá actualización de tests, documentación y auditoría.

## Orden de implementación

### Fase 0 — Línea base y protección

Objetivo: congelar el estado correcto antes de tocar las áreas abiertas.

Acciones:

- Ejecutar suite Python y JavaScript.
- Ejecutar los cuatro validadores arquitectónicos.
- Ejecutar `scripts/audit_application_architecture.py --check --check-backend`.
- Ejecutar `scripts/check_postgres_pm.py`.
- Ejecutar T9.
- Registrar el hash actual del esquema y las tablas críticas.

Salida:

- Evidencia reproducible de línea base.
- Ningún cambio funcional.

Criterio de paso:

- Todos los comandos pasan.
- La base local responde con la configuración de `.env.local`.

### Fase 1 — Consolidación de migraciones PostgreSQL

Cierra primero el riesgo de datos y despliegue de ARC-006/ARC-009.

Objetivo: que la historia de migraciones no permita ejecutar por error una migración antigua sobre el esquema final.

Acciones:

- Retirar migraciones RCA_TREE intermedias que dependían de columnas ya eliminadas.
- Mantener una única migración final aplicable a la base de desarrollo local.
- Crear, si es necesario, una migración final idempotente que:
  - compruebe las precondiciones;
  - asegure `node_id` en propietarios;
  - elimine únicamente columnas legacy si todavía existen;
  - no dependa de columnas que ya hayan sido eliminadas.
- Actualizar fixtures de inicialización y documentación de base de datos.
- Ejecutar la migración sobre una base local de prueba o transacción controlada.
- Verificar T9, cobertura de ownership y ausencia de `pm_process_version`.

Archivos previstos:

- `scripts/migrate_*.sql`
- `db_management/schema.sql`
- `db_management/init_db.py`
- `tests/architecture/test_t9_boundaries.py`
- fixtures y tests de PostgreSQL relacionados.

Criterio de paso:

- La migración puede ejecutarse sobre una base vacía y sobre una base ya finalizada.
- No hay referencias ejecutables a columnas eliminadas.
- El hash T9 se actualiza únicamente si cambia legítimamente el esquema.

### Fase 2 — Segregación de puertos BPM

Cierra la parte principal de ARC-006.

Objetivo: que cada capacidad dependa de un port estrecho y que `BpmOperationalApplication` permanezca solo como compositor.

Acciones:

- Inventariar métodos usados por cada caso de uso de:
  - procesos;
  - operaciones;
  - contratos;
  - máquinas;
  - configuraciones;
  - catálogo.
- Definir ports específicos en `modules/bpm/application/ports/`.
- Sustituir dependencias genéricas o superficies amplias por interfaces mínimas.
- Mantener la composición concreta únicamente en `modules/bpm/infrastructure/`.
- Eliminar métodos no utilizados de ports públicos.
- Actualizar dobles de tests y wiring.
- Verificar que ningún caso de uso importe adaptadores o infraestructura.

Criterio de paso:

- Cada caso de uso declara solo las operaciones que necesita.
- Los tests de casos de uso funcionan con dobles en memoria.
- `BpmOperationalApplication` no contiene reglas de negocio.
- Los validadores de arquitectura siguen pasando.

### Fase 3 — Retirada definitiva de fachadas BPM

Continúa ARC-006 y elimina compatibilidad interna sin consumidores.

Objetivo: retirar `BpmOperationalService` y `build_bpm_operational_service` cuando todos los consumidores usen la composición canónica.

Acciones:

- Migrar referencias en:
  - `app_factory.py`;
  - `backend_gateway.py`;
  - tests;
  - scripts;
  - documentación técnica.
- Renombrar la composición a un nombre canónico de aplicación/wiring.
- Eliminar la fachada anterior y sus exports.
- Actualizar imports y contratos.
- Ejecutar inventario estático y comprobar Flask `url_map`.

Criterio de paso:

- Cero referencias internas al nombre retirado.
- 65 endpoints runtime siguen disponibles.
- No aparecen aliases nuevos.
- Suite completa verde.

### Fase 4 — Limpieza de adaptadores RCA_TREE

Cierra ARC-007. Estado: completada.

Objetivo: que los adaptadores outbound solo traduzcan entre ports y PostgreSQL, sin preparar formularios ni contener lógica de aplicación.

Acciones:

- Clasificar la lógica de cada `*_compat` en:
  - entrada HTTP;
  - caso de uso;
  - DTO/normalización;
  - persistencia;
  - traducción temporal.
- Mover construcción de formularios, etiquetas y decisiones de flujo a application/inbound.
- Mantener en outbound únicamente:
  - consultas;
  - escrituras;
  - mapeos de persistencia;
  - transacciones.
- Migrar consumidores internos a nombres canónicos.
- Eliminar los adaptadores compatibility sin consumidores.
- Verificado: la API canónica usa `contract_id`/`as_int()` y no quedan referencias activas a `legacy_contract_id`/`as_legacy_int()`.

Criterio de paso:

- Ningún outbound prepara respuestas de presentación.
- RCA_TREE mantiene sus ports y no importa el dominio BPM.
- Tests de causas, hipótesis, árbol y análisis pasan.
- La auditoría runtime no detecta rutas perdidas.

### Fase 5 — Formalización final del dominio BPM

Cierra ARC-009.

Objetivo: que las invariantes centrales estén en entidades/agregados, sin convertir el dominio en una capa artificial.

Avance realizado:

- `Process.assert_graph_consistent()` rechaza nodos y transiciones pertenecientes a otro proceso antes de persistir el grafo.
- `MachineOperationConfiguration` queda definida una sola vez en `domain.machines.entities`; se elimina la implementación duplicada de `domain.configurations`.
- `Contract.change_process()` valida la identidad positiva del proceso operativo y `apply_update()` la aplica de forma explícita.
- `Contract.change_scope()` actualiza conjuntamente el alcance BPM y el propietario operativo con validación atómica del estado de la entidad.
- `Machine` rechaza `machine_type_id` cero, negativo o booleano antes de persistir.
- `MachineOperationConfiguration` valida `contract_id` y expone `identity_key()` para la unicidad contextual `(machine_id, process_id, operation_id)`.

Límites definitivos:

- `Process`: raíz del grafo de nodos y transiciones.
- `Machine`: atributos permanentes de máquina.
- `MachineOperationConfiguration`: entidad contextual con referencias canónicas a máquina, operación, proceso y contrato.
- `Contract`: alcance BPM, estado y datos propios.
- `ProcessNode(node_type="operation")` es la identidad BPM única de operación; `Stage` conserva únicamente el detalle ordenado de etapas.
- `ProcessRef` y `OperationRef` se mantienen únicamente como referencias compartidas en `platform.application.ports`.
- `ProcessModelingError` y `MachineModelError` heredan de `BpmDomainError`, centralizando la raíz de errores sin perder códigos específicos.
- La validación de payload de `Machine` queda centralizada en `machines.validators`; se elimina `machines.payload_rules`.
- El repositorio de process modeling reutiliza `domain.shared.require_uuid` y elimina su implementación UUID duplicada.
- Retirados los scripts históricos `migrate_arc009_remove_process_versions.sql`, `migrate_rca_tree_node_ownership.sql` y `migrate_rca_tree_remove_legacy_node_identity.sql`; no quedan migraciones ejecutables que creen o transformen versionado BPM ni identidades legacy.

Acciones:

- Identificar cada regla actualmente repetida en payload validators, HTTP, casos de uso y adapters.
- Mantener los validadores solo para forma y normalización de entrada.
- Mover invariantes de negocio a métodos de entidad o servicios de dominio puros.
- Introducir Commands/DTOs tipados solo en fronteras donde eviten diccionarios ambiguos.
- Añadir tests de transición de estado, pertenencia y consistencia.
- Eliminar funciones de aplicación que validen reglas ya cubiertas por entidades.
- Documentar los límites de consistencia y las reglas que siguen dependiendo de PostgreSQL, como pertenencia entre IDs.

Criterio de paso:

- Cada regla tiene un único propietario.
- Las entidades pueden probarse sin Flask ni PostgreSQL.
- Los casos de uso coordinan ports y no reimplementan invariantes.
- No aparecen nuevos agregados sin comportamiento real.

### Fase 6 — Limpieza documental y cierre

Objetivo: que documentación, fixtures y herramientas reflejen el modelo final.

Acciones:

- Revisar `AUDITORIA_ARQUITECTURA.md`.
- Actualizar `README.md`, scripts y fixtures que mencionen versiones o aliases retirados.
- Revisar `plan.md` y documentos históricos para distinguir decisiones antiguas de estado vigente.
- Actualizar tests de arquitectura para proteger:
  - ausencia de `ProcessDefinition`/versionado activo;
  - ownership único;
  - ausencia de aliases retirados;
  - ports segregados;
  - migraciones seguras.
- Ejecutar la línea base completa.

Criterio de cierre:

- ARC-007 pasa a CERRADO; ARC-006 y ARC-009 quedan pendientes de sus incrementos específicos.
- No existen aliases sin consumidor justificado.
- La auditoría y README no contradicen el código.
- Suite backend/frontend, validadores, T9 y verificación PostgreSQL local pasan.

## Dependencias y gates

| Gate | Condición |
|---|---|
| G0 | Línea base verde antes de cada fase. |
| G1 | Migraciones PostgreSQL verificadas antes de retirar referencias históricas. |
| G2 | Ports segregados antes de eliminar la fachada operacional. |
| G3 | Adaptadores RCA_TREE migrados antes de eliminar `*_compat`. |
| G4 | Tests de dominio verdes antes de cerrar ARC-009. |
| G5 | Validación final completa antes de marcar la auditoría cerrada. |

## Verificación común por incremento

```bash
python3 -m unittest discover -s tests -p 'test*.py'
node --test tests/unit/*.test.mjs
python3 -m uc_bib_solv.architecture_validators --check-structure
python3 -m uc_bib_solv.architecture_validators --check-naming
python3 -m uc_bib_solv.architecture_validators --check-dependencies
python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations
python3 scripts/audit_application_architecture.py --check --check-backend
python3 scripts/check_postgres_pm.py
python3 -m unittest tests.architecture.test_t9_boundaries
python3 -m compileall -q uc_bib_solv
git diff --check
```

## Riesgos

- Eliminar una fachada antes de localizar consumidores fuera del repositorio.
- Ejecutar una migración histórica sobre una base que ya tiene el esquema final.
- Confundir el ID entero operativo con el UUID BPM.
- Convertir cada DTO en una entidad y aumentar complejidad sin una invariante real.
- Actualizar el hash T9 por un cambio accidental del esquema.
- Corregir documentación histórica de forma que se pierda la trazabilidad de decisiones.

## Estrategia de rollback

Cada fase debe limitar sus cambios a sus archivos y migraciones identificados. Ante un fallo:

1. detener la fase;
2. conservar la evidencia del fallo;
3. no restaurar aliases automáticamente;
4. corregir la causa en código, plan o migración;
5. repetir el gate de la fase antes de continuar.

## Resultado esperado

Una arquitectura sin duplicidad de entidades, sin versionado BPM persistente, con ports estrechos, adaptadores tecnológicos puros, migraciones PostgreSQL seguras y un dominio BPM que contenga sus invariantes reales sin sobreingeniería.
