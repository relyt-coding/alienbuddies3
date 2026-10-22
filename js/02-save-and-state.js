
// ══════════════════════════════════════════════
//  SAVE / LOAD
// ══════════════════════════════════════════════
const SAVE_KEYS=['ab2_slot0','ab2_slot1','ab2_slot2']; // 0.2 uses fresh keys; 0.1 saves live under ab_slot0..2
const LEGACY_SAVE_KEYS=['ab_slot0','ab_slot1','ab_slot2'];
let activeSlot=-1;

function defaultSave(){
  return{
    score:0,tiers:[],
    shop:{seqMultLevel:-1,multLevel:-1,alienBoostLevel:-1,multiClickLevel:-1,alienBoostUnlocked:false,multiClickUnlocked:false},
    totalAliens:0,
    drum:{pads:1,extraSounds:0,seqTracks:0},
    ts:Date.now()
  };
}
function readSlot(i){try{const d=localStorage.getItem(SAVE_KEYS[i]);return d?JSON.parse(d):null;}catch(e){return null;}}
function writeSlot(i,data){try{localStorage.setItem(SAVE_KEYS[i],JSON.stringify({...data,ts:Date.now()}));}catch(e){}}
function getSlotName(i){try{return localStorage.getItem('ab2_slot_name_'+i)||'';}catch(e){return'';}}
function setSlotName(i,name){try{localStorage.setItem('ab2_slot_name_'+i,name);}catch(e){}}
function deleteSlot(i){try{localStorage.removeItem(SAVE_KEYS[i]);localStorage.removeItem('ab2_slot_name_'+i);}catch(e){}}
function slotSummary(data){
  if(!data)return null;
  const d=new Date(data.ts);
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h=d.getHours(),ampm=h>=12?'PM':'AM',h12=h%12||12;
  const dateStr=`${months[d.getMonth()]} ${d.getDate()}, ${h12}:${String(d.getMinutes()).padStart(2,'0')} ${ampm}`;
  return{score:data.score||0,aliens:data.totalAliens||0,date:dateStr};
}
function autoSave(){
  if(activeSlot<0)return;
  // Snapshot current sequencer layers (steps only, no DOM refs)
  const seqLayersSnap=seqLayers.map(l=>({soundId:l.soundId,steps:[...l.steps],vols:[...l.vols],muted:l.muted}));
  writeSlot(activeSlot,{
    score,tiers,autoTiers,
    shop:{seqMultLevel:shop.seqMultLevel,multLevel:shop.multLevel,alienBoostLevel:shop.alienBoostLevel,multiClickLevel:shop.multiClickLevel,alienBoostUnlocked:shop.alienBoostUnlocked,multiClickUnlocked:shop.multiClickUnlocked},
    totalAliens,alienData,
    drum:{pads:drum.pads,extraSounds:drum.extraSounds,seqTracks:drum.seqTracks},
    matchLevelsCompleted,matchingMultiplier,matchSavedState,tipsOwned,tipsMult,drumTrackerActive,shopOpenCount,hasSeenSeqHint,
    savedPatterns,savedArrangements,songSlots,
    padSounds:[...padSounds],
    soundVols:{...soundVols},
    visiblePads,
    seqBpm,
    seqMode,
    arrangement:[...arrangement],
    arrangeBars,
    seqLayersSnap,
    seqHasAutoMutedAmbience,
    musicOn,
    shownHints,
    hasReceivedEgg,
    alienGems,
    skillTreeUnlocked,
    unlockedSkills
  });
}

