// ══════════════════════════════════════════════
//  VOCAL EFFECTS — Autotune, Voice Changer, Harmonizer (reshape the take) + Vocoder (live)
// ══════════════════════════════════════════════
// Each vocal layer's settings live in its effects channel (trackFx[13 + layer]), next to reverb, EQ and the rest.
// • AUTOTUNE / VOICE CHANGER / HARMONIZER work on the recording itself: a background worker finds the pitch of
//   every moment of the take (YIN), works out where it should be (song key, retune speed, pitch / formant shift,
//   harmony notes) and re-synthesizes it with PSOLA (pitch-synchronous overlap-add), which keeps the length and timing.
//   The result is cached per take + settings, so it is only worked out once. Until it's ready the raw take plays.
// • VOCODER runs live: the voice is split into 16 bands, and the loudness of each band shapes the same band of a synth.
//   The synth plays the notes of a piano roll layer (its notes only, the layer itself can stay muted) or a drone in the song key.

// ── DSP core (runs in a Web Worker; the same code runs on the page if workers aren't available) ──
function _voxDspCore(){
  // pitch track: YIN on a ~12 kHz copy, one estimate every 5 ms (0 = no clear pitch: breath, consonants, silence)
  function yinTrack(x,sr){
    const D=Math.max(1,Math.round(sr/12000)),dsr=sr/D,n=Math.floor(x.length/D);
    const d=new Float32Array(n);for(let i=0;i<n;i++){let s=0;for(let k=0;k<D;k++)s+=x[i*D+k];d[i]=s/D;}
    const hop=Math.max(1,Math.round(dsr*.005)),W=Math.round(dsr*.025),tmin=Math.floor(dsr/1000),tmax=Math.ceil(dsr/70);
    const frames=Math.max(0,Math.floor((n-W-tmax)/hop)+1),f0=new Float32Array(frames),df=new Float32Array(tmax+1);
    for(let f=0;f<frames;f++){
      const s=f*hop;let e=0;for(let i=0;i<W;i++)e+=d[s+i]*d[s+i];
      if(Math.sqrt(e/W)<.008){f0[f]=0;continue;}
      df[0]=1;let run=0,best=-1;
      for(let t=1;t<=tmax;t++){let sum=0;for(let i=0;i<W;i++){const v=d[s+i]-d[s+i+t];sum+=v*v;}run+=sum;df[t]=run>0?sum*t/run:1;}
      for(let t=tmin;t<=tmax;t++){if(df[t]<.15){while(t+1<=tmax&&df[t+1]<df[t])t++;best=t;break;}}
      if(best<0){f0[f]=0;continue;}
      let tb=best;if(best>1&&best<tmax){const a=df[best-1],b=df[best],c=df[best+1],den=a-2*b+c;if(den!==0)tb=best+.5*(a-c)/den;}
      f0[f]=dsr/tb;
    }
    return{f0,hopS:hop*D,c0:Math.round(W/2*D)};
  }
  // remove one-off glitches: 5-point median on voiced frames, then drop voiced runs shorter than 3 frames (15 ms)
  function clean(f0){
    const n=f0.length,g=new Float32Array(n),w=[];
    for(let i=0;i<n;i++){if(!(f0[i]>0)){g[i]=0;continue;}w.length=0;for(let k=-2;k<=2;k++){const v=f0[i+k];if(v>0)w.push(v);}w.sort((a,b)=>a-b);g[i]=w[w.length>>1];}
    for(let i=0;i<n;){if(!(g[i]>0)){i++;continue;}let j=i;while(j<n&&g[j]>0)j++;if(j-i<3)for(let k=i;k<j;k++)g[k]=0;i=j;}
    return g;
  }
  // analysis marks: one per pitch period (aligned to the waveform's peaks) when voiced, every 5 ms when not
  function marks(x,sr,g,frameAt){
    const N=x.length,unv=Math.round(sr*.005),M=[],TT=[];let t=0,prevV=false;
    while(t<N){
      const f=g[frameAt(t)];
      if(f>0){
        const T=sr/f,lo=Math.max(0,Math.round(prevV?t-T*.25:t)),hi=Math.min(N,Math.round(prevV?t+T*.25:t+T));
        let best=Math.round(t),bv=-Infinity;for(let i=lo;i<hi;i++)if(x[i]>bv){bv=x[i];best=i;}
        M.push(best);TT.push(T);t=best+T;prevV=true;
      }else{M.push(Math.round(t));TT.push(-unv);t+=unv;prevV=false;}
    }
    return{M,TT};
  }
  // PSOLA: grains of two periods, re-spaced at the new period. F stretches each grain (formant shift).
  function psola(x,sr,mk,ratio,frameAt,F,unvW){
    const N=x.length,y=new Float32Array(N),M=mk.M,TT=mk.TT;if(!M.length)return y;
    const rd=p=>{const i=Math.floor(p);if(i<0||i>=N-1)return 0;return x[i]+(x[i+1]-x[i])*(p-i);};
    let k=0,ts=M[0];
    while(ts<N){
      while(k+1<M.length&&Math.abs(M[k+1]-ts)<=Math.abs(M[k]-ts))k++;
      const T=TT[k],c=Math.round(ts);
      if(T>0){
        const r=ratio[frameAt(ts)],Tout=T/r,L=Math.max(2,Math.round(T/F)),w=Math.min(2,Math.max(.3,Math.pow(Tout/L,.4))),ma=M[k];
        for(let j=-L;j<=L;j++){const o=c+j;if(o<0||o>=N)continue;y[o]+=w*.5*(1+Math.cos(Math.PI*j/L))*rd(ma+j*F);}
        ts+=Math.max(1,Tout);
      }else{
        const L=-T;
        if(unvW>0)for(let j=-L;j<=L;j++){const o=c+j;if(o<0||o>=N)continue;y[o]+=unvW*.5*(1+Math.cos(Math.PI*j/L))*rd(ts+j*F);}
        ts+=L;
      }
    }
    return y;
  }
  function process(x,sr,f0p,p){
    if(!f0p)f0p=yinTrack(x,sr);
    const g=clean(f0p.f0),nF=g.length,hopS=f0p.hopS,c0=f0p.c0;
    const frameAt=t=>{let i=Math.round((t-c0)/hopS);return i<0?0:(i>=nF?nF-1:i);};
    if(!nF)return{y:x.slice(0),f0:f0p};
    const notes=[];for(let m=0;m<128;m++)if(p.pcs.indexOf(m%12)>=0)notes.push(m);
    const near=m=>{let lo=0,hi=notes.length-1;while(hi-lo>1){const md=(lo+hi)>>1;if(notes[md]<m)lo=md;else hi=md;}return Math.abs(notes[lo]-m)<=Math.abs(notes[hi]-m)?lo:hi;};
    const midiOf=f=>69+12*Math.log2(f/440);
    let robotM=null;
    if(p.robot){const v=[];for(let i=0;i<nF;i++)if(g[i]>0)v.push(midiOf(g[i]));v.sort((a,b)=>a-b);const med=v.length?v[v.length>>1]:57;
      robotM=p.tonic;while(robotM+12<=med+6)robotM+=12;}
    const harms=p.harm||[],chrom=p.pcs.length===12;
    const ratio=new Float32Array(nF),hr=harms.map(()=>new Float32Array(nF));
    const a=p.tune.on?(p.tune.speed<=0?1:1-Math.exp(-(hopS/sr)/(p.tune.speed/1000))):0;
    let cur=null;
    for(let i=0;i<nF;i++){
      const f=g[i];
      if(!(f>0)){ratio[i]=1;hr.forEach(h=>{h[i]=1;});cur=null;continue;}
      const m=midiOf(f);let out=m,base=m;
      if(p.robot){out=robotM;base=robotM;}
      else if(p.tune.on){const t=notes[near(m)];cur=cur==null?t:cur+(t-cur)*a;out=m+(cur-m)*p.tune.amt;base=cur;}
      ratio[i]=Math.pow(2,(out+p.pitch-m)/12);
      harms.forEach((h,hi)=>{
        const k=near(base),dev=base-notes[k];
        const hm=chrom?base+h.semi:notes[Math.max(0,Math.min(notes.length-1,k+h.deg))]+dev+(h.oct||0)*12;
        hr[hi][i]=Math.pow(2,(hm+p.pitch-m)/12);
      });
    }
    const F=Math.pow(2,p.formant/12),mk=marks(x,sr,g,frameAt);
    const y=psola(x,sr,mk,ratio,frameAt,F,1);
    hr.forEach(h=>{const z=psola(x,sr,mk,h,frameAt,F,0);for(let i=0;i<y.length;i++)y[i]+=z[i]*p.harmMix;});
    return{y,f0:f0p};
  }
  return{process,yinTrack};
}
const VOX_HARMS={
  '3up':{label:'3RD UP',v:[{deg:2,semi:4}]},'3down':{label:'3RD DOWN',v:[{deg:-2,semi:-3}]},'5up':{label:'5TH UP',v:[{deg:4,semi:7}]},
  oct:{label:'OCTAVE DOWN',v:[{deg:0,semi:-12,oct:-1}]},chord:{label:'3RD + 5TH',v:[{deg:2,semi:4},{deg:4,semi:7}]},
};
const VOX_VOICES={ // voice changer presets: pitch (semitones) and formant (semitones of "throat size")
  alien:{label:'👽 ALIEN',pitch:7,formant:-4},chip:{label:'🐿 CHIPMUNK',pitch:12,formant:7},giant:{label:'🗿 GIANT',pitch:-12,formant:-6},deep:{label:'DEEP',pitch:-5,formant:-2},
};
function fxVoiceSummary(f){const n=[];if(!f)return n;if(f.tuneOn&&f.tuneAmt>0)n.push('AUTOTUNE');if(f.pitch||f.formant||f.robot)n.push(f.robot?'ROBOT':'VOICE');if(f.harm&&f.harm!=='none')n.push('HARMONY');if(f.vocOn)n.push('VOCODER');return n;}

