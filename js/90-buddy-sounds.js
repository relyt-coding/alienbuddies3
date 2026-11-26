// ══════════════════════════════════════════════
//  BUDDY SOUNDS (v0.2.208): your alien buddies are where the sounds come from
//  • Every buddy brings one sound when it hatches: buddy 1 = Clap, buddy 2 = Rimshot … in EXTRA_SOUNDS_ORDER
//    (js/01; past the end of the list it starts over). Stored as alienData[i].snd so it survives a later change.
//  • The sound list for pads / sequencer (`unlockedSounds`) = the pad sounds (hi-hat, kick, snare, trap kick with
//    the 4th pad) + every buddy's sound + planet sounds. The Fusebox's SOUND LIBRARY card is gone.
//    drum.extraSounds = how many different buddy sounds you have, so each one is still ×1.2 tap power (js/02).
//  • A buddy SINGS its sound: twice right after it hatches, whenever you tap it on the hatch screen, when you tap it
//    floating across the screen (unless the tap is on a pad or any other button: that press wins), and when you tap
//    it in its Bunker card or in the Alien Designer.
//  • Later: changing a buddy's sound is a future unlock (until then each keeps its hatch sound), and eggs found on
//    planets / continents could hatch buddies that bring that planet's sounds.
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList;
  function defaultSound(i){const L=EXTRA_SOUNDS_ORDER;return L[((i%L.length)+L.length)%L.length];}
  window.buddySoundOf=function(i){
    const a=typeof alienData!=='undefined'?alienData[i]:null;if(!a)return null;
    if(!a.snd||!SOUND_MAP[a.snd])a.snd=defaultSound(i);
    return a.snd;
  };
  function buddySoundSet(){
    const out=[],n=typeof totalAliens==='number'?totalAliens:0;
    for(let i=0;i<n;i++){const s=buddySoundOf(i);if(s&&!out.includes(s))out.push(s);}
    return out;
  }
  window.buddySoundSet=buddySoundSet;
  // the sound list: pad sounds + buddy sounds (+ planets, chops… from the wrapped original)
  if(typeof unlockedSounds==='function'){
    const _u=unlockedSounds;
    unlockedSounds=function(){
      const own=buddySoundSet(),extra=new Set(EXTRA_SOUNDS_ORDER);
      let a=_u.apply(this,arguments).filter(id=>!extra.has(id)||own.includes(id));
      if(typeof drum!=='undefined'&&drum.pads<4)a=a.filter(id=>id!=='trapkick');   // trap kick still comes with the 4th pad
      own.forEach(id=>{if(!a.includes(id))a.push(id);});
      return a;
    };
  }
  // keep drum.extraSounds = the number of different buddy sounds (the ×1.2 each in tap power + the score breakdown)
  function sync(){
    if(!B.contains('game-active')||typeof drum==='undefined')return;
    const n=Math.min(EXTRA_SOUNDS_ORDER.length,buddySoundSet().filter(id=>EXTRA_SOUNDS_ORDER.includes(id)).length);
    if(drum.extraSounds!==n){drum.extraSounds=n;if(typeof updateSoundboardUnlocked==='function')updateSoundboardUnlocked();}
    const c=document.getElementById('soundLibCard');if(c&&c.style.display!=='none')c.style.display='none';
  }
  setInterval(sync,500);
  if(typeof startGame==='function'){const sg=window.startGame;window.startGame=function(){const r=sg.apply(this,arguments);sync();return r;};}

  // ── a buddy sings: its sound, `times` times ──
  window.buddyVoice=function(i,times,gap){
    const id=buddySoundOf(i);if(!id||!SOUND_MAP[id])return;
    let c=null;try{c=typeof getCtx==='function'?getCtx():null;}catch(e){}
    const t0=c?c.currentTime+.03:0,G=gap||.42;
    for(let k=0;k<(times||1);k++){try{playSound(id,.95,c?t0+k*G:undefined);}catch(e){}
      setTimeout(()=>sing(i),k*G*1000+30);}   // v0.2.211: the mouth opens and it hops with every note
  };
  // v0.2.211: singing look. js/46 drawBuddy reads BUDDY_SING[i] (mouth + hop) wherever the buddy is drawn every frame;
  //   a floating buddy's sprite is only redrawn when it turns, so it's repainted for the half second, plus a CSS squash-hop.
  function sing(i){
    if(window.BUDDY_SING)BUDDY_SING[i]=performance.now();
    if(typeof bouncers==='undefined')return;
    bouncers.forEach(b=>{if(b.idx!==i||!b.el)return;
      const art=b.el.querySelector('.bouncer-buddy')||b.el.firstElementChild;
      if(art){art.classList.remove('bd-sing');void art.offsetWidth;art.classList.add('bd-sing');setTimeout(()=>art.classList.remove('bd-sing'),500);}
      if(typeof paintBouncerBuddy!=='function')return;
      const end=performance.now()+620;(function f(){if(performance.now()>end){paintBouncerBuddy(b);return;}paintBouncerBuddy(b);requestAnimationFrame(f);})();});
  }
  window.buddySingNow=sing;

  // ── tapping a buddy floating across the screen ──
  // #alienLayer lets taps through, so we look at what's really under the finger: any button / pad / clickable thing wins.
  function clickable(el){
    for(let e=el;e&&e!==document.body&&e!==document.documentElement;e=e.parentElement){
      if(e.matches&&e.matches('button,a,input,select,textarea,label,canvas,[role=button],.pad,.seq-step,[onclick]'))return true;
      try{if(getComputedStyle(e).cursor==='pointer')return true;}catch(_){}
    }
    return false;
  }
  document.addEventListener('pointerdown',e=>{
    if(!B.contains('game-active')||typeof bouncers==='undefined'||!bouncers.length)return;
    if(B.contains('stats-open')||B.contains('tree-open')||B.contains('intro-run')||B.contains('roll-full')||B.contains('vox-full'))return;
    if(!B.contains('desktop-mode')&&(B.contains('store-open')||B.contains('bunker-open')||B.contains('vault-open')))return;
    if(typeof overlayUp==='function'&&overlayUp())return;
    if(clickable(e.target))return;
    const x=e.clientX,y=e.clientY;
    for(const b of bouncers){
      const el=b.el;if(!el||el.classList.contains('hatching'))continue;
      const r=el.getBoundingClientRect();if(!r.width)continue;
      if(x>=r.left-8&&x<=r.right+8&&y>=r.top-8&&y<=r.bottom+8){
        buddyVoice(b.idx,1);
        break;
      }
    }
  });

  // ── its card in the Bunker ──
  const prev=document.getElementById('alienNamePreview');
  if(prev){prev.style.cursor='pointer';prev.addEventListener('click',()=>{if(typeof alienProfileIdx==='number'){buddyVoice(alienProfileIdx,1);}});}   // (the card's buddy opens its mouth and hops: js/46)

  // ── the Alien Designer: a tap (not a spin-drag) on the buddy ──
  let down=null;
  document.addEventListener('pointerdown',e=>{if(e.target&&e.target.id==='bdCanvas')down={x:e.clientX,y:e.clientY,t:performance.now()};},true);
  document.addEventListener('pointerup',e=>{
    if(!down||!e.target||e.target.id!=='bdCanvas'){down=null;return;}
    const d=Math.hypot(e.clientX-down.x,e.clientY-down.y),dt=performance.now()-down.t;down=null;
    const i=typeof bdCurrentIdx==='function'?bdCurrentIdx():null;
    if(d<8&&dt<450&&i!=null)buddyVoice(i,1);
  },true);

  const css=document.createElement('style');css.textContent=`
.bd-sing{animation:bdSing .45s cubic-bezier(.3,1.6,.5,1);}
@keyframes bdSing{0%{transform:none;}18%{transform:translateY(2px) scale(1.16,.86);}48%{transform:translateY(-9px) scale(.92,1.1);}78%{transform:translateY(0) scale(1.06,.95);}100%{transform:none;}}`;
  document.head.appendChild(css);
})();
