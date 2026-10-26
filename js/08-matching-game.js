
// ══════════════════════════════════════════════
//  MATCHING GAME
// ══════════════════════════════════════════════
const MATCH_PATTERNS = [
  // Space/future themed emoji patterns — 50 unique
  '🚀','🛸','🌌','⭐','🪐','🌙','☄️','🌠',
  '👾','🤖','🔭','💫','🛰️','🌟','✨','⚡',
  '💎','🔮','🌀','🏆','🔯','🎇','🌈','🛡️',
  '🔋','🧬','👁️','🌊','🔴','🟣','🟡','🟢',
  '🎯','🧲','⚗️','🔬','🧪','🌡️','💡','🔭',
  '🏔️','🌋','🗺️','🧭','⚓','🔱','🌐','♾️',
  '🎴','🃏',
  // extra patterns so the biggest level (52 pairs) always has enough unique cards
  '🌑','🌕','🌗','🌘','🌒','🌖','🧿','🪂','🛩️','🔆','🪩','🧊','🌤️'
];

let matchCardEls=[];
let matchFlipped=[];
let matchMatched=[];
let matchLocked=false;
let matchPairs=0;
let matchCurrentLevel=1;
// Reward multiplier per level: intro=2, lvl1=2, lvl2=2, lvl3=3, lvl4=5, lvl5+=continues scaling
function matchRewardForLevel(lvl){
  if(lvl<=2)return 2;
  if(lvl===3)return 3;
  if(lvl===4)return 5;
  return 5+(lvl-4)*2; // lvl5=7, lvl6=9, etc.
}
let matchTotalPairs=4;
let matchSavedState=null; // saved mid-game progress

function aliensNeededForLevel(lvl){ return lvl*4; } // lvl1=4, lvl2=8, lvl3=12...
// Cards per game: intro = 4 cards (2 pairs), level 1 = 8, level 2 = 12 ... +4 cards each level
function matchPairsForLevel(lvl){ return 2*(lvl+1); }
let matchIntroInfoStage=false; // true while the intro's 'how it works' card is on screen

function updateMatchingBtn(){
  const btn=document.getElementById('matchingGameBtn');
  const lck=document.getElementById('matchingGameLock');
  if(!btn||!lck)return;
  const nextLvl=matchLevelsCompleted+1;
  const needed=aliensNeededForLevel(nextLvl);
  if(nextLvl>0&&totalAliens<needed){
    btn.style.opacity='.5';
    btn.style.borderColor='#1a3a2a';
    btn.style.color='#336633';
    btn.style.background='#020d06';
    btn.style.cursor='default';
    btn.style.boxShadow='none';
    const left=needed-totalAliens;
    btn.textContent='🃏 MATCHING GAME · '+left+' MORE ALIEN'+(left===1?'':'S')+' TO UNLOCK LVL '+nextLvl;
    lck.textContent='UNLOCKS AT '+needed+' ALIEN BUDDIES';
    btn.onclick=null;
  } else {
    btn.style.opacity='1';
    btn.style.borderColor='#00ff88';
    btn.style.color='#00ff88';
    btn.style.background='#041a0d';
    btn.style.cursor='pointer';
    btn.style.boxShadow='0 0 18px -4px rgba(0,255,136,.3)';
    if(nextLvl>25){
      btn.textContent='🃏 MATCHING GAME · ALL COMPLETE 🏆';
      lck.textContent='';
    } else {
      btn.textContent=nextLvl===0?'🃏 MATCHING GAME · INTRO':'🃏 MATCHING GAME · LVL '+nextLvl;
      lck.textContent='';
    }
    btn.onclick=openMatchingGame;
  }
}

