// ══════════════════════════════════════════════
//  VOCALS — record your voice on up to 10 layers and arrange the takes on the song timeline
// ══════════════════════════════════════════════
// Unlocked from the Vocals hub in the Musical Toolkit (2 layers, then 4 / 7 / 10 with the branches).
// • A take is raw mic audio stored in IndexedDB (it can be minutes long — far too big for localStorage).
//   The save slot only keeps the clips: which take, where it sits and which part of it plays.
// • The timeline is the song: in PAT mode the beat loops underneath for as long as the vocals run,
//   in ARR / SONG mode it is the arrangement / song from the start.
// • Every layer has its own effects channel (13 + layer) in the EFFECTS window, like tracks and roll layers.
// • Clips are non-destructive: trimming or recording over a clip only changes which part of the take plays.
const VOX_MAX_LAYERS=10,FX_VOX_BASE=13,VOX_LANE_COLORS=['#ff7ad9','#7ad7ff','#ffd36b','#9dff7a','#c99bff','#ff9b6b','#6bffe0','#ff6b8e','#d8ff6b','#8fa8ff'];
const VOX_SNAPS=[[0,'OFF'],[1,'1/16'],[4,'BEAT'],[16,'BAR']];
let vocals={layers:[],start:0,arm:0};   // saved with the slot
let voxOpen=false;
function voxLayerCount(){if(typeof musicHas!=='function'||!musicHas('mt_vocals'))return 0;return musicHas('mt_vox10')?10:musicHas('mt_vox7')?7:musicHas('mt_vox4')?4:2;}
function voxLayer(i){while(vocals.layers.length<=i)vocals.layers.push({name:'',vol:1,muted:false,solo:false,clips:[]});return vocals.layers[i];}
function voxLayerName(i){const L=vocals.layers[i];return (L&&L.name)||('VOX '+(i+1));}
function voxSanitize(v){
  const out={layers:[],start:0,arm:0};
  if(v&&typeof v==='object'){
    out.start=Math.max(0,+v.start||0);out.arm=Math.max(0,Math.min(VOX_MAX_LAYERS-1,v.arm|0));
    (Array.isArray(v.layers)?v.layers:[]).slice(0,VOX_MAX_LAYERS).forEach(L=>{
      L=L||{};
      out.layers.push({name:String(L.name||'').slice(0,16),vol:isFinite(L.vol)?Math.max(0,Math.min(1.5,+L.vol)):1,muted:!!L.muted,solo:!!L.solo,
        clips:(Array.isArray(L.clips)?L.clips:[]).filter(c=>c&&typeof c.t==='string'&&isFinite(c.s)&&isFinite(c.o)&&c.d>0)
          .map(c=>{const o={t:c.t,s:Math.max(0,+c.s),o:Math.max(0,+c.o),d:+c.d};if(isFinite(c.g)&&c.g!==1)o.g=Math.max(0,Math.min(2,+c.g));return o;})});
    });
  }
  return out;
}
function voxSave(){return voxSanitize(vocals);}
function voxLoad(v){
  if(voxRec)voxStopRecording(true);
  voxStopAll();vocals=voxSanitize(v);voxSel=null;voxUndo.length=0;
  voxEnsureAll();if(voxOpen)voxRender();
}
const voxSd=()=>60/((typeof seqBpm==='number'&&seqBpm>0)?seqBpm:100)/4; // seconds per sequencer step
function voxClipEnd(c){return c.s+c.d/voxSd();}
function voxSoloOn(){const n=voxLayerCount();return vocals.layers.some((L,i)=>i<n&&L.solo);}
function voxAudible(L,li,solo){
  if(!L||L.muted)return false;
  if(solo&&!L.solo)return false;
  if(voxRec&&voxRec.li===li&&!voxRec.cal)return false; // the layer being recorded on is quiet (you hear your new take instead)
  return true;
}
function voxHasClips(){const n=voxLayerCount();return vocals.layers.some((L,i)=>i<n&&L.clips.length);}
function voxLastEnd(){let e=0;const n=voxLayerCount();vocals.layers.forEach((L,i)=>{if(i<n)L.clips.forEach(c=>{e=Math.max(e,voxClipEnd(c));});});return e;}

// ── the song timeline ──
function _patAt(arr,b){return arr[b]!=null?savedPatterns[arr[b]]:null;}
function voxArrLen(a){let n=0;if(a)for(let b=0;b<a.bars;b++)n+=patLen(_patAt(a.arrangement,b));return n;}
function voxSongLen(){
  if(seqMode==='arrange')return voxArrLen({bars:arrangeBars,arrangement});
  if(seqMode==='song'){let n=0;songSlots.forEach(s=>{n+=voxArrLen(savedArrangements[s.arrIdx]);});return n;}
  return voxLoopLen();
}
// PAT mode: the beat keeps looping while the vocal timeline runs to the end of the last take (whole loops, so the beat stays in step)
function voxLoopLen(){
  let e=voxLastEnd();if(voxOpen)e=Math.max(e,vocals.start+1);
  return Math.max(STEPS,Math.ceil((e-1e-6)/STEPS)*STEPS);
}
let voxPos=0,voxLastPos=-1,voxJoin=true,voxPlayFrom=null,_voxAnchor=null;
// where the music is right now, in steps from the start of the song
function voxCurPos(){
  if(seqMode==='arrange'){let p=0;for(let b=0;b<arrBar;b++)p+=patLen(_patAt(arrangement,b));return p+arrBarStep;}
  if(seqMode==='song'){
    let p=0;for(let i=0;i<songSlotIdx&&i<songSlots.length;i++)p+=voxArrLen(savedArrangements[songSlots[i].arrIdx]);
    const a=songSlots[songSlotIdx]&&savedArrangements[songSlots[songSlotIdx].arrIdx];
    if(a)for(let b=0;b<songArrBar;b++)p+=patLen(_patAt(a.arrangement,b));
    return p+songArrBarStep;
  }
  return voxPos;
}
// jump the sequencer to a song position (used to play / record from the green flag)
function voxSeek(p){
  p=Math.max(0,Math.floor(p));
  if(seqMode==='pattern'){voxPos=p;seqStep=p%STEPS;return p;}
  const total=voxSongLen();if(total<=0)return 0;p%=total;
  let r=p;
  if(seqMode==='arrange'){
    for(let b=0;b<arrangeBars;b++){const L=patLen(_patAt(arrangement,b));if(r<L){arrBar=b;arrBarStep=r;return p;}r-=L;}
  }else if(seqMode==='song'){
    for(let i=0;i<songSlots.length;i++){const a=savedArrangements[songSlots[i].arrIdx];if(!a)continue;
      for(let b=0;b<a.bars;b++){const L=patLen(_patAt(a.arrangement,b));if(r<L){songSlotIdx=i;songArrBar=b;songArrBarStep=r;if(typeof buildSongPhRow==='function')buildSongPhRow();return p;}r-=L;}}
  }
  return 0;
}

