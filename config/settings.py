import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env.local")


def _required_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip():
            return value
    raise RuntimeError(f"Falta una variable de configuración obligatoria: {' o '.join(names)}")


DB_CONFIG = {
    "host": _required_env("DB_HOST", "PGHOST"),
    "dbname": _required_env("DB_NAME", "PGDATABASE"),
    "user": _required_env("DB_USER", "PGUSER"),
    "password": _required_env("DB_PASSWORD", "PGPASSWORD"),
    "port": _required_env("DB_PORT", "PGPORT"),
}
APP_PORT = int(os.getenv("APP_PORT", "8050"))
APP_DEBUG = os.getenv("APP_DEBUG", "true").lower() == "true"
