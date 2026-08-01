import importlib.util
import sys
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "uc_bib_solv" / "webapp_java" / "python-backend"
sys.path.insert(0, str(ROOT))
sys.path.insert(1, str(BACKEND))

from services import process_modeling_service as service  # noqa: E402


class ProcessModelingServiceTests(TestCase):
    def test_create_process_uses_domain_validation(self):
        with self.assertRaises(ValueError):
            service.create_process({"process_code": "", "name": "x"})

    @patch.object(service.versions, "get")
    def test_missing_version_is_not_found(self, get_mock):
        get_mock.return_value = None
        with self.assertRaises(Exception) as context:
            service.get_version(str(uuid4()))
        self.assertEqual(getattr(context.exception, "code", None), "not_found")


if __name__ == "__main__":
    import unittest
    unittest.main()
