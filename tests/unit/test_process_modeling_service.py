import importlib.util
import sys
from pathlib import Path
from unittest import TestCase
from types import SimpleNamespace
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "uc_bib_solv"
sys.path.insert(0, str(ROOT))
sys.path.insert(1, str(BACKEND))

from uc_bib_solv.modules.bpm.application import ProcessModelingApplication  # noqa: E402


def _application(*, version=None):
    processes = SimpleNamespace(get=lambda _id: {"process_id": str(uuid4()), "process_code": "P-1", "name": "Proceso"})
    versions = SimpleNamespace(get=lambda _id: version)
    nodes = SimpleNamespace()
    transitions = SimpleNamespace()
    return ProcessModelingApplication(SimpleNamespace(
        processes=processes,
        versions=versions,
        nodes=nodes,
        transitions=transitions,
    ))


class ProcessModelingServiceTests(TestCase):
    def test_create_process_uses_domain_validation(self):
        service = _application()
        with self.assertRaises(ValueError):
            service.create_process({"process_code": "", "name": "x"})

    def test_missing_version_is_not_found(self):
        service = _application(version=None)
        with self.assertRaises(Exception) as context:
            service.get_version(str(uuid4()))
        self.assertEqual(getattr(context.exception, "code", None), "not_found")


if __name__ == "__main__":
    import unittest
    unittest.main()
