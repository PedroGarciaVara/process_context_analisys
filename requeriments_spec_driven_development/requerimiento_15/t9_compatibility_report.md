# T9 — Compatibility report

The T9 changes preserve the existing HTTP and schema contracts: no route,
method, payload, status mapping, frontend asset, SQL schema, table, column or
transaction convention was changed. Route facades continue to expose the public
module names while delegating to canonical module wiring.

| Surface | Evidence |
|---|---|
| Architecture boundaries | Four validator commands exit `0`; architecture and T9 boundary tests pass |
| Python compatibility checks | Focused architecture tests and T9 tests pass; broader unit execution is environment/worktree limited and is not claimed as green |
| JavaScript compatibility | `node --check` completed with exit `0` for discovered JS/MJS files |
| Database/schema compatibility | `db_management/schema.sql` SHA-256 remains `f85ab20439d4ebf68bbd0ed49e1f3d0748db00276b58d17cef8ad298c8fe0866` |
| Smoke/integration/E2E | PostgreSQL/server/Playwright availability is documented as environmental where unavailable; no passing result is invented |

The new CI workflow runs the four deterministic validators and architecture
boundary tests only; it adds no deployment, database publication or unrelated
runtime behavior.
