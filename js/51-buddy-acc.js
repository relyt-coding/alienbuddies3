// ══════════════════════════════════════════════
//  BUDDY ACCESSORIES — 25 head pieces, 25 eyewear, 25 shoes and 25 platforms.
//  Unlocked by solving the puzzles on the Alien Evolution path (js/53-puzzles.js): puzzle k gives item k of each.
//  A buddy's outfit lives on alienData[i].acc = {h, e, s, p} (item index, or null for none).
//  Drawn by js/46-buddies.js through buddyAcc.attach (head + eyes), buddyAcc.shoe (feet) and buddyAcc.platform
//  (only on the Best Buddy page). Everything is drawn in "u" units (1/100 of the buddy's size) in the craft style:
//  felt, card, glossy plastic and wood, lit from the top-left.
// ══════════════════════════════════════════════
(function(){
  const TAU=Math.PI*2;
  const h2r=h=>{h=(h||'#888').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255];};
  const mix=(a,b,k)=>{const A=h2r(a),C=h2r(b);return'rgb('+A.map((v,i)=>Math.round(v+(C[i]-v)*k)).join(',')+')';};
  const lt=(c,k)=>mix(c,'#ffffff',k),dk=(c,k)=>mix(c,'#000000',k);
  const LG=(g,x0,y0,x1,y1,st)=>{const q=g.createLinearGradient(x0,y0,x1,y1);st.forEach((c,i)=>q.addColorStop(i/(st.length-1),c));return q;};
  const RG=(g,x,y,r0,r1,st)=>{const q=g.createRadialGradient(x,y,r0,x,y,r1);st.forEach((c,i)=>q.addColorStop(i/(st.length-1),c));return q;};
  const E=(g,x,y,rx,ry,fill,rot)=>{g.beginPath();g.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),rot||0,0,TAU);if(fill){g.fillStyle=fill;g.fill();}};
  const C=(g,x,y,r,fill)=>E(g,x,y,r,r,fill);
  const poly=(g,pts,fill,stroke,lw)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw||1;g.stroke();}};
  const RR=(g,x,y,w,h,r)=>{r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();};
  const star=(g,x,y,r,fill,pts,inner)=>{pts=pts||5;g.beginPath();for(let i=0;i<pts*2;i++){const a=-Math.PI/2+i*Math.PI/pts,d=i%2?r*(inner||.45):r;g.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}g.closePath();if(fill){g.fillStyle=fill;g.fill();}};
  const heart=(g,x,y,s,fill)=>{g.beginPath();g.moveTo(x,y+s*.9);g.bezierCurveTo(x-s*1.4,y-s*.1,x-s*.7,y-s*1.1,x,y-s*.35);g.bezierCurveTo(x+s*.7,y-s*1.1,x+s*1.4,y-s*.1,x,y+s*.9);g.closePath();if(fill){g.fillStyle=fill;g.fill();}};
  const shine=(g,x,y,rx,ry,a)=>E(g,x,y,rx,ry,'rgba(255,255,255,'+(a==null?.55:a)+')',-.5);
  const LINE=(g,pts,col,lw)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle=col;g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';g.stroke();};

  // ───────────── HEAD (local frame: origin = top of the pom, x right, y down, units u; f = {fx,fz,t}) ─────────────
  // fx = which way the face points across the hat (-1..1), fz > 0 = face towards you (for brims and front badges)
  function brim(g,u,w,h,col,y){y=y||0;E(g,0,y+u*.8,w,h,dk(col,.35));E(g,0,y,w,h,LG(g,-w,0,w,0,[lt(col,.25),col,dk(col,.2)]));}
  function dome(g,u,w,h,col,y){y=y||0;g.beginPath();g.moveTo(-w,y);g.bezierCurveTo(-w,y-h*1.35,w,y-h*1.35,w,y);g.closePath();g.fillStyle=RG(g,-w*.35,y-h*.7,u,w*1.3,[lt(col,.35),col,dk(col,.3)]);g.fill();}
  function cyl(g,u,w,h,col,y){y=y||0;g.fillStyle=LG(g,-w,0,w,0,[lt(col,.2),col,dk(col,.35)]);g.fillRect(-w,y-h,w*2,h);E(g,0,y,w,w*.28,dk(col,.15));E(g,0,y-h,w,w*.28,lt(col,.15));}
  const HEAD=[
    {name:'Party Hat',d(g,u,f){poly(g,[[-14*u,2*u],[14*u,2*u],[f.fx*3*u,-30*u]],LG(g,-14*u,0,14*u,0,['#ff7ac0','#ff4fa8','#c42a7c']));
      g.save();g.clip();for(let i=0;i<4;i++){g.fillStyle=i%2?'#ffe14d':'#3fe6ff';g.beginPath();g.moveTo(-20*u,-2*u-i*8*u);g.lineTo(20*u,-8*u-i*8*u);g.lineTo(20*u,-5*u-i*8*u);g.lineTo(-20*u,1*u-i*8*u);g.fill();}g.restore();
      E(g,0,2*u,14*u,3*u,'#e33a92');C(g,f.fx*3*u,-31*u,4.5*u,RG(g,f.fx*3*u-1.5*u,-32.5*u,0,5*u,['#fff6b0','#ffe14d','#e0a020']));}},
    {name:'Cozy Beanie',d(g,u,f){dome(g,u,19*u,15*u,'#4fb3ff',4*u);g.save();g.clip();g.strokeStyle='rgba(0,40,90,.25)';g.lineWidth=u*1.2;for(let x=-18;x<=18;x+=4){LINE(g,[[x*u,4*u],[x*.8*u,-20*u]],'rgba(0,40,90,.22)',u*1.1);}g.restore();
      RR(g,-20*u,-1*u,40*u,8*u,4*u);g.fillStyle=LG(g,0,-u,0,7*u,['#ffd23f','#e0a020']);g.fill();for(let x=-18;x<=18;x+=3)LINE(g,[[x*u,0],[x*u,6*u]],'rgba(120,70,0,.25)',u*.8);
      C(g,0,-22*u,7*u,RG(g,-2*u,-24*u,0,8*u,['#fff','#ff7ac0','#c42a7c']));}},
    {name:'Top Hat',d(g,u,f){brim(g,u,20*u,5*u,'#2a2a33',2*u);cyl(g,u,12*u,24*u,'#2a2a33',1*u);g.fillStyle='#d6336c';g.fillRect(-12*u,-5*u,24*u,5*u);shine(g,-6*u,-15*u,2*u,6*u,.25);}},
    {name:'Royal Crown',d(g,u,f){const pts=[[-15*u,2*u],[-15*u,-14*u],[-8*u,-6*u],[0,-18*u],[8*u,-6*u],[15*u,-14*u],[15*u,2*u]];poly(g,pts,LG(g,-15*u,0,15*u,0,['#fff3a0','#ffd23f','#c9a227','#8a6a10']));
      E(g,0,2*u,15*u,3.5*u,'#c9a227');[[-15,-14],[0,-18],[15,-14]].forEach(([x,y])=>C(g,x*u,y*u,2.4*u,'#fff6c0'));
      [[-8,-3,'#ff2b2b'],[0,-5,'#3fe6ff'],[8,-3,'#5fe07a']].forEach(([x,y,c])=>{C(g,(x+f.fx*2)*u,y*u,2.6*u,c);C(g,(x+f.fx*2-.8)*u,(y-.8)*u,.9*u,'#fff');});}},
    {name:'Baseball Cap',d(g,u,f){dome(g,u,18*u,15*u,'#e53935',3*u);const bx=f.fx*14*u,bz=Math.max(.15,Math.abs(f.fz));
      if(f.fz>-.2){E(g,bx*.9,3*u,(13-6*Math.abs(f.fx))*u,5*u*bz+u,dk('#e53935',.15));} C(g,0,-17*u,2.2*u,'#ff7070');
      if(f.fz>0){g.globalAlpha=Math.min(1,f.fz*2);C(g,f.fx*9*u,-7*u,4.5*u,'#fff');g.fillStyle='#e53935';g.font='bold '+(6*u)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('A',f.fx*9*u,-6.6*u);g.globalAlpha=1;}}},
    {name:'Daisy',d(g,u,f){for(let i=0;i<10;i++){const a=i/10*TAU+f.t*.2;g.save();g.translate(0,-6*u);g.rotate(a);E(g,0,-8*u,3.4*u,7*u,i%2?'#ffffff':'#f2f2ff');g.restore();}
      C(g,0,-6*u,5.5*u,RG(g,-2*u,-8*u,0,6*u,['#fff6a0','#ffd23f','#e0a020']));E(g,10*u,1*u,7*u,3*u,'#5fd16a',.4);}},
    {name:'Big Bow',d(g,u,f){const c='#ff5fa2';[-1,1].forEach(s=>{poly(g,[[0,-6*u],[s*16*u,-16*u],[s*18*u,-2*u],[s*14*u,2*u]],LG(g,0,0,s*18*u,0,[c,lt(c,.25),dk(c,.15)]));
      E(g,s*12*u,-8*u,3*u,2*u,'rgba(255,255,255,.35)');});RR(g,-5*u,-11*u,10*u,10*u,3*u);g.fillStyle=dk(c,.12);g.fill();shine(g,-2*u,-8*u,1.5*u,2.5*u,.4);}},
    {name:'Headphones',d(g,u,f){g.beginPath();g.arc(0,20*u,27*u,Math.PI*1.08,Math.PI*1.92);g.strokeStyle='#2a2a33';g.lineWidth=5*u;g.stroke();g.strokeStyle='#5a5a66';g.lineWidth=1.5*u;g.stroke();
      [-1,1].forEach(s=>{RR(g,s*29*u-5*u,14*u,10*u,16*u,4*u);g.fillStyle=LG(g,s*24*u,0,s*34*u,0,['#ff4fa8','#c42a7c']);g.fill();E(g,s*31*u,22*u,2*u,6*u,'rgba(255,255,255,.3)');});}},
    {name:'Halo',d(g,u,f){const y=-12*u+Math.sin(f.t*2)*1.5*u;g.save();g.shadowColor='#ffe14d';g.shadowBlur=f.lite?0:8*u;g.lineWidth=3.2*u;g.strokeStyle='#ffe680';E(g,0,y,15*u,4.5*u);g.stroke();g.restore();
      g.lineWidth=1.2*u;g.strokeStyle='#fffbe0';E(g,0,y-.5*u,15*u,4.5*u);g.stroke();}},
    {name:'Wizard Hat',d(g,u,f){brim(g,u,22*u,5*u,'#5b3cc4',2*u);poly(g,[[-14*u,1*u],[14*u,1*u],[6*u+f.fx*4*u,-22*u],[16*u,-34*u],[0,-26*u]],LG(g,-14*u,0,14*u,0,['#8a6bff','#5b3cc4','#3a2390']));
      star(g,-4*u+f.fx*3*u,-8*u,3.5*u,'#ffe14d');star(g,5*u+f.fx*3*u,-15*u,2.2*u,'#fff6a0');C(g,-1*u,-19*u,1*u,'#fff');}},
    {name:'Cowboy Hat',d(g,u,f){g.beginPath();g.moveTo(-26*u,-2*u);g.quadraticCurveTo(0,8*u,26*u,-2*u);g.quadraticCurveTo(0,4*u,-26*u,-2*u);g.fillStyle='#8a5a2b';g.fill();
      g.beginPath();g.moveTo(-12*u,1*u);g.bezierCurveTo(-14*u,-20*u,-4*u,-16*u,0,-13*u);g.bezierCurveTo(4*u,-16*u,14*u,-20*u,12*u,1*u);g.closePath();g.fillStyle=LG(g,-12*u,0,12*u,0,['#c08040','#a06a30','#7a4a20']);g.fill();
      g.fillStyle='#4a2a10';g.fillRect(-12*u,-3*u,24*u,3*u);star(g,f.fx*8*u,-1.5*u,1.6*u,'#ffd23f');}},
    {name:'Chef Hat',d(g,u,f){cyl(g,u,12*u,8*u,'#f5f5fa',2*u);[[-9,-12,8],[0,-16,9],[9,-12,8],[-4,-20,7],[5,-21,7]].forEach(([x,y,r])=>C(g,x*u,y*u,r*u,RG(g,(x-3)*u,(y-3)*u,0,r*u*1.2,['#ffffff','#eef0f8','#c8ccd8'])));}},
    {name:'Beret',d(g,u,f){E(g,4*u,-5*u,19*u,8*u,LG(g,-15*u,0,22*u,0,['#ff5a5a','#d63333','#8a1a1a']),.15);E(g,0,1*u,14*u,3*u,'#7a1515');LINE(g,[[6*u,-12*u],[7*u,-16*u]],'#5a0e0e',2*u);}},
    {name:'Propeller Cap',d(g,u,f){dome(g,u,17*u,14*u,'#ffd23f',3*u);g.save();g.beginPath();g.moveTo(-17*u,3*u);g.bezierCurveTo(-17*u,-16*u,17*u,-16*u,17*u,3*u);g.closePath();g.clip();
      ['#e53935','#2f80ff','#5fd16a','#e53935'].forEach((c,i)=>{g.fillStyle=c;g.beginPath();g.moveTo(0,-14*u);g.lineTo((-17+i*9)*u,3*u);g.lineTo((-12+i*9)*u,3*u);g.closePath();g.fill();});g.restore();
      LINE(g,[[0,-14*u],[0,-19*u]],'#555',1.5*u);const a=f.t*14,sx=Math.cos(a);E(g,0,-20*u,14*u*Math.abs(sx)+1.5*u,2.2*u,'#e53935');C(g,0,-20*u,1.6*u,'#333');}},
    {name:'Viking Helmet',d(g,u,f){[-1,1].forEach(s=>{g.beginPath();g.moveTo(s*13*u,-6*u);g.quadraticCurveTo(s*26*u,-8*u,s*24*u,-24*u);g.quadraticCurveTo(s*20*u,-12*u,s*11*u,-1*u);g.closePath();g.fillStyle=LG(g,s*12*u,0,s*25*u,-20*u,['#fff6e0','#e6d2a8']);g.fill();});
      dome(g,u,16*u,13*u,'#b0b8c8',3*u);g.fillStyle='#8a6a2a';g.fillRect(-16*u,0,32*u,3.5*u);g.fillRect(-1.5*u,-16*u,3*u,16*u);[-10,-4,4,10].forEach(x=>C(g,x*u,1.7*u,1*u,'#e0c070'));}},
    {name:'Space Helmet',front:true,d(g,u,f){g.save();C(g,0,30*u,33*u,RG(g,-10*u,18*u,0,34*u,['rgba(200,240,255,.08)','rgba(160,220,255,.15)','rgba(120,200,255,.35)']));
      g.lineWidth=2*u;g.strokeStyle='rgba(220,245,255,.7)';g.beginPath();g.arc(0,30*u,33*u,0,TAU);g.stroke();E(g,-14*u,14*u,4*u,10*u,'rgba(255,255,255,.55)',.6);g.restore();
      E(g,0,60*u,30*u,6*u,'#c7ccd8');}},
    {name:'Tiara',d(g,u,f){g.beginPath();g.moveTo(-15*u,2*u);g.quadraticCurveTo(0,-6*u,15*u,2*u);g.lineWidth=2.5*u;g.strokeStyle='#e0e4f0';g.stroke();
      poly(g,[[-8*u,-1*u],[-4*u,-8*u],[0,-3*u],[4*u,-8*u],[8*u,-1*u],[0,-14*u]],null);[[-4,-8],[4,-8]].forEach(([x,y])=>star(g,x*u,y*u,3*u,'#f5f5fa',4,.4));star(g,0,-12*u,4.5*u,'#fff',4,.35);C(g,0,-12*u,2*u,'#ff7ac0');}},
    {name:'Sprout',d(g,u,f){const sw=Math.sin(f.t*1.6)*.12;g.save();g.rotate(sw);LINE(g,[[0,0],[0,-14*u]],'#43a047',2.2*u);
      g.save();g.translate(0,-13*u);g.rotate(-.6);E(g,-6*u,0,7*u,3.6*u,LG(g,-12*u,0,0,0,['#9ccc65','#43a047']));g.restore();
      g.save();g.translate(0,-15*u);g.rotate(.5);E(g,6*u,0,7*u,3.6*u,LG(g,0,0,12*u,0,['#43a047','#9ccc65']));g.restore();g.restore();}},
    {name:'Toadstool',d(g,u,f){dome(g,u,22*u,14*u,'#e53935',2*u);[[-10,-6,3.5],[4,-10,4],[12,-3,2.5],[-2,-3,2.2]].forEach(([x,y,r])=>E(g,(x+f.fx*2)*u,y*u,r*u,r*.8*u,'#fff'));}},
    {name:'Cat Ears',d(g,u,f){[-1,1].forEach(s=>{poly(g,[[s*5*u,4*u],[s*18*u,-1*u],[s*14*u,-18*u]],LG(g,s*5*u,0,s*16*u,-15*u,['#3a3a44','#2a2a33']));poly(g,[[s*8*u,1*u],[s*15*u,-1*u],[s*13.5*u,-12*u]],'#ff9ccf');});}},
    {name:'Bunny Ears',d(g,u,f){[-1,1].forEach(s=>{g.save();g.translate(s*7*u,2*u);g.rotate(s*(.18+Math.sin(f.t*2+s)*.05));E(g,0,-15*u,5.5*u,16*u,'#f5f5fa');E(g,0,-14*u,3*u,12*u,'#ffc0dc');g.restore();});}},
    {name:'Pirate Hat',d(g,u,f){g.beginPath();g.moveTo(-24*u,0);g.quadraticCurveTo(-18*u,-20*u,0,-16*u);g.quadraticCurveTo(18*u,-20*u,24*u,0);g.quadraticCurveTo(0,6*u,-24*u,0);g.fillStyle=LG(g,0,-18*u,0,4*u,['#3a3a44','#1b1b22']);g.fill();
      g.strokeStyle='#e0c070';g.lineWidth=1.3*u;g.beginPath();g.moveTo(-23*u,-1*u);g.quadraticCurveTo(0,4.5*u,23*u,-1*u);g.stroke();
      if(f.fz>-.3){C(g,f.fx*6*u,-8*u,3.6*u,'#f5f5fa');E(g,f.fx*6*u-1.3*u,-8.5*u,1*u,1.2*u,'#1b1b22');E(g,f.fx*6*u+1.3*u,-8.5*u,1*u,1.2*u,'#1b1b22');}}},
    {name:'Grad Cap',d(g,u,f){dome(g,u,13*u,7*u,'#2a2a33',3*u);poly(g,[[-22*u,-8*u],[0,-15*u],[22*u,-8*u],[0,-1*u]],LG(g,-22*u,0,22*u,0,['#4a4a55','#2a2a33','#1b1b22']));
      C(g,0,-8*u,1.4*u,'#ffd23f');const sw=Math.sin(f.t*1.5)*2*u;LINE(g,[[0,-8*u],[14*u,-6*u],[16*u+sw,4*u]],'#ffd23f',1.2*u);E(g,16*u+sw,6*u,1.8*u,3*u,'#ffd23f');}},
    {name:'Santa Hat',d(g,u,f){g.beginPath();g.moveTo(-15*u,1*u);g.bezierCurveTo(-12*u,-24*u,10*u,-28*u,22*u,-16*u);g.bezierCurveTo(14*u,-18*u,10*u,-10*u,15*u,1*u);g.closePath();g.fillStyle=LG(g,-15*u,0,15*u,0,['#ff5a5a','#e53935','#a01818']);g.fill();
      RR(g,-17*u,-3*u,34*u,7*u,3.5*u);g.fillStyle='#f5f5fa';g.fill();C(g,22*u,-16*u,4.5*u,RG(g,20*u,-18*u,0,5*u,['#fff','#e8eaf2']));}},
    {name:'Mini UFO',d(g,u,f){const y=-16*u+Math.sin(f.t*2.2)*2*u;g.globalAlpha=.25;poly(g,[[-3*u,y+3*u],[3*u,y+3*u],[9*u,3*u],[-9*u,3*u]],'#9dff3f');g.globalAlpha=1;
      E(g,0,y,14*u,4*u,LG(g,0,y-4*u,0,y+4*u,['#e0e4f0','#8a90a8']));g.beginPath();g.arc(0,y-1*u,6.5*u,Math.PI,0);g.fillStyle='rgba(120,220,255,.75)';g.fill();shine(g,-2.5*u,y-4*u,1.5*u,1*u,.7);
      [-9,-3,3,9].forEach((x,i)=>C(g,x*u,y+1*u,1.1*u,(Math.floor(f.t*4)+i)%2?'#ffe14d':'#ff4fa8'));}},
  ];

  // ───────────── EYEWEAR (local frame: centred between the eyes, x across the face, y down; eyes at ±ex) ─────────────
  const lens=(g,x,r,fill,frame,lw)=>{C(g,x,0,r,fill);if(frame){g.lineWidth=lw;g.strokeStyle=frame;g.beginPath();g.arc(x,0,r,0,TAU);g.stroke();}};
  const bridge=(g,ex,r,col,lw,y)=>LINE(g,[[-ex+r*.9,y||0],[0,(y||0)-r*.2],[ex-r*.9,y||0]],col,lw);
  const glint=(g,x,r)=>{E(g,x-r*.35,-r*.35,r*.28,r*.16,'rgba(255,255,255,.75)',-.6);};
  const EYES=[
    {name:'Round Specs',d(g,u,ex,f){[-1,1].forEach(s=>{lens(g,s*ex,9*u,'rgba(200,235,255,.18)','#c9a227',1.8*u);glint(g,s*ex,9*u);});bridge(g,ex,9*u,'#c9a227',1.6*u);}},
    {name:'Cool Shades',d(g,u,ex,f){[-1,1].forEach(s=>{RR(g,s*ex-10*u,-6*u,20*u,13*u,5*u);g.fillStyle=LG(g,0,-6*u,0,7*u,['#3a3a50','#0b0b12']);g.fill();g.strokeStyle='#111';g.lineWidth=1.4*u;g.stroke();E(g,s*ex-4*u,-2*u,4*u,1.5*u,'rgba(255,255,255,.35)',-.3);});LINE(g,[[-ex+9*u,-3*u],[ex-9*u,-3*u]],'#111',2*u);}},
    {name:'Heart Glasses',d(g,u,ex,f){[-1,1].forEach(s=>{heart(g,s*ex,0,10*u,'#ff2b6a');heart(g,s*ex,-.4*u,7.5*u,'rgba(255,140,190,.85)');E(g,s*ex-4*u,-4*u,2.2*u,1.3*u,'rgba(255,255,255,.7)',-.5);});bridge(g,ex,9*u,'#ff2b6a',1.8*u,-2*u);}},
    {name:'Star Glasses',d(g,u,ex,f){[-1,1].forEach(s=>{star(g,s*ex,0,12*u,'#ffd23f',5,.55);star(g,s*ex,.5*u,8.5*u,'rgba(255,250,200,.8)',5,.55);});bridge(g,ex,9*u,'#ffd23f',1.8*u);}},
    {name:'Aviators',d(g,u,ex,f){[-1,1].forEach(s=>{g.beginPath();g.moveTo(s*ex-9*u,-6*u);g.lineTo(s*ex+9*u,-6*u);g.quadraticCurveTo(s*ex+10*u,8*u,s*ex+s*2*u,9*u);g.quadraticCurveTo(s*ex-10*u,8*u,s*ex-9*u,-6*u);g.closePath();
      g.fillStyle=LG(g,0,-6*u,0,9*u,['rgba(60,40,10,.85)','rgba(255,170,60,.7)']);g.fill();g.strokeStyle='#e0c070';g.lineWidth=1.2*u;g.stroke();E(g,s*ex-4*u,-2*u,3*u,1.4*u,'rgba(255,255,255,.4)',-.4);});LINE(g,[[-ex+9*u,-5*u],[ex-9*u,-5*u]],'#e0c070',1.2*u);LINE(g,[[-ex+10*u,-1*u],[ex-10*u,-1*u]],'#e0c070',1*u);}},
    {name:'Nerd Frames',d(g,u,ex,f){[-1,1].forEach(s=>{RR(g,s*ex-9.5*u,-7*u,19*u,14*u,3*u);g.fillStyle='rgba(200,235,255,.15)';g.fill();g.strokeStyle='#1b1b22';g.lineWidth=3*u;g.stroke();glint(g,s*ex,8*u);});LINE(g,[[-ex+9*u,-2*u],[ex-9*u,-2*u]],'#1b1b22',3*u);RR(g,-2.5*u,-3.5*u,5*u,3*u,1*u);g.fillStyle='#f5f5fa';g.fill();}},
    {name:'3D Glasses',d(g,u,ex,f){RR(g,-ex-11*u,-7*u,ex*2+22*u,14*u,3*u);g.fillStyle='#f5f5fa';g.fill();RR(g,-ex-8*u,-5*u,16*u,10*u,2*u);g.fillStyle='rgba(255,40,60,.75)';g.fill();RR(g,ex-8*u,-5*u,16*u,10*u,2*u);g.fillStyle='rgba(40,170,255,.75)';g.fill();}},
    {name:'Monocle',d(g,u,ex,f){lens(g,ex,9.5*u,'rgba(220,240,255,.18)','#e0c070',2*u);glint(g,ex,9.5*u);g.setLineDash([1.6*u,1.2*u]);g.beginPath();g.moveTo(ex+5*u,8*u);g.quadraticCurveTo(ex+14*u,20*u,ex+6*u,30*u);g.strokeStyle='#e0c070';g.lineWidth=1*u;g.stroke();g.setLineDash([]);}},
    {name:'Ski Goggles',d(g,u,ex,f){g.fillStyle='#2a2a33';g.fillRect(-ex-26*u,-3.5*u,ex*2+52*u,6*u);RR(g,-ex-12*u,-9*u,ex*2+24*u,18*u,8*u);g.fillStyle=LG(g,-ex,0,ex,0,['#ff7a3d','#ffd23f','#3fe6ff','#b06bff']);g.fill();g.strokeStyle='#f5f5fa';g.lineWidth=2.2*u;g.stroke();
      E(g,-ex,-4*u,8*u,2*u,'rgba(255,255,255,.45)',-.1);}},
    {name:'Swim Goggles',d(g,u,ex,f){g.fillStyle='#19c3b0';g.fillRect(-ex-24*u,-2*u,ex*2+48*u,3.5*u);[-1,1].forEach(s=>{E(g,s*ex,0,9.5*u,8*u,'rgba(120,230,255,.4)');g.lineWidth=2.4*u;g.strokeStyle='#19c3b0';E(g,s*ex,0,9.5*u,8*u);g.stroke();glint(g,s*ex,8*u);});bridge(g,ex,9*u,'#19c3b0',2*u);}},
    {name:'Shutter Shades',d(g,u,ex,f){[-1,1].forEach(s=>{RR(g,s*ex-10*u,-7*u,20*u,14*u,4*u);g.strokeStyle='#ff4fa8';g.lineWidth=2*u;g.stroke();for(let k=-1;k<=1;k++)LINE(g,[[s*ex-9*u,k*4*u],[s*ex+9*u,k*4*u]],'#ff4fa8',1.6*u);});LINE(g,[[-ex+10*u,-2*u],[ex-10*u,-2*u]],'#ff4fa8',2*u);}},
    {name:'Cat-Eye Specs',d(g,u,ex,f){[-1,1].forEach(s=>{g.beginPath();g.moveTo(s*ex-s*9*u,0);g.quadraticCurveTo(s*ex-s*8*u,-7*u,s*ex+s*2*u,-6*u);g.lineTo(s*ex+s*13*u,-10*u);g.quadraticCurveTo(s*ex+s*11*u,6*u,s*ex,7*u);g.quadraticCurveTo(s*ex-s*9*u,6*u,s*ex-s*9*u,0);g.closePath();
      g.fillStyle='rgba(255,200,230,.25)';g.fill();g.strokeStyle='#d6336c';g.lineWidth=2.2*u;g.stroke();C(g,s*ex+s*10*u,-8*u,1.2*u,'#fff');});bridge(g,ex,9*u,'#d6336c',1.8*u,-1*u);}},
    {name:'Cyber Visor',d(g,u,ex,f){RR(g,-ex-14*u,-6*u,ex*2+28*u,11*u,5.5*u);g.fillStyle=LG(g,-ex,0,ex,0,['rgba(0,255,200,.75)','rgba(0,140,255,.85)']);g.fill();g.strokeStyle='#c7ccd8';g.lineWidth=1.6*u;g.stroke();
      const sx=Math.sin(f.t*2)*(ex+8*u);g.fillStyle='rgba(255,255,255,.6)';g.fillRect(sx-1.2*u,-5*u,2.4*u,9*u);}},
    {name:'Pixel Shades',d(g,u,ex,f){const p=3*u;g.fillStyle='#0b0b12';[[-ex-9*u,-4*u,ex*2+18*u,p],[-ex-9*u,-4*u+p,6*p,p],[ex-9*u,-4*u+p,6*p,p],[-ex-6*u,-4*u+2*p,4*p,p],[ex-6*u,-4*u+2*p,4*p,p]].forEach(r=>g.fillRect(...r));
      g.fillStyle='#fff';g.fillRect(-ex-6*u,-4*u+p,p,p);g.fillRect(ex-6*u,-4*u+p,p,p);}},
    {name:'Eye Patch',d(g,u,ex,f){LINE(g,[[-ex-20*u,-14*u],[ex+18*u,12*u]],'#1b1b22',1.6*u);E(g,-ex,0,9*u,8*u,'#1b1b22');E(g,-ex-2*u,-3*u,3*u,1.5*u,'rgba(255,255,255,.12)');}},
    {name:'Lashes',d(g,u,ex,f){[-1,1].forEach(s=>{for(let k=0;k<4;k++){const a=-Math.PI*(.62+k*.11)*1,x0=s*ex+Math.cos(a)*8*u*s,y0=Math.sin(a)*8*u;LINE(g,[[x0,y0],[x0+s*Math.cos(a)*5*u*0+s*(k-1.5)*1.6*u,y0-4.5*u]],'#1b1b22',1.4*u);}});}},
    {name:'Brows',d(g,u,ex,f){const b=Math.sin(f.t*.9)>.92?2*u:0;[-1,1].forEach(s=>{g.beginPath();g.moveTo(s*ex-s*7*u,-11*u-b);g.quadraticCurveTo(s*ex,-16*u-b,s*ex+s*7*u,-12*u-b);g.lineWidth=3.2*u;g.lineCap='round';g.strokeStyle='#3a2a1a';g.stroke();});}},
    {name:'Sleep Mask',d(g,u,ex,f){g.save();g.translate(0,-16*u);RR(g,-ex-11*u,-5*u,ex*2+22*u,10*u,5*u);g.fillStyle='#b06bff';g.fill();[-1,1].forEach(s=>{g.beginPath();g.arc(s*ex,-1*u,4*u,.2,Math.PI-.2);g.strokeStyle='#fff';g.lineWidth=1.2*u;g.stroke();});
      g.fillStyle='#e2b8ff';g.font='bold '+(4*u)+'px sans-serif';g.textAlign='center';g.fillText('z',0,1*u);g.restore();}},
    {name:'Disguise',d(g,u,ex,f){[-1,1].forEach(s=>lens(g,s*ex,8.5*u,'rgba(200,235,255,.12)','#1b1b22',2.6*u));bridge(g,ex,8.5*u,'#1b1b22',2.4*u);
      E(g,0,6*u,4*u,6*u,RG(g,-1*u,4*u,0,6*u,['#ffc0a0','#e88a6a']));g.beginPath();g.moveTo(-9*u,13*u);g.quadraticCurveTo(-4*u,9*u,0,12*u);g.quadraticCurveTo(4*u,9*u,9*u,13*u);g.quadraticCurveTo(4*u,16*u,0,14*u);g.quadraticCurveTo(-4*u,16*u,-9*u,13*u);g.fillStyle='#3a2a1a';g.fill();}},
    {name:'Bling Shades',d(g,u,ex,f){[-1,1].forEach(s=>{poly(g,[[s*ex-10*u,-5*u],[s*ex+10*u,-5*u],[s*ex+7*u,6*u],[s*ex-7*u,6*u]],'#14141e','#e8eaf2',1.8*u);for(let k=0;k<5;k++)C(g,s*ex-8*u+k*4*u,-5*u,1*u,'#fff');
      const tw=Math.max(0,Math.sin(f.t*5+s));if(tw>.6)star(g,s*ex+6*u,-6*u,3*u*tw,'#fff',4,.25);});LINE(g,[[-ex+10*u,-4*u],[ex-10*u,-4*u]],'#e8eaf2',1.8*u);}},
    {name:'Flower Specs',d(g,u,ex,f){[-1,1].forEach(s=>{for(let k=0;k<8;k++){const a=k/8*TAU;C(g,s*ex+Math.cos(a)*9*u,Math.sin(a)*9*u,3.6*u,k%2?'#ffd23f':'#ff7ac0');}lens(g,s*ex,7.5*u,'rgba(200,235,255,.2)');glint(g,s*ex,7.5*u);});bridge(g,ex,10*u,'#5fd16a',1.8*u);}},
    {name:'Rave Specs',d(g,u,ex,f){const hue=(f.t*60)%360;[-1,1].forEach(s=>{g.save();if(!f.lite){g.shadowColor='hsl('+hue+',100%,60%)';g.shadowBlur=6*u;}lens(g,s*ex,9*u,'rgba(255,255,255,.06)','hsl('+(hue+s*60)+',100%,62%)',2.4*u);g.restore();});bridge(g,ex,9*u,'hsl('+hue+',100%,62%)',1.8*u);}},
    {name:'Brass Goggles',d(g,u,ex,f){g.fillStyle='#5a3a1a';g.fillRect(-ex-24*u,-2.5*u,ex*2+48*u,5*u);[-1,1].forEach(s=>{C(g,s*ex,0,10.5*u,LG(g,s*ex-10*u,-10*u,s*ex+10*u,10*u,['#f5d58a','#b8862b','#6a4a12']));C(g,s*ex,0,7.5*u,RG(g,s*ex-2*u,-2*u,0,8*u,['rgba(160,255,200,.7)','rgba(20,90,70,.85)']));glint(g,s*ex,7.5*u);
      for(let k=0;k<6;k++){const a=k/6*TAU;C(g,s*ex+Math.cos(a)*9*u,Math.sin(a)*9*u,.8*u,'#fff2c0');}});}},
    {name:'Big Round Specs',d(g,u,ex,f){[-1,1].forEach(s=>{lens(g,s*ex,11.5*u,'rgba(200,235,255,.15)','#2a2a33',1.8*u);glint(g,s*ex,11.5*u);});bridge(g,ex,11.5*u,'#2a2a33',1.6*u);}},
    {name:'Rainbow Lenses',d(g,u,ex,f){[-1,1].forEach(s=>{C(g,s*ex,0,9.5*u,LG(g,s*ex,-9*u,s*ex,9*u,['rgba(255,80,120,.75)','rgba(255,210,60,.75)','rgba(80,230,140,.75)','rgba(80,160,255,.75)','rgba(180,100,255,.75)']));g.lineWidth=1.6*u;g.strokeStyle='#f5f5fa';g.beginPath();g.arc(s*ex,0,9.5*u,0,TAU);g.stroke();glint(g,s*ex,9.5*u);});bridge(g,ex,9*u,'#f5f5fa',1.6*u);}},
  ];

  // ───────────── SHOES (the duck-foot sticks become shoes: new colours + a pattern on top + bits around) ─────────────
  // spec: top/sole colours, pat (in: drawn clipped to the top face), ex (out: wheels, blades, flames…). P(x,z,h) maps a
  // point on the foot (x across, z along it, h = height above the top face) to the screen. Foot: x ±10.5u, z -18…19.5u.
  const SHOES=[
    {name:'Classic Sneaks',top:'#f5f5fa',sole:'#e53935',pat:'laces',pc:'#e53935'},
    {name:'High-Tops',top:'#2a2a33',sole:'#f5f5fa',pat:'toecap',pc:'#f5f5fa'},
    {name:'Roller Skates',top:'#ff7ac0',sole:'#ffffff',pat:'laces',pc:'#fff',ex:'wheels',xc:'#ffd23f'},
    {name:'Rain Boots',top:'#ffd23f',sole:'#2a2a33',pat:'gloss'},
    {name:'Ice Skates',top:'#f5f5fa',sole:'#c7ccd8',pat:'laces',pc:'#5ad1ff',ex:'blade'},
    {name:'Flip Flops',top:'#40e0d0',sole:'#19c3b0',pat:'strap',pc:'#ff5fa2'},
    {name:'Bunny Slippers',top:'#ffe0ef',sole:'#ffc0dc',pat:'bunny'},
    {name:'Clown Shoes',top:'#e53935',sole:'#ffd23f',pat:'gloss',ex:'pom',xc:'#ffd23f'},
    {name:'Rocket Boots',top:'#c7ccd8',sole:'#5a5a66',pat:'stripe',pc:'#e53935',ex:'flame'},
    {name:'Spring Shoes',top:'#5fe07a',sole:'#2e7d5b',pat:'dots',pc:'#ffffff',ex:'spring'},
    {name:'Gold Kicks',top:'#ffd23f',sole:'#8a6a10',pat:'shine',pc:'#fff6c0'},
    {name:'Flame Sneaks',top:'#2a2a33',sole:'#e53935',pat:'flames',pc:'#ff8a3d'},
    {name:'Lightning Kicks',top:'#2f80ff',sole:'#f5f5fa',pat:'bolt',pc:'#ffe14d'},
    {name:'Polka Dots',top:'#ff5a5a',sole:'#f5f5fa',pat:'dots',pc:'#ffffff'},
    {name:'Checkerboard',top:'#f5f5fa',sole:'#2a2a33',pat:'checker',pc:'#2a2a33'},
    {name:'Galaxy Kicks',top:'#2a1a5a',sole:'#0b0826',pat:'stars',pc:'#ffffff'},
    {name:'Glitter Pinks',top:'#ff5fb8',sole:'#c42a7c',pat:'glitter',pc:'#ffffff'},
    {name:'Moon Boots',top:'#e8eaf2',sole:'#8a90a8',pat:'puffy',pc:'#c7ccd8'},
    {name:'Rainbow Stripes',top:'#ffffff',sole:'#9b5cff',pat:'rainbow'},
    {name:'Neon Glow',top:'#0b0b12',sole:'#3fffb0',pat:'neon',pc:'#3fffb0',ex:'glow',xc:'#3fffb0'},
    {name:'Winged Sneaks',top:'#f5f5fa',sole:'#5ad1ff',pat:'laces',pc:'#5ad1ff',ex:'wings'},
    {name:'Hover Pads',top:'#5a5a66',sole:'#2a2a33',pat:'stripe',pc:'#3fe6ff',ex:'hover',xc:'#3fe6ff'},
    {name:'Camo Boots',top:'#6b8e4e',sole:'#3a4a2a',pat:'camo',pc:'#3f5a2e'},
    {name:'Cowboy Boots',top:'#a06a30',sole:'#4a2a10',pat:'stitch',pc:'#ffd23f'},
    {name:'Candy Stripes',top:'#ffffff',sole:'#e53935',pat:'candy',pc:'#e53935'},
  ];
  const shoeCache={};
  function shoeSpec(A,B){if(!A||A.s==null||!SHOES[A.s])return null;const S=SHOES[A.s],k=A.s;
    if(!shoeCache[k]){shoeCache[k]=Object.assign({},S,{foot:[lt(S.top,.22),S.top,S.sole]});}
    const sp=shoeCache[k];return{spec:sp,B:Object.assign({},B,{foot:sp.foot}),...sp};}
  function shoe(g,S,layer,P,u,t,lite,side,TH){
    const pt=(x,z,h)=>P(x*u,z*u,(h||0)*u),dot=(x,z,r,c,h)=>{const q=pt(x,z,h);C(g,q[0],q[1],r*u,c);},ln=(a,c,w)=>LINE(g,a.map(([x,z,h])=>pt(x,z,h)),c,w*u);
    if(layer==='in'){
      switch(S.pat){
        case'laces':for(let k=0;k<3;k++){const z=2-k*4.5;ln([[-4,z],[4,z-1.5]],S.pc,1.4);ln([[4,z],[-4,z-1.5]],S.pc,1.4);}ln([[-10,14],[10,14]],dk(S.top,.12),1.2);break;
        case'toecap':{g.beginPath();for(let i=0;i<=10;i++){const a=i/10*Math.PI,q=pt(Math.cos(a)*10.5,13+6.5*Math.sin(a));i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);}g.closePath();g.fillStyle=S.pc;g.fill();ln([[-9,-8],[9,4]],S.pc,2.2);break;}
        case'gloss':{const q=pt(-4,-4),q2=pt(-4,10);LINE(g,[q,q2],'rgba(255,255,255,.55)',2.4*u);break;}
        case'strap':ln([[-8,8],[0,2],[8,8]],S.pc,2.6);dot(0,2,1.6,lt(S.pc,.4));break;
        case'bunny':[-1,1].forEach(s=>{const q=pt(s*4,15,4);E(g,q[0],q[1]-3*u,2.2*u,5*u,'#fff');E(g,q[0],q[1]-3*u,1.1*u,3.5*u,'#ff9ccf');});dot(-3,9,1.1,'#1b1b22');dot(3,9,1.1,'#1b1b22');dot(0,12,1.3,'#ff7ac0');break;
        case'stripe':ln([[-10,-6],[10,6]],S.pc,2.4);ln([[-10,-1],[10,11]],S.pc,1.4);break;
        case'dots':[[-5,-10],[4,-6],[-3,0],[6,4],[-6,8],[2,12],[0,-14]].forEach(([x,z])=>dot(x,z,1.6,S.pc));break;
        case'shine':ln([[-6,-10],[-6,12]],'rgba(255,255,255,.6)',2.2);ln([[-3,-12],[-3,-4]],'rgba(255,255,255,.4)',1.2);break;
        case'flames':for(let k=-1;k<=1;k++){const x=k*6;g.beginPath();const a=pt(x-3,18),b=pt(x,4),c=pt(x+3,18);g.moveTo(a[0],a[1]);g.quadraticCurveTo(b[0]-2*u,b[1],b[0],b[1]);g.quadraticCurveTo(b[0]+2*u,b[1],c[0],c[1]);g.fillStyle=k?S.pc:'#ffe14d';g.fill();}break;
        case'bolt':{const p=[[-2,-12],[3,-2],[-1,0],[3,12],[-3,1],[1,-1]].map(([x,z])=>pt(x,z));poly(g,p,S.pc);break;}
        case'checker':for(let x=-12;x<12;x+=4)for(let z=-20;z<22;z+=4)if(((x+z)/4)%2===0){const a=pt(x,z),b=pt(x+4,z),c=pt(x+4,z+4),d=pt(x,z+4);poly(g,[a,b,c,d],S.pc);}break;
        case'stars':[[-5,-10,1.4],[4,-4,1],[-2,3,1.6],[6,10,1.1],[-6,12,.9],[1,-15,1]].forEach(([x,z,r])=>{const q=pt(x,z);star(g,q[0],q[1],r*1.6*u,S.pc,4,.35);});{const q=pt(0,2);C(g,q[0],q[1],7*u,'rgba(150,90,255,.25)');}break;
        case'glitter':for(let i=0;i<22;i++){const x=((i*37)%19)-9,z=((i*53)%36)-17,tw=.4+.6*Math.abs(Math.sin(t*3+i));dot(x,z,.5+.5*tw,'rgba(255,255,255,'+tw+')');}break;
        case'puffy':for(let z=-14;z<=16;z+=6)ln([[-10,z],[10,z]],S.pc,1.2);break;
        case'rainbow':['#ff5a5a','#ff9a3d','#ffd23f','#5fd16a','#4fb3ff','#9b5cff'].forEach((c,i)=>ln([[-11,-16+i*6],[11,-12+i*6]],c,3.2));break;
        case'neon':{const a=.6+.4*Math.sin(t*4);ln([[-9,-12],[-9,12],[0,18],[9,12],[9,-12]],'rgba(63,255,176,'+a+')',1.4);break;}
        case'camo':[[-6,-10,4,'#3f5a2e'],[4,-4,3.5,'#8a7a4a'],[-3,4,3.2,'#2e4020'],[6,10,3,'#3f5a2e'],[-6,13,2.6,'#8a7a4a'],[2,-14,3,'#2e4020']].forEach(([x,z,r,c])=>{const q=pt(x,z);E(g,q[0],q[1],r*u*1.2,r*u*.8,c,.5);});break;
        case'stitch':g.setLineDash([1.2*u,1.2*u]);ln([[-8,-14],[-8,10],[0,16],[8,10],[8,-14]],S.pc,.8);g.setLineDash([]);{const q=pt(0,6);star(g,q[0],q[1],3*u,S.pc);}break;
        case'candy':for(let z=-24;z<26;z+=6)ln([[-12,z],[12,z+8]],S.pc,2.6);break;
      }
      return;
    }
    // out: bits that hang off the shoe (under the sole or behind it)
    const th=(TH||4*u)/u;
    switch(S.ex){
      case'wheels':[-12,12].forEach(z=>{const q=pt(0,z,-th-2.4);C(g,q[0],q[1],3.2*u,S.xc);C(g,q[0],q[1],1.2*u,dk(S.xc,.4));});break;
      case'blade':{const a=pt(0,-16,-th-3),b=pt(0,20,-th-3);LINE(g,[a,b],'#e8eaf2',1.8*u);LINE(g,[pt(0,-10,-th),pt(0,-10,-th-3)],'#c7ccd8',1.4*u);LINE(g,[pt(0,12,-th),pt(0,12,-th-3)],'#c7ccd8',1.4*u);break;}
      case'pom':{const q=pt(0,17,1.5);C(g,q[0],q[1],3.6*u,RG(g,q[0]-u,q[1]-u,0,4*u,['#fff6b0',S.xc,dk(S.xc,.25)]));break;}
      case'flame':if(!lite||true){const q=pt(0,-17,-th*.5),f=1+.25*Math.sin(t*20+side);g.globalAlpha=.85;E(g,q[0],q[1]+4*u*f,3*u,6*u*f,'#ff8a3d');E(g,q[0],q[1]+3*u*f,1.7*u,3.6*u*f,'#ffe14d');g.globalAlpha=1;}break;
      case'spring':{const top=pt(0,2,-th),bot=pt(0,2,-th-9);g.strokeStyle='#c7ccd8';g.lineWidth=1.3*u;g.beginPath();for(let i=0;i<=12;i++){const k=i/12,x=top[0]+(i%2?4:-4)*u,y=top[1]+(bot[1]-top[1])*k;i?g.lineTo(x,y):g.moveTo(top[0],top[1]);}g.stroke();E(g,bot[0],bot[1],5*u,1.6*u,'#8a90a8');break;}
      case'glow':{const q=pt(0,1,-th-1);g.globalAlpha=.35+.15*Math.sin(t*4);E(g,q[0],q[1],13*u,4*u,S.xc);g.globalAlpha=1;break;}
      case'wings':{const q=pt(side*10.5,-6,2),fl=Math.sin(t*10+side)*.3;g.save();g.translate(q[0],q[1]);g.rotate(side*(-.5+fl));g.scale(side,1);
        for(let k=0;k<3;k++)E(g,4*u+k*2.4*u,-k*1.6*u,4.5*u-k*.8*u,1.8*u,k%2?'#e8f4ff':'#ffffff',-.5);g.restore();break;}
      case'hover':{const q=pt(0,1,-th-3);g.globalAlpha=.6+.3*Math.sin(t*6+side);E(g,q[0],q[1],10*u,2.6*u,S.xc);g.globalAlpha=.25;E(g,q[0],q[1]+2*u,7*u,1.5*u,S.xc);g.globalAlpha=1;break;}
    }
  }

  // ───────────── PLATFORMS (Best Buddy page only; drawn under the buddy, top surface at y = 41u) ─────────────
  const Y=41;
  function slab(g,u,w,h,top,side,y){y=(y||Y)*u;g.fillStyle=LG(g,-w*u,0,w*u,0,[dk(side,.1),side,dk(side,.35)]);g.beginPath();g.ellipse(0,y,w*u,w*.26*u,0,0,Math.PI);g.lineTo(-w*u,y);g.ellipse(0,y+h*u,w*u,w*.26*u,0,Math.PI,0,true);g.closePath();g.fill();
    E(g,0,y+h*u,w*u,w*.26*u,dk(side,.3));g.fillRect(-w*u,y,w*2*u,h*u);E(g,0,y,w*u,w*.26*u,top);}
  const PLAT=[
    {name:'Wooden Crate',d(g,u,t){const y=Y*u;poly(g,[[-30*u,y-6*u],[30*u,y-6*u],[30*u,y+20*u],[-30*u,y+20*u]],LG(g,0,y,0,y+20*u,['#c08a50','#9a6a38']));poly(g,[[-30*u,y-6*u],[-24*u,y-12*u],[36*u,y-12*u],[30*u,y-6*u]],'#d6a468');poly(g,[[30*u,y-6*u],[36*u,y-12*u],[36*u,y+14*u],[30*u,y+20*u]],'#7a5228');
      [[-30,-6,30,20],[-30,20,30,-6]].forEach(([a,b,c,d])=>LINE(g,[[a*u,y+b*u],[c*u,y+d*u]],'rgba(80,50,20,.4)',2*u));g.strokeStyle='rgba(80,50,20,.5)';g.lineWidth=1.2*u;g.strokeRect(-30*u,y-6*u,60*u,26*u);}},
    {name:'Fluffy Cloud',d(g,u,t){const y=Y*u+Math.sin(t*1.2)*1.5*u;[[-22,6,11],[-8,9,13],[10,8,13],[24,5,10],[0,2,14],[-16,0,10],[16,0,10]].forEach(([x,yy,r])=>C(g,x*u,y+yy*u,r*u,RG(g,(x-4)*u,y+(yy-5)*u,0,r*u*1.3,['#ffffff','#eef3ff','#c8d4f0'])));}},
    {name:'Moon Rock',d(g,u,t){const y=Y*u;g.beginPath();g.moveTo(-34*u,y);g.quadraticCurveTo(-36*u,y+18*u,-10*u,y+20*u);g.quadraticCurveTo(20*u,y+24*u,34*u,y+4*u);g.quadraticCurveTo(30*u,y-8*u,0,y-8*u);g.quadraticCurveTo(-30*u,y-8*u,-34*u,y);g.fillStyle=RG(g,-10*u,y-4*u,2*u,40*u,['#c8ccd8','#8a90a8','#4a4e60']);g.fill();
      [[-18,4,4],[8,10,5],[20,0,3],[-4,-2,2.5]].forEach(([x,yy,r])=>{E(g,x*u,y+yy*u,r*u,r*.55*u,'rgba(40,40,60,.45)');E(g,x*u,y+(yy-.6)*u,r*.8*u,r*.4*u,'rgba(255,255,255,.12)');});}},
    {name:'Snare Drum',d(g,u,t){slab(g,u,30,16,'#f5f5fa','#e53935');const y=Y*u;for(let i=-3;i<=3;i++){const x=i*9*u;LINE(g,[[x,y+5*u],[x,y+16*u]],'#e0e4f0',1.4*u);}g.lineWidth=2*u;g.strokeStyle='#c7ccd8';E(g,0,y,30*u,7.8*u);g.stroke();E(g,-6*u,y-1*u,10*u,2*u,'rgba(255,255,255,.6)');}},
    {name:'Turntable',d(g,u,t){const y=Y*u;RR(g,-36*u,y-8*u,72*u,22*u,4*u);g.fillStyle=LG(g,0,y-8*u,0,y+14*u,['#3a3a44','#1b1b22']);g.fill();E(g,0,y,28*u,7.3*u,'#0b0b12');
      for(let r=8;r<27;r+=4){g.strokeStyle='rgba(255,255,255,.06)';g.lineWidth=.8*u;E(g,0,y,r*u,r*.26*u);g.stroke();}const a=t*3.5;E(g,Math.cos(a)*16*u,y+Math.sin(a)*4*u,4*u,1.2*u,'rgba(255,255,255,.12)');E(g,0,y,7*u,1.8*u,'#e53935');}},
    {name:'Comfy Cushion',d(g,u,t){const y=Y*u;RR(g,-34*u,y-6*u,68*u,18*u,9*u);g.fillStyle=LG(g,0,y-6*u,0,y+12*u,['#c8a2ff','#9b5cff','#6a3ad0']);g.fill();[[-34,-6],[34,-6],[-34,12],[34,12]].forEach(([x,yy])=>C(g,x*u,y+yy*u,3*u,'#ffd23f'));C(g,0,y+3*u,2.2*u,'#6a3ad0');shine(g,-14*u,y-2*u,12*u,2*u,.25);}},
    {name:'Mini Planet',d(g,u,t){const y=Y*u+16*u;C(g,0,y,24*u,RG(g,-8*u,y-10*u,2*u,26*u,['#9fe0ff','#4fb3ff','#1a4a8a']));g.save();g.beginPath();g.arc(0,y,24*u,0,TAU);g.clip();E(g,-8*u,y-4*u,9*u,4*u,'#5fd16a',.3);E(g,10*u,y+8*u,7*u,3*u,'#5fd16a',-.2);g.restore();
      g.lineWidth=3*u;g.strokeStyle='rgba(255,210,120,.85)';g.beginPath();g.ellipse(0,y,38*u,8*u,-.12,.1,Math.PI-.1);g.stroke();}},
    {name:'UFO Saucer',d(g,u,t){const y=Y*u+Math.sin(t*2)*1.5*u;E(g,0,y+6*u,38*u,9*u,LG(g,0,y,0,y+14*u,['#e0e4f0','#8a90a8','#5a5e70']));E(g,0,y,30*u,7.8*u,'#c7ccd8');for(let i=0;i<8;i++){const a=i/8*TAU,x=Math.cos(a)*34*u,yy=y+6*u+Math.sin(a)*7*u;if(Math.sin(a)>-.2)C(g,x,yy,1.8*u,(Math.floor(t*5)+i)%3?'#3fe6ff':'#ffe14d');}}},
    {name:'Lily Pad',d(g,u,t){const y=Y*u;E(g,0,y+4*u,44*u,11*u,'rgba(60,150,255,.35)');g.beginPath();g.ellipse(0,y,32*u,8.4*u,0,.25,TAU-.1);g.lineTo(0,y);g.closePath();g.fillStyle=RG(g,-8*u,y-2*u,1*u,32*u,['#9ccc65','#43a047','#2e7d32']);g.fill();
      for(let i=0;i<6;i++){const a=i/6*TAU+.4;LINE(g,[[0,y],[Math.cos(a)*28*u,y+Math.sin(a)*7*u]],'rgba(30,90,30,.35)',1*u);}C(g,24*u,y+2*u,4*u,'#ff9ccf');}},
    {name:'Skateboard',d(g,u,t){const y=Y*u;[-22,22].forEach(x=>{C(g,x*u,y+9*u,4*u,'#ffd23f');C(g,x*u,y+9*u,1.6*u,'#c9a227');});RR(g,-38*u,y-2*u,76*u,8*u,4*u);g.fillStyle=LG(g,0,y-2*u,0,y+6*u,['#ff5a5a','#c42a2a']);g.fill();g.fillStyle='#2a2a33';g.fillRect(-34*u,y-3*u,68*u,2*u);star(g,0,y+2.5*u,3*u,'#ffd23f');}},
    {name:'Ice Block',d(g,u,t){const y=Y*u;poly(g,[[-30*u,y-6*u],[30*u,y-6*u],[30*u,y+18*u],[-30*u,y+18*u]],'rgba(170,230,255,.7)');poly(g,[[-30*u,y-6*u],[-24*u,y-12*u],[36*u,y-12*u],[30*u,y-6*u]],'rgba(225,248,255,.9)');poly(g,[[30*u,y-6*u],[36*u,y-12*u],[36*u,y+12*u],[30*u,y+18*u]],'rgba(120,190,240,.75)');
      LINE(g,[[-24*u,y],[-10*u,y+12*u]],'rgba(255,255,255,.7)',1.5*u);LINE(g,[[-18*u,y-2*u],[-14*u,y+2*u]],'rgba(255,255,255,.6)',1*u);}},
    {name:'Birthday Cake',d(g,u,t){slab(g,u,30,18,'#fff0f6','#ff9ccf');const y=Y*u;for(let i=-4;i<=4;i++){E(g,i*7*u,y+3*u+Math.abs(i)*.4*u,2.6*u,3.6*u,'#fff0f6');}
      [-14,0,14].forEach((x,i)=>{g.fillStyle=['#4fb3ff','#ffd23f','#5fe07a'][i];g.fillRect(x*u-1*u,y-12*u,2*u,9*u);E(g,x*u,y-14*u+Math.sin(t*9+i)*.5*u,1.5*u,2.6*u,'#ffb340');});}},
    {name:'Speaker Box',d(g,u,t){const y=Y*u,k=Math.max(0,Math.sin(t*Math.PI*2*1.6)),p=1+k*.08;RR(g,-26*u,y-6*u,52*u,30*u,4*u);g.fillStyle=LG(g,0,y-6*u,0,y+24*u,['#3a3a44','#1b1b22']);g.fill();
      C(g,0,y+11*u,10*u*p,'#0b0b12');C(g,0,y+11*u,6*u*p,'#2a2a33');C(g,0,y+11*u,2.4*u,'#5a5a66');E(g,0,y-6*u,26*u,6.7*u,'#4a4a55');}},
    {name:'Winner Podium',d(g,u,t){slab(g,u,26,22,'#fff6c0','#ffd23f');const y=Y*u;g.fillStyle='#8a6a10';g.font='bold '+(13*u)+'px "Bebas Neue",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('1',0,y+15*u);star(g,-14*u,y+12*u,2.4*u,'#fff6c0');star(g,14*u,y+12*u,2.4*u,'#fff6c0');}},
    {name:'Hoverboard',d(g,u,t){const y=Y*u+Math.sin(t*2.4)*1.6*u;g.globalAlpha=.4+.2*Math.sin(t*6);E(g,0,y+10*u,30*u,4*u,'#3fe6ff');g.globalAlpha=1;RR(g,-36*u,y-2*u,72*u,8*u,4*u);g.fillStyle=LG(g,-36*u,0,36*u,0,['#ff4fa8','#b06bff','#3fe6ff']);g.fill();
      LINE(g,[[-30*u,y+2*u],[30*u,y+2*u]],'rgba(255,255,255,.4)',1.2*u);}},
    {name:'Crystal Cluster',d(g,u,t){const y=Y*u;E(g,0,y+8*u,32*u,7*u,'#3a2a5a');[[-20,14,-.3,'#b06bff'],[-8,22,-.1,'#e2b8ff'],[6,18,.15,'#9b5cff'],[18,12,.35,'#c8a2ff']].forEach(([x,h,a,c])=>{g.save();g.translate(x*u,y+8*u);g.rotate(a);
      poly(g,[[-4*u,0],[-4*u,-h*u+5*u],[0,-h*u],[4*u,-h*u+5*u],[4*u,0]],LG(g,-4*u,0,4*u,0,[lt(c,.3),c,dk(c,.25)]));LINE(g,[[-1*u,-2*u],[-1*u,-h*u+5*u]],'rgba(255,255,255,.5)',1*u);g.restore();});}},
    {name:'Giant Mushroom',d(g,u,t){const y=Y*u;g.fillStyle=LG(g,-8*u,0,8*u,0,['#fff6e0','#e6d2a8']);g.fillRect(-8*u,y,16*u,22*u);E(g,0,y+22*u,9*u,2.4*u,'#c8b080');g.beginPath();g.ellipse(0,y,34*u,8.8*u,0,0,Math.PI);g.ellipse(0,y,34*u,6*u,0,Math.PI,0);g.fillStyle='#e53935';g.fill();
      E(g,0,y,32*u,7*u,'#f0d8b0');[[-22,3],[18,4],[0,6]].forEach(([x,yy])=>E(g,x*u,y+yy*u,3*u,1.4*u,'#fff'));}},
    {name:'Coin Stack',d(g,u,t){for(let i=4;i>=0;i--){const y=(Y+i*5)*u;E(g,0,y+3*u,28*u,7.3*u,'#a07a10');g.fillStyle='#c9a227';g.fillRect(-28*u,y,56*u,3*u);E(g,0,y,28*u,7.3*u,i?'#e0b830':LG(g,-28*u,0,28*u,0,['#fff3a0','#ffd23f','#c9a227']));}
      star(g,0,Y*u,5*u,'#fff3a0');}},
    {name:'Piano Keys',d(g,u,t){const y=Y*u;RR(g,-38*u,y-4*u,76*u,18*u,3*u);g.fillStyle='#1b1b22';g.fill();for(let i=0;i<10;i++){const x=-36*u+i*7.2*u,lit=Math.floor(t*4)%10===i;g.fillStyle=lit?'#ffe14d':'#f5f5fa';g.fillRect(x,y-2*u,6.4*u,14*u);}
      [0,1,3,4,5,7,8].forEach(i=>{g.fillStyle='#1b1b22';g.fillRect(-36*u+i*7.2*u+4.4*u,y-2*u,4*u,8*u);});}},
    {name:'Gift Box',d(g,u,t){const y=Y*u;poly(g,[[-26*u,y-4*u],[26*u,y-4*u],[26*u,y+20*u],[-26*u,y+20*u]],LG(g,0,y,0,y+20*u,['#4fb3ff','#2f80ff']));poly(g,[[-28*u,y-10*u],[28*u,y-10*u],[28*u,y-2*u],[-28*u,y-2*u]],'#7fc6ff');
      g.fillStyle='#ffd23f';g.fillRect(-3*u,y-10*u,6*u,30*u);[-1,1].forEach(s=>{E(g,s*8*u,y-12*u,8*u,4*u,'#ffd23f',s*.4);});}},
    {name:'Rainbow Disc',d(g,u,t){const y=Y*u;['#9b5cff','#4fb3ff','#5fd16a','#ffd23f','#ff9a3d','#ff5a5a'].forEach((c,i)=>{const w=36-i*5;E(g,0,y+6*u-i*1.2*u,w*u,w*.26*u,c);});E(g,0,y-1*u,8*u,2*u,'rgba(255,255,255,.6)');}},
    {name:'Disco Floor',d(g,u,t){const y=Y*u,cols=['#ff4fa8','#3fe6ff','#ffe14d','#9dff3f','#b06bff'];for(let r=0;r<3;r++)for(let c=0;c<6;c++){const k=(r*7+c*3+Math.floor(t*3))%cols.length,w=60/6;
      const x0=(-30+c*w)*u,x1=x0+w*u,y0=y-7*u+r*5*u,y1=y0+5*u,sk=(r*5-7)*.2*u;poly(g,[[x0-sk,y0],[x1-sk,y0],[x1-sk*1.3,y1],[x0-sk*1.3,y1]],cols[k]);}
      g.fillStyle='#1b1b22';g.fillRect(-32*u,y+8*u,64*u,6*u);}},
    {name:'Donut',d(g,u,t){const y=Y*u+6*u;E(g,0,y,34*u,12*u,RG(g,0,y,4*u,34*u,['#c08a50','#e0a868','#a06a30']));g.beginPath();g.ellipse(0,y-2*u,30*u,9*u,0,0,TAU);g.fillStyle='#ff9ccf';g.fill();E(g,0,y-1*u,9*u,3*u,'#1b1b22');
      [[-20,-4,'#ffd23f'],[-8,-8,'#3fe6ff'],[12,-7,'#5fe07a'],[22,-2,'#fff'],[4,4,'#ffd23f'],[-16,4,'#b06bff']].forEach(([x,yy,c],i)=>{g.save();g.translate(x*u,y+yy*u);g.rotate(i);g.fillStyle=c;g.fillRect(-2*u,-.6*u,4*u,1.2*u);g.restore();});}},
    {name:'Flag Asteroid',d(g,u,t){const y=Y*u;g.beginPath();g.moveTo(-32*u,y+2*u);g.lineTo(-24*u,y-6*u);g.lineTo(10*u,y-8*u);g.lineTo(32*u,y);g.lineTo(26*u,y+16*u);g.lineTo(-10*u,y+22*u);g.closePath();g.fillStyle=RG(g,-8*u,y-2*u,2*u,36*u,['#b89a7a','#8a6a50','#4a3a2a']);g.fill();
      LINE(g,[[24*u,y-4*u],[24*u,y-34*u]],'#c7ccd8',1.4*u);const w=Math.sin(t*4)*1.5*u;g.beginPath();g.moveTo(24*u,y-34*u);g.quadraticCurveTo(30*u,y-32*u+w,36*u,y-34*u);g.lineTo(36*u,y-26*u);g.quadraticCurveTo(30*u,y-24*u+w,24*u,y-26*u);g.fillStyle='#ff4fa8';g.fill();}},
    {name:'Bubble Seat',d(g,u,t){const y=Y*u+12*u+Math.sin(t*1.6)*1.5*u;C(g,0,y,22*u,RG(g,-6*u,y-8*u,2*u,24*u,['rgba(255,255,255,.35)','rgba(180,220,255,.15)','rgba(200,140,255,.35)']));g.lineWidth=1.2*u;g.strokeStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(0,y,22*u,0,TAU);g.stroke();E(g,-8*u,y-10*u,5*u,2.6*u,'rgba(255,255,255,.7)',-.5);}},
  ];

  // ───────────── attach: head piece + eyewear onto a buddy (called from drawModel / drawFloat) ─────────────
  function attach(c){
    const{g,u,R,CY,rot,A,put,t}=c;
    if(A.h!=null&&HEAD[A.h]){const H=HEAD[A.h],up=rot(0,-1,0),fw=rot(0,0,1),tp=rot(0,-R*.9,0),L=Math.hypot(up.x,up.y),Lc=Math.max(L,1e-3);
      const Xv=[-up.y/Lc,up.x/Lc],fx=fw.x*Xv[0]+fw.y*Xv[1];
      if(H.front){put(R*4,true,()=>{g.save();g.transform(1,0,0,1,tp.x,CY+tp.y);H.d(g,u,{fx,fz:fw.z,t,lite:c.lite});g.restore();});}
      else put(tp.z+R,up.z>-.4,()=>{g.save();g.transform(Xv[0],Xv[1],-up.x,-up.y,tp.x,CY+tp.y);H.d(g,u,{fx,fz:fw.z,t,lite:c.lite});g.restore();});}
    if(A.e!=null&&EYES[A.e]){const fw=rot(0,0,1);if(fw.z>-.05){const ey=c.eyeY,zc=Math.sqrt(Math.max(0,R*R-ey*ey))+u*5,p=rot(0,ey,zc),xv=rot(1,0,0),yv=rot(0,1,0);
      put(R*3,true,()=>{g.save();g.globalAlpha=Math.min(1,(fw.z+.05)*4);g.transform(xv.x,xv.y,yv.x,yv.y,p.x,CY+p.y);EYES[A.e].d(g,u,c.eyeX,{t,lite:c.lite});g.restore();});}}
  }
  function platform(g,A,u,t,dy,layer){if(!A||A.p==null||!PLAT[A.p])return;g.save();g.translate(0,dy||0);PLAT[A.p].d(g,u,t);g.restore();}

  // ───────────── icons for the Accessorize picker ─────────────
  const icoCache={};
  function icon(cat,i,px,look){
    const dpr=Math.min(2,window.devicePixelRatio||1),key=cat+i+'_'+px+'_'+(look?look.key:'');
    const cv=document.createElement('canvas');cv.width=px*dpr;cv.height=px*dpr;cv.style.width=px+'px';cv.style.height=px+'px';const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    if(icoCache[key]){g.setTransform(1,0,0,1,0,0);g.drawImage(icoCache[key],0,0);return cv;}
    const u=px/100,t=1.2;
    if(cat==='h'){g.translate(px/2,px*.66);g.scale(1.45,1.45);HEAD[i].d(g,u,{fx:0,fz:1,t,lite:true});}
    else if(cat==='e'){g.translate(px/2,px/2);g.scale(1.35,1.35);EYES[i].d(g,u,12*u,{t,lite:true});}
    else if(cat==='p'){g.translate(px/2,px*.1);g.scale(1.05,1.05);PLAT[i].d(g,u,t);}
    else if(cat==='s'){const S=SHOES[i],B={foot:[lt(S.top,.22),S.top,S.sole]};g.translate(px/2,px*.5);
      const P=(x,z,h)=>[x*.95+z*.55,z*.38-(h||0)-x*.1];   // a 3/4 view of one foot
      const pts=[];const hw=5.5,fw=10.5;for(let k=0;k<=6;k++){const f=Math.PI+k/6*Math.PI;pts.push([hw*Math.cos(f),-13+hw*Math.sin(f)*.8]);}pts.push([fw*.62,1]);for(let k=0;k<=10;k++){const f=k/10*Math.PI;pts.push([fw*Math.cos(f),13+6.5*Math.sin(f)]);}pts.push([-fw*.62,1]);
      const sc=u*1.9,path=dy=>{g.beginPath();pts.forEach(([x,z],k)=>{const q=P(x*sc,z*sc);k?g.lineTo(q[0],q[1]+dy):g.moveTo(q[0],q[1]+dy);});g.closePath();};
      g.fillStyle=B.foot[2];for(let k=6;k>=1;k--){path(k*sc*.7);g.fill();}g.fillStyle=LG(g,0,-10*sc,0,10*sc,[B.foot[0],B.foot[1]]);path(0);g.fill();
      const map=(x,z,h)=>P(x*1.9,z*1.9,h*1.9);g.save();path(0);g.clip();shoe(g,S,'in',map,u,t,true,1);g.restore();shoe(g,S,'out',map,u,t,true,1,4.2*sc);
      g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=1;path(0);g.stroke();}
    const c2=document.createElement('canvas');c2.width=cv.width;c2.height=cv.height;c2.getContext('2d').drawImage(cv,0,0);icoCache[key]=c2;
    return cv;
  }

  window.buddyAcc={HEAD,EYES,SHOES,PLAT,attach,shoe,shoeSpec,platform,icon,
    CATS:[{k:'h',name:'HEAD',list:HEAD},{k:'e',name:'EYES',list:EYES},{k:'s',name:'SHOES',list:SHOES},{k:'p',name:'STAND',list:PLAT}]};
})();
