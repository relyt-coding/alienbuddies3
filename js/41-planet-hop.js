
// ══════════════════════════════════════════════
//  PLANET HOP — rhythm platformer around a rotating planet
//  Your alien runs over the curve of a spinning planet to the beat. JUMP (tap again in the air = double
//  jump) and BOUNCE (press as you land on a glowing bounce pad to spring to the next one).
//  Any hit restarts the level (you see how far you got). Stars come from the stardust you collect.
//  Levels 1–5 Luna · 6–10 Glacia (ice) · 11–15 Magmora (lava). Levels 5 / 10 / 15 end in a comet chase.
// ══════════════════════════════════════════════
let phMultiplier=1;               // (old saves only: Planet Hop now boosts Alien Gems, see 44-minigame-hub.js)
let phProgress={best:{}};         // best[L] = {stars, dust, pct, cleared}
function phLevelOpen(L){return (typeof TEST_MODE!=='undefined'&&TEST_MODE)||((typeof mgPhAccess!=='function'||mgPhAccess(L))&&(L===1||!!(phProgress.best[L-1]||{}).cleared));}
function phGemVal(b){return b&&b.cleared?((b.dust||0)>=.999?1:.5):0;}

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
      <div class="ww-sel-head"><div><div class="ww-big" style="color:#7fe8ff">PLANET HOP</div><div class="ww-sub">Run round the planet to the beat · JUMP, double jump, and BOUNCE across the glowing pads · a hit sends you back to the start, or to the checkpoint crystal once you light it</div></div><div style="display:flex;gap:6px"><button class="ww-btn mg-sync-btn" id="phSync" title="Calibrate your timing">⏱ SYNC</button><button class="ww-x" id="phClose" title="Close">✕</button></div></div>
      <div class="mg-tabs"><button class="mg-tab sel" id="phTabLv">LEVELS</button><button class="mg-tab" id="phTabMine">YOUR BEATS</button></div>
      <div id="phLvPane"><div class="ww-sel-bonus" id="phBonus"></div>
      <div class="ww-grid ph-grid" id="phGrid"></div>
      <div class="ww-detail" id="phDetail"></div></div>
      <div id="phMinePane" class="ww-detail" style="display:none"></div>
    </div></div>
    <div class="ww-panel" id="phResults"><div class="ww-panel-inner ww-res" id="phResInner" style="box-shadow:0 0 40px -10px #7fe8ff"></div></div>`;
  document.body.appendChild(ov);
  const cv=$('phCanvas'),g=mgLiteCtx(cv.getContext('2d'));
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

  const NEWS={1:'Jump on the beat — follow the glowing markers · then dive into the crater!',2:'Underground! NEW: rocks — land on top, then find the way out',3:'NEW: double jump — practise on flat ground, then clear wide pits',4:'NEW: low gravity on the moon — floaty two-beat jumps',5:'BOSS: a comet chases you round Luna · NEW: climbing rocks',6:'NEW BUTTON: BOUNCE — press it as you land on each glowing pad',7:'NEW: fast bounce chains · falling icicles · crystal bells you ring with BOUNCE',8:'NEW: floating ice platforms',9:'NEW: spike runs — jump on every beat',10:'BOSS: the frozen comet',11:'NEW: triple spikes — jump, then double jump on the "and"',12:'NEW: off-beat spikes — jump on the "and"',13:'NEW: tall rocks — double jump up onto them',14:'REMIX: everything you know, at speed',15:'FINAL BOSS: the supernova comet'};
  let tab='lv';const PH_DIFF_L={easy:3,normal:8,hard:13};
  const mineOpts={id:'phMine',note:'obstacles land on your beat',playStyle:'border-color:#7fe8ff;color:#7fe8ff;background:#071420',onPlay:song=>{const d=Object.keys(MG_DIFFS).find(k=>song.P.custom.endsWith('|'+k))||'normal';song.P.planet=MG_DIFFS[d].planet;start({song,L:PH_DIFF_L[d]});}};
  function showTab(t){tab=t;$('phTabLv').classList.toggle('sel',t==='lv');$('phTabMine').classList.toggle('sel',t==='mine');$('phLvPane').style.display=t==='lv'?'':'none';$('phMinePane').style.display=t==='mine'?'':'none';
    if(t==='mine'){mineOpts.best=phProgress.custom||{};mgRenderCustom($('phMinePane'),mineOpts);}}
  function showSelect(){
    $('phResults').classList.remove('open');$('phSelect').classList.add('open');showTab(tab);
    const stars=Object.values(phProgress.best).reduce((a,b)=>a+(b.stars||0),0);
    const gb=Object.values(phProgress.best).reduce((a,b)=>a+phGemVal(b),0);
    $('phBonus').innerHTML=`Planet Hop gem bonus: <b>+${gb}×</b> Alien Gems · ${stars} / 45 ★`;
    const gr=$('phGrid');gr.innerHTML='';
    for(let L=1;L<=15;L++){
      const b=document.createElement('button');b.className='ww-tile';const best=phProgress.best[L]||{},op=phLevelOpen(L);
      if(!op)b.classList.add('locked');if(L===sel)b.classList.add('sel');if(L%5===0)b.classList.add('boss');
      b.style.borderColor=L===sel?'':PH_PLANETS[phLevel(L).planet].glow+'55';
      b.innerHTML=`<span class="n">${op?L:'🔒'}</span><span class="st">${best.cleared?'★'.repeat(best.stars||1)+'<i>'+'★'.repeat(3-(best.stars||1))+'</i>':best.pct?Math.round(best.pct*100)+'%':'<i>★★★</i>'}</span>`;
      b.addEventListener('click',()=>{if(!op){showToast(typeof mgPhAccess==='function'&&!mgPhAccess(L)?'🔒 '+mgPhLockMsg(L):'Clear level '+(L-1)+' first');return;}sel=L;showSelect();});
      gr.appendChild(b);
    }
    const P=phLevel(sel),best=phProgress.best[sel],pl=PH_PLANETS[P.planet];
    $('phDetail').innerHTML=`<div class="ww-d-name">${sel}. ${P.name}</div>
      <div class="ww-d-meta">${pl.name} · ${P.bpm} BPM · ${P.style.toUpperCase()}</div>
      ${NEWS[sel]?`<div class="ww-d-new" style="color:${pl.glow}">${NEWS[sel]}</div>`:''}
      <div class="ww-d-meta">${best&&best.cleared?`Best: ${'★'.repeat(best.stars)}${'☆'.repeat(3-best.stars)} · stardust ${Math.round(best.dust*100)}%`:best&&best.pct?`Best run: ${Math.round(best.pct*100)}% · clear it: <b>+0.5×</b> Alien Gems (+1× with all stardust)`:`Clear it: <b>+0.5×</b> Alien Gems · all stardust: <b>+1×</b>`}</div>
      <button class="ww-play" id="phPlay" style="border-color:${pl.glow};color:${pl.glow};background:#071420">PLAY</button>`;
    $('phPlay').addEventListener('click',()=>start(sel));
  }

  // ── run ──
  // ── where you are changes how the music sounds ──
  // Every Planet Hop note (the song, the count-in and your pads) runs through this small bus. On open ground it's
  // transparent; LOW GRAVITY sweeps a resonant filter once per floaty two-beat jump; CAVES add a big dark room and a
  // dotted-eighth echo (lows cut from both, so the kick stays tight and the cave never gets muddy).
  let FXB=null;
  function caveIR(c){
    const sr=c.sampleRate,L=Math.round(sr*(MG_LITE?1.3:2.6)),ir=c.createBuffer(2,L,sr),taps=[[.011,.55],[.023,.42],[.037,.36],[.052,.3],[.071,.24],[.094,.18]];
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);let lp=0;
      for(let i=0;i<L;i++){const x=i/L;lp+=(Math.random()*2-1-lp)*(.18+.5*(1-x));d[i]=lp*Math.pow(1-x,2.6)*.9;}  // darker as it decays, like stone soaking up the highs
      taps.forEach(([tm,g2],k)=>{const i=Math.round((tm+(ch?.004*k:0))*sr);if(i<L)d[i]+=g2*(ch^(k&1)?1:-1);});}   // early reflections off the cave walls
    return ir;
  }
  function phBus(){
    const c=getCtx();if(FXB&&FXB.c===c)return FXB;
    const B={c},G=v=>{const n=c.createGain();n.gain.value=v;return n;},F=(type,f,q)=>{const n=c.createBiquadFilter();n.type=type;n.frequency.value=f;if(q!=null)n.Q.value=q;return n;};
    B.in=G(1);B.dry=G(1);const dest=drumMasterReal||drumMasterGain;
    // low gravity: resonant low-pass that breathes with an LFO (parked wide open when off)
    B.lp=F('lowpass',20000,.7);B.lfo=c.createOscillator();B.lfo.type='sine';B.lfo.frequency.value=.5;B.lfoG=G(0);B.lfo.connect(B.lfoG);B.lfoHz=!B.lp.detune;B.lfoG.connect(B.lp.detune||B.lp.frequency);B.lfo.start();
    B.in.connect(B.lp);B.lp.connect(B.dry);B.dry.connect(dest);
    // the game's normal reverb send, copied here so reverb tails get the same colouring
    if(rvbReal&&rvbReal.buffer){B.rvIn=c.createConvolver();B.rvIn.buffer=rvbReal.buffer;const rg=G(rvbGainNode?rvbGainNode.gain.value:.22);B.rvIn.connect(rg);rg.connect(B.in);}else B.rvIn=rvbNode;
    // shared wet path: high-passed, then into the cave room and the echo
    B.send=G(0);B.lp.connect(B.send);const hp=F('highpass',260,.7),top=F('lowpass',6500,.5);B.send.connect(hp);hp.connect(top);
    B.room=c.createConvolver();B.room.buffer=caveIR(c);B.roomG=G(0);top.connect(B.room);B.room.connect(B.roomG);B.roomG.connect(dest);
    B.dl=c.createDelay(2);B.dl.delayTime.value=.4;B.fb=G(.34);const fbf=F('lowpass',2400,.5);B.dlG=G(0);
    top.connect(B.dl);B.dl.connect(fbf);fbf.connect(B.fb);B.fb.connect(B.dl);B.dl.connect(B.dlG);B.dlG.connect(B.room);B.dlG.connect(dest);   // echoes also bloom into the room
    B.lg=false;B.cave=false;
    return FXB=B;
  }
  function phFx(lowG,cave){
    const B=phBus(),now=B.c.currentTime,tc=.06;
    if(R&&B._beat!==R.beat){B._beat=R.beat;B.lfo.frequency.setTargetAtTime(1/(2*R.beat),now,.01);B.dl.delayTime.setTargetAtTime(Math.min(1.9,R.beat*.75),now,.01);}
    if(lowG!==B.lg){B.lg=lowG;
      B.lp.frequency.setTargetAtTime(lowG?1500:20000,now,lowG?tc:tc*1.5);B.lp.Q.setTargetAtTime(lowG?4.5:.7,now,tc);
      B.lfoG.gain.setTargetAtTime(lowG?(B.lfoHz?800:1100):0,now,tc);B.dry.gain.setTargetAtTime(lowG?.82:1,now,tc);}   // a touch quieter so the resonance never jumps out
    // cave = how open the cave is right now (0 = a tight tunnel, 1 = a huge cavern): the room and echo grow with it
    const cv=cave===false||cave==null?-1:Math.max(0,Math.min(1,+cave)),wet=cv>=0?.1+.9*Math.pow(cv,1.3):lowG?.35:0;
    if(B._wet==null||Math.abs(B._wet-wet)>.015){B._wet=wet;B.send.gain.setTargetAtTime(wet,now,.35);B.roomG.gain.setTargetAtTime(cv>=0?.42:.3,now,.2);B.dlG.gain.setTargetAtTime(cv>=0?.26*cv:0,now,.35);}
  }
  // play a note through the bus (any track effects on a channel still take over, as everywhere else)
  function phSnd(id,vel,at,ch){const B=phBus(),d=drumMasterGain,r=rvbNode;drumMasterGain=B.in;rvbNode=B.rvIn;try{playSound(id,vel,at,ch);}finally{drumMasterGain=d;rvbNode=r;}}
  // ── Planet Hop's own sounds (all through the bus, so caves echo them too) ──
  const MV=()=>typeof masterVol!=='undefined'?masterVol:1,mtof=m=>440*Math.pow(2,(m-69)/12);
  function nbuf(c){if(!FXB._nb||FXB._nb.sampleRate!==c.sampleRate){const L=c.sampleRate*2,b=c.createBuffer(1,L,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<L;i++)d[i]=Math.random()*2-1;FXB._nb=b;}return FXB._nb;}
  function env(c,at,peak,att,dec){const g=c.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(peak,at+att);g.gain.exponentialRampToValueAtTime(.0005,at+att+dec);return g;}
  // a struck crystal: sine + a glassy inharmonic partial + a soft triangle body
  function sChime(midi,at,vel,len){const B=phBus(),c=B.c,f=mtof(midi),L=len||1.6,v=vel*MV();
    (MG_LITE?[[1,'sine',.24],[2.76,'sine',.08]]:[[1,'sine',.22],[2.76,'sine',.07],[1,'triangle',.06],[5.4,'sine',.025]]).forEach(([r,ty,a],i)=>{const o=c.createOscillator();o.type=ty;o.frequency.value=f*r;const e=env(c,at,a*v,.004,L/(1+i*.8));o.connect(e);e.connect(B.in);o.start(at);o.stop(at+L+.1);});}
  function sNoise(at,dur,vel,type,f0,f1,q){const B=phBus(),c=B.c,n=c.createBufferSource();n.buffer=nbuf(c);const fl=c.createBiquadFilter();fl.type=type;fl.Q.value=q||1;
    fl.frequency.setValueAtTime(f0,at);fl.frequency.exponentialRampToValueAtTime(f1,at+dur);const e=c.createGain();e.gain.setValueAtTime(0,at);e.gain.linearRampToValueAtTime(vel*MV(),at+dur*.6);e.gain.exponentialRampToValueAtTime(.0005,at+dur);
    n.connect(fl);fl.connect(e);e.connect(B.in);n.start(at,Math.random());n.stop(at+dur+.05);}
  // meteor: a falling whoosh for the beat before it lands, then a deep thud + crunch right on the 16th
  function sMeteor(land,beat,vel){const B=phBus(),c=B.c,v=vel*MV();
    sNoise(Math.max(c.currentTime,land-beat),Math.min(beat,land-c.currentTime),.09*vel,'bandpass',3200,380,2.2);
    const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(150,land);o.frequency.exponentialRampToValueAtTime(36,land+.3);const e=env(c,land,.75*v,.003,.42);o.connect(e);e.connect(B.in);o.start(land);o.stop(land+.5);
    sNoise(land,.28,.32*vel,'lowpass',2400,300,.7);}
  // icicle: a crack as it breaks free, then a glassy shatter as it lands
  function sIcicle(brk,land,vel){sNoise(brk,.07,.18*vel,'highpass',3500,5000,.8);
    sNoise(land,.22,.22*vel,'bandpass',6000,2500,1.5);[96,101,103,108].forEach((m,i)=>sChime(m+(i%2?0:-12),land+i*.012,.22*vel,.35));
    const B=phBus(),c=B.c,o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(110,land);o.frequency.exponentialRampToValueAtTime(45,land+.18);const e=env(c,land,.35*vel*MV(),.003,.25);o.connect(e);e.connect(B.in);o.start(land);o.stop(land+.3);}
  // checkpoint: a rising crystal arpeggio in the song's key, on the next 8th note
  function sCheckpoint(){if(!R)return;const c=getCtx(),sg=R.lv.song,bn=(c.currentTime-R.T0)/R.beat,at=R.T0+Math.ceil(bn*2+.1)/2*R.beat,sp=R.beat/4;
    [0,2,4,7].forEach((d,i)=>sChime(phDegMidi(sg,d)+36,at+i*sp,.55-i*.05,1.8));sChime(phDegMidi(sg,7)+48,at+4*sp,.3,2.4);}
  // warp portal: a hum that swells as you get close, then a rising warp when you jump in
  function sHumStart(){const B=phBus(),c=B.c,now=c.currentTime,f=mtof(R.lv.song.root+24),out=c.createGain();out.gain.setValueAtTime(0,now);out.gain.linearRampToValueAtTime(.05*MV(),now+R.beat*6);
    const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;lp.Q.value=3;const lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=2/R.beat;lg.gain.value=500;lfo.connect(lg);lg.connect(lp.frequency);
    const os=[1,1.006,1.5].map((r,i)=>{const o=c.createOscillator();o.type=i<2?'sawtooth':'triangle';o.frequency.value=f*r;o.connect(lp);o.start(now);return o;});lfo.start(now);lp.connect(out);out.connect(B.in);
    return{stop(fade){const t=c.currentTime,fd=fade||.3;out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+fd);os.concat([lfo]).forEach(o=>{try{o.stop(t+fd+.05);}catch(e){}});}};}
  function sWarp(at){const B=phBus(),c=B.c,o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(160,at);o.frequency.exponentialRampToValueAtTime(1500,at+.9);const e=env(c,at,.18*MV(),.25,.9);o.connect(e);e.connect(B.in);o.start(at);o.stop(at+1.3);
    sNoise(at,1,.14,'bandpass',300,5000,3);const sg=R.lv.song;[0,4,7,11].forEach((d,i)=>sChime(phDegMidi(sg,d)+48,at+.9+i*.06,.35,2));}
  // the ice world's wind: soft filtered noise that drifts with the music
  function sWindStart(at){const B=phBus(),c=B.c,n=c.createBufferSource();n.buffer=nbuf(c);n.loop=true;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=800;bp.Q.value=1.8;
    const lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=1/(8*R.beat);lg.gain.value=450;lfo.connect(lg);lg.connect(bp.frequency);const out=c.createGain();out.gain.setValueAtTime(0,at);out.gain.linearRampToValueAtTime(.05*MV(),at+R.beat*4);
    n.connect(bp);bp.connect(out);out.connect(B.in);n.start(at);lfo.start(at);
    return{stop(){const t=c.currentTime;out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+.6);try{n.stop(t+.7);lfo.stop(t+.7);}catch(e){}}};}
  function phLoopsOff(){if(!R)return;if(R.hum){R.hum.stop();R.hum=null;}if(R.wind){R.wind.stop();R.wind=null;}}
  function phRoll(id,midi,at,dur,vel,layer){const B=phBus(),d=drumMasterGain,r=rvbNode;drumMasterGain=B.in;rvbNode=B.rvIn;try{playRollNote(id,midi,at,dur,vel,layer);}finally{drumMasterGain=d;rvbNode=r;}}
  function stop(){if(!R)return;clearInterval(R.sched);cancelAnimationFrame(R.raf);clearTimeout(R.rt);try{phLoopsOff();}catch(e){}R.state='stopped';R=null;try{phFx(false,false);}catch(e){}}
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
    R.attempt++;R.S=phNewState();R.idleS=null;R.ei=0;R.inputs=[];R.dead=null;R.won=0;R.trail=[];R.rings=[];
    if(fromCp){const k=R.cpSnap;R.S.s=cp;R.got=new Set(k.got);R.graded=new Set(k.graded);R.combo=0;R.maxCombo=k.maxCombo;R.timing=R.timing.slice(0,k.timing);R.onBeat=Object.assign({},k.onBeat);
      // restart the music from the checkpoint crystal, with a two-click count-in
      R.T0=c.currentTime+.25+2*R.beat-cp*R.beat;const at=cp*R.beat-1e-6;while(R.ei<R.lv.song.events.length&&R.lv.song.events[R.ei].t<at)R.ei++;
      for(let i=0;i<2;i++)phSnd('rimshot',i?.5:.85,R.T0+(cp-2+i)*R.beat);
      R.texts.push({s:cp+.4,h:2.2,txt:'FROM THE CRYSTAL',col:'#bfe9ff',life:1.4,sz:1});
    }else{R.got=new Set();R.cpHit=false;R.cpSnap=null;
    R.graded=new Set();R.combo=0;R.maxCombo=0;R.timing=[];R.onBeat={perfect:0,good:0,off:0};
    R.T0=c.currentTime+(first?4*R.beat+.3:.25);}
    if(first)for(let i=0;i<4;i++)phSnd('rimshot',i?.5:.85,R.T0-(4-i)*R.beat);
    R.lv.falls=R.lv.falls||R.lv.spikes.filter(sp=>sp.lt!=null).sort((a,b)=>a.lt-b.lt);R.fi=0;while(R.fi<R.lv.falls.length&&R.lv.falls[R.fi].lt<cp+.01)R.fi++;R.landed=new Set();
    phLoopsOff();if(R.lv.P.planet===1&&!MG_LITE)R.wind=sWindStart(R.T0-(fromCp?2:first?4:0)*R.beat);
    R.sched=setInterval(schedule,25);schedule();
    $('phAtt').textContent=R.attempt;$('phDust').textContent='0';
  }
  function schedule(){
    if(!R||R.dead||R.state!=='play')return;
    const c=getCtx(),ahead=c.currentTime+.18,ev=R.lv.song.events;
    while(R.ei<ev.length&&R.T0+ev[R.ei].t<ahead){
      const e=ev[R.ei++],at=Math.max(c.currentTime,R.T0+e.t);
      try{if(e.kind==='drum')phSnd(e.id,e.vel,at,e.ch);else if(e.kind==='ice')sChime(e.midi,at,e.vel,2.2);else if(typeof playRollNote==='function'&&SOUND_MAP[e.id])phRoll(e.id,e.midi,at,e.dur,e.vel,e.layer==null?-1:e.layer);}catch(err){}
    }
    // meteors and icicles make their sound on the beat they land
    const F=R.lv.falls;while(R.fi<F.length&&R.T0+(F[R.fi].lt-1)*R.beat<ahead){const sp=F[R.fi++],land=R.T0+sp.lt*R.beat;if(land<c.currentTime)continue;
      try{if(sp.icicle)sIcicle(Math.max(c.currentTime,land-.3*R.beat),land,.8);else sMeteor(land,R.beat,.8);}catch(err){}}
  }

  // ── input (timestamped, applied inside the physics at the exact beat it happened) ──
  function input(w,ev){
    if(!R||R.state!=='play'||R.dead)return;
    let t=tau();if(ev&&ev.timeStamp){const lag=(performance.now()-ev.timeStamp)/1000;if(lag>0&&lag<.25)t-=lag/R.beat;}
    // during the count-in (or the checkpoint count-in) you can hop on the spot for fun: nothing is judged
    if(t<R.S.s-.15){const I=R.idleS||(R.idleS={h:0,vy:0,air:1});if(I.h<=0&&I.vy<=0){I.vy=PH_V0;I.air=1;}else if(I.air>0){I.vy=PH_V0;I.air=0;}const pd=$(w==='j'||R.solo?'phJump':'phBounce');pd.classList.remove('lit');void pd.offsetWidth;pd.classList.add('lit');try{phSnd(phPadSound(R.solo?'j':w),.55);}catch(e){}return;}
    R.inputs.push({t:Math.max(R.S.s,t),w});
    // how close was that press to the beat it was meant for? (the level's planned presses)
    let best=-1,bd=.32;R.lv.acts.forEach((a,i)=>{if(a.w!==w||R.graded.has(i))return;const d=Math.abs(t-a.t);if(d<bd){bd=d;best=i;}});
    if(best>=0){
      R.graded.add(best);const ds=(t-R.lv.acts[best].t)*R.beat,ad=Math.abs(ds);
      const gr=ad<=.06?'perfect':ad<=.12?'good':'off';R.onBeat[gr]++;R.timing.push({d:ds,at:performance.now()});
      if(gr==='off')R.combo=0;else{R.combo++;R.maxCombo=Math.max(R.maxCombo,R.combo);}
      // (judged quietly for the stats only: no PERFECT / EARLY / LATE text, your ears are the judge)
    }
    // a crystal bell nearby? BOUNCE rings it, snapped onto its beat like any instrument
    if(w==='b'&&!R.solo)R.lv.dust.forEach((d,i)=>{if(!d.bell||R.got.has(i)||Math.abs(t-d.s)>.4)return;R.got.add(i);d.bell.rung=performance.now();
      const c=getCtx();try{sChime(d.bell.midi,Math.max(c.currentTime,R.T0+d.s*R.beat),.75,2.6);sChime(d.bell.midi+12,Math.max(c.currentTime,R.T0+d.s*R.beat),.2,1.6);}catch(e){}burst(d.s,d.h,'#ff9dff',12,.9);burst(d.s,d.h,'#ffffff',6,.6);});
    if(R.solo)w='j';
    const pad=$(w==='j'?'phJump':'phBounce');pad.classList.remove('lit');void pad.offsetWidth;pad.classList.add('lit');
    try{phSnd(phPadSound(w),.55);}catch(e){}
  }
  ['phJump','phBounce'].forEach((id,i)=>{const b=$(id);const w=i?'b':'j';
    b.addEventListener('pointerdown',e=>{e.preventDefault();input(w,e);});b.addEventListener('contextmenu',e=>e.preventDefault());
    // stop iOS's double-tap zoom / text magnifier on the buttons
    ['touchstart','touchend','dblclick','selectstart'].forEach(ev=>b.addEventListener(ev,e=>{if(e.cancelable)e.preventDefault();},{passive:false}));});
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
    // music environment: low-gravity filter while you're inside a zone, cave room underground (fades as you walk out into daylight)
    try{const lowG=R.state==='play'&&!R.dead&&!R.won&&lv.zones.some(z=>S.s>=z.a&&S.s<z.b),outside=R.won&&lv.P.finish==='exit'&&now-R.won>R.beat*600;
      phFx(lowG,lv.P.cave&&!outside?(phCaveH(lv,S.s)-3.6)/3.6:false);}catch(e){}
    if(R.state==='play'&&!R.dead&&!R.won){
      try{padHud(tau());}catch(e){}
      // count-in hops (with double jump) run on their own little physics; if you're still in the air when the
      // music starts, the real run carries on from that height instead of snapping you to the ground
      if(R.idleS){const I=R.idleS;if(tau()<S.s){const db=dt/R.beat;I.vy-=PH_G*db;I.h+=I.vy*db;if(I.h<=0){R.idleS=null;S.landT=S.s;}}
        else{if(I.h>0){S.h=I.h;S.vy=I.vy;S.grounded=false;S.air=I.air;}R.idleS=null;}}
      const target=Math.min(tau(),lv.end+.01);
      R.inputs.sort((a,b)=>a.t-b.t);
      let guard=0;
      while(S.s<target&&!S.dead&&guard++<2400){
        while(R.inputs.length&&R.inputs[0].t<=S.s){const i=R.inputs.shift();const r=i.w==='j'?phJump(lv,S):phBounce(lv,S);if(r==='double')burst(S.s,S.h,'#00e5ff',10,.7);if(r==='bounce'){burst(S.s,S.h,'#ff4dff',16,1);R.shake=Math.max(R.shake,3);}}
        const wasG=S.grounded;phStep(lv,S,PH_DT);
        if(!wasG&&S.grounded&&S.s>1)burst(S.s,S.h,'#ccccdd',5,.5);
      }
      // the portal starts humming as it comes into view
      if(lv.P.finish==='portal'&&!R.hum&&S.s>lv.end-7)try{R.hum=sHumStart();}catch(e){}
      // meteors / icicles hitting the ground
      (lv.falls||[]).forEach(sp=>{if(!R.landed.has(sp)&&S.s>=sp.lt&&S.s<sp.lt+1){R.landed.add(sp);burst(sp.s,.1,sp.icicle?'#e8fbff':'#ffb84d',sp.icicle?14:18,1.2);burst(sp.s,.05,sp.icicle?'#9fd4f2':'#8d8d9c',10,.8);R.shake=Math.max(R.shake,sp.icicle?3:6);}});
      // stardust
      lv.dust.forEach((d,i)=>{if(!d.bell&&!R.got.has(i)&&Math.abs(d.s-S.s)<.24&&Math.abs(d.h-(S.h+.45))<.55){R.got.add(i);burst(d.s,d.h,'#ffe680',6,.5);}});
      if(lv.cp!=null&&!R.cpHit&&S.s>=lv.cp){R.cpHit=true;R.cpSnap={got:new Set(R.got),graded:new Set([...R.graded].filter(i=>lv.acts[i].t<lv.cp)),maxCombo:R.maxCombo,timing:R.timing.length,onBeat:Object.assign({},R.onBeat)};
        try{sCheckpoint();}catch(e){}R.texts.push({s:lv.cp+.6,h:2.4,txt:'CHECKPOINT!',col:'#bfe9ff',life:1.5,sz:1.2});burst(lv.cp,1.1,'#ffffff',14,1.1);burst(lv.cp,1.1,'#7cc8ff',22,1.3);}
      $('phDust').textContent=R.got.size;
      const pct=Math.max(0,Math.min(1,S.s/lv.end));$('phPct').textContent=Math.floor(pct*100)+'%';$('phProg').style.width=(pct*100)+'%';
      if(S.dead)die();
      else if(S.s>=lv.end)win();
    }
    draw(dt);
  }
  function die(){
    const S=R.S,pct=Math.max(0,Math.min(1,S.s/R.lv.end));R.dead={t:performance.now(),pct};clearInterval(R.sched);phLoopsOff();
    const st=R.custom?(phProgress.custom||(phProgress.custom={})):phProgress.best,K=R.custom?R.lv.P.custom:R.L;
    const b=st[K]||{};if(!b.cleared&&pct>(b.pct||0)){st[K]=Object.assign(b,{pct});}
    burst(S.s,S.h+.3,'#00ff88',30,1.6);burst(S.s,S.h+.3,'#ffffff',12,1);R.shake=12;
    try{playSound('zap',.6);}catch(e){}
    R.rt=setTimeout(()=>{if(R&&R.state==='play')attempt(false,!!R.cpHit);},900);
  }
  function win(){
    R.won=performance.now();clearInterval(R.sched);
    if(R.lv.P.finish==='portal'){try{sWarp(getCtx().currentTime+R.beat*.5);}catch(e){}if(R.hum)R.hum.stop(R.beat*2.5);R.hum=null;}
    if(R.wind){R.wind.stop();R.wind=null;}
    const L=R.L,P=R.lv.P,dust=R.lv.dust.length?R.got.size/R.lv.dust.length:1,stars=dust>=.9?3:dust>=.6?2:1;
    const st=R.custom?(phProgress.custom||(phProgress.custom={})):phProgress.best,K=R.custom?P.custom:L;
    const prev=st[K]||{},first=!R.custom&&!prev.cleared;
    st[K]={cleared:true,pct:1,stars:Math.max(stars,prev.stars||0),dust:Math.max(dust,prev.dust||0)};
    R.gemGain=R.custom?0:phGemVal(st[K])-phGemVal(prev);   // +0.5× gems for a clear, +1× in total with all the stardust
    if(R.lv.bossS<Infinity){R.shake=16;for(let k=0;k<4;k++)burst(R.S.s-2.2,2.4,['#ffd166','#ff66ff','#7fe8ff','#ffffff'][k],30,2);}
    if(typeof autoSave==='function')autoSave();if(typeof renderUI==='function')renderUI();
    R.finFx=0;setTimeout(()=>results(stars,dust,first),R.lv.bossS<Infinity?1900:1700);
  }
  function results(stars,dust,first){
    if(!R)return;R.state='done';phLoopsOff();
    const L=R.L,P=R.lv.P;
    $('phResInner').innerHTML=`
      <div class="ww-big win">${P.boss?'COMET ESCAPED!':'LEVEL CLEAR!'}</div>
      <div class="ww-d-name">${R.custom?P.name+' · '+P.diff:L+'. '+P.name}</div>
      <div class="ww-stars">${[1,2,3].map(k=>`<span class="${k<=stars?'on':''}">★</span>`).join('')}</div>
      <div class="ww-res-acc">${Math.round(dust*100)}%<small>stardust collected (60% ★★ · 90% ★★★)</small></div>
      <div class="ww-res-grid"><div><b>${R.got.size} / ${R.lv.dust.length}</b><small>STARDUST</small></div><div><b>${R.attempt}</b><small>ATTEMPTS</small></div>
