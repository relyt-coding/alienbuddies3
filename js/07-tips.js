
// ══════════════════════════════════════════════
//  TIPS SYSTEM
// ══════════════════════════════════════════════
const MAX_TIPS = 10;
const TIPS_DATA = [
  {cost:25,           text:"Buying Alien Buddies increases your energy multiplier."},
  {cost:50000,        text:"If you want 1 big clicker button, click 'Edit Pads' and select 1 for a single drum pad."},
  {cost:250000,       text:"Change the volume of individual sounds in the Edit Pads menu."},
  {cost:12500000,     text:"You can save patterns you create on your sequencer to make an arrangement!"},
  {cost:125000000,    text:"You can save arrangements you create to make a song!"},
  {cost:1250000000,   text:"You can give your alien buddies a name by clicking on their square in the bunker!"},
  {cost:12500000000,  text:"Double click on the BPM number on the sequencer to manually enter any value between 50 and 250!"},
  {cost:125000000000, text:"Tap VELOCITY on the sequencer, then tap any lit step to change that note's volume!"},
  {cost:1250000000000, text:"Every note in the Piano Roll follows the song's KEY, so the notes you place always fit together. Change the key and the whole song moves with it!"},
  {cost:12500000000000,text:"Use the planet filter in the sound picker to see every sound from one planet. Mixing sounds from different planets is a great way to find your own style!"},
];   // each tip's tab in the Knowledge Vault: VAULT_TIP_TAB (js/68)

function tipCost(idx){
  let base;
  if(idx<TIPS_DATA.length){base=TIPS_DATA[idx].cost;}
  else{base=TIPS_DATA[TIPS_DATA.length-1].cost;for(let i=TIPS_DATA.length;i<=idx;i++)base*=10;}
  if(idx>=2)base=Math.round(base*Math.pow(3,idx-1));
  if(idx>=3)base=Math.round(base*100);
  return bump30(base);
}

function tipText(idx){
  if(idx<TIPS_DATA.length)return TIPS_DATA[idx].text;
  return 'Just the tip.';
}

function openTipReader(idx){
  document.getElementById('tipReaderNum').textContent='TIP '+(idx+1);
  document.getElementById('tipReaderText').textContent=tipText(idx);
  document.getElementById('tipReader').style.display='flex';
}
document.getElementById('tipReaderClose')&&document.getElementById('tipReaderClose').addEventListener('click',()=>{
  document.getElementById('tipReader').style.display='none';
});

function tipHave(i){return tipsSet.includes(i);}
// the cheapest tip you don't have yet (for the glow and the test bot)
function nextTipIdx(){for(let i=0;i<MAX_TIPS;i++)if(!tipHave(i)&&!(typeof vaultTipLocked==='function'&&vaultTipLocked(i)))return i;return -1;}   // (tips in a locked Vault tab wait)
function buyTip(i){
  const cost=tipCost(i);
  if(tipHave(i)||score<cost||i>=MAX_TIPS)return false;
  score-=cost;tipsSet.push(i);tipsSet.sort((a,b)=>a-b);tipsOwned=tipsSet.length;tipsMult*=1.5;
  return true;
}
function buildTipsList(){
  const list=document.getElementById('tipsList');
  if(!list)return;
  list.innerHTML='';
  // tips can be bought in any order: show everything up to the furthest one you own or can afford, plus one more
  let far=2;for(let i=0;i<MAX_TIPS;i++)if(tipHave(i)||score>=tipCost(i))far=Math.max(far,i+1);
  const show=Math.min(MAX_TIPS,far+1);
  for(let i=0;i<show;i++){
    const cost=tipCost(i);
    const owned=tipHave(i);
    const canBuy=!owned&&score>=cost;
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:.55rem .75rem;border-radius:10px;border:1px solid '+(owned?'#1a2a1a':canBuy?'#3a3a1a':'#1a1a1a')+';background:'+(owned?'#050f05':canBuy?'#0d0d04':'#060606')+';';
    const label=document.createElement('button');
    label.style.cssText=`font-family:'Bebas Neue',sans-serif;font-size:1.15rem;letter-spacing:.12em;padding:.35rem .85rem;border-radius:7px;border:1px solid ${owned?'#2a4a2a':canBuy?'#3a3a1a':'#1e1e1e'};background:${owned?'#0a1f0a':canBuy?'#1a1a04':'#111'};color:${owned?'#00cc66':canBuy?'#cccc44':'#555'};cursor:${owned?'pointer':'default'};touch-action:manipulation;`;
    label.textContent=(owned?'✓ ':'')+'TIP '+(i+1);
    if(owned){row.style.cursor='pointer';row.addEventListener('click',()=>openTipReader(i));}
    const right=document.createElement('div');
    if(owned){
      const badge=document.createElement('div');
      badge.style.cssText='font-family:Bebas Neue,sans-serif;font-size:.95rem;letter-spacing:.1em;color:#44aa55;';
      badge.textContent='×1.5 ACTIVE';
      right.appendChild(badge);
    } else {
      const btn=document.createElement('button');
      btn.style.cssText=`font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:.1em;padding:.32rem .8rem;border-radius:6px;border:1px solid ${canBuy?'#aaaa33':'#2a2a1a'};background:${canBuy?'#1a1a04':'transparent'};color:${canBuy?'#cccc44':'#444'};cursor:${canBuy?'pointer':'default'};touch-action:manipulation;`;
      btn.innerHTML=fmtJh(cost);
      if(canBuy)btn.addEventListener('click',()=>{
        if(!buyTip(i))return;
        showToast(`Tip purchased — your Tap Multiplier increased by ×1.5!`);
        playSfxTierUnlock(tipsOwned,0.4);
        buildTipsList();updateTipsLabel();renderUI();autoSave();
        openTipReader(i);                       // opens the tip you bought; cheaper ones you skipped stay locked
      });
      right.appendChild(btn);
    }
    row.appendChild(label);row.appendChild(right);
    list.appendChild(row);
  }
}

