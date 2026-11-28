// ══════════════════════════════════════════════
//  SMALL v0.2.201 TOUCHES
//  · The sequencer's dots come free with the sequencer: as soon as you own a sequencer track, its dot tracker is active
//    (no 1 mJ ACTIVATE, js/72) and the Shop's sequencer-dots card is unlocked (no DOT_UNLOCK_COST, js/16).
//  · EDIT PADS is hidden until the 3rd pad (body.edit-pads-off, v0.2.203).
//  · With 5+ pads (body.pads-wide) the desktop column stacks from the top (v0.2.202).
//  · The drum tracker row (dots + "1 mJ — ACTIVATE") gets a little room under the score (`.trk-wrap`).
// ══════════════════════════════════════════════
(function(){
  function freeSeqDots(){
    if(typeof runFile!=='undefined'&&runFile)return;   // v0.2.247: a New Game+ run buys this ACTIVATE again
    if(typeof drum==='undefined'||!(drum.seqTracks>=1))return;
    let ch=false;
    if(typeof seqTrackerActive!=='undefined'&&!seqTrackerActive){seqTrackerActive=true;ch=true;}
    if(typeof shop!=='undefined'&&!shop.seqDotsUnlocked){shop.seqDotsUnlocked=true;ch=true;}
    if(ch){const ov=document.getElementById('seqTrackerOverlay');if(ov)ov.classList.remove('on');
      try{if(document.body.classList.contains('store-open')||document.body.classList.contains('desktop-mode'))renderStore();}catch(e){}}
  }
  setInterval(freeSeqDots,250);
  // v0.2.202: with 5+ pads the grid is wide and short, so on computers the column stacks from the top instead of spreading out
  // v0.2.203: EDIT PADS only appears once you have a 3rd pad (body.edit-pads-off before that)
  setInterval(()=>{if(typeof drum==='undefined')return;const B=document.body.classList;B.toggle('pads-wide',drum.pads>=5);
    const off=drum.pads<3;if(off!==B.contains('edit-pads-off')){B.toggle('edit-pads-off',off);if(off&&typeof padEditMode!=='undefined'&&padEditMode&&typeof togglePadEditMode==='function')togglePadEditMode();
      try{window.dispatchEvent(new Event('resize'));}catch(e){}}},400);
  const tc=document.getElementById('manualTiersCol');if(tc&&tc.parentElement)tc.parentElement.classList.add('trk-wrap');
  const css=document.createElement('style');css.textContent=`
.trk-wrap{margin-top:10px;}
body.desktop-mode .trk-wrap{margin-top:16px;}
body.phone-land .trk-wrap{margin-top:4px;}
/* v0.2.204: the DRUMPAD / SEQUENCER dot trackers sit in towards the score instead of out at the edges */
body.seq-on.desktop-mode:not(.narrow-center) #scoreRow .score-section{flex:0 1 560px !important;}
body.edit-pads-off #padEditToggleBtn{display:none !important;}
body.desktop-mode.pads-wide:not(.daw-wide) #gameView .app{justify-content:flex-start;gap:clamp(14px,3.2vh,34px);}
/* the wide DAW row keeps pads in one line, in order (js/05 places 5–8 around the 2×2 everywhere else) */
body.daw-wide .pad-grid>*{grid-row:auto !important;grid-column:auto !important;}
body:not(.daw-wide) .pad-grid>*{order:0 !important;}
/* the sequencer dots never need their own unlock now */
#seqTrackerOverlay{display:none !important;}`;
  document.head.appendChild(css);
})();
