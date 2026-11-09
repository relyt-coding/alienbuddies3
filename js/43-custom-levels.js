
// ══════════════════════════════════════════════
//  YOUR BEATS — play your own saved patterns, arrangements and song as minigame levels
//  Uses the same timeline the WAV export builds (your sounds, velocities, piano roll, channel FX, BPM),
//  then charts worms / obstacles from your drums: kicks + snares first, hats and percussion as spice.
//  Custom levels give score and stars (kept per beat + difficulty) but no permanent bonus.
// ══════════════════════════════════════════════
const MG_DIFFS={
  easy:  {label:'EASY',  lvl:3, craters:4,density:2.2,approach:1.05,eighths:false,sixteenths:false,gold:true,armor:false,decoy:false,hold:false,chords:false,planet:0},
  normal:{label:'NORMAL',lvl:10,craters:6,density:3.6,approach:.85, eighths:true, sixteenths:false,gold:true,armor:true, decoy:true, hold:true, chords:false,planet:1},
  hard:  {label:'HARD',  lvl:22,craters:8,density:5.4,approach:.68, eighths:true, sixteenths:true, gold:true,armor:true, decoy:true, hold:true, chords:true, planet:2},
};
function mgCustomSources(){
  const out=[];
  (typeof savedPatterns!=='undefined'?savedPatterns:[]).forEach((p,i)=>{if(p&&p.layers)out.push({key:'pat:'+i+':'+(p.name||''),kind:'PATTERN',name:p.name||('Pattern '+(i+1)),color:p.color,get:()=>({type:'pat',i})});});
  (typeof savedArrangements!=='undefined'?savedArrangements:[]).forEach((a,i)=>{if(a&&a.arrangement)out.push({key:'arr:'+i+':'+(a.name||''),kind:'ARRANGEMENT',name:a.name||('Arrangement '+(i+1)),color:a.color,get:()=>({type:'arr',i})});});
  if(typeof songSlots!=='undefined'&&songSlots.length)out.push({key:'song',kind:'SONG',name:'Your Song ('+songSlots.length+' part'+(songSlots.length>1?'s':'')+')',color:'#ffd166',get:()=>({type:'song'})});
  return out;
}
const _kickish=/kick|thud|boom|808|sub|floortom/i,_snareish=/snare|clap|rim|junglesnare|stomp/i;
// a "song" object shaped like wwCompose's, built from the player's own music
function mgCustomSong(src,diffKey){
  const D=MG_DIFFS[diffKey]||MG_DIFFS.normal,s=src.get();
  const one=()=>s.type==='pat'?buildArrangementHits({bars:1,arrangement:[s.i]}):s.type==='arr'?buildArrangementHits(savedArrangements[s.i]):buildSongHits();
  const base=one();if(!base.duration)return null;
  // short loops repeat so a level lasts ~45 s (songs and long arrangements play once, up to ~3 min)
  const reps=Math.max(1,Math.min(s.type==='pat'?40:s.type==='arr'?6:3,Math.ceil((s.type==='song'?30:45)/base.duration)));
  const hits=[];for(let r=0;r<reps;r++)base.hits.forEach(h=>{if(!h.vox&&!h.vcar)hits.push(Object.assign({},h,{time:h.time+r*base.duration}));});
  let length=Math.min(base.duration*reps,190);
  const bpm=seqBpm,step=60/bpm/4,bar=step*16;
  const bars=Math.ceil(length/bar-1e-6)+1;
  const events=hits.filter(h=>h.time<length).map(h=>h.midi!=null?{t:h.time,kind:'note',id:h.soundId,midi:h.midi,dur:h.dur,vel:h.vel,layer:h.layer}:{t:h.time,kind:'drum',id:h.soundId,vel:h.vel,ch:h.ch}).sort((a,b)=>a.t-b.t);
  const drumBars=[],sections=[];
  for(let b=0;b<bars;b++){drumBars.push({k:[],s:[],h:[]});sections.push(b===0?'intro':(Math.floor((b-1)/8)%2?'B':'A'));}
  events.forEach(e=>{if(e.kind!=='drum')return;const st=Math.round(e.t/step),b=Math.floor(st/16),i=st%16;if(b>=bars||Math.abs(e.t-st*step)>.004)return;
    const db=drumBars[b],arr=_kickish.test(e.id)?db.k:_snareish.test(e.id)?db.s:db.h;if(!arr.includes(i))arr.push(i);});
  let seed=0;for(const ch of src.key+diffKey)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const P=Object.assign({},D,{lvl:D.lvl,seed:seed%100000,name:src.name,bpm:Math.round(bpm),style:'yours',bodyBars:bars-2,boss:false,reward:0,custom:src.key+'|'+diffKey,diff:D.label});
  return{P,bpm,step,bar,bars,intro:1,events,drumBars,sections,length:bars*bar,custom:true};
}

// the "YOUR BEATS" picker, shared by both games
function mgRenderCustom(box,opts){
  const srcs=mgCustomSources();
  let diff=opts.diff||'normal',pick=opts.pick&&srcs.find(s=>s.key===opts.pick)?opts.pick:(srcs[0]&&srcs[0].key);
  const paint=()=>{
    if(!srcs.length){box.innerHTML=`<div class="ww-d-meta" style="padding:18px 8px;text-align:center">Your saved beats show up here.<br>Save a pattern (SAVE in the sequencer), an arrangement (ARR → SAVE) or build a song, then come back and play it.</div>`;return;}
    const best=opts.best||{};
    box.innerHTML=`<div class="mg-src-list">${srcs.map(s=>{const b=best[s.key+'|'+diff];return`<button class="mg-src ${s.key===pick?'sel':''}" data-k="${encodeURIComponent(s.key)}" style="--c:${s.color||'#a0a8ff'}"><span class="kd">${s.kind}</span><span class="nm">${s.name.replace(/</g,'&lt;')}</span><span class="bs">${b?(b.stars?'★'.repeat(b.stars):Math.round((b.acc??b.pct??0)*100)+'%'):''}</span></button>`;}).join('')}</div>
      <div class="mg-diffs">${Object.keys(MG_DIFFS).map(k=>`<button class="mg-diff ${k===diff?'sel':''}" data-d="${k}">${MG_DIFFS[k].label}</button>`).join('')}</div>
      <div class="ww-d-meta">Plays at your sequencer BPM (${typeof seqBpm!=='undefined'?seqBpm:'?'}) with your sounds and effects${opts.note?' · '+opts.note:''}</div>
      <button class="ww-play" id="${opts.id}Play" style="${opts.playStyle||''}">PLAY</button>`;
    box.querySelectorAll('.mg-src').forEach(b=>b.addEventListener('click',()=>{pick=decodeURIComponent(b.dataset.k);opts.pick=pick;paint();}));
    box.querySelectorAll('.mg-diff').forEach(b=>b.addEventListener('click',()=>{diff=b.dataset.d;opts.diff=diff;paint();}));
    box.querySelector('#'+opts.id+'Play').addEventListener('click',()=>{
      const s=srcs.find(x=>x.key===pick);if(!s)return;
      const song=mgCustomSong(s,diff);
      if(!song||!song.drumBars.some(d=>d.k.length+d.s.length+d.h.length)){showToast('That one has no drums to play along to — add some drum hits first');return;}
      opts.onPlay(song);
    });
  };
  paint();
}
