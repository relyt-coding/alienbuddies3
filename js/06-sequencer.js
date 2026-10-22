
// ══════════════════════════════════════════════
//  SEQUENCER
// ══════════════════════════════════════════════
const STEPS=16;
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
for(let i=0;i<STEPS;i++){
  const c=document.createElement('div');c.className='seq-ph-cell';_phWrap.appendChild(c);seqPhEls.push(c);
  const cf=document.createElement('div');cf.className='seq-ph-cell';_phFWrap.appendChild(cf);seqFullPhEls.push(cf);
}

const viewToggleBar=document.getElementById('viewToggleBar');
const vtbSeqBtn=document.getElementById('vtbSeqBtn');
const vtbTiersBtn=document.getElementById('vtbTiersBtn');

// The hide/show buttons sit next to CLEAR under the sequencer; when the sequencer is hidden
// (or on the ARR/SONG views, which have no such row) they live in the standalone bar instead.
function placeViewButtons(){
  const clearBtn=document.getElementById('seqClearBtn');
  const inRow=clearBtn&&drum.seqTracks&&!seqHidden&&seqMode==='pattern';
  if(inRow){
    clearBtn.parentNode.insertBefore(vtbSeqBtn,clearBtn);
    clearBtn.parentNode.insertBefore(vtbTiersBtn,clearBtn);
    vtbSeqBtn.className=vtbTiersBtn.className='seq-save-pat-btn';
    viewToggleBar.style.display='none';
  }else{
    viewToggleBar.appendChild(vtbSeqBtn);viewToggleBar.appendChild(vtbTiersBtn);
    vtbSeqBtn.className=vtbTiersBtn.className='vtb-btn';
    vtbSeqBtn.classList.toggle('active',!seqHidden);vtbTiersBtn.classList.toggle('active',!trackersHidden);
    viewToggleBar.style.display=drum.seqTracks?'':'none';
  }
}
function applySeqView(){
  if(!drum.seqTracks){
    tiersWrap.style.display='';
    seqArea.classList.remove('visible');
    viewToggleBar.style.display='none';
    return;
  }
  seqArea.classList.toggle('visible',!seqHidden);
  tiersWrap.style.display=trackersHidden?'none':'';
  vtbSeqBtn.textContent=seqHidden?'SHOW SEQUENCER':'HIDE SEQUENCER';
  vtbTiersBtn.textContent=trackersHidden?'SHOW TRACKERS':'HIDE TRACKERS';
  placeViewButtons();
}

