from __future__ import annotations

from pathlib import Path
import sys
from unittest import TestCase
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from uc_bib_solv.modules.rca_tree.adapters.outbound import causa_detail_compat as causa_detail_service


class SaveCauseTests(TestCase):
    @patch("uc_bib_solv.modules.rca_tree.adapters.outbound.causa_detail_compat.create_causa")
    def test_save_cause_creates_root_when_no_cause_id(self, create_causa_mock):
        create_causa_mock.return_value = {
            "id": 10,
            "contrato_id": 5,
            "parent_id": None,
            "nombre": "Root",
        }

        result = causa_detail_service.save_cause(
            {
                "contract_id": 5,
                "nombre": "Root",
                "tipo": "causa",
                "categoria": "causa",
                "descripcion": "desc",
            }
        )

        create_causa_mock.assert_called_once_with(5, "Root", "desc", "causa", "causa", parent_id=None)
        self.assertEqual(result["cause"]["id"], 10)
        self.assertEqual(result["message"], "Causa creada.")

    @patch("uc_bib_solv.modules.rca_tree.adapters.outbound.causa_detail_compat.update_causa")
    def test_save_cause_updates_when_cause_id_exists(self, update_causa_mock):
        update_causa_mock.return_value = {"id": 11, "contrato_id": 5, "nombre": "Updated"}

        result = causa_detail_service.save_cause(
            {
                "causa_id": 11,
                "nombre": "Updated",
                "tipo": "causa",
                "categoria": "cat",
                "descripcion": "desc",
            }
        )

        update_causa_mock.assert_called_once_with(11, "Updated", "desc", "causa", "cat")
        self.assertEqual(result["cause"]["id"], 11)
        self.assertEqual(result["message"], "Causa actualizada.")

    def test_save_cause_requires_contract_or_cause_id(self):
        with self.assertRaisesRegex(ValueError, "Se requiere un contrato"):
            causa_detail_service.save_cause(
                {
                    "nombre": "Broken",
                    "tipo": "causa",
                }
            )


class SaveHypothesisTests(TestCase):
    @patch("uc_bib_solv.modules.rca_tree.adapters.outbound.causa_detail_compat.create_hypothesis")
    def test_save_hypothesis_creates_when_no_hypothesis_id(self, create_hypothesis_mock):
        create_hypothesis_mock.return_value = {"id": 21, "causa_id": 10, "descripcion": "Hyp"}

        result = causa_detail_service.save_hypothesis(
            {
                "cause_id": 10,
                "descripcion": "Hyp",
                "tipo": "aceptacion",
                "criterio_validacion": "crit",
                "estado": "pendiente",
            }
        )

        create_hypothesis_mock.assert_called_once_with(10, "Hyp", "aceptacion", "crit", "pendiente")
        self.assertEqual(result["hypothesis"]["id"], 21)
        self.assertEqual(result["message"], "Hipotesis creada.")

    @patch("uc_bib_solv.modules.rca_tree.adapters.outbound.causa_detail_compat.update_hypothesis")
    def test_save_hypothesis_updates_when_hypothesis_id_exists(self, update_hypothesis_mock):
        update_hypothesis_mock.return_value = {"id": 22, "causa_id": 10, "descripcion": "Updated"}

        result = causa_detail_service.save_hypothesis(
            {
                "hypothesis_id": 22,
                "descripcion": "Updated",
                "tipo": "aceptacion",
                "criterio_validacion": "crit",
                "estado": "rechazada",
            }
        )

        update_hypothesis_mock.assert_called_once_with(22, "Updated", "aceptacion", "crit", "rechazada")
        self.assertEqual(result["hypothesis"]["id"], 22)
        self.assertEqual(result["message"], "Hipotesis actualizada.")

    def test_save_hypothesis_requires_cause_or_hypothesis_id(self):
        with self.assertRaisesRegex(ValueError, "Se requiere una causa"):
            causa_detail_service.save_hypothesis({"descripcion": "Broken"})


class DeleteHypothesisTests(TestCase):
    @patch("uc_bib_solv.modules.rca_tree.adapters.outbound.causa_detail_compat.delete_hypothesis")
    def test_delete_hypothesis_record_returns_success(self, delete_hypothesis_mock):
        delete_hypothesis_mock.return_value = True

        result = causa_detail_service.delete_hypothesis_record(22)

        delete_hypothesis_mock.assert_called_once_with(22)
        self.assertEqual(result, {"deleted": True, "message": "Hipotesis eliminada."})

    @patch("uc_bib_solv.modules.rca_tree.adapters.outbound.causa_detail_compat.delete_hypothesis")
    def test_delete_hypothesis_record_raises_when_missing(self, delete_hypothesis_mock):
        delete_hypothesis_mock.return_value = False

        with self.assertRaisesRegex(ValueError, "Hipotesis no encontrada"):
            causa_detail_service.delete_hypothesis_record(99)
