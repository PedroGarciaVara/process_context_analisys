# Auditoría arquitectónica de `bib_solv`

Fecha de auditoría: 2026-08-25  
Alcance: backend Python y organización frontend relevante para la arquitectura modular.  
Estándar aplicado: Domain-oriented Modular Monolith, Clean Architecture, Domain-First y Hexagonal Architecture.

Esta auditoría es documental. No modifica código de producción, PostgreSQL, configuración de ejecución ni tests funcionales.

## 1. Executive Summary

| Área | Evaluación | Base de la evaluación |
|---|---:|---|
| Architecture compliance | 76/100 | La estructura física de dominios y capas existe, pero quedan duplicidades semánticas y compatibilidad mezclada con el núcleo. |
| Domain modeling | 60/100 | Hay entidades y reglas en los dominios, aunque existen dos modelos de `Machine`, dos conceptos de proceso y lógica de grafo duplicada. |
| Dependency rule | 86/100 | Los validadores pasan y no se observan imports directos entre dominios; existe un puente de plataforma que accede a un repositorio BPM concreto. |
| Application/use cases | 78/100 | RCA_TREE está organizado por casos de uso; BPM tiene casos de uso individuales, pero también fachadas amplias y puertos sobredimensionados. |
| Hexagonal boundaries | 72/100 | Hay puertos y adaptadores explícitos, pero algunos adaptadores de compatibilidad contienen lógica de aplicación y acceso directo a persistencia. |
| Naming/organization | 68/100 | La mayoría de los casos de uso siguen nombres accionables; persisten nombres redundantes, aliases y módulos que mezclan contrato y composición. |
| Overengineering control | 82/100 | No se observan microservicios, CQRS o event sourcing innecesarios; el principal riesgo es la duplicación, no la sobreabstracción. |

### Conclusión ejecutiva

1. La aplicación ya tiene una base de Modular Monolith con dos bounded contexts visibles: BPM y RCA_TREE.
2. La dirección de dependencias automatizada es mayoritariamente correcta.
3. La principal deuda no es la ausencia de carpetas, sino la existencia de más de un propietario semántico para algunas entidades y reglas.
4. BPM contiene correctamente procesos, operaciones, máquinas, contratos y configuraciones.
5. RCA_TREE contiene causalidad, hipótesis, causas, evidencias y análisis, sin imports directos hacia BPM.
6. La duplicidad de `Machine` y la coexistencia de `Process`/`ProcessDefinition` deben resolverse antes de ampliar funcionalidades.
7. La lógica de compatibilidad debe quedar fuera de los adaptadores canónicos y reducirse progresivamente.
8. Las puntuaciones son una valoración semántica de esta auditoría; no sustituyen los resultados de los validadores automáticos.

### Evidencia ejecutada

Los siguientes comandos terminaron correctamente durante la inspección:

```text
python3 -m uc_bib_solv.architecture_validators --check-structure
python3 -m uc_bib_solv.architecture_validators --check-naming
python3 -m uc_bib_solv.architecture_validators --check-dependencies
python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations
python3 scripts/audit_application_architecture.py --check --check-backend
```

Resultados principales:

```text
frontend routes=18 renderers=18 menu=9
backend endpoints=112 unique (113 declarations)
routes without renderers: none
renderers without routes: none
duplicate backend endpoint definitions: 1
backend runtime routes=135 available=True
backend inbound adapters not observed at runtime: none
backend dynamic imports: 0
backend parse errors: 0
API modules without static consumers: none
```

El resultado de una declaración backend duplicada requiere revisión, pero no se considera por sí mismo una ruta rota: el mapa runtime contiene 135 rutas disponibles. La diferencia entre declaraciones estáticas y rutas runtime incluye aliases y superficies de compatibilidad.

## 2. Current Architecture

### Estructura física observada

