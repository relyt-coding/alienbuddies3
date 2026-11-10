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

// ── LITE MODE for older phones (iPhone 7 and similar) ──
// The minigames draw at 1× resolution, skip glow blurs, drop the heaviest audio extras and use fewer particles.
// On automatically for iOS 15 and older and for low-memory devices; force it with ?lite=1 (or turn it off with ?lite=0).
const MG_LITE=(function(){
  try{const q=new URLSearchParams(location.search).get('lite');if(q==='1'||q==='0')localStorage.setItem('abLite',q);
    const s=localStorage.getItem('abLite');if(s==='1')return true;if(s==='0')return false;}catch(e){}
  const m=navigator.userAgent.match(/OS (\d+)_\d+[_\d]* like Mac OS X/);if(m&&+m[1]<=15)return true;
  if(navigator.deviceMemory&&navigator.deviceMemory<=2)return true;
  if(IS_MOBILE_DEVICE&&navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2)return true;
  return false;
})();
// glow blurs are the most expensive canvas effect on old Safari: in lite mode they simply never switch on
function mgLiteCtx(ctx){if(MG_LITE)try{Object.defineProperty(ctx,'shadowBlur',{get(){return 0;},set(){}});}catch(e){}return ctx;}
const MG_DPR=()=>Math.min(MG_LITE?1:2,devicePixelRatio||1);
