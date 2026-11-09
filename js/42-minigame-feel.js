
// ══════════════════════════════════════════════
//  MINIGAME FEEL — shared by Worm Whack and Planet Hop
//  • SYNC: a 16-click calibration. Phones (and especially Bluetooth headphones) play sound later than
//    the screen shows it, so perfect taps can read as late. Tapping along measures your personal offset,
//    which both games then use for judging AND for the visuals (so worms / jumps line up with what you hear).
//  • A timing meter (early ◀ ▶ late) that shows where your last hits landed against the beat.
// ══════════════════════════════════════════════
function mgOffset(){try{return(parseFloat(localStorage.getItem('ab2_mg_offset_ms'))||0)/1000;}catch(e){return 0;}}
function mgSetOffset(ms){ms=Math.max(-250,Math.min(250,Math.round(ms)));try{localStorage.setItem('ab2_mg_offset_ms',String(ms));}catch(e){}return ms;}
// recent hits: [{d: seconds (+ = late), at: performance.now()}]
function mgMeter(g,cx,y,w,hits,now){
  const half=w/2,sc=half/.18,x0=cx-half;
  g.save();
  g.fillStyle='rgba(0,0,0,.45)';g.fillRect(x0-6,y-9,w+12,18);
  g.fillStyle='rgba(200,200,210,.18)';g.fillRect(x0,y-3,w,6);                 // ok   ±180ms
  g.fillStyle='rgba(127,212,255,.35)';g.fillRect(cx-.12*sc,y-3,.24*sc,6);      // good ±120ms
  g.fillStyle='rgba(0,255,153,.55)';g.fillRect(cx-.06*sc,y-3,.12*sc,6);        // perfect ±60ms
  g.fillStyle='#fff';g.fillRect(cx-1,y-7,2,14);
  const recent=hits.filter(h=>now-h.at<4000);
  recent.forEach(h=>{const a=1-(now-h.at)/4000,x=cx+Math.max(-half,Math.min(half,h.d*sc));
    g.globalAlpha=a;g.fillStyle=Math.abs(h.d)<=.06?'#00ff99':Math.abs(h.d)<=.12?'#7fd4ff':'#ffaa66';g.fillRect(x-1.5,y-8,3,16);});
  g.globalAlpha=1;
  if(recent.length>=3){const avg=recent.slice(-8).reduce((s,h)=>s+h.d,0)/Math.min(8,recent.length),ax=cx+Math.max(-half,Math.min(half,avg*sc));
    g.fillStyle='#ffd166';g.beginPath();g.moveTo(ax,y-9);g.lineTo(ax-5,y-16);g.lineTo(ax+5,y-16);g.fill();}
  g.font="10px 'Bebas Neue',sans-serif";g.fillStyle='rgba(255,255,255,.55)';g.textAlign='right';g.fillText('EARLY',x0-10,y+4);g.textAlign='left';g.fillText('LATE',x0+w+10,y+4);
  g.restore();
}
// a one-line summary of how someone's timing leaned in a run
function mgTimingSummary(hits){
  if(hits.length<6)return'';
  const avg=hits.reduce((s,h)=>s+h.d,0)/hits.length,ms=Math.round(avg*1000);
  const lean=Math.abs(ms)<=15?'right on the beat':Math.abs(ms)+' ms '+(ms>0?'late':'early')+' on average';
  return`Your timing: ${lean}${Math.abs(ms)>35?' — try ⏱ SYNC on the level screen':''}`;
}

