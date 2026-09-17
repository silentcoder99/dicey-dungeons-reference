// Structural/content assertions against the actually-rendered frog.html page.
const { test, expect } = require("@playwright/test");
const { pageUrl } = require("./helpers");

test.describe("Frog page", () => {
  let consoleErrors;
  let requests;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    requests = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));
    page.on("request", (req) => requests.push(req.url()));

    await page.goto(pageUrl("frog.html"));
    await page.waitForSelector(".equipment-card");
  });

  test("has no console or page errors", async () => {
    expect(consoleErrors).toEqual([]);
  });

  test("loads no external resources (no game assets embedded/hotlinked)", async () => {
    const external = requests.filter((url) => !url.startsWith("file://"));
    expect(external).toEqual([]);
  });

  test("shows the enemy name", async ({ page }) => {
    await expect(page.locator(".enemy-header__name")).toHaveText("Frog");
  });

  test("shows dice count as a die-face icon (not the dashed die-slot) followed by ×N", async ({
    page,
  }) => {
    const diceStat = page.locator(".enemy-header__stats .stat").first();
    await expect(diceStat.locator("dd")).toContainText("×2");
    await expect(diceStat.locator(".die-face")).toHaveCount(1);
    await expect(diceStat.locator(".die-slot")).toHaveCount(0);
  });

  test("shows Max HP as a plain number", async ({ page }) => {
    const hpStat = page.locator(".enemy-header__stats .stat").nth(1);
    await expect(hpStat.locator("dd")).toHaveText("9");
  });

  test('shows "None" for innate effects', async ({ page }) => {
    const innate = page.locator(".enemy-header__innate p");
    await expect(innate).toHaveText("None");
    await expect(innate).toHaveClass(/none/);
  });

  test("renders exactly the two equipment cards Frog carries", async ({ page }) => {
    const cards = page.locator(".equipment-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0).locator(".equipment-card__header")).toHaveText("Broadsword");
    await expect(cards.nth(1).locator(".equipment-card__header")).toHaveText("Small Shield");
  });

  test.describe("Broadsword card", () => {
    test("shows an empty die-slot and a 2-pip die-face side by side", async ({ page }) => {
      const slots = page.locator(".equipment-card").first().locator(".equipment-card__slots > *");
      await expect(slots).toHaveCount(2);
      await expect(slots.nth(0)).toHaveClass(/die-slot/);
      await expect(slots.nth(0)).not.toHaveClass(/die-slot--max/);
      await expect(slots.nth(1)).toHaveClass(/die-face/);
      await expect(slots.nth(1).locator(".die-face__pip")).toHaveCount(2);
    });

    test("effect text reads correctly", async ({ page }) => {
      const effect = page.locator(".equipment-card").first().locator(".equipment-card__effect");
      await expect(effect).toContainText("+ 2 damage");
      await expect(effect.locator("svg.glyph")).toHaveCount(1);
    });
  });

  test.describe("Small Shield card", () => {
    test("shows a single Max-3 die-slot", async ({ page }) => {
      const slots = page.locator(".equipment-card").nth(1).locator(".equipment-card__slots > *");
      await expect(slots).toHaveCount(1);
      await expect(slots.nth(0)).toHaveClass(/die-slot--max/);
      await expect(slots.nth(0).locator(".die-slot__label")).toHaveText("MAX");
      await expect(slots.nth(0).locator(".die-slot__value")).toHaveText("3");
    });

    test("effect text reads correctly", async ({ page }) => {
      const effect = page.locator(".equipment-card").nth(1).locator(".equipment-card__effect");
      await expect(effect).toContainText("shield");
      await expect(effect.locator("svg.glyph")).toHaveCount(1);
    });
  });
});
