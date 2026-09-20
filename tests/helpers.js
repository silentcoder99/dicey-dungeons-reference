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

// The weakened form, the same way: the `weaken` override and a "-".
function resolveWeaken(equipmentId) {
  const base = EQUIPMENT[equipmentId];
  return { ...base, ...base.weaken, name: `${base.name}-` };
}

// `upgrade` and `weaken` are the same shape and take the same keys.
const OVERRIDE_KEYS = ["size", "requirement", "bonusDieFace", "effect"];

// The placeholder treatment a weakened card's colors get, worked out here independently of
// render.js's dullColor(): saturation to 45%, lightness down 6, hue held.
function dulled(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (l > 0.5 ? 2 - max - min : max + min);
  const h =
    d === 0
      ? 0
      : (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  const [sat, lum] = [s * 0.45, Math.max(0, l - 0.06)];
  const q = lum < 0.5 ? lum * (1 + sat) : lum + sat - lum * sat;
  const p = 2 * lum - q;
  const channel = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const hex2 = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  if (sat === 0) return `#${hex2(lum).repeat(3)}`;
  return `#${hex2(channel(h + 1 / 3))}${hex2(channel(h))}${hex2(channel(h - 1 / 3))}`;
}

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
  resolveWeaken,
  OVERRIDE_KEYS,
  dulled,
};