```text
uc_bib_solv/
├── modules/
│   ├── bpm/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── adapters/
│   │   └── infrastructure/
│   ├── rca_tree/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── adapters/
│   │   └── infrastructure/
│   └── platform/
│       ├── application/
│       ├── adapters/
│       ├── domain/
│       └── infrastructure/
├── architecture_validators/
├── agent_tools/
├── utils/
└── webapp/
    └── js/
        ├── api/
        ├── core/
        ├── components/
        ├── services/
        └── views/
```

Las carpetas legacy de primer nivel y los módulos físicos anteriores (`app`, `routes`, `services`, `repositories`, `causal_tree`, `causal_analysis`, `operational_modeling`, `process_modeling`) no forman parte de la estructura actual inspeccionada.

### Composición runtime

`backend_app.py` y `local_server.py` crean la aplicación a través de `modules/platform/infrastructure/app_factory.py`. La factoría compone:

- blueprints transversales de Platform;
- el adaptador operativo BPM y su compatibilidad HTTP;
- el adaptador canónico y de compatibilidad del modelado BPM;
- los adaptadores canónicos y legacy de RCA_TREE;
- las superficies HTTP de compatibilidad que siguen siendo necesarias para la UI actual.

Esto es un composition root válido en concepto, pero el registro actual todavía expone nombres y factories de compatibilidad (`operational_compat`, `process_modeling_compat`, `causas_compat`, `analysis_compat`). La compatibilidad debe considerarse una capa transitoria y mantenerse explícitamente inventariada.

### Dominios funcionales

- **BPM**: procesos, operaciones, etapas, versiones, nodos, transiciones, máquinas, contratos, asociaciones y configuraciones máquina-operación.
- **RCA_TREE**: nodos causales, relaciones, causas, hipótesis, evidencias, análisis, grafo y proyecciones causales.
- **Platform**: bootstrap, configuración, Flask, PostgreSQL, transacciones, logging, wiring y adaptadores externos.

La separación BPM/RCA_TREE en `domain` y `application` es correcta a nivel de namespaces. La frontera se debilita en algunos adaptadores de plataforma y compatibilidad, no en los dominios puros.

### Frontend

El frontend tiene separación por responsabilidades (`api`, `core`, `components`, `services`, `views`) y las rutas observadas tienen renderizadores correspondientes. Persisten aliases de compatibilidad y vistas grandes, especialmente `process-modeling.js` y `causa_detalle.js`, que concentran renderizado, navegación, listeners y coordinación de formularios.

## 3. Violations

Se consideran violations las desviaciones con impacto arquitectónico verificable, no meras preferencias de estilo.

