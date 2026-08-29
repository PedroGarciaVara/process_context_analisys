import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.platform.infrastructure.app_factory import create_app


class ProcessModelingApiTests(unittest.TestCase):
    def setUp(self):
        pass

    @patch("uc_bib_solv.modules.bpm.application.process_modeling_application.ProcessModelingApplication.list_processes", return_value=[{"process_code": "P-1"}])
    def test_list_uses_stable_envelope(self, _list):
        response = create_app().test_client().get("/api/bpm/processes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok", "data": [{"process_code": "P-1"}]})

    def test_process_endpoint_is_canonical(self):
        response = create_app().test_client().get(f"/api/bpm/processes/{uuid4()}")
        self.assertIn(response.status_code, (404, 409))
        self.assertNotIn("Traceback", response.get_data(as_text=True))

    @patch("uc_bib_solv.modules.bpm.application.process_modeling_application.ProcessModelingApplication.validate_process", return_value={"valid": True, "errors": []})
    @patch("uc_bib_solv.modules.bpm.application.process_modeling_application.ProcessModelingApplication.get_process", return_value={"process_id": "should-not-be-returned"})
    def test_validate_endpoint_runs_validation_use_case(self, get_process, validate_process):
        process_id = str(uuid4())
        response = create_app().test_client().post(f"/api/bpm/processes/{process_id}/validate")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok", "data": {"valid": True, "errors": []}})
        validate_process.assert_called_once_with(process_id)
        get_process.assert_not_called()

    @patch(
        "uc_bib_solv.modules.bpm.application.process_modeling_application.ProcessModelingApplication.get_process",
        return_value={"process_id": "p-1", "transitions": [], "diagram_transitions": []},
    )
    def test_get_process_returns_backend_diagram_projection(self, get_process):
        response = create_app().test_client().get(f"/api/bpm/processes/{uuid4()}")
        self.assertEqual(response.status_code, 200)
        self.assertIn("diagram_transitions", response.get_json()["data"])

    @patch(
        "uc_bib_solv.modules.bpm.application.process_modeling_application.ProcessModelingApplication.get_process",
        return_value={"process_id": "child", "subprocess_context": {"child_process_id": "child"}},
    )
    def test_get_process_forwards_expansion_node(self, get_process):
        parent_id = str(uuid4())
        node_id = str(uuid4())
        response = create_app().test_client().get(f"/api/bpm/processes/{parent_id}?expand_node_id={node_id}")
        self.assertEqual(response.status_code, 200)
        get_process.assert_called_once_with(parent_id, node_id)
        self.assertEqual(response.get_json()["data"]["subprocess_context"]["child_process_id"], "child")

    @patch(
        "uc_bib_solv.modules.bpm.application.process_modeling_application.ProcessModelingApplication.create_node_with_transition",
        return_value={"node": {"node_id": "node-1"}, "transition": {"target_node_id": "node-1"}},
    )
    def test_atomic_node_endpoint_forwards_payload(self, create_node_with_transition):
        process_id = str(uuid4())
        payload = {"node": {"node_code": "OP-1", "node_type": "operation", "name": "Operación"}, "transition": {"source_node_id": str(uuid4()), "transition_type": "sequence"}}
        response = create_app().test_client().post(f"/api/bpm/processes/{process_id}/nodes-with-transition", json=payload)
        self.assertEqual(response.status_code, 201)
        create_node_with_transition.assert_called_once_with(process_id, payload)


if __name__ == "__main__":
    unittest.main()
