// ── ALIEN DESIGNER (v0.2.182: split into three unlocks on the Alien Evolution path) ──
//   ALIEN DESIGNER (node 'buddy_designer', first)  → HAT / GLASSES / SHOES tabs: put on accessories you own
//       (a starter piece of each comes with the node, js/51 buddyAcc.STARTER; the rest from the Best Buddy puzzles).
//       Outfit saved per alien in alienData[i].acc = {h, e, s, p} (the stand, p, is only set on the Best Buddy page).
//   PIGMENT LAB ('pigment_lab')     → BODY / EYES / MOUTH / ANTENNA / TIPS / FEET colour tabs. Saved in alienData[i].look.
//   SHAPE SHIFTER ('shape_shifter') → SHAPE tab: antenna length and eye size (also in .look).
// Locked tabs are simply not shown. Opens from an alien's profile card, with a big turning preview.
(function(){
  const TABS=[
    {id:'acc_h',label:'HAT',    acc:'h',need:'buddy_designer'},
    {id:'acc_e',label:'GLASSES',acc:'e',need:'buddy_designer'},
    {id:'acc_s',label:'SHOES',  acc:'s',need:'buddy_designer'},
    {id:'body', label:'BODY',   part:'body', key:'body',need:'pigment_lab'},
    {id:'eye',  label:'EYES',   part:'bead', key:'eye',need:'pigment_lab'},
    {id:'mouth',label:'MOUTH',  part:'bead', key:'mouth',need:'pigment_lab'},
    {id:'stem', label:'ANTENNA',part:'stem', key:'stem',need:'pigment_lab'},
    {id:'tip',  label:'TIPS',   part:'tip',  key:'tip',need:'pigment_lab'},
    {id:'foot', label:'FEET',   part:'foot', key:'foot',need:'pigment_lab'},
    {id:'shape',label:'SHAPE',  need:'shape_shifter'},
  ];
  const has=id=>typeof unlockedSkills!=='undefined'&&!!unlockedSkills[id];
  const tabOn=T=>has(T.need);
  const accOf=i=>{while(alienData.length<=i)alienData.push({name:'',color:getAlienColor(alienData.length)});const a=alienData[i];if(!a.acc)a.acc={h:null,e:null,s:null,p:null};return a.acc;};
  const owns=(c,j)=>typeof bbItemOwned==='function'?bbItemOwned(c,j):false;
  const ANT=[['SHORT',1],['MEDIUM',1.18],['LONG',1.35],['EXTRA LONG',1.55]];
  const EYE=[['SMALL',.82],['MEDIUM',1],['BIG',1.2]];
  let idx=null,tab='body',spec=null,angle=20,drag=null,raf=0,spinT=0,root=null;

  function build(){
    root=document.createElement('div');root.id='buddyDesigner';
    root.innerHTML=`
      <div class="bd-box">
        <div class="bd-top">
          <button class="bd-nav" id="bdPrev">‹</button>
          <div class="bd-title"><div class="bd-h">ALIEN DESIGNER</div><div class="bd-name" id="bdName"></div></div>
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
    TABS.forEach(t=>{const b=document.createElement('button');b.textContent=t.label;b.dataset.tab=t.id;if(t.acc)b.classList.add('bd-tab-acc');b.onclick=()=>{tab=t.id;render();};tabs.appendChild(b);});
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
    if(!tabOn(TABS.find(t=>t.id===tab)||{}))tab=(TABS.find(tabOn)||TABS[0]).id;
    root.querySelectorAll('#bdTabs button').forEach(b=>{const T0=TABS.find(t=>t.id===b.dataset.tab);b.style.display=tabOn(T0)?'':'none';b.classList.toggle('on',b.dataset.tab===tab);});
    const T=TABS.find(t=>t.id===tab),sw=root.querySelector('#bdSwatches'),op=root.querySelector('#bdOpts');
    if(T.acc){renderAcc(T);return;}
    if(T.id==='shape'){
      root.querySelector('#bdPick').textContent='SHAPE';sw.innerHTML='';sw.classList.remove('bd-accs');op.innerHTML='';
      shapeRow('ANTENNA LENGTH',ANT,'ant');shapeRow('EYE SIZE',EYE,'eyeSize');return;}
    sw.classList.remove('bd-accs');
    const list=BUDDY_PARTS[T.part],cur=spec[T.key];
    const named=list.find(c=>c[0].toLowerCase()===String(cur).toLowerCase());
    root.querySelector('#bdPick').textContent=T.label+': '+(named?named[1].toUpperCase():'CUSTOM');
    sw.innerHTML='';
    list.forEach(([hex,name])=>{const b=document.createElement('button');b.className='bd-sw'+(hex.toLowerCase()===String(cur).toLowerCase()?' on':'');b.style.background=hex;b.title=name;b.setAttribute('aria-label',name);
      b.onclick=()=>{spec[T.key]=hex;save();render();};sw.appendChild(b);});
    op.innerHTML='';
  }
  // SHAPE tab rows (Shape Shifter)
  function shapeRow(label,opts,key){const op=root.querySelector('#bdOpts'),w=document.createElement('div');w.className='bd-row';const l=document.createElement('span');l.textContent=label;w.appendChild(l);
    opts.forEach(([n,v])=>{const b=document.createElement('button');b.textContent=n;b.className=Math.abs((spec[key]||0)-v)<.01?'on':'';b.onclick=()=>{spec[key]=v;save();render();};w.appendChild(b);});op.appendChild(w);}
  // HAT / GLASSES / SHOES tabs (Alien Designer): NONE + every piece you own; a counter says how many are still out there
  function renderAcc(T){
    const c=T.acc,acc=accOf(idx),cat=buddyAcc.CATS.find(x=>x.k===c),sw=root.querySelector('#bdSwatches');
    root.querySelector('#bdOpts').innerHTML='';sw.innerHTML='';sw.classList.add('bd-accs');
    const cur=acc[c],curIt=cur!=null&&cat.list[cur];
    root.querySelector('#bdPick').textContent=T.label+': '+(curIt?curIt.name.toUpperCase():'NONE');
    const tile=(label,on,fill)=>{const b=document.createElement('button');b.className='bd-acc'+(on?' on':'');fill(b);const s=document.createElement('small');s.textContent=label;b.appendChild(s);sw.appendChild(b);return b;};
    tile('NONE',cur==null,b=>{const x=document.createElement('span');x.className='bd-none';x.textContent='✕';b.appendChild(x);}).onclick=()=>{acc[c]=null;accChanged();};
    const look=makeBuddyLook(spec);let locked=0;
    cat.list.forEach((it,j)=>{if(!owns(c,j)){locked++;return;}
      tile(it.name,cur===j,b=>{try{b.appendChild(buddyAcc.icon(c,j,44,look));}catch(e){}}).onclick=()=>{acc[c]=acc[c]===j?null:j;accChanged();};});
    if(locked){const m=document.createElement('div');m.className='bd-more';m.textContent=locked+' MORE TO FIND';sw.appendChild(m);}
  }
  function accChanged(){refreshEverywhere();render();if(typeof autoSave==='function')autoSave();}
  // RANDOM / ORIGINAL only change what you've unlocked: outfits always, colours with Pigment Lab, shape with Shape Shifter
  function randomize(){
    const P=BUDDY_PARTS,pk=a=>a[Math.floor(Math.random()*a.length)][0];
    const acc=accOf(idx);['h','e','s'].forEach(c=>{const cat=buddyAcc.CATS.find(x=>x.k===c),own=cat.list.map((_,j)=>j).filter(j=>owns(c,j));acc[c]=Math.random()<.35||!own.length?null:own[Math.floor(Math.random()*own.length)];});
    if(has('pigment_lab')){spec=Object.assign({},spec,{body:pk(P.body),eye:pk(P.bead),mouth:pk(P.bead),stem:pk(P.stem),tip:pk(P.tip),foot:pk(P.foot)});if(spec.mouth===spec.eye)spec.mouth=pk(P.bead);}
    if(has('shape_shifter')){spec.ant=ANT[Math.floor(Math.random()*ANT.length)][1];spec.eyeSize=EYE[Math.floor(Math.random()*EYE.length)][1];}
    save();render();
  }
  function reset(){
    if(idx===null)return;const acc=accOf(idx);acc.h=acc.e=acc.s=null;
    if(alienData[idx]&&alienData[idx].look){const L=alienData[idx].look;delete alienData[idx].look;const base=Object.assign({ant:1.35,eyeSize:1},buddyLookSpec(idx));alienData[idx].look=L;   // the look it was born with
      if(has('pigment_lab'))['body','eye','mouth','stem','tip','foot'].forEach(k=>{L[k]=base[k];});
      if(has('shape_shifter')){L.ant=base.ant;L.eyeSize=base.eyeSize;}}
    refreshEverywhere();load(idx);
  }
  function loop(){
    cancelAnimationFrame(raf);const cv=root.querySelector('#bdCanvas');
    const S=Math.min(300,Math.round(window.innerWidth*.72),Math.round(window.innerHeight*.34)),   // short phones: smaller preview so the tabs and options fit
      dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=S*dpr;cv.height=S*dpr;cv.style.width=S+'px';cv.style.height=S+'px';
    const g=cv.getContext('2d');let last=performance.now(),slow=0;
    (function f(now){if(!root.classList.contains('open'))return;const dt=Math.min(.05,(now-last)/1000);last=now;
      if(!drag&&now>spinT)angle+=dt*14;                                  // slow showroom turn; drag to look around
      const t=now/1000,look=makeBuddyLook(spec);
      g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,S,S);
      const bg=g.createRadialGradient(S/2,S*.45,S*.05,S/2,S*.5,S*.7);bg.addColorStop(0,'rgba(68,238,187,.10)');bg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=bg;g.fillRect(0,0,S,S);
      slow=dt>.035?Math.min(30,slow+1):Math.max(0,slow-1);   // old phones: lighter drawing while frames run slow
      drawBuddy(g,S/2,S*.53,S*.55,{view:'turn',angle,look,t,lite:slow>8,pulse:Math.pow(1-((t/.6)%1),3),A:(alienData[idx]&&alienData[idx].acc)||null});
      raf=requestAnimationFrame(f);})(last);
  }
  function open(i){
    if(typeof unlockedSkills==='undefined'||!unlockedSkills.buddy_designer){
      if(typeof showToast==='function')showToast('🔒 Unlock the ALIEN DESIGNER in the skill tree (Alien Evolution)');return;}
    if(!root)build();
    root.classList.add('open');tab='acc_h';angle=20;load(i);loop();
  }
  function close(){
    if(!root)return;root.classList.remove('open');cancelAnimationFrame(raf);
    if(typeof autoSave==='function')autoSave();
  }
  window.openBuddyDesigner=open;
  const btn=document.getElementById('anmDesignBtn');
  if(btn)btn.addEventListener('click',()=>{if(typeof alienProfileIdx!=='undefined'&&alienProfileIdx!==null)open(alienProfileIdx);});
})();
