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
76 Alien Awakening trails + speed · 77 Egg Incubator + racers · 78 DNA Splice · 79 Buddy Race + Gold Records · 80 extra bunkers · 81 memory diet (3D tree culling) · 82 name-your-file card · 83 corner egg (one at a time to 10 buddies) · 84 hand-picked Vault (editor at /vault) · 85 shop power bars · 86 v0.2.201 touches (free sequencer dots, tracker gap) · 87 YOUR SHIP (skill-tree middle) · 88 hold-to-buy with gems + gem ring opens the gem math · 89 one screen at a time (Fusebox lock + teaser, Vault card) · 90 buddy sounds · 91 space bar unlocks ·
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
- Early economy (v0.2.191): PAD_COSTS pads 2–5 = 5 / 10 / 25 / 100 units (0.5 / 1 / 2.5 / 10 mJ); drum tracker ACTIVATE = `DRUM_TRACKER_COST` (10 = 1 mJ, v0.2.192); alienCost(1) = 50,000 (5 J); soundLibCost(2) (shaker) = 80,000 (8 J);
  `dotBase(-1)` = 2 (dot rows ×2, ×6, ×12…), each DOTS upgrade +1. The Vault price table (js/74) was built on the old pace: rerun tools/vault_prices.py if it feels off.
  js/82 asks an unnamed slot "what's your name?" once at 25 J (small bottom card, `ab2_nameAsked_N`). Vault BACK sits top-right like the Bunker's.
- First eggs (v0.2.193): the level-1 egg rolls in at `EGG_AT`=100 (10 mJ, js/66) and costs alienCost(0)=250 (25 mJ). js/83: 10 s after the first hatch
  (once nav-locked / buddy-hold are gone) two `.twinEgg`s roll in either side of the score, each a different `buddyPickFor` pick, alienCost(1)=500 (50 mJ), alienCost(2)=1000 (100 mJ, v0.2.212); tapping one writes its pick to alienData[n].base and calls buyAlien. Score text (`scoreParts`) stays in a unit until 10,000 of it; jParts /
  formatMult / fmtJoulesExact never show more than 2 decimals.
- STORE SALE (v0.2.194): `SHOP_SALE`=.5 in js/01 multiplies the unlock constants and, via wrappers at the end of js/01, alienCost (except buddies 1–3 and
  100+, which derive from 98), soundLibCost, seqTrackCost, alienBoost / multiClick / dot / seqMultiClick costs; js/37 halves PARTY_LADDER + SEQ_FEATS.
  Pads and the first three buddies are hand-set and NOT on sale. Prices quoted elsewhere in these notes are from before the sale.
- VAULT CONTENT (v0.2.194, js/84): the Vault shows ONLY /vault/entries.json ({id,name,tab,price in units,text}), written by the editor at /vault
  (vault/index.html: library = vault/library.json, the old content; PUBLISH commits entries.json via the GitHub API with the creator's token; PREVIEW
  makes the game on that browser use the draft, localStorage ab2_vaultPreview / ab2_vaultDraft). js/84 overrides vaultEntries / vaultTipsIn /
  vaultEntryCost / vaultCounts; ids are 'c_'+id. js/68 / 73 / 74 content is no longer read.
