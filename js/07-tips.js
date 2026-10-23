
// ══════════════════════════════════════════════
//  TIPS SYSTEM
// ══════════════════════════════════════════════
const MAX_TIPS = 10;
const TIPS_DATA = [
  {cost:25,           text:"Buying Alien Buddies increases your point multiplier."},
  {cost:50000,        text:"If you want 1 big clicker button, click 'Edit Pads' and select 1 for a single drum pad."},
  {cost:250000,       text:"Change the volume of individual sounds in the Edit Pads menu."},
  {cost:12500000,     text:"You can save patterns you create on your sequencer to make an arrangement!"},
  {cost:125000000,    text:"You can save arrangements you create to make a song!"},
  {cost:1250000000,   text:"You can give your alien buddies a name by clicking on their square in the bunker!"},
  {cost:12500000000,  text:"Double click on the BPM number on the sequencer to manually enter any value between 50 and 250!"},
];

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

function buildTipsList(){
  const list=document.getElementById('tipsList');
  if(!list)return;
  list.innerHTML='';
  const show=Math.min(MAX_TIPS,Math.max(tipsOwned+2,3));
  for(let i=0;i<Math.min(show,20);i++){
    const cost=tipCost(i);
    const owned=i<tipsOwned;
    const isNext=(i===tipsOwned); // tips must be bought in order (otherwise the counter and the ✓ marks get out of sync)
    const canBuy=isNext&&score>=cost;
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:.55rem .75rem;border-radius:10px;border:1px solid '+(owned?'#1a2a1a':canBuy?'#3a3a1a':'#1a1a1a')+';background:'+(owned?'#050f05':canBuy?'#0d0d04':'#060606')+';';
    // Left: tip label button
    const label=document.createElement('button');
    label.style.cssText=`font-family:'Bebas Neue',sans-serif;font-size:.8rem;letter-spacing:.12em;padding:.28rem .7rem;border-radius:7px;border:1px solid ${owned?'#2a4a2a':canBuy?'#3a3a1a':'#1e1e1e'};background:${owned?'#0a1f0a':canBuy?'#1a1a04':'#111'};color:${owned?'#00cc66':canBuy?'#cccc44':'#444'};cursor:${owned?'pointer':'default'};touch-action:manipulation;white-space:nowrap;`;
    label.textContent=(owned?'✓ ':'')+'TIP '+(i+1);
    if(owned){row.style.cursor='pointer';row.addEventListener('click',()=>openTipReader(i));}
    // Right: cost button or active badge
    const right=document.createElement('div');
    if(owned){
      const badge=document.createElement('div');
      badge.style.cssText='font-family:Bebas Neue,sans-serif;font-size:.55rem;letter-spacing:.1em;color:#336633;';
      badge.textContent='×1.5 ACTIVE';
      right.appendChild(badge);
    } else {
      const btn=document.createElement('button');
      btn.style.cssText=`font-family:'Bebas Neue',sans-serif;font-size:.6rem;letter-spacing:.1em;padding:.25rem .65rem;border-radius:6px;border:1px solid ${canBuy?'#aaaa33':'#2a2a1a'};background:${canBuy?'#1a1a04':'transparent'};color:${canBuy?'#cccc44':'#444'};cursor:${canBuy?'pointer':'default'};touch-action:manipulation;white-space:nowrap;`;
      btn.textContent=formatStore(cost)+' PTS';
      if(canBuy)btn.addEventListener('click',()=>{
        if(score<cost)return;
        if(tipsOwned>=MAX_TIPS)return;
        score-=cost;tipsOwned++;tipsMult*=1.5;
        showToast(`Tip purchased — your Tap Multiplier increased by ×1.5!`);
        playSfxTierUnlock(tipsOwned);
        buildTipsList();updateTipsLabel();renderUI();autoSave();
        openTipReader(tipsOwned-1);
      });
      right.appendChild(btn);
    }
    row.appendChild(label);row.appendChild(right);
    list.appendChild(row);
  }
}

