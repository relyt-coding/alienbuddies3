// ══════════════════════════════════════════════
//  BUDDY KEYS (v0.2.136)
//  A shop unlock under DRUM PAD. Adds a PADS / KEYS switch: KEYS swaps the drum pads for an 8-key keyboard
//  with one of your own buddies sitting on each key. Tap a key and its buddy hops and sings the note in the
//  current voice. Every key tap earns exactly like a pad tap.
//  The keys follow the song's KEY when one is set (Galaxies → Key), otherwise C major, so nothing sounds wrong.
//  Ladder: level 1 = Buddy Keys with the OOH voice; levels 2–10 each add a voice (each +×1.2 tap mult, like sounds).
//  Saved in shop.keysLevel / keysOn / keysVoice / keysOct.
// ══════════════════════════════════════════════
const KEYS_VOICES=[
  {id:'ooh',     name:'OOH',      color:'#9d7bff'},
  {id:'aah',     name:'AAH',      color:'#ff7ac0'},
  {id:'bell',    name:'BELL',     color:'#ffd23f'},
  {id:'marimba', name:'MARIMBA',  color:'#ff9a4d'},
  {id:'whistle', name:'WHISTLE',  color:'#7ee8ff'},
  {id:'chip',    name:'CHIPTUNE', color:'#5fe07a'},
  {id:'robot',   name:'ROBOT',    color:'#b0b8c8'},
  {id:'kazoo',   name:'KAZOO',    color:'#ffb02e'},
  {id:'bass',    name:'BASS',     color:'#ff5577'},
  {id:'choir',   name:'CHOIR',    color:'#e6d4ff'},
];
const KEYS_REVEAL_AT=2e6;
function keysLadderCost(lvl){return _disc(bump30(2e7*Math.pow(20,lvl)));}   // unlock 26M, then ×20 per voice
function keysOwned(){return (shop.keysLevel||0)>0;}
function keysVoiceOwned(i){return i<(shop.keysLevel||0);}