// ══════════════════════════════════════════════
//  PLAYBACK
// ══════════════════════════════════════════════
// every layer has a persistent input (its volume / mute / solo) that feeds its effects channel; clips plug into it
let _voxN=null;const voxActive=[];
function voxNodes(){const c=getCtx();if(!_voxN||_voxN.c!==c)_voxN={c,ins:[],tgt:[]};return _voxN;}
function voxIn(li){const N=voxNodes();if(!N.ins[li]){N.ins[li]=N.c.createGain();N.tgt[li]=null;N.ins[li]._v=1;voxRoute(li);}return N.ins[li];}
function voxRoute(li){
  const N=voxNodes(),g=N.ins[li];if(!g)return;
  const bus=fxBusFor(FX_VOX_BASE+li),t=bus?bus.input:drumMasterReal;
  const dest=typeof voxVoiceChain==='function'?voxVoiceChain(li,t):t; // vocoder sits in front of the effects channel
  if(N.tgt[li]!==dest){try{g.disconnect();}catch(e){}g.connect(dest);N.tgt[li]=dest;if(voxMic&&li===vocals.arm&&!_exporting)voxApplyMonitor();}
  const L=vocals.layers[li],v=voxAudible(L,li,voxSoloOn())?(L.vol==null?1:L.vol):0;
  if(g._v!==v){if(_exporting)g.gain.value=v;else g.gain.setTargetAtTime(v,N.c.currentTime,.015);g._v=v;}
}
function voxRouteAll(){if(!audioCtx)return;const N=voxNodes();N.ins.forEach((g,li)=>{if(g)voxRoute(li);});}
// play one clip, starting `skip` seconds into it, at audio time `at`. maxDur cuts it short (song end in an export)
function voxPlayClip(c,li,at,skip,maxDur){
  // autotune / voice changer / harmonizer: the processed take (same length), once it's ready
  const buf=(typeof voxProcessedBuf==='function'&&voxProcessedBuf(c.t,li))||voxBuf.get(c.t);if(!buf)return null;
  const ctx=getCtx();skip=Math.max(0,skip||0);
  const off=c.o+skip;let dur=Math.min(c.d-skip,buf.duration-off);if(maxDur!=null)dur=Math.min(dur,maxDur);
  if(!(dur>.02))return null;
  const src=ctx.createBufferSource();src.buffer=buf;
  const g=ctx.createGain(),gv=c.g==null?1:c.g,f=Math.min(.008,dur/4);
  // tiny fades at both edges, so cutting a take mid-word never clicks
  g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gv,at+f);g.gain.setValueAtTime(gv,at+dur-f);g.gain.linearRampToValueAtTime(0,at+dur);
  src.connect(g);g.connect(voxIn(li));
  src.start(at,off,dur+.005);
  if(!_exporting){
    const a={src,g,li,c,end:at+dur};voxActive.push(a);
    src.onended=()=>{const i=voxActive.indexOf(a);if(i>=0)voxActive.splice(i,1);try{g.disconnect();}catch(e){}};
  }
  return src;
}
function voxStopAll(at){
  if(!audioCtx)return;const now=audioCtx.currentTime,t=Math.max(now,at||now);
  voxActive.slice().forEach(a=>{try{a.g.gain.cancelScheduledValues(t);a.g.gain.setValueAtTime(a.g.gain.value,t);a.g.gain.linearRampToValueAtTime(0,t+.02);a.src.stop(t+.03);}catch(e){}});
  if(!at)voxActive.length=0;
}
// called by the sequencer clock for every step, in every mode, before it moves on
function voxStep(quiet,at){
  const pos=voxCurPos(),n=voxLayerCount();
  const wrapped=voxLastPos>=0&&pos<voxLastPos;voxLastPos=pos;
  if(voxRec&&!voxRec.cal){
    if(voxRec.state==='armed'){voxRec.state='rec';voxRec.T=at;voxRec.pos0=pos;voxPaintRec();}
    else if(voxRec.state==='rec'&&!voxRec.endAt&&at-voxRec.T>VOX_MAX_TAKE){ // long takes use a lot of memory on phones
      voxRec.endAt=at;const ms=Math.max(0,(at-getCtx().currentTime)*1000);
      setTimeout(()=>{if(seqPlaying)stopSeq();showToast('🎤 Takes can be up to '+(VOX_MAX_TAKE/60)+' minutes: take saved. Record the next part from the flag.');},ms);
    }
    else if(voxRec.state==='rec'&&wrapped&&!voxRec.endAt){ // ARR / SONG went back to the start: the take ends at the end of the song
      voxRec.endAt=at;const ms=Math.max(0,(at-getCtx().currentTime)*1000);
      setTimeout(()=>{if(seqPlaying)stopSeq();showToast('🎤 Reached the end of the song: take saved');},ms);
    }
  }
  if(n){
    if(wrapped)voxStopAll(at);
    if(!quiet){
      voxRouteAll();
      const sd=voxSd(),solo=voxSoloOn();
      for(let li=0;li<n;li++){
        const L=vocals.layers[li];if(!L||!L.clips.length||!voxAudible(L,li,solo))continue;
        L.clips.forEach(c=>{
          if(c.s>=pos-1e-9&&c.s<pos+1-1e-9){voxPlayClip(c,li,at+(c.s-pos)*sd,0);return;}
          // joining in the middle of a take (played from the flag, or the tab was in the background)
          if(voxJoin&&c.s<pos&&voxClipEnd(c)>pos+.05&&!voxActive.some(a=>a.c===c&&a.end>at))voxPlayClip(c,li,at,(pos-c.s)*sd);
        });
      }
      voxJoin=false;
    }else voxJoin=true;
  }
  if(voxOpen&&!quiet){_voxAnchor={pos,at};if(voxSettings.click&&pos%4===0)voxClick(at,pos%16===0);} // CLICK: a beat to sing to (only you hear it)
  if(seqMode==='pattern'){voxPos++;if(!voxRec&&voxPos>=voxLoopLen())voxPos=0;}
}
function voxOnStart(){
  voxStopAll();voxJoin=true;voxPos=0;voxLastPos=-1;_voxAnchor=null;
  if(voxOpen&&musicHas('mt_vocals')){const from=voxPlayFrom!=null?voxPlayFrom:vocals.start;if(from>0)voxSeek(from);}
  voxPlayFrom=null;
  if(voxOpen)voxFollowT=0;
}
function voxOnStop(){
  if(voxRec&&!voxRec.cal)voxStopRecording();
  voxStopAll();_voxAnchor=null;voxLastPos=-1;
  if(voxOpen)voxPaintPh(null);
  if(typeof voxIdleVocoders==='function')setTimeout(voxIdleVocoders,1500);
}
function voxIsRecording(){return !!(voxRec&&!voxRec.cal);}
// EFFECTS window preview: a couple of seconds of the layer's first take
let _voxAud=0;
async function voxAudition(li){
  const L=vocals.layers[li];const c=L&&L.clips.find(x=>voxBuf.has(x.t));
  if(!c){showToast('🎤 Record something on '+voxLayerName(li)+' to hear its effects');return;}
  const my=++_voxAud;
  // vocal effects that re-work the take: wait for it (only the newest preview plays)
  const p=typeof voxVoiceParams==='function'&&voxVoiceParams(li);
  if(p){const k=_voxKey(c.t,p),e=voxProc.get(k);if(!e||!e.buf){showToast('🎯 Processing…');await voxEnqueue(c.t,p,k);if(my!==_voxAud)return;}}
  voxActive.filter(a=>a.aud).forEach(a=>{try{a.src.stop();}catch(e){}});
  const ctx=getCtx();voxRoute(li);
  // play it even if the layer is muted / not soloed, then put the layer level back
  const g=voxIn(li);g.gain.cancelScheduledValues(ctx.currentTime);g.gain.setValueAtTime(L.vol==null?1:L.vol,ctx.currentTime);g._v=-1;
  voxPlayClip(c,li,ctx.currentTime+.03,0,2.5);const last=voxActive[voxActive.length-1];if(last)last.aud=true;
  if(typeof voxAuditionCarrier==='function')voxAuditionCarrier(li,ctx.currentTime+.03,2.5);
  setTimeout(()=>{if(my===_voxAud){voxRoute(li);if(typeof voxIdleVocoders==='function')voxIdleVocoders();}},2700);
}

