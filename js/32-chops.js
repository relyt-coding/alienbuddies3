// ══════════════════════════════════════════════
//  VOCAL CHOPS — slice takes into sounds for the pads, sequencer tracks and (with Chop Keys) the piano roll
// ══════════════════════════════════════════════
// A chop's audio is copied out of the take (with its autotune / voice changer, if the layer has them) and stored as
// its own small recording, so it keeps sounding the same even if the take is edited or deleted later.
// Chops live in the sound library under CHOPS, like any other sound. Saved per slot: chops = [{id,name,t,d,f0,rev,semi,choke,color}].
const CHOP_COLORS=['#ff7ad9','#ffd36b','#7ad7ff','#9dff7a','#c99bff','#ff9b6b','#6bffe0','#ff6b8e'];
let chops=[];let _chopN=0;
function chopsOwned(){return typeof musicHas==='function'&&musicHas('mt_chops');}
function chopBankSize(){return musicHas('mt_chopbank')?24:8;}
function chopTakeIds(){return chops.map(c=>c.t);}
function chopSanitize(a){
  return (Array.isArray(a)?a:[]).filter(c=>c&&typeof c.id==='string'&&/^chop_/.test(c.id)&&typeof c.t==='string'&&c.d>0).slice(0,24).map(c=>({
    id:c.id,name:String(c.name||'CHOP').slice(0,14),t:c.t,d:+c.d,f0:isFinite(c.f0)?+c.f0:0,rev:!!c.rev,semi:Math.max(-24,Math.min(24,c.semi|0)),choke:c.choke!==false,color:String(c.color||CHOP_COLORS[0]).slice(0,9)}));
}
function chopsSave(){return chopSanitize(chops);}
// ── the sounds ──
const _chopRev=new Map(),_chopLast=new Map();
function chopBuffer(ch){
  const b=voxBuf.get(ch.t);if(!b)return null;
  if(!ch.rev)return b;
  let r=_chopRev.get(ch.t);
  if(!r||r.length!==b.length){const d=b.getChannelData(0),f=new Float32Array(d.length);for(let i=0;i<d.length;i++)f[i]=d[d.length-1-i];r=voxMakeBuffer(f,b.sampleRate);_chopRev.set(ch.t,r);}
  return r;
}
function chopPlay(ch,t,gv){
  const buf=chopBuffer(ch);if(!buf){voxLoadTake(ch.t);return;}
  const c=getCtx(),rate=Math.pow(2,(ch.semi||0)/12)*(typeof _ksMul==='number'&&_ksMul>0?_ksMul:1);
  const src=c.createBufferSource(),g=c.createGain();src.buffer=buf;src.playbackRate.value=rate;
  const dur=buf.duration/rate,v=.9*(gv==null?1:gv),f=Math.min(.002,dur/4);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+f);g.gain.setValueAtTime(v,t+dur-f);g.gain.linearRampToValueAtTime(0,t+dur);
  src.connect(g);g.connect(drumMasterGain);src.start(t);src.stop(t+dur+.01);
  // CHOKE: a new hit of the same chop cuts the last one off (like an MPC pad)
  if(ch.choke!==false){
    const last=_chopLast.get(ch.id);
    if(last&&last.c===c&&last.end>t){try{last.g.gain.cancelScheduledValues(t);last.g.gain.setValueAtTime(last.g.gain.value,t);last.g.gain.linearRampToValueAtTime(0,t+.006);last.src.stop(t+.01);}catch(e){}}
    _chopLast.set(ch.id,{src,g,c,end:t+dur});
  }
}
function chopRegister(){
  // drop sounds of chops that are gone
  Object.keys(SOUND_MAP).forEach(id=>{if(/^chop_/.test(id)&&!chops.some(c=>c.id===id)){delete SOUND_MAP[id];delete PITCHED_SOUNDS[id];}});
  const keys=musicHas('mt_chopkeys');
  chops.forEach(ch=>{
    SOUND_MAP[ch.id]={id:ch.id,name:ch.name,tag:'chops',color:ch.color,chop:true,desc:'Vocal chop',fn:(t,gv)=>chopPlay(ch,t,gv)};
    // CHOP KEYS: chops with a clear pitch become piano roll instruments (and follow the song key like other melodic sounds)
    if(keys&&ch.f0>0)PITCHED_SOUNDS[ch.id]={f:ch.f0*Math.pow(2,(ch.semi||0)/12),r:'note',roll:1};else delete PITCHED_SOUNDS[ch.id];
  });
  chops.forEach(ch=>{if(!voxBuf.has(ch.t))voxLoadTake(ch.t);});
  if(typeof mpFiltersEl!=='undefined'&&mpFiltersEl&&!mpFiltersEl.querySelector('[data-tag="chops"]')&&chops.length&&chopsOwned()){
    const chp=document.createElement('div');chp.className='mp-chip';chp.textContent='CHOPS';chp.dataset.tag='chops';chp.addEventListener('click',()=>setMpFilter('chops'));mpFiltersEl.appendChild(chp);
  }
}
function chopsLoad(a){chops=chopSanitize(a);_chopN=chops.reduce((m,c)=>Math.max(m,parseInt((c.name.match(/(\d+)$/)||[])[1]||0)),0);chopRegister();}
// chops are in the sound library once Vocal Chops is bought
if(typeof unlockedSounds==='function'){const _u=unlockedSounds;unlockedSounds=function(){const a=_u.apply(this,arguments);return chopsOwned()?a.concat(chops.map(c=>c.id).filter(id=>SOUND_MAP[id])):a;};}
// register before the save's pads / tracks / roll layers look their sounds up
if(typeof loadFromSave==='function'){const _l=loadFromSave;loadFromSave=function(data){try{chopsLoad(data&&data.chops);}catch(e){chops=[];}return _l.apply(this,arguments);};}