| ID | Severity | Layer | File | Rule | Finding | Impact |
|---|---|---|---|---|---|---|
| ARC-001 | HIGH | BPM/domain | `modules/bpm/domain/processes/entities.py:21-103` | Un concepto de dominio debe tener un propietario y una representación canónica. | Coexisten `Process` y `ProcessDefinition`, ambos representan la identidad y ficha del proceso, con validaciones parcialmente paralelas. | Cambios de nombre, estado o jerarquía pueden aplicarse a un modelo y no al otro; aumenta el riesgo de divergencia. |
| ARC-002 | HIGH | BPM/domain | `modules/bpm/domain/machines/entities.py:30-48`; `modules/bpm/domain/machines/operational_entities.py:10-31` | Una entidad de dominio no debe tener dos implementaciones activas. | Existen dos clases `Machine` con contratos de construcción y atributos diferentes; además, `domain/__init__.py` y `machines/__init__.py` exponen propietarios distintos. | Los casos de uso pueden operar con invariantes, identificadores y payloads incompatibles. |
| ARC-003 | HIGH | RCA_TREE/domain | `modules/rca_tree/domain/causal_graph/rules.py:62-183`; `causal_graph/operations.py:13-46`; `domain/exceptions.py` | Cada regla de negocio y taxonomía de errores debe tener una implementación canónica. | Ciclos, eliminación y proyección del árbol se implementan en `rules.py` y vuelven a implementarse en `operations.py`; además conviven `GraphDomainError` y errores específicos de `exceptions.py`. | Una corrección puede quedar aplicada solo en una ruta y producir comportamientos diferentes. |
| ARC-004 | HIGH | Platform/adapters | `modules/platform/adapters/bpm_contract_context.py:8-20` | Las integraciones entre bounded contexts deben usar ports o referencias, no repositorios concretos. | El puente de Platform importa directamente `bpm.adapters.outbound.postgres.contrato_repo` y ejecuta `get_by_id`, `get_all` y `create`. | Platform conoce detalles SQL/adaptador de BPM y puede saltarse validaciones y casos de uso BPM. |
| ARC-005 | MEDIUM | BPM/application/ports | `modules/bpm/application/ports/process_modeling.py:8-62` | `application/ports` debe contener contratos, no implementaciones de aplicación. | El módulo declara `BpmProcessModelingPort` y también implementa `BpmProcessModelingApplication` como fachada delegadora. | Mezcla el contrato inbound con composición concreta y dificulta registrar y testear cada responsabilidad. |
| ARC-006 | MEDIUM | BPM/application | `modules/bpm/application/bpm_operational.py:32-80`; `application/ports/bpm_ports.py` | Los casos de uso deben recibir ports explícitos y estrechos. | La composición opera con un objeto `persistence` genérico y expone una superficie amplia de procesos, contratos, máquinas, configuraciones y catálogo. | Oculta dependencias reales, dificulta sustitución por dobles y favorece que crezcan fachadas tipo god object. |
| ARC-007 | MEDIUM | RCA_TREE/adapters | `modules/rca_tree/adapters/outbound/causas_compat.py:1-180` y resto del módulo | Un adaptador outbound debe traducir a persistencia o sistema externo, no contener composición de formularios y lógica de aplicación. | El adaptador de compatibilidad resuelve contexto, prepara formularios, etiquetas y payloads, y llama directamente a repositorios PostgreSQL. | Presentación, aplicación y persistencia quedan acopladas; la retirada de compatibilidad se vuelve costosa. |
| ARC-008 | LOW | HTTP/composition | `modules/platform/infrastructure/app_factory.py:11-40` y auditor de arquitectura | Una ruta pública debe tener una declaración canónica inequívoca; aliases deben estar clasificados. | El inventario estático detecta una declaración backend duplicada y el runtime registra superficies canónicas y de compatibilidad. | Puede ocultar colisiones o dificultar saber qué implementación responde a una URL. |
| ARC-009 | MEDIUM | BPM/domain/application | `modules/bpm/domain/processes/entities.py`, `machines/entities.py`, `contracts/entities.py` y casos de uso asociados | Las invariantes centrales deben vivir en entidades/agregados o servicios de dominio, no solo en validadores de payload. | Varias entidades son dataclasses centradas en validación; los casos de uso construyen modelos desde diccionarios y coordinan persistencia sin comportamiento de negocio significativo. | El modelo es anémico: reglas futuras pueden duplicarse en HTTP, aplicación y persistencia. |

Los ARC-001, ARC-002, ARC-003 y ARC-004 deben priorizarse. ARC-005 a ARC-008 pueden corregirse incrementalmente sin reescribir el sistema. ARC-009 requiere primero una decisión explícita sobre agregados y comportamiento esperado.

## 4. Architectural Smells

