
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
  const WW_BONKS=['BONK!','WHAP!','POW!','BOP!','THWACK!','BAM!'];   // just a fun noise word, the same for every hit in time
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
        <div class="ww-sel-head"><div><div class="ww-big">WORM WHACK</div><div class="ww-sub">Whack the space worms on the beat · each pad hits the crater in the same spot · kicks pop up on the bottom row, snares on the top</div></div><div style="display:flex;gap:6px"><button class="ww-btn mg-sync-btn" id="wwSync" title="Calibrate your timing">⏱ SYNC</button><button class="ww-x" id="wwClose" title="Close">✕</button></div></div>
        <div class="mg-tabs"><button class="mg-tab sel" id="wwTabLv">LEVELS</button><button class="mg-tab" id="wwTabMine">YOUR BEATS</button></div>
        <div id="wwLvPane"><div class="ww-sel-bonus" id="wwBonus"></div>
        <div class="ww-grid" id="wwGrid"></div>
        <div class="ww-detail" id="wwDetail"></div></div>
        <div id="wwMinePane" class="ww-detail" style="display:none"></div>
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
  $('wwTabLv').addEventListener('click',()=>showTab('lv'));$('wwTabMine').addEventListener('click',()=>showTab('mine'));
  $('wwSync').addEventListener('click',()=>{if(typeof mgOpenSync==='function')mgOpenSync(()=>{});});
  $('wwQuit').addEventListener('click',()=>{if(G&&G.state==='play'){stopRun();showSelect();}else close();});

  // ── level select ──
  let tab='lv';const mineOpts={id:'wwMine',onPlay:song=>start(song)};
  function showTab(t){tab=t;$('wwTabLv').classList.toggle('sel',t==='lv');$('wwTabMine').classList.toggle('sel',t==='mine');$('wwLvPane').style.display=t==='lv'?'':'none';$('wwMinePane').style.display=t==='mine'?'':'none';
    if(t==='mine'){mineOpts.best=wormProgress.custom||{};mgRenderCustom($('wwMinePane'),mineOpts);}}
  function showSelect(){
    $('wwResults').classList.remove('open');$('wwSelect').classList.add('open');showTab(tab);
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
    const newF={1:'Listen: kicks pop up on the bottom row, snares on the top',2:'NEW: golden worms (×3 score) — one waits at the end of every phrase',4:'NEW: armored worms — hit twice',6:'NEW: worms on the off-beat "and"',7:'NEW: six craters · space mines sit in the silence — DON\'T hit them',9:'NEW: hold worms — keep the pad down',10:'BOSS: the Moon Wyrm — four attack phases',12:'NEW: two worms at once on the crash',14:'Armored worms on every chorus',15:'NEW: sixteenth-note runs on the drum fills',17:'NEW: all eight craters',20:'BOSS: the Eclipse Wyrm',30:'FINAL BOSS: the Wyrm King'}[selLvl];
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
  function hex6(c){c=String(c||'');if(/^#[0-9a-f]{3}$/i.test(c))c='#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3];return /^#[0-9a-f]{6}$/i.test(c)?c:'#a0a8ff';}
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
  function start(lvl){ // a level number, or a song object from YOUR BEATS
    stopRun();
    $('wwSelect').classList.remove('open');$('wwResults').classList.remove('open');
    const song=typeof lvl==='object'?lvl:wwCompose(lvl),chart=wwChart(song).map(n=>Object.assign({hits:0,done:false,res:null,resT:0,credit:0},n));
    // the backing track always plays every drum (a miss never leaves a hole in the beat); each worm still knows the
    // drum hits under it, so a whack can land a musical reward right on that beat
    {const byT=new Map();song.events.forEach(e=>{e.owned=false;e.played=false;if(e.kind!=='drum')return;const k=Math.round(e.t*1000);if(!byT.has(k))byT.set(k,[]);byT.get(k).push(e);});
     chart.forEach(n=>{if(n.type==='decoy')return;const k=Math.round(n.t*1000);n.own=[...(byT.get(k-1)||[]),...(byT.get(k)||[]),...(byT.get(k+1)||[])];n.own.forEach(e=>e.owned=true);});}
    const c=getCtx();
    G={state:'play',P:song.P,song,chart,ei:0,score:0,combo:0,maxCombo:0,hitVal:0,
       total:chart.filter(n=>n.type!=='decoy').length,judged:0,
       stats:{perfect:0,good:0,ok:0,miss:0,whiff:0,mine:0},fx:[],texts:[],rings:[],pows:[],timing:[],pflash:0,shake:0,held:{},
       alien:{x:0,y:0,tx:0,ty:0,swing:0,face:1},bossMax:chart.filter(n=>n.boss).length,bossHp:0,bossDead:0,
       beat:60/song.bpm,armorSpan:Math.max(.36,4*song.step)};
    G.map=CR_MAP[song.P.craters]||CR_MAP[8];
    G.bossHp=G.bossMax;G.bossStart=G.bossMax?chart.find(n=>n.boss).t-song.bar*1.2:1e9;
    const lead=4*G.beat+.35;G.T0=c.currentTime+lead;
    // count-in clicks
    for(let i=0;i<4;i++)playSound(i===0?'rimshot':'rimshot',i===0?.9:.55,G.T0-(4-i)*G.beat);
    $('wwTitle').textContent=song.custom?song.P.name+' · '+song.P.diff:lvl+'. '+song.P.name;
    buildPads();resize(); // pads first: they decide how much room the moon gets
    G.alien.x=G.alien.tx=W/2;G.alien.y=G.alien.ty=H*.5;
    G.sched=setInterval(schedule,25);schedule();
    G.raf=requestAnimationFrame(frame);
    updHud();
  }
  function lat(){const c=getCtx();return (c.outputLatency||0)+(c.baseLatency||0)*.5;}
  // (mgOffset = the player's SYNC calibration: shifts judging and visuals to match what they hear)
  function tNow(){return getCtx().currentTime-lat()-G.T0-(typeof mgOffset==='function'?mgOffset():0);}
  function schedule(){
    if(!G||G.state!=='play')return;
    const c=getCtx(),ahead=c.currentTime+.18,ev=G.song.events;
    while(G.ei<ev.length&&G.T0+ev[G.ei].t<ahead){
      const e=ev[G.ei++],at=Math.max(c.currentTime,G.T0+e.t);
      try{
        if(e.kind==='drum')playSound(e.id,e.vel,at,e.ch);
        else if(typeof playRollNote==='function'&&SOUND_MAP[e.id])playRollNote(e.id,e.midi,at,e.dur,e.vel,e.layer==null?-1:e.layer);
      }catch(err){}
    }
  }

  // ── input ──
  // ev = the input event: its timestamp says when the finger/key really went down, so a busy frame never makes a tap late
  function evT(ev){const t=tNow();if(ev&&ev.timeStamp){const lag=(performance.now()-ev.timeStamp)/1000;if(lag>0&&lag<.25)return t-lag;}return t;}
  function press(i,ev){
    if(!G||G.state!=='play')return;
    const t=evT(ev);
    let sounded=false;const padHit=()=>{if(!sounded){sounded=true;try{playSound(padSound(padOf(i)),.55);}catch(e){}}};
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
      best.tag=grade==='perfect'?'':(t<best.t?'EARLY':'LATE');
      if(best.type!=='armor'||best.hits===0)G.timing.push({d:t-best.t,at:performance.now()});
      if(best.type==='armor'&&best.hits===0){best.hits=1;try{punch(Math.max(getCtx().currentTime,G.T0+best.t),.6);mallet(ladder(G.song,Math.max(0,G.combo)),Math.max(getCtx().currentTime,G.T0+best.t),.45);}catch(e){}G.pows.push({x:cr.x,y:cr.y-G.r*.25,col:'#d8e4ff',life:.8,rot:Math.random()*.6-.3,word:''});best.grade=grade;text(cr,'HIT AGAIN!','#d8e4ff');burst(cr.x,cr.y,'#9aa6ba',8);G.shake=Math.max(G.shake,3);cr.flash=1;return;}
      if(best.type==='hold'){try{mallet(ladder(G.song,Math.max(0,G.combo)),Math.max(getCtx().currentTime,G.T0+best.t),.6);}catch(e){}best.holding=true;best.grade=grade;text(cr,'HOLD!','#ffd166');cr.flash=1;G.alien.swing=1;return;}
      resolve(best,t,grade,1);return;
    }
    // a mine?
    const mine=G.chart.find(o=>o.c===i&&!o.done&&o.type==='decoy'&&Math.abs(t-o.t)<=.24);
    if(mine){mine.done=true;mine.res='boom';mine.resT=t;G.stats.mine++;G.combo=0;G.score=Math.max(0,G.score-500);
      burst(cr.x,cr.y,'#ff5533',26,1.6);burst(cr.x,cr.y,'#ffcc33',14,1.2);text(cr,'BOOM! −500','#ff6644');G.shake=10;try{playSound('zap',.7);}catch(e){}updHud();return;}
    // swing at nothing
    padHit();
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

  // ── the squish reward: every whack adds a punch under the beat and a mallet note from the song's key.
  // The notes climb a pentatonic ladder as your combo grows (so a streak plays a little melody), snapped onto the
  // worm's beat if you were early. Pentatonic notes can't clash with anything, so it always sounds good.
  const MV=()=>typeof masterVol!=='undefined'?masterVol:1,mtof=m=>440*Math.pow(2,(m-69)/12);
  function pent(song){const sc=WW_SCALES[song.scaleName]||WW_SCALES.minor;return sc[2]===3?[0,3,5,7,10]:[0,2,4,7,9];}
  function ladder(song,i){const p=pent(song);return song.root+24+p[((i%p.length)+p.length)%p.length]+12*Math.floor(i/p.length);}
  function voice(at,f,type,peak,dec,out){const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(peak,at+.003);g.gain.exponentialRampToValueAtTime(.0005,at+dec);o.connect(g);g.connect(out||drumMasterGain);o.start(at);o.stop(at+dec+.05);return g;}
  function mallet(midi,at,vel){const f=mtof(midi),v=vel*MV();voice(at,f,'sine',.2*v,.5);voice(at,f*4,'sine',.05*v,.08);const g=voice(at,f*2,'triangle',.035*v,.25);try{g.connect(rvbNode);}catch(e){}}
  function punch(at,vel){const c=getCtx(),v=vel*MV(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(110,at);o.frequency.exponentialRampToValueAtTime(48,at+.12);
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.55*v,at+.002);g.gain.exponentialRampToValueAtTime(.0005,at+.2);o.connect(g);g.connect(drumMasterGain);o.start(at);o.stop(at+.25);}
  function squishSound(n,special){
    if(!G)return;const c=getCtx(),at=Math.max(c.currentTime,G.T0+n.t),song=G.song;
    try{punch(at,n.boss?1:.8);const q=Math.max(0,G.combo-1)%16,i=q<9?q:16-q;   // up the ladder two octaves, back down, againmallet(ladder(song,i),at,.85);
      if(special){mallet(ladder(song,i+2),at,.5);mallet(ladder(song,i+4),at+.002,.4);}   // gold / boss / held: a full chord
    }catch(e){}
  }
  // combo milestones: a quick rising arpeggio on the next 16th, topped with a shimmering octave
  function comboSound(){
    if(!G)return;const c=getCtx(),st=G.song.step,bt=(c.currentTime-G.T0)/st,at=G.T0+Math.ceil(bt+.2)*st,song=G.song;
    try{[0,1,2,3,5].forEach((d,i)=>mallet(ladder(song,d+5),at+i*st*.5,.6+i*.06));mallet(ladder(song,10),at+2.5*st,.5);mallet(ladder(song,12),at+2.5*st,.35);}catch(e){}
  }
  function resolve(n,t,grade,credit,holdDone){
    n.done=true;n.resT=t;n.credit=credit;n.res=credit>0?'hit':'miss';G.judged++;
    const cr=G.craters[n.c];
    if(credit>0){
      G.hitVal+=credit;
      if(credit>=1){G.combo++;G.maxCombo=Math.max(G.maxCombo,G.combo);}else G.combo=0;
      G.stats[grade]=(G.stats[grade]||0)+1;
      const base=grade==='ok'?150:300;   // any hit in time scores the same: the music is the judge, not the screen
      const mult=1+Math.min(3,G.combo/15);
      let pts=base*mult*(n.type==='gold'?3:1)*(n.boss?1.5:1)*(holdDone?1.5:1)*credit;
      G.score+=Math.round(pts);
      // no PERFECT / GOOD / EARLY / LATE words: just the hit (and GOLD / HELD for the special worms)
      if(n.type==='gold'||holdDone)text(cr,(n.type==='gold'?'GOLD!':'')+(n.type==='gold'&&holdDone?' ':'')+(holdDone?'HELD!':''),n.type==='gold'?'#ffd700':'#ffd166',1.1);
      G.rings.push({x:cr.x,y:cr.y,life:1});
      squishSound(n,n.type==='gold'||n.boss||holdDone);
      // rock the screen: a zoom punch toward the crater, a quick flash, slime flying
      G.punch={x:cr.x,y:cr.y,life:1};G.pflash=Math.max(G.pflash,.6);
      {const wc=n.type==='gold'?'#ffd34d':n.boss?'#d0314f':'#d276d8';for(let k=0;k<10;k++){const a=-Math.PI*(.1+.8*Math.random()),v=180+Math.random()*220;G.fx.push({x:cr.x,y:cr.y-G.r*.3,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,col:wc,s:3+Math.random()*4,grav:1});}}
      // the BONK: a comic impact star where the hammer lands, a word inside it, dirt flying, the crater lighting up
      const pc=n.type==='gold'?'#ffd700':n.boss?'#ff4466':padColor(padOf(n.c)),special=n.type==='gold'||holdDone;
      G.pows.push({x:cr.x,y:cr.y-G.r*.6,col:pc,life:1,rot:Math.random()*.6-.3,word:special?'':WW_BONKS[(G.bonkI=(G.bonkI||0)+1+(Math.random()*2|0))%WW_BONKS.length]});
      for(let k=0;k<7;k++){const a=-Math.PI*(.15+.7*Math.random()),v=140+Math.random()*160;G.fx.push({x:cr.x,y:cr.y-G.r*.1,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,col:k%2?'#6b6a78':'#8e8c9c',s:2.5+Math.random()*3,grav:1});}
      cr.hit=1;cr.hitCol=hex6(pc);
      if(credit>=1&&G.combo>0&&G.combo%10===0){text({x:W/2,y:H*.42},'COMBO '+G.combo+'!','#e8ff00',1.5);comboSound();G.rings.push({x:W/2,y:H*.45,life:1,big:1});}
      burst(cr.x,cr.y,n.type==='gold'?'#ffd700':n.boss?'#ff4466':'#c86bd8',16);
      burst(cr.x,cr.y,'#9a9aa4',8,.8);
      G.shake=Math.max(G.shake,n.boss?12:9);cr.flash=1;if(n.boss)G.bossHitT=t;
      if(n.boss&&credit>=1){G.bossHp=Math.max(0,G.bossHp-1);if(!G.bossHp&&!G.bossDead){G.bossDead=t;G.shake=18;for(let k=0;k<5;k++)burst(W/2,H*.08,['#ff4466','#ffd166','#c86bd8'][k%3],30,2.2);text({x:W/2,y:H*.3},'WYRM DEFEATED!','#ffd166',1.6);G.score+=5000;}}
    }else{
      G.combo=0;G.stats.miss++;text(cr,'MISS','#ff5566',1.25);cr.miss=1;
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
    let sq=0,hk=0;
    if(n.done){if(n.res==='hit'){hk=(t-n.resT)/.5;if(hk>=1)return;sq=Math.min(1,hk/.07);up*=hk<.45?1:1-ease((hk-.45)/.55);}   // splat instantly, hold it, then sink
      else{const k=(t-n.resT)/.35;if(k>=1)return;up*=1-ease(k);}}
    if(up<=.02)return;
    g2.save();
    // clip to the hole so it really comes out of the crater
    g2.beginPath();g2.ellipse(c.x,c.y-r*.1,r*1.05,r*1.25,0,0,Math.PI*2);g2.clip();
    if(sq>0){const by=c.y+r*.35,wob=Math.sin(hk*46)*Math.max(0,1-hk*2.5)*.16;g2.translate(c.x,by);g2.scale(1+.55*sq+wob*1.5,1-.62*sq-wob*1.5);g2.translate(-c.x,-by);}
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
    if(hk>0&&hk<.85){g2.restore();g2.save();const sy=hy-hs*.55+r*.25,a=Math.max(0,1-Math.max(0,hk-.55)/.3);g2.globalAlpha=a;g2.fillStyle='#ffe14d';
      for(let k=0;k<3;k++){const an=t*9+k*2.09,sx=c.x+Math.cos(an)*hs*.95,sy2=sy+Math.sin(an)*hs*.28,z=hs*.17;g2.beginPath();for(let q=0;q<10;q++){const rr=q%2?z*.45:z,aa=q/10*Math.PI*2-Math.PI/2;g2.lineTo(sx+Math.cos(aa)*rr,sy2+Math.sin(aa)*rr);}g2.closePath();g2.fill();}
      g2.globalAlpha=1;}
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
  // ── the boss: an armored wyrm rising over the moon. Its body coils across the sky behind it, its jaws snap on the beat,
  // its eyes follow your alien, it flinches white when you land a hit, and its armor cracks as its health drops ──
  const BOSS_LOOK={10:{pl:['#8a3a74','#3a0f2e','#1c0616'],glow:'#ff4d8a',eye:'#ffe066',horn:['#f4e2c8','#7a5a3c']},
                   20:{pl:['#3a3456','#16122a','#08060f'],glow:'#ffb02e',eye:'#ffffff',horn:['#c8c2e6','#2a2440']},
                   30:{pl:['#a01c3a','#4a0818','#1c0208'],glow:'#ffd166',eye:'#7fffd4',horn:['#ffe9a8','#8a5a10'],crown:true}};
  function drawBoss(t,bx,by,bs,dead){
    const L=BOSS_LOOK[G.P.lvl]||BOSS_LOOK[10],bp=t>=0?Math.pow(1-(((t/G.beat)%1)+1)%1,3):0,hpF=G.bossMax?G.bossHp/G.bossMax:1;
    const hf=G.bossHitT!=null?Math.max(0,1-(t-G.bossHitT)/.2):0;by-=hf*bs*.12;
    g2.save();g2.globalAlpha=1-dead;g2.translate(bx,by);g2.rotate(Math.sin(t*1.3)*.04+dead*.4);
    // aura
    const au=g2.createRadialGradient(0,0,bs*.3,0,0,bs*2.2);au.addColorStop(0,L.glow+'55');au.addColorStop(1,L.glow+'00');g2.globalAlpha=(1-dead)*(.6+.4*bp);g2.fillStyle=au;g2.beginPath();g2.arc(0,0,bs*2.2,0,Math.PI*2);g2.fill();g2.globalAlpha=1-dead;
    // the coiling body: plated segments behind the head, shrinking with distance
    for(const sd of [-1,1])for(let i=9;i>=1;i--){const u=i/9,x=sd*(bs*.6+u*W*.62),y=-bs*.35+Math.sin(u*5.2+t*1.6+(sd>0?1.3:0))*bs*.42-u*bs*.15,r=bs*(.62-u*.34);
      const sg=g2.createRadialGradient(x-r*.3,y-r*.4,r*.1,x,y,r);sg.addColorStop(0,L.pl[0]);sg.addColorStop(.7,L.pl[1]);sg.addColorStop(1,L.pl[2]);g2.fillStyle=sg;g2.beginPath();g2.ellipse(x,y,r*1.05,r*.85,sd*.3,0,Math.PI*2);g2.fill();
      g2.strokeStyle=L.glow+'66';g2.lineWidth=Math.max(1,r*.06);g2.beginPath();g2.ellipse(x,y,r*.7,r*.5,sd*.3,Math.PI*1.1,Math.PI*1.9);g2.stroke();
      g2.fillStyle=L.pl[2];g2.beginPath();g2.moveTo(x-r*.25,y-r*.7);g2.lineTo(x+sd*r*.15,y-r*1.25);g2.lineTo(x+r*.25,y-r*.7);g2.fill();}
    // horns
    for(const sd of [-1,1]){const hg=g2.createLinearGradient(sd*bs*.6,-bs*.5,sd*bs*1.4,-bs*1.5);hg.addColorStop(0,L.horn[1]);hg.addColorStop(1,L.horn[0]);g2.fillStyle=hg;
      g2.beginPath();g2.moveTo(sd*bs*.45,-bs*.62);g2.quadraticCurveTo(sd*bs*1.5,-bs*.9,sd*bs*1.35,-bs*1.75);g2.quadraticCurveTo(sd*bs*1.2,-bs*1.05,sd*bs*.75,-bs*.38);g2.closePath();g2.fill();
      g2.strokeStyle='rgba(0,0,0,.25)';g2.lineWidth=bs*.03;for(let q=1;q<4;q++){const u=q/4;g2.beginPath();g2.moveTo(sd*bs*(.55+u*.75),-bs*(.62+u*.6));g2.lineTo(sd*bs*(.8+u*.55),-bs*(.4+u*.85));g2.stroke();}}
    // mandibles, snapping open on every beat
    const open=.18+.42*bp;
    for(const sd of [-1,1]){g2.save();g2.translate(sd*bs*.6,bs*.35);g2.rotate(sd*open);const mg=g2.createLinearGradient(0,0,0,bs*.9);mg.addColorStop(0,L.pl[1]);mg.addColorStop(1,L.horn[0]);g2.fillStyle=mg;
      g2.beginPath();g2.moveTo(-sd*bs*.05,-bs*.1);g2.quadraticCurveTo(sd*bs*.35,bs*.35,sd*bs*.05-sd*bs*.35,bs*.95);g2.quadraticCurveTo(sd*bs*.05,bs*.45,-sd*bs*.25,bs*.05);g2.closePath();g2.fill();g2.restore();}
    // the glowing maw
    const mw=g2.createRadialGradient(0,bs*.55,0,0,bs*.55,bs*.5);mw.addColorStop(0,'#ffffff');mw.addColorStop(.25,L.glow);mw.addColorStop(1,L.glow+'00');g2.fillStyle=mw;g2.globalAlpha=(1-dead)*(.5+.5*bp);g2.beginPath();g2.ellipse(0,bs*.58,bs*.42,bs*(.18+.14*bp),0,0,Math.PI*2);g2.fill();g2.globalAlpha=1-dead;
    // armored head
    const hd=[[-1.05,-.35],[-.78,-.72],[-.3,-.86],[0,-.8],[.3,-.86],[.78,-.72],[1.05,-.35],[.88,.22],[.5,.62],[0,.78],[-.5,.62],[-.88,.22]];
    const hgd=g2.createRadialGradient(-bs*.3,-bs*.45,bs*.1,0,0,bs*1.1);hgd.addColorStop(0,L.pl[0]);hgd.addColorStop(.6,L.pl[1]);hgd.addColorStop(1,L.pl[2]);
    g2.fillStyle=hgd;g2.beginPath();hd.forEach(([x,y],i)=>i?g2.lineTo(x*bs,y*bs):g2.moveTo(x*bs,y*bs));g2.closePath();g2.fill();
    g2.strokeStyle=L.glow+'aa';g2.lineWidth=Math.max(1.5,bs*.03);g2.stroke();
    // plates: brow band, snout plates, a glowing crest down the middle
    g2.fillStyle='rgba(0,0,0,.28)';g2.beginPath();g2.moveTo(-bs*.95,-bs*.3);g2.lineTo(0,-bs*.5);g2.lineTo(bs*.95,-bs*.3);g2.lineTo(bs*.8,-bs*.12);g2.lineTo(0,-bs*.28);g2.lineTo(-bs*.8,-bs*.12);g2.closePath();g2.fill();
    g2.strokeStyle='rgba(255,255,255,.12)';g2.lineWidth=bs*.025;[[.25,.35],[.45,.55]].forEach(([y1,w])=>{g2.beginPath();g2.moveTo(-bs*w,bs*y1);g2.quadraticCurveTo(0,bs*(y1+.1),bs*w,bs*y1);g2.stroke();});
    g2.fillStyle=L.glow;g2.shadowColor=L.glow;g2.shadowBlur=8+10*bp;g2.beginPath();g2.moveTo(0,-bs*.8);g2.lineTo(bs*.08,-bs*.64);g2.lineTo(0,-bs*.48);g2.lineTo(-bs*.08,-bs*.64);g2.closePath();g2.fill();g2.shadowBlur=0;   // a glowing gem in its brow
    // armor cracks as it weakens
    if(hpF<.67){g2.strokeStyle=L.glow;g2.shadowColor=L.glow;g2.shadowBlur=6;g2.lineWidth=bs*.025;
      const cracks=[[[-.7,-.5],[-.5,-.2],[-.62,.05],[-.45,.25]],[[.55,-.62],[.4,-.35],[.58,-.1]],[[-.2,.3],[0,.15],[.25,.42]],[[.85,.1],[.6,.25],[.7,.45]]];
      cracks.slice(0,hpF<.34?4:2).forEach(c=>{g2.beginPath();c.forEach(([x,y],i)=>i?g2.lineTo(x*bs,y*bs):g2.moveTo(x*bs,y*bs));g2.stroke();});g2.shadowBlur=0;}
    // eyes: angled slits whose pupils follow your alien
    const look=Math.max(-1,Math.min(1,((G.alien.x||bx)-bx)/(W*.4))),blink=(t%4.7)<.12?.15:1;
    for(const sd of [-1,1]){g2.save();g2.translate(sd*bs*.42,-bs*.1);g2.rotate(sd*.32);
      g2.fillStyle=L.eye;g2.shadowColor=L.eye;g2.shadowBlur=14+10*bp;g2.beginPath();g2.ellipse(0,0,bs*.2,bs*.085*blink,0,0,Math.PI*2);g2.fill();g2.shadowBlur=0;
      g2.fillStyle='#120008';g2.beginPath();g2.ellipse(look*bs*.08,0,bs*.03,bs*.07*blink,0,0,Math.PI*2);g2.fill();g2.restore();}
    // teeth along the jaw
    g2.fillStyle=L.horn[0];for(let q=-3;q<=3;q++){const x=q*bs*.1,y=bs*(.6-Math.abs(q)*.03);g2.beginPath();g2.moveTo(x-bs*.035,y);g2.lineTo(x,y+bs*(.1+.05*bp));g2.lineTo(x+bs*.035,y);g2.fill();}
    // the Wyrm King's crown
    if(L.crown){g2.fillStyle='#ffd166';g2.strokeStyle='#8a5a10';g2.lineWidth=bs*.02;g2.beginPath();g2.moveTo(-bs*.5,-bs*.78);[[-.42,-1.15],[-.25,-.88],[0,-1.3],[.25,-.88],[.42,-1.15],[.5,-.78]].forEach(([x,y])=>g2.lineTo(x*bs,y*bs));g2.lineTo(0,-bs*.84);g2.closePath();g2.fill();g2.stroke();
      [[-.42,-1.1],[0,-1.22],[.42,-1.1]].forEach(([x,y],i)=>{g2.fillStyle=i===1?'#7fffd4':'#ff4466';g2.shadowColor=g2.fillStyle;g2.shadowBlur=8;g2.beginPath();g2.arc(x*bs,y*bs,bs*.045,0,Math.PI*2);g2.fill();g2.shadowBlur=0;});}
    // flinch: a white flash over the head when you land a hit
    if(hf>0){g2.globalAlpha=(1-dead)*hf*.65;g2.fillStyle='#ffffff';g2.beginPath();hd.forEach(([x,y],i)=>i?g2.lineTo(x*bs,y*bs):g2.moveTo(x*bs,y*bs));g2.closePath();g2.fill();}
    g2.restore();
  }
  let g2=ctx2;
  function draw(t,dt){
    makeBg();
    const sh=G.shake;G.shake*=Math.pow(.0015,dt);
    g2.setTransform(DPR,0,0,DPR,0,0);g2.clearRect(0,0,W,H);
    g2.save();if(sh>.3)g2.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
    if(G.punch&&G.punch.life>0){const pk=Math.pow(G.punch.life,2),z=1+.045*pk;g2.translate(G.punch.x,G.punch.y);g2.scale(z,z);g2.translate(-G.punch.x,-G.punch.y);G.punch.life-=dt*5;}
    g2.drawImage(bg,0,0,W,H);
    // crater flashes + approach rings + key labels
    const bp=t>=0?Math.pow(1-(((t/G.beat)%1)+1)%1,4):0;
    G.craters.forEach((c,i)=>{
      if(bp>.02){g2.strokeStyle=padColor(padOf(i));g2.globalAlpha=.12+.4*bp;g2.lineWidth=2+2*bp;g2.beginPath();g2.ellipse(c.x,c.y,G.r*1.3,G.r*1.2,0,0,Math.PI*2);g2.stroke();g2.globalAlpha=1;}
      if(c.flash>0){g2.strokeStyle=`rgba(255,255,255,${c.flash*.7})`;g2.lineWidth=3;g2.beginPath();g2.ellipse(c.x,c.y,G.r*(1.3+(1-c.flash)*.4),G.r*(1.2+(1-c.flash)*.4),0,0,Math.PI*2);g2.stroke();c.flash=Math.max(0,c.flash-dt*4);}
      if(c.hit>0){const k=c.hit,hg=g2.createRadialGradient(c.x,c.y,0,c.x,c.y,G.r*1.6);hg.addColorStop(0,c.hitCol+'cc');hg.addColorStop(1,c.hitCol+'00');g2.globalAlpha=k;g2.fillStyle=hg;g2.beginPath();g2.ellipse(c.x,c.y,G.r*1.6,G.r*1.45,0,0,Math.PI*2);g2.fill();
        g2.strokeStyle=c.hitCol;g2.lineWidth=4*k;g2.beginPath();g2.ellipse(c.x,c.y,G.r*(1.3+(1-k)*.6),G.r*(1.2+(1-k)*.6),0,0,Math.PI*2);g2.stroke();g2.globalAlpha=1;c.hit=Math.max(0,c.hit-dt*2.2);}
      if(c.miss>0){g2.strokeStyle=`rgba(255,70,90,${c.miss*.8})`;g2.lineWidth=3;g2.beginPath();g2.ellipse(c.x,c.y,G.r*1.3,G.r*1.2,0,0,Math.PI*2);g2.stroke();c.miss=Math.max(0,c.miss-dt*2.5);}
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
      const bs=Math.min(W*.18,H*.15),bx=W/2,by=-bs*1.6+(bs*2.75)*ease(k)-dead*H*.2;
      if(dead<1){drawBoss(t,bx,by,bs,dead);
        // HP bar
        const bw=Math.min(W*.6,420),bxx=W/2-bw/2,byy=6;g2.fillStyle='rgba(0,0,0,.55)';g2.fillRect(bxx,byy,bw,12);
        g2.fillStyle='#ff4466';g2.fillRect(bxx,byy,bw*(G.bossHp/G.bossMax),12);g2.strokeStyle='#ffd166';g2.lineWidth=1;g2.strokeRect(bxx,byy,bw,12);
        g2.font="12px 'Bebas Neue',sans-serif";g2.textAlign='center';g2.textBaseline='middle';g2.strokeStyle='rgba(0,0,0,.8)';g2.lineWidth=3;const bn=G.P.lvl===30?'THE WYRM KING':G.P.lvl===20?'THE ECLIPSE WYRM':'THE MOON WYRM';g2.strokeText(bn,W/2,byy+6.5);g2.fillStyle='#ffd166';g2.fillText(bn,W/2,byy+6.5);g2.textBaseline='alphabetic';
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
    G.fx.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.grav){p.vy+=900*dt;p.vx*=.98;}else{p.vx*=.92;p.vy*=.92;}g2.globalAlpha=Math.max(0,p.life);g2.fillStyle=p.col;g2.beginPath();g2.arc(p.x,p.y,p.s,0,Math.PI*2);g2.fill();});
    g2.globalAlpha=1;
    // impact stars: pop big fast, then shrink away
    G.pows=G.pows.filter(p=>(p.life-=dt*2.6)>0);
    G.pows.forEach(p=>{const age=1-p.life,sc=(age<.2?.6+2.6*age:1.12-.3*(age-.2))*G.r*1.05;g2.save();g2.translate(p.x,p.y);g2.rotate(p.rot);g2.globalAlpha=Math.min(1,p.life*2.2);
      const star=(R2,inn)=>{g2.beginPath();for(let q=0;q<16;q++){const rr=q%2?R2*inn:R2*(q%4?1:.82),aa=q/16*Math.PI*2;g2.lineTo(Math.cos(aa)*rr*1.15,Math.sin(aa)*rr*.95);}g2.closePath();};
      g2.fillStyle=p.col;g2.shadowColor=p.col;g2.shadowBlur=18;star(sc,.55);g2.fill();g2.shadowBlur=0;
      g2.fillStyle='#fff';star(sc*.62,.6);g2.fill();
      if(p.word){g2.fillStyle='#14102a';g2.font=`${Math.round(sc*.46)}px 'Bebas Neue',sans-serif`;g2.textAlign='center';g2.textBaseline='middle';g2.fillText(p.word,0,sc*.03);g2.textBaseline='alphabetic';}
      g2.restore();});
    // floating text
    G.texts=G.texts.filter(x=>(x.life-=dt*1.2)>0);
    G.texts.forEach(x=>{g2.globalAlpha=Math.min(1,x.life*1.6);g2.fillStyle=x.col;g2.font=`${Math.round(Math.max(14,G.r*.42)*x.sz)}px 'Bebas Neue',sans-serif`;g2.textAlign='center';g2.strokeStyle='rgba(0,0,0,.6)';g2.lineWidth=3;
      const y=x.y-(1-x.life)*24;g2.strokeText(x.txt,x.x,y);g2.fillText(x.txt,x.x,y);});
    g2.globalAlpha=1;
    // hit rings and a soft flash
    G.rings=G.rings.filter(r=>(r.life-=dt*2.4)>0);
    G.rings.forEach(r=>{const rr=(r.big?Math.min(W,H)*.35:G.r*2.2)*(1-r.life*.7);g2.strokeStyle=`rgba(255,255,255,${r.life*.8})`;g2.lineWidth=r.big?4:3;g2.beginPath();g2.ellipse(r.x,r.y,rr,rr*.92,0,0,Math.PI*2);g2.stroke();});
    if(G.pflash>0){g2.fillStyle=`rgba(255,255,255,${G.pflash*.13})`;g2.fillRect(0,0,W,H);G.pflash=Math.max(0,G.pflash-dt*4);}
    // count-in
    if(t<0){const beatsLeft=Math.ceil(-t/G.beat);g2.fillStyle='rgba(0,0,0,.35)';g2.fillRect(0,0,W,H);g2.fillStyle='#fff';g2.font=`${Math.round(Math.min(W,H)*.22)}px 'Bebas Neue',sans-serif`;g2.textAlign='center';g2.textBaseline='middle';g2.fillText(beatsLeft>3?'READY':String(beatsLeft),W/2,H/2);g2.textBaseline='alphabetic';}
    else if(t<G.beat*1.2){g2.fillStyle=`rgba(255,255,255,${1-t/(G.beat*1.2)})`;g2.font=`${Math.round(Math.min(W,H)*.18)}px 'Bebas Neue',sans-serif`;g2.textAlign='center';g2.textBaseline='middle';g2.fillText('WHACK!',W/2,H/2);g2.textBaseline='alphabetic';}
    g2.restore();
  }

  // ── results ──
  function finish(){
    if(!G||G.state!=='play')return;
    G.state='done';clearInterval(G.sched);cancelAnimationFrame(G.raf);
    const acc=G.total?G.hitVal/G.total:1,stars=wwStarsFor(acc),custom=G.song.custom,L=custom?0:G.P.lvl;
    const store=custom?(wormProgress.custom||(wormProgress.custom={})):wormProgress.best,K=custom?G.P.custom:L;
    const prev=store[K],first=!custom&&stars>=1&&!(prev&&prev.stars>=1);
    if(!prev||acc>prev.acc||G.score>prev.score)store[K]={stars:Math.max(stars,prev?prev.stars:0),acc:Math.max(acc,prev?prev.acc:0),score:Math.max(G.score,prev?prev.score:0)};
    if(first){wormMultiplier*=G.P.reward;try{playSfxTierUnlock&&playSfxTierUnlock(3);}catch(e){}}
    if(typeof autoSave==='function')autoSave();
    if(typeof renderUI==='function')renderUI();
    const s=G.stats,pass=stars>=1;
    $('wwResInner').innerHTML=`
      <div class="ww-big ${pass?'win':'lose'}">${pass?(G.bossMax&&!G.bossHp?'BOSS DOWN!':'LEVEL CLEAR!'):'SO CLOSE!'}</div>
      <div class="ww-d-name">${custom?G.P.name+' · '+G.P.diff:L+'. '+G.P.name}</div>
      <div class="ww-stars">${[1,2,3].map(k=>`<span class="${k<=stars?'on':''}">★</span>`).join('')}</div>
      <div class="ww-res-acc">${Math.round(acc*100)}%<small>${custom?'worms whacked · your beat':pass?'worms whacked':'need 70% to clear'}</small></div>
      <div class="ww-res-grid">
        <div><b>${G.score.toLocaleString()}</b><small>SCORE</small></div><div><b>${G.maxCombo}</b><small>BEST COMBO</small></div>
        <div><b>${(s.perfect||0)+(s.good||0)+(s.ok||0)}</b><small>WHACKED</small></div><div><b style="color:#ff5566">${s.miss||0}</b><small>MISSED</small></div>
        ${s.mine?`<div><b style="color:#ff6644">${s.mine}</b><small>MINES HIT</small></div>`:''}
      </div>
      ${first?`<div class="ww-reward">Permanent bonus: ×${G.P.reward} points!${L<30?' · Level '+(L+1)+' unlocked':''}</div>`:''}
      <div class="ww-res-btns">
        <button class="ww-btn" id="wwRetry">RETRY</button>
        ${!custom&&pass&&L<30?'<button class="ww-btn ww-play" id="wwNext">NEXT LEVEL</button>':''}
        <button class="ww-btn" id="wwLevels">LEVELS</button>
      </div>`;
    $('wwResults').classList.add('open');
    const again=G.song;$('wwRetry').addEventListener('click',()=>start(custom?again:L));
    const nx=$('wwNext');if(nx)nx.addEventListener('click',()=>{selLvl=L+1;start(L+1);});
    $('wwLevels').addEventListener('click',()=>{if(!custom)selLvl=pass&&L<30?L+1:L;G=null;showSelect();});
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