// ── slicing ──
// AUTO SLICE: cut where a syllable starts (a jump in loudness after a quieter moment)
function chopOnsets(buf,o,d,max){
  const sr=buf.sampleRate,x=buf.getChannelData(0),i0=Math.floor(o*sr),n=Math.floor(d*sr),hop=Math.round(sr*.005);
  const e=[];for(let i=0;i+hop<=n;i+=hop){let s=0;for(let k=0;k<hop;k++){const v=x[i0+i+k]||0;s+=v*v;}e.push(Math.sqrt(s/hop));}
  const pk=Math.max(...e,1e-6),out=[];let last=-1e9;
  for(let i=4;i<e.length;i++){
    const prev=Math.min(e[i-1],e[i-2],e[i-3],e[i-4]);
    if(e[i]>pk*.12&&e[i]>prev*2.2&&(i-last)*.005>.09){out.push(i*.005);last=i;}
  }
  return out.filter(t=>t>.04&&t<d-.04).slice(0,max-1);
}
function chopDetectF0(seg,sr){
  try{const core=window._voxCoreMain||(window._voxCoreMain=_voxDspCore());const tr=core.yinTrack(seg,sr);
    const v=[...tr.f0].filter(x=>x>0).sort((a,b)=>a-b);return v.length>=4?v[v.length>>1]:0;}catch(e){return 0;}
}
const _cx=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};
function chopModal(id,title){
  let m=document.getElementById(id);
  if(!m){m=_cx('div','more-modal');m.id=id;m.addEventListener('click',e=>{if(e.target===m)m.style.display='none';});document.body.appendChild(m);}
  m.innerHTML='';const box=_cx('div','more-box chop-box');m.appendChild(box);m.style.display='flex';
  const hd=_cx('div','more-head');hd.appendChild(_cx('div','more-title',title));const x=_cx('button','more-x','✕');x.addEventListener('click',()=>{m.style.display='none';});hd.appendChild(x);box.appendChild(hd);
  return{m,box,close:()=>{m.style.display='none';}};
}
async function openChopEditor(li,clip){
  if(!chopsOwned())return;
  // the take as you hear it (autotune / voice changer included)
  const p=typeof voxVoiceParams==='function'&&voxVoiceParams(li);
  if(p){const k=_voxKey(clip.t,p),e=voxProc.get(k);if(!e||!e.buf){showToast('🎯 Getting the processed take ready…');await voxEnqueue(clip.t,p,k);}}
  const pr=typeof voxProcessedPair==='function'?voxProcessedPair(clip.t,li):null;
  await voxLoadTake(clip.t);
  const buf=(pr&&pr.buf)||voxBuf.get(clip.t);if(!buf){showToast('✂ That take isn\'t loaded');return;}
  const hb=pr&&pr.hbuf,hm=hb?voxHarmMix(li):0;
  const o=clip.o,d=clip.d,free=chopBankSize()-chops.length;
  const M=chopModal('chopModal','✂ CHOP · '+voxLayerName(li));
  let marks=[];let onPads=false;
  M.box.appendChild(_cx('div','more-sub','Tap the waveform to add a cut (tap a cut again to remove it). Each slice becomes a sound for your pads and sequencer tracks.'));
  const cv=document.createElement('canvas');cv.className='chop-wave';M.box.appendChild(cv);
  const sliceRow=_cx('div','chop-slices');M.box.appendChild(sliceRow);
  const tools=_cx('div','vox-mrow');M.box.appendChild(tools);
  const info=_cx('div','fx-note');M.box.appendChild(info);
  const opts=_cx('div','vox-mrow');M.box.appendChild(opts);
  const go=_cx('button','more-done','MAKE CHOPS');M.box.appendChild(go);
  const bounds=()=>[0,...marks,d];
  const sliceAt=i=>{const b=bounds();return{a:b[i],b:b[i+1]};};
  const nSlices=()=>marks.length+1;
  function draw(){
    const w=cv.clientWidth||300,h=cv.clientHeight||110,dpr=Math.min(2,devicePixelRatio||1);cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
    const x=cv.getContext('2d'),W=cv.width,H=cv.height,data=buf.getChannelData(0),sr=buf.sampleRate;
    x.fillStyle='#0a0a16';x.fillRect(0,0,W,H);
    const b=bounds();for(let i=0;i<b.length-1;i++){x.fillStyle=i%2?'#ffffff08':'#ffffff03';x.fillRect(b[i]/d*W,0,(b[i+1]-b[i])/d*W,H);}
    x.fillStyle=VOX_LANE_COLORS[li];
    for(let i=0;i<W;i++){const s0=Math.floor((o+d*i/W)*sr),s1=Math.floor((o+d*(i+1)/W)*sr);let m=0;for(let k=s0;k<s1&&k<data.length;k+=2){const a=Math.abs(data[k]);if(a>m)m=a;}const y=Math.min(1,Math.sqrt(m))*H*.45;x.fillRect(i,H/2-y,1,Math.max(1,y*2));}
    x.fillStyle='#fff';marks.forEach(t=>{x.fillRect(Math.round(t/d*W)-1,0,2*dpr,H);});
    x.font=Math.round(10*dpr)+'px monospace';x.fillStyle='#ffffffaa';for(let i=0;i<b.length-1;i++)x.fillText(String(i+1),b[i]/d*W+4*dpr,12*dpr);
  }
  function paint(){
    draw();sliceRow.innerHTML='';
    for(let i=0;i<nSlices();i++){const b=_cx('button','roll-chip','▶ '+(i+1));b.addEventListener('click',()=>{const s=sliceAt(i);audition(s.a,s.b);});sliceRow.appendChild(b);}
    const n=nSlices();
    info.textContent=n+' slice'+(n>1?'s':'')+' · chop bank: '+chops.length+' of '+chopBankSize()+' used'+(n>free?' · only '+Math.max(0,free)+' more fit: delete some in ✂ CHOPS or remove cuts':'');
    go.textContent=n>free?'BANK FULL ('+free+' FREE)':'MAKE '+n+' CHOP'+(n>1?'S':'');go.disabled=n>free||free<=0;
  }
  let _aud=null;
  function audition(a,b){
    const c=getCtx();if(_aud){try{_aud.stop();}catch(e){}}
    const s=c.createBufferSource(),g=c.createGain();s.buffer=buf;s.connect(g);g.connect(drumMasterReal);
    g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(.9,c.currentTime+.003);
    s.start(c.currentTime,o+a,b-a);_aud=s;
  }
  cv.addEventListener('pointerdown',e=>{
    const r=cv.getBoundingClientRect(),t=Math.max(0,Math.min(d,(e.clientX-r.left)/r.width*d));
    const near=marks.findIndex(m=>Math.abs(m-t)/d*r.width<14);
    if(near>=0)marks.splice(near,1);else if(t>.03&&t<d-.03){marks.push(t);marks.sort((a,b)=>a-b);}
    // play the slice you touched
    const b=bounds();let i=0;while(i<b.length-2&&t>=b[i+1])i++;audition(b[i],b[i+1]);
    paint();
  });
  [2,4,8,16].forEach(n=>{const b=_cx('button','roll-chip','EVEN '+n);b.addEventListener('click',()=>{marks=[];for(let i=1;i<n;i++)marks.push(d*i/n);paint();});tools.appendChild(b);});
  if(musicHas('mt_chopauto')){const b=_cx('button','roll-chip on','✨ AUTO');b.title='Cut where each syllable starts';
    b.addEventListener('click',()=>{marks=chopOnsets(buf,o,d,Math.max(2,Math.min(16,free)));paint();if(!marks.length)showToast('✂ No clear syllables found: try EVEN or tap to cut');});tools.appendChild(b);}
  const clr=_cx('button','roll-chip','CLEAR');clr.addEventListener('click',()=>{marks=[];paint();});tools.appendChild(clr);
  const pads=_cx('button','roll-chip','ALSO PUT ON PADS: OFF');pads.title='Put the new chops on your drum pads, in order (replaces those pads\' sounds)';
  pads.addEventListener('click',()=>{onPads=!onPads;pads.classList.toggle('on',onPads);pads.textContent='ALSO PUT ON PADS: '+(onPads?'ON':'OFF');});opts.appendChild(pads);
  go.addEventListener('click',async()=>{
    const n=nSlices();if(n>chopBankSize()-chops.length)return;
    go.disabled=true;go.textContent='MAKING…';
    const sr=buf.sampleRate,data=buf.getChannelData(0),hd=hb?hb.getChannelData(0):null,made=[];
    for(let i=0;i<n;i++){
      const s=sliceAt(i),i0=Math.floor((o+s.a)*sr),len=Math.max(1,Math.floor((s.b-s.a)*sr));
      const seg=new Float32Array(len);for(let k=0;k<len;k++){seg[k]=(data[i0+k]||0)+(hd?(hd[i0+k]||0)*hm:0);}
      const id=voxNewId();voxAddTakeToMemory(id,seg,sr);voxSaveTake(id,seg,sr).catch(()=>{showToast('⚠ Couldn\'t store a chop on this device (storage full?)');});
      _chopN++;
      const ch={id:'chop_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:'CHOP '+_chopN,t:id,d:len/sr,f0:chopDetectF0(seg,sr),rev:false,semi:0,choke:true,color:CHOP_COLORS[(_chopN-1)%CHOP_COLORS.length]};
      chops.push(ch);made.push(ch);
    }
    chopRegister();
    if(onPads){made.slice(0,drum.pads).forEach((ch,i)=>{padSounds[i]=ch.id;});if(typeof rebuildPadGrid==='function')rebuildPadGrid();}
    autoSave();M.close();
    showToast('✂ '+made.length+' chop'+(made.length>1?'s':'')+' added to your sounds (CHOPS)'+(onPads?' and put on the pads':'. Put them on pads or sequencer tracks.'));
  });
  requestAnimationFrame(paint);
}

// ── the chop bank: play, rename, tweak, put on a pad, delete ──
function chopUsedBy(id){
  const u=[];padSounds.forEach((s,i)=>{if(s===id)u.push('pad '+(i+1));});
  seqLayers.forEach((l,i)=>{if(l.soundId===id)u.push('track '+(i+1));});
  if(typeof pianoRoll!=='undefined')pianoRoll.layers.forEach((L,i)=>{if(L&&L.soundId===id)u.push('roll '+(i+1));});
  return u;
}
// rebuild the sequencer rows with their steps (same as loading a save), so a changed sound shows up
function chopRefreshSeq(){
  const snaps=seqLayers.map(l=>({soundId:l.soundId,steps:[...l.steps],vols:[...l.vols],muted:l.muted}));
  seqLayersContainer.innerHTML='';seqLayers=[];
  snaps.forEach(sn=>{addSeqLayer(sn.soundId,sn.steps,sn.vols);const L=seqLayers[seqLayers.length-1];
    if(sn.muted&&L){L.muted=true;const b=L.el&&L.el.querySelector('.seq-rc-btn');if(b)b.classList.add('muted');}});
  if(typeof updateSeqAddBtn==='function')updateSeqAddBtn();
}
function chopDelete(id){
  chops=chops.filter(c=>c.id!==id);
  padSounds.forEach((s,i)=>{if(s===id)padSounds[i]=null;});
  const fb=unlockedSounds().find(x=>!/^chop_/.test(x))||'hihat';
  let seqHit=false;seqLayers.forEach(l=>{if(l.soundId===id){l.soundId=fb;seqHit=true;}});
  if(typeof pianoRoll!=='undefined')pianoRoll.layers.forEach(L=>{if(L&&L.soundId===id)L.soundId=null;});
  chopRegister();if(typeof rebuildPadGrid==='function')rebuildPadGrid();
  if(seqHit)chopRefreshSeq();
  if(typeof rollView!=='undefined'&&rollView>=0&&typeof showRoll==='function')showRoll(rollView);
  autoSave();
}
function openChopBank(){
  const M=chopModal('chopBankModal','✂ CHOPS');
  M.box.appendChild(_cx('div','more-sub',chops.length?chops.length+' of '+chopBankSize()+' slots used. Chops are in the sound library under CHOPS (pads and sequencer tracks'+(musicHas('mt_chopkeys')?', and the piano roll':'')+').':'No chops yet. Select a take in VOX and tap ✂ CHOP.'));
  const list=_cx('div','chop-list');M.box.appendChild(list);
  const tricks=musicHas('mt_choptricks');
  chops.forEach(ch=>{
    const row=_cx('div','chop-row');row.style.setProperty('--c',ch.color);
    const pl=_cx('button','roll-chip','▶');pl.addEventListener('click',()=>{getCtx();playSound(ch.id);});row.appendChild(pl);
    const nm=document.createElement('input');nm.type='text';nm.maxLength=14;nm.value=ch.name;nm.className='chop-name';
    nm.addEventListener('change',()=>{ch.name=nm.value.trim().toUpperCase()||ch.name;nm.value=ch.name;chopRegister();autoSave();});row.appendChild(nm);
    row.appendChild(_cx('span','chop-len',voxFmtTime(ch.d)+(musicHas('mt_chopkeys')&&ch.f0>0?' · ♪':'')));
    if(tricks){
      const rv=_cx('button','roll-chip'+(ch.rev?' on':''),'⏪');rv.title='Reverse';rv.addEventListener('click',()=>{ch.rev=!ch.rev;rv.classList.toggle('on',ch.rev);getCtx();playSound(ch.id);autoSave();});row.appendChild(rv);
      const st=_cx('span','chop-semi',(ch.semi>0?'+':'')+ch.semi);
      const dn=_cx('button','roll-chip','−'),up=_cx('button','roll-chip','+');
      const set=v=>{ch.semi=Math.max(-24,Math.min(24,v));st.textContent=(ch.semi>0?'+':'')+ch.semi;chopRegister();getCtx();playSound(ch.id);autoSave();};
      dn.title='Pitch down a semitone';up.title='Pitch up a semitone';dn.addEventListener('click',()=>set(ch.semi-1));up.addEventListener('click',()=>set(ch.semi+1));
      const pg=_cx('span','chop-pitch');pg.title='Pitch (semitones)';pg.appendChild(dn);pg.appendChild(st);pg.appendChild(up);row.appendChild(pg);
      const ck=_cx('button','roll-chip'+(ch.choke!==false?' on':''),'CHOKE');ck.title='A new hit cuts the last one off';ck.addEventListener('click',()=>{ch.choke=ch.choke===false;ck.classList.toggle('on',ch.choke!==false);autoSave();});row.appendChild(ck);
    }
    const pad=document.createElement('select');pad.className='roll-select chop-pad';
    const o0=document.createElement('option');o0.value='';o0.textContent='→ PAD';pad.appendChild(o0);
    for(let i=0;i<drum.pads;i++){const o=document.createElement('option');o.value=i;o.textContent='PAD '+(i+1)+(padSounds[i]===ch.id?' ✓':'');pad.appendChild(o);}
    pad.addEventListener('change',()=>{if(pad.value==='')return;padSounds[+pad.value]=ch.id;if(typeof rebuildPadGrid==='function')rebuildPadGrid();autoSave();showToast('✂ '+ch.name+' is on pad '+(+pad.value+1));openChopBank();});
    row.appendChild(pad);
    const del=_cx('button','roll-chip muted','🗑');del.title='Delete this chop';
    del.addEventListener('click',()=>{const u=chopUsedBy(ch.id);if(u.length&&!confirm('Delete '+ch.name+'? It\'s used on '+u.join(', ')+'.'))return;chopDelete(ch.id);openChopBank();});
    row.appendChild(del);
    list.appendChild(row);
  });
  const done=_cx('button','more-done','DONE');done.addEventListener('click',M.close);M.box.appendChild(done);
}
// VOX toolbar: ✂ CHOPS (the bank)
if(typeof voxBuildBar==='function'){const _vb=voxBuildBar;voxBuildBar=function(){
  const r=_vb.apply(this,arguments);
  if(chopsOwned()){const b=voxChip('✂ CHOPS'+(chops.length?' ('+chops.length+')':''),'','Your vocal chops',openChopBank);const mic=[...voxBar.children].find(x=>/MIC/.test(x.textContent));voxBar.insertBefore(b,mic||null);}
  return r;
};}
function refreshChopsUI(){chopRegister();if(typeof voxOpen!=='undefined'&&voxOpen){voxBuildBar();voxRender();}}
