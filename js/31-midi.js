// ══════════════════════════════════════════════
//  MIDI KEYBOARD (Piano Roll upgrade)
// ══════════════════════════════════════════════
// Plug in a MIDI keyboard: it plays the piano roll layer you're looking at (layer 1 when the roll is closed),
// with velocity and the sustain pedal. Turn on ● REC in the roll and press ▶: what you play is written into the roll,
// snapped to the NOTE grid. Uses the Web MIDI API (Chrome / Edge on computers, Chrome on Android; iPhone Safari has none).
const MIDI_HOLD=30; // a held note can last this long (seconds)
let midiAccess=null,midiRec=false,midiStatus='',_midiLastLayer=0,_rollAnchor=null;
const midiHeld=new Map(); // midi note → {h, on (song position), vel, layer}
let midiSustain=false;const midiSustained=new Set();
function midiOwned(){return typeof musicHas==='function'&&musicHas('mt_midi')&&musicHas('mt_piano');}
function midiSupported(){return !!(navigator.requestMIDIAccess&&window.isSecureContext!==false);}
function midiLayer(){return (typeof rollView==='number'&&rollView>=0)?rollView:Math.min(_midiLastLayer,Math.max(0,pianoRollLayers()-1));}
// where the music is (in roll steps) at audio time T, from the last step the sequencer scheduled
function midiPosAt(T){
  if(!_rollAnchor||!seqPlaying||seqMode!=='pattern')return null;
  const sd=60/seqBpm/4;let p=_rollAnchor.st+(T-_rollAnchor.at)/sd;
  return ((p%STEPS)+STEPS)%STEPS;
}
if(typeof rollPlayStep==='function'){const _r=rollPlayStep;rollPlayStep=function(roll,st,at){if(roll===pianoRoll)_rollAnchor={st,at};return _r.apply(this,arguments);};}
if(typeof showRoll==='function'){const _s=showRoll;showRoll=function(i){if(i>=0)_midiLastLayer=i;const r=_s.apply(this,arguments);return r;};}

