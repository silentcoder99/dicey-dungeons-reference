// The site root: two cards, one per reference section. Static HTML, so there is nothing to render
// -- these assertions are about the links being right and the round-trip back working.
const { test, expect } = require("@playwright/test");
const { pageUrl } = require("./helpers");

const SECTIONS = [
  { href: "enemies.html", title: "Enemies" },
  { href: "equipment.html", title: "Equipment" },
];

test.describe("Home page", () => {
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
  });

  test("has no console or page errors, and loads no external resources", async () => {
    expect(consoleErrors).toEqual([]);
    expect(requests.filter((url) => !url.startsWith("file://"))).toEqual([]);
  });

  test("offers exactly the two reference sections, in order", async ({ page }) => {
    const cards = page.locator(".home-menu__card");
    await expect(cards).toHaveCount(SECTIONS.length);
    for (const [i, section] of SECTIONS.entries()) {
      await expect(cards.nth(i)).toHaveAttribute("href", section.href);
      await expect(cards.nth(i).locator(".home-menu__title")).toHaveText(section.title);
      await expect(cards.nth(i).locator(".home-menu__hint")).not.toBeEmpty();
    }
  });

  test("every card leads to a page whose back-link returns home", async ({ page }) => {
    for (const section of SECTIONS) {
      await page.locator(`.home-menu__card[href="${section.href}"]`).click();
      await expect(page).toHaveURL(pageUrl(section.href));
      await expect(page.locator(".picker-title")).toHaveText(section.title);

      await page.locator(".back-link").click();
      await expect(page).toHaveURL(pageUrl("index.html"));
    }
  });
});
