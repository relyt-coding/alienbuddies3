// ══════════════════════════════════════════════
//  SHOP: no emojis except the 💎 gem. Section titles, card titles, lock icons and buttons are cleaned as the shop
//  draws them (it re-renders a lot, so this watches it rather than relying on every place that writes text).
//  Keeps plain symbols the shop uses as text: → ✓ ✕ × ★ ▸.  An element that was only an emoji is hidden.
// ══════════════════════════════════════════════
(function(){
  const root=document.getElementById('storeView');if(!root)return;
  let RX;try{RX=new RegExp('(?:\\p{Extended_Pictographic}|\\p{Regional_Indicator})(?:\\uFE0F|\\u200D(?:\\p{Extended_Pictographic})|\\p{Emoji_Modifier})*','gu');}catch(e){return;}
  const KEEP=new Set(['💎','✓','✔','✕','✖','★','☆','→','←','↑','↓','▸','◂','×','©','®','™']);
  function clean(t){return t.replace(RX,m=>KEEP.has(m.replace(/️/g,''))?m:'');}
  function scrub(node){
    const w=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,null),list=[];let n;while((n=w.nextNode()))list.push(n);
    list.forEach(tn=>{const v=tn.nodeValue;if(!v||!RX.test(v)){RX.lastIndex=0;return;}RX.lastIndex=0;
      let c=clean(v);if(c===v)return;
      // tidy the space the emoji left behind ("🥁 DRUM PAD" → "DRUM PAD")
      if(!tn.previousSibling)c=c.replace(/^\s+/,'');c=c.replace(/\s{2,}/g,' ');tn.nodeValue=c;
      const p=tn.parentElement;if(p&&!p.textContent.trim()&&!p.querySelector('canvas,img,svg,input,button'))p.style.display='none';});
  }
  let pending=false;
  const run=()=>{pending=false;obs.disconnect();try{scrub(root);}catch(e){}obs.observe(root,{subtree:true,childList:true,characterData:true});};
  const obs=new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(run);}});
  run();
})();
