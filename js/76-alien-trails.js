// ══════════════════════════════════════════════
//  ALIEN AWAKENING: TRAILS + SPEED (v0.2.183)
//  The node 'alien_awakening' wakes the buddies up:
//   • every floating buddy can leave a TRAIL. Each buddy has its own trail, picked in the Alien Designer (TRAIL tab,
//     saved as alienData[i].trail; default GLOW STREAK). One switch turns all trails on or off: TRAILS in the
//     Alien Party menu (saved as trailsOn). Trails and the party are independent: either, both or neither.
//   • a SPEED slider in the same menu (×0.5 … ×3, saved as alienSpeedMult) speeds the floating buddies up or slows
//     them down. Looks only: it never changes energy or gems. js/11 multiplies its movement step by it.
//  Glow Streak comes with Alien Awakening; the other 19 trails are a lane of nodes after it ('trail_<id>'), with the
//  three that move to the music (Music Notes, Soundwave, Equalizer) at the end as the prize.
//
//  How it draws: ONE canvas at the back of #alienLayer (behind every buddy). Each buddy keeps a short history of
//  where it has been; line trails are drawn along that history, particle trails spawn small dots as it moves
//  (more distance = more particles, so faster buddies leave longer trails). Music trails read a tiny analyser on the
//  music bus, only while one of them is on screen.
//  Kind to old iPhones: no shadowBlur, a particle cap, canvas resolution capped, and an automatic quality level that
//  drops (fewer particles, shorter trails) when frames get slow and recovers when they're fast again.
// ══════════════════════════════════════════════
const TRAILS=[
  {id:'glow',      name:'Glow Streak',    icon:'✨', node:'alien_awakening'},
  {id:'comet',     name:'Comet Tail',     icon:'☄️'},
  {id:'moondust',  name:'Moon Dust',      icon:'🌑'},
  {id:'frost',     name:'Frost Crystals', icon:'❄️'},
  {id:'fire',      name:'Fire Wake',      icon:'🔥'},
  {id:'stardust',  name:'Stardust',       icon:'⭐'},
  {id:'bubbles',   name:'Bubble Trail',   icon:'🫧'},
  {id:'rainbow',   name:'Rainbow Ribbon', icon:'🌈'},
  {id:'neon',      name:'Neon Line',      icon:'💜'},
  {id:'pixel',     name:'Pixel Trail',    icon:'👾'},
  {id:'paint',     name:'Paint Drips',    icon:'🎨'},
  {id:'confetti',  name:'Confetti',       icon:'🎊'},
  {id:'hearts',    name:'Hearts',         icon:'💖'},
  {id:'petals',    name:'Petal Drift',    icon:'🌸'},
  {id:'lightning', name:'Lightning Zap',  icon:'⚡'},
  {id:'aurora',    name:'Aurora Veil',    icon:'🌌'},
  {id:'echo',      name:'Echo',           icon:'👥'},
  {id:'notes',     name:'Music Notes',    icon:'🎵', music:true},
  {id:'soundwave', name:'Soundwave',      icon:'〰️', music:true},
  {id:'eq',        name:'Equalizer Bars', icon:'📊', music:true},
];
const TRAIL_MAP={};TRAILS.forEach(t=>{t.node=t.node||('trail_'+t.id);TRAIL_MAP[t.id]=t;});
function trailOwned(id){const t=TRAIL_MAP[id];return !!(t&&typeof unlockedSkills!=='undefined'&&unlockedSkills[t.node]);}
function trailOf(i){const a=typeof alienData!=='undefined'&&alienData[i];const id=a&&a.trail;if(id==='none')return null;return id&&trailOwned(id)?id:'glow';}

