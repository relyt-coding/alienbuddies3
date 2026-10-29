
// ══════════════════════════════════════════════
//  AUDIO ENGINE
// ══════════════════════════════════════════════
const AMB_LEVEL=0.28; // background ambience level (v0.2.73: 0.4 -> 0.28) so it never drowns out the sounds
let audioCtx=null,masterGainNode=null,drumMasterGain=null,drumMasterReal=null,rvbReal=null,rvbNode=null,rvbGainNode=null,ambGain=null,ambStarted=false;
let sfxOn=true;
let musicOn=true;

// builds the music graph (volume knob, music bus, built-in reverb, master effects + limiter) on a context.
// The game's live AudioContext uses it once; WAV export builds a second copy on an OfflineAudioContext.
function _initAudioGraph(c,vol){
  masterGainNode=c.createGain();masterGainNode.gain.value=vol;masterGainNode.connect(c.destination);
  ambGain=c.createGain();ambGain.gain.value=AMB_LEVEL;ambGain.connect(masterGainNode);
  drumMasterGain=c.createGain();drumMasterGain.gain.value=1;drumMasterGain.connect(masterGainNode);drumMasterReal=drumMasterGain;
  // Reverb
  rvbNode=c.createConvolver();rvbGainNode=c.createGain();rvbGainNode.gain.value=.22;
  const L=c.sampleRate*2.5,ir=c.createBuffer(2,L,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.3);}
  rvbNode.buffer=ir;rvbNode.connect(rvbGainNode);rvbGainNode.connect(drumMasterGain);rvbReal=rvbNode;
  if(typeof applyMasterFx==='function')applyMasterFx(); // master EQ / compression (Mastering) + safety limiter
}
let _exporting=false; // true while a WAV export is being scheduled (sounds go to the offline context)
function getCtx(){
  if(!audioCtx){
    audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    _initAudioGraph(audioCtx,masterVol);
  }
  if(!_exporting&&audioCtx.state==='suspended')audioCtx.resume();
  return audioCtx;
}
const Tnow=()=>getCtx().currentTime;
function noiseBuf(dur){const c=getCtx(),L=Math.round(c.sampleRate*dur),b=c.createBuffer(1,L,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<L;i++)d[i]=Math.random()*2-1;return b;}
function distCurve(k=3){const v=new Float32Array(256);for(let i=0;i<256;i++){const x=i*2/256-1;v[i]=Math.tanh(x*k)*.88;}return v;}

// Per-sound gain helper — applies masterVol and per-sound vol
function getSoundGainVal(id){
  const sv=soundVols[id]!==undefined?soundVols[id]:1;
  return sv*masterVol;
}

// ══════════════════════════════════════════════
//  SOUND DEFINITIONS (all 28+3 default = accessible library)
// ══════════════════════════════════════════════
// Each: {id, name, tag, color, desc, fn(t, gainVal)}
// fn must respect gainVal for volume
function mkSnd(id,name,tag,color,desc,fn){return{id,name,tag,color,desc,fn};}

