// Every equipment page, checked against js/data.js the way page.spec.js checks the enemy pages:
// the regular card matches the base entry, the upgraded one matches the entry with its `upgrade`
// override applied, and both fit their card.
const { test, expect } = require("@playwright/test");
const {
  pageUrl,
  EQUIPMENT,
  EQUIPMENT_IDS,
  expectedEffectText,
  resolveUpgrade,
} = require("./helpers");

const RATIOS = { 1: 1.316, 2: 0.882 };

// Geometry of both cards, measured the same way page.spec.js measures an enemy page's cards.
const measureCards = () =>
  [...document.querySelectorAll(".equipment-card")].map((card) => {
    const box = (r) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
    const header = card.querySelector(".equipment-card__header");
    const effect = card.querySelector(".equipment-card__effect");
    const range = document.createRange();
    range.selectNodeContents(effect);
    const rects = [...range.getClientRects()];
    const halfLine = parseFloat(getComputedStyle(effect).lineHeight) / 2;
    const lineCentres = [];
    for (const c of rects.map((r) => r.top + r.height / 2).sort((a, b) => a - b)) {
      if (!lineCentres.length || c - lineCentres[lineCentres.length - 1] > halfLine) {
        lineCentres.push(c);
      }
    }
    const rect = card.getBoundingClientRect();
    return {
      ratio: rect.width / rect.height,
      titleOverflow: header.scrollWidth - header.clientWidth,
      lines: lineCentres.length,
      body: box(card.querySelector(".equipment-card__body").getBoundingClientRect()),
      slots: box(card.querySelector(".equipment-card__slots").getBoundingClientRect()),
      text: box({
        top: Math.min(...rects.map((r) => r.top)),
        bottom: Math.max(...rects.map((r) => r.bottom)),
        left: Math.min(...rects.map((r) => r.left)),
        right: Math.max(...rects.map((r) => r.right)),
      }),
    };
  });

const inside = (inner, outer) =>
  inner.top >= outer.top - 0.5 &&
  inner.bottom <= outer.bottom + 0.5 &&
  inner.left >= outer.left - 0.5 &&
  inner.right <= outer.right + 0.5;

test.describe("Every equipment page", () => {
  for (const equipmentId of EQUIPMENT_IDS) {
    const base = EQUIPMENT[equipmentId];
    const upgraded = resolveUpgrade(equipmentId);

    test(`${base.name}: shows its regular and upgraded cards with no errors`, async ({ page }) => {
      const consoleErrors = [];
      const requests = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(String(err)));
      page.on("request", (req) => requests.push(req.url()));

      await page.goto(pageUrl(`equipment/${equipmentId}.html`));
      await page.waitForSelector(".equipment-card");

      expect(consoleErrors).toEqual([]);
      expect(requests.filter((url) => !url.startsWith("file://"))).toEqual([]);

      await expect(page.locator(".equipment-page__name")).toHaveText(base.name);
      await expect(page.locator(".back-link")).toHaveAttribute("href", "../equipment.html");

      const sides = page.locator(".upgrade-pair__side");
      await expect(sides).toHaveCount(2);
      await expect(sides.nth(0).locator(".upgrade-pair__heading")).toHaveText("Regular");
      await expect(sides.nth(1).locator(".upgrade-pair__heading")).toHaveText("Upgraded");

      const cards = page.locator(".equipment-card");
      await expect(cards).toHaveCount(2);
      for (const [i, want] of [base, upgraded].entries()) {
        const card = cards.nth(i);
        await expect(card.locator(".equipment-card__header")).toHaveText(want.name);
        await expect(card.locator(".equipment-card__effect")).toHaveText(expectedEffectText(want.effect));
      }

      // Only the upgraded card wears the ribbon, and its name is the base's plus "+".
      await expect(cards.nth(0).locator(".upgrade-ribbon")).toHaveCount(0);
      await expect(cards.nth(1).locator(".upgrade-ribbon")).toHaveCount(1);
      expect(upgraded.name).toBe(`${base.name}+`);
    });

    test(`${base.name}: both cards have their size's aspect ratio and their content fits`, async ({
      page,
    }) => {
      await page.goto(pageUrl(`equipment/${equipmentId}.html`));
      await page.waitForSelector(".equipment-card");
      const cards = await page.evaluate(measureCards);

      for (const [i, want] of [base, upgraded].entries()) {
        const card = cards[i];
        const label = `${want.name} (${i ? "upgraded" : "regular"})`;
        expect(Math.abs(card.ratio / RATIOS[want.size] - 1), `${label} aspect ratio`).toBeLessThan(0.01);
        expect(card.titleOverflow, `${label} title overflows`).toBeLessThanOrEqual(0);
        const breaks = want.effect.filter((t) => t.type === "lineBreak").length;
        expect(card.lines, `${label} effect wraps onto extra lines`).toBe(breaks + 1);
        expect(inside(card.slots, card.body), `${label} slots inside body`).toBe(true);
        expect(inside(card.text, card.body), `${label} effect text inside body`).toBe(true);
        expect(card.slots.bottom, `${label} slots overlap effect text`).toBeLessThanOrEqual(card.text.top);
      }
    });
  }
});

