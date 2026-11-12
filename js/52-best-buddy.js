// ══════════════════════════════════════════════
//  BEST BUDDY — a page left of the bunker (the Cockpit sits left of it) where your favourite buddy hangs out
//  on its platform doing little idle animations. Unlocked by the 'best_buddy' node on the Alien Evolution path.
//  · ◀ ▶ arrows (and SWITCH BUDDY) pick who's out · ACCESSORIZE dresses them (head / eyes / shoes / stand)
//  · ▶ THEME SONG plays the song you made for them in the bunker (js/54-theme-songs.js)
//  Saved: buddyExtras = {best, paid} (paid = puzzle nodes paid for but not solved yet, see js/53-puzzles.js)
// ══════════════════════════════════════════════
window.buddyExtras={best:0,paid:{}};
// ── save / load: one place where the extra buddy features add their bits to the save ──
window._abSaveHooks=window._abSaveHooks||[];window._abLoadHooks=window._abLoadHooks||[];
(function(){
  const W=window.writeSlot;
  window.writeSlot=function(i,data){
    if(data&&typeof data==='object'&&'score' in data){data=Object.assign({},data,{buddyExtras:window.buddyExtras});window._abSaveHooks.forEach(f=>{try{data=f(data)||data;}catch(e){}});}
    return W(i,data);
  };
  const L=window.loadFromSave;
  window.loadFromSave=function(data){
    const r=L.apply(this,arguments);
    try{const x=data&&data.buddyExtras;window.buddyExtras={best:(x&&x.best)|0,paid:Object.assign({},x&&x.paid)};}catch(e){window.buddyExtras={best:0,paid:{}};}
    window._abLoadHooks.forEach(f=>{try{f(data||{});}catch(e){}});
    try{bbRefresh();}catch(e){}
    return r;
  };
})();

function bbOn(){return typeof unlockedSkills!=='undefined'&&!!unlockedSkills.best_buddy;}
function bbAcc(i){const a=alienData[i];if(!a)return null;if(!a.acc)a.acc={h:null,e:null,s:null,p:null};return a.acc;}
function bbIdx(){const n=typeof totalAliens!=='undefined'?totalAliens:0;let i=buddyExtras.best|0;if(i>=n)i=n-1;if(i<0)i=0;return i;}
function bbItemOwned(k,i){return typeof unlockedSkills!=='undefined'&&!!unlockedSkills['acc_p'+(i+1)];}

