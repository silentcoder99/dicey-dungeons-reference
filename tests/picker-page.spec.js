// Structural assertions against the enemy picker (index.html), plus navigation to and from it.
const { test, expect } = require("@playwright/test");
const { pageUrl, ENEMIES, ENEMY_IDS } = require("./helpers");

test.describe("Enemy picker", () => {
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

    await page.goto(pageUrl("index.html"));
    await page.waitForSelector(".enemy-picker__card");
  });

  test("has no console or page errors, and loads no external resources", async () => {
    expect(consoleErrors).toEqual([]);
    expect(requests.filter((url) => !url.startsWith("file://"))).toEqual([]);
  });

  test("links to every enemy page, in data order, labelled with its name", async ({ page }) => {
    const cards = page.locator(".enemy-picker__card");
    await expect(cards).toHaveCount(ENEMY_IDS.length);
    for (const [i, enemyId] of ENEMY_IDS.entries()) {
      await expect(cards.nth(i)).toHaveAttribute("href", `enemies/${enemyId}.html`);
      await expect(cards.nth(i)).toHaveText(ENEMIES[enemyId].name);
    }
  });

  test("every link leads to an enemy page whose back-link returns to the picker", async ({
    page,
  }) => {
    for (const enemyId of ENEMY_IDS) {
      await page.locator(`.enemy-picker__card[href="enemies/${enemyId}.html"]`).click();
      await expect(page).toHaveURL(pageUrl(`enemies/${enemyId}.html`));
      await expect(page.locator(".enemy-header__name")).toHaveText(ENEMIES[enemyId].name);

      await page.locator(".back-link").click();
      await expect(page).toHaveURL(pageUrl("index.html"));
      await page.waitForSelector(".enemy-picker__card");
    }
  });
});
