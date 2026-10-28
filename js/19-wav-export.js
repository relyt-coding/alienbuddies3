
// ══════════════════════════════════════════════
//  WAV EXPORT ENGINE
// ══════════════════════════════════════════════

function encodeWAV(buffer){
  const SR=buffer.sampleRate,nCh=buffer.numberOfChannels,len=buffer.length;
  const data=new ArrayBuffer(44+len*nCh*2),v=new DataView(data);
  const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF');v.setUint32(4,36+len*nCh*2,true);ws(8,'WAVE');ws(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,nCh,true);
  v.setUint32(24,SR,true);v.setUint32(28,SR*nCh*2,true);
  v.setUint16(32,nCh*2,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,len*nCh*2,true);
  let off=44;
  for(let i=0;i<len;i++)for(let ch=0;ch<nCh;ch++){
    const s=Math.max(-1,Math.min(1,buffer.getChannelData(ch)[i]));
    v.setInt16(off,s<0?s*32768:s*32767,true);off+=2;
  }
  return new Blob([data],{type:'audio/wav'});
}

function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1000);
}

// piano roll notes → hits with an exact pitch (midi) and length (dur, seconds)
function rollHits(roll,offset,maxSteps){
  const out=[];
  if(!roll||!roll.layers||typeof musicHas!=='function'||!musicHas('mt_piano'))return out;
  const sd=60/seqBpm/4,n=pianoRollLayers();
  roll.layers.forEach((L,li)=>{
    if(li>=n||!L||L.muted||!L.soundId)return;
    L.notes.forEach(nt=>{if(nt.s<maxSteps)out.push({time:offset+nt.s*sd,soundId:L.soundId,midi:nt.m,dur:nt.l*sd});});
  });
  return out;
}
function buildPatternHits(layers){
  const sd=60/seqBpm/4,hits=[];
  layers.forEach(l=>{if(l.muted)return;l.steps.slice(0,STEPS).forEach((on,i)=>{if(on)hits.push({time:i*sd,soundId:l.soundId});});});
  if(layers===seqLayers&&typeof pianoRoll!=='undefined')hits.push(...rollHits(pianoRoll,0,STEPS));
  return hits;
}

function buildArrangementHits(arr){
  if(!arr)return{hits:[],duration:0};
  const sd=60/seqBpm/4,hits=[];let cursor=0;
  for(let bar=0;bar<arr.bars;bar++){
    const pat=arr.arrangement[bar]!=null?savedPatterns[arr.arrangement[bar]]:null;
    if(pat)pat.layers.forEach(l=>{if(l.muted)return;l.steps.forEach((on,i)=>{if(on)hits.push({time:cursor+i*sd,soundId:l.soundId});});});
    if(pat&&pat.roll)hits.push(...rollHits(pat.roll,cursor,patLen(pat)));
    cursor+=patLen(pat)*sd;
  }
  return{hits,duration:cursor};
}

function buildSongHits(){
  if(!songSlots.length)return{hits:[],duration:0};
  const hits=[];let cursor=0;
  songSlots.forEach(slot=>{
    const arr=savedArrangements[slot.arrIdx];if(!arr)return;
    const r=buildArrangementHits(arr);
    r.hits.forEach(h=>hits.push(Object.assign({},h,{time:cursor+h.time})));
    cursor+=r.duration;
  });
  return{hits,duration:cursor};
}

