
// ══════════════════════════════════════════════
//  SEQUENCER
// ══════════════════════════════════════════════
let STEPS=16;            // steps in the current loop (16 / 32 / 64 — unlocked in the skill tree)
const MAX_STEPS=64;      // every layer always stores 64 slots so nothing is lost when switching back to a shorter loop
function padSteps(a,fill){const o=a?Array.prototype.slice.call(a):[];while(o.length<MAX_STEPS)o.push(fill);return o;}
function patLen(p){return p?(p.stepCount||16):16;}
let seqLayers=[]; // [{soundId, steps:[bool×16], muted, stepEls[], fullStepEls[]}]
let seqPlaying=false,seqStep=0,seqBpm=100; // base BPM is 100: scoring is normalized around it
let seqHasAutoMutedAmbience=false;
// The sequencer and the trackers are shown together; each has a hide/show button (remembered per browser)
let seqHidden=false,trackersHidden=false;
try{seqHidden=localStorage.getItem('ab2_hideSeq')==='1';trackersHidden=localStorage.getItem('ab2_hideTrackers')==='1';}catch(e){}
const seqPhBar=document.getElementById('seqPhBar');
const seqLayersContainer=document.getElementById('seqLayersContainer');
const seqAddBtn=document.getElementById('seqAddBtn');
const seqArea=document.getElementById('seqArea');
const tiersWrap=document.getElementById('tiersWrap');
const seqExpandBtn=document.getElementById('seqExpandBtn');
const seqFullModal=document.getElementById('seqFullModal');
const seqFullPhBar=document.getElementById('seqFullPhBar');
const seqFullLayers=document.getElementById('seqFullLayers');
const seqFullAddBtn=document.getElementById('seqFullAddBtn');
const seqFullCloseBtn=document.getElementById('seqFullCloseBtn');

// Build playhead cells — each bar uses 3-col grid matching layer rows
// so cells must go in a wrapper div in the middle column
const seqPhEls=[];
const seqFullPhEls=[];
// Small bar: [spacer] [cells-wrap] [spacer]
const _phSp1=document.createElement('div');seqPhBar.appendChild(_phSp1);
const _phWrap=document.createElement('div');_phWrap.className='seq-ph-cells';seqPhBar.appendChild(_phWrap);
const _phSp2=document.createElement('div');seqPhBar.appendChild(_phSp2);
// Full bar: [spacer] [cells-wrap] [spacer]
const _phFSp1=document.createElement('div');seqFullPhBar.appendChild(_phFSp1);
const _phFWrap=document.createElement('div');_phFWrap.className='seq-ph-cells';seqFullPhBar.appendChild(_phFWrap);
const _phFSp2=document.createElement('div');seqFullPhBar.appendChild(_phFSp2);
for(let i=0;i<MAX_STEPS;i++){
  const c=document.createElement('div');c.className='seq-ph-cell';_phWrap.appendChild(c);seqPhEls.push(c);
  const cf=document.createElement('div');cf.className='seq-ph-cell';_phFWrap.appendChild(cf);seqFullPhEls.push(cf);
}

const viewToggleBar=document.getElementById('viewToggleBar');
const vtbViewBtn=document.getElementById('vtbViewBtn');
const vtbKeyBtn=document.getElementById('vtbKeyBtn'),vtbFxBtn=document.getElementById('vtbFxBtn');
const viewMenu=document.getElementById('viewMenu');
let padsHidden=false;
try{padsHidden=localStorage.getItem('ab2_hidePads')==='1';}catch(e){}

// One VIEW button (left end of the row under the sequencer, or in the standalone bar when the
// sequencer is hidden / on views without such a row). It opens a small menu to show/hide
// the trackers, the sequencer and the drum pads.
function placeViewButtons(){
  const rowSel={pattern:'#seqPatternView',arrange:'#seqArrangeView',song:'#seqSongView'}[seqMode]||'#seqPatternView';
  const targetRow=document.querySelector(rowSel+' .seq-bottom-row');
  const inRow=targetRow&&drum.seqTracks&&!seqHidden;
  if(inRow){
    targetRow.insertBefore(vtbViewBtn,targetRow.firstChild);
    vtbViewBtn.className='seq-save-pat-btn';
    if(vtbKeyBtn){targetRow.insertBefore(vtbKeyBtn,vtbViewBtn.nextSibling);vtbKeyBtn.className='seq-save-pat-btn';}
    if(vtbFxBtn&&vtbKeyBtn){targetRow.insertBefore(vtbFxBtn,vtbKeyBtn.nextSibling);vtbFxBtn.className='seq-save-pat-btn';}
    viewToggleBar.style.display='none';
  }else{
    viewToggleBar.appendChild(vtbViewBtn);
    vtbViewBtn.className='vtb-btn';
    if(vtbKeyBtn){viewToggleBar.appendChild(vtbKeyBtn);vtbKeyBtn.className='vtb-btn';}
    if(vtbFxBtn){viewToggleBar.appendChild(vtbFxBtn);vtbFxBtn.className='vtb-btn';}
    viewToggleBar.style.display=drum.seqTracks?'':'none';
  }
  closeViewMenu();closeStepsMenu&&closeStepsMenu();window.closeMoreMenu&&window.closeMoreMenu();
}
// ── Step counts (small numbers inside each step; off by default) ──
let stepCountsOn=false,stepCountsMode='beats';
try{stepCountsOn=localStorage.getItem('ab2_stepCounts')==='1';const m=localStorage.getItem('ab2_stepCountsMode');if(m==='beats'||m==='ends'||m==='all')stepCountsMode=m;}catch(e){}
function applyStepCounts(){
  const cl=document.body.classList;
  cl.toggle('sc-beats',stepCountsOn&&stepCountsMode==='beats');
  cl.toggle('sc-ends',stepCountsOn&&stepCountsMode==='ends');
  cl.toggle('sc-all',stepCountsOn&&stepCountsMode==='all');
  try{localStorage.setItem('ab2_stepCounts',stepCountsOn?'1':'0');localStorage.setItem('ab2_stepCountsMode',stepCountsMode);}catch(e){}
}
applyStepCounts();
function refreshViewMenu(){
  if(viewMenu)viewMenu.querySelectorAll('[data-sc]').forEach(function(r){
    const k=r.getAttribute('data-sc');
    const on=k==='toggle'?stepCountsOn:(stepCountsOn&&stepCountsMode===k);
    r.classList.toggle('on',on);r.firstChild.textContent=on?(k==='toggle'?'✓':'●'):'';
    if(k!=='toggle')r.classList.toggle('dim',!stepCountsOn);
  });
  [['tiers',!trackersHidden],['seq',!seqHidden],['pads',!padsHidden]].forEach(function(p){
    const r=viewMenu.querySelector('[data-vm="'+p[0]+'"]');
    if(r){r.classList.toggle('on',p[1]);r.firstChild.textContent=p[1]?'✓':'';}
  });
}
function closeViewMenu(){if(viewMenu)viewMenu.style.display='none';}
function openViewMenu(){
  refreshViewMenu();
  viewMenu.style.display='flex';
  const r=vtbViewBtn.getBoundingClientRect();
  viewMenu.style.left=Math.max(8,Math.min(r.left,window.innerWidth-viewMenu.offsetWidth-8))+'px';
  const top=r.top-viewMenu.offsetHeight-6;
  viewMenu.style.top=(top>8?top:r.bottom+6)+'px';
}
// ── STEPS button + menu (appears once 32 steps are bought) ──
const seqStepsBtn=document.getElementById('seqStepsBtn');
const stepsMenu=document.getElementById('stepsMenu');
function closeStepsMenu(){if(stepsMenu)stepsMenu.style.display='none';}
function updateStepsBtn(){
  if(!seqStepsBtn)return;
  const on=(shop.seqStepsLevel||0)>=1&&drum.seqTracks>=1;
  seqStepsBtn.style.display=on?'':'none';
  seqStepsBtn.textContent=STEPS+' STEPS';
  const sv=document.getElementById('seqSavePatBtn');
  seqStepsBtn.style.marginLeft=on?'auto':'';
  if(sv)sv.style.marginLeft=on?'0':'';
}
// FOLLOW PLAYHEAD: while playing a loop longer than the screen, the view pages along with the playhead
let seqFollow=false;try{seqFollow=localStorage.getItem('ab2_seqFollow')==='1';}catch(e){} // off by default; only on if the player turned it on
let _followPage=-1;
function followPlayhead(st){
  const sc=document.getElementById('seqHScroll');
  if(!sc||sc.scrollWidth<=sc.clientWidth+2){_followPage=-1;return;}
  const page=Math.floor(st/16);
  if(page===_followPage)return;_followPage=page;
  const cell=seqPhEls[page*16];if(!cell)return;
  const left=Math.max(0,sc.scrollLeft+cell.getBoundingClientRect().left-(sc.getBoundingClientRect().left+68));
  if('scrollBehavior' in document.documentElement.style){try{sc.scrollTo({left:left,behavior:'smooth'});return;}catch(e){}}
  sc.scrollLeft=left;
}
function openStepsMenu(){
  [16,32,64].forEach(n=>{
    const r=stepsMenu.querySelector('[data-steps="'+n+'"]');if(!r)return;
    const ok=n===16||(shop.seqStepsLevel||0)>=(n===32?1:2);
    r.classList.toggle('on',n===STEPS);r.classList.toggle('locked',!ok);
    r.firstChild.textContent=n===STEPS?'✓':(ok?'':'🔒');
  });
  const fr=stepsMenu.querySelector('[data-follow]');if(fr){fr.classList.toggle('on',seqFollow);fr.firstChild.textContent=seqFollow?'✓':'';}
  stepsMenu.style.display='flex';
  const r=seqStepsBtn.getBoundingClientRect();
  stepsMenu.style.left=Math.max(8,Math.min(r.left,window.innerWidth-stepsMenu.offsetWidth-8))+'px';
  const top=r.top-stepsMenu.offsetHeight-6;
  stepsMenu.style.top=(top>8?top:r.bottom+6)+'px';
}
seqStepsBtn&&seqStepsBtn.addEventListener('click',e=>{e.stopPropagation();closeViewMenu();stepsMenu.style.display==='flex'?closeStepsMenu():openStepsMenu();});
stepsMenu&&stepsMenu.addEventListener('click',e=>{
  e.stopPropagation();
  const fr=e.target.closest('[data-follow]');
  if(fr){seqFollow=!seqFollow;_followPage=-1;try{localStorage.setItem('ab2_seqFollow',seqFollow?'1':'0');}catch(e2){}
    fr.classList.toggle('on',seqFollow);fr.firstChild.textContent=seqFollow?'✓':'';return;}
  const r=e.target.closest('[data-steps]');if(!r)return;
  const n=parseInt(r.getAttribute('data-steps'));
  if(n!==16&&(shop.seqStepsLevel||0)<(n===32?1:2)){showToast('🔒 Unlock '+n+' Steps in the Galaxy (Musical Toolkit)');return;}
  STEPS=n;applyStepCount();closeStepsMenu();autoSave();
});
document.addEventListener('click',()=>closeStepsMenu());
function applySeqView(){
  document.body.classList.toggle('pads-hidden',padsHidden);
  if(!drum.seqTracks){
    tiersWrap.style.display='';
    seqArea.classList.remove('visible');
    viewToggleBar.style.display='none';
    return;
  }
  seqArea.classList.toggle('visible',!seqHidden);
  tiersWrap.style.display=trackersHidden?'none':'';
  placeViewButtons();
}

