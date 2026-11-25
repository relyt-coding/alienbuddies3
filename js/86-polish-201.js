// ══════════════════════════════════════════════
//  SMALL v0.2.201 TOUCHES
//  · The sequencer's dots come free with the sequencer: as soon as you own a sequencer track, its dot tracker is active
//    (no 1 mJ ACTIVATE, js/72) and the Shop's sequencer-dots card is unlocked (no DOT_UNLOCK_COST, js/16).
//  · The drum tracker row (dots + "1 mJ — ACTIVATE") gets a little room under the score (`.trk-wrap`).
// ══════════════════════════════════════════════
(function(){
  function freeSeqDots(){
    if(typeof drum==='undefined'||!(drum.seqTracks>=1))return;
    let ch=false;
    if(typeof seqTrackerActive!=='undefined'&&!seqTrackerActive){seqTrackerActive=true;ch=true;}
    if(typeof shop!=='undefined'&&!shop.seqDotsUnlocked){shop.seqDotsUnlocked=true;ch=true;}
    if(ch){const ov=document.getElementById('seqTrackerOverlay');if(ov)ov.classList.remove('on');
      try{if(document.body.classList.contains('store-open')||document.body.classList.contains('desktop-mode'))renderStore();}catch(e){}}
  }
  setInterval(freeSeqDots,250);
  const tc=document.getElementById('manualTiersCol');if(tc&&tc.parentElement)tc.parentElement.classList.add('trk-wrap');
  const css=document.createElement('style');css.textContent=`
.trk-wrap{margin-top:10px;}
body.desktop-mode .trk-wrap{margin-top:16px;}
body.phone-land .trk-wrap{margin-top:4px;}
/* the sequencer dots never need their own unlock now */
#seqTrackerOverlay{display:none !important;}`;
  document.head.appendChild(css);
})();
