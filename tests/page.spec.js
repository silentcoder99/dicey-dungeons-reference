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

    // Each card is a link to its equipment page. The link wraps the card rather than replacing it,
    // and takes over the flex basis the card had as a grid item, so the card's box must come out
    // exactly as it did unwrapped -- every card snapshot is cropped from one of these grids.
    test(`${enemy.name}: every card links to its equipment page`, async ({ page }) => {
      await openEnemyPage(page, enemyId);

      const links = page.locator(".equipment-card-link");
      await expect(links).toHaveCount(cardIds.length);

      // Page order, duplicates included: Slime carries two Slime Balls, and 17 other enemies
      // repeat a card. The path is built here rather than in helpers.js so the expectation stays
      // independent of render.js, the way PICKER_GROUPS and resolveUpgrade are.
      const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
      expect(hrefs).toEqual(cardIds.map((id) => `../equipment/${id}.html`));

      const labels = await links.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
      expect(labels).toEqual(cardIds.map((id) => EQUIPMENT[id].name));

      const boxes = await page.evaluate(() =>
        [...document.querySelectorAll(".equipment-card")].map((card) => {
          const link = card.parentElement;
          const c = card.getBoundingClientRect();
          const l = link.getBoundingClientRect();
          return {
            wrapped: link.matches("a.equipment-card-link"),
            dx: l.x - c.x,
            dy: l.y - c.y,
            dw: l.width - c.width,
            dh: l.height - c.height,
            width: c.width,
          };
        })
      );

      for (const [i, equipmentId] of cardIds.entries()) {
        const label = `${EQUIPMENT[equipmentId].name} card`;
        const box = boxes[i];
        expect(box.wrapped, `${label} is wrapped in a link`).toBe(true);
        for (const edge of ["dx", "dy", "dw", "dh"]) {
          expect(box[edge], `${label} box moved (${edge}) inside its link`).toBe(0);
        }
        // The canary behind the claim above: at this project's viewport every card is clamped to
        // its own max-width, so the flex line has spare room and no item's width depends on how
        // many share its row. Change .page's max-width, the grid gap or the viewport and this
        // fails -- that is the point; check the reasoning still holds before updating the number.
        expect(box.width, `${label} is not at its max-width`).toBe(260);
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

test.describe("Card links", () => {
  // Keymaster is the enemy with a second, headed section, so this covers both the main Equipment
  // grid and an extraEquipment one.
  test("Keymaster: a card in each section opens that equipment's page", async ({ page }) => {
    for (const equipmentId of ["lock1", "keyblade"]) {
      await openEnemyPage(page, "keymaster");
      await page.locator(`.equipment-card-link[href="../equipment/${equipmentId}.html"]`).first().click();
      await expect(page).toHaveURL(pageUrl(`equipment/${equipmentId}.html`));
      await expect(page.locator(".equipment-page__name")).toHaveText(EQUIPMENT[equipmentId].name);
      // Arriving from an enemy doesn't change where the back-link goes; the browser's Back button
      // is the way back to the enemy.
      await expect(page.locator("a.back-link")).toHaveAttribute("href", "../equipment.html");

      await page.goBack();
      // goBack may restore from the bfcache without re-running DOMContentLoaded, so wait on the
      // rendered link rather than assuming a fresh render.
      await page.waitForSelector(".equipment-card-link");
      await expect(page).toHaveURL(pageUrl("enemies/keymaster.html"));
    }
  });

  test("Slime: both copies of a repeated card link to the same page", async ({ page }) => {
    await openEnemyPage(page, "slime");
    const links = page.locator(".equipment-card-link");
    await expect(links).toHaveCount(2);
    await links.nth(1).click();
    await expect(page).toHaveURL(pageUrl("equipment/slimeBall.html"));
    await expect(page.locator(".equipment-page__name")).toHaveText(EQUIPMENT.slimeBall.name);
  });

  test("Frog: a card link is reachable by keyboard, rings on focus, and opens on Enter", async ({
    page,
  }) => {
    await openEnemyPage(page, "frog");

    // Real Tab presses, not locator.focus(): :focus-visible only matches when the focus came from
    // a keyboard-ish modality.
    await page.locator("a.back-link").focus();
    await page.keyboard.press("Tab");

    const first = page.locator(".equipment-card-link").first();
    await expect(first).toBeFocused();
    expect(
      await first.evaluate((el) => ({
        focusVisible: el.matches(":focus-visible"),
        width: getComputedStyle(el).outlineWidth,
        style: getComputedStyle(el).outlineStyle,
      }))
    ).toEqual({ focusVisible: true, width: "3px", style: "solid" });

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(pageUrl("equipment/broadsword.html"));
  });

  // The cards are meant to look untouched until someone interacts with a keyboard: a ring left
  // behind by a tap or a click would be a visible change to a card at rest.
  test("Frog: a card clicked with the mouse gets no focus ring", async ({ page }) => {
    await openEnemyPage(page, "frog");
    const first = page.locator(".equipment-card-link").first();
    await first.evaluate((el) => el.addEventListener("click", (e) => e.preventDefault()));
    await first.click();
    expect(await first.evaluate((el) => el.matches(":focus-visible"))).toBe(false);
  });
});