function openMatchingGame(){
  const nextLvl=matchLevelsCompleted+1;
  if(nextLvl>25){showToast('All 25 levels complete!');return;}
  const needed=aliensNeededForLevel(nextLvl);
  if(nextLvl>0&&totalAliens<needed){showToast('Need '+needed+' aliens for level '+nextLvl);return;}
  const modal=document.getElementById('matchingModal');
  modal.style.display='flex';
  document.getElementById('matchTitle').textContent='🃏 MATCHING GAME';
  document.getElementById('matchVictory').style.display='none';
  initMatchStars();
  matchIntroInfoStage=false;
  // Intro won but the 'how it works' card wasn't finished: show that card again
  if(matchSavedState&&matchSavedState.level===nextLvl&&matchSavedState.infoStage){
    matchCurrentLevel=nextLvl;
    matchTotalPairs=matchPairsForLevel(nextLvl);
    document.getElementById('matchSubtitle').textContent='INTRO · FLIP THE CARD';
    document.getElementById('matchVictoryReward').textContent='PERMANENT ×'+matchRewardForLevel(0)+' MULTIPLIER EARNED!';
    buildLevel0Grid();
    return;
  }
  if(matchSavedState&&matchSavedState.level===nextLvl&&matchSavedState.pairs<matchSavedState.totalPairs){
    matchCurrentLevel=nextLvl;
    matchTotalPairs=matchSavedState.totalPairs;
    const lbl=nextLvl===0?'INTRO':'LEVEL '+matchCurrentLevel;
    document.getElementById('matchSubtitle').textContent=lbl+' · RESUMING — '+matchSavedState.pairs+'/'+matchTotalPairs+' PAIRS FOUND';
    document.getElementById('matchVictoryReward').textContent='PERMANENT ×'+matchRewardForLevel(matchCurrentLevel)+' MULTIPLIER EARNED';
    resumeMatchGrid(matchSavedState);
  } else {
    matchCurrentLevel=nextLvl;
    matchTotalPairs=matchPairsForLevel(matchCurrentLevel);
    const lbl=nextLvl===0?'INTRO':'LEVEL '+matchCurrentLevel;
    document.getElementById('matchSubtitle').textContent=lbl+' · FIND '+matchTotalPairs+' PAIRS ('+matchTotalPairs*2+' CARDS)';
    document.getElementById('matchVictoryReward').textContent='PERMANENT ×'+matchRewardForLevel(matchCurrentLevel)+' MULTIPLIER EARNED';
    buildMatchGrid();
  }
}

function buildLevel0Grid(){
  matchIntroInfoStage=true;
  document.getElementById('matchSubtitle').textContent='INTRO · FLIP THE CARD';
  const grid=document.getElementById('matchGrid');
  grid.innerHTML='';
  matchCardEls=[];matchFlipped=[];matchMatched=[];matchLocked=false;matchPairs=0;
  document.getElementById('matchPairsDisplay').textContent='FLIP THE CARD';
  document.getElementById('matchProgressBar').style.width='0%';
  grid.style.gridTemplateColumns='1fr';
  grid.style.gridTemplateRows='';
  grid.style.maxWidth='280px';
  grid.style.margin='0 auto';
  const msg='Visit the bunker every time you buy 4 Alien Buddies to play the matching game. Finding all matches wins you Multipliers!';
  const card=document.createElement('div');
  card.className='match-card';
  const back=document.createElement('div');back.className='match-card-face match-card-back';
  const front=document.createElement('div');front.className='match-card-face match-card-front';
  front.style.cssText='background:linear-gradient(135deg,#041a0d,#0a2a18);border-color:#00ff88;font-size:.78rem;font-family:Bebas Neue,sans-serif;letter-spacing:.1em;color:#00ff88;line-height:1.7;padding:1.2rem 1rem;display:flex;align-items:center;justify-content:center;text-align:center;';
  front.textContent=msg;
  card.appendChild(back);card.appendChild(front);
  // X button that appears after flipping
  const xBtn=document.createElement('button');
  xBtn.textContent='✕ DONE';
  xBtn.style.cssText="position:absolute;top:calc(.7rem + 15px);right:calc(.7rem + 15px);font-family:'Bebas Neue',sans-serif;font-size:.75rem;letter-spacing:.12em;padding:.3rem .7rem;border-radius:8px;border:1px solid #00ff88;background:#041a0d;color:#00ff88;cursor:pointer;touch-action:manipulation;z-index:20;display:none;";
  xBtn.addEventListener('click',()=>{
    // Reward is applied once by the victory screen's button (matchVictoryClose)
    matchIntroInfoStage=false;
    matchSavedState=null;
    document.getElementById('matchVictory').style.display='flex';
    playMatchFanfare();
  });
  grid.style.position='relative';
  grid.appendChild(xBtn);

  card.addEventListener('click',()=>{
    if(card.classList.contains('flipped'))return;
    card.classList.add('flipped');
    playMatchDing();
    document.getElementById('matchPairsDisplay').textContent='READ THE CARD, THEN PRESS DONE';
    document.getElementById('matchProgressBar').style.width='100%';
    setTimeout(()=>{ xBtn.style.display='block'; },700);
  });
  grid.appendChild(card);
  matchCardEls.push(card);matchFlipped.push(false);matchMatched.push(false);
}

