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
  `js/data.js` and grouped under a heading per level (Level 1–5), then Bosses, with a divider
  between groups. Each enemy page has a back-link to it.
- `enemies/<enemyId>.html` — one page per enemy. The filename is the enemy's key in `ENEMIES`
  (e.g. `enemies/spaceMarine.html`). Covers every enemy and boss on the wiki's enemy list except
  Jester and Lady Luck.

Some enemies don't have a simple fixed loadout. Their pages show what the player can see:

- **Mimic** shows only its Mystery Box card, since its real item is hidden mid-combat.
- **Copycat** has no cards, only a note that it copies the player's equipment.
- **Sorceress** and **Aurora** show their fixed cards, then a section with every card their random
  slots can be.
- **Alchemist**, **Keymaster** and **Crystalina** show their starting cards, then a section with the
  cards they gain mid-fight (Bear Maul, Keyblade, the crystal weapons).

## Adding a new enemy or piece of equipment

**Check the wiki's card image before writing any equipment data.** The wiki's text (stat tables
and "Effect" column) does not describe everything visible on a card, and sometimes words it
differently. Writing the cards turned up all of these, none of them in the text:

- effect wording and line breaks differ (e.g. Ray Gun's text says "3 uses per turn", its card
  says "(3 uses this turn)"; Shovel's card says "on 6, inflict 1 weaken");
- icons aren't implied by the words (Shovel's damage uses the *weaken* icon, not a sword);
- status icons, and the number printed right after one, are tinted per status;
- countdown slots are a solid box with an accent-colored border and their own fill color;
- EVEN/ODD are printed larger than MAX/MIN's label;
- "Require N" is drawn as N grey pips in the socket with "NEEDS N" under it, and "Doubles" as two
  sockets joined by "=" with "NEEDS DOUBLES" under them;
- notes like "(2 uses this turn)", "(once per battle)" and "(Reuseable)" are printed dimmer;
- some status names are printed in their status color right after the icon ("Weakens", "Confuse",
  "Vanish");
- art behind a card can tint parts of its body, so sample the body color from plain panel areas.

The image is at `https://wiki.diceydungeons.com/lib/exe/fetch.php?media=equipment:<file>.png`,
where `<file>` is the image name in the equipment page's raw text (usually the page id, but not
always — Small Shield's is `smallshield.png`).

0. Fetch the wiki pages and images with `scripts/fetch-wiki.js` rather than by hand, so requests
   go out one at a time and are never repeated:

   ```bash
   npm run fetch-wiki -- page:enemies:frog page:equipment:broadsword media:equipment:broadsword.png
   npm run fetch-wiki -- --list targets.txt   # one target per line, # comments allowed
   ```

   - **Pacing:** requests are sent one at a time, at least 6 seconds apart (`--delay` can only
     make the gap longer). The script waits out 429/503 responses as their `Retry-After` asks.
   - **Cache:** files are saved under `.wiki-cache/` (gitignored, so no wiki art is committed),
     and anything already there is never requested again.
   - **Validation:** a page must come back as raw text and an image as a real PNG, or nothing is
     saved.
   - **Bot check:** the wiki sometimes answers with a "Please wait while your request is being
     verified" page instead. The script never tries to get past it. It retries the same URL
     after 2, 5, 10, 20 and 30 minutes, then stops and lists what it didn't fetch. If that
     happens, try again later.

1. Add an entry to `EQUIPMENT` in `js/data.js` for any new equipment:
   - `color: { header, body }` — the two hex colors pixel-sampled from the card image. Cards
     with a countdown requirement also need `slot`, the countdown box's fill color.
   - `size` — inventory footprint (not the number of dice it uses), 1 or 2. Also sets the card's
     shape: size-2 cards are the tall ones in the card art.
   - `requirement` — `null`, `{ type: "max", value: N }`, `{ type: "min", value: N }`,
     `{ type: "even" }`, `{ type: "odd" }`, `{ type: "countdown", value: N }`,
     `{ type: "exact", value: N }` ("Require N"), or `{ type: "doubles" }`. Use an array for a
     card with several sockets, one entry each (e.g. `[null, null]` for Spanner).
   - `bonusDieFace` — a fixed number the card renders as an actual die (pips) next to the
     die-slot, or `null` if it has none.
   - `effect` — an ordered array of tokens describing the effect text, worded exactly as on
     the card: `{ type: "text", text }` (add `muted: true` for a dimmed note),
     `{ type: "icon", icon, value }` (`value` optional — a fixed number, or a status name, printed
     right after the icon in its tint), `{ type: "dieSlot" }` (one per `[]` in the game's effect
     text), and `{ type: "lineBreak" }`.
   - If the equipment uses an icon not yet in `ICON_SYMBOLS` in `js/icons.js` (currently
     `sword`, `shield`, `fire`, `poison`, `weaken`, `thorns`, `shock`, `ice`, `heal`,
     `drain`, `blind`, `lock`, `gold`, `vanish`, `confuse`), add a hand-drawn 24×24 symbol
     there. It's injected into every page as a hidden sprite. If the card tints the icon, also add a
     `.glyph--<icon>, .effect-value--<icon>` color rule in `css/equipment-card.css`.
