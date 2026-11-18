// ══════════════════════════════════════════════
//  THE WHOLE BUNKER SCROLLS (v0.2.181)
//  Before: only the buddy grid scrolled, inside a fixed-height bunker. Now the bunker page itself scrolls
//  (stats, grid, progress, and room for the coming incubators), and the games buttons ride along in a
//  dock that floats at the bottom of the screen while you scroll and settles into place at the end:
//    • before the Cockpit: MATCHING GAME (+ ⭐ BEST BUDDY once built)
//    • after the Cockpit opens: 🚀 GAMES (+ ⭐ BEST BUDDY); the Matching Game moves inside the Cockpit (js/44 mgRefresh)
//  The dock is position:sticky, so nothing is measured in JS and old Safari (iOS 15) handles it natively.
//  The grid keeps its pinch-to-zoom (js/12): its wrapper still clips sideways, it just isn't a scroll box any more.
// ══════════════════════════════════════════════
(function(){
  const $=id=>document.getElementById(id);
  const body=document.querySelector('#bunkerView .bunker-body'),prog=document.querySelector('#bunkerView .bunker-progress-wrap');
  if(!body||!prog)return;
  const dock=document.createElement('div');dock.id='bunkerDock';
  prog.parentNode.insertBefore(dock,prog);
  // whatever js/44 and js/52 put between the grid and the progress bar moves into the dock, in the same order
  ['mgList','bbOpenBtn','mgGamesBtn'].forEach(id=>{const el=$(id);if(el&&el.parentNode===body)dock.appendChild(el);});
  // js/44 puts the Matching Game back "before the GAMES button" when the Cockpit isn't open: that is inside the dock now
  // an empty dock (nothing unlocked yet / everything moved to the Cockpit) takes no room
  function tidy(){const vis=[...dock.children].some(c=>c.offsetParent!==null&&getComputedStyle(c).display!=='none'&&c.offsetHeight>0);dock.classList.toggle('empty',!vis);}
  new MutationObserver(tidy).observe(dock,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  setTimeout(tidy,0);
  // opening the bunker always starts at the top
  new MutationObserver(()=>{if(document.body.classList.contains('bunker-open')&&!body._wasOpen){body.scrollTop=0;tidy();}body._wasOpen=document.body.classList.contains('bunker-open');}).observe(document.body,{attributes:true,attributeFilter:['class']});
})();
