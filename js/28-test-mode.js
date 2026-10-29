// ══════════════════════════════════════════════
//  TEST MODE  (alienbuddies.space/test  ·  or ?test locally)
// ══════════════════════════════════════════════
// Separate saves (see SAVE_KEYS) + a 🧪 panel with:
//   RUN    – a run timer + event log while you play normally, optional auto-buy / auto-tap,
//            and AUTOPLAY: a bot that plays the real economy fast-forwarded (1× … 1000× / MAX)
//   TIMES  – time table + charts built from the log (time per alien, waits, longest gaps, flow score)
//   COMPARE– save runs and compare two of them milestone by milestone
//   CHEATS – points / gems / aliens / unlocks, jump ahead
//   PERF   – live performance overlay + a stress test (how hard this device's audio can be pushed)
// Everything is logged in "game time": real time while you play, simulated time while autoplay runs.
(function(){
if(typeof TEST_MODE==='undefined'||!TEST_MODE)return;
const VER=typeof GAME_VERSION!=='undefined'?GAME_VERSION:'?';
const LS={run:'ab2t_currentRun',runs:'ab2t_runs',opts:'ab2t_opts'};
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtT=sec=>{sec=Math.max(0,Math.round(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
  return h?`${h}h ${String(m).padStart(2,'0')}m`:(m?`${m}m ${String(s).padStart(2,'0')}s`:`${s}s`);};
const fmtClock=sec=>{sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;};
const fmtN=v=>!isFinite(v)?'∞':(typeof formatStore==='function'?formatStore(v):String(Math.round(v)));
console.log('%c🧪 Alien Buddies TEST MODE','font-size:16px;color:#00ff88','— separate saves, autoplay, logging. Open the 🧪 button.');

// ── options (remembered) ──
const opts=Object.assign({speed:100,buyShop:true,buySkills:true,buyTips:true,autoTap:true,tapRate:3,matchAuto:true,
  matchBase:15,matchPerPair:6,stopAliens:'',stopMatch:'',stopHours:'',stallHours:12,overlay:false,manualAutoBuy:false},lsGet(LS.opts,{}));
const saveOpts=()=>lsSet(LS.opts,opts);

// ══════════════════════════════════════════════
//  RUN + EVENT LOG
// ══════════════════════════════════════════════
let run=lsGet(LS.run,null);
function newRunObj(){return{id:Date.now(),name:'Run '+new Date().toLocaleString(),version:VER,started:Date.now(),gameT:0,events:[],samples:[],perf:[],
  settings:{tapRate:opts.tapRate,matchBase:opts.matchBase,matchPerPair:opts.matchPerPair},snap:null,lastBuyT:0};}
if(!run||!Array.isArray(run.events))run=newRunObj();
let running=false,autoplay=false,lastReal=0,achieved=0;
const saveRun=()=>{if(run.events.length>6000)run.events=run.events.slice(-6000);lsSet(LS.run,run);};

// income right now (points/sec): sequencer + auto-tapping (what the bot assumes)
function pps(){let v=0;try{if(drum.seqTracks>=1)v+=seqEarningsPerSec();if(opts.autoTap&&autoplay||tapTimer)v+=opts.tapRate*totalMultiplier()*clicksPerTap();}catch(e){}return v;}
function gpm(){try{return gemsPerMinute();}catch(e){return 0;}}
// a snapshot of everything that can be bought / reached; diffs between snapshots become log events
function snap(){
  const rows=a=>a.filter(x=>x.multiplierActive).length;
  return{al:totalAliens,pad:drum.pads,snd:drum.extraSounds,trk:drum.seqTracks,
    mcU:!!shop.multiClickUnlocked,mc:shop.multiClickLevel,apU:!!shop.alienBoostUnlocked,ap:shop.alienBoostLevel,
    smcU:!!shop.seqMultiClickUnlocked,smc:shop.seqMultiClickLevel,ddU:!!shop.drumDotsUnlocked,dd:shop.multLevel,sdU:!!shop.seqDotsUnlocked,sd:shop.seqMultLevel,
    tip:tipsOwned,match:matchLevelsCompleted,tree:!!skillTreeUnlocked,skills:Object.keys(unlockedSkills).filter(k=>unlockedSkills[k]),
    seqRows:rows(autoTiers),drumRows:rows(tiers)};
}
const musicCount=list=>list.filter(k=>k.startsWith('mt_')).length;
function logEvent(cat,name,cost,cur,key){
  const t=run.gameT,prevSame=[...run.events].reverse().find(e=>e.cat===cat);
  const ev={t:+t.toFixed(1),cat,name,key:key||name,cost:cost==null?null:cost,cur:cur||'',pps:pps(),gpm:+gpm().toFixed(2),al:totalAliens,
    wait:+(t-(cat==='shop'||cat==='skill'?run.lastBuyT:(prevSame?prevSame.t:0))).toFixed(1)};
  if(cat==='shop'||cat==='skill'||cat==='tip'||cat==='alien')run.lastBuyT=t;
  run.events.push(ev);feedPush(ev);
}
function diffLog(a,b){
  if(!a)return;
  for(let k=a.al;k<b.al;k++)logEvent('alien','Alien #'+(k+1),alienCost(k),'pts','alien:'+(k+1));
  for(let k=a.pad;k<b.pad;k++)logEvent('shop','Pad '+(k+1),PAD_COSTS[k],'pts','pad:'+(k+1));
  for(let k=a.snd;k<b.snd;k++)logEvent('shop','Sound '+(k+1)+' ('+((SOUND_MAP[EXTRA_SOUNDS_ORDER[k]]||{}).name||'?')+')',soundLibCost(k),'pts','sound:'+(k+1));
  for(let k=a.trk;k<b.trk;k++)logEvent('shop',k===0?'Sequencer unlocked':'Sequencer track '+(k+1),seqTrackCost(k),'pts','track:'+(k+1));
  if(!a.mcU&&b.mcU)logEvent('shop','Multi-Click unlocked',UNLOCK_COST,'pts','mc:unlock');
  for(let l=a.mc+1;l<=b.mc;l++)logEvent('shop','Multi-Click lvl '+(l+1),multiClickUpgradeCost(l),'pts','mc:'+(l+1));
  if(!a.apU&&b.apU)logEvent('shop','Alien Power unlocked',ALIEN_POWER_UNLOCK_COST,'pts','ap:unlock');
  for(let l=a.ap+1;l<=b.ap;l++)logEvent('shop','Alien Power lvl '+(l+1),alienBoostUpgradeCost(l),'pts','ap:'+(l+1));
  if(!a.smcU&&b.smcU)logEvent('shop','Seq Multi-Click unlocked',SEQ_MC_UNLOCK_COST,'pts','smc:unlock');
  for(let l=a.smc+1;l<=b.smc;l++)logEvent('shop','Seq Multi-Click lvl '+(l+1),seqMultiClickCost(l),'pts','smc:'+(l+1));
  if(!a.ddU&&b.ddU)logEvent('shop','Drumpad dots unlocked',DOT_UNLOCK_COST,'pts','dd:unlock');
  for(let l=a.dd+1;l<=b.dd;l++)logEvent('shop','Drumpad dots ×'+dotBase(l),dotUpgradeCost(l),'pts','dd:'+(l+1));
  if(!a.sdU&&b.sdU)logEvent('shop','Sequencer dots unlocked',DOT_UNLOCK_COST,'pts','sd:unlock');
  for(let l=a.sd+1;l<=b.sd;l++)logEvent('shop','Sequencer dots ×'+dotBase(l),dotUpgradeCost(l),'pts','sd:'+(l+1));
  for(let k=a.tip;k<b.tip;k++)logEvent('tip','Tip '+(k+1),tipCost(k),'pts','tip:'+(k+1));
  for(let L=a.match+1;L<=b.match;L++)logEvent('match','Matching level '+L+' (×'+matchRewardForLevel(L)+')',null,'','match:'+L);
  if(!a.tree&&b.tree)logEvent('skill','Explore the Galaxies',GEM_UNLOCK_COST,'gems','skill:tree');
  const had=new Set(a.skills);let mc=musicCount(a.skills);
  b.skills.filter(k=>!had.has(k)).forEach(k=>{const n=SKILL_MAP[k];if(!n)return;
    let cost=n.cost;if(k.startsWith('mt_')){cost=Math.round(n.cost*Math.pow(typeof MUSIC_COST_GROWTH!=='undefined'?MUSIC_COST_GROWTH:1,mc));mc++;}
    logEvent('skill',(n.hub?'★ ':'')+n.name,cost,'gems','skill:'+k);});
  for(let r=a.seqRows;r<b.seqRows;r++)logEvent('row','Sequencer row '+(r+1)+' active',null,'','seqrow:'+(r+1));
  for(let r=a.drumRows;r<b.drumRows;r++)logEvent('row','Drumpad row '+(r+1)+' active',null,'','drumrow:'+(r+1));
}
function checkpoint(){const s=snap();diffLog(run.snap,s);run.snap=s;}
let lastSampleT=-1e9;
function sample(force){
  if(!force&&run.gameT-lastSampleT<Math.max(5,run.gameT/400))return; // ~400 samples per run, finer at the start
  lastSampleT=run.gameT;
  run.samples.push({t:+run.gameT.toFixed(1),pps:pps(),al:totalAliens,gems:Math.floor(alienGems),gpm:+gpm().toFixed(2)});
  if(run.samples.length>1200)run.samples=run.samples.filter((_,i)=>i%2===0);
}

// ══════════════════════════════════════════════
//  BUYING (shared by auto-buy and autoplay)
// ══════════════════════════════════════════════
function shopOptions(){
  const L=[];const add=(name,cost,fn)=>{if(isFinite(cost))L.push({name,cost,fn});};
  add('alien',alienCost(totalAliens),buyAlien);
  if(drum.pads<8)add('pad',PAD_COSTS[drum.pads],buyNextPad);
  if(drum.extraSounds<EXTRA_SOUNDS_ORDER.length)add('sound',soundLibCost(drum.extraSounds),buyNextSound);
  if(drum.seqTracks<MAX_SEQ_TRACKS)add('track',seqTrackCost(drum.seqTracks),buySeqTrack);
  if(!shop.multiClickUnlocked)add('mcU',UNLOCK_COST,unlockMultiClick);else add('mc',multiClickUpgradeCost(shop.multiClickLevel+1),buyMultiClickNext);
  if(!shop.alienBoostUnlocked)add('apU',ALIEN_POWER_UNLOCK_COST,unlockAlienBoost);else add('ap',alienBoostUpgradeCost(shop.alienBoostLevel+1),buyAlienBoostNext);
  if(drum.seqTracks>=1){
    if(!shop.seqMultiClickUnlocked)add('smcU',SEQ_MC_UNLOCK_COST,unlockSeqMultiClick);else if(shop.seqMultiClickLevel<SEQ_MC_MAX_LEVEL)add('smc',seqMultiClickCost(shop.seqMultiClickLevel+1),buySeqMultiClickNext);
    if(!shop.seqDotsUnlocked)add('sdU',DOT_UNLOCK_COST,unlockSeqDots);else if(shop.seqMultLevel<DOT_MAX_LEVEL)add('sd',dotUpgradeCost(shop.seqMultLevel+1),buySeqMult);
  }
  if(!shop.drumDotsUnlocked)add('ddU',DOT_UNLOCK_COST,unlockDrumDots);else if(shop.multLevel<DOT_MAX_LEVEL)add('dd',dotUpgradeCost(shop.multLevel+1),buyDrumMult);
  return L;
}
function buyTipDirect(){const c=tipCost(tipsOwned);if(score<c)return;score-=c;tipsOwned++;tipsMult*=1.5;try{updateTipsLabel();}catch(e){}}
// buys the cheapest affordable thing (shop + tips), repeatedly; returns how many things were bought
function buyCheapestPoints(max){
  let n=0;
  for(let k=0;k<(max||40);k++){
    const L=opts.buyShop?shopOptions():[];
    if(opts.buyTips&&tipsOwned<MAX_TIPS)L.push({name:'tip',cost:tipCost(tipsOwned),fn:buyTipDirect});
    if(!L.length)break;L.sort((a,b)=>a.cost-b.cost);
    if(L[0].cost>score)break;
    const before=score;try{L[0].fn();}catch(e){}
    if(score===before)break;n++;
  }
  return n;
}
function buyCheapestGems(){
  let n=0;
  if(!skillTreeUnlocked&&alienGems>=GEM_UNLOCK_COST){alienGems-=GEM_UNLOCK_COST;skillTreeUnlocked=true;n++;}
  if(!skillTreeUnlocked)return n;
  for(let k=0;k<20;k++){
    const av=SKILL_TREE_NODES.filter(x=>!unlockedSkills[x.id]&&skillAvailable(x.id)&&(!x.placeholder||x.id==='memory_boost'));
    if(!av.length)break;av.sort((a,b)=>skillCost(a)-skillCost(b));
    if(skillCost(av[0])>Math.floor(alienGems))break;
    buySkill(av[0].id);n++;
  }
  return n;
}

// ══════════════════════════════════════════════
//  AUTOPLAY (fast-forward simulation of the real economy)
// ══════════════════════════════════════════════
// Assumes an active player: taps a pad tapRate times a second (keeps the sequencer's energy up),
// buys the cheapest thing as soon as it's affordable, and plays each matching level as soon as it unlocks
// (taking matchBase + matchPerPair × pairs seconds of game time).
let simAcc=0,dotAcc=0,match=null;
function addRows(arr,ensure,n){let i=0;while(n>0){ensure(i+1);const tr=arr[i];const tot=tr.litDots+n;tr.litDots=tot%DOTS;const carry=Math.floor(tot/DOTS);if(carry>0&&!tr.multiplierActive){tr.multiplierActive=true;ensure(i+2);}n=carry;i++;}}
function simStep(dt){
  const cpt=clicksPerTap();
  if(opts.autoTap){const taps=opts.tapRate*dt;score+=totalMultiplier()*cpt*taps;dotAcc+=cpt*taps;const n=Math.floor(dotAcc);dotAcc-=n;if(drumTrackerActive&&n)addRows(tiers,ensureTiers,n);}
  if(drum.seqTracks>=1){score+=seqEarningsPerSec()*dt;simAcc+=seqStepsPerSec()*seqStepScale()*cpt*seqClicksPerStep()*dt;const n=Math.floor(simAcc);simAcc-=n;if(n)addRows(autoTiers,ensureAutoTiers,n);}
  if(totalAliens>0)alienGems+=gpm()/60*dt;
  if(!drumTrackerActive&&score>=25){score-=25;drumTrackerActive=true;}
  if(opts.buySkills)buyCheapestGems();
  if(opts.buyShop||opts.buyTips)buyCheapestPoints();
  if(opts.matchAuto){
    if(!match){const nl=matchLevelsCompleted+1;if(totalAliens>=aliensNeededForLevel(nl))match={lvl:nl,until:run.gameT+dt+opts.matchBase+opts.matchPerPair*matchPairsForLevel(nl)};}
    else if(run.gameT+dt>=match.until){matchingMultiplier*=matchRewardForLevel(match.lvl);matchLevelsCompleted=match.lvl;match=null;}
  }
  run.gameT+=dt;
}
// side effects that would slow fast-forward to a crawl (sounds, flashes, toasts, saving, re-rendering)
const QUIET=['showToast','flashBuy','playSfxPurchase','playSfxTierUnlock','playSfxAlienBuy','renderUI','autoSave','requestRender','startSeq','updateGemDisplays','renderSkillTree','updateSkillTreeBtn','updateMatchingBtn','showHintModal','checkContextualHints'];
function quietly(fn){
  const saved={};QUIET.forEach(k=>{if(typeof window[k]==='function'){saved[k]=window[k];window[k]=function(){};}});
  try{fn();}finally{Object.keys(saved).forEach(k=>window[k]=saved[k]);}
}
function stopReason(){
  const a=parseFloat(opts.stopAliens),m=parseFloat(opts.stopMatch),h=parseFloat(opts.stopHours);
  if(a&&totalAliens>=a)return totalAliens+' aliens reached';
  if(m&&matchLevelsCompleted>=m)return 'matching level '+matchLevelsCompleted+' reached';
  if(h&&run.gameT>=h*3600)return h+' game hours reached';
  if(opts.stallHours&&run.gameT-run.lastBuyT>=opts.stallHours*3600&&run.lastBuyT>0)return 'WALL: nothing bought for '+opts.stallHours+' game hours';
  return '';
}
function startAutoplay(){
  if(activeSlot<0){startGame(0);}
  if(autoplay)return;
  autoplay=true;running=true;
  try{stopSeq();}catch(e){}
  if(gemInterval){clearInterval(gemInterval);gemInterval=null;}
  if(!run.snap)run.snap=snap();
  lastReal=performance.now();render();
}
function stopAutoplay(reason){
  if(!autoplay)return;autoplay=false;running=false;match=null;
  if(reason){logEvent('note','⏹ '+reason,null,'','stop');}
  try{startGemInterval();}catch(e){}
  if(drum.seqTracks>=1){seqEnergy=SEQ_ENERGY_MAX;try{startSeq();}catch(e){}}
  try{renderUI();updateGemDisplays();renderUI();autoSave();}catch(e){}
  saveRun();render();
}
let lastUi=0,lastSave=0;
function autoplayTick(){
  const now=performance.now(),budget=opts.speed==='max'?45:30;let simmed=0;
  const target=opts.speed==='max'?Infinity:Math.min(+opts.speed*Math.min(.25,(now-lastReal)/1000),+opts.speed*.25);
  lastReal=now;
  let reason='';
  quietly(()=>{
    while(simmed<target&&performance.now()-now<budget){
      const dt=Math.min(target===Infinity?2:Math.max(.1,Math.min(2,target-simmed)),2);
      simStep(dt);simmed+=dt;
      const s=snap();diffLog(run.snap,s);run.snap=s;sample();
      if((reason=stopReason()))break;
    }
  });
  achieved=simmed/Math.max(.001,(performance.now()-now+ (opts.speed==='max'?0:100))/1000);
  if(reason){stopAutoplay(reason);return;}
  if(now-lastUi>300){lastUi=now;try{renderUI();updateGemDisplays();}catch(e){}renderLive();}
  if(now-lastSave>5000){lastSave=now;try{autoSave();}catch(e){}saveRun();}
}

// ── manual play: the timer just follows real time; optional auto-buy / auto-tap ──
let tapTimer=null;
function setTapper(){
  if(tapTimer){clearInterval(tapTimer);tapTimer=null;}
  if(running&&!autoplay&&opts.autoTap&&opts.manualAutoBuy){
    tapTimer=setInterval(()=>{if(activeSlot<0||autoplay)return;const i=padSounds.findIndex(Boolean);if(i>=0&&typeof firePad==='function')firePad(i);},Math.max(50,1000/opts.tapRate));
  }
}
let lastManual=performance.now();
setInterval(()=>{
  const now=performance.now(),dt=(now-lastManual)/1000;lastManual=now;
  if(autoplay){autoplayTick();return;}
  if(!running||activeSlot<0)return;
  run.gameT+=Math.min(dt,60*60);
  if(opts.manualAutoBuy){if(opts.buySkills)buyCheapestGems();if(opts.buyShop||opts.buyTips)buyCheapestPoints(5);}
  checkpoint();sample();
  if(now-lastUi>500){lastUi=now;renderLive();}
  if(now-lastSave>10000){lastSave=now;saveRun();}
},100);

// ══════════════════════════════════════════════
//  ANALYSIS (time table, flow score, comparisons)
// ══════════════════════════════════════════════
function analyse(r){
  const ev=r.events,aliens=ev.filter(e=>e.cat==='alien'),matches=ev.filter(e=>e.cat==='match'),hubs=ev.filter(e=>e.cat==='skill'&&e.name.startsWith('★'));
  const alienWaits=aliens.map((e,i)=>({n:+e.key.split(':')[1],t:e.t,wait:i?e.t-aliens[i-1].t:e.t}));
  // flow score: 100 = every wait is about as long as the one before (smooth); big jumps up/down cost points
  const r2=[];for(let i=1;i<alienWaits.length;i++){const a=Math.max(1,alienWaits[i-1].wait),b=Math.max(1,alienWaits[i].wait);r2.push(Math.abs(Math.log2(b/a)));}
  const flow=r2.length?Math.max(0,Math.min(100,Math.round(100-25*r2.reduce((s,x)=>s+x,0)/r2.length))):null;
  const buys=ev.filter(e=>e.cat==='shop'||e.cat==='skill'||e.cat==='tip'||e.cat==='alien');
  const gaps=buys.map((e,i)=>({name:e.name,t:e.t,gap:i?e.t-buys[i-1].t:e.t})).sort((a,b)=>b.gap-a.gap).slice(0,8);
  const matchRows=matches.map((m,i)=>{const L=+m.key.split(':')[1],unlockAl=aliensNeededForLevel(L),ua=aliens.find(a=>+a.key.split(':')[1]>=unlockAl);
    const prev=i?matches[i-1].t:0;return{L,t:m.t,unlockedAt:ua?ua.t:null,waitAfterPrev:ua?Math.max(0,ua.t-prev):null};});
  return{aliens:alienWaits,matches:matchRows,hubs,flow,gaps,total:r.gameT,count:buys.length};
}
function milestoneMap(r){const m={};r.events.forEach(e=>{if(e.key&&m[e.key]==null&&e.cat!=='note')m[e.key]=e.t;});return m;}
function summaryText(r){
  const a=analyse(r),last=r.samples[r.samples.length-1]||{};
  const L=[`Alien Buddies ${r.version} · TEST RUN · ${r.name}`,`Game time ${fmtT(r.gameT)} · aliens ${totalAliens} · matching lvl ${Math.max(0,matchLevelsCompleted)} · purchases ${a.count} · flow score ${a.flow??'—'}/100`,
    `Points/sec now ${fmtN(last.pps||0)} · gems/min ${fmtN(last.gpm||0)}`,'',`ALIENS (time reached · wait):`];
  a.aliens.filter(x=>x.n<=10||x.n%5===0).forEach(x=>L.push(`  #${x.n}  ${fmtT(x.t)}  (+${fmtT(x.wait)})`));
  L.push('','MATCHING LEVELS (done at · waited for its unlock):');a.matches.forEach(x=>L.push(`  L${x.L}  ${fmtT(x.t)}  (${x.waitAfterPrev==null?'—':fmtT(x.waitAfterPrev)})`));
  L.push('','LONGEST WAITS:');a.gaps.forEach(g=>L.push(`  ${fmtT(g.gap)} before ${g.name} (at ${fmtT(g.t)})`));
  if(r.perf.length){const p=r.perf[r.perf.length-1];L.push('',`PERF: ${p.verdict} · audio ${p.offlineX}× real time · ${p.fps} fps (worst frame ${p.maxFrame} ms) · ${p.device}`);}
  return L.join('\n');
}

// ══════════════════════════════════════════════
//  PERFORMANCE
// ══════════════════════════════════════════════
const perf={frames:[],late:0,maxLate:0,steps:0,voices:0,voiceLog:[],longest:0};
(function frameLoop(){let last=performance.now();(function f(t){const d=t-last;last=t;perf.frames.push([t,d]);if(d>perf.longest&&perf.frames.length>30)perf.longest=d;
  while(perf.frames.length&&t-perf.frames[0][0]>2000)perf.frames.shift();requestAnimationFrame(f);})(last);})();
// late sequencer steps: was the step's sound scheduled after its slot had already started?
if(typeof seqRunStep==='function'){const o=seqRunStep;window.seqRunStep=function(q,d,at){perf.steps++;try{if(at!==undefined&&audioCtx){const late=(audioCtx.currentTime-at)*1000;if(late>3){perf.late++;perf.maxLate=Math.max(perf.maxLate,late);}}}catch(e){}return o.apply(this,arguments);};}
['playSound','playRollNote'].forEach(k=>{const o=window[k];if(typeof o!=='function')return;window[k]=function(){perf.voiceLog.push(performance.now());return o.apply(this,arguments);};});
function perfNow(){
  const fr=perf.frames.map(x=>x[1]).filter(x=>x<1000),n=fr.length;const sorted=fr.slice().sort((a,b)=>a-b);
  const now=performance.now();while(perf.voiceLog.length&&now-perf.voiceLog[0]>1000)perf.voiceLog.shift();
  let lat='';try{if(audioCtx)lat=Math.round(((audioCtx.baseLatency||0)+(audioCtx.outputLatency||0))*1000)+' ms';}catch(e){}
  return{fps:n?Math.round(n/((perf.frames[n-1][0]-perf.frames[0][0])/1000||1)):0,avg:n?(fr.reduce((s,x)=>s+x,0)/n).toFixed(1):'-',p95:n?sorted[Math.floor(n*.95)].toFixed(0):'-',
    longest:Math.round(perf.longest),late:perf.late,maxLate:Math.round(perf.maxLate),voices:perf.voiceLog.length,buses:typeof _fxBuses!=='undefined'?Object.keys(_fxBuses).length:0,
    audio:audioCtx?(audioCtx.state+' · '+audioCtx.sampleRate+' Hz'+(lat?' · '+lat:'')):'not started',
    heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576)+' MB':'n/a'};
}
function deviceInfo(){
  const ua=navigator.userAgent,ios=/iPhone|iPad|iPod/.test(ua)?('iOS '+((ua.match(/OS (\d+)_(\d+)/)||[]).slice(1).join('.')||'?')):'',
    and=(ua.match(/Android [\d.]+/)||[''])[0];
  return `${ios||and||navigator.platform||'?'} · ${screen.width}×${screen.height} @${window.devicePixelRatio||1}x · ${navigator.hardwareConcurrency||'?'} cores`+(navigator.deviceMemory?` · ${navigator.deviceMemory} GB`:'');
}
// STRESS TEST: (1) render 4 bars of a heavy song offline as fast as possible → "× real time" headroom for the audio thread;
// (2) play the same heavy song live for a few seconds and watch the frame rate.
async function stressTest(btn){
  if(typeof renderOffline!=='function'){alert('Export engine not available');return;}
  btn.disabled=true;btn.textContent='RUNNING…';
  const savedFx=trackFx.map(f=>f?Object.assign({},f):f);
  const heavy=()=>{trackFx=[];for(let i=0;i<6;i++)Object.assign(getTrackFx(i,true),{rvbAmt:.4,echoMix:.3,filtOn:i%2===0,chorusMix:i===3?.5:0,distAmt:i===2?.3:0,compAmt:.5,scAmt:i>2?.5:0,pan:(i-2.5)/4});
    for(let l=0;l<3;l++)Object.assign(getTrackFx(FX_ROLL_BASE+l,true),{rvbAmt:.3,phaserMix:l===1?.5:0,pan:l-1});};
  const sd=60/100/4,hits=[],bars=[];const kit=['hihat','kick','snare','clap','sub','chord'];
  for(let s=0;s<64;s++){kit.forEach((id,ch)=>{if(ch===0||(ch===1&&s%4===0)||(ch===2&&s%8===4)||(ch===3&&s%8===4)||(ch===4&&s%2===0)||(ch===5&&s%16===0))hits.push({time:s*sd,soundId:id,vel:1,ch});});
    if(s%4===0){[['rs_pad',60],['rs_keys',72],['rs_bass',36]].forEach(([id,m],li)=>[0,4,7].forEach(o=>hits.push({time:s*sd,soundId:id,midi:m+(li===2?0:o),dur:4*sd,vel:1,layer:li})));}
    if(s%16===0)bars.push(s*sd);}
  const prevMusic=Object.assign({},unlockedSkills);
  ['mt_piano','mt_reverb','mt_echo','mt_filter','mt_distortion','mt_chorus','mt_phaser','mt_compression','mt_panning','mt_sidechain'].forEach(k=>unlockedSkills[k]=true); // temporarily, so every effect really runs
  let res={};
  try{
    heavy();
    const t0=performance.now();const buf=await renderOffline({hits,bars,duration:64*sd});const ms=performance.now()-t0;
    res.offlineX=+((buf.length/buf.sampleRate)/(ms/1000)).toFixed(1);
    // live: 2 bars on the real audio output, measuring frames
    heavy();getCtx();const start=audioCtx.currentTime+.25;perf.longest=0;const f0=perf.frames.length;
    const liveFrames=[];let last=performance.now(),stop=false;(function f(t){liveFrames.push(t-last);last=t;if(!stop)requestAnimationFrame(f);})(last);
    hits.filter(h=>h.time<32*sd).forEach(h=>{if(h.midi!=null)playRollNote(h.soundId,h.midi,start+h.time,h.dur,h.vel,h.layer);else playSound(h.soundId,h.vel,start+h.time,h.ch);});
    await new Promise(r=>setTimeout(r,(32*sd+1.2)*1000));stop=true;
    const lf=liveFrames.slice(2).filter(x=>x<2000);
    res.fps=Math.round(1000/(lf.reduce((s,x)=>s+x,0)/Math.max(1,lf.length)));res.maxFrame=Math.round(Math.max(0,...lf));
  }catch(e){res.error=String(e);}
  finally{trackFx=savedFx;Object.keys(unlockedSkills).forEach(k=>{if(!prevMusic[k])delete unlockedSkills[k];});}
  res.verdict=res.error?'error':(res.offlineX>=4?'✅ smooth':(res.offlineX>=2?'⚠️ OK — very busy songs may crackle':'❌ likely to crackle on busy songs'));
  res.device=deviceInfo();res.at=new Date().toISOString();res.ua=navigator.userAgent;
  run.perf.push(res);saveRun();
  btn.disabled=false;btn.textContent='▶ RUN STRESS TEST';render();
}
// overlay
const ov=document.createElement('div');ov.id='tmOverlay';document.body.appendChild(ov);
setInterval(()=>{ov.style.display=opts.overlay?'block':'none';if(!opts.overlay)return;const p=perfNow();
  ov.innerHTML=`<b>${p.fps}</b> fps · avg ${p.avg} ms · p95 ${p.p95} · worst ${p.longest}<br>late steps ${p.late}${p.late?' (max '+p.maxLate+' ms)':''} · voices/s ${p.voices} · fx ${p.buses}<br>${esc(p.audio)} · heap ${p.heap}`+(autoplay?`<br>⏩ ${fmtN(achieved)}× · ${fmtClock(run.gameT)}`:'');},500);

// ══════════════════════════════════════════════
//  PANEL UI
// ══════════════════════════════════════════════
const css=document.createElement('style');css.textContent=`
#tmBadge{position:fixed;right:0;top:38%;z-index:395;font-family:'Bebas Neue',sans-serif;letter-spacing:.12em;font-size:.9rem;padding:.45rem .45rem .45rem .55rem;border-radius:9px 0 0 9px;border:1px solid #00ff88;border-right:0;writing-mode:vertical-rl;background:#021209ee;color:#00ff88;cursor:pointer;box-shadow:0 0 12px -3px #00ff88;touch-action:manipulation;}
#tmBadge.rec::after{content:'●';color:#ff4466;margin-top:4px;}
#tmPanel.open~#tmBadge,body.roll-full #tmBadge{display:none;}
#tmPanel{position:fixed;z-index:396;right:0;top:0;bottom:0;width:min(440px,100vw);background:#07070f;border-left:1px solid #1f3a2f;display:none;flex-direction:column;font-family:system-ui,-apple-system,sans-serif;color:#cfd2e6;font-size:13px;box-shadow:-8px 0 30px rgba(0,0,0,.6);}
#tmPanel.open{display:flex;}
@media (max-width:600px){#tmPanel{top:auto;height:78vh;height:78dvh;width:100vw;border-left:0;border-top:1px solid #1f3a2f;border-radius:16px 16px 0 0;}}
#tmPanel .tm-hd{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #16221d;}
#tmPanel .tm-hd b{font-family:'Bebas Neue',sans-serif;font-size:1.25rem;letter-spacing:.12em;color:#00ff88;flex:1;}
#tmPanel .tm-tabs{display:flex;gap:4px;padding:6px 8px;border-bottom:1px solid #16221d;overflow-x:auto;}
#tmPanel .tm-tab{font-family:'Bebas Neue',sans-serif;letter-spacing:.1em;font-size:.95rem;padding:.3rem .65rem;border-radius:7px;border:1px solid #22223a;background:#0c0c18;color:#8a8ab5;cursor:pointer;white-space:nowrap;}
#tmPanel .tm-tab.on{border-color:#00ff88;color:#00ff88;background:#04170e;}
#tmPanel .tm-body{flex:1;overflow-y:auto;padding:10px 12px 24px;-webkit-overflow-scrolling:touch;}
#tmPanel h4{font-family:'Bebas Neue',sans-serif;letter-spacing:.14em;font-size:.95rem;color:#7a7aa8;margin:14px 0 6px;font-weight:normal;}
#tmPanel .tm-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0;}
#tmPanel button.tm-b,#tmPanel .tm-chip{font:inherit;font-size:12px;padding:6px 10px;border-radius:7px;border:1px solid #2a2a4a;background:#10101e;color:#cfd2e6;cursor:pointer;touch-action:manipulation;}
#tmPanel .tm-chip.on{border-color:#a0a8ff;color:#fff;background:#1b1b3d;}
#tmPanel button.tm-go{border-color:#00ff88;color:#00ff88;background:#04170e;font-weight:600;}
#tmPanel button.tm-stop{border-color:#ff4466;color:#ff6688;background:#1a0710;}
#tmPanel label{display:flex;align-items:center;gap:6px;margin:3px 0;}
#tmPanel input[type=number],#tmPanel input[type=text],#tmPanel select{width:70px;background:#0c0c18;border:1px solid #2a2a4a;color:#fff;border-radius:6px;padding:4px 6px;font:inherit;}
#tmPanel .tm-clock{font-family:'Bebas Neue',sans-serif;font-size:2.4rem;letter-spacing:.08em;color:#fff;line-height:1;}
#tmPanel .tm-sub{color:#7a7aa8;font-size:12px;}
#tmPanel .tm-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
#tmPanel .tm-card{background:#0c0c18;border:1px solid #1d1d36;border-radius:9px;padding:7px 8px;}
#tmPanel .tm-card i{display:block;font-style:normal;color:#7a7aa8;font-size:10px;letter-spacing:.08em;text-transform:uppercase;}
#tmPanel .tm-card b{font-size:15px;color:#fff;}
#tmPanel table{width:100%;border-collapse:collapse;font-size:12px;}
#tmPanel td,#tmPanel th{padding:3px 4px;border-bottom:1px solid #15152a;text-align:left;}
#tmPanel th{color:#7a7aa8;font-weight:normal;font-size:11px;}
#tmPanel .hot td{color:#ffcc66;}
#tmPanel .tm-feed div{padding:2px 0;border-bottom:1px solid #121226;font-size:12px;display:flex;gap:6px;}
#tmPanel .tm-feed span:first-child{color:#7a7aa8;min-width:62px;}
#tmPanel svg{width:100%;height:auto;display:block;background:#0a0a14;border-radius:8px;border:1px solid #17172c;}
#tmOverlay{position:fixed;left:8px;top:calc(env(safe-area-inset-top,0px) + 40px);z-index:394;font:11px/1.35 ui-monospace,Menlo,monospace;background:#000c;color:#9fffc8;padding:5px 7px;border-radius:7px;border:1px solid #1f3a2f;pointer-events:none;display:none;}
#tmToast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:400;background:#04170e;border:1px solid #00ff88;color:#00ff88;padding:8px 14px;border-radius:9px;font-family:system-ui;font-size:13px;display:none;}
`;document.head.appendChild(css);
const badge=document.createElement('button');badge.id='tmBadge';badge.textContent='🧪 TEST';document.body.appendChild(badge);
const panel=document.createElement('div');panel.id='tmPanel';document.body.appendChild(panel);
const tmToast=document.createElement('div');tmToast.id='tmToast';document.body.appendChild(tmToast);
const say=t=>{tmToast.textContent=t;tmToast.style.display='block';clearTimeout(say._t);say._t=setTimeout(()=>tmToast.style.display='none',2200);};
let tab='run';
badge.addEventListener('click',()=>{panel.classList.toggle('open');render();});
// clicks inside the panel shouldn't fall through to the game (pads, swipe navigation)
['pointerdown','touchstart','click','keydown'].forEach(t=>panel.addEventListener(t,e=>e.stopPropagation()));

const feed=[];function feedPush(ev){feed.unshift(ev);if(feed.length>14)feed.pop();}
function render(){
  badge.classList.toggle('rec',running);
  if(!panel.classList.contains('open'))return;
  const tabs=[['run','RUN'],['times','TIME TABLE'],['compare','COMPARE'],['cheats','CHEATS'],['perf','PERF']];
  panel.innerHTML=`<div class="tm-hd"><b>🧪 TEST MODE</b><span class="tm-sub">v${esc(VER)}</span><button class="tm-b" data-a="close">✕</button></div>
    <div class="tm-tabs">${tabs.map(([k,l])=>`<button class="tm-tab${tab===k?' on':''}" data-tab="${k}">${l}</button>`).join('')}</div><div class="tm-body">${({run:viewRun,times:viewTimes,compare:viewCompare,cheats:viewCheats,perf:viewPerf}[tab])()}</div>`;
}
function renderLive(){ // cheap refresh of the RUN tab while things are moving
  badge.classList.toggle('rec',running);
  if(!panel.classList.contains('open'))return;
  if(tab==='run'){const c=panel.querySelector('#tmClock'),s=panel.querySelector('#tmClockSub'),f=panel.querySelector('#tmFeed'),k=panel.querySelector('#tmCards');
    if(c){c.textContent=fmtClock(run.gameT);s.innerHTML=clockSub();f.innerHTML=feedHtml();k.innerHTML=cardsHtml();return;}}
  if(tab==='perf'){const p=panel.querySelector('#tmPerfLive');if(p){p.innerHTML=perfLiveHtml();return;}}
}
const clockSub=()=>autoplay?`⏩ AUTOPLAY · ${opts.speed==='max'?'MAX':opts.speed+'×'} (running at ${fmtN(achieved)}×)${match?' · playing matching L'+match.lvl:''}`:(running?'● RECORDING YOUR PLAY (real time)':'paused');
const feedHtml=()=>feed.map(e=>`<div><span>${fmtT(e.t)}</span><span>${esc(e.name)}${e.cost!=null?' · '+(e.cur==='gems'?'💎':'')+fmtN(e.cost):''}${e.wait>0&&e.cat!=='row'?' <i style="color:#7a7aa8">(+'+fmtT(e.wait)+')</i>':''}</span></div>`).join('')||'<div class="tm-sub">Nothing logged yet.</div>';
const cardsHtml=()=>{let p=0;try{p=pps();}catch(e){}return [['Aliens',totalAliens],['Match lvl',Math.max(0,matchLevelsCompleted)],['Points/sec',fmtN(p)],['Points',fmtN(score)],['Gems',fmtN(alienGems)],['Events',run.events.length]].map(([i,b])=>`<div class="tm-card"><i>${i}</i><b>${b}</b></div>`).join('');};
const chip=(k,v,l)=>`<button class="tm-chip${String(opts[k])===String(v)?' on':''}" data-opt="${k}" data-v="${v}">${l}</button>`;
const tog=(k,l)=>`<label><input type="checkbox" data-tog="${k}"${opts[k]?' checked':''}> ${l}</label>`;
const num=(k,l,w)=>`<label>${l} <input type="number" data-num="${k}" value="${esc(opts[k])}" style="width:${w||70}px"></label>`;
function viewRun(){
  return `<div class="tm-clock" id="tmClock">${fmtClock(run.gameT)}</div><div class="tm-sub" id="tmClockSub">${clockSub()}</div>
  <div class="tm-row" style="margin-top:8px">
    ${autoplay?'<button class="tm-b tm-stop" data-a="autoStop">⏸ STOP AUTOPLAY</button>':'<button class="tm-b tm-go" data-a="autoStart">⏩ START AUTOPLAY</button>'}
    ${autoplay?'':(running?'<button class="tm-b tm-stop" data-a="pause">⏸ PAUSE TIMER</button>':'<button class="tm-b tm-go" data-a="record">● RECORD MY PLAY</button>')}
  </div>
  <div class="tm-row"><button class="tm-b" data-a="newRun">⟲ NEW RUN (fresh test save)</button><button class="tm-b" data-a="saveRun">💾 SAVE RUN FOR COMPARE</button></div>
  <div class="tm-cards" id="tmCards" style="margin-top:8px">${cardsHtml()}</div>
  <h4>AUTOPLAY SPEED</h4><div class="tm-row">${[1,10,100,1000].map(v=>chip('speed',v,v+'×')).join('')}${chip('speed','max','MAX')}</div>
  <h4>THE BOT / AUTO-BUY</h4>
  ${tog('buyShop','Buy cheapest shop item')} ${tog('buySkills','Buy cheapest skill tree node (gems)')} ${tog('buyTips','Buy tips')}
  ${tog('autoTap','Tap pads')} ${num('tapRate','taps per second',56)}
  ${tog('matchAuto','Play matching levels automatically')} <div class="tm-row">${num('matchBase','takes',50)}<span class="tm-sub">s +</span>${num('matchPerPair','',44)}<span class="tm-sub">s per pair</span></div>
  ${tog('manualAutoBuy','Also auto-buy + auto-tap while I play myself (recording)')}
  <h4>STOP AUTOPLAY WHEN</h4><div class="tm-row">${num('stopAliens','aliens ≥',56)}${num('stopMatch','match lvl ≥',50)}${num('stopHours','game hours ≥',56)}</div>
  <div class="tm-row">${num('stallHours','or nothing bought for (game hours)',50)}</div>
  <h4>LIVE LOG</h4><div class="tm-feed" id="tmFeed">${feedHtml()}</div>
  <h4>EXPORT</h4><div class="tm-row"><button class="tm-b" data-a="csv">⬇ CSV</button><button class="tm-b" data-a="json">⬇ JSON</button><button class="tm-b" data-a="copy">📋 COPY SUMMARY</button></div>`;
}
// ── charts (plain SVG) ──
function barChart(vals,labels,opt){
  const W=400,H=150,P=24,n=vals.length;if(!n)return '<div class="tm-sub">No data yet.</div>';
  const max=Math.max(...vals)||1,bw=(W-P-6)/n,hot=new Set(opt.hot||[]);
  let s=`<svg viewBox="0 0 ${W} ${H}">`;
  [0,.5,1].forEach(f=>{const y=H-P-(H-P-8)*f;s+=`<line x1="${P}" x2="${W}" y1="${y}" y2="${y}" stroke="#1a1a30"/><text x="2" y="${y+3}" fill="#6a6a90" font-size="9">${opt.fmt(max*f)}</text>`;});
  vals.forEach((v,i)=>{const h=(H-P-8)*v/max,x=P+3+i*bw;s+=`<rect x="${x}" y="${H-P-h}" width="${Math.max(1,bw-1)}" height="${h}" fill="${hot.has(i)?'#ffcc66':(opt.color||'#00ff88')}"><title>${labels[i]}: ${opt.fmt(v)}</title></rect>`;});
  const step=Math.ceil(n/8);labels.forEach((l,i)=>{if(i%step===0)s+=`<text x="${P+3+i*bw}" y="${H-8}" fill="#6a6a90" font-size="9">${l}</text>`;});
  return s+`</svg>`;
}
function lineChart(series,opt){
  const W=400,H=160,P=30;const all=series.flatMap(s=>s.pts);if(all.length<2)return '<div class="tm-sub">No data yet.</div>';
  const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);const x0=Math.min(...xs),x1=Math.max(...xs)||1,y0=Math.min(...ys),y1=Math.max(...ys);
  const X=v=>P+(W-P-6)*(v-x0)/((x1-x0)||1),Y=v=>H-18-(H-26)*(v-y0)/((y1-y0)||1);
  let s=`<svg viewBox="0 0 ${W} ${H}">`;
  [0,.5,1].forEach(f=>{const v=y0+(y1-y0)*f,y=Y(v);s+=`<line x1="${P}" x2="${W}" y1="${y}" y2="${y}" stroke="#1a1a30"/><text x="2" y="${y+3}" fill="#6a6a90" font-size="9">${opt.yfmt(v)}</text>`;});
  [0,.5,1].forEach(f=>{const v=x0+(x1-x0)*f;s+=`<text x="${X(v)-10}" y="${H-4}" fill="#6a6a90" font-size="9">${opt.xfmt(v)}</text>`;});
  series.forEach(se=>{s+=`<polyline fill="none" stroke="${se.color}" stroke-width="1.8" points="${se.pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')}"/>`;});
  s+=series.map((se,i)=>`<text x="${P+6}" y="${12+i*11}" fill="${se.color}" font-size="10">${esc(se.name)}</text>`).join('');
  return s+`</svg>`;
}
function viewTimes(){
  const a=analyse(run);
  const waits=a.aliens.map(x=>x.wait/60),labels=a.aliens.map(x=>'#'+x.n);
  const sorted=a.aliens.map((x,i)=>[x.wait,i]).sort((p,q)=>q[0]-p[0]).slice(0,Math.max(1,Math.round(a.aliens.length*.1))).map(p=>p[1]);
  const ppsPts=run.samples.filter(s=>s.pps>0).map(s=>[s.t/3600,Math.log10(s.pps)]);
  const flowTxt=a.flow==null?'—':a.flow+'/100';
  return `<div class="tm-cards">${[['Game time',fmtT(run.gameT)],['Aliens',a.aliens.length],['Flow score',flowTxt],['Purchases',a.count],['Longest wait',a.gaps[0]?fmtT(a.gaps[0].gap):'—'],['Match levels',a.matches.length]].map(([i,b])=>`<div class="tm-card"><i>${i}</i><b>${b}</b></div>`).join('')}</div>
  <div class="tm-sub" style="margin-top:6px">Flow score: 100 = every alien takes about as long as the one before. Big jumps (a quick one, then a long wall) lower it.</div>
  <h4>MINUTES PER ALIEN <span class="tm-sub">(gold = slowest 10%)</span></h4>${barChart(waits,labels,{fmt:v=>v<1?Math.round(v*60)+'s':v.toFixed(v<10?1:0)+'m',hot:sorted})}
  <h4>POINTS / SEC OVER TIME <span class="tm-sub">(log scale, x = game hours)</span></h4>${lineChart([{name:'points/sec',color:'#a0a8ff',pts:ppsPts}],{yfmt:v=>'1e'+v.toFixed(0),xfmt:v=>v.toFixed(1)+'h'})}
  <h4>LONGEST WAITS</h4><table><tr><th>wait</th><th>before</th><th>at</th></tr>${a.gaps.map(g=>`<tr class="hot"><td>${fmtT(g.gap)}</td><td>${esc(g.name)}</td><td>${fmtT(g.t)}</td></tr>`).join('')}</table>
  <h4>MATCHING LEVELS</h4><table><tr><th>lvl</th><th>done at</th><th>waited for unlock</th></tr>${a.matches.map(m=>`<tr${m.waitAfterPrev>1800?' class="hot"':''}><td>${m.L}</td><td>${fmtT(m.t)}</td><td>${m.waitAfterPrev==null?'—':fmtT(m.waitAfterPrev)}</td></tr>`).join('')||'<tr><td colspan=3 class="tm-sub">none yet</td></tr>'}</table>
  <h4>ALIENS</h4><table><tr><th>#</th><th>reached</th><th>wait</th></tr>${a.aliens.map((x,i)=>`<tr${sorted.includes(i)?' class="hot"':''}><td>${x.n}</td><td>${fmtT(x.t)}</td><td>${fmtT(x.wait)}</td></tr>`).join('')}</table>
  <h4>SKILL TREE HUBS</h4><table><tr><th>hub</th><th>at</th><th>cost</th></tr>${a.hubs.map(h=>`<tr><td>${esc(h.name)}</td><td>${fmtT(h.t)}</td><td>💎${fmtN(h.cost)}</td></tr>`).join('')||'<tr><td colspan=3 class="tm-sub">none yet</td></tr>'}</table>`;
}
let cmpA=null,cmpB='current';
function savedRuns(){return lsGet(LS.runs,[]);}
function compactRun(r){return{id:r.id,name:r.name,version:r.version,gameT:r.gameT,settings:r.settings,milestones:milestoneMap(r),flow:analyse(r).flow,
  aliens:analyse(r).aliens.map(x=>[x.n,x.t]),perf:r.perf.slice(-1)};}
function viewCompare(){
  const runs=savedRuns();const pick=id=>id==='current'?compactRun(run):runs.find(r=>String(r.id)===String(id));
  if(cmpA==null&&runs.length)cmpA=runs[runs.length-1].id;
  const opt=sel=>`<option value="current"${sel==='current'?' selected':''}>● current run</option>`+runs.map(r=>`<option value="${r.id}"${String(sel)===String(r.id)?' selected':''}>${esc(r.name)} (v${esc(r.version)})</option>`).join('');
  const A=cmpA!=null?pick(cmpA):null,B=pick(cmpB);
  let body='<div class="tm-sub" style="margin-top:8px">Save a run (RUN tab → 💾) to compare it with another.</div>';
  if(A&&B){
    const keys=Object.keys(Object.assign({},A.milestones,B.milestones)).filter(k=>/^(alien:(\d+)|match:\d+|skill:mt_(effects|key|piano|groove|arrangement|mastering)|track:1)$/.test(k)&&(!k.startsWith('alien:')||+k.split(':')[1]%5===0||+k.split(':')[1]<=4))
      .sort((p,q)=>Math.min(A.milestones[p]??1e12,B.milestones[p]??1e12)-Math.min(A.milestones[q]??1e12,B.milestones[q]??1e12));
    const nice=k=>k.replace('alien:','Alien #').replace('match:','Matching L').replace('skill:mt_','★ ').replace('track:1','Sequencer');
    body=lineChart([{name:'A: '+A.name,color:'#00ff88',pts:A.aliens.map(([n,t])=>[n,t/3600])},{name:'B: '+B.name,color:'#ff66aa',pts:B.aliens.map(([n,t])=>[n,t/3600])}],{yfmt:v=>v.toFixed(1)+'h',xfmt:v=>'#'+Math.round(v)})
      +`<div class="tm-sub">Hours to reach each alien (lower = faster).</div>
      <div class="tm-cards" style="margin-top:6px"><div class="tm-card"><i>Flow A</i><b>${A.flow??'—'}</b></div><div class="tm-card"><i>Flow B</i><b>${B.flow??'—'}</b></div><div class="tm-card"><i>Length</i><b>${fmtT(A.gameT)} / ${fmtT(B.gameT)}</b></div></div>
      <table style="margin-top:8px"><tr><th>milestone</th><th>A</th><th>B</th><th>B vs A</th></tr>${keys.map(k=>{const a=A.milestones[k],b=B.milestones[k];const d=(a!=null&&b!=null&&a>0)?Math.round((b/a-1)*100):null;
        return `<tr${d!=null&&Math.abs(d)>=50?' class="hot"':''}><td>${nice(k)}</td><td>${a==null?'—':fmtT(a)}</td><td>${b==null?'—':fmtT(b)}</td><td>${d==null?'':(d>0?'+':'')+d+'%'}</td></tr>`;}).join('')}</table>`;
  }
  return `<div class="tm-row"><label>A <select data-cmp="A" style="width:100%">${opt(cmpA)}</select></label></div><div class="tm-row"><label>B <select data-cmp="B" style="width:100%">${opt(cmpB)}</select></label></div>${body}
    ${runs.length?`<h4>SAVED RUNS</h4><table>${runs.map(r=>`<tr><td>${esc(r.name)}</td><td>v${esc(r.version)}</td><td>${fmtT(r.gameT)}</td><td><button class="tm-b" data-del="${r.id}">✕</button></td></tr>`).join('')}</table>`:''}`;
}
function viewCheats(){
  return `<div class="tm-sub">Cheats change the TEST save only. Logged as notes so the time table stays honest.</div>
  <h4>POINTS</h4><div class="tm-row"><button class="tm-b" data-cheat="pts10">×10 points</button><button class="tm-b" data-cheat="ptsNext">enough for next alien</button><button class="tm-b" data-cheat="pts1e6">+1M</button></div>
  <h4>GEMS</h4><div class="tm-row"><button class="tm-b" data-cheat="gems100">+100 💎</button><button class="tm-b" data-cheat="gems10k">+10K 💎</button><button class="tm-b" data-cheat="gemsx10">×10 💎</button></div>
  <h4>JUMP AHEAD (runs the bot at MAX speed until…)</h4><div class="tm-row"><button class="tm-b" data-cheat="jump20">20 aliens (2nd half)</button><button class="tm-b" data-cheat="jump40">40 aliens</button><button class="tm-b" data-cheat="jumpM5">match level 5</button></div>
  <h4>UNLOCKS</h4><div class="tm-row"><button class="tm-b" data-cheat="music">Unlock whole Musical Toolkit</button><button class="tm-b" data-cheat="tree">Unlock whole skill tree</button><button class="tm-b" data-cheat="tracks">6 tracks + all sounds</button></div>
  <h4>MISC</h4><div class="tm-row"><button class="tm-b" data-cheat="energy">Fill sequencer energy</button><button class="tm-b" data-cheat="wipeRuns">Delete saved runs</button></div>`;
}
const perfLiveHtml=()=>{const p=perfNow();return `<div class="tm-cards">${[['FPS',p.fps],['Frame p95',p.p95+' ms'],['Worst frame',p.longest+' ms'],['Late steps',p.late+(p.late?' ('+p.maxLate+'ms)':'')],['Voices/sec',p.voices],['FX channels',p.buses]].map(([i,b])=>`<div class="tm-card"><i>${i}</i><b>${b}</b></div>`).join('')}</div><div class="tm-sub" style="margin-top:6px">Audio: ${esc(p.audio)} · JS heap ${p.heap}</div>`;};
function viewPerf(){
  const res=run.perf.slice().reverse();
  return `<div id="tmPerfLive">${perfLiveHtml()}</div>
  <div class="tm-row" style="margin-top:8px">${tog('overlay','Show overlay on screen')}<button class="tm-b" data-a="resetPerf">reset counters</button></div>
  <div class="tm-sub">Device: ${esc(deviceInfo())}</div>
  <h4>STRESS TEST</h4><div class="tm-sub">Renders a heavy song (6 tracks with effects + 3 piano roll chord layers) as fast as this device can, then plays 2 bars live. "× real time" is how much headroom the audio has: under 2× busy songs may crackle.</div>
  <div class="tm-row"><button class="tm-b tm-go" data-a="stress">▶ RUN STRESS TEST</button></div>
  ${res.length?`<table><tr><th>when</th><th>audio</th><th>fps</th><th>worst</th><th>result</th></tr>${res.map(r=>`<tr><td>${esc((r.at||'').slice(11,16))}</td><td>${r.offlineX??'—'}×</td><td>${r.fps??'—'}</td><td>${r.maxFrame??'—'} ms</td><td>${esc(r.verdict)}</td></tr>`).join('')}</table>`:''}
  <div class="tm-sub" style="margin-top:6px">Results are saved in the run, so they come along in the JSON export and the copied summary.</div>`;
}

// ── actions ──
function download(name,text,type){const b=new Blob([text],{type});if(typeof downloadBlob==='function')downloadBlob(b,name);else{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();}}
function toCSV(){const H=['game_sec','game_time','category','name','cost','currency','points_per_sec','gems_per_min','aliens','wait_sec'];
  return [H.join(',')].concat(run.events.map(e=>[e.t,fmtClock(e.t),e.cat,'"'+String(e.name).replace(/"/g,'""')+'"',e.cost??'',e.cur,e.pps,e.gpm,e.al,e.wait].join(','))).join('\n');}
function newRun(){
  if(autoplay)stopAutoplay();
  if(!confirm('Start a fresh run? This wipes the TEST save in this slot (your real saves are not touched).'))return;
  const slot=activeSlot>=0?activeSlot:0;
  // leave first (leaving saves the current game), THEN write the fresh save, then start it
  if(activeSlot>=0&&typeof goToHomeScreen==='function')goToHomeScreen();
  writeSlot(slot,defaultSave());
  startGame(slot);
  run=newRunObj();run.snap=snap();feed.length=0;match=null;simAcc=0;dotAcc=0;lastSampleT=-1e9;running=false;saveRun();render();say('Fresh test run ready');
}
function cheat(k){
  if(activeSlot<0){say('Start a game first');return;}
  const note=t=>logEvent('note','🛠 '+t,null,'','cheat');
  const jump=(cond,label)=>{opts.speed='max';const keep={a:opts.stopAliens,m:opts.stopMatch};opts.stopAliens=cond.a||'';opts.stopMatch=cond.m||'';
    note('jump to '+label);startAutoplay();const w=setInterval(()=>{if(!autoplay){clearInterval(w);opts.stopAliens=keep.a;opts.stopMatch=keep.m;saveOpts();say('Reached '+label);}},300);};
  ({pts10:()=>{score*=10;note('×10 points');},ptsNext:()=>{score=Math.max(score,alienCost(totalAliens));note('points for next alien');},pts1e6:()=>{score+=1e6;note('+1M points');},
    gems100:()=>{alienGems+=100;note('+100 gems');},gems10k:()=>{alienGems+=1e4;note('+10K gems');},gemsx10:()=>{alienGems*=10;note('×10 gems');},
    jump20:()=>jump({a:20},'20 aliens'),jump40:()=>jump({a:40},'40 aliens'),jumpM5:()=>jump({m:5},'match level 5'),
    music:()=>{skillTreeUnlocked=true;for(let p=0;p<20;p++)SKILL_TREE_NODES.forEach(n=>{if(n.id.startsWith('mt_')||['core','sun_points','neural_tap_1'].includes(n.id))if(!unlockedSkills[n.id]&&n.requires.every(r=>unlockedSkills[r])){unlockedSkills[n.id]=true;}});applyMusicUnlocks();note('unlock Musical Toolkit');},
    tree:()=>{skillTreeUnlocked=true;for(let p=0;p<25;p++)SKILL_TREE_NODES.forEach(n=>{if(!n.placeholder&&!unlockedSkills[n.id]&&n.requires.every(r=>unlockedSkills[r])){unlockedSkills[n.id]=true;if(n.soundUnlock)unlockPlanetSound(n.soundUnlock);}});applyMusicUnlocks();note('unlock whole skill tree');},
    tracks:()=>{quietly(()=>{while(drum.seqTracks<MAX_SEQ_TRACKS){score+=seqTrackCost(drum.seqTracks);buySeqTrack();}while(drum.extraSounds<EXTRA_SOUNDS_ORDER.length){score+=soundLibCost(drum.extraSounds);buyNextSound();}while(drum.pads<8){score+=PAD_COSTS[drum.pads];buyNextPad();}});if(!seqPlaying){seqEnergy=SEQ_ENERGY_MAX;startSeq();}note('6 tracks + all sounds');},
    energy:()=>{seqEnergy=SEQ_ENERGY_MAX;try{updateEnergyUI();}catch(e){}if(!seqPlaying&&drum.seqTracks)startSeq();},
    wipeRuns:()=>{if(confirm('Delete all saved runs?'))lsSet(LS.runs,[]);}}[k]||(()=>{}))();
  run.snap=snap(); // cheats don't show up as purchases
  try{renderUI();updateGemDisplays();renderSkillTree&&renderSkillTree();autoSave();}catch(e){}
  saveRun();render();
}
panel.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab],[data-a],[data-opt],[data-cheat],[data-del]');if(!t)return;
  if(t.dataset.tab){tab=t.dataset.tab;render();return;}
  if(t.dataset.opt){const v=t.dataset.v;opts[t.dataset.opt]=isNaN(+v)?v:+v;saveOpts();render();return;}
  if(t.dataset.cheat){cheat(t.dataset.cheat);return;}
  if(t.dataset.del){lsSet(LS.runs,savedRuns().filter(r=>String(r.id)!==t.dataset.del));render();return;}
  const a=t.dataset.a;
  if(a==='close'){panel.classList.remove('open');return;}
  if(a==='autoStart'){startAutoplay();say('Autoplay started');}
  else if(a==='autoStop')stopAutoplay('stopped by you');
  else if(a==='record'){if(activeSlot<0){say('Open a save slot first');return;}running=true;if(!run.snap)run.snap=snap();lastManual=performance.now();setTapper();say('Recording your play');}
  else if(a==='pause'){running=false;setTapper();saveRun();}
  else if(a==='newRun')newRun();
  else if(a==='saveRun'){const name=prompt('Name this run',run.name);if(name==null)return;run.name=name;const rs=savedRuns();rs.push(compactRun(run));while(rs.length>20)rs.shift();lsSet(LS.runs,rs);cmpB='current';cmpA=rs[rs.length-1].id;say('Saved for compare');}
  else if(a==='csv')download(`alienbuddies_test_v${VER}_${run.id}.csv`,toCSV(),'text/csv');
  else if(a==='json')download(`alienbuddies_test_v${VER}_${run.id}.json`,JSON.stringify({run,device:deviceInfo(),ua:navigator.userAgent,opts},null,1),'application/json');
  else if(a==='copy'){const t=summaryText(run);(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>say('Summary copied'),()=>{prompt('Copy this:',t);});}
  else if(a==='stress'){stressTest(t);return;}
  else if(a==='resetPerf'){perf.late=0;perf.maxLate=0;perf.longest=0;}
  render();
});
panel.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.tog){opts[t.dataset.tog]=t.checked;saveOpts();setTapper();if(t.dataset.tog==='overlay')render();}
  if(t.dataset.num){opts[t.dataset.num]=t.value===''?'':+t.value;saveOpts();setTapper();}
  if(t.dataset.cmp){if(t.dataset.cmp==='A')cmpA=t.value;else cmpB=t.value;render();}
});
// refresh heavier tabs now and then while open
setInterval(()=>{if(panel.classList.contains('open')&&(tab==='times'||tab==='compare')&&(running||autoplay))render();},4000);
setInterval(()=>{if(panel.classList.contains('open')&&tab==='perf')renderLive();},1000);
// save the run when leaving
addEventListener('pagehide',saveRun);
// tiny label on the home screen so testers know which saves they're in
(function(){const h=document.getElementById('homeScreen');if(!h)return;const t=document.createElement('div');t.style.cssText="position:absolute;top:calc(env(safe-area-inset-top,0px) + 44px);left:0;right:0;text-align:center;font-family:'Bebas Neue',sans-serif;letter-spacing:.14em;color:#00ff88;font-size:.9rem;pointer-events:none;";t.textContent='🧪 TEST MODE · SEPARATE TEST SAVES';h.appendChild(t);})();
// the game's one-time hint popups wait until autoplay is finished (they'd pause the screen mid-run)
['showHintModal'].forEach(k=>{const o=window[k];if(typeof o!=='function')return;window[k]=function(){if(autoplay)return;return o.apply(this,arguments);};});
window.TM={run:()=>run,opts,startAutoplay,stopAutoplay,analyse,summaryText,perfNow,stressTest,snap}; // handy from the browser console
render();
})();
