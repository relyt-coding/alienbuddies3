// ══════════════════════════════════════════════
//  SWIPE NAV (phone layout): HOME → SHOP → BUNKER → HOME … a 3-page carousel
//  swipe LEFT = next page (home→shop→bunker→home), swipe RIGHT = previous page
// ══════════════════════════════════════════════
(function(){
  var VIEW_IDS=['gameView','storeView','bunkerView'];
  var busy=false,sx=0,sy=0,st=0,tracking=false;
  function cur(){
    var b=document.body.classList;
    return b.contains('store-open')?1:b.contains('bunker-open')?2:0;
  }
  function blocked(t){
    if(document.body.classList.contains('desktop-mode'))return true;
    if(!document.body.classList.contains('game-active'))return true;
    if(!t||!t.closest)return false;
    // don't steal swipes from controls that use their own horizontal drags, or from pop-ups
    if(t.closest('input,select,textarea,.pad-area,.seq-area,#seqFullModal,#autoTiersCol,#padCountSelector,[id$="Modal"],.modal,.modal-overlay,#settingsBox,#skillTreeView'))return true;
    var pops=document.querySelectorAll('[id$="Modal"]');
    for(var i=0;i<pops.length;i++){var s=pops[i];if(s.classList.contains('open')||(s.style.display&&s.style.display!=='none'&&s.style.display!==''))return true;}
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
    void toEl.offsetWidth;
    toEl.style.transition='';
    // leaving page exits the opposite way
    fromEl.style.transform='translateX('+(dir*100)+'%)';
    toEl.style.transform='translateX(0)';
    // switch the real state (other code relies on these body classes)
    if(from===1)closeStore();else if(from===2)closeBunker();
    if(target===1)openStore();else if(target===2)openBunker();
    setTimeout(function(){
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
      if(vv.scale<=1.08){b.style.display='none';return;}
      b.style.display='block';
      b.style.transform='translate('+(vv.offsetLeft+vv.width/2)+'px,'+(vv.offsetTop+10)+'px) scale('+(1/vv.scale)+') translateX(-50%)';
    }
    vv.addEventListener('resize',place);vv.addEventListener('scroll',place);place();
  })();
  window.swipeNavGo=go;
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
    if(dx<0)go((c+1)%3,-1);else go((c+2)%3,1);
  },{passive:true});
  document.addEventListener('touchcancel',function(){tracking=false;},{passive:true});
})();
