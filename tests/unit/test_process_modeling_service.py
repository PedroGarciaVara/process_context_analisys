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


def _application(*, process=None):
    processes = SimpleNamespace(get=lambda _id: process)
    nodes = SimpleNamespace()
    transitions = SimpleNamespace()
    return ProcessModelingApplication(processes, nodes, transitions)


def _hierarchical_application(parent, child):
    processes = SimpleNamespace(get=lambda process_id: {
        parent["process_id"]: parent,
        child["process_id"]: child,
    }.get(str(process_id)))
    return ProcessModelingApplication(processes, SimpleNamespace(), SimpleNamespace())


class ProcessModelingServiceTests(TestCase):
    def test_create_process_uses_domain_validation(self):
        service = _application()
        with self.assertRaises(ValueError):
            service.create_process({"process_code": "", "name": "x"})

    def test_missing_process_is_not_found(self):
        service = _application(process=None)
        with self.assertRaises(Exception) as context:
            service.get_process(str(uuid4()))
        self.assertEqual(getattr(context.exception, "code", None), "not_found")

    def test_get_process_exposes_diagram_projection_without_replacing_persisted_transitions(self):
        process = {
            "process_id": str(uuid4()),
            "process_code": "PROC-01",
            "name": "Proceso",
            "nodes": [
                {"node_id": "decision", "node_type": "decision"},
                {"node_id": "yes", "node_type": "output"},
                {"node_id": "no", "node_type": "output"},
            ],
            "transitions": [
                {"transition_id": "branch-yes", "source_node_id": "decision", "target_node_id": "yes", "transition_type": "branch"},
                {"transition_id": "branch-no", "source_node_id": "decision", "target_node_id": "no", "transition_type": "branch"},
                {"transition_id": "legacy", "source_node_id": "decision", "target_node_id": "yes", "transition_type": "sequence"},
            ],
        }
        result = _application(process=process).get_process(process["process_id"])

        self.assertEqual(len(result["transitions"]), 3)
        self.assertEqual([item["transition_id"] for item in result["diagram_transitions"]], ["branch-yes", "branch-no"])

    def test_expansion_returns_canonical_child_with_only_stable_context(self):
        parent_id, node_id, child_id = str(uuid4()), str(uuid4()), str(uuid4())
        parent = {
            "process_id": parent_id,
            "name": "Proceso padre",
            "nodes": [{"node_id": node_id, "node_type": "subprocess", "name": "Fabricación", "child_process_id": child_id}],
            "transitions": [],
        }
        child = {
            "process_id": child_id,
            "process_code": "CHILD-01",
            "name": "Proceso hijo",
            "nodes": [],
            "transitions": [],
            "ProcessVersion": "must-not-leak",
        }

        result = _hierarchical_application(parent, child).get_process(parent_id, node_id)

        self.assertEqual(result["process_id"], child_id)
        self.assertEqual(set(result["subprocess_context"]), {
            "parent_process_id", "parent_node_id", "child_process_id", "breadcrumb_label",
        })
        self.assertEqual(result["subprocess_context"], {
            "parent_process_id": parent_id,
            "parent_node_id": node_id,
            "child_process_id": child_id,
            "breadcrumb_label": "Proceso padre > Fabricación",
        })
        self.assertNotIn("ProcessVersion", result)

    def test_normal_get_has_no_subprocess_context(self):
        process = {"process_id": str(uuid4()), "name": "Proceso", "nodes": [], "transitions": []}
        result = _application(process=process).get_process(process["process_id"])
        self.assertNotIn("subprocess_context", result)


if __name__ == "__main__":
    import unittest
    unittest.main()
