// ══════════════════════════════════════════════
//  CRYSTALS — PLANET HOP WORLDS + THE TROPHY HALL (v0.2.240)
//  Finishing the last level of a world (3, 7, 11) banks that world's crystal: the average stardust across
//  the world's levels decides the colour — 100% platinum, 90%+ blue, 75%+ green, below that dark.
//  Platinum is worth the world's base (Luna 2×, Glacia 3×, Magmora 4×) to Alien Gems AND energy; the lower
//  ranks are fractions of it (0.75 / 0.625 / 0.55), so a dark crystal still helps.
//  Crystals add up inside a game and multiply across games (the matching crystals are js/93's).
//  The room plays through the portal, then the results card. The CRYSTALS hall lives in the Cockpit.
// ══════════════════════════════════════════════
(function(){
  const $=id=>document.getElementById(id);
  const WORLDS=[
    {id:0,name:'LUNA',levels:[1,2,3],base:2},
    {id:1,name:'GLACIA',levels:[4,5,6,7],base:3},
    {id:2,name:'MAGMORA',levels:[8,9,10,11],base:4}
  ];
  const NAMES=['DARK','GREEN','BLUE','PLATINUM'];
  const COLS=['#5a6270','#3ddc84','#4aa8ff','#eef7ff'];
  const FRAC=[.55,.625,.75,1];

  function worldAvg(w){const W=WORLDS[w];if(!W)return 0;let sum=0;W.levels.forEach(L=>{const b=(typeof phProgress!=='undefined'&&phProgress.best[L])||{};sum+=b.cleared?(b.dust||0):0;});return sum/W.levels.length;}
  function tierForAvg(a){return a>=.9999?3:a>=.9?2:a>=.75?1:0;}
  function phValue(w,t){return WORLDS[w].base*FRAC[t];}
  function phSum(){let s=0;for(const k in phCrystals){const c=phCrystals[k];if(c&&typeof c.t==='number')s+=phValue(+k,c.t);}return s>0?s:1;}

  // the matching crystals (js/93) then the Planet Hop worlds
  const baseMatch=window.crystalMult;
  window.crystalMult=function(){return (typeof baseMatch==='function'?baseMatch():1)*phSum();};

  window.recordPhCrystal=function(w){
    const avg=worldAvg(w),t=tierForAvg(avg),cur=phCrystals[w];
    if(!cur||t>cur.t||(t===cur.t&&avg>(cur.a||0)))phCrystals[w]={t,a:Math.round(avg*1000)/1000};
    try{if(typeof autoSave==='function')autoSave();}catch(e){}
    return {tier:t,avg,mult:phValue(w,t),name:NAMES[t],col:COLS[t]};
  };
  window.phCrystalInfo=function(w){
    const c=phCrystals[w],avg=worldAvg(w),t=c&&typeof c.t==='number'?c.t:tierForAvg(avg);
    return {world:WORLDS[w].name,tier:t,name:NAMES[t],col:COLS[t],mult:phValue(w,t),avg:c&&c.a!=null?c.a:avg,earned:!!c};
  };

  // ── the crystal room ──
  let room=null,roomDone=null;
  function buildRoom(){
    room=document.createElement('div');room.id='phCrystalRoom';
    room.innerHTML='<div class="pcr-glow"></div><div class="pcr-rig"><div class="pcr-base"></div><div class="pcr-crystal"><i class="pcr-f1"></i><i class="pcr-f2"></i><i class="pcr-f3"></i></div></div>'+
      '<div class="pcr-kicker" id="pcrKicker"></div><div class="pcr-title" id="pcrTitle"></div><div class="pcr-mult" id="pcrMult"></div><div class="pcr-sub" id="pcrSub"></div>'+
      '<button class="pcr-go" id="pcrGo" type="button">CONTINUE</button>';
    document.body.appendChild(room);
    $('pcrGo').addEventListener('click',()=>{room.classList.remove('open');const d=roomDone;roomDone=null;if(d)d();});
  }
  window.showCrystalRoom=function(w,c,onDone){
    if(!room)buildRoom();
    roomDone=onDone;
    const W=WORLDS[w],tier=c?c.tier:tierForAvg(worldAvg(w)),avg=c?c.avg:worldAvg(w);
    room.dataset.tier=String(tier);
    $('pcrKicker').textContent=W.name+' CRYSTAL';
    $('pcrTitle').textContent=NAMES[tier];
    const m=phValue(w,tier);
    $('pcrMult').textContent='×'+(+m.toFixed(2))+' Alien Gems · ×'+(+m.toFixed(2))+' energy';
    $('pcrSub').textContent=Math.round(avg*100)+'% stardust'+(tier===3?' · every drop collected':'');
    room.classList.add('open');
    try{const k=window.US_KIT;if(k&&k.mixer){const S=k.mixer(.6);if(S)[0,4,7,12].forEach((s,i)=>k.tone(S,S.t+i*.09,261.63*Math.pow(2,s/12),{type:'triangle',a:.02,d:.7,rv:.6}));}}catch(e){}
  };

  // ── the trophy hall (Cockpit) ──
  function pedestal(name,info){
    const d=document.createElement('div');d.className='ch-ped'+(info?'':' empty');
    if(info)d.style.setProperty('--cc',info.col);
    d.innerHTML='<div class="ch-gem"></div><div class="ch-name">'+name+'</div><div class="ch-val">'+(info?'×'+(+info.mult.toFixed(2))+' · '+info.name:'?')+'</div>';
    return d;
  }
  let hall=null;
  function buildHall(){
    hall=document.createElement('div');hall.id='crystalHall';
    hall.innerHTML='<div class="ch-box"><div class="ch-head"><div><div class="ch-title">CRYSTALS</div><div class="ch-sub">Every trophy you have earned, and every one still waiting.</div></div><button class="ch-close" id="chClose" type="button">✕ CLOSE</button></div><div id="chBody"></div></div>';
    document.body.appendChild(hall);
    $('chClose').addEventListener('click',()=>hall.classList.remove('open'));
    hall.addEventListener('click',e=>{if(e.target===hall)hall.classList.remove('open');});
  }
  window.openCrystalHall=function(){
    if(!hall)buildHall();
    const body=$('chBody');body.innerHTML='';
    const phRow=document.createElement('div');phRow.className='ch-row';
    phRow.innerHTML='<div class="ch-row-name">PLANET HOP</div><div class="ch-grid"></div>';
    const pg=phRow.querySelector('.ch-grid');
    WORLDS.forEach((W,i)=>{const info=phCrystalInfo(i);pg.appendChild(pedestal(W.name,info.earned?info:null));});
    body.appendChild(phRow);
    const mRow=document.createElement('div');mRow.className='ch-row';
    mRow.innerHTML='<div class="ch-row-name">MATCHING GAME</div><div class="ch-grid"></div>';
    const mg=mRow.querySelector('.ch-grid');
    for(let L=1;L<=25;L++){const c=matchCrystals[L];mg.appendChild(pedestal('LEVEL '+(L+1),c?{tier:c.t,name:NAMES[c.t],col:COLS[c.t],mult:matchCrystalValue(L,c.t)}:null));}
    body.appendChild(mRow);
    const soon=document.createElement('div');soon.className='ch-soon';
    soon.textContent='Worm Whack and Beat Defense crystals join the shelf when their time trials open.';
    body.appendChild(soon);
    hall.classList.add('open');
  };

  // ── the button in the Cockpit ──
  function count(){let n=0;WORLDS.forEach((W,i)=>{if(phCrystals[i])n++;});for(const k in matchCrystals)if(matchCrystals[k])n++;return {n,total:3+25};}
  function mountBtn(){
    const ck=$('cockpitView');if(!ck||$('crystalHallBtn'))return;
    const b=document.createElement('button');b.id='crystalHallBtn';b.type='button';
    b.addEventListener('click',openCrystalHall);
    const anchor=$('ckBonus');
    if(anchor&&anchor.parentElement===ck)anchor.after(b);else ck.appendChild(b);
  }
  setInterval(()=>{
    mountBtn();
    const b=$('crystalHallBtn');if(!b)return;
    const c=count(),t='💎 CRYSTALS · '+c.n+' / '+c.total;
    if(b.textContent!==t)b.textContent=t;
  },1200);

  const css=document.createElement('style');css.textContent=`
  #phCrystalRoom{position:fixed;inset:0;z-index:1300;display:none;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;padding:18px;text-align:center;font-family:'Bebas Neue',sans-serif;
    background:radial-gradient(ellipse at 50% 32%,#0a1830 0,#02040a 70%);opacity:0;transition:opacity .35s;}
  #phCrystalRoom.open{display:flex;opacity:1;}
  #phCrystalRoom[data-tier="0"]{--cc:#5a6270;--cg:rgba(90,98,112,.25);}
  #phCrystalRoom[data-tier="1"]{--cc:#3ddc84;--cg:rgba(61,220,132,.32);}
  #phCrystalRoom[data-tier="2"]{--cc:#4aa8ff;--cg:rgba(74,168,255,.34);}
  #phCrystalRoom[data-tier="3"]{--cc:#eef7ff;--cg:rgba(190,235,255,.45);}
  #phCrystalRoom .pcr-glow{position:absolute;left:50%;top:36%;width:64vmin;height:64vmin;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,var(--cg),transparent 62%);filter:blur(12px);pointer-events:none;animation:pcrPulse 2.6s ease-in-out infinite;}
  #phCrystalRoom .pcr-rig{position:relative;width:24vmin;height:32vmin;animation:pcrRise 1s cubic-bezier(.2,1.2,.3,1) both;}
  #phCrystalRoom .pcr-base{position:absolute;left:50%;bottom:-2.2vmin;width:30vmin;height:4vmin;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse,var(--cc),transparent 70%);opacity:.35;filter:blur(3px);}
  #phCrystalRoom .pcr-crystal{position:absolute;inset:0;clip-path:polygon(50% 0,100% 28%,82% 100%,18% 100%,0 28%);
    background:linear-gradient(160deg,rgba(255,255,255,.85),rgba(255,255,255,0) 34%),linear-gradient(200deg,rgba(255,255,255,.35),rgba(255,255,255,0) 55%),linear-gradient(180deg,var(--cc) 0,#0a1830 100%);
    filter:drop-shadow(0 0 22px var(--cc));animation:pcrFloat 4.2s ease-in-out infinite;}
  #phCrystalRoom .pcr-crystal i{position:absolute;display:block;background:rgba(255,255,255,.22);}
  #phCrystalRoom .pcr-f1{left:50%;top:0;width:1.4px;height:100%;transform:translateX(-50%);opacity:.55;}
  #phCrystalRoom .pcr-f2{left:18%;top:28%;width:82%;height:1.2px;transform:rotate(-27deg);transform-origin:left center;opacity:.35;}
  #phCrystalRoom .pcr-f3{left:18%;top:72%;width:82%;height:1.2px;transform:rotate(27deg);transform-origin:left center;opacity:.3;}
  #phCrystalRoom .pcr-kicker{font-size:1rem;letter-spacing:.32em;color:#7fa8c8;margin-top:2.2vmin;}
  #phCrystalRoom .pcr-title{font-size:3rem;letter-spacing:.16em;color:var(--cc);text-shadow:0 0 18px var(--cc);line-height:1;}
  #phCrystalRoom .pcr-mult{font-size:1.15rem;letter-spacing:.14em;color:#cfe8ff;}
  #phCrystalRoom .pcr-sub{font-size:.95rem;letter-spacing:.12em;color:#6f92ad;}
  #phCrystalRoom .pcr-go{margin-top:10px;font-family:'Bebas Neue',sans-serif;font-size:1.25rem;letter-spacing:.14em;padding:.6rem 1.8rem;border-radius:14px;border:1px solid var(--cc);background:#03121f;color:var(--cc);cursor:pointer;touch-action:manipulation;}
  @keyframes pcrRise{from{transform:translateY(45vh) scale(.7);opacity:0;}to{transform:none;opacity:1;}}
  @keyframes pcrFloat{0%,100%{transform:translateY(-1.2vmin);}50%{transform:translateY(1.2vmin);}}
  @keyframes pcrPulse{0%,100%{opacity:.55;}50%{opacity:1;}}

  #crystalHallBtn{width:100%;margin:.4rem 0 .2rem;font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:.14em;padding:.55rem .8rem;border-radius:12px;border:1px solid #2a4a6a;background:#04101c;color:#8fd9ff;cursor:pointer;touch-action:manipulation;}
  #crystalHall{position:fixed;inset:0;z-index:1200;display:none;align-items:center;justify-content:center;background:rgba(1,4,10,.86);padding:14px;}
  #crystalHall.open{display:flex;}
  #crystalHall .ch-box{width:100%;max-width:640px;max-height:88vh;overflow:auto;border-radius:16px;border:1px solid #24425f;background:linear-gradient(160deg,#04101c,#02070f);padding:14px;}
  #crystalHall .ch-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px;}
  #crystalHall .ch-title{font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:.18em;color:#8fd9ff;}
  #crystalHall .ch-sub{font-family:'Bebas Neue',sans-serif;font-size:.82rem;letter-spacing:.08em;color:#4a7a9a;max-width:36ch;}
  #crystalHall .ch-close{font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:.1em;padding:.45rem .8rem;border-radius:10px;border:1px solid #24425f;background:transparent;color:#4a8ab0;cursor:pointer;}
  #crystalHall .ch-row{margin:10px 0;}
  #crystalHall .ch-row-name{font-family:'Bebas Neue',sans-serif;font-size:.85rem;letter-spacing:.24em;color:#7fa8c8;margin-bottom:6px;}
  #crystalHall .ch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px;}
  #crystalHall .ch-ped{text-align:center;font-family:'Bebas Neue',sans-serif;padding:6px 4px 4px;border-radius:10px;background:#061522;border:1px solid #16324a;}
  #crystalHall .ch-gem{width:22px;height:30px;margin:0 auto 4px;clip-path:polygon(50% 0,100% 28%,82% 100%,18% 100%,0 28%);background:linear-gradient(180deg,var(--cc,#223042),#0a1622);filter:drop-shadow(0 0 6px var(--cc,#223042));}
  #crystalHall .ch-ped.empty{opacity:.55;}
  #crystalHall .ch-ped.empty .ch-gem{background:#131c28;filter:none;border:0;}
  #crystalHall .ch-name{font-size:.78rem;letter-spacing:.1em;color:#8fb8cf;}
  #crystalHall .ch-val{font-size:.7rem;letter-spacing:.06em;color:#4a7a9a;}
  #crystalHall .ch-soon{font-family:'Bebas Neue',sans-serif;font-size:.8rem;letter-spacing:.08em;color:#3a5a72;text-align:center;margin-top:10px;}
  `;document.head.appendChild(css);
})();
