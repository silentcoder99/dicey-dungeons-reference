// Structural assertions against the enemy picker (index.html), plus navigation to and from it.
const { test, expect } = require("@playwright/test");
const { pageUrl, ENEMIES, ENEMY_IDS, PICKER_GROUPS } = require("./helpers");

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

  test("groups enemies into headed sections by level, then bosses, split by dividers", async ({
    page,
  }) => {
    const sections = page.locator("#picker-root > .picker-group");
    await expect(sections).toHaveCount(PICKER_GROUPS.length);
    await expect(page.locator("#picker-root > hr.picker-divider")).toHaveCount(
      PICKER_GROUPS.length - 1
    );
    // Dividers sit only between sections: section, hr, section, hr, ..., section.
    const children = await page
      .locator("#picker-root > :not(h1)")
      .evaluateAll((els) => els.map((el) => el.tagName.toLowerCase()));
    expect(children).toEqual(PICKER_GROUPS.flatMap((_, i) => (i ? ["hr", "section"] : ["section"])));

    for (const [i, group] of PICKER_GROUPS.entries()) {
      const section = sections.nth(i);
      const heading = section.locator("h2.picker-group__heading");
      await expect(heading).toHaveText(group.heading);
      await expect(heading).toHaveAttribute("id", `picker-group-${group.id}`);
      await expect(section).toHaveAttribute("aria-labelledby", `picker-group-${group.id}`);

      const cards = section.locator(".enemy-picker__card");
      await expect(cards).toHaveCount(group.enemyIds.length);
      for (const [j, enemyId] of group.enemyIds.entries()) {
        await expect(cards.nth(j)).toHaveAttribute("href", `enemies/${enemyId}.html`);
        await expect(cards.nth(j)).toHaveText(ENEMIES[enemyId].name);
      }
    }
  });

  test("links to every enemy page exactly once", async ({ page }) => {
    const hrefs = await page
      .locator(".enemy-picker__card")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect([...hrefs].sort()).toEqual(ENEMY_IDS.map((id) => `enemies/${id}.html`).sort());
  });

  test("every link leads to an enemy page whose back-link returns to the picker", async ({
    page,
  }) => {
    test.setTimeout(ENEMY_IDS.length * 2000);
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
