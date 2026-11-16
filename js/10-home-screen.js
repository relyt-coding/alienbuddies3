
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
  const _lb=document.getElementById('legacyBox');if(_lb)_lb.style.display=hasLegacySaves()?'flex':'none';
  for(let i=0;i<3;i++){
    const data=readSlot(i);const sum=slotSummary(data);
    const card=document.createElement('div');card.className='slot-card '+(sum?'has-save':'empty-save');
    const icon=document.createElement('div');icon.className='slot-icon';if(sum)icon.style.display='none';else icon.textContent='🌑';
    const info=document.createElement('div');info.className='slot-info';
    const slotLabel=getSlotName(i)||(sum?`SLOT ${i+1}`:`SLOT ${i+1} — EMPTY`);
    const nameWrap=document.createElement('div');nameWrap.style.cssText='display:flex;align-items:center;gap:.4rem;';
    const name=document.createElement('div');name.className='slot-name'+(sum?'':' empty');name.textContent=slotLabel;
    const editBtn=document.createElement('button');
    editBtn.textContent='\u270F\uFE0E';editBtn.title='Rename slot';editBtn.className='slot-edit-btn'+(sum?' big':'');   // black & white pencil (text style, not the yellow emoji)
    editBtn.addEventListener('click',e=>{e.stopPropagation();promptSlotRename(i,name);});
    editBtn.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();promptSlotRename(i,name);});
    nameWrap.appendChild(name);if(!sum)nameWrap.appendChild(editBtn);   // saved files: the pencil sits by the ✕ instead
    const detail=document.createElement('div');detail.style.cssText='display:flex;flex-direction:column;gap:.1rem;margin-top:.25rem;';
    if(sum){
      const aliensLine=document.createElement('div');aliensLine.className='slot-detail';
      aliensLine.textContent=`${fmtW(sum.score)}  ·  ${sum.aliens} alien${sum.aliens!==1?'s':''}`;
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
      actions.appendChild(editBtn);actions.appendChild(del);card.appendChild(actions);
    }
    slotsContainer.appendChild(card);
  }
}
function promptSlotRename(slotIdx, nameEl){
  const current=getSlotName(slotIdx);
  const input=document.createElement('input');
  input.type='text';input.maxLength=20;input.value=current;
  input.autocomplete='off';input.spellcheck=false;
  input.style.cssText="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.1em;background:#0a1a0f;border:1px solid #00ff88;border-radius:6px;color:#00ff88;padding:.2rem .5rem;width:100%;outline:none;box-sizing:border-box;";
  const orig=nameEl.textContent;
  nameEl.textContent='';
  nameEl.appendChild(input);
  input.focus();input.select();
  let cancelled=false,done=false;
  function commit(){
    if(cancelled||done)return;done=true;
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
  input.addEventListener('keydown',e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape'){cancelled=true;nameEl.textContent=orig;input.remove();}});
}

// In-game: tap the file name / "SLOT X" under the title to rename the current file without going back to the save screen
(function(){
  const st=document.getElementById('slotSubtitle');if(!st)return;
  st.classList.add('renamable');st.title='Tap to rename this file';
  st.addEventListener('click',e=>{
    if(st.querySelector('input')||activeSlot<0)return;
    e.stopPropagation();
    promptSlotRename(activeSlot,st);
    const inp=st.querySelector('input');if(inp){inp.style.width='11rem';inp.style.textAlign='center';inp.style.fontSize='1.05rem';}
  });
})();

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
  if(isNewFile&&trackersHidden){trackersHidden=false;_saveViewPrefs();applySeqView();} // new files always start with the TRACKERS view on
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
  applyAmbienceLock();
  // Restore the background hum setting. v0.2.174: once you have the sequencer the hum is off (switched off once,
  // automatically; saves from the groove days that never got that get it now). Settings can turn it back on.
  {let on=data.musicOn!==false;
    if(drum.seqTracks>=1&&!data.seqHasAutoMutedAmbience){on=false;seqHasAutoMutedAmbience=true;}
    musicOn=on;
    ['bgMusicToggle','settingsBgMusic'].forEach(id=>{const t=document.getElementById(id);if(t)t.checked=on;});
    if(ambGain&&audioCtx){const now=audioCtx.currentTime;ambGain.gain.cancelScheduledValues(now);ambGain.gain.setValueAtTime(on?AMB_LEVEL:0,now);}
    if(typeof grooveRefresh==='function')grooveRefresh();}
  updateSoundboardUnlocked();
  updateBouncerToggleVisibility();
  // Show new game hint
  // v0.2.157: EVERY time a file opens, the pages form (js/65 picks: just the drum pads before the first buddy, else
  // bunker + drum pads + shop). A brand new file then gets the hi-hat hint.
  let introOn=false;
  {const isMobile=!document.body.classList.contains('desktop-mode');
    const verb=isMobile?'Press':'Click';
    const hint=isNewFile?()=>showToast(verb+' the Hi-Hat button to make watts!'):()=>{};
    if(typeof playNewFileIntro==='function'&&!window.__noIntro&&!document.body.classList.contains('mobile-view-mode'))introOn=()=>{if(!playNewFileIntro({tuck:true,onDone:()=>setTimeout(hint,250)}))setTimeout(hint,500);};
    else if(isNewFile)setTimeout(hint,800);
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
  if(introOn)introOn();
}

function goToHomeScreen(){
  _adaptiveFPSActive=false;
  adaptiveBouncerCap=BOUNCER_CAP_MAX; // reset cap for next session
  // Stop all running intervals
  seqClockStop();seqPlaying=false;_seqHidePaused=false;
  // Clear all bouncers from the DOM
  bouncers.forEach(b=>b.el.remove());
  bouncers.length=0;bouncerPicks=null;
  // Return to slot select screen
  gameScreen.style.display='none';
  homeScreen.style.display='';
  homeScreen.classList.remove('hidden');
  document.body.classList.add('home-visible');
  document.body.classList.remove('game-active','seq-on');
  updateFullscreenBtnVisibility();
  buildHomeScreen();
  autoSave();
  checkForUpdate();
}
buildHomeScreen();

// ── Newer version? A phone can keep a tab open for days, still running the version it first loaded (that's how a
//    new file can miss a brand-new feature). Whenever the title screen is up (nothing to lose there: the game is
//    saved), check for a newer deploy and quietly reload into it. ──
let _verCheckAt=0;
function _verNewer(a,b){const A=a.split('.').map(Number),B=b.split('.').map(Number);for(let i=0;i<Math.max(A.length,B.length);i++){const x=A[i]||0,y=B[i]||0;if(x!==y)return x>y;}return false;}
function checkForUpdate(){
  try{
    if(document.body.classList.contains('game-active')||location.protocol==='file:'||typeof fetch!=='function')return;
    const now=Date.now();if(now-_verCheckAt<15000)return;_verCheckAt=now;
    fetch('js/01-constants.js?v='+now,{cache:'no-store'}).then(r=>r.ok?r.text():'').then(t=>{
      const m=/GAME_VERSION\s*=\s*'([\d.]+)'/.exec(t||'');if(!m||!_verNewer(m[1],GAME_VERSION))return;
      // still on the title screen, not typing a file name, and not already reloaded for this version
      const ae=document.activeElement;
      if(document.body.classList.contains('game-active')||(ae&&/INPUT|TEXTAREA/.test(ae.tagName)))return;
      try{if(sessionStorage.getItem('ab2_reloadedFor')===m[1])return;sessionStorage.setItem('ab2_reloadedFor',m[1]);}catch(e){}
      location.reload();
    }).catch(()=>{});
  }catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForUpdate();});
window.addEventListener('pageshow',e=>{if(e.persisted)checkForUpdate();});
setTimeout(checkForUpdate,1500);
