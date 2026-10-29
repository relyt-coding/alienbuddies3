// ══════════════════════════════════════════════
//  PIANO ROLL (Musical Toolkit → Piano Roll + Roll Layers 2–6)
// ══════════════════════════════════════════════
// Each roll layer = one melodic instrument with its own notes. Notes live on the same step grid as the
// sequencer (1 step = a 16th note), so they play at the same BPM and line up with the steps above.
// Notes: {s: start step (can be 0.25, 0.5…), l: length in steps, m: MIDI note number}.
// Piano roll notes are just music: they never change scoring (every sequencer step still scores once).
const ROLL_MAX_LAYERS=6,ROLL_ROWS=36,ROLL_MAX_POLY=7;
const ROLL_SNAPS=[[.25,'1/4'],[.5,'1/2'],[1,'1'],[2,'2'],[4,'4']]; // note sizes, in sequencer steps
const ROLL_NOTE_NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
let pianoRoll={layers:[]}; // layers[i] = {soundId, muted, notes:[]}
let rollView=-1;           // -1 = sequencer grid is showing; 0..5 = that roll layer is showing
let rollSnap=1;try{const v=parseFloat(localStorage.getItem('ab2_rollSnap'));if(ROLL_SNAPS.some(x=>x[0]===v))rollSnap=v;}catch(e){}
let rollKeyLock=false;try{rollKeyLock=localStorage.getItem('ab2_rollKeyLock')==='1';}catch(e){}

// ── sustaining instruments (free with the Piano Roll) ──
// The game's other sounds are one-shots: they ring for a fixed time whatever the note length. These four are
// built for the roll: they hold for as long as the note lasts, then fade out with their own release.
// note(t, gain, freq, dur, vel): start at t, hold for dur seconds; returns the release time (seconds).
function _env(g,t,dur,a,d,sus,r,peak){
  const end=t+Math.max(dur,.02);
  a=Math.min(a,Math.max(.003,dur*.6)); // short notes get a quicker attack so they still speak
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);
  g.gain.setTargetAtTime(peak*sus,t+a,d/3);
  g.gain.cancelScheduledValues(end);g.gain.setTargetAtTime(0,end,r/3);
  return end+r*2.5; // when it's silent
}
const ROLL_SYNTHS={
  rs_bass:{name:'SYNTH BASS',color:'#ff5577',f:55,r:'bass',
    note(t,gv,f,dur,vel){const c=getCtx(),g=c.createGain(),lp=c.createBiquadFilter(),o1=c.createOscillator(),o2=c.createOscillator(),g2=c.createGain();
      o1.type='sawtooth';o1.frequency.value=f;o2.type='square';o2.frequency.value=f/2;g2.gain.value=.5;
      lp.type='lowpass';lp.Q.value=5;const top=500+1600*vel;lp.frequency.setValueAtTime(top,t);lp.frequency.setTargetAtTime(220+300*vel,t+.01,.09);
      o1.connect(lp);o2.connect(g2);g2.connect(lp);lp.connect(g);g.connect(drumMasterGain);
      const stop=_env(g,t,dur,.004,.18,.75,.07,.34*gv);[o1,o2].forEach(o=>{o.start(t);o.stop(stop);});return .07;}},
  rs_keys:{name:'KEYS',color:'#ffcc66',f:261.63,r:'note',
    note(t,gv,f,dur,vel){const c=getCtx(),g=c.createGain(),car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),tine=c.createOscillator(),tg=c.createGain();
      car.type='sine';car.frequency.value=f;mod.type='sine';mod.frequency.value=f;
      mg.gain.setValueAtTime(f*(1.2+2*vel),t);mg.gain.setTargetAtTime(f*.25,t,.25);mod.connect(mg);mg.connect(car.frequency);
      tine.type='sine';tine.frequency.value=f*4;tg.gain.setValueAtTime(.12*vel,t);tg.gain.setTargetAtTime(0,t,.04);tine.connect(tg);tg.connect(g);
      car.connect(g);g.connect(drumMasterGain);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.42*gv,t+.003);g.gain.setTargetAtTime(.16*gv,t+.003,.5); // piano-like: fades slowly while held
      const end=t+Math.max(dur,.02);g.gain.cancelScheduledValues(end);g.gain.setTargetAtTime(0,end,.25/3);const stop=end+.65;
      [car,mod,tine].forEach(o=>{o.start(t);o.stop(stop);});return .25;}},
  rs_pad:{name:'WARM PAD',color:'#88aaff',f:261.63,r:'note',
    note(t,gv,f,dur,vel){const c=getCtx(),g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.Q.value=.7;
      lp.frequency.setValueAtTime(700,t);lp.frequency.linearRampToValueAtTime(900+900*vel,t+Math.min(1.2,Math.max(.3,dur)));lp.connect(g);g.connect(drumMasterGain);
      // two detuned saws + a sine an octave down (lighter on phones than 4 saws, same warm, wide sound)
      const mix=c.createGain();mix.gain.value=.22;mix.connect(lp);
      const os=[-8,8].map(cents=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=cents;o.connect(mix);return o;});
      const sub=c.createOscillator(),sg=c.createGain();sub.type='sine';sub.frequency.value=f/2;sg.gain.value=.16;sub.connect(sg);sg.connect(lp);os.push(sub);
      const stop=_env(g,t,dur,.3,.4,.9,.6,gv);os.forEach(o=>{o.start(t);o.stop(stop);});return .6;}},
  rs_lead:{name:'LEAD',color:'#66ffaa',f:523.25,r:'note',
    note(t,gv,f,dur,vel){const c=getCtx(),g=c.createGain(),lp=c.createBiquadFilter(),o1=c.createOscillator(),o2=c.createOscillator(),g1=c.createGain(),g2=c.createGain(),vib=c.createOscillator(),vg=c.createGain();
      o1.type='square';o2.type='sawtooth';o1.frequency.value=f;o2.frequency.value=f;o2.detune.value=6;g1.gain.value=.55;g2.gain.value=.45;
      vib.frequency.value=5.5;vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(0,t+.22);vg.gain.linearRampToValueAtTime(f*.006,t+.5); // vibrato fades in on held notes
      vib.connect(vg);vg.connect(o1.frequency);vg.connect(o2.frequency);
      lp.type='lowpass';lp.frequency.value=1800+2200*vel;lp.Q.value=1.5;o1.connect(g1);o2.connect(g2);g1.connect(lp);g2.connect(lp);lp.connect(g);g.connect(drumMasterGain);
      const stop=_env(g,t,dur,.008,.15,.8,.12,.4*gv);[o1,o2,vib].forEach(o=>{o.start(t);o.stop(stop);});return .12;}},
};
const ROLL_SYNTH_IDS=Object.keys(ROLL_SYNTHS);
// register them so names / colours / effects work like any other sound (they are not in the sound library or on the pads)
ROLL_SYNTH_IDS.forEach(id=>{const R=ROLL_SYNTHS[id];
  SOUND_MAP[id]={id,name:R.name,tag:'roll',color:R.color,rollSynth:true,fn:(t,gv)=>R.note(t,gv,R.f,.4,1)};
  PITCHED_SOUNDS[id]={f:R.f,r:R.r,roll:1};});