const ALL_SOUNDS=[
  mkSnd('hihat','HI-HAT','drums','#44ffcc','Tight closed hi-hat',(t,gv)=>{
    const c=getCtx();
    // Each hit has its own gain; a new hit chokes only the previous hi-hat (never future scheduled ones,
    // so a pad hit can't silence a sequencer hat that was already queued on the audio clock)
    const g=c.createGain();g.connect(drumMasterGain);
    const prev=drumMasterGain._hhLast;
    if(prev&&prev.t<t){
      prev.g.gain.cancelScheduledValues(t);
      prev.g.gain.linearRampToValueAtTime(.0001,t+.004);
    }
    drumMasterGain._hhLast={g,t};
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(.075*(gv??1),t+.002);
    g.gain.exponentialRampToValueAtTime(.001,t+.06);
    const s=c.createBufferSource();s.buffer=noiseBuf(.06);
    const f1=c.createBiquadFilter();f1.type='highpass';f1.frequency.value=7000;
    const f2=c.createBiquadFilter();f2.type='bandpass';f2.frequency.value=10000;f2.Q.value=.5;
    s.connect(f1);f1.connect(f2);f2.connect(g);
    s.start(t);s.stop(t+.07);
  }),
  mkSnd('snare','SNARE','drums','#ffcc44','Cracking rimshot snare',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),og=c.createGain();o.type='triangle';o.frequency.value=200;o.connect(og);og.connect(drumMasterGain);og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.315*(gv??1),t+.002);og.gain.exponentialRampToValueAtTime(.001,t+.18);o.start(t);o.stop(t+.18);const s=c.createBufferSource();s.buffer=noiseBuf(.22);const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;f.Q.value=.7;const ng=c.createGain();s.connect(f);f.connect(ng);ng.connect(drumMasterGain);ng.connect(rvbNode);ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.455*(gv??1),t+.002);ng.gain.exponentialRampToValueAtTime(.001,t+.22);s.start(t);s.stop(t+.22);}),
  mkSnd('kick','KICK','drums','#ff6644','Punchy kick drum',(t,gv)=>{const c=getCtx(),G=(gv??1)*.62;
    // v0.2.80: punchy kick = fast pitch dive body (saturated for weight) + mid thump + beater click
    const o=c.createOscillator(),g=c.createGain(),sh=c.createWaveShaper();sh.curve=distCurve(1.8);
    o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(62,t+.035);o.frequency.exponentialRampToValueAtTime(42,t+.3);
    o.connect(sh);sh.connect(g);g.connect(drumMasterGain);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1.15*G,t+.002);g.gain.exponentialRampToValueAtTime(.5*G,t+.09);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.52);
    const o2=c.createOscillator(),g2=c.createGain();o2.type='triangle';o2.frequency.setValueAtTime(130,t);o2.frequency.exponentialRampToValueAtTime(70,t+.08);o2.connect(g2);g2.connect(drumMasterGain);
    g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(.6*G,t+.002);g2.gain.exponentialRampToValueAtTime(.001,t+.16);o2.start(t);o2.stop(t+.18);
    const n=c.createBufferSource();n.buffer=noiseBuf(.03);const nf=c.createBiquadFilter();nf.type='bandpass';nf.frequency.value=2800;nf.Q.value=.9;const ng=c.createGain();n.connect(nf);nf.connect(ng);ng.connect(drumMasterGain);
    ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.55*G,t+.001);ng.gain.exponentialRampToValueAtTime(.001,t+.02);n.start(t);n.stop(t+.03);}),
  mkSnd('trapkick','TRAP KICK','drums','#ff3322','Hard 808 trap kick',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain(),d=c.createWaveShaper();d.curve=distCurve(2);o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(28,t+.5);o.connect(d);d.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.525*(gv??1),t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.85);o.start(t);o.stop(t+.85);}),
  mkSnd('clap','CLAP','drums','#ffee88','Layered noise clap',(t,gv)=>{const c=getCtx();[0,.012,.026].forEach(off=>{const s=c.createBufferSource();s.buffer=noiseBuf(.14);const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1100+Math.random()*400;f.Q.value=.5;const g=c.createGain();s.connect(f);f.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t+off);g.gain.linearRampToValueAtTime(.6*(gv??1),t+off+.002);g.gain.exponentialRampToValueAtTime(.001,t+off+.18);s.start(t+off);s.stop(t+off+.18);});}),
  mkSnd('rimshot','RIMSHOT','drums','#ffbb44','Sharp rimshot transient',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=450;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.6*(gv??1),t+.001);g.gain.exponentialRampToValueAtTime(.001,t+.06);o.start(t);o.stop(t+.06);const s=c.createBufferSource();s.buffer=noiseBuf(.04);const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=4000;const ng=c.createGain();s.connect(f);f.connect(ng);ng.connect(drumMasterGain);ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.5*(gv??1),t+.001);ng.gain.exponentialRampToValueAtTime(.001,t+.04);s.start(t);s.stop(t+.04);}),
  mkSnd('shaker','SHAKER','drums','#eeffaa','Bright snappy shaker',(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.09);const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=7800;f.Q.value=1.5;const g=c.createGain();s.connect(f);f.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.35*(gv??1),t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.09);s.start(t);s.stop(t+.09);}),
  mkSnd('floortom','FLOOR TOM','drums','#ff9966','Deep pitched floor tom',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(55,t+.25);o.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.6*(gv??1),t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.42);o.start(t);o.stop(t+.42);}),
  mkSnd('sub','SUB','bass','#cc44ff','Deep detuned sub bass stab',(t,gv)=>{const c=getCtx(),o1=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=220;f.Q.value=2;o1.type='sawtooth';o1.frequency.value=55;o2.type='square';o2.frequency.value=55.5;o1.connect(f);o2.connect(f);f.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28*(gv??1),t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.55);o1.start(t);o2.start(t);o1.stop(t+.56);o2.stop(t+.56);}),
  mkSnd('chord','CHORD','synth','#ff44aa','Cm7 synth stab',(t,gv)=>{const c=getCtx(),freqs=[130.81,155.56,196,233.08],g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=1800;fl.frequency.exponentialRampToValueAtTime(600,t+.4);const d=c.createWaveShaper();d.curve=distCurve(1.5);g.connect(fl);fl.connect(d);d.connect(drumMasterGain);d.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2*(gv??1),t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.5);freqs.forEach((f,i)=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f*(1+(i-1.5)*.002);o.connect(g);o.start(t);o.stop(t+.5);});}),
  mkSnd('spaceperc','SPACE','perc','#88ff44','FM metallic space perc',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(880,t);o.frequency.exponentialRampToValueAtTime(110,t+.35);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=2200;fl.Q.value=3;const d=c.createWaveShaper();d.curve=distCurve(3);o.connect(fl);fl.connect(d);d.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.75*(gv??1),t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.38);o.start(t);o.stop(t+.38);const fm=c.createOscillator(),fmg=c.createGain();fm.frequency.value=3520;fm.connect(fmg);fmg.connect(o.frequency);fmg.gain.setValueAtTime(300,t);fmg.gain.exponentialRampToValueAtTime(1,t+.06);fm.start(t);fm.stop(t+.06);}),
  mkSnd('lead','LEAD','synth','#ff8800','Vibrato pentatonic lead',(t,gv)=>{const c=getCtx(),scale=[261.63,311.13,349.23,392,466.16,523.25],freq=scale[Math.floor(Math.random()*scale.length)],o=c.createOscillator(),lfo=c.createOscillator(),lg=c.createGain(),g=c.createGain(),fl=c.createBiquadFilter();o.type='sawtooth';o.frequency.value=freq;lfo.frequency.value=5.2;lfo.connect(lg);lg.gain.value=8;lg.connect(o.frequency);fl.type='lowpass';fl.frequency.setValueAtTime(3200,t);fl.frequency.exponentialRampToValueAtTime(400,t+.6);o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.32*(gv??1),t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.6);o.start(t);lfo.start(t);o.stop(t+.6);lfo.stop(t+.6);}),
  mkSnd('basenote','BASS NOTE','bass','#aa44ff','Smooth sine sub bass',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=73.4;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.6*(gv??1),t+.01);g.gain.setValueAtTime(0.6*(gv??1),t+.22);g.gain.exponentialRampToValueAtTime(.001,t+.75);o.start(t);o.stop(t+.75);}),
  mkSnd('bassslide','BASS SLIDE','bass','#dd66ff','Portamento bass slide',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(55,t+.14);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=600;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.52);o.start(t);o.stop(t+.52);}),
  mkSnd('pad','PAD','synth','#88aaff','Soft ambient pad',(t,gv)=>{const c=getCtx(),freqs=[196,246.94,293.66],g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=900;g.connect(fl);fl.connect(drumMasterGain);fl.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.26*(gv??1),t+.15);g.gain.setValueAtTime(.26*(gv??1),t+.55);g.gain.exponentialRampToValueAtTime(.001,t+1.3);freqs.forEach((f,i)=>{const o=c.createOscillator();o.type='sine';o.frequency.value=f*(1+i*.003);o.connect(g);o.start(t);o.stop(t+1.3);});}),
  mkSnd('arp','ARP','synth','#66ffee','Fast pentatonic arpeggio burst',(t,gv)=>{const c=getCtx(),notes=[261.63,329.63,392,493.88,523.25],g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=2000;g.connect(fl);fl.connect(drumMasterGain);fl.connect(rvbNode);notes.forEach((f,i)=>{const st=t+i*.075,o=c.createOscillator();o.type='square';o.frequency.value=f;const e=c.createGain();o.connect(e);e.connect(g);e.gain.setValueAtTime(0,st);e.gain.linearRampToValueAtTime(.16*(gv??1),st+.01);e.gain.exponentialRampToValueAtTime(.001,st+.07);o.start(st);o.stop(st+.08);});}),
  mkSnd('wobble','WOBBLE','bass','#ff66dd','LFO wobble bass drop',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),lfo=c.createOscillator(),lg=c.createGain(),fl=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.value=55;fl.type='lowpass';fl.Q.value=8;fl.frequency.value=300;lfo.frequency.value=4;lfo.connect(lg);lg.gain.value=500;lg.connect(fl.frequency);o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*(gv??1),t+.02);g.gain.setValueAtTime(.55*(gv??1),t+.32);g.gain.exponentialRampToValueAtTime(.001,t+.75);o.start(t);lfo.start(t);o.stop(t+.75);lfo.stop(t+.75);}),
  mkSnd('stab','STAB','synth','#ffee00','Punchy detuned unison stab',(t,gv)=>{const c=getCtx(),g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=2400;fl.frequency.exponentialRampToValueAtTime(400,t+.25);const d=c.createWaveShaper();d.curve=distCurve(2);g.connect(fl);fl.connect(d);d.connect(drumMasterGain);d.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.32);[261.63,262.5,260.8].forEach(f=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(g);o.start(t);o.stop(t+.32);});}),
  mkSnd('pluck','PLUCK','synth','#aaffcc','Karplus-Strong plucked string',(t,gv)=>{const c=getCtx(),freq=220*_ksMul,s=c.createBufferSource();s.buffer=noiseBuf(.025);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=freq*2;const g=c.createGain(),dl=c.createDelay(),fb=c.createGain();dl.delayTime.value=1/freq;fb.gain.value=.97;s.connect(fl);fl.connect(g);g.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(drumMasterGain);dl.connect(rvbNode);g.gain.setValueAtTime(gv??1,t);g.gain.exponentialRampToValueAtTime(.001,t+1.5);s.start(t);s.stop(t+.025);}),
  mkSnd('bell','BELL','perc','#ffffaa','FM bell tone, long decay',(t,gv)=>{const c=getCtx(),car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();car.type='sine';car.frequency.value=440;mod.frequency.value=440*3.5;mod.connect(mg);mg.gain.value=880;mg.connect(car.frequency);car.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*(gv??1),t+.004);g.gain.exponentialRampToValueAtTime(.001,t+2);car.start(t);mod.start(t);car.stop(t+2);mod.stop(t+2);}),
  mkSnd('cowbell','COWBELL','perc','#ffcc88','Classic metallic cowbell',(t,gv)=>{const c=getCtx(),g=c.createGain(),fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=562;fl.Q.value=5;[562,845].forEach(f=>{const o=c.createOscillator();o.type='square';o.frequency.value=f;o.connect(fl);o.start(t);o.stop(t+.55);});fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*(gv??1),t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.55);}),
  mkSnd('riser','RISER','fx','#88eeff','Sweeping noise riser',(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.7);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.setValueAtTime(200,t);fl.frequency.exponentialRampToValueAtTime(8000,t+.65);fl.Q.value=3;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.65*(gv??1),t+.3);g.gain.setValueAtTime(.65*(gv??1),t+.55);g.gain.exponentialRampToValueAtTime(.001,t+.7);s.start(t);s.stop(t+.7);}),
  mkSnd('downlift','DOWNLIFT','fx','#ff6688','Falling pitch impact',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(1800,t);o.frequency.exponentialRampToValueAtTime(38,t+.65);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=3000;const d=c.createWaveShaper();d.curve=distCurve(2);o.connect(d);d.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.75*(gv??1),t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.65);o.start(t);o.stop(t+.65);}),
  mkSnd('glitch','GLITCH','fx','#aaff88','Digital glitch burst',(t,gv)=>{const c=getCtx();for(let i=0;i<8;i++){if(Math.random()<.45)continue;const st=t+i*.022,s=c.createBufferSource();s.buffer=noiseBuf(.018);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=600+Math.random()*4000;fl.Q.value=9;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime((Math.random()*.85+.2)*(gv??1),st);g.gain.exponentialRampToValueAtTime(.001,st+.018);s.start(st);s.stop(st+.02);}}),
  mkSnd('junglesnare','JUNGLE','drums','#88ff88','Amen-style breakbeat snare',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),og=c.createGain();o.type='triangle';o.frequency.value=320;o.connect(og);og.connect(drumMasterGain);og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.6*(gv??1),t+.002);og.gain.exponentialRampToValueAtTime(.001,t+.1);o.start(t);o.stop(t+.1);const s=c.createBufferSource();s.buffer=noiseBuf(.28);const f1=c.createBiquadFilter();f1.type='bandpass';f1.frequency.value=2200;f1.Q.value=1.2;const f2=c.createBiquadFilter();f2.type='highpass';f2.frequency.value=900;const ng=c.createGain();s.connect(f1);f1.connect(f2);f2.connect(ng);ng.connect(drumMasterGain);ng.connect(rvbNode);ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(0.55*(gv??1),t+.002);ng.gain.exponentialRampToValueAtTime(.001,t+.28);s.start(t);s.stop(t+.28);}),
  mkSnd('choir','CHOIR','synth','#ffbbee','Synth vowel formant choir',(t,gv)=>{const c=getCtx(),g=c.createGain();[800,1200,2400].forEach((fq,i)=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=110*(1+i*.0015);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=fq;fl.Q.value=6;o.connect(fl);fl.connect(g);o.start(t);o.stop(t+.95);});g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.23*(gv??1),t+.12);g.gain.setValueAtTime(.23*(gv??1),t+.62);g.gain.exponentialRampToValueAtTime(.001,t+.95);}),
  mkSnd('vinyl','VINYL','fx','#cc99ff','Vinyl record scratch',(t,gv)=>{const c=getCtx(),dur=.3,L=Math.round(c.sampleRate*dur),buf=c.createBuffer(1,L,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<L;i++){const p=i/L;d[i]=Math.sin((200+p*4000*Math.sin(p*Math.PI*3))*i/c.sampleRate*Math.PI*2)*(Math.random()*.3+.7);}const s=c.createBufferSource();s.buffer=buf;const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=1200;fl.Q.value=2;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*(gv??1),t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.3);s.start(t);s.stop(t+.3);}),
  mkSnd('zap','ZAP','fx','#ffff55','Sci-fi laser zap',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(2200,t);o.frequency.exponentialRampToValueAtTime(110,t+.12);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=1800;fl.Q.value=4;const d=c.createWaveShaper();d.curve=distCurve(4);o.connect(fl);fl.connect(d);d.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*(gv??1),t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.start(t);o.stop(t+.12);}),
  mkSnd('marimba','MARIMBA','perc','#aaffee','Warm marimba mallet strike',(t,gv)=>{const c=getCtx(),car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();car.type='sine';car.frequency.value=523.25;mod.frequency.value=523.25*4;mod.connect(mg);mg.gain.value=200;mg.connect(car.frequency);car.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.65*(gv??1),t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.55);car.start(t);mod.start(t);car.stop(t+.55);mod.stop(t+.55);}),
  mkSnd('thud','THUD','drums','#ff7744','Mid-heavy punchy body hit',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(80,t);o.frequency.exponentialRampToValueAtTime(45,t+.18);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=400;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.65*(gv??1),t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.start(t);o.stop(t+.28);}),
];
const SOUND_MAP={};ALL_SOUNDS.forEach(s=>SOUND_MAP[s.id]=s);


