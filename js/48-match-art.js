// ── Matching-game card art ──
// Space & science pictures redrawn in the minigame style (bright core → dark edge gradients, white hotspot,
// ink outlines, soft glow), plus the player's own alien buddies. Card patterns are ids:
//   'i:<icon>'  one of MATCH_ICONS below        'b:<n>'  alien buddy #n from the bunker
// drawMatchFace(canvas, pattern) paints a card face sized to the canvas.
(function(){
  const INK='#1a0a20',TAU=Math.PI*2;
  const rg=(g,x,y,r,c)=>{const k=g.createRadialGradient(x-r*.35,y-r*.4,r*.06,x,y,r);k.addColorStop(0,c[0]);k.addColorStop(.5,c[1]);k.addColorStop(1,c[2]);return k;};
  const lg=(g,x0,y0,x1,y1,c)=>{const k=g.createLinearGradient(x0,y0,x1,y1);c.forEach((v,i)=>k.addColorStop(i/(c.length-1),v));return k;};
  function ink(g,w){g.strokeStyle=INK;g.lineWidth=w||3.2;g.lineJoin='round';g.lineCap='round';g.stroke();}
  function glow(g,x,y,r,col,a){const k=g.createRadialGradient(x,y,r*.2,x,y,r);k.addColorStop(0,col.replace(')',','+(a||.45)+')').replace('rgb','rgba'));k.addColorStop(1,col.replace(')',',0)').replace('rgb','rgba'));g.fillStyle=k;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
  function shine(g,x,y,r){g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.ellipse(x,y,r,r*.62,-.6,0,TAU);g.fill();}
  function ball(g,x,y,r,c){g.fillStyle=rg(g,x,y,r,c);g.beginPath();g.arc(x,y,r,0,TAU);g.fill();ink(g);shine(g,x-r*.38,y-r*.42,r*.2);}
  function star(g,x,y,R,r,n,rot){g.beginPath();for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n,d=i%2?r:R;g.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}g.closePath();}
  // a curved ribbon that tapers from width w at a to a point at c (through b); cols are stacked outside → in
  function ribbon(g,a,b,c,w,cols,prof){prof=prof||(t=>Math.pow(1-t,.8));
    const pt=t=>{const u=1-t;return[u*u*a[0]+2*u*t*b[0]+t*t*c[0],u*u*a[1]+2*u*t*b[1]+t*t*c[1]];};
    cols.forEach((col,ci)=>{const ww=w*(1-ci/cols.length)*.5,L=[],R=[];
      for(let i=0;i<=20;i++){const t=i/20,p=pt(t),q=pt(Math.min(1,t+.01)),o=pt(Math.max(0,t-.01)),dx=q[0]-o[0],dy=q[1]-o[1],d=Math.hypot(dx,dy)||1,k=ww*prof(t);
        L.push([p[0]-dy/d*k,p[1]+dx/d*k]);R.push([p[0]+dy/d*k,p[1]-dx/d*k]);}
      g.beginPath();L.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));R.reverse().forEach(([x,y])=>g.lineTo(x,y));g.closePath();g.fillStyle=col;g.fill();if(!ci)ink(g,3);});}
  function rr(g,x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);}

  const ICONS={
    rocket(g){glow(g,50,50,46,'rgb(255,150,60)',.3);g.save();g.translate(50,52);g.rotate(.6);
      g.fillStyle=lg(g,-6,22,6,46,['#fff3a0','#ffb02e','#ff5a1f']);g.beginPath();g.moveTo(-9,22);g.quadraticCurveTo(0,52,9,22);g.closePath();g.fill();
      g.fillStyle=lg(g,-14,0,14,0,['#c43a3a','#ff4d4d','#a01f2a']);[-1,1].forEach(s=>{g.beginPath();g.moveTo(s*10,6);g.lineTo(s*22,26);g.lineTo(s*10,22);g.closePath();g.fill();ink(g,2.6);});
      g.fillStyle=lg(g,-13,0,13,0,['#ffffff','#e3e6f2','#9aa3bb']);g.beginPath();g.moveTo(0,-36);g.bezierCurveTo(16,-22,14,8,10,24);g.lineTo(-10,24);g.bezierCurveTo(-14,8,-16,-22,0,-36);g.closePath();g.fill();ink(g);
      g.fillStyle=lg(g,-10,-30,10,-18,['#ff7a7a','#ff2b2b']);g.beginPath();g.moveTo(0,-36);g.bezierCurveTo(9,-29,11,-23,11,-20);g.lineTo(-11,-20);g.bezierCurveTo(-11,-23,-9,-29,0,-36);g.closePath();g.fill();ink(g,2.6);
      ball(g,0,-5,7,['#d9f6ff','#4dc3ff','#1f6fb0']);g.restore();},
    ufo(g){glow(g,50,58,44,'rgb(80,230,255)',.3);
      g.fillStyle='rgba(120,240,255,.25)';g.beginPath();g.moveTo(38,64);g.lineTo(62,64);g.lineTo(76,96);g.lineTo(24,96);g.closePath();g.fill();
      g.fillStyle=rg(g,50,40,16,['#e9fdff','#7fe6ff','#2a8fb8']);g.beginPath();g.ellipse(50,44,16,15,0,Math.PI,0);g.closePath();g.fill();ink(g);shine(g,44,38,3.5);
      g.fillStyle=lg(g,50,44,50,66,['#eef1f8','#a9b1c6','#5d6678']);g.beginPath();g.ellipse(50,54,36,11,0,0,TAU);g.fill();ink(g);
      ['#ffe14d','#ff4fa8','#9dff3f','#ffe14d','#ff4fa8'].forEach((c,i)=>{g.fillStyle=c;g.beginPath();g.arc(28+i*11,56,3.2,0,TAU);g.fill();});},
    planet(g){glow(g,50,50,46,'rgb(255,190,110)',.25);
      const ring=(front)=>{g.save();g.translate(50,52);g.rotate(-.35);g.beginPath();g.ellipse(0,0,42,11,0,front?0:Math.PI,front?Math.PI:TAU);g.strokeStyle='#f6d8a8';g.lineWidth=7;g.stroke();g.strokeStyle='rgba(140,80,40,.6)';g.lineWidth=2;g.stroke();g.restore();};
      ring(false);ball(g,50,50,24,['#ffe0b0','#ff9f4a','#b4501c']);
      g.save();g.beginPath();g.arc(50,50,24,0,TAU);g.clip();g.strokeStyle='rgba(150,60,20,.35)';g.lineWidth=4;[42,52,60].forEach(y=>{g.beginPath();g.moveTo(24,y);g.quadraticCurveTo(50,y+4,76,y);g.stroke();});g.restore();
      ring(true);},
    // v0.2.172: a sleepy crescent moon with a friendly face and a nightcap glow
    moon(g){glow(g,46,50,46,'rgb(255,240,170)',.35);
      g.save();g.beginPath();g.arc(46,50,32,0,TAU);g.clip();
      g.beginPath();g.rect(0,0,100,100);g.arc(64,40,27,0,TAU,true);g.clip('evenodd');
      g.fillStyle=rg(g,40,50,32,['#fffbe0','#ffe066','#d99a10']);g.fillRect(0,0,100,100);
      g.fillStyle='#e0a822';[[33,63,4.5],[42,74,3],[24,47,3]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,TAU);g.fill();});
      g.fillStyle='#fff6c8';g.beginPath();g.ellipse(24,38,4,6,-.5,0,TAU);g.fill();
      g.beginPath();g.arc(46,50,32,0,TAU);ink(g,6.4);g.beginPath();g.arc(64,40,27,0,TAU);ink(g,6.4);g.restore();
      // closed sleepy eye + smile + blush on the inner curve
      g.strokeStyle=INK;g.lineWidth=3;g.lineCap='round';g.beginPath();g.arc(34,52,4.5,.15*Math.PI,.85*Math.PI);g.stroke();
      g.beginPath();g.arc(38,62,5,.1*Math.PI,.75*Math.PI);g.stroke();
      g.fillStyle='#ff8aa8';g.beginPath();g.ellipse(27,58,3.6,2.4,0,0,TAU);g.fill();
      g.fillStyle='#fff';[[76,22],[84,46]].forEach(([x,y],k)=>{star(g,x,y,k?4:6,k?1.6:2.2,4,0);g.fill();ink(g,1.6);});},
    // v0.2.145 redraw: an icy, cratered head in a glowing coma, trailing a wide fanned dust tail
    // v0.2.172: a blazing comet: white-hot head, a flame tail in yellow → orange → red, sparks
    comet(g){glow(g,66,34,32,'rgb(255,190,80)',.45);
      ribbon(g,[68,32],[44,50],[8,82],46,['#ff4a2a','#ff8a1f','#ffd23f','#fff6b0'],t=>(.5+t*.6)*(1-Math.pow(t,3)));
      g.fillStyle='#fff3a0';[[30,46,3],[46,66,2.4],[18,62,2]].forEach(([x,y,r])=>{star(g,x,y,r*1.8,r*.7,4,0);g.fill();});
      ball(g,68,32,14,['#ffffff','#fff1a0','#ff9a2e']);
      g.fillStyle='rgba(255,255,255,.95)';g.beginPath();g.arc(64,28,4.5,0,TAU);g.fill();},
    star(g){glow(g,50,52,46,'rgb(255,220,80)',.35);star(g,50,54,38,17,5,-Math.PI/2);g.fillStyle=rg(g,50,54,38,['#fff8c0','#ffd23f','#e08a10']);g.fill();ink(g);shine(g,40,40,5);
      g.fillStyle=INK;[42,58].forEach(x=>{g.beginPath();g.ellipse(x,52,2.6,3.4,0,0,TAU);g.fill();});g.beginPath();g.arc(50,60,5,.15*Math.PI,.85*Math.PI);ink(g,2.4);},
    sun(g){glow(g,50,50,48,'rgb(255,170,50)',.4);g.fillStyle=lg(g,0,0,100,100,['#ffe14d','#ff8a3d']);
      for(let i=0;i<12;i++){g.save();g.translate(50,50);g.rotate(i*TAU/12);g.beginPath();g.moveTo(-6,-26);g.lineTo(0,-44);g.lineTo(6,-26);g.closePath();g.fill();ink(g,2.4);g.restore();}
      ball(g,50,50,24,['#fff6b0','#ffc23f','#f06a10']);},
    satellite(g){glow(g,50,50,44,'rgb(120,170,255)',.25);g.save();g.translate(50,50);g.rotate(-.5);
      [-1,1].forEach(s=>{rr(g,s>0?14:-44,-10,30,20,2);g.fillStyle=lg(g,0,-10,0,10,['#7fb8ff','#2f6fd8','#1b3f8a']);g.fill();ink(g,2.6);g.strokeStyle='rgba(200,230,255,.6)';g.lineWidth=1.2;g.beginPath();for(let k=1;k<3;k++){g.moveTo((s>0?14:-44)+k*10,-10);g.lineTo((s>0?14:-44)+k*10,10);}g.moveTo(s>0?14:-44,0);g.lineTo(s>0?44:-14,0);g.stroke();});
      rr(g,-14,-14,28,28,5);g.fillStyle=lg(g,-14,-14,14,14,['#fff1a8','#e8c25a','#9a7420']);g.fill();ink(g);
      g.beginPath();g.moveTo(0,-14);g.lineTo(0,-26);ink(g,2.6);g.fillStyle='#ff4d4d';g.beginPath();g.arc(0,-28,4,0,TAU);g.fill();ink(g,2);g.restore();},
    telescope(g){glow(g,50,46,44,'rgb(170,140,255)',.25);
      g.strokeStyle=INK;g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(50,56);g.lineTo(32,90);g.moveTo(50,56);g.lineTo(68,90);g.moveTo(50,56);g.lineTo(50,90);g.stroke();
      g.save();g.translate(50,48);g.rotate(-.55);rr(g,-34,-10,58,20,5);g.fillStyle=lg(g,0,-10,0,10,['#c9a8ff','#7e57c2','#3b2470']);g.fill();ink(g);
      rr(g,22,-13,12,26,4);g.fillStyle=lg(g,0,-13,0,13,['#fff1a8','#e8c25a','#9a7420']);g.fill();ink(g);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(-28,-7,40,3);g.restore();},
    atom(g){glow(g,50,50,46,'rgb(80,230,255)',.3);
      [0,1,2].forEach(i=>{g.save();g.translate(50,50);g.rotate(i*Math.PI/3);g.beginPath();g.ellipse(0,0,40,14,0,0,TAU);g.strokeStyle=INK;g.lineWidth=6;g.stroke();g.strokeStyle=['#3fe6ff','#9dff3f','#ff4fa8'][i];g.lineWidth=3.2;g.stroke();
        g.fillStyle=['#3fe6ff','#9dff3f','#ff4fa8'][i];g.beginPath();g.arc(40,0,5,0,TAU);g.fill();ink(g,2);g.restore();});
      ball(g,50,50,11,['#ffd0d0','#ff3b3b','#a3101f']);},
    dna(g){glow(g,50,50,46,'rgb(255,120,200)',.25);
      const pts=(ph)=>{const a=[];for(let y=8;y<=92;y+=3)a.push([50+Math.sin(y/14+ph)*20,y,Math.cos(y/14+ph)]);return a;};
      const A=pts(0),Bp=pts(Math.PI);
      for(let i=0;i<A.length;i+=3){g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=3;g.beginPath();g.moveTo(A[i][0],A[i][1]);g.lineTo(Bp[i][0],Bp[i][1]);g.stroke();}
      [[A,'#ff4fa8'],[Bp,'#3fa8ff']].forEach(([P,c])=>{g.lineCap='round';g.strokeStyle=INK;g.lineWidth=9;g.beginPath();P.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();g.strokeStyle=c;g.lineWidth=5.5;g.stroke();});},
    // v0.2.172: a fizzing test tube: glowing potion, bubbles rising out of the top
    tube(g){glow(g,50,56,42,'rgb(120,255,140)',.4);g.save();g.translate(50,52);g.rotate(.38);
      rr(g,-11,-34,22,70,11);g.fillStyle='#dff6ff';g.fill();
      g.save();rr(g,-11,-34,22,70,11);g.clip();g.fillStyle=lg(g,0,-4,0,36,['#e6ff9a','#5fe07a','#13874a']);g.fillRect(-11,-6,22,44);
        g.fillStyle='#b8ffb0';g.fillRect(-11,-6,22,4);g.fillStyle='#ffffff';[[-4,10,3],[3,20,2.2],[-2,28,1.8]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,TAU);g.fill();});g.restore();
      rr(g,-11,-34,22,70,11);ink(g);rr(g,-14,-39,28,8,3);g.fillStyle='#c7ccd8';g.fill();ink(g,2.6);g.fillStyle='#ffffff';g.fillRect(-7,-28,3.5,24);g.restore();
      [[60,20,5],[70,10,3.5],[54,8,2.8]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle='#b8ffb0';g.fill();ink(g,1.8);});},
    flask(g){glow(g,50,60,42,'rgb(190,110,255)',.35);   // v0.2.145: solid glass so the outline and neck survive the pixel pass
      const body=()=>{g.beginPath();g.moveTo(41,22);g.lineTo(41,42);g.lineTo(20,80);g.quadraticCurveTo(16,90,28,90);g.lineTo(72,90);g.quadraticCurveTo(84,90,80,80);g.lineTo(59,42);g.lineTo(59,22);g.closePath();};
      body();g.fillStyle=lg(g,20,0,80,0,['#eaf6ff','#c9e4f5','#9fbfd8']);g.fill();
      g.save();body();g.clip();g.fillStyle=lg(g,0,58,0,92,['#e2b8ff','#a879ff','#5a2aa8']);g.beginPath();g.moveTo(0,62);g.quadraticCurveTo(50,56,100,62);g.lineTo(100,100);g.lineTo(0,100);g.fill();
      g.fillStyle='rgba(255,255,255,.75)';[[40,74,3.4],[56,80,2.4],[48,86,1.8]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,TAU);g.fill();});
      g.fillStyle='rgba(255,255,255,.7)';g.fillRect(44,26,3.4,20);g.restore();body();ink(g,3.4);
      rr(g,36,14,28,9,4);g.fillStyle=lg(g,0,14,0,23,['#e3e6f2','#9aa3bb']);g.fill();ink(g,2.8);
      g.fillStyle='#e2b8ff';[[54,8,3.4],[46,3,2.4]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,TAU);g.fill();ink(g,1.8);});},
    microscope(g){glow(g,50,56,42,'rgb(120,200,255)',.25);
      rr(g,22,82,56,9,4);g.fillStyle=lg(g,0,82,0,91,['#9aa3bb','#5d6678']);g.fill();ink(g);
      g.beginPath();g.moveTo(66,82);g.quadraticCurveTo(70,58,58,44);g.strokeStyle=INK;g.lineWidth=10;g.lineCap='round';g.stroke();g.strokeStyle='#c7ccd8';g.lineWidth=6;g.stroke();
      rr(g,30,66,30,6,3);g.fillStyle='#e8c25a';g.fill();ink(g,2.4);
      g.save();g.translate(44,38);g.rotate(-.5);rr(g,-7,-28,14,40,4);g.fillStyle=lg(g,-7,0,7,0,['#ffffff','#7fb8ff','#2f6fd8']);g.fill();ink(g);rr(g,-9,-32,18,7,3);g.fillStyle='#2a2a33';g.fill();g.restore();},
    magnet(g){glow(g,50,52,44,'rgb(255,80,80)',.3);
      g.beginPath();g.moveTo(22,18);g.lineTo(22,56);g.arc(50,56,28,Math.PI,0,true);g.lineTo(78,18);g.lineTo(62,18);g.lineTo(62,56);g.arc(50,56,12,0,Math.PI);g.lineTo(38,18);g.closePath();
      g.fillStyle=lg(g,0,20,0,90,['#ff8a8a','#ff2b2b','#a3101f']);g.fill();ink(g);
      [[22,38],[62,78]].forEach(([a,b])=>{rr(g,a,12,b-a-0,14,2);g.fillStyle=lg(g,0,12,0,26,['#ffffff','#c7ccd8','#7a8296']);g.fill();ink(g,2.6);});
      g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=3;g.beginPath();g.moveTo(28,30);g.lineTo(28,56);g.stroke();},
    bulb(g){glow(g,50,42,48,'rgb(255,230,90)',.55);
      g.beginPath();g.arc(50,40,26,Math.PI*.82,Math.PI*.18);g.lineTo(60,70);g.lineTo(40,70);g.closePath();g.fillStyle=rg(g,50,40,30,['#fffbe0','#ffe14d','#e0a020']);g.fill();ink(g);
      g.strokeStyle='#c9811a';g.lineWidth=2.4;g.beginPath();g.moveTo(44,68);g.lineTo(46,48);g.lineTo(50,54);g.lineTo(54,48);g.lineTo(56,68);g.stroke();
      [70,77,84].forEach((y,i)=>{rr(g,40+i,y,20-i*2,7,3);g.fillStyle=lg(g,0,y,0,y+7,['#eef1f8','#9aa3bb']);g.fill();ink(g,2.4);});shine(g,38,30,5);},
    battery(g){glow(g,50,52,44,'rgb(120,255,140)',.3);
      rr(g,24,24,52,64,8);g.fillStyle=lg(g,24,0,76,0,['#9dffb0','#3ddc84','#1a8a4a']);g.fill();ink(g);rr(g,40,15,20,10,3);g.fillStyle='#c7ccd8';g.fill();ink(g,2.6);
      g.beginPath();g.moveTo(54,32);g.lineTo(40,58);g.lineTo(50,58);g.lineTo(46,80);g.lineTo(62,50);g.lineTo(52,50);g.closePath();g.fillStyle=rg(g,50,50,24,['#fffbe0','#ffe14d','#e0a020']);g.fill();ink(g,2.6);
      g.fillStyle='rgba(255,255,255,.5)';g.fillRect(30,30,5,50);},
    gem(g){glow(g,50,52,46,'rgb(90,230,255)',.4);
      const P=[[30,30],[70,30],[86,46],[50,90],[14,46]];g.beginPath();P.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=lg(g,14,30,86,90,['#e8fdff','#5ad1ff','#1f6fb0']);g.fill();
      g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.moveTo(30,30);g.lineTo(50,46);g.lineTo(14,46);g.closePath();g.fill();g.fillStyle='rgba(20,60,140,.3)';g.beginPath();g.moveTo(86,46);g.lineTo(50,46);g.lineTo(50,90);g.closePath();g.fill();
      g.beginPath();g.moveTo(14,46);g.lineTo(86,46);g.moveTo(30,30);g.lineTo(50,46);g.lineTo(70,30);g.moveTo(50,46);g.lineTo(50,90);ink(g,2);g.beginPath();P.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();ink(g);},
    // v0.2.172: a fuller spiral: solid glowing arms, a bright core, twinkles
    galaxy(g){glow(g,50,50,48,'rgb(190,110,255)',.5);
      g.save();g.translate(50,50);g.scale(1,.74);
      for(let arm=0;arm<2;arm++){const cols=arm?['#ff8ae0','#ff4fb8']:['#9fb4ff','#6b7bff'];
        for(let i=0;i<48;i++){const t=i/48,a=arm*Math.PI+t*4.6,d=5+t*40,r=7.5*(1-t)+1.6;
          g.fillStyle=t<.5?cols[0]:cols[1];g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,r,0,TAU);g.fill();}}
      g.restore();ball(g,50,50,10,['#ffffff','#fff0fb','#e07ae8']);
      g.fillStyle='#fff';[[18,22,5],[82,24,4],[24,82,4],[86,74,5],[70,12,3]].forEach(([x,y,r])=>{star(g,x,y,r,r*.35,4,0);g.fill();});},
    earth(g){glow(g,50,50,46,'rgb(90,170,255)',.35);ball(g,50,50,32,['#bfe6ff','#3a8fe8','#163f8f']);
      g.save();g.beginPath();g.arc(50,50,32,0,TAU);g.clip();g.fillStyle='#3ddc84';
      [[36,40,12,9],[60,62,14,10],[66,34,7,5],[30,68,6,5]].forEach(([x,y,a,b])=>{g.beginPath();g.ellipse(x,y,a,b,.4,0,TAU);g.fill();ink(g,2);});g.restore();
      g.beginPath();g.arc(50,50,32,0,TAU);ink(g);shine(g,38,36,5);},
    // v0.2.145 redraw: reads as a space helmet (not an egg): dark star-reflecting visor with a gold rim,
    // side ear pieces, a flat bottom on a chunky neck ring
    helmet(g){glow(g,50,50,46,'rgb(120,200,255)',.25);
      g.save();g.beginPath();g.rect(0,0,100,74);g.clip();
      g.beginPath();g.arc(50,48,33,0,TAU);g.fillStyle=rg(g,50,46,34,['#ffffff','#e6e9f4','#8e97b0']);g.fill();g.restore();
      g.beginPath();g.arc(50,48,33,Math.PI-Math.asin(26/33),Math.asin(26/33),false);g.closePath();ink(g,3.4);
      [[11,40],[81,40]].forEach(([x,y])=>{rr(g,x,y,8,18,4);g.fillStyle=lg(g,x,y,x+8,y,['#ffb37a','#ff5a3a']);g.fill();ink(g,2.4);});
      rr(g,26,28,48,36,16);g.fillStyle=lg(g,30,28,70,64,['#3a3f8f','#1a1446','#0a0820']);g.fill();g.strokeStyle='#ffc23f';g.lineWidth=4;g.stroke();ink(g,2);
      g.save();rr(g,26,28,48,36,16);g.clip();g.fillStyle='rgba(255,90,200,.35)';g.beginPath();g.ellipse(64,60,22,12,-.4,0,TAU);g.fill();g.restore();
      g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(34,46);g.quadraticCurveTo(35,36,44,33);g.stroke();
      g.fillStyle='#fff';[[60,40,3],[66,52,2]].forEach(([x,y,r])=>{star(g,x,y,r,r*.35,4,0);g.fill();});
      rr(g,20,70,60,15,7);g.fillStyle=lg(g,0,70,0,85,['#e3e6f2','#aab2c6','#6b7488']);g.fill();ink(g,3);
      g.fillStyle='#5d6678';[30,42,58,70].forEach(x=>{g.beginPath();g.arc(x,77.5,2,0,TAU);g.fill();});},
    robot(g){glow(g,50,52,44,'rgb(90,230,255)',.3);
      g.beginPath();g.moveTo(50,26);g.lineTo(50,14);ink(g,3);g.fillStyle='#ff4d4d';g.beginPath();g.arc(50,12,5,0,TAU);g.fill();ink(g,2.4);
      rr(g,22,26,56,48,10);g.fillStyle=lg(g,22,26,78,74,['#eef1f8','#a9b1c6','#5d6678']);g.fill();ink(g);
      [38,62].forEach(x=>{g.fillStyle=rg(g,x,46,8,['#e9fdff','#3fe6ff','#1a7a9a']);g.beginPath();g.arc(x,46,8,0,TAU);g.fill();ink(g,2.4);});
      rr(g,36,60,28,7,3);g.fillStyle='#2a2a33';g.fill();g.fillStyle='#9dff3f';[40,47,54].forEach(x=>g.fillRect(x,62,4,3));[16,78].forEach(x=>{rr(g,x,40,6,16,3);g.fillStyle='#7a8296';g.fill();ink(g,2.2);});},
    asteroid(g){glow(g,50,52,42,'rgb(255,170,110)',.2);
      g.beginPath();[[50,18],[72,24],[84,46],[78,70],[56,84],[30,80],[16,58],[22,32]].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=rg(g,46,46,38,['#d8b9a0','#9a6a4a','#4f3020']);g.fill();ink(g);
      [[40,40,7],[62,58,9],[36,66,5],[66,34,4]].forEach(([x,y,r])=>{g.fillStyle='rgba(60,30,20,.5)';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.fillStyle='rgba(255,230,210,.35)';g.beginPath();g.arc(x-1.5,y-1.5,r*.55,0,TAU);g.fill();});shine(g,34,30,4);},
    bolt(g){   // v0.2.201: a chunkier, cleaner bolt: one bold shape, a lighter left facet, a darker right facet, no thin lines
      glow(g,50,50,46,'rgb(255,230,80)',.4);
      const P=[[42,6],[72,6],[58,38],[78,38],[34,95],[45,55],[24,55]];
      const path=()=>{g.beginPath();P.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();};
      g.save();g.translate(3,3);path();g.fillStyle='rgba(60,20,40,.45)';g.fill();g.restore();
      path();g.fillStyle='#ffd21f';g.fill();
      g.save();path();g.clip();
      g.fillStyle='#fff3a6';g.beginPath();g.moveTo(42,6);g.lineTo(55,6);g.lineTo(37,55);g.lineTo(24,55);g.closePath();g.fill();     // lit left edge
      g.fillStyle='#f39a12';g.beginPath();g.moveTo(58,38);g.lineTo(78,38);g.lineTo(34,95);g.lineTo(52,50);g.closePath();g.fill();  // shaded lower right
      g.restore();path();ink(g,4);},
    compass(g){glow(g,50,50,44,'rgb(255,210,90)',.3);ball(g,50,50,34,['#fff1a8','#e8c25a','#8a6418']);
      g.beginPath();g.arc(50,50,26,0,TAU);g.fillStyle=rg(g,50,50,26,['#ffffff','#f2f2f7','#c0c8d8']);g.fill();ink(g,2.6);
      g.save();g.translate(50,50);g.rotate(.6);g.beginPath();g.moveTo(0,-22);g.lineTo(6,0);g.lineTo(-6,0);g.closePath();g.fillStyle='#ff2b2b';g.fill();ink(g,2.2);
      g.beginPath();g.moveTo(0,22);g.lineTo(6,0);g.lineTo(-6,0);g.closePath();g.fillStyle='#5d6678';g.fill();ink(g,2.2);g.restore();g.fillStyle=INK;g.beginPath();g.arc(50,50,3,0,TAU);g.fill();},
    thermometer(g){glow(g,50,72,30,'rgb(255,80,80)',.4);
      rr(g,40,12,20,64,10);g.fillStyle=lg(g,40,0,60,0,['#ffffff','#e3e6f2','#9aa3bb']);g.fill();ink(g);
      rr(g,46,36,8,44,4);g.fillStyle='#ff3b3b';g.fill();ball(g,50,80,13,['#ffb0b0','#ff2b2b','#a3101f']);
      g.strokeStyle=INK;g.lineWidth=2;[24,32,40,48].forEach(y=>{g.beginPath();g.moveTo(60,y);g.lineTo(66,y);g.stroke();});},
    // v0.2.172: a proper black hole: a fat glowing disk, the light bent over the top (photon ring), a deep core
    blackhole(g){glow(g,50,50,48,'rgb(255,150,60)',.45);
      const disk=()=>{const k=g.createLinearGradient(-44,0,44,0);['#ff3d7a','#ff8a1f','#fff3a0','#ff8a1f','#ff3d7a'].forEach((c,i,a)=>k.addColorStop(i/(a.length-1),c));return k;};
      g.save();g.translate(50,52);g.rotate(-.28);g.beginPath();g.ellipse(0,0,44,14,0,Math.PI,TAU);g.strokeStyle=disk();g.lineWidth=11;g.stroke();g.restore();
      // the lensed light arching over the top of the hole
      g.beginPath();g.arc(50,50,25,Math.PI*1.04,Math.PI*1.96);g.strokeStyle='#ffd27a';g.lineWidth=6;g.stroke();
      g.fillStyle='#05020a';g.beginPath();g.arc(50,50,20,0,TAU);g.fill();g.strokeStyle='#fff3c0';g.lineWidth=2.6;g.stroke();
      g.save();g.translate(50,52);g.rotate(-.28);g.beginPath();g.ellipse(0,0,44,14,0,0,Math.PI);g.strokeStyle=disk();g.lineWidth=11;g.stroke();g.restore();
      g.fillStyle='#fff';[[16,20],[84,80]].forEach(([x,y])=>{star(g,x,y,4.5,1.6,4,0);g.fill();});},
    // v0.2.145 redraw: a chunky rainbow swoosh that tapers to a point, sparkles in its wake, a big glinting star up front
    shootingstar(g){glow(g,66,34,36,'rgb(255,220,80)',.4);
      ribbon(g,[66,34],[36,50],[8,88],40,['#ff4fa8','#ffb02e','#ffe14d','#3fe6ff'],t=>Math.pow(1-t,.55));
      g.fillStyle='#fff';[[44,78,7],[22,56,5.5],[60,66,4.5]].forEach(([x,y,r])=>{star(g,x,y,r,r*.3,4,0);g.fill();});
      star(g,66,34,25,11,5,-Math.PI/2+.2);g.fillStyle=rg(g,66,34,25,['#fffbe0','#ffd23f','#e07a10']);g.fill();ink(g,3.6);
      g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.ellipse(60,27,4.5,2.6,-.6,0,TAU);g.fill();g.beginPath();g.arc(70,24,1.6,0,TAU);g.fill();},
    alienplanet(g){glow(g,50,50,46,'rgb(150,255,120)',.3);ball(g,50,52,30,['#e6ffb0','#9dff3f','#3a8a1a']);
      g.save();g.beginPath();g.arc(50,52,30,0,TAU);g.clip();g.fillStyle='rgba(40,110,20,.45)';[[38,44,9],[62,64,11],[60,36,5]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,TAU);g.fill();});g.restore();
      ball(g,82,22,7,['#ffd0f0','#ff4fa8','#a01f6a']);ball(g,18,26,5,['#d9f6ff','#5ad1ff','#1f6fb0']);},
  };
  window.MATCH_ICONS=Object.keys(ICONS);
  // a pose per buddy (the same on both cards of a pair, different from buddy to buddy)
  const POSES=[
    ()=>({view:'turn',angle:18}),
    ()=>({view:'turn',angle:-35}),
    ()=>({view:'turn',angle:60}),
    ()=>({view:'side',face:1,run:.25,speed:1,k:.95}),
    ()=>({view:'side',face:-1,run:.75,speed:1,k:.95}),
    ()=>({view:'side',face:1,air:true,run:0,k:.95,dy:-.08}),
    i=>({view:'float',m:tilt(i,.55,.9),k:.88,dy:-.06}),
    i=>({view:'float',m:tilt(i,-.7,2.6),k:.88,dy:-.06}),
  ];
  function tilt(i,roll,yaw){if(typeof buddyTumble==='undefined')return null;const T=buddyTumble;return T.mul(T.axis([0,0,1],roll),T.axis([0,1,0],yaw+(i%5)*.3));}
  // v0.2.128: most buddy cards face you (straight on or a 3/4 turn, sometimes a playful tilt); side-on is rare (~1 in 10)
  const FRONT=[0,18,-22,30,-34,10,-14,38,-40,24];
  function buddyPose(i){
    const r=(i*7+3)%20;
    if(r===0)return POSES[3](i);if(r===10)return POSES[5](i);                     // the rare side-on runner / jumper
    if(r%6===1&&typeof buddyTumble!=='undefined'){const T=buddyTumble,sg=i%2?1:-1;   // a friendly head tilt, still facing you
      return{view:'float',m:T.mul(T.axis([0,0,1],sg*.32),T.axis([0,1,0],-sg*.35)),k:.9,dy:-.04};}
    return{view:'turn',angle:FRONT[(i*3)%FRONT.length]};}
  // ── v0.2.127 look: "ARCADE TILE" cards ── chunky pixel art on a bold colour tile (thick dark outline, dithered
  // shading, top bevel). Every picture is drawn small, posterised and outlined so it reads as crisp pixel art.
  // Some buddy cards come out as rare HOLO or FOIL editions. The card backs are slowly swirling pixel galaxies (CSS).
  const OUT='#1d1530',TINT=['#ff6b6b','#ffb347','#4fd1c5','#9b5cff','#ff5fb8','#3fa9ff','#7ad84a','#e8b830'];
  const TILTED={ufo:1,planet:1,moon:1,star:1,sun:1,atom:1,tube:1,flask:1,bulb:1,battery:1,gem:1,earth:1,helmet:1,robot:1,compass:1,thermometer:1,blackhole:1,alienplanet:1,magnet:1,galaxy:1,asteroid:1};
  const hash=k=>{let s=7;for(let i=0;i<k.length;i++)s=(s*31+k.charCodeAt(i))%9973;return s;};
  function pixelate(drawFn,N,thick){
    const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');drawFn(x,N);
    const d=x.getImageData(0,0,N,N),a=d.data,op=new Uint8Array(N*N);
    for(let i=0;i<N*N;i++){const k=i*4;if(a[k+3]>100){a[k+3]=255;op[i]=1;for(let j=0;j<3;j++)a[k+j]=Math.min(255,Math.round(a[k+j]/22)*22+6);}else a[k+3]=0;}
    const o=new Uint8ClampedArray(a);
    // (v0.2.173: the light rim on the edges is gone: it read as a whitish fringe)
    let m=op;for(let pass=0;pass<0;pass++){const nm=m.slice();   // (no extra outline: the creator prefers it without)
      for(let y=0;y<N;y++)for(let X=0;X<N;X++){const i=y*N+X;if(m[i])continue;
        if((X>0&&m[i-1])||(X<N-1&&m[i+1])||(y>0&&m[i-N])||(y<N-1&&m[i+N])){const k=i*4;o[k]=29;o[k+1]=21;o[k+2]=48;o[k+3]=255;nm[i]=1;}}m=nm;}
    x.putImageData(new ImageData(o,N,N),0,0);return c;}
  const sprCache={};
  function spriteFor(pattern,N){
    N=N||40;const ck=pattern+'@'+N;if(sprCache[ck])return sprCache[ck];const th=N>=72;let c;
    if(pattern.startsWith('b:')){const idx=+pattern.slice(2),o=buddyPose(idx);
      c=pixelate((x,N)=>{x.translate(N*.06,N*.08);x.scale(.88,.88);drawBuddy(x,N/2,N*.56,N*.86*(o.k||1),Object.assign({idx,antenna:1,t:1,lite:N<72},o));},N,th);}
    else{const k=pattern.slice(2),f=ICONS[k];if(!f)return null;
      const tl=TILTED[k]?(hash(k)%2?1:-1)*8*Math.PI/180:0;   // plain, symmetric pictures lean 8° for a bit of attitude
      c=pixelate((x,N)=>{x.scale(N/100,N/100);x.translate(50,50);x.rotate(tl);x.translate(-50,-50);x.translate(6,6);x.scale(.88,.88);f(x);},N,th);}
    return sprCache[ck]=c;}
  function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
  function edition(g,w,h,ed){g.save();rrect(g,0,0,w,h,w*.12);g.clip();g.globalCompositeOperation='overlay';
    if(ed==='foil'){const q=g.createLinearGradient(0,0,w,h);q.addColorStop(0,'rgba(80,160,255,0)');q.addColorStop(.42,'rgba(120,200,255,.9)');q.addColorStop(.52,'rgba(255,255,255,.95)');q.addColorStop(.62,'rgba(80,160,255,0)');g.fillStyle=q;g.fillRect(0,0,w,h);}
    else{for(let k=-6;k<10;k++){g.fillStyle='hsla('+((k*45)%360)+',100%,60%,.55)';g.beginPath();g.moveTo(k*w*.2,0);g.lineTo(k*w*.2+w*.11,0);g.lineTo(k*w*.2+w*.11-w*.8,h);g.lineTo(k*w*.2-w*.8,h);g.fill();}}
    g.restore();const p=Math.max(2,Math.round(w*.03));g.fillStyle='#fff';[[.78,.18],[.22,.7]].forEach(([x,y])=>{g.fillRect(x*w-p/2,y*h-p*1.5,p,p*3);g.fillRect(x*w-p*1.5,y*h-p/2,p*3,p);});
    g.font='bold '+Math.round(h*.085)+'px "Bebas Neue"';g.textAlign='center';g.textBaseline='middle';const lab=ed==='foil'?'FOIL':'HOLO',tw=g.measureText(lab).width+w*.12;
    rrect(g,(w-tw)/2,h*.055,tw,h*.1,h*.04);g.fillStyle=ed==='foil'?'#4aa8ff':'#ff5fb8';g.fill();g.fillStyle=OUT;g.fillText(lab,w/2,h*.108);}
  // v0.2.163: black & white versions of the card pictures, for menus that shouldn't use emoji (the WATTS breakdown).
  //   matchIconBW('bolt', 64) → a canvas: the pixel sprite in greyscale with a little extra contrast.
  const bwCache={};
  window.matchIconBW=function(key,N){
    N=N||64;const ck=key+'@'+N;if(bwCache[ck])return bwCache[ck];
    const sp=spriteFor('i:'+key,N);if(!sp)return null;
    const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.drawImage(sp,0,0);
    try{const d=x.getImageData(0,0,N,N),a=d.data;
      for(let i=0;i<a.length;i+=4){if(!a[i+3])continue;let l=.3*a[i]+.59*a[i+1]+.11*a[i+2];l=Math.max(0,Math.min(255,(l-128)*1.25+150));a[i]=a[i+1]=a[i+2]=l;}
      x.putImageData(d,0,0);}catch(e){}
    return bwCache[ck]=c;};
  window.drawMatchFace=function(cv,pattern){
    const w=cv.clientWidth||cv.parentNode.clientWidth||60,h=cv.clientHeight||cv.parentNode.clientHeight||w,dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
    const key=pattern.slice(2),hv=hash(pattern),tint=TINT[hv%TINT.length],R=w*.14,m=Math.max(2.5,w*.055);
    rrect(g,0,0,w,h,R);g.fillStyle=OUT;g.fill();                                   // thick dark outline
    g.save();rrect(g,m,m,w-2*m,h-2*m,R*.8);g.clip();
    let q=g.createLinearGradient(0,m,0,h-m);q.addColorStop(0,tint);q.addColorStop(1,OUT);g.fillStyle=q;g.fillRect(0,0,w,h);
    const st=Math.max(3,Math.min(7,Math.round(w*.05)));g.fillStyle='rgba(255,255,255,.12)';for(let y=0;y<h;y+=st)for(let x=((y/st)%2)*st;x<w;x+=st*2)g.fillRect(x,y,st*.5,st*.5);   // dither
    g.fillStyle='rgba(255,255,255,.2)';g.fillRect(0,m,w,h*.07);                       // top bevel
    const sz0=Math.min(w,h)*.86,NN=Math.max(64,Math.min(192,Math.round(sz0*dpr/1.6/4)*4));
    const sp=spriteFor(pattern,NN);if(sp){g.imageSmoothingEnabled=false;const sz=sz0;
      if(!sp._sh){const c=document.createElement('canvas');c.width=sp.width;c.height=sp.height;const x=c.getContext('2d');x.drawImage(sp,0,0);x.globalCompositeOperation='source-in';x.fillStyle='rgba(20,10,40,.4)';x.fillRect(0,0,c.width,c.height);sp._sh=c;}
      // centre what's actually drawn (not the sprite's square), so every picture sits in the middle of its card
      if(!sp._bb){let x0=sp.width,y0=sp.height,x1=-1,y1=-1;try{const d=sp.getContext('2d').getImageData(0,0,sp.width,sp.height).data;
        for(let y=0;y<sp.height;y++)for(let x=0;x<sp.width;x++)if(d[(y*sp.width+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}catch(e){}
        sp._bb=x1<0?{cx:.5,cy:.5}:{cx:(x0+x1+1)/2/sp.width,cy:(y0+y1+1)/2/sp.height};}
      const ox=w/2-sp._bb.cx*sz,oy=h/2-sp._bb.cy*sz,off=Math.max(2,sz*.035);g.drawImage(sp._sh,ox+off*.5,oy+off,sz,sz);g.drawImage(sp,ox,oy,sz,sz);}
    g.restore();
    if(pattern.startsWith('b:')){const idx=+key,r=(idx*7+3)%9;if(r===0)edition(g,w,h,'holo');else if(r===4)edition(g,w,h,'foil');}
  };

  // ── the card back: a pixel spiral galaxy (made once), slowly turning behind every face-down card ──
  (function(){
    const N=144,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d'),d=x.createImageData(N,N);
    const PAL=[[14,8,34],[28,12,58],[52,20,88],[88,32,112],[124,56,128],[150,96,126],[172,150,150],[70,130,150]];   // dimmed: less glare on face-down cards
    const hs=(i,j)=>{const s=Math.sin(i*127.1+j*311.7)*43758.5453;return s-Math.floor(s);};
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const X=(i-N/2+.5)/(N/2),Y=(j-N/2+.5)/(N/2),r=Math.hypot(X,Y),th=Math.atan2(Y,X);
      const a=th+3.1*Math.log(r+.05),arm=Math.pow(Math.max(0,Math.cos(2*a)),2.2)*Math.exp(-r*1.6),core=Math.exp(-r*r*18),dust=hs(i,j)*.25;
      let v=arm*1.15+core*1.05+dust*arm;let k=Math.max(0,Math.min(6.99,v*6.5));if(arm>.22&&hs(i+7,j+3)>.8&&r>.3)k=7;
      const P=PAL[Math.floor(k)],q=(j*N+i)*4;d.data[q]=P[0];d.data[q+1]=P[1];d.data[q+2]=P[2];d.data[q+3]=255;
      if(hs(i*3,j*5)>.992){d.data[q]=d.data[q+1]=d.data[q+2]=190;}}
    x.putImageData(d,0,0);
    try{document.documentElement.style.setProperty('--mg-galaxy','url('+c.toDataURL()+')');}catch(e){}
  })();
})();