function _saveViewPrefs(){try{localStorage.setItem('ab2_hideSeq',seqHidden?'1':'0');localStorage.setItem('ab2_hideTrackers',trackersHidden?'1':'0');localStorage.setItem('ab2_hidePads',padsHidden?'1':'0');}catch(e){}}
vtbViewBtn&&vtbViewBtn.addEventListener('click',(e)=>{e.stopPropagation();viewMenu.style.display==='flex'?closeViewMenu():openViewMenu();});
viewMenu&&viewMenu.addEventListener('click',(e)=>{
  e.stopPropagation();
  const sc=e.target.closest('[data-sc]');
  if(sc){
    const k=sc.getAttribute('data-sc');
    if(k==='toggle')stepCountsOn=!stepCountsOn;else{stepCountsMode=k;stepCountsOn=true;}
    applyStepCounts();refreshViewMenu();return;
  }
  const r=e.target.closest('[data-vm]');if(!r)return;
  const k=r.getAttribute('data-vm');
  if(k==='tiers')trackersHidden=!trackersHidden;
  else if(k==='seq')seqHidden=!seqHidden;
  else padsHidden=!padsHidden;
  _saveViewPrefs();applySeqView();refreshViewMenu();
  if(viewMenu.style.display==='flex')openViewMenu(); // re-anchor: the button may have moved
  setTimeout(clampBouncersToBounds,50);
});
document.addEventListener('click',()=>closeViewMenu());
// Edit Pads needs the pads on screen
(function(){const eb=document.getElementById('padEditToggleBtn');
  eb&&eb.addEventListener('click',()=>{if(padsHidden){padsHidden=false;_saveViewPrefs();applySeqView();}},true);})();

// Fullscreen modal
seqExpandBtn&&seqExpandBtn.addEventListener('click',()=>openSeqFull());
seqFullCloseBtn&&seqFullCloseBtn.addEventListener('click',()=>closeSeqFull());

function openSeqFull(){
  // Hide sidebar collapse tabs in full sequencer mode
  document.getElementById('collapseBunkerBtn')&&(document.getElementById('collapseBunkerBtn').style.display='none');
  document.getElementById('collapseShopBtn')&&(document.getElementById('collapseShopBtn').style.display='none');
  if(!hasSeenSeqHint&&!document.body.classList.contains('desktop-mode')){
    hasSeenSeqHint=true;
    showHint('🎛','PINCH TO ZOOM IN FOR EASIER READING.\n\n&nbsp;&nbsp;&nbsp;ZOOM OUT BEFORE CLOSING.',null);
  }
  // Rebuild full layer rows mirroring current seqLayers state
  seqFullLayers.innerHTML='';
  seqFullLayers.appendChild(seqFullPhBar); // lives inside the scroller so long loops scroll together with the rows
  seqLayers.forEach(layer=>addFullLayerRow(layer));
  updateSeqFullAddBtn();
  seqFullModal.classList.add('open');
}
function closeSeqFull(){
  const inner=document.getElementById('seqFullInner');
  // Animate zoom-out first
  if(inner){
    inner.style.transform='scale(0.82)';
    inner.style.opacity='0';
  }
  setTimeout(()=>{
    seqFullModal.classList.remove('open');
    setLevelAdjMode(false);
    // Restore sidebar collapse tabs
    if(document.body.classList.contains('desktop-mode')&&document.body.classList.contains('game-active')){
      document.getElementById('collapseBunkerBtn')&&(document.getElementById('collapseBunkerBtn').style.display='');
      document.getElementById('collapseShopBtn')&&(document.getElementById('collapseShopBtn').style.display='');
    }
    // Reset inner for next open
    if(inner){inner.style.transform='';inner.style.opacity='';}
    // Force iOS viewport back to 1:1
    const vp=document.querySelector('meta[name=viewport]');
    if(vp){
      vp.content='width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no';
      requestAnimationFrame(()=>{
        window.scrollTo(0,0);
        requestAnimationFrame(()=>{vp.content='width=device-width, initial-scale=1.0, user-scalable=no';});
      });
    }
  },260);
}

function addFullLayerRow(layer){
  const snd=SOUND_MAP[layer.soundId]||ALL_SOUNDS[0];
  const row=document.createElement('div');row.className='seq-layer-row';
  // Pill
  const pill=document.createElement('div');pill.className='seq-snd-pill';pill.style.setProperty('--lc',snd.color);
  const dot=document.createElement('div');dot.className='seq-pill-dot';dot.style.background=snd.color;
  const nm=document.createElement('div');nm.className='seq-pill-name';nm.style.color=snd.color;nm.textContent=snd.name;
  pill.appendChild(dot);pill.appendChild(nm);
  pill.addEventListener('pointerdown',e=>{e.stopPropagation();openMiniPickerInFull(layer,dot,nm);});
  // Steps — share same layer.steps array
  const stepsEl=document.createElement('div');stepsEl.className='seq-steps';
  layer.fullStepEls=[];
  for(let i=0;i<MAX_STEPS;i++){
    const btn=document.createElement('div');btn.className='seq-step'+(layer.steps[i]?' on':'');
    btn.style.setProperty('--lc',snd.color);
    if(layer.steps[i])btn.style.opacity=String(0.3+0.7*(layer.vols[i]/100));
    const si=i;
    bindStepTap(btn,e=>{
      if(levelAdjMode&&layer.steps[si]){e.stopPropagation();openVelPopover(layer,si,btn);return;}
      layer.steps[si]=!layer.steps[si];
      if(!layer.steps[si])layer.vols[si]=100;
      btn.classList.toggle('on',layer.steps[si]);
      btn.style.opacity=layer.steps[si]?String(0.3+0.7*(layer.vols[si]/100)):'';
      // Sync small grid
      if(layer.stepEls[si]){layer.stepEls[si].classList.toggle('on',layer.steps[si]);layer.stepEls[si].style.opacity=layer.steps[si]?String(0.3+0.7*(layer.vols[si]/100)):'';}
      if(layer.steps[si]&&layerAudible(layer)){getCtx();playSound(layer.soundId,undefined,undefined,seqLayers.indexOf(layer));}
    });
    stepsEl.appendChild(btn);layer.fullStepEls.push(btn);
  }
  // Controls
  const ctrl=document.createElement('div');ctrl.className='seq-row-ctrl';
  const muteBtn=document.createElement('div');muteBtn.className='seq-rc-btn'+(layer.muted?' muted':'');muteBtn.textContent='M';
  const soloBtn=makeSoloBtn(layer);
  muteBtn.addEventListener('pointerdown',e=>{e.stopPropagation();layer.muted=!layer.muted;muteBtn.classList.toggle('muted',layer.muted);// sync small
    layer.el&&layer.el.querySelector('.seq-rc-btn')&&(layer.el.querySelector('.seq-rc-btn').classList.toggle('muted',layer.muted));});
  ctrl.appendChild(muteBtn);ctrl.appendChild(soloBtn); // S = solo (tracks can no longer be deleted)
  row.appendChild(pill);row.appendChild(stepsEl);row.appendChild(ctrl);
  seqFullLayers.appendChild(row);
  applyStepCount();
}