// ── sound: a held note (stops when you let go) ──
function midiStart(m,vel){
  const li=midiLayer(),L=rollLayer(li),id=L.soundId||'rs_keys';
  const c=getCtx(),oscs=[],orig=c.createOscillator;let h=null;
  c.createOscillator=function(){const o=orig.call(this);oscs.push(o);return o;}; // collect the note's oscillators so they can stop early
  try{h=playRollNote(id,m,0,MIDI_HOLD,vel,li);}catch(e){}finally{delete c.createOscillator;}
  return h?{gate:h.gate,rel:h.rel||.05,oscs}:null;
}
function midiStop(h){
  if(!h||!h.gate)return;const c=getCtx(),now=c.currentTime;
  try{h.gate.gain.cancelScheduledValues(now);h.gate.gain.setValueAtTime(h.gate.gain.value,now);h.gate.gain.setTargetAtTime(0,now,Math.max(.02,h.rel/3));}catch(e){}
  h.oscs.forEach(o=>{try{o.stop(now+Math.max(.08,h.rel*3)+.05);}catch(e){}});
}
// ── recording into the roll ──
function midiCommitNote(m,on,off,vel,li){
  const L=rollLayer(li);if(!L.soundId)return;
  const snap=rollSnap,q=v=>Math.round(v/snap)*snap;
  let s=q(on);if(s>=STEPS)s-=STEPS;
  let len=off-on;if(len<0)len+=STEPS;len=Math.max(snap,q(len));len=Math.min(len,STEPS-s);
  const{lo,hi}=rollRange(L.soundId);while(m<lo)m+=12;while(m>hi)m-=12;
  m=rollFitKey(m,lo,hi);
  const n={s,l:len,m};if(musicHas('mt_velocity')&&vel<.97)n.v=Math.max(.05,+vel.toFixed(2));
  if(rollCommit(L,n,null))return; // same note already there / too many notes at once
  L.notes.push(n);if(rollView===li)renderRollNotes();
  clearTimeout(midiCommitNote._t);midiCommitNote._t=setTimeout(()=>autoSave(),800);
}
function midiHeardTime(){const c=getCtx();return c.currentTime-(c.outputLatency||c.baseLatency||0);} // you play along to what you hear
function midiNoteOn(m,v){
  getCtx();
  if(midiHeld.has(m))midiNoteOff(m,true);
  midiSustained.delete(m);
  const vel=Math.max(.12,v/127),li=midiLayer();
  const h=midiStart(m,vel);
  const on=midiRec&&rollView>=0?midiPosAt(midiHeardTime()):null;
  midiHeld.set(m,{h,on,vel,li});
  if(rollView>=0)midiFlashKey(m);
}
function midiNoteOff(m,force){
  const e=midiHeld.get(m);if(!e)return;
  if(midiSustain&&!force){midiSustained.add(m);return;}
  midiHeld.delete(m);midiStop(e.h);
  if(e.on!=null){const off=midiPosAt(midiHeardTime());if(off!=null)midiCommitNote(m,e.on,off,e.vel,e.li);}
}
function midiMessage(ev){
  const d=ev.data;if(!d||d.length<2)return;
  const st=d[0]&0xf0,a=d[1],b=d.length>2?d[2]:0;
  if(!midiOwned())return;
  if(st===0x90&&b>0)midiNoteOn(a,b);
  else if(st===0x80||(st===0x90&&b===0))midiNoteOff(a);
  else if(st===0xb0&&a===64){ // sustain pedal
    midiSustain=b>=64;
    if(!midiSustain){[...midiSustained].forEach(m=>midiNoteOff(m,true));midiSustained.clear();}
  }else if(st===0xb0&&(a===120||a===123)){[...midiHeld.keys()].forEach(m=>midiNoteOff(m,true));}
}
function midiAttach(){
  if(!midiAccess)return;
  const ins=[...midiAccess.inputs.values()];
  ins.forEach(i=>{i.onmidimessage=midiMessage;});
  midiStatus=ins.length?ins.map(i=>i.name||'MIDI keyboard').join(', '):'';
  if(typeof buildRollBar==='function'&&rollView>=0)buildRollBar();
}
async function midiConnect(quiet){
  if(!midiSupported()){if(!quiet)showToast('🎹 This browser can\'t use MIDI keyboards. Try Chrome or Edge on a computer, or Chrome on Android.');return false;}
  try{
    midiAccess=midiAccess||await navigator.requestMIDIAccess({sysex:false});
    midiAccess.onstatechange=()=>midiAttach();
    midiAttach();try{localStorage.setItem('ab2_midiOn','1');}catch(e){}
    if(!quiet)showToast(midiStatus?'🎹 Connected: '+midiStatus:'🎹 MIDI is on. Plug in a keyboard (it connects by itself).');
    return true;
  }catch(e){if(!quiet)showToast('🎹 MIDI was blocked. Allow MIDI devices for this site in your browser settings.');return false;}
}
function midiFlashKey(m){
  const keys=document.querySelectorAll('.roll-key');const L=rollLayer(rollView);if(!L.soundId)return;
  const{hi}=rollRange(L.soundId),el=keys[hi-m];if(!el)return;
  el.classList.add('midi-on');setTimeout(()=>el.classList.remove('midi-on'),160);
}
// roll toolbar: 🎹 MIDI (connect / status) and ● REC
if(typeof buildRollBar==='function'){const _b=buildRollBar;buildRollBar=function(){
  const r=_b.apply(this,arguments);
  if(!midiOwned()||rollView<0)return r;
  const back=seqRollBar.querySelector('.roll-back');
  const mk=(t,cls,tip,fn)=>{const b=document.createElement('button');b.className='roll-chip'+(cls?' '+cls:'');b.textContent=t;b.title=tip;b.addEventListener('click',e=>{e.stopPropagation();fn();});seqRollBar.insertBefore(b,back);return b;};
  mk(midiAccess?(midiStatus?'🎹 '+midiStatus.slice(0,14).toUpperCase():'🎹 NO KEYBOARD'):'🎹 MIDI',midiAccess&&midiStatus?'on':'','Use a MIDI keyboard',()=>midiConnect(false));
  if(midiAccess)mk(midiRec?'● REC ON':'● REC',midiRec?'midi-rec on':'midi-rec','Record what you play into this layer while the sequencer plays (snapped to the NOTE size)',()=>{
    midiRec=!midiRec;buildRollBar();if(midiRec&&!seqPlaying)showToast('🎹 Press ▶ and play: notes are written into this layer, snapped to the NOTE grid.');});
  return r;
};}
// reconnect on its own (no prompt) if a keyboard was used before
try{if(localStorage.getItem('ab2_midiOn')==='1'&&midiSupported()&&navigator.permissions&&navigator.permissions.query)
  navigator.permissions.query({name:'midi'}).then(p=>{if(p.state==='granted')midiConnect(true);}).catch(()=>{});}catch(e){}
// a stopped sequencer / closed roll lets go of every key
addEventListener('blur',()=>{[...midiHeld.keys()].forEach(m=>midiNoteOff(m,true));});
