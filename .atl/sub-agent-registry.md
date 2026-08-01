# Sub-Agent Registry

## Purpose
This document is the authoritative registry for sub-agents used by the orchestrator in this project.

Its job is to help the orchestrator:
- discover which sub-agents exist
- decide which sub-agent should handle each workflow phase
- locate the source file for each sub-agent
- understand each sub-agent's responsibility, inputs, outputs, and limits

Reading this registry is mandatory before delegating requirement analysis, planning, implementation, documentation, or context maintenance.

## Scope
This registry covers the project-local sub-agents stored under `common_spec_driven_development/sub_agents/`.

## Agent Operating Rules
- This registry is a discovery and routing document, not a substitute for the sub-agent instructions.
- After identifying a relevant sub-agent here, the orchestrator must open the corresponding source file before delegating work.
- Registry lookup alone is insufficient to authorize delegation.
- If multiple sub-agents are relevant, the orchestrator must choose the minimal set that covers the task and define the order of execution.
- If a task appears to require a sub-agent that is missing from this registry, escalate to the human programmer before improvising workflow.
- If a sub-agent requires skills, the orchestrator must also read `.atl/skill-registry.md` and ensure the relevant skills are loaded.

## Delegation Workflow
1. Read this registry.
2. Identify the workflow phase or task type.
3. Select the relevant sub-agent or sub-agents.
4. Open the referenced sub-agent file.
5. Check whether the sub-agent requires skill loading or additional context.
6. Delegate with the minimum context needed to perform the task correctly.
7. Validate that returned outputs match the expected contract.

## Registry Fields
Each sub-agent entry should define:
- `Sub-agent`: canonical name
- `Primary role`: what it is responsible for
- `When to use`: task types or workflow phases
- `Required inputs`: minimum artifacts or context needed
- `Expected outputs`: files, decisions, or summaries it should produce
- `Dependencies`: skills, artifacts, or other sub-agents it depends on
- `Source`: file path of the sub-agent instructions

## Available Sub-Agents

> **Nota sobre Source paths:** La columna `Profile (Copilot CLI)` referencia el perfil
> ligero en `.github/agents/` — fuente canónica para invocación via `/fleet @nombre`,
> `/agent`, y `task` tool en Copilot CLI. La columna `Instructions` referencia el archivo
> de instrucciones completo. Ambos son necesarios: el perfil fija el modelo y permite
> la invocación nativa; las instrucciones contienen las reglas completas.

