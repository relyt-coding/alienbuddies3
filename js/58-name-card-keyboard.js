// ══════════════════════════════════════════════
//  BUDDY NAME CARD + PHONE KEYBOARD (v0.2.137) — the card never moves while you name a buddy.
//
//  Why it used to jerk: on iPhone, whenever a text box gets the keyboard, Safari scrolls the page so the box sits
//  in the MIDDLE of the space left above the keyboard (it does this even when the box is already visible). Our name
//  box is ~240px down the card, past that middle on every phone, so Safari always scrolled ~90px — and the old code
//  chased that scroll (Safari reports where it will end up instantly, then animates), which made the card lurch
//  down and slide back, then do the same in reverse when the keyboard closed.
//
//  Now, on touch screens:
//   • the real text field is invisible and sits at the very TOP of the card, where Safari has nothing to scroll for;
//   • the name box you see is drawn by us in its usual spot: it shows what you type, a blinking caret and the
//     selected text, and tapping it opens the keyboard;
//   • nothing is repositioned when the keyboard opens or closes (no viewport chasing, no scaling);
//   • the card's spot is picked once when it opens (short screens sit a little higher / get a smaller buddy) so the
//     name box and its buttons stay above the keyboard;
//   • opening / closing the name editor grows / shrinks the card smoothly from its bottom edge.
//  Computers keep the normal text box.
// ══════════════════════════════════════════════
(function(){
  const $=id=>document.getElementById(id);
  const modal=$('alienNameModal'),box=$('alienNameBox'),input=$('bdyTagField'),sec=$('anmEditSection');
  if(!modal||!box||!input||!sec)return;
  const mm=q=>!!(window.matchMedia&&window.matchMedia(q).matches);
  // touch screens only; and not on a phone held sideways, where the keyboard covers nearly everything — there the
  // normal text box is used so Safari can scroll it into view (re-picked each time the card opens)
  const touch=mm('(hover: none) and (pointer: coarse)');
  let proxy=false;
  function pickMode(){proxy=touch&&(window.innerHeight||0)>=420;document.body.classList.toggle('bt-proxy',proxy);}
  pickMode();

  // ── the name box you see (touch screens) ──
  const show=document.createElement('div');show.id='bdyTagShow';show.setAttribute('aria-hidden','true');
  sec.insertBefore(show,sec.firstChild);
  let lastKey='';
  function span(cls,text){const s=document.createElement('span');if(cls)s.className=cls;s.textContent=text;return s;}
  function caret(){const i=document.createElement('i');i.className='bt-caret';return i;}
  function render(){
    if(!proxy)return;
    const v=input.value||'',f=document.activeElement===input;
    let s=v.length,e=v.length;try{if(input.selectionStart!=null){s=input.selectionStart;e=input.selectionEnd;}}catch(err){}
    const key=v+'\u0000'+s+'\u0000'+e+'\u0000'+f;if(key===lastKey)return;lastKey=key;
    show.classList.toggle('focus',f);show.textContent='';
    if(!v){if(f)show.appendChild(caret());show.appendChild(span('bt-ph',input.getAttribute('placeholder')||''));return;}
    const a=v.slice(0,s),sel=v.slice(s,e),b=v.slice(e);
    if(a)show.appendChild(span('',a));
    if(sel)show.appendChild(span(f?'bt-sel':'',sel));
    else if(f)show.appendChild(caret());   // a fresh caret each change: it stays solid while you type, then blinks
    if(b)show.appendChild(span('',b));
  }
  window.bdyTagRender=()=>{lastKey='';render();};

  // keep it in step with the real field (typing, NAME FOR ME, CLEAR, the caret moving…) while the editor is open
  let raf=0;
  function editing(){return modal.classList.contains('open')&&sec.style.display!=='none'&&sec.offsetParent!==null;}
  function loop(){raf=0;if(!editing())return;render();raf=requestAnimationFrame(loop);}
  function kick(){if(proxy&&!raf)raf=requestAnimationFrame(loop);}
  ['input','focus','blur','keyup','select'].forEach(n=>input.addEventListener(n,()=>{render();kick();}));
  document.addEventListener('selectionchange',()=>{if(document.activeElement===input)render();});
  new MutationObserver(()=>{lastKey='';render();kick();}).observe(sec,{attributes:true,attributeFilter:['style']});

  // focus the real field without letting the browser scroll anything
  function focusField(selectAll){
    try{input.focus({preventScroll:true});}catch(e){try{input.focus();}catch(e2){}}
    try{if(selectAll)input.select();else{const n=input.value.length;input.setSelectionRange(n,n);}}catch(e){}
    lastKey='';render();kick();
  }
  window.bdyFocus=focusField;
  // already typing: tapping the box just puts the caret at the end (and doesn't close the keyboard)
  show.addEventListener('touchstart',e=>{if(!proxy||document.activeElement!==input)return;e.preventDefault();const n=input.value.length;try{input.setSelectionRange(n,n);}catch(err){}render();},{passive:false});
  show.addEventListener('click',()=>{if(proxy&&document.activeElement!==input)focusField(false);});

  // ── where the card sits: chosen once when it opens, never while the keyboard is up ──
  function fit(){
    modal.style.paddingTop='';pickMode();lastKey='';render();
    if(document.body.classList.contains('desktop-mode')){modal.classList.remove('fit-short','fit-tiny');return;}
    const h=window.innerHeight||0;
    modal.classList.toggle('fit-tiny',h>0&&h<500);
    modal.classList.toggle('fit-short',h>=500&&h<600);
    // freeze the gap above the card in pixels: it's 7% of the screen height in the CSS, and on phones where the
    // keyboard shrinks the page that would pull the card up as the keyboard opens
    const pt=getComputedStyle(modal).paddingTop;if(pt&&pt!=='0px')modal.style.paddingTop=pt;
  }
  let wasOpen=false;
  new MutationObserver(()=>{const o=modal.classList.contains('open');if(o&&!wasOpen)fit();if(!o&&wasOpen)modal.style.paddingTop='';wasOpen=o;}).observe(modal,{attributes:true,attributeFilter:['class']});
  // turning the phone (not typing): re-pick
  window.addEventListener('orientationchange',()=>setTimeout(()=>{if(document.activeElement===input)return;if(modal.classList.contains('open'))fit();else pickMode();},350));

  // ── the editor opening / closing: the card grows or shrinks smoothly from its bottom edge (its top never moves) ──
  window.anmSmooth=function(fn){
    const h0=box.offsetHeight;fn();
    if(!modal.classList.contains('open')||mm('(prefers-reduced-motion: reduce)'))return;
    const h1=box.offsetHeight;if(!h0||!h1||Math.abs(h1-h0)<2)return;
    clearTimeout(box._smT);
    box.style.transition='none';box.style.height=h0+'px';box.style.overflow='hidden';void box.offsetHeight;
    box.style.transition='height .2s cubic-bezier(.25,.8,.25,1)';box.style.height=h1+'px';
    box._smT=setTimeout(()=>{box.style.transition='';box.style.height='';box.style.overflow='';},240);
  };

  // safety net: if a browser ever does leave the page scrolled after the keyboard closes, put it back once it's down
  input.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==input&&window.scrollY>0)try{window.scrollTo(0,0);}catch(e){}},450));
})();
