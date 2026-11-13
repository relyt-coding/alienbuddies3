
// ══════════════════════════════════════════════
//  TIERS
// ══════════════════════════════════════════════
const tiersContainer=document.getElementById('tiersContainer');
const autoTiersContainer=document.getElementById('autoTiersContainer');
function buildTierRowInto(i,container,prefix){
  const c=color(i);const row=document.createElement('div');row.className='tier-row';row.id=`${prefix}tier-${i}`;
  const spacer=document.createElement('div');spacer.className='tier-spacer';
  const dw=document.createElement('div');dw.className='tier-dots';
  for(let d=0;d<DOTS;d++){const dot=document.createElement('div');dot.className='tier-dot';dw.appendChild(dot);}
  const badge=document.createElement('div');badge.className='tier-mult';badge.style.color=c.hex;badge.textContent=`x${tierMultValueFor(prefix==='auto-'?'seq':'drum',i).toLocaleString()}`;
  row.appendChild(spacer);row.appendChild(dw);row.appendChild(badge);container.appendChild(row);
}
function ensureTiers(n){while(tiers.length<n){const i=tiers.length;tiers.push({litDots:0,multiplierActive:false});buildTierRowInto(i,tiersContainer,'');}}
function ensureAutoTiers(n){while(autoTiers.length<n){const i=autoTiers.length;autoTiers.push({litDots:0,multiplierActive:false});buildTierRowInto(i,autoTiersContainer,'auto-');}}
ensureTiers(1);

// ══════════════════════════════════════════════
//  BUNKER
// ══════════════════════════════════════════════
const bunkerGrid=document.getElementById('bunkerGrid');
function buildBunkerGrid(){bunkerGrid.innerHTML='';for(let i=0;i<BUNKER_SIZE;i++){const c=document.createElement('div');c.className='alien-cell';c.id=`bcell-${i}`;bunkerGrid.appendChild(c);}}

function buildIncubatorGrid(){
  const grid=document.getElementById('incubatorGrid');
  if(!grid)return;
  grid.innerHTML='';
  for(let i=0;i<9;i++){
    const c=document.createElement('div');
    c.className='egg-cell'+(i===0&&hasReceivedEgg?' has-egg':'');
    c.id=`ecell-${i}`;
    if(i===0&&hasReceivedEgg)c.textContent='🥚';
    grid.appendChild(c);
  }
}

function updateIncubatorVisibility(){
  const sec=document.getElementById('incubatorSection');
  if(sec)sec.style.display=hasReceivedEgg?'block':'none';
}
// ── Bunker Pinch-to-Zoom + Pan ──
let bZoom=1, bPanX=0, bPanY=0;
let bPinchStart=null, bDragStart=null;
const bunkerGridWrap=document.querySelector('.bunker-grid-wrap');
function getBunkerGrid(){return document.getElementById('bunkerGrid');}

function clampPan(){
  // Clamp pan so grid can't be dragged fully off screen
  const g=getBunkerGrid();if(!g)return;
  const ww=bunkerGridWrap.clientWidth, wh=bunkerGridWrap.clientHeight;
  const gw=g.offsetWidth, gh=g.offsetHeight;
  const maxX=Math.max(0,(gw*bZoom-ww)/2);
  const maxY=Math.max(0,(gh*bZoom-wh)/2);
  bPanX=Math.max(-maxX,Math.min(maxX,bPanX));
  bPanY=Math.max(-maxY,Math.min(maxY,bPanY));
}

function applyBunkerTransform(){
  const g=getBunkerGrid();if(!g)return;
  g.style.transform=`translate(${bPanX}px,${bPanY}px) scale(${bZoom})`;
}

function resetBunkerView(){bZoom=1;bPanX=0;bPanY=0;applyBunkerTransform();}