// ══════════════════════════════════════════════
//  PLANET SOUNDS — unlocked via skill tree
// ══════════════════════════════════════════════
const PLANET_SOUND_DEFS = [
  // ── PLANET MANTRA / OM ──
  {id:'om_bell',    name:'Om Bell',      planet:'mantra', continent:'om',    color:'#aaeecc',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=880;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.45*(gv??1),t+.004);g.gain.exponentialRampToValueAtTime(.001,t+1.8);o.start(t);o.stop(t+1.8);}},
  {id:'om_bowl',    name:'Om Bowl',      planet:'mantra', continent:'om',    color:'#88ddbb',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(320,t);o.frequency.exponentialRampToValueAtTime(318,t+1.5);o.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.4*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+2.2);o.start(t);o.stop(t+2.2);}},
  {id:'om_rim',     name:'Om Rim',       planet:'mantra', continent:'om',    color:'#66ccaa',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=1200;const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=1200;fl.Q.value=8;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3*(gv??1),t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.start(t);o.stop(t+.12);}},
  {id:'om_shaker2', name:'Om Shaker',    planet:'mantra', continent:'om',    color:'#99ddaa',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.18);const fl=c.createBiquadFilter();fl.type='highpass';fl.frequency.value=6000;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18*(gv??1),t+.005);g.gain.exponentialRampToValueAtTime(.001,t+.18);s.start(t);s.stop(t+.18);}},

  // ── PLANET MANTRA / SO HUM ──
  {id:'sh_metalclick',name:'Metal Click', planet:'mantra', continent:'sohum', color:'#ccbbaa',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=2200;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*(gv??1),t+.001);g.gain.exponentialRampToValueAtTime(.001,t+.06);o.start(t);o.stop(t+.06);}},
  {id:'sh_tinpan',  name:'Tin Pan',      planet:'mantra', continent:'sohum', color:'#bbaacc',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(600,t);o.frequency.exponentialRampToValueAtTime(400,t+.15);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=700;fl.Q.value=3;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.35*(gv??1),t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start(t);o.stop(t+.3);}},
  {id:'sh_steeldrum',name:'Steel Drum',  planet:'mantra', continent:'sohum', color:'#aabbcc',
   fn:(t,gv)=>{const c=getCtx(),car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();car.type='sine';car.frequency.value=370;mod.frequency.value=740;mod.connect(mg);mg.gain.value=185;mg.connect(car.frequency);car.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*(gv??1),t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.9);car.start(t);mod.start(t);car.stop(t+.9);mod.stop(t+.9);}},
  {id:'sh_cymbal_lo',name:'Lo Cymbal',   planet:'mantra', continent:'sohum', color:'#998877',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.6);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=3000;fl.Q.value=0.5;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2*(gv??1),t+.008);g.gain.exponentialRampToValueAtTime(.001,t+.6);s.start(t);s.stop(t+.6);}},
  {id:'sh_chain',   name:'Chain',        planet:'mantra', continent:'sohum', color:'#aaaaaa',
   fn:(t,gv)=>{const c=getCtx();for(let i=0;i<6;i++){const s=c.createBufferSource();s.buffer=noiseBuf(.04);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=2000+Math.random()*2000;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime((Math.random()*.3+.1)*(gv??1),t+i*.025);g.gain.exponentialRampToValueAtTime(.001,t+i*.025+.04);s.start(t+i*.025);s.stop(t+i*.025+.05);}}},

  // ── PLANET MANTRA / MANAS ──
  {id:'mn_bitcrush', name:'Bit Crush',   planet:'mantra', continent:'manas', color:'#88aaff',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(220,t);o.frequency.setValueAtTime(110,t+.02);o.frequency.setValueAtTime(220,t+.04);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(.4*(gv??1),t);g.gain.exponentialRampToValueAtTime(.001,t+.08);o.start(t);o.stop(t+.08);}},
  {id:'mn_glitchperc',name:'Glitch Perc',planet:'mantra', continent:'manas', color:'#aaaaff',
   fn:(t,gv)=>{const c=getCtx();for(let i=0;i<5;i++){if(Math.random()<.4)continue;const o=c.createOscillator();o.type='square';o.frequency.value=100+Math.random()*800;const g=c.createGain();o.connect(g);g.connect(drumMasterGain);const st=t+i*.015;g.gain.setValueAtTime((Math.random()*.4+.1)*(gv??1),st);g.gain.exponentialRampToValueAtTime(.001,st+.015);o.start(st);o.stop(st+.02);}}},
  {id:'mn_databend', name:'Data Bend',   planet:'mantra', continent:'manas', color:'#9988ff',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(440,t);o.frequency.linearRampToValueAtTime(55,t+.1);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=800;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(.35*(gv??1),t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.start(t);o.stop(t+.15);}},
  {id:'mn_synthpop', name:'Synth Pop',   planet:'mantra', continent:'manas', color:'#bbaaff',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=880;const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(3000,t);fl.frequency.exponentialRampToValueAtTime(400,t+.08);o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(.4*(gv??1),t);g.gain.exponentialRampToValueAtTime(.001,t+.1);o.start(t);o.stop(t+.1);}},
  {id:'mn_digitalsnare',name:'Dig.Snare',planet:'mantra', continent:'manas', color:'#7799ff',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.12);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=4000;fl.Q.value=2;const o=c.createOscillator();o.type='square';o.frequency.value=200;const og=c.createGain();const g=c.createGain();s.connect(fl);fl.connect(g);o.connect(og);og.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(.35*(gv??1),t);g.gain.exponentialRampToValueAtTime(.001,t+.12);og.gain.setValueAtTime(.2*(gv??1),t);og.gain.exponentialRampToValueAtTime(.001,t+.06);s.start(t);s.stop(t+.12);o.start(t);o.stop(t+.06);}},

  // ── PLANET MANTRA / FLOWW ──
  {id:'fw_waterdrip',name:'Water Drip',  planet:'mantra', continent:'floww', color:'#44bbff',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(1200,t);o.frequency.exponentialRampToValueAtTime(600,t+.08);o.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.4*(gv??1),t+.005);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.start(t);o.stop(t+.25);}},
  {id:'fw_marimba2', name:'Ocean Marimba',planet:'mantra',continent:'floww', color:'#55ccee',
   fn:(t,gv)=>{const c=getCtx(),car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();car.type='sine';car.frequency.value=392;mod.frequency.value=392*2;mod.connect(mg);mg.gain.value=80;mg.connect(car.frequency);car.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*(gv??1),t+.005);g.gain.exponentialRampToValueAtTime(.001,t+.7);car.start(t);mod.start(t);car.stop(t+.7);mod.stop(t+.7);}},
  {id:'fw_softbass', name:'Soft Bass',   planet:'mantra', continent:'floww', color:'#3399bb',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=60;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.6*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.5);}},
  {id:'fw_wave',     name:'Wave Crash',  planet:'mantra', continent:'floww', color:'#66bbdd',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.5);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(800,t);fl.frequency.exponentialRampToValueAtTime(200,t+.5);const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.25*(gv??1),t+.1);g.gain.exponentialRampToValueAtTime(.001,t+.5);s.start(t);s.stop(t+.5);}},
  {id:'fw_woodblock',name:'Wood Block',  planet:'mantra', continent:'floww', color:'#88bbaa',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(800,t);o.frequency.exponentialRampToValueAtTime(600,t+.04);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*(gv??1),t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.start(t);o.stop(t+.12);}},

  // ── PLANET HYPHAE / ENOKI ──
  {id:'en_tinktap',  name:'Tink Tap',   planet:'hyphae', continent:'enoki', color:'#ccffcc',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=3200;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3*(gv??1),t+.001);g.gain.exponentialRampToValueAtTime(.001,t+.08);o.start(t);o.stop(t+.08);}},
  {id:'en_woodtap',  name:'Wood Tap',   planet:'hyphae', continent:'enoki', color:'#aaddaa',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=1800;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.25*(gv??1),t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.1);o.start(t);o.stop(t+.1);}},
  {id:'en_highping', name:'High Ping',  planet:'hyphae', continent:'enoki', color:'#eeffee',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=4400;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2*(gv??1),t+.001);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.start(t);o.stop(t+.12);}},
  {id:'en_lightrim', name:'Light Rim',  planet:'hyphae', continent:'enoki', color:'#bbeecc',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=2000;const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=2200;fl.Q.value=10;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2*(gv??1),t+.001);g.gain.exponentialRampToValueAtTime(.001,t+.07);o.start(t);o.stop(t+.07);}},
  {id:'en_softclick',name:'Soft Click', planet:'hyphae', continent:'enoki', color:'#99cc99',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.02);const fl=c.createBiquadFilter();fl.type='highpass';fl.frequency.value=8000;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(.15*(gv??1),t);g.gain.exponentialRampToValueAtTime(.001,t+.02);s.start(t);s.stop(t+.02);}},

  // ── PLANET HYPHAE / MOREL ──
  {id:'mo_earththud',name:'Earth Thud',  planet:'hyphae', continent:'morel', color:'#886644',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(80,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.7*(gv??1),t+.005);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.start(t);o.stop(t+.35);}},
  {id:'mo_hollowboom',name:'Hollow Boom',planet:'hyphae', continent:'morel', color:'#774433',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(55,t);o.frequency.exponentialRampToValueAtTime(30,t+.3);o.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.65*(gv??1),t+.008);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.5);}},
  {id:'mo_deepmud',  name:'Deep Mud',   planet:'hyphae', continent:'morel', color:'#665533',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.2);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=300;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.2);s.start(t);s.stop(t+.2);}},
  {id:'mo_lowknock', name:'Low Knock',  planet:'hyphae', continent:'morel', color:'#997755',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(60,t+.1);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*(gv??1),t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.start(t);o.stop(t+.22);}},
  {id:'mo_caveboom', name:'Cave Boom',  planet:'hyphae', continent:'morel', color:'#553322',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=45;o.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.6*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.8);o.start(t);o.stop(t+.8);}},

  // ── PLANET HYPHAE / PORCINI ──
  {id:'po_woodmid',  name:'Wood Mid',   planet:'hyphae', continent:'porcini',color:'#bb8855',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(400,t);o.frequency.exponentialRampToValueAtTime(250,t+.12);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*(gv??1),t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.start(t);o.stop(t+.28);}},
  {id:'po_roundbonk',name:'Round Bonk', planet:'hyphae', continent:'porcini',color:'#cc9966',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(350,t);o.frequency.exponentialRampToValueAtTime(200,t+.18);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*(gv??1),t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.32);o.start(t);o.stop(t+.32);}},
  {id:'po_treeknock',name:'Tree Knock', planet:'hyphae', continent:'porcini',color:'#aa7744',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(180,t+.1);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.45*(gv??1),t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.start(t);o.stop(t+.2);}},
  {id:'po_stump',    name:'Stump Hit',  planet:'hyphae', continent:'porcini',color:'#996633',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(200,t);o.frequency.exponentialRampToValueAtTime(100,t+.2);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.6*(gv??1),t+.005);g.gain.exponentialRampToValueAtTime(.001,t+.38);o.start(t);o.stop(t+.38);}},
  {id:'po_logdrum',  name:'Log Drum',   planet:'hyphae', continent:'porcini',color:'#dd9955',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=280;const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=600;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*(gv??1),t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start(t);o.stop(t+.3);}},

  // ── PLANET HYPHAE / OYSTER ──
  {id:'oy_breathslide',name:'Breath Slide',planet:'hyphae',continent:'oyster',color:'#aaddff',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.25);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.setValueAtTime(800,t);fl.frequency.exponentialRampToValueAtTime(400,t+.25);fl.Q.value=2;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.22*(gv??1),t+.03);g.gain.exponentialRampToValueAtTime(.001,t+.25);s.start(t);s.stop(t+.25);}},
  {id:'oy_airblow',  name:'Air Blow',   planet:'hyphae', continent:'oyster', color:'#bbeeff',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.3);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=1200;fl.Q.value=1.5;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18*(gv??1),t+.05);g.gain.setValueAtTime(.18*(gv??1),t+.2);g.gain.exponentialRampToValueAtTime(.001,t+.3);s.start(t);s.stop(t+.3);}},
  {id:'oy_wetslap',  name:'Wet Slap',   planet:'hyphae', continent:'oyster', color:'#88bbdd',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.08);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=2000;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(.4*(gv??1),t);g.gain.exponentialRampToValueAtTime(.001,t+.08);s.start(t);s.stop(t+.08);}},
  {id:'oy_softbend', name:'Soft Bend',  planet:'hyphae', continent:'oyster', color:'#99ccee',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(660,t);o.frequency.exponentialRampToValueAtTime(440,t+.2);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.4);o.start(t);o.stop(t+.4);}},
  {id:'oy_shimmer',  name:'Shimmer',    planet:'hyphae', continent:'oyster', color:'#ddeeff',
   fn:(t,gv)=>{const c=getCtx();[4000,6000,8000].forEach(f=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start(t);o.stop(t+.3)});}},

  // ── PLANET HYPHAE / REISHI ──
  {id:'re_gong',     name:'Gong',       planet:'hyphae', continent:'reishi', color:'#ddbb88',
   fn:(t,gv)=>{const c=getCtx(),car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();car.type='sine';car.frequency.value=180;mod.frequency.value=181;mod.connect(mg);mg.gain.value=90;mg.connect(car.frequency);car.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.6*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+2.5);car.start(t);mod.start(t);car.stop(t+2.5);mod.stop(t+2.5);}},
  {id:'re_deepdrone',name:'Deep Drone', planet:'hyphae', continent:'reishi', color:'#cc9966',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=55;o.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.4*(gv??1),t+.05);g.gain.setValueAtTime(.4*(gv??1),t+.5);g.gain.exponentialRampToValueAtTime(.001,t+1.5);o.start(t);o.stop(t+1.5);}},
  {id:'re_ceremony', name:'Ceremony',   planet:'hyphae', continent:'reishi', color:'#eebb77',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=240;const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=800;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.45*(gv??1),t+.02);g.gain.exponentialRampToValueAtTime(.001,t+1.2);o.start(t);o.stop(t+1.2);}},
  {id:'re_lowbowl',  name:'Low Bowl',   planet:'hyphae', continent:'reishi', color:'#bbaa77',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(158,t+2);o.connect(g);g.connect(drumMasterGain);g.connect(rvbNode);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*(gv??1),t+.015);g.gain.exponentialRampToValueAtTime(.001,t+2.8);o.start(t);o.stop(t+2.8);}},
  {id:'re_resonance',name:'Resonance',  planet:'hyphae', continent:'reishi', color:'#ffeeaa',
   fn:(t,gv)=>{const c=getCtx();[220,330,440].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18*(gv??1),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+1.5+i*.3);o.start(t);o.stop(t+1.8+i*.3)});}},

  // ── PLANET HYPHAE / BELLA ──
  {id:'be_snap',     name:'Snap',       planet:'hyphae', continent:'bella',  color:'#ffeeaa',
   fn:(t,gv)=>{const c=getCtx(),s=c.createBufferSource();s.buffer=noiseBuf(.015);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=5000;fl.Q.value=5;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(.5*(gv??1),t);g.gain.exponentialRampToValueAtTime(.001,t+.015);s.start(t);s.stop(t+.015);}},
  {id:'be_woodsnap', name:'Wood Snap',  planet:'hyphae', continent:'bella',  color:'#eeddaa',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(1200,t);o.frequency.exponentialRampToValueAtTime(600,t+.03);o.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*(gv??1),t+.001);g.gain.exponentialRampToValueAtTime(.001,t+.06);o.start(t);o.stop(t+.06);}},
  {id:'be_brightpop',name:'Bright Pop', planet:'hyphae', continent:'bella',  color:'#ffffbb',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(1000,t);o.frequency.exponentialRampToValueAtTime(500,t+.04);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=2000;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(.4*(gv??1),t);g.gain.exponentialRampToValueAtTime(.001,t+.07);o.start(t);o.stop(t+.07);}},
  {id:'be_crackle',  name:'Crackle',    planet:'hyphae', continent:'bella',  color:'#ffddaa',
   fn:(t,gv)=>{const c=getCtx();for(let i=0;i<4;i++){const s=c.createBufferSource();s.buffer=noiseBuf(.012);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=3000+Math.random()*2000;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(drumMasterGain);const st=t+i*.018;g.gain.setValueAtTime(.35*(gv??1),st);g.gain.exponentialRampToValueAtTime(.001,st+.012);s.start(st);s.stop(st+.015);}}},
  {id:'be_accent',   name:'Accent',     planet:'hyphae', continent:'bella',  color:'#ffcc88',
   fn:(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=900;const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=1000;fl.Q.value=4;o.connect(fl);fl.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.45*(gv??1),t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.09);o.start(t);o.stop(t+.09);}},
];

