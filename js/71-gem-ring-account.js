// ══════════════════════════════════════════════
//  LEVEL 4: THE GEM RING  +  GEMS FROM YOUR BUDDIES  +  MY ACCOUNT (v0.2.152)
//
//  • The gem ring: the bobbing Gem Buddy inside a ring that fills toward your next gem goal, with the count under
//    it. Before the galaxies are open the goal is 25 ("GALAXIES"): when it's full the ring glows, and tapping it
//    unlocks Explore the Galaxies (the hyperspace intro plays). After that it counts toward the cheapest skill-tree
//    node you can buy next, and tapping it opens the galaxy map.
//    It's "level 4": it appears 30 seconds after the Alien Party is unlocked (straight away on a save that already
//    has the party or the galaxies). Upright phones: top-right corner. Sideways phones: next to SHOP. Computer:
//    beside the score. The skill-tree card in the shop still works too.
//  • Gems come off your buddies: when your aliens make gems, little gems pop off floating buddies and fly into the
//    ring; the count goes up as each one lands (silently: no gem sounds). (Up to 6 per 5-second gem tick; on the drum pads
//    screen only, and only while the ring is showing.)
//  • MY ACCOUNT (top-left on upright phones, by SETTINGS elsewhere): for now it says you're playing offline on this
//    device; signing in and playing with friends online are coming.
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList,$=id=>document.getElementById(id);
  const css=document.createElement('style');css.textContent=`
#gemRing{position:fixed;z-index:48;display:none;align-items:center;font-family:'Bebas Neue',sans-serif;color:#5dffc0;letter-spacing:.08em;line-height:1;
  cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;}
#gemRing.on{display:flex;animation:grIn .9s cubic-bezier(.3,1.5,.5,1) backwards;}
#gemRing.gr-v{flex-direction:column;gap:3px;}
#gemRing.gr-h{flex-direction:row;gap:7px;}
#gemRing .gr-ring{position:relative;width:var(--gr,58px);height:var(--gr,58px);border-radius:50%;flex-shrink:0;
  background:conic-gradient(#44eebb 0 var(--p,0%),rgba(68,238,187,.13) var(--p,0%) 100%);box-shadow:0 0 14px -5px rgba(68,238,187,.7);transition:--p .4s;}
#gemRing .gr-in{position:absolute;inset:4px;border-radius:50%;background:#071a14;display:flex;align-items:center;justify-content:center;overflow:visible;}
#gemRing .gr-in .agem-live{font-size:calc(var(--gr,58px)*.42);vertical-align:0;}
#gemRing .gr-txt{display:flex;flex-direction:column;align-items:center;gap:2px;}
#gemRing.gr-h .gr-txt{align-items:flex-start;}
#gemRing .gr-n{font-size:1.25rem;}
#gemRing .gr-l{font-size:.78rem;color:#2f9a78;letter-spacing:.1em;max-width:7.5em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#gemRing.gr-h .gr-n{font-size:1.05rem;}#gemRing.gr-h .gr-l{font-size:.68rem;}
body.desktop-mode #gemRing.gr-h .gr-n{font-size:1.3rem;}body.desktop-mode #gemRing.gr-h .gr-l{font-size:.8rem;}
#gemRing.ready .gr-ring{background:conic-gradient(#7affd6 0 100%,#7affd6 100%);animation:grGlow 1.3s ease-in-out infinite;}
#gemRing.ready .gr-n{color:#b8ffe6;}
#gemRing.bump .gr-ring{animation:grBump .32s cubic-bezier(.3,1.8,.5,1);}
#gemRing.ready.bump .gr-ring{animation:grBump .32s cubic-bezier(.3,1.8,.5,1),grGlow 1.3s ease-in-out infinite;}
#gemRing.nope{animation:grNope .4s ease-in-out!important;}
#gemRing.nudge .gr-ring{animation:grBump .35s cubic-bezier(.3,1.8,.5,1),grGlow 1.3s ease-in-out infinite;}
/* holding: a bright charge sweeps round the outside of the ring and the glow swells */
#gemRing .gr-ring::after{content:'';position:absolute;inset:-5px;border-radius:50%;pointer-events:none;opacity:0;
  background:conic-gradient(#e6fff6 calc(var(--hp,0)*360deg),transparent 0);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 3.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 3.5px));}
#gemRing.charging .gr-ring::after{opacity:1;}
#gemRing.charging .gr-ring{box-shadow:0 0 calc(10px + var(--hp,0)*34px) rgba(150,255,220,.85);transform:scale(calc(1 + var(--hp,0)*.1));animation:none;}
#gemRing.launched .gr-ring{animation:grBump .5s ease-out;}
@keyframes grIn{0%{opacity:0;transform:scale(.3) rotate(-30deg);}60%{opacity:1;}100%{opacity:1;transform:none;}}
@keyframes grGlow{0%,100%{box-shadow:0 0 10px -2px rgba(80,255,190,.7);}50%{box-shadow:0 0 26px 4px rgba(80,255,190,.9);}}
@keyframes grBump{0%{transform:scale(1);}40%{transform:scale(1.14);}100%{transform:scale(1);}}
@keyframes grNope{0%,100%{transform:translateX(0);}25%{transform:translateX(-5px);}60%{transform:translateX(5px);}}
.gem-fly{position:fixed;left:0;top:0;z-index:470;pointer-events:none;width:22px;height:22px;margin:-11px 0 0 -11px;will-change:transform;}
.gem-fly .agem{width:100%;height:100%;vertical-align:0;display:block;filter:drop-shadow(0 0 4px rgba(80,255,190,.8));}
body:not(.game-active) #gemRing,body:not(.game-active) #accountBtn{display:none!important;}
body.store-open #gemRing,body.bunker-open #gemRing,body.cockpit-open #gemRing,body.bestbuddy-open #gemRing,body.vault-open #gemRing,body.intro-run #gemRing,body.roll-full #gemRing,body.vox-full #gemRing{display:none!important;}
/* ── MY ACCOUNT ── */
#accountBtn{position:fixed;z-index:50;display:none;align-items:center;gap:.4rem;font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:.09em;
  padding:.32rem .75rem .32rem .36rem;border-radius:999px;border:1px solid #2a3350;background:#0b0f1e;color:#8ea2e8;cursor:pointer;touch-action:manipulation;white-space:nowrap;}
#accountBtn.on{display:inline-flex;}
#accountBtn .ab-av{width:1.45rem;height:1.45rem;border-radius:50%;background:#16203e;border:1px solid #3a4a80;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
#accountBtn .ab-av svg{width:70%;height:70%;}
#accountBtn:active{background:#131a33;border-color:#5a6ab0;}
body.store-open #accountBtn,body.bunker-open #accountBtn,body.cockpit-open #accountBtn,body.bestbuddy-open #accountBtn,body.vault-open #accountBtn,body.intro-run #accountBtn,body.roll-full #accountBtn,body.vox-full #accountBtn,body.nav-locked #accountBtn{display:none!important;}
body.phone-land #accountBtn{font-size:.62rem;padding:.2rem .5rem .2rem .25rem;top:calc(4px + env(safe-area-inset-top,0px))!important;bottom:auto!important;}
body.phone-land #accountBtn .ab-av{width:1.05rem;height:1.05rem;}
#accountSheet{position:fixed;inset:0;z-index:480;background:rgba(0,0,0,.82);display:none;align-items:flex-end;justify-content:center;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}
#accountSheet.open{display:flex;}
body.desktop-mode #accountSheet{align-items:center;}
#accountBox{width:100%;max-width:460px;background:#0a0d1a;border:1px solid #2a3350;border-radius:20px 20px 0 0;padding:1.2rem 1.3rem calc(1.4rem + env(safe-area-inset-bottom,0px));
  display:flex;flex-direction:column;gap:.9rem;animation:slideUp .22s cubic-bezier(.34,1.1,.64,1);}
body.desktop-mode #accountBox{border-radius:20px;}
#accountBox .as-h{display:flex;align-items:center;justify-content:space-between;}
#accountBox .as-t{font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:.14em;color:#a8b8ff;}
#accountBox .as-x{font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:.1em;padding:.38rem .85rem;border-radius:8px;border:1px solid #2a3350;background:#0b0f1e;color:#8ea2e8;cursor:pointer;}
#accountBox .as-card{border:1px solid #1e2440;background:#0e1222;border-radius:12px;padding:.8rem .95rem;display:flex;flex-direction:column;gap:.3rem;}
#accountBox .as-card b{font-family:'Bebas Neue',sans-serif;font-weight:400;font-size:1.15rem;letter-spacing:.1em;color:#c9d3ff;}
#accountBox .as-card span{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:.95rem;line-height:1.45;color:#9aa3c4;}
#accountBox .as-soon{font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.12em;padding:.65rem;border-radius:10px;border:1px dashed #3a4a80;background:transparent;color:#5a6ab0;text-align:center;}
`;document.head.appendChild(css);

  // ══════════ the gem ring ══════════
  const ring=document.createElement('div');ring.id='gemRing';ring.setAttribute('role','button');ring.setAttribute('aria-label','Alien Gems');
  ring.innerHTML='<div class="gr-ring"><div class="gr-in"></div></div><div class="gr-txt"><div class="gr-n">0</div><div class="gr-l">GALAXIES</div></div>';
  document.body.appendChild(ring);
  const rIn=ring.querySelector('.gr-in'),rN=ring.querySelector('.gr-n'),rL=ring.querySelector('.gr-l');
  if(typeof makeLiveAlienGem==='function')rIn.appendChild(makeLiveAlienGem());
  let shown=false,partySeenAt=0,partyWasLoaded=false,inFlight=0,lastFloor=null,shownCount=null,tf=0;
  const fmt=v=>typeof fmtGems==='function'?fmtGems(v):String(Math.floor(v));
  function goal(){
    if(typeof skillTreeUnlocked==='undefined'||!skillTreeUnlocked)return{cost:typeof GEM_UNLOCK_COST!=='undefined'?GEM_UNLOCK_COST:25,label:'GALAXIES'};
    let best=null;
    if(typeof SKILL_TREE_NODES!=='undefined'&&typeof skillAvailable==='function'&&typeof skillCost==='function')
      SKILL_TREE_NODES.forEach(n=>{if(!skillAvailable(n.id))return;const c=skillCost(n);if(!best||c<best.cost)best={cost:c,label:String(n.name||'').replace(/^Continent:\s*/,'').toUpperCase()};});
    return best||{cost:0,label:'GALAXY MAP'};
  }
  function wantShown(){
    if(!B.contains('game-active')||B.contains('nav-locked'))return false;
    if(typeof skillTreeUnlocked!=='undefined'&&skillTreeUnlocked)return true;
    const party=typeof shop!=='undefined'&&(shop.partyLevel||0)>=1;
    if(!party){partySeenAt=0;return false;}
    if(!partySeenAt)partySeenAt=performance.now()-(partyWasLoaded?60000:0);
    partyWasLoaded=false;
    return performance.now()-partySeenAt>=30000;
  }
  function layout(){
    const land=B.contains('phone-land'),desk=B.contains('desktop-mode');
    ring.classList.toggle('gr-h',land||desk);ring.classList.toggle('gr-v',!land&&!desk);
    ring.style.setProperty('--gr',land?'34px':desk?'50px':'58px');
    const W=innerWidth;
    if(land){   // next to SHOP in the header row
      const sb=$('openStoreBtn'),r=sb&&sb.getBoundingClientRect();const w=ring.offsetWidth||90,h=ring.offsetHeight||34;
      const right=r&&r.width?r.left-10:W-12;ring.style.left=(right-w)+'px';ring.style.top=((r&&r.width?r.top+r.height/2:22)-h/2)+'px';ring.style.right='auto';return;}
    if(desk){   // beside the score
      const se=$('scoreEl');let r=null;try{const rg=document.createRange();rg.selectNodeContents(se);r=rg.getBoundingClientRect();}catch(e){}
      if(!r||!r.width)r=se?se.getBoundingClientRect():null;
      const h=ring.offsetHeight||50;if(r){ring.style.left=(r.right+26)+'px';ring.style.top=(r.top+r.height/2-h/2)+'px';ring.style.right='auto';}return;}
    // upright phone: top-right corner
    ring.style.left='auto';ring.style.right='10px';ring.style.top='calc(env(safe-area-inset-top,0px) + 8px)';
  }
  function paint(){
    const g=goal(),gems=typeof alienGems!=='undefined'?alienGems:0,fl=Math.floor(gems);
    if(shownCount===null||shownCount>fl)shownCount=fl;            // spending (or a fresh file) shows straight away
    if(!inFlight&&shownCount<fl)shownCount=fl;                    // nothing on the way: catch up
    const have=Math.min(shownCount,fl),c=g.cost;
    rN.innerHTML='';rN.appendChild(document.createTextNode(c?fmt(have)+' / '+fmt(c):fmt(have)));
    rL.textContent=g.label;
    const p=c?Math.min(1,have/c):1;ring.style.setProperty('--p',(p*100).toFixed(1)+'%');
    ring.classList.toggle('ready',!!c&&have>=c);
  }
  function setShown(on){
    if(on===shown)return;shown=on;ring.classList.toggle('on',on);
    if(on){shownCount=null;paint();layout();setTimeout(layout,50);
      try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.45);if(S)[0,.1,.2].forEach((d,i)=>k.tone(S,S.t+.15+d,[1318.5,1661.2,1975.5][i],{type:'triangle',a:.035,d:.4,rv:.6}));}}catch(e){}}
  }
  // v0.2.153: like the shop card, the galaxies launch by HOLDING the ring (it charges up for 1.2 s: fill, rumble, hum).
  // Afterwards a tap opens the map, and holding it replays the launch. (The hold itself lives in js/59.)
  if(typeof wireGalaxyHold==='function')wireGalaxyHold(ring);
  ring.addEventListener('click',e=>{e.stopPropagation();
    if(B.contains('galaxy-intro'))return;            // the release that finished a hold-to-launch
    if(typeof skillTreeUnlocked!=='undefined'&&skillTreeUnlocked){if(typeof openSkillTree==='function')openSkillTree();return;}
    const c=goal().cost,cls=Math.floor(alienGems)>=c?'nudge':'nope';   // affordable: a quick tap says "hold me"
    ring.classList.remove('nope','nudge');void ring.offsetWidth;ring.classList.add(cls);setTimeout(()=>ring.classList.remove(cls),450);
  });

  // ══════════ gems come off your buddies ══════════
  function onDrums(){return shown&&!(typeof overlayUp==='function'&&overlayUp())&&!document.hidden;}
  function buddyPoints(){
    if(typeof bouncers==='undefined')return [];
    const out=[];bouncers.forEach(b=>{const el=b&&b.el;if(!el||el.style.display==='none')return;const r=el.getBoundingClientRect();
      if(r.width&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth)out.push({x:r.left+r.width/2,y:r.top+r.height*.45});});
    return out;
  }
  function fly(from){
    const el=document.createElement('div');el.className='gem-fly';const ic=document.createElement('span');ic.className='agem';el.appendChild(ic);
    document.body.appendChild(el);inFlight++;
    const t0=performance.now(),D=950,pop=-38-Math.random()*20,sx=from.x,sy=from.y;
    (function step(now){
      const tr=ring.querySelector('.gr-ring').getBoundingClientRect(),tx=tr.left+tr.width/2,ty=tr.top+tr.height/2;
      const k=Math.min(1,(now-t0)/D);let x,y,s;
      if(k<.28){const q=k/.28,e=1-Math.pow(1-q,3);x=sx;y=sy+pop*e;s=.2+.9*e;}           // pops up off the buddy
      else{const q=(k-.28)/.72,e=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2,px=sx,py=sy+pop,cx=(px+tx)/2,cy=Math.min(py,ty)-60;
        x=(1-e)*(1-e)*px+2*(1-e)*e*cx+e*e*tx;y=(1-e)*(1-e)*py+2*(1-e)*e*cy+e*e*ty;s=1.1-.45*e;}  // arcs into the ring
      el.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) scale('+s.toFixed(2)+')';
      if(k<1&&shown){requestAnimationFrame(step);return;}
      el.remove();inFlight=Math.max(0,inFlight-1);
      shownCount=(shownCount||0)+1;paint();
      ring.classList.remove('bump');void ring.offsetWidth;ring.classList.add('bump');setTimeout(()=>ring.classList.remove('bump'),340);
    })(t0);
  }
  function watchGems(){
    const fl=Math.floor(typeof alienGems!=='undefined'?alienGems:0);
    if(lastFloor===null||!shown){lastFloor=fl;return;}
    const d=fl-lastFloor;lastFloor=fl;
    if(d<=0||d>40||!onDrums())return;                              // spending, a big refund or another screen: no show
    const pts=buddyPoints();if(!pts.length)return;
    const n=Math.min(6,d);
    for(let i=0;i<n;i++)setTimeout(()=>{if(!onDrums())return;const p=pts[Math.floor(Math.random()*pts.length)];fly(p);},i*(3800/n)+Math.random()*250);
  }

  // ══════════ MY ACCOUNT ══════════
  const ab=document.createElement('button');ab.id='accountBtn';ab.type='button';
  ab.innerHTML='<span class="ab-av"><svg viewBox="0 0 24 24" fill="none" stroke="#8ea2e8" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1.4-3.6 4.2-5.2 7.5-5.2s6.1 1.6 7.5 5.2"/></svg></span>MY ACCOUNT';
  document.body.appendChild(ab);
  const sh=document.createElement('div');sh.id='accountSheet';
  sh.innerHTML=`<div id="accountBox"><div class="as-h"><div class="as-t">MY ACCOUNT</div><button class="as-x" type="button">CLOSE</button></div>
    <div class="as-card"><b>PLAYING OFFLINE</b><span id="asWhere">Your progress is saved on this device.</span></div>
    <div class="as-card"><b>COMING SOON</b><span>Sign in to keep your buddies on every device, and play Alien Buddies online with your friends.</span></div>
    <div class="as-soon">SIGN IN · COMING SOON</div></div>`;
  document.body.appendChild(sh);
  function openAccount(){
    const w=$('asWhere');const slot=$('slotSubtitle');if(w)w.textContent='Your progress is saved on this device'+(slot&&slot.textContent?' ('+slot.textContent.trim().toLowerCase()+').':'.');
    sh.classList.add('open');}
  function closeAccount(){sh.classList.remove('open');}
  ab.addEventListener('click',e=>{e.stopPropagation();openAccount();});
  sh.addEventListener('click',e=>{if(e.target===sh)closeAccount();});
  sh.querySelector('.as-x').addEventListener('click',closeAccount);
  addEventListener('keydown',e=>{if(e.code==='Escape'&&sh.classList.contains('open'))closeAccount();});
  window.openAccountSheet=openAccount;
  function placeAccount(){
    const on=B.contains('game-active');ab.classList.toggle('on',on);if(!on)return;
    if(B.contains('phone-land'))return;                            // js/34 lines it up in the header row
    if(B.contains('desktop-mode')){   // computer: in the bottom row, after EDIT PADS (the top-left holds the drum tracker)
      const ep=$('padEditToggleBtn'),r=ep&&ep.getBoundingClientRect();
      ab.style.top='auto';ab.style.bottom='1.4rem';ab.style.left=(r&&r.width?r.right+10:340)+'px';return;}
    ab.style.bottom='auto';ab.style.left='10px';ab.style.top='calc(env(safe-area-inset-top,0px) + 10px)';
  }

  // ══════════ keep it all up to date ══════════
  if(typeof startGame==='function'){const sg=window.startGame;window.startGame=function(){const r=sg.apply(this,arguments);
    partySeenAt=0;partyWasLoaded=typeof shop!=='undefined'&&(shop.partyLevel||0)>=1;lastFloor=null;shownCount=null;setShown(false);return r;};}
  setInterval(()=>{try{
    setShown(wantShown());placeAccount();
    if(shown){watchGems();paint();if((++tf)%4===0)layout();}else lastFloor=null;
  }catch(e){console.warn('gem ring / account',e);}},250);
  addEventListener('resize',()=>{if(shown)layout();placeAccount();});
})();