// ── data helpers ──
function rollSounds(){return ROLL_SYNTH_IDS.concat(unlockedSounds().filter(id=>PITCHED_SOUNDS[id]&&PITCHED_SOUNDS[id].roll));}
function rollBaseMidi(id){const p=PITCHED_SOUNDS[id];return p?69+12*Math.log2(p.f/440):60;}
// 3 octaves per instrument: from the C an octave below its natural pitch (basses start on their own octave)
function rollRange(id){
  const p=PITCHED_SOUNDS[id],b=Math.round(rollBaseMidi(id));
  let lo=12*Math.floor(b/12)-12;if(p&&p.r==='bass')lo+=12;lo=Math.max(24,lo);
  return{lo,hi:lo+ROLL_ROWS-1};
}
function rollLayer(i){
  while(pianoRoll.layers.length<=i)pianoRoll.layers.push({soundId:null,muted:false,notes:[]});
  const L=pianoRoll.layers[i];
  if(!L.soundId||!rollSounds().includes(L.soundId)){
    const have=rollSounds(),used=pianoRoll.layers.map(x=>x.soundId);
    const pick=have.find(id=>!used.includes(id))||have[0]||null;
    if(pick&&pick!==L.soundId)rollSetSound(i,pick);
  }
  return L;
}
function rollSanitize(r){
  const out={layers:[]};
  if(r&&Array.isArray(r.layers))r.layers.slice(0,ROLL_MAX_LAYERS).forEach(L=>{
    out.layers.push({soundId:(L&&SOUND_MAP[L.soundId])?L.soundId:null,muted:!!(L&&L.muted),
      notes:(L&&Array.isArray(L.notes)?L.notes:[]).filter(n=>n&&isFinite(n.s)&&isFinite(n.l)&&isFinite(n.m)&&n.l>0)
        .map(n=>{const o={s:+n.s,l:+n.l,m:Math.round(n.m)};if(isFinite(n.v)&&n.v>0&&n.v<1)o.v=+n.v;return o;})});
  });
  return out;
}
function rollClone(r){return rollSanitize(JSON.parse(JSON.stringify(r||{layers:[]})));}
function rollHasNotes(r){return !!(r&&r.layers&&r.layers.some(L=>L.notes.length));}
// copy steps [from, to) out of a roll (used when saving a pattern); notes are shifted to start at 0 and cut at the end
function rollSlice(r,from,to){
  const out={layers:[]};
  (r.layers||[]).forEach(L=>{
    out.layers.push({soundId:L.soundId,muted:L.muted,notes:L.notes.filter(n=>n.s>=from&&n.s<to).map(n=>{const o={s:n.s-from,l:Math.min(n.l,to-n.s),m:n.m};if(n.v!=null)o.v=n.v;return o;})});
  });
  return out;
}
// paste a saved pattern's roll into the editor (same rules as the step tracks: offset, optional wrap, merge keeps the rest)
function rollPaste(src,offset,len,wrap,merge){
  src=rollSanitize(src);
  if(!merge)pianoRoll.layers.forEach(L=>{L.notes=[];});
  src.layers.forEach((S,i)=>{
    const L=pianoRoll.layers[i]||(pianoRoll.layers[i]={soundId:S.soundId,muted:S.muted,notes:[]});
    if(!merge||!L.notes.length){L.soundId=S.soundId;L.muted=S.muted;}
    if(merge){ // clear the pasted range first
      const inRange=s=>{for(let k=0;k<len;k++){let t=offset+k;if(t>=STEPS){if(!wrap)break;t%=STEPS;}if(s>=t&&s<t+1)return true;}return false;};
      L.notes=L.notes.filter(n=>!inRange(n.s));
    }
    S.notes.forEach(n=>{
      let s=n.s+offset;
      if(s>=STEPS){if(!wrap)return;s=s%STEPS;}
      const o={s,l:n.l,m:n.m};if(n.v!=null)o.v=n.v;L.notes.push(o);
    });
  });
}
// keep an instrument's notes playable: move notes by whole octaves into the new instrument's range
function rollSetSound(i,id){
  const L=pianoRoll.layers[i];if(!L)return;
  L.soundId=id;
  const{lo,hi}=rollRange(id);
  L.notes.forEach(n=>{while(n.m<lo)n.m+=12;while(n.m>hi)n.m-=12;});
}
// most notes sounding at once inside [s, s+l) (+1 for the candidate itself)
function rollPolyAt(notes,cand,skip){
  const pts=[cand.s];notes.forEach(n=>{if(n!==skip&&n.s>cand.s&&n.s<cand.s+cand.l)pts.push(n.s);});
  let max=0;
  pts.forEach(p=>{let c=1;notes.forEach(n=>{if(n!==skip&&n.s<=p&&p<n.s+n.l)c++;});if(c>max)max=c;});
  return max;
}
function rollOverlapsSamePitch(notes,cand,skip){return notes.some(n=>n!==skip&&n.m===cand.m&&n.s<cand.s+cand.l&&cand.s<n.s+n.l);}
function rollInKey(m){
  if(typeof keyIsActive!=='function'||!keyIsActive())return true;
  const R=relMajorRoot(seqKey,seqKeyMinor);return MAJOR_SCALE.includes(((m-R)%12+12)%12);
}

