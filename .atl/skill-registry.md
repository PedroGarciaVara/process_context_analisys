# Skill Registry

## Purpose
This document is the authoritative registry for skills available to the orchestrator and sub-agents in this project.

Its job is to help agents:
- discover which skills exist
- decide which skills are relevant for a task
- locate the source file for each skill
- treat loaded skill instructions as the source of truth for structure, architecture, naming, placement, and workflow

Reading this registry is mandatory before planning, specification, implementation, documentation, or context updates.

## Scope
This registry covers:
- project-local skills stored under `common_spec_driven_development/SKILLs/`
- workflow capabilities referenced by the project for SDD-style execution
- sub-agents that may also be exposed as callable skills in the working environment

## Agent Operating Rules
- The registry is a discovery mechanism, not the final instruction source.
- After identifying relevant skills here, the agent must open the corresponding skill files before acting.
- Registry lookup alone is insufficient to justify implementation decisions.
- If multiple skills apply, load all relevant ones and resolve overlaps before proceeding.
- If skills conflict, stop and ask the human programmer which one has priority.
- If no relevant skill exists, escalate to the human programmer before improvising structure or workflow.
- Agents must not simplify directory layout, file placement, architecture, or workflow without first loading the relevant skills and, if needed, getting explicit human approval.
- If a workflow artifact has an associated registered sub-agent, the orchestrator must delegate artifact authorship to that sub-agent instead of producing the final artifact locally.

## Selection Workflow
1. Read this registry.
2. Identify candidate skills by task type, domain, architecture, and output.
3. Open the referenced `SKILL.md` or `skill.md` files.
4. Extract binding constraints:
   - directory structure
   - file placement
   - architecture
   - naming
   - workflow
   - expected artifacts
5. Detect conflicts or missing guidance.
6. Ask the human programmer if any conflict, ambiguity, or deviation remains.
7. Only then create `spec.md`, `task_plan.md`, code, docs, or context artifacts.

## Skill Categories
- `Foundation`: project setup, structural conventions, SDD integration
- `Architecture`: app/module structure and technical decomposition
- `Implementation`: domain, config, data, connections, UI, security
- `Review / Quality`: design and quality checks
- `Workflow`: planning and execution lifecycle capabilities
- `Sub-agent`: delegable agents that may also be invoked as skills depending on environment setup

