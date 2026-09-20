#!/usr/bin/env node
// Reads pixels out of a wiki card image, so a card's `color` in js/data.js is sampled rather than
// eyeballed (see README, "Adding a new enemy or piece of equipment").
//
// Usage:
//   node scripts/sample-card-colors.js <image> [--at x%,y% ...] [--rect x1%,y1%,x2%,y2% ...]
//   npm run sample-card -- .wiki-cache/media/equipment/broadsword.png
//
//   <image>    a path, or a bare equipment image name resolved under .wiki-cache/media/equipment/
//   (default)  prints the image's size, its width/height ratio and the card size that implies,
//              then the most common color in the header band and in each side of the body panel
//   --at       the exact color at a point, as percentages of the image
//   --rect     the most common colors within a rectangle, as percentages of the image
//
// Percentages are of the whole image, which for most cards is the card itself with a few pixels of
// background. Cards whose image carries extra chrome (a spellbook bar under the card, an activation
// panel over it) need --rect/--at against what the image actually shows.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CACHE_MEDIA = path.join(__dirname, "..", ".wiki-cache", "media", "equipment");

// The two card shapes, as measured from the art (see README, "Card geometry").
const CARD_RATIOS = { 1: 1.316, 2: 0.882 };

const BYTES_PER_PIXEL = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

// Minimal decoder for the PNGs the wiki serves: 8-bit, non-interlaced, any color type.
function decodePng(buffer) {
  if (!buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error("not a PNG");
  }
  let offset = 8;
  let header = null;
  let palette = null;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.slice(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "PLTE") palette = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  if (!header) throw new Error("no IHDR");
  if (header.depth !== 8) throw new Error(`unsupported bit depth ${header.depth}`);
  if (header.interlace) throw new Error("interlaced PNGs are not supported");

  const channels = BYTES_PER_PIXEL[header.colorType];
  const stride = header.width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(stride * header.height);

  // Undo the per-scanline filters (PNG spec 9.2); each line may reference the one above it.
  for (let y = 0; y < header.height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? pixels[y * stride + i - channels] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + i] : 0;
      const c = i >= channels && y > 0 ? pixels[(y - 1) * stride + i - channels] : 0;
      let value = line[i];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[y * stride + i] = value & 0xff;
    }
  }

  const rgbAt = (x, y) => {
    const i = y * stride + x * channels;
    if (header.colorType === 3) return [...palette.slice(pixels[i] * 3, pixels[i] * 3 + 3)];
    if (header.colorType === 0 || header.colorType === 4) return [pixels[i], pixels[i], pixels[i]];
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  };
  return { width: header.width, height: header.height, rgbAt };
}

const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

// The most common colors across one or more rectangles, each given in percentages of the image.
function commonColors(image, rects, limit = 3) {
  const counts = new Map();
  const px = (p, span) => Math.min(span - 1, Math.max(0, Math.round((p / 100) * span)));
  for (const [x1, y1, x2, y2] of Array.isArray(rects[0]) ? rects : [rects]) {
    for (let y = px(y1, image.height); y <= px(y2, image.height); y++) {
      for (let x = px(x1, image.width); x <= px(x2, image.width); x++) {
        const hex = toHex(image.rgbAt(x, y));
        counts.set(hex, (counts.get(hex) || 0) + 1);
      }
    }
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([hex, n]) => ({ hex, share: n / total }));
}

// Regions that hold flat card color on a standard card: the header band, and the body panel either
// side of the die slot, which sits in the middle. Art behind a card can tint parts of its body, so
// both sides of the body are reported -- they disagree where the art bleeds through (see README).
//
// The header is read as three strips rather than one, because the title runs across the middle of
// the band and a long one reaches the ends: the white of the lettering only ever wins in a strip it
// covers, so the band's own color still carries the count across the three. Sampled this way, the
// script reproduces the header of all 113 existing cards that have an image exactly, and the body
// of all but the four whose art bleeds through the panel.
const BODY_LEFT = [6, 25, 19, 72];
const BODY_RIGHT = [81, 25, 94, 72];
const REGIONS = {
  header: [[8, 4, 22, 9], [35, 4, 65, 9], [78, 4, 92, 9]],
  body: [BODY_LEFT, BODY_RIGHT],
  "body left": BODY_LEFT,
  "body right": BODY_RIGHT,
  // A countdown card fills its box with a third color; the box sits mid-card, where a die slot
  // would be. Meaningless on every other card, where this reads the empty socket and what shows
  // through it.
  "countdown box": [45, 42, 55, 50],
};

function describe(file) {
  const image = decodePng(fs.readFileSync(file));
  const ratio = image.width / image.height;
  const size = Math.abs(ratio - CARD_RATIOS[1]) < Math.abs(ratio - CARD_RATIOS[2]) ? 1 : 2;
  const off = Math.min(...[1, 2].map((s) => Math.abs(ratio - CARD_RATIOS[s]))) ;
  console.log(`${path.basename(file)}  ${image.width}x${image.height}  ratio ${ratio.toFixed(3)}`);
  console.log(
    `  size ${size} (${CARD_RATIOS[size]})${off > 0.06 ? "  -- off by " + off.toFixed(3) + ", the image may include chrome outside the card" : ""}`
  );
  return image;
}

function main(argv) {
  const points = [];
  const rects = [];
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--at") points.push(argv[++i].split(",").map(Number));
    else if (argv[i] === "--rect") rects.push(argv[++i].split(",").map(Number));
    else files.push(argv[i]);
  }
  if (files.length === 0) {
    console.error("usage: sample-card-colors.js <image> [--at x%,y%] [--rect x1%,y1%,x2%,y2%]");
    process.exit(1);
  }

  for (const name of files) {
    const file = fs.existsSync(name) ? name : path.join(CACHE_MEDIA, name.replace(/(\.png)?$/, ".png"));
    const image = describe(file);
    for (const [x, y] of points) {
      const clamp = (p, span) => Math.min(span - 1, Math.max(0, Math.round((p / 100) * span)));
      console.log(`  at ${x}%,${y}%  ${toHex(image.rgbAt(clamp(x, image.width), clamp(y, image.height)))}`);
    }
    const named = rects.length > 0 ? rects.map((r, i) => [`rect ${i + 1}`, r]) : Object.entries(REGIONS);
    for (const [label, rect] of named) {
      const top = commonColors(image, rect);
      const shown = top.map((c) => `${c.hex} ${(c.share * 100).toFixed(0)}%`).join("   ");
      console.log(`  ${label.padEnd(10)} ${shown}`);
    }
    console.log("");
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { decodePng, commonColors, toHex };
