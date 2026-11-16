
// ══════════════════════════════════════════════
//  STORE UNLOCK LADDERS
//  ALIEN PARTY     — appears in the store once you first reach 5M points. Buying it adds the ALIEN PARTY
//                    button (Glow); every next level adds a party style, each ×10 the price.
//  🎚 SEQUENCER UPGRADES — under the Sequencer card once it's unlocked: BPM control → 32 steps → 64 steps
//                    → Arrangement tab → Song tab. (These used to be skill-tree nodes.)
// ══════════════════════════════════════════════
const PARTY_LADDER=[
  {style:'glow',  cost:1e6,  main:'ALIEN PARTY',        sub:'Adds the ALIEN PARTY button: your aliens glow and bounce to the beat'},
  {style:'orbit', cost:5e7,  main:'DISCO ORBIT',      sub:'New party style: aliens spin in a ring around your score'},
  {style:'conga', cost:5e8,  main:'CONGA LINE',       sub:'New party style: a figure-8 conga line, hopping on the beat'},
  {style:'eq',    cost:5e9,  main:'EQ BARS',          sub:'New party style: aliens line up as a live EQ meter for your music'},
  {style:'bounce',cost:5e10, main:'BOUNCE HOUSE',     sub:'New party style: each instrument gets its own aliens, who jump when it plays'},
  {style:'galaxy',cost:5e11, main:'GALAXY',           sub:'New party style: a spinning spiral galaxy that breathes with the bar'},
  {style:'hop',   cost:5e12, main:'PLANET HOP',       sub:'New party style: your aliens run along the sequencer, hopping on every beat and double jumping on beat 4'},
];
const PARTY_REVEAL_AT=1e6;   // (v0.2.149: the party is "level 3" at 1M, teased on screen by js/69)
const SEQ_FEATS=[
  {id:'bpm',    cost:1e7,   main:'BPM CONTROL',      sub:'Speed the sequencer up or slow it down (− / + next to play)'},
  {id:'steps32',cost:3.2e7, main:'32 STEPS',         sub:'Double the loop to 2 bars · switch with the STEPS button'},
  {id:'steps64',cost:6.4e7, main:'64 STEPS',         sub:'A full 4-bar loop'},
  {id:'arrange',cost:1e10,  main:'ARRANGEMENT TAB',  sub:'Chain saved patterns into an arrangement (PAT / ARR switch)'},
  {id:'song',   cost:1e13,  main:'SONG TAB',         sub:'Line up whole arrangements into a song'},
];
function seqFeatHas(id){const i=SEQ_FEATS.findIndex(f=>f.id===id);return i>=0&&(shop.seqFeat||0)>i;}
function bpmLocked(){return !seqFeatHas('bpm');}
function partyOwnedStyles(){return PARTY_LADDER.slice(0,Math.max(0,shop.partyLevel||0)).map(l=>l.style);}