function updateSeqFullAddBtn(){
  const canAdd=seqLayers.length<drum.seqTracks;
  seqFullAddBtn.disabled=!canAdd;
  seqFullAddBtn.textContent=canAdd?`+ ADD TRACK (${seqLayers.length}/${drum.seqTracks})`:`MAX ${drum.seqTracks} TRACKS`;
}
seqFullAddBtn&&seqFullAddBtn.addEventListener('click',()=>{
  getCtx();addSeqLayer();
  // Add a row in the full modal too
  if(seqLayers.length>0)addFullLayerRow(seqLayers[seqLayers.length-1]);
  updateSeqFullAddBtn();
});

// Mini picker in full modal context
let mpFullLayer=null,mpFullDot=null,mpFullName=null;
function openMiniPickerInFull(layer,dot,name){
  mpFullLayer=layer;mpFullDot=dot;mpFullName=name;mpTarget=null;
  const rect=dot.getBoundingClientRect();
  miniPicker.style.top=(rect.bottom+6)+'px';
  miniPicker.style.left=Math.min(rect.left,window.innerWidth-210)+'px';
  buildMpListFull();miniPicker.classList.add('open');
}
function buildMpListFull(){
  mpListEl.innerHTML='';
  const avail=unlockedSounds().map(id=>SOUND_MAP[id]).filter(Boolean);
  const shown=mpFilter==='all'?avail:avail.filter(s=>s.tag===mpFilter);
  shown.forEach(snd=>{
    const item=document.createElement('div');item.className='mp-item'+(mpFullLayer&&mpFullLayer.soundId===snd.id?' active':'');
    const dot2=document.createElement('div');dot2.className='mp-dot';dot2.style.background=snd.color;
    const nm2=document.createElement('div');nm2.className='mp-name';nm2.style.color=snd.color;nm2.textContent=snd.name;
    const hear=document.createElement('div');hear.className='mp-hear';hear.textContent='▶';
    hear.addEventListener('pointerdown',e=>{e.stopPropagation();getCtx();playSound(snd.id);});
    item.appendChild(dot2);item.appendChild(nm2);item.appendChild(hear);
    item.addEventListener('pointerdown',e=>{
      if(e.target===hear)return;
      getCtx();playSound(snd.id);
      if(mpFullLayer){
        mpFullLayer.soundId=snd.id;
        mpFullDot.style.background=snd.color;mpFullName.style.color=snd.color;mpFullName.textContent=snd.name;
        mpFullLayer.fullStepEls&&mpFullLayer.fullStepEls.forEach(s=>s.style.setProperty('--lc',snd.color));
        mpFullLayer.stepEls&&mpFullLayer.stepEls.forEach(s=>s.style.setProperty('--lc',snd.color));
        mpFullDot.parentElement&&mpFullDot.parentElement.style.setProperty("--lc",snd.color);
        mpFullLayer=null;
      }
      closeMiniPicker();
    });
    mpListEl.appendChild(item);
  });
}

function rebuildSeqUI(){
  seqLayersContainer.innerHTML='';seqLayers=[];
  const hasSeq=drum.seqTracks>0;
  applySeqView();
  seqAddBtn.disabled=true;
  if(!hasSeq)return;
  const defaults=['hihat','snare','kick','clap','sub','chord'];
  ensureAllTracks();
  updateSeqAddBtn();
}
// Every unlocked track is always present (tracks can't be added or deleted by hand any more)
// SOLO: when any track is soloed only soloed tracks (that aren't muted) are heard
function layerAudible(l){
  if(l.muted)return false;
  return !seqLayers.some(x=>x.solo)||!!l.solo;
}
function refreshSoloBtns(){
  const any=seqLayers.some(x=>x.solo);
  seqLayers.forEach(l=>(l.soloEls||[]).forEach(b=>{b.classList.toggle('solo-on',!!l.solo);b.classList.toggle('solo-dim',any&&!l.solo);}));
}
function makeSoloBtn(layer){
  const b=document.createElement('div');b.className='seq-rc-btn seq-solo-btn';b.title='Solo';b.textContent='S';
  (layer.soloEls=layer.soloEls||[]).push(b);
  b.addEventListener('pointerdown',e=>{e.stopPropagation();layer.solo=!layer.solo;refreshSoloBtns();});
  return b;
}
// Touch: a step toggles on a clean TAP (so dragging to scroll the loop never flips steps); mouse/pen: instantly
function bindStepTap(btn,fn){
  let sx=0,sy=0,t0=0,down=false;
  btn.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'){down=true;sx=e.clientX;sy=e.clientY;t0=Date.now();return;}
    e.preventDefault();fn(e);
  });
  btn.addEventListener('pointerup',e=>{
    if(e.pointerType!=='touch'||!down)return;down=false;
    if(Math.abs(e.clientX-sx)<10&&Math.abs(e.clientY-sy)<10&&Date.now()-t0<600)fn(e);
  });
  btn.addEventListener('pointercancel',()=>{down=false;});
}
// Show only the first STEPS cells of every row / playhead; the grids size themselves from --n
function applyStepCount(){
  document.documentElement.style.setProperty('--n',STEPS);
  document.body.classList.toggle('seq-wide',STEPS>16);
  const vis=(arr)=>arr&&arr.forEach((el,i)=>{const d=i<STEPS?'':'none';if(el.style.display!==d)el.style.display=d;});
  vis(seqPhEls);vis(seqFullPhEls);
  seqLayers.forEach(l=>{vis(l.stepEls);vis(l.fullStepEls);});
  if(seqStep>=STEPS)seqStep=0;
  if(typeof updateStepsBtn==='function')updateStepsBtn();
}
function ensureAllTracks(){
  if(!drum.seqTracks)return;
  const defaults=['hihat','snare','kick','clap','sub','chord'];
  while(seqLayers.length<drum.seqTracks){
    const before=seqLayers.length;
    addSeqLayer(defaults[seqLayers.length]||unlockedSounds()[0]);
    if(seqLayers.length===before)break;
  }
  updateSeqAddBtn();
}

function addSeqLayer(soundId,stepsInit){
  if(seqLayers.length>=drum.seqTracks)return;
  soundId=soundId||unlockedSounds()[0];
  const snd=SOUND_MAP[soundId]||ALL_SOUNDS[0];
  const volsInit=arguments[2];
  const layer={soundId:snd.id,steps:padSteps(stepsInit,false),vols:padSteps(volsInit,100),muted:false,stepEls:[],fullStepEls:[]};
  const row=document.createElement('div');row.className='seq-layer-row';
  // Sound pill
  const pill=document.createElement('div');pill.className='seq-snd-pill';pill.style.setProperty('--lc',snd.color);
  const dot=document.createElement('div');dot.className='seq-pill-dot';dot.style.background=snd.color;
  const nm=document.createElement('div');nm.className='seq-pill-name';nm.style.color=snd.color;nm.textContent=snd.name;
  pill.appendChild(dot);pill.appendChild(nm);
  pill.addEventListener('pointerdown',e=>{e.stopPropagation();openMiniPicker(layer,dot,nm);});
  // Steps
  const stepsEl=document.createElement('div');stepsEl.className='seq-steps';
  for(let i=0;i<MAX_STEPS;i++){
    const btn=document.createElement('div');btn.className='seq-step'+(layer.steps[i]?' on':'');
    btn.style.setProperty('--lc',snd.color);
    if(layer.steps[i])btn.style.opacity=String(0.3+0.7*(layer.vols[i]/100));
    const si=i;
    bindStepTap(btn,e=>{
      if(levelAdjMode&&layer.steps[si]){e.stopPropagation();openVelPopover(layer,si,btn);return;}
      layer.steps[si]=!layer.steps[si];
      if(!layer.steps[si])layer.vols[si]=100;
      btn.classList.toggle('on',layer.steps[si]);
      btn.style.opacity=layer.steps[si]?String(0.3+0.7*(layer.vols[si]/100)):'';
      if(layer.fullStepEls[si]){layer.fullStepEls[si].classList.toggle('on',layer.steps[si]);layer.fullStepEls[si].style.opacity=layer.steps[si]?String(0.3+0.7*(layer.vols[si]/100)):'';}
      if(layer.steps[si]&&layerAudible(layer)){getCtx();playSound(layer.soundId,undefined,undefined,seqLayers.indexOf(layer));}
    });
    stepsEl.appendChild(btn);layer.stepEls.push(btn);
  }
  // Controls
  const ctrl=document.createElement('div');ctrl.className='seq-row-ctrl';
  const muteBtn=document.createElement('div');muteBtn.className='seq-rc-btn';muteBtn.title='Mute';muteBtn.textContent='M';
  const soloBtn=makeSoloBtn(layer);
  muteBtn.addEventListener('pointerdown',e=>{e.stopPropagation();layer.muted=!layer.muted;muteBtn.classList.toggle('muted',layer.muted);});
  ctrl.appendChild(muteBtn);ctrl.appendChild(soloBtn); // S = solo (tracks can no longer be deleted)
  row.appendChild(pill);row.appendChild(stepsEl);row.appendChild(ctrl);
  layer.el=row;
  seqLayersContainer.appendChild(row);
  seqLayers.push(layer);
  applyStepCount();
  updateSeqAddBtn();
}

function removeSeqLayer(layer){
  const idx=seqLayers.indexOf(layer);if(idx<0)return;
  seqLayers.splice(idx,1);layer.el&&layer.el.remove();updateSeqAddBtn();updateSeqFullAddBtn();
}