// ── Sound effects for matching game ──
const MATCH_SFX_VOL=0.3; // matching-game sounds play at 30% of their original volume
function playMatchDing(){
  try{
    getCtx();
    const c=audioCtx,t=c.currentTime;
    [[880,0],[1320,.07]].forEach(([freq,delay])=>{
      const o=c.createOscillator(),g=c.createGain();
      o.type='sine';o.frequency.value=freq;
      o.connect(g);g.connect(masterGainNode);
      g.gain.setValueAtTime(0,t+delay);
      g.gain.linearRampToValueAtTime(.35*MATCH_SFX_VOL,t+delay+.02);
      g.gain.exponentialRampToValueAtTime(.001,t+delay+.22);
      o.start(t+delay);o.stop(t+delay+.23);
    });
  }catch(e){}
}

function playMatchFanfare(){
  try{
    getCtx();
    const c=audioCtx,t=c.currentTime;
    const notes=[523,659,784,1047,1319];
    notes.forEach((freq,i)=>{
      const delay=i*.09;
      const o=c.createOscillator(),g=c.createGain();
      o.type='triangle';o.frequency.value=freq;
      o.connect(g);g.connect(masterGainNode);
      g.gain.setValueAtTime(0,t+delay);
      g.gain.linearRampToValueAtTime(.28*MATCH_SFX_VOL,t+delay+.04);
      g.gain.setValueAtTime(.28*MATCH_SFX_VOL,t+delay+.15);
      g.gain.exponentialRampToValueAtTime(.001,t+delay+.55);
      o.start(t+delay);o.stop(t+delay+.6);
      const o2=c.createOscillator(),g2=c.createGain();
      o2.type='sine';o2.frequency.value=freq*1.5;
      o2.connect(g2);g2.connect(masterGainNode);
      g2.gain.setValueAtTime(0,t+delay+.02);
      g2.gain.linearRampToValueAtTime(.12*MATCH_SFX_VOL,t+delay+.06);
      g2.gain.exponentialRampToValueAtTime(.001,t+delay+.4);
      o2.start(t+delay+.02);o2.stop(t+delay+.5);
    });
  }catch(e){}
}

// ── Resume grid from saved state ──
function resumeMatchGrid(saved){
  const grid=document.getElementById('matchGrid');
  grid.innerHTML='';
  matchCardEls=[];matchFlipped=[];matchMatched=[];matchLocked=false;matchPairs=saved.pairs;

  document.getElementById('matchPairsDisplay').textContent=matchPairs+' / '+matchTotalPairs+' PAIRS';
  document.getElementById('matchProgressBar').style.width=(matchPairs/matchTotalPairs*100)+'%';

  const total=saved.cards.length;
  layoutMatchGrid(grid,total);

  saved.cards.forEach((cardData,idx)=>{
    const card=document.createElement('div');
    card.className='match-card';
    card.dataset.pattern=cardData.pattern;
    card.dataset.idx=idx;
    const back=document.createElement('div');back.className='match-card-face match-card-back';
    const front=document.createElement('div');front.className='match-card-face match-card-front';
    const hue=Math.floor(Math.random()*60)+180;
    front.style.background=`linear-gradient(135deg,hsl(${hue},60%,8%),hsl(${hue+40},70%,12%))`;
    front.style.borderColor=`hsl(${hue},60%,30%)`;
    front.style.fontSize='var(--mcard-font,1.6rem)';
    front.textContent=cardData.pattern;
    card.appendChild(back);card.appendChild(front);
    if(cardData.matched){
      card.classList.add('flipped','matched');
      matchMatched.push(true);matchFlipped.push(false);
    } else {
      matchMatched.push(false);matchFlipped.push(false);
      card.addEventListener('click',()=>onMatchCardClick(idx));
    }
    grid.appendChild(card);
    matchCardEls.push(card);
  });
}

