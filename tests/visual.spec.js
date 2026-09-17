// Visual regression snapshots. Runs once per viewport project (see playwright.config.js:
// "visual-mobile" / "visual-desktop"), which Playwright keeps as separate baseline images
// automatically (the project name is part of the snapshot filename).
//
// Component-level close-ups exist alongside the full-page shot because a full-page diff can
// average out a small regression (e.g. a few non-circular pips) below the pixel-ratio
// threshold; a tight crop on just that element does not have that problem.
const { test, expect } = require("@playwright/test");
const { pageUrl } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await page.goto(pageUrl("frog.html"));
  await page.waitForSelector(".equipment-card");
});

test("full Frog page", async ({ page }) => {
  await expect(page).toHaveScreenshot("frog-page.png", { fullPage: true });
});

test("Broadsword card", async ({ page }) => {
  await expect(page.locator(".equipment-card").first()).toHaveScreenshot("broadsword-card.png");
});

test("Small Shield card", async ({ page }) => {
  await expect(page.locator(".equipment-card").nth(1)).toHaveScreenshot("small-shield-card.png");
});

test("die-face pip rendering close-up", async ({ page }) => {
  const dieFace = page.locator(".equipment-card").first().locator(".die-face");
  await expect(dieFace).toHaveScreenshot("die-face-pips.png");
});

test("dice-count header icon close-up", async ({ page }) => {
  const icon = page.locator(".enemy-header__stats .die-face--mini");
  await expect(icon).toHaveScreenshot("dice-count-icon.png");
});
