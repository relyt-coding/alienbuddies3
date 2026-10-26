
// ══════════════════════════════════════════════
//  NAV
// ══════════════════════════════════════════════
function showHint(icon, text, onClose){
  document.getElementById('hintModalIcon').textContent=icon;
  document.getElementById('hintModalText').innerHTML=text;
  document.getElementById('hintModal').style.display='flex';
  const _hmc=document.getElementById('hintModalClose');
  _hmc.onclick=null;
  _hmc.ontouchend=null;
  _hmc.ontouchend=(e)=>{e.preventDefault();document.getElementById('hintModal').style.display='none';if(typeof onClose==='function')onClose();};
  _hmc.onclick=()=>{
    document.getElementById('hintModal').style.display='none';
    if(onClose)onClose();
    autoSave();
  };
}

function openStore(){
  if(document.body.classList.contains('desktop-mode')){
    // Desktop: just un-collapse the shop sidebar
    const sv=document.getElementById('storeView');
    sv.classList.remove('sidebar-collapsed');
    updateCollapseBtn('shop',false);
    renderStore();
    return;
  }
  document.body.classList.add('store-open');
  renderStore();
  const _ss=document.querySelector('#storeView .store-scroll');if(_ss)_ss.scrollTop=0; // always start at the top
  shopOpenCount++;
  updateOnboardingArrows();
  if(shopOpenCount===5&&shop.seqMultLevel<0&&shop.multLevel<0){
    setTimeout(()=>showToast('💡 Scroll down for more upgrades!'),800);
  }
}
function closeStore(){
  if(document.body.classList.contains('desktop-mode'))return;
  document.body.classList.remove('store-open');
}
function openBunker(){
  viewingBunker=Math.max(0,Math.floor((Math.max(0,totalAliens-1))/BUNKER_SIZE));
  if(document.body.classList.contains('desktop-mode')){
    const bv=document.getElementById('bunkerView');
    bv.classList.remove('sidebar-collapsed');
    updateCollapseBtn('bunker',false);
    renderBunkerView();
    return;
  }
  document.body.classList.add('bunker-open');
  // Hide onboarding arrows when bunker opens
  const _arrowAct=document.getElementById('arrowActivate');
  const _arrowShop=document.getElementById('arrowShop');
  if(_arrowAct)_arrowAct.style.display='none';
  if(_arrowShop)_arrowShop.style.display='none';
  renderBunkerView();
}
function closeBunker(){
  if(document.body.classList.contains('desktop-mode'))return;
  document.body.classList.remove('bunker-open');
}
addEP('openStoreBtn',openStore);
addEP('closeStoreBtn',closeStore);
addEP('openBunkerBtn',openBunker);
addEP('closeBunkerBtn',closeBunker);

// ══════════════════════════════════════════════
//  FULLSCREEN
// ══════════════════════════════════════════════
function isFullscreen(){
  return !!(document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement);
}

function updateFullscreenBtn(){
  const btn=document.getElementById('settingsFullscreenBtn');
  if(!btn)return;
  const fs=isFullscreen();
  btn.textContent=fs?'✕ EXIT FULLSCREEN':'⛶ ENTER FULLSCREEN';
  btn.style.color=fs?'#00ff88':'#888';
  btn.style.borderColor=fs?'#00ff88':'#333';
}

function toggleFullscreen(){
  if(isFullscreen()){
    (document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen||function(){}).call(document);
  } else {
    const el=document.documentElement;
    const req=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen;
    if(req) req.call(el).catch(()=>{});
  }
}

const _fsbtn=document.getElementById('settingsFullscreenBtn');
if(_fsbtn) _fsbtn.addEventListener('click',()=>{toggleFullscreen();setTimeout(updateFullscreenBtn,200);});
document.addEventListener('fullscreenchange',updateFullscreenBtn);
document.addEventListener('webkitfullscreenchange',updateFullscreenBtn);

function updateFullscreenBtnVisibility(){
  const btn=document.getElementById('settingsFullscreenBtn');
  if(!btn)return;
  btn.style.display=document.body.classList.contains('desktop-mode')?'block':'none';
}
