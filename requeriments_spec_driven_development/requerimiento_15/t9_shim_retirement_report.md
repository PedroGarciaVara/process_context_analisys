# T9 — Shim retirement report

## Retirement decision

No compatibility shim was deleted. The approved gate is reference count zero,
delegation evidence, and green regression evidence; the current worktree does not
meet that gate for the listed public seams. Deleting them would risk HTTP/startup
or test imports and would exceed the authorized T9 safety condition.

## Active implementation check

`python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations`
returned exit `0`. This is the deterministic evidence that no duplicate outbound
implementation was detected by the repository validator. The retained shims are
facades/re-exports, not second outbound implementations.

## Next removal candidates

1. Process-modeling legacy domain re-exports, after canonical domain ownership is
   complete and all legacy imports are redirected.
2. Agent-tools re-exports, after compatibility tests and external callers no longer
   import the legacy package.
3. Route/service/repository facades per the criteria in the closure matrix.

T10/human validation remains responsible for accepting this retained-shim policy.
