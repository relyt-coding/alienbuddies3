
// ══════════════════════════════════════════════
//  V5 — DESKTOP / RESPONSIVE LAYOUT
// ══════════════════════════════════════════════


// Settings stored alongside save data
let v5Settings = {
  particles: true,
  bouncerNames: true,
  mobileView: false,
  masterMuted: false,
  earnHidden: true   // keep earning (and playing) while the tab is hidden; turn off to pause instead
};

function loadV5Settings(){
  try{
    const s = localStorage.getItem('ab2_v5_settings');
    if(s) v5Settings = Object.assign(v5Settings, JSON.parse(s));
  }catch(e){}
}
function saveV5Settings(){
  try{ localStorage.setItem('ab2_v5_settings', JSON.stringify(v5Settings)); }catch(e){}
}

function applyDesktopMode(){
  const useDesktop = IS_DESKTOP;
  document.body.classList.toggle('desktop-mode', useDesktop);

  // Show mobile view toggle row only on desktop
  if(useDesktop){
    // Ensure both sidebars start visible and populated
    const sv = document.getElementById('storeView');
    const bv = document.getElementById('bunkerView');
    if(sv){sv.classList.remove('sidebar-collapsed');}
    if(bv){bv.classList.remove('sidebar-collapsed');}
    // On desktop hide the old mobile slide classes
    document.body.classList.remove('store-open','bunker-open');
    // Only render panels if a game is loaded
    if(document.body.classList.contains('game-active')){
      renderStore();
      renderBunkerView();
    }
    updateCollapseBtn('shop', false);
    updateCollapseBtn('bunker', false);
  }
  // Always refresh arrow state after layout changes
  if(typeof updateOnboardingArrows==='function') setTimeout(updateOnboardingArrows,100);
}

function updatePartyBtnPosition(){
  if(!document.body.classList.contains('desktop-mode')) return;
  const pb = document.getElementById('partyBtn');
  if(!pb) return;
  const sv = document.getElementById('storeView');
  const shopCollapsed = sv && sv.classList.contains('sidebar-collapsed');
  pb.style.right = shopCollapsed ? '1.4rem' : 'calc(380px + 1.4rem)';
}

function updateCollapseBtn(side, collapsed){
  if(side==='shop'){
    const btn = document.getElementById('collapseShopBtn');
    if(btn) btn.textContent = collapsed ? '◀ SHOP' : 'SHOP ▶';
  } else {
    const btn = document.getElementById('collapseBunkerBtn');
    if(btn) btn.textContent = collapsed ? 'BUNKER ▶' : '◀ BUNKER';
  }
}

// Collapse toggle handlers
document.getElementById('collapseShopBtn')&&document.getElementById('collapseShopBtn').addEventListener('click',()=>{
  const sv = document.getElementById('storeView');
  const collapsed = sv.classList.toggle('sidebar-collapsed');
  updateCollapseBtn('shop', collapsed);
  // Opening the shop sidebar counts as visiting the shop — hide the arrow
  if(!collapsed){ shopOpenCount=Math.max(shopOpenCount,1); updateOnboardingArrows(); renderStore(); }
  updatePartyBtnPosition();
  setTimeout(repositionCollapseButtons,350);
});
document.getElementById('collapseBunkerBtn')&&document.getElementById('collapseBunkerBtn').addEventListener('click',()=>{
  const bv = document.getElementById('bunkerView');
  const collapsed = bv.classList.toggle('sidebar-collapsed');
  updateCollapseBtn('bunker', collapsed);
  // Re-render bunker when expanding so stats are always fresh
  if(!collapsed){renderBunkerView();}
  setTimeout(repositionCollapseButtons,350);
});

