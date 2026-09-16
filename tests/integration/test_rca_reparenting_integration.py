from pathlib import Path

import pytest
from flask import Flask, g

from uc_bib_solv.modules.rca_tree.adapters.inbound.http.routes import create_blueprint
from uc_bib_solv.modules.rca_tree.domain.exceptions import (
    CausalTreeNotFoundError, CausalTreeValidationError, CycleDetectedError, VersionConflictError,
)
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import transaction_postgres


class Service:
    def __init__(self, outcome=None): self.outcome = outcome; self.received = None
    def move_cause(self, cause_id, payload):
        self.received = (cause_id, payload)
        if isinstance(self.outcome, Exception): raise self.outcome
        return self.outcome or {"cause": {"id": cause_id, "parent_id": payload["parent_id"], "version": 8}}


def client_for(service):
    app = Flask(__name__)
    app.register_blueprint(create_blueprint(service=service))
    @app.before_request
    def actor(): g.user_id = "authenticated-user"
    return app.test_client()


def test_patch_move_uses_url_id_authenticated_actor_and_correlation_id():
    service = Service({"cause": {"id": 1207}, "audit": {"action": "CAUSE_REPARENTED"}})
    response = client_for(service).patch(
        "/api/rca-tree/causes/1207/parent",
        json={"parent_id": 1202, "expected_version": 7, "reason": "move", "actor_id": "spoof"},
        headers={"X-Correlation-ID": "corr-test-01"},
    )
    assert response.status_code == 200
    assert service.received[0] == 1207
    assert service.received[1]["actor_id"] == "authenticated-user"
    assert service.received[1]["correlation_id"] == "corr-test-01"


def test_bad_payload_is_400_and_does_not_call_service():
    service = Service()
    response = client_for(service).patch("/api/rca-tree/causes/1207/parent", json={"parent_id": 1202})
    assert response.status_code == 400
    assert service.received is None


def test_http_maps_404_409_and_400_with_correlation_id():
    for exc, status, code in [
        (CausalTreeNotFoundError("missing"), 404, "RCA_CAUSE_NOT_FOUND"),
        (CycleDetectedError("cycle"), 409, "RCA_CYCLE_DETECTED"),
        (VersionConflictError("stale"), 409, "RCA_VERSION_CONFLICT"),
        (CausalTreeValidationError("bad"), 400, "RCA_INVALID_REQUEST"),
    ]:
        service = Service(exc)
        response = client_for(service).patch(
            "/api/rca-tree/causes/1207/parent",
            json={"parent_id": 1202, "expected_version": 7, "reason": "move"},
            headers={"X-Correlation-ID": "corr-test-02"},
        )
        body = response.get_json()
        assert response.status_code == status
        assert body["code"] == code
        assert body["correlation_id"] == "corr-test-02"


def test_service_exception_does_not_claim_success_or_mutate_local_state():
    service = Service(CycleDetectedError("cycle"))
    response = client_for(service).patch(
        "/api/rca-tree/causes/1207/parent",
        json={"parent_id": 1210, "expected_version": 7, "reason": "move"},
    )
    assert response.status_code == 409
    assert response.get_json()["status"] == "error"


def test_postgres_transaction_commits_and_rolls_back_as_one_boundary(monkeypatch):
    class Cursor:
        def __enter__(self): return self
        def __exit__(self, *_): return False

    class Connection:
        def __init__(self): self.commits = 0; self.rollbacks = 0
        def cursor(self, **_): return Cursor()
        def commit(self): self.commits += 1
        def rollback(self): self.rollbacks += 1
        def close(self): pass

    connection = Connection()
    monkeypatch.setattr(transaction_postgres, "get_connection", lambda: connection)
    with transaction_postgres.postgres_transaction():
        pass
    assert (connection.commits, connection.rollbacks) == (1, 0)
    with pytest.raises(RuntimeError):
        with transaction_postgres.postgres_transaction():
            raise RuntimeError("audit insert failed")
    assert (connection.commits, connection.rollbacks) == (1, 1)


def test_rca_migration_is_additive_idempotent_and_append_only():
    schema = (Path(__file__).resolve().parents[2] / "db_management" / "schema.sql").read_text(
        encoding="utf-8"
    )
    assert "CREATE EXTENSION IF NOT EXISTS pgcrypto" in schema
    assert "ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1" in schema
    assert schema.count("CREATE TABLE IF NOT EXISTS causa_movimiento_auditoria") == 1
    assert "CREATE INDEX IF NOT EXISTS idx_causa_mov_audit_correlation" in schema
    assert "DROP TRIGGER IF EXISTS causa_movimiento_auditoria_immutable_trg" in schema
    assert "BEFORE UPDATE OR DELETE" in schema
    assert "INSERT INTO" not in schema
    assert "UPDATE causa" not in schema
