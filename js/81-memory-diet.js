// ══════════════════════════════════════════════
//  MEMORY DIET (v0.2.190)
//  iPhone Safari quietly reloads the page (back to the file select) when a tab uses too much memory. The 3D skill tree
//  was the worst offender: every bubble stands up in 3D, and Safari gives each one its own picture in memory at full
//  screen sharpness (about 1 MB each on a 3× iPhone), so a big tree could need hundreds of MB.
//   • In 3D, bubbles and labels far from the camera are hidden (display:none: no picture at all). On phones at most the
//     70 nearest are drawn, so zooming all the way out stays light; far ones fade into the haze anyway.
//   • While the tree is open, the floating buddies and their trails underneath stop drawing (body class tree-open).
//   • Also: the intro's full-screen canvas and the trail canvas give their memory back when idle (js/65, js/76), and the
//     star layers are smaller (css .st-sky i).
// ══════════════════════════════════════════════
(function(){
  const modal=document.getElementById('skillTreeModal'),cv=document.getElementById('skillTreeCanvas');if(!modal||!cv)return;
  const CAP=(typeof IS_MOBILE_DEVICE!=='undefined'&&IS_MOBILE_DEVICE)?48:400;   // v0.2.236: 70 was still enough to reload Safari on a phone
  let pending=0,last=0;
  function cull(){
    pending=0;last=performance.now();
    const open=modal.classList.contains('open'),in3d=modal.classList.contains('st-3d');
    const els=modal.querySelectorAll('.st-node,.st-branch-label');
    if(!open||!in3d||typeof stAnchor!=='function'){els.forEach(e=>{if(e._cull){e._cull=false;e.classList.remove('st-cull');}});return;}
    const W=cv.clientWidth,H=cv.clientHeight,s=stScale||1,a=stAnchor(cv),tx=(a.x-stPanX)/s,ty=(a.y-stPanY)/s;
    const R=Math.max(W,H)*1.3/s+140,list=[];   // map units: the window is about W/s by H/s; the tilted far side reaches further
    els.forEach(e=>{if(e._mx==null){if(!e.offsetWidth)return;e._mx=e.offsetLeft+e.offsetWidth/2;e._my=e.offsetTop+e.offsetHeight/2;}list.push([Math.hypot(e._mx-tx,e._my-ty),e]);});
    list.sort((p,q)=>p[0]-q[0]);
    list.forEach(([d,e],i)=>{const hide=d>R||i>=CAP;if(hide!==!!e._cull){e._cull=hide;e.classList.toggle('st-cull',hide);}});
  }
  window.stCull=cull;
  // run after every camera move, at most ~8 times a second, and once more when it settles
  if(typeof window.stApply3D==='function'){const base=window.stApply3D;window.stApply3D=function(){const r=base.apply(this,arguments);
    const now=performance.now();if(now-last>120){cull();}else if(!pending)pending=setTimeout(cull,130);return r;};}
  // re-renders replace the elements: cull the new ones too
  if(typeof window.renderSkillTree==='function'){const rs=window.renderSkillTree;window.renderSkillTree=function(){const r=rs.apply(this,arguments);try{cull();}catch(e){}return r;};}
  // tree open / switched to 3D → the buddies underneath stop drawing and the far bubbles hide BEFORE the next paint
  // (v0.2.236: culling used to wait up to 120 ms, which was enough for Safari to run out of memory on a phone)
  new MutationObserver(()=>{const o=modal.classList.contains('open');document.body.classList.toggle('tree-open',o);if(o){cull();setTimeout(cull,150);}}).observe(modal,{attributes:true,attributeFilter:['class']});
})();
