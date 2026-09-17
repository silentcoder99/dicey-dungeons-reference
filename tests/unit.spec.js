// Exercises the pure DOM-building functions in js/render.js directly (via page.evaluate),
// without needing a full page render. Loading an enemy page gives us those functions as globals.
const { test, expect } = require("@playwright/test");
const { pageUrl } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await page.goto(pageUrl("enemies/frog.html"));
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

  test('"min" requirement renders a MIN label and value', async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = createDieSlot({ type: "min", value: 3 });
      return {
        className: el.className,
        label: el.querySelector(".die-slot__label")?.textContent,
        value: el.querySelector(".die-slot__value")?.textContent,
      };
    });
    expect(result.className).toContain("die-slot--min");
    expect(result.label).toBe("MIN");
    expect(result.value).toBe("3");
  });

  for (const [type, label] of [
    ["even", "EVEN"],
    ["odd", "ODD"],
  ]) {
    test(`"${type}" requirement renders just a ${label} label, no value`, async ({ page }) => {
      const result = await page.evaluate((t) => {
        const el = createDieSlot({ type: t });
        return {
          className: el.className,
          label: el.querySelector(".die-slot__label")?.textContent,
          hasValue: !!el.querySelector(".die-slot__value"),
        };
      }, type);
      expect(result.className).toContain(`die-slot--${type}`);
      expect(result.label).toBe(label);
      expect(result.hasValue).toBe(false);
    });
  }

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

  // A 2-pip face is the top-right/bottom-left diagonal, as on the wiki's card art.
  test("card die-face pips sit at the art's measured centres", async ({ page }) => {
    const positions = await page.evaluate(() =>
      [...createDieFace(2).querySelectorAll(".die-face__pip")].map((p) => ({
        left: p.style.left,
        top: p.style.top,
      }))
    );
    expect(positions).toEqual([
      { left: "83.5%", top: "16.5%" },
      { left: "16.5%", top: "83.5%" },
    ]);
  });

  test("mini die-face pips keep their own inset layout", async ({ page }) => {
    const positions = await page.evaluate(() =>
      [...createDieFace(2, { mini: true }).querySelectorAll(".die-face__pip")].map((p) => ({
        left: p.style.left,
        top: p.style.top,
      }))
    );
    expect(positions).toEqual([
      { left: "78%", top: "22%" },
      { left: "22%", top: "78%" },
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

  test("an icon token with a value renders the glyph then a per-icon value span", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const container = document.createElement("div");
      container.appendChild(renderEffectTokens([{ type: "icon", icon: "shield", value: 3 }]));
      const [glyph, value] = container.children;
      return {
        glyphClass: glyph.getAttribute("class"),
        valueClass: value.className,
        valueText: value.textContent,
      };
    });
    expect(result.glyphClass).toBe("glyph glyph--shield");
    expect(result.valueClass).toBe("effect-value effect-value--shield");
    expect(result.valueText).toBe("3");
  });

  test("an icon token without a value renders only the glyph", async ({ page }) => {
    const childCount = await page.evaluate(() => {
      const container = document.createElement("div");
      container.appendChild(renderEffectTokens([{ type: "icon", icon: "sword" }]));
      return container.children.length;
    });
    expect(childCount).toBe(1);
  });

  test("a lineBreak token renders a <br>", async ({ page }) => {
    const html = await page.evaluate(() => {
      const container = document.createElement("div");
      container.appendChild(
        renderEffectTokens([
          { type: "text", text: "a" },
          { type: "lineBreak" },
          { type: "text", text: "b" },
        ])
      );
      return container.innerHTML;
    });
    expect(html).toBe("a<br>b");
  });
});

test.describe("renderEquipmentCard", () => {
  test("adds a size modifier class from the equipment's size", async ({ page }) => {
    const result = await page.evaluate(() => ({
      smallShield: renderEquipmentCard("smallShield").className,
      broadsword: renderEquipmentCard("broadsword").className,
    }));
    expect(result.smallShield).toBe("equipment-card equipment-card--size-1");
    expect(result.broadsword).toBe("equipment-card equipment-card--size-2");
  });

  test("sets the countdown slot fill color only for equipment that has one", async ({ page }) => {
    const result = await page.evaluate(() => ({
      plasmaCannon: renderEquipmentCard("plasmaCannon").style.getPropertyValue("--card-slot"),
      broadsword: renderEquipmentCard("broadsword").style.getPropertyValue("--card-slot"),
    }));
    expect(result.plasmaCannon).toBe("#ac2c38");
    expect(result.broadsword).toBe("");
  });
});
