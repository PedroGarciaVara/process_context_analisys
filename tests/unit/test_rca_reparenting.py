from contextlib import nullcontext
from dataclasses import dataclass
from unittest.mock import patch

import pytest

from uc_bib_solv.modules.rca_tree.application.use_cases.causes.move_cause import MoveCause
from uc_bib_solv.modules.rca_tree.adapters.outbound.postgres import graph_query_repo
from uc_bib_solv.modules.rca_tree.domain.causal_graph.rules import (
    validate_reparenting_invariants,
)
from uc_bib_solv.modules.rca_tree.domain.exceptions import (
    ContractMismatchError,
    CycleDetectedError,
    InvalidReasonError,
    InvalidRelationshipError,
    PrimaryRelationshipConflictError,
    RootPolicyError,
    SelfParentError,
    VersionConflictError,
)


@dataclass
class FakeReparenting:
    context: dict
    result: dict
    calls: list

    def get_move_context(self, cause_id, parent_id):
        return self.context

    def move_cause(self, command):
        self.calls.append(command)
        return self.result


class ProjectionCursor:
    def __init__(self, rows):
        self.rows = rows
        self.executed = []

    def execute(self, sql, params):
        self.executed.append((sql, params))

    def fetchall(self):
        return self.rows


def context(parent_id=1202):
    return {
        "cause": {"id": 1207, "contract_id": 44, "parent_id": 1190, "version": 7},
        "parent": {"id": parent_id, "contract_id": 44, "node_type": "CAUSE"},
        "edges": [],
        "preserved": {"hypothesis_ids": [3007], "analysis_result_ids": [5007], "reference_ids": [9007]},
    }


def test_structural_projection_propagates_persisted_version_only_to_cause_nodes():
    cursor = ProjectionCursor(
        [
            {
                "parent_node_id": 100,
                "child_node_id": 301,
                "relationship_type": "CAUSES",
                "parent_node_type": "CONTRACT",
                "parent_contract_id": 44,
                "node_type": "CAUSE",
                "code": "CAUSE:301",
                "name": "Cause",
                "description": "Cause description",
                "status": "active",
                "child_cause_id": 1207,
                "child_cause_version": 7,
                "metadata": {},
            },
            {
                "parent_node_id": 301,
                "child_node_id": 302,
                "relationship_type": "HAS_HYPOTHESIS",
                "parent_node_type": "CAUSE",
                "parent_cause_id": 1207,
                "node_type": "HYPOTHESIS",
                "code": "HYPOTHESIS:302",
                "name": "Hypothesis",
                "description": "Hypothesis description",
                "status": "pending",
                "child_hypothesis_id": 2207,
                "metadata": {},
            },
        ]
    )

    with patch(
        "uc_bib_solv.modules.rca_tree.adapters.outbound.postgres.graph_query_repo.db_cursor",
        return_value=nullcontext(cursor),
    ):
        projection = graph_query_repo._structural_projection(100, 44)

    cause = projection["tree"][0]
    hypothesis = cause["children"][0]
    assert cause["version"] == 7
    assert "version" not in hypothesis
    assert "child_cause.version AS child_cause_version" in cursor.executed[0][0]


def test_valid_move_preserves_identity_scientific_links_and_audit_context():
    port = FakeReparenting(
        context(),
        {"cause": {"id": 1207, "parent_id": 1202, "version": 8}, "audit": {"action": "CAUSE_REPARENTED"}},
        [],
    )
    result = MoveCause(port).execute(
        {"parent_id": 1202, "expected_version": 7, "reason": " evidence confirms branch ", "actor_id": "spoof"},
        cause_id=1207,
    )
    command = port.calls[0]
    assert result["cause"]["id"] == 1207
    assert result["cause"]["parent_id"] == 1202
    assert result["cause"]["version"] == 8
    assert result["preserved"] == context()["preserved"]
    assert command.reason == "evidence confirms branch"
    assert command.actor_id == "spoof"


@pytest.mark.parametrize("bad_parent, exc", [(1207, SelfParentError)])
def test_self_parent_is_rejected(bad_parent, exc):
    with pytest.raises(exc):
        MoveCause(FakeReparenting(context(bad_parent), {}, [])).execute(
            {"parent_id": bad_parent, "expected_version": 7, "reason": "reason"}, cause_id=1207
        )


def test_indirect_cycle_is_rejected():
    ctx = context(1210)
    ctx["edges"] = [
        {"parent_node_id": 1207, "child_node_id": 1210, "relationship_type": "CAUSES"},
        {"parent_node_id": 1210, "child_node_id": 1202, "relationship_type": "CAUSES"},
    ]
    with pytest.raises(CycleDetectedError):
        MoveCause(FakeReparenting(ctx, {}, [])).execute(
            {"parent_id": 1210, "expected_version": 7, "reason": "reason"}, cause_id=1207
        )


@pytest.mark.parametrize(
    "mutator, exc",
    [
        (lambda c: c.update(parent={"id": 2202, "contract_id": 45, "node_type": "CAUSE"}), ContractMismatchError),
        (lambda c: c.update(cause={**c["cause"], "version": 8}), VersionConflictError),
        (lambda c: c.update(cause={**c["cause"], "is_root": True}), RootPolicyError),
        (lambda c: c.update(primary_relationships=[{"relationship_type": "CAUSES", "is_primary": True}, {"relationship_type": "CAUSES", "is_primary": True}]), PrimaryRelationshipConflictError),
        (lambda c: c.update(parent={"id": 1202, "contract_id": 44, "node_type": "CONTRACT"}), InvalidRelationshipError),
    ],
)
def test_contract_root_version_primary_and_relationship_guards(mutator, exc):
    ctx = context()
    mutator(ctx)
    with pytest.raises(exc):
        MoveCause(FakeReparenting(ctx, {}, [])).execute(
            {"parent_id": 1202, "expected_version": 7, "reason": "reason"}, cause_id=1207
        )


def test_invalid_reason_is_422_domain_error_and_missing_fields_are_400():
    with pytest.raises(InvalidReasonError):
        MoveCause(FakeReparenting(context(), {}, [])).execute(
            {"parent_id": 1202, "expected_version": 7, "reason": "   "}, cause_id=1207
        )
    with pytest.raises(ValueError):
        MoveCause(FakeReparenting(context(), {}, [])).execute(
            {"parent_id": 1202, "reason": "reason"}, cause_id=1207
        )


def test_null_parent_is_only_allowed_by_explicit_root_policy():
    ctx = context(None)
    ctx["parent"] = None
    with pytest.raises(RootPolicyError):
        MoveCause(FakeReparenting(ctx, {}, [])).execute(
            {"parent_id": None, "expected_version": 7, "reason": "reason"}, cause_id=1207
        )

    ctx["allow_null_parent"] = True
    port = FakeReparenting(ctx, {"cause": {"id": 1207, "parent_id": None, "version": 8}}, [])
    MoveCause(port).execute({"parent_id": None, "expected_version": 7, "reason": "reason"}, cause_id=1207)
    assert port.calls[0].parent_id is None


def test_domain_rules_do_not_mutate_graph_edges():
    edges = [{"parent_node_id": 1207, "child_node_id": 1210, "relationship_type": "CAUSES"}]
    with pytest.raises(CycleDetectedError):
        validate_reparenting_invariants(
            cause={"id": 1207, "contract_id": 44}, parent={"id": 1210, "contract_id": 44}, edges=edges
        )
    assert edges == [{"parent_node_id": 1207, "child_node_id": 1210, "relationship_type": "CAUSES"}]