// ── sound ──
// plays one note: the instrument retuned to `midi` and cut off (with a short fade) after `durSec`
function playRollNote(id,midi,at,durSec,vel,layer){
  if(!SOUND_MAP[id]||!PITCHED_SOUNDS[id])return;
  const c=getCtx(),now=c.currentTime;at=Math.max(at||now,now);
  const cents=(midi-rollBaseMidi(id))*100;
  const gv=getSoundGainVal(id)*(vel==null?1:vel);
  // each roll layer has its own effects channel (6 + layer), just like a sequencer track
  const lay=(layer==null)?(typeof rollView==='number'?rollView:-1):layer;
  const bus=(lay>=0&&typeof fxBusFor==='function')?fxBusFor(FX_ROLL_BASE+lay):null;
  const gate=c.createGain();gate.connect(bus?bus.input:drumMasterGain);
  const end=at+Math.max(.06,durSec),synth=ROLL_SYNTHS[id];let rel=.05;
  if(synth){ // sustaining instrument: plays the exact pitch for the whole note, with its own release
    const saved=drumMasterGain;
    try{drumMasterGain=gate;rel=synth.note(at,gv,440*Math.pow(2,(midi-69)/12),end-at,vel==null?1:vel);}finally{drumMasterGain=saved;}
  }else{ // one-shot: retune it and cut it off at the end of the note
    gate.gain.setValueAtTime(1,at);gate.gain.setValueAtTime(1,end);gate.gain.linearRampToValueAtTime(0,end+.05);
    const orig=c.createOscillator,saved=drumMasterGain;
    try{
      c.createOscillator=function(){const o=orig.call(this);o.detune.value=cents;return o;};
      _ksMul=Math.pow(2,cents/1200);drumMasterGain=gate;if(bus)rvbNode=bus.rvIn;
      SOUND_MAP[id].fn(at,gv);
    }finally{delete c.createOscillator;_ksMul=1;drumMasterGain=saved;rvbNode=rvbReal||rvbNode;}
  }
  // the gate is done once the note has faded: disconnect it so long sessions don't pile up audio nodes
  if(!(typeof _exporting!=='undefined'&&_exporting))setTimeout(()=>{try{gate.disconnect();}catch(e){}},Math.max(0,(end+rel*3+.3-c.currentTime)*1000));
}
// called by the sequencer clock for every step it plays (pattern, arrangement and song modes)
function rollPlayStep(roll,st,at,respectSolo){
  if(!roll||!roll.layers||!musicHas('mt_piano'))return;
  if(respectSolo&&typeof seqLayers!=='undefined'&&seqLayers.some(x=>x.solo))return;
  const sd=60/seqBpm/4,n=pianoRollLayers();
  roll.layers.forEach((L,li)=>{
    if(li>=n||!L||L.muted||!L.soundId||!SOUND_MAP[L.soundId])return;
    L.notes.forEach(nt=>{if(nt.s>=st&&nt.s<st+1)playRollNote(L.soundId,nt.m,at+(nt.s-st)*sd,nt.l*sd,nt.v==null?1:nt.v,li);});
  });
}