// Register planet sounds into ALL_SOUNDS and SOUND_MAP
function registerPlanetSounds(){
  PLANET_SOUND_DEFS.forEach(ps=>{
    if(SOUND_MAP[ps.id]) return; // already registered
    const entry = {
      id: ps.id,
      name: ps.name,
      tag: ps.planet + '/' + ps.continent,
      color: ps.color,
      planet: ps.planet,
      continent: ps.continent,
      fn: ps.fn,
      locked: true // locked until skill tree unlock
    };
    ALL_SOUNDS.push(entry);
    SOUND_MAP[ps.id] = entry;
  });
}

// Unlock a planet sound (called when skill node is bought)
function unlockPlanetSound(soundId){
  if(SOUND_MAP[soundId]){
    SOUND_MAP[soundId].locked = false;
    updateSoundboardUnlocked();
  }
}

const TAGS=[...new Set(ALL_SOUNDS.map(s=>s.tag))];

// ══════════════════════════════════════════════
//  MUSICAL KEY + PER-TRACK REVERB / ECHO
// ══════════════════════════════════════════════
// Key = a root (0..11, C=0) + major/minor. It only applies once the KEY node in the skill tree is bought
// (before that, seqKey stays null and every sound plays exactly as designed). Default key: C major.
const KEY_NAMES=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const KEY_MINOR_NAMES=['C','C♯','D','E♭','E','F','F♯','G','G♯','A','B♭','B']; // minor keys spell a few roots with sharps (G♯ minor, not A♭ minor)
const MAJOR_SCALE=[0,2,4,5,7,9,11];
let seqKey=null;       // null = no key (sounds as designed); 0..11 = root
let seqKeyMinor=false; // true = minor key (seqKey is the minor root, e.g. 9 + minor = A minor)
// (the game font is all caps, so minor keys say "A MIN" rather than "Am", which would read as "AM")
function keyLabel(root,minor){return root==null?'—':(minor?KEY_MINOR_NAMES[root]+' min':KEY_NAMES[root]);}
function keyLongName(root,minor){return root==null?'no key':(minor?KEY_MINOR_NAMES[root]+' minor':KEY_NAMES[root]+' major');}
// The major key that shares its notes with this key (A minor → C major)
function relMajorRoot(root,minor){return minor?(root+3)%12:root;}
// Every sound with a musical pitch, and how it follows the key:
//  bass  → moves to the key's home note (tonic), so the low end always sits on the root
//  note  → moves to the nearest note of the key's scale (single-pitch bells, plucks, marimbas, drones…)
//  min / maj / maj7 → sounds with several notes inside them (chords, arps, the lead). The whole sound
//                    moves to the nearest chord of the same type that exists in the key, so every note stays in key.
// Shifts are always the shortest way (never more than 6 semitones), and detune keeps each sound's length the same.
// Drums, noise and sweeping FX are left alone. `roll:true` = playable in the piano roll (phase 2).
const PITCHED_SOUNDS={
  sub:{f:55,r:'bass',roll:1},basenote:{f:73.42,r:'bass',roll:1},bassslide:{f:110,r:'bass'},wobble:{f:55,r:'bass',roll:1},
  fw_softbass:{f:60,r:'bass',roll:1},re_deepdrone:{f:55,r:'bass',roll:1},mo_caveboom:{f:45,r:'bass'},
  chord:{f:130.81,r:'min'},lead:{f:261.63,r:'min'},arp:{f:261.63,r:'maj7'},pad:{f:196,r:'maj'},
  stab:{f:261.63,r:'note',roll:1},pluck:{f:220,r:'note',roll:1},bell:{f:440,r:'note',roll:1},marimba:{f:523.25,r:'note',roll:1},choir:{f:110,r:'note',roll:1},
  om_bell:{f:880,r:'note',roll:1},om_bowl:{f:320,r:'note'},sh_steeldrum:{f:370,r:'note',roll:1},mn_bitcrush:{f:220,r:'note',roll:1},
  mn_synthpop:{f:880,r:'note',roll:1},fw_marimba2:{f:392,r:'note',roll:1},re_gong:{f:180,r:'note'},re_ceremony:{f:240,r:'note'},
  re_lowbowl:{f:160,r:'note'},re_resonance:{f:220,r:'note',roll:1},po_logdrum:{f:280,r:'note',roll:1},be_accent:{f:900,r:'note'},oy_softbend:{f:660,r:'note'},
};
// Chord roots that exist in a major key, counted up from its root: major triads on I/IV/V, maj7 on I/IV, minor on ii/iii/vi
const KEY_CHORD_ROOTS={maj:[0,5,7],maj7:[0,5],min:[2,4,9]};
function keyIsActive(){
  if(seqKey==null)return false;
  return typeof musicHas==='function'?musicHas('mt_key'):false;
}
// how many cents to retune a sound so it sits in the current key (0 = leave it alone)
function keyCentsFor(id){
  if(!keyIsActive())return 0;
  const ps=PITCHED_SOUNDS[id];if(!ps)return 0;
  const R=relMajorRoot(seqKey,seqKeyMinor);
  const n=69+12*Math.log2(ps.f/440);
  const near=(from,pcs)=>{let best=null;for(let m=Math.floor(from)-7;m<=Math.ceil(from)+7;m++){const pc=((m%12)+12)%12;if(pcs.includes(pc)){const d=Math.abs(m-from);if(!best||d<best.d)best={m,d};}}return best?best.m:from;};
  if(ps.r==='bass')return (near(n,[seqKey])-n)*100;
  if(ps.r==='note')return (near(n,MAJOR_SCALE.map(x=>(x+R)%12))-n)*100;
  const root=Math.round(n),roots=(KEY_CHORD_ROOTS[ps.r]||[0]).map(x=>(x+R)%12);
  return (near(root,roots)-root)*100;
}
let _ksMul=1; // pitch multiplier for the delay-tuned PLUCK (its pitch comes from a delay line, not an oscillator)
// ══════════════════════════════════════════════
//  EFFECTS ENGINE (per channel)
// ══════════════════════════════════════════════
// Channels: 0-5 = sequencer tracks · 6-11 = piano roll layers 1-6 · 12 = MASTER (the whole mix).
// trackFx[ch] holds that channel's settings. Each effect only works once its skill-tree node is bought.
// Signal path per channel:  sound → [EQ → FILTER → DISTORTION → BITCRUSH → CHORUS → FLANGER → PHASER → TREMOLO → COMPRESSOR] → PAN → SIDECHAIN DUCK → mix
//                                                                                                                         ↘ reverb send / echo send
// Only the effects that are switched on are wired in, so an unused channel costs nothing.
const FX_ROLL_BASE=6,FX_MASTER=12;
let trackFx=[];
const FX_REVERBS={room:{label:'ROOM',len:.9,pow:3,amt:.32},hall:{label:'HALL',len:2.2,pow:2.4,amt:.42},cathedral:{label:'CATHEDRAL',len:4,pow:1.9,amt:.55}};
const FX_ECHOS={slap:{label:'SLAP',div:.25,fb:.2,mix:.3},eighth:{label:'1/8',div:.5,fb:.35,mix:.35},dotted:{label:'DOTTED 1/8',div:.75,fb:.4,mix:.35},quarter:{label:'1/4',div:1,fb:.4,mix:.35},dub:{label:'DUB',div:.75,fb:.6,mix:.45}};
const FX_DEFAULTS={rvbType:'hall',rvbAmt:0,echoMix:0,echoDiv:.5,echoFb:.35,echoPing:false,
  filtOn:false,filtType:'lowpass',filtFreq:800,filtRes:1,
  distAmt:0,crushAmt:0,
  chorusMix:0,chorusRate:.8,
  flangerMix:0,flangerRate:.25,flangerFb:.6,
  phaserMix:0,phaserRate:.5,
  tremDepth:0,tremDiv:1,tremShape:'sine',
  eqOn:false,eqLow:0,eqMid:0,eqHigh:0,
  compAmt:0,
  pan:0,panAuto:0,panDiv:4,
  scAmt:0,scRel:.5};
