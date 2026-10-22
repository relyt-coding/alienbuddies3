
// ══════════════════════════════════════════════
//  SCORE STATS MODAL
// ══════════════════════════════════════════════
const scoreStatsModal=document.getElementById('scoreStatsModal');
const scoreStatsList=document.getElementById('scoreStatsList');

function openScoreStats(){
  buildScoreStats();
  scoreStatsModal.classList.add('open');
}
function closeScoreStats(){scoreStatsModal.classList.remove('open');}

document.getElementById('scoreStatsClose')&&document.getElementById('scoreStatsClose').addEventListener('click',closeScoreStats);
scoreStatsModal&&scoreStatsModal.addEventListener('pointerdown',e=>{if(e.target===scoreStatsModal)closeScoreStats();});
document.getElementById('scoreSectionBtn')&&document.getElementById('scoreSectionBtn').addEventListener('click',openScoreStats);

function ssRow(icon,label,desc,val,isActive,colorClass){
  const row=document.createElement('div');row.className='ss-row'+(isActive?' active':'');
  const ic=document.createElement('div');ic.className='ss-icon';ic.textContent=icon;
  const info=document.createElement('div');info.className='ss-info';
  const lb=document.createElement('div');lb.className='ss-label'+(isActive?' active':'');lb.textContent=label;
  const ds=document.createElement('div');ds.className='ss-desc'+(isActive?' active':'');ds.textContent=desc;
  info.appendChild(lb);info.appendChild(ds);
  const vl=document.createElement('div');vl.className='ss-val'+(isActive?' active':'')+(colorClass?' '+colorClass:'');vl.textContent=val;
  row.appendChild(ic);row.appendChild(info);row.appendChild(vl);
  return row;
}
function ssLabel(text){
  const el=document.createElement('div');el.className='ss-section-label';el.textContent=text;return el;
}

