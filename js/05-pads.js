
// ══════════════════════════════════════════════
//  PAD GRID
// ══════════════════════════════════════════════
const padGridEl=document.getElementById('padGrid');
const padEls=[];

// ── Edit Pads Mode ──
let padEditMode=false;
const padEditBtn=document.getElementById('padEditBtn');
padEditBtn&&padEditBtn.addEventListener('click',()=>togglePadEditMode());

const editModeBadge=document.getElementById('editModeBadge');
editModeBadge&&editModeBadge.addEventListener('click',()=>togglePadEditMode());
const padEditToggleBtn=document.getElementById('padEditToggleBtn');
padEditToggleBtn&&padEditToggleBtn.addEventListener('click',()=>togglePadEditMode());
function togglePadEditMode(){
  padEditMode=!padEditMode;
  if(padEditBtn){padEditBtn.classList.toggle('active',padEditMode);padEditBtn.textContent=padEditMode?'✓ DONE':'Edit Pads';}
  padEls.forEach(el=>el.classList.toggle('edit-mode',padEditMode));
  if(padEditToggleBtn){padEditToggleBtn.classList.toggle('active',padEditMode);padEditToggleBtn.textContent=padEditMode?'✓ DONE':'Edit Pads';}
  const sel=document.getElementById('padCountSelector');
  if(sel){sel.style.display=padEditMode?'flex':'none';}
  if(padEditMode)buildPadCountSelector();
  const rem=document.getElementById('editModeReminder');
  if(rem){
    rem.style.display=padEditMode?'flex':'none';
    if(padEditMode){
      const sel=document.getElementById('padCountSelector');
      if(sel){
        const r=sel.getBoundingClientRect();
        rem.style.alignItems='flex-start';
        rem.style.justifyContent='center';
        rem.style.paddingTop=(r.top-56)+'px';
      }
    }
  }
}

function exitPadEditMode(){
  if(!padEditMode)return;
  padEditMode=false;
  if(padEditBtn){padEditBtn.classList.remove('active');padEditBtn.textContent='Edit Pads';}
  if(padEditToggleBtn){padEditToggleBtn.classList.remove('active');padEditToggleBtn.textContent='Edit Pads';}
  padEls.forEach(el=>el.classList.remove('edit-mode'));
  const sel=document.getElementById('padCountSelector');
  if(sel)sel.style.display='none';
}

function buildPadCountSelector(){
  const sel=document.getElementById('padCountSelector');
  if(!sel)return;
  sel.innerHTML='';
  for(let i=1;i<=8;i++){
    const btn=document.createElement('button');
    btn.className='pad-count-btn'+(i===visiblePads?' active':'')+(i>drum.pads?' locked':'');
    btn.textContent=i;
    btn.disabled=i>drum.pads;
    if(i<=drum.pads){
      const n=i;
      btn.addEventListener('click',()=>{
        visiblePads=n;
        buildPadCountSelector();
        rebuildPadGrid();
        // re-enter edit mode after rebuild
        padEditMode=true;
        padEls.forEach(el=>el.classList.add('edit-mode'));
        if(padEditToggleBtn){padEditToggleBtn.classList.add('active');padEditToggleBtn.textContent='✓ DONE';}
      });
    }
    sel.appendChild(btn);
  }
}

