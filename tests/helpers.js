const path = require("path");
const { EQUIPMENT, ENEMIES } = require("../js/data.js");

function pageUrl(filename) {
  return "file://" + path.resolve(__dirname, "..", filename);
}

const ENEMY_IDS = Object.keys(ENEMIES);

module.exports = { pageUrl, EQUIPMENT, ENEMIES, ENEMY_IDS };
