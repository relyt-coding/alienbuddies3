
// ══════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════
const scoreEl=document.getElementById('scoreEl');
const multEl=document.getElementById('multEl');
const tapRing=null; // removed tap zone
const balanceEl=document.getElementById('balanceEl');
const autoInfo=document.getElementById('autoInfo');
const autoCpsDisplay=document.getElementById('autoCpsDisplay');
const autoEarnDisplay=document.getElementById('autoEarnDisplay');
const autoPulse=document.getElementById('autoPulse');
const alienMultInfo=document.getElementById('alienMultInfo');
const alienMultDisplay=document.getElementById('alienMultDisplay');

function renderTiers(newlyLit){
  tiers.forEach((tier,i)=>{
    const row=document.getElementById(`tier-${i}`);if(!row)return;
    const c=color(i);const dots=row.querySelectorAll('.tier-dot');
    dots.forEach((d,di)=>{
      if(di<tier.litDots){d.style.background=c.hex;d.style.boxShadow=`0 0 7px ${c.hex}`;d.classList.add('lit');if(newlyLit&&newlyLit.src==='manual'&&newlyLit.tier===i&&newlyLit.dot===di){d.classList.remove('pop');void d.offsetWidth;d.classList.add('pop');}}
      else{d.style.background='';d.style.boxShadow='';d.classList.remove('lit','pop');}
    });
    row.querySelector('.tier-mult').classList.toggle('show',tier.multiplierActive);
  });
  autoTiers.forEach((tier,i)=>{
    const row=document.getElementById(`auto-tier-${i}`);if(!row)return;
    const c=color(i);const dots=row.querySelectorAll('.tier-dot');
    dots.forEach((d,di)=>{
      if(di<tier.litDots){d.style.background=c.hex;d.style.boxShadow=`0 0 7px ${c.hex}`;d.classList.add('lit');if(newlyLit&&newlyLit.src==='auto'&&newlyLit.tier===i&&newlyLit.dot===di){d.classList.remove('pop');void d.offsetWidth;d.classList.add('pop');}}
      else{d.style.background='';d.style.boxShadow='';d.classList.remove('lit','pop');}
    });
    row.querySelector('.tier-mult').classList.toggle('show',tier.multiplierActive);
  });
}

// rAF-batched render — collapses multiple calls per frame into one
let _renderQueued=false;
let _renderNewlyLit=null;
function requestRender(newlyLit){
  if(newlyLit)_renderNewlyLit=newlyLit;
  if(_renderQueued)return;
  _renderQueued=true;
  requestAnimationFrame(()=>{
    _renderQueued=false;
    const lit=_renderNewlyLit;
    _renderNewlyLit=null;
    renderUI(lit);
  });
}

function renderUI(newlyLit){
  if(typeof updateSkillTreeBtn==='function')updateSkillTreeBtn();
  if(typeof updateGemDisplays==='function')updateGemDisplays();
  if(typeof checkContextualHints==='function')checkContextualHints();
  const mult=totalMultiplier();const cpt=clicksPerTap();
  scoreEl.textContent=formatNum(score);
  const scoreSubEl=document.getElementById('scoreSubEl');
  if(scoreSubEl){
    const T=1e12;
    if(score<T){
      // Below 1T: show scientific notation as sub-label
      scoreSubEl.textContent=score>=1000?formatSci(score):'';
      scoreSubEl.style.fontSize='';
    } else {
      // At/above 1T: main is scientific, sub shows full number — shrink to fit
      const full=formatFull(score);
      const digits=full.replace(/,/g,'').length;
      // Scale font down for very large numbers
      const fs=Math.max(.38,Math.min(.65,3.5/Math.sqrt(digits)));
      scoreSubEl.textContent=full+' pts';
      scoreSubEl.style.fontSize=fs+'rem';
    }
  }
  multEl.textContent=cpt>1?`×${formatMult(mult)} × ${cpt} clicks per tap`:`×${formatMult(mult)} per tap`;
  const _sci=(n=>{if(n<1000)return '';const e=Math.floor(Math.log10(n));return ' ('+( n/Math.pow(10,e)).toFixed(2).replace(/\.?0+$/,'')+'E'+e+')'})(score);
  balanceEl.textContent=formatNum(score)+_sci;
  const h=highestActive();
  const accent=color(Math.max(0,h)).hex,accentRgb=color(Math.max(0,h)).rgb;
  multEl.style.color=accent;
  updateSeqTrackerVisibility();
  if(drum.seqTracks>=1){
    autoInfo.classList.add('visible');
    const _sAcc=color(Math.max(0,highestActiveSeq())).hex;
    autoCpsDisplay.textContent=seqPlaying?formatRate(seqStepsPerSec()):'0';
    autoEarnDisplay.textContent=seqPlaying?formatRate(seqEarningsPerSec()):'0';
    autoCpsDisplay.style.color=_sAcc;autoEarnDisplay.style.color=_sAcc;autoPulse.style.background=seqPlaying?_sAcc:'#444';
  }else autoInfo.classList.remove('visible');
  if(totalAliens>0){alienMultInfo.classList.add('visible');alienMultDisplay.textContent=`×${formatMult(alienMultiplier())}`;}
  else alienMultInfo.classList.remove('visible');
  if(totalAliens>=5)partyBtn.classList.add('visible');else partyBtn.classList.remove('visible');
  renderTiers(newlyLit);
  renderStore();
  if(document.body.classList.contains('bunker-open'))renderBunkerView();
}

