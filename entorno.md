# Entorno de desarrollo SDD — Requisitos y configuración

> Este documento describe las herramientas, versiones y pasos de instalación necesarios
> para trabajar con el entorno SDD (Spec-Driven Development) en Windows con GitHub Copilot CLI.
>
> **Puedes compartir este archivo como contexto en el chat de GitHub Copilot** para que el agente
> verifique o instale el entorno correctamente en una sesión nueva.

---

## Versiones de referencia (entorno validado)

| Herramienta | Versión validada | Mínima recomendada | Notas |
|-------------|------------------|--------------------|-------|
| Windows | 11 (10.0.22631) | Windows 10 | — |
| PowerShell | 7.5.5 | 7.2 LTS | Usar `pwsh`, no `powershell.exe` (v5) |
| Git | 2.51.0 | 2.40 | Necesario para commits y GIT_DEPLOY |
| Node.js | 24.11.1 | 20 LTS | Requerido para Playwright |
| npm | 11.6.2 | 9.0 | Viene con Node.js |
| Python | 3.13.2 | 3.10 | Para scripts de utilidad y Dataiku local |
| GitHub Copilot CLI | 1.0.25 | 1.0.0 | Agente principal del entorno SDD |
| Playwright (`@playwright/test`) | 1.59.1 | 1.40 | Tests de UI E2E |
| VS Code | última estable | 1.85 | Editor recomendado |

---

## 1. PowerShell 7 (pwsh)

```powershell
# Verificar versión actual
$PSVersionTable.PSVersion

# Instalar o actualizar via winget
winget install --id Microsoft.PowerShell --source winget

# Verificar tras instalación
pwsh --version
```

> **Por qué v7:** los scripts del entorno SDD usan sintaxis moderna (`??=`, `-ErrorAction`,
> `&&` encadenado). PowerShell 5 (Windows built-in) no es compatible.

---

## 2. Git

```powershell
# Verificar
git --version

# Instalar via winget
winget install --id Git.Git --source winget

# Configuración mínima post-instalación
git config --global user.name  "Tu Nombre"
git config --global user.email "tu@email.com"
git config --global core.autocrlf true   # Windows: normalizar saltos de línea
```

---

## 3. Node.js y npm

```powershell
# Verificar
node --version
npm --version

# Instalar Node.js LTS via winget (incluye npm)
winget install --id OpenJS.NodeJS.LTS --source winget

# Alternativa: usar nvm-windows para gestionar versiones
winget install --id CoreyButler.NVMforWindows --source winget
nvm install lts
nvm use lts
```

---

## 4. Python

```powershell
# Verificar
python --version

# Instalar via winget
winget install --id Python.Python.3.13 --source winget

# Verificar pip
pip --version
```

> Python se usa principalmente para scripts de utilidad, Dataiku DSS local y validaciones.
> En entorno Dataiku DSS el Python del servidor ya está configurado.

---

## 5. GitHub Copilot CLI

```powershell
# Verificar versión actual
copilot --version

# Instalar (requiere winget o instalador de GitHub)
winget install --id GitHub.GitHubCopilotforCLI --source winget

# Alternativa: descargar desde https://githubnext.com/projects/copilot-cli/

# Autenticar con GitHub
copilot auth login

# Actualizar a última versión
copilot update
```

> **Configuración SDD obligatoria tras instalar:**
> Ejecutar el script de configuración del entorno (ver sección 8).

---

## 6. Playwright (tests de UI E2E)

Playwright se instala a nivel de proyecto, no global. El `package.json` del proyecto
ya tiene la dependencia declarada.

```powershell
# Desde la raíz del proyecto donde está package.json
cd "ruta\al\proyecto"

# Instalar dependencias Node
npm install

# Instalar browsers de Playwright (solo la primera vez o al actualizar)
npx playwright install chromium

# Verificar instalación
npx playwright --version

# Ejecutar tests
npx playwright test

# Ver reporte HTML de última ejecución
npx playwright show-report .playwright-artifacts\html-report
```

### `package.json` mínimo para proyectos con tests de UI

```json
{
  "name": "nombre-proyecto-e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --headed"
  },
  "devDependencies": {
    "@playwright/test": "^1.59.1"
  }
}
```

### `playwright.config.ts` mínimo

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  retries: 0,
  use: {
    headless: true,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  outputDir: '.playwright-artifacts/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: '.playwright-artifacts/html-report', open: 'never' }],
  ],
});
```

---

## 7. VS Code (editor recomendado)

```powershell
# Instalar via winget
winget install --id Microsoft.VisualStudioCode --source winget
```

### Extensiones recomendadas para el entorno SDD

| Extensión | ID | Para qué |
|-----------|----|---------|
| GitHub Copilot | `GitHub.copilot` | Autocompletado y chat IA |
| GitHub Copilot Chat | `GitHub.copilot-chat` | Chat integrado con agentes |
| Python | `ms-python.python` | Desarrollo Python / Dataiku |
| Pylance | `ms-python.vscode-pylance` | IntelliSense Python |
| Playwright Test | `ms-playwright.playwright` | Ejecutar tests desde la UI |
| GitLens | `eamodio.gitlens` | Historial y trazabilidad Git |
| Markdown All in One | `yzhang.markdown-all-in-one` | Editar specs y documentación |

```powershell
# Instalar extensiones en bloque
code --install-extension GitHub.copilot
code --install-extension GitHub.copilot-chat
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-playwright.playwright
code --install-extension eamodio.gitlens
code --install-extension yzhang.markdown-all-in-one
```

---

## 8. Configuración del entorno SDD (obligatorio)

Después de instalar las herramientas, ejecutar los scripts de configuración SDD para
registrar las instrucciones del orquestador y las skills en la configuración global
de Copilot CLI.

```powershell
# Desde la raíz del proyecto SDD
cd "C:\ruta\al\proyecto\spec-driven-development-SDD"

