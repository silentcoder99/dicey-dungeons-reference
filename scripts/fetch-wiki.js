#!/usr/bin/env node
// Politely fetches raw pages and media from the official wiki (https://wiki.diceydungeons.com/)
// into a local, gitignored cache (.wiki-cache/), one request at a time with a generous delay
// between requests. Anything already cached is never requested again.
//
// Usage:
//   node scripts/fetch-wiki.js [--list <file>] [--delay <seconds>] <target...>
//   npm run fetch-wiki -- <target...>
//
// Targets:
//   page:<id>          raw page text, e.g. page:enemies:frog
//                        -> doku.php?do=export_raw&id=enemies:frog
//                        -> .wiki-cache/pages/enemies/frog.txt
//   media:<id>         media file, e.g. media:equipment:shovel.png
//                        -> lib/exe/fetch.php?media=equipment:shovel.png
//                        -> .wiki-cache/media/equipment/shovel.png
//   --list <file>      reads more targets from a file, one per line (blank lines and # comments ignored)
//
// The wiki sometimes answers with a "Please wait while your request is being verified" bot-check
// page instead of content. This script never runs or solves that check: it waits a long, growing
// time and retries the same URL, and if the check never clears it stops and reports what's left.

const fs = require("fs");
const path = require("path");

const WIKI_BASE = "https://wiki.diceydungeons.com";
const CACHE_DIR = path.join(__dirname, "..", ".wiki-cache");
const USER_AGENT =
  "dicey-dungeons-reference-fetcher/1.0 (personal reference site; one request at a time, low rate)";

const DEFAULT_DELAY_SECONDS = 6;
const JITTER_SECONDS = 2;
const RATE_LIMIT_RETRIES = 3;
const MAX_RETRY_AFTER_SECONDS = 15 * 60;
const BOT_CHECK_BACKOFF_MINUTES = [2, 5, 10, 20, 30];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

class BotCheckError extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

function parseArgs(argv) {
  const targets = [];
  let delaySeconds = DEFAULT_DELAY_SECONDS;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--list") {
      const lines = fs.readFileSync(argv[++i], "utf8").split(/\r?\n/);
      targets.push(...lines.map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
    } else if (arg === "--delay") {
      delaySeconds = Number(argv[++i]);
      if (!(delaySeconds >= DEFAULT_DELAY_SECONDS)) {
        throw new Error(`--delay must be at least ${DEFAULT_DELAY_SECONDS} seconds`);
      }
    } else if (arg === "--help" || arg === "-h") {
      console.log(fs.readFileSync(__filename, "utf8").split("\n\n")[0]);
      process.exit(0);
    } else {
      targets.push(arg);
    }
  }
  return { targets: [...new Set(targets)], delaySeconds };
}

// "page:enemies:frog" -> { url, cachePath, kind }
function resolveTarget(target) {
  const match = /^(page|media):([a-z0-9_.:-]+)$/i.exec(target);
  if (!match) throw new Error(`Unrecognised target "${target}" (expected page:<id> or media:<id>)`);
  const [, kind, id] = match;
  const parts = id.toLowerCase().split(":");
  if (kind === "page") {
    return {
      kind,
      url: `${WIKI_BASE}/doku.php?do=export_raw&id=${encodeURIComponent(id)}`,
      cachePath: path.join(CACHE_DIR, "pages", ...parts) + ".txt",
    };
  }
  return {
    kind,
    url: `${WIKI_BASE}/lib/exe/fetch.php?media=${encodeURIComponent(id)}`,
    cachePath: path.join(CACHE_DIR, "media", ...parts),
  };
}

function isBotCheck(contentType, body) {
  if (!contentType.includes("text/html")) return false;
  const text = body.toString("utf8");
  return text.includes("request is being verified") || text.includes("wsidchk");
}

// Throws if the response isn't the kind of content the target expects.
function validate(target, contentType, body) {
  if (target.kind === "page") {
    const start = body.toString("utf8", 0, 200).trimStart().toLowerCase();
    if (contentType.includes("text/html") || start.startsWith("<!doctype") || start.startsWith("<html")) {
      throw new Error(`expected raw page text, got HTML (${contentType})`);
    }
  } else if (target.cachePath.endsWith(".png")) {
    if (!contentType.includes("image/png") || !body.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new Error(`expected a PNG image, got ${contentType || "no content type"}`);
    }
  } else if (contentType.includes("text/html")) {
    throw new Error(`expected a media file, got HTML (${contentType})`);
  }
}