bunkerGridWrap&&bunkerGridWrap.addEventListener('touchstart',e=>{
  if(e.touches.length===2){
    // Start pinch — record midpoint in grid-local coords for zoom-to-point
    const t0=e.touches[0],t1=e.touches[1];
    const midX=(t0.clientX+t1.clientX)/2;
    const midY=(t0.clientY+t1.clientY)/2;
    const rect=bunkerGridWrap.getBoundingClientRect();
    bPinchStart={
      dist:Math.hypot(t0.clientX-t1.clientX,t0.clientY-t1.clientY),
      zoom:bZoom, panX:bPanX, panY:bPanY,
      // midpoint relative to wrap center
      cx:midX-rect.left-rect.width/2,
      cy:midY-rect.top-rect.height/2
    };
    bDragStart=null;
    e.preventDefault();
  } else if(e.touches.length===1&&bZoom>1){
    // Start pan drag (only when zoomed in)
    bDragStart={x:e.touches[0].clientX,y:e.touches[0].clientY,panX:bPanX,panY:bPanY};
    bPinchStart=null;
  }
},{passive:false});

bunkerGridWrap&&bunkerGridWrap.addEventListener('touchmove',e=>{
  if(e.touches.length===2&&bPinchStart){
    const t0=e.touches[0],t1=e.touches[1];
    const dist=Math.hypot(t0.clientX-t1.clientX,t0.clientY-t1.clientY);
    const newZoom=Math.min(5,Math.max(1,bPinchStart.zoom*(dist/bPinchStart.dist)));
    // Zoom toward the pinch midpoint
    const scale=newZoom/bPinchStart.zoom;
    bPanX=bPinchStart.cx-(bPinchStart.cx-bPinchStart.panX)*scale;
    bPanY=bPinchStart.cy-(bPinchStart.cy-bPinchStart.panY)*scale;
    bZoom=newZoom;
    clampPan();
    applyBunkerTransform();
    e.preventDefault();
  } else if(e.touches.length===1&&bDragStart){
    bPanX=bDragStart.panX+(e.touches[0].clientX-bDragStart.x);
    bPanY=bDragStart.panY+(e.touches[0].clientY-bDragStart.y);
    clampPan();
    applyBunkerTransform();
    e.preventDefault();
  }
},{passive:false});

bunkerGridWrap&&bunkerGridWrap.addEventListener('touchend',e=>{
  if(e.touches.length<2)bPinchStart=null;
  if(e.touches.length===0)bDragStart=null;
},{passive:true});

// Double-tap to reset
let bunkerLastTap=0;
bunkerGridWrap&&bunkerGridWrap.addEventListener('touchend',e=>{
  if(e.touches.length>0)return;
  const now=Date.now();
  if(now-bunkerLastTap<280){resetBunkerView();}
  bunkerLastTap=now;
},{passive:true});

// Fit name text inside its cell by shrinking font size until no overflow
function fitCellName(nameEl){
  if(!nameEl||!nameEl.textContent)return;
  const parent=nameEl.parentElement;
  if(!parent)return;
  const maxW=parent.clientWidth-4; // 4px padding
  let size=parseFloat(getComputedStyle(nameEl).fontSize)||10;
  // Start from the computed size and shrink until it fits
  while(nameEl.scrollWidth>maxW&&size>5){
    size-=0.5;
    nameEl.style.fontSize=size+'px';
  }
}

