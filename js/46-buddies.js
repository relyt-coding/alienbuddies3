// ── Alien buddy characters drawn in the minigame art style ──
// Bright core → dark edge gradients with a white hotspot, ink-dark details, glowing accents, no emoji.
// One 3D model for every view, so features line up at any angle.
// drawBuddy(ctx, x, y, size, opts) draws the buddy centred at (x,y), about `size` px tall (same box as the old 👽 emoji).
//   opts.view : 'front' | 'side'      opts.face : 1 (right) | -1 (left)  (side view)
//   opts.run  : run phase in cycles (one cycle = two steps)               opts.air : true while jumping
//   opts.t    : seconds, for idle sway / blinking (about every 15 s)
//   opts.antenna: antenna length (default 1.35; use 1 for small previews like the bunker list)                         opts.speed: 0..1, how far the antennae sweep back
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
  // feet: flat duck-like sticks the pom sits on. Seen from above each one is narrow at the heel and flares out to a
  // wide, ROUNDED front (no webbed toes); they're thin, toe out a little, and keep the 1-inch stick length.
  // th = which way the foot points (0 = toward you, 90deg = right); the camera looks down slightly (K) so the top shows.
  const FK=.18;
  function duckFoot(g,cx,cy,th,u,B,o){
    o=o||{};const hw=u*5.5,fw=u*10.5,zh=-u*13,zf=u*13,zt=u*19.5,TH=u*4.2,c=Math.cos(th),sn=Math.sin(th),P=[];
    for(let i=0;i<=6;i++){const f=Math.PI+i/6*Math.PI;P.push([hw*Math.cos(f),zh+hw*Math.sin(f)*.8]);}        // round heel
    P.push([fw*.62,u*1]);
    for(let i=0;i<=10;i++){const f=i/10*Math.PI;P.push([fw*Math.cos(f),zf+(zt-zf)*Math.sin(f)]);}              // wide rounded front
    P.push([-fw*.62,u*1]);
    const pr=P.map(([x,z])=>{const X=x*c+z*sn,Z=-x*sn+z*c;let px=X,py=Z*FK;
      if(o.pitch){const cp=Math.cos(o.pitch),sp=Math.sin(o.pitch),q=px;px=q*cp-py*sp;py=q*sp+py*cp;}return[cx+px,cy+py];});
    const path=dy=>{g.beginPath();pr.forEach(([x,y],i)=>i?g.lineTo(x,y+dy):g.moveTo(x,y+dy));g.closePath();};
    // the stick's edge (thickness), then the lit top face with a soft rim highlight
    g.fillStyle=B.foot[2];for(let k=7;k>=1;k--){path(TH*k/7);g.fill();}
    const top=g.createLinearGradient(cx,cy-u*6,cx,cy+u*6);top.addColorStop(0,o.dark?B.foot[1]:B.foot[0]);top.addColorStop(1,o.dark?B.foot[2]:B.foot[1]);
    g.fillStyle=top;path(0);g.fill();
    g.strokeStyle='rgba(255,255,255,'+(o.dark?.12:.35)+')';g.lineWidth=Math.max(.6,u*.9);path(0);g.stroke();
  }
  // barrel pony bead glued to the pom: a short glossy cylinder whose hole runs along the surface normal n (3D, view space).
  // p = screen point where the bead meets the fluff; it sticks out along n by `len`.
  function barrelBead(g,p,n,r,len,hole,col){
    const d=Math.hypot(n.x,n.y),ax=d>1e-4?n.x/d:0,ay=d>1e-4?n.y/d:0,mx=-ay,my=ax;   // screen axis + the end ellipse's long axis
    const sq=Math.max(.06,Math.abs(n.z)),ang=Math.atan2(my,mx);
    const c0={x:p.x,y:p.y},c1={x:p.x+n.x*len,y:p.y+n.y*len};                       // back and front end centres
    // barrel wall: the two end ellipses joined, shaded across its width (light from the top-left)
    const wall=g.createLinearGradient(c1.x+mx*r,c1.y+my*r,c1.x-mx*r,c1.y-my*r);
    const lit=(mx*-1+my*-1)>0;wall.addColorStop(0,lit?col[0]:col[2]);wall.addColorStop(.5,col[1]);wall.addColorStop(1,lit?col[2]:col[0]);
    g.fillStyle='rgba(26,10,32,.35)';g.beginPath();g.ellipse(c0.x+u0*.6,c0.y+u0,r*1.05,r*1.05*sq,ang,0,Math.PI*2);g.fill();
    g.fillStyle=wall;g.beginPath();g.ellipse(c0.x,c0.y,r,r*sq,ang,0,Math.PI*2);g.fill();
    g.beginPath();g.moveTo(c0.x+mx*r,c0.y+my*r);g.lineTo(c1.x+mx*r,c1.y+my*r);g.lineTo(c1.x-mx*r,c1.y-my*r);g.lineTo(c0.x-mx*r,c0.y-my*r);g.closePath();g.fill();
    if(d>.15){g.strokeStyle='rgba(255,255,255,.55)';g.lineCap='round';g.lineWidth=r*.18;const o=lit?.55:-.55;   // shine running along the barrel
      g.beginPath();g.moveTo(c0.x+mx*r*o+ax*r*.15,c0.y+my*r*o+ay*r*.15);g.lineTo(c1.x+mx*r*o-ax*r*.1,c1.y+my*r*o-ay*r*.1);g.stroke();}
    if(n.z<-.02)return;                                                             // end face turned away
    // front end: glossy ring, black hole with a sliver of inner wall, iridescent sheen, highlight + sparkle
    g.save();g.translate(c1.x,c1.y);g.rotate(ang);g.scale(1,sq);
    const k=g.createRadialGradient(-r*.35,-r*.4,r*.05,0,0,r);k.addColorStop(0,col[0]);k.addColorStop(.55,col[1]);k.addColorStop(1,col[2]);
    g.fillStyle=k;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    const ir=g.createLinearGradient(-r,-r,r,r);ir.addColorStop(0,'rgba(255,140,220,.22)');ir.addColorStop(.5,'rgba(255,255,255,0)');ir.addColorStop(1,'rgba(120,200,255,.2)');g.fillStyle=ir;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    g.fillStyle='#000';g.beginPath();g.arc(0,0,hole,0,Math.PI*2);g.fill();
    g.save();g.beginPath();g.arc(0,0,hole,0,Math.PI*2);g.clip();g.fillStyle=col[2];g.globalAlpha=.8*(1-sq);g.beginPath();g.arc(-hole*1.1,0,hole,0,Math.PI*2);g.fill();g.restore();
    g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=r*.15;g.lineCap='round';g.beginPath();g.arc(0,0,(r+hole)/2,Math.PI*1.08,Math.PI*1.45);g.stroke();
    g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=r*.1;g.beginPath();g.arc(0,0,(r+hole)/2,Math.PI*.1,Math.PI*.38);g.stroke();
    g.restore();
  }
  let u0=1;
  // feet are drawn twice: in full before the pom, then again clipped to just the parts physically in front of it.
  // A point on a foot's top face at screen (px,py) has depth (py-baseY)/FK; it shows if that's nearer than the pom's surface there.
  function frontClip(g,u,baseY){
    const R=u*33,CY=u*2,N=24,BIG=u*400,f=[];
    for(let i=0;i<=N;i++){const px=-R+2*R*i/N;let lo=CY-R,hi=CY+R;
      for(let it=0;it<16;it++){const py=(lo+hi)/2,dy=py-CY,q=R*R-px*px-dy*dy,ok=q<=0||(py-baseY)/FK>Math.sqrt(q);if(ok)hi=py;else lo=py;}f.push([px,hi]);}
    g.beginPath();g.moveTo(-BIG,-BIG);g.lineTo(-R,-BIG);f.forEach(([x,y])=>g.lineTo(x,y));g.lineTo(R,-BIG);g.lineTo(BIG,-BIG);g.lineTo(BIG,BIG);g.lineTo(-BIG,BIG);g.closePath();g.clip();
  }
  function feet(g,u,B,th,step,pass){
    const c=Math.cos(th),sn=Math.sin(th),L=[];
    [-1,1].forEach(sd=>{const mx=sd*u*13,mz=u*2,X=mx*c+mz*sn,Z=-mx*sn+mz*c,st=step?step(sd):{x:0,y:0,a:0};
      L.push({z:Z,f:()=>{if(pass===2){g.save();frontClip(g,u,u*35+st.y);}
        duckFoot(g,X+st.x,u*35+Z*FK+st.y,th+sd*.14,u,B,{pitch:st.a,dark:Math.abs(sn)>.2&&Z<0});
        if(pass===2)g.restore();}});});
    L.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
  }
  // the whole buddy at body angle th (0 = facing you, +90deg = facing right). Running adds stepping feet,
  // a forward lean and antennae streaming back; everything else is the same model as the turnaround.
  function drawModel(g,B,u,o){
    u0=u;const th=o.angle||0,c=Math.cos(th),sn=Math.sin(th),t=o.t||0,pulse=o.pulse||0,R=u*31,CY=u*2;
    const run=o.run!=null&&o.speed!==0&&Math.abs(sn)>.5,air=!!o.air,sp=o.speed==null?1:o.speed,ph=(o.run||0)*Math.PI*2,dir=sn>=0?1:-1;
    const rot=(x,y,z)=>({x:x*c+z*sn,y,z:-x*sn+z*c});
    const bob=run&&!air?-Math.abs(Math.sin(ph))*u*2*sp:0,lean=run?(air?.05:.12*sp)*dir:0;
    // stepping: the moving foot slides forward, lifts and tips its rounded front up; in the air both hang tipped down
    const step=run||air?(sd=>{const p=ph+(sd>0?Math.PI:0);if(air)return{x:0,y:u*2,a:.12*dir};
      const lift=Math.max(0,Math.cos(p));return{x:Math.sin(p)*u*6*sp*dir,y:-lift*u*5*sp,a:-lift*.18*sp*dir};}):null;
    const sweep=run?u*(12+8*sp)+Math.sin(ph*2)*u*2*sp:0,fl=Math.sin(t*3)*u*(run?1:.5);
    g.save();g.translate(0,bob);
    g.fillStyle='rgba(26,10,32,.33)';g.beginPath();g.ellipse(0,u*41-bob,u*30,u*3.6,0,0,Math.PI*2);g.fill();
    const before=[],after=[];
    // antennae: pipe cleaners from the top, arcing out and leaning back; when running they stream further back
    const AL=o.antenna==null?1.35:o.antenna;
    [-1,1].forEach(sd=>{const P=[[8,-24,0,0],[10,-48,-6,.3],[30,-54,-12,.7],[34,-36,-16,1]].map(([x,y,z,w])=>rot(sd*(8+(x-8)*AL)*u,(-24+(y+24)*AL)*u+(w===1?fl*sd:0),z*AL*u-sweep*w));
      P.forEach(q=>q.y+=q.z*FK);const f=()=>{stem(g,[P[0].x,P[0].y,P[1].x,P[1].y,P[2].x,P[2].y,P[3].x,P[3].y],u,B);tip(g,P[3].x,P[3].y,u,B,pulse);};
      (P[3].z>-u*4?after:before).push({z:P[3].z,f});});
    // barrel pony beads: eyes level and mirror-symmetric, mouth centred below; all stick out the same amount
    const bead=(lx,ly,r,len,hole,col,blink)=>{const lat=Math.asin(ly/R),lon=Math.asin(lx/(R*Math.cos(lat)));
      const nx=Math.sin(lon)*Math.cos(lat),ny=Math.sin(lat),nz=Math.cos(lon)*Math.cos(lat),n=rot(nx,ny,nz),p=rot(nx*R*.93,ny*R*.93,nz*R*.93);
      if(n.z<-.2)return;after.push({z:p.z+R,f:()=>{const by=CY+p.y;if(blink&&blink<1){g.save();g.translate(0,by);g.scale(1,blink);g.translate(0,-by);}barrelBead(g,{x:p.x,y:by},n,r,len,hole,col);if(blink&&blink<1)g.restore();}});};
    const bk=(t+3)%15,blink=bk<.16?Math.max(.08,Math.abs(bk-.08)/.08):1;
    bead(-u*11,-u*4,u*7,u*6,u*2.8,B.eye,blink);bead(u*11,-u*4,u*7,u*6,u*2.8,B.eye,blink);bead(0,u*12,u*5.6,u*5,u*2.2,B.mouth);
    before.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
    feet(g,u,B,th,step,1);
    g.save();g.translate(0,CY);g.rotate(lean);g.translate(0,-CY);
    const ball=furBall(B,Math.max(16,Math.round(u*50)));g.drawImage(ball,-u*50,-u*50+u*2,u*100,u*100);
    g.restore();
    feet(g,u,B,th,step,2);
    g.save();g.translate(0,CY);g.rotate(lean);g.translate(0,-CY);
    after.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
    g.restore();g.restore();
  }
  window.drawBuddy=function(g,x,y,size,o){
    o=o||{};const B=BUDDIES[o.id||current]||BUDDIES.chloe,u=size/100;
    const angle=o.view==='turn'?(o.angle||0)*Math.PI/180:o.view==='side'?((o.face||1)<0?-Math.PI/2:Math.PI/2):0;
    g.save();g.translate(x,y+u*5.5);   // feet rest on the ground at the bottom of the box
    drawModel(g,B,u,Object.assign({},o,{angle}));
    g.restore();
  };
  window.buddyInfo=function(id){return BUDDIES[id||current]||BUDDIES.chloe;};
})();