// ── the trail lane on the skill tree: 19 nodes after Alien Awakening, each unlocks one trail ──
(function addTrailNodes(){
  if(typeof SKILL_TREE_NODES==='undefined'||typeof SKILL_MAP==='undefined')return;
  const FACTS={
    comet:'A comet\'s tail always points away from the Sun, even when the comet is moving away from it: sunlight and the solar wind push the dust and gas behind it.',
    frost:'Every snowflake has six sides, because water molecules lock together in a six-sided pattern when they freeze.',
    bubbles:'The swirling colours on a soap bubble come from light bouncing off the inside and outside of a film thinner than a hair. The colours change as the film gets thinner.',
    lightning:'Lightning heats the air around it to about 30,000 °C, five times hotter than the surface of the Sun. The air expands so fast it makes a boom: thunder.',
    aurora:'Auroras glow when particles from the Sun crash into gases high in the air: oxygen glows green and red, nitrogen glows blue and purple.',
    soundwave:'Sound travels as a wave of squeezed and stretched air. A picture of that wave going up and down over time is called a waveform.',
    eq:'An equalizer splits sound into bands, from low bass to high treble, and shows (or changes) how loud each band is.',
  };
  let prev='alien_awakening',x=780,y=250;
  TRAILS.slice(1).forEach((t,k)=>{
    x+=86+(k%3)*6;y+=(k%2?-30:-52);
    // pushed after js/20's costBalance (aliens ×8) and gemsOnly passes, so prices are final here and the gem line is written
    // the same way gemsOnly writes it (every ordinary node is ×1.02 Alien Gems). 3,200 internal (0.32 J) rising ×1.15 per trail.
    const n={id:t.node,icon:t.icon,name:t.name,desc:(t.music?'A trail that moves to your music. ':'')+'Pick it for any buddy in the Alien Designer\'s TRAIL tab. ×1.02 Alien Gems.',
      cost:Math.round(400*8*Math.pow(1.15,k)/100)*100,requires:[prev],x,y,branch:'aliens',mult:0,gemMult:1.02};
    if(FACTS[t.id])n.fact=FACTS[t.id];
    if(!SKILL_MAP[n.id]){SKILL_TREE_NODES.push(n);SKILL_MAP[n.id]=n;}
    prev=n.id;
  });
  const aw=SKILL_MAP.alien_awakening;
  if(aw)aw.desc='Your buddies wake up and leave glowing trails as they float. The Alien Party menu gets a TRAILS switch and a SPEED slider, and the Alien Designer gets a TRAIL tab.'+(aw.gemMult&&aw.gemMult!==1?' ×'+(+aw.gemMult.toFixed(2))+' Alien Gems.':'');
})();

