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
- Hint pop-ups are switched OFF: `HINT_POPUPS_ON=false` in `17-nav-fullscreen.js` (`showHint` / `showHintModal` return early). Teach with
  on-screen cues instead.
- The Knowledge Vault (`68-knowledge-vault.js`) reads tips from `TIPS_DATA` (07-tips; tab per tip in `VAULT_TIP_TAB`), its own LEARN cards and
  MUSIC WORDS lists, and every skill-tree node's `fact` (`SKILL_TREE_NODES`, tab picked by `vaultTabForNode`). Add a `fact` to a node and it
  shows up in the Vault automatically. Five tabs need a skill node first (`req` in `VAULT_TABS`: Core → Music Words, Quad Suns →
  Sounds / Effects / Piano Roll / Vocals); tips in a locked tab can't be bought yet (`vaultTipLocked`).
- Matching-card art: `ICONS` in `48-match-art.js`, drawn in a 100×100 box, then pixelated (alpha under ~100 is dropped, so use solid fills).

## Files 34–68 (34+ aren't listed in README)
34 wide layouts (sideways phone / desktop DAW) · 35 solar skill tree · 36 party styles · 37 store unlock ladders · 38–39 Worm Whack ·
40–41 Planet Hop · 42 shared minigame feel · 43 your beats as levels · 44 minigame hub + Cockpit · 45 Beat Defense · 46 buddy drawing ·
47 Buddy Designer · 48 matching art · 49 shop grid · 50 egg hatch reveal · 51 buddy accessories · 52 Best Buddy · 53 accessory puzzles ·
54 theme songs · 55 audio wake-up · 56 settings VIEW · 57 shop without emoji · 58 name card keyboard · 59 galaxy intro · 60 Buddy Keys ·
61 keyboard steady · 62 tree layout · 63–64 unlock cutscenes · 65 new-file intro + unlock FX · 66 early game ("level 1") · 67 the groove ·
68 Knowledge Vault

## Testing without a phone
Serve the folder (`python3 -m http.server`) and drive it with Playwright + `/usr/bin/google-chrome`, viewport 390×844 with an iPhone user agent
(otherwise it's treated as a too-small desktop). `startGame(slot)` opens a save slot; set state directly (`score`, `drum.pads`, `totalAliens`,
`unlockedSkills.x=true`) and screenshot. The first tap on a new file plays an intro (tap a few times to skip).

## Things that bite
- Must run on old iPhones (a playtester uses an iPhone 7): `21-legacy-safari.js` has fallbacks; keep effects cheap.
- iPhone only shows the keyboard if `focus()` happens inside the tap itself, so open text boxes synchronously (no setTimeout).
- No 👽 emoji anywhere: buddies are drawn (46-buddies). The shop has no emoji except 💎.

## Design rules the creator has set
- Teach, don't hand-hold: no signs explaining the obvious; cues only for new mechanics. No pop-ups that break the music.
- Rhythm games: no PERFECT/EARLY/LATE judgments, the beat never drops on a miss, hits sound musical.
- Progress should feel earned (later nodes and the second half of the shop cost more), but the early game should hook fast:
  level 1 = hatch the first egg, level 2 = unlock the sequencer.
- Long-term: the game becomes a full DAW that teaches every part of music, and an educational tool teachers can use in class.