function renderBunkerView(){
  const idx=viewingBunker,inThis=Math.max(0,Math.min(BUNKER_SIZE,totalAliens-idx*BUNKER_SIZE));
  const completed=Math.floor(totalAliens/BUNKER_SIZE);
  document.getElementById('statTotal').textContent=totalAliens.toLocaleString();
  updateBouncerToggleVisibility();
  document.getElementById('statBunkers').textContent=completed;
  document.getElementById('statCurrent').textContent=inThis;
  // two pieces that each stay whole, so on a narrow phone it wraps between them instead of running under BACK
  document.getElementById('bunkerSubEl').innerHTML=`<span>${inThis} / ${BUNKER_SIZE} ALIENS ·</span> <span>BUNKER #${idx+1}</span>`;
  document.getElementById('bunkerNumberLabel').textContent=`BUNKER #${idx+1}`;
  const banner=document.getElementById('bunkerFullBanner');
  if(inThis>=BUNKER_SIZE){
    banner.classList.add('show');
    document.getElementById('bunkerFullSub').textContent=hasReceivedEgg?'Check your Incubator below!':'Your Bunker is full — claim your egg!';
    // Trigger egg reward if not yet received
    if(!hasReceivedEgg&&!hasShownEggReward){
      hasShownEggReward=true;
      setTimeout(()=>{
        const m=document.getElementById('eggRewardModal');
        if(m)m.style.display='flex';
      },600);
    }
  }
  else banner.classList.remove('show');
  for(let i=0;i<BUNKER_SIZE;i++){
    const cell=document.getElementById(`bcell-${i}`);if(!cell)continue;
    const globalIdx=idx*BUNKER_SIZE+i;
    if(i<inThis){
      if(!cell.classList.contains('occupied')){
        cell.classList.add('occupied');
        const col=getAlienColor(globalIdx);
        cell.style.borderColor=col;cell.style.boxShadow=`0 0 6px -2px ${col}`;
        const ad=alienData[globalIdx]||{name:''};
        cell.innerHTML='';
        const emojiDiv=document.createElement('canvas');emojiDiv.className='cell-buddy';
        const nameDiv=document.createElement('div');nameDiv.className='alien-cell-name';nameDiv.textContent=ad.name||'';nameDiv.style.color=col;
        cell.appendChild(emojiDiv);cell.appendChild(nameDiv);paintCellBuddy(emojiDiv,globalIdx);
        if(ad.name)requestAnimationFrame(()=>fitCellName(nameDiv));
        cell._globalIdx=globalIdx;
        cell.onclick=()=>{if(bunkerPickMode)toggleBouncerPick(globalIdx);else openAlienNameModal(globalIdx);};
      } else {
        // the buddy picture follows the cell size (it may have been drawn while the bunker was hidden)
        const cv=cell.querySelector('.cell-buddy');if(cv&&cell.clientWidth&&Math.abs((cv._w||0)-cell.clientWidth)>2)paintCellBuddy(cv,globalIdx);
        // Update name visibility
        const nameDiv=cell.querySelector('.alien-cell-name');
        // names always visible in bunker grid
      }
    }else{cell.classList.remove('occupied');cell.textContent='';cell.style.borderColor='';cell.style.boxShadow='';cell.onclick=null;}
  }
  refreshBunkerMarks();
  const pct=(inThis/BUNKER_SIZE)*100;document.getElementById('bunkerProgressBar').style.width=pct+'%';document.getElementById('progLabel').textContent=`${inThis} / ${BUNKER_SIZE} SLOTS FILLED`;document.getElementById('progPct').textContent=Math.floor(pct)+'%';
}

// ══════════════════════════════════════════════
//  BUNKER TOGGLES + ALIEN NAMING
// ══════════════════════════════════════════════
const toggleBouncersBtn=document.getElementById('toggleBouncersBtn');