(function(){
  const layer=document.getElementById('alienLayer');if(!layer)return;
  const cv=document.createElement('canvas');cv.id='trailCanvas';layer.insertBefore(cv,layer.firstChild);
  const g=cv.getContext('2d');
  const LEGACY=document.documentElement.classList.contains('legacy-safari');
  const MOBILE=typeof IS_MOBILE_DEVICE!=='undefined'&&IS_MOBILE_DEVICE;
  let W=0,H=0,DPR=1;
  function fit(){const r=layer.getBoundingClientRect();DPR=Math.min(LEGACY?1:(MOBILE?1.5:2),window.devicePixelRatio||1);
    W=Math.max(1,r.width);H=Math.max(1,r.height);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';}
  fit();addEventListener('resize',fit);

  // ── quality: 1 = everything; drops when frames are slow ──
  let Q=LEGACY?.55:1,slowAcc=0,fastAcc=0;
  const CAP=()=>Math.round((MOBILE?150:380)*Q);
  const parts=[];   // particles: {x,y,vx,vy,age,life,k,c,s,r,vr,g}

  // ── music: a small analyser on the music bus, only while a music trail is on screen ──
  let an=null,anSrc=[],anOn=false,wave=null,freq=null,level=0,lastLevel=0,bands=[0,0,0,0,0];
  function taps(c){const t=[];
    if(typeof _lim!=='undefined'&&_lim&&_lim.c===c&&_lim.out)t.push(_lim.out);
    else if(typeof drumMasterReal!=='undefined'&&drumMasterReal)t.push(drumMasterReal);
    if(typeof partyMusicGain!=='undefined'&&partyMusicGain&&partyMusicGain.context===c)t.push(partyMusicGain);return t;}
  function musicOn(){if(anOn)return;try{const c=typeof getCtx==='function'&&getCtx();if(!c)return;
      if(!an||an.context!==c){an=c.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=.55;an.minDecibels=-90;an.maxDecibels=-15;wave=new Uint8Array(an.fftSize);freq=new Uint8Array(an.frequencyBinCount);}
      anSrc=taps(c);if(!anSrc.length)return;anSrc.forEach(n=>n.connect(an));anOn=true;}catch(e){}}
  function musicOff(){if(!anOn)return;anSrc.forEach(n=>{try{n.disconnect(an);}catch(e){}});anSrc=[];anOn=false;level=0;bands=[0,0,0,0,0];}
  setInterval(()=>{if(!anOn)return;try{const c=getCtx(),t=taps(c);if(an.context!==c||t.length!==anSrc.length||t.some((n,i)=>n!==anSrc[i])){musicOff();musicOn();}}catch(e){}},1000);
  function readMusic(){if(!anOn)return;an.getByteTimeDomainData(wave);let s=0;for(let i=0;i<wave.length;i+=2){const v=(wave[i]-128)/128;s+=v*v;}
    const rms=Math.sqrt(s/(wave.length/2));lastLevel=level;level=Math.max(Math.min(1,rms*3.4),level*.88);
    an.getByteFrequencyData(freq);const n=freq.length,edges=[1,3,7,15,32,n];for(let b=0;b<5;b++){let m=0;for(let i=edges[b];i<edges[b+1];i++)m=Math.max(m,freq[i]);bands[b]=Math.max(m/255,bands[b]*.82);}}

  // ── helpers ──
  const TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a);
  function hexA(c,a){if(!c||c[0]!=='#')return c||'#fff';let h=c.slice(1);if(h.length===3)h=h.replace(/./g,'$&$&');const n=parseInt(h,16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
  function colOf(b){if(b._trCol&&b._trColIdx===b.idx)return b._trCol;let tip='#ffd23f',body='#44eebb';
    try{const s=buddyLookSpec(b.idx);tip=s.tip||tip;body=s.body||body;}catch(e){}b._trColIdx=b.idx;return b._trCol={tip,body};}
  function emit(p){if(parts.length>=CAP())return;parts.push(p);}
  const RAINBOW=['#ff4d4d','#ff9f1c','#ffd23f','#44dd66','#3fa8ff','#9b6bff'];
  const CONF=['#ff4fa8','#ffd23f','#3fe6ff','#9dff3f','#ff8a3d','#b48aff'];
  function heart(x,y,s){g.beginPath();g.moveTo(x,y+s*.35);g.bezierCurveTo(x-s*1.1,y-s*.35,x-s*.35,y-s*1.05,x,y-s*.42);g.bezierCurveTo(x+s*.35,y-s*1.05,x+s*1.1,y-s*.35,x,y+s*.35);g.fill();}
  function star4(x,y,s){g.beginPath();g.moveTo(x,y-s);g.lineTo(x+s*.28,y-s*.28);g.lineTo(x+s,y);g.lineTo(x+s*.28,y+s*.28);g.lineTo(x,y+s);g.lineTo(x-s*.28,y+s*.28);g.lineTo(x-s,y);g.lineTo(x-s*.28,y-s*.28);g.closePath();g.fill();}
  function flake(x,y,s,r){g.save();g.translate(x,y);g.rotate(r);g.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6;g.moveTo(0,0);g.lineTo(Math.cos(a)*s,Math.sin(a)*s);
      g.moveTo(Math.cos(a)*s*.55,Math.sin(a)*s*.55);g.lineTo(Math.cos(a+.5)*s*.8,Math.sin(a+.5)*s*.8);}g.stroke();g.restore();}
  // a line along the buddy's recent path, fading towards the tail
  // (segments are thinned out so a line is at most ~6–16 strokes: fewer when the device is slow)
  function pathLine(h,col,w0,w1,a0,offN){const n=h.length;if(n<2)return;const st=Math.max(1,Math.ceil((n-1)/(6+10*Q)));
    for(let i=st;i<n+st-1;i+=st){const j=Math.min(i,n-1),f=j/(n-1),p=h[i-st],q=h[j];let ox=0,oy=0,ox2=0,oy2=0;
      if(offN){const dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy)||1;ox=-dy/L*offN(f,p.t);oy=dx/L*offN(f,p.t);ox2=-dy/L*offN(f,q.t);oy2=dx/L*offN(f,q.t);}
      g.globalAlpha=a0*f*f;g.lineWidth=w1+(w0-w1)*f;g.strokeStyle=col;g.beginPath();g.moveTo(p.x+ox,p.y+oy);g.lineTo(q.x+ox2,q.y+oy2);g.stroke();}
    g.globalAlpha=1;}

  // ── per-buddy trail drawing (line trails) and particle emission ──
  function drawBuddyTrail(b,id,h,moved,now,dt){
    const c=colOf(b),last=h[h.length-1],x=last.x,y=last.y,s=b.sz||60,sp=moved/Math.max(dt,.001);
    const per=px=>Math.min(6,moved/px*Q+(Math.random()<.04*Q?1:0));   // particles to emit this frame: one per `px` pixels travelled
    let k=0;
    switch(id){
      case 'glow':g.lineCap='round';if(Q>.6)pathLine(h,hexA(c.tip,.22),s*.32,2,1);pathLine(h,c.tip,s*.12,1,.9);break;
      case 'comet':{g.lineCap='round';if(Q>.6)pathLine(h,hexA('#ffffff',.18),s*.5,2,1);pathLine(h,'#cfe8ff',s*.2,1,.9);
        const r=g.createRadialGradient(x,y,0,x,y,s*.5);r.addColorStop(0,'rgba(220,240,255,.35)');r.addColorStop(1,'rgba(220,240,255,0)');g.fillStyle=r;g.fillRect(x-s*.5,y-s*.5,s,s);break;}
      case 'rainbow':g.lineCap='round';RAINBOW.forEach((col,j)=>(Q>.6||j%2===0)&&pathLine(h,col,4,2,.75,f=>(j-2.5)*3.4*(0.4+.6*f)));break;
      case 'neon':g.lineCap='round';if(Q>.6)pathLine(h,hexA('#ff3fd0',.18),12,4,1,f=>-3);pathLine(h,'#ff6ae0',3,1,1,f=>-3);if(Q>.6)pathLine(h,hexA('#3fe6ff',.18),12,4,1,f=>3);pathLine(h,'#6af0ff',3,1,1,f=>3);break;
      case 'lightning':{if(h.length<3)break;g.lineCap='round';g.lineJoin='round';const seed=Math.floor(now/70);
        for(let pass=0;pass<2;pass++){g.strokeStyle=pass?'#ffffff':hexA('#ffe45a',.5);g.lineWidth=pass?1.6:5;g.globalAlpha=.9;g.beginPath();
          for(let i=0;i<h.length;i+=2){const q=h[i],j=Math.sin(i*12.9898+seed*78.233)*43758.5453,jit=(j-Math.floor(j)-.5)*14*(1-i/h.length);
            i?g.lineTo(q.x+jit,q.y-jit):g.moveTo(q.x,q.y);}g.stroke();}g.globalAlpha=1;break;}
      case 'aurora':g.lineCap='round';pathLine(h,'rgba(80,255,170,.16)',s*.9,s*.3,1,f=>Math.sin(f*6+now/400)*8);if(Q>.6)pathLine(h,'rgba(170,90,255,.14)',s*.7,s*.2,1,f=>Math.sin(f*5+now/330+2)*10);break;
      case 'echo':{const img=b.el&&(b._trImg||(b._trImg=b.el.querySelector('canvas')));if(!img)break;const w=img.offsetWidth||s,hh=img.offsetHeight||s;
        [.75,.5,.25].forEach((f,j)=>{const q=h[Math.floor((h.length-1)*f)];if(!q)return;g.globalAlpha=.32-j*.09;try{g.drawImage(img,q.x-w/2,q.y-hh/2,w,hh);}catch(e){}});g.globalAlpha=1;break;}
      case 'soundwave':g.lineCap='round';{const amp=3+level*16;pathLine(h,hexA(c.tip,.35),5,2,1,(f,t)=>Math.sin(t/55)*amp*f);pathLine(h,c.tip,2,1,1,(f,t)=>Math.sin(t/55)*amp*f);}break;
      case 'eq':{const bw=5,gap=3,tot=5*bw+4*gap;[1,.6,.35].forEach((f,j)=>{const q=h[Math.floor((h.length-1)*f)];if(!q)return;g.globalAlpha=j?.35/j:.9;
        for(let i=0;i<5;i++){const v=.15+.85*bands[i],bh=4+v*s*.55,bx=q.x-tot/2+i*(bw+gap),by=q.y+s*.38;g.fillStyle=RAINBOW[i+1];g.fillRect(bx,by-bh,bw,bh);}});g.globalAlpha=1;break;}
      // particle trails: spawn as the buddy moves
      case 'moondust':for(k=per(14);k-->0;)emit({x:x+rnd(-6,6),y:y+s*.3,vx:rnd(-.2,.2),vy:rnd(-.25,.05),age:0,life:rnd(.6,1.1),k:'puff',c:'#a9a9b8',s:rnd(4,8)});break;
      case 'frost':for(k=per(16);k-->0;)emit({x:x+rnd(-8,8),y:y+rnd(-8,8),vx:rnd(-.2,.2),vy:rnd(.1,.4),age:0,life:rnd(.8,1.3),k:'flake',c:'#dff6ff',s:rnd(3,6),r:rnd(0,3),vr:rnd(-1,1)});break;
      case 'fire':for(k=per(8);k-->0;)emit({x:x+rnd(-6,6),y:y+rnd(-4,8),vx:rnd(-.3,.3),vy:rnd(-1.2,-.5),age:0,life:rnd(.4,.8),k:'ember',c:Math.random()<.5?'#ffb347':'#ff5a1a',s:rnd(2,4.5)});break;
      case 'stardust':for(k=per(12);k-->0;)emit({x:x+rnd(-10,10),y:y+rnd(-10,10),vx:rnd(-.15,.15),vy:rnd(-.15,.15),age:0,life:rnd(.6,1.1),k:'star',c:Math.random()<.6?'#fff3a0':'#ffffff',s:rnd(2.5,5)});break;
      case 'bubbles':for(k=per(18);k-->0;)emit({x:x+rnd(-8,8),y:y+rnd(-4,8),vx:rnd(-.2,.2),vy:rnd(-.7,-.3),age:0,life:rnd(.9,1.5),k:'bubble',c:'#bfefff',s:rnd(3,7)});break;
      case 'pixel':for(k=per(10);k-->0;)emit({x:Math.round((x+rnd(-8,8))/6)*6,y:Math.round((y+rnd(-8,8))/6)*6,vx:0,vy:0,age:0,life:rnd(.5,.9),k:'pix',c:CONF[(Math.random()*6)|0],s:5});break;
      case 'paint':for(k=per(16);k-->0;)emit({x:x+rnd(-7,7),y:y+s*.25,vx:0,vy:rnd(.15,.45),age:0,life:rnd(.9,1.4),k:'drip',c:c.body,s:rnd(3,5.5)});break;
      case 'confetti':for(k=per(10);k-->0;)emit({x:x+rnd(-8,8),y:y+rnd(-8,8),vx:rnd(-.6,.6),vy:rnd(-.3,.4),g:.02,age:0,life:rnd(.9,1.4),k:'conf',c:CONF[(Math.random()*6)|0],s:rnd(3,5),r:rnd(0,3),vr:rnd(-6,6)});break;
      case 'hearts':for(k=per(22);k-->0;)emit({x:x+rnd(-8,8),y:y+rnd(-6,6),vx:rnd(-.2,.2),vy:rnd(-.6,-.25),age:0,life:rnd(.8,1.3),k:'heart',c:Math.random()<.5?'#ff5fa2':'#ff8ac0',s:rnd(4,7)});break;
      case 'petals':for(k=per(16);k-->0;)emit({x:x+rnd(-8,8),y:y+rnd(-8,8),vx:rnd(-.5,.2),vy:rnd(.15,.45),age:0,life:rnd(1,1.6),k:'petal',c:Math.random()<.6?'#ffc6e6':'#ffffff',s:rnd(3,5),r:rnd(0,3),vr:rnd(-2,2)});break;
      case 'notes':{// a note pops out on each beat (when the music jumps) or every so often while moving
        const beat=anOn&&level-lastLevel>.08&&level>.15,timer=!anOn&&now-(b._trNote||0)>420;
        if(beat||timer||(moved>0&&now-(b._trNote||0)>900)){b._trNote=now;emit({x:x+rnd(-6,6),y:y-s*.2,vx:rnd(-.4,.4),vy:rnd(-.9,-.5),age:0,life:1.2,k:'note',c:CONF[(Math.random()*6)|0],s:rnd(13,18),t:Math.random()<.5?'♪':'♫'});}
        g.lineCap='round';pathLine(h,hexA(c.tip,.25),3,1,1);break;}
    }
  }
  function drawParts(dt){
    for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.age+=dt;if(p.age>=p.life){parts[i]=parts[parts.length-1];parts.pop();continue;}
      const f=p.age/p.life,a=1-f,m=dt*60;p.x+=p.vx*m;p.y+=p.vy*m;if(p.g)p.vy+=p.g*m;if(p.vr)p.r+=p.vr*dt;
      g.globalAlpha=a;g.fillStyle=p.c;g.strokeStyle=p.c;
      switch(p.k){
        case 'puff':g.globalAlpha=a*.45;g.beginPath();g.arc(p.x,p.y,p.s*(1+f*1.6),0,TAU);g.fill();break;
        case 'flake':g.lineWidth=1.2;flake(p.x,p.y,p.s,p.r);break;
        case 'ember':g.beginPath();g.arc(p.x,p.y,p.s*(1-f*.6),0,TAU);g.fill();break;
        case 'star':g.globalAlpha=a*(.55+.45*Math.sin(p.age*22));star4(p.x,p.y,p.s);break;
        case 'bubble':{const r=p.s*(1+f*.4);g.lineWidth=1.2;g.globalAlpha=f>.9?a*3:a*.8;g.beginPath();g.arc(p.x,p.y,r,0,TAU);g.stroke();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(p.x-r*.45,p.y-r*.5,1.6,1.6);break;}
        case 'pix':g.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);break;
        case 'drip':g.beginPath();g.arc(p.x,p.y,p.s*(1-f*.3),0,TAU);g.fill();g.fillRect(p.x-p.s*.35,p.y-p.s*2*f,p.s*.7,p.s*2*f);break;
        case 'conf':g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);g.restore();break;
        case 'heart':heart(p.x,p.y,p.s);break;
        case 'petal':g.save();g.translate(p.x,p.y);g.rotate(p.r);g.beginPath();g.ellipse(0,0,p.s,p.s*.5,0,0,TAU);g.fill();g.restore();break;
        case 'note':g.font=`bold ${Math.round(p.s)}px sans-serif`;g.textAlign='center';g.fillText(p.t,p.x,p.y);break;
      }
    }
    g.globalAlpha=1;
  }

  // ── the loop ──
  const HIST_S=.42;   // seconds of path each buddy remembers
  let lastT=0,dirty=false,visCheck=0,layerVisible=true;
  function active(){return typeof unlockedSkills!=='undefined'&&unlockedSkills.alien_awakening&&typeof trailsOn!=='undefined'&&trailsOn&&typeof showBouncers!=='undefined'&&showBouncers;}
  function frame(now){
    requestAnimationFrame(frame);
    const dt=Math.min(.1,(now-(lastT||now))/1000);lastT=now;
    if(now-visCheck>400){visCheck=now;layerVisible=getComputedStyle(layer).visibility!=='hidden';if(cv.width!==Math.round(layer.clientWidth*DPR))fit();}
    const on=!document.hidden&&active()&&layerVisible&&typeof bouncers!=='undefined'&&bouncers.length;
    if(!on){if(dirty){g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);dirty=false;parts.length=0;}musicOff();return;}
    // quality: slow frames (over ~24 ms) for a while → lighter; fast for a while → back up
    if(dt>.024){slowAcc+=dt;fastAcc=0;if(slowAcc>.5){Q=Math.max(.25,Q-.15);slowAcc=0;}}else{fastAcc+=dt;slowAcc=0;if(fastAcc>3){Q=Math.min(LEGACY?.6:1,Q+.05);fastAcc=0;}}
    g.setTransform(DPR,0,0,DPR,0,0);g.clearRect(0,0,W,H);dirty=true;
    let needMusic=false;
    for(const b of bouncers){
      const id=trailOf(b.idx);if(!id){b._trH=null;continue;}
      if(TRAIL_MAP[id].music)needMusic=true;
      const sz=b.sz||60,px=b.x+sz/2,py=b.y+sz/2;
      const h=b._trH||(b._trH=[]),prev=h[h.length-1];
      let moved=0;if(prev){moved=Math.hypot(px-prev.x,py-prev.y);if(moved>sz*2){h.length=0;moved=0;}}   // teleported (resize, party snap): start a fresh trail
      h.push({x:px,y:py,t:now});
      const keep=HIST_S*(.5+.5*Q)*1000;while(h.length>2&&now-h[0].t>keep)h.shift();
      drawBuddyTrail(b,id,h,moved,now,dt);
    }
    if(needMusic){musicOn();readMusic();}else musicOff();
    drawParts(dt);
  }
  requestAnimationFrame(frame);

  // ── a little picture of each trail, for the Alien Designer's TRAIL tab ──
  window.trailIcon=function(id,size,col){
    const c=document.createElement('canvas'),k=2;c.width=c.height=size*k;c.style.width=c.style.height=size+'px';const x=c.getContext('2d');x.scale(k,k);
    const S=size,mid=S/2;col=col||'#ffd23f';
    x.lineCap='round';x.lineJoin='round';
    const curve=(w,cl,a,off)=>{x.globalAlpha=a;x.strokeStyle=cl;x.lineWidth=w;x.beginPath();for(let i=0;i<=20;i++){const f=i/20,px=4+f*(S-8),py=mid+Math.sin(f*Math.PI*1.4+.3)*S*.18+(off||0);i?x.lineTo(px,py):x.moveTo(px,py);}x.stroke();x.globalAlpha=1;};
    const dots=(n,fn)=>{for(let i=0;i<n;i++){const f=(i+.5)/n;fn(4+f*(S-8),mid+Math.sin(f*Math.PI*1.4+.3)*S*.18,f,i);}};
    switch(id){
      case 'glow':curve(S*.18,hexA(col,.3),1);curve(S*.07,col,1);break;
      case 'comet':curve(S*.26,'rgba(255,255,255,.18)',1);curve(S*.1,'#cfe8ff',1);break;
      case 'rainbow':RAINBOW.forEach((cl,j)=>curve(2.6,cl,.9,(j-2.5)*2.6));break;
      case 'neon':curve(6,'rgba(255,63,208,.3)',1,-2.5);curve(2,'#ff6ae0',1,-2.5);curve(6,'rgba(63,230,255,.3)',1,2.5);curve(2,'#6af0ff',1,2.5);break;
      case 'lightning':x.strokeStyle='#ffe45a';x.lineWidth=2.4;x.beginPath();x.moveTo(5,mid-6);x.lineTo(S*.38,mid+3);x.lineTo(S*.48,mid-5);x.lineTo(S*.7,mid+6);x.lineTo(S*.62,mid-2);x.lineTo(S-5,mid+4);x.stroke();break;
      case 'aurora':curve(S*.32,'rgba(80,255,170,.3)',1);curve(S*.22,'rgba(170,90,255,.3)',1,4);break;
      case 'echo':[.3,.55,.9].forEach((a,j)=>{x.globalAlpha=a;x.fillStyle=col;x.beginPath();x.arc(10+j*S*.28,mid,S*.13,0,TAU);x.fill();});x.globalAlpha=1;break;
      case 'soundwave':x.strokeStyle=col;x.lineWidth=2;x.beginPath();for(let i=0;i<=40;i++){const f=i/40;const px=4+f*(S-8),py=mid+Math.sin(f*TAU*2.5)*S*.22*Math.sin(f*Math.PI);i?x.lineTo(px,py):x.moveTo(px,py);}x.stroke();break;
      case 'eq':[.5,.85,.6,1,.4].forEach((v,i)=>{x.fillStyle=RAINBOW[i+1];const bh=v*S*.6;x.fillRect(S*.15+i*S*.15,S*.8-bh,S*.1,bh);});break;
      case 'moondust':dots(5,(px,py,f)=>{x.globalAlpha=.25+.5*f;x.fillStyle='#a9a9b8';x.beginPath();x.arc(px,py,2+f*4,0,TAU);x.fill();});break;
      case 'frost':x.strokeStyle='#dff6ff';x.lineWidth=1.3;dots(4,(px,py,f)=>{const s=2.5+f*3;for(let i=0;i<6;i++){const a=i*TAU/6;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*s,py+Math.sin(a)*s);x.stroke();}});break;
      case 'fire':dots(7,(px,py,f,i)=>{x.fillStyle=i%2?'#ffb347':'#ff5a1a';x.beginPath();x.arc(px,py-f*4,1.5+f*2.5,0,TAU);x.fill();});break;
      case 'stardust':x.fillStyle='#fff3a0';dots(5,(px,py,f)=>{const s=2+f*3.5;x.beginPath();x.moveTo(px,py-s);x.lineTo(px+s*.3,py-s*.3);x.lineTo(px+s,py);x.lineTo(px+s*.3,py+s*.3);x.lineTo(px,py+s);x.lineTo(px-s*.3,py+s*.3);x.lineTo(px-s,py);x.lineTo(px-s*.3,py-s*.3);x.fill();});break;
      case 'bubbles':x.strokeStyle='#bfefff';x.lineWidth=1.2;dots(4,(px,py,f)=>{x.beginPath();x.arc(px,py-f*5,2+f*4,0,TAU);x.stroke();});break;
      case 'pixel':dots(6,(px,py,f,i)=>{x.fillStyle=CONF[i%6];x.fillRect(Math.round(px/4)*4,Math.round(py/4)*4,4,4);});break;
      case 'paint':x.fillStyle=col;dots(4,(px,py,f)=>{x.beginPath();x.arc(px,py,2.5+f*1.5,0,TAU);x.fill();x.fillRect(px-1.2,py,2.4,4+f*5);});break;
      case 'confetti':dots(7,(px,py,f,i)=>{x.save();x.translate(px,py+(i%2?3:-3));x.rotate(i);x.fillStyle=CONF[i%6];x.fillRect(-2.5,-1.2,5,2.4);x.restore();});break;
      case 'hearts':dots(3,(px,py,f)=>{x.fillStyle=f>.5?'#ff5fa2':'#ff8ac0';const s=3+f*3;x.beginPath();x.moveTo(px,py+s*.35);x.bezierCurveTo(px-s*1.1,py-s*.35,px-s*.35,py-s*1.05,px,py-s*.42);x.bezierCurveTo(px+s*.35,py-s*1.05,px+s*1.1,py-s*.35,px,py+s*.35);x.fill();});break;
      case 'petals':dots(5,(px,py,f,i)=>{x.save();x.translate(px,py);x.rotate(i*.9);x.fillStyle=i%2?'#ffffff':'#ffc6e6';x.beginPath();x.ellipse(0,0,3.5,1.8,0,0,TAU);x.fill();x.restore();});break;
      case 'notes':x.textAlign='center';x.font=`bold ${Math.round(S*.34)}px sans-serif`;['♪','♫','♪'].forEach((t,i)=>{x.fillStyle=CONF[i*2];x.fillText(t,S*.22+i*S*.28,mid+(i%2?-2:6));});break;
    }
    return c;
  };
})();