| Smell | Ubicación representativa | Confianza | Riesgo |
|---|---|---|---|
| Anemic domain model | Entidades BPM que validan construcción pero exponen poco comportamiento | HIGH | Las invariantes se dispersan cuando aparecen operaciones de negocio no triviales. |
| Duplicate entity ownership | Dos `Machine`; `Process` y `ProcessDefinition`; `Operation` reexportada desde `operations` | HIGH | Ambigüedad de imports, mappers y casos de uso. |
| Duplicate graph logic | `causal_graph/rules.py` y `causal_graph/operations.py` | HIGH | Resultados distintos para ciclos, eliminación o proyección. |
| Broad application facade | `BpmOperationalApplication` y `ProcessModelingApplication` | HIGH | Superficies difíciles de versionar y testear. |
| Generic persistence dependency | Parámetro `persistence` y port operacional grande | MEDIUM | El caso de uso conoce menos de lo que realmente necesita y depende de un contrato implícito. |
| Compatibility facade accumulation | Factories y blueprints legacy en infrastructure/adapters | HIGH | El runtime conserva más de una entrada conceptual para el mismo caso de uso. |
| Mislocated compatibility logic | `rca_tree/adapters/outbound/*compat*` | HIGH | El nombre y la ubicación no reflejan que también contiene aplicación y presentación. |
| Primitive obsession | `dict[str, Any]`, IDs como strings y payloads no tipados | MEDIUM | Errores de pertenencia y forma de payload aparecen tarde. |
| Frontend feature scattering | `process-modeling.js` (~969 líneas), `causa_detalle.js` (~1059 líneas) | HIGH | Los cambios visuales mezclan coordinación, API, estado y renderizado. |
| Empty/non-functional platform domain | `modules/platform/domain` sin entidades | LOW | No es un defecto por sí mismo; puede eliminarse o mantenerse solo si el estándar local exige la carpeta. |
| Absence of domain events | BPM y RCA_TREE | LOW | No es una violation; solo limita desacoplamiento si aparecen procesos asíncronos o auditoría de cambios. |

## 5. Domain Review

### BPM

#### Conceptos y entidades

El dominio BPM contiene procesos, versiones, nodos, transiciones, operaciones, etapas, máquinas, contratos, asociaciones y configuraciones. La cobertura conceptual es adecuada para el alcance funcional solicitado.

#### Value objects y reglas

Existen códigos, tipos de nodo, estados, referencias BPM, validadores de UUID, niveles y payloads. Las reglas de jerarquía y de grafo se expresan en constructores y módulos de reglas.

#### Problemas de modelado

- `Process` representa la identidad operacional canónica, mientras `ProcessDefinition` representa la definición BPM con casi los mismos campos.
- `Operation` y `Stage` son definidos en `processes.entities` y solo reexportados por `operations.entities`; el directorio de operaciones no es todavía el propietario real.
- `Machine` está duplicada y tiene dos convenciones de identificador (`id`/`machine_id`) y dos contratos de payload.
- Contrato y máquina contienen invariantes útiles, pero la mayor parte del comportamiento está expresado como validación de entrada, no como métodos de entidad o servicios de dominio.
- No se observa una definición explícita de agregados, límites de consistencia o comandos de dominio.
- No se observan eventos de dominio. Esto es aceptable mientras no existan necesidades de integración asíncrona.

#### Candidatos de agregados

La auditoría identifica candidatos, no decide su forma definitiva:

- `Process`/`ProcessDefinition` como raíz de la ficha y jerarquía BPM.
- `ProcessVersion` como agregado de una versión y su grafo de nodos/transiciones.
- `Operation` como entidad perteneciente a una versión BPM, posiblemente con sus etapas.
- `Contract` como agregado de alcance BPM y asociación de máquinas.
- `Machine` como agregado independiente con configuraciones vinculadas a operación/versión.

### RCA_TREE

#### Conceptos y entidades

El dominio contiene `Node`, `Cause`, `Hypothesis`, `Relationship`, `Analysis`, `AnalysisParticipant` y `AnalysisResult`, además de tags y tipos de relación.

#### Value objects y reglas

`NodeType`, `RelationshipType`, `NodeId` y `CauseTag` aportan normalización. Las firmas de relación, ciclos y proyección del árbol están centralizadas parcialmente en `causal_graph/rules.py`.

#### Problemas de modelado

