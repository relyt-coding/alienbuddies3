// ── Alien buddy characters drawn in the minigame art style ──
// Bright core → dark edge gradients with a white hotspot, ink-dark details, glowing accents, no emoji.
// drawBuddy(ctx, x, y, size, opts) draws the buddy centred at (x,y), about `size` px tall (same box as the old 👽 emoji).
//   opts.view : 'front' | 'side'      opts.face : 1 (right) | -1 (left)  (side view)
//   opts.run  : run phase in cycles (one cycle = two steps)               opts.air : true while jumping
//   opts.t    : seconds, for idle sway / blinking                         opts.speed: 0..1, how far the antennae sweep back
// The fuzzy body is pre-rendered once per size, so each frame is one drawImage plus a few small shapes (fine on old iPhones).
(function(){
  const BUDDIES={
    // CHLOE: a purple pom-pom with bead eyes and mouth (holes facing out), popsicle-stick feet,
    // pipe-cleaner antennae with glowing bead tips. Designed by AttackingTucans on the doodle pad.
    chloe:{name:'Chloe',
      fur:['#e59ad6','#b0509a','#8a3a74','#4f1745'],furLight:'#f2b8e6',furDark:'#3a0f33',
      eye:['#ff8a8a','#ff2b2b','#a3101f'],mouth:['#ffc08a','#ff8a3d','#b9501a'],
      foot:['#a8e6ff','#4dc3ff','#1f7fb0'],stem:['#fff3a0','#ffe14d','#c9a21c'],tip:['#ffd0a0','#ff8a3d','#c4521a'],
      glow:'#ff8a3d',trail:'255,138,61'}
  };
  let current='chloe';
  const cache={};
  function rnd(seed){let s=seed;return()=>{s=(s*9301+49297)%233280;return s/233280;};}
  // fuzzy pom-pom ball: layered tufts around the rim, soft shading, a white shine top-left
  function furBall(B,px){
    const key=current+'_'+px;if(cache[key])return cache[key];
    const c=document.createElement('canvas'),S=px*2;c.width=c.height=S;const g=c.getContext('2d'),R=px*.62,cx=px,cy=px,r=rnd(7);
    const halo=g.createRadialGradient(cx,cy,R*.8,cx,cy,R*1.5);halo.addColorStop(0,'rgba(176,80,154,.35)');halo.addColorStop(1,'rgba(176,80,154,0)');g.fillStyle=halo;g.fillRect(0,0,S,S);
    // outer tufts (dark), then the main ball, then lighter inner tufts
    for(let i=0;i<46;i++){const a=i/46*Math.PI*2+r()*.1,d=R*(.9+r()*.1),tr=R*(.15+r()*.08);g.fillStyle=B.fur[3];g.beginPath();g.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,tr,0,Math.PI*2);g.fill();}
    const bg=g.createRadialGradient(cx-R*.35,cy-R*.4,R*.08,cx,cy,R*1.05);bg.addColorStop(0,B.fur[0]);bg.addColorStop(.35,B.fur[1]);bg.addColorStop(.8,B.fur[2]);bg.addColorStop(1,B.fur[3]);
    g.fillStyle=bg;g.beginPath();g.arc(cx,cy,R*.98,0,Math.PI*2);g.fill();
    for(let i=0;i<40;i++){const a=i/40*Math.PI*2+r()*.15,d=R*(.86+r()*.08),tr=R*(.11+r()*.06),lit=Math.cos(a+2.3);   // tufts facing the light are lighter
      g.fillStyle=lit>.35?B.fur[1]:lit>-.4?B.fur[2]:B.fur[3];g.beginPath();g.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,tr,0,Math.PI*2);g.fill();}
    g.fillStyle=bg;g.beginPath();g.arc(cx,cy,R*.84,0,Math.PI*2);g.fill();
    // little fibres so it reads as fluffy, not a flat ball
    g.lineCap='round';
    for(let i=0;i<150;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*R*.95,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,l=R*(.05+r()*.06),aa=a+(r()-.5)*1.2,lit=(cx-x)+(cy-y)>R*.3;
      g.strokeStyle=lit?(r()<.5?B.furLight:B.fur[1]):(r()<.5?B.fur[3]:B.furDark);g.globalAlpha=.55;g.lineWidth=Math.max(1,R*.025);
      g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(aa)*l,y+Math.sin(aa)*l);g.stroke();}
    g.globalAlpha=1;
    const sh=g.createRadialGradient(cx-R*.38,cy-R*.42,0,cx-R*.38,cy-R*.42,R*.45);sh.addColorStop(0,'rgba(255,255,255,.45)');sh.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sh;g.beginPath();g.arc(cx-R*.38,cy-R*.42,R*.45,0,Math.PI*2);g.fill();
    cache[key]=c;return c;
  }
  const grad=(g,x,y,r,col)=>{const k=g.createRadialGradient(x-r*.35,y-r*.4,r*.05,x,y,r);k.addColorStop(0,col[0]);k.addColorStop(.45,col[1]);k.addColorStop(1,col[2]);return k;};
  // a bead seen from the front: a ring with the hole facing out
  function beadFront(g,x,y,rx,ry,col,blink){
    g.save();g.translate(x,y);g.scale(1,blink);
    g.fillStyle=grad(g,0,0,Math.max(rx,ry),col);g.beginPath();g.ellipse(0,0,rx,ry,0,0,Math.PI*2);g.fill();
    g.fillStyle='#fff';g.beginPath();g.ellipse(0,ry*.05,rx*.42,ry*.36,-.25,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(26,10,32,.35)';g.beginPath();g.ellipse(rx*.08,ry*.15,rx*.24,ry*.2,-.25,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(-rx*.5,-ry*.5,Math.max(1,rx*.14),0,Math.PI*2);g.fill();
    g.restore();
  }
  // pipe cleaner: a fuzzy yellow wire (thick dark pass, light pass, little fluff dots)
  function stem(g,pts,u,B){
    g.lineCap='round';g.lineJoin='round';
    const path=()=>{g.beginPath();g.moveTo(pts[0],pts[1]);g.bezierCurveTo(pts[2],pts[3],pts[4],pts[5],pts[6],pts[7]);};
    g.strokeStyle=B.stem[2];g.lineWidth=u*5.2;path();g.stroke();
    g.strokeStyle=B.stem[1];g.lineWidth=u*3.6;path();g.stroke();
    g.setLineDash([u*1.2,u*2.2]);g.strokeStyle=B.stem[0];g.lineWidth=u*2;path();g.stroke();g.setLineDash([]);
  }
  function tip(g,x,y,u,B,pulse){
    const hr=u*(13+pulse*5),h=g.createRadialGradient(x,y,u*2,x,y,hr);h.addColorStop(0,'rgba(255,170,90,.75)');h.addColorStop(1,'rgba(255,138,61,0)');g.fillStyle=h;g.beginPath();g.arc(x,y,hr,0,Math.PI*2);g.fill();
    g.fillStyle=grad(g,x,y,u*6,B.tip);g.beginPath();g.arc(x,y,u*6,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(x-u*2,y-u*2.2,u*1.4,0,Math.PI*2);g.fill();
  }
  // popsicle-stick foot: a rounded stick, pivoting at its top
  function foot(g,x,y,ang,len,w,col,dark){
    g.save();g.translate(x,y);g.rotate(ang);
    const k=g.createLinearGradient(-w/2,0,w/2,0);k.addColorStop(0,dark?col[2]:col[0]);k.addColorStop(.5,dark?col[2]:col[1]);k.addColorStop(1,col[2]);
    g.fillStyle=k;g.beginPath();if(g.roundRect)g.roundRect(-w/2,-w*.2,w,len,w/2);else g.rect(-w/2,-w*.2,w,len);g.fill();
    g.fillStyle='rgba(255,255,255,.35)';g.fillRect(-w*.28,w*.2,w*.14,len*.6);
    g.restore();
  }
  function drawFront(g,B,u,o){
    const t=o.t||0,sway=Math.sin(t*2.2)*u*2,pulse=o.pulse||0;
    // antennae: up from the top of the pom, arcing outward, beads hanging at the ends
    stem(g,[-u*8,-u*24, -u*10,-u*48, -u*30,-u*54, -u*34+sway,-u*36],u,B);
    stem(g,[u*8,-u*24, u*10,-u*48, u*30,-u*54, u*34+sway,-u*36],u,B);
    const ball=furBall(B,Math.max(16,Math.round(u*50)));g.drawImage(ball,-u*50,-u*50+u*2,u*100,u*100);
    // chunky stick feet poking out the bottom front, splayed like the drawing
    foot(g,-u*15,u*27,.32,u*18,u*14,B.foot);foot(g,u*15,u*27,-.32,u*18,u*14,B.foot);
    const blink=((t%3.7)<.12)?.15:1;
    beadFront(g,-u*11,-u*2,u*8,u*7,B.eye,blink);beadFront(g,u*11,-u*2,u*8,u*7,B.eye,blink);
    beadFront(g,0,u*14,u*7,u*5.2,B.mouth,1);
    tip(g,-u*34+sway,-u*36,u,B,pulse);tip(g,u*34+sway,-u*36,u,B,pulse);
  }
  function drawSide(g,B,u,o){
    const t=o.t||0,ph=(o.run||0)*Math.PI*2,air=!!o.air,sp=o.speed==null?1:o.speed,pulse=o.pulse||0;
    const bob=air?0:-Math.abs(Math.sin(ph))*u*3,lean=air?.05:.12*sp;
    // legs: a scissor stride, two steps per cycle; tucked forward in the air
    const swing=air?0:Math.sin(ph)*.6*sp,tuck=air?-.7:0;
    g.save();g.translate(0,bob);
    foot(g,-u*5,u*16,tuck+swing*-1,u*34,u*11,B.foot,true);                   // far leg (darker, behind)
    // far antenna, swept back a little more and drawn behind the body
    const sw=u*(10+8*sp)+Math.sin(ph*2)*u*2*sp,fl=Math.sin(t*3)*u;
    stem(g,[-u*6,-u*24, -u*4,-u*48, -u*22-sw*.6,-u*56, -u*30-sw,-u*40+fl],u,B);tip(g,-u*30-sw,-u*40+fl,u,B,pulse*.6);
    foot(g,u*5,u*16,tuck+swing,u*34,u*11,B.foot,false);                     // near leg, also tucked under the pom
    g.save();g.rotate(lean);
    const ball=furBall(B,Math.max(16,Math.round(u*50)));g.drawImage(ball,-u*50,-u*50+u*2,u*100,u*100);
    // near eye: bead seen from three-quarters, hole still facing out
    const blink=((t%3.7)<.12)?.15:1;
    g.save();g.translate(u*17,-u*3);g.scale(1,blink);
    g.fillStyle=grad(g,0,0,u*7,B.eye);g.beginPath();g.ellipse(0,0,u*5.2,u*7,0,0,Math.PI*2);g.fill();
    g.fillStyle='#fff';g.beginPath();g.ellipse(u*1.4,0,u*2.2,u*3.6,-.15,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(26,10,32,.4)';g.beginPath();g.ellipse(u*2,u*.6,u*1.2,u*2,-.15,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(-u*1.8,-u*3.2,u*1.1,0,Math.PI*2);g.fill();
    g.restore();
    // a sliver of the far eye peeking past the front of the pom
    g.fillStyle=B.eye[2];g.beginPath();g.ellipse(u*29,-u*3,u*1.6,u*5*blink,0,0,Math.PI*2);g.fill();
    // mouth bead poking out the front, opening facing forward
    const mx=u*27,my=u*13;
    g.fillStyle=grad(g,mx+u*3,my,u*6,B.mouth);g.beginPath();if(g.roundRect)g.roundRect(mx-u*2,my-u*4.6,u*8,u*9.2,u*2.5);else g.rect(mx-u*2,my-u*4.6,u*8,u*9.2);g.fill();
    g.fillStyle=B.mouth[1];g.beginPath();g.ellipse(mx+u*6,my,u*2.6,u*4.6,0,0,Math.PI*2);g.fill();
    g.fillStyle='#fff';g.beginPath();g.ellipse(mx+u*6.4,my,u*1.3,u*2.6,0,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255,255,255,.7)';g.fillRect(mx,my-u*3.6,u*3,u*1.2);
    g.restore();
    // near antenna: base on top, curving up and streaming back as she runs
    stem(g,[u*2,-u*24, u*4,-u*50, -u*14-sw*.4,-u*58, -u*22-sw*.8,-u*42-fl],u,B);tip(g,-u*22-sw*.8,-u*42-fl,u,B,pulse);
    g.restore();
  }
  window.drawBuddy=function(g,x,y,size,o){
    o=o||{};const B=BUDDIES[o.id||current]||BUDDIES.chloe,u=size/100;
    g.save();g.translate(x,y);
    if(o.view==='side'){if((o.face||1)<0)g.scale(-1,1);drawSide(g,B,u,o);}else drawFront(g,B,u,o);
    g.restore();
  };
  window.buddyInfo=function(id){return BUDDIES[id||current]||BUDDIES.chloe;};
})();
