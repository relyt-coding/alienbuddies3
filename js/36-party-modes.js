
// ══════════════════════════════════════════════
//  ALIEN PARTY STYLES
//  The party button starts a party in the last style; the chip next to it cycles styles.
//  GLOW is the original (aliens light up to the beat while bouncing around). Every other style
//  takes over the aliens' positions and choreographs them to the music:
//   EQ BARS       line up on the sequencer and rise and fall with the real audio spectrum
//   DISCO ORBIT   ring(s) spinning around the score, swelling with the music
//   CONGA LINE    a figure-8 conga line, hopping on the beat
//   BOUNCE HOUSE  each instrument gets its own aliens, who jump when it plays
//   GALAXY        a spinning spiral galaxy that breathes with the bar
//   PLANET HOP    run along the top of the sequencer like in Planet Hop: a hop every beat, a double jump on beat 4
// ══════════════════════════════════════════════
const PARTY_STYLES=[
  {id:'glow',  icon:'✨',name:'GLOW'},
  {id:'eq',    icon:'📊',name:'EQ BARS'},
  {id:'orbit', icon:'🪩',name:'DISCO ORBIT'},
  {id:'conga', icon:'🐍',name:'CONGA LINE'},
  {id:'bounce',icon:'🤸',name:'BOUNCE HOUSE'},
  {id:'galaxy',icon:'🌌',name:'GALAXY'},
  {id:'hop',   icon:'🪐',name:'PLANET HOP'},
];
let partyStyle='glow';
try{const v=localStorage.getItem('ab2_party_style');if(PARTY_STYLES.some(s=>s.id===v))partyStyle=v;}catch(e){}