// TIPS button glows while the next tip is affordable and still unbought/unread
function updateTipsGlow(){
  const b=document.getElementById('tipsBtn');if(!b)return;
  let can=false;for(let i=0;i<MAX_TIPS;i++)if(!tipHave(i)&&score>=tipCost(i)&&!(typeof vaultTipLocked==='function'&&vaultTipLocked(i))){can=true;break;}
  b.classList.toggle('tips-glow',can);
}
function updateTipsLabel(){
  updateTipsGlow();
  const el=document.getElementById('tipsOwnedLabel');
  if(el)el.textContent=tipsOwned+' TIP'+(tipsOwned!==1?'S':'')+' PURCHASED'+(tipsOwned>0?' · ×'+formatMult(tipsMult):'');
}

// true while any full screen sits over the pads (shop, bunker, best buddy, matching, galaxies, the hatch…)
function overlayUp(){
  const bc=document.body.classList;
  if(['store-open','bunker-open','cockpit-open','bestbuddy-open','stats-open','ww-open','galaxy-intro','unlock-scene','intro-run'].some(k=>bc.contains(k)))return true;
  if(typeof newFileIntroRunning==='function'&&newFileIntroRunning())return true;
  const m=document.getElementById('matchingModal');if(m&&m.style.display==='flex')return true;
  const vm=document.getElementById('vaultModal');if(vm&&vm.classList.contains('open'))return true;
  if(bc.contains('vault-open'))return true;
  const st=document.getElementById('skillTreeModal');if(st&&st.classList.contains('open'))return true;
  const pa=document.getElementById('padAssignModal');if(pa&&pa.classList.contains('open'))return true;   // the pad sound list (v0.2.197)
  const er=document.getElementById('eggReveal');if(er&&er.classList.contains('on'))return true;
  return false;
}
// v0.2.196: an arrow only shows while its button is really on screen and nothing (Edit Pads, Settings, any page) covers it
function arrowTargetSeen(el){
  const r=el.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return false;
  const hit=document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),Math.min(innerHeight-1,Math.max(0,r.top+r.height/2)));
  return !!hit&&(hit===el||el.contains(hit)||hit.contains(el));
}
function updateOnboardingArrows(){
  // Arrows only belong to a running game — never on the home screen (they pointed at hidden buttons there)
  // …and never over another screen (shop, bunker, best buddy, minigames) — they used to peek through on top
  if(!document.body.classList.contains('game-active')||overlayUp()){
    ['arrowActivate','arrowShop'].forEach(id=>{const a=document.getElementById(id);if(a)a.style.display='none';});
    document.body.classList.remove('arrow-act');
    return;
  }
  // Arrow pointing at ACTIVATE button — shows at twice its price if the tracker is not yet active
  const arrowAct=document.getElementById('arrowActivate');
  const activateBtn=document.getElementById('drumTrackerActivateBtn');
  if(arrowAct){
    if(!drumTrackerActive&&score>=DRUM_TRACKER_COST*2&&activateBtn&&arrowTargetSeen(activateBtn)){
      // make room above the tracker so the arrow sits under the score instead of covering it
      // v0.2.125: the arrow points at the button from the side, so nothing on the screen has to move to make room for it
      const rect=activateBtn.getBoundingClientRect();
      if(!arrowAct._side){arrowAct._side=1;const svg=arrowAct.querySelector('svg'),w=document.createElement('span');w.style.cssText='display:block;transform:rotate(-90deg);margin:-6px 0;';
        svg.parentNode.insertBefore(w,svg);w.appendChild(svg);}
      arrowAct.style.display='flex';
      // v0.2.201: on computers (and once the word has ever run into the score) the arrow is always "ACTIVATE ➜" in one row,
      // so it never flips between the two layouts as the score's width changes
      const lb=arrowAct.firstElementChild,row=document.body.classList.contains('desktop-mode')||arrowAct._row;
      const setMode=r=>{arrowAct.style.flexDirection=r?'row':'column';arrowAct.style.gap=r?'16px':'';if(lb)lb.style.marginBottom=r?'0':'';};
      const place=()=>{const aw=arrowAct.offsetWidth||48,ah=arrowAct.offsetHeight||60;
        const _ap=document.querySelector('#gameView .app'),_cl=document.body.classList.contains('desktop-mode')&&_ap?_ap.getBoundingClientRect().left:0;   // (v0.2.207: never out over an open Bunker panel)
        if(rect.left-aw-(row||arrowAct._row?26:18)>_cl+4){arrowAct.style.left=(rect.left-aw-(arrowAct._row||row?26:18))+'px';
          // line the arrow itself (not arrow + label) up with the middle of the button
          const sp=arrowAct.querySelector('span'),cy=rect.top+rect.height/2;let top=cy-ah/2;arrowAct.style.top=top+'px';
          if(sp){const r=sp.getBoundingClientRect();top+=cy-(r.top+r.height/2);arrowAct.style.top=top+'px';}return true;}
        // no room to the left: the word on top, the arrow pointing DOWN at the button
        setMode(false);const sw=arrowAct.querySelector('span');if(sw)sw.style.transform='none';
        const aw2=arrowAct.offsetWidth||48,ah2=arrowAct.offsetHeight||60;
        arrowAct.style.left=Math.max(4,rect.left+rect.width/2-aw2/2)+'px';arrowAct.style.top=(rect.top-ah2-4)+'px';return false;};
      {const sw=arrowAct.querySelector('span');if(sw)sw.style.transform='rotate(-90deg)';}
      setMode(row);const beside=place();
      if(!row&&beside&&lb){const se=document.getElementById('scoreEl');
        if(se){let sr=null;try{const rg=document.createRange();rg.selectNodeContents(se);sr=rg.getBoundingClientRect();}catch(e){}if(!sr||!sr.width)sr=se.getBoundingClientRect();
          const lr=lb.getBoundingClientRect();
          if(lr.right>sr.left-10&&lr.left<sr.right+10&&lr.bottom>sr.top-4&&lr.top<sr.bottom+4){arrowAct._row=true;setMode(true);place();}}}
    } else {
      arrowAct.style.display='none';
    }
  }
  // Arrow pointing at SHOP button — shows at 50,000 pts if the shop still hasn't been opened
  const arrowShop=document.getElementById('arrowShop');
  // On desktop, point at the collapse/sidebar button instead
  const isDesktop=document.body.classList.contains('desktop-mode');
  const shopBtn=isDesktop?document.getElementById('collapseShopBtn'):document.getElementById('openStoreBtn');
  if(arrowShop){
    // v0.2.215: off for good: the Fusebox opens by itself the moment it's unlocked (js/89)
    if(false&&shopOpenCount===0&&score>=50000&&shopBtn&&!document.body.classList.contains('nav-locked')&&arrowTargetSeen(shopBtn)){
      const rect=shopBtn.getBoundingClientRect();
      arrowShop.style.display='flex';
      if(isDesktop){
        // Arrow points right toward the right-side collapse tab
        // Position just to the left of the shop tab
        arrowShop.style.right='58px';
        arrowShop.style.left='auto';
        arrowShop.style.top=(rect.top+rect.height/2-24)+'px';
        arrowShop.style.flexDirection='column';
        arrowShop.style.alignItems='center';
        // Rotate entire arrow div 90deg clockwise so it points right
        arrowShop.style.transform='rotate(90deg)';
        // Keep bounce animation on the rotated element (translateY becomes horizontal visually)
        const lbl=arrowShop.querySelector('div');
        if(lbl){lbl.style.marginTop='4px';lbl.style.marginRight='';lbl.style.order='';}
      } else {
        arrowShop.style.right='';
        arrowShop.style.transform='';
        arrowShop.style.flexDirection='column';
        arrowShop.style.alignItems='center';
        const svg=arrowShop.querySelector('svg');
        if(svg)svg.style.transform='';
        if(arrowShop._down&&!document.body.classList.contains('thumb-nav')){const w=arrowShop.querySelector('.arrow-flip');if(w&&svg){w.parentNode.insertBefore(svg,w);w.remove();}arrowShop._down=0;}
        const lbl=arrowShop.querySelector('div');
        if(lbl){lbl.style.marginTop='4px';lbl.style.marginRight='';lbl.style.order='';}
        arrowShop.style.left=(rect.left+rect.width/2-18)+'px';
        arrowShop.style.top=(rect.bottom+6)+'px';
        // v0.2.149: SHOP sits on the bottom row of upright phones, so the arrow points down at it from above
        if(document.body.classList.contains('thumb-nav')){
          arrowShop.style.flexDirection='column-reverse';
          if(svg&&!arrowShop._down){arrowShop._down=1;const w=document.createElement('span');w.className='arrow-flip';w.style.cssText='display:block;transform:rotate(180deg);';svg.parentNode.insertBefore(w,svg);w.appendChild(svg);}
          if(lbl){lbl.style.marginTop='';lbl.style.marginBottom='4px';}
          arrowShop.style.left=(rect.left+rect.width/2-(arrowShop.offsetWidth||36)/2)+'px';
          arrowShop.style.top=(rect.top-(arrowShop.offsetHeight||64)-8)+'px';
        }
      }
    } else {
      arrowShop.style.display='none';
    }
  }
}

