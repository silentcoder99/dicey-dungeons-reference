// Structural/content assertions against the actually-rendered enemy pages.
const { test, expect } = require("@playwright/test");
const { pageUrl, EQUIPMENT, ENEMIES, ENEMY_IDS, pageEquipment, expectedEffectText } = require("./helpers");

// Opens a page, recording console/page errors and every requested URL.
async function openEnemyPage(page, enemyId) {
  const consoleErrors = [];
  const requests = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("request", (req) => requests.push(req.url()));

  await page.goto(pageUrl(`enemies/${enemyId}.html`));
  await page.waitForSelector(".equipment-section");
  return { consoleErrors, requests };
}

test.describe("Every enemy page", () => {
  for (const enemyId of ENEMY_IDS) {
    const enemy = ENEMIES[enemyId];
    const cardIds = pageEquipment(enemy);

    test(`${enemy.name}: renders its data with no errors or external requests`, async ({
      page,
    }) => {
      const { consoleErrors, requests } = await openEnemyPage(page, enemyId);

      await expect(page.locator(".enemy-header__name")).toHaveText(enemy.name);
      const stats = page.locator(".enemy-header__stats .stat");
      await expect(stats.nth(0).locator("dd")).toHaveText(`×${enemy.diceCount}`);
      await expect(stats.nth(1).locator("dd")).toHaveText(String(enemy.hp));
      await expect(page.locator(".enemy-header__innate p")).toHaveText(
        enemy.innateEffects.length ? enemy.innateEffects.join(", ") : "None"
      );

      const sections = page.locator(".equipment-section");
      const groups = [
        { heading: "Equipment", equipment: enemy.equipment, note: enemy.equipmentNote },
        ...(enemy.extraEquipment || []),
      ];
      await expect(sections).toHaveCount(groups.length);
      for (const [i, group] of groups.entries()) {
        await expect(sections.nth(i).locator("h2")).toHaveText(group.heading);
        await expect(sections.nth(i).locator(".equipment-card")).toHaveCount(group.equipment.length);
        await expect(sections.nth(i).locator(".equipment-section__note")).toHaveCount(group.note ? 1 : 0);
        if (group.note) {
          await expect(sections.nth(i).locator(".equipment-section__note")).toHaveText(group.note);
        }
      }

      const cards = page.locator(".equipment-card");
      await expect(cards).toHaveCount(cardIds.length);
      for (const [i, equipmentId] of cardIds.entries()) {
        const equipment = EQUIPMENT[equipmentId];
        await expect(cards.nth(i).locator(".equipment-card__header")).toHaveText(equipment.name);
        await expect(cards.nth(i).locator(".equipment-card__effect")).toHaveText(
          expectedEffectText(equipment.effect)
        );
      }

      await expect(page.locator('a.back-link[href="../enemies.html"]')).toHaveCount(1);

      expect(consoleErrors).toEqual([]);
      expect(requests.filter((url) => !url.startsWith("file://"))).toEqual([]);
    });

    // Cards have a fixed aspect ratio and clip overflow, so content that doesn't fit would be
    // cut off silently rather than growing the card.
    test(`${enemy.name}: every card has its size's aspect ratio and its content fits`, async ({
      page,
    }) => {
      await openEnemyPage(page, enemyId);
      const cards = await page.evaluate(() =>
        [...document.querySelectorAll(".equipment-card")].map((card) => {
          const box = (r) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
          const header = card.querySelector(".equipment-card__header");
          const effect = card.querySelector(".equipment-card__effect");
          const range = document.createRange();
          range.selectNodeContents(effect);
          const textRects = [...range.getClientRects()];
          const halfLine = parseFloat(getComputedStyle(effect).lineHeight) / 2;
          const lineCentres = [];
          for (const c of textRects.map((r) => r.top + r.height / 2).sort((a, b) => a - b)) {
            if (!lineCentres.length || c - lineCentres[lineCentres.length - 1] > halfLine) {
              lineCentres.push(c);
            }
          }
          const cardRect = card.getBoundingClientRect();
          return {
            ratio: cardRect.width / cardRect.height,
            titleOverflow: header.scrollWidth - header.clientWidth,
            lines: lineCentres.length,
            body: box(card.querySelector(".equipment-card__body").getBoundingClientRect()),
            slots: box(card.querySelector(".equipment-card__slots").getBoundingClientRect()),
            text: box({
              top: Math.min(...textRects.map((r) => r.top)),
              bottom: Math.max(...textRects.map((r) => r.bottom)),
              left: Math.min(...textRects.map((r) => r.left)),
              right: Math.max(...textRects.map((r) => r.right)),
            }),
          };
        })
      );

      const RATIOS = { 1: 1.316, 2: 0.882 };
      const inside = (inner, outer) =>
        inner.top >= outer.top - 0.5 &&
        inner.bottom <= outer.bottom + 0.5 &&
        inner.left >= outer.left - 0.5 &&
        inner.right <= outer.right + 0.5;

      for (const [i, equipmentId] of cardIds.entries()) {
        const equipment = EQUIPMENT[equipmentId];
        const card = cards[i];
        const label = `${equipment.name} card`;
        expect(Math.abs(card.ratio / RATIOS[equipment.size] - 1), `${label} aspect ratio`).toBeLessThan(0.01);
        expect(card.titleOverflow, `${label} title overflows`).toBeLessThanOrEqual(0);
        const breaks = equipment.effect.filter((t) => t.type === "lineBreak").length;
        expect(card.lines, `${label} effect wraps onto extra lines`).toBe(breaks + 1);
        expect(inside(card.slots, card.body), `${label} slots inside body`).toBe(true);
        expect(inside(card.text, card.body), `${label} effect text inside body`).toBe(true);
        expect(card.slots.bottom, `${label} slots overlap effect text`).toBeLessThanOrEqual(card.text.top);
      }
    });
  }
});

