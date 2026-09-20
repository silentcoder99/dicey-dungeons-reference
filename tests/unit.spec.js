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

test.describe("createDieSlot: exact requirement", () => {
  test('"exact" renders an unlabelled socket holding N pips at the die-face positions', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const el = createDieSlot({ type: "exact", value: 2 });
      return {
        className: el.className,
        label: el.querySelector(".die-slot__label"),
        pips: [...el.querySelectorAll(".die-slot__pip")].map((p) => [p.style.left, p.style.top]),
      };
    });
    expect(result.className).toBe("die-slot die-slot--exact");
    expect(result.label).toBeNull();
    expect(result.pips).toEqual([
      ["83.5%", "16.5%"],
      ["16.5%", "83.5%"],
    ]);
  });
});

test.describe("createRequirementSlots", () => {
  test("a single uncaptioned requirement is one plain socket", async ({ page }) => {
    const classes = await page.evaluate(() =>
      createRequirementSlots({ type: "max", value: 3 }).map((el) => el.className)
    );
    expect(classes).toEqual(["die-slot die-slot--max"]);
  });

  test("an array gives one socket per entry", async ({ page }) => {
    const classes = await page.evaluate(() =>
      createRequirementSlots([null, null]).map((el) => el.className)
    );
    expect(classes).toEqual(["die-slot", "die-slot"]);
  });

  test('"exact" wraps its socket in a group captioned NEEDS N', async ({ page }) => {
    const result = await page.evaluate(() => {
      const [group] = createRequirementSlots({ type: "exact", value: 4 });
      return {
        className: group.className,
        slots: group.querySelectorAll(".die-slot--exact").length,
        caption: group.querySelector(".slot-group__caption").textContent,
      };
    });
    expect(result).toEqual({ className: "slot-group slot-group--exact", slots: 1, caption: "NEEDS 4" });
  });

  test('"doubles" is two empty sockets joined by an equals sign, captioned NEEDS DOUBLES', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const [group] = createRequirementSlots({ type: "doubles" });
      return {
        children: [...group.children].map((el) => el.className),
        caption: group.querySelector(".slot-group__caption").textContent,
      };
    });
    expect(result.children).toEqual([
      "die-slot",
      "slot-group__equals",
      "die-slot",
      "slot-group__caption",
    ]);
    expect(result.caption).toBe("NEEDS DOUBLES");
  });
});

test.describe("renderEffectTokens: muted text", () => {
  test("a muted text token renders in its own dimmed span", async ({ page }) => {
    const html = await page.evaluate(() => {
      const container = document.createElement("div");
      container.appendChild(renderEffectTokens([{ type: "text", text: "(Reuseable)", muted: true }]));
      return container.innerHTML;
    });
    expect(html).toBe('<span class="effect-muted">(Reuseable)</span>');
  });
});

test.describe("renderEquipmentCard: captioned requirements", () => {
  test("marks cards whose requirement prints a caption", async ({ page }) => {
    const result = await page.evaluate(() => ({
      flameSpell: renderEquipmentCard("flameSpell").classList.contains("equipment-card--captioned"),
      iceAge: renderEquipmentCard("iceAge").classList.contains("equipment-card--captioned"),
      smallShield: renderEquipmentCard("smallShield").classList.contains("equipment-card--captioned"),
    }));
    expect(result).toEqual({ flameSpell: true, iceAge: true, smallShield: false });
  });
});

test.describe("injectIconSprite", () => {
  test("adds one hidden sprite with a symbol per icon, even if called again", async ({ page }) => {
    const result = await page.evaluate(() => {
      injectIconSprite();
      return {
        sprites: document.querySelectorAll("#icon-sprite").length,
        symbols: [...document.querySelectorAll("#icon-sprite symbol")].map((s) => s.id),
      };
    });
    const { ICON_SYMBOLS } = require("../js/icons.js");
    expect(result.sprites).toBe(1);
    expect(result.symbols).toEqual(Object.keys(ICON_SYMBOLS).map((name) => `icon-${name}`));
  });
});

