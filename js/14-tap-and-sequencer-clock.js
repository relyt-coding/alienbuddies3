
// ══════════════════════════════════════════════
//  TAP
// ══════════════════════════════════════════════
const PARTICLE_CAP=IS_MOBILE_DEVICE?8:20;
function spawnParticle(x,y,text,hex){
  const existing=document.querySelectorAll('.particle');
  if(existing.length>=PARTICLE_CAP)existing[0].remove();
  const el=document.createElement('div');el.className='particle';el.textContent=text;el.style.color=hex;el.style.left=(x-20+Math.random()*20-10)+'px';el.style.top=(y-40)+'px';document.body.appendChild(el);setTimeout(()=>el.remove(),800);}
function gameViewCenter(){
  if(document.body.classList.contains('desktop-mode')){
    const gv=document.getElementById('gameView');
    if(gv){const r=gv.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
  }
  return{x:window.innerWidth/2,y:window.innerHeight/2};
}


function doTap(coords){
  // Pad taps feed the DRUMPAD tracker (left). Sequencer steps are scored separately in scoreSeqStep().
  const mult=totalMultiplier();const cpt=clicksPerTap();
  score+=mult*cpt;
  const anims=[];for(let c=0;c<cpt;c++)addDotToTier(0,anims);
  scoreEl.classList.add('flash');setTimeout(()=>scoreEl.classList.remove('flash'),85);
  requestRender(anims[anims.length-1]);
  const h=highestActive();
  if(!coords.silent){
    spawnParticle(coords.x||window.innerWidth/2,coords.y||window.innerHeight/2,`+${formatNum(mult*cpt)}`,color(Math.max(0,h)).hex);
  }
}
function getElCenter(id){
  const el=document.getElementById(id);
  if(!el)return null;
  const r=el.getBoundingClientRect();
  // If element has no size (hidden/display:none), return null so we fall back to tap coords
  if(r.width===0&&r.height===0)return null;
  return{x:r.left+r.width/2,y:r.top+r.height/2};
}

// ── CHAIN ──
function addDotToTier(i,anims){
  if(!drumTrackerActive)return; // tracker not activated yet
  ensureTiers(i+1);const tier=tiers[i];tier.litDots++;
  anims.push({src:'manual',tier:i,dot:tier.litDots-1});
  if(tier.litDots>=DOTS){tier.litDots=0;if(!tier.multiplierActive){tier.multiplierActive=true;flashBuy(color(i).hex);ensureTiers(i+2);playSfxTierUnlock(i);}addDotToTier(i+1,anims);}
}
function addDotToAutoTier(i,anims){
  ensureAutoTiers(i+1);const tier=autoTiers[i];tier.litDots++;
  anims.push({src:'auto',tier:i,dot:tier.litDots-1});
  if(tier.litDots>=DOTS){tier.litDots=0;if(!tier.multiplierActive){tier.multiplierActive=true;playSfxTierUnlock(i);ensureAutoTiers(i+2);}addDotToAutoTier(i+1,anims);}
}

// ══════════════════════════════════════════════
//  AUTO CLICKER
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  SEQUENCER = METRONOME AUTO-CLICKER
//  Every sequencer step scores while it plays (notes or no notes). Each step is worth 100/BPM of a click,
//  so raising or lowering the BPM never changes points per second. Steps feed the SEQUENCER tracker (right).
// ══════════════════════════════════════════════
const SEQ_BASE_BPM=100;
const SEQ_PARTICLES_PER_SEC=IS_MOBILE_DEVICE?3:5;
const SEQ_CATCHUP_MAX_MS=30*60*1000;
const SEQ_LOOKAHEAD_MS=100; // sounds are scheduled this far ahead on the audio clock so UI work can't push them off the beat
const SEQ_WORKER_TICK_MS=15; // longest stretch of missed steps we'll credit after a browser freeze
let _seqDotAccum=0;
function seqStepScale(){return SEQ_BASE_BPM/Math.max(1,seqBpm);}
function seqStepsPerSec(){return seqBpm/15;} // 16th-note steps
function seqEarningsPerSec(){return seqStepsPerSec()*seqStepScale()*seqStepMultiplier()*clicksPerTap();}
function scoreSeqStep(quiet){
  const cpt=clicksPerTap(),sc=seqStepScale();
  const gain=seqStepMultiplier()*cpt*sc;
  score+=gain;
  // dots advance by the same BPM-scaled amount so tier progress per second is BPM-independent too
  _seqDotAccum+=cpt*sc;
  const anims=[];
  while(_seqDotAccum>=0.999999){_seqDotAccum-=1;addDotToAutoTier(0,anims);}
  if(quiet)return;
  _autoParticleAccum+=Math.min(1,SEQ_PARTICLES_PER_SEC/seqStepsPerSec());
  if(_autoParticleAccum>=1){
    _autoParticleAccum-=1;
    const pos=getElCenter('autoTiersContainer')||getElCenter('autoTiersCol')||getElCenter('tiersContainer');
    if(pos){const h=highestActiveSeq();spawnParticle(pos.x,pos.y,`+${formatRate(gain)}`,color(Math.max(0,h)).hex);}
  }
  requestRender(anims[anims.length-1]);
}

// Sequencer clock: one tick per 16th-note step. Runs in a Web Worker because browsers throttle normal timers
// in hidden tabs but not worker timers. Falls back to setInterval if workers are unavailable.
let _seqAudioNext=0,_seqClockWorker=null,_seqClockTimer=null,_seqNextDue=0,_seqRunning=false,_seqHidePaused=false;
function seqStepMs(){return (60/seqBpm/4)*1000;}
function _seqMakeWorker(ms){ // ms = poll interval
  try{
    const src='let t=null;onmessage=function(e){if(t){clearInterval(t);t=null;}if(e.data&&e.data.ms){t=setInterval(function(){postMessage(1);},e.data.ms);}};';
    const w=new Worker(URL.createObjectURL(new Blob([src],{type:'application/javascript'})));
    w.onmessage=function(){_seqClockTick();};
    w.postMessage({ms:ms});
    return w;
  }catch(e){return null;}
}
function seqClockStart(){
  seqClockStop();
  const ms=seqStepMs();
  _seqNextDue=performance.now()+SEQ_LOOKAHEAD_MS;
  _seqAudioNext=getCtx().currentTime+SEQ_LOOKAHEAD_MS/1000; // sound grid lives on the audio clock (sample-accurate)
  _seqRunning=true;
  const poll=Math.max(8,Math.min(SEQ_WORKER_TICK_MS,ms/2));
  _seqClockWorker=_seqMakeWorker(poll);
  if(!_seqClockWorker)_seqClockTimer=setInterval(_seqClockTick,poll);
}
function seqClockStop(){
  _seqRunning=false;
  if(_seqClockWorker){try{_seqClockWorker.postMessage({ms:0});_seqClockWorker.terminate();}catch(e){}_seqClockWorker=null;}
  if(_seqClockTimer){clearInterval(_seqClockTimer);_seqClockTimer=null;}
}
function _seqClockTick(){
  if(!_seqRunning)return;
  const now=performance.now(),ms=seqStepMs();
  // collect every step whose time falls inside [now .. now+lookahead]; each carries its exact due time
  const dues=[];
  while(_seqNextDue<=now+SEQ_LOOKAHEAD_MS&&dues.length<1000000){dues.push(_seqNextDue);_seqNextDue+=ms;}
  if(!dues.length)return;
  const cap=Math.max(1,Math.floor(SEQ_CATCHUP_MAX_MS/ms));
  if(dues.length>cap){dues.splice(0,dues.length-cap);_seqNextDue=now+ms;}
  const ctxNow=getCtx().currentTime;
  for(let i=0;i<dues.length;i++){
    const delay=dues[i]-now;           // ms from now until this step should sound (performance clock)
    const late=delay<-40;              // steps already well in the past (frozen tab etc.) still score but stay silent
    // sounds use an evenly spaced grid on the audio clock so spacing is exact no matter when the tick ran
    if(_seqAudioNext<ctxNow-0.04)_seqAudioNext=ctxNow+Math.max(0,delay)/1000; // fell behind: resync
    const at=_seqAudioNext;_seqAudioNext+=ms/1000;
    seqRunStep(late,Math.max(0,(at-ctxNow)*1000),at);
  }
  if(dues.length>1)requestRender();
}