// ══════════════════════════════════════════════
//  TAKE STORAGE (IndexedDB) + audio buffers
// ══════════════════════════════════════════════
const VOX_DB=(typeof TEST_MODE!=='undefined'&&TEST_MODE)?'alienbuddies_vocals_test':'alienbuddies_vocals';
const voxBuf=new Map(),voxPeaks=new Map(),_voxLoading=new Map(),voxMissing=new Set();
let _voxDbP=null;
function voxDb(){
  if(_voxDbP)return _voxDbP;
  _voxDbP=new Promise((res,rej)=>{
    if(!window.indexedDB){rej(new Error('this browser has no storage for recordings'));return;}
    const r=indexedDB.open(VOX_DB,1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('takes'))r.result.createObjectStore('takes',{keyPath:'id'});};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('storage blocked'));
  });
  _voxDbP.catch(()=>{_voxDbP=null;});
  return _voxDbP;
}
function voxTx(mode,fn){
  return voxDb().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction('takes',mode),st=tx.objectStore('takes');let out;
    const r=fn(st);if(r)r.onsuccess=()=>{out=r.result;};
    tx.oncomplete=()=>res(out);tx.onerror=tx.onabort=()=>rej(tx.error||new Error('storage error'));
  }));
}
function voxMakeBuffer(f32,sr){
  let b;try{b=new AudioBuffer({length:f32.length,sampleRate:sr,numberOfChannels:1});}catch(e){b=getCtx().createBuffer(1,f32.length,sr);}
  if(b.copyToChannel)b.copyToChannel(f32,0);else b.getChannelData(0).set(f32);
  return b;
}
const VOX_PEAK_BIN=256;
function voxMakePeaks(f32){const n=Math.ceil(f32.length/VOX_PEAK_BIN),p=new Float32Array(n);for(let i=0;i<n;i++){let m=0;const e=Math.min(f32.length,(i+1)*VOX_PEAK_BIN);for(let k=i*VOX_PEAK_BIN;k<e;k++){const a=f32[k]<0?-f32[k]:f32[k];if(a>m)m=a;}p[i]=m;}return p;}
function voxAddTakeToMemory(id,f32,sr){voxBuf.set(id,voxMakeBuffer(f32,sr));voxPeaks.set(id,{p:voxMakePeaks(f32),sr});voxMissing.delete(id);}
function voxLoadTake(id){
  if(voxBuf.has(id))return Promise.resolve(true);
  if(_voxLoading.has(id))return _voxLoading.get(id);
  const p=voxTx('readonly',st=>st.get(id)).then(rec=>{
    if(!rec||!rec.pcm){voxMissing.add(id);return false;}
    const i16=new Int16Array(rec.pcm),f=new Float32Array(i16.length);for(let i=0;i<i16.length;i++)f[i]=i16[i]/32768;
    voxAddTakeToMemory(id,f,rec.sr);return true;
  }).catch(()=>{voxMissing.add(id);return false;}).finally(()=>_voxLoading.delete(id));
  _voxLoading.set(id,p);return p;
}
function voxEnsureAll(){
  const ids=new Set();vocals.layers.forEach(L=>L.clips.forEach(c=>{if(!voxBuf.has(c.t))ids.add(c.t);}));
  if(!ids.size)return Promise.resolve();
  return Promise.all([...ids].map(voxLoadTake)).then(()=>{if(voxOpen)voxRender();});
}
function voxSaveTake(id,f32,sr){
  const i16=new Int16Array(f32.length);for(let i=0;i<f32.length;i++){const s=Math.max(-1,Math.min(1,f32[i]));i16[i]=s<0?s*32768:s*32767;}
  return voxTx('readwrite',st=>st.put({id,sr,n:f32.length,pcm:i16.buffer,ts:Date.now()}));
}
// removes takes no save slot uses any more (a take recorded in the last hour is always kept, in case it isn't saved yet)
function voxGC(){
  if(!window.indexedDB)return;
  let raw='';try{(typeof SAVE_KEYS!=='undefined'?SAVE_KEYS:[]).forEach(k=>{raw+=localStorage.getItem(k)||'';});}catch(e){return;}
  const used=new Set((raw.match(/vx_[a-z0-9]+/g)||[]));vocals.layers.forEach(L=>L.clips.forEach(c=>used.add(c.t)));
  voxTx('readonly',st=>st.getAllKeys()).then(keys=>{
    const old=(keys||[]).filter(k=>{if(used.has(k))return false;const t=parseInt(String(k).slice(3,11),36);return !(Date.now()-t<3600e3);});
    if(old.length)voxTx('readwrite',st=>{old.forEach(k=>st.delete(k));return null;}).catch(()=>{});
  }).catch(()=>{});
}
// a long take is a lot of memory once decoded (about 11 MB a minute): drop takes nothing points at any more
// (not even an undo step). They stay in storage until the next clean-up, so loading the save brings them back if needed.
function voxFreeUnused(){
  const used=new Set();vocals.layers.forEach(L=>L.clips.forEach(c=>used.add(c.t)));
  voxUndo.forEach(u=>{(u.match(/vx_[a-z0-9]+/g)||[]).forEach(id=>used.add(id));});
  if(voxRec&&voxRec.li!=null)return;
  [...voxBuf.keys()].forEach(id=>{if(!used.has(id)&&!voxActive.some(a=>a.c.t===id)){voxBuf.delete(id);voxPeaks.delete(id);}});
  if(typeof voxFreeProcessed==='function')voxFreeProcessed();
}
function voxNewId(){return 'vx_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

// ══════════════════════════════════════════════
//  MICROPHONE + RECORDING
// ══════════════════════════════════════════════
// device settings (not part of a save: they belong to this phone / computer)
const voxSettings=(function(){let s={};try{s=JSON.parse(localStorage.getItem('ab2_voxSet')||'{}')||{};}catch(e){}
  return Object.assign({lat:null,nudge:0,countIn:true,monitor:false,click:false,device:''},s);})();
const VOX_MAX_TAKE=360; // seconds
function voxSaveSettings(){try{localStorage.setItem('ab2_voxSet',JSON.stringify(voxSettings));}catch(e){}}
// how late a recording lands compared with the beat you heard (speaker delay + mic delay), in seconds
function voxLatencyEst(){const c=audioCtx;return c?(c.outputLatency||0)+(c.baseLatency||0)+.012:.03;}
function voxLatency(){return (voxSettings.lat!=null?voxSettings.lat:voxLatencyEst())+(voxSettings.nudge||0)/1000;}
let voxMic=null,voxRec=null;
const VOX_WORKLET='class VoxCap extends AudioWorkletProcessor{constructor(){super();this.on=false;this.b=new Float32Array(2048);this.n=0;this.t=0;'+
  'this.port.onmessage=e=>{if(e.data==="on"){this.on=true;this.n=0;}else if(e.data==="off"){this.flush();this.on=false;this.port.postMessage("done");}};}'+
  'flush(){if(this.n){const d=this.b.slice(0,this.n);this.port.postMessage({t:this.t,d:d},[d.buffer]);this.n=0;}}'+
  'process(ins){if(!this.on)return true;const i=ins[0]&&ins[0][0];const len=i?i.length:128;if(this.n===0)this.t=currentFrame/sampleRate;'+
  'for(let k=0;k<len;k++)this.b[this.n++]=i?i[k]:0;if(this.n+128>this.b.length)this.flush();return true;}}registerProcessor("vox-cap",VoxCap);';
async function voxMakeCapture(c,src){
  const sink=c.createGain();sink.gain.value=0;sink.connect(c.destination);
  const cap={sink,on:false,onChunk:null,done:null};
  // AudioWorklet: exact sample timing. Older browsers fall back to a ScriptProcessor.
  if(c.audioWorklet&&window.AudioWorkletNode){
    try{
      if(!c._voxWorklet){const url=URL.createObjectURL(new Blob([VOX_WORKLET],{type:'application/javascript'}));await c.audioWorklet.addModule(url);c._voxWorklet=true;}
      const node=new AudioWorkletNode(c,'vox-cap',{numberOfInputs:1,numberOfOutputs:1,channelCount:1,channelCountMode:'explicit'});
      src.connect(node);node.connect(sink);
      node.port.onmessage=e=>{if(e.data==='done'){if(cap.done){const d=cap.done;cap.done=null;d();}}else if(cap.onChunk)cap.onChunk(e.data);};
      cap.kind='worklet';cap.node=node;
      cap.start=()=>{cap.on=true;node.port.postMessage('on');};
      cap.stop=()=>new Promise(res=>{cap.on=false;cap.done=res;node.port.postMessage('off');setTimeout(()=>{if(cap.done){cap.done=null;res();}},600);});
      return cap;
    }catch(e){console.warn('vocals: worklet capture failed, using fallback',e);}
  }
  const sp=c.createScriptProcessor(2048,1,1);src.connect(sp);sp.connect(sink);
  sp.onaudioprocess=e=>{if(!cap.on||!cap.onChunk)return;const d=e.inputBuffer.getChannelData(0).slice(0);
    cap.onChunk({t:(e.playbackTime||c.currentTime)-2*d.length/c.sampleRate,d});};
  cap.kind='script';cap.node=sp;
  cap.start=()=>{cap.on=true;};cap.stop=()=>{cap.on=false;return Promise.resolve();};
  return cap;
}
function voxMicError(e){
  const n=e&&e.name;
  if(n==='NotAllowedError'||n==='SecurityError')return '🎤 Microphone blocked. Allow the mic for this site in your browser settings, then try again.';
  if(n==='NotFoundError'||n==='OverconstrainedError')return '🎤 No microphone found. Plug one in (or pick another in ⚙ MIC) and try again.';
  if(n==='NotReadableError')return '🎤 The microphone is busy in another app.';
  return '🎤 '+((e&&e.message)||'Microphone not available');
}
async function voxMicOpen(){
  if(voxMic)return voxMic;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    throw new Error(location.protocol==='https:'||/^(localhost|127\.)/.test(location.hostname)?'This browser can\'t use a microphone':'The microphone only works on the https:// version of the site');
  }
  const c=getCtx();
  const base={echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1};
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:voxSettings.device?Object.assign({deviceId:{exact:voxSettings.device}},base):base});}
  catch(e){
    if(voxSettings.device&&(e.name==='NotFoundError'||e.name==='OverconstrainedError')){voxSettings.device='';voxSaveSettings();stream=await navigator.mediaDevices.getUserMedia({audio:base});}
    else throw e;
  }
  if(c.state!=='running'){try{await c.resume();}catch(e){}}
  const src=c.createMediaStreamSource(stream);
  const an=c.createAnalyser();an.fftSize=1024;src.connect(an);
  const mon=c.createGain();mon.gain.value=0;src.connect(mon);
  const cap=await voxMakeCapture(c,src);
  voxMic={stream,src,an,mon,cap,c,monTo:null};
  const tr=stream.getAudioTracks()[0];
  if(tr){tr.onended=()=>{if(voxMic&&voxMic.stream===stream){if(voxRec)voxStopRecording();voxMicClose();showToast('🎤 The microphone was disconnected');}};
    try{const s=tr.getSettings&&tr.getSettings();if(s&&s.deviceId)voxMic.deviceId=s.deviceId;voxMic.label=tr.label||'';}catch(e){}}
  voxApplyMonitor();
  return voxMic;
}
function voxMicClose(){
  if(!voxMic)return;
  try{voxMic.stream.getTracks().forEach(t=>t.stop());}catch(e){}
  try{voxMic.src.disconnect();voxMic.mon.disconnect();voxMic.cap.node.disconnect();voxMic.cap.sink.disconnect();}catch(e){}
  voxMic=null;voxPaintMeter(0);
}
// HEAR YOURSELF: the mic goes live through the armed layer's effects (headphones only, or it howls)
function voxApplyMonitor(){
  if(!voxMic)return;
  const want=voxSettings.monitor&&voxOpen;
  // straight into the armed layer's vocoder / effects, past its volume (which is silent while that layer records)
  let tgt=null;if(want){voxIn(vocals.arm);tgt=voxNodes().tgt[vocals.arm]||null;}
  if(voxMic.monTo!==tgt){try{voxMic.mon.disconnect();}catch(e){}if(tgt)voxMic.mon.connect(tgt);voxMic.monTo=tgt;}
  voxMic.mon.gain.setTargetAtTime(want?1:0,voxMic.c.currentTime,.02);
}
function voxClick(t,accent){
  const c=getCtx(),o=c.createOscillator(),g=c.createGain();
  o.type='square';o.frequency.value=accent?2000:1400;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(accent?.5:.32,t+.002);g.gain.exponentialRampToValueAtTime(.001,t+.05);
  o.connect(g);g.connect(drumMasterReal);o.start(t);o.stop(t+.06);
}
async function voxRecord(){
  if(voxRec)return;
  const li=Math.min(vocals.arm,voxLayerCount()-1);
  try{await voxMicOpen();}catch(e){showToast(voxMicError(e));return;}
  if(seqPlaying)stopSeq();
  const c=getCtx(),rec={li,state:'count',chunks:[],start:vocals.start,ts:Date.now()};
  voxRec=rec;voxMic.cap.onChunk=d=>{if(voxRec===rec)rec.chunks.push(d);};voxMic.cap.start();
  voxRouteAll();voxPaintRec();
  const go=()=>{
    if(voxRec!==rec)return;
    rec.state='armed';startSeq();
    if(!seqPlaying){voxStopRecording(true);}
  };
  if(rec.start>=16){voxPlayFrom=rec.start-16;go();} // one bar of the song plays first, so you can come in on time
  else if(voxSettings.countIn){
    const beat=60/seqBpm,T=c.currentTime+.12;
    for(let k=0;k<4;k++)voxClick(T+k*beat,k===0);
    rec.countEnd=T+4*beat;
    setTimeout(go,Math.max(0,(T+4*beat-c.currentTime)*1000-60));
  }else go();
}
function voxAssemble(chunks){
  if(!chunks.length)return null;
  const sr=voxMic?voxMic.c.sampleRate:(audioCtx?audioCtx.sampleRate:44100),t0=chunks[0].t;
  const last=chunks[chunks.length-1];const n=Math.round((last.t-t0)*sr)+last.d.length;
  if(!(n>0)||n>sr*60*12)return null;
  const f=new Float32Array(n);chunks.forEach(ch=>{let i=Math.round((ch.t-t0)*sr);if(i<0)i=0;f.set(ch.d.subarray(0,Math.max(0,Math.min(ch.d.length,n-i))),i);});
  return{f,sr,t0};
}
async function voxStopRecording(discard){
  const rec=voxRec;if(!rec||rec.stopping)return;rec.stopping=true;
  if(voxMic){await voxMic.cap.stop();voxMic.cap.onChunk=null;}
  voxRec=null;voxRouteAll();voxPaintRec();
  if(discard||rec.state!=='rec'||rec.T==null){if(!discard&&rec.state!=='rec')showToast('🎤 Recording cancelled');if(voxOpen)voxRender();return;}
  const A=voxAssemble(rec.chunks);if(!A){showToast('🎤 Nothing was recorded');if(voxOpen)voxRender();return;}
  const sd=voxSd(),lat=voxLatency();
  let o=(rec.T-A.t0)+lat,s=rec.pos0;
  let d=A.f.length/A.sr-o;
  if(rec.endAt)d=Math.min(d,rec.endAt-rec.T);
  if(o<0){s+= -o/sd;d+=o;o=0;}
  if(rec.start>s){const cut=(rec.start-s)*sd;o+=cut;d-=cut;s=rec.start;} // the lead-in bar stays in the take: drag the left edge to get it back
  if(!(d>.25)){showToast('🎤 Take too short: keep REC going a little longer');if(voxOpen)voxRender();return;}
  const id=voxNewId();
  voxAddTakeToMemory(id,A.f,A.sr);
  voxPushUndo();
  const L=voxLayer(rec.li),clip={t:id,s,o,d};voxPlace(L,clip);voxSel={li:rec.li,clip};
  if(voxOpen)voxRender();
  autoSave();
  voxSaveTake(id,A.f,A.sr).then(()=>{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});})
    .catch(e=>{showToast('⚠ Couldn\'t store the take on this device ('+((e&&e.name)||'storage full')+'). It will play until you close the game.');});
  showToast('🎤 Take saved on '+voxLayerName(rec.li));
}
// AUTO SYNC: plays clicks through the speaker and listens for them, to measure how late recordings land on this device
async function voxAutoSync(){
  try{await voxMicOpen();}catch(e){showToast(voxMicError(e));return null;}
  if(voxRec)return null;
  if(seqPlaying)stopSeq();
  const c=getCtx(),rec={cal:true,chunks:[]};voxRec=rec;
  const wasMon=voxSettings.monitor;voxSettings.monitor=false;voxApplyMonitor();
  voxMic.cap.onChunk=d=>{rec.chunks.push(d);};voxMic.cap.start();
  const T=c.currentTime+.35,N=8,gap=.45,times=[];
  for(let k=0;k<N;k++){times.push(T+k*gap);voxClick(T+k*gap,true);}
  await new Promise(r=>setTimeout(r,(T+N*gap+.35-c.currentTime)*1000));
  await voxMic.cap.stop();voxMic.cap.onChunk=null;voxRec=null;voxSettings.monitor=wasMon;voxApplyMonitor();
  const A=voxAssemble(rec.chunks);if(!A)return null;
  const lats=[];
  times.forEach(tc=>{
    const i0=Math.round((tc-A.t0)*A.sr),i1=Math.min(A.f.length,i0+Math.round(.4*A.sr));if(i0<0||i1<=i0)return;
    let mx=0;for(let i=i0;i<i1;i++){const a=Math.abs(A.f[i]);if(a>mx)mx=a;}
    let fl=0,fn=0;for(let i=Math.max(0,i0-Math.round(.06*A.sr));i<i0;i++){fl+=Math.abs(A.f[i]);fn++;}fl=fn?fl/fn:0;
    if(mx<.01||mx<fl*8)return;
    const th=Math.max(mx*.3,fl*5);
    for(let i=i0;i<i1;i++)if(Math.abs(A.f[i])>=th){lats.push((A.t0+i/A.sr)-tc);break;}
  });
  if(lats.length<5)return null;
  lats.sort((a,b)=>a-b);const med=lats[lats.length>>1];
  if(lats[lats.length-2]-lats[1]>.02)return null; // too scattered to trust
  voxSettings.lat=Math.max(0,Math.min(.6,med));voxSaveSettings();
  return voxSettings.lat;
}

