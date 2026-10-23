// ══════════════════════════════════════════════
//  OLD-SAFARI FALLBACKS (iOS 13/14 and similar)
//  Only does anything on browsers that lack flex `gap` or CSS `aspect-ratio`.
// ══════════════════════════════════════════════
(function(){
  function flexGapSupported(){
    try{
      const f=document.createElement('div');
      f.style.cssText='display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden;';
      f.appendChild(document.createElement('div'));f.appendChild(document.createElement('div'));
      document.body.appendChild(f);const ok=f.scrollHeight===1;document.body.removeChild(f);return ok;
    }catch(e){return true;}
  }
  const needGap=!flexGapSupported();
  const needAspect=!(window.CSS&&CSS.supports&&CSS.supports('aspect-ratio','1/1'));
  if(!needGap&&!needAspect)return;
  document.documentElement.classList.add('legacy-safari');

  // ── flex gap: turn each gap into margins between the children ──
  let gapSelectors=null;
  function collectGapSelectors(){
    const sels=['[style*="gap"]'];
    for(const sheet of document.styleSheets){
      let rules;try{rules=sheet.cssRules;}catch(e){continue;}
      if(!rules)continue;
      for(const r of rules){
        if(r.style&&(r.style.gap||r.style.rowGap||r.style.columnGap)&&r.selectorText)sels.push(r.selectorText);
      }
    }
    return sels;
  }
  function applyGaps(){
    if(!gapSelectors)gapSelectors=collectGapSelectors();
    const seen=new Set();
    gapSelectors.forEach(sel=>{
      let list;try{list=document.querySelectorAll(sel);}catch(e){return;}
      list.forEach(el=>{
        if(seen.has(el))return;seen.add(el);
        const cs=getComputedStyle(el);
        if(cs.display.indexOf('flex')<0)return;
        const rg=parseFloat(cs.rowGap)||0,cg=parseFloat(cs.columnGap)||0;
        if(!rg&&!cg)return;
        const col=cs.flexDirection.indexOf('column')===0;
        const wrap=cs.flexWrap!=='nowrap';
        let first=true;
        for(const ch of el.children){
          const pos=getComputedStyle(ch);
          if(pos.position==='absolute'||pos.position==='fixed'||pos.display==='none')continue;
          function put(prop,val){
            if(ch._gp&&ch._gp[prop]!==undefined){if(ch._gp[prop]!==val){ch.style[prop]=val+'px';ch._gp[prop]=val;}return;}
            if(parseFloat(pos[prop])!==0)return; // child has its own margin there — leave it
            ch._gp=ch._gp||{};ch._gp[prop]=val;if(val)ch.style[prop]=val+'px';
          }
          if(wrap){put('marginRight',cg);put('marginBottom',rg);}
          else if(col){put('marginTop',first?0:rg);}
          else{put('marginLeft',first?0:cg);}
          first=false;
        }
      });
    });
  }

  // ── aspect-ratio: size by width ──
  function padRatio(){
    const b=document.body.classList;
    if(b.contains('desktop-mode'))return 4/3;
    return 1.4;
  }
  function applyAspect(){
    const rules=[['.pad',padRatio()],['.alien-cell',1],['.egg-cell',1],['.match-card',3/4],['.seq-arr-bar',1.6]];
    rules.forEach(([sel,ratio])=>{
      document.querySelectorAll(sel).forEach(el=>{
        const w=el.getBoundingClientRect().width;
        if(!w)return;
        const h=Math.round(w/ratio);
        if(el._arH!==h){el.style.height=h+'px';el._arH=h;}
      });
    });
  }

  let t=null;
  function run(){
    t=null;
    try{if(needGap)applyGaps();if(needAspect)applyAspect();}catch(e){}
  }
  function schedule(){if(!t)t=setTimeout(run,120);}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  addEventListener('resize',schedule);
  addEventListener('orientationchange',schedule);
  setInterval(run,1500); // catch-all
  run();
})();
