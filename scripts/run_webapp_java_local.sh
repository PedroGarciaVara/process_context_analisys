#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export WEBAPP_JAVA_HOST="${WEBAPP_JAVA_HOST:-127.0.0.1}"
export WEBAPP_JAVA_PORT="${WEBAPP_JAVA_PORT:-8050}"
export WEBAPP_JAVA_DEBUG="${WEBAPP_JAVA_DEBUG:-1}"

exec python3 uc_bib_solv/local_server.py