(function(){
  const $=id=>document.getElementById(id);
  const v=document.createElement('div');v.className='view';v.id='bestBuddyView';
  v.innerHTML=`
    <div class="page-header">
      <div class="page-title-wrap"><div class="page-title" style="color:#ffd23f">BEST BUDDY</div><div class="page-sub" id="bbSub">HANGING OUT</div></div>
      <button class="back-btn" id="closeBestBuddyBtn">BACK</button>
    </div>
    <div class="bb-stage" id="bbStage"><canvas id="bbCanvas"></canvas><div class="bb-empty" id="bbEmpty">Hatch an alien buddy first!<br><small>Buy one in the shop</small></div></div>
    <div class="bb-namebar">
      <button class="bb-arrow" id="bbPrev" aria-label="Previous buddy">◀</button>
      <div class="bb-name"><b id="bbName">—</b><small id="bbNum">#1</small></div>
      <button class="bb-arrow" id="bbNext" aria-label="Next buddy">▶</button>
    </div>
    <div class="bb-btns">
      <button id="bbAccBtn">🎨 ACCESSORIZE</button>
      <button id="bbSwitchBtn">🔄 SWITCH BUDDY</button>
      <button id="bbSongBtn" class="wide">🎵 THEME SONG</button>
    </div>
    <div class="bb-sheet" id="bbAccSheet">
      <div class="bb-sheet-head"><b>ACCESSORIZE</b><button id="bbAccDone">DONE</button></div>
      <div class="bb-tabs" id="bbTabs"></div>
      <div class="bb-grid" id="bbAccGrid"></div>
    </div>
    <div class="bb-sheet" id="bbSwitchSheet">
      <div class="bb-sheet-head"><b>PICK YOUR BEST BUDDY</b><button id="bbSwitchDone">CLOSE</button></div>
      <div class="bb-grid bb-pick" id="bbPickGrid"></div>
    </div>`;
  ($('gameScreen')||document.body).appendChild(v);
  // bunker button: ★ BEST BUDDY (left of the bunker; the cockpit is one more to the left)
  const bb=document.createElement('button');bb.id='bbOpenBtn';bb.type='button';bb.innerHTML='⭐ BEST BUDDY <small>◀ HANG OUT</small>';bb.style.display='none';
  const anchor=$('mgGamesBtn')||$('mgList');if(anchor)anchor.parentNode.insertBefore(bb,anchor);
  bb.addEventListener('click',()=>{if(document.body.classList.contains('desktop-mode')||typeof swipeNavGo!=='function')openBestBuddy();else swipeNavGo(5,1);});
  $('closeBestBuddyBtn').addEventListener('click',()=>{if(document.body.classList.contains('desktop-mode'))closeBestBuddy();else if(typeof swipeNavGo==='function')swipeNavGo(2,-1);else closeBestBuddy();});
  new MutationObserver(()=>{const b=document.body.classList;if(b.contains('bestbuddy-open')&&(b.contains('bunker-open')||b.contains('store-open')||b.contains('cockpit-open'))&&!b.contains('desktop-mode'))closeBestBuddy();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('keydown',e=>{if(e.code==='Escape'&&document.body.classList.contains('bestbuddy-open')&&document.body.classList.contains('desktop-mode'))closeBestBuddy();});

  $('bbPrev').onclick=()=>bbStep(-1);$('bbNext').onclick=()=>bbStep(1);
  $('bbAccBtn').onclick=()=>openSheet('acc');$('bbSwitchBtn').onclick=()=>openSheet('pick');
  $('bbAccDone').onclick=()=>closeSheets();$('bbSwitchDone').onclick=()=>closeSheets();
  $('bbSongBtn').onclick=()=>{const i=bbIdx(),ad=alienData[i];if(!ad)return;
    if(ad.song){if(typeof themeIsPlaying==='function'&&themeIsPlaying())themeStop();else themePlay(i);}
    else if(typeof themeStartEdit==='function')themeStartEdit(i);bbRefresh();};
  const st=$('bbStage');
  st.addEventListener('click',e=>{const r=$('bbCanvas').getBoundingClientRect();anim.poke(e.clientX-r.left,e.clientY-r.top);});
})();

function openBestBuddy(){
  const v=document.getElementById('bestBuddyView'),desk=document.body.classList.contains('desktop-mode'),host=desk?document.body:(document.getElementById('gameScreen')||document.body);
  if(v&&v.parentElement!==host)host.appendChild(v);
  document.body.classList.add('bestbuddy-open');bbRefresh();anim.start();}
function closeBestBuddy(){document.body.classList.remove('bestbuddy-open');closeSheets();anim.stop();if(typeof themeStop==='function')themeStop();}
function bbStep(d){const n=totalAliens;if(!n)return;buddyExtras.best=((bbIdx()+d)%n+n)%n;if(typeof themeStop==='function')themeStop();anim.enter(d);bbRefresh();if(typeof autoSave==='function')autoSave();}
function bbSetBest(i){buddyExtras.best=i;if(typeof themeStop==='function')themeStop();anim.enter(1);bbRefresh();if(typeof autoSave==='function')autoSave();}

function bbRefresh(){
  const $=id=>document.getElementById(id);
  const ob=$('bbOpenBtn');if(ob)ob.style.display=bbOn()?'':'none';
  if(!$('bbName'))return;
  const n=typeof totalAliens!=='undefined'?totalAliens:0,i=bbIdx(),ad=alienData[i]||{};
  $('bbEmpty').style.display=n?'none':'flex';
  $('bbName').textContent=n?(ad.name||'NO NAME YET'):'—';$('bbName').style.opacity=ad.name?1:.55;
  $('bbNum').textContent=n?('#'+(i+1)+' of '+n):'';
  const col=n&&typeof getAlienColor==='function'?getAlienColor(i):'#ffd23f';$('bbName').style.color=col;
  $('bbSub').textContent=n?'HANGING OUT':'NO BUDDIES YET';
  ['bbPrev','bbNext','bbAccBtn','bbSwitchBtn','bbSongBtn'].forEach(k=>{$(k).disabled=!n;});
  const sb=$('bbSongBtn'),playing=typeof themeIsPlaying==='function'&&themeIsPlaying();
  sb.textContent=ad.song?(playing?'■ STOP THEME SONG':'▶ PLAY THEME SONG'):'🎵 MAKE A THEME SONG';sb.classList.toggle('on',!!playing);
  if($('bbAccSheet').classList.contains('open'))paintAccGrid();
}

// ── Accessorize sheet ──
let bbCat='h';
function openSheet(which){closeSheets();const s=document.getElementById(which==='acc'?'bbAccSheet':'bbSwitchSheet');s.classList.add('open');document.getElementById('bestBuddyView').classList.add('sheet-open');
  if(which==='acc')paintAccGrid();else paintPickGrid();}
function closeSheets(){['bbAccSheet','bbSwitchSheet'].forEach(id=>{const s=document.getElementById(id);if(s)s.classList.remove('open');});const v=document.getElementById('bestBuddyView');if(v)v.classList.remove('sheet-open');}
function paintAccGrid(){
  const tabs=document.getElementById('bbTabs'),grid=document.getElementById('bbAccGrid');if(!tabs||!window.buddyAcc)return;
  const i=bbIdx(),acc=bbAcc(i)||{};
  tabs.innerHTML='';buddyAcc.CATS.forEach(c=>{const b=document.createElement('button');b.textContent=c.name;b.className=c.k===bbCat?'on':'';
    const own=c.list.filter((_,j)=>bbItemOwned(c.k,j)).length;const s=document.createElement('small');s.textContent=own+'/'+c.list.length;b.appendChild(s);
    b.onclick=()=>{bbCat=c.k;paintAccGrid();};tabs.appendChild(b);});
  const cat=buddyAcc.CATS.find(c=>c.k===bbCat);grid.innerHTML='';
  const none=document.createElement('button');none.className='bb-tile'+(acc[bbCat]==null?' on':'');none.innerHTML='<span class="bb-none">✕</span><small>NONE</small>';
  none.onclick=()=>{acc[bbCat]=null;accChanged(i);};grid.appendChild(none);
  const look=typeof buddyLook==='function'?buddyLook(i):null;
  const tiles=[];
  cat.list.forEach((it,j)=>{const own=bbItemOwned(bbCat,j),b=document.createElement('button');b.className='bb-tile'+(own?'':' locked')+(acc[bbCat]===j?' on':'');
    const nm=document.createElement('small');nm.textContent=own?it.name:'PUZZLE '+(j+1);
    if(own){tiles.push([b,j]);}else{const l=document.createElement('span');l.className='bb-lock';l.textContent='🔒';b.appendChild(l);}
    b.appendChild(nm);
    b.onclick=()=>{if(!own){showToast('🧩 Solve puzzle '+(j+1)+' on the Alien Evolution path to unlock '+it.name);return;}acc[bbCat]=acc[bbCat]===j?null:j;accChanged(i);};
    grid.appendChild(b);});
  // icons are drawn a few per frame so the sheet opens instantly
  let k=0;(function step(){const end=Math.min(tiles.length,k+6);for(;k<end;k++){const[b,j]=tiles[k];try{b.insertBefore(buddyAcc.icon(bbCat,j,56,look),b.firstChild);}catch(e){}}if(k<tiles.length)requestAnimationFrame(step);})();
}
function accChanged(i){
  if(typeof refreshBouncerBuddy==='function')refreshBouncerBuddy(i);
  if(typeof refreshBunkerBuddy==='function')refreshBunkerBuddy(i);
  anim.cheer();paintAccGrid();if(typeof autoSave==='function')autoSave();
}
function paintPickGrid(){
  const grid=document.getElementById('bbPickGrid');if(!grid)return;grid.innerHTML='';const cur=bbIdx(),list=[];
  for(let i=0;i<totalAliens;i++){const ad=alienData[i]||{},b=document.createElement('button');b.className='bb-tile'+(i===cur?' on':'');
    const cv=document.createElement('canvas');b.appendChild(cv);const s=document.createElement('small');s.textContent=ad.name||('#'+(i+1));b.appendChild(s);
    b.onclick=()=>{bbSetBest(i);closeSheets();};grid.appendChild(b);list.push([cv,i]);}
  let k=0;(function step(){const end=Math.min(list.length,k+8);for(;k<end;k++){const[cv,i]=list[k],S=56,dpr=Math.min(2,window.devicePixelRatio||1);cv.width=S*dpr;cv.height=S*dpr;cv.style.width=S+'px';cv.style.height=S+'px';
    const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);try{drawBuddy(g,S/2,S*.55,S*.7,{view:'turn',angle:18,idx:i,lite:true,antenna:1,t:1});}catch(e){}}
    if(k<list.length&&document.getElementById('bbSwitchSheet').classList.contains('open'))requestAnimationFrame(step);})();
  setTimeout(()=>{const on=grid.querySelector('.on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'center'});},30);
}

// ── the stage: background, platform, buddy and its idle animations ──
const anim=(function(){
  let raf=0,last=0,T=0,slow=0,lite=false,act=null,lookDir=1,actT=0,nextAt=2,idleFor=0,bg=null,bgKey='',W=0,H=0,dpr=1,hearts=[],zs=[],enterT=-9,enterDir=1,beat=0;
  const ACTS=['look','look','hop','spin','wiggle','antenna','bounce','peek','nod'];
  function size(cv){const r=cv.parentNode.getBoundingClientRect();dpr=Math.min(lite?1.25:2,window.devicePixelRatio||1);W=Math.max(200,r.width);H=Math.max(200,r.height);
    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';bg=null;}}
  function paintBg(){const c=document.createElement('canvas');c.width=W*dpr;c.height=H*dpr;const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    // a cosy pod: deep space through a round window, a soft rug of light on the floor
    let q=g.createLinearGradient(0,0,0,H);q.addColorStop(0,'#0c0a24');q.addColorStop(.62,'#1a1240');q.addColorStop(.63,'#231a4a');q.addColorStop(1,'#0e0a22');g.fillStyle=q;g.fillRect(0,0,W,H);
    const wr=Math.min(W,H)*.26,wx=W*.78,wy=H*.26;g.save();g.beginPath();g.arc(wx,wy,wr,0,Math.PI*2);g.clip();q=g.createRadialGradient(wx-wr*.3,wy-wr*.3,2,wx,wy,wr);q.addColorStop(0,'#1a2a6a');q.addColorStop(1,'#050616');g.fillStyle=q;g.fillRect(wx-wr,wy-wr,wr*2,wr*2);
    for(let i=0;i<40;i++){const a=Math.sin(i*12.9898)*43758.5453,b=Math.sin(i*78.233)*12345.678,x=wx-wr+((a-Math.floor(a)))*wr*2,y=wy-wr+((b-Math.floor(b)))*wr*2;g.fillStyle='rgba(255,255,255,'+(.4+((a*7)%1)*.6)+')';g.fillRect(x,y,1.3,1.3);}
    q=g.createRadialGradient(wx+wr*.25,wy+wr*.3,1,wx+wr*.25,wy+wr*.3,wr*.45);q.addColorStop(0,'#ffcf8a');q.addColorStop(.7,'#c2340a');q.addColorStop(1,'rgba(60,10,4,0)');g.fillStyle=q;g.beginPath();g.arc(wx+wr*.25,wy+wr*.3,wr*.42,0,Math.PI*2);g.fill();g.restore();
    g.lineWidth=Math.max(4,wr*.12);g.strokeStyle='#3a2f6a';g.beginPath();g.arc(wx,wy,wr,0,Math.PI*2);g.stroke();g.lineWidth=2;g.strokeStyle='#6a5aa8';g.beginPath();g.arc(wx,wy,wr-g.lineWidth,0,Math.PI*2);g.stroke();
    // little shelf with a plant and a lamp glow on the left
    g.fillStyle='#2f2560';g.fillRect(W*.06,H*.34,W*.22,6);g.fillStyle='#43a047';g.beginPath();g.ellipse(W*.12,H*.31,10,13,0,0,Math.PI*2);g.fill();g.fillStyle='#c0603a';g.fillRect(W*.12-7,H*.32,14,10);
    q=g.createRadialGradient(W*.22,H*.24,2,W*.22,H*.24,60);q.addColorStop(0,'rgba(255,220,140,.5)');q.addColorStop(1,'rgba(255,220,140,0)');g.fillStyle=q;g.fillRect(0,0,W,H);g.fillStyle='#ffe6a0';g.beginPath();g.arc(W*.22,H*.24,6,0,Math.PI*2);g.fill();
    q=g.createRadialGradient(W/2,H*.86,4,W/2,H*.86,W*.5);q.addColorStop(0,'rgba(140,110,255,.28)');q.addColorStop(1,'rgba(140,110,255,0)');g.fillStyle=q;g.beginPath();g.ellipse(W/2,H*.86,W*.5,H*.1,0,0,Math.PI*2);g.fill();
    // floor planks
    g.strokeStyle='rgba(255,255,255,.04)';g.lineWidth=1;for(let k=1;k<6;k++){const y=H*.63+k*k*H*.012;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
    bg=c;}
  function pick(){act=ACTS[Math.floor(Math.random()*ACTS.length)];actT=0;lookDir=Math.random()<.5?-1:1;}
  function frame(now){
    raf=requestAnimationFrame(frame);
    const cv=document.getElementById('bbCanvas');if(!cv||!document.body.classList.contains('bestbuddy-open')){stop();return;}
    const raw=(now-(last||now))/1000,dt=Math.min(.05,raw);last=now;
    // slow phone? switch to the lighter drawing (no fur fibres, smaller canvas) and stay there
    if(!lite&&raw>0){slow=slow*.9+(raw>.034?1:0)*.1;if(slow>.5&&T>1.5){lite=true;bg=null;}}T+=dt;actT+=dt;idleFor+=dt;
    size(cv);if(!bg)paintBg();
    const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);g.drawImage(bg,0,0,W,H);
    const n=typeof totalAliens!=='undefined'?totalAliens:0;if(!n)return;
    const i=bbIdx(),playing=typeof themeIsPlaying==='function'&&themeIsPlaying(),sleepy=idleFor>40&&!playing;
    if(!act&&T>nextAt&&!sleepy&&!playing){pick();}
    // pose from the current action
    let ang=Math.sin(T*.6)*14,dy=0,sq=1,ant=null,tilt=0;
    if(playing){const b=window._themeBeat||0,k=Math.max(0,1-(performance.now()-b)/220);dy=-k*k*14;sq=1+k*.06;ang=Math.sin(T*3)*28;tilt=Math.sin(T*6)*.06;}
    else if(sleepy){ang=Math.sin(T*.3)*6;tilt=Math.sin(T*.8)*.05+.05;if(Math.random()<dt*.8)zs.push({x:0,y:0,t:0});}
    else if(act){const p=actT;let done=false;
      if(act==='look'){ang=lookDir*60*Math.sin(Math.min(1,p/2.2)*Math.PI);done=p>2.2;}
      if(act==='hop'){const k=p/.7;dy=-Math.sin(Math.min(1,k)*Math.PI)*H*.09;sq=k<.12||k>.9?.92:1.04;done=p>.8;}
      if(act==='spin'){ang=Math.min(1,p/1.4)*360;done=p>1.5;}
      if(act==='wiggle'){ang=Math.sin(p*18)*18;tilt=Math.sin(p*9)*.08;done=p>1.4;}
      if(act==='antenna'){ant=1.15+Math.sin(p*10)*.35*(1-p/1.6);done=p>1.6;}
      if(act==='bounce'){dy=-Math.abs(Math.sin(p*7))*H*.03;done=p>1.8;}
      if(act==='peek'){ang=180*Math.min(1,p/.6)*(p<1.6?1:Math.max(0,1-(p-1.6)/.6));done=p>2.3;}
      if(act==='nod'){tilt=Math.sin(p*8)*.1*(1-p/1.4);done=p>1.4;}
      if(done){act=null;nextAt=T+2.5+Math.random()*3.5;}
    }
    const e=Math.min(1,(T-enterT)/.45),ex=(1-e)*(1-e)*W*.6*enterDir;
    const S=Math.min(W*.62,H*.6),cx=W/2+ex,cy=H*.5;
    g.save();g.translate(cx,cy+S*.41);g.rotate(tilt);g.scale(1/Math.sqrt(sq),sq);g.translate(-cx,-(cy+S*.41));
    drawBuddy(g,cx,cy+dy,S,{view:'turn',angle:ang,idx:i,t:T,platform:true,lite,antenna:ant,pulse:playing?Math.max(0,1-(performance.now()-(window._themeBeat||0))/300):Math.pow(1-((T/.6)%1),3)});
    g.restore();
    // hearts (tap) and z's (sleepy)
    hearts=hearts.filter(h=>(h.t+=dt)<1.2);hearts.forEach(h=>{const a=1-h.t/1.2;g.globalAlpha=a;g.fillStyle='#ff5fa2';const x=h.x+Math.sin(h.t*6+h.s)*6,y=h.y-h.t*60,s=7+h.s*2;
      g.beginPath();g.moveTo(x,y+s*.9);g.bezierCurveTo(x-s*1.4,y-s*.1,x-s*.7,y-s*1.1,x,y-s*.35);g.bezierCurveTo(x+s*.7,y-s*1.1,x+s*1.4,y-s*.1,x,y+s*.9);g.fill();g.globalAlpha=1;});
    zs=zs.filter(z=>(z.t+=dt)<2.4);zs.forEach(z=>{g.globalAlpha=Math.min(1,(2.4-z.t))*.8;g.fillStyle='#cfc8ff';g.font='bold '+(14+z.t*8)+'px "Bebas Neue",sans-serif';g.fillText('z',cx+S*.25+z.t*18,cy-S*.35-z.t*30);g.globalAlpha=1;});
  }
  function start(){if(raf)return;last=0;idleFor=0;raf=requestAnimationFrame(frame);}
  function stop(){cancelAnimationFrame(raf);raf=0;}
  return{start,stop,
    poke(x,y){idleFor=0;act='hop';actT=0;for(let k=0;k<5;k++)hearts.push({x:x+(Math.random()-.5)*30,y:y-10,t:-k*.06,s:Math.random()*2});
      try{const c=getCtx(),o=c.createOscillator(),gn=c.createGain(),t=c.currentTime;o.type='sine';o.frequency.setValueAtTime(700,t);o.frequency.exponentialRampToValueAtTime(1300,t+.09);gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(.18,t+.01);gn.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(gn);gn.connect(c.destination);o.start(t);o.stop(t+.2);}catch(e){}},
    cheer(){idleFor=0;act='wiggle';actT=0;},
    enter(d){enterT=T;enterDir=d>=0?1:-1;idleFor=0;act=null;nextAt=T+1.2;}};
})();
setTimeout(bbRefresh,0);
