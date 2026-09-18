// Consistency checks on js/data.js and the enemy pages that other tests rely on but don't check
// themselves (e.g. visual.spec.js assumes every equipment entry appears on some enemy page).
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const {
  EQUIPMENT,
  ENEMIES,
  ENEMY_IDS,
  EQUIPMENT_IDS,
  pageEquipment,
  resolveUpgrade,
  UPGRADE_KEYS,
} = require("./helpers");
const { ICON_SYMBOLS } = require("../js/icons.js");

const REQUIREMENT_TYPES = ["max", "min", "even", "odd", "countdown", "exact", "doubles"];

test("every enemy has a level from 1 to 5, or is a boss", () => {
  for (const id of ENEMY_IDS) {
    const { level, boss } = ENEMIES[id];
    if (boss) expect(level, `${id} is a boss but has a level`).toBeUndefined();
    else expect([1, 2, 3, 4, 5], `${id} level`).toContain(level);
  }
});

test("every equipment id an enemy page shows exists, and every equipment entry is shown", () => {
  const shown = new Set();
  for (const id of ENEMY_IDS) {
    for (const equipmentId of pageEquipment(ENEMIES[id])) {
      expect(EQUIPMENT[equipmentId], `${id} references ${equipmentId}`).toBeDefined();
      shown.add(equipmentId);
    }
  }
  expect(Object.keys(EQUIPMENT).filter((id) => !shown.has(id))).toEqual([]);
});

// Both forms of every card, since an upgrade can change the requirement or the effect (and so can
// introduce a socket style or an icon nothing else uses).
test("every requirement type and icon used by equipment is one the renderer draws", () => {
  for (const id of EQUIPMENT_IDS) {
    for (const [form, equipment] of [["", EQUIPMENT[id]], ["+", resolveUpgrade(id)]]) {
      for (const requirement of [].concat(equipment.requirement)) {
        if (requirement) expect(REQUIREMENT_TYPES, `${id}${form} requirement`).toContain(requirement.type);
      }
      for (const token of equipment.effect) {
        if (token.type === "icon") {
          expect(ICON_SYMBOLS[token.icon], `${id}${form} icon ${token.icon}`).toBeDefined();
        }
      }
      expect([1, 2], `${id}${form} size`).toContain(equipment.size);
      if (equipment.bonusDieFace !== null) {
        expect([1, 2, 3, 4, 5, 6], `${id}${form} bonusDieFace`).toContain(equipment.bonusDieFace);
      }
    }
  }
});

// The `upgrade` override is merged straight onto the entry, so a stray key would silently do
// nothing and a missing one would mean nobody has authored that card's upgrade yet.
test("every equipment has an upgrade override listing only fields the card shows", () => {
  for (const id of EQUIPMENT_IDS) {
    const upgrade = EQUIPMENT[id].upgrade;
    expect(upgrade, `${id} upgrade`).toBeDefined();
    expect(Array.isArray(upgrade), `${id} upgrade is an object`).toBe(false);
    expect(typeof upgrade, `${id} upgrade is an object`).toBe("object");
    for (const key of Object.keys(upgrade)) {
      expect(UPGRADE_KEYS, `${id} upgrade key ${key}`).toContain(key);
    }
  }
});

// A card whose upgrade repeats what the base already says is a transcription slip, not a card that
// doesn't change -- that case is written as `upgrade: {}` instead.
test("no upgrade override restates a value the base entry already has", () => {
  for (const id of EQUIPMENT_IDS) {
    const base = EQUIPMENT[id];
    for (const [key, value] of Object.entries(base.upgrade)) {
      expect(JSON.stringify(value), `${id} upgrade ${key} repeats the base`).not.toBe(
        JSON.stringify(base[key])
      );
    }
  }
});

test("enemies/*.html pages match ENEMIES one-to-one, each rendering its own enemy", () => {
  const dir = path.resolve(__dirname, "..", "enemies");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
  expect(files.map((f) => f.replace(/\.html$/, "")).sort()).toEqual([...ENEMY_IDS].sort());
  for (const file of files) {
    const id = file.replace(/\.html$/, "");
    const html = fs.readFileSync(path.join(dir, file), "utf8");
    expect(html, `${file} render call`).toContain(`renderEnemyPage("${id}")`);
    expect(html, `${file} title`).toContain(`<title>${ENEMIES[id].name} &ndash;`);
  }
});

test("equipment/*.html pages match EQUIPMENT one-to-one, each rendering its own equipment", () => {
  const dir = path.resolve(__dirname, "..", "equipment");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
  expect(files.map((f) => f.replace(/\.html$/, "")).sort()).toEqual([...EQUIPMENT_IDS].sort());
  for (const file of files) {
    const id = file.replace(/\.html$/, "");
    const html = fs.readFileSync(path.join(dir, file), "utf8");
    expect(html, `${file} render call`).toContain(`renderEquipmentPage("${id}")`);
    expect(html, `${file} title`).toContain(`<title>${EQUIPMENT[id].name} &ndash;`);
  }
});

// The enemy pages moved behind enemies.html when index.html became the site root.
test("every enemy page links back to the enemy picker, not the site root", () => {
  const dir = path.resolve(__dirname, "..", "enemies");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(dir, file), "utf8");
    expect(html, `${file} back-link`).toContain('href="../enemies.html"');
  }
});
