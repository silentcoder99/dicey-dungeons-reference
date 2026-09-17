# Dicey Dungeons Reference (Prototype)

A mobile-friendly reference site for [Dicey Dungeons](https://www.diceydungeons.com/), showing
only what a player can see **mid-combat** for a given enemy: its name, dice count, max HP, any
innate effects, and its equipment (name, color, size, dice requirements, effect, and initial
state). Covers base-game ("Normal" difficulty) content only.

No build step, no framework, no external requests — open any `.html` page directly in a browser.

Visuals (card shapes, colors, die-slot/die-face icons) are hand-built with CSS/SVG to match the
game's own conventions. No game assets (sprites, card art) are embedded, since those are
copyrighted; only the layout and color conventions are recreated.

## Pages

- `frog.html` — the Frog enemy and its equipment (Broadsword, Small Shield).

## Adding a new enemy or piece of equipment

1. Add an entry to `EQUIPMENT` in `js/data.js` for any new equipment:
   - `color: { header, body }` — the two hex colors sampled from the game's card.
   - `size` — inventory footprint (not the number of dice it uses).
   - `requirement` — `null`, `{ type: "max", value: N }`, or `{ type: "countdown", value: N }`.
   - `bonusDieFace` — a fixed number the card renders as an actual die (pips) next to the
     die-slot, or `null` if it has none.
   - `effect` — an ordered array of tokens (`{ type: "text", text }`, `{ type: "icon", icon }`,
     `{ type: "dieSlot" }`) describing the effect line. One `dieSlot` token per `[]` in the
     game's own effect text.
   - If the equipment uses an icon not yet in the sprite (currently `sword`, `shield`), add a
     new `<symbol id="icon-...">` to the SVG sprite at the top of the page.
2. Add an entry to `ENEMIES` in `js/data.js`: `name`, `hp`, `diceCount`, `innateEffects` (array,
   empty if none), and `equipment` (array of equipment ids).
3. Copy `frog.html`, swap the `<title>` and the `renderEnemyPage("frog")` call at the bottom of
   the page for the new enemy's id. `js/render.js` and both stylesheets are already
   enemy-agnostic and don't need to change.

Once there's a second page, consider adding a top-level `index.html` linking to each enemy page,
and moving the per-enemy HTML files into an `enemies/` folder.
