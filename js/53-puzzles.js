// ══════════════════════════════════════════════
//  ACCESSORY PUZZLES — the Alien Evolution path: Best Buddy, then a winding trail of 25 puzzle nodes.
//  Pay a node's gems once to open its puzzle; solve it to unlock 4 accessories (head, eyes, shoes, stand #k).
//  Eight kinds of puzzle take turns along the trail and get harder each lap:
//    SLIDE · LIGHTS · DRUM ECHO · TWIST · BEAD SORT · MAZE · ODD ONE OUT · BEAT MATCH
//  Paid-but-unsolved nodes are remembered in buddyExtras.paid; solving sets unlockedSkills['acc_pN'].
// ══════════════════════════════════════════════
(function(){
  if(typeof SKILL_TREE_NODES==='undefined')return;
  const TYPES=[
    {k:'slide',icon:'🧩',name:'Slide Puzzle'},{k:'lights',icon:'💡',name:'Light Up'},{k:'echo',icon:'🥁',name:'Drum Echo'},{k:'twist',icon:'🔄',name:'Twist Tiles'},
    {k:'beads',icon:'🧪',name:'Bead Sort'},{k:'maze',icon:'🌀',name:'Buddy Maze'},{k:'odd',icon:'🔍',name:'Odd One Out'},{k:'beat',icon:'🎼',name:'Beat Match'}];
  const ROMAN=['I','II','III','IV'];
  const r2=v=>{if(v<100)return Math.round(v);const p=Math.pow(10,Math.floor(Math.log10(v))-1);return Math.round(v/p)*p;};
  const nodes=[{id:'best_buddy',icon:'⭐',name:'Best Buddy',desc:'Builds the BEST BUDDY page, left of the bunker: your favourite buddy hangs out on a platform doing little idle animations. Switch buddies with the arrows, ACCESSORIZE them, and make each buddy a THEME SONG (open a buddy in the bunker and tap MAKE A SONG). The accessory puzzles start here.',
    cost:1200,requires:['buddy_designer'],x:250,y:450,branch:'aliens'}];
  window.PUZZLE_LIST=[];
  for(let k=0;k<25;k++){const T=TYPES[k%8],d=Math.floor(k/8),row=Math.floor(k/5),col=k%5,c=row%2?4-col:col;
    const acc=window.buddyAcc,items=acc?[acc.HEAD[k].name,acc.EYES[k].name,acc.SHOES[k].name,acc.PLAT[k].name]:[];
    const pz={n:k+1,type:T.k,d,title:T.name+' '+ROMAN[d]};PUZZLE_LIST.push(pz);
    nodes.push({id:'acc_p'+(k+1),icon:T.icon,name:pz.title,puzzle:pz,
      desc:'Puzzle '+(k+1)+' of 25. Pay once to open this '+T.name.toUpperCase()+' puzzle; solve it to unlock '+items.slice(0,3).join(', ')+' and the '+items[3]+' for your buddies.',
      cost:r2(1500*Math.pow(1.33,k)),requires:[k?'acc_p'+k:'best_buddy'],x:250+c*130+(row%2?10:0),y:600+row*150+Math.sin(col*1.7+row)*14,branch:'aliens'});}
  nodes.forEach(n=>{SKILL_TREE_NODES.push(n);if(typeof SKILL_MAP!=='undefined')SKILL_MAP[n.id]=n;});

  // ── tree hooks: buying a puzzle node opens its puzzle (paid once; replays are free) ──
  const _buy=window.buySkill;
  window.buySkill=function(id){
    const n=SKILL_MAP[id];if(!n||!n.puzzle){const r=_buy.apply(this,arguments);if(id==='best_buddy'&&unlockedSkills.best_buddy){try{bbRefresh();}catch(e){}showToast('⭐ Best Buddy unlocked! It’s the page left of the bunker');}return r;}
    if(unlockedSkills[id]){openPuzzle(n.puzzle,true);return;}
    if(!skillAvailable(id)){showToast('Unlock the required skills first!');return;}
    if(!buddyExtras.paid[id]){const price=skillCost(n);if(Math.floor(alienGems)<price){showToast('Not enough Alien Gems!');return;}
      alienGems-=price;buddyExtras.paid[id]=true;try{playSfxPurchase&&playSfxPurchase();}catch(e){}updateGemDisplays();renderSkillTree();if(typeof autoSave==='function')autoSave();}
    openPuzzle(n.puzzle,false);
  };
  const _det=window.openStDetail;
  window.openStDetail=function(id){const r=_det.apply(this,arguments);const n=SKILL_MAP[id],b=document.getElementById('stDetailBuyBtn');
    if(n&&n.puzzle&&b){if(unlockedSkills[id]){b.textContent='✓ SOLVED · PLAY AGAIN';b.disabled=false;b.className='';}
      else if(buddyExtras.paid[id]&&skillAvailable(id)){b.textContent='🧩 PLAY THE PUZZLE';b.disabled=false;b.className='';document.getElementById('stDetailCost').textContent='PAID ✓';}}
    return r;};
  const _rt=window.renderSkillTree;
  window.renderSkillTree=function(){const r=_rt.apply(this,arguments);
    for(const id in buddyExtras.paid){if(unlockedSkills[id])continue;const el=document.querySelector('#skillTreeInner .st-node[data-node="'+id+'"] .st-node-cost');if(el)el.textContent='🧩 PLAY';}
    return r;};
})();