// which skill-tree node unlocks each setting (master gets only EQ + compression)
const FX_UNLOCK={rvbAmt:'mt_reverb',echoMix:'mt_echo',echoPing:'mt_pingpong',filtOn:'mt_filter',distAmt:'mt_distortion',crushAmt:'mt_bitcrusher',
  chorusMix:'mt_chorus',flangerMix:'mt_flanger',phaserMix:'mt_phaser',tremDepth:'mt_tremolo',eqOn:'mt_eq',compAmt:'mt_compression',
  pan:'mt_panning',panAuto:'mt_panning',scAmt:'mt_sidechain'};
const FX_OFF={rvbAmt:0,echoMix:0,echoPing:false,filtOn:false,distAmt:0,crushAmt:0,chorusMix:0,flangerMix:0,phaserMix:0,tremDepth:0,eqOn:false,compAmt:0,pan:0,panAuto:0,scAmt:0};
const FX_MASTER_KEYS=['eqOn','compAmt'];
function fxNormalize(f){return f&&typeof f==='object'?Object.assign({},FX_DEFAULTS,f):f;}
function getTrackFx(i,create){
  let f=trackFx[i];
  if(!f&&create){f=trackFx[i]=Object.assign({},FX_DEFAULTS);}
  else if(f&&f.filtType===undefined){f=trackFx[i]=fxNormalize(f);} // older saves only had reverb/echo
  return f||null;
}
// the settings that are actually allowed to sound (locked effects count as off)
function fxEffective(f,ch){
  if(!f)return null;
  const has=typeof musicHas==='function'?musicHas:()=>false;
  const e=Object.assign({},FX_DEFAULTS,f);
  Object.keys(FX_UNLOCK).forEach(k=>{if(!has(FX_UNLOCK[k]))e[k]=FX_OFF[k];});
  if(ch===FX_MASTER)Object.keys(FX_OFF).forEach(k=>{if(!FX_MASTER_KEYS.includes(k))e[k]=FX_OFF[k];});
  return e;
}
function eqActive(f){return f.eqOn&&(f.eqLow||f.eqMid||f.eqHigh);}
function fxIsActive(f){
  return !!f&&(f.rvbAmt>0||f.echoMix>0||f.filtOn||f.distAmt>0||f.crushAmt>0||f.chorusMix>0||f.flangerMix>0||f.phaserMix>0||f.tremDepth>0||eqActive(f)||f.compAmt>0||f.pan!==0||f.panAuto>0||f.scAmt>0);
}
const _fxBuses={},_fxRevs={};
function getFxRev(type){
  if(_fxRevs[type])return _fxRevs[type];
  const c=getCtx(),def=FX_REVERBS[type]||FX_REVERBS.hall,L=Math.round(c.sampleRate*def.len),ir=c.createBuffer(2,L,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,def.pow);}
  const conv=c.createConvolver();conv.buffer=ir;const out=c.createGain();out.gain.value=1;conv.connect(out);out.connect(drumMasterReal);
  return _fxRevs[type]={conv,out};
}
const _beat=()=>60/((typeof seqBpm==='number'&&seqBpm>0)?seqBpm:100);
const _curveCache={};
function _driveCurve(amt){const k=Math.round(amt*40);if(_curveCache['d'+k])return _curveCache['d'+k];const n=2048,v=new Float32Array(n),K=1+k*2;for(let i=0;i<n;i++){const x=i*2/(n-1)-1;v[i]=Math.tanh(x*K)/Math.tanh(K);}return _curveCache['d'+k]=v;}
function _crushCurve(amt){const bits=Math.max(2,Math.round(12-amt*10));if(_curveCache['c'+bits])return _curveCache['c'+bits];const n=8192,v=new Float32Array(n),steps=Math.pow(2,bits-1);for(let i=0;i<n;i++){const x=i*2/(n-1)-1;v[i]=Math.round(x*steps)/steps;}return _curveCache['c'+bits]=v;}
function _lfo(c,freq,amount,target,type){const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.value=freq;g.gain.value=amount;o.connect(g);g.connect(target);o.start();return{o,g,freq,type:o.type};}
let _cosWave=null;
function _setLfoShape(c,o,type){if(type==='cos'){if(!_cosWave||_cosWave.c!==c){_cosWave=c.createPeriodicWave(new Float32Array([0,1]),new Float32Array([0,0]));_cosWave.c=c;}o.setPeriodicWave(_cosWave);}else o.type=type;}
// restart an LFO so its cycle begins exactly at time t (used to lock tremolo / auto-pan to the beat)
function _lfoRestartAt(c,l,t){
  try{const o=c.createOscillator();_setLfoShape(c,o,l.type);o.frequency.value=l.freq;o.connect(l.g);o.start(t);l.o.stop(t);l.o=o;}catch(e){}
}
function _lfoStop(l){if(!l)return;try{l.o.stop();}catch(e){}try{l.o.disconnect();l.g.disconnect();}catch(e){}}
// a wet/dry stage: in → dry → out, in → (wet path) → wet → out
function _mixStage(c,buildWet){const s={in:c.createGain(),out:c.createGain(),dry:c.createGain(),wet:c.createGain()};s.in.connect(s.dry);s.dry.connect(s.out);const w=buildWet(s.in);w.connect(s.wet);s.wet.connect(s.out);return s;}
// each stage: make(c) → {in,out,...}; set(stage,f,now) updates its knobs
const FX_STAGES=[
  {key:'eq',on:f=>eqActive(f),make(c){const lo=c.createBiquadFilter(),mid=c.createBiquadFilter(),hi=c.createBiquadFilter();lo.type='lowshelf';lo.frequency.value=220;mid.type='peaking';mid.frequency.value=1000;mid.Q.value=.9;hi.type='highshelf';hi.frequency.value=4500;lo.connect(mid);mid.connect(hi);return{in:lo,out:hi,lo,mid,hi};},
    set(s,f,t){s.lo.gain.setValueAtTime(f.eqLow,t);s.mid.gain.setValueAtTime(f.eqMid,t);s.hi.gain.setValueAtTime(f.eqHigh,t);}},
  {key:'filt',on:f=>f.filtOn,make(c){const b=c.createBiquadFilter();return{in:b,out:b,b};},
    set(s,f,t){s.b.type=f.filtType;s.b.frequency.setValueAtTime(Math.max(40,Math.min(18000,f.filtFreq)),t);s.b.Q.setValueAtTime(f.filtRes,t);}},
  {key:'dist',on:f=>f.distAmt>0,make(c){const ws=c.createWaveShaper(),g=c.createGain();ws.oversample='2x';ws.connect(g);return{in:ws,out:g,ws,g};},
    set(s,f){s.ws.curve=_driveCurve(f.distAmt);s.g.gain.value=1-f.distAmt*.45;}},
  {key:'crush',on:f=>f.crushAmt>0,make(c){const ws=c.createWaveShaper();return{in:ws,out:ws,ws};},
    set(s,f){s.ws.curve=_crushCurve(f.crushAmt);}},
  {key:'chorus',on:f=>f.chorusMix>0,make(c){let d,l;const s=_mixStage(c,inp=>{d=c.createDelay(.1);d.delayTime.value=.022;inp.connect(d);l=_lfo(c,.8,.004,d.delayTime);return d;});s.d=d;s.l=l;return s;},
    set(s,f,t){s.wet.gain.setValueAtTime(f.chorusMix,t);s.dry.gain.setValueAtTime(1-f.chorusMix*.35,t);s.l.o.frequency.setValueAtTime(f.chorusRate,t);}},
  {key:'flanger',on:f=>f.flangerMix>0,make(c){let d,l,fb;const s=_mixStage(c,inp=>{d=c.createDelay(.05);d.delayTime.value=.003;fb=c.createGain();inp.connect(d);d.connect(fb);fb.connect(d);l=_lfo(c,.25,.0022,d.delayTime);return d;});s.d=d;s.l=l;s.fb=fb;return s;},
    set(s,f,t){s.wet.gain.setValueAtTime(f.flangerMix*(1-Math.min(.9,f.flangerFb)*.6),t);s.dry.gain.setValueAtTime(1-f.flangerMix*.3,t);s.l.o.frequency.setValueAtTime(f.flangerRate,t);s.fb.gain.setValueAtTime(Math.min(.9,f.flangerFb),t);}},
  {key:'phaser',on:f=>f.phaserMix>0,make(c){const aps=[];let l;const s=_mixStage(c,inp=>{let prev=inp;for(let i=0;i<5;i++){const a=c.createBiquadFilter();a.type='allpass';a.frequency.value=700;a.Q.value=.6;prev.connect(a);prev=a;aps.push(a);}
      const lg=c.createGain();lg.gain.value=1;l=_lfo(c,.5,550,lg);aps.forEach(a=>lg.connect(a.frequency));return prev;});s.l=l;return s;},
    set(s,f,t){s.wet.gain.setValueAtTime(f.phaserMix,t);s.dry.gain.setValueAtTime(1,t);s.l.o.frequency.setValueAtTime(f.phaserRate,t);}},
  {key:'trem',on:f=>f.tremDepth>0,make(c){const g=c.createGain();const l=_lfo(c,2,.5,g.gain);return{in:g,out:g,g,l};},
    // sine pulses use a cosine LFO, so after a beat-sync restart the volume is at its loudest right on the beat
    set(s,f,t){const d=Math.min(1,f.tremDepth),ty=f.tremShape==='square'?'square':'cos',fr=1/(_beat()*f.tremDiv);
      s.g.gain.setValueAtTime(1-d/2,t);s.l.g.gain.setValueAtTime(d/2,t);
      if(s.l.type!==ty){_setLfoShape(audioCtx,s.l.o,ty);s.l.type=ty;}
      s.l.freq=fr;s.l.o.frequency.setValueAtTime(fr,t);}},
  {key:'comp',on:f=>f.compAmt>0,make(c){const k=c.createDynamicsCompressor(),g=c.createGain();k.connect(g);k.attack.value=.004;k.release.value=.18;return{in:k,out:g,k,g};},
    set(s,f,t){const a=f.compAmt;s.k.threshold.setValueAtTime(-6-a*34,t);s.k.ratio.setValueAtTime(1.5+a*10.5,t);s.k.knee.setValueAtTime(18-a*12,t);s.g.gain.setValueAtTime(Math.pow(10,(a*7)/20),t);}},
];
function _fxSig(f){return FX_STAGES.filter(st=>st.on(f)).map(st=>st.key).join(',')+'|'+(f.echoPing?'p':'m');}
// builds (once) and re-wires (when switched effects change) a channel's chain, then sets every knob
function getFxBus(i,f){
  const c=getCtx();let b=_fxBuses[i];
  if(!b){
    b={ch:i,input:c.createGain(),stages:{},post:c.createGain(),pan:c.createStereoPanner?c.createStereoPanner():null,duck:c.createGain(),
       rSend:c.createGain(),eSend:c.createGain(),rType:null,sig:null,key:null,
       // the sounds' own built-in reverb send: goes through a copy of the channel's FILTER, so a muffled track has a muffled tail
       rvIn:c.createGain(),rvF:c.createBiquadFilter()};
    b.rvF.type='allpass';b.rvIn.connect(b.rvF);if(rvbReal)b.rvF.connect(rvbReal);
    // mono echo
    b.delay=c.createDelay(2.5);b.fb=c.createGain();b.tone=c.createBiquadFilter();b.eOut=c.createGain();
    b.tone.type='lowpass';b.tone.frequency.value=3200;
    b.delay.connect(b.tone);b.tone.connect(b.fb);b.fb.connect(b.delay);b.tone.connect(b.eOut);b.eOut.connect(drumMasterReal);
    // ping-pong echo: left and right delays feed each other, so repeats bounce between the speakers
    b.dL=c.createDelay(2.5);b.dR=c.createDelay(2.5);b.pfb=c.createGain();b.ptone=c.createBiquadFilter();b.ptone.type='lowpass';b.ptone.frequency.value=3200;
    b.merge=c.createChannelMerger(2);b.pOut=c.createGain();
    b.dL.connect(b.ptone);b.ptone.connect(b.dR);b.dR.connect(b.pfb);b.pfb.connect(b.dL);
    b.ptone.connect(b.merge,0,0);b.dR.connect(b.merge,0,1);b.merge.connect(b.pOut);b.pOut.connect(drumMasterReal);
    // fixed tail: post → pan → duck → mix (+ sends)
    // a stereo panner sends a centred mono sound out at -3 dB per side, so add that back: centre stays as loud as with no effects
    if(b.pan){b.panMake=c.createGain();b.panMake.gain.value=Math.SQRT2;b.post.connect(b.pan);b.pan.connect(b.panMake);b.panMake.connect(b.duck);}else b.post.connect(b.duck);
    b.duck.connect(drumMasterReal);b.duck.connect(b.rSend);b.duck.connect(b.eSend);
    _fxBuses[i]=b;
  }
  const sig=_fxSig(f);
  if(sig!==b.sig){
    b.sig=sig;
    try{b.input.disconnect();}catch(e){}
    Object.values(b.stages).forEach(s=>{try{s.out.disconnect();}catch(e){}});
    // effects that were switched off: stop their LFOs and drop them (rebuilt if switched back on)
    FX_STAGES.forEach(st=>{const s=b.stages[st.key];if(s&&!st.on(f)){_lfoStop(s.l);try{s.in.disconnect();}catch(e){}delete b.stages[st.key];}});
    let prev=b.input;
    FX_STAGES.forEach(st=>{
      if(!st.on(f))return;
      const s=b.stages[st.key]||(b.stages[st.key]=st.make(c));
      prev.connect(s.in);prev=s.out;
    });
    prev.connect(b.post);
    try{b.eSend.disconnect();}catch(e){}
    b.eSend.connect(f.echoPing?b.dL:b.delay);
  }
  // only touch the knobs when a setting (or the BPM) actually changed: this runs for every note
  const bpm=(typeof seqBpm==='number'&&seqBpm>0)?seqBpm:100;
  const key=JSON.stringify(f)+bpm;
  if(key===b.key){b.sc=f.scAmt;return b;}
  b.key=key;
  const now=c.currentTime;
  FX_STAGES.forEach(st=>{if(st.on(f))st.set(b.stages[st.key],f,now);});
  if(f.filtOn){b.rvF.type=f.filtType;b.rvF.frequency.setValueAtTime(Math.max(40,Math.min(18000,f.filtFreq)),now);b.rvF.Q.setValueAtTime(f.filtRes,now);}else b.rvF.type='allpass';
  if(b.rType!==f.rvbType){try{b.rSend.disconnect();}catch(e){}b.rSend.connect(getFxRev(f.rvbType).conv);b.rType=f.rvbType;}
  b.rSend.gain.setValueAtTime(Math.min(1,f.rvbAmt)*.9,now);
  b.eSend.gain.setValueAtTime(Math.min(1,f.echoMix)*.9,now);
  const dt=Math.min(2.4,Math.max(.03,f.echoDiv*_beat()));
  b.delay.delayTime.setValueAtTime(dt,now);b.dL.delayTime.setValueAtTime(dt,now);b.dR.delayTime.setValueAtTime(dt,now);
  const fbv=Math.min(.9,Math.max(0,f.echoFb));b.fb.gain.setValueAtTime(fbv,now);b.pfb.gain.setValueAtTime(fbv,now);
  if(b.pan){
    if(f.panAuto>0){
      if(!b.panL)b.panL=_lfo(c,1,0,b.pan.pan);
      b.panL.freq=1/(_beat()*f.panDiv);b.panL.o.frequency.setValueAtTime(b.panL.freq,now);
      const depth=Math.min(1,f.panAuto),base=Math.max(-1+depth,Math.min(1-depth,f.pan));
      b.pan.pan.setValueAtTime(base,now);b.panL.g.gain.setValueAtTime(depth,now);
    }else{
      if(b.panL){_lfoStop(b.panL);b.panL=null;}
      b.pan.pan.setValueAtTime(Math.max(-1,Math.min(1,f.pan)),now);
    }
  }
  b.sc=f.scAmt;b.scRel=f.scRel;
  return b;
}
// at the start of every bar the sequencer calls this, so tremolo and auto-pan stay locked to the beat
function fxBeatSync(t){
  if(!audioCtx)return;
  Object.values(_fxBuses).forEach(b=>{
    const tr=b.stages.trem;if(tr&&tr.l)_lfoRestartAt(audioCtx,tr.l,t);
    if(b.panL)_lfoRestartAt(audioCtx,b.panL,t);
  });
}
// SIDECHAIN: every kick that plays makes the channels with sidechain on duck out of its way
const SC_TRIGGERS=['kick','trapkick','thud','mo_earththud','mo_hollowboom'];
function sidechainHit(t,fromCh){
  if(typeof musicHas!=='function'||!musicHas('mt_sidechain'))return;
  Object.values(_fxBuses).forEach(b=>{
    if(b.ch===fromCh||b.ch===FX_MASTER)return;
    const f=fxEffective(getTrackFx(b.ch,false),b.ch);
    if(!f||!(f.scAmt>0))return;
    const g=b.duck.gain,amt=Math.min(.95,f.scAmt),rel=Math.max(.04,_beat()*f.scRel);
    g.setTargetAtTime(1-amt,t,.004);
    g.setTargetAtTime(1,t+.02,rel/3);
  });
}
// SAFETY LIMITER: the last thing before the volume knob. Six tracks + six roll layers + effects can add up to
// several times full scale, which the browser would hard-clip into harsh crackle. A fast limiter catches the
// overload near the top and a soft clipper rounds off anything left; normal-level sounds pass through unchanged.
let _lim=null;
function masterLimiter(c){
  if(_lim&&_lim.c===c)return _lim;
  const inp=c.createGain(),k=c.createDynamicsCompressor(),pre=c.createGain(),ws=c.createWaveShaper(),out=c.createGain();
  k.threshold.value=-2;k.knee.value=2;k.ratio.value=20;k.attack.value=.002;k.release.value=.1; // only acts in the top 2 dB (measured: single sounds unchanged)
  const H=4,n=4096,cv=new Float32Array(n),T=.75; // curve covers ±4 (pre-gain 1/4), linear up to 0.75 then rounds off towards 1
  for(let i=0;i<n;i++){const x=(i/(n-1)*2-1)*H,a=Math.abs(x);cv[i]=Math.sign(x)*(a<=T?a:T+(1-T)*Math.tanh((a-T)/(1-T)));}
  pre.gain.value=1/H;ws.curve=cv;
  inp.connect(k);k.connect(pre);pre.connect(ws);ws.connect(out);out.connect(masterGainNode);
  return _lim={c,inp,out,k,pre,ws};
}
// MASTER channel: EQ + compression on the whole mix (sits between all the music and the safety limiter)
let _masterSig=null;const _masterStages={};
function applyMasterFx(){
  if(!audioCtx||!drumMasterReal)return;
  const f=fxEffective(getTrackFx(FX_MASTER,false),FX_MASTER)||Object.assign({},FX_DEFAULTS);
  const use=FX_STAGES.filter(st=>FX_MASTER_KEYS.some(k=>(st.key==='eq'&&k==='eqOn')||(st.key==='comp'&&k==='compAmt'))&&st.on(f));
  const sig=use.map(s=>s.key).join(',');
  const c=audioCtx,now=c.currentTime;
  if(sig!==_masterSig){
    _masterSig=sig;
    try{drumMasterReal.disconnect();}catch(e){}
    Object.values(_masterStages).forEach(s=>{try{s.out.disconnect();}catch(e){}});
    let prev=drumMasterReal;
    use.forEach(st=>{const s=_masterStages[st.key]||(_masterStages[st.key]=st.make(c));prev.connect(s.in);prev=s.out;});
    prev.connect(masterLimiter(c).inp);
  }
  use.forEach(st=>st.set(_masterStages[st.key],f,now));
}
// which channel a call belongs to: number = sequencer track; {roll:i} = piano roll layer
function fxChannelOf(trackIdx){return (trackIdx!==undefined&&trackIdx!==null&&trackIdx>=0)?trackIdx:-1;}
function fxBusFor(ch){
  if(ch<0)return null;
  const fx=fxEffective(getTrackFx(ch,false),ch);
  return fxIsActive(fx)?getFxBus(ch,fx):null;
}
// runs a sound's synth function with the key retune and/or the channel's effects applied
function runSoundFn(id,t,gv,trackIdx){
  const c=getCtx();
  const bus=fxBusFor(fxChannelOf(trackIdx));
  const cents=keyCentsFor(id);
  if(!bus&&!cents){SOUND_MAP[id].fn(t,gv);return;}
  const orig=c.createOscillator;const savedDM=drumMasterGain;
  try{
    if(cents){c.createOscillator=function(){const o=orig.call(this);o.detune.value=cents;return o;};_ksMul=Math.pow(2,cents/1200);}
    if(bus){drumMasterGain=bus.input;rvbNode=bus.rvIn;}
    SOUND_MAP[id].fn(t,gv);
  }finally{
    if(cents)delete c.createOscillator;
    _ksMul=1;
    drumMasterGain=savedDM;rvbNode=rvbReal||rvbNode;
  }
}

