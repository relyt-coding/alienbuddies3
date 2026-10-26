
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

// Tracker columns: when the rows don't all fit, show the highest multiplier (bottom row) and let the rest scroll above it
function pinTierScroll(){
  [document.getElementById('tiersContainer'),document.getElementById('autoTiersContainer')].forEach(c=>{
    if(!c)return;
    const n=c.children.length;
    if(c._rc!==n){c._rc=n;c.scrollTop=c.scrollHeight;}
    c.classList.toggle('scrolls',c.scrollHeight>c.clientHeight+3);
  });
}
addEventListener('resize',()=>setTimeout(()=>{[document.getElementById('tiersContainer'),document.getElementById('autoTiersContainer')].forEach(c=>{if(c)c._rc=-1;});pinTierScroll();},120));
function renderTiers(newlyLit){
  pinTierScroll();
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
    if(typeof updateTipsGlow==='function')updateTipsGlow();
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
  // ── SEQUENCER: LOOP LENGTH (32 / 64 steps), appears once the first track is owned ──
  (function(){
    const card=document.getElementById('stepsCard');if(!card)return;
    card.style.display=drum.seqTracks>=1?'':'none';
    if(drum.seqTracks<1)return;
    const lv=shop.seqStepsLevel||0,maxed=lv>=2;
    document.getElementById('stepsNum').textContent=[16,32,64][lv];
    const btn=document.getElementById('stepsBuyBtn'),pr=document.getElementById('stepsPrice');
    if(maxed){
      document.getElementById('stepsMain').textContent='64 STEPS UNLOCKED';
      document.getElementById('stepsSub2').textContent='Longest loops · switch with the STEPS button';
      btn.className='drum-buy-btn maxed';pr.className='drum-price';pr.textContent='MAX';
    }else{
      const cost=SEQ_STEP_COSTS[lv],can=score>=cost,nxt=lv===0?32:64;
      document.getElementById('stepsMain').textContent='UPGRADE TO '+nxt+' STEPS';
      document.getElementById('stepsSub2').textContent=(lv===0?'Double-length loops':'Four times the length')+' for the sequencer';
      btn.className='drum-buy-btn '+(can?'buyable':'locked');
      pr.className='drum-price'+(can?'':' cant-afford');
      pr.innerHTML=`${formatStore(cost)}<small>pts</small>`;
    }
  })();
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
    // 1B unlock lock (same style as Multi-Click / Alien Power); cards already owned count as unlocked
    function lockFor(pre,unlocked){
      const lk=document.getElementById(pre+'Lock');if(!lk)return;
      if(unlocked){lk.classList.add('unlocked');return;}
      lk.classList.remove('unlocked');
      const can=score>=DOT_UNLOCK_COST&&(pre!=='seqDots'||drum.seqTracks>=1);
      const cost=document.getElementById(pre+'LockCost');
      cost.textContent=(pre==='seqDots'&&drum.seqTracks<1)?'unlock the sequencer first':formatStore(DOT_UNLOCK_COST)+' pts';
      cost.className='lock-cost'+(can?' affordable':'');
      document.getElementById(pre+'UnlockBtn').className='lock-btn'+(can?' affordable':'');
    }
    const drumOpen=shop.drumDotsUnlocked||shop.multLevel>=0, seqOpen=shop.seqDotsUnlocked||shop.seqMultLevel>=0;
    lockFor('drumDots',drumOpen);lockFor('seqDots',seqOpen);
    fill('drumMult',shop.multLevel,!drumOpen,'Unlock this upgrade first','DRUMPAD');
    fill('seqMult',shop.seqMultLevel,drum.seqTracks<1||!seqOpen,drum.seqTracks<1?'Unlock the sequencer first':'Unlock this upgrade first','SEQUENCER');
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
  // ── TIER 3: SEQUENCER MULTI-CLICK ──
  (function(){
    const lock=document.getElementById('seqMultiClickLock');if(!lock)return;
    const un=shop.seqMultiClickUnlocked;
    const hasSeq=drum.seqTracks>=1;
    if(un)lock.classList.add('unlocked');
    else{
      lock.classList.remove('unlocked');
      const can=hasSeq&&score>=SEQ_MC_UNLOCK_COST;
      const lc=document.getElementById('seqMultiClickLockCost');
      lc.textContent=hasSeq?formatStore(SEQ_MC_UNLOCK_COST)+' pts':'UNLOCK THE SEQUENCER FIRST';
      lc.className='lock-cost'+(can?' affordable':'');
      document.getElementById('seqMultiClickUnlockBtn').className='lock-btn'+(can?' affordable':'');
    }
    const lvl=shop.seqMultiClickLevel+1,maxed=lvl>SEQ_MC_MAX_LEVEL,up=seqMultiClickUpgradeAt(Math.min(lvl,SEQ_MC_MAX_LEVEL)),can=!maxed&&score>=up.cost;
    document.getElementById('seqMultiClickCardSub').textContent=shop.seqMultiClickLevel>=0?`Active: each step = ${shop.seqMultiClickLevel+2} clicks`:'Each sequencer step counts as multiple clicks';
    document.getElementById('seqMultiClickCounterNum').textContent=Math.max(0,lvl);
    document.getElementById('seqMultiClickEffectMain').textContent=maxed?'MAXED':up.effectMain;
    document.getElementById('seqMultiClickEffectSub').textContent=maxed?'Every step counts as 8 clicks':up.effectSub;
    const b=document.getElementById('seqMultiClickNextBtn');b.className='upgrade-buy-btn '+(maxed?'maxed':(can?'buyable':'locked'));b.style.borderColor=can?'#ff88cc':'';
    const pr=document.getElementById('seqMultiClickPrice');pr.className='upgrade-price'+(can?'':' cant-afford');
    pr.innerHTML=maxed?'MAX':`${formatStore(up.cost)}<small>pts</small>`;
  })();
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
  updateShopDismiss();
}