// ══════════════ the puzzle window ══════════════
(function(){
  const m=document.createElement('div');m.id='pzModal';
  m.innerHTML=`<div class="pz-box">
    <div class="pz-head"><div><small id="pzKick">PUZZLE</small><b id="pzTitle">PUZZLE</b></div><button id="pzClose" aria-label="Close">✕</button></div>
    <div class="pz-how" id="pzHow"></div>
    <div class="pz-area" id="pzArea"></div>
    <div class="pz-foot" id="pzFoot"></div>
  </div>
  <div class="pz-win" id="pzWin"><div class="pz-win-box">
    <small>PUZZLE SOLVED!</small><b>NEW ACCESSORIES</b>
    <div class="pz-rewards" id="pzRewards"></div>
    <div class="pz-win-btns"><button id="pzTry">🎨 TRY THEM ON</button><button id="pzNice" class="ok">NICE!</button></div>
  </div></div>`;
  document.body.appendChild(m);
  document.getElementById('pzClose').onclick=closePuzzle;
  document.getElementById('pzNice').onclick=closePuzzle;
  document.getElementById('pzTry').onclick=()=>{closePuzzle();if(typeof closeSkillTree==='function')closeSkillTree();
    setTimeout(()=>{if(document.body.classList.contains('desktop-mode')||typeof swipeNavGo!=='function')openBestBuddy();else{closeStore&&closeStore();openBunker&&openBunker();setTimeout(()=>swipeNavGo(5,1),480);}
      setTimeout(()=>{const b=document.getElementById('bbAccBtn');if(b&&!b.disabled)b.click();},1100);},350);};
})();
let _pz=null;
function closePuzzle(){const m=document.getElementById('pzModal');m.classList.remove('open','won');if(_pz&&_pz.stop)_pz.stop();_pz=null;}
function openPuzzle(pz,replay){
  const m=document.getElementById('pzModal'),area=document.getElementById('pzArea'),foot=document.getElementById('pzFoot'),how=document.getElementById('pzHow');
  if(_pz&&_pz.stop)_pz.stop();area.innerHTML='';foot.innerHTML='';
  document.getElementById('pzKick').textContent='PUZZLE '+pz.n+' OF 25'+(replay?' · REPLAY':'');document.getElementById('pzTitle').textContent=pz.title.toUpperCase();
  m.classList.add('open');m.classList.remove('won');
  const P=PUZZLES[pz.type];_pz=P(area,foot,how,pz.d,()=>puzzleWon(pz,replay))||{};
}
function puzzleWon(pz,replay){
  pzSfx('win');
  const id='acc_p'+pz.n,first=!unlockedSkills[id];
  if(first){unlockedSkills[id]=true;delete buddyExtras.paid[id];try{applySkillEffects();renderSkillTree();updateSkillTreeBtn();renderUI();}catch(e){}if(typeof autoSave==='function')autoSave();}
  setTimeout(()=>{const m=document.getElementById('pzModal');if(!m.classList.contains('open'))return;
    const box=document.getElementById('pzRewards');box.innerHTML='';const k=pz.n-1,look=typeof buddyLook==='function'&&totalAliens?buddyLook(bbIdx()):null;
    [['h','HEAD'],['e','EYES'],['s','SHOES'],['p','STAND']].forEach(([c,lab])=>{const it=buddyAcc.CATS.find(x=>x.k===c).list[k],d=document.createElement('div');d.className='pz-rw';
      d.appendChild(buddyAcc.icon(c,k,64,look));const s=document.createElement('small');s.textContent=it.name;d.appendChild(s);const l=document.createElement('i');l.textContent=lab;d.appendChild(l);box.appendChild(d);});
    document.querySelector('#pzWin .pz-win-box > b').textContent=first?'NEW ACCESSORIES':'SOLVED AGAIN!';
    document.getElementById('pzTry').style.display=typeof bbOn==='function'&&bbOn()&&totalAliens?'':'none';
    m.classList.add('won');},650);
}
// little sounds for the puzzles (the game's own drums where it fits)
function pzSfx(k){try{const c=getCtx(),t=c.currentTime;
  if(k==='tap'){playSound('en_tinktap',.5,t);return;}
  if(k==='bad'){const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(180,t);o.frequency.linearRampToValueAtTime(120,t+.18);g.gain.setValueAtTime(.06,t);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.25);return;}
  if(k==='win'){[523,659,784,1047].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain(),s=t+i*.09;o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(.16,s+.02);g.gain.exponentialRampToValueAtTime(.0001,s+.35);o.connect(g);g.connect(c.destination);o.start(s);o.stop(s+.4);});}
}catch(e){}}
const pzEl=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};
const pzBtn=(foot,txt,fn,cls)=>{const b=pzEl('button',cls||'',txt);b.onclick=fn;foot.appendChild(b);return b;};
const pzRand=n=>Math.floor(Math.random()*n);
// a square picture of a buddy (yours if you have one) used by the tile puzzles
function pzPicture(px){
  const c=document.createElement('canvas'),dpr=Math.min(2,window.devicePixelRatio||1);c.width=c.height=px*dpr;const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  const q=g.createLinearGradient(0,0,0,px);q.addColorStop(0,'#2a1a6a');q.addColorStop(.6,'#5b3cc4');q.addColorStop(1,'#ff7ac0');g.fillStyle=q;g.fillRect(0,0,px,px);
  for(let i=0;i<30;i++){g.fillStyle='rgba(255,255,255,'+(.3+Math.random()*.6)+')';g.fillRect(Math.random()*px,Math.random()*px*.6,1.6,1.6);}
  g.fillStyle='#ffd23f';g.beginPath();g.arc(px*.82,px*.18,px*.08,0,Math.PI*2);g.fill();
  g.fillStyle='#2a1a4a';g.beginPath();g.ellipse(px/2,px*1.02,px*.75,px*.2,0,0,Math.PI*2);g.fill();
  const idx=typeof totalAliens!=='undefined'&&totalAliens?bbIdx():null;
  try{drawBuddy(g,px/2,px*.5,px*.58,idx!=null?{view:'turn',angle:20,idx,t:1.3}:{view:'turn',angle:20,t:1.3});}catch(e){}
  return c;
}

