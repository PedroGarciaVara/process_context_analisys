# Plan de migración arquitectónica de `bib_solv`

Este documento formaliza la migración incremental ejecutada desde la arquitectura híbrida actual. La decisión de dominio es explícita: BPM posee procesos, operaciones, etapas, versiones, máquinas, contratos, asociaciones máquina-contrato y configuraciones máquina-operación. TREE posee únicamente el grafo causal y sus análisis. Los cruces entre ambos dominios se realizan mediante identificadores, DTOs o ports.

## Estado actual y evidencias

- La composición Flask parte de `modules/platform/infrastructure/app_factory.py`.
- El inventario actual detecta 87 declaraciones de endpoints, 67 combinaciones método/ruta únicas, 68 rutas runtime y 20 duplicidades.
- El runtime mantiene fachadas en `routes/` para operational, causas, análisis y process modeling.
- El dominio BPM canónico todavía reexporta entidades desde `app/domain/process_modeling`.
- La persistencia SQL se reparte entre `app/persistence/` y adaptadores outbound.
- `agent_tools` es la única integración externa formalizada; no hay adaptadores CLI, MCP o Dataiku activos.

## Arquitectura objetivo

```text
modules/
├── bpm/
│   ├── domain/
│   ├── application/
│   └── adapters/
├── tree/
│   ├── domain/
│   ├── application/
│   └── adapters/
├── agent_tools/
└── platform/
```

Las capas de dominio no importan frameworks, PostgreSQL, repositories ni adapters. Application depende de domain y ports. La infraestructura compone implementaciones concretas. Las referencias BPM/TREE no importan entidades internas del dominio opuesto.

## Mapping

| Actual | Dominio destino | Acción |
|---|---|---|
| `app/domain/process_modeling` y `modules/process_modeling` | BPM | Migrar entidades y reglas, manteniendo compatibilidad |
| `modules/operational_modeling` | BPM | Separar procesos, operaciones, máquinas, contratos y configuraciones |
| `app/persistence/pm_*`, `maquina_repo.py`, `contrato_repo.py` | BPM | Adaptar a ports outbound PostgreSQL |
| `modules/causal_tree` y `modules/causal_analysis` | TREE | Consolidar grafo, causas, hipótesis y análisis |
| `app/domain/graph.py`, `node_repo.py`, `relationship_repo.py` | TREE | Mover reglas y persistencia causal |
| `routes/`, `services/`, `repositories/` | Compatibilidad | Mantener como aliases hasta demostrar ausencia de consumidores |
| `modules/platform` | Platform | Mantener como composition root e infraestructura transversal |
| `agent_tools` | Adapter | Mantener como frontera de agentes |

## Tareas de migración

1. **ARCH-001 — Caracterización:** proteger contratos HTTP, procesos, operaciones, máquinas, contratos, asociaciones y causalidad.
2. **ARCH-002 — Inventario runtime:** validar endpoints, blueprints, imports dinámicos y consumidores legacy.
3. **ARCH-003 — Dominio BPM:** independizar entidades y reglas de `app/domain`.
4. **ARCH-004 — Ports BPM:** usar contratos explícitos para procesos, operaciones, máquinas, contratos, asociaciones y configuraciones.
5. **ARCH-005 — Persistencia BPM:** separar SQL, mappers y transacciones de application/domain.
6. **ARCH-006 — HTTP BPM:** consolidar adaptadores y mantener fachadas como aliases.
7. **ARCH-007 — Dominio TREE:** consolidar grafo causal y reglas de múltiples padres/hijos.
8. **ARCH-008 — Persistencia TREE:** adaptar causas, hipótesis, nodos, relaciones y análisis a ports.
9. **ARCH-009 — Integración:** introducir referencias BPM por identificador, DTO o port.
10. **ARCH-010 — Externos:** añadir CLI/MCP/Dataiku solo ante consumidores reales.
11. **ARCH-011 — Wiring:** registrar adaptadores canónicos sin romper rutas públicas.
12. **ARCH-012 — Retirada:** eliminar únicamente módulos sin consumidores estáticos ni dinámicos y con cobertura de contrato.

## Primera implementación realizada

- Se documentó el alcance en `uc_bib_solv/plan.md`.
- Se definió `OperationalPersistencePort` con capacidades BPM explícitas.
- Se añadieron operaciones explícitas al adaptador outbound operacional; `__getattr__` queda solo como compatibilidad temporal.
- Se consolidó el runtime HTTP canónico para operational, TREE causal y análisis causal, preservando los contratos de las fachadas legacy.
- Se mantuvieron intactas las rutas HTTP y PostgreSQL.
- Las asociaciones máquina-contrato permanecen dentro del ámbito BPM.

## Segunda implementación realizada

- Se creó `modules/bpm` con entidades independientes de Flask y PostgreSQL.
- Se modelaron explícitamente `Process`, `ProcessVersion`, `Operation`, `Stage`, `Machine`, `Contract`, `MachineContractAssociation` y `MachineOperationConfiguration`.
- Se centralizó `BpmOperationalPort`; el port operacional anterior queda como alias compatible.
- La validación de contratos, máquinas y asociaciones se ejecuta antes de llamar al backend legacy.
- Se mantuvieron las rutas, payloads, fachadas y esquema PostgreSQL sin cambios.
- Tests BPM y de arquitectura: 18/18 correctos; validadores y auditoría runtime correctos.

## Tercera implementación realizada

