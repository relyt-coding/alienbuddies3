// ══════════════════════════════════════════════
//  YOUR SHIP (v0.2.201) — replaces the Tucana Core in the middle of the skill tree
//  The four Quad Suns orbit the middle of the map (js/35), and in the middle now floats YOUR SHIP instead of a star you buy.
//  The node id stays 'core' (saves, `requires`, the Vault all point at it): it is simply owned for free as soon as the
//  galaxies are open, so the four Quad Suns are the first things to buy.
//  The ship flies: when something is unlocked or focused (stFocusNode, js/63) or you tap a node you own, it flies over and
//  circles it (a Quad Sun keeps moving, so the ship chases it round the ring). Tap the ship to fly it home to the middle.
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

  const SHIP='<svg class="sh-svg" viewBox="0 0 120 70" width="96" height="56" aria-hidden="true">'+
    '<defs><linearGradient id="shHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f7ff"/><stop offset=".55" stop-color="#aab4cc"/><stop offset="1" stop-color="#5b6582"/></linearGradient>'+
    '<radialGradient id="shDome" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#e9fdff"/><stop offset=".5" stop-color="#5fe0ff"/><stop offset="1" stop-color="#1a6c9a"/></radialGradient>'+
    '<linearGradient id="shFlame" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff6b0"/><stop offset=".4" stop-color="#ffb02e"/><stop offset="1" stop-color="rgba(255,80,40,0)"/></linearGradient></defs>'+
    '<path class="sh-flame" d="M22 31 L0 35 L22 39 Z" fill="url(#shFlame)"/>'+
    '<path d="M40 20 L30 6 L50 8 L62 22 Z" fill="#00c878" stroke="#0b1a24" stroke-width="2.5" stroke-linejoin="round"/>'+
    '<path d="M40 50 L30 64 L50 62 L62 48 Z" fill="#00c878" stroke="#0b1a24" stroke-width="2.5" stroke-linejoin="round"/>'+
    '<path d="M20 28 Q22 22 34 21 L84 21 Q112 24 116 35 Q112 46 84 49 L34 49 Q22 48 20 42 Z" fill="url(#shHull)" stroke="#0b1a24" stroke-width="3" stroke-linejoin="round"/>'+
    '<path d="M26 35 L104 35" stroke="#7c87a3" stroke-width="2" stroke-linecap="round" opacity=".7"/>'+
    '<ellipse cx="76" cy="30" rx="14" ry="8" fill="url(#shDome)" stroke="#0b1a24" stroke-width="2.5"/>'+
    '<ellipse cx="72" cy="27.5" rx="4" ry="2" fill="#fff" opacity=".85"/>'+
    '<circle cx="46" cy="35" r="3" fill="#00ff88"/><circle cx="58" cy="35" r="3" fill="#ffe14d"/>'+
    '</svg>';

  // ── where it is, where it's going (map coordinates) ──
  let pos={x:0,y:0},vel={x:0,y:0},goal=null,ang=0,face=1,raf=0,last=0,el=null;
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
      const c=el.querySelector('.st-node-circle');if(c){c.innerHTML='<div class="sh-bob">'+SHIP+'</div>';
        c.addEventListener('click',e=>{e.stopPropagation();flyTo('core');});}
      const l=el.querySelector('.st-node-label');if(l){l.textContent='YOUR SHIP';l.addEventListener('click',e=>{e.stopPropagation();flyTo('core');});}
      const k=el.querySelector('.st-node-cost');if(k)k.remove();}
    apply();
  }
  function apply(){
    if(!el)return;el.style.translate=pos.x.toFixed(1)+'px '+pos.y.toFixed(1)+'px';el._mx=pos.x;el._my=pos.y;
    const s=el.querySelector('.sh-svg');if(s)s.style.transform='scaleX('+face+') rotate('+(ang*face).toFixed(1)+'deg)';
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
    apply();raf=requestAnimationFrame(step);
  }
  function kick(){if(!raf&&modal&&modal.classList.contains('open')){last=0;raf=requestAnimationFrame(step);}}
  if(modal)new MutationObserver(kick).observe(modal,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',kick);

  // re-dress after every map render (the core node is rebuilt each time)
  const _render=renderSkillTree;renderSkillTree=function(){const r=_render.apply(this,arguments);el=null;dress();kick();return r;};
  // fly to whatever gets unlocked / focused, and to nodes you tap that you already own
  const _focus=window.stFocusNode;if(_focus)window.stFocusNode=function(id){const r=_focus.apply(this,arguments);if(id&&id!=='core')flyTo(id);return r;};
  const _det=openStDetail;openStDetail=function(id){const r=_det.apply(this,arguments);if(id!=='core'&&unlockedSkills[id])flyTo(id);return r;};

  const css=document.createElement('style');css.textContent=`
.st-node.st-ship{animation:none !important;}
.st-node.st-ship .st-node-circle{background:none !important;border:0 !important;box-shadow:none !important;overflow:visible;display:flex;align-items:center;justify-content:center;cursor:pointer;}
.st-node.st-ship .st-node-circle::before,.st-node.st-ship .st-node-circle::after,.st-node.st-ship .st-node-check{display:none !important;}
.st-node.st-ship .st-node-label{color:#7fd8ff;letter-spacing:.14em;cursor:pointer;}
.st-node.st-ship .sh-bob{animation:shBob 3.2s ease-in-out infinite;filter:drop-shadow(0 0 10px rgba(95,224,255,.45));}
.st-node.st-ship .sh-svg{display:block;transition:transform .25s;}
.st-node.st-ship .sh-flame{transform-origin:22px 35px;animation:shFlame .18s ease-in-out infinite alternate;opacity:.55;}
.st-node.st-ship.moving .sh-flame{opacity:1;}
@keyframes shBob{0%,100%{transform:translateY(-3px);}50%{transform:translateY(3px);}}
@keyframes shFlame{from{transform:scaleX(.7);}to{transform:scaleX(1.15);}}`;
  document.head.appendChild(css);
})();
