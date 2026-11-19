// ══════════════════════════════════════════════
//  EXTRA BUNKERS (v0.2.188)
//  A late Shop upgrade (Tier 3, shows once your first bunker is full): EXTRA BUNKER opens one more bunker each time,
//  up to 10 (10 × 99 = 990 buddies). Pokémon-box style: ‹ 1 / 10 › at the top of the Bunker, each bunker has a name
//  (tap it to rename) and a colour theme (tap the swatch to change it). Tap a buddy and its card gets a MOVE TO row to
//  sort it into another bunker (only bunkers with room).
//
//  Data: bunkersOwned (1–10) and bunkerMeta [{name,theme}] in js/02; alienData[i].box = the bunker a buddy lives in.
//  A buddy with no box (every buddy from before this) lives in bunker floor(i/99) = bunker 1. New buddies go to the
//  first bunker with room (bunkerAssign, called from js/16 buyAlien). js/12 renderBunkerView draws bunkerIds(viewing).
//  Economy (js/01 + js/02): buddy 100+ costs 12% more than the one before; buddies past 99 add ×1.01 energy each and the
//  usual 1 gem a minute, so 990 buddies can never overflow the numbers. Bunker k costs 20× buddy #(99·(k-1)).
// ══════════════════════════════════════════════
const BUNKER_THEMES=[
  {id:'',      name:'BUNKER',   acc:'#00ff88',bg:'#0f1a13',edge:'#1a2a1f'},
  {id:'cosmic',name:'COSMIC',   acc:'#b48aff',bg:'#140f22',edge:'#2a1f44'},
  {id:'ocean', name:'OCEAN',    acc:'#3fd0ff',bg:'#0b1824',edge:'#163448'},
  {id:'sunset',name:'SUNSET',   acc:'#ff9f5a',bg:'#22140c',edge:'#44281a'},
  {id:'lava',  name:'LAVA',     acc:'#ff5a3d',bg:'#220c0a',edge:'#4a1a14'},
  {id:'ice',   name:'ICE',      acc:'#bfeaff',bg:'#101a22',edge:'#24384a'},
  {id:'candy', name:'CANDY',    acc:'#ff6ac0',bg:'#22101c',edge:'#4a1f3a'},
  {id:'gold',  name:'GOLD',     acc:'#ffd23f',bg:'#1e180a',edge:'#463a14'},
];
function bunkerCapacity(){return BUNKER_SIZE*Math.max(1,bunkersOwned|0);}
function bunkerOf(i){const a=alienData[i],n=Math.max(1,bunkersOwned|0);if(a&&Number.isInteger(a.box)&&a.box>=0&&a.box<n)return a.box;return Math.min(n-1,Math.floor(i/BUNKER_SIZE));}
function bunkerIds(v){const out=[];for(let i=0;i<totalAliens;i++)if(bunkerOf(i)===v)out.push(i);return out.slice(0,BUNKER_SIZE);}
function bunkerCounts(){const c=Array(Math.max(1,bunkersOwned|0)).fill(0);for(let i=0;i<totalAliens;i++)c[bunkerOf(i)]++;return c;}
function bunkerAssign(i){const c=bunkerCounts();if(alienData[i]&&Number.isInteger(alienData[i].box)&&c[alienData[i].box]<=BUNKER_SIZE)return;
  c[bunkerOf(i)]--;const v=c.findIndex(n=>n<BUNKER_SIZE);if(alienData[i])alienData[i].box=v<0?bunkerOf(i):v;}
function bunkerName(v){const m=bunkerMeta[v];return (m&&m.name)||('BUNKER #'+(v+1));}
function bunkerTheme(v){const m=bunkerMeta[v],id=m&&m.theme||'';return BUNKER_THEMES.find(t=>t.id===id)||BUNKER_THEMES[0];}
function bunkerPrice(k){return Math.max(1,alienCost(BUNKER_SIZE*(k-1)-1))*20;}   // k = the bunker you'd be opening (2..10)