function rebuildPadGrid(){
  padGridEl.innerHTML='';padEls.length=0;
  padEditMode=false;
  if(padEditBtn){padEditBtn.classList.remove('active');padEditBtn.textContent='Edit Pads';}  editModeBadge&&editModeBadge.classList.remove('show');
  const _showPads=Math.min(visiblePads,drum.pads);
  // Pad 2 (the kick) shows up as a dim "ghost" pad next to pad 1 until it's bought for 10 pts
  const _ghost=(drum.pads===1&&visiblePads>=1);
  padGridEl.setAttribute('data-pads',_showPads+(_ghost?1:0));
  for(let i=0;i<_showPads;i++){
    const sndId=padSounds[i];
    const snd=sndId?SOUND_MAP[sndId]:null;
    const col=snd?snd.color:'#553333';
    const el=document.createElement('div');
    el.className='pad'+(snd?'':' no-sound');
    el.style.setProperty('--pc',col);
    el.innerHTML=`<div class="pad-rip"></div><div class="pad-dot"></div>`+
      `<div class="pad-edit-hint">✏</div>`+
      `<div class="pad-name">${snd?snd.name:'NO SOUND'}</div><div class="pad-key" data-pad="${i}">${keyHintFor(i)}</div>`+
      `<div class="pad-sub">${snd?snd.tag:'tap to assign'}</div>`+
      (i===0?'<div class="pad-click-hint" id="padClickHint">CLICK FOR POINTS</div>':'');
    const idx=i;
    el.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(padEditMode){
        // In edit mode: always open picker regardless of whether sound assigned
        openPadPicker(idx);
      } else if(sndId){
        firePad(idx);
      } else {
        openPadPicker(idx);
      }
    });
    padEls.push(el);
    padGridEl.appendChild(el);
  }
  if(_ghost){
    const g=document.createElement('div');
    g.className='pad ghost-pad';g.id='ghostPad';
    g.style.setProperty('--pc','#ff7a50');
    g.innerHTML=`<div class="pad-name">KICK</div><div class="ghost-cost" id="ghostPadSub">${PAD_COSTS[1]} PTS</div>`;
    g.addEventListener('pointerdown',e=>{e.preventDefault();unlockGhostPad();});
    padGridEl.appendChild(g); // not added to padEls, so pad indexes stay correct
    updateGhostPad();
  }
}
function unlockGhostPad(){
  const cost=PAD_COSTS[1];
  if(drum.pads!==1)return;
  if(score<cost){showToast(`Need ${cost} points — keep tapping the hi-hat!`);return;}
  buyNextPad();
}
function updateGhostPad(){
  const g=document.getElementById('ghostPad');
  if(!g)return;
  g.classList.toggle('affordable',score>=PAD_COSTS[1]);
}

// ── Pad Assign Modal ──
let padAssignIdx=null;
let paFilter='all';
const padAssignModal=document.getElementById('padAssignModal');
const padAssignFiltersEl=document.getElementById('padAssignFilters');
const padAssignListEl=document.getElementById('padAssignList');
const padAssignClose=document.getElementById('padAssignClose');

// Filters are rebuilt dynamically when picker opens (see buildPaFilters)
function buildPaFilters(){
  padAssignFiltersEl.innerHTML='';
  const avail=unlockedSounds().map(id=>SOUND_MAP[id]).filter(Boolean);
  // ALL chip
  const allChip=document.createElement('div');allChip.className='pa-filter-chip'+(paFilter==='all'?' on':'');allChip.textContent='ALL';
  allChip.addEventListener('click',()=>setPaFilter('all'));padAssignFiltersEl.appendChild(allChip);
  // Tucana Core (original sounds)
  const hasTucana=avail.some(s=>!s.planet);
  if(hasTucana){const ch=document.createElement('div');ch.className='pa-filter-chip'+(paFilter==='tucana'?' on':'');ch.textContent='🌌 TUCANA';ch.dataset.tag='tucana';ch.addEventListener('click',()=>setPaFilter('tucana'));padAssignFiltersEl.appendChild(ch);}
  // Planet filters
  const planets=[...new Set(avail.filter(s=>s.planet).map(s=>s.planet))];
  planets.forEach(p=>{const ch=document.createElement('div');ch.className='pa-filter-chip'+(paFilter===p?' on':'');ch.style.borderColor='#44eebb44';ch.textContent='🪐 '+p.toUpperCase();ch.dataset.tag=p;ch.addEventListener('click',()=>setPaFilter(p));padAssignFiltersEl.appendChild(ch);});
  // Continent filters for current planet filter
  if(paFilter!=='all'&&paFilter!=='tucana'&&planets.includes(paFilter)){
    const conts=[...new Set(avail.filter(s=>s.planet===paFilter).map(s=>s.continent))];
    conts.forEach(c=>{const ch=document.createElement('div');ch.className='pa-filter-chip'+(paFilter===c?' on':'');ch.style.borderColor='#44eebb22';ch.textContent='  ↳ '+c.toUpperCase();ch.dataset.tag=c;ch.addEventListener('click',()=>setPaFilter(c));padAssignFiltersEl.appendChild(ch);});
  }
  // Original tag filters (drums, synth etc)
  const tags=[...new Set(avail.filter(s=>!s.planet).map(s=>s.tag))];
  tags.forEach(tag=>{const ch=document.createElement('div');ch.className='pa-filter-chip'+(paFilter===tag?' on':'');ch.textContent=tag.toUpperCase();ch.dataset.tag=tag;ch.addEventListener('click',()=>setPaFilter(tag));padAssignFiltersEl.appendChild(ch);});
}

