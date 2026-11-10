// ══════════════════════════════════════════════
//  MINIGAME HUB — how the minigames unlock, what they pay, and the COCKPIT page
//  · In the bunker from the start: PLANET HOP for 1 Alien Gem (levels 1–5, so you need an alien first),
//    then the MATCHING GAME for 10 gems underneath it.
//  · The skill tree's minigame path: Ice Planet (Planet Hop 6–10) → Cockpit (a page left of the bunker that holds
//    every minigame) → Worm Whack (levels 1–5) → Magmora (Planet Hop 11–15) → Beat Defense, and a later planet,
//    the Wyrm Moon, with a side trail that opens Worm Whack 5 levels at a time.
//  · Rewards: the Matching Game gives point multipliers. Planet Hop, Worm Whack and Beat Defense boost ALIEN GEMS:
//    +0.5× for every level cleared, +1× for a perfect clear (all stardust / 3 stars / no damage). Added, not multiplied.
// ══════════════════════════════════════════════
let mgBought={ph:false,match:false,wwAll:false};   // bunker purchases (+ wwAll: saves from before v0.2.111 keep every Worm Whack level)
let bdProgress={best:{}};                            // Beat Defense: best[L] = {cleared, flawless}
const MG_PRICE={ph:1,match:10};
const MG_WW_NODES=[[5,'ww_moon'],[10,'ww_deep'],[15,'ww_t1'],[20,'ww_t2'],[25,'ww_t3'],[30,'ww_t4']];
const _mgTest=()=>typeof TEST_MODE!=='undefined'&&TEST_MODE;
const _mgHas=id=>typeof unlockedSkills!=='undefined'&&!!unlockedSkills[id];

// which levels you have access to (you still clear them in order)
function mgPhAccess(L,real){if(!real&&_mgTest())return true;   // (real: the test-mode bot plays by the normal rules)
  return L<=5?!!mgBought.ph:L<=10?_mgHas('ph_ice'):_mgHas('ph_magma');}
function mgPhLockMsg(L){return L<=5?'Unlock Planet Hop in the bunker':L<=10?'Unlock the Ice Planet in the skill tree':'Unlock Magmora in the skill tree';}
function mgWwAccess(L,real){if((!real&&_mgTest())||mgBought.wwAll)return true;const n=MG_WW_NODES.find(([top])=>L<=top);return !!n&&_mgHas(n[1]);}
function mgWwLockMsg(L){const n=MG_WW_NODES.find(([top])=>L<=top);const nm={ww_moon:'Worm Whack',ww_deep:'the Wyrm Moon',ww_t1:'Wyrm Trail I',ww_t2:'Wyrm Trail II',ww_t3:'Wyrm Trail III',ww_t4:'Wyrm Trail IV'};return 'Unlock '+(n?nm[n[1]]:'it')+' in the skill tree';}
function mgCockpitOn(){return _mgTest()||_mgHas('mg_cockpit');}

// Alien Gem bonus from the minigames (added together, then multiplies the gem rate)
function mgGemParts(){
  let ph=0,ww=0,bd=0;
  if(typeof phProgress!=='undefined')Object.values(phProgress.best||{}).forEach(b=>{if(b&&b.cleared)ph+=(b.dust||0)>=.999?1:.5;});
  if(typeof wormProgress!=='undefined')Object.values(wormProgress.best||{}).forEach(b=>{if(b&&(b.stars||0)>=1)ww+=b.stars>=3?1:.5;});
  Object.values(bdProgress.best||{}).forEach(b=>{if(b&&b.cleared)bd+=b.flawless?1:.5;});
  return{ph,ww,bd};
}
function mgGemBonus(){const p=mgGemParts();return 1+p.ph+p.ww+p.bd;}
function mgFmtX(v){return '×'+(Math.round(v*100)/100);}
// the gem bonus a level gives, for result screens
function mgLevelGemText(perfectWord){return '+0.5× Alien Gems for the clear · +1× in total for '+perfectWord;}

