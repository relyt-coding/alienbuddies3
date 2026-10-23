
// ══════════════════════════════════════════════
//  V5 — DESKTOP / RESPONSIVE LAYOUT
// ══════════════════════════════════════════════


// Settings stored alongside save data
let v5Settings = {
  particles: true,
  bouncerNames: true,
  mobileView: false,
  masterMuted: false,
  moreAliens: false,   // allow more than 10 bouncing aliens (performance warning)
  bouncerLimit: 20,    // how many, when moreAliens is on
  layoutMode: 'auto',  // 'auto' | 'desktop' | 'mobile'
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

// If the window is resized across the 900px line (or the LAYOUT setting changes), switch layouts live
function recheckDesktopMode(){
  const now=_detectDesktop();
  if(now===IS_DESKTOP)return;
  IS_DESKTOP=now;
  document.body.classList.toggle('desktop-mode',IS_DESKTOP);
  if(IS_DESKTOP)applyDesktopMode();
  else{ // back to the phone layout
    const sv=document.getElementById('storeView'),bv=document.getElementById('bunkerView');
    sv&&sv.classList.remove('sidebar-collapsed');bv&&bv.classList.remove('sidebar-collapsed');
  }
  if(typeof requestRender==='function')requestRender();
  setTimeout(()=>{typeof clampBouncersToBounds==='function'&&clampBouncersToBounds();},100);
}
(function(){
  let t=null;
  addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(recheckDesktopMode,200);});
})();

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
  if(typeof _paintLayoutSetting==='function')_paintLayoutSetting();
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


// ── Fit the drum pad grid into the vertical space left over (desktop) ──
// With many sequencer tracks (e.g. 6) the pads used to be pushed off the bottom / the last track got clipped.
// This measures the free height and shrinks the pad grid just enough (never above its normal size).
const PAD_GRID_CAPS={1:160,2:326,3:410,4:410,5:560,6:560,7:680,8:680};
const PAD_GRID_MIN_W=200;
function fitPadArea(){
  const grid=document.getElementById('padGrid');
  const app=document.querySelector('#gameView .app');
  const area=grid&&grid.closest('.pad-area');
  if(!grid||!app||!area)return;
  if(!document.body.classList.contains('desktop-mode')||document.body.classList.contains('arr-mode')||app.offsetHeight===0){grid.style.maxWidth='';return;}
  const n=Math.max(1,Math.min(8,parseInt(grid.getAttribute('data-pads'))||1));
  const cap=PAD_GRID_CAPS[n]||410;
  // height used by everything except the pad area
  let used=0;
  [...app.children].forEach(ch=>{
    if(ch===area)return;
    const cs=getComputedStyle(ch);
    if(cs.display==='none'||cs.position==='absolute'||cs.position==='fixed')return;
    used+=ch.getBoundingClientRect().height+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom);
  });
  const acs=getComputedStyle(app),acsArea=getComputedStyle(area);
  const inner=app.clientHeight-parseFloat(acs.paddingTop)-parseFloat(acs.paddingBottom);
  const avail=inner-used-parseFloat(acsArea.paddingTop)-parseFloat(acsArea.paddingBottom)-24; // 24px breathing room
  // grid geometry (matches the CSS: 4:3 pads, 6px gap, columns per pad count)
  const cols=n<=1?1:(n===3?3:(n<=4?2:(n<=6?3:4)));
  const rows=Math.ceil(n/cols);
  const gap=6,ratio=0.75;
  const padH=(avail-(rows-1)*gap)/rows;
  let W=(padH/ratio)*cols+(cols-1)*gap;
  W=Math.max(PAD_GRID_MIN_W,Math.min(cap,W));
  grid.style.maxWidth=Math.floor(W)+'px';
}
(function(){
  let raf=0;
  const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;fitPadArea();});};
  window.fitPadAreaSoon=schedule;
  window.addEventListener('resize',schedule);
  if(typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(schedule);
    const app=document.querySelector('#gameView .app');
    if(app){ro.observe(app);[...app.children].forEach(ch=>{if(!ch.classList.contains('pad-area'))ro.observe(ch);});}
  }
  schedule();
})();

// ── Keep the aliens from crossing the pad editor window ──
// The alien layer floats above everything, so while Edit Pads is open we cut holes in it
// where the editor (pad area, pad-count picker, reminder bubble) is, so the aliens pass behind it.
// (The sequencer itself is NOT cut out — aliens may float over it.)
(function(){
  const layer=document.getElementById('alienLayer');
  if(!layer)return;
  let last='';
  function rects(){
    const out=[];
    const sels=padEditMode?['.pad-area','#padCountSelector','#editModeReminder']:[];
    sels.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        if(el.closest('#homeScreen'))return;
        const cs=getComputedStyle(el);
        if(cs.display==='none'||cs.visibility==='hidden')return;
        const r=el.getBoundingClientRect();
        if(r.width<4||r.height<4)return;
        out.push(r);
      });
    });
    return out;
  }
  // Any open pop-up window (reassign pad, save/load/clear) hides the aliens completely while it is open
  function modalOpen(){
    if(document.getElementById('padAssignModal')?.classList.contains('open'))return true;
    return ['savePatModal','loadPatModal','clearTrackModal'].some(id=>{
      const m=document.getElementById(id);return m&&m.style.display&&m.style.display!=='none';
    });
  }
  function update(){
    const hide=modalOpen();
    if(hide!==layer._hiddenByModal){layer._hiddenByModal=hide;layer.style.visibility=hide?'hidden':'';}
    const rs=rects();
    let v='none';
    if(rs.length){
      const W=innerWidth,H=innerHeight;
      let pts=`0px 0px,${W}px 0px,${W}px ${H}px,0px ${H}px,0px 0px`;
      rs.forEach(r=>{
        const x1=Math.round(r.left),y1=Math.round(r.top),x2=Math.round(r.right),y2=Math.round(r.bottom);
        pts+=`,${x1}px ${y1}px,${x1}px ${y2}px,${x2}px ${y2}px,${x2}px ${y1}px,${x1}px ${y1}px,0px 0px`;
      });
      v=`polygon(evenodd,${pts})`;
    }
    if(v!==last){last=v;layer.style.clipPath=v;layer.style.webkitClipPath=v;}
  }
  setInterval(update,40);
  addEventListener('resize',update);
  update();
})();
