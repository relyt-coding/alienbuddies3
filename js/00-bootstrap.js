// ── Early constants (must be first — used throughout) ──
const IS_DESKTOP = window.matchMedia('(pointer: fine) and (min-width: 900px)').matches;
const IS_MOBILE_DEVICE = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent);
let _autoParticleAccum = 0;

'use strict';