function _saveViewPrefs(){try{localStorage.setItem('ab2_hideSeq',seqHidden?'1':'0');localStorage.setItem('ab2_hideTrackers',trackersHidden?'1':'0');}catch(e){}}
vtbSeqBtn&&vtbSeqBtn.addEventListener('click',()=>{seqHidden=!seqHidden;_saveViewPrefs();applySeqView();setTimeout(clampBouncersToBounds,50);});
vtbTiersBtn&&vtbTiersBtn.addEventListener('click',()=>{trackersHidden=!trackersHidden;_saveViewPrefs();applySeqView();setTimeout(clampBouncersToBounds,50);});

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
  const pill=document.createElement('div');pill.className='seq-snd-pill';
  const dot=document.createElement('div');dot.className='seq-pill-dot';dot.style.background=snd.color;
  const nm=document.createElement('div');nm.className='seq-pill-name';nm.style.color=snd.color;nm.textContent=snd.name;
  pill.appendChild(dot);pill.appendChild(nm);
  pill.addEventListener('pointerdown',e=>{e.stopPropagation();openMiniPickerInFull(layer,dot,nm);});
  // Steps — share same layer.steps array
  const stepsEl=document.createElement('div');stepsEl.className='seq-steps';
  layer.fullStepEls=[];
  for(let i=0;i<STEPS;i++){
    const btn=document.createElement('div');btn.className='seq-step'+(layer.steps[i]?' on':'');
    btn.style.setProperty('--lc',snd.color);
    if(layer.steps[i])btn.style.opacity=String(0.3+0.7*(layer.vols[i]/100));
    const si=i;
    btn.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(levelAdjMode&&layer.steps[si]){e.stopPropagation();openVelPopover(layer,si,btn);return;}
      layer.steps[si]=!layer.steps[si];
      if(!layer.steps[si])layer.vols[si]=100;
      btn.classList.toggle('on',layer.steps[si]);
      btn.style.opacity=layer.steps[si]?String(0.3+0.7*(layer.vols[si]/100)):'';
      // Sync small grid
      if(layer.stepEls[si]){layer.stepEls[si].classList.toggle('on',layer.steps[si]);layer.stepEls[si].style.opacity=layer.steps[si]?String(0.3+0.7*(layer.vols[si]/100)):'';}
      if(layer.steps[si]&&!layer.muted){getCtx();playSound(layer.soundId);}
    });
    stepsEl.appendChild(btn);layer.fullStepEls.push(btn);
  }
  // Controls
  const ctrl=document.createElement('div');ctrl.className='seq-row-ctrl';
  const muteBtn=document.createElement('div');muteBtn.className='seq-rc-btn'+(layer.muted?' muted':'');muteBtn.textContent='M';
  const delBtn=document.createElement('div');delBtn.className='seq-rc-btn';delBtn.textContent='✕';
  muteBtn.addEventListener('pointerdown',e=>{e.stopPropagation();layer.muted=!layer.muted;muteBtn.classList.toggle('muted',layer.muted);// sync small
    layer.el&&layer.el.querySelector('.seq-rc-btn')&&(layer.el.querySelector('.seq-rc-btn').classList.toggle('muted',layer.muted));});
  delBtn.addEventListener('pointerdown',e=>{e.stopPropagation();removeSeqLayer(layer);row.remove();updateSeqFullAddBtn();});
  ctrl.appendChild(muteBtn);ctrl.appendChild(delBtn);
  row.appendChild(pill);row.appendChild(stepsEl);row.appendChild(ctrl);
  seqFullLayers.appendChild(row);
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
  for(let i=0;i<Math.min(drum.seqTracks,1);i++) addSeqLayer(defaults[i]||unlockedSounds()[0]);
  updateSeqAddBtn();
}

