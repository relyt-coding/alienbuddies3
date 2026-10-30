# Alien Buddies

Plain HTML/CSS/JS, no build step. Open `index.html` (0.2) in a browser or deploy the folder as-is.

- `index.html` – page markup, links the CSS and loads the scripts in order
- `css/style.css` – all styles
- `js/` – game code, loaded in numeric order with plain `<script>` tags (not modules):
  `00-bootstrap` (must stay first) · `01-constants` · `02-save-and-state` · `03-audio` · `04-toast-soundboard` · `05-pads` · `06-sequencer` · `07-tips` · `08-matching-game` · `09-sound-picker` · `10-home-screen` · `11-bouncers-party` · `12-tiers-and-bunker` · `13-score-stats` · `14-tap-and-sequencer-clock` · `15-render` · `16-purchases` · `17-nav-fullscreen` · `18-desktop-layout` · `19-wav-export` · `20-skill-tree` · `21-legacy-safari` (fallbacks for old iPhones) · `22-swipe-nav` · `23-more-menu` (KEY + EFFECTS windows) · `24-gamepad` · `25-polish` · `26-music-unlocks` (shows sequencer features as they're bought in the Musical Toolkit branch) · `27-piano-roll` · `28-test-mode` (only active at /test) · `29-vocals` (VOX: microphone recording on up to 10 layers) · `30-vocal-fx` (Autotune, Voice Changer, Harmonizer, Vocoder)
- `v0.1/index.html` – frozen Version 0.1 (single file, untouched)

Rule: top-level code in a file can only use functions/variables from files that load **before** it
(or call them later, inside event handlers/functions). Keep that in mind when adding code.

Version: set `GAME_VERSION` in `js/01-constants.js` (shown in Settings and on the home screen) — bump it on every build: 0.2.5, 0.2.6, ...

## Test mode

`alienbuddies.space/test` (or `index.html?test` locally) runs the same game with **separate test saves** and a 🧪 panel:
autoplay bot with fast-forward (1×–1000×/MAX), auto-buy / auto-tap, a run timer + purchase/milestone log,
time table + charts, saved-run comparison, cheats, a performance overlay and an audio stress test, and CSV/JSON export.
The `/test` route comes from the `_redirects` file (Netlify).

## Vocals (VOX)

Unlocked by the **Vocals** hub in the Musical Toolkit (after Arrangement): 2 layers, then 4 / 7 / 10 with Backing Vocals, Vocal Stack and Choir.
- Takes are raw mic audio stored in **IndexedDB** on the device (`alienbuddies_vocals`, or `alienbuddies_vocals_test` at /test). Saves only hold the clips
  (`{t: take id, s: start step, o: offset into the take (s), d: length (s), g: volume}`), so recordings never leave the device and are not in exported saves.
- The timeline is the song: PAT loops the beat for as long as the vocals run, ARR / SONG play the arrangement / song. ▶ and REC start from the green flag.
- Clips are non-destructive (trim / split / record-over only change which part of a take plays). Takes nothing uses are deleted when the game loads.
- Each vocal layer is effects channel `13 + layer` (EFFECTS window → VOCALS). Vocals are included in WAV export.
- While recording, the sequencer is in "studio time": no energy used, no points earned.
- Sync: takes are shifted earlier by the device's audio latency (estimated, or measured with ⚙ MIC → AUTO SYNC) plus a manual nudge; stored per device in `ab2_voxSet`.
- Vocal effects (`30-vocal-fx`, in each vocal layer's EFFECTS → VOICE): Autotune, Voice Changer (pitch / formant / robot) and Harmonizer re-work the take in a
  Web Worker (YIN pitch tracking + PSOLA), cached per take + settings; until ready the raw take plays, and WAV export waits for it. The Vocoder is live
  (16 bands); its synth plays a piano roll layer's notes (the layer can stay muted) or a drone of the song key's chord.
