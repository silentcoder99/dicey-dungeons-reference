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

// ---------- Upgraded and weakened equipment ----------

// An upgraded card is the base entry with its `upgrade` override applied and a "+" on the name; a
// weakened one is the same idea mirrored, with `weaken` and a "-". Only the fields the override
// actually changes are listed (see data.js), so an empty override still yields a valid card -- one
// that differs from the base only by the suffix and the card's treatment.
//
// `upgraded` and `weakened` are mutually exclusive: weakening an already-upgraded card is a state
// the game has but this site doesn't model (see data.js on Dire Wolf Howl).
function resolveEquipment(equipmentId, { upgraded = false, weakened = false } = {}) {
  const base = EQUIPMENT[equipmentId];
  if (upgraded) return { ...base, ...base.upgrade, name: `${base.name}+` };
  if (weakened) return { ...base, ...base.weaken, name: `${base.name}-` };
  return base;
}

// The art draws the upgrade ribbon in the card's own body color, one shade lighter: hue and
// saturation held, lightness +8. Measured across the four cards in art-references/ -- Battle Axe's
// body #9f7226 gives #c08a2e against the art's #c0882f. Computed rather than stored so every card
// gets a ribbon without 122 more hand-sampled hex values.
const RIBBON_LIGHTEN_PERCENT = 8;

function ribbonColor(bodyHex) {
  const [h, s, l] = rgbToHsl(bodyHex);
  return hslToHex(h, s, Math.min(100, l + RIBBON_LIGHTEN_PERCENT));
}

// Placeholder treatment for a weakened card. Unlike the upgrade ribbon there is no reference art
// for one -- art-references/ covers upgrades only, and the wiki has a single image per equipment --
// so rather than invent a banner, the card is drawn in its own colors drained: saturation cut to
// 45%, lightness down 6, hue held. Applied to all three of the card's colors, which is enough,
// because the hatching, die-face and countdown box are all mixed from them in CSS.
// Anchors: #fd5e6c -> #c9747b, #8e324a -> #623f48, #5da66f -> #63816b, #7bc8ff -> #89b4d2.
// Replace this wholesale if real weakened-card art turns up.
const WEAKENED_SATURATION_SCALE = 0.45;
const WEAKENED_DARKEN_PERCENT = 6;

function dullColor(hex) {
  const [h, s, l] = rgbToHsl(hex);
  return hslToHex(h, s * WEAKENED_SATURATION_SCALE, Math.max(0, l - WEAKENED_DARKEN_PERCENT));
}

function rgbToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = d / (l > 0.5 ? 2 - max - min : max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  const [hue, sat, lum] = [h / 360, s / 100, l / 100];
  const q = lum < 0.5 ? lum * (1 + sat) : lum + sat - lum * sat;
  const p = 2 * lum - q;
  const channel = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  if (sat === 0) return `#${toHex(lum).repeat(3)}`;
  return `#${toHex(channel(hue + 1 / 3))}${toHex(channel(hue))}${toHex(channel(hue - 1 / 3))}`;
}

// The ribbon banner an upgraded card wears over its header band, traced from art-references/. The
// viewBox is in card-width units, so these coordinates are literally the percentages measured from
// the art (y from the card's top edge) and the ribbon scales with the card like everything else on
// it.
const RIBBON_BAND_PATH = "M13,6.4 Q50,-12.5 87,6.4 L87,15.5 Q50,9.5 13,15.5 Z";
// A swallowtail hangs behind each end of the band: out to a point, a notch, then a lower point.
// Drawn once for the left end and mirrored for the right. Its inner end runs well under the band,
// which covers it.
const RIBBON_TAIL_PATH = "M25,9 L7,17.6 L10.5,20 L12,25.5 L21,19.5 L25,13 Z";
// Light comes from the top-right in the art, so the ribbon's shadow falls down and to the left.
const RIBBON_SHADOW_OFFSET = "translate(-0.8,1.2)";

function createUpgradeRibbon() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "upgrade-ribbon");
  svg.setAttribute("viewBox", "0 -2 100 29");
  svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
  svg.setAttribute("aria-hidden", "true");

  const group = (className, transform, paths) => {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", className);
    if (transform) g.setAttribute("transform", transform);
    for (const [d, mirrored] of paths) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      if (mirrored) path.setAttribute("transform", "translate(100,0) scale(-1,1)");
      g.appendChild(path);
    }
    return g;
  };

  const tails = [[RIBBON_TAIL_PATH, false], [RIBBON_TAIL_PATH, true]];
  const band = [[RIBBON_BAND_PATH, false]];

  // Shadow, shape, shadow, shape: the band has to cast its own shadow onto the tails, or the two
  // read as one blob rather than a band with tails hanging behind it.
  svg.append(
    group("upgrade-ribbon__shadow", RIBBON_SHADOW_OFFSET, tails),
    group("upgrade-ribbon__body", null, tails),
    group("upgrade-ribbon__shadow", RIBBON_SHADOW_OFFSET, band),
    group("upgrade-ribbon__body", null, band)
  );
  return svg;
}