function addSeqLayer(soundId,stepsInit){
  if(seqLayers.length>=drum.seqTracks)return;
  soundId=soundId||unlockedSounds()[0];
  const snd=SOUND_MAP[soundId]||ALL_SOUNDS[0];
  const volsInit=arguments[2];
  const layer={soundId:snd.id,steps:stepsInit?[...stepsInit]:new Array(STEPS).fill(false),vols:volsInit?[...volsInit]:new Array(STEPS).fill(100),muted:false,stepEls:[],fullStepEls:[]};
  const row=document.createElement('div');row.className='seq-layer-row';
  // Sound pill
  const pill=document.createElement('div');pill.className='seq-snd-pill';
  const dot=document.createElement('div');dot.className='seq-pill-dot';dot.style.background=snd.color;
  const nm=document.createElement('div');nm.className='seq-pill-name';nm.style.color=snd.color;nm.textContent=snd.name;
  pill.appendChild(dot);pill.appendChild(nm);
  pill.addEventListener('pointerdown',e=>{e.stopPropagation();openMiniPicker(layer,dot,nm);});
  // Steps
  const stepsEl=document.createElement('div');stepsEl.className='seq-steps';
  for(let i=0;i<STEPS;i++){
    const btn=document.createElement('div');btn.className='seq-step'+(layer.steps[i]?' on':'');
    btn.style.setProperty('--lc',snd.color);
    if(layer.steps[i])btn.style.opacity=String(0.3+0.7*(layer.vols[i]/100));
    const si=i;
    btn.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(levelAdjMode&&layer.steps[si]){e.stopPropagation();openVelPopover(layer,si,btn);return;}
      layer.steps[si]=!layer.steps[si];
      if(!layer.steps[si])layer.vols[si]=100;
      btn.classList.toggle('on',layer.steps[si]);
      btn.style.opacity=layer.steps[si]?String(0.3+0.7*(layer.vols[si]/100)):'';
      if(layer.fullStepEls[si]){layer.fullStepEls[si].classList.toggle('on',layer.steps[si]);layer.fullStepEls[si].style.opacity=layer.steps[si]?String(0.3+0.7*(layer.vols[si]/100)):'';}
      if(layer.steps[si]&&!layer.muted){getCtx();playSound(layer.soundId);}
    });
    stepsEl.appendChild(btn);layer.stepEls.push(btn);
  }
  // Controls
  const ctrl=document.createElement('div');ctrl.className='seq-row-ctrl';
  const muteBtn=document.createElement('div');muteBtn.className='seq-rc-btn';muteBtn.title='Mute';muteBtn.textContent='M';
  const delBtn=document.createElement('div');delBtn.className='seq-rc-btn';delBtn.title='Delete';delBtn.textContent='✕';
  muteBtn.addEventListener('pointerdown',e=>{e.stopPropagation();layer.muted=!layer.muted;muteBtn.classList.toggle('muted',layer.muted);});
  delBtn.addEventListener('pointerdown',e=>{e.stopPropagation();removeSeqLayer(layer);});
  ctrl.appendChild(muteBtn);ctrl.appendChild(delBtn);
  row.appendChild(pill);row.appendChild(stepsEl);row.appendChild(ctrl);
  layer.el=row;
  seqLayersContainer.appendChild(row);
  seqLayers.push(layer);
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
    loadBtn.addEventListener('click',e=>{e.stopPropagation();loadPatternIntoEditor(pi);});
    const delBtn=document.createElement('button');delBtn.className='seq-pat-del-btn';delBtn.textContent='✕';
    delBtn.addEventListener('click',e=>{e.stopPropagation();
      if(confirm('Delete pattern "'+pat.name+'"?')){
        savedPatterns.splice(pi,1);
        arrangement=arrangement.map(v=>v==null?null:v===pi?null:v>pi?v-1:v);
        buildPatLibrary();buildArrGrid();
      }
    });
    acts.appendChild(loadBtn);acts.appendChild(delBtn);
    row.appendChild(dot);row.appendChild(nm);row.appendChild(acts);
    seqPatLibrary.appendChild(row);
  });
}
function loadPatternIntoEditor(pi){
  const pat=savedPatterns[pi];if(!pat)return;
  seqLayersContainer.innerHTML='';seqLayers=[];
  pat.layers.forEach(snap=>addSeqLayer(snap.soundId,[...snap.steps],snap.vols?[...snap.vols]:null));
  setSeqMode('pattern');
  showToast('Pattern "'+pat.name+'" loaded into editor');
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
        seqFullPhEls.forEach((c,i)=>c.classList.toggle('lit',i===st));
        seqLayers.forEach(layer=>{
          if(layer.steps[st]){
            const btn=layer.stepEls[st];
            btn&&(btn.classList.remove('flash'),void btn.offsetWidth,btn.classList.add('flash'));
            const fbtn=layer.fullStepEls[st];
            fbtn&&(fbtn.classList.remove('flash'),void fbtn.offsetWidth,fbtn.classList.add('flash'));
          }
        });
      });
      seqLayers.forEach(layer=>{
        if(layer.steps[st]&&!layer.muted){getCtx();playSound(layer.soundId,layer.vols[st]/100,_at);}
      });
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
        pat.layers.forEach(layer=>{
          if(layer.steps[as]&&!layer.muted){
            getCtx();const _av=(layer.vols&&layer.vols[as]!=null)?layer.vols[as]/100:1;playSound(layer.soundId,_av,_at);
          }
        });
      }
    }
    arrBarStep++;
    if(arrBarStep>=STEPS){
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
          pat.layers.forEach(layer=>{
            if(layer.steps[sst]&&!layer.muted){
              getCtx();const _sv=(layer.vols&&layer.vols[sst]!=null)?layer.vols[sst]/100:1;playSound(layer.soundId,_sv,_at);
            }
          });
        }
      }
      songArrBarStep++;
      if(songArrBarStep>=STEPS){
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
  seqPlaying=false;requestRender();seqStep=0;arrBar=0;arrBarStep=0;songSlotIdx=0;songArrBar=0;songArrBarStep=0;
  seqPhEls.forEach(c=>c.classList.remove('lit'));
  seqFullPhEls.forEach(c=>c.classList.remove('lit'));
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
document.getElementById('seqSavePatBtn')&&document.getElementById('seqSavePatBtn').addEventListener('click',()=>{
  savePatNameInput.value='Pattern '+(savedPatterns.length+1);
  savePatModal.style.display='flex';
});
document.getElementById('savePatConfirm')&&document.getElementById('savePatConfirm').addEventListener('click',()=>{
  const name=savePatNameInput.value.trim()||('Pattern '+(savedPatterns.length+1));
  savedPatterns.push({name,color:savePatColor,layers:seqLayers.map(l=>({soundId:l.soundId,steps:[...l.steps],vols:[...l.vols],muted:l.muted||false}))});
  savePatModal.style.display='none';
  buildPatLibrary();
  showToast('Pattern "'+name+'" saved!');
});

// ── Load pattern modal ──
(function(){
  const modal=document.getElementById('loadPatModal'),list=document.getElementById('loadPatList');
  if(!modal)return;
  const close=()=>{modal.style.display='none';};
  document.getElementById('seqLoadPatBtn').addEventListener('click',()=>{
    list.innerHTML='';
    if(!savedPatterns.length){
      const e=document.createElement('div');e.className='confirm-sub';e.style.fontSize='.85rem';e.textContent='No saved patterns yet — save one first';list.appendChild(e);
    }
    savedPatterns.forEach((pat,pi)=>{
      const b=document.createElement('button');b.className='confirm-btn no';
      b.style.color=pat.color;b.style.borderColor=pat.color;b.textContent=pat.name;
      b.addEventListener('click',()=>{loadPatternIntoEditor(pi);close();autoSave();});
      list.appendChild(b);
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
    sub.textContent=t==='all'?'Clear ALL tracks? This erases every step.':'Clear track '+(t+1)+'? This erases its steps.';
    pick.style.display='none';conf.style.display='block';
  }
  document.getElementById('seqClearBtn')&&document.getElementById('seqClearBtn').addEventListener('click',()=>{
    if(!seqLayers.length){showToast('No tracks to clear');return;}
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
    modal.style.display='flex';
  });
  document.getElementById('clearTrackAll').addEventListener('click',()=>ask('all'));
  document.getElementById('clearTrackCancel').addEventListener('click',close);
  document.getElementById('clearTrackNo').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  document.getElementById('clearTrackYes').addEventListener('click',()=>{
    const list=target==='all'?seqLayers:[seqLayers[target]];
    list.forEach(l=>{
      if(!l)return;
      for(let i=0;i<STEPS;i++){
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
  const rows=c.querySelectorAll('.seq-layer-row');
  const small=window.innerHeight<1000;
  if(rows.length<4||!small||c.offsetParent===null){
    if(c.classList.contains('seq-scroll')){c.classList.remove('seq-scroll');c.style.maxHeight='';}
    return;
  }
  const pitch=rows[1].offsetTop-rows[0].offsetTop;
  if(!pitch)return;
  c.classList.add('seq-scroll');
  c.style.maxHeight=Math.round(pitch*3.5)+'px';
}
new MutationObserver(fitSeqScroll).observe(seqLayersContainer,{childList:true});
addEventListener('resize',fitSeqScroll);
setInterval(fitSeqScroll,1000);