(function(){
  const $=id=>document.getElementById(id);
  const box=document.createElement('div');box.id='mgSync';box.className='ww-panel';
  box.innerHTML=`<div class="ww-panel-inner ww-res" style="box-shadow:0 0 40px -10px #e8ff00">
    <div class="ww-big" style="color:#e8ff00">SYNC YOUR TIMING</div>
    <div class="ww-sub" style="margin:6px 0 10px">Tap anywhere below (or any key) on every click — 16 clicks. Use the same headphones / speaker you play with.</div>
    <button id="mgTap" class="mg-tap"><span id="mgTapTxt">START</span></button>
    <div class="ww-d-meta" id="mgSyncRes" style="min-height:2.4em;margin-top:8px"></div>
    <div class="ww-res-btns"><button class="ww-btn" id="mgMinus">−10 ms</button><div class="mg-off" id="mgOff"></div><button class="ww-btn" id="mgPlus">+10 ms</button></div>
    <div class="ww-res-btns"><button class="ww-btn" id="mgReset">RESET</button><button class="ww-btn ww-play" id="mgDone">DONE</button></div>
  </div>`;
  document.body.appendChild(box);
  let run=null,done=null;
  const BEAT=.6,N=16;
  function paintOff(){const ms=Math.round(mgOffset()*1000);$('mgOff').textContent=(ms>0?'+':'')+ms+' ms';}
  function lat(){const c=getCtx();return(c.outputLatency||0)+(c.baseLatency||0)*.5;}
  function begin(){
    const c=getCtx();const T0=c.currentTime+.7;
    for(let i=0;i<N;i++)playSound('rimshot',i%4?.6:.95,T0+i*BEAT);
    run={T0,taps:[],raf:0};$('mgSyncRes').textContent='Tap on each click…';
    const tick=()=>{if(!run)return;const t=getCtx().currentTime-lat()-run.T0;
      const k=Math.floor(t/BEAT),ph=t-k*BEAT;$('mgTap').style.transform=`scale(${t>=0&&k<N?1+.08*Math.max(0,1-ph/.15):1})`;
      $('mgTapTxt').textContent=t<0?'GET READY':k<N?String(N-k):'…';
      if(t>N*BEAT+.4){finish();return;}run.raf=requestAnimationFrame(tick);};
    run.raf=requestAnimationFrame(tick);
  }
  function tap(ev){
    if(!run){begin();return;}
    const c=getCtx(),lag=ev&&ev.timeStamp?Math.max(0,Math.min(.25,(performance.now()-ev.timeStamp)/1000)):0;
    const ta=c.currentTime-lag-lat(),k=Math.round((ta-run.T0)/BEAT),d=ta-(run.T0+k*BEAT);
    if(k>=2&&k<N&&Math.abs(d)<.3)run.taps.push(d);
  }
  function finish(){
    const r=run;run=null;$('mgTapTxt').textContent='AGAIN';$('mgTap').style.transform='';
    if(!r||r.taps.length<6){$('mgSyncRes').textContent='Not enough taps landed near the clicks — try again.';return;}
    const s=r.taps.slice().sort((a,b)=>a-b),med=s[Math.floor(s.length/2)],ms=mgSetOffset(med*1000);
    $('mgSyncRes').textContent=Math.abs(ms)<=10?'You were right on the clicks — no adjustment needed.':`Your taps landed ${Math.abs(ms)} ms ${ms>0?'late':'early'}. Both games now adjust for that ✓`;
    paintOff();
  }
  $('mgTap').addEventListener('pointerdown',e=>{e.preventDefault();tap(e);});
  addEventListener('keydown',e=>{if(!box.classList.contains('open')||e.repeat)return;if(e.code==='Escape'){close();}else{e.preventDefault();e.stopImmediatePropagation();tap(e);}},true);
  $('mgMinus').addEventListener('click',()=>{mgSetOffset(mgOffset()*1000-10);paintOff();});
  $('mgPlus').addEventListener('click',()=>{mgSetOffset(mgOffset()*1000+10);paintOff();});
  $('mgReset').addEventListener('click',()=>{mgSetOffset(0);paintOff();$('mgSyncRes').textContent='Reset to no adjustment.';});
  function close(){if(run){cancelAnimationFrame(run.raf);run=null;}box.classList.remove('open');if(done)done();}
  $('mgDone').addEventListener('click',close);
  window.mgOpenSync=function(cb){done=cb;paintOff();$('mgSyncRes').textContent='';$('mgTapTxt').textContent='START';box.classList.add('open');};
})();