// ── the Alien Party menu: TRAILS on/off and SPEED (both appear once Alien Awakening is owned) ──
(function(){
  const base=window.openPartyMenu;if(typeof base!=='function')return;
  window.openPartyMenu=function(){
    base.apply(this,arguments);
    const menu=document.getElementById('partyMenu');
    if(!menu||!menu.classList.contains('open')||!(typeof unlockedSkills!=='undefined'&&unlockedSkills.alien_awakening))return;
    const box=document.createElement('div');box.className='pm-awake';
    box.innerHTML='<div class="pm-sub">AWAKENING</div>';
    const t=document.createElement('button');t.type='button';t.className='pm-trails'+(trailsOn?' on':'');
    const paint=()=>{t.className='pm-trails'+(trailsOn?' on':'');t.innerHTML='<span class="pm-dot"></span>TRAILS '+(trailsOn?'ON':'OFF');};paint();
    t.addEventListener('click',e=>{e.stopPropagation();trailsOn=!trailsOn;paint();if(typeof autoSave==='function')autoSave();});
    box.appendChild(t);
    const row=document.createElement('label');row.className='pm-speed';
    row.innerHTML='<span>SPEED</span><input type="range" min="0.5" max="3" step="0.25"><b></b>';
    const r=row.querySelector('input'),v=row.querySelector('b');r.value=String(alienSpeedMult);
    const show=()=>{v.textContent='×'+(+alienSpeedMult).toFixed(2).replace(/\.?0+$/,'');};show();
    r.addEventListener('input',()=>{alienSpeedMult=+r.value;show();});
    r.addEventListener('change',()=>{if(typeof autoSave==='function')autoSave();});
    ['pointerdown','touchstart'].forEach(ev=>row.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
    box.appendChild(row);menu.appendChild(box);
    // the menu grew: keep it on screen (same rule as js/69: under the PARTY button, or above it if there's no room)
    const pb=document.getElementById('partyBtn');if(!pb)return;
    const R=pb.getBoundingClientRect(),mw=menu.offsetWidth,mh=menu.offsetHeight,Wd=innerWidth,Hd=innerHeight;
    let x=Math.min(Wd-mw-8,Math.max(8,R.left+R.width/2-mw/2)),y=R.bottom+8;if(y+mh>Hd-8)y=Math.max(8,R.top-mh-8);
    menu.style.left=x+'px';menu.style.top=y+'px';
  };
})();