// ══════════════════════════════════════════════
//  EDITING (all non-destructive: clips only point at parts of takes)
// ══════════════════════════════════════════════
let voxSel=null;const voxUndo=[];
function voxPushUndo(){voxUndo.push(JSON.stringify(vocals.layers));if(voxUndo.length>40)voxUndo.shift();}
function voxDoUndo(){
  if(!voxUndo.length){showToast('Nothing to undo');return;}
  vocals.layers=voxSanitize({layers:JSON.parse(voxUndo.pop())}).layers;voxSel=null;voxStopAll();
  voxRender();autoSave();
}
// put a clip on a layer: whatever it lands on gets trimmed away underneath it (newest on top, like recording over tape)
function voxPlace(L,nc){
  const sd=voxSd(),a=nc.s,b=voxClipEnd(nc),out=[];
  L.clips.forEach(c=>{
    if(c===nc)return;
    const cs=c.s,ce=voxClipEnd(c);
    if(ce<=a+1e-6||cs>=b-1e-6){out.push(c);return;}
    if(cs<a-1e-6){const d=(a-cs)*sd;if(d>.03)out.push(Object.assign({},c,{d}));}
    if(ce>b+1e-6){const cut=(b-cs)*sd,d=c.d-cut;if(d>.03)out.push(Object.assign({},c,{s:b,o:c.o+cut,d}));}
  });
  out.push(nc);out.sort((x,y)=>x.s-y.s);L.clips=out;
}
function voxSplit(li,c,p){
  const L=vocals.layers[li];if(!L)return false;
  const e=voxClipEnd(c);if(!(p>c.s+.05&&p<e-.05))return false;
  const sd=voxSd(),cut=(p-c.s)*sd;
  const left=Object.assign({},c,{d:cut}),right=Object.assign({},c,{s:p,o:c.o+cut,d:c.d-cut});
  const i=L.clips.indexOf(c);if(i<0)return false;
  L.clips.splice(i,1,left,right);voxSel={li,clip:right};return true;
}
let voxSnap=4,voxPps=0;
try{const r=localStorage.getItem('ab2_voxSnap');const v=+r;if(r!==null&&VOX_SNAPS.some(x=>x[0]===v))voxSnap=v;}catch(e){}
try{const v=+localStorage.getItem('ab2_voxZoom');if(v>=.5&&v<=32)voxPps=v;}catch(e){}
function voxZoom(){return voxPps||(IS_DESKTOP?5:3.5);}
function voxSnapV(v){return voxSnap?Math.round(v/voxSnap)*voxSnap:Math.round(v*16)/16;}

