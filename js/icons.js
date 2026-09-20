// Hand-built icon glyphs (no game assets embedded), injected into each page as one hidden SVG
// sprite by injectIconSprite() in render.js; effect tokens reference them as #icon-<name>.
// Each value is the inner markup of a 24x24 <symbol>.
const ICON_SYMBOLS = {
  sword: `
    <g transform="rotate(45 12 12)">
      <rect x="9.8" y="1.5" width="4.4" height="13.5" rx="0.8"></rect>
      <rect x="5.5" y="14.5" width="13" height="3.2" rx="0.8"></rect>
      <rect x="9.8" y="17.2" width="4.4" height="5.3" rx="0.8"></rect>
    </g>
  `,
  shield: `
    <path d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z"></path>
  `,
  // Damage reduction, which the armor cards draw as a dome with a heart cut out of it and two
  // blows glancing off the bottom -- not the plain shield of the shield cards.
  armor: `
    <path fill-rule="evenodd" d="M12 1.8c-5 0-9 4-9 9v7.4h18V10.8c0-5-4-9-9-9zm0 14.1c-3-2.8-4.6-4.3-4.6-6.1a2.55 2.55 0 0 1 4.6-1.5 2.55 2.55 0 0 1 4.6 1.5c0 1.8-1.6 3.3-4.6 6.1z"></path>
    <g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
      <path d="M2.4 20.3 6.6 22.6M21.6 20.3 17.4 22.6"></path>
    </g>
  `,
  fire: `
    <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
      <path d="M12 2c.8 3.6 3.4 5.6 5.2 8.1 1.2 1.7 2 3.4 2 5.5 0 3.9-3.2 6.9-7.2 6.9s-7.2-3-7.2-6.9c0-2.8 1.3-4.9 3.2-6.6.2 1.6.9 2.8 2 3.6C9.9 8.8 11 5.4 12 2z"></path>
      <path d="M12 13.2c-1.7 1.5-2.8 2.9-2.8 4.5 0 1.6 1.2 2.8 2.8 2.8s2.8-1.2 2.8-2.8c0-1.6-1.1-3-2.8-4.5z"></path>
    </g>
  `,
  poison: `
    <path fill-rule="evenodd" d="M9.5 7a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zM7.2 9.6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"></path>
    <circle cx="17.8" cy="5" r="3"></circle>
    <circle cx="21" cy="11" r="1.9"></circle>
  `,
  weaken: `
    <path fill-rule="evenodd" d="M12 2.5c4.8 0 9.5 5.4 9.5 11.2 0 4.8-3.8 7.8-9.5 7.8S2.5 18.5 2.5 13.7C2.5 7.9 7.2 2.5 12 2.5zM13.9 5.8 8.4 13.2h3.4l-2 6.4 5.8-8.7h-3.4l1.7-5.1z"></path>
  `,
  thorns: `
    <g transform="rotate(45 12 12)">
      <path d="M12 1l1.6 6 3.9-1.5-3.5 4.5v4l4.5 1.5-4.5 2-.8 5.5h-2.4l-.8-5.5-4.5-2 4.5-1.5v-4L6.5 5.5l3.9 1.5z"></path>
    </g>
  `,
  // A die seen in three-quarter view, as Illuminate draws it: a filled hexagon silhouette with
  // its three face edges and three pips punched back out (fill-rule: evenodd), so the card body
  // shows through them the way the pips on a die-face do.
  dice: `
    <path fill-rule="evenodd" d="M12 2.2 21.5 7.6 21.5 16.4 12 21.8 2.5 16.4 2.5 7.6Z
      M12.25 11.46 2.75 7.06 2.25 8.14 11.75 12.54Z
      M11.75 11.46 21.25 7.06 21.75 8.14 12.25 12.54Z
      M11.4 12.4h1.2v9h-1.2Z
      M10.7 7.1a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0Z
      M6 14.2a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0Z
      M15.6 14.2a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0Z"></path>
  `,
  shock: `
    <path d="M15.2 1.5 4.5 13.6h6.3L8.4 22.5 19.5 9.8h-6.4l2.1-8.3z"></path>
  `,
  ice: `
    <g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"></path>
      <path d="M9.2 3.6 12 6.2l2.8-2.6M9.2 20.4 12 17.8l2.8 2.6M3.4 10.5l3.6-1 .9-3.7M20.6 13.5l-3.6 1-.9 3.7M3.4 13.5l3.6 1 .9 3.7M20.6 10.5l-3.6-1-.9-3.7"></path>
    </g>
  `,
  heal: `
    <path d="M9.2 2.5h5.6a.8.8 0 0 1 .8.8v5.9h5.9a.8.8 0 0 1 .8.8v5.6a.8.8 0 0 1-.8.8h-5.9v5.9a.8.8 0 0 1-.8.8H9.2a.8.8 0 0 1-.8-.8v-5.9H2.5a.8.8 0 0 1-.8-.8V10a.8.8 0 0 1 .8-.8h5.9V3.3a.8.8 0 0 1 .8-.8z"></path>
  `,
  drain: `
    <path d="M12 21.5C5 16.6 1.5 12.6 1.5 8.3 1.5 5 4 2.5 7.1 2.5c2 0 3.8 1.1 4.9 2.8 1.1-1.7 2.9-2.8 4.9-2.8 3.1 0 5.6 2.5 5.6 5.8 0 4.3-3.5 8.3-10.5 13.2z"></path>
  `,
  blind: `
    <g fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1.5 12S5.5 5.5 12 5.5 22.5 12 22.5 12 18.5 18.5 12 18.5 1.5 12 1.5 12z"></path>
      <circle cx="12" cy="12" r="3.3"></circle>
    </g>
  `,
  lock: `
    <path fill-rule="evenodd" d="M6.8 10.2V7.6a5.2 5.2 0 0 1 10.4 0v2.6h.9a1.6 1.6 0 0 1 1.6 1.6v8.6a1.6 1.6 0 0 1-1.6 1.6H5.9a1.6 1.6 0 0 1-1.6-1.6v-8.6a1.6 1.6 0 0 1 1.6-1.6zm2.9 0h4.6V7.6a2.3 2.3 0 0 0-4.6 0zM12 13.4a1.8 1.8 0 0 0-1 3.3v2.2h2v-2.2a1.8 1.8 0 0 0-1-3.3z"></path>
  `,
  gold: `
    <path fill-rule="evenodd" d="M12 2c4.6 0 8 4.5 8 10s-3.4 10-8 10-8-4.5-8-10 3.4-10 8-10zm0 4c-2.3 0-4 2.7-4 6s1.7 6 4 6 4-2.7 4-6-1.7-6-4-6z"></path>
  `,
  vanish: `
    <path d="M12 1.5c1 4 4.5 6.3 6.3 9.3 1 1.6 1.5 3.2 1.5 4.9 0 3.9-3.5 6.8-7.8 6.8s-7.8-2.9-7.8-6.8c0-2.9 1.5-5 3.4-6.8.2 1.8 1 3 2.2 3.8C9.5 9 10.8 5.2 12 1.5z"></path>
  `,
  confuse: `
    <path d="M12 1.8l2.9 6.6 7.1.7-5.4 4.7 1.6 7L12 17.1l-6.2 3.7 1.6-7L2 9.1l7.1-.7z"></path>
  `,
};

if (typeof module !== "undefined") module.exports = { ICON_SYMBOLS };
