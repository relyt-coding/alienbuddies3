// ── SHOP GRID ──
// The shop shows two cards per row. Its sections (a label followed by its cards) are wrapped once into
// .shop-sec > .shop-shelf so each section becomes its own two-column grid (body.shop-b in the CSS).
(function(){
  function group(){
    const sc=document.querySelector('#storeView .store-scroll');if(!sc||sc.dataset.grouped)return;
    sc.dataset.grouped='1';let cur=null;
    [...sc.children].forEach(el=>{
      if(el.classList.contains('store-section-label')){
        const sec=document.createElement('div');sec.className='shop-sec';const shelf=document.createElement('div');shelf.className='shop-shelf';
        sc.insertBefore(sec,el);sec.appendChild(el);sec.appendChild(shelf);cur=shelf;
      }else if(cur&&el.id!=='shopShowDismissedBtn')cur.appendChild(el);
    });
  }
  function init(){group();document.body.classList.add('shop-b');try{localStorage.removeItem('ab2_shop_layout');}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