# Configurar Copilot CLI con instrucciones SDD
.\common_spec_driven_development\instrucciones_sdd\setup_copilot_cli.ps1

# Verificar que la configuración está sincronizada
.\common_spec_driven_development\instrucciones_sdd\check_copilot_sync.ps1
```

> Si aparece `DRIFT` o `MISSING` en el check, volver a ejecutar `setup_copilot_cli.ps1`.

---

## 9. Variables de entorno (proyectos con Dataiku DSS)

Para proyectos que se integran con Dataiku DSS, crear el archivo `.env.local`
en la raíz del proyecto (está en `.gitignore` — nunca commitear):

```env
# Dataiku DSS connection
DSS_SITE_URL=https://tu-servidor-dss.empresa.com
DSS_API_KEY=tu-api-key-personal
DSS_PROJECT_KEY=TU_PROYECTO_DSS

# Webapp URL (para tests de UI)
E2E_DASH_BACKEND_URL=https://tu-servidor-dss.empresa.com/web-apps-backends/PROYECTO/WEBAPP_ID/
E2E_DASH_USER=admin
E2E_DASH_PASS=admin

# Logs (opcional)
E2E_REMOTE_STORAGE_STATE=.playwright-artifacts/remote/storage-state.json
WEBAPP_LOGS_URL=https://tu-servidor-dss.empresa.com/dip/api/webapps/backend-log?projectKey=...
```

Ver catálogo completo de variables: `common_spec_driven_development/variables/README.md`

---

## 10. Verificación completa del entorno

```powershell
# Script de verificación rápida — ejecutar antes de empezar una sesión SDD
Write-Host "=== Verificación entorno SDD ===" -ForegroundColor Cyan

$checks = @{
    'PowerShell 7'       = { $PSVersionTable.PSVersion.Major -ge 7 }
    'Git'                = { (git --version 2>&1) -match 'git version' }
    'Node.js >= 20'      = { [int]((node --version 2>&1) -replace 'v','').Split('.')[0] -ge 20 }
    'npm'                = { (npm --version 2>&1) -match '^\d' }
    'Python >= 3.10'     = { [int]((python --version 2>&1) -replace 'Python ','').Split('.')[1] -ge 10 }
    'Copilot CLI'        = { (copilot --version 2>&1) -match 'Copilot' }
    'Playwright'         = { Test-Path "node_modules\@playwright\test" }
    'SDD config'         = { Test-Path "$HOME\.copilot\copilot-instructions.md" }
}

foreach ($name in $checks.Keys) {
    try {
        $ok = & $checks[$name]
        $icon = if ($ok) { "✅" } else { "❌" }
        Write-Host "$icon $name"
    } catch {
        Write-Host "❌ $name (error)"
    }
}
```

---

## 11. Orden de instalación recomendado (entorno limpio)

1. Instalar **PowerShell 7** → reiniciar terminal
2. Instalar **Git** → configurar `user.name` y `user.email`
3. Instalar **Node.js LTS**
4. Instalar **Python 3.10+**
5. Instalar **VS Code** + extensiones
6. Instalar **GitHub Copilot CLI** → `copilot auth login`
7. Clonar el repositorio del proyecto
8. `npm install` en la raíz del proyecto
9. `npx playwright install chromium`
10. Ejecutar `setup_copilot_cli.ps1`
11. Crear `.env.local` con las variables del proyecto (si aplica)
12. Ejecutar el script de verificación (sección 10)

---

## 12. Solución de problemas frecuentes

| Problema | Causa habitual | Solución |
|----------|---------------|----------|
| `copilot: command not found` | CLI no instalada o no en PATH | Reinstalar Copilot CLI, reiniciar terminal |
| `npx playwright install` falla | Proxy corporativo | `npm config set proxy http://proxy:puerto` |
| Tests Playwright timeout | Webapp DSS lenta o sin despliegue | Verificar que GIT_DEPLOY se ejecutó correctamente |
| `DRIFT` en check_copilot_sync | Instrucciones desactualizadas | Ejecutar `setup_copilot_cli.ps1` de nuevo |
| `git push` rechazado | Rama protegida o sin permisos | Verificar configuración de branch protection en el repo |
| Python no encontrado | PATH no actualizado | Cerrar y reabrir terminal, o `refreshenv` |
| `node_modules` corruptos | Instalación parcial | Borrar `node_modules` + `npm install` |
