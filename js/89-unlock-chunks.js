// ══════════════════════════════════════════════
//  ONE NEW SCREEN AT A TIME (v0.2.205)
//  • The FUSEBOX (the shop, renamed: you invest energy into your power supply to get new features and multipliers)
//    stays locked (body.fuse-locked) until you own the sequencer. The first buddy now brings only the BUNKER (js/65
//    'navB'); buying the sequencer brings the FUSEBOX with its own one-screen cutscene ('navS'), once the sequencer's
//    own unlock flourish has played. Files opened before then build just the bunker + pads ('allB').
//  • The VAULT is locked (body.vault-locked, no VAULT button, no swipe page) until you buy it from the Fusebox: its
//    card sits under the Alien Buddies row and costs VAULT_COST (100 J), a price meant to feel special.
//    Saved as `vaultUnlocked` (js/02).
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList,$=id=>document.getElementById(id);
  const VAULT_COST=1000000;   // 100 J (internal units are 0.1 mJ)
  window.VAULT_COST=VAULT_COST;

  // ── FUSEBOX lock ──
  let fusePending=0,loadedAt=0;
  const busy=()=>B.contains('intro-run')||(typeof newFileIntroRunning==='function'&&newFileIntroRunning())||(typeof unlockCutsceneRunning==='function'&&unlockCutsceneRunning())||B.contains('nav-locked')||B.contains('buddy-hold')||!!document.querySelector('#eggReveal.on');
  function syncFuse(quiet){
    if(!B.contains('game-active')||typeof drum==='undefined')return;
    const want=!(typeof fuseboxOwned!=='undefined'&&fuseboxOwned);
    if(want){
      if(!B.contains('fuse-locked')){B.add('fuse-locked');if(B.contains('store-open')&&typeof closeStore==='function')closeStore();
        const sv=$('storeView');if(sv&&B.contains('desktop-mode'))sv.classList.add('sidebar-collapsed');}
      fusePending=0;return;}
    if(!B.contains('fuse-locked'))return;
    if(quiet){B.remove('fuse-locked');return;}
    // v0.2.208: the Fusebox is bought from its teaser (below): the switch flips, then its cutscene plays and it opens
    if(!fusePending)fusePending=performance.now()+900;
    if(performance.now()<fusePending||busy())return;
    fusePending=0;B.remove('fuse-locked');
    if(typeof playNewFileIntro!=='function'||!playNewFileIntro({mode:'navS',onDone:()=>{if(typeof repositionCollapseButtons==='function')repositionCollapseButtons();openNew('fuse');}}))
      {if(typeof repositionCollapseButtons==='function')repositionCollapseButtons();openNew('fuse');}
  }
  // v0.2.208: a screen that just unlocked opens by itself (desktop: its side panel slides open; phone: the page slides in)
  function openNew(which){
    const desk=B.contains('desktop-mode');
    let tries=0;
    const go=()=>{
      if(!B.contains('game-active'))return;
      if(busy()&&tries++<40){setTimeout(go,250);return;}   // a cutscene / hatch is still on: wait for it
      if(which==='vault'){if(typeof openVault==='function')openVault();return;}
      if(!desk&&typeof swipeNavGo==='function'){swipeNavGo(which==='fuse'?1:2,which==='fuse'?-1:1);return;}
      if(which==='fuse'){if(typeof openStore==='function')openStore();}else if(typeof openBunker==='function')openBunker();
      if(typeof repositionCollapseButtons==='function')setTimeout(repositionCollapseButtons,380);
    };
    setTimeout(go,desk?650:1600);
  }
  window.openNewlyUnlocked=openNew;
  setInterval(()=>syncFuse(false),300);
  if(typeof startGame==='function'){const sg=window.startGame;window.startGame=function(){const r=sg.apply(this,arguments);loadedAt=performance.now();syncFuse(true);syncVault();return r;};}
  // swipes skip a locked Fusebox / Vault (js/22 reads this)
  window.pageLocked=function(id){return id===1?B.contains('fuse-locked'):id===6?B.contains('vault-locked'):false;};
  if(typeof openStore==='function'){const os=openStore;window.openStore=openStore=function(){if(B.contains('fuse-locked'))return;return os.apply(this,arguments);};}

  // ── VAULT lock + its Fusebox card ──
  function syncVault(){B.toggle('vault-locked',!(typeof vaultUnlocked!=='undefined'&&vaultUnlocked));paintCard();}
  const card=document.createElement('button');card.type='button';card.id='vaultBuyCard';card.className='vault-card';
  card.innerHTML='<div class="vc-ico"><span></span></div><div class="vc-txt"><div class="vc-name">THE VAULT</div><div class="vc-sub">Lessons, music words and secrets of the game</div></div><div class="vc-price"><span class="upgrade-price" id="vaultCardPrice"></span></div>';
  (function place(){const sv=$('storeView');if(!sv)return;const lbl=[...sv.querySelectorAll('.store-section-label')].find(l=>/DRUM PAD/.test(l.textContent));
    if(lbl)lbl.parentNode.insertBefore(card,lbl);else{const sc=sv.querySelector('.store-scroll');sc&&sc.appendChild(card);}})();
  function paintCard(){
    const owned=typeof vaultUnlocked!=='undefined'&&vaultUnlocked;card.style.display=owned?'none':'';if(owned)return;
    const p=$('vaultCardPrice'),h=fmtJh(VAULT_COST);if(p._h!==h){p._h=h;p.innerHTML=h;}
    card.classList.toggle('can',typeof score==='number'&&score>=VAULT_COST);
  }
  setInterval(()=>{if(B.contains('game-active'))syncVault();},500);
  card.addEventListener('click',()=>{
    if(vaultUnlocked)return;
    if(score<VAULT_COST){card.classList.remove('nope');void card.offsetWidth;card.classList.add('nope');return;}
    score-=VAULT_COST;vaultUnlocked=true;syncVault();
    try{const k=window.US_KIT;if(k&&k.mixer){const S=k.mixer(.6);if(S){k.noise(S,S.t,{type:'lowpass',f0:600,f1:120,a:.12,d:.6});   // the heavy door
      [523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>k.tone(S,S.t+.35+i*.07,f,{type:'triangle',a:.045,d:1.1,rv:.7}));}}}catch(e){}
    const b=$('tipsBtn');if(b){b.classList.add('vault-new','vault-arrive');setTimeout(()=>b.classList.remove('vault-arrive'),2600);}
    openNew('vault');
    if(typeof renderUI==='function')renderUI();if(typeof autoSave==='function')autoSave();
  });

  const css=document.createElement('style');css.textContent=`
body.fuse-locked #openStoreBtn{visibility:hidden;pointer-events:none;}
body.thumb-nav.fuse-locked #openStoreBtn,body.fuse-locked #collapseShopBtn,body.fuse-locked #dawFillBtnR{display:none!important;}
body.fuse-locked.desktop-mode:not(.intro-run) #storeView{width:0 !important;overflow:hidden;border:none;}
body.fuse-locked #arrowShop{display:none!important;}
body.vault-locked #tipsBtn{display:none!important;}
#tipsBtn.vault-arrive{animation:vaultArrive 2.4s ease-out;}
@keyframes vaultArrive{0%{transform:scale(.3);box-shadow:0 0 0 0 rgba(255,214,90,.9);}25%{transform:scale(1.25);box-shadow:0 0 30px 8px rgba(255,214,90,.8);}100%{transform:none;box-shadow:none;}}
.vault-card{grid-column:1/-1;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;margin:.6rem 0 .2rem;padding:.8rem .9rem;border-radius:14px;border:1px solid #4a3a12;
  background:linear-gradient(135deg,#1a1404,#0c0a02 60%,#1a1205);color:#e8c45a;cursor:pointer;text-align:left;font-family:'Bebas Neue',sans-serif;touch-action:manipulation;}
.vault-card.can{border-color:#ffd65a;box-shadow:0 0 18px -4px rgba(255,214,90,.7);}
.vault-card.nope{animation:ghNudge .35s ease-in-out;}
.vault-card .vc-ico{width:44px;height:44px;flex-shrink:0;border-radius:50%;border:3px solid #c9a23a;background:radial-gradient(circle,#3a2c08 0 40%,#1a1404 41%);position:relative;}
.vault-card .vc-ico span{position:absolute;left:50%;top:50%;width:26px;height:4px;margin:-2px 0 0 -13px;background:#c9a23a;border-radius:2px;}
.vault-card .vc-ico span::after{content:'';position:absolute;left:0;top:0;width:26px;height:4px;background:#c9a23a;border-radius:2px;transform:rotate(90deg);}
.vault-card .vc-ico::after{content:'';position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#c9a23a;}
.vault-card .vc-ico{animation:vcSpin 6s linear infinite;}@keyframes vcSpin{to{transform:rotate(360deg);}}
.vault-card .vc-txt{flex:1;min-width:0;}
.vault-card .vc-name{font-size:1.25rem;letter-spacing:.12em;color:#ffd65a;}
.vault-card .vc-sub{font-family:'Space Mono',monospace;font-size:.68rem;color:#a08a4a;letter-spacing:0;}
.vault-card .vc-price{font-size:1.2rem;color:#ffd65a;white-space:nowrap;}`;
  document.head.appendChild(css);
})();