- `causal_graph/operations.py` duplica reglas de eliminación y proyección.
- La taxonomía `GraphDomainError` convive con `CycleDetectedError`, `NodeDeletionError` e `InvalidRelationshipError`.
- Las entidades causales tienen invariantes básicas, pero los límites del agregado del grafo no están formalizados.
- Las entidades de análisis validan con `ValueError` directamente en lugar de una taxonomía común de RCA_TREE.
- No se observan eventos de dominio.

#### Frontera con BPM

RCA_TREE no importa entidades de BPM desde `domain` ni `application`, lo cual cumple la frontera principal. La contextualización debe continuar mediante IDs, DTOs o un `BpmContextPort`; el puente actual de Platform debe dejar de acceder directamente a un repositorio concreto.

## 6. Use Case Review

| Área | Organización observada | Evaluación | Mejora prioritaria |
|---|---|---|---|
| BPM processes | `application/use_cases/processes/` con `create`, `list`, `update`, `delete` y definición BPM | GOOD con redundancia | Decidir si `Process` o `ProcessDefinition` es canónico y renombrar archivos redundantes. |
| BPM operations | `application/use_cases/operations/` con listado, creación y actualización de etapas | ACCEPTABLE | Hacer que `operations` sea propietario real de `Operation` y `Stage`, no un reexport. |
| BPM contracts | `application/use_cases/contracts/` con creación, actualización, eliminación, estado y asociaciones | GOOD | Reducir dependencia de persistence genérico y mantener validación BPM en el dominio. |
| BPM machines | `application/use_cases/machines/` | MEDIUM | Unificar la clase `Machine` y sus DTOs antes de ampliar casos de uso. |
| BPM modeling | `nodes`, `versions`, `transitions`, `context` | GOOD | Mantener casos accionables; separar la fachada de composición del módulo `ports`. |
| BPM composition | `BpmOperationalApplication` y `ProcessModelingApplication` | ACCEPTABLE como composition service | No añadir reglas; preferir registro explícito de casos de uso y puertos estrechos. |
| RCA_TREE tree | `application/use_cases/tree/` | GOOD | Conservar como capacidad de grafo; centralizar las reglas duplicadas. |
| RCA_TREE causes | `causes/`, `hypotheses/`, `reusable_nodes/` | GOOD | Mantener nombres accionables y DTOs por capacidad cuando sean necesarios. |
| RCA_TREE analyses | `application/use_cases/analyses/` | GOOD | Unificar errores de dominio y mantener adapters fuera de la aplicación. |
| Compatibility surfaces | `*_compat`, factories legacy y blueprints históricos | TEMPORAL | Registrar consumidor, contrato y fecha de revisión para cada alias. |

La estructura RCA_TREE actual basada en `application/use_cases/<capacidad>/` cumple mejor el estándar de casos de uso que las fachadas históricas planas. En BPM, la estructura de carpetas es correcta, pero las composiciones amplias y los nombres redundantes reducen la claridad.

## 7. Dependency Review

### Regla esperada

```text
domain → domain del mismo bounded context
application → domain + ports
adapters → application ports + traducción tecnológica
infrastructure → composición de implementaciones
platform → composition root y capacidades transversales
```

### Resultado

| Dependencia | Estado | Observación |
|---|---|---|
| BPM domain → Flask/PostgreSQL/HTTP | PASS | Los validadores no reportan imports prohibidos. |
| RCA_TREE domain → Flask/PostgreSQL/HTTP | PASS | No se observan dependencias de infraestructura. |
| BPM domain/application ↔ RCA_TREE domain/application | PASS | No se observan imports directos cruzados. |
| Application → adapters/infrastructure | PASS automático | Los validadores no reportan imports directos desde application. |
| Inbound HTTP → outbound PostgreSQL | PASS automático | No se reportan imports prohibidos; la coordinación pasa por composición. |
| Platform adapter → repositorio PostgreSQL BPM | CONCERNS | `bpm_contract_context.py` accede directamente a `contrato_repo`; debe pasar por un port de contexto BPM. |
| `application/ports/process_modeling.py` → implementación | CONCERNS | El contrato y la fachada se mezclan en el mismo archivo. |
| RCA_TREE compatibility outbound → repositorios PostgreSQL | CONCERNS | El adaptador contiene lógica de aplicación/formularios, no solo traducción. |
| Infrastructure → concrete implementations | EXPECTED | La factoría y wiring son los composition roots. |