| Sub-agent | Primary Role | When to Use | Required Inputs | Expected Outputs | Dependencies | Profile (Copilot CLI) | Instructions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `requirements-agent` | Transformar requerimientos del cliente en especificaciones técnicas robustas. | Recepción de un nuevo requerimiento, análisis de ambigüedades, construcción o iteración de `spec.md`. | Requerimiento bruto, contexto relevante, decisiones humanas sobre ambigüedades. | `./requeriments_spec_driven_development/requerimiento_xx/spec.md`, preguntas de aclaración, decisiones registradas, alcance y criterios de aceptación claros. | `.atl/skill-registry.md`, skills relevantes al dominio/arquitectura. | `.github/agents/requirements-agent.md` | `common_spec_driven_development/sub_agents/requirements-agent.md` |
| `plan-task-agent` | Transformar `spec.md` en un `task_plan.md` ejecutable y verificable. | Después de disponer de `spec.md` y antes de implementar. | `./requeriments_spec_driven_development/requerimiento_xx/spec.md`, contexto técnico relevante, plantilla de task plan, skills cargadas. | `./requeriments_spec_driven_development/requerimiento_xx/task_plan.md`, desglose de tareas, gates humanos, trazabilidad de criterios de aceptación y estrategia de verificación. | `.atl/skill-registry.md`, `common_spec_driven_development/templates/task_plan.template.md`, skills relevantes de arquitectura/flujo. | `.github/agents/plan-task-agent.md` | `common_spec_driven_development/sub_agents/plan-task-agent.md` |
| `execute-agent` | Ejecutar tareas de implementación definidas en `task_plan.md`. | Después de tener un `task_plan.md` aprobado y artefactos previos suficientes. | `./requeriments_spec_driven_development/requerimiento_xx/task_plan.md`, `./requeriments_spec_driven_development/requerimiento_xx/spec.md`, contexto técnico, skills relevantes cargadas. | Código, estructura de directorios, cambios técnicos, evidencia de ejecución o bloqueos. | `.atl/skill-registry.md`, skills relevantes de arquitectura e implementación. | `.github/agents/execute-agent.md` | `common_spec_driven_development/sub_agents/execute-agent.md` |
| `template-agent` | Crear, revisar y normalizar templates SDD bajo el modelo obligatorio `template-model`. | Creacion, modificacion, auditoria, piloto o migracion futura de templates SDD. | Proposito de la template, artefacto objetivo, fase de workflow, metadata tecnica, placeholders y fuente legacy si aplica. | `.sdd-template.yaml` validada estructuralmente o reporte de cumplimiento con preguntas pendientes. | `.atl/skill-registry.md`, `common_spec_driven_development/SKILLs/template-model/SKILL.md`. | `.github/agents/template-agent.md` | `common_spec_driven_development/sub_agents/template-agent.md` |
| `documentation-agent` | Mantener documentación operativa y estructural tras los cambios. | Después de completar implementación o al revisar documentación existente. | Directorios afectados, contexto técnico, artefactos finales. | `documentacion.md` actualizados y descripciones de módulos/directorios. | `.atl/skill-registry.md`, contexto actualizado, skills estructurales relevantes. | `.github/agents/documentation-agent.md` | `common_spec_driven_development/sub_agents/documentation-agent.md` |
| `context-agent` | Mantener `context.md` útiles para ventanas de contexto de agentes. | Tras cambios de implementación, refactors, o para preparar contexto de trabajo. | Directorio objetivo, implementación actual, documentación relevante. | `context.md` concisos con módulos, APIs, flujos y dependencias. | `.atl/skill-registry.md`, contexto del proyecto, skills relevantes para validar estructura. | `.github/agents/context-agent.md` | `common_spec_driven_development/sub_agents/context-agent.md` |
| `nc-resolution-agent` | Gestionar el ciclo de vida completo de una NC: registrar en `nc-log.md`, clasificar causa raiz, coordinar correccion con el agente correspondiente y verificar cierre con validacion humana. | Cuando `validate-implementation` detecta una desviacion, el requerimiento tiene estado `no_conforme` o `ui-log-analysis-agent` devuelve candidatos NC. | ID del requerimiento, descripcion de la desviacion, `spec.md`, `task_plan.md`, artefactos de NC si los hay. | `nc-log.md` creado/actualizado, `task_plan.md` actualizado, `traza_requerimiento.md` actualizado, informe de cierre al orquestador. | `spec.md` y `task_plan.md` del requerimiento; `nc-log.template.md` disponible. | `.github/agents/nc-resolution-agent.md` | `common_spec_driven_development/sub_agents/nc-resolution-agent.md` |
| `data-model-deploy-agent` | Automatizar el ciclo de publicacion de modelos de datos: leer datasets DSS, generar DDL segun convenciones de naming y ejecutar via escenario PUBLISH_DATA_MODELS. | Cuando el desarrollador ha creado/modificado datasets en Dataiku DSS y se quiere sincronizar las tablas de BD. | Variables DSS_SITE_URL, DSS_API_KEY, DSS_PROJECT_KEY; escenario PUBLISH_DATA_MODELS configurado en DSS. | Tablas creadas/actualizadas en el motor correspondiente; reporte de datasets procesados. | `dss_dataset_reader`, `ddl_generator`, `despliegue_modelos`; escenario DSS PUBLISH_DATA_MODELS. | `.github/agents/data-model-deploy-agent.md` | `.github/instructions/data-model-deploy-agent.instructions.md` |
| `ci-cd-dataiku-agent` | Coordinar el flujo CI/CD automatico: trigger del escenario DSS de despliegue, ejecucion de tests UI, generacion de `ci-result.md` y auto-registro de NCs. | Tras push a `main` o cuando se quiere ejecutar el ciclo despliegue+validacion manualmente. | Variables de entorno `DSS_SITE_URL`, `DSS_API_KEY`, `DSS_PROJECT_KEY`, `DSS_DEPLOY_SCENARIO_ID`, `WEBAPP_URL`. | `ci-result.md` en `.playwright-artifacts/`, `nc-log.md` actualizado si hay NCs, artefactos Playwright. | `ui-validation-orchestrator`, `ui-log-analysis-agent`, `nc-resolution-agent`; escenario DSS `GIT_DEPLOY` configurado. | `.github/agents/ci-cd-dataiku-agent.md` | `.github/instructions/ci-cd-dataiku.instructions.md` |
| `ui-validation-orchestrator` | Coordinar el flujo completo de validacion UI (setup, generacion, ejecucion, recuperacion de logs, analisis). | Cualquier peticion de validacion UI end-to-end o cuando el `task_plan.md` incluye fase de tests de UI. | URLs objetivo, modo (`local` o `remote`), alcance. | Resumen de fases, artefactos producidos, candidatos NC, traza de ejecucion. | `ui-test-structure`, `ui-log-recovery` skills; `.playwright-artifacts/` accesible. | `.github/agents/ui-validation-orchestrator.md` | `common_spec_driven_development/agents_UI_test/agents/ui-validation-orchestrator.agent.md` |
| `ui-log-analysis-agent` | Analizar artefactos de ejecucion de tests y logs del backend para identificar patrones de error y candidatos NC. | Tras ejecucion de tests de UI para diagnostico o preparacion del reporte de `validate-implementation`. | Carpeta de ejecucion en `.playwright-artifacts/test-results/` (timestamp o "latest"). | `analysis-report.md` en la carpeta de ejecucion, resumen con candidatos NC y recomendaciones. | Artefactos de ejecucion producidos por `ui-test-execution-agent` y `ui-log-recovery-agent`. | `.github/agents/ui-log-analysis-agent.md` | `common_spec_driven_development/agents_UI_test/agents/ui-log-analysis.agent.md` |
| `playwright-setup-agent` | Instalar y configurar Playwright para proyectos de testing UI. | Al iniciar la fase `execute-ui-tests` por primera vez o cuando falta la configuracion de Playwright. | Directorio del proyecto, `package.json` existente o ausente, browsers requeridos. | `playwright.config.ts`, scripts npm actualizados, browsers instalados, variables de entorno configuradas. | Node.js disponible; `.playwright-artifacts/` creado. | `.github/agents/playwright-setup-agent.md` | `common_spec_driven_development/agents_UI_test/agents/playwright-setup-agent.md` |
| `ui-test-generation-agent` | Generar specs de tests E2E con Playwright para webapps Dash en Dataiku DSS. | Cuando hay una webapp Dash nueva o modificada y se necesitan tests E2E conformes con los patrones del proyecto. | `spec.md`, `task_plan.md`, URL de la webapp, patrones de referencia en `common_spec_driven_development/tests/`. | Archivos `tests/*.spec.ts` conformes con los patrones validados del proyecto. | Playwright configurado; skill `playwright-dash-webapp`. | `.github/agents/ui-test-generation-agent.md` | `common_spec_driven_development/agents_UI_test/agents/ui-test-generation-agent.md` |
| `ui-test-execution-agent` | Ejecutar tests Playwright y recopilar artefactos de ejecucion. | Para ejecutar la suite de tests E2E y generar `summary.json`, `console.log`, `request-failures.log`, `response-errors.log`. | Tests generados en `tests/`, variables de entorno configuradas, Playwright instalado. | Artefactos en `.playwright-artifacts/test-results/YYYY-MM-DD_HH-MM-SS/`. | Playwright instalado; variables `E2E_DASH_BACKEND_URL`, `E2E_DASH_USER`, `E2E_DASH_PASS`. | `.github/agents/ui-test-execution-agent.md` | `common_spec_driven_development/agents_UI_test/agents/ui-test-execution-agent.md` |
| `ui-log-recovery-agent` | Recuperar logs de frontend y backend para diagnostico UI. | Para obtener logs del backend webapp y del escenario DSS antes de analizar fallos de tests. | Fuente backend (`E2E_BACKEND_LOG_PATH` o URL remota Dataiku), storage state si es modo remoto. | `remote-backend-log.txt`, `remote-scenario-log.txt`, metadatos JSON en la carpeta de ejecucion. | Storage state DSS valido para modo remoto; `E2E_REMOTE_STORAGE_STATE` configurado. | `.github/agents/ui-log-recovery-agent.md` | `common_spec_driven_development/agents_UI_test/agents/ui-log-recovery-agent.md` |