const PUZZLES={
  // ── SLIDE: put the picture back together (tap a tile next to the gap) ──
  slide(area,foot,how,d,win){
    const n=d<2?3:4,N=n*n,S=Math.min(window.innerWidth*.86,360),ts=S/n,pic=pzPicture(S).toDataURL();
    how.textContent='Tap a tile next to the gap to slide it. Put your buddy back together!';
    const board=pzEl('div','pz-board');board.style.width=board.style.height=S+'px';area.appendChild(board);
    let st=[...Array(N).keys()],blank=N-1,moves=0,done=false;
    const tiles=st.map(v=>{const t=pzEl('div','pz-tile');t.style.width=t.style.height=ts-2+'px';
      t.style.backgroundImage='url('+pic+')';t.style.backgroundSize=S+'px '+S+'px';t.style.backgroundPosition=(-(v%n)*ts)+'px '+(-Math.floor(v/n)*ts)+'px';
      const num=pzEl('i','',String(v+1));t.appendChild(num);if(v===N-1)t.style.visibility='hidden';board.appendChild(t);t.onclick=()=>tap(st.indexOf(v));return t;});
    const place=()=>st.forEach((v,p)=>{tiles[v].style.transform='translate('+((p%n)*ts+1)+'px,'+(Math.floor(p/n)*ts+1)+'px)';});
    const nb=p=>[p-n,p+n,p%n?p-1:-1,(p+1)%n?p+1:-1].filter(q=>q>=0&&q<N);
    function shuffle(){st=[...Array(N).keys()];blank=N-1;let prev=-1;for(let i=0;i<(n===3?80:220);i++){const c=nb(blank).filter(q=>q!==prev);const q=c[pzRand(c.length)];st[blank]=st[q];st[q]=N-1;prev=blank;blank=q;}
      if(st.every((v,i)=>v===i))return shuffle();moves=0;done=false;tiles[N-1].style.visibility='hidden';place();}
    function tap(p){if(done||!nb(blank).includes(p))return;st[blank]=st[p];st[p]=N-1;blank=p;moves++;pzSfx('tap');place();
      if(st.every((v,i)=>v===i)){done=true;tiles[N-1].style.visibility='visible';win();}}
    shuffle();pzBtn(foot,'↺ SHUFFLE',shuffle);
  },
  // ── LIGHTS: light up every bead (a tap flips that bead and the ones next to it) ──
  lights(area,foot,how,d,win){
    const n=[3,4,5,5][d],N=n*n,S=Math.min(window.innerWidth*.84,340),k=[3,5,7,10][d];
    how.textContent='Tap a bead to flip it and the beads next to it. Light them ALL up!';
    const board=pzEl('div','pz-grid');board.style.gridTemplateColumns='repeat('+n+',1fr)';board.style.width=S+'px';area.appendChild(board);
    let on=[],done=false,start=[];
    const cells=[...Array(N)].map((_,i)=>{const c=pzEl('button','pz-bulb');c.style.height=(S/n-6)+'px';c.onclick=()=>press(i,true);board.appendChild(c);return c;});
    function flip(i){const x=i%n,y=Math.floor(i/n);[[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const X=x+dx,Y=y+dy;if(X>=0&&X<n&&Y>=0&&Y<n)on[Y*n+X]=!on[Y*n+X];});}
    const paint=()=>cells.forEach((c,i)=>c.classList.toggle('on',on[i]));
    function press(i,user){if(done)return;flip(i);if(user)pzSfx('tap');paint();if(user&&on.every(Boolean)){done=true;board.classList.add('done');win();}}
    function scramble(){on=Array(N).fill(true);const used=new Set();while(used.size<k)used.add(pzRand(N));used.forEach(i=>flip(i));if(on.every(Boolean))return scramble();start=on.slice();done=false;board.classList.remove('done');paint();}
    scramble();pzBtn(foot,'↺ START OVER',()=>{on=start.slice();done=false;paint();});pzBtn(foot,'🎲 NEW BOARD',scramble);
  },
  // ── DRUM ECHO: copy the drum pattern back (it grows each round) ──
  echo(area,foot,how,d,win){
    const L=[4,5,6,7][d],gap=[560,500,450,400][d],PADS=[['kick','KICK','#ff5a5a'],['snare','SNARE','#4fb3ff'],['hihat','HI-HAT','#5fe07a'],['clap','CLAP','#ffd23f']];
    how.textContent='Listen, then play the same drums back. The pattern grows by one each round. Reach '+L+'!';
    const info=pzEl('div','pz-info','Round 1 of '+L);area.appendChild(info);
    const pads=pzEl('div','pz-pads');area.appendChild(pads);
    let seq=[],round=1,pos=0,listening=false,timers=[],done=false;
    const btns=PADS.map(([id,lab,col],i)=>{const b=pzEl('button','pz-pad',lab);b.style.setProperty('--c',col);pads.appendChild(b);
      const hit=e=>{if(e)e.preventDefault();if(!listening||done)return;flash(i);if(i!==seq[pos]){pzSfx('bad');info.textContent='Oops! Listen again…';listening=false;setTimeout(()=>play(),700);return;}
        pos++;if(pos>=round){listening=false;if(round>=L){done=true;info.textContent='PERFECT!';win();return;}round++;info.textContent='Nice! Round '+round+' of '+L;setTimeout(()=>play(),650);}};
      b.addEventListener('touchstart',hit,{passive:false});b.addEventListener('mousedown',e=>{if(!('ontouchstart' in window))hit(e);});return b;});
    function flash(i){try{getCtx();playSound(PADS[i][0],1);}catch(e){}const b=btns[i];b.classList.remove('hit');void b.offsetWidth;b.classList.add('hit');}
    function play(){timers.forEach(clearTimeout);timers=[];listening=false;pos=0;pads.classList.add('wait');info.textContent='Listen… (round '+round+' of '+L+')';
      for(let i=0;i<round;i++)timers.push(setTimeout(()=>flash(seq[i]),400+i*gap));
      timers.push(setTimeout(()=>{listening=true;pads.classList.remove('wait');info.textContent='Your turn! ('+round+' hit'+(round>1?'s':'')+')';},400+round*gap));}
    function fresh(){seq=[...Array(L)].map(()=>pzRand(4));round=1;done=false;play();}
    pzBtn(foot,'▶ START',function(){this.textContent='↺ HEAR IT AGAIN';if(!seq.length)fresh();else play();});
    return{stop(){timers.forEach(clearTimeout);}};
  },
  // ── TWIST: turn every tile the right way up ──
  twist(area,foot,how,d,win){
    const n=d<2?3:4,N=n*n,S=Math.min(window.innerWidth*.86,360),ts=S/n,pic=pzPicture(S).toDataURL();
    how.textContent='Tap a tile to turn it. Turn every tile the right way up!';
    const board=pzEl('div','pz-board');board.style.width=board.style.height=S+'px';area.appendChild(board);
    let rot=[],done=false;
    const tiles=[...Array(N)].map((_,i)=>{const t=pzEl('div','pz-tile tw');t.style.width=t.style.height=ts-2+'px';t.style.backgroundImage='url('+pic+')';t.style.backgroundSize=S+'px '+S+'px';
      t.style.backgroundPosition=(-(i%n)*ts)+'px '+(-Math.floor(i/n)*ts)+'px';board.appendChild(t);t.onclick=()=>{if(done)return;rot[i]++;pzSfx('tap');paint(i);if(rot.every(r=>r%4===0)){done=true;win();}};return t;});
    const paint=i=>{const t=tiles[i];t.style.transform='translate('+((i%n)*ts+1)+'px,'+(Math.floor(i/n)*ts+1)+'px) rotate('+(rot[i]*90)+'deg)';};
    function mix(){rot=[...Array(N)].map(()=>1+pzRand(3));if(d>=3)rot[pzRand(N)]=0;done=false;tiles.forEach((_,i)=>paint(i));}
    mix();pzBtn(foot,'🎲 MIX AGAIN',mix);
  },
  // ── BEAD SORT: tap a tube to pick up its top bead, tap another to drop it. One colour per tube! ──
  beads(area,foot,how,d,win){
    const K=[3,4,5,6][d],CAP=4,T=K+2,COLS=['#ff5a5a','#4fb3ff','#ffd23f','#5fe07a','#b06bff','#ff9a3d'];
    how.textContent='Tap a tube to pick up its top bead, then tap another tube to drop it on the same colour (or an empty tube). Sort every colour into its own tube!';
    const wrap=pzEl('div','pz-tubes');area.appendChild(wrap);let tubes=[],sel=-1,done=false,start=[];
    const els=[...Array(T)].map((_,i)=>{const t=pzEl('button','pz-tube');t.onclick=()=>tap(i);wrap.appendChild(t);return t;});
    function gen(){tubes=[...Array(T)].map((_,i)=>i<K?Array(CAP).fill(i):[]);
      // walk backwards from the solved state with moves that are always reversible, so it can always be solved
      for(let s=0,tries=0;s<60+K*30&&tries<5000;tries++){const b=pzRand(T),a=pzRand(T);if(a===b||!tubes[b].length||tubes[a].length>=CAP)continue;const x=tubes[b][tubes[b].length-1],under=tubes[b][tubes[b].length-2];
        if(tubes[b].length>1&&under!==x)continue;tubes[a].push(tubes[b].pop());s++;}
      if(solved())return gen();start=tubes.map(t=>t.slice());sel=-1;done=false;paint();}
    const solved=()=>tubes.every(t=>!t.length||(t.length===CAP&&t.every(v=>v===t[0])));
    function paint(){els.forEach((e,i)=>{e.innerHTML='';e.classList.toggle('sel',i===sel);for(let j=0;j<CAP;j++){const b=pzEl('i');if(j<tubes[i].length){b.style.background='radial-gradient(circle at 35% 30%,#fff8,'+COLS[tubes[i][j]]+' 45%,'+COLS[tubes[i][j]]+')';}else b.className='empty';e.appendChild(b);}
      if(i===sel&&e.lastChild)e.querySelectorAll('i:not(.empty)').forEach((b,j,a)=>{if(j===a.length-1)b.classList.add('up');});});}
    function tap(i){if(done)return;if(sel<0){if(tubes[i].length){sel=i;pzSfx('tap');}paint();return;}
      if(i===sel){sel=-1;paint();return;}const x=tubes[sel][tubes[sel].length-1];
      if(tubes[i].length<CAP&&(!tubes[i].length||tubes[i][tubes[i].length-1]===x)){tubes[i].push(tubes[sel].pop());pzSfx('tap');sel=-1;paint();if(solved()){done=true;win();}}
      else{pzSfx('bad');sel=tubes[i].length?i:-1;paint();}}
    gen();pzBtn(foot,'↺ START OVER',()=>{tubes=start.map(t=>t.slice());sel=-1;done=false;paint();});pzBtn(foot,'🎲 NEW MIX',gen);
  },
  // ── MAZE: guide your buddy to the glowing bead ──
  maze(area,foot,how,d,win){
    const n=[5,7,9,11][d],S=Math.min(window.innerWidth*.86,360),cs=S/n;
    how.textContent='Swipe on the maze or use the arrows to get your buddy to the glowing bead!';
    const cv=document.createElement('canvas'),dpr=Math.min(2,window.devicePixelRatio||1);cv.width=cv.height=S*dpr;cv.style.width=cv.style.height=S+'px';cv.className='pz-maze';area.appendChild(cv);
    const g=cv.getContext('2d');let walls,me,goal,done=false,raf=0,anim={x:0,y:0};
    function gen(){walls=[...Array(n*n)].map(()=>[1,1,1,1]);const seen=new Set([0]),stack=[0];   // N E S W
      while(stack.length){const c=stack[stack.length-1],x=c%n,y=Math.floor(c/n),opts=[[0,-1,0,2],[1,0,1,3],[0,1,2,0],[-1,0,3,1]].filter(([dx,dy])=>{const X=x+dx,Y=y+dy;return X>=0&&X<n&&Y>=0&&Y<n&&!seen.has(Y*n+X);});
        if(!opts.length){stack.pop();continue;}const[dx,dy,w,ow]=opts[pzRand(opts.length)],nc=(y+dy)*n+x+dx;walls[c][w]=0;walls[nc][ow]=0;seen.add(nc);stack.push(nc);}
      me=0;goal=n*n-1;anim={x:0,y:0};done=false;}
    function move(dir){if(done)return;const w=[[0,-1],[1,0],[0,1],[-1,0]][dir];if(walls[me][dir]){pzSfx('bad');return;}me+=w[1]*n+w[0];pzSfx('tap');if(me===goal){done=true;setTimeout(win,250);}}
    function draw(){raf=requestAnimationFrame(draw);g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#0b0826';g.fillRect(0,0,S,S);
      g.strokeStyle='#6a5aa8';g.lineWidth=Math.max(2,cs*.12);g.lineCap='round';g.beginPath();
      walls.forEach((w,c)=>{const x=(c%n)*cs,y=Math.floor(c/n)*cs;if(w[0]){g.moveTo(x,y);g.lineTo(x+cs,y);}if(w[1]){g.moveTo(x+cs,y);g.lineTo(x+cs,y+cs);}if(w[2]){g.moveTo(x,y+cs);g.lineTo(x+cs,y+cs);}if(w[3]){g.moveTo(x,y);g.lineTo(x,y+cs);}});g.stroke();
      const t=performance.now()/1000,gx=(goal%n+.5)*cs,gy=(Math.floor(goal/n)+.5)*cs,q=g.createRadialGradient(gx,gy,0,gx,gy,cs*.6);q.addColorStop(0,'rgba(255,225,77,.9)');q.addColorStop(1,'rgba(255,225,77,0)');g.fillStyle=q;g.fillRect(gx-cs,gy-cs,cs*2,cs*2);
      g.fillStyle='#ffe14d';g.beginPath();g.arc(gx,gy,cs*(.18+Math.sin(t*4)*.03),0,Math.PI*2);g.fill();
      const tx=me%n,ty=Math.floor(me/n);anim.x+=(tx-anim.x)*.35;anim.y+=(ty-anim.y)*.35;
      try{drawBuddy(g,(anim.x+.5)*cs,(anim.y+.5)*cs-cs*.02,cs*.95,typeof totalAliens!=='undefined'&&totalAliens?{view:'turn',angle:0,idx:bbIdx(),lite:true,t}:{view:'turn',angle:0,lite:true,t});}catch(e){}}
    gen();draw();
    let sx=null,sy=0;cv.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;e.preventDefault();},{passive:false});
    cv.addEventListener('touchmove',e=>{if(sx==null)return;const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))>cs*.7){move(Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0));sx=t.clientX;sy=t.clientY;}e.preventDefault();},{passive:false});
    cv.addEventListener('touchend',()=>{sx=null;});
    const pad=pzEl('div','pz-arrows');[['▲',0],['◀',3],['▶',1],['▼',2]].forEach(([l,dir])=>{const b=pzEl('button','a'+dir,l);b.addEventListener('touchstart',e=>{e.preventDefault();move(dir);},{passive:false});b.addEventListener('click',()=>{if(!('ontouchstart' in window))move(dir);});pad.appendChild(b);});
    area.appendChild(pad);
    const key=e=>{const k={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3}[e.key];if(k!=null){move(k);e.preventDefault();}};addEventListener('keydown',key);
    pzBtn(foot,'🎲 NEW MAZE',gen);
    return{stop(){cancelAnimationFrame(raf);removeEventListener('keydown',key);}};
  },
  // ── ODD ONE OUT: one buddy is a tiny bit different. Find it (3 rounds) ──
  odd(area,foot,how,d,win){
    const n=[3,4,4,5][d],R=3,S=Math.min(window.innerWidth*.86,360);
    how.textContent='Every buddy here is the same, except ONE. Tap the odd one out! (3 rounds)';
    const info=pzEl('div','pz-info','Round 1 of '+R);area.appendChild(info);
    const grid=pzEl('div','pz-grid odd');grid.style.gridTemplateColumns='repeat('+n+',1fr)';grid.style.width=S+'px';area.appendChild(grid);
    let round=0,odd=0,done=false;
    const PART=[['body','tip'],['eye','foot'],['foot','stem','mouth'],['tip','stem','mouth','eye']][d];
    const PAL=['#ff5a5a','#4fb3ff','#ffd23f','#5fe07a','#b06bff','#ff9a3d','#ff7ac0','#19c3b0','#f2f2f7','#2a2a33','#9b5cff','#e53935'];
    function deal(){grid.innerHTML='';odd=pzRand(n*n);const base=typeof buddyVariant==='function'?buddyVariant(pzRand(100)):{body:'#8a3a74',eye:'#ff2b2b',mouth:'#ff8a3d',stem:'#ffe14d',tip:'#ff8a3d',foot:'#4dc3ff'};
      const part=PART[pzRand(PART.length)],alt=Object.assign({},base);let c;do{c=PAL[pzRand(PAL.length)];}while(c===base[part]);alt[part]=c;
      const L1=makeBuddyLook(base),L2=makeBuddyLook(alt),cs=S/n-6,dpr=Math.min(2,window.devicePixelRatio||1),ang=pzRand(40)-20;
      for(let i=0;i<n*n;i++){const b=pzEl('button','pz-odd'),cv=document.createElement('canvas');cv.width=cv.height=cs*dpr;cv.style.width=cv.style.height=cs+'px';b.appendChild(cv);grid.appendChild(b);
        const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);try{drawBuddy(g,cs/2,cs*.55,cs*.8,{view:'turn',angle:ang,look:i===odd?L2:L1,A:null,lite:true,t:1});}catch(e){}
        b.onclick=()=>{if(done)return;if(i===odd){pzSfx('tap');b.classList.add('good');round++;if(round>=R){done=true;info.textContent='SHARP EYES!';win();}else{info.textContent='Yes! Round '+(round+1)+' of '+R;setTimeout(deal,450);}}
          else{pzSfx('bad');b.classList.add('bad');setTimeout(()=>b.classList.remove('bad'),400);}};}}
    deal();pzBtn(foot,'🎲 SHUFFLE',deal);
  },
  // ── BEAT MATCH: rebuild the beat you hear on the step grid ──
  beat(area,foot,how,d,win){
    const steps=d<2?8:16,rows=[['kick','KICK','#ff5a5a'],['snare','SNARE','#4fb3ff'],['hihat','HAT','#5fe07a']].slice(0,[1,2,2,3][d]);
    how.textContent='Press HEAR THE BEAT, then tap the squares to build the same beat. The number on each row says how many hits it has.';
    const grid=pzEl('div','pz-beat');area.appendChild(grid);let target,mine,done=false,timers=[];
    function gen(){target=rows.map((r,ri)=>{const a=Array(steps).fill(false),k=steps/4;
        if(ri===0){a[0]=true;for(let i=0;i<steps;i++)if(i%4===0&&Math.random()<.6)a[i]=true;if(Math.random()<.6)a[steps-2]=true;}
        else if(ri===1){for(let i=0;i<steps;i++)if(i%8===4)a[i]=true;if(d>=2&&Math.random()<.5)a[steps-1]=true;}
        else{for(let i=0;i<steps;i++)if(i%2===0&&Math.random()<.7)a[i]=true;}
        if(!a.some(Boolean))a[0]=true;return a;});
      mine=rows.map(()=>Array(steps).fill(false));done=false;build();}
    function build(){grid.innerHTML='';rows.forEach(([id,lab,col],ri)=>{const row=pzEl('div','pz-brow');const h=pzEl('b','',lab);h.style.color=col;const nh=target[ri].filter(Boolean).length,cnt=pzEl('small','',nh+(nh===1?' HIT':' HITS'));h.appendChild(cnt);row.appendChild(h);
      const cells=pzEl('div','pz-bcells');cells.style.gridTemplateColumns='repeat('+steps+',1fr)';for(let s=0;s<steps;s++){const c=pzEl('button',s%4===0?'beat':'');c.style.setProperty('--c',col);
        c.onclick=()=>{if(done)return;mine[ri][s]=!mine[ri][s];c.classList.toggle('on',mine[ri][s]);if(mine[ri][s]){try{getCtx();playSound(id,.9);}catch(e){}}check();};cells.appendChild(c);}
      row.appendChild(cells);grid.appendChild(row);});}
    function check(){if(mine.every((r,ri)=>r.every((v,s)=>v===target[ri][s]))){done=true;grid.classList.add('done');play(mine,()=>win());}}
    function play(pat,after){timers.forEach(clearTimeout);timers=[];const sd=60/100/4*1000;let c;try{c=getCtx();}catch(e){return;}
      for(let s=0;s<steps;s++)timers.push(setTimeout(()=>{rows.forEach(([id],ri)=>{if(pat[ri][s])playSound(id,1);});grid.querySelectorAll('.pz-bcells').forEach(cs=>{cs.querySelectorAll('button').forEach((b,j)=>b.classList.toggle('ph',j===s));});},s*sd));
      timers.push(setTimeout(()=>{grid.querySelectorAll('.ph').forEach(b=>b.classList.remove('ph'));if(after)after();},steps*sd+120));}
    gen();pzBtn(foot,'▶ HEAR THE BEAT',()=>play(target),'go');pzBtn(foot,'▶ HEAR MINE',()=>play(mine));
    return{stop(){timers.forEach(clearTimeout);}};
  },
};