- Process Modeling dejó de depender de `app/domain/process_modeling` desde su dominio canónico.
- Las entidades, value objects, excepciones, validadores y contexto se sirven desde `modules/bpm/domain`.
- Los nombres históricos de Process Modeling se mantienen como exports compatibles.
- El servicio legacy consume ahora el dominio canónico, mientras la persistencia y las rutas permanecen estables.
- Tests focalizados de Process Modeling y BPM: 21/21 correctos.

## Cuarta implementación realizada

- Se definieron ports BPM explícitos para procesos, versiones, nodos, transiciones y operaciones.
- Se añadió `BpmPostgresPersistenceAdapter` como composición única de los repositorios PostgreSQL actuales para Process Modeling.
- El wiring ya no instancia repositorios `pm_*` directamente; utiliza el adaptador BPM canónico.
- Los imports y nombres de compatibilidad de Process Modeling se mantienen para no romper consumidores existentes.
- No se modificaron SQL, esquema PostgreSQL, datos ni contratos HTTP.
- Tests focalizados de persistencia, Process Modeling, BPM y arquitectura: 17/17 correctos.

### Siguiente fase

Adaptar las persistencias de máquinas, contratos, asociaciones máquina-contrato y configuraciones máquina-operación a ports BPM explícitos, manteniendo las fachadas legacy hasta completar la validación dinámica.

## Quinta implementación realizada

- Se definieron ports BPM para máquinas, contratos, asociaciones máquina-contrato y configuraciones máquina-operación.
- Se añadió `BpmOperationalPostgresAdapter`, que compone `maquina_repo`, `contrato_repo` y `machine_model_repo` sin trasladar ni duplicar SQL.
- El wiring operacional utiliza el adaptador BPM canónico y conserva `OperationalPersistenceAdapter` como fachada legacy.
- Los casos de uso operacionales tipan directamente contra `BpmOperationalPort`.
- No se modificaron PostgreSQL, datos, payloads HTTP, estados ni relaciones BPM.
- Tests focalizados: 25/25 correctos; validadores arquitectónicos y auditoría runtime correctos.

### Siguiente fase

Desacoplar los casos de uso y servicios BPM restantes de repositorios concretos, manteniendo los adaptadores PostgreSQL como única composición de infraestructura y las fachadas legacy como aliases temporales.

## Sexta implementación realizada

- `services/process_modeling_service.py` ya no instancia repositorios PostgreSQL concretos.
- El servicio legacy recibe procesos, versiones, nodos y transiciones mediante `configure_persistence`.
- El wiring BPM es responsable de construir `BpmPostgresPersistenceAdapter` e inyectar sus ports.
- La fachada de aplicación de Process Modeling resuelve dinámicamente las capacidades configuradas y evita referencias obsoletas.
- Se mantienen las fachadas legacy porque siguen siendo consumidores HTTP, tests y adaptadores externos.
- Tests focalizados: 30/30 correctos; validadores, compilación y auditoría runtime correctos.

### Siguiente fase

Revisar la frontera BPM/TREE para que los consumidores causales reciban únicamente referencias y ports de contexto BPM, sin importar repositorios o servicios BPM concretos.

## Gates 7–10 implementados

- Gate 7: TREE usa referencias BPM opacas y un port de contexto público; no importa entidades BPM.
- Gate 8: TREE dispone de ports explícitos y un adaptador PostgreSQL canónico con fachada legacy reversible.
- Gate 9: el composition root registra Process Modeling directamente desde su adaptador HTTP canónico.
- Gate 10: `agent_tools` se compone con servicios BPM/TREE canónicos y no importa repositorios legacy.
- Tests focalizados, compilación, validadores y auditoría runtime correctos en cada gate.

### Siguiente gate

Gate 11: caracterización completa de tests unitarios, integración, contratos HTTP, aliases legacy y E2E disponibles.

## Gates 11–12 cerrados con evidencia

- Gate 11: 7/7 tests arquitectónicos raíz y 39/39 tests focalizados correctos; la ejecución E2E del alcance obtuvo 12/16, con 4 fallos reproducibles de baseline documentados en `architecture_gate_report.md`.
- Gate 12: se eliminó solo el port duplicado sin consumidores `modules/process_modeling/application/ports/persistence.py`.
- Las fachadas restantes se conservan por compatibilidad pública, consumers históricos o falta de validación dinámica suficiente.
- No se modificaron SQL, PostgreSQL ni datos.

## Validación

```bash
python3 scripts/audit_application_architecture.py --check --check-backend
python3 -m uc_bib_solv.architecture_validators --check-structure
python3 -m uc_bib_solv.architecture_validators --check-naming
python3 -m uc_bib_solv.architecture_validators --check-dependencies
python3 -m unittest discover -s tests -p 'test_*.py'
```

No se eliminan rutas, módulos ni datos hasta completar ARCH-012 y verificar consumidores externos.

## Implementación explícita BPM + RCA_TREE

La composición física inicial de la arquitectura objetivo ya está disponible:

- `modules/bpm` contiene el dominio BPM y los casos de uso operativos de procesos, operaciones, máquinas, contratos, asociaciones y configuraciones.
- `modules/rca_tree` contiene entidades y reglas causales, casos de uso de árbol y análisis, ports y adaptadores propios.
- `modules/platform` registra ambos bounded contexts y conserva las fachadas HTTP legacy durante la migración.
- El frontend usa `/api/bpm` y `/api/rca-tree` como contratos canónicos.

La retirada de fachadas HTTP, repositorios legacy y adaptadores transitorios queda deliberadamente pendiente hasta completar la migración de consumidores y la validación dinámica indicada en ARCH-012.