function setPaFilter(tag){
  paFilter=tag;
  buildPaFilters();
  buildPaList();
}

function buildPaList(){
  padAssignListEl.innerHTML='';
  const avail=unlockedSounds().map(id=>SOUND_MAP[id]).filter(Boolean);
  const shown=paFilter==='all'?avail:
    paFilter==='tucana'?avail.filter(s=>!s.planet):
    avail.filter(s=>s.planet===paFilter||s.continent===paFilter||s.tag===paFilter);
  shown.forEach(snd=>{
    if(soundVols[snd.id]===undefined)soundVols[snd.id]=1;
    const currentSnd=padAssignIdx!==null?padSounds[padAssignIdx]:null;
    const item=document.createElement('div');item.className='pa-item'+(currentSnd===snd.id?' active':'');
    const dot=document.createElement('div');dot.className='pa-dot';dot.style.background=snd.color;
    const info=document.createElement('div');info.className='pa-info';
    const name=document.createElement('div');name.className='pa-name';name.style.color=snd.color;name.textContent=snd.name;
    const desc=document.createElement('div');desc.className='pa-desc';desc.textContent=snd.desc||snd.tag;
    info.appendChild(name);info.appendChild(desc);
    const volWrap=document.createElement('div');volWrap.className='pa-vol-wrap';
    const vol=document.createElement('input');vol.type='range';vol.className='pa-vol-slider';vol.min=0;vol.max=1;vol.step=.01;vol.value=soundVols[snd.id];
    const volNum=document.createElement('input');volNum.type='number';volNum.className='pa-vol-num';volNum.min=0;volNum.max=100;volNum.step=1;volNum.value=Math.round(soundVols[snd.id]*100);
    vol.addEventListener('input',e=>{e.stopPropagation();soundVols[snd.id]=parseFloat(vol.value);volNum.value=Math.round(parseFloat(vol.value)*100);});
    vol.addEventListener('pointerdown',e=>e.stopPropagation());
    volNum.addEventListener('change',e=>{e.stopPropagation();const v=Math.min(100,Math.max(0,parseInt(volNum.value)||0));volNum.value=v;soundVols[snd.id]=v/100;vol.value=v/100;});
    volNum.addEventListener('pointerdown',e=>e.stopPropagation());
    volNum.addEventListener('click',e=>e.stopPropagation());
    const preview=document.createElement('div');preview.className='pa-preview';preview.textContent='▶';
    preview.addEventListener('pointerdown',e=>{e.stopPropagation();getCtx();playSound(snd.id);});
    volWrap.appendChild(vol);volWrap.appendChild(volNum);volWrap.appendChild(preview);
    item.appendChild(dot);item.appendChild(info);item.appendChild(volWrap);
    item.addEventListener('pointerdown',e=>{
      if(e.target===preview||e.target===vol)return;
      getCtx();playSound(snd.id);
      if(padAssignIdx!==null){
        padSounds[padAssignIdx]=snd.id;
        const wasEdit=padEditMode;
        closePadAssignModal();
        rebuildPadGrid();
        if(wasEdit)togglePadEditMode();
      }
    });
    padAssignListEl.appendChild(item);
  });
}

