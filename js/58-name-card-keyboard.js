// ══════════════════════════════════════════════
//  BUDDY NAME CARD + PHONE KEYBOARD — keep the card steady and whole while you type.
//  When the keyboard opens, iOS scrolls the page up to show the text box, which used to push the top of the card
//  (the buddy and its name) off screen and reshuffle things. Now the card's overlay follows the part of the
//  screen you can still see, the page itself is held still, and if the card is too tall for the space above the
//  keyboard it shrinks evenly (same layout, just smaller) instead of being cut off.
// ══════════════════════════════════════════════
(function(){
  const vv=window.visualViewport,modal=document.getElementById('alienNameModal'),box=document.getElementById('alienNameBox'),input=document.getElementById('bdyTagField');
  if(!vv||!modal||!box||!input)return;
  let on=false,raf=0;
  function place(){
    raf=0;if(!on)return;
    modal.style.top=vv.offsetTop+'px';modal.style.height=vv.height+'px';modal.style.bottom='auto';
    modal.style.paddingTop='10px';modal.style.alignItems='flex-start';
    box.style.transform='';const h=box.offsetHeight,room=vv.height-20;
    const k=h>room?Math.max(.55,room/h):1;
    box.style.transformOrigin='50% 0';box.style.transform=k<1?'scale('+k.toFixed(3)+')':'';
  }
  const queue=()=>{if(!raf)raf=requestAnimationFrame(place);};
  function start(){on=true;modal.classList.add('kb-open');queue();setTimeout(queue,120);setTimeout(queue,350);}
  function stop(){on=false;modal.classList.remove('kb-open');['top','height','bottom','paddingTop','alignItems'].forEach(k=>modal.style[k]='');box.style.transform='';box.style.transformOrigin='';
    try{window.scrollTo(0,0);}catch(e){}}
  input.addEventListener('focus',start);
  input.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==input)stop();},80));
  vv.addEventListener('resize',queue);vv.addEventListener('scroll',queue);
  // the page under the overlay should never scroll while the card is up
  window.addEventListener('scroll',()=>{if(on&&window.scrollY>0)queue();},{passive:true});
})();