// ══════════════════════════════════════════════
//  UI
// ══════════════════════════════════════════════
const _rollEl=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};
// header button (sits next to VELOCITY)
const seqRollBtn=_rollEl('button','seq-mode-pill','ROLL');seqRollBtn.id='seqRollBtn';
seqRollBtn.style.cssText='border:1px solid #2a2a4a;border-radius:4px;padding:.12rem .4rem;display:none;';
(function(){const v=document.getElementById('seqLevelAdjBtn');if(v&&v.parentNode)v.parentNode.insertBefore(seqRollBtn,v.nextSibling);})();
// toolbar above the grid + the grid itself (inside the same scroller as the steps, so it lines up)
const seqRollBar=_rollEl('div','roll-bar');seqRollBar.id='seqRollBar';seqRollBar.style.display='none';
const seqRollGrid=_rollEl('div','seq-roll');seqRollGrid.id='seqRollGrid';seqRollGrid.style.display='none';
(function(){
  const sc=document.getElementById('seqHScroll'),inner=document.getElementById('seqHInner');
  if(sc&&sc.parentNode)sc.parentNode.insertBefore(seqRollBar,sc);
  if(inner)inner.appendChild(seqRollGrid);
})();
const rollKeys=_rollEl('div','roll-keys'),rollArea=_rollEl('div','roll-area'),rollSide=_rollEl('div','roll-side');
seqRollGrid.appendChild(rollKeys);seqRollGrid.appendChild(rollArea);seqRollGrid.appendChild(rollSide);
const rollRows=_rollEl('div','roll-rows'),rollLines=_rollEl('div','roll-lines'),rollNotes=_rollEl('div','roll-notes'),rollPh=_rollEl('div','roll-ph');
rollArea.appendChild(rollRows);rollArea.appendChild(rollLines);rollArea.appendChild(rollNotes);rollArea.appendChild(rollPh);
const rollEmpty=_rollEl('div','roll-empty');seqRollGrid.appendChild(rollEmpty);

function rollRowH(){return IS_DESKTOP?13:15;}

// open / close / switch layer
function showRoll(i){
  if(i>=0&&(!musicHas('mt_piano')||i>=pianoRollLayers()))i=-1;
  rollView=i;
  if(i>=0&&typeof seqMode!=='undefined'&&seqMode!=='pattern'&&typeof setSeqMode==='function')setSeqMode('pattern');
  const on=i>=0;
  document.body.classList.toggle('roll-on',on);
  // phones: the roll takes the whole screen (in the normal layout it would start halfway down and run off the bottom)
  document.body.classList.toggle('roll-full',on&&!IS_DESKTOP);
  seqLayersContainer.style.display=on?'none':'';
  seqRollGrid.style.display=on?'':'none';
  seqRollBar.style.display=on?'':'none';
  seqRollBtn.classList.toggle('active',on);
  seqRollBtn.textContent=on?(pianoRollLayers()>1?'ROLL '+(i+1):'ROLL ✓'):'ROLL';
  if(on){rollLayer(i);buildRollBar();buildRollGrid();rollScrollToMiddle();}
}
seqRollBtn.addEventListener('click',e=>{
  e.stopPropagation();getCtx();
  if(pianoRollLayers()<=1){showRoll(rollView>=0?-1:0);return;}
  openRollPicker();
});