// ALIENS button: 3 settings, saved with the game
//   all    = buddies bounce everywhere (default)
//   bunker = they only come out while the bunker is open
//   off    = no bouncing buddies (ALIEN PARTY switches them back to all)
let bouncerMode='all';
const BOUNCER_MODES={all:'🛸 ALIENS: ALL',bunker:'🛸 ALIENS: BUNKER ONLY',off:'🛸 ALIENS: OFF'};
function applyBouncerMode(){
  if(!BOUNCER_MODES[bouncerMode])bouncerMode='all';
  const want=bouncerMode==='all'||(bouncerMode==='bunker'&&document.body.classList.contains('bunker-open'));
  if(toggleBouncersBtn){toggleBouncersBtn.textContent=BOUNCER_MODES[bouncerMode];toggleBouncersBtn.classList.toggle('active',bouncerMode!=='off');}
  if(want===showBouncers)return;
  showBouncers=want;
  bouncers.forEach(b=>b.el.style.display=showBouncers?'':'none');
}
function setBouncerMode(m){bouncerMode=m;applyBouncerMode();if(typeof autoSave==='function')autoSave();}
toggleBouncersBtn&&toggleBouncersBtn.addEventListener('click',()=>{
  const order=['all','bunker','off'];setBouncerMode(order[(order.indexOf(bouncerMode)+1)%order.length]);
  showToast({all:'🛸 Aliens bounce everywhere',bunker:'🛸 Aliens only come out in the bunker',off:'🛸 Aliens are hidden (ALIEN PARTY brings them back)'}[bouncerMode]);
  if(document.body.classList.contains('bunker-open'))renderBunkerView();
});
// opening / closing the bunker shows or hides them in BUNKER ONLY mode
new MutationObserver(()=>{if(bouncerMode==='bunker')applyBouncerMode();}).observe(document.body,{attributes:true,attributeFilter:['class']});

// ── Choose which aliens bounce on screen ──
let bunkerPickMode=false;
function refreshBunkerMarks(){
  // choosing which aliens bounce only matters once there are more than 10
  const canPick=totalAliens>=11;
  if(!canPick&&bunkerPickMode)bunkerPickMode=false;
  const row=document.getElementById('bunkerPickRow');if(row)row.style.display=canPick?'flex':'none';
  const pbtn=document.getElementById('anmOnScreenBtn');if(pbtn)pbtn.style.display=canPick?'':'none';
  const on=new Set(desiredBouncerIdxs());
  document.querySelectorAll('.alien-cell.occupied').forEach(c=>c.classList.toggle('onscreen',on.has(c._globalIdx)));
  const lbl=document.getElementById('bunkerOnScreenLabel');
  if(lbl)lbl.textContent=`ON SCREEN ${on.size} / ${bouncerMax()}`;
  const btn=document.getElementById('bunkerPickBtn');
  if(btn){btn.classList.toggle('active',bunkerPickMode);btn.textContent=bunkerPickMode?'✓ DONE PICKING':'🛸 PICK ON-SCREEN ALIENS';}
  document.body.classList.toggle('pick-mode',bunkerPickMode);
  const pb=document.getElementById('anmOnScreenBtn');
  if(pb&&alienProfileIdx!==null)pb.textContent=on.has(alienProfileIdx)?'🛸 ON SCREEN — TAP TO REMOVE':'🛸 OFF SCREEN — TAP TO ADD';
}
document.getElementById('bunkerPickBtn')&&document.getElementById('bunkerPickBtn').addEventListener('click',()=>{
  bunkerPickMode=!bunkerPickMode;refreshBunkerMarks();
  if(bunkerPickMode)showToast('Tap aliens to put them on screen or take them off');
});
document.getElementById('anmOnScreenBtn')&&document.getElementById('anmOnScreenBtn').addEventListener('click',()=>{
  if(alienProfileIdx!==null){toggleBouncerPick(alienProfileIdx);refreshBunkerMarks();}
});
function updateBouncerToggleVisibility(){
  if(toggleBouncersBtn)toggleBouncersBtn.style.display=totalAliens>=5?'':'none';
}
function applyBouncerNameVisibility(){
  bouncers.forEach(b=>{
    if(!b._nameEl)return;
    const ad=alienData[b.idx];
    const hasName=!!(ad&&ad.name);
    b._nameEl.classList.remove('hidden');
    b._nameEl.style.display=hasName?'block':'none';
  });
}

