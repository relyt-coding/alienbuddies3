// ══════════════════════════════════════════════
//  BUDDY RACE (v0.2.187)
//  Your racers (js/77) race three CPU buddies over hilly Planet Hop-style ground. A BUDDY RACE button appears under the
//  racer row in the Bunker once you have a racer. Only 1st place pays: 1 GOLD RECORD, the game's rare money
//  (goldRecords, js/02). Nothing to spend it on yet: it will be the hard-to-get currency.
//
//  FAIR, NO STATS: every racer runs at exactly the same speed. The track is laid out in BEATS (110 BPM, 64 beats), the
//  same obstacles in every lane. TAP (or Space / ↑) to jump; you're in the air for 0.9 of a beat. Hitting a rock or a gap
//  costs exactly ONE beat (the racer stumbles, then carries on), so after a stumble every obstacle still lands on a beat
//  and the music never drops. CPUs jump on their own and miss now and then (8 / 13 / 18% per obstacle), so a clean run
//  usually wins; equal finishes are a PHOTO FINISH (random). No timing judgments anywhere (design rule).
//
//  Music: the race groove (kick / snare / hats) plus YOUR racer's own egg beat on top, scheduled on the audio clock.
//  The main sequencer is stopped while racing (like Planet Hop) and restarted after if it was playing.
//  Drawing: 4 stacked lanes on one canvas (player at the bottom, nearest the thumb), camera follows you; buddies with
//  drawBuddy side view. Cheap: no shadowBlur, ground drawn as one polygon per lane.
// ══════════════════════════════════════════════
(function(){
  const $=id=>document.getElementById(id),TAU=Math.PI*2;
  const CPU_NAMES=['ZIPPO','QUARK','BLIP','NOVA','PIXIE','ORBIT','FIZZ','COMET','BOOP','ZOOM','TWINK','RIZZO','MOXIE','JUNO'];
  const BPM=110,SPB=60/BPM,LEN=64,JUMP=.9,CPU_MISS=[.08,.13,.18];
  const save=()=>{if(typeof autoSave==='function')autoSave();};
  const lookOf=r=>{try{return makeBuddyLook(incKindOf(r).look);}catch(e){return null;}};

  // ── gold record icon (a little gold vinyl) ──
  window.drawGoldRecord=function(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot||0);
    const k=g.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);k.addColorStop(0,'#fff3a0');k.addColorStop(.45,'#ffd23f');k.addColorStop(1,'#a8740a');
    g.fillStyle=k;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
    g.strokeStyle='rgba(120,80,0,.45)';g.lineWidth=Math.max(.6,r*.04);for(let i=1;i<4;i++){g.beginPath();g.arc(0,0,r*(.45+i*.15),0,TAU);g.stroke();}
    g.fillStyle='#ff4fa8';g.beginPath();g.arc(0,0,r*.32,0,TAU);g.fill();g.fillStyle='#2a1a00';g.beginPath();g.arc(0,0,r*.07,0,TAU);g.fill();
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=Math.max(.8,r*.07);g.beginPath();g.arc(0,0,r*.8,-2.4,-1.7);g.stroke();g.restore();};
  function recIcon(px){const c=document.createElement('canvas'),d=2;c.width=c.height=px*d;c.style.cssText=`width:${px}px;height:${px}px;vertical-align:middle`;
    const g=c.getContext('2d');g.scale(d,d);drawGoldRecord(g,px/2,px/2,px*.46,.3);return c;}

  // ── the BUDDY RACE button under the racer row ──
  const btn=document.createElement('button');btn.id='raceBtn';btn.className='race-open-btn';btn.style.display='none';
  const rr=$('racerRow');if(rr&&rr.parentNode)rr.parentNode.insertBefore(btn,rr.nextSibling);
  function paintBtn(){const n=typeof incRacers!=='undefined'?incRacers.length:0;btn.style.display=n?'':'none';if(!n)return;
    const t='BUDDY RACE · '+(goldRecords|0);if(btn.dataset.t===t)return;btn.dataset.t=t;btn.innerHTML='';btn.appendChild(document.createTextNode('BUDDY RACE · '));btn.appendChild(recIcon(16));btn.appendChild(document.createTextNode(' '+(goldRecords|0)));}
  setInterval(paintBtn,800);
  btn.addEventListener('click',()=>openLobby());

  // ── overlay: lobby → race → results ──
  const ov=document.createElement('div');ov.id='raceOverlay';
  ov.innerHTML=`<div class="rl-lobby" id="rlLobby"><div class="rl-hdr"><button id="rlBack">BACK</button><div class="rl-title">BUDDY RACE</div><div class="rl-recs" id="rlRecs"></div></div>
      <div class="rl-sub">PICK YOUR RACER</div><div class="rl-pick" id="rlPick"></div>
      <div class="rl-sub">RIVALS</div><div class="rl-rivals" id="rlRivals"></div>
      <div class="rl-prize" id="rlPrize"></div><button id="rlGo" class="rl-go">RACE!</button></div>
    <div class="rc-race" id="rcRace"><div class="rr-hud"><button id="rrQuit">✕</button><div class="rr-pos" id="rrPos"></div><div class="rr-prog"><i id="rrProg"></i></div></div>
      <canvas id="rrCanvas"></canvas><div class="rr-tap" id="rrTap">TAP TO JUMP</div></div>
    <div class="rl-res" id="rlRes"><div class="rl-title" id="resTitle"></div><canvas id="resRec"></canvas><div class="res-list" id="resList"></div><div class="rl-btns"><button id="resAgain" class="rl-go">RACE AGAIN</button><button id="resBack">BACK</button></div></div>`;
  document.body.appendChild(ov);
  let mine=null,rivals=[],R=null,raf=0,resumeSeq=false;
  function show(part){['rlLobby','rcRace','rlRes'].forEach(id=>$(id).style.display=id===part?'flex':'none');}
  function rivalPool(){const out=[],n=typeof totalAliens!=='undefined'?totalAliens:0;const used=new Set();
    while(out.length<3){let i=n>0?Math.floor(Math.random()*n):Math.floor(Math.random()*100);if(used.has(i)&&used.size<Math.max(3,n))continue;used.add(i);
      const spec=n>0?buddyLookSpec(i):buddyVariant(i);const nm=n>0&&alienData[i]&&alienData[i].name?alienData[i].name:(()=>{const left=CPU_NAMES.filter(x=>!out.some(o=>o.name===x));return left[Math.floor(Math.random()*left.length)];})();
      out.push({cpu:true,name:String(nm).toUpperCase().slice(0,10),look:makeBuddyLook(spec),miss:CPU_MISS[out.length]});}
    return out;}
  function mini(look,px){const c=document.createElement('canvas'),d=Math.min(2,devicePixelRatio||1);c.width=Math.round(px*d);c.height=Math.round(px*.85*d);c.style.width=px+'px';c.style.height=Math.round(px*.85)+'px';
    try{const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);drawBuddy(g,px/2,px*.48,px*.62,{view:'turn',angle:18,look,lite:true,antenna:1,t:1,A:null});}catch(e){}return c;}
  function openLobby(pref){if(!incRacers.length)return;if(!mine||!incRacers.some(r=>r.id===mine))mine=(pref||incRacers[0].id);
    rivals=rivalPool();paintLobby();show('rlLobby');ov.classList.add('on');document.body.classList.add('race-open');}
  window.openBuddyRace=openLobby;
  function paintLobby(){
    const rc=$('rlRecs');rc.innerHTML='';rc.appendChild(recIcon(20));rc.appendChild(document.createTextNode(' '+(goldRecords|0)));
    const pk=$('rlPick');pk.innerHTML='';
    incRacers.forEach(r=>{const b=document.createElement('button');b.className='rl-card'+(r.id===mine?' on':'');b.appendChild(mini(lookOf(r),64));const s=document.createElement('small');s.textContent=r.name||'RACER';b.appendChild(s);
      b.addEventListener('click',()=>{mine=r.id;paintLobby();});pk.appendChild(b);});
    const rv=$('rlRivals');rv.innerHTML='';rivals.forEach(c=>{const d=document.createElement('div');d.className='rl-card cpu';d.appendChild(mini(c.look,52));const s=document.createElement('small');s.textContent=c.name;d.appendChild(s);rv.appendChild(d);});
    const pz=$('rlPrize');pz.innerHTML='1ST PLACE WINS ';pz.appendChild(recIcon(18));pz.appendChild(document.createTextNode(' 1 GOLD RECORD'));
  }
  function closeAll(){stopRace();ov.classList.remove('on');document.body.classList.remove('race-open');if(resumeSeq&&typeof startSeq==='function'){resumeSeq=false;try{startSeq();}catch(e){}}}
  $('rlBack').addEventListener('click',closeAll);$('resBack').addEventListener('click',closeAll);
  $('resAgain').addEventListener('click',()=>{rivals=rivalPool();startRace();});
  $('rlGo').addEventListener('click',()=>startRace());
  $('rrQuit').addEventListener('click',()=>{stopRace();paintLobby();show('rlLobby');});

  // ── the track: obstacles on beats / half-beats, identical in every lane ──
  function makeTrack(){const obs=[];let b=6;while(b<LEN-3){const kind=Math.random()<.35?'gap':'rock';obs.push({b,kind});
      const step=[2,2,3,4,1.5,2.5][Math.floor(Math.random()*6)];b+=step;}return obs;}
  const ground=(d)=>Math.sin(d*.42)*.11+Math.sin(d*.17+1.3)*.08+Math.sin(d*1.1+.4)*.025;   // lane-height fractions, same for every lane

  // ── sound: groove + your racer's egg beat ──
  function snd(id,t,v){const s=SOUND_MAP[id];if(!s)return;try{s.fn(t,getSoundGainVal(id)*(v==null?1:v));}catch(e){}}
  function click(t,acc){try{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.frequency.value=acc?1500:1000;g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);o.connect(g);g.connect(drumMasterGain);o.start(t);o.stop(t+.06);}catch(e){}}
  function schedule(){if(!R)return;const c=getCtx(),ahead=c.currentTime+.12;
    while(R.next16<LEN*4+16){const t=R.t0+R.next16*SPB/4;if(t>ahead)break;const s=R.next16%16,beatI=Math.floor(R.next16/4);
      if(R.next16<LEN*4){
        if(s%8===0)snd('kick',t);if(s===4||s===12)snd('snare',t,.8);if(s%2===0)snd('hihat',t,.45);
        const eb=R.beat;if(eb)eb.p.forEach((row,ri)=>{if(row[s])snd(eb.s[ri],t,.7);});
      }
      R.next16++;}}

  function startRace(){
    const me=incRacers.find(r=>r.id===mine);if(!me)return;
    if(typeof seqPlaying!=='undefined'&&seqPlaying&&typeof stopSeq==='function'){resumeSeq=true;try{stopSeq();}catch(e){}}
    const c=getCtx(),now=c.currentTime+.1;
    const racers=[...rivals.map(x=>Object.assign({},x)),{cpu:false,name:me.name||'YOU',look:lookOf(me),you:true}];
    racers.forEach(r=>{r.dist=0;r.stumbleTo=-1;r.jumpAt=-9;r.done=null;r.passed=0;r.planned=-1;r.misses=0;});
    R={t0:now+4*SPB,obs:makeTrack(),racers,next16:0,last:-4,beat:me.beat&&me.beat.p&&me.beat.p.some(r=>r.some(Boolean))?me.beat:null,ended:false,dust:[]};
    for(let b=0;b<4;b++)click(now+b*SPB,b===0);
    clearInterval(R.timer);R.timer=setInterval(schedule,25);
    show('rcRace');$('rrTap').style.opacity='1';cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  }
  function stopRace(){if(R){clearInterval(R.timer);R=null;}cancelAnimationFrame(raf);}
  function jump(){if(!R||R.ended)return;const me=R.racers[3],b=beatNow();if(b<0||me.done!=null)return;if(b-me.jumpAt<JUMP||b<me.stumbleTo)return;
    me.jumpAt=b;$('rrTap').style.opacity='0';snd('marimba',getCtx().currentTime,.55);}
  const beatNow=()=>(getCtx().currentTime-R.t0)/SPB;
  $('rrCanvas').addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  $('rrTap').addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  document.addEventListener('keydown',e=>{if(!R||!ov.classList.contains('on'))return;if(e.code==='Space'||e.key==='ArrowUp'||e.key==='w'){e.preventDefault();jump();}});

  // ── simulation (on the audio clock, so it stays on the beat even if frames drop) ──
  function step(b){
    const dt=Math.max(0,b-R.last);R.last=b;if(b<0)return;
    R.racers.forEach(r=>{if(r.done!=null)return;
      if(b<r.stumbleTo)return;
      const d0=r.dist;let d1=d0+dt;
      // CPU: decide each obstacle half a beat before it arrives
      if(r.cpu){const o=R.obs[r.passed];if(o&&r.planned!==r.passed&&d1>=o.b-.45){r.planned=r.passed;if(Math.random()>=r.miss)r.jumpAt=b;}}
      const o=R.obs[r.passed];
      if(o&&d0<o.b&&d1>=o.b){
        const air=b-r.jumpAt>=0&&b-r.jumpAt<JUMP;
        r.passed++;
        if(!air){r.stumbleTo=b+1;r.misses++;d1=o.b;   // lose exactly one beat, then carry on from the obstacle
          if(!r.cpu)snd('thud',getCtx().currentTime,.6);
          for(let i=0;i<6;i++)R.dust.push({lane:R.racers.indexOf(r),d:o.b,y:0,vx:(Math.random()-.5)*.6,vy:-Math.random()*.4,a:1});}
        else if(!r.cpu)snd('shaker',getCtx().currentTime,.5);
      }
      r.dist=d1;if(r.dist>=LEN){r.done=b-(r.dist-LEN);r.dist=LEN;}
    });
    const me=R.racers[3];
    if(!R.ended&&(me.done!=null&&(R.racers.every(r=>r.done!=null)||b>me.done+3))){R.ended=true;setTimeout(finish,600);}
  }
  function placing(){
    const rs=R.racers.slice();const key=r=>r.done!=null?r.done:1e9-r.dist;
    rs.forEach(r=>r._tie=Math.random());rs.sort((a,b)=>(key(a)-key(b))||(a._tie-b._tie));return rs;}
  function finish(){if(!R)return;const order=placing(),me=R.racers[3],pos=order.indexOf(me);
    const photo=order[1]&&order[0].done!=null&&order[1].done!=null&&Math.abs(order[0].done-order[1].done)<1e-6;
    clearInterval(R.timer);
    if(pos===0){goldRecords=(goldRecords|0)+1;}
    raceStats.races=(raceStats.races|0)+1;if(pos===0)raceStats.wins=(raceStats.wins|0)+1;save();paintBtn();
    $('resTitle').textContent=(photo&&pos<=1?'PHOTO FINISH! ':'')+(['1ST PLACE!','2ND PLACE','3RD PLACE','4TH PLACE'][pos]);
    $('resTitle').style.color=pos===0?'#ffd23f':'#9fe8c4';
    const rc=$('resRec');rc.style.display=pos===0?'':'none';rec0=performance.now();
    const ls=$('resList');ls.innerHTML='';
    order.forEach((r,i)=>{const d=document.createElement('div');d.className='res-row'+(r.you?' you':'');d.innerHTML=`<b>${i+1}</b>`;d.appendChild(mini(r.look,40));
      const s=document.createElement('span');s.textContent=r.name+(r.you?' (YOU)':'');d.appendChild(s);const m=document.createElement('small');m.textContent=r.misses?r.misses+' TRIP'+(r.misses>1?'S':''):'CLEAN RUN';d.appendChild(m);ls.appendChild(d);});
    if(pos===0)try{if(typeof playSfxTierUnlock==='function')playSfxTierUnlock(6,1);}catch(e){}
    R=null;show('rlRes');cancelAnimationFrame(raf);raf=requestAnimationFrame(resFrame);}
  let rec0=0;
  function resFrame(now){raf=requestAnimationFrame(resFrame);const cv=$('resRec');if(cv.style.display==='none')return;const S=96,d=Math.min(2,devicePixelRatio||1);
    if(cv.width!==S*d){cv.width=cv.height=S*d;cv.style.width=cv.style.height=S+'px';}
    const g=cv.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,S,S);const k=Math.max(0,Math.min(1,(now-rec0)/500)),e=1-Math.pow(1-k,3);
    drawGoldRecord(g,S/2,S/2,S*.44*e,now/600);}

  window.__race={get R(){return R;},jump,openLobby,startRace};
  // ── drawing ──
  const LANE_COL=[['#1b1238','#3a2a6a'],['#10223a','#25507a'],['#2a1030','#5a2a6a'],['#0e2a20','#1f6a45']];
  let stars=null;
  function frame(now){raf=requestAnimationFrame(frame);if(!R)return;
    const b=beatNow();step(b);
    const cv=$('rrCanvas'),W=cv.clientWidth,H=cv.clientHeight,d=Math.min(2,devicePixelRatio||1);if(!W||!H)return;
    if(cv.width!==Math.round(W*d)||cv.height!==Math.round(H*d)){cv.width=Math.round(W*d);cv.height=Math.round(H*d);stars=null;}
    const g=cv.getContext('2d');g.setTransform(d,0,0,d,0,0);
    g.fillStyle='#05060c';g.fillRect(0,0,W,H);
    if(!stars){stars=[];for(let i=0;i<70;i++)stars.push([Math.random()*W,Math.random()*H,Math.random()*1.4+.3]);}
    g.fillStyle='rgba(255,255,255,.55)';stars.forEach(s=>g.fillRect(s[0],s[1],s[2],s[2]));
    const me=R.racers[3],LH=H/4,SZ=Math.min(LH*.62,120),BW=Math.max(70,Math.min(W/6,SZ*2.2)),camD=me.dist-(W*.3)/BW,U=SZ/.62;   // U = obstacle scale (lane height on phones)
    R.racers.forEach((r,li)=>{
      const top=li*LH,base=top+LH*.78,gy=dd=>base+ground(dd)*Math.min(LH,U*1.4);
      // ground
      const [c0,c1]=LANE_COL[li];const gr=g.createLinearGradient(0,top+LH*.5,0,top+LH);gr.addColorStop(0,c1);gr.addColorStop(1,c0);
      g.fillStyle=gr;g.beginPath();g.moveTo(0,top+LH);for(let x=0;x<=W+8;x+=8){g.lineTo(x,gy(camD+x/BW));}g.lineTo(W,top+LH);g.closePath();g.fill();
      g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1.5;g.beginPath();for(let x=0;x<=W+8;x+=8){const y=gy(camD+x/BW);x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
      // beat ticks + finish line
      for(let k=Math.ceil(camD);k<camD+W/BW+1;k++){const x=(k-camD)*BW;g.fillStyle=k%4===0?'rgba(255,255,255,.22)':'rgba(255,255,255,.08)';g.fillRect(x-1,gy(k)+3,2,k%4===0?7:4);}
      {const x=(LEN-camD)*BW;if(x>-20&&x<W+20){for(let s=0;s<8;s++){g.fillStyle=s%2?'#fff':'#222';g.fillRect(x-4,top+LH*.2+s*LH*.075,8,LH*.075);}}}
      // obstacles
      R.obs.forEach(o=>{const x=(o.b-camD)*BW;if(x<-40||x>W+40)return;const y=gy(o.b);
        if(o.kind==='rock'){g.fillStyle='#9b6bff';g.beginPath();g.moveTo(x-U*.11,y+2);g.lineTo(x-U*.035,y-U*.24);g.lineTo(x+U*.06,y-U*.14);g.lineTo(x+U*.11,y+2);g.closePath();g.fill();
          g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(x-U*.035,y-U*.24);g.lineTo(x,y-U*.05);g.lineTo(x-U*.07,y);g.closePath();g.fill();}
        else{g.fillStyle='#05060c';g.beginPath();g.ellipse(x,y+3,U*.15,U*.06,0,0,TAU);g.fill();g.strokeStyle='rgba(255,90,140,.6)';g.lineWidth=1.5;g.beginPath();g.ellipse(x,y+3,U*.15,U*.06,0,Math.PI,TAU);g.stroke();}});
      // the racer
      const x=(r.dist-camD)*BW,air=b-r.jumpAt,ja=air>=0&&air<JUMP?Math.sin(Math.PI*air/JUMP):0,stum=b<r.stumbleTo;
      const sz=SZ,y=gy(r.dist)-ja*U*.42+(stum?Math.sin(b*30)*2:0);
      if(x>-sz&&x<W+sz){
        g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,gy(r.dist)+2,sz*.28*(1-ja*.4),3,0,0,TAU);g.fill();
        try{drawBuddy(g,x,y-2,sz,{look:r.look,view:'side',face:1,run:stum?0:((r.dist*2)%1),air:ja>.05,t:now/1000,speed:1,lite:!r.you,A:null});}catch(e){}
      }else{g.fillStyle='rgba(255,255,255,.7)';g.font=`${Math.round(LH*.14)}px 'Bebas Neue',sans-serif`;g.textAlign=x<0?'left':'right';g.fillText(x<0?'◀ '+r.name:r.name+' ▶',x<0?6:W-6,top+LH*.3);}
      g.fillStyle=r.you?'#9dff3f':'rgba(255,255,255,.55)';g.font=`${Math.round(LH*.13)}px 'Bebas Neue',sans-serif`;g.textAlign='left';g.fillText(r.you?'YOU':r.name,6,top+LH*.16);
      if(li<3){g.fillStyle='rgba(255,255,255,.06)';g.fillRect(0,top+LH-1,W,1);}
    });
    // dust from trips
    R.dust=R.dust.filter(p=>(p.a-=.03)>0);R.dust.forEach(p=>{p.d+=p.vx*.05;p.y+=p.vy;p.vy+=.03;const x=(p.d-camD)*BW,y=p.lane*LH+LH*.78+ground(p.d)*LH+p.y*10;g.globalAlpha=p.a;g.fillStyle='#c9b8ff';g.beginPath();g.arc(x,y,3,0,TAU);g.fill();});g.globalAlpha=1;
    // count-in
    if(b<0){const n=Math.ceil(-b);g.fillStyle='#fff';g.font=`${Math.round(H*.14)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.fillText(n>=4?'READY':String(n),W/2,H*.5);}
    else if(b<1){g.fillStyle='#9dff3f';g.font=`${Math.round(H*.14)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.globalAlpha=1-b;g.fillText('GO!',W/2,H*.5);g.globalAlpha=1;}
    // HUD
    const key=r=>r.done!=null?-1e9+r.done:-r.dist,pos=1+R.racers.filter(r=>r!==me&&key(r)<key(me)).length;   // ties count in your favour on the HUD
    $('rrPos').textContent=['','1ST','2ND','3RD','4TH'][pos]||'';$('rrProg').style.width=(me.dist/LEN*100).toFixed(1)+'%';
  }
})();
