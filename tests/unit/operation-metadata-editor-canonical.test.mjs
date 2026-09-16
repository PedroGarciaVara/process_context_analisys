import test from "node:test";
import assert from "node:assert/strict";
import { OPERATION_LIST_FIELDS, stripLegacyMembershipMetadata } from "../../uc_bib_solv/webapp/js/components/operation-metadata-editor.js";

test("generic operation metadata editor has no equipment membership field", () => {
  assert.equal(OPERATION_LIST_FIELDS.some(([key]) => key === "equipment"), false);
});

test("enveloped historical metadata strips duplicate membership keys", () => {
  const result = stripLegacyMembershipMetadata({ data: { equipment: ["EV01"], canonical_ids: { maquina_ids: [13] }, operation_machine_assignments: [], description: "ok" }, source: "legacy" });
  assert.deepEqual(result, { data: { description: "ok" }, source: "legacy" });
});
