
// ══════════════════════════════════════════════
//  SIDEWAYS PHONE + DESKTOP DAW LAYOUTS
//  phone-land : phone held sideways — slim header (score + pts/sec), sequencer fills the middle, pads in one row
//  daw-wide   : desktop with the sequencer unlocked and both side panels closed — the game column spreads
//               across the whole window. With exactly one panel open, an opt-in ⤢ FILL button stretches
//               it into the empty side; opening or closing any panel resets that choice.
// ══════════════════════════════════════════════
(function(){
  const B=document.body,$=id=>document.getElementById(id);
  let dawFill=null; // 'bunker' | 'shop' — which empty side the player chose to fill

  // ── points per second (real gains over the last few seconds; spending is ignored) ──
  const rateBuckets=[0,0,0,0,0];let rateNow=0;
  window._rateAdd=function(n){if(n>0&&isFinite(n))rateBuckets[rateBuckets.length-1]+=n;};
  const rateEl=document.createElement('span');rateEl.id='landRateEl';rateEl.className='land-rate';rateEl.textContent='0 /SEC';
  const scoreEl0=$('scoreEl');if(scoreEl0)scoreEl0.after(rateEl);
  setInterval(()=>{
    rateNow=rateBuckets.reduce((a,b)=>a+b,0)/rateBuckets.length;
    rateBuckets.shift();rateBuckets.push(0);
    if(B.classList.contains('phone-land'))rateEl.textContent='+'+(typeof formatRate==='function'?formatRate(rateNow):Math.round(rateNow))+' /SEC';
  },1000);

  function isPhoneLand(){
    return !IS_DESKTOP&&B.classList.contains('game-active')&&innerWidth>innerHeight&&innerHeight<=540;
  }

  // ── phone: line the utility buttons up in the header next to BUNKER (left) and SHOP (right) ──
  const shown=e=>e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
  let placed=false;
  function placeHeaderButtons(){
    const left=['settingsOpenBtn','padEditToggleBtn'].map($),right=[$('partyBtn')];
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

  // ── desktop: DAW wide / FILL ──
  const fillBtn=document.createElement('button');fillBtn.id='dawFillBtn';fillBtn.type='button';fillBtn.textContent='⤢ FILL';
  fillBtn.title='Stretch the sequencer and pads into this empty space';
  document.body.appendChild(fillBtn);
  fillBtn.addEventListener('click',()=>{dawFill=fillBtn.dataset.side||null;update();});
  ['collapseBunkerBtn','collapseShopBtn'].forEach(id=>{const b=$(id);b&&b.addEventListener('click',()=>{dawFill=null;setTimeout(update,0);});});

  function updateDesktop(){
    const gs=$('gameScreen'),bv=$('bunkerView'),sv=$('storeView');
    const desk=B.classList.contains('desktop-mode')&&B.classList.contains('game-active')&&B.classList.contains('seq-on');
    const bc=!!(bv&&bv.classList.contains('sidebar-collapsed')),sc=!!(sv&&sv.classList.contains('sidebar-collapsed'));
    if(!desk||bc===sc)dawFill=null;
    const full=desk&&bc&&sc;
    const wide=full||!!dawFill;
    B.classList.toggle('daw-wide',wide);
    if(gs){
      if(desk&&wide){
        const l=(bc&&(full||dawFill==='bunker'))?'0px':'var(--bunker-w,360px)';
        const r=(sc&&(full||dawFill==='shop'))?'0px':'var(--shop-w,380px)';
        gs.style.gridTemplateColumns=l+' 1fr '+r;
      }else gs.style.gridTemplateColumns='';
    }
    // FILL offer: exactly one panel open, nothing filled yet
    const side=(desk&&bc!==sc&&!dawFill)?(bc?'bunker':'shop'):null;
    fillBtn.classList.toggle('show',!!side);
    if(side){
      fillBtn.dataset.side=side;
      if(side==='bunker'){fillBtn.style.left='calc(var(--bunker-w,360px) / 2)';fillBtn.style.right='auto';fillBtn.style.transform='translate(-50%,-50%)';}
      else{fillBtn.style.left='auto';fillBtn.style.right='calc(var(--shop-w,380px) / 2)';fillBtn.style.transform='translate(50%,-50%)';}
    }
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