function renderEquipmentCard(equipmentId, { upgraded = false, weakened = false } = {}) {
  const data = resolveEquipment(equipmentId, { upgraded, weakened });
  // A weakened card is the same card in drained colors (see dullColor); nothing else about it
  // changes, so every color it uses goes through the same transform here.
  const tint = weakened ? dullColor : (hex) => hex;

  const card = document.createElement("article");
  card.className = `equipment-card equipment-card--size-${data.size}`;
  if ([].concat(data.requirement).some(hasCaption)) card.classList.add("equipment-card--captioned");
  card.style.setProperty("--card-accent", tint(data.color.header));
  card.style.setProperty("--card-body", tint(data.color.body));
  card.style.setProperty("--card-ribbon", ribbonColor(tint(data.color.body)));
  if (data.color.slot) card.style.setProperty("--card-slot", tint(data.color.slot));
  if (upgraded) {
    card.classList.add("equipment-card--upgraded");
    card.appendChild(createUpgradeRibbon());
  }
  // No ribbon: the ribbon is upgrade art, and a weakened card has none of its own yet.
  if (weakened) card.classList.add("equipment-card--weakened");

  const header = document.createElement("header");
  header.className = "equipment-card__header";
  header.textContent = data.name;
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "equipment-card__body";

  const slots = document.createElement("div");
  slots.className = "equipment-card__slots";
  // More than two sockets don't fit a single row at the art's size and spacing; the art stacks
  // them two per row (Flamethrower+ takes four dice).
  if ([].concat(data.requirement).length > 2) slots.classList.add("equipment-card__slots--grid");
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
    list.className = "picker-list enemy-picker";
    for (const enemyId of group.enemyIds) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.className = "picker-card enemy-picker__card";
      link.href = `enemies/${enemyId}.html`;
      link.textContent = ENEMIES[enemyId].name;
      item.appendChild(link);
      list.appendChild(item);
    }
    section.appendChild(list);
    root.appendChild(section);
  }
}

// ---------- Equipment reference pages ----------

// A card's upgrade is worth showing even when it changes nothing visible, but two identical cards
// read as a bug, so say so. Same for a weakened card -- the wiki lists no weakened form at all for
// a few entries (Mystery Box), which is not the same as nobody having authored one.
const NO_VISIBLE_UPGRADE_NOTE = "Upgrading doesn't change this card.";
const NO_VISIBLE_WEAKEN_NOTE = "Weakening doesn't change this card.";

function createPageNote(text, modifier) {
  const note = document.createElement("p");
  note.className = modifier ? `upgrade-pair__note upgrade-pair__note--${modifier}` : "upgrade-pair__note";
  note.textContent = text;
  return note;
}

function createUpgradeArrow() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "upgrade-pair__arrow");
  svg.setAttribute("viewBox", "0 0 24 18");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M0,6 H13 V0 L24,9 L13,18 V12 H0 Z");
  svg.appendChild(path);
  return svg;
}

function createUpgradePairSide(heading, equipmentId, { upgraded = false, weakened = false } = {}) {
  const side = document.createElement("div");
  side.className = "upgrade-pair__side";
  const title = document.createElement("h2");
  title.className = "upgrade-pair__heading";
  title.textContent = heading;
  side.append(title, renderEquipmentCard(equipmentId, { upgraded, weakened }));
  return side;
}

// The weakened card is not downstream of the upgraded one, so an arrow into it would be a lie. A
// plain rule separates it instead: regular and upgraded are a progression, weakened is an aside.
function createPairDivider() {
  const divider = document.createElement("span");
  divider.className = "upgrade-pair__divider";
  divider.setAttribute("aria-hidden", "true");
  return divider;
}

function renderEquipmentPage(equipmentId) {
  const equipment = EQUIPMENT[equipmentId];
  const root = document.getElementById("equipment-root");

  injectIconSprite();

  const name = document.createElement("h1");
  name.className = "equipment-page__name";
  name.textContent = equipment.name;
  root.appendChild(name);

  // Three cards plus the arrow need more room than the 40rem a text page gets.
  root.classList.add("page--wide");

  const pair = document.createElement("div");
  pair.className = "upgrade-pair";
  pair.append(
    createUpgradePairSide("Regular", equipmentId),
    createUpgradeArrow(),
    createUpgradePairSide("Upgraded", equipmentId, { upgraded: true }),
    createPairDivider(),
    createUpgradePairSide("Weakened", equipmentId, { weakened: true })
  );
  root.appendChild(pair);

  // Some cards print a condition outside the card frame -- a spellbook cast cost, an activation
  // panel -- which the card itself has nowhere to show. `note` carries it (see data.js).
  if (equipment.note) root.appendChild(createPageNote(equipment.note, "condition"));

  if (Object.keys(equipment.upgrade).length === 0) {
    root.appendChild(createPageNote(NO_VISIBLE_UPGRADE_NOTE));
  }

  if (Object.keys(equipment.weaken).length === 0) {
    root.appendChild(createPageNote(NO_VISIBLE_WEAKEN_NOTE));
  }

  fitCardTitles(root);
}

// Links are relative to the search page (equipment.html at the repo root).
function renderEquipmentSearch() {
  const root = document.getElementById("equipment-search-root");
  const input = document.getElementById("equipment-search-input");

  const status = document.createElement("p");
  status.className = "equipment-search__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const list = document.createElement("ul");
  list.className = "picker-list equipment-picker";

  const items = Object.entries(EQUIPMENT).map(([equipmentId, equipment]) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.className = "picker-card equipment-picker__card";
    link.href = `equipment/${equipmentId}.html`;
    link.textContent = equipment.name;
    item.appendChild(link);
    list.appendChild(item);
    return { item, name: equipment.name.toLowerCase() };
  });

  root.append(status, list);

  // Matching hides non-matching items rather than rebuilding the list: cheaper, and every link
  // keeps its identity across keystrokes.
  function applyQuery() {
    const query = input.value.trim().toLowerCase();
    let matches = 0;
    for (const { item, name } of items) {
      const hit = name.includes(query);
      item.hidden = !hit;
      if (hit) matches++;
    }
    status.textContent = matches === 0
      ? `No equipment matches "${input.value.trim()}".`
      : `${matches} of ${items.length} shown`;
  }

  input.addEventListener("input", applyQuery);
  applyQuery();
}