## Recommended Routing by Workflow Phase
| Workflow Phase | Recommended Sub-agent |
| --- | --- |
| Nuevo requerimiento — enrich-requirement (sub-fase) | `requirements-agent` |
| Nuevo requerimiento — producir spec.md | `requirements-agent` |
| Aclaración de ambigüedades | `requirements-agent` |
| Creación de `spec.md` | `requirements-agent` |
| Creación de `task_plan.md` | `plan-task-agent` |
| Implementación desde `task_plan.md` | `execute-agent` |
| Creación, modificación, auditoría o migración de templates SDD | `template-agent` |
| Despliegue de modelos de datos en Dataiku | `data-model-deploy-agent` |
| Setup de Playwright (primera vez) | `playwright-setup-agent` |
| Generación de tests E2E | `ui-test-generation-agent` |
| Ejecución de tests Playwright | `ui-test-execution-agent` |
| Recuperación de logs UI (backend + escenario) | `ui-log-recovery-agent` |
| Tests de UI end-to-end (flujo completo) | `ui-validation-orchestrator` |
| Análisis de resultados de tests UI | `ui-log-analysis-agent` |
| CI/CD con Dataiku + tests UI | `ci-cd-dataiku-agent` |
| Gestión de no conformidades | `nc-resolution-agent` |
| Actualización de contexto | `context-agent` |
| Actualización de documentación | `documentation-agent` |