async function renderHitsToWAV(hits,duration,filename){
  if(!hits.length){showToast('Nothing to export — add some notes first!');return;}
  const SR=44100,tail=2.5,total=duration+tail;
  const offCtx=new OfflineAudioContext(2,Math.ceil(total*SR),SR);
  let master=offCtx.createGain();master.gain.value=0.85;master.connect(offCtx.destination);
  const outMaster=master; // piano roll notes swap `master` for a short-lived gate so each note stops on time
  let offRvb=null;
  try{
    const il=Math.round(SR*1.2),ib=offCtx.createBuffer(2,il,SR);
    for(let ch=0;ch<2;ch++){const d=ib.getChannelData(ch);for(let i=0;i<il;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/il,2.5)*.6;}
    offRvb=offCtx.createConvolver();offRvb.buffer=ib;
    const rg=offCtx.createGain();rg.gain.value=.22;offRvb.connect(rg);rg.connect(master);
  }catch(e){}
  const nb=(dur)=>{const L=Math.round(SR*dur),b=offCtx.createBuffer(1,L,SR),d=b.getChannelData(0);for(let i=0;i<L;i++)d[i]=Math.random()*2-1;return b;};
  const dc=(k=3)=>{const v=new Float32Array(256);for(let i=0;i<256;i++){const x=i*2/256-1;v[i]=Math.tanh(x*k)*.88;}return v;};
  const rv=(n)=>{if(offRvb)n.connect(offRvb);};
  const R={
    hihat:(t,gv)=>{const s=offCtx.createBufferSource();s.buffer=nb(.06);const f1=offCtx.createBiquadFilter();f1.type='highpass';f1.frequency.value=7000;const f2=offCtx.createBiquadFilter();f2.type='bandpass';f2.frequency.value=10000;f2.Q.value=.5;const g=offCtx.createGain();s.connect(f1);f1.connect(f2);f2.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.075*gv,t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.06);s.start(t);s.stop(t+.07);},
    snare:(t,gv)=>{const c=offCtx,o=c.createOscillator(),og=c.createGain();o.type='triangle';o.frequency.value=200;o.connect(og);og.connect(master);og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.315*gv,t+.002);og.gain.exponentialRampToValueAtTime(.001,t+.18);o.start(t);o.stop(t+.18);const s=c.createBufferSource();s.buffer=nb(.22);const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;f.Q.value=.7;const ng=c.createGain();s.connect(f);f.connect(ng);ng.connect(master);rv(ng);ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.455*gv,t+.002);ng.gain.exponentialRampToValueAtTime(.001,t+.22);s.start(t);s.stop(t+.22);},
    kick:(t,gv)=>{const c=offCtx,G=gv*.62,o=c.createOscillator(),g=c.createGain(),sh=c.createWaveShaper();sh.curve=dc(1.8);
      o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(62,t+.035);o.frequency.exponentialRampToValueAtTime(42,t+.3);
      o.connect(sh);sh.connect(g);g.connect(master);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1.15*G,t+.002);g.gain.exponentialRampToValueAtTime(.5*G,t+.09);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.52);
      const o2=c.createOscillator(),g2=c.createGain();o2.type='triangle';o2.frequency.setValueAtTime(130,t);o2.frequency.exponentialRampToValueAtTime(70,t+.08);o2.connect(g2);g2.connect(master);
      g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(.6*G,t+.002);g2.gain.exponentialRampToValueAtTime(.001,t+.16);o2.start(t);o2.stop(t+.18);
      const n=c.createBufferSource();n.buffer=nb(.03);const nf=c.createBiquadFilter();nf.type='bandpass';nf.frequency.value=2800;nf.Q.value=.9;const ng=c.createGain();n.connect(nf);nf.connect(ng);ng.connect(master);
      ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.55*G,t+.001);ng.gain.exponentialRampToValueAtTime(.001,t+.02);n.start(t);n.stop(t+.03);},
    trapkick:(t,gv)=>{const c=offCtx,o=c.createOscillator(),g=c.createGain(),d=c.createWaveShaper();d.curve=dc(2);o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(28,t+.5);o.connect(d);d.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.525*gv,t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.85);o.start(t);o.stop(t+.85);},
    clap:(t,gv)=>{[0,.012,.026].forEach(off=>{const s=offCtx.createBufferSource();s.buffer=nb(.14);const f=offCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=1100+Math.random()*400;f.Q.value=.5;const g=offCtx.createGain();s.connect(f);f.connect(g);g.connect(master);rv(g);g.gain.setValueAtTime(0,t+off);g.gain.linearRampToValueAtTime(.6*gv,t+off+.002);g.gain.exponentialRampToValueAtTime(.001,t+off+.18);s.start(t+off);s.stop(t+off+.18);});},
    rimshot:(t,gv)=>{const c=offCtx,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=450;o.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.6*gv,t+.001);g.gain.exponentialRampToValueAtTime(.001,t+.06);o.start(t);o.stop(t+.06);const s=c.createBufferSource();s.buffer=nb(.04);const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=4000;const ng=c.createGain();s.connect(f);f.connect(ng);ng.connect(master);ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.5*gv,t+.001);ng.gain.exponentialRampToValueAtTime(.001,t+.04);s.start(t);s.stop(t+.04);},
    shaker:(t,gv)=>{const s=offCtx.createBufferSource();s.buffer=nb(.09);const f=offCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=7800;f.Q.value=1.5;const g=offCtx.createGain();s.connect(f);f.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.35*gv,t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.09);s.start(t);s.stop(t+.09);},
    floortom:(t,gv)=>{const c=offCtx,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(55,t+.25);o.connect(g);g.connect(master);rv(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.6*gv,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.42);o.start(t);o.stop(t+.42);},
    sub:(t,gv)=>{const c=offCtx,o1=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=220;f.Q.value=2;o1.type='sawtooth';o1.frequency.value=55;o2.type='square';o2.frequency.value=55.5;o1.connect(f);o2.connect(f);f.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28*gv,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.55);o1.start(t);o2.start(t);o1.stop(t+.56);o2.stop(t+.56);},
    chord:(t,gv)=>{const c=offCtx,freqs=[130.81,155.56,196,233.08],g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=1800;fl.frequency.exponentialRampToValueAtTime(600,t+.4);const d=c.createWaveShaper();d.curve=dc(1.5);g.connect(fl);fl.connect(d);d.connect(master);rv(d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2*gv,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.5);freqs.forEach((f2,i)=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f2*(1+(i-1.5)*.002);o.connect(g);o.start(t);o.stop(t+.5);});},
    spaceperc:(t,gv)=>{const c=offCtx,o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(880,t);o.frequency.exponentialRampToValueAtTime(110,t+.35);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=2200;fl.Q.value=3;const d=c.createWaveShaper();d.curve=dc(3);o.connect(fl);fl.connect(d);d.connect(g);g.connect(master);rv(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.75*gv,t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.38);o.start(t);o.stop(t+.38);const fm=c.createOscillator(),fmg=c.createGain();fm.frequency.value=3520;fm.connect(fmg);fmg.connect(o.frequency);fmg.gain.setValueAtTime(300,t);fmg.gain.exponentialRampToValueAtTime(1,t+.06);fm.start(t);fm.stop(t+.06);},
    lead:(t,gv)=>{const c=offCtx,scale=[261.63,311.13,349.23,392,466.16,523.25],freq=scale[Math.floor(Math.random()*scale.length)],o=c.createOscillator(),lfo=c.createOscillator(),lg=c.createGain(),g=c.createGain(),fl=c.createBiquadFilter();o.type='sawtooth';o.frequency.value=freq;lfo.frequency.value=5.2;lfo.connect(lg);lg.gain.value=8;lg.connect(o.frequency);fl.type='lowpass';fl.frequency.setValueAtTime(3200,t);fl.frequency.exponentialRampToValueAtTime(400,t+.6);o.connect(fl);fl.connect(g);g.connect(master);rv(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.32*gv,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.6);o.start(t);lfo.start(t);o.stop(t+.6);lfo.stop(t+.6);},
    basenote:(t,gv)=>{const c=offCtx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=73.4;o.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.6*gv,t+.01);g.gain.setValueAtTime(.6*gv,t+.22);g.gain.exponentialRampToValueAtTime(.001,t+.75);o.start(t);o.stop(t+.75);},
    bassslide:(t,gv)=>{const c=offCtx,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(55,t+.14);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=600;o.connect(fl);fl.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*gv,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.52);o.start(t);o.stop(t+.52);},
    pad:(t,gv)=>{const c=offCtx,freqs=[196,246.94,293.66],g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=900;g.connect(fl);fl.connect(master);rv(fl);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.26*gv,t+.15);g.gain.setValueAtTime(.26*gv,t+.55);g.gain.exponentialRampToValueAtTime(.001,t+1.3);freqs.forEach((f2,i)=>{const o=c.createOscillator();o.type='sine';o.frequency.value=f2*(1+i*.003);o.connect(g);o.start(t);o.stop(t+1.3);});},
    arp:(t,gv)=>{const c=offCtx,notes=[261.63,329.63,392,493.88,523.25],g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=2000;g.connect(fl);fl.connect(master);rv(fl);notes.forEach((f2,i)=>{const st=t+i*.075,o=c.createOscillator();o.type='square';o.frequency.value=f2;const e=c.createGain();o.connect(e);e.connect(g);e.gain.setValueAtTime(0,st);e.gain.linearRampToValueAtTime(.16*gv,st+.01);e.gain.exponentialRampToValueAtTime(.001,st+.07);o.start(st);o.stop(st+.08);});},
    wobble:(t,gv)=>{const c=offCtx,o=c.createOscillator(),lfo=c.createOscillator(),lg=c.createGain(),fl=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.value=55;fl.type='lowpass';fl.Q.value=8;fl.frequency.value=300;lfo.frequency.value=4;lfo.connect(lg);lg.gain.value=500;lg.connect(fl.frequency);o.connect(fl);fl.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*gv,t+.02);g.gain.setValueAtTime(.55*gv,t+.32);g.gain.exponentialRampToValueAtTime(.001,t+.75);o.start(t);lfo.start(t);o.stop(t+.75);lfo.stop(t+.75);},
    stab:(t,gv)=>{const c=offCtx,g=c.createGain(),fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=2400;fl.frequency.exponentialRampToValueAtTime(400,t+.25);const d=c.createWaveShaper();d.curve=dc(2);g.connect(fl);fl.connect(d);d.connect(master);rv(d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3*gv,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.32);[261.63,262.5,260.8].forEach(f2=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f2;o.connect(g);o.start(t);o.stop(t+.32);});},
    pluck:(t,gv)=>{const c=offCtx,freq=220*_ksMul,s=c.createBufferSource();s.buffer=nb(.025);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=freq*2;const g=c.createGain(),dl=c.createDelay(),fb=c.createGain();dl.delayTime.value=1/freq;fb.gain.value=.97;s.connect(fl);fl.connect(g);g.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(master);rv(dl);g.gain.setValueAtTime(gv,t);g.gain.exponentialRampToValueAtTime(.001,t+1.5);s.start(t);s.stop(t+.025);},
    bell:(t,gv)=>{const c=offCtx,car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();car.type='sine';car.frequency.value=440;mod.frequency.value=440*3.5;mod.connect(mg);mg.gain.value=880;mg.connect(car.frequency);car.connect(g);g.connect(master);rv(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*gv,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+2);car.start(t);mod.start(t);car.stop(t+2);mod.stop(t+2);},
    cowbell:(t,gv)=>{const c=offCtx,g=c.createGain(),fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=562;fl.Q.value=5;[562,845].forEach(f2=>{const o=c.createOscillator();o.type='square';o.frequency.value=f2;o.connect(fl);o.start(t);o.stop(t+.55);});fl.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*gv,t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.55);},
    riser:(t,gv)=>{const c=offCtx,s=c.createBufferSource();s.buffer=nb(.7);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.setValueAtTime(200,t);fl.frequency.exponentialRampToValueAtTime(8000,t+.65);fl.Q.value=3;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(master);rv(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.65*gv,t+.3);g.gain.setValueAtTime(.65*gv,t+.55);g.gain.exponentialRampToValueAtTime(.001,t+.7);s.start(t);s.stop(t+.7);},
    downlift:(t,gv)=>{const c=offCtx,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(1800,t);o.frequency.exponentialRampToValueAtTime(38,t+.65);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=3000;const d=c.createWaveShaper();d.curve=dc(2);o.connect(d);d.connect(fl);fl.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.75*gv,t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.65);o.start(t);o.stop(t+.65);},
    glitch:(t,gv)=>{for(let i=0;i<8;i++){if(Math.random()<.45)continue;const st=t+i*.022,s=offCtx.createBufferSource();s.buffer=nb(.018);const fl=offCtx.createBiquadFilter();fl.type='bandpass';fl.frequency.value=600+Math.random()*4000;fl.Q.value=9;const g=offCtx.createGain();s.connect(fl);fl.connect(g);g.connect(master);g.gain.setValueAtTime((Math.random()*.85+.2)*gv,st);g.gain.exponentialRampToValueAtTime(.001,st+.018);s.start(st);s.stop(st+.02);}},
    junglesnare:(t,gv)=>{const c=offCtx,o=c.createOscillator(),og=c.createGain();o.type='triangle';o.frequency.value=320;o.connect(og);og.connect(master);og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.6*gv,t+.002);og.gain.exponentialRampToValueAtTime(.001,t+.1);o.start(t);o.stop(t+.1);const s=c.createBufferSource();s.buffer=nb(.28);const f1=c.createBiquadFilter();f1.type='bandpass';f1.frequency.value=2200;f1.Q.value=1.2;const f2=c.createBiquadFilter();f2.type='highpass';f2.frequency.value=900;const ng=c.createGain();s.connect(f1);f1.connect(f2);f2.connect(ng);ng.connect(master);rv(ng);ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.55*gv,t+.002);ng.gain.exponentialRampToValueAtTime(.001,t+.28);s.start(t);s.stop(t+.28);},
    choir:(t,gv)=>{const c=offCtx,g=c.createGain();[800,1200,2400].forEach((fq,i)=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=110*(1+i*.0015);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=fq;fl.Q.value=6;o.connect(fl);fl.connect(g);o.start(t);o.stop(t+.95);});g.connect(master);rv(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.23*gv,t+.12);g.gain.setValueAtTime(.23*gv,t+.62);g.gain.exponentialRampToValueAtTime(.001,t+.95);},
    vinyl:(t,gv)=>{const c=offCtx,dur=.3,L=Math.round(SR*dur),buf=c.createBuffer(1,L,SR),d2=buf.getChannelData(0);for(let i=0;i<L;i++){const p=i/L;d2[i]=Math.sin((200+p*4000*Math.sin(p*Math.PI*3))*i/SR*Math.PI*2)*(Math.random()*.3+.7);}const s=c.createBufferSource();s.buffer=buf;const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=1200;fl.Q.value=2;const g=c.createGain();s.connect(fl);fl.connect(g);g.connect(master);rv(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*gv,t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.3);s.start(t);s.stop(t+.3);},
    zap:(t,gv)=>{const c=offCtx,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(2200,t);o.frequency.exponentialRampToValueAtTime(110,t+.12);const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.value=1800;fl.Q.value=4;const d=c.createWaveShaper();d.curve=dc(4);o.connect(fl);fl.connect(d);d.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*gv,t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.start(t);o.stop(t+.12);},
    marimba:(t,gv)=>{const c=offCtx,car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();car.type='sine';car.frequency.value=523.25;mod.frequency.value=523.25*4;mod.connect(mg);mg.gain.value=200;mg.connect(car.frequency);car.connect(g);g.connect(master);rv(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.65*gv,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.55);car.start(t);mod.start(t);car.stop(t+.55);mod.stop(t+.55);},
    thud:(t,gv)=>{const c=offCtx,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(80,t);o.frequency.exponentialRampToValueAtTime(45,t+.18);const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=400;o.connect(fl);fl.connect(g);g.connect(master);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.65*gv,t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.start(t);o.stop(t+.28);},
  };
  hits.forEach(({time,soundId,midi,dur})=>{const fn=R[soundId];if(fn)try{
    if(midi!=null&&typeof rollBaseMidi==='function'){ // piano roll note: exact pitch, cut off after its length
      const cents=(midi-rollBaseMidi(soundId))*100,gate=offCtx.createGain(),end=time+Math.max(.06,dur);
      gate.connect(outMaster);gate.gain.setValueAtTime(1,time);gate.gain.setValueAtTime(1,end);gate.gain.linearRampToValueAtTime(0,end+.05);
      const o0=offCtx.createOscillator;offCtx.createOscillator=function(){const o=o0.call(this);o.detune.value=cents;return o;};
      _ksMul=Math.pow(2,cents/1200);master=gate;
      try{fn(time,soundVols[soundId]!==undefined?soundVols[soundId]:1);}finally{delete offCtx.createOscillator;_ksMul=1;master=outMaster;}
      return;
    }
    const cents=(typeof keyCentsFor==='function')?keyCentsFor(soundId):0;
    if(cents){const o0=offCtx.createOscillator;offCtx.createOscillator=function(){const o=o0.call(this);o.detune.value=cents;return o;};_ksMul=Math.pow(2,cents/1200);try{fn(time,soundVols[soundId]!==undefined?soundVols[soundId]:1);}finally{delete offCtx.createOscillator;_ksMul=1;}}
    else fn(time,soundVols[soundId]!==undefined?soundVols[soundId]:1);
  }catch(e){}});
  showToast('Rendering WAV\u2026');
  try{
    const buf=await offCtx.startRendering();
    downloadBlob(encodeWAV(buf),filename);
    showToast('\u2705 WAV exported — check your downloads!');
  }catch(e){showToast('Export failed: '+e.message);console.error(e);}
}

document.getElementById('seqExportPatBtn')&&document.getElementById('seqExportPatBtn').addEventListener('click',()=>{
  const sd=60/seqBpm/4;
  renderHitsToWAV(buildPatternHits(seqLayers),STEPS*sd,'alien_buddies_pattern.wav');
});
document.getElementById('seqExportArrBtn')&&document.getElementById('seqExportArrBtn').addEventListener('click',()=>{
  const r=buildArrangementHits({bars:arrangeBars,arrangement:arrangement});
  renderHitsToWAV(r.hits,r.duration,'alien_buddies_arrangement.wav');
});
document.getElementById('seqExportSongBtn')&&document.getElementById('seqExportSongBtn').addEventListener('click',()=>{
  const{hits,duration}=buildSongHits();
  renderHitsToWAV(hits,duration,'alien_buddies_song.wav');
});