// layer picker (more than one layer): pick a layer, or go back to the sequencer
let _rollPick=null;
function openRollPicker(){
  if(!_rollPick){
    _rollPick=_rollEl('div','more-modal');_rollPick.id='rollPickModal';
    _rollPick.addEventListener('click',e=>{if(e.target===_rollPick)_rollPick.style.display='none';});
    document.body.appendChild(_rollPick);
  }
  const box=_rollEl('div','more-box');_rollPick.innerHTML='';_rollPick.appendChild(box);
  const close=()=>{_rollPick.style.display='none';};
  const hd=_rollEl('div','more-head');hd.appendChild(_rollEl('div','more-title','🎹 PIANO ROLL'));
  const x=_rollEl('button','more-x','✕');x.addEventListener('click',close);hd.appendChild(x);box.appendChild(hd);
  box.appendChild(_rollEl('div','more-sub','Which layer do you want to see? Each layer is one instrument with its own melody.'));
  const list=_rollEl('div','fx-list');
  const seqRow=_rollEl('button','fx-row'+(rollView<0?' active':''));
  const sn0=_rollEl('span','fx-name','🎛  STEP SEQUENCER');sn0.style.color='#cfd2ff';seqRow.appendChild(sn0);seqRow.appendChild(_rollEl('span','fx-go','›'));
  seqRow.addEventListener('click',()=>{close();showRoll(-1);});list.appendChild(seqRow);
  for(let i=0;i<pianoRollLayers();i++){
    const L=rollLayer(i),s=L.soundId&&SOUND_MAP[L.soundId];
    const row=_rollEl('button','fx-row'+(rollView===i?' active':''));
    const dot=_rollEl('span','fx-dot');dot.style.background=s?s.color:'#555';row.appendChild(dot);
    const nm=_rollEl('span','fx-name','LAYER '+(i+1)+'  ·  '+(s?s.name:'NO INSTRUMENT'));if(s)nm.style.color=s.color;row.appendChild(nm);
    row.appendChild(_rollEl('span','fx-badge'+(L.notes.length?' on':''),L.notes.length+' NOTE'+(L.notes.length===1?'':'S')));
    row.appendChild(_rollEl('span','fx-go','›'));
    row.addEventListener('click',()=>{close();showRoll(i);});
    list.appendChild(row);
  }
  box.appendChild(list);
  _rollPick.style.display='flex';
}

// toolbar: layer · instrument · note size · in-key · mute · back
function buildRollBar(){
  const i=rollView;if(i<0)return;
  const L=rollLayer(i);seqRollBar.innerHTML='';
  const multi=pianoRollLayers()>1;
  const lab=_rollEl('button','roll-chip roll-layer',multi?'LAYER '+(i+1)+' ▾':'PIANO ROLL');
  lab.title=multi?'Switch piano roll layer':'Piano roll';
  if(multi)lab.addEventListener('click',e=>{e.stopPropagation();openRollPicker();});
  seqRollBar.appendChild(lab);
  const have=rollSounds();
  if(have.length){
    const sel=document.createElement('select');sel.className='roll-select';sel.title='Instrument for this layer';
    const grp=(label,ids)=>{if(!ids.length)return;const g=document.createElement('optgroup');g.label=label;
      ids.forEach(id=>{const o=document.createElement('option');o.value=id;o.textContent=SOUND_MAP[id].name;g.appendChild(o);});sel.appendChild(g);};
    grp('HOLD FOR THE NOTE',have.filter(id=>ROLL_SYNTHS[id]));
    grp('ONE-SHOT (RINGS ITS OWN LENGTH)',have.filter(id=>!ROLL_SYNTHS[id]));
    sel.value=L.soundId||have[0];
    const s=SOUND_MAP[sel.value];if(s){sel.style.color=s.color;sel.style.borderColor=s.color;}
    sel.addEventListener('change',()=>{rollSetSound(i,sel.value);buildRollBar();buildRollGrid();rollScrollToMiddle();autoSave();
      try{playRollNote(sel.value,Math.round(rollBaseMidi(sel.value)),0,.4);}catch(e){}});
    seqRollBar.appendChild(sel);
  }
  const sn=_rollEl('div','roll-snaps');sn.appendChild(_rollEl('span','roll-snap-lbl','NOTE'));
  ROLL_SNAPS.forEach(([v,t])=>{
    const b=_rollEl('button','roll-chip'+(rollSnap===v?' on':''),t);b.title='New notes are '+t+' step'+(v>1?'s':'')+' long and snap to a '+t+'-step grid';
    b.addEventListener('click',()=>{rollSnap=v;try{localStorage.setItem('ab2_rollSnap',String(v));}catch(e){}buildRollBar();});
    sn.appendChild(b);
  });
  seqRollBar.appendChild(sn);
  if(typeof keyIsActive==='function'&&keyIsActive()){
    const k=_rollEl('button','roll-chip'+(rollKeyLock?' on':''),'IN KEY');k.title='Only place notes that are in the song key ('+keyLongName(seqKey,seqKeyMinor)+')';
    k.addEventListener('click',()=>{rollKeyLock=!rollKeyLock;try{localStorage.setItem('ab2_rollKeyLock',rollKeyLock?'1':'0');}catch(e){}buildRollBar();});
    seqRollBar.appendChild(k);
  }
  const mu=_rollEl('button','roll-chip'+(L.muted?' muted':''),'M');mu.title='Mute this layer';
  mu.addEventListener('click',()=>{L.muted=!L.muted;buildRollBar();autoSave();});
  seqRollBar.appendChild(mu);
  const back=_rollEl('button','roll-chip roll-back','✕');back.title='Back to the step sequencer';
  back.addEventListener('click',()=>showRoll(-1));
  seqRollBar.appendChild(back);
}