## Orchestration Rules
- The orchestrator must not perform substantive work that belongs to a registered sub-agent.
- The orchestrator must not skip a relevant sub-agent just for convenience or speed.
- If the task touches code or structure, the orchestrator must ensure the delegated sub-agent also loads the relevant skills.
- If a sub-agent returns output that conflicts with loaded skills or project conventions, escalate to the human programmer before continuing.
- If a workflow phase has a registered mandatory sub-agent, the orchestrator may coordinate and validate that phase, but must not author the final phase artifact itself.
- For a new client requirement or a spec iteration, `requirements-agent` is the mandatory author of `./requeriments_spec_driven_development/requerimiento_xx/spec.md`.
- For a planning phase after a spec exists, `plan-task-agent` is the mandatory author of `./requeriments_spec_driven_development/requerimiento_xx/task_plan.md`.
- The orchestrator may ask clarification questions on behalf of `requirements-agent`, but the final `spec.md` must be produced by `requirements-agent`, not by the orchestrator.
- The orchestrator may gather context and load the planning template on behalf of `plan-task-agent`, but the final `task_plan.md` must be produced by `plan-task-agent`, not by the orchestrator.
- If `requirements-agent` is unavailable, fails, or cannot complete the artifact, the orchestrator must stop the phase and report a contingency to the human programmer instead of silently taking over authorship.
- If `plan-task-agent` is unavailable, fails, or cannot complete the artifact, the orchestrator must stop the phase and report a contingency to the human programmer instead of silently taking over authorship.
- Only an explicit human approval for degraded mode allows the orchestrator to author a final artifact owned by a registered sub-agent.
- When degraded mode is approved, the orchestrator must state this explicitly in its report and ensure the artifact records that it was produced without the mandatory sub-agent due to contingency.

## Output Expectations for the Orchestrator
When delegation is done correctly, the orchestrator should be able to state:
- which sub-agent was selected
- why it was selected
- which source file was loaded
- which inputs were provided
- which outputs were expected
- whether any decision or conflict was escalated
- whether the work ran in an isolated sub-agent session or not
- which final artifact was authored by the sub-agent

## Maintenance Rules
- Add every new project sub-agent to this registry when introduced.
- Keep `Source` paths accurate and relative to project root.
- Update routing guidance when workflow responsibilities change.
- If a sub-agent is deprecated, mark it explicitly and document the replacement.
- Do not silently remove a sub-agent that is still referenced by `agents.md`, task flows, or installed skills.