test.describe("ribbonColor", () => {
  // The anchor: Battle Axe's body color, whose ribbon we can read off art-references/.
  test("lightens the card's body color, holding hue and saturation", async ({ page }) => {
    const result = await page.evaluate(() => ({
      battleAxe: ribbonColor("#9f7226"),
      grey: ribbonColor("#808080"),
      white: ribbonColor("#ffffff"),
      black: ribbonColor("#000000"),
    }));
    expect(result.battleAxe).toBe("#c08a2e");
    expect(result.grey).toBe("#949494");
    expect(result.white).toBe("#ffffff");
    expect(result.black).toBe("#141414");
  });

  test("round-trips a color it cannot lighten any further", async ({ page }) => {
    const hex = await page.evaluate(() => ribbonColor(ribbonColor("#ffffff")));
    expect(hex).toBe("#ffffff");
  });
});

test.describe("dullColor", () => {
  test("cuts saturation and lightness, holding the hue", async ({ page }) => {
    const result = await page.evaluate(() => ["#fd5e6c", "#8e324a", "#5da66f", "#7bc8ff"].map(dullColor));
    expect(result).toEqual(["#c9747b", "#623f48", "#63816b", "#89b4d2"]);
  });

  // Nothing to desaturate, so only the darkening applies.
  test("darkens a grey without tinting it", async ({ page }) => {
    const hex = await page.evaluate(() => dullColor("#7b7b7b"));
    expect(hex).toBe("#6c6c6c");
  });

  test("bottoms out at black rather than wrapping", async ({ page }) => {
    const hex = await page.evaluate(() => dullColor("#000000"));
    expect(hex).toBe("#000000");
  });
});

test.describe("resolveEquipment", () => {
  test("returns the entry untouched unless asked for the upgrade", async ({ page }) => {
    const same = await page.evaluate(
      () => resolveEquipment("battleAxe") === EQUIPMENT.battleAxe
    );
    expect(same).toBe(true);
  });

  test("applies the override and adds the +, leaving the entry alone", async ({ page }) => {
    const result = await page.evaluate(() => {
      const upgraded = resolveEquipment("battleAxe", { upgraded: true });
      return {
        name: upgraded.name,
        size: upgraded.size,
        baseName: EQUIPMENT.battleAxe.name,
        baseSize: EQUIPMENT.battleAxe.size,
        // Not overridden, so it comes through from the base entry.
        requirement: upgraded.requirement,
      };
    });
    expect(result).toEqual({
      name: "Battle Axe+",
      size: 1,
      baseName: "Battle Axe",
      baseSize: 2,
      requirement: { type: "max", value: 4 },
    });
  });

  test("an empty override still yields a card, differing only by the +", async ({ page }) => {
    const result = await page.evaluate(() => {
      const saved = EQUIPMENT.broadsword.upgrade;
      EQUIPMENT.broadsword.upgrade = {};
      const upgraded = resolveEquipment("broadsword", { upgraded: true });
      EQUIPMENT.broadsword.upgrade = saved;
      return { name: upgraded.name, size: upgraded.size, die: upgraded.bonusDieFace };
    });
    expect(result).toEqual({ name: "Broadsword+", size: 2, die: 2 });
  });

  test("applies the weaken override and adds the -, leaving the entry alone", async ({ page }) => {
    const result = await page.evaluate(() => {
      const weakened = resolveEquipment("battleAxe", { weakened: true });
      return {
        name: weakened.name,
        requirement: weakened.requirement,
        baseName: EQUIPMENT.battleAxe.name,
        baseRequirement: EQUIPMENT.battleAxe.requirement,
        // Not overridden, so it comes through from the base entry.
        size: weakened.size,
      };
    });
    expect(result).toEqual({
      name: "Battle Axe-",
      requirement: { type: "max", value: 3 },
      baseName: "Battle Axe",
      baseRequirement: { type: "max", value: 4 },
      size: 2,
    });
  });

  test("an empty weaken override still yields a card, differing only by the -", async ({ page }) => {
    const result = await page.evaluate(() => {
      const weakened = resolveEquipment("mysteryBox", { weakened: true });
      return { name: weakened.name, size: weakened.size, die: weakened.bonusDieFace };
    });
    expect(result).toEqual({ name: "Mystery Box-", size: 1, die: null });
  });
});