function updateSeqAddBtn(){
  const canAdd=seqLayers.length<drum.seqTracks;
  seqAddBtn.disabled=!canAdd;
  seqAddBtn.textContent=canAdd?`+ ADD TRACK (${seqLayers.length}/${drum.seqTracks})`:`MAX ${drum.seqTracks} TRACKS`;
}

// ── Pattern / Arrange state ──
let seqMode='pattern';
let savedPatterns=[];
let savedArrangements=[]; // [{name,color,bars,arrangement:[]}]
let songSlots=[]; // [{arrIdx}] up to 16
let arrangeBars=4;
const BARS_OPTS=[4,8,12,16];
let arrangement=[];
let arrBar=0,arrBarStep=0;
let songSlotIdx=0,songArrBar=0,songArrBarStep=0; // song playback cursors

const seqPlayPauseBtn=document.getElementById('seqPlayPauseBtn');
const seqModePatternBtn=document.getElementById('seqModePatternBtn');
const seqModeArrangeBtn=document.getElementById('seqModeArrangeBtn');
const seqPatternView=document.getElementById('seqPatternView');
const seqArrangeView=document.getElementById('seqArrangeView');
const seqArrGrid=document.getElementById('seqArrGrid');
const seqArrPhRow=document.getElementById('seqArrPhRow');
const seqPatLibrary=document.getElementById('seqPatLibrary');

const seqModeSongBtn=document.getElementById('seqModeSongBtn');
const seqSongView=document.getElementById('seqSongView');
function setSeqMode(mode){
  seqMode=mode;
  seqModePatternBtn&&seqModePatternBtn.classList.toggle('active',mode==='pattern');
  seqModeArrangeBtn&&seqModeArrangeBtn.classList.toggle('active',mode==='arrange');
  seqModeSongBtn&&seqModeSongBtn.classList.toggle('active',mode==='song');
  if(seqPatternView)seqPatternView.style.display=mode==='pattern'?'':'none';
  if(seqArrangeView)seqArrangeView.style.display=mode==='arrange'?'':'none';
  document.body.classList.toggle('arr-mode',mode==='arrange');
  if(seqSongView)seqSongView.style.display=mode==='song'?'':'none';
  if(typeof placeViewButtons==='function')placeViewButtons();
  if(seqPlaying){stopSeq();startSeq();}
}
seqModePatternBtn&&seqModePatternBtn.addEventListener('click',()=>setSeqMode('pattern'));
seqModeArrangeBtn&&seqModeArrangeBtn.addEventListener('click',()=>setSeqMode('arrange'));
seqModeSongBtn&&seqModeSongBtn.addEventListener('click',()=>{setSeqMode('song');buildSongSlots();});
seqPlayPauseBtn&&seqPlayPauseBtn.addEventListener('click',()=>{if(seqPlaying)stopSeq();else{getCtx();startSeq();}});

// BPM
function updateBpmDisplay(){
  const d=document.getElementById('seqBpmDisplay');
  if(d)d.textContent=seqBpm;
  const l=document.getElementById('seqAreaLabel');
  if(l)l.textContent=`pattern · ${seqBpm} bpm`;
}
function changeBpm(delta){
  seqBpm=Math.min(250,Math.max(50,seqBpm+delta));
  updateBpmDisplay();
  if(seqPlaying){stopSeq();startSeq();}
}
document.getElementById('seqBpmDown')&&document.getElementById('seqBpmDown').addEventListener('click',()=>changeBpm(-5));
document.getElementById('seqBpmUp')&&document.getElementById('seqBpmUp').addEventListener('click',()=>changeBpm(5));

// Double-click or long-press BPM display to manually enter a value
(function(){
  const bpmEl=document.getElementById('seqBpmDisplay');
  if(!bpmEl)return;
  bpmEl.style.cursor='pointer';
  bpmEl.title='Double-click to enter BPM';

  function openBpmInput(){
    if(bpmEl.querySelector('input'))return; // already open
    const input=document.createElement('input');
    input.type='number';input.min=50;input.max=250;input.value=seqBpm;
    input.style.cssText="width:48px;font-family:'Bebas Neue',sans-serif;font-size:.72rem;letter-spacing:.08em;background:#0a0a1a;border:1px solid #a0a8ff;border-radius:4px;color:#a0a8ff;text-align:center;padding:1px 2px;outline:none;-moz-appearance:textfield;";
    input.addEventListener('click',e=>e.stopPropagation());
    input.addEventListener('pointerdown',e=>e.stopPropagation());
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){e.preventDefault();commitBpm();}
      if(e.key==='Escape'){cancelBpm();}
      e.stopPropagation();
    });
    input.addEventListener('blur',commitBpm);
    function commitBpm(){
      const val=parseInt(input.value)||seqBpm;
      const clamped=Math.min(250,Math.max(50,val));
      seqBpm=clamped;
      updateBpmDisplay();
      if(seqPlaying){stopSeq();startSeq();}
      restoreDisplay();
    }
    function cancelBpm(){restoreDisplay();}
    function restoreDisplay(){
      bpmEl.textContent=seqBpm;
      bpmEl.style.minWidth='';
    }
    bpmEl.textContent='';
    bpmEl.style.minWidth='52px';
    bpmEl.appendChild(input);
    requestAnimationFrame(()=>{input.focus();input.select();});
  }

  // Double-click on desktop
  bpmEl.addEventListener('dblclick',e=>{e.stopPropagation();openBpmInput();});

  // Long-press on mobile (500ms)
  let bpmPressTimer=null;
  bpmEl.addEventListener('touchstart',e=>{bpmPressTimer=setTimeout(()=>{e.preventDefault();openBpmInput();},500);},{passive:true});
  bpmEl.addEventListener('touchend',()=>{if(bpmPressTimer){clearTimeout(bpmPressTimer);bpmPressTimer=null;}});
  bpmEl.addEventListener('touchmove',()=>{if(bpmPressTimer){clearTimeout(bpmPressTimer);bpmPressTimer=null;}});
})();

// Bars
function ensureArrangement(){while(arrangement.length<arrangeBars)arrangement.push(null);arrangement.length=arrangeBars;}
function updateBarsDisplay(){
  const d=document.getElementById('seqBarsDisplay');if(d)d.textContent=arrangeBars;
  const l=document.getElementById('seqArrangeLabel');if(l)l.textContent=`arrangement · ${arrangeBars} bars`;
  buildArrPhRow();buildArrGrid();
}
function changeBars(delta){
  const idx=BARS_OPTS.indexOf(arrangeBars);
  arrangeBars=BARS_OPTS[Math.max(0,Math.min(BARS_OPTS.length-1,idx+delta))];
  ensureArrangement();updateBarsDisplay();
  if(seqPlaying&&seqMode==='arrange'){stopSeq();startSeq();}
}
document.getElementById('seqBarsDown')&&document.getElementById('seqBarsDown').addEventListener('click',()=>changeBars(-1));
document.getElementById('seqBarsUp')&&document.getElementById('seqBarsUp').addEventListener('click',()=>changeBars(1));

// Arrangement playhead
let arrPhEls=[];
function buildArrPhRow(){
  if(!seqArrPhRow)return;
  seqArrPhRow.innerHTML='';arrPhEls=[];
  for(let i=0;i<arrangeBars;i++){const c=document.createElement('div');c.className='seq-arr-ph-cell';seqArrPhRow.appendChild(c);arrPhEls.push(c);}
}

// Arrangement grid
let arrBarEls=[];
function buildArrGrid(){
  if(!seqArrGrid)return;
  seqArrGrid.innerHTML='';arrBarEls=[];ensureArrangement();
  // Scale aspect ratio so all rows fit: more bars = flatter cells
  const rows=Math.ceil(arrangeBars/4);
  const ratio=(1.6+(rows-1)*0.65).toFixed(2);
  for(let i=0;i<arrangeBars;i++){
    const bar=document.createElement('div');
    const pat=arrangement[i]!=null?savedPatterns[arrangement[i]]:null;
    bar.className='seq-arr-bar'+(pat?'':' empty');
    bar.style.aspectRatio=ratio;
    if(pat){bar.style.setProperty('--bc',pat.color);bar.style.borderColor=pat.color;bar.style.background=pat.color+'22';}
    const idxEl=document.createElement('div');idxEl.className='seq-arr-bar-idx';idxEl.textContent=i+1;
    const nm=document.createElement('div');nm.className='seq-arr-bar-name';nm.style.color=pat?pat.color:'#333';nm.textContent=pat?pat.name:'—';
    bar.appendChild(idxEl);bar.appendChild(nm);
    const bi=i;bar.addEventListener('click',()=>openArrBarPicker(bi));
    seqArrGrid.appendChild(bar);arrBarEls.push(bar);
  }
}
function refreshArrBar(i){
  const bar=arrBarEls[i];if(!bar)return;
  const pat=arrangement[i]!=null?savedPatterns[arrangement[i]]:null;
  bar.className='seq-arr-bar'+(pat?'':' empty');
  bar.style.setProperty('--bc',pat?pat.color:'#a0a8ff');
  bar.style.borderColor=pat?pat.color:'';
  bar.style.background=pat?pat.color+'22':'';
  const nm=bar.querySelector('.seq-arr-bar-name');
  if(nm){nm.style.color=pat?pat.color:'#333';nm.textContent=pat?pat.name:'—';}
}

