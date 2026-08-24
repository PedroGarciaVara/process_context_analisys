from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
for path in (PROJECT_ROOT, BASE_DIR):
    if str(path) in sys.path:
        sys.path.remove(str(path))
    sys.path.insert(0, str(path))

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app


app = create_app()

server = app


if __name__ == "__main__":
    app.run(debug=True)
