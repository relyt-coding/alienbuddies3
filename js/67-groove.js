// ══════════════════════════════════════════════
//  THE GROOVE
//  The background hum plays from the title screen. Once you own the kick pad it grows into a groove to jam along
//  with on the drum pads: a warm 4-bar chord loop (keys + bass, no drums: the drums are yours) in A minor
//  (Am9 · Fmaj9 · Cmaj9 · G6).
//  • 100 BPM to start; once the sequencer is unlocked it follows the sequencer's BPM, and while the sequencer plays
//    every groove note lands on the sequencer's own steps (bar 1 of the groove = step 1 of your beat).
//  • It follows the song key once you pick one (KEY), so melodic sounds fit with it.
//  • On / off: ♪ GROOVE next to VIEW (once the sequencer's unlocked), or 🎵 GROOVE in Settings and the soundboard.
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList;
  // chord tones in semitones from A3 (220 Hz); bass root in semitones from A1 (55 Hz)
  const PROG=[
    {bass:0, keys:[3,7,10,14]},    // Am9   (C E G B over A)
    {bass:-4,keys:[0,3,7,10]},     // Fmaj9 (A C E G over F)
    {bass:3, keys:[-5,-2,2,5]},    // Cmaj9 (E G B D over C)
    {bass:-2,keys:[-2,2,5,7]},     // G6    (G B D E over G)
  ];
  const LEVEL=1.3;
  let gGain=null,keysBus=null,bassBus=null,gOn=false,gLevel=0,step=0,nextT=0,lastAt=-1,tmr=null,lastSeqWall=-1e9;
  const hz=(base,semi)=>base*Math.pow(2,semi/12);
  function ctxOk(){return typeof audioCtx!=='undefined'&&audioCtx&&!(typeof _exporting!=='undefined'&&_exporting)&&audioCtx.state!=='closed';}
  function bpm(){return (typeof drum!=='undefined'&&drum.seqTracks>0&&typeof seqBpm==='number'&&seqBpm>0)?seqBpm:100;}
  function stepDur(){return 60/bpm()/4;}
  // the minor key the groove plays in (A minor until you pick a key)
  function keyShift(){
    if(typeof seqKey==='undefined'||seqKey==null)return 0;
    const root=seqKeyMinor?seqKey:(seqKey+9)%12;let s=((root-9)%12+12)%12;if(s>5)s-=12;return s;
  }
  // groove on = music on, in a game, and the kick pad is yours
  function wanted(){return typeof musicOn!=='undefined'&&musicOn&&B.contains('game-active')&&typeof drum!=='undefined'&&drum.pads>=2;}

  function nodes(){
    if(!ctxOk()||typeof ambGain==='undefined'||!ambGain)return false;
    if(gGain&&gGain.context===audioCtx)return true;
    const c=audioCtx;
    gGain=c.createGain();gGain.gain.value=0;gGain.connect(ambGain);gLevel=0;
    keysBus=c.createBiquadFilter();keysBus.type='lowpass';keysBus.frequency.value=2600;keysBus.Q.value=.5;keysBus.connect(gGain);
    // a little room on the keys (its own small reverb, so the drum reverb settings don't change the groove)
    try{const cv=c.createConvolver(),L=Math.round(c.sampleRate*1.6),ir=c.createBuffer(2,L,c.sampleRate);
      for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.6);}
      cv.buffer=ir;const sg=c.createGain();sg.gain.value=.22;keysBus.connect(sg);sg.connect(cv);cv.connect(gGain);}catch(e){}
    bassBus=c.createBiquadFilter();bassBus.type='lowpass';bassBus.frequency.value=560;bassBus.Q.value=.6;bassBus.connect(gGain);
    gOn=false;   // (new sound engine: fade back in from silence)
    return true;
  }
  // soft electric-piano-ish note: sine body + a quiet octave triangle, quick attack, gentle decay
  function key(t,f,dur,v){
    const c=audioCtx,o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),g2=c.createGain();
    o.type='sine';o.frequency.value=f;o2.type='triangle';o2.frequency.value=f*2;g2.gain.value=.12;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(v*.42,t+.22);
    g.gain.setValueAtTime(v*.42,t+Math.max(.23,dur-.08));g.gain.exponentialRampToValueAtTime(.0001,t+dur+.35);
    o.connect(g);o2.connect(g2);g2.connect(g);g.connect(keysBus);o.start(t);o2.start(t);o.stop(t+dur+.4);o2.stop(t+dur+.4);
  }
  function bass(t,f,dur,v){
    const c=audioCtx,o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),g2=c.createGain();
    o.type='sine';o.frequency.value=f;o2.type='sawtooth';o2.frequency.value=f;g2.gain.value=.3;   // (the saw's overtones let phone speakers hear the bass)
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(v*.55,t+.18);
    g.gain.setValueAtTime(v*.55,t+Math.max(.19,dur-.06));g.gain.exponentialRampToValueAtTime(.0001,t+dur+.12);
    o.connect(g);o2.connect(g2);g2.connect(g);g.connect(bassBus);o.start(t);o2.start(t);o.stop(t+dur+.15);o2.stop(t+dur+.15);
  }
  // one 16th-note step of the groove (s = 0..63 across the 4 bars)
  function play(s,t){
    if(!gOn)return;
    const bar=Math.floor(s/16)%4,p=s%16,ch=PROG[bar],nx=PROG[(bar+1)%4],k=keyShift(),sd=stepDur();
    const kv=.062,bv=.34;
    // keys: a long chord on the 1, a soft push on the "and" of 2, a short stab before 4
    if(p===0)ch.keys.forEach((n,i)=>key(t+i*.006,hz(220,n+k),sd*5.5,kv));
    if(p===6)ch.keys.forEach((n,i)=>key(t+i*.004,hz(220,n+k),sd*1.6,kv*.7));
    if(p===11)ch.keys.forEach((n,i)=>key(t,hz(220,n+k),sd*1.2,kv*.55));
    if(bar===3&&p===14)[nx.keys[3],nx.keys[2]].forEach((n,i)=>key(t+i*sd,hz(220,n+k+12),sd*.9,kv*.4));   // little pick-up into bar 1
    // bass: root, octave bounce, root, then a walk-up into the next chord
    if(p===0)bass(t,hz(55,ch.bass+k),sd*5,bv);
    if(p===7)bass(t,hz(55,ch.bass+k+12),sd*.8,bv*.6);
    if(p===10)bass(t,hz(55,ch.bass+k),sd*2.5,bv*.85);
    if(p===14)bass(t,hz(55,ch.bass+k+7),sd*1.6,bv*.6);
  }

  // ── fading in and out ──
  function setOn(on){
    if(!nodes())return;
    if(on===gOn&&gLevel===(on?LEVEL:0))return;
    gOn=on;const now=audioCtx.currentTime;gLevel=on?LEVEL:0;
    gGain.gain.cancelScheduledValues(now);gGain.gain.setValueAtTime(gGain.gain.value,now);gGain.gain.linearRampToValueAtTime(gLevel,now+(on?2.4:1.2));
    if(on){step=0;nextT=now+.12;lastAt=-1;}
  }
  // the hum follows the key too
  let humShift=null;
  function tuneHum(){
    const H=window._humOsc,k=keyShift();if(!H||!ctxOk()||H.ctx!==audioCtx||k===humShift)return;humShift=k;
    const now=audioCtx.currentTime,r=Math.pow(2,k/12);
    try{H.drone[0].frequency.setTargetAtTime(H.drone[1]*r,now,.4);H.pads.forEach(([o,f])=>o.frequency.setTargetAtTime(f*r,now,.4));}catch(e){}
  }

  // ── its own clock (when the sequencer isn't playing): a little worker so it keeps time with the tab hidden ──
  function tick(){
    if(!ctxOk())return;
    tuneHum();
    const want=wanted();
    if(want!==gOn||(gGain&&gGain.context!==audioCtx))setOn(want);
    if(!gOn)return;
    if(performance.now()-lastSeqWall<400)return;   // the sequencer is playing: it drives the groove (grooveSeqStep)
    const now=audioCtx.currentTime,la=document.hidden?1.6:.15,sd=stepDur();
    if(nextT<now-.25)nextT=now+.05;   // woke from a pause: carry on from now
    let n=0;
    while(nextT<now+la&&n<256){if(nextT>lastAt+sd*.5){play(step,nextT);lastAt=nextT;}step=(step+1)%64;nextT+=sd;n++;}
  }
  // while the sequencer plays, it lands on the sequencer's own steps (pos = the step within the sequencer's bar)
  window.grooveSeqStep=function(pos,at){
    if(!gOn||!ctxOk())return;
    lastSeqWall=performance.now();
    // line up the beat; with a 32 / 64 step loop, line up the bars too (chord 1 on the loop's first bar)
    const p=((pos%16)+16)%16,sb=Math.floor(pos/16),lb=(typeof seqMode!=='undefined'&&seqMode==='pattern'&&typeof STEPS==='number')?Math.max(1,Math.min(4,STEPS/16)):1;
    let bar=Math.floor(step/16)%4;if(bar%lb!==sb%lb)bar=bar-(bar%lb)+(sb%lb);
    step=(bar*16+p)%64;
    const sd=stepDur();
    if(at>lastAt+sd*.5){play(step,at);lastAt=at;}
    step=(step+1)%64;nextT=at+sd;
  };
  window.grooveRefresh=function(){try{tick();}catch(e){}paintBtn();};
  window.grooveState=()=>({on:gOn,level:gGain?+gGain.gain.value.toFixed(3):null,step,bpm:bpm(),key:keyShift(),seqDriving:performance.now()-lastSeqWall<400});
  try{
    const src='let t=null;onmessage=function(e){if(t){clearInterval(t);t=null;}if(e.data&&e.data.ms){t=setInterval(function(){postMessage(1);},e.data.ms);}};';
    const w=new Worker(URL.createObjectURL(new Blob([src],{type:'application/javascript'})));
    w.onmessage=()=>{try{tick();}catch(e){}};w.postMessage({ms:25});
  }catch(e){tmr=setInterval(()=>{try{tick();}catch(e2){}},25);}

  // ── ♪ GROOVE next to VIEW (same switch as GROOVE in Settings / the soundboard) ──
  const btn=document.getElementById('vtbGrooveBtn');
  function paintBtn(){if(!btn)return;const on=typeof musicOn!=='undefined'&&musicOn;btn.setAttribute('data-on',on?'1':'0');btn.setAttribute('aria-pressed',on?'true':'false');}
  if(btn)btn.addEventListener('click',e=>{
    e.stopPropagation();
    const t=document.getElementById('bgMusicToggle');
    if(t){t.checked=!musicOn;t.dispatchEvent(new Event('change'));}else musicOn=!musicOn;
    const s=document.getElementById('settingsBgMusic');if(s)s.checked=musicOn;
    if(musicOn&&typeof startAmbience==='function'&&!ambStarted){getCtx();startAmbience();}
    paintBtn();if(typeof autoSave==='function')autoSave();
    if(typeof showToast==='function')showToast(musicOn?'♪ Groove on':'Groove off');
  });
  ['bgMusicToggle','settingsBgMusic'].forEach(id=>{const t=document.getElementById(id);if(t)t.addEventListener('change',()=>setTimeout(paintBtn,0));});
  setInterval(paintBtn,1000);paintBtn();

  // ── the hum on the title screen: starts with your first tap or key there (browsers only allow sound after one) ──
  function titleHum(){
    if(B.contains('game-active')||typeof musicOn==='undefined'||!musicOn)return;
    try{getCtx();if(!ambStarted)startAmbience();
      if(ambGain&&audioCtx){const now=audioCtx.currentTime;if(ambGain.gain.value<AMB_LEVEL*.5){ambGain.gain.cancelScheduledValues(now);ambGain.gain.setValueAtTime(ambGain.gain.value,now);ambGain.gain.linearRampToValueAtTime(AMB_LEVEL,now+1.5);}}
    }catch(e){}
  }
  ['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,titleHum,{capture:true,passive:true}));
})();
