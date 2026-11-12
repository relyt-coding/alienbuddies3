// ══════════════════════════════════════════════
//  THEME SONGS — every buddy can have its own song (comes with the Best Buddy unlock).
//  Bunker → open a buddy → 🎵 MAKE A SONG FOR THIS BUDDY: the full-screen sequencer opens on a clean slate
//  (same tracks and sounds, no notes). Whatever you make is saved as that buddy's theme when you close it;
//  your own pattern is put back exactly as it was. Saved on alienData[i].song = {steps, bpm, layers, roll}.
//  The Best Buddy page plays it with its own little player (it doesn't touch the main sequencer or score).
// ══════════════════════════════════════════════
let _themeEdit=null;   // {idx, stash} while a theme song is open in the sequencer
function _edSnap(){return{steps:STEPS,bpm:seqBpm,mode:seqMode,layers:seqLayers.map(l=>({soundId:l.soundId,steps:l.steps.slice(),vols:l.vols.slice(),muted:!!l.muted})),
  roll:(typeof pianoRoll!=='undefined'&&pianoRoll)?JSON.parse(JSON.stringify({layers:pianoRoll.layers.map(L=>({soundId:L.soundId,muted:L.muted,notes:L.notes}))})):null};}
function _edApply(s){
  seqLayersContainer.innerHTML='';seqLayers=[];
  STEPS=s.steps||16;
  (s.layers||[]).forEach(l=>{if(seqLayers.length>=drum.seqTracks)return;addSeqLayer(l.soundId,padSteps(l.steps,false),padSteps(l.vols,100));const L=seqLayers[seqLayers.length-1];
    if(l.muted&&L){L.muted=true;const mb=L.el&&L.el.querySelector('.seq-rc-btn');if(mb)mb.classList.add('muted');}});
  if(typeof applyStepCount==='function')applyStepCount();ensureAllTracks();updateSeqAddBtn();
  if(typeof rollSanitize==='function')pianoRoll=rollSanitize(s.roll);
  if(s.bpm){seqBpm=s.bpm;if(typeof updateBpmDisplay==='function')updateBpmDisplay();}
  setSeqMode('pattern');if(typeof refreshRollUI==='function')refreshRollUI();
  if(document.getElementById('seqFullModal').classList.contains('open')){seqFullLayers.innerHTML='';seqFullLayers.appendChild(seqFullPhBar);seqLayers.forEach(l=>addFullLayerRow(l));updateSeqFullAddBtn();}
}
function themeStartEdit(idx){
  if(_themeEdit)return;
  if(!drum.seqTracks){showToast('🎛 Unlock the sequencer in the shop first, then make a theme song!');return;}
  if(seqPlaying&&typeof stopSeq==='function')stopSeq();
  themeStop();
  const ad=alienData[idx];if(!ad)return;
  const stash=_edSnap();_themeEdit={idx,stash};
  if(ad.song)_edApply(ad.song);
  else _edApply({steps:16,bpm:stash.bpm,layers:stash.layers.map(l=>({soundId:l.soundId,steps:[],vols:[],muted:false})),roll:stash.roll?{layers:stash.roll.layers.map(L=>({soundId:L.soundId,muted:L.muted,notes:[]}))}:null});
  // close the bunker pop-up, open the big sequencer with a banner on top
  try{if(typeof closeAlienNameModal==='function')closeAlienNameModal();else document.getElementById('alienNameModal').classList.remove('open');}catch(e){}
  openSeqFull();
  let b=document.getElementById('themeBanner');
  if(!b){b=document.createElement('div');b.id='themeBanner';b.innerHTML='<div class="tb-txt"><small>🎵 THEME SONG FOR</small><b id="tbName"></b></div><button id="tbCancel">CANCEL</button><button id="tbSave" class="ok">SAVE SONG</button>';
    const inner=document.getElementById('seqFullInner')||document.getElementById('seqFullModal');inner.insertBefore(b,inner.firstChild);
    document.getElementById('tbSave').onclick=()=>closeSeqFull();document.getElementById('tbCancel').onclick=()=>{themeFinish(false);closeSeqFull();};}
  document.getElementById('tbName').textContent=(ad.name||('BUDDY #'+(idx+1))).toUpperCase();b.style.display='flex';b.style.setProperty('--c',typeof getAlienColor==='function'?getAlienColor(idx):'#ffd23f');
  showToast('🎵 Clean slate! Make a song for '+(ad.name||'this buddy')+' · it saves when you close the sequencer');
}
function themeFinish(save){
  if(!_themeEdit)return;const{idx,stash}=_themeEdit;
  if(seqPlaying&&typeof stopSeq==='function')stopSeq();
  if(save){const s=_edSnap(),has=s.layers.some(l=>l.steps.slice(0,s.steps).some(Boolean))||(s.roll&&s.roll.layers.some(L=>L.notes.length));
    const ad=alienData[idx];if(ad){if(has){ad.song={steps:s.steps,bpm:s.bpm,layers:s.layers.map(l=>({soundId:l.soundId,steps:l.steps.slice(0,s.steps),vols:l.vols.slice(0,s.steps),muted:l.muted})),roll:s.roll&&s.roll.layers.some(L=>L.notes.length)?s.roll:null};
      showToast('🎵 Saved '+(ad.name||'your buddy')+'’s theme song! Play it on the Best Buddy page');}else if(!ad.song)showToast('No notes yet, so no theme song was saved');}}
  _themeEdit=null;_edApply(stash);seqMode=stash.mode;try{setSeqMode(stash.mode);}catch(e){}
  const b=document.getElementById('themeBanner');if(b)b.style.display='none';
  if(typeof autoSave==='function')autoSave();if(typeof bbRefresh==='function')bbRefresh();
}
(function(){
  const C=window.closeSeqFull;window.closeSeqFull=function(){if(_themeEdit)themeFinish(true);return C.apply(this,arguments);};
  // while a theme song is open, the save keeps your real pattern (never the song in progress)
  window._abSaveHooks.push(d=>{if(!_themeEdit)return d;const s=_themeEdit.stash;return Object.assign(d,{seqLayersSnap:s.layers,seqSteps:s.steps,seqBpm:s.bpm,seqMode:s.mode,pianoRoll:s.roll||d.pianoRoll});});
  // bunker pop-up: 🎵 MAKE A SONG FOR THIS BUDDY
  const host=document.getElementById('anmDesignBtn');if(!host)return;
  const b=document.createElement('button');b.id='anmSongBtn';b.type='button';b.textContent='🎵 MAKE A SONG FOR THIS BUDDY';host.parentNode.insertBefore(b,host.nextSibling);
  b.addEventListener('click',()=>{if(!(typeof bbOn==='function'&&bbOn())){showToast('🔒 Unlock BEST BUDDY on the Alien Evolution path to make theme songs');return;}if(alienProfileIdx!=null)themeStartEdit(alienProfileIdx);});
  const R=window.renderAlienProfile;window.renderAlienProfile=function(){const r=R.apply(this,arguments);const ok=typeof bbOn==='function'&&bbOn(),ad=alienData[alienProfileIdx]||{};
    b.style.display=ok?'':'none';b.textContent=ad.song?'🎵 EDIT THIS BUDDY’S THEME SONG':'🎵 MAKE A SONG FOR THIS BUDDY';return r;};
})();