</div>
      ${R.gemGain>0?`<div class="ww-reward">💎 +${R.gemGain}× Alien Gems forever!${first&&L<15&&phLevelOpen(L+1)?' · Level '+(L+1)+' unlocked':''}</div>`:first&&L<15&&!phLevelOpen(L+1)?`<div class="ww-reward">🔒 Next: ${mgPhLockMsg(L+1)}</div>`:''}
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
    const a=cv.parentElement.getBoundingClientRect();DPR=MG_DPR();W=Math.max(10,a.width);H=Math.max(10,a.height);
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
    const C=PH_CAVE[lv.P.planet],r1=RP+40*UP,sa=s0-1,sb=Math.min(s1+1,stopAt);if(sb<=sa)return;
    // the roof rises into caverns and dips into tunnels (its height comes from the level, so it never gets in a jump's way)
    const edge=[];for(let ss=sa;ss<sb;ss+=.25)edge.push(P(ss,phCaveH(lv,ss)));edge.push(P(sb,phCaveH(lv,sb)));
    let lo=99;edge.forEach((q,i)=>{const h=phCaveH(lv,sa+i*.25);if(h<lo)lo=h;});const r0=RP+lo*UP;
    const cg=g.createRadialGradient(CX,CY,r0,CX,CY,r0+UP*3.5);cg.addColorStop(0,C.ceil[0]);cg.addColorStop(1,C.ceil[1]);
    g.fillStyle=cg;g.beginPath();edge.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.arc(CX,CY,r1,ang(sb),ang(sa),true);g.closePath();g.fill();
    g.strokeStyle=C.glow+'55';g.lineWidth=2;g.beginPath();edge.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();
    for(let k=Math.floor((s0-1)/.7);k<=(s1+1)/.7;k++){const ss=k*.7+hsh(k,11)*.35;if(ss>stopAt-.2)continue;
      if((lv.falls||[]).some(sp=>sp.icicle&&Math.abs(sp.s-ss)<.5))continue;   // leave room for the icicles that will fall
      const CH=phCaveH(lv,ss),len=(.35+hsh(k,12)*1.05)*Math.min(1.4,.75+(CH-3.3)*.15),w=.12+hsh(k,13)*.14,[ax,ay]=P(ss-w,CH+.05),[bx,by]=P(ss+w,CH+.05),[cx,cy]=P(ss,CH-len);
      g.fillStyle=C.ceil[0];g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo(bx,by);g.fill();
      g.strokeStyle=C.tip;g.lineWidth=1.2;g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.stroke();
      if(hsh(k,14)<.3){const gl=.5+.5*Math.sin(t*2+k),[gx,gy]=P(ss+.25,CH-.15),gg=g.createRadialGradient(gx,gy,0,gx,gy,UP*.6);gg.addColorStop(0,C.glow+'88');gg.addColorStop(1,C.glow+'00');
        g.globalAlpha=.5+.5*gl;g.fillStyle=gg;g.beginPath();g.arc(gx,gy,UP*.6,0,Math.PI*2);g.fill();g.fillStyle=C.glow;g.beginPath();g.moveTo(gx-3,gy-2);g.lineTo(gx,gy+UP*.28);g.lineTo(gx+3,gy-2);g.fill();g.globalAlpha=1;}}
  }
  // an icicle: hangs from the roof, shakes, snaps off a quarter-beat before it lands, then sticks in the ground as an ice shard
  function drawIcicle(lv,sp,S,t){
    const CH=phCaveH(lv,sp.s),len=Math.min(1.5,CH*.32),dropT=.25,k=(S.s-(sp.lt-dropT))/dropT;
    if(k<1){const shake=S.s>sp.lt-1.1?Math.sin(t*60)*.03*Math.min(1,(S.s-(sp.lt-1.1))/.8):0,fall=k>0?(CH-len)*k*k:0,top=CH-fall,ss=sp.s+shake,
        [ax,ay]=P(ss-.17,top),[bx,by]=P(ss+.17,top),[mx,my]=P(ss+.03,top),[cx,cy]=P(ss,top-len);
      g.fillStyle='rgba(200,240,255,.9)';g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo(mx,my);g.fill();
      g.fillStyle='rgba(255,255,255,.95)';g.beginPath();g.moveTo(mx,my);g.lineTo(cx,cy);g.lineTo(bx,by);g.fill();
      g.strokeStyle='rgba(127,232,255,.8)';g.lineWidth=1.2;g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo(bx,by);g.stroke();
      if(shake&&k<=0){g.fillStyle='rgba(220,245,255,.7)';for(let q=0;q<3;q++){const u=(t*2.2+q*.33)%1,[px,py]=P(sp.s+(hsh(q,5)-.5)*.3,CH-u*CH*.7);g.beginPath();g.arc(px,py,1.3,0,Math.PI*2);g.fill();}}
      return;}
    // landed: a faceted ice shard with broken bits around it
    const w=sp.w*.42,[ax,ay]=P(sp.s-w,0),[bx,by]=P(sp.s+w,0),[cx,cy]=P(sp.s+.04,sp.h*.92),[mx,my]=P(sp.s-.05,0);
    const hz='#7fe8ff';g.save();g.shadowColor=hz;g.shadowBlur=12;g.strokeStyle=hz;g.lineWidth=2.4;g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo(bx,by);g.stroke();g.restore();
    g.fillStyle='#bfe9ff';g.beginPath();g.moveTo(ax,ay);g.lineTo(cx,cy);g.lineTo(mx,my);g.fill();g.fillStyle='#f4fdff';g.beginPath();g.moveTo(mx,my);g.lineTo(cx,cy);g.lineTo(bx,by);g.fill();
    [[-.3,.12],[.28,.09],[.4,.06]].forEach(([d,hh],q)=>{const [x1,y1]=P(sp.s+d-.05,0),[x2,y2]=P(sp.s+d+.05,0),[x3,y3]=P(sp.s+d+(q-1)*.03,hh);g.fillStyle='rgba(230,250,255,.9)';g.beginPath();g.moveTo(x1,y1);g.lineTo(x3,y3);g.lineTo(x2,y2);g.fill();});
  }
  // finish line scenery: a crater to dive into, a cave mouth out to daylight, or a warp portal
  function drawFinish(lv,S,CX,CY,ang,s0,s1,t){
    const e=lv.end,f=lv.P.finish,pl=lv.P.planet,C=PH_CAVE[pl];
    if(e>s1+4||e<s0-6)return;
    if(f==='dive'){
      // a clean crater: a smooth bowl with shaded walls, low rounded rims and a lit hole into the cave below
      const a=e+1,b=e+2.8,m=(a+b)/2,T=PH_THEME[pl],D=2.7,N=14,sL=[],sR=[],dd=[];
      for(let i=0;i<=N;i++){const u=i/N,ins=(1-Math.cos(u*Math.PI*.5))*.62;dd.push(u*D);sL.push(a+ins);sR.push(b-ins);}
      const top=[];for(let i=1;i<14;i++){const q=P(b-(b-a)*i/14,.02);top.push([q[0],q[1]]);}
      const wallL=sL.map((x,i)=>P(x,-dd[i])),wallR=sR.map((x,i)=>P(x,-dd[i]));
      const out=wallL.concat([...wallR].reverse()).map(q=>[q[0],q[1]]).concat(top);
      const wg=g.createRadialGradient(CX,CY,RP-D*UP,CX,CY,RP);wg.addColorStop(0,'#020208');wg.addColorStop(.6,pl===2?'#160604':'#0b0b18');wg.addColorStop(1,T.deep);
      g.fillStyle=wg;poly(out);g.fill();
      g.save();poly(out);g.clip();
      // shaded wall faces down both sides
      [wallL,wallR].forEach(pts=>{for(let k=0;k<3;k++){g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.lineWidth=BP*(.26-k*.08);g.strokeStyle=k===2?'rgba(255,255,255,.14)':k?T.crust:T.body;g.globalAlpha=k?.5:.75;g.stroke();}g.globalAlpha=1;});
      // a few faint rock layers following the bowl
      g.lineWidth=1.5;g.strokeStyle=T.strata;[.5,1.1,1.7].forEach(d=>{const i0=Math.round(d/D*N),[x0,y0]=P(sL[i0],-d),[x1,y1]=P(m,-d-.12),[x2,y2]=P(sR[i0],-d);g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo(x1,y1,x2,y2);g.stroke();});
      // glow from the cave below washing up the walls
      const [wx,wy]=P(m,-D),wgl=g.createRadialGradient(wx,wy,0,wx,wy,UP*2.6);wgl.addColorStop(0,C.glow+'66');wgl.addColorStop(1,C.glow+'00');g.fillStyle=wgl;g.fillRect(wx-UP*3,wy-UP*3,UP*6,UP*6);
      g.restore();
      // the hole at the bottom
      const pu=.5+.5*Math.sin(t*3),[hx,hy,hf]=P(m,-D),hw=Math.max(8,(sR[N]-sL[N])*BP*.5);
      const hg=g.createRadialGradient(hx,hy,0,hx,hy,UP*1.3);hg.addColorStop(0,C.glow+'99');hg.addColorStop(1,C.glow+'00');g.globalAlpha=.6+.4*pu;g.fillStyle=hg;g.beginPath();g.arc(hx,hy,UP*1.3,0,Math.PI*2);g.fill();g.globalAlpha=1;
      g.save();g.translate(hx,hy);g.rotate(hf);const og=g.createRadialGradient(0,0,0,0,0,hw);og.addColorStop(0,'#ffffff');og.addColorStop(.4,C.glow);og.addColorStop(1,C.glow+'00');
      g.fillStyle=og;g.beginPath();g.ellipse(0,0,hw*1.1,UP*.2,0,0,Math.PI*2);g.fill();g.restore();
      // a soft column of light rising out of it
      const [tx,ty]=P(m,.9),lg=g.createLinearGradient(hx,hy,tx,ty);lg.addColorStop(0,C.glow+'38');lg.addColorStop(1,C.glow+'00');g.fillStyle=lg;
      const c1=P(m-.25,-D),c2=P(m+.25,-D),c3=P(m+.55,.9),c4=P(m-.55,.9);g.beginPath();g.moveTo(c1[0],c1[1]);g.lineTo(c2[0],c2[1]);g.lineTo(c3[0],c3[1]);g.lineTo(c4[0],c4[1]);g.closePath();g.fill();
      // low, smooth rims curling over the edge
      [[a-.5,a+.06],[b-.06,b+.5]].forEach(([u,v])=>{const pts=[];for(let i=0;i<=16;i++){const ss=u+(v-u)*i/16;pts.push(P(ss,Math.pow(Math.sin(i/16*Math.PI),1.3)*.28));}pts.push(P(v,-.12),P(u,-.12));
        const rg=g.createLinearGradient(0,pts[8][1],0,pts[8][1]+UP*.45);rg.addColorStop(0,T.top);rg.addColorStop(.4,T.crust);rg.addColorStop(1,T.body);g.fillStyle=rg;poly(pts.map(q=>[q[0],q[1]]));g.fill();
        g.strokeStyle=T.top;g.globalAlpha=.8;g.lineWidth=1.8;g.beginPath();pts.slice(0,17).forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();g.globalAlpha=1;});
      // bobbing arrows: dive in here
      const bob=Math.sin(t*4)*.12;g.strokeStyle=C.glow;g.lineWidth=3;g.lineCap='round';g.lineJoin='round';
      for(let k=0;k<2;k++){const hh=1.25+bob-k*.32,[l1x,l1y]=P(m-.22,hh+.16),[cx2,cy2]=P(m,hh),[r1x,r1y]=P(m+.22,hh+.16);g.globalAlpha=.85-k*.3;g.beginPath();g.moveTo(l1x,l1y);g.lineTo(cx2,cy2);g.lineTo(r1x,r1y);g.stroke();}
      g.globalAlpha=1;g.lineCap='butt';g.lineJoin='miter';
    }else if(f==='exit'){
      // the world outside the cave mouth: sky, a sun low on the horizon, and lit hills
      const pp=PH_PLANETS[pl],T=PH_THEME[pl],A0=ang(e+1),A1=ang(s1+8);if(A1>A0){
        const sg=g.createRadialGradient(CX,CY,RP,CX,CY,RP+14*UP);sg.addColorStop(0,`rgb(${PH_DAY[pl]})`);sg.addColorStop(.16,pp.glow);sg.addColorStop(.55,pp.sky[1]);sg.addColorStop(1,pp.sky[0]);
        g.fillStyle=sg;g.beginPath();g.arc(CX,CY,RP-2,A0,A1);g.arc(CX,CY,RP+40*UP,A1,A0,true);g.closePath();g.fill();
        g.save();g.beginPath();g.arc(CX,CY,RP-2,A0,A1);g.arc(CX,CY,RP+40*UP,A1,A0,true);g.closePath();g.clip();
        const [sx,sy]=P(e+2.6,1.7),sr=UP*.7,sun=g.createRadialGradient(sx,sy,0,sx,sy,sr*3.2);sun.addColorStop(0,'#ffffff');sun.addColorStop(.28,'rgba(255,248,220,.95)');sun.addColorStop(.32,'rgba(255,236,190,.45)');sun.addColorStop(1,'rgba(255,236,190,0)');
        g.fillStyle=sun;g.beginPath();g.arc(sx,sy,sr*3.2,0,Math.PI*2);g.fill();
        [[.55,1.1,'ridge',.55],[.2,.7,'near',.8]].forEach(([base,amp,_,al],j)=>{g.beginPath();for(let i=0;i<=30;i++){const ss=e+1+i*.4,hh=base+amp*(.5+.5*Math.sin(ss*(.9+j*.7)+j*2))*(.6+.4*Math.sin(ss*2.3+j));const [x,y]=P(ss,hh);i?g.lineTo(x,y):g.moveTo(x,y);}
          for(let i=30;i>=0;i--){const [x,y]=P(e+1+i*.4,-.2);g.lineTo(x,y);}g.closePath();g.globalAlpha=al;g.fillStyle=j?T.ridge[0]:pp.glow+'66';g.fill();g.globalAlpha=1;});
        g.restore();}
      const [mx,my]=P(e+1.2,2.2),lg=g.createRadialGradient(mx,my,0,mx,my,UP*4.5);lg.addColorStop(0,'rgba(255,250,225,.75)');lg.addColorStop(1,'rgba(255,250,225,0)');g.fillStyle=lg;g.beginPath();g.arc(mx,my,UP*4.5,0,Math.PI*2);g.fill();
    }else{
      const nxt=pl===0?'#7fe8ff':pl===1?'#ff7a33':'#ffd166',[px,py,pf]=P(e+1.6,1.4),rr=UP*1.25;g.save();g.translate(px,py);g.rotate(pf);
      const vg=g.createRadialGradient(0,0,0,0,0,rr);vg.addColorStop(0,'#ffffff');vg.addColorStop(.35,nxt+'cc');vg.addColorStop(1,nxt+'22');g.fillStyle=vg;g.beginPath();g.ellipse(0,0,rr*.6,rr,0,0,Math.PI*2);g.fill();
      g.shadowColor=nxt;g.shadowBlur=18;g.strokeStyle=nxt;g.lineWidth=4;for(let k=0;k<2;k++){g.beginPath();g.ellipse(0,0,rr*.6+k*5,rr+k*7,0,t*2*(k?-1:1),t*2*(k?-1:1)+Math.PI*1.6);g.stroke();}g.shadowBlur=0;g.restore();
    }
  }
  // the cave mouth itself (drawn over the ceiling): god rays into the cave, a lit floor, a craggy rock lip
  const PH_DAY=['255,244,215','215,246,255','255,196,130'];
  function drawExitFront(lv,S,CX,CY,ang,s0,s1,t){
    const e=lv.end,m=e+1,pl=lv.P.planet,C=PH_CAVE[pl],T=PH_THEME[pl],L=PH_DAY[pl],CH=4.9;
    if(m<s0-4||m>s1+7)return;
    // daylight on the ground outside and spilling through the mouth
    const [fx,fy]=P(m+1.5,0),fg=g.createRadialGradient(fx,fy,0,fx,fy,BP*4);fg.addColorStop(0,`rgba(${L},.55)`);fg.addColorStop(1,`rgba(${L},0)`);
    g.fillStyle=fg;g.beginPath();g.arc(CX,CY,RP+2,ang(m-3),ang(s1+3));g.arc(CX,CY,RP-.8*UP,ang(s1+3),ang(m-3),true);g.closePath();g.fill();
    // god rays slanting in from the opening
    const [ox,oy]=P(m+.7,CH*.8);g.save();g.beginPath();g.arc(CX,CY,RP,ang(s0-3),ang(m+.15));g.arc(CX,CY,RP+CH*UP,ang(m+.15),ang(s0-3),true);g.closePath();g.clip();g.globalCompositeOperation='lighter';
    for(let i=0;i<4;i++){const u=m-.3-i*.75,w=.3+hsh(i,3)*.25,al=(.12+.06*Math.sin(t*.9+i*1.7))*(1-i*.18),[p1x,p1y]=P(u-w,0),[p2x,p2y]=P(u+w,0),rg=g.createLinearGradient(ox,oy,(p1x+p2x)/2,(p1y+p2y)/2);
      rg.addColorStop(0,`rgba(${L},${al*1.6})`);rg.addColorStop(1,`rgba(${L},0)`);g.fillStyle=rg;g.beginPath();g.moveTo(ox,oy);g.lineTo(p1x,p1y);g.lineTo(p2x,p2y);g.closePath();g.fill();}
    for(let k=0;k<16;k++){const u=(t*.05+hsh(k,1))%1,[x,y]=P(m-.4-hsh(k,2)*3.6,.3+u*3.4+Math.sin(t+k)*.1);g.fillStyle=`rgba(${L},${.5*Math.sin(u*Math.PI)})`;g.beginPath();g.arc(x,y,1+hsh(k,4)*1.5,0,Math.PI*2);g.fill();}
    g.restore();
    // the craggy rock lip where the roof ends
    const lip=[[-.7,CH+.3],[-.55,CH-.35],[-.3,CH-.55],[-.12,CH-1.05],[.08,CH-.75],[.26,CH-1.25],[.45,CH-.6],[.62,CH-.8],[.85,CH-.15],[1.0,CH+.5],[.95,CH+1.3],[.7,CH+2.2],[.45,CH+3.4],[.05,CH+4.6],[-.5,CH+6.5],[-1.2,CH+9],[-2.4,40],[-2.4,CH+.3]];
    const pts=lip.map(([ds,h])=>P(m+ds,h)),r0=RP+CH*UP,lg=g.createRadialGradient(CX,CY,r0-1.3*UP,CX,CY,r0+3*UP);lg.addColorStop(0,C.tip);lg.addColorStop(.3,C.ceil[0]);lg.addColorStop(1,C.ceil[1]);
    g.fillStyle=lg;poly(pts.map(q=>[q[0],q[1]]));g.fill();
    g.save();poly(pts.map(q=>[q[0],q[1]]));g.clip();g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2;
    for(let k=0;k<4;k++){g.beginPath();for(let i=0;i<=6;i++){const [x,y]=P(m-.9+i*.3-k*.25,CH+.2+k*.9+(hsh(i+k*7,3)-.5)*.25);i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}g.restore();
    // daylight rim on the outer edge, cave glow on the inner one
    g.lineWidth=2.5;g.strokeStyle=`rgba(${L},.85)`;g.beginPath();pts.slice(5,17).forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();
    g.strokeStyle=C.glow+'77';g.lineWidth=1.5;g.beginPath();pts.slice(0,6).forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();
    // each world dresses its doorway: glowing moonstone crystals, icicles + snow, or dripping lava
    if(pl===0){[[-.3,-.55,-.2],[.26,-1.25,.15],[.6,-.8,.4]].forEach(([ds,h,tl],k)=>{const gl=.6+.4*Math.sin(t*2+k*2),[x,y,f]=P(m+ds,CH+h);g.save();g.translate(x,y);g.rotate(f+Math.PI+tl);
        const r=UP*(.32+k*.06),hg=g.createRadialGradient(0,-r*.5,0,0,-r*.5,r*1.8);hg.addColorStop(0,C.glow+'88');hg.addColorStop(1,C.glow+'00');g.globalAlpha=gl;g.fillStyle=hg;g.beginPath();g.arc(0,-r*.5,r*1.8,0,Math.PI*2);g.fill();g.globalAlpha=1;
        [[-r*.35,.7],[0,1],[r*.35,.6]].forEach(([dx,sc])=>{g.fillStyle=C.glow;g.beginPath();g.moveTo(dx-r*.14,0);g.lineTo(dx,-r*sc);g.lineTo(dx+r*.14,0);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.moveTo(dx-r*.05,0);g.lineTo(dx,-r*sc*.9);g.lineTo(dx+r*.02,0);g.fill();});g.restore();});}
    if(pl===1){for(let k=0;k<11;k++){const ds=-.55+k*.15,h0=lipH(lip,ds)-.02,len=.18+hsh(k,9)*.45,[x1,y1]=P(m+ds-.035,h0),[x2,y2]=P(m+ds+.035,h0),[x3,y3]=P(m+ds,h0-len);
        g.fillStyle='rgba(230,250,255,.92)';g.beginPath();g.moveTo(x1,y1);g.lineTo(x3,y3);g.lineTo(x2,y2);g.fill();if(hsh(k,10)<.35){const tw=.5+.5*Math.sin(t*5+k);g.fillStyle=`rgba(255,255,255,${tw})`;g.beginPath();g.arc(x3,y3,1.5+tw,0,Math.PI*2);g.fill();}}
      g.strokeStyle='#ffffff';g.lineWidth=UP*.12;g.lineCap='round';g.beginPath();pts.slice(8,11).forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();g.lineCap='butt';}
    if(pl===2){[-.12,.26,.62].forEach((ds,k)=>{const h0=lipH(lip,ds),[x,y]=P(m+ds,h0),gl=.6+.4*Math.sin(t*3+k);const dg=g.createRadialGradient(x,y,0,x,y,UP*.45);dg.addColorStop(0,`rgba(255,170,60,${.7*gl})`);dg.addColorStop(1,'rgba(255,80,20,0)');g.fillStyle=dg;g.beginPath();g.arc(x,y,UP*.45,0,Math.PI*2);g.fill();
        const u=(t*.7+k*.37)%1,[dx,dy]=P(m+ds,h0-.1-u*u*CH*.9);g.fillStyle=`rgba(255,${150+60*(1-u)|0},40,${1-u*.6})`;g.beginPath();g.ellipse(dx,dy,2.2,3.4,0,0,Math.PI*2);g.fill();});
      g.strokeStyle='rgba(255,120,40,.75)';g.lineWidth=2;g.beginPath();pts.slice(1,9).forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();}
  }
  function lipH(lip,ds){for(let i=1;i<lip.length;i++){const [a,ha]=lip[i-1],[b,hb]=lip[i];if(ds>=a&&ds<=b)return ha+(hb-ha)*(ds-a)/(b-a||1);}return 4.9;}
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
  // ── the midground: landmarks between the far ridge and the ground, turning at ⅔ of the planet's speed ──
  // each world has its own set and each level picks three of them, so every course has its own skyline
  const PH_MID={0:['lander','dish','arch','crys','mast'],1:['spire','pine','geyser','dome','iarch'],2:['volc','basalt','deadtree','lavafall','vent'],
    c0:['mite','shroom','crys'],c1:['icecol','crys','mite'],c2:['mite','lpool','obsid']};
  function drawMid(lv,S,CX,CY,t){
    const pl=lv.P.planet,cave=lv.P.cave,set=PH_MID[cave?'c'+pl:pl],Lk=lv.P.lvl||lv.P.seed||1,K=.66,SP=2.3;
    const kinds=[0,1,2].map(i=>set[Math.floor(hsh(Lk*3+i,41)*set.length)]);
    const T=PH_THEME[pl],C=PH_CAVE[pl],pp=PH_PLANETS[pl],f0=-(AX+120)/RP,f1=(W-AX+120)/RP,q0=f0*RP/BP+S.s*K,q1=f1*RP/BP+S.s*K;
    for(let k=Math.floor(q0/SP)-1;k<=q1/SP+1;k++){
      if(hsh(k+Lk*17,43)<.3)continue;
      const q=k*SP+hsh(k,44)*SP*.6,f=(q-S.s*K)*BP/RP,r=RP-UP*.2,sc=(1+hsh(k,45)*.6)*UP*(lv.P.cave?.85:1),kind=kinds[Math.floor(hsh(k,46)*3)];
      g.save();g.translate(CX+r*Math.sin(f),CY-r*Math.cos(f));g.rotate(f);g.globalAlpha=.75;
      midPaint(kind,sc,t,k,pl,T,C,pp);g.restore();
    }
    g.globalAlpha=1;
  }
  function midPaint(kind,U,t,k,pl,T,C,pp){
    const dark=T.ridge[0],dk2=T.ridge[1],gl=pp.glow,blink=(Math.sin(t*3+k)>.6)?1:.25,v=hsh(k,47);
    const tri=(x1,y1,x2,y2,x3,y3)=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.lineTo(x3,y3);g.closePath();g.fill();};
    switch(kind){
      case 'lander':{g.strokeStyle=dark;g.lineWidth=U*.07;[[-1],[1]].forEach(([d])=>{g.beginPath();g.moveTo(d*U*.35,-U*.75);g.lineTo(d*U*.75,0);g.stroke();g.fillStyle=dark;g.fillRect(d*U*.75-U*.12,-U*.04,U*.24,U*.06);});
        g.fillStyle='#4a4766';g.fillRect(-U*.45,-U*1.15,U*.9,U*.5);g.fillStyle='#8a7a3a';g.fillRect(-U*.4,-U*.7,U*.8,U*.15);
        g.fillStyle='#55527a';g.beginPath();g.moveTo(-U*.3,-U*1.15);g.lineTo(-U*.2,-U*1.45);g.lineTo(U*.25,-U*1.45);g.lineTo(U*.35,-U*1.15);g.fill();
        g.strokeStyle=dark;g.lineWidth=U*.03;g.beginPath();g.moveTo(U*.15,-U*1.45);g.lineTo(U*.15,-U*1.85);g.stroke();g.fillStyle=`rgba(255,80,90,${blink})`;g.beginPath();g.arc(U*.15,-U*1.88,U*.05,0,Math.PI*2);g.fill();
        g.fillStyle=gl+'99';g.fillRect(-U*.12,-U*1.38,U*.18,U*.12);break;}
      case 'dish':{g.strokeStyle=dark;g.lineWidth=U*.06;g.beginPath();g.moveTo(-U*.35,0);g.lineTo(0,-U*.9);g.lineTo(U*.35,0);g.moveTo(0,-U*.9);g.lineTo(0,0);g.stroke();
        g.save();g.translate(0,-U*1.0);g.rotate(-.6+Math.sin(t*.3+k)*.25);g.fillStyle='#5a5780';g.beginPath();g.ellipse(0,0,U*.75,U*.28,0,Math.PI,Math.PI*2);g.fill();g.fillStyle='#3c3a5c';g.beginPath();g.ellipse(0,0,U*.75,U*.1,0,0,Math.PI*2);g.fill();
        g.strokeStyle=dark;g.lineWidth=U*.03;g.beginPath();g.moveTo(0,0);g.lineTo(0,-U*.55);g.stroke();g.fillStyle=`rgba(127,232,255,${blink})`;g.beginPath();g.arc(0,-U*.58,U*.05,0,Math.PI*2);g.fill();g.restore();break;}
      case 'arch':case 'iarch':{const c1=kind==='iarch'?'#2f6a92':dark,c2=kind==='iarch'?'#bfe9ff':'#3d3a60';g.fillStyle=c1;g.beginPath();g.moveTo(-U*1.1,0);g.quadraticCurveTo(-U*1.2,-U*1.6,-U*.2,-U*1.9);g.quadraticCurveTo(U*1.1,-U*2,U*1.15,0);g.lineTo(U*.7,0);g.quadraticCurveTo(U*.6,-U*1.25,0,-U*1.35);g.quadraticCurveTo(-U*.62,-U*1.2,-U*.65,0);g.closePath();g.fill();
        g.strokeStyle=c2;g.globalAlpha=.5;g.lineWidth=U*.05;g.beginPath();g.moveTo(-U*1.1,-U*.2);g.quadraticCurveTo(-U*1.2,-U*1.6,-U*.2,-U*1.9);g.quadraticCurveTo(U*.8,-U*1.98,U*1.0,-U*1.2);g.stroke();g.globalAlpha=.75;break;}
      case 'crys':{const cc=C.glow;const gg=g.createRadialGradient(0,-U*.4,0,0,-U*.4,U*1.3);gg.addColorStop(0,cc+'44');gg.addColorStop(1,cc+'00');g.fillStyle=gg;g.beginPath();g.arc(0,-U*.4,U*1.3,0,Math.PI*2);g.fill();
        [[-.35,1,-.25],[0,1.5,0],[.32,1.1,.22],[.6,.6,.45]].forEach(([x,hh,a])=>{g.save();g.translate(x*U,0);g.rotate(a);g.fillStyle=cc;g.globalAlpha=.55+.25*Math.sin(t*2+k+x*5);tri(-U*.14,0,0,-U*hh,U*.14,0);g.fillStyle='rgba(255,255,255,.5)';tri(-U*.03,0,0,-U*hh*.9,U*.05,0);g.restore();});g.globalAlpha=.75;break;}
      case 'mast':{g.strokeStyle=dark;g.lineWidth=U*.05;g.beginPath();g.moveTo(-U*.25,0);g.lineTo(0,-U*2.4);g.lineTo(U*.25,0);g.stroke();for(let i=1;i<5;i++){const y=-U*.48*i,w=U*.25*(1-i/5.2);g.beginPath();g.moveTo(-w,y);g.lineTo(w,y-U*.24);g.stroke();}
        g.fillStyle=`rgba(255,80,90,${blink})`;g.beginPath();g.arc(0,-U*2.45,U*.07,0,Math.PI*2);g.fill();break;}
      case 'spire':{const gg=g.createLinearGradient(-U*.4,0,U*.4,0);gg.addColorStop(0,'#183f5e');gg.addColorStop(.5,'#4f86ad');gg.addColorStop(1,'#244f72');g.fillStyle=gg;tri(-U*.45,0,U*.05,-U*(2.4+v),U*.4,0);g.fillStyle='#173a5a';tri(-U*.75,0,-U*.45,-U*1.2,-U*.15,0);tri(U*.25,0,U*.55,-U*1,U*.8,0);
        g.fillStyle='rgba(220,240,255,.3)';tri(U*.02,-U*(2.3+v),-U*.05,-U*1.2,U*.08,-U*1.4);break;}
      case 'pine':{g.fillStyle='#173a5a';g.fillRect(-U*.06,-U*.4,U*.12,U*.4);for(let i=0;i<3;i++){const y=-U*(.3+i*.42),w=U*(.6-i*.15);g.fillStyle='#1d4d70';tri(-w,y,0,y-U*.7,w,y);g.fillStyle='rgba(240,250,255,.8)';tri(-w*.6,y-U*.25,0,y-U*.7,w*.5,y-U*.3);}break;}
      case 'geyser':{g.fillStyle='#2f6a92';g.beginPath();g.ellipse(0,0,U*.8,U*.45,0,Math.PI,Math.PI*2);g.fill();g.fillStyle='#bfe9ff';g.beginPath();g.ellipse(0,-U*.42,U*.22,U*.07,0,0,Math.PI*2);g.fill();
        const ph=(t*.35+v)%1;if(ph<.55){for(let i=0;i<6;i++){const u=ph/.55,yy=-U*(.45+u*2.2*(i+1)/6),a=Math.sin(u*Math.PI)*.55;g.fillStyle=`rgba(230,248,255,${a*(1-i/7)})`;g.beginPath();g.arc(Math.sin(i*1.7+t)*U*.12*(i/2),yy,U*(.12+i*.06)*(.6+u),0,Math.PI*2);g.fill();}}break;}
      case 'dome':{g.fillStyle='#24557a';g.beginPath();g.ellipse(0,0,U*.85,U*.8,0,Math.PI,Math.PI*2);g.fill();g.strokeStyle='rgba(200,240,255,.5)';g.lineWidth=U*.03;g.beginPath();g.ellipse(0,0,U*.85,U*.8,0,Math.PI,Math.PI*2);g.stroke();
        for(let i=-1;i<=1;i++){g.fillStyle=`rgba(255,220,140,${.5+.3*Math.sin(t*1.5+i+k)})`;g.fillRect(i*U*.3-U*.07,-U*.38,U*.14,U*.12);}g.fillStyle='#1a4060';g.fillRect(-U*.15,-U*.25,U*.3,U*.25);break;}
      case 'icecol':{g.fillStyle='#1d4d70';g.fillRect(-U*.18,-U*1.8,U*.36,U*1.8);g.fillStyle='rgba(191,233,255,.45)';g.fillRect(-U*.1,-U*1.8,U*.08,U*1.8);
        for(let i=0;i<3;i++){g.fillStyle=`rgba(127,232,255,${.35+.25*Math.sin(t*2+i+k)})`;g.beginPath();g.arc(U*.02,-U*(.4+i*.5),U*.06,0,Math.PI*2);g.fill();}g.fillStyle='#2f6a92';tri(-U*.4,0,0,-U*.5,U*.4,0);break;}
      case 'volc':{const vg=g.createLinearGradient(0,-U*1.6,0,0);vg.addColorStop(0,'#3a1612');vg.addColorStop(1,'#1a0806');g.fillStyle=vg;g.beginPath();g.moveTo(-U*1.5,0);g.lineTo(-U*.3,-U*1.5);g.lineTo(U*.3,-U*1.5);g.lineTo(U*1.5,0);g.fill();
        const gw=.6+.4*Math.sin(t*2+k);g.fillStyle=`rgba(255,120,30,${gw})`;g.beginPath();g.ellipse(0,-U*1.5,U*.3,U*.08,0,0,Math.PI*2);g.fill();g.strokeStyle=`rgba(255,110,30,${.5*gw})`;g.lineWidth=U*.06;g.beginPath();g.moveTo(-U*.1,-U*1.47);g.quadraticCurveTo(-U*.4,-U*.8,-U*.7,-U*.1);g.stroke();
        for(let i=0;i<4;i++){const u=(t*.18+i/4+v)%1;g.fillStyle=`rgba(70,50,50,${.45*(1-u)})`;g.beginPath();g.arc(Math.sin(u*4+i)*U*.3+u*U*.6,-U*(1.6+u*2.2),U*(.2+u*.55),0,Math.PI*2);g.fill();}break;}
      case 'basalt':{for(let i=0;i<5;i++){const x=(i-2)*U*.26,hh=U*(.6+hsh(k*5+i,48)*1.1);g.fillStyle=i%2?'#2a100c':'#38160f';g.fillRect(x-U*.13,-hh,U*.26,hh);g.fillStyle='#4e2a20';g.fillRect(x-U*.13,-hh,U*.26,U*.05);}break;}
      case 'deadtree':{g.strokeStyle='#1f0a07';g.lineCap='round';g.lineWidth=U*.12;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(U*.1,-U*.7,-U*.05,-U*1.4);g.stroke();g.lineWidth=U*.06;
        [[-.05,-1.0,-.5,-1.5],[0,-1.25,.45,-1.7],[-.05,-1.4,-.25,-1.9],[.05,-.7,.4,-1.0]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(a*U,b*U);g.lineTo(c*U,d*U);g.stroke();g.fillStyle=`rgba(255,${120+60*Math.sin(t*3+a*9+k)|0},40,.8)`;g.beginPath();g.arc(c*U,d*U,U*.05,0,Math.PI*2);g.fill();});g.lineCap='butt';break;}
      case 'lavafall':{g.fillStyle='#2a0f0b';g.beginPath();g.moveTo(-U*.9,0);g.lineTo(-U*.7,-U*1.9);g.lineTo(U*.6,-U*2.1);g.lineTo(U*.9,0);g.fill();
        const lg=g.createLinearGradient(0,-U*1.9,0,0);lg.addColorStop(0,'#ffd23a');lg.addColorStop(1,'#ff4a10');g.fillStyle=lg;g.fillRect(-U*.12,-U*1.95,U*.24,U*1.95);
        g.fillStyle='rgba(255,240,180,.7)';for(let i=0;i<4;i++){const u=(t*1.2+i/4)%1;g.fillRect(-U*.06,-U*1.95+u*U*1.9,U*.04,U*.18);}g.fillStyle='rgba(255,120,30,.5)';g.beginPath();g.ellipse(0,0,U*.5,U*.12,0,0,Math.PI*2);g.fill();break;}
      case 'vent':{g.fillStyle='#2a100c';g.beginPath();g.ellipse(0,0,U*.6,U*.3,0,Math.PI,Math.PI*2);g.fill();for(let i=0;i<8;i++){const u=(t*.6+i/8+v)%1;g.fillStyle=`rgba(255,${150-u*90|0},40,${.8*(1-u)})`;g.beginPath();g.arc(Math.sin(i*2.3+u*3)*U*.25,-U*(.25+u*1.8),U*.05*(1-u*.5),0,Math.PI*2);g.fill();}break;}
      case 'mite':{const c1=pl===1?'#1d4d70':pl===2?'#2e0c06':'#24213a',c2=C.tip;[[-.45,.7],[0,1.25],[.38,.85]].forEach(([x,hh])=>{g.fillStyle=c1;tri(x*U-U*.22,0,x*U,-U*hh,x*U+U*.22,0);g.fillStyle=c2;g.globalAlpha=.5;tri(x*U-U*.03,0,x*U,-U*hh*.95,x*U+U*.08,0);g.globalAlpha=.75;});break;}
      case 'shroom':{[[-.4,.55,.28],[.1,.9,.4],[.5,.45,.22]].forEach(([x,hh,cr],i)=>{g.fillStyle='#3a3656';g.fillRect(x*U-U*.04,-hh*U,U*.08,hh*U);const gw=.6+.4*Math.sin(t*1.7+i+k),cg=g.createRadialGradient(x*U,-hh*U,0,x*U,-hh*U,cr*U*2);cg.addColorStop(0,C.glow+'66');cg.addColorStop(1,C.glow+'00');
          g.globalAlpha=gw;g.fillStyle=cg;g.beginPath();g.arc(x*U,-hh*U,cr*U*2,0,Math.PI*2);g.fill();g.globalAlpha=.75;g.fillStyle=C.glow;g.beginPath();g.ellipse(x*U,-hh*U,cr*U,cr*U*.55,0,Math.PI,Math.PI*2);g.fill();});break;}
      case 'lpool':{const gw=.6+.4*Math.sin(t*2+k),pg=g.createRadialGradient(0,0,0,0,0,U*1.2);pg.addColorStop(0,`rgba(255,150,40,${.6*gw})`);pg.addColorStop(1,'rgba(255,60,10,0)');g.fillStyle=pg;g.beginPath();g.arc(0,-U*.1,U*1.2,0,Math.PI*2);g.fill();
        g.fillStyle='#ff7a1a';g.beginPath();g.ellipse(0,-U*.05,U*.7,U*.12,0,0,Math.PI*2);g.fill();g.fillStyle='#2a0f0b';tri(-U*1.1,0,-U*.75,-U*.5,-U*.5,0);tri(U*.55,0,U*.85,-U*.65,U*1.15,0);break;}
      case 'obsid':{g.fillStyle='#120606';tri(-U*.3,0,-U*.05,-U*1.6,U*.25,0);tri(U*.1,0,U*.4,-U*1.0,U*.6,0);g.strokeStyle=`rgba(255,110,30,${.4+.3*Math.sin(t*2.5+k)})`;g.lineWidth=U*.03;g.beginPath();g.moveTo(-U*.05,-U*1.6);g.lineTo(-U*.12,-U*.5);g.stroke();break;}
    }
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
  const PH_ICO_J=typeof Path2D!=='undefined'?new Path2D('M5 13l7-7 7 7M5 19l7-7 7 7'):null,PH_ICO_B=typeof Path2D!=='undefined'?new Path2D('M4 20h16M7 16l10-2.5L7 11l10-2.5L7 6'):null;
  // a chasm: rounded lips, softly shaded walls that drop out of sight, and each world's depths
  // (a faint starry void on Luna, glowing ice on Glacia, a lava river on Magmora)
  function drawPit(lv,p,t,CX,CY,ang){
    const T=PH_THEME[lv.P.planet],pl=lv.P.planet,D=Math.max(2.6,(H-GY)/UP+.8),N=10,L=[],Rr=[],sl=[],sr=[];
    for(let i=0;i<=N;i++){const u=i/N,d=u*D,ins=.1*Math.sin(Math.min(1,u*2.2)*Math.PI*.5);sl.push(p.a+ins+(hsh(p.a*13+i,4)-.5)*.025);sr.push(p.b-ins+(hsh(p.b*13+i,5)-.5)*.025);L.push(P(sl[i],-d));Rr.push(P(sr[i],-d));}
    const top=[];for(let i=1;i<12;i++){const q=P(sr[0]-(sr[0]-sl[0])*i/12,.02);top.push([q[0],q[1]]);}   // follow the curve across the top
    const outline=L.map(q=>[q[0],q[1]]).concat([...Rr].reverse().map(q=>[q[0],q[1]])).concat(top);
    const gr=g.createRadialGradient(CX,CY,RP-D*UP,CX,CY,RP);
    if(pl===2){gr.addColorStop(0,'#2a0804');gr.addColorStop(.6,'#1a0705');gr.addColorStop(1,'#2a1210');}
    else if(pl===1){gr.addColorStop(0,'#00040a');gr.addColorStop(.7,'#020c1a');gr.addColorStop(.92,'#06203a');gr.addColorStop(1,'#2a6890');}
    else{gr.addColorStop(0,'#05050c');gr.addColorStop(.7,T.chasm[1]);gr.addColorStop(.92,T.chasm[0]);gr.addColorStop(1,'#2a2a38');}
    g.fillStyle=gr;poly(outline);g.fill();
    g.save();poly(outline);g.clip();
    // the wall faces: a band of this world's rock down each side, fading into the dark
    const wall=(pts,dir)=>{for(let k=0;k<3;k++){g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.lineWidth=BP*(.22-k*.07);g.strokeStyle=k===2?(pl===1?'rgba(220,245,255,.35)':pl===2?'rgba(255,140,60,.35)':'rgba(255,255,255,.12)'):k?T.crust:T.body;g.globalAlpha=k?.55:.8;g.stroke();}g.globalAlpha=1;};
    wall(L,1);wall(Rr,-1);
    // fade the walls into darkness further down
    const fd=g.createRadialGradient(CX,CY,RP-D*UP,CX,CY,RP-.4*UP);fd.addColorStop(0,pl===2?'rgba(20,4,2,.95)':'rgba(2,2,8,.95)');fd.addColorStop(.75,'rgba(2,2,8,.35)');fd.addColorStop(1,'rgba(2,2,8,0)');g.fillStyle=fd;poly(outline);g.fill();
    if(pl===0){for(let k=0;k<10;k++){const ss=p.a+(p.b-p.a)*(.15+.7*hsh(p.a+k,6)),dd=-1-hsh(p.a+k,8)*1.6,[x,y]=P(ss,dd),tw=.5+.5*Math.sin(t*2+k);g.fillStyle=`rgba(200,195,255,${.25+.45*tw})`;g.beginPath();g.arc(x,y,.8+tw,0,Math.PI*2);g.fill();}
      const [gx,gy]=P((p.a+p.b)/2,-D*.8),gg=g.createRadialGradient(gx,gy,0,gx,gy,BP*(p.b-p.a)*.6+20);gg.addColorStop(0,'rgba(140,120,255,.18)');gg.addColorStop(1,'rgba(140,120,255,0)');g.fillStyle=gg;g.fillRect(gx-BP*3,gy-BP*3,BP*6,BP*6);}
    if(pl===1){const [gx,gy]=P((p.a+p.b)/2,-2.2),gg=g.createRadialGradient(gx,gy,0,gx,gy,Math.min(BP*1.2,BP*(p.b-p.a)*.4+20));gg.addColorStop(0,'rgba(127,232,255,.22)');gg.addColorStop(1,'rgba(127,232,255,0)');g.fillStyle=gg;g.fillRect(gx-BP*3,gy-BP*3,BP*6,BP*6);}
    if(pl===2){// a lava river a little way down, glowing up the walls
      const lv0=1.5,lg=g.createRadialGradient(CX,CY,RP-(lv0+.5)*UP,CX,CY,RP-lv0*UP);lg.addColorStop(0,'#ff5a1a');lg.addColorStop(.7,'#ffb02e');lg.addColorStop(1,'#ffe27a');
      g.fillStyle=lg;g.beginPath();g.arc(CX,CY,RP-lv0*UP+Math.sin(t*2+p.a)*2,ang(p.a-.5),ang(p.b+.5));g.arc(CX,CY,RP-D*UP,ang(p.b+.5),ang(p.a-.5),true);g.closePath();g.fill();
      const hg=g.createRadialGradient(CX,CY,RP-lv0*UP,CX,CY,RP);hg.addColorStop(0,'rgba(255,140,40,.55)');hg.addColorStop(1,'rgba(255,90,20,0)');g.fillStyle=hg;poly(outline);g.fill();
      g.fillStyle='rgba(255,235,150,.9)';for(let k=0;k<4;k++){const ss=p.a+(p.b-p.a)*((k+.5)/4),bub=(t*1.2+k*.31+p.a)%1;const [x,y]=P(ss,-lv0+bub*.6);g.globalAlpha=1-bub;g.beginPath();g.arc(x,y,2+bub*3.5,0,Math.PI*2);g.fill();}g.globalAlpha=1;}
    g.restore();
    // rounded lips on both edges so the ground curls over into the pit
    [[p.a,-1],[p.b,1]].forEach(([e0,dir])=>{const [x,y,f]=P(e0,0);g.save();g.translate(x,y);g.rotate(f);const rw=BP*.13,rh=UP*.16;
      const lg2=g.createLinearGradient(0,-rh,0,rh*1.6);lg2.addColorStop(0,T.top);lg2.addColorStop(.45,T.crust);lg2.addColorStop(1,T.body);g.fillStyle=lg2;g.beginPath();g.ellipse(dir*rw*.15,rh*.2,rw,rh*1.2,0,0,Math.PI*2);g.fill();
      g.strokeStyle=pl===1?'rgba(240,252,255,.9)':pl===2?'rgba(255,130,50,.6)':'rgba(255,255,255,.35)';g.lineWidth=1.6;g.beginPath();g.ellipse(dir*rw*.15,rh*.2,rw,rh*1.2,0,Math.PI*1.05,Math.PI*1.95);g.stroke();g.restore();
      if(pl===1)for(let k=0;k<3;k++){const ss=e0-dir*(.03+k*.06),len=.18+hsh(e0+k,2)*.22,[x1,y1]=P(ss-.022,-.12),[x2,y2]=P(ss+.022,-.12),[x3,y3]=P(ss,-.12-len);
        g.fillStyle='rgba(225,248,255,.9)';g.beginPath();g.moveTo(x1,y1);g.quadraticCurveTo(x3,y3,x2,y2);g.fill();}});
    if(pl===2){const [hx,hy]=P((p.a+p.b)/2,.2),hr=Math.min(BP*1.6,BP*(p.b-p.a)*.5+20),hg=g.createRadialGradient(hx,hy,2,hx,hy,hr);hg.addColorStop(0,'rgba(255,120,30,.22)');hg.addColorStop(1,'rgba(255,80,20,0)');g.fillStyle=hg;g.beginPath();g.arc(hx,hy,hr,0,Math.PI*2);g.fill();}
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
  // ── obstacles: each world's own creatures and rocks instead of plain triangles ──
  // level 1 = spiky rocks; from level 2 a mix of spiky rocks, snapping flytraps and lizards that walk toward you
  // (the lizard reaches its spot exactly as you do, so the timing stays the same); comet meteors leave molten spheres
  const PH_OBS=[
    {rock:['#c9c4e6','#5d5888'],tip:'#ff6b7a',trap:'#7a5cc8',trapIn:'#ff4d8a',stem:'#4fbf8a',liz:['#a99fd8','#5d5590'],lizEye:'#ffe14d',lizSpine:'#ff6b7a'},
    {rock:['#e6f8ff','#6aa6cc'],tip:'#ff5fae',trap:'#4fa8cc',trapIn:'#ff3d9a',stem:'#8fd6e8',liz:['#e8f8ff','#7fb8d8'],lizEye:'#ff3d9a',lizSpine:'#4fd8ff'},
    {rock:['#4a2c26','#140806'],tip:'#ffb02e',trap:'#2a1612',trapIn:'#ff8a2a',stem:'#3a2018',liz:['#2a1410','#0e0504'],lizEye:'#ffd23a',lizSpine:'#ff7a1a'}];
  function obsKind(lv,sp){
    if(sp._k)return sp._k;
    if(sp.meteor)return sp._k='molten';
    const L=R.custom?(R.custom.L||3):R.L;if(L<=1)return sp._k=hsh(sp.s*3.1,17)<.5?'trap':'rock';
    const lone=!lv.spikes.some(o=>o!==sp&&Math.abs(o.s-sp.s)<1.1)&&!lv.pits.some(p=>p.b>sp.s-1&&p.a<sp.s+1.8)&&!lv.blocks.some(b=>b.b>sp.s-1&&b.a<sp.s+1.8);
    const r=hsh(sp.s*3.1+L,17),ice=lv.P.planet===1;
    if(ice)return sp._k=(lone&&r<.5)?'scorp':r<.72?'trap':'rock';   // the ice world's walker is an ice scorpion
    return sp._k=(lone&&r<.34)?'lizard':r<.67?'trap':'rock';
  }
  function drawObstacle(lv,sp,t,S){
    const pl=lv.P.planet,k=obsKind(lv,sp),O=PH_OBS[pl];
    let ss=sp.s;if(k==='lizard'||k==='scorp')ss=sp.s+Math.max(-.9,Math.min(1.5,(sp.s-S.s)*.45));
    const [x,y,f]=P(ss,0),w=Math.max(7,sp.w*BP*.4),h=Math.max(UP*.45,sp.h*UP*.9);g.save();g.translate(x,y);g.rotate(f);   // drawn a little inside the hit box, so a near miss never looks like a hit
    // a soft warning glow on the ground so hazards still read at a glance
    const hz=k==='molten'?'#ff8a2a':O.tip,hg=g.createRadialGradient(0,-h*.3,0,0,-h*.3,Math.max(w*2.4,UP*.7));hg.addColorStop(0,hz+'44');hg.addColorStop(1,hz+'00');g.fillStyle=hg;g.beginPath();g.arc(0,-h*.3,Math.max(w*2.4,UP*.7),0,Math.PI*2);g.fill();
    if(k==='rock'){
      // a chunky faceted boulder with a few thick crystal spines growing out of it
      const sd=sp.s*7.3,pts=[];for(let q=0;q<9;q++){const a=Math.PI+q/8*Math.PI,rr=1+(hsh(sd+q,2)-.5)*.22;pts.push([Math.cos(a)*w*1.1*rr,-h*.04+Math.sin(a)*h*.68*rr]);}
      const sp3=[[-.55,-.52,-.6,.5],[.05,-.66,0,.62],[.6,-.5,.6,.46]];
      sp3.forEach(([dx,dy,tilt,len],q)=>{const bx=dx*w,by=dy*h,L2=h*len*(.9+.2*hsh(sd+q,4)),bw=w*.32;g.save();g.translate(bx,by);g.rotate(tilt);
        g.fillStyle=O.rock[1];g.beginPath();g.moveTo(-bw,0);g.lineTo(0,-L2);g.lineTo(0,0);g.fill();
        const cg=g.createLinearGradient(0,0,0,-L2);cg.addColorStop(0,O.rock[0]);cg.addColorStop(1,O.tip);g.fillStyle=cg;g.beginPath();g.moveTo(0,0);g.lineTo(0,-L2);g.lineTo(bw,0);g.fill();g.restore();});
      const rg=g.createLinearGradient(-w,-h*.6,w*.8,0);rg.addColorStop(0,O.rock[0]);rg.addColorStop(1,O.rock[1]);g.fillStyle=rg;g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.lineTo(w*1.15,0);g.lineTo(-w*1.15,0);g.closePath();g.fill();
      // facets: a lit top face and a shaded side
      g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.moveTo(pts[1][0],pts[1][1]);g.lineTo(pts[4][0],pts[4][1]);g.lineTo(pts[4][0]*.6,pts[4][1]*.45);g.lineTo(pts[1][0]*.7,pts[1][1]*.5);g.fill();
      g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.moveTo(pts[5][0],pts[5][1]);g.lineTo(pts[8][0],pts[8][1]);g.lineTo(w*1.15,0);g.lineTo(w*.3,0);g.lineTo(pts[5][0]*.6,pts[5][1]*.5);g.fill();
      g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(0,0,w*1.25,h*.07,0,0,Math.PI*2);g.fill();
      if(pl===2){g.strokeStyle=`rgba(255,140,40,${.5+.4*Math.sin(t*3+sp.s)})`;g.lineWidth=1.4;g.beginPath();g.moveTo(-w*.7,-h*.12);g.lineTo(-w*.2,-h*.35);g.lineTo(w*.15,-h*.18);g.lineTo(w*.55,-h*.32);g.stroke();}
    }else if(k==='trap'){
      // a little flytrap on a curled stem, jaws snapping in time with the music
      g.strokeStyle=O.stem;g.lineWidth=Math.max(2,w*.22);g.lineCap='round';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(w*.5,-h*.3,w*.05,-h*.55);g.stroke();g.lineCap='butt';
      g.fillStyle=O.stem;[[-1,-.5],[1,.5]].forEach(([d,r])=>{g.beginPath();g.ellipse(d*w*.55,-h*.06,w*.5,h*.1,r,0,Math.PI*2);g.fill();});
      const bt=((R.state==='play'&&!R.dead?tau():t)%1+1)%1,op=.18+.5*Math.pow(1-bt,3),Rr=Math.max(w*1.15,h*.5),hx=w*.25,hy=-h*.62;
      const tooth=(dir)=>{g.fillStyle='#fffbe8';for(let i=0;i<4;i++){const tx=-Rr*(.2+i*.2);g.beginPath();g.moveTo(tx-Rr*.06,0);g.lineTo(tx,dir*Rr*.16);g.lineTo(tx+Rr*.06,0);g.fill();}};
      const ig=g.createRadialGradient(hx-Rr*.5,hy,0,hx-Rr*.5,hy,Rr*.7);ig.addColorStop(0,O.trapIn);ig.addColorStop(1,O.trapIn+'00');g.fillStyle=ig;g.beginPath();g.arc(hx-Rr*.5,hy,Rr*.7,0,Math.PI*2);g.fill();
      [[-op,-1],[op*.55,1]].forEach(([rot,dir])=>{g.save();g.translate(hx,hy);g.rotate(rot);
        g.fillStyle=O.trap;g.beginPath();g.ellipse(-Rr*.5,0,Rr*.5,Rr*.32,0,dir<0?Math.PI:0,dir<0?Math.PI*2:Math.PI);g.closePath();g.fill();
        g.strokeStyle=O.trapIn;g.lineWidth=2;g.beginPath();g.moveTo(-Rr,0);g.lineTo(0,0);g.stroke();tooth(-dir);
        g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(-Rr*.55,dir*Rr*.14,Rr*.18,Rr*.06,0,0,Math.PI*2);g.fill();g.restore();});
    }else if(k==='lizard'){
      // a spiny lizard scuttling toward you (facing left)
      const ph=t*10+sp.s*3,bob=Math.sin(ph*2)*1.2,L=w*.85;
      g.strokeStyle=O.liz[1];g.lineWidth=Math.max(2,h*.08);g.lineCap='round';
      for(let i=0;i<4;i++){const lx=(i<2?-L*.45:L*.45)+(i%2?L*.12:-L*.12),sw=Math.sin(ph+(i%2?Math.PI:0)+(i<2?0:Math.PI))*L*.18;g.beginPath();g.moveTo(lx,-h*.22+bob);g.lineTo(lx+sw,-h*.04);g.lineTo(lx+sw-L*.1,0);g.stroke();}
      g.strokeStyle=O.liz[1];g.lineWidth=Math.max(3,h*.14);g.beginPath();g.moveTo(L*.8,-h*.26+bob);g.quadraticCurveTo(L*1.5,-h*.3+Math.sin(ph)*h*.15,L*2,-h*.06);g.stroke();g.lineCap='butt';
      g.fillStyle=O.lizSpine;for(let i=0;i<5;i++){const sx=-L*.55+i*L*.3,sh=h*(.32+.12*Math.sin(i*1.3));g.beginPath();g.moveTo(sx-L*.11,-h*.42+bob);g.lineTo(sx,-h*.42-sh+bob);g.lineTo(sx+L*.11,-h*.42+bob);g.fill();}
      const bg=g.createLinearGradient(0,-h*.5,0,-h*.05);bg.addColorStop(0,O.liz[0]);bg.addColorStop(1,O.liz[1]);g.fillStyle=bg;g.beginPath();g.ellipse(0,-h*.27+bob,L,h*.2,0,0,Math.PI*2);g.fill();
      g.beginPath();g.ellipse(-L*1.05,-h*.33+bob,L*.42,h*.17,-.15,0,Math.PI*2);g.fill();
      g.fillStyle=O.lizEye;g.shadowColor=O.lizEye;g.shadowBlur=6;g.beginPath();g.arc(-L*1.15,-h*.4+bob,Math.max(1.6,h*.06),0,Math.PI*2);g.fill();g.shadowBlur=0;
      if(pl===2){g.fillStyle=`rgba(255,140,40,${.6+.3*Math.sin(t*4+sp.s)})`;[[-.4,-.3],[.1,-.25],[.5,-.32]].forEach(([dx,dy])=>{g.beginPath();g.arc(dx*L,dy*h+bob,Math.max(1.5,h*.05),0,Math.PI*2);g.fill();});}
    }else if(k==='scorp'){
      // an ice scorpion scuttling toward you (facing left): clear crystal shell, snapping claws, tail curled over with a glowing stinger
      const ph=t*11+sp.s*3,L=w*1.15,bob=Math.sin(ph*2)*1,bt=((R.state==='play'&&!R.dead?tau():t)%1+1)%1,strike=Math.pow(1-bt,4);
      g.strokeStyle='#5f9bc6';g.lineWidth=Math.max(1.6,h*.06);g.lineCap='round';
      for(let i=0;i<4;i++){const lx=-L*.45+i*L*.32,sw=Math.sin(ph+i*1.6)*L*.12;[-1,1].forEach(d=>{g.beginPath();g.moveTo(lx,-h*.2+bob);g.lineTo(lx+sw+d*L*.08,-h*.34+bob*.5);g.lineTo(lx+sw+d*L*.16,0);g.stroke();});}
      // tail: six beads curling up from the back and over, stinger pointing forward; it cocks back on each beat
      const tp=[[L*.8,-h*.28],[L*1.35,-h*(.95+.1*strike)],[L*.95,-h*(1.5+.15*strike)],[L*.25,-h*(1.4+.1*strike)]];
      const bz=u=>{const m=1-u;return[m*m*m*tp[0][0]+3*m*m*u*tp[1][0]+3*m*u*u*tp[2][0]+u*u*u*tp[3][0],m*m*m*tp[0][1]+3*m*m*u*tp[1][1]+3*m*u*u*tp[2][1]+u*u*u*tp[3][1]+bob];};
      for(let i=0;i<=6;i++){const [x,y]=bz(i/6);g.fillStyle=i%2?'#bfe9ff':'#8cc9ea';g.beginPath();g.ellipse(x,y,Math.max(2.5,h*(.15-i*.012)),Math.max(2.2,h*(.13-i*.01)),0,0,Math.PI*2);g.fill();}
      const [sx,sy]=bz(1);g.fillStyle='#ff3d9a';g.shadowColor='#ff3d9a';g.shadowBlur=8+10*strike;g.beginPath();g.moveTo(sx+h*.06,sy-h*.08);g.lineTo(sx-L*.3,sy+h*.18);g.lineTo(sx+h*.04,sy+h*.1);g.fill();g.shadowBlur=0;
      // body: segmented crystal shell
      const bg=g.createLinearGradient(0,-h*.48,0,-h*.05);bg.addColorStop(0,'#f4fdff');bg.addColorStop(1,'#6aa6cc');g.fillStyle=bg;
      g.beginPath();g.ellipse(0,-h*.24+bob,L*.85,h*.17,0,0,Math.PI*2);g.fill();g.strokeStyle='rgba(60,110,150,.55)';g.lineWidth=1.2;for(let i=1;i<4;i++){const x=-L*.5+i*L*.3;g.beginPath();g.moveTo(x,-h*.38+bob);g.lineTo(x,-h*.1+bob);g.stroke();}
      g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(-L*.15,-h*.33+bob,L*.4,h*.04,0,0,Math.PI*2);g.fill();
      // claws, snapping on the beat
      [[-1,.0],[1,.12]].forEach(([d,o])=>{const cx2=-L*1.15,cy2=-h*.24+d*h*.12+bob,op=.25+.5*strike;g.strokeStyle='#8cc9ea';g.lineWidth=Math.max(2,h*.08);g.beginPath();g.moveTo(-L*.7,-h*.24+bob);g.lineTo(cx2+L*.2,cy2);g.stroke();
        g.fillStyle='#d6f1ff';g.save();g.translate(cx2,cy2);[op,-op].forEach(a=>{g.save();g.rotate(a*d);g.beginPath();g.ellipse(-L*.12,0,L*.2,h*.06,0,0,Math.PI*2);g.fill();g.restore();});g.restore();});
      g.fillStyle='#ff3d9a';[-1,1].forEach(d=>{g.beginPath();g.arc(-L*.72,-h*.3+d*h*.04+bob,Math.max(1.4,h*.035),0,Math.PI*2);g.fill();});
      g.lineCap='butt';
    }else{
      // a meteor that landed: smashed half into the ground — a squashed molten lump in a crater, a rim of thrown-up dirt,
      // glowing cracks spreading through the ground around it, and smoke
      const T=PH_THEME[pl],r=Math.max(UP*.34,Math.min(w*1.4,h*.8)),cy=-r*.32,ry=r*.72;
      const hg2=g.createRadialGradient(0,cy,r*.4,0,cy,r*2.8);hg2.addColorStop(0,'rgba(255,140,40,.45)');hg2.addColorStop(1,'rgba(255,80,20,0)');g.fillStyle=hg2;g.beginPath();g.arc(0,cy,r*2.8,0,Math.PI*2);g.fill();
      // cracks in the ground, glowing
      const gl=.65+.35*Math.sin(t*4+sp.s);g.strokeStyle=`rgba(255,${150+60*gl|0},60,${.55+.35*gl})`;g.lineWidth=Math.max(1.2,r*.07);g.lineCap='round';
      [[-1,-.02,-1.9,.02,-2.4,-.03],[1,-.02,1.7,.03,2.3,-.02],[-.8,0,-1.3,.05,-1.5,.04],[.9,0,1.25,.06,1.6,.05]].forEach(c=>{g.beginPath();g.moveTo(c[0]*r,c[1]*r);g.lineTo(c[2]*r,c[3]*r);g.lineTo(c[4]*r,c[5]*r);g.stroke();});g.lineCap='butt';
      // the lump: only its top shows above the ground
      g.save();g.beginPath();g.rect(-r*3,-r*3,r*6,r*3+1);g.clip();
      const mg=g.createRadialGradient(-r*.3,cy-ry*.5,1,0,cy,r);mg.addColorStop(0,'#fff4b0');mg.addColorStop(.4,'#ffa030');mg.addColorStop(1,'#c2340a');g.fillStyle=mg;g.beginPath();g.ellipse(0,cy,r*1.08,ry,0,0,Math.PI*2);g.fill();
      g.beginPath();g.ellipse(0,cy,r*1.08,ry,0,0,Math.PI*2);g.clip();const cg2=g.createLinearGradient(0,cy-ry,0,cy+ry*.6);cg2.addColorStop(0,'rgba(45,14,8,.9)');cg2.addColorStop(.6,'rgba(70,20,10,.5)');cg2.addColorStop(1,'rgba(70,20,10,0)');g.fillStyle=cg2;g.fillRect(-r*1.1,cy-ry,r*2.2,ry*2);
      g.strokeStyle=`rgba(255,${190+40*gl|0},90,${gl})`;g.lineWidth=Math.max(1.2,r*.08);g.lineCap='round';
      [[[-.75,-.25],[-.3,-.05],[.05,-.45],[.55,-.2]],[[-.3,-.05],[-.2,.3]],[[.05,-.45],[.15,-.85]],[[.55,-.2],[.8,.1]]].forEach(c=>{g.beginPath();c.forEach(([dx,dy],q)=>q?g.lineTo(dx*r,cy+dy*ry):g.moveTo(dx*r,cy+dy*ry));g.stroke();});g.lineCap='butt';g.restore();
      // crater rim: dirt pushed up on both sides, overlapping the lump's base
      [-1,1].forEach(sd=>{const rg=g.createLinearGradient(0,-r*.35,0,r*.05);rg.addColorStop(0,T.top);rg.addColorStop(1,T.crust);g.fillStyle=rg;g.beginPath();g.ellipse(sd*r*1.05,0,r*.62,r*.26,sd*.18,Math.PI,Math.PI*2);g.fill();
        g.fillStyle=T.crust;for(let q=0;q<3;q++){g.beginPath();g.arc(sd*r*(1.5+q*.32),-r*.05,r*(.1-q*.02),0,Math.PI*2);g.fill();}});
      for(let i=0;i<3;i++){const u=(t*.45+i/3+sp.s*.1)%1;g.fillStyle=`rgba(90,80,80,${.35*(1-u)})`;g.beginPath();g.arc(Math.sin(u*5+i)*r*.4,cy-ry-u*r*3,r*(.25+u*.5),0,Math.PI*2);g.fill();}
    }
    g.restore();
  }
  // a floating crystal bell (ring it with BOUNCE): bounce-pink glass, bobbing; rung bells swing and send out rings
  function drawBell(d,rung,t,pulse,S){
    const b=d.bell,age=rung&&b.rung?(performance.now()-b.rung)/1000:9,sw=rung?Math.sin(age*14)*Math.exp(-age*3)*.5:0,bob=Math.sin(t*2.4+d.s)*.06;
    const [x,y,f]=P(d.s,d.h+bob),r=Math.max(10,UP*.3),passed=!rung&&d.s<S.s-.5;g.save();g.translate(x,y);g.rotate(f+sw);g.globalAlpha=passed?.35:1;
    const near=Math.max(0,1-Math.abs(d.s-S.s)/2.5);
    if(!rung&&!passed){g.strokeStyle=`rgba(255,77,255,${.25+.45*pulse*near})`;g.lineWidth=2;g.beginPath();g.arc(0,-r*.1,r*(1.35+.25*pulse),0,Math.PI*2);g.stroke();}
    g.strokeStyle='rgba(220,240,255,.5)';g.lineWidth=1;g.beginPath();g.moveTo(0,-r*.95);g.lineTo(0,-r*1.6);g.stroke();
    const bg=g.createLinearGradient(-r,0,r,0);bg.addColorStop(0,'#ff4dff');bg.addColorStop(.45,'#ffe0ff');bg.addColorStop(1,'#c04dff');
    if(rung){g.shadowColor='#ff9dff';g.shadowBlur=20*Math.exp(-age*1.5);}g.fillStyle=bg;
    g.beginPath();g.moveTo(-r*.8,r*.45);g.quadraticCurveTo(-r*.7,-r*.1,-r*.45,-r*.65);g.quadraticCurveTo(0,-r*1.05,r*.45,-r*.65);g.quadraticCurveTo(r*.7,-r*.1,r*.8,r*.45);g.closePath();g.fill();g.shadowBlur=0;
    g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.ellipse(-r*.3,-r*.3,r*.1,r*.3,.3,0,Math.PI*2);g.fill();
    g.fillStyle='#ffe0ff';g.beginPath();g.arc(sw*r*.6,r*.55,r*.14,0,Math.PI*2);g.fill();
    g.restore();
    if(rung&&age<1.2){for(let q=0;q<2;q++){const a2=age-q*.15;if(a2<0)continue;g.strokeStyle=`rgba(255,157,255,${Math.max(0,.7-a2*.6)})`;g.lineWidth=2;g.beginPath();g.arc(x,y,r*(1+a2*3.5),0,Math.PI*2);g.stroke();}}
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
    drawMid(lv,S,CX,CY,t);
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
      g.fillStyle='rgba(190,235,255,.55)';for(let k=0;k<14;k++){const ms=z.a+(z.b-z.a)*hsh(k,7),mh=((t*.35+hsh(k,9))%1)*2.8;const [mx,my]=P(ms,mh);g.beginPath();g.arc(mx,my,1.6+hsh(k,3)*1.6,0,Math.PI*2);g.fill();}});
    if(lv.P.finish==='dive'||lv.P.finish==='portal')drawFinish(lv,S,CX,CY,ang,s0,s1,t);
    if(lv.P.cave)drawCeiling(lv,S,CX,CY,ang,s0,s1,t,lv.P.finish==='exit'?lv.end+1:Infinity);
    if(lv.P.cave&&lv.P.finish==='exit')drawExitFront(lv,S,CX,CY,ang,s0,s1,t);
    // ── pits: real chasms ──
    lv.pits.forEach(p=>{if(p.b<s0-.2||p.a>s1+.2)return;drawPit(lv,p,t,CX,CY,ang);});
    // ── blocks + floating platforms ──
    lv.blocks.forEach(b=>{if(b.b<s0-.2||b.a>s1+.2)return;drawBlock(lv.P.planet,b,t);});
    // ── spikes: faceted crystals (meteors drop in during comet chases) ──
    lv.spikes.forEach(sp=>{if(sp.s<s0-1||sp.s>s1+(sp.meteor?14:sp.icicle?2:1))return;
      // a falling meteor: u = beats until it lands (it touches down 1.3 beats ahead of you). It also drifts forward a little
      // while it falls, so on screen it dives steeply into the ground; the tail is drawn along the exact path it came from,
      // so it always trails straight behind the head
      if(sp.icicle){drawIcicle(lv,sp,S,t);return;}
      const u=sp.meteor?sp.lt-S.s:0,lead=sp.s-(sp.lt==null?sp.s:sp.lt);
      if(u>0){const DR=.45,FALL=2.6,mp=uu=>P(S.s+lead+(1-DR)*uu,sp.h*.5+FALL*uu),[x,y]=mp(u);
        if(y<-BP||x>W+BP*2)return;
        const TL=.75,pts=[];for(let i=0;i<=6;i++)pts.push(mp(u+TL*i/6));const [tx,ty]=pts[6];
        const tg=g.createLinearGradient(x,y,tx,ty);tg.addColorStop(0,'rgba(255,190,80,.9)');tg.addColorStop(.45,'rgba(255,120,40,.45)');tg.addColorStop(1,'rgba(255,60,20,0)');
        g.fillStyle=tg;const nx=-(ty-y),ny=tx-x,nl=Math.hypot(nx,ny)||1,hw=BP*.13;   // a tapered tail, widest at the head
        g.beginPath();pts.forEach(([px,py],i)=>{const w=hw*(1-i/6);i?g.lineTo(px+nx/nl*w,py+ny/nl*w):g.moveTo(px+nx/nl*w,py+ny/nl*w);});
        for(let i=6;i>=0;i--){const [px,py]=pts[i],w=hw*(1-i/6);g.lineTo(px-nx/nl*w,py-ny/nl*w);}g.closePath();g.fill();
        const mg=g.createRadialGradient(x-BP*.04,y-BP*.04,1,x,y,BP*.14);mg.addColorStop(0,'#fff4c0');mg.addColorStop(.4,'#ffb84d');mg.addColorStop(1,'#a03a10');g.fillStyle=mg;g.beginPath();g.arc(x,y,BP*.14,0,Math.PI*2);g.fill();return;}
      if(sp.s>s1+1)return;
      drawObstacle(lv,sp,t,S);});
    // ── bounce pads: little hover pads with thrusters ──
    lv.pads.forEach(p=>{if(p.s<s0-1||p.s>s1+1)return;const gone=S.padsDropped.has(p),small=(p.next-p.s)<1.75,pc=small?'#4d8bff':'#ff4dff',pr=small?'77,139,255':'255,77,255',pt=small?'170,200,255':'255,170,255';   // pink = big launch, blue = small hop
      const fall=gone?Math.min(3,(S.s-p.s)*2):0,[x,y,f]=P(p.s,-fall*.6);g.save();g.translate(x,y);g.rotate(f);g.globalAlpha=gone?Math.max(0,1-fall/2):1;
      const w=p.w/2*BP,fl=UP*(.35+.12*Math.sin(t*30+p.s*7));
      const th=g.createLinearGradient(0,UP*.08,0,UP*.08+fl);th.addColorStop(0,`rgba(${pt},.9)`);th.addColorStop(1,`rgba(${pr},0)`);
      g.fillStyle=th;g.beginPath();g.moveTo(-w*.35,UP*.08);g.lineTo(0,UP*.08+fl);g.lineTo(w*.35,UP*.08);g.fill();
      const rim=g.createLinearGradient(0,-UP*.06,0,UP*.12);rim.addColorStop(0,'#d8dbe6');rim.addColorStop(1,'#5a5e6e');
      g.fillStyle=rim;g.beginPath();g.ellipse(0,UP*.03,w,UP*.11,0,0,Math.PI*2);g.fill();
      g.shadowColor=pc;g.shadowBlur=10+10*pulse;g.fillStyle=pc;g.beginPath();g.ellipse(0,-UP*.01,w*.82,UP*.07+UP*.03*pulse,0,0,Math.PI*2);g.fill();g.shadowBlur=0;
      g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.ellipse(-w*.15,-UP*.03,w*.35,UP*.025,0,0,Math.PI*2);g.fill();
      if(!gone){g.strokeStyle=`rgba(${pr},${.5*(1-pulse)})`;g.lineWidth=2;g.beginPath();g.ellipse(0,0,w*(1+pulse*.8),UP*.11*(1+pulse*.8),0,0,Math.PI*2);g.stroke();}
      g.restore();
      // faint arc to where it will throw you
      if(!gone&&p.s>S.s-.3&&p.s<S.s+5){g.strokeStyle=`rgba(${pr},.22)`;g.setLineDash([4,6]);g.lineWidth=2;g.beginPath();const T2=p.next-p.s,gz=phZoneG(lv,p.s);for(let i=0;i<=12;i++){const u=i/12*T2,hh=gz*T2/2*u-gz*u*u/2;const [qx,qy]=P(p.s+u,hh);i?g.lineTo(qx,qy):g.moveTo(qx,qy);}g.stroke();g.setLineDash([]);}});
    // ── teaching signs: a little post before each new idea ──
    (lv.signs||[]).forEach(sg=>{if(sg.s<s0-4||sg.s>s1+1)return;const [x,y,f]=P(sg.s,0);g.save();g.translate(x,y);g.rotate(f);
      const fs=Math.round(Math.max(14,UP*.34));g.font=`${fs}px 'Bebas Neue',sans-serif`;const tw=g.measureText(sg.txt).width+fs*1.1,bh=fs*1.5,by=-UP*1.25-bh;
      g.fillStyle='#5a4a3a';g.fillRect(-2.5,by+bh-2,5,-by-bh+2);
      g.fillStyle='rgba(8,10,24,.88)';g.strokeStyle=pl.glow;g.lineWidth=2;g.shadowColor=pl.glow;g.shadowBlur=8+6*pulse;
      g.beginPath();if(g.roundRect)g.roundRect(-tw/2,by,tw,bh,6);else g.rect(-tw/2,by,tw,bh);g.fill();g.stroke();g.shadowBlur=0;
      g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(sg.txt,0,by+bh/2+1);g.restore();});
    // ── checkpoint crystal: soft green gems that turn a bright blue-white once you pass ──
    if(lv.cp!=null&&lv.cp>s0-1&&lv.cp<s1+1){const [x,y,f]=P(lv.cp,0),on=R.cpHit,pu=.5+.5*Math.sin(t*3);g.save();g.translate(x,y);g.rotate(f);
      const hU=UP*1.1,base=UP*.34,gc=on?'150,220,255':'90,230,140';
      // glow: gentle while green, big and bright once lit (plus a beam of light)
      if(on){const bg3=g.createLinearGradient(0,0,0,-hU*4);bg3.addColorStop(0,'rgba(190,235,255,.5)');bg3.addColorStop(1,'rgba(190,235,255,0)');g.fillStyle=bg3;g.beginPath();g.moveTo(-base*1.1,0);g.lineTo(-base*.4,-hU*4);g.lineTo(base*.4,-hU*4);g.lineTo(base*1.1,0);g.fill();}
      const gr2=on?hU*2.1:hU*.9,hg=g.createRadialGradient(0,-hU*.45,0,0,-hU*.45,gr2);hg.addColorStop(0,`rgba(${gc},${on?.55+.25*pu:.22+.1*pu})`);hg.addColorStop(1,`rgba(${gc},0)`);g.fillStyle=hg;g.beginPath();g.arc(0,-hU*.45,gr2,0,Math.PI*2);g.fill();
      g.fillStyle=PH_THEME[lv.P.planet].crust;g.beginPath();g.ellipse(0,-UP*.04,base*1.6,UP*.17,0,Math.PI,Math.PI*2);g.fill();
      // three rounded gems: a big one in the middle, two smaller ones leaning out a little
      [[-base*.62,.6,-.22],[base*.62,.68,.2],[0,1,0]].forEach(([dx,sc,tilt])=>{const h=hU*sc,w=base*.5*(.75+.25*sc);g.save();g.translate(dx,-UP*.06);g.rotate(tilt);
        const cg=g.createLinearGradient(-w,0,w,0);if(on){cg.addColorStop(0,'#7cc8ff');cg.addColorStop(.5,'#ffffff');cg.addColorStop(1,'#a8e2ff');}else{cg.addColorStop(0,'#2fae62');cg.addColorStop(.5,'#b8ffd0');cg.addColorStop(1,'#46cf7c');}
        if(on){g.shadowColor='#bfe9ff';g.shadowBlur=18+14*pu;}g.fillStyle=cg;g.beginPath();g.moveTo(-w,0);g.lineTo(-w,-h*.55);g.quadraticCurveTo(-w,-h,0,-h);g.quadraticCurveTo(w,-h,w,-h*.55);g.lineTo(w,0);g.closePath();g.fill();g.shadowBlur=0;
        g.strokeStyle=on?'rgba(255,255,255,.95)':'rgba(230,255,240,.6)';g.lineWidth=1.2;g.stroke();
        g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(-w*.35,-h*.6,w*.18,h*.22,0,0,Math.PI*2);g.fill();g.restore();});
      if(on)for(let k=0;k<5;k++){const a2=t*1.6+k*Math.PI*.4,rx=Math.cos(a2)*base*2,ry=-hU*.55+Math.sin(a2)*hU*.3;g.fillStyle=`rgba(225,245,255,${.55+.45*Math.sin(t*4+k)})`;g.beginPath();g.arc(rx,ry,2,0,Math.PI*2);g.fill();}
      g.restore();}
    // ── glowing press markers on the first few of each new idea (where perfect play presses) ──
    lv.acts.forEach(a=>{if(!a.tut||a.t<S.s-.4||a.t>s1)return;const near=Math.max(0,1-Math.abs(a.t-S.s)/3),[x,y]=P(a.t,(a.h||0)+.45);
      const r=Math.max(14,UP*.3)*(1+.15*pulse),col=a.w==='j'?'#00e5ff':'#ff4dff';g.globalAlpha=Math.min(1,.6+near)*(a.t<S.s?Math.max(0,1+(a.t-S.s)/.4):1);
      g.save();g.shadowColor=col;g.shadowBlur=10+8*pulse;g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();g.restore();
      // the same icon as the button it means
      g.save();g.translate(x-r*.62,y-r*.62);g.scale(r*1.24/24,r*1.24/24);g.strokeStyle='#0a0a16';g.fillStyle='#0a0a16';g.lineWidth=2.8;g.lineCap='round';g.lineJoin='round';g.stroke(a.w==='j'?PH_ICO_J:PH_ICO_B);if(a.w!=='j'){g.beginPath();g.arc(12,3.2,1.6,0,Math.PI*2);g.fill();}g.restore();g.globalAlpha=1;});
    // stardust
    lv.dust.forEach((d,i)=>{if(!d.bell)return;if(d.s<s0-1||d.s>s1+1)return;drawBell(d,R.got.has(i),t,pulse,S);});
    lv.dust.forEach((d,i)=>{if(d.bell||R.got.has(i)||d.s<s0||d.s>s1)return;const [x,y]=P(d.s,d.h),z=BP*.06*(1+.3*Math.sin(t*6+i));
      g.fillStyle='#ffe680';g.shadowColor='#ffd23a';g.shadowBlur=8;g.beginPath();for(let k=0;k<8;k++){const r=k%2?z*.4:z,a=k/8*Math.PI*2+t;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.closePath();g.fill();g.shadowBlur=0;});
    // comet chasing you
    if(lv.bossS<Infinity&&S.s>lv.bossS-3){
      const k=Math.min(1,(S.s-(lv.bossS-3))/3),won=R.won?Math.min(1,(performance.now()-R.won)/900):0;
      const cx=AX-BP*(3.4-1.2*k)-won*BP*0,cy=GY-UP*(2.8-won*2.8)+Math.sin(t*3)*UP*.15,cr=BP*.32;
      if(won<1){const tg=g.createLinearGradient(cx,cy,cx-BP*3,cy-UP*.7);tg.addColorStop(0,'rgba(255,220,140,.8)');tg.addColorStop(1,'rgba(255,80,40,0)');
        g.fillStyle=tg;g.beginPath();g.moveTo(cx,cy-cr);g.lineTo(cx-BP*3,cy-UP*.7+Math.sin(t*5)*UP*.12);g.lineTo(cx,cy+cr);g.fill();
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
    if(R.idleS&&!R.won)eh+=R.idleS.h;
    const [ax,ay]=P(es,eh);
    if(!R.dead&&ea>0&&esc>0){R.trail.push([ax,ay]);if(R.trail.length>10)R.trail.shift();
      R.trail.forEach((p,i)=>{g.fillStyle=`rgba(0,255,136,${i/R.trail.length*.25})`;g.beginPath();g.arc(p[0]-(R.trail.length-i)*BP*.035,p[1]-UP*.35,UP*.12*(i/R.trail.length),0,Math.PI*2);g.fill();});
      const as=Math.max(26,UP*.85),col=(typeof getAlienColor==='function')?getAlienColor(0):'#00ff88';
      // shadow on the ground
      const [shx,shy]=P(S.s,phSupport(lv,S,S.s,S.h).top??-1);if(!R.won&&(!phInPit(lv,S.s)||S.h>-0.1)){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(shx,shy,as*.4*(1/(1+S.h*.4)),as*.1,0,0,Math.PI*2);g.fill();}
      const land=Math.max(0,1-(S.s-S.landT)*5);
      // in low gravity the alien floats inside a shimmering bubble, so you can feel the change
      if(!R.won&&lv.zones.some(z=>S.s>=z.a&&S.s<z.b)){const br=as*(.78+.05*Math.sin(t*3)),bx=ax,by=ay-as*.48,bb=g.createRadialGradient(bx-br*.3,by-br*.35,br*.1,bx,by,br);
        bb.addColorStop(0,'rgba(220,245,255,.28)');bb.addColorStop(.75,'rgba(140,210,255,.10)');bb.addColorStop(1,'rgba(170,230,255,.55)');g.fillStyle=bb;g.beginPath();g.arc(bx,by,br,0,Math.PI*2);g.fill();
        g.strokeStyle='rgba(200,240,255,.7)';g.lineWidth=1.5;g.beginPath();g.arc(bx,by,br,0,Math.PI*2);g.stroke();g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.ellipse(bx-br*.4,by-br*.45,br*.18,br*.09,-.6,0,Math.PI*2);g.fill();}
      g.save();g.globalAlpha=ea;g.translate(ax,ay-as*.48);g.rotate(-S.flip*Math.PI*2+(R.won&&lv.P.finish==='portal'?(1-esc)*6:0));g.scale((1+land*.18)*esc,(1-land*.18)*esc);
      g.shadowColor=col;g.shadowBlur=14;g.font=`${Math.round(as)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('👽',0,0);g.shadowBlur=0;g.globalAlpha=1;g.restore();
    }
    // perfect rings, on-beat pulse at the alien's feet, floating timing words, the early/late meter
    const fp=Math.pow(1-((S.s%1)+1)%1,4);if(!R.dead&&S.grounded){const [fx,fy,ff]=P(S.s,0);g.save();g.translate(fx,fy);g.rotate(ff);g.strokeStyle=`rgba(255,255,255,${.12+.4*fp})`;g.lineWidth=2;g.beginPath();g.ellipse(0,0,BP*(.18+.12*fp),UP*.08,0,0,Math.PI*2);g.stroke();g.restore();}
    R.rings=(R.rings||[]).filter(r=>(r.life-=dt*2.6)>0);R.rings.forEach(r=>{const [rx,ry]=P(r.s,r.h+.4),rr=UP*(.5+1.4*(1-r.life));g.strokeStyle=`rgba(0,255,153,${r.life*.8})`;g.lineWidth=3;g.beginPath();g.arc(rx,ry,rr,0,Math.PI*2);g.stroke();});
    R.texts=R.texts.filter(x=>(x.life-=dt*1.3)>0);R.texts.forEach(x=>{const [tx,ty]=P(x.s,x.h+(1-x.life)*.6);g.globalAlpha=Math.min(1,x.life*1.6);g.font=`${Math.round(Math.max(14,UP*.42)*(x.sz||1))}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=3;g.strokeText(x.txt,tx,ty);g.fillStyle=x.col;g.fillText(x.txt,tx,ty);});g.globalAlpha=1;
    // particles
    R.fx=R.fx.filter(p=>(p.life-=dt*1.4)>0);
    R.fx.forEach(p=>{p.s+=p.vs*dt;p.h+=p.vh*dt;p.vh-=6*dt;const [x,y]=P(p.s,p.h+.35);g.globalAlpha=p.life;g.fillStyle=p.col;g.beginPath();g.arc(x,y,p.z,0,Math.PI*2);g.fill();});g.globalAlpha=1;
    // count-in / death
    const tt=R.state==='play'&&!R.dead?tau():1;
    if(R.dead){const k=(performance.now()-R.dead.t)/900;g.fillStyle=`rgba(255,40,80,${.35*(1-k)})`;g.fillRect(0,0,W,H);g.fillStyle='#fff';g.font=`${Math.round(Math.min(W,H)*.16)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(Math.floor(R.dead.pct*100)+'%',W/2,H*.4);g.textBaseline='alphabetic';}
    g.restore();
  }

  // ── entry button in the bunker (after Worm Whack) ──
  // ── entry button: first in the minigame list, bought for 1 Alien Gem ──
  const eb=document.createElement('button');eb.id='planetHopBtn';eb.type='button';eb.textContent='🪐 PLANET HOP';
  const mbtn=$('matchingGameBtn');if(mbtn)mbtn.before(eb);
  eb.addEventListener('click',()=>{if(typeof mgBought!=='undefined'&&!mgBought.ph&&!(typeof TEST_MODE!=='undefined'&&TEST_MODE)){mgBuy('ph');return;}open();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&R&&R.state==='play'){stop();showSelect();}});
  window._phDebug={state:()=>R,start,input,tau:()=>R?tau():0,kind:sp=>R&&obsKind(R.lv,sp)};
})();
