// ══════════════════════════════════════════════
//  MUSICAL TOOLKIT UNLOCKS (skill tree → sequencer features)
// ══════════════════════════════════════════════
// A brand-new sequencer is just: play, BPM, tracks, steps. Everything else appears as the player buys it
// in the Musical Toolkit branch of the skill tree:
//   32 / 64 Steps → STEPS button · Reverb / Echo → EFFECTS button · Key → KEY button (+ key packs)
//   Velocity → VELOCITY button · Arrangement Mode → PAT / ARR switch · Song Mode → SONG
// Locked controls are hidden, not greyed out, so the first look at the sequencer stays simple.
function _muShow(id,on){const el=document.getElementById(id);if(el)el.style.display=on?'':'none';}

function applyMusicUnlocks(justBoughtId){
  // ── loop length ──
  const lvl=musicHas('mt_steps64')?2:(musicHas('mt_steps32')?1:0);
  shop.seqStepsLevel=lvl;
  if(justBoughtId==='mt_steps32'||justBoughtId==='mt_steps64'){
    STEPS=justBoughtId==='mt_steps64'?64:32;applyStepCount(); // switch to the new length straight away
  }else if((STEPS===32&&lvl<1)||(STEPS===64&&lvl<2)){
    STEPS=16;applyStepCount();
  }
  if(typeof updateStepsBtn==='function')updateStepsBtn();

  // ── key: the KEY hub turns it on in C major; packs add more keys ──
  if(musicHas('mt_key')){
    if(seqKey==null||!keyUnlocked(seqKey,seqKeyMinor)){seqKey=0;seqKeyMinor=false;}
  }else{
    seqKey=null;seqKeyMinor=false;
  }
  _muShow('vtbKeyBtn',musicHas('mt_key'));

  // ── effects ──
  _muShow('vtbFxBtn',musicHas('mt_reverb')||musicHas('mt_echo'));

  // ── velocity ──
  const vel=musicHas('mt_velocity');
  _muShow('seqLevelAdjBtn',vel);_muShow('seqFullLevelAdjBtn',vel);
  if(!vel&&typeof levelAdjMode!=='undefined'&&levelAdjMode&&typeof setLevelAdjMode==='function')setLevelAdjMode(false);

  // ── pattern / arrangement / song switch ──
  const arr=musicHas('mt_arrange'),song=musicHas('mt_song');
  const pills=document.querySelector('.seq-mode-pills');if(pills)pills.style.display=arr?'':'none';
  _muShow('seqModeSongBtn',song);
  if((seqMode==='arrange'&&!arr)||(seqMode==='song'&&!song)){if(typeof setSeqMode==='function')setSeqMode('pattern');}

  if(typeof window.refreshKeyFxButtons==='function')window.refreshKeyFxButtons();

  // a short pointer to where the new feature lives
  const where={
    mt_steps32:'🔢 32 steps! Switch loop length with the STEPS button.',
    mt_steps64:'🔢 64 steps! Switch loop length with the STEPS button.',
    mt_reverb:'🏛 Reverb unlocked: open EFFECTS under the sequencer.',
    mt_echo:'📣 Echo unlocked: open EFFECTS under the sequencer.',
    mt_key:'🎼 The KEY button is here. Your song is now in C major.',
    mt_velocity:'📶 VELOCITY button unlocked at the top of the sequencer.',
    mt_arrange:'🧩 PAT / ARR switch unlocked at the top of the sequencer.',
    mt_song:'💿 SONG mode unlocked next to PAT / ARR.',
  }[justBoughtId];
  if(where&&typeof showToast==='function')setTimeout(()=>showToast(where),1600);
  if(justBoughtId&&/^mt_keys\d$/.test(justBoughtId)&&typeof showToast==='function'){
    const pk=KEY_PACKS[+justBoughtId.slice(7)-1];
    if(pk)setTimeout(()=>showToast('🎹 New keys: '+pk.long+'. Pick them with the KEY button.'),1600);
  }
}
// first paint (before a save slot is loaded everything starts locked)
applyMusicUnlocks();
