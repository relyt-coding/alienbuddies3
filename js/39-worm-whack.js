
// ══════════════════════════════════════════════
//  WORM WHACK — rhythm whack-a-mole on a rocky moon
//  Space worms pop out of craters on the beat; each drum pad below whacks the crater in the same spot.
//  Hit ≥70% of the worms to clear a level (85% ★★, 95% ★★★). First clear = permanent points ×.
//  Worms: normal · GOLD (×3 score) · ARMORED (2 hits) · HOLD (keep the pad down) · MINES (don't hit!)
//  Levels 10 / 20 / 30 end with the Wyrm boss bursting out of several craters at once.
// ══════════════════════════════════════════════
let wormMultiplier=1;               // permanent points × from first clears (saved)
let wormProgress={best:{}};         // best[lvl] = {stars, acc, score}

function wwStarsFor(acc){return acc>=.95?3:acc>=.85?2:acc>=.7?1:0;}
function wwLevelOpen(l){return (typeof TEST_MODE!=='undefined'&&TEST_MODE)||l===1||((wormProgress.best[l-1]||{}).stars||0)>=1;}

(function(){
  const $=id=>document.getElementById(id);
  const WIN={p:.06,g:.12,o:.18};
  const FALLBACK_KIT=['kick','snare','hihat','clap','rimshot','floortom','shaker','cowbell'];
  // which drum pad each crater uses, so craters sit where their pads (and keys) sit:
  //   8 craters = all pads (D F J K / C V N M) · 6 = D F J / C V N · 4 = F J / V N
  const CR_MAP={4:[1,2,5,6],6:[0,1,2,4,5,6],8:[0,1,2,3,4,5,6,7]};
  const padOf=i=>G&&G.map?G.map[i]:i;
  const craterOf=pi=>G&&G.map?G.map.indexOf(pi):pi;
  const keyLbl=i=>(typeof padBindings!=='undefined'&&padBindings[padOf(i)]&&padBindings[padOf(i)].label)||'';
  const BAND_TINTS=[[1,'#80808c','#5d5d68'],[7,'#8f7262','#6a5246'],[17,'#6f8299','#4f6074'],[27,'#7f6f9c','#5c4f76']];

  // ── DOM ──
  const ov=document.createElement('div');ov.id='wwOverlay';
  ov.innerHTML=`
    <div class="ww-hud">
      <button class="ww-x" id="wwQuit" title="Back">✕</button>
      <div class="ww-title" id="wwTitle">WORM WHACK</div>
      <div class="ww-stat"><span id="wwAcc">100%</span><small>HITS</small></div>
      <div class="ww-stat"><span id="wwCombo">0</span><small>COMBO</small></div>
      <div class="ww-stat ww-score"><span id="wwScore">0</span><small>SCORE</small></div>
      <div class="ww-prog"><div id="wwProg"></div></div>
    </div>
    <div class="ww-arena"><canvas id="wwCanvas"></canvas></div>
    <div class="ww-pads" id="wwPads"></div>
    <div class="ww-panel" id="wwSelect">
      <div class="ww-panel-inner">
        <div class="ww-sel-head"><div><div class="ww-big">WORM WHACK</div><div class="ww-sub">Whack the space worms on the beat · each pad hits the crater in the same spot</div></div><button class="ww-x" id="wwClose" title="Close">✕</button></div>
        <div class="ww-sel-bonus" id="wwBonus"></div>
        <div class="ww-grid" id="wwGrid"></div>
        <div class="ww-detail" id="wwDetail"></div>
      </div>
    </div>
    <div class="ww-panel" id="wwResults"><div class="ww-panel-inner ww-res" id="wwResInner"></div></div>`;
  document.body.appendChild(ov);
  const cv=$('wwCanvas'),ctx2=cv.getContext('2d');

  // ── state ──
  let G=null;            // current run
  let selLvl=1;
  let W=0,H=0,DPR=1,bg=null,bgKey='';

  function open(){
    if(typeof seqPlaying!=='undefined'&&seqPlaying&&typeof stopSeq==='function')stopSeq();
    if(typeof partyMode!=='undefined'&&partyMode&&typeof stopParty==='function')stopParty();
    ov.classList.add('open');document.body.classList.add('ww-open');
    let l=1;for(let i=1;i<=30;i++)if(wwLevelOpen(i))l=i;selLvl=l;
    showSelect();
  }
  function close(){stopRun();ov.classList.remove('open');document.body.classList.remove('ww-open');if(typeof autoSave==='function')autoSave();}
  window.openWormWhack=open;window.closeWormWhack=close;
  $('wwClose').addEventListener('click',close);
  $('wwQuit').addEventListener('click',()=>{if(G&&G.state==='play'){stopRun();showSelect();}else close();});

  // ── level select ──
  function showSelect(){
    $('wwResults').classList.remove('open');$('wwSelect').classList.add('open');
    $('wwBonus').innerHTML=`Worm bonus: <b>×${typeof formatStore==='function'?formatStore(wormMultiplier):wormMultiplier.toFixed(2)}</b> points forever · ${Object.values(wormProgress.best).reduce((a,b)=>a+(b.stars||0),0)} / 90 ★`;
    const g=$('wwGrid');g.innerHTML='';
    for(let l=1;l<=30;l++){
      const b=document.createElement('button');b.className='ww-tile';const best=wormProgress.best[l]||{},openL=wwLevelOpen(l);
      if(!openL)b.classList.add('locked');if(l===selLvl)b.classList.add('sel');if(l%10===0)b.classList.add('boss');
      b.innerHTML=`<span class="n">${openL?l:'🔒'}</span><span class="st">${'★'.repeat(best.stars||0)}<i>${'★'.repeat(3-(best.stars||0))}</i></span>`;
      b.addEventListener('click',()=>{if(!openL){showToast('Clear level '+(l-1)+' first');return;}selLvl=l;showSelect();});
      g.appendChild(b);
    }
    const P=wwLevel(selLvl),best=wormProgress.best[selLvl];
    const feats=[P.gold&&'gold worms',P.armor&&'armored',P.decoy&&'mines',P.hold&&'hold worms',P.chords&&'double hits',P.boss&&'BOSS'].filter(Boolean);
    const newF={2:'NEW: golden worms (×3 score)',4:'NEW: armored worms — hit twice',7:'NEW: space mines — DON\'T hit them',9:'NEW: hold worms — keep the pad down',10:'BOSS: the Moon Wyrm',12:'NEW: two worms at once',20:'BOSS: the Eclipse Wyrm',30:'FINAL BOSS: the Wyrm King'}[selLvl];
    $('wwDetail').innerHTML=`<div class="ww-d-name">${selLvl}. ${P.name}</div>
      <div class="ww-d-meta">${P.bpm} BPM · ${P.style.toUpperCase()} · ${P.craters} craters${feats.length?' · '+feats.join(', '):''}</div>
      ${newF?`<div class="ww-d-new">${newF}</div>`:''}
      <div class="ww-d-meta">${best?`Best: ${Math.round(best.acc*100)}% · ${'★'.repeat(best.stars)}${'☆'.repeat(3-best.stars)}`:`First clear: <b>×${P.reward}</b> points forever`}</div>
      <button class="ww-play" id="wwPlay">PLAY</button>`;
    $('wwPlay').addEventListener('click',()=>start(selLvl));
  }

  // ── layout ──
  function grid(n){const short=innerHeight<520&&innerWidth>innerHeight;return short?{rows:1,cols:n}:{rows:2,cols:n/2};}
  function resize(){
    const a=cv.parentElement.getBoundingClientRect();
    DPR=Math.min(2,devicePixelRatio||1);W=Math.max(10,a.width);H=Math.max(10,a.height);
    cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';
    if(G)layoutCraters();
  }
  addEventListener('resize',()=>{if(ov.classList.contains('open')){if(G)buildPads();resize();}});
  function layoutCraters(){
    const n=G.P.craters,{rows,cols}=grid(n),R=wwRng(77*G.P.lvl);
    const top=G.P.boss?H*.16:H*.04,h=H-top-H*.04,cw=W/cols,ch=h/rows;
    G.r=Math.min(78,Math.min(cw,ch)*.27);
    G.craters=[];
    for(let i=0;i<n;i++){const r=Math.floor(i/cols),c=i%cols;
      G.craters.push({x:(c+.5)*cw+(R()-.5)*cw*.18,y:top+(r+.5)*ch+(R()-.5)*ch*.14,flash:0});}
    bgKey='';
  }
  function padSound(i){return (typeof padSounds!=='undefined'&&padSounds[i]&&SOUND_MAP[padSounds[i]])?padSounds[i]:FALLBACK_KIT[i];}
  function padColor(i){const s=SOUND_MAP[padSound(i)];return(s&&s.color)||'#a0a8ff';}
  function buildPads(){
    const n=G.P.craters,{rows,cols}=grid(n),box=$('wwPads');
    box.style.gridTemplateColumns=`repeat(${cols},1fr)`;box.style.gridTemplateRows=`repeat(${rows},1fr)`;box.classList.toggle('one-row',rows===1);
    box.innerHTML='';G.padEls=[];
    for(let i=0;i<n;i++){
      const b=document.createElement('button');b.className='ww-pad';const col=padColor(padOf(i));
      b.style.setProperty('--c',col);
      b.innerHTML=`<span class="k">${keyLbl(i)}</span><span class="nm">${(SOUND_MAP[padSound(padOf(i))]||{}).name||''}</span>`;
      const down=e=>{e.preventDefault();press(i,e);};const up=e=>{e.preventDefault();release(i,e);};
      b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',e=>{if(e.buttons||e.pointerType!=='mouse')up(e);});
      b.addEventListener('contextmenu',e=>e.preventDefault());
      box.appendChild(b);G.padEls.push(b);
    }
  }

  // ── run ──
  function stopRun(){if(!G)return;clearInterval(G.sched);cancelAnimationFrame(G.raf);G.state='stopped';G=null;}
  function start(lvl){
    stopRun();
    $('wwSelect').classList.remove('open');$('wwResults').classList.remove('open');
    const song=wwCompose(lvl),chart=wwChart(song).map(n=>Object.assign({hits:0,done:false,res:null,resT:0,credit:0},n));
    const c=getCtx();
    G={state:'play',P:song.P,song,chart,ei:0,score:0,combo:0,maxCombo:0,hitVal:0,
       total:chart.filter(n=>n.type!=='decoy').length,judged:0,
       stats:{perfect:0,good:0,ok:0,miss:0,whiff:0,mine:0},fx:[],texts:[],shake:0,held:{},
       alien:{x:0,y:0,tx:0,ty:0,swing:0,face:1},bossMax:chart.filter(n=>n.boss).length,bossHp:0,bossDead:0,
       beat:60/song.bpm,armorSpan:Math.max(.36,4*song.step)};
    G.map=CR_MAP[song.P.craters]||CR_MAP[8];
    G.bossHp=G.bossMax;G.bossStart=G.bossMax?chart.find(n=>n.boss).t-song.bar*1.2:1e9;
    const lead=4*G.beat+.35;G.T0=c.currentTime+lead;
    // count-in clicks
    for(let i=0;i<4;i++)playSound(i===0?'rimshot':'rimshot',i===0?.9:.55,G.T0-(4-i)*G.beat);
    $('wwTitle').textContent=lvl+'. '+song.P.name;
    buildPads();resize(); // pads first: they decide how much room the moon gets
    G.alien.x=G.alien.tx=W/2;G.alien.y=G.alien.ty=H*.5;
    G.sched=setInterval(schedule,25);schedule();
    G.raf=requestAnimationFrame(frame);
    updHud();
  }
  function lat(){const c=getCtx();return (c.outputLatency||0)+(c.baseLatency||0)*.5;}
  function tNow(){return getCtx().currentTime-lat()-G.T0;}
  function schedule(){
    if(!G||G.state!=='play')return;
    const c=getCtx(),ahead=c.currentTime+.18,ev=G.song.events;
    while(G.ei<ev.length&&G.T0+ev[G.ei].t<ahead){
      const e=ev[G.ei++],at=Math.max(c.currentTime,G.T0+e.t);
      try{
        if(e.kind==='drum')playSound(e.id,e.vel,at);
        else if(typeof playRollNote==='function'&&SOUND_MAP[e.id])playRollNote(e.id,e.midi,at,e.dur,e.vel,-1);
      }catch(err){}
    }
  }

  // ── input ──
  // ev = the input event: its timestamp says when the finger/key really went down, so a busy frame never makes a tap late
  function evT(ev){const t=tNow();if(ev&&ev.timeStamp){const lag=(performance.now()-ev.timeStamp)/1000;if(lag>0&&lag<.25)return t-lag;}return t;}
  function press(i,ev){
    if(!G||G.state!=='play')return;
    const t=evT(ev);
    try{playSound(padSound(padOf(i)),.7);}catch(e){}
    const pe=G.padEls[i];if(pe){pe.classList.remove('lit');void pe.offsetWidth;pe.classList.add('lit');}
    G.held[i]=true;
    const cr=G.craters[i];if(!cr)return;
    G.alien.tx=cr.x-G.r*.95;G.alien.ty=cr.y-G.r*.55;G.alien.swing=1;G.alien.face=cr.x<W/2?1:-1;
    // armored worm waiting for its second hit
    let n=G.chart.find(o=>o.c===i&&!o.done&&o.type==='armor'&&o.hits===1&&t<=o.t+G.armorSpan+WIN.o);
    if(n){n.hits=2;resolve(n,t,n.grade,1);burst(cr.x,cr.y,'#b8c4d6',16);text(cr,'CRACK!','#d8e4ff');return;}
    // the closest worm in this crater inside the timing window
    let best=null,bd=9;
    G.chart.forEach(o=>{if(o.c!==i||o.done||o.type==='decoy'||o.holding)return;const d=Math.abs(t-o.t);if(d<=WIN.o&&d<bd){bd=d;best=o;}});
    if(best){
      const grade=bd<=WIN.p?'perfect':bd<=WIN.g?'good':'ok';
      if(best.type==='armor'&&best.hits===0){best.hits=1;best.grade=grade;text(cr,'HIT AGAIN!','#d8e4ff');burst(cr.x,cr.y,'#9aa6ba',8);G.shake=Math.max(G.shake,3);cr.flash=1;return;}
      if(best.type==='hold'){best.holding=true;best.grade=grade;text(cr,'HOLD!','#ffd166');cr.flash=1;G.alien.swing=1;return;}
      resolve(best,t,grade,1);return;
    }
    // a mine?
    const mine=G.chart.find(o=>o.c===i&&!o.done&&o.type==='decoy'&&Math.abs(t-o.t)<=.24);
    if(mine){mine.done=true;mine.res='boom';mine.resT=t;G.stats.mine++;G.combo=0;G.score=Math.max(0,G.score-500);
      burst(cr.x,cr.y,'#ff5533',26,1.6);burst(cr.x,cr.y,'#ffcc33',14,1.2);text(cr,'BOOM! −500','#ff6644');G.shake=10;try{playSound('zap',.7);}catch(e){}updHud();return;}
    // swing at nothing
    G.stats.whiff++;G.combo=0;G.score=Math.max(0,G.score-25);text(cr,'whiff','#777',.7);burst(cr.x,cr.y,'#888',5,.6);updHud();
  }
  function release(i,ev){
    if(!G)return;G.held[i]=false;
    if(G.state!=='play')return;
    const t=evT(ev);
    const n=G.chart.find(o=>o.c===i&&o.holding&&!o.done);
    if(n){
      const f=(t-n.t)/n.dur;
      if(f>=.9){resolve(n,t,n.grade,1,true);}
      else{n.holding=false;const cr=G.craters[i];
        if(f>=.5){resolve(n,t,'ok',.5);text(cr,'LET GO EARLY','#ffaa66');}
        else{resolve(n,t,'miss',0);text(cr,'DROPPED','#ff6666');}}
    }
  }

  function resolve(n,t,grade,credit,holdDone){
    n.done=true;n.resT=t;n.credit=credit;n.res=credit>0?'hit':'miss';G.judged++;
    const cr=G.craters[n.c];
    if(credit>0){
      G.hitVal+=credit;
      if(credit>=1){G.combo++;G.maxCombo=Math.max(G.maxCombo,G.combo);}else G.combo=0;
      G.stats[grade]=(G.stats[grade]||0)+1;
      const base={perfect:300,good:200,ok:100}[grade]||100;
      const mult=1+Math.min(3,G.combo/15);
      let pts=base*mult*(n.type==='gold'?3:1)*(n.boss?1.5:1)*(holdDone?1.5:1)*credit;
      G.score+=Math.round(pts);
      const col=n.type==='gold'?'#ffd700':grade==='perfect'?'#00ff99':grade==='good'?'#7fd4ff':'#c8c8c8';
      text(cr,(n.type==='gold'?'GOLD! ':'')+(holdDone?'HELD! ':'')+grade.toUpperCase(),col);
      burst(cr.x,cr.y,n.type==='gold'?'#ffd700':n.boss?'#ff4466':'#c86bd8',grade==='perfect'?18:12);
      burst(cr.x,cr.y,'#9a9aa4',8,.8);
      G.shake=Math.max(G.shake,grade==='perfect'?6:4);cr.flash=1;
      if(n.boss&&credit>=1){G.bossHp=Math.max(0,G.bossHp-1);if(!G.bossHp&&!G.bossDead){G.bossDead=t;G.shake=18;for(let k=0;k<5;k++)burst(W/2,H*.08,['#ff4466','#ffd166','#c86bd8'][k%3],30,2.2);text({x:W/2,y:H*.3},'WYRM DEFEATED!','#ffd166',1.6);G.score+=5000;}}
    }else{
      G.combo=0;G.stats.miss++;text(cr,'MISS','#ff5566');
    }
    updHud();
  }

  // ── effects ──
  function burst(x,y,col,n,spd){spd=spd||1;for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2,v=(60+Math.random()*180)*spd;G.fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,col,s:2+Math.random()*3.5});}}
  function text(cr,txt,col,sz){G.texts.push({x:cr.x,y:cr.y-(G.r||40)*1.1,txt,col,life:1,sz:sz||1});}
  function updHud(){
    if(!G)return;
    $('wwScore').textContent=G.score.toLocaleString();
    $('wwCombo').textContent=G.combo;
    $('wwAcc').textContent=(G.judged?Math.round(G.hitVal/Math.max(1,G.chart.filter(n=>n.done&&n.type!=='decoy').length)*100):100)+'%';
  }

  // ── frame ──
  function frame(){
    if(!G||G.state!=='play')return;
    G.raf=requestAnimationFrame(frame);
    const t=tNow(),dt=Math.min(.05,(performance.now()-(G.lastPerf||performance.now()))/1000);G.lastPerf=performance.now();
    // gamepad: keep hold worms alive while the mapped button stays down
    if(typeof gpButtonFor==='function'&&navigator.getGamepads){const gp=[...navigator.getGamepads()].find(Boolean);
      if(gp)G.chart.forEach(o=>{if(o.holding&&!o.done&&o.viaPad){const bi=gpButtonFor(padOf(o.c));if(bi!=null&&gp.buttons[bi]&&!gp.buttons[bi].pressed)release(o.c);}});}
    // judge worms that got away
    G.chart.forEach(n=>{
      if(n.done)return;
      if(n.type==='decoy'){if(t>n.t+.4){n.done=true;n.res='gone';}return;}
      if(n.type==='hold'){if(n.holding){if(t>=n.t+n.dur)resolve(n,t,n.grade,1,true);}else if(t>n.t+WIN.o)resolve(n,t,'miss',0);return;}
      if(n.type==='armor'&&n.hits===1){if(t>n.t+G.armorSpan+WIN.o){resolve(n,t,'ok',.5);text(G.craters[n.c],'GOT AWAY','#ffaa66');}return;}
      if(t>n.t+WIN.o)resolve(n,t,'miss',0);
    });
    $('wwProg').style.width=Math.max(0,Math.min(100,t/G.song.length*100))+'%';
    if(t>G.song.length+.4&&G.chart.every(n=>n.done))finish();
    draw(t,dt);
  }

  // ── drawing ──
  function makeBg(){
    const key=W+'x'+H+':'+G.P.lvl;if(bg&&bgKey===key)return;bgKey=key;
    bg=document.createElement('canvas');bg.width=cv.width;bg.height=cv.height;const g=bg.getContext('2d');g.scale(DPR,DPR);
    const band=BAND_TINTS.filter(b=>G.P.lvl>=b[0]).pop(),R=wwRng(131*G.P.lvl);
    const grd=g.createRadialGradient(W*.5,H*.45,10,W*.5,H*.5,Math.max(W,H)*.75);grd.addColorStop(0,band[1]);grd.addColorStop(1,band[2]);
    g.fillStyle=grd;g.fillRect(0,0,W,H);
    // speckle + small decorative craters + rocks
    for(let i=0;i<W*H/260;i++){g.fillStyle=`rgba(${R()<.5?0:255},${R()<.5?0:255},${R()<.5?0:255},${.03+R()*.04})`;g.fillRect(R()*W,R()*H,1+R()*2,1+R()*2);}
    for(let i=0;i<26;i++){const x=R()*W,y=R()*H,r=4+R()*R()*38;
      g.fillStyle='rgba(0,0,0,.16)';g.beginPath();g.ellipse(x,y,r,r*.92,0,0,Math.PI*2);g.fill();
      g.strokeStyle='rgba(255,255,255,.10)';g.lineWidth=Math.max(1,r*.12);g.beginPath();g.arc(x-r*.06,y-r*.08,r,Math.PI*.95,Math.PI*1.9);g.stroke();}
    for(let i=0;i<14;i++){const x=R()*W,y=R()*H,r=3+R()*7;g.fillStyle='rgba(30,30,36,.35)';g.beginPath();g.ellipse(x+2,y+3,r,r*.7,0,0,Math.PI*2);g.fill();g.fillStyle='rgba(160,160,170,.55)';g.beginPath();g.ellipse(x,y,r,r*.75,R(),0,Math.PI*2);g.fill();}
    // the playing craters (holes)
    G.craters.forEach(c=>{const r=G.r;
      g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(c.x+3,c.y+5,r*1.32,r*1.22,0,0,Math.PI*2);g.fill();
      const rim=g.createRadialGradient(c.x-r*.3,c.y-r*.35,r*.2,c.x,c.y,r*1.35);rim.addColorStop(0,'rgba(255,255,255,.28)');rim.addColorStop(1,'rgba(255,255,255,.04)');
      g.fillStyle=rim;g.beginPath();g.ellipse(c.x,c.y,r*1.3,r*1.2,0,0,Math.PI*2);g.fill();
      const hole=g.createRadialGradient(c.x+r*.15,c.y+r*.2,r*.1,c.x,c.y,r);hole.addColorStop(0,'#05050a');hole.addColorStop(1,'#26252e');
      g.fillStyle=hole;g.beginPath();g.ellipse(c.x,c.y,r,r*.9,0,0,Math.PI*2);g.fill();});
    // edge vignette
    const v=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,10,.55)');g.fillStyle=v;g.fillRect(0,0,W,H);
  }
  const ease=p=>1-Math.pow(1-p,3);
  const back=p=>{const c1=1.7,c3=c1+1;return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2);};
  function wormColors(n){
    if(n.boss)return['#d0314f','#7d1430'];
    if(n.type==='gold')return['#ffd34d','#b8860b'];
    if(n.type==='armor')return['#b072c4','#5b2f6c'];
    if(n.type==='hold')return['#7fd46b','#2f6b2a'];
    return['#d276d8','#7a2f86'];
  }
  function drawWorm(n,t){
    const c=G.craters[n.c],r=G.r,A=G.P.approach;
    let up=ease(Math.max(0,Math.min(1,(t-(n.t-A))/A)));
    if(n.type==='hold'&&n.holding)up=1;
    if(n.done){const k=(t-n.resT)/(n.res==='hit'?.22:.35);if(k>=1)return;up*=1-ease(k);}
    if(up<=.02)return;
    g2.save();
    // clip to the hole so it really comes out of the crater
    g2.beginPath();g2.ellipse(c.x,c.y-r*.1,r*1.05,r*1.25,0,0,Math.PI*2);g2.clip();
    if(n.type==='decoy'){ // space mine
      const s=r*.62*back(Math.min(1,up)),x=c.x,y=c.y+(1-up)*r;
      g2.fillStyle='#3c3f48';for(let k=0;k<8;k++){const a=k/8*Math.PI*2+t*.6;g2.beginPath();g2.moveTo(x+Math.cos(a)*s*.7,y+Math.sin(a)*s*.7);g2.lineTo(x+Math.cos(a+.18)*s*1.25,y+Math.sin(a+.18)*s*1.25);g2.lineTo(x+Math.cos(a+.36)*s*.7,y+Math.sin(a+.36)*s*.7);g2.fill();}
      const mg=g2.createRadialGradient(x-s*.3,y-s*.3,1,x,y,s);mg.addColorStop(0,'#9aa0ad');mg.addColorStop(1,'#2a2c33');g2.fillStyle=mg;g2.beginPath();g2.arc(x,y,s*.78,0,Math.PI*2);g2.fill();
      g2.fillStyle=(Math.floor(t*6)%2)?'#ff2b2b':'#661111';g2.shadowColor='#ff2b2b';g2.shadowBlur=12;g2.beginPath();g2.arc(x,y-s*.1,s*.2,0,Math.PI*2);g2.fill();
      g2.restore();return;
    }
    const [c1,c2]=wormColors(n),hs=r*(n.boss?.72:.62)*back(Math.min(1,up));
    const hx=c.x+Math.sin(t*5+n.c)*r*.05*(n.done&&n.res==='miss'?3:1),hy=c.y-r*.15+(1-up)*r*1.1;
    // body segments trailing back into the hole
    for(let k=3;k>=1;k--){const sx=c.x+Math.sin(t*4+k)*r*.06,sy=hy+k*hs*.42;g2.fillStyle=k%2?c2:c1;g2.beginPath();g2.ellipse(sx,sy,hs*(1-k*.08),hs*(.9-k*.08),0,0,Math.PI*2);g2.fill();}
    // head
    const hg=g2.createRadialGradient(hx-hs*.35,hy-hs*.4,hs*.1,hx,hy,hs);hg.addColorStop(0,'#fff');hg.addColorStop(.18,c1);hg.addColorStop(1,c2);
    g2.fillStyle=hg;g2.beginPath();g2.ellipse(hx,hy,hs,hs*.95,0,0,Math.PI*2);g2.fill();
    // eyes (squint when hit / laugh when it got away)
    const hit=n.done&&n.res==='hit',laugh=n.done&&n.res==='miss';
    [-1,1].forEach(sd=>{const ex=hx+sd*hs*.36,ey=hy-hs*.18;
      if(hit){g2.strokeStyle='#1a0a20';g2.lineWidth=Math.max(1.5,hs*.08);g2.beginPath();g2.moveTo(ex-hs*.12,ey-hs*.1);g2.lineTo(ex+hs*.12,ey+hs*.1);g2.moveTo(ex+hs*.12,ey-hs*.1);g2.lineTo(ex-hs*.12,ey+hs*.1);g2.stroke();}
      else{g2.fillStyle='#fff';g2.beginPath();g2.ellipse(ex,ey,hs*.2,hs*.24,0,0,Math.PI*2);g2.fill();g2.fillStyle='#120818';g2.beginPath();g2.arc(ex+sd*hs*.03,ey+(laugh?-hs*.06:hs*.04),hs*.11,0,Math.PI*2);g2.fill();}
      if(n.boss){g2.strokeStyle='#2a0010';g2.lineWidth=hs*.08;g2.beginPath();g2.moveTo(ex-sd*hs*.22,ey-hs*.36);g2.lineTo(ex+sd*hs*.18,ey-hs*.22);g2.stroke();}
    });
    // mouth
    g2.strokeStyle='#1a0a20';g2.lineWidth=Math.max(1.5,hs*.07);g2.beginPath();
    if(laugh){g2.fillStyle='#1a0a20';g2.ellipse(hx,hy+hs*.32,hs*.22,hs*.16,0,0,Math.PI*2);g2.fill();}
    else g2.arc(hx,hy+hs*.2,hs*.22,.15*Math.PI,.85*Math.PI);g2.stroke();
    // antennae
    if(!n.boss)[-1,1].forEach(sd=>{g2.strokeStyle=c2;g2.lineWidth=Math.max(1.2,hs*.06);g2.beginPath();g2.moveTo(hx+sd*hs*.3,hy-hs*.75);g2.quadraticCurveTo(hx+sd*hs*.55,hy-hs*1.2,hx+sd*hs*.42,hy-hs*1.32);g2.stroke();g2.fillStyle=c1;g2.beginPath();g2.arc(hx+sd*hs*.42,hy-hs*1.32,hs*.1,0,Math.PI*2);g2.fill();});
    // armor helmet
    if(n.type==='armor'&&n.hits<2){
      g2.fillStyle=n.hits?'rgba(180,190,210,.55)':'#aab4c6';g2.strokeStyle='#5d6678';g2.lineWidth=hs*.06;
      g2.beginPath();g2.ellipse(hx,hy-hs*.2,hs*1.05,hs*.82,0,Math.PI,Math.PI*2);g2.closePath();g2.fill();g2.stroke();
      if(n.hits){g2.strokeStyle='#2a2f3a';g2.lineWidth=hs*.05;g2.beginPath();g2.moveTo(hx-hs*.4,hy-hs*.9);g2.lineTo(hx-hs*.1,hy-hs*.55);g2.lineTo(hx-hs*.25,hy-hs*.3);g2.moveTo(hx+hs*.3,hy-hs*.85);g2.lineTo(hx+hs*.05,hy-hs*.45);g2.stroke();}
    }
    if(n.type==='gold'){g2.fillStyle='rgba(255,255,220,.9)';for(let k=0;k<3;k++){const a=t*3+k*2.1;g2.beginPath();g2.arc(hx+Math.cos(a)*hs*1.05,hy+Math.sin(a)*hs*.9,hs*.07,0,Math.PI*2);g2.fill();}}
    g2.restore();
    // hold: ring that fills while you keep the pad down
    if(n.type==='hold'&&!n.done){
      const p=n.holding?Math.min(1,(t-n.t)/n.dur):0;
      g2.strokeStyle='rgba(127,212,107,.25)';g2.lineWidth=5;g2.beginPath();g2.arc(c.x,c.y,r*1.45,0,Math.PI*2);g2.stroke();
      g2.strokeStyle='#7fd46b';g2.shadowColor='#7fd46b';g2.shadowBlur=n.holding?14:0;g2.beginPath();g2.arc(c.x,c.y,r*1.45,-Math.PI/2,-Math.PI/2+p*Math.PI*2);g2.stroke();g2.shadowBlur=0;
      if(!n.holding&&up>.5){g2.fillStyle='#7fd46b';g2.font=`bold ${Math.round(r*.32)}px 'Bebas Neue',sans-serif`;g2.textAlign='center';g2.fillText('HOLD',c.x,c.y+r*1.75);}
    }
  }
  let g2=ctx2;
  function draw(t,dt){
    makeBg();
    const sh=G.shake;G.shake*=Math.pow(.0015,dt);
    g2.setTransform(DPR,0,0,DPR,0,0);g2.clearRect(0,0,W,H);
    g2.save();if(sh>.3)g2.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
    g2.drawImage(bg,0,0,W,H);
    // crater flashes + approach rings + key labels
    G.craters.forEach((c,i)=>{
      if(c.flash>0){g2.strokeStyle=`rgba(255,255,255,${c.flash*.7})`;g2.lineWidth=3;g2.beginPath();g2.ellipse(c.x,c.y,G.r*(1.3+(1-c.flash)*.4),G.r*(1.2+(1-c.flash)*.4),0,0,Math.PI*2);g2.stroke();c.flash=Math.max(0,c.flash-dt*4);}
      const col=padColor(padOf(i));
      G.chart.forEach(n=>{if(n.c!==i||n.done||n.type==='decoy'||n.holding)return;const k=(n.t-t)/G.P.approach;if(k<0||k>1)return;
        g2.strokeStyle=col;g2.globalAlpha=.25+.6*(1-k);g2.lineWidth=2.5;g2.beginPath();g2.ellipse(c.x,c.y,G.r*(1.05+k*1.1),G.r*(.95+k*1.0),0,0,Math.PI*2);g2.stroke();g2.globalAlpha=1;});
      const key=keyLbl(i);
      g2.fillStyle='rgba(255,255,255,.35)';g2.font=`${Math.round(Math.max(10,G.r*.26))}px 'Bebas Neue',sans-serif`;g2.textAlign='center';
      g2.fillText((i+1)+(key&&IS_DESKTOP?' · '+key:''),c.x,c.y+G.r*1.45);
    });
    // boss head looming over the top of the moon
    if(G.bossMax&&t>G.bossStart){
      const k=Math.min(1,(t-G.bossStart)/1.2),dead=G.bossDead?Math.min(1,(t-G.bossDead)/1.2):0;
      const bx=W/2,by=-H*.05+H*.12*ease(k)-dead*H*.2,bs=Math.min(W*.22,H*.2);
      if(dead<1){g2.save();g2.globalAlpha=1-dead;
        const bg2=g2.createRadialGradient(bx-bs*.3,by-bs*.2,bs*.1,bx,by,bs*1.1);bg2.addColorStop(0,'#ff8aa0');bg2.addColorStop(.3,'#d0314f');bg2.addColorStop(1,'#5a0c22');
        g2.fillStyle=bg2;g2.beginPath();g2.ellipse(bx,by,bs*1.3,bs,0,0,Math.PI*2);g2.fill();
        [-1,1].forEach(sd=>{g2.fillStyle='#ffe066';g2.beginPath();g2.ellipse(bx+sd*bs*.45,by+bs*.15,bs*.18,bs*.12,0,0,Math.PI*2);g2.fill();g2.fillStyle='#200';g2.beginPath();g2.arc(bx+sd*bs*.45,by+bs*.17,bs*.06,0,Math.PI*2);g2.fill();});
        g2.fillStyle='#2a0010';g2.beginPath();g2.ellipse(bx,by+bs*.55,bs*.45,bs*.16+Math.abs(Math.sin(t*6))*bs*.08,0,0,Math.PI*2);g2.fill();
        g2.fillStyle='#fff';for(let k2=-3;k2<=3;k2++){g2.beginPath();g2.moveTo(bx+k2*bs*.12-bs*.05,by+bs*.45);g2.lineTo(bx+k2*bs*.12+bs*.05,by+bs*.45);g2.lineTo(bx+k2*bs*.12,by+bs*.58);g2.fill();}
        g2.restore();
        // HP bar
        const bw=Math.min(W*.6,420),bxx=W/2-bw/2,byy=8;g2.fillStyle='rgba(0,0,0,.55)';g2.fillRect(bxx,byy,bw,10);
        g2.fillStyle='#ff4466';g2.fillRect(bxx,byy,bw*(G.bossHp/G.bossMax),10);g2.strokeStyle='#ffd166';g2.lineWidth=1;g2.strokeRect(bxx,byy,bw,10);
        g2.fillStyle='#ffd166';g2.font="12px 'Bebas Neue',sans-serif";g2.textAlign='center';g2.fillText(G.P.lvl===30?'THE WYRM KING':G.P.lvl===20?'THE ECLIPSE WYRM':'THE MOON WYRM',W/2,byy+24);
      }
    }
    // worms (draw those lower on screen last)
    G.chart.filter(n=>{const A=G.P.approach;return t>n.t-A-.05&&(!n.done||t<n.resT+.4)&&(n.type!=='hold'||t<n.t+n.dur+.5);}).sort((a,b)=>G.craters[a.c].y-G.craters[b.c].y).forEach(n=>drawWorm(n,t));
    // alien with hammer
    const al=G.alien,k=1-Math.pow(.0005,dt);al.x+=(al.tx-al.x)*k;al.y+=(al.ty-al.y)*k;
    const sw=al.swing;al.swing=Math.max(0,al.swing-dt*5.5);
    const as=Math.max(26,G.r*.95),col=(typeof getAlienColor==='function')?getAlienColor(0):'#00ff88';
    const squash=1+sw*.18;
    g2.save();g2.translate(al.x,al.y);
    // hammer (swings down on each whack)
    g2.save();g2.translate(as*.35*al.face,-as*.05);g2.rotate((-1.1+sw*1.6)*al.face);
    g2.fillStyle='#8b5a2b';g2.fillRect(-as*.06,-as*.9,as*.12,as*.9);
    g2.fillStyle='#c9ced8';g2.strokeStyle='#4a505c';g2.lineWidth=2;g2.beginPath();g2.roundRect?g2.roundRect(-as*.32,-as*1.12,as*.64,as*.34,as*.08):g2.rect(-as*.32,-as*1.12,as*.64,as*.34);g2.fill();g2.stroke();
    g2.restore();
    g2.scale(squash,1/squash);
    g2.shadowColor=col;g2.shadowBlur=12;g2.font=`${Math.round(as)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;g2.textAlign='center';g2.textBaseline='middle';
    g2.fillText('👽',0,0);g2.shadowBlur=0;g2.restore();
    // particles
    G.fx=G.fx.filter(p=>(p.life-=dt*1.6)>0);
    G.fx.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.92;p.vy*=.92;g2.globalAlpha=Math.max(0,p.life);g2.fillStyle=p.col;g2.beginPath();g2.arc(p.x,p.y,p.s,0,Math.PI*2);g2.fill();});
    g2.globalAlpha=1;
    // floating text
    G.texts=G.texts.filter(x=>(x.life-=dt*1.2)>0);
    G.texts.forEach(x=>{g2.globalAlpha=Math.min(1,x.life*1.6);g2.fillStyle=x.col;g2.font=`${Math.round(Math.max(14,G.r*.42)*x.sz)}px 'Bebas Neue',sans-serif`;g2.textAlign='center';g2.strokeStyle='rgba(0,0,0,.6)';g2.lineWidth=3;
      const y=x.y-(1-x.life)*24;g2.strokeText(x.txt,x.x,y);g2.fillText(x.txt,x.x,y);});
    g2.globalAlpha=1;
    // count-in
    if(t<0){const beatsLeft=Math.ceil(-t/G.beat);g2.fillStyle='rgba(0,0,0,.35)';g2.fillRect(0,0,W,H);g2.fillStyle='#fff';g2.font=`${Math.round(Math.min(W,H)*.22)}px 'Bebas Neue',sans-serif`;g2.textAlign='center';g2.textBaseline='middle';g2.fillText(beatsLeft>3?'READY':String(beatsLeft),W/2,H/2);g2.textBaseline='alphabetic';}
    else if(t<G.beat*1.2){g2.fillStyle=`rgba(255,255,255,${1-t/(G.beat*1.2)})`;g2.font=`${Math.round(Math.min(W,H)*.18)}px 'Bebas Neue',sans-serif`;g2.textAlign='center';g2.textBaseline='middle';g2.fillText('WHACK!',W/2,H/2);g2.textBaseline='alphabetic';}
    g2.restore();
  }

  // ── results ──
  function finish(){
    if(!G||G.state!=='play')return;
    G.state='done';clearInterval(G.sched);cancelAnimationFrame(G.raf);
    const acc=G.total?G.hitVal/G.total:1,stars=wwStarsFor(acc),L=G.P.lvl;
    const prev=wormProgress.best[L],first=stars>=1&&!(prev&&prev.stars>=1);
    if(!prev||acc>prev.acc||G.score>prev.score)wormProgress.best[L]={stars:Math.max(stars,prev?prev.stars:0),acc:Math.max(acc,prev?prev.acc:0),score:Math.max(G.score,prev?prev.score:0)};
    if(first){wormMultiplier*=G.P.reward;try{playSfxTierUnlock&&playSfxTierUnlock(3);}catch(e){}}
    if(typeof autoSave==='function')autoSave();
    if(typeof renderUI==='function')renderUI();
    const s=G.stats,pass=stars>=1;
    $('wwResInner').innerHTML=`
      <div class="ww-big ${pass?'win':'lose'}">${pass?(G.bossMax&&!G.bossHp?'BOSS DOWN!':'LEVEL CLEAR!'):'SO CLOSE!'}</div>
      <div class="ww-d-name">${L}. ${G.P.name}</div>
      <div class="ww-stars">${[1,2,3].map(k=>`<span class="${k<=stars?'on':''}">★</span>`).join('')}</div>
      <div class="ww-res-acc">${Math.round(acc*100)}%<small>${pass?'worms whacked':'need 70% to clear'}</small></div>
      <div class="ww-res-grid">
        <div><b>${G.score.toLocaleString()}</b><small>SCORE</small></div><div><b>${G.maxCombo}</b><small>BEST COMBO</small></div>
        <div><b style="color:#00ff99">${s.perfect||0}</b><small>PERFECT</small></div><div><b style="color:#7fd4ff">${s.good||0}</b><small>GOOD</small></div>
        <div><b>${s.ok||0}</b><small>OK</small></div><div><b style="color:#ff5566">${s.miss||0}</b><small>MISSED</small></div>
        ${s.mine?`<div><b style="color:#ff6644">${s.mine}</b><small>MINES HIT</small></div>`:''}
      </div>
      ${first?`<div class="ww-reward">Permanent bonus: ×${G.P.reward} points!${L<30?' · Level '+(L+1)+' unlocked':''}</div>`:''}
      <div class="ww-res-btns">
        <button class="ww-btn" id="wwRetry">RETRY</button>
        ${pass&&L<30?'<button class="ww-btn ww-play" id="wwNext">NEXT LEVEL</button>':''}
        <button class="ww-btn" id="wwLevels">LEVELS</button>
      </div>`;
    $('wwResults').classList.add('open');
    $('wwRetry').addEventListener('click',()=>start(L));
    const nx=$('wwNext');if(nx)nx.addEventListener('click',()=>{selLvl=L+1;start(L+1);});
    $('wwLevels').addEventListener('click',()=>{selLvl=pass&&L<30?L+1:L;G=null;showSelect();});
  }

  // ── keyboard / mouse buttons / gamepad: the pad bindings drive the craters while the game is open ──
  addEventListener('keydown',e=>{
    if(!ov.classList.contains('open'))return;
    if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(G&&G.state==='play'){stopRun();showSelect();}else close();return;}
    if(!G||G.state!=='play')return;
    for(const [idx,b] of Object.entries(typeof padBindings!=='undefined'?padBindings:{})){
      if(b.key&&e.code===b.key){e.preventDefault();e.stopImmediatePropagation();const c=craterOf(+idx);if(!e.repeat&&c>=0)press(c,e);return;}
    }
  },true);
  addEventListener('keyup',e=>{
    if(!G||!ov.classList.contains('open'))return;
    for(const [idx,b] of Object.entries(typeof padBindings!=='undefined'?padBindings:{}))if(b.key&&e.code===b.key){const c=craterOf(+idx);if(c>=0)release(c,e);return;}
  },true);
  addEventListener('mouseup',e=>{if(!G||!ov.classList.contains('open')||e.button===0)return;for(const [idx,b] of Object.entries(padBindings||{}))if(b.mouse===e.button){const c=craterOf(+idx);if(c>=0)release(c);}},true);
  // the main game's firePad (keys, mouse buttons, gamepad) → whack instead, while Worm Whack is open
  if(typeof firePad==='function'){
    const _fire=firePad;
    firePad=function(idx){
      if(ov.classList.contains('open')){const c=craterOf(idx);if(G&&G.state==='play'&&c>=0){press(c);const n=G.chart.find(o=>o.c===c&&o.holding&&!o.done);if(n)n.viaPad=true;}return;}
      return _fire.apply(this,arguments);
    };
  }
  // (test hooks: the auto-player in the test suite drives these)
  window._wwDebug={state:()=>G,press,release,start,tNow:()=>G?tNow():0,select:showSelect};

  // ── entry button in the bunker (under the Matching Game), once the skill-tree node is bought ──
  const eb=document.createElement('button');eb.id='wormGameBtn';eb.type='button';eb.textContent='🪱 WORM WHACK';
  const ml=$('matchingGameLock');if(ml)ml.after(eb);else{const mb=$('matchingGameBtn');if(mb)mb.after(eb);}
  eb.addEventListener('click',open);
  let _wwHad=null;
  function syncEntry(){
    const has=(typeof TEST_MODE!=='undefined'&&TEST_MODE)||(typeof unlockedSkills!=='undefined'&&!!unlockedSkills.worm_whack);
    eb.style.display=has?'':'none';
    if(_wwHad===false&&has)showToast('🪱 WORM WHACK unlocked! Find it in the bunker, under the Matching Game.');
    _wwHad=has;
  }
  setInterval(syncEntry,800);syncEntry();
  // leaving the tab mid-song stops the level (the music can't pause)
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&G&&G.state==='play'){stopRun();showSelect();showToast('Worm Whack stopped — you left the game');}});
})();
