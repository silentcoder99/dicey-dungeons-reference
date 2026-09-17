// Data describing only what a player can see mid-combat, for Normal (base game) difficulty.
// Sourced from the official wiki (https://wiki.diceydungeons.com/) -- stats from its text, and
// card colors, icons and effect wording from each equipment's card image (see README).
//
// Equipment `color`: { header, body } hex values pixel-sampled from the wiki's card image, plus
// an optional `slot` fill color for cards whose die-slot is a solid countdown box.
//
// Equipment `size`: inventory footprint, 1 or 2. Also sets the card's shape: size 1 is a wide
// card, size 2 a tall one (same width), as in the card art.
//
// Equipment `requirement`:
//   null                            -> no requirement, die-slot renders empty
//   { type: "max", value: N }       -> die-slot renders hashed with "MAX N"
//   { type: "min", value: N }       -> die-slot renders hashed with "MIN N"
//   { type: "even" } / { type: "odd" } -> die-slot renders hashed with "EVEN" / "ODD"
//   { type: "countdown", value: N } -> equipment self-triggers after N turns rather than
//                                       taking a die; die-slot renders solid with just N
//
// Equipment `bonusDieFace`: a fixed number the game renders as an actual die face (pips)
// instead of a digit, shown next to the die-slot. null if the equipment has no such bonus.
//
// Equipment `effect`: an ordered list of tokens describing the effect text, worded as on the card:
//   { type: "text", text }         -> plain text
//   { type: "icon", icon, value }  -> a small glyph (references #icon-<icon> in the SVG sprite),
//                                     optionally followed by a fixed number. Status icons (and
//                                     their number) are tinted per icon, see equipment-card.css.
//   { type: "dieSlot" }            -> a mini empty die-slot standing in for "the placed die's value"
//   { type: "lineBreak" }          -> a line break the card itself has

const EQUIPMENT = {
  broadsword: {
    name: "Broadsword",
    color: { header: "#fd5e6c", body: "#8e324a" },
    size: 2,
    requirement: null,
    bonusDieFace: 2,
    effect: [
      { type: "text", text: "Do " },
      { type: "icon", icon: "sword" },
      { type: "dieSlot" },
      { type: "text", text: " + 2 damage" },
    ],
  },
  smallShield: {
    name: "Small Shield",
    color: { header: "#ff9048", body: "#9e5738" },
    size: 1,
    requirement: { type: "max", value: 3 },
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Add " },
      { type: "icon", icon: "shield" },
      { type: "dieSlot" },
      { type: "text", text: " shield" },
    ],
  },
  shovel: {
    name: "Shovel",
    color: { header: "#ff9048", body: "#9e5738" },
    size: 2,
    requirement: null,
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Do " },
      { type: "icon", icon: "weaken" },
      { type: "dieSlot" },
      { type: "text", text: " damage," },
      { type: "lineBreak" },
      { type: "text", text: "on 6, inflict " },
      { type: "icon", icon: "weaken", value: 1 },
      { type: "text", text: " weaken" },
    ],
  },
  fireball: {
    name: "Fireball",
    color: { header: "#fd5e6c", body: "#9a3a38" },
    size: 1,
    requirement: { type: "even" },
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Deal " },
      { type: "icon", icon: "fire" },
      { type: "dieSlot" },
      { type: "text", text: " damage" },
      { type: "lineBreak" },
      { type: "text", text: "Burn " },
      { type: "icon", icon: "fire", value: 1 },
      { type: "text", text: " dice" },
    ],
  },
  magicMissile: {
    name: "Magic Missile",
    color: { header: "#cdb94b", body: "#936b2a" },
    size: 1,
    requirement: { type: "even" },
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Do " },
      { type: "icon", icon: "sword", value: 5 },
      { type: "text", text: " damage" },
    ],
  },
  magicShield: {
    name: "Magic Shield",
    color: { header: "#ff9048", body: "#ad6c40" },
    size: 1,
    requirement: { type: "odd" },
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Add " },
      { type: "icon", icon: "shield", value: 3 },
      { type: "text", text: " shield" },
    ],
  },
  rayGun: {
    name: "Ray Gun",
    color: { header: "#fd5e6c", body: "#972631" },
    size: 1,
    requirement: { type: "min", value: 3 },
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Do " },
      { type: "icon", icon: "sword", value: 3 },
      { type: "text", text: " damage" },
      { type: "lineBreak" },
      { type: "text", text: "(3 uses this turn)" },
    ],
  },
  rosewoodSpear: {
    name: "Rosewood Spear",
    color: { header: "#5da66f", body: "#457d46" },
    size: 2,
    requirement: { type: "even" },
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Do " },
      { type: "icon", icon: "sword" },
      { type: "dieSlot" },
      { type: "text", text: " damage," },
      { type: "lineBreak" },
      { type: "text", text: "gain " },
      { type: "icon", icon: "thorns", value: 2 },
      { type: "text", text: " thorns" },
    ],
  },
  slimeBall: {
    name: "Slime Ball",
    color: { header: "#b496ec", body: "#685b9e" },
    size: 1,
    requirement: { type: "even" },
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Add " },
      { type: "icon", icon: "poison", value: 2 },
      { type: "text", text: " poison" },
    ],
  },
  plasmaCannon: {
    name: "Plasma Cannon",
    color: { header: "#fd5e6c", body: "#992733", slot: "#ac2c38" },
    size: 1,
    requirement: { type: "countdown", value: 20 },
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Do " },
      { type: "icon", icon: "sword", value: 10 },
      { type: "text", text: " damage" },
    ],
  },
  woofWoofWoof: {
    name: "Woof Woof Woof",
    color: { header: "#fd5e6c", body: "#a53d40", slot: "#ac2c38" },
    size: 2,
    requirement: { type: "countdown", value: 8 },
    bonusDieFace: null,
    effect: [{ type: "text", text: "Repeat next action" }],
  },
  wolfPuppyBite: {
    name: "Wolf Puppy Bite",
    color: { header: "#cdb94b", body: "#b97c34" },
    size: 2,
    requirement: { type: "even" },
    bonusDieFace: null,
    effect: [
      { type: "text", text: "Do " },
      { type: "icon", icon: "sword", value: 4 },
      { type: "text", text: " damage" },
    ],
  },
};