function buildMatchGrid(){
  const grid=document.getElementById('matchGrid');
  grid.innerHTML='';
  matchCardEls=[];matchFlipped=[];matchMatched=[];matchLocked=false;matchPairs=0;
  document.getElementById('matchPairsDisplay').textContent='0 / '+matchTotalPairs+' PAIRS';
  document.getElementById('matchProgressBar').style.width='0%';

  // Pick patterns for this level
  const pool=[...new Set(MATCH_PATTERNS)].sort(()=>Math.random()-.5).slice(0,matchTotalPairs); // Set removes accidental duplicates
  const cards=[...pool,...pool].sort(()=>Math.random()-.5);

  // Grid cols: 4 pairs=8 cards=4×2, 5=10=5×2, 6=12=4×3, 7=14=7×2, 8=16=4×4...
  const total=cards.length;
  layoutMatchGrid(grid,total);

  cards.forEach((pattern,idx)=>{
    const card=document.createElement('div');
    card.className='match-card';
    card.dataset.pattern=pattern;
    card.dataset.idx=idx;

    const back=document.createElement('div');
    back.className='match-card-face match-card-back';

    const front=document.createElement('div');
    front.className='match-card-face match-card-front';
    // Space themed gradient bg
    const hue=Math.floor(Math.random()*60)+180; // blue-purple range
    front.style.background=`linear-gradient(135deg,hsl(${hue},60%,8%),hsl(${hue+40},70%,12%))`;
    front.style.borderColor=`hsl(${hue},60%,30%)`;
    front.style.fontSize='var(--mcard-font,1.6rem)';
    front.textContent=pattern;

    card.appendChild(back);card.appendChild(front);
    card.addEventListener('click',()=>onMatchCardClick(idx));
    grid.appendChild(card);
    matchCardEls.push(card);
    matchFlipped.push(false);
    matchMatched.push(false);
  });
}

function onMatchCardClick(idx){
  if(matchLocked)return;
  if(matchFlipped[idx]||matchMatched[idx])return;
  const already=matchFlipped.map((f,i)=>f&&!matchMatched[i]?i:-1).filter(i=>i>=0);
  if(already.length>=2)return;

  // Flip this card
  matchFlipped[idx]=true;
  matchCardEls[idx].classList.add('flipped');

  const nowFlipped=matchFlipped.map((f,i)=>f&&!matchMatched[i]?i:-1).filter(i=>i>=0);
  if(nowFlipped.length===2){
    matchLocked=true;
    const [a,b]=nowFlipped;
    const pa=matchCardEls[a].dataset.pattern;
    const pb=matchCardEls[b].dataset.pattern;
    if(pa===pb){
      // Match!
      playMatchDing();
      setTimeout(()=>{
        matchMatched[a]=true;matchMatched[b]=true;
        matchFlipped[a]=false;matchFlipped[b]=false;
        matchCardEls[a].classList.add('matched');
        matchCardEls[b].classList.add('matched');
        matchPairs++;
        document.getElementById('matchPairsDisplay').textContent=matchPairs+' / '+matchTotalPairs+' PAIRS';
        document.getElementById('matchProgressBar').style.width=(matchPairs/matchTotalPairs*100)+'%';
        matchLocked=false;
        if(matchPairs>=matchTotalPairs)setTimeout(showMatchVictory,500);
      },400);
    } else {
      // No match — flash wrong then flip back
      matchCardEls[a].classList.add('wrong');
      matchCardEls[b].classList.add('wrong');
      setTimeout(()=>{
        matchFlipped[a]=false;matchFlipped[b]=false;
        matchCardEls[a].classList.remove('flipped','wrong');
        matchCardEls[b].classList.remove('flipped','wrong');
        matchLocked=false;
      },900);
    }
  }
}

function showMatchVictory(){
  if(matchCurrentLevel===0&&!matchIntroInfoStage){
    // Intro won: hand over the card that explains how the alien matching game works
    matchSavedState=null;
    playMatchFanfare();
    buildLevel0Grid();
    return;
  }
  const rewardMult=matchRewardForLevel(matchCurrentLevel);
  document.getElementById('matchVictoryReward').textContent='PERMANENT ×'+rewardMult+' MULTIPLIER EARNED!';
  document.getElementById('matchVictory').style.display='flex';
  matchSavedState=null; // clear saved progress on win
  playMatchFanfare();
}

