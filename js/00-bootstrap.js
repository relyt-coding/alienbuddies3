// ── Early constants (must be first — used throughout) ──
// Desktop layout = wide window + a mouse/trackpad (any-pointer also covers touch laptops). Re-checked when the window is resized.
// Settings → LAYOUT can force 'desktop' or 'mobile'; 'auto' = wide window and not a phone/tablet browser.
function _layoutPref(){try{return (JSON.parse(localStorage.getItem('ab2_v5_settings')||'{}').layoutMode)||'auto';}catch(e){return 'auto';}}
function _detectDesktop(){
  const pref=_layoutPref(),wide=window.innerWidth>=900;
  if(pref==='mobile')return false;
  if(pref==='desktop')return wide;
  if(window.matchMedia('((pointer: fine) or (any-pointer: fine)) and (min-width: 900px)').matches)return true;
  return wide&&!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
let IS_DESKTOP = _detectDesktop();
const IS_MOBILE_DEVICE = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent);
let _autoParticleAccum = 0;

'use strict';