// ── the little player for the Best Buddy page ──
let _thPlay=null;
function themeIsPlaying(){return !!_thPlay;}
function themeStop(){if(!_thPlay)return;clearInterval(_thPlay.timer);_thPlay=null;window._themeBeat=0;if(typeof bbRefresh==='function')bbRefresh();}
function themePlay(idx){
  themeStop();const song=alienData[idx]&&alienData[idx].song;if(!song)return;
  if(seqPlaying&&typeof stopSeq==='function')stopSeq();
  let c;try{c=getCtx();if(c.state==='suspended')c.resume();}catch(e){return;}
  const sd=60/(song.bpm||100)/4,n=song.steps||16;let step=0,next=c.currentTime+.08;
  const tick=()=>{while(next<c.currentTime+.12){const st=step%n,at=next;
      song.layers.forEach((l,li)=>{if(l.steps[st]&&!l.muted&&SOUND_MAP[l.soundId]){const v=(l.vols&&l.vols[st]!=null?l.vols[st]:100)/100;playSound(l.soundId,v,at,li);}});
      if(song.roll&&typeof playRollNote==='function'&&typeof musicHas==='function'&&musicHas('mt_piano')){const nl=typeof pianoRollLayers==='function'?pianoRollLayers():1;
        song.roll.layers.forEach((L,li)=>{if(li>=nl||!L||L.muted||!SOUND_MAP[L.soundId])return;L.notes.forEach(nt=>{if(nt.s>=st&&nt.s<st+1)playRollNote(L.soundId,nt.m,at+(nt.s-st)*sd,nt.l*sd,nt.v==null?1:nt.v,li);});});}
      if(st%4===0){const ms=(at-c.currentTime)*1000;setTimeout(()=>{window._themeBeat=performance.now();},Math.max(0,ms));}
      step++;next+=sd;}};
  _thPlay={idx,timer:setInterval(tick,25)};tick();
  if(typeof bbRefresh==='function')bbRefresh();
}
