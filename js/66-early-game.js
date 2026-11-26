// ══════════════════════════════════════════════
//  THE FIRST FEW MINUTES ("level 1")
//
//  • BUNKER and SHOP stay hidden until your first buddy hatches (phone buttons, page swipes, desktop side tabs), then arrive
//    with their own cutscene (js/65 "nav" mode: the camera pulls back and the two pages fly in and build).
//    When the hatch window closes they pop in, BUNKER first, and BUNKER glows until you visit your buddy's home.
//  • The first buddy comes to you: at 500 points an egg rolls onto the drum pads screen next to the score, wearing a
//    1,000 price tag. It wobbles more (and cracks a little more) the closer you get; at 1,000 it glows and bounces.
//    Tap it and it flies up into the hatch window (the same loot-box reveal as every egg).
//  • The sequencer is teased from the very start: a dashed outline where it will live, with its 100,000 price and a
//    thin progress line. Tap it to hear the beat you'll get. Once you can afford it, the outline glows and a light
//    runs along its steps; tap to unlock (it starts with a hi-hat beat that already plays itself).
//  • SHOP glows (with a little dot) whenever something new in it becomes affordable, until you look.
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList,$=id=>document.getElementById(id);
  const isDesk=()=>B.contains('desktop-mode');
  const active=()=>B.contains('game-active');
  const K=()=>window.US_KIT;
  function snd(fn,vol){const k=K();if(!k||!k.mixer||(typeof sfxOn!=='undefined'&&!sfxOn))return;try{const S=k.mixer(vol||.7);if(S)fn(k,S,S.t);}catch(e){}}
  let holdUntil=0;   // just after tapping the egg, its hatch window is about to open
  const blockedByOverlay=()=>{const er=$('eggReveal');return performance.now()<holdUntil||!!(er&&er.classList.contains('on'))||B.contains('stats-open')||(typeof newFileIntroRunning==='function'&&newFileIntroRunning());};

  // ══════════ BUNKER + SHOP: locked until the first buddy ══════════
  let wasLocked=false,revealPending=false,bunkerNew=false;
  function setTabs(){
    if(!isDesk())return;
    const bv=$('bunkerView'),sv=$('storeView');
    [bv,sv].forEach(v=>v&&v.classList.add('sidebar-collapsed'));
    if(typeof updateCollapseBtn==='function'){updateCollapseBtn('shop',true);updateCollapseBtn('bunker',true);}
    if(typeof repositionCollapseButtons==='function')setTimeout(repositionCollapseButtons,350);
  }
  function applyNavLock(){
    const lock=active()&&typeof totalAliens!=='undefined'&&totalAliens<1;
    if(lock){
      if(!B.contains('nav-locked')){
        B.add('nav-locked');wasLocked=true;
        if(B.contains('store-open')&&typeof closeStore==='function')closeStore();
        if(B.contains('bunker-open')&&typeof closeBunker==='function')closeBunker();
        if(!(typeof newFileIntroRunning==='function'&&newFileIntroRunning()))setTabs();
      }
      return;
    }
    if(!B.contains('nav-locked'))return;
    if(!active()){B.remove('nav-locked');wasLocked=false;return;}
    // the first buddy is here: wait for its hatch window (and naming) to close, then bring the buttons in
    if(blockedByOverlay()){revealPending=true;return;}
    if(wasLocked)B.add('buddy-hold');   // v0.2.161: the new buddy stays hidden until the bunker/shop cutscene is over
    B.remove('nav-locked');revealPending=false;
    if(wasLocked)revealNav();
    wasLocked=false;
  }
  // v0.2.161: after the nav cutscene the first buddy pops in (it was flashing on screen for a moment before it)
  let holdT=0;
  function releaseBuddies(){
    clearTimeout(holdT);if(!B.contains('buddy-hold'))return;
    B.remove('buddy-hold');
    // v0.2.166: it floats in from the edge at its normal speed (a natural entrance) instead of popping up
    if(typeof floatBuddiesIn==='function')try{floatBuddiesIn();}catch(e){}
  }
  window.releaseBuddies=releaseBuddies;
  function revealNav(){
    bunkerNew=true;holdT=setTimeout(releaseBuddies,15000);   // (never stuck hidden)
    // v0.2.156: the BUNKER and SHOP get their own cutscene: the camera pulls back from the pads and the two pages fly
    // in and build themselves on either side (js/65, 'nav' mode). The buttons are simply there when it hands back.
    if(typeof playNewFileIntro==='function'&&!(typeof unlockCutsceneRunning==='function'&&unlockCutsceneRunning())&&playNewFileIntro({mode:'navB',onDone:()=>{setTimeout(releaseBuddies,150);if(isDesk()&&typeof repositionCollapseButtons==='function')repositionCollapseButtons();if(typeof openNewlyUnlocked==='function')openNewlyUnlocked('bunker');}}))return;
    setTimeout(releaseBuddies,400);
    B.remove('nav-reveal');void document.body.offsetWidth;B.add('nav-reveal');
    setTimeout(()=>B.remove('nav-reveal'),1600);
    if(isDesk()&&typeof repositionCollapseButtons==='function')repositionCollapseButtons();
    bunkerNew=true;
    // two bright "here you go" notes, one per button
    snd((k,S,t)=>{[[0,659.25],[.45,987.77]].forEach(([d,f])=>{k.tone(S,t+d,f,{type:'triangle',a:.05,d:.45,rv:.5});k.tone(S,t+d+.06,f*1.5,{a:.025,d:.5,rv:.5});});},1.6);
  }
  window.navLockApply=applyNavLock;
  document.addEventListener('egg-reveal-closed',()=>{holdUntil=0;setTimeout(applyNavLock,120);});

  // BUNKER glows until you open it; SHOP glows while something in it is newly affordable
  let dealSeen=new Set();
  function affordableKeys(){
    return [...document.querySelectorAll('#storeView .buyable, #storeView .lock-btn.affordable')]
      .filter(e=>e.getClientRects().length)
      .map(e=>(e.id||'')+'|'+(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,60));
  }
  function shopVisible(){return B.contains('store-open')||(isDesk()&&$('storeView')&&!$('storeView').classList.contains('sidebar-collapsed'));}
  function bunkerVisible(){return B.contains('bunker-open')||(isDesk()&&$('bunkerView')&&!$('bunkerView').classList.contains('sidebar-collapsed'));}
  function paintGlows(){
    const sb=$('openStoreBtn'),st=$('collapseShopBtn'),bb=$('openBunkerBtn'),bt=$('collapseBunkerBtn');
    if(!active()||B.contains('nav-locked')){[sb,st].forEach(e=>e&&e.classList.remove('nb-deal'));[bb,bt].forEach(e=>e&&e.classList.remove('nb-new'));return;}
    const keys=affordableKeys();
    if(shopVisible())keys.forEach(k=>dealSeen.add(k));
    const deal=!shopVisible()&&keys.some(k=>!dealSeen.has(k));
    [sb,st].forEach(e=>e&&e.classList.toggle('nb-deal',deal));
    if(bunkerVisible())bunkerNew=false;
    [bb,bt].forEach(e=>e&&e.classList.toggle('nb-new',bunkerNew));
  }

  // ══════════ THE FIRST EGG, ON THE DRUM PADS SCREEN ══════════
  const EGG_AT=100;   // v0.2.193: the egg rolls in at 10 mJ and hatches at 25 mJ (alienCost(0))
  let egg=null,eggOn=false,eggPick=null,eggRaf=0,eggCrack=-1,eggReady=false,eggShake=0,eggT0=0,eggFlying=false;
  function eggCost(){return typeof alienCost==='function'?alienCost(0):1000;}
  function eggPal(){
    const L=typeof buddyBaseSpec==='function'?buddyBaseSpec(eggPick):{body:'#7fe3c0',tip:'#ff9ccf',eye:'#9fc5ff'};
    return [L.body,L.tip,L.eye,L.foot||L.body];
  }
  function buildEgg(){
    egg=document.createElement('div');egg.id='padEgg';
    egg.innerHTML='<div class="pe-glow"></div><div class="pe-body"><canvas></canvas></div><div class="pe-tag"></div>';
    $('gameView').appendChild(egg);
    egg.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();tapEgg();});
  }
  // v0.2.147: until the first buddy hatches, the sequencer's spot is an empty stage and the egg sits in the middle of it
  function eggStage(){const t=$('seqTeaser');return !B.contains('phone-land')&&B.contains('nav-locked')&&t&&t.style.display!=='none'&&t.offsetWidth>0?t:null;}
  function eggSize(){if(eggStage())return isDesk()?{w:84,h:104}:{w:76,h:94};return B.contains('phone-land')?{w:30,h:38}:isDesk()?{w:58,h:72}:{w:52,h:64};}
  function paintEggCanvas(crack){
    const cv=egg.querySelector('canvas'),S=eggSize(),k=Math.min(2,window.devicePixelRatio||1),W=S.w+12,H=S.h+12;
    cv.width=Math.round(W*k);cv.height=Math.round(H*k);cv.style.width=W+'px';cv.style.height=H+'px';
    const g=cv.getContext('2d');g.setTransform(k,0,0,k,0,0);g.clearRect(0,0,W,H);
    if(typeof paintBuddyEgg==='function')paintBuddyEgg(g,W/2,H/2,S.w/2,S.h/2,0,!!(eggPick&&eggPick.sp!=null),crack,eggPal(),k);
  }
  function placeEgg(){
    const se=$('scoreEl'),gv=$('gameView');if(!se||!gv||!egg||eggFlying)return;
    // the score's text (the element itself can be the full width)
    let r;try{const rg=document.createRange();rg.selectNodeContents(se);r=rg.getBoundingClientRect();}catch(e){}
    if(!r||!r.width)r=se.getBoundingClientRect();
    const op=egg.offsetParent||gv,o=op.getBoundingClientRect(),ew=egg.offsetWidth||64,ch=(egg.querySelector('canvas').offsetHeight)||76;
    // just right of the score, centred on it (never off the edge)
    const gr=gv.getBoundingClientRect();
    const stg=eggStage();
    if(stg){const sr=stg.getBoundingClientRect(),eh=egg.offsetHeight||ch+24;
      egg.style.left=(sr.left+sr.width/2-ew/2-o.left).toFixed(1)+'px';egg.style.top=(sr.top+sr.height/2-eh/2-o.top).toFixed(1)+'px';return;}
    const land=B.contains('phone-land');
    let x=r.right+Math.max(16,Math.min(36,r.height*.45)),maxX=Math.min(window.innerWidth,gr.right)-ew-10;
    // sideways phone: the score row is short and busy on the right, so it waits on the left of the score
    if(land||x>maxX)x=Math.max(gr.left+10,r.left-ew-(land?10:18));
    egg.style.left=(x-o.left).toFixed(1)+'px';egg.style.top=(Math.max(2,r.top+r.height/2-ch/2)-o.top).toFixed(1)+'px';
  }
  function showEgg(){
    if(!egg)buildEgg();
    if(!eggPick&&typeof buddyPickFor==='function'){const a0=alienData[0];eggPick=a0&&a0.base?a0.base:buddyPickFor(0);}
    eggOn=true;eggCrack=-1;eggT0=performance.now();egg.style.display='';egg.className='rolling';
    egg.querySelector('.pe-tag').innerHTML=fmtJh(eggCost());
    paintEggCanvas(0);placeEgg();
    setTimeout(()=>{if(egg)egg.classList.remove('rolling');},1250);
    // a soft roll, and a little "tok" as it settles
    snd((k,S,t)=>{k.noise(S,t,{f0:300,f1:900,q:.8,a:.025,k:.9,d:.2});k.tone(S,t+.95,520,{f1:300,gl:.06,a:.08,d:.08});k.noise(S,t+.95,{type:'highpass',f0:3000,a:.04,d:.03});},.9);
    cancelAnimationFrame(eggRaf);eggRaf=requestAnimationFrame(eggFrame);
  }
  function hideEgg(){eggOn=false;cancelAnimationFrame(eggRaf);if(egg){egg.style.display='none';egg.className='';}}
  // it wobbles in little bursts that come faster and bigger the closer you get; ready = a happy bounce
  function eggFrame(now){
    if(!eggOn||!egg)return;eggRaf=requestAnimationFrame(eggFrame);
    if(eggFlying)return;
    const c=eggCost(),p=Math.max(0,Math.min(1,(score-EGG_AT)/(c-EGG_AT))),ready=score>=c,t=(now-eggT0)/1000;
    if(ready!==eggReady){eggReady=ready;egg.classList.toggle('ready',ready);}
    const body=egg.querySelector('.pe-body');let rot=0,y=0;
    if(ready){const ph=t%1.5;rot=Math.sin(t*9)*7*(ph<.6?1:.25);y=ph<.35?-Math.sin(ph/.35*Math.PI)*9:0;}
    else{const per=3.2-2.1*p,ph=t%per,dur=.55;if(ph<dur){const a=4+9*p;rot=Math.sin(ph/dur*Math.PI*4)*a*(1-ph/dur);}}
    if(eggShake>0){rot+=Math.sin(t*55)*10*eggShake;eggShake=Math.max(0,eggShake-.06);}
    body.style.transform=`translateY(${y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
    if((++eggFrames)%15===0)placeEgg();
  }
  let eggFrames=0;
  function tapEgg(){
    if(!eggOn||eggFlying)return;
    if(score<eggCost()){
      // not yet: a nudge, a knock, and the price tag pops
      eggShake=1;const tg=egg.querySelector('.pe-tag');tg.classList.remove('bump');void tg.offsetWidth;tg.classList.add('bump');
      snd((k,S,t)=>{k.tone(S,t,380,{f1:240,gl:.05,a:.07,d:.06});k.noise(S,t,{type:'highpass',f0:2500,a:.03,d:.03});},.9);
      return;
    }
    // the egg you've been watching is the buddy you get
    while(alienData.length<1)alienData.push({name:'',color:''});
    if(eggPick&&!alienData[0].base)alienData[0].base=eggPick;
    const src=egg.querySelector('canvas'),r=src.getBoundingClientRect(),S=eggSize();
    window.__eggOpenOpts={landed:true,hideMs:600};holdUntil=performance.now()+1500;
    buyAlien();
    if(totalAliens<1){window.__eggOpenOpts=null;return;}
    // a copy of the egg flies up into the hatch window and lands exactly on its egg
    eggFlying=true;
    // (painted at the big size so it lands crisp; it starts scaled down to exactly cover the little one)
    const BS=Math.round(Math.min(340,innerWidth*.86,innerHeight*.5)),bw=BS*.26,bh=BS*.33,k=Math.min(2,window.devicePixelRatio||1),FW=Math.ceil(bw*2+24),FH=Math.ceil(bh*2+24);
    const fl=document.createElement('canvas');fl.id='padEggFly';fl.width=Math.round(FW*k);fl.height=Math.round(FH*k);fl.style.width=FW+'px';fl.style.height=FH+'px';
    {const g=fl.getContext('2d');g.setTransform(k,0,0,k,0,0);if(typeof paintBuddyEgg==='function')paintBuddyEgg(g,FW/2,FH/2,bw,bh,0,!!(eggPick&&eggPick.sp!=null),0,eggPal(),k);}
    const from={x:r.left+r.width/2,y:r.top+r.height/2},s0=(S.w/2)/bw;
    fl.style.left=(from.x-FW/2)+'px';fl.style.top=(from.y-FH/2)+'px';fl.style.transform=`scale(${s0.toFixed(4)})`;
    document.body.appendChild(fl);hideEgg();
    setTimeout(()=>{
      const T=typeof eggRevealTarget==='function'&&eggRevealTarget();
      const to=T||{x:innerWidth/2,y:innerHeight*.5},sc=T?T.w/bw:1;
      fl.style.transition='transform .52s cubic-bezier(.45,.05,.3,1)';
      fl.style.transform=`translate(${(to.x-from.x).toFixed(1)}px,${(to.y-from.y).toFixed(1)}px) scale(${sc.toFixed(4)})`;
      snd((k,S2,t)=>{k.noise(S2,t,{f0:600,f1:3000,q:1.2,a:.04,k:.8,d:.15});},.8);
      setTimeout(()=>{fl.remove();eggFlying=false;},610);
    },150);
  }
  function updateEgg(){
    const want=active()&&typeof totalAliens!=='undefined'&&totalAliens<1&&!B.contains('intro-run')&&!(typeof newFileIntroRunning==='function'&&newFileIntroRunning());
    if(!want){if(eggOn&&!eggFlying)hideEgg();return;}
    if(!eggOn&&score>=EGG_AT)showEgg();
    // the layout changed (turned sideways / back): repaint at the right size
    else if(eggOn&&!eggFlying){const S=eggSize(),cv=egg.querySelector('canvas');if(cv&&Math.round(parseFloat(cv.style.width))!==S.w+12){paintEggCanvas(0);placeEgg();}}
  }

  // ══════════ THE SEQUENCER TEASER ══════════
  const STARTER=[0,2,4,6,8,10,12,14];   // hi-hats on every other step (the beat you'll get; v0.2.177: no extra last step)
  window.SEQ_STARTER_STEPS=STARTER;
  const tz=$('seqTeaser');
  let tzSteps=[],demo=false,tzReady=false,chaseT=0,chaseRaf=0;
  if(tz){
    const box=$('seqTeaserSteps');
    for(let i=0;i<16;i++){const s=document.createElement('span');s.className='sqt-step'+(i%4===0?' beat':'');box.appendChild(s);tzSteps.push(s);}
    tz.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();tapTeaser();});
  }
  function tzCost(){return typeof seqTrackCost==='function'?seqTrackCost(0):100000;}
  function tapTeaser(){
    if(typeof drum==='undefined'||drum.seqTracks>0)return;
    if(score>=tzCost()){stopChase();buySeqTrack();updateTeaser();return;}
    if(demo)return;
    // a taste: one bar of the beat you'll get, with a light running along the steps
    demo=true;tz.classList.add('demo');
    const c=typeof getCtx==='function'?getCtx():null,t0=c?c.currentTime+.05:0,STEP=.15;
    STARTER.forEach(i=>{try{if(c)playSound('hihat',1,t0+i*STEP);}catch(e){}});
    tzSteps.forEach((s,i)=>{setTimeout(()=>{tzSteps.forEach(x=>x.classList.remove('lit'));s.classList.add('lit');if(STARTER.includes(i))s.classList.add('on');},50+i*STEP*1000);});
    setTimeout(()=>{tzSteps.forEach(x=>x.classList.remove('lit'));tz.classList.add('fade');
      setTimeout(()=>{tzSteps.forEach(x=>x.classList.remove('on'));tz.classList.remove('fade','demo');demo=false;},650);},50+16*STEP*1000);
  }
  // when you can afford it, a light keeps running along the steps (no sound: it's waiting for you)
  function chase(now){chaseRaf=requestAnimationFrame(chase);if(demo)return;const i=Math.floor((now-chaseT)/150)%16;tzSteps.forEach((s,k)=>s.classList.toggle('lit',k===i));}
  function startChase(){if(chaseRaf)return;chaseT=performance.now();chaseRaf=requestAnimationFrame(chase);}
  function stopChase(){cancelAnimationFrame(chaseRaf);chaseRaf=0;tzSteps.forEach(s=>s.classList.remove('lit'));}
  let tzShown=null,tzPrice='',tzHoldSeen=false;
  function updateTeaser(){
    if(!tz)return;
    const show=active()&&typeof drum!=='undefined'&&drum.seqTracks===0;
    if(show!==tzShown){tzShown=show;tz.style.display=show?'':'none';if(typeof fitPadAreaSoon==='function')fitPadAreaSoon();if(!show){stopChase();tzReady=false;tz.classList.remove('ready');}}
    if(!show)return;
    // v0.2.147: the teaser keeps its space but stays empty (the egg's stage) until BUNKER and SHOP arrive with the
    // first buddy, then fades in with them: hatching is level 1, the sequencer is level 2
    const hold=B.contains('nav-locked');
    if(hold!==tz.classList.contains('tz-hold')){tz.classList.toggle('tz-hold',hold);
      if(!hold&&tzHoldSeen){tz.classList.remove('tz-in');void tz.offsetWidth;tz.classList.add('tz-in');setTimeout(()=>tz.classList.remove('tz-in'),1600);}
      if(eggOn)setTimeout(()=>{paintEggCanvas(eggCrack<0?0:eggCrack);placeEgg();},0);}
    if(hold){tzHoldSeen=true;return;}
    const c=tzCost(),ready=score>=c;
    const pt=jHtml(c);if(pt!==tzPrice){tzPrice=pt;$('seqTeaserPrice').innerHTML=pt;}
    $('seqTeaserFill').style.width=(Math.min(1,score/c)*100).toFixed(2)+'%';
    if(ready!==tzReady){tzReady=ready;tz.classList.toggle('ready',ready);if(ready)startChase();else stopChase();}
  }

  // ══════════ keep it all up to date ══════════
  function tick(){try{applyNavLock();updateEgg();updateTeaser();paintGlows();}catch(e){console.warn('early game',e);}}
  setInterval(tick,200);
  // right as a file opens, so the buttons never flash in for a moment
  if(typeof startGame==='function'){const sg=startGame;window.startGame=function(){const r=sg.apply(this,arguments);eggPick=null;dealSeen=new Set();bunkerNew=false;tzHoldSeen=false;tick();return r;};}
  window.addEventListener('resize',()=>{if(eggOn)placeEgg();});
})();
