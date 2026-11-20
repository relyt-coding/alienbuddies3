// ══════════════════════════════════════════════
//  TWO MORE EGGS (v0.2.193)
//  10 seconds after the first buddy hatches (and the Bunker / Shop cutscene is over), two eggs roll onto the drum pads
//  screen, one each side of the score. Each is a different buddy (its shell shows that buddy's colours) and costs 50 mJ
//  (alienCost(1) = alienCost(2) = 500 units, js/01), so new players get three buddies fast and choose which comes first.
//  Tapping one with enough energy hatches THAT buddy (its pick is written to alienData[n].base before buyAlien, which
//  then opens the usual hatch window). Not enough yet: it wobbles and its price tag pops. Buying buddies from the Shop
//  counts too: the eggs go away once you have 3 buddies. On a reload with 1–2 buddies they're simply there.
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList,$=id=>document.getElementById(id);
  const eggs=[],picks=[];let sawZero=false,readyAt=0,raf=0,t0=0;
  const cost=()=>alienCost(totalAliens);
  function size(){return B.contains('phone-land')?{w:30,h:38}:B.contains('desktop-mode')?{w:58,h:72}:{w:52,h:64};}
  function pal(p){const L=typeof buddyBaseSpec==='function'?buddyBaseSpec(p):{body:'#7fe3c0',tip:'#ff9ccf',eye:'#9fc5ff'};return[L.body,L.tip,L.eye,L.foot||L.body];}
  function same(a,b){return a&&b&&a.sp===b.sp&&a.v===b.v;}
  function ensurePicks(n){
    while(picks.length>n)picks.pop();
    while(picks.length<n){let p=null;for(let tries=0;tries<12;tries++){p=buddyPickFor(totalAliens);if(!picks.some(q=>same(q,p)))break;}picks.push(p);}
  }
  function paint(el,crack){const p=el._pick,cv=el.querySelector('canvas'),S=size(),k=Math.min(2,window.devicePixelRatio||1),W=S.w+12,H=S.h+12;
    cv.width=Math.round(W*k);cv.height=Math.round(H*k);cv.style.width=W+'px';cv.style.height=H+'px';
    const g=cv.getContext('2d');g.setTransform(k,0,0,k,0,0);try{paintBuddyEgg(g,W/2,H/2,S.w/2,S.h/2,0,!!(p&&p.sp!=null),crack||0,pal(p),k);}catch(e){}}
  function make(i){const el=document.createElement('div');el.className='twinEgg rolling';el.style.animationDelay=(i*.35)+'s';
    el.innerHTML='<div class="pe-glow"></div><div class="pe-body"><canvas></canvas></div><div class="pe-tag"></div>';
    el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();tap(el);});
    $('gameView').appendChild(el);setTimeout(()=>el.classList.remove('rolling'),1300+i*350);
    try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.8);if(S){k.noise(S,S.t+i*.35,{f0:300,f1:900,q:.8,a:.025,k:.9,d:.2});k.tone(S,S.t+.95+i*.35,520+i*80,{f1:300,gl:.06,a:.08,d:.08});}}}catch(e){}
    return el;}
  function place(){
    const se=$('scoreEl'),gv=$('gameView');if(!se||!gv||!eggs.length)return;
    let r;try{const rg=document.createRange();rg.selectNodeContents(se);r=rg.getBoundingClientRect();}catch(e){}if(!r||!r.width)r=se.getBoundingClientRect();
    const gr=gv.getBoundingClientRect(),land=B.contains('phone-land');
    eggs.forEach((el,i)=>{const op=el.offsetParent||gv,o=op.getBoundingClientRect(),ew=el.offsetWidth||60,ch=el.querySelector('canvas').offsetHeight||76;
      let x;const n=eggs.length;
      if(land)x=r.left-(n-i)*(ew+8)-6;                                           // sideways: both wait left of the score
      else if(n===1)x=Math.min(r.right+20,Math.min(innerWidth,gr.right)-ew-8);   // one left: right of the score
      else x=i===0?Math.max(gr.left+6,r.left-ew-18):Math.min(r.right+18,Math.min(innerWidth,gr.right)-ew-6);
      el.style.left=(x-o.left).toFixed(1)+'px';el.style.top=(Math.max(2,r.top+r.height/2-ch/2)-o.top).toFixed(1)+'px';});
  }
  function sync(){
    const want=B.contains('game-active')&&typeof totalAliens==='number'&&totalAliens>=1&&totalAliens<3&&!B.contains('nav-locked')&&!B.contains('buddy-hold')&&!B.contains('intro-run')&&!(typeof newFileIntroRunning==='function'&&newFileIntroRunning());
    if(typeof totalAliens==='number'&&totalAliens<1&&B.contains('game-active'))sawZero=true;
    const er=$('eggReveal'),revealOn=!!(er&&er.classList.contains('on'));
    if(!want){clear();if(totalAliens>=1&&sawZero&&!readyAt&&!B.contains('nav-locked')&&!B.contains('buddy-hold'))readyAt=performance.now()+10000;return;}
    if(sawZero&&!readyAt)readyAt=performance.now()+10000;   // just hatched the first one this session: give it 10 s
    if(readyAt&&performance.now()<readyAt)return;
    if(revealOn){eggs.forEach(e=>e.style.visibility='hidden');return;}
    const n=3-totalAliens;ensurePicks(n);
    while(eggs.length>n){const gone=eggs.pop();gone.remove();}
    while(eggs.length<n){const el=make(eggs.length);eggs.push(el);}
    eggs.forEach((el,i)=>{el.style.visibility='';if(!same(el._pick,picks[i])){el._pick=picks[i];paint(el,0);}el.querySelector('.pe-tag').innerHTML=fmtJh(cost());});
    place();if(!raf){t0=performance.now();raf=requestAnimationFrame(frame);}
  }
  function clear(){eggs.forEach(e=>e.remove());eggs.length=0;cancelAnimationFrame(raf);raf=0;}
  function frame(now){if(!eggs.length){raf=0;return;}raf=requestAnimationFrame(frame);
    const c=cost(),ready=score>=c,p=Math.max(0,Math.min(1,score/c)),t=(now-t0)/1000;
    eggs.forEach((el,i)=>{el.classList.toggle('ready',ready);const body=el.querySelector('.pe-body');let rot=0,y=0;const tt=t+i*.7;
      if(ready){const ph=tt%1.5;rot=Math.sin(tt*9)*7*(ph<.6?1:.25);y=ph<.35?-Math.sin(ph/.35*Math.PI)*9:0;}
      else{const per=3.2-2.1*p,ph=tt%per,dur=.55;if(ph<dur)rot=Math.sin(ph/dur*Math.PI*4)*(4+9*p)*(1-ph/dur);}
      if(el._shake>0){rot+=Math.sin(tt*55)*10*el._shake;el._shake=Math.max(0,el._shake-.06);}
      body.style.transform=`translateY(${y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;});
  }
  function tap(el){
    if(score<cost()){el._shake=1;const tg=el.querySelector('.pe-tag');tg.classList.remove('bump');void tg.offsetWidth;tg.classList.add('bump');return;}
    const n=totalAliens;while(alienData.length<=n)alienData.push({name:'',color:''});
    alienData[n].base=el._pick;                        // the egg you chose is the buddy you get
    const i=eggs.indexOf(el);if(i>=0){picks.splice(i,1);eggs.splice(i,1);}el.remove();
    buyAlien();sync();
  }
  setInterval(sync,300);addEventListener('resize',()=>setTimeout(place,100));
  window.__twin={sync,get eggs(){return eggs;},skipWait(){readyAt=1;}};
})();