function playSound(id,velMult,when,trackIdx){
  if(!SOUND_MAP[id])return;
  const gv=getSoundGainVal(id)*(velMult!==undefined?velMult:1);
  const now=Tnow();
  // 'when' = exact audio-clock time (used by the sequencer so notes land on the beat even if the page is busy)
  const t=(when!==undefined&&when>now)?when:now;
  runSoundFn(id,t,gv,trackIdx);
  if(SC_TRIGGERS.includes(id))sidechainHit(t,fxChannelOf(trackIdx));
  if(_exporting)return; // no party flashes for notes being rendered to a file
  if(t>now+.008)setTimeout(partyPulseOnBeat,(t-now)*1000);else partyPulseOnBeat();
}

// ══════════════════════════════════════════════
//  GAME UI SFX (using audioCtx directly)
// ══════════════════════════════════════════════
function playSfxTap(mult){
  if(!sfxOn)return;const ctx=getCtx(),now=ctx.currentTime;
  const pitch=Math.min(1200,260+Math.log2(Math.max(1,mult))*60);
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';o.frequency.setValueAtTime(pitch,now);o.frequency.exponentialRampToValueAtTime(pitch*.6,now+.08);
  g.gain.setValueAtTime(.14,now);g.gain.exponentialRampToValueAtTime(.001,now+.12);
  o.connect(g);g.connect(masterGainNode);o.start(now);o.stop(now+.12);
}
function playSfxTierUnlock(idx,vol){
  if(vol===undefined)vol=1; // dot-tracker upgrades pass 0.4 (60% quieter)
  if(!sfxOn)return;const ctx=getCtx(),now=ctx.currentTime;
  const base=220*Math.pow(1.3,idx%8);
  [1,1.25,1.5,2].forEach((r,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=base*r;g.gain.setValueAtTime(0,now+i*.07);g.gain.linearRampToValueAtTime(.1*vol,now+i*.07+.04);g.gain.exponentialRampToValueAtTime(.001,now+i*.07+.5);o.connect(g);g.connect(masterGainNode);o.start(now+i*.07);o.stop(now+i*.07+.55);});
}
const SHOP_SFX_VOL=0.3;      // alien-buddy buy sound (unchanged)
const SHOP_BUY_SFX_VOL=0.18; // other shop buy sounds (v0.2.74: 40% quieter than before)
function playSfxPurchase(){
  if(!sfxOn)return;const ctx=getCtx(),now=ctx.currentTime;
  [[660,0],[880,.08],[1100,.14]].forEach(([f,d])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,now+d);g.gain.linearRampToValueAtTime(.18*SHOP_BUY_SFX_VOL,now+d+.02);g.gain.exponentialRampToValueAtTime(.001,now+d+.35);o.connect(g);g.connect(masterGainNode);o.start(now+d);o.stop(now+d+.4);});
}
function playSfxAlienBuy(){
  if(!sfxOn)return;const ctx=getCtx(),now=ctx.currentTime;
  const o=ctx.createOscillator(),g=ctx.createGain(),lfo=ctx.createOscillator(),lG=ctx.createGain();
  o.type='sawtooth';o.frequency.value=280;lfo.frequency.value=8;lG.gain.value=80;
  lfo.connect(lG);lG.connect(o.frequency);g.gain.setValueAtTime(.04*SHOP_SFX_VOL,now);g.gain.exponentialRampToValueAtTime(.001,now+.55);
  o.connect(g);g.connect(masterGainNode);lfo.start(now);o.start(now);lfo.stop(now+.6);o.stop(now+.6);
}
function playSfxPartyStart(){
  if(!sfxOn)return;const ctx=getCtx(),now=ctx.currentTime;
  [261,329,392,523,659,784].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(0,now+i*.05);g.gain.linearRampToValueAtTime(.1,now+i*.05+.02);g.gain.exponentialRampToValueAtTime(.001,now+i*.05+.18);o.connect(g);g.connect(masterGainNode);o.start(now+i*.05);o.stop(now+i*.05+.2);});
}