// ── saves ──
function mgLoad(data){
  mgBought=Object.assign({ph:false,match:false,wwAll:false},data.mgBought||{});
  bdProgress=(data.bdProgress&&data.bdProgress.best)?data.bdProgress:{best:{}};
  if(!data.mgBought&&typeof unlockedSkills!=='undefined'){
    // first load on v0.2.111+: keep everything the player already had
    const had=data.score>0||data.totalAliens>0;
    if(unlockedSkills.planet_hop||Object.keys((data.phProgress||{}).best||{}).length)mgBought.ph=true;
    if((data.matchLevelsCompleted!=null&&data.matchLevelsCompleted>=0)||data.matchSavedState)mgBought.match=true;
    if(unlockedSkills.worm_whack){['ph_ice','mg_cockpit','ww_moon'].forEach(k=>unlockedSkills[k]=true);mgBought.wwAll=true;mgBought.ph=true;}
    if(unlockedSkills.planet_hop){['ph_ice','mg_cockpit','ww_moon','ph_magma'].forEach(k=>unlockedSkills[k]=true);mgBought.ph=true;}
    let refund=0;if(unlockedSkills.memory_boost)refund+=250;
    ['memory_boost','worm_whack','planet_hop'].forEach(k=>delete unlockedSkills[k]);
    if(refund&&typeof alienGems!=='undefined'){alienGems+=refund;setTimeout(()=>{if(typeof showToast==='function')showToast('🃏 Memory Boost left the skill tree: you got '+refund+' gems back!');},3200);}
    if(had&&(mgBought.ph||mgBought.match))setTimeout(()=>{if(typeof showToast==='function')showToast('🎮 Minigames got a new home: your unlocks are kept, and Planet Hop / Worm Whack wins now boost Alien Gems!');},4400);
  }
  // the old intro's "how it works" card is gone: a save sitting on it counts the intro as won
  if(typeof matchSavedState!=='undefined'&&matchSavedState&&matchSavedState.infoStage){
    matchSavedState=null;if(matchLevelsCompleted<0){matchLevelsCompleted=0;if(typeof matchRewardForLevel==='function')matchingMultiplier*=matchRewardForLevel(0);}
  }
  setTimeout(mgRefresh,0);
}

// ── the minigame list: lives in the bunker until the cockpit is unlocked, then moves into the cockpit ──
(function(){
  const $=id=>document.getElementById(id);
  // cockpit page
  const ck=document.createElement('div');ck.className='view';ck.id='cockpitView';
  ck.innerHTML=`
    <div class="page-header">
      <div class="page-title-wrap"><div class="page-title" style="color:#7fe8ff">COCKPIT</div><div class="page-sub" id="ckSub">MINIGAMES</div></div>
      <button class="back-btn" id="closeCockpitBtn">BACK</button>
    </div>
    <div class="ck-window" aria-hidden="true"><div class="ck-stars"></div><div class="ck-planet p1"></div><div class="ck-planet p2"></div><div class="ck-planet p3"></div><div class="ck-dash"><i></i><i></i><i></i><i></i><i></i></div></div>
    <div class="ck-bonus" id="ckBonus"></div>
    <div class="ck-list" id="ckList"></div>
    <div class="ck-soon" id="ckSoon"></div>`;
  const host=$('gameScreen')||document.body;host.appendChild(ck);
  // the bunker's GAMES button (shown once the cockpit is unlocked)
  const gb=document.createElement('button');gb.id='mgGamesBtn';gb.type='button';gb.innerHTML='🚀 GAMES <small>◀ COCKPIT</small>';gb.style.display='none';
  const list=$('mgList');if(list)list.after(gb);
  gb.addEventListener('click',openCockpitPage);
  $('closeCockpitBtn').addEventListener('click',()=>{if(document.body.classList.contains('desktop-mode'))closeCockpit();else if(typeof swipeNavGo==='function')swipeNavGo(2,-1);else closeCockpit();});
  // close the cockpit whenever another page opens (buttons, swipes, keyboard)
  new MutationObserver(()=>{const b=document.body.classList;if(b.contains('cockpit-open')&&(b.contains('bunker-open')||b.contains('store-open'))&&!b.contains('desktop-mode'))b.remove('cockpit-open');}).observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('keydown',e=>{if(e.code==='Escape'&&document.body.classList.contains('cockpit-open')&&document.body.classList.contains('desktop-mode')){closeCockpit();}});
})();
function openCockpit(){
  // desktop: a window over everything (outside the game screen, so nothing floats above it); phone: a page beside the bunker
  const ck=document.getElementById('cockpitView'),desk=document.body.classList.contains('desktop-mode'),host=desk?document.body:(document.getElementById('gameScreen')||document.body);
  if(ck&&ck.parentElement!==host)host.appendChild(ck);
  document.body.classList.add('cockpit-open');mgRefresh();}