// ── worker + job queue ──
let _voxW=null,_voxWFail=false,_voxCore=null,_voxJobId=0;const _voxJobCb=new Map();
function voxWorker(){
  if(_voxW||_voxWFail)return _voxW;
  try{
    const src='const core=('+_voxDspCore.toString()+')();self.onmessage=e=>{const d=e.data;try{const r=core.process(d.x,d.sr,d.f0,d.p);self.postMessage({id:d.id,y:r.y,f0:r.f0},[r.y.buffer]);}catch(err){self.postMessage({id:d.id,err:String(err)});}};';
    _voxW=new Worker(URL.createObjectURL(new Blob([src],{type:'application/javascript'})));
    _voxW.onmessage=e=>{const cb=_voxJobCb.get(e.data.id);if(cb){_voxJobCb.delete(e.data.id);cb(e.data);}};
    _voxW.onerror=()=>{_voxWFail=true;_voxW=null;_voxJobCb.forEach(cb=>cb({err:'worker failed'}));_voxJobCb.clear();};
  }catch(e){_voxWFail=true;_voxW=null;}
  return _voxW;
}
function voxDsp(x,sr,f0,p){
  return new Promise(res=>{
    const w=voxWorker();
    if(w){const id=++_voxJobId;_voxJobCb.set(id,res);w.postMessage({id,x,sr,f0,p},[x.buffer]);return;}
    setTimeout(()=>{try{_voxCore=_voxCore||_voxDspCore();const r=_voxCore.process(x,sr,f0,p);res({y:r.y,f0:r.f0});}catch(err){res({err:String(err)});}},20);
  });
}
const voxProc=new Map(),voxF0=new Map(),_voxQueue=[];let _voxBusy=false;
// the settings for one vocal layer's take processing (null = nothing to do: the raw take plays)
function voxVoiceParams(li){
  const ch=FX_VOX_BASE+li,f=fxEffective(getTrackFx(ch,false),ch);if(!f)return null;
  const tune=!!(f.tuneOn&&f.tuneAmt>0),harm=!!(f.harm&&f.harm!=='none'&&VOX_HARMS[f.harm]),pv=!!(f.pitch||f.formant||f.robot);
  if(!tune&&!harm&&!pv)return null;
  const keyOn=typeof keyIsActive==='function'&&keyIsActive(),R=keyOn?relMajorRoot(seqKey,seqKeyMinor):0;
  return{pcs:keyOn?MAJOR_SCALE.map(x=>(x+R)%12):[0,1,2,3,4,5,6,7,8,9,10,11],tonic:keyOn?seqKey:0,
    tune:{on:tune,amt:+f.tuneAmt,speed:+f.tuneSpeed},robot:!!f.robot,pitch:+f.pitch||0,formant:+f.formant||0,
    harm:harm?VOX_HARMS[f.harm].v:null,harmMix:+f.harmMix};
}
const _voxKey=(t,p)=>t+'|'+JSON.stringify(p);
function voxWantedKeys(){
  const s=new Set(),n=voxLayerCount();
  vocals.layers.forEach((L,li)=>{if(li>=n)return;const p=voxVoiceParams(li);if(p)L.clips.forEach(c=>s.add(_voxKey(c.t,p)));});
  return s;
}
// processed buffer for this take on this layer, if it's ready (starts the work if it isn't)
function voxProcessedBuf(t,li){
  const p=voxVoiceParams(li);if(!p)return null;
  const k=_voxKey(t,p),e=voxProc.get(k);
  if(e&&e.buf)return e.buf;
  if(!e)voxEnqueue(t,p,k);
  return null;
}
function voxEnqueue(t,p,k){
  if(voxProc.has(k))return voxProc.get(k).promise;
  let done;const e={buf:null,promise:new Promise(r=>{done=r;})};e.done=done;voxProc.set(k,e);
  _voxQueue.push({t,p,k});voxPump();voxPaintProc();
  return e.promise;
}
async function voxPump(){
  if(_voxBusy)return;_voxBusy=true;
  try{
    while(_voxQueue.length){
      const job=_voxQueue.shift(),e=voxProc.get(job.k);if(!e)continue;
      // settings moved on while this was waiting (e.g. dragging a slider): skip it
      if(!voxWantedKeys().has(job.k)&&!job.force){voxProc.delete(job.k);e.done(null);continue;}
      await voxLoadTake(job.t);
      const raw=voxBuf.get(job.t);if(!raw){voxProc.delete(job.k);e.done(null);continue;}
      voxPaintProc();
      const r=await voxDsp(raw.getChannelData(0).slice(0),raw.sampleRate,voxF0.get(job.t)||null,job.p);
      if(r.err||!r.y){console.warn('vocal fx failed',r.err);voxProc.delete(job.k);e.done(null);continue;}
      if(r.f0)voxF0.set(job.t,r.f0);
      e.buf=voxMakeBuffer(r.y,raw.sampleRate);e.done(e.buf);
    }
  }finally{_voxBusy=false;voxPaintProc();}
}
// make sure every take that needs processing is in the queue (called after edits; slider drags are debounced)
let _voxQT=0;
function voxQueueAll(now){
  clearTimeout(_voxQT);
  const go=()=>{const n=voxLayerCount();vocals.layers.forEach((L,li)=>{if(li>=n)return;L.clips.forEach(c=>voxProcessedBuf(c.t,li));});};
  if(now)go();else _voxQT=setTimeout(go,350);
}
function voxProcPending(){let n=0;voxProc.forEach(e=>{if(!e.buf)n++;});return n;}
function voxPaintProc(){if(typeof voxPaintFoot==='function'&&voxOpen)voxPaintFoot();}
// WAV export waits until every take sounds the way it does when playing
async function voxPrepareExport(){
  voxQueueAll(true);
  const ws=[];voxProc.forEach((e,k)=>{if(!e.buf){_voxQueue.forEach(j=>{if(j.k===k)j.force=true;});ws.push(e.promise);}});
  if(ws.length){showToast('🎤 Getting '+ws.length+' vocal take'+(ws.length>1?'s':'')+' ready…');await Promise.all(ws);}
}
// memory: drop processed takes nobody uses any more (old settings, deleted clips)
function voxFreeProcessed(){
  const want=voxWantedKeys();
  [...voxProc.keys()].forEach(k=>{const e=voxProc.get(k);if(e.buf&&!want.has(k))voxProc.delete(k);});
  const used=new Set();vocals.layers.forEach(L=>L.clips.forEach(c=>used.add(c.t)));
  [...voxF0.keys()].forEach(t=>{if(!used.has(t))voxF0.delete(t);});
}