// grid: rows (high notes on top), beat/bar lines that match the sequencer, and the notes
function buildRollGrid(){
  const i=rollView;if(i<0)return;
  const L=rollLayer(i),rh=rollRowH();
  seqRollGrid.style.setProperty('--rh',rh+'px');
  rollKeys.innerHTML='';rollRows.innerHTML='';
  if(!L.soundId){
    rollEmpty.style.display='';rollEmpty.textContent='Pick an instrument for this layer.';
    rollArea.style.display='none';rollKeys.style.display='none';rollSide.style.display='none';return;
  }
  rollEmpty.style.display='none';rollArea.style.display='';rollKeys.style.display='';rollSide.style.display='';
  const{lo,hi}=rollRange(L.soundId),keyOn=typeof keyIsActive==='function'&&keyIsActive();
  const R=keyOn?relMajorRoot(seqKey,seqKeyMinor):0,tonic=keyOn?seqKey:-1;
  for(let m=hi;m>=lo;m--){
    const pc=((m%12)+12)%12,black=[1,3,6,8,10].includes(pc);
    const inKey=keyOn&&MAJOR_SCALE.includes(((pc-R)%12+12)%12);
    const k=_rollEl('div','roll-key'+(black?' black':'')+(pc===0?' c':'')+(pc===tonic?' tonic':''));
    k.textContent=(pc===0||pc===tonic)?ROLL_NOTE_NAMES[pc]+(Math.floor(m/12)-1):'';
    k.title=ROLL_NOTE_NAMES[pc]+(Math.floor(m/12)-1);
    const mm=m;k.addEventListener('pointerdown',e=>{e.preventDefault();playRollNote(L.soundId,mm,0,.35);});
    rollKeys.appendChild(k);
    rollRows.appendChild(_rollEl('div','roll-row'+(black?' black':'')+(inKey?' inkey':'')+(pc===tonic?' tonic':'')+(pc===0?' c':'')));
  }
  rollArea.style.height=(ROLL_ROWS*rh)+'px';
  const s=SOUND_MAP[L.soundId];seqRollGrid.style.setProperty('--lc',s?s.color:'#a0a8ff');
  renderRollNotes();
}
function placeRollNote(el,n,hi,rh){
  el.style.setProperty('--s',n.s);el.style.setProperty('--l',n.l);
  el.style.opacity=String(.3+.7*(n.v==null?1:n.v)); // same look as sequencer steps: dimmer = softer
  el.style.top=((hi-n.m)*rh)+'px';
  el.style.display=n.s>=STEPS?'none':'';
}
function renderRollNotes(){
  const i=rollView;if(i<0)return;
  const L=rollLayer(i);if(!L.soundId)return;
  const{hi}=rollRange(L.soundId),rh=rollRowH();
  rollNotes.innerHTML='';
  L.notes.forEach(n=>{
    const el=_rollEl('div','roll-note');
    placeRollNote(el,n,hi,rh);
    el.appendChild(_rollEl('div','roll-note-h'));
    el._note=n;Object.defineProperty(n,'_el',{value:el,writable:true,configurable:true,enumerable:false});rollNotes.appendChild(el); // hidden link: never saved or copied
  });
}
function updateRollNote(n){
  if(!n||!n._el||!n._el.isConnected){renderRollNotes();return;}
  const L=rollLayer(rollView);placeRollNote(n._el,n,rollRange(L.soundId).hi,rollRowH());
}
function rollScrollToMiddle(){
  const sc=document.getElementById('seqHScroll');if(!sc||rollView<0)return;
  const L=rollLayer(rollView);if(!L.soundId)return;
  const{hi}=rollRange(L.soundId),rh=rollRowH();
  const target=L.notes.length?Math.max(...L.notes.map(n=>n.m)):Math.round(rollBaseMidi(L.soundId))+7;
  requestAnimationFrame(()=>{sc.scrollTop=Math.max(0,(hi-target)*rh-rh*2);});
}
// playhead line (pattern mode)
function rollPlayhead(st){
  if(rollView<0)return;
  if(st==null||st<0){rollPh.style.display='none';return;}
  rollPh.style.display='';rollPh.style.setProperty('--s',st);
}

