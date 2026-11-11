// ── SHOP LAYOUTS (Settings → SHOP LAYOUT) ──
//  A · CLASSIC   one long list (the original)
//  B · GRID      two cards side by side, so more fits on screen
//  C · TABS      a tab bar at the top: one section at a time
//  D · SHELVES   every section is a row you swipe sideways, like an app store
// The shop's sections (a label followed by its cards) are wrapped once into .shop-sec > .shop-shelf; each layout is then
// just CSS on body.shop-a/b/c/d (plus the tab bar for C). Saved per device.
(function(){
  const $=id=>document.getElementById(id);
  const INFO={a:'One long list',b:'Two cards per row',c:'One section at a time, with tabs',d:'Swipe each section sideways'};
  let layout='a',tab=0,sections=[],bar=null;
  try{const v=localStorage.getItem('ab2_shop_layout');if(INFO[v])layout=v;}catch(e){}
  function group(){
    const sc=document.querySelector('#storeView .store-scroll');if(!sc||sc.dataset.grouped)return;
    sc.dataset.grouped='1';
    const kids=[...sc.children];let cur=null;
    kids.forEach(el=>{
      if(el.classList.contains('store-section-label')){
        const sec=document.createElement('div');sec.className='shop-sec';
        const shelf=document.createElement('div');shelf.className='shop-shelf';
        sc.insertBefore(sec,el);sec.appendChild(el);sec.appendChild(shelf);cur=shelf;
        sections.push({sec,name:el.textContent.replace(/^[^A-Z0-9]+/i,'').trim()||'SHOP'});
      }else if(cur&&el.id!=='shopShowDismissedBtn'){cur.appendChild(el);}
    });
    // the tab bar for layout C
    bar=document.createElement('div');bar.id='shopTabs';
    const first=sections[0]&&sections[0].sec;if(first)sc.insertBefore(bar,first);
    sections.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.name;b.onclick=()=>{tab=i;paintTabs();sc.scrollTop=0;};bar.appendChild(b);});
  }
  function paintTabs(){
    // skip tabs whose section has nothing to show yet (everything inside locked/hidden)
    const vis=sections.map(s=>[...s.sec.querySelectorAll('.shop-shelf > *')].some(c=>getComputedStyle(c).display!=='none'));
    if(!vis[tab]){const k=vis.indexOf(true);if(k>=0)tab=k;}
    if(bar)[...bar.children].forEach((b,i)=>{b.classList.toggle('on',i===tab);b.style.display=vis[i]?'':'none';});
    sections.forEach((s,i)=>s.sec.classList.toggle('shop-tab-on',i===tab));
  }
  function apply(v){
    if(INFO[v])layout=v;
    try{localStorage.setItem('ab2_shop_layout',layout);}catch(e){}
    group();
    document.body.classList.remove('shop-a','shop-b','shop-c','shop-d');document.body.classList.add('shop-'+layout);
    const sel=$('settingsShopSel');if(sel)sel.value=layout;
    const info=$('settingsShopInfo');if(info)info.textContent=INFO[layout];
    if(layout==='c')paintTabs();
  }
  const sel=$('settingsShopSel');
  if(sel)sel.addEventListener('change',()=>{apply(sel.value);if(typeof showToast==='function')showToast('🛒 Shop layout '+layout.toUpperCase());});
  window.setShopLayout=apply;
  // sections fill in as you unlock things: keep the tabs current while the shop is open
  setInterval(()=>{if(layout==='c'&&document.body.classList.contains('store-open'))paintTabs();},700);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>apply(layout));else apply(layout);
})();
