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
  // a glossy pony bead turned partly sideways: thick shiny ring, black hole, a sliver of the inner wall, iridescent sheen
  function ponyBead(g,x,y,r,col,sx,blink,tilt){
    g.save();g.translate(x,y);g.rotate(tilt||0);g.scale(sx,blink);
    const hx=r*.16,hr=r*.4;                                          // the hole sits toward the side facing us
    g.fillStyle='rgba(26,10,32,.35)';g.beginPath();g.arc(-r*.06,r*.08,r*1.04,0,Math.PI*2);g.fill();
    const k=g.createRadialGradient(-r*.4,-r*.45,r*.05,0,0,r);k.addColorStop(0,col[0]);k.addColorStop(.5,col[1]);k.addColorStop(1,col[2]);
    g.fillStyle=k;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    const ir=g.createLinearGradient(-r,-r,r,r);ir.addColorStop(0,'rgba(255,140,220,.22)');ir.addColorStop(.5,'rgba(255,255,255,0)');ir.addColorStop(1,'rgba(120,200,255,.2)');
    g.fillStyle=ir;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    // hole: pitch black in the middle, the bead's inner wall catching a little light on the far side
    g.save();g.beginPath();g.arc(hx,0,hr,0,Math.PI*2);g.clip();
    g.fillStyle='#000';g.fillRect(hx-hr,-hr,hr*2,hr*2);
    const w=g.createLinearGradient(hx-hr,0,hx+hr*.2,0);w.addColorStop(0,col[2]);w.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=w;g.beginPath();g.arc(hx-hr*.35,0,hr,0,Math.PI*2);g.fill();
    g.restore();
    g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=Math.max(.6,r*.06);g.beginPath();g.arc(hx,0,hr,0,Math.PI*2);g.stroke();
    // shine: a bright curved streak top-left, a softer one bottom-right, a sparkle
    g.lineCap='round';
    g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=r*.16;g.beginPath();g.arc(0,0,r*.7,Math.PI*1.08,Math.PI*1.45);g.stroke();
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=r*.12;g.beginPath();g.arc(0,0,r*.72,Math.PI*.1,Math.PI*.38);g.stroke();
    g.fillStyle='#fff';g.beginPath();g.arc(-r*.22,-r*.78,Math.max(.6,r*.08),0,Math.PI*2);g.fill();
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
  // popsicle-stick foot: a 1-inch piece of stick lying FLAT under the ball (the pom-pom sits on top of two of them).
  // side view = a thin plank seen along its length (cut end at the back, rounded end at the front);
  // front view = the stick's rounded end facing you.
  function plank(g,x,y,len,th,col,tilt,dark){
    g.save();g.translate(x,y);g.rotate(tilt||0);
    const k=g.createLinearGradient(0,-th/2,0,th/2);k.addColorStop(0,dark?col[1]:col[0]);k.addColorStop(.45,dark?col[2]:col[1]);k.addColorStop(1,col[2]);
    g.fillStyle=k;g.beginPath();
    g.moveTo(-len/2,-th/2);g.lineTo(len/2-th*.6,-th/2);g.quadraticCurveTo(len/2,-th/2,len/2,0);g.quadraticCurveTo(len/2,th/2,len/2-th*.6,th/2);g.lineTo(-len/2,th/2);g.closePath();g.fill();
    g.fillStyle='rgba(255,255,255,'+(dark?.15:.45)+')';g.fillRect(-len/2+th*.3,-th/2,len-th*1.2,Math.max(.6,th*.18));
    g.restore();
  }
  function stickEnd(g,x,y,w,th,col){
    const k=g.createLinearGradient(0,y-th/2,0,y+th/2);k.addColorStop(0,col[0]);k.addColorStop(.5,col[1]);k.addColorStop(1,col[2]);
    g.fillStyle=k;g.beginPath();if(g.roundRect)g.roundRect(x-w/2,y-th/2,w,th,th/2);else g.rect(x-w/2,y-th/2,w,th);g.fill();
    g.fillStyle='rgba(255,255,255,.45)';g.fillRect(x-w*.35,y-th/2,w*.7,Math.max(.6,th*.2));
  }
  function drawFront(g,B,u,o){
    const t=o.t||0,sway=Math.sin(t*2.2)*u*2,pulse=o.pulse||0;
    // antennae: up from the top of the pom, arcing outward, beads hanging at the ends
    stem(g,[-u*8,-u*24, -u*10,-u*48, -u*30,-u*54, -u*34+sway,-u*36],u,B);
    stem(g,[u*8,-u*24, u*10,-u*48, u*30,-u*54, u*34+sway,-u*36],u,B);
    const ball=furBall(B,Math.max(16,Math.round(u*50)));g.drawImage(ball,-u*50,-u*50+u*2,u*100,u*100);
    // the pom sits on two flat stick pieces; from the front you see their rounded ends peeking out under it
    g.fillStyle='rgba(26,10,32,.35)';g.beginPath();g.ellipse(0,u*36,u*26,u*3.5,0,0,Math.PI*2);g.fill();
    stickEnd(g,-u*14.5,u*34,u*18.9,u*7,B.foot);stickEnd(g,u*14.5,u*34,u*18.9,u*7,B.foot);
    const blink=((t%3.7)<.12)?.15:1;
    beadFront(g,-u*11,-u*2,u*8,u*7,B.eye,blink);beadFront(g,u*11,-u*2,u*8,u*7,B.eye,blink);
    beadFront(g,0,u*14,u*7,u*5.2,B.mouth,1);
    tip(g,-u*34+sway,-u*36,u,B,pulse);tip(g,u*34+sway,-u*36,u,B,pulse);
  }
  function drawSide(g,B,u,o){
    const t=o.t||0,ph=(o.run||0)*Math.PI*2,air=!!o.air,sp=o.speed==null?1:o.speed,pulse=o.pulse||0;
    const bob=air?0:-Math.abs(Math.sin(ph))*u*2*sp,lean=air?.05:.12*sp;
    // feet: two flat stick pieces under the pom that shuffle along, two steps per cycle.
    // The stepping one lifts a little with its front end tipped up; in the air they hang flat, tipped slightly down.
    const step=p=>air?{x:0,y:u*2,a:.12}:{x:Math.sin(p)*u*6*sp,y:-Math.max(0,Math.cos(p))*u*5*sp,a:-Math.max(0,Math.cos(p))*.18*sp};
    const fA=step(ph+Math.PI),fB=step(ph);
    g.fillStyle='rgba(26,10,32,.3)';g.beginPath();g.ellipse(0,u*38.5-bob,u*24,u*3,0,0,Math.PI*2);g.fill();
    g.save();g.translate(0,bob);
    // far antenna, swept back a little more and drawn behind the body
    const sw=u*(10+8*sp)+Math.sin(ph*2)*u*2*sp,fl=Math.sin(t*3)*u;
    stem(g,[-u*6,-u*24, -u*4,-u*48, -u*22-sw*.6,-u*56, -u*30-sw,-u*40+fl],u,B);tip(g,-u*30-sw,-u*40+fl,u,B,pulse*.6);
    g.save();g.rotate(lean);
    const ball=furBall(B,Math.max(16,Math.round(u*50)));g.drawImage(ball,-u*50,-u*50+u*2,u*100,u*100);
    g.restore();plank(g,u*1+fA.x,u*33.5+fA.y,u*34,u*7,B.foot,fA.a,true);plank(g,u*2+fB.x,u*35+fB.y,u*34,u*7,B.foot,fB.a,false);g.save();g.rotate(lean);   // near stick, in front of the pom's bottom
    // near eye: a glossy pony bead turned toward us, hole facing out
    const blink=((t%3.7)<.12)?.15:1;
    ponyBead(g,u*17,-u*3,u*7.5,B.eye,.72,blink,0);
    // a sliver of the far eye peeking past the front of the pom
    g.fillStyle=B.eye[2];g.beginPath();g.ellipse(u*29,-u*3,u*1.6,u*5*blink,0,0,Math.PI*2);g.fill();
    // mouth: a pony bead at the front of the face, turned sideways so its black hole faces forward
    ponyBead(g,u*29,u*13,u*6.2,B.mouth,.55,1,-.1);
    g.restore();
    // near antenna: base on top, curving up and streaming back as she runs
    stem(g,[u*2,-u*24, u*4,-u*50, -u*14-sw*.4,-u*58, -u*22-sw*.8,-u*42-fl],u,B);tip(g,-u*22-sw*.8,-u*42-fl,u,B,pulse);
    g.restore();
  }

  // ── turnaround: any angle around her (0 = facing you, 90 = facing right, 180 = back). Features sit on the pom's
  // surface in 3D and are projected, so 3/4 and back views line up with the front and side.
  function drawTurn(g,B,u,o){
    const th=(o.angle||0)*Math.PI/180,c=Math.cos(th),sn=Math.sin(th),t=o.t||0,pulse=o.pulse||0,R=u*31,CY=u*2;
    const rot=(x,y,z)=>({x:x*c+z*sn,y,z:-x*sn+z*c});
    const later=[],before=[];
    // ground shadow
    g.fillStyle='rgba(26,10,32,.33)';g.beginPath();g.ellipse(0,u*37.5,u*30,u*3.6,0,0,Math.PI*2);g.fill();
    // feet: two flat 1-inch sticks under the pom, running front to back (rounded end forward, cut end back)
    [-1,1].forEach(sd=>{const m=rot(sd*u*14.5,u*34,u*3),w=u*18.9*Math.abs(c)+u*34*Math.abs(sn);
      const f=()=>{const k=g.createLinearGradient(0,m.y-u*3.5,0,m.y+u*3.5);const far=Math.abs(sn)>.2&&m.z<0;k.addColorStop(0,far?B.foot[1]:B.foot[0]);k.addColorStop(.5,far?B.foot[2]:B.foot[1]);k.addColorStop(1,B.foot[2]);g.fillStyle=k;
        g.beginPath();if(g.roundRect)g.roundRect(m.x-w/2,m.y-u*3.5,w,u*7,u*3);else g.rect(m.x-w/2,m.y-u*3.5,w,u*7);g.fill();
        g.fillStyle='rgba(255,255,255,.45)';g.fillRect(m.x-w*.4,m.y-u*3.5,w*.8,u*1.3);};
      later.push({z:m.z-R*2,f});   /* under the ball: drawn over its bottom fluff, far stick first */});
    // antennae: pipe cleaners rising from the top, arcing out to the sides and leaning slightly back
    [-1,1].forEach(sd=>{const P=[[8,-24,0],[10,-48,-6],[30,-54,-12],[34,-36,-16]].map(([x,y,z])=>rot(sd*x*u,y*u,z*u)),zz=P[3].z;
      const f=()=>{stem(g,[P[0].x,P[0].y,P[1].x,P[1].y,P[2].x,P[2].y,P[3].x,P[3].y],u,B);tip(g,P[3].x,P[3].y,u,B,pulse);};
      (zz>-u*4?later:before).push({z:zz,f});});
    // bead eyes and mouth on the pom's surface
    const bead=(lx,ly,r,col,sxr)=>{const lat=Math.asin(ly/R),lon=Math.asin(lx/(R*Math.cos(lat)));
      const nx=Math.sin(lon)*Math.cos(lat),nz=Math.cos(lon)*Math.cos(lat),n=rot(nx,0,nz),out=R*.97+u*2.5,p=rot(nx*out,ly,nz*out);
      if(n.z<-.12)return;const sx=Math.max(.38,n.z)*(n.x<0?-1:1)*(sxr||1),fade=Math.min(1,(n.z+.12)/.2);
      later.push({z:p.z+R,f:()=>{g.save();g.globalAlpha=fade;ponyBead(g,p.x,CY+ly,r,col,sx,1,0);g.restore();}});};
    bead(-u*11,-u*4,u*7.5,B.eye);bead(u*11,-u*4,u*7.5,B.eye);bead(0,u*12,u*6.2,B.mouth,.85);
    before.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
    const ball=furBall(B,Math.max(16,Math.round(u*50)));g.drawImage(ball,-u*50,-u*50+u*2,u*100,u*100);
    later.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
  }
  window.drawBuddy=function(g,x,y,size,o){
    o=o||{};const B=BUDDIES[o.id||current]||BUDDIES.chloe,u=size/100;
    g.save();g.translate(x,y+u*11);   // sticks rest on the ground at the bottom of the box
    if(o.view==='turn')drawTurn(g,B,u,o);else if(o.view==='side'){if((o.face||1)<0)g.scale(-1,1);drawSide(g,B,u,o);}else drawFront(g,B,u,o);
    g.restore();
  };
  window.buddyInfo=function(id){return BUDDIES[id||current]||BUDDIES.chloe;};
})();