// ── Shop: maxed-out cards get a DISMISS button that tucks them away (saved per file); a toggle at the bottom shows them again ──
let shopShowDismissed=false;
function _shopCardKey(card){const t=card.querySelector('.drum-card-title,.upgrade-card-title');return t?t.textContent.replace(/[^A-Za-z0-9 \-]/g,'').trim().toUpperCase():null;}
function updateShopDismiss(){
  const sv=document.getElementById('storeView');if(!sv)return;
  const list=shop.dismissed||(shop.dismissed=[]);
  sv.querySelectorAll('.drum-card,.upgrade-card').forEach(card=>{
    const key=_shopCardKey(card);if(!key)return;
    const maxed=!!card.querySelector('.drum-buy-btn.maxed,.upgrade-buy-btn.maxed');
    const isDis=maxed&&list.indexOf(key)>=0;
    let btn=card.querySelector('.shop-dismiss-btn');
    if(maxed&&!btn){
      const hdr=card.querySelector('.drum-card-header,.upgrade-card-header');if(!hdr)return;
      btn=document.createElement('button');btn.type='button';btn.className='shop-dismiss-btn';
      btn.addEventListener('click',e=>{
        e.stopPropagation();e.preventDefault();
        const i=shop.dismissed.indexOf(key);
        if(i>=0)shop.dismissed.splice(i,1);else shop.dismissed.push(key);
        updateShopDismiss();autoSave();
      });
      hdr.appendChild(btn);
    }
    if(btn){btn.style.display=maxed?'':'none';btn.textContent=isDis?'RESTORE':'DISMISS';}
    card.classList.toggle('shop-dismissed',isDis&&!shopShowDismissed);
    card.classList.toggle('shop-dismissed-shown',isDis&&shopShowDismissed);
  });
  // hide a section's heading + row once every card in it is dismissed
  sv.querySelectorAll('.store-section-label').forEach(lbl=>{
    const row=lbl.nextElementSibling;if(!row||!(row.classList.contains('drum-upgrade-row')||row.classList.contains('tracks-row')))return;
    const cards=[...row.querySelectorAll('.drum-card,.upgrade-card')];
    const allGone=cards.length>0&&cards.every(c=>c.classList.contains('shop-dismissed')||c.style.display==='none');
    const anyDismissed=cards.some(c=>c.classList.contains('shop-dismissed'));
    const hide=allGone&&anyDismissed;
    lbl.classList.toggle('shop-dismissed',hide);row.classList.toggle('shop-dismissed',hide);
  });
  // toggle at the very bottom of the shop (only exists while something is dismissed)
  const sc=sv.querySelector('.store-scroll');
  if(sc){
    let t=document.getElementById('shopShowDismissedBtn');
    if(!t){
      t=document.createElement('button');t.type='button';t.id='shopShowDismissedBtn';
      t.addEventListener('click',()=>{shopShowDismissed=!shopShowDismissed;updateShopDismiss();});
      sc.appendChild(t);
    }
    if(!list.length)shopShowDismissed=false;
    t.style.display=list.length?'':'none';
    t.classList.toggle('on',shopShowDismissed);
    t.textContent=(shopShowDismissed?'HIDE DISMISSED':'SHOW DISMISSED')+' ('+list.length+')';
  }
}
