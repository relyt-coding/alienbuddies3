# Alien Buddies: notes for building

Live at **alienbuddies.space** (Netlify deploys `main` of `relyt-coding/alienbuddies3`). Plain HTML/CSS/JS, no build step.
README.md covers the file layout, test mode and vocals in depth; this file is the quick working guide.

## Shipping a build
1. Bump `GAME_VERSION` in `js/01-constants.js` by exactly one patch (0.2.147 → 0.2.148). Only when shipping or exporting a zip, not for in-progress edits.
2. Add a `## v0.2.x - YYYY-MM-DD HH:MM` entry at the top of `CHANGELOG.md`, written for players (plain words, no code names).
3. Commit as `v0.2.x: short summary`, push to `main`.
4. Send `alienbuddies-v0.2.x.zip` (`git archive --format=zip HEAD`) as a backup. Always put the version in the file name and the message.

## How the code is put together
- `js/NN-name.js` load in number order as plain `<script>` tags (all globals, no modules). Top-level code may only use things from
  files that load earlier; later files hook in by wrapping globals (e.g. `66-early-game` wraps `startGame`).
- `00-bootstrap.js` must stay first: `IS_DESKTOP`, `IS_MOBILE_DEVICE`, `_autoParticleAccum` must be the first declarations.
- New features usually get a **new numbered file** with a header comment explaining the design, and plug in via globals, intervals and body classes.
- Saves: add a field to the save object in `js/02-save-and-state.js` (the big object around line 40), declare its `let` near the other state, and
  read it in the loader with a safe default (old saves won't have it). New files start from the defaults object at the top of that file.
- Useful body classes: `game-active`, `desktop-mode`, `phone-land` (sideways phone), `nav-locked` (before the first buddy: BUNKER/SHOP hidden),
  `store-open`, `bunker-open`, `cockpit-open`, `stats-open`, `intro-run`. `overlayUp()` (07-tips) says if any full screen covers the pads.
- The opening (js/65 `playNewFileIntro`) plays on EVERY file open from 10-home-screen: 'pads' before the first buddy, else 'all'; when the pages land, `floatBuddiesIn()` (js/11) drifts the buddies in from off screen. `window.__noIntro=true` skips it (smoke.py sets it).
- Hint pop-ups are switched OFF: `HINT_POPUPS_ON=false` in `17-nav-fullscreen.js` (`showHint` / `showHintModal` return early). Teach with
  on-screen cues instead.
- The Knowledge Vault (`68-knowledge-vault.js`) reads tips from `TIPS_DATA` (07-tips; tab per tip in `VAULT_TIP_TAB`), its own LEARN cards and
  MUSIC WORDS lists, and every skill-tree node's `fact` (`SKILL_TREE_NODES`, tab picked by `vaultTabForNode`). Add a `fact` to a node and it
  shows up in the Vault automatically. Five tabs need a skill node first (`req` in `VAULT_TABS`: Core → Music Words, Quad Suns →
  Sounds / Effects / Piano Roll / Vocals); tips in a locked tab can't be bought yet (`vaultTipLocked`). Lessons / facts / words cost points
  (`vaultEntryCost`, ×1.35 per one owned) and give ×1.05 each (`vaultOwned`, `vaultMult` in `sharedMultiplier`). On phones the Vault is swipe
  page 6 (`#vaultView`, body class `vault-open`); on desktop it's the `#vaultModal` window.
- Upright phones get body class `thumb-nav` (js/69): BUNKER / SETTINGS / EDIT PADS / SHOP in one bottom row. The PARTY button (`.pb-small`) is
  placed next to ♪ by `placeViewButtons` (06-sequencer); tapping opens `openPartyMenu`. Level 1 egg / level 2 sequencer teaser live in
  66-early-game (the bunker/shop unlock plays js/65's 'nav' cutscene; a new file plays the short 'pads' intro; `IMODES` in js/65); the level 3 disco ball (`#partyTeaser`) in 69; the level 4 gem ring (`#gemRing`, 30 s after the party; HOLD unlocks the
  galaxies via `wireGalaxyHold` from js/59, then tap opens the map / hold replays the launch) in 71. Gems make no sounds. `#accountBtn` / `openAccountSheet()` (71) is the placeholder for sign-in and online play.
- Planets: nodes via `planet({...})` in 20-skill-tree (PLANET_TREE_2), sounds as `PLANET_SOUND_DEFS` entries (03b / 03c; pitched ones in
  `PITCHED_SOUNDS`), map spot in 62-tree-layout `PLANETS`, picker names in 05-pads `PA_PLANET_NAMES` / `PA_CONT_NAMES`, cutscene look in 63 `THEMES`
  (key = id without `planet_`). Order so far: Mantra → Hyphae → Timbra → Alloy → 808 → Zephyr → ??? (planet_next placeholder).
- Matching-card art: `ICONS` in `48-match-art.js`, drawn in a 100×100 box, then pixelated (alpha under ~100 is dropped, so use solid fills).

## Files 34–71 (34+ aren't listed in README) · plus 03c (Planet 808 + Planet Zephyr sounds)
34 wide layouts (sideways phone / desktop DAW) · 35 solar skill tree · 36 party styles · 37 store unlock ladders · 38–39 Worm Whack ·
40–41 Planet Hop · 42 shared minigame feel · 43 your beats as levels · 44 minigame hub + Cockpit · 45 Beat Defense · 46 buddy drawing ·
47 Buddy Designer · 48 matching art · 49 shop grid · 50 egg hatch reveal · 51 buddy accessories · 52 Best Buddy · 53 accessory puzzles ·
54 theme songs · 55 audio wake-up · 56 settings VIEW · 57 shop without emoji · 58 name card keyboard · 59 galaxy intro · 60 Buddy Keys ·
61 keyboard steady · 62 tree layout · 63–64 unlock cutscenes · 65 new-file intro + unlock FX · 66 early game ("level 1") · 67 (removed in v0.2.157: the background groove) ·
68 Knowledge Vault · 69 thumb nav (bottom row on upright phones) + PARTY menu + level 3 disco-ball teaser ·
70 Alien Gem look (Gem Buddy) · 71 level 4 gem ring + gems flying off buddies + MY ACCOUNT button

## Testing without a phone
Serve the folder (`python3 -m http.server`) and drive it with Playwright + `/usr/bin/google-chrome`, viewport 390×844 with an iPhone user agent
(otherwise it's treated as a too-small desktop). `startGame(slot)` opens a save slot; set state directly (`score`, `drum.pads`, `totalAliens`,
`unlockedSkills.x=true`) and screenshot. The first tap on a new file plays an intro (tap a few times to skip).

## Things that bite
- Old Safari (iOS 15 / iPhone 7) has no CSS `color-mix()`: give every color-mix declaration a fallback (see the `@supports not` block at the end
  of css/style.css). Avoid canvas `shadowBlur` in per-frame cutscene drawing (it halved Magmora's frame rate); use a wide faint stroke instead.
- Device smoke test: `/home/claude/preview/smoke.py`-style Playwright run over iPhone 7 (375×667, sideways 667×375), iPhone 14, iPad both ways,
  1280×720 and 1920×1080, checking page errors and overlapping buttons. Old-Safari syntax/API scan: parse js/ with acorn at ES2021.
- Must run on old iPhones (a playtester uses an iPhone 7): `21-legacy-safari.js` has fallbacks; keep effects cheap.
- iPhone only shows the keyboard if `focus()` happens inside the tap itself, so open text boxes synchronously (no setTimeout).
- No 👽 emoji anywhere: buddies are drawn (46-buddies). The shop has no emoji except 💎, and js/70 draws every 💎 on screen as the
  Gem Buddy (`span.agem`; `.gem-icon` slots and `makeLiveAlienGem()` give the bobbing one). Keep writing 💎 in code: it's swapped automatically.

## Design rules the creator has set
- Teach, don't hand-hold: no signs explaining the obvious; cues only for new mechanics. No pop-ups that break the music.
- Rhythm games: no PERFECT/EARLY/LATE judgments, the beat never drops on a miss, hits sound musical.
- Progress should feel earned (later nodes and the second half of the shop cost more), but the early game should hook fast:
  level 1 = hatch the first egg, level 2 = unlock the sequencer.
- Long-term: the game becomes a full DAW that teaches every part of music, and an educational tool teachers can use in class.