// ══════════════════════════════════════════════
//  GAME STATE
// ══════════════════════════════════════════════
let score=0,tiers=[],autoTiers=[];
// multLevel = DRUMPAD ×4 dots (-1 / 0), seqMultLevel = SEQUENCER ×4 dots (-1 / 0)
const shop={seqMultLevel:-1,multLevel:-1,alienBoostLevel:-1,multiClickLevel:-1,alienBoostUnlocked:false,multiClickUnlocked:false};
let totalAliens=0,viewingBunker=0;
let matchingLevel=0; // highest level unlocked (0=none, 1=level1 available, etc)
let matchingMultiplier=1; // permanent multiplier from wins
let matchLevelsCompleted=-1; // -1 = level 0 not yet seen
let tipsOwned=0; // number of tips purchased
let tipsMult=1; // permanent ×1.5 per tip
let drumTrackerActive=false; // paid 25pts to activate drum dot tracker
let shopOpenCount=0;
let hasSeenSeqHint=false;
let shownHints={tips:false,matchingIntro:false,matchingGame:false};
let hasReceivedEgg=false;  // true once player claims their first egg
let hasShownEggReward=false; // prevent showing reward multiple times
let partyMode=false;

// Drum state
const drum={pads:1,extraSounds:0,seqTracks:0};
let visiblePads=1; // how many pads shown (can be <= drum.pads)
// padSounds[i] = soundId or null
let padSounds=['hihat',null,null,null,null];

// Volume state
let masterVol=1;
const soundVols={}; // soundId -> 0-1

function color(i){return COLORS[i%COLORS.length];}
// Custom tier multiplier progression: ×3, ×9, ×18, ×27, ×36, ×42, ×51, ×60
const TIER_MULT_BASE=[3,9,18,27,36,42,51,60];
// Dot-row multipliers scale with the owned level: level -1 = ×3 pattern, level 0 = ×4, 1 = ×5 ... up to ×10.
// Pattern per row = base × [1,3,6,9,12,14,17,20] (so ×4 gives 4,12,24,36,48,56,68,80).
const TIER_MULT_UNITS=[1,3,6,9,12,14,17,20];
function dotBase(level){return level<0?3:4+level;}
function tierMultValueFor(kind,i){
  const lvl=kind==='seq'?shop.seqMultLevel:shop.multLevel;
  const u=TIER_MULT_UNITS[i]||TIER_MULT_UNITS[TIER_MULT_UNITS.length-1];
  return dotBase(lvl)*u;
}
function tierMultValue(i){return tierMultValueFor('drum',i);}
function alienMultiplier(){const perAlien=1.1+(shop.alienBoostLevel>=0?(shop.alienBoostLevel+1)*0.3:0);return totalAliens>0?Math.pow(perAlien,totalAliens):1;}
function clicksPerTap(){return shop.multiClickLevel>=0?shop.multiClickLevel+2:1;}
function drumMultiplier(){
  // Each unlocked extra pad (beyond 1), each extra sound, each seq track = ×1.5
  const extraPads=Math.max(0,drum.pads-1);
  const total=extraPads+drum.extraSounds+drum.seqTracks;
  return total>0?Math.pow(1.2,total):1;
}
// Shared boosts (aliens, drum upgrades, matching game, tips, skill tree) apply to BOTH earning sources.
function sharedMultiplier(){
  let _skillMult=1;
  if(typeof SKILL_TREE_NODES!=='undefined'&&typeof unlockedSkills!=='undefined'){
    SKILL_TREE_NODES.forEach(n=>{if(n.mult&&n.mult>0&&unlockedSkills[n.id])_skillMult*=n.mult;});
  }
  return alienMultiplier()*drumMultiplier()*matchingMultiplier*tipsMult*_skillMult;
}
// Each tracker keeps its own tier multipliers: DRUMPAD (left) for pad taps, SEQUENCER (right) for sequencer steps.
function drumTierProduct(){return tiers.reduce((m,t,i)=>t.multiplierActive?m*tierMultValueFor('drum',i):m,1);}
function seqTierProduct(){return autoTiers.reduce((m,t,i)=>t.multiplierActive?m*tierMultValueFor('seq',i):m,1);}
function totalMultiplier(){return drumTierProduct()*sharedMultiplier();} // value of one pad tap
function seqStepMultiplier(){
  const qs=(typeof unlockedSkills!=='undefined'&&unlockedSkills&&unlockedSkills['quantum_strike'])?1.5:1; // Quantum Strike: sequencer steps +50%
  return seqTierProduct()*sharedMultiplier()*qs;
}
function highestActive(){let h=-1;tiers.forEach((t,i)=>{if(t.multiplierActive)h=i;});return h;}
function highestActiveSeq(){let h=-1;autoTiers.forEach((t,i)=>{if(t.multiplierActive)h=i;});return h;}
function updateSeqTrackerVisibility(){
  const col=document.getElementById('autoTiersCol'),dv=document.getElementById('tiersDivider');
  if(!col||!dv)return;
  const on=drum.seqTracks>=1;
  document.body.classList.toggle('seq-on',on);
  if(on){ensureAutoTiers(1);if(col.style.display!=='')col.style.display='';if(dv.style.display!=='')dv.style.display='';}
  else{col.style.display='none';dv.style.display='none';}
}
function refreshTierBadges(){
  tiers.forEach((_,i)=>{const r=document.getElementById(`tier-${i}`);const b=r&&r.querySelector('.tier-mult');if(b)b.textContent=`x${tierMultValueFor('drum',i).toLocaleString()}`;});
  autoTiers.forEach((_,i)=>{const r=document.getElementById(`auto-tier-${i}`);const b=r&&r.querySelector('.tier-mult');if(b)b.textContent=`x${tierMultValueFor('seq',i).toLocaleString()}`;});
}