## Project Skills
| Skill | Category | When to Load | Source |
| --- | --- | --- | --- |
| `copilot-cli-session-setup` | Foundation | Resolver permisos de herramientas y directorios al inicio de cada sesion Copilot CLI. Cargar en la fase `session-setup` (pre-flight) antes de cualquier otra fase SDD. Documenta `/allow-all`, `/add-dir`, `/list-dirs` y el flag `--allow-all-tools`. | `common_spec_driven_development/SKILLs/copilot-cli-session-setup/SKILL.md` |
| `git-workflow` | Foundation | Definir cuando hacer commit, convencion de mensajes (tipo/ambito/descripcion), estrategia de ramas, uso de `[skip ci]` y cuando el push a `main` dispara el pipeline CI/CD. Cargar en todo task que produzca cambios de codigo o documentacion versionable. | `common_spec_driven_development/SKILLs/git-workflow/SKILL.md` |
| `project-variables-management` | Foundation | Gestionar variables de configuracion del proyecto: catalogo, jerarquia de carga (DSS > env > .env.local), GitHub Secrets, variables DSS, loader Python canonico y anti-patrones. Cargar cuando se trabaje con URLs, credenciales, schemas o cualquier configuracion sensible. | `common_spec_driven_development/SKILLs/project-variables-management/SKILL.md` |
| `project-structure-sdd` | Foundation | Crear o refactorizar la estructura base del proyecto y decidir ubicación de carpetas principales. | `common_spec_driven_development/SKILLs/project-structure-sdd/SKILL.md` |
| `sdd-integration` | Foundation | Integrar o reforzar Spec-Driven Development en un proyecto existente. | `common_spec_driven_development/SKILLs/sdd-integration/SKILL.md` |
| `requirement-doc` | Foundation | Estandar del documento de requerimiento del cliente: estructura obligatoria, patrones de escritura de historias de usuario y criterios funcionales (CUANDO/EL SISTEMA DEBERÁ), flujo de enriquecimiento por el requirements-agent, estados del documento y diferencia entre criterios funcionales (requerimiento) y tecnicas (spec.md). Cargar cuando se recibe un nuevo requerimiento o se revisa uno existente. | `common_spec_driven_development/SKILLs/requirement-doc/SKILL.md` |
| `template-model` | Foundation | Patron obligatorio para crear, modificar, auditar o migrar templates SDD. Define `.sdd-template.yaml`, campos obligatorios, placeholders simples, validacion estructural y preparacion fase 2 Databricks/API. | `common_spec_driven_development/SKILLs/template-model/SKILL.md` |
| `webapp-architecture` | Architecture | Arquitectura modular de webapps Dash en Dataiku DSS. Bootstrap canónico app.py (10 pasos), estructura core/ + callbacks/, contrato de página y restricción C-13 (app.py no actualizable via GIT_DEPLOY). Patrón validado en R21 con 13 páginas. Cargar en cualquier requerimiento que modifique app.py, webapps/core/ o webapps/callbacks/. | `common_spec_driven_development/SKILLs/webapp-architecture/SKILL.md` |
| `config-management` | Implementation | Gestionar configuración, settings, plantillas y contratos de entorno. | `common_spec_driven_development/SKILLs/config-management/SKILL.md` |
| `connections-management` | Implementation | Configurar conexiones a bases de datos o servicios externos. | `common_spec_driven_development/SKILLs/connections-management/SKILL.md` |
| `data-model-management` | Implementation | Definir entidades, relaciones, DDL y persistencia. | `common_spec_driven_development/SKILLs/data-model-management/SKILL.md` |
| `domain-logic` | Implementation | Implementar reglas de negocio y casos de uso separados de la UI. | `common_spec_driven_development/SKILLs/domain-logic/SKILL.md` |
| `frontend-design` | Implementation | Crear o mejorar interfaces frontend con foco en calidad visual y producción. | `common_spec_driven_development/SKILLs/frontend-design/SKILL.md` |
| `dash-callbacks` | Implementation | Implementar interacciones Dash con listas dinámicas, expand/collapse, stores y callbacks robustos. | `common_spec_driven_development/SKILLs/dash-callbacks/SKILL.md` |
| `dash-logger` | Implementation | Implementar logging estructurado, trazabilidad y diagnóstico en aplicaciones Dash. | `common_spec_driven_development/SKILLs/dash-logger/SKILL.md` |
| `dataiku-scenarios-sdd` | Implementation | Crear o mantener el sub-paquete `scenarios_sdd` en un proyecto Dataiku: estructura, escenarios DSS de despliegue (GIT_DEPLOY, PUBLISH_DATA_MODELS), motor DDL y flujo de publicacion de modelos de datos. | `common_spec_driven_development/SKILLs/dataiku-scenarios-sdd/SKILL.md` |
| `dataiku-oracle-db` | Implementation | Integrar Dataiku y Oracle DB para extracción, transformación y consumo de datos en la aplicación. | `common_spec_driven_development/SKILLs/dataiku-oracle-db_management/SKILL.md` |
| `web-Dash-Dataiku` | Architecture | Construir o mantener webapps Dash multipágina orientadas a Dataiku DSS. Sección 5 actualizada con estructura modular core/ + callbacks/ (R21). | `common_spec_driven_development/SKILLs/web-Dash-Dataiku/SKILL.md` |
| `web-authentification` | Implementation | Añadir autenticación, autorización, router protegido y patrones RBAC en Dash. | `common_spec_driven_development/SKILLs/web-authentification/skill.md` |
| `web-design-guidelines` | Review / Quality | Revisar cumplimiento de pautas de diseño web, UX y accesibilidad. | `common_spec_driven_development/SKILLs/web-design-guidelines/SKILL.md` |
| `plan-task-agent` | Workflow | Crear o rehacer `task_plan.md` a partir de un `spec.md`, con gates humanos, trazabilidad y estrategia de verificación. | `common_spec_driven_development/SKILLs/plan-task-agent/SKILL.md` |
| `dash-scenario-async` | Implementation | Desacoplar operaciones pesadas de callbacks Dash usando Scenarios DSS asincrono: tabla de cola, trigger no bloqueante, polling con dcc.Interval. Incluye NCs registradas (commit, bucle poll, race condition, paginacion). | `common_spec_driven_development/SKILLs/dash-scenario-async/SKILL.md` |
| `dash-parallel-execution` | Implementation | Paralelizar calculos masivos por entidad (maquina, equipo) con ThreadPoolExecutor: aislamiento de estado por thread, max_workers, estructura de retorno estandar, manejo de errores parciales. | `common_spec_driven_development/SKILLs/dash-parallel-execution/SKILL.md` |
| `postgresql-primary-persistence` | Implementation | Arquitectura PG-first: PostgreSQL como fuente de verdad operativa, BBDD externa como backend asincrono. Cubre escritura directa PG, tabla de tracking sync, Scenario de sincronizacion, lectura directa sin cache Dataiku y gestion del payload de Store. | `common_spec_driven_development/SKILLs/postgresql-primary-persistence/SKILL.md` |
| `ui-test-structure` | Testing UI | Estructura estandar de carpetas y archivos Playwright para tests de UI. Usar en setup, bootstrap o refactorizacion de assets de tests de UI. | `common_spec_driven_development/agents_UI_test/skills/ui-test-structure/SKILL.md` |
| `ui-log-recovery` | Testing UI | Recuperacion y normalizacion de logs de frontend y backend en modo local (archivo) y remoto (API). Incluye diagnostico de auth SSO. | `common_spec_driven_development/agents_UI_test/skills/ui-log-recovery/SKILL.md` |
| `playwright-dash-webapp` | Testing UI | Testing E2E de webapps Dash embebidas en Dataiku: acceder por URL de backend (sin iframe), autenticacion con formulario propio, seleccion de filas con `.dash-select-cell`, espera de alertas con `waitForFunction`, patron UPDATE con recarga para verificar persistencia. Cargar cuando se escriban o modifiquen tests Playwright para webapps Dataiku. | `.github/instructions/skill-playwright-dash-webapp.instructions.md` |