// ══════════════════════════════════════════════
//  TEASER SPACING (v0.2.208), shared by the disco ball (js/69, LEFT of the score) and the fusebox (below, RIGHT).
//  Order: sequencer → fusebox teaser → (30 s after the fusebox is bought) disco ball, so they never show together.
//  tzPlace(side,x,y,w,h,scoreRect) returns where the teaser should really go:
//  · desktop: hanging ABOVE the score, either side of its middle (beside it is where the dot trackers are).
//  · upright phone: beside the score text, above the tracker row.  · sideways phone: a flat row at the top.
//  · anything that would still touch a tracker is lifted above it.
// ══════════════════════════════════════════════
window.tzPlace=function(side,x,y,w,h,score){
  const B=document.body.classList;
  // sideways phone: a flat row just right of the score row (left of it are BUNKER / SETTINGS / EDIT PADS)
  if(B.contains('phone-land')){const sr=document.getElementById('scoreRow'),q=sr&&sr.getBoundingClientRect();return {x:q&&q.width?Math.min(innerWidth-w-44,q.right+10):x,y:2};}
  // desktop: hang above the score, one each side of its middle (the space under the title is free in every layout,
  //   while beside the number is where the dot trackers live)
  if(B.contains('desktop-mode')&&score){const cx=(score.left+score.right)/2;x=side==='L'?cx-24-w:cx+24;y=Math.max(4,score.top-h+6);}
  // never on a tracker: lift it clear
  const tr=document.getElementById(side==='L'?'manualTiersCol':'autoTiersCol');
  const r=tr&&tr.offsetParent!==null?tr.getBoundingClientRect():null;
  if(r&&r.width&&x<r.right+6&&x+w>r.left-6&&y<r.bottom+4&&y+h>r.top-4)y=Math.max(2,r.top-h-4);
  return {x,y};
};
window.tzRelease=function(){};
(function(){const c=document.createElement('style');c.textContent=`
body.phone-land #partyTeaser,body.phone-land #fuseTeaser{flex-direction:row;gap:4px;}
body.phone-land #partyTeaser .pt-string,body.phone-land #fuseTeaser .ft-wire{display:none;}`;document.head.appendChild(c);})();

