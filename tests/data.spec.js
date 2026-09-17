// Consistency checks on js/data.js and the enemy pages that other tests rely on but don't check
// themselves (e.g. visual.spec.js assumes every equipment entry appears on some enemy page).
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { EQUIPMENT, ENEMIES, ENEMY_IDS, pageEquipment } = require("./helpers");
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

test("every requirement type and icon used by equipment is one the renderer draws", () => {
  for (const [id, equipment] of Object.entries(EQUIPMENT)) {
    for (const requirement of [].concat(equipment.requirement)) {
      if (requirement) expect(REQUIREMENT_TYPES, `${id} requirement`).toContain(requirement.type);
    }
    for (const token of equipment.effect) {
      if (token.type === "icon") expect(ICON_SYMBOLS[token.icon], `${id} icon ${token.icon}`).toBeDefined();
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