(function(){
  const $=id=>document.getElementById(id);
  const TAU=Math.PI*2;
  const layer=$('alienLayer');

  // ── style chip next to the party button ──
  const chip=document.createElement('button');
  chip.type='button';chip.id='partyStyleBtn';
  document.body.appendChild(chip);
  function styleObj(){return PARTY_STYLES.find(s=>s.id===partyStyle)||PARTY_STYLES[0];}
  function paintChip(){const s=styleObj();chip.textContent=s.name+' ▸';chip.title='Change how the aliens party';}
  function owned(){return typeof partyOwnedStyles==='function'?partyOwnedStyles():PARTY_STYLES.map(s=>s.id);}
  function placeChip(){
    const pb=$('partyBtn');
    if(!owned().includes(partyStyle)){partyStyle='glow';paintChip();}
    const show=partyMode&&pb&&getComputedStyle(pb).display!=='none'&&owned().length>1;
    chip.classList.toggle('show',!!show);
    if(!show)return;
    const r=pb.getBoundingClientRect();
    chip.style.right=Math.max(4,innerWidth-r.right)+'px';chip.style.left='auto';
    if(r.top>70){chip.style.top='auto';chip.style.bottom=(innerHeight-r.top+8)+'px';}
    else{chip.style.bottom='auto';chip.style.top=(r.bottom+6)+'px';}
  }
  function setStyle(id){
    leaveStyle();
    partyStyle=id;try{localStorage.setItem('ab2_party_style',id);}catch(e){}
    paintChip();
    if(partyMode)enterStyle();
  }
  chip.addEventListener('click',e=>{
    e.stopPropagation();
    const list=PARTY_STYLES.filter(s=>owned().includes(s.id));
    if(list.length<2)return;
    const i=list.findIndex(s=>s.id===partyStyle);
    const nx=list[(i+1)%list.length];
    setStyle(nx.id);
    if(typeof showToast==='function')showToast('PARTY STYLE: '+nx.name);
  });
  paintChip();
  window.setPartyStyle=function(id){setStyle(id);placeChip();};
  window.refreshPartyAccess=function(){placeChip();};
  setInterval(()=>{placeChip();},300);
  addEventListener('resize',placeChip);

  // ── audio analyser on the master output (only connected while a party style needs it) ──
  let an=null,freq=null,wave=null,anOn=false;
  function analyserOn(){
    if(anOn)return;
    try{
      const c=getCtx();if(!c||!masterGainNode)return;
      if(!an){an=c.createAnalyser();an.fftSize=512;an.smoothingTimeConstant=.6;freq=new Uint8Array(an.frequencyBinCount);wave=new Uint8Array(an.fftSize);}
      masterGainNode.connect(an);anOn=true;
    }catch(e){}
  }
  function analyserOff(){if(anOn){try{masterGainNode.disconnect(an);}catch(e){}anOn=false;}}
  let energy=0;
  function readAudio(){
    if(!anOn)return;
    an.getByteFrequencyData(freq);an.getByteTimeDomainData(wave);
    let s=0;for(let i=0;i<wave.length;i+=4){const v=(wave[i]-128)/128;s+=v*v;}
    const rms=Math.sqrt(s/(wave.length/4));
    energy=Math.max(Math.min(1,rms*3.2),energy*.9);
  }
  // spectrum level (0..1) for band k of n, log-spaced from ~90 Hz to ~14 kHz
  function band(k,n){
    if(!anOn||!freq)return 0;
    const nb=freq.length,ny=an.context.sampleRate/2;
    const lo=Math.max(1,Math.floor(90/ny*nb)),hi=Math.min(nb-1,Math.floor(14000/ny*nb));
    const a=Math.floor(lo*Math.pow(hi/lo,k/n)),b=Math.max(a+1,Math.floor(lo*Math.pow(hi/lo,(k+1)/n)));
    let m=0;for(let i=a;i<b;i++)if(freq[i]>m)m=freq[i];
    const tilt=1+.9*k/Math.max(1,n-1); // highs are quieter — lift them so every bar dances
    return Math.max(0,Math.min(1,((m/255)-.28)/.62*tilt));
  }

  // ── hits from the sound engine ──
  let lastHit=-1e9;
  const soundOrder=[];
  window.partyHit=function(id,trackIdx,vel){
    const t=performance.now();
    lastHit=t;
    const v=Math.max(.35,Math.min(1.2,vel===undefined?1:vel));
    if(partyStyle==='bounce'&&id){
      let k=soundOrder.indexOf(id);
      if(k<0){soundOrder.push(id);if(soundOrder.length>12)soundOrder.shift();k=soundOrder.indexOf(id);}
      const L=soundOrder.length;
      bouncers.forEach((b,i)=>{if(i%L===k){const p=b._pp||(b._pp={});if((p.jy||0)<30)p.vy=(620+Math.random()*180)*v;}});
    }
  };

  // ── layout landmarks (measured a few times a second, not every frame) ──
  let L={},Lat=0;
  function visRect(el){if(!el)return null;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return null;const r=el.getBoundingClientRect();return(r.width>4&&r.height>4&&r.bottom>0&&r.top<innerHeight)?r:null;}
  function landmarks(now){
    if(now-Lat<350)return L;Lat=now;
    const game=!document.body.classList.contains('store-open')&&!document.body.classList.contains('bunker-open');
    L={seq:game?visRect($('seqArea')):null,pads:game?visRect($('padGrid')):null,score:game?visRect($('scoreEl')):null};
    return L;
  }

  // ── styles: each returns per-alien targets {x,y,ox,oy,s} (x,y follow smoothly; ox/oy are instant offsets) ──
  let eqBars=[],t0=0,lastT=0;
  function clearFx(){eqBars.forEach(e=>e.remove());eqBars=[];}
  function enterStyle(){
    t0=performance.now();soundOrder.length=0;
    bouncers.forEach(b=>{b._pp={};if(typeof setBuddyHalo==='function')setBuddyHalo(b,partyGlowBase());});
    if(partyStyle!=='glow')analyserOn();
  }
  function leaveStyle(){
    // keep every alien exactly where it is, so normal bouncing (or the next style) carries on from there
    bouncers.forEach(b=>{if(b._oy||b._ox){b.x+=b._ox||0;b.y+=b._oy||0;}b._ox=0;b._oy=0;b._pp={};b._scale=1;if(typeof setBuddyHalo==='function')setBuddyHalo(b,0);});
    if(typeof bouncerUnpose==='function')bouncerUnpose();   // running buddies go back to floating free
    clearFx();analyserOff();
  }
  window.partyStyleOn=function(){enterStyle();placeChip();};
  window.partyStyleOff=function(){leaveStyle();placeChip();};

  // keep a ring/spiral of radius rx×ry fully on screen (its centre slides away from the edges as needed)
  function fitCenter(cx,cy,rx,ry,B,sz){
    const x0=B.x+rx+sz/2+6,x1=B.x+B.w-rx-sz/2-6,y0=B.y+ry+sz/2+6,y1=B.y+B.h-ry-sz-BOUNCER_NAME_PAD;
    return{cx:x0>x1?B.x+B.w/2:Math.min(x1,Math.max(x0,cx)),cy:y0>y1?B.y+B.h/2:Math.min(y1,Math.max(y0,cy))};
  }
  function bpm(){return(typeof seqBpm==='number'&&seqBpm>0)?seqBpm:100;}

  window.partyChoreo=function(now,B){
    if(partyStyle==='glow'||!bouncers.length)return false;
    const dt=Math.min(.05,Math.max(.001,(now-(lastT||now))/1000));lastT=now;
    readAudio();
    const lm=landmarks(now);
    const N=bouncers.length,sz=bouncers[0].sz||41;
    const beat=(now/1000)*bpm()/60;                 // beats since page start
    const hitEnv=Math.exp(-(now-lastHit)/170);       // 1 right after a hit, fading
    const minX=B.x+4,maxX=B.x+B.w-sz-4,minY=B.y+4,maxY=B.y+B.h-sz-BOUNCER_NAME_PAD;
    const T=[];
    const st=partyStyle;
    if(st==='eq'){
      const ref=lm.seq||lm.pads;
      const left=(ref?ref.left:B.x)+8,right=(ref?ref.right:B.x+B.w)-8;
      // sit on top of the sequencer when there is room above it, otherwise on top of the pads
      let base=B.y+B.h-60;
      if(lm.seq&&lm.seq.top-B.y>170)base=lm.seq.top-4;
      else if(lm.pads)base=lm.pads.top-4;
      const maxLift=Math.max(60,Math.min(260,base-B.y-sz-50));
      const w=(right-left)/N;
      const bw=Math.max(4,Math.min(22,w*.55));
      if(eqBars.length!==N){clearFx();for(let i=0;i<N;i++){const d=document.createElement('div');d.className='party-eqbar';layer.insertBefore(d,layer.firstChild);eqBars.push(d);}}
      bouncers.forEach((b,i)=>{
        const p=b._pp||(b._pp={});
        const lv=band(i,N);
        p.lift=Math.max(lv,(p.lift||0)-dt*1.5);       // peak-hold fall like a real meter
        const cx=left+(i+.5)*w;
        const lift=p.lift*maxLift;
        T.push({x:cx-sz/2,y:base-sz,ox:0,oy:-lift-3*Math.sin(now/420+i*.7)*(p.lift<.05?1:0),s:1+p.lift*.25});
        const d=eqBars[i];
        d.style.cssText=`left:${(cx-bw/2).toFixed(1)}px;top:${(base-maxLift).toFixed(1)}px;width:${bw.toFixed(1)}px;height:${maxLift.toFixed(0)}px;transform:scaleY(${Math.max(.01,p.lift).toFixed(3)});--c:${b._col||'#0f8'};`;
      });
    }else if(st==='orbit'){
      let cx=B.x+B.w/2,cy=B.y+B.h*.45;
      if(lm.score&&!document.body.classList.contains('phone-land')){cx=lm.score.left+lm.score.width/2;cy=lm.score.top+lm.score.height/2;}
      const R0=Math.min(260,Math.min(B.w,B.h)*.3);
      ({cx,cy}=fitCenter(cx,cy,R0*1.25,R0*1.25*.85,B,sz));
      const rot=TAU*beat/16;
      const two=N>14,nOut=two?Math.ceil(N*.6):N;
      bouncers.forEach((b,i)=>{
        const outer=i<nOut,k=outer?i:i-nOut,n=outer?nOut:N-nOut;
        const R=R0*(outer?1:.55)*(1+.14*energy+.1*hitEnv);
        const a=TAU*k/n+(outer?rot:-rot*1.5);
        T.push({x:cx+Math.cos(a)*R-sz/2,y:cy+Math.sin(a)*R*.85-sz/2,ox:0,oy:0,s:1+.25*hitEnv});
      });
    }else if(st==='conga'){
      const cx=B.x+B.w/2,cy=B.y+B.h*.48,ax=(B.w-sz-40)/2,ay=Math.min(B.h*.3,(B.h-sz-80)/2);
      const u0=TAU*beat/32;
      const gap=Math.min(.24,TAU*.8/N);
      bouncers.forEach((b,i)=>{
        const u=u0-i*gap;
        const hop=Math.abs(Math.sin(Math.PI*(beat-i*.25)));
        // facing = the way this buddy is heading along the figure-8 (with a little hysteresis so nobody flickers)
        const p=b._pp||(b._pp={}),dx=Math.cos(u);if(p.face==null)p.face=dx>=0?1:-1;if(dx>.12)p.face=1;else if(dx<-.12)p.face=-1;
        if(typeof bouncerPose==='function')bouncerPose(b,Math.floor(((beat*2+i*.5)%1+1)%1*4),p.face<0);
        T.push({x:cx+ax*Math.sin(u)-sz/2,y:cy+ay*Math.sin(2*u)-sz/2,ox:0,oy:-16*hop*(.6+.6*energy),s:1});
      });
    }else if(st==='bounce'){
      let floor=B.y+B.h-sz-BOUNCER_NAME_PAD-12;
      if(lm.pads&&lm.pads.top-B.y>200)floor=lm.pads.top-sz-6;
      bouncers.forEach((b,i)=>{
        const p=b._pp||(b._pp={});
        p.vy=(p.vy||0)-2600*dt;p.jy=(p.jy||0)+p.vy*dt;
        if(p.jy<=0){p.jy=0;if(p.vy<-160){p.vy=-p.vy*.28;p.squash=1;}else p.vy=0;}
        p.squash=(p.squash||0)*Math.exp(-dt*12);
        const xn=N>1?i/(N-1):.5;
        T.push({x:B.x+20+xn*(B.w-40-sz),y:floor,ox:0,oy:-p.jy,s:1+.18*Math.min(1,p.jy/120),sy:1-.22*p.squash});
      });
    }else if(st==='galaxy'){
      let cx=B.x+B.w/2,cy=B.y+B.h*.45;
      if(lm.score&&!document.body.classList.contains('phone-land')){cx=lm.score.left+lm.score.width/2;cy=Math.min(B.y+B.h*.5,lm.score.top+lm.score.height/2+40);}
      const R=Math.min(300,Math.min(B.w,B.h)*.38)*(1+.1*Math.sin(TAU*beat/4)+.08*hitEnv);
      ({cx,cy}=fitCenter(cx,cy,R*1.18,R*1.18*.8,B,sz));
      const rot=TAU*beat/24;
      bouncers.forEach((b,i)=>{
        const r=R*Math.sqrt((i+.6)/N),a=i*2.39996+rot*(1.4-r/R*.8); // inner stars swirl faster
        T.push({x:cx+Math.cos(a)*r-sz/2,y:cy+Math.sin(a)*r*.8-sz/2,ox:0,oy:0,s:.85+.3*(1-r/R)+.15*hitEnv});
      });
    }else if(st==='hop'){
      // run left→right along the top of the sequencer (or the pads), wrapping around; hop every beat, double jump on beat 4
      const ref=lm.seq||lm.pads;
      const left=(ref?ref.left:B.x)+4,right=(ref?ref.right:B.x+B.w)-sz-4,span=Math.max(80,right-left);
      let top=ref?ref.top:B.y+B.h-40;top=Math.max(B.y+sz+90,top);
      const H=Math.max(28,Math.min(70,(top-B.y-sz)*.35));
      const run=beat*30;                                   // px travelled per beat
      bouncers.forEach((b,i)=>{
        const p=b._pp||(b._pp={});
        const bb=beat-i*.06,f=((bb%1)+1)%1,bar=Math.floor(bb)%4;
        let y=0;
        if(bar===3){                                       // beat 4: jump, then a second jump from the top of the first
          if(f<.45)y=H*Math.sin(Math.PI*f/.9);
          else{const s2=(f-.45)/.55;y=(1-s2)*H+4*1.25*H*s2*(1-s2);}
        }else if(f<.62)y=H*Math.sin(Math.PI*f/.62);
        const air=y>2;
        if(typeof bouncerPose==='function')bouncerPose(b,air?4:Math.floor(((beat*2+i*.37)%1+1)%1*4),false);
        const x=left+((run+i*span/Math.max(1,N))%span+span)%span;
        if(p.lx!=null&&x<p.lx-span/2)p.wrap=true;p.lx=x;  // wrapped back to the left edge: jump there instead of sliding
        T.push({x,y:top-sz,ox:0,oy:-y,s:1,snap:p.wrap});p.wrap=false;
      });
    }else return false;

    // move: anchors glide (so switching styles is smooth), offsets apply instantly (so jumps stay snappy)
    const k=1-Math.exp(-dt/.12);
    bouncers.forEach((b,i)=>{
      const t=T[i];if(!t)return;
      const tx=Math.min(maxX,Math.max(minX,t.x)),ty=Math.min(maxY+BOUNCER_NAME_PAD,Math.max(minY,t.y));
      if(t.snap){b.x=tx;b.y=ty;}else{b.x+=(tx-b.x)*k;b.y+=(ty-b.y)*k;}
      b._ox=t.ox;b._oy=Math.max(B.y-b.y,t.oy);
      b._scale=t.s;
      const sy=t.sy?` scaleY(${t.sy.toFixed(3)})`:'';
      b.el.style.transform=`translate3d(${(b.x+b._ox).toFixed(1)}px,${(b.y+b._oy).toFixed(1)}px,0) scale(${t.s.toFixed(3)})${sy}`;
    });
    return true;
  };

  // the aliens are hidden while the shop/bunker covers the game on a phone: drop any bars too
  setInterval(()=>{if(!partyMode&&eqBars.length)clearFx();if(partyStyle!=='eq'&&eqBars.length)clearFx();},500);
})();