// Pattern library
// remove a saved pattern and keep every arrangement's pattern indexes pointing at the right ones
function deleteSavedPattern(pi){
  savedPatterns.splice(pi,1);
  const fix=a=>a.map(v=>v==null?null:v===pi?null:v>pi?v-1:v);
  arrangement=fix(arrangement);
  try{(savedArrangements||[]).forEach(a=>{if(a&&Array.isArray(a.arrangement))a.arrangement=fix(a.arrangement);});}catch(e){}
  buildPatLibrary();buildArrGrid();autoSave();
}
function buildPatLibrary(){
  if(!seqPatLibrary)return;
  seqPatLibrary.innerHTML='';
  if(!savedPatterns.length){
    const e=document.createElement('div');e.className='seq-area-label';e.style.opacity='.4';e.textContent='No saved patterns — tap 💾 SAVE to create one';
    seqPatLibrary.appendChild(e);return;
  }
  savedPatterns.forEach((pat,pi)=>{
    const row=document.createElement('div');row.className='seq-pat-row';
    const dot=document.createElement('div');dot.className='seq-pat-dot';dot.style.background=pat.color;
    const nm=document.createElement('div');nm.className='seq-pat-name';nm.style.color=pat.color;nm.textContent=pat.name;
    const acts=document.createElement('div');acts.className='seq-pat-actions';
    const loadBtn=document.createElement('button');loadBtn.className='seq-pat-load-btn';loadBtn.textContent='LOAD';
    loadBtn.addEventListener('click',e=>{e.stopPropagation();loadPatternSmart(pi);});
    const delBtn=document.createElement('button');delBtn.className='seq-pat-del-btn';delBtn.textContent='✕';
    delBtn.addEventListener('click',e=>{e.stopPropagation();
      if(confirm('Delete pattern "'+pat.name+'"?')){
        deleteSavedPattern(pi);
      }
    });
    acts.appendChild(loadBtn);acts.appendChild(delBtn);
    row.appendChild(dot);row.appendChild(nm);row.appendChild(acts);
    seqPatLibrary.appendChild(row);
  });
}
function loadPatternIntoEditor(pi,offset,wrap,merge){
  const pat=savedPatterns[pi];if(!pat)return;
  offset=offset||0;
  if(patLen(pat)>STEPS){const L=patLen(pat);STEPS=L<=16?16:L<=32?32:64;offset=0;merge=false;}
  const old=seqLayers.map(l=>({sound:l.soundId,steps:l.steps.slice(),vols:l.vols.slice(),muted:l.muted,has:l.steps.some(Boolean)}));
  seqLayersContainer.innerHTML='';seqLayers=[];
  const len=patLen(pat);
  pat.layers.forEach((snap,ti)=>{
    let st=snap.steps,vl=snap.vols,snd=snap.soundId;
    const o=merge?old[ti]:null;
    if(merge||offset>0||wrap){ // place the (shorter) pattern starting at step offset+1, optionally wrapping its overflow to the start
      // paste mode: keep everything already on the track and only overwrite the pasted range
      const ns=o?o.steps.slice():new Array(MAX_STEPS).fill(false),nv=o?o.vols.slice():new Array(MAX_STEPS).fill(100);
      if(o&&o.has)snd=o.sound;
      for(let i=0;i<len;i++){
        let t=offset+i;
        if(t>=STEPS){if(!wrap)continue;t=t%STEPS;}
        ns[t]=!!st[i];nv[t]=(vl&&vl[i]!=null)?vl[i]:100;
      }
      st=ns;vl=nv;
    }
    addSeqLayer(snd,[...st],vl?[...vl]:null);
    if(o&&o.muted&&seqLayers.length){const L=seqLayers[seqLayers.length-1];L.muted=true;const mb=L.el&&L.el.querySelector('.seq-rc-btn');if(mb)mb.classList.add('muted');}
  });
  ensureAllTracks();
  if(typeof rollPaste==='function'&&pat.roll)rollPaste(pat.roll,offset,len,wrap,merge||offset>0||wrap);
  else if(typeof rollPaste==='function'&&!merge&&!(offset>0||wrap))pianoRoll={layers:pianoRoll.layers.map(L=>({soundId:L.soundId,muted:L.muted,notes:[]}))};
  setSeqMode('pattern');
  if(typeof refreshRollUI==='function')refreshRollUI();
  showToast('Pattern "'+pat.name+'" loaded into editor');
}

// Loading a SHORTER pattern into a longer loop: ask where it should start (and whether overflow wraps)
function loadPatternSmart(pi){
  const pat=savedPatterns[pi];if(!pat)return;
  const len=patLen(pat);
  if(len>=STEPS){loadPatternIntoEditor(pi);autoSave();return;}
  let m=document.getElementById('patStartModal');
  if(!m){
    m=document.createElement('div');m.id='patStartModal';
    m.style.cssText='position:fixed;top:0;right:0;bottom:0;left:0;z-index:330;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);';
    m.innerHTML='<div class="confirm-box" style="max-width:340px;width:90%;"><div class="confirm-title" id="psTitle" style="color:#a0a8ff;"></div><div class="confirm-sub" id="psSub" style="font-size:.8rem;"></div><div id="psBody" style="display:flex;flex-direction:column;gap:.5rem;margin-top:1rem;"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)m.style.display='none';});
  }
  const title=document.getElementById('psTitle'),sub=document.getElementById('psSub'),body=document.getElementById('psBody');
  const close=()=>{m.style.display='none';};
  const mk=(txt,cls,fn,css)=>{const b=document.createElement('button');b.className='confirm-btn '+cls;b.textContent=txt;if(css)b.style.cssText=css;b.addEventListener('click',fn);return b;};
  function finish(start,wrap){close();loadPatternIntoEditor(pi,start-1,wrap,true);autoSave();}
  function askWrap(start){
    const over=start-1+len-STEPS;
    title.textContent='PATTERN WRAP?';
    sub.textContent='The last '+over+' step'+(over>1?'s':'')+' run past the end of the loop. Loop them back to the beginning?';
    body.innerHTML='';
    body.appendChild(mk('YES — WRAP','yes',()=>finish(start,true)));
    body.appendChild(mk('NO — CUT OFF','no',()=>finish(start,false)));
    body.appendChild(mk('BACK','no',askStart,'opacity:.7;'));
  }
  function askStart(){
    title.textContent='START ON WHICH STEP?';
    sub.textContent='"'+pat.name+'" is '+len+' steps · your loop is '+STEPS+' · other steps stay as they are';
    body.innerHTML='';
    const chips=document.createElement('div');chips.style.cssText='display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;';
    const inp=document.createElement('input');inp.type='number';inp.min=1;inp.max=STEPS;inp.value=1;
    inp.style.cssText='width:100%;box-sizing:border-box;text-align:center;font-family:Bebas Neue,sans-serif;font-size:1.6rem;letter-spacing:.1em;padding:.4rem;border-radius:8px;border:1px solid #2a2a5a;background:#0a0a1a;color:#cfd2ff;';
    for(let s0=1;s0<=STEPS;s0+=16){chips.appendChild(mk('STEP '+s0,'no',()=>{inp.value=s0;},'flex:1 1 auto;margin:0;padding:.4rem .6rem;'));}
    body.appendChild(chips);body.appendChild(inp);
    body.appendChild(mk('OK','yes',()=>{
      let v=Math.round(parseFloat(inp.value));if(!isFinite(v))v=1;v=Math.min(STEPS,Math.max(1,v));
      if(v-1+len>STEPS)askWrap(v);else finish(v,false);
    }));
    body.appendChild(mk('CANCEL','no',close));
  }
  askStart();m.style.display='flex';
}

// startSeq / stopSeq
function startSeq(){
  seqClockStop();
  if(seqEnergy<=0){ // no energy: wait until a pad hit recharges the meter
    _seqEnergyWait=true;updateEnergyUI();
    showToast('Energy empty — tap a drum pad to recharge!');
    return;
  }
  _seqEnergyWait=false;
  seqStep=0;arrBar=0;arrBarStep=0;songSlotIdx=0;songArrBar=0;songArrBarStep=0;
  // Ensure arrangement array is sized correctly
  if(seqMode==='arrange'){
    ensureArrangement();
    // Rebuild arr ph row if needed
    if(arrPhEls.length!==arrangeBars){buildArrPhRow();}
    if(arrBarEls.length!==arrangeBars){buildArrGrid();}
  }
  if(seqMode==='song'&&songSlots.length===0){
    showToast('Add arrangements to the Song tab first!');
    return;
  }
  seqPlaying=true;
  _seqHidePaused=false;
  seqClockStart();
  if(seqPlayPauseBtn){seqPlayPauseBtn.textContent='PAUSE';seqPlayPauseBtn.classList.add('playing');}
  requestRender();
}

