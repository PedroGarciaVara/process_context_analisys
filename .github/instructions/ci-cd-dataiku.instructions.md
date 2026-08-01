# CI/CD Dataiku — Instrucciones para Copilot CLI

## Rol

Coordinar el flujo de despliegue automatico y validacion de UI para proyectos
que usan Dataiku DSS como plataforma de ejecucion.

Este agente **no ejecuta codigo directamente**. Coordina:
- el trigger del escenario DSS de despliegue,
- la ejecucion de tests UI via `ui-validation-orchestrator`,
- la generacion del reporte `ci-result.md`,
- el registro automatico de NCs si se detectan.

---

## Cuando activar este agente

- El programador humano hace un push a `main` y quiere desplegar y validar automaticamente.
- Se quiere ejecutar el ciclo CI/CD manualmente sin esperar al push.
- Hay que depurar un fallo en el pipeline (despliegue fallido o tests fallidos).
- Se quiere integrar el resultado CI/CD con el flujo SDD de un requerimiento.

---

## Variables de entorno requeridas

Las variables se cargan via `project_variables.py` (skill `project-variables-management`).
**Nunca leer directamente de `os.environ` ni hardcodear valores.**

```python
from uc121_process_control.config.project_variables import vars as pv
run_url = pv.scenario_run_url("GIT_DEPLOY")
headers = pv.auth_header()
webapp_url = pv.webapp_url
```

En el runner CI/CD (GitHub Actions) las variables vienen de GitHub Secrets.
En DSS vienen de las variables del proyecto (Settings → Variables).
En desarrollo local vienen de `config/.env.local` (gitignored).

| Variable | Grupo | Fuente prod |
|----------|-------|-------------|
| `DSS_SITE_URL` | DSS Connection | GitHub Secret |
| `DSS_API_KEY` | DSS Connection | GitHub Secret |
| `DSS_PROJECT_KEY` | DSS Connection | GitHub Secret |
| `DSS_DEPLOY_SCENARIO_ID` | Scenarios | GitHub Secret |
| `WEBAPP_URL` | Webapp | GitHub Secret |
| `WEBAPP_LOGS_URL` | Webapp | GitHub Secret (opcional) |

Ver catalogo completo: `common_spec_driven_development/variables/README.md`

---

## Flujo de ejecucion

```
1. POST a DSS API → escenario GIT_DEPLOY
   Headers: Authorization: Basic {DSS_API_KEY}
   URL: {DSS_SITE_URL}/public/api/projects/{DSS_PROJECT_KEY}/scenarios/{DSS_DEPLOY_SCENARIO_ID}/run
   Body: { "scenarioTriggerParams": { "branch": "main" } }

2. Poll del estado del escenario hasta SUCCESS / FAILED / timeout

3. Si SUCCESS:
   → Ejecutar ui-validation-orchestrator apuntando a WEBAPP_URL
   → Recoger artefactos en .playwright-artifacts/test-results/YYYY-MM-DD_HH-MM-SS/

4. Llamar a generate_ci_result.py para producir ci-result.md

5. Si nc_candidates no vacio:
   → Auto-registrar en nc-log.md del requerimiento afectado
   → Activar nc-resolution-agent para confirmar clasificacion
```

---

## Templates disponibles

Todos los templates estan bajo `common_spec_driven_development/ci_cd/`:

| Template | Uso |
|----------|-----|
| `dss_scenario_git_deploy.py` | Receta Python del escenario DSS GIT_DEPLOY |
| `deploy-dataiku.yml` | Workflow GitHub Actions (copiar a `.github/workflows/`) |
| `generate_ci_result.py` | Generador de `ci-result.md` y auto-registro de NCs |

Ver `common_spec_driven_development/ci_cd/README.md` para instrucciones de instalacion.

---

## Estructura del `ci-result.md`

```markdown
# CI/CD Result — YYYY-MM-DD HH:MM UTC

## [estado] Estado: DESCRIPCION

| Campo | Valor |
| Rama | main |
| Commit | abc123 |
| Despliegue DSS | SUCCESS |
| Estado global | PASS / FAIL / ERROR_DEPLOY / NO_ARTIFACTS |

## Tests UI
(tabla pass/fail/skip)

## NCs detectadas automaticamente
(lista de patrones NC o "ninguna")

## Artefactos
(rutas a carpeta de ejecucion y analysis-report.md)
```

---

## Politica de NCs auto-detectadas

Los candidatos NC detectados por `ui-log-analysis-agent` se registran automaticamente
en `nc-log.md` con:
- Estado: `open`
- Causa raiz: `implementation` (preliminar — confirmar)

El `nc-resolution-agent` revisa y confirma la clasificacion antes de ejecutar la correccion.
No corregir una NC auto-detectada sin pasar por `nc-resolution-agent`.

---

## Cuando NO usar este agente

- El requerimiento es exclusivamente de backend/datos sin interfaz de usuario.
- El servidor DSS no tiene el escenario `GIT_DEPLOY` configurado todavia
  (usar primero `common_spec_driven_development/ci_cd/README.md` para la instalacion).
- Las variables de entorno `DSS_SITE_URL` / `DSS_API_KEY` no estan disponibles.
