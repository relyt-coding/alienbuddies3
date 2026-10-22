
// ══════════════════════════════════════════════
//  BOUNCING ALIENS
// ══════════════════════════════════════════════
let showBouncers=true;
const BUNKER_SIZE=99; // 9×11 grid, scrollable
const bouncers=[];

// ── Adaptive bouncer cap based on device FPS ──
const BOUNCER_CAP_MAX=IS_MOBILE_DEVICE?15:30;
const BOUNCER_CAP_MIN=IS_MOBILE_DEVICE?3:5;
let adaptiveBouncerCap=BOUNCER_CAP_MAX;

let _adaptiveFPSActive=false; // only measure after game starts
let _wasPlayingBeforeHide=false; // track seq state across visibility changes

document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    // Page backgrounded — pause non-essential visuals
    _wasPlayingBeforeHide=seqPlaying;
    _adaptiveFPSActive=false;
    _autoParticleAccum=0;
    if(activeSlot>=0)autoSave(); // make sure progress is stored when the tab goes to the background
    if(v5Settings.earnHidden!==false){
      // "Earn while tab hidden" ON: leave the sequencer clock (worker) and audio running so music keeps earning.
    }else{
      // OFF: mute audio and stop earning until the tab is visible again (no catch-up).
      if(masterGainNode&&audioCtx){
        masterGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGainNode.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.3);
      }
      if(seqPlaying&&_seqRunning){seqClockStop();_seqHidePaused=true;}
    }
  } else {
    // Page foregrounded — resume
    _adaptiveFPSActive=activeSlot>=0;
    if(masterGainNode&&audioCtx){
      const mv=masterVol!==undefined?masterVol:1;
      masterGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGainNode.gain.linearRampToValueAtTime(mv,audioCtx.currentTime+0.3);
    }
    if(_seqHidePaused){_seqHidePaused=false;if(seqPlaying)seqClockStart();}
    requestRender();
  }
});
window.addEventListener('pagehide',()=>{if(activeSlot>=0)autoSave();});