- Corner egg (v0.2.199, js/83, replaces the two eggs and v0.2.198's always-on egg): after the first hatch (+10 s) ONE egg sits top-left (`.cornerEgg`; fixed on desktop at the top-left of `#gameView .app`, after EDIT PADS on
  sideways phones, under the PARTY pill if that's in the corner) until 10 buddies (`LAST`); then `#eggShopNote` once per slot (`ab2_eggShopNote_N`).
  `#shopEgg` wiggles on the Shop's PET ALIEN BUDDY card; both eggs share one pick per buddy number and a capture listener on #alienBuyBtn sets `alienData[n].base`.
- Shop power bars (v0.2.199, js/85): jHtml / fmtJh are wrapped to tag the unit span with `data-u` (raw units). Any visible price with a class in its `SEL`
  gets a 7px strip (`.spb`, no number) at the bottom of its button / card (host gets +7px bottom padding). 💎 prices fill against alienGems. MAX / text = no bar.
- Desktop pad fit (v0.2.199, js/18 fitPadArea): after the size estimate, it measures the real grid bottom and shrinks until it ends 24px above the window
  and the centred column no longer spills.
- YOUR SHIP (v0.2.201, js/87): the 'core' node is now the ship: owned free once skillTreeUnlocked (so the Quad Suns are the first buys), drawn as an SVG
  ship (`.st-ship`), moved with CSS `translate` (+ `el._mx/_my` for js/81). `shipFlyTo(id)`; wraps stFocusNode / openStDetail (owned nodes) /
  renderSkillTree; it circles its target (suns: chases the orbit). Tap = fly home.
- Pads 5–8 (v0.2.201, js/05 rebuildPadGrid): outlines come two at a time and pads are placed by grid-row/column: 5 BR, 6 TR, 7 BL, 8 TL around the 2×2
  (not in daw-wide: one row there, js/86). PAD_COSTS 6–8 = 2.5 / 25 / 250 J (v0.2.202). `body.pads-wide` (5+ pads) makes the desktop column stack from the top.
- Sequencer dots (v0.2.201, js/86): owning a sequencer track sets `seqTrackerActive` and `shop.seqDotsUnlocked`; `#seqTrackerOverlay` is hidden.
- First-press ring (v0.2.203, js/65 wake): `.pad.intro-hi` (infinite) only on the 'pads' intro of a fresh file (no buddies, score 0), removed on the first
  pointerdown/keydown. EDIT PADS is hidden (`body.edit-pads-off`, js/86) until drum.pads >= 3.
- Hold to buy (v0.2.204, js/88): #stDetailBuyBtn whose text starts with UNLOCK becomes "HOLD TO UNLOCK" (1.4 s; a plain click is swallowed). The gem ring's
  tap opens openGemStats (+ a hold tip). Party unlock song: js/65 `partySong(S,t)` locks to `window._seqMark` / seqBpm and stretches the light show to fit.
- FUSEBOX (v0.2.205): the shop's player-facing name (ids/classes/code still say store/shop). js/89: `body.fuse-locked` until drum.seqTracks>=1; the
  first buddy plays js/65 'navB' (bunker only), the sequencer plays 'navS' (fusebox only) ~2.6 s later; files opened while locked use 'allB'.
  `pageLocked(id)` drops locked pages from js/22's swipe order; openStore is a no-op while locked. Vault: `vaultUnlocked` (js/02), `body.vault-locked`
  hides #tipsBtn + the swipe page; `#vaultBuyCard` sits before the DRUM PAD section, VAULT_COST = 150 J (v0.2.215).
- FILL (v0.2.205, js/34): `#dawFillBtn` (top-left) / `#dawFillBtnR` (top-right) per empty side; one side filled with the other empty = '0px 2fr 1fr'
  (game 2/3, a blank 1/3 kept for future side-by-side views), both = `daw-full`; hold 2 s = both. Closing both panels never auto-fills.
- Heat lamp (v0.2.205, js/50): `lampState/drawLampCone/drawLamp` in the egg reveal; taps wait LAMP_T (1.5 s) from `st.lampT0`; sways ±1.5°.
- Ghost pad key (v0.2.206, js/05): the next ghost pad shows `.pad-key.ghost-key` for index drum.pads; the global keydown buys it (unlockGhostPad) or shakes it.
- Device audit (v0.2.207): /home/claude/preview/audit.py runs stages A–J (fresh → buddy → sequencer/fusebox → bunker → late → egg → tree → detail → gem
  math → FILL) on 9 sizes and reports overlaps / off-screen / errors (tipsBtn and the full-width scoreEl box are known false positives).
  Fixes: js/18 phone pad sizing uses the real bottom-row button (sideways iPad); js/83 egg avoids the score on sideways phones and pads the score row /
  drops the sequencer on desktop to make room (`setEggPad` / `setEggDrop`); js/71 desktop gem ring falls back to the column's top-right.
- Score unit (v0.2.201): scoreParts shows MILLIJOULES below 10 J, then JOULES (≤2 decimals).
- v0.2.208: BUDDY SOUNDS (js/90): every buddy brings `alienData[i].snd` (default EXTRA_SOUNDS_ORDER[i], cycles); `unlockedSounds` = pad sounds + buddy
  sounds + planets; `drum.extraSounds` is synced to the distinct buddy-sound count (still ×1.2 each); #soundLibCard hidden. `buddyVoice(i,times)` plays it
  (hatch ×2 from js/50, hatch-screen taps, floating taps unless the target is clickable, #alienNamePreview, designer canvas via `bdCurrentIdx`).
  Future: an unlock to change a buddy's sound; planet/continent eggs that bring planet sounds. `SOUND_TRIM` (js/03) = per-sound level trims; master has a
  28 Hz high-pass + −2.5 dB shelf at 9 kHz. FUSEBOX is bought from `#fuseTeaser` (js/89, FUSE_COST 15 J, save `fuseboxOwned`); disco ball waits for it.
  `tzPlace` (js/89) places both teasers (desktop: hanging above the score). `openNewlyUnlocked('bunker'|'fuse'|'vault')` opens a page after its unlock;
  desktop file open leaves unlocked panels open. partyMult = 2×1.5^(lvl-1). js/18 phone pads: `body.pad-squeeze` shrinks the header when pads don't fit
  (Galaxy Fold / big system font); the grid is always clamped to the room left. audit.py now includes Fold / Flip sizes (Android UA).
- v0.2.209: Buddy Keys VOICE LIMIT (js/60 playNote: each note has a kill gain `k`; over MAXV (10 desktop / 7 phone / 5 lite) the oldest is
  `hardKill`ed: 12 ms fade + oscillators stopped; release() stores `o._oscs` / `o._end`). js/36 `seqBeatNow` returns null when audioCtx.currentTime
  stalls >150 ms, so party styles fall back to the steady clock instead of freezing. Eggs (js/50) have wavy ribbons + `sparkles()` (no polka dots /
  speckles: trypophobia). Match cards: no FOIL/HOLO label (js/48). Quad Suns cost 100 💎 (js/20 costBalance). Ship (js/87): new SVG with a buddy pilot;
  tap = `goHome()` (phone swipeNavGo(0,1), desktop closeSkillTree). js/16 buyNextPad fills a new pad with the first unlockedSounds() entry not on a pad.
  Corner egg (js/83): `.pe-lamp` + `.pe-wire` cord (clip-path fill = score/cost); tap lights it (`.lit`) then buyAlien with
  `__eggOpenOpts={landed,lampOn}` (js/50 starts lampT0 1.7 s back). Fuse teaser door (`door` 0..1 in js/89 paint). Vault cutscene `playVaultScene`
  (js/89, #vaultScene). daw-full hides both FILL/SHRINK buttons (js/34).
- v0.2.210: the next ghost pad has `.gp-bar` (a `.spb` strip, js/05 updateGhostPad, refreshed every 250 ms). js/91 SPACE = press the cheapest affordable
  on-screen unlock (drum/seq tracker ACTIVATE, #padEgg / .cornerEgg, #seqTeaser, #fuseTeaser, #partyTeaser) through its own handler; none
  affordable = the cheapest shakes; on #eggReveal it taps the egg / presses AWESOME. Skips text boxes, Buddy Race and the Cockpit. Add new teasers to its list.
- v0.2.211 SINGING: js/90 buddyVoice → `sing(i)` sets `BUDDY_SING[i]`; js/46 `buddySing(i)` = {m mouth 0..1, h hop 0..1} for 0.6 s and drawBuddy reads it
  for any call with an idx (mouth bead hole ×2.5, hop −10% size; float view skips the hop: floating sprites are repainted for 0.6 s + CSS `.bd-sing` hop).
  Calls without an idx pass `o.sing` themselves (js/47 designer).
- v0.2.212: drum ACTIVATE is `.act-btn` (index.html: dots / ACTIVATE / #drumActPrice / `.spb.ab-bar`); js/07 updateDrumTrackerOverlay toggles `.can`
  and fills the bar (every 250 ms); styles at the end of css/style.css. alienCost(2) = 1000 (100 mJ): first eggs 25 → 50 → 100 mJ, then 125 J.
- v0.2.213: showToast (js/04) also clears the ACTIVATE button's own rect (it's taller than #drumTrackerOverlay). Desktop `.pad-key` (not `.ghost-key`) is clickable:
  the pad's pointerdown opens openPadPicker(idx) when the target is the badge.
- v0.2.214: alienCost(3/4/5) = 10,000 / 50,000 / 250,000 (0.5 / 2.5 / 12.5 J on sale); n≥6 = `_alienCurve(n-3)` (the old curve, shifted 3 buddies later),
  so alienCost(98) = the old alienCost(95) (incubator lamps, extra bunkers and 100+ buddies are cheaper). Rerun tools/vault_prices.py if the Vault pace feels off.
- v0.2.215: PAD_COSTS[4] = 750 (75 mJ, after the first buddy). VAULT_COST = 1.5M (150 J). js/91 Space also buys #vaultBuyCard, starts the matching game
  (`#matchingGameBtn.match-glow`) when nothing is affordable, and clicks #matchVictoryClose on the win screen. js/83 setEggPad pads #scoreRow on BOTH sides.
  The Fusebox arrow (js/07 arrowShop) is off. Sequencer step toggles (js/06) no longer preview the sound.
- v0.2.216: js/05's document-level touchstart (the PAD_REACH "just outside the grid" helper) only counts touches whose target is inside #gameView and
  only when overlayUp() is false: full-screen layers appended to body (egg hatch, cutscenes, Vault door, minigames) never fire pads under them.
- v0.2.217: desktop `.seq-teaser` is calc(100% - 100px) wide, centred (clear of the edge tabs).
- v0.2.218: js/91 Space no longer includes #ghostPad (new pads only via their hotkey / tap).
- v0.2.219: PLANET HOP is bought in the bunker for MG_PRICE.ph = 5 💎 (js/44 mgBuy('ph'), via #planetHopBtn's click in js/41) → levels 1–3;
  mg_cockpit opens 4–5 (mgPhAccess / mgPhLockMsg). mgRefresh shows #planetHopBtn always, right after #matchingGameLock. Both buttons get SVG icons
  as `::before` data-URIs (css end; survives updateMatchingBtn's inline styles). Once the Cockpit is owned they move into it (unchanged).
- v0.2.220: js/91 Space starts the matching game only when #matchingGameBtn is visible on screen, no nav-locked / buddy-hold, and totalAliens ≥ 1.
- v0.2.221: js/65 nav / navB / navS cutscenes leave the panel they unlock OPEN (tuckSidebars skips it, its tab label is set when the cutscene opens it);
  js/89 openNew skips panels that are already open. Corner egg `.pe-tag` sits above `.pe-wire` with a solid background.
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
- Everything under 100 J shows in mJ (jParts, v0.2.195: "5,000 mJ"); the score spells out MILLIJOULES (up to 99,999) / JOULES (up to 9,999), then kJ, MJ … QJ, then scientific. Sideways phones use the short symbols.
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
- Lists that close on finger-DOWN (js/05 pad sound list) leave a stray click for whatever is underneath: call `swallowTaps(ms)` (js/05) when closing them.
  Onboarding arrows (js/07) only show when `arrowTargetSeen(button)` and are re-checked on every tap.
- iPhone only shows the keyboard if `focus()` happens inside the tap itself, so open text boxes synchronously (no setTimeout).
- No 👽 emoji anywhere: buddies are drawn (46-buddies). The shop has no emoji except 💎, and js/70 draws every 💎 on screen as the
  Gem Buddy (`span.agem`; `.gem-icon` slots and `makeLiveAlienGem()` give the bobbing one). Keep writing 💎 in code: it's swapped automatically.

## Design rules the creator has set
- Teach, don't hand-hold: no signs explaining the obvious; cues only for new mechanics. No pop-ups that break the music.
- Rhythm games: no PERFECT/EARLY/LATE judgments, the beat never drops on a miss, hits sound musical.
- Progress should feel earned (later nodes and the second half of the shop cost more), but the early game should hook fast:
  level 1 = hatch the first egg, level 2 = unlock the sequencer.
- Long-term: the game becomes a full DAW that teaches every part of music, and an educational tool teachers can use in class.