Los validadores automáticos certifican la dirección sintáctica básica, pero no pueden determinar por sí solos si un objeto concreto es el port correcto ni si la lógica de compatibilidad está en la capa adecuada.

## 8. Naming Review

| Elemento | Evaluación | Comentario |
|---|---|---|
| `bpm`, `rca_tree`, `platform` | GOOD | Expresan bounded contexts y plataforma. |
| `application/use_cases/<feature>` | GOOD | Organización orientada a capacidad y casos accionables. |
| `create_contract.py`, `update_machine.py`, `list_operations.py` | GOOD | Verbo + intención; fáciles de localizar. |
| `create_process_definition.py` + `create_process.py` | CHANGE | Redundancia semántica; requiere elegir un término canónico. |
| `update_process_definition.py` + `update_process.py` | CHANGE | Mismo problema para actualización. |
| `transitions/transitions.py`, `versions/versions.py` | CHANGE | Nombres tipo grupo; preferir casos accionables (`create_transition`, `delete_transition`, etc.). |
| `operations/entities.py` como reexport | CHANGE | El nombre sugiere ownership, pero el modelo vive en `processes.entities`. |
| `BpmOperationalApplication` | ACCEPTABLE | Nombre correcto para compositor; no debe confundirse con un caso de uso. |
| `build_*_service`, `*_compat` | ACCEPTABLE temporal | Válidos como compatibilidad explícita; no deben ser nombres del núcleo canónico. |
| `BpmProcessModelingPort` y `BpmProcessModelingApplication` en el mismo módulo | CHANGE | Separar `ports` de composición. |
| Repositories/adapters PostgreSQL | ACCEPTABLE | Los nombres indican tecnología, aunque los mappers deben quedar separados. |
| Domain events | NOT PRESENT | No es incumplimiento; solo debe añadirse si existe un consumidor real. |
| Frontend `process-modeling.js`, `causa_detalle.js` | CHANGE | El nombre de vista es válido, pero la responsabilidad está demasiado concentrada. |

## 9. Target Architecture

La arquitectura objetivo debe ser mínima y explícita, sin crear capas sin consumidores:

```text
uc_bib_solv/modules/
├── bpm/
│   ├── domain/
│   │   ├── processes/
│   │   ├── operations/          # owner real de Operation y Stage
│   │   ├── machines/
│   │   ├── contracts/
│   │   ├── associations/
│   │   ├── configurations/
│   │   └── shared/
│   ├── application/
│   │   ├── use_cases/
│   │   │   ├── processes/
│   │   │   ├── operations/
│   │   │   ├── nodes/
│   │   │   ├── versions/
│   │   │   ├── transitions/
│   │   │   ├── machines/
│   │   │   ├── contracts/
│   │   │   ├── catalog/
│   │   │   └── context/
│   │   ├── ports/
│   │   │   ├── inbound/
│   │   │   └── outbound/
│   │   └── dto/
│   ├── adapters/
│   │   ├── inbound/http/
│   │   └── outbound/postgres/
│   └── infrastructure/wiring.py
├── rca_tree/
│   ├── domain/
│   │   ├── causal_graph/
│   │   ├── causes/
│   │   └── analyses/
│   ├── application/
│   │   ├── use_cases/
│   │   │   ├── tree/
│   │   │   ├── causes/
│   │   │   ├── hypotheses/
│   │   │   ├── reusable_nodes/
│   │   │   └── analyses/
│   │   ├── ports/inbound/
│   │   ├── ports/outbound/
│   │   └── dto/
│   ├── adapters/
│   │   ├── inbound/http/
│   │   └── outbound/postgres/
│   └── infrastructure/wiring.py
└── platform/
    ├── application/ports/
    ├── adapters/
    │   ├── inbound/http/
    │   └── agent_tools/
    └── infrastructure/
        ├── app_factory.py
        ├── config.py
        ├── postgres.py
        └── wiring.py
```