// A condition a card prints outside its own frame lives in the entry's `note` and is shown under
// the pair, not on the card -- so the card can't be read as saying something the art doesn't.
test.describe("A card's note", () => {
  test("every entry with a note shows it under the pair, and no other page has one", async ({
    page,
  }) => {
    const withNote = EQUIPMENT_IDS.filter((id) => EQUIPMENT[id].note);
    expect(withNote.length, "some entry carries a note").toBeGreaterThan(0);

    for (const id of withNote) {
      await page.goto(pageUrl(`equipment/${id}.html`));
      await page.waitForSelector(".equipment-card");
      await expect(page.locator(".upgrade-pair__note--condition")).toHaveText(EQUIPMENT[id].note);
      // The note belongs to the page, not to either card.
      await expect(page.locator(".equipment-card .upgrade-pair__note--condition")).toHaveCount(0);
    }

    const without = EQUIPMENT_IDS.find((id) => !EQUIPMENT[id].note);
    await page.goto(pageUrl(`equipment/${without}.html`));
    await page.waitForSelector(".equipment-card");
    await expect(page.locator(".upgrade-pair__note--condition")).toHaveCount(0);
  });
});

test.describe("Upgrades that change the card's shape or sockets", () => {
  test("Battle Axe+ is a size-1 card where Battle Axe is size 2", async ({ page }) => {
    await page.goto(pageUrl("equipment/battleAxe.html"));
    await page.waitForSelector(".equipment-card");
    const cards = page.locator(".equipment-card");
    await expect(cards.nth(0)).toHaveClass(/equipment-card--size-2/);
    await expect(cards.nth(1)).toHaveClass(/equipment-card--size-1/);
  });

  test("Snowball+ gains a 1-pip die-face beside its slot", async ({ page }) => {
    await page.goto(pageUrl("equipment/snowball.html"));
    await page.waitForSelector(".equipment-card");
    const slots = (i) => page.locator(".equipment-card").nth(i).locator(".equipment-card__slots > *");
    await expect(slots(0)).toHaveCount(1);
    await expect(slots(1)).toHaveCount(2);
    await expect(slots(1).nth(1)).toHaveClass(/die-face/);
    await expect(slots(1).nth(1).locator(".die-face__pip")).toHaveCount(1);
  });

  test("Ice Age+ swaps its two Require-1 sockets for a doubles pair", async ({ page }) => {
    await page.goto(pageUrl("equipment/iceAge.html"));
    await page.waitForSelector(".equipment-card");
    const cards = page.locator(".equipment-card");
    await expect(cards.nth(0).locator(".slot-group--exact")).toHaveCount(2);
    await expect(cards.nth(1).locator(".slot-group--doubles")).toHaveCount(1);
    await expect(cards.nth(1).locator(".slot-group__caption")).toHaveText("NEEDS DOUBLES");
  });

  test("Tower Shield+ drops its requirement, leaving an empty socket", async ({ page }) => {
    await page.goto(pageUrl("equipment/towerShield.html"));
    await page.waitForSelector(".equipment-card");
    const slot = (i) => page.locator(".equipment-card").nth(i).locator(".die-slot").first();
    await expect(slot(0)).toHaveClass(/die-slot--max/);
    await expect(slot(1)).not.toHaveClass(/die-slot--max/);
    await expect(slot(1)).toBeEmpty();
  });
});