function openPadPicker(padIdx){
  padAssignIdx=padIdx;
  const currentSnd=padSounds[padIdx];
  document.getElementById('padAssignTitle').textContent=currentSnd?`REASSIGN PAD ${padIdx+1}`:`ASSIGN SOUND TO PAD ${padIdx+1}`;
  setPaFilter('all');
  // Show keybind row on desktop only
  const row=document.getElementById('padKeybindRow');
  if(row){
    const isDesktop=document.body.classList.contains('desktop-mode');
    row.style.display=isDesktop?'flex':'none';
    if(isDesktop) updateKeybindDisplay(padIdx);
  }
  padAssignModal.classList.add('open');
  const _rem=document.getElementById('editModeReminder');
  if(_rem)_rem.style.visibility='hidden';
}
function closePadAssignModal(){
  padAssignModal.classList.remove('open');
  const _rem=document.getElementById('editModeReminder');
  if(_rem)_rem.style.visibility='';
  padAssignIdx=null;
}
padAssignClose&&padAssignClose.addEventListener('click',closePadAssignModal);
padAssignModal&&padAssignModal.addEventListener('pointerdown',e=>{if(e.target===padAssignModal)closePadAssignModal();});

// ── KEY / MOUSE BINDINGS FOR PADS (desktop only) ──
let padBindings = {}; // { padIdx: { key: 'KeyA', label: 'A' } or { mouse: 2, label: 'Mouse 3' } }
let bindingListenActive = false;
let bindingForPad = null;

function loadPadBindings(){
  let saved=null;
  try{ saved=localStorage.getItem('ab2_pad_bindings'); if(saved) padBindings=JSON.parse(saved); }catch(e){}
  // Defaults (all changeable): pads 1-8 = J F D K R E U I
  const DEFAULT_KEYS=['J','F','D','K','R','E','U','I'];
  const defaults={};DEFAULT_KEYS.forEach((k,i)=>defaults[i]={key:'Key'+k,label:k});
  const OLD3=JSON.stringify({0:{key:'KeyJ',label:'J'},1:{key:'KeyF',label:'F'},2:{key:'KeyD',label:'D'}});
  // First run, or still on the earlier 3-key defaults (never customised) -> use the full 8-key set
  if(!saved||JSON.stringify(padBindings)===OLD3){padBindings=defaults;}
}
function savePadBindings(){
  try{ localStorage.setItem('ab2_pad_bindings',JSON.stringify(padBindings)); }catch(e){}
}
loadPadBindings();

// Short on-pad display for a binding: letters as-is, special keys as their usual symbols
const KEY_SYMBOLS={Space:'␣',Enter:'↵',NumpadEnter:'↵',Tab:'⇥',Backspace:'⌫',Delete:'⌦',ShiftLeft:'⇧',ShiftRight:'⇧',ControlLeft:'⌃',ControlRight:'⌃',AltLeft:'⌥',AltRight:'⌥',MetaLeft:'⌘',MetaRight:'⌘',CapsLock:'⇪',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Escape:'⎋'};
const MOUSE_SYMBOLS={1:'MMB',2:'RMB',3:'M4',4:'M5'};
function keyHintFor(padIdx){
  const b=padBindings[padIdx];
  if(!b)return '';
  if(b.key)return KEY_SYMBOLS[b.key]||b.label||b.key.replace('Key','').replace('Digit','');
  if(b.mouse!==undefined)return MOUSE_SYMBOLS[b.mouse]||b.label;
  return b.label||'';
}
function refreshPadKeyHints(){
  document.querySelectorAll('.pad .pad-key[data-pad]').forEach(el=>{
    const t=keyHintFor(+el.dataset.pad);
    el.textContent=t;el.style.display=t?'':'none';
  });
}

function updateKeybindDisplay(padIdx){
  const row=document.getElementById('padKeybindRow');
  const disp=document.getElementById('padKeybindDisplay');
  if(!row||!disp) return;
  const b=padBindings[padIdx];
  if(b){ disp.textContent=b.label; disp.style.color='#00ff88'; disp.style.borderColor='#1a3a2a'; }
  else { disp.textContent='CLICK TO BIND'; disp.style.color='#a0a8ff'; disp.style.borderColor='#2a2a4a'; }
}