// ── Alien Profile Modal ──
let alienProfileIdx=null; // currently viewed alien global index
let anmEditOpen=false;
const alienNameModal=document.getElementById('alienNameModal');
const alienNameInput=document.getElementById('alienNameInput');
const alienNamePreview=document.getElementById('alienNamePreview');
let alienNameBox=document.getElementById('alienNameBox');
const anmNameEl=document.getElementById('anmName');
const anmCounter=document.getElementById('anmCounter');
const anmPrevBtn=document.getElementById('anmPrevBtn');
const anmNextBtn=document.getElementById('anmNextBtn');
const anmEditSection=document.getElementById('anmEditSection');
const anmEditBtn=document.getElementById('anmEditBtn');
// 🎲 NAME FOR ME: cycles through 100 alien names (skipping ones your buddies already have; no repeats until all are used)
const ALIEN_NAMES=['Zorp','Blixa','Quibble','Nebbo','Glorp','Vexi','Plonk','Zuzu','Orbo','Kip-Kip','Fizzle','Bloop','Nova','Pixel','Quasar','Zib','Mimbo','Gloob','Tanzo','Yibbit','Snorkel','Wubzy','Kooza','Plinth','Zazzle','Bimble','Orbit','Flick','Grub','Squee','Tiko','Momo','Zing','Lumo','Blip','Gizmo','Quorx','Vroom','Nubbin','Zeppo','Fluxy','Comet','Doodle','Ziggy','Plorp','Wizzle','Jinx','Moxie','Spork','Noodle','Bixby','Glim','Rizzo','Twinkle','Zork','Pebble','Fuzzle','Kazoo','Yonder','Boop','Zylo','Squiggle','Nimbus','Gloop','Tinker','Wobble','Zap','Mork','Pip','Quix','Blorbo','Zinnia','Skoot','Huxley','Lumen','Frizz','Orbix','Zuzzle','Bebop','Kibble','Sprocket','Glimmer','Zeebo','Nibs','Woozy','Plip','Cosmo','Zarf','Tibbles','Floof','Grizzle','Mibbo','Starla','Vortex','Pudding','Zoink','Bubbles','Ziggo','Krill','Ollie'];
let _nameDeck=[];
function nextAlienName(){
  const taken=new Set((alienData||[]).filter(Boolean).map(a=>(a.name||'').toLowerCase()));
  for(let tries=0;tries<2;tries++){
    if(!_nameDeck.length){_nameDeck=ALIEN_NAMES.slice();for(let i=_nameDeck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[_nameDeck[i],_nameDeck[j]]=[_nameDeck[j],_nameDeck[i]];}}
    while(_nameDeck.length){const n=_nameDeck.pop();if(!taken.has(n.toLowerCase()))return n;}
  }
  return ALIEN_NAMES[Math.floor(Math.random()*ALIEN_NAMES.length)]; // every name is taken: allow a repeat
}
(function(){
  const btns=document.getElementById('alienNameBtns');if(!btns||!alienNameInput)return;
  const b=document.createElement('button');b.id='alienNameRandom';b.textContent='🎲 NAME FOR ME';b.title='Tap again for another name';
  b.addEventListener('click',e=>{e.preventDefault();alienNameInput.value=nextAlienName();alienNameInput.dispatchEvent(new Event('input',{bubbles:true}));});
  btns.insertBefore(b,btns.firstChild);
})();

function setAnmColor(col){
  alienNameBox.style.setProperty('--anc',col);
  alienNameBox.style.borderColor=col;
  alienNameBox.style.boxShadow=`0 0 50px ${col}22`;
}

