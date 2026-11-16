// ══════════════════════════════════════════════
//  THUMB NAV + ALIEN PARTY AS "LEVEL 3" (v0.2.149)
//
//  • Upright phones: BUNKER · SETTINGS · EDIT PADS · SHOP sit in one row along the bottom, where thumbs are, and
//    the top of the screen is just the title. (Sideways phones and computers keep their own layouts.)
//  • The ALIEN PARTY button is now a small PARTY button next to the ♪. Tapping it opens a menu of the party styles
//    you own: pick one to start (or switch) the party, or END PARTY. Pressing and holding still ends it straight away.
//  • Level 1 = hatch the first egg, level 2 = the sequencer, level 3 = the party. 30 seconds after the sequencer is
//    unlocked (so there's time to take it in), a little disco ball hangs beside the score with its 1,000,000 price.
//    It fills up as you earn; when you can afford it, it sparkles and spins faster. Tap it to unlock the party.
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList,$=id=>document.getElementById(id);
  const css=document.createElement('style');css.textContent=`
/* ── bottom row (upright phones) ── */
body.thumb-nav #openBunkerBtn,body.thumb-nav #openStoreBtn,body.thumb-nav #settingsOpenBtn,body.thumb-nav #padEditToggleBtn{
  position:fixed!important;top:auto!important;right:auto!important;bottom:calc(1.1rem + env(safe-area-inset-bottom,0px))!important;z-index:50;
  width:var(--tn-w)!important;height:2.6rem;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:.3rem;
  margin:0!important;padding:0 .3rem!important;font-size:.98rem!important;letter-spacing:.08em!important;border-radius:14px!important;white-space:nowrap;overflow:hidden;}
body.thumb-nav #openBunkerBtn,body.thumb-nav #openStoreBtn{transform:none!important;}
body.thumb-nav #openBunkerBtn{left:var(--tn-x0)!important;}
body.thumb-nav #soundboardBtn{display:none!important;}
/* v0.2.158: BUNKER / SHOP live in the header, which sat under the pad area (same z-index, earlier in the page), so the
   pads' empty bottom padding swallowed taps on BUNKER. Lift the header above it. */
body.thumb-nav #gameView .app > .header{z-index:5;}
body.thumb-nav #settingsOpenBtn{left:var(--tn-x1)!important;}
body.thumb-nav #padEditToggleBtn{left:var(--tn-x2)!important;}
body.thumb-nav #openStoreBtn{left:var(--tn-x3)!important;}
body.thumb-nav.nav-locked #openBunkerBtn,body.thumb-nav.nav-locked #openStoreBtn{display:none!important;}
body.thumb-nav #openBunkerBtn .nb-ico,body.thumb-nav #openStoreBtn .nb-ico{width:1.05rem;height:1.05rem;flex-shrink:0;}
body.thumb-nav.nav-reveal #openBunkerBtn,body.thumb-nav.nav-reveal #openStoreBtn{animation:tnPopIn .65s cubic-bezier(.3,1.6,.5,1) both!important;}
body.thumb-nav.nav-reveal #openStoreBtn{animation-delay:.45s!important;}
@keyframes tnPopIn{0%{opacity:0;translate:0 30px;scale:.4;}60%{opacity:1;}100%{opacity:1;translate:0 0;scale:1;}}
/* ── the small PARTY button by the ♪ ── */
#partyBtn.pb-small{position:static!important;display:none;left:auto!important;right:auto!important;bottom:auto!important;top:auto!important;
  font-size:inherit;padding:.28rem .7rem;border-width:1px;border-radius:8px;animation:none;font-family:'Bebas Neue',sans-serif;letter-spacing:.1em;
  border-color:#a0287f;background:#1a0418;color:#ff7ae0;white-space:nowrap;flex:0 0 auto;}
#partyBtn.pb-small.visible{display:inline-block;}
.seq-bottom-row #partyBtn.pb-small{font-size:.65rem;padding:.18rem .55rem;border-radius:4px;}
#partyBtn.pb-small.active{border-color:#ff66ff;color:#fff;background:#4a0a44;box-shadow:0 0 12px -2px rgba(255,80,220,.8);}
#partyBtn.pb-small.pb-land{animation:pbLand .7s cubic-bezier(.3,1.6,.5,1) both!important;}
#partyMenu{position:fixed;z-index:400;display:none;flex-direction:column;min-width:190px;padding:.35rem;border-radius:14px;
  background:rgba(22,6,22,.97);border:1px solid #a0287f;box-shadow:0 10px 30px rgba(0,0,0,.6),0 0 22px -6px rgba(255,80,220,.6);}
#partyMenu.open{display:flex;}
#partyMenu .pm-h{font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:.16em;color:#a06a98;padding:.35rem .6rem .25rem;}
#partyMenu button{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:.6rem;font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:.1em;
  color:#ffd2ff;padding:.55rem .7rem;border-radius:9px;cursor:pointer;touch-action:manipulation;}
#partyMenu button:active{background:#3a0a36;}
#partyMenu button.on{background:#4a0a44;color:#fff;}
#partyMenu button .pm-dot{width:9px;height:9px;border-radius:50%;border:1px solid #ff7ae0;flex-shrink:0;}
#partyMenu button.on .pm-dot{background:#ff7ae0;box-shadow:0 0 8px #ff7ae0;}
#partyMenu button.pm-end{color:#ff8a8a;border-top:1px solid #3a1236;border-radius:0 0 9px 9px;margin-top:.2rem;}
#partyMenu .pm-more{font-family:'Bebas Neue',sans-serif;font-size:.9rem;letter-spacing:.1em;color:#7a5a76;padding:.3rem .7rem .4rem;}
/* ── level 3 teaser: the disco ball ── */
#partyTeaser{position:absolute;z-index:6;display:none;flex-direction:column;align-items:center;gap:2px;cursor:pointer;touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;transform-origin:50% 0;}
#partyTeaser.on{display:flex;animation:ptDrop 1.1s cubic-bezier(.3,1.5,.5,1) both,ptSway 3.2s ease-in-out 1.1s infinite;}
#partyTeaser .pt-string{width:2px;height:16px;background:linear-gradient(#0000,#9a7ab0);}
#partyTeaser canvas{display:block;}
#partyTeaser .pt-tag{font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:.08em;line-height:1;padding:3px 8px 2px;border-radius:999px;color:#e8c2e2;
  background:rgba(26,6,24,.88);border:1px solid rgba(255,140,240,.3);white-space:nowrap;position:relative;overflow:hidden;}
#partyTeaser .pt-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,80,220,.28);transition:width .4s;}
#partyTeaser .pt-tag span{position:relative;}
#partyTeaser.ready .pt-tag{color:#fff;border-color:#ff66ff;box-shadow:0 0 12px -2px rgba(255,80,220,.9);}
#partyTeaser.ready canvas{filter:drop-shadow(0 0 10px rgba(255,120,240,.85));}
#partyTeaser.nope{animation:ptNope .45s ease-in-out!important;}
body.phone-land #partyTeaser .pt-tag{font-size:12px;padding:2px 6px 1px;}
@keyframes ptDrop{0%{opacity:0;transform:translateY(-70px);}60%{opacity:1;}100%{opacity:1;transform:none;}}
@keyframes ptSway{0%,100%{transform:rotate(-5deg);}50%{transform:rotate(5deg);}}
@keyframes ptNope{0%,100%{transform:rotate(0);}20%{transform:rotate(-12deg);}45%{transform:rotate(10deg);}70%{transform:rotate(-6deg);}}
`;document.head.appendChild(css);

  // ══════════ bottom row ══════════
  function thumbNav(){
    const on=B.contains('game-active')&&!B.contains('desktop-mode')&&!B.contains('phone-land');
    if(on!==B.contains('thumb-nav')){B.toggle('thumb-nav',on);if(typeof fitPadAreaSoon==='function')fitPadAreaSoon();}
    if(!on)return;
    // four equal buttons across the screen
    const W=document.documentElement.clientWidth||innerWidth,m=Math.max(10,W*.035),g=Math.max(6,W*.018),w=(W-2*m-3*g)/4,st=document.documentElement.style;
    st.setProperty('--tn-w',w.toFixed(1)+'px');
    // BUNKER / SHOP live inside the home page (they slide away with it); line them up with the fixed buttons
    const gv=$('gameView');if(gv){const gr=gv.getBoundingClientRect(),off=(innerHeight-gr.bottom)+(gr.left?0:0);st.setProperty('--tn-off',Math.max(-200,Math.min(200,off)).toFixed(1)+'px');}for(let i=0;i<4;i++)st.setProperty('--tn-x'+i,(m+i*(w+g)).toFixed(1)+'px');
  }

  // ══════════ the PARTY button + menu ══════════
  const pb=$('partyBtn'),grooveBtn=$('vtbGrooveBtn')||$('vtbViewBtn');   // (♪ GROOVE was removed in v0.2.157: PARTY follows VIEW)
  if(pb&&grooveBtn&&grooveBtn.parentNode){pb.classList.add('pb-small');pb.style.cssText='';grooveBtn.parentNode.insertBefore(pb,grooveBtn.nextSibling);
    try{if(typeof paintPartyBtn==='function')paintPartyBtn();if(typeof placeViewButtons==='function')placeViewButtons();}catch(e){}}
  const menu=document.createElement('div');menu.id='partyMenu';document.body.appendChild(menu);
  function closeMenu(){menu.classList.remove('open');}
  window.openPartyMenu=function(){
    if(menu.classList.contains('open')){closeMenu();return;}
    const list=typeof partyStylesOwned==='function'?partyStylesOwned():[],now=typeof partyStyleNow==='function'?partyStyleNow():'glow';
    menu.innerHTML='<div class="pm-h">ALIEN PARTY</div>';
    list.forEach(s=>{const b=document.createElement('button');b.type='button';b.className=partyMode&&s.id===now?'on':'';
      b.innerHTML='<span class="pm-dot"></span>';b.appendChild(document.createTextNode(s.name));
      b.addEventListener('click',e=>{e.stopPropagation();closeMenu();
        if(typeof setPartyStyle==='function')setPartyStyle(s.id);
        if(!partyMode){if(typeof startParty==='function')startParty();if(typeof playPartyStartFx==='function')try{playPartyStartFx();}catch(err){}}
        if(typeof paintPartyBtn==='function')paintPartyBtn();});
      menu.appendChild(b);});
    const total=typeof PARTY_LADDER!=='undefined'?PARTY_LADDER.length:list.length;
    if(list.length<total){const m=document.createElement('div');m.className='pm-more';m.textContent=(total-list.length)+' MORE STYLE'+(total-list.length===1?'':'S')+' IN THE SHOP';menu.appendChild(m);}
    if(partyMode){const e=document.createElement('button');e.type='button';e.className='pm-end';e.textContent='END PARTY';
      e.addEventListener('click',ev=>{ev.stopPropagation();closeMenu();if(typeof stopParty==='function')stopParty();if(typeof paintPartyBtn==='function')paintPartyBtn();});menu.appendChild(e);}
    menu.classList.add('open');
    // under the button (or above it if there's no room)
    const r=pb.getBoundingClientRect(),mw=menu.offsetWidth,mh=menu.offsetHeight,W=innerWidth,H=innerHeight;
    let x=Math.min(W-mw-8,Math.max(8,r.left+r.width/2-mw/2)),y=r.bottom+8;if(y+mh>H-8)y=Math.max(8,r.top-mh-8);
    menu.style.left=x+'px';menu.style.top=y+'px';
  };
  document.addEventListener('pointerdown',e=>{if(menu.classList.contains('open')&&!menu.contains(e.target)&&!(pb&&pb.contains(e.target)))closeMenu();},true);
  addEventListener('resize',closeMenu);
  new MutationObserver(()=>{if(!B.contains('game-active')||B.contains('store-open')||B.contains('bunker-open'))closeMenu();}).observe(document.body,{attributes:true,attributeFilter:['class']});

  // ══════════ LEVEL 3: the disco ball teaser ══════════
  const tz=document.createElement('div');tz.id='partyTeaser';tz.setAttribute('role','button');tz.setAttribute('aria-label','Alien Party');
  tz.innerHTML='<div class="pt-string"></div><canvas></canvas><div class="pt-tag"><i class="pt-fill"></i><span></span></div>';
  const cv=tz.querySelector('canvas'),tagTxt=tz.querySelector('.pt-tag span'),fill=tz.querySelector('.pt-fill');
  let seqSeenAt=0,tzOn=false,raf=0,spin=0,lastT=0,frame=0,tf=0;
  const cost=()=>typeof PARTY_LADDER!=='undefined'?PARTY_LADDER[0].cost:1e6;
  function size(){return B.contains('phone-land')?30:B.contains('desktop-mode')?54:48;}
  function paint(now){
    raf=requestAnimationFrame(paint);
    if((++frame)%2)return;                 // ~30 fps is plenty (and kind to old iPhones)
    const dt=Math.min(.1,(now-(lastT||now))/1000);lastT=now;
    const ready=tz.classList.contains('ready');spin+=dt*(ready?1.6:.45);
    const S=size(),k=Math.min(2,devicePixelRatio||1);
    if(cv.width!==Math.round(S*k)){cv.width=cv.height=Math.round(S*k);cv.style.width=cv.style.height=S+'px';}
    const g=cv.getContext('2d');g.setTransform(k,0,0,k,0,0);g.clearRect(0,0,S,S);
    const R=S/2-1.5,cx=S/2,cy=S/2;
    g.save();g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.clip();
    g.fillStyle='#2a2238';g.fillRect(0,0,S,S);
    // mirror tiles: rows of latitude, columns scrolling round as the ball spins
    const rows=7,cols=12;
    for(let i=0;i<rows;i++){
      const a0=-Math.PI/2+i*Math.PI/rows,a1=a0+Math.PI/rows,y0=cy+Math.sin(a0)*R,y1=cy+Math.sin(a1)*R,rw=Math.cos((a0+a1)/2);
      for(let j=0;j<cols;j++){
        const l0=(j/cols)*Math.PI*2+spin,l1=l0+Math.PI*2/cols;
        const s0=Math.sin(l0),s1=Math.sin(l1);if(Math.cos((l0+l1)/2)<0)continue;   // back side
        const x0=cx+s0*R*rw,x1=cx+s1*R*rw;
        const h=(Math.sin(i*2.3+j*1.7+spin*2.2)+1)/2,lit=(0.35+0.65*Math.cos((l0+l1)/2-.6)*Math.cos(((a0+a1)/2)+.5));
        const v=Math.max(0,Math.min(1,lit*.8+h*.35));
        g.fillStyle=h>.93?'#ffffff':`rgb(${Math.round(120+120*v)},${Math.round(110+110*v)},${Math.round(150+105*v)})`;
        g.fillRect(Math.min(x0,x1)+.4,y0+.4,Math.abs(x1-x0)-.8,y1-y0-.8);
      }
    }
    // a pink and a blue glint
    const gl=(x,y,c)=>{const r=g.createRadialGradient(x,y,0,x,y,R*.55);r.addColorStop(0,c);r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,S,S);};
    gl(cx-R*.35,cy-R*.4,'rgba(255,255,255,.55)');gl(cx+R*.4,cy+R*.3,ready?'rgba(255,90,220,.5)':'rgba(255,90,220,.22)');
    g.restore();
    g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.strokeStyle='#1a1028';g.lineWidth=2;g.stroke();
    g.fillStyle='#8a7a9a';g.fillRect(cx-3,0,6,3);   // the cap the string ties to
  }
  function place(){
    const se=$('scoreEl'),gv=$('gameView');if(!se||!gv)return;
    if(tz.parentElement!==gv)gv.appendChild(tz);
    let r;try{const rg=document.createRange();rg.selectNodeContents(se);r=rg.getBoundingClientRect();}catch(e){}
    if(!r||!r.width)r=se.getBoundingClientRect();
    const o=gv.getBoundingClientRect(),w=tz.offsetWidth||60,h=tz.offsetHeight||90,land=B.contains('phone-land');
    let x=r.right+Math.max(16,Math.min(36,r.height*.45));
    const gr=document.getElementById('gemRing'),ringOn=gr&&gr.classList.contains('on')&&!B.contains('desktop-mode');   // the gem ring holds the top-right: go left
    if(land||ringOn||x+w>o.right-8)x=r.left-w-(land?10:18);
    tz.style.left=(x-o.left).toFixed(1)+'px';tz.style.top=(r.top+r.height/2-h*.55-o.top).toFixed(1)+'px';
  }
  function show(on){
    if(on===tzOn)return;tzOn=on;
    if(on){tz.classList.add('on');place();if(!raf){lastT=0;raf=requestAnimationFrame(paint);}
      setTimeout(place,60);
      // a little shimmer as it lowers in
      try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.5);if(S)[0,.12,.24,.36].forEach((d,i)=>k.tone(S,S.t+.5+d,[1568,1976,2349,3136][i],{type:'triangle',a:.03,d:.35,rv:.6}));}}catch(e){}}
    else{tz.classList.remove('on','ready');cancelAnimationFrame(raf);raf=0;}
  }
  function tick(){
    const active=B.contains('game-active'),seq=typeof drum!=='undefined'&&drum.seqTracks>=1,owned=typeof shop!=='undefined'&&(shop.partyLevel||0)>=1;
    if(!active||!seq){seqSeenAt=0;show(false);return;}
    if(!seqSeenAt)seqSeenAt=performance.now()-(seqWasLoaded?60000:0);   // loaded with the sequencer already: no wait
    seqWasLoaded=false;
    const want=!owned&&performance.now()-seqSeenAt>=30000&&!(typeof overlayUp==='function'&&overlayUp())&&!B.contains('roll-full')&&!B.contains('vox-full');
    show(want);if(!want)return;
    const c=cost(),ready=score>=c;tz.classList.toggle('ready',ready);
    tagTxt.textContent=fmtW(c);fill.style.width=(Math.min(1,score/c)*100).toFixed(1)+'%';
    if((++tf)%5===0)place();
  }
  let seqWasLoaded=false;
  if(typeof startGame==='function'){const sg=window.startGame;window.startGame=function(){const r=sg.apply(this,arguments);seqSeenAt=0;seqWasLoaded=typeof drum!=='undefined'&&drum.seqTracks>=1;show(false);thumbNav();return r;};}
  tz.addEventListener('click',e=>{e.stopPropagation();
    if(score>=cost()&&typeof buyPartyNext==='function'){show(false);buyPartyNext();return;}
    tz.classList.remove('nope');void tz.offsetWidth;tz.classList.add('nope');setTimeout(()=>tz.classList.remove('nope'),500);
  });

  setInterval(()=>{try{thumbNav();tick();}catch(e){console.warn('thumb nav / party',e);}},250);
  addEventListener('resize',()=>{thumbNav();if(tzOn)place();});
  thumbNav();
})();