function updateTipsLabel(){
  const el=document.getElementById('tipsOwnedLabel');
  if(el)el.textContent=tipsOwned+' TIP'+(tipsOwned!==1?'S':'')+' PURCHASED'+(tipsOwned>0?' · ×'+formatMult(tipsMult):'');
}

function updateOnboardingArrows(){
  // Arrows only belong to a running game — never on the home screen (they pointed at hidden buttons there)
  if(!document.body.classList.contains('game-active')){
    ['arrowActivate','arrowShop'].forEach(id=>{const a=document.getElementById(id);if(a)a.style.display='none';});
    document.body.classList.remove('arrow-act');
    return;
  }
  // Arrow pointing at ACTIVATE button — shows at 50pts if tracker not yet active
  const arrowAct=document.getElementById('arrowActivate');
  const activateBtn=document.getElementById('drumTrackerActivateBtn');
  if(arrowAct){
    if(!drumTrackerActive&&score>=50&&activateBtn){
      // make room above the tracker so the arrow sits under the score instead of covering it
      if(!document.body.classList.contains('arrow-act')){document.body.classList.add('arrow-act');requestAnimationFrame(updateOnboardingArrows);}
      const rect=activateBtn.getBoundingClientRect();
      arrowAct.style.display='flex';
      // Use the arrow element's own width to center it over the button
      const arrowW=arrowAct.offsetWidth||36;
      arrowAct.style.left=(rect.left+rect.width/2-arrowW/2)+'px';
      arrowAct.style.top=(rect.top-62)+'px';
    } else {
      arrowAct.style.display='none';
      if(document.body.classList.contains('arrow-act')){document.body.classList.remove('arrow-act');}
    }
  }
  // Arrow pointing at SHOP button — shows at 1500pts if shop never opened
  const arrowShop=document.getElementById('arrowShop');
  // On desktop, point at the collapse/sidebar button instead
  const isDesktop=document.body.classList.contains('desktop-mode');
  const shopBtn=isDesktop?document.getElementById('collapseShopBtn'):document.getElementById('openStoreBtn');
  if(arrowShop){
    if(shopOpenCount===0&&score>=1500&&shopBtn){
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
        const lbl=arrowShop.querySelector('div');
        if(lbl){lbl.style.marginTop='4px';lbl.style.marginRight='';lbl.style.order='';}
        arrowShop.style.left=(rect.left+rect.width/2-18)+'px';
        arrowShop.style.top=(rect.bottom+6)+'px';
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
  const btn=document.getElementById('drumTrackerActivateBtn');
  if(btn&&!drumTrackerActive){
    const canAfford=score>=25;
    btn.style.transform=canAfford?'scale(1.25)':'scale(1)';
    btn.style.transition='transform .3s cubic-bezier(.34,1.56,.64,1)';
    btn.style.boxShadow=canAfford?'0 0 20px -2px rgba(0,255,136,.7)':'0 0 12px -3px rgba(0,255,136,.4)';
  }
}

document.getElementById('drumTrackerActivateBtn')&&document.getElementById('drumTrackerActivateBtn').addEventListener('click',()=>{
  if(drumTrackerActive)return;
  if(score<25){showToast('Need 25 pts to activate the drum tracker!');return;}
  score-=25;
  drumTrackerActive=true;
  playSfxTierUnlock(0);
  updateDrumTrackerOverlay();
  showToast('Drum tracker activated!');
  renderUI();autoSave();
});

document.getElementById('tipsBtn')&&document.getElementById('tipsBtn').addEventListener('click',()=>{
  buildTipsList();
  document.getElementById('tipsModal').style.display='flex';
  const tipsScoreEl=document.getElementById('tipsModalScore');
  if(tipsScoreEl)tipsScoreEl.textContent=formatNum(score)+' PTS';
});
document.getElementById('tipsModalClose')&&document.getElementById('tipsModalClose').addEventListener('click',()=>{
  document.getElementById('tipsModal').style.display='none';
});
document.getElementById('tipsModal')&&document.getElementById('tipsModal').addEventListener('click',e=>{
  if(e.target===document.getElementById('tipsModal'))document.getElementById('tipsModal').style.display='none';
});
