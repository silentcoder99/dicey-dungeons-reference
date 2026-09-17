// Data describing only what a player can see mid-combat, for Normal (base game) difficulty.
//
// Equipment `requirement`:
//   null                      -> no requirement, die-slot renders empty
//   { type: "max", value: N } -> die-slot renders hashed with "MAX N"
//   { type: "countdown", value: N } -> equipment self-triggers after N turns rather than
//                                       taking a die; die-slot renders solid with just N
//
// Equipment `bonusDieFace`: a fixed number the game renders as an actual die face (pips)
// instead of a digit, shown next to the die-slot. null if the equipment has no such bonus.
//
// Equipment `effect`: an ordered list of tokens describing the effect line:
//   { type: "text", text }  -> plain text
//   { type: "icon", icon }  -> a small glyph (references #icon-<icon> in the SVG sprite)
//   { type: "dieSlot" }     -> a mini empty die-slot standing in for "the placed die's value"

const EQUIPMENT = {
  broadsword: {
    name: "Broadsword",
    color: { header: "#fd5e6c", body: "#8e324a" }, // pixel-sampled from the wiki's card image
    size: 1,
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
    color: { header: "#ff9048", body: "#9e5738" }, // pixel-sampled from the wiki's card image
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
};

const ENEMIES = {
  frog: {
    name: "Frog",
    hp: 9,
    diceCount: 2,
    innateEffects: [],
    equipment: ["broadsword", "smallShield"],
  },
};
