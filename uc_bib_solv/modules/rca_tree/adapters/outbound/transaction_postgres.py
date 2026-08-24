"""PostgreSQL implementation of the RCA_TREE transaction port."""

from __future__ import annotations

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


class PostgresTransactionAdapter:
    """Expose the existing transaction boundary through an RCA_TREE port."""

    def cursor(self):
        return db_cursor()


__all__ = ["PostgresTransactionAdapter"]
