// ══════════════════════════════════════════════
//  KEYBOARD CARDS + GAME CONTROLLERS (v0.2.228)
//
//  1) MATCHING GAME ON THE KEYBOARD: the arrow keys move a glowing cursor between the cards (it jumps to the nearest
//     card in that direction, so any grid shape works, and wraps round to the far side at each edge) and Space / Enter
//     flips the card under it, through the card's own click handler. The first arrow (or Space) only shows the cursor.
//     On the intro card, Space after the flip presses DONE.
//     The win screen is still js/91's (Space claims the prize). A mouse click or a tap hides the cursor again.
//
//  2) CONTROLLERS: one small layer turns a gamepad into the keys the game already understands, so every keyboard
//     feature works on a controller without its own code:
//       D-pad / left stick → arrow keys (held = repeats)   ·   A (bottom button) → Space   ·   B (right button) → Escape
//       X / Y → Enter / Space (so either face button "presses")
//     Space keeps its meaning everywhere: unlock the next thing (js/91), jump in Planet Hop / Buddy Race, flip a card.
//     Key events carry `fromPad:true` in case a feature ever needs to tell them apart. Later: pads on the shoulder buttons.
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList,$=id=>document.getElementById(id);

  // ── 1) matching game cursor ──
  let cur=-1,shown=false;
  const modalOpen=()=>{const m=$('matchingModal');return !!m&&getComputedStyle(m).display!=='none';};
  const winOpen=()=>{const v=$('matchVictory');return !!v&&getComputedStyle(v).display!=='none';};
  const cards=()=>[...document.querySelectorAll('#matchGrid .match-card')];
  function paint(){cards().forEach((c,i)=>c.classList.toggle('mk-cur',shown&&i===cur));}
  function firstFree(L){const i=L.findIndex(c=>!c.classList.contains('flipped')&&!c.classList.contains('matched'));return i<0?0:i;}
  // v0.2.235: at an edge the cursor wraps to the far side of the same row / column (right → leftmost, up → bottom row)
  function wrap(dx,dy,L,cur,cx,cy){
    let best=-1,bv=-Infinity;
    L.forEach((c,i)=>{if(i===cur)return;const r=c.getBoundingClientRect(),x=r.left+r.width/2-cx,y=r.top+r.height/2-cy;
      if(dx){
        if(Math.abs(y)>r.height*.5)return;                       // same row
        if(dx<0?x<=0:x>=0)return;                                // on the far side of the board
        const v=dx<0?x:-x;if(v>bv){bv=v;best=i;}
      }else{
        if(Math.abs(x)>r.width*.5)return;                        // same column
        if(dy<0?y<=0:y>=0)return;
        const v=dy<0?y:-y;if(v>bv){bv=v;best=i;}
      }});
    return best;
  }
  function move(dx,dy){
    const L=cards();if(!L.length)return;
    if(!shown||cur<0||cur>=L.length){shown=true;cur=firstFree(L);paint();return;}
    const r0=L[cur].getBoundingClientRect(),cx=r0.left+r0.width/2,cy=r0.top+r0.height/2;
    let best=-1,bd=Infinity;
    L.forEach((c,i)=>{if(i===cur)return;const r=c.getBoundingClientRect(),x=r.left+r.width/2-cx,y=r.top+r.height/2-cy;
      const along=dx?x*dx:y*dy,side=dx?Math.abs(y):Math.abs(x);
      if(along<4)return;                                   // has to be in that direction
      const d=along+side*2.2;if(d<bd){bd=d;best=i;}});     // prefer cards straight ahead over diagonal ones
    if(best<0)best=wrap(dx,dy,L,cur,cx,cy);                // edge: wrap round to the other side
    if(best>=0){cur=best;paint();try{if(typeof playMatchTick==='function')playMatchTick();}catch(e){}}
    else{const c=L[cur];c.classList.remove('mk-bump');void c.offsetWidth;c.classList.add('mk-bump');}
  }
  function press(){
    const L=cards();if(!L.length)return;
    // the intro card: once it's open, Space presses its DONE button
    const done=[...document.querySelectorAll('#matchGrid > button')].find(b=>getComputedStyle(b).display!=='none');
    if(done){done.click();shown=false;cur=-1;return;}
    if(!shown||cur<0||cur>=L.length){shown=true;cur=firstFree(L);paint();if(L.length>1)return;}
    L[cur].click();
  }
  document.addEventListener('keydown',e=>{
    if(!modalOpen()||winOpen()||e.ctrlKey||e.metaKey||e.altKey)return;
    const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    const k=e.code||e.key,dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[k];
    if(dir){e.preventDefault();e.stopImmediatePropagation();move(dir[0],dir[1]);return;}
    if(k==='Space'||k==='Enter'||k==='NumpadEnter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)press();}
  },true);
  // a new grid (next level) starts without a cursor until you use the keys again; the mouse / a tap hides it
  const grid=$('matchGrid');
  if(grid)new MutationObserver(()=>{const n=cards().length;if(cur>=n)cur=-1;if(shown){if(cur<0){cur=firstFree(cards());}paint();}}).observe(grid,{childList:true});
  document.addEventListener('pointerdown',e=>{if(e.pointerType&&shown&&modalOpen()){shown=false;paint();}},true);

  const css=document.createElement('style');css.textContent=`
#matchGrid .match-card.mk-cur{outline:3px solid #7fffd0;outline-offset:4px;border-radius:14px;box-shadow:0 0 22px 4px rgba(0,255,170,.55);z-index:3;}
#matchGrid .match-card.mk-cur:not(.flipped){animation:mkPulse 1.1s ease-in-out infinite;}
@keyframes mkPulse{50%{outline-color:#ffffff;box-shadow:0 0 30px 8px rgba(0,255,170,.75);}}
#matchGrid .match-card.mk-bump{animation:mkBump .25s ease-in-out;}
@keyframes mkBump{30%{transform:translateX(-4px);}70%{transform:translateX(4px);}}`;
  document.head.appendChild(css);

  // ── 3) THE VAULT ON THE KEYBOARD (v0.2.249) ──
  //  The arrow keys walk the Vault and Space / Enter presses what the glowing ring is on. The ring starts ON BACK the
  //  moment the Vault opens, so backing out is a single press; then DOWN takes you into the tabs and the tiles. An open
  //  entry pop-up (or the help card) takes Space for its own button. A mouse click or a tap hides the ring again.
  let vCur=null,vShown=false;
  const vOpen=()=>{const b=document.body.classList;return b.contains('vault-open')||!!($('vaultModal')&&$('vaultModal').classList.contains('open'));};
  const vPop=()=>{const p=$('vaultPop'),h=$('vaultHelp');
    return (p&&p.classList.contains('on'))?p:((h&&h.classList.contains('on'))?h:null);};
  function vItems(){
    const box=$('vaultBox');if(!box)return [];
    const out=[],back=$('vaultClose');if(back)out.push(['back',back]);
    [...box.querySelectorAll('.vt-tab')].forEach((e,i)=>out.push(['tab'+i,e]));
    [...box.querySelectorAll('.vb-tile')].forEach((e,i)=>out.push(['tile'+i,e]));
    return out;
  }
  function vPaint(){
    const items=vItems(),cur=vCur;
    items.forEach(([k,e])=>e.classList.toggle('vk-cur',vShown&&k===cur));
  }
  function vFocus(k,scroll){
    vCur=k;vShown=true;vPaint();
    if(scroll){const it=vItems().find(([kk])=>kk===k);if(it)try{it[1].scrollIntoView({block:'nearest'});}catch(e){}}
  }
  function vMove(dx,dy){
    const items=vItems();if(!items.length)return;
    if(!vShown||!items.some(([k])=>k===vCur)){vFocus('back');return;}
    const curEl=items.find(([k])=>k===vCur)[1],r0=curEl.getBoundingClientRect(),cx=r0.left+r0.width/2,cy=r0.top+r0.height/2;
    // v0.2.249: DOWN from BACK goes to the tab bar first, so the walk is header → tabs → tiles
    const pool=(vCur==='back'&&dy>0&&items.some(([k])=>k.startsWith('tab')))?items.filter(([k])=>k.startsWith('tab')):items;
    let best=null,bd=Infinity;
    pool.forEach(([k,e])=>{if(k===vCur)return;const r=e.getBoundingClientRect(),x=r.left+r.width/2-cx,y=r.top+r.height/2-cy;
      const along=dx?x*dx:y*dy,side=dx?Math.abs(y):Math.abs(x);
      if(along<4)return;                                  // has to be in that direction
      const d=along+Math.max(0,side-r.height*.5)*2.4;     // prefer straight ahead over diagonal
      if(d<bd){bd=d;best=k;}});
    if(best)vFocus(best,true);
    else{curEl.classList.remove('vk-bump');void curEl.offsetWidth;curEl.classList.add('vk-bump');}
  }
  function vPress(){
    const pop=vPop();
    if(pop){const b=pop.querySelector('button');if(b)b.click();else pop.classList.remove('on');return;}
    const items=vItems();if(!items.length)return;
    if(!vShown||!items.some(([k])=>k===vCur)){vFocus('back');return;}
    const el=items.find(([k])=>k===vCur)[1];if(el)el.click();
  }
  document.addEventListener('keydown',e=>{
    if(!vOpen()||e.ctrlKey||e.metaKey||e.altKey)return;
    const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    const k=e.code||e.key,dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[k];
    if(dir){e.preventDefault();e.stopImmediatePropagation();vMove(dir[0],dir[1]);return;}
    if(k==='Space'||k==='Enter'||k==='NumpadEnter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)vPress();}
  },true);
  // the Vault opening puts the ring on BACK straight away; closing clears it
  function vOnOpen(){
    if(!vOpen()){vShown=false;vCur=null;vPaint();return;}
    if(!vShown){vCur='back';setTimeout(()=>{if(vOpen()&&!vShown)vFocus('back');},40);}
  }
  new MutationObserver(vOnOpen).observe(document.body,{attributes:true,attributeFilter:['class']});
  {const vm=$('vaultModal');if(vm)new MutationObserver(vOnOpen).observe(vm,{attributes:true,attributeFilter:['class']});}
  // a new tab / a re-render keeps the ring on the same kind of thing
  {const vb=$('vaultBody');if(vb)new MutationObserver(()=>{if(vShown&&vOpen())vPaint();}).observe(vb,{childList:true});}
  document.addEventListener('pointerdown',e=>{if(e.pointerType&&vShown&&vOpen()){vShown=false;vPaint();}},true);

  const vcss=document.createElement('style');vcss.textContent=`
#vaultBody{padding-left:4px;padding-right:4px;}
#vaultBox .vk-cur{outline:0;box-shadow:inset 0 0 0 3px #e0e055,inset 0 0 18px 3px rgba(224,224,85,.32);position:relative;z-index:4;}
#vaultBox .vk-cur:not(.own){animation:vkPulse 1.2s ease-in-out infinite;}
@keyframes vkPulse{50%{box-shadow:inset 0 0 0 3px #ffffff,inset 0 0 24px 6px rgba(224,224,85,.48);}}
#vaultBox .vk-bump{animation:vkBump .25s ease-in-out;}
@keyframes vkBump{30%{transform:translateX(-4px);}70%{transform:translateX(4px);}}`;
  document.head.appendChild(vcss);

  // ── 4) THE PAD SOUND LIST ON THE KEYBOARD (v0.2.249) ──
  //  Up / Down walk the sound list with a glowing ring (it opens on the pad's current sound, or the first one when the pad
  //  is empty), Left / Right nudge that sound's volume, Space / Enter picks it — which closes the list and fills the pad.
  //  Escape closes without choosing. A mouse click or a tap hides the ring again.
  let pCur=null,pShown=false;
  const pModal=()=>{const m=$('padAssignModal');return !!m&&m.classList.contains('open');};
  const pItems=()=>[...document.querySelectorAll('#padAssignList .pa-item')];
  function pPaint(){const cur=pCur;pItems().forEach(e=>e.classList.toggle('pa-cur',pShown&&e===cur));}
  function pFocus(el,scroll){pCur=el;pShown=true;pPaint();if(scroll&&el){try{el.scrollIntoView({block:'nearest'});}catch(e){}}}
  function pStart(){const L=pItems();if(!L.length){pCur=null;pShown=true;return;}pFocus(L.find(e=>e.classList.contains('active'))||L[0],true);}
  function pMove(d){
    const L=pItems();if(!L.length)return;
    if(!pShown||!pCur||!L.includes(pCur)){pFocus(L[0],true);return;}
    const i=L.indexOf(pCur),j=Math.max(0,Math.min(L.length-1,i+d));
    if(j!==i)pFocus(L[j],true);
    else{const e=L[i];e.classList.remove('pa-bump');void e.offsetWidth;e.classList.add('pa-bump');}
  }
  function pVolume(d){
    if(!pCur)return;
    const r=pCur.querySelector('.pa-vol-slider'),n=pCur.querySelector('.pa-vol-num');
    if(!r)return;
    const v=Math.max(0,Math.min(1,Math.round((parseFloat(r.value||0.75)+d)*100)/100));
    r.value=v;if(n)n.value=Math.round(v*100);
    r.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function pPick(){
    const L=pItems();if(!L.length)return;
    if(!pShown||!pCur||!L.includes(pCur)){pFocus(L[0],true);return;}
    try{pCur.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));}
    catch(e){pCur.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,cancelable:true}));}
  }
  document.addEventListener('keydown',e=>{
    if(!pModal()||e.ctrlKey||e.metaKey||e.altKey)return;
    const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    const k=e.code||e.key;
    if(k==='ArrowUp'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)pMove(-1);return;}
    if(k==='ArrowDown'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)pMove(1);return;}
    if(k==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();pVolume(-.05);return;}
    if(k==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();pVolume(.05);return;}
    if(k==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(typeof closePadAssignModal==='function')closePadAssignModal();return;}
    if(k==='Space'||k==='Enter'||k==='NumpadEnter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)pPick();}
  },true);
  {const m=$('padAssignModal');
   if(m)new MutationObserver(()=>{
     if(pModal()){if(!pShown||!document.querySelector('#padAssignList .pa-item'))setTimeout(pStart,20);else pPaint();}
     else{pShown=false;pCur=null;pPaint();}
   }).observe(m,{attributes:true,attributeFilter:['class']});}
  {const l=$('padAssignList');
   if(l)new MutationObserver(()=>{if(pModal()&&pShown)pPaint();}).observe(l,{childList:true});}
  document.addEventListener('pointerdown',e=>{if(e.pointerType&&pShown&&pModal()){pShown=false;pPaint();}},true);

  // ── 5) THE HATCH SCREEN (v0.2.254) ──
  //  Once NAME IT / AWESOME! are up: SPACE or ENTER is AWESOME! (the old default), SHIFT is NAME IT, and any arrow key
  //  brings up a ring over the two buttons so you can pick the other one (SPACE / ENTER then presses whatever the ring is
  //  on). A controller's A button is Space and its d-pad is the arrows, so it all works from a pad too.
  let eSel='ok',eShown=false,eWasReady=false;
  function ePaint(){
    const ok=$('erOk'),nm=$('erName');
    if(ok)ok.classList.toggle('er-cur',eShown&&eSel==='ok');
    if(nm)nm.classList.toggle('er-cur',eShown&&eSel==='name');
  }
  // the first arrow brings the ring up ON AWESOME (the default choice); each arrow after it swaps
  function eArrow(){
    if(!eShown){eShown=true;eSel='ok';ePaint();return;}
    eSel=eSel==='ok'?'name':'ok';ePaint();
  }
  function ePress(which){const b=$(which==='name'?'erName':'erOk');if(b)b.click();}
  document.addEventListener('keydown',e=>{
    const root=$('eggReveal');
    if(!root||!root.classList.contains('on')||!root.classList.contains('show-btns'))return;
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    const k=e.code||e.key;
    if(k==='ShiftLeft'||k==='ShiftRight'){e.preventDefault();e.stopImmediatePropagation();ePress('name');return;}
    if(/^Arrow/.test(k)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)eArrow();return;}
    if(k==='Space'||k==='Enter'||k==='NumpadEnter'||e.key===' '){
      e.preventDefault();e.stopImmediatePropagation();
      if(e.shiftKey){if(!e.repeat)ePress('name');return;}
      if(!e.repeat)ePress(eShown?eSel:'ok');
    }
  },true);

  // the ring belongs to one appearance of the buttons: watch the reveal node (js/50 rebuilds it) and start clean each time
  let eObs=null,eObsNode=null;
  function eWatch(){
    const r=$('eggReveal');
    if(r===eObsNode)return;
    eObsNode=r;
    if(eObs)try{eObs.disconnect();}catch(e){}
    eObs=null;
    if(!r)return;
    eObs=new MutationObserver(()=>{
      const ready=r.classList.contains('on')&&r.classList.contains('show-btns');
      if(ready&&!eWasReady){eWasReady=true;eShown=false;eSel='ok';ePaint();}
      else if(!ready&&eWasReady){eWasReady=false;eShown=false;eSel='ok';ePaint();}
    });
    eObs.observe(r,{attributes:true,attributeFilter:['class']});
  }
  eWatch();setInterval(eWatch,700);

  // ── 6) TYPING A BUDDY'S NAME WITH A CONTROLLER (v0.2.254) ──
  //  A gamepad can't use the phone/computer keyboard, so when one is connected the name card grows a letter grid:
  //  d-pad / stick walks it, A (Space) types, B (Escape) deletes and DONE saves. Touch and mouse players never see it.
  const PAD_ROWS=[
    ['A','B','C','D','E','F','G'],
    ['H','I','J','K','L','M','N'],
    ['O','P','Q','R','S','T','U'],
    ['V','W','X','Y','Z','0','1'],
    ['2','3','4','5','6','7','8'],
    ['9',' ','⌫','DONE']
  ];
  let pkPanel=null,pkCur=null,pShown2=false;
  const nmModal=()=>{const m=$('alienNameModal');return !!m&&m.classList.contains('open');};
  const nmInput=()=>$('bdyTagField');
  function padHas(){try{return [...(navigator.getGamepads?navigator.getGamepads():[])].some(p=>p&&p.connected);}catch(e){return false;}}
  function pkBuild(){
    if(pkPanel)return pkPanel;
    const host=$('anmEditSection');if(!host)return null;
    pkPanel=document.createElement('div');pkPanel.id='padKeys';
    PAD_ROWS.forEach(row=>row.forEach(ch=>{
      const b=document.createElement('button');b.type='button';b.textContent=ch;b.dataset.ch=ch;
      b.addEventListener('click',()=>pkType(ch));
      pkPanel.appendChild(b);
    }));
    host.appendChild(pkPanel);
    return pkPanel;
  }
  function pkType(ch){
    const inp=nmInput();if(!inp)return;
    if(ch==='DONE'){const s=$('alienNameSave');if(s)s.click();return;}
    if(ch==='⌫'){inp.value=(inp.value||'').slice(0,-1);}
    else if((inp.value||'').length<+inp.maxLength)inp.value=(inp.value||'')+ch;
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    try{if(typeof bdyTagRender==='function')bdyTagRender();}catch(e){}
    try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.25);if(S)k.tone(S,S.t,880,{type:'square',a:.004,d:.045});}}catch(e){}
  }
  function pkCells(){return pkPanel?[...pkPanel.querySelectorAll('button')]:[];}
  function pkPaint(){pkCells().forEach(b=>b.classList.toggle('pk-cur',pShown2&&b===pkCur));}
  function pkFocus(b,scroll){pkCur=b;pShown2=true;pkPaint();if(scroll&&b)try{b.scrollIntoView({block:'nearest'});}catch(e){}}
  function pkStart(){const L=pkCells();if(!L.length)return;pkFocus(L[0]);}
  function pkMove(dx,dy){
    const L=pkCells();if(!L.length)return;
    if(!pShown2||!pkCur||!L.includes(pkCur)){pkFocus(L[0]);return;}
    const r0=pkCur.getBoundingClientRect(),cx=r0.left+r0.width/2,cy=r0.top+r0.height/2;
    let best=null,bd=Infinity;
    L.forEach(b=>{if(b===pkCur)return;const r=b.getBoundingClientRect(),x=r.left+r.width/2-cx,y=r.top+r.height/2-cy;
      const along=dx?x*dx:y*dy,side=dx?Math.abs(y):Math.abs(x);
      if(along<4)return;const d=along+Math.max(0,side-r.height*.5)*2.2;
      if(d<bd){bd=d;best=b;}});
    if(best)pkFocus(best,true);
  }
  function pkPress(){const L=pkCells();if(!L.length)return;if(!pShown2||!pkCur){pkFocus(L[0]);return;}pkType(pkCur.dataset.ch);}
  document.addEventListener('keydown',e=>{
    if(!nmModal()||!pkPanel||pkPanel.offsetParent===null)return;
    const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    const k=e.code||e.key;
    if(/^Arrow/.test(k)){e.preventDefault();e.stopImmediatePropagation();
      const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[k];pkMove(d[0],d[1]);return;}
    if(k==='Escape'){e.preventDefault();e.stopImmediatePropagation();pkType('⌫');return;}
    if(k==='Space'||k==='Enter'||k==='NumpadEnter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)pkPress();}
  },true);
  {const m=$('alienNameModal');
   if(m)new MutationObserver(()=>{
     const open=m.classList.contains('open');
     if(open&&padHas()){
       const p=pkBuild();if(p){p.style.display='grid';pShown2=false;pkCur=null;setTimeout(pkStart,30);
         try{const inp=nmInput();if(inp)inp.blur();}catch(e){}}   // no OS keyboard over the grid
     }else if(pkPanel){pkPanel.style.display='none';pShown2=false;pkCur=null;pkPaint();}
   }).observe(m,{attributes:true,attributeFilter:['class']});}
  document.addEventListener('pointerdown',e=>{if(e.pointerType&&pShown2){pShown2=false;pkPaint();}},true);

  const ecss=document.createElement('style');ecss.textContent=`
#eggReveal .er-cur{outline:3px solid #f7ffb0;outline-offset:-3px;box-shadow:inset 0 0 22px 4px rgba(247,255,176,.35);border-radius:12px;}
#padKeys{display:none;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:.55rem;width:100%;}
#padKeys button{font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:.02em;padding:.45rem 0;border-radius:8px;
  border:1px solid #234;background:#0b141a;color:#9fe8c8;cursor:pointer;touch-action:manipulation;}
#padKeys button:nth-last-child(2){border-color:#4a2a2a;color:#ff9f9f;}
#padKeys button:last-child{border-color:#2a5a3a;color:#66ffb0;grid-column:span 2;}
#padKeys button.pk-cur{outline:0;box-shadow:inset 0 0 0 2px #7fffd0,inset 0 0 14px 2px rgba(0,255,170,.35);color:#fff;}
`;
  document.head.appendChild(ecss);

  const pcss=document.createElement('style');pcss.textContent=`
#padAssignList{padding:2px 6px;}
#padAssignList .pa-item.pa-cur{outline:0;box-shadow:inset 0 0 0 3px #7fffd0,inset 0 0 20px 3px rgba(0,255,170,.34);position:relative;z-index:2;}
#padAssignList .pa-item.pa-cur:not(.active){animation:paPulse 1.2s ease-in-out infinite;}
@keyframes paPulse{50%{box-shadow:inset 0 0 0 3px #ffffff,inset 0 0 26px 6px rgba(0,255,170,.52);}}
#padAssignList .pa-item.pa-bump{animation:paBump .25s ease-in-out;}
@keyframes paBump{30%{transform:translateY(-3px);}70%{transform:translateY(3px);}}`;
  document.head.appendChild(pcss);

  // ── 2) controllers → keys ──
  if(!navigator.getGamepads)return;
  const MAP={0:'Space',1:'Escape',2:'Enter',3:'Space',12:'ArrowUp',13:'ArrowDown',14:'ArrowLeft',15:'ArrowRight'};
  const KEY={Space:' ',Escape:'Escape',Enter:'Enter',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight'};
  const held={};   // code → {t: next repeat time}
  let polling=false;
  function send(type,code,repeat){
    const ev=new KeyboardEvent(type,{key:KEY[code],code,bubbles:true,cancelable:true,repeat:!!repeat});
    try{Object.defineProperty(ev,'fromPad',{value:true});}catch(e){}
    (document.activeElement&&document.activeElement!==document.body?document.activeElement:document).dispatchEvent(ev);
  }
  function poll(){
    const pads=navigator.getGamepads?navigator.getGamepads():[];let any=false;
    const want={};
    for(const p of pads){if(!p||!p.connected)continue;any=true;
      p.buttons.forEach((b,i)=>{if(MAP[i]&&(b.pressed||b.value>.5))want[MAP[i]]=1;});
      const ax=p.axes[0]||0,ay=p.axes[1]||0;
      if(ax<-.55)want.ArrowLeft=1;else if(ax>.55)want.ArrowRight=1;
      if(ay<-.55)want.ArrowUp=1;else if(ay>.55)want.ArrowDown=1;}
    const now=performance.now();
    Object.keys(want).forEach(c=>{
      if(!held[c]){held[c]={t:now+380};send('keydown',c,false);}
      else if(/^Arrow/.test(c)&&now>=held[c].t){held[c].t=now+130;send('keydown',c,true);}});   // arrows repeat while held
    Object.keys(held).forEach(c=>{if(!want[c]){delete held[c];send('keyup',c,false);}});
    if(any&&!document.hidden)requestAnimationFrame(poll);else{polling=false;Object.keys(held).forEach(c=>{delete held[c];send('keyup',c,false);});}
  }
  function start(){if(!polling){polling=true;requestAnimationFrame(poll);}}
  addEventListener('gamepadconnected',start);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){try{if([...navigator.getGamepads()].some(p=>p&&p.connected))start();}catch(e){}}});
  window.__padSend=send;   // test hook
})();
