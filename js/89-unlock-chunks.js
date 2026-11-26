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
    const want=!(drum.seqTracks>=1);
    if(want){
      if(!B.contains('fuse-locked')){B.add('fuse-locked');if(B.contains('store-open')&&typeof closeStore==='function')closeStore();
        const sv=$('storeView');if(sv&&B.contains('desktop-mode'))sv.classList.add('sidebar-collapsed');}
      fusePending=0;return;}
    if(!B.contains('fuse-locked'))return;
    if(quiet){B.remove('fuse-locked');return;}
    // the sequencer just arrived: let its own unlock play, then the Fusebox gets its cutscene
    if(!fusePending)fusePending=performance.now()+2600;
    if(performance.now()<fusePending||busy())return;
    fusePending=0;B.remove('fuse-locked');
    if(typeof playNewFileIntro!=='function'||!playNewFileIntro({mode:'navS',onDone:()=>{if(typeof repositionCollapseButtons==='function')repositionCollapseButtons();}}))
      {if(typeof repositionCollapseButtons==='function')repositionCollapseButtons();}
  }
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
    if(typeof showToast==='function')showToast('THE VAULT is open! Find it at the top of your Bunker.');
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
