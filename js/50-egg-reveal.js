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
    root.querySelector('#erName').onclick=()=>{const i=st&&st.idx;queue.length=0;close();if(i!=null&&typeof openAlienNameModal==='function')setTimeout(()=>openAlienNameModal(i),250);};
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
  // A decorated craft egg: soft 3D shading, a painted zigzag band and polka dots in the colours of the buddy inside
  // (so the egg hints at who's coming), fine speckles, and a glossy highlight. Special eggs are polished gold with an
  // iridescent sheen sliding across, embossed stars and a rainbow band.
  const DOTS=(()=>{const r=rnd(11),L=[];for(let i=0;i<22;i++)L.push([r()*2-1,r()*1.8-.9,.05+r()*.06,r()]);return L;})();
  // neat rows of polka dots (above and below the band), staggered like a hand-painted egg
  // Polka dots scattered at random (but never touching each other or the zigzag band), different on every egg:
  // the layout comes from the buddy's colours, so a buddy's egg always looks the same if you see it again.
  const dotCache={};
  function scatterDots(key){
    if(dotCache[key])return dotCache[key];let sd=7;for(let i=0;i<key.length;i++)sd=(sd*31+key.charCodeAt(i))%2147483647;
    const r=rnd(sd||1),L=[];
    for(let tries=0;tries<600&&L.length<11;tries++){
      const y=-.86+r()*1.8;if(y>-.04&&y<.45)continue;                 // keep clear of the band
      const hw=halfW(y),x=(r()*2-1)*.86;if(Math.abs(x)>.9)continue;
      const sz=.085+r()*.085,s=sz*Math.min(1,hw*1.3);if(s<.04)continue;
      const px=x*hw,ok=L.every(d=>{const dx=(d.px-px)*1.0,dy=(d.y-y)*1.3;return Math.hypot(dx,dy)>(d.s+s)*1.35+.05;});
      if(ok)L.push({x,y,px,s,c:Math.floor(r()*4)});}
    return dotCache[key]=L;}
  const tint=(c,k)=>{const m=/^#?([0-9a-f]{6})$/i.exec(c||'');if(!m)return c;const n=parseInt(m[1],16);let R=n>>16,G=n>>8&255,B=n&255;
    const lum=(R*.3+G*.59+B*.11)/255;if(lum<.35)k=Math.max(k,.55);R=Math.round(R+(255-R)*k);G=Math.round(G+(255-G)*k);B=Math.round(B+(255-B)*k);return`rgb(${R},${G},${B})`;};
  const SPECK=(()=>{const r=rnd(29),L=[];for(let i=0;i<90;i++)L.push([r()*2-1,r()*2-1,r()]);return L;})();
  const CRACK=(()=>{const r=rnd(5),L=[];let x=-1.05;while(x<1.05){L.push([x,(r()-.5)*.24]);x+=.1+r()*.08;}L.push([1.05,0]);return L;})();
  function eggPath(cx,cy,w,h){g.beginPath();g.moveTo(cx,cy-h);g.bezierCurveTo(cx+w*.78,cy-h,cx+w,cy-h*.05,cx+w,cy+h*.3);g.bezierCurveTo(cx+w,cy+h*.78,cx+w*.56,cy+h,cx,cy+h);
    g.bezierCurveTo(cx-w*.56,cy+h,cx-w,cy+h*.78,cx-w,cy+h*.3);g.bezierCurveTo(cx-w,cy-h*.05,cx-w*.78,cy-h,cx,cy-h);g.closePath();}
  // half-width of the egg at height y (for wrapping the decorations round it)
  function halfW(y){const u=(y+1)/2;return Math.max(.05,Math.sin(Math.PI*Math.pow(u,.82)));}
  // The decorated shell never changes, so it's painted once into a sprite; each frame only draws the sprite plus
  // the moving bits (gold sheen, twinkles, cracks). Keeps the hatch smooth on old phones.
  const eggCache={};
  function drawEgg(cx,cy,w,h,t,special,crack,clip,pal){
    const key=(special?'S':'N')+pal.join()+'|'+Math.round(w)+'|'+Math.round(h);let sp=eggCache[key];
    if(!sp){const c=document.createElement('canvas'),k=dpr||1;c.width=Math.ceil(w*2.4*k);c.height=Math.ceil(h*2.4*k);
      const g0=g;g=c.getContext('2d');g.setTransform(k,0,0,k,0,0);drawEggPart(w*1.2,h*1.2,w,h,0,special,0,null,pal,'static');g=g0;
      for(const q in eggCache)delete eggCache[q];sp=eggCache[key]=c;}
    g.save();
    if(clip==='top'||clip==='bottom'){g.beginPath();g.moveTo(cx-w*1.3,clip==='top'?cy-h*1.4:cy+h*1.4);
      CRACK.forEach(([x,y])=>g.lineTo(cx+x*w,cy-h*.02+y*h));g.lineTo(cx+w*1.3,clip==='top'?cy-h*1.4:cy+h*1.4);g.closePath();g.clip();}
    g.drawImage(sp,cx-w*1.2,cy-h*1.2,w*2.4,h*2.4);
    drawEggPart(cx,cy,w,h,t,special,crack,null,pal,'live');
    g.restore();
  }
  function drawEggPart(cx,cy,w,h,t,special,crack,clip,pal,part){
    const ST=part==='static',LV=part==='live';
    g.save();const GA=g.globalAlpha;
    if(clip==='top'||clip==='bottom'){g.beginPath();g.moveTo(cx-w*1.3,clip==='top'?cy-h*1.4:cy+h*1.4);
      CRACK.forEach(([x,y])=>g.lineTo(cx+x*w,cy-h*.02+y*h));g.lineTo(cx+w*1.3,clip==='top'?cy-h*1.4:cy+h*1.4);g.closePath();g.clip();}
    if(ST){eggPath(cx,cy,w,h);
    // base colour
    const base=g.createLinearGradient(cx,cy-h,cx,cy+h);
    if(special){base.addColorStop(0,'#fff3b8');base.addColorStop(.45,'#ffc93c');base.addColorStop(1,'#c47a0c');}
    else{base.addColorStop(0,'#fffdf7');base.addColorStop(.6,'#f6efe2');base.addColorStop(1,'#e2d6c0');}
    g.fillStyle=base;g.fill();}
    g.save();eggPath(cx,cy,w,h);g.clip();
    if(special){
      // iridescent sheen sliding across + embossed stars + rainbow band
      const sx=cx+Math.sin(t*1.1)*w*.9,sh=g.createLinearGradient(sx-w*.6,cy-h,sx+w*.6,cy+h);
      ['rgba(255,80,190,0)','rgba(255,80,190,.35)','rgba(80,230,255,.35)','rgba(160,255,80,.3)','rgba(160,255,80,0)'].forEach((c,i)=>sh.addColorStop(i/4,c));
      if(LV){g.globalAlpha=GA*.55;g.fillStyle=sh;g.fillRect(cx-w,cy-h,w*2,h*2);g.globalAlpha=GA;}
      if(ST)DOTS.forEach(([x,y,r,q],i)=>{if(i%3)return;const hw=halfW(y),px=cx+x*w*hw*.88,py=cy+y*h,sq=Math.sqrt(Math.max(.15,1-x*x)),s=w*r*1.5;
        g.save();g.translate(px,py);g.scale(sq,1);g.fillStyle='rgba(150,80,0,.35)';star(1,1.2,s);g.fillStyle='rgba(255,250,210,.85)';star(0,0,s);g.restore();});
      if(ST)bandRainbow(cx,cy,w,h,t);
      if(LV)SPECK.forEach(([x,y,q],i)=>{if(i%3)return;const tw=Math.max(0,Math.sin(t*4+q*20));if(tw<.4)return;const hw=halfW(y),px=cx+x*w*hw*.9,py=cy+y*h;g.fillStyle=`rgba(255,255,255,${tw})`;g.beginPath();g.arc(px,py,1.2+tw,0,TAU);g.fill();});
    }else if(ST){
      // polka dots in the buddy's colours (softened so dark eye colours don't read as bugs), wrapped round the curve
      scatterDots(pal.join('|')).forEach(d=>{const hw=halfW(d.y),px=cx+d.x*w*hw,py=cy+d.y*h,sq=Math.sqrt(Math.max(.15,1-d.x*d.x)),s=w*d.s;
        g.fillStyle=tint(pal[d.c%pal.length],.18);g.beginPath();g.ellipse(px,py,s*sq,s,0,0,TAU);g.fill();
        g.fillStyle='rgba(0,0,0,.08)';g.beginPath();g.ellipse(px+s*sq*.15,py+s*.2,s*sq*.9,s*.75,0,0,TAU);g.fill();
        g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(px-s*sq*.3,py-s*.35,s*sq*.35,s*.22,-.4,0,TAU);g.fill();});
      // painted zigzag band in the buddy's main colour, with a white piped edge
      const by=cy+h*.13,bh=h*.17,N=12;g.beginPath();
      for(let k=0;k<=N;k++){const x=-1+2*k/N,px=cx+x*w*1.02,py=by+(k%2?-bh:bh)*.55;k?g.lineTo(px,py):g.moveTo(px,py);}
      for(let k=N;k>=0;k--){const x=-1+2*k/N,px=cx+x*w*1.02,py=by+(k%2?-bh:bh)*.55+bh*.9;g.lineTo(px,py);}
      g.closePath();g.fillStyle=tint(pal[0],.05);g.globalAlpha=GA*.95;g.fill();g.globalAlpha=GA;g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=Math.max(2,w*.035);g.stroke();
      // fine speckles like a real eggshell
      SPECK.forEach(([x,y,q])=>{const hw=halfW(y),px=cx+x*w*hw*.95,py=cy+y*h;g.fillStyle=`rgba(120,95,70,${.12+q*.18})`;g.beginPath();g.arc(px,py,.6+q*1.1,0,TAU);g.fill();});
    }
    if(ST){
    // 3D shading: shadow side (lower right), bounce light at the bottom, rim light on the left
    const sd=g.createRadialGradient(cx-w*.35,cy-h*.4,w*.2,cx-w*.1,cy-h*.1,h*1.35);sd.addColorStop(0,'rgba(0,0,0,0)');sd.addColorStop(.62,'rgba(0,0,0,0)');sd.addColorStop(1,special?'rgba(90,40,0,.5)':'rgba(70,50,30,.4)');
    g.fillStyle=sd;g.fillRect(cx-w,cy-h,w*2,h*2);
    const bl=g.createLinearGradient(cx,cy+h*.6,cx,cy+h);bl.addColorStop(0,'rgba(255,255,255,0)');bl.addColorStop(1,special?'rgba(255,220,120,.25)':'rgba(140,255,200,.18)');g.fillStyle=bl;g.fillRect(cx-w,cy,w*2,h);
    // gloss: a soft wide highlight and a small sharp one
    const gl=g.createRadialGradient(cx-w*.38,cy-h*.48,0,cx-w*.38,cy-h*.48,w*.55);gl.addColorStop(0,'rgba(255,255,255,.75)');gl.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gl;g.fillRect(cx-w,cy-h,w*2,h*2);
    g.fillStyle='rgba(255,255,255,.95)';g.beginPath();g.ellipse(cx-w*.45,cy-h*.55,w*.09,h*.13,-.45,0,TAU);g.fill();
    }
    // cracks: dark jagged line with a bright chipped edge, plus branches as it gets worse
    if(LV&&crack>0){
      const n=Math.max(2,Math.round(CRACK.length*Math.min(1,crack))),mid=Math.floor(CRACK.length/2),a=Math.max(0,mid-Math.floor(n/2)),b=Math.min(CRACK.length,a+n);
      const line=(dy)=>{g.beginPath();for(let i=a;i<b;i++){const[x,y]=CRACK[i];const px=cx+x*w,py=cy-h*.02+y*h+dy;i===a?g.moveTo(px,py):g.lineTo(px,py);}};
      g.lineJoin='round';g.lineCap='round';g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=Math.max(1.5,w*.04);line(2);g.stroke();
      g.strokeStyle=special?'#4a1e00':'#3a2a1a';g.lineWidth=Math.max(1.5,w*.035);line(0);g.stroke();
      if(crack>.5){[[.15,-.32,.08,-.48],[-.32,.05,-.4,.28]].forEach(([x1,y1,x2,y2])=>{g.beginPath();g.moveTo(cx+(x1*.4)*w,cy-h*.02);g.lineTo(cx+x1*w,cy+y1*h);g.lineTo(cx+x2*w,cy+y2*h);g.stroke();});}
    }
    g.restore();
    // outline: soft, coloured, not black
    if(ST){eggPath(cx,cy,w,h);g.strokeStyle=special?'rgba(110,50,0,.6)':'rgba(110,90,60,.35)';g.lineWidth=Math.max(1.5,w*.022);g.stroke();}
    g.restore();
    function star(dx,dy,s){g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?s*.45:s;g.lineTo(dx+Math.cos(a)*d,dy+Math.sin(a)*d);}g.closePath();g.fill();}
    function bandRainbow(cx,cy,w,h,t){const hb=g.createLinearGradient(cx-w,0,cx+w,0);['#ff4fa8','#ffe14d','#3fe6ff','#9dff3f','#b06bff'].forEach((c,i)=>hb.addColorStop(i/4,c));
      g.globalAlpha=GA*.7;g.fillStyle=hb;g.beginPath();g.moveTo(cx-w,cy+h*.12);g.quadraticCurveTo(cx,cy+h*.2,cx+w,cy+h*.12);g.lineTo(cx+w,cy+h*.27);g.quadraticCurveTo(cx,cy+h*.35,cx-w,cy+h*.27);g.closePath();g.fill();g.globalAlpha=GA;
      g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1.5;g.stroke();}
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
      drawEgg(cx,y+bounce,ew,eh,t,sp,st.taps/3,null,st.pal);g.restore();
      parts(t);
      if(t>1.4&&st.taps===0)document.getElementById('erHint').classList.add('on');
      return;
    }
    // ── open: flash, the top flies off, the buddy spins out to face you ──
    const o=(now-st.hatchT)/1000;
    const rays=document.querySelector('#eggReveal .er-rays');
    // bottom shell
    const shA=Math.max(0,Math.min(1,(2.6-o)/.8)),bobS=Math.sin(Math.max(0,o-1.1)*3),shW=ew*(.62+.28*shA)*(1-bobS*.04);g.fillStyle=`rgba(0,0,0,${.3+.05*shA-bobS*.03})`;g.beginPath();g.ellipse(cx,baseY+eh*1.02,shW,shW*.2,0,0,TAU);g.fill();
    g.save();g.globalAlpha=shA;drawEgg(cx,baseY,ew,eh,t,sp,1,'bottom',st.pal);g.restore();
    // the buddy rises out of the egg, spinning, and lands facing you
    const k=Math.min(1,o/1.1),e=1-Math.pow(1-k,3),ang=20+(1-e)*720,size=W*.5*(.35+.65*e),by=baseY-eh*.12-e*eh*.06+Math.sin(Math.max(0,o-1.1)*3)*3;
    if(typeof drawBuddy==='function')drawBuddy(g,cx,by,size,{view:'turn',angle:ang,idx:st.idx,t:o+1,noShadow:true,pulse:Math.pow(1-((o/.6)%1),3)});
    // top shell flies up and away
    if(o<1.2){const ty=-o*o*H*.9,tx=o*W*.25,rot=o*4;g.save();g.translate(cx+tx,baseY+ty);g.rotate(rot);g.translate(-cx,-baseY);g.globalAlpha=Math.max(0,1-o/1.2);drawEgg(cx,baseY,ew,eh,t,sp,1,'top',st.pal);g.restore();}
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
    const info0=typeof buddySpecialInfo==='function'?buddySpecialInfo(idx):null,special=!!info0;
    const L=typeof buddyLookSpec==='function'?buddyLookSpec(idx):{body:'#7fe3c0',tip:'#ff9ccf',eye:'#9fc5ff'};
    st={idx,special,info:info0,pal:[L.body,L.tip,L.eye,L.foot||L.body],phase:'egg',t0:performance.now(),taps:0,shake:0,fx:[]};
    dpr=Math.min(2,window.devicePixelRatio||1);S=Math.round(Math.min(340,window.innerWidth*.86,window.innerHeight*.5));
    cv.width=S*dpr;cv.height=Math.round(S*1.12)*dpr;cv.style.width=S+'px';cv.style.height=Math.round(S*1.12)+'px';
    root.className=special?'special':'';root.classList.add('on');
    document.getElementById('erKicker').textContent=special?'★ SPECIAL EGG ★':(idx===0?'SOMETHING IS MOVING…':'BUDDY #'+(idx+1));
    document.getElementById('erTitle').textContent=special?'SOMETHING RARE INSIDE':'IT’S ABOUT TO HATCH';
    document.getElementById('erTitle').style.color='';
    document.getElementById('erHint').classList.remove('on');
    cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  }
  function close(){
    if(!root)return;if(st)reveal(st.idx);st=null;cancelAnimationFrame(raf);root.className='';
    if(typeof autoSave==='function')autoSave();
    if(queue.length)setTimeout(()=>{const n=queue.shift();if(n!=null)open(n);},250);
  }
  const queue=[];
  window.openEggReveal=function(idx){if(st||(root&&root.classList.contains('on'))){if(!queue.includes(idx))queue.push(idx);return;}open(idx);};
  // which new aliens hatch from an egg: the very first, and every 10th (the specials)
  window.alienHatches=()=>true;   // every buddy hatches from an egg
})();