// One sequencer step. Every step scores (metronome); notes only add sound. quiet = catch-up step (no sound/visuals).
function seqRunStep(quiet,delayMs,audioAt){
  delayMs=delayMs||0;
  const _at=(audioAt!==undefined)?audioAt:Tnow()+delayMs/1000; // audio-clock time this step should sound
  const later=fn=>{if(delayMs>6)setTimeout(fn,delayMs);else fn();};
  scoreSeqStep(quiet);
  if(seqMode==='pattern'){
    if(!quiet){
      const st=seqStep;
      later(()=>{
        seqPhEls.forEach((c,i)=>c.classList.toggle('lit',i===st));
        if(seqFollow&&STEPS>16)followPlayhead(st);
        seqFullPhEls.forEach((c,i)=>c.classList.toggle('lit',i===st));
        if(typeof rollPlayhead==='function')rollPlayhead(st);
        seqLayers.forEach(layer=>{
          if(layer.steps[st]){
            const btn=layer.stepEls[st];
            btn&&(btn.classList.remove('flash'),void btn.offsetWidth,btn.classList.add('flash'));
            const fbtn=layer.fullStepEls[st];
            fbtn&&(fbtn.classList.remove('flash'),void fbtn.offsetWidth,fbtn.classList.add('flash'));
          }
        });
      });
      seqLayers.forEach((layer,_li)=>{
        if(layer.steps[st]&&layerAudible(layer)){getCtx();playSound(layer.soundId,layer.vols[st]/100,_at,_li);}
      });
      typeof rollPlayStep==='function'&&rollPlayStep(pianoRoll,st,_at,true); // piano roll notes that start inside this step
      if(st%16===0&&typeof fxBeatSync==='function')fxBeatSync(_at); // keep tremolo / auto-pan locked to the bar
    }
    seqStep=(seqStep+1)%STEPS;
  } else if(seqMode==='arrange'){
    if(!quiet){
      const ab=arrBar,as=arrBarStep;
      later(()=>{
        arrPhEls.forEach((c,i)=>c.classList.toggle('lit',i===ab));
        arrBarEls.forEach((b,i)=>b.classList.toggle('playing',i===ab));
      });
      const pat=arrangement[ab]!=null?savedPatterns[arrangement[ab]]:null;
      if(pat){
        pat.layers.forEach((layer,_li)=>{
          if(layer.steps[as]&&!layer.muted){
            getCtx();const _av=(layer.vols&&layer.vols[as]!=null)?layer.vols[as]/100:1;playSound(layer.soundId,_av,_at,_li);
          }
        });
        typeof rollPlayStep==='function'&&rollPlayStep(pat.roll,as,_at);
        if(as%16===0&&typeof fxBeatSync==='function')fxBeatSync(_at);
      }
    }
    arrBarStep++;
    if(arrBarStep>=patLen(arrangement[arrBar]!=null?savedPatterns[arrangement[arrBar]]:null)){
      arrBarStep=0;
      arrBar=(arrBar+1)%arrangeBars;
      if(!quiet){
        arrPhEls.forEach((c,i)=>c.classList.toggle('lit',i===arrBar));
        arrBarEls.forEach((b,i)=>b.classList.toggle('playing',i===arrBar));
      }
    }
  } else if(seqMode==='song'){
    // Song mode: walk songSlots, each slot = one savedArrangement
    if(songSlots.length===0){return;}
    const slot=songSlots[songSlotIdx];
    const arr=savedArrangements[slot.arrIdx];
    if(arr){
      const totalBars=arr.bars;
      if(!quiet){
        const ss=songSlotIdx,sb=songArrBar,sst=songArrBarStep;
        later(()=>{
          songSlotEls.forEach((el,i)=>el.classList.toggle('playing',i===ss));
          songPhEls.forEach((c,i)=>c.classList.toggle('lit',i===sb));
        });
        const pat=arr.arrangement[sb]!=null?savedPatterns[arr.arrangement[sb]]:null;
        if(pat){
          pat.layers.forEach((layer,_li)=>{
            if(layer.steps[sst]&&!layer.muted){
              getCtx();const _sv=(layer.vols&&layer.vols[sst]!=null)?layer.vols[sst]/100:1;playSound(layer.soundId,_sv,_at,_li);
            }
          });
          typeof rollPlayStep==='function'&&rollPlayStep(pat.roll,sst,_at);
          if(sst%16===0&&typeof fxBeatSync==='function')fxBeatSync(_at);
        }
      }
      songArrBarStep++;
      if(songArrBarStep>=patLen(arr.arrangement[songArrBar]!=null?savedPatterns[arr.arrangement[songArrBar]]:null)){
        songArrBarStep=0;songArrBar++;
        if(songArrBar>=totalBars){
          songArrBar=0;
          songSlotIdx=(songSlotIdx+1)%songSlots.length;
          buildSongPhRow();
        }
      }
    } else {
      // Invalid slot, skip
      songSlotIdx=(songSlotIdx+1)%songSlots.length;
    }
  }
}
function stopSeq(){
  seqClockStop();_seqEnergyWait=false;_seqHidePaused=false;
  seqPlaying=false;requestRender();seqStep=0;_followPage=-1;arrBar=0;arrBarStep=0;songSlotIdx=0;songArrBar=0;songArrBarStep=0;
  seqPhEls.forEach(c=>c.classList.remove('lit'));
  seqFullPhEls.forEach(c=>c.classList.remove('lit'));
  if(typeof rollPlayhead==='function')rollPlayhead(-1);
  arrPhEls.forEach(c=>c.classList.remove('lit'));
  arrBarEls.forEach(b=>b.classList.remove('playing'));
  songSlotEls.forEach(b=>b.classList.remove('playing'));
  songPhEls.forEach(c=>c.classList.remove('lit'));
  if(seqPlayPauseBtn){seqPlayPauseBtn.textContent='▶';seqPlayPauseBtn.classList.remove('playing');}
}

seqAddBtn.addEventListener('click',()=>{getCtx();addSeqLayer();});
ensureArrangement();buildArrPhRow();buildArrGrid();buildPatLibrary();

// ── Song Mode ──
let songSlotEls=[];
let songPhEls=[];

function buildSongPhRow(){
  const row=document.getElementById('seqSongPhRow');if(!row)return;
  row.innerHTML='';songPhEls=[];
  const slot=songSlots[songSlotIdx];
  const arr=slot!=null?savedArrangements[slot.arrIdx]:null;
  const bars=arr?arr.bars:0;
  for(let i=0;i<bars;i++){const c=document.createElement('div');c.className='seq-arr-ph-cell';row.appendChild(c);songPhEls.push(c);}
}

function buildSongSlots(){
  const el=document.getElementById('seqSongSlots');if(!el)return;
  el.innerHTML='';songSlotEls=[];
  const lbl=document.getElementById('seqSongLabel');
  if(lbl)lbl.textContent='song · '+songSlots.length+' arrangement'+(songSlots.length!==1?'s':'');
  if(!songSlots.length){
    const e=document.createElement('div');e.className='seq-area-label';e.style.opacity='.4';
    e.textContent='No arrangements added — tap + ADD ARRANGEMENT';
    el.appendChild(e);return;
  }
  songSlots.forEach((slot,si)=>{
    const arr=savedArrangements[slot.arrIdx];
    const row=document.createElement('div');row.className='seq-song-slot';
    if(arr)row.style.setProperty('--sc',arr.color);
    const idx=document.createElement('div');idx.className='seq-song-slot-idx';idx.textContent=si+1;
    const dot=document.createElement('div');dot.className='seq-song-slot-dot';dot.style.background=arr?arr.color:'#333';
    const nm=document.createElement('div');nm.className='seq-song-slot-name';nm.style.color=arr?arr.color:'#555';nm.textContent=arr?arr.name:'—';
    const bars=document.createElement('div');bars.className='seq-song-slot-bars';bars.textContent=arr?arr.bars+'B':'';
    const del=document.createElement('button');del.className='seq-song-slot-del';del.textContent='✕';
    del.addEventListener('click',e=>{e.stopPropagation();songSlots.splice(si,1);buildSongSlots();buildSongPhRow();});
    // Tap to swap
    row.addEventListener('click',()=>openSongSlotPicker(si));
    row.appendChild(idx);row.appendChild(dot);row.appendChild(nm);row.appendChild(bars);row.appendChild(del);
    el.appendChild(row);songSlotEls.push(row);
  });
}

// Song slot picker modal — reuse arrBarPickerModal style
function openSongSlotPicker(si){
  const modal=document.getElementById('arrBarPickerModal');
  document.getElementById('arrBarPickerTitle').textContent='SLOT '+(si+1)+' — ASSIGN ARRANGEMENT';
  const list=document.getElementById('arrBarPickerList');list.innerHTML='';
  if(!savedArrangements.length){
    const e=document.createElement('div');e.className='seq-area-label';e.style.opacity='.4';e.textContent='No saved arrangements yet';list.appendChild(e);
  }
  savedArrangements.forEach((arr,ai)=>{
    const row=document.createElement('div');
    const isActive=songSlots[si]&&songSlots[si].arrIdx===ai;
    row.className='seq-pat-row'+(isActive?' selected':'');
    const dot=document.createElement('div');dot.className='seq-pat-dot';dot.style.background=arr.color;
    const nm=document.createElement('div');nm.className='seq-pat-name';nm.style.color=arr.color;nm.textContent=arr.name;
    const bars=document.createElement('div');bars.style.cssText='font-family:Bebas Neue,sans-serif;font-size:.55rem;color:#555;margin-left:auto;';bars.textContent=arr.bars+'B';
    row.appendChild(dot);row.appendChild(nm);row.appendChild(bars);
    row.addEventListener('click',()=>{songSlots[si]={arrIdx:ai};buildSongSlots();buildSongPhRow();modal.style.display='none';});
    list.appendChild(row);
  });
  modal.style.display='flex';
}

