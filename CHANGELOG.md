# Changelog

Newest first. Maintained by sync-alienbuddies.ps1.

## v0.2.130 - 2026-11-13 08:43

- Matching cards: removed the dark outlines from the emoji and buddy art; a soft drop shadow keeps it readable.
- Egg reveal: eyes, beads and mouth slide behind the body while it spins instead of poking out past the fluff; fur no longer re-generates each frame as the buddy grows in (no more shimmer).
- Antennas now bob on the same breathing beat as the head when idle, so they look connected.

## v0.2.129 - 2026-11-13 07:59

- Matching cards: sharper, more detailed art (drawn at a resolution that fits the card size) and finer galaxy backs
- One tap on UNLOCK · 💎 1 now buys the matching game and starts level 1
- Naming a buddy: the text box no longer looks like a contact-name field, so iPhones shouldn't offer AutoFill Contact
- Naming a buddy: the card stays whole and steady above the keyboard (it shrinks to fit instead of getting cut off)
- Shop buttons on phones: a tidy two-row layout with the price on its own strip, so text never overlaps

## v0.2.128 - 2026-11-13 07:47

- Matching cards: calmer, dimmer galaxies on the face-down cards
- Buddies on matching cards mostly face you now (straight on or a 3/4 turn, sometimes a head tilt); side-on poses are rare
- Plain, symmetric pictures (UFO, planet, gem, flask and more) lean 8° for a bit of style

## v0.2.127 - 2026-11-13 07:25

- Matching cards redesigned as ARCADE TILES: chunky pixel art on bold colour tiles with thick outlines; some buddy cards come out as rare HOLO or FOIL editions
- Face-down matching cards are now slowly swirling pixel galaxies
- If the page ever gets zoomed in, it zooms back out by itself (and text boxes no longer make iPhones zoom in when you tap them)
- The dot tracker panels stay scrolled to the bottom (whole last row in view); they only move when you scroll them yourself, and snap back when you return to the drum pads
- Shop: no emojis anymore except the gem
- Title screen: the rename pencil sits right next to the ✕

## v0.2.126 - 2026-11-12 22:19

- Egg polka dots are scattered at random now (different on every egg, in the colours of the buddy inside) instead of sitting in rows
- The ACTIVATE arrow lines up exactly with the middle of the button

## v0.2.125 - 2026-11-12 21:48

- The ACTIVATE arrow now points at the button from the side, so nothing on the screen jumps when it appears
- Title screen: the rename pencil sits closer to the ✕ (still with a safe gap)

## v0.2.124 - 2026-11-12 21:40

- Matching cards got a glow-up: every science picture is now a glowing neon sign on a holo-foil trading card with a gold frame; buddy cards get the foil too, with a spotlight in the buddy's colour
- Drum pads catch light taps better: a tap in the gap between pads (or just past the edge) plays the nearest pad, and two fingers on one pad both count
- Sound comes back by itself after switching apps (no more refreshing): the game wakes the audio when you return and on your first tap, and rebuilds the sound engine if the phone froze it
- Special eggs are now a 5% find (rarer than before)
- Settings has a VIEW section (trackers, sequencer, drum pads, step counts), the same switches as the VIEW button
- Naming a buddy: NAME FOR ME and CLEAR keep the keyboard up, and the card stays put instead of sliding around
- Buddy Designer button stays hidden until you unlock Buddy Designer
- Title screen: the rename pencil is black & white, and on saved files it sits next to the ✕ with a safe gap
- Party style chip and toasts no longer use emojis
- Shop: long upgrade names never run under the price anymore

## v0.2.123 - 2026-11-12 20:25

