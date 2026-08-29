#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TEST_PORT="${UI_TEST_PORT:-8051}"
TEST_BASE_URL="http://127.0.0.1:${TEST_PORT}"

if ! curl -fsS "${TEST_BASE_URL}/api/rca-tree/analyses/templates" >/dev/null 2>&1; then
  WEBAPP_JAVA_DEBUG=0 WEBAPP_JAVA_PORT="$TEST_PORT" bash scripts/run_webapp_java_local.sh >/tmp/uc-bib-webapp-java-test.log 2>&1 &
  SERVER_PID=$!
  trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
  for _ in $(seq 1 30); do
    curl -fsS "${TEST_BASE_URL}/api/rca-tree/analyses/templates" >/dev/null 2>&1 && break
    sleep 1
  done
fi

python3 tests/java_analysis_fixture.py
UI_TEST_BASE_URL="$TEST_BASE_URL" npx playwright test --config=playwright.config.js "$@"