// Add arrangement to song
document.getElementById('seqAddArrToSongBtn')&&document.getElementById('seqAddArrToSongBtn').addEventListener('click',()=>{
  if(songSlots.length>=16){showToast('Maximum 16 arrangements in a song');return;}
  if(!savedArrangements.length){showToast('Save an arrangement first in ARR mode');return;}
  // Open picker to choose which arrangement to add
  const modal=document.getElementById('arrBarPickerModal');
  document.getElementById('arrBarPickerTitle').textContent='ADD ARRANGEMENT TO SONG';
  const list=document.getElementById('arrBarPickerList');list.innerHTML='';
  savedArrangements.forEach((arr,ai)=>{
    const row=document.createElement('div');row.className='seq-pat-row';
    const dot=document.createElement('div');dot.className='seq-pat-dot';dot.style.background=arr.color;
    const nm=document.createElement('div');nm.className='seq-pat-name';nm.style.color=arr.color;nm.textContent=arr.name;
    const bars=document.createElement('div');bars.style.cssText='font-family:Bebas Neue,sans-serif;font-size:.55rem;color:#555;margin-left:auto;';bars.textContent=arr.bars+'B';
    row.appendChild(dot);row.appendChild(nm);row.appendChild(bars);
    row.addEventListener('click',()=>{songSlots.push({arrIdx:ai});buildSongSlots();buildSongPhRow();modal.style.display='none';});
    list.appendChild(row);
  });
  modal.style.display='flex';
});

// ── Save Arrangement ──
const SAV_ARR_COLORS=['#a0a8ff','#00ff88','#ff44aa','#ffaa00','#44aaff','#ff6644','#cc44ff','#ffee44','#44ffcc','#ff4444'];
let saveArrColor=SAV_ARR_COLORS[0];

document.getElementById('seqSaveArrBtn')&&document.getElementById('seqSaveArrBtn').addEventListener('click',()=>{
  document.getElementById('saveArrModal').style.display='flex';
  const inp=document.getElementById('saveArrNameInput');
  if(inp){inp.value='Arrangement '+(savedArrangements.length+1);inp.select();}
  // Build color swatches
  const sw=document.getElementById('saveArrColors');sw.innerHTML='';
  SAV_ARR_COLORS.forEach(col=>{
    const s=document.createElement('div');
    s.style.cssText='width:22px;height:22px;border-radius:50%;background:'+col+';cursor:pointer;border:2px solid '+(col===saveArrColor?'#fff':'transparent')+';transition:border .1s;flex-shrink:0;';
    s.addEventListener('click',()=>{saveArrColor=col;sw.querySelectorAll('div').forEach(x=>x.style.borderColor='transparent');s.style.borderColor='#fff';});
    sw.appendChild(s);
  });
});

document.getElementById('saveArrConfirm')&&document.getElementById('saveArrConfirm').addEventListener('click',()=>{
  const inp=document.getElementById('saveArrNameInput');
  const name=(inp?inp.value.trim():'')||'Arrangement '+(savedArrangements.length+1);
  savedArrangements.push({name,color:saveArrColor,bars:arrangeBars,arrangement:[...arrangement]});
  document.getElementById('saveArrModal').style.display='none';
  showToast('Arrangement "'+name+'" saved!');
  autoSave();
});
document.getElementById('saveArrClose')&&document.getElementById('saveArrClose').addEventListener('click',()=>{document.getElementById('saveArrModal').style.display='none';});
document.getElementById('saveArrModal')&&document.getElementById('saveArrModal').addEventListener('click',e=>{if(e.target===document.getElementById('saveArrModal'))document.getElementById('saveArrModal').style.display='none';});

// ── Save Pattern modal ──
const PAT_COLORS=['#a0a8ff','#00ff88','#ff44aa','#ffaa00','#44aaff','#ff6644','#cc44ff','#ffee44','#44ffcc','#ff4444'];
let savePatColor=PAT_COLORS[0];
const savePatModal=document.getElementById('savePatModal');
const savePatNameInput=document.getElementById('savePatNameInput');
const savePatColors=document.getElementById('savePatColors');
PAT_COLORS.forEach(col=>{
  const sw=document.createElement('div');
  sw.style.cssText=`width:22px;height:22px;border-radius:50%;background:${col};cursor:pointer;border:2px solid transparent;transition:border .1s;flex-shrink:0;`;
  sw.addEventListener('click',()=>{
    savePatColor=col;
    savePatColors.querySelectorAll('div').forEach(s=>s.style.borderColor='transparent');
    sw.style.borderColor='#fff';
  });
  if(col===savePatColor)sw.style.borderColor='#fff';
  savePatColors.appendChild(sw);
});
document.getElementById('savePatClose')&&document.getElementById('savePatClose').addEventListener('click',()=>{savePatModal.style.display='none';});
savePatModal&&savePatModal.addEventListener('click',e=>{if(e.target===savePatModal)savePatModal.style.display='none';});
function openSavePatModal(){
  savePatNameInput.value='Pattern '+(savedPatterns.length+1);
  // on loops longer than 16 steps you can save just a part (default: the whole loop)
  const rg=document.getElementById('savePatRange');
  if(rg){
    rg.style.display=STEPS>16?'flex':'none';
    document.getElementById('savePatFrom').value=1;document.getElementById('savePatTo').value=STEPS;
    document.getElementById('savePatFrom').max=STEPS;document.getElementById('savePatTo').max=STEPS;
    document.getElementById('savePatRangeInfo').textContent='(1–'+STEPS+')';
  }
  savePatModal.style.display='flex';
}
document.getElementById('savePatFull')&&document.getElementById('savePatFull').addEventListener('click',()=>{
  document.getElementById('savePatFrom').value=1;document.getElementById('savePatTo').value=STEPS;
});
document.getElementById('savePatConfirm')&&document.getElementById('savePatConfirm').addEventListener('click',()=>{
  const name=savePatNameInput.value.trim()||('Pattern '+(savedPatterns.length+1));
  let from=1,to=STEPS;
  if(STEPS>16){
    from=Math.round(parseFloat(document.getElementById('savePatFrom').value));to=Math.round(parseFloat(document.getElementById('savePatTo').value));
    if(!isFinite(from))from=1;if(!isFinite(to))to=STEPS;
    from=Math.min(STEPS,Math.max(1,from));to=Math.min(STEPS,Math.max(1,to));
    if(from>to){const t=from;from=to;to=t;}
  }
  savedPatterns.push({name,color:savePatColor,stepCount:to-from+1,layers:seqLayers.map(l=>({soundId:l.soundId,steps:l.steps.slice(from-1,to),vols:l.vols.slice(from-1,to),muted:l.muted||false})),roll:(typeof rollSlice==='function'&&musicHas('mt_piano'))?rollSlice(pianoRoll,from-1,to):undefined});
  savePatModal.style.display='none';
  buildPatLibrary();
  showToast('Pattern "'+name+'" saved!');
});

// ── Load pattern modal ──
(function(){
  const modal=document.getElementById('loadPatModal'),list=document.getElementById('loadPatList');
  if(!modal)return;
  const close=()=>{modal.style.display='none';};
  document.getElementById('seqSavePatBtn').addEventListener('click',()=>{
    list.innerHTML='';
    // one button for both: save the current pattern as a new one, or pick a saved one to load
    const sv=document.createElement('button');sv.className='confirm-btn';sv.textContent='SAVE CURRENT PATTERN';
    sv.style.cssText='margin-bottom:.4rem;color:#00ff88;border-color:#00cc88;background:#04170e;';
    sv.addEventListener('click',()=>{close();openSavePatModal();});
    list.appendChild(sv);
    if(!savedPatterns.length){
      const e=document.createElement('div');e.className='confirm-sub';e.style.fontSize='.85rem';e.textContent='No saved patterns to load yet';list.appendChild(e);
    }
    savedPatterns.forEach((pat,pi)=>{
      const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:.4rem;align-items:stretch;';
      const b=document.createElement('button');b.className='confirm-btn no';
      b.style.cssText='flex:1 1 auto;margin:0;color:'+pat.color+';border-color:'+pat.color+';';b.textContent=pat.name;
      b.addEventListener('click',()=>{close();loadPatternSmart(pi);});
      // trash: first tap arms it (turns solid red "DELETE?"), second tap deletes
      const del=document.createElement('button');del.className='confirm-btn no';
      const TR='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
      del.style.cssText='flex:0 0 auto;margin:0;width:3.2rem;padding-left:0;padding-right:0;color:#e0485c;border-color:#aa3344;';
      del.innerHTML=TR;del.setAttribute('aria-label','Delete '+pat.name);
      let armed=false,tmr=0;
      del.addEventListener('click',e=>{e.stopPropagation();
        if(!armed){armed=true;del.textContent='SURE?';del.style.background='#5a0f1a';del.style.color='#fff';del.style.width='4.6rem';
          tmr=setTimeout(()=>{armed=false;del.innerHTML=TR;del.style.background='';del.style.color='#e0485c';del.style.width='3.2rem';},2500);return;}
        clearTimeout(tmr);deleteSavedPattern(pi);
        // rebuild the list in place
        document.getElementById('seqSavePatBtn').click();
      });
      wrap.appendChild(b);wrap.appendChild(del);list.appendChild(wrap);
    });
    modal.style.display='flex';
  });
  document.getElementById('loadPatCancel').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
})();

