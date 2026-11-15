// ══════════════════════════════════════════════
//  UNLOCK CUTSCENES (v0.2.139)
//  About 4 s each, tap to skip: the same style and length as the "Explore the Galaxies" launch (js/59-galaxy-intro.js).
//  They play when you buy the Tucana Core, each of the four Quad Suns, or a planet in the Planet Atlas, and any of
//  them can be watched again from the node's info bubble (WATCH AGAIN).
//   • Core: specks of matter spiral in to a quickening heartbeat → ignition → the four empty sun docks light up.
//   • Quad Suns: a comet shoots out of the core and races round the orbit to its dock, the sun ignites, the camera
//     swoops in and each sun shows off its path:
//       I   Planet Atlas    — four little worlds swing into orbit round it
//       II  Musical Toolkit — it pulses to a drum groove, with EQ bars blazing round it like sun rays
//       III Minigame Nexus  — 8-bit: a 3-2-1 countdown, a pixel comet, a sun that "rezzes in", game icons and coins
//       IV  Alien Evolution — it spins in on a DNA helix, then buddies pop up round it and bounce
//   • Planets: a warp jump drops out of hyperspace in front of the world; it turns, its continents light up one by
//     one, each with a note on the planet's own instruments (Timbra plays its marimbas, Alloy its steel pans…),
//     then the camera dives in. Any future planet gets a version of this in its own colours.
//  Sound comes from the game's own instruments where it fits, mixed with a little reverb into the master volume.
// ══════════════════════════════════════════════
(function(){
  const TAU=Math.PI*2,DUR=4.3;
  const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
  const ss=(a,b,x)=>{const k=cl((x-a)/(b-a),0,1);return k*k*(3-2*k);};
  const lerp=(a,b,k)=>a+(b-a)*k;
  const eOut=k=>1-Math.pow(1-cl(k,0,1),3);
  const eBack=k=>{k=cl(k,0,1);const c=1.9;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
  const rnd=(a,b)=>a+Math.random()*(b-a);
  function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${cl(a,0,1)})`;}
  const REDUCED=(()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}})();
  let root,cv,g,raf=0,run=null;

  function build(){
    root=document.createElement('div');root.id='unlockScene';
    root.innerHTML='<canvas></canvas><div class="us-text"><div class="us-kicker"></div><div class="us-title"></div><div class="us-sub"></div></div><div class="us-skip">TAP TO SKIP</div>';
    document.body.appendChild(root);cv=root.querySelector('canvas');g=cv.getContext('2d');
    const skip=e=>{if(e&&e.cancelable)e.preventDefault();if(run&&run.el()>.5)finish();};
    root.addEventListener('pointerdown',skip);root.addEventListener('touchstart',skip,{passive:false});
  }

  // ══ sound kit ══
  let irCache=null;
  function mixer(vol){
    try{
      if(typeof getCtx!=='function'||typeof masterGainNode==='undefined'||!masterGainNode)return null;
      const c=getCtx();if(!c)return null;
      const out=c.createGain();out.gain.value=vol||.9;out.connect(masterGainNode);
      if(!irCache||irCache.sampleRate!==c.sampleRate){const L=Math.floor(c.sampleRate*2.2);irCache=c.createBuffer(2,L,c.sampleRate);
        for(let ch=0;ch<2;ch++){const d=irCache.getChannelData(ch);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.8);}}
      const rv=c.createConvolver();rv.buffer=irCache;const rg=c.createGain();rg.gain.value=.3;rv.connect(rg);rg.connect(out);
      const send=c.createGain();send.connect(rv);
      return{c,out,send,t:c.currentTime+.03};
    }catch(e){return null;}
  }
  // a plain synth voice: o = {type, a: level, k: attack, hold, d: fade, f1: glide target, gl: glide time, rv: reverb send, det}
  function tone(S,t,f,o){o=o||{};const c=S.c,x=c.createOscillator(),v=c.createGain();x.type=o.type||'sine';x.frequency.setValueAtTime(f,t);
    if(o.f1)x.frequency.exponentialRampToValueAtTime(o.f1,t+(o.gl||.2));if(o.det)x.detune.value=o.det;
    const a=o.a||.1,k=o.k||.005,h=o.hold||0,d=o.d||.5;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(a,t+k);if(h)v.gain.setValueAtTime(a,t+k+h);v.gain.exponentialRampToValueAtTime(.0005,t+k+h+d);
    x.connect(v);v.connect(S.out);if(o.rv){const s=c.createGain();s.gain.value=o.rv;v.connect(s);s.connect(S.send);}x.start(t);x.stop(t+k+h+d+.05);return x;}
  // filtered noise: o = {type, f0, f1 (sweep), q, a, k, hold, d, rv}
  function noise(S,t,o){const c=S.c,len=(o.k||.005)+(o.hold||0)+(o.d||.3)+.05,b=c.createBuffer(1,Math.ceil(c.sampleRate*len),c.sampleRate),dd=b.getChannelData(0);for(let i=0;i<dd.length;i++)dd[i]=Math.random()*2-1;
    const s=c.createBufferSource(),f=c.createBiquadFilter(),v=c.createGain();s.buffer=b;f.type=o.type||'bandpass';f.Q.value=o.q||1;f.frequency.setValueAtTime(o.f0||1000,t);if(o.f1)f.frequency.exponentialRampToValueAtTime(o.f1,t+len-.05);
    const a=o.a||.1,k=o.k||.005,h=o.hold||0;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(a,t+k);if(h)v.gain.setValueAtTime(a,t+k+h);v.gain.exponentialRampToValueAtTime(.0005,t+len-.05);
    s.connect(f);f.connect(v);v.connect(S.out);if(o.rv){const r=c.createGain();r.gain.value=o.rv;v.connect(r);r.connect(S.send);}s.start(t);s.stop(t+len);}
  // one of the game's own instruments (a drum, a planet sound…), retuned by `cents`, played into the cutscene mix (or into `dest`)
  function inst(S,id,t,cents,gv,dest){
    const def=(typeof SOUND_MAP!=='undefined'&&SOUND_MAP[id])||(typeof PLANET_SOUND_DEFS!=='undefined'&&PLANET_SOUND_DEFS.find(d=>d.id===id));
    if(!def||typeof def.fn!=='function')return;
    const c=S.c,orig=c.createOscillator,dm=drumMasterGain,rn=rvbNode;
    try{if(cents)c.createOscillator=function(){const o=orig.call(this);o.detune.value=cents;return o;};drumMasterGain=dest||S.out;rvbNode=S.send;def.fn(t,gv==null?1:gv);}
    catch(e){}finally{if(cents)delete c.createOscillator;drumMasterGain=dm;rvbNode=rn;}
  }
  // a swelling engine + rising whoosh, for the jumps (len: seconds to the arrival)
  function riser(S,t,len,base,top,a){
    const c=S.c,lp=c.createBiquadFilter(),eg=c.createGain();lp.type='lowpass';lp.frequency.setValueAtTime(160,t);lp.frequency.exponentialRampToValueAtTime(2800,t+len);
    eg.gain.setValueAtTime(0,t);eg.gain.linearRampToValueAtTime(.05*a,t+len*.3);eg.gain.linearRampToValueAtTime(.09*a,t+len);eg.gain.exponentialRampToValueAtTime(.0005,t+len+.35);lp.connect(eg);eg.connect(S.out);
    [0,8].forEach(d=>{const o=c.createOscillator();o.type='sawtooth';o.detune.value=d;o.frequency.setValueAtTime(base,t);o.frequency.exponentialRampToValueAtTime(top,t+len);o.connect(lp);o.start(t);o.stop(t+len+.4);});
    noise(S,t,{f0:300,f1:5200,q:1.2,a:.11*a,k:len*.95,d:.35});
  }
  function boom(S,t,a){tone(S,t,120,{f1:32,gl:.7,a:.6*a,d:1.4});noise(S,t,{type:'lowpass',f0:3200,f1:250,q:.7,a:.22*a,d:.9,rv:.5});}
  const cents=semi=>semi*100;

  // ══ drawing kit ══
  function glow(x,y,r,col,a){if(r<=0||a<=0)return;const k=g.createRadialGradient(x,y,0,x,y,r);k.addColorStop(0,rgba(col,a));k.addColorStop(.4,rgba(col,a*.35));k.addColorStop(1,rgba(col,0));g.fillStyle=k;g.fillRect(x-r,y-r,r*2,r*2);}
  function ring(x,y,r,w,col,a,sq){if(a<=0||r<=0)return;g.strokeStyle=rgba(col,a);g.lineWidth=w;g.beginPath();g.ellipse(x,y,r,r*(sq||1),0,0,TAU);g.stroke();}
  function flash(st,a,col){if(a<=0)return;g.fillStyle=rgba(col||'#ffffff',a);g.fillRect(-50,-50,st.W+100,st.H+100);}
  function disc(x,y,r){g.beginPath();g.arc(x,y,Math.max(0,r),0,TAU);g.fill();}
  // deep space: a tinted nebula and twinkling stars (dx, dy = parallax drift)
  function space(st,neb,nebA,dx,dy){
    const{W,H,cx,cy,R}=st;g.fillStyle='#02030a';g.fillRect(-50,-50,W+100,H+100);
    if(nebA>0){const k=g.createRadialGradient(cx,cy,0,cx,cy,R);k.addColorStop(0,rgba(neb,nebA));k.addColorStop(.55,rgba(neb,nebA*.3));k.addColorStop(1,rgba(neb,0));g.fillStyle=k;g.fillRect(0,0,W,H);}
    st.bg.forEach(s=>{let x=(s.x*W+(dx||0)*s.d)%W,y=(s.y*H+(dy||0)*s.d)%H;if(x<0)x+=W;if(y<0)y+=H;
      g.fillStyle=`rgba(220,235,255,${s.a*(.55+.45*Math.sin(st.t*s.tw+s.ph))})`;g.fillRect(x,y,s.r,s.r);});
  }
  // hyperspace streaks, like the galaxy launch (spd 0 = still … 4 = full jump)
  function warp(st,spd,hues,cx,cy){
    const{W,H,R,dt}=st;g.lineCap='round';
    st.ws.forEach(s=>{s.z-=dt*spd;if(s.z<=.02){s.z=1;s.a=Math.random()*TAU;s.r=.05+Math.random()*.95;}
      const p=z=>({x:cx+Math.cos(s.a)*s.r*R*.35/z,y:cy+Math.sin(s.a)*s.r*R*.35/z});
      const A=p(Math.min(1,s.z+dt*spd*1.6+.004)),B=p(s.z);if(B.x<-20||B.x>W+20||B.y<-20||B.y>H+20)return;
      const br=Math.min(1,.35+(1-s.z)*1.2);g.strokeStyle=`hsla(${hues[s.i%hues.length]},90%,${70+22*br}%,${br})`;g.lineWidth=Math.max(1.2,(1-s.z)*3);
      g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.stroke();});
  }
  // a sun: halo, a crown of flickering rays, optional ✦ lens flare, and a white-hot disc
  function sun(x,y,r,col,t,o){o=o||{};if(r<=0)return;
    g.save();g.globalAlpha=o.a==null?1:o.a;g.globalCompositeOperation='lighter';
    glow(x,y,r*(o.halo||5),col,.45);
    const n=o.rays||12;for(let i=0;i<n;i++){const an=i/n*TAU+t*(o.spin||.3),L=r*(1.6+.75*Math.sin(i*2.3+t*2.6)+(o.burst||0));
      const ex=x+Math.cos(an)*L,ey=y+Math.sin(an)*L,k=g.createLinearGradient(x,y,ex,ey);k.addColorStop(0,rgba(col,.6));k.addColorStop(1,rgba(col,0));g.fillStyle=k;
      const w=r*.24,px=-Math.sin(an)*w,py=Math.cos(an)*w;g.beginPath();g.moveTo(x+px,y+py);g.lineTo(ex,ey);g.lineTo(x-px,y-py);g.fill();}
    if(o.flare!=null){for(let i=0;i<4;i++){const an=o.flare+i*TAU/4,L=r*(o.flareLen||4.2)*(i%2?.75:1),ex=x+Math.cos(an)*L,ey=y+Math.sin(an)*L;
      const k=g.createLinearGradient(x,y,ex,ey);k.addColorStop(0,'rgba(255,255,255,.85)');k.addColorStop(.35,rgba(col,.5));k.addColorStop(1,rgba(col,0));g.fillStyle=k;
      const w=r*.1,px=-Math.sin(an)*w,py=Math.cos(an)*w;g.beginPath();g.moveTo(x+px,y+py);g.lineTo(ex,ey);g.lineTo(x-px,y-py);g.fill();}}
    g.globalCompositeOperation='source-over';
    const d=g.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);d.addColorStop(0,'#ffffff');d.addColorStop(.5,o.mid||'#fff4d0');d.addColorStop(1,col);g.fillStyle=d;disc(x,y,r);
    g.restore();
  }
  // a little ball of a planet (for Quad Sun I and the orbiting worlds)
  function ball(x,y,r,base,lite,dark){if(r<=0)return;const d=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);d.addColorStop(0,lite);d.addColorStop(.6,base);d.addColorStop(1,dark);g.fillStyle=d;disc(x,y,r);}
  // a cute buddy (Quad Sun IV): bouncing blob, antennae, blinking eyes looking at (lx, ly)
  function buddy(x,y,s,col,t,ph,lx,ly,pop){if(pop<=0)return;s*=eBack(pop);
    const b=Math.abs(Math.sin(t*4.6+ph)),land=1-b,by=y-b*s*.5,sx=s*(1+.14*land*land),sy=s*(1-.12*land*land);
    g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(x,y+s*.62,s*.55*(1-b*.35),s*.12,0,0,TAU);g.fill();
    const top=by-sy*.55,wob=Math.sin(t*7+ph)*s*.08;
    g.strokeStyle=col;g.lineWidth=Math.max(1,s*.08);g.lineCap='round';
    [-1,1].forEach(sd=>{g.beginPath();g.moveTo(x+sd*s*.18,top+s*.08);g.quadraticCurveTo(x+sd*s*.3,top-s*.25,x+sd*s*.36+wob,top-s*.42);g.stroke();
      g.fillStyle='#fff6b0';disc(x+sd*s*.36+wob,top-s*.42,s*.1);});
    g.fillStyle=col;g.beginPath();g.ellipse(x,by,sx*.6,sy*.58,0,0,TAU);g.fill();
    g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.ellipse(x,by+sy*.18,sx*.36,sy*.28,0,0,TAU);g.fill();
    const blink=(Math.sin(t*1.9+ph*3.1)>.96)?.12:1,ex=by-sy*.1,dx=cl((lx-x)/(s*6),-1,1)*s*.05,dy=cl((ly-by)/(s*6),-1,1)*s*.05;
    [-1,1].forEach(sd=>{g.fillStyle='#ffffff';g.beginPath();g.ellipse(x+sd*s*.19,ex,s*.15,s*.17*blink,0,0,TAU);g.fill();
      if(blink>.5){g.fillStyle='#1a1430';disc(x+sd*s*.19+dx,ex+dy,s*.075);g.fillStyle='#ffffff';disc(x+sd*s*.19+dx+s*.03,ex+dy-s*.03,s*.025);}});
    g.strokeStyle='#1a1430';g.lineWidth=Math.max(1,s*.05);g.beginPath();g.arc(x,by+sy*.08,s*.12,.15*Math.PI,.85*Math.PI);g.stroke();
  }

  // ══════════════════════ TUCANA CORE ══════════════════════
  const DOCK_A={sun_planets:-135,sun_points:-45,sun_minigames:135,sun_aliens:45};   // where each sun sits on the ring (as in the 3D map)
  const SUN_COL={sun_planets:'#aa66ff',sun_points:'#ffcc00',sun_minigames:'#ff6644',sun_aliens:'#44eebb'};
  const CORE={
    col:'#ffd25a',vol:.8,kicker:'THE HEART OF THE GALAXY',title:'TUCANA CORE',sub:'Four Quad Suns are waiting to be lit',
    beats:[.32,.8,1.14,1.37],
    init(st){st.motes=[];for(let i=0;i<150;i++)st.motes.push({a:Math.random()*TAU,r:.25+Math.random()*.75,hue:Math.random()});},
    draw(st,t){
      const{W,H,cx,cy,U,dt}=st,ig=ss(1.5,1.72,t),out=ss(3.55,4.25,t);
      space(st,'#5a2a8a',.18+.3*ig,0,0);
      g.save();const Z=1-out*.6;g.translate(cx,cy);g.scale(Z,Z);g.translate(-cx,-cy);
      // the heartbeat: four beats, each one quicker, each pulling the matter in harder
      let pulse=0;this.beats.forEach(b=>{const k=t-b;if(k>0&&k<.32)pulse=Math.max(pulse,1-k/.32);});
      const Rd=U*.5,SQ=.42;
      g.lineCap='round';
      st.motes.forEach(m=>{
        let x,y;
        if(!m.free){
          const pull=.05+.55*Math.pow(cl(t/1.5,0,1),2)+pulse*.35;
          m.a+=dt*(1.0/(m.r+.12))*(1+t*.9);m.r-=dt*pull*(.35+m.r);
          if(m.r<.05){if(t<1.42){m.r=.85+Math.random()*.15;m.a=Math.random()*TAU;m.px=null;}else m.r=.05;}
          x=cx+Math.cos(m.a)*m.r*Rd;y=cy+Math.sin(m.a)*m.r*Rd*SQ;
          if(t>=1.5){m.free=true;const sp=U*rnd(.9,2.4);m.vx=Math.cos(m.a)*sp;m.vy=Math.sin(m.a)*sp*.6;m.x=x;m.y=y;}
        }
        if(m.free){m.x+=m.vx*dt;m.y+=m.vy*dt;m.vx*=1-dt*1.6;m.vy*=1-dt*1.6;x=m.x;y=m.y;}
        const fade=m.free?Math.max(0,1-(t-1.5)/1.6):Math.min(1,t*2);
        if(m.px!=null&&fade>0){const hot=1-cl(m.r,0,1);g.strokeStyle=`hsla(${38+m.hue*20-hot*20},100%,${60+hot*35}%,${.75*fade})`;g.lineWidth=1.2+hot*2.2;g.beginPath();g.moveTo(m.px,m.py);g.lineTo(x,y);g.stroke();}
        m.px=x;m.py=y;
      });
      // contracting "inhale" rings on each beat
      this.beats.forEach(b=>{const k=(t-b)/.42;if(k>0&&k<1)ring(cx,cy,U*.55*(1-eOut(k))+2,2+3*(1-k),'#ffb24a',.5*Math.sin(k*Math.PI),SQ*1.6);});
      // the seed before ignition
      if(t<1.6){const r=U*(.01+.018*pulse+.02*cl(t/1.5,0,1));g.globalCompositeOperation='lighter';glow(cx,cy,r*7,'#ffcf6a',.7);g.fillStyle='#fffbe8';disc(cx,cy,r);g.globalCompositeOperation='source-over';}
      // shockwaves
      const k1=(t-1.5)/1.0,k2=(t-1.62)/1.2;
      if(k1>0&&k1<1)ring(cx,cy,U*(.08+1.3*eOut(k1)),2+10*(1-k1),'#ffe6a0',.85*(1-k1),.55);
      if(k2>0&&k2<1)ring(cx,cy,U*(.08+.95*eOut(k2)),1.5+4*(1-k2),'#44aaff',.7*(1-k2),.55);
      // the orbit ring draws itself round, then the four docks pop up one by one
      const orb=U*.37,sweep=ss(1.75,2.5,t);
      if(sweep>0){g.strokeStyle=rgba('#ffd98a',.4);g.lineWidth=1.6;g.setLineDash([5,8]);g.beginPath();g.ellipse(cx,cy,orb,orb*SQ,0,-Math.PI/2,-Math.PI/2+TAU*sweep);g.stroke();g.setLineDash([]);}
      const docks=Object.keys(DOCK_A).map((id,i)=>({id,i,a:DOCK_A[id]*Math.PI/180+t*.12}));
      const drawDock=d=>{const p=ss(1.95+d.i*.17,2.25+d.i*.17,t);if(p<=0)return;const x=cx+Math.cos(d.a)*orb,y=cy+Math.sin(d.a)*orb*SQ,dep=.8+.25*Math.sin(d.a),r=U*.022*dep*eBack(p),c=SUN_COL[d.id];
        g.globalCompositeOperation='lighter';glow(x,y,r*4,c,.5*p);g.globalCompositeOperation='source-over';ring(x,y,r,2,c,.95*p);ring(x,y,r*(1+2.5*(1-p)),1.5,c,.6*p*(1-p)*4);
        g.fillStyle=rgba(c,.25*p);disc(x,y,r*.8);};
      docks.filter(d=>Math.sin(d.a)<0).forEach(drawDock);
      // the core itself: a ✦ flare over a white-gold disc
      const cp=ss(1.5,1.95,t);
      if(cp>0){const r=U*.1*eBack(cp)*(1+.03*Math.sin(t*3.2)+.08*pulse);sun(cx,cy,r,'#ffb43a',t,{rays:14,spin:.18,flare:t*.15+.2,flareLen:5.2,halo:5.5,mid:'#ffe28a',burst:(1-cp)*3});}
      docks.filter(d=>Math.sin(d.a)>=0).forEach(drawDock);
      g.restore();
      flash(st,t<1.5?ss(1.42,1.5,t)*.8:Math.max(0,.8*(1-(t-1.5)/.38)),'#fff4dc');
    },
    shake(t){return t>1.5&&t<2.1?16*(1-(t-1.5)/.6):0;},
    sound(S){const t=S.t;
      this.beats.forEach((b,i)=>{const a=.32+i*.1;tone(S,t+b,64,{f1:38,gl:.16,a,d:.32});tone(S,t+b+.12,58,{f1:36,gl:.14,a:a*.6,d:.28});noise(S,t+b,{type:'lowpass',f0:900,a:.05,d:.08});});
      const c=S.c,lp=c.createBiquadFilter(),eg=c.createGain();lp.type='lowpass';lp.frequency.setValueAtTime(100,t);lp.frequency.exponentialRampToValueAtTime(900,t+1.48);
      eg.gain.setValueAtTime(0,t);eg.gain.linearRampToValueAtTime(.06,t+1.4);eg.gain.linearRampToValueAtTime(0,t+1.52);lp.connect(eg);eg.connect(S.out);
      [0,9].forEach(d=>{const o=c.createOscillator();o.type='sawtooth';o.detune.value=d;o.frequency.setValueAtTime(55,t);o.frequency.exponentialRampToValueAtTime(82,t+1.5);o.connect(lp);o.start(t);o.stop(t+1.6);});
      noise(S,t,{f0:180,f1:3000,q:1,a:.08,k:1.45,d:.08});
      const b=t+1.5;boom(S,b,1);
      [174.6,261.6,349.2,440,523.3,784].forEach((f,i)=>{tone(S,b+i*.03,f,{type:i<3?'triangle':'sine',a:.04,k:.12,d:2.6,rv:.6});tone(S,b+i*.03,f,{type:'sine',a:.02,k:.15,d:2.4,det:6,rv:.6});});
      [1046.5,1318.5,1568,2093,2637].forEach((f,i)=>tone(S,b+.3+i*.07,f,{a:.026,d:.6,rv:.7}));
      [784,988,1175,1568].forEach((f,i)=>{const s=t+1.95+i*.17;tone(S,s,f,{a:.05,d:.75,rv:.6});tone(S,s,f*2.01,{a:.014,d:.3,rv:.6});});
    },
  };

  // ══════════════════════ QUAD SUNS ══════════════════════
  // shared: a comet shoots out of the core, curls round the orbit and ignites at the sun's dock; the camera then
  // swoops in on the new sun while its own flourish plays (back = behind the sun, front = in front)
  function quadSun(cfg){
    return{col:cfg.col,vol:cfg.vol,kicker:cfg.kicker,title:cfg.title,sub:cfg.sub,
      init(st){st.trail=[];st.parts=[];st.da=DOCK_A[cfg.id]*Math.PI/180;cfg.init&&cfg.init(st);},
      draw(st,t){
        const{W,H,U,dt}=st,SQ=.42,f=ss(1.5,2.2,t),out=ss(3.55,4.25,t),da=st.da;
        // wide shot of the ring, then the camera swoops in until the sun sits up top, clear of the title (sized to fit landscape too)
        const k0=Math.min(W*.42,H*.5,U*.62),kz=Math.min(k0*2.3,H*.125/.15),k=lerp(k0,kz,f)*(1+out*1.4),fx=Math.cos(da)*f,fy=Math.sin(da)*f;
        const cx=st.cx,cy=lerp(st.cy,H*.37,f);
        const P=(wx,wy)=>({x:cx+(wx-fx)*k,y:cy+(wy-fy)*k*SQ});
        st.P=P;st.k=k;
        space(st,cfg.col,.12+.28*ss(1.5,2,t),-fx*k*.25,-fy*k*.25);
        // the orbit ring, the other docks / suns you already lit, the core
        const o=P(0,0);g.strokeStyle=rgba('#ffd98a',.28);g.lineWidth=1.5;g.setLineDash([5,8]);g.beginPath();g.ellipse(o.x,o.y,k,k*SQ,0,0,TAU);g.stroke();g.setLineDash([]);
        Object.keys(DOCK_A).forEach(id=>{if(id===cfg.id)return;const a=DOCK_A[id]*Math.PI/180,p=P(Math.cos(a),Math.sin(a)),c=SUN_COL[id];
          if(typeof unlockedSkills!=='undefined'&&unlockedSkills[id])sun(p.x,p.y,k*.05,c,t,{rays:8,halo:3.5});else ring(p.x,p.y,k*.04,1.5,c,.55);});
        sun(o.x,o.y,k*.09,'#ffb43a',t,{rays:10,flare:t*.15,flareLen:4,halo:4,mid:'#ffe28a'});
        // the comet: out of the core, round the orbit, faster and faster
        const u=Math.pow(ss(.12,1.5,t),1.6),cr=.12+.88*Math.pow(u,.55),ca=da-(1-u)*TAU*.9*(cfg.dir||1);
        if(t<1.56){const w=P(Math.cos(ca)*cr,Math.sin(ca)*cr);st.trail.push({x:w.x,y:w.y,t});}
        st.trail=st.trail.filter(p=>t-p.t<.55);
        cfg.trail(st,t);
        if(t<1.5){const h=st.trail[st.trail.length-1];if(h){g.globalCompositeOperation='lighter';glow(h.x,h.y,U*(.03+.05*u),cfg.col,.9);g.fillStyle='#ffffff';disc(h.x,h.y,U*(.006+.008*u));g.globalCompositeOperation='source-over';}}
        // ignition at the dock
        const s=P(Math.cos(da),Math.sin(da)),ip=ss(1.5,1.85,t),rs=k*.15*eBack(ip)*(1+(cfg.pulse?cfg.pulse(st,t)*.14:0));
        st.sx=s.x;st.sy=s.y;st.rs=rs;
        const k1=(t-1.5)/.9,k2=(t-1.6)/1.1;
        if(k1>0&&k1<1)ring(s.x,s.y,U*(.05+1.1*eOut(k1)),2+9*(1-k1),cfg.col,.85*(1-k1));
        if(k2>0&&k2<1)ring(s.x,s.y,U*(.05+.8*eOut(k2)),1.5+3*(1-k2),'#ffffff',.6*(1-k2),SQ*1.3);
        cfg.back&&cfg.back(st,t);
        if(ip>0)sun(s.x,s.y,rs*(1+out*.6),cfg.col,t,{rays:cfg.rays||12,spin:.35,halo:5,mid:cfg.mid,burst:(1-ip)*2.5});
        cfg.front&&cfg.front(st,t);
        flash(st,t<1.5?ss(1.43,1.5,t)*.62:Math.max(0,.62*(1-(t-1.5)/.3)),cfg.flash||'#ffffff');
      },
      shake(t){return t>1.5&&t<2.0?12*(1-(t-1.5)/.5):0;},
      sound:cfg.sound,
    };
  }

  // ── Quad Sun I · Planet Atlas: four little worlds swing into orbit ──
  const WORLDS=[['#4fd1c5','#b8fff6','#14535a'],['#d65db1','#ffc6ec','#4a1543'],['#6fbf4a','#d2ffb0','#20451a'],['#b8c4d4','#ffffff','#3c4452']];
  const SUN_I=quadSun({id:'sun_planets',vol:1.1,col:'#aa66ff',mid:'#efd9ff',kicker:'QUAD SUN I IGNITED',title:'PLANET ATLAS',sub:'Worlds full of new sounds · ×2 points',dir:1,
    trail(st,t){g.globalCompositeOperation='lighter';st.trail.forEach((p,i)=>{const a=i/st.trail.length;g.fillStyle=rgba(i%3?'#c79bff':'#ffffff',a*.8);disc(p.x+Math.sin(i*1.7)*3,p.y+Math.cos(i*2.3)*3,1+a*st.U*.008);});g.globalCompositeOperation='source-over';},
    worlds(st,t,front){const{rs}=st;WORLDS.forEach((w,i)=>{const p=ss(1.95+i*.17,2.3+i*.17,t);if(p<=0)return;const R=st.rs*(2.0+i*.8),sp=[1.5,1.05,.78,.6][i],a=t*sp+i*1.9,z=Math.sin(a);
      if(front!==(z>=0))return;const x=st.sx+Math.cos(a)*R,y=st.sy+z*R*.42,r=st.U*(.03+.005*i)*eBack(p)*(.85+.2*z);
      if(!front){g.strokeStyle=rgba('#c79bff',.18*p);g.lineWidth=1;g.beginPath();g.ellipse(st.sx,st.sy,R,R*.42,0,0,TAU);g.stroke();}
      ball(x,y,r,w[0],w[1],w[2]);if(i===3){g.strokeStyle=rgba('#e8f2ff',.7);g.lineWidth=Math.max(1,r*.15);g.beginPath();g.ellipse(x,y,r*1.8,r*.45,-.3,0,TAU);g.stroke();}
      if(p<1)ring(x,y,r*(1+3*(1-p)),1.5,w[0],p*(1-p)*3);});},
    back(st,t){this.worlds(st,t,false);},front(st,t){this.worlds(st,t,true);},
    sound(S){const t=S.t;riser(S,t+.1,1.4,70,280,.8);tone(S,t+.15,320,{f1:1500,gl:1.3,a:.035,k:1.2,d:.12,rv:.5});
      const b=t+1.5;boom(S,b,.8);
      [146.8,220,277.2,370,415.3,554.4].forEach((f,i)=>tone(S,b+i*.04,f,{type:i<2?'triangle':'sine',a:.04,k:.1,d:2.4,rv:.6}));   // D lydian: wonder
      [587.3,740,880,1108.7].forEach((f,i)=>{const s=t+1.95+i*.17;tone(S,s,f,{type:'triangle',a:.06,d:.9,rv:.6});tone(S,s,f*2,{a:.02,d:.4,rv:.6});});},
  });

  // ── Quad Sun II · Musical Toolkit: it pulses to a drum groove; EQ bars blaze round it ──
  const BEAT=60/126,KICKS=[1.5,1.5+BEAT,1.5+2*BEAT,1.5+3*BEAT,1.5+4*BEAT,1.5+5*BEAT];
  const kickEnv=t=>{let e=0;KICKS.forEach(k=>{if(t>=k)e=Math.max(e,Math.exp(-(t-k)*8));});return e;};
  const SUN_II=quadSun({id:'sun_points',vol:.4,col:'#ffcc00',mid:'#fff3b8',kicker:'QUAD SUN II IGNITED',title:'MUSICAL TOOLKIT',sub:'Tools for your music · ×2 points',dir:-1,rays:16,
    pulse(st,t){return kickEnv(t);},
    trail(st,t){g.lineCap='round';for(let i=1;i<st.trail.length;i++){const a=i/st.trail.length,p=st.trail[i],q=st.trail[i-1];g.strokeStyle=rgba('#ffd84a',a*.9);g.lineWidth=1+a*st.U*.012;g.beginPath();g.moveTo(q.x,q.y);g.lineTo(p.x,p.y);g.stroke();}},
    back(st,t){if(t<1.5)return;const e=kickEnv(t),n=40;g.globalCompositeOperation='lighter';
      for(let i=0;i<n;i++){const an=i/n*TAU+t*.2,h=.25+.75*Math.abs(Math.sin(i*1.31+t*5.3))*(.35+.65*e),L=st.rs*(1.2+1.25*h*ss(1.5,1.9,t));
        g.strokeStyle=`hsla(${44-h*30},100%,${55+e*20}%,${.22+.4*h})`;g.lineWidth=Math.max(2,st.rs*.09);g.beginPath();g.moveTo(st.sx+Math.cos(an)*st.rs*1.15,st.sy+Math.sin(an)*st.rs*1.15);g.lineTo(st.sx+Math.cos(an)*L,st.sy+Math.sin(an)*L);g.stroke();}
      g.globalCompositeOperation='source-over';
      KICKS.forEach(k=>{const q=(t-k)/.7;if(q>0&&q<1)ring(st.sx,st.sy,st.rs*(1.2+3.5*eOut(q)),2+3*(1-q),'#ffcc00',.6*(1-q));});},
    front(st,t){if(t<1.6)return;if(!st.notes){st.notes=[];st.nk=0;}
      while(st.nk<KICKS.length&&t>=KICKS[st.nk]){for(let j=0;j<3;j++)st.notes.push({b:t,a:rnd(0,TAU),v:rnd(.6,1.2),gl:'♪♫♬'[(st.nk+j)%3],h:rnd(30,55)});st.nk++;}
      g.textAlign='center';g.textBaseline='middle';
      st.notes.forEach(n=>{const q=(t-n.b)/1.4;if(q<0||q>1)return;const d=st.rs*(1.4+3.2*q*n.v),x=st.sx+Math.cos(n.a)*d,y=st.sy+Math.sin(n.a)*d*.7-q*st.U*.08;
        g.fillStyle=`hsla(${n.h},100%,70%,${1-q})`;g.font=`${Math.round(st.U*(.05+.02*n.v))}px sans-serif`;g.fillText(n.gl,x,y);});},
    sound(S){const t=S.t;
      // the build: kicks on the beat, then a snare roll that speeds up into the ignition
      [1.5-3*BEAT,1.5-2*BEAT,1.5-BEAT].forEach(k=>inst(S,'kick',t+k,0,.8));
      for(let i=0;i<10;i++){const k=1.5-BEAT+BEAT*(1-Math.pow(1-i/10,1.25));inst(S,'snare',t+k,0,.3+i*.05);}
      noise(S,t+.2,{f0:400,f1:7000,q:.9,a:.07,k:1.25,d:.08});
      // the drop: a crash, then a little groove on I – vi – IV – V
      noise(S,t+1.5,{type:'highpass',f0:5000,a:.12,d:1.4,rv:.4});
      const CH=[[0,4,7,11,14],[-3,0,4,7],[-7,-3,0,5],[-5,-1,2,7]],BASS=[-200,700,300,500];
      KICKS.forEach((k,i)=>{inst(S,'kick',t+k,0,.9);if(i%2)inst(S,'clap',t+k,0,.6);inst(S,'hihat',t+k+BEAT/2,0,.5);
        if(i<4){CH[i].forEach(s=>inst(S,'stab',t+k,cents(s),.32));inst(S,'basenote',t+k,BASS[i],.7);}});},
  });

  // ── Quad Sun III · Minigame Nexus: 8-bit — a countdown, a pixel comet, a sun that rezzes in, game icons and coins ──
  const ICONS=['🪐','🪱','🥁','🏆'];
  function pixCanvas(st){if(!st.pc){st.pc=document.createElement('canvas');st.pq=st.pc.getContext('2d');}return st.pq;}
  const SUN_III=quadSun({id:'sun_minigames',vol:2.2,col:'#ff6644',mid:'#ffd8a0',kicker:'QUAD SUN III IGNITED',title:'MINIGAME NEXUS',sub:'New games to play · ×2 points',dir:1,flash:'#fff0c0',
    trail(st,t){const px=Math.max(4,Math.round(st.U/64));st.trail.forEach((p,i)=>{const a=i/st.trail.length;g.fillStyle=['#ff3b3b','#ff8a2a','#ffd23f','#ffffff'][Math.min(3,Math.floor(a*4))];g.globalAlpha=.25+a*.75;
      const s=px*(1+Math.floor(a*2));g.fillRect(Math.round(p.x/px)*px-s/2,Math.round(p.y/px)*px-s/2,s,s);});g.globalAlpha=1;
      // 3 · 2 · 1
      ['3','2','1'].forEach((d,i)=>{const s0=.12+i*.44,q=(t-s0)/.42;if(q<0||q>1)return;const q2=pixCanvas(st);st.pc.width=16;st.pc.height=16;q2.clearRect(0,0,16,16);
        q2.fillStyle=['#ff4a4a','#ffd23f','#5fe07a'][i];q2.font='bold 15px monospace';q2.textAlign='center';q2.textBaseline='middle';q2.fillText(d,8,9);
        const sz=st.U*.32*(1.15-.15*eOut(q*3)),x=st.W/2,y=st.H*.3;g.imageSmoothingEnabled=false;g.globalAlpha=q<.75?1:(1-q)*4;g.drawImage(st.pc,x-sz/2,y-sz/2,sz,sz);g.globalAlpha=1;g.imageSmoothingEnabled=true;});},
    back(st,t){if(t<1.5)return;
      if(!st.px){st.px=[];for(let i=0;i<70;i++){const a=rnd(0,TAU),v=st.U*rnd(.5,1.6);st.px.push({x:st.sx,y:st.sy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-st.U*.4,c:['#ff3b3b','#ff8a2a','#ffd23f','#ffffff','#5fe07a'][i%5],s:rnd(.6,1.4)});}}
      const px=Math.max(4,Math.round(st.U/64));
      st.px.forEach(p=>{p.vy+=st.U*1.6*st.dt;p.x+=p.vx*st.dt;p.y+=p.vy*st.dt;p.vx*=1-st.dt*.8;const a=Math.max(0,1-(t-1.5)/1.8);if(a<=0)return;g.globalAlpha=a;g.fillStyle=p.c;const s=px*p.s;g.fillRect(Math.round(p.x/px)*px,Math.round(p.y/px)*px,s,s);});g.globalAlpha=1;
      // the sun rezzes in: chunky pixels that get finer and finer
      const rz=ss(1.5,2.05,t);if(rz<1){const n=Math.round(lerp(6,40,rz)),q=pixCanvas(st);st.pc.width=n;st.pc.height=n;q.clearRect(0,0,n,n);
        const gr=q.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);gr.addColorStop(0,'#ffffff');gr.addColorStop(.35,'#ffd8a0');gr.addColorStop(.7,'#ff6644');gr.addColorStop(1,'rgba(255,102,68,0)');q.fillStyle=gr;q.fillRect(0,0,n,n);
        const sz=st.rs*4.2;g.imageSmoothingEnabled=false;g.globalAlpha=1-rz;g.drawImage(st.pc,st.sx-sz/2,st.sy-sz/2,sz,sz);g.globalAlpha=1;g.imageSmoothingEnabled=true;}},
    front(st,t){g.textAlign='center';g.textBaseline='middle';
      ICONS.forEach((ic,i)=>{const p=ss(1.95+i*.17,2.25+i*.17,t);if(p<=0)return;const a=-Math.PI/2+(i-1.5)*.75+Math.sin(t*1.3+i)*.05,R=st.rs*3.1,x=st.sx+Math.cos(a)*R,y=st.sy+Math.sin(a)*R*.85+Math.sin(t*4+i)*st.U*.008;
        g.font=`${Math.round(st.U*.095*eBack(p))}px sans-serif`;g.fillText(ic,x,y);
        if(p<1){const px=Math.max(3,Math.round(st.U/90));g.fillStyle='#ffd23f';for(let j=0;j<6;j++){const b=j/6*TAU,d=st.U*.06*p;g.fillRect(x+Math.cos(b)*d-px/2,y+Math.sin(b)*d-px/2,px,px);}}});},
    sound(S){const t=S.t;
      [.12,.56,1.0].forEach(s=>tone(S,t+s,523.3,{type:'square',a:.05,hold:.1,d:.03}));
      for(let i=0;i<14;i++){const s=.15+1.3*(1-Math.pow(1-i/14,1.6));tone(S,t+s,[262,330,392,523,659,784,1047][i%7]*(i>6?2:1),{type:'square',a:.025,hold:.03,d:.03});}
      const b=t+1.5;tone(S,b,1046.5,{type:'square',a:.05,hold:.18,d:.06});
      noise(S,b,{type:'lowpass',f0:2500,f1:200,q:.8,a:.3,d:.7});tone(S,b,110,{type:'square',f1:40,gl:.4,a:.12,d:.45});
      [523,659,784,1047,1319,1568,2093].forEach((f,i)=>tone(S,b+.08+i*.035,f,{type:'square',a:.035,hold:.02,d:.04}));
      ICONS.forEach((ic,i)=>{const s=t+1.95+i*.17;tone(S,s,987.8,{type:'square',a:.04,hold:.05,d:.01});tone(S,s+.06,1318.5,{type:'square',a:.04,hold:.12,d:.08});});},
  });

  // ── Quad Sun IV · Alien Evolution: it spins in on a DNA helix, then buddies pop up round it ──
  const BUD_COLS=['#42a5f5','#ff5fb8','#5fe07a','#ffd23f','#b38cff','#ff8a3d'];
  const SUN_IV=quadSun({id:'sun_aliens',vol:1.2,col:'#44eebb',mid:'#d8fff0',kicker:'QUAD SUN IV IGNITED',title:'ALIEN EVOLUTION',sub:'Evolve your buddies · ×2 points',dir:-1,
    trail(st,t){const T=st.trail;if(T.length<3)return;
      for(let i=1;i<T.length;i++){const p=T[i],q=T[i-1],dx=p.x-q.x,dy=p.y-q.y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,a=i/T.length,w=st.U*.018*a,ph=i*.55-t*9;
        const A={x:p.x+nx*Math.sin(ph)*w,y:p.y+ny*Math.sin(ph)*w},B={x:p.x-nx*Math.sin(ph)*w,y:p.y-ny*Math.sin(ph)*w};
        if(i%3===0){g.strokeStyle=rgba('#d8fff0',.35*a);g.lineWidth=1;g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.stroke();}
        g.fillStyle=rgba('#44eebb',a);disc(A.x,A.y,1+a*2.6);g.fillStyle=rgba('#ff7ad9',a);disc(B.x,B.y,1+a*2.6);}},
    buds(st,t,front){BUD_COLS.forEach((c,i)=>{const p=ss(1.95+i*.12,2.2+i*.12,t);if(p<=0)return;const a=i/6*TAU+t*.35+.3,z=Math.sin(a);if(front!==(z>=0))return;
      const R=st.rs*3.0,x=st.sx+Math.cos(a)*R,y=st.sy+z*R*.42+st.rs*.35;buddy(x,y,st.U*.085*(.8+.25*z),c,t,i*1.3,st.sx,st.sy,p);
      if(p<1){g.globalCompositeOperation='lighter';glow(x,y,st.U*.07*(1-p)*3,c,.6*(1-p));g.globalCompositeOperation='source-over';}});},
    back(st,t){this.buds(st,t,false);},
    front(st,t){this.buds(st,t,true);
      if(t>2.1){if(!st.hearts)st.hearts=[];if(st.hearts.length<18&&Math.random()<st.dt*12)st.hearts.push({b:t,x:st.sx+rnd(-1,1)*st.rs*3,c:BUD_COLS[Math.floor(rnd(0,6))]});
        g.textAlign='center';g.textBaseline='middle';st.hearts.forEach(h=>{const q=(t-h.b)/1.3;if(q<0||q>1)return;g.globalAlpha=1-q;g.fillStyle=h.c;g.font=`${Math.round(st.U*.035)}px sans-serif`;g.fillText('♥',h.x+Math.sin(q*6)*6,st.sy-st.rs*1.2-q*st.U*.2);});g.globalAlpha=1;}},
    sound(S){const t=S.t,c=S.c;
      // a theremin warble that climbs as the helix spins in
      const x=c.createOscillator(),l=c.createOscillator(),lg=c.createGain(),v=c.createGain();x.frequency.setValueAtTime(260,t+.15);x.frequency.exponentialRampToValueAtTime(880,t+1.48);
      l.frequency.value=6.5;lg.gain.setValueAtTime(5,t);lg.gain.linearRampToValueAtTime(40,t+1.4);l.connect(lg);lg.connect(x.detune);
      v.gain.setValueAtTime(0,t+.15);v.gain.linearRampToValueAtTime(.06,t+.6);v.gain.linearRampToValueAtTime(.08,t+1.45);v.gain.exponentialRampToValueAtTime(.0005,t+1.6);x.connect(v);v.connect(S.out);
      const s=c.createGain();s.gain.value=.5;v.connect(s);s.connect(S.send);x.start(t+.15);l.start(t+.15);x.stop(t+1.65);l.stop(t+1.65);
      noise(S,t+.2,{f0:500,f1:4000,q:1.5,a:.05,k:1.2,d:.1});
      const b=t+1.5;boom(S,b,.8);
      [0,400,700,1100,1200].forEach((cc,i)=>inst(S,'choir',b+i*.02,300+cc,.55));   // "ooh": C major 7 on the buddy choir
      [523.3,587.3,659.3,784,880,1046.5].forEach((f,i)=>{const s2=t+1.95+i*.12;tone(S,s2,f*.8,{f1:f*1.6,gl:.08,a:.09,d:.16,rv:.3});});},
  });

  // ══════════════════════ PLANETS ══════════════════════
  // projection onto a turning, tilted sphere: returns unit x, y and z (z > 0 faces us)
  function sph(lon,lat,rot,tilt){const l=lon-rot,x=Math.cos(lat)*Math.sin(l),y=-Math.sin(lat),z=Math.cos(lat)*Math.cos(l);
    return{x,y:y*Math.cos(tilt)-z*Math.sin(tilt),z:y*Math.sin(tilt)+z*Math.cos(tilt)};}
  // a patch on the surface, squashed as it turns away from us
  function patch(px,py,r,s,ar,col,a){if(s.z<.02)return;g.fillStyle=rgba(col,a*Math.min(1,s.z*3));g.beginPath();g.ellipse(px+s.x*r,py+s.y*r,Math.max(.5,ar*r*Math.max(.12,s.z)),ar*r,Math.atan2(s.y,s.x),0,TAU);g.fill();}
  // v0.2.154: light comes from a distant star up and to the left (screen x, y, towards us)
  const LX=-.55,LY=-.5,LZ=.67;
  const lit=s=>s.x*LX+s.y*LY+s.z*LZ;          // > 0 on the day side
  // a cheap little light (two discs, no gradient: these are drawn by the dozen every frame)
  function spark(x,y,r,col,a){g.fillStyle=rgba(col,.22*a);disc(x,y,r);g.fillStyle=rgba(col,.9*a);disc(x,y,r*.38);}
  // a continent with a paler shallow-water coast round it
  function land(px,py,r,s,ar,col,coast,a){patch(px,py,r,s,ar*1.3,coast,(a||1)*.45);patch(px,py,r,s,ar,col,a||1);}
  // a little moon (for depth): lit from the same star
  function miniMoon(x,y,mr,col){if(mr<1)return;const k=g.createRadialGradient(x+LX*mr*.5,y+LY*mr*.5,mr*.1,x,y,mr);k.addColorStop(0,'#ffffff');k.addColorStop(.35,col);k.addColorStop(1,'#0a0a16');g.fillStyle=k;disc(x,y,mr);
    g.fillStyle='rgba(0,0,0,.18)';[[.3,.2,.22],[-.25,.35,.16],[.05,-.3,.14]].forEach(([dx,dy,cr])=>disc(x+dx*mr,y+dy*mr,cr*mr));}
  function line3(px,py,r,pts,col,a,w){g.strokeStyle=rgba(col,a);g.lineWidth=w;g.beginPath();let on=false;pts.forEach(s=>{if(s.z<0){on=false;return;}const x=px+s.x*r,y=py+s.y*r;if(on)g.lineTo(x,y);else g.moveTo(x,y);on=true;});g.stroke();}

  const THEMES={
    mantra:{vol:.65,col:'#4fd1c5',atm:'#7ff0e6',base:'#1b6f8f',lite:'#8ff0f6',dark:'#06243a',spec:1,moon:'#cfe9f0',hues:[170,185,45],flavor:'calm, ringing sound',
      init(st){st.land=[];for(let i=0;i<9;i++){const lo=rnd(0,TAU),la=rnd(-1,1);for(let j=0;j<3;j++)st.land.push({lo:lo+rnd(-.25,.25),la:la+rnd(-.2,.2),ar:rnd(.12,.24)});}
        st.cloud=[];for(let i=0;i<7;i++)st.cloud.push({lo:rnd(0,TAU),la:rnd(-1.1,1.1),ar:rnd(.08,.16)});st.pet=[];for(let i=0;i<34;i++)st.pet.push({a:rnd(0,TAU),r:rnd(1.15,2.2),v:rnd(.3,.8),s:rnd(.6,1.3),c:i%3?'#ffd25a':'#ff9ad5',ph:rnd(0,TAU)});},
      surface(st,x,y,r,rot,tl){st.land.forEach(b=>land(x,y,r,sph(b.lo,b.la,rot,tl),b.ar,'#3fb8a0','#8ff0e0',.92));
        st.land.forEach((b,i)=>{if(i%3)return;patch(x,y,r,sph(b.lo+.04,b.la+.03,rot,tl),b.ar*.45,'#2a8c78',.8);});},
      clouds(st,x,y,r,rot,tl){st.cloud.forEach(b=>patch(x,y,r,sph(b.lo,b.la,rot*1.35,tl),b.ar*1.2,'#ffffff',.38));},
      night(st,x,y,r,rot,tl,t){st.land.forEach((b,i)=>{if(i%2)return;const s2=sph(b.lo,b.la,rot,tl);if(s2.z<.1||lit(s2)>-.05)return;spark(x+s2.x*r,y+s2.y*r,r*.04,'#ffd25a',.7+.3*Math.sin(t*3+i));});},
      outer(st,x,y,r,t){if(t<1.55)return;for(let i=0;i<3;i++){const q=((t-1.55)*.55+i/3)%1;ring(x,y,r*(1.08+q*1.3),1.5+2*(1-q),'#ffd25a',.4*(1-q)*ss(1.55,1.9,t));}
        st.pet.forEach(p=>{const q=((t-1.4)*p.v*.35+p.ph/TAU)%1,R=r*p.r,px=x+Math.cos(p.a+t*.2)*R,py=y+Math.sin(p.a+t*.2)*R*.6-q*r*.6;g.fillStyle=rgba(p.c,.7*Math.sin(q*Math.PI)*ss(1.4,1.8,t));g.beginPath();g.ellipse(px,py,st.U*.008*p.s,st.U*.004*p.s,t*p.v+p.ph,0,TAU);g.fill();});},
      sound(S,K){const t=S.t;riser(S,t,1.35,55,180,.8);tone(S,t,110,{a:.05,k:1,hold:2,d:1.2,rv:.5});tone(S,t,165,{a:.03,k:1.2,hold:1.8,d:1.2,rv:.5});
        boom(S,t+1.4,.7);inst(S,'om_bowl',t+1.42,0,.9);inst(S,'om_bell',t+1.45,-1200,.8);
        const sc=[-1200,-900,-700,-500,-200,0];for(let i=0;i<K;i++)inst(S,'om_bell',t+1.95+i*.2,sc[i%sc.length],.7);}},
    hyphae:{vol:.6,col:'#d65db1',atm:'#ff9ad5',base:'#5a2470',lite:'#c27ad8',dark:'#170820',moon:'#e8c8ff',hues:[300,320,185],flavor:'earthy, organic sound',
      init(st){st.caps=[];for(let i=0;i<13;i++){const lo=rnd(0,TAU),la=rnd(-.9,.9),ar=rnd(.16,.3),spots=[];for(let j=0;j<4;j++)spots.push({dl:rnd(-.6,.6)*ar,dd:rnd(-.6,.6)*ar,ar:rnd(.03,.06)});st.caps.push({lo,la,ar,spots});}
        st.my=[];for(let i=0;i<14;i++){let lo=rnd(0,TAU),la=rnd(-1,1);const pts=[];for(let j=0;j<9;j++){pts.push([lo,la]);lo+=rnd(-.22,.22);la+=rnd(-.18,.18);}st.my.push(pts);}
        st.sp=[];for(let i=0;i<60;i++)st.sp.push({a:rnd(0,TAU),d:rnd(.95,1.05),v:rnd(.25,.7),s:rnd(.5,1.4),c:i%2?'#ff9ad5':'#7ff7ff',b:rnd(1.3,2.6)});},
      surface(st,x,y,r,rot,tl,t){st.caps.forEach(c=>{const s=sph(c.lo,c.la,rot,tl);patch(x,y,r,s,c.ar*1.18,'#3a0f45',.55);patch(x,y,r,s,c.ar,'#c2459c',.95);patch(x,y,r,s,c.ar*.62,'#e070bf',.6);c.spots.forEach(p=>patch(x,y,r,sph(c.lo+p.dl/Math.max(.3,Math.cos(c.la)),c.la+p.dd,rot,tl),p.ar,'#ffe9d6',.9));});
        const grow=ss(1.6,2.9,t);if(grow>0){g.globalCompositeOperation='lighter';st.my.forEach(m=>{const n=Math.max(2,Math.round(m.length*grow));line3(x,y,r,m.slice(0,n).map(p=>sph(p[0],p[1],rot,tl)),'#6ff7ff',.65,Math.max(1,r*.012));});g.globalCompositeOperation='source-over';}},
      outer(st,x,y,r,t){g.globalCompositeOperation='lighter';st.sp.forEach(p=>{if(t<p.b*.7)return;const q=((t-p.b*.7)*p.v*.45)%1,R=r*(p.d+q*1.1),px=x+Math.cos(p.a)*R+Math.sin(t*2+p.a*5)*r*.04,py=y+Math.sin(p.a)*R-q*r*.35;
        glow(px,py,st.U*.014*p.s,p.c,.8*Math.sin(q*Math.PI));});g.globalCompositeOperation='source-over';},
      sound(S,K){const t=S.t,c=S.c;riser(S,t,1.35,50,160,.7);
        const lp=c.createBiquadFilter(),v=c.createGain(),x=c.createOscillator(),l=c.createOscillator(),lg=c.createGain();x.type='sawtooth';x.frequency.value=73.4;lp.type='lowpass';lp.Q.value=6;lp.frequency.value=500;l.frequency.value=.9;lg.gain.value=320;l.connect(lg);lg.connect(lp.frequency);
        v.gain.setValueAtTime(0,t+1.3);v.gain.linearRampToValueAtTime(.04,t+1.8);v.gain.setValueAtTime(.04,t+3.4);v.gain.exponentialRampToValueAtTime(.0005,t+4.3);x.connect(lp);lp.connect(v);v.connect(S.out);x.start(t+1.3);l.start(t+1.3);x.stop(t+4.35);l.stop(t+4.35);
        boom(S,t+1.4,.7);inst(S,'re_gong',t+1.42,0,.85);inst(S,'mo_hollowboom',t+1.42,0,.8);
        const sc=[784,880,1047,1175,1319,1568];for(let i=0;i<K;i++){const s=t+1.95+i*.2,f=sc[i%sc.length];tone(S,s,f*.7,{f1:f,gl:.05,a:.07,d:.25,rv:.5});tone(S,s+.05,f*1.5,{a:.02,d:.3,rv:.6});}
        for(let i=0;i<10;i++)tone(S,t+1.6+i*.21+Math.random()*.08,rnd(900,1800),{f1:rnd(1800,2600),gl:.04,a:.018,d:.07,rv:.5});}},
    timbra:{vol:.7,col:'#6fbf4a',atm:'#bfff8a',base:'#5a3d22',lite:'#b08a58',dark:'#160d06',moon:'#f0e2c0',hues:[100,120,35],flavor:'wooden sound',
      init(st){st.pole={lo:rnd(0,TAU),la:.35};st.forest=[];for(let i=0;i<20;i++){const lo=rnd(0,TAU),la=rnd(-.85,.6);for(let j=0;j<5;j++)st.forest.push({lo:lo+rnd(-.2,.2),la:la+rnd(-.15,.15),ar:rnd(.07,.14),c:['#2f7d3a','#3f9a46','#5fae4a','#1f5e2c','#7cc25a'][j]});}st.fly=[];for(let i=0;i<30;i++)st.fly.push({lo:rnd(0,TAU),la:rnd(-1,1),ph:rnd(0,TAU)});
        st.leaf=[];for(let i=0;i<44;i++)st.leaf.push({a:rnd(0,TAU),R:rnd(1.3,2.1),v:rnd(.5,1.1)*(i%5?1:-1),s:rnd(.7,1.3),sp:rnd(2,6),c:['#5fae4a','#9fd36a','#e8c24a','#d9822b'][i%4]});},
      surface(st,x,y,r,rot,tl){
        // the planet's face is a tree-trunk cross-section: growth rings round one pole…
        const P=st.pole;for(let k=1;k<=11;k++){const rho=k*.075,pts=[];for(let j=0;j<=40;j++){const b=j/40*TAU,w=1+.06*Math.sin(b*3+k);pts.push(sph(P.lo+Math.cos(b)*rho*w/Math.cos(P.la),P.la+Math.sin(b)*rho*w,rot,tl));}line3(x,y,r,pts,k%2?'#d9a868':'#5a3a1e',.95,Math.max(1.5,r*.02));}
        // …and forests everywhere else
        st.forest.forEach(f=>{const s2=sph(f.lo,f.la,rot,tl);patch(x,y,r,s2,f.ar*1.15,'#1a3d1c',.5);patch(x,y,r,s2,f.ar,f.c,.95);});},
      night(st,x,y,r,rot,tl,t){st.fly.forEach((f,i)=>{const s2=sph(f.lo,f.la,rot,tl);if(s2.z<.1||lit(s2)>0)return;spark(x+s2.x*r,y+s2.y*r,r*.035,'#e8ff7a',.5+.5*Math.sin(t*5+f.ph));});},
      leaves(st,x,y,r,t,front){st.leaf.forEach(l=>{const a=l.a+t*l.v*.6,z=Math.sin(a);if(front!==(z>=0))return;const R=r*l.R,px=x+Math.cos(a)*R,py=y+z*R*.32-Math.sin(t*1.4+l.a)*r*.05,ap=ss(1.45,1.9,t);if(ap<=0)return;
        g.fillStyle=rgba(l.c,ap*(.6+.4*(z+1)/2));g.beginPath();g.ellipse(px,py,st.U*.012*l.s,st.U*.005*l.s,t*l.sp+l.a,0,TAU);g.fill();});},
      back(st,x,y,r,t){this.leaves(st,x,y,r,t,false);},outer(st,x,y,r,t){this.leaves(st,x,y,r,t,true);},
      sound(S,K){const t=S.t;riser(S,t,1.35,60,200,.6);
        [0,200,400,700,900,1200,1400,1600,1900].forEach((c2,i)=>inst(S,'rw_marimba',t+.15+1.15*(1-Math.pow(1-i/9,1.4)),c2,.6));   // a marimba run into the arrival
        boom(S,t+1.4,.6);inst(S,'bm_angklung',t+1.42,0,.9);inst(S,'rw_bass',t+1.42,0,.9);inst(S,'ok_slit',t+1.6,0,.7);
        const sc=[0,200,500,700,900,1200];for(let i=0;i<K;i++)inst(S,'rw_xylo',t+1.95+i*.2,sc[i%sc.length],.75);
        inst(S,'bm_chimes',t+2.9,0,.6);}},
    alloy:{vol:.62,col:'#b8c4d4',atm:'#9fe6ff',base:'#6a7688',lite:'#dfe8f4',dark:'#141a24',spec:1,moon:'#c8d4e4',hues:[200,210,30],flavor:'metal sound',
      init(st){st.sparks=[];st.lights=[];for(let i=0;i<26;i++)st.lights.push({lo:rnd(0,TAU),la:rnd(-1.1,1.1),ph:rnd(0,TAU)});},
      surface(st,x,y,r,rot,tl,t){
        // brushed-metal belts, then steel plating: panel seams along latitudes and longitudes, with lights in the seams
        [[-.85,'#8a96a8'],[-.4,'#5c6778'],[0,'#97a3b5'],[.4,'#5c6778'],[.85,'#8a96a8']].forEach(([la,c])=>{const pts=[];for(let j=0;j<=48;j++)pts.push(sph(j/48*TAU,la,rot,tl));line3(x,y,r,pts,c,.55,Math.max(2,r*.13));});
        [-1.05,-.6,-.2,.2,.6,1.05].forEach(la=>{const pts=[];for(let j=0;j<=48;j++)pts.push(sph(j/48*TAU,la,rot,tl));line3(x,y,r,pts,'#262d38',.55,Math.max(1,r*.01));});
        for(let k=0;k<12;k++){const lo=k/12*TAU,pts=[];for(let j=0;j<=24;j++)pts.push(sph(lo,-1.5+j/24*3,rot,tl));line3(x,y,r,pts,'#262d38',.45,Math.max(1,r*.008));}
        g.globalCompositeOperation='lighter';st.lights.forEach(l=>{const s=sph(l.lo,l.la,rot,tl);if(s.z<.05)return;glow(x+s.x*r,y+s.y*r,r*.05,'#7fe0ff',.5+.5*Math.sin(t*4+l.ph));});
        g.globalCompositeOperation='source-over';},
      ringHalf(x,y,r,t,front){const ap=ss(1.45,1.9,t);if(ap<=0)return;g.save();g.translate(x,y);g.rotate(-.28);g.lineWidth=Math.max(2,r*.07);g.setLineDash([r*.09,r*.03]);g.lineDashOffset=-t*r*.15;
        g.strokeStyle=`rgba(200,214,232,${.75*ap})`;g.beginPath();g.ellipse(0,0,r*1.75,r*.36,0,front?0:Math.PI,front?Math.PI:TAU);g.stroke();g.setLineDash([]);g.restore();},
      back(st,x,y,r,t){this.ringHalf(x,y,r,t,false);},
      shadow(st,x,y,r,t){const ap=ss(1.45,1.9,t);if(ap<=0)return;g.save();g.translate(x,y);g.rotate(-.28);g.strokeStyle=`rgba(5,8,16,${.35*ap})`;g.lineWidth=Math.max(3,r*.1);g.beginPath();g.ellipse(r*.08,r*.12,r*1.75,r*.36,0,0,TAU);g.stroke();g.restore();},
      outer(st,x,y,r,t){this.ringHalf(x,y,r,t,true);
        st.sparks.forEach(p=>{p.vy+=st.U*1.4*st.dt;p.x+=p.vx*st.dt;p.y+=p.vy*st.dt;p.life-=st.dt;if(p.life<=0)return;g.strokeStyle=`rgba(255,${170+Math.round(p.life*60)},80,${Math.min(1,p.life*1.6)})`;g.lineWidth=2;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*.03,p.y-p.vy*.03);g.stroke();});},
      onPing(st,x,y){for(let i=0;i<14;i++){const a=rnd(-Math.PI,0),v=st.U*rnd(.4,1.1);st.sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.5,1)});}},
      sound(S,K){const t=S.t;riser(S,t,1.35,70,240,.7);noise(S,t+.3,{type:'highpass',f0:3000,f1:9000,a:.03,k:1,d:.1});
        [0,400,700,1200,1600,1900,2400].forEach((c2,i)=>inst(S,'cr_tenor',t+.2+1.1*(1-Math.pow(1-i/7,1.4)),c2-1200,.55));
        boom(S,t+1.4,.6);inst(S,'bz_gong',t+1.42,0,.85);inst(S,'ti_anvil',t+1.44,0,.6);
        const sc=[0,400,700,1100,1200,1400];for(let i=0;i<K;i++){inst(S,'cr_tenor',t+1.95+i*.2,sc[i%sc.length],.75);if(i===0)inst(S,'ti_anvil',t+1.95,0,.35);}}},
  };
  // a whole planet (v0.2.154): a two-layer atmosphere, a globe lit from the star (day side → crisp terminator → night
  // side), the theme's surface, clouds that drift faster than the ground, night-side lights, a sun glint on shiny
  // worlds, a hazy inner rim and a bright rim along the lit edge
  function globe(st,T,x,y,r,rot,t,inner){
    g.save();
    const at=g.createRadialGradient(x,y,r*.9,x,y,r*1.42);at.addColorStop(0,rgba(T.atm,.55));at.addColorStop(.35,rgba(T.atm,.2));at.addColorStop(1,rgba(T.atm,0));g.fillStyle=at;disc(x,y,r*1.42);
    g.beginPath();g.arc(x,y,r,0,TAU);g.clip();
    const lx=x+LX*r*.55,ly=y+LY*r*.55;
    const b=g.createRadialGradient(lx,ly,r*.08,x,y,r*1.08);b.addColorStop(0,T.lite);b.addColorStop(.55,T.base);b.addColorStop(1,T.dark);g.fillStyle=b;g.fillRect(x-r,y-r,r*2,r*2);
    T.surface(st,x,y,r,rot,st.tilt,t);
    T.clouds&&T.clouds(st,x,y,r,rot,st.tilt,t);
    T.shadow&&T.shadow(st,x,y,r,t);
    inner&&inner();
    // day → night
    const nt=g.createRadialGradient(x+LX*r*.62,y+LY*r*.62,r*.2,x+LX*r*.62,y+LY*r*.62,r*1.75);
    nt.addColorStop(0,'rgba(0,0,0,0)');nt.addColorStop(.46,'rgba(0,0,0,0)');nt.addColorStop(.62,'rgba(3,5,16,.5)');nt.addColorStop(.78,'rgba(2,3,12,.86)');nt.addColorStop(1,'rgba(1,2,8,.94)');
    g.fillStyle=nt;g.fillRect(x-r,y-r,r*2,r*2);
    if(T.night){g.globalCompositeOperation='lighter';T.night(st,x,y,r,rot,st.tilt,t);g.globalCompositeOperation='source-over';}
    if(T.spec){g.globalCompositeOperation='lighter';const sx=x+LX*r*.42,sy=y+LY*r*.42,sp=g.createRadialGradient(sx,sy,0,sx,sy,r*.22);sp.addColorStop(0,'rgba(255,255,255,.5)');sp.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sp;disc(sx,sy,r*.22);g.globalCompositeOperation='source-over';}
    const haze=g.createRadialGradient(x,y,r*.78,x,y,r);haze.addColorStop(0,rgba(T.atm,0));haze.addColorStop(1,rgba(T.atm,.32));g.fillStyle=haze;g.fillRect(x-r,y-r,r*2,r*2);
    g.restore();
    const rim=g.createLinearGradient(x+LX*r,y+LY*r,x-LX*r,y-LY*r);rim.addColorStop(0,rgba(T.atm,.95));rim.addColorStop(.45,rgba(T.atm,.18));rim.addColorStop(1,rgba(T.atm,0));
    g.strokeStyle=rim;g.lineWidth=Math.max(2,r*.035);g.beginPath();g.arc(x,y,r-g.lineWidth*.3,0,TAU);g.stroke();
  }
  function planetScene(id){
    const node=typeof SKILL_MAP!=='undefined'&&SKILL_MAP[id],key=id.replace(/^planet_/,''),T=THEMES[key]||genericTheme(node);
    const conts=typeof SKILL_TREE_NODES!=='undefined'?SKILL_TREE_NODES.filter(n=>n.requires&&n.requires[0]===id&&/^cont_/.test(n.id)):[];
    const K=Math.max(1,conts.length),name=node?node.name.replace(/^Planet\s+/i,'').toUpperCase():key.toUpperCase();
    return{col:T.col,vol:T.vol||.7,kicker:'NEW WORLD DISCOVERED',title:'PLANET '+name,sub:`${K} continent${K>1?'s':''} of ${T.flavor}`,
      init(st){st.rot0=rnd(0,TAU);st.tilt=rnd(.25,.45);st.pinged=0;
        st.pins=[];for(let i=0;i<K;i++)st.pins.push({lo:(K>1?(i/(K-1)-.5)*1.9:0),la:[.38,-.28,.55,-.5,.12,-.05,.3][i%7]});T.init&&T.init(st);},
      draw(st,t){
        const{W,H,U}=st,arr=ss(1.32,1.95,t),out=ss(3.55,4.25,t),x=st.cx,y=H*.37;
        const spd=t<1.35?.2+3.6*Math.pow(t/1.35,2):Math.max(.05,3.8*(1-ss(1.35,1.75,t)));
        space(st,T.col,.12+.25*arr,0,0);
        warp(st,spd,T.hues,x,y);
        // the distant star that lights the planet (v0.2.154)
        if(arr>0){const sx=x+LX*W*.62,sy=y+LY*H*.55;g.globalCompositeOperation='lighter';glow(sx,sy,U*.42,'#fff0d0',.22*arr);glow(sx,sy,U*.09,'#ffffff',.85*arr);
          g.strokeStyle=`rgba(255,240,210,${.35*arr})`;g.lineWidth=1.5;g.beginPath();g.moveTo(sx-U*.16,sy);g.lineTo(sx+U*.16,sy);g.moveTo(sx,sy-U*.16);g.lineTo(sx,sy+U*.16);g.stroke();g.globalCompositeOperation='source-over';}
        // the planet: a speck in the distance, then it looms up as we drop out of warp, and at the end we dive in
        const far=U*(.008+.05*Math.pow(cl(t/1.35,0,1),3)),near=Math.min(U*.34,H*.22)*eBack(arr),r=Math.max(far*(1-arr),near)*(1+out*2.6);
        const rot=st.rot0+t*.28;
        // a little moon swings round (behind, then in front)
        const ma=st.rot0*2+t*.75,mz=Math.sin(ma),mx=x+Math.cos(ma)*r*1.85,my=y+mz*r*.32-r*.12,mr=r*.13*(1+mz*.15)*ss(1.4,1.9,t);
        if(mz<0&&mr>0)miniMoon(mx,my,mr,T.moon||'#d8d8e8');
        T.back&&T.back(st,x,y,r,t);
        if(arr<.3){g.globalCompositeOperation='lighter';glow(x,y,far*6,T.col,.9);g.globalCompositeOperation='source-over';}
        globe(st,T,x,y,r,rot,t,()=>{
          // continents light up one by one
          st.pins.forEach((p,i)=>{const t0=1.95+i*.2;if(t<t0)return;const s=sph(rot+p.lo-(t-2.4)*.28,p.la,rot,st.tilt);if(s.z<.05)return;const px=x+s.x*r,py=y+s.y*r,q=t-t0;
            const vz=Math.min(1,s.z*2);g.globalCompositeOperation='lighter';glow(px,py,r*.17,T.atm,.55*vz);glow(px,py,r*.07*(1+.2*Math.sin(t*5+i)),'#ffffff',.85*vz);g.globalCompositeOperation='source-over';g.fillStyle=rgba('#ffffff',.9*vz);disc(px,py,Math.max(1.5,r*.025));
            if(q<.7)ring(px,py,r*(.04+.18*eOut(q/.7)),Math.max(1.5,r*.012),'#ffffff',.85*(1-q/.7)*vz);});
        });
        // the sound of each continent lighting up, and anything the theme throws off (sparks…)
        while(st.pinged<K&&t>=1.95+st.pinged*.2){const p=st.pins[st.pinged],s=sph(rot+p.lo-(t-2.4)*.28,p.la,rot,st.tilt);T.onPing&&T.onPing(st,x+s.x*r,y+s.y*r);st.pinged++;}
        T.outer&&T.outer(st,x,y,r,t);
        if(mz>=0&&mr>0)miniMoon(mx,my,mr,T.moon||'#d8d8e8');
        flash(st,t<1.4?ss(1.33,1.4,t)*.55:Math.max(0,.55*(1-(t-1.4)/.35)),T.atm);
      },
      shake(t){return t>1.4&&t<1.9?9*(1-(t-1.4)/.5):0;},
      sound(S){T.sound(S,K);},
    };
  }
  // any future planet: its own colours from the node, plain continents, a generic jump and chime
  function genericTheme(node){const c=(node&&typeof BRANCH_COLORS!=='undefined'&&BRANCH_COLORS[node.branch])||'#aa66ff';
    return{col:c,atm:'#d8c0ff',base:'#3a2a6a',lite:'#9a86e0',dark:'#0c0820',hues:[260,280,190],flavor:'new sound',
      init(st){st.land=[];for(let i=0;i<12;i++)st.land.push({lo:rnd(0,TAU),la:rnd(-1,1),ar:rnd(.12,.25)});},
      surface(st,x,y,r,rot,tl){st.land.forEach(b=>land(x,y,r,sph(b.lo,b.la,rot,tl),b.ar,'#b39cff','#d8c8ff',.7));},clouds(st,x,y,r,rot,tl){st.land.forEach((b,i)=>{if(i%3)return;patch(x,y,r,sph(b.lo+1.3,b.la*.7,rot*1.3,tl),b.ar*.9,'#ffffff',.25);});},
      sound(S,K){const t=S.t;riser(S,t,1.35,60,200,.7);boom(S,t+1.4,.7);[0,4,7,11].forEach((s,i)=>tone(S,t+1.42+i*.03,261.6*Math.pow(2,s/12),{type:'triangle',a:.04,k:.1,d:2.2,rv:.6}));
        for(let i=0;i<K;i++)tone(S,t+1.95+i*.2,[784,880,1047,1175,1319][i%5],{a:.06,d:.6,rv:.6});}};}

  // ══ which nodes have a cutscene ══
  const FIXED={core:CORE,sun_planets:SUN_I,sun_points:SUN_II,sun_minigames:SUN_III,sun_aliens:SUN_IV};
  // more scenes plug in from other files (js/64-unlock-cutscenes-2.js): makers(id) → scene or null
  const MAKERS=[];window.addUnlockCutscenes=fn=>MAKERS.push(fn);
  function sceneFor(id){if(FIXED[id])return FIXED[id];const n=typeof SKILL_MAP!=='undefined'&&SKILL_MAP[id];if(n&&n.placeholder)return null;
    if(n&&/^planet_/.test(id))return planetScene(id);for(const m of MAKERS){const S=m(id,n);if(S)return S;}return null;}
  // the drawing / sound kit, for the scenes in other files (they draw with st.g)
  window.US_KIT={TAU,cl,ss,lerp,eOut,eBack,rnd,rgba,mixer,tone,noise,inst,riser,boom,cents,glow,ring,flash,disc,space,warp,sun,ball,buddy,sph,patch,line3,globe,THEMES,
    planetTheme:id=>THEMES[String(id).replace(/^planet_/,'')]||genericTheme(typeof SKILL_MAP!=='undefined'&&SKILL_MAP[id])};
  window.hasUnlockCutscene=id=>!!sceneFor(id);

  // ══ the player ══
  function frame(now){
    if(!run)return;raf=requestAnimationFrame(frame);
    const t=(now-run.t0)/1000*run.speed,S=run.scene,st=run.st;
    st.dt=Math.min(.05,(now-(st.last||now))/1000)*run.speed;st.last=now;st.t=t;
    g.setTransform(run.dpr,0,0,run.dpr,0,0);
    const sh=!REDUCED&&S.shake?S.shake(t):0;if(sh>0)g.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
    try{S.draw(st,t);}catch(e){console.warn('cutscene',e);finish();return;}
    const D=S.dur||DUR,fo=D-.45;   // short scenes set their own length and title timing
    root.classList.toggle('us-show',t>(S.tIn||2.05)&&t<(S.tOut||3.6));
    root.style.opacity=t>fo?String(Math.max(0,1-(t-fo)/.4)):'';
    if(t>D)finish();
  }
  function finish(){
    if(!run)return;const r=run;run=null;cancelAnimationFrame(raf);
    root.classList.remove('on','us-show');root.style.opacity='';document.body.classList.remove('unlock-scene');
    r.onDone&&r.onDone();
  }
  // opts.speed slows the picture down (the test scripts use it to catch a moment); sound always plays at normal speed
  window.playUnlockCutscene=function(id,onDone,opts){
    const S=sceneFor(id);if(!S){onDone&&onDone();return false;}
    if(!root)build();if(run)finish();
    opts=opts||{};
    const dpr=Math.min(2,window.devicePixelRatio||1),W=window.innerWidth,H=window.innerHeight,U=Math.min(W,H);
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
    const st={W,H,U,cx:W/2,cy:H*.44,R:Math.hypot(W,H)*.6,dt:0,t:0,bg:[],ws:[],g,id};
    for(let i=0;i<(W*H>400000?170:120);i++)st.bg.push({x:Math.random(),y:Math.random(),r:Math.random()<.15?2:1,a:rnd(.25,.85),tw:rnd(1,4),ph:rnd(0,TAU),d:rnd(.2,1)});
    for(let i=0;i<(W*H>400000?240:170);i++)st.ws.push({a:Math.random()*TAU,r:.05+Math.random()*.95,z:Math.random(),i});
    S.init&&S.init(st);
    root.style.setProperty('--usc',S.col);
    root.querySelector('.us-kicker').textContent=S.kicker;root.querySelector('.us-title').textContent=S.title;root.querySelector('.us-sub').textContent=S.sub||'';
    run={t0:performance.now(),scene:S,st,dpr,onDone,speed:opts.speed||1,el(){return(performance.now()-this.t0)/1000*this.speed;}};
    root.classList.add('on');document.body.classList.add('unlock-scene');
    if(!opts.silent){const M=mixer(S.vol);if(M)try{S.sound.call(S,M);}catch(e){console.warn('cutscene sound',e);}}
    raf=requestAnimationFrame(frame);
    return true;
  };
  window.unlockCutsceneRunning=()=>!!run;

  // ══ after the scene: glide the map so the new node sits in the middle, and give it a little pulse ══
  window.stFocusNode=function(id){
    const n=typeof SKILL_MAP!=='undefined'&&SKILL_MAP[id],cvs=document.getElementById('skillTreeCanvas');
    if(!n||!cvs||typeof applyStTransform!=='function')return;
    const W=cvs.clientWidth,H=cvs.clientHeight,s=stScale,d3=typeof stIs3D==='function'&&stIs3D();
    // where the node lands on screen for a given pan: the 3D view is a plate tipped back in perspective (see applyStTransform)
    let px=n.x,py=n.y;if(d3){const th=ST_TILT*Math.PI/180,w=1-n.y*Math.sin(th)/ST_PERSP;px=n.x/w;py=n.y*Math.cos(th)/w;}
    const tx=W/2-s*px,ty=H*(d3?.55:.5)-s*py,fx=stPanX,fy=stPanY,t0=performance.now();
    (function step(now){const k=cl((now-t0)/900,0,1),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;stPanX=lerp(fx,tx,e);stPanY=lerp(fy,ty,e);applyStTransform();if(k<1)requestAnimationFrame(step);
      else{const el=document.querySelector('#skillTreeInner .st-node[data-node="'+id+'"]');if(el){el.classList.remove('st-fresh');void el.offsetWidth;el.classList.add('st-fresh');}}})(t0);
  };
})();
