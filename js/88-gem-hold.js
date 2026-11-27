// ══════════════════════════════════════════════
//  HOLD TO SPEND GEMS (v0.2.204)
//  Everything you buy with Alien Gems in the skill tree is now bought by HOLDING its UNLOCK button for 1.4 s, like the
//  galaxy launch (js/59): the button fills up, shakes a little, an engine-ish note rises, and at the top it bursts and buys.
//  Let go early and it powers back down. A plain tap just nudges ("HOLD!"). Puzzles, WATCH AGAIN and locked buttons are
//  untouched (only a button whose text starts with UNLOCK is a hold button).
//  Also: tapping the gem ring on the drum pads screen (js/71) opens ALIEN GEM MATH (js/72 openGemStats), which now ends
//  with a "hold Alien Gem buttons down to unlock them" line.
// ══════════════════════════════════════════════
(function(){
  const HOLD=1.4;
  const btn=document.getElementById('stDetailBuyBtn');
  let hold=null,allow=false;
  const holdable=()=>btn&&!btn.disabled&&!btn.classList.contains('replay')&&!btn.classList.contains('owned')&&/^\s*(HOLD TO )?UNLOCK/i.test(btn.textContent);
  function hum(){try{const c=getCtx();if(!c||!masterGainNode)return null;const t=c.currentTime;
    const o=c.createOscillator(),o2=c.createOscillator(),lp=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o2.type='square';o2.detune.value=1200;
    o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(330,t+HOLD);o2.frequency.setValueAtTime(110,t);o2.frequency.exponentialRampToValueAtTime(330,t+HOLD);
    lp.type='lowpass';lp.frequency.setValueAtTime(300,t);lp.frequency.exponentialRampToValueAtTime(3200,t+HOLD);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.2);
    o.connect(lp);o2.connect(lp);lp.connect(g);g.connect(masterGainNode);o.start(t);o2.start(t);
    return{stop(fast){const n=c.currentTime;g.gain.cancelScheduledValues(n);g.gain.setValueAtTime(g.gain.value,n);g.gain.linearRampToValueAtTime(0,n+(fast?.04:.22));o.stop(n+.3);o2.stop(n+.3);}};}catch(e){return null;}}
  function ding(){try{const c=getCtx();if(!c||!masterGainNode)return;const t=c.currentTime;
    [[0,987.77],[.06,1318.51],[.12,1975.53]].forEach(([d,f])=>{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=f;
      g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(.07,t+d+.008);g.gain.exponentialRampToValueAtTime(.0005,t+d+.6);o.connect(g);g.connect(masterGainNode);o.start(t+d);o.stop(t+d+.65);});}catch(e){}}
  function setP(p){btn.style.setProperty('--hp',p.toFixed(3));btn.classList.toggle('gh-charging',p>0);
    const sh=p>.2?p*p*2:0;btn.style.transform=sh?`translate(${((Math.random()-.5)*sh).toFixed(2)}px,${((Math.random()-.5)*sh).toFixed(2)}px)`:'';}
  function tick(now){if(!hold)return;const p=Math.min(1,(now-hold.t0)/1000/HOLD);setP(p);
    if(p>=1){const h=hold;hold=null;h.hum&&h.hum.stop(true);setP(0);ding();if(navigator.vibrate)try{navigator.vibrate(35);}catch(e){}
      btn.classList.add('gh-burst');setTimeout(()=>btn.classList.remove('gh-burst'),500);
      allow=true;btn.click();allow=false;return;}
    hold.raf=requestAnimationFrame(tick);}
  function start(e){if(!holdable()||hold)return;if(e.cancelable)e.preventDefault();hold={t0:performance.now(),hum:hum()};hold.raf=requestAnimationFrame(tick);}
  function end(){if(!hold)return;const h=hold;hold=null;cancelAnimationFrame(h.raf);h.hum&&h.hum.stop();
    const p0=parseFloat(btn.style.getPropertyValue('--hp'))||0,t0=performance.now();
    if(p0<.12){btn.classList.remove('gh-nudge');void btn.offsetWidth;btn.classList.add('gh-nudge');}
    (function down(now){const p=Math.max(0,p0-(now-t0)/1000/.3*p0);setP(p);if(p>0)requestAnimationFrame(down);})(t0);}
  if(btn){
    btn.addEventListener('pointerdown',start);['pointerup','pointercancel','pointerleave'].forEach(ev=>btn.addEventListener(ev,end));
    btn.addEventListener('contextmenu',e=>{if(holdable())e.preventDefault();});
    // a plain click on a hold button doesn't buy (only the finished hold does)
    btn.addEventListener('click',e=>{if(holdable()&&!allow){e.stopImmediatePropagation();e.preventDefault();}},true);
    // the label says what to do
    const _d=window.openStDetail||openStDetail;
    const wrap=function(){const r=_d.apply(this,arguments);if(holdable()&&!/^HOLD/.test(btn.textContent))btn.textContent='HOLD TO '+btn.textContent.trim();return r;};
    window.openStDetail=wrap;try{openStDetail=wrap;}catch(e){}
  }

  // v0.2.222: the gem ring no longer opens the gem math (that's the gem counters in the Bunker / Fusebox, and the score breakdown);
  //   once space is open it's the SPACE button (js/71: tap = map, hold = the launch again)
  if(typeof openGemStats==='function'){const og=openGemStats;window.openGemStats=function(){const r=og.apply(this,arguments);
    const L=document.getElementById('scoreStatsList');
    if(L&&!L.querySelector('.gh-tip')){const d=document.createElement('div');d.className='gh-tip';d.textContent='HOLD ALIEN GEM BUTTONS DOWN TO UNLOCK THEM';L.appendChild(d);}
    return r;};try{openGemStats=window.openGemStats;}catch(e){}}

  const css=document.createElement('style');css.textContent=`
#stDetailBuyBtn{position:relative;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation;}
#stDetailBuyBtn::before{content:'';position:absolute;left:0;top:0;bottom:0;width:calc(var(--hp,0)*100%);background:linear-gradient(90deg,rgba(0,255,170,.25),rgba(140,255,230,.55));pointer-events:none;}
#stDetailBuyBtn.gh-charging{box-shadow:0 0 calc(6px + var(--hp,0)*26px) rgba(120,255,220,.8);}
#stDetailBuyBtn.gh-burst{animation:ghBurst .45s ease-out;}
#stDetailBuyBtn.gh-nudge{animation:ghNudge .35s ease-in-out;}
@keyframes ghBurst{0%{transform:scale(1.08);box-shadow:0 0 40px rgba(150,255,230,1);}100%{transform:none;}}
@keyframes ghNudge{25%{transform:translateX(-4px);}75%{transform:translateX(4px);}}
body.stats-open #gemRing{display:none !important;}
.gh-tip{margin:12px 4px 2px;padding:8px 10px;border:1px dashed rgba(93,255,192,.45);border-radius:10px;text-align:center;
  font-family:'Bebas Neue',sans-serif;letter-spacing:.1em;font-size:.95rem;color:#5dffc0;}`;
  document.head.appendChild(css);
})();
