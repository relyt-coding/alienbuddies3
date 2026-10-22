
// ══════════════════════════════════════════════
//  PURCHASES
// ══════════════════════════════════════════════
function flashBuy(c='#e8ff00'){const el=document.createElement('div');el.className='unlock-flash';el.style.background=c;document.body.appendChild(el);setTimeout(()=>el.remove(),400);}

// Drum: buy next pad
function buyNextPad(){
  const idx=drum.pads;if(idx>=8)return;
  const cost=PAD_COSTS[idx];if(score<cost)return;
  score-=cost;drum.pads++;
  visiblePads=drum.pads; // always show new pad on unlock
  // Set default sound for this pad (null for pads 3+, since idx is 0-based and 3/4 = 4th/5th pad)
  padSounds[idx]=PAD_DEFAULT_SOUNDS[idx]||null;
  playSfxPurchase();flashBuy('#a0a8ff');
  rebuildPadGrid();
  updateSoundboardUnlocked();
  updateBouncerToggleVisibility();
  if(idx>=3)showToast('🥁 New pad unlocked! Tap it to assign a sound.');
  showToast('Pad unlocked — your Drum Multiplier increased by ×1.2!');
  renderUI();autoSave();
}

// Drum: buy next sound
function buyNextSound(){
  const idx=drum.extraSounds;if(idx>=EXTRA_SOUNDS_ORDER.length)return;
  const cost=soundLibCost(idx);if(score<cost)return;
  score-=cost;drum.extraSounds++;
  playSfxPurchase();flashBuy('#a0a8ff');
  const newId=EXTRA_SOUNDS_ORDER[idx-1]||EXTRA_SOUNDS_ORDER[0];
  updateSoundboardUnlocked();
  updateBouncerToggleVisibility();
  showToast(`${(SOUND_MAP[EXTRA_SOUNDS_ORDER[idx]]||{name:'Sound'}).name} unlocked — your Drum Multiplier increased by ×1.2!`);
  renderUI();autoSave();
}

// Drum: buy sequencer track
function buySeqTrack(){
  const tracks=drum.seqTracks;if(tracks>=MAX_SEQ_TRACKS)return;
  const cost=seqTrackCost(tracks);if(score<cost)return;
  score-=cost;drum.seqTracks++;
  playSfxPurchase();flashBuy('#33ff99');
  if(tracks>0)showToast('Sequencer track unlocked — your Drum Multiplier increased by ×1.2!');
  if(tracks===0){
    // First track — unlock sequencer, auto-show it
    seqEnergy=SEQ_ENERGY_MAX;
    seqHidden=false;
    rebuildSeqUI();
    applySeqView();
    startSeq();
    // Auto-mute background ambience when sequencer first unlocks
    if(!seqHasAutoMutedAmbience){
      seqHasAutoMutedAmbience=true;
      musicOn=false;
      const bgToggle=document.getElementById('bgMusicToggle');
      const sbToggle=document.getElementById('settingsBgMusic');
      if(bgToggle)bgToggle.checked=false;
      if(sbToggle)sbToggle.checked=false;
      if(ambGain){
        const now=audioCtx.currentTime;
        ambGain.gain.cancelScheduledValues(now);
        ambGain.gain.setValueAtTime(ambGain.gain.value,now);
        ambGain.gain.linearRampToValueAtTime(0,now+2);
      }
    }
    showToast('🎛 Sequencer unlocked — every step now earns points! Click steps to set beats.');
  }else{
    // Add another track — auto-add it immediately, no button press needed
    const defaults=['hihat','snare','kick','clap','sub','chord'];
    addSeqLayer(defaults[drum.seqTracks-1]||unlockedSounds()[0]);
    updateSeqAddBtn();
    showToast(`🎛 Track ${drum.seqTracks} unlocked and added!`);
  }
  renderUI();autoSave();
}

