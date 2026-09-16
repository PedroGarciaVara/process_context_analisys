import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const evidenceDir = path.join(".playwright-artifacts", "causa-detail-mode-tabs", runId);

test("new child cause exposes accessible mode tabs and an independent CTA", async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.goto("/#/causa_detalle?contrato_id=2&parent_id=45");
  await expect(page.locator("#cd-cause-save")).toHaveText("Crear causa hija");

  const tabs = page.locator('#cd-editor-mode-wrap [role="tab"]');
  await expect(page.locator("#cd-editor-mode-wrap")).toHaveAttribute("role", "tablist");
  await expect(tabs).toHaveCount(3);
  await expect(tabs.filter({ hasText: "Crear causa nueva" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#cd-editor-mode-panel")).toHaveAttribute("role", "tabpanel");
  await expect(page.locator("#cd-editor-mode-panel")).toHaveAttribute("aria-labelledby", "cd-editor-mode-new_cause");
  await page.screenshot({ path: path.join(evidenceDir, "01-new-child-before-mode-switch.png"), fullPage: true });

  await tabs.filter({ hasText: "Vincular causa existente" }).click();
  await expect(tabs.filter({ hasText: "Vincular causa existente" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#cd-editor-mode-panel")).toHaveAttribute("aria-labelledby", "cd-editor-mode-link_existing_cause");
  await expect(page.locator("#cd-link-actions")).toBeVisible();
  await expect(page.locator("#cd-editor-fields")).toBeHidden();
  await expect(page.locator("#cd-cause-save")).toHaveText("Vincular causa existente");
  await page.screenshot({ path: path.join(evidenceDir, "02-link-existing-mode.png"), fullPage: true });

  await page.locator('[role="tab"][aria-selected="true"]').press("ArrowLeft");
  await expect(tabs.filter({ hasText: "Crear causa nueva" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#cd-editor-fields")).toBeVisible();
  await expect(page.locator("#cd-link-actions")).toBeHidden();
  await expect(page.locator("#cd-cause-save")).toHaveText("Crear causa hija");
  await page.screenshot({ path: path.join(evidenceDir, "03-new-child-after-keyboard-switch.png"), fullPage: true });
  await page.locator(".detail-card").first().screenshot({ path: path.join(evidenceDir, "04-editor-card-cta-and-tabs.png") });
  await page.locator("#cd-cause-save").screenshot({ path: path.join(evidenceDir, "05-independent-create-child-cta.png") });

  fs.writeFileSync(path.join(evidenceDir, "summary.json"), JSON.stringify({
    route: "/#/causa_detalle?contrato_id=2&parent_id=45",
    tabs: await tabs.allTextContents(),
    cta: await page.locator("#cd-cause-save").innerText(),
    writesPerformed: false,
  }, null, 2));

  await page.goto("/#/causa_detalle?contrato_id=2&causa_id=45");
  await expect(page.locator("#cd-editor-mode-wrap")).toBeHidden();
  await expect(page.locator("#cd-editor-mode-panel")).not.toHaveAttribute("aria-labelledby", /.+/);
});