function updateDrumTrackerOverlay(){
  const overlay=document.getElementById('drumTrackerOverlay');
  if(!overlay)return;
  overlay.style.display=drumTrackerActive?'none':'flex';
  document.body.classList.toggle('drum-overlay',!drumTrackerActive); // gives the ACTIVATE button room so it never covers the score text
  const btn=document.getElementById('drumTrackerActivateBtn');
  if(btn&&!drumTrackerActive){
    // v0.2.212: a bigger ACTIVATE with an energy strip; once you can afford it, it turns bright green and pulses (css: .act-btn)
    const canAfford=score>=DRUM_TRACKER_COST;
    btn.classList.toggle('can',canAfford);
    const bar=btn.querySelector('.ab-bar');if(bar){bar.firstChild.style.width=(Math.min(1,Math.max(0,score/DRUM_TRACKER_COST))*100).toFixed(1)+'%';bar.classList.toggle('full',canAfford);}
    const pr=document.getElementById('drumActPrice'),h=fmtJh(DRUM_TRACKER_COST);if(pr&&pr._h!==h){pr._h=h;pr.innerHTML=h;}
  }
}

setInterval(()=>{if(typeof drumTrackerActive!=='undefined'&&!drumTrackerActive&&document.body.classList.contains('game-active'))updateDrumTrackerOverlay();},250);   // v0.2.212: keep its bar filling
document.getElementById('drumTrackerActivateBtn')&&document.getElementById('drumTrackerActivateBtn').addEventListener('click',()=>{
  if(drumTrackerActive)return;
  if(score<DRUM_TRACKER_COST){showToast('Need '+fmtJh(DRUM_TRACKER_COST)+' to activate the drum tracker!');return;}
  score-=DRUM_TRACKER_COST;
  drumTrackerActive=true;
  playSfxTierUnlock(0);
  updateDrumTrackerOverlay();
  renderUI();autoSave();
});

