// ══════════════════════════════════════════════
//  BEAT DEFENSE — tower defense where your defense IS your beat
//  Your ship sits in the middle. The ground around it is cut into 16 slices, like a clock: one slice per 16th note.
//  A radar sweep goes round once per bar, and every tower fires when the sweep passes its slice — so WHERE you build
//  decides WHEN it plays. Kick towers are heavy cannons, snares blast everything around them, hi-hats fire twice a bar,
//  claps slow enemies down. Lizards and scorpions from Planet Hop march in from the edges and try to reach the ship.
//  Clear a level: +0.5× Alien Gems. Clear it without the ship taking a hit: +1× in total.
// ══════════════════════════════════════════════
(function(){
  const $=id=>document.getElementById(id);
  const LEVELS=10,BD_NAMES=['First Contact','Two Lanes','Snare Season','Night Shift','Scorpion King','Rush Hour','Crossfire','Clap Back','Swarm','The Big Sting'];
  // tower kinds: sound, cost, what it does. "on" = which slices (relative to its own) it fires on
  const TW={
    hat:  {name:'HI-HAT',snd:'hihat',col:'#44ffcc',cost:25,on:[0,8],dmg:1,  range:.46,from:1,desc:'2 shots a bar'},
    kick: {name:'KICK',  snd:'kick', col:'#ff6644',cost:45,on:[0],  dmg:4.5,range:.40,from:1,desc:'heavy cannon'},
    snare:{name:'SNARE', snd:'snare',col:'#ffcc44',cost:60,on:[0],  dmg:2,  range:.26,from:2,desc:'blasts all near it',aoe:true},
    clap: {name:'CLAP',  snd:'clap', col:'#ffee88',cost:40,on:[0],  dmg:.5, range:.30,from:4,desc:'slows enemies',aoe:true,slow:true},
  };
  const EN={liz:{hp:3,sp:.085,dmg:1,gold:6,r:.035},run:{hp:2,sp:.15,dmg:1,gold:5,r:.028},scorp:{hp:9,sp:.055,dmg:1,gold:12,r:.045},boss:{hp:70,sp:.032,dmg:5,gold:60,r:.09}};
  const RING=[.4,.64],SHIP=.12,SHIP_HP=10;

  // ── overlay ──
  const ov=document.createElement('div');ov.id='bdOverlay';ov.className='ww-like';
  ov.innerHTML=`
    <div class="ww-hud">
      <button class="ww-x" id="bdQuit" title="Back">✕</button>
      <div class="ww-title" id="bdTitle" style="color:#d9a6ff">BEAT DEFENSE</div>
      <div class="ww-stat"><span id="bdWave">1/4</span><small>WAVE</small></div>
      <div class="ww-stat"><span id="bdHp">10</span><small>SHIP</small></div>
      <div class="ww-stat"><span id="bdGold">100</span><small>⚡ ENERGY</small></div>
    </div>
    <div class="ww-arena"><canvas id="bdCanvas"></canvas></div>
    <div class="bd-bar" id="bdBar"></div>
    <div class="ww-panel" id="bdSelect"><div class="ww-panel-inner" style="box-shadow:0 0 40px -10px #b04dff">
      <div class="ww-sel-head"><div><div class="ww-big" style="color:#d9a6ff">BEAT DEFENSE</div><div class="ww-sub">Build drum towers around your ship · the radar sweeps once per bar and each tower fires when it passes · where you build is the beat you play</div></div><div style="display:flex;gap:6px"><button class="ww-x" id="bdClose" title="Close">✕</button></div></div>
      <div class="ww-sel-bonus" id="bdBonus"></div>
      <div class="ww-grid" id="bdGrid"></div>
      <div class="ww-detail" id="bdDetail"></div>
    </div></div>
    <div class="ww-panel" id="bdResults"><div class="ww-panel-inner ww-res" id="bdResInner" style="box-shadow:0 0 40px -10px #b04dff"></div></div>`;
  document.body.appendChild(ov);
  const cv=$('bdCanvas'),g=cv.getContext('2d');
  let W=0,H=0,DPR=1,CX=0,CY=0,RF=100,sel=1,G=null,bg=null,bgKey='';

  function open(){ov.classList.add('open');document.body.classList.add('ww-open');
    if(typeof seqPlaying!=='undefined'&&seqPlaying&&typeof stopSeq==='function')stopSeq();
    let l=1;for(let i=1;i<=LEVELS;i++)if(lvOpen(i))l=i;sel=l;showSelect();}
  function close(){stop();ov.classList.remove('open');document.body.classList.remove('ww-open');if(typeof autoSave==='function')autoSave();}
  $('bdClose').addEventListener('click',close);
  $('bdQuit').addEventListener('click',()=>{if(G&&G.state==='play'){stop();showSelect();}else close();});
  function lvOpen(L){return (typeof TEST_MODE!=='undefined'&&TEST_MODE)||L===1||!!(bdProgress.best[L-1]||{}).cleared;}
  const gemVal=b=>b&&b.cleared?(b.flawless?1:.5):0;
  function showSelect(){
    $('bdResults').classList.remove('open');$('bdSelect').classList.add('open');
    const gb=Object.values(bdProgress.best).reduce((a,b)=>a+gemVal(b),0);
    $('bdBonus').innerHTML=`Beat Defense gem bonus: <b>+${gb}×</b> Alien Gems`;
    const gr=$('bdGrid');gr.innerHTML='';
    for(let L=1;L<=LEVELS;L++){const b=document.createElement('button');b.className='ww-tile';const best=bdProgress.best[L]||{},op=lvOpen(L);
      if(!op)b.classList.add('locked');if(L===sel)b.classList.add('sel');if(L%5===0)b.classList.add('boss');
      b.innerHTML=`<span class="n">${op?L:'🔒'}</span><span class="st">${best.cleared?(best.flawless?'🛡️':'✔'):'<i>·</i>'}</span>`;
      b.addEventListener('click',()=>{if(!op){showToast('Clear level '+(L-1)+' first');return;}sel=L;showSelect();});gr.appendChild(b);}
    const best=bdProgress.best[sel]||{},P=level(sel);
    $('bdDetail').innerHTML=`<div class="ww-d-name">${sel}. ${P.name}</div>
      <div class="ww-d-meta">${P.bpm} BPM · ${P.waves.length} WAVES${P.boss?' · BOSS':''} · towers: ${Object.keys(TW).filter(k=>TW[k].from<=sel).map(k=>TW[k].name).join(', ')}</div>
      <div class="ww-d-meta">${best.cleared?(best.flawless?'Cleared without a scratch 🛡️':'Cleared · clear it without the ship getting hit for +1×'):'Clear it: <b>+0.5×</b> Alien Gems · no damage: <b>+1×</b>'}</div>
      <button class="ww-play" id="bdPlay" style="border-color:#d9a6ff;color:#d9a6ff;background:#10061a">PLAY</button>`;
    $('bdPlay').addEventListener('click',()=>start(sel));
  }

  // ── levels: waves of enemies down 1–3 lanes, spawning on the beat ──
  function level(L){
    const R=wwRng(4242+L*97),P={L,name:BD_NAMES[L-1],bpm:96+L*4,boss:L%5===0,waves:[],gold:110+L*10};
    const n=4+Math.floor(L/2);
    for(let w=0;w<n;w++){
      const lanes=[];const nl=Math.min(3,1+Math.floor((w+L)/4));
      while(lanes.length<nl){const a=(Math.floor(R()*16)+.5);if(!lanes.some(x=>Math.abs(x-a)<3))lanes.push(a);}
      const cnt=4+w*2+L,list=[];
      for(let i=0;i<cnt;i++){const r=R();list.push(r<Math.min(.45,.08*L+.04*w)?'scorp':(L>=3&&r>.82)?'run':'liz');}
      if(P.boss&&w===n-1)list.push('boss');
      P.waves.push({lanes,list,gap:Math.max(1,2-Math.floor((w+L)/6))});   // beats between spawns
    }
    return P;
  }

  // ── layout ──
  function resize(){const a=cv.parentElement.getBoundingClientRect();DPR=Math.min(2,devicePixelRatio||1);W=Math.max(10,a.width);H=Math.max(10,a.height);
    cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';CX=W/2;CY=H/2;RF=Math.min(W*.44,H*.46);bgKey='';}
  addEventListener('resize',()=>{if(ov.classList.contains('open')&&G)resize();});
  const sAng=s=>-Math.PI/2+s*Math.PI/8;            // slice s sits on the sweep line at the 16th it fires
  const sock=(ring,s)=>[CX+Math.cos(sAng(s))*RING[ring]*RF,CY+Math.sin(sAng(s))*RING[ring]*RF];

  // ── bottom bar: tower picker + wave button ──
  function buildBar(){
    const bar=$('bdBar');bar.innerHTML='';
    Object.entries(TW).forEach(([k,t])=>{if(t.from>G.P.L&&!(typeof TEST_MODE!=='undefined'&&TEST_MODE&&false))return;
      const b=document.createElement('button');b.className='bd-tw'+(G.pick===k?' sel':'');b.style.setProperty('--c',t.col);
      b.innerHTML=`<b>${t.name}</b><small>⚡${t.cost} · ${t.desc}</small>`;
      b.addEventListener('pointerdown',e=>{e.preventDefault();G.pick=k;try{playSound(t.snd,.5);}catch(err){}buildBar();});bar.appendChild(b);});
    const go=document.createElement('button');go.className='bd-go';go.id='bdGo';
    go.textContent=G.wave<0?'START ▶':G.spawning||G.enemies.length?'WAVE '+(G.wave+1):G.wave+1<G.P.waves.length?'NEXT WAVE ▶':'…';
    go.disabled=G.wave>=0&&(G.spawning||G.enemies.length>0||G.wave+1>=G.P.waves.length);
    go.addEventListener('pointerdown',e=>{e.preventDefault();nextWave();});bar.appendChild(go);
  }

  // ── run ──
  function start(L){
    stop();$('bdSelect').classList.remove('open');$('bdResults').classList.remove('open');
    const P=level(L),c=getCtx();
    G={state:'play',P,beat:60/P.bpm,towers:{},enemies:[],fx:[],shots:[],texts:[],gold:P.gold,hp:SHIP_HP,wave:-1,spawning:false,spawnQ:[],
       pick:'hat',armed:null,nextStep:0,fires:[],shake:0,hurt:0,kills:0};
    G.step=G.beat/4;G.T0=c.currentTime+.3;
    $('bdTitle').textContent=L+'. '+P.name;resize();buildBar();hud();
    G.sched=setInterval(schedule,25);schedule();G.raf=requestAnimationFrame(frame);
  }
  function stop(){if(!G)return;clearInterval(G.sched);cancelAnimationFrame(G.raf);G.state='stopped';G=null;}
  function lat(){const c=getCtx();return(c.outputLatency||0)+(c.baseLatency||0)*.5;}
  const now=()=>getCtx().currentTime-lat()-(typeof mgOffset==='function'?mgOffset():0);
  function hud(){if(!G)return;$('bdWave').textContent=Math.max(0,G.wave+1)+'/'+G.P.waves.length;$('bdHp').textContent=G.hp;$('bdGold').textContent=Math.floor(G.gold);}
  function nextWave(){
    if(!G||G.state!=='play')return;
    if(G.wave>=0&&(G.spawning||G.enemies.length))return;
    if(G.wave+1>=G.P.waves.length)return;
    G.wave++;const w=G.P.waves[G.wave];G.spawning=true;
    // first enemy on the next bar's downbeat, then one every `gap` beats, on the beat
    const c=getCtx(),bar=G.step*16,t0=G.T0+Math.ceil((c.currentTime-G.T0)/bar+.01)*bar;
    G.spawnQ=w.list.map((k,i)=>({k,t:t0+i*w.gap*G.beat,lane:w.lanes[i%w.lanes.length]}));
    G.lanes=w.lanes;hud();buildBar();
  }
  // the music: towers fire on their slice; under them a soft pulse so an empty board still grooves
  function schedule(){
    if(!G||G.state!=='play')return;
    const c=getCtx(),ahead=c.currentTime+.12;
    while(G.T0+G.nextStep*G.step<ahead){
      const n=G.nextStep++,at=Math.max(c.currentTime,G.T0+n*G.step),s=n%16,bar=Math.floor(n/16);
      try{if(s===0)playSound('sub',.45,at);if(s%4===2)playSound('shaker',.16*(typeof wwGroove==='function'?wwGroove('shaker',s,bar,Math.random):1),at);}catch(e){}
      Object.values(G.towers).forEach(tw=>{const T=TW[tw.k];if(!T.on.some(o=>(tw.s+o)%16===s))return;
        const v=tw.k==='hat'?.55*(typeof wwGroove==='function'?wwGroove('hihat',s,bar,Math.random):1):tw.k==='kick'?.9:.75;
        try{playSound(T.snd,v,at);}catch(e){}G.fires.push({tw,t:at});});
    }
  }
  // ── input: tap a socket to build, tap a tower twice to sell ──
  cv.addEventListener('pointerdown',e=>{
    if(!G||G.state!=='play')return;e.preventDefault();
    const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    let best=null,bd=RF*.13;
    for(let ring=0;ring<2;ring++)for(let s=0;s<16;s++){const [sx,sy]=sock(ring,s),d=Math.hypot(sx-x,sy-y);if(d<bd){bd=d;best={ring,s,id:ring*16+s};}}
    if(!best)return;
    const tw=G.towers[best.id];
    if(tw){
      if(G.armed&&G.armed.id===best.id&&performance.now()-G.armed.t<1800){const ref=Math.round(TW[tw.k].cost*.6);G.gold+=ref;delete G.towers[best.id];G.armed=null;
        G.texts.push({x:sock(best.ring,best.s)[0],y:sock(best.ring,best.s)[1],txt:'+'+ref+'⚡',col:'#9fffd8',life:1});try{playSfxTap&&playSfxTap(1);}catch(err){}hud();return;}
      G.armed={id:best.id,t:performance.now()};return;
    }
    const T=TW[G.pick];
    if(G.gold<T.cost){G.texts.push({x,y,txt:'need ⚡'+T.cost,col:'#ff8888',life:1});return;}
    G.gold-=T.cost;G.towers[best.id]={k:G.pick,ring:best.ring,s:best.s,id:best.id,flash:0,born:performance.now()};G.armed=null;
    try{playSound(T.snd,.6);}catch(err){}hud();
  });

  // ── frame ──
  function frame(){
    if(!G)return;G.raf=requestAnimationFrame(frame);
    const t=now(),pn=performance.now(),dt=Math.min(.05,(pn-(G.lp||pn))/1000);G.lp=pn;
    if(G.state==='play'){
      // spawns
      while(G.spawnQ.length&&G.spawnQ[0].t<=t){const q=G.spawnQ.shift(),E=EN[q.k],hpm=1+(G.P.L-1)*.12+G.wave*.05;
        G.enemies.push({k:q.k,a:-Math.PI/2+q.lane*Math.PI/8+(Math.random()-.5)*.12,r:1.06,hp:E.hp*hpm,max:E.hp*hpm,slow:0,ph:Math.random()*6,hit:0});}
      if(G.spawning&&!G.spawnQ.length){G.spawning=false;buildBar();}
      // movement (speed in field-radii per beat)
      G.enemies.forEach(en=>{const E=EN[en.k],sl=en.slow>t?.45:1;en.r-=E.sp*sl*dt/G.beat;en.ph+=dt*(sl<1?5:10);
        if(en.r<=SHIP+E.r){en.dead=true;en.reached=true;G.hp=Math.max(0,G.hp-E.dmg);G.hurt=1;G.shake=10;try{playSound('zap',.6);}catch(e){}hud();}});
      // towers firing (exactly when their note sounds)
      while(G.fires.length&&G.fires[0].t<=t){const f=G.fires.shift(),tw=f.tw;if(!G.towers[tw.id])continue;fire(tw);}
      G.enemies.forEach(en=>{if(!en.dead&&en.hp<=0){en.dead=true;const E=EN[en.k];G.gold+=E.gold;G.kills++;const [x,y]=epos(en);burst(x,y,en.k==='scorp'||en.k==='boss'?'#8cc9ea':'#a99fd8',en.k==='boss'?40:12);
        G.texts.push({x,y,txt:'+'+E.gold+'⚡',col:'#ffe680',life:1});if(en.k==='boss'){G.shake=16;try{playSound('spaceperc',.6);}catch(e){}}hud();}});
      const was=G.enemies.length;G.enemies=G.enemies.filter(e=>!e.dead);if(was&&!G.enemies.length&&!G.spawning)buildBar();
      if(G.hp<=0)end(false);
      else if(G.wave===G.P.waves.length-1&&!G.spawning&&!G.enemies.length&&!G.spawnQ.length)end(true);
    }
    draw(t,dt);
  }
  const epos=en=>[CX+Math.cos(en.a)*en.r*RF,CY+Math.sin(en.a)*en.r*RF];
  function fire(tw){
    const T=TW[tw.k],[tx,ty]=sock(tw.ring,tw.s),rng=T.range*RF;tw.flash=1;
    const inR=G.enemies.filter(en=>!en.dead&&Math.hypot(epos(en)[0]-tx,epos(en)[1]-ty)<=rng);
    if(T.aoe){G.shots.push({k:tw.k,x:tx,y:ty,r:rng,life:1,col:T.col});
      inR.forEach(en=>{en.hp-=T.dmg;en.hit=1;if(T.slow)en.slow=now()+G.beat*1.5;});return;}
    if(!inR.length)return;
    const tg=inR.sort((a,b)=>a.r-b.r)[0];tg.hp-=T.dmg;tg.hit=1;const [ex,ey]=epos(tg);   // the enemy closest to the ship
    G.shots.push({k:tw.k,x:tx,y:ty,ex,ey,life:1,col:T.col});
  }
  function burst(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=40+Math.random()*120;G.fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,col,s:1.5+Math.random()*2.5});}}
  function end(won){
    G.state='done';clearInterval(G.sched);
    const L=G.P.L,flawless=won&&G.hp===SHIP_HP,prev=bdProgress.best[L]||{},nb={cleared:!!(prev.cleared||won),flawless:!!(prev.flawless||flawless)};
    const gain=gemVal(nb)-gemVal(prev);bdProgress.best[L]=nb;
    if(typeof autoSave==='function')autoSave();if(typeof renderUI==='function')renderUI();
    if(won)try{playSfxTierUnlock&&playSfxTierUnlock(4);}catch(e){}
    setTimeout(()=>{if(!G)return;
      $('bdResInner').innerHTML=`<div class="ww-big ${won?'win':'lose'}">${won?(flawless?'FLAWLESS!':'SHIP SAVED!'):'SHIP DOWN!'}</div>
        <div class="ww-d-name">${L}. ${G.P.name}</div>
        <div class="ww-res-grid"><div><b>${G.kills}</b><small>DEFEATED</small></div><div><b>${G.hp}/${SHIP_HP}</b><small>SHIP</small></div><div><b>${Object.keys(G.towers).length}</b><small>TOWERS</small></div></div>
        ${gain>0?`<div class="ww-reward">💎 +${gain}× Alien Gems forever!${won&&L<LEVELS?' · Level '+(L+1)+' unlocked':''}</div>`:''}
        <div class="ww-res-btns"><button class="ww-btn" id="bdRetry">RETRY</button>${won&&L<LEVELS?'<button class="ww-btn ww-play" id="bdNext">NEXT LEVEL</button>':''}<button class="ww-btn" id="bdLevels">LEVELS</button></div>`;
      $('bdResults').classList.add('open');
      $('bdRetry').addEventListener('click',()=>start(L));const nx=$('bdNext');if(nx)nx.addEventListener('click',()=>{sel=L+1;start(L+1);});
      $('bdLevels').addEventListener('click',()=>{sel=won&&L<LEVELS?L+1:L;stop();showSelect();});},900);
  }

  // ── drawing ──
  function makeBg(){
    const key=W+'x'+H;if(bg&&bgKey===key)return;bgKey=key;bg=document.createElement('canvas');bg.width=cv.width;bg.height=cv.height;const b=bg.getContext('2d');b.scale(DPR,DPR);
    const sg=b.createRadialGradient(CX,CY,0,CX,CY,Math.max(W,H)*.7);sg.addColorStop(0,'#140c26');sg.addColorStop(1,'#04030a');b.fillStyle=sg;b.fillRect(0,0,W,H);
    const R=wwRng(77);for(let i=0;i<W*H/1800;i++){b.fillStyle=`rgba(255,255,255,${.2+R()*.6})`;b.fillRect(R()*W,R()*H,1,1);}
    // the ground: a round mesa of moon rock with craters
    const gg=b.createRadialGradient(CX-RF*.2,CY-RF*.25,RF*.1,CX,CY,RF);gg.addColorStop(0,'#3a3456');gg.addColorStop(.85,'#211c36');gg.addColorStop(1,'#120e20');
    b.fillStyle=gg;b.beginPath();b.arc(CX,CY,RF,0,Math.PI*2);b.fill();b.strokeStyle='rgba(185,168,255,.35)';b.lineWidth=2;b.stroke();
    for(let i=0;i<22;i++){const a=R()*Math.PI*2,d=Math.sqrt(R())*RF*.92,r=4+R()*R()*RF*.08,x=CX+Math.cos(a)*d,y=CY+Math.sin(a)*d;b.fillStyle='rgba(0,0,0,.2)';b.beginPath();b.ellipse(x,y,r,r*.85,0,0,Math.PI*2);b.fill();b.strokeStyle='rgba(255,255,255,.07)';b.lineWidth=1;b.beginPath();b.arc(x-r*.1,y-r*.1,r,Math.PI,Math.PI*1.8);b.stroke();}
    // 16 slices (beats brighter) and the two build rings
    for(let s=0;s<16;s++){const a=sAng(s),beat=s%4===0;b.strokeStyle=beat?'rgba(217,166,255,.22)':'rgba(217,166,255,.08)';b.lineWidth=beat?1.5:1;b.beginPath();b.moveTo(CX+Math.cos(a)*SHIP*RF*1.3,CY+Math.sin(a)*SHIP*RF*1.3);b.lineTo(CX+Math.cos(a)*RF,CY+Math.sin(a)*RF);b.stroke();
      if(beat){b.fillStyle='rgba(217,166,255,.55)';b.font=`${Math.round(Math.max(13,RF*.07))}px 'Bebas Neue',sans-serif`;b.textAlign='center';b.textBaseline='middle';b.fillText(String(s/4+1),CX+Math.cos(a)*RF*1.07,CY+Math.sin(a)*RF*1.07);}}
    RING.forEach(rr=>{b.strokeStyle='rgba(217,166,255,.1)';b.setLineDash([3,6]);b.beginPath();b.arc(CX,CY,rr*RF,0,Math.PI*2);b.stroke();b.setLineDash([]);});
  }
  function draw(t,dt){
    makeBg();g.setTransform(DPR,0,0,DPR,0,0);const sh=G.shake;G.shake*=Math.pow(.003,dt);
    g.save();if(sh>.3)g.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);g.drawImage(bg,0,0,W,H);
    const pos=Math.max(0,(t-(G.T0-0))/G.step),s16=pos%16,cur=Math.floor(s16),bp=Math.pow(1-(pos/4%1),3);
    // lane warnings at the edge for the current wave
    (G.state==='play'&&(G.spawning||G.spawnQ.length)?G.lanes||[]:[]).forEach(l=>{const a=-Math.PI/2+l*Math.PI/8,x=CX+Math.cos(a)*RF,y=CY+Math.sin(a)*RF,lg=g.createRadialGradient(x,y,0,x,y,RF*.18);lg.addColorStop(0,`rgba(255,80,110,${.35+.25*bp})`);lg.addColorStop(1,'rgba(255,80,110,0)');g.fillStyle=lg;g.beginPath();g.arc(x,y,RF*.18,0,Math.PI*2);g.fill();});
    // radar sweep with a fading trail
    const sa=-Math.PI/2+s16*Math.PI/8;
    for(let k=0;k<10;k++){const a0=sa-k*.06,a1=sa-(k+1)*.06;g.fillStyle=`rgba(159,255,216,${.1*(1-k/10)})`;g.beginPath();g.moveTo(CX,CY);g.arc(CX,CY,RF,a1,a0);g.closePath();g.fill();}
    g.strokeStyle='rgba(159,255,216,.75)';g.lineWidth=2;g.beginPath();g.moveTo(CX,CY);g.lineTo(CX+Math.cos(sa)*RF,CY+Math.sin(sa)*RF);g.stroke();
    // sockets + towers
    for(let ring=0;ring<2;ring++)for(let s=0;s<16;s++){const id=ring*16+s,tw=G.towers[id],[x,y]=sock(ring,s);
      if(!tw){const lit=s===cur;g.strokeStyle=lit?'rgba(159,255,216,.8)':s%4===0?'rgba(217,166,255,.45)':'rgba(217,166,255,.22)';g.lineWidth=1.5;g.beginPath();g.arc(x,y,RF*.035,0,Math.PI*2);g.stroke();continue;}
      drawTower(tw,x,y,t);}
    // ship
    drawShip(t,bp);
    // enemies
    G.enemies.forEach(en=>drawEnemy(en,t));
    // shots
    G.shots=G.shots.filter(s=>(s.life-=dt*5)>0);
    G.shots.forEach(s=>{g.globalAlpha=s.life;if(s.r){g.strokeStyle=s.col;g.lineWidth=3*s.life+1;g.beginPath();g.arc(s.x,s.y,s.r*(1-s.life*.6),0,Math.PI*2);g.stroke();}
      else if(s.k==='kick'){const u=1-s.life,x=s.x+(s.ex-s.x)*Math.min(1,u*2.2),y=s.y+(s.ey-s.y)*Math.min(1,u*2.2);g.fillStyle=s.col;g.shadowColor=s.col;g.shadowBlur=12;g.beginPath();g.arc(x,y,RF*.03,0,Math.PI*2);g.fill();g.shadowBlur=0;}
      else{g.strokeStyle=s.col;g.lineWidth=2;g.beginPath();g.moveTo(s.x,s.y);g.lineTo(s.ex,s.ey);g.stroke();}g.globalAlpha=1;});
    // particles + texts
    G.fx=G.fx.filter(p=>(p.life-=dt*1.8)>0);G.fx.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.93;p.vy*=.93;g.globalAlpha=p.life;g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,p.s,0,Math.PI*2);g.fill();});g.globalAlpha=1;
    G.texts=G.texts.filter(x=>(x.life-=dt*1.1)>0);G.texts.forEach(x=>{g.globalAlpha=Math.min(1,x.life*2);g.font=`${Math.round(Math.max(14,RF*.065))}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=3;const y=x.y-(1-x.life)*22;g.strokeText(x.txt,x.x,y);g.fillStyle=x.col;g.fillText(x.txt,x.x,y);});g.globalAlpha=1;
    if(G.hurt>0){g.fillStyle=`rgba(255,40,80,${G.hurt*.25})`;g.fillRect(-20,-20,W+40,H+40);G.hurt=Math.max(0,G.hurt-dt*3);}
    g.restore();
  }
  function drawTower(tw,x,y,t){
    const T=TW[tw.k],r=RF*.05,f=tw.flash;tw.flash=Math.max(0,f-.06);
    const armed=G.armed&&G.armed.id===tw.id&&performance.now()-G.armed.t<1800;
    if(armed){g.strokeStyle='rgba(255,120,120,.8)';g.setLineDash([4,4]);g.lineWidth=2;g.beginPath();g.arc(x,y,T.range*RF,0,Math.PI*2);g.stroke();g.setLineDash([]);
      g.fillStyle='#ff9999';g.font=`${Math.round(Math.max(12,RF*.05))}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.fillText('TAP AGAIN: SELL',x,y-r*1.9);}
    const gl=g.createRadialGradient(x,y,0,x,y,r*2.2);gl.addColorStop(0,T.col+(f>.1?'aa':'44'));gl.addColorStop(1,T.col+'00');g.fillStyle=gl;g.beginPath();g.arc(x,y,r*2.2,0,Math.PI*2);g.fill();
    g.save();g.translate(x,y);g.scale(1+f*.25,1+f*.25);
    g.fillStyle='#1a1630';g.strokeStyle=T.col;g.lineWidth=2;g.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.stroke();
    g.fillStyle=T.col;
    if(tw.k==='kick'){g.beginPath();g.arc(0,0,r*.55,0,Math.PI*2);g.fill();g.fillStyle='#1a1630';g.beginPath();g.arc(0,0,r*.25,0,Math.PI*2);g.fill();}
    else if(tw.k==='snare'){g.fillRect(-r*.55,-r*.25,r*1.1,r*.5);g.strokeStyle='#1a1630';g.lineWidth=1.5;for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(i*r*.2,-r*.25);g.lineTo(i*r*.2,r*.25);g.stroke();}}
    else if(tw.k==='hat'){g.beginPath();g.ellipse(0,-r*.12,r*.6,r*.16,0,0,Math.PI*2);g.fill();g.beginPath();g.ellipse(0,r*.14,r*.6,r*.16,0,0,Math.PI*2);g.fill();}
    else{[-1,1].forEach(d=>{g.save();g.rotate(d*.35);g.beginPath();g.ellipse(d*r*.18,0,r*.22,r*.45,0,0,Math.PI*2);g.fill();g.restore();});}
    g.restore();
  }
  function drawShip(t,bp){
    const r=SHIP*RF,y=CY+Math.sin(t*2)*2,hp=G.hp/SHIP_HP;
    const gg=g.createRadialGradient(CX,y,r*.3,CX,y,r*2);gg.addColorStop(0,`rgba(0,255,136,${.25+.2*bp})`);gg.addColorStop(1,'rgba(0,255,136,0)');g.fillStyle=gg;g.beginPath();g.arc(CX,y,r*2,0,Math.PI*2);g.fill();
    g.fillStyle='#8a90a8';g.beginPath();g.ellipse(CX,y+r*.15,r*1.1,r*.42,0,0,Math.PI*2);g.fill();g.fillStyle='#c8cce0';g.beginPath();g.ellipse(CX,y+r*.05,r*1.1,r*.3,0,0,Math.PI*2);g.fill();
    for(let i=0;i<6;i++){const a=t*2+i*Math.PI/3,lx=CX+Math.cos(a)*r*.85;g.fillStyle=Math.sin(a)>0?(i%2?'#ffe14d':'#7fe8ff'):'rgba(0,0,0,0)';g.beginPath();g.arc(lx,y+r*.18+Math.sin(a)*r*.12,r*.07,0,Math.PI*2);g.fill();}
    g.fillStyle='rgba(160,230,255,.35)';g.beginPath();g.ellipse(CX,y-r*.15,r*.55,r*.5,0,Math.PI,Math.PI*2);g.fill();
    const as=Math.max(16,r*.75);g.font=`${Math.round(as)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('👽',CX,y-r*.3);
    // hull health
    g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=4;g.beginPath();g.arc(CX,y,r*1.45,Math.PI*.15,Math.PI*.85);g.stroke();
    g.strokeStyle=hp>.5?'#00ff88':hp>.25?'#ffcc44':'#ff4466';g.beginPath();g.arc(CX,y,r*1.45,Math.PI*.85-Math.PI*.7*hp,Math.PI*.85);g.stroke();
  }
  function drawEnemy(en,t){
    const E=EN[en.k],[x,y]=epos(en),r=E.r*RF,dir=en.a+Math.PI,hit=en.hit;en.hit=Math.max(0,hit-.1);   // facing the ship
    g.save();g.translate(x,y);g.rotate(dir);const wob=Math.sin(en.ph)*.18;
    if(en.k==='liz'||en.k==='run'){const c1=en.k==='run'?'#7fd46b':'#a99fd8',c2=en.k==='run'?'#2f6b2a':'#5d5590';
      g.strokeStyle=c2;g.lineWidth=Math.max(1.5,r*.25);g.lineCap='round';[-1,1].forEach(d=>{[-.4,.4].forEach((o,i)=>{g.beginPath();g.moveTo(o*r,0);g.lineTo(o*r+Math.sin(en.ph+i*3)*r*.35,d*r*.9);g.stroke();});});
      g.beginPath();g.moveTo(-r*.8,0);g.quadraticCurveTo(-r*1.6,Math.sin(en.ph)*r*.6,-r*2.2,0);g.stroke();g.lineCap='butt';
      g.fillStyle=c1;g.beginPath();g.ellipse(0,0,r,r*.45,wob*.3,0,Math.PI*2);g.fill();g.beginPath();g.ellipse(r*1.05,0,r*.45,r*.36,0,0,Math.PI*2);g.fill();
      g.fillStyle='#ffe14d';[-1,1].forEach(d=>{g.beginPath();g.arc(r*1.2,d*r*.17,Math.max(1.2,r*.1),0,Math.PI*2);g.fill();});
    }else{const big=en.k==='boss',c1=big?'#ff4466':'#d6f1ff',c2=big?'#7d1430':'#5f9bc6';
      g.strokeStyle=c2;g.lineWidth=Math.max(1.5,r*.12);[-1,1].forEach(d=>{for(let i=0;i<3;i++){const o=-.35+i*.35;g.beginPath();g.moveTo(o*r,d*r*.3);g.lineTo(o*r+Math.sin(en.ph+i*2)*r*.2,d*r*.85);g.stroke();}});
      // claws
      [-1,1].forEach(d=>{g.strokeStyle=c2;g.lineWidth=Math.max(2,r*.16);g.beginPath();g.moveTo(r*.5,d*r*.25);g.lineTo(r*1.05,d*r*.5);g.stroke();g.fillStyle=c1;g.beginPath();g.ellipse(r*1.25,d*r*.5,r*.28,r*.15,d*.4+Math.sin(en.ph*2)*.2,0,Math.PI*2);g.fill();});
      // tail curling over the back to a stinger
      g.strokeStyle=c1;g.lineWidth=Math.max(2,r*.2);g.lineCap='round';g.beginPath();g.moveTo(-r*.6,0);g.quadraticCurveTo(-r*1.5,Math.sin(en.ph*.5)*r*.3,-r*1.0,-r*.05);g.stroke();g.lineCap='butt';
      g.fillStyle=big?'#ffd166':'#ff3d9a';g.beginPath();g.arc(-r*.95,-r*.05,Math.max(2,r*.14),0,Math.PI*2);g.fill();
      const bg2=g.createRadialGradient(-r*.2,-r*.2,1,0,0,r*.7);bg2.addColorStop(0,'#ffffff');bg2.addColorStop(.3,c1);bg2.addColorStop(1,c2);g.fillStyle=bg2;g.beginPath();g.ellipse(0,0,r*.7,r*.45,0,0,Math.PI*2);g.fill();
      if(big){g.fillStyle='#ffe066';[-1,1].forEach(d=>{g.beginPath();g.arc(r*.45,d*r*.15,r*.08,0,Math.PI*2);g.fill();});}
    }
    if(hit>0){g.globalAlpha=hit;g.fillStyle='#ffffff';g.beginPath();g.ellipse(0,0,r*1.1,r*.6,0,0,Math.PI*2);g.fill();g.globalAlpha=1;}
    if(en.slow>now()){g.strokeStyle='rgba(255,238,136,.7)';g.lineWidth=1.5;g.beginPath();g.arc(0,0,r*1.3,0,Math.PI*2);g.stroke();}
    g.restore();
    if(en.hp<en.max){const w=Math.max(16,r*2.2);g.fillStyle='rgba(0,0,0,.5)';g.fillRect(x-w/2,y-r*1.6,w,3);g.fillStyle=en.k==='boss'?'#ffd166':'#ff6688';g.fillRect(x-w/2,y-r*1.6,w*Math.max(0,en.hp/en.max),3);}
  }

  // ── entry button (after Worm Whack in the minigame list) ──
  const eb=document.createElement('button');eb.id='beatDefenseBtn';eb.type='button';eb.textContent='🛸 BEAT DEFENSE';eb.style.display='none';
  const after=$('wormGameBtn')||$('matchingGameLock');if(after)after.after(eb);
  eb.addEventListener('click',open);
  let had=null;setInterval(()=>{const has=(typeof TEST_MODE!=='undefined'&&TEST_MODE)||(typeof unlockedSkills!=='undefined'&&!!unlockedSkills.beat_defense);eb.style.display=has?'':'none';if(had===false&&has)showToast('🛸 BEAT DEFENSE unlocked! Find it in the cockpit.');had=document.body.classList.contains('game-active')?has:null;},900);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&G&&G.state==='play'){stop();showSelect();}});
  window.openBeatDefense=open;
  window._bdDebug={state:()=>G,start,level,nextWave};
})();
