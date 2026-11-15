// ══════════════════════════════════════════════
//  NEW-FILE INTRO + SEQUENCER / ALIEN PARTY UNLOCK FX
//
//  v0.2.156: the intro comes in two parts.
//   • New file ('pads', ~3.5 s): only the DRUM PADS fly up and build themselves, then the camera zooms in.
//   • When BUNKER and SHOP unlock (after the first buddy hatches and is named; js/66) ('nav', ~6 s): the camera pulls
//     back from the pads, the BUNKER flies in from the left and the SHOP from the right, each builds, and we zoom back.
//   • REPLAY in settings plays the whole thing ('all', ~8 s) once the bunker and shop are open.
//  The full version, as before: the real pages come together.
//   The camera starts zoomed out in space. The BUNKER flies in from the left, the SHOP from the right and the
//   DRUM PADS up from below, and they line up side by side (on desktop: the three columns, bunker | pads | shop).
//   Then each page builds itself in turn (its parts pop, drop and slide in), the gaps close, and the camera zooms
//   into the drum pads. A light sweeps over, the hi-hat pad pulses, and the game hands over.
//   (On desktop the bunker and shop then tuck away, as on every new file.)
//   Every move is just a translate + scale on the real pages, so what you watch IS the game, at any screen size.
//
//  First sequencer track: if you bought it in the shop, the screen slides to the pads, the sequencer frame lights up,
//   a light scans across as its steps pop in with a ticking boot-up and a bright chord, then the real sequencer starts.
//  ALIEN PARTY: the screen dims, a disco ball drops, coloured beams and light spots sweep the real screen while your
//   buddies dance to a little groove, then the ball lifts away and the ALIEN PARTY button lands, pulsing.
// ══════════════════════════════════════════════
(function(){
  const K=window.US_KIT;
  const cl=(x,a,b)=>Math.max(a,Math.min(b,x)),ss=(a,b,x)=>{const k=cl((x-a)/(b-a),0,1);return k*k*(3-2*k);},lerp=(a,b,k)=>a+(b-a)*k;
  const eOut=k=>1-Math.pow(1-cl(k,0,1),3),eIO=k=>{k=cl(k,0,1);return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;},eBack=k=>{k=cl(k,0,1);const c=1.6;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
  const vis=e=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
  const isDesk=()=>document.body.classList.contains('desktop-mode');
  const BC=document.body.classList;
  function snd(fn,vol){if(!K||!K.mixer)return;const S=K.mixer(vol||.8);if(S)try{fn(S,S.t);}catch(e){console.warn('intro sound',e);}}

  // ══════════════════════ NEW-FILE INTRO ══════════════════════
  const IDS={b:'bunkerView',h:'gameView',s:'storeView'},OFF={b:-1,h:0,s:1},NAMES={b:'BUNKER',h:'DRUM PADS',s:'SHOP'};
  // each intro: which pages take part, when they fly in (FLY) and build (BUILD), the camera path, the final zoom in,
  // when the page names show, and its length. `zout` = it starts zoomed in on the pads and pulls back first.
  const IMODES={
    all:{pages:['b','h','s'],FLY:{b:[.25,1.25],s:[.45,1.45],h:[.65,1.65]},BUILD:{b:1.7,s:3.0,h:4.3},ZOOM:[5.6,6.8],DUR:8,LBL:[1.45,1.9,5.3,5.6],
      CAM:[[0,'c',0],[1.55,'c',0],[2.05,'b',1],[2.85,'b',1],[3.45,'s',1],[4.15,'s',1],[4.6,'h',1],[5.6,'h',1],[6.8,'c',2]]},
    pads:{pages:['h'],FLY:{h:[.15,.95]},BUILD:{h:1.0},ZOOM:[2.15,3.0],DUR:3.6,LBL:[.7,1.0,1.95,2.2],
      CAM:[[0,'c',0],[2.15,'c',0],[3.0,'c',2]]},
    nav:{pages:['b','h','s'],FLY:{b:[.45,1.35],s:[.65,1.55]},BUILD:{b:1.65,s:2.85},ZOOM:[4.55,5.4],DUR:6,LBL:[1.3,1.6,4.25,4.55],zout:[0,1.05],
      CAM:[[0,'c',2],[1.05,'c',0],[1.45,'c',0],[1.85,'b',1],[2.65,'b',1],[3.2,'s',1],[3.9,'s',1],[4.3,'h',1],[4.55,'h',1],[5.4,'c',2]]},
  };
  let I=null,M=IMODES.all,FLY=M.FLY,BUILD=M.BUILD,ZOOM=M.ZOOM,DUR=M.DUR,CAM=M.CAM;
  function useMode(k){M=IMODES[k]||IMODES.all;FLY=M.FLY;BUILD=M.BUILD;ZOOM=M.ZOOM;DUR=M.DUR;CAM=M.CAM;}

  function stage(){
    let st=document.getElementById('introStage');if(st)return st;
    st=document.createElement('div');st.id='introStage';
    st.innerHTML='<canvas></canvas><div class="in-lbl" data-k="b"></div><div class="in-lbl" data-k="h"></div><div class="in-lbl" data-k="s"></div>';
    const gs=document.getElementById('gameScreen');gs.parentNode.insertBefore(st,gs);
    const c=document.createElement('div');c.id='introCatch';c.innerHTML='<div class="in-skip">TAP TO SKIP</div>';document.body.appendChild(c);
    const skip=e=>{if(e&&e.cancelable)e.preventDefault();if(I&&I.el()>.4)finishIntro(true);};
    c.addEventListener('pointerdown',skip);c.addEventListener('touchstart',skip,{passive:false});
    const sw=document.createElement('div');sw.id='introSweep';document.body.appendChild(sw);
    // on a computer, any key skips it too (and doesn't play a pad underneath)
    window.addEventListener('keydown',e=>{if(!I||I.woke)return;e.preventDefault();e.stopImmediatePropagation();if(I.el()>.4&&!e.repeat)finishIntro(true);},true);
    return st;
  }
  // the parts of each page that build themselves, with when (absolute seconds into the intro) and how
  function assignParts(){
    const list=[];const add=(el,type,d)=>{if(el&&vis(el)){el.classList.add('ib','ib-'+type);el.style.setProperty('--ibd',d.toFixed(3)+'s');list.push(el);}};
    const B=document.getElementById(IDS.b),S=document.getElementById(IDS.s),H=document.getElementById(IDS.h);
    let t0;
    if(BUILD.b!=null){
    // bunker: header, stats, then the alien grid ripples in from the top-left corner
    t0=BUILD.b;add(B.querySelector('.page-header'),'drop',t0);
    B.querySelectorAll('.bunker-stat').forEach((e,i)=>add(e,'pop',t0+.12+i*.09));add(B.querySelector('.bunker-number-label'),'pop',t0+.3);
    B.querySelectorAll('.bunker-grid').forEach((grid,gi)=>{const cells=[...grid.children].filter(vis).slice(0,140);if(!cells.length)return;
      const w=cells[0].offsetWidth||1,h=cells[0].offsetHeight||1,x0=cells[0].offsetLeft,y0=cells[0].offsetTop;
      cells.forEach(e=>{const c=Math.round((e.offsetLeft-x0)/w),r=Math.round((e.offsetTop-y0)/h);add(e,'pop',t0+.35+gi*.2+(r+c)*.034);});});
    add(B.querySelector('#mgList'),'rise',t0+.95);add(B.querySelector('.bunker-progress-wrap'),'rise',t0+1.05);add(B.querySelector('.bunker-full-banner'),'pop',t0+.5);
    }
    if(BUILD.s!=null){
    // shop: header, then its shelves slide in one after another and their cards pop
    t0=BUILD.s;add(S.querySelector('.page-header'),'drop',t0);
    const shelves=[...S.querySelectorAll('.store-scroll > *')].filter(vis).slice(0,8);shelves.forEach((e,i)=>add(e,'slide',t0+.15+i*.13));
    [...S.querySelectorAll('.drum-card,.upgrade-card')].filter(vis).slice(0,16).forEach((e,i)=>add(e,'pop',t0+.3+i*.07));
    }
    if(BUILD.h!=null){
    // drum pads: header drops, the score pops, then the pads pop in one by one, and anything else rises
    t0=BUILD.h;add(H.querySelector('.header'),'drop',t0);add(H.querySelector('#scoreRow'),'pop',t0+.2);
    [...H.querySelectorAll('.pad-grid > .pad')].filter(vis).slice(0,16).forEach((e,i)=>add(e,'pop',t0+.45+i*.09));
    const app=H.querySelector('.app');if(app)[...app.children].filter(e=>vis(e)&&!e.classList.contains('ib')&&!e.querySelector('.ib')).slice(0,6).forEach((e,i)=>add(e,'rise',t0+.6+i*.1));
    }
    return list;
  }
  // world: the three pages in a row (phone: each a whole screen wide, as swiping lays them out; desktop: the
  // three grid columns). gw = the gap between them in page units. The camera looks at x = cam with zoom z.
  function geometry(){
    const W=window.innerWidth,H=window.innerHeight,desk=isDesk(),G={W,H,desk,v:{},xc:W/2};
    if(desk){
      ['b','h','s'].forEach(k=>{const r=document.getElementById(IDS[k]).getBoundingClientRect();G.v[k]={bx:r.left+r.width/2,by:r.top+r.height/2,X:r.left+r.width/2,h:r.height,w:r.width};});
      G.gw=40;G.z0=Math.min(.8,(W*.9)/(W+2*G.gw));G.zf=G.z0*1.07;G.pan=.2;G.cy0=H*.465;G.rad=24;
    }else{
      ['b','h','s'].forEach(k=>{G.v[k]={bx:W/2,by:H/2,X:W/2+OFF[k]*W,h:H,w:W};});
      G.gw=W*.2;G.z0=(W*.9)/(3*W+2*G.gw);G.zf=Math.min(.52,G.z0*2.1);G.pan=1;G.cy0=H*.455;G.rad=48;
    }
    if(M.pages.length===1){G.z0=desk?.62:.6;G.cy0=H*.47;}
    return G;
  }
  // camera path (per mode, see IMODES): overview → over to the bunker as it builds → across to the shop → back to the pads → zoom in
  function camAt(G,t){
    const X=n=>n==='c'?G.xc:lerp(G.xc,G.v[n].X+OFF[n]*G.gw,G.pan),Z=n=>n===0?G.z0:n===1?G.zf:1;
    let i=0;while(i<CAM.length-2&&t>=CAM[i+1][0])i++;
    const A=CAM[i],B=CAM[i+1],k=eIO(cl((t-A[0])/(B[0]-A[0]),0,1));
    let z=Z(A[2])*Math.pow(Z(B[2])/Z(A[2]),k);
    if(!G.desk&&A[2]===B[2]&&A[1]!==B[1])z*=1-.2*Math.sin(Math.PI*k);   // a little hop back while panning across
    return{x:lerp(X(A[1]),X(B[1]),k),z};
  }
  function setView(k,tf,op,rad,ring){const e=document.getElementById(IDS[k]);if(!e)return;e.style.setProperty('--itf',tf);e.style.setProperty('--itr',rad+'px');e.style.setProperty('--ita',ring);e.style.opacity=op;}

  window.playNewFileIntro=function(opts){
    opts=opts||{};
    if(!BC.contains('game-active')||BC.contains('mobile-view-mode')||!document.getElementById('gameScreen')){opts.onDone&&opts.onDone();return false;}
    if(I)finishIntro(false);
    // before the first buddy (a new file) only the drum pads exist yet
    const noBuddy=BC.contains('nav-locked')||(typeof totalAliens!=='undefined'&&totalAliens<1);
    useMode(opts.mode||(noBuddy?'pads':'all'));
    // start from the pads page with nothing open
    try{if(typeof closeSettings==='function')closeSettings();}catch(e){}
    try{if(typeof closeSkillTree==='function'&&document.querySelector('#skillTreeModal.open'))closeSkillTree();}catch(e){}
    try{closeStore();closeBunker();if(typeof closeCockpit==='function')closeCockpit();if(typeof closeBestBuddy==='function')closeBestBuddy();}catch(e){}
    try{if(typeof renderStore==='function')renderStore();if(typeof renderBunkerView==='function')renderBunkerView();}catch(e){}
    const desk=isDesk(),st=stage(),cv=st.querySelector('canvas'),g=cv.getContext('2d');
    const prev={bc:null,sc:null};
    if(desk){const bv=document.getElementById('bunkerView'),sv=document.getElementById('storeView');prev.bc=bv.classList.contains('sidebar-collapsed');prev.sc=sv.classList.contains('sidebar-collapsed');
      if(M.pages.length>1){[bv,sv].forEach(v=>{v.style.transition='none';v.classList.remove('sidebar-collapsed');});void bv.offsetWidth;}}
    BC.add('intro-run');
    const G=geometry();
    const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(G.W*dpr);cv.height=Math.round(G.H*dpr);cv.style.width=G.W+'px';cv.style.height=G.H+'px';
    const stars=[];for(let i=0;i<130;i++)stars.push({x:Math.random(),y:Math.random(),z:Math.random(),r:Math.random()<.15?2:1,ph:Math.random()*6});
    const parts=assignParts();
    st.classList.add('on');st.style.opacity='';
    st.querySelectorAll('.in-lbl').forEach(l=>{l.textContent=NAMES[l.dataset.k];l.style.opacity='0';l.style.display=M.pages.includes(l.dataset.k)?'':'none';});
    const lbl={};st.querySelectorAll('.in-lbl').forEach(l=>lbl[l.dataset.k]=l);
    I={lbl,t0:performance.now(),sp:opts.speed||1,G,g,cv,dpr,stars,parts,prev,desk,opts,M,woke:false,assembled:false,el(){return(performance.now()-this.t0)/1000*this.sp;}};
    // pages that sit this one out are parked out of sight (the intro styles would otherwise drop them on top)
    ['b','h','s'].forEach(k=>{if(!M.pages.includes(k))setView(k,'translate(-400vw,0)',0,0,0);});
    document.getElementById('introCatch').classList.add('on');
    if(!opts.silent)introSound(opts.mode||(M===IMODES.pads?'pads':M===IMODES.nav?'nav':'all'));
    I.raf=requestAnimationFrame(introFrame);
    return true;
  };
  function introFrame(now){
    if(!I)return;I.raf=requestAnimationFrame(introFrame);
    const t=I.el(),G=I.G,g=I.g,W=G.W,H=G.H;
    // the starfield drifts gently towards us, faster as we zoom in
    const zp=Math.max(eIO(ss(ZOOM[0],ZOOM[1],t)),M.zout?1-eIO(ss(M.zout[0],M.zout[1],t)):0);
    g.setTransform(I.dpr,0,0,I.dpr,0,0);g.clearRect(0,0,W,H);
    I.stars.forEach(s=>{s.z-=.0016*(1+zp*14);if(s.z<=.05){s.z=1;s.x=Math.random();s.y=Math.random();}const k=.35/s.z,x=W/2+(s.x-.5)*W*k,y=H/2+(s.y-.5)*H*k;if(x<0||x>W||y<0||y>H)return;
      g.fillStyle=`rgba(210,235,255,${Math.min(1,(1-s.z)*1.3)*(.6+.4*Math.sin(t*2+s.ph))})`;g.fillRect(x,y,s.r,s.r);});
    // the camera: zoomed out on the row of pages, visiting each as it builds, then into the drum pads
    if(!I.assembled){
      const cam=camAt(G,t),z=cam.z,gw=G.gw*(1-zp),cy=lerp(G.cy0,H/2,zp),rad=G.rad*(1-zp);
      M.pages.forEach(k=>{const v=G.v[k],[f0,f1]=FLY[k]||[-2,-1],fp=eOut(ss(f0,f1,t));
        // fly-in: bunker from the left, shop from the right, pads up from below, each settling from a little tilt
        const fx=k==='b'?-W*.9:k==='s'?W*.9:0,fy=k==='h'?H*.75:0,tilt=(k==='b'?-6:k==='s'?6:0)*(1-fp),fs=k==='h'?lerp(.7,1,fp):1;
        // focus: the page being built glows and stands forward, the others dim back a little
        const b0=BUILD[k],bf=Math.min(...Object.values(BUILD)),foc=(t<ZOOM[0]&&b0!=null)?ss(b0-.3,b0,t)*(1-ss(b0+1.3,b0+1.55,t)):0,dim=M.pages.length>1?(1-foc)*.4*ss(bf-.3,bf,t)*(1-ss(ZOOM[0]-.3,ZOOM[0]+.1,t)):0;
        const wx=v.X+OFF[k]*gw,sx=W/2+(wx-cam.x)*z+fx*(1-fp),sy=cy+(v.by-H/2)*z+fy*(1-fp),sc=z*fs*(1+.04*foc);
        setView(k,`translate(${(sx-v.bx).toFixed(1)}px,${(sy-v.by).toFixed(1)}px) scale(${sc.toFixed(4)}) rotate(${tilt.toFixed(2)}deg)`,(Math.min(fp*1.4,1)*(1-dim)).toFixed(3),rad,((.2+.6*foc)*(1-zp)).toFixed(3));
        const lb=I.lbl[k];if(lb){lb.style.left=sx.toFixed(1)+'px';lb.style.top=(sy+v.h*sc/2+14).toFixed(1)+'px';lb.style.opacity=(ss(M.LBL[0],M.LBL[1],t)*(1-ss(M.LBL[2],M.LBL[3],t))*(M.pages.length>1?.5+.5*foc:1)*Math.min(fp*1.4,1)).toFixed(3);lb.classList.toggle('foc',foc>.5);}});
    }
    if(t>=ZOOM[1]&&!I.assembled){I.assembled=true;assemble();}
    if(t>=ZOOM[1]+.05&&!I.woke){I.woke=true;wake();}
    if(t>DUR)finishIntro(false);
  }
  // the pages are in place: hand the real layout back (desktop: the sidebars tuck away, as on every new file)
  function assemble(){
    BC.remove('intro-run');
    if(typeof floatBuddiesIn==='function')try{floatBuddiesIn();}catch(e){}   // buddies drift in from off screen
    ['b','h','s'].forEach(k=>{const e=document.getElementById(IDS[k]);if(!e)return;e.style.removeProperty('--itf');e.style.removeProperty('--itr');e.style.removeProperty('--ita');e.style.opacity='';e.style.transition='none';});
    void document.body.offsetWidth;['b','h','s'].forEach(k=>{const e=document.getElementById(IDS[k]);if(e)e.style.transition='';});
    cleanParts();
    const st=document.getElementById('introStage');if(st)st.style.opacity='0';
    if(I&&I.desk){const keep=I;setTimeout(()=>{if(keep.tucked)return;keep.tucked=true;const cur=I;I=keep;tuckSidebars();I=cur;},250);}
  }
  function tuckSidebars(){
    const bv=document.getElementById('bunkerView'),sv=document.getElementById('storeView');if(!bv||!sv||!I)return;
    // a new file always starts with both tucked away; a replay puts them back how they were
    const p=I.prev,all=!!I.opts.tuck;
    if(all||p.sc){sv.classList.add('sidebar-collapsed');if(typeof updateCollapseBtn==='function')updateCollapseBtn('shop',true);}
    if(all||p.bc){bv.classList.add('sidebar-collapsed');if(typeof updateCollapseBtn==='function')updateCollapseBtn('bunker',true);}
    if(typeof updatePartyBtnPosition==='function')updatePartyBtnPosition();
    setTimeout(()=>{try{if(typeof repositionCollapseButtons==='function')repositionCollapseButtons();}catch(e){}},360);
  }
  function wake(){
    // the game is in place: hand the controls back straight away (the last flourishes play over a live game)
    const c=document.getElementById('introCatch');if(c)c.classList.remove('on');
    const sw=document.getElementById('introSweep');if(sw){sw.classList.remove('go');void sw.offsetWidth;sw.classList.add('go');}
    const pad=[...document.querySelectorAll('#gameView .pad-grid > .pad')].find(p=>vis(p)&&!p.classList.contains('ghost-pad'));
    if(pad){pad.classList.remove('intro-hi');void pad.offsetWidth;pad.classList.add('intro-hi');setTimeout(()=>pad.classList.remove('intro-hi'),2400);}
    BC.add('intro-ui-in');setTimeout(()=>BC.remove('intro-ui-in'),1400);
  }
  function cleanParts(){if(!I)return;I.parts.forEach(e=>{e.classList.remove('ib','ib-pop','ib-drop','ib-rise','ib-slide');e.style.removeProperty('--ibd');});I.parts=[];}
  function finishIntro(skipped){
    if(!I)return;
    if(!I.assembled){I.assembled=true;assemble();}
    if(skipped&&!I.woke){I.woke=true;wake();}
    cancelAnimationFrame(I.raf);
    const st=document.getElementById('introStage');if(st){st.classList.remove('on');st.style.opacity='';}
    const c=document.getElementById('introCatch');if(c)c.classList.remove('on');
    const done=I.opts.onDone,keep=I;
    if(keep.desk&&!keep.tucked){keep.tucked=true;tuckSidebars();}
    I=null;
    if(typeof autoSave==='function')try{autoSave();}catch(e){}
    done&&done();
  }
  window.newFileIntroRunning=()=>!!I;
  // settings ▸ INTRO ▸ REPLAY
  const rb=document.getElementById('settingsIntroBtn');
  if(rb)rb.addEventListener('click',()=>{try{if(typeof closeSettings==='function')closeSettings();}catch(e){}
    setTimeout(()=>{if(!window.playNewFileIntro({})&&typeof showToast==='function')showToast('The intro plays with a game open.');},200);});

  function introSound(mode){
    if(!K)return;
    if(mode==='pads'){snd((S,t)=>{const{tone,noise,inst}=K;
      tone(S,t,110,{a:.03,k:.8,hold:1.6,d:1.2,rv:.6});tone(S,t,164.8,{a:.02,k:1,hold:1.4,d:1.2,rv:.6});
      noise(S,t+FLY.h[0],{f0:500,f1:2600,q:1.4,a:.05,k:.7,d:.2});tone(S,t+FLY.h[1],210,{f1:140,gl:.05,a:.12,d:.12});
      tone(S,t+BUILD.h+.2,880,{a:.04,d:.4,rv:.5});['kick','hihat','snare','hihat'].forEach((id,i)=>inst(S,id,t+BUILD.h+.45+i*.18,0,.45));
      noise(S,t+ZOOM[0],{f0:400,f1:5000,q:1,a:.07,k:.8,d:.12});tone(S,t+ZOOM[0],160,{f1:640,gl:.85,a:.035,k:.8,d:.1});
      inst(S,'kick',t+ZOOM[1],0,.6);[130.81,261.63,329.63,392,493.88,587.33].forEach((f,i)=>tone(S,t+ZOOM[1]+i*.025,f,{type:i<2?'triangle':'sine',a:i?.045:.06,k:.06,d:2.4,rv:.6}));
      inst(S,'hihat',t+ZOOM[1]+.35,0,.7);},1.35);return;}
    if(mode==='nav'){snd((S,t)=>{const{tone,noise}=K;
      noise(S,t,{f0:3000,f1:500,q:1,a:.05,k:.6,d:.25});tone(S,t,520,{f1:260,gl:.9,a:.025,k:.3,d:.4,rv:.5});   // pulling back
      [['b',FLY.b[1]],['s',FLY.s[1]]].forEach(([k,land],i)=>{noise(S,t+FLY[k][0],{f0:500,f1:2600,q:1.4,a:.05,k:.6,d:.2});tone(S,t+land,240-i*30,{f1:150,gl:.05,a:.12,d:.12});noise(S,t+land,{type:'highpass',f0:3500,a:.05,d:.03});});
      [0,2,4,7,9,12,14,16,19,21,24].forEach((s2,i)=>tone(S,t+BUILD.b+.35+i*.07,523.25*Math.pow(2,s2/12),{a:.022,d:.35,rv:.5}));
      for(let i=0;i<6;i++)noise(S,t+BUILD.s+.15+i*.13,{f0:1800,f1:900,q:2,a:.035,d:.1});
      tone(S,t+BUILD.s+1.0,1318.5,{a:.04,d:.5,rv:.5});tone(S,t+BUILD.s+1.08,1975.5,{a:.03,d:.6,rv:.5});
      noise(S,t+ZOOM[0],{f0:400,f1:4000,q:1,a:.06,k:.8,d:.12});
      [[0,659.25],[.4,987.77]].forEach(([d,f])=>{tone(S,t+ZOOM[1]+d,f,{type:'triangle',a:.05,d:.5,rv:.5});tone(S,t+ZOOM[1]+d+.06,f*1.5,{a:.025,d:.5,rv:.5});});},1.35);return;}
    snd((S,t)=>{const{tone,noise,inst}=K;
      // space: a soft swell
      tone(S,t,110,{a:.035,k:1.2,hold:4.5,d:1.8,rv:.6});tone(S,t,164.8,{a:.022,k:1.6,hold:4,d:1.8,rv:.6});tone(S,t+2.5,220,{a:.015,k:1.5,hold:2,d:1.5,rv:.6});
      // the pages fly in and click into line
      [['b',1.25],['s',1.45],['h',1.65]].forEach(([k,land],i)=>{noise(S,t+FLY[k][0],{f0:500,f1:2600,q:1.4,a:.05,k:.7,d:.2});tone(S,t+land,240-i*30,{f1:150,gl:.05,a:.12,d:.12});noise(S,t+land,{type:'highpass',f0:3500,a:.05,d:.03});});
      // the bunker builds: a soft climbing chime, one per row of the grid
      [0,2,4,7,9,12,14,16,19,21,24].forEach((s,i)=>tone(S,t+BUILD.b+.35+i*.07,523.25*Math.pow(2,s/12),{a:.022,d:.35,rv:.5}));
      // the shop: shelves sliding in, and a little till chime
      for(let i=0;i<6;i++)noise(S,t+BUILD.s+.15+i*.13,{f0:1800,f1:900,q:2,a:.035,d:.1});
      tone(S,t+BUILD.s+1.0,1318.5,{a:.04,d:.5,rv:.5});tone(S,t+BUILD.s+1.08,1975.5,{a:.03,d:.6,rv:.5});
      // the pads pop in with a few drum hits
      ['kick','hihat','snare','hihat'].forEach((id,i)=>inst(S,id,t+BUILD.h+.45+i*.09*2,0,.45));
      tone(S,t+BUILD.h+.2,880,{a:.04,d:.4,rv:.5});
      // the zoom: a riser into a warm chord, and the hi-hat calling you to press it
      noise(S,t+ZOOM[0],{f0:400,f1:5000,q:1,a:.08,k:1.15,d:.12});tone(S,t+ZOOM[0],160,{f1:640,gl:1.15,a:.04,k:1.05,d:.1});
      inst(S,'kick',t+ZOOM[1],0,.6);[130.81,261.63,329.63,392,493.88,587.33].forEach((f,i)=>tone(S,t+ZOOM[1]+i*.025,f,{type:i<2?'triangle':'sine',a:i?.045:.06,k:.06,d:2.4,rv:.6}));
      inst(S,'hihat',t+ZOOM[1]+.35,0,.7);inst(S,'hihat',t+ZOOM[1]+.85,0,.7);},1.35);
  }

  // ══════════════════════ FIRST SEQUENCER TRACK ══════════════════════
  // if you're in the shop, slide over to the pads first so you can watch it
  function toPads(then,sp){
    if(!isDesk()&&(BC.contains('store-open')||BC.contains('bunker-open'))&&typeof swipeNavGo==='function'){swipeNavGo(0,BC.contains('store-open')?1:-1);setTimeout(then,500/(sp||1));}
    else then();
  }
  window.playSeqUnlockFx=function(onDone,o){
    const sp=(o&&o.speed)||1;
    // the new steps stay hidden while we slide over to them
    const a0=document.querySelector('#gameView .seq-area');if(a0)a0.classList.add('seq-prep');
    toPads(()=>{
      const area=document.querySelector('#gameView .seq-area');if(area)area.classList.remove('seq-prep');
      if(!area||!vis(area)){onDone&&onDone();return;}
      if(getComputedStyle(area).position==='static')area.style.position='relative';
      const steps=[...area.querySelectorAll('.seq-step')].filter(vis),phc=[...area.querySelectorAll('.seq-ph-cell')].filter(vis),rows=[...area.querySelectorAll('.seq-layer-row')].filter(vis);
      area.classList.remove('seq-boot');void area.offsetWidth;area.classList.add('seq-boot');
      // the steps pop in column by column behind a scanning light
      steps.forEach((e,i)=>{e.classList.add('sq-pop');e.style.setProperty('--ibd',(.2+(i%16)*.045+Math.floor(i/16)*.06).toFixed(3)+'s');});
      phc.forEach((e,i)=>{e.classList.add('sq-pop');e.style.setProperty('--ibd',(.16+(i%16)*.045).toFixed(3)+'s');});
      rows.forEach((e,i)=>{e.classList.add('sq-row');e.style.setProperty('--ibd',(.08+i*.06).toFixed(3)+'s');});
      const sw=document.createElement('div');sw.className='seq-boot-sweep';area.appendChild(sw);
      snd((S,t)=>{const{tone,noise}=K;noise(S,t+.08,{f0:300,f1:4000,q:1.5,a:.05,k:.8,d:.1});
        for(let i=0;i<16;i++)tone(S,t+.2+i*.045,330*Math.pow(2,[0,2,4,7,9][i%5]/12+Math.floor(i/5)),{type:'square',a:.014,hold:.012,d:.03});
        tone(S,t+.1,70,{f1:140,gl:.85,a:.05,k:.7,d:.15});
        [261.63,523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(S,t+1.0+i*.03,f,{type:i?'sine':'triangle',a:i?.035:.05,k:.01,d:.9,rv:.6}));},2.1);
      // …then the real sequencer starts playing
      setTimeout(()=>{area.classList.remove('seq-boot');sw.remove();steps.concat(phc,rows).forEach(e=>{e.classList.remove('sq-pop','sq-row');e.style.removeProperty('--ibd');});onDone&&onDone();},1500/sp);
    },sp);
  };

  // ══════════════════════ ALIEN PARTY ══════════════════════
  window.playPartyUnlockFx=function(onDone,o){
    const sp=(o&&o.speed)||1;
    toPads(()=>{
      let fx=document.getElementById('partyFx');
      if(!fx){fx=document.createElement('div');fx.id='partyFx';fx.innerHTML='<canvas></canvas>';document.body.appendChild(fx);
        const skip=e=>{if(e&&e.cancelable)e.preventDefault();if(P&&(performance.now()-P.t0)*P.sp>500)endParty();};fx.addEventListener('pointerdown',skip);fx.addEventListener('touchstart',skip,{passive:false});}
      if(P)endParty();
      const cv=fx.querySelector('canvas'),g=cv.getContext('2d'),W=window.innerWidth,H=window.innerHeight,U=Math.min(W,H),dpr=Math.min(2,window.devicePixelRatio||1);
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      P=Object.assign({t0:performance.now(),sp,g,W,H,U,dpr,spots:mkSpots(),onDone,partyOn:false,landed:false,fx},MODES.unlock);
      fx.classList.add('on');
      snd((S,t)=>{const{tone,noise,inst}=K;
        noise(S,t,{f0:3000,f1:300,q:2,a:.08,d:.3});tone(S,t,900,{f1:180,gl:.3,a:.05,d:.2});   // a record scratch into the drop
        const B=60/124,T=t+.5;for(let b=0;b<6;b++){const s=T+b*B;inst(S,'kick',s,0,.8);noise(S,s+B/2,{type:'highpass',f0:7000,a:.07,d:.16});if(b%2)inst(S,'clap',s,0,.6);
          // octave-bouncing bass in D (up to G for the last two beats) and an offbeat minor-7 stab
          const up=b>=4?500:0;inst(S,'basenote',s,up,.7);inst(S,'basenote',s+B/2,1200+up,.5);
          if(b%2===0)[200,500,900,1200].forEach(x=>inst(S,'stab',s+B*.75,x+up,.16));}
        // ta-da as the button lands
        inst(S,'kick',T+B*6,0,.8);[587.33,739.99,880,1174.66].forEach((f,i)=>tone(S,T+B*6+i*.05,f,{a:.035,d:.9,rv:.6}));},.5);
      P.raf=requestAnimationFrame(partyFrame);
    },sp);
  };
  let P=null;
  const BALL_C=['#ff5fb8','#3fe6ff','#ffd23f','#5fe07a','#b38cff','#ff8a3d'];
  // unlock: the full show (dims the screen, runs a short party with its own groove, the button lands at the end)
  // start: every time you press ALIEN PARTY — the ball drops and lights up the room while your party gets going
  //        (lighter, shorter, never in the way of your taps, and it lifts away by itself)
  const MODES={
    unlock:{mode:'unlock',ballY:.17,dimMax:.5,drop0:.05,drop1:.55,up0:2.85,up1:3.35,on0:.45,on1:.65,off0:2.8,off1:3.3,dim0:2.9,dim1:3.4,dur:4.0,land:3.4},
    start: {mode:'start', ballY:.095,dimMax:.2,drop0:0,  drop1:.5, up0:2.45,up1:2.95,on0:.35,on1:.55,off0:2.35,off1:2.85,dim0:2.35,dim1:2.85,dur:3.0,land:1e9},
  };
  function mkSpots(){const a=[];for(let i=0;i<34;i++)a.push({a:Math.random()*6.3,r:Math.random(),v:.4+Math.random()*.8,h:Math.floor(Math.random()*360),s:.6+Math.random()*.8});return a;}
  window.playPartyStartFx=function(o){
    const sp=(o&&o.speed)||1;
    let fx=document.getElementById('partyFxStart');
    if(!fx){fx=document.createElement('div');fx.id='partyFxStart';fx.innerHTML='<canvas></canvas>';(document.getElementById('gameScreen')||document.body).appendChild(fx);}
    if(P)endParty();
    const cv=fx.querySelector('canvas'),g=cv.getContext('2d'),W=window.innerWidth,H=window.innerHeight,U=Math.min(W,H),dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
    P=Object.assign({t0:performance.now(),sp,g,W,H,U,dpr,spots:mkSpots(),onDone:null,partyOn:true,partyOff:true,landed:true,fx},MODES.start);
    fx.classList.add('on');
    // a sparkly swoop as the ball drops in
    snd((S,t)=>{const{tone,noise}=K;noise(S,t,{f0:5000,f1:1200,q:1.5,a:.03,k:.6,d:.25});tone(S,t,1400,{f1:700,gl:.45,a:.025,d:.1});
      [1318.5,1568,2093,2637].forEach((f,i)=>tone(S,t+.5+i*.06,f,{a:.022,d:.5,rv:.6}));},.8);
    P.raf=requestAnimationFrame(partyFrame);
  };
  function partyFrame(now){
    if(!P)return;P.raf=requestAnimationFrame(partyFrame);
    const t=(performance.now()-P.t0)/1000*P.sp,{g,W,H,U}=P,dim=ss(0,.4,t)*(1-ss(P.dim0,P.dim1,t)),drop=eBack(ss(P.drop0,P.drop1,t))*(1-eOut(ss(P.up0,P.up1,t))),bx=W/2,by=lerp(-U*.2,H*P.ballY,drop),br=U*.085;
    if(P.mode==='start'&&typeof partyMode!=='undefined'&&!partyMode&&t>.1){endParty();return;}   // stopped the party: lights off
    g.setTransform(P.dpr,0,0,P.dpr,0,0);g.clearRect(0,0,W,H);
    g.fillStyle=`rgba(4,2,12,${P.dimMax*dim})`;g.fillRect(0,0,W,H);
    if(t>.45&&!P.partyOn){P.partyOn=true;P.wasParty=typeof partyMode!=='undefined'&&partyMode;if(!P.wasParty&&typeof startParty==='function')try{startParty();}catch(e){}}
    if(t>3.25&&!P.partyOff){P.partyOff=true;if(!P.wasParty&&typeof stopParty==='function')try{stopParty();}catch(e){}}
    // beams and light spots from the ball
    const on=ss(P.on0,P.on1,t)*(1-ss(P.off0,P.off1,t));
    if(on>0){g.globalCompositeOperation='lighter';
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2+t*.9,L=Math.hypot(W,H),c=BALL_C[i],ex=bx+Math.cos(a)*L,ey=by+Math.sin(a)*L;const gr=g.createLinearGradient(bx,by,ex,ey);gr.addColorStop(0,c+'55');gr.addColorStop(1,c+'00');g.fillStyle=gr;g.globalAlpha=on;
        const w=.07;g.beginPath();g.moveTo(bx,by);g.lineTo(bx+Math.cos(a-w)*L,by+Math.sin(a-w)*L);g.lineTo(bx+Math.cos(a+w)*L,by+Math.sin(a+w)*L);g.fill();}
      P.spots.forEach(s=>{const a=s.a+t*s.v,x=W/2+Math.cos(a)*W*(.15+.45*s.r),y=H*.55+Math.sin(a*1.3)*H*(.1+.35*s.r),r=U*.03*s.s;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`hsla(${s.h+t*60},100%,70%,.55)`);gr.addColorStop(1,`hsla(${s.h},100%,60%,0)`);g.fillStyle=gr;g.globalAlpha=on;g.fillRect(x-r,y-r,r*2,r*2);});
      g.globalAlpha=1;g.globalCompositeOperation='source-over';}
    // the disco ball on its string
    if(drop>0.01){g.strokeStyle='rgba(200,200,220,.6)';g.lineWidth=1.5;g.beginPath();g.moveTo(bx,0);g.lineTo(bx,by-br);g.stroke();
      g.save();g.beginPath();g.arc(bx,by,br,0,Math.PI*2);g.clip();g.fillStyle='#4a4a62';g.fillRect(bx-br,by-br,br*2,br*2);
      const n=10;for(let la=0;la<n;la++){const lat=-Math.PI/2+(la+.5)/n*Math.PI,yy=by+Math.sin(lat)*br,rw=Math.cos(lat)*br,cols=Math.max(4,Math.round(14*Math.cos(lat)));
        for(let c=0;c<cols;c++){const lon=c/cols*Math.PI*2+t*1.6,z=Math.cos(lon);if(z<0)continue;const xx=bx+Math.sin(lon)*rw,tw=.5+.5*Math.sin(lon*3+la+t*7);
          g.fillStyle=tw>.85?BALL_C[(c+la)%6]:`rgba(${170+70*tw*z},${170+70*tw*z},${200+50*tw*z},1)`;g.fillRect(xx-br*.09*z,yy-br*.08,br*.17*z,br*.15);}}
      const hl=g.createRadialGradient(bx-br*.35,by-br*.4,0,bx-br*.35,by-br*.4,br*.8);hl.addColorStop(0,'rgba(255,255,255,.55)');hl.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=hl;g.fillRect(bx-br,by-br,br*2,br*2);g.restore();
      for(let i=0;i<5;i++){const a=t*2+i*1.3,s=(Math.sin(t*6+i*2)+1)/2;if(s<.6)continue;const x=bx+Math.cos(a)*br*1.05,y=by+Math.sin(a)*br*1.05;g.fillStyle=`rgba(255,255,255,${s})`;g.beginPath();g.moveTo(x,y-6*s);g.lineTo(x+1.5,y);g.lineTo(x,y+6*s);g.lineTo(x-1.5,y);g.fill();g.beginPath();g.moveTo(x-6*s,y);g.lineTo(x,y+1.5);g.lineTo(x+6*s,y);g.lineTo(x,y-1.5);g.fill();}}
    // the ALIEN PARTY button lands
    if(t>P.land&&!P.landed){P.landed=true;const b=document.getElementById('partyBtn');if(b){b.classList.remove('pb-land');void b.offsetWidth;b.classList.add('pb-land');setTimeout(()=>b.classList.remove('pb-land'),3200);}}
    if(t>P.dur)endParty();
  }
  function endParty(){
    if(!P)return;const p=P;P=null;cancelAnimationFrame(p.raf);
    if(p.fx)p.fx.classList.remove('on');
    if(p.partyOn&&!p.partyOff&&!p.wasParty&&typeof stopParty==='function')try{stopParty();}catch(e){}
    if(!p.landed){const b=document.getElementById('partyBtn');if(b){b.classList.add('pb-land');setTimeout(()=>b.classList.remove('pb-land'),3200);}}
    p.onDone&&p.onDone();
  }
})();
