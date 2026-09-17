# Dicey Dungeons Reference (Prototype)

A mobile-friendly reference site for [Dicey Dungeons](https://www.diceydungeons.com/), showing
only what a player can see **mid-combat** for a given enemy: its name, dice count, max HP, any
innate effects, and its equipment (name, color, size, dice requirements, effect, and initial
state — the last of these is expressed through a `countdown` requirement, see below, rather
than a separate field). Covers base-game ("Normal" difficulty) content only.

No build step, no framework, no external requests — open any `.html` page directly in a browser.

All content is sourced from the official wiki: **https://wiki.diceydungeons.com/** — enemy stats
from its text (`doku.php?do=export_raw&id=enemies:<name>` gives the raw page), and each card's
colors, icons, slot styling and effect wording from that equipment's **card image**.

Visuals (card shapes, colors, die-slot/die-face icons) are hand-built with CSS/SVG to match the
game's own conventions. No game assets (sprites, card art) are embedded, since those are
copyrighted; only the layout and color conventions are recreated. Card colors in `js/data.js`
were pixel-sampled from the official wiki's card images (not eyeballed). The site itself still has
no build step, but there is an automated test suite (Playwright) that renders the pages in a real
browser and checks both content/structure and visual appearance — see "Tests" below.

## Pages

- `index.html` — the enemy picker: links to every enemy page, generated from `ENEMIES` in
  `js/data.js`. Each enemy page has a back-link to it.
- `enemies/<enemyId>.html` — one page per enemy. The filename is the enemy's key in `ENEMIES`
  (e.g. `enemies/spaceMarine.html`). Currently all nine Level 1 enemies: Frog, Gardener, Hothead,
  Magician, Robobot, Rose, Slime, Space Marine, Wolf Puppy.

## Adding a new enemy or piece of equipment

**Check the wiki's card image before writing any equipment data.** The wiki's text (stat tables
and "Effect" column) does not describe everything visible on a card, and sometimes words it
differently. Writing the Level 1 cards turned up all of these, none of them in the text:

- effect wording and line breaks differ (e.g. Ray Gun's text says "3 uses per turn", its card
  says "(3 uses this turn)"; Shovel's card says "on 6, inflict 1 weaken");
- icons aren't implied by the words (Shovel's damage uses the *weaken* icon, not a sword);
- status icons, and the number printed right after one, are tinted per status;
- countdown slots are a solid box with an accent-colored border and their own fill color;
- EVEN/ODD are printed larger than MAX/MIN's label.

The image is at `https://wiki.diceydungeons.com/lib/exe/fetch.php?media=equipment:<file>.png`,
where `<file>` is the image name in the equipment page's raw text (usually the page id, but not
always — Small Shield's is `smallshield.png`).

1. Add an entry to `EQUIPMENT` in `js/data.js` for any new equipment:
   - `color: { header, body }` — the two hex colors pixel-sampled from the card image. Cards
     with a countdown requirement also need `slot`, the countdown box's fill color.
   - `size` — inventory footprint (not the number of dice it uses), 1 or 2. Also sets the card's
     shape: size-2 cards are the tall ones in the card art.
   - `requirement` — `null`, `{ type: "max", value: N }`, `{ type: "min", value: N }`,
     `{ type: "even" }`, `{ type: "odd" }`, or `{ type: "countdown", value: N }`.
   - `bonusDieFace` — a fixed number the card renders as an actual die (pips) next to the
     die-slot, or `null` if it has none.
   - `effect` — an ordered array of tokens describing the effect text, worded exactly as on
     the card: `{ type: "text", text }`, `{ type: "icon", icon, value }` (`value` optional — a
     fixed number printed right after the icon), `{ type: "dieSlot" }` (one per `[]` in the
     game's effect text), and `{ type: "lineBreak" }`.
   - If the equipment uses an icon not yet in the sprite (currently `sword`, `shield`, `fire`,
     `poison`, `weaken`, `thorns`), add a new `<symbol id="icon-...">` to the SVG sprite in
     **every** page under `enemies/` (they're kept identical), and, if the card tints it, a
     `.glyph--<icon>, .effect-value--<icon>` color rule in `css/equipment-card.css`.
2. Add an entry to `ENEMIES` in `js/data.js`: `name`, `hp`, `diceCount`, `innateEffects` (array,
   empty if none), and `equipment` (array of equipment ids; repeat an id for multiple copies).
3. Copy any page in `enemies/` to `enemies/<enemyId>.html` and swap its `<title>` and the
   `renderEnemyPage("...")` call in its last `<script>` for the new enemy's id. `js/render.js`
   doesn't render anything by itself — each page calls it. The picker lists the new enemy
   automatically; `js/render.js` and both stylesheets are enemy-agnostic.
4. Run the tests (see "Tests"). The page and visual tests loop over the data, so a new enemy and
   its cards are covered without writing a new test: errors, stats, card names, effect text, card
   shape and fit, and a new snapshot per new card (generate it with
   `npm run test:update-snapshots`).
5. **Spot-check every new card by eye against its wiki card image**, side by side at the same
   width: shape, header/body colors, die-slot style and hatching, die-face and pips, icons and
   their tints, and wording/line breaks/placement. Do this *before* accepting the card's new
   snapshot — a snapshot only catches later *changes*, not a card that was wrong from the start.

## Card geometry

Cards are a proportional replica of the wiki's card art. Everything inside a card is sized in
`cqw` (percent of the card's width — the card is a CSS size container), so the card keeps the
art's proportions at any width. The numbers in `css/equipment-card.css` were measured from the
wiki card images and averaged across cards (they agree to within a percent or so):

- Shape: width ÷ height is **1.316** for size-1 cards and **0.882** for size-2 cards.
- Header band **12.9%** of card width tall; the body is an inset panel **3%** inside the accent
  frame.
- Slot, countdown box and die-face are all **31.6%** of card width, side by side **9.4%** apart.
  Their centre sits at **45.5%** (size 1) / **50.5%** (size 2) of card height, and the effect
  text is centred at **82%** / **85.5%**, regardless of how many lines it has.
- Hatching runs `/`, in the accent colour over the body, lines **1.55%** of the slot wide every
  **3.75%** of the slot. The art's lines are hand-drawn and uneven; these are the averages, drawn
  evenly.
- A card die-face is **75% white over the card's body color**; its pips are the body color,
  **18.5%** of the face across, centred **16.5% / 83.5%** in, along the top-right/bottom-left
  diagonal.
- Text sizes come from the art's cap heights (title 6.4%, effect lines ~7.6%, MIN/MAX label
  4.4% over a 6.9% value, EVEN/ODD 4.7%, countdown number 14%), converted with the site
  font's ~0.72 cap-height ratio.

The one remaining deliberate difference: the art uses a condensed hand-lettered font that the site
doesn't have (it avoids embedding assets), so titles and text look wider and rounder. The
page tests check that every title still fits on one line and no effect line wraps beyond the card's
own line breaks.

## Die-slot vs. die-face

Two visually distinct squares appear on cards, and it's easy to conflate them:

- **`.die-slot`** — a dashed-outline socket the player drops a die *into*. Empty (no fill, no
  text) when the equipment has no requirement; filled with fine diagonal hatching and a
  "MAX N" / "MIN N" / "EVEN" / "ODD" label when it does. The hatching is thin `--card-accent`
  lines over `--card-body` (as in the wiki's card art — it is **not** a white overlay); lines
  that fine leave the label legible without a drop shadow. A `countdown` requirement instead
  renders a solid box with an accent-colored border, its own fill (`--card-slot`) and just the
  number — this represents equipment that self-triggers after N turns rather than taking a die.
- **`.die-face`** — a solid die showing pip dots, used where the game depicts a fixed number as
  an actual die rather than a digit (e.g. Broadsword's flat "+2" bonus) and for the generic
  "these are dice" icon next to an enemy's dice count. Never used as a die-slot's fill. On a card
  it follows the art (see "Card geometry"); the header icon isn't card art and keeps its own
  plain look and larger pips.

Pips are positioned with explicit `left`/`top` percentages set in `render.js`
(`PIP_POSITION_PERCENT` for cards, `MINI_PIP_POSITION_PERCENT` for the header icon), not CSS
Grid + `aspect-ratio` — that combination rounds unpredictably once the die face is only a few
pixels across (e.g. the mini header icon), producing pips that were visibly non-circular and
unevenly spaced. Percentage positioning on a square element is exact at any size.

## Tests

Automated tests (Playwright) live in `tests/`. They render the real pages in a real headless
browser rather than relying on CSS looking right on paper — that's what caught the pip-rounding
and low-contrast issues fixed in this project's history.

```bash
npm install
npx playwright install --with-deps chromium   # one-time; downloads the browser + OS libraries
npm test
```

Four kinds of test, all under `tests/`. `tests/helpers.js` loads `js/data.js` in Node, so the
tests read enemy/equipment data from the same source as the pages instead of a copied list.

- **`unit.spec.js`** — calls the pure DOM-building functions from `js/render.js` directly (e.g.
  `createDieSlot`, `createDieFace`, `renderEffectTokens`) via `page.evaluate` and asserts on the
  DOM they produce. Fastest, most targeted; runs once (`functional` project).
- **`page.spec.js`** — loads the real enemy pages. For *every* enemy in `ENEMIES`: stats, innate
  effects, card names and effect text match the data, the back-link exists, there are no console
  errors and no non-`file://` network requests (nothing hotlinked from the wiki). Every card has
  its size's aspect ratio and its content fits: title on one line, no extra effect-line wrapping,
  slots and text inside the body panel without overlapping (cards clip overflow, so this would
  otherwise fail silently). Deeper checks of slot/die-face/icon composition for Frog, Magician,
  Hothead and Space Marine, which between them use every die-slot style. Also runs once.
- **`picker-page.spec.js`** — loads `index.html`: one link per enemy with the right href and
  name, and clicking each one then its back-link round-trips. Also runs once.
- **`visual.spec.js`** — pixel snapshot tests (`toHaveScreenshot`) of **every equipment card**
  (one per id in `EQUIPMENT`, named `<kebab-case id>-card.png`), full pages (Frog, Magician,
  Hothead, the picker), and close-ups (the die-face pips, the header's dice icon, two tinted
  effect lines). Close-ups exist because a larger diff can average a small regression below the
  diff threshold (a whole card didn't register an icon changing color); a tight crop on just that
  element can't hide it. This one runs twice, once per viewport project (`visual-mobile` using a
  Pixel 5 profile, `visual-desktop` at 1200×900) — see `playwright.config.js`. Snapshots lock
  cards in *after* they've been checked by eye against their wiki image; they can't tell whether
  a card matched the wiki in the first place.

Baseline snapshots are committed under `tests/visual.spec.js-snapshots/`. When a change
intentionally alters appearance, review the diff Playwright reports, then regenerate baselines
with:

```bash
npm run test:update-snapshots
```

Snapshot filenames encode the OS they were generated on (currently `linux`). Regenerating them on
a different platform will produce differently-named baselines rather than overwrite the existing
ones — keep snapshot generation on one consistent platform (or add CI that runs on that platform)
to avoid baseline drift.
