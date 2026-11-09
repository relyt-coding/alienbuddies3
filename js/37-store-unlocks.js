
// ══════════════════════════════════════════════
//  STORE UNLOCK LADDERS
//  ALIEN PARTY     — appears in the store once you first reach 5M points. Buying it adds the ALIEN PARTY
//                    button (Glow); every next level adds a party style, each ×10 the price.
//  🎚 SEQUENCER UPGRADES — under the Sequencer card once it's unlocked: BPM control → 32 steps → 64 steps
//                    → Arrangement tab → Song tab. (These used to be skill-tree nodes.)
// ══════════════════════════════════════════════
const PARTY_LADDER=[
  {style:'glow',  cost:5e6,  main:'ALIEN PARTY',        sub:'Adds the ALIEN PARTY button: your aliens glow and bounce to the beat'},
  {style:'orbit', cost:5e7,  main:'DISCO ORBIT',      sub:'New party style: aliens spin in a ring around your score'},
  {style:'conga', cost:5e8,  main:'CONGA LINE',       sub:'New party style: a figure-8 conga line, hopping on the beat'},
  {style:'eq',    cost:5e9,  main:'EQ BARS',          sub:'New party style: aliens line up as a live EQ meter for your music'},
  {style:'bounce',cost:5e10, main:'BOUNCE HOUSE',     sub:'New party style: each instrument gets its own aliens, who jump when it plays'},
  {style:'galaxy',cost:5e11, main:'GALAXY',           sub:'New party style: a spinning spiral galaxy that breathes with the bar'},
];
const PARTY_REVEAL_AT=5e6;
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
  // party card goes right under PET ALIEN BUDDY; sequencer upgrades right under the Sequencer card
  const partyCard=card('partyStoreCard','ALIEN PARTY','Party modes for your aliens');
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
    pr.innerHTML=`${formatStore(next.cost)}<small>pts</small>`;
  }
  window.renderStoreUnlocks=function(){
    // ── party ──
    if(!shop.partySeen&&score>=PARTY_REVEAL_AT)shop.partySeen=true;
    const pl=shop.partyLevel||0;
    partyCard.style.display=(shop.partySeen||pl>0)?'':'none';
    paint('partyStoreCard',pl,PARTY_LADDER.length,'STYLES',PARTY_LADDER[pl],'EVERY PARTY STYLE','All '+PARTY_LADDER.length+' styles unlocked · switch with the chip next to ALIEN PARTY');
    // ── sequencer ──
    const sf=shop.seqFeat||0;
    seqUpCard.style.display=(typeof drum!=='undefined'&&drum.seqTracks>0)?'':'none';
    paint('seqUpCard',sf,SEQ_FEATS.length,'UPGRADES',SEQ_FEATS[sf],'ALL UPGRADES','BPM, 32 / 64 steps, Arrangement and Song tabs');
  };

  function buyParty(){
    const pl=shop.partyLevel||0,next=PARTY_LADDER[pl];if(!next||score<next.cost)return;
    score-=next.cost;shop.partyLevel=pl+1;
    if(typeof playSfxPurchase==='function')playSfxPurchase();if(typeof flashBuy==='function')flashBuy('#ff00cc');
    if(pl===0)showToast('ALIEN PARTY unlocked! Tap the button to get your aliens dancing.');
    else{showToast(next.main+' unlocked! Tap the style chip during a party to switch.');if(typeof setPartyStyle==='function'&&partyMode)setPartyStyle(next.style);}
    if(typeof refreshPartyAccess==='function')refreshPartyAccess();
    if(typeof renderUI==='function')renderUI();else renderStoreUnlocks();
    if(typeof autoSave==='function')autoSave();
  }
  function buySeqFeat(){
    const sf=shop.seqFeat||0,next=SEQ_FEATS[sf];if(!next||score<next.cost)return;
    score-=next.cost;shop.seqFeat=sf+1;
    if(typeof playSfxPurchase==='function')playSfxPurchase();if(typeof flashBuy==='function')flashBuy('#a0a8ff');
    const toasts={bpm:'⏱ BPM control unlocked: use − / + next to play (double-tap the number to type one).',steps32:'🔢 32 steps! Switch loop length with the STEPS button.',steps64:'🔢 64 steps! Switch loop length with the STEPS button.',arrange:'🧩 Arrangement tab unlocked: PAT / ARR switch at the top of the sequencer.',song:'💿 SONG tab unlocked next to PAT / ARR.'};
    showToast(toasts[next.id]);
    if(typeof applyMusicUnlocks==='function')applyMusicUnlocks(next.id==='steps32'?'mt_steps32':next.id==='steps64'?'mt_steps64':null,true);
    if(typeof renderUI==='function')renderUI();else renderStoreUnlocks();
    if(typeof autoSave==='function')autoSave();
  }
  addEP('partyStoreCardBtn',buyParty);
  addEP('seqUpCardBtn',buySeqFeat);
  renderStoreUnlocks();
})();
