from __future__ import annotations

import importlib.util
import time
from pathlib import Path
import sys
from unittest import TestCase

ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "uc_bib_solv"
sys.path.insert(0, str(ROOT))
sys.path.insert(1, str(BACKEND_DIR))

from uc_bib_solv.modules.bpm.adapters.outbound.postgres import contrato_repo, proceso_repo
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import causa_repo, hipotesis_repo
from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor

APP_SPEC = importlib.util.spec_from_file_location("webapp_java_backend_app", BACKEND_DIR / "app.py")
APP_MODULE = importlib.util.module_from_spec(APP_SPEC)
assert APP_SPEC and APP_SPEC.loader
APP_SPEC.loader.exec_module(APP_MODULE)
create_app = APP_MODULE.create_app


class TreeDbIntegrationTests(TestCase):
    @classmethod
    def setUpClass(cls):
        app = create_app()
        app.testing = True
        cls.client = app.test_client()

    def setUp(self):
        stamp = int(time.time() * 1000)
        self.created_hypothesis_ids: list[int] = []
        self.created_causa_ids: list[int] = []
        self.created_contract_ids: list[int] = []
        self.created_process_ids: list[int] = []

        self.process = proceso_repo.create(f"IT PROC TREE {stamp}")
        self.created_process_ids.append(int(self.process["id"]))

        self.contract = contrato_repo.create(
            int(self.process["id"]),
            f"IT CONTRACT TREE {stamp}",
            "metric",
            "goal",
        )
        self.created_contract_ids.append(int(self.contract["id"]))

        self.root_cause = causa_repo.create(
            int(self.contract["id"]),
            f"IT ROOT CAUSE {stamp}",
            "root description",
            "causa",
            "causa",
        )
        self.created_causa_ids.append(int(self.root_cause["id"]))

        self.child_cause = causa_repo.create(
            int(self.contract["id"]),
            f"IT CHILD CAUSE {stamp}",
            "child description",
            "causa",
            "causa",
            parent_id=int(self.root_cause["id"]),
        )
        self.created_causa_ids.append(int(self.child_cause["id"]))

        self.hypothesis = hipotesis_repo.create(
            int(self.root_cause["id"]),
            f"IT HYPOTHESIS {stamp}",
            "aceptacion",
            "criterion",
            "pendiente",
        )
        self.created_hypothesis_ids.append(int(self.hypothesis["id"]))

        self.other_process = proceso_repo.create(f"IT PROC OTHER {stamp}")
        self.created_process_ids.append(int(self.other_process["id"]))
        self.other_contract = contrato_repo.create(
            int(self.other_process["id"]),
            f"IT CONTRACT OTHER {stamp}",
            "metric",
            "goal",
        )
        self.created_contract_ids.append(int(self.other_contract["id"]))
        self.other_cause = causa_repo.create(
            int(self.other_contract["id"]),
            f"IT ROOT OTHER {stamp}",
            "other description",
            "causa",
            "causa",
        )
        self.created_causa_ids.append(int(self.other_cause["id"]))

    def tearDown(self):
        with db_cursor() as cur:
            if self.created_hypothesis_ids:
                cur.execute("DELETE FROM hipotesis WHERE id = ANY(%s)", (self.created_hypothesis_ids,))
            if self.created_causa_ids:
                cur.execute("DELETE FROM causa WHERE id = ANY(%s)", (self.created_causa_ids,))
            if self.created_contract_ids:
                cur.execute("DELETE FROM contrato_maquina WHERE contrato_id = ANY(%s)", (self.created_contract_ids,))
                cur.execute("DELETE FROM contrato WHERE id = ANY(%s)", (self.created_contract_ids,))
            if self.created_process_ids:
                cur.execute("DELETE FROM proceso WHERE id = ANY(%s)", (self.created_process_ids,))

    def test_tree_endpoint_returns_only_causes_for_selected_contract_from_db(self):
        response = self.client.get(f"/api/causas?view=arbol&contract_id={int(self.contract['id'])}")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(int(payload["contract"]["id"]), int(self.contract["id"]))

        root_ids = [int(item["id"]) for item in payload["tree"]]
        self.assertIn(int(self.root_cause["id"]), root_ids)
        self.assertNotIn(int(self.other_cause["id"]), root_ids)

        root_node = next(item for item in payload["tree"] if int(item["id"]) == int(self.root_cause["id"]))
        child_ids = [int(item["id"]) for item in root_node["children"]]
        self.assertIn(int(self.child_cause["id"]), child_ids)

    def test_hypotheses_are_retrieved_from_db_for_cause_detail_and_list(self):
        list_response = self.client.get(f"/api/causas/{int(self.root_cause['id'])}/hipotesis")
        self.assertEqual(list_response.status_code, 200)
        list_payload = list_response.get_json()
        hypothesis_ids = [int(item["id"]) for item in list_payload["hypotheses"]]
        self.assertIn(int(self.hypothesis["id"]), hypothesis_ids)

        detail_response = self.client.get(f"/api/causas/detail?causa_id={int(self.root_cause['id'])}")
        self.assertEqual(detail_response.status_code, 200)
        detail_payload = detail_response.get_json()
        detail_hypothesis_ids = [int(item["id"]) for item in detail_payload["hypotheses"]]
        self.assertIn(int(self.hypothesis["id"]), detail_hypothesis_ids)