2. Add an entry to `ENEMIES` in `js/data.js`: `name`, `level` (1–5, or `boss: true` instead),
   `hp`, `diceCount`, `innateEffects` (array, empty if none), and `equipment` (array of equipment
   ids; repeat an id for multiple copies). Keep entries in the wiki's enemy-list order; the picker
   groups them by level in that order. Optionally:
   - `equipmentNote` — a note shown under the Equipment heading;
   - `extraEquipment: [{ heading, equipment }]` — extra headed sections of cards the player may
     also see (a random loadout's possibilities, or cards gained mid-fight).
3. Copy any page in `enemies/` to `enemies/<enemyId>.html` and swap its `<title>` and the
   `renderEnemyPage("...")` call in its last `<script>` for the new enemy's id. `js/render.js`
   doesn't render anything by itself — each page calls it. The picker lists the new enemy
   automatically; `js/render.js` and both stylesheets are enemy-agnostic.
4. Run the tests (see "Tests"). The page, data and visual tests loop over the data, so a new enemy
   and its cards are covered without writing a new test: errors, stats, sections, card names,
   effect text, card shape and fit, page/data consistency, and a new snapshot per new card
   (generate it with `npm run test:update-snapshots`).
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
  4.4% over a 6.9% value, EVEN/ODD 4.7%, countdown number 14%, NEEDS caption 4.1%), converted with
  the site font's ~0.72 cap-height ratio.
- Captioned sockets ("NEEDS N", "NEEDS DOUBLES"): on size-1 cards the socket moves up to
  **40.5%** of card height with the caption right under it; size-2 cards keep the usual
  positions, with a small gap above the caption. Pips in a "Require N" socket are grey
  (`#b3b3b3`), **17%** of the socket, at the die-face pip centres. Doubles sockets are **3.1%**
  apart, joined by two grey (`#8c8b8b`) bars **7.2%** wide and **2.8%** tall.
- A title too long for the header (e.g. Two Handed Sword) is shrunk to fit, as the art does.

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
  An `exact` ("Require N") requirement keeps the empty dashed socket but shows N small grey pips
  inside it, with its "NEEDS N" caption underneath. These pips mark the value the socket accepts;
  they are not a die-face.
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

Five kinds of test, all under `tests/`. `tests/helpers.js` loads `js/data.js` in Node, so the
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
  Hothead and Space Marine, which between them use the original die-slot styles; the newer
  captioned, doubles and multi-socket styles are covered by `unit.spec.js` and the card
  snapshots. Also runs once.
- **`picker-page.spec.js`** — loads `index.html`: one headed section per level then Bosses, in
  order and split by dividers, each with the right links in data order; every enemy linked exactly
  once; clicking each link then its back-link round-trips. Also runs once.
- **`data.spec.js`** — checks `js/data.js` and `enemies/` in Node: levels, equipment references,
  every equipment entry used by some enemy, every icon and requirement type drawable, and one page
  per enemy calling `renderEnemyPage` with its own id. Also runs once.
- **`visual.spec.js`** — pixel snapshot tests (`toHaveScreenshot`) of **every equipment card**
  (one per id in `EQUIPMENT`, named `<kebab-case id>-card.png`), full pages (Frog, Magician,
  Hothead, Keymaster, Scathach, the picker), and close-ups (the die-face pips, the header's dice
  icon, and an effect line for each tinted icon). Close-ups exist because a larger diff can average a small regression below the
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
