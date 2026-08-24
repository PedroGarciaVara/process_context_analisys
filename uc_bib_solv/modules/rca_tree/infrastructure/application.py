"""Composition of RCA_TREE application use cases for inbound adapters.

This module contains no business rules. It only groups independently wired
use cases behind the existing HTTP-facing application contract.
"""

from typing import Any

from ..application.use_cases import (
    CreateCause,
    CreateContractNode,
    CreateHypothesis,
    DeleteCause,
    DeleteHypothesis,
    GetCauseDetail,
    GetHypothesisDeletePreview,
    GetTree,
    LinkReusableNode,
    ListHypotheses,
    SearchReusableNodes,
    UpdateCause,
    UpdateHypothesis,
)


class RcaTreeApplication:
    """Compatibility composition root for causal-tree inbound adapters."""

    def __init__(
        self,
        *,
        get_tree: GetTree,
        get_cause_detail: GetCauseDetail,
        create_cause: CreateCause,
        update_cause: UpdateCause,
        delete_cause: DeleteCause,
        create_hypothesis: CreateHypothesis,
        update_hypothesis: UpdateHypothesis,
        list_hypotheses: ListHypotheses,
        delete_hypothesis: DeleteHypothesis,
        hypothesis_delete_preview: GetHypothesisDeletePreview,
        search_reusable_nodes: SearchReusableNodes,
        link_reusable_node: LinkReusableNode,
        create_contract_node: CreateContractNode,
    ):
        self._get_tree = get_tree
        self._get_cause_detail = get_cause_detail
        self._create_cause = create_cause
        self._update_cause = update_cause
        self._delete_cause = delete_cause
        self._create_hypothesis = create_hypothesis
        self._update_hypothesis = update_hypothesis
        self._list_hypotheses = list_hypotheses
        self._delete_hypothesis = delete_hypothesis
        self._hypothesis_delete_preview = hypothesis_delete_preview
        self._search_reusable_nodes = search_reusable_nodes
        self._link_reusable_node = link_reusable_node
        self._create_contract_node = create_contract_node

    def get_tree_payload(self, view="arbol", selected_cause_id=None, zoom=1.0, contract_id=None):
        payload = self._get_tree.execute(view, selected_cause_id, zoom, contract_id)
        payload["status"] = "ok"
        return payload

    def get_detail_payload(self, params):
        return self._get_cause_detail.execute(dict(params))

    def save_cause(self, payload):
        return (
            self._update_cause.execute(payload)
            if payload.get("causa_id")
            else self._create_cause.execute(payload)
        )

    def save_hypothesis(self, payload):
        return (
            self._update_hypothesis.execute(payload)
            if payload.get("hypothesis_id")
            else self._create_hypothesis.execute(payload)
        )

    def list_hypotheses(self, cause_id):
        return self._list_hypotheses.execute(cause_id)

    def delete_cause(self, cause_id):
        return self._delete_cause.execute(cause_id)

    def delete_hypothesis(self, hypothesis_id):
        return self._delete_hypothesis.execute(hypothesis_id)

    def get_delete_preview(self, hypothesis_id):
        return self._hypothesis_delete_preview.execute(hypothesis_id)

    def search_reusable_nodes(self, params):
        return self._search_reusable_nodes.execute(params)

    def link_reusable_node(self, payload):
        return self._link_reusable_node.execute(payload)

    def create_contract_node(self, payload):
        return self._create_contract_node.execute(payload)


__all__ = ["RcaTreeApplication"]