// ══════════════════════════════════════════════
//  VOCODER (live, per vocal layer)
// ══════════════════════════════════════════════
const VOC_BANDS=16,VOC_LO=110,VOC_HI=7200,VOC_Q=4.2;
let _vocRect=null;
function _vocRectCurve(){if(_vocRect)return _vocRect;const n=2049,c=new Float32Array(n);for(let i=0;i<n;i++)c[i]=Math.abs(i*2/(n-1)-1);return _vocRect=c;}
function voxMakeVocoder(c){
  const inp=c.createGain(),carrier=c.createGain(),out=c.createGain(),nodes=[];
  for(let b=0;b<VOC_BANDS;b++){
    const fr=VOC_LO*Math.pow(VOC_HI/VOC_LO,b/(VOC_BANDS-1));
    const mb=c.createBiquadFilter();mb.type='bandpass';mb.frequency.value=fr;mb.Q.value=VOC_Q;
    const ws=c.createWaveShaper();ws.curve=_vocRectCurve();
    const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=32;lp.Q.value=.5;
    const eg=c.createGain();eg.gain.value=VOC_ENV_GAIN;
    const cb=c.createBiquadFilter();cb.type='bandpass';cb.frequency.value=fr;cb.Q.value=VOC_Q;
    const vca=c.createGain();vca.gain.value=0;
    inp.connect(mb);mb.connect(ws);ws.connect(lp);lp.connect(eg);eg.connect(vca.gain);
    carrier.connect(cb);cb.connect(vca);vca.connect(out);
    nodes.push(mb,ws,lp,eg,cb,vca);
  }
  // consonants ("s", "t") have no pitch: let a little of the voice's top end through so the words stay clear
  const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=5200;const sg=c.createGain();sg.gain.value=.35;
  inp.connect(hp);hp.connect(sg);sg.connect(out);nodes.push(hp,sg);
  out.gain.value=VOC_MAKEUP;
  return{inp,carrier,out,nodes};
}
const VOC_ENV_GAIN=6,VOC_MAKEUP=2.5; // measured: about as loud as the dry voice
function _vocSaw(c,midi,t,dur,lvl,dest,drone){
  const o1=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),f=440*Math.pow(2,(midi-69)/12);
  o1.type='sawtooth';o2.type='sawtooth';o1.frequency.value=f;o2.frequency.value=f;o2.detune.value=8;
  o1.connect(g);o2.connect(g);g.connect(dest);
  if(drone){g.gain.value=lvl;o1.start(t);o2.start(t);return{o1,o2,g};}
  const end=t+Math.max(.05,dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(lvl,t+.006);g.gain.setValueAtTime(lvl,end);g.gain.linearRampToValueAtTime(0,end+.06);
  o1.start(t);o2.start(t);o1.stop(end+.08);o2.stop(end+.08);
  if(!_exporting)o1.onended=()=>{try{g.disconnect();}catch(e){}};
  return{o1,o2,g};
}
function _vocKeySig(){const on=typeof keyIsActive==='function'&&keyIsActive();return on?seqKey+(seqKeyMinor?'m':''):'C';}
// the chain between a vocal layer and its effects channel: dry voice + vocoded voice
function voxVoiceChain(li,target){
  const N=voxNodes();N.chains=N.chains||[];
  const ch=FX_VOX_BASE+li,f=fxEffective(getTrackFx(ch,false),ch);
  const old=N.chains[li];
  if(!f||!f.vocOn){if(old){_vocTeardown(old);N.chains[li]=null;}return target;}
  const car=f.vocCarrier==null?'drone':String(f.vocCarrier),sig=car+'|'+(car==='drone'?_vocKeySig():'');
  let C=old;
  if(!C||C.sig!==sig){
    if(old)_vocTeardown(old);
    const c=N.c;C={sig,in:c.createGain(),dry:c.createGain(),wet:c.createGain(),out:c.createGain(),voc:voxMakeVocoder(c),drones:[],target:null};
    C.in.connect(C.dry);C.dry.connect(C.out);C.in.connect(C.voc.inp);C.voc.out.connect(C.wet);C.wet.connect(C.out);
    if(car==='drone'){ // the song key's chord, held: root, 3rd and 5th low down, plus the root an octave up
      const on=typeof keyIsActive==='function'&&keyIsActive(),root=on?seqKey:0,third=on&&seqKeyMinor?3:4;
      [[36+root,.2],[48+root,.2],[48+root+third,.15],[48+root+7,.15],[60+root,.12]].forEach(([m,l])=>C.drones.push(_vocSaw(c,m,c.currentTime,0,l,C.voc.carrier,true)));
    }
    N.chains[li]=C;
  }
  if(C.target!==target){try{C.out.disconnect();}catch(e){}C.out.connect(target);C.target=target;}
  const mix=Math.max(0,Math.min(1,f.vocMix==null?1:+f.vocMix));
  if(C.mix!==mix){C.dry.gain.value=1-mix;C.wet.gain.value=mix;C.mix=mix;}
  return C.in;
}
function _vocTeardown(C){
  C.drones.forEach(d=>{try{d.o1.stop();d.o2.stop();d.g.disconnect();}catch(e){}});
  try{C.in.disconnect();C.out.disconnect();C.voc.inp.disconnect();C.voc.out.disconnect();C.voc.nodes.forEach(n=>n.disconnect());}catch(e){}
}
// a carrier note (from the piano roll layer the vocoder listens to)
function voxCarrierNote(li,midi,at,dur,vel){
  voxIn(li);const N=voxNodes(),C=N.chains&&N.chains[li];if(!C||!C.voc)return;
  _vocSaw(N.c,midi,at,dur,.22*(vel==null?1:vel),C.voc.carrier,false);
}
function _vocCarrierLayers(){
  const n=voxLayerCount(),out=[];if(!n)return out;
  for(let li=0;li<n;li++){const ch=FX_VOX_BASE+li,f=fxEffective(getTrackFx(ch,false),ch);if(f&&f.vocOn&&typeof f.vocCarrier==='number')out.push([li,f.vocCarrier]);}
  return out;
}
// the sequencer plays piano roll notes step by step: the vocoders listening to a roll layer get the same notes
function voxCarrierStep(roll,st,at){
  if(!roll||!roll.layers)return;
  const ls=_vocCarrierLayers();if(!ls.length)return;
  const sd=voxSd();
  ls.forEach(([li,r])=>{const L=roll.layers[r];if(!L)return;
    L.notes.forEach(nt=>{if(nt.s>=st&&nt.s<st+1)voxCarrierNote(li,nt.m,at+(nt.s-st)*sd,nt.l*sd,nt.v==null?1:nt.v);});});
}
if(typeof rollPlayStep==='function'){const _rps=rollPlayStep;rollPlayStep=function(roll,st,at){const r=_rps.apply(this,arguments);try{voxCarrierStep(roll,st,at);}catch(e){}return r;};}
// WAV export: the same carrier notes as hits
if(typeof rollHits==='function'){const _rh=rollHits;rollHits=function(roll,offset,maxSteps){
  const out=_rh.apply(this,arguments);
  try{const ls=_vocCarrierLayers();if(ls.length&&roll&&roll.layers){const sd=voxSd();
    ls.forEach(([li,r])=>{const L=roll.layers[r];if(L)L.notes.forEach(nt=>{if(nt.s<maxSteps)out.push({vcar:true,li,time:offset+nt.s*sd,midi:nt.m,dur:nt.l*sd,vel:nt.v==null?1:nt.v});});});}}catch(e){}
  return out;};}
