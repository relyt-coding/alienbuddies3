
// ══════════════════════════════════════════════
//  AUDIO ENGINE
// ══════════════════════════════════════════════
let audioCtx=null,masterGainNode=null,drumMasterGain=null,rvbNode=null,rvbGainNode=null,ambGain=null,ambStarted=false;
let sfxOn=true;
let musicOn=true;

function getCtx(){
  if(!audioCtx){
    audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    masterGainNode=audioCtx.createGain();masterGainNode.gain.value=masterVol;masterGainNode.connect(audioCtx.destination);
    ambGain=audioCtx.createGain();ambGain.gain.value=1;ambGain.connect(masterGainNode);
    drumMasterGain=audioCtx.createGain();drumMasterGain.gain.value=1;drumMasterGain.connect(masterGainNode);
    // Reverb
    rvbNode=audioCtx.createConvolver();rvbGainNode=audioCtx.createGain();rvbGainNode.gain.value=.22;
    const L=audioCtx.sampleRate*2.5,ir=audioCtx.createBuffer(2,L,audioCtx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.3);}
    rvbNode.buffer=ir;rvbNode.connect(rvbGainNode);rvbGainNode.connect(drumMasterGain);
  }
  if(audioCtx.state==='suspended')audioCtx.resume();
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
    g.gain.linearRampToValueAtTime(.19*(gv??1),t+.002);
    g.gain.exponentialRampToValueAtTime(.001,t+.06);
    const s=c.createBufferSource();s.buffer=noiseBuf(.06);
    const f1=c.createBiquadFilter();f1.type='highpass';f1.frequency.value=7000;
    const f2=c.createBiquadFilter();f2.type='bandpass';f2.frequency.value=10000;f2.Q.value=.5;
    s.connect(f1);f1.connect(f2);f2.connect(g);
    s.start(t);s.stop(t+.07);
  }),
  mkSnd('snare','SNARE','drums','#ffcc44','Cracking rimshot snare',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),og=c.createGain();o.type='triangle';o.frequency.value=200;o.connect(og);og.connect(drumMasterGain);og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.45*(gv??1),t+.002);og.gain.exponentialRampToValueAtTime(.001,t+.18);o.start(t);o.stop(t+.18);const s=c.createBufferSource();s.buffer=noiseBuf(.22);const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;f.Q.value=.7;const ng=c.createGain();s.connect(f);f.connect(ng);ng.connect(drumMasterGain);ng.connect(rvbNode);ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.65*(gv??1),t+.002);ng.gain.exponentialRampToValueAtTime(.001,t+.22);s.start(t);s.stop(t+.22);}),
  mkSnd('kick','KICK','drums','#ff6644','808-style sub kick',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(drumMasterGain);o.frequency.setValueAtTime(200,t);o.frequency.exponentialRampToValueAtTime(38,t+.22);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.7*(gv??1),t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.5);const n=c.createOscillator(),ng=c.createGain();n.type='square';n.frequency.value=120;n.connect(ng);ng.connect(drumMasterGain);ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.3*(gv??1),t+.001);ng.gain.exponentialRampToValueAtTime(.001,t+.02);n.start(t);n.stop(t+.02);}),
  mkSnd('trapkick','TRAP KICK','drums','#ff3322','Hard 808 trap kick',(t,gv)=>{const c=getCtx(),o=c.createOscillator(),g=c.createGain(),d=c.createWaveShaper();d.curve=distCurve(2);o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(28,t+.5);o.connect(d);d.connect(g);g.connect(drumMasterGain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.7*(gv??1),t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.85);o.start(t);o.stop(t+.85);}),
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
  mkSnd('pluck','PLUCK','synth','#aaffcc','Karplus-Strong plucked string',(t,gv)=>{const c=getCtx(),freq=220,s=c.createBufferSource();s.buffer=noiseBuf(.025);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=freq*2;const g=c.createGain(),dl=c.createDelay(),fb=c.createGain();dl.delayTime.value=1/freq;fb.gain.value=.97;s.connect(fl);fl.connect(g);g.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(drumMasterGain);dl.connect(rvbNode);g.gain.setValueAtTime(gv??1,t);g.gain.exponentialRampToValueAtTime(.001,t+1.5);s.start(t);s.stop(t+.025);}),
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

function playSound(id,velMult,when){
  if(!SOUND_MAP[id])return;
  const gv=getSoundGainVal(id)*(velMult!==undefined?velMult:1);
  const now=Tnow();
  // 'when' = exact audio-clock time (used by the sequencer so notes land on the beat even if the page is busy)
  const t=(when!==undefined&&when>now)?when:now;
  SOUND_MAP[id].fn(t,gv);
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
function playSfxTierUnlock(idx){
  if(!sfxOn)return;const ctx=getCtx(),now=ctx.currentTime;
  const base=220*Math.pow(1.3,idx%8);
  [1,1.25,1.5,2].forEach((r,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=base*r;g.gain.setValueAtTime(0,now+i*.07);g.gain.linearRampToValueAtTime(.2,now+i*.07+.04);g.gain.exponentialRampToValueAtTime(.001,now+i*.07+.5);o.connect(g);g.connect(masterGainNode);o.start(now+i*.07);o.stop(now+i*.07+.55);});
}
const SHOP_SFX_VOL=0.3; // shop buy sounds play at 30% of their original volume
function playSfxPurchase(){
  if(!sfxOn)return;const ctx=getCtx(),now=ctx.currentTime;
  [[660,0],[880,.08],[1100,.14]].forEach(([f,d])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,now+d);g.gain.linearRampToValueAtTime(.18*SHOP_SFX_VOL,now+d+.02);g.gain.exponentialRampToValueAtTime(.001,now+d+.35);o.connect(g);g.connect(masterGainNode);o.start(now+d);o.stop(now+d+.4);});
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