function startBindingListen(padIdx){
  const disp=document.getElementById('padKeybindDisplay');
  if(!disp) return;
  bindingListenActive=true;
  bindingForPad=padIdx;
  disp.textContent='PRESS ANY KEY OR MOUSE BUTTON…';
  disp.style.color='#e8ff00';
  disp.style.borderColor='#e8ff00';
  // Listen for key
  const onKey=(e)=>{
    e.preventDefault();e.stopPropagation();
    if(e.code==='Escape'){cancelBinding();return;}
    const label=e.key.length===1?e.key.toUpperCase():e.code.replace('Key','').replace('Digit','');
    padBindings[padIdx]={key:e.code,label};
    savePadBindings();
    finishBinding(padIdx);
    window.removeEventListener('keydown',onKey,true);
    window.removeEventListener('mousedown',onMouse,true);
  };
  // Listen for mouse button (1=middle, 2=right, 3=back, 4=forward)
  const onMouse=(e)=>{
    if(e.button===0) return; // ignore left click (used for UI)
    e.preventDefault();e.stopPropagation();
    const labels={1:'Middle Click',2:'Right Click',3:'Mouse Back',4:'Mouse Fwd'};
    const label=labels[e.button]||`Mouse ${e.button+1}`;
    padBindings[padIdx]={mouse:e.button,label};
    savePadBindings();
    finishBinding(padIdx);
    window.removeEventListener('keydown',onKey,true);
    window.removeEventListener('mousedown',onMouse,true);
  };
  window.addEventListener('keydown',onKey,true);
  window.addEventListener('mousedown',onMouse,true);
}

function cancelBinding(){
  bindingListenActive=false;
  if(bindingForPad!==null) updateKeybindDisplay(bindingForPad);
  bindingForPad=null;
}

function finishBinding(padIdx){
  bindingListenActive=false;
  bindingForPad=null;
  try{refreshPadKeyHints();}catch(e){}
  updateKeybindDisplay(padIdx);
}

document.getElementById('padKeybindDisplay')&&document.getElementById('padKeybindDisplay').addEventListener('click',e=>{
  e.stopPropagation();
  if(padAssignIdx!==null) startBindingListen(padAssignIdx);
});
document.getElementById('padKeybindClear')&&document.getElementById('padKeybindClear').addEventListener('click',e=>{
  e.stopPropagation();
  if(padAssignIdx!==null){
    delete padBindings[padAssignIdx];
    savePadBindings();
    try{refreshPadKeyHints();}catch(e){}
    updateKeybindDisplay(padAssignIdx);
  }
});



// Global keydown handler to fire pads via bound keys — ignore held-down repeats
window.addEventListener('keydown',e=>{
  if(e.repeat) return; // block turbo from holding key
  if(bindingListenActive) return;
  if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if(!document.body.classList.contains('game-active')) return;
  Object.entries(padBindings).forEach(([idx,b])=>{
    if(b.key&&e.code===b.key){
      e.preventDefault();
      firePad(parseInt(idx));
    }
  });
},false);

// Global mousedown handler for mouse button bindings
window.addEventListener('mousedown',e=>{
  if(bindingListenActive) return;
  if(e.button===0) return;
  if(!document.body.classList.contains('game-active')) return;
  if(padAssignModal&&padAssignModal.classList.contains('open')) return;
  Object.entries(padBindings).forEach(([idx,b])=>{
    if(b.mouse!==undefined&&e.button===b.mouse){
      e.preventDefault();
      firePad(parseInt(idx));
    }
  });
},false);

function firePad(idx){
  const sndId=padSounds[idx];if(!sndId)return;
  getCtx();playSound(sndId);
  const el=padEls[idx];
  el.classList.remove('lit');void el.offsetWidth;el.classList.add('lit');
  setTimeout(()=>el.classList.remove('lit'),130);
  // Use the pad element's position so particles spawn from the pad
  const _padEl=padEls[idx];
  const _padPos=_padEl?_padEl.getBoundingClientRect():null;
  const _px=_padPos?_padPos.left+_padPos.width/2:window.innerWidth/2;
  const _py=_padPos?_padPos.top+_padPos.height/2:window.innerHeight/2;
  doTap({x:_px,y:_py});
}