Reglas objetivo:

- `bpm.domain` solo importa su propio dominio.
- `rca_tree.domain` solo importa su propio dominio.
- RCA_TREE recibe contexto BPM mediante `BpmContextPort` y referencias, nunca mediante repositorios BPM concretos.
- Cada entidad tiene un propietario único.
- Cada regla de grafo y cada excepción funcional tiene una implementación canónica.
- `application/ports` contiene contratos; las composiciones se ubican en `application` o `infrastructure` según su responsabilidad.
- La compatibilidad HTTP se registra desde adaptadores canónicos, pero queda separada y etiquetada.
- El frontend puede conservar `api`, `core`, `components`, `services` y `views`; no es necesario reescribirlo para corregir el backend. La descomposición de vistas grandes debe seguir el coste real de cambio.

## 10. Refactoring Plan

### P0 — Caracterización y decisiones de ownership

- Mantener el comportamiento actual con tests de contrato para procesos, operaciones, máquinas, contratos, asociaciones y RCA_TREE.
- Registrar las rutas legacy y su consumidor real.
- Revisar la declaración backend duplicada y distinguir duplicidad real de alias intencionado.
- Definir un port de consulta BPM para el puente de Platform.
- No modificar esquema ni datos.

Gate: inventario runtime, tests de contrato y decisiones de ownership aprobadas.

### P1 — Unificación del dominio BPM

- Elegir `Process` o `ProcessDefinition` como entidad canónica.
- Unificar las dos clases `Machine` y los nombres de identificadores.
- Mover la definición de `Operation` y `Stage` a su owner real o documentar explícitamente su pertenencia al agregado de proceso.
- Separar validación de payload de comportamiento de entidad.

Gate: una sola clase por entidad, mappers actualizados y tests de dominio sin infraestructura.

### P2 — Unificación del dominio RCA_TREE

- Elegir una única implementación para ciclos, eliminación y proyección.
- Unificar `GraphDomainError` con la taxonomía de excepciones de RCA_TREE.
- Introducir un agregado de grafo solo si las reglas de consistencia lo justifican.
- Mantener `Analysis` y sus resultados con errores de dominio propios.

Gate: reglas de grafo cubiertas por tests y ningún duplicado funcional.

### P3 — Puertos y casos de uso

- Separar `BpmProcessModelingPort` de `BpmProcessModelingApplication`.
- Sustituir `persistence` genérico por puertos de repositorio/contexto necesarios en cada capacidad.
- Reducir las fachadas a composition services sin reglas.
- Mantener los casos de uso RCA_TREE organizados por feature.

Gate: dobles en memoria para los casos de uso y contratos de ports explícitos.

### P4 — Adaptadores y compatibilidad

- Mover la lógica de formularios y contexto de `causas_compat` a inbound/application, dejando outbound como traducción.
- Crear una única implementación HTTP canónica por capacidad.
- Mantener aliases mientras exista un consumidor; registrar fecha y criterio de retirada.
- Revisar factories `build_*_service` y renombrarlas solo después de migrar consumidores.

Gate: mapa de rutas sin ambigüedades, compatibilidad cubierta y ausencia de lógica de negocio en adapters compatibility.

### P5 — Frontend y limpieza incremental

- Extraer de `process-modeling.js` la coordinación de formulario, acciones de navegación y panel contextual.
- Evaluar la retirada de `causa_detalle.js` solo después de demostrar que `causa_detalle_v02.js` cubre todos sus consumidores.
- Limpiar allowlists y aliases que queden sin consumidores.
- No crear eventos, CQRS ni nuevas capas si no existe una necesidad concreta.