(function(){
  const $=id=>document.getElementById(id);
  function card(id,title,sub){
    const d=document.createElement('div');d.className='drum-card store-ladder-card';d.id=id;
    d.innerHTML=`<div class="drum-card-header"><div class="drum-card-title">${title}</div><div class="drum-card-sub" id="${id}Sub">${sub}</div></div>
      <div class="drum-buy-btn" id="${id}Btn"><div class="drum-counter"><div class="drum-counter-num" id="${id}Num">0</div><div class="drum-counter-lbl" id="${id}Lbl"></div></div>
      <div class="upgrade-effect"><div class="upgrade-effect-main" id="${id}Main"></div><div class="upgrade-effect-sub" id="${id}Sub2"></div></div>
      <div class="drum-price" id="${id}Price"></div></div>`;
    return d;
  }
  // party card sits right beside PET ALIEN BUDDY, built the same way so the two line up (with a little disco ball);
  // sequencer upgrades right under the Sequencer card
  const partyCard=document.createElement('div');partyCard.className='alien-store-card party-store-card';partyCard.id='partyStoreCard';
  partyCard.innerHTML=`<span class="psc-ball" aria-hidden="true"></span>
    <div class="alien-card-info"><div class="alien-card-name">ALIEN PARTY</div>
      <div class="alien-card-stats">STYLES: <span id="partyStoreCardNum">0</span>/${PARTY_LADDER.length}</div>
      <div class="psc-next" id="partyStoreCardMain"></div></div>
    <div class="alien-card-price" id="partyStoreCardPrice"></div>`;
  const ab=$('alienBuyBtn');if(ab)ab.after(partyCard);
  const seqUpCard=card('seqUpCard','🎚 SEQUENCER UPGRADES','New controls for your sequencer');
  const sc=$('seqCard');if(sc)sc.after(seqUpCard);

  function paint(pre,owned,total,lbl,next,maxMain,maxSub){
    $(pre+'Num').textContent=owned;$(pre+'Lbl').textContent=lbl;
    const btn=$(pre+'Btn'),pr=$(pre+'Price');
    if(!next){
      btn.className='drum-buy-btn maxed';$(pre+'Main').textContent=maxMain;$(pre+'Sub2').textContent=maxSub;pr.className='drum-price';pr.textContent='MAX';return;
    }
    const can=score>=next.cost;
    btn.className='drum-buy-btn '+(can?'buyable':'locked');
    $(pre+'Main').textContent=next.main;$(pre+'Sub2').textContent=next.sub;
    pr.className='drum-price'+(can?'':' cant-afford');
    pr.innerHTML=`${wHtml(next.cost)}`;
  }
  window.renderStoreUnlocks=function(){
    // ── party ──
    if(!shop.partySeen&&score>=PARTY_REVEAL_AT)shop.partySeen=true;
    const pl=shop.partyLevel||0;
    // v0.2.166: two ways in: the disco ball on the drum page, or this card (shown as soon as the sequencer is in)
    partyCard.style.display=(shop.partySeen||pl>0||(typeof drum!=='undefined'&&drum.seqTracks>=1))?'':'none';
    {const next=PARTY_LADDER[pl],can=!!next&&score>=next.cost;
      $('partyStoreCardNum').textContent=pl;
      $('partyStoreCardMain').textContent=!next?'EVERY STYLE':pl===0?'UNLOCK THE PARTY':'NEXT: '+next.main;
      partyCard.title=next?next.sub:'All '+PARTY_LADDER.length+' styles unlocked · pick one from the PARTY menu';
      partyCard.className='alien-store-card party-store-card '+(!next?'maxed':can?'buyable':'locked');
      const pr=$('partyStoreCardPrice');pr.className='alien-card-price'+(!next||can?'':' cant-afford');
      pr.innerHTML=next?`${wHtml(next.cost)}`:'MAX';}
    // ── sequencer ──
    const sf=shop.seqFeat||0;
    seqUpCard.style.display=(typeof drum!=='undefined'&&drum.seqTracks>0)?'':'none';
    paint('seqUpCard',sf,SEQ_FEATS.length,'UPGRADES',SEQ_FEATS[sf],'ALL UPGRADES','BPM, 32 / 64 steps, Arrangement and Song tabs');
  };

  function buyParty(){
    const pl=shop.partyLevel||0,next=PARTY_LADDER[pl];if(!next||score<next.cost)return;
    score-=next.cost;shop.partyLevel=pl+1;
    if(typeof playSfxPurchase==='function')playSfxPurchase();if(typeof flashBuy==='function')flashBuy('#ff00cc');
    if(pl===0){const toast=showToast,msg=()=>toast('ALIEN PARTY unlocked! Tap the button to get your aliens dancing.');
      if(typeof playPartyUnlockFx==='function'){const fx=playPartyUnlockFx;setTimeout(()=>fx(msg),60);}else msg();}
    else{showToast(next.main+' unlocked! Pick it from the PARTY menu.');if(typeof setPartyStyle==='function'&&partyMode)setPartyStyle(next.style);}
    if(typeof refreshPartyAccess==='function')refreshPartyAccess();
    if(typeof renderUI==='function')renderUI();else renderStoreUnlocks();
    if(typeof autoSave==='function')autoSave();
  }
  window.buyPartyNext=buyParty;   // (the level 3 teaser on the drum pads screen buys through this too)
  function buySeqFeat(){
    const sf=shop.seqFeat||0,next=SEQ_FEATS[sf];if(!next||score<next.cost)return;
    score-=next.cost;shop.seqFeat=sf+1;
    if(typeof playSfxPurchase==='function')playSfxPurchase();if(typeof flashBuy==='function')flashBuy('#a0a8ff');
    const toasts={bpm:'⏱ BPM control unlocked: use − / + next to play (double-tap the number to type one).',steps32:'🔢 32 steps unlocked! Your beat stays as it is. Use the STEPS button to switch.',steps64:'🔢 64 steps unlocked! Your beat stays as it is. Use the STEPS button to switch.',arrange:'🧩 Arrangement tab unlocked: PAT / ARR switch at the top of the sequencer.',song:'💿 SONG tab unlocked next to PAT / ARR.'};
    showToast(toasts[next.id]);
    if(typeof applyMusicUnlocks==='function')applyMusicUnlocks(next.id==='steps32'?'mt_steps32':next.id==='steps64'?'mt_steps64':null,true);
    if(typeof renderUI==='function')renderUI();else renderStoreUnlocks();
    if(typeof autoSave==='function')autoSave();
  }
  addEP('partyStoreCard',buyParty);
  addEP('seqUpCardBtn',buySeqFeat);
  renderStoreUnlocks();
})();
