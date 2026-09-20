# Dicey Dungeons Reference (Prototype)

A mobile-friendly reference site for [Dicey Dungeons](https://www.diceydungeons.com/), answering
two questions:

- **What will this enemy hit me with?** For a given enemy, only what a player can see
  **mid-combat**: its name, dice count, max HP, any innate effects, and its equipment (name, color,
  size, dice requirements, effect, and initial state — the last of these is expressed through a
  `countdown` requirement, see below, rather than a separate field).
- **If I buy this, what does it upgrade into?** For a given piece of equipment, its regular card and
  its upgraded card side by side.

Covers base-game ("Normal" difficulty) content only.

No build step, no framework, no external requests — open any `.html` page directly in a browser.

All content is sourced from the official wiki: **https://wiki.diceydungeons.com/** — enemy stats
from its text (`doku.php?do=export_raw&id=enemies:<name>` gives the raw page), and each card's
colors, icons, slot styling and effect wording from that equipment's **card image**.

Visuals (card shapes, colors, die-slot/die-face icons) are hand-built with CSS/SVG to match the
game's own conventions. No game assets (sprites, card art) are embedded, since those are
copyrighted; only the layout and color conventions are recreated. The screenshots in
`art-references/` are the exception: they are the only reference for what an upgraded card looks
like, since the wiki has none, and nothing on the site links to them. Card colors in `js/data.js`
were pixel-sampled from the official wiki's card images (not eyeballed). The site itself still has
no build step, but there is an automated test suite (Playwright) that renders the pages in a real
browser and checks both content/structure and visual appearance — see "Tests" below.

## Pages

- `index.html` — the site root: two cards, one per reference section. Nothing on it is
  data-driven, so it loads no scripts at all.
- `enemies.html` — the enemy picker: links to every enemy page, generated from `ENEMIES` in
  `js/data.js` and grouped under a heading per level (Level 1–5), then Bosses, with a divider
  between groups. Each enemy page has a back-link to it.
- `enemies/<enemyId>.html` — one page per enemy. The filename is the enemy's key in `ENEMIES`
  (e.g. `enemies/spaceMarine.html`). Covers every enemy and boss on the wiki's enemy list except
  Jester and Lady Luck.
- `equipment.html` — the equipment search: a live-filtered list of every entry in `EQUIPMENT`,
  matched on a case-insensitive substring of the name. The project's only interactive control.
- `equipment/<equipmentId>.html` — one page per piece of equipment, showing its regular card and
  its upgraded card side by side. The filename is the equipment's key in `EQUIPMENT`
  (e.g. `equipment/battleAxe.html`).

Equipment the player can only get by stealing from an enemy is listed like everything else —
several classes can steal, so every card in `EQUIPMENT` is one a player may end up holding.

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

**Upgrade data is the one place the card image can't settle it.** The wiki has no upgraded card
image — only one image per equipment — so an `upgrade` override is derived from the
`Upgraded Effect` / `Upgraded Requirements` / `Upgraded Size` rows of the equipment's raw page
instead. Three things to watch:

- Apply the wiki row's **delta** to the base card's existing tokens rather than transcribing the
  wiki's prose, which words things differently (Campfire's card reads `fire 1 dmg, burn a dice`
  where the wiki says "Deal 1 fire damage, burn a dice"; its upgrade is "a dice" → "two dice").
- The wiki text is not complete. Snowball's upgraded card gains a die-face that only
  `art-references/snowball_upgrade.png` shows; the table has only the "+ 1". Where an upgrade adds a
  flat `+ N` to a die-slot's value, the card draws that N as a die-face *and* prints it, the way
  Broadsword's base card already does.
- Some pages carry a **second stats table** for the enemy/Jester version of the card (Battle Axe,
  Electromagnet, Hammer, Sneeze, Spike). This site's equipment pages are about what the player buys,
  so the first table is the one that counts.

Effect text is limited to **two lines**: a third overflows the body panel on a size-2 card, which
`tests/equipment-page.spec.js` will catch.

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

