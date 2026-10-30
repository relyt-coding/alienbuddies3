
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

// ══════════════════════════════════════════════
//  WHAT TO RENDER
// ══════════════════════════════════════════════
// A hit is one thing to play: a step {time, soundId, vel, ch}, a piano roll note {time, soundId, midi, dur, vel, layer}
// or a vocal take {vox, time, clip, li, maxDur}.
// bars = the start time of every 16 steps (tremolo / auto-pan restart there, just like when the sequencer plays).
// Everything goes through the real sound engine, so the file has the same effects, key, velocity and instruments you hear.

// piano roll notes → hits with an exact pitch (midi), length (dur, seconds) and velocity
function rollHits(roll,offset,maxSteps){
  const out=[];
  if(!roll||!roll.layers||typeof musicHas!=='function'||!musicHas('mt_piano'))return out;
  const sd=60/seqBpm/4,n=pianoRollLayers();
  roll.layers.forEach((L,li)=>{
    if(li>=n||!L||L.muted||!L.soundId)return;
    L.notes.forEach(nt=>{if(nt.s<maxSteps)out.push({time:offset+nt.s*sd,soundId:L.soundId,midi:nt.m,dur:nt.l*sd,vel:nt.v==null?1:nt.v,layer:li});});
  });
  return out;
}
const _vel=(l,i)=>(l.vols&&l.vols[i]!=null)?l.vols[i]/100:1;
function _barsFor(offset,steps,sd,out){for(let s=0;s<steps;s+=16)out.push(offset+s*sd);}
function buildPatternHits(layers){
  const sd=60/seqBpm/4,hits=[],bars=[];
  const live=layers===seqLayers;
  // with vocals, the loop repeats for as long as the vocal takes run (like it does when you press play)
  const vox=live&&((typeof voxHasClips==='function'&&voxHasClips())||(typeof autoHasLanes==='function'&&autoHasLanes()));
  const total=vox?voxLoopLen():STEPS,reps=Math.round(total/STEPS);
  const solo=live&&seqLayers.some(x=>x.solo);
  for(let r=0;r<reps;r++){
    const off=r*STEPS*sd;
    layers.forEach((l,ch)=>{
      if(live?!layerAudible(l):l.muted)return; // the editor follows mute + solo, like playback
      l.steps.slice(0,STEPS).forEach((on,i)=>{if(on)hits.push({time:off+i*sd,soundId:l.soundId,vel:_vel(l,i),ch});});
    });
    if(live&&!solo&&typeof pianoRoll!=='undefined')hits.push(...rollHits(pianoRoll,off,STEPS));
  }
  if(vox&&typeof voxHits==='function')hits.push(...voxHits(total));
  _barsFor(0,total,sd,bars);
  return{hits,duration:total*sd,bars};
}
// vocal takes on top of an arrangement / song (cut off where the song ends)
function _withVox(res){
  if(typeof voxHits!=='function'||!res.duration)return res;
  res.hits.push(...voxHits(Math.round(res.duration/(60/seqBpm/4))));
  return res;
}

function buildArrangementHits(arr){
  if(!arr)return{hits:[],duration:0,bars:[]};
  const sd=60/seqBpm/4,hits=[],bars=[];let cursor=0;
  for(let bar=0;bar<arr.bars;bar++){
    const pat=arr.arrangement[bar]!=null?savedPatterns[arr.arrangement[bar]]:null;
    const len=patLen(pat);
    if(pat)pat.layers.forEach((l,ch)=>{if(l.muted)return;l.steps.forEach((on,i)=>{if(on&&i<len)hits.push({time:cursor+i*sd,soundId:l.soundId,vel:_vel(l,i),ch});});});
    if(pat&&pat.roll)hits.push(...rollHits(pat.roll,cursor,len));
    _barsFor(cursor,len,sd,bars);
    cursor+=len*sd;
  }
  return{hits,duration:cursor,bars};
}

function buildSongHits(){
  if(!songSlots.length)return{hits:[],duration:0,bars:[]};
  const hits=[],bars=[];let cursor=0;
  songSlots.forEach(slot=>{
    const arr=savedArrangements[slot.arrIdx];if(!arr)return;
    const r=buildArrangementHits(arr);
    r.hits.forEach(h=>hits.push(Object.assign({},h,{time:cursor+h.time})));
    r.bars.forEach(b=>bars.push(cursor+b));
    cursor+=r.duration;
  });
  return{hits,duration:cursor,bars};
}

