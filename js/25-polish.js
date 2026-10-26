// ══════════════════════════════════════════════
//  POLISH PASS (v0.2.82) — score milestone shimmer, unlock bursts, page-transition blur.
//  Purely cosmetic. Remove this <script> (and css/polish.css) from index.html to revert.
// ══════════════════════════════════════════════
(function(){
  var reduce=false;try{reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}

  // remember where the player last touched so unlock bursts come from the thing they pressed
  var lastPt={x:window.innerWidth/2,y:window.innerHeight/2,t:0};
  document.addEventListener('pointerdown',function(e){lastPt={x:e.clientX,y:e.clientY,t:Date.now()};},{passive:true,capture:true});

  function burst(color){
    if(reduce)return;
    var x=(Date.now()-lastPt.t<2500)?lastPt.x:window.innerWidth/2,y=(Date.now()-lastPt.t<2500)?lastPt.y:window.innerHeight/2;
    var N=IS_MOBILE_DEVICE_SAFE()?10:16,i,el;
    el=document.createElement('div');el.className='pl-ring';el.style.setProperty('--c',color);el.style.setProperty('--x',x+'px');el.style.setProperty('--y',y+'px');
    document.body.appendChild(el);setTimeout(function(){el.remove();},700);
    for(i=0;i<N;i++){
      var a=(Math.PI*2*i/N)+Math.random()*.4,d=50+Math.random()*70;
      el=document.createElement('div');el.className='pl-burst';
      el.style.setProperty('--c',color);el.style.setProperty('--x',x+'px');el.style.setProperty('--y',y+'px');
      el.style.setProperty('--dx',(Math.cos(a)*d).toFixed(1)+'px');el.style.setProperty('--dy',(Math.sin(a)*d).toFixed(1)+'px');
      document.body.appendChild(el);
      (function(n){setTimeout(function(){n.remove();},850);})(el);
    }
  }
  function IS_MOBILE_DEVICE_SAFE(){return typeof IS_MOBILE_DEVICE!=='undefined'&&IS_MOBILE_DEVICE;}

  // every purchase already calls flashBuy(colour): add the burst on top of it
  if(typeof window.flashBuy==='function'){
    var _fb=window.flashBuy;
    window.flashBuy=function(c){_fb.apply(this,arguments);try{burst(c||'#e8ff00');}catch(e){}};
  }

  // score milestone: each time the score gains another digit (≥1,000) the number shimmers + pops
  var lastTier=null,lastSlot=-2,msTimer=null;
  function checkScore(){
    if(typeof score==='undefined'||typeof activeSlot==='undefined')return;
    if(activeSlot!==lastSlot){lastSlot=activeSlot;lastTier=null;}
    var tier=score>=1000?Math.floor(Math.log10(score)):0;
    if(lastTier===null||tier<lastTier){lastTier=tier;return;}
    if(tier>lastTier){
      lastTier=tier;
      var el=document.getElementById('scoreEl');if(!el||reduce)return;
      el.classList.remove('pl-milestone');void el.offsetWidth;el.classList.add('pl-milestone');
      clearTimeout(msTimer);msTimer=setTimeout(function(){el.classList.remove('pl-milestone');},1300);
    }
  }
  if(typeof window.renderUI==='function'){
    var _ru=window.renderUI;
    window.renderUI=function(){var r=_ru.apply(this,arguments);try{checkScore();}catch(e){}return r;};
  }

  // phone page transitions: soft blur pulse whenever the page (home / shop / bunker / galaxies) changes
  (function(){
    var veil=document.createElement('div');veil.id='plNavBlur';document.body.appendChild(veil);
    var sig='';
    function cur(){var b=document.body.classList,m=document.getElementById('skillTreeModal');return (m&&m.classList.contains('open'))?3:b.contains('store-open')?1:b.contains('bunker-open')?2:0;}
    function check(){
      if(reduce||document.body.classList.contains('desktop-mode')||!document.body.classList.contains('game-active'))return;
      var s=String(cur());if(s===sig)return;
      if(sig!==''){veil.classList.remove('go');void veil.offsetWidth;veil.classList.add('go');}
      sig=s;
    }
    new MutationObserver(check).observe(document.body,{attributes:true,attributeFilter:['class']});
    var tm=document.getElementById('skillTreeModal');tm&&new MutationObserver(check).observe(tm,{attributes:true,attributeFilter:['class']});
  })();
})();