// ══════════════════════════════════════════════
//  UI
// ══════════════════════════════════════════════
const _vx=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};
const seqVoxBtn=_vx('button','seq-mode-pill','VOX');seqVoxBtn.id='seqVoxBtn';
seqVoxBtn.style.cssText='border:1px solid #2a2a4a;border-radius:4px;padding:.12rem .4rem;display:none;';
(function(){const r=document.getElementById('seqRollBtn')||document.getElementById('seqLevelAdjBtn');if(r&&r.parentNode)r.parentNode.insertBefore(seqVoxBtn,r.nextSibling);})();
const voxView=_vx('div','vox-view');voxView.id='voxView';
(function(){const a=document.getElementById('seqArea'),pv=document.getElementById('seqPatternView');if(a)a.insertBefore(voxView,pv||null);})();
const voxBar=_vx('div','vox-bar'),voxSelBar=_vx('div','vox-selbar'),voxScroll=_vx('div','vox-scroll'),voxFoot=_vx('div','vox-foot');
voxView.appendChild(voxBar);voxView.appendChild(voxSelBar);voxView.appendChild(voxScroll);voxView.appendChild(voxFoot);
const voxHeads=_vx('div','vox-heads'),voxTl=_vx('div','vox-tl');voxScroll.appendChild(voxHeads);voxScroll.appendChild(voxTl);
const voxInner=_vx('div','vox-inner');voxTl.appendChild(voxInner);
const voxRuler=_vx('div','vox-ruler'),voxLanes=_vx('div','vox-lanes'),voxPh=_vx('div','vox-ph'),voxFlag=_vx('div','vox-flag'),voxEnd=_vx('div','vox-end'),voxPast=_vx('div','vox-past');
[voxRuler,voxLanes,voxPast,voxEnd,voxFlag,voxPh].forEach(e=>voxInner.appendChild(e));
const voxMeter=_vx('div','vox-meter'),voxMeterFill=_vx('div','vox-meter-fill'),voxFootTxt=_vx('span','vox-foot-txt');
voxMeter.appendChild(voxMeterFill);voxFoot.appendChild(voxMeter);voxFoot.appendChild(voxFootTxt);
let voxRecBtn=null,voxLiveClip=null;
const VOX_LH=()=>IS_DESKTOP?46:50;

function voxShow(on){
  on=!!on&&musicHas('mt_vocals');
  if(on===voxOpen){if(on)voxRender();return;}
  if(on){
    if(typeof rollView!=='undefined'&&rollView>=0&&typeof showRoll==='function')showRoll(-1);
  }else{
    if(voxRec)voxStopRecording();
    voxMicClose();
  }
  voxOpen=on;
  document.body.classList.toggle('vox-on',on);
  document.body.classList.toggle('vox-full',on); // full screen on every device: a timeline needs the width
  seqVoxBtn.classList.toggle('active',on);
  if(on){voxBuildBar();voxRender();voxEnsureAll();voxScrollToFlag();voxLoop();}
  else{voxSel=null;voxApplyMonitor();}
  if(seqPlaying){stopSeq();} // the play position means something different in here (it starts at the flag)
}
seqVoxBtn.addEventListener('click',e=>{e.stopPropagation();getCtx();voxShow(!voxOpen);});
addEventListener('resize',()=>{if(voxOpen)voxRender();});
// opening the piano roll closes the vocals (they share the space)
if(typeof showRoll==='function'){const _sr=showRoll;showRoll=function(i){if(i>=0&&voxOpen)voxShow(false);return _sr(i);};}

function voxChip(txt,cls,title,fn){const b=_vx('button','roll-chip'+(cls?' '+cls:''),txt);if(title)b.title=title;if(fn)b.addEventListener('click',e=>{e.stopPropagation();fn(e);});return b;}
function voxBuildBar(){
  voxBar.innerHTML='';
  voxBar.appendChild(_vx('span','vox-title','🎤 VOCALS'));
  voxRecBtn=voxChip('● REC','vox-rec','Record on the armed layer (from the green flag)',()=>{if(voxRec&&!voxRec.cal){if(seqPlaying)stopSeq();else voxStopRecording();}else voxRecord();});
  voxBar.appendChild(voxRecBtn);
  voxBar.appendChild(voxChip('↶','','Undo',voxDoUndo));
  const sn=_vx('div','roll-snaps');sn.appendChild(_vx('span','roll-snap-lbl','SNAP'));
  VOX_SNAPS.forEach(([v,t])=>sn.appendChild(voxChip(t,voxSnap===v?'on':'','Clips snap to '+(v?t.toLowerCase():'nothing'),()=>{voxSnap=v;try{localStorage.setItem('ab2_voxSnap',String(v));}catch(e){}voxBuildBar();})));
  voxBar.appendChild(sn);
  const zm=_vx('div','roll-snaps');
  zm.appendChild(voxChip('−','','Zoom out',()=>voxSetZoom(voxZoom()/1.5)));zm.appendChild(voxChip('+','','Zoom in',()=>voxSetZoom(voxZoom()*1.5)));
  voxBar.appendChild(zm);
  voxBar.appendChild(voxChip('⚙ MIC','','Microphone, sync and storage',voxOpenSettings));
  voxBar.appendChild(voxChip('✕','roll-back','Back to the sequencer',()=>voxShow(false)));
  voxPaintRec();
}
function voxSetZoom(z){
  const sc=voxTl,mid=(sc.scrollLeft+sc.clientWidth/2)/voxZoom();
  voxPps=Math.max(.5,Math.min(32,z));try{localStorage.setItem('ab2_voxZoom',String(voxPps));}catch(e){}
  voxRender();sc.scrollLeft=Math.max(0,mid*voxZoom()-sc.clientWidth/2);
}
function voxPaintRec(){
  if(!voxRecBtn)return;
  const r=voxRec&&!voxRec.cal;
  voxRecBtn.textContent=r?(voxRec.state==='count'?'● 1-2-3-4…':'■ STOP'):'● REC';
  voxRecBtn.classList.toggle('recording',!!r);
  voxView.classList.toggle('recording',!!r);
  if(!r&&voxLiveClip){voxLiveClip.remove();voxLiveClip=null;}
  voxPaintFoot();
}
function voxPaintFoot(){
  const n=voxLayerCount();
  const pend=typeof voxProcPending==='function'?voxProcPending():0;
  if(pend&&!(voxRec&&!voxRec.cal)){voxFootTxt.textContent='🎯 Processing vocal effects ('+pend+' take'+(pend>1?'s':'')+' left). The plain take plays until it\'s ready.';return;}
  if(voxRec&&!voxRec.cal){voxFootTxt.textContent=voxRec.state==='count'?'Count-in… sing on the 1 after four clicks':'Recording on '+voxLayerName(voxRec.li)+' · tap ■ STOP (or pause) when done';return;}
  if(!voxHasClips())voxFootTxt.textContent='Tap ● on a layer to arm it, drag the green flag to where you want to start, then hit REC. Headphones help!';
  else voxFootTxt.textContent=(IS_DESKTOP?'Click':'Tap')+' a take to select it, then drag to move, pull its edges to trim. ▶ plays from the green flag.'+(n<VOX_MAX_LAYERS?'':'');
}
function voxPaintMeter(v){voxMeterFill.style.width=Math.round(Math.min(1,v)*100)+'%';voxMeterFill.classList.toggle('hot',v>.92);}

