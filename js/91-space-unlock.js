// ══════════════════════════════════════════════
//  SPACE = UNLOCK THE NEXT THING (v0.2.210, computers)
//  Press the space bar and the game presses the cheapest thing on screen you can afford right now: the dot trackers'
//  ACTIVATE, the egg (level-1 egg / corner egg), the sequencer teaser, the fusebox, the disco ball.
//  Nothing affordable yet: the cheapest one on screen gives its usual "not yet" shake.
//  On the hatch screen Space taps the egg (and once it's out, presses AWESOME!). v0.2.215: the Vault card counts too;
//  with nothing affordable and a matching-game level ready, Space starts it; on its win screen Space claims the prize.
//  Each thing is pressed through its own normal handler (pointerdown or click), so it behaves exactly like a tap.
//  Minigames that use Space themselves (Buddy Race, Planet Hop) are left alone, and so are text boxes.
// ══════════════════════════════════════════════
(function(){
  const B=document.body.classList,$=id=>document.getElementById(id);
  const vis=e=>{if(!e||!e.isConnected)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||+s.opacity<.2)return false;
    const r=e.getBoundingClientRect();return r.width>4&&r.height>4&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;};
  const press=(e,how)=>{if(how==='down')e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'mouse',button:0}));else e.click();};
  // [element, cost, how it's pressed]
  function candidates(){
    const L=[],n=typeof totalAliens==='number'?totalAliens:0,aCost=typeof alienCost==='function'?alienCost(n):Infinity;
    const add=(el,cost,how)=>{if(vis(el)&&isFinite(cost))L.push({el,cost,how});};
    if(typeof drumTrackerActive!=='undefined'&&!drumTrackerActive)add($('drumTrackerActivateBtn'),DRUM_TRACKER_COST,'click');
    if(typeof seqTrackerActive!=='undefined'&&!seqTrackerActive)add($('seqTrackerActivateBtn'),typeof SEQ_TRACKER_COST!=='undefined'?SEQ_TRACKER_COST:Infinity,'click');
    // (v0.2.218: drum pads are NOT on Space: each new pad is bought with its own hotkey, so it's a choice)
    add($('padEgg'),aCost,'down');
    add(document.querySelector('.cornerEgg'),aCost,'down');
    if(typeof drum!=='undefined'&&drum.seqTracks===0)add($('seqTeaser'),typeof seqTrackCost==='function'?seqTrackCost(0):Infinity,'down');
    add($('fuseTeaser'),typeof FUSE_COST!=='undefined'?FUSE_COST:Infinity,'click');
    add($('partyTeaser'),typeof PARTY_LADDER!=='undefined'?PARTY_LADDER[0].cost:Infinity,'click');
    // v0.2.215: the Vault card in the Fusebox counts even when it's scrolled out of view
    const vc=$('vaultBuyCard');
    if(vc&&vc.offsetParent!==null&&typeof vaultUnlocked!=='undefined'&&!vaultUnlocked&&typeof VAULT_COST!=='undefined')L.push({el:vc,cost:VAULT_COST,how:'click'});
    // v0.2.224: one unlock per press, and a big unlock (sequencer, Fusebox, disco ball, Vault) goes before an egg
    L.forEach(c=>{c.big=/^(seqTeaser|fuseTeaser|partyTeaser|vaultBuyCard)$/.test(c.el.id||'');});
    return L.sort((a,b)=>a.cost-b.cost);
  }
  // v0.2.223: the press that closes the hatch screen never also starts the matching game: it waits for the NEXT press
  let hatchClosedAt=-1e9;
  document.addEventListener('egg-reveal-closed',()=>{hatchClosedAt=performance.now();});
  document.addEventListener('keydown',e=>{
    if(e.code!=='Space'||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
    const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    if(!B.contains('game-active'))return;
    if(document.querySelector('#raceOverlay.on')||B.contains('cockpit-open'))return;   // minigames use Space themselves
    // the hatch screen: tap the egg, then AWESOME!
    const er=$('eggReveal');
    if(er&&er.classList.contains('on')){e.preventDefault();
      if(er.classList.contains('show-btns')){const ok=$('erOk');ok&&ok.click();}else{const cv=$('erCanvas');cv&&press(cv,'down');}
      return;}
    // v0.2.215: the matching game: on the win screen Space claims the prize (during a round it does nothing)
    const mm=$('matchingModal');
    if(mm&&getComputedStyle(mm).display!=='none'){e.preventDefault();
      const mv=$('matchVictory'),cl=$('matchVictoryClose');
      if(mv&&getComputedStyle(mv).display!=='none'&&cl)cl.click();
      return;}
    if(B.contains('intro-run')||(typeof overlayUp==='function'&&overlayUp()))return;
    // something is already unlocking (the egg lamp warming up, the Fusebox switch flipping): wait for it
    if(document.querySelector('.cornerEgg.lit,#fuseTeaser.flipped')){e.preventDefault();return;}
    const L=candidates();
    const can=L.filter(c=>typeof score==='number'&&score>=c.cost);
    const afford=can.find(c=>c.big)||can[0];
    // nothing to unlock right now, but a matching-game level is ready: play it
    const mg=$('matchingGameBtn');
    // v0.2.220: only once the Bunker is unlocked AND showing (its button visible on screen, the first-buddy cutscene over)
    const mgReady=mg&&vis(mg)&&!B.contains('nav-locked')&&!B.contains('buddy-hold')&&typeof totalAliens==='number'&&totalAliens>=1;
    if(!afford&&mgReady&&performance.now()-hatchClosedAt>700&&!document.querySelector('.cornerEgg.lit')&&mg.classList.contains('match-glow')&&typeof openMatchingGame==='function'){e.preventDefault();openMatchingGame();return;}
    if(!L.length)return;
    e.preventDefault();   // (also stops Space from pressing whatever button has focus)
    const pick=afford||L[0];   // nothing affordable: the cheapest shakes "not yet"
    press(pick.el,pick.how);
  });
})();
