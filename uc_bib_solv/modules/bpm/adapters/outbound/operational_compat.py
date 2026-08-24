"""BPM-owned compatibility adapter for former operational imports."""

from .operational_postgres import BpmOperationalPostgresAdapter


class OperationalPersistenceAdapter(BpmOperationalPostgresAdapter):
    """Compatibility constructor; operational data remains owned by BPM."""

    def __init__(self, backend=None, connection_factory=None, **kwargs):
        from uc_bib_solv.modules.bpm.infrastructure.wiring import build_bpm_operational_postgres_adapter

        if backend is None and not kwargs:
            adapter = build_bpm_operational_postgres_adapter(connection_factory=connection_factory)
            super().__init__(
                backend=adapter.backend,
                connection_factory=adapter.connection_factory,
                machines=adapter.machines,
                contracts=adapter.contracts,
                machine_contracts=adapter.machine_contracts,
                configurations=adapter.configurations,
            )
            return
        super().__init__(
            backend=backend or kwargs.pop("backend", None),
            connection_factory=connection_factory,
            machines=kwargs.pop("machines", object()),
            contracts=kwargs.pop("contracts", object()),
            machine_contracts=kwargs.pop("machine_contracts", object()),
            configurations=kwargs.pop("configurations", object()),
            **kwargs,
        )


__all__ = ["OperationalPersistenceAdapter"]