Gate: E2E de rutas canónicas y aliases, y revisión humana de cada eliminación.

## 11. Architecture Tests to Add

| Regla | Detección | Tipo | Severidad |
|---|---|---|---|
| `domain` no importa Flask, PostgreSQL, `app`, routes, services o repositories | AST/import scanner | SCRIPTABLE | HIGH |
| BPM y RCA_TREE no importan directamente el dominio o aplicación del otro | AST scanner de namespaces | SCRIPTABLE | HIGH |
| `application` no importa adapters ni infrastructure | AST scanner | SCRIPTABLE | HIGH |
| Un único owner por entidad (`Process`, `Machine`, `Operation`, etc.) | Registro explícito de símbolos + scan de exports | SCRIPTABLE | HIGH |
| Platform no accede directamente a repositorios concretos BPM/RCA_TREE | Scan de imports y contratos de port | SCRIPTABLE | HIGH |
| `application/ports` contiene solo Protocols/interfaces/DTOs de contrato | AST + clasificación de símbolos | SCRIPTABLE | MEDIUM |
| Cada caso de uso está bajo `application/use_cases/<feature>` y tiene nombre accionable | Convención de paths y nombres | SCRIPTABLE | MEDIUM |
| No hay dos módulos con la misma regla normalizada de grafo | Registro de reglas de dominio | SCRIPTABLE | HIGH |
| Endpoints duplicados por método y path | `Flask.url_map` + inventario estático | SCRIPTABLE | MEDIUM |
| Aliases legacy tienen consumidor o allowlist documentada | Referencias, tests, docs y allowlist | SCRIPTABLE | MEDIUM |
| Las entidades son raíces de agregados y exponen comportamiento suficiente | Revisión de invariantes y comandos | SEMANTIC_AUDIT | HIGH |
| Las asociaciones BPM tienen límite de consistencia explícito | Revisión de reglas y casos de uso | SEMANTIC_AUDIT | HIGH |
| El grafo RCA_TREE tiene raíz y reglas de consistencia claramente definidas | Revisión de modelo y escenarios | SEMANTIC_AUDIT | HIGH |
| Los validadores de payload no duplican reglas de entidades | Comparación de invariantes | SEMANTIC_AUDIT | MEDIUM |
| Una ruta de compatibilidad debe permanecer por necesidad externa | Evidencia de consumidor real | SEMANTIC_AUDIT | MEDIUM |
| Las vistas frontend tienen responsabilidades separadas | Revisión de tamaño, imports y flujo | SEMANTIC_AUDIT | MEDIUM |

No debe confundirse un gate SCRIPTABLE verde con conformidad semántica completa. En este repositorio, los validadores actuales confirman sobre todo estructura, imports y wiring; no resuelven ownership de entidades ni diseño de agregados.

## 12. Decisions Requiring Human Input

1. ¿`Process` o `ProcessDefinition` es la entidad canónica de la ficha BPM y la jerarquía?
2. ¿La clase `Machine` canónica debe usar `id` o `machine_id`, y qué campos pertenecen al agregado?
3. ¿`Operation` y `Stage` pertenecen al agregado `ProcessVersion` o deben ser agregados BPM independientes?
4. ¿Qué transiciones de ciclo de vida de contratos y máquinas son reglas de negocio reales y qué estados deben conservarse?
5. ¿El agregado raíz de RCA_TREE es un grafo causal independiente, un árbol por contrato o una proyección contextual?
6. ¿Qué aliases HTTP legacy son necesarios para consumidores externos no visibles en el repositorio?
7. ¿El puente BPM de Platform debe exponer un `BpmContextPort` de solo lectura o invocar un caso de uso/application query BPM?
8. ¿Debe mantenerse físicamente `modules/platform/domain` vacío por uniformidad o eliminarse al no contener entidades?
9. ¿La retirada de `causa_detalle.js` puede aprobarse tras la evidencia de consumidores y E2E de `causa_detalle_v02.js`?