- New BEST BUDDY page (Alien Evolution path, right after Buddy Designer): your favourite buddy hangs out on a platform doing random idle animations: looking around, hopping, spinning, wiggling, napping. Tap them for hearts
- Best Buddy sits left of the bunker; the Cockpit is now left of that. ◀ ▶ arrows and SWITCH BUDDY pick who's out
- ACCESSORIZE: 100 accessories in 4 categories (25 head, 25 eyes, 25 shoes, 25 stands). Hats, eyewear and shoes show on floating buddies and in the bunker too
- 25 puzzles along the Alien Evolution path unlock the accessories: Slide Puzzle, Light Up, Drum Echo, Twist Tiles, Bead Sort, Buddy Maze, Odd One Out and Beat Match, getting harder as you go. Pay once, play until solved
- Theme songs: open a buddy in the bunker and tap MAKE A SONG FOR THIS BUDDY for a clean sequencer slate. Your own pattern comes back untouched, and the song plays (with dancing) on the Best Buddy page
- Friendlier eyes: buddies now have glossy plush-toy safety eyes instead of barrel beads
- The Best Buddy page goes easy on older phones (lighter drawing, floating buddies rest while it's open)

## v0.2.122 - 2026-11-12 01:20

- Every alien buddy now hatches from an egg, so you meet each one and can name it (buy several quickly and they hatch one after another)
- New egg art: decorated craft eggs painted in the colours of the buddy inside (polka dots, a zigzag band, speckles, shine and real cracks)
- Special eggs are polished gold with a moving shimmer, raised stars and a rainbow band
- Special buddies are now a 10% find on any egg instead of every 10th buddy (each of the 10 still appears once per game)
- The egg draws faster on older phones

## v0.2.121 - 2026-11-11 22:26

- Egg hatching: your first alien buddy hatches from an egg with a loot-box reveal (tap 3 times to crack it, flash, rays, confetti, the buddy spins out to face you)
- Every 10th buddy hatches from a golden special egg: 10 new special buddies (Golden, Cosmic, Aurora, Magma, Frost, Neon, Rainbow, Shadow, Pearl, Supernova) with a sheen, an orbiting ring and sparkles
- Buddies unlock in a random order every game (no repeats); aliens you already own keep their looks
- New floating buddies always start facing the camera

## v0.2.120 - 2026-11-11 15:40

- Fix: drum pads no longer drop hits when you play with two fingers on iPhone. Pads now play from the finger touch itself (iOS was cancelling taps it thought might be a pinch), one hit per finger, and two-finger touches on the pads can't start a zoom

## v0.2.119 - 2026-11-11 14:32

- Fix: aliens no longer go missing. Lag used to remove floating aliens and never bring them back; now they're never removed (they just hold still while the game is lagging)
- Every 5 seconds a check puts back any alien that should be on screen but isn't (missing, hidden, lost off-screen or never drawn)
- Fix: aliens no longer slow down while you drum; floating speed is time-based, the same at any frame rate
- Floating buddies hold their pose while you're drumming (and about a second after), and use lighter sprites on phones

## v0.2.118 - 2026-11-11 10:45

- Enhanced alien buddy look: eyes 12% bigger with a second sparkle, mouth 20% bigger, face spaced out 15%, gentle breathing, springier antennae, faint pink cheeks, soft edge light
- Shop: grid is the only layout (the layout setting is gone); bigger prices, especially the 25-gem skill tree unlock
- BUNKER and MATCHING GAME buttons glow once your first gem can unlock the Matching Game
- iPhone 7 / old Safari fixes: Worm Whack, Planet Hop and Beat Defense screens fill the screen (inset not supported on iOS 13); designer swatches and level tiles keep their shape
- Performance on old phones: floating buddies glow with a cheap halo instead of a CSS filter, fewer tumble repaints per frame, party running poses are prepared a little at a time, floaters pause while the Buddy Designer is open

## v0.2.117 - 2026-11-11 08:52

- Glow party: each buddy gets a coloured halo (soft all party long, flaring on the beat)
- Conga line: buddies run upright in side profile, all facing the way the line moves
- New party style PLANET HOP (7th on the Alien Party ladder, 5T): buddies run along the sequencer, hopping every beat and double jumping on beat 4
- Settings → SHOP LAYOUT: A Classic, B Grid, C Tabs, D Shelves (saved per device)
- Tips can be bought in any order; buying a later tip opens it and leaves cheaper ones unread (older saves keep their tips)
- Matching game: no emoji in its label, card pictures 20% smaller, buddies shown in eight different poses

## v0.2.116 - 2026-11-11 08:05

- File select and game header are clean again: no buddy above the title, no icon on saved slots (empty slots keep the moon), no buddy next to ALIEN BUDDIES at the top of the game

## v0.2.115 - 2026-11-11 01:35

- Floating buddies are about 30% bigger and tumble freely in zero gravity: each drifts slowly around its own random axis (turning, tipping and rolling), with the light staying fixed
- The tier-up chime only plays when you can see that tracker (no chime from the shop, bunker, cockpit or behind a popup)
- No alien emoji anywhere: Chloe on the title screen (slowly turning), the header, shop, stats, settings and save slots; new app icons and link preview image; text labels use 🛸

## v0.2.114 - 2026-11-11 01:15

- Alien buddies: the 👽 emoji is replaced by 3D craft buddies (pom-pom body, barrel pony-bead eyes and mouth, pipe-cleaner antennae with glowing tips, duck-shaped popsicle-stick feet). Buddy #1 is Chloe; all 100 buddies have their own colour combo
- Floating buddies turn very slowly while free-floating (they hold still while a party style choreographs them); the bunker grid and the alien profile card show each buddy too
- Buddy model: fluff and stray hairs turn with the body, depth-sorted antennae and beads, squish and contact shadow, glassy eyes, wood-grain feet, warm glow from the tips, blinks about every 15 s
- New skill: BUDDY DESIGNER, the first node on Alien Evolution (after Quad Sun IV, before Gem Harvester I). Open an alien in the Bunker → DESIGN BUDDY: colours for body, eyes, mouth, antenna, tips and feet, plus antenna length and eye size, random and original buttons
- Minigames use buddy #1 (with any redesign): Planet Hop runs in side profile with stepping feet, Worm Whack and Beat Defense show the front view
- Matching game: half the pairs are 29 space & science pictures redrawn in the minigame art style, half are buddies from your bunker (boards saved mid-game with emojis still resume)
- Matching game unlocks in the bunker for 1 gem; Planet Hop moves behind the Minigame Cockpit (levels 1–5). Skill path: Cockpit (3K gems) → Ice Planet (12K) → Worm Whack → Magmora. Saves that already bought Planet Hop keep it
- Sequencer: shows "100 BPM" until BPM control is bought; the pattern label no longer repeats the BPM

## v0.2.113 - 2026-11-10 09:00
- Skill tree rebalance (tested with the test-mode bot): gem bonuses only ever multiply gems per minute, and they're much smaller now
  - Tucana Core and each Quad Sun x1.5 (was x2 / x4); music hubs x1.1 (was x1.5); music branches x1.02 (was x1.2); planet sounds x1.01; other nodes x1.02 (was x1.05). Gem Harvester I / II unchanged
  - The whole tree together is about x200 (was about x1.4 billion, which let the bot buy all 136 nodes in about a minute)
- Skill tree prices: Quad Suns 500; planet path x10; alien path x8; Musical Toolkit unchanged
- Minigame path prices: Ice Planet 3K, Cockpit 12K, Worm Whack 45K, Magmora 150K, Beat Defense 500K, Wyrm Moon 300K, Wyrm Trail 600K / 1M / 1.6M / 2.5M
- Bot timeline (fast player, a minigame level every 4 min): suns 17-24 min, Ice Planet 50 min, Cockpit 1h12, Worm Whack 1h22, Magmora 1h48, Wyrm Moon 2h32, Beat Defense 2h53, Wyrm Trail IV 4h34, last music node ~23h

## v0.2.112 - 2026-11-10 08:30
- Beat Defense: pause button (also P / Esc; switching apps pauses instead of quitting) and a x2 speed button that doubles the tempo so everything stays on the beat
- Beat Defense: tap a tower for UPGRADE (up to level 3: more damage, more range, a little louder) or SELL (60% of everything spent)
- Beat Defense: the towers are your first four drum pads and play the sounds on them (pad 1 rapid, pad 2 cannon, pad 3 blast, pad 4 slow)
- Lite mode for older phones (iOS 15 and older, low-memory devices; ?lite=1 / ?lite=0 to force): minigames draw at 1x, skip glow blurs, fewer particles, no ice wind, shorter cave reverb, simpler chimes
- The minigame gem boost now shows next to your gem rate (bunker, shop) and in the skill tree header
- Planet Hop: crystal bells play a different tune on each level
- Test mode: the bot buys Planet Hop and the Matching Game in the bunker and clears a minigame level every few minutes (option in RUN), so the time table includes the minigames

## v0.2.111 - 2026-11-09 22:20
- Minigames reworked: Planet Hop is in the bunker from the start for 1 Alien Gem (levels 1-5); the Matching Game sits under it for 10 gems
- Matching Game: no intro; level 1 is the 4-card board and is free, each level after needs 4 more Alien Buddies
- Skill tree minigame path: Ice Planet (Planet Hop 6-10) -> Minigame Cockpit -> Worm Whack (1-5) -> Magmora (Planet Hop 11-15) -> Beat Defense; the Wyrm Moon and its trail open Worm Whack 5 levels at a time
- Planet Hop, Worm Whack and Beat Defense now boost Alien Gems: +0.5x per level cleared, +1x for a perfect clear (all stardust / 3 stars / no damage); only the Matching Game gives point multipliers
- New COCKPIT page left of the bunker (5 pages to swipe); on desktop a GAMES button in the bunker opens it
- Worm Whack: 6 pads from level 3
- NEW MINIGAME: Beat Defense: build drum towers around your ship; the radar sweeps once a bar and each tower fires on the beat of the slice it sits in (kick, snare, hi-hat, clap); lizards and scorpions attack across 10 levels
- Old saves keep everything they had (old Planet Hop / Worm Whack nodes become the new ones; Memory Boost refunded)

## v0.2.110 - 2026-11-09 21:00
- Worm Whack: the beat never drops out on a miss; the whole song always plays
- Worm Whack: every squish lands a punchy thump plus a mallet note in the song's key, climbing a melody as your combo grows (gold, boss and held worms play a chord)
- Worm Whack: hits rock harder: zoom punch, flash, slime splatter, bigger impact burst and a squishier worm
- Worm Whack: new combo sound: a rising arpeggio on the beat
- Worm Whack: bosses redesigned as armored wyrms: coiling plated body, horns, snapping mandibles on the beat, eyes that follow you, cracks as they weaken, a white flinch when hit; the Wyrm King wears a crown
- Drum pads: fast rolls (1/16 hats) no longer lose or merge taps; iOS double-tap/magnifier can't swallow quick taps

## v0.2.109 - 2026-11-09 21:10
- Planet Hop: checkpoint crystals play a rising crystal chime in the song's key
- Planet Hop: caves change shape: a tight tunnel to start, opening into big caverns later; the echo and reverb grow and shrink with the space
- Planet Hop: warp portals hum as you get close and play a rising warp when you jump in
- Planet Hop: comets whoosh in and land with a thud on the beat; landed comets are smashed half into the ground with a dirt rim and glowing cracks
- Planet Hop: midground landmarks on every level (landers, dishes, arches, ice spires, frosted pines, geysers, volcanoes, lava falls, cave crystals and more)
- Planet Hop: more double jumps from level 3 on (new close spike pairs and double-double bars)
- Planet Hop ice world: icicles shake loose from cave roofs and land on the beat; ice scorpions; crystal chimes and wind in the music
- Planet Hop ice world: crystal bells: the band drops out and you play the tune by pressing BOUNCE at each bell (bonus stardust)
- Worm Whack + Planet Hop: shakers, hats, cowbells, rims and other busy sounds now have velocity grooves (accents, ghost notes, phrase swells)

## v0.2.108 - 2026-11-09 20:15
- Planet Hop: falling comet meteors dive steeply into the ground, with the tail trailing exactly along the path they came from
- Planet Hop: level 3's cowbell holds off until the last quarter of the song, and sits lower in the mix
- Planet Hop: low gravity gives the music a floaty filter sweep (one sweep per two-beat jump)
- Planet Hop: cave levels get a big cave room and a dotted-eighth echo on the beat (lows kept clean)
- Worm Whack: hits splat the worm flat with dizzy stars, a comic impact burst (BONK! POW! ...), flying dirt and the crater lighting up in the pad's colour
- Worm Whack: misses flash the crater red with a bigger MISS

## v0.2.107 - 2026-11-09 19:02
- Planet Hop: pink bounce pads are always the big launches; small one-beat hops are blue
- Worm Whack + Planet Hop: no more PERFECT / GOOD / EARLY / LATE text or early/late meter; let your ears judge (every in-time Worm Whack hit scores the same)
- Results screens no longer show timing breakdowns
- Planet Hop: obstacles drawn a little smaller than their hit area, so near misses never look like hits

## v0.2.106 - 2026-11-09 18:21
- Planet Hop: double jump during the count-in; if you're still in the air when the music starts, the run carries on from there (no snapping to the ground)
- Planet Hop: new faceted boulder with thick crystal spines; level 1 mixes boulders and flytraps
- Planet Hop: levels 1 and 2 have high stardust arcs you reach with a double jump

## v0.2.105 - 2026-11-09 18:08
- Planet Hop: hop on the spot during the count-in (nothing is judged)
- Planet Hop: press marker icons removed; read the level yourself
- Planet Hop: triangle spikes replaced by each world's spiky boulders, snapping flytraps and lizards that walk toward you (level 1 has boulders only)
- Planet Hop: comet meteors land as molten spheres with glowing cracks and smoke

## v0.2.104 - 2026-11-09 17:50
- Planet Hop: press markers only show on the first two tries of each new move (level 1 no longer marks every jump)
- Planet Hop: the end-of-level crater is a clean, smooth bowl with a glowing hole (no more stones, boulders or bubbles)

## v0.2.103 - 2026-11-09 17:25
- Planet Hop: no more text magnifier, selection or zoom when tapping the buttons fast
- Planet Hop: pits redrawn: rounded edges, shaded walls dropping into darkness, icy depths on Glacia and a lava river on Magmora
- Planet Hop: press markers show the same icons as the JUMP and BOUNCE buttons instead of J and B

## v0.2.102 - 2026-11-09 17:12
- Planet Hop: teaching signs removed; only LOW GRAVITY gets a sign, the first time you meet it (press markers still show new moves)
- Planet Hop: in low gravity your alien floats inside a shimmering bubble (the floating LOW GRAVITY text is gone)
- Planet Hop: checkpoint crystals are rounded gems that start green and turn bright blue-white with a big glow when you pass

## v0.2.101 - 2026-11-09 16:57
- Planet Hop: checkpoint flags are now crystals that light up when you pass them
- Planet Hop: the crater into the underground is friendlier: smooth walls, rounded ledges and glowing orbs instead of sharp crystals
- Planet Hop: removed the ROCK — LAND ON TOP sign on level 2 (the jump markers stay)

## v0.2.100 - 2026-11-09 16:50
- Planet Hop: buttons stack the icon over the word on narrow phones, so BOUNCE and the drum label always fit
- Planet Hop: cave exits are a rocky arch with sunlight, hills and light rays streaming in (moonstone crystals on Luna, icicles on Glacia, lava drips on Magmora)
- Planet Hop: the end-of-level crater is a deep rocky funnel with ledges, glowing crystals and a lit hole into the cave below, with arrows pointing in
- Planet Hop: pits have rock layers, ledges and loose stones at the edges
- Planet Hop: removed the FLOATING ICE sign on level 8

## v0.2.99 - 2026-11-09 16:20
- Planet Hop: removed the bell that rang while collecting stardust and at the checkpoint, and the combo chime
- Planet Hop: removed the READY / 3-2-1 countdown overlay (the count-in clicks still play)

## v0.2.98 - 2026-11-09 14:39
- Planet Hop: a journey through each world. Surface levels end by diving into a crater, cave levels end at a cave mouth back into daylight, and bosses end at a warp portal to the next planet
- Planet Hop: underground levels (2, 4, 7, 9, 12, 14) with a rock roof, stalactites and glowing crystals in each planet's own rock
- Planet Hop: rock platforms match each world (lavender moonstone, ice, volcanic basalt) with a soft glow; replaces the goal pole and the sandstone bricks
- Planet Hop: level 2 renamed Under the Crater, level 9 renamed Crystal Grotto

## v0.2.97 - 2026-11-09 12:41
- Planet Hop: spikes glow (red on Luna, pink on Glacia, amber on Magmora) so they stand out from the ground
- Planet Hop: Luna's rock platforms are now warm sandstone bricks instead of gray
- Planet Hop: level 1 ends with a three-step staircase and a big leap off the top
- Planet Hop: every level finishes at a checkered goal pole

## v0.2.96 - 2026-11-09 12:14
- Planet Hop: levels 1 and 2 are half as long (8 bars), with a checkpoint flag halfway
- Planet Hop: level 1 is gentler: slower tempo (80 BPM), spikes spaced out with rests, one small gap, and a press marker on every jump

## v0.2.95 - 2026-11-09 11:48
- Planet Hop: all 15 levels hand-built to their songs: teach, develop, twist, victory lap
- Planet Hop: teaching signs, glowing press markers and a mid-level checkpoint flag
- Planet Hop: levels 1-5 are jump only; the BOUNCE button arrives on level 6
- Planet Hop: redesigned buttons that show the drum they play, plus beat lights and a next-press glow
- Planet Hop: detailed level art (layered terrain, chasms, crystal spikes, hover pads, per-world skies)
- Planet Hop: hops for stardust on flat stretches
- Worm Whack: charts built from musical phrases; kicks on the bottom row, snares on the top
- Worm Whack: boss Wyrms attack in four phases
- Both games: pads play the song, YOUR BEATS levels from your own patterns, arrangements and song
- Both games: SYNC timing calibration and an early/late timing meter

## v0.2.94 - 2026-11-08 21:10

- Drum pad keys now follow the pad grid: top row D F J K, bottom row C V N M (old default keys switch over automatically; custom keys are kept)
- Worm Whack: craters mirror the pads and their keys (4 craters = F J / V N, 6 = D F J / C V N, 8 = all), using your pad sounds
- Planet Hop: left-hand keys (D F) jump, right-hand keys (J K) bounce
- Minigame songs are pure beats now: melodies removed, richer percussion layers, 808 booms and section accents

## v0.2.93 - 2026-11-08 20:50

- New minigame WORM WHACK (skill tree → Minigames): rhythm whack-a-mole on a rocky moon, 30 composed songs/levels, pads = craters, gold/armored/hold worms, mines, Wyrm bosses on 10/20/30, stars + permanent points bonus
- New minigame PLANET HOP (after Worm Whack): rhythm platformer around a spinning planet, 15 levels/songs, jump + double jump + bounce-pad chains, low gravity, Luna/Glacia/Magmora, comet-chase bosses, stardust stars, restart on hit
- Test mode: both minigames open instantly with every level unlocked (TEST panel → MINIGAMES)
- Alien Party store card: no emojis

## v0.2.92 - 2026-11-08 16:30

- Alien Party is a store upgrade (appears at 5M points): Glow, then Disco Orbit, Conga Line, EQ Bars, Bounce House, Galaxy (each ×10 the price)
- Sequencer Upgrades in the store: BPM 10M, 32 steps 32M, 64 steps 64M, Arrangement tab 10B, Song tab 10T (off the skill tree; old saves keep them + get gems back)
- Click ×, Alien Power, dot multipliers and Tier 3 cost +75% per level, stacking
- Party styles: aliens choreograph to the music (EQ bars use the real audio spectrum)
- Sideways phone layout, desktop DAW mode with opt-in FILL
- 3D solar-system skill tree (suns orbit the core; 3D / FLAT toggle)
- Gems-only skill tree (Core ×2, Quad Suns ×4), 3-mode alien toggle, Name for me, sound previews on purchase
- Device fixes: tablet pads, big-monitor steps, onboarding arrow over the shop

## v0.2.91 - 2026-10-28 09:24

- Skill tree popup always stays on screen next to its bubble (phones slide the map)
- 32 / 64 Steps moved after Groove; Tuning Fork leads straight to Effects
- New effects: Filter, Distortion, Chorus, Bitcrusher, Flanger, Phaser, Tremolo, Ping-Pong
- Mastering hub after 32 Steps: EQ, Compression, Panning (+ auto-pan), Sidechain
- Effects work on piano roll layers, plus a MASTER channel (EQ + compression on the whole song)
- Effects window: channel list + collapsible sections

## v0.2.90 - 2026-10-28 00:37

- Musical Toolkit skill tree: 32/64 Steps (moved out of the shop), Effects (Reverb, Echo), Key (8 key packs), Piano Roll (layers 2-6), Groove (Velocity), Arrangement (Arrangement Mode, Song Mode)
- Sequencer controls stay hidden until their node is bought
- Song key (major/minor) retunes melodic sounds
- Piano roll: up to 6 instrument layers lined up with the sequencer steps
- added: js/26-music-unlocks.js, js/27-piano-roll.js

## v0.2.89 - 2026-10-27 21:46

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js
- changed: js/05-pads.js
- changed: js/12-tiers-and-bunker.js
- changed: js/20-skill-tree.js

## v0.2.88 - 2026-10-27 20:34

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/02-save-and-state.js
- changed: js/05-pads.js

## v0.2.87 - 2026-10-26 23:14

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/08-matching-game.js
- changed: js/17-nav-fullscreen.js
- changed: js/18-desktop-layout.js

## v0.2.86 - 2026-10-26 22:49

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js

## v0.2.85 - 2026-10-26 21:37

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js
- changed: js/06-sequencer.js
- changed: js/08-matching-game.js
- changed: js/09-sound-picker.js

## v0.2.84 - 2026-10-26 16:56

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/22-swipe-nav.js

## v0.2.83 - 2026-10-26 11:09

- changed: js/01-constants.js
- changed: js/18-desktop-layout.js
- changed: js/22-swipe-nav.js

## v0.2.82 - 2026-10-26 08:51

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js
- changed: js/10-home-screen.js
- changed: js/15-render.js
- added: css/polish.css
- added: js/25-polish.js

## v0.2.81 - 2026-10-26 08:33

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js
- changed: js/02-save-and-state.js
- changed: js/03-audio.js
- changed: js/04-toast-soundboard.js
- changed: js/06-sequencer.js
- changed: js/10-home-screen.js
- changed: js/14-tap-and-sequencer-clock.js
- changed: js/15-render.js
- changed: js/16-purchases.js
- changed: js/19-wav-export.js
- changed: js/20-skill-tree.js
- changed: js/22-swipe-nav.js

## v0.2.79 - 2026-10-26 07:51

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js
- changed: js/03-audio.js
- changed: js/04-toast-soundboard.js
- changed: js/05-pads.js
- changed: js/06-sequencer.js
- changed: js/07-tips.js
- changed: js/08-matching-game.js
- changed: js/14-tap-and-sequencer-clock.js
- changed: js/15-render.js
- changed: js/18-desktop-layout.js
- changed: js/19-wav-export.js
- changed: js/23-more-menu.js
- added: fonts/

## v0.2.78 - 2026-10-26 07:15

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js
- changed: js/03-audio.js
- changed: js/06-sequencer.js
- changed: js/18-desktop-layout.js
- changed: js/19-wav-export.js

## v0.2.76 - 2026-10-26 07:02

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/03-audio.js
- changed: js/05-pads.js
- changed: js/19-wav-export.js

## v0.2.72 - 2026-10-26 06:52

- changed: index.html
- changed: js/01-constants.js
- changed: js/03-audio.js
- changed: js/04-toast-soundboard.js
- changed: js/08-matching-game.js
- changed: js/11-bouncers-party.js
- changed: js/17-nav-fullscreen.js
- changed: js/18-desktop-layout.js
- changed: js/19-wav-export.js
- changed: js/20-skill-tree.js
- changed: js/24-gamepad.js
- added: img/

## v0.2.66 - 2026-10-25 23:05

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/22-swipe-nav.js

## v0.2.65 - 2026-10-25 22:57

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/05-pads.js
- changed: js/22-swipe-nav.js

## v0.2.63 - 2026-10-25 22:41

- changed: js/01-constants.js
- changed: js/22-swipe-nav.js

## v0.2.62 - 2026-10-25 22:35

- changed: js/01-constants.js
- changed: js/22-swipe-nav.js
- changed: js/24-gamepad.js

## v0.2.60 - 2026-10-25 22:15

- changed: index.html
- changed: js/01-constants.js
- added: js/24-gamepad.js

## v0.2.59 - 2026-10-25 22:11

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/06-sequencer.js
- changed: js/08-matching-game.js
- changed: js/11-bouncers-party.js
- changed: js/12-tiers-and-bunker.js
- changed: js/18-desktop-layout.js
- changed: js/21-legacy-safari.js

## v0.2.55 - 2026-10-25 21:49

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/22-swipe-nav.js

## v0.2.53 - 2026-10-25 21:44

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/22-swipe-nav.js

## v0.2.50 - 2026-10-25 21:35

- changed: css/style.css
- changed: js/01-constants.js

## v0.2.49 - 2026-10-25 21:29

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js
- changed: js/02-save-and-state.js
- changed: js/03-audio.js
- changed: js/05-pads.js
- changed: js/06-sequencer.js
- changed: js/12-tiers-and-bunker.js
- changed: js/15-render.js
- changed: js/18-desktop-layout.js
- changed: js/19-wav-export.js
- changed: js/20-skill-tree.js
- added: js/23-more-menu.js

## v0.2.45 - 2026-10-25 21:11

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js
- changed: js/02-save-and-state.js
- changed: js/06-sequencer.js
- changed: js/08-matching-game.js
- changed: js/13-score-stats.js
- changed: js/18-desktop-layout.js
- changed: js/20-skill-tree.js

## v0.2.38 - 2026-10-25 20:47

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/07-tips.js
- changed: js/11-bouncers-party.js

## v0.2.36 - 2026-10-25 20:39

- changed: css/style.css
- changed: js/01-constants.js
- changed: js/08-matching-game.js
- changed: js/11-bouncers-party.js
- changed: js/18-desktop-layout.js
- changed: js/22-swipe-nav.js

## v0.2.33 - 2026-10-25 20:30

- changed: css/style.css
- changed: index.html
- changed: js/01-constants.js
- changed: js/02-save-and-state.js
- changed: js/04-toast-soundboard.js
- changed: js/06-sequencer.js
- changed: js/15-render.js
- changed: js/16-purchases.js
- changed: js/17-nav-fullscreen.js
- changed: js/19-wav-export.js
- changed: js/20-skill-tree.js