// Level 1 enemies, in the wiki's enemy-list order (the picker page lists them in this order).
const ENEMIES = {
  frog: {
    name: "Frog",
    hp: 9,
    diceCount: 2,
    innateEffects: [],
    equipment: ["broadsword", "smallShield"],
  },
  gardener: {
    name: "Gardener",
    hp: 12,
    diceCount: 2,
    innateEffects: [],
    equipment: ["shovel"],
  },
  hothead: {
    name: "Hothead",
    hp: 14,
    diceCount: 2,
    innateEffects: ["Weak to ice"],
    equipment: ["fireball"],
  },
  magician: {
    name: "Magician",
    hp: 9,
    diceCount: 1,
    innateEffects: [],
    equipment: ["magicMissile", "magicShield"],
  },
  robobot: {
    name: "Robobot",
    hp: 12,
    diceCount: 3,
    innateEffects: [],
    equipment: ["rayGun"],
  },
  rose: {
    name: "Rose",
    hp: 12,
    diceCount: 2,
    innateEffects: ["Weak to fire"],
    equipment: ["rosewoodSpear"],
  },
  slime: {
    name: "Slime",
    hp: 14,
    diceCount: 2,
    innateEffects: ["Strong against poison"],
    equipment: ["slimeBall", "slimeBall"],
  },
  spaceMarine: {
    name: "Space Marine",
    hp: 14,
    diceCount: 3,
    innateEffects: [],
    equipment: ["plasmaCannon"],
  },
  wolfPuppy: {
    name: "Wolf Puppy",
    hp: 12,
    diceCount: 3,
    innateEffects: ["Strong against poison"],
    equipment: ["woofWoofWoof", "wolfPuppyBite"],
  },
};

// Lets the Node-side test suite read the same data; a no-op in the browser.
if (typeof module !== "undefined") module.exports = { EQUIPMENT, ENEMIES };
