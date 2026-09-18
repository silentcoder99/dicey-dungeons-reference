const path = require("path");
const { EQUIPMENT, ENEMIES } = require("../js/data.js");

function pageUrl(filename) {
  return "file://" + path.resolve(__dirname, "..", filename);
}

const ENEMY_IDS = Object.keys(ENEMIES);

// The picker's expected sections, worked out here independently of render.js: levels in
// ascending order, then bosses, each keeping data order.
const LEVELS = [...new Set(ENEMY_IDS.filter((id) => !ENEMIES[id].boss).map((id) => ENEMIES[id].level))];
const PICKER_GROUPS = [
  ...LEVELS.sort((a, b) => a - b).map((level) => ({
    id: `level-${level}`,
    heading: `Level ${level}`,
    enemyIds: ENEMY_IDS.filter((id) => !ENEMIES[id].boss && ENEMIES[id].level === level),
  })),
  { id: "bosses", heading: "Bosses", enemyIds: ENEMY_IDS.filter((id) => ENEMIES[id].boss) },
].filter((group) => group.enemyIds.length > 0);

// Every card an enemy page shows, in page order: starting equipment, then each extra section's.
function pageEquipment(enemy) {
  return [enemy.equipment, ...(enemy.extraEquipment || []).map((g) => g.equipment)].flat();
}

const EQUIPMENT_IDS = Object.keys(EQUIPMENT);

// The effect line's visible text, as built from the data's tokens.
function expectedEffectText(tokens) {
  return tokens
    .map((t) => (t.type === "text" ? t.text : t.value !== undefined ? String(t.value) : ""))
    .join("");
}

// The upgraded form of an equipment entry, worked out here independently of render.js: the base
// entry with its `upgrade` override applied and a "+" on the name.
function resolveUpgrade(equipmentId) {
  const base = EQUIPMENT[equipmentId];
  return { ...base, ...base.upgrade, name: `${base.name}+` };
}

const UPGRADE_KEYS = ["size", "requirement", "bonusDieFace", "effect"];

module.exports = {
  pageUrl,
  EQUIPMENT,
  ENEMIES,
  ENEMY_IDS,
  EQUIPMENT_IDS,
  PICKER_GROUPS,
  pageEquipment,
  expectedEffectText,
  resolveUpgrade,
  UPGRADE_KEYS,
};
