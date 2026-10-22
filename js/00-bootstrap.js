// ── Early constants (must be first — used throughout) ──
// Desktop layout = wide window + a mouse/trackpad (any-pointer also covers touch laptops). Re-checked when the window is resized.
function _detectDesktop(){return window.matchMedia('((pointer: fine) or (any-pointer: fine)) and (min-width: 900px)').matches;}
let IS_DESKTOP = _detectDesktop();
const IS_MOBILE_DEVICE = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent);
let _autoParticleAccum = 0;

'use strict';
