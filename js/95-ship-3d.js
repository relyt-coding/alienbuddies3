// ══════════════════════════════════════════════
//  THE SHIP IN 3D (v0.2.242)
//  The old ship was one flat SVG that mirrored (scaleX) when it turned, so it always looked 2D. This builds a
//  tiny point-and-polygon model of the same ship (hull, fins, dome, engines, flame, wing lights), renders it at
//  32 headings once, and hands the right picture to js/87. The result really turns: you see its tail when it
//  flies away, its far side when it banks, and the light stays fixed on the hull.
//  Frames render on first use (when the skill tree opens), not at page load.
// ══════════════════════════════════════════════
(function(){
  const STEPS=32,W=104,H=60;
  const P=[];
  const add=(pts,c,em)=>P.push({p:pts,c,em:!!em});

  // fuselage: five elliptical sections from tail (-x) to nose (+x)
  const SEC=[[-1.02,.13,.09],[-.55,.30,.18],[.10,.34,.20],[.62,.26,.16],[1.0,.05,.04]],N=8;
  const ring=([x,w,h])=>{const r=[];for(let i=0;i<N;i++){const a=i/N*Math.PI*2;r.push([x,Math.sin(a)*h,Math.cos(a)*w]);}return r;};
  const rings=SEC.map(ring);
  for(let s=0;s<rings.length-1;s++)for(let i=0;i<N;i++)add([rings[s][i],rings[s][(i+1)%N],rings[s+1][(i+1)%N],rings[s+1][i]],[188,202,224]);
  add(rings[rings.length-1].slice(),[228,238,250]);
  add(rings[0].slice(),[105,115,135]);
  // tail fin + two swept side fins
  add([[-.55,.14,0],[-1.05,.95,0],[-.15,.18,0]],[52,220,160]);
  add([[-.55,.14,0],[-.15,.18,0],[.08,.20,0]],[40,185,135]);
  add([[-.55,.06,.16],[-1.0,.28,.62],[-.15,.06,.18]],[52,220,160]);
  add([[-.55,.06,-.16],[-1.0,.28,-.62],[-.15,.06,-.18]],[52,220,160]);
  // glass dome (low-poly hemisphere)
  {const cx=.18,cy=.20,r=.24,lat=3,lon=8,dp=[];
   for(let j=0;j<=lat;j++){const phi=j/lat*Math.PI/2,rr=[];for(let i=0;i<lon;i++){const th=i/lon*Math.PI*2;rr.push([cx+Math.cos(phi)*r*.85,cy+Math.sin(phi)*r,Math.cos(th)*Math.cos(phi)*r]);}dp.push(rr);}
   for(let j=0;j<lat;j++)for(let i=0;i<lon;i++)add([dp[j][i],dp[j][(i+1)%lon],dp[j+1][(i+1)%lon],dp[j+1][i]],[80,205,255]);}
  // engine housings + flame
  [.10,-.10].forEach(yy=>add([[-1.03,yy+.07,.15],[-1.03,yy+.07,.25],[-1.03,yy-.07,.25],[-1.03,yy-.07,.15]],[55,65,85]));
  add([[-1.02,.10,.18],[-1.55,.02,0],[-1.02,-.10,.18]],[255,150,40],true);
  add([[-1.02,.10,-.18],[-1.55,.02,0],[-1.02,-.10,-.18]],[255,150,40],true);
  add([[-1.02,.06,0],[-1.48,0,0],[-1.02,-.06,0]],[255,225,130],true);
  // wing-tip lights
  add([[-.99,.27,.60],[-.93,.30,.62],[-.97,.33,.60]],[255,80,100],true);
  add([[-.99,.27,-.60],[-.93,.30,-.62],[-.97,.33,-.60]],[60,255,160],true);

  function norm(a,b,c){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(n[0],n[1],n[2])||1;return[n[0]/l,n[1]/l,n[2]/l];}

  function render(yaw){
    const c=document.createElement('canvas');c.width=W*2;c.height=H*2;
    const g=c.getContext('2d');g.scale(2,2);
    const ca=Math.cos(yaw),sa=Math.sin(yaw),e=.42,ce=Math.cos(e),se=Math.sin(e),S=34,ox=W/2,oy=H*.58;
    const list=[];
    for(const q of P){
      const n=norm(q.p[0],q.p[1],q.p[2]);
      const nx=n[0]*ca+n[2]*sa,nz=-n[0]*sa+n[2]*ca,ny=n[1];
      const bright=q.em?1:Math.max(.18,.30+.70*Math.max(0,nx*-.35+ny*.80+nz*.50));
      const pts=[];let dz=0;
      for(const [X,Y,Z] of q.p){const xr=X*ca+Z*sa,zr=-X*sa+Z*ca;pts.push([ox+xr*S,oy+(-Y*ce+zr*se)*S]);dz+=zr*ce+Y*se;}
      list.push({pts,dz:dz/q.p.length,c:q.c,bright});
    }
    list.sort((a,b)=>a.dz-b.dz);
    for(const q of list){g.beginPath();q.pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
      g.fillStyle='rgb('+Math.round(q.c[0]*q.bright)+','+Math.round(q.c[1]*q.bright)+','+Math.round(q.c[2]*q.bright)+')';g.fill();}
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