test.describe("createUpgradeRibbon", () => {
  test("draws each shape twice, shadow first, in card-width units", async ({ page }) => {
    const result = await page.evaluate(() => {
      const svg = createUpgradeRibbon();
      return {
        className: svg.getAttribute("class"),
        viewBox: svg.getAttribute("viewBox"),
        hidden: svg.getAttribute("aria-hidden"),
        groups: [...svg.children].map((g) => ({
          className: g.getAttribute("class"),
          paths: g.children.length,
          mirrored: [...g.children].filter((p) => p.getAttribute("transform")).length,
        })),
      };
    });
    expect(result.className).toBe("upgrade-ribbon");
    expect(result.viewBox).toBe("0 -2 100 29");
    expect(result.hidden).toBe("true");
    // Tail shadow, tails, band shadow, band -- one tail mirrored to the card's other side.
    expect(result.groups).toEqual([
      { className: "upgrade-ribbon__shadow", paths: 2, mirrored: 1 },
      { className: "upgrade-ribbon__body", paths: 2, mirrored: 1 },
      { className: "upgrade-ribbon__shadow", paths: 1, mirrored: 0 },
      { className: "upgrade-ribbon__body", paths: 1, mirrored: 0 },
    ]);
  });
});

test.describe("renderEquipmentCard upgraded", () => {
  test("only the upgraded card carries the ribbon, the + and the ribbon color", async ({ page }) => {
    const result = await page.evaluate(() => {
      const read = (card) => ({
        ribbons: card.querySelectorAll(".upgrade-ribbon").length,
        upgraded: card.classList.contains("equipment-card--upgraded"),
        title: card.querySelector(".equipment-card__header").textContent,
        ribbonColor: card.style.getPropertyValue("--card-ribbon"),
      });
      return {
        base: read(renderEquipmentCard("battleAxe")),
        upgraded: read(renderEquipmentCard("battleAxe", { upgraded: true })),
      };
    });
    expect(result.base).toEqual({
      ribbons: 0,
      upgraded: false,
      title: "Battle Axe",
      ribbonColor: "#c08a2e",
    });
    expect(result.upgraded).toEqual({
      ribbons: 1,
      upgraded: true,
      title: "Battle Axe+",
      ribbonColor: "#c08a2e",
    });
  });
});

test.describe("renderEquipmentCard weakened", () => {
  // The weakened card's whole treatment is the "-" and the drained colors: no ribbon, since that is
  // upgrade art, and no shape change, since nothing on the wiki weakens a card's size.
  test("carries the -, the drained colors and no ribbon", async ({ page }) => {
    const result = await page.evaluate(() => {
      const read = (card) => ({
        ribbons: card.querySelectorAll(".upgrade-ribbon").length,
        weakened: card.classList.contains("equipment-card--weakened"),
        title: card.querySelector(".equipment-card__header").textContent,
        accent: card.style.getPropertyValue("--card-accent"),
        body: card.style.getPropertyValue("--card-body"),
        size2: card.classList.contains("equipment-card--size-2"),
      });
      return {
        base: read(renderEquipmentCard("battleAxe")),
        weakened: read(renderEquipmentCard("battleAxe", { weakened: true })),
      };
    });
    expect(result.base).toEqual({
      ribbons: 0,
      weakened: false,
      title: "Battle Axe",
      accent: "#cdb94b",
      body: "#9f7226",
      size2: true,
    });
    expect(result.weakened).toEqual({
      ribbons: 0,
      weakened: true,
      title: "Battle Axe-",
      accent: "#9c935d",
      body: "#6a593c",
      size2: true,
    });
  });

  // A countdown box has its own sampled fill, which has to be drained with the rest or the card
  // ends up with one fully saturated square on it.
  test("drains a countdown card's slot color too", async ({ page }) => {
    const result = await page.evaluate(() => ({
      base: renderEquipmentCard("plasmaCannon").style.getPropertyValue("--card-slot"),
      weakened: renderEquipmentCard("plasmaCannon", { weakened: true }).style.getPropertyValue("--card-slot"),
    }));
    expect(result.weakened).not.toBe(result.base);
    expect(result.weakened).toBe(await page.evaluate((hex) => dullColor(hex), result.base));
  });
});
