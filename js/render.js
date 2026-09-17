// Builds DOM nodes for enemy/equipment data (see data.js) using the game's own card
// conventions. Pure DOM APIs throughout, no innerHTML string-building.

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

// Standard 6-sided die pip layouts, as [row, column] positions on a 3x3 grid (1-indexed).
// 2 and 3 run along the top-right/bottom-left diagonal, as on the wiki's card art.
const DIE_PIP_LAYOUTS = {
  1: [[2, 2]],
  2: [[1, 3], [3, 1]],
  3: [[1, 3], [2, 2], [3, 1]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [2, 1], [3, 1], [1, 3], [2, 3], [3, 3]],
};

// Row/column 1-3 -> percentage position within the die face. Pips are placed by percentage
// (not a CSS grid cell) so they stay perfectly circular and evenly spaced at any size --
// grid-track + aspect-ratio sizing rounds unpredictably once the die face is only a few
// pixels across (e.g. the mini header icon). Card die-faces use the wiki art's measured pip
// centres; the mini header icon keeps its own slightly inset layout, which suits its larger pips.
const PIP_POSITION_PERCENT = { 1: 16.5, 2: 50, 3: 83.5 };
const MINI_PIP_POSITION_PERCENT = { 1: 22, 2: 50, 3: 78 };

// Purely symbolic pip count for the "these are dice" icon in the enemy header.
const GENERIC_DICE_ICON_PIPS = 3;

const REQUIREMENT_LABELS = { max: "MAX", min: "MIN", even: "EVEN", odd: "ODD" };

function createDieSlot(requirement, { mini = false } = {}) {
  const el = document.createElement("div");
  const classes = ["die-slot"];
  if (mini) classes.push("die-slot--mini");

  if (requirement && REQUIREMENT_LABELS[requirement.type]) {
    classes.push(`die-slot--${requirement.type}`);
    const label = document.createElement("span");
    label.className = "die-slot__label";
    label.textContent = REQUIREMENT_LABELS[requirement.type];
    el.append(label);
    if (requirement.value !== undefined) {
      const value = document.createElement("span");
      value.className = "die-slot__value";
      value.textContent = requirement.value;
      el.append(value);
    }
  } else if (requirement && requirement.type === "countdown") {
    classes.push("die-slot--countdown");
    const value = document.createElement("span");
    value.className = "die-slot__value";
    value.textContent = requirement.value;
    el.append(value);
  } else if (requirement && requirement.type === "exact") {
    // The art draws the required number as grey pips inside the empty socket.
    classes.push("die-slot--exact");
    appendPips(el, requirement.value, PIP_POSITION_PERCENT, "die-slot__pip");
  }

  el.className = classes.join(" ");
  el.setAttribute("aria-hidden", "true");
  return el;
}

// Caption types print their requirement under the socket(s) rather than inside.
const REQUIREMENT_CAPTIONS = {
  exact: (requirement) => `NEEDS ${requirement.value}`,
  doubles: () => "NEEDS DOUBLES",
};

const hasCaption = (requirement) => Boolean(requirement && REQUIREMENT_CAPTIONS[requirement.type]);

// A card's requirement as the element(s) placed in its slot row. `requirement` may be an array,
// one socket per entry (e.g. [null, null] for a card that takes two dice).
function createRequirementSlots(requirement) {
  return [].concat(requirement).map((req) => {
    if (!hasCaption(req)) return createDieSlot(req);

    const group = document.createElement("div");
    group.className = `slot-group slot-group--${req.type}`;
    if (req.type === "doubles") {
      const equals = document.createElement("span");
      equals.className = "slot-group__equals";
      equals.setAttribute("aria-hidden", "true");
      group.append(createDieSlot(null), equals, createDieSlot(null));
    } else {
      group.append(createDieSlot(req));
    }
    const caption = document.createElement("span");
    caption.className = "slot-group__caption";
    caption.textContent = REQUIREMENT_CAPTIONS[req.type](req);
    group.append(caption);
    return group;
  });
}

function createDieFace(pips, { mini = false } = {}) {
  const el = document.createElement("div");
  el.className = mini ? "die-face die-face--mini" : "die-face";
  el.setAttribute("aria-hidden", "true");
  appendPips(el, pips, mini ? MINI_PIP_POSITION_PERCENT : PIP_POSITION_PERCENT, "die-face__pip");
  return el;
}

function appendPips(el, pips, positions, className) {
  for (const [row, col] of DIE_PIP_LAYOUTS[pips] || []) {
    const pip = document.createElement("span");
    pip.className = className;
    pip.style.top = `${positions[row]}%`;
    pip.style.left = `${positions[col]}%`;
    el.appendChild(pip);
  }
}

// Adds the hidden icon sprite (ICON_SYMBOLS, see icons.js) to the page once. Built from JS rather
// than referencing an external .svg file, which <use> can't load from a file:// page.
function injectIconSprite() {
  if (document.getElementById("icon-sprite")) return;
  const symbols = Object.entries(ICON_SYMBOLS)
    .map(([name, markup]) => `<symbol id="icon-${name}" viewBox="0 0 24 24">${markup}</symbol>`)
    .join("");
  const parsed = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}" id="icon-sprite" style="display:none" aria-hidden="true">${symbols}</svg>`,
    "image/svg+xml"
  );
  document.body.prepend(document.importNode(parsed.documentElement, true));
}