1. Read the card's colors out of its image with `scripts/sample-card-colors.js` rather than
   picking them by eye:

   ```bash
   npm run sample-card -- broadsword                      # a name under .wiki-cache/media/equipment/
   npm run sample-card -- buckler --at 50,46              # the exact color at a point
   npm run sample-card -- punchline --rect 5,40,20,70     # the commonest colors in a rectangle
   ```

   With no flags it prints the image's size, the card size its width/height ratio implies, and
   the commonest color in the header band, the body panel, and the countdown box. Sampled this
   way it reproduces the header of every existing card exactly and the body of all but the four
   whose art bleeds through the panel — where the two body strips disagree, that's the tell, and
   the flat panel color is the one to take. An image with chrome outside the card (a spellbook
   bar, an activation panel, a "FINALE CARD" banner) needs `--rect`/`--at` against what the
   image actually shows, since the default regions assume the image *is* the card.

2. Add an entry to `EQUIPMENT` in `js/data.js` for any new equipment:
   - `color: { header, body }` — the two hex colors sampled above. Cards with a countdown
     requirement also need `slot`, the countdown box's fill color.
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
   - `upgrade` — what changes when the player upgrades it, as a partial override merged over the
     entry: only the fields that actually change, and `{}` if the upgrade changes nothing the card
     shows. Allowed keys are `size`, `requirement`, `bonusDieFace` and `effect`; the "+" on the name
     and the ribbon are the renderer's job, and the colors never change. See "Upgraded cards".
   - If the equipment uses an icon not yet in `ICON_SYMBOLS` in `js/icons.js` (currently
     `sword`, `shield`, `fire`, `poison`, `weaken`, `thorns`, `shock`, `ice`, `heal`,
     `drain`, `blind`, `lock`, `gold`, `vanish`, `confuse`), add a hand-drawn 24×24 symbol
     there. It's injected into every page as a hidden sprite. If the card tints the icon, also add a
     `.glyph--<icon>, .effect-value--<icon>` color rule in `css/equipment-card.css`.
