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

module.exports = { pageUrl, EQUIPMENT, ENEMIES, ENEMY_IDS, PICKER_GROUPS, pageEquipment };
