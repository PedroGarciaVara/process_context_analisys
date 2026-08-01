# Skill: Playwright + Dash Webapp - Testing de webapps Dataiku

## Proposito

Define el patron estandar y obligatorio para escribir tests end-to-end con Playwright
contra webapps Dash embebidas en Dataiku DSS.
Establece como acceder a la app, autenticarse, interactuar con componentes Dash
y que anti-patrones evitar.
Descubierto y validado durante el desarrollo de UC121 R19.

---

## Descubrimiento clave: URL de backend vs URL exterior

Dataiku embebe las webapps Dash en iframes cuando se accede a la URL exterior de DSS:

```
https://{DSS_HOST}/projects/{PROJECT_KEY}/webapps/{WEBAPP_ID}/view
```

Esa URL tiene iframes que complican el testing con Playwright.

**La app Dash Flask es directamente accesible en la URL de backend:**

```
https://{DSS_HOST}/web-apps-backends/{PROJECT_KEY}/{WEBAPP_ID}/
```

En esa URL NO hay iframe — es una aplicacion Dash Flask standalone que se puede
testear directamente con Playwright.

---

## Autenticacion

La app Dash muestra su propio formulario de login en la carga inicial.

### Selectores del formulario de login

| Selector | Tipo |
|----------|------|
| `#login-username` | input de texto |
| `#login-password` | input de password |
| `#login-button` | boton de envio |

### Credenciales y flujo post-login

- Credenciales de bypass: `admin` / `admin` (hardcodeadas en `seguridad/autenticacion.py`)
- Tras el login la app redirige a `.../menu`
- Navegar a la pagina deseada (p.ej. `.../gestion_limites`) despues del redirect

---

## Seleccion de filas en Dash DataTable

Cuando `row_selectable="single"` esta activo:

- Se renderiza una columna de radio buttons
- La clase `.dash-tr--row` **NO existe** en la version actual de Dash DataTable
- Selector correcto: `#<table-id> .dash-select-cell` (el TD contenedor del radio button)
- Contar filas de datos via `input[type="radio"]` dentro de la tabla — mas fiable que `tbody tr`
- Tras hacer click en `.dash-select-cell`, esperar ~3s para que el callback Dash
  rellene los inputs del formulario

---

## Problema de timing con dbc.Alert

- `dcc.Loading` envuelve los divs de salida de alertas
- Durante la ejecucion del callback el spinner de carga **reemplaza** el contenido
- Playwright puede leer `innerText("")` si lo lee durante la fase de spinner

### Solucion

Usar `page.waitForFunction()` para esperar a que el contenido no este vacio
antes de leerlo:

```typescript
async function getAlertText(page: Page, alertId: string): Promise<string> {
  await page.waitForFunction(
    (id) => {
      const el = document.getElementById(id);
      return el && el.textContent && el.textContent.trim().length > 0;
    },
    alertId,
    { timeout: 15000 }
  );
  const el = page.locator(`#${alertId}`);
  return (await el.innerText()).trim() || (await el.innerHTML());
}
```

Alternativa: leer `innerHTML` y comprobar el patron `class="alert "`.

---

## Variables de entorno

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `E2E_DASH_BACKEND_URL` | URL completa incluyendo trailing slash | — |
| `E2E_DASH_USER` | Usuario de login | `admin` |
| `E2E_DASH_PASS` | Contrasena de login | `admin` |
| `E2E_REMOTE_STORAGE_STATE` | Ruta JSON de Playwright storage state (auth DSS) | `.playwright-artifacts/remote/storage-state.json` |
| `E2E_ARTIFACTS_DIR` | Carpeta raiz de artefactos de test | `.playwright-artifacts/test-results` |

---

## Gestion del storage state DSS (SSO)

El storage state contiene las cookies de sesion SSO/SAML necesarias para que Playwright
acceda a la webapp Dash sin pasar por el formulario de login DSS.

### Generacion (una vez por entorno)

```bash
node scripts/save-dataiku-storage-state.mjs
```

- El script abre un navegador visible con un timeout de **180 segundos** para completar el SSO.
- Tras el login, verifica que `/dip/api/` devuelve 200 antes de guardar.
- Guarda en `E2E_REMOTE_STORAGE_STATE` (default: `.playwright-artifacts/remote/storage-state.json`).

### Uso en tests

```typescript
test.use({
  storageState: process.env.E2E_REMOTE_STORAGE_STATE
    ?? '.playwright-artifacts/remote/storage-state.json',
  ignoreHTTPSErrors: true,
});
```

### Sintomas de storage state caducado

- Test falla con "Sesion expirada" o redirige a URL con `login` o `sso`
- HTTP 401 en llamadas a `/dip/api/`
- `page.url()` tras `goto` contiene `login-fed` o `sso`

**Accion**: regenerar con `save-dataiku-storage-state.mjs` y actualizar el GitHub Secret.

### Codificar para CI/CD

```powershell
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes('.playwright-artifacts\remote\storage-state.json'))
# Guardar $b64 como GitHub Secret: DSS_STORAGE_STATE_B64
```

Restaurar en el workflow antes de los tests:

```yaml
- name: Restore Dataiku storage state
  run: |
    mkdir -p .playwright-artifacts/remote
    echo "${{ secrets.DSS_STORAGE_STATE_B64 }}" | base64 -d > .playwright-artifacts/remote/storage-state.json
