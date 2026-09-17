# Dicey Dungeons Reference (Prototype)

A mobile-friendly reference site for [Dicey Dungeons](https://www.diceydungeons.com/), showing
only what a player can see **mid-combat** for a given enemy: its name, dice count, max HP, any
innate effects, and its equipment (name, color, size, dice requirements, effect, and initial
state — the last of these is expressed through a `countdown` requirement, see below, rather
than a separate field). Covers base-game ("Normal" difficulty) content only.

No build step, no framework, no external requests — open any `.html` page directly in a browser.

Visuals (card shapes, colors, die-slot/die-face icons) are hand-built with CSS/SVG to match the
game's own conventions. No game assets (sprites, card art) are embedded, since those are
copyrighted; only the layout and color conventions are recreated. Card colors in `js/data.js`
were pixel-sampled from the official wiki's card images (not eyeballed), and the die-slot/
die-face visuals were checked against a real rendered page (via a headless-browser screenshot)
rather than assumed to look right from the CSS alone — see "Verifying changes" below.

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

## Die-slot vs. die-face

Two visually distinct squares appear on cards, and it's easy to conflate them:

- **`.die-slot`** — a dashed-outline socket the player drops a die *into*. Empty (no fill, no
  text) when the equipment has no requirement; filled with a diagonal hash pattern and a
  "MAX N" label when it does. The hash pattern alternates between the card's own `--card-accent`
  and `--card-body` colors (sampled from the wiki's card art — it is **not** a white overlay),
  and the label text has a drop shadow so it stays legible against whichever stripe it sits on.
  A `countdown` requirement instead renders the slot solid (no dashes), showing just the number —
  this represents equipment that self-triggers after N turns rather than taking a die.
- **`.die-face`** — a solid die showing pip dots, used where the game depicts a fixed number as
  an actual die rather than a digit (e.g. Broadsword's flat "+2" bonus) and for the generic
  "these are dice" icon next to an enemy's dice count. Never used as a die-slot's fill.

Pips are positioned with explicit `left`/`top` percentages set in `render.js`
(`PIP_POSITION_PERCENT`), not CSS Grid + `aspect-ratio` — that combination rounds unpredictably
once the die face is only a few pixels across (e.g. the mini header icon), producing pips that
were visibly non-circular and unevenly spaced. Percentage positioning on a square element is
exact at any size.

## Verifying changes

There's no automated test suite, but two lightweight, throwaway checks are worth re-running after
editing `render.js`/`data.js`/the CSS (install into a scratch directory, not this repo):

- **Functional DOM check**: load `frog.html`'s scripts into `jsdom` and assert on the rendered
  structure (card count, slot/die-face composition, text content). Catches logic regressions
  without needing a browser.
- **Visual check**: install `playwright` + a headless Chromium (`npx playwright install chromium`,
  plus `npx playwright install-deps chromium` for the OS libraries it needs) and screenshot
  `frog.html` at a mobile and a desktop viewport. Catches things a DOM check can't, like the
  pip-rounding and low-contrast issues fixed above — actually rendering it is what surfaced them.
