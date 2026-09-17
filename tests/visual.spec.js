// Visual regression snapshots. Runs once per viewport project (see playwright.config.js:
// "visual-mobile" / "visual-desktop"), which Playwright keeps as separate baseline images
// automatically (the project name is part of the snapshot filename).
//
// Component-level close-ups exist alongside the full-page shot because a full-page diff can
// average out a small regression (e.g. a few non-circular pips) below the pixel-ratio
// threshold; a tight crop on just that element does not have that problem.
//
// Not every card is snapshotted: these cover each die-slot style (empty, MAX, EVEN, ODD,
// countdown), the die-face, and tinted status icons. Every card still needs an eyes-on
// comparison against its wiki card image when added (see README).
const { test, expect } = require("@playwright/test");
const { pageUrl } = require("./helpers");

async function open(page, file) {
  await page.goto(pageUrl(file));
  await page.waitForSelector(".equipment-card, .enemy-picker__card");
}

test.describe("Frog", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "enemies/frog.html");
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

  // An icon is too small a share of a whole card for a tint change to exceed the diff threshold.
  test("Small Shield effect line close-up (tinted shield icon)", async ({ page }) => {
    const effect = page.locator(".equipment-card").nth(1).locator(".equipment-card__effect");
    await expect(effect).toHaveScreenshot("small-shield-effect.png");
  });

  test("die-face pip rendering close-up", async ({ page }) => {
    const dieFace = page.locator(".equipment-card").first().locator(".die-face");
    await expect(dieFace).toHaveScreenshot("die-face-pips.png");
  });

  test("dice-count header icon close-up", async ({ page }) => {
    const icon = page.locator(".enemy-header__stats .die-face--mini");
    await expect(icon).toHaveScreenshot("dice-count-icon.png");
  });
});

test.describe("Magician", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "enemies/magician.html");
  });

  test("full Magician page", async ({ page }) => {
    await expect(page).toHaveScreenshot("magician-page.png", { fullPage: true });
  });

  test("Magic Shield card", async ({ page }) => {
    await expect(page.locator(".equipment-card").nth(1)).toHaveScreenshot("magic-shield-card.png");
  });
});

test.describe("Hothead", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "enemies/hothead.html");
  });

  test("full Hothead page", async ({ page }) => {
    await expect(page).toHaveScreenshot("hothead-page.png", { fullPage: true });
  });

  test("Fireball card", async ({ page }) => {
    await expect(page.locator(".equipment-card").first()).toHaveScreenshot("fireball-card.png");
  });

  test("Fireball effect line close-up (tinted fire icons and value)", async ({ page }) => {
    const effect = page.locator(".equipment-card").first().locator(".equipment-card__effect");
    await expect(effect).toHaveScreenshot("fireball-effect.png");
  });
});

test.describe("Space Marine", () => {
  test("Plasma Cannon card", async ({ page }) => {
    await open(page, "enemies/spaceMarine.html");
    await expect(page.locator(".equipment-card").first()).toHaveScreenshot("plasma-cannon-card.png");
  });
});

test.describe("Enemy picker", () => {
  test("full picker page", async ({ page }) => {
    await open(page, "index.html");
    await expect(page).toHaveScreenshot("picker-page.png", { fullPage: true });
  });
});