3. Add an entry to `ENEMIES` in `js/data.js`: `name`, `level` (1–5, or `boss: true` instead),
   `hp`, `diceCount`, `innateEffects` (array, empty if none), and `equipment` (array of equipment
   ids; repeat an id for multiple copies). Keep entries in the wiki's enemy-list order; the picker
   groups them by level in that order. Optionally:
   - `equipmentNote` — a note shown under the Equipment heading;
   - `extraEquipment: [{ heading, equipment }]` — extra headed sections of cards the player may
     also see (a random loadout's possibilities, or cards gained mid-fight).
4. Copy any page in `enemies/` to `enemies/<enemyId>.html` and swap its `<title>` and the
   `renderEnemyPage("...")` call in its last `<script>` for the new enemy's id. Do the same from
   `equipment/` for any new equipment, swapping the `renderEquipmentPage("...")` call.
   `js/render.js` doesn't render anything by itself — each page calls it. The picker and the
   search list the new entry automatically; `js/render.js` and both stylesheets are content-agnostic.
5. Run the tests (see "Tests"). The page, data and visual tests loop over the data, so a new enemy
   and its cards are covered without writing a new test: errors, stats, sections, card names,
   effect text, card shape and fit, page/data consistency, and a new snapshot per new card
   (generate it with `npm run test:update-snapshots`).
6. **Spot-check every new card by eye against its wiki card image**, side by side at the same
   width: shape, header/body colors, die-slot style and hatching, die-face and pips, icons and
   their tints, and wording/line breaks/placement. Do this *before* accepting the card's new
   snapshot — a snapshot only catches later *changes*, not a card that was wrong from the start.
7. For an upgraded card there is no wiki image to check against, so check the *rule* instead: render
   Battle Axe and Snowball (both in `EQUIPMENT` and both covered by `art-references/`) beside their
   screenshots at the same width. Those two between them exercise a size change, an added die-face
   and an extra effect line.

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

One deliberate difference throughout: the art uses a condensed hand-lettered font that the site
doesn't have (it avoids embedding assets), so titles and text look wider and rounder. The
page tests check that every title still fits on one line and no effect line wraps beyond the card's
own line breaks.

## Upgraded cards

An `equipment/<id>.html` page draws the card twice: once from the entry, once with its `upgrade`
override applied. The upgraded one gets a `+` on its title and wears the game's ribbon banner. Its
shape comes from the resolved `size`, so an upgrade that shrinks the equipment (Battle Axe, Hammer,
Electromagnet) renders a size-1 card beside a size-2 one.

The ribbon was traced from the four screenshots in `art-references/` — a gold, a red, a green and
a blue card, which is what settled the colour rule. Unlike `.wiki-cache/`, that directory is
committed: it is the only reference for any of this, since the wiki has no upgraded card art.

- **Colour is derived from the card, not fixed.** The ribbon is the card's own `color.body`
  lightened by 8% in HSL, hue and saturation held — `ribbonColor()` in `js/render.js`, set on the
  card as `--card-ribbon`. Anchor: Battle Axe's `#9f7226` gives `#c08a2e` against the art's
  `#c0882f`. Computed rather than stored, so every card gets a ribbon without 122 more sampled hexes.
- **The band and its tails are one flat colour.** The only other tone is the shadow the ribbon casts,
  which measured as the body multiplied by ~0.66 on all four cards, so it is drawn as translucent
  black (34%) and holds over any palette. The band is drawn over its own shadow so it casts one onto
  the tails too — without that the band and tails read as a single blob.
- **Geometry is in card-width units**, like everything else on a card: the SVG's viewBox is
  `0 -2 100 29`, so a path coordinate is a percentage of the card's width with y measured from the
  card's top edge. It measured identically on Battle Axe and Bump. The band's top edge arcs from
  ~6.4 at x13 up to ~-3 at centre; its bottom runs ~12.5 at centre (just past the 12.9 header band)
  down to ~15.5 at the ends. The swallowtails run from x7 and x93 back under the band, hanging to
  y ~25.5.
- **The title prints on the band**, which is narrower than the header, so
  `.equipment-card--upgraded .equipment-card__header` has a wider padding — that alone is enough
  for the existing `fitCardTitles()` to shrink a long "+" title to the band rather than the card.
- A card that gains a `countdown` on upgrade (Dire Wolf Howl) has no sampled `slot` colour for the
  countdown box, so it falls back to the card's body colour.

Two more deliberate differences from the art: the card clips the ~1.6% of the ribbon's crown that
overhangs its top edge (`.equipment-card` has `overflow: hidden`, which the card's rounded corners
and the content-fit tests both depend on), and the ribbon's colour follows `js/data.js`'s
wiki-sampled body colour, which for some cards is not the colour an in-game screenshot shows.

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

Seven spec files, all under `tests/`. `tests/helpers.js` loads `js/data.js` in Node, so the
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
- **`picker-page.spec.js`** — loads `enemies.html`: one headed section per level then Bosses, in
  order and split by dividers, each with the right links in data order; every enemy linked exactly
  once; clicking each link then its back-link round-trips. Also runs once.
- **`home-page.spec.js`** — loads `index.html`: exactly the two section cards, in order, each
  round-tripping to its page and back via that page's back-link.
- **`search-page.spec.js`** — loads `equipment.html`: every equipment listed once in data order;
  filtering by a case-insensitive substring, including mid-name; the empty state and the live count;
  clearing restores everything. Round-trips a handful of representative links rather than all 122,
  which would dominate the suite's runtime — the full link list is asserted separately.
- **`equipment-page.spec.js`** — the equipment counterpart of `page.spec.js`. For *every* entry in
  `EQUIPMENT`: both cards render with no console errors or external requests, the regular one matches
  the entry and the upgraded one matches the entry with its `upgrade` applied (name, effect text,
  its size's aspect ratio), only the upgraded card has the ribbon, and both cards' content fits the
  same way the enemy pages' does. Then the upgrades that change a card's layout — Battle Axe's
  size, Snowball's die-face, Ice Age's sockets, Tower Shield's dropped requirement.
- **`data.spec.js`** — checks `js/data.js`, `enemies/` and `equipment/` in Node: levels, equipment
  references, every equipment entry used by some enemy, every icon and requirement type drawable in
  **both** a card's forms, every entry carrying an `upgrade` override whose keys are ones the card
  shows and which never restates a value the base already has, one page per enemy calling
  `renderEnemyPage` and one per equipment calling `renderEquipmentPage` with its own id, and every
  enemy page linking back to `enemies.html`. Also runs once.
- **`visual.spec.js`** — pixel snapshot tests (`toHaveScreenshot`) of **every equipment card** in
  both forms: the regular one from the enemy page that carries it (`<kebab-case id>-card.png`) and
  the upgraded one from its equipment page (`<kebab-case id>-card-upgraded.png`). Plus full pages
  (Frog, Magician, Hothead, Keymaster, Scathach, the picker, the home page, the search page filtered
  and unfiltered, and the Battle Axe and Snowball equipment pages), a close-up of the upgrade ribbon,
  and close-ups (the die-face pips, the header's dice
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