(function(){
  const $=id=>document.getElementById(id);
  const save=()=>{if(typeof autoSave==='function')autoSave();};
  const toast=m=>{if(typeof showToast==='function')showToast(m);};
  const rerender=()=>{try{renderBunkerView();}catch(e){}};
  const meta=v=>{while(bunkerMeta.length<=v)bunkerMeta.push({});return bunkerMeta[v];};

  // ── ‹ 1 / 10 › bar at the top of the grid: name (tap to rename) + theme swatch ──
  const label=$('bunkerNumberLabel');
  const nav=document.createElement('div');nav.id='bxNav';nav.style.display='none';
  nav.innerHTML='<button class="bx-arrow" id="bxPrev" aria-label="Previous bunker">‹</button><input id="bxName" maxlength="14" autocomplete="off" spellcheck="false" aria-label="Bunker name"><span id="bxCount"></span><button class="bx-arrow" id="bxNext" aria-label="Next bunker">›</button><button id="bxTheme" aria-label="Bunker colour"></button>';
  if(label&&label.parentNode)label.parentNode.insertBefore(nav,label);
  function go(d){const n=bunkersOwned|0;if(n<2)return;viewingBunker=((viewingBunker|0)+d+n)%n;rerender();}
  $('bxPrev').addEventListener('click',()=>go(-1));$('bxNext').addEventListener('click',()=>go(1));
  // swipe the bar sideways to flip bunkers (the grid itself pans / zooms, so it keeps its own gestures)
  let sx=null;nav.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});
  nav.addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>40)go(dx<0?1:-1);},{passive:true});
  const nm=$('bxName');
  nm.addEventListener('change',()=>{meta(viewingBunker|0).name=nm.value.trim().toUpperCase().slice(0,14);save();rerender();});
  nm.addEventListener('keydown',e=>{if(e.key==='Enter')nm.blur();});
  $('bxTheme').addEventListener('click',()=>{const v=viewingBunker|0,cur=BUNKER_THEMES.indexOf(bunkerTheme(v)),nx=BUNKER_THEMES[(cur+1)%BUNKER_THEMES.length];meta(v).theme=nx.id;save();rerender();});
  function paintNav(){
    const multi=(bunkersOwned|0)>1,v=Math.min(viewingBunker|0,(bunkersOwned|1)-1);
    nav.style.display=multi?'':'none';if(label)label.style.display=multi?'none':'';
    const view=$('bunkerView'),th=bunkerTheme(v);
    if(view){view.style.setProperty('--bx-acc',th.acc);view.style.setProperty('--bx-bg',th.bg);view.style.setProperty('--bx-edge',th.edge);view.classList.toggle('bx-themed',multi&&!!th.id);}
    if(!multi)return;
    if(document.activeElement!==nm)nm.value=bunkerName(v);nm.style.color=th.acc;
    $('bxCount').textContent=(v+1)+' / '+bunkersOwned;$('bxTheme').style.background=th.acc;$('bxTheme').title=th.name;
  }
  if(typeof renderBunkerView==='function'){const rb=window.renderBunkerView;window.renderBunkerView=function(){
    if((viewingBunker|0)>=(bunkersOwned|0))viewingBunker=0;const r=rb.apply(this,arguments);try{paintNav();}catch(e){}return r;};}

  // ── MOVE TO row on a buddy's card ──
  const box=$('alienNameBox'),navRow=$('anmNavRow');
  const mv=document.createElement('div');mv.id='anmMoveRow';mv.style.display='none';
  if(box&&navRow)box.insertBefore(mv,navRow);
  function paintMove(){
    const i=typeof alienProfileIdx!=='undefined'?alienProfileIdx:null;
    if(i===null||(bunkersOwned|0)<2||i>=totalAliens){mv.style.display='none';return;}
    mv.style.display='';mv.innerHTML='<span>MOVE TO</span>';const c=bunkerCounts(),cur=bunkerOf(i);
    for(let v=0;v<bunkersOwned;v++){const b=document.createElement('button');b.className='anm-bx'+(v===cur?' on':'');b.textContent=v+1;b.title=bunkerName(v);
      const th=bunkerTheme(v);b.style.borderColor=th.acc;if(v===cur){b.style.background=th.acc;b.style.color='#000';}
      if(v!==cur&&c[v]>=BUNKER_SIZE){b.disabled=true;b.title+=' (full)';}
      b.addEventListener('click',()=>{if(v===cur)return;alienData[i].box=v;save();toast('Moved to '+bunkerName(v)+'.');paintMove();rerender();});
      mv.appendChild(b);}
  }
  if(typeof renderAlienProfile==='function'){const rp=window.renderAlienProfile;window.renderAlienProfile=function(){const r=rp.apply(this,arguments);try{paintMove();}catch(e){}return r;};}

  // ── Shop: EXTRA BUNKER (Tier 3), once the first bunker is full ──
  (function shop(){
    const sc=document.querySelector('#storeView .store-scroll');const row=$('tier3Row');if(!sc||!row)return;
    const c=document.createElement('div');c.className='upgrade-card';c.id='bxShopCard';c.style.borderColor='#1f4a3a';
    c.innerHTML=`<div class="upgrade-card-header" style="border-bottom-color:#1f4a3a;"><div class="upgrade-card-title" style="color:#00ff88;">EXTRA BUNKER</div><div class="upgrade-card-sub">Room for 99 more buddies. Name each bunker and give it a colour</div></div>
      <div class="upgrade-buy-btn"><div class="upgrade-counter" style="border-color:#1f4a3a;"><div class="upgrade-counter-num" style="color:#00ff88;">1/10</div><div class="upgrade-counter-lbl">BUNKERS</div></div>
      <div class="upgrade-effect"><div class="upgrade-effect-main"></div><div class="upgrade-effect-sub"></div></div><div class="upgrade-price"></div></div>`;
    row.appendChild(c);
    const q=s=>c.querySelector(s);
    function paint(){
      const show=totalAliens>=BUNKER_SIZE||(bunkersOwned|0)>1;c.style.display=show?'':'none';if(!show)return;
      const n=bunkersOwned|0,max=n>=10;
      q('.upgrade-counter-num').textContent=n+'/10';
      q('.upgrade-effect-main').textContent=max?'ALL 10 BUNKERS':'BUNKER #'+(n+1);
      q('.upgrade-effect-sub').textContent=max?'990 buddies of room':'Up to '+(BUNKER_SIZE*(n+1))+' buddies';
      q('.upgrade-price').innerHTML=max?'MAX':jHtml(bunkerPrice(n+1));
      q('.upgrade-buy-btn').className='upgrade-buy-btn '+(!max&&score>=bunkerPrice(n+1)?'buyable':'locked');
    }
    q('.upgrade-buy-btn').addEventListener('click',()=>{
      const n=bunkersOwned|0;if(n>=10)return;const p=bunkerPrice(n+1);if(score<p){toast('Not enough energy yet.');return;}
      score-=p;bunkersOwned=n+1;meta(n);
      try{if(typeof playSfxTierUnlock==='function')playSfxTierUnlock(5,1);if(typeof flashBuy==='function')flashBuy('#00ff88');}catch(e){}
      toast(bunkerName(n)+' is open! Tap its name in the Bunker to rename it.');save();paint();rerender();try{renderUI();}catch(e){}
    });
    setInterval(()=>{if(c.offsetParent!==null||c.style.display==='none')paint();},600);
  })();
})();
