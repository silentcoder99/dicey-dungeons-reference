// Every equipment page, checked against js/data.js the way page.spec.js checks the enemy pages:
// the regular card matches the base entry, the upgraded one matches the entry with its `upgrade`
// override applied, the weakened one with its `weaken`, and all three fit their card.
const { test, expect } = require("@playwright/test");
const {
  pageUrl,
  EQUIPMENT,
  EQUIPMENT_IDS,
  expectedEffectText,
  resolveUpgrade,
  resolveWeaken,
  dulled,
} = require("./helpers");

const RATIOS = { 1: 1.316, 2: 0.882 };

// Geometry of all three cards, measured the same way page.spec.js measures an enemy page's cards.
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
      // A "NEEDS N" caption is positioned absolutely so the socket above it stays where the art
      // puts it, which also keeps it out of .equipment-card__slots' own box -- so the slot
      // measurements above cannot see it, and a caption landing on the row below or on the effect
      // text goes unnoticed (Ice Age-'s four captioned sockets did exactly that).
      captions: [...card.querySelectorAll(".slot-group__caption")].map((c) =>
        box(c.getBoundingClientRect())
      ),
      sockets: [...card.querySelectorAll(".die-slot")].map((c) => box(c.getBoundingClientRect())),
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

const overlaps = (a, b) =>
  a.left < b.right - 0.5 &&
  a.right > b.left + 0.5 &&
  a.top < b.bottom - 0.5 &&
  a.bottom > b.top + 0.5;

test.describe("Every equipment page", () => {
  for (const equipmentId of EQUIPMENT_IDS) {
    const base = EQUIPMENT[equipmentId];
    const upgraded = resolveUpgrade(equipmentId);
    const weakened = resolveWeaken(equipmentId);

    test(`${base.name}: shows its regular, upgraded and weakened cards with no errors`, async ({
      page,
    }) => {
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
      await expect(sides).toHaveCount(3);
      await expect(sides.nth(0).locator(".upgrade-pair__heading")).toHaveText("Regular");
      await expect(sides.nth(1).locator(".upgrade-pair__heading")).toHaveText("Upgraded");
      await expect(sides.nth(2).locator(".upgrade-pair__heading")).toHaveText("Weakened");

      // One arrow, regular -> upgraded; the weakened card follows from the regular one, so it sits
      // past a divider rather than at the end of the arrow.
      await expect(page.locator(".upgrade-pair__arrow")).toHaveCount(1);
      await expect(page.locator(".upgrade-pair__divider")).toHaveCount(1);

      const cards = page.locator(".equipment-card");
      await expect(cards).toHaveCount(3);
      for (const [i, want] of [base, upgraded, weakened].entries()) {
        const card = cards.nth(i);
        await expect(card.locator(".equipment-card__header")).toHaveText(want.name);
        await expect(card.locator(".equipment-card__effect")).toHaveText(expectedEffectText(want.effect));
      }

      // Only the upgraded card wears the ribbon -- it is upgrade art, and a weakened card has none
      // of its own yet. The suffixes are the renderer's, not the data's.
      await expect(cards.nth(0).locator(".upgrade-ribbon")).toHaveCount(0);
      await expect(cards.nth(1).locator(".upgrade-ribbon")).toHaveCount(1);
      await expect(cards.nth(2).locator(".upgrade-ribbon")).toHaveCount(0);
      expect(upgraded.name).toBe(`${base.name}+`);
      expect(weakened.name).toBe(`${base.name}-`);

      // The weakened card's placeholder treatment: the entry's own colors, drained. The other two
      // keep them as sampled.
      const colors = await cards.evaluateAll((els) =>
        els.map((el) => ({
          accent: el.style.getPropertyValue("--card-accent"),
          body: el.style.getPropertyValue("--card-body"),
        }))
      );
      expect(colors[0]).toEqual({ accent: base.color.header, body: base.color.body });
      expect(colors[1]).toEqual(colors[0]);
      expect(colors[2]).toEqual({
        accent: dulled(base.color.header),
        body: dulled(base.color.body),
      });
    });

    test(`${base.name}: every card has its size's aspect ratio and its content fits`, async ({
      page,
    }) => {
      await page.goto(pageUrl(`equipment/${equipmentId}.html`));
      await page.waitForSelector(".equipment-card");
      const cards = await page.evaluate(measureCards);

      const forms = ["regular", "upgraded", "weakened"];
      for (const [i, want] of [base, upgraded, weakened].entries()) {
        const card = cards[i];
        const label = `${want.name} (${forms[i]})`;
        expect(Math.abs(card.ratio / RATIOS[want.size] - 1), `${label} aspect ratio`).toBeLessThan(0.01);
        expect(card.titleOverflow, `${label} title overflows`).toBeLessThanOrEqual(0);
        const breaks = want.effect.filter((t) => t.type === "lineBreak").length;
        expect(card.lines, `${label} effect wraps onto extra lines`).toBe(breaks + 1);
        expect(inside(card.slots, card.body), `${label} slots inside body`).toBe(true);
        expect(inside(card.text, card.body), `${label} effect text inside body`).toBe(true);
        expect(card.slots.bottom, `${label} slots overlap effect text`).toBeLessThanOrEqual(card.text.top);
        for (const caption of card.captions) {
          expect(inside(caption, card.body), `${label} caption inside body`).toBe(true);
          expect(caption.bottom, `${label} caption overlaps effect text`).toBeLessThanOrEqual(
            card.text.top
          );
          const hit = card.sockets.findIndex((socket) => overlaps(caption, socket));
          expect(hit, `${label} caption overlaps socket ${hit}`).toBe(-1);
        }
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

test.describe("Weakenings that change the card's sockets or effect", () => {
  test("Ice Age- needs four 1s where Ice Age needs two", async ({ page }) => {
    await page.goto(pageUrl("equipment/iceAge.html"));
    await page.waitForSelector(".equipment-card");
    const cards = page.locator(".equipment-card");
    await expect(cards.nth(0).locator(".slot-group--exact")).toHaveCount(2);
    await expect(cards.nth(2).locator(".slot-group--exact")).toHaveCount(4);
  });

  test("Spanner- puts a Max 3 on both of Spanner's empty sockets", async ({ page }) => {
    await page.goto(pageUrl("equipment/spanner.html"));
    await page.waitForSelector(".equipment-card");
    const slots = (i) => page.locator(".equipment-card").nth(i).locator(".die-slot");
    await expect(slots(0)).toHaveCount(2);
    await expect(slots(0).nth(0)).not.toHaveClass(/die-slot--max/);
    await expect(slots(2)).toHaveCount(2);
    await expect(slots(2).nth(0)).toHaveClass(/die-slot--max/);
    await expect(slots(2).nth(1)).toHaveClass(/die-slot--max/);
  });

  // The wiki lists no weakened form at all for this one, which is not the same as nobody having
  // authored it -- the page says so rather than showing two cards that look like a bug.
  test("Mystery Box says outright that weakening changes nothing", async ({ page }) => {
    await page.goto(pageUrl("equipment/mysteryBox.html"));
    await page.waitForSelector(".equipment-card");
    await expect(page.locator(".upgrade-pair__note")).toHaveText("Weakening doesn't change this card.");
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