function closeCockpit(){document.body.classList.remove('cockpit-open');}
function openCockpitPage(){
  if(document.body.classList.contains('desktop-mode')||typeof swipeNavGo!=='function'){openCockpit();return;}
  swipeNavGo(4,1);
}

// buy a bunker minigame with Alien Gems
function mgBuy(k){
  const price=MG_PRICE[k];
  if(mgBought[k])return true;
  if((typeof alienGems!=='undefined'?alienGems:0)<price){
    const need=price===1?'1 Alien Gem':price+' Alien Gems';
    showToast(totalAliens>0?'💎 Need '+need+' (your aliens make gems every minute)':'💎 Need '+need+' · buy an Alien Buddy in the shop to start making gems');
    return false;
  }
  alienGems-=price;mgBought[k]=true;
  try{playSfxPurchase&&playSfxPurchase();}catch(e){}
  showToast(k==='ph'?'🪐 PLANET HOP unlocked! Levels 1–5 · each win boosts your Alien Gems':'🃏 MATCHING GAME unlocked! Each level gives a permanent point multiplier');
  if(typeof autoSave==='function')autoSave();if(typeof renderUI==='function')renderUI();
  mgRefresh();return false;   // the first tap only buys it
}

// put every minigame button in the right place, with the right label
function mgRefresh(){
  const $=id=>document.getElementById(id);
  const list=$('mgList'),ckList=$('ckList'),gb=$('mgGamesBtn');if(!list)return;
  const inCk=mgCockpitOn();
  if(inCk&&list.parentElement!==ckList)ckList.appendChild(list);
  if(!inCk&&list.parentElement===ckList){const anchor=$('mgGamesBtn');anchor.before(list);}
  if(gb)gb.style.display=inCk?'':'none';
  // order: Planet Hop · Matching · Worm Whack · Beat Defense
  const ph=$('planetHopBtn'),mb=$('matchingGameBtn'),ml=$('matchingGameLock'),ww=$('wormGameBtn'),bd=$('beatDefenseBtn');
  if(ph&&mb&&ph.nextElementSibling!==mb)mb.before(ph);
  if(ww&&ml&&ml.nextElementSibling!==ww)ml.after(ww);
  if(bd){const last=ww||ml;if(last&&last.nextElementSibling!==bd)last.after(bd);}
  if(ph){ph.style.display='';ph.classList.toggle('mg-locked',!mgBought.ph&&!_mgTest());
    ph.innerHTML=(mgBought.ph||_mgTest())?'🪐 PLANET HOP':'🪐 PLANET HOP <span class="mg-price">UNLOCK · 💎 1</span>';}
  if(typeof updateMatchingBtn==='function')updateMatchingBtn();
  // cockpit header + bonus + coming-soon cards
  const p=mgGemParts(),tot=1+p.ph+p.ww+p.bd;
  const cb=$('ckBonus');if(cb)cb.innerHTML=`Minigame gem bonus: <b>${mgFmtX(tot)}</b> Alien Gems`+(p.ph||p.ww||p.bd?` <small>(Planet Hop +${p.ph} · Worm Whack +${p.ww} · Beat Defense +${p.bd})</small>`:'');
  const soon=$('ckSoon');if(soon){const locked=[];
    if(!_mgHas('ww_moon')&&!mgBought.wwAll&&!_mgTest())locked.push(['🪱','WORM WHACK','next in the skill tree']);
    if(!_mgHas('beat_defense')&&!_mgTest())locked.push(['🛸','BEAT DEFENSE','deeper in the skill tree']);
    soon.innerHTML=locked.map(([i,n,w])=>`<div class="ck-soon-card"><span>${i}</span><b>${n}</b><small>🔒 ${w}</small></div>`).join('');}
}
setInterval(()=>{if(document.body.classList.contains('game-active'))mgRefresh();},1500);

// a nudge toward the first purchase: once you can afford Planet Hop
setInterval(()=>{
  if(!document.body.classList.contains('game-active')||typeof shownHints==='undefined'||_mgTest())return;
  if(!mgBought.ph&&!shownHints.phIntro&&(typeof alienGems!=='undefined'&&alienGems>=1)&&typeof showHintModal==='function'){
    shownHints.phIntro=true;if(typeof autoSave==='function')autoSave();
    showHintModal('🪐','Your aliens made an Alien Gem! Spend it in the Bunker to unlock PLANET HOP.');
  }
},4000);
