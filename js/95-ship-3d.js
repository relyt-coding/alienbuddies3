// ══════════════════════════════════════════════
//  THE SHIP IN 3D (v0.2.243 — detailed hull)
//  A point-and-polygon model of the ship, rendered at 32 headings once and handed to js/87, so it really turns
//  (nose follows the direction of travel, banks into turns) instead of mirroring a flat picture.
//  Detail is a mix of shaded panels and crisp surface lines drawn in projection: hull bands, seams, the spine
//  highlight, a teal racing stripe, the window row, the dome rim and its pilot, engine glow, fin stripes and
//  wing lights. Frames render on first use, not at page load.
// ══════════════════════════════════════════════════
(function(){
  const STEPS=32,W=104,H=60;
  const P=[];
  const add=(pts,c,em,a)=>P.push({p:pts,c,em:!!em,a:a==null?1:a});

  // ── fuselage: ten elliptical sections, tail (-x) to nose (+x) ──
  const SEC=[
    [-1.02,.13,.09],[-.78,.22,.14],[-.55,.30,.18],[-.28,.33,.19],[0,.345,.20],
    [.25,.34,.20],[.50,.30,.18],[.72,.22,.13],[.90,.10,.06],[1.0,.03,.03]
  ],N=8;
  const ring=([x,w,h])=>{const r=[];for(let i=0;i<N;i++){const a=i/N*Math.PI*2;r.push([x,Math.sin(a)*h,Math.cos(a)*w]);}return r;};
  const rings=SEC.map(ring);
  for(let s=0;s<rings.length-1;s++){
    const dark=s===0||s===1;
    for(let i=0;i<N;i++){
      const y=(rings[s][i][1]+rings[s][(i+1)%N][1])*.5;
      let c=dark?[128,138,158]:(y>0?[226,233,246]:[158,170,194]);
      if(s===4||s===6)c=c.map(v=>Math.round(v*.94));
      add([rings[s][i],rings[s][(i+1)%N],rings[s+1][(i+1)%N],rings[s+1][i]],c);
    }
  }
  add(rings[rings.length-1].slice(),[232,240,250]);
  add(rings[0].slice(),[110,120,140]);
  // ── fins ──
  add([[-.55,.14,0],[-1.02,.98,0],[-.12,.18,0]],[52,220,160]);
  add([[-.55,.14,0],[-.12,.18,0],[.10,.20,0]],[40,185,135]);
  add([[-.55,.06,.16],[-1.0,.28,.62],[-.12,.06,.18]],[52,220,160]);
  add([[-.55,.06,-.16],[-1.0,.28,-.62],[-.12,.06,-.18]],[52,220,160]);
  // fin tips (darker caps)
  add([[-.94,.26,.55],[-1.0,.28,.62],[-.98,.34,.585],[-.93,.30,.545]],[30,160,115]);
  add([[-.94,.26,-.55],[-1.0,.28,-.62],[-.98,.34,-.585],[-.93,.30,-.545]],[30,160,115]);
  // ── glass dome + rim ──
  const DCX=.18,DCY=.20,DR=.24;
  {const lat=3,lon=8,dp=[];
   for(let j=0;j<=lat;j++){const phi=j/lat*Math.PI/2,rr=[];for(let i=0;i<lon;i++){const th=i/lon*Math.PI*2;rr.push([DCX+Math.cos(phi)*DR*.85,DCY+Math.sin(phi)*DR,Math.cos(th)*Math.cos(phi)*DR]);}dp.push(rr);}
   for(let j=0;j<lat;j++)for(let i=0;i<lon;i++)add([dp[j][i],dp[j][(i+1)%lon],dp[j+1][(i+1)%lon],dp[j+1][i]],j===0?[170,235,255]:[110,210,250],false,.42);
   // rim
   for(let i=0;i<lon;i++){const a=dp[0][i],b=dp[0][(i+1)%lon],ah=[a[0],DCY-.005,a[2]],bh=[b[0],DCY-.005,b[2]];
     add([ah,bh,b,a],[40,60,88]);}}
  // ── the pilot (a little buddy under the glass) ──
  {const px=.18,py=.30,pz=0,pr=.11,lat=2,lon=6,dp=[];
   for(let j=0;j<=lat;j++){const phi=j/lat*Math.PI,rr=[];for(let i=0;i<lon;i++){const th=i/lon*Math.PI*2;rr.push([px+Math.sin(phi)*Math.cos(th)*pr,py+Math.cos(phi)*pr,pz+Math.sin(phi)*Math.sin(th)*pr]);}dp.push(rr);}
   for(let j=0;j<lat;j++)for(let i=0;i<lon;i++)add([dp[j][i],dp[j][(i+1)%lon],dp[j+1][(i+1)%lon],dp[j+1][i]],[90,240,165]);}
  // ── engines + glow discs ──
  [[.10,-.21],[.10,.21],[-.10,-.19],[-.10,.19]].forEach(([yy,zz])=>{
    add([[-1.0,yy+.06,zz+.05],[-1.0,yy+.06,zz-.05],[-.94,yy+.05,zz-.05],[-.94,yy+.05,zz+.05]],[58,66,86]);
  });
  add([[-1.01,.105,.17],[-1.01,.105,.26],[-1.01,.055,.26],[-1.01,.055,.17]],[255,170,70],true);
  add([[-1.01,-.075,.17],[-1.01,-.075,.26],[-1.01,-.125,.26],[-1.01,-.125,.17]],[255,170,70],true);
  // ── flame: outer + core ──
  add([[-1.02,.10,.18],[-1.56,.02,0],[-1.02,-.10,.18]],[255,140,40],true);
  add([[-1.02,.10,-.18],[-1.56,.02,0],[-1.02,-.10,-.18]],[255,140,40],true);
  add([[-1.02,.06,0],[-1.44,0,0],[-1.02,-.06,0]],[255,220,120],true);
  // ── nose light + wing lights ──
  add([[.90,.04,0],[.97,.04,.035],[.97,.04,-.035],[.90,.04,0]],[255,225,80],true);
  add([[-.97,.31,.56],[-.91,.33,.60],[-.97,.35,.56],[-.93,.33,.54]],[255,90,110],true);
  add([[-.97,.31,-.56],[-.91,.33,-.60],[-.97,.35,-.56],[-.93,.33,-.54]],[80,255,170],true);

  function norm(a,b,c){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(n[0],n[1],n[2])||1;return[n[0]/l,n[1]/l,n[2]/l];}
  function sectAt(x){for(let i=0;i<SEC.length-1;i++){const a=SEC[i],b=SEC[i+1];if(x>=a[0]&&x<=b[0]){const t=(x-a[0])/(b[0]-a[0]||1);return{w:a[1]+(b[1]-a[1])*t,h:a[2]+(b[2]-a[2])*t};}}return{w:.05,h:.04};}

  function render(yaw){
    const c=document.createElement('canvas');c.width=W*2;c.height=H*2;
    const g=c.getContext('2d');g.scale(2,2);
    const ca=Math.cos(yaw),sa=Math.sin(yaw),e=.42,ce=Math.cos(e),se=Math.sin(e),S=34,ox=W/2,oy=H*.58;
    const proj=(X,Y,Z)=>{const xr=X*ca+Z*sa,zr=-X*sa+Z*ca;return{x:ox+xr*S,y:oy+(-Y*ce+zr*se)*S,z:zr};};
    const list=[];
    for(const q of P){
      const n=norm(q.p[0],q.p[1],q.p[2]);
      const nx=n[0]*ca+n[2]*sa,nz=-n[0]*sa+n[2]*ca,ny=n[1];
      const diff=Math.max(0,nx*-.35+ny*.80+nz*.50),rim=Math.max(0,1-Math.abs(nz));
      const bright=q.em?1:Math.min(1.22,.44+.60*diff+.10*rim);
      let pts=[],dz=0;
      for(const [X,Y,Z] of q.p){const p=proj(X,Y,Z);pts.push([p.x,p.y]);dz+=p.z*ce+Y*se;}
      list.push({pts,dz:dz/q.p.length,c:q.c,bright,a:q.a});
    }
    list.sort((a,b)=>a.dz-b.dz);
    // engine bloom sits behind the ship
    {const tl=proj(-1.4,.02,0);if(tl.z>-.6){const gr=g.createRadialGradient(tl.x,tl.y,0,tl.x,tl.y,13);
      gr.addColorStop(0,'rgba(255,195,95,.55)');gr.addColorStop(.5,'rgba(255,120,35,.28)');gr.addColorStop(1,'rgba(255,90,20,0)');
      g.fillStyle=gr;g.beginPath();g.arc(tl.x,tl.y,13,0,Math.PI*2);g.fill();}}
    for(const q of list){g.beginPath();q.pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
      g.fillStyle='rgba('+Math.min(255,Math.round(q.c[0]*q.bright))+','+Math.min(255,Math.round(q.c[1]*q.bright))+','+Math.min(255,Math.round(q.c[2]*q.bright))+','+q.a+')';g.fill();}

    // ── crisp surface detail, only on the side facing the camera ──
    const line=(pts,col,w)=>{if(pts.length<2)return;g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.beginPath();
      let on=false;pts.forEach(p=>{if(!p.f){on=false;return;}if(!on){g.moveTo(p.x,p.y);on=true;}else g.lineTo(p.x,p.y);});g.stroke();};
    const ringPts=(x)=>{const s=sectAt(x),r=[];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,p=proj(x,Math.sin(a)*s.h*1.003,Math.cos(a)*s.w*1.003);p.f=p.z>-.02;r.push(p);}return r;};
    line(ringPts(-.36),'rgba(38,48,66,.55)',.6);
    line(ringPts(.30),'rgba(38,48,66,.55)',.6);
    // spine highlight
    {const r=[];for(let i=0;i<=16;i++){const x=-.9+i/16*1.8,s=sectAt(x),p=proj(x,s.h*1.02,0);p.f=true;r.push(p);}line(r,'rgba(255,255,255,.30)',.8);}
    // teal racing stripe along the visible side
    {const r=[];for(let i=0;i<=16;i++){const x=-.62+i/16*1.4,s=sectAt(x),zs=(Math.cos(yaw)>0?1:-1);
      const p=proj(x,.03,zs*s.w*1.005);p.f=true;r.push(p);}line(r,'rgba(70,225,190,.85)',1.3);}
    // window row near the nose
    {const zs=(Math.cos(yaw)>0?1:-1);for(let i=0;i<3;i++){const x=.42+i*.10,s=sectAt(x),p=proj(x,.075,zs*s.w*1.01);
      if(p.z>-.02){g.fillStyle='rgba(120,215,255,.9)';g.beginPath();g.arc(p.x,p.y,.9,0,Math.PI*2);g.fill();}}}
    // glass highlight on the dome
    {const sp=proj(DCX+.05,DCY+DR*.78,DR*.38);if(sp.z>-.03){g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(sp.x,sp.y,2.1,1.3,-.5,0,Math.PI*2);g.fill();}}
    return c;
  }

  let frames=null;
  function ensure(){if(frames)return;frames=[];for(let i=0;i<STEPS;i++)frames.push(render(i/STEPS*Math.PI*2));}

  window.ship3D={
    paint(cv,heading,bank){
      try{ensure();}catch(e){return;}
      const k=Math.min(2,window.devicePixelRatio||1);
      if(cv.width!==Math.round(W*k)){cv.width=Math.round(W*k);cv.height=Math.round(H*k);cv.style.width=W+'px';cv.style.height=H+'px';}
      const g=cv.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);
      let a=((heading||0)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
      const i=Math.round(a/(Math.PI*2)*STEPS)%STEPS,f=frames[i];
      g.save();g.translate(cv.width/2,cv.height/2);g.rotate(bank||0);
      g.drawImage(f,-cv.width/2,-cv.height/2,cv.width,cv.height);
      g.restore();
    }
  };
})();
