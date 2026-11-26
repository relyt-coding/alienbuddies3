// ══════════════════════════════════════════════
//  v0.2.162 · ENERGY, GEM MATH, PARTY CORNER
//  • The score is energy in joules (formatting lives in js/01: fmtJ / jHtml / jParts).
//  • ALIEN GEM MATH: tap the gem counter in the BUNKER or the SHOP for a breakdown of where your gems come from;
//    the same section is added to the bottom of the ENERGY breakdown (tap the score). The gem ring stays the
//    skill tree button (js/71).
//  • PARTY sits in the top-left corner (where MY ACCOUNT was) on upright phones, and in the bottom row after
//    EDIT PADS on a computer. MY ACCOUNT now lives in Settings only. Sideways phones keep PARTY in the header (js/34).
//  • The DRUMS | KEYS switch in the sequencer row is the same size as its neighbours.
//  • The sequencer's dot tracker needs its own ACTIVATE (SEQ_TRACKER_COST, 1 MW) after the sequencer is bought.
// ══════════════════════════════════════════════
(function(){
  const $=id=>document.getElementById(id),B=document.body.classList;

  const css=document.createElement('style');css.textContent=`
/* gem math: the counters say "tap me" just by looking pressable */
#gemInfoShop,#gemCounterBunker{cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:10px;}
#gemInfoShop::after,#gemCounterBunker::after{content:'›';color:#2f9a78;font-size:1.1em;margin-left:.15rem;}
#gemInfoShop:active,#gemCounterBunker:active{background:rgba(93,255,192,.08);}
.ss-gem-btn{display:block;width:100%;margin:.55rem 0 .2rem;font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:.12em;padding:.55rem;
  border-radius:10px;border:1px solid #2f9a78;background:#06221a;color:#7affd6;cursor:pointer;}
/* ── v0.2.163: the WATTS breakdown / GEM MATH window, in the game's own look (black, neon, Bebas, dark tiles) ── */
#scoreStatsModal{background:rgba(0,0,0,.8);}
#scoreStatsBox{--ssc:#e6ff4a;--ssg:rgba(230,255,74,.35);background:#07070b;border:1px solid #1c1c24;border-top:2px solid var(--ssc);
  box-shadow:0 -10px 40px -12px var(--ssg);border-radius:20px 20px 0 0;}
#scoreStatsBox.ss-gems{--ssc:#5dffc0;--ssg:rgba(93,255,192,.35);}
#scoreStatsHeader{border-bottom:1px solid #16161e;padding:1rem 1.1rem .75rem;}
#scoreStatsTitle{display:flex;align-items:center;gap:.6rem;font-family:'Bebas Neue',sans-serif;font-size:1.45rem;letter-spacing:.14em;color:var(--ssc);
  text-shadow:0 0 14px var(--ssg);}
#scoreStatsTitle .ss-pic{width:2.1rem;height:2.1rem;}
#scoreStatsClose{min-width:2.6rem;min-height:2.6rem;border-radius:10px;border:1px solid #2a2a34;background:#101016;color:var(--ssc);font-size:1.05rem;}
.ss-section-label{display:flex;align-items:center;gap:.6rem;font-family:'Bebas Neue',sans-serif;font-size:.95rem!important;letter-spacing:.2em!important;
  color:var(--ssc)!important;opacity:.75;margin-top:.7rem!important;}
.ss-section-label::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--ssg),transparent);}
.ss-row{background:#0e0e14!important;border:1px solid #1a1a22!important;border-radius:12px!important;padding:.55rem .75rem!important;gap:.7rem!important;}
.ss-row.active{background:#101018!important;border-color:#26262f!important;}
.ss-icon{width:2.5rem!important;height:2.5rem;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#15151d;border:1px solid #23232c;border-radius:10px;}
.ss-row:not(.active) .ss-icon{opacity:.45;}
.ss-pic{display:inline-flex;align-items:center;justify-content:center;width:1.95rem;height:1.95rem;flex-shrink:0;}
.ss-pic canvas{width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;}
.ss-label{font-family:'Bebas Neue',sans-serif;font-size:1.12rem!important;letter-spacing:.08em!important;color:#5c5c6a!important;line-height:1.1;}
.ss-label.active{color:#ececf4!important;}
.ss-desc{font-family:system-ui,-apple-system,'Segoe UI',sans-serif!important;font-size:.76rem!important;letter-spacing:0!important;text-transform:none!important;
  color:#4a4a56!important;line-height:1.3;margin-top:2px;}
.ss-desc.active{color:#8c8c9c!important;}
.ss-val{font-family:'Bebas Neue',sans-serif;font-size:1.5rem!important;color:#3c3c48!important;}
.ss-val.active{color:#fff!important;}
.ss-val.gold{color:var(--ssc)!important;text-shadow:0 0 12px var(--ssg);}
.ss-val.green{color:#5dff9a!important;}
.ss-total-row{background:linear-gradient(135deg,#101018,#07070b)!important;border:1px solid var(--ssc)!important;border-radius:14px!important;
  box-shadow:0 0 24px -10px var(--ssg),inset 0 0 18px -12px var(--ssg);padding:.85rem 1rem!important;}
.ss-total-label{font-family:'Bebas Neue',sans-serif;color:#ececf4!important;letter-spacing:.16em!important;font-size:1.05rem!important;}
.ss-total-val{font-family:'Bebas Neue',sans-serif;color:var(--ssc)!important;font-size:2.3rem!important;text-shadow:0 0 16px var(--ssg);}
#scoreStatsDone{font-family:'Bebas Neue',sans-serif;border:1px solid var(--ssc)!important;background:#101016!important;color:var(--ssc)!important;border-radius:12px!important;
  letter-spacing:.2em;box-shadow:0 0 18px -8px var(--ssg);}
.ss-gem-btn{border-color:#5dffc0;background:#07170f;color:#5dffc0;}
/* the score: MILLIJOULES / JOULES spelled out until 1 kJ */
.score .w-unit{font-size:.36em;letter-spacing:.08em;white-space:nowrap;}
.score{white-space:nowrap;}   /* v0.2.165: the unit label never wraps onto a hidden second line */
/* the digit-milestone shimmer (js/25) paints the number with a clipped gradient; Safari dropped the unit label meanwhile */
body.phone-land .score .w-unit{font-size:.48em;margin-left:.08em;letter-spacing:.02em;}   /* sideways: the header row is tight */
.score.pl-milestone .w-unit{-webkit-text-fill-color:#fff;color:#fff;background:none;}
/* PARTY in the corner */
#partyBtn.pb-small.pb-corner{position:fixed!important;z-index:50;display:none;align-items:center;gap:.45rem;font-size:.98rem;letter-spacing:.1em;
  padding:.36rem .85rem .36rem .4rem;border-radius:50px;border-width:1px;background:#1a0418;border-color:#a0287f;color:#ff8ae6;
  box-shadow:0 0 14px -6px rgba(255,80,220,.8);}
#partyBtn.pb-small.pb-corner.visible{display:inline-flex;}
#partyBtn.pb-corner::before{content:'';width:1.5rem;height:1.5rem;border-radius:50%;flex-shrink:0;
  background:radial-gradient(circle at 34% 30%,#fff 0 9%,transparent 10%),repeating-conic-gradient(#d9d2ff 0 12deg,#7a6cc0 12deg 24deg),#b9b0f0;
  box-shadow:0 0 8px rgba(255,140,240,.55);}
#partyBtn.pb-corner.active::before{animation:pbSpin 2.4s linear infinite;}
#partyBtn.pb-corner.pb-mini{font-size:0;gap:0;padding:.3rem;}
#partyBtn.pb-corner.pb-mini::before{width:1.75rem;height:1.75rem;}
@keyframes pbSpin{to{transform:rotate(360deg);}}
body:not(.game-active) #partyBtn.pb-corner,body.nav-locked #partyBtn.pb-corner,body.intro-run #partyBtn.pb-corner,body.cockpit-open #partyBtn.pb-corner,
body.bestbuddy-open #partyBtn.pb-corner,body.vault-open #partyBtn.pb-corner,body.stats-open #partyBtn.pb-corner{display:none!important;}
body:not(.desktop-mode).store-open #partyBtn.pb-corner,body:not(.desktop-mode).bunker-open #partyBtn.pb-corner{display:none!important;}
/* MY ACCOUNT: Settings only */
#accountBtn{display:none!important;}
/* DRUMS | KEYS: same size as VIEW / SAVE / CLEAR next to it */
body:not(.desktop-mode) #seqPatternView .seq-bottom-row .keys-switch-seq{padding:1px;gap:1px;border-radius:6px;}
body:not(.desktop-mode) #seqPatternView .seq-bottom-row .keys-switch-seq button{font-size:.58rem;letter-spacing:.04em;padding:.2rem .42rem;border-radius:4px;}
.seq-bottom-row .keys-switch-seq button{font-size:.85rem;padding:.25rem .5rem;}
/* the sequencer tracker's own ACTIVATE */
#seqTrackerOverlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);border-radius:6px;
  -webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);z-index:5;}
#seqTrackerOverlay.on{display:flex;}
#seqTrackerActivateBtn{font-family:'Bebas Neue',sans-serif;font-size:.65rem;letter-spacing:.1em;padding:.3rem .7rem;border-radius:8px;border:1px solid #2a4a7a;
  background:#040d1a;color:#5aa8ff;cursor:pointer;touch-action:manipulation;white-space:nowrap;transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s;}
#seqTrackerActivateBtn.can{transform:scale(1.2);box-shadow:0 0 20px -2px rgba(90,168,255,.75);color:#bfe0ff;border-color:#5aa8ff;}
/* Buddy Keys unlock show (js/60) */
#bkUnlockFx{position:fixed;inset:0;z-index:100500;touch-action:none;}
#bkUnlockFx canvas{position:absolute;inset:0;}
#bkUnlockFx .bku-t{position:absolute;left:0;right:0;top:16%;text-align:center;opacity:0;transform:translateY(14px) scale(.9);transition:opacity .45s,transform .55s cubic-bezier(.3,1.6,.5,1);pointer-events:none;}
#bkUnlockFx.title .bku-t{opacity:1;transform:none;}
#bkUnlockFx .bku-t b{display:block;font-family:'Bebas Neue',sans-serif;font-weight:400;font-size:clamp(2.4rem,11vw,4.2rem);letter-spacing:.12em;color:#fff;
  text-shadow:0 0 18px #9d7bff,0 0 40px rgba(157,123,255,.7);}
#bkUnlockFx .bku-t span{display:block;margin-top:.3rem;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.14em;color:#c9b8ff;}
#bkUnlockFx .bku-skip{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 2rem);text-align:center;font-family:'Bebas Neue',sans-serif;
  letter-spacing:.2em;color:rgba(200,190,255,.35);font-size:.9rem;pointer-events:none;}
#bkUnlockFx.out{opacity:0;transition:opacity .3s;}
`;document.head.appendChild(css);

  // the breakdown window's title: a black & white card picture + the name; gems get their own colour
  function ssTitle(icon,text,gems){const t=$('scoreStatsTitle');if(!t)return;t.innerHTML='';
    if(typeof ssIconEl==='function')t.appendChild(ssIconEl(icon));t.appendChild(document.createTextNode(text));
    const bx=$('scoreStatsBox');if(bx)bx.classList.toggle('ss-gems',!!gems);}
  // ══════════ ALIEN GEM MATH ══════════
  const fx=v=>'×'+(Math.round(v*100)/100);
  const rate=v=>typeof fmtGemRate==='function'?fmtGemRate(v):String(Math.round(v*100)/100);
  function gemRows(list){
    const row=(i,l,d,v,on,c)=>list.appendChild(ssRow(i,l,d,v,on,c));
    const n=typeof totalAliens!=='undefined'?totalAliens:0,base=n*(typeof BASE_GEMS_PER_ALIEN_PER_MIN!=='undefined'?BASE_GEMS_PER_ALIEN_PER_MIN:1);
    const per=typeof BASE_GEMS_PER_ALIEN_PER_MIN!=='undefined'?BASE_GEMS_PER_ALIEN_PER_MIN:1;
    const harv=unlockedSkills&&unlockedSkills.gem_harvester_2?2:unlockedSkills&&unlockedSkills.gem_harvester_1?1.5:1;
    const sk=typeof skillGemMultiplier==='function'?skillGemMultiplier():1,mg=typeof mgGemBonus==='function'?mgGemBonus():1;
    const total=typeof gemsPerMinute==='function'?gemsPerMinute():base*harv*sk*mg;
    list.appendChild(ssLabel('ALIEN GEMS'));
    row('💎','GEMS',"Spend them in the galaxies' skill tree",typeof fmtGems==='function'?fmtGems(alienGems):String(Math.floor(alienGems)),true,'green');
    row('BUDDY','BUDDIES',n+' '+(n===1?'buddy':'buddies')+' × '+rate(per)+' gem'+(per===1?'':'s')+' a minute',rate(base)+'/min',n>0);
    if(harv>1)row('⛏','GEM HARVESTER','Skill tree',fx(harv),true);
    let nodes=0;if(typeof SKILL_TREE_NODES!=='undefined')SKILL_TREE_NODES.forEach(nd=>{if(nd.gemMult&&unlockedSkills[nd.id])nodes++;});
    row('🌌','GALAXY BOOSTS',nodes?nodes+' skill tree node'+(nodes===1?'':'s')+' with a gem bonus':'Skill tree nodes with a gem bonus',fx(sk),sk>1);
    row('🎮','MINIGAMES','Planet Hop, Worm Whack and Beat Defense wins',fx(mg),mg>1);
    const boosts=[harv,sk,mg].filter(v=>v>1).map(fx);
    row('⏱','GEMS PER MINUTE',boosts.length?rate(base)+'/min '+boosts.join(' '):'Your buddies, no boosts yet',rate(total)+'/min',total>0,'gold');
  }
  function openGemStats(){
    const list=$('scoreStatsList'),title=$('scoreStatsTitle');if(!list||typeof ssRow!=='function')return;
    list.innerHTML='';ssTitle('gem','ALIEN GEM MATH',true);
    gemRows(list);
    if(typeof skillTreeUnlocked!=='undefined'&&skillTreeUnlocked&&typeof openSkillTree==='function'){
      const b=document.createElement('button');b.type='button';b.className='ss-gem-btn';b.textContent='OPEN THE GALAXY MAP';
      b.addEventListener('click',()=>{if(typeof closeScoreStats==='function')closeScoreStats();if(typeof closeStore==='function'&&B.contains('store-open'))closeStore();if(typeof closeBunker==='function'&&B.contains('bunker-open'))closeBunker();openSkillTree();});
      list.appendChild(b);}
    trimLocked(list);
    $('scoreStatsModal').classList.add('open');B.add('stats-open');
  }
  window.openGemStats=openGemStats;
  // the ENERGY breakdown (tap the score) gets the gem section at the bottom
  if(typeof buildScoreStats==='function'){const bs=buildScoreStats;window.buildScoreStats=buildScoreStats=function(){
    const r=bs.apply(this,arguments);ssTitle('bolt','ENERGY BREAKDOWN',false);
    // v0.2.175: the shop ladders' ×1.5s, listed just before the gem section
    try{const L=$('scoreStatsList'),pm=typeof partyMult==='function'?partyMult():1,sm=typeof seqFeatMult==='function'?seqFeatMult():1;
      if(pm>1||sm>1){L.appendChild(ssLabel('FUSEBOX UPGRADES'));
        if(pm>1)L.appendChild(ssRow('🃏','ALIEN PARTY',(shop.partyLevel||0)+' level'+((shop.partyLevel||0)===1?'':'s')+' · ×1.5 each','×'+formatMult(pm),true,'green'));
        if(sm>1)L.appendChild(ssRow('🎛','SEQUENCER UPGRADES','BPM, 32 and 64 steps · ×1.5 each','×'+formatMult(sm),true,'green'));}}catch(e){}
    try{if((typeof totalAliens!=='undefined'&&totalAliens>0)||alienGems>0)gemRows($('scoreStatsList'));}catch(e){}
    try{trimLocked($('scoreStatsList'));}catch(e){}
    return r;};}
  // v0.2.165: only what you've unlocked shows: rows that are still OFF / ×1 go, then any section left empty
  function trimLocked(list){
    if(!list)return;
    [...list.querySelectorAll('.ss-row')].forEach(r=>{if(r.classList.contains('active'))return;
      const v=(r.querySelector('.ss-val')||{}).textContent||'';if(/^(OFF|×1|x1|0|0\/MIN)$/i.test(v.trim()))r.remove();});
    [...list.querySelectorAll('.ss-section-label')].forEach(l=>{let n=l.nextElementSibling;if(!n||n.classList.contains('ss-section-label')||!n.classList.contains('ss-row'))l.remove();});
  }
  window.trimLockedStats=trimLocked;
  ['gemInfoShop','gemCounterBunker'].forEach(id=>{const e=$(id);if(e)e.addEventListener('click',ev=>{ev.stopPropagation();openGemStats();});});

  // ══════════ PARTY in the corner ══════════
  const pb=$('partyBtn');
  function txtRect(id){const e=$(id);if(!e)return null;try{const rg=document.createRange();rg.selectNodeContents(e);const r=rg.getBoundingClientRect();return r.width?r:null;}catch(x){return null;}}
  function placeParty(){
    if(!pb)return;
    const corner=!B.contains('phone-land');
    if(corner){
      if(!pb.classList.contains('pb-corner')){pb.classList.add('pb-small','pb-corner');if(pb.parentNode!==document.body)document.body.appendChild(pb);}
      if(B.contains('desktop-mode')){   // computer: the bottom row, after EDIT PADS (where MY ACCOUNT was)
        const ep=$('padEditToggleBtn'),r=ep&&ep.getBoundingClientRect();
        pb.style.setProperty('top','auto','important');pb.style.setProperty('bottom','1.4rem','important');pb.style.setProperty('left',(r&&r.width?r.right+10:340)+'px','important');pb.classList.remove('pb-mini');return;}
      pb.style.setProperty('bottom','auto','important');pb.style.setProperty('left','10px','important');pb.style.setProperty('top','calc(env(safe-area-inset-top,0px) + 10px)','important');
      // narrow phones: if the label would run into the title or the score, just the disco ball
      pb.classList.remove('pb-mini');const r=pb.getBoundingClientRect();if(!r.width)return;
      const hit=q=>q&&r.right>q.left-10&&r.bottom>q.top-4&&r.top<q.bottom+4;
      pb.classList.toggle('pb-mini',hit(txtRect('titleEl'))||hit(txtRect('scoreEl')));
    }else if(pb.classList.contains('pb-corner')){   // sideways phone: back into the sequencer row / header (js/06, js/34)
      pb.classList.remove('pb-corner','pb-mini');['top','bottom','left'].forEach(k=>pb.style.removeProperty(k));
      if(typeof placeViewButtons==='function')try{placeViewButtons();}catch(e){}
    }
  }
  placeParty();setInterval(placeParty,400);addEventListener('resize',()=>setTimeout(placeParty,60));

  // ══════════ the sequencer tracker's ACTIVATE ══════════
  const ov=$('seqTrackerOverlay'),ab=$('seqTrackerActivateBtn');
  if(ab)ab.innerHTML=fmtJh(SEQ_TRACKER_COST)+' — ACTIVATE';
  function paintSeqTracker(){
    if(!ov)return;const need=typeof drum!=='undefined'&&drum.seqTracks>=1&&!seqTrackerActive;
    ov.classList.toggle('on',need);if(need&&ab)ab.classList.toggle('can',score>=SEQ_TRACKER_COST);
  }
  if(ab)ab.addEventListener('click',e=>{e.stopPropagation();
    if(seqTrackerActive)return;
    if(score<SEQ_TRACKER_COST){ab.classList.remove('nope');void ab.offsetWidth;ab.classList.add('nope');return;}
    score-=SEQ_TRACKER_COST;seqTrackerActive=true;
    if(typeof playSfxTierUnlock==='function')try{playSfxTierUnlock(1);}catch(x){}
    if(typeof flashBuy==='function')flashBuy('#5aa8ff');
    paintSeqTracker();if(typeof renderUI==='function')renderUI();if(typeof autoSave==='function')autoSave();
  });
  setInterval(paintSeqTracker,300);

  // ══════════ the hum on the file select screen (back since v0.2.166; it left with the groove in v0.2.157) ══════════
  // Browsers only allow sound after a tap, so it fades in with your first tap or key on the title / file screen.
  function titleHum(){
    if(B.contains('game-active'))return;   // (the file screen isn't part of any save: it always hums)
    try{getCtx();if(!ambStarted)startAmbience();
      if(ambGain&&audioCtx){const now=audioCtx.currentTime;if(ambGain.gain.value<AMB_LEVEL*.5){ambGain.gain.cancelScheduledValues(now);ambGain.gain.setValueAtTime(ambGain.gain.value,now);ambGain.gain.linearRampToValueAtTime(AMB_LEVEL,now+1.5);}}
    }catch(e){}
  }
  ['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,titleHum,{capture:true,passive:true}));
})();
