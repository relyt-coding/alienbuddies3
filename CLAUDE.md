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
- The opening (js/65 `playNewFileIntro`) plays on EVERY file open from 10-home-screen: 'pads' before the first buddy, else 'all'; when the pages land, `floatBuddiesIn()` (js/11) drifts the buddies in from off screen. The FIRST buddy is hidden (`nav-locked` / `buddy-hold` hide #alienLayer) until the nav cutscene ends, then `releaseBuddies()` (js/66) floats it in. `floatBuddiesIn()` starts each buddy just off screen and moves it at its normal drift speed (`b._enter` = no walls until inside). `window.__noIntro=true` skips it (smoke.py sets it).
- Hint pop-ups are switched OFF: `HINT_POPUPS_ON=false` in `17-nav-fullscreen.js` (`showHint` / `showHintModal` return early). Teach with
  on-screen cues instead.
- The Knowledge Vault (`68-knowledge-vault.js`) reads tips from `TIPS_DATA` (07-tips; tab per tip in `VAULT_TIP_TAB`), its own LEARN cards and
  MUSIC WORDS lists, and every skill-tree node's `fact` (`SKILL_TREE_NODES`, tab picked by `vaultTabForNode`). Add a `fact` to a node and it
  shows up in the Vault automatically. Five tabs need a skill node first (`req` in `VAULT_TABS`: Core → Music Words, Quad Suns →
  Sounds / Effects / Piano Roll / Vocals); tips in a locked tab can't be bought yet (`vaultTipLocked`). Since v0.2.159 tabs only appear when unlocked AND non-empty (`vaultTabShown`), nothing hints at locked content, and the boost explanation is the `vaultHelp()` pop-up behind the ? button only. Since v0.2.175 the Vault body is a 4-per-row grid of tiles (`.vb-grid` / `.vb-tile`); buying or tapping an owned tile opens `vaultPop()`. Lessons / facts / words cost points
  (`vaultEntryCost(e)`: a FIXED price per entry = about the energy a player holds when its feature unlocks, from the `VAULT_PRICE` table in js/74; buying never changes another price) and give ×1.05 each (`vaultOwned`, `vaultMult` in `sharedMultiplier`). On phones the Vault is swipe
  page 6 (`#vaultView`, body class `vault-open`); on desktop it's the `#vaultModal` window.
- Upright phones get body class `thumb-nav` (js/69): BUNKER / SETTINGS / EDIT PADS / SHOP in one bottom row. The PARTY button (`.pb-small`) is
  placed next to ♪ by `placeViewButtons` (06-sequencer); tapping opens `openPartyMenu`. Level 1 egg / level 2 sequencer teaser live in
  66-early-game (the bunker/shop unlock plays js/65's 'nav' cutscene; a new file plays the short 'pads' intro; `IMODES` in js/65); the level 3 disco ball (`#partyTeaser`) in 69; the level 4 gem ring (`#gemRing`, 30 s after the party; HOLD unlocks the
  galaxies via `wireGalaxyHold` from js/59, then tap opens the map / hold replays the launch) in 71. Gems make no sounds. `#accountBtn` / `openAccountSheet()` (71) is the placeholder for sign-in and online play.
- Planets: nodes via `planet({...})` in 20-skill-tree (PLANET_TREE_2), sounds as `PLANET_SOUND_DEFS` entries (03b / 03c; pitched ones in
  `PITCHED_SOUNDS`), map spot in 62-tree-layout `PLANETS`, picker names in 05-pads `PA_PLANET_NAMES` / `PA_CONT_NAMES`, cutscene look in 63 `THEMES`
  (key = id without `planet_`). Order so far: Mantra → Hyphae → Timbra → Alloy → 808 → Zephyr → ??? (planet_next placeholder).
- Buddy Keys (js/60): notes go through `playNote(id,t,f,vel)` = a per-note fade gain + reverb send; voices must `g.connect(out);g._out=out;` and return `{stop:T=>release(g,oscs,T,r)}` (never cancel the voice envelope: old Safari clicks). Scale is pentatonic (A minor pent with no song key). STARS is voice 0 since v0.2.177 (`keysV2` save flag shifts old saves up one).
- Matching-card art: `ICONS` in `48-match-art.js`, drawn in a 100×100 box, then pixelated (alpha under ~100 is dropped, so use solid fills).

- Skill tree 3D (js/35, real camera since v0.2.179): `stPanX / stPanY / stScale` keep their flat meaning; js/35 `stApply3D()` turns them into a camera
  (target under `stAnchor()`, `stYaw`, `stTilt`) with `perspective` on `#skillTreeCanvas`. Move the map with `stPanBy(dx,dy)` (never `stPanX +=`), turn with `stTurn()`.
  Use `scale3d`, not `scale`, on the map (a 2D scale squashes the upright bubbles). Flat things (links SVG, rings, glows, docks) are moved to `#skillTreeGround`
  by `stSplitGround()` after every render so they never draw across the bubbles; bubbles face the camera through the `--st-bb` custom property (`rotate`).
  `.st-node` is 124px wide and `pointer-events:none` (children catch taps): anything overflowing a node to the left is cut off in 3D.
  Suns / planets / continents are dressed by `stDressNode` (`PLANET_LOOK` in js/35: add a new planet's colours there).
- Vault content batches: js/73 pushes extra lessons and words onto `VAULT_LEARN` / `VAULT_WORDS` (writing rules in its header). 334 entries with everything
  unlocked. After adding entries or changing the economy, rebuild the prices: `python3 tools/vault_prices.py` runs the test-mode bot (via the `window.__tmHook` call in js/28) and rewrites js/74. Until then a new entry costs the same as the one before it in its tab.

## Files 34–71 (34+ aren't listed in README) · plus 03c (Planet 808 + Planet Zephyr sounds)
34 wide layouts (sideways phone / desktop DAW) · 35 solar skill tree · 36 party styles · 37 store unlock ladders · 38–39 Worm Whack ·
40–41 Planet Hop · 42 shared minigame feel · 43 your beats as levels · 44 minigame hub + Cockpit · 45 Beat Defense · 46 buddy drawing ·
47 Alien Designer (accessories / Pigment Lab / Shape Shifter) · 48 matching art · 49 shop grid · 50 egg hatch reveal · 51 buddy accessories · 52 Best Buddy · 53 accessory puzzles ·
54 theme songs · 55 audio wake-up · 56 settings VIEW · 57 shop without emoji · 58 name card keyboard · 59 galaxy intro · 60 Buddy Keys ·
61 keyboard steady · 62 tree layout · 63–64 unlock cutscenes · 65 new-file intro + unlock FX · 66 early game ("level 1") · 67 (removed in v0.2.157: the background groove) ·
68 Knowledge Vault · 69 thumb nav (bottom row on upright phones) + PARTY menu + level 3 disco-ball teaser ·
70 Alien Gem look (Gem Buddy) · 71 level 4 gem ring + gems flying off buddies + MY ACCOUNT sheet ·
73 Vault big batch (lessons + music words) · 74 Vault price table (generated) · 75 whole-bunker scroll + floating games dock ·
76 Alien Awakening trails + speed · 77 Egg Incubator + racers · 78 DNA Splice · 79 Buddy Race + Gold Records · 80 extra bunkers · 81 memory diet (3D tree culling) ·
72 energy/gem math/party corner + file-select hum (`titleHum`): `openGemStats()` (bunker + shop gem counters), PARTY pill top-left (`.pb-corner`), MY ACCOUNT in Settings only, sequencer tracker ACTIVATE (`seqTrackerActive`, `SEQ_TRACKER_COST`)

- Bunker (v0.2.181, js/75): `.bunker-body` is the scroll box (the grid wrapper no longer scrolls; it only clips the grid's pinch-zoom).
  `#bunkerDock` (position:sticky; bottom:0) holds `#mgList` / `#bbOpenBtn` / `#mgGamesBtn` so they float while you scroll. The scroll box
  ends ABOVE the bottom buttons (margin-bottom, not padding: sticky respects padding, so content would show through under the dock).
  Matching Game: BUDDIES ON/OFF (`#matchBuddyBtn`, js/08) adds body class `match-hide-buddies`; remembered in localStorage `ab2_matchBuddiesOff`.
- OFFICIAL RUN (v0.2.182, js/02 `startOfficialRun`): `writeSlot` stamps every save `run:OFFICIAL_RUN`. On load, any 0.2 slot without the stamp is
  moved to `ab2_prerun_slotN` (+ `_name`; hidden, for recovery only) and the slot starts empty; js/10 shows a one-time `#runNotice`
  (`ab2_runNotice`). 0.1 saves (`ab_slotN`), test-mode saves (`ab2t_*`) and device settings are never touched. Never write saves without writeSlot.
- Designer split (v0.2.182, js/47): node `buddy_designer` is now ALIEN DESIGNER (HAT / GLASSES / SHOES tabs → `alienData[i].acc`),
  `pigment_lab` adds the six colour tabs, `shape_shifter` adds SHAPE (antenna length, eye size); locked tabs are hidden. Starter pieces are
  appended to the accessory lists (`buddyAcc.STARTER`, js/51) so puzzle k still gives item k; `bbItemOwned` (js/52) grants them with buddy_designer.
- Alien Awakening (v0.2.183, js/76): `#trailCanvas` is the first child of #alienLayer; each bouncer keeps a path history (`b._trH`) and draws its trail
  (`alienData[i].trail`, default 'glow', 'none' = off; picked in the designer's TRAIL tab). `trailsOn` / `alienSpeedMult` are saved (js/02); js/11 multiplies
  the float step by `alienSpeedMult`. TRAILS + SPEED are appended to `openPartyMenu` by a wrapper. The 19 `trail_<id>` nodes are pushed by js/76 AFTER js/20's
  costBalance/gemsOnly, so their prices (×8 already) and "×1.02 Alien Gems" text are written there. Music trails open their own analyser only while on screen.
  Quality `Q` drops on slow frames (fewer particles, thinner lines, no soft glow passes).
- Egg Incubator (v0.2.184, js/77; node id is still `ascension`, now BEFORE dna_splice): `#eggArea` (lamps strip + waiting tray) is inserted at the top of
  `.bunker-body`, `#racerRow` just above the grid; hidden until an egg exists or the node is owned. State (js/02): `incEggs` (slot -1 = tray, heat 0..1, taps,
  beat {s:[3 sound ids], p:3×16}), `incRacers`, `incLampsBought` (0–6), `incAllow` (0–3), `founderEggGiven`. Egg kinds in `EGG_KINDS` (founder from a 0.1
  `ab_slotN` that filled its bunker; light from the 99-alien reward via `#eggRewardClose`). Warming draws `INC_LAMP_FRAC` (10%) of live income per lamp
  (income = js/34 `_rateAdd` gains over 10 s, wrapped) and covers 3+2×incAllow lamps at full speed. Shop cards (`#incLampCard` / `#incAllowCard`) are priced
  off `alienCost(98)`. The egg page fades `drumMasterReal` and plays egg sounds via `SOUND_MAP[id].fn` with `drumMasterGain` swapped to a private bus.
  `window.__inc` is a test hook (set `__inc.income`). The light buddy look uses `fx.glass` (see-through fur) and `fx.halo` (js/46).
- DNA Splice (v0.2.186, js/78): `#spliceBtn` sits at the end of `#eggArea`; `#spliceView` + `#splicePick` (parents = racers, then bunker buddies).
  `makeChild(A,B)` picks each of `SPLICE_GENES` from one parent (12% blend), ant / eyeSize from one, a parent's fx 35%. The egg (kind 'splice') carries
  look / pal / label / name / gen / need (1500 s × 1.5^(gen-1)) / power (1 + .5(gen-1)) / parents; js/77 `incKindOf(e)` lays those over `EGG_KINDS.splice`
  and racers keep look / gen / parents. Price `spliceCost()` = 1,500 💎 × 1.5^spliceCount (saved in js/02). `window.__splice` is a test hook.
- Buddy Race (v0.2.187, js/79): `#raceBtn` under `#racerRow`; `#raceOverlay` = lobby / race canvas / results. 110 BPM, 64 beats, the same obstacles
  (on beats / half-beats) in all 4 lanes, equal speed; a miss = exactly one lost beat (`stumbleTo`), so obstacles stay on the beat. Jump = 0.9 beat in the air.
  CPUs miss 8 / 13 / 18%. Ties = random PHOTO FINISH. 1st place → `goldRecords` +1 = GOLD RECORD COINS (the rare money, saved up for now; nothing spends it yet. The creator wants to make them as real coins one day, so keep the drawn design to one metal + relief) and `raceStats` (both js/02).
  The main sequencer is stopped during a race and restarted after. `drawGoldRecord(g,x,y,r,rot)` draws the coin (reeded rim, grooves, embossed ♪ label). `window.__race` is a test hook.
- Extra bunkers (v0.2.188, js/80): Tier 3 card `#bxShopCard` (shows at 99 buddies) raises `bunkersOwned` (1–10, js/02); `bunkerMeta[v]={name,theme}`;
  `alienData[i].box` = bunker (missing → floor(i/99)). Use `bunkerIds(v)` / `bunkerOf(i)` / `bunkerCapacity()`; js/12 renderBunkerView draws `bunkerIds(viewingBunker)`
  and finds cells by `cell._globalIdx` (never by index maths). js/16 buyAlien calls `bunkerAssign`. Past 99: `alienCost(n)` = alienCost(98)×1.12^(n-98) and
  `alienMultiplier()` counts only the first 99 at full strength (+×1.01 each after), because the old curves overflow to Infinity. `#bxNav` (‹ name n/N › theme)
  replaces `#bunkerNumberLabel` when there's more than one bunker; `#anmMoveRow` on the buddy card moves buddies.
- Memory (v0.2.190, js/81): iPhone Safari reloads the tab (back to file select) when memory runs out. Every 3D-standing tree bubble is its own ~1 MB layer
  on a 3× iPhone, so js/81 hides (`.st-cull`, display:none) bubbles/labels farther than ~1.3 screens from the camera target and caps phones at the 70 nearest
  (nodes carry `el._mx/_my`, set in js/20 renderSkillTree). `body.tree-open` hides #alienLayer under the tree; the trail canvas (js/76) and the intro canvas
  (js/65) shrink to 1×1 / 0×0 when idle. Keep new full-screen canvases and per-element 3D transforms in mind: they all cost memory on phones.
- Skill-tree descriptions: `gemsOnly` (js/20) strips any written "×N Alien Gems" and appends the node's REAL `gemMult`, so never hand-write gem amounts.

## Testing without a phone
Serve the folder (`python3 -m http.server`) and drive it with Playwright + `/usr/bin/google-chrome`, viewport 390×844 with an iPhone user agent
(otherwise it's treated as a too-small desktop). `startGame(slot)` opens a save slot; set state directly (`score`, `drum.pads`, `totalAliens`,
`unlockedSkills.x=true`) and screenshot. The first tap on a new file plays an intro (tap a few times to skip).

## Energy (joules)
Since v0.2.180 the score is ENERGY in joules (v0.2.162–179 called it watts). Watts are a rate (1 W = 1 J per second), so per-second numbers are J/s.
Internal numbers did NOT change: 1 internal unit = 0.1 mJ (`J_PER_UNIT` in js/01), so a plain tap on a new save is 0.1 mJ and every price keeps its
ratio to a tap; old saves need no conversion and the Vault price table (js/74) stays in internal units.
- Use `fmtJh(n)` / `jHtml(n)` / `scoreHtml(n)` / `fmtJpsH(n)` for anything on screen. Bebas Neue has NO lowercase, so a plain-text "mJ" renders as
  "MJ" (megajoules); the HTML versions put the unit in `.ju` (Space Mono) to keep its case. Set them with innerHTML. `showToast`, `spawnParticle`
  and `ssRow` switch to innerHTML automatically when the text contains a `.ju` span. Plain `fmtJ` / `fmtScore` / `fmtJps` are for console and test mode.
- The score spells out MILLIJOULES / JOULES below 1 kJ, then kJ, MJ … QJ, then scientific. Sideways phones use the short symbols.
  `fmtJoulesExact(n)` is the exact line under the score from 1 kJ up. Never write 'pts', 'points' or 'watts' for the score in player-facing text.
- Old names `fmtW` / `wHtml` / `wParts` are aliases of the joule versions. Gems keep `fmtGems`. The breakdown window (13 + js/72 CSS) uses
  `ssIconEl(key)` = black & white match art (`matchIconBW` in js/48): no emoji there.

## Things that bite
- Shop ladder boosts (v0.2.175): each ALIEN PARTY level and the first 3 SEQ_FEATS (BPM, 32, 64 steps) are ×1.5 energy (`shopLadderMult()` in `sharedMultiplier`, js/02).
- Per-sound volume: `soundVols[id]` defaults to `SOUND_VOL_DEFAULT` (.75 = normal level, 1 = a third louder); gain = v/.75 (js/03 `getSoundGainVal`). Old saves are scaled ×.75 once (`soundVolsV:2` in the save).
- Sequencer tracker (js/14 `scoreSeqStep`, v0.2.178): scores on every other step (8th notes); energy is banked in `_seqBank` and paid together (same income), dots fill at ×.5.
- Sequencer clock (js/14 `_seqClockTick`): the audio grid snaps back if it drifts >60 ms either way and never schedules two steps within 60% of a step; the audio wake-up rebuild (js/55) restarts the clock. Breakdown rows that are inactive and OFF/×1 are hidden (`trimLockedStats`, js/72).
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
