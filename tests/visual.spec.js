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
const { pageUrl, EQUIPMENT, EQUIPMENT_IDS, ENEMIES, pageEquipment } = require("./helpers");

async function open(page, file) {
  await page.goto(pageUrl(file));
  await page.waitForSelector(".equipment-section, .picker-card, .upgrade-pair");
}

const kebabCase = (id) => id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

test.describe("Every equipment card", () => {
  for (const equipmentId of EQUIPMENT_IDS) {
    // Snapshot the card where it first appears (an enemy may carry several copies). Most of what a
    // player buys is carried by no enemy at all, so those fall back to the regular card on their
    // own equipment page -- the first card there, the upgraded one being second.
    const enemyId = Object.keys(ENEMIES).find((id) => pageEquipment(ENEMIES[id]).includes(equipmentId));
    const file = enemyId ? `enemies/${enemyId}.html` : `equipment/${equipmentId}.html`;
    const index = enemyId ? pageEquipment(ENEMIES[enemyId]).indexOf(equipmentId) : 0;

    test(`${EQUIPMENT[equipmentId].name} card`, async ({ page }) => {
      await open(page, file);
      await expect(page.locator(".equipment-card").nth(index)).toHaveScreenshot(
        `${kebabCase(equipmentId)}-card.png`
      );
    });
  }
});

// Snapshotted from the equipment pages, where an upgraded card is the only place one is drawn. The
// base cards keep their own snapshots on the enemy pages above, so a change here can't quietly move
// them too.
test.describe("Every upgraded equipment card", () => {
  for (const equipmentId of EQUIPMENT_IDS) {
    test(`${EQUIPMENT[equipmentId].name}+ card`, async ({ page }) => {
      await open(page, `equipment/${equipmentId}.html`);
      await expect(page.locator(".equipment-card").nth(1)).toHaveScreenshot(
        `${kebabCase(equipmentId)}-card-upgraded.png`
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
    await open(page, "enemies.html");
    await expect(page).toHaveScreenshot("picker-page.png", { fullPage: true });
  });
});

test.describe("Equipment reference", () => {
  test("full home page", async ({ page }) => {
    await open(page, "index.html");
    await expect(page).toHaveScreenshot("home-page.png", { fullPage: true });
  });

  test("full equipment search page", async ({ page }) => {
    await open(page, "equipment.html");
    await expect(page).toHaveScreenshot("equipment-search-page.png", { fullPage: true });
  });

  test("equipment search page, filtered", async ({ page }) => {
    await open(page, "equipment.html");
    await page.locator("#equipment-search-input").fill("crystal");
    await expect(page).toHaveScreenshot("equipment-search-filtered.png", { fullPage: true });
  });

  // Battle Axe's upgrade changes the card's size, Snowball's adds a die-face and a line of effect
  // text -- between them, everything an upgrade can do to a card's layout.
  test("full Battle Axe page (upgrade changes the card's size)", async ({ page }) => {
    await open(page, "equipment/battleAxe.html");
    await expect(page).toHaveScreenshot("battle-axe-page.png", { fullPage: true });
  });

  test("full Snowball page (upgrade adds a die-face)", async ({ page }) => {
    await open(page, "equipment/snowball.html");
    await expect(page).toHaveScreenshot("snowball-page.png", { fullPage: true });
  });

  // The ribbon is a small share of a whole card, so a change to its shape or color could average
  // below the diff threshold on the card snapshots -- same reason the icon close-ups exist.
  test("upgrade ribbon close-up", async ({ page }) => {
    await open(page, "equipment/battleAxe.html");
    const ribbon = page.locator(".equipment-card--upgraded .upgrade-ribbon");
    await expect(ribbon).toHaveScreenshot("upgrade-ribbon.png");
  });
});

// Close-ups of the effect lines that introduce each newer tinted icon or dimmed note, for the same
// reason as the Small Shield and Fireball ones above.
test.describe("Tinted icon close-ups", () => {
  const CLOSE_UPS = [
    ["beatrice", "beeSting", "shock"],
    ["wizard", "freezeSpell", "ice"],
    ["alchemist", "bearPotion", "heal"],
    ["drake", "bloodSuck", "drain"],
    ["drake", "smogCloud", "poison and blind"],
    ["stickyHands", "pickpocket", "gold, muted note"],
    ["wisp", "foolsFire", "vanish"],
    ["warlock", "shootingStar", "confuse"],
    ["rhinoBeetle", "beetleHeadbutt", "lock"],
  ];
  for (const [enemyId, equipmentId, what] of CLOSE_UPS) {
    test(`${EQUIPMENT[equipmentId].name} effect line close-up (${what})`, async ({ page }) => {
      await open(page, `enemies/${enemyId}.html`);
      const index = pageEquipment(ENEMIES[enemyId]).indexOf(equipmentId);
      const effect = page.locator(".equipment-card").nth(index).locator(".equipment-card__effect");
      await expect(effect).toHaveScreenshot(`${kebabCase(equipmentId)}-effect.png`);
    });
  }
});

test.describe("Keymaster", () => {
  test("full Keymaster page (exact-requirement sockets and an extra equipment section)", async ({
    page,
  }) => {
    await open(page, "enemies/keymaster.html");
    await expect(page).toHaveScreenshot("keymaster-page.png", { fullPage: true });
  });
});

test.describe("Scathach", () => {
  test("full Scathach page (boss; captioned sockets beside die-faces)", async ({ page }) => {
    await open(page, "enemies/scathach.html");
    await expect(page).toHaveScreenshot("scathach-page.png", { fullPage: true });
  });
});
