// ══════════════════════════════════════════════
//  KEYBOARD STEADY (v0.2.137) — on phones and tablets, typing in ANY text box no longer makes the screen jump.
//
//  iPhone Safari scrolls every focused text box to the middle of the space above the keyboard (even when you can
//  already see it), so most boxes made the page lurch as the keyboard came up and again when it went away. The
//  buddy name card has its own fix (js/58); this does the same for every other box:
//   • the keyboard actually types into an invisible "catcher" box parked at the very top of the screen, where
//     Safari has nothing to scroll for (one catcher for letters, one for numbers so the number pad still shows);
//   • the box you tapped shows what you type as you type, with a focus ring and a blinking caret drawn on top;
//   • the game's own code sees nothing different: the box gets the same input / change / Enter / blur events as
//     before, and calling .focus() / .blur() / .select() on it works as before;
//   • a box that would end up hidden behind the keyboard is left to the browser (it scrolls it into view), and the
//     real keyboard height is remembered after the first time so that call gets more accurate.
//  Computers (mouse / trackpad) are untouched.
// ══════════════════════════════════════════════
(function(){
  const mm=q=>!!(window.matchMedia&&window.matchMedia(q).matches);
  if(!mm('(hover: none) and (pointer: coarse)'))return;
  const vv=window.visualViewport;
  const SKIP_IDS={bdyTagField:1};
  const TEXTISH={text:1,search:1,number:1,tel:1,url:1,email:1,'':1};
  const P=HTMLInputElement.prototype,nFocus=P.focus,nBlur=P.blur,nSelect=P.select,nSSR=P.setSelectionRange;

  // ── the two invisible catchers ──
  function mkCatcher(numeric){
    const c=document.createElement('input');c.type=numeric?'text':'search';c.className='kbs-catcher';c.tabIndex=-1;
    c.setAttribute('aria-hidden','true');c.setAttribute('role','textbox');c.name=numeric?'kbs_n':'kbs_q';
    c.setAttribute('autocomplete','off');c.setAttribute('autocorrect','off');c.spellcheck=false;
    c.setAttribute('data-lpignore','true');c.setAttribute('data-1p-ignore','true');c.setAttribute('data-form-type','other');
    if(numeric)c.setAttribute('inputmode','numeric');
    c._kbs=true;document.body.appendChild(c);return c;
  }
  const catT=mkCatcher(false),catN=mkCatcher(true);
  const caretEl=document.createElement('i');caretEl.id='kbsCaret';document.body.appendChild(caretEl);

  // ── how much room is left above the keyboard (learned from the real keyboard after the first time) ──
  let learned={};try{learned=JSON.parse(localStorage.getItem('ab2_kbv')||'{}')||{};}catch(e){}
  const land=()=>(window.innerWidth||0)>(window.innerHeight||0);
  const lkey=()=>(land()?'L':'P')+'|'+(window.innerHeight||0);
  function roomAbove(){
    const k=learned[lkey()];if(k)return k;
    const sh=land()?Math.min(screen.width,screen.height):Math.max(screen.width,screen.height);
    const standalone=!!(navigator.standalone||mm('(display-mode: standalone)'));
    const android=/Android/i.test(navigator.userAgent||'');
    return (window.innerHeight||0)-sh*(standalone||android?.42:.35);   // cautious guess; the real number is saved below
  }
  let restH=window.innerHeight||0;
  function kbUp(){return !!vv&&vv.height<restH*.86;}
  if(vv)vv.addEventListener('resize',()=>{
    const ae=document.activeElement;if(!ae||ae.tagName!=='INPUT')return;
    if(vv.height<restH*.86&&vv.scale<1.05){
      const k=(land()?'L':'P')+'|'+restH;const h=Math.round(vv.height);
      if(learned[k]!==h){learned[k]=h;try{localStorage.setItem('ab2_kbv',JSON.stringify(learned));}catch(e){}}
    }
  });

  // ── which boxes get the steady treatment ──
  function isTextish(x){return x instanceof HTMLInputElement&&!x._kbs&&!SKIP_IDS[x.id]&&TEXTISH[(x.getAttribute('type')||'').toLowerCase()]===1&&!x.disabled&&!x.readOnly;}
  function room(){return kbUp()?(vv.height+vv.offsetTop):roomAbove();}
  function eligible(x,allowLift){
    if(!isTextish(x)||!x.isConnected)return false;
    if(vv&&vv.scale>1.05)return false;                       // page zoomed in (big sequencer): leave it to the browser
    const r=x.getBoundingClientRect();if(r.width<2||r.height<2)return false;
    if(r.top<0)return false;
    if(r.bottom<=room()-8)return true;                        // it will still be in view once the keyboard is up
    return !!(allowLift&&liftPlan(x));                        // or its list can scroll it up there
  }
  // a box low down in a scrolling list (sound volumes, settings…): the LIST scrolls it up smoothly as the keyboard
  // comes up (the screen itself stays put)
  // (a panel that only just fits, like Settings, gets a little extra room at the bottom while you type)
  function scroller(x){
    for(let e=x.parentElement;e&&e!==document.body&&e!==document.documentElement;e=e.parentElement){
      const cs=getComputedStyle(e);if(/(auto|scroll)/.test(cs.overflowY))return e;
    }
    return null;
  }
  function liftPlan(x){
    const sc=scroller(x);if(!sc)return null;
    const r=x.getBoundingClientRect(),sr=sc.getBoundingClientRect();
    if(r.top<sr.top-1||r.bottom>sr.bottom+1)return null;      // it isn't showing in its list
    const need=Math.ceil(r.bottom-(room()-12));if(need<=0)return null;
    if(r.top-need<Math.max(0,sr.top)+4)return null;           // it would go off the top of its list
    const canScroll=sc.scrollHeight-sc.clientHeight-sc.scrollTop;
    return{sc,need,extra:Math.max(0,need-canScroll+2)};
  }
  let spacer=null;
  function lift(x){
    const p=liftPlan(x);if(!p)return;
    if(p.extra){dropSpacer(true);spacer={sc:p.sc,el:document.createElement('div'),top0:p.sc.scrollTop};spacer.el.className='kbs-spacer';spacer.el.style.height=p.extra+'px';p.sc.appendChild(spacer.el);}
    try{p.sc.scrollBy({top:p.need,behavior:'smooth'});}catch(e){p.sc.scrollTop+=p.need;}
  }
  // the extra room goes away once the keyboard has: the panel glides back first so nothing snaps
  function dropSpacer(now){
    const sp=spacer;if(!sp)return;spacer=null;
    if(now||!sp.el.isConnected){sp.el.remove();return;}
    try{sp.sc.scrollTo({top:sp.top0,behavior:'smooth'});}catch(e){sp.sc.scrollTop=sp.top0;}
    setTimeout(()=>sp.el.remove(),380);
  }

  // ── the box being typed into ──
  let A=null,busy=false;
  const isNum=x=>(x.getAttribute('type')||'').toLowerCase()==='number';
  function fire(x,type,Ctor,opts){try{x.dispatchEvent(new (Ctor||Event)(type,opts||{bubbles:true}));}catch(e){try{const ev=document.createEvent('Event');ev.initEvent(type,!!(opts?opts.bubbles:true),false);x.dispatchEvent(ev);}catch(e2){}}}
  function prep(c,x){
    if(c===catT){c.maxLength=x.maxLength>0?x.maxLength:524288;c.setAttribute('autocapitalize',x.getAttribute('autocapitalize')||'sentences');
      c.setAttribute('enterkeyhint',x.getAttribute('enterkeyhint')||((x.getAttribute('type')||'')==='search'?'search':'done'));}
    else{const st=x.getAttribute('step')||'',mn=parseFloat(x.getAttribute('min'));c.setAttribute('inputmode',(/\./.test(st)||mn<0)?'decimal':'numeric');}
  }
  function activate(x,from){
    const c=isNum(x)?catN:catT;
    if(A&&A.x===x){
      // tapped the box that's already being typed in. Keyboard up: caret to the end. Keyboard not up yet (the game
      // opened the box itself, e.g. BPM): just bring the keyboard up and keep what's selected, so typing replaces it.
      const up=kbUp();let s0=null,e0=null;try{s0=A.c.selectionStart;e0=A.c.selectionEnd;}catch(e){}
      if(from==='tap'&&!up){busy=true;try{nBlur.call(A.c);}catch(e){}busy=false;}
      if(document.activeElement!==A.c){busy=true;try{nFocus.call(A.c,{preventScroll:true});}catch(e){try{nFocus.call(A.c);}catch(e2){}}busy=false;}
      try{if(from==='tap'&&up){const n=A.c.value.length;nSSR.call(A.c,n,n);}else if(s0!=null)nSSR.call(A.c,s0,e0);}catch(e){}
      paint(true);return;
    }
    if(A)release(A.c===c);                                    // switching boxes: keep the keyboard up when we can
    if(!kbUp())restH=window.innerHeight||restH;
    let preAll=false;try{preAll=x.value.length>0&&x.selectionStart===0&&x.selectionEnd===x.value.length;}catch(e){}
    prep(c,x);c.value=x.value;
    A={x,c,start:x.value,mirror:x.value};
    x.classList.add('kbs-on');
    busy=true;
    try{nFocus.call(c,{preventScroll:true});}catch(e){try{nFocus.call(c);}catch(e2){}}
    busy=false;
    try{if(isNum(x)||preAll)nSelect.call(c);else{const n=c.value.length;nSSR.call(c,n,n);}}catch(e){}
    fire(x,'focus',window.FocusEvent,{bubbles:false});fire(x,'focusin',window.FocusEvent,{bubbles:true});
    kick();
  }
  // end typing in the current box: it gets 'change' (if edited) and 'blur', like a real box losing focus
  function release(keepKeyboard){
    const a=A;if(!a)return;A=null;
    a.x.classList.remove('kbs-on','kbs-all');caretEl.style.display='none';
    if(!keepKeyboard&&document.activeElement===a.c){busy=true;try{nBlur.call(a.c);}catch(e){}busy=false;}
    if(!keepKeyboard||document.activeElement!==a.c)setTimeout(()=>{if(!A)dropSpacer(false);},120);
    if(a.x.value!==a.start)fire(a.x,'change');
    fire(a.x,'blur',window.FocusEvent,{bubbles:false});fire(a.x,'focusout',window.FocusEvent,{bubbles:true});
  }

  // the catchers pass everything on to the box being typed into
  [catT,catN].forEach(c=>{
    c.addEventListener('input',()=>{
      if(!A||A.c!==c)return;
      if(c===catN){const clean=c.value.replace(c.getAttribute('inputmode')==='decimal'?/[^0-9.\-]/g:/[^0-9]/g,'').slice(0,8);if(clean!==c.value)c.value=clean;}
      A.x.value=c.value;A.mirror=A.x.value;fire(A.x,'input');paint(true);
    });
    ['keydown','keyup'].forEach(type=>c.addEventListener(type,e=>{
      if(!A||A.c!==c)return;
      let ev;try{ev=new KeyboardEvent(type,{key:e.key,code:e.code,bubbles:true,cancelable:true,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,altKey:e.altKey,metaKey:e.metaKey,repeat:e.repeat});}catch(err){return;}
      try{Object.defineProperty(ev,'keyCode',{get:()=>e.keyCode});Object.defineProperty(ev,'which',{get:()=>e.which});}catch(err){}
      const x=A.x;const ok=x.dispatchEvent(ev);
      if(!ok)e.preventDefault();
      e.stopPropagation();                                   // the box's copy of the key already went up the page
    }));
    c.addEventListener('blur',()=>{if(busy)return;setTimeout(()=>{if(A&&A.c===c&&document.activeElement!==c)release(true);},0);});
  });

  // the game's code calling .focus() / .blur() / .select() on a box still does what it expects
  P.focus=function(o){if(!busy&&!this._kbs&&eligible(this,true)){lift(this);activate(this,'code');return;}return nFocus.call(this,o);};
  P.blur=function(){if(A&&A.x===this){release(false);return;}return nBlur.call(this);};
  P.select=function(){if(A&&A.x===this){try{nSelect.call(A.c);}catch(e){}paint(true);return;}return nSelect.call(this);};
  P.setSelectionRange=function(a,b,d){if(A&&A.x===this){try{nSSR.call(A.c,a,b,d);}catch(e){}paint(true);return;}return nSSR.apply(this,arguments);};

  // ── a tap on a text box: steer it to the catcher (taps that turn into scrolls are left alone) ──
  const starts={};
  document.addEventListener('touchstart',e=>{for(const t of e.changedTouches)starts[t.identifier]=[t.clientX,t.clientY,performance.now()];},{passive:true,capture:true});
  document.addEventListener('touchend',e=>{
    const x=e.target;if(!isTextish(x))return;
    const t=e.changedTouches[0],s=t&&starts[t.identifier];if(t)delete starts[t.identifier];
    if(!t||e.touches.length||!s)return;
    if(Math.hypot(t.clientX-s[0],t.clientY-s[1])>10||performance.now()-s[2]>650)return;   // a scroll or a long-press
    if(A&&A.x===x){e.preventDefault();activate(x,'tap');return;}
    if(!eligible(x,true))return;                              // would be hidden by the keyboard: let the browser handle it
    e.preventDefault();lift(x);activate(x,'tap');
  },{passive:false,capture:true});

  // ── drawing: focus ring + caret on the box (or a highlight when everything is selected) ──
  const meas=document.createElement('canvas').getContext('2d');
  let raf=0,lastKey='';
  function kick(){lastKey='';if(!raf)raf=requestAnimationFrame(loop);}
  function hiddenNow(x){
    if(!x.isConnected)return true;
    if(!x.getClientRects().length)return true;               // display:none somewhere above it
    return false;
  }
  function loop(){
    raf=0;const a=A;if(!a)return;
    if(hiddenNow(a.x)){release(false);return;}               // its panel closed / it was removed: stop typing, keyboard down
    if(a.x.value!==a.mirror){a.c.value=a.x.value;a.mirror=a.x.value;const n=a.c.value.length;try{nSSR.call(a.c,n,n);}catch(e){}}   // the game changed it
    paint(false);raf=requestAnimationFrame(loop);
  }
  function paint(force){
    const a=A;if(!a)return;const x=a.x,c=a.c,v=c.value;
    let s=v.length,e=v.length;try{if(c.selectionStart!=null){s=c.selectionStart;e=c.selectionEnd;}}catch(err){}
    const all=v.length>0&&s===0&&e===v.length;
    const r=x.getBoundingClientRect();
    const key=[v,s,e,Math.round(r.left),Math.round(r.top),Math.round(r.width),document.activeElement===c].join('|');
    if(!force&&key===lastKey)return;lastKey=key;
    x.classList.toggle('kbs-all',all);
    if(all||s!==e||document.activeElement!==c){caretEl.style.display='none';return;}
    const cs=getComputedStyle(x),fs=parseFloat(cs.fontSize)||16;
    meas.font=(cs.fontStyle||'normal')+' '+(cs.fontWeight||'400')+' '+fs+'px '+(cs.fontFamily||'sans-serif');
    let txt=v;const tt=cs.textTransform;if(tt==='uppercase')txt=txt.toUpperCase();else if(tt==='lowercase')txt=txt.toLowerCase();
    const ls=parseFloat(cs.letterSpacing)||0;
    const wid=str=>meas.measureText(str).width+ls*str.length;
    const pl=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.borderLeftWidth)||0),pr=(parseFloat(cs.paddingRight)||0)+(parseFloat(cs.borderRightWidth)||0);
    const inner=r.width-pl-pr,full=wid(txt),upto=wid(txt.slice(0,s));
    const al=cs.textAlign;let x0=r.left+pl;
    if(full<inner){if(al==='center'||al==='-webkit-center')x0+=(inner-full)/2;else if(al==='right'||al==='end')x0+=inner-full;}
    let cx=Math.min(r.left+pl+inner,x0+upto)+(s>0&&ls>0?-ls/2:0);
    const h=Math.min(fs*1.15,r.height-6),cy=r.top+(r.height-h)/2;
    // only draw it when the box is actually showing there (not under a panel, not scrolled away)
    const hit=document.elementFromPoint(Math.max(0,Math.min(innerWidth-1,cx)),Math.max(0,Math.min(innerHeight-1,cy+h/2)));
    if(hit!==x&&!(hit&&x.contains(hit))){caretEl.style.display='none';return;}
    caretEl.style.cssText='display:block;left:'+Math.round(cx-1)+'px;top:'+Math.round(cy)+'px;height:'+Math.round(h)+'px;background:'+cs.color+';';
    caretEl.classList.remove('kbs-blink');void caretEl.offsetWidth;caretEl.classList.add('kbs-blink');   // solid while typing, then blinks
  }
  window.addEventListener('resize',()=>{if(A)paint(true);});
  window.kbsActiveBox=()=>A&&A.x;
  window.__kbs={eligible,liftPlan,room,scroller,roomAbove};
})();