function createGlyph(iconName) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", `glyph glyph--${iconName}`);
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
        if (token.muted) {
          const muted = document.createElement("span");
          muted.className = "effect-muted";
          muted.textContent = token.text;
          frag.appendChild(muted);
        } else {
          frag.appendChild(document.createTextNode(token.text));
        }
        break;
      case "icon":
        frag.appendChild(createGlyph(token.icon));
        if (token.value !== undefined) {
          const value = document.createElement("span");
          value.className = `effect-value effect-value--${token.icon}`;
          value.textContent = token.value;
          frag.appendChild(value);
        }
        break;
      case "dieSlot":
        frag.appendChild(createDieSlot(null, { mini: true }));
        break;
      case "lineBreak":
        frag.appendChild(document.createElement("br"));
        break;
    }
  }
  return frag;
}

function renderEquipmentCard(equipmentId) {
  const data = EQUIPMENT[equipmentId];

  const card = document.createElement("article");
  card.className = `equipment-card equipment-card--size-${data.size}`;
  if ([].concat(data.requirement).some(hasCaption)) card.classList.add("equipment-card--captioned");
  card.style.setProperty("--card-accent", data.color.header);
  card.style.setProperty("--card-body", data.color.body);
  if (data.color.slot) card.style.setProperty("--card-slot", data.color.slot);

  const header = document.createElement("header");
  header.className = "equipment-card__header";
  header.textContent = data.name;
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "equipment-card__body";

  const slots = document.createElement("div");
  slots.className = "equipment-card__slots";
  slots.append(...createRequirementSlots(data.requirement));
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

  injectIconSprite();
  root.appendChild(renderEnemyHeader(enemy));

  const groups = [{ heading: "Equipment", equipment: enemy.equipment, note: enemy.equipmentNote }];
  for (const group of enemy.extraEquipment || []) groups.push(group);

  for (const [i, group] of groups.entries()) {
    const headingId = i === 0 ? "equipment-heading" : `equipment-heading-${i + 1}`;
    const section = document.createElement("section");
    section.className = "equipment-section";
    section.setAttribute("aria-labelledby", headingId);

    const heading = document.createElement("h2");
    heading.id = headingId;
    heading.textContent = group.heading;
    section.appendChild(heading);

    if (group.note) {
      const note = document.createElement("p");
      note.className = "equipment-section__note";
      note.textContent = group.note;
      section.appendChild(note);
    }

    if (group.equipment.length > 0) {
      const grid = document.createElement("div");
      grid.className = "equipment-grid";
      for (const equipmentId of group.equipment) {
        grid.appendChild(renderEquipmentCard(equipmentId));
      }
      section.appendChild(grid);
    }

    root.appendChild(section);
  }

  fitCardTitles(root);
}

// The card art prints a long title in a smaller font rather than letting it overflow. The new size
// is set in cqw, like the rest of the card's text, so it holds at any card width.
function fitCardTitles(root) {
  for (const header of root.querySelectorAll(".equipment-card__header")) {
    const style = getComputedStyle(header);
    const available = header.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const range = document.createRange();
    range.selectNodeContents(header);
    const textWidth = range.getBoundingClientRect().width;
    if (textWidth <= available) continue;
    const scale = available / textWidth;
    const fontCqw = (parseFloat(style.fontSize) / header.offsetWidth) * 100;
    header.style.fontSize = `${(fontCqw * scale * 0.98).toFixed(2)}cqw`;
  }
}

// Picker sections: one per level in ascending order (levels with no enemies are skipped), then
// bosses. Enemies keep their ENEMIES order within a section.
function enemyPickerGroups() {
  const groups = new Map();
  const levels = [...new Set(Object.values(ENEMIES).filter((e) => !e.boss).map((e) => e.level))];
  for (const level of levels.sort((a, b) => a - b)) {
    groups.set(level, { id: `level-${level}`, heading: `Level ${level}`, enemyIds: [] });
  }
  groups.set("boss", { id: "bosses", heading: "Bosses", enemyIds: [] });
  for (const [enemyId, enemy] of Object.entries(ENEMIES)) {
    groups.get(enemy.boss ? "boss" : enemy.level).enemyIds.push(enemyId);
  }
  return [...groups.values()].filter((group) => group.enemyIds.length > 0);
}

// Links are relative to the picker page (index.html at the repo root).
function renderEnemyPicker() {
  const root = document.getElementById("picker-root");

  for (const [i, group] of enemyPickerGroups().entries()) {
    if (i > 0) {
      const divider = document.createElement("hr");
      divider.className = "picker-divider";
      root.appendChild(divider);
    }

    const section = document.createElement("section");
    section.className = "picker-group";
    section.setAttribute("aria-labelledby", `picker-group-${group.id}`);

    const heading = document.createElement("h2");
    heading.className = "picker-group__heading";
    heading.id = `picker-group-${group.id}`;
    heading.textContent = group.heading;
    section.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "enemy-picker";
    for (const enemyId of group.enemyIds) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.className = "enemy-picker__card";
      link.href = `enemies/${enemyId}.html`;
      link.textContent = ENEMIES[enemyId].name;
      item.appendChild(link);
      list.appendChild(item);
    }
    section.appendChild(list);
    root.appendChild(section);
  }
}
