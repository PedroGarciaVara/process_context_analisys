from __future__ import annotations

import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
WEBAPP_DIR = BASE_DIR / "webapp"

if __name__ == "__main__" and str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app as _create_platform_app
from uc_bib_solv.modules.platform.infrastructure.app_factory import run_app


def create_app():
    return _create_platform_app(serve_webapp=True, webapp_dir=WEBAPP_DIR)


app = create_app()


def main() -> None:
    run_app(app)


if __name__ == "__main__":
    main()