```

---

## Estructura canonica de suite completo (acResults + artefactos)

Patron validado en R19 (AC-05 a AC-11). Usar como base para nuevos suites.

```typescript
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_STATE = process.env.E2E_REMOTE_STORAGE_STATE
  ?? '.playwright-artifacts/remote/storage-state.json';
const DASH_URL  = process.env.E2E_DASH_BACKEND_URL ?? 'https://{host}/web-apps-backends/{PROJECT}/{WEBAPP_ID}/';
const DASH_USER = process.env.E2E_DASH_USER ?? 'admin';
const DASH_PASS = process.env.E2E_DASH_PASS ?? 'admin';
const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? '.playwright-artifacts/test-results';

// Nombre de carpeta unico por ejecucion (incluir sufijo de suite para no mezclar)
const RUN_FOLDER = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = path.join(ARTIFACTS_DIR, RUN_FOLDER + '-ac05-11');

// Registro de resultados por AC (escrito en afterAll como ac-results.json)
const acResults: Record<string, { passed: boolean; detail: string }> = {};

function saveHtml(filename: string, html: string) {
  fs.writeFileSync(path.join(OUT_DIR, filename), html, 'utf8');
}
function saveTxt(filename: string, content: string) {
  fs.writeFileSync(path.join(OUT_DIR, filename), content, 'utf8');
}