// (moved here from the tap file so it wraps renderUI right after renderUI is defined)
// Update match score display if game is open
(function(){
  const orig=renderUI;
  renderUI=function(){
    orig.apply(this,arguments);
    updateDrumTrackerOverlay();
    updateGhostPad();
    if(typeof updateEnergyUI==='function')updateEnergyUI();
    updatePadClickHint();
    updateOnboardingArrows();
    const el=document.getElementById('matchScoreDisplay');
    const modal=document.getElementById('matchingModal');
    if(el&&modal&&modal.style.display!=='none'){
      const s=score;
      if(s===0){el.textContent='';}
      else{
        const e=Math.floor(Math.log10(s));
        el.textContent='★ '+(s/Math.pow(10,e)).toFixed(2).replace(/\.?0+$/,'')+'E'+e;
      }
    }
  };
})();

function renderStore(){
  // ── DRUM: PAD BUTTONS ──
  const totalPads=drum.pads;const nextPadIdx=totalPads; // 0-based, so next pad is index = totalPads
  const maxPads=8;const atMax=totalPads>=maxPads;
  document.getElementById('padButtonsNum').textContent=totalPads;
  if(atMax){
    document.getElementById('padButtonsMain').textContent='ALL PADS UNLOCKED';
    document.getElementById('padButtonsSub2').textContent='You have all 8 pads';
    document.getElementById('padButtonsBtn').className='drum-buy-btn maxed';
    document.getElementById('padButtonsPrice').textContent='MAX';
    document.getElementById('padButtonsPrice').className='drum-price';
  }else{
    const padNames=['','2ND PAD — KICK','3RD PAD — SNARE','4TH PAD','5TH PAD','6TH PAD','7TH PAD','8TH PAD'];
    const padDescs=['','Kick drum · feel the beat · +×1.2 tap mult','Snare drum · adds more beat · +×1.2 tap mult','Assign any sound you own · +×1.2 tap mult','Assign any sound you own · +×1.2 tap mult','Assign any sound you own · +×1.2 tap mult','Assign any sound you own · +×1.2 tap mult','Assign any sound you own · +×1.2 tap mult'];
    const cost=PAD_COSTS[nextPadIdx];const canBuy=score>=cost;
    document.getElementById('padButtonsMain').textContent=`UNLOCK ${padNames[nextPadIdx]}`;
    document.getElementById('padButtonsSub2').textContent=padDescs[nextPadIdx];
    const btn=document.getElementById('padButtonsBtn');btn.className='drum-buy-btn '+(canBuy?'buyable':'locked');
    const pr=document.getElementById('padButtonsPrice');pr.className='drum-price'+(canBuy?'':' cant-afford');
    pr.innerHTML=canBuy?`${formatStore(cost)}<small>pts</small>`:`${formatStore(cost)}<small>pts</small>`;
  }
  // ── DRUM: SOUND LIBRARY ──
  const totalSounds=8+drum.extraSounds;const nextSoundIdx=drum.extraSounds;
  const maxSounds=EXTRA_SOUNDS_ORDER.length;const soundsAtMax=nextSoundIdx>=maxSounds;
  document.getElementById('soundLibNum').textContent=totalSounds;
  if(soundsAtMax){
    document.getElementById('soundLibMain').textContent='ALL SOUNDS UNLOCKED';
    document.getElementById('soundLibSub2').textContent='Full library accessible';
    document.getElementById('soundLibBtn').className='drum-buy-btn maxed';
    document.getElementById('soundLibPrice').textContent='MAX';
  }else{
    const nextSndId=EXTRA_SOUNDS_ORDER[nextSoundIdx];const nextSnd=SOUND_MAP[nextSndId];
    const cost=soundLibCost(nextSoundIdx);const canBuy=score>=cost;
    document.getElementById('soundLibMain').textContent=`UNLOCK ${nextSnd?nextSnd.name:nextSndId.toUpperCase()}`;
    document.getElementById('soundLibSub2').textContent=(nextSnd?nextSnd.desc:'New sound for your pads')+' · +×1.2 tap mult';
    const btn=document.getElementById('soundLibBtn');btn.className='drum-buy-btn '+(canBuy?'buyable':'locked');
    const pr=document.getElementById('soundLibPrice');pr.className='drum-price'+(canBuy?'':' cant-afford');
    pr.innerHTML=canBuy?`${formatStore(cost)}<small>pts</small>`:`${formatStore(cost)}<small>pts</small>`;
  }
  // ── DRUM: SEQUENCER ──
  const tracks=drum.seqTracks;const atMaxTracks=tracks>=MAX_SEQ_TRACKS;
  document.getElementById('seqNum').textContent=tracks;
  if(atMaxTracks){
    document.getElementById('seqMain').textContent='ALL TRACKS UNLOCKED';
    document.getElementById('seqSub2').textContent='6-track sequencer · maximum chaos';
    document.getElementById('seqBtn').className='drum-buy-btn maxed';
    document.getElementById('seqPrice').textContent='MAX';
  }else{
    const cost=seqTrackCost(tracks);const canBuy=score>=cost;
    document.getElementById('seqMain').textContent=tracks===0?'UNLOCK SEQUENCER':`UNLOCK TRACK ${tracks+1}`;
    document.getElementById('seqSub2').textContent=(tracks===0?'1-track loop · every step earns while it plays':`Add track ${tracks+1} of 6 — layer more sounds`)+' · +×1.2 tap mult';
    const btn=document.getElementById('seqBtn');btn.className='drum-buy-btn '+(canBuy?'buyable':'locked');
    const pr=document.getElementById('seqPrice');pr.className='drum-price'+(canBuy?'':' cant-afford');
    pr.innerHTML=canBuy?`${formatStore(cost)}<small>pts</small>`:`${formatStore(cost)}<small>pts</small>`;
  }
  // ── DRUMPAD / SEQUENCER dot-base upgrades ──
  (function(){
    function fill(pre,lvl,locked,lockMsg,nameShort){
      const owned=lvl+1,maxed=lvl>=DOT_MAX_LEVEL,cost=dotUpgradeCost(owned);
      const can=!locked&&!maxed&&score>=cost;
      const cur=dotBase(lvl),nxt=cur+1;
      document.getElementById(pre+'CardSub').textContent=locked?lockMsg:(maxed?`Maxed · dot rows climb in ×${cur}s`:`Dot rows climb in ×${cur}s → ×${nxt}s`);
      document.getElementById(pre+'CounterNum').textContent=owned;
      document.getElementById(pre+'EffectMain').textContent=maxed?`×${cur} DOTS · MAX`:`${nameShort} ×${nxt} DOTS`;
      const u=TIER_MULT_UNITS;
      document.getElementById(pre+'EffectSub').textContent=maxed?`×${cur*u[0]} · ×${cur*u[1]} · ×${cur*u[2]} · ×${cur*u[3]}…`:`×${cur*u[0]} · ×${cur*u[1]} · ×${cur*u[2]} → ×${nxt*u[0]} · ×${nxt*u[1]} · ×${nxt*u[2]}`;
      document.getElementById(pre+'Btn').className='upgrade-buy-btn '+(maxed?'maxed':(can?'buyable':'locked'));
      const pr=document.getElementById(pre+'Price');pr.className='upgrade-price'+((maxed||can)?'':' cant-afford');
      pr.innerHTML=maxed?'MAX':`${formatStore(cost)}<small>pts</small>`;
    }
    fill('drumMult',shop.multLevel,false,'','DRUMPAD');
    fill('seqMult',shop.seqMultLevel,drum.seqTracks<1,'Unlock the sequencer first','SEQUENCER');
  })();
  // ── MULTI-CLICK ──
  const mcUnlocked=shop.multiClickUnlocked;const mcLock=document.getElementById('multiClickLock');
  if(mcUnlocked){mcLock.classList.add('unlocked');}
  else{mcLock.classList.remove('unlocked');const canUnlock=score>=UNLOCK_COST;document.getElementById('multiClickLockCost').textContent=formatStore(UNLOCK_COST)+' pts';document.getElementById('multiClickLockCost').className='lock-cost'+(canUnlock?' affordable':'');document.getElementById('multiClickUnlockBtn').className='lock-btn'+(canUnlock?' affordable':'');}
  const mcLvl=shop.multiClickLevel+1,nextMC=multiClickUpgradeAt(mcLvl),canMC=score>=nextMC.cost;
  document.getElementById('multiClickCardSub').textContent=shop.multiClickLevel>=0?`Active: each tap = ${shop.multiClickLevel+2} clicks`:'Each tap counts as multiple clicks';
  document.getElementById('multiClickCounterNum').textContent=Math.max(0,mcLvl);
  document.getElementById('multiClickEffectMain').textContent=nextMC.effectMain;document.getElementById('multiClickEffectSub').textContent=nextMC.effectSub;
  const mcBtn=document.getElementById('multiClickNextBtn');mcBtn.className='upgrade-buy-btn '+(canMC?'buyable':'locked');mcBtn.style.borderColor=canMC?'#cc88ff':'';
  const mcP=document.getElementById('multiClickPrice');mcP.className='upgrade-price'+(canMC?'':' cant-afford');
  mcP.innerHTML=canMC?`${formatStore(nextMC.cost)}<small>pts</small>`:`${formatStore(nextMC.cost)}<small>pts</small>`;
  // ── ALIEN BOOST ──
  const abUnlocked=shop.alienBoostUnlocked;const abLock=document.getElementById('alienBoostLock');
  if(abUnlocked){abLock.classList.add('unlocked');}
  else{abLock.classList.remove('unlocked');const canUnlockAB=score>=ALIEN_POWER_UNLOCK_COST;document.getElementById('alienBoostLockCost').textContent=formatStore(ALIEN_POWER_UNLOCK_COST)+' pts';document.getElementById('alienBoostLockCost').className='lock-cost'+(canUnlockAB?' affordable':'');document.getElementById('alienBoostUnlockBtn').className='lock-btn'+(canUnlockAB?' affordable':'');}
  const abLvl=shop.alienBoostLevel+1,nextAB=alienBoostUpgradeAt(abLvl),canAB=score>=nextAB.cost;
  const currentPerAlien=(1.1+(shop.alienBoostLevel>=0?(shop.alienBoostLevel+1)*0.3:0)).toFixed(1);
  document.getElementById('alienBoostCardSub').textContent=shop.alienBoostLevel>=0?`Active: ×${currentPerAlien} per alien`:'Boost your alien buddy multiplier';
  document.getElementById('alienBoostCounterNum').textContent=Math.max(0,abLvl);
  document.getElementById('alienBoostEffectMain').textContent=nextAB.effectMain;document.getElementById('alienBoostEffectSub').textContent=nextAB.effectSub;
  const abBtn=document.getElementById('alienBoostNextBtn');abBtn.className='upgrade-buy-btn '+(canAB?'buyable':'locked');abBtn.style.borderColor=canAB?'#00ccff':'';
  const abP=document.getElementById('alienBoostPrice');abP.className='upgrade-price'+(canAB?'':' cant-afford');
  abP.innerHTML=canAB?`${formatStore(nextAB.cost)}<small>pts</small>`:`${formatStore(nextAB.cost)}<small>pts</small>`;
  // ── ALIEN ──
  const nc=alienCost(totalAliens),canAl=score>=nc;
  const perAlienBase=(1.1+(shop.alienBoostLevel>=0?(shop.alienBoostLevel+1)*0.3:0)).toFixed(1);
  const cb=alienMultiplier(),nb=Math.pow(parseFloat(perAlienBase),totalAliens+1);
  document.getElementById('alienCountStat').textContent=totalAliens;
  const ab2=document.getElementById('alienBuyBtn');
  if(totalAliens>=BUNKER_SIZE){ab2.style.display='none';}
  else{ab2.style.display='';ab2.className='alien-store-card '+(canAl?'buyable':'locked');}
  const ap2=document.getElementById('alienCardPrice');ap2.className='alien-card-price'+(canAl?'':' cant-afford');
  ap2.innerHTML=canAl?`${formatStore(nc)}<small>pts</small>`:`${formatStore(nc)}<small>pts</small>`;
}
