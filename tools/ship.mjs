#!/usr/bin/env node
/**
 * tools/ship.mjs — the one way to ship Alien Buddies.
 *
 *   node tools/ship.mjs                 check, commit, tag, push, verify live
 *   node tools/ship.mjs --dry           run every check, change nothing
 *   node tools/ship.mjs --no-live       skip waiting for alienbuddies.space
 *   node tools/ship.mjs --zip <path>    also write a backup zip of this build
 *   node tools/ship.mjs --summary "..." override the commit/handoff summary
 *   node tools/ship.mjs --allow-jump    accept a version bump larger than one patch
 *
 * The rules it enforces (see AGENTS.md / CLAUDE.md):
 *   - ship from main, up to date with origin, never behind it
 *   - GAME_VERSION bumped by exactly one patch, and never reused
 *   - CHANGELOG.md's newest entry is this version and has at least one line
 *   - every js/*.js passes `node --check`
 *   - index.html loads 00-bootstrap.js first and every src it names exists
 *   - v0.1/ (frozen) was not touched
 *   - the CURRENT STATE block in CLAUDE.md is rewritten with this build
 * Then it commits "v<version>: <summary>", tags v<version>, pushes both, and
 * polls the live site until it serves the new GAME_VERSION.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONSTANTS = path.join(ROOT, "js", "01-constants.js");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");
const HANDOFF = path.join(ROOT, "CLAUDE.md");
const INDEX = path.join(ROOT, "index.html");
const LIVE_URL = "https://alienbuddies.space/js/01-constants.js";
const LIVE_TIMEOUT_MS = 120000;

const argv = process.argv.slice(2);
const has = (n) => argv.includes(n);
const opt = (n) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};

const DRY = has("--dry");
const NO_LIVE = has("--no-live");
const ALLOW_JUMP = has("--allow-jump");
const ZIP = opt("--zip");
const SUMMARY_OVERRIDE = opt("--summary");

let warnings = 0;
const say = (s = "") => console.log(s);
const step = (s) => console.log(`\n=== ${s} ===`);
const warn = (s) => {
  warnings++;
  console.log(`  !  ${s}`);
};

function fail(msg) {
  console.error(`\n  ×  ${msg}\n`);
  process.exit(1);
}

function git(args, allowFail = false) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0 && !allowFail) {
    fail(`git ${args.join(" ")} failed:\n${(r.stderr || r.stdout || "").trim()}`);
  }
  return { status: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function readVersion(source) {
  const m = source.match(/GAME_VERSION\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

function bumpPatch(v) {
  const p = v.split(".").map(Number);
  if (p.length !== 3 || p.some(Number.isNaN)) return null;
  return `${p[0]}.${p[1]}.${p[2] + 1}`;
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function shortSummary(text, max = 72) {
  const one = text.replace(/\s+/g, " ").replace(/^[-–—*]\s*/, "").trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  const i = cut.lastIndexOf(" ");
  return (i > 40 ? cut.slice(0, i) : cut).replace(/[.,;:]$/, "") + "…";
}

// ─────────────────────────── 1. where are we ───────────────────────────
step("Repository");
if (!existsSync(path.join(ROOT, ".git"))) fail(`Not a git clone: ${ROOT}`);

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).out;
if (branch !== "main") {
  fail(`You are on "${branch}". Ship from main (merge your branch into main first).`);
}
say(`  repo    ${ROOT}`);
say(`  branch  main`);

git(["fetch", "origin", "main"], true);
const behind = Number(git(["rev-list", "--count", "HEAD..origin/main"], true).out || "0");
if (behind > 0) {
  fail(
    `origin/main is ${behind} commit(s) ahead of you.\n` +
      `Someone shipped since you pulled. Run:  git pull --rebase origin main`
  );
}

if (!git(["status", "--porcelain"]).out) {
  fail("Nothing to ship: the working tree is clean.");
}

if (git(["status", "--porcelain", "--", "v0.1"]).out) {
  fail("v0.1/ changed. It is frozen — revert those edits before shipping.");
}