document.getElementById('matchVictoryClose')&&document.getElementById('matchVictoryClose').addEventListener('click',()=>{
  // Apply reward
  matchingMultiplier*=matchRewardForLevel(matchCurrentLevel);
  matchLevelsCompleted=matchCurrentLevel;
  matchIntroInfoStage=false;
  document.getElementById('matchingModal').style.display='none';
  showToast('🏆 ×'+matchRewardForLevel(matchCurrentLevel)+' multiplier added to your tap score!');
  updateMatchingBtn();
  renderUI();
  autoSave();
});

document.getElementById('matchCloseBtn')&&document.getElementById('matchCloseBtn').addEventListener('click',()=>{
  // Save mid-game progress
  if(matchIntroInfoStage){
    matchSavedState={level:0,totalPairs:matchPairsForLevel(0),pairs:matchPairsForLevel(0),infoStage:true,cards:[]};
    matchIntroInfoStage=false;
    autoSave();
    showToast('Progress saved — resume anytime!');
  } else if(matchPairs<matchTotalPairs){
    matchSavedState={
      level:matchCurrentLevel,
      totalPairs:matchTotalPairs,
      pairs:matchPairs,
      cards:matchCardEls.map((c,i)=>({pattern:c.dataset.pattern,flipped:matchFlipped[i],matched:matchMatched[i]}))
    };
    autoSave();
    showToast('Progress saved — resume anytime!');
  } else {
    matchSavedState=null;
  }
  document.getElementById('matchingModal').style.display='none';
});

// matchingGameBtn click handled dynamically in updateMatchingBtn via btn.onclick

// Starfield canvas
function initMatchStars(){
  const canvas=document.getElementById('matchStarsCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const stars=[];
  for(let i=0;i<180;i++){
    stars.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*1.5+.2,o:Math.random()*.8+.2,sp:Math.random()*.0003+.0001});
  }
  let animId;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    stars.forEach(s=>{
      s.o+=s.sp;if(s.o>1||s.o<.1)s.sp*=-1;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${s.o})`;ctx.fill();
    });
    if(document.getElementById('matchingModal').style.display!=='none'){animId=requestAnimationFrame(draw);}
    else{cancelAnimationFrame(animId);}
  }
  draw();
}

// Pick the column count that gives the BIGGEST cards for the screen (3:4 cards), and size the grid to fit.
// Desktop: uses most of the window. Phone: same as before (narrow column).
function layoutMatchGrid(grid,total){
  grid.dataset.total=total;
  const desktop=document.body.classList.contains('desktop-mode');
  const gap=6,pad=24;
  const availW=desktop?Math.min(window.innerWidth*0.92,1500):Math.min(520,window.innerWidth);
  const availH=desktop?Math.max(240,window.innerHeight-150):window.innerHeight*0.72;
  let best={cols:4,w:0};
  for(let c=2;c<=12;c++){
    const r=Math.ceil(total/c);
    const wByW=(availW-pad-(c-1)*gap)/c;
    const wByH=((availH-(r-1)*gap)/r)*3/4;
    const w=Math.floor(Math.min(wByW,wByH));
    if(w>best.w)best={cols:c,w};
  }
  const cols=best.cols;
  grid.style.gridTemplateColumns='repeat('+cols+',1fr)';
  grid.style.gridTemplateRows='';
  grid.style.alignContent='start';
  grid.style.margin='';
  grid.style.maxWidth=Math.min(availW,cols*best.w+(cols-1)*gap+pad)+'px';
  const fs=desktop?Math.max(1,best.w/46):1; // emoji/text scale with the card size
  const base=total<=8?2:total<=16?1.6:total<=32?1.2:total<=60?.9:.7;
  grid.style.setProperty('--mcard-font',(desktop?Math.max(base,Math.min(4.2,best.w/38)):base)+'rem');
}

addEventListener('resize',()=>{const g=document.getElementById('matchGrid'),m=document.getElementById('matchingModal');if(g&&m&&m.style.display!=='none'&&g.dataset.total)layoutMatchGrid(g,parseInt(g.dataset.total));});
