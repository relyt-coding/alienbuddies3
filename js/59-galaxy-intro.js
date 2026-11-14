// ── "Explore the Galaxies" intro: plays once when the skill tree is first unlocked ──
// ~4 s, tap to skip. Hyperspace jump out of the bunker → burst of light → the Tucana Core ignites and the four
// Quad Suns swing into orbit around it → title → everything rushes toward the core and the skill tree opens.
// Sound: a rising engine whoosh into a bright major-chord bloom (Web Audio, through the game's master volume).
(function(){
  const TAU=Math.PI*2,ss=(a,b,x)=>{const k=Math.max(0,Math.min(1,(x-a)/(b-a)));return k*k*(3-2*k);};
  const SUNS=['#3fe6ff','#ff4fa8','#9dff3f','#ffb02e'];
  let root,cv,g,raf=0,run=null;
  function build(){
    root=document.createElement('div');root.id='galaxyIntro';
    root.innerHTML='<canvas></canvas><div class="gi-text"><div class="gi-kicker">A NEW FRONTIER</div><div class="gi-title">EXPLORE THE GALAXIES</div></div><div class="gi-skip">TAP TO SKIP</div>';
    document.body.appendChild(root);cv=root.querySelector('canvas');g=cv.getContext('2d');
    const skip=e=>{if(e)e.preventDefault();if(run&&run.el()>.5)finish();};
    root.addEventListener('pointerdown',skip);root.addEventListener('touchstart',skip,{passive:false});
  }
  function sound(){
    try{
      if(typeof getCtx!=='function')return;const c=getCtx();if(!c||typeof masterGainNode==='undefined'||!masterGainNode)return;const t=c.currentTime+.02;
      const out=c.createGain();out.gain.value=.9;out.connect(masterGainNode);
      // engine: two detuned saws sweeping up through a low-pass that opens
      const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(180,t);lp.frequency.exponentialRampToValueAtTime(3200,t+1.7);lp.frequency.exponentialRampToValueAtTime(400,t+2.4);
      const eg=c.createGain();eg.gain.setValueAtTime(0,t);eg.gain.linearRampToValueAtTime(.07,t+.4);eg.gain.linearRampToValueAtTime(.11,t+1.6);eg.gain.exponentialRampToValueAtTime(.001,t+2.3);
      lp.connect(eg);eg.connect(out);
      [0,7].forEach(d=>{const o=c.createOscillator();o.type='sawtooth';o.detune.value=d;o.frequency.setValueAtTime(55,t);o.frequency.exponentialRampToValueAtTime(220,t+1.7);o.connect(lp);o.start(t);o.stop(t+2.4);});
      // whoosh: filtered noise rising into the burst
      const n=c.createBufferSource(),buf=c.createBuffer(1,c.sampleRate*2.2,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;n.buffer=buf;
      const bp=c.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.2;bp.frequency.setValueAtTime(300,t);bp.frequency.exponentialRampToValueAtTime(5000,t+1.65);
      const ng=c.createGain();ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(.12,t+1.55);ng.gain.exponentialRampToValueAtTime(.001,t+2.1);
      n.connect(bp);bp.connect(ng);ng.connect(out);n.start(t);n.stop(t+2.2);
      // bloom: a shimmering major chord when the core ignites (C E G C' E')
      const b=t+1.7;[261.6,329.6,392,523.3,659.3].forEach((f,i)=>{[0,5].forEach(dt=>{const o=c.createOscillator(),gg=c.createGain();o.type=i<3?'triangle':'sine';o.frequency.value=f;o.detune.value=dt;
        gg.gain.setValueAtTime(0,b+i*.06);gg.gain.linearRampToValueAtTime(.045,b+i*.06+.08);gg.gain.exponentialRampToValueAtTime(.001,b+2.6);o.connect(gg);gg.connect(out);o.start(b+i*.06);o.stop(b+2.7);});});
      // sparkle arpeggio on top
      [1046.5,1318.5,1568,2093].forEach((f,i)=>{const o=c.createOscillator(),gg=c.createGain(),s=b+.35+i*.09;o.type='sine';o.frequency.value=f;gg.gain.setValueAtTime(0,s);gg.gain.linearRampToValueAtTime(.03,s+.02);gg.gain.exponentialRampToValueAtTime(.001,s+.5);o.connect(gg);gg.connect(out);o.start(s);o.stop(s+.55);});
    }catch(e){}
  }
  function frame(now){
    if(!run)return;raf=requestAnimationFrame(frame);
    const t=(now-run.t0)/1000,W=run.W,H=run.H,cx=W/2,cy=H*.46,R=Math.hypot(W,H)*.6;
    g.setTransform(run.dpr,0,0,run.dpr,0,0);
    // background: deep space that brightens toward the burst
    g.fillStyle='#02030a';g.fillRect(0,0,W,H);
    const neb=g.createRadialGradient(cx,cy,0,cx,cy,R);const nA=.25+.35*ss(1.5,2.2,t);neb.addColorStop(0,`rgba(70,40,140,${nA})`);neb.addColorStop(.5,`rgba(20,60,90,${nA*.5})`);neb.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=neb;g.fillRect(0,0,W,H);
    // speed: accelerates into the jump, drops out at the burst, then a slow drift
    const spd=t<1.65?.15+3.6*Math.pow(t/1.65,2.2):t<2.1?3.75*(1-ss(1.65,2.1,t))+.05:.05+ (t>3.4?2.4*ss(3.4,4,t):0);
    const dt=Math.min(.05,(now-(run.last||now))/1000);run.last=now;
    g.lineCap='round';
    run.stars.forEach(s=>{const z0=s.z;s.z-=dt*spd;if(s.z<=.02){s.z=1;s.a=Math.random()*TAU;s.r=.05+Math.random()*.95;}
      const p=z=>({x:cx+Math.cos(s.a)*s.r*R*.35/z,y:cy+Math.sin(s.a)*s.r*R*.35/z});
      const A=p(Math.min(1,s.z+dt*spd*1.6+.004)),B=p(s.z);
      if(B.x<-20||B.x>W+20||B.y<-20||B.y>H+20)return;
      const br=Math.min(1,.35+(1-s.z)*1.2);g.strokeStyle=`hsla(${s.h},90%,${72+20*br}%,${br})`;g.lineWidth=Math.max(1.3,(1-s.z)*3);
      g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.stroke();});
    // tunnel rings pulsing outward during the jump
    if(t<1.75){for(let i=0;i<4;i++){const k=((t*1.6+i/4)%1),rr=R*.05+k*k*R*.9;g.strokeStyle=`rgba(120,220,255,${(1-k)*.25*ss(.2,.8,t)})`;g.lineWidth=2+k*6;g.beginPath();g.arc(cx,cy,rr,0,TAU);g.stroke();}}
    // the core and the four quad suns
    const ig=ss(1.62,2.05,t),zoomOut=t>3.4?ss(3.4,4,t):0;
    if(ig>0){
      const sc=1+zoomOut*5,cr=Math.min(W,H)*.075*(.4+.6*ig)*sc;
      const halo=g.createRadialGradient(cx,cy,0,cx,cy,cr*5);halo.addColorStop(0,`rgba(255,230,150,${.55*ig})`);halo.addColorStop(.35,`rgba(255,170,60,${.2*ig})`);halo.addColorStop(1,'rgba(255,150,40,0)');
      g.fillStyle=halo;g.fillRect(cx-cr*5,cy-cr*5,cr*10,cr*10);
      // orbit ring
      const orb=Math.min(W,H)*.3*(.3+.7*ss(1.8,2.6,t))*sc;
      g.strokeStyle=`rgba(255,220,140,${.35*ig*(1-zoomOut)})`;g.lineWidth=1.5;g.setLineDash([4,7]);g.beginPath();g.ellipse(cx,cy,orb,orb*.42,0,0,TAU);g.stroke();g.setLineDash([]);
      // suns behind the core first, then the core, then the suns in front
      const ang=t*.9+.4,sl=SUNS.map((c,i)=>{const a=ang+i*TAU/4;return{c,x:cx+Math.cos(a)*orb,y:cy+Math.sin(a)*orb*.42,z:Math.sin(a),i};});
      const sun=s=>{const ap=ss(1.85+s.i*.12,2.35+s.i*.12,t);if(ap<=0)return;const r=Math.min(W,H)*.03*(.75+.25*s.z)*sc*ap;
        const k=g.createRadialGradient(s.x,s.y,0,s.x,s.y,r*3.2);k.addColorStop(0,s.c);k.addColorStop(.3,s.c+'aa');k.addColorStop(1,s.c+'00');g.globalAlpha=ap;g.fillStyle=k;g.beginPath();g.arc(s.x,s.y,r*3.2,0,TAU);g.fill();
        g.fillStyle='#ffffff';g.beginPath();g.arc(s.x,s.y,r*.55,0,TAU);g.fill();g.globalAlpha=1;};
      sl.filter(s=>s.z<0).forEach(sun);
      const cg=g.createRadialGradient(cx-cr*.3,cy-cr*.3,0,cx,cy,cr);cg.addColorStop(0,'#fffbe8');cg.addColorStop(.5,'#ffd25a');cg.addColorStop(1,'#ff9a2e');
      g.fillStyle=cg;g.beginPath();g.arc(cx,cy,cr,0,TAU);g.fill();
      sl.filter(s=>s.z>=0).forEach(sun);
    }
    // burst flash
    const fl=t>1.55&&t<2.4?Math.max(0,1-Math.abs(t-1.7)/(t<1.7?.15:.7)):0;
    if(fl>0){const k=g.createRadialGradient(cx,cy,0,cx,cy,R);k.addColorStop(0,`rgba(255,255,255,${fl})`);k.addColorStop(.4,`rgba(200,230,255,${fl*.6})`);k.addColorStop(1,`rgba(160,200,255,${fl*.15})`);g.fillStyle=k;g.fillRect(0,0,W,H);}
    // title in, then everything out as we fly into the core
    root.classList.toggle('gi-show',t>2.1&&t<3.55);
    if(t>3.5&&!run.opened){run.opened=true;run.onOpen&&run.onOpen();}
    root.style.opacity=t>3.75?String(Math.max(0,1-(t-3.75)/.35)):'';
    if(t>4.1)finish();
  }
  function finish(){
    if(!run)return;const r=run;run=null;cancelAnimationFrame(raf);
    if(!r.opened&&r.onOpen)r.onOpen();
    root.classList.remove('on','gi-show');root.style.opacity='';document.body.classList.remove('galaxy-intro');
    r.onDone&&r.onDone();
  }
  // ── hold to launch: while the unlock is affordable, holding the button charges it up (fill, rumble, rising
  // engine note); let go early and it powers back down; reach the top and the intro launches ──
  const HOLD=1.2;let hold=null;
  function holdHum(){try{if(typeof getCtx!=='function')return null;const c=getCtx();if(!c||!masterGainNode)return null;const t=c.currentTime;
    const o=c.createOscillator(),o2=c.createOscillator(),lp=c.createBiquadFilter(),gn=c.createGain();o.type='sawtooth';o2.type='sawtooth';o2.detune.value=9;
    o.frequency.setValueAtTime(48,t);o.frequency.exponentialRampToValueAtTime(110,t+HOLD);o2.frequency.setValueAtTime(48,t);o2.frequency.exponentialRampToValueAtTime(110,t+HOLD);
    lp.type='lowpass';lp.frequency.setValueAtTime(140,t);lp.frequency.exponentialRampToValueAtTime(1400,t+HOLD);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.08,t+.25);
    o.connect(lp);o2.connect(lp);lp.connect(gn);gn.connect(masterGainNode);o.start(t);o2.start(t);
    return{stop(fast){const n=c.currentTime;gn.gain.cancelScheduledValues(n);gn.gain.setValueAtTime(gn.gain.value,n);gn.gain.linearRampToValueAtTime(0,n+(fast?.05:.25));o.stop(n+.3);o2.stop(n+.3);}};}catch(e){return null;}}
  function armed(){return typeof skillTreeUnlocked!=='undefined'&&!skillTreeUnlocked&&typeof alienGems!=='undefined'&&Math.floor(alienGems)>=GEM_UNLOCK_COST;}
  // v0.2.137: once the galaxies are unlocked a tap just opens them, and holding the button replays the launch.
  // The charge-up waits a moment before it shows, so an ordinary tap never flashes it.
  function holdMode(){if(armed())return 'unlock';if(typeof skillTreeUnlocked!=='undefined'&&skillTreeUnlocked)return 'replay';return null;}
  const REPLAY_WAIT=.22;
  function setP(btn,p){btn.style.setProperty('--hp',p.toFixed(3));btn.classList.toggle('charging',p>0);
    const sh=p>.15?(p*p*2.2):0;btn.style.transform=sh?`translate(${(Math.random()-.5)*sh}px,${(Math.random()-.5)*sh}px)`:'';}
  function holdTick(now){if(!hold)return;const p=Math.max(0,Math.min(1,(now-hold.t0)/1000/HOLD));
    if(p>0&&!hold.hum&&!hold.humTried){hold.humTried=true;hold.hum=holdHum();}
    setP(hold.btn,p);hold.p=p;
    if(p>=1){const b=hold.btn,h=hold.hum,mode=hold.mode;hold=null;h&&h.stop(true);setP(b,0);b.classList.add('launched');setTimeout(()=>b.classList.remove('launched'),600);
      if(navigator.vibrate)try{navigator.vibrate(30);}catch(e){}
      if(mode==='replay')replay();else window.doSkillTreeUnlock&&window.doSkillTreeUnlock();
      return;}
    hold.raf=requestAnimationFrame(holdTick);}
  function replay(){
    if(document.body.classList.contains('galaxy-intro'))return;
    if(typeof playGalaxyIntro==='function')playGalaxyIntro(()=>{if(typeof openSkillTree==='function')openSkillTree();},null);
    else if(typeof openSkillTree==='function')openSkillTree();
  }
  window.replayGalaxyIntro=replay;
  function holdStart(e){const btn=e.currentTarget,mode=holdMode();if(!mode||hold)return;if(e.cancelable)e.preventDefault();
    btn._skipOpen=false;
    hold={btn,mode,p:0,t0:performance.now()+(mode==='replay'?REPLAY_WAIT*1000:0),hum:mode==='unlock'?holdHum():null,humTried:mode==='unlock'};hold.raf=requestAnimationFrame(holdTick);}
  function holdEnd(){if(!hold)return;const h=hold;hold=null;cancelAnimationFrame(h.raf);h.hum&&h.hum.stop();
    // let go part-way through a replay charge: that was a hold, not a tap, so don't open the tree as well
    if(h.mode==='replay'&&h.p>.12)h.btn._skipOpen=true;
    // power back down smoothly
    const b=h.btn,p0=parseFloat(b.style.getPropertyValue('--hp'))||0,t0=performance.now();
    (function down(now){const p=Math.max(0,p0-(now-t0)/1000/.3*p0);setP(b,p);if(p>0)requestAnimationFrame(down);})(t0);}
  window.stHoldNudge=function(){const b=document.getElementById('skillTreeUnlockBtn');if(!b||hold)return;b.classList.remove('nudge');void b.offsetWidth;b.classList.add('nudge');};
  function wire(){const b=document.getElementById('skillTreeUnlockBtn');if(!b)return;
    b.addEventListener('pointerdown',holdStart);['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,holdEnd));
    b.addEventListener('contextmenu',e=>{if(holdMode())e.preventDefault();});
    b.addEventListener('click',e=>{if(b._skipOpen){b._skipOpen=false;e.stopImmediatePropagation();e.preventDefault();}},true);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
  // onOpen fires just before the intro fades, so the skill tree is already there underneath
  window.playGalaxyIntro=function(onOpen,onDone){
    if(!root)build();if(run)finish();
    const dpr=Math.min(2,window.devicePixelRatio||1),W=window.innerWidth,H=window.innerHeight;
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
    const stars=[];for(let i=0;i<(W*H>400000?260:180);i++)stars.push({a:Math.random()*TAU,r:.05+Math.random()*.95,z:Math.random(),h:[190,200,280,320,150][i%5]});
    run={t0:performance.now(),W,H,dpr,stars,onOpen,onDone,opened:false,el(){return(performance.now()-this.t0)/1000;}};
    root.classList.add('on');document.body.classList.add('galaxy-intro');sound();
    raf=requestAnimationFrame(frame);
  };
})();