// ── Ambient ──
function startAmbience(){
  if(ambStarted)return;ambStarted=true;
  const ctx=getCtx();
  const droneG=ctx.createGain();droneG.gain.value=.08;droneG.connect(ambGain);
  const drone=ctx.createOscillator();drone.type='sine';drone.frequency.value=36;
  const wob=ctx.createOscillator();wob.frequency.value=.07;const wobG=ctx.createGain();wobG.gain.value=.8;
  wob.connect(wobG);wobG.connect(drone.frequency);wob.start();drone.start();drone.connect(droneG);
  const padG=ctx.createGain();padG.gain.value=0;padG.connect(ambGain);
  const padFilt=ctx.createBiquadFilter();padFilt.type='bandpass';padFilt.frequency.value=800;padFilt.Q.value=.7;padFilt.connect(padG);
  const lfoF=ctx.createOscillator();lfoF.frequency.value=.13;const lfoFG=ctx.createGain();lfoFG.gain.value=300;
  lfoF.connect(lfoFG);lfoFG.connect(padFilt.frequency);lfoF.start();
  [183.8,184.6,245.5,246.2].forEach(f=>{const o=ctx.createOscillator();o.type='sine';o.frequency.value=f;const g=ctx.createGain();g.gain.value=.18;o.connect(g);g.connect(padFilt);o.start();});
  padG.gain.setValueAtTime(0,ctx.currentTime);padG.gain.linearRampToValueAtTime(.22,ctx.currentTime+6);
  const noiseG=ctx.createGain();noiseG.gain.value=0;noiseG.connect(ambGain);
  const nbuf=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const nd=nbuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  const noise=ctx.createBufferSource();noise.buffer=nbuf;noise.loop=true;
  const nf=ctx.createBiquadFilter();nf.type='bandpass';nf.frequency.value=1200;nf.Q.value=4;
  noise.connect(nf);nf.connect(noiseG);noise.start();
  (function swell(){setTimeout(()=>{if(!noiseG||!musicOn)return swell();const now=ctx.currentTime;noiseG.gain.cancelScheduledValues(now);noiseG.gain.setValueAtTime(0,now);noiseG.gain.linearRampToValueAtTime(.04,now+2);noiseG.gain.linearRampToValueAtTime(0,now+5);swell();},(4+Math.random()*8)*1000);})();
}

