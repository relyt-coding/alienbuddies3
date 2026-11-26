
// ══════════════════════════════════════════════
//  SIDEWAYS PHONE + DESKTOP DAW LAYOUTS
//  phone-land : phone held sideways — slim header (score + energy per second), sequencer fills the middle, pads in one row
//  daw-wide   : desktop with the sequencer unlocked and at least one empty side FILLed — the game column spreads
//               into it. Two ⤢ FILL buttons sit in the window's top corners (v0.2.205): one press fills that side,
//               both = full screen (daw-full), holding one for 2 s goes straight to full screen.
// ══════════════════════════════════════════════
(function(){
  const B=document.body,$=id=>document.getElementById(id);
  let dawFill=null; // 'bunker' | 'shop' — which empty side the player chose to fill

  // ── points per second (real gains over the last few seconds; spending is ignored) ──
  const rateBuckets=[0,0,0,0,0];let rateNow=0;
  window._rateAdd=function(n){if(n>0&&isFinite(n))rateBuckets[rateBuckets.length-1]+=n;};
  const rateEl=document.createElement('span');rateEl.id='landRateEl';rateEl.className='land-rate';rateEl.innerHTML='+0 <span class="ju">mJ/s</span>';
  const scoreEl0=$('scoreEl');if(scoreEl0)scoreEl0.after(rateEl);
  setInterval(()=>{
    rateNow=rateBuckets.reduce((a,b)=>a+b,0)/rateBuckets.length;
    rateBuckets.shift();rateBuckets.push(0);
    if(B.classList.contains('phone-land'))rateEl.innerHTML='+'+fmtJpsH(rateNow);
  },1000);

  function isPhoneLand(){
    return !IS_DESKTOP&&B.classList.contains('game-active')&&innerWidth>innerHeight&&innerHeight<=540;
  }

  // ── phone: line the utility buttons up in the header next to BUNKER (left) and SHOP (right) ──
  const shown=e=>e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
  let placed=false;
  function placeHeaderButtons(){
    const left=['accountBtn','settingsOpenBtn','padEditToggleBtn'].map($),right=[$('partyBtn')];
    if(!B.classList.contains('phone-land')){
      if(placed){placed=false;[...left,...right].forEach(e=>{if(e){e.style.left='';e.style.right='';}});if(typeof updatePartyBtnPosition==='function')updatePartyBtnPosition();}
      return;
    }
    placed=true;
    const bb=$('openBunkerBtn'),sb=$('openStoreBtn');
    let x=bb?bb.getBoundingClientRect().right+6:10;
    left.forEach(e=>{if(!shown(e))return;e.style.right='auto';e.style.left=x+'px';x+=e.getBoundingClientRect().width+6;});
    let r=sb?innerWidth-sb.getBoundingClientRect().left+6:10;
    right.forEach(e=>{if(!shown(e))return;e.style.left='auto';e.style.right=r+'px';r+=e.getBoundingClientRect().width+6;});
  }

  // ── sequencer rows grow to use the free height (both layouts) ──
  function fitWideSeq(){
    const area=$('seqArea'),c=$('seqLayersContainer');
    if(!area||!c||!area.classList.contains('visible'))return;
    const land=B.classList.contains('phone-land');
    const base=land?20:18,max=land?34:Math.max(44,Math.round(innerHeight*.06)); // big monitors get taller steps
    const rows=c.querySelectorAll('.seq-layer-row');
    area.style.setProperty('--seq-step-h',base+'px');
    if(!rows.length||area.clientHeight<40)return;
    const sc=$('seqHScroll');if(sc){sc.classList.remove('seq-scroll');sc.style.maxHeight='';}
    let used=0;[...area.children].forEach(ch=>{const cs=getComputedStyle(ch);if(cs.display==='none'||cs.position==='absolute'||cs.position==='fixed')return;used+=ch.offsetHeight+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom);});
    const free=area.clientHeight-used-4;
    if(free<=0)return;
    const h=Math.min(max,Math.floor(base+free/rows.length));
    area.style.setProperty('--seq-step-h',h+'px');
  }
  window.fitWideSeq=fitWideSeq;

  // ── phone: pads in one row ──
  function fitLandPads(){
    const grid=$('padGrid');if(!grid)return;
    const n=Math.max(1,Math.min(8,parseInt(grid.getAttribute('data-pads'))||1));
    grid.style.setProperty('--np',n);grid.style.maxWidth='';grid.style.marginTop='';
    const H=innerHeight,W=grid.parentElement?grid.parentElement.clientWidth:innerWidth;
    let h;
    if(B.classList.contains('seq-on'))h=Math.max(54,Math.min(96,Math.round(H*.21)));
    else{
      const pa=grid.closest('.pad-area');const room=pa?pa.clientHeight:H*.5;
      h=Math.max(60,Math.min(room-4,Math.round(H*.62)));
    }
    // never let a lonely pad turn into a giant wide bar: cap the row width (pads stay at most ~1.6× wider than tall)
    const maxW=n*(h*1.6)+(n-1)*6;
    grid.style.maxWidth=maxW<W?Math.floor(maxW)+'px':'';
    grid.style.height=h+'px';
  }
  window.fitLandPads=fitLandPads;

  function syncNp(){const g=$('padGrid');if(g)g.style.setProperty('--np',Math.max(1,Math.min(8,parseInt(g.getAttribute('data-pads'))||1)));}

  // ── desktop: DAW wide / FILL (v0.2.205) ──
  // Closing both panels no longer goes full screen on its own: you get the skinny view. Each empty side has its own
  // ⤢ FILL button in that top corner of the window: press one and the game stretches into that side (about 2/3 of the
  // screen), press the other for full screen. HOLD either one for 2 s to go straight to full screen. A filled side's
  // button turns into ⤡ SHRINK to give the space back. Opening a panel takes its side back.
  const fill={bunker:false,shop:false};
  const HOLD_MS=2000;
  function mkFill(side){const b=document.createElement('button');b.className='daw-fill';b.id=side==='bunker'?'dawFillBtn':'dawFillBtnR';b.type='button';b.dataset.side=side;
    b.innerHTML='<i></i><span>⤢ FILL</span>';b.title='Click: fill this side · Hold 2 s: full screen';document.body.appendChild(b);
    let t0=0,raf=0,held=false;
    const tick=now=>{const p=Math.min(1,(now-t0)/HOLD_MS);b.style.setProperty('--hp',p.toFixed(3));
      if(p>=1){held=true;raf=0;b.style.setProperty('--hp','0');fill.bunker=fill.shop=true;update();return;}raf=requestAnimationFrame(tick);};
    b.addEventListener('pointerdown',e=>{if(e.button>0)return;held=false;if(fill[side])return;t0=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);});
    const stop=()=>{cancelAnimationFrame(raf);raf=0;b.style.setProperty('--hp','0');};
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,stop));
    b.addEventListener('click',()=>{if(held){held=false;return;}fill[side]=!fill[side];update();});
    return b;}
  const fillBtn=mkFill('bunker'),fillBtnR=mkFill('shop');
  ['collapseBunkerBtn','collapseShopBtn'].forEach(id=>{const b=$(id);b&&b.addEventListener('click',()=>{setTimeout(update,0);});});

  function updateDesktop(){
    const gs=$('gameScreen'),bv=$('bunkerView'),sv=$('storeView');
    const desk=B.classList.contains('desktop-mode')&&B.classList.contains('game-active')&&B.classList.contains('seq-on');
    const bc=!!(bv&&bv.classList.contains('sidebar-collapsed')),sc=!!(sv&&sv.classList.contains('sidebar-collapsed'));
    if(!desk){fill.bunker=fill.shop=false;}
    if(!bc)fill.bunker=false;if(!sc)fill.shop=false;   // an open panel owns its side
    const fb=desk&&bc&&fill.bunker,fs=desk&&sc&&fill.shop,wide=fb||fs;
    dawFill=fb&&!fs?'bunker':fs&&!fb?'shop':null;
    B.classList.toggle('daw-wide',wide);
    B.classList.toggle('daw-full',fb&&fs);
    if(gs){
      if(desk&&wide){
        // one side filled with the other side empty too: the game takes exactly 2/3, the last 1/3 stays blank
        // (room for something alongside later: minigames, the Vault…). Next to an open panel it just takes the empty side.
        let cols;
        if(fb&&fs)cols='0px 1fr 0px';
        else if(fb)cols=sc?'0px 2fr 1fr':'0px 1fr var(--shop-w,380px)';
        else cols=bc?'1fr 2fr 0px':'var(--bunker-w,360px) 1fr 0px';
        gs.style.gridTemplateColumns=cols;
      }else gs.style.gridTemplateColumns='';
    }
    [[fillBtn,bc,fill.bunker],[fillBtnR,sc,fill.shop]].forEach(([b,collapsed,on])=>{
      const show=desk&&collapsed&&!(fb&&fs);b.classList.toggle('show',show);   // v0.2.209: full screen has no SHRINK buttons (the BUNKER / FUSEBOX tabs take a side back)b.classList.toggle('on',!!on);
      const sp=b.querySelector('span'),txt=on?'⤡ SHRINK':'⤢ FILL';if(sp.textContent!==txt)sp.textContent=txt;});
  }

  let lastKey='';
  function update(){
    const land=isPhoneLand();
    B.classList.toggle('phone-land',land);
    updateDesktop();
    syncNp();
    const key=B.className+'|'+innerWidth+'x'+innerHeight;
    if(land)fitLandPads();
    placeHeaderButtons();
    if(key!==lastKey){
      lastKey=key;
      if(!land){const g=$('padGrid');if(g&&!B.classList.contains('pad-fit'))g.style.height='';}
      if(typeof fitPadAreaSoon==='function')fitPadAreaSoon();
      if(typeof fitSeqScroll==='function')setTimeout(fitSeqScroll,30);
      if(typeof repositionCollapseButtons==='function')setTimeout(repositionCollapseButtons,40);
      if(typeof updatePartyBtnPosition==='function')updatePartyBtnPosition();
      if(typeof updateOnboardingArrows==='function')setTimeout(updateOnboardingArrows,60);
      setTimeout(()=>{typeof clampBouncersToBounds==='function'&&clampBouncersToBounds();},120);
    }
    if(land||B.classList.contains('daw-wide'))requestAnimationFrame(fitWideSeq);
  }
  window.updateWideLayouts=update;

  new MutationObserver(()=>update()).observe(B,{attributes:true,attributeFilter:['class']});
  ['bunkerView','storeView'].forEach(id=>{const e=$(id);e&&new MutationObserver(()=>update()).observe(e,{attributes:true,attributeFilter:['class']});});
  const g=$('padGrid');g&&new MutationObserver(()=>update()).observe(g,{attributes:true,attributeFilter:['data-pads']});
  const sl=$('seqLayersContainer');sl&&new MutationObserver(()=>{if(B.classList.contains('phone-land')||B.classList.contains('daw-wide'))requestAnimationFrame(fitWideSeq);}).observe(sl,{childList:true});
  addEventListener('resize',()=>setTimeout(update,60));
  addEventListener('orientationchange',()=>setTimeout(update,300));
  setInterval(()=>{if(!document.hidden)update();},1500);
  update();
})();
