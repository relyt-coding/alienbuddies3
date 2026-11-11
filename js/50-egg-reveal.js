// ── EGG HATCH (loot-box reveal) ──
// Your first alien buddy and every 10th one (the specials) hatch from an egg: it drops in and wobbles,
// you tap it to crack it (3 taps), it bursts open in a flash of light and the buddy spins out to face you.
// Special eggs are golden and starry, with a bigger burst. The new buddy stays hidden on screen until it hatches.
(function(){
  let root=null,cv=null,g=null,raf=0,S=320,dpr=1;
  let st=null;   // {idx,special,info,phase,t0,taps,shake,crackT,hatchT,parts,confetti}
  const TAU=Math.PI*2,rnd=s=>()=>{s=(s*9301+49297)%233280;return s/233280;};
  function build(){
    root=document.createElement('div');root.id='eggReveal';
    root.innerHTML=`<div class="er-rays"></div><div class="er-top"><div class="er-kicker" id="erKicker"></div><div class="er-title" id="erTitle"></div></div>
      <canvas id="erCanvas"></canvas><div class="er-hint" id="erHint">TAP THE EGG</div>
      <div class="er-btns" id="erBtns"><button id="erName">NAME IT</button><button id="erOk" class="er-ok">AWESOME!</button></div>`;
    document.body.appendChild(root);
    cv=root.querySelector('#erCanvas');g=cv.getContext('2d');
    cv.addEventListener('pointerdown',e=>{e.preventDefault();tap();});
    root.querySelector('#erOk').onclick=close;
    root.querySelector('#erName').onclick=()=>{const i=st&&st.idx;close();if(i!=null&&typeof openAlienNameModal==='function')setTimeout(()=>openAlienNameModal(i),250);};
  }
  // ── sounds (tiny synth, through the game's master volume) ──
  function sfx(kind){
    try{if(typeof sfxOn!=='undefined'&&!sfxOn)return;const c=getCtx(),now=c.currentTime,out=masterGainNode;
      if(kind==='crack'){const n=c.createBufferSource(),L=Math.round(c.sampleRate*.08),b=c.createBuffer(1,L,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,3);
        n.buffer=b;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=2400+Math.random()*1200;f.Q.value=1.2;const gn=c.createGain();gn.gain.value=.35;n.connect(f);f.connect(gn);gn.connect(out);n.start(now);}
      if(kind==='hatch'||kind==='special'){
        const notes=kind==='special'?[523.25,659.25,783.99,1046.5,1318.5,1567.98]:[392,523.25,659.25,783.99];
        notes.forEach((fq,i)=>{const o=c.createOscillator(),gn=c.createGain();o.type='triangle';o.frequency.value=fq;const t=now+i*.07;
          gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.09,t+.02);gn.gain.exponentialRampToValueAtTime(.001,t+(kind==='special'?1.4:.9));o.connect(gn);gn.connect(out);o.start(t);o.stop(t+1.5);});
        const n=c.createBufferSource(),L=Math.round(c.sampleRate*.6),b=c.createBuffer(1,L,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2);
        n.buffer=b;const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=5000;const gn=c.createGain();gn.gain.value=.12;n.connect(f);f.connect(gn);gn.connect(out);n.start(now);}
    }catch(e){}
  }
  // ── the egg ──
  const SPOTS=(()=>{const r=rnd(11),L=[];for(let i=0;i<14;i++)L.push([r()*2-1,r()*2-1,.05+r()*.07,r()]);return L;})();
  const CRACK=(()=>{const r=rnd(5),L=[];let x=-.95;while(x<.95){L.push([x,(r()-.5)*.22]);x+=.12+r()*.1;}L.push([.95,0]);return L;})();
  function eggPath(cx,cy,w,h){g.beginPath();g.moveTo(cx,cy-h);g.bezierCurveTo(cx+w*.92,cy-h,cx+w,cy+h*.15,cx+w,cy+h*.32);g.bezierCurveTo(cx+w,cy+h*.8,cx+w*.55,cy+h,cx,cy+h);
    g.bezierCurveTo(cx-w*.55,cy+h,cx-w,cy+h*.8,cx-w,cy+h*.32);g.bezierCurveTo(cx-w,cy+h*.15,cx-w*.92,cy-h,cx,cy-h);g.closePath();}
  function drawEgg(cx,cy,w,h,t,special,crack,clip){
    g.save();const GA=g.globalAlpha;
    if(clip==='top'||clip==='bottom'){g.beginPath();g.moveTo(cx-w*1.2,clip==='top'?cy-h*1.4:cy+h*1.4);
      CRACK.forEach(([x,y])=>g.lineTo(cx+x*w*1.05,cy-h*.05+y*h));g.lineTo(cx+w*1.2,clip==='top'?cy-h*1.4:cy+h*1.4);g.closePath();g.clip();}
    eggPath(cx,cy,w,h);
    const k=g.createRadialGradient(cx-w*.35,cy-h*.4,w*.1,cx,cy,h*1.2);
    if(special){k.addColorStop(0,'#fffbe0');k.addColorStop(.35,'#ffd23f');k.addColorStop(.75,'#e08a10');k.addColorStop(1,'#8a4a08');}
    else{k.addColorStop(0,'#ffffff');k.addColorStop(.4,'#f4ead8');k.addColorStop(.85,'#cdbfa6');k.addColorStop(1,'#8f8270');}
    g.fillStyle=k;g.fill();
    g.save();eggPath(cx,cy,w,h);g.clip();
    if(special){ // holographic band + stars
      const hb=g.createLinearGradient(cx-w,cy,cx+w,cy);['#ff4fa8','#3fe6ff','#9dff3f','#ffe14d','#b06bff'].forEach((c,i)=>hb.addColorStop(i/4,c));
      g.globalAlpha=GA*.45;g.fillStyle=hb;g.fillRect(cx-w,cy+h*.12,w*2,h*.2);g.globalAlpha=GA;
      SPOTS.forEach(([x,y,r,q],i)=>{if(i%2)return;const sx=cx+x*w*.75,sy=cy+y*h*.8,s=w*r*.9*(.7+.3*Math.sin(t*3+q*9));g.fillStyle='rgba(255,255,255,.9)';
        g.beginPath();g.moveTo(sx,sy-s);g.quadraticCurveTo(sx,sy,sx+s,sy);g.quadraticCurveTo(sx,sy,sx,sy+s);g.quadraticCurveTo(sx,sy,sx-s,sy);g.quadraticCurveTo(sx,sy,sx,sy-s);g.fill();});
    }else{ // pastel spots like a craft-store egg
      const cols=['#7fe3c0','#ff9ccf','#9fc5ff','#ffd27a'];
      SPOTS.forEach(([x,y,r,q],i)=>{g.fillStyle=cols[i%4];g.globalAlpha=GA*.75;g.beginPath();g.ellipse(cx+x*w*.8,cy+y*h*.85,w*r*1.4,w*r,q*3,0,TAU);g.fill();});g.globalAlpha=GA;
    }
    // shine
    g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(cx-w*.42,cy-h*.45,w*.16,h*.22,-.4,0,TAU);g.fill();
    // cracks grow with each tap
    if(crack>0){g.strokeStyle=special?'#5a2a04':'#4a3a2a';g.lineWidth=Math.max(1.5,w*.035);g.lineJoin='round';g.beginPath();
      const n=Math.max(2,Math.round(CRACK.length*Math.min(1,crack)));const mid=Math.floor(CRACK.length/2),a=Math.max(0,mid-Math.floor(n/2)),b=Math.min(CRACK.length,a+n);
      for(let i=a;i<b;i++){const[x,y]=CRACK[i];const px=cx+x*w*1.05,py=cy-h*.05+y*h;i===a?g.moveTo(px,py):g.lineTo(px,py);}g.stroke();
      if(crack>.6){g.beginPath();g.moveTo(cx+w*.1,cy-h*.05);g.lineTo(cx+w*.22,cy-h*.32);g.lineTo(cx+w*.14,cy-h*.45);g.stroke();}}
    g.restore();
    eggPath(cx,cy,w,h);g.strokeStyle=special?'rgba(90,40,4,.7)':'rgba(60,45,30,.55)';g.lineWidth=Math.max(1.5,w*.03);g.stroke();
    g.restore();
  }
  function frame(now){
    raf=requestAnimationFrame(frame);if(!st)return;
    const t=(now-st.t0)/1000,W=S,H=S*1.12;
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    const cx=W/2,baseY=H*.55,ew=W*.26,eh=W*.33,sp=st.special;
    // glow under the egg
    const gl=g.createRadialGradient(cx,baseY,ew*.2,cx,baseY,W*.55);gl.addColorStop(0,sp?'rgba(255,210,63,.45)':'rgba(0,255,136,.25)');gl.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gl;g.fillRect(0,0,W,H);
    if(st.phase!=='open'){
      // drop in with a bounce, then wobble; each tap gives a hard shake
      const drop=Math.min(1,t/.55),y=baseY-(1-drop)*H*.8+(drop<1?0:0),bounce=t<.85&&t>.55?Math.sin((t-.55)/.3*Math.PI)*-14:0;
      const wob=Math.sin(t*(sp?7:5))*.06*(t>.9?1:0)+st.shake*Math.sin(t*60)*.18;st.shake*=.9;
      g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(cx,baseY+eh*1.02,ew*.9,ew*.18,0,0,TAU);g.fill();
      g.save();g.translate(cx,y+bounce+eh);g.rotate(wob);g.translate(-cx,-(y+bounce+eh));
      drawEgg(cx,y+bounce,ew,eh,t,sp,st.taps/3,null);g.restore();
      parts(t);
      if(t>1.4&&st.taps===0)document.getElementById('erHint').classList.add('on');
      return;
    }
    // ── open: flash, the top flies off, the buddy spins out to face you ──
    const o=(now-st.hatchT)/1000;
    const rays=document.querySelector('#eggReveal .er-rays');
    // bottom shell
    g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(cx,baseY+eh*1.02,ew*.9,ew*.18,0,0,TAU);g.fill();
    g.save();g.globalAlpha=Math.max(0,Math.min(1,(2.6-o)/.8));drawEgg(cx,baseY,ew,eh,t,sp,1,'bottom');g.restore();
    // the buddy rises out of the egg, spinning, and lands facing you
    const k=Math.min(1,o/1.1),e=1-Math.pow(1-k,3),ang=20+(1-e)*720,size=W*.5*(.35+.65*e),by=baseY-eh*.25-e*eh*.35+Math.sin(Math.max(0,o-1.1)*3)*3;
    if(typeof drawBuddy==='function')drawBuddy(g,cx,by,size,{view:'turn',angle:ang,idx:st.idx,t:o+1,pulse:Math.pow(1-((o/.6)%1),3)});
    // top shell flies up and away
    if(o<1.2){const ty=-o*o*H*.9,tx=o*W*.25,rot=o*4;g.save();g.translate(cx+tx,baseY+ty);g.rotate(rot);g.translate(-cx,-baseY);g.globalAlpha=Math.max(0,1-o/1.2);drawEgg(cx,baseY,ew,eh,t,sp,1,'top');g.restore();}
    parts(t);
    // flash
    if(o<.35){g.fillStyle=`rgba(255,255,255,${(1-o/.35)*.9})`;g.fillRect(0,0,W,H);}
  }
  // shell chips and confetti
  function burst(n,cx,cy,cols,spd,life){const r=rnd(Math.floor(Math.random()*9999)+1);for(let i=0;i<n;i++){const a=r()*TAU,v=spd*(.4+r());st.fx.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-spd*.6,c:cols[i%cols.length],s:2+r()*4,r:r()*TAU,vr:(r()-.5)*12,t0:performance.now(),life:life*(.6+r()*.6),conf:life>1.2});}}
  function parts(){const now=performance.now();let last=st.lastP||now;const dt=Math.min(.05,(now-last)/1000);st.lastP=now;
    st.fx=st.fx.filter(p=>{const a=(now-p.t0)/1000;if(a>p.life)return false;p.vy+=(p.conf?260:700)*dt;p.vx*=p.conf?.985:1;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;
      g.save();g.globalAlpha=Math.min(1,(p.life-a)*2);g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;if(p.conf)g.fillRect(-p.s,-p.s*.5,p.s*2,p.s);else{g.beginPath();g.moveTo(-p.s,-p.s);g.lineTo(p.s,-p.s*.4);g.lineTo(-p.s*.2,p.s);g.closePath();g.fill();}g.restore();return true;});}
  function tap(){
    if(!st||st.phase==='open')return;
    const t=(performance.now()-st.t0)/1000;if(t<.6)return;   // let it land first
    st.taps++;st.shake=1;document.getElementById('erHint').classList.remove('on');sfx('crack');
    const W=S,cx=W/2,cy=W*1.12*.55;
    burst(6,cx+(Math.random()-.5)*W*.2,cy,st.special?['#ffd23f','#fff3a0','#e08a10']:['#f4ead8','#cdbfa6','#ffffff'],160,.7);
    if(navigator.vibrate)try{navigator.vibrate(15);}catch(e){}
    if(st.taps>=3)hatch();
  }
  function hatch(){
    st.phase='open';st.hatchT=performance.now();sfx(st.special?'special':'hatch');
    const W=S,cx=W/2,cy=W*1.12*.5;
    burst(st.special?70:40,cx,cy,st.special?['#ffd23f','#ff4fa8','#3fe6ff','#9dff3f','#ffffff','#b06bff']:['#00ff88','#ff9ccf','#9fc5ff','#ffd27a','#ffffff'],st.special?420:320,2.2);
    root.classList.add('open-burst');if(st.special)root.classList.add('special-burst');
    const a=alienData[st.idx]||{};
    document.getElementById('erKicker').textContent=st.special?'★ SPECIAL BUDDY ★':(st.idx===0?'YOUR FIRST':'NEW BUDDY');
    document.getElementById('erTitle').textContent=st.special&&st.info?st.info.name+' BUDDY':(a.name?a.name:'ALIEN BUDDY');
    document.getElementById('erTitle').style.color=getAlienColor(st.idx);
    setTimeout(()=>{if(st)root.classList.add('show-btns');},1100);
    // the buddy appears on screen now, popping in where it floats
    reveal(st.idx);
  }
  function reveal(idx){if(typeof bouncers==='undefined')return;bouncers.forEach(b=>{if(b.idx===idx&&b.el.classList.contains('hatching')){b.el.classList.remove('hatching');b.el.classList.add('hatched');setTimeout(()=>b.el.classList.remove('hatched'),900);}});}
  function open(idx){
    if(!root)build();
    const special=typeof buddyIsSpecialSlot==='function'&&buddyIsSpecialSlot(idx);
    st={idx,special,info:typeof buddySpecialInfo==='function'?buddySpecialInfo(idx):null,phase:'egg',t0:performance.now(),taps:0,shake:0,fx:[]};
    dpr=Math.min(2,window.devicePixelRatio||1);S=Math.round(Math.min(340,window.innerWidth*.86,window.innerHeight*.5));
    cv.width=S*dpr;cv.height=Math.round(S*1.12)*dpr;cv.style.width=S+'px';cv.style.height=Math.round(S*1.12)+'px';
    root.className=special?'special':'';root.classList.add('on');
    document.getElementById('erKicker').textContent=special?'★ SPECIAL EGG ★':(idx===0?'SOMETHING IS MOVING…':'A NEW EGG');
    document.getElementById('erTitle').textContent=special?'SOMETHING RARE INSIDE':'IT’S ABOUT TO HATCH';
    document.getElementById('erTitle').style.color='';
    document.getElementById('erHint').classList.remove('on');
    cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  }
  function close(){
    if(!root)return;if(st)reveal(st.idx);st=null;cancelAnimationFrame(raf);root.className='';
    if(typeof autoSave==='function')autoSave();
  }
  window.openEggReveal=open;
  // which new aliens hatch from an egg: the very first, and every 10th (the specials)
  window.alienHatches=i=>i===0||(typeof buddyIsSpecialSlot==='function'&&buddyIsSpecialSlot(i));
})();
