
// ══════════════════════════════════════════════
//  PLANET HOP — rhythm platformer around a rotating planet
//  Your alien runs over the curve of a spinning planet to the beat. JUMP (tap again in the air = double
//  jump) and BOUNCE (press as you land on a glowing bounce pad to spring to the next one).
//  Any hit restarts the level (you see how far you got). Stars come from the stardust you collect.
//  Levels 1–5 Luna · 6–10 Glacia (ice) · 11–15 Magmora (lava). Levels 5 / 10 / 15 end in a comet chase.
// ══════════════════════════════════════════════
let phMultiplier=1;               // permanent points × from first clears (saved)
let phProgress={best:{}};         // best[L] = {stars, dust, pct, cleared}
function phLevelOpen(L){return (typeof TEST_MODE!=='undefined'&&TEST_MODE)||L===1||!!(phProgress.best[L-1]||{}).cleared;}

(function(){
  const $=id=>document.getElementById(id);
  const ov=document.createElement('div');ov.id='phOverlay';ov.className='ww-like';
  ov.innerHTML=`
    <div class="ww-hud">
      <button class="ww-x" id="phQuit" title="Back">✕</button>
      <div class="ww-title" id="phTitle" style="color:#7fe8ff">PLANET HOP</div>
      <div class="ww-stat"><span id="phPct">0%</span><small>PROGRESS</small></div>
      <div class="ww-stat"><span id="phDust">0</span><small>STARDUST</small></div>
      <div class="ww-stat"><span id="phAtt">1</span><small>ATTEMPT</small></div>
      <div class="ww-prog"><div id="phProg" style="background:linear-gradient(90deg,#7fe8ff,#ff66ff)"></div></div>
    </div>
    <div class="ww-arena"><canvas id="phCanvas"></canvas></div>
    <div class="ww-pads ph-pads" id="phPads">
      <button class="ww-pad" id="phJump" style="--c:#00e5ff"><span class="k" id="phJumpK"></span><span class="nm">JUMP · tap again in the air to double jump</span></button>
      <button class="ww-pad" id="phBounce" style="--c:#ff4dff"><span class="k" id="phBounceK"></span><span class="nm">BOUNCE · on the glowing pads</span></button>
    </div>
    <div class="ww-panel" id="phSelect"><div class="ww-panel-inner" style="box-shadow:0 0 40px -10px #7fe8ff">
      <div class="ww-sel-head"><div><div class="ww-big" style="color:#7fe8ff">PLANET HOP</div><div class="ww-sub">Run round the planet to the beat · JUMP, double jump, and BOUNCE across the glowing pads · any hit restarts</div></div><button class="ww-x" id="phClose" title="Close">✕</button></div>
      <div class="ww-sel-bonus" id="phBonus"></div>
      <div class="ww-grid ph-grid" id="phGrid"></div>
      <div class="ww-detail" id="phDetail"></div>
    </div></div>
    <div class="ww-panel" id="phResults"><div class="ww-panel-inner ww-res" id="phResInner" style="box-shadow:0 0 40px -10px #7fe8ff"></div></div>`;
  document.body.appendChild(ov);
  const cv=$('phCanvas'),g=cv.getContext('2d');
  let W=0,H=0,DPR=1,bg=null,bgKey='',sel=1,R=null;

  // ── open / close ──
  function open(){
    if(typeof seqPlaying!=='undefined'&&seqPlaying&&typeof stopSeq==='function')stopSeq();
    if(typeof partyMode!=='undefined'&&partyMode&&typeof stopParty==='function')stopParty();
    ov.classList.add('open');document.body.classList.add('ww-open');
    let l=1;for(let i=1;i<=15;i++)if(phLevelOpen(i))l=i;sel=l;showSelect();
  }
  function close(){stop();ov.classList.remove('open');document.body.classList.remove('ww-open');if(typeof autoSave==='function')autoSave();}
  window.openPlanetHop=open;window.closePlanetHop=close;
  $('phClose').addEventListener('click',close);
  $('phQuit').addEventListener('click',()=>{if(R&&R.state!=='done'){stop();showSelect();}else close();});

  const NEWS={2:'NEW: rock blocks — land on top',3:'NEW: wide pits — tap JUMP again in the air to double jump',4:'NEW: bounce pads — press BOUNCE as you land on each one',5:'BOSS: a comet chases you round Luna',6:'NEW: low gravity — floaty two-beat jumps',7:'NEW: fast bounce chains, one pad per beat',8:'NEW: floating ice platforms',9:'NEW: spike runs — jump on every beat',10:'BOSS: the frozen comet',11:'NEW: triple spikes — jump, then double jump half a beat later',15:'FINAL BOSS: the supernova comet'};
  function showSelect(){
    $('phResults').classList.remove('open');$('phSelect').classList.add('open');
    const stars=Object.values(phProgress.best).reduce((a,b)=>a+(b.stars||0),0);
    $('phBonus').innerHTML=`Planet Hop bonus: <b>×${typeof formatStore==='function'?formatStore(phMultiplier):phMultiplier.toFixed(2)}</b> points forever · ${stars} / 45 ★`;
    const gr=$('phGrid');gr.innerHTML='';
    for(let L=1;L<=15;L++){
      const b=document.createElement('button');b.className='ww-tile';const best=phProgress.best[L]||{},op=phLevelOpen(L);
      if(!op)b.classList.add('locked');if(L===sel)b.classList.add('sel');if(L%5===0)b.classList.add('boss');
      b.style.borderColor=L===sel?'':PH_PLANETS[phLevel(L).planet].glow+'55';
      b.innerHTML=`<span class="n">${op?L:'🔒'}</span><span class="st">${best.cleared?'★'.repeat(best.stars||1)+'<i>'+'★'.repeat(3-(best.stars||1))+'</i>':best.pct?Math.round(best.pct*100)+'%':'<i>★★★</i>'}</span>`;
      b.addEventListener('click',()=>{if(!op){showToast('Clear level '+(L-1)+' first');return;}sel=L;showSelect();});
      gr.appendChild(b);
    }
    const P=phLevel(sel),best=phProgress.best[sel],pl=PH_PLANETS[P.planet];
    $('phDetail').innerHTML=`<div class="ww-d-name">${sel}. ${P.name}</div>
      <div class="ww-d-meta">${pl.name} · ${P.bpm} BPM · ${P.style.toUpperCase()}</div>
      ${NEWS[sel]?`<div class="ww-d-new" style="color:${pl.glow}">${NEWS[sel]}</div>`:''}
      <div class="ww-d-meta">${best&&best.cleared?`Best: ${'★'.repeat(best.stars)}${'☆'.repeat(3-best.stars)} · stardust ${Math.round(best.dust*100)}%`:best&&best.pct?`Best run: ${Math.round(best.pct*100)}% · first clear: <b>×${P.reward}</b> points forever`:`First clear: <b>×${P.reward}</b> points forever`}</div>
      <button class="ww-play" id="phPlay" style="border-color:${pl.glow};color:${pl.glow};background:#071420">PLAY</button>`;
    $('phPlay').addEventListener('click',()=>start(sel));
  }

  // ── run ──
  function stop(){if(!R)return;clearInterval(R.sched);cancelAnimationFrame(R.raf);clearTimeout(R.rt);R.state='stopped';R=null;}
  function lat(){const c=getCtx();return(c.outputLatency||0)+(c.baseLatency||0)*.5;}
  function tau(){return(getCtx().currentTime-lat()-R.T0)/R.beat;}
  function start(L){
    stop();
    $('phSelect').classList.remove('open');$('phResults').classList.remove('open');
    const lv=phBuild(L);
    R={state:'play',lv,L,beat:60/lv.P.bpm,attempt:0,fx:[],texts:[],shake:0,trail:[]};
    $('phTitle').textContent=L+'. '+lv.P.name;
    const kj=(typeof padBindings!=='undefined'&&padBindings[0]&&padBindings[0].label)||'',kb=(typeof padBindings!=='undefined'&&padBindings[1]&&padBindings[1].label)||'';
    $('phJumpK').textContent='JUMP'+(IS_DESKTOP?' · '+[kj,'SPACE'].filter(Boolean).join(' / '):'');
    $('phBounceK').textContent='BOUNCE'+(IS_DESKTOP?' · '+[kb,'SHIFT'].filter(Boolean).join(' / '):'');
    resize();attempt(true);
    R.raf=requestAnimationFrame(frame);
  }
  function attempt(first){
    const c=getCtx();
    clearInterval(R.sched);
    R.attempt++;R.S=phNewState();R.ei=0;R.inputs=[];R.got=new Set();R.dead=null;R.won=0;R.trail=[];
    R.T0=c.currentTime+(first?4*R.beat+.3:.25);
    if(first)for(let i=0;i<4;i++)playSound('rimshot',i?.5:.85,R.T0-(4-i)*R.beat);
    R.sched=setInterval(schedule,25);schedule();
    $('phAtt').textContent=R.attempt;$('phDust').textContent='0';
  }
  function schedule(){
    if(!R||R.dead||R.state!=='play')return;
    const c=getCtx(),ahead=c.currentTime+.18,ev=R.lv.song.events;
    while(R.ei<ev.length&&R.T0+ev[R.ei].t<ahead){
      const e=ev[R.ei++],at=Math.max(c.currentTime,R.T0+e.t);
      try{if(e.kind==='drum')playSound(e.id,e.vel,at);else if(typeof playRollNote==='function'&&SOUND_MAP[e.id])playRollNote(e.id,e.midi,at,e.dur,e.vel,-1);}catch(err){}
    }
  }

  // ── input (timestamped, applied inside the physics at the exact beat it happened) ──
  function input(w,ev){
    if(!R||R.state!=='play'||R.dead)return;
    let t=tau();if(ev&&ev.timeStamp){const lag=(performance.now()-ev.timeStamp)/1000;if(lag>0&&lag<.25)t-=lag/R.beat;}
    if(t<-.2)return;
    R.inputs.push({t:Math.max(R.S.s,t),w});
    const pad=$(w==='j'?'phJump':'phBounce');pad.classList.remove('lit');void pad.offsetWidth;pad.classList.add('lit');
    try{const id=(typeof padSounds!=='undefined'&&padSounds[w==='j'?0:1])||(w==='j'?'kick':'snare');playSound(SOUND_MAP[id]?id:(w==='j'?'kick':'snare'),.55);}catch(e){}
  }
  ['phJump','phBounce'].forEach((id,i)=>{const b=$(id);const w=i?'b':'j';
    b.addEventListener('pointerdown',e=>{e.preventDefault();input(w,e);});b.addEventListener('contextmenu',e=>e.preventDefault());});
  addEventListener('keydown',e=>{
    if(!ov.classList.contains('open'))return;
    if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(R&&R.state==='play'){stop();showSelect();}else close();return;}
    if(!R||R.state!=='play')return;
    let w=null;
    if(['Space','ArrowUp','KeyW'].includes(e.code))w='j';else if(['ShiftLeft','ShiftRight','ArrowDown','KeyS'].includes(e.code))w='b';
    else for(const [idx,b] of Object.entries(typeof padBindings!=='undefined'?padBindings:{}))if(b.key&&e.code===b.key){w=(+idx)%2?'b':'j';break;}
    if(w){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)input(w,e);}
  },true);
  if(typeof firePad==='function'){const _fire=firePad;firePad=function(idx){if(ov.classList.contains('open')){input(idx%2?'b':'j');return;}return _fire.apply(this,arguments);};}

  // ── frame: advance physics to the music, then draw ──
  function frame(){
    if(!R)return;R.raf=requestAnimationFrame(frame);
    const now=performance.now(),dt=Math.min(.05,(now-(R.lp||now))/1000);R.lp=now;
    const lv=R.lv,S=R.S;
    if(R.state==='play'&&!R.dead&&!R.won){
      const target=Math.min(tau(),lv.end+.01);
      R.inputs.sort((a,b)=>a.t-b.t);
      let guard=0;
      while(S.s<target&&!S.dead&&guard++<2400){
        while(R.inputs.length&&R.inputs[0].t<=S.s){const i=R.inputs.shift();const r=i.w==='j'?phJump(lv,S):phBounce(lv,S);if(r==='double')burst(S.s,S.h,'#00e5ff',10,.7);if(r==='bounce'){burst(S.s,S.h,'#ff4dff',16,1);R.shake=Math.max(R.shake,3);}}
        const wasG=S.grounded;phStep(lv,S,PH_DT);
        if(!wasG&&S.grounded&&S.s>1)burst(S.s,S.h,'#ccccdd',5,.5);
      }
      // stardust
      lv.dust.forEach((d,i)=>{if(!R.got.has(i)&&Math.abs(d.s-S.s)<.24&&Math.abs(d.h-(S.h+.45))<.55){R.got.add(i);burst(d.s,d.h,'#ffe680',6,.5);try{if(R.got.size%4===0)playSound('bell',.18);}catch(e){}}});
      $('phDust').textContent=R.got.size;
      const pct=Math.max(0,Math.min(1,S.s/lv.end));$('phPct').textContent=Math.floor(pct*100)+'%';$('phProg').style.width=(pct*100)+'%';
      if(S.dead)die();
      else if(S.s>=lv.end)win();
    }
    draw(dt);
  }
  function die(){
    const S=R.S,pct=Math.max(0,Math.min(1,S.s/R.lv.end));R.dead={t:performance.now(),pct};clearInterval(R.sched);
    const b=phProgress.best[R.L]||{};if(!b.cleared&&pct>(b.pct||0)){phProgress.best[R.L]=Object.assign(b,{pct});}
    burst(S.s,S.h+.3,'#00ff88',30,1.6);burst(S.s,S.h+.3,'#ffffff',12,1);R.shake=12;
    try{playSound('zap',.6);}catch(e){}
    R.rt=setTimeout(()=>{if(R&&R.state==='play')attempt(false);},900);
  }
  function win(){
    R.won=performance.now();clearInterval(R.sched);
    const L=R.L,P=R.lv.P,dust=R.lv.dust.length?R.got.size/R.lv.dust.length:1,stars=dust>=.9?3:dust>=.6?2:1;
    const prev=phProgress.best[L]||{},first=!prev.cleared;
    phProgress.best[L]={cleared:true,pct:1,stars:Math.max(stars,prev.stars||0),dust:Math.max(dust,prev.dust||0)};
    if(first)phMultiplier*=P.reward;
    if(R.lv.bossS<Infinity){R.shake=16;for(let k=0;k<4;k++)burst(R.S.s-2.2,2.4,['#ffd166','#ff66ff','#7fe8ff','#ffffff'][k],30,2);}
    if(typeof autoSave==='function')autoSave();if(typeof renderUI==='function')renderUI();
    setTimeout(()=>results(stars,dust,first),R.lv.bossS<Infinity?1300:700);
  }
  function results(stars,dust,first){
    if(!R)return;R.state='done';
    const L=R.L,P=R.lv.P;
    $('phResInner').innerHTML=`
      <div class="ww-big win">${P.boss?'COMET ESCAPED!':'LEVEL CLEAR!'}</div>
      <div class="ww-d-name">${L}. ${P.name}</div>
      <div class="ww-stars">${[1,2,3].map(k=>`<span class="${k<=stars?'on':''}">★</span>`).join('')}</div>
      <div class="ww-res-acc">${Math.round(dust*100)}%<small>stardust collected (60% ★★ · 90% ★★★)</small></div>
      <div class="ww-res-grid"><div><b>${R.got.size} / ${R.lv.dust.length}</b><small>STARDUST</small></div><div><b>${R.attempt}</b><small>ATTEMPTS</small></div></div>
      ${first?`<div class="ww-reward">Permanent bonus: ×${P.reward} points!${L<15?' · Level '+(L+1)+' unlocked':''}</div>`:''}
      <div class="ww-res-btns"><button class="ww-btn" id="phRetry">RETRY</button>${L<15?'<button class="ww-btn ww-play" id="phNext">NEXT LEVEL</button>':''}<button class="ww-btn" id="phLevels">LEVELS</button></div>`;
    $('phResults').classList.add('open');
    $('phRetry').addEventListener('click',()=>start(L));
    const nx=$('phNext');if(nx)nx.addEventListener('click',()=>{sel=L+1;start(L+1);});
    $('phLevels').addEventListener('click',()=>{sel=L<15?L+1:L;stop();showSelect();});
  }

  // ── effects ──
  function burst(s,h,col,n,spd){for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2,v=(1.2+Math.random()*3)*(spd||1);R.fx.push({s,h,vs:Math.cos(a)*v*.5,vh:Math.sin(a)*v,life:1,col,z:2+Math.random()*3});}}

  // ── layout / geometry ──
  function resize(){
    const a=cv.parentElement.getBoundingClientRect();DPR=Math.min(2,devicePixelRatio||1);W=Math.max(10,a.width);H=Math.max(10,a.height);
    cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';bgKey='';
  }
  addEventListener('resize',()=>{if(ov.classList.contains('open')&&R)resize();});
  let BP=120,UP=50,RP=1500,AX=0,GY=0;
  function geo(){const tall=H>W*1.2;BP=Math.max(70,Math.min(170,Math.min(W*(tall?.21:.16),H*.32)));UP=BP*.46;RP=Math.max(W*1.25,H*(tall?1.6:2.2),700);AX=W*(tall?.26:.3);GY=H*(tall?.7:.68);}
  // a point on (or above) the planet: s in beats along the surface, h in jump-heights above it
  function P(s,h){const f=(s-R.S.s)*BP/RP,r=RP+h*UP;return[AX+r*Math.sin(f),GY+RP-r*Math.cos(f),f];}

  function makeBg(){
    const pl=PH_PLANETS[R.lv.P.planet],key=W+'x'+H+':'+R.lv.P.planet;if(bg&&bgKey===key)return;bgKey=key;
    bg=document.createElement('canvas');bg.width=cv.width;bg.height=cv.height;const b=bg.getContext('2d');b.scale(DPR,DPR);
    const rnd=wwRng(99+R.lv.P.planet);
    const sky=b.createLinearGradient(0,0,0,H);sky.addColorStop(0,pl.sky[0]);sky.addColorStop(1,pl.sky[1]);b.fillStyle=sky;b.fillRect(0,0,W,H);
    // nebula
    for(let i=0;i<5;i++){const x=rnd()*W,y=rnd()*H*.6,r=80+rnd()*220,ng=b.createRadialGradient(x,y,0,x,y,r);ng.addColorStop(0,pl.glow+'33');ng.addColorStop(1,'rgba(0,0,0,0)');b.fillStyle=ng;b.fillRect(0,0,W,H);}
    for(let i=0;i<W*H/2200;i++){b.fillStyle=`rgba(255,255,255,${.25+rnd()*.7})`;const z=rnd()<.08?2:1;b.fillRect(rnd()*W,rnd()*H*.75,z,z);}
    // sun + a ringed planet in the sky
    const sx=W*.82,sy=H*.16,sr=Math.min(W,H)*.06,sg=b.createRadialGradient(sx,sy,0,sx,sy,sr*4);sg.addColorStop(0,'rgba(255,240,200,.95)');sg.addColorStop(.25,'rgba(255,200,120,.35)');sg.addColorStop(1,'rgba(0,0,0,0)');b.fillStyle=sg;b.fillRect(0,0,W,H);
    const px=W*.2,py=H*.22,pr=Math.min(W,H)*.09;
    b.save();b.translate(px,py);b.rotate(-.35);
    b.strokeStyle='rgba(220,200,255,.45)';b.lineWidth=pr*.12;b.beginPath();b.ellipse(0,0,pr*1.9,pr*.45,0,Math.PI,Math.PI*2);b.stroke();
    const pg=b.createRadialGradient(-pr*.4,-pr*.4,pr*.1,0,0,pr);pg.addColorStop(0,'#c8b8ff');pg.addColorStop(1,'#3a2a6a');b.fillStyle=pg;b.beginPath();b.arc(0,0,pr,0,Math.PI*2);b.fill();
    b.beginPath();b.ellipse(0,0,pr*1.9,pr*.45,0,0,Math.PI);b.stroke();b.restore();
  }

  // ── draw ──
  function draw(dt){
    if(!R)return;geo();makeBg();
    const lv=R.lv,S=R.S,pl=PH_PLANETS[lv.P.planet],t=performance.now()/1000;
    const beatPh=((R.state==='play'&&!R.dead)?tau():S.s)%1,pulse=Math.pow(1-Math.max(0,beatPh),3);
    g.setTransform(DPR,0,0,DPR,0,0);
    const sh=R.shake;R.shake*=Math.pow(.002,dt);
    g.save();if(sh>.3)g.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
    g.drawImage(bg,0,0,W,H);
    // drifting foreground stars (parallax)
    g.fillStyle='rgba(255,255,255,.55)';for(let i=0;i<24;i++){const x=((i*137.5-S.s*BP*.08)%W+W)%W,y=(i*53)%(H*.55);g.fillRect(x,y,1.5,1.5);}
    const s0=S.s-(AX+60)/BP,s1=S.s+(W-AX+60)/BP;
    const CX=AX,CY=GY+RP,ang=s=>(s-S.s)*BP/RP-Math.PI/2;
    // planet body
    const pg=g.createRadialGradient(CX,CY-RP*.2,RP*.6,CX,CY,RP);pg.addColorStop(0,pl.ground[1]);pg.addColorStop(1,pl.ground[0]);
    g.fillStyle=pg;g.beginPath();g.arc(CX,CY,RP,0,Math.PI*2);g.fill();
    // surface craters / rocks (fixed to the planet so it visibly rotates)
    for(let k=Math.floor(s0/1.37);k<=s1/1.37;k++){const s=k*1.37+((k*7919)%100)/180,sz=.08+((k*31)%10)/60;if(lv.pits.some(p=>s>p.a-.2&&s<p.b+.2))continue;
      const [x,y,f]=P(s,-.18-((k*13)%5)/20);g.save();g.translate(x,y);g.rotate(f);g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(0,0,sz*BP,sz*BP*.35,0,0,Math.PI*2);g.fill();g.restore();}
    // rim glow pulses on the beat
    g.strokeStyle=pl.glow;g.globalAlpha=.25+.45*pulse;g.lineWidth=2+3*pulse;g.beginPath();g.arc(CX,CY,RP,ang(s0),ang(s1));g.stroke();g.globalAlpha=1;
    // low-gravity zones
    lv.zones.forEach(z=>{if(z.b<s0||z.a>s1)return;g.fillStyle='rgba(120,200,255,.12)';g.beginPath();g.arc(CX,CY,RP+2.6*UP,ang(z.a),ang(z.b));g.arc(CX,CY,RP,ang(z.b),ang(z.a),true);g.fill();
      const [x,y,f]=P(Math.max(z.a+.6,Math.min(z.b-.6,S.s+2)),2.3);g.save();g.translate(x,y);g.rotate(f);g.fillStyle='rgba(160,220,255,.7)';g.font=`${Math.round(UP*.38)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.fillText('LOW GRAVITY',0,0);g.restore();});
    // pits
    lv.pits.forEach(p=>{if(p.b<s0||p.a>s1)return;
      const lava=lv.P.planet===2,grd=g.createRadialGradient(CX,CY,RP-1.6*UP,CX,CY,RP);
      if(lava){grd.addColorStop(0,'#ffd23a');grd.addColorStop(.6,'#ff5a1a');grd.addColorStop(1,'#7a1a00');}else{grd.addColorStop(0,'#000');grd.addColorStop(1,pl.pit);}
      g.fillStyle=grd;g.beginPath();g.arc(CX,CY,RP+1,ang(p.a),ang(p.b));g.arc(CX,CY,RP-1.6*UP,ang(p.b),ang(p.a),true);g.closePath();g.fill();
      if(lava){g.fillStyle='rgba(255,220,120,.8)';for(let k=0;k<3;k++){const s=p.a+(p.b-p.a)*((k+.5)/3),bub=(t*1.3+k*.37)%1;const [x,y]=P(s,-.1+bub*.5);g.globalAlpha=1-bub;g.beginPath();g.arc(x,y,3+bub*3,0,Math.PI*2);g.fill();}g.globalAlpha=1;}
    });
    // blocks (rock / ice / basalt), drawn along the curve
    lv.blocks.forEach(b=>{if(b.b<s0||b.a>s1)return;const bot=b.fl?b.h-.3:-.05,n=8;g.beginPath();
      for(let i=0;i<=n;i++){const [x,y]=P(b.a+(b.b-b.a)*i/n,b.h);i?g.lineTo(x,y):g.moveTo(x,y);}
      for(let i=n;i>=0;i--){const [x,y]=P(b.a+(b.b-b.a)*i/n,bot);g.lineTo(x,y);}
      g.closePath();g.fillStyle=pl.block;g.fill();g.strokeStyle=pl.glow+'88';g.lineWidth=2;g.stroke();
      const [x1,y1]=P(b.a,b.h),[x2,y2]=P(b.b,b.h);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();});
    // spikes (meteors drop in during comet chases)
    lv.spikes.forEach(sp=>{if(sp.s<s0-1||sp.s>s1+1)return;
      let drop=0;if(sp.meteor){drop=Math.max(0,(sp.s-S.s-1.3)*2.2);}
      if(drop>0){const [x,y]=P(sp.s,sp.h*.5+drop);g.fillStyle='#ffb84d';g.shadowColor='#ff6a00';g.shadowBlur=18;g.beginPath();g.arc(x,y,BP*.13,0,Math.PI*2);g.fill();g.shadowBlur=0;
        g.strokeStyle='rgba(255,140,40,.5)';g.lineWidth=BP*.12;g.beginPath();g.moveTo(x,y);const [tx,ty]=P(sp.s+.8,sp.h*.5+drop+1.6);g.lineTo(tx,ty);g.stroke();return;}
      const [ax,ay]=P(sp.s-sp.w/2,0),[bx,by]=P(sp.s+sp.w/2,0),[cx,cy]=P(sp.s,sp.h);
      g.fillStyle=sp.meteor?'#6a3a2a':pl.spike;g.strokeStyle=sp.meteor?'#ff8a3a':pl.glow;g.lineWidth=1.5;g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo(bx,by);g.closePath();g.fill();g.stroke();
      if(lv.P.planet===1){g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo((ax+bx)/2,(ay+by)/2);g.fill();}});
    // bounce pads
    lv.pads.forEach(p=>{if(p.s<s0-1||p.s>s1+1)return;const gone=S.padsDropped.has(p);
      const fall=gone?Math.min(3,(S.s-p.s)*2):0,[x,y,f]=P(p.s,-fall*.6);g.save();g.translate(x,y);g.rotate(f);g.globalAlpha=gone?Math.max(0,1-fall/2):1;
      g.shadowColor='#ff4dff';g.shadowBlur=14+10*pulse;g.fillStyle='#ff4dff';g.beginPath();g.ellipse(0,0,p.w/2*BP,UP*.13+UP*.05*pulse,0,0,Math.PI*2);g.fill();g.shadowBlur=0;
      g.fillStyle='#fff';g.globalAlpha*=.8;g.beginPath();g.ellipse(0,-UP*.04,p.w/2*BP*.6,UP*.05,0,0,Math.PI*2);g.fill();g.restore();
      // faint arc to where it will throw you
      if(!gone&&p.s>S.s-.3&&p.s<S.s+5){g.strokeStyle='rgba(255,77,255,.22)';g.setLineDash([4,6]);g.lineWidth=2;g.beginPath();const T=p.next-p.s,gz=phZoneG(lv,p.s);for(let i=0;i<=12;i++){const u=i/12*T,hh=gz*T/2*u-gz*u*u/2;const [qx,qy]=P(p.s+u,hh);i?g.lineTo(qx,qy):g.moveTo(qx,qy);}g.stroke();g.setLineDash([]);}});
    // stardust
    lv.dust.forEach((d,i)=>{if(R.got.has(i)||d.s<s0||d.s>s1)return;const [x,y]=P(d.s,d.h),z=BP*.06*(1+.3*Math.sin(t*6+i));
      g.fillStyle='#ffe680';g.shadowColor='#ffd23a';g.shadowBlur=8;g.beginPath();for(let k=0;k<8;k++){const r=k%2?z*.4:z,a=k/8*Math.PI*2+t;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.closePath();g.fill();g.shadowBlur=0;});
    // comet chasing you
    if(lv.bossS<Infinity&&S.s>lv.bossS-3){
      const k=Math.min(1,(S.s-(lv.bossS-3))/3),won=R.won?Math.min(1,(performance.now()-R.won)/900):0;
      const cx=AX-BP*(3.4-1.2*k)-won*BP*0,cy=GY-UP*(2.8-won*2.8)+Math.sin(t*3)*UP*.15,cr=BP*.32;
      if(won<1){const tg=g.createLinearGradient(cx,cy,cx-BP*3,cy-UP*2.5);tg.addColorStop(0,'rgba(255,220,140,.8)');tg.addColorStop(1,'rgba(255,80,40,0)');
        g.fillStyle=tg;g.beginPath();g.moveTo(cx,cy-cr);g.lineTo(cx-BP*3,cy-UP*2.5);g.lineTo(cx,cy+cr);g.fill();
        const cg=g.createRadialGradient(cx-cr*.3,cy-cr*.3,1,cx,cy,cr);cg.addColorStop(0,'#fff');cg.addColorStop(.4,lv.P.planet===1?'#9ff':'#ffd166');cg.addColorStop(1,lv.P.planet===2?'#ff3a1a':'#ff8a3a');
        g.fillStyle=cg;g.shadowColor='#ff8a3a';g.shadowBlur=30;g.beginPath();g.arc(cx,cy,cr,0,Math.PI*2);g.fill();g.shadowBlur=0;}
    }
    // trail + alien
    const [ax,ay]=P(S.s,S.h);
    if(!R.dead){R.trail.push([ax,ay]);if(R.trail.length>10)R.trail.shift();
      R.trail.forEach((p,i)=>{g.fillStyle=`rgba(0,255,136,${i/R.trail.length*.25})`;g.beginPath();g.arc(p[0]-(R.trail.length-i)*BP*.035,p[1]-UP*.35,UP*.12*(i/R.trail.length),0,Math.PI*2);g.fill();});
      const as=Math.max(26,UP*.85),col=(typeof getAlienColor==='function')?getAlienColor(0):'#00ff88';
      // shadow on the ground
      const [shx,shy]=P(S.s,phSupport(lv,S,S.s,S.h).top??-1);if(!phInPit(lv,S.s)||S.h>-0.1){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(shx,shy,as*.4*(1/(1+S.h*.4)),as*.1,0,0,Math.PI*2);g.fill();}
      const land=Math.max(0,1-(S.s-S.landT)*5);
      g.save();g.translate(ax,ay-as*.48);g.rotate(-S.flip*Math.PI*2);g.scale(1+land*.18,1-land*.18);
      g.shadowColor=col;g.shadowBlur=14;g.font=`${Math.round(as)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('👽',0,0);g.shadowBlur=0;g.restore();
    }
    // particles
    R.fx=R.fx.filter(p=>(p.life-=dt*1.4)>0);
    R.fx.forEach(p=>{p.s+=p.vs*dt;p.h+=p.vh*dt;p.vh-=6*dt;const [x,y]=P(p.s,p.h+.35);g.globalAlpha=p.life;g.fillStyle=p.col;g.beginPath();g.arc(x,y,p.z,0,Math.PI*2);g.fill();});g.globalAlpha=1;
    // count-in / death
    const tt=R.state==='play'&&!R.dead?tau():1;
    if(tt<0&&R.attempt===1){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,0,W,H);g.fillStyle='#fff';g.font=`${Math.round(Math.min(W,H)*.2)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(Math.ceil(-tt)>3?'READY':String(Math.ceil(-tt)),W/2,H*.42);g.textBaseline='alphabetic';}
    if(R.dead){const k=(performance.now()-R.dead.t)/900;g.fillStyle=`rgba(255,40,80,${.35*(1-k)})`;g.fillRect(0,0,W,H);g.fillStyle='#fff';g.font=`${Math.round(Math.min(W,H)*.16)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(Math.floor(R.dead.pct*100)+'%',W/2,H*.4);g.textBaseline='alphabetic';}
    g.restore();
  }

  // ── entry button in the bunker (after Worm Whack) ──
  const eb=document.createElement('button');eb.id='planetHopBtn';eb.type='button';eb.textContent='🪐 PLANET HOP';
  const after=$('wormGameBtn')||$('matchingGameLock')||$('matchingGameBtn');if(after)after.after(eb);
  eb.addEventListener('click',open);
  let had=null;
  setInterval(()=>{const has=(typeof TEST_MODE!=='undefined'&&TEST_MODE)||(typeof unlockedSkills!=='undefined'&&!!unlockedSkills.planet_hop);eb.style.display=has?'':'none';if(had===false&&has)showToast('🪐 PLANET HOP unlocked! Find it in the bunker, under Worm Whack.');had=has;},800);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&R&&R.state==='play'){stop();showSelect();}});
  window._phDebug={state:()=>R,start,input,tau:()=>R?tau():0};
})();
