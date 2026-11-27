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
