// ══════════════════════════════════════════════
//  EGG INCUBATOR (v0.2.184)
//  Special eggs warm under heat lamps at the TOP of the Bunker; what hatches is a RACER (pinned row with a shoe,
//  outside the 99 bunker slots; races come in a later build).
//
//  Where eggs come from (this build):
//   • the GOLDEN 0.1 FOUNDER EGG: once per save file, if this device has a 0.1 save that filled its bunker (ab_slotN);
//   • the LIGHT EGG: the reward for filling the bunker (99 aliens), replacing the old "egg in the incubator" reward;
//   • (build 5) DNA Splice will add spliced eggs: they get a bigger `need` (longer, more power).
//  The egg area stays completely hidden until there is an egg or the Egg Incubator node (id 'ascension') is owned.
//
//  Warming: the node gives 3 lamps; the Shop sells lamps 4–9 and the WATT ALLOWANCE (3 levels). Lamps run on LIVE
//  power: every warming lamp draws LAMP_FRAC (10%) of your current energy income per second, really taken off the
//  score. The allowance covers 3 / 5 / 7 / 9 lamps at full heat; more eggs than that and every lamp runs slower.
//  Income = what taps and the sequencer actually earned over the last ~10 s (wraps js/34's _rateAdd), so a closed
//  game or a silent one warms nothing ("lamps run on your music"). A first egg needs ~20 min at full heat.
//  Eggs only crack once fully warm; then 3 taps hatch them.
//
//  The EGG PAGE (tap a warming egg): three pads with the egg's own instruments (each egg kind has different defaults;
//  tap ⟳ to swap from the sounds you own), RECORD with a 4-beat count-in, then a looping 16-step bar you overdub on.
//  Only the egg's sounds are heard there: the main mix (drumMasterReal) is faded out while the page is open, but the
//  sequencer keeps running and earning, so the lamps keep warming. Egg sounds are played straight from SOUND_MAP with
//  drumMasterGain swapped for a private bus (no fx channel, no key) so they bypass the faded mix. The beat is saved
//  on the egg and passes to the racer.
//
//  Save: incEggs [{id,kind,slot(-1 = tray),heat 0..1,taps,beat:{s:[3 ids],p:[3×16]}}], incRacers [{id,kind,name,beat,born}],
//  incLampsBought 0..6, incAllow 0..3, founderEggGiven (js/02).
// ══════════════════════════════════════════════
const EGG_KINDS={
  founder:{label:'0.1 FOUNDER EGG',name:'FOUNDER',title:'0.1 FOUNDER',col:'#ffd23f',need:1200,special:true,pal:['#e0a020','#ffd23f','#141419','#c9a227'],sounds:['kick','snare','hihat'],
    look:{name:'FOUNDER',body:'#7cd94a',eye:'#141419',mouth:'#2a2a33',stem:'#e8c25a',tip:'#fff3a0',foot:'#c9a227',eyeSize:1.6,ant:1.45,fx:{sheen:['#e8ffb0','#9dff3f','#ffd23f'],spark:'#fff3a0',ring:'#d9b23a'}},trail:'gold'},
  light:{label:'LIGHT EGG',name:'LUMEN',title:'LIGHT BUDDY',col:'#fff3a0',need:1200,special:false,pal:['#fffbe0','#bfeaff','#ffffff','#ffd0ea'],sounds:['bell','marimba','shaker'],
    look:{name:'LIGHT',body:'#fff1c2',eye:'#2f80ff',mouth:'#ff9f5a',stem:'#ffffff',tip:'#fffbe0',foot:'#ffe14d',fx:{sheen:['#ffffff','#fff3a0','#bfeaff','#ffd0ea'],spark:'#ffffff',ring:'#fff3a0',glass:.62,halo:'rgba(255,246,190,.9)'}},trail:'prism'},
};
const INC_NODE='ascension',INC_LAMP_FRAC=.10,INC_MAX_LAMPS=9;
function incHas(){return typeof unlockedSkills!=='undefined'&&!!unlockedSkills[INC_NODE];}
function incLamps(){return incHas()?Math.min(INC_MAX_LAMPS,3+(incLampsBought|0)):0;}
function incCovered(){return 3+2*(incAllow|0);}
function incNewEgg(kind){const K=EGG_KINDS[kind];return{id:'e'+Date.now().toString(36)+Math.floor(Math.random()*1e4),kind,slot:-1,heat:0,taps:0,
  beat:{s:K.sounds.slice(),p:[0,1,2].map(()=>Array(16).fill(0))}};}
// shop prices: anchored to the price of the 99th buddy, so they mean the same thing on any save; ×100 per step
function incPriceBase(){try{return Math.max(1e6,alienCost(98));}catch(e){return 1e40;}}
function incLampPrice(b){return incPriceBase()*20*Math.pow(100,b);}     // b = lamps already bought (lamp 4 = 20× the 99th buddy)
function incAllowPrice(l){return incPriceBase()*8*Math.pow(100,l);}

