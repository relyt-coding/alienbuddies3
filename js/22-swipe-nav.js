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
    if(t.closest('input,select,textarea,.pad-area,#autoTiersCol,#padCountSelector,[id$="Modal"],.modal,.modal-overlay,#settingsBox,#skillTreeView'))return true;
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
      VIEW_IDS.forEach(function(id){var e=document.getElementById(id);e.style.transform='';e.style.transition='';});
      busy=false;
    },460);
  }
  window.swipeNavGo=go;
  document.addEventListener('touchstart',function(e){
    tracking=false;
    if(e.touches.length!==1||busy||blocked(e.target))return;
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