// timeline length in steps: the song (or loop), the takes, the flag, plus room to keep going
function voxTlSteps(){
  let e=Math.max(voxSongLen(),voxLastEnd(),vocals.start+16)+64;
  e=Math.max(e,(voxTl.clientWidth||0)/voxZoom()); // always at least as wide as the screen
  return Math.ceil(e/16)*16;
}
function voxRender(){
  if(!voxOpen)return;
  const n=voxLayerCount(),pps=voxZoom(),lh=VOX_LH(),steps=voxTlSteps(),W=Math.round(steps*pps);
  voxView.style.setProperty('--lh',lh+'px');voxView.style.setProperty('--pps',pps+'px');
  voxInner.style.width=W+'px';
  // ruler
  voxRuler.innerHTML='';
  const barPx=16*pps,every=barPx>=28?1:barPx>=10?4:barPx>=4?8:16;
  for(let b=0;b*16<steps;b+=every){const t=_vx('span','vox-bar-n',String(b+1));t.style.left=(b*barPx)+'px';voxRuler.appendChild(t);}
  // grid lines (bars, and beats when there is room)
  const beat=4*pps>=9;
  voxLanes.style.backgroundImage='linear-gradient(90deg,#2a2a48 1px,transparent 1px)'+(beat?',linear-gradient(90deg,#16162a 1px,transparent 1px)':'');
  voxLanes.style.backgroundSize=(barPx*every)+'px 100%'+(beat?','+(4*pps)+'px 100%':'');
  // lanes + heads
  voxLanes.innerHTML='';voxHeads.innerHTML='';
  voxHeads.appendChild(_vx('div','vox-ruler-pad'));
  const solo=voxSoloOn();
  for(let li=0;li<n;li++){
    const L=voxLayer(li),col=VOX_LANE_COLORS[li];
    const h=_vx('div','vox-lh'+(vocals.arm===li?' armed':'')+(L.muted||(solo&&!L.solo)?' quiet':''));h.style.setProperty('--c',col);
    const arm=_vx('button','vox-arm','●');arm.title='Arm this layer for recording';
    arm.addEventListener('click',e=>{e.stopPropagation();if(voxRec&&!voxRec.cal)return;vocals.arm=li;voxApplyMonitor();voxRender();autoSave();});
    const nm=_vx('button','vox-nm',voxLayerName(li));nm.title='Layer volume, name, clear';nm.addEventListener('click',e=>{e.stopPropagation();voxOpenLaneMenu(li);});
    const r1=_vx('div','vox-lh-r');r1.appendChild(arm);r1.appendChild(nm);h.appendChild(r1);
    const r2=_vx('div','vox-lh-r');
    const m=_vx('button','vox-lb'+(L.muted?' m-on':''),'M');m.title='Mute';m.addEventListener('click',e=>{e.stopPropagation();L.muted=!L.muted;voxRouteAll();voxRender();autoSave();});
    const s=_vx('button','vox-lb'+(L.solo?' s-on':''),'S');s.title='Solo (only soloed vocal layers play)';s.addEventListener('click',e=>{e.stopPropagation();L.solo=!L.solo;voxRouteAll();voxRender();autoSave();});
    const fx=_vx('button','vox-lb vox-fxb','FX');fx.title='Effects for this layer';
    const fe=fxEffective(getTrackFx(FX_VOX_BASE+li,false),FX_VOX_BASE+li);
    if(fxIsActive(fe)||fxVoiceActive(fe))fx.classList.add('fx-on');
    fx.addEventListener('click',e=>{e.stopPropagation();if(typeof window.openFxChannel==='function'&&typeof FX_NODE_IDS!=='undefined'&&FX_NODE_IDS.some(musicHas))window.openFxChannel(FX_VOX_BASE+li);else showToast('✨ Unlock an effect in the skill tree (Effects hub) to use the FX rack');});
    r2.appendChild(m);r2.appendChild(s);r2.appendChild(fx);h.appendChild(r2);
    voxHeads.appendChild(h);
    const lane=_vx('div','vox-lane'+(vocals.arm===li?' armed':''));lane.dataset.li=li;lane.style.setProperty('--c',col);
    L.clips.forEach(c=>lane.appendChild(voxClipEl(c,li)));
    voxLanes.appendChild(lane);
  }
  voxPaintMarkers();voxPaintFoot();voxBuildSelBar();
  voxFreeUnused();
  if(typeof voxQueueAll==='function')voxQueueAll();
}
function voxPaintLaneFx(){
  voxHeads.querySelectorAll('.vox-fxb').forEach((b,li)=>{const fe=fxEffective(getTrackFx(FX_VOX_BASE+li,false),FX_VOX_BASE+li);b.classList.toggle('fx-on',!!fe&&(fxIsActive(fe)||fxVoiceActive(fe)));});
}
function voxClipEl(c,li){
  const sel=voxSel&&voxSel.clip===c;
  const el=_vx('div','vox-clip'+(sel?' sel':'')+(voxMissing.has(c.t)?' missing':''));
  el.style.setProperty('--c',VOX_LANE_COLORS[li]);
  el._clip=c;el._li=li;
  voxPlaceEl(el,c);
  const cv=document.createElement('canvas');el.appendChild(cv);
  el.appendChild(_vx('span','vox-clip-lbl',voxMissing.has(c.t)?'MISSING TAKE':voxFmtTime(c.d)+(c.g!=null&&c.g!==1?' · '+Math.round(c.g*100)+'%':'')));
  el.appendChild(_vx('div','vox-h l'));el.appendChild(_vx('div','vox-h r'));
  requestAnimationFrame(()=>voxDrawClip(el,c));
  return el;
}
function voxPlaceEl(el,c){const pps=voxZoom();el.style.left=(c.s*pps)+'px';el.style.width=Math.max(4,c.d/voxSd()*pps)+'px';}
function voxDrawClip(el,c){
  const cv=el.querySelector('canvas');if(!cv)return;
  const w=Math.max(4,el.clientWidth),h=Math.max(10,el.clientHeight),dpr=Math.min(2,window.devicePixelRatio||1);
  const W=Math.min(2048,Math.round(w*dpr)),H=Math.round(h*dpr);
  if(cv.width!==W)cv.width=W;if(cv.height!==H)cv.height=H;
  const x=cv.getContext('2d');x.clearRect(0,0,W,H);
  const P=voxPeaks.get(c.t);x.fillStyle=getComputedStyle(el).getPropertyValue('--c')||'#ff7ad9';x.globalAlpha=.85;
  if(!P){x.fillRect(0,H/2-1,W,2);return;}
  const g=c.g==null?1:c.g,binDur=VOX_PEAK_BIN/P.sr,mid=H/2;
  for(let i=0;i<W;i++){
    const t0=c.o+c.d*i/W,t1=c.o+c.d*(i+1)/W;let a=Math.floor(t0/binDur),b=Math.max(a+1,Math.ceil(t1/binDur));
    let m=0;for(let k=a;k<b&&k<P.p.length;k++)if(P.p[k]>m)m=P.p[k];
    const y=Math.min(1,Math.sqrt(m)*g)*mid*.9;x.fillRect(i,mid-y,1,Math.max(1,y*2));
  }
}
function voxFmtTime(s){s=Math.max(0,s);const m=Math.floor(s/60),r=s-m*60;return m?m+':'+String(Math.floor(r)).padStart(2,'0'):r.toFixed(1)+'s';}
function voxPaintMarkers(){
  const pps=voxZoom();
  voxFlag.style.left=(vocals.start*pps)+'px';
  const end=seqMode==='pattern'?(voxHasClips()?voxLoopLen():0):voxSongLen();
  voxEnd.style.display=end>0?'':'none';voxEnd.style.left=(end*pps)+'px';
  voxEnd.dataset.lbl=seqMode==='pattern'?'LOOP':'END';
  voxPast.style.display=end>0&&seqMode!=='pattern'?'':'none';voxPast.style.left=(end*pps)+'px';
}
function voxPaintPh(p){if(p==null){voxPh.style.display='none';return;}voxPh.style.display='';voxPh.style.transform='translateX('+(p*voxZoom())+'px)';}
function voxScrollToFlag(){requestAnimationFrame(()=>{voxTl.scrollLeft=Math.max(0,vocals.start*voxZoom()-40);});}
let voxFollowT=0;
voxTl.addEventListener('scroll',()=>{voxFollowT=performance.now();},{passive:true});
// the playhead, live recording clip and input meter run on animation frames while the view is open
let _voxRaf=0;
function voxLoop(){
  if(_voxRaf)return;
  const tick=()=>{
    _voxRaf=0;if(!voxOpen)return;
    const c=audioCtx;
    if(seqPlaying&&_voxAnchor&&c){
      const p=_voxAnchor.pos+Math.max(0,Math.min(1.5,(c.currentTime-_voxAnchor.at)/voxSd()));
      voxPaintPh(p);
      const x=p*voxZoom();
      if(performance.now()-voxFollowT>2500&&(x<voxTl.scrollLeft||x>voxTl.scrollLeft+voxTl.clientWidth-30)){voxTl.scrollLeft=Math.max(0,x-60);voxFollowT=performance.now()-2400;}
      if(voxRec&&voxRec.state==='rec'&&!voxRec.cal&&voxRec.T!=null){
        const lane=voxLanes.children[voxRec.li];
        if(lane){if(!voxLiveClip||voxLiveClip.parentNode!==lane){voxLiveClip=_vx('div','vox-clip live');lane.appendChild(voxLiveClip);}
          const s0=Math.max(voxRec.pos0,voxRec.start);voxLiveClip.style.left=(s0*voxZoom())+'px';voxLiveClip.style.width=Math.max(2,(p-s0)*voxZoom())+'px';}
      }
    }else if(!seqPlaying)voxPaintPh(null);
    if(voxMic&&voxMic.an){
      const a=voxMic.an,buf=voxLoop._b||(voxLoop._b=new Uint8Array(a.fftSize));a.getByteTimeDomainData(buf);
      let pk=0;for(let i=0;i<buf.length;i++){const v=Math.abs(buf[i]-128)/128;if(v>pk)pk=v;}
      voxLoop._lv=Math.max(pk,(voxLoop._lv||0)*.9);voxPaintMeter(voxLoop._lv);
    }
    _voxRaf=requestAnimationFrame(tick);
  };
  _voxRaf=requestAnimationFrame(tick);
}