// Reposition collapse buttons dynamically based on sidebar widths
function repositionCollapseButtons(){
  if(!document.body.classList.contains('desktop-mode')) return;
  const gs = document.getElementById('gameScreen');
  if(!gs) return;
  const bv = document.getElementById('bunkerView');
  const sv = document.getElementById('storeView');
  const bunkerCollapsed = bv && bv.classList.contains('sidebar-collapsed');
  const shopCollapsed = sv && sv.classList.contains('sidebar-collapsed');
  const bunkerW = bunkerCollapsed ? 0 : (bv ? bv.getBoundingClientRect().width : 300);
  const shopW = shopCollapsed ? 0 : (sv ? sv.getBoundingClientRect().width : 320);
  const cb = document.getElementById('collapseBunkerBtn');
  const cs = document.getElementById('collapseShopBtn');
  if(cb) cb.style.left = bunkerW + 'px';
  if(cs) cs.style.right = shopW + 'px';
}

// ── Settings Panel ──
function openSettings(){
  syncSettingsUI();
  document.getElementById('settingsPanel').classList.add('open');
}
function closeSettings(){
  document.getElementById('settingsPanel').classList.remove('open');
  saveV5Settings();
}

function syncSettingsUI(){
  // Sync master volume from existing soundboard slider
  const mv = document.getElementById('masterVolSlider');
  const smv = document.getElementById('settingsMasterSlider');
  if(mv && smv) smv.value = mv.value;
  const muteBtn = document.getElementById('masterMuteBtn');
  const sMuteBtn = document.getElementById('settingsMuteBtn');
  if(muteBtn && sMuteBtn) sMuteBtn.textContent = muteBtn.textContent;

  const bgOld = document.getElementById('bgMusicToggle');
  const bgNew = document.getElementById('settingsBgMusic');
  if(bgOld && bgNew) bgNew.checked = bgOld.checked;


}

// Settings master volume — bridge to existing audio system
document.getElementById('settingsMasterSlider')&&document.getElementById('settingsMasterSlider').addEventListener('input',function(){
  const mv = document.getElementById('masterVolSlider');
  if(mv){mv.value=this.value;mv.dispatchEvent(new Event('input'));}
  const mn = document.getElementById('masterVolNum');
  if(mn){mn.value=Math.round(this.value*100);}
});
document.getElementById('settingsMuteBtn')&&document.getElementById('settingsMuteBtn').addEventListener('click',()=>{
  const oldBtn = document.getElementById('masterMuteBtn');
  if(oldBtn) oldBtn.click();
  const sMuteBtn = document.getElementById('settingsMuteBtn');
  const oldBtnAfter = document.getElementById('masterMuteBtn');
  if(sMuteBtn && oldBtnAfter) sMuteBtn.textContent = oldBtnAfter.textContent;
});
document.getElementById('settingsBgMusic')&&document.getElementById('settingsBgMusic').addEventListener('change',function(){
  const old = document.getElementById('bgMusicToggle');
  if(old){old.checked=this.checked;old.dispatchEvent(new Event('change'));}
});

// Particles toggle


// Reset save file
document.getElementById('settingsSaveExitBtn')&&document.getElementById('settingsSaveExitBtn').addEventListener('click',()=>{
  closeSettings();
  autoSave();
  if(typeof goToHomeScreen==='function') goToHomeScreen();
  else location.reload();
});

document.getElementById('settingsCloseBtn')&&document.getElementById('settingsCloseBtn').addEventListener('click',closeSettings);

// Socials button
const socialsBtn=document.getElementById('socialsBtn');
const socialsModal=document.getElementById('socialsModal');
function openSocials(){socialsModal.style.display='flex';}
socialsBtn&&socialsBtn.addEventListener('click',openSocials);
socialsBtn&&socialsBtn.addEventListener('touchend',e=>{e.preventDefault();openSocials();});
const settingsSocialsBtn=document.getElementById('settingsSocialsBtn');
settingsSocialsBtn&&settingsSocialsBtn.addEventListener('click',()=>{closeSettings();openSocials();});
socialsModal&&socialsModal.addEventListener('click',e=>{if(e.target===socialsModal)socialsModal.style.display='none';});

