"""Reviewed exceptions; each entry has an owner, reason, phase and exit rule."""

from dataclasses import dataclass


@dataclass(frozen=True)
class AllowlistEntry:
    pattern: str
    owner: str
    reason: str
    phase: str
    removal_criterion: str


# Keep this list explicit and small. It documents compatibility paths only;
# product code must import through ``uc_bib_solv`` and new code under modules
# must pass the validators without exceptions. Top-level namespaces used by
# historical tests are not runtime dependencies and are intentionally not
# added to this allowlist.
ALLOWLIST: tuple[AllowlistEntry, ...] = (
    AllowlistEntry(
        "uc_bib_solv/routes/*.py",
        "migration owners",
        "legacy HTTP compatibility surface",
        "T1-T12",
        "remove after every public route is registered from its canonical inbound adapter and contract tests remain green",
    ),
    AllowlistEntry(
        "uc_bib_solv/repositories/*.py",
        "persistence owner",
        "legacy repository imports during incremental migration",
        "T1-T12",
        "remove after consumer search is zero outside compatibility tests and one canonical outbound implementation owns each operation",
    ),
    AllowlistEntry(
        "uc_bib_solv/services/*.py",
        "application migration owner",
        "legacy service facade retained for public imports and phased consumers",
        "T4-T12",
        "remove after all runtime consumers call application use cases or public ports and service contract tests remain green",
    ),
    AllowlistEntry(
        "uc_bib_solv/app/domain/**/*.py",
        "domain migration owner",
        "legacy domain compatibility exports and historical isolated tests",
        "T1-T12",
        "remove after canonical domain modules own the implementation and legacy import count is zero",
    ),
    AllowlistEntry(
        "uc_bib_solv/app/persistence/*.py",
        "persistence owner",
        "legacy persistence seam used by retained adapters and database fixtures",
        "T1-T12",
        "remove after all outbound adapters use canonical ports and DB/integration evidence is green",
    ),
)