// selected-clip tools
function voxBuildSelBar(){
  voxSelBar.innerHTML='';
  // the bar always keeps its height (so the timeline never jumps under your finger when a take gets selected)
  const s=voxSel;if(!s||!vocals.layers[s.li]||vocals.layers[s.li].clips.indexOf(s.clip)<0){
    voxSel=null;voxSelBar.classList.add('empty');
    voxSelBar.appendChild(_vx('span','vox-sel-hint',voxHasClips()?((IS_DESKTOP?'Click':'Tap')+' a take to split, copy, delete it or change its volume'):'Your takes will show up on the layers below'));return;}
  voxSelBar.classList.remove('empty');
  const c=s.clip;
  voxSelBar.appendChild(_vx('span','vox-sel-lbl',voxLayerName(s.li)+' · '+voxFmtTime(c.d)));
  voxSelBar.appendChild(voxChip('✂ SPLIT','','Split this take at the green flag',()=>{
    voxPushUndo();if(voxSplit(s.li,c,vocals.start)){voxRender();autoSave();}else{voxUndo.pop();showToast('Put the green flag inside the take to split it there');}}));
  voxSelBar.appendChild(voxChip('⧉ COPY','','Copy this take right after itself',()=>{
    voxPushUndo();const L=vocals.layers[s.li],e=voxClipEnd(c),cp=Object.assign({},c,{s:voxSnap?Math.ceil(e/voxSnap-1e-6)*voxSnap:e});voxPlace(L,cp);voxSel={li:s.li,clip:cp};voxRender();autoSave();}));
  voxSelBar.appendChild(voxChip('🗑 DELETE','muted','Delete this take',()=>voxDeleteSel()));
  const vw=_vx('label','vox-gain');vw.appendChild(_vx('span',null,'VOL'));
  const r=document.createElement('input');r.type='range';r.min=0;r.max=200;r.value=Math.round((c.g==null?1:c.g)*100);
  let pushed=false;
  r.addEventListener('input',()=>{if(!pushed){voxPushUndo();pushed=true;}const v=+r.value/100;if(Math.abs(v-1)<.03)delete c.g;else c.g=v;
    const el=[...voxLanes.querySelectorAll('.vox-clip')].find(x=>x._clip===c);if(el){voxDrawClip(el,c);const lb=el.querySelector('.vox-clip-lbl');if(lb)lb.textContent=voxFmtTime(c.d)+(c.g!=null?' · '+Math.round(c.g*100)+'%':'');}});
  r.addEventListener('change',()=>autoSave());
  vw.appendChild(r);voxSelBar.appendChild(vw);
  voxSelBar.appendChild(voxChip('✕','','Deselect',()=>{voxSel=null;voxRender();}));
}
function voxDeleteSel(){
  const s=voxSel;if(!s)return;const L=vocals.layers[s.li];if(!L)return;
  voxPushUndo();L.clips=L.clips.filter(x=>x!==s.clip);voxActive.filter(a=>a.c===s.clip).forEach(a=>{try{a.src.stop();}catch(e){}});
  voxSel=null;voxRender();autoSave();
}
document.addEventListener('keydown',e=>{
  if(!voxOpen||!voxSel)return;const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();voxDeleteSel();}
});

// ── pointer editing on the timeline ──
// mouse: drag a take to move it (also to another layer), drag an edge to trim, click empty space to move the flag.
// touch: tap a take to select it, then drag it; drags on anything else scroll. Tap empty space to move the flag.
function voxStepAt(clientX){const r=voxInner.getBoundingClientRect();return (clientX-r.left)/voxZoom();}
function voxLaneAt(clientY){const r=voxLanes.getBoundingClientRect();return Math.max(0,Math.min(voxLayerCount()-1,Math.floor((clientY-r.top)/VOX_LH())));}
let _vd=null;
voxRuler.addEventListener('click',e=>{voxSetFlag(voxStepAt(e.clientX));});
function voxSetFlag(st){
  vocals.start=Math.max(0,voxSnap?Math.round(st/voxSnap)*voxSnap:Math.round(st));
  voxPaintMarkers();autoSave();
  if(seqPlaying&&!voxRec){stopSeq();startSeq();}
}
voxLanes.addEventListener('pointerdown',e=>{
  if(e.button===2)return;
  const ce=e.target.closest('.vox-clip');
  if(ce&&ce.classList.contains('live'))return;
  if(ce&&ce._clip){
    const c=ce._clip,li=ce._li,sel=voxSel&&voxSel.clip===c;
    if(e.pointerType==='touch'&&!sel){_vd={kind:'tapsel',c,li,x0:e.clientX,y0:e.clientY,t0:Date.now(),id:e.pointerId};return;}
    e.preventDefault();e.stopPropagation();
    const h=e.target.closest('.vox-h');
    const kind=h?(h.classList.contains('l')?'trimL':'trimR'):'move';
    if(!sel){voxSel={li,clip:c};voxLanes.querySelectorAll('.vox-clip.sel').forEach(x=>x.classList.remove('sel'));ce.classList.add('sel');voxBuildSelBar();}
    _vd={kind,c,li,el:ce,x0:e.clientX,y0:e.clientY,st0:voxStepAt(e.clientX),orig:{s:c.s,o:c.o,d:c.d},moved:false,id:e.pointerId,lane:li};
    try{voxLanes.setPointerCapture(e.pointerId);}catch(err){}
    return;
  }
  _vd={kind:'tapflag',x0:e.clientX,y0:e.clientY,t0:Date.now(),id:e.pointerId};
});
voxLanes.addEventListener('pointermove',e=>{
  const d=_vd;if(!d||e.pointerId!==d.id||d.kind==='tapsel'||d.kind==='tapflag')return;
  if(!d.moved&&Math.abs(e.clientX-d.x0)<4&&Math.abs(e.clientY-d.y0)<4)return;
  d.moved=true;
  const c=d.c,o=d.orig,sd=voxSd(),dx=voxStepAt(e.clientX)-d.st0,buf=voxBuf.get(c.t),tl=buf?buf.duration:o.o+o.d;
  if(d.kind==='move'){
    c.s=Math.max(0,voxSnapV(o.s+dx));
    const ln=voxLaneAt(e.clientY);
    if(ln!==d.lane){d.lane=ln;const lane=voxLanes.children[ln];if(lane){lane.appendChild(d.el);d.el.style.setProperty('--c',VOX_LANE_COLORS[ln]);}}
  }else if(d.kind==='trimL'){
    let s=voxSnapV(o.s+dx);s=Math.max(o.s-o.o/sd,Math.min(s,o.s+(o.d-.05)/sd));s=Math.max(0,s);
    const dl=(s-o.s)*sd;c.s=s;c.o=o.o+dl;c.d=o.d-dl;
  }else{
    let e2=voxSnapV(o.s+o.d/sd+dx);e2=Math.max(o.s+.05/sd,Math.min(e2,o.s+(tl-o.o)/sd));
    c.d=(e2-o.s)*sd;
  }
  voxPlaceEl(d.el,c);
});
function voxPointerEnd(e){
  const d=_vd;if(!d||e.pointerId!==d.id)return;_vd=null;
  const small=Math.abs(e.clientX-d.x0)<10&&Math.abs(e.clientY-d.y0)<10;
  if(d.kind==='tapsel'){if(e.type!=='pointercancel'&&small&&Date.now()-d.t0<600){voxSel={li:d.li,clip:d.c};voxRender();}return;}
  if(d.kind==='tapflag'){if(e.type!=='pointercancel'&&small&&Date.now()-d.t0<600){if(voxSel){voxSel=null;voxRender();}voxSetFlag(voxStepAt(e.clientX));}return;}
  const c=d.c;
  if(e.type==='pointercancel'||!d.moved){Object.assign(c,d.orig);voxPlaceEl(d.el,c);if(d.lane!==d.li)voxRender();return;}
  // commit: back up the old state first, then let the clip land (and trim whatever it covers)
  const now={s:c.s,o:c.o,d:c.d};Object.assign(c,d.orig);voxPushUndo();Object.assign(c,now);
  const from=vocals.layers[d.li],to=voxLayer(d.lane);
  if(from!==to){from.clips=from.clips.filter(x=>x!==c);}
  voxPlace(to,c);voxSel={li:d.lane,clip:c};
  voxActive.filter(a=>a.c===c).forEach(a=>{try{a.src.stop();}catch(err){}});
  voxRender();autoSave();
}
voxLanes.addEventListener('pointerup',voxPointerEnd);
voxLanes.addEventListener('pointercancel',voxPointerEnd);