function renderAlienProfile(){
  if(alienProfileIdx===null)return;
  const col=getAlienColor(alienProfileIdx);
  setAnmColor(col);
  alienNamePreview.style.filter='none';
  if(!document.getElementById('alienProfileBuddy')){alienNamePreview.textContent='';const cv=document.createElement('canvas');cv.id='alienProfileBuddy';alienNamePreview.appendChild(cv);}
  profileBuddyLoop();
  const db=document.getElementById('anmDesignBtn');if(db){const ok=typeof unlockedSkills!=='undefined'&&unlockedSkills.buddy_designer;db.textContent='🎨 DESIGN BUDDY';db.classList.remove('locked');db.style.display=ok?'':'none';}   // hidden until Buddy Designer is unlocked
  const ad=alienData[alienProfileIdx]||{name:''};
  anmNameEl.textContent=ad.name||'NO NAME YET';
  anmNameEl.style.opacity=ad.name?'1':'0.3';
  anmCounter.textContent=`${alienProfileIdx+1} / ${totalAliens}`;
  anmPrevBtn.disabled=alienProfileIdx<=0;
  anmNextBtn.disabled=alienProfileIdx>=totalAliens-1;
  // Reset edit section
  anmEditSection.style.display='none';
  anmEditBtn.style.display='';
  anmEditOpen=false;
  alienNameInput.value=ad.name||'';
  refreshBunkerMarks();
}

// ── buddy pictures outside the playfield ──
function paintCellBuddy(cv,idx){
  if(typeof drawBuddy!=='function')return;
  const cw=cv.parentNode&&cv.parentNode.clientWidth;cv._w=cw||0;const w=Math.max(18,cw||36)*.9,h=w*.8,dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.width=w+'px';cv.style.height=h+'px';
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  drawBuddy(g,w/2,h*.56,w*.68,{view:'turn',angle:18,idx,lite:true,antenna:1,t:1});
}
function refreshBunkerBuddy(idx){
  const cellIdx=idx-viewingBunker*BUNKER_SIZE,cell=document.getElementById(`bcell-${cellIdx}`);if(!cell||!cell.classList.contains('occupied'))return;
  const col=getAlienColor(idx);cell.style.borderColor=col;cell.style.boxShadow=`0 0 6px -2px ${col}`;
  const nm=cell.querySelector('.alien-cell-name');if(nm)nm.style.color=col;
  const cv=cell.querySelector('.cell-buddy');if(cv)paintCellBuddy(cv,idx);
}
// the profile card shows the buddy slowly turning
let _profRaf=0;
function profileBuddyLoop(){
  cancelAnimationFrame(_profRaf);
  const cv=document.getElementById('alienProfileBuddy');if(!cv||alienProfileIdx===null)return;
  const S=130,dpr=Math.min(2,window.devicePixelRatio||1);if(cv.width!==S*dpr){cv.width=S*dpr;cv.height=S*dpr;cv.style.width=S+'px';cv.style.height=S+'px';}
  const g=cv.getContext('2d'),t0=performance.now();
  (function f(now){if(alienProfileIdx===null)return;const t=(now-t0)/1000;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,S,S);
    drawBuddy(g,S/2,S*.53,S*.62,{view:'turn',angle:20+Math.sin(t*.35)*40,idx:alienProfileIdx,t,pulse:Math.pow(1-((t/.6)%1),3)});_profRaf=requestAnimationFrame(f);})(t0);
}
function openAlienNameModal(globalIdx){
  alienProfileIdx=globalIdx;
  alienNameModal.classList.add('open');
  document.body.classList.add('stats-open'); // hides the floating aliens so they never cover this window
  renderAlienProfile();
}

function closeAlienNameModal(){
  cancelAnimationFrame(_profRaf);
  alienNameModal.classList.remove('open');
  document.body.classList.remove('stats-open');
  alienProfileIdx=null;
  alienNameInput&&alienNameInput.blur();
  const vp=document.querySelector('meta[name=viewport]');
  if(vp){
    vp.content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    requestAnimationFrame(()=>{vp.content='width=device-width, initial-scale=1.0, user-scalable=no';});
  }
}

