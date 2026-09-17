// Exercises the pure DOM-building functions in js/render.js directly (via page.evaluate),
// without needing a full page render. Loading frog.html gives us those functions as globals.
const { test, expect } = require("@playwright/test");
const { pageUrl } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await page.goto(pageUrl("frog.html"));
});

test.describe("createDieSlot", () => {
  test("no requirement renders an empty dashed square", async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = createDieSlot(null);
      return { className: el.className, childCount: el.children.length };
    });
    expect(result.className).toContain("die-slot");
    expect(result.className).not.toContain("die-slot--max");
    expect(result.className).not.toContain("die-slot--countdown");
    expect(result.childCount).toBe(0);
  });

  test('"max" requirement renders a MAX label and value', async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = createDieSlot({ type: "max", value: 3 });
      return {
        className: el.className,
        label: el.querySelector(".die-slot__label")?.textContent,
        value: el.querySelector(".die-slot__value")?.textContent,
      };
    });
    expect(result.className).toContain("die-slot--max");
    expect(result.label).toBe("MAX");
    expect(result.value).toBe("3");
  });

  test('"countdown" requirement renders a solid square with just the number', async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = createDieSlot({ type: "countdown", value: 7 });
      return {
        className: el.className,
        hasLabel: !!el.querySelector(".die-slot__label"),
        value: el.querySelector(".die-slot__value")?.textContent,
      };
    });
    expect(result.className).toContain("die-slot--countdown");
    expect(result.hasLabel).toBe(false);
    expect(result.value).toBe("7");
  });

  test("mini variant adds the mini modifier class", async ({ page }) => {
    const className = await page.evaluate(() => createDieSlot(null, { mini: true }).className);
    expect(className).toContain("die-slot--mini");
  });
});

test.describe("createDieFace", () => {
  for (const pips of [1, 2, 3, 4, 5, 6]) {
    test(`renders exactly ${pips} pip(s)`, async ({ page }) => {
      const count = await page.evaluate(
        (n) => createDieFace(n).querySelectorAll(".die-face__pip").length,
        pips
      );
      expect(count).toBe(pips);
    });
  }

  test("pips are positioned with matching left/top percentages (so they stay circular)", async ({
    page,
  }) => {
    const positions = await page.evaluate(() => {
      const el = createDieFace(2);
      return [...el.querySelectorAll(".die-face__pip")].map((p) => ({
        left: p.style.left,
        top: p.style.top,
      }));
    });
    // A 2-pip face is the top-left/bottom-right diagonal.
    expect(positions).toEqual([
      { left: "22%", top: "22%" },
      { left: "78%", top: "78%" },
    ]);
  });
});

test.describe("renderEffectTokens", () => {
  test("builds text, icon, and die-slot nodes in order", async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.createElement("div");
      container.appendChild(renderEffectTokens(EQUIPMENT.broadsword.effect));
      return {
        text: container.textContent,
        iconCount: container.querySelectorAll("svg.glyph").length,
        miniSlotCount: container.querySelectorAll(".die-slot--mini").length,
      };
    });
    expect(result.text).toBe("Do  + 2 damage");
    expect(result.iconCount).toBe(1);
    expect(result.miniSlotCount).toBe(1);
  });
});