test.use({ storageState: STORAGE_STATE, ignoreHTTPSErrors: true });
test.setTimeout(120_000);

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test.afterAll(() => {
  const summaryPath = path.join(OUT_DIR, 'ac-results.json');
  fs.writeFileSync(summaryPath, JSON.stringify(acResults, null, 2), 'utf8');
  for (const [id, r] of Object.entries(acResults)) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${id}: ${r.detail}`);
  }
});
```

**Regla**: cada test debe escribir su entrada en `acResults[id]` antes del `expect()` final.
Esto garantiza que el resultado queda registrado incluso si el expect lanza excepcion.

---

## Patron TEST_ prefix para datos de prueba

Toda fila de test que se inserte en la BBDD debe usar un prefijo `TEST_` en el campo identificador principal (p.ej. RECIPE_ID, PARAMETER_NAME) y un sufijo de timestamp para unicidad.

```typescript
const TEST_RECIPE_ID = `TEST_RECIPE_AC05_${Date.now()}`;
```

**Limpieza**: el test que crea el dato debe borrarlo al final (en el propio test o en `afterAll`):

```typescript
// Cleanup al final del test (dentro del bloque test o en afterAll)
if (rowIncreased || alertSuccess) {
  try {
    await page.locator('#gl-table-f2 .dash-select-cell').last().click({ timeout: 5_000 });
    await page.waitForTimeout(2_000);
    page.once('dialog', async (dialog) => dialog.accept());
    await page.locator('#gl-f2-btn-delete').click();
    await page.waitForTimeout(3_000);
    // Manejar modal de confirmacion si existe
    const confirmModal = page.locator('#gl-f2-confirm-delete');
    if (await confirmModal.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmModal.locator('button').filter({ hasText: /confirm|yes|si|ok/i }).click();
    }
  } catch (e) {
    console.warn(`cleanup error: ${e}`);
  }
}
```

**Anti-patron**: no dejar filas TEST_ en la BD tras la ejecucion. Verificar con grep en
`beforeAll` o limpiar manualmente con el escenario MIGRATE si quedan huerfanas.

---

## Aserciones estrictas para operaciones CRUD

### ADD — verificacion doble (alerta + conteo de filas)

```typescript
const alertSuccess = /ok|exito|crea|success|correcto|guarda|insert/i.test(alertText);
const rowIncreased = rowsAfter > rowsBefore;
// Asercion: al menos una de las dos evidencias debe ser positiva
expect(alertSuccess || rowIncreased, `ADD debe crear fila. Alert: "${alertText}" rows:${rowsBefore}->${rowsAfter}`).toBe(true);
```

No usar `alertSuccess` solo — si el mensaje cambia, el regex falla silenciosamente.
Combinar siempre con `rowIncreased` como segunda evidencia.

### UPDATE — verificacion con recarga (evitar falso positivo de alerta)

```typescript
// 1. Hacer UPDATE
await page.click('#btn-update');
const alertText = await getAlertText(page, 'alert-id');

// 2. Recargar y re-seleccionar (NO confiar solo en la alerta)
await navigateToPage(page, 'pagina');
await selectFirstRow(page, 'table-id');

// 3. Verificar persistencia del valor
await expect(page.locator('#input-id')).toHaveValue('valor_esperado');
```

**Por que**: la alerta puede mostrar exito pero el valor no haber persistido (race condition,
cache Dataiku, problema de COMMIT). El unico test real es recargar y comprobar.

### DELETE — verificacion con conteo antes/despues

```typescript
const rowsBefore = await countTableRows(page, 'table-id');
await page.click('#btn-delete');
await page.waitForTimeout(3_000);
const rowsAfter = await countTableRows(page, 'table-id');
expect(rowsAfter).toBeLessThan(rowsBefore);
```

### Columnas booleanas — no usar fallback global

```typescript
// CORRECTO: verificar que se encontraron las columnas especificas
expect(ccIdx, 'Columna IS_CONTROL_CHART debe estar en la tabla').toBeGreaterThanOrEqual(0);
const ccValues = await getColumnValues(ccIdx);
const ccHasBool = ccValues.some(v => /^(True|False)$/.test(v));
expect(ccHasBool, 'IS_CONTROL_CHART debe mostrar True/False, no Y/N ni 1/0').toBe(true);

// PROHIBIDO: fallback a hasTrueFalse si ccIdx < 0 — enmascara columna no encontrada
// const passed = boolColValues.length > 0 ? ccHasBool : hasTrueFalse;  // <- FALSO POSITIVO
```

---

## Estructura de test canonica

```typescript
import { test, expect, Page } from '@playwright/test';

// --- Constantes ---
const DASH_URL  = process.env.E2E_DASH_BACKEND_URL || 'https://{host}/web-apps-backends/{PROJECT}/{WEBAPP_ID}/';
const DASH_USER = process.env.E2E_DASH_USER || 'admin';
const DASH_PASS = process.env.E2E_DASH_PASS || 'admin';

// --- Helpers ---

async function navigateToPage(page: Page, pagePath: string): Promise<void> {
  await page.goto(DASH_URL);
  const loginVisible = await page.locator('#login-username')
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  if (loginVisible) {
    await page.fill('#login-username', DASH_USER);
    await page.fill('#login-password', DASH_PASS);
    await page.click('#login-button');
    await page.waitForURL('**/menu', { timeout: 30000 });
  }
  await page.goto(DASH_URL + pagePath);
  await page.waitForSelector('[id]', { timeout: 30000 });
}

async function selectFirstRow(page: Page, tableId: string): Promise<void> {
  const cell = page.locator(`#${tableId} .dash-select-cell`).first();
  await cell.waitFor({ timeout: 15000 });
  await cell.click();
  await page.waitForTimeout(3000); // tiempo para que el callback Dash rellene el formulario
}

async function countTableRows(page: Page, tableId: string): Promise<number> {
  return await page.locator(`#${tableId} input[type="radio"]`).count();
}

async function getAlertText(page: Page, alertId: string): Promise<string> {
  await page.waitForFunction(
    (id) => {
      const el = document.getElementById(id);
      return el && el.textContent && el.textContent.trim().length > 0;
    },
    alertId,
    { timeout: 15000 }
  );
  const el = page.locator(`#${alertId}`);
  return (await el.innerText()).trim() || (await el.innerHTML());
}

// --- Configuracion global del test ---
test.setTimeout(120_000); // callbacks Dash + login requieren tiempo

// --- Tests ---
test('AC-01: tabla carga con datos', async ({ page }) => {
  await navigateToPage(page, 'gestion_limites');
  const rowCount = await countTableRows(page, 'my-table-id');
  expect(rowCount).toBeGreaterThan(0);
});

test('AC-03: UPDATE persiste el valor en recarga', async ({ page }) => {
  await navigateToPage(page, 'gestion_limites');
  await selectFirstRow(page, 'my-table-id');

  // Realizar el UPDATE
  await page.fill('#input-field-id', 'nuevo_valor');
  await page.click('#btn-update');

  // Verificar la alerta
  const alertText = await getAlertText(page, 'alert-output-id');
  expect(alertText).toContain('actualizado');

  // Verificar persistencia: recargar, reseleccionar y comprobar el campo
  await navigateToPage(page, 'gestion_limites');
  await selectFirstRow(page, 'my-table-id');
  await expect(page.locator('#input-field-id')).toHaveValue('nuevo_valor');
});
```

---

## Patron de verificacion UPDATE (AC-03)

Tras un UPDATE, **no confiar unicamente en la alerta** para verificar exito.

Patron recomendado:

1. Realizar la accion de UPDATE
2. Leer la alerta con `waitForFunction` para evitar leer el spinner
3. Recargar la pagina con `navigateToPage`
4. Re-seleccionar la primera fila con `selectFirstRow`
5. Verificar que el valor actualizado aparece en el input del formulario

Esto evita falsos positivos por timing de la alerta y confirma que la persistencia funciona.

---

## Anti-patrones prohibidos

1. **No usar la URL exterior de Dataiku** (`/projects/.../webapps/.../view`).
   Tiene iframes que complican el testing. Usar siempre la URL de backend.

2. **No hacer click en `tbody tr` para seleccionar filas**.
   Usar `.dash-select-cell`. El click en `tr` puede no disparar el callback de seleccion.

3. **No leer el texto de la alerta inmediatamente tras la accion**.
   Usar `waitForFunction` para esperar contenido no vacio antes de leer.

4. **No usar el selector `.dash-tr--row`**.
   Esa clase no existe en la version actual de Dash DataTable.

5. **No usar `test.setTimeout()` menor de 60_000ms**.
   Los callbacks Dash son lentos. El login y la navegacion inicial suman facilmente 30-60s.

6. **No asumir que la alerta esta visible sin esperar**.
   `dcc.Loading` reemplaza el contenido durante el callback; el div puede estar vacio.

7. **No asumir que `dbc.Switch` genera un input CSS-oculto**.
   En la version de Dash Bootstrap Components usada en UC121, `dbc.Switch` renderiza
   un `<input type="checkbox" class="form-check-input">` **visible** con el ID literal
   del componente Dash (sin sufijo). Ejemplo:
   - Componente: `dbc.Switch(id="gl-f1-check-control-chart")`
   - Selector correcto: `#gl-f1-check-control-chart` (click directo, `isChecked()` funciona)
   - NO usar `label[for="..."]` ni `click({ force: true })` — el elemento es directamente clickeable.
   - **Regla de diagnostico**: cuando un selector de switch/toggle no funciona, ejecutar
     `document.querySelectorAll('[id*="switch"],[id*="check"],[id*="toggle"]')` tras la seleccion
     de fila para encontrar los IDs reales.

8. **No usar POST a un escenario DSS activo como verificacion de permisos**.
   Hacer un POST a `GIT_DEPLOY` o `PUBLISH_DATA_MODELS` para verificar que Playwright
   puede llegar a la API es un anti-patron destructivo: lanza el escenario en produccion.
   Para verificar conectividad, usar un GET a `/public/api/projects/{key}/scenarios/` (lista
   de escenarios, solo lectura) o verificar que `E2E_DASH_BACKEND_URL` devuelve 200.

9. **No usar fallback global de celdas cuando no se encuentran columnas especificas**.
   Si el test busca `IS_CONTROL_CHART` por cabecera y `ccIdx == -1`, NO hacer fallback a
   `hasTrueFalse` (que verifica todas las celdas de la tabla). Ese fallback puede pasar
   si CUALQUIER celda contiene "True", incluyendo columnas no booleanas.
   La asercion correcta: `expect(ccIdx).toBeGreaterThanOrEqual(0)` — si la columna no
   existe, el test debe fallar con mensaje explicito, no pasar silenciosamente.

10. **No dejar filas con prefijo `TEST_` en la base de datos tras la ejecucion**.
    Todo dato insertado durante un test debe limpiarse en el mismo test o en `afterAll`.
    Si quedan huerfanas, detectarlas con el escenario MIGRATE o con un `beforeAll` que
    borre filas donde el campo identificador empiece por `TEST_`.

---

## Rutas de referencia

- Tests de referencia UC121 AC-01-04: `common_spec_driven_development/tests/gestion-limites-ac01-04.spec.ts`
- Tests de referencia UC121 AC-05-11: `common_spec_driven_development/tests/gestion-limites-ac05-11.spec.ts`
- Autenticacion Dash: `uc121_process_control/webapps/seguridad/autenticacion.py`
- Variables de entorno: `common_spec_driven_development/variables/variables.env.template`
- Storage state setup: `scripts/save-dataiku-storage-state.mjs`
