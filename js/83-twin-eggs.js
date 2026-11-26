// ══════════════════════════════════════════════
//  CORNER EGG (v0.2.199; was "two more eggs" v0.2.193 and "one egg by the score until the bunker is full" v0.2.198)
//  10 seconds after the first buddy hatches (and the Bunker / Shop cutscene is over), ONE egg rolls into the TOP-LEFT
//  corner of the drum pads screen. Its shell shows the buddy inside (a buddyPickFor pick) and its tag shows the price
//  (alienCost(totalAliens): buddies 2 + 3 are 50 mJ each, js/01). Tap it with enough energy and THAT buddy hatches
//  (its pick goes to alienData[n].base before buyAlien). Not enough yet: it wobbles and its tag pops; the wobble gets
//  livelier as your energy gets close. After each hatch the next egg rolls in, until you have 10 buddies; then a small
//  card says that from now on they're bought in the Shop (once per slot, localStorage ab2_eggShopNote_N).
//  The Shop's green PET ALIEN BUDDY card shows the same egg wiggling (#shopEgg), and buying there hatches that same
//  pick too (a capture listener sets the base just before js/16's buyAlien runs).
//  If the PARTY pill sits in the corner (js/72) the egg waits just under it. On computers it's the top-left of the drum pad column.
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList,$=id=>document.getElementById(id);
  const LAST=10;                                // eggs keep coming until you have this many buddies
  let lastXY=null,egg=null,pick=null,pickFor=-1,sawZero=false,readyAt=0,raf=0,t0=0,lastN=-1,shopEgg=null;
  const cost=()=>alienCost(totalAliens);
  const k_=()=>(typeof TEST_MODE!=='undefined'&&TEST_MODE?'ab2t_':'ab2_')+'eggShopNote_'+(typeof activeSlot!=='undefined'?activeSlot:0);
  function size(){return B.contains('phone-land')?{w:30,h:38}:B.contains('desktop-mode')?{w:52,h:64}:{w:44,h:54};}
  function pal(p){const L=typeof buddyBaseSpec==='function'?buddyBaseSpec(p):{body:'#7fe3c0',tip:'#ff9ccf',eye:'#9fc5ff'};return[L.body,L.tip,L.eye,L.foot||L.body];}
  function curPick(){                           // one pick per buddy number, shared by the corner egg and the Shop egg
    if(pickFor!==totalAliens||!pick){pickFor=totalAliens;pick=typeof buddyPickFor==='function'?buddyPickFor(totalAliens):null;}
    return pick;
  }
  function paintTo(cv,p,S){const k=Math.min(2,window.devicePixelRatio||1),W=S.w+12,H=S.h+12;
    cv.width=Math.round(W*k);cv.height=Math.round(H*k);cv.style.width=W+'px';cv.style.height=H+'px';
    const g=cv.getContext('2d');g.setTransform(k,0,0,k,0,0);try{paintBuddyEgg(g,W/2,H/2,S.w/2,S.h/2,0,!!(p&&p.sp!=null),0,pal(p),k);}catch(e){}}
  function make(){const el=document.createElement('div');el.className='twinEgg cornerEgg rolling';
    el.innerHTML='<div class="pe-glow"></div><div class="pe-body"><canvas></canvas></div><div class="pe-tag"></div>';
    el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();tap();});
    $('gameView').appendChild(el);setTimeout(()=>el.classList.remove('rolling'),1300);
    try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.8);if(S){k.noise(S,S.t,{f0:300,f1:900,q:.8,a:.025,k:.9,d:.2});k.tone(S,S.t+.95,520,{f1:300,gl:.06,a:.08,d:.08});}}}catch(e){}
    return el;}
  let _sp=null;
  function safeTop(){if(!_sp){_sp=document.createElement('div');_sp.style.cssText='position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';document.body.appendChild(_sp);}
    return parseFloat(getComputedStyle(_sp).paddingTop)||0;}
  function place(){
    const gv=$('gameView');if(!gv||!egg)return;
    const land=B.contains('phone-land'),desk=B.contains('desktop-mode');
    // computer: the game column clips, so the egg sits on the page itself (fixed) in the window's top-left corner
    const home=desk?document.body:gv;if(egg.parentNode!==home)home.appendChild(egg);egg.classList.toggle('fix',desk);egg.classList.toggle('land',land);
    const o=desk?{left:0,top:0}:(egg.offsetParent||gv).getBoundingClientRect();
    let x=desk?18:10,y=desk?16:12;
    if(desk){   // computer: the top-left of the drum pad column, never over the Bunker / Shop panels
      const ap=gv.querySelector('.app'),r=(ap&&ap.getBoundingClientRect().width?ap:gv).getBoundingClientRect();
      if(r.width){x=Math.max(0,r.left)+16;y=Math.max(0,r.top)+14;}
      {const fb=document.getElementById('dawFillBtn'),q=fb&&fb.classList.contains('show')&&fb.getBoundingClientRect();   // under the top-left FILL button
        if(q&&q.width&&x<q.right+8)y=Math.max(y,q.bottom+8);}
      // (v0.2.204: in the wide layout too: the dot trackers now sit in towards the score, so the corner is free)
    }
    y+=safeTop();
    if(land){   // sideways phone: the top-left is the BUNKER / SETTINGS / EDIT PADS row, so the egg waits right after it
      // (EDIT PADS only shows from the 3rd pad, v0.2.203: use the last button of that row that's on screen)
      const ep=['padEditToggleBtn','settingsOpenBtn','accountBtn','openBunkerBtn'].map($).find(e=>e&&e.getBoundingClientRect().width>0),r=ep&&ep.getBoundingClientRect();
      if(r&&r.width){x=r.right+10;y=Math.max(2,r.top+r.height/2-(egg.offsetHeight||40)/2);}
    }
    const pb=$('partyBtn');
    if(pb&&pb.classList.contains('pb-corner')&&pb.offsetParent){const r=pb.getBoundingClientRect();if(r.width&&r.top<120&&r.left<80)y=r.bottom+8;}
    lastXY=[x,y];egg.style.left=(x-o.left).toFixed(1)+'px';egg.style.top=(y-o.top).toFixed(1)+'px';
  }
  function want(){
    return B.contains('game-active')&&typeof totalAliens==='number'&&totalAliens>=1&&totalAliens<LAST&&
      totalAliens<(typeof bunkerCapacity==='function'?bunkerCapacity():99)&&
      !B.contains('nav-locked')&&!B.contains('buddy-hold')&&!B.contains('intro-run')&&!(typeof newFileIntroRunning==='function'&&newFileIntroRunning());
  }
  function sync(){
    if(typeof totalAliens!=='number')return;
    if(totalAliens<1&&B.contains('game-active'))sawZero=true;
    // the 10th buddy just arrived while playing: tell them where eggs come from now
    if(lastN>=1&&lastN<LAST&&totalAliens>=LAST&&B.contains('game-active'))shopNote();
    if(B.contains('game-active'))lastN=totalAliens;
    syncShopEgg();
    const er=$('eggReveal'),revealOn=!!(er&&er.classList.contains('on'));
    if(!want()){clear();if(totalAliens>=1&&sawZero&&!readyAt&&!B.contains('nav-locked')&&!B.contains('buddy-hold'))readyAt=performance.now()+10000;return;}
    if(sawZero&&!readyAt)readyAt=performance.now()+10000;   // just hatched the first one this session: give it 10 s
    if(readyAt&&performance.now()<readyAt)return;
    if(revealOn){if(egg)egg.style.visibility='hidden';return;}
    if(!egg){egg=make();egg._n=-1;}
    const p=curPick();
    egg.style.visibility='';
    if(egg._n!==totalAliens||egg._sz!==size().w){egg._n=totalAliens;egg._sz=size().w;paintTo(egg.querySelector('canvas'),p,size());}
    const tg=egg.querySelector('.pe-tag'),h=fmtJh(cost());if(tg._h!==h){tg._h=h;tg.innerHTML=h;}
    place();if(!raf){t0=performance.now();raf=requestAnimationFrame(frame);}
  }
  function clear(){if(egg){egg.remove();egg=null;}}
  function wob(body,t,ready,p,shake){
    let rot=0,y=0;
    if(ready){const ph=t%1.5;rot=Math.sin(t*9)*7*(ph<.6?1:.25);y=ph<.35?-Math.sin(ph/.35*Math.PI)*9:0;}
    else{const per=3.2-2.1*p,ph=t%per,dur=.55;if(ph<dur)rot=Math.sin(ph/dur*Math.PI*4)*(4+9*p)*(1-ph/dur);}
    rot+=shake;body.style.transform=`translateY(${y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
  }
  function frame(now){
    const shopOn=shopEgg&&shopEgg.offsetParent;
    if(!egg&&!shopOn){raf=0;return;}raf=requestAnimationFrame(frame);
    if(document.hidden)return;   // nothing to draw while the tab is in the background
    const c=cost(),ready=score>=c,p=Math.max(0,Math.min(1,score/c)),t=(now-t0)/1000;
    if(egg){egg.classList.toggle('ready',ready);let sh=0;if(egg._shake>0){sh=Math.sin(t*55)*10*egg._shake;egg._shake=Math.max(0,egg._shake-.06);}
      wob(egg.querySelector('.pe-body'),t,ready,p,sh);}
    if(shopOn){shopEgg.classList.toggle('ready',ready);wob(shopEgg.firstChild,t+.4,ready,p,0);}
  }
  function tap(){
    if(!egg)return;
    if(score<cost()){egg._shake=1;const tg=egg.querySelector('.pe-tag');tg.classList.remove('bump');void tg.offsetWidth;tg.classList.add('bump');return;}
    setBase();clear();buyAlien();sync();
  }
  function setBase(){                           // the egg you see is the buddy you get
    const n=totalAliens;if(score<cost())return;
    while(alienData.length<=n)alienData.push({name:'',color:''});
    if(!alienData[n].base){alienData[n].base=curPick();if(typeof getAlienColor==='function')alienData[n].color=getAlienColor(n);}
  }
  // ── the wiggling egg on the Shop's green PET ALIEN BUDDY card ──
  function syncShopEgg(){
    const card=$('alienBuyBtn');if(!card)return;
    if(!shopEgg){shopEgg=document.createElement('div');shopEgg.id='shopEgg';shopEgg.innerHTML='<div class="se-body"><canvas></canvas></div>';card.appendChild(shopEgg);
      if(getComputedStyle(card).position==='static')card.style.position='relative';}
    const on=totalAliens>=1&&card.style.display!=='none';
    shopEgg.style.display=on?'':'none';if(!on)return;
    const S=B.contains('phone-land')?{w:20,h:26}:{w:27,h:34};
    if(shopEgg._n!==totalAliens||shopEgg._w!==S.w){shopEgg._n=totalAliens;shopEgg._w=S.w;paintTo(shopEgg.querySelector('canvas'),curPick(),S);}
    if(shopEgg.offsetParent&&!raf){t0=performance.now();raf=requestAnimationFrame(frame);}
  }
  ['click','touchend'].forEach(ev=>document.addEventListener(ev,e=>{const t=e.target;if(t&&t.closest&&t.closest('#alienBuyBtn'))setBase();},true));
  // ── "from now on, buy them in the shop" ──
  function shopNote(){
    try{if(localStorage.getItem(k_()))return;localStorage.setItem(k_(),'1');}catch(e){}
    clear();const n=document.createElement('div');n.id='eggShopNote';
    n.innerHTML='<b>10 BUDDIES!</b><span>From now on, buy eggs in the FUSEBOX</span>';
    const desk=B.contains('desktop-mode');(desk?document.body:$('gameView')).appendChild(n);if(desk)n.style.position='fixed';
    const o=desk?{left:0,top:0}:(n.offsetParent||$('gameView')).getBoundingClientRect(),xy=lastXY||[desk?18:10,(desk?16:12)+safeTop()];
    n.style.left=(xy[0]-o.left)+'px';n.style.top=(xy[1]-o.top)+'px';
    requestAnimationFrame(()=>n.classList.add('on'));
    const bye=()=>{n.classList.remove('on');setTimeout(()=>n.remove(),500);};
    n.addEventListener('pointerdown',bye);setTimeout(bye,7000);
  }
  const css=document.createElement('style');css.textContent=`
#shopEgg{position:absolute;right:8px;bottom:4px;pointer-events:none;z-index:1;}
#shopEgg .se-body{transform-origin:50% 88%;will-change:transform;}
#shopEgg canvas{display:block;filter:drop-shadow(0 0 0 rgba(0,255,136,0));transition:filter .4s;}
#shopEgg.ready canvas{filter:drop-shadow(0 0 7px rgba(0,255,136,.75));}
body.phone-land #shopEgg{right:6px;bottom:4px;}
#alienBuyBtn *{pointer-events:none;}   /* the whole green card is one button: taps never land on its text */
.cornerEgg.fix{position:fixed;z-index:40;}
.cornerEgg.land{flex-direction:row;gap:4px;}
.cornerEgg.land .pe-tag{margin-top:0;}
body.desktop-mode.cockpit-open .cornerEgg,body.desktop-mode.stats-open .cornerEgg,body.desktop-mode.tree-open .cornerEgg{visibility:hidden;}
.cornerEgg.rolling{animation:peRollL 1.2s cubic-bezier(.25,.7,.35,1) both;}
@keyframes peRollL{0%{transform:translateX(-40vw) rotate(-720deg);opacity:0;}8%{opacity:1;}72%{transform:translateX(10px) rotate(14deg);}86%{transform:translateX(-4px) rotate(-6deg);}100%{transform:none;}}
#eggShopNote{position:absolute;z-index:41;max-width:220px;padding:.55rem .8rem;border-radius:12px;background:rgba(6,22,14,.94);border:1px solid rgba(0,255,136,.6);
  box-shadow:0 0 18px -4px rgba(0,255,136,.6);font-family:'Bebas Neue',sans-serif;letter-spacing:.07em;color:#c8ffe2;line-height:1.15;
  opacity:0;transform:translateX(-14px);transition:opacity .4s,transform .4s;cursor:pointer;}
#eggShopNote.on{opacity:1;transform:none;}
#eggShopNote b{display:block;color:#00ff88;font-weight:400;font-size:1.05rem;}
#eggShopNote span{font-size:.95rem;}
body.store-open:not(.desktop-mode) #eggShopNote,body.bunker-open:not(.desktop-mode) #eggShopNote{visibility:hidden;}`;
  document.head.appendChild(css);
  setInterval(sync,300);addEventListener('resize',()=>setTimeout(place,100));
  window.__twin={sync,get eggs(){return egg?[egg]:[];},get egg(){return egg;},skipWait(){readyAt=1;},shopNote};
})();
