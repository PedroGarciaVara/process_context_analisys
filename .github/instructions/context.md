# Context: SDD Instructions Module

**Última actualización:** requerimiento_04 (2025-04-18)

## Módulo Documentado
Directorio: `.github/instructions/`  
Archivo principal: `sdd-orchestrator.instructions.md`

## Rol del Módulo
Coordinar el flujo Spec-Driven Development completo, delegando cada fase sustantiva a sub-agentes especializados registrados en `.atl/sub-agent-registry.md`.

---

## Fases del Flujo (17 fases)

### Pre-flight & Intercepción
- **-1. session-setup**: Verificar CLI, acceso, instrucciones y modelos (obligatorio siempre)
- **0. receive-amendment**: Intercepción disponible en cualquier punto (reclasificar tipo con `/rewind`)

### Ciclo Principal (Req → Spec → Plan → Code → Tests → Deploy → Docs)
| Fase | Rol | Sub-agente | Modelo |
|------|-----|-----------|--------|
| **1. new-requirement** | Recibir requerimiento bruto | `requirements-agent` | gpt-5.6-luna / medium |
| **1a. enrich-requirement** | Enriquecer → preguntar ambigüedades | `requirements-agent` | gpt-5.6-luna / medium |
| **2. validate-spec** | Revisar `spec.md` (humano + agentes) | — | — |
| **3. analyze-plan** | Producir `task_plan.md` | `plan-task-agent` | gpt-5.6-luna / medium |
| **4. validate-task-plan** | Gate: aprobación humana | — | — |
| **5. execute-task** | Implementar código | `execute-agent` | gpt-5.6-luna / medium |
| **5b. git-commit-task** | Commit de implementación | — | — |
| **6. deploy-data-models** | Publicar modelos DSS (si aplica) | `data-model-deploy-agent` | gpt-5.6-luna / medium |
| **6b. git-push-main** | Push a main + verificar `GIT_DEPLOY` | — | — |
| **7. execute-ui-tests** | Setup y ejecución tests (opcional) | `ui-validation-orchestrator` | gpt-5.6-luna / medium |
| **8. analyze-ui-test-results** | Detectar fallos → candidatos NC | `ui-log-analysis-agent` | gpt-5.6-luna / medium |
| **9. validate-implementation** | Validación final vs spec | — | — |
| **10. nc-resolution** | Gestionar no conformidades (si existen) | `nc-resolution-agent` | gpt-5.6-luna / medium |
| **11. document** | Actualizar docs + `context.md` | `documentation-agent` + `context-agent` | gpt-5.6-luna / medium |
| **11b. git-commit-docs** | Commit documentación `[skip ci]` | — | — |

### Exploración (meta-fase, fuera del ciclo)
- **sdd-explore**: Investigación previa. Usar `/research <tema>` → contexto alimenta `new-requirement` o propuestas posteriores.

---

## Patrones CLI Clave

### 1. **Delegar fase con sesión Codex secundaria**
```
codex exec --model gpt-5.6-luna -c model_reasoning_effort=medium -C <repo> "FASE: enrich-requirement ..."
codex exec --model gpt-5.6-luna -c model_reasoning_effort=medium -C <repo> "FASE: document ..."
```
✓ Modelo fijo en `.github/agents/<nombre>.md`  
✓ Aislado en sesión propia  
✓ Invocación nativa del CLI  

### 2. **Investigación previa con `/research`**
```
/research qué frameworks de UI soporta Dataiku DSS natively?
```
→ Resultado inyectado en prompt del sub-agente siguiente  

### 3. **Monitorización en background**
```
/tasks
```
→ Ver estado de agentes ejecutándose en background

### 4. **Reclasificar enmienda**
```
/rewind
```
→ Si `receive-amendment` clasifica mal el tipo (si requiere nuevo-req vs bug-fix)

---

## Sub-agentes: 14 Perfiles Activos

Cada sub-agente tiene:
- **Perfil ligero** en `.github/agents/<nombre>.md` (modelo, tools)
- **Instrucciones completas** en `.github/instructions/<nombre>.instructions.md` o equivalente
- **Registro de routing** en `.atl/sub-agent-registry.md`

### Agentes por Modelo

| Modelo | Agentes | Razón |
|--------|---------|-------|
| **gpt-5.6-luna / medium** | Todos los agentes SDD | Política única para razonamiento, generación y coordinación |

---

## Artefactos Clave

### Registries (fuentes de verdad)
- `.atl/sub-agent-registry.md` — routing: 17 fases → 14 agentes
- `.atl/skill-registry.md` — skills disponibles por módulo
- `AGENTS.md` — fuente canónica de las instrucciones del repositorio; se copia a `~/.codex/agents.md` para Codex

### Instrucciones del Orquestador
- `sdd-orchestrator.instructions.md` — protocolo completo, gates, reglas de delegación

### Scripts de Sincronización (verifican integridad)
| Script | SO | Función | Versión Req |
|--------|----|---------| ----------- |
| `setup_copilot_cli.sh` | Linux | leer `AGENTS.md` y actualizar copilot-instructions.md | req-04 |
| `setup_copilot_cli.ps1` | Windows | ídem (añade verificación SHA-256) | req-04 |
| `check_codex_sync.sh` | Linux | validar 15 artefactos + 14 perfiles | req-04 |
| `check_copilot_sync.ps1` | Windows | ídem | req-04 |

---

## Gates & Obligaciones

1. **session-setup obligatorio** — al inicio de cada sesión, siempre
2. **enrich-requirement obligatorio** — antes de producir spec.md
3. **Gate enrich-requirement** — NO avanzar si `Ambigüedades pendientes` tiene impacto `alto`
4. **Validación de perfiles** — 15/15 artefactos sincronizados (verificar con `check_codex_sync.sh`)

---

## Cómo Usar Este Context

- **Para nuevas sesiones**: Lee "Fases del Flujo" y "Patrones CLI Clave"
- **Para delegar**: Consulta tabla de sub-agentes → busca en `.atl/sub-agent-registry.md` → abre instrucciones completas
- **Para verificar estado**: Ejecuta `check_codex_sync.sh` (Linux) o `check_copilot_sync.ps1` (Windows)
- **Para actualizar**: Si hay cambios en fases, agentes o scripts, actualiza este archivo + registries mediante una sesión Codex secundaria.

---

## Próximas Mejoras (Track)
- [ ] Documentar criterios de decisión para elegir modelo en tiempo de ejecución
- [ ] Expandir ejemplos de `/research` con casos de uso reales
- [ ] Automatizar validación de perfiles cada N días
