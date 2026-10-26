// ══════════════════════════════════════════════
//  SWIPE NAV (phone layout): left → right order is  BUNKER · HOME · SHOP · (EXPLORE THE GALAXIES, once unlocked)
//  swipe LEFT = the page to the right, swipe RIGHT = the page to the left (no wrap-around).
//  Little dots at the bottom show where you are, in that same order.
// ══════════════════════════════════════════════
(function(){
  var VIEW_IDS=['gameView','storeView','bunkerView','skillTreeModal'];
  var busy=false,sx=0,sy=0,st=0,tracking=false;
  // page ids: 0 home, 1 shop, 2 bunker, 3 galaxies. Screen order left → right:
  function pageOrder(){return (typeof skillTreeUnlocked!=='undefined'&&skillTreeUnlocked)?[2,0,1,3]:[2,0,1];}
  function pageCount(){return pageOrder().length;}
  function cur(){
    var b=document.body.classList,m=document.getElementById('skillTreeModal');
    if(m&&m.classList.contains('open'))return 3;
    return b.contains('store-open')?1:b.contains('bunker-open')?2:0;
  }
  function blocked(t){
    if(document.body.classList.contains('desktop-mode'))return true;
    if(!document.body.classList.contains('game-active'))return true;
    if(!t||!t.closest)return false;
    // don't steal swipes from controls that use their own horizontal drags, or from pop-ups
    var treeOpen=!!document.querySelector('#skillTreeModal.open');
    if(treeOpen){
      // the galaxy map pans with one finger, so only its header strip (or the very edge of the screen) swipes pages
      if(t.closest('#stDetailPop'))return true;
      return !t.closest('#skillTreeHeader');
    }
    if(t.closest('input,select,textarea,.pad-area,.seq-area,#seqFullModal,#autoTiersCol,#padCountSelector,[id$="Modal"],.modal,.modal-overlay,#settingsBox'))return true;
    var pops=document.querySelectorAll('[id$="Modal"]');
    for(var i=0;i<pops.length;i++){var s=pops[i];if(s.id==='skillTreeModal')continue;if(s.classList.contains('open')||(s.style.display&&s.style.display!=='none'&&s.style.display!==''))return true;}
    return false;
  }
  function go(target,dir){ // dir -1 = swiped left (new page enters from the right), +1 = swiped right
    var from=cur();
    if(target===from||busy)return;
    busy=true;
    var fromEl=document.getElementById(VIEW_IDS[from]),toEl=document.getElementById(VIEW_IDS[target]);
    // start the incoming page just off-screen on the side it should come from
    toEl.style.transition='none';
    toEl.style.transform='translateX('+(-dir*100)+'%)';
    if(target===3&&typeof openSkillTree==='function')openSkillTree(); // the map is a fixed overlay: show it first so it can slide in
    void toEl.offsetWidth;
    toEl.style.transition='';
    // leaving page exits the opposite way
    fromEl.style.transform='translateX('+(dir*100)+'%)';
    toEl.style.transform='translateX(0)';
    // switch the real state (other code relies on these body classes)
    closeStore();closeBunker();
    if(target===1)openStore();else if(target===2)openBunker();
    wakeDots();
    setTimeout(function(){
      if(from===3&&typeof closeSkillTree==='function')closeSkillTree();
      // snap every page to its resting spot with NO animation (the page that just left would otherwise
      // visibly fly back across the screen to its parking position)
      VIEW_IDS.forEach(function(id){var e=document.getElementById(id);e.style.transition='none';e.style.transform='';});
      void document.body.offsetWidth;
      VIEW_IDS.forEach(function(id){document.getElementById(id).style.transition='';});
      busy=false;
    },460);
  }
  // pinch-zoomed in? snap back to normal zoom whenever the page changes (swipe or the SHOP / BUNKER buttons).
  // iOS Safari only re-reads the viewport when the <meta> tag itself is replaced, so swap in a locked copy, then restore.
  var NORMAL_VP='width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover';
  var LOCK_VP='width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  function zoomScale(){var vv=window.visualViewport;return vv?vv.scale:1;}
  function swapViewport(content){
    var old=document.querySelector('meta[name=viewport]');
    var m=document.createElement('meta');m.name='viewport';m.content=content;
    if(old&&old.parentNode)old.parentNode.replaceChild(m,old);else document.head.appendChild(m);
  }
  var touchesDown=0;
  document.addEventListener('touchstart',function(e){touchesDown=e.touches.length;},{passive:true,capture:true});
  document.addEventListener('touchend',function(e){touchesDown=e.touches.length;},{passive:true,capture:true});
  document.addEventListener('touchcancel',function(){touchesDown=0;},{passive:true,capture:true});
  function editViewport(content){ // same <meta>, new content (works on some iOS versions where replacing doesn't)
    var m=document.querySelector('meta[name=viewport]');
    if(m)m.setAttribute('content',content);else swapViewport(content);
  }
  // iOS ignores viewport changes while a finger is still down, and some versions only react to one of the two
  // tricks (replace the tag / edit the tag), so keep trying with alternating methods until the zoom is gone.
  var zoomBusy=false;
  function resetPageZoom(tries){
    tries=tries||0;
    if(zoomScale()<=1.01){zoomBusy=false;return;}
    if(tries>5){zoomBusy=false;return;}
    if(touchesDown>0){setTimeout(function(){resetPageZoom(tries);},120);return;}
    zoomBusy=true;
    try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}catch(e){}
    if(tries%2===0)swapViewport(LOCK_VP);else editViewport(LOCK_VP);
    try{window.scrollTo(0,0);}catch(e){}
    setTimeout(function(){
      if(tries%2===0)swapViewport(NORMAL_VP);else editViewport(NORMAL_VP);
      setTimeout(function(){
        if(zoomScale()>1.01)resetPageZoom(tries+1);else zoomBusy=false;
      },300);
    },260+tries*60);
  }
  window.resetPageZoom=resetPageZoom;
  (function(){
    var last=cur();
    new MutationObserver(function(){var c=cur();if(c!==last){last=c;resetPageZoom();}}).observe(document.body,{attributes:true,attributeFilter:['class']}); // (still tries a reset when the SHOP / BUNKER buttons change the page)
  })();
  // safety net: while the page is zoomed in, a small RESET ZOOM button follows the visible area
  (function(){
    var vv=window.visualViewport;if(!vv)return;
    var b=document.createElement('button');b.id='zoomResetBtn';b.type='button';b.textContent='⤢ ZOOM OUT TO SWIPE';b.style.display='none';
    document.body.appendChild(b);
    b.addEventListener('click',function(e){e.stopPropagation();resetPageZoom();});
    b.addEventListener('touchend',function(e){e.stopPropagation();},{passive:true});
    function place(){
      if(vv.scale<=1.08||document.querySelector('#seqFullModal.open')){b.style.display='none';return;}
      b.style.display='block';
      b.style.transform='translate('+(vv.offsetLeft+vv.width/2)+'px,'+(vv.offsetTop+10)+'px) scale('+(1/vv.scale)+') translateX(-50%)';
    }
    vv.addEventListener('resize',place);vv.addEventListener('scroll',place);place();
  })();
  // the BACK buttons also wait until you have zoomed out
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest&&e.target.closest('#closeStoreBtn,#closeBunkerBtn');
    if(t&&zoomScale()>1.05){e.stopImmediatePropagation();e.preventDefault();}
  },true);
  // Pinch-zoom is only allowed inside the full-screen sequencer; everywhere else it is blocked.
  function inSeqFull(t){return !!(t&&t.closest&&t.closest('#seqFullModal.open'))||!!document.querySelector('#seqFullModal.open');}
  document.addEventListener('touchmove',function(e){
    if(e.touches.length>1&&!inSeqFull(e.target))e.preventDefault();
  },{passive:false,capture:true});
  ['gesturestart','gesturechange','gestureend'].forEach(function(n){
    document.addEventListener(n,function(e){if(!inSeqFull(e.target))e.preventDefault();},{passive:false,capture:true});
  });
  window.swipeNavGo=go;
  // ── page dots (phone): fade in on any swipe / page change, dissolve after 5 s of no swiping ──
  var dotsEl=document.createElement('div');dotsEl.id='pageDots';dotsEl.setAttribute('aria-hidden','true');document.body.appendChild(dotsEl);
  var dotsTimer=null;
  function paintDots(){
    var ord=pageOrder(),n=ord.length,c=ord.indexOf(cur());
    if(dotsEl.children.length!==n){dotsEl.innerHTML='';for(var i=0;i<n;i++){var d=document.createElement('span');d.className='pd';dotsEl.appendChild(d);}}
    for(var j=0;j<dotsEl.children.length;j++)dotsEl.children[j].classList.toggle('on',j===c);
  }
  function wakeDots(){
    paintDots();dotsEl.classList.add('show');
    if(dotsTimer)clearTimeout(dotsTimer);
    dotsTimer=setTimeout(function(){dotsEl.classList.remove('show');},5000);
  }
  window.refreshPageDots=function(){paintDots();};
  var _dsig='';new MutationObserver(function(){var sg=cur()+'|'+document.body.classList.contains('game-active');if(sg===_dsig)return;_dsig=sg;if(document.body.classList.contains('game-active')&&!document.body.classList.contains('desktop-mode'))wakeDots();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  var tm=document.getElementById('skillTreeModal');
  tm&&new MutationObserver(function(){paintDots();}).observe(tm,{attributes:true,attributeFilter:['class']});
  document.addEventListener('touchmove',function(e){
    if(tracking&&e.touches.length===1&&Math.abs(e.touches[0].clientX-sx)>18)wakeDots();
  },{passive:true});
  document.addEventListener('touchstart',function(e){
    tracking=false;
    if(e.touches.length!==1||busy||blocked(e.target))return;
    if(zoomScale()>1.05)return; // pinch-zoomed in: swiping pages is off until you zoom back out
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now();tracking=true;
  },{passive:true});
  document.addEventListener('touchend',function(e){
    if(!tracking)return;tracking=false;
    var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.6||Date.now()-st>900)return;
    var c=cur();
    var ord=pageOrder(),pos=ord.indexOf(c);
    if(pos<0)return;
    if(dx<0){if(pos<ord.length-1)go(ord[pos+1],-1);}
    else if(pos>0)go(ord[pos-1],1);
  },{passive:true});
  document.addEventListener('touchcancel',function(){tracking=false;},{passive:true});
})();