function unlockDrumDots(){
  if(shop.drumDotsUnlocked||score<DOT_UNLOCK_COST)return;
  score-=DOT_UNLOCK_COST;shop.drumDotsUnlocked=true;
  playSfxTierUnlock(4);flashBuy('#e8ff00');renderUI();autoSave();
}
function unlockSeqDots(){
  if(drum.seqTracks<1){showToast('Unlock the sequencer first!');return;}
  if(shop.seqDotsUnlocked||score<DOT_UNLOCK_COST)return;
  score-=DOT_UNLOCK_COST;shop.seqDotsUnlocked=true;
  playSfxTierUnlock(5);flashBuy('#4488ff');renderUI();autoSave();
}
function buyDrumMult(){
  if(!(shop.drumDotsUnlocked||shop.multLevel>=0))return;
  if(shop.multLevel>=DOT_MAX_LEVEL)return;
  const cost=dotUpgradeCost(shop.multLevel+1);
  if(score<cost)return;
  score-=cost;shop.multLevel++;
  playSfxPurchase();flashBuy('#e8ff00');refreshTierBadges();
  showToast(`DRUMPAD dots upgraded — multipliers now climb in ×${dotBase(shop.multLevel)}s!`);
  renderUI();autoSave();
}
function buySeqMult(){
  if(drum.seqTracks<1){showToast('Unlock the sequencer first!');return;}
  if(!(shop.seqDotsUnlocked||shop.seqMultLevel>=0))return;
  if(shop.seqMultLevel>=DOT_MAX_LEVEL)return;
  const cost=dotUpgradeCost(shop.seqMultLevel+1);
  if(score<cost)return;
  score-=cost;shop.seqMultLevel++;
  playSfxPurchase();flashBuy('#4488ff');refreshTierBadges();
  showToast(`SEQUENCER dots upgraded — multipliers now climb in ×${dotBase(shop.seqMultLevel)}s!`);
  renderUI();autoSave();
}
function unlockMultiClick(){if(score<UNLOCK_COST||shop.multiClickUnlocked)return;score-=UNLOCK_COST;shop.multiClickUnlocked=true;playSfxTierUnlock(2);flashBuy('#cc88ff');renderUI();autoSave();}
function unlockAlienBoost(){if(score<ALIEN_POWER_UNLOCK_COST||shop.alienBoostUnlocked)return;score-=ALIEN_POWER_UNLOCK_COST;shop.alienBoostUnlocked=true;playSfxTierUnlock(3);flashBuy('#00ccff');renderUI();autoSave();}
function buyAlienBoostNext(){if(!shop.alienBoostUnlocked)return;const lvl=shop.alienBoostLevel+1,up=alienBoostUpgradeAt(lvl);if(score<up.cost)return;score-=up.cost;shop.alienBoostLevel=lvl;playSfxPurchase();flashBuy('#00ccff');showToast(`${up.effectMain} — your Alien Boost Multiplier increased!`);renderUI();autoSave();}
function buyMultiClickNext(){if(!shop.multiClickUnlocked)return;const lvl=shop.multiClickLevel+1,up=multiClickUpgradeAt(lvl);if(score<up.cost)return;score-=up.cost;shop.multiClickLevel=lvl;playSfxPurchase();flashBuy('#cc88ff');showToast(`${up.effectMain} — each tap now counts as ${lvl+2} clicks!`);renderUI();autoSave();}
function buyAlien(){
  updateBouncerToggleVisibility&&updateBouncerToggleVisibility();const cost=alienCost(totalAliens);if(score<cost)return;score-=cost;totalAliens++;bouncerOnNewAlien();updateMatchingBtn();viewingBunker=Math.max(0,Math.floor((totalAliens-1)/BUNKER_SIZE));playSfxAlienBuy();flashBuy(totalAliens%BUNKER_SIZE===0?'#00ff88':'#00cc66');renderUI();
  // Always update bunker sidebar on desktop
  if(document.body.classList.contains('desktop-mode'))renderBunkerView();
  autoSave();}

function addEP(id,fn){const el=document.getElementById(id);if(!el)return;el.addEventListener('click',fn);el.addEventListener('touchend',e=>{e.preventDefault();fn();});}
addEP('padButtonsBtn',buyNextPad);
addEP('soundLibBtn',buyNextSound);
addEP('seqBtn',buySeqTrack);
addEP('drumDotsUnlockBtn',unlockDrumDots);
addEP('seqDotsUnlockBtn',unlockSeqDots);
addEP('drumMultBtn',buyDrumMult);
addEP('seqMultBtn',buySeqMult);
addEP('multiClickUnlockBtn',unlockMultiClick);
addEP('alienBoostUnlockBtn',unlockAlienBoost);
addEP('alienBoostNextBtn',buyAlienBoostNext);
addEP('multiClickNextBtn',buyMultiClickNext);
addEP('alienBuyBtn',buyAlien);
