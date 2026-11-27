// ══════════════════════════════════════════════
//  YOUR SHIP (v0.2.201) — replaces the Tucana Core in the middle of the skill tree
//  The four Quad Suns orbit the middle of the map (js/35), and in the middle now floats YOUR SHIP instead of a star you buy.
//  The node id stays 'core' (saves, `requires`, the Vault all point at it): it is simply owned for free as soon as the
//  galaxies are open, so the four Quad Suns are the first things to buy.
//  The ship flies: when something is unlocked or focused (stFocusNode, js/63) or you tap a node you own, it flies over and
//  circles it (a Quad Sun keeps moving, so the ship chases it round the ring). Tap the ship to go back to your drum pads (v0.2.209).
//  It moves the core node with the CSS `translate` property (like js/35 does for the suns), so it stands up in 3D like every
//  other bubble; el._mx/_my follow it so js/81's culling never hides it.
// ══════════════════════════════════════════════
(function(){
  if(typeof SKILL_MAP==='undefined'||!SKILL_MAP.core)return;
  const C=SKILL_MAP.core;
  C.name='Your Ship';C.icon='';C.cost=0;
  C.desc='Your ship, floating in the middle of the Tucana Galaxy. The four Quad Suns orbit around it, and it flies off to everything you unlock.';
  const own=()=>{if(typeof skillTreeUnlocked!=='undefined'&&skillTreeUnlocked&&!unlockedSkills.core){unlockedSkills.core=true;return true;}return false;};
  const _open=openSkillTree;openSkillTree=function(){own();return _open.apply(this,arguments);};
  setInterval(()=>{if(own()&&document.getElementById('skillTreeModal')?.classList.contains('open')&&typeof renderSkillTree==='function')renderSkillTree();},1000);

  // v0.2.209: a nicer ship: sleek hull with panel lines, swept fins with a stripe, twin engine glow, blinking wing lights,
  //   and a little alien buddy at the controls under the glass dome
  const SHIP='<svg class="sh-svg" viewBox="0 0 140 80" width="104" height="60" aria-hidden="true">'+
    '<defs><linearGradient id="shHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#dfe6f5"/><stop offset=".7" stop-color="#97a3c0"/><stop offset="1" stop-color="#4b5573"/></linearGradient>'+
    '<linearGradient id="shFin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3dffb0"/><stop offset="1" stop-color="#009a63"/></linearGradient>'+
    '<radialGradient id="shDome" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#f2feff" stop-opacity=".95"/><stop offset=".45" stop-color="#7ae8ff" stop-opacity=".55"/><stop offset="1" stop-color="#1b5f92" stop-opacity=".85"/></radialGradient>'+
    '<radialGradient id="shGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#7ff6ff"/><stop offset="1" stop-color="#2a7dff" stop-opacity="0"/></radialGradient>'+
    '<linearGradient id="shFlame" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#e6fcff"/><stop offset=".35" stop-color="#5fd8ff"/><stop offset="1" stop-color="#7a4dff" stop-opacity="0"/></linearGradient></defs>'+
    '<path class="sh-flame" d="M24 33 L0 37 L24 41 Z M24 43 L4 46 L24 49 Z" fill="url(#shFlame)"/>'+
    // back fin + top fin
    '<path d="M44 22 L30 4 Q28 1 32 2 L58 10 L70 24 Z" fill="url(#shFin)" stroke="#0b1a24" stroke-width="2.5" stroke-linejoin="round"/>'+
    '<path d="M38 12 L54 14" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>'+
    '<path d="M44 58 L30 76 Q28 79 32 78 L58 70 L70 56 Z" fill="url(#shFin)" stroke="#0b1a24" stroke-width="2.5" stroke-linejoin="round"/>'+
    // hull
    '<path d="M22 32 Q24 22 40 21 L92 21 Q128 25 136 40 Q128 55 92 59 L40 59 Q24 58 22 48 Z" fill="url(#shHull)" stroke="#0b1a24" stroke-width="3" stroke-linejoin="round"/>'+
    '<path d="M30 46 Q80 52 130 42" fill="none" stroke="#6f7a98" stroke-width="2" opacity=".7"/>'+
    '<path d="M60 22 L58 58 M100 23 L104 56" stroke="#8a95b2" stroke-width="1.5" opacity=".55"/>'+
    // engines
    '<rect x="18" y="31" width="8" height="10" rx="2" fill="#3a4360" stroke="#0b1a24" stroke-width="2"/>'+
    '<rect x="18" y="42" width="8" height="8" rx="2" fill="#3a4360" stroke="#0b1a24" stroke-width="2"/>'+
    '<circle class="sh-eng" cx="19" cy="36" r="5" fill="url(#shGlow)"/><circle class="sh-eng" cx="19" cy="46" r="4" fill="url(#shGlow)"/>'+
    // the pilot: a buddy under the dome
    '<g transform="translate(88 30)"><path d="M-5 -9 Q-9 -16 -12 -17" stroke="#2bdc8a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="-12" cy="-17" r="2.4" fill="#ff7ad0"/>'+
    '<path d="M5 -9 Q8 -16 11 -17" stroke="#2bdc8a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="11" cy="-17" r="2.4" fill="#ff7ad0"/>'+
    '<ellipse cx="0" cy="-1" rx="10" ry="9" fill="#38e598"/><ellipse cx="-3.5" cy="-2" rx="3" ry="3.6" fill="#fff"/><ellipse cx="3.5" cy="-2" rx="3" ry="3.6" fill="#fff"/>'+
    '<circle cx="-3" cy="-1.5" r="1.7" fill="#14202e"/><circle cx="4" cy="-1.5" r="1.7" fill="#14202e"/><path d="M-3 4 Q0 6.5 3 4" stroke="#14202e" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>'+
    '<path d="M70 29 Q72 12 90 11 Q110 12 112 29 Z" fill="url(#shDome)" stroke="#0b1a24" stroke-width="2.5" stroke-linejoin="round"/>'+
    '<path d="M78 21 Q82 15 90 14" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/>'+
    // wing-tip lights
    '<circle class="sh-blink" cx="33" cy="5" r="2.6" fill="#ff4f6a"/><circle class="sh-blink b2" cx="33" cy="75" r="2.6" fill="#3dffb0"/>'+
    '<circle cx="128" cy="40" r="2.2" fill="#ffe14d"/>'+
    '</svg>';

  // ── where it is, where it's going (map coordinates) ──
  let pos={x:0,y:0},vel={x:0,y:0},goal=null,ang=0,face=1,raf=0,last=0,el=null,heading=0,bank=0;
  const modal=document.getElementById('skillTreeModal');
  function nodeEl(id){return document.querySelector('#skillTreeInner .st-node[data-node="'+id+'"]');}
  function nodePos(id){   // a sun's real spot includes its orbit offset (js/35 sets `translate`)
    const n=SKILL_MAP[id];if(!n)return null;let x=n.x,y=n.y;
    if(/^sun_/.test(id)){const e=nodeEl(id),t=e&&e.style.translate;if(t){const m=t.match(/(-?[\d.]+)px\s+(-?[\d.]+)px/);if(m){x+=+m[1];y+=+m[2];}}}
    return{x,y};
  }
  function radiusFor(id){const n=SKILL_MAP[id];return/^sun_/.test(id)?118:/^planet_/.test(id)?120:n&&n.hub?104:82;}
  function flyTo(id){if(!SKILL_MAP[id])return;goal=id==='core'?null:id;kick();}
  window.shipFlyTo=flyTo;

  function dress(){
    el=nodeEl('core');if(!el)return;
    if(!el._ship){el._ship=1;el.classList.add('st-ship');el.classList.remove('st-body','st-star');
      const c=el.querySelector('.st-node-circle');if(c){c.innerHTML=window.ship3D?'<div class="sh-bob"><canvas class="sh-3d"></canvas></div>':'<div class="sh-bob">'+SHIP+'</div>';
        c.addEventListener('click',e=>{e.stopPropagation();goHome();});}
      const l=el.querySelector('.st-node-label');if(l){l.textContent='YOUR SHIP';l.addEventListener('click',e=>{e.stopPropagation();goHome();});}
      const k=el.querySelector('.st-node-cost');if(k)k.remove();}
    apply();
  }
  // v0.2.209: tapping the ship takes you back home: out of the tree, onto your drum pads
  function goHome(){
    if(el){el.classList.add('sh-leave');setTimeout(()=>el&&el.classList.remove('sh-leave'),600);}
    try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.5);if(S){k.tone(S,S.t,330,{f1:990,gl:.3,a:.04,d:.25,rv:.5});k.noise(S,S.t,{f0:600,f1:3000,q:1,a:.03,d:.3});}}}catch(e){}
    setTimeout(()=>{const B=document.body.classList;
      // phones: the tree is a swipe page, so slide back to the pads the normal way; computers: just close the map
      if(!B.contains('desktop-mode')&&typeof swipeNavGo==='function')swipeNavGo(0,1);
      else{try{if(typeof closeSkillTree==='function')closeSkillTree();}catch(e){}}
    },380);
  }
  function apply(){
    if(!el)return;el.style.translate=pos.x.toFixed(1)+'px '+pos.y.toFixed(1)+'px';el._mx=pos.x;el._my=pos.y;
    const cv=el.querySelector('.sh-3d');
    if(cv&&window.ship3D)window.ship3D.paint(cv,heading,bank);
    else{const s=el.querySelector('.sh-svg');if(s)s.style.transform='scaleX('+face+') rotate('+(ang*face).toFixed(1)+'deg)';}
    el.classList.toggle('moving',Math.hypot(vel.x,vel.y)>40);
  }
  function step(t){
    raf=0;if(!modal||!modal.classList.contains('open')||document.hidden)return;
    const dt=Math.min(.05,(t-(last||t))/1000);last=t;
    if(!el||!el.isConnected)dress();
    let gx=0,gy=0,tx=0,ty=0;
    if(goal){const p=nodePos(goal);if(p){const r=radiusFor(goal),a=t/1000*.55;gx=p.x+Math.cos(a)*r;gy=p.y+Math.sin(a)*r*.8;tx=-Math.sin(a);ty=Math.cos(a);}}
    // spring towards the goal, but never faster than a steady cruise on long trips
    const dx=gx-pos.x,dy=gy-pos.y,d=Math.hypot(dx,dy);
    const want=Math.min(1100,d*2.4),wx=d>.5?dx/d*want:0,wy=d>.5?dy/d*want:0;
    const k=Math.min(1,dt*5);vel.x+=(wx-vel.x)*k;vel.y+=(wy-vel.y)*k;
    pos.x+=vel.x*dt;pos.y+=vel.y*dt;
    const sp=Math.hypot(vel.x,vel.y),hx=sp>30?vel.x:(goal?tx:1),hy=sp>30?vel.y:(goal?ty:0);
    if(Math.abs(hx)>.01)face=hx<0?-1:1;
    const tilt=Math.max(-28,Math.min(28,Math.atan2(hy,Math.abs(hx)||1e-3)*180/Math.PI*.6));ang+=(tilt-ang)*Math.min(1,dt*6);
    // the 3D ship turns towards where it is going (and banks into the turn) instead of mirroring
    const whead=Math.atan2(hy,hx||1e-4);
    let dd=((whead-heading+Math.PI*3)%(Math.PI*2))-Math.PI;
    heading+=dd*Math.min(1,dt*4.5);
    bank+=((-Math.max(-.32,Math.min(.32,dd*1.5)))-bank)*Math.min(1,dt*6);
    apply();raf=requestAnimationFrame(step);
  }
  function kick(){if(!raf&&modal&&modal.classList.contains('open')){last=0;raf=requestAnimationFrame(step);}}
  if(modal)new MutationObserver(kick).observe(modal,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',kick);

  // re-dress after every map render (the core node is rebuilt each time)
  const _render=renderSkillTree;renderSkillTree=function(){const r=_render.apply(this,arguments);el=null;dress();kick();return r;};
  // fly to whatever gets unlocked / focused, and to nodes you tap that you already own
  const _focus=window.stFocusNode;if(_focus)window.stFocusNode=function(id){const r=_focus.apply(this,arguments);if(id&&id!=='core')flyTo(id);return r;};
  const _det=openStDetail;openStDetail=function(id){const r=_det.apply(this,arguments);if(id!=='core')flyTo(id);return r;};   // v0.2.236: any node you tap, owned or not

  const css=document.createElement('style');css.textContent=`
.st-node.st-ship{animation:none !important;}
.st-node.st-ship .st-node-circle{background:none !important;border:0 !important;box-shadow:none !important;overflow:visible;display:flex;align-items:center;justify-content:center;cursor:pointer;}
.st-node.st-ship .st-node-circle::before,.st-node.st-ship .st-node-circle::after,.st-node.st-ship .st-node-check{display:none !important;}
.st-node.st-ship .st-node-label{color:#7fd8ff;letter-spacing:.14em;cursor:pointer;}
.st-node.st-ship .sh-bob{animation:shBob 3.2s ease-in-out infinite;filter:drop-shadow(0 0 10px rgba(95,224,255,.45));}
.st-node.st-ship .sh-svg{display:block;transition:transform .25s;}
.st-node.st-ship .sh-3d{display:block;filter:drop-shadow(0 0 10px rgba(95,224,255,.45));}
.st-node.st-ship .sh-eng{animation:shEng 1.1s ease-in-out infinite alternate;}
@keyframes shEng{from{opacity:.55;}to{opacity:1;}}
.st-node.st-ship .sh-blink{animation:shBlink 1.6s steps(1) infinite;}.st-node.st-ship .sh-blink.b2{animation-delay:.8s;}
@keyframes shBlink{0%{opacity:1;}50%{opacity:.25;}}
.st-node.st-ship.sh-leave .sh-bob{animation:shLeave .45s ease-in forwards;}
@keyframes shLeave{to{transform:translateX(60px) scale(1.4);opacity:0;}}
.st-node.st-ship .sh-flame{transform-origin:24px 40px;animation:shFlame .18s ease-in-out infinite alternate;opacity:.55;}
.st-node.st-ship.moving .sh-flame{opacity:1;}
@keyframes shBob{0%,100%{transform:translateY(-3px);}50%{transform:translateY(3px);}}
@keyframes shFlame{from{transform:scaleX(.7);}to{transform:scaleX(1.15);}}`;
  document.head.appendChild(css);
})();