// ── small windows: lane menu + mic settings ──
function voxModal(id){
  let m=document.getElementById(id);
  if(!m){m=_vx('div','more-modal');m.id=id;m.addEventListener('click',e=>{if(e.target===m)m.style.display='none';});document.body.appendChild(m);}
  m.innerHTML='';const box=_vx('div','more-box');m.appendChild(box);m.style.display='flex';
  return{m,box,close:()=>{m.style.display='none';}};
}
function voxHead(M,title,color){
  const hd=_vx('div','more-head');const t=_vx('div','more-title',title);if(color)t.style.color=color;hd.appendChild(t);
  const x=_vx('button','more-x','✕');x.addEventListener('click',M.close);hd.appendChild(x);M.box.appendChild(hd);
}
function voxSlider(label,min,max,val,fmt,fn){
  const w=_vx('div','fx-slider'),lab=_vx('div','fx-sl-label'),vv=_vx('span','fx-sl-val',fmt(val));
  lab.appendChild(_vx('span',null,label));lab.appendChild(vv);
  const r=document.createElement('input');r.type='range';r.min=min;r.max=max;r.value=val;
  r.addEventListener('input',()=>{vv.textContent=fmt(+r.value);fn(+r.value);});
  w.appendChild(lab);w.appendChild(r);return w;
}
function voxOpenLaneMenu(li){
  const L=voxLayer(li),M=voxModal('voxLaneModal');voxHead(M,voxLayerName(li),VOX_LANE_COLORS[li]);
  const nm=document.createElement('input');nm.type='text';nm.maxLength=16;nm.value=L.name||'';nm.placeholder='VOX '+(li+1);nm.className='vox-name-in';
  nm.addEventListener('input',()=>{L.name=nm.value.trim();voxRender();autoSave();});
  M.box.appendChild(_vx('div','more-sub','Name'));M.box.appendChild(nm);
  M.box.appendChild(voxSlider('LAYER VOLUME',0,150,Math.round((L.vol==null?1:L.vol)*100),v=>v+'%',v=>{L.vol=v/100;voxRouteAll();autoSave();}));
  const row=_vx('div','vox-mrow');
  const clr=_vx('button','more-done','CLEAR LAYER');clr.style.borderColor='#aa3344';clr.style.color='#e0485c';
  clr.addEventListener('click',()=>{if(!L.clips.length){M.close();return;}voxPushUndo();L.clips=[];voxStopAll();voxSel=null;voxRender();autoSave();M.close();showToast('Layer cleared (↶ to undo)');});
  const done=_vx('button','more-done','DONE');done.addEventListener('click',M.close);
  row.appendChild(clr);row.appendChild(done);M.box.appendChild(row);
}
async function voxOpenSettings(){
  const M=voxModal('voxSetModal');voxHead(M,'🎤 MIC & SYNC');
  const body=_vx('div','vox-set');M.box.appendChild(body);
  const sec=(t)=>{const h=_vx('div','fx-group',t);body.appendChild(h);};
  // microphone
  sec('MICROPHONE');
  const st=_vx('div','more-sub',voxMic?'🟢 On'+(voxMic.label?': '+voxMic.label:''):'⚪ Off (it turns on when you record)');body.appendChild(st);
  const devRow=_vx('div','vox-mrow');body.appendChild(devRow);
  const fillDevices=async()=>{
    devRow.innerHTML='';
    let devs=[];try{devs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput');}catch(e){}
    if(devs.length>1||(devs[0]&&devs[0].label)){
      const sel=document.createElement('select');sel.className='roll-select';
      const o0=document.createElement('option');o0.value='';o0.textContent='Default microphone';sel.appendChild(o0);
      devs.forEach((d,i)=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||('Microphone '+(i+1));sel.appendChild(o);});
      sel.value=voxSettings.device||'';
      sel.addEventListener('change',async()=>{voxSettings.device=sel.value;voxSaveSettings();voxMicClose();try{await voxMicOpen();st.textContent='🟢 On'+(voxMic.label?': '+voxMic.label:'');}catch(e){showToast(voxMicError(e));}});
      devRow.appendChild(sel);
    }
    if(!voxMic){const b=_vx('button','roll-chip on','TURN MIC ON');b.addEventListener('click',async()=>{try{await voxMicOpen();st.textContent='🟢 On'+(voxMic.label?': '+voxMic.label:'');fillDevices();}catch(e){showToast(voxMicError(e));}});devRow.appendChild(b);}
  };
  fillDevices();
  const mon=_vx('button','roll-chip'+(voxSettings.monitor?' on':''),voxSettings.monitor?'HEAR YOURSELF: ON':'HEAR YOURSELF: OFF');
  mon.addEventListener('click',()=>{voxSettings.monitor=!voxSettings.monitor;voxSaveSettings();voxApplyMonitor();mon.classList.toggle('on',voxSettings.monitor);mon.textContent=voxSettings.monitor?'HEAR YOURSELF: ON':'HEAR YOURSELF: OFF';
    if(voxSettings.monitor)showToast('🎧 Use headphones, or the speaker will feed back into the mic');});
  const ci=_vx('button','roll-chip'+(voxSettings.countIn?' on':''),voxSettings.countIn?'COUNT-IN: ON':'COUNT-IN: OFF');
  ci.addEventListener('click',()=>{voxSettings.countIn=!voxSettings.countIn;voxSaveSettings();ci.classList.toggle('on',voxSettings.countIn);ci.textContent=voxSettings.countIn?'COUNT-IN: ON':'COUNT-IN: OFF';});
  const ck=_vx('button','roll-chip'+(voxSettings.click?' on':''),voxSettings.click?'CLICK: ON':'CLICK: OFF');
  ck.addEventListener('click',()=>{voxSettings.click=!voxSettings.click;voxSaveSettings();ck.classList.toggle('on',voxSettings.click);ck.textContent=voxSettings.click?'CLICK: ON':'CLICK: OFF';});
  const r2=_vx('div','vox-mrow');r2.appendChild(mon);r2.appendChild(ci);r2.appendChild(ck);body.appendChild(r2);
  body.appendChild(_vx('div','fx-note','HEAR YOURSELF plays your mic live through the armed layer\'s effects. COUNT-IN clicks 4 beats first when you record from the very start (from later in the song, the bar before the flag plays instead). CLICK ticks on every beat while VOX is open; it isn\'t in exports (use headphones so the mic doesn\'t catch it).'));
  // sync
  sec('SYNC');
  const syncTxt=_vx('div','more-sub');body.appendChild(syncTxt);
  const paintSync=()=>{syncTxt.textContent='Takes are moved '+Math.round(voxLatency()*1000)+' ms earlier to line up with the beat'+(voxSettings.lat==null?' (estimated: run AUTO SYNC for this device)':' (measured)')+'.';};
  paintSync();
  const as=_vx('button','roll-chip on','AUTO SYNC');
  as.addEventListener('click',async()=>{as.disabled=true;as.textContent='LISTENING…';const r=await voxAutoSync();as.disabled=false;as.textContent='AUTO SYNC';
    if(r==null)showToast('🎤 Couldn\'t hear the clicks clearly. Unplug headphones, turn the volume up, stay quiet, and try again.');else showToast('✅ Synced: '+Math.round(r*1000)+' ms');paintSync();});
  const r3=_vx('div','vox-mrow');r3.appendChild(as);body.appendChild(r3);
  body.appendChild(_vx('div','fx-note','AUTO SYNC plays 8 clicks through the speaker and listens for them. If your takes still sound early or late, nudge them here.'));
  body.appendChild(voxSlider('NUDGE',-200,200,voxSettings.nudge||0,v=>(v>0?'+':'')+v+' ms',v=>{voxSettings.nudge=v;voxSaveSettings();paintSync();}));
  // storage
  sec('STORAGE');
  const sto=_vx('div','more-sub','Recordings stay on this device only.');body.appendChild(sto);
  try{if(navigator.storage&&navigator.storage.estimate){const est=await navigator.storage.estimate();const mb=x=>(x/1048576).toFixed(x<1048576*10?1:0)+' MB';
    sto.textContent='Recordings stay on this device only. Used: '+mb(est.usage||0)+(est.quota?' of about '+mb(est.quota):'')+'.';}}catch(e){}
  body.appendChild(_vx('div','fx-note','On iPhone the music can get quieter while the mic is on. That\'s iOS: it goes back to normal when you close VOCALS. Headphones with a mic work too.'));
  const done=_vx('button','more-done','DONE');done.addEventListener('click',M.close);M.box.appendChild(done);
}

// called on load / unlock
function refreshVoxUI(){
  const owned=voxLayerCount()>0;
  seqVoxBtn.style.display=owned?'':'none';
  if(!owned&&voxOpen)voxShow(false);
  else if(voxOpen)voxRender();
  if(vocals.arm>=Math.max(1,voxLayerCount()))vocals.arm=0;
}
// leaving the game (home screen / closing the tab) stops recording and turns the mic off
document.addEventListener('visibilitychange',()=>{if(document.hidden&&voxRec&&!voxRec.cal){if(seqPlaying)stopSeq();else voxStopRecording();}});
addEventListener('pagehide',()=>{if(voxRec&&!voxRec.cal)voxStopRecording();voxMicClose();});
if(typeof goToHomeScreen==='function'){const _gh=goToHomeScreen;goToHomeScreen=function(){if(voxOpen)voxShow(false);voxMicClose();return _gh.apply(this,arguments);};}
setTimeout(voxGC,8000);
refreshVoxUI();

// export: vocals as hits the WAV renderer can play (cut off at the end of the song)
function voxHits(totalSteps){
  const out=[];const n=voxLayerCount();if(!n)return out;
  const sd=voxSd(),solo=voxSoloOn();
  vocals.layers.forEach((L,li)=>{if(li>=n||!voxAudible(L,li,solo))return;
    L.clips.forEach(c=>{if(c.s<totalSteps&&voxBuf.has(c.t))out.push({vox:true,time:c.s*sd,clip:c,li,maxDur:(totalSteps-c.s)*sd});});});
  return out;
}
