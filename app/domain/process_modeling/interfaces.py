from abc import ABC, abstractmethod


class ProcessRepository(ABC):
    @abstractmethod
    def list(self): ...

    @abstractmethod
    def get(self, process_id): ...


class VersionRepository(ABC):
    @abstractmethod
    def get(self, version_id): ...


class NodeRepository(ABC):
    @abstractmethod
    def list_by_version(self, version_id): ...


class TransitionRepository(ABC):
    @abstractmethod
    def list_by_version(self, version_id): ...