function saveAlienName(){
  if(alienProfileIdx===null)return;
  const name=alienNameInput.value.trim();
  // Save to alienData
  while(alienData.length<=alienProfileIdx)alienData.push({name:'',color:getAlienColor(alienData.length)});
  alienData[alienProfileIdx].name=name;

  // Update the floating bouncer label immediately
  let foundBouncer=false;
  for(const b of bouncers){
    if(b.idx===alienProfileIdx&&b._nameEl){
      b._nameEl.textContent=name;
      b._nameEl.style.color=b._col;
      b._nameEl.classList.remove('hidden');
      b._nameEl.style.display=!!name?'block':'none';
      foundBouncer=true;
      break;
    }
  }
  // Fallback: if bouncer idx > 30 cap, it won't be in bouncers array — that's expected
  // But also force-refresh all bouncer names in case idx mapping shifted
  if(!foundBouncer){
    applyBouncerNameVisibility();
  }

  // Update bunker grid cell if it's currently visible
  const bunkerPage=viewingBunker||0;
  const cellIdx=alienProfileIdx-(bunkerPage*BUNKER_SIZE);
  if(cellIdx>=0&&cellIdx<100){
    const cell=document.getElementById(`bcell-${cellIdx}`);
    if(cell){
      const nd=cell.querySelector('.alien-cell-name');
      if(nd){
        nd.textContent=name;
        nd.classList.remove('hidden');
        requestAnimationFrame(()=>fitCellName(nd));
      }
    }
  }

  autoSave();
  renderAlienProfile();
}

// Nav arrows
anmPrevBtn&&anmPrevBtn.addEventListener('click',()=>{if(alienProfileIdx>0){alienProfileIdx--;renderAlienProfile();}});
anmNextBtn&&anmNextBtn.addEventListener('click',()=>{if(alienProfileIdx<totalAliens-1){alienProfileIdx++;renderAlienProfile();}});

// Edit toggle
function openAnmEdit(){
  if(anmEditOpen&&anmEditSection.style.display==='flex')return;
  anmEditOpen=true;
  anmEditSection.style.display='flex';
  anmEditBtn.style.display='none';
  alienNameInput.value=(alienData[alienProfileIdx]||{name:''}).name||'';
  try{alienNameInput.focus();alienNameInput.select();}catch(e){}
}
anmEditBtn&&anmEditBtn.addEventListener('click',openAnmEdit);
anmNameEl&&anmNameEl.addEventListener('click',openAnmEdit); // tapping the name (or NO NAME YET) edits it too

document.getElementById('alienNameSave')&&document.getElementById('alienNameSave').addEventListener('click',saveAlienName);
document.getElementById('alienNameClear')&&document.getElementById('alienNameClear').addEventListener('click',()=>{alienNameInput.value='';});
document.getElementById('alienNameClose')&&document.getElementById('alienNameClose').addEventListener('click',closeAlienNameModal);
alienNameModal&&alienNameModal.addEventListener('pointerdown',e=>{if(e.target===alienNameModal)closeAlienNameModal();});
alienNameInput&&alienNameInput.addEventListener('keydown',e=>{if(e.key==='Enter')saveAlienName();});

// ── Trackers show only the newest 4 rows; scroll up (no scrollbar) to see the first colours ──
(function(){
  const VISIBLE_ROWS=4;
  ['tiersContainer','autoTiersContainer'].forEach(id=>{
    const c=document.getElementById(id);if(!c)return;
    let stick=true;
    c.addEventListener('scroll',()=>{stick=c.scrollTop+c.clientHeight>=c.scrollHeight-6;},{passive:true});
    function fit(){
      const rows=c.querySelectorAll('.tier-row');
      if(rows.length<=VISIBLE_ROWS){c.style.maxHeight='';return;}
      const h=rows[rows.length-1].offsetHeight;
      if(!h)return; // hidden right now
      const gap=parseFloat(getComputedStyle(c).rowGap)||5;
      c.style.maxHeight=(VISIBLE_ROWS*h+(VISIBLE_ROWS-1)*gap+2)+'px';
      if(stick)c.scrollTop=c.scrollHeight;
    }
    new MutationObserver(fit).observe(c,{childList:true});
    addEventListener('resize',fit);
    setInterval(()=>{if(!document.hidden)fit();},1500); // cheap catch-all (row heights change with layout)
  });
})();