test.describe("Frog page", () => {
  test.beforeEach(async ({ page }) => {
    await openEnemyPage(page, "frog");
  });

  test("shows dice count as a die-face icon (not the dashed die-slot) followed by ×N", async ({
    page,
  }) => {
    const diceStat = page.locator(".enemy-header__stats .stat").first();
    await expect(diceStat.locator("dd")).toContainText("×2");
    await expect(diceStat.locator(".die-face")).toHaveCount(1);
    await expect(diceStat.locator(".die-slot")).toHaveCount(0);
  });

  test('shows "None" for innate effects', async ({ page }) => {
    const innate = page.locator(".enemy-header__innate p");
    await expect(innate).toHaveText("None");
    await expect(innate).toHaveClass(/none/);
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
      await expect(effect.locator("svg.glyph--sword")).toHaveCount(1);
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
      await expect(effect.locator("svg.glyph--shield")).toHaveCount(1);
    });
  });
});

test.describe("Magician page", () => {
  test.beforeEach(async ({ page }) => {
    await openEnemyPage(page, "magician");
  });

  test.describe("Magic Missile card", () => {
    test("shows a single EVEN die-slot with no value", async ({ page }) => {
      const slots = page.locator(".equipment-card").first().locator(".equipment-card__slots > *");
      await expect(slots).toHaveCount(1);
      await expect(slots.nth(0)).toHaveClass(/die-slot--even/);
      await expect(slots.nth(0).locator(".die-slot__label")).toHaveText("EVEN");
      await expect(slots.nth(0).locator(".die-slot__value")).toHaveCount(0);
    });

    test("effect is a fixed number after a sword, with no mini die-slot", async ({ page }) => {
      const effect = page.locator(".equipment-card").first().locator(".equipment-card__effect");
      await expect(effect.locator("svg.glyph--sword")).toHaveCount(1);
      await expect(effect.locator(".effect-value--sword")).toHaveText("5");
      await expect(effect.locator(".die-slot--mini")).toHaveCount(0);
    });
  });

  test.describe("Magic Shield card", () => {
    test("shows a single ODD die-slot with no value", async ({ page }) => {
      const slots = page.locator(".equipment-card").nth(1).locator(".equipment-card__slots > *");
      await expect(slots).toHaveCount(1);
      await expect(slots.nth(0)).toHaveClass(/die-slot--odd/);
      await expect(slots.nth(0).locator(".die-slot__label")).toHaveText("ODD");
      await expect(slots.nth(0).locator(".die-slot__value")).toHaveCount(0);
    });

    test("effect is a fixed shield value, tinted like its icon", async ({ page }) => {
      const effect = page.locator(".equipment-card").nth(1).locator(".equipment-card__effect");
      const glyph = effect.locator("svg.glyph--shield");
      const value = effect.locator(".effect-value--shield");
      await expect(value).toHaveText("3");
      await expect(glyph).toHaveCSS("color", "rgb(247, 160, 111)");
      await expect(value).toHaveCSS("color", "rgb(247, 160, 111)");
    });
  });
});

test.describe("Hothead page", () => {
  test.beforeEach(async ({ page }) => {
    await openEnemyPage(page, "hothead");
  });

  test("lists its innate effect instead of None", async ({ page }) => {
    const innate = page.locator(".enemy-header__innate p");
    await expect(innate).toHaveText("Weak to ice");
    await expect(innate).not.toHaveClass(/none/);
  });

  test.describe("Fireball card", () => {
    test("shows a single EVEN die-slot", async ({ page }) => {
      const slots = page.locator(".equipment-card").first().locator(".equipment-card__slots > *");
      await expect(slots).toHaveCount(1);
      await expect(slots.nth(0)).toHaveClass(/die-slot--even/);
    });

    test("effect spans two lines with fire icons for the damage and the burn", async ({ page }) => {
      const effect = page.locator(".equipment-card").first().locator(".equipment-card__effect");
      await expect(effect.locator("br")).toHaveCount(1);
      await expect(effect.locator("svg.glyph--fire")).toHaveCount(2);
      await expect(effect.locator(".die-slot--mini")).toHaveCount(1);
      await expect(effect.locator(".effect-value--fire")).toHaveText("1");
      await expect(effect.locator("svg.glyph--fire").first()).toHaveCSS("color", "rgb(253, 94, 108)");
    });
  });
});

test.describe("Space Marine page", () => {
  test("Plasma Cannon's countdown slot is solid, accent-bordered, and uses its own fill", async ({
    page,
  }) => {
    await openEnemyPage(page, "spaceMarine");
    const slot = page.locator(".equipment-card").first().locator(".die-slot--countdown");
    await expect(slot.locator(".die-slot__value")).toHaveText("20");
    await expect(slot).toHaveCSS("border-top-style", "solid");
    await expect(slot).toHaveCSS("border-top-color", "rgb(253, 94, 108)");
    await expect(slot).toHaveCSS("background-color", "rgb(172, 44, 56)");
  });
});
