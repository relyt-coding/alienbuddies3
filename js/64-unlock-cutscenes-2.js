// ══════════════════════════════════════════════
//  UNLOCK CUTSCENES II (v0.2.140) — plugs into the player in js/63-unlock-cutscenes.js
//   • The 8 Musical Toolkit hubs: each one shows off what it does while its medallion bursts open
//       Effects (a wave dives into a vortex and comes out echoing) · Key (a scale climbs the keyboard onto a staff)
//       Piano Roll (notes drop into the grid, a playhead plays them) · Groove (a step grid gets programmed, then grooves)
//       Mastering (a muffled loop gets polished open) · Arrangement (blocks snap into lanes and the song builds)
//       Vocals (tap tap, a take records, then a harmonised choir) · Vocal Chops (scissors slice a take into pads)
//   • Every continent: a short one — the planet turns, the continent lights up and plays its first sound
//   • Minigame worlds: Cockpit (a rocket lands on Luna) · Glacia (a hopper rings crystal bells) · Worm Whack
//     (worms get whacked on the beat) · Magmora (an eruption, then the comet) · Beat Defense (drum towers fire on
//     the beat) · Wyrm Moon (the wyrm bursts out of the moon) · Grand Tournament (spotlights, trophy, fireworks)
//   • Best Buddy: a spotlight, a sparkle swirl, and POOF — your best buddy appears on its platform
// ══════════════════════════════════════════════
(function(){
  if(typeof addUnlockCutscenes!=='function'||!window.US_KIT)return;
  const K=window.US_KIT,{TAU,cl,ss,lerp,eOut,eBack,rnd,rgba,tone,noise,inst,riser,boom,cents,glow,ring,flash,disc,space,sph,globe}=K;
  const SM=s=>Math.pow(2,s/12);   // semitones → frequency ratio

  // ══ shared bits ══
  // a stage in the upper part of the screen, clear of the title (which sits at 66%)
  function stage(st){const SW=Math.min(st.W*.86,st.U*1.15),SH=st.H*.32;return{cx:st.W/2,y:st.H*.4,SW,SH,x0:st.W/2-SW/2,x1:st.W/2+SW/2};}
  function rrect(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
  function emoji(g,ch,x,y,size,a){g.save();g.globalAlpha=a==null?1:a;g.textAlign='center';g.textBaseline='middle';g.font=`${Math.round(size)}px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif`;g.fillText(ch,x,y);g.restore();}
  // a gate: a gain that opens at t and closes after len (for chops and stutters)
  function gate(S,t,len,a){const v=S.c.createGain();v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(a||1,t+.005);v.gain.setValueAtTime(a||1,t+len);v.gain.linearRampToValueAtTime(0,t+len+.03);v.connect(S.out);return v;}
  // an electric-piano-ish voice for the demos
  function keyz(S,t,f,len,a){tone(S,t,f,{type:'triangle',a,d:len+.3,rv:.35});tone(S,t,f*2,{a:a*.25,d:Math.min(.4,len),rv:.3});}
  const hubSpark=(S,t)=>{boom(S,t,.45);noise(S,t-.35,{f0:600,f1:6000,q:1.4,a:.05,k:.34,d:.08});[1046.5,1318.5,1568,2093].forEach((f,i)=>tone(S,t+.05+i*.05,f,{a:.02,d:.5,rv:.7}));};

  // ══════════════════════ MUSICAL TOOLKIT HUBS ══════════════════════
  // shared: the demo plays in the middle; at 1.45 the hub's medallion bursts open over it, then floats up out of the way
  function hubScene(cfg){
    return{col:cfg.col,vol:cfg.vol||.8,kicker:'MUSICAL TOOLKIT',title:cfg.title,sub:cfg.sub,
      init(st){st.S=stage(st);cfg.init&&cfg.init(st);},
      draw(st,t){const g=st.g,{W,H,U}=st,ig=ss(1.45,1.7,t),out=ss(3.55,4.25,t),S=st.S;
        space(st,cfg.col,.1+.2*ig,0,0);
        g.save();const z=1+out*.12;g.translate(S.cx,S.y);g.scale(z,z);g.translate(-S.cx,-S.y);cfg.demo(st,t,g,S);g.restore();
        // the medallion
        const p=ss(1.45,1.75,t),m=eOut(ss(1.85,2.4,t));
        if(p>0){const x=S.cx,y=lerp(S.y,H*.12,m),r=lerp(U*.15,U*.07,m)*eBack(p);
          g.globalCompositeOperation='lighter';glow(x,y,r*3.2,cfg.col,.55);g.globalCompositeOperation='source-over';
          g.fillStyle='rgba(8,10,24,.88)';disc(x,y,r);ring(x,y,r,Math.max(2,r*.07),cfg.col,.95);ring(x,y,r*1.18,1.5,'#ffe9a0',.5);
          emoji(g,cfg.icon,x,y+r*.05,r*1.05);}
        const k1=(t-1.45)/.9;if(k1>0&&k1<1){ring(S.cx,S.y,U*(.1+.9*eOut(k1)),2+8*(1-k1),cfg.col,.8*(1-k1));ring(S.cx,S.y,U*(.1+.6*eOut(k1)),1.5,'#ffffff',.6*(1-k1));}
        flash(st,t<1.45?ss(1.38,1.45,t)*.45:Math.max(0,.45*(1-(t-1.45)/.3)),'#fff6d8');
      },
      shake(t){return t>1.45&&t<1.8?7*(1-(t-1.45)/.35):0;},
      sound(S){hubSpark(S,S.t+1.45);cfg.sound(S,S.t);},
    };
  }

  // ── Effects: a dry little wave dives into a vortex and comes out the other side echoing, with a reverb glow ──
  const H_EFFECTS=hubScene({vol:0.92,icon:'🌀',col:'#7ad7ff',title:'EFFECTS',sub:'Reverb, echo and a whole chain of sound shapers',
    demo(st,t,g,S){const A=S.SH*.22,v=ss(1.25,1.6,t);
      if(v>0){g.globalCompositeOperation='lighter';for(let k=0;k<5;k++)for(let j=0;j<26;j++){const a=k*TAU/5+j*.3-t*4.2,rr=j/26*st.U*.17*v;
        g.fillStyle=`hsla(${190+j*6+k*20},90%,65%,${(1-j/26)*.8*v})`;disc(S.cx+Math.cos(a)*rr,S.y+Math.sin(a)*rr*.62,1+2.2*(1-j/26));}g.globalCompositeOperation='source-over';}
      const line=(env,amp,alpha,w,hue,ph,dy)=>{g.strokeStyle=`hsla(${hue},90%,68%,${alpha})`;g.lineWidth=w;g.beginPath();
        for(let i=0;i<=90;i++){const u=i/90,x=S.x0+u*S.SW,e=env(u);const y=S.y+(dy||0)+Math.sin(u*TAU*3.5-t*7+(ph||0))*amp*e;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();};
      if(t<1.45){[.15,.6,1.05].forEach(n=>{const c=(t-n)/.55;if(c<0||c>1.2)return;line(u=>Math.exp(-Math.pow((u-c)*7,2)),A*.8,.9,2,200,0);});}
      else{const e=ss(1.45,1.8,t);
        line(u=>u<.5?.25:0,A*.5,.5,1.5,200,0);   // dry, going in
        g.globalCompositeOperation='lighter';
        line(u=>u>.5?Math.sin((u-.5)*2*Math.PI*.5+.2)*e:0,A*1.6,.18,S.SH*.12,200+t*40,0);   // reverb glow
        for(let k=3;k>=0;k--)line(u=>u>.5?(1-(u-.5)*.6)*e*Math.pow(.62,k):0,A,.85*Math.pow(.6,k),3-k*.5,190+k*35+t*30,-k*.9,k*S.SH*.05*(k%2?1:-1));   // the echoes
        g.globalCompositeOperation='source-over';}},
    sound(S,t){const c=S.c;
      [0,3,7].forEach((s,i)=>inst(S,'pluck',t+.15+i*.45,cents(s),.75));
      noise(S,t+1.0,{f0:300,f1:4200,q:2,a:.06,k:.42,d:.1});
      // the same notes through a feedback echo and a big reverb
      const d=c.createDelay(1),fb=c.createGain(),lp=c.createBiquadFilter(),inG=c.createGain();d.delayTime.value=.23;fb.gain.value=.52;lp.type='lowpass';lp.frequency.value=2600;
      inG.connect(S.out);inG.connect(d);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(S.out);const sv=c.createGain();sv.gain.value=.9;inG.connect(sv);sv.connect(S.send);
      [0,3,7,10,12,15].forEach((s,i)=>inst(S,'pluck',t+1.45+i*.115,cents(s),.7,inG));
      setTimeout(()=>{try{fb.gain.setTargetAtTime(0,c.currentTime,.3);}catch(e){}},5200);},
  });

  // ── Key: a C major scale climbs the keyboard and lands on a staff, then the chord rings ──
  const SCALE=[0,2,4,5,7,9,11,12];
  const H_KEY=hubScene({vol:0.55,icon:'🎼',col:'#ffd25a',title:'KEY',sub:'Your melodies now play in key',
    demo(st,t,g,S){const n=15,kw=S.SW/n,ky=S.y+S.SH*.12,kh=S.SH*.36,sy=S.y-S.SH*.34,ls=S.SH*.055;
      // the staff
      g.strokeStyle='rgba(255,236,190,.4)';g.lineWidth=1.5;for(let i=0;i<5;i++){g.beginPath();g.moveTo(S.x0,sy+i*ls);g.lineTo(S.x1,sy+i*ls);g.stroke();}
      const lit=new Array(n).fill(0),white=[0,2,4,5,7,9,11];const wIdx=s=>{const o=Math.floor(s/12),r=s-o*12;return o*7+white.indexOf(r);};
      SCALE.forEach((s,i)=>{const t0=.12+i*.16,q=t-t0;if(q<0)return;const k=wIdx(s);lit[k]=Math.max(lit[k],Math.max(0,1-q/.35));
        const x=S.x0+S.SW*(.08+i*.08),y=sy+4*ls-k*ls*.5+ls*1.0,p=eBack(Math.min(1,q/.2));g.fillStyle=rgba('#fff3c4',.95);g.beginPath();g.ellipse(x,y,ls*.62*p,ls*.45*p,-.35,0,TAU);g.fill();
        g.strokeStyle=rgba('#fff3c4',.9);g.lineWidth=1.6;g.beginPath();g.moveTo(x+ls*.55,y);g.lineTo(x+ls*.55,y-ls*3*p);g.stroke();});
      if(t>1.45){const q=t-1.45;[0,4,7,12].forEach(s=>{const k=wIdx(s);lit[k]=Math.max(lit[k],.55+.45*Math.max(0,1-q/.6));});
        [0,2,4,7].forEach((k,i)=>{const x=S.x0+S.SW*.82,y=sy+4*ls-k*ls*.5+ls*1.0;g.fillStyle=rgba('#ffd25a',ss(1.45,1.6,t));g.beginPath();g.ellipse(x,y,ls*.62,ls*.45,-.35,0,TAU);g.fill();});
        const ar=[12,16,19,24,19,16,12,7];ar.forEach((s,i)=>{const q2=t-(1.95+i*.16);if(q2<0)return;const k=wIdx(s-12);if(k>=0&&k<n)lit[k]=Math.max(lit[k],Math.max(0,1-q2/.3));});}
      for(let i=0;i<n;i++){const x=S.x0+i*kw;rrect(g,x+1,ky,kw-2,kh,4);g.fillStyle=lit[i]>0?`rgba(255,${230-60*lit[i]},${150-120*lit[i]},1)`:'#e8ecf6';g.fill();
        if(lit[i]>0){g.globalCompositeOperation='lighter';glow(x+kw/2,ky,kw*1.6*lit[i],'#ffd25a',.6*lit[i]);g.globalCompositeOperation='source-over';}}
      [1,2,4,5,6,8,9,11,12,13].forEach(i=>{g.fillStyle='#141824';rrect(g,S.x0+i*kw-kw*.3,ky,kw*.6,kh*.6,3);g.fill();});
      if(t>1.5){if(!st.mo)st.mo=[];if(Math.random()<st.dt*30)st.mo.push({b:t,x:S.x0+S.SW*rnd(.05,.6),v:rnd(.6,1.2)});
        g.globalCompositeOperation='lighter';st.mo.forEach(m=>{const q=(t-m.b)/1.2;if(q>1)return;glow(m.x,ky-q*S.SH*.55*m.v,st.U*.012,'#ffd25a',.8*(1-q));});g.globalCompositeOperation='source-over';}},
    sound(S,t){SCALE.forEach((s,i)=>inst(S,'bell',t+.12+i*.16,-900+s*100,.6));
      [0,400,700,1200].forEach(c2=>inst(S,'stab',t+1.45,c2,.35));[0,4,7].forEach(s=>tone(S,t+1.45,130.81*SM(s),{type:'triangle',a:.04,k:.08,d:2,rv:.5}));
      [12,16,19,24,19,16,12,7].forEach((s,i)=>inst(S,'bell',t+1.95+i*.16,-900+s*100,.45));},
  });

  // ── Piano Roll: notes drop into the grid, then the playhead plays them ──
  const ROLL_NOTES=[[0,2,2],[2,4,2],[4,5,1],[5,4,1],[6,2,2],[8,3,2],[10,4,1],[11,5,1],[12,7,4]];
  const ROLL_PITCH=[0,2,4,7,9,12,14,16];   // rows, low → high: C major pentatonic
  const H_PIANO=hubScene({vol:1.85,icon:'🎹',col:'#ff7ad9',title:'PIANO ROLL',sub:'Write melodies and chords with real notes',
    demo(st,t,g,S){const cols=16,rows=8,gx=S.x0+S.SW*.06,gw=S.SW*.94,cw=gw/cols,gh=S.SH*.95,rh=gh/rows,gy=S.y-gh/2;
      g.fillStyle='rgba(20,14,40,.75)';rrect(g,S.x0,gy,S.SW,gh,8);g.fill();
      for(let r=0;r<rows;r++){g.fillStyle=r%2?'rgba(255,255,255,.035)':'rgba(255,255,255,0)';g.fillRect(gx,gy+r*rh,gw,rh);
        g.fillStyle=[0,5].includes(r)?'#ffd8f0':'#c7b8e8';rrect(g,S.x0+2,gy+(rows-1-r)*rh+2,S.SW*.06-4,rh-4,3);g.fill();}
      g.strokeStyle='rgba(255,255,255,.08)';g.lineWidth=1;for(let c=0;c<=cols;c++){g.beginPath();g.moveTo(gx+c*cw,gy);g.lineTo(gx+c*cw,gy+gh);g.lineWidth=c%4?1:2;g.stroke();}
      const ph=t>1.45?(t-1.45)/.125:-1;
      ROLL_NOTES.forEach(([c,r,l],i)=>{const t0=.1+i*.13,q=t-t0;if(q<0)return;const drop=eBack(Math.min(1,q/.3)),x=gx+c*cw+1,y=lerp(gy-S.SH*.3,gy+(rows-1-r)*rh,drop)+1,hit=ph>=c&&ph<c+l;
        const fl=ph>=c?Math.max(0,1-(ph-c)*.18):0;g.fillStyle=hit?'#ffffff':`hsl(${320-r*14},90%,${62+fl*20}%)`;rrect(g,x,y,cw*l-2,rh-2,4);g.fill();
        if(hit){g.globalCompositeOperation='lighter';glow(x+cw*l/2,y+rh/2,cw*l,'#ff7ad9',.6);g.globalCompositeOperation='source-over';}});
      if(ph>=0&&ph<=16){const x=gx+ph*cw;g.strokeStyle='#ffffff';g.lineWidth=2.5;g.beginPath();g.moveTo(x,gy-4);g.lineTo(x,gy+gh+4);g.stroke();g.globalCompositeOperation='lighter';glow(x,S.y,S.SH*.4,'#ff7ad9',.25);g.globalCompositeOperation='source-over';}},
    sound(S,t){ROLL_NOTES.forEach(([c,r,l],i)=>tone(S,t+.1+i*.13+.2,2200,{type:'sine',a:.012,d:.05}));
      ROLL_NOTES.forEach(([c,r,l])=>keyz(S,t+1.45+c*.125,523.25*SM(ROLL_PITCH[r]),l*.125,.07));
      [[0,[0,4,7]],[8,[-7,-3,0]]].forEach(([c,ch])=>ch.forEach(s=>tone(S,t+1.45+c*.125,261.63*SM(s),{type:'sine',a:.035,k:.06,hold:.8,d:.6,rv:.5})));},
  });

  // ── Groove: a step grid gets programmed, then plays with velocity on the hats ──
  const GR={kick:[0,3,8,10],snare:[4,12],hihat:[0,2,4,6,8,10,12,14,15],clap:[12,14]},GR_ROWS=['kick','snare','hihat','clap'],GR_COL=['#ff5a5a','#ffd23f','#3fe6ff','#ff5fb8'];
  const VEL=[1,.35,.7,.35,1,.35,.7,.4,1,.35,.7,.35,1,.45,.75,.6];
  const H_GROOVE=hubScene({vol:0.8,icon:'🥁',col:'#ff9a2e',title:'GROOVE',sub:'The rhythm hub: velocity and more',
    demo(st,t,g,S){const cols=16,cw=S.SW/cols,rh=S.SH*.17,gy=S.y-S.SH*.42,ph=t>1.45?(t-1.45)/.125:-1;
      let n=0;GR_ROWS.forEach((row,ri)=>{for(let c=0;c<cols;c++){const on=GR[row].includes(c),x=S.x0+c*cw,y=gy+ri*rh*1.12,t0=on?.1+(n++)*.065:0,live=on&&t>t0,hit=live&&Math.floor(ph)===c;
        const sc=hit?1.12:1;rrect(g,x+cw*.1-(sc-1)*cw/2,y-(sc-1)*rh/2,cw*.8*sc,rh*sc,5);g.fillStyle=live?(hit?'#ffffff':GR_COL[ri]):(c%4?'rgba(255,255,255,.07)':'rgba(255,255,255,.13)');g.fill();
        if(hit){g.globalCompositeOperation='lighter';glow(x+cw/2,y+rh/2,cw*1.4,GR_COL[ri],.6);g.globalCompositeOperation='source-over';}}});
      // velocity bars for the hats
      const by=gy+4*rh*1.12+S.SH*.05,bh=S.SH*.22;for(let c=0;c<cols;c++){if(!GR.hihat.includes(c))continue;const hit=Math.floor(ph)===c,v=VEL[c]*ss(.5,1.3,t)*(hit?1.15:1);
        g.fillStyle=hit?'#ffffff':`rgba(63,230,255,${.45+.4*VEL[c]})`;rrect(g,S.x0+c*cw+cw*.25,by+bh*(1-v),cw*.5,bh*v,3);g.fill();}
      if(ph>=0&&ph<16){const x=S.x0+ph*cw;g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x,gy-6,cw,S.SH*.9);}},
    sound(S,t){let n=0;GR_ROWS.forEach(row=>GR[row].forEach(()=>{tone(S,t+.1+(n++)*.065,1600,{type:'square',a:.008,d:.02});}));
      for(let i=0;i<6;i++)inst(S,'snare',t+.95+i*.08,0,.25+i*.08);
      GR_ROWS.forEach(row=>GR[row].forEach(c=>inst(S,row,t+1.45+c*.125,0,row==='hihat'?VEL[c]*.8:.85)));
      GR_ROWS.forEach(row=>GR[row].forEach(c=>{if(c<8)inst(S,row,t+1.45+2+c*.125,0,row==='hihat'?VEL[c]*.6:.6);}));},
  });

  // ── Mastering: a muffled loop gets polished open (the EQ smiles, the meters jump, a shine runs over the disc) ──
  const H_MASTER=hubScene({icon:'💽',col:'#b39cff',title:'MASTERING',sub:'EQ, compression, panning and sidechain',
    demo(st,t,g,S){const after=ss(1.45,1.8,t),R=S.SH*.36,x=S.cx,y=S.y-S.SH*.08,spin=t*(1.5+3*after);
      // the disc
      g.save();g.translate(x,y);g.rotate(spin);g.fillStyle='#14121f';disc(0,0,R);
      for(let i=1;i<8;i++){g.strokeStyle=`rgba(${120+100*after},${110+90*after},${170+60*after},${.18+.15*after})`;g.lineWidth=1;g.beginPath();g.arc(0,0,R*(.35+i*.085),0,TAU);g.stroke();}
      g.fillStyle=after>0?`hsl(${260+60*after},70%,${45+20*after}%)`:'#3a3550';disc(0,0,R*.3);g.fillStyle='#0a0a12';disc(0,0,R*.05);g.restore();
      if(t>1.45&&t<2.4){const q=(t-1.45)/.95;g.save();g.beginPath();g.arc(x,y,R,0,TAU);g.clip();const sx=x-R*1.4+q*R*2.8,k=g.createLinearGradient(sx-R*.3,0,sx+R*.3,0);k.addColorStop(0,'rgba(255,255,255,0)');k.addColorStop(.5,'rgba(255,255,255,.55)');k.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=k;g.fillRect(x-R,y-R,R*2,R*2);g.restore();}
      // the EQ curve: flat and grey, then a glowing smile
      const ey=S.y+S.SH*.42;g.lineWidth=3;g.strokeStyle=after>0?`hsla(${270+80*after},90%,70%,${.5+.5*after})`:'rgba(180,180,200,.45)';g.beginPath();
      for(let i=0;i<=60;i++){const u=i/60,bump=(Math.pow(1-u,4)*1.1+Math.pow(u,5)*.9-.15)*after,wob=Math.sin(u*14+t*3)*.03*after,yy=ey-(bump+wob)*S.SH*.28;i?g.lineTo(S.x0+u*S.SW,yy):g.moveTo(S.x0,yy);}g.stroke();
      // two VU meters
      const lvl=(.18+.1*Math.abs(Math.sin(t*9)))*(1-after)+(.55+.35*Math.abs(Math.sin(t*7.6)))*after;
      [-1,1].forEach(sd=>{const mx=x+sd*S.SW*.38,my=y+R*.45,mr=S.SH*.2;g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.beginPath();g.arc(mx,my,mr,Math.PI*1.15,Math.PI*1.85);g.stroke();
        g.strokeStyle='#ff5a5a';g.beginPath();g.arc(mx,my,mr,Math.PI*1.72,Math.PI*1.85);g.stroke();
        const a=Math.PI*(1.15+.7*cl(lvl+(sd>0?.04:0),0,1));g.strokeStyle='#ffffff';g.lineWidth=2.5;g.beginPath();g.moveTo(mx,my);g.lineTo(mx+Math.cos(a)*mr*1.05,my+Math.sin(a)*mr*1.05);g.stroke();});},
    vol:.63,
    sound(S,t){const c=S.c,lp=c.createBiquadFilter(),vg=c.createGain(),cp=c.createDynamicsCompressor();lp.type='lowpass';lp.Q.value=.8;lp.frequency.setValueAtTime(480,t);lp.frequency.setValueAtTime(480,t+1.45);lp.frequency.exponentialRampToValueAtTime(16000,t+1.75);
      vg.gain.setValueAtTime(.5,t);vg.gain.setValueAtTime(.5,t+1.45);vg.gain.linearRampToValueAtTime(.95,t+1.7);vg.gain.setValueAtTime(.95,t+3.6);vg.gain.linearRampToValueAtTime(0,t+4.2);
      cp.threshold.value=-20;cp.ratio.value=3;lp.connect(cp);cp.connect(vg);vg.connect(S.out);
      const B=.5;for(let b=0;b<7;b++){const s=t+.05+b*B;inst(S,'kick',s,0,.9,lp);inst(S,'hihat',s+B/2,0,.6,lp);if(b%2)inst(S,'snare',s,0,.7,lp);inst(S,'basenote',s,[-200,-200,300,500][b%4],.8,lp);if(b%2===0)[0,4,7].forEach(x=>inst(S,'stab',s,cents(x+[0,0,-7,-5][b%4]),.25,lp));}},
  });

  // ── Arrangement: pattern blocks fly in and snap into lanes; then the song plays and builds bar by bar ──
  const LANES=[['🥁','#ff5a5a'],['🎸','#ffd23f'],['🎹','#3fe6ff'],['🎵','#ff7ad9']];
  const BLOCKS=[[0,0],[0,1],[0,2],[0,3],[1,1],[1,2],[1,3],[2,2],[2,3],[3,3]];   // [lane, bar]: the drums play all song, then bass, chords, melody join in
  const H_ARR=hubScene({vol:0.5,icon:'🎬',col:'#44aaff',title:'ARRANGEMENT',sub:'Build whole songs out of your patterns',
    demo(st,t,g,S){const lx=S.x0+S.SW*.1,lw=S.SW*.9,bw=lw/4,lh=S.SH*.2,gy=S.y-S.SH*.45,ph=t>1.45?(t-1.45)/.5:-1;
      LANES.forEach(([ic,col],i)=>{const y=gy+i*lh*1.12;g.fillStyle='rgba(255,255,255,.05)';rrect(g,lx,y,lw,lh,6);g.fill();emoji(g,ic,S.x0+S.SW*.05,y+lh/2,lh*.6);});
      BLOCKS.forEach(([ln,bar],i)=>{const t0=.1+i*.12,q=t-t0;if(q<0)return;const k=eOut(Math.min(1,q/.3)),x=lerp(S.x1+S.SW*.3,lx+bar*bw,k),y=gy+ln*lh*1.12,hit=ph>=bar&&ph<bar+1,col=LANES[ln][1];
        rrect(g,x+2,y+2,bw-4,lh-4,6);g.fillStyle=hit?'#ffffff':col;g.globalAlpha=hit?1:.85;g.fill();g.globalAlpha=1;
        g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1.5;g.beginPath();for(let j=0;j<6;j++){const xx=x+bw*.12+j*bw*.14,h=lh*(.2+.25*Math.abs(Math.sin(j*1.7+ln+bar)));g.moveTo(xx,y+lh/2-h);g.lineTo(xx,y+lh/2+h);}g.stroke();
        if(hit){g.globalCompositeOperation='lighter';glow(x+bw/2,y+lh/2,bw*.8,col,.5);g.globalCompositeOperation='source-over';}});
      if(ph>=0&&ph<=4){const x=lx+ph*bw;g.strokeStyle='#ffffff';g.lineWidth=2.5;g.beginPath();g.moveTo(x,gy-6);g.lineTo(x,gy+4*lh*1.12);g.stroke();}},
    sound(S,t){BLOCKS.forEach((b,i)=>{const s=t+.1+i*.12;noise(S,s,{f0:1500,f1:600,q:2,a:.03,d:.12});tone(S,s+.28,180,{f1:120,gl:.05,a:.05,d:.06});});
      const T0=t+1.45,B=.25;for(let bar=0;bar<4;bar++)for(let b=0;b<2;b++){const s=T0+bar*.5+b*B;inst(S,'kick',s,0,.85);
        if(bar>=1){inst(S,'hihat',s+B/2,0,.6);inst(S,'basenote',s,[-200,700,300,500][bar],.75);}
        if(bar>=2&&b===0)[0,4,7].forEach(x=>inst(S,'stab',s,cents(x+[0,-3,-7,-5][bar]),.25));
        if(bar>=3)inst(S,'bell',s,[300,700][b]+0,.45);
        if(b===1&&bar>=1)inst(S,'clap',s,0,.55);}},
  });

  // ── Vocals: tap tap on the mic, a take records, then the voice is harmonised into a choir ──
  const H_VOX=hubScene({vol:2.0,icon:'🎤',col:'#ff5fb8',title:'VOCALS',sub:'Record your voice on its own layers',
    demo(st,t,g,S){const mx=S.cx,my=S.y-S.SH*.12,mr=S.SH*.2,tap=[.15,.4].reduce((a,b)=>Math.max(a,t>b&&t<b+.15?1-(t-b)/.15:0),0);
      // the take: a waveform ribbon scrolling behind the mic (one voice before, three in harmony after)
      const env=x=>{const vv=t<.65?0:t<1.45?.5+.3*Math.sin(t*9):.85;return vv*(.55+.45*Math.sin(x*.05+t*4));};
      const voices=t>1.45?[[330,0],[300,-S.SH*.08],[360,S.SH*.08]]:[[330,0]];
      voices.forEach(([h,dy],vi)=>{g.strokeStyle=`hsla(${h},90%,70%,${vi?.6*ss(1.45,1.8,t):.9})`;g.lineWidth=2;g.beginPath();
        for(let i=0;i<=120;i++){const u=i/120,x=S.x0+u*S.SW,a=env(i+vi*9)*S.SH*.2*(u<.5?u*2:1),y=S.y+S.SH*.28+dy+Math.sin(u*80-t*14+vi)*a*Math.sin(u*9+t);i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();});
      // the microphone
      const bob=tap*S.SH*.03;g.fillStyle='#2a2d3a';rrect(g,mx-mr*.28,my+mr*.9+bob,mr*.56,mr*1.2,mr*.2);g.fill();
      const k=g.createLinearGradient(mx-mr,my-mr,mx+mr,my+mr);k.addColorStop(0,'#f2f4fa');k.addColorStop(1,'#8a90a2');g.fillStyle=k;g.beginPath();g.ellipse(mx,my+bob,mr*.72,mr*.95,0,0,TAU);g.fill();
      g.save();g.beginPath();g.ellipse(mx,my+bob,mr*.72,mr*.95,0,0,TAU);g.clip();g.strokeStyle='rgba(40,44,60,.45)';g.lineWidth=1;for(let i=-6;i<=6;i++){g.beginPath();g.moveTo(mx+i*mr*.14-mr,my-mr+bob);g.lineTo(mx+i*mr*.14+mr,my+mr+bob);g.stroke();g.beginPath();g.moveTo(mx+i*mr*.14+mr,my-mr+bob);g.lineTo(mx+i*mr*.14-mr,my+mr+bob);g.stroke();}g.restore();
      g.fillStyle='#c9ced9';rrect(g,mx-mr*.78,my+mr*.35+bob,mr*1.56,mr*.16,4);g.fill();
      if(t<1.45&&t>.6&&Math.sin(t*10)>-.2){g.fillStyle='#ff3b3b';disc(S.x0+S.SW*.06,S.y-S.SH*.42,st.U*.014);g.fillStyle='rgba(255,255,255,.75)';g.font=`${Math.round(st.U*.035)}px 'Bebas Neue',sans-serif`;g.textAlign='left';g.textBaseline='middle';g.fillText('REC',S.x0+S.SW*.06+st.U*.025,S.y-S.SH*.42);}
      if(t>1.5){if(!st.nt)st.nt=[];if(Math.random()<st.dt*9)st.nt.push({b:t,a:rnd(-1,1),gl:'♪♫'[Math.floor(rnd(0,2))]});
        st.nt.forEach(n=>{const q=(t-n.b)/1.3;if(q>1)return;g.fillStyle=`hsla(${320+n.a*30},90%,72%,${1-q})`;g.font=`${Math.round(st.U*.05)}px sans-serif`;g.textAlign='center';g.fillText(n.gl,mx+n.a*mr*2.2*q+n.a*mr*.6,my-mr*.8-q*S.SH*.5);});}},
    sound(S,t){[.15,.4].forEach(s=>{noise(S,t+s,{type:'lowpass',f0:700,q:.7,a:.25,d:.08});tone(S,t+s,90,{f1:50,gl:.06,a:.2,d:.1});});
      [[.7,700],[.95,1000],[1.2,1200]].forEach(([s,c2])=>inst(S,'choir',t+s,c2,.55));   // E3 G3 A3, then chords from C3 (+300 cents from the choir's A2)
      [[1.45,[0,4,7]],[1.95,[2,5,9]],[2.45,[-1,2,7]],[2.95,[0,4,7,12]]].forEach(([s,ch])=>ch.forEach(x=>inst(S,'choir',t+s,300+x*100,.42)));},
  });

  // ── Vocal Chops: scissors slice a take into pieces, they fly onto pads, and the pads play them back chopped ──
  const CHOP_SEQ=[0,0,3,0,5,0,3,7,0,0,3,0,6,5,3,1],CHOP_PITCH=[0,2,4,5,7,9,11,12];
  const H_CHOPS=hubScene({vol:2.1,icon:'✂️',col:'#5fe07a',title:'VOCAL CHOPS',sub:'Slice a vocal take into chops for your pads',
    demo(st,t,g,S){const wy=S.y-S.SH*.3,wh=S.SH*.3,n=8,sw=S.SW/n,fly=eOut(ss(1.45,1.85,t)),pw=S.SW*.2,gap=S.SW*.04,px0=S.cx-(4*pw+3*gap)/2,py0=S.y+S.SH*.02;
      const ph=t>1.55?Math.floor((t-1.55)/.125):-1,hitPad=ph>=0&&ph<16?CHOP_SEQ[ph]:-1;
      for(let i=0;i<n;i++){const ox=S.x0+i*sw,oy=wy,col=i%4,row=Math.floor(i/4),tx=px0+col*(pw+gap),ty=py0+row*(pw*.62+gap),x=lerp(ox,tx,fly),y=lerp(oy,ty,fly),w=lerp(sw,pw,fly),h=lerp(wh,pw*.62,fly),hit=hitPad===i;
        rrect(g,x+1,y,w-2,h,lerp(2,8,fly));g.fillStyle=hit?'#ffffff':`hsla(${110+i*18},70%,${fly>0?40:25}%,${.55+.4*fly})`;g.fill();
        g.strokeStyle=hit?'#16301c':'rgba(220,255,225,.85)';g.lineWidth=1.4;g.beginPath();for(let j=0;j<=14;j++){const u=j/14,xx=x+4+u*(w-8),a=h*.38*Math.abs(Math.sin(i*1.9+j*.8))*Math.sin(j*2.3+i);j?g.lineTo(xx,y+h/2+a):g.moveTo(xx,y+h/2+a);}g.stroke();
        if(hit){g.globalCompositeOperation='lighter';glow(x+w/2,y+h/2,w*.9,'#5fe07a',.6);g.globalCompositeOperation='source-over';}}
      // the scissors, and the cut lines they leave
      const sc=ss(.2,1.25,t);for(let i=1;i<n;i++){const cx=S.x0+i*sw,cut=sc*n>i;if(cut&&fly<.2){g.strokeStyle=`rgba(255,255,255,${.9*(1-fly*5)})`;g.lineWidth=2;g.beginPath();g.moveTo(cx,wy-6);g.lineTo(cx,wy+wh+6);g.stroke();}}
      if(t<1.4)emoji(g,'✂️',S.x0+sc*S.SW,wy+wh/2,st.U*.09,1-ss(1.25,1.4,t));},
    sound(S,t){for(let i=1;i<8;i++){const s=t+.2+1.05*i/8;noise(S,s,{type:'highpass',f0:5200,a:.12,d:.035});tone(S,s,2800,{a:.02,d:.03});}
      noise(S,t+1.45,{f0:800,f1:3000,q:1.5,a:.05,d:.3});
      CHOP_SEQ.forEach((p,i)=>{const s=t+1.55+i*.125;inst(S,'choir',s,300+CHOP_PITCH[p]*100,.6,gate(S,s,.09,1));});},
  });

  const HUBS={mt_effects:H_EFFECTS,mt_key:H_KEY,mt_piano:H_PIANO,mt_groove:H_GROOVE,mt_mastering:H_MASTER,mt_arrangement:H_ARR,mt_vocals:H_VOX,mt_chops:H_CHOPS};

  // ══════════════════════ CONTINENTS (short) ══════════════════════
  // the planet turns, the continent swings to the front and lights up, its first sound plays
  function continentScene(id,node){
    const pid=node.requires&&node.requires[0],planet=typeof SKILL_MAP!=='undefined'&&SKILL_MAP[pid];if(!planet||!/^planet_/.test(pid))return null;
    const T=K.planetTheme(pid),snd=(node.sounds||[])[0],n=(node.sounds||[]).length;
    return{col:T.col,vol:1,dur:2.6,tIn:.6,tOut:2.05,kicker:planet.name.toUpperCase(),title:node.name.replace(/^Continent:\s*/i,'').toUpperCase(),sub:n?`${n} sound${n>1?'s':''} to discover`:'',
      init(st){st.rot0=rnd(0,TAU);st.tilt=rnd(.25,.4);T.init&&T.init(st);},
      draw(st,t){const g=st.g,{W,H,U}=st,x=st.cx,y=H*.37,push=eOut(ss(0,.6,t)),out=ss(2.15,2.6,t),r=Math.min(U*.34,H*.22)*(.85+.25*push)*(1+out*.8),tt=t+1.6;
        space(st,T.col,.18+.15*push,0,0);
        const rot=st.rot0+t*.3,lon=st.rot0+.55*.3+.1;   // the continent faces us, a little right of centre, when it lights up (t = .55)
        T.back&&T.back(st,x,y,r,tt);
        globe(st,T,x,y,r,rot,tt,()=>{const s=sph(lon,.18,rot,st.tilt);if(s.z<.05)return;const px=x+s.x*r,py=y+s.y*r,q=t-.5,on=ss(.45,.6,t);
          g.globalCompositeOperation='lighter';glow(px,py,r*.6*on,T.atm,.55*on);glow(px,py,r*.16*on*(1+.15*Math.sin(t*6)),'#ffffff',.7*on);g.globalCompositeOperation='source-over';
          if(q>0)for(let k=0;k<3;k++){const qq=(q-k*.18)/.9;if(qq>0&&qq<1)ring(px,py,r*(.05+.9*eOut(qq)),2.5,'#ffffff',.85*(1-qq));}});
        // its sound rippling out past the planet
        const q=t-.55;if(q>0)for(let k=0;k<4;k++){const qq=(q-k*.22)/1.1;if(qq>0&&qq<1)ring(x,y,r*(1.05+eOut(qq)*.9),2,T.atm,.5*(1-qq));}
        T.outer&&T.outer(st,x,y,r,tt);
        flash(st,t>.5?Math.max(0,.3*(1-(t-.5)/.3)):0,'#ffffff');},
      shake(t){return t>.52&&t<.8?5*(1-(t-.52)/.28):0;},
      sound(S){const t=S.t;noise(S,t,{f0:400,f1:2400,q:1.2,a:.04,k:.5,d:.15});tone(S,t+.5,880,{a:.05,d:.9,rv:.7});tone(S,t+.5,1318.5,{a:.03,d:.7,rv:.7});tone(S,t+.5,90,{f1:45,gl:.3,a:.25,d:.5});
        if(snd)inst(S,snd,t+.58,0,.95);},
    };
  }

  // ══════════════════════ MINIGAME WORLDS ══════════════════════
  const MG='#ff6644';
  function world(cfg){
    return{col:cfg.col||MG,vol:cfg.vol||.8,kicker:cfg.kicker,title:cfg.title,sub:cfg.sub,
      init(st){st.S=stage(st);cfg.init&&cfg.init(st);},
      draw(st,t){const g=st.g;cfg.bg?cfg.bg(st,t,g):space(st,cfg.col||MG,.18,0,0);const out=ss(3.6,4.25,t);
        g.save();const z=1+out*.1;g.translate(st.W/2,st.H*.4);g.scale(z,z);g.translate(-st.W/2,-st.H*.4);cfg.draw(st,t,g,st.S);g.restore();
        cfg.flash&&flash(st,cfg.flash(t),cfg.flashCol||'#ffffff');},
      shake:cfg.shake,sound(S){cfg.sound(S,S.t);},
    };
  }
  // a little rocket
  function rocket(g,x,y,s,a,flame,t){g.save();g.translate(x,y);g.rotate(a||0);
    if(flame>0){const fl=s*(.9+.35*Math.sin(t*40))*flame;const k=g.createLinearGradient(0,s*.55,0,s*.55+fl);k.addColorStop(0,'#fff6c0');k.addColorStop(.4,'#ffb030');k.addColorStop(1,'rgba(255,60,30,0)');g.fillStyle=k;
      g.beginPath();g.moveTo(-s*.16,s*.5);g.quadraticCurveTo(0,s*.55+fl*1.1,s*.16,s*.5);g.fill();}
    g.fillStyle='#ff4a4a';g.beginPath();g.moveTo(-s*.2,s*.2);g.lineTo(-s*.38,s*.55);g.lineTo(-s*.16,s*.48);g.fill();g.beginPath();g.moveTo(s*.2,s*.2);g.lineTo(s*.38,s*.55);g.lineTo(s*.16,s*.48);g.fill();
    g.fillStyle='#f2f4fa';g.beginPath();g.ellipse(0,0,s*.22,s*.55,0,0,TAU);g.fill();
    g.fillStyle='#ff4a4a';g.beginPath();g.ellipse(0,-s*.3,s*.18,s*.27,0,Math.PI,TAU);g.fill();
    g.fillStyle='#3fa9ff';disc(0,-s*.04,s*.1);g.strokeStyle='#c9d2e6';g.lineWidth=s*.03;g.beginPath();g.arc(0,-s*.04,s*.1,0,TAU);g.stroke();g.restore();}
  // v0.2.154: craters are shaded bowls (shadow inside on the lit side, a bright rim on the far side)
  function crater(g,x,y,r,a){
    g.fillStyle=`rgba(40,40,62,${a})`;g.beginPath();g.ellipse(x,y,r,r*.55,0,0,TAU);g.fill();
    const k=g.createLinearGradient(x-r,y-r*.5,x+r,y+r*.5);k.addColorStop(0,`rgba(10,10,24,${a*.9})`);k.addColorStop(.6,`rgba(10,10,24,0)`);g.fillStyle=k;g.beginPath();g.ellipse(x,y,r*.92,r*.5,0,0,TAU);g.fill();
    g.strokeStyle=`rgba(255,255,255,${a*.55})`;g.lineWidth=Math.max(1.2,r*.08);g.beginPath();g.ellipse(x,y,r,r*.55,0,-Math.PI*.15,Math.PI*.75);g.stroke();
    g.strokeStyle=`rgba(0,0,0,${a*.35})`;g.lineWidth=Math.max(1,r*.06);g.beginPath();g.ellipse(x,y,r,r*.55,0,Math.PI*.85,Math.PI*1.7);g.stroke();}
  // a giant ringed planet hanging in the sky (depth for the moon / world scenes)
  function skyGiant(g,x,y,r,body,dark,ringCol,a){if(r<2||a<=0)return;g.save();g.globalAlpha=a;
    const half=front=>{g.save();g.translate(x,y);g.rotate(-.3);g.strokeStyle=ringCol;g.lineWidth=r*.12;g.beginPath();g.ellipse(0,0,r*1.9,r*.42,0,front?0:Math.PI,front?Math.PI:TAU);g.stroke();
      g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=r*.025;g.beginPath();g.ellipse(0,0,r*1.78,r*.39,0,front?0:Math.PI,front?Math.PI:TAU);g.stroke();g.restore();};
    half(false);
    const k=g.createRadialGradient(x-r*.45,y-r*.45,r*.1,x,y,r);k.addColorStop(0,'#ffffff');k.addColorStop(.25,body);k.addColorStop(1,dark);g.fillStyle=k;disc(x,y,r);
    g.save();g.beginPath();g.arc(x,y,r,0,TAU);g.clip();g.globalAlpha=a*.35;[-.45,-.1,.3,.6].forEach((dy,i)=>{g.fillStyle=i%2?dark:'#ffffff';g.fillRect(x-r,y+dy*r,r*2,r*(i%2?.16:.08));});g.restore();
    g.globalAlpha=a;half(true);g.restore();}
  // the glowing edge of a world's horizon (atmosphere seen edge-on)
  function horizonGlow(g,cx,cy,R,col,a){g.save();g.globalCompositeOperation='lighter';g.strokeStyle=rgba(col,.55*a);g.lineWidth=6;g.beginPath();g.arc(cx,cy,R+2,Math.PI*1.05,Math.PI*1.95);g.stroke();
    g.strokeStyle=rgba(col,.2*a);g.lineWidth=22;g.beginPath();g.arc(cx,cy,R+10,Math.PI*1.05,Math.PI*1.95);g.stroke();g.restore();}

  // ── Minigame Cockpit: lift-off, a quick flight, and a soft landing on the moon Luna ──
  const MG_COCKPIT=world({vol:1.75,kicker:'MINIGAMES',title:'MINIGAME COCKPIT',sub:'Planet Hop opens on Luna · levels 1–5',
    init(st){st.smoke=[];st.fs=[];for(let i=0;i<70;i++)st.fs.push({x:Math.random(),y:Math.random(),l:rnd(.3,1)});},
    bg(st,t,g){const sp=t<.8?0:t<1.6?ss(.8,1.2,t):1-ss(1.6,2.1,t);g.fillStyle='#04050d';g.fillRect(-50,-50,st.W+100,st.H+100);
      g.strokeStyle='rgba(220,235,255,.7)';g.lineCap='round';st.fs.forEach(s=>{s.y+=st.dt*sp*2.2*s.l;if(s.y>1)s.y-=1;const L=2+sp*st.H*.06*s.l;g.lineWidth=s.l*1.6;g.beginPath();g.moveTo(s.x*st.W,s.y*st.H);g.lineTo(s.x*st.W,s.y*st.H-L);g.stroke();});},
    draw(st,t,g,S){const{W,H,U}=st,moonR=Math.max(W,H)*.75,ms=eOut(ss(1.35,2.0,t)),moonY=lerp(H*1.9,H*.56+moonR,ms);
      // a big blue ringed world fills the sky as we arrive (depth), then Luna rises into view
      if(ms>0)skyGiant(g,W*.78,lerp(H*.75,H*.2,ms),U*.2,'#5ab0ff','#122a5a','rgba(190,220,255,.65)',ms);
      if(ms>0){const k=g.createRadialGradient(W*.4,moonY-moonR*.9,moonR*.1,W/2,moonY,moonR);k.addColorStop(0,'#eceef6');k.addColorStop(.5,'#a8abbd');k.addColorStop(.8,'#6a6d82');k.addColorStop(1,'#3a3d52');g.fillStyle=k;disc(W/2,moonY,moonR);
        [[-.3,-.93,.06],[.12,-.97,.04],[.36,-.9,.07],[-.08,-.86,.05],[.22,-.82,.035],[-.45,-.84,.05],[.5,-.8,.045],[-.18,-.97,.025],[.02,-.92,.022],[.3,-.96,.02]].forEach(([dx,dy,r])=>crater(g,W/2+dx*moonR,moonY+dy*moonR,r*moonR,.55));
        horizonGlow(g,W/2,moonY,moonR,'#bcd4ff',ms);}
      const ground=moonY-moonR;
      // the rocket: rumble, lift-off, fly, then come down on the moon
      let ry,fl,a=0;if(t<.8){ry=H*.62+Math.sin(t*60)*1.5;fl=t>.3?.3:0;}else if(t<1.45){const q=ss(.8,1.45,t);ry=lerp(H*.62,H*.3,q*q);fl=1;}else{const q=eOut(ss(1.45,2.1,t));ry=lerp(H*.3,ground-U*.1,q);fl=t<2.1?.45:0;}
      if(t<.8||t>2.05){const sy=t<.8?H*.62+U*.11:ground;if(Math.random()<st.dt*40)st.smoke.push({x:W/2+rnd(-1,1)*U*.05,y:sy,vx:rnd(-1,1)*U*.25,vy:-rnd(.05,.2)*U,b:t,s:rnd(.6,1.2)});}
      st.smoke.forEach(p=>{const q=(t-p.b)/1.1;if(q>1)return;p.x+=p.vx*st.dt;p.y+=p.vy*st.dt;g.fillStyle=`rgba(210,214,230,${.5*(1-q)})`;disc(p.x,p.y,U*.03*p.s*(1+q*1.5));});
      if(t<.8){g.fillStyle='#3a3f55';rrect(g,W/2-U*.18,H*.62+U*.11,U*.36,U*.025,4);g.fill();}
      rocket(g,W/2,ry,U*.22,a,fl,t);
      // a hopper pops out once we've landed and bounces about
      if(t>2.3){K.buddy(W/2+U*.18+Math.sin((t-2.3)*2)*U*.06,ground-U*.005,U*.07,'#42a5f5',t,1.2,W/2,ry,ss(2.3,2.55,t));}},
    flash(t){return t>.8&&t<1.05?.25*(1-(t-.8)/.25):0;},flashCol:'#ffd8a0',
    shake(t){return t<.8?2+4*t:t<1.2?6*(1-(t-.8)/.4):t>2.05&&t<2.3?5*(1-(t-2.05)/.25):0;},
    sound(S,t){const c=S.c,lp=c.createBiquadFilter(),v=c.createGain();lp.type='lowpass';lp.frequency.setValueAtTime(220,t);lp.frequency.linearRampToValueAtTime(900,t+.8);lp.frequency.exponentialRampToValueAtTime(300,t+1.9);
      v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(.14,t+.75);v.gain.linearRampToValueAtTime(.22,t+.9);v.gain.linearRampToValueAtTime(.08,t+1.6);v.gain.linearRampToValueAtTime(0,t+2.1);lp.connect(v);v.connect(S.out);
      const b=c.createBuffer(1,c.sampleRate*2.2,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const n=c.createBufferSource();n.buffer=b;n.connect(lp);n.start(t);n.stop(t+2.2);
      boom(S,t+.8,.5);noise(S,t+.8,{f0:400,f1:3000,q:1,a:.08,k:.3,d:.4});
      tone(S,t+2.05,110,{f1:50,gl:.1,a:.3,d:.25});noise(S,t+2.05,{type:'lowpass',f0:1200,a:.15,d:.3});
      [523,659,784,1047,784,1047].forEach((f,i)=>tone(S,t+2.35+i*.09,f,{type:'square',a:.035,hold:.05,d:.05}));},
  });

  // ── Glacia: an icy world; icicles shatter, then a hopper bounces pad to pad ringing the crystal bells ──
  const GL_PADS=[.12,.34,.56,.78],GL_NOTES=[0,4,7,12];
  const MG_ICE=world({vol:.8,col:'#7fe0ff',kicker:'PLANET HOP · NEW WORLD',title:'GLACIA',sub:'Levels 6–10 · bounce pads and crystal bells',
    init(st){st.snow=[];for(let i=0;i<60;i++)st.snow.push({x:Math.random(),y:Math.random(),s:rnd(.5,1.4),v:rnd(.04,.1)});st.shard=[];st.ic=0;},
    bg(st,t,g){const{W,H}=st,k=g.createLinearGradient(0,0,0,H);k.addColorStop(0,'#030818');k.addColorStop(1,'#0b2a40');g.fillStyle=k;g.fillRect(-50,-50,W+100,H+100);
      const a=ss(.2,1.2,t);g.globalCompositeOperation='lighter';for(let b=0;b<3;b++){g.strokeStyle=`hsla(${150+b*30},90%,60%,${.14*a})`;g.lineWidth=H*.05;g.beginPath();for(let i=0;i<=30;i++){const u=i/30,x=u*W,y=H*(.12+b*.07)+Math.sin(u*5+t*.8+b)*H*.04;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}g.globalCompositeOperation='source-over';
      g.fillStyle='rgba(255,255,255,.85)';st.snow.forEach(s=>{s.y+=st.dt*s.v;if(s.y>1)s.y-=1;disc((s.x+Math.sin(t+s.y*8)*.01)*W,s.y*H,s.s*1.4);});},
    draw(st,t,g,S){const{W,U}=st,gy=S.y+S.SH*.35;
      // ice ground with crystal spikes
      const ig=g.createLinearGradient(0,gy-U*.05,0,st.H);ig.addColorStop(0,'#d8f4ff');ig.addColorStop(.12,'#6cc4e8');ig.addColorStop(.35,'#14405c');ig.addColorStop(1,'#071824');g.fillStyle=ig;g.beginPath();g.moveTo(-10,st.H);g.lineTo(-10,gy);for(let i=0;i<=24;i++){const x=i/24*W;g.lineTo(x,gy-(i%3===1?U*.05:i%3===2?U*.02:0));}g.lineTo(W+10,st.H);g.fill();
      g.fillStyle='rgba(255,255,255,.5)';g.fillRect(-10,gy,W+20,3);
      // icicles fall and shatter
      [.3,.75,1.15].forEach((s,i)=>{const x=W*[.25,.7,.48][i],q=(t-s)/.35;if(q<0)return;if(q<1){g.fillStyle='#e8f8ff';g.beginPath();const y=lerp(S.y-S.SH*.8,gy,q*q);g.moveTo(x-U*.02,y-U*.08);g.lineTo(x+U*.02,y-U*.08);g.lineTo(x,y);g.fill();}
        else if(st.ic<=i){st.ic=i+1;for(let j=0;j<12;j++){const a=rnd(-Math.PI,0),v=U*rnd(.3,.8);st.shard.push({x,y:gy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,b:t});}}});
      st.shard.forEach(p=>{const q=(t-p.b)/.8;if(q>1)return;p.vy+=U*1.5*st.dt;p.x+=p.vx*st.dt;p.y+=p.vy*st.dt;g.fillStyle=`rgba(230,250,255,${1-q})`;g.save();g.translate(p.x,p.y);g.rotate(t*8);g.fillRect(-2,-4,4,8);g.restore();});
      // bounce pads and the crystal bells hanging over them
      GL_PADS.forEach((u,i)=>{const x=S.x0+S.SW*u+S.SW*.11,by=S.y-S.SH*.25,tt=1.45+(i+1)*.42,on=t>tt?Math.max(0,1-(t-tt)/.6):0,show=ss(1.4,1.6,t);
        g.fillStyle=`rgba(127,224,255,${.6*show})`;rrect(g,x-U*.05,gy-U*.018,U*.1,U*.018,4);g.fill();
        g.strokeStyle=`rgba(200,240,255,${.4*show})`;g.lineWidth=1;g.beginPath();g.moveTo(x,S.y-S.SH*.6);g.lineTo(x,by-U*.04);g.stroke();
        g.fillStyle=on>0?`rgba(255,255,255,${.6+.4*on})`:`rgba(150,225,255,${.85*show})`;g.beginPath();g.moveTo(x,by-U*.045);g.lineTo(x+U*.03,by);g.lineTo(x,by+U*.045);g.lineTo(x-U*.03,by);g.fill();
        if(on>0){g.globalCompositeOperation='lighter';glow(x,by,U*.12*on,'#7fe0ff',.8*on);g.globalCompositeOperation='source-over';ring(x,by,U*(.04+.12*(1-on)),2,'#ffffff',on);}});
      // the hopper
      if(t>1.45){const q=(t-1.45)/.42,i=Math.min(3,Math.floor(q)),f=Math.min(1,q-i),x0=S.x0+S.SW*(i===0?0:GL_PADS[i-1])+S.SW*.11,x1=S.x0+S.SW*GL_PADS[i]+S.SW*.11,done=q>=4;
        const x=done?x1:lerp(x0,x1,f),y=done?gy:gy-Math.sin(f*Math.PI)*S.SH*.42;K.buddy(x,y,U*.075,'#b38cff',t,.4,x+20,y,1);}},
    flash(t){return t>1.42&&t<1.7?.35*(1-(t-1.42)/.28):0;},flashCol:'#d8f6ff',
    sound(S,t){noise(S,t,{f0:600,f1:1200,q:3,a:.03,k:1.2,hold:1.5,d:1.3});
      [.65,1.1,1.5].forEach(s=>{noise(S,t+s,{type:'highpass',f0:4000,a:.1,d:.25});[2093,2637,3136].forEach((f,i)=>tone(S,t+s+i*.03,f*rnd(.97,1.03),{a:.02,d:.35,rv:.6}));});
      GL_NOTES.forEach((s,i)=>{inst(S,'bell',t+1.45+i*.42+.42,-900+1200+s*100,.6);tone(S,t+1.45+i*.42+.42,220,{f1:600,gl:.08,a:.04,d:.1});});
      [0,4,7,11].forEach(s=>tone(S,t+1.45,523.25*SM(s),{a:.03,k:.05,d:1.8,rv:.7}));},
  });

  // ── Worm Whack: worms peek out of their holes, then a mallet whacks them on the beat ──
  const WW_HOLES=[.14,.38,.62,.86],WW_PEEK=[[.2,1],[.65,3],[1.05,0]],WW_WHACK=[[1.45,2],[1.95,0],[2.45,3],[2.95,1],[3.45,2]];
  function worm(g,x,y,s,up,squash,t,ph){if(up<=0)return;const h=s*1.5*up,w=s*.62*(1+squash*.6);g.save();g.beginPath();g.rect(x-s,y-s*2,s*2,s*2);g.clip();
    const top=y-h*(1-squash*.6);g.fillStyle='#ff8ab8';rrect(g,x-w/2,top,w,y-top+s*.3,w/2);g.fill();
    g.strokeStyle='rgba(180,60,110,.5)';g.lineWidth=1.5;for(let i=1;i<4;i++){const yy=top+i*(y-top)/4;g.beginPath();g.moveTo(x-w/2+2,yy);g.lineTo(x+w/2-2,yy);g.stroke();}
    const ey=top+w*.42;if(squash>.3){g.strokeStyle='#2a1030';g.lineWidth=2;[-1,1].forEach(sd=>{const ex=x+sd*w*.2;g.beginPath();g.moveTo(ex-3,ey-3);g.lineTo(ex+3,ey+3);g.moveTo(ex+3,ey-3);g.lineTo(ex-3,ey+3);g.stroke();});}
    else[-1,1].forEach(sd=>{g.fillStyle='#fff';disc(x+sd*w*.2,ey,w*.16);g.fillStyle='#2a1030';disc(x+sd*w*.2+Math.sin(t*3+ph)*1.5,ey,w*.08);});g.restore();}
  const MG_WORM=world({vol:0.8,col:'#ff8ab8',kicker:'NEW MINIGAME',title:'WORM WHACK',sub:'Whack space worms to the beat',
    init(st){st.stars=[];st.wk=0;},
    draw(st,t,g,S){const{W,U}=st,gy=S.y+S.SH*.25,hs=Math.min(U*.13,S.SW*.115);
      K.ball(S.x1-S.SW*.12,S.y-S.SH*.55,U*.07,'#c48aff','#f0dcff','#3a2060');ring(S.x1-S.SW*.12,S.y-S.SH*.55,U*.12,3,'#e8d0ff',.6,.28);
      g.fillStyle='#4a4058';g.fillRect(-10,gy,W+20,st.H);g.fillStyle='#5f5470';g.beginPath();g.moveTo(-10,gy);for(let i=0;i<=20;i++)g.lineTo(i/20*W,gy-Math.abs(Math.sin(i*1.7))*U*.02);g.lineTo(W+10,gy);g.fill();
      WW_HOLES.forEach((u,i)=>{const x=S.x0+S.SW*u;
        let up=0,sq=0;WW_PEEK.forEach(([s,h])=>{if(h===i&&t>s&&t<s+.45)up=Math.max(up,Math.sin((t-s)/.45*Math.PI));});
        WW_WHACK.forEach(([s,h])=>{if(h!==i)return;const pre=s-.3;if(t>pre&&t<s+.35){up=Math.max(up,t<s?ss(pre,pre+.15,t):1-ss(s+.15,s+.35,t));if(t>=s)sq=Math.max(0,1-(t-s)/.3);}});
        g.fillStyle='#1a1424';g.beginPath();g.ellipse(x,gy,hs,hs*.3,0,0,TAU);g.fill();worm(g,x,gy,hs,up,sq,t,i);
        g.fillStyle='#5f5470';g.beginPath();g.ellipse(x,gy+hs*.08,hs*1.02,hs*.22,0,0,Math.PI);g.fill();});
      // the mallet: swings down on each whack
      let target=null,sw=0;WW_WHACK.forEach(([s,h])=>{if(t>s-.25&&t<s+.25){target=h;sw=t<s?ss(s-.25,s,t):1-ss(s+.05,s+.25,t);}});
      if(t>1.25&&target!=null){const x=S.x0+S.SW*WW_HOLES[target]+U*.16,y=gy-U*.32,ang=lerp(-1.1,.15,sw*sw);g.save();g.translate(x,y);g.rotate(ang);g.fillStyle='#b98a55';rrect(g,-U*.012,0,U*.024,U*.2,4);g.fill();
        g.fillStyle='#ff5a5a';rrect(g,-U*.07,U*.17,U*.14,U*.08,8);g.fill();g.fillStyle='rgba(255,255,255,.35)';rrect(g,-U*.06,U*.18,U*.12,U*.02,4);g.fill();g.restore();}
      WW_WHACK.forEach(([s,h],i)=>{if(t>=s&&st.wk<=i){st.wk=i+1;const x=S.x0+S.SW*WW_HOLES[h];for(let j=0;j<7;j++){const a=-Math.PI*(j/6),v=U*rnd(.5,.9);st.stars.push({x,y:gy-hs*.4,vx:Math.cos(a)*v,vy:Math.sin(a)*v,b:t});}}});
      st.stars.forEach(p=>{const q=(t-p.b)/.7;if(q>1)return;p.x+=p.vx*st.dt;p.y+=p.vy*st.dt;p.vx*=1-st.dt*3;p.vy*=1-st.dt*3;emoji(g,'★',p.x,p.y,U*.045,1-q);});},
    shake(t){for(const[s]of WW_WHACK)if(t>s&&t<s+.15)return 6*(1-(t-s)/.15);return 0;},
    sound(S,t){WW_PEEK.forEach(([s])=>tone(S,t+s,300,{f1:700,gl:.12,a:.07,d:.12}));
      for(let b=0;b<5;b++){const s=t+1.45+b*.5;inst(S,'kick',s,0,.6);inst(S,'hihat',s+.25,0,.45);}
      WW_WHACK.forEach(([s])=>{inst(S,'clap',t+s,0,.6);tone(S,t+s,180,{f1:60,gl:.08,a:.25,d:.12});tone(S,t+s+.02,900,{f1:400,gl:.1,a:.06,d:.12});tone(S,t+s-.28,200,{f1:500,gl:.2,a:.04,d:.1});});},
  });

  // ── Magmora: the ground rumbles, the volcano erupts, and the supernova comet streaks across the sky ──
  const MG_MAGMA=world({vol:0.9,col:'#ffb347',kicker:'PLANET HOP · NEW WORLD',title:'MAGMORA',sub:'Levels 11–15 · and the supernova comet',
    init(st){st.blobs=[];st.bub=[];st.smoke=[];},
    bg(st,t,g){const{W,H}=st,k=g.createLinearGradient(0,0,0,H);k.addColorStop(0,'#12030a');k.addColorStop(.6,`rgb(${70+60*ss(1.45,1.8,t)},14,10)`);k.addColorStop(1,'#2a0804');g.fillStyle=k;g.fillRect(-50,-50,W+100,H+100);
      st.bg.forEach(s=>{g.fillStyle=`rgba(255,220,200,${s.a*.5})`;g.fillRect(s.x*W,s.y*H*.5,s.r,s.r);});},
    draw(st,t,g,S){const{W,U}=st,gy=S.y+S.SH*.4,vx=S.cx,top=S.y-S.SH*.12,erupt=ss(1.45,1.6,t);
      // lava glow behind the cone, then the cone
      g.globalCompositeOperation='lighter';glow(vx,top,U*(.18+.5*erupt),'#ff7a1f',.4+.5*erupt);g.globalCompositeOperation='source-over';
      // far ranges first (v0.2.154), their ridges catching the lava light
      [[.55,'#1e0a0c',.9,7],[.75,'#2a0f0c',.55,5]].forEach(([hh,col,amp,n],li)=>{const yb=gy-S.SH*.05*(1-li);g.fillStyle=col;g.beginPath();g.moveTo(-20,gy);
        for(let i=0;i<=n*2;i++){const px=-20+(W+40)*i/(n*2),py=yb-(i%2?S.SH*hh*(.55+.45*Math.abs(Math.sin(i*1.7+li))):S.SH*hh*.2)*amp;g.lineTo(px,py);}g.lineTo(W+20,gy);g.fill();
        g.strokeStyle=`rgba(255,110,40,${.25+.25*erupt})`;g.lineWidth=1.5;g.stroke();});
      // the cone: a lit face and a shadow face, with a glowing crater lip
      g.fillStyle='#3a1a12';g.beginPath();g.moveTo(vx-S.SW*.5,gy);g.lineTo(vx-U*.08,top);g.lineTo(vx+U*.01,top);g.lineTo(vx+S.SW*.08,gy);g.fill();
      g.fillStyle='#1f0c0a';g.beginPath();g.moveTo(vx+S.SW*.08,gy);g.lineTo(vx+U*.01,top);g.lineTo(vx+U*.08,top);g.lineTo(vx+S.SW*.5,gy);g.fill();
      g.globalCompositeOperation='lighter';g.fillStyle=`rgba(255,140,40,${.55+.4*erupt})`;g.beginPath();g.ellipse(vx,top,U*.08,U*.018,0,0,TAU);g.fill();g.globalCompositeOperation='source-over';
      g.globalCompositeOperation='lighter';[[Math.max(9,U*.024),`rgba(255,90,30,${.18+.2*erupt})`],[Math.max(3,U*.008),`rgba(255,${120+80*erupt},40,${.5+.4*erupt})`]].forEach(([lw,col])=>{g.strokeStyle=col;g.lineWidth=lw;[[-.03,.4],[.04,.55],[-.01,.7]].forEach(([dx,f])=>{g.beginPath();g.moveTo(vx+dx*S.SW,top);g.quadraticCurveTo(vx+dx*S.SW*3,lerp(top,gy,f*.5),vx+dx*S.SW*6,lerp(top,gy,f));g.stroke();});});g.globalCompositeOperation='source-over';
      // a lava lake in front, bubbling
      const k=g.createLinearGradient(0,gy,0,st.H);k.addColorStop(0,'#ffb030');k.addColorStop(.1,'#ff5a1f');k.addColorStop(.38,'#5a1206');k.addColorStop(1,'#220603');g.fillStyle=k;g.fillRect(-10,gy,W+20,st.H);
      if(Math.random()<st.dt*14)st.bub.push({x:rnd(0,W),b:t,s:rnd(.6,1.3)});st.bub.forEach(p=>{const q=(t-p.b)/.5;if(q>1)return;ring(p.x,gy+U*.03,U*.02*p.s*q,2,'#ffe080',1-q,.5);});
      // smoke before, lava bombs after
      if(t<1.45&&Math.random()<st.dt*20)st.smoke.push({x:vx+rnd(-1,1)*U*.03,y:top,b:t,v:rnd(.6,1)});
      st.smoke.forEach(p=>{const q=(t-p.b)/1.4;if(q>1)return;const px=p.x+Math.sin(q*4)*U*.02,py=p.y-q*S.SH*.6*p.v,pr=U*.03*(1+q*2);g.fillStyle=`rgba(90,70,70,${.45*(1-q)})`;disc(px,py,pr);g.fillStyle=`rgba(255,120,50,${.18*(1-q)})`;disc(px,py+pr*.35,pr*.6);});
      if(t>1.45&&st.blobs.length<90&&t<2.6)for(let i=0;i<3;i++){const a=-Math.PI/2+rnd(-.6,.6),v=U*rnd(.9,1.7);st.blobs.push({x:vx,y:top,vx:Math.cos(a)*v,vy:Math.sin(a)*v,b:t,s:rnd(.5,1.2)});}
      st.blobs.forEach(p=>{p.vy+=U*1.6*st.dt;p.x+=p.vx*st.dt;p.y+=p.vy*st.dt;if(p.y>gy)return;const q=Math.min(1,(t-p.b)/1.2);g.fillStyle=`hsl(${40-30*q},100%,${70-25*q}%)`;disc(p.x,p.y,U*.014*p.s);});
      // the supernova comet
      const c=ss(2.5,3.4,t);if(c>0&&c<1){const x=lerp(-W*.1,W*1.1,c),y=lerp(st.H*.08,st.H*.25,c);g.globalCompositeOperation='lighter';
        for(let i=0;i<20;i++){const f=i/20;glow(x-f*W*.35,y-f*st.H*.08,U*.05*(1-f),'#ffd27a',.5*(1-f));}glow(x,y,U*.08,'#ffffff',.9);g.globalCompositeOperation='source-over';}},
    flash(t){return t>1.45&&t<1.8?.5*(1-(t-1.45)/.35):0;},flashCol:'#ffb060',
    shake(t){return t<1.45?t*3:t<2.2?12*(1-(t-1.45)/.75):0;},
    sound(S,t){const c=S.c,lp=c.createBiquadFilter(),v=c.createGain();lp.type='lowpass';lp.frequency.value=180;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(.3,t+1.4);v.gain.linearRampToValueAtTime(.12,t+2.2);v.gain.linearRampToValueAtTime(0,t+3.4);lp.connect(v);v.connect(S.out);
      const b=c.createBuffer(1,c.sampleRate*3.5,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const n=c.createBufferSource();n.buffer=b;n.connect(lp);n.start(t);n.stop(t+3.5);
      boom(S,t+1.45,1);noise(S,t+1.45,{type:'bandpass',f0:900,f1:300,q:.6,a:.25,d:1.2});
      for(let i=0;i<14;i++)tone(S,t+.3+i*.22+Math.random()*.1,rnd(70,140),{f1:rnd(200,320),gl:.05,a:.05,d:.08});
      noise(S,t+2.45,{f0:800,f1:5000,q:1,a:.1,k:.4,d:.6,rv:.5});[1568,2093,2637].forEach((f,i)=>tone(S,t+2.75+i*.06,f,{a:.025,d:.8,rv:.7}));},
  });

  // ── Beat Defense: drum towers pop up round the ship, then fire on the beat at the critters creeping in ──
  const BD_T=[['kick','#ff5a5a',[0,4,8,12]],['snare','#ffd23f',[4,12]],['hihat','#3fe6ff',[2,6,10,14]],['clap','#ff5fb8',[12]]];
  const MG_BEAT=world({vol:0.58,col:'#44eebb',kicker:'NEW MINIGAME',title:'BEAT DEFENSE',sub:'Where you build a tower decides its beat',
    init(st){st.foes=[];for(let i=0;i<14;i++){const a=rnd(0,TAU);st.foes.push({a,d:rnd(1.25,1.9),sp:rnd(.18,.3),dead:-1,c:i%2?'#7ddc5a':'#c48aff'});}st.zap=[];st.fired={};},
    draw(st,t,g,S){const{U}=st,cx=S.cx,cy=S.y-S.SH*.02,R=Math.min(S.SW*.5,S.SH*.85),step=t>1.45?Math.floor((t-1.45)/.125):-1;
      // the ship
      g.fillStyle='#9fb4d0';g.beginPath();g.ellipse(cx,cy,U*.17,U*.065,0,0,TAU);g.fill();g.fillStyle='rgba(127,224,255,.85)';g.beginPath();g.ellipse(cx,cy-U*.03,U*.08,U*.065,0,Math.PI,TAU);g.fill();
      for(let i=0;i<5;i++){g.fillStyle=Math.sin(t*6+i)>0?'#ffd23f':'#5a6a80';disc(cx-U*.11+i*U*.055,cy+U*.018,U*.011);}
      // critters creeping in
      st.foes.forEach(f=>{if(f.dead>=0&&t-f.dead>.4)return;const d=Math.max(.45,f.d-Math.max(0,t-.9)*f.sp),x=cx+Math.cos(f.a)*R*d,y=cy+Math.sin(f.a)*R*d*.75;
        if(f.dead>=0){const q=(t-f.dead)/.4;ring(x,y,U*.03*(1+q*2),2,f.c,1-q);return;}
        g.strokeStyle=f.c;g.lineWidth=2;for(let l=0;l<3;l++)[-1,1].forEach(sd=>{g.beginPath();g.moveTo(x,y);g.lineTo(x+sd*U*.034,y-U*.018+l*U*.018+Math.sin(t*20+l)*2);g.stroke();});
        g.fillStyle=f.c;g.beginPath();g.ellipse(x,y,U*.024,U*.033,f.a+Math.PI/2,0,TAU);g.fill();g.fillStyle='#fff';disc(x-U*.008,y-U*.006,U*.007);disc(x+U*.008,y-U*.006,U*.007);});
      // the towers, and their shots on the beat
      BD_T.forEach(([nm,col,steps],i)=>{const a=-Math.PI*.75+i*Math.PI/2,x=cx+Math.cos(a)*R*.5,y=cy+Math.sin(a)*R*.5*.75,p=ss(.2+i*.22,.45+i*.22,t);if(p<=0)return;
        const fire=steps.includes(((step%16)+16)%16)&&step>=0&&(t-1.45-step*.125)<.08;
        const tr=U*.05*eBack(p);g.fillStyle='#22283a';disc(x,y,tr);ring(x,y,tr,3.5,col,1);g.fillStyle=col;disc(x,y,tr*.35);if(fire){g.globalCompositeOperation='lighter';glow(x,y,U*.13,col,.8);g.globalCompositeOperation='source-over';}
        if(fire&&!st.fired[i+':'+step]){st.fired[i+':'+step]=1;let best=null,bd=1e9;st.foes.forEach(f=>{if(f.dead>=0)return;const d=Math.max(.45,f.d-Math.max(0,t-.9)*f.sp),fx=cx+Math.cos(f.a)*R*d,fy=cy+Math.sin(f.a)*R*d*.75,dd=Math.hypot(fx-x,fy-y);if(dd<bd){bd=dd;best={f,fx,fy};}});
          if(best){best.f.dead=t;st.zap.push({x,y,x2:best.fx,y2:best.fy,b:t,col});}}});
      st.zap.forEach(z=>{const q=(t-z.b)/.18;if(q>1)return;g.strokeStyle=rgba(z.col,1-q);g.lineWidth=3*(1-q)+1;g.beginPath();g.moveTo(z.x,z.y);g.lineTo(z.x2,z.y2);g.stroke();});},
    sound(S,t){BD_T.forEach((_,i)=>{tone(S,t+.2+i*.22,300+i*120,{type:'square',f1:600+i*160,gl:.08,a:.03,d:.08});noise(S,t+.2+i*.22,{type:'lowpass',f0:900,a:.06,d:.06});});
      for(let st2=0;st2<16;st2++)BD_T.forEach(([nm,,steps])=>{if(steps.includes(st2))inst(S,nm,t+1.45+st2*.125,0,nm==='hihat'?.55:.8);});
      for(let st2=0;st2<12;st2++)BD_T.forEach(([nm,,steps])=>{if(steps.includes(st2))inst(S,nm,t+3.45+st2*.125,0,.4);});},
  });

  // ── Wyrm Moon: the moon trembles, then the great wyrm bursts out, arcs over the sky and dives back in ──
  const MG_WYRM=world({vol:1.0,col:'#9d7bff',kicker:'WORM WHACK · NEW WORLD',title:'WYRM MOON',sub:'Levels 6–10, and a trail of more to open',
    init(st){st.rock=[];st.rk=0;},
    draw(st,t,g,S){const{W,H,U}=st,mR=Math.max(W,H)*.7,mY=H*.62+mR*.82,surf=mY-mR;
      // the moon
      skyGiant(g,W*.2,H*.16,U*.16,'#ff8ad8','#4a1050','rgba(255,200,240,.55)',ss(.2,1,t));
      const k=g.createRadialGradient(W*.35,mY-mR*.95,mR*.1,W/2,mY,mR);k.addColorStop(0,'#e4daff');k.addColorStop(.45,'#7a68b8');k.addColorStop(.8,'#3a2a70');k.addColorStop(1,'#1a1238');g.fillStyle=k;disc(W/2,mY,mR);
      horizonGlow(g,W/2,mY,mR,'#c4a8ff',1);
      g.globalCompositeOperation='lighter';glow(W/2,surf,mR*.6,'#9d7bff',.25);g.globalCompositeOperation='source-over';
      [[-.25,.03],[.1,.06],[.3,.025],[-.05,.04],[-.4,.035],[.42,.03],[.2,.018],[-.14,.016]].forEach(([dx,r])=>crater(g,W/2+dx*W,surf+U*.06+Math.abs(dx)*U*.12,r*W,.5));
      // the wyrm: a chain of segments following an arc out of the ground and back in
      const q=ss(1.4,3.1,t),ax=W*.16,bx=W*.84,peak=S.y-S.SH*.85,n=16,path=u=>({x:lerp(ax,bx,u),y:surf-Math.sin(u*Math.PI)*(surf-peak)});
      if(q>0)for(let i=n-1;i>=0;i--){const u=q*1.3-i*.035;if(u<0||u>1)continue;const p=path(u),s=U*(.1-i*.0042),hue=270-i*6;
        g.fillStyle=`hsl(${hue},55%,${48-i*1.2}%)`;disc(p.x,p.y,s);g.fillStyle=`hsla(${hue},70%,75%,.5)`;g.beginPath();g.ellipse(p.x,p.y-s*.3,s*.6,s*.3,0,0,TAU);g.fill();
        if(i===0){const d=path(Math.min(1,u+.02)),a=Math.atan2(d.y-p.y,d.x-p.x);g.save();g.translate(p.x,p.y);g.rotate(a);g.fillStyle='#ffe066';disc(s*.35,-s*.35,s*.18);disc(s*.35,s*.35,s*.18);g.fillStyle='#2a1050';disc(s*.42,-s*.35,s*.08);disc(s*.42,s*.35,s*.08);
          g.fillStyle='#ff9ad5';g.beginPath();g.moveTo(s*.9,-s*.25);g.lineTo(s*1.25,0);g.lineTo(s*.9,s*.25);g.fill();g.restore();}}
      // rocks thrown up where it bursts out and where it dives back in
      [[1.45,ax],[2.9,bx]].forEach(([s,x],i)=>{if(t>s&&st.rk<=i){st.rk=i+1;for(let j=0;j<16;j++){const a=-Math.PI/2+rnd(-1,1),v=U*rnd(.5,1.2);st.rock.push({x,y:surf,vx:Math.cos(a)*v,vy:Math.sin(a)*v,b:t,s:rnd(.5,1.2)});}}});
      st.rock.forEach(p=>{const qq=(t-p.b)/1.1;if(qq>1)return;p.vy+=U*1.8*st.dt;p.x+=p.vx*st.dt;p.y+=p.vy*st.dt;g.fillStyle=`rgba(140,120,190,${1-qq})`;disc(p.x,p.y,U*.012*p.s);});
      if(t<1.45&&Math.random()<st.dt*14){const x=rnd(W*.1,W*.9);st.rock.push({x,y:surf,vx:0,vy:-U*rnd(.1,.3),b:t,s:.6});}},
    shake(t){return t<1.45?1+t*3:t<2.1?14*(1-(t-1.45)/.65):t>2.9&&t<3.2?8*(1-(t-2.9)/.3):0;},
    sound(S,t){const c=S.c,x=c.createOscillator(),lp=c.createBiquadFilter(),v=c.createGain(),l=c.createOscillator(),lg=c.createGain();x.type='sawtooth';x.frequency.setValueAtTime(48,t);x.frequency.linearRampToValueAtTime(62,t+1.4);x.frequency.exponentialRampToValueAtTime(38,t+3.3);
      lp.type='lowpass';lp.Q.value=8;lp.frequency.value=260;l.frequency.value=5;lg.gain.value=160;l.connect(lg);lg.connect(lp.frequency);
      v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(.12,t+1.3);v.gain.linearRampToValueAtTime(.2,t+1.6);v.gain.linearRampToValueAtTime(0,t+3.4);x.connect(lp);lp.connect(v);v.connect(S.out);x.start(t);l.start(t);x.stop(t+3.5);l.stop(t+3.5);
      boom(S,t+1.45,.9);noise(S,t+1.45,{f0:1800,f1:200,q:1.2,a:.18,d:.9});noise(S,t+2.9,{type:'lowpass',f0:1500,f1:200,a:.2,d:.6});tone(S,t+2.9,90,{f1:40,gl:.2,a:.3,d:.4});},
  });

  // ── Grand Tournament: drumroll, spotlights, the trophy rises, fireworks ──
  const MG_GRAND=world({vol:1.5,col:'#ffd23f',kicker:'THE FINAL CHALLENGE',title:'GRAND TOURNAMENT',sub:'Weekly challenges for the best of the best',
    init(st){st.fw=[];st.fk=0;st.conf=[];},
    bg(st,t,g){g.fillStyle='#05040c';g.fillRect(-50,-50,st.W+100,st.H+100);st.bg.forEach(s=>{g.fillStyle=`rgba(255,240,200,${s.a*.6})`;g.fillRect(s.x*st.W,s.y*st.H*.6,s.r,s.r);});},
    draw(st,t,g,S){const{W,H,U}=st,gy=S.y+S.SH*.45;
      // spotlights sweeping in from the corners
      g.globalCompositeOperation='lighter';[[0,1],[W,-1],[W*.25,1],[W*.75,-1]].forEach(([x,sd],i)=>{const a=-Math.PI/2+sd*(.45+.35*Math.sin(t*(1.6+i*.3)+i))*(1-ss(1.3,1.6,t))+sd*.12*ss(1.3,1.6,t);
        const L=H*.9,ex=x+Math.cos(a)*L,ey=H+Math.sin(a)*L,k=g.createLinearGradient(x,H,ex,ey);k.addColorStop(0,'rgba(255,240,180,.28)');k.addColorStop(1,'rgba(255,240,180,0)');g.fillStyle=k;
        g.beginPath();g.moveTo(x-U*.02,H);g.lineTo(ex-Math.sin(a)*U*.18,ey+Math.cos(a)*U*.18);g.lineTo(ex+Math.sin(a)*U*.18,ey-Math.cos(a)*U*.18);g.lineTo(x+U*.02,H);g.fill();});g.globalCompositeOperation='source-over';
      // the crowd
      g.fillStyle='#120f20';for(let i=0;i<28;i++){const x=i/27*W,b=Math.abs(Math.sin(t*(t>1.45?9:3)+i*1.7))*U*.012;disc(x,H*.93-b,U*.04);}g.fillRect(-10,H*.93,W+20,H*.1);
      // the trophy rises on its pedestal
      const r=eBack(ss(1.45,2.0,t)),ty=lerp(gy+S.SH*.6,gy,r);g.fillStyle='#2a2440';rrect(g,S.cx-U*.12,ty,U*.24,S.SH*.6,6);g.fill();
      if(r>0){const s=U*.17,y=ty-s*.05;g.globalCompositeOperation='lighter';glow(S.cx,y-s*.6,s*2.2,'#ffd23f',.5);g.globalCompositeOperation='source-over';
        const k=g.createLinearGradient(S.cx-s,0,S.cx+s,0);k.addColorStop(0,'#c9901a');k.addColorStop(.45,'#ffe680');k.addColorStop(1,'#a8740e');g.fillStyle=k;
        rrect(g,S.cx-s*.35,y-s*.12,s*.7,s*.12,3);g.fill();g.fillRect(S.cx-s*.07,y-s*.45,s*.14,s*.35);
        g.beginPath();g.moveTo(S.cx-s*.5,y-s*1.25);g.lineTo(S.cx+s*.5,y-s*1.25);g.quadraticCurveTo(S.cx+s*.5,y-s*.45,S.cx,y-s*.42);g.quadraticCurveTo(S.cx-s*.5,y-s*.45,S.cx-s*.5,y-s*1.25);g.fill();
        g.strokeStyle=k;g.lineWidth=s*.07;[-1,1].forEach(sd=>{g.beginPath();g.arc(S.cx+sd*s*.5,y-s*1.0,s*.17,sd>0?-Math.PI/2:Math.PI/2,sd>0?Math.PI/2:Math.PI*1.5,sd<0);g.stroke();});
        emoji(g,'★',S.cx,y-s*.9,s*.3);}
      // fireworks and confetti
      [[1.55,.25,.3],[1.85,.75,.25],[2.2,.45,.18],[2.6,.15,.22],[2.9,.85,.3]].forEach(([s,u,v],i)=>{if(t>s&&st.fk<=i){st.fk=i+1;const x=u*W,y=H*v,col=['#ff5a5a','#3fe6ff','#ffd23f','#ff5fb8','#5fe07a'][i];for(let j=0;j<26;j++){const a=j/26*TAU,sp=U*rnd(.4,.6);st.fw.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,b:t,col});}}});
      g.globalCompositeOperation='lighter';st.fw.forEach(p=>{const q=(t-p.b)/1.0;if(q>1)return;p.vy+=U*.5*st.dt;p.x+=p.vx*st.dt;p.y+=p.vy*st.dt;p.vx*=1-st.dt*1.5;p.vy*=1-st.dt*1.5;g.fillStyle=rgba(p.col,1-q);disc(p.x,p.y,2.2);});g.globalCompositeOperation='source-over';
      if(t>1.5&&st.conf.length<120&&Math.random()<st.dt*60)st.conf.push({x:rnd(0,W),y:-10,v:rnd(.1,.25),r:rnd(0,6),c:['#ff5a5a','#3fe6ff','#ffd23f','#ff5fb8','#5fe07a'][Math.floor(rnd(0,5))]});
      st.conf.forEach(p=>{p.y+=st.dt*p.v*H;g.save();g.translate(p.x+Math.sin(t*3+p.r)*8,p.y);g.rotate(t*4+p.r);g.fillStyle=p.c;g.fillRect(-3,-5,6,10);g.restore();});},
    flash(t){return t>1.45&&t<1.75?.35*(1-(t-1.45)/.3):0;},flashCol:'#fff2c0',
    sound(S,t){for(let i=0;i<22;i++){const s=t+.1+1.3*(1-Math.pow(1-i/22,1.3));inst(S,'snare',s,0,.2+.5*i/22);}
      const c=S.c;[[0,[0,4,7]],[.3,[0,4,7]],[.45,[2,5,9]],[.75,[4,7,12]]].forEach(([d,ch])=>ch.forEach(s=>{const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(600,t+1.45+d);lp.frequency.linearRampToValueAtTime(3000,t+1.45+d+.08);lp.connect(S.out);
        const x=c.createOscillator(),v=c.createGain();x.type='sawtooth';x.frequency.value=261.63*SM(s);v.gain.setValueAtTime(0,t+1.45+d);v.gain.linearRampToValueAtTime(.05,t+1.45+d+.03);v.gain.setValueAtTime(.05,t+1.45+d+(d===.75?.9:.2));v.gain.linearRampToValueAtTime(0,t+1.45+d+(d===.75?1.4:.28));x.connect(v);v.connect(lp);x.start(t+1.45+d);x.stop(t+1.45+d+1.5);}));
      boom(S,t+1.45,.6);noise(S,t+1.5,{f0:1200,q:.5,a:.08,k:.4,hold:1.2,d:.8});
      [1.55,1.85,2.2,2.6,2.9].forEach(s=>{noise(S,t+s,{type:'lowpass',f0:1800,a:.2,d:.5});tone(S,t+s-.25,500,{f1:1600,gl:.24,a:.02,d:.03});});},
  });

  const WORLDS={mg_cockpit:MG_COCKPIT,ph_ice:MG_ICE,ww_moon:MG_WORM,ph_magma:MG_MAGMA,beat_defense:MG_BEAT,ww_deep:MG_WYRM,grand_tournament:MG_GRAND};

  // ══════════════════════ BEST BUDDY ══════════════════════
  // a spotlight on an empty platform, a swirl of sparkles, then POOF: your best buddy, with its accessory puzzles teased round it
  function bestBuddyScene(){
    const idx=typeof bbIdx==='function'?bbIdx():0,ad=typeof alienData!=='undefined'&&alienData[idx],name=ad&&ad.name?ad.name.toUpperCase():'YOUR FAVOURITE BUDDY';
    const ACC=['🎩','👓','🎀','⭐'];
    return{col:'#ffd23f',vol:1.75,kicker:'MEET YOUR',title:'BEST BUDDY',sub:`${name} has a new home`,
      init(st){st.sp=[];for(let i=0;i<60;i++)st.sp.push({a:rnd(0,TAU),r:rnd(.6,1.4),v:rnd(.8,1.6),c:['#ffd23f','#ff9ad5','#7fe0ff','#ffffff'][i%4]});st.conf=[];},
      draw(st,t){const g=st.g,{W,H,U}=st,cx=W/2,py=H*.5,pr=Math.min(U*.3,W*.36),pop=ss(1.45,1.75,t),out=ss(3.6,4.25,t);
        space(st,'#ffd23f',.1+.12*pop,0,0);
        g.save();const z=1+out*.12;g.translate(cx,py);g.scale(z,z);g.translate(-cx,-py);
        // the spotlight and the platform
        const on=ss(.1,.5,t);g.globalCompositeOperation='lighter';const k=g.createLinearGradient(cx,0,cx,py);k.addColorStop(0,`rgba(255,240,190,${.03*on})`);k.addColorStop(1,`rgba(255,240,190,${.22*on})`);g.fillStyle=k;
        g.beginPath();g.moveTo(cx-U*.04,0);g.lineTo(cx+U*.04,0);g.lineTo(cx+pr*1.05,py);g.lineTo(cx-pr*1.05,py);g.fill();g.globalCompositeOperation='source-over';
        g.fillStyle='#2a2440';g.beginPath();g.ellipse(cx,py+U*.035,pr,pr*.26,0,0,TAU);g.fill();g.fillStyle='#4a3f6e';g.beginPath();g.ellipse(cx,py,pr,pr*.26,0,0,TAU);g.fill();
        g.strokeStyle=rgba('#ffd23f',.5+.4*pop);g.lineWidth=2;g.beginPath();g.ellipse(cx,py,pr*.92,pr*.22,0,0,TAU);g.stroke();
        // the sparkle swirl, gathering in
        if(t<1.6){g.globalCompositeOperation='lighter';st.sp.forEach(p=>{const q=ss(.2,1.45,t),r=pr*p.r*(1-q*.85),a=p.a+t*p.v*3;glow(cx+Math.cos(a)*r,py-U*.12-q*U*.05+Math.sin(a)*r*.35,U*.018,p.c,.8*ss(.15,.4,t));});g.globalCompositeOperation='source-over';}
        // POOF
        const k1=(t-1.45)/.8;if(k1>0&&k1<1){g.fillStyle=`rgba(255,255,255,${.7*(1-k1)})`;for(let i=0;i<9;i++){const a=i/9*TAU;disc(cx+Math.cos(a)*U*.16*eOut(k1),py-U*.14+Math.sin(a)*U*.1*eOut(k1),U*.06*(1-k1*.6));}}
        // your best buddy
        if(pop>0&&typeof drawBuddy==='function'){const s=U*.5*eBack(pop),hop=t>1.9?Math.abs(Math.sin((t-1.9)*5))*U*.03:0;g.save();g.translate(cx,py-hop);g.scale(1+.06*(1-pop),1-.06*(1-pop));
          try{drawBuddy(g,0,-s*.05,s,{view:'turn',angle:Math.sin(t*1.4)*22,idx,t,antenna:1,lite:true});}catch(e){K.buddy(0,0,s*.4,'#42a5f5',t,0,0,0,1);}g.restore();}
        // the accessory puzzles (they start here), teased in bubbles orbiting round
        if(t>2.0)ACC.forEach((ic,i)=>{const p=ss(2.0+i*.12,2.3+i*.12,t),a=i/4*TAU+t*.6,x=cx+Math.cos(a)*pr*1.05,y=py-U*.16+Math.sin(a)*pr*.35;if(p<=0)return;
          const br=U*.045*eBack(p);g.fillStyle='rgba(20,16,40,.7)';disc(x,y,br);ring(x,y,br,2,'#ffd23f',.75);emoji(g,ic,x,y,br*1.1,.35);   // still locked: a faint shape and a question mark
          g.fillStyle='#ffe680';g.font=`${Math.round(br*1.1)}px 'Bebas Neue',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('?',x,y+br*.05);});
        if(t>1.5&&st.conf.length<70&&Math.random()<st.dt*40){const a=rnd(-Math.PI,0),v=U*rnd(.3,.7);st.conf.push({x:cx,y:py-U*.15,vx:Math.cos(a)*v,vy:Math.sin(a)*v,b:t,c:['#ffd23f','#ff9ad5','#7fe0ff'][Math.floor(rnd(0,3))],h:Math.random()<.3});}
        st.conf.forEach(p=>{const q=(t-p.b)/1.3;if(q>1)return;p.vy+=U*.5*st.dt;p.x+=p.vx*st.dt;p.y+=p.vy*st.dt;if(p.h)emoji(g,'♥',p.x,p.y,U*.035,1-q);else{g.fillStyle=rgba(p.c,1-q);disc(p.x,p.y,2.5);}});
        g.restore();
        flash(st,t>1.45&&t<1.75?.4*(1-(t-1.45)/.3):0,'#fff6d8');},
      sound(S){const t=S.t;for(let i=0;i<10;i++)tone(S,t+.2+i*.12,700+i*120,{f1:1100+i*140,gl:.1,a:.015,d:.15,rv:.6});
        noise(S,t+1.42,{f0:2000,f1:600,q:.8,a:.18,d:.35});tone(S,t+1.45,220,{f1:880,gl:.12,a:.08,d:.2});
        // a little music-box tune
        [[0,12],[.25,16],[.5,19],[.75,24],[1.0,21],[1.25,19],[1.5,16],[1.75,19]].forEach(([d,s])=>inst(S,'cb_musicbox',t+1.6+d,(s-19)*100,.7));
        [0,4,7,12].forEach(s=>tone(S,t+1.5,261.63*SM(s),{type:'triangle',a:.03,k:.1,d:2.2,rv:.6}));},
    };
  }

  addUnlockCutscenes((id,node)=>{
    if(HUBS[id])return HUBS[id];
    if(WORLDS[id])return WORLDS[id];
    if(id==='best_buddy')return bestBuddyScene();
    if(/^cont_/.test(id)&&node)return continentScene(id,node);
    return null;
  });
})();
