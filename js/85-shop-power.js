// ══════════════════════════════════════════════
//  SHOP POWER BARS (v0.2.198)
//  Every price in the Shop gets a thin power bar along the bottom of its button / card (no number on it: the creator wants the bar alone), so you can
//  see how close you are without reading the number (like the dot rows filling up). Works for any price written with
//  jHtml / fmtJh: those are wrapped here to tag the unit span with the raw amount (data-u), so the bar uses the exact
//  cost, not the rounded text. Gem prices (💎) fill against your Alien Gems. "MAX" or text-only prices get no bar.
//  New shop items get a bar automatically as long as their price uses one of the price classes in SEL.
// ══════════════════════════════════════════════
(function(){
  const tag=(s,n)=>s.replace('class="ju"','class="ju" data-u="'+(Math.max(0,+n||0))+'"');
  const _jH=jHtml,_fJ=fmtJh;
  jHtml=function(n,sig){return tag(_jH(n,sig),n);};
  fmtJh=function(n,sig){return tag(_fJ(n,sig),n);};

  const SEL='#storeView .alien-card-price,#storeView .drum-price,#storeView .upgrade-price,#storeView .lock-cost,#skillTreeUnlockCost';
  const HOST='.drum-buy-btn,.upgrade-buy-btn,.alien-store-card,.card-lock-overlay,.st-unlock-card,button';
  const H=7;   // strip height (px); the host gets this much extra bottom padding so nothing hides under it
  const css=document.createElement('style');css.textContent=`
.spb{position:absolute;left:0;right:0;bottom:0;height:${H}px;background:rgba(255,255,255,.06);border-top:1px solid rgba(255,255,255,.06);
  pointer-events:none;z-index:2;overflow:hidden;border-radius:0 0 7px 7px;}
.spb i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,rgba(91,140,255,.55),rgba(185,140,255,.75));transition:width .35s ease-out;}
.spb.full i{background:linear-gradient(90deg,rgba(125,255,176,.8),rgba(229,255,58,.9));box-shadow:0 0 8px #e5ff3a;}
.alien-store-card>.spb,.card-lock-overlay>.spb{border-radius:0 0 11px 11px;}`;
  document.head.appendChild(css);

  function costOf(pe){
    const u=pe.querySelector('.ju[data-u]');
    if(u)return{c:+u.getAttribute('data-u'),have:typeof score==='number'?score:0};
    if(pe.querySelector('.agem')||pe.textContent.indexOf('💎')>=0){
      const m=pe.textContent.replace(/,/g,'').match(/(\d+(?:\.\d+)?)\s*([KMB])?/i);if(!m)return null;
      const c=parseFloat(m[1])*({k:1e3,m:1e6,b:1e9}[(m[2]||'').toLowerCase()]||1);
      return{c,have:typeof alienGems==='number'?alienGems:0};
    }
    return null;
  }
  function tick(){
    const sv=document.getElementById('storeView');if(!sv||!sv.offsetParent&&!document.body.classList.contains('store-open'))return;
    document.querySelectorAll(SEL).forEach(pe=>{
      const host=pe.closest(HOST)||pe.parentElement;if(!host)return;
      let bar=host._spb;const k=pe.offsetParent?costOf(pe):null;
      if(!k||!(k.c>0)){if(bar&&bar.b.style.display!=='none'){bar.b.style.display='none';host.style.paddingBottom=bar.pad;}return;}
      if(!bar){
        const b=document.createElement('div');b.className='spb';b.innerHTML='<i></i>';
        const pad=host.style.paddingBottom,pb=parseFloat(getComputedStyle(host).paddingBottom)||0;
        if(getComputedStyle(host).position==='static')host.style.position='relative';
        host.appendChild(b);bar=host._spb={b,pad,on:(pb+H)+'px'};b.style.display='none';
      }
      if(bar.b.style.display==='none'){bar.b.style.display='';host.style.paddingBottom=bar.on;}
      const f=Math.max(0,Math.min(1,k.have/k.c)),full=k.have>=k.c;
      bar.b.firstChild.style.width=(f*100).toFixed(1)+'%';bar.b.classList.toggle('full',full);

    });
  }
  setInterval(tick,250);
  window.__spb={tick};
})();