// ══════════════════════════════════════════════
//  RENDER (offline, through the live engine)
// ══════════════════════════════════════════════
// The game's audio globals are switched to an OfflineAudioContext just long enough to queue every note
// (synchronous, so nothing else can sneak in), then switched straight back. The offline context then renders on its own.
const WAV_LEAD=.02; // a tiny bit of silence at the start so the first hit isn't clipped
function renderOffline(res){
  const SR=44100,tail=3,total=res.duration+tail+WAV_LEAD;
  // older iPhones (iOS 14.4 and below) only have the prefixed version
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!OAC)return Promise.reject(new Error('this browser cannot render audio files'));
  const off=new OAC(2,Math.ceil(total*SR),SR);
  // ── save the live engine ──
  const live={audioCtx,masterGainNode,ambGain,drumMasterGain,drumMasterReal,rvbNode,rvbGainNode,rvbReal,_lim,_masterSig,masterVol,
    voxN:typeof _voxN!=='undefined'?_voxN:null,
    buses:Object.assign({},_fxBuses),revs:Object.assign({},_fxRevs),mstages:Object.assign({},_masterStages)};
  const clear=o=>{for(const k in o)delete o[k];};
  try{
    _exporting=true;
    clear(_fxBuses);clear(_fxRevs);clear(_masterStages);_lim=null;_masterSig=null;
    masterVol=1;audioCtx=off;_initAudioGraph(off,1); // the file doesn't depend on the volume slider
    // make every channel that has effects up front, so sidechain ducks from the very first kick
    for(let ch=0;ch<FX_MASTER;ch++)fxBusFor(ch);
    if(typeof FX_VOX_BASE!=='undefined'){_voxN=null;for(let i=0;i<VOX_MAX_LAYERS;i++)fxBusFor(FX_VOX_BASE+i);}
    res.bars.forEach(t=>fxBeatSync(WAV_LEAD+t));
    if(typeof autoRenderOffline==='function')autoRenderOffline(Math.round(res.duration/(60/seqBpm/4)),WAV_LEAD); // automation moves
    res.hits.slice().sort((a,b)=>a.time-b.time).forEach(h=>{
      const t=WAV_LEAD+h.time;
      try{
        if(h.vox)voxPlayClip(h.clip,h.li,t,0,h.maxDur);
        else if(h.vcar)voxCarrierNote(h.li,h.midi,t,h.dur,h.vel);
        else if(h.midi!=null)playRollNote(h.soundId,h.midi,t,h.dur,h.vel,h.layer);
        else playSound(h.soundId,h.vel,t,h.ch);
      }catch(e){console.warn('export: skipped',h.soundId,e);}
    });
  }finally{
    // ── put the live engine back ──
    audioCtx=live.audioCtx;masterGainNode=live.masterGainNode;ambGain=live.ambGain;drumMasterGain=live.drumMasterGain;drumMasterReal=live.drumMasterReal;
    rvbNode=live.rvbNode;rvbGainNode=live.rvbGainNode;rvbReal=live.rvbReal;_lim=live._lim;_masterSig=live._masterSig;masterVol=live.masterVol;
    clear(_fxBuses);Object.assign(_fxBuses,live.buses);clear(_fxRevs);Object.assign(_fxRevs,live.revs);clear(_masterStages);Object.assign(_masterStages,live.mstages);
    if(typeof _voxN!=='undefined')_voxN=live.voxN;
    _exporting=false;
  }
  // old Safari's startRendering() doesn't return a promise; it fires oncomplete instead
  return new Promise((resolve,reject)=>{
    off.oncomplete=e=>resolve(e.renderedBuffer);
    try{const p=off.startRendering();if(p&&p.then)p.then(resolve,reject);}catch(e){reject(e);}
  });
}
// trims the silent end of the tail (keeps a short fade-out room), so files aren't padded with seconds of nothing
function trimTail(buf,minLen){
  const L=buf.getChannelData(0),R=buf.numberOfChannels>1?buf.getChannelData(1):L;
  let end=buf.length;const thr=.0005;
  while(end>minLen&&Math.abs(L[end-1])<thr&&Math.abs(R[end-1])<thr)end--;
  end=Math.min(buf.length,end+Math.round(buf.sampleRate*.05));
  if(end>=buf.length)return buf;
  // a plain object with the same shape encodeWAV reads (works everywhere, no AudioBuffer constructor needed)
  const chans=[];for(let c=0;c<buf.numberOfChannels;c++)chans.push(buf.getChannelData(c).subarray(0,end));
  return{sampleRate:buf.sampleRate,numberOfChannels:buf.numberOfChannels,length:end,getChannelData:c=>chans[c]};
}
let _wavBusy=false;
async function renderHitsToWAV(res,filename){
  if(!res.hits.length){showToast('Nothing to export — add some notes first!');return;}
  if(_wavBusy){showToast('Already exporting…');return;}
  _wavBusy=true;
  try{if(typeof voxPrepareExport==='function')await voxPrepareExport();}catch(e){}
  showToast('Rendering WAV…');
  try{
    const buf=trimTail(await renderOffline(res),Math.ceil((res.duration+WAV_LEAD)*44100));
    downloadBlob(encodeWAV(buf),filename);
    showToast('✅ WAV exported — check your downloads!');
  }catch(e){showToast('Export failed: '+e.message);console.error(e);}
  finally{_wavBusy=false;}
}

document.getElementById('seqExportPatBtn')&&document.getElementById('seqExportPatBtn').addEventListener('click',()=>{
  renderHitsToWAV(buildPatternHits(seqLayers),'alien_buddies_pattern.wav');
});
document.getElementById('seqExportArrBtn')&&document.getElementById('seqExportArrBtn').addEventListener('click',()=>{
  renderHitsToWAV(_withVox(buildArrangementHits({bars:arrangeBars,arrangement:arrangement})),'alien_buddies_arrangement.wav');
});
document.getElementById('seqExportSongBtn')&&document.getElementById('seqExportSongBtn').addEventListener('click',()=>{
  renderHitsToWAV(_withVox(buildSongHits()),'alien_buddies_song.wav');
});
