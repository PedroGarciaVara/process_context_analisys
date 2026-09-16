import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const editor = fs.readFileSync("uc_bib_solv/webapp/js/controllers/causa-detail-editor.js", "utf8");
const view = fs.readFileSync("uc_bib_solv/webapp/js/views/rca/causa_detalle.js", "utf8");
const card = fs.readFileSync("uc_bib_solv/webapp/js/components/causa-detail/editor-card.js", "utf8");
const styles = fs.readFileSync("uc_bib_solv/webapp/css/forms.css", "utf8");

test("RCA editor modes are semantic tabs with a single active tab", () => {
  assert.match(card, /role: "tablist"/);
  assert.match(editor, /role: "tab"/);
  assert.match(editor, /"aria-selected": isActive \? "true" : "false"/);
  assert.match(editor, /tabindex: isActive \? "0" : "-1"/);
  assert.match(editor, /"aria-controls": "cd-editor-mode-panel"/);
  assert.match(editor, /refs\.editorModePanel\.setAttribute\("aria-labelledby", tabId\)/);
  assert.match(editor, /refs\.editorModePanel\.removeAttribute\("aria-labelledby"\)/);
  assert.match(card, /id: "cd-editor-mode-panel", role: "tabpanel"/);
  assert.match(card, /id: "cd-editor-help"/);
  assert.match(card, /id: "cd-link-actions"/);
  assert.match(card, /id: "cd-editor-fields"/);
});

test("mode tabs keep keyboard navigation and preserve mode switching behavior", () => {
  assert.match(view, /ArrowRight|ArrowDown/);
  assert.match(view, /ArrowLeft|ArrowUp/);
  assert.match(view, /event\.key === "Home"/);
  assert.match(view, /event\.key === "End"/);
  assert.match(view, /selectEditorMode\(tabs\[nextIndex\]\.getAttribute\("data-editor-mode"\), true\)/);
  assert.match(view, /editorActions\.setMode\(nextMode\)/);
  assert.match(view, /editorActions\.applyConfig\(state\.detail\)/);
});

test("mode tabs are visually distinct from the primary cause action", () => {
  const tabStyles = styles.slice(styles.indexOf(".detail-mode-selector {"), styles.indexOf(".detail-editor-help {"));
  assert.match(tabStyles, /border-radius: 6px 6px 0 0/);
  assert.match(tabStyles, /border-bottom-color: #f5c400/);
  assert.doesNotMatch(tabStyles, /btn-primary/);
  assert.match(card, /id: "cd-cause-save"/);
  assert.match(card, /className: "btn btn-primary"/);
});