(function(){
  const $=id=>document.getElementById(id);

  // ── voices ──
  // start(t,f,vel) → {stop(t)}: notes hold while the key is held, then fade with the voice's own release
  function env(g,t,a,peak,sus,d){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setTargetAtTime(peak*sus,t+a,d);}
  function release(g,oscs,t,r){const c=getCtx();t=Math.max(t,c.currentTime);
    // hold the level wherever the envelope is at t, then fade (never jump: .value can be stale before audio renders)
    if(g.gain.cancelAndHoldAtTime)g.gain.cancelAndHoldAtTime(t);else g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(0,t,r/3);
    oscs.forEach(o=>{try{o.stop(t+r*2.2);}catch(e){}});setTimeout(()=>{try{g.disconnect();}catch(e){}},(t-c.currentTime+r*2.5)*1000+80);}
  function vibrato(c,t,oscs,f,depth,delay){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=5.3;lg.gain.setValueAtTime(0,t);lg.gain.setValueAtTime(0,t+delay);lg.gain.linearRampToValueAtTime(f*depth,t+delay+.35);
    l.connect(lg);oscs.forEach(o=>lg.connect(o.frequency));l.start(t);return l;}
  // a sung vowel: saws through the vowel's formant filters
  function vowel(F,detunes,atk,peak,rel){
    return(t,f,vel,out)=>{const c=getCtx(),g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3600;lp.connect(g);g.connect(out);
      const mix=c.createGain();mix.gain.value=1/detunes.length;
      F.forEach(([fq,q,gn])=>{const bp=c.createBiquadFilter(),bg=c.createGain();bp.type='bandpass';bp.frequency.value=fq;bp.Q.value=q;bg.gain.value=gn*3;mix.connect(bp);bp.connect(bg);bg.connect(lp);});
      const os=detunes.map(dc=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=dc;o.connect(mix);o.start(t);return o;});
      os.push(vibrato(c,t,os,f,.011,.22));env(g,t,atk,peak*(.6+.4*vel),.85,.4);
      return{stop:T=>release(g,os,T,rel)};};
  }
  const SYN={
    ooh:vowel([[320,7,1],[800,9,.32],[2500,12,.07]],[0],.05,.52,.22),
    aah:vowel([[730,6,1],[1090,7,.5],[2440,9,.18]],[0],.05,.36,.22),
    choir:vowel([[650,5,1],[1080,6,.45],[2650,8,.14]],[-11,0,9],.16,.42,.45),
    bell(t,f,vel,out){const c=getCtx(),g=c.createGain(),car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain();g.connect(out);
      car.type='sine';car.frequency.value=f;mod.type='sine';mod.frequency.value=f*3.5;mg.gain.setValueAtTime(f*2.4*vel,t);mg.gain.setTargetAtTime(f*.2,t,.5);
      mod.connect(mg);mg.connect(car.frequency);car.connect(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.34,t+.004);g.gain.setTargetAtTime(0,t+.004,.9);
      [car,mod].forEach(o=>o.start(t));return{stop:T=>release(g,[car,mod],T,.5)};},
    marimba(t,f,vel,out){const c=getCtx(),g=c.createGain(),a=c.createOscillator(),b=c.createOscillator(),bg=c.createGain();g.connect(out);
      a.type='sine';a.frequency.value=f;b.type='sine';b.frequency.value=f*3.98;bg.gain.setValueAtTime(.3,t);bg.gain.setTargetAtTime(0,t,.03);b.connect(bg);bg.connect(g);a.connect(g);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5,t+.003);g.gain.setTargetAtTime(0,t+.003,.16);[a,b].forEach(o=>o.start(t));return{stop:T=>release(g,[a,b],T,.12)};},
    whistle(t,f,vel,out){const c=getCtx(),g=c.createGain(),o=c.createOscillator();g.connect(out);o.type='sine';o.frequency.setValueAtTime(f*1.94,t);o.frequency.linearRampToValueAtTime(f*2,t+.06);o.connect(g);
      const n=c.createBufferSource(),buf=c.createBuffer(1,c.sampleRate*.5|0,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;n.buffer=buf;n.loop=true;
      const bp=c.createBiquadFilter(),ng=c.createGain();bp.type='bandpass';bp.frequency.value=f*2;bp.Q.value=4;ng.gain.value=.05;n.connect(bp);bp.connect(ng);ng.connect(g);n.start(t);
      o.start(t);const v=vibrato(c,t,[o],f*2,.012,.18);env(g,t,.04,.3,.9,.3);return{stop:T=>release(g,[o,n,v],T,.1)};},
    chip(t,f,vel,out){const c=getCtx(),g=c.createGain(),o=c.createOscillator();g.connect(out);o.type='square';o.frequency.value=f*2;o.connect(g);o.start(t);
      const v=vibrato(c,t,[o],f*2,.014,.25);g.gain.setValueAtTime(.22,t);g.gain.setValueAtTime(.17,t+.06);return{stop:T=>release(g,[o,v],T,.04)};},
    robot(t,f,vel,out){const c=getCtx(),g=c.createGain(),am=c.createGain(),lp=c.createBiquadFilter(),a=c.createOscillator(),b=c.createOscillator(),l=c.createOscillator(),lg=c.createGain();
      g.connect(out);lp.type='lowpass';lp.frequency.value=2400;lp.Q.value=3;a.type='square';b.type='sawtooth';a.frequency.value=f;b.frequency.value=f*1.006;
      a.connect(lp);b.connect(lp);lp.connect(am);am.connect(g);am.gain.value=.5;l.frequency.value=42;lg.gain.value=.5;l.connect(lg);lg.connect(am.gain);
      [a,b,l].forEach(o=>o.start(t));env(g,t,.01,.22,.9,.3);return{stop:T=>release(g,[a,b,l],T,.08)};},
    kazoo(t,f,vel,out){const c=getCtx(),g=c.createGain(),o=c.createOscillator(),bp=c.createBiquadFilter(),bp2=c.createBiquadFilter(),g2=c.createGain();g.connect(out);
      o.type='sawtooth';o.frequency.setValueAtTime(f*.93,t);o.frequency.exponentialRampToValueAtTime(f,t+.07);bp.type='bandpass';bp.frequency.value=1150;bp.Q.value=2.2;bp2.type='bandpass';bp2.frequency.value=2900;bp2.Q.value=5;g2.gain.value=.5;
      o.connect(bp);o.connect(bp2);bp2.connect(g2);bp.connect(g);g2.connect(g);o.start(t);const v=vibrato(c,t,[o],f,.02,.15);env(g,t,.02,.72,.85,.3);return{stop:T=>release(g,[o,v],T,.06)};},
    bass(t,f,vel,out){const c=getCtx(),g=c.createGain(),lp=c.createBiquadFilter(),a=c.createOscillator(),b=c.createOscillator(),bg=c.createGain();g.connect(out);
      lp.type='lowpass';lp.Q.value=6;lp.frequency.setValueAtTime(1400,t);lp.frequency.setTargetAtTime(380,t+.01,.12);a.type='sawtooth';a.frequency.value=f/2;b.type='sine';b.frequency.value=f/4;bg.gain.value=.6;
      a.connect(lp);b.connect(bg);bg.connect(lp);lp.connect(g);[a,b].forEach(o=>o.start(t));env(g,t,.006,.3,.75,.2);return{stop:T=>release(g,[a,b],T,.08)};},
  };

  // ── notes ──
  const NOTE_NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
  function scale(){
    const on=typeof keyIsActive==='function'&&keyIsActive()&&seqKey!=null;
    const tonic=on?seqKey:0,minor=on&&seqKeyMinor;
    const steps=minor?[0,2,3,5,7,8,10,12]:MAJOR_SCALE.concat(12);
    let base=60+tonic;if(tonic>6)base-=12;               // keep the middle of the keyboard around middle C
    base+=12*(shop.keysOct||0);
    return steps.map(s=>base+s);
  }
  const N=8;

  // ── shop card (the same ladder card as ALIEN PARTY / SEQUENCER UPGRADES) ──
  const cardEl=document.createElement('div');cardEl.className='drum-card store-ladder-card';cardEl.id='keysCard';
  cardEl.innerHTML=`<div class="drum-card-header"><div class="drum-card-title">BUDDY KEYS</div><div class="drum-card-sub">Play live with your buddies</div></div>
    <div class="drum-buy-btn" id="keysCardBtn"><div class="drum-counter"><div class="drum-counter-num" id="keysCardNum">0</div><div class="drum-counter-lbl" id="keysCardLbl">VOICES</div></div>
    <div class="upgrade-effect"><div class="upgrade-effect-main" id="keysCardMain"></div><div class="upgrade-effect-sub" id="keysCardSub2"></div></div>
    <div class="drum-price" id="keysCardPrice"></div></div>`;
  const sl=$('soundLibCard');if(sl)sl.after(cardEl);
  function nextStep(){const lv=shop.keysLevel||0;if(lv>=KEYS_VOICES.length)return null;
    return lv===0?{cost:keysLadderCost(0),main:'BUDDY KEYS',sub:'Swap your pads for a keyboard your buddies sing on · +×1.2 tap mult'}
      :{cost:keysLadderCost(lv),main:'VOICE: '+KEYS_VOICES[lv].name,sub:'A new voice for your buddies to sing in · +×1.2 tap mult'};}
  function renderCard(){
    if(!shop.keysSeen&&score>=KEYS_REVEAL_AT)shop.keysSeen=true;
    const lv=shop.keysLevel||0;cardEl.style.display=(shop.keysSeen||lv>0)?'':'none';
    $('keysCardNum').textContent=lv;const nx=nextStep(),btn=$('keysCardBtn'),pr=$('keysCardPrice');
    if(!nx){btn.className='drum-buy-btn maxed';$('keysCardMain').textContent='EVERY VOICE';$('keysCardSub2').textContent='All '+KEYS_VOICES.length+' voices · change voice with the arrows above the keys';pr.className='drum-price';pr.textContent='MAX';return;}
    const can=score>=nx.cost;btn.className='drum-buy-btn '+(can?'buyable':'locked');
    $('keysCardMain').textContent=nx.main;$('keysCardSub2').textContent=nx.sub;pr.className='drum-price'+(can?'':' cant-afford');pr.innerHTML=`${formatStore(nx.cost)}<small>pts</small>`;
  }
  function buy(){
    const nx=nextStep();if(!nx||score<nx.cost)return;
    score-=nx.cost;const lv=shop.keysLevel||0;shop.keysLevel=lv+1;
    if(typeof playSfxPurchase==='function')playSfxPurchase();if(typeof flashBuy==='function')flashBuy(KEYS_VOICES[lv].color);
    if(lv===0){showToast('BUDDY KEYS unlocked! Tap KEYS above your pads to play.');}
    else{shop.keysVoice=lv;showToast(KEYS_VOICES[lv].name+' voice unlocked! Your buddies sing in it now.');}
    refreshUI();if(typeof renderUI==='function')renderUI();else renderCard();
    if(typeof autoSave==='function')autoSave();
  }
  addEP('keysCardBtn',buy);
  window.renderKeysCard=renderCard;window.__keysSyn=SYN;

  // ── game-screen UI ──
  const area=document.querySelector('#gameView .pad-area')||document.querySelector('.pad-area');
  const grid=$('padGrid');
  const root=document.createElement('div');root.id='buddyKeys';root.setAttribute('aria-hidden','true');
  root.innerHTML=`<div class="bk-bar"><button class="bk-arrow" id="bkPrev" aria-label="previous voice"></button><div class="bk-voice" id="bkVoice">OOH</div><button class="bk-arrow r" id="bkNext" aria-label="next voice"></button>
    <div class="bk-oct"><button id="bkOctDn" aria-label="octave down">−</button><span id="bkOct">MID</span><button id="bkOctUp" aria-label="octave up">+</button></div></div><canvas id="bkCanvas"></canvas>`;
  if(area){area.appendChild(root);}
  // PADS | KEYS toggle: sits just above the top-right corner of the pads (or the keyboard), in both modes
  const sw=document.createElement('div');sw.id='keysSwitch';sw.innerHTML='<button type="button" data-m="pads">PADS</button><button type="button" data-m="keys">KEYS</button>';
  if(area)area.appendChild(sw);
  const cv=root.querySelector('canvas'),bar=root.querySelector('.bk-bar');

  function isOn(){return keysOwned()&&!!shop.keysOn;}
  function setOn(on){
    shop.keysOn=!!on&&keysOwned();refreshUI();
    if(typeof fitPadArea==='function')fitPadArea();layout();
    if(typeof autoSave==='function')autoSave();
  }
  sw.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setOn(b.dataset.m==='keys')));
  function cycleVoice(d){const n=Math.max(1,shop.keysLevel||1);shop.keysVoice=(((shop.keysVoice||0)+d)%n+n)%n;paintBar();preview();if(typeof autoSave==='function')autoSave();}
  $('bkPrev').addEventListener('click',()=>cycleVoice(-1));$('bkNext').addEventListener('click',()=>cycleVoice(1));
  function setOct(d){shop.keysOct=Math.max(-1,Math.min(1,(shop.keysOct||0)+d));paintBar();sprites=null;if(typeof autoSave==='function')autoSave();}
  $('bkOctDn').addEventListener('click',()=>setOct(-1));$('bkOctUp').addEventListener('click',()=>setOct(1));
  function voice(){const i=Math.min(Math.max(0,shop.keysVoice||0),Math.max(0,(shop.keysLevel||1)-1));return KEYS_VOICES[i];}
  function paintBar(){
    const v=voice(),many=(shop.keysLevel||0)>1;$('bkVoice').textContent=v.name;$('bkVoice').style.color=v.color;
    $('bkPrev').style.visibility=$('bkNext').style.visibility=many?'':'hidden';
    const o=shop.keysOct||0;$('bkOct').textContent=o<0?'LOW':o>0?'HIGH':'MID';$('bkOctDn').disabled=o<=-1;$('bkOctUp').disabled=o>=1;
  }
  function refreshUI(){
    const own=keysOwned(),on=isOn();
    document.body.classList.toggle('keys-owned',own);document.body.classList.toggle('keys-on',on);
    sw.querySelectorAll('button').forEach(b=>b.classList.toggle('on',(b.dataset.m==='keys')===on));root.setAttribute('aria-hidden',on?'false':'true');
    paintBar();placeSwitch();if(on)start();else stop();
  }
  window.refreshBuddyKeys=refreshUI;

  function placeSwitch(){
    if(!keysOwned()||!area||!grid){sw.style.display='none';return;}
    const b=document.body.classList;
    if(!b.contains('game-active')||b.contains('daw-wide')||b.contains('pad-edit')){sw.style.display='none';return;}
    sw.style.display='flex';
    const ar=area.getBoundingClientRect(),gr=grid.getBoundingClientRect();
    sw.style.top=Math.round(gr.top-ar.top-(sw.offsetHeight||30)-6)+'px';sw.style.left=Math.round(gr.right-ar.left-(sw.offsetWidth||110))+'px';
  }

  // keyboard box: from the top of the pad grid down to just above the bottom row of pills
  let W=0,H=0,dpr=1,keyTop=0,keyW=0,sprites=null,spriteKey='';
  function layout(){
    if(!isOn()||!area||!grid)return;
    const ar=area.getBoundingClientRect(),gr=grid.getBoundingClientRect();
    let bottom=gr.bottom;const sb=$('soundboardBtn');
    if(sb&&sb.offsetParent!==null&&!document.body.classList.contains('desktop-mode')){const st=sb.getBoundingClientRect().top-10;if(st>bottom)bottom=st;}
    let h=Math.max(bottom-gr.top,170);
    root.style.left=Math.round(gr.left-ar.left)+'px';root.style.top=Math.round(gr.top-ar.top)+'px';root.style.width=Math.round(gr.width)+'px';root.style.height=Math.round(h)+'px';
    const bh=bar.offsetHeight||40,cw=Math.round(gr.width),ch=Math.max(120,Math.round(h-bh-6));
    dpr=Math.min(2,window.devicePixelRatio||1);
    if(cw!==W||ch!==H){W=cw;H=ch;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';}
    keyW=W/N;const bs=Math.min(keyW*1.12,H*.3);keyTop=Math.round(bs*1.3);   // headroom so a hopping buddy keeps its antennas on screen
    const sk=[Math.round(bs),totalAliens,dpr,shop.keysOct||0].join('|');if(sk!==spriteKey){spriteKey=sk;sprites=null;}
  }
  window.addEventListener('resize',()=>{setTimeout(()=>{layout();placeSwitch();},60);});

  // ── buddies: drawn once into sprites, then hop and squash with transforms (cheap on an iPhone 7) ──
  function buddyIdx(i){const n=typeof totalAliens==='number'?totalAliens:0;if(n<=0)return null;return i%n;}
  function makeSprites(){
    const bs=Math.round(Math.min(keyW*1.12,H*.3));sprites=[];
    for(let i=0;i<N;i++){
      const c=document.createElement('canvas'),S=Math.round(bs*1.3);c.width=S*dpr;c.height=S*dpr;const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
      const ang=Math.round((3.5-i)*7);   // they all turn a little toward the middle of the keyboard
      const idx=buddyIdx(i);
      try{drawBuddy(g,S/2,S*.66,bs*.86,Object.assign({view:'turn',angle:ang,lite:true,antenna:1,t:1,noShadow:true},idx==null?{id:'chloe'}:{idx}));}catch(e){}
      sprites.push({c,S});
    }
  }

  // ── play ──
  const held={};          // key index → {voice, n (touches holding it)}
  const hop=new Array(N).fill(-9),notes=[];
  function keyAt(x){return Math.max(0,Math.min(N-1,Math.floor(x/keyW)));}
  function press(i,ev){
    getCtx();const c=getCtx(),t=(typeof padTapTime==='function')?padTapTime(ev):c.currentTime;
    const v=voice(),f=440*Math.pow(2,(scale()[i]-69)/12);
    if(held[i]){held[i].n++;try{held[i].s.stop(t);}catch(e){}}else held[i]={n:1};
    try{held[i].s=SYN[v.id](t,f,1,drumMasterGain);}catch(e){held[i].s={stop(){}};}
    hop[i]=performance.now()/1000;notes.push({i,t0:hop[i],col:v.color,dx:(Math.random()-.5)*.6});if(notes.length>24)notes.shift();
    window._lastPadHit=performance.now();
    if(typeof addSeqEnergy==='function')addSeqEnergy(SEQ_ENERGY_PER_TAP);
    const r=cv.getBoundingClientRect();doTap({x:r.left+(i+.5)*keyW,y:r.top+keyTop,hex:v.color});
    kick();
  }
  function lift(i){const h=held[i];if(!h)return;h.n--;if(h.n<=0){try{h.s.stop(getCtx().currentTime);}catch(e){}delete held[i];kick();}}
  function preview(){const c=getCtx();try{const s=SYN[voice().id](c.currentTime,440*Math.pow(2,(scale()[0]-69)/12),1,drumMasterGain);s.stop(c.currentTime+.35);}catch(e){}hop[0]=performance.now()/1000;kick();}
  const fingers={};
  function relX(cx){return cx-cv.getBoundingClientRect().left;}
  cv.addEventListener('touchstart',e=>{if(e.cancelable)e.preventDefault();for(const tc of e.changedTouches){const i=keyAt(relX(tc.clientX));fingers[tc.identifier]=i;press(i,e);}},{passive:false});
  cv.addEventListener('touchmove',e=>{if(e.cancelable)e.preventDefault();for(const tc of e.changedTouches){const i=keyAt(relX(tc.clientX)),was=fingers[tc.identifier];if(was!=null&&i!==was){lift(was);fingers[tc.identifier]=i;press(i,e);}}},{passive:false});
  const endT=e=>{for(const tc of e.changedTouches){const i=fingers[tc.identifier];if(i!=null){lift(i);delete fingers[tc.identifier];}}};
  cv.addEventListener('touchend',endT);cv.addEventListener('touchcancel',endT);
  let mouseKey=null,lastTouch=0;cv.addEventListener('touchstart',()=>{lastTouch=performance.now();},{passive:true});
  cv.addEventListener('mousedown',e=>{if(performance.now()-lastTouch<800)return;mouseKey=keyAt(relX(e.clientX));press(mouseKey,e);});
  cv.addEventListener('mousemove',e=>{if(mouseKey==null)return;const i=keyAt(relX(e.clientX));if(i!==mouseKey){lift(mouseKey);mouseKey=i;press(i,e);}});
  window.addEventListener('mouseup',()=>{if(mouseKey!=null){lift(mouseKey);mouseKey=null;}});
  ['gesturestart','gesturechange','dblclick','selectstart'].forEach(n=>root.addEventListener(n,e=>{if(e.cancelable)e.preventDefault();},{passive:false}));
  // computer keyboard: A S D F G H J K play the 8 keys (only while the keys are showing)
  const KB='asdfghjk',down={};
  window.addEventListener('keydown',e=>{if(!isOn()||e.repeat||e.metaKey||e.ctrlKey||e.altKey)return;const tg=e.target;if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.isContentEditable))return;
    if(typeof overlayUp==='function'&&overlayUp())return;const i=KB.indexOf((e.key||'').toLowerCase());if(i<0)return;e.preventDefault();e.stopImmediatePropagation();if(down[i])return;down[i]=1;press(i,e);},true);
  window.addEventListener('keyup',e=>{const i=KB.indexOf((e.key||'').toLowerCase());if(i<0||!down[i])return;delete down[i];lift(i);},true);

  // ── draw ──
  let raf=0,lastDraw=0,busyUntil=0;
  function kick(){busyUntil=performance.now()/1000+1.6;if(!raf&&isOn())raf=requestAnimationFrame(frame);}
  function start(){layout();kick();}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;Object.keys(held).forEach(lift);}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();}
  function frame(){
    raf=0;if(!isOn())return;
    const b=document.body.classList;if(!b.contains('game-active')||(typeof overlayUp==='function'&&overlayUp())){raf=requestAnimationFrame(frame);return;}
    const now=performance.now()/1000,busy=now<busyUntil;
    // idle: ~20 fps is plenty for slow breathing; busy (keys being played): every frame
    if(!busy&&now-lastDraw<.05){raf=requestAnimationFrame(frame);return;}
    lastDraw=now;if(!W)layout();if(!sprites&&keyW)makeSprites();
    const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    const v=voice(),sc=scale(),pad=Math.max(2,keyW*.06),kh=H-keyTop-2;
    for(let i=0;i<N;i++){
      const x=i*keyW+pad/2,w=keyW-pad,on=!!held[i];
      const grd=g.createLinearGradient(0,keyTop,0,keyTop+kh);
      if(on){grd.addColorStop(0,v.color);grd.addColorStop(1,'#1a1030');}else{grd.addColorStop(0,'#f4f1ff');grd.addColorStop(.85,'#cfc8ea');grd.addColorStop(1,'#a59cc8');}
      g.save();if(on){g.shadowColor=v.color;g.shadowBlur=16;}rr(g,x,keyTop+(on?3:0),w,kh-(on?3:0),Math.min(10,w*.22));g.fillStyle=grd;g.fill();g.restore();
      // a soft lip at the top of each key for the buddy to stand on
      g.fillStyle='rgba(255,255,255,.55)';rr(g,x+3,keyTop+(on?5:2),w-6,4,2);g.fill();
      g.fillStyle=on?'#ffffff':'#5a4f86';g.font=`${Math.round(Math.max(14,Math.min(20,keyW*.36)))}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.textBaseline='alphabetic';
      g.fillText(NOTE_NAMES[((sc[i]%12)+12)%12],x+w/2,keyTop+kh-10);
    }
    // buddies
    if(sprites)for(let i=0;i<N;i++){
      const sp=sprites[i];if(!sp)continue;const age=now-hop[i],cx=(i+.5)*keyW,base=keyTop+(held[i]?5:2);
      let lift=0,sx=1,sy=1+.022*Math.sin(now*2.2+i*.9),tilt=0;
      if(age>=0&&age<.42){const p=age/.42;lift=Math.sin(p*Math.PI)*keyTop*.22;
        if(p<.18){const q=p/.18;sx=1+.14*Math.sin(q*Math.PI);sy=1-.14*Math.sin(q*Math.PI);}else{sy*=1+.07*Math.sin((p-.18)/.82*Math.PI);sx*=1-.04*Math.sin((p-.18)/.82*Math.PI);}
        tilt=.12*Math.sin(p*Math.PI*2)*(i<4?1:-1);}
      else if(held[i]){sy*=1+.03*Math.sin(now*14);}   // still singing: a little wobble
      g.save();g.translate(cx,base-lift);g.rotate(tilt);g.scale(sx,sy);g.drawImage(sp.c,-sp.S/2,-sp.S*.98,sp.S,sp.S);g.restore();
    }
    // notes floating up from whoever is singing
    for(let k=notes.length-1;k>=0;k--){const n=notes[k],a=now-n.t0;if(a>1.1){notes.splice(k,1);continue;}
      const p=a/1.1;g.globalAlpha=1-p;g.fillStyle=n.col;g.font=`${Math.round(Math.max(16,keyW*.42))}px sans-serif`;g.textAlign='center';
      g.fillText('♪',(n.i+.5+n.dx*p)*keyW+Math.sin(a*7)*4,keyTop*.3-p*keyTop*.28);g.globalAlpha=1;}
    raf=requestAnimationFrame(frame);
  }
  // keep the box lined up with the pads (their size changes with the sequencer, the tracker, rotation…)
  setInterval(()=>{placeSwitch();if(isOn())layout();},400);
  window.addEventListener('load',()=>{refreshUI();});
  setTimeout(refreshUI,0);
  (window._abLoadHooks=window._abLoadHooks||[]).push(()=>{sprites=null;spriteKey='';refreshUI();});
})();