## Workflow Skills Referenced by the Project
These capabilities are referenced by the project workflow even if their implementation is provided externally or by the Codex environment rather than this repository.

| Skill | Category | When to Load | Source |
| --- | --- | --- | --- |
| `sdd-init` | Workflow | Inicializar artefactos SDD para un nuevo cambio o proyecto. | External workflow capability |
| `sdd-explore` | Workflow | Explorar un problema, cambio o necesidad antes de proponer solución. | External workflow capability |
| `sdd-propose` | Workflow | Proponer un cambio de alto nivel. | External workflow capability |
| `sdd-spec` | Workflow | Redactar especificaciones a partir de una propuesta. | External workflow capability |
| `sdd-design` | Workflow | Diseñar la solución técnica. | External workflow capability |
| `sdd-tasks` | Workflow | Descomponer el trabajo en tareas ejecutables. | External workflow capability |
| `sdd-apply` | Workflow | Aplicar cambios planificados. | External workflow capability |
| `sdd-verify` | Workflow | Verificar la implementación frente a spec y tareas. | External workflow capability |
| `sdd-archive` | Workflow | Archivar artefactos y cierre del cambio. | External workflow capability |

## Sub-Agents Commonly Exposed as Skills
These entries are part of the project workflow and may be invocable as skills depending on the Codex environment.