// ══════════════════════════════════════════════
//  FUSEBOX TEASER (v0.2.208)
//  After the sequencer, the Fusebox is something you work toward instead of arriving on its own: a little fusebox
//  hangs on the RIGHT of the score (the disco ball hangs on the left), with its price and a fill bar. Tap it once you
//  can afford FUSE_COST (15 J): the breaker flips, the power hums on, then js/65's 'navS' cutscene plays and it opens.
//  Saved as `fuseboxOwned` (js/02).
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList,$=id=>document.getElementById(id);
  const FUSE_COST=150000;window.FUSE_COST=FUSE_COST;
  const tz=document.createElement('div');tz.id='fuseTeaser';tz.setAttribute('role','button');tz.setAttribute('aria-label','Fusebox');
  tz.innerHTML='<div class="ft-wire"></div><canvas></canvas><div class="ft-tag"><i class="ft-fill"></i><span></span></div>';
  const cv=tz.querySelector('canvas'),tag=tz.querySelector('.ft-tag span'),fill=tz.querySelector('.ft-fill');
  let on=false,raf=0,frame=0,t0=0,flip=0,seqAt=0,tf=0,seqLoaded=false;
  const size=()=>B.contains('phone-land')?30:B.contains('desktop-mode')?50:44;
  function paint(now){
    raf=requestAnimationFrame(paint);if((++frame)%2)return;
    const S=size(),k=Math.min(2,devicePixelRatio||1),W=S,H=Math.round(S*1.18);
    if(cv.width!==Math.round(W*k)){cv.width=Math.round(W*k);cv.height=Math.round(H*k);cv.style.width=W+'px';cv.style.height=H+'px';}
    const g=cv.getContext('2d');g.setTransform(k,0,0,k,0,0);g.clearRect(0,0,W,H);
    const ready=tz.classList.contains('ready'),t=(now-t0)/1000;
    const u=W/44;   // drawn on a 44-wide grid
    // the box
    const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
    rr(3*u,3*u,38*u,46*u,5*u);g.fillStyle='#3a3f48';g.fill();g.lineWidth=2*u;g.strokeStyle='#1c1f25';g.stroke();
    rr(7*u,7*u,30*u,38*u,3*u);g.fillStyle='#2a2e36';g.fill();
    // screws
    g.fillStyle='#6a707c';[[7,6],[37,6],[7,46],[37,46]].forEach(([x,y])=>{g.beginPath();g.arc(x*u,y*u,1.4*u,0,7);g.fill();});
    // the bolt sign (glows when you can afford it)
    const glow=ready?.65+.35*Math.sin(t*5):.0;
    g.beginPath();g.moveTo(24*u,10*u);g.lineTo(15*u,24*u);g.lineTo(21*u,24*u);g.lineTo(18*u,33*u);g.lineTo(29*u,19*u);g.lineTo(23*u,19*u);g.closePath();
    g.fillStyle=ready?`rgba(255,${210+Math.round(40*glow)},60,1)`:'#7a6a2a';g.fill();
    // the breaker switch: down (off) until bought, then flips up
    const up=Math.min(1,flip),wig=ready&&!flip?Math.sin(t*9)*.08:0;
    const ly=38*u,a=(-.9+1.8*up+wig);
    g.fillStyle='#14161a';rr(15*u,35*u,14*u,8*u,2*u);g.fill();
    g.save();g.translate(22*u,ly+1*u);g.rotate(a*.6);g.fillStyle=up>.5?'#5aff9a':'#c9ccd2';rr(-2.2*u,-7*u,4.4*u,8*u,1.5*u);g.fill();g.restore();
    // the little light
    g.beginPath();g.arc(34*u,40*u,2*u,0,7);g.fillStyle=up>.5?'#5aff9a':ready?`rgba(255,80,60,${.5+.5*Math.sin(t*6)})`:'#5a2a2a';g.fill();
    if(flip&&flip<1.01)flip=Math.min(1.01,flip+.12);
  }
  function place(){
    const se=$('scoreEl'),gv=$('gameView');if(!se||!gv)return;
    if(tz.parentElement!==gv)gv.appendChild(tz);
    let r;try{const rg=document.createRange();rg.selectNodeContents(se);r=rg.getBoundingClientRect();}catch(e){}
    if(!r||!r.width)r=se.getBoundingClientRect();
    const o=gv.getBoundingClientRect(),w=tz.offsetWidth||56,h=tz.offsetHeight||80,land=B.contains('phone-land');
    // clear everything under the score too (energy bar, exact line, ×N per tap), mirroring the disco ball on the left
    let right=r.right;['energyMeter','scoreSubEl','multEl'].forEach(id=>{const e=$(id);if(!e||!e.offsetParent)return;
      let q=e.getBoundingClientRect();if(id!=='energyMeter'){try{const rg=document.createRange();rg.selectNodeContents(e);q=rg.getBoundingClientRect();}catch(_){}}
      if(q.width&&q.top<r.bottom+h)right=Math.max(right,q.right);});
    const desk=B.contains('desktop-mode');
    if(land){const sr=$('scoreRow');if(sr){const q=sr.getBoundingClientRect();if(q.width)right=Math.max(right,q.right);}}
    let x=right+(land?10:18);
    // upright phone: beside the score text, its bottom level with the number (keeps clear of the tracker row below)
    let y=desk||land?r.top+r.height/2-h*.5:r.bottom-h+4;
    if(x+w>o.right-4)x=o.right-w-4;
    const p=typeof tzPlace==='function'?tzPlace('R',x,y,w,h,r):{x,y};
    tz.style.left=(p.x-o.left).toFixed(1)+'px';tz.style.top=(p.y-o.top).toFixed(1)+'px';
  }
  function show(v){
    if(v===on)return;on=v;
    if(v){tz.classList.add('on');place();setTimeout(place,60);if(!raf){t0=performance.now();raf=requestAnimationFrame(paint);}
      try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.5);if(S){k.noise(S,S.t+.3,{f0:900,f1:300,q:2,a:.04,d:.15});k.tone(S,S.t+.45,180,{f1:120,gl:.1,a:.06,d:.15});}}}catch(e){}}
    else{tz.classList.remove('on','ready');cancelAnimationFrame(raf);raf=0;if(typeof tzRelease==='function')tzRelease('R');}
  }
  function tick(){
    const active=B.contains('game-active'),seq=typeof drum!=='undefined'&&drum.seqTracks>=1,owned=typeof fuseboxOwned!=='undefined'&&fuseboxOwned;
    if(!active||!seq||(owned&&!flip)){seqAt=0;if(!flip)show(false);return;}
    if(flip)return;
    if(!seqAt)seqAt=performance.now()-(seqLoaded?60000:0);seqLoaded=false;
    // wait for the sequencer's own unlock flourish to finish
    const want=performance.now()-seqAt>=4000&&!(typeof overlayUp==='function'&&overlayUp())&&!B.contains('intro-run')&&!(typeof unlockCutsceneRunning==='function'&&unlockCutsceneRunning());
    show(want);if(!want)return;
    const ready=score>=FUSE_COST;tz.classList.toggle('ready',ready);
    const h=fmtJh(FUSE_COST);if(tag._h!==h){tag._h=h;tag.innerHTML=h;}fill.style.width=(Math.min(1,score/FUSE_COST)*100).toFixed(1)+'%';
    if((++tf)%4===0)place();
  }
  tz.addEventListener('click',e=>{e.stopPropagation();
    if(flip||typeof fuseboxOwned==='undefined'||fuseboxOwned)return;
    if(score<FUSE_COST){tz.classList.remove('nope');void tz.offsetWidth;tz.classList.add('nope');setTimeout(()=>tz.classList.remove('nope'),500);return;}
    score-=FUSE_COST;flip=.01;tz.classList.add('flipped');
    // the breaker clunks up and the power hums on
    try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.6);if(S){
      k.noise(S,S.t,{type:'lowpass',f0:1400,f1:200,a:.12,d:.08});k.tone(S,S.t,95,{f1:60,gl:.08,a:.12,d:.12});
      k.tone(S,S.t+.12,60,{a:.03,k:.25,hold:.5,d:.4});k.tone(S,S.t+.12,120,{a:.02,k:.25,hold:.5,d:.4});
      [523.25,783.99,1046.5].forEach((f,i)=>k.tone(S,S.t+.35+i*.08,f,{type:'triangle',a:.04,d:.6,rv:.6}));}}}catch(e){}
    if(typeof renderUI==='function')renderUI();
    setTimeout(()=>{tz.classList.add('gone');
      setTimeout(()=>{fuseboxOwned=true;flip=0;tz.classList.remove('flipped','gone');show(false);if(typeof autoSave==='function')autoSave();},450);},700);
  });
  if(typeof startGame==='function'){const sg=window.startGame;window.startGame=function(){const r=sg.apply(this,arguments);seqAt=0;flip=0;seqLoaded=typeof drum!=='undefined'&&drum.seqTracks>=1;show(false);return r;};}
  setInterval(()=>{try{tick();}catch(e){console.warn('fuse teaser',e);}},250);
  addEventListener('resize',()=>{if(on)place();});
  const css=document.createElement('style');css.textContent=`
#fuseTeaser{position:absolute;z-index:6;display:none;flex-direction:column;align-items:center;gap:2px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
#fuseTeaser.on{display:flex;animation:ftIn .9s cubic-bezier(.3,1.5,.5,1) both;}
#fuseTeaser .ft-wire{width:2px;height:10px;background:linear-gradient(#0000,#8a8a5a);}
#fuseTeaser canvas{display:block;}
#fuseTeaser .ft-tag{position:relative;overflow:hidden;font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:.08em;line-height:1;padding:3px 8px 2px;border-radius:999px;color:#e8dca2;
  background:rgba(20,18,6,.85);border:1px solid #6a5a1a;white-space:nowrap;}
#fuseTeaser .ft-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,214,60,.28);transition:width .4s;}
#fuseTeaser .ft-tag span{position:relative;}
#fuseTeaser.ready .ft-tag{color:#fff;border-color:#ffd63a;box-shadow:0 0 12px -2px rgba(255,214,60,.9);}
#fuseTeaser.ready canvas{filter:drop-shadow(0 0 9px rgba(255,214,60,.8));}
#fuseTeaser.flipped canvas{filter:drop-shadow(0 0 14px rgba(90,255,154,.9));}
#fuseTeaser.gone{transition:transform .45s ease-in,opacity .45s;transform:scale(.4) translateX(40px);opacity:0;}
#fuseTeaser.nope{animation:ptNope .45s ease-in-out!important;}
body.phone-land #fuseTeaser .ft-tag{font-size:12px;padding:2px 6px 1px;}
@keyframes ftIn{0%{transform:translateY(-30px);opacity:0;}100%{transform:none;opacity:1;}}`;
  document.head.appendChild(css);
})();
