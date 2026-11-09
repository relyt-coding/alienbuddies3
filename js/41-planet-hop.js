
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
      <button class="ww-pad ph-pad" id="phJump" style="--c:#00e5ff"><span class="ph-beat"><i></i><i></i><i></i><i></i></span><span class="ph-ico"><svg viewBox="0 0 24 24"><path d="M5 13l7-7 7 7M5 19l7-7 7 7"/></svg></span><span class="ph-txt"><span class="ph-act">JUMP</span><span class="ph-snd" id="phJumpSnd"></span><span class="ph-tip">tap again in the air = double jump</span></span><span class="ph-keys" id="phJumpK"></span></button>
      <button class="ww-pad ph-pad" id="phBounce" style="--c:#ff4dff"><span class="ph-beat"><i></i><i></i><i></i><i></i></span><span class="ph-ico"><svg viewBox="0 0 24 24"><path d="M4 20h16M7 16l10-2.5L7 11l10-2.5L7 6M12 3v0"/><circle cx="12" cy="3.2" r="1.6"/></svg></span><span class="ph-txt"><span class="ph-act">BOUNCE</span><span class="ph-snd" id="phBounceSnd"></span><span class="ph-tip">on the glowing pads</span></span><span class="ph-keys" id="phBounceK"></span></button>
    </div>
    <div class="ww-panel" id="phSelect"><div class="ww-panel-inner" style="box-shadow:0 0 40px -10px #7fe8ff">
      <div class="ww-sel-head"><div><div class="ww-big" style="color:#7fe8ff">PLANET HOP</div><div class="ww-sub">Run round the planet to the beat · JUMP, double jump, and BOUNCE across the glowing pads · a hit sends you back to the start, or to the checkpoint flag once you pass it</div></div><div style="display:flex;gap:6px"><button class="ww-btn mg-sync-btn" id="phSync" title="Calibrate your timing">⏱ SYNC</button><button class="ww-x" id="phClose" title="Close">✕</button></div></div>
      <div class="mg-tabs"><button class="mg-tab sel" id="phTabLv">LEVELS</button><button class="mg-tab" id="phTabMine">YOUR BEATS</button></div>
      <div id="phLvPane"><div class="ww-sel-bonus" id="phBonus"></div>
      <div class="ww-grid ph-grid" id="phGrid"></div>
      <div class="ww-detail" id="phDetail"></div></div>
      <div id="phMinePane" class="ww-detail" style="display:none"></div>
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
  $('phTabLv').addEventListener('click',()=>showTab('lv'));$('phTabMine').addEventListener('click',()=>showTab('mine'));
  $('phSync').addEventListener('click',()=>{if(typeof mgOpenSync==='function')mgOpenSync(()=>{});});
  $('phQuit').addEventListener('click',()=>{if(R&&R.state!=='done'){stop();showSelect();}else close();});

  const NEWS={1:'Jump on the beat — follow the glowing markers · then dive into the crater!',2:'Underground! NEW: rocks — land on top, then find the way out',3:'NEW: double jump — practise on flat ground, then clear wide pits',4:'NEW: low gravity on the moon — floaty two-beat jumps',5:'BOSS: a comet chases you round Luna · NEW: climbing rocks',6:'NEW BUTTON: BOUNCE — press it as you land on each glowing pad',7:'NEW: fast bounce chains, one pad per beat',8:'NEW: floating ice platforms',9:'NEW: spike runs — jump on every beat',10:'BOSS: the frozen comet',11:'NEW: triple spikes — jump, then double jump on the "and"',12:'NEW: off-beat spikes — jump on the "and"',13:'NEW: tall rocks — double jump up onto them',14:'REMIX: everything you know, at speed',15:'FINAL BOSS: the supernova comet'};
  let tab='lv';const PH_DIFF_L={easy:3,normal:8,hard:13};
  const mineOpts={id:'phMine',note:'obstacles land on your beat',playStyle:'border-color:#7fe8ff;color:#7fe8ff;background:#071420',onPlay:song=>{const d=Object.keys(MG_DIFFS).find(k=>song.P.custom.endsWith('|'+k))||'normal';song.P.planet=MG_DIFFS[d].planet;start({song,L:PH_DIFF_L[d]});}};
  function showTab(t){tab=t;$('phTabLv').classList.toggle('sel',t==='lv');$('phTabMine').classList.toggle('sel',t==='mine');$('phLvPane').style.display=t==='lv'?'':'none';$('phMinePane').style.display=t==='mine'?'':'none';
    if(t==='mine'){mineOpts.best=phProgress.custom||{};mgRenderCustom($('phMinePane'),mineOpts);}}
  function showSelect(){
    $('phResults').classList.remove('open');$('phSelect').classList.add('open');showTab(tab);
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
  // JUMP plays your kick pad, BOUNCE your snare/clap pad (a plain kick / snare if you haven't got one)
  function phPadSound(w){const ps=(typeof padSounds!=='undefined'?padSounds:[]).filter(id=>id&&SOUND_MAP[id]);
    const re=w==='j'?/kick|808|thud|boom|sub/i:/snare|clap|rim|stomp/i,hit=ps.find(id=>re.test(id)||re.test(SOUND_MAP[id].name||''));
    return hit||(w==='j'?'kick':'snare');}
  // the buttons breathe with the music: 4 beat lights, and a glow that builds toward the next press
  function padHud(tt){
    const bi=((Math.floor(tt)%4)+4)%4,ph=tt-Math.floor(tt);
    document.querySelectorAll('#phPads .ph-beat').forEach(el=>[...el.children].forEach((d,i)=>d.className=(tt>=-4&&i===bi)?(ph<.25?'on hit':'on'):''));
    const A=R.lv.acts;while(R.cueI<A.length&&A[R.cueI].t<tt-.15)R.cueI++;if(R.cueI>0&&A[R.cueI-1].t>tt)R.cueI=0;
    const nx={j:null,b:null};for(let i=R.cueI;i<A.length&&i<R.cueI+6;i++){const w=R.solo?'j':A[i].w;if(nx[w]==null)nx[w]=A[i].t;}
    [['phJump','j'],['phBounce','b']].forEach(([id,w])=>{const d=nx[w]==null?9:nx[w]-tt;$(id).style.setProperty('--cue',d>1||d<-.15?0:(1-Math.max(0,d)).toFixed(2));});
  }
  // (mgOffset = the player's SYNC calibration: shifts judging and visuals to match what they hear)
  function tau(){return(getCtx().currentTime-lat()-R.T0-(typeof mgOffset==='function'?mgOffset():0))/R.beat;}
  function start(L){ // a level number, or {song, L} from YOUR BEATS
    const custom=typeof L==='object'?L:null;if(custom)L=custom.L;
    stop();
    $('phSelect').classList.remove('open');$('phResults').classList.remove('open');
    const lv=phBuild(L,custom&&custom.song);
    R={state:'play',lv,L,custom,beat:60/lv.P.bpm,attempt:0,fx:[],texts:[],shake:0,trail:[]};
    $('phTitle').textContent=custom?lv.P.name+' · '+lv.P.diff:L+'. '+lv.P.name;
    // left-hand pad keys jump, right-hand pad keys bounce (matches the two pads on screen)
    const lb=i=>(typeof padBindings!=='undefined'&&padBindings[i]&&padBindings[i].label)||'';
    // levels 1-5 are jump-only: the BOUNCE button arrives as a new mechanic on level 6
    R.solo=!lv.acts.some(a=>a.w==='b');$('phPads').classList.toggle('solo',R.solo);
    $('phJumpK').textContent=IS_DESKTOP?[[lb(0),lb(1)].concat(R.solo?[lb(2),lb(3)]:[]).filter(Boolean).join(' '),'SPACE'].filter(Boolean).join(' · '):'';
    $('phBounceK').textContent=IS_DESKTOP?[[lb(2),lb(3)].filter(Boolean).join(' '),'SHIFT'].filter(Boolean).join(' · '):'';
    // each button names the drum it plays on the beat (your pad sounds)
    [['phJumpSnd','j'],['phBounceSnd','b']].forEach(([id,w])=>{const sd=SOUND_MAP[phPadSound(w)]||{};const el=$(id);el.textContent='♪ '+(sd.name||phPadSound(w)).toUpperCase();el.style.setProperty('--sc',sd.color||'#fff');});
    R.cueI=0;
    resize();attempt(true);
    R.raf=requestAnimationFrame(frame);
  }
  function attempt(first,fromCp){
    const c=getCtx(),cp=fromCp?R.lv.cp:0;
    clearInterval(R.sched);
    R.attempt++;R.S=phNewState();R.ei=0;R.inputs=[];R.dead=null;R.won=0;R.trail=[];R.rings=[];
    if(fromCp){const k=R.cpSnap;R.S.s=cp;R.got=new Set(k.got);R.graded=new Set(k.graded);R.combo=0;R.maxCombo=k.maxCombo;R.timing=R.timing.slice(0,k.timing);R.onBeat=Object.assign({},k.onBeat);
      // restart the music from the flag, with a two-click count-in while the alien waits at the pole
      R.T0=c.currentTime+.25+2*R.beat-cp*R.beat;const at=cp*R.beat-1e-6;while(R.ei<R.lv.song.events.length&&R.lv.song.events[R.ei].t<at)R.ei++;
      for(let i=0;i<2;i++)playSound('rimshot',i?.5:.85,R.T0+(cp-2+i)*R.beat);
      R.texts.push({s:cp+.4,h:2.2,txt:'FROM THE FLAG',col:'#00ff99',life:1.4,sz:1});
    }else{R.got=new Set();R.cpHit=false;R.cpSnap=null;
    R.graded=new Set();R.combo=0;R.maxCombo=0;R.timing=[];R.onBeat={perfect:0,good:0,off:0};
    R.T0=c.currentTime+(first?4*R.beat+.3:.25);}
    if(first)for(let i=0;i<4;i++)playSound('rimshot',i?.5:.85,R.T0-(4-i)*R.beat);
    R.sched=setInterval(schedule,25);schedule();
    $('phAtt').textContent=R.attempt;$('phDust').textContent='0';
  }
  function schedule(){
    if(!R||R.dead||R.state!=='play')return;
    const c=getCtx(),ahead=c.currentTime+.18,ev=R.lv.song.events;
    while(R.ei<ev.length&&R.T0+ev[R.ei].t<ahead){
      const e=ev[R.ei++],at=Math.max(c.currentTime,R.T0+e.t);
      try{if(e.kind==='drum')playSound(e.id,e.vel,at,e.ch);else if(typeof playRollNote==='function'&&SOUND_MAP[e.id])playRollNote(e.id,e.midi,at,e.dur,e.vel,e.layer==null?-1:e.layer);}catch(err){}
    }
  }

  // ── input (timestamped, applied inside the physics at the exact beat it happened) ──
  function input(w,ev){
    if(!R||R.state!=='play'||R.dead)return;
    let t=tau();if(ev&&ev.timeStamp){const lag=(performance.now()-ev.timeStamp)/1000;if(lag>0&&lag<.25)t-=lag/R.beat;}
    if(t<R.S.s-.2)return;
    R.inputs.push({t:Math.max(R.S.s,t),w});
    // how close was that press to the beat it was meant for? (the level's planned presses)
    let best=-1,bd=.32;R.lv.acts.forEach((a,i)=>{if(a.w!==w||R.graded.has(i))return;const d=Math.abs(t-a.t);if(d<bd){bd=d;best=i;}});
    if(best>=0){
      R.graded.add(best);const ds=(t-R.lv.acts[best].t)*R.beat,ad=Math.abs(ds);
      const gr=ad<=.06?'perfect':ad<=.12?'good':'off';R.onBeat[gr]++;R.timing.push({d:ds,at:performance.now()});
      if(gr==='off')R.combo=0;else{R.combo++;R.maxCombo=Math.max(R.maxCombo,R.combo);}
      const S=R.S,tag=gr==='perfect'?'PERFECT':gr==='good'?'GOOD · '+(ds<0?'EARLY':'LATE'):(ds<0?'EARLY':'LATE');
      R.texts.push({s:S.s+.15,h:S.h+1.55,txt:tag,col:gr==='perfect'?'#00ff99':gr==='good'?'#7fd4ff':'#ffaa66',life:1,sz:gr==='perfect'?1.1:.9});
      if(gr==='perfect'){burst(S.s,S.h+.2,'#00ff99',8,.8);R.rings.push({s:S.s,h:S.h,life:1});}
      if(R.combo>0&&R.combo%10===0){R.texts.push({s:S.s+.9,h:S.h+2.3,txt:'ON-BEAT ×'+R.combo+'!',col:'#e8ff00',life:1.3,sz:1.35});try{playSound('spaceperc',.35);}catch(e){}}
    }
    if(R.solo)w='j';
    const pad=$(w==='j'?'phJump':'phBounce');pad.classList.remove('lit');void pad.offsetWidth;pad.classList.add('lit');
    try{playSound(phPadSound(w),.55);}catch(e){}
  }
  ['phJump','phBounce'].forEach((id,i)=>{const b=$(id);const w=i?'b':'j';
    b.addEventListener('pointerdown',e=>{e.preventDefault();input(w,e);});b.addEventListener('contextmenu',e=>e.preventDefault());});
  addEventListener('keydown',e=>{
    if(!ov.classList.contains('open'))return;
    if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(R&&R.state==='play'){stop();showSelect();}else close();return;}
    if(!R||R.state!=='play')return;
    let w=null;
    if(['Space','ArrowUp','KeyW'].includes(e.code))w='j';else if(['ShiftLeft','ShiftRight','ArrowDown','KeyS'].includes(e.code))w='b';
    else for(const [idx,b] of Object.entries(typeof padBindings!=='undefined'?padBindings:{}))if(b.key&&e.code===b.key){w=(+idx)%4<2?'j':'b';break;}
    if(w){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)input(w,e);}
  },true);
  if(typeof firePad==='function'){const _fire=firePad;firePad=function(idx){if(ov.classList.contains('open')){input(idx%4<2?'j':'b');return;}return _fire.apply(this,arguments);};}

  // ── frame: advance physics to the music, then draw ──
  function frame(){
    if(!R)return;R.raf=requestAnimationFrame(frame);
    const now=performance.now(),dt=Math.min(.05,(now-(R.lp||now))/1000);R.lp=now;
    const lv=R.lv,S=R.S;
    if(R.state==='play'&&!R.dead&&!R.won){
      try{padHud(tau());}catch(e){}
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
      if(lv.cp!=null&&!R.cpHit&&S.s>=lv.cp){R.cpHit=true;R.cpSnap={got:new Set(R.got),graded:new Set([...R.graded].filter(i=>lv.acts[i].t<lv.cp)),maxCombo:R.maxCombo,timing:R.timing.length,onBeat:Object.assign({},R.onBeat)};
        R.texts.push({s:lv.cp+.6,h:2.4,txt:'CHECKPOINT!',col:'#00ff99',life:1.5,sz:1.2});burst(lv.cp,1.6,'#00ff99',18,1.2);try{playSound('bell',.35);}catch(e){}}
      $('phDust').textContent=R.got.size;
      const pct=Math.max(0,Math.min(1,S.s/lv.end));$('phPct').textContent=Math.floor(pct*100)+'%';$('phProg').style.width=(pct*100)+'%';
      if(S.dead)die();
      else if(S.s>=lv.end)win();
    }
    draw(dt);
  }
  function die(){
    const S=R.S,pct=Math.max(0,Math.min(1,S.s/R.lv.end));R.dead={t:performance.now(),pct};clearInterval(R.sched);
    const st=R.custom?(phProgress.custom||(phProgress.custom={})):phProgress.best,K=R.custom?R.lv.P.custom:R.L;
    const b=st[K]||{};if(!b.cleared&&pct>(b.pct||0)){st[K]=Object.assign(b,{pct});}
    burst(S.s,S.h+.3,'#00ff88',30,1.6);burst(S.s,S.h+.3,'#ffffff',12,1);R.shake=12;
    try{playSound('zap',.6);}catch(e){}
    R.rt=setTimeout(()=>{if(R&&R.state==='play')attempt(false,!!R.cpHit);},900);
  }
  function win(){
    R.won=performance.now();clearInterval(R.sched);
    const L=R.L,P=R.lv.P,dust=R.lv.dust.length?R.got.size/R.lv.dust.length:1,stars=dust>=.9?3:dust>=.6?2:1;
    const st=R.custom?(phProgress.custom||(phProgress.custom={})):phProgress.best,K=R.custom?P.custom:L;
    const prev=st[K]||{},first=!R.custom&&!prev.cleared;
    st[K]={cleared:true,pct:1,stars:Math.max(stars,prev.stars||0),dust:Math.max(dust,prev.dust||0)};
    if(first)phMultiplier*=P.reward;
    if(R.lv.bossS<Infinity){R.shake=16;for(let k=0;k<4;k++)burst(R.S.s-2.2,2.4,['#ffd166','#ff66ff','#7fe8ff','#ffffff'][k],30,2);}
    if(typeof autoSave==='function')autoSave();if(typeof renderUI==='function')renderUI();
    R.finFx=0;setTimeout(()=>results(stars,dust,first),R.lv.bossS<Infinity?1900:1700);
  }
  function results(stars,dust,first){
    if(!R)return;R.state='done';
    const L=R.L,P=R.lv.P;
    $('phResInner').innerHTML=`
      <div class="ww-big win">${P.boss?'COMET ESCAPED!':'LEVEL CLEAR!'}</div>
      <div class="ww-d-name">${R.custom?P.name+' · '+P.diff:L+'. '+P.name}</div>
      <div class="ww-stars">${[1,2,3].map(k=>`<span class="${k<=stars?'on':''}">★</span>`).join('')}</div>
      <div class="ww-res-acc">${Math.round(dust*100)}%<small>stardust collected (60% ★★ · 90% ★★★)</small></div>
      <div class="ww-res-grid"><div><b>${R.got.size} / ${R.lv.dust.length}</b><small>STARDUST</small></div><div><b>${R.attempt}</b><small>ATTEMPTS</small></div>
        <div><b style="color:#00ff99">${R.onBeat.perfect}</b><small>PERFECT BEATS</small></div><div><b>${R.maxCombo}</b><small>BEST ON-BEAT STREAK</small></div></div>
      <div class="ww-d-meta">${typeof mgTimingSummary==='function'?mgTimingSummary(R.timing):''}</div>
      ${first?`<div class="ww-reward">Permanent bonus: ×${P.reward} points!${L<15?' · Level '+(L+1)+' unlocked':''}</div>`:''}
      <div class="ww-res-btns"><button class="ww-btn" id="phRetry">RETRY</button>${!R.custom&&L<15?'<button class="ww-btn ww-play" id="phNext">NEXT LEVEL</button>':''}<button class="ww-btn" id="phLevels">LEVELS</button></div>`;
    $('phResults').classList.add('open');
    const again=R.custom;$('phRetry').addEventListener('click',()=>start(again||L));
    const nx=$('phNext');if(nx)nx.addEventListener('click',()=>{sel=L+1;start(L+1);});
    $('phLevels').addEventListener('click',()=>{if(!again)sel=L<15?L+1:L;stop();showSelect();});
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
    const pl=PH_PLANETS[R.lv.P.planet],key=W+'x'+H+':'+R.lv.P.planet+':'+(R.lv.P.cave?1:0);if(bg&&bgKey===key)return;bgKey=key;
    bg=document.createElement('canvas');bg.width=cv.width;bg.height=cv.height;const b=bg.getContext('2d');b.scale(DPR,DPR);
    const rnd=wwRng(99+R.lv.P.planet);
    if(R.lv.P.cave){
      // underground: the rock of this world, deep shadows, and glowing crystals in the far wall
      const C=PH_CAVE[R.lv.P.planet],cg=b.createLinearGradient(0,0,0,H);cg.addColorStop(0,C.wall[0]);cg.addColorStop(1,C.wall[1]);b.fillStyle=cg;b.fillRect(0,0,W,H);
      for(let i=0;i<14;i++){const x=rnd()*W,y=rnd()*H*.8,rx=60+rnd()*200,ry=40+rnd()*120;b.fillStyle=C.blob;b.beginPath();b.ellipse(x,y,rx,ry,rnd()*3,0,Math.PI*2);b.fill();}
      for(let i=0;i<9;i++){const x=rnd()*W,y=H*.15+rnd()*H*.55,r=30+rnd()*90,gg=b.createRadialGradient(x,y,0,x,y,r);gg.addColorStop(0,C.glow+'40');gg.addColorStop(1,C.glow+'00');b.fillStyle=gg;b.fillRect(x-r,y-r,r*2,r*2);
        b.fillStyle=C.glow;b.globalAlpha=.55;for(let k=0;k<4;k++){const a=-1.2+rnd()*2.4,l=6+rnd()*16;b.save();b.translate(x+(rnd()-.5)*20,y+(rnd()-.5)*12);b.rotate(a);b.beginPath();b.moveTo(-2.5,0);b.lineTo(0,-l);b.lineTo(2.5,0);b.fill();b.restore();}b.globalAlpha=1;}
      return;
    }
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
    // a second world in each sky: a blue home planet over Luna, a pale moon over Glacia, a red giant over Magmora
    const pn=R.lv.P.planet,qx=W*(pn===2?.62:.5),qy=H*(pn===2?.2:.1),qr=Math.min(W,H)*(pn===2?.16:.04);
    const qg=b.createRadialGradient(qx-qr*.35,qy-qr*.35,qr*.1,qx,qy,qr);
    if(pn===0){qg.addColorStop(0,'#bfe8ff');qg.addColorStop(.5,'#3a8ad8');qg.addColorStop(1,'#0c2a5a');}
    else if(pn===1){qg.addColorStop(0,'#fff2f6');qg.addColorStop(1,'#a88ca0');}
    else{qg.addColorStop(0,'rgba(255,200,120,.9)');qg.addColorStop(.6,'rgba(220,60,30,.55)');qg.addColorStop(1,'rgba(120,10,10,0)');}
    b.fillStyle=qg;b.beginPath();b.arc(qx,qy,qr,0,Math.PI*2);b.fill();
    if(pn===0){b.fillStyle='rgba(90,170,90,.55)';b.beginPath();b.ellipse(qx+qr*.15,qy-qr*.1,qr*.35,qr*.22,.4,0,Math.PI*2);b.fill();}
  }

  // ── art: themes + detail painters ──
  const PH_CAVE=[
    {wall:['#0b0a16','#1d1a30'],blob:'rgba(0,0,0,.28)',glow:'#9d8cff',ceil:['#2c2942','#121022'],tip:'#4a4668',mote:'rgba(170,160,255,.6)'},
    {wall:['#03101e','#0c2c44'],blob:'rgba(0,10,25,.35)',glow:'#7fe8ff',ceil:['#1d4d70','#0a2033'],tip:'#bfeaff',mote:'rgba(200,245,255,.7)'},
    {wall:['#120403','#2e0c06'],blob:'rgba(0,0,0,.35)',glow:'#ff6a1a',ceil:['#3a1a12','#140605'],tip:'#5a2a1a',mote:'rgba(255,150,60,.75)'}];
  // the cave roof: a band of this world's rock overhead with stalactites and glowing crystals
  function drawCeiling(lv,S,CX,CY,ang,s0,s1,t,stopAt){
    const C=PH_CAVE[lv.P.planet],CH=4.9,r0=RP+CH*UP,r1=RP+40*UP,a0=ang(s0-1),a1=ang(Math.min(s1+1,stopAt));if(a1<=a0)return;
    const cg=g.createRadialGradient(CX,CY,r0,CX,CY,r0+UP*3);cg.addColorStop(0,C.ceil[0]);cg.addColorStop(1,C.ceil[1]);
    g.fillStyle=cg;g.beginPath();g.arc(CX,CY,r0,a0,a1);g.arc(CX,CY,r1,a1,a0,true);g.closePath();g.fill();
    g.strokeStyle=C.glow+'55';g.lineWidth=2;g.beginPath();g.arc(CX,CY,r0,a0,a1);g.stroke();
    for(let k=Math.floor((s0-1)/.7);k<=(s1+1)/.7;k++){const ss=k*.7+hsh(k,11)*.35;if(ss>stopAt-.2)continue;
      const len=.35+hsh(k,12)*1.05,w=.12+hsh(k,13)*.14,[ax,ay]=P(ss-w,CH+.05),[bx,by]=P(ss+w,CH+.05),[cx,cy]=P(ss,CH-len);
      g.fillStyle=C.ceil[0];g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo(bx,by);g.fill();
      g.strokeStyle=C.tip;g.lineWidth=1.2;g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.stroke();
      if(hsh(k,14)<.3){const gl=.5+.5*Math.sin(t*2+k),[gx,gy]=P(ss+.25,CH-.15),gg=g.createRadialGradient(gx,gy,0,gx,gy,UP*.6);gg.addColorStop(0,C.glow+'88');gg.addColorStop(1,C.glow+'00');
        g.globalAlpha=.5+.5*gl;g.fillStyle=gg;g.beginPath();g.arc(gx,gy,UP*.6,0,Math.PI*2);g.fill();g.fillStyle=C.glow;g.beginPath();g.moveTo(gx-3,gy-2);g.lineTo(gx,gy+UP*.28);g.lineTo(gx+3,gy-2);g.fill();g.globalAlpha=1;}}
  }
  // finish line scenery: a crater to dive into, a cave mouth out to daylight, or a warp portal
  function drawFinish(lv,S,CX,CY,ang,s0,s1,t){
    const e=lv.end,f=lv.P.finish,pl=lv.P.planet,C=PH_CAVE[pl];
    if(e>s1+4||e<s0-6)return;
    if(f==='dive'){const a=e+1,b=e+2.8,A0=ang(a),A1=ang(b);
      const hg=g.createRadialGradient(CX,CY,RP-3.2*UP,CX,CY,RP);hg.addColorStop(0,C.glow+'66');hg.addColorStop(.35,C.wall[1]);hg.addColorStop(1,'#020208');
      g.fillStyle=hg;g.beginPath();g.arc(CX,CY,RP+1,A0,A1);g.arc(CX,CY,RP-3.2*UP,A1,A0,true);g.closePath();g.fill();
      const T=PH_THEME[pl];[[a-.45,a+.05],[b-.05,b+.45]].forEach(([u,v])=>{const pts=[];for(let i=0;i<=8;i++){const ss=u+(v-u)*i/8;pts.push(P(ss,Math.sin(i/8*Math.PI)*.38));}pts.push(P(v,0),P(u,0));g.fillStyle=T.crust;poly(pts.map(q=>[q[0],q[1]]));g.fill();g.strokeStyle=T.top;g.lineWidth=2;g.stroke();});
      const gl=.5+.5*Math.sin(t*3),[gx,gy]=P((a+b)/2,-.6),gg=g.createRadialGradient(gx,gy,0,gx,gy,UP*1.6);gg.addColorStop(0,C.glow+'55');gg.addColorStop(1,C.glow+'00');g.globalAlpha=.6+.4*gl;g.fillStyle=gg;g.beginPath();g.arc(gx,gy,UP*1.6,0,Math.PI*2);g.fill();g.globalAlpha=1;
    }else if(f==='exit'){
      // daylight beyond the cave mouth
      const pp=PH_PLANETS[pl],A0=ang(e+1),A1=ang(s1+8);if(A1>A0){
        const sg=g.createRadialGradient(CX,CY,RP,CX,CY,RP+14*UP);sg.addColorStop(0,'#fffbe8');sg.addColorStop(.25,pp.glow);sg.addColorStop(1,pp.sky[1]);
        g.fillStyle=sg;g.beginPath();g.arc(CX,CY,RP-2,A0,A1);g.arc(CX,CY,RP+40*UP,A1,A0,true);g.closePath();g.fill();}
      const [mx,my]=P(e+1.2,2.2),lg=g.createRadialGradient(mx,my,0,mx,my,UP*4.5);lg.addColorStop(0,'rgba(255,250,225,.75)');lg.addColorStop(1,'rgba(255,250,225,0)');g.fillStyle=lg;g.beginPath();g.arc(mx,my,UP*4.5,0,Math.PI*2);g.fill();
    }else{
      const nxt=pl===0?'#7fe8ff':pl===1?'#ff7a33':'#ffd166',[px,py,pf]=P(e+1.6,1.4),rr=UP*1.25;g.save();g.translate(px,py);g.rotate(pf);
      const vg=g.createRadialGradient(0,0,0,0,0,rr);vg.addColorStop(0,'#ffffff');vg.addColorStop(.35,nxt+'cc');vg.addColorStop(1,nxt+'22');g.fillStyle=vg;g.beginPath();g.ellipse(0,0,rr*.6,rr,0,0,Math.PI*2);g.fill();
      g.shadowColor=nxt;g.shadowBlur=18;g.strokeStyle=nxt;g.lineWidth=4;for(let k=0;k<2;k++){g.beginPath();g.ellipse(0,0,rr*.6+k*5,rr+k*7,0,t*2*(k?-1:1),t*2*(k?-1:1)+Math.PI*1.6);g.stroke();}g.shadowBlur=0;g.restore();
    }
  }
  const PH_THEME=[
    {body:'#3e3e4c',deep:'#1c1c26',crust:'#8d8d9c',top:'#cfcfdc',strata:'rgba(0,0,0,.16)',rock:['#c7c2ea','#5a5682'],spike:['#e4e6ee','#8a8d9c'],bglow:'#b9a8ff',chasm:['#16161f','#010104'],ridge:['#2c2a44','#15142a']},
    {body:'#27597e',deep:'#0d2440',crust:'#9fd4f2',top:'#f4fcff',strata:'rgba(20,60,100,.22)',rock:['#d6f1ff','#5f9bc6'],spike:['#f6feff','#8cc9ea'],bglow:'#7fe8ff',chasm:['#0f3354','#01060f'],ridge:['#173a5a','#0a1d33']},
    {body:'#2a1410',deep:'#120706',crust:'#4e2a20',top:'#6e3d2c',strata:'rgba(255,120,40,.10)',rock:['#4a2c26','#160a08'],spike:['#3a2a30','#0e0608'],bglow:'#ff7a33',chasm:['#ff6a1a','#7a1500'],ridge:['#300c0c','#160505']}];
  const hsh=(k,n)=>{const x=Math.sin(k*127.1+n*311.7)*43758.5453;return x-Math.floor(x);};
  function poly(pts){g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();}
  // a far-off mountain ridge behind the horizon, turning at under half the planet's speed
  function drawRidge(lv,S,CX,CY,t){
    const T=PH_THEME[lv.P.planet],pl=lv.P.planet,N=48,f0=-(AX+40)/RP,f1=(W-AX+40)/RP,pts=[];
    for(let i=0;i<=N;i++){const f=f0+(f1-f0)*i/N,q=f*RP/BP+S.s*.45;
      const hgt=pl===1?Math.abs(Math.sin(q*.9))*1.1+Math.abs(Math.sin(q*2.3+1))*.6:pl===2?Math.max(0,1-Math.abs(((q*.35)%2+2)%2-1)*2.4)*1.05+Math.sin(q*1.7)*.15+.3:.55+Math.sin(q*.7)*.35+Math.sin(q*1.9+2)*.2;
      const r=RP+(.25+hgt)*UP*1.25;pts.push([CX+r*Math.sin(f),CY-r*Math.cos(f),f,q,hgt]);}
    const base=[...pts].reverse().map(p=>[CX+(RP-4)*Math.sin(p[2]),CY-(RP-4)*Math.cos(p[2])]);
    const rg=g.createLinearGradient(0,GY-UP*3,0,GY);rg.addColorStop(0,T.ridge[0]);rg.addColorStop(1,T.ridge[1]);
    g.fillStyle=rg;poly(pts.map(p=>[p[0],p[1]]).concat(base));g.fill();
    if(pl===1){g.strokeStyle='rgba(220,245,255,.35)';g.lineWidth=2;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();}  // snowy edge
    if(pl===2)pts.forEach(p=>{if(p[4]>1.25){const gl=.5+.5*Math.sin(t*3+p[3]);g.fillStyle=`rgba(255,120,30,${.35+.4*gl})`;g.beginPath();g.arc(p[0],p[1],3+3*gl,0,Math.PI*2);g.fill();}}); // volcano glow
  }
  // pebbles, craters, snow drifts, ice cracks, lava veins…
  function drawDecor(pl,k,sx,t){
    const r1=hsh(k,2),r2=hsh(k,3),[x,y,f]=P(sx,0);g.save();g.translate(x,y);g.rotate(f);
    if(pl===0){
      if(r1<.45){const w=BP*(.08+r2*.12);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(0,UP*.06,w,w*.32,0,0,Math.PI*2);g.fill();g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=1.5;g.beginPath();g.ellipse(0,UP*.06,w,w*.32,0,.1,Math.PI-.1);g.stroke();}
      else{const w=BP*(.03+r2*.05);g.fillStyle='#6a6a7a';g.beginPath();g.ellipse(0,-w*.35,w,w*.7,0,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(-w*.3,-w*.6,w*.4,w*.22,0,0,Math.PI*2);g.fill();}
    }else if(pl===1){
      if(r1<.4){const w=BP*(.12+r2*.18);g.fillStyle='#f6fdff';g.beginPath();g.ellipse(0,0,w,UP*(.07+r2*.08),0,Math.PI,Math.PI*2);g.fill();}
      else if(r1<.75){g.strokeStyle='rgba(30,90,140,.45)';g.lineWidth=1.4;g.beginPath();g.moveTo(0,0);g.lineTo(BP*.03,UP*.18);g.lineTo(-BP*.02,UP*.32);g.lineTo(BP*.04,UP*.5);g.stroke();}
      else{const tw=.5+.5*Math.sin(t*4+k);g.fillStyle=`rgba(255,255,255,${.3+.6*tw})`;const z=2+2*tw;g.beginPath();g.moveTo(0,-UP*.1-z);g.lineTo(z*.3,-UP*.1);g.lineTo(0,-UP*.1+z);g.lineTo(-z*.3,-UP*.1);g.fill();}
    }else{
      if(r1<.5){const gl=.5+.5*Math.sin(t*2.4+k*1.3);g.strokeStyle=`rgba(255,${110+60*gl|0},30,${.45+.45*gl})`;g.lineWidth=2;g.beginPath();g.moveTo(0,UP*.05);g.lineTo(BP*.05,UP*.2);g.lineTo(-BP*.03,UP*.36);g.lineTo(BP*.06,UP*.55);g.stroke();}
      else{const w=BP*(.04+r2*.06);g.fillStyle='#1a0c0a';g.beginPath();g.moveTo(-w,0);g.lineTo(-w*.4,-w*1.1);g.lineTo(w*.5,-w*.8);g.lineTo(w,0);g.fill();g.strokeStyle='rgba(255,110,40,.5)';g.lineWidth=1;g.stroke();}
    }
    g.restore();
  }
  // a chasm with jagged walls (+ void stars on Luna, icicles on Glacia, a lava pool on Magmora)
  function drawPit(lv,p,t,CX,CY,ang){
    const T=PH_THEME[lv.P.planet],pl=lv.P.planet,D=2.4,steps=7,L=[],Rr=[];
    for(let i=0;i<=steps;i++){const d=i/steps*D;L.push(P(p.a+(hsh(p.a*13+i,4)-.5)*.07+d*.02,-d));Rr.push(P(p.b+(hsh(p.b*13+i,5)-.5)*.07-d*.02,-d));}
    const outline=L.map(q=>[q[0],q[1]]).concat([...Rr].reverse().map(q=>[q[0],q[1]]));
    const gr=g.createRadialGradient(CX,CY,RP-D*UP,CX,CY,RP);
    if(pl===2){gr.addColorStop(0,'#ffd23a');gr.addColorStop(.35,'#ff5a1a');gr.addColorStop(.75,'#3a0e06');gr.addColorStop(1,'#1a0806');}
    else{gr.addColorStop(0,T.chasm[1]);gr.addColorStop(.7,T.chasm[0]);gr.addColorStop(1,T.body);}
    g.fillStyle=gr;poly(outline);g.fill();
    // lit wall edges
    g.strokeStyle=pl===2?'rgba(255,120,40,.55)':pl===1?'rgba(200,240,255,.5)':'rgba(255,255,255,.18)';g.lineWidth=2;
    [L,Rr].forEach(side=>{g.beginPath();side.slice(0,5).forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();});
    if(pl===0){g.save();poly(outline);g.clip();
      for(let k=0;k<8;k++){const ss=p.a+(p.b-p.a)*hsh(p.a+k,6),dd=-.8-hsh(p.a+k,8)*1.4,[x,y]=P(ss,dd);g.fillStyle=`rgba(200,200,255,${.3+.5*(.5+.5*Math.sin(t*2+k))})`;g.fillRect(x,y,1.5,1.5);}g.restore();}
    if(pl===1){[[p.a,1],[p.b,-1]].forEach(([e,dir])=>{for(let k=0;k<3;k++){const ss=e+dir*(.04+k*.07),len=.25+hsh(e+k,2)*.35;const [x1,y1]=P(ss-.025,-.02),[x2,y2]=P(ss+.025,-.02),[x3,y3]=P(ss,-len);
      g.fillStyle='rgba(225,248,255,.9)';g.beginPath();g.moveTo(x1,y1);g.lineTo(x3,y3);g.lineTo(x2,y2);g.fill();}});}
    if(pl===2){g.fillStyle='rgba(255,225,130,.85)';for(let k=0;k<4;k++){const ss=p.a+(p.b-p.a)*((k+.5)/4),bub=(t*1.2+k*.31+p.a)%1;const [x,y]=P(ss,-1.25+bub*.8);g.globalAlpha=1-bub;g.beginPath();g.arc(x,y,2.5+bub*4,0,Math.PI*2);g.fill();}g.globalAlpha=1;
      const [hx,hy]=P((p.a+p.b)/2,.2),hr=Math.min(BP*1.6,BP*(p.b-p.a)*.5+20),hg=g.createRadialGradient(hx,hy,2,hx,hy,hr);hg.addColorStop(0,'rgba(255,120,30,.25)');hg.addColorStop(1,'rgba(255,80,20,0)');g.fillStyle=hg;g.beginPath();g.arc(hx,hy,hr,0,Math.PI*2);g.fill();}
  }
  // rock pillars / ice blocks / basalt — and floating asteroid chunks
  function drawBlock(pl,b,t){
    const T=PH_THEME[pl],n=10,top=[],bot=[],under=b.fl?b.h-.32:-.05;
    for(let i=0;i<=n;i++)top.push(P(b.a+(b.b-b.a)*i/n,b.h));
    if(b.fl){for(let i=n;i>=0;i--){const ss=b.a+(b.b-b.a)*i/n,mid=1-Math.abs(i/n-.5)*2;bot.push(P(ss,under-mid*.55-hsh(ss*9,1)*.12));}}
    else for(let i=n;i>=0;i--)bot.push(P(b.a+(b.b-b.a)*i/n,under));
    const outline=top.concat(bot).map(q=>[q[0],q[1]]);
    const [mx,my]=P((b.a+b.b)/2,b.h),[nx,ny]=P((b.a+b.b)/2,b.fl?under-.6:under);
    const gr=g.createLinearGradient(mx,my,nx,ny);gr.addColorStop(0,T.rock[0]);gr.addColorStop(1,T.rock[1]);
    g.save();g.shadowColor=T.bglow;g.shadowBlur=9;g.fillStyle=gr;poly(outline);g.fill();g.restore();g.strokeStyle=T.bglow+'8c';g.lineWidth=1.6;poly(outline);g.stroke();
    // strata / glowing cracks / ice facets inside
    g.save();poly(outline);g.clip();
    g.strokeStyle=pl===2?'rgba(255,110,30,.55)':pl===1?'rgba(255,255,255,.35)':'rgba(40,34,80,.22)';g.lineWidth=pl===2?1.6:1.2;
    for(let k=1;k<=3;k++){const hh=b.h-k*(b.fl?.18:b.h/4);g.beginPath();for(let i=0;i<=n;i++){const ss=b.a+(b.b-b.a)*i/n,[x,y]=P(ss,hh+(pl===2?(hsh(ss*7+k,3)-.5)*.12:0));i?g.lineTo(x,y):g.moveTo(x,y);}
      if(pl===2)g.globalAlpha=.5+.5*Math.sin(t*2+k);g.stroke();g.globalAlpha=1;}
    if(pl===0){for(let k=0;k<Math.ceil((b.b-b.a)*2.2);k++){const ss=b.a+(k+.5)/2.2+(hsh(b.a*13+k,2)-.5)*.2,hh=(b.fl?b.h-.18:b.h*(.25+hsh(b.a*7+k,4)*.55)),[x,y]=P(ss,hh),r=UP*(.06+hsh(b.a+k,6)*.08);
      g.fillStyle='rgba(40,34,80,.35)';g.beginPath();g.ellipse(x,y,r*1.4,r,0,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(x,y+r*.35,r*1.1,r*.45,0,0,Math.PI);g.fill();}}
    if(pl===1){g.fillStyle='rgba(255,255,255,.18)';const [q1x,q1y]=P(b.a+(b.b-b.a)*.15,b.h),[q2x,q2y]=P(b.a+(b.b-b.a)*.35,b.h),[q3x,q3y]=P(b.a+(b.b-b.a)*.1,under);g.beginPath();g.moveTo(q1x,q1y);g.lineTo(q2x,q2y);g.lineTo(q3x,q3y);g.fill();}
    g.restore();
    // top: lit edge, snow cap or ember crust
    g.lineWidth=pl===1?UP*.12:2.5;g.strokeStyle=pl===1?'#ffffff':pl===2?'rgba(255,130,50,.8)':'#ece8ff';
    g.beginPath();top.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();
    if(pl===1)for(let k=0;k<3;k++){const [x,y]=P(b.a+(b.b-b.a)*(.2+.3*k),b.h-.08);g.fillStyle='#ffffff';g.beginPath();g.ellipse(x,y+UP*.05,UP*.05,UP*.11,0,0,Math.PI*2);g.fill();}
    if(b.fl&&pl!==2){const [gx,gy]=P((b.a+b.b)/2,under-.9);g.fillStyle=pl===1?'rgba(127,232,255,.18)':'rgba(160,168,255,.14)';g.beginPath();g.ellipse(gx,gy,BP*(b.b-b.a)*.4,UP*.12,0,0,Math.PI*2);g.fill();}
  }
  // faceted crystal spikes: rock shards, icicles, glowing obsidian
  function drawSpike(pl,sp,t){
    const T=PH_THEME[pl],[ax,ay]=P(sp.s-sp.w/2,0),[bx,by]=P(sp.s+sp.w/2,0),[cx,cy]=P(sp.s,sp.h),[mx,my]=P(sp.s+sp.w*.06,0);
    // danger glow so spikes read instantly against the ground
    const hz=pl===1?'#ff3d9a':pl===2?'#ffb02e':'#ff4d5e',gp=.65+.35*Math.sin(t*6+sp.s*2);
    const [hx,hy]=P(sp.s,sp.h*.35),hr=Math.max(BP*sp.w*1.1,UP*.75),hg=g.createRadialGradient(hx,hy,0,hx,hy,hr);
    hg.addColorStop(0,hz+'99');hg.addColorStop(1,hz+'00');g.fillStyle=hg;g.globalAlpha=gp;g.beginPath();g.arc(hx,hy,hr,0,Math.PI*2);g.fill();g.globalAlpha=1;
    g.save();g.shadowColor=hz;g.shadowBlur=14+10*gp;g.strokeStyle=hz;g.lineWidth=3.2;g.lineJoin='round';
    g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo(bx,by);g.stroke();g.restore();
    g.fillStyle=T.spike[1];g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo(mx,my);g.fill();
    g.fillStyle=T.spike[0];g.beginPath();g.moveTo(mx,my);g.lineTo(cx,cy);g.lineTo(bx,by);g.fill();
    const [sx1,sy1]=P(sp.s-sp.w*.42,0),[sx2,sy2]=P(sp.s-sp.w*.18,0),[st,stt]=P(sp.s-sp.w*.32,sp.h*.45);   // a small companion shard
    g.fillStyle=T.spike[1];g.beginPath();g.moveTo(sx1,sy1);g.lineTo(st,stt);g.lineTo(sx2,sy2);g.fill();
    g.strokeStyle=pl===1?'rgba(255,255,255,.9)':'rgba(255,255,255,.35)';g.lineWidth=1.2;g.beginPath();g.moveTo(mx,my);g.lineTo(cx,cy);g.stroke();
    if(pl===1){const tw=.5+.5*Math.sin(t*5+sp.s*3);g.fillStyle=`rgba(255,255,255,${.4+.6*tw})`;g.beginPath();g.arc(cx,cy,1.5+2*tw,0,Math.PI*2);g.fill();}
    if(pl===2){const gl=.6+.4*Math.sin(t*6+sp.s*5),tg=g.createRadialGradient(cx,cy,0,cx,cy,UP*.3);tg.addColorStop(0,`rgba(255,200,80,${gl})`);tg.addColorStop(1,'rgba(255,80,20,0)');g.fillStyle=tg;g.beginPath();g.arc(cx,cy,UP*.3,0,Math.PI*2);g.fill();}
  }
  // the living sky: asteroid belt (Luna), aurora + snow (Glacia), embers (Magmora), shooting stars everywhere
  function drawSky(lv,S,t){
    const pl=lv.P.planet;
    if(lv.P.cave){const C=PH_CAVE[pl];g.fillStyle=C.mote;for(let i=0;i<34;i++){const x=((hsh(i,4)*W-S.s*BP*.12+Math.sin(t*.4+i)*20)%W+W)%W,y=((hsh(i,6)*H*.75+(pl===2?-1:1)*t*(6+hsh(i,7)*10))%(H*.75)+H*.75)%(H*.75);g.globalAlpha=.4+.6*Math.abs(Math.sin(t+i));g.beginPath();g.arc(x,y,1+hsh(i,8)*1.8,0,Math.PI*2);g.fill();}g.globalAlpha=1;return;}
    if(pl===0){for(let i=0;i<46;i++){const u=((hsh(i,1)+t*.006+S.s*.002)%1),x=u*(W+60)-30,y=H*.1+u*H*.18+Math.sin(i)*H*.05,z=1+hsh(i,2)*2.6;g.fillStyle=`rgba(170,165,190,${.35+hsh(i,3)*.4})`;g.beginPath();g.ellipse(x,y,z,z*.7,i,0,Math.PI*2);g.fill();}}
    if(pl===1){for(let k=0;k<3;k++){g.beginPath();const y0=H*(.12+k*.08),amp=H*.05;for(let i=0;i<=24;i++){const x=i/24*W,y=y0+Math.sin(i*.45+t*.5+k*2)*amp;i?g.lineTo(x,y):g.moveTo(x,y);}
        for(let i=24;i>=0;i--){const x=i/24*W,y=y0+Math.sin(i*.45+t*.5+k*2)*amp+H*(.06+.03*Math.sin(i*.3+t+k));g.lineTo(x,y);}g.closePath();
        const ag=g.createLinearGradient(0,y0-amp,0,y0+amp+H*.09);ag.addColorStop(0,'rgba(80,255,190,0)');ag.addColorStop(.5,k===1?'rgba(140,120,255,.14)':'rgba(80,255,190,.14)');ag.addColorStop(1,'rgba(80,255,190,0)');g.fillStyle=ag;g.fill();}
      g.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<40;i++){const x=((hsh(i,4)*W-S.s*BP*.15-t*12*hsh(i,5))%W+W)%W,y=((hsh(i,6)*H+t*(18+hsh(i,7)*26))%(H*.75));g.beginPath();g.arc(x,y,1+hsh(i,8)*1.4,0,Math.PI*2);g.fill();}}
    if(pl===2){for(let i=0;i<36;i++){const life=(t*(.12+hsh(i,4)*.18)+hsh(i,5))%1,x=((hsh(i,6)*W-S.s*BP*.1+Math.sin(t+i)*12)%W+W)%W,y=GY-life*H*.7;g.fillStyle=`rgba(255,${120+hsh(i,7)*90|0},40,${(1-life)*.8})`;g.beginPath();g.arc(x,y,1+hsh(i,8)*2,0,Math.PI*2);g.fill();}
      const hz=g.createLinearGradient(0,GY-H*.35,0,GY);hz.addColorStop(0,'rgba(255,60,20,0)');hz.addColorStop(1,'rgba(255,70,20,.18)');g.fillStyle=hz;g.fillRect(0,GY-H*.35,W,H*.35);}
    // a shooting star every few seconds
    const per=5.5,ph=(t%per)/per,seed=Math.floor(t/per);if(ph<.12){const k=ph/.12,x0=W*(.15+hsh(seed,1)*.6),y0=H*(.05+hsh(seed,2)*.2),x=x0+k*W*.22,y=y0+k*H*.1;
      const sg=g.createLinearGradient(x,y,x-W*.08,y-H*.035);sg.addColorStop(0,`rgba(255,255,255,${1-k})`);sg.addColorStop(1,'rgba(255,255,255,0)');g.strokeStyle=sg;g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x-W*.08,y-H*.035);g.stroke();}
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
    drawSky(lv,S,t);
    const s0=S.s-(AX+60)/BP,s1=S.s+(W-AX+60)/BP;
    const CX=AX,CY=GY+RP,ang=s=>(s-S.s)*BP/RP-Math.PI/2;
    // ── distant ridge (turns slower than the planet = depth) ──
    drawRidge(lv,S,CX,CY,t);
    if(lv.P.finish==='exit')drawFinish(lv,S,CX,CY,ang,s0,s1,t);   // daylight sits behind the ground
    // ── planet body + crust ──
    const T=PH_THEME[lv.P.planet];
    const pg=g.createRadialGradient(CX,CY,RP*.82,CX,CY,RP);pg.addColorStop(0,T.deep);pg.addColorStop(1,T.body);
    g.fillStyle=pg;g.beginPath();g.arc(CX,CY,RP,0,Math.PI*2);g.fill();
    const a0=ang(s0)-.02,a1=ang(s1)+.02;
    const cg=g.createRadialGradient(CX,CY,RP-.75*UP,CX,CY,RP);cg.addColorStop(0,T.body);cg.addColorStop(.55,T.crust);cg.addColorStop(1,T.top);
    g.fillStyle=cg;g.beginPath();g.arc(CX,CY,RP,a0,a1);g.arc(CX,CY,RP-.75*UP,a1,a0,true);g.closePath();g.fill();
    g.strokeStyle=T.strata;g.lineWidth=1.5;[.28,.52,.9,1.4].forEach(d=>{g.beginPath();g.arc(CX,CY,RP-d*UP,a0,a1);g.stroke();});
    // surface details, fixed to the planet so it visibly rotates
    for(let k=Math.floor(s0/.55);k<=s1/.55;k++){const sx=k*.55+hsh(k,1)*.3;if(lv.pits.some(p=>sx>p.a-.15&&sx<p.b+.15))continue;drawDecor(lv.P.planet,k,sx,t);}
    // rim glow pulses on the beat
    g.strokeStyle=pl.glow;g.globalAlpha=.2+.4*pulse;g.lineWidth=2+3*pulse;g.beginPath();g.arc(CX,CY,RP,ang(s0),ang(s1));g.stroke();g.globalAlpha=1;
    // low-gravity zones: a shimmering bubble with motes drifting up
    lv.zones.forEach(z=>{if(z.b<s0||z.a>s1)return;
      const zg=g.createRadialGradient(CX,CY,RP,CX,CY,RP+3*UP);zg.addColorStop(0,'rgba(120,200,255,.18)');zg.addColorStop(1,'rgba(120,200,255,0)');
      g.fillStyle=zg;g.beginPath();g.arc(CX,CY,RP+3*UP,ang(z.a),ang(z.b));g.arc(CX,CY,RP,ang(z.b),ang(z.a),true);g.fill();
      g.fillStyle='rgba(190,235,255,.55)';for(let k=0;k<14;k++){const ms=z.a+(z.b-z.a)*hsh(k,7),mh=((t*.35+hsh(k,9))%1)*2.8;const [mx,my]=P(ms,mh);g.beginPath();g.arc(mx,my,1.6+hsh(k,3)*1.6,0,Math.PI*2);g.fill();}
      const [x,y,f]=P(Math.max(z.a+.6,Math.min(z.b-.6,S.s+2)),2.4);g.save();g.translate(x,y);g.rotate(f);g.fillStyle='rgba(170,225,255,.75)';g.font=`${Math.round(UP*.38)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.fillText('LOW GRAVITY',0,0);g.restore();});
    if(lv.P.finish==='dive'||lv.P.finish==='portal')drawFinish(lv,S,CX,CY,ang,s0,s1,t);
    if(lv.P.cave)drawCeiling(lv,S,CX,CY,ang,s0,s1,t,lv.P.finish==='exit'?lv.end+1:Infinity);
    // ── pits: real chasms ──
    lv.pits.forEach(p=>{if(p.b<s0-.2||p.a>s1+.2)return;drawPit(lv,p,t,CX,CY,ang);});
    // ── blocks + floating platforms ──
    lv.blocks.forEach(b=>{if(b.b<s0-.2||b.a>s1+.2)return;drawBlock(lv.P.planet,b,t);});
    // ── spikes: faceted crystals (meteors drop in during comet chases) ──
    lv.spikes.forEach(sp=>{if(sp.s<s0-1||sp.s>s1+1)return;
      let drop=0;if(sp.meteor){drop=Math.max(0,(sp.s-S.s-1.3)*2.2);}
      if(drop>0){const [x,y]=P(sp.s,sp.h*.5+drop);const [tx,ty]=P(sp.s+.9,sp.h*.5+drop+1.8);
        const tg=g.createLinearGradient(x,y,tx,ty);tg.addColorStop(0,'rgba(255,170,60,.85)');tg.addColorStop(1,'rgba(255,60,20,0)');g.strokeStyle=tg;g.lineWidth=BP*.16;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();g.lineCap='butt';
        const mg=g.createRadialGradient(x-BP*.04,y-BP*.04,1,x,y,BP*.14);mg.addColorStop(0,'#fff4c0');mg.addColorStop(.4,'#ffb84d');mg.addColorStop(1,'#a03a10');g.fillStyle=mg;g.beginPath();g.arc(x,y,BP*.14,0,Math.PI*2);g.fill();return;}
      drawSpike(sp.meteor?2:lv.P.planet,sp,t);});
    // ── bounce pads: little hover pads with thrusters ──
    lv.pads.forEach(p=>{if(p.s<s0-1||p.s>s1+1)return;const gone=S.padsDropped.has(p);
      const fall=gone?Math.min(3,(S.s-p.s)*2):0,[x,y,f]=P(p.s,-fall*.6);g.save();g.translate(x,y);g.rotate(f);g.globalAlpha=gone?Math.max(0,1-fall/2):1;
      const w=p.w/2*BP,fl=UP*(.35+.12*Math.sin(t*30+p.s*7));
      const th=g.createLinearGradient(0,UP*.08,0,UP*.08+fl);th.addColorStop(0,'rgba(255,170,255,.9)');th.addColorStop(1,'rgba(255,77,255,0)');
      g.fillStyle=th;g.beginPath();g.moveTo(-w*.35,UP*.08);g.lineTo(0,UP*.08+fl);g.lineTo(w*.35,UP*.08);g.fill();
      const rim=g.createLinearGradient(0,-UP*.06,0,UP*.12);rim.addColorStop(0,'#d8dbe6');rim.addColorStop(1,'#5a5e6e');
      g.fillStyle=rim;g.beginPath();g.ellipse(0,UP*.03,w,UP*.11,0,0,Math.PI*2);g.fill();
      g.shadowColor='#ff4dff';g.shadowBlur=10+10*pulse;g.fillStyle='#ff4dff';g.beginPath();g.ellipse(0,-UP*.01,w*.82,UP*.07+UP*.03*pulse,0,0,Math.PI*2);g.fill();g.shadowBlur=0;
      g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.ellipse(-w*.15,-UP*.03,w*.35,UP*.025,0,0,Math.PI*2);g.fill();
      if(!gone){g.strokeStyle=`rgba(255,77,255,${.5*(1-pulse)})`;g.lineWidth=2;g.beginPath();g.ellipse(0,0,w*(1+pulse*.8),UP*.11*(1+pulse*.8),0,0,Math.PI*2);g.stroke();}
      g.restore();
      // faint arc to where it will throw you
      if(!gone&&p.s>S.s-.3&&p.s<S.s+5){g.strokeStyle='rgba(255,77,255,.22)';g.setLineDash([4,6]);g.lineWidth=2;g.beginPath();const T2=p.next-p.s,gz=phZoneG(lv,p.s);for(let i=0;i<=12;i++){const u=i/12*T2,hh=gz*T2/2*u-gz*u*u/2;const [qx,qy]=P(p.s+u,hh);i?g.lineTo(qx,qy):g.moveTo(qx,qy);}g.stroke();g.setLineDash([]);}});
    // ── teaching signs: a little post before each new idea ──
    (lv.signs||[]).forEach(sg=>{if(sg.s<s0-4||sg.s>s1+1)return;const [x,y,f]=P(sg.s,0);g.save();g.translate(x,y);g.rotate(f);
      const fs=Math.round(Math.max(14,UP*.34));g.font=`${fs}px 'Bebas Neue',sans-serif`;const tw=g.measureText(sg.txt).width+fs*1.1,bh=fs*1.5,by=-UP*1.25-bh;
      g.fillStyle='#5a4a3a';g.fillRect(-2.5,by+bh-2,5,-by-bh+2);
      g.fillStyle='rgba(8,10,24,.88)';g.strokeStyle=pl.glow;g.lineWidth=2;g.shadowColor=pl.glow;g.shadowBlur=8+6*pulse;
      g.beginPath();if(g.roundRect)g.roundRect(-tw/2,by,tw,bh,6);else g.rect(-tw/2,by,tw,bh);g.fill();g.stroke();g.shadowBlur=0;
      g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(sg.txt,0,by+bh/2+1);g.restore();});
    // ── checkpoint flag ──
    if(lv.cp!=null&&lv.cp>s0-1&&lv.cp<s1+1){const [x,y,f]=P(lv.cp,0),on=R.cpHit;g.save();g.translate(x,y);g.rotate(f);
      const ph=UP*1.9;g.fillStyle='#c8ccd8';g.fillRect(-2,-ph,4,ph);g.fillStyle=on?'#00ff99':'#7a7f90';g.beginPath();g.arc(0,-ph,4,0,Math.PI*2);g.fill();
      const wv=Math.sin(t*6)*UP*.06;g.fillStyle=on?'#00ff99':'#8a8fa0';if(on){g.shadowColor='#00ff99';g.shadowBlur=14;}
      g.beginPath();g.moveTo(2,-ph+2);g.quadraticCurveTo(UP*.45,-ph+UP*.18+wv,UP*.85,-ph+UP*.25);g.quadraticCurveTo(UP*.45,-ph+UP*.38-wv,2,-ph+UP*.5);g.fill();g.shadowBlur=0;g.restore();}
    // ── glowing press markers on the first few of each new idea (where perfect play presses) ──
    lv.acts.forEach(a=>{if(!a.tut||a.t<S.s-.4||a.t>s1)return;const near=Math.max(0,1-Math.abs(a.t-S.s)/3),[x,y]=P(a.t,(a.h||0)+.45);
      const r=Math.max(14,UP*.3)*(1+.15*pulse),col=a.w==='j'?'#00e5ff':'#ff4dff';g.globalAlpha=Math.min(1,.6+near)*(a.t<S.s?Math.max(0,1+(a.t-S.s)/.4):1);
      g.strokeStyle=col;g.lineWidth=2.5;g.fillStyle='rgba(5,8,20,.7)';g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();g.stroke();
      g.fillStyle=col;g.font=`${Math.round(r*1.2)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(a.w==='j'?'J':'B',x,y+1);g.globalAlpha=1;});
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
    let es=S.s,eh=S.h,ea=1,esc=1;
    if(R.won){const u=(performance.now()-R.won)/1000/R.beat,e=lv.end,f=lv.P.finish;
      if(f==='dive'){es=e+Math.min(u,1.15)*1.6;eh=Math.max(-4.5,4*u-4*u*u);ea=eh<-.4?Math.max(0,1+(eh+.4)/2.2):1;
        if(u>1.25&&!R.finFx){R.finFx=1;burst(e+1.9,-.2,PH_CAVE[lv.P.planet].glow,22,1.2);}}
      else if(f==='exit'){es=e+u*1.7;eh=Math.abs(Math.sin(u*Math.PI))*.45;ea=Math.max(0,1-Math.max(0,u-1.1)/.8);}
      else{const k=Math.min(1,u/1.1);es=e+k*1.6;eh=Math.sin(k*Math.PI*.5)*1.4;esc=Math.max(0,1-Math.max(0,u-.9)/.5);if(u>1.3&&!R.finFx){R.finFx=1;burst(e+1.6,1.4,'#ffffff',26,1.4);}}}
    const [ax,ay]=P(es,eh);
    if(!R.dead&&ea>0&&esc>0){R.trail.push([ax,ay]);if(R.trail.length>10)R.trail.shift();
      R.trail.forEach((p,i)=>{g.fillStyle=`rgba(0,255,136,${i/R.trail.length*.25})`;g.beginPath();g.arc(p[0]-(R.trail.length-i)*BP*.035,p[1]-UP*.35,UP*.12*(i/R.trail.length),0,Math.PI*2);g.fill();});
      const as=Math.max(26,UP*.85),col=(typeof getAlienColor==='function')?getAlienColor(0):'#00ff88';
      // shadow on the ground
      const [shx,shy]=P(S.s,phSupport(lv,S,S.s,S.h).top??-1);if(!R.won&&(!phInPit(lv,S.s)||S.h>-0.1)){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(shx,shy,as*.4*(1/(1+S.h*.4)),as*.1,0,0,Math.PI*2);g.fill();}
      const land=Math.max(0,1-(S.s-S.landT)*5);
      g.save();g.globalAlpha=ea;g.translate(ax,ay-as*.48);g.rotate(-S.flip*Math.PI*2+(R.won&&lv.P.finish==='portal'?(1-esc)*6:0));g.scale((1+land*.18)*esc,(1-land*.18)*esc);
      g.shadowColor=col;g.shadowBlur=14;g.font=`${Math.round(as)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('👽',0,0);g.shadowBlur=0;g.globalAlpha=1;g.restore();
    }
    // perfect rings, on-beat pulse at the alien's feet, floating timing words, the early/late meter
    const fp=Math.pow(1-((S.s%1)+1)%1,4);if(!R.dead&&S.grounded){const [fx,fy,ff]=P(S.s,0);g.save();g.translate(fx,fy);g.rotate(ff);g.strokeStyle=`rgba(255,255,255,${.12+.4*fp})`;g.lineWidth=2;g.beginPath();g.ellipse(0,0,BP*(.18+.12*fp),UP*.08,0,0,Math.PI*2);g.stroke();g.restore();}
    R.rings=(R.rings||[]).filter(r=>(r.life-=dt*2.6)>0);R.rings.forEach(r=>{const [rx,ry]=P(r.s,r.h+.4),rr=UP*(.5+1.4*(1-r.life));g.strokeStyle=`rgba(0,255,153,${r.life*.8})`;g.lineWidth=3;g.beginPath();g.arc(rx,ry,rr,0,Math.PI*2);g.stroke();});
    R.texts=R.texts.filter(x=>(x.life-=dt*1.3)>0);R.texts.forEach(x=>{const [tx,ty]=P(x.s,x.h+(1-x.life)*.6);g.globalAlpha=Math.min(1,x.life*1.6);g.font=`${Math.round(Math.max(14,UP*.42)*(x.sz||1))}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=3;g.strokeText(x.txt,tx,ty);g.fillStyle=x.col;g.fillText(x.txt,tx,ty);});g.globalAlpha=1;
    if(typeof mgMeter==='function'&&R.timing)mgMeter(g,W/2,H-14,Math.min(260,W*.5),R.timing,performance.now());
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