// ─────────────────────────── 2. version ───────────────────────────
step("Version");
const version = readVersion(readFileSync(CONSTANTS, "utf8"));
if (!version) fail("No GAME_VERSION found in js/01-constants.js.");

const prev = readVersion(git(["show", "HEAD:js/01-constants.js"], true).out || "");
if (prev) {
  if (prev === version) {
    fail(`GAME_VERSION is still ${version}. Bump it by one patch (${bumpPatch(version)}).`);
  }
  const want = bumpPatch(prev);
  if (!ALLOW_JUMP && want && version !== want) {
    fail(`Version jumped: ${prev} → ${version}. The next build is ${want} (use --allow-jump if that is deliberate).`);
  }
  say(`  ${prev} → ${version}`);
} else {
  warn("No previous GAME_VERSION on HEAD — treating this as the first release.");
}
if (git(["tag", "-l", `v${version}`]).out) {
  fail(`Tag v${version} already exists. A released version number is never reused.`);
}

// ─────────────────────────── 3. changelog ───────────────────────────
step("Changelog");
const changelog = readFileSync(CHANGELOG, "utf8");
const firstHeading = changelog.match(/^## .*$/m);
if (!firstHeading || !firstHeading[0].startsWith(`## v${version} `)) {
  fail(`The newest heading in CHANGELOG.md is not "## v${version} - <date>". Add the entry first.`);
}
const after = changelog.slice(changelog.indexOf(firstHeading[0]) + firstHeading[0].length);
const nextHeading = after.search(/^## /m);
const body = nextHeading >= 0 ? after.slice(0, nextHeading) : after;
const bullets = body
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => /^[-*]\s+\S/.test(l));
if (!bullets.length) fail(`The v${version} changelog entry has no lines under it.`);
const summary = SUMMARY_OVERRIDE || shortSummary(bullets[0]);
say(`  ${firstHeading[0]}`);
say(`  ${bullets.length} line(s), summary: "${summary}"`);

// ─────────────────────────── 4. syntax + load order ───────────────────────────
step("JavaScript");
const jsDir = path.join(ROOT, "js");
const jsFiles = readdirSync(jsDir).filter((f) => f.endsWith(".js")).sort();
for (const f of jsFiles) {
  const r = spawnSync(process.execPath, ["--check", path.join(jsDir, f)], { encoding: "utf8" });
  if (r.status !== 0) {
    fail(`Syntax error in js/${f}:\n${(r.stderr || "").trim()}`);
  }
}
say(`  ${jsFiles.length} files parse cleanly`);

const html = readFileSync(INDEX, "utf8");
const srcs = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((s) => !/^(?:https?:)?\/\//i.test(s) && !s.startsWith("data:"));
if (!srcs.length) fail("index.html has no local <script src> tags.");
if (path.basename(srcs[0]) !== "00-bootstrap.js") {
  fail(`index.html loads "${srcs[0]}" first; 00-bootstrap.js must stay first.`);
}
for (const s of srcs) {
  const clean = s.split("?")[0];
  if (!existsSync(path.join(ROOT, clean))) fail(`index.html points at a missing file: ${clean}`);
}
const loaded = new Set(srcs.map((s) => path.basename(s.split("?")[0])));
const unloaded = jsFiles.filter((f) => !loaded.has(f));
if (unloaded.length) warn(`index.html does not load: ${unloaded.join(", ")}`);
say(`  ${srcs.length} script tags, load order ok`);

for (const f of jsFiles) {
  if (/(^|[^\w.])debugger\s*;/.test(readFileSync(path.join(jsDir, f), "utf8"))) {
    warn(`js/${f} still has a debugger statement`);
  }
}

// ─────────────────────────── 5. handoff block ───────────────────────────
step("Handoff block");
const HANDOFF_RE = /<!-- ship:auto:start -->[\s\S]*?<!-- ship:auto:end -->/;
const handoffSrc = readFileSync(HANDOFF, "utf8");
if (!HANDOFF_RE.test(handoffSrc)) {
  warn("CLAUDE.md has no <!-- ship:auto:start --> … <!-- ship:auto:end --> block; skipped.");
} else {
  const eol = handoffSrc.includes("\r\n") ? "\r\n" : "\n";
  const block = [
    "<!-- ship:auto:start -->",
    `- Version: ${version} · shipped ${today()}`,
    `- Last change: ${summary}`,
    "<!-- ship:auto:end -->",
  ].join(eol);
  const updated = handoffSrc.replace(HANDOFF_RE, block);
  if (!DRY && updated !== handoffSrc) writeFileSync(HANDOFF, updated);
  say(`  CURRENT STATE → ${version} (${today()})`);
}

// ─────────────────────────── 6. commit + tag + push ───────────────────────────
step("Release");
const files = git(["status", "--porcelain"]).out.split(/\r?\n/).filter(Boolean);
say(`  ${files.length} path(s) changed:`);
files.slice(0, 14).forEach((l) => say(`    ${l}`));
if (files.length > 14) say(`    … ${files.length - 14} more`);

const subject = shortSummary(summary, 60);
const message = `v${version}: ${subject}`;

if (DRY) {
  step("Dry run");
  say(`  would commit: ${message}`);
  say(`  would tag:    v${version}`);
  say(`  would push:   main + v${version}`);
  say(warnings ? `  ${warnings} warning(s) — review above.` : "  no warnings.");
  process.exit(0);
}

git(["add", "-A"]);
const staged = git(["diff", "--cached", "--name-only"]).out;
if (!staged) fail("Nothing staged after git add -A.");
const commit = git(["commit", "-m", message], true);
if (commit.status !== 0) fail(`git commit failed:\n${commit.err || commit.out}`);
const hash = git(["rev-parse", "--short", "HEAD"]).out;
say(`  commit ${hash}  ${message}`);

const push = git(["push", "origin", "main"], true);
if (push.status !== 0) {
  fail(
    `Push refused — someone else pushed while you were shipping.\n` +
      `Your commit ${hash} is local and safe.\n` +
      `Run:  git pull --rebase origin main\n` +
      `Then: git push origin main && git tag -a v${version} -m "Alien Buddies ${version}" && git push origin v${version}`
  );
}
say("  pushed main");

git(["tag", "-a", `v${version}`, "-m", `Alien Buddies ${version}`]);
const tagPush = git(["push", "origin", `v${version}`], true);
if (tagPush.status !== 0) {
  warn(`Tag v${version} is local only; push it: git push origin v${version}`);
} else {
  say(`  tagged v${version} and pushed the tag`);
}

// ─────────────────────────── 7. live check ───────────────────────────
let live = "skipped";
if (!NO_LIVE) {
  step("Live check");
  say(`  waiting for ${LIVE_URL} to serve ${version} (up to ${LIVE_TIMEOUT_MS / 1000}s)`);
  const started = Date.now();
  let last = "?";
  while (Date.now() - started < LIVE_TIMEOUT_MS) {
    try {
      const r = await fetch(`${LIVE_URL}?t=${Date.now()}`, { cache: "no-store" });
      const text = await r.text();
      const m = text.match(/GAME_VERSION\s*=\s*['"]([^'"]+)['"]/);
      last = m ? m[1] : `http ${r.status}`;
      if (last === version) break;
    } catch {
      last = "unreachable";
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (last === version) {
    live = "live";
    say(`  alienbuddies.space is serving ${version}`);
  } else {
    live = "not live yet";
    warn(`Live site shows ${last}. The push succeeded — the Netlify deploy may still be running.`);
  }
}

if (ZIP) {
  step("Backup zip");
  const out = path.resolve(ROOT, ZIP);
  const r = spawnSync("git", ["archive", "--format=zip", `--output=${out}`, "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (r.status !== 0) warn(`Could not write the zip: ${(r.stderr || "").trim()}`);
  else say(`  ${out}`);
}

step("Shipped");
say(`  version  ${version}`);
say(`  commit   ${hash}`);
say(`  tag      v${version}`);
say(`  live     ${live}`);
say(warnings ? `  ${warnings} warning(s) — see above.` : "  no warnings.");