function retryAfterSeconds(header) {
  if (!header) return 60;
  const seconds = /^\d+$/.test(header) ? Number(header) : (Date.parse(header) - Date.now()) / 1000;
  return Math.min(Math.max(Number.isFinite(seconds) ? seconds : 60, 1), MAX_RETRY_AFTER_SECONDS);
}

// Every request goes through here, so requests are strictly sequential and spaced out.
let lastRequestAt = 0;
async function politeGet(url, delaySeconds) {
  const waitMs = lastRequestAt + (delaySeconds + Math.random() * JITTER_SECONDS) * 1000 - Date.now();
  if (waitMs > 0) await sleep(waitMs);
  lastRequestAt = Date.now();
  // Node's fetch keeps no cookies, so nothing from a bot-check page carries over between requests.
  return fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

async function fetchTarget(target, delaySeconds) {
  let rateLimitRetries = 0;
  let botCheckRetries = 0;
  for (;;) {
    log(`GET ${target.url}`);
    const response = await politeGet(target.url, delaySeconds);
    const contentType = response.headers.get("content-type") || "";

    if (response.status === 429 || response.status === 503) {
      if (rateLimitRetries++ >= RATE_LIMIT_RETRIES) {
        throw new Error(`HTTP ${response.status} after ${RATE_LIMIT_RETRIES} retries`);
      }
      const seconds = retryAfterSeconds(response.headers.get("retry-after"));
      log(`  HTTP ${response.status}; waiting ${Math.round(seconds)}s before retrying`);
      await sleep(seconds * 1000);
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const body = Buffer.from(await response.arrayBuffer());
    if (isBotCheck(contentType, body)) {
      if (botCheckRetries >= BOT_CHECK_BACKOFF_MINUTES.length) {
        throw new BotCheckError("the wiki's bot check never cleared");
      }
      const minutes = BOT_CHECK_BACKOFF_MINUTES[botCheckRetries++];
      log(`  got the wiki's bot-check page; backing off ${minutes} min before retrying`);
      await sleep(minutes * 60 * 1000);
      continue;
    }

    validate(target, contentType, body);
    fs.mkdirSync(path.dirname(target.cachePath), { recursive: true });
    const partPath = `${target.cachePath}.part`;
    fs.writeFileSync(partPath, body);
    fs.renameSync(partPath, target.cachePath);
    log(`  saved ${path.relative(process.cwd(), target.cachePath)} (${body.length} bytes)`);
    return;
  }
}

async function main() {
  const { targets, delaySeconds } = parseArgs(process.argv.slice(2));
  if (targets.length === 0) {
    console.error("No targets given. Run with --help for usage.");
    process.exit(2);
  }

  const resolved = targets.map((t) => ({ name: t, ...resolveTarget(t) }));
  const fetched = [];
  const cached = [];
  const failed = [];

  for (const [i, target] of resolved.entries()) {
    if (fs.existsSync(target.cachePath)) {
      cached.push(target.name);
      continue;
    }
    try {
      await fetchTarget(target, delaySeconds);
      fetched.push(target.name);
    } catch (err) {
      if (err instanceof BotCheckError) {
        const remaining = resolved.slice(i).map((t) => t.name).filter((n) => !cached.includes(n));
        log(`STOPPED: ${err.message}.`);
        summarise({ fetched, cached, failed });
        console.log(`Not fetched (${remaining.length}):\n  ${remaining.join("\n  ")}`);
        process.exit(3);
      }
      log(`  FAILED ${target.name}: ${err.message}`);
      failed.push(`${target.name} (${err.message})`);
    }
  }

  summarise({ fetched, cached, failed });
  process.exit(failed.length ? 1 : 0);
}

function summarise({ fetched, cached, failed }) {
  console.log(`\nFetched: ${fetched.length}, already cached: ${cached.length}, failed: ${failed.length}`);
  if (failed.length) console.log(`Failed:\n  ${failed.join("\n  ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