document.getElementById('tipsBtn')&&document.getElementById('tipsBtn').addEventListener('click',()=>{
  if(typeof openVault==='function'){openVault();return;}   // v0.2.147: TIPS became the KNOWLEDGE VAULT (js/68)
  buildTipsList();
  document.getElementById('tipsModal').style.display='flex';
  const tipsScoreEl=document.getElementById('tipsModalScore');
  if(tipsScoreEl)tipsScoreEl.innerHTML=scoreHtml(score);
});
document.getElementById('tipsModalClose')&&document.getElementById('tipsModalClose').addEventListener('click',()=>{
  document.getElementById('tipsModal').style.display='none';
});
document.getElementById('tipsModal')&&document.getElementById('tipsModal').addEventListener('click',e=>{
  if(e.target===document.getElementById('tipsModal'))document.getElementById('tipsModal').style.display='none';
});

// v0.2.196: re-check the arrows twice a second too, so a page opening on top of them hides them straight away
setInterval(()=>{try{updateOnboardingArrows();}catch(e){}},500);
// v0.2.197: …and right after every tap, since a tap is what opens a page over them
document.addEventListener('pointerdown',()=>{setTimeout(()=>{try{updateOnboardingArrows();}catch(e){}},30);setTimeout(()=>{try{updateOnboardingArrows();}catch(e){}},200);},true);
