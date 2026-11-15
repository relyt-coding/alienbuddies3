// ══════════════════════════════════════════════
//  ALIEN GEMS LOOK LIKE ALIEN GEMS (v0.2.150) — the "Gem Buddy": a cut green crystal with a little face and
//  Chloe-style pipe-cleaner antennae with glowing pink bead tips. It replaces the 💎 emoji everywhere.
//
//  • Static: every 💎 in the page's text is swapped for a small drawn gem (span.agem), as the game writes it.
//    (Text in tooltips, typed text boxes and the save data keeps the emoji; only what you see changes.)
//  • Live: where there's room (the gem counters in the bunker, the shop and the galaxy map, and anything marked
//    .agem-live) the gem bobs slowly, its antennae trail behind the motion on springs, and now and then it blinks.
//    One shared animation loop, ~30 fps, only for gems that are actually on screen; still for reduced-motion users.
// ══════════════════════════════════════════════
(function(){
  const INK='#1a0a20',TAU=Math.PI*2,GEM='\u{1F48E}';
  const rg=(g,x,y,r,c)=>{const k=g.createRadialGradient(x-r*.35,y-r*.4,r*.06,x,y,r);k.addColorStop(0,c[0]);k.addColorStop(.5,c[1]);k.addColorStop(1,c[2]);return k;};
  const lg=(g,x0,y0,x1,y1,c)=>{const k=g.createLinearGradient(x0,y0,x1,y1);c.forEach((v,i)=>k.addColorStop(i/(c.length-1),v));return k;};
  function poly(g,p){g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();}
  function ink(g,w){g.strokeStyle=INK;g.lineWidth=w;g.lineJoin='round';g.lineCap='round';g.stroke();}

  // Draws the gem in a 100×100 box. o: {glow, ant:[[dxL,dyL],[dxR,dyR]] tip offsets, blink 0..1, y body offset}
  function drawGem(g,o){
    o=o||{};const a=o.ant||[[0,0],[0,0]],by=o.y||0,bl=o.blink||0;
    if(o.glow){const k=g.createRadialGradient(50,60+by,8,50,60+by,46);k.addColorStop(0,'rgba(80,255,180,.32)');k.addColorStop(1,'rgba(80,255,180,0)');g.fillStyle=k;g.fillRect(0,0,100,100);}
    // antennae (behind the body): base on the crystal's top edge, tip trails behind the motion
    [[-1,0],[1,1]].forEach(([s,i])=>{
      const bx=50+s*8,byy=37+by,tx=50+s*20+a[i][0],ty=14+by+a[i][1],cx=50+s*14+a[i][0]*.45,cy=18+by+a[i][1]*.35;
      g.beginPath();g.moveTo(bx,byy);g.quadraticCurveTo(cx,cy,tx,ty);g.strokeStyle=INK;g.lineWidth=7;g.lineCap='round';g.stroke();g.strokeStyle='#c9a8ff';g.lineWidth=3.5;g.stroke();
      g.fillStyle=rg(g,tx,ty,7.5,['#ffffff','#ff7ae0','#b0207f']);g.beginPath();g.arc(tx,ty,7.5,0,TAU);g.fill();ink(g,2.6);
    });
    g.save();g.translate(0,by);
    const P=[[30,38],[70,38],[86,56],[50,92],[14,56]];
    poly(g,P);g.fillStyle=lg(g,20,38,80,92,['#b8ffe6','#33e6a0','#0f8a6a']);g.fill();
    g.fillStyle='rgba(255,255,255,.35)';poly(g,[[30,38],[50,38],[42,56],[14,56]]);g.fill();
    g.fillStyle='rgba(0,60,50,.3)';poly(g,[[50,92],[58,56],[86,56]]);g.fill();
    g.strokeStyle='rgba(20,60,50,.55)';g.lineWidth=2;g.beginPath();g.moveTo(14,56);g.lineTo(86,56);g.moveTo(42,56);g.lineTo(50,92);g.lineTo(58,56);g.moveTo(42,56);g.lineTo(50,38);g.lineTo(58,56);g.stroke();
    poly(g,P);ink(g,4);
    // face (v0.2.151: eyes sit up in the crown, above the girdle line)
    const EY=o.eyeY||51;
    if(bl>.5){g.strokeStyle=INK;g.lineWidth=2.6;g.lineCap='round';[40,60].forEach(x=>{g.beginPath();g.moveTo(x-3.6,EY);g.quadraticCurveTo(x,EY+2.5,x+3.6,EY);g.stroke();});}
    else{g.fillStyle=INK;[40,60].forEach(x=>{g.beginPath();g.ellipse(x,EY,3.6,3.6*(1-bl*1.6),0,0,TAU);g.fill();});
      if(bl<.2){g.fillStyle='#fff';[41,61].forEach(x=>{g.beginPath();g.arc(x,EY-1,1.2,0,TAU);g.fill();});}}
    g.restore();
  }
  window.drawAlienGem=drawGem;

  // ── the static icon: drawn once, used as a background image ──
  let URL_=null;
  try{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.scale(1.28,1.28);drawGem(g,{});URL_=c.toDataURL('image/png');}catch(e){}
  if(!URL_)return;   // (no canvas: keep the emoji)
  window.ALIEN_GEM_URL=URL_;
  const css=document.createElement('style');css.textContent=`
.agem{display:inline-block;width:1.15em;height:1.15em;vertical-align:-.24em;background:url(${URL_}) center/contain no-repeat;flex-shrink:0;}
.agem-live{display:inline-block;width:1.5em;height:1.5em;vertical-align:-.42em;flex-shrink:0;position:relative;}
.agem-live canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
.gem-icon{font-size:inherit;}
`;document.head.appendChild(css);

  // ── swap 💎 in visible text for the drawn gem ──
  const SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,OPTION:1,TITLE:1,CANVAS:1,SELECT:1};
  function makeIcon(){const s=document.createElement('span');s.className='agem';s.setAttribute('role','img');s.setAttribute('aria-label','Alien Gems');return s;}
  function fixText(n){
    const v=n.nodeValue;if(!v||v.indexOf(GEM)<0)return;
    const p=n.parentNode;if(!p||SKIP[p.nodeName])return;
    // a slot that's just the gem (e.g. .gem-icon) gets the live, bobbing one
    if(p.nodeType===1&&p.childNodes.length===1&&v.trim()===GEM&&p.classList&&p.classList.contains('gem-icon')){p.textContent='';p.appendChild(makeLive());return;}
    const parts=v.replace(/️/g,'').split(GEM),f=document.createDocumentFragment();
    parts.forEach((t,i)=>{if(i)f.appendChild(makeIcon());if(t)f.appendChild(document.createTextNode(t));});
    p.replaceChild(f,n);
  }
  function fixTree(root){
    if(!root)return;
    if(root.nodeType===3){fixText(root);return;}
    if(root.nodeType!==1||SKIP[root.nodeName])return;
    if((root.textContent||'').indexOf(GEM)<0)return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),list=[];let n;while((n=w.nextNode()))if(n.nodeValue.indexOf(GEM)>=0)list.push(n);
    list.forEach(fixText);
  }
  const obs=new MutationObserver(recs=>{
    for(const r of recs){
      if(r.type==='characterData'){fixText(r.target);continue;}
      for(const n of r.addedNodes)fixTree(n);
    }
  });
  function start(){fixTree(document.body);obs.observe(document.body,{childList:true,subtree:true,characterData:true});}

  // ── the live gem ──
  const live=new Set();
  const still=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function makeLive(){
    const s=document.createElement('span');s.className='agem-live';s.setAttribute('role','img');s.setAttribute('aria-label','Alien Gems');
    const c=document.createElement('canvas');s.appendChild(c);
    s._st={ph:Math.random()*TAU,sp:.85+Math.random()*.3,ant:[{x:0,y:0,vx:0,vy:0},{x:0,y:0,vx:0,vy:0}],blinkAt:performance.now()+1500+Math.random()*4000,blinkT:-1,lastY:0,lastV:0};
    live.add(s);kick();return s;
  }
  window.makeLiveAlienGem=makeLive;
  let raf=0,lastT=0,fr=0;
  function kick(){if(!raf){lastT=0;raf=requestAnimationFrame(loop);}}
  function loop(now){
    raf=0;if(!live.size)return;
    raf=requestAnimationFrame(loop);
    if((++fr)%2)return;                                   // ~30 fps
    const dt=Math.min(.05,lastT?(now-lastT)/1000:.033);lastT=now;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    live.forEach(s=>{
      if(!s.isConnected){live.delete(s);return;}
      const r=s.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;
      const c=s.firstChild,W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(c.width!==W||c.height!==H){c.width=W;c.height=H;}
      const g=c.getContext('2d'),st=s._st;
      // slow bob (~3 s per cycle)
      const t=now/1000*st.sp,y=still?0:Math.sin(t*2.1+st.ph)*4.2;
      const v=(y-st.lastY)/dt,acc=(v-st.lastV)/dt;st.lastY=y;st.lastV=v;
      // antenna tips on springs: they lag behind the bob and wobble a little in a soft "breeze"
      st.ant.forEach((A,i)=>{
        if(still){A.x=A.y=0;return;}
        const breeze=Math.sin(t*1.3+i*1.7+st.ph)*.9+Math.sin(t*3.1+i)*.35;
        const fy=-170*A.y-7*A.vy-acc*.85, fx=-140*A.x-6*A.vx+breeze*55+(i?1:-1)*acc*.12;
        A.vy+=fy*dt;A.vx+=fx*dt;A.y+=A.vy*dt;A.x+=A.vx*dt;
        A.y=Math.max(-9,Math.min(9,A.y));A.x=Math.max(-8,Math.min(8,A.x));
      });
      // blink now and then
      let bl=0;
      if(!still){if(st.blinkT<0&&now>st.blinkAt){st.blinkT=now;}
        if(st.blinkT>=0){const k=(now-st.blinkT)/140;bl=k<1?k:k<2?2-k:0;if(k>=2){st.blinkT=-1;st.blinkAt=now+2500+Math.random()*4500;}}}
      g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);
      g.setTransform(W/100*.92,0,0,H/100*.92,W*.04,H*.06);
      drawGem(g,{y,ant:st.ant.map(A=>[A.x,A.y]),blink:bl,glow:r.width>=28});
    });
  }
  window.addEventListener('visibilitychange',()=>{if(!document.hidden)kick();});
  // the dedicated gem slots in the page get the live gem straight away, then everything else is swapped and watched
  document.querySelectorAll('.gem-icon').forEach(e=>{if(e.textContent.trim()===GEM||!e.textContent.trim()){e.textContent='';e.appendChild(makeLive());}});
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
