// ══════════════════════════════════════════════
//  CONTROLLER SUPPORT (Gamepad API: PS4/PS5 DualShock/DualSense, Xbox, Switch Pro, etc.)
//  Pads fire from buttons (rebindable per pad), START plays/stops the sequencer,
//  and the pad-assign window can be bound with a button press.
// ══════════════════════════════════════════════
const GP_DEFAULTS=[0,1,2,3,4,5,6,7]; // pad 1-8 -> Cross/A, Circle/B, Square/X, Triangle/Y, L1, R1, L2, R2 (standard mapping)
const GP_NAMES=['✕','○','□','△','L1','R1','L2','R2','SHARE','OPTIONS','L3','R3','D↑','D↓','D←','D→','PS'];
let padGpBindings={};   // { padIdx: buttonIndex }
let gpRumble=true;
function gpEnabled(){return !!(typeof v5Settings!=='undefined'&&v5Settings.controllerOn);} // Settings -> CONTROLLER SUPPORT
(function(){
  try{const s=JSON.parse(localStorage.getItem('ab2_pad_gp')||'null');if(s&&typeof s==='object')padGpBindings=s;}catch(e){}
  try{const r=localStorage.getItem('ab2_gp_rumble');if(r!==null)gpRumble=r!=='0';}catch(e){}
})();
function saveGpBindings(){try{localStorage.setItem('ab2_pad_gp',JSON.stringify(padGpBindings));}catch(e){}}
function gpBtnName(i){return GP_NAMES[i]||('BTN '+i);}
function gpButtonFor(padIdx){return padGpBindings[padIdx]!==undefined?padGpBindings[padIdx]:GP_DEFAULTS[padIdx];}

let gpPrev={};          // per-controller previous pressed state
let gpRAF=0,gpCount=0,gpListen=null; // gpListen: callback while waiting for a binding press
function gpPressed(b){return !!b&&(b.pressed||b.value>0.5);}

function gpRumblePulse(pad){
  return; // v0.2.61: controller vibration removed
  if(!gpRumble||!pad)return;
  try{
    const a=pad.vibrationActuator;
    if(a&&a.playEffect)a.playEffect('dual-rumble',{startDelay:0,duration:35,weakMagnitude:.5,strongMagnitude:.2});
  }catch(e){}
}
function gpHandleButton(pad,i){
  if(gpListen){const cb=gpListen;gpListen=null;cb(i);return;}
  if(!document.body.classList.contains('game-active'))return;
  if(typeof bindingListenActive!=='undefined'&&bindingListenActive)return;
  const assign=document.getElementById('padAssignModal');
  if(assign&&assign.classList.contains('open'))return; // don't play while a window is open
  if(i===9){ // OPTIONS/START: play / stop the sequencer
    if(typeof seqPlaying==='undefined'||typeof startSeq!=='function')return;
    if(seqPlaying)stopSeq();else{getCtx();startSeq();}
    gpRumblePulse(pad);return;
  }
  let fired=false;
  for(let p=0;p<padEls.length&&p<8;p++){
    if(gpButtonFor(p)===i){firePad(p);fired=true;}
  }
  if(fired)gpRumblePulse(pad);
}
function gpPoll(){
  gpRAF=0;
  if(!gpCount||!gpEnabled())return; // off: stop polling entirely
  gpRAF=requestAnimationFrame(gpPoll);
  if(document.hidden)return;
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  for(const pad of pads){
    if(!pad||!pad.connected)continue;
    const prev=gpPrev[pad.index]||(gpPrev[pad.index]=[]);
    for(let i=0;i<pad.buttons.length;i++){
      const down=gpPressed(pad.buttons[i]);
      if(down&&!prev[i])gpHandleButton(pad,i);
      prev[i]=down;
    }
  }
}
function gpStart(){if(!gpRAF&&gpCount&&gpEnabled())gpRAF=requestAnimationFrame(gpPoll);}
addEventListener('gamepadconnected',e=>{
  gpCount++;gpPrev[e.gamepad.index]=[];
  if(gpEnabled())try{showToast('🎮 Controller connected — '+(e.gamepad.id||'').replace(/\(.*$/,'').slice(0,28));}catch(_){}
  gpStart();updateGpRow();
});
addEventListener('gamepaddisconnected',e=>{
  gpCount=Math.max(0,gpCount-1);delete gpPrev[e.gamepad.index];
  if(gpEnabled())try{showToast('🎮 Controller disconnected');}catch(_){}
  updateGpRow();
});
// Chrome sometimes only reports a pad after a first button press; also pick up pads already plugged in
setTimeout(()=>{try{const l=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];if(l.length&&!gpCount){gpCount=l.length;gpStart();}}catch(e){}},800);

// ── Binding UI inside the pad-assign window ──
function updateGpRow(){
  const row=document.getElementById('padGpRow');
  if(row)row.style.display=gpEnabled()?'flex':'none'; // only shown when CONTROLLER SUPPORT is on
  const disp=document.getElementById('padGpDisplay');if(!disp)return;
  const p=(typeof padAssignIdx!=='undefined')?padAssignIdx:null;
  const note=document.getElementById('padGpNote');
  if(note)note.textContent=gpCount?'':'(plug in / press a button on your controller)';
  if(p===null||p===undefined){disp.textContent='CLICK TO BIND';return;}
  const b=gpButtonFor(p);
  if(b===undefined||b<0){disp.style.color=b<0?'#664444':'#a0a8ff';disp.textContent=b<0?'UNBOUND':'CLICK TO BIND';return;}
  disp.style.color='#00ff88';disp.textContent=gpBtnName(b);
}
(function(){
  const disp=document.getElementById('padGpDisplay'),clr=document.getElementById('padGpClear'),modal=document.getElementById('padAssignModal');
  if(disp)disp.addEventListener('click',e=>{
    e.stopPropagation();
    if(padAssignIdx===null)return;
    const idx=padAssignIdx;
    disp.textContent='PRESS A CONTROLLER BUTTON…';disp.style.color='#e8ff00';
    gpListen=i=>{padGpBindings[idx]=i;saveGpBindings();updateGpRow();};
    if(!gpCount){gpCount=1;gpStart();} // start polling in case the browser hasn't announced the pad yet
  });
  if(clr)clr.addEventListener('click',e=>{
    e.stopPropagation();
    if(padAssignIdx===null)return;
    padGpBindings[padAssignIdx]=-1; // -1 = unbound (no button fires this pad)
    saveGpBindings();updateGpRow();
  });
  if(modal)new MutationObserver(()=>{if(modal.classList.contains('open'))updateGpRow();else gpListen=null;}).observe(modal,{attributes:true,attributeFilter:['class']});
})();

// ── Settings toggle ──
(function(){
  const t=document.getElementById('settingsController');
  if(!t)return;
  t.checked=gpEnabled();
  t.addEventListener('change',()=>{
    v5Settings.controllerOn=t.checked;
    try{saveV5Settings();}catch(e){}
    if(t.checked){
      // pick up a controller that is already plugged in
      try{const l=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];gpCount=Math.max(gpCount,l.length);}catch(e){}
      gpStart();
      showToast('🎮 Controller support on — press a button on your controller');
    }else{
      gpListen=null;
      showToast('🎮 Controller support off');
    }
    updateGpRow();
  });
})();
