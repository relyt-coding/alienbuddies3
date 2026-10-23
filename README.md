# Alien Buddies

Plain HTML/CSS/JS, no build step. Open `index.html` (0.2) in a browser or deploy the folder as-is.

- `index.html` – page markup, links the CSS and loads the scripts in order
- `css/style.css` – all styles
- `js/` – game code, loaded in numeric order with plain `<script>` tags (not modules):
  `00-bootstrap` (must stay first) · `01-constants` · `02-save-and-state` · `03-audio` · `04-toast-soundboard` · `05-pads` · `06-sequencer` · `07-tips` · `08-matching-game` · `09-sound-picker` · `10-home-screen` · `11-bouncers-party` · `12-tiers-and-bunker` · `13-score-stats` · `14-tap-and-sequencer-clock` · `15-render` · `16-purchases` · `17-nav-fullscreen` · `18-desktop-layout` · `19-wav-export` · `20-skill-tree` · `21-legacy-safari` (fallbacks for old iPhones)
- `v0.1/index.html` – frozen Version 0.1 (single file, untouched)

Rule: top-level code in a file can only use functions/variables from files that load **before** it
(or call them later, inside event handlers/functions). Keep that in mind when adding code.

Version: set `GAME_VERSION` in `js/01-constants.js` (shown in Settings and on the home screen) — bump it on every build: 0.2.5, 0.2.6, ...
