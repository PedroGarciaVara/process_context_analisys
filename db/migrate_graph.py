from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.persistence.graph_sync import sync_existing_legacy_graph


def migrate_graph() -> None:
    sync_existing_legacy_graph()


if __name__ == "__main__":
    migrate_graph()