// ── Party music ──
let partyMusicGain=null;
function startPartyMusic(){
  const ctx=getCtx();partyMusicGain=ctx.createGain();partyMusicGain.gain.value=.18;partyMusicGain.connect(masterGainNode);
  const BPM=128,beat=60/BPM,bars=64,now=ctx.currentTime;
  for(let i=0;i<bars;i++){const t=now+i*beat;_kick(ctx,partyMusicGain,t);_hat(ctx,partyMusicGain,t);_hat(ctx,partyMusicGain,t+beat*.5);_bass(ctx,partyMusicGain,t,[55,55,65,62][i%4]);if(i%2===0){const a=[880,1100,1320,1760,1320,1100];_arp(ctx,partyMusicGain,t+beat*.25,a[i%a.length]);_arp(ctx,partyMusicGain,t+beat*.75,a[(i+2)%a.length]);}}
}
function stopPartyMusic(){if(partyMusicGain){try{partyMusicGain.gain.cancelScheduledValues(audioCtx.currentTime);partyMusicGain.gain.setValueAtTime(0,audioCtx.currentTime);partyMusicGain.disconnect();}catch(e){}partyMusicGain=null;}}
function _kick(c,d,t){const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(d);o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(.01,t+.35);g.gain.setValueAtTime(1.2,t);g.gain.exponentialRampToValueAtTime(.01,t+.35);o.start(t);o.stop(t+.35);}
function _hat(c,d,t){const sz=c.sampleRate*.05,b=c.createBuffer(1,sz,c.sampleRate);const nd=b.getChannelData(0);for(let j=0;j<sz;j++)nd[j]=Math.random()*2-1;const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=8000;const g=c.createGain();g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);s.connect(f);f.connect(g);g.connect(d);s.start(t);s.stop(t+.05);}
function _bass(c,d,t,freq){const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.value=freq;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=400;o.connect(f);f.connect(g);g.connect(d);g.gain.setValueAtTime(.6,t);g.gain.setValueAtTime(.6,t+.15);g.gain.exponentialRampToValueAtTime(.001,t+.45);o.start(t);o.stop(t+.45);}
function _arp(c,d,t,freq){const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=freq;o.connect(g);g.connect(d);g.gain.setValueAtTime(.07,t);g.gain.exponentialRampToValueAtTime(.001,t+.08);o.start(t);o.stop(t+.08);}