(function(){
  const $=id=>document.getElementById(id),TAU=Math.PI*2;
  const K=e=>EGG_KINDS[e.kind]||EGG_KINDS.light;
  const lookOf=kind=>{try{return makeBuddyLook((EGG_KINDS[kind]||EGG_KINDS.light).look);}catch(e){return null;}};
  const save=()=>{if(typeof autoSave==='function')autoSave();};
  const toast=m=>{if(typeof showToast==='function')showToast(m);};

  // ── income: what taps + the sequencer earned over the last 10 s ──
  let incomeCur=0,income=0;const buckets=[];
  const ra=window._rateAdd;window._rateAdd=function(n){if(n>0&&isFinite(n))incomeCur+=n;if(ra)return ra.apply(this,arguments);};
  setInterval(()=>{buckets.push(incomeCur);incomeCur=0;if(buckets.length>10)buckets.shift();income=buckets.reduce((a,b)=>a+b,0)/Math.max(3,buckets.length);},1000);

  // ── warming ──
  const W={draw:0,paid:1,share:1,n:0};
  let lastT=performance.now();
  setInterval(()=>{
    const now=performance.now(),dt=Math.min(1,(now-lastT)/1000);lastT=now;
    W.draw=0;W.n=0;
    if(typeof activeSlot==='undefined'||activeSlot<0||!document.body.classList.contains('game-active')||!incHas())return;
    const L=incLamps(),warm=incEggs.filter(e=>e.slot>=0&&e.slot<L&&e.heat<1);W.n=warm.length;if(!warm.length)return;
    const share=Math.min(1,incCovered()/warm.length),rate=warm.length*INC_LAMP_FRAC*income*share,want=rate*dt;
    let p=0;if(want>0){const pay=Math.min(want,Math.max(0,score));score-=pay;p=pay/want;}
    W.draw=rate;W.paid=p;W.share=share;
    warm.forEach(e=>{e.heat=Math.min(1,e.heat+dt/(e.need||K(e).need)*share*p);
      if(e.heat>=1){toast(K(e).label+' is warm! Tap it 3 times to hatch.');save();refresh(true);}});
  },250);

  // ── the 0.1 founder egg: once per save file, if this device has a 0.1 save that filled its bunker ──
  function had01(){for(let i=0;i<6;i++){try{const d=JSON.parse(localStorage.getItem('ab_slot'+i)||'null');if(d&&(d.hasReceivedEgg||(+d.totalAliens||0)>=99))return true;}catch(e){}}return false;}
  function checkFounder(){if(typeof founderEggGiven==='undefined'||founderEggGiven||(typeof TEST_MODE!=='undefined'&&TEST_MODE))return;
    if(!had01())return;founderEggGiven=true;incEggs.push(incNewEgg('founder'));save();refresh(true);}
  if(typeof startGame==='function'){const sg=window.startGame;window.startGame=function(){const r=sg.apply(this,arguments);try{checkFounder();refresh(true);}catch(e){}return r;};}

  // ── the light egg: the 99-alien reward (js/12 shows the modal, js/20 claims it; we add the egg) ──
  const claim=$('eggRewardClose');
  if(claim)claim.addEventListener('click',()=>{if(!incEggs.some(e=>e.kind==='light')&&!incRacers.some(r=>r.kind==='light')){incEggs.push(incNewEgg('light'));save();refresh(true);}setTimeout(()=>{try{bannerText();}catch(e){}},0);});
  // the modal's big emoji egg becomes the real (glowing) light egg
  (function(){const m=$('eggRewardModal');if(!m)return;const d=[...m.querySelectorAll('div')].find(x=>x.textContent.trim()==='🥚');if(!d)return;
    d.textContent='';const c=document.createElement('canvas'),k=2,S=120;c.width=S*k;c.height=S*1.25*k;c.style.cssText=`width:${S}px;height:${S*1.25}px;display:block`;d.appendChild(c);
    try{paintBuddyEgg(c.getContext('2d'),S/2*k,S*.65*k,S*.34*k,S*.44*k,0,false,0,EGG_KINDS.light.pal,1);}catch(e){}})();
  // the old incubator box under the grid is gone; the banner points to the top instead
  window.updateIncubatorVisibility=function(){};
  if(typeof renderBunkerView==='function'){const rb=window.renderBunkerView;window.renderBunkerView=function(){const r=rb.apply(this,arguments);
    try{bannerText();}catch(e){}refresh();return r;};}
  // the BUNKER FULL banner follows the light egg: claim it → it's waiting at the top → (hatched) all 99 found
  function bannerText(){const s=$('bunkerFullSub');if(!s||typeof hasReceivedEgg==='undefined'||!hasReceivedEgg)return;
    s.textContent=incEggs.some(e=>e.kind==='light')?'Your light egg is at the top of the Bunker':'All 99 buddies found!';}

  // ══ BUNKER: egg area (top) + racer row (above the grid) ══
  const body=document.querySelector('#bunkerView .bunker-body');
  const area=document.createElement('div');area.id='eggArea';area.style.display='none';
  area.innerHTML='<div class="inc-strip" id="incStrip"></div><div class="inc-power" id="incPower"></div><div class="inc-tray-wrap" id="incTrayWrap"><div class="inc-sub">WAITING EGGS</div><div class="inc-tray" id="incTray"></div><div class="inc-need" id="incNeed">WARM THEM WITH THE EGG INCUBATOR</div></div>';
  const racerRow=document.createElement('div');racerRow.id='racerRow';racerRow.className='bunker-grid racer-row';racerRow.style.display='none';
  if(body){const stats=body.querySelector('.bunker-stats');body.insertBefore(area,stats||body.firstChild);const gw=body.querySelector('.bunker-grid-wrap');body.insertBefore(racerRow,gw||null);}
  let key='',cards=[];
  function visible(el){return el&&el.offsetParent!==null&&el.getBoundingClientRect().width>0;}
  function refresh(force){
    if(!body)return;
    const L=incLamps(),show=incHas()||incEggs.length>0;area.style.display=show?'':'none';racerRow.style.display=incRacers.length?'':'none';
    const k=[L,incHas(),incEggs.map(e=>e.id+':'+e.slot+':'+(e.heat>=1)).join(','),incRacers.map(r=>r.id+r.name).join(',')].join('|');
    if(force||k!==key){key=k;build();}
    paintInfo();
  }
  window.incRefresh=refresh;
  function build(){
    const L=incLamps(),strip=$('incStrip'),tray=$('incTray');
    strip.innerHTML='';cards=[];strip.style.display=L?'':'none';
    for(let i=0;i<L;i++){
      const egg=incEggs.find(e=>e.slot===i)||null;
      const c=document.createElement('div');c.className='inc-card'+(egg?'':' empty');
      c.innerHTML='<canvas class="inc-art"></canvas><div class="inc-lbl"></div><div class="inc-bar"><i></i></div><div class="inc-info"></div>';
      c.addEventListener('click',()=>tapCard(i));strip.appendChild(c);cards.push({el:c,cv:c.querySelector('canvas'),lbl:c.querySelector('.inc-lbl'),bar:c.querySelector('.inc-bar i'),info:c.querySelector('.inc-info'),slot:i});
    }
    // waiting eggs: those in the tray, plus any sitting in a lamp you no longer have
    const waiting=incEggs.filter(e=>e.slot<0||e.slot>=L);
    $('incTrayWrap').style.display=waiting.length?'':'none';$('incNeed').style.display=incHas()?'none':'';
    tray.innerHTML='';
    waiting.forEach(e=>{const b=document.createElement('button');b.className='inc-tray-egg';const cv=document.createElement('canvas'),k=2,w=40,h=48;cv.width=w*k;cv.height=h*k;cv.style.cssText=`width:${w}px;height:${h}px`;
      try{paintBuddyEgg(cv.getContext('2d'),w/2*k,h*.55*k,w*.3*k,w*.38*k,0,!!K(e).special,0,K(e).pal,1);}catch(x){}
      b.appendChild(cv);const s=document.createElement('small');s.textContent=K(e).label;b.appendChild(s);b.addEventListener('click',()=>place(e));tray.appendChild(b);});
    // racers
    racerRow.innerHTML='';
    incRacers.forEach(r=>{const c=document.createElement('div');c.className='alien-cell occupied racer-cell';const col=EGG_KINDS[r.kind]?EGG_KINDS[r.kind].col:'#ffd23f';c.style.borderColor=col;
      const cv=document.createElement('canvas');cv.className='cell-buddy';const nm=document.createElement('div');nm.className='alien-cell-name';nm.textContent=r.name||'';nm.style.color=col;
      const shoe=document.createElement('span');shoe.className='racer-shoe';c.appendChild(cv);c.appendChild(nm);c.appendChild(shoe);c.addEventListener('click',()=>openRacer(r.id));racerRow.appendChild(c);
      requestAnimationFrame(()=>{try{const cw=c.clientWidth||36,w=Math.max(18,cw)*.9,h=w*.8,d=Math.min(2,devicePixelRatio||1);cv.width=Math.round(w*d);cv.height=Math.round(h*d);cv.style.width=w+'px';cv.style.height=h+'px';
        const g=cv.getContext('2d');g.setTransform(d,0,0,d,0,0);drawBuddy(g,w/2,h*.56,w*.68,{view:'turn',angle:18,look:lookOf(r.kind),lite:true,antenna:1,t:1,A:null});}catch(x){}});});
  }
  function place(e){
    if(!incHas()){toast('Eggs need the Egg Incubator from the skill tree.');return;}
    const L=incLamps();for(let i=0;i<L;i++)if(!incEggs.some(x=>x.slot===i)){e.slot=i;save();refresh(true);const c=cards[i];if(c)c.el.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});return;}
    toast('Every lamp is busy. The Shop sells more lamps.');
  }
  function tapCard(i){
    const egg=incEggs.find(e=>e.slot===i);
    if(!egg){const w=incEggs.find(e=>e.slot<0||e.slot>=incLamps());if(w)place(w);return;}
    if(egg.heat<1){openEggPage(egg.id);return;}
    egg.taps=(egg.taps|0)+1;crackFx(i,egg.taps);
    if(egg.taps>=3)hatch(egg);else save();
  }
  function crackFx(i,n){const c=cards[i];if(!c)return;c.el.classList.remove('inc-shake');void c.el.offsetWidth;c.el.classList.add('inc-shake');
    try{const ctx=getCtx(),t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(500+n*180,t);o.frequency.exponentialRampToValueAtTime(220+n*90,t+.09);
      g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g);g.connect(masterGainNode);o.start(t);o.stop(t+.13);}catch(e){}}
  function hatch(egg){
    const k=K(egg),r={id:'r'+Date.now().toString(36),kind:egg.kind,name:k.name,beat:egg.beat,born:Date.now()};
    incEggs=incEggs.filter(e=>e!==egg);incRacers.push(r);
    try{if(typeof playSfxTierUnlock==='function')playSfxTierUnlock(4,1);}catch(e){}
    save();refresh(true);try{bannerText();}catch(e){}setTimeout(()=>openRacer(r.id,true),250);
  }
  function fmtMin(s){if(!isFinite(s))return '';const m=Math.ceil(s/60);return m>=60?'~'+(m/60).toFixed(m>=600?0:1)+' H':'~'+m+' MIN';}
  function paintInfo(){
    if(!visible(area))return;
    const L=incLamps(),pw=$('incPower');
    pw.style.display=W.n?'':'none';
    if(W.n){const live=income>0&&W.paid>.02;
      pw.innerHTML=live?'LAMPS DRAW '+fmtJpsH(W.draw)+(W.share<1?' · ALLOWANCE RUNS '+incCovered()+' OF '+W.n+' AT FULL HEAT':''):'LAMPS RUN ON YOUR MUSIC · PLAY OR TAP TO WARM';}
    cards.forEach(c=>{const e=incEggs.find(x=>x.slot===c.slot);
      if(!e){c.lbl.textContent='EMPTY LAMP';c.lbl.style.color='';c.bar.style.width='0';c.info.textContent=incEggs.some(x=>x.slot<0||x.slot>=L)?'TAP TO PLACE AN EGG':'';return;}
      const k=K(e);c.lbl.textContent=k.label;c.lbl.style.color=k.col;c.bar.style.width=(e.heat*100).toFixed(1)+'%';
      const spd=(W.share||1)*(W.paid||0);
      c.info.textContent=e.heat>=1?(3-(e.taps|0))+' TAP'+(3-(e.taps|0)===1?'':'S')+' TO HATCH':Math.floor(e.heat*100)+'% · '+(spd>.01&&income>0?fmtMin((1-e.heat)*(e.need||k.need)/spd):'COLD');
      c.el.classList.toggle('ready',e.heat>=1);});
  }
  // the lamp, dome, nest and egg, painted ~15 times a second while the bunker shows
  let fT=0;
  function art(now){requestAnimationFrame(art);if(now-fT<66)return;fT=now;if(!cards.length||!visible(area))return;paintInfo();
    cards.forEach(c=>{const cv=c.cv,w=c.el.clientWidth,h=Math.round(w*1.05),d=Math.min(2,devicePixelRatio||1);if(!w)return;
      if(cv.width!==Math.round(w*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);cv.style.width=w+'px';cv.style.height=h+'px';}
      const g=cv.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
      const e=incEggs.find(x=>x.slot===c.slot),cx=w/2,on=e&&e.heat<1&&W.paid>.02&&income>0,t=now/1000;
      // lamp + warm cone
      if(on||(e&&e.heat>=1)){const cone=g.createLinearGradient(0,h*.1,0,h*.75);cone.addColorStop(0,`rgba(255,150,60,${on?.5+.08*Math.sin(t*5):.25})`);cone.addColorStop(1,'rgba(255,120,40,0)');
        g.fillStyle=cone;g.beginPath();g.moveTo(cx-w*.08,h*.12);g.lineTo(cx+w*.08,h*.12);g.lineTo(cx+w*.42,h*.74);g.lineTo(cx-w*.42,h*.74);g.closePath();g.fill();}
      g.fillStyle='#2a3a33';g.fillRect(cx-1.5,0,3,h*.06);
      g.fillStyle='#3a4a42';g.beginPath();g.moveTo(cx-w*.16,h*.13);g.lineTo(cx-w*.07,h*.06);g.lineTo(cx+w*.07,h*.06);g.lineTo(cx+w*.16,h*.13);g.closePath();g.fill();
      g.fillStyle=on?'#ffb35a':e?'#8a6a3a':'#333';g.beginPath();g.ellipse(cx,h*.13,w*.1,2.6,0,0,TAU);g.fill();
      // glass dome
      const dx=w*.08,dw=w*.84,dy=h*.2,dh=h*.6;
      g.beginPath();g.moveTo(dx,dy+dh);g.lineTo(dx,dy+dw/2);g.arc(cx,dy+dw/2,dw/2,Math.PI,0);g.lineTo(dx+dw,dy+dh);g.closePath();
      g.fillStyle=e?'rgba(255,190,120,.07)':'rgba(120,200,160,.04)';g.fill();g.strokeStyle='rgba(180,255,220,.35)';g.lineWidth=1.2;g.stroke();
      g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=2;g.beginPath();g.arc(cx,dy+dw/2,dw/2-5,Math.PI*1.15,Math.PI*1.4);g.stroke();
      // nest + base
      const ny=dy+dh-5;g.fillStyle='#4a3a18';g.beginPath();g.ellipse(cx,ny,dw/2-5,w*.065,0,0,TAU);g.fill();
      g.strokeStyle='#c9a24a';g.lineWidth=1;for(let s=0;s<12;s++){const a=s/12*Math.PI;g.beginPath();g.moveTo(cx-Math.cos(a)*(dw/2-8),ny-2+Math.sin(a*3)*2);g.lineTo(cx-Math.cos(a+.4)*(dw/2-12),ny+3);g.stroke();}
      g.fillStyle='#14281e';g.fillRect(dx-2,dy+dh,dw+4,5);
      if(e){const ready=e.heat>=1,wob=ready?Math.sin(t*9)*.09*(1+(e.taps|0)*.4):Math.sin(t*1.6)*.025;
        if(e.kind==='light'){const gr=g.createRadialGradient(cx,ny-w*.2,w*.05,cx,ny-w*.2,w*.42);gr.addColorStop(0,`rgba(255,248,200,${.45+.15*Math.sin(t*2.2)})`);gr.addColorStop(1,'rgba(255,248,200,0)');g.fillStyle=gr;g.fillRect(cx-w*.42,ny-w*.62,w*.84,w*.84);}
        g.save();g.translate(cx,ny-w*.2);g.rotate(wob);
        try{paintBuddyEgg(g,0,0,w*.17,w*.22,t,!!K(e).special,ready?Math.min(1,(e.taps|0)/3+.18):0,K(e).pal,d/d);}catch(x){}
        g.restore();}
      else{g.setLineDash([4,4]);g.strokeStyle='#2a6a4a';g.lineWidth=1.2;g.beginPath();g.ellipse(cx,ny-w*.2,w*.15,w*.2,0,0,TAU);g.stroke();g.setLineDash([]);
        g.fillStyle='#2f8a60';g.font=`${Math.round(w*.2)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('+',cx,ny-w*.2);}
    });
  }
  requestAnimationFrame(art);
  setInterval(()=>{if(visible(area)||visible(racerRow)||incEggs.length||incHas())refresh();},1000);

  // ══ SOUND for the egg page / racer card: a private bus, main mix faded out ══
  let bus=null,muted=null;
  function eggBus(){const c=getCtx();if(!bus||bus.context!==c){bus=c.createGain();bus.gain.value=1;bus.connect(masterGainNode);}return bus;}
  function hit(id,t){if(!SOUND_MAP[id])return;const c=getCtx(),saved=drumMasterGain;drumMasterGain=eggBus();
    try{SOUND_MAP[id].fn(t==null?c.currentTime:t,getSoundGainVal(id));}catch(e){}finally{drumMasterGain=saved;}}
  function click(t,acc){try{const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.frequency.value=acc?1500:1000;g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);o.connect(g);g.connect(eggBus());o.start(t);o.stop(t+.06);}catch(e){}}
  function muteMain(on){try{const c=getCtx(),now=c.currentTime,nodes=[drumMasterReal,typeof partyMusicGain!=='undefined'?partyMusicGain:null].filter(n=>n&&n.context===c);
    if(on&&!muted){muted=nodes.map(n=>[n,n.gain.value]);nodes.forEach(n=>{n.gain.cancelScheduledValues(now);n.gain.setValueAtTime(n.gain.value,now);n.gain.linearRampToValueAtTime(0,now+.12);});}
    else if(!on&&muted){muted.forEach(([n,v])=>{n.gain.cancelScheduledValues(now);n.gain.setValueAtTime(n.gain.value,now);n.gain.linearRampToValueAtTime(v,now+.25);});muted=null;}}catch(e){}}
  // the loop: 16 sixteenth-notes at the sequencer's BPM, scheduled 120 ms ahead on the audio clock
  const E={beat:null,on:false,rec:false,count:0,t0:0,next:0,timer:null,skip:{},pass:0,onStep:null};
  const SD=()=>60/((typeof seqBpm==='number'&&seqBpm>0)?seqBpm:100)/4;
  function eStart(beat,rec,onStep){eStop();const c=getCtx();E.beat=beat;E.rec=!!rec;E.onStep=onStep;E.on=true;E.skip={};
    const sd=SD();E.count=rec?4:0;const t=c.currentTime+.08;
    if(rec)for(let b=0;b<4;b++)click(t+b*sd*4,b===0);
    E.t0=t+(rec?sd*16:0);E.next=0;E.pass=0;
    E.timer=setInterval(sched,25);sched();}
  function sched(){if(!E.on)return;const c=getCtx(),sd=SD(),ahead=c.currentTime+.12;
    while(true){const n=E.next,t=E.t0+n*sd;if(t>ahead)break;const s=n%16,pass=Math.floor(n/16);
      E.beat.p.forEach((row,r)=>{if(row[s]&&E.skip[r+':'+s]!==pass)hit(E.beat.s[r],t);});
      if(E.onStep){const d=Math.max(0,(t-c.currentTime)*1000);setTimeout(()=>{if(E.on&&E.onStep)E.onStep(s);},d);}
      E.next++;}}
  function eStop(){E.on=false;E.rec=false;clearInterval(E.timer);E.timer=null;if(E.onStep)E.onStep(-1);E.onStep=null;}
  // a pad tap while recording: snap to the nearest 16th; if that step's turn this pass is still coming, skip it once (you just played it)
  function eRecord(r){if(!E.on||!E.rec)return;const c=getCtx(),sd=SD(),n=Math.round((c.currentTime-E.t0)/sd);if(n<-2)return;
    const nn=Math.max(0,n),s=nn%16;E.beat.p[r][s]=1;if(E.next>nn)E.skip[r+':'+s]=-1;else E.skip[r+':'+s]=Math.floor(nn/16);}

  // ══ EGG PAGE ══
  const page=document.createElement('div');page.id='eggPage';
  page.innerHTML=`<div class="ep-box"><div class="ep-hdr"><button class="ep-back" id="epBack">BACK</button><div class="ep-title" id="epTitle"></div><div style="width:3.6rem"></div></div>
    <canvas id="epEgg"></canvas><div class="ep-bar"><i id="epBarFill"></i></div><div class="ep-info" id="epInfo"></div>
    <div class="ep-grid" id="epGrid"></div><div class="ep-pads" id="epPads"></div>
    <div class="ep-ctrls"><button id="epRec" class="ep-rec">● RECORD</button><button id="epPlay">▶ PLAY</button><button id="epClear">CLEAR</button></div></div>`;
  document.body.appendChild(page);
  let cur=null,epRaf=0;
  const COLS=['#ffd23f','#3fe6ff','#ff4fa8'];
  function epEgg(){return incEggs.find(e=>e.id===cur);}
  function openEggPage(id){const e=incEggs.find(x=>x.id===id);if(!e)return;cur=id;
    if(!e.beat||!Array.isArray(e.beat.p))e.beat=incNewEgg(e.kind).beat;
    $('epTitle').textContent=K(e).label;$('epTitle').style.color=K(e).col;
    buildGrid();buildPads();page.classList.add('on');document.body.classList.add('egg-page-open');muteMain(true);
    cancelAnimationFrame(epRaf);epRaf=requestAnimationFrame(epFrame);}
  function closeEggPage(){eStop();page.classList.remove('on');document.body.classList.remove('egg-page-open');muteMain(false);cur=null;cancelAnimationFrame(epRaf);paintCtl();save();refresh(true);}
  function buildGrid(){const e=epEgg(),gr=$('epGrid');gr.innerHTML='';
    for(let r=0;r<3;r++)for(let s=0;s<16;s++){const b=document.createElement('button');b.className='ep-cell'+(s%4===0?' beat':'');b.dataset.r=r;b.dataset.s=s;b.style.setProperty('--c',COLS[r]);
      b.addEventListener('click',()=>{e.beat.p[r][s]=e.beat.p[r][s]?0:1;paintGrid();});gr.appendChild(b);}
    paintGrid();}
  function paintGrid(step){const e=epEgg();if(!e)return;$('epGrid').querySelectorAll('.ep-cell').forEach(b=>{const r=+b.dataset.r,s=+b.dataset.s;b.classList.toggle('on',!!e.beat.p[r][s]);b.classList.toggle('now',s===step);});}
  function choices(e){const own=typeof unlockedSounds==='function'?unlockedSounds():[];const list=[...K(e).sounds,...own].filter((x,i,a)=>SOUND_MAP[x]&&a.indexOf(x)===i);return list;}
  function buildPads(){const e=epEgg(),pd=$('epPads');pd.innerHTML='';
    e.beat.s.forEach((id,r)=>{const w=document.createElement('div');w.className='ep-padw';
      const p=document.createElement('button');p.className='ep-pad';p.style.setProperty('--c',COLS[r]);p.textContent=(SOUND_MAP[id]||{}).name||id;
      p.addEventListener('pointerdown',ev=>{ev.preventDefault();hit(e.beat.s[r]);eRecord(r);p.classList.remove('hit');void p.offsetWidth;p.classList.add('hit');if(E.rec)paintGrid();});
      const sw=document.createElement('button');sw.className='ep-swap';sw.textContent='⟳';sw.setAttribute('aria-label','Change sound');
      sw.addEventListener('click',()=>{const L=choices(e),i=L.indexOf(e.beat.s[r]);e.beat.s[r]=L[(i+1)%L.length];p.textContent=(SOUND_MAP[e.beat.s[r]]||{}).name||e.beat.s[r];hit(e.beat.s[r]);});
      w.appendChild(p);w.appendChild(sw);pd.appendChild(w);});}
  function paintCtl(){$('epRec').classList.toggle('on',E.on&&E.rec);$('epRec').textContent=E.on&&E.rec?(E.count>0?'COUNT-IN…':'■ STOP'):'● RECORD';$('epPlay').textContent=E.on&&!E.rec?'■ STOP':'▶ PLAY';}
  $('epBack').addEventListener('click',closeEggPage);
  $('epRec').addEventListener('click',()=>{const e=epEgg();if(!e)return;if(E.on&&E.rec){eStop();paintCtl();save();return;}
    eStart(e.beat,true,s=>{if(s>=0)E.count=0;paintGrid(s);paintCtl();});paintCtl();});
  $('epPlay').addEventListener('click',()=>{const e=epEgg();if(!e)return;if(E.on&&!E.rec){eStop();paintCtl();return;}eStart(e.beat,false,s=>paintGrid(s));paintCtl();});
  $('epClear').addEventListener('click',()=>{const e=epEgg();if(!e)return;e.beat.p.forEach(r=>r.fill(0));paintGrid();});
  function epFrame(now){epRaf=requestAnimationFrame(epFrame);const e=epEgg();if(!e){return;}
    const cv=$('epEgg'),S=Math.round(Math.min(170,innerHeight*.22)),d=Math.min(2,devicePixelRatio||1);
    if(cv.width!==S*d){cv.width=S*d;cv.height=S*d;cv.style.width=cv.style.height=S+'px';}
    const g=cv.getContext('2d'),t=now/1000;g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,S,S);
    const warm=g.createRadialGradient(S/2,S*.55,4,S/2,S*.55,S*.5);warm.addColorStop(0,`rgba(255,160,70,${.18+.25*e.heat})`);warm.addColorStop(1,'rgba(255,160,70,0)');g.fillStyle=warm;g.fillRect(0,0,S,S);
    // the egg bobs to its own beat while it plays
    const bump=E.on&&!E.rec?Math.max(0,Math.sin(t*Math.PI*2*(((typeof seqBpm==='number'&&seqBpm)||100)/60)))*.05:0;
    g.save();g.translate(S/2,S*.55);g.rotate(Math.sin(t*1.7)*.04);g.scale(1+bump,1-bump);try{paintBuddyEgg(g,0,0,S*.25,S*.32,t,!!K(e).special,e.heat>=1?.25:0,K(e).pal,1);}catch(x){}g.restore();
    $('epBarFill').style.width=(e.heat*100).toFixed(1)+'%';
    $('epInfo').textContent=e.heat>=1?'WARM! TAP IT 3 TIMES IN THE BUNKER TO HATCH':'WARMING · '+Math.floor(e.heat*100)+'%';}

  // ══ RACER CARD ══
  const rc=document.createElement('div');rc.id='racerCard';
  rc.innerHTML=`<div class="rc-box"><div class="rc-kick" id="rcKick"></div><canvas id="rcRun"></canvas>
    <input id="rcName" maxlength="14" autocomplete="off" spellcheck="false"><div class="rc-kind" id="rcKind"></div>
    <div class="rc-btns"><button id="rcBeat">▶ ITS BEAT</button><button id="rcClose">CLOSE</button></div></div>`;
  document.body.appendChild(rc);
  let rcId=null,rcRaf=0;const trailPts=[];
  function openRacer(id,isNew){const r=incRacers.find(x=>x.id===id);if(!r)return;rcId=id;const k=EGG_KINDS[r.kind]||EGG_KINDS.light;
    $('rcKick').textContent=isNew?'A NEW RACER HATCHED!':'RACER';$('rcName').value=r.name||'';$('rcName').style.color=k.col;$('rcKind').textContent=k.title+' · RACES COME IN A LATER UPDATE';
    rc.classList.add('on');document.body.classList.add('racer-open');trailPts.length=0;cancelAnimationFrame(rcRaf);rcRaf=requestAnimationFrame(rcFrame);}
  function closeRacer(){if(E.on){eStop();muteMain(false);}rc.classList.remove('on');document.body.classList.remove('racer-open');cancelAnimationFrame(rcRaf);const r=incRacers.find(x=>x.id===rcId);
    if(r){const v=$('rcName').value.trim().toUpperCase().slice(0,14);if(v)r.name=v;}rcId=null;$('rcBeat').textContent='▶ ITS BEAT';save();refresh(true);}
  $('rcClose').addEventListener('click',closeRacer);
  rc.addEventListener('click',e=>{if(e.target===rc)closeRacer();});
  $('rcName').addEventListener('keydown',e=>{if(e.key==='Enter')$('rcName').blur();});
  $('rcBeat').addEventListener('click',()=>{const r=incRacers.find(x=>x.id===rcId);if(!r||!r.beat)return;
    if(E.on){eStop();muteMain(false);$('rcBeat').textContent='▶ ITS BEAT';return;}
    if(!r.beat.p.some(row=>row.some(Boolean))){toast('This racer has no beat yet.');return;}
    muteMain(true);eStart(r.beat,false,null);$('rcBeat').textContent='■ STOP';});
  // a little run across the card with the racer's own trail: Light = a prism beam that splits into a rainbow, Founder = gold sparks
  const PRISM=['#ff4d4d','#ff9f1c','#ffd23f','#44dd66','#3fa8ff','#9b6bff'];
  function rcFrame(now){rcRaf=requestAnimationFrame(rcFrame);const r=incRacers.find(x=>x.id===rcId);if(!r)return;
    const cv=$('rcRun'),Wd=Math.min(340,innerWidth*.84),H=Math.round(Wd*.55),d=Math.min(2,devicePixelRatio||1);
    if(cv.width!==Math.round(Wd*d)){cv.width=Math.round(Wd*d);cv.height=Math.round(H*d);cv.style.width=Wd+'px';cv.style.height=H+'px';}
    const g=cv.getContext('2d'),t=now/1000;g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,Wd,H);
    const gy=H*.82,sz=H*.42,period=3.2,f=(t%period)/period,x=-sz*.6+f*(Wd+sz*1.2),hop=Math.abs(Math.sin(t*Math.PI*2*.9)),y=gy-hop*H*.16;
    g.strokeStyle='rgba(120,255,190,.25)';g.lineWidth=1;g.setLineDash([6,8]);g.beginPath();g.moveTo(0,gy+2);g.lineTo(Wd,gy+2);g.stroke();g.setLineDash([]);
    if(trailPts.length&&x<trailPts[trailPts.length-1].x)trailPts.length=0;
    trailPts.push({x:x-sz*.18,y:y-sz*.42,t});while(trailPts.length&&t-trailPts[0].t>.6)trailPts.shift();
    const kind=(EGG_KINDS[r.kind]||{}).trail;
    if(kind==='prism'&&trailPts.length>1){g.lineCap='round';
      // white beam close to the buddy, splitting into six colours further back
      for(let i=1;i<trailPts.length;i++){const p=trailPts[i-1],q=trailPts[i],fr=i/(trailPts.length-1),split=(1-fr)*11;
        g.globalAlpha=fr*.9;g.strokeStyle='#ffffff';g.lineWidth=2+fr*3;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.stroke();
        PRISM.forEach((col,j)=>{const o=(j-2.5)*split*.5;g.globalAlpha=fr*.75*(1-fr*.6);g.strokeStyle=col;g.lineWidth=2;g.beginPath();g.moveTo(p.x,p.y+o);g.lineTo(q.x,q.y+o);g.stroke();});}
      g.globalAlpha=1;}
    else if(trailPts.length>1){trailPts.forEach((p,i)=>{const fr=i/trailPts.length;g.globalAlpha=fr;g.fillStyle=i%2?'#ffd23f':'#fff3a0';const s=1.5+fr*2.5;
      g.beginPath();g.moveTo(p.x,p.y-s);g.lineTo(p.x+s*.3,p.y-s*.3);g.lineTo(p.x+s,p.y);g.lineTo(p.x+s*.3,p.y+s*.3);g.lineTo(p.x,p.y+s);g.lineTo(p.x-s*.3,p.y+s*.3);g.lineTo(p.x-s,p.y);g.lineTo(p.x-s*.3,p.y-s*.3);g.fill();});g.globalAlpha=1;}
    try{drawBuddy(g,x,y,sz,{look:lookOf(r.kind),view:'side',face:1,run:(t*2.2)%1,air:hop>.25,t,speed:1,A:null});}catch(e){}}

  // ══ SHOP: HEAT LAMPS + WATT ALLOWANCE (shown once the Egg Incubator is owned) ══
  (function shop(){
    const sc=document.querySelector('#storeView .store-scroll');if(!sc)return;
    const t3=[...sc.querySelectorAll('.store-section-label')].find(l=>/TIER 3/.test(l.textContent));
    const lbl=document.createElement('div');lbl.className='store-section-label';lbl.id='incShopLbl';lbl.textContent='EGG INCUBATOR';
    const card=(id,title,sub,col)=>{const c=document.createElement('div');c.className='upgrade-card inc-shop';c.id=id;c.style.borderColor='#3a2a12';
      c.innerHTML=`<div class="upgrade-card-header" style="border-bottom-color:#3a2a12;"><div class="upgrade-card-title" style="color:${col};">${title}</div><div class="upgrade-card-sub">${sub}</div></div>
        <div class="upgrade-buy-btn"><div class="upgrade-counter" style="border-color:#3a2a12;"><div class="upgrade-counter-num" style="color:${col};">0</div><div class="upgrade-counter-lbl">OWNED</div></div>
        <div class="upgrade-effect"><div class="upgrade-effect-main"></div><div class="upgrade-effect-sub"></div></div><div class="upgrade-price"></div></div>`;return c;};
    const lamp=card('incLampCard','HEAT LAMPS','Warm more eggs at the same time','#ffb35a'),allow=card('incAllowCard','WATT ALLOWANCE','How many lamps can run at full heat','#ffd23f');
    if(t3){sc.insertBefore(lbl,t3);sc.insertBefore(lamp,t3);sc.insertBefore(allow,t3);}else{sc.appendChild(lbl);sc.appendChild(lamp);sc.appendChild(allow);}
    const q=(c,s)=>c.querySelector(s);
    function paint(){
      const sec=lbl.closest('.shop-sec')||null,on=incHas();
      if(sec)sec.style.display=on?'':'none';else[lbl,lamp,allow].forEach(e=>e.style.display=on?'':'none');
      if(!on)return;
      const L=incLamps(),lb=incLampsBought|0,lmax=lb>=6;
      q(lamp,'.upgrade-counter-num').textContent=L+'/'+INC_MAX_LAMPS;q(lamp,'.upgrade-counter-lbl').textContent='LAMPS';
      q(lamp,'.upgrade-effect-main').textContent=lmax?'ALL LAMPS LIT':'LAMP '+(L+1);q(lamp,'.upgrade-effect-sub').textContent=lmax?'Every incubator is yours':'One more egg can warm at once';
      q(lamp,'.upgrade-price').innerHTML=lmax?'MAX':jHtml(incLampPrice(lb));
      lamp.classList.toggle('inc-cant',!lmax&&score<incLampPrice(lb));
      const a=incAllow|0,amax=a>=3;
      q(allow,'.upgrade-counter-num').textContent=a;q(allow,'.upgrade-counter-lbl').textContent='LEVEL';
      q(allow,'.upgrade-effect-main').textContent=amax?incCovered()+' LAMPS AT FULL HEAT':(incCovered()+2)+' LAMPS AT FULL HEAT';
      q(allow,'.upgrade-effect-sub').textContent=amax?'The most power your lamps can take':'Now '+incCovered()+'. More eggs than that warm slower';
      q(allow,'.upgrade-price').innerHTML=amax?'MAX':jHtml(incAllowPrice(a));
      allow.classList.toggle('inc-cant',!amax&&score<incAllowPrice(a));
    }
    function buy(kind){
      if(!incHas())return;
      if(kind==='lamp'){const b=incLampsBought|0;if(b>=6)return;const p=incLampPrice(b);if(score<p){toast('Not enough energy yet.');return;}score-=p;incLampsBought=b+1;toast('Lamp '+incLamps()+' is lit!');}
      else{const a=incAllow|0;if(a>=3)return;const p=incAllowPrice(a);if(score<p){toast('Not enough energy yet.');return;}score-=p;incAllow=a+1;toast('Your lamps can now run '+incCovered()+' at full heat.');}
      try{if(typeof playSfxTierUnlock==='function')playSfxTierUnlock(3,.6);}catch(e){}
      save();paint();refresh(true);
    }
    q(lamp,'.upgrade-buy-btn').addEventListener('click',()=>buy('lamp'));q(allow,'.upgrade-buy-btn').addEventListener('click',()=>buy('allow'));
    let wasOn=null;setInterval(()=>{const on=incHas();if(on!==wasOn||visible(lamp)||visible(allow)){wasOn=on;paint();}},500);
    window.incShopPaint=paint;
  })();

  // test hook
  window.__inc={W,get income(){return income;},set income(v){income=v;buckets.length=0;for(let i=0;i<10;i++)buckets.push(v);},openEggPage,openRacer,closeEggPage,hatch,newEgg:incNewEgg,refresh};
})();
