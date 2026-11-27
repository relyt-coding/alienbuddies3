// ══════════════════════════════════════════════
//  CORNER EGG (v0.2.199; was "two more eggs" v0.2.193 and "one egg by the score until the bunker is full" v0.2.198)
//  10 seconds after the first buddy hatches (and the Bunker / Shop cutscene is over), ONE egg rolls into the TOP-LEFT
//  corner of the drum pads screen. Its shell shows the buddy inside (a buddyPickFor pick) and its tag shows the price
//  (alienCost(totalAliens): buddies 2 + 3 are 50 mJ each, js/01). Tap it with enough energy and THAT buddy hatches
//  (its pick goes to alienData[n].base before buyAlien). v0.2.209: a heat lamp hangs over it, joined to the price tag by a
//  cord that fills as you save up; tapping lights the lamp, then the hatch screen opens with its lamp on and the egg landed. Not enough yet: it wobbles and its tag pops; the wobble gets
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
    // v0.2.209: a heat lamp hangs above the egg; its cord runs from the price tag up to it and fills as you save up
    el.innerHTML='<div class="pe-lamp"><i class="pl-cord"></i><b class="pl-shade"></b><i class="pl-bulb"></i><i class="pl-cone"></i></div><div class="pe-glow"></div><div class="pe-body"><canvas></canvas></div><div class="pe-tag"></div><div class="pe-wire"><i></i></div>';
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
      if(r&&r.width){x=r.right+10;y=Math.max(2,r.top+r.height/2-(egg.offsetHeight||40)/2);
        // v0.2.207: that row also holds the score: if the egg would sit on it (or on ACTIVATE), it moves to the right end of the
        // row instead, just left of the gem ring / FUSEBOX, and if that's taken too, just under the BUNKER button
        const ew=egg.offsetWidth||80,eh=egg.offsetHeight||40,vis=e=>{if(!e)return null;const q=e.getBoundingClientRect();return q.width>2&&getComputedStyle(e).visibility!=='hidden'?q:null;};
        const txt=e=>{if(!e)return null;try{const rg=document.createRange();rg.selectNodeContents(e);const q=rg.getBoundingClientRect();return q.width?q:null;}catch(_){return null;}};
        const busy=[txt($('scoreEl')),vis($('landRateEl')),vis($('drumTrackerActivateBtn')),vis($('gemRing')),vis($('openStoreBtn')),vis($('partyBtn')),vis($('partyTeaser'))].filter(Boolean);
        const hits=(x0,y0)=>busy.some(q=>x0<q.right+6&&x0+ew>q.left-6&&y0<q.bottom&&y0+eh>q.top);
        if(hits(x,y)){const right=Math.min(innerWidth-8,...[vis($('gemRing')),vis($('openStoreBtn'))].filter(Boolean).map(q=>q.left-10));
          const x2=right-ew;if(!hits(x2,y)&&x2>r.right)x=x2;
          else{const bb=vis($('openBunkerBtn'));x=bb?bb.left:10;y=(bb?bb.bottom:r.bottom)+6;}}}
    }
    const pb=$('partyBtn');
    if(pb&&pb.classList.contains('pb-corner')&&getComputedStyle(pb).display!=='none'){   // (fixed: no offsetParent, v0.2.207)
      const r=pb.getBoundingClientRect();if(r.width&&r.top<120&&r.left<80)y=r.bottom+8;}
    lastXY=[x,y];egg.style.left=(x-o.left).toFixed(1)+'px';egg.style.top=(y-o.top).toFixed(1)+'px';
    if(desk)nudgeTrackers();
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
  function clear(){if(egg){egg.remove();egg=null;}setEggPad(0);}
  // v0.2.207: on computers the DRUMPAD tracker (and its ACTIVATE arrow) can sit right where the egg is. Rather than move
  // the egg out of its corner, the score row makes room: it gets extra left padding until they no longer touch.
  let eggPad=0,padKey='';
  let eggDrop=0;
  function setEggPad(v){v=Math.max(0,Math.min(320,Math.round(v)));if(v!==eggPad){eggPad=v;const sr=$('scoreRow');if(sr){sr.style.paddingLeft=v?v+'px':'';sr.style.paddingRight=v?v+'px':'';}}   // v0.2.215: both sides, so the score stays centred
    if(!v&&eggDrop){eggDrop=0;const sa=$('seqArea');if(sa)sa.style.marginTop='';}}
  function setEggDrop(v){v=Math.max(0,Math.min(140,Math.round(v)));if(v===eggDrop)return;eggDrop=v;const sa=$('seqArea');if(sa)sa.style.setProperty('margin-top',v?v+'px':'','important');}
  function nudgeTrackers(){
    const key=document.body.className+'|'+innerWidth+'x'+innerHeight;if(key!==padKey){padKey=key;setEggPad(0);return;}
    const er=egg.getBoundingClientRect();if(!er.width)return;
    const tc=$('manualTiersCol'),blk=tc&&tc.parentElement,a=$('arrowActivate');
    const rs=[blk&&blk.getBoundingClientRect(),a&&getComputedStyle(a).display!=='none'?a.getBoundingClientRect():null].filter(q=>q&&q.width);
    let need=0;rs.forEach(q=>{if(er.left<q.right&&er.right+14>q.left&&er.top<q.bottom&&er.bottom>q.top)need=Math.max(need,er.right+14-q.left);});
    if(need>0)setEggPad(eggPad+need*2);
    // …and the sequencer (PAUSE / track names) moves down if the egg's price tag reaches it
    const sa=$('seqArea'),sq=sa&&sa.offsetParent&&sa.getBoundingClientRect();
    if(sq&&sq.width&&er.left<sq.right&&er.right>sq.left&&er.bottom+8>sq.top&&er.top<sq.bottom)setEggDrop(eggDrop+er.bottom+8-sq.top);
  }
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
    if(egg){egg.classList.toggle('ready',ready);const wi=egg.querySelector('.pe-wire i');if(wi)wi.style.clipPath='inset('+((1-p)*100).toFixed(1)+'% 0 0 0)';let sh=0;if(egg._shake>0){sh=Math.sin(t*55)*10*egg._shake;egg._shake=Math.max(0,egg._shake-.06);}
      wob(egg.querySelector('.pe-body'),t,ready,p,sh);}
    if(shopOn){shopEgg.classList.toggle('ready',ready);wob(shopEgg.firstChild,t+.4,ready,p,0);}
  }
  function tap(){
    if(!egg||egg._lit)return;
    if(score<cost()){egg._shake=1;const tg=egg.querySelector('.pe-tag');tg.classList.remove('bump');void tg.offsetWidth;tg.classList.add('bump');return;}
    // v0.2.209: the lamp clicks on and warms the egg first, so the hatch screen opens with its lamp already on (tap to hatch right away)
    egg._lit=1;egg.classList.add('lit');
    try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.5);if(S){k.noise(S,S.t,{type:'highpass',f0:3000,a:.05,d:.03});
      k.tone(S,S.t+.04,120,{a:.025,k:.15,hold:.5,d:.3});k.tone(S,S.t+.08,660,{type:'triangle',a:.03,d:.4,rv:.5});}}}catch(e){}
    setTimeout(()=>{if(score<cost()){if(egg){egg._lit=0;egg.classList.remove('lit');}return;}
      setBase();clear();window.__eggOpenOpts={landed:true,lampOn:true};buyAlien();if(window.__eggOpenOpts&&window.__eggOpenOpts.lampOn)window.__eggOpenOpts=null;sync();},750);
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
.cornerEgg .pe-lamp{position:relative;width:34px;height:20px;margin-bottom:-4px;pointer-events:none;}
.cornerEgg .pl-cord{position:absolute;left:50%;top:-6px;width:2px;height:9px;margin-left:-1px;background:#6a6450;}
.cornerEgg .pl-shade{position:absolute;left:3px;right:3px;top:2px;height:13px;border-radius:14px 14px 3px 3px;background:linear-gradient(#8a8f9a,#4a4f5c);border:1.5px solid #1e2028;}
.cornerEgg .pl-bulb{position:absolute;left:50%;top:13px;width:10px;height:6px;margin-left:-5px;border-radius:0 0 6px 6px;background:#5a5440;transition:background .25s,box-shadow .25s;}
.cornerEgg.ready .pl-bulb{animation:plBlink 1.2s ease-in-out infinite;}
@keyframes plBlink{50%{background:#ffd76a;box-shadow:0 0 8px 2px rgba(255,200,90,.7);}}
.cornerEgg .pl-cone{position:absolute;left:50%;top:17px;width:84px;height:72px;margin-left:-42px;background:radial-gradient(ellipse at 50% 0,rgba(255,214,120,.55),rgba(255,180,60,0) 70%);
  clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);opacity:0;transition:opacity .3s;}
.cornerEgg.lit .pl-bulb{animation:none;background:#fff3c0;box-shadow:0 0 12px 4px rgba(255,214,120,.95);}
.cornerEgg.lit .pl-cone{opacity:1;}
.cornerEgg.lit .pe-body canvas{filter:drop-shadow(0 0 10px rgba(255,190,90,.85));}
.cornerEgg .pe-wire{position:absolute;left:-7px;top:10px;bottom:9px;width:14px;border:2.5px solid #3a3828;border-right:0;border-radius:6px 0 0 6px;pointer-events:none;}
.cornerEgg .pe-wire i{position:absolute;left:-2.5px;top:-2.5px;bottom:-2.5px;width:16.5px;border:2.5px solid #ffd23f;border-right:0;border-radius:6px 0 0 6px;box-shadow:-2px 0 6px -2px rgba(255,210,63,.8);}
.cornerEgg.ready .pe-wire i{border-color:#00ff88;box-shadow:-2px 0 6px -2px rgba(0,255,136,.8);}
.cornerEgg.land .pe-lamp,.cornerEgg.land .pe-wire{display:none;}
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
