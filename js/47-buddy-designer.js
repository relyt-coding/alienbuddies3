// ── BUDDY DESIGNER ──
// First upgrade on the Alien Evolution branch (skill node 'buddy_designer').
// Opens from an alien's profile card: pick colours for each part (body, eyes, mouth, antenna, tips, feet),
// antenna length and eye size, with a big turning preview. Saved per alien in alienData[i].look.
(function(){
  const TABS=[
    {id:'body', label:'BODY',   part:'body', key:'body'},
    {id:'eye',  label:'EYES',   part:'bead', key:'eye'},
    {id:'mouth',label:'MOUTH',  part:'bead', key:'mouth'},
    {id:'stem', label:'ANTENNA',part:'stem', key:'stem'},
    {id:'tip',  label:'TIPS',   part:'tip',  key:'tip'},
    {id:'foot', label:'FEET',   part:'foot', key:'foot'},
  ];
  const ANT=[['SHORT',1],['MEDIUM',1.18],['LONG',1.35],['EXTRA LONG',1.55]];
  const EYE=[['SMALL',.82],['MEDIUM',1],['BIG',1.2]];
  let idx=null,tab='body',spec=null,angle=20,drag=null,raf=0,spinT=0,root=null;

  function build(){
    root=document.createElement('div');root.id='buddyDesigner';
    root.innerHTML=`
      <div class="bd-box">
        <div class="bd-top">
          <button class="bd-nav" id="bdPrev">‹</button>
          <div class="bd-title"><div class="bd-h">BUDDY DESIGNER</div><div class="bd-name" id="bdName"></div></div>
          <button class="bd-nav" id="bdNext">›</button>
          <button class="bd-x" id="bdClose">✕</button>
        </div>
        <canvas id="bdCanvas"></canvas>
        <div class="bd-tabs" id="bdTabs"></div>
        <div class="bd-pick" id="bdPick"></div>
        <div class="bd-swatches" id="bdSwatches"></div>
        <div class="bd-opts" id="bdOpts"></div>
        <div class="bd-actions">
          <button id="bdRandom">🎲 RANDOM</button>
          <button id="bdReset">↺ ORIGINAL</button>
          <button id="bdDone" class="bd-done">✓ DONE</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    const tabs=root.querySelector('#bdTabs');
    TABS.forEach(t=>{const b=document.createElement('button');b.textContent=t.label;b.dataset.tab=t.id;b.onclick=()=>{tab=t.id;render();};tabs.appendChild(b);});
    root.querySelector('#bdClose').onclick=close;root.querySelector('#bdDone').onclick=close;
    root.querySelector('#bdPrev').onclick=()=>go(-1);root.querySelector('#bdNext').onclick=()=>go(1);
    root.querySelector('#bdRandom').onclick=randomize;root.querySelector('#bdReset').onclick=reset;
    root.addEventListener('click',e=>{if(e.target===root)close();});
    const cv=root.querySelector('#bdCanvas');
    cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,a:angle};cv.setPointerCapture(e.pointerId);});
    cv.addEventListener('pointermove',e=>{if(!drag)return;angle=drag.a+(e.clientX-drag.x)*1.2;spinT=performance.now()+2500;});
    ['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,()=>{drag=null;}));
    addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('open'))close();});
  }
  function save(){
    if(idx===null)return;
    while(alienData.length<=idx)alienData.push({name:'',color:getAlienColor(alienData.length)});
    alienData[idx].look=Object.assign({},spec);
    refreshEverywhere();
  }
  function refreshEverywhere(){
    if(typeof refreshBouncerBuddy==='function')refreshBouncerBuddy(idx);
    if(typeof refreshBunkerBuddy==='function')refreshBunkerBuddy(idx);
    if(typeof renderAlienProfile==='function'&&typeof alienProfileIdx!=='undefined'&&alienProfileIdx===idx){try{setAnmColor(getAlienColor(idx));}catch(e){}}
  }
  function load(i){
    idx=i;spec=Object.assign({ant:1.35,eyeSize:1},buddyLookSpec(i));
    const ad=alienData[i]||{};root.querySelector('#bdName').textContent=(ad.name||'BUDDY')+' · #'+(i+1);
    root.querySelector('#bdPrev').disabled=i<=0;root.querySelector('#bdNext').disabled=i>=totalAliens-1;
    render();
  }
  function go(d){const n=idx+d;if(n<0||n>=totalAliens)return;load(n);if(typeof alienProfileIdx!=='undefined'&&alienProfileIdx!==null){alienProfileIdx=n;try{renderAlienProfile();}catch(e){}}}
  function render(){
    const T=TABS.find(t=>t.id===tab),list=BUDDY_PARTS[T.part],cur=spec[T.key];
    root.querySelectorAll('#bdTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
    const named=list.find(c=>c[0].toLowerCase()===String(cur).toLowerCase());
    root.querySelector('#bdPick').textContent=T.label+': '+(named?named[1].toUpperCase():'CUSTOM');
    const sw=root.querySelector('#bdSwatches');sw.innerHTML='';
    list.forEach(([hex,name])=>{const b=document.createElement('button');b.className='bd-sw'+(hex.toLowerCase()===String(cur).toLowerCase()?' on':'');b.style.background=hex;b.title=name;b.setAttribute('aria-label',name);
      b.onclick=()=>{spec[T.key]=hex;save();render();};sw.appendChild(b);});
    const op=root.querySelector('#bdOpts');op.innerHTML='';
    const row=(label,opts,key)=>{const w=document.createElement('div');w.className='bd-row';const l=document.createElement('span');l.textContent=label;w.appendChild(l);
      opts.forEach(([n,v])=>{const b=document.createElement('button');b.textContent=n;b.className=Math.abs((spec[key]||0)-v)<.01?'on':'';b.onclick=()=>{spec[key]=v;save();render();};w.appendChild(b);});op.appendChild(w);};
    if(tab==='stem'||tab==='tip')row('LENGTH',ANT,'ant');
    if(tab==='eye')row('SIZE',EYE,'eyeSize');
  }
  function randomize(){
    const P=BUDDY_PARTS,pk=a=>a[Math.floor(Math.random()*a.length)][0];
    spec={body:pk(P.body),eye:pk(P.bead),mouth:pk(P.bead),stem:pk(P.stem),tip:pk(P.tip),foot:pk(P.foot),ant:spec.ant,eyeSize:spec.eyeSize};
    if(spec.mouth===spec.eye)spec.mouth=pk(P.bead);
    save();render();
  }
  function reset(){
    if(idx===null)return;if(alienData[idx])delete alienData[idx].look;refreshEverywhere();load(idx);
  }
  function loop(){
    cancelAnimationFrame(raf);const cv=root.querySelector('#bdCanvas');
    const S=Math.min(300,Math.round(window.innerWidth*.72)),dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=S*dpr;cv.height=S*dpr;cv.style.width=S+'px';cv.style.height=S+'px';
    const g=cv.getContext('2d');let last=performance.now(),slow=0;
    (function f(now){if(!root.classList.contains('open'))return;const dt=Math.min(.05,(now-last)/1000);last=now;
      if(!drag&&now>spinT)angle+=dt*14;                                  // slow showroom turn; drag to look around
      const t=now/1000,look=makeBuddyLook(spec);
      g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,S,S);
      const bg=g.createRadialGradient(S/2,S*.45,S*.05,S/2,S*.5,S*.7);bg.addColorStop(0,'rgba(68,238,187,.10)');bg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=bg;g.fillRect(0,0,S,S);
      slow=dt>.035?Math.min(30,slow+1):Math.max(0,slow-1);   // old phones: lighter drawing while frames run slow
      drawBuddy(g,S/2,S*.53,S*.55,{view:'turn',angle,look,t,lite:slow>8,pulse:Math.pow(1-((t/.6)%1),3)});
      raf=requestAnimationFrame(f);})(last);
  }
  function open(i){
    if(typeof unlockedSkills==='undefined'||!unlockedSkills.buddy_designer){
      if(typeof showToast==='function')showToast('🔒 Unlock the BUDDY DESIGNER in the skill tree (Alien Evolution)');return;}
    if(!root)build();
    root.classList.add('open');tab='body';angle=20;load(i);loop();
  }
  function close(){
    if(!root)return;root.classList.remove('open');cancelAnimationFrame(raf);
    if(typeof autoSave==='function')autoSave();
  }
  window.openBuddyDesigner=open;
  const btn=document.getElementById('anmDesignBtn');
  if(btn)btn.addEventListener('click',()=>{if(typeof alienProfileIdx!=='undefined'&&alienProfileIdx!==null)open(alienProfileIdx);});
})();
