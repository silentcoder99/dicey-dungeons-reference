// Visual regression snapshots. Runs once per viewport project (see playwright.config.js:
// "visual-mobile" / "visual-desktop"), which Playwright keeps as separate baseline images
// automatically (the project name is part of the snapshot filename).
//
// Component-level close-ups exist alongside the full-page shots because a full-page diff can
// average out a small regression (e.g. a few non-circular pips) below the pixel-ratio
// threshold; a tight crop on just that element does not have that problem.
//
// Every equipment card has its own snapshot, generated from js/data.js, so a card can't drift
// after being checked by eye against its wiki card image (see README).
const { test, expect } = require("@playwright/test");
const { pageUrl, EQUIPMENT, ENEMIES } = require("./helpers");

async function open(page, file) {
  await page.goto(pageUrl(file));
  await page.waitForSelector(".equipment-card, .enemy-picker__card");
}

const kebabCase = (id) => id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

test.describe("Every equipment card", () => {
  for (const equipmentId of Object.keys(EQUIPMENT)) {
    // Snapshot the card where it first appears (an enemy may carry several copies).
    const enemyId = Object.keys(ENEMIES).find((id) => ENEMIES[id].equipment.includes(equipmentId));
    const index = ENEMIES[enemyId].equipment.indexOf(equipmentId);

    test(`${EQUIPMENT[equipmentId].name} card`, async ({ page }) => {
      await open(page, `enemies/${enemyId}.html`);
      await expect(page.locator(".equipment-card").nth(index)).toHaveScreenshot(
        `${kebabCase(equipmentId)}-card.png`
      );
    });
  }
});

test.describe("Frog", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "enemies/frog.html");
  });

  test("full Frog page", async ({ page }) => {
    await expect(page).toHaveScreenshot("frog-page.png", { fullPage: true });
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
  test("full Magician page", async ({ page }) => {
    await open(page, "enemies/magician.html");
    await expect(page).toHaveScreenshot("magician-page.png", { fullPage: true });
  });
});

test.describe("Hothead", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "enemies/hothead.html");
  });

  test("full Hothead page", async ({ page }) => {
    await expect(page).toHaveScreenshot("hothead-page.png", { fullPage: true });
  });

  test("Fireball effect line close-up (tinted fire icons and value)", async ({ page }) => {
    const effect = page.locator(".equipment-card").first().locator(".equipment-card__effect");
    await expect(effect).toHaveScreenshot("fireball-effect.png");
  });
});

test.describe("Enemy picker", () => {
  test("full picker page", async ({ page }) => {
    await open(page, "index.html");
    await expect(page).toHaveScreenshot("picker-page.png", { fullPage: true });
  });
});