// ── editing ──
// mouse: click empty = add (drag right to make it longer), drag a note to move it, drag its right edge to resize,
//        click a note (or right-click) = delete.  touch: tap empty = add, tap a note = delete, drag a note = move.
function rollPos(e){
  const r=rollArea.getBoundingClientRect(),rh=rollRowH();
  return{step:(e.clientX-r.left)/r.width*STEPS,row:Math.floor((e.clientY-r.top)/rh)};
}
function rollSnapDown(v){return Math.floor(v/rollSnap+1e-6)*rollSnap;}
function rollFitKey(m,lo,hi){
  if(!rollKeyLock||rollInKey(m))return m;
  for(let d=1;d<12;d++){if(m-d>=lo&&rollInKey(m-d))return m-d;if(m+d<=hi&&rollInKey(m+d))return m+d;}
  return m;
}
function rollCommit(L,n,skip){
  if(rollOverlapsSamePitch(L.notes,n,skip))return 'same';
  if(rollPolyAt(L.notes,n,skip)>ROLL_MAX_POLY)return 'poly';
  return '';
}
let _rd=null; // current drag
rollArea.addEventListener('contextmenu',e=>{
  const ne=e.target.closest('.roll-note');if(!ne)return;
  e.preventDefault();const L=rollLayer(rollView);L.notes=L.notes.filter(n=>n!==ne._note);renderRollNotes();autoSave();
});
rollArea.addEventListener('pointerdown',e=>{
  if(rollView<0||e.button===2)return;
  const L=rollLayer(rollView);if(!L.soundId)return;
  const{lo,hi}=rollRange(L.soundId),p=rollPos(e);
  const ne=e.target.closest('.roll-note');
  if(ne&&typeof levelAdjMode!=='undefined'&&levelAdjMode&&typeof openVelPopover==='function'){
    // VELOCITY mode: reuse the sequencer's velocity slider; it reads/writes this note's v (0..1) as 0..100
    e.preventDefault();e.stopPropagation();
    const n=ne._note,vols={};
    Object.defineProperty(vols,0,{get:()=>Math.round((n.v==null?1:n.v)*100),set:v=>{v=Math.max(5,Math.min(100,+v||100));if(v>=100)delete n.v;else n.v=v/100;
      updateRollNote(n);try{playRollNote(L.soundId,n.m,0,.3,n.v==null?1:n.v);}catch(err){}}});
    openVelPopover({vols,stepEls:[],fullStepEls:[]},0,ne);return;
  }
  if(ne){
    e.preventDefault();e.stopPropagation();
    // on a phone a 1-step note is only ~15px wide, so its resize edge would swallow every touch: only use it on wide notes
    const n=ne._note,resize=!!e.target.closest('.roll-note-h')&&(e.pointerType!=='touch'||ne.getBoundingClientRect().width>=30);
    _rd={kind:resize?'resize':'move',n,el:ne,x0:e.clientX,y0:e.clientY,p0:p,orig:{s:n.s,l:n.l,m:n.m},moved:false,id:e.pointerId};
    try{rollArea.setPointerCapture(e.pointerId);}catch(err){}
    return;
  }
  const row=p.row;if(row<0||row>=ROLL_ROWS)return;
  const s=rollSnapDown(p.step);if(s<0||s>=STEPS)return;
  const m=rollFitKey(hi-row,lo,hi);
  if(e.pointerType==='touch'){ // let touch scroll; add the note on a clean tap
    _rd={kind:'tap',x0:e.clientX,y0:e.clientY,t0:Date.now(),s,m,id:e.pointerId};return;
  }
  e.preventDefault();
  const n={s,l:Math.min(rollSnap,STEPS-s),m};
  const why=rollCommit(L,n,null);
  if(why==='poly'){showToast('🎹 Max '+ROLL_MAX_POLY+' notes at once on one layer');return;}
  if(why==='same')return;
  L.notes.push(n);renderRollNotes();playRollNote(L.soundId,m,0,Math.min(.5,n.l*60/seqBpm/4));
  _rd={kind:'new',n,x0:e.clientX,y0:e.clientY,p0:p,orig:{s:n.s,l:n.l,m:n.m},id:e.pointerId};
  try{rollArea.setPointerCapture(e.pointerId);}catch(err){}
});
rollArea.addEventListener('pointermove',e=>{
  if(!_rd||e.pointerId!==_rd.id||_rd.kind==='tap')return;
  const L=rollLayer(rollView),{lo,hi}=rollRange(L.soundId),p=rollPos(e),n=_rd.n,o=_rd.orig;
  if(Math.abs(e.clientX-_rd.x0)>4||Math.abs(e.clientY-_rd.y0)>4)_rd.moved=true;
  if(_rd.kind==='new'||_rd.kind==='resize'){
    n.l=Math.max(rollSnap,Math.min(STEPS-n.s,Math.ceil((p.step-n.s)/rollSnap-1e-6)*rollSnap));
  }else if(_rd.kind==='move'&&_rd.moved){
    const ds=Math.round((p.step-_rd.p0.step)/rollSnap)*rollSnap,dm=_rd.p0.row-p.row;
    n.s=Math.max(0,Math.min(STEPS-rollSnap,o.s+ds));n.l=Math.min(o.l,STEPS-n.s);
    const nm=Math.max(lo,Math.min(hi,o.m+dm));
    if(nm!==n.m){n.m=rollFitKey(nm,lo,hi);playRollNote(L.soundId,n.m,0,.2);}
  }
  updateRollNote(n);
});
function rollEnd(e){
  if(!_rd||e.pointerId!==_rd.id)return;
  const d=_rd;_rd=null;
  const L=rollLayer(rollView);
  if(d.kind==='tap'){
    if(e.type==='pointercancel'||Math.abs(e.clientX-d.x0)>10||Math.abs(e.clientY-d.y0)>10||Date.now()-d.t0>600)return;
    const n={s:d.s,l:Math.min(rollSnap,STEPS-d.s),m:d.m};
    const why=rollCommit(L,n,null);
    if(why==='poly'){showToast('🎹 Max '+ROLL_MAX_POLY+' notes at once on one layer');return;}
    if(why==='same')return;
    L.notes.push(n);renderRollNotes();playRollNote(L.soundId,n.m,0,.3);autoSave();return;
  }
  if(e.type==='pointercancel'){ // the browser took over the touch: put the note back, never delete it
    Object.assign(d.n,d.orig);renderRollNotes();return;
  }
  if((d.kind==='move'||d.kind==='resize')&&!d.moved){ // a click/tap on a note deletes it (also on its resize edge)
    L.notes=L.notes.filter(n=>n!==d.n);renderRollNotes();autoSave();return;
  }
  const why=rollCommit(L,d.n,d.n);
  if(why){ // the drag ended on top of another note: go back to where it was
    Object.assign(d.n,d.orig);
    if(why==='poly')showToast('🎹 Max '+ROLL_MAX_POLY+' notes at once on one layer');
  }
  renderRollNotes();autoSave();
}
rollArea.addEventListener('pointerup',rollEnd);
rollArea.addEventListener('pointercancel',rollEnd);

// clear one roll layer (or all of them)
function clearRollLayers(which){
  pianoRoll.layers.forEach((L,i)=>{if(which==='all'||which===i)L.notes=[];});
  renderRollNotes();autoSave();
}

// called on load / unlock: show the ROLL button, drop out of the roll if it isn't owned any more
function refreshRollUI(){
  const owned=musicHas('mt_piano');
  seqRollBtn.style.display=owned?'':'none';
  if(!owned||rollView>=pianoRollLayers()){if(rollView>=0||document.body.classList.contains('roll-on'))showRoll(-1);}
  else if(rollView>=0){showRoll(rollView);}
  else seqRollBtn.textContent='ROLL';
}
refreshRollUI();
// switching between phone and desktop layout (rotate / resize / Settings → LAYOUT) moves the roll in or out of full screen
addEventListener('resize',()=>{if(rollView>=0)document.body.classList.toggle('roll-full',!IS_DESKTOP);});