// All unlocked sounds (starts with 3 default pads worth)
function unlockedSounds(){
  // Base sounds gated by how many pads you own (1=hihat, 2=kick, 3=snare)
  const base=['hihat','kick','snare'].slice(0,drum.pads);
  const extras=EXTRA_SOUNDS_ORDER.slice(0,drum.extraSounds);
  // Planet sounds unlocked via skill tree
  const planetSounds=(typeof PLANET_SOUND_DEFS!=='undefined')
    ?PLANET_SOUND_DEFS.filter(ps=>SOUND_MAP[ps.id]&&!SOUND_MAP[ps.id].locked).map(ps=>ps.id)
    :[];
  return [...base,...extras,...planetSounds];
}

function loadFromSave(data){
  score=data.score||0;
  shop.seqMultLevel=data.shop?.seqMultLevel??-1;
  shop.multLevel=data.shop?.multLevel??-1;
  shop.alienBoostLevel=data.shop?.alienBoostLevel??-1;
  shop.multiClickLevel=data.shop?.multiClickLevel??-1;
  shop.alienBoostUnlocked=data.shop?.alienBoostUnlocked??false;
  shop.multiClickUnlocked=data.shop?.multiClickUnlocked??false;
  totalAliens=data.totalAliens||0;
  matchLevelsCompleted=data.matchLevelsCompleted!==undefined?data.matchLevelsCompleted:-1;
  // Restore shownHints and auto-mark matching hints if already played
  if(data.shownHints)Object.assign(shownHints,data.shownHints);
  if(data.hasReceivedEgg)hasReceivedEgg=data.hasReceivedEgg;
  if(data.alienGems)alienGems=data.alienGems;
  if(data.skillTreeUnlocked)skillTreeUnlocked=data.skillTreeUnlocked;
  if(data.unlockedSkills)unlockedSkills=Object.assign({},data.unlockedSkills);
  if(matchLevelsCompleted>=0){shownHints.matchingIntro=true;shownHints.matchingGame=true;}
  matchingMultiplier=data.matchingMultiplier||1;
  matchSavedState=data.matchSavedState||null;
  tipsOwned=data.tipsOwned||0;
  tipsMult=data.tipsMult||1;
  drumTrackerActive=data.drumTrackerActive||false;
  shopOpenCount=data.shopOpenCount||0;
  hasSeenSeqHint=data.hasSeenSeqHint||false;
  setTimeout(()=>{updateTipsLabel();updateDrumTrackerOverlay();},0);
  drum.pads=data.drum?.pads||1;
  visiblePads=drum.pads;
  drum.extraSounds=data.drum?.extraSounds||0;
  drum.seqTracks=data.drum?.seqTracks||0;
  savedPatterns=data.savedPatterns||[];
  savedArrangements=data.savedArrangements||[];
  songSlots=data.songSlots||[];
  tiers=[];tiersContainer.innerHTML='';
  autoTiers=[];autoTiersContainer.innerHTML='';
  document.getElementById('autoTiersCol').style.display='none';
  document.getElementById('tiersDivider').style.display='none';
  bouncers.forEach(b=>b.el.remove());bouncers.length=0;
  if(data.tiers&&data.tiers.length){
    data.tiers.forEach((_,i)=>ensureTiers(i+1));
    data.tiers.forEach((t,i)=>{tiers[i].litDots=t.litDots||0;tiers[i].multiplierActive=t.multiplierActive||false;});
  }else{ensureTiers(1);}
  if(data.autoTiers&&data.autoTiers.length){
    data.autoTiers.forEach((_,i)=>ensureAutoTiers(i+1));
    data.autoTiers.forEach((t,i)=>{autoTiers[i].litDots=t.litDots||0;autoTiers[i].multiplierActive=t.multiplierActive||false;});
    document.getElementById('autoTiersCol').style.display='';
    document.getElementById('tiersDivider').style.display='';
  }
    alienData=data.alienData||[];
// Fill missing entries
for(let i=alienData.length;i<totalAliens;i++)alienData.push({name:'',color:getAlienColor(i)});
for(let i=0;i<totalAliens;i++)spawnBouncer(false);
// Ensure names display correctly after load
if(typeof applyBouncerNameVisibility==='function')applyBouncerNameVisibility();
updateMatchingBtn();
  _seqDotAccum=0;updateSeqTrackerVisibility();refreshTierBadges();
  // Restore pad sounds
  // Restore pad sounds (use saved if available, else defaults)
  if(data.padSounds&&data.padSounds.length){
    padSounds=[...data.padSounds];
    // Ensure array is long enough
    while(padSounds.length<8)padSounds.push(null);
  }else{
    padSounds=[];
    for(let i=0;i<8;i++){const def=PAD_DEFAULT_SOUNDS[i];padSounds.push(i<drum.pads?def:null);}
  }
  // Restore sound volumes
  if(data.soundVols)Object.assign(soundVols,data.soundVols);
  // Restore visible pads
  if(data.visiblePads!==undefined)visiblePads=data.visiblePads;
  else visiblePads=drum.pads;
  // Restore sequencer state
  if(data.seqBpm)seqBpm=data.seqBpm;
  if(data.seqMode)seqMode=data.seqMode;
  if(data.arrangement)arrangement=[...data.arrangement];
  if(data.arrangeBars)arrangeBars=data.arrangeBars;
  if(data.seqHasAutoMutedAmbience)seqHasAutoMutedAmbience=data.seqHasAutoMutedAmbience;
  rebuildPadGrid();
  // Force synchronous render so desktop CSS constraints apply immediately
  renderUI();
  // Rebuild sequencer with saved layers
  rebuildSeqUI();
  // Restore current sequencer layers into the editor after rebuild
  if(data.seqLayersSnap&&data.seqLayersSnap.length&&drum.seqTracks>0){
    seqLayersContainer.innerHTML='';seqLayers=[];
    data.seqLayersSnap.forEach(snap=>{
      if(seqLayers.length>=drum.seqTracks)return;
      addSeqLayer(snap.soundId,[...snap.steps],snap.vols?[...snap.vols]:null);
      const layer=seqLayers[seqLayers.length-1];
      if(snap.muted&&layer){
        layer.muted=true;
        const muteBtn=layer.el&&layer.el.querySelector('.seq-rc-btn');
        if(muteBtn)muteBtn.classList.add('muted');
      }
    });
    updateSeqAddBtn();
  }
}
setInterval(()=>{if(activeSlot>=0)autoSave();},10000);