| Skill / Agent | Category | When to Load | Source |
| --- | --- | --- | --- |
| `requirements-agent` | Sub-agent | Procesar requerimientos y construir `spec.md` robustos. | `common_spec_driven_development/sub_agents/requirements-agent.md` |
| `plan-task-agent` | Sub-agent | Crear `task_plan.md` ejecutables a partir de `spec.md` validados o listos para validación. | `common_spec_driven_development/sub_agents/plan-task-agent.md` |
| `execute-agent` | Sub-agent | Ejecutar `task_plan.md` usando skills como fuente de verdad. | `common_spec_driven_development/sub_agents/execute-agent.md` |
| `template-agent` | Sub-agent | Crear, revisar y normalizar templates SDD usando la skill obligatoria `template-model`. | `common_spec_driven_development/sub_agents/template-agent.md` |
| `documentation-agent` | Sub-agent | Mantener `documentacion.md` y documentación estructural. | `common_spec_driven_development/sub_agents/documentation-agent.md` |
| `context-agent` | Sub-agent | Mantener `context.md` concisos y útiles para agentes. | `common_spec_driven_development/sub_agents/context-agent.md` |

## Usage Guidance by Task Type
| Task Type | Minimum Skills to Consider |
| --- | --- |
| Inicio de sesion Copilot CLI | `copilot-cli-session-setup` |
| Nuevo proyecto con SDD | `project-structure-sdd`, `sdd-integration`, `project-variables-management`, `git-workflow` |
| Nueva webapp Dash | `project-structure-sdd`, `webapp-architecture` |
| Nueva funcionalidad en webapp | `webapp-architecture`, `domain-logic`, `frontend-design` |
| Interacción dinámica compleja en Dash | `webapp-architecture`, `dash-callbacks` |
| Operacion pesada / asincronia en Dash | `dash-scenario-async` |
| Calculo masivo paralelo | `dash-parallel-execution` |
| Persistencia PG-first con BBDD externa | `postgresql-primary-persistence`, `data-model-management` |
| Despliegue de modelos de datos (Dataiku) | `dataiku-scenarios-sdd`, `data-model-management`, `project-variables-management` |
| CI/CD con Dataiku | `dataiku-scenarios-sdd`, `project-variables-management` |
| Tests de UI (webapp con frontend) | `ui-test-structure`, `ui-log-recovery`, `playwright-dash-webapp` |
| Commit y push (cualquier fase) | `git-workflow` |
| Configuración o entornos | `config-management` |
| Integraciones o servicios | `connections-management` |
| Persistencia o entidades | `data-model-management` |
| Seguridad de acceso | `web-authentification` |
| Revisión visual / UX | `web-design-guidelines`, `frontend-design` |
| Nuevo requerimiento o enriquecimiento de borrador | `requirement-doc`, `requirements-agent` |
| Procesar requerimiento cliente | `requirement-doc`, `requirements-agent`, skills de dominio/arquitectura relevantes |
| Planificar implementación desde spec | `plan-task-agent` plus relevant architecture/domain/workflow skills |
| Ejecutar implementación | `execute-agent` plus all task-relevant skills |
| Crear, modificar, auditar o migrar templates SDD | `template-model`, `template-agent` |

## Artifact Authorship Rules
- `spec.md` for a requirement must be authored by `requirements-agent` when that sub-agent is available.
- `task_plan.md` for a requirement must be authored by `plan-task-agent` when that sub-agent is available.
- The orchestrator may gather context, relay clarification questions, and validate outputs, but must not silently author the final `spec.md`.
- The orchestrator may gather context, load the project template, and validate outputs, but must not silently author the final `task_plan.md`.
- If the mandatory sub-agent cannot complete the artifact, the orchestrator must escalate that contingency to the human programmer before proceeding in degraded mode.

## Output Expectations for Agents
When an agent uses this registry correctly, it should be able to state:
- which skills were selected
- why they were selected
- which files were opened
- which structural or architectural constraints were extracted
- whether any conflict or missing guidance was escalated to the human programmer

## Maintenance Rules
- Add every new project skill to this registry when introduced.
- Keep the `Source` path accurate and relative to project root when local.
- Update `When to Load` when project conventions evolve.
- Do not remove a skill from this registry without confirming that no agent workflow depends on it.
- If a skill is deprecated, mark it explicitly instead of silently deleting it.

## Codex runtime policy

All registered SDD agents use `gpt-5.6-luna` with `model_reasoning_effort=medium`.
Substantive delegation must run in a separate Codex session launched with
`codex exec --model gpt-5.6-luna -c model_reasoning_effort=medium -C <repo>`.
