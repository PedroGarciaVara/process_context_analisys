"""Outbound persistence adapter for the RCA_TREE ports."""

from __future__ import annotations


class RcaTreePostgresAdapter:
    """Compose injected causal repositories without importing legacy modules."""

    def __init__(self, cause_repo, hypothesis_repo, node_repo, relationship_repo, tree_repo, *, contract_context):
        self.cause_repo = cause_repo
        self.hypothesis_repo = hypothesis_repo
        self.node_repo = node_repo
        self.relationship_repo = relationship_repo
        self.tree_repo = tree_repo
        self.contract_context = contract_context

    def get(self, cause_id): return self.cause_repo.get_by_id(int(cause_id))
    def list_for_contract(self, contract_id): return self.cause_repo.list_by_contract(int(contract_id))
    def create(self, contract_id, name, description=None, kind="causa", category=None, parent_id=None): return self.cause_repo.create(int(contract_id), name, description, kind, category, parent_id=parent_id)
    def update(self, cause_id, name, description=None, kind="causa", category=None): return self.cause_repo.update(int(cause_id), name, description, kind, category)
    def delete(self, cause_id): return self.cause_repo.delete(int(cause_id))
    def get_hypothesis(self, hypothesis_id): return self.hypothesis_repo.get_by_id(int(hypothesis_id))
    def list_for_cause(self, cause_id): return self.hypothesis_repo.get_by_causa(int(cause_id))
    def create_hypothesis(self, cause_id, description, kind="aceptacion", validation_criterion=None, status="pendiente", **extra): return self.hypothesis_repo.create(int(cause_id), description, kind, validation_criterion, status, **extra)
    def update_hypothesis(self, hypothesis_id, description, kind, validation_criterion, status, **extra): return self.hypothesis_repo.update(int(hypothesis_id), description, kind, validation_criterion, status, **extra)
    def delete_hypothesis(self, hypothesis_id): return self.hypothesis_repo.delete(int(hypothesis_id))
    def get_node(self, node_id): return self.node_repo.get_by_id(int(node_id))
    def create_relationship(self, parent_node_id, child_node_id, relationship_type, **kwargs): return self.relationship_repo.create(int(parent_node_id), int(child_node_id), relationship_type, **kwargs)
    def list_structural_edges(self): return self.tree_repo.get_structural_edges()
    def tree_payload(self, view="arbol", selected_cause_id=None, zoom=1.0, contract_id=None):
        return self.tree_repo.get_tree_payload(view, selected_cause_id, zoom, contract_id, contract_context=self.contract_context)
    def search_reusable_nodes(self, node_type, text=None, limit=25):
        return self.tree_repo.search_reusable_nodes(node_type, text=text, limit=limit, contract_context=self.contract_context)
    def link_reusable_node(self, **kwargs):
        kwargs["contract_context"] = self.contract_context
        return self.tree_repo.link_reusable_node(**kwargs)
    def create_contract_child(self, *args, **kwargs):
        return self.tree_repo.create_contract_child(*args, contract_context=self.contract_context, **kwargs)


class CauseRepositoryAdapter:
    def __init__(self, persistence): self.persistence = persistence
    def get(self, cause_id): return self.persistence.get(cause_id)
    def create(self, *args, **kwargs): return self.persistence.create(*args, **kwargs)
    def update(self, *args, **kwargs): return self.persistence.update(*args, **kwargs)
    def delete(self, cause_id): return self.persistence.delete(cause_id)


class HypothesisRepositoryAdapter:
    def __init__(self, persistence): self.persistence = persistence
    def get(self, hypothesis_id): return self.persistence.get_hypothesis(hypothesis_id)
    def list_for_cause(self, cause_id): return self.persistence.list_for_cause(cause_id)
    def create(self, *args, **kwargs): return self.persistence.create_hypothesis(*args, **kwargs)
    def update(self, *args, **kwargs): return self.persistence.update_hypothesis(*args, **kwargs)
    def delete(self, hypothesis_id): return self.persistence.delete_hypothesis(hypothesis_id)


class NodeRepositoryAdapter:
    def __init__(self, persistence): self.persistence = persistence
    def get(self, node_id): return self.persistence.get_node(node_id)


class RelationshipRepositoryAdapter:
    def __init__(self, persistence): self.persistence = persistence
    def create(self, *args, **kwargs): return self.persistence.create_relationship(*args, **kwargs)
    def list_structural_edges(self): return self.persistence.list_structural_edges()


__all__ = ["RcaTreePostgresAdapter", "CauseRepositoryAdapter", "HypothesisRepositoryAdapter", "NodeRepositoryAdapter", "RelationshipRepositoryAdapter"]
