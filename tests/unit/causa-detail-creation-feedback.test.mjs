import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const causeCard = fs.readFileSync("uc_bib_solv/webapp/js/components/causa-detail/editor-card.js", "utf8");
const hypothesisCard = fs.readFileSync("uc_bib_solv/webapp/js/components/causa-detail/hypothesis-card.js", "utf8");
const causeActions = fs.readFileSync("uc_bib_solv/webapp/js/controllers/causa-detail-cause-actions.js", "utf8");
const hypothesisActions = fs.readFileSync("uc_bib_solv/webapp/js/controllers/causa-detail-hypotheses.js", "utf8");
const view = fs.readFileSync("uc_bib_solv/webapp/js/views/rca/causa_detalle.js", "utf8");
const styles = fs.readFileSync("uc_bib_solv/webapp/css/forms.css", "utf8");

test("creation feedback is inline, accessible, and exact", () => {
  assert.match(causeCard, /id: "cd-cause-creation-feedback"/);
  assert.match(hypothesisCard, /id: "cd-hypothesis-creation-feedback"/);
  assert.match(causeCard, /role: "status"/);
  assert.match(hypothesisCard, /"aria-live": "polite"/);
  assert.match(styles, /\.detail-inline-feedback[\s\S]*flex: 0 0 100%/);
  assert.match(causeActions, /showCreationFeedback\("Causa creada", feedbackToken\)/);
  assert.match(hypothesisActions, /showCreationFeedback\("Hipótesis creada", feedbackToken\)/);
});

test("feedback appears only after refresh and is cleared for stale interactions", () => {
  assert.match(causeActions, /await refreshDetail\(\{ feedbackToken \}\);\s*if \(!payload\.causa_id\) showCreationFeedback/);
  assert.match(hypothesisActions, /await refreshDetail\(\{ feedbackToken \}\);\s*if \(isCreation\) showCreationFeedback/);
  assert.match(causeActions, /beginCreationAttempt\(\);\s*const routeContractId/);
  assert.match(hypothesisActions, /saveHypothesis\(\) \{\s*const feedbackToken = beginCreationAttempt\(\);[\s\S]*const isCreation/);
  assert.match(view, /async function refreshDetail\(\{ feedbackToken \} = \{\}\) \{[\s\S]*clearCreationFeedback/);
  assert.match(view, /selectEditorMode[\s\S]*clearCreationFeedback\(\);/);
  assert.match(view, /addEventListener\("input", clearCreationFeedback\)/);
});

test("a later action invalidates an earlier creation attempt", () => {
  assert.match(view, /let creationFeedbackEpoch = 0/);
  assert.match(view, /function beginCreationAttempt\(\)[\s\S]*creationFeedbackEpoch \+= 1/);
  assert.match(view, /function showCreationFeedback\(message, token\)[\s\S]*if \(token !== creationFeedbackEpoch\) return/);
  assert.match(causeActions, /const feedbackToken = beginCreationAttempt\(\);[\s\S]*showCreationFeedback\("Causa creada", feedbackToken\)/);
  assert.match(hypothesisActions, /const feedbackToken = beginCreationAttempt\(\);[\s\S]*showCreationFeedback\("Hipótesis creada", feedbackToken\)/);
  assert.match(view, /clearCreationFeedback\(\{ token: feedbackToken, invalidate: feedbackToken === undefined \}\)/);
});
