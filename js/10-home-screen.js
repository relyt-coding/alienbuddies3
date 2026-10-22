
// ══════════════════════════════════════════════
//  HOME SCREEN
// ══════════════════════════════════════════════
const homeScreen=document.getElementById('homeScreen');
const gameScreen=document.getElementById('gameScreen');
const slotsContainer=document.getElementById('slotsContainer');
const deleteConfirm=document.getElementById('deleteConfirm');
let pendingDeleteSlot=-1;

function hasLegacySaves(){try{return LEGACY_SAVE_KEYS.some(k=>{const d=localStorage.getItem(k);return d&&d.length>2;});}catch(e){return false;}}
function buildHomeScreen(){
  slotsContainer.innerHTML='';
  const _lb=document.getElementById('legacyBox');if(_lb)_lb.style.display=hasLegacySaves()?'block':'none';
  for(let i=0;i<3;i++){
    const data=readSlot(i);const sum=slotSummary(data);
    const card=document.createElement('div');card.className='slot-card '+(sum?'has-save':'empty-save');
    const icon=document.createElement('div');icon.className='slot-icon';icon.textContent=sum?'👽':'🌑';
    const info=document.createElement('div');info.className='slot-info';
    const slotLabel=getSlotName(i)||(sum?`SLOT ${i+1}`:`SLOT ${i+1} — EMPTY`);
    const nameWrap=document.createElement('div');nameWrap.style.cssText='display:flex;align-items:center;gap:.4rem;';
    const name=document.createElement('div');name.className='slot-name'+(sum?'':' empty');name.textContent=slotLabel;
    const editBtn=document.createElement('button');
    editBtn.textContent='✏';editBtn.title='Rename slot';
    editBtn.style.cssText="font-size:.65rem;padding:.1rem .28rem;border-radius:4px;border:1px solid #2a2a2a;background:transparent;color:#444;cursor:pointer;touch-action:manipulation;line-height:1;flex-shrink:0;";
    editBtn.addEventListener('click',e=>{e.stopPropagation();promptSlotRename(i,name);});
    editBtn.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();promptSlotRename(i,name);});
    nameWrap.appendChild(name);nameWrap.appendChild(editBtn);
    const detail=document.createElement('div');detail.style.cssText='display:flex;flex-direction:column;gap:.1rem;margin-top:.25rem;';
    if(sum){
      const aliensLine=document.createElement('div');aliensLine.className='slot-detail';
      aliensLine.textContent=`${formatNum(sum.score)} pts  ·  ${sum.aliens} alien${sum.aliens!==1?'s':''}`;
      const dateLine=document.createElement('div');dateLine.className='slot-detail';
      dateLine.style.color='#446655';dateLine.textContent=`Last played: ${sum.date}`;
      detail.appendChild(aliensLine);detail.appendChild(dateLine);
    } else {
      const emptyLine=document.createElement('div');emptyLine.className='slot-detail empty';
      emptyLine.textContent='press to start a new game';detail.appendChild(emptyLine);
    }
    info.appendChild(nameWrap);info.appendChild(detail);
    const mainArea=document.createElement('div');mainArea.style.cssText='display:flex;align-items:center;gap:.9rem;flex:1;min-width:0;';
    mainArea.appendChild(icon);mainArea.appendChild(info);
    mainArea.addEventListener('click',()=>startGame(i));
    card.appendChild(mainArea);
    if(sum){
      const actions=document.createElement('div');actions.className='slot-actions';
      const del=document.createElement('button');del.className='slot-del-btn';del.textContent='✕';
      del.addEventListener('click',e=>{e.stopPropagation();confirmDelete(i);});
      del.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();confirmDelete(i);});
      actions.appendChild(del);card.appendChild(actions);
    }
    slotsContainer.appendChild(card);
  }
}
function promptSlotRename(slotIdx, nameEl){
  const current=getSlotName(slotIdx);
  const input=document.createElement('input');
  input.type='text';input.maxLength=20;input.value=current;
  input.autocomplete='off';input.spellcheck=false;
  input.style.cssText="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:.1em;background:#0a1a0f;border:1px solid #00ff88;border-radius:6px;color:#00ff88;padding:.2rem .5rem;width:100%;outline:none;box-sizing:border-box;";
  const orig=nameEl.textContent;
  nameEl.textContent='';
  nameEl.appendChild(input);
  input.focus();input.select();
  function commit(){
    const val=input.value.trim();
    setSlotName(slotIdx,val);
    const fallback=readSlot(slotIdx)?`SLOT ${slotIdx+1}`:`SLOT ${slotIdx+1} — EMPTY`;
    nameEl.textContent=val||fallback;
    // Update game subtitle if this slot is active
    if(activeSlot===slotIdx){
      document.getElementById('slotSubtitle').textContent=val||`SLOT ${slotIdx+1}`;
    }
  }
  input.addEventListener('blur',commit);
  input.addEventListener('keydown',e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape'){nameEl.textContent=orig;input.remove();}});
}

function confirmDelete(i){pendingDeleteSlot=i;document.getElementById('confirmSubText').textContent=`Delete Slot ${i+1}? Cannot be undone.`;deleteConfirm.classList.add('show');}
document.getElementById('confirmYes').addEventListener('click',()=>{if(pendingDeleteSlot>=0){deleteSlot(pendingDeleteSlot);pendingDeleteSlot=-1;}deleteConfirm.classList.remove('show');document.body.classList.add('home-visible');
buildHomeScreen();});
document.getElementById('confirmNo').addEventListener('click',()=>{pendingDeleteSlot=-1;deleteConfirm.classList.remove('show');});

function startGame(slotIndex){
  activeSlot=slotIndex;
  // Set desktop-mode BEFORE loadFromSave so rebuildPadGrid sees it
  document.body.classList.toggle('desktop-mode', IS_DESKTOP);
  const existingData=readSlot(slotIndex);
  const isNewFile=!existingData;
  const data=existingData||defaultSave();
  loadFromSave(data);
  const sn=getSlotName(slotIndex);
  document.getElementById('slotSubtitle').textContent=sn||`SLOT ${slotIndex+1}`;
  homeScreen.classList.add('hidden');gameScreen.style.display='';
  setTimeout(()=>homeScreen.style.display='none',450);
  document.body.classList.remove('home-visible');
  document.body.classList.add('game-active');
  // Now apply full desktop layout (sidebars, collapse buttons) after game-active is set
  if(IS_DESKTOP) applyDesktopMode();
  _adaptiveFPSActive=true;
  updateFullscreenBtnVisibility();
  buildBunkerGrid();buildIncubatorGrid();updateIncubatorVisibility();renderUI();
  registerPlanetSounds();
  startGemInterval();
  if(!ambStarted)startAmbience();
  // Restore BG music preference
  if(data.musicOn===false){
    musicOn=false;
    const bgToggle=document.getElementById('bgMusicToggle');
    const sbToggle=document.getElementById('settingsBgMusic');
    if(bgToggle)bgToggle.checked=false;
    if(sbToggle)sbToggle.checked=false;
    if(ambGain){
      const now=audioCtx.currentTime;
      ambGain.gain.cancelScheduledValues(now);
      ambGain.gain.setValueAtTime(0,now);
    }
  }
  updateSoundboardUnlocked();
  updateBouncerToggleVisibility();
  // Show new game hint
  if(isNewFile){
    const isMobile=!document.body.classList.contains('desktop-mode');
    const verb=isMobile?'Press':'Click';
    setTimeout(()=>showToast(verb+' the Hi-Hat button to gain points!'),800);
  }
  // start sequencer if tracks exist
  if(drum.seqTracks>0&&!seqPlaying)startSeq();
  // On desktop, collapse both sidebars by default on new game entry
  if(document.body.classList.contains('desktop-mode')){
    const sv=document.getElementById('storeView');
    const bv=document.getElementById('bunkerView');
    if(sv){sv.classList.add('sidebar-collapsed');updateCollapseBtn('shop',true);}
    if(bv){bv.classList.add('sidebar-collapsed');updateCollapseBtn('bunker',true);}
    renderStore();
    // Delay bunker render slightly to ensure buildBunkerGrid() DOM is ready
    setTimeout(()=>{renderBunkerView();repositionCollapseButtons();},60);
  }
}

function goToHomeScreen(){
  _adaptiveFPSActive=false;
  adaptiveBouncerCap=BOUNCER_CAP_MAX; // reset cap for next session
  // Stop all running intervals
  seqClockStop();seqPlaying=false;_seqHidePaused=false;
  // Clear all bouncers from the DOM
  bouncers.forEach(b=>b.el.remove());
  bouncers.length=0;
  // Return to slot select screen
  gameScreen.style.display='none';
  homeScreen.style.display='';
  homeScreen.classList.remove('hidden');
  document.body.classList.add('home-visible');
  document.body.classList.remove('game-active','seq-on');
  updateFullscreenBtnVisibility();
  buildHomeScreen();
  autoSave();
}
buildHomeScreen();