(function initAdaptiveFPS(){
  const FPS_SAMPLE=IS_MOBILE_DEVICE?30:45;
  const FPS_DROP=IS_MOBILE_DEVICE?50:44;
  const FPS_GOOD=IS_MOBILE_DEVICE?58:56;
  const REDUCE_BY=IS_MOBILE_DEVICE?4:3;
  const RESTORE_BY=1;
  const CHECK_EVERY=IS_MOBILE_DEVICE?60:90;
  let frameTimes=[];
  let lastT=null;
  let frameCount=0;

  function tick(t){
    // Only measure while game is actually running
    if(_adaptiveFPSActive){
      if(lastT!==null){
        const dt=t-lastT;
        // Ignore spikes from tab switching or page load
        if(dt>0&&dt<200){
          frameTimes.push(dt);
          if(frameTimes.length>FPS_SAMPLE)frameTimes.shift();
        }
      }
      lastT=t;
      frameCount++;

      if(frameCount>=CHECK_EVERY&&frameTimes.length>=FPS_SAMPLE){
        frameCount=0;
        const avgDt=frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length;
        const fps=1000/avgDt;

        if(fps<FPS_DROP){
          // Laggy — reduce cap and prune excess bouncers cleanly
          adaptiveBouncerCap=Math.max(BOUNCER_CAP_MIN,adaptiveBouncerCap-REDUCE_BY);
          while(!(v5Settings&&v5Settings.moreAliens)&&bouncers.length>adaptiveBouncerCap){
            const b=bouncers.splice(bouncers.length-1,1)[0];
            if(b&&b.el&&b.el.parentNode)b.el.parentNode.removeChild(b.el);
          }
        } else if(fps>FPS_GOOD&&adaptiveBouncerCap<BOUNCER_CAP_MAX){
          // Running well — gradually restore cap
          adaptiveBouncerCap=Math.min(BOUNCER_CAP_MAX,adaptiveBouncerCap+RESTORE_BY);
        }
      }
    } else {
      // Reset measurement state while idle so we start fresh
      lastT=null;
      frameTimes=[];
      frameCount=0;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
const alienLayer=document.getElementById('alienLayer');
function getAlienColor(idx){return ALIEN_OUTLINE_COLORS[idx%ALIEN_OUTLINE_COLORS.length];}
// Snap all bouncers back inside current bounds (call after layout changes)
function clampBouncersToBounds(){
  const bounds=getBouncerBounds();
  for(const b of bouncers){
    b.x=Math.min(Math.max(b.x,bounds.x),bounds.x+bounds.w-b.sz);
    b.y=Math.min(Math.max(b.y,bounds.y),bounds.y+bounds.h-b.sz-BOUNCER_NAME_PAD);
    if(b.el)b.el.style.transform=`translate(${b.x}px,${b.y}px) scale(${b._scale||1})`;
  }
}

// Get the bounds bouncers should stay within — game view column on desktop, full screen on mobile
function getBouncerBounds(){
  if(document.body.classList.contains('desktop-mode')){
    const gv=document.getElementById('gameView');
    if(gv){const r=gv.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height};}
  }
  return{x:0,y:0,w:window.innerWidth,h:window.innerHeight};
}

// ── Which aliens bounce on screen ──
// bouncerPicks: null = automatic (first aliens you own), otherwise the alien indices you chose in the Bunker.
let bouncerPicks=null;
const BOUNCER_NAME_PAD=16; // room under each alien for its name label
function bouncerMax(){
  if(v5Settings&&v5Settings.moreAliens)return Math.max(1,Math.min(100,v5Settings.bouncerLimit||20));
  return 10;
}
function desiredBouncerIdxs(){
  let list;
  if(bouncerPicks)list=bouncerPicks.filter(i=>Number.isInteger(i)&&i>=0&&i<totalAliens);
  else{list=[];for(let i=0;i<totalAliens;i++)list.push(i);}
  list=[...new Set(list)];
  return list.slice(0,bouncerMax());
}
// Make the on-screen bouncers match the chosen set
function syncBouncers(animate=false){
  let want=desiredBouncerIdxs();
  if(!(v5Settings&&v5Settings.moreAliens))want=want.slice(0,Math.max(1,adaptiveBouncerCap)); // weak devices
  const wantSet=new Set(want);
  for(let i=bouncers.length-1;i>=0;i--){
    if(!wantSet.has(bouncers[i].idx)){
      const b=bouncers.splice(i,1)[0];
      if(b._partyTimeout)clearTimeout(b._partyTimeout);
      b._partyAnim=false;
      if(b.el&&b.el.parentNode)b.el.parentNode.removeChild(b.el);
    }
  }
  const have=new Set(bouncers.map(b=>b.idx));
  want.forEach(idx=>{if(!have.has(idx))spawnBouncer(animate,idx);});
  if(typeof refreshBunkerMarks==='function')refreshBunkerMarks();
}
function bouncerOnNewAlien(){
  // an explicit selection with room to spare picks up the new alien automatically
  if(bouncerPicks&&bouncerPicks.length<bouncerMax())bouncerPicks.push(totalAliens-1);
  syncBouncers(true);
}
function toggleBouncerPick(idx){
  const cur=desiredBouncerIdxs();
  if(cur.includes(idx))bouncerPicks=cur.filter(i=>i!==idx);
  else{
    if(cur.length>=bouncerMax()){
      showToast('Max '+bouncerMax()+' on screen — remove one first'+((v5Settings&&v5Settings.moreAliens)?'':' (Settings can raise the limit)'));
      return false;
    }
    bouncerPicks=[...cur,idx];
  }
  syncBouncers(true);autoSave();
  return true;
}
function spawnBouncer(animate=true,idx){
  if(idx===undefined)idx=bouncers.length;
  const col=getAlienColor(idx);
  const data=alienData[idx]||{name:'',color:col};
  const el=document.createElement('div');el.className='bouncer';
  const emojiSpan=document.createElement('span');emojiSpan.className='bouncer-emoji';emojiSpan.textContent='👽';
  const nameSpan=document.createElement('span');nameSpan.className='bouncer-name';nameSpan.textContent=data.name||'';nameSpan.style.color=col;nameSpan.style.display=data.name?'block':'none';
  el.appendChild(emojiSpan);el.appendChild(nameSpan);
  const filter=`drop-shadow(0 0 4px ${col}) drop-shadow(0 0 1px ${col})`;
  el.style.filter=filter;el._baseFilter=filter;el._col=col;el._nameEl=nameSpan;el._emojiEl=emojiSpan;
  if(!animate)el.style.opacity='.85';
  if(!showBouncers)el.style.display='none';
  const bounds=getBouncerBounds(),sz=32;
  const x=bounds.x+Math.random()*Math.max(1,bounds.w-sz),y=bounds.y+Math.random()*Math.max(1,bounds.h-sz-BOUNCER_NAME_PAD);
  const spd=.9+Math.random()*1.3,ang=Math.random()*Math.PI*2;
  el.style.left='0';el.style.top='0';alienLayer.appendChild(el);
  bouncers.push({el,x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,sz,idx,_nameEl:nameSpan,_col:col}); // _nameEl/_col live on the bouncer so renaming updates it instantly
}
(function tickBouncers(){
  const bounds=getBouncerBounds();
  const minX=bounds.x,minY=bounds.y,maxX=bounds.x+bounds.w,maxY=bounds.y+bounds.h;
  for(const b of bouncers){
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<=minX){b.x=minX;b.vx=Math.abs(b.vx);}
    if(b.y<=minY){b.y=minY;b.vy=Math.abs(b.vy);}
    if(b.x>=maxX-b.sz){b.x=maxX-b.sz;b.vx=-Math.abs(b.vx);}
    if(b.y>=maxY-b.sz-BOUNCER_NAME_PAD){b.y=maxY-b.sz-BOUNCER_NAME_PAD;b.vy=-Math.abs(b.vy);}
    if(showBouncers)b.el.style.transform=`translate(${b.x}px,${b.y}px) scale(${b._scale||1})`;
  }
  requestAnimationFrame(tickBouncers);
})();

// ══════════════════════════════════════════════
//  PARTY
// ══════════════════════════════════════════════
let partyBeat=0;
const partyOverlay=document.getElementById('partyOverlay');
const partyBtn=document.getElementById('partyBtn');
function startParty(){partyMode=true;partyBtn.classList.add('active');partyBtn.textContent='STOP PARTY';}
function stopParty(){
  partyMode=false;partyBtn.classList.remove('active');partyBtn.textContent='ALIEN PARTY';
  // Reset all bouncers to their base filter/transform
  bouncers.forEach(b=>{b.el.style.filter=b._baseFilter;b._scale=1;b.el.style.transform=`translate(${b.x}px,${b.y}px) scale(1)`;if(b._partyTimeout){clearTimeout(b._partyTimeout);b._partyTimeout=null;}});
  partyOverlay.classList.remove('active');partyOverlay.style.opacity='0';
}
function toggleParty(){if(partyMode)stopParty();else startParty();}

// Called every time any sound fires — pulses 2 random bouncers
function partyPulseOnBeat(){
  if(!partyMode||bouncers.length===0)return;
  const pool=[...Array(bouncers.length).keys()];
  const count=Math.min(3,bouncers.length);
  const picked=[];
  for(let i=0;i<count;i++){const ri=Math.floor(Math.random()*pool.length);picked.push(pool.splice(ri,1)[0]);}
  picked.forEach(idx=>{
    const b=bouncers[idx];if(!b||b._partyAnim)return;
    const t0=performance.now();const EXPAND=220,TOTAL=500;b._partyAnim=true;
    function step(now){
      if(!b._partyAnim)return;
      const t=now-t0;
      let p=t<EXPAND?t/EXPAND:1-((t-EXPAND)/(TOTAL-EXPAND));
      p=Math.max(0,Math.min(1,p));
      const gr=Math.round(4+28*p),sp=Math.round(1+8*p);
      b.el.style.filter=`drop-shadow(0 0 ${gr}px ${b.el._col}) drop-shadow(0 0 ${sp}px ${b.el._col})`;
      if(t<TOTAL){requestAnimationFrame(step);}
      else{b.el.style.filter=b.el._baseFilter;b._partyAnim=false;}
    }
    requestAnimationFrame(step);
  });
}
partyBtn.addEventListener('click',toggleParty);
partyBtn.addEventListener('touchend',e=>{e.preventDefault();toggleParty();});