// ── Clear tracks modal ──
(function(){
  const modal=document.getElementById('clearTrackModal');
  if(!modal)return;
  const pick=document.getElementById('clearTrackPick'),conf=document.getElementById('clearTrackConfirm');
  const btns=document.getElementById('clearTrackBtns'),sub=document.getElementById('clearTrackSub');
  const title=document.getElementById('clearTrackTitle');
  let target=null; // track index, or 'all'
  function close(){modal.style.display='none';}
  function ask(t){
    target=t;
    title.textContent='ARE YOU SURE?';
    sub.textContent=t==='all'?'Clear ALL tracks? This erases every step.':
      t==='rollall'?'Clear ALL piano roll layers? This erases every note.':
      (typeof t==='string'&&t.indexOf('roll')===0)?'Clear piano roll layer '+(+t.slice(4)+1)+'? This erases its notes.':
      'Clear track '+(t+1)+'? This erases its steps.';
    pick.style.display='none';conf.style.display='block';
  }
  document.getElementById('seqClearBtn')&&document.getElementById('seqClearBtn').addEventListener('click',()=>{
    const rollN=(typeof pianoRollLayers==='function')?pianoRollLayers():0;
    if(!seqLayers.length&&!rollN){showToast('No tracks to clear');return;}
    title.textContent='CLEAR WHICH TRACK?';
    conf.style.display='none';pick.style.display='block';
    btns.innerHTML='';
    for(let i=0;i<6;i++){
      const b=document.createElement('button');
      b.className='confirm-btn no';b.textContent='TRACK '+(i+1);
      const exists=i<seqLayers.length;
      if(!exists){b.disabled=true;b.style.opacity='.3';b.style.cursor='default';}
      else b.addEventListener('click',()=>ask(i));
      btns.appendChild(b);
    }
    // piano roll layers (once the Piano Roll is unlocked): one button per layer + all layers
    let rw=document.getElementById('clearRollWrap');
    if(!rw){rw=document.createElement('div');rw.id='clearRollWrap';btns.parentNode.insertBefore(rw,document.getElementById('clearTrackAll'));}
    rw.innerHTML='';rw.style.display=rollN?'':'none';
    if(rollN){
      const lbl=document.createElement('div');lbl.className='clear-roll-lbl';lbl.textContent='PIANO ROLL';rw.appendChild(lbl);
      const g=document.createElement('div');g.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;';
      for(let i=0;i<6;i++){
        const b=document.createElement('button');b.className='confirm-btn no';b.textContent='ROLL '+(i+1);
        if(i>=rollN){b.disabled=true;b.style.opacity='.3';b.style.cursor='default';}
        else b.addEventListener('click',()=>ask('roll'+i));
        g.appendChild(b);
      }
      rw.appendChild(g);
      const all=document.createElement('button');all.className='confirm-btn';all.textContent='ALL ROLL LAYERS';
      all.style.cssText='width:100%;margin-top:.5rem;background:#10001a;border-color:#bb66ff;color:#cc88ff;';
      all.addEventListener('click',()=>ask('rollall'));rw.appendChild(all);
    }
    modal.style.display='flex';
  });
  document.getElementById('clearTrackAll').addEventListener('click',()=>ask('all'));
  document.getElementById('clearTrackCancel').addEventListener('click',close);
  document.getElementById('clearTrackNo').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  document.getElementById('clearTrackYes').addEventListener('click',()=>{
    if(typeof target==='string'&&target.indexOf('roll')===0){
      const which=target==='rollall'?'all':+target.slice(4);
      clearRollLayers(which);close();
      showToast(which==='all'?'All piano roll layers cleared':'Piano roll layer '+(which+1)+' cleared');
      return;
    }
    const list=target==='all'?seqLayers:[seqLayers[target]];
    list.forEach(l=>{
      if(!l)return;
      for(let i=0;i<MAX_STEPS;i++){
        l.steps[i]=false;l.vols[i]=100;
        [l.stepEls[i],l.fullStepEls[i]].forEach(el=>{if(el){el.classList.remove('on');el.style.opacity='';}});
      }
    });
    close();
    showToast(target==='all'?'All tracks cleared':'Track '+(target+1)+' cleared');
    autoSave();
  });
})();

// ── Arr bar picker modal ──
const arrBarPickerModal=document.getElementById('arrBarPickerModal');
let arrPickerBarIdx=null;
function openArrBarPicker(i){
  arrPickerBarIdx=i;
  document.getElementById('arrBarPickerTitle').textContent='BAR '+(i+1)+' — ASSIGN PATTERN';
  const list=document.getElementById('arrBarPickerList');
  list.innerHTML='';
  // Clear option
  const clearRow=document.createElement('div');
  clearRow.className='seq-pat-row';
  const clDot=document.createElement('div');clDot.className='seq-pat-dot';clDot.style.background='#333';
  const clNm=document.createElement('div');clNm.className='seq-pat-name';clNm.style.color='#444';clNm.textContent='— EMPTY';
  clearRow.appendChild(clDot);clearRow.appendChild(clNm);
  clearRow.addEventListener('click',()=>{arrangement[arrPickerBarIdx]=null;refreshArrBar(arrPickerBarIdx);arrBarPickerModal.style.display='none';});
  list.appendChild(clearRow);
  if(!savedPatterns.length){
    const e=document.createElement('div');e.className='seq-area-label';e.style.opacity='.4';e.textContent='No saved patterns yet';list.appendChild(e);
  }
  savedPatterns.forEach((pat,pi)=>{
    const row=document.createElement('div');
    const isActive=arrangement[arrPickerBarIdx]===pi;
    row.className='seq-pat-row'+(isActive?' selected':'');
    const dot=document.createElement('div');dot.className='seq-pat-dot';dot.style.background=pat.color;
    const nm=document.createElement('div');nm.className='seq-pat-name';nm.style.color=pat.color;nm.textContent=pat.name;
    row.appendChild(dot);row.appendChild(nm);
    row.addEventListener('click',()=>{arrangement[arrPickerBarIdx]=pi;refreshArrBar(arrPickerBarIdx);arrBarPickerModal.style.display='none';});
    list.appendChild(row);
  });
  arrBarPickerModal.style.display='flex';
}
document.getElementById('arrBarPickerClose')&&document.getElementById('arrBarPickerClose').addEventListener('click',()=>{arrBarPickerModal.style.display='none';});
arrBarPickerModal&&arrBarPickerModal.addEventListener('click',e=>{if(e.target===arrBarPickerModal)arrBarPickerModal.style.display='none';});

// ── 4+ tracks on a shorter screen: only 3½ rows show, the rest scroll (invisible scrollbar) ──
function fitSeqScroll(){
  const c=seqLayersContainer;if(!c)return;
  const sc=document.getElementById('seqHScroll');if(!sc)return;   // the scroller around playhead bar + track rows
  const rows=c.querySelectorAll('.seq-layer-row');
  const hdr=seqPhBar?seqPhBar.offsetHeight+3:0;
  const off=()=>{if(sc.classList.contains('seq-scroll')){sc.classList.remove('seq-scroll');sc.style.maxHeight='';}};
  // PHONE LAYOUT: the track list fills whatever vertical space the drum pads leave over
  // (few pads = more rows visible, 8 pads = fewer), scrolling when there are more tracks than fit.
  if(!document.body.classList.contains('desktop-mode')&&document.body.classList.contains('seq-on')&&rows.length&&c.offsetParent!==null){
    const sb=document.getElementById('soundboardBtn'),grid=document.getElementById('padGrid'),area=seqArea;
    if(sb&&grid&&area&&!document.body.classList.contains('store-open')&&!document.body.classList.contains('bunker-open')){
      const pitch=rows.length>1?rows[1].offsetTop-rows[0].offsetTop:rows[0].offsetHeight+6;
      const full=sc.scrollHeight;
      const nn=Math.max(1,Math.min(8,parseInt(grid.getAttribute('data-pads'))||1));
      const colsN=nn<=1?1:(nn===3?3:(nn<=4?2:(nn<=6?3:4)));
      const rowsN=Math.ceil(nn/colsN);
      const padNat=rowsN*((grid.clientWidth-(colsN-1)*6)/colsN/1.4)+(rowsN-1)*6;
      const cr=sc.getBoundingClientRect(),ar=area.getBoundingClientRect();
      const belowC=ar.bottom-cr.bottom;                      // bottom button row etc.
      const pa=grid.closest('.pad-area'),pcs=pa?getComputedStyle(pa):null;
      const gap=pa?(pa.getBoundingClientRect().top-ar.bottom)+(pcs?parseFloat(pcs.paddingTop)||0:0):12;
      const room=sb.getBoundingClientRect().top-10-cr.top-belowC-gap-padNat;
      const target=Math.max(pitch*2.5+hdr,Math.min(full,room));
      if(target<full-2){sc.classList.add('seq-scroll');sc.style.maxHeight=Math.floor(target)+'px';}
      else off();
      return;
    }
  }
  const small=window.innerHeight<1000;
  if(rows.length<4||!small||c.offsetParent===null){off();return;}
  const pitch=rows[1].offsetTop-rows[0].offsetTop;
  if(!pitch)return;
  sc.classList.add('seq-scroll');
  sc.style.maxHeight=Math.round(pitch*3.5+hdr)+'px';
}
new MutationObserver(fitSeqScroll).observe(seqLayersContainer,{childList:true});
addEventListener('resize',fitSeqScroll);
setInterval(()=>{if(!document.hidden)fitSeqScroll();},1500);
