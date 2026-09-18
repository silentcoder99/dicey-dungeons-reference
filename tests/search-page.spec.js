// The equipment search page: the project's first interactive control, so as well as the usual
// structure checks these cover filtering, the empty state and the live result count.
const { test, expect } = require("@playwright/test");
const { pageUrl, EQUIPMENT, EQUIPMENT_IDS } = require("./helpers");

// One representative of each thing that can differ between equipment pages, rather than clicking
// all 122 -- the full link list is asserted separately, and a 122-page round-trip would dominate
// the suite's runtime.
const ROUND_TRIP = [
  EQUIPMENT_IDS[0],
  EQUIPMENT_IDS[EQUIPMENT_IDS.length - 1],
  EQUIPMENT_IDS.find((id) => EQUIPMENT[id].size === 1),
  EQUIPMENT_IDS.find((id) => EQUIPMENT[id].size === 2),
  EQUIPMENT_IDS.find((id) => EQUIPMENT[id].upgrade.size !== undefined),
];

test.describe("Equipment search", () => {
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

    await page.goto(pageUrl("equipment.html"));
    await page.waitForSelector(".equipment-picker__card");
  });

  test("has no console or page errors, and loads no external resources", async () => {
    expect(consoleErrors).toEqual([]);
    expect(requests.filter((url) => !url.startsWith("file://"))).toEqual([]);
  });

  test("back-link returns to the site root", async ({ page }) => {
    await expect(page.locator(".back-link")).toHaveAttribute("href", "index.html");
  });

  test("lists every equipment exactly once, in data order", async ({ page }) => {
    const cards = page.locator(".equipment-picker__card");
    await expect(cards).toHaveCount(EQUIPMENT_IDS.length);
    const hrefs = await cards.evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    expect(hrefs).toEqual(EQUIPMENT_IDS.map((id) => `equipment/${id}.html`));
    const names = await cards.evaluateAll((links) => links.map((l) => l.textContent));
    expect(names).toEqual(EQUIPMENT_IDS.map((id) => EQUIPMENT[id].name));
  });

  test("shows everything, and a count, before anything is typed", async ({ page }) => {
    await expect(page.locator(".equipment-picker__card")).toHaveCount(EQUIPMENT_IDS.length);
    await expect(page.locator(".equipment-search__status")).toHaveText(
      `${EQUIPMENT_IDS.length} of ${EQUIPMENT_IDS.length} shown`
    );
  });

  test("filters by name on a case-insensitive substring, and restores on clearing", async ({
    page,
  }) => {
    const input = page.locator("#equipment-search-input");
    const visible = page.locator(".equipment-picker__card:visible");

    for (const query of ["axe", "AXE", "Axe"]) {
      await input.fill(query);
      const expected = EQUIPMENT_IDS.filter((id) => EQUIPMENT[id].name.toLowerCase().includes("axe"));
      await expect(visible).toHaveCount(expected.length);
      await expect(visible.first()).toHaveText(EQUIPMENT[expected[0]].name);
    }

    // Matches anywhere in the name, not just at the start.
    await input.fill("crystal");
    const crystals = EQUIPMENT_IDS.filter((id) =>
      EQUIPMENT[id].name.toLowerCase().includes("crystal")
    );
    expect(crystals.length).toBeGreaterThan(1);
    await expect(visible).toHaveCount(crystals.length);
    await expect(page.locator(".equipment-search__status")).toHaveText(
      `${crystals.length} of ${EQUIPMENT_IDS.length} shown`
    );

    await input.fill("");
    await expect(visible).toHaveCount(EQUIPMENT_IDS.length);
  });

  test("says so when nothing matches, and shows no stale results", async ({ page }) => {
    await page.locator("#equipment-search-input").fill("zzzznope");
    await expect(page.locator(".equipment-picker__card:visible")).toHaveCount(0);
    await expect(page.locator(".equipment-search__status")).toHaveText(
      'No equipment matches "zzzznope".'
    );
  });

  test("each link leads to that equipment's page, whose back-link returns to the search", async ({
    page,
  }) => {
    for (const equipmentId of ROUND_TRIP) {
      await page.locator(`.equipment-picker__card[href="equipment/${equipmentId}.html"]`).click();
      await expect(page).toHaveURL(pageUrl(`equipment/${equipmentId}.html`));
      await expect(page.locator(".equipment-page__name")).toHaveText(EQUIPMENT[equipmentId].name);

      await page.locator(".back-link").click();
      await expect(page).toHaveURL(pageUrl("equipment.html"));
      await page.waitForSelector(".equipment-picker__card");
    }
  });
});
