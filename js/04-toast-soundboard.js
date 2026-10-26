
// ══════════════════════════════════════════════
//  TOAST NOTIFICATION
// ══════════════════════════════════════════════
let toastTimer=null;
function showToast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;
  // sit just under the score numbers (covering the energy meter, which matters less)
  try{const em=document.getElementById('energyMeter'),sc=document.getElementById('scoreSectionBtn');
    let r=em&&em.offsetParent!==null?em.getBoundingClientRect():null;
    const top=r&&r.height>0?r.top:(sc?sc.getBoundingClientRect().bottom:0);
    if(top>0)el.style.top=(top+4)+'px';}catch(e){}
  el.classList.add('show');
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),2500);
}

// ══════════════════════════════════════════════
//  SOUNDBOARD PANEL
// ══════════════════════════════════════════════
const soundboardBtn=document.getElementById('soundboardBtn');
const soundboardPanel=document.getElementById('soundboardPanel');
const masterVolSlider=document.getElementById('masterVolSlider');
const masterMuteBtn=document.getElementById('masterMuteBtn');
let masterMuted=false;

function updateSoundboardUnlocked(){
  soundboardBtn.textContent='⚙ OPTIONS';
  if(document.getElementById('sbTitle'))document.getElementById('sbTitle').textContent='⚙ OPTIONS';

}
const masterVolNum=document.getElementById('masterVolNum');
// master volume is remembered between sessions
function _saveMasterVol(){try{localStorage.setItem('ab2_masterVol',String(masterVol));}catch(e){}}
try{
  const _mv=parseFloat(localStorage.getItem('ab2_masterVol'));
  if(isFinite(_mv)&&_mv>=0&&_mv<=1){masterVol=_mv;masterVolSlider.value=_mv;if(masterVolNum)masterVolNum.value=Math.round(_mv*100);}
}catch(e){}
masterVolSlider.addEventListener('input',()=>{
  masterVol=parseFloat(masterVolSlider.value);_saveMasterVol();
  if(masterGainNode)masterGainNode.gain.value=masterMuted?0:masterVol;
  if(masterVolNum)masterVolNum.value=Math.round(masterVol*100);
});
masterVolNum&&masterVolNum.addEventListener('change',()=>{
  const v=Math.min(100,Math.max(0,parseInt(masterVolNum.value)||0));
  masterVolNum.value=v;masterVol=v/100;masterVolSlider.value=v/100;_saveMasterVol();
  if(masterGainNode)masterGainNode.gain.value=masterMuted?0:masterVol;
});
// Reset viewport zoom after any number input loses focus (iOS fix)
function resetViewportZoom(){
  const vp=document.querySelector('meta[name=viewport]');
  if(!vp)return;
  vp.content='width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no';
  requestAnimationFrame(()=>{vp.content='width=device-width,initial-scale=1.0,user-scalable=no';});
}
document.addEventListener('blur',e=>{
  if(e.target&&(e.target.classList.contains('pa-vol-num')||e.target.classList.contains('sb-vol-num')||e.target.id==='masterVolNum')){
    resetViewportZoom();
  }
},true);
masterMuteBtn&&masterMuteBtn.addEventListener('click',()=>{
  masterMuted=!masterMuted;
  masterMuteBtn.textContent=masterMuted?'🔇':'🔊';
  masterMuteBtn.classList.toggle('muted',masterMuted);
  if(masterGainNode)masterGainNode.gain.value=masterMuted?0:masterVol;
});
soundboardBtn.addEventListener('click',e=>{e.stopPropagation();soundboardPanel.classList.toggle('open');});
document.getElementById('saveQuitBtn')&&document.getElementById('saveQuitBtn').addEventListener('click',()=>{
  autoSave();
  activeSlot=-1;
  if(typeof goToHomeScreen==='function') goToHomeScreen();
  else location.reload();
});

const bgMusicToggleEl=document.getElementById('bgMusicToggle');
bgMusicToggleEl&&bgMusicToggleEl.addEventListener('change',()=>{
  musicOn=bgMusicToggleEl.checked;
  if(ambGain){
    const now=audioCtx.currentTime;
    ambGain.gain.cancelScheduledValues(now);
    ambGain.gain.setValueAtTime(ambGain.gain.value,now);
    ambGain.gain.linearRampToValueAtTime(musicOn?AMB_LEVEL:0,now+0.8);
  }
});
document.addEventListener('click',e=>{if(!soundboardPanel.contains(e.target)&&e.target!==soundboardBtn)soundboardPanel.classList.remove('open');});
