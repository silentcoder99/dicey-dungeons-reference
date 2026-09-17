// Builds DOM nodes for enemy/equipment data (see data.js) using the game's own card
// conventions. Pure DOM APIs throughout, no innerHTML string-building.

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

// Standard 6-sided die pip layouts, as [row, column] positions on a 3x3 grid (1-indexed).
const DIE_PIP_LAYOUTS = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [2, 1], [3, 1], [1, 3], [2, 3], [3, 3]],
};

// Row/column 1-3 -> percentage position within the die face. Pips are placed by percentage
// (not a CSS grid cell) so they stay perfectly circular and evenly spaced at any size --
// grid-track + aspect-ratio sizing rounds unpredictably once the die face is only a few
// pixels across (e.g. the mini header icon).
const PIP_POSITION_PERCENT = { 1: 22, 2: 50, 3: 78 };

// Purely symbolic pip count for the "these are dice" icon in the enemy header.
const GENERIC_DICE_ICON_PIPS = 3;

function createDieSlot(requirement, { mini = false } = {}) {
  const el = document.createElement("div");
  const classes = ["die-slot"];
  if (mini) classes.push("die-slot--mini");

  if (requirement && requirement.type === "max") {
    classes.push("die-slot--max");
    const label = document.createElement("span");
    label.className = "die-slot__label";
    label.textContent = "MAX";
    const value = document.createElement("span");
    value.className = "die-slot__value";
    value.textContent = requirement.value;
    el.append(label, value);
  } else if (requirement && requirement.type === "countdown") {
    classes.push("die-slot--countdown");
    const value = document.createElement("span");
    value.className = "die-slot__value";
    value.textContent = requirement.value;
    el.append(value);
  }

  el.className = classes.join(" ");
  el.setAttribute("aria-hidden", "true");
  return el;
}

function createDieFace(pips, { mini = false } = {}) {
  const el = document.createElement("div");
  el.className = mini ? "die-face die-face--mini" : "die-face";
  el.setAttribute("aria-hidden", "true");
  for (const [row, col] of DIE_PIP_LAYOUTS[pips] || []) {
    const pip = document.createElement("span");
    pip.className = "die-face__pip";
    pip.style.top = `${PIP_POSITION_PERCENT[row]}%`;
    pip.style.left = `${PIP_POSITION_PERCENT[col]}%`;
    el.appendChild(pip);
  }
  return el;
}

function createGlyph(iconName) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "glyph");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttributeNS(XLINK_NS, "xlink:href", `#icon-${iconName}`);
  use.setAttribute("href", `#icon-${iconName}`);
  svg.appendChild(use);
  return svg;
}

function renderEffectTokens(tokens) {
  const frag = document.createDocumentFragment();
  for (const token of tokens) {
    switch (token.type) {
      case "text":
        frag.appendChild(document.createTextNode(token.text));
        break;
      case "icon":
        frag.appendChild(createGlyph(token.icon));
        break;
      case "dieSlot":
        frag.appendChild(createDieSlot(null, { mini: true }));
        break;
    }
  }
  return frag;
}

function renderEquipmentCard(equipmentId) {
  const data = EQUIPMENT[equipmentId];

  const card = document.createElement("article");
  card.className = "equipment-card";
  card.style.setProperty("--card-accent", data.color.header);
  card.style.setProperty("--card-body", data.color.body);

  const header = document.createElement("header");
  header.className = "equipment-card__header";
  header.textContent = data.name;
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "equipment-card__body";

  const slots = document.createElement("div");
  slots.className = "equipment-card__slots";
  slots.appendChild(createDieSlot(data.requirement));
  if (data.bonusDieFace) {
    slots.appendChild(createDieFace(data.bonusDieFace));
  }
  body.appendChild(slots);

  const effect = document.createElement("p");
  effect.className = "equipment-card__effect";
  effect.appendChild(renderEffectTokens(data.effect));
  body.appendChild(effect);

  card.appendChild(body);
  return card;
}

function renderEnemyHeader(enemy) {
  const header = document.createElement("header");
  header.className = "enemy-header";

  const name = document.createElement("h1");
  name.className = "enemy-header__name";
  name.textContent = enemy.name;
  header.appendChild(name);

  const stats = document.createElement("dl");
  stats.className = "enemy-header__stats";

  const diceStat = document.createElement("div");
  diceStat.className = "stat";
  const diceLabel = document.createElement("dt");
  diceLabel.textContent = "Dice";
  const diceValue = document.createElement("dd");
  diceValue.appendChild(createDieFace(GENERIC_DICE_ICON_PIPS, { mini: true }));
  diceValue.appendChild(document.createTextNode(`×${enemy.diceCount}`));
  diceStat.append(diceLabel, diceValue);
  stats.appendChild(diceStat);

  const hpStat = document.createElement("div");
  hpStat.className = "stat";
  const hpLabel = document.createElement("dt");
  hpLabel.textContent = "Max HP";
  const hpValue = document.createElement("dd");
  hpValue.textContent = String(enemy.hp);
  hpStat.append(hpLabel, hpValue);
  stats.appendChild(hpStat);

  header.appendChild(stats);

  const innate = document.createElement("section");
  innate.className = "enemy-header__innate";
  const innateTitle = document.createElement("h2");
  innateTitle.textContent = "Innate Effects";
  const innateBody = document.createElement("p");
  if (enemy.innateEffects.length === 0) {
    innateBody.className = "none";
    innateBody.textContent = "None";
  } else {
    innateBody.textContent = enemy.innateEffects.join(", ");
  }
  innate.append(innateTitle, innateBody);
  header.appendChild(innate);

  return header;
}

function renderEnemyPage(enemyId) {
  const enemy = ENEMIES[enemyId];
  const root = document.getElementById("enemy-root");

  root.appendChild(renderEnemyHeader(enemy));

  const section = document.createElement("section");
  section.className = "equipment-section";
  section.setAttribute("aria-labelledby", "equipment-heading");

  const heading = document.createElement("h2");
  heading.id = "equipment-heading";
  heading.textContent = "Equipment";
  section.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "equipment-grid";
  for (const equipmentId of enemy.equipment) {
    grid.appendChild(renderEquipmentCard(equipmentId));
  }
  section.appendChild(grid);

  root.appendChild(section);
}

document.addEventListener("DOMContentLoaded", () => renderEnemyPage("frog"));
