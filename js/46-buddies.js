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
      glow:'#ff8a3d',trail:'255,138,61',ant:1.35,eyeSize:1,key:'chloe',accent:'#c66bb4',
      spec:{body:'#8a3a74',eye:'#ff2b2b',mouth:'#ff8a3d',stem:'#ffe14d',tip:'#ff8a3d',foot:'#4dc3ff'}}
  };
  let current='chloe';
  // ── colour helpers ──
  const h2r=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255];};
  const r2h=(r,g,b)=>'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  function toHsl(hex){let[r,g,b]=h2r(hex).map(v=>v/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;
    if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return[h,s,l];}
  function fromHsl(h,s,l){l=Math.max(.03,Math.min(.97,l));if(!s)return r2h(l*255,l*255,l*255);const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
    const f=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};return r2h(f(h+1/3)*255,f(h)*255,f(h-1/3)*255);}
  const shade=(hex,dl,ds)=>{const[h,s,l]=toHsl(hex);return fromHsl(h,Math.max(0,Math.min(1,s+(ds||0))),l+dl);};
  const tri=(hex,up,down)=>[shade(hex,up),hex,shade(hex,-down)];
  // ── what each part can be (craft-box colours) ──
  const PARTS={
    body:[['#8a3a74','Grape'],['#d6336c','Raspberry'],['#ff5fa2','Bubblegum'],['#e53935','Cherry'],['#ff7043','Coral'],['#f57c00','Tangerine'],['#e0a020','Mustard'],['#f4d03f','Lemon'],['#9ccc65','Lime'],['#43a047','Grass'],['#2e7d5b','Forest'],['#26a69a','Teal'],['#4dd0e1','Aqua'],['#80cbc4','Seafoam'],['#42a5f5','Sky'],['#1e5bc6','Royal'],['#283593','Navy'],['#7e57c2','Violet'],['#b39ddb','Lavender'],['#f8bbd0','Blush'],['#ffccbc','Peach'],['#8d6e63','Cocoa'],['#e8e4f0','Cloud'],['#9e9eae','Silver'],['#2b2b36','Midnight'],['#5d1049','Plum']],
    bead:[['#ff2b2b','Red'],['#ff8a3d','Orange'],['#ffd23f','Yellow'],['#3ddc84','Green'],['#19c3b0','Teal'],['#5ad1ff','Ice'],['#2f80ff','Blue'],['#9b5cff','Purple'],['#ff5fb8','Pink'],['#f2f2f7','Pearl'],['#c0c8d8','Silver'],['#c9a227','Gold'],['#7a4b2a','Brown'],['#1b1b22','Black']],
    stem:[['#ffe14d','Yellow'],['#f5f5fa','White'],['#ff7ac0','Pink'],['#4fb3ff','Blue'],['#40e0d0','Turquoise'],['#5fe07a','Green'],['#ff9a3d','Orange'],['#a879ff','Purple'],['#ff4d4d','Red'],['#e8c25a','Gold'],['#c7ccd8','Silver'],['#2a2a33','Black']],
    tip:[['#ff8a3d','Ember'],['#ff4fa8','Neon pink'],['#3fe6ff','Cyan'],['#9dff3f','Lime'],['#ffe14d','Sunshine'],['#b06bff','Ultraviolet'],['#ff3b3b','Red'],['#3fffb0','Mint'],['#5b8cff','Blue'],['#ffffff','Starlight']],
    foot:[['#4dc3ff','Blue'],['#ff5a5a','Red'],['#ffd23f','Yellow'],['#5fd16a','Green'],['#ff9a3d','Orange'],['#ff7ac0','Pink'],['#9b6bff','Purple'],['#26c6da','Teal'],['#f2f2f7','White'],['#2a2a33','Black'],['#d9b382','Natural wood'],['#7a5230','Dark wood']]
  };
  // build the full set of shades a buddy is drawn with from its 6 picked colours (+ antenna length / eye size)
  function makeLook(L){
    const[,,bl]=toHsl(L.body),k=Math.min(1,(1-bl)/.45);           // pale yarns get gentler highlights
    const fur=[shade(L.body,.34*k+.02),shade(L.body,.12*k+.02),L.body,shade(L.body,-.17)],tc=h2r(L.tip);
    const B={fur,furLight:shade(L.body,.42*k+.04),furDark:shade(L.body,-.24),eye:tri(L.eye,.2,.2),mouth:tri(L.mouth,.2,.2),
      foot:tri(L.foot,.2,.2),stem:tri(L.stem,.18,.25),tip:tri(L.tip,.22,.18),glow:L.tip,trail:tc.join(','),
      ant:L.ant||1.35,eyeSize:L.eyeSize||1,spec:L};
    B.key=[L.body,L.eye,L.mouth,L.stem,L.tip,L.foot].join('');
    // a bright, readable colour for names/borders: the body if it's lively, otherwise the glowing tips
    const[hh,ss,ll]=toHsl(L.body);B.accent=ss>.35&&ll>.25&&ll<.85?fromHsl(hh,Math.min(1,ss+.1),Math.max(.55,ll)):L.tip;
    return B;
  }
  // ── the 100 default buddies: #1 is Chloe; the rest are seeded combos with readable contrast ──
  const dist=(a,b)=>{const A=h2r(a),C=h2r(b),rm=(A[0]+C[0])/2;return Math.sqrt((2+rm/256)*(A[0]-C[0])**2+4*(A[1]-C[1])**2+(2+(255-rm)/256)*(A[2]-C[2])**2);};
  const VARIANTS=(()=>{const out=[{body:'#8a3a74',eye:'#ff2b2b',mouth:'#ff8a3d',stem:'#ffe14d',tip:'#ff8a3d',foot:'#4dc3ff'}],seen=new Set([out[0].body+out[0].eye+out[0].mouth]);
    const R=rnd(4242),pick=a=>a[Math.floor(R()*a.length)][0],bodies=PARTS.body.map(b=>b[0]);
    // every body colour gets used about 4 times, spread out through the list
    let order=[];while(order.length<120){const sh=bodies.slice();for(let i=sh.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[sh[i],sh[j]]=[sh[j],sh[i]];}order=order.concat(sh);}
    let oi=0;
    while(out.length<100){const body=order[oi++%order.length];let v,tries=0;
      do{v={body,eye:pick(PARTS.bead),mouth:pick(PARTS.bead),stem:pick(PARTS.stem),tip:pick(PARTS.tip),foot:pick(PARTS.foot)};tries++;}
      while(tries<200&&(dist(v.eye,body)<260||dist(v.mouth,body)<220||v.mouth===v.eye||dist(v.stem,body)<200||dist(v.foot,body)<180||dist(v.tip,v.stem)<120||seen.has(v.body+v.eye+v.mouth)));
      seen.add(v.body+v.eye+v.mouth);out.push(v);}
    return out;})();
  const lookCache={};
  function lookFor(spec){const k=JSON.stringify(spec);return lookCache[k]||(lookCache[k]=makeLook(spec));}
  window.BUDDY_PARTS=PARTS;
  window.buddyVariant=i=>Object.assign({},VARIANTS[((i%100)+100)%100]);
  window.buddyLookSpec=function(i){const ad=typeof alienData!=='undefined'&&alienData[i];return Object.assign({},VARIANTS[((i%100)+100)%100],ad&&ad.look||{});};
  window.buddyLook=function(i){const spec=buddyLookSpec(i);if(i%100===0&&!(typeof alienData!=='undefined'&&alienData[i]&&alienData[i].look))return BUDDIES.chloe;return lookFor(spec);};
  window.makeBuddyLook=lookFor;
  const cache=new Map(),CACHE_MAX=140;
  function rnd(seed){let s=seed;return()=>{s=(s*9301+49297)%233280;return s/233280;};}
  // fuzzy pom-pom ball: layered tufts around the rim, soft shading, a white shine top-left
  function furBall(B,px){
    const key=(B.key||current)+'_'+px;if(cache.has(key))return cache.get(key);
    const c=document.createElement('canvas'),S=px*2;c.width=c.height=S;const g=c.getContext('2d'),R=px*.62,cx=px,cy=px,r=rnd(7);
    const halo=g.createRadialGradient(cx,cy,R*.8,cx,cy,R*1.5);const hc=h2r(B.fur[1]).join(',');halo.addColorStop(0,'rgba('+hc+',.35)');halo.addColorStop(1,'rgba('+hc+',0)');g.fillStyle=halo;g.fillRect(0,0,S,S);
    // outer tufts (dark), then the main ball, then lighter inner tufts
    for(let i=0;i<46;i++){const a=i/46*Math.PI*2+r()*.1,d=R*(.9+r()*.1),tr=R*(.15+r()*.08);g.fillStyle=B.fur[3];g.beginPath();g.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,tr,0,Math.PI*2);g.fill();}
    const bg=g.createRadialGradient(cx-R*.35,cy-R*.4,R*.08,cx,cy,R*1.05);bg.addColorStop(0,B.fur[0]);bg.addColorStop(.35,B.fur[1]);bg.addColorStop(.8,B.fur[2]);bg.addColorStop(1,B.fur[3]);
    g.fillStyle=bg;g.beginPath();g.arc(cx,cy,R*.98,0,Math.PI*2);g.fill();
    for(let i=0;i<40;i++){const a=i/40*Math.PI*2+r()*.15,d=R*(.86+r()*.08),tr=R*(.11+r()*.06),lit=Math.cos(a+2.3);   // tufts facing the light are lighter
      g.fillStyle=lit>.35?B.fur[1]:lit>-.4?B.fur[2]:B.fur[3];g.beginPath();g.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,tr,0,Math.PI*2);g.fill();}
    g.fillStyle=bg;g.beginPath();g.arc(cx,cy,R*.84,0,Math.PI*2);g.fill();
    const sh=g.createRadialGradient(cx-R*.38,cy-R*.42,0,cx-R*.38,cy-R*.42,R*.45);sh.addColorStop(0,'rgba(255,255,255,.45)');sh.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sh;g.beginPath();g.arc(cx-R*.38,cy-R*.42,R*.45,0,Math.PI*2);g.fill();
    cache.set(key,c);if(cache.size>CACHE_MAX)cache.delete(cache.keys().next().value);return c;
  }
  const FIB=(()=>{const r=rnd(11),L=[];for(let i=0;i<260;i++){const zz=r()*2-1,a=r()*Math.PI*2,q=Math.sqrt(1-zz*zz),v=[q*Math.cos(a),zz,q*Math.sin(a)];
      // random tangent direction at v
      let t=[r()-.5,r()-.5,r()-.5],dt=t[0]*v[0]+t[1]*v[1]+t[2]*v[2];t=[t[0]-dt*v[0],t[1]-dt*v[1],t[2]-dt*v[2]];const tl=Math.hypot(...t)||1;
      L.push({v,t:t.map(c=>c/tl),l:.035+r()*.05,k:r()});}return L;})();
  const HAIR=(()=>{const r=rnd(29),L=[];for(let i=0;i<300;i++){const zz=r()*2-1,a=r()*Math.PI*2,q=Math.sqrt(1-zz*zz),v=[q*Math.cos(a),zz,q*Math.sin(a)];
      let t=[r()-.5,r()-.5,r()-.5],dt=t[0]*v[0]+t[1]*v[1]+t[2]*v[2];t=[t[0]-dt*v[0],t[1]-dt*v[1],t[2]-dt*v[2]];const tl=Math.hypot(...t)||1,bend=.35+r()*.5;
      const d=[v[0]+t[0]/tl*bend,v[1]+t[1]/tl*bend,v[2]+t[2]/tl*bend],dl=Math.hypot(...d);
      L.push({v,d:d.map(c=>c/dl),l:.08+r()*.13,k:r(),w:r()});}return L;})();
  function strayHairs(g,B,R,CY,rot,back){
    const bucket=[[],[],[],[]],rr=R*.95;
    HAIR.forEach((h,hi)=>{if(LITE&&hi%3)return;const p=rot(h.v[0],h.v[1],h.v[2]);if(back?(p.z>=0||p.z<-.35):(p.z<0||p.z>.42))return;
      const dd=rot(h.d[0],h.d[1],h.d[2]),x0=p.x*rr,y0=CY+p.y*rr,x1=x0+dd.x*h.l*R,y1=y0+dd.y*h.l*R;
      const lit=p.x*LIGHT[0]+p.y*LIGHT[1]+p.z*LIGHT[2]+(h.k-.5)*.3,b=lit>.45?0:lit>.05?1:lit>-.3?2:3;
      bucket[b].push([x0,y0,(x0+x1)/2+dd.x*h.l*R*.1*(h.w-.5),(y0+y1)/2-h.l*R*.12*h.w,x1,y1]);});
    const cols=[B.furLight,B.fur[1],B.fur[3],B.furDark];g.lineCap='round';g.lineWidth=Math.max(.6,R*.018);g.globalAlpha=.75;
    bucket.forEach((L,i)=>{if(!L.length)return;g.strokeStyle=cols[i];g.beginPath();L.forEach(q=>{g.moveTo(q[0],q[1]);g.quadraticCurveTo(q[2],q[3],q[4],q[5]);});g.stroke();});
    g.globalAlpha=1;
  }
  const LIGHT=(()=>{const l=[-.5,-.6,.62],n=Math.hypot(...l);return l.map(c=>c/n);})();
  function furFibres(g,B,R,CY,rot){
    const bucket=[[],[],[],[]];
    FIB.forEach(f=>{const p=rot(f.v[0],f.v[1],f.v[2]);if(p.z<.08)return;const tt=rot(f.t[0],f.t[1],f.t[2]);
      const lit=p.x*LIGHT[0]+p.y*LIGHT[1]+p.z*LIGHT[2]+(f.k-.5)*.3,b=lit>.55?0:lit>.15?1:lit>-.2?2:3,rr=R*.93;
      bucket[b].push([p.x*rr,CY+p.y*rr,(p.x+tt.x*f.l)*rr,CY+(p.y+tt.y*f.l)*rr]);});
    const cols=[B.furLight,B.fur[1],B.fur[3],B.furDark];g.lineCap='round';g.lineWidth=Math.max(.6,R*.016);g.globalAlpha=.42;
    bucket.forEach((L,i)=>{if(!L.length)return;g.strokeStyle=cols[i];g.beginPath();L.forEach(q=>{g.moveTo(q[0],q[1]);g.lineTo(q[2],q[3]);});g.stroke();});
    g.globalAlpha=1;
  }
  const grad=(g,x,y,r,col)=>{const k=g.createRadialGradient(x-r*.35,y-r*.4,r*.05,x,y,r);k.addColorStop(0,col[0]);k.addColorStop(.45,col[1]);k.addColorStop(1,col[2]);return k;};
  function stemRun(g,pts,u,B,off){
    g.lineCap='round';g.lineJoin='round';
    const path=()=>{g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));};
    g.strokeStyle=B.stem[2];g.lineWidth=u*5.2;path();g.stroke();
    g.strokeStyle=B.stem[1];g.lineWidth=u*3.6;path();g.stroke();
    if(LITE)return;
    // twisted wire: diagonal bristle ticks spaced evenly along the whole length (off = length already drawn before this run)
    const sp=u*2.1;g.strokeStyle=B.stem[0];g.lineWidth=Math.max(.6,u*1);g.beginPath();
    for(let i=1;i<pts.length;i++){const A=pts[i-1],C=pts[i],dx=C.x-A.x,dy=C.y-A.y,L=Math.hypot(dx,dy)||1,tx=dx/L,ty=dy/L,nx=-ty,ny=tx;
      for(let s0=Math.ceil(A.len/sp)*sp;s0<C.len;s0+=sp){const k=(s0-A.len)/(C.len-A.len||1),x=A.x+dx*k,y=A.y+dy*k;
        g.moveTo(x-nx*u*1.7-tx*u*1,y-ny*u*1.7-ty*u*1);g.lineTo(x+nx*u*1.7+tx*u*1,y+ny*u*1.7+ty*u*1);}}
    g.stroke();
    // a few stray bristles catching the light along the outside
    g.strokeStyle=B.stem[0];g.globalAlpha=.7;g.lineWidth=Math.max(.5,u*.5);g.beginPath();
    for(let i=1;i<pts.length;i+=2){const A=pts[i-1],C=pts[i],dx=C.x-A.x,dy=C.y-A.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,sd=(i%4<2)?1:-1;
      g.moveTo(C.x+nx*u*2.4*sd,C.y+ny*u*2.4*sd);g.lineTo(C.x+nx*u*3.6*sd+dx/L*u,C.y+ny*u*3.6*sd+dy/L*u);}
    g.stroke();g.globalAlpha=1;
  }
  function tip(g,x,y,u,B,pulse){
    const hr=u*(13+pulse*5),h=g.createRadialGradient(x,y,u*2,x,y,hr),tc=h2r(B.tip[0]).join(','),tg=h2r(B.tip[1]).join(',');h.addColorStop(0,'rgba('+tc+',.75)');h.addColorStop(1,'rgba('+tg+',0)');g.fillStyle=h;g.beginPath();g.arc(x,y,hr,0,Math.PI*2);g.fill();
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
    const proj=(x,z)=>{const X=x*c+z*sn,Z=-x*sn+z*c;let px=X,py=Z*FK;
      if(o.pitch){const cp=Math.cos(o.pitch),sp=Math.sin(o.pitch),q=px;px=q*cp-py*sp;py=q*sp+py*cp;}return[cx+px,cy+py];};
    const pr=P.map(([x,z])=>proj(x,z));
    const path=dy=>{g.beginPath();pr.forEach(([x,y],i)=>i?g.lineTo(x,y+dy):g.moveTo(x,y+dy));g.closePath();};
    // the stick's edge (thickness), then the lit top face with a soft rim highlight
    g.fillStyle=B.foot[2];for(let k=7;k>=1;k--){path(TH*k/7);g.fill();}
    const top=g.createLinearGradient(cx,cy-u*6,cx,cy+u*6);top.addColorStop(0,o.dark?B.foot[1]:B.foot[0]);top.addColorStop(1,o.dark?B.foot[2]:B.foot[1]);
    g.fillStyle=top;path(0);g.fill();
    g.save();path(0);g.clip();
    if(!LITE){
    // faint wood grain under the paint, running along the stick
    g.strokeStyle='rgba(8,40,80,.12)';g.lineWidth=Math.max(.5,u*.45);g.beginPath();
    [-4.6,-.6,3.6].forEach((gx,j)=>{for(let z=zh-hw,i=0;z<=zt;z+=u*2.5,i++){const w=Math.sin(z/u*.32+j*1.7)*u*.7+(j===2?Math.sin(z/u*.9)*u*.6:0),q=proj(gx*u+w,z);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);}});
    g.stroke();}
    // contact shadow: soft dark band where the pom presses down on the stick
    if(o.contact){const k=g.createRadialGradient(o.contact.x,o.contact.y,u*4,o.contact.x,o.contact.y,u*21);k.addColorStop(0,'rgba(26,10,32,.6)');k.addColorStop(.6,'rgba(26,10,32,.3)');k.addColorStop(1,'rgba(26,10,32,0)');g.fillStyle=k;g.fillRect(cx-u*40,cy-u*20,u*80,u*40);}
    g.restore();
    // rounded top edge: a bright rim, plus a softer inner bevel
    g.strokeStyle='rgba(255,255,255,'+(o.dark?.12:.4)+')';g.lineWidth=Math.max(.6,u*.9);path(0);g.stroke();
    g.strokeStyle='rgba(255,255,255,'+(o.dark?.05:.15)+')';g.lineWidth=Math.max(.6,u*1.6);path(u*.9);g.stroke();
  }
  // barrel pony bead glued to the pom: a short glossy cylinder whose hole runs along the surface normal n (3D, view space).
  // p = screen point where the bead meets the fluff; it sticks out along n by `len`.
  function barrelBead(g,p,n,r,len,hole,col,B,mat,seed){
    const d=Math.hypot(n.x,n.y),ax=d>1e-4?n.x/d:0,ay=d>1e-4?n.y/d:0,mx=-ay,my=ax;   // screen axis + the end ellipse's long axis
    const sq=Math.max(.06,Math.abs(n.z)),ang=Math.atan2(my,mx);
    const c0={x:p.x,y:p.y},c1={x:p.x+n.x*len,y:p.y+n.y*len};                       // back and front end centres
    // barrel wall: the two end ellipses joined, shaded across its width (light from the top-left)
    const wall=g.createLinearGradient(c1.x+mx*r,c1.y+my*r,c1.x-mx*r,c1.y-my*r);
    const lit=(mx*-1+my*-1)>0;wall.addColorStop(0,lit?col[0]:col[2]);wall.addColorStop(.5,col[1]);wall.addColorStop(1,lit?col[2]:col[0]);
    // glue seat: a soft dark dip in the fluff around the bead's base
    g.save();g.translate(c0.x,c0.y);g.rotate(ang);g.scale(1,sq);const gs=g.createRadialGradient(0,0,r*.6,0,0,r*1.55);gs.addColorStop(0,'rgba(26,10,32,.6)');gs.addColorStop(1,'rgba(26,10,32,0)');
    g.fillStyle=gs;g.beginPath();g.arc(0,0,r*1.55,0,Math.PI*2);g.fill();g.restore();
    g.fillStyle=wall;g.beginPath();g.ellipse(c0.x,c0.y,r,r*sq,ang,0,Math.PI*2);g.fill();
    g.beginPath();g.moveTo(c0.x+mx*r,c0.y+my*r);g.lineTo(c1.x+mx*r,c1.y+my*r);g.lineTo(c1.x-mx*r,c1.y-my*r);g.lineTo(c0.x-mx*r,c0.y-my*r);g.closePath();g.fill();
    // fluff tufts curling up over the base of the bead
    if(!LITE){const rr=rnd(seed||3);g.lineCap='round';g.lineWidth=Math.max(.5,r*.07);
      for(let i=0;i<26;i++){const a=i/26*Math.PI*2+rr()*.25,ca=Math.cos(a),sa=Math.sin(a),o1=1.08+rr()*.12,o2=.9+rr()*.06;
        const ex=c0.x+(mx*ca*r+ax*sa*r*sq)*o1,ey=c0.y+(my*ca*r+ay*sa*r*sq)*o1,ix=c0.x+(mx*ca*r+ax*sa*r*sq)*o2+n.x*len*.08,iy=c0.y+(my*ca*r+ay*sa*r*sq)*o2+n.y*len*.08;
        g.strokeStyle=ey<c0.y-r*.3?B.fur[1]:B.fur[2];g.globalAlpha=.55;g.beginPath();g.moveTo(ex,ey);g.lineTo(ix,iy);g.stroke();}g.globalAlpha=1;}
    if(d>.15){g.strokeStyle='rgba(255,255,255,'+(mat==='glass'?.6:.4)+')';g.lineCap='round';g.lineWidth=r*.18;const o=lit?.55:-.55;   // shine running along the barrel
      g.beginPath();g.moveTo(c0.x+mx*r*o+ax*r*.15,c0.y+my*r*o+ay*r*.15);g.lineTo(c1.x+mx*r*o-ax*r*.1,c1.y+my*r*o-ay*r*.1);g.stroke();}
    if(n.z<-.02)return;                                                             // end face turned away
    // front end: glossy ring, black hole with a sliver of inner wall, iridescent sheen, highlight + sparkle
    g.save();g.translate(c1.x,c1.y);g.rotate(ang);g.scale(1,sq);
    const k=g.createRadialGradient(-r*.35,-r*.4,r*.05,0,0,r);k.addColorStop(0,col[0]);k.addColorStop(.55,col[1]);k.addColorStop(1,col[2]);
    g.fillStyle=k;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    const ir=g.createLinearGradient(-r,-r,r,r);ir.addColorStop(0,'rgba(255,140,220,.22)');ir.addColorStop(.5,'rgba(255,255,255,0)');ir.addColorStop(1,'rgba(120,200,255,.2)');g.fillStyle=ir;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    if(mat==='glass'){   // translucent: light passes through and glows on the side away from the light, the middle reads deeper
      const tl=g.createRadialGradient(r*.42,r*.45,0,r*.42,r*.45,r*.75);tl.addColorStop(0,'rgba(255,190,170,.75)');tl.addColorStop(1,'rgba(255,120,120,0)');g.fillStyle=tl;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
      const dp=g.createRadialGradient(0,0,hole,0,0,r*.8);dp.addColorStop(0,'rgba(90,0,10,.55)');dp.addColorStop(1,'rgba(90,0,10,0)');g.fillStyle=dp;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();}
    g.fillStyle='#000';g.beginPath();g.arc(0,0,hole,0,Math.PI*2);g.fill();
    g.save();g.beginPath();g.arc(0,0,hole,0,Math.PI*2);g.clip();g.fillStyle=col[2];g.globalAlpha=.8*(1-sq);g.beginPath();g.arc(-hole*1.1,0,hole,0,Math.PI*2);g.fill();g.restore();
    g.strokeStyle='rgba(255,255,255,'+(mat==='glass'?.9:.55)+')';g.lineWidth=r*(mat==='glass'?.15:.2);g.lineCap='round';g.beginPath();g.arc(0,0,(r+hole)/2,Math.PI*1.08,Math.PI*1.45);g.stroke();
    if(mat==='glass'){g.fillStyle='#fff';g.beginPath();g.arc(-r*.2,-r*.72,Math.max(.6,r*.08),0,Math.PI*2);g.fill();}
    g.strokeStyle='rgba(255,255,255,'+(mat==='glass'?.3:.18)+')';g.lineWidth=r*.1;g.beginPath();g.arc(0,0,(r+hole)/2,Math.PI*.1,Math.PI*.38);g.stroke();
    g.restore();
  }
  let u0=1,LITE=false;
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
        duckFoot(g,X+st.x,u*35+Z*FK+st.y,th+sd*.14,u,B,{pitch:st.a,dark:Math.abs(sn)>.2&&Z<0,contact:{x:0,y:u*33.5}});
        if(pass===2)g.restore();}});});
    L.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
  }
  // the whole buddy at body angle th (0 = facing you, +90deg = facing right). Running adds stepping feet,
  // a forward lean and antennae streaming back; everything else is the same model as the turnaround.
  function drawModel(g,B,u,o){
    u0=u;LITE=!!o.lite;const th=o.angle||0,c=Math.cos(th),sn=Math.sin(th),t=o.t||0,pulse=o.pulse||0,R=u*31,CY=u*2;
    const run=o.run!=null&&o.speed!==0&&Math.abs(sn)>.5,air=!!o.air,sp=o.speed==null?1:o.speed,ph=(o.run||0)*Math.PI*2,dir=sn>=0?1:-1;
    const rot=(x,y,z)=>({x:x*c+z*sn,y,z:-x*sn+z*c});
    const bob=run&&!air?-Math.abs(Math.sin(ph))*u*2*sp:0,lean=run?(air?.05:.12*sp)*dir:0;
    // stepping: the moving foot slides forward, lifts and tips its rounded front up; in the air both hang tipped down
    const step=run||air?(sd=>{const p=ph+(sd>0?Math.PI:0);if(air)return{x:0,y:u*2,a:.12*dir};
      const lift=Math.max(0,Math.cos(p));return{x:Math.sin(p)*u*6*sp*dir,y:-lift*u*5*sp,a:-lift*.18*sp*dir};}):null;
    const sweep=run?u*(12+8*sp)+Math.sin(ph*2)*u*2*sp:0,fl=Math.sin(t*3)*u*(run?1:.5);
    g.save();g.translate(0,bob);
    g.fillStyle='rgba(26,10,32,.33)';g.beginPath();g.ellipse(0,u*41-bob,u*30,u*3.6,0,0,Math.PI*2);g.fill();
    const before=[],after=[],tips=[];
    // antennae: pipe cleaners from the top, arcing out and leaning back; when running they stream further back
    const AL=o.antenna==null?(B.ant||1.35):o.antenna,RS=u*30,ES=B.eyeSize||1;
    // is a 3D point (screen x,y + depth z) in front of the pom? outside its outline, or nearer than its surface there
    const inFront=q=>{const dx=q.x,dy=q.y-CY,h=RS*RS-dx*dx-dy*dy;return h<=0||q.z>Math.sqrt(h);};
    [-1,1].forEach(sd=>{const P=[[8,-27,0,0],[10,-48,-6,.3],[30,-54,-12,.7],[34,-36,-16,1]].map(([x,y,z,w])=>rot(sd*(8+(x-8)*AL)*u,(-27+(y+27)*AL)*u+(w===1?fl*sd:0),z*AL*u-sweep*w));
      P.forEach(q=>q.y+=q.z*FK);
      const S=[],NS=22;let len=0;
      for(let i=0;i<=NS;i++){const k=i/NS,m=1-k,b0=m*m*m,b1=3*m*m*k,b2=3*m*k*k,b3=k*k*k;
        const q={x:b0*P[0].x+b1*P[1].x+b2*P[2].x+b3*P[3].x,y:b0*P[0].y+b1*P[1].y+b2*P[2].y+b3*P[3].y,z:b0*P[0].z+b1*P[1].z+b2*P[2].z+b3*P[3].z};
        if(i)len+=Math.hypot(q.x-S[i-1].x,q.y-S[i-1].y);q.len=len;S.push(q);}
      // each segment is in front or behind by its midpoint; consecutive segments on the same side become one stroke
      let cur=null;
      for(let i=1;i<S.length;i++){const A=S[i-1],C=S[i],f=inFront({x:(A.x+C.x)/2,y:(A.y+C.y)/2,z:(A.z+C.z)/2});
        if(!cur||cur.f!==f){cur={f,pts:[A]};const run=cur;(f?after:before).push({z:A.z,f:()=>stemRun(g,run.pts,u,B,run.pts[0].len)});}
        cur.pts.push(C);}
      // the wire pushes into the bead: the bead sits a little past the wire's end, along its direction
      const T=S[S.length-1],T2=S[S.length-3],tl=Math.hypot(T.x-T2.x,T.y-T2.y)||1,bx=T.x+(T.x-T2.x)/tl*u*3,by=T.y+(T.y-T2.y)/tl*u*3;
      tips.push({x:bx,y:by,z:T.z});
      (inFront(T)?after:before).push({z:T.z+1,f:()=>tip(g,bx,by,u,B,pulse)});
      // root tuft: fluff hugging the pipe cleaner where it's pushed into the pom
      const R0=S[0],R1=S[2],rf=inFront({x:(R0.x+R1.x)/2,y:(R0.y+R1.y)/2,z:(R0.z+R1.z)/2});
      (rf?after:before).push({z:R0.z+.5,f:()=>{const rr=rnd(sd>0?21:23);g.fillStyle='rgba(26,10,32,.35)';g.beginPath();g.ellipse(R0.x,R0.y+u*.8,u*4.2,u*2,0,0,Math.PI*2);g.fill();
        g.lineCap='round';g.lineWidth=Math.max(.6,u*.8);for(let i=0;i<11;i++){const a=Math.PI+i/10*Math.PI+(rr()-.5)*.3,l=u*(2.4+rr()*2.4);
          g.strokeStyle=i<5?B.fur[1]:rr()<.5?B.fur[0]:B.fur[2];g.beginPath();g.moveTo(R0.x+Math.cos(a)*u*3.2,R0.y+u*1.4+Math.sin(a)*u*.8);g.lineTo(R0.x+Math.cos(a)*u*1.2,R0.y+u*1.2-l*.6);g.stroke();}}});});
    // barrel pony beads: eyes level and mirror-symmetric, mouth centred below; all stick out the same amount
    const bead=(lx,ly,r,len,hole,col,blink,mat,seed)=>{const lat=Math.asin(ly/R),lon=Math.asin(lx/(R*Math.cos(lat)));
      const nx=Math.sin(lon)*Math.cos(lat),ny=Math.sin(lat),nz=Math.cos(lon)*Math.cos(lat),n=rot(nx,ny,nz),p=rot(nx*R*.93,ny*R*.93,nz*R*.93);
      if(n.z<-.75)return;(p.z>-u*2?after:before).push({z:p.z+R,f:()=>{const by=CY+p.y;if(blink&&blink<1){g.save();g.translate(0,by);g.scale(1,blink);g.translate(0,-by);}barrelBead(g,{x:p.x,y:by},n,r,len,hole,col,B,mat,seed);if(blink&&blink<1)g.restore();}});};
    const bk=(t+3)%15,blink=bk<.16?Math.max(.08,Math.abs(bk-.08)/.08):1;
    bead(-u*11*(.85+ES*.15),-u*4,u*7*ES,u*6*ES,u*2.8*ES,B.eye,blink,'glass',3);bead(u*11*(.85+ES*.15),-u*4,u*7*ES,u*6*ES,u*2.8*ES,B.eye,blink,'glass',5);bead(0,u*12,u*5.6,u*5,u*2.2,B.mouth,1,'opaque',8);
    feet(g,u,B,th,step,1);
    g.save();g.translate(0,CY);g.rotate(lean);g.translate(0,-CY);
    // squish: the pom flattens a little where it rests on its feet (anchored at the contact point)
    const SQY=u*33;g.translate(0,SQY);g.scale(1.04,.95);g.translate(0,-SQY);
    before.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
    strayHairs(g,B,R,CY,rot,true);
    const ball=furBall(B,Math.max(16,Math.round(u*50)));g.drawImage(ball,-u*50,-u*50+u*2,u*100,u*100);
    if(!LITE)furFibres(g,B,R,CY,rot);
    strayHairs(g,B,R,CY,rot,false);
    // the glowing tip beads cast a warm light on the top of the fluff
    if(!LITE){g.save();g.beginPath();g.arc(0,CY,R*1.02,0,Math.PI*2);g.clip();g.globalCompositeOperation='lighter';
    const tgc=h2r(B.tip[1]).join(',');tips.forEach(T=>{if(T.z<-R*.5)return;const a=(.16+pulse*.1)*Math.min(1,(T.z+R*.5)/(R*.5)),k=g.createRadialGradient(T.x,T.y,u*4,T.x,T.y,u*34);k.addColorStop(0,'rgba('+tgc+','+a+')');k.addColorStop(1,'rgba('+tgc+',0)');g.fillStyle=k;g.fillRect(T.x-u*34,T.y-u*34,u*68,u*68);});
    g.restore();}
    g.restore();
    feet(g,u,B,th,step,2);
    g.save();g.translate(0,CY);g.rotate(lean);g.translate(0,-CY);g.translate(0,SQY);g.scale(1.04,.95);g.translate(0,-SQY);
    after.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
    g.restore();g.restore();
  }

  // ── ZERO-G: a buddy floating free, tumbling around any axis (floating sprites) ──
  // o.m = 3×3 orientation matrix (row-major, model → view). The pom is a sphere lit from a fixed world light,
  // so it's drawn upright; everything attached to it (beads, antennae, feet, fluff) turns with the matrix.
  function drawFloat(g,B,u,o){
    u0=u;LITE=o.lite!==false;const M=o.m,R=u*31,CY=0,RS=u*30,pulse=o.pulse||0;
    const rot=(x,y,z)=>({x:M[0]*x+M[1]*y+M[2]*z,y:M[3]*x+M[4]*y+M[5]*z,z:M[6]*x+M[7]*y+M[8]*z});
    const inFront=q=>{const dx=q.x,dy=q.y-CY,h=RS*RS-dx*dx-dy*dy;return h<=0||q.z>Math.sqrt(h);};
    const before=[],after=[],tips=[],put=(z,front,f)=>(front?after:before).push({z,f});
    // antennae (model points are relative to the pom's centre, which sits 2u below the old origin)
    const AL=o.antenna==null?(B.ant||1.35):o.antenna;
    [-1,1].forEach(sd=>{const P=[[8,-27,0],[10,-48,-6],[30,-54,-12],[34,-36,-16]].map(([x,y,z])=>rot(sd*(8+(x-8)*AL)*u,(-27+(y+27)*AL-2)*u,z*AL*u));
      const S=[],NS=16;let len=0;
      for(let i=0;i<=NS;i++){const k=i/NS,m=1-k,b0=m*m*m,b1=3*m*m*k,b2=3*m*k*k,b3=k*k*k;
        const q={x:b0*P[0].x+b1*P[1].x+b2*P[2].x+b3*P[3].x,y:b0*P[0].y+b1*P[1].y+b2*P[2].y+b3*P[3].y,z:b0*P[0].z+b1*P[1].z+b2*P[2].z+b3*P[3].z};
        if(i)len+=Math.hypot(q.x-S[i-1].x,q.y-S[i-1].y);q.len=len;S.push(q);}
      let cur=null;
      for(let i=1;i<S.length;i++){const A=S[i-1],C=S[i],f=inFront({x:(A.x+C.x)/2,y:(A.y+C.y)/2,z:(A.z+C.z)/2});
        if(!cur||cur.f!==f){cur={f,pts:[A]};const run=cur;put(A.z,f,()=>stemRun(g,run.pts,u,B,run.pts[0].len));}cur.pts.push(C);}
      const T=S[S.length-1],T2=S[S.length-3],tl=Math.hypot(T.x-T2.x,T.y-T2.y)||1,bx=T.x+(T.x-T2.x)/tl*u*3,by=T.y+(T.y-T2.y)/tl*u*3;
      tips.push({x:bx,y:by,z:T.z});put(T.z+1,inFront(T),()=>tip(g,bx,by,u,B,pulse));});
    // beads
    const bead=(lx,ly,r,len,hole,col,mat,seed)=>{const yy=ly-2*u,lat=Math.asin(yy/R),lon=Math.asin(lx/(R*Math.cos(lat)));
      const nx=Math.sin(lon)*Math.cos(lat),ny=Math.sin(lat),nz=Math.cos(lon)*Math.cos(lat),n=rot(nx,ny,nz),p=rot(nx*R*.93,ny*R*.93,nz*R*.93);
      if(n.z<-.75)return;put(p.z+R,p.z>-u*2,()=>barrelBead(g,{x:p.x,y:p.y},n,r,len,hole,col,B,mat,seed));};
    const ES=B.eyeSize||1;
    bead(-u*11*(.85+ES*.15),-u*4,u*7*ES,u*6*ES,u*2.8*ES,B.eye,'glass',3);bead(u*11*(.85+ES*.15),-u*4,u*7*ES,u*6*ES,u*2.8*ES,B.eye,'glass',5);bead(0,u*12,u*5.6,u*5,u*2.2,B.mouth,'opaque',8);
    // feet: the two flat duck-shaped sticks, as real 3D slabs under the pom (whichever face points at you is drawn last)
    [-1,1].forEach(sd=>{const hw=u*5.5,fw=u*10.5,zh=-u*13,zf=u*13,zt=u*19.5,TH=u*4.2,cx=sd*u*13,cz=u*2,yTop=u*33,toe=sd*.14,ct=Math.cos(toe),st=Math.sin(toe),P=[];
      for(let i=0;i<=6;i++){const f=Math.PI+i/6*Math.PI;P.push([hw*Math.cos(f),zh+hw*Math.sin(f)*.8]);}P.push([fw*.62,u]);
      for(let i=0;i<=10;i++){const f=i/10*Math.PI;P.push([fw*Math.cos(f),zf+(zt-zf)*Math.sin(f)]);}P.push([-fw*.62,u]);
      const at=(x,z,y)=>rot(cx+x*ct+z*st,y,cz-x*st+z*ct),C=at(0,0,yTop+TH/2),up=rot(0,-1,0);
      put(C.z,C.z>-u*4,()=>{const layer=y=>{g.beginPath();P.forEach(([x,z],i)=>{const q=at(x,z,y);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);});g.closePath();};
        const topFirst=up.z<0;g.fillStyle=B.foot[2];
        for(let k=0;k<=6;k++){layer(topFirst?yTop+TH*k/6:yTop+TH*(1-k/6));g.fill();}
        const face=topFirst?yTop+TH:yTop;layer(face);g.fillStyle=topFirst?B.foot[2]:B.foot[1];g.fill();
        if(!topFirst){g.fillStyle=B.foot[0];g.globalAlpha=.55;layer(face);g.fill();g.globalAlpha=1;}
        g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=Math.max(.6,u*.8);layer(face);g.stroke();});});
    before.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
    strayHairs(g,B,R,CY,rot,true);
    const ball=furBall(B,Math.max(16,Math.round(u*50)));g.drawImage(ball,-u*50,-u*50,u*100,u*100);
    if(!LITE)furFibres(g,B,R,CY,rot);
    strayHairs(g,B,R,CY,rot,false);
    after.sort((a,b)=>a.z-b.z).forEach(d=>d.f());
  }
  // orientation helpers for floating buddies: a random orientation, a slow random spin, and stepping it
  window.buddyTumble={
    random(){const r=()=>Math.random()*Math.PI*2;return buddyTumble.mul(buddyTumble.axis([0,1,0],r()),buddyTumble.axis([1,0,0],(Math.random()-.5)*1.4));},
    axis(a,t){const[x,y,z]=a,c=Math.cos(t),s=Math.sin(t),C=1-c;return[c+x*x*C,x*y*C-z*s,x*z*C+y*s, y*x*C+z*s,c+y*y*C,y*z*C-x*s, z*x*C-y*s,z*y*C+x*s,c+z*z*C];},
    mul(A,B){const o=[];for(let i=0;i<3;i++)for(let j=0;j<3;j++)o[i*3+j]=A[i*3]*B[j]+A[i*3+1]*B[3+j]+A[i*3+2]*B[6+j];return o;},
    // turn M by angular velocity w (radians/s around a view-space axis) for dt seconds, keeping it a clean rotation
    step(M,w,dt){const a=Math.hypot(w[0],w[1],w[2])*dt;if(!a)return M;let N=buddyTumble.mul(buddyTumble.axis(w.map(v=>v/Math.hypot(w[0],w[1],w[2])),a),M);
      const r0=[N[0],N[1],N[2]],l0=Math.hypot(...r0);r0.forEach((v,i)=>r0[i]=v/l0);let r1=[N[3],N[4],N[5]];const d=r1[0]*r0[0]+r1[1]*r0[1]+r1[2]*r0[2];r1=r1.map((v,i)=>v-d*r0[i]);const l1=Math.hypot(...r1);r1=r1.map(v=>v/l1);
      const r2=[r0[1]*r1[2]-r0[2]*r1[1],r0[2]*r1[0]-r0[0]*r1[2],r0[0]*r1[1]-r0[1]*r1[0]];return r0.concat(r1,r2);},
    // how far apart two orientations are, in degrees
    diff(A,B){let tr=0;for(let i=0;i<9;i++)tr+=A[i]*B[i];return Math.acos(Math.max(-1,Math.min(1,(tr-1)/2)))*180/Math.PI;}
  };
  window.drawBuddy=function(g,x,y,size,o){
    o=o||{};const B=o.look||(o.idx!=null?buddyLook(o.idx):BUDDIES[o.id||current]||BUDDIES.chloe),u=size/100;
    const angle=o.view==='turn'?(o.angle||0)*Math.PI/180:o.view==='side'?((o.face||1)<0?-Math.PI/2:Math.PI/2):0;
    if(o.view==='float'){g.save();g.translate(x,y);drawFloat(g,B,u,o);g.restore();return;}
    g.save();g.translate(x,y+u*5.5);   // feet rest on the ground at the bottom of the box
    drawModel(g,B,u,Object.assign({},o,{angle}));
    g.restore();
  };
  window.buddyInfo=function(id){return typeof id==='number'?buddyLook(id):BUDDIES[id||current]||BUDDIES.chloe;};
})();
