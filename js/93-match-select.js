// ══════════════════════════════════════════════
//  LEVEL SELECT + TIME-TRIAL CRYSTALS (v0.2.237)
//  Owned node: mg_select ("Level Select"). It adds a SELECT third beside the MATCHING GAME button once the
//  intro is done. SELECT lists the levels you have cleared, plus one ghost card for the next level and what
//  still stands in its way.
//  Replaying a cleared level starts a TIME TRIAL: the clock starts on your first flip. Beat the par time and
//  you earn a crystal for that level; faster earns a better one. Every crystal boosts Alien Gems per minute
//  AND energy per tap, and they add up inside the matching game (crystals in other games will multiply in).
//  Crystal value: platinum = 1 + (the level's matching multiplier − 1) × 0.25, so later levels are worth
//  more; lower ranks are fractions of that (blue 0.75, green 0.625, dark 0.55).
//  Par times are generated from the number of pairs and can be nudged in test mode with window.__matchPar.
// ══════════════════════════════════════════════
(function(){
  const $=id=>document.getElementById(id);
  const TIER_NAME=['DARK','GREEN','BLUE','PLATINUM'];
  const TIER_COL=['#3a3f4a','#3ddc84','#4aa8ff','#e8f4ff'];
  const TIER_FRAC=[.55,.625,.75,1];
  const MAX_LEVEL=25;   // the matching game's 26 levels are index 0 (intro) to 25

  const on=()=>typeof unlockedSkills!=='undefined'&&!!unlockedSkills.mg_select;

  // ── par times: generated from the number of pairs; window.__matchPar[level] overrides one ──
  window.__matchPar=window.__matchPar||{};
  function matchPar(lvl){
    const o=window.__matchPar&&window.__matchPar[lvl];
    if(o)return o;
    return Math.round((6+matchPairsForLevel(lvl)*4.2)*10)/10;
  }
  window.matchPar=matchPar;
  window.__matchParTable=()=>{const t=[];for(let L=1;L<=MAX_LEVEL;L++)t.push({level:L,pairs:matchPairsForLevel(L),par:matchPar(L)});return t;};

  function tierFor(lvl,secs){const p=matchPar(lvl);if(secs<=p*.8)return 3;if(secs<=p*.9)return 2;if(secs<=p)return 1;return 0;}
  function crystalValue(lvl,tier){const base=Math.max(2,1+(matchRewardForLevel(lvl)-1)*.25);return base*TIER_FRAC[tier];}   // never below 1.1, like world 1 of Planet Hop
  window.matchTierFor=tierFor;

  // ── the player's crystals: add inside the matching game, then other games multiply in later ──
  function crystalMult(){
    let sum=0;
    for(const k in matchCrystals){const c=matchCrystals[k];if(c&&typeof c.t==='number')sum+=crystalValue(+k,c.t);}
    return sum>0?sum:1;
  }
  window.crystalMult=crystalMult;

  function recordMatchCrystal(lvl,secs){
    const t=tierFor(lvl,secs),cur=matchCrystals[lvl];
    if(!cur||t>cur.t||(t===cur.t&&secs<cur.s))matchCrystals[lvl]={t,s:Math.round(secs*10)/10};
    if(typeof autoSave==='function')autoSave();
    return {tier:t,mult:crystalValue(lvl,t)};
  }
  window.recordMatchCrystal=recordMatchCrystal;

  // shown on the victory card
  window.matchTrialResult=function(lvl,secs){
    const r=recordMatchCrystal(lvl,secs),nm=TIER_NAME[r.tier],col=TIER_COL[r.tier];
    return {tier:r.tier,mult:r.mult,html:`<span style="color:${col}">${nm} CRYSTAL · ×${(+r.mult.toFixed(2))}</span>`};
  };

  // gems: the crystal multiplier rides on the minigame gem bonus
  if(typeof mgGemBonus==='function'){const g=mgGemBonus;window.mgGemBonus=function(){return g.apply(this,arguments)*crystalMult();};}

  // ── the SELECT third beside the matching button ──
  const mb=$('matchingGameBtn');
  let selBtn=null;
  if(mb&&mb.parentElement){
    const row=document.createElement('div');row.id='matchRow';
    mb.before(row);row.appendChild(mb);
    selBtn=document.createElement('button');selBtn.id='matchSelectBtn';selBtn.type='button';selBtn.textContent='SELECT';selBtn.title='Replay a level you cleared to chase a crystal';
    row.appendChild(selBtn);
    selBtn.addEventListener('click',()=>openSelect());
  }
  function syncSelect(){
    const show=on()&&typeof matchLevelsCompleted==='number'&&matchLevelsCompleted>=1;
    document.body.classList.toggle('match-select',show);
  }
  setInterval(syncSelect,700);syncSelect();
  window.__syncMatchSelect=syncSelect;

  // ── the level list ──
  let modal=null;
  function build(){
    if(modal)return modal;
    modal=document.createElement('div');modal.id='matchSelectModal';
    modal.innerHTML='<div class="msm-box"><div class="msm-head"><div><div class="msm-title">SELECT A LEVEL</div>'+
      '<div class="msm-sub">Replay a level you have cleared to chase a faster time and a better crystal.</div></div>'+
      '<button id="msmClose" type="button">✕ CLOSE</button></div><div class="msm-grid" id="msmGrid"></div></div>';
    document.body.appendChild(modal);
    $('msmClose').addEventListener('click',closeSelect);
    modal.addEventListener('click',e=>{if(e.target===modal)closeSelect();});
    return modal;
  }
  function medal(t){
    const c=t==null?'':TIER_COL[t];
    return `<span class="msm-medal${t==null?' none':''}" style="${c?'background:'+c+';box-shadow:0 0 8px '+c:''}"></span>`;
  }
  function openSelect(){
    build();
    const grid=$('msmGrid');grid.innerHTML='';
    const done=Math.max(0,Math.min(MAX_LEVEL,matchLevelsCompleted));
    for(let L=1;L<=done;L++){
      const c=matchCrystals[L];
      const card=document.createElement('button');card.type='button';card.className='msm-card';
      card.innerHTML=`<div class="msm-lvl">LEVEL ${L+1}</div><div class="msm-row">${medal(c?c.t:null)}<span class="msm-best">${c?c.s.toFixed(1)+'s':'—'}</span></div><div class="msm-par">PAR ${matchPar(L).toFixed(1)}s</div>`;
      card.addEventListener('click',()=>{closeSelect();if(typeof openMatchingLevel==='function')openMatchingLevel(L,true);});
      grid.appendChild(card);
    }
    const next=done+1;
    if(next<=MAX_LEVEL){
      const need=aliensNeededForLevel(next),have=typeof totalAliens==='number'?totalAliens:0,ready=have>=need;
      const ghost=document.createElement('button');ghost.type='button';ghost.className='msm-card ghost'+(ready?' ready':'');
      ghost.innerHTML=`<div class="msm-lvl">LEVEL ${next+1}</div><div class="msm-ghost">${ready?'READY TO PLAY':'NEED '+(need-have)+' MORE ALIEN BUDDIE'+(need-have===1?'':'S')}</div>`;
      if(ready)ghost.addEventListener('click',()=>{closeSelect();if(typeof openMatchingGame==='function')openMatchingGame();});
      else ghost.disabled=true;
      grid.appendChild(ghost);
    } else {
      const all=document.createElement('div');all.className='msm-alldone';all.textContent='ALL LEVELS CLEARED — chase platinum on every one.';
      grid.appendChild(all);
    }
    modal.classList.add('open');
  }
  function closeSelect(){if(modal)modal.classList.remove('open');}

  // ── a live clock while a time trial runs ──
  const clock=document.createElement('div');clock.id='matchTrialClock';
  const bar=$('matchScoreBar');if(bar)bar.appendChild(clock);
  setInterval(()=>{
    const t=window.__matchTrialInfo?window.__matchTrialInfo():{on:false};
    const mm=$('matchingModal'),win=$('matchVictory');
    if(!t.on||!mm||getComputedStyle(mm).display==='none'||(win&&getComputedStyle(win).display!=='none')){clock.style.display='none';return;}
    clock.style.display='';
    const s=t.secs||0,part=s.toString().split('.');
    clock.innerHTML=`<span>${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}.${part[1]?part[1][0]:'0'}</span><small>PAR ${matchPar(t.lvl).toFixed(0)}s</small>`;
  },150);

  const css=document.createElement('style');css.textContent=`
  #matchRow{display:flex;gap:6px;align-items:stretch;}
  #matchRow #matchingGameBtn{width:auto !important;flex:1 1 auto;min-width:0;}
  #matchSelectBtn{flex:0 0 33%;display:none;font-family:'Bebas Neue',sans-serif;font-size:.9rem;letter-spacing:.14em;border-radius:12px;border:1px solid #1a3a2a;background:#02120a;color:#33aa66;cursor:pointer;touch-action:manipulation;}
  body.match-select #matchSelectBtn{display:block;}
  #matchSelectBtn:hover{color:#7dffb0;border-color:#2a6a4a;}
  #matchTrialClock{display:none;font-family:'Bebas Neue',sans-serif;letter-spacing:.1em;color:#7fe8ff;text-align:center;flex-shrink:0;font-size:1rem;line-height:1.1;}
  #matchTrialClock small{display:block;font-size:.62em;color:#3a6a7a;letter-spacing:.12em;}
  #matchSelectModal{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;background:rgba(1,4,10,.86);padding:14px;}
  #matchSelectModal.open{display:flex;}
  #matchSelectModal .msm-box{width:100%;max-width:560px;max-height:86vh;overflow:auto;border-radius:16px;border:1px solid #1a3a2a;background:linear-gradient(160deg,#00110a,#02070f);padding:14px;}
  #matchSelectModal .msm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;}
  #matchSelectModal .msm-title{font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:.16em;color:#00ff88;}
  #matchSelectModal .msm-sub{font-family:'Bebas Neue',sans-serif;font-size:.8rem;letter-spacing:.08em;color:#3f7a5a;max-width:34ch;}
  #matchSelectModal #msmClose{font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:.1em;padding:.45rem .8rem;border-radius:10px;border:1px solid #1a3a2a;background:transparent;color:#336633;cursor:pointer;}
  #matchSelectModal .msm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;}
  #matchSelectModal .msm-card{text-align:left;font-family:'Bebas Neue',sans-serif;padding:.6rem .7rem;border-radius:12px;border:1px solid #1a3a2a;background:#03140c;color:#cfeee2;cursor:pointer;touch-action:manipulation;}
  #matchSelectModal .msm-card:hover{border-color:#2a6a4a;}
  #matchSelectModal .msm-card.ghost{opacity:.6;border-style:dashed;cursor:default;}
  #matchSelectModal .msm-card.ghost.ready{opacity:1;border-style:solid;border-color:#2a6a4a;cursor:pointer;}
  #matchSelectModal .msm-lvl{font-size:1.05rem;letter-spacing:.12em;color:#00ff88;}
  #matchSelectModal .msm-row{display:flex;align-items:center;gap:6px;margin-top:4px;}
  #matchSelectModal .msm-medal{width:12px;height:12px;border-radius:50%;background:#222833;border:1px solid #33404c;flex-shrink:0;}
  #matchSelectModal .msm-medal.none{background:transparent;border-style:dashed;}
  #matchSelectModal .msm-best{font-size:.95rem;letter-spacing:.08em;color:#8fd9c0;}
  #matchSelectModal .msm-par{font-size:.72rem;letter-spacing:.1em;color:#2f6a52;margin-top:2px;}
  #matchSelectModal .msm-ghost{font-size:.82rem;letter-spacing:.08em;color:#3f7a5a;margin-top:6px;}
  #matchSelectModal .msm-alldone{grid-column:1/-1;font-family:'Bebas Neue',sans-serif;letter-spacing:.1em;color:#3f7a5a;text-align:center;padding:10px;}
  `;document.head.appendChild(css);
})();