function buildScoreStats(){
  scoreStatsList.innerHTML='';
  const mult=totalMultiplier();
  const cpt=clicksPerTap();
  const alienMult=alienMultiplier();
  const tierMult=tiers.reduce((m,t,i)=>t.multiplierActive?m*tierMultValue(i):m,1);

  // ── TOTAL ──
  const totalRow=document.createElement('div');totalRow.className='ss-total-row';
  const tl=document.createElement('div');tl.className='ss-total-label';tl.textContent='TOTAL MULTIPLIER';
  const tv=document.createElement('div');tv.className='ss-total-val';tv.textContent=`×${formatMult(mult)}`;
  totalRow.appendChild(tl);totalRow.appendChild(tv);
  scoreStatsList.appendChild(totalRow);

  // ── SCORE ──
  scoreStatsList.appendChild(ssLabel('CURRENT SCORE'));
  scoreStatsList.appendChild(ssRow('🏆','SCORE','Your total accumulated points',formatNum(score),true,'gold'));

  // ── PER TAP ──
  scoreStatsList.appendChild(ssLabel('PER TAP'));
  const ptVal=formatNum(Math.floor(mult*cpt));
  scoreStatsList.appendChild(ssRow('👆','POINTS PER TAP',`×${formatMult(mult)} × ${cpt} click${cpt>1?'s':''}`,ptVal,true,'green'));
  if(cpt>1){
    scoreStatsList.appendChild(ssRow('🖱','MULTI-CLICK',`Tap counts as ${cpt} clicks`,`×${cpt}`,true));
  }

  // ── MULTIPLIERS ──
  scoreStatsList.appendChild(ssLabel('MULTIPLIERS'));
  // Tier multipliers
  const activeTiers=tiers.map((t,i)=>({t,i})).filter(({t})=>t.multiplierActive);
  if(activeTiers.length>0){
    activeTiers.forEach(({t,i})=>{
      scoreStatsList.appendChild(ssRow('⚡',`DRUMPAD TIER ${i+1}`,`Dot streak reward · stacks`,`×${tierMultValue(i).toLocaleString()}`,true));
    });
    if(activeTiers.length>1){
      scoreStatsList.appendChild(ssRow('🔗','TIER COMBINED','All active tiers multiplied together',`×${tierMult.toLocaleString()}`,true));
    }
  } else {
    scoreStatsList.appendChild(ssRow('⚡','DRUMPAD TIERS','Tap pads to fill dot rows',`×1`,false));
  }

  // Shop multiplier
  if(shop.multLevel>=0){
    scoreStatsList.appendChild(ssRow('🥁',`DRUMPAD ×${dotBase(shop.multLevel)} DOTS`,`Shop upgrade · pad dot rows climb in ×${dotBase(shop.multLevel)}s`,'ACTIVE',true));
  } else {
    scoreStatsList.appendChild(ssRow('🥁','DRUMPAD ×4 DOTS','Unlock in shop · pad dot rows climb in ×4s','OFF',false));
  }

  // Alien multiplier
  if(totalAliens>0){
    const perAlien=1.1+(shop.alienBoostLevel>=0?(shop.alienBoostLevel+1)*0.3:0);
    scoreStatsList.appendChild(ssRow('👽','ALIEN BOOST',`${totalAliens} alien${totalAliens>1?'s':''} · ×${perAlien.toFixed(1)}/alien`,`×${formatMult(alienMult)}`,true,'green'));
    if(shop.alienBoostLevel>=0){
      scoreStatsList.appendChild(ssRow('💉','ALIEN POWER',`Boost level ${shop.alienBoostLevel+1} · ×${perAlien.toFixed(1)} per alien`,`+${(perAlien-1.1).toFixed(1)}/alien`,true));
    }
  } else {
    scoreStatsList.appendChild(ssRow('👽','ALIEN BOOST','Buy aliens to multiply your score',`×1`,false));
  }

  // ── TIPS ──
  if(tipsOwned>0){
    scoreStatsList.appendChild(ssLabel('TIPS'));
    scoreStatsList.appendChild(ssRow('💡',`TIPS (${tipsOwned})`,`${tipsOwned} tip${tipsOwned!==1?'s':''} purchased · ×1.5 each`,`×${formatMult(tipsMult)}`,true,'green'));
  }

  // ── MATCHING GAME ──
  if(matchingMultiplier>1||matchLevelsCompleted>0){
    scoreStatsList.appendChild(ssLabel('MATCHING GAME'));
    scoreStatsList.appendChild(ssRow('🃏','MATCHING GAME',`${matchLevelsCompleted} level${matchLevelsCompleted!==1?'s':''} completed`,`×${formatMult(matchingMultiplier)}`,matchingMultiplier>1,'green'));
  }

  // ── DRUM ──
  const drumMult=drumMultiplier();
  const extraPads=Math.max(0,drum.pads-1);
  const drumTotal=extraPads+drum.extraSounds+drum.seqTracks;
  scoreStatsList.appendChild(ssLabel('DRUM MACHINE'));
  if(drumTotal>0){
    if(extraPads>0)scoreStatsList.appendChild(ssRow('🥁',`EXTRA PADS (${extraPads})`,`${extraPads} unlocked pad${extraPads>1?'s':''} · ×1.5 each`,`×${formatMult(Math.pow(1.5,extraPads))}`,true,'green'));
    if(drum.extraSounds>0)scoreStatsList.appendChild(ssRow('🎵',`EXTRA SOUNDS (${drum.extraSounds})`,`${drum.extraSounds} sound${drum.extraSounds>1?'s':''} unlocked · ×1.5 each`,`×${formatMult(Math.pow(1.5,drum.extraSounds))}`,true,'green'));
    if(drum.seqTracks>0)scoreStatsList.appendChild(ssRow('🎛',`SEQUENCER TRACKS (${drum.seqTracks})`,`${drum.seqTracks} track${drum.seqTracks>1?'s':''} · ×1.5 each`,`×${formatMult(Math.pow(1.5,drum.seqTracks))}`,true,'green'));
    if(drumTotal>1)scoreStatsList.appendChild(ssRow('🔗','DRUM COMBINED','All drum upgrades multiplied',`×${formatMult(drumMult)}`,true,'green'));
  } else {
    scoreStatsList.appendChild(ssRow('🥁','DRUM MACHINE','Unlock pads, sounds & sequencer for ×1.5 each','×1',false));
  }

  // ── SEQUENCER (metronome auto-clicker) ──
  scoreStatsList.appendChild(ssLabel('SEQUENCER'));
  if(drum.seqTracks>=1){
    scoreStatsList.appendChild(ssRow('🎛','SEQUENCER',seqPlaying?`Playing · ${seqBpm} BPM`:'Paused · press play to earn',`${formatRate(seqPlaying?seqStepsPerSec():0)} steps/sec`,seqPlaying));
    scoreStatsList.appendChild(ssRow('💰','SEQUENCER EARNINGS','Every step scores · BPM never changes points per second',formatRate(seqPlaying?seqEarningsPerSec():0)+'/s',seqPlaying,'gold'));
    scoreStatsList.appendChild(ssRow('🔋','ENERGY',`Pad hits recharge it · drains 1 section per ${SEQ_ENERGY_SEC_PER_SECTION}s while the sequencer plays`,`${Math.ceil(seqEnergy-1e-9)}/${SEQ_ENERGY_MAX}`,seqEnergy>0));
    scoreStatsList.appendChild(ssRow('✖️','SEQUENCER STEP VALUE','Sequencer tiers × shared boosts',`×${formatMult(seqStepMultiplier())}`,true));
    autoTiers.forEach((t,i)=>{if(t.multiplierActive)scoreStatsList.appendChild(ssRow('⚡',`SEQUENCER TIER ${i+1}`,'Dot streak reward · stacks',`×${tierMultValueFor('seq',i).toLocaleString()}`,true));});
    scoreStatsList.appendChild(ssRow('🎛',shop.seqMultLevel>=0?`SEQUENCER ×${dotBase(shop.seqMultLevel)} DOTS`:'SEQUENCER ×4 DOTS',shop.seqMultLevel>=0?`Shop upgrade · sequencer dot rows climb in ×${dotBase(shop.seqMultLevel)}s`:'Unlock in shop · sequencer dot rows climb in ×4s',shop.seqMultLevel>=0?'ACTIVE':'OFF',shop.seqMultLevel>=0));
  } else {
    scoreStatsList.appendChild(ssRow('🎛','SEQUENCER','Unlock in shop · a metronome that earns while it plays','OFF',false));
  }
}
