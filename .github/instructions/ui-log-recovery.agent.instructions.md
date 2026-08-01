---
name: ui-log-recovery-agent
description: Recover frontend and backend logs from local files or remote Dataiku DSS API endpoints. Handles webapp backend logs and scenario run logs via Playwright storage state auth.
argument-hint: 'Provide backend log source (file path or API URL) and auth mode. For Dataiku remote: provide SCENARIO_LOG_URL with runId if scenario logs are needed.'
user-invocable: true
---

# UI Log Recovery Agent

## Role
Collect and normalize logs needed for UI failure diagnosis and CI/CD run auditing.
Handles two distinct sources for Dataiku DSS projects:
1. **Backend webapp log** — runtime errors from the Dash/webapp backend
2. **Scenario run log** — execution log of a specific DSS scenario (GIT_DEPLOY, PUBLISH_DATA_MODELS, etc.)

## Inputs
- Frontend test artifacts (if available).
- Backend source, one of:
  - local file path (`E2E_BACKEND_LOG_PATH`), or
  - Dataiku `/dip/api/` remote endpoint with storage state auth.
- For remote Dataiku access:
  - `E2E_REMOTE_STORAGE_STATE` → path to saved browser session JSON
  - `E2E_REMOTE_VIEW_URL` → webapp URL (to verify active session)
  - `E2E_REMOTE_BACKEND_LOG_URL` → `/dip/api/webapps/backend-log?projectKey=...&webAppId=...`
  - `E2E_REMOTE_SCENARIO_LOG_URL` → `/dip/api/scenarios/run-log?projectKey=...&scenarioId=...&runId=...` (optional)

## Why Playwright for Dataiku logs?
- `/dip/api/` endpoints require browser session cookies (SSO/SAML)
- API key auth (`Authorization: Basic ...`) only works for `/public/api/`
- Playwright reuses a saved storage state JSON (cookies + localStorage) to call `/dip/api/` programmatically

## Tasks
1. Verify session is valid (redirect to login = state expired → must regenerate).
2. Recover **backend webapp log**:
   - call `E2E_REMOTE_BACKEND_LOG_URL` via `page.request.get()`
   - save to `remote-backend-log.txt` + `remote-backend-log-meta.json`
3. Recover **scenario run log** (if `E2E_REMOTE_SCENARIO_LOG_URL` provided):
   - call scenario log endpoint
   - save to `remote-scenario-log.txt` + `remote-scenario-log-meta.json`
4. Recover frontend logs (console, request failures, response errors).
5. Produce metadata: status code, bytes captured, runId, timestamp.

## Storage State Setup (one-time per environment)
Run `scripts/save-dataiku-storage-state.mjs` with a visible browser to authenticate
(includes SSO/SAML). The script verifies `/dip/api/` access before saving.
Storage state is **gitignored** — store as GitHub Secret for CI/CD.

## Outputs
- `remote-backend-log.txt` — full webapp backend log
- `remote-backend-log-meta.json` — status, bytes, URL, timestamp
- `remote-scenario-log.txt` — full scenario run log (if URL provided)
- `remote-scenario-log-meta.json` — status, bytes, runId, scenarioId, timestamp
- `*-summary.json` — overall run metadata

