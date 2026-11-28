// ══════════════════════════════════════════════
//  NEW GAME+ (v0.2.247)
//  A second, harder playthrough that lives INSIDE a file. The skill-tree node `ngp` (after Beat Defense) unlocks the door;
//  the door is a card in the Cockpit.
//  HOW IT IS A "FILE WITHIN A FILE" (no new game engine, nothing forks):
//    · Keys per slot n:  ab2_slotN = whatever you are playing right now
//                        ab2_mainN = your main game, parked while a run is live
//                        ab2_runN  = the saved run, kept while you are back in the main game
//    · Starting a run saves (js/10 goToHomeScreen), files the main save under ab2_mainN, writes a fresh run save into
//      ab2_slotN and opens it. Every screen, autosave and the file select keep working untouched.
//    · Leaving does the opposite: the run is filed under ab2_runN and the main save goes back into the slot.
//  WHAT MAKES IT HARDER: the two ACTIVATE gates are back (js/02 loader honours the run's own flags; js/86 freeSeqDots is
//  off in a run) and the run starts at absolute zero — no buddies, pads, gems, minigames or tree.
//  THE 99 ARE RE-FOUND: the run's buddies are drawn in a random order from your main file's own buddies and cloned in as
//  you hatch them (buyAlien is wrapped below), so there is no second buddy database and the faces/names are your originals.
//  FINISH (99 buddies): a special egg is written into the PARKED main save (js/77 kind 'ngp'), so it is waiting in the
//  main game's incubator, and the main save is marked for NG++ (`ngppReady`).
// ══════════════════════════════════════════════
(function(){
  if(typeof SKILL_TREE_NODES==='undefined'||typeof SKILL_MAP==='undefined')return;
  const $=id=>document.getElementById(id);
  const B=document.body.classList;
  const NGP_NODE='ngp',NGP_COST=1200000,NGP_GOAL=99;
  const mainKey=n=>'ab2_main'+n, runKey=n=>'ab2_run'+n, mainNameKey=n=>'ab2_mainname_'+n;
  const slotN=()=>Math.max(0,activeSlot|0);
  const owned=()=>!!unlockedSkills[NGP_NODE];
  const testMode=()=>typeof TEST_MODE!=='undefined'&&TEST_MODE;
  let ngpPool=[],ngpStart=0,ngpRewarded=false;

  // ── the node: after Beat Defense, pricey on purpose (you should usually have your 99 first) ──
  if(!SKILL_MAP[NGP_NODE]){
    const n={id:NGP_NODE,icon:'🔁',name:'New Game+',cost:NGP_COST,requires:['beat_defense'],x:-880,y:880,branch:'minigames',mult:0,
      desc:'Starts a second, harder climb of the whole game from zero — inside this file, with 99 buddies to find again. Your main game is parked and never touched. Unlocks the NEW GAME+ door in the Cockpit.'};
    SKILL_TREE_NODES.push(n);SKILL_MAP[NGP_NODE]=n;
  }

  // ── run saves ──
  function buddyPool(n){
    let main=null;try{main=JSON.parse(localStorage.getItem(mainKey(n))||'null');}catch(e){}
    const out=[];
    if(main&&Array.isArray(main.alienData)){
      const list=main.alienData.slice(0,Math.max(0,Math.min(NGP_GOAL,+main.totalAliens||0))).filter(a=>a&&typeof a==='object');
      for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=list[i];list[i]=list[j];list[j]=t;}
      list.forEach(a=>{try{out.push(JSON.parse(JSON.stringify(a)));}catch(e){}});
    }
    return out;
  }
  function makeRunSave(n,kind){
    const d=defaultSave();
    d.ngp=kind===2?2:1;d.ngpGoal=NGP_GOAL;d.ngpStart=Date.now();d.ngpPool=buddyPool(n);d.run=1;
    d.drumTrackerActive=false;d.seqTrackerActive=false;   // the ACTIVATE gates are the difficulty
    d.ts=Date.now();
    return d;
  }
  function startRun(kind){
    const n=slotN();if(activeSlot<0||!owned())return false;
    kind=kind===2?2:1;
    if(typeof goToHomeScreen!=='function'||typeof startGame!=='function')return false;
    goToHomeScreen();                                   // saves the main file + tears the game down
    const key=SAVE_KEYS[n];
    try{
      if(kind===1){                                     // NG++ will use its own key later
        localStorage.setItem(mainKey(n),localStorage.getItem(key)||'');
        localStorage.setItem(mainNameKey(n),getSlotName(n)||'');
      }
      localStorage.setItem(key,JSON.stringify(makeRunSave(n,kind)));
      setSlotName(n,(kind===2?'NEW GAME++':'NEW GAME+'));
    }catch(e){}
    startGame(n);
    return true;
  }
  function leaveRun(){
    if(!runFile)return false;
    const n=slotN();
    goToHomeScreen();                                   // saves the run into the slot
    const key=SAVE_KEYS[n];
    try{
      const main=localStorage.getItem(mainKey(n));
      if(!main){startGame(n);return true;}              // (nothing parked: keep playing the run rather than lose it)
      localStorage.setItem(runKey(n),localStorage.getItem(key)||'');
      localStorage.setItem(key,main);
      localStorage.removeItem(mainKey(n));
      const nm=localStorage.getItem(mainNameKey(n));
      if(nm!=null){setSlotName(n,nm);localStorage.removeItem(mainNameKey(n));}else setSlotName(n,'');
    }catch(e){}
    startGame(n);
    return true;
  }
  // a run is finished: the egg goes into the parked main save (it must survive leaving the run)
  function rewardRun(n){
    ngpRewarded=true;
    try{
      const raw=localStorage.getItem(mainKey(n));
      if(raw){
        const park=JSON.parse(raw);
        park.incEggs=Array.isArray(park.incEggs)?park.incEggs:[];
        const kind=runKind===2?'ngpp':'ngp';
        if(!park.incEggs.some(e=>e&&e.kind===kind))park.incEggs.push(runEgg(kind));
        park.ngpDone=1;                     // a finished run is remembered on the main file
        if(runKind===2)park.ngppDone=1;else park.ngppReady=1;   // NG++ opens once NG+ is done
        localStorage.setItem(mainKey(n),JSON.stringify(park));
      }
    }catch(e){}
    try{if(typeof incNewEgg==='function'||true){}}catch(e){}
    if(typeof showToast==='function')showToast(runKind===2?'NEW GAME++ BEATEN — your egg is in the main game\'s Incubator':'NEW GAME+ BEATEN — your egg is in the main game\'s Incubator',4200);
    try{const k=window.US_KIT;if(k&&k.mixer&&!(typeof sfxOn!=='undefined'&&!sfxOn)){const S=k.mixer(.7);if(S){[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>k.tone(S,S.t+i*.09,f,{type:'triangle',a:.04,d:1.2,rv:.7}));}}}catch(e){}
    if(typeof autoSave==='function')autoSave();       // stores ngpRewarded on the run
  }
  function runEgg(kind){
    return{id:'e'+Date.now().toString(36)+Math.floor(Math.random()*1e4),kind,slot:-1,heat:0,taps:0,
      beat:{s:(typeof EGG_KINDS!=='undefined'&&EGG_KINDS[kind]?EGG_KINDS[kind].sounds:['kick','snare','hihat']).slice(),p:[0,1,2].map(()=>Array(16).fill(0))}};
  }

  // the run's own fields have to survive every autosave: they are not part of js/02's save object
  if(typeof writeSlot==='function'){
    const _w=window.writeSlot;
    window.writeSlot=function(i,data){
      if(runFile&&data&&typeof data==='object'){
        data.ngp=runKind===2?2:1;data.ngpGoal=NGP_GOAL;data.ngpStart=ngpStart||Date.now();
        data.ngpPool=ngpPool;data.ngpRewarded=ngpRewarded;
      }      return _w.apply(this,arguments);
    };
  }
  // pick the run's fields up again after a load, and keep the HUD honest
  if(typeof startGame==='function'){
    const sg=window.startGame;
    window.startGame=function(i){
      // v0.2.247: read the run's own fields BEFORE loading — the game autosaves while it sets itself up, and an empty
      // pool at that moment would be written over the real one
      ngpPool=[];ngpStart=0;ngpRewarded=false;
      try{const d=JSON.parse(localStorage.getItem(SAVE_KEYS[i])||'{}');
        if(d&&(d.ngp===1||d.ngp===2)){ngpPool=Array.isArray(d.ngpPool)?d.ngpPool:[];ngpStart=+d.ngpStart||Date.now();ngpRewarded=!!d.ngpRewarded;}
      }catch(e){}
      const r=sg.apply(this,arguments);
      B.toggle('ngp-run',!!runFile);
      if(runFile)paintHud();
      return r;
    };
  }

  // ── re-finding the buddies: every hatch takes the next one off the pool ──
  if(typeof buyAlien==='function'){
    const _buy=window.buyAlien;
    window.buyAlien=function(){
      try{
        if(runFile&&totalAliens<NGP_GOAL){
          const src=ngpPool[totalAliens];
          if(src&&!(alienData[totalAliens]&&alienData[totalAliens].base))alienData[totalAliens]=Object.assign({},src);
        }
      }catch(e){}
      return _buy.apply(this,arguments);
    };
  }

  // ── HUD: the run is named and counted in the file subtitle ──
  function paintHud(){
    if(!runFile)return;
    const sub=$('slotSubtitle');
    if(sub)sub.textContent=(runKind===2?'NEW GAME++':'NEW GAME+')+' · '+Math.min(NGP_GOAL,totalAliens|0)+'/'+NGP_GOAL;
  }

  // ── the Cockpit door ──
  const card=document.createElement('button');
  card.type='button';card.id='ngpBtn';card.style.display='none';
  card.addEventListener('click',()=>{
    if(runFile){leaveRun();return;}
    let have=null;try{have=localStorage.getItem(runKey(slotN()));}catch(e){}
    if(have){resumeRun();return;}
    startRun(1);
  });
  const restart=document.createElement('button');
  restart.type='button';restart.id='ngpRestart';restart.textContent='RESTART RUN';restart.style.display='none';
  restart.addEventListener('click',()=>{if(!runFile)askRestart();});
  (function place(){
    const list=$('mgList');if(!list)return;
    list.appendChild(card);
    list.appendChild(restart);
  })();
  function resumeRun(){
    const n=slotN();
    let run=null;try{run=localStorage.getItem(runKey(n));}catch(e){}
    if(!run){startRun(1);return;}
    if(typeof goToHomeScreen!=='function'||typeof startGame!=='function')return;
    goToHomeScreen();                                 // saves the main game into the slot…
    try{
      const key=SAVE_KEYS[n];
      localStorage.setItem(mainKey(n),localStorage.getItem(key)||'');   // …parks it…
      localStorage.setItem(mainNameKey(n),getSlotName(n)||'');
      localStorage.setItem(key,run);                  // …and puts the saved run back in the slot
      localStorage.removeItem(runKey(n));
      setSlotName(n,'NEW GAME+');
    }catch(e){}
    startGame(n);
  }
  function askRestart(){
    if($('ngpConfirm'))return;
    const o=document.createElement('div');o.id='ngpConfirm';
    o.innerHTML='<div class="nc-box"><b>START A NEW RUN?</b><span>This replaces the New Game+ run saved in this file. Your main game is not touched.</span>'+
      '<div class="nc-row"><button type="button" id="ncYes">START OVER</button><button type="button" id="ncNo">CANCEL</button></div></div>';
    document.body.appendChild(o);
    $('ncNo').addEventListener('click',()=>o.remove());
    $('ncYes').addEventListener('click',()=>{o.remove();startRun(1);});
  }
  // the card's label follows the state (and its price hint when it is not owned yet)
  function paintCard(){
    const n=slotN();
    let have=null;try{have=JSON.parse(localStorage.getItem(runKey(n))||'null');}catch(e){}
    const show=owned()||runFile||testMode();
    card.style.display=show?'':'none';
    restart.style.display=(have&&!runFile)?'':'none';
    if(!show){return;}
    let txt,cls='ngp-card';
    if(runFile){txt='MAIN GAME <span class="ngp-sub">LEAVE THIS RUN</span>';cls+=' ngp-leave';}
    else if(have){txt='CONTINUE RUN <span class="ngp-sub">'+Math.min(NGP_GOAL,+have.totalAliens||0)+'/99 SAVED</span>';}
    else{txt='NEW GAME+ <span class="ngp-sub">99 BUDDIES · FROM ZERO</span>';}
    if(card._t!==txt){card._t=txt;card.innerHTML=txt;}
    card.className=cls;
    card.classList.toggle('ngp-new',!runFile&&!have&&!owned());
  }
  setInterval(()=>{
    if(!B.contains('game-active'))return;
    paintCard();
    if(runFile){
      B.add('ngp-run');
      paintHud();
      if(!ngpRewarded&&totalAliens>=NGP_GOAL)rewardRun(slotN());
    }else B.remove('ngp-run');
  },700);

  // deleting a slot has to take the parked file and the saved run with it
  if(typeof deleteSlot==='function'){
    const _d=window.deleteSlot;
    window.deleteSlot=function(i){
      try{localStorage.removeItem(mainKey(i));localStorage.removeItem(runKey(i));localStorage.removeItem(mainNameKey(i));}catch(e){}
      return _d.apply(this,arguments);
    };
  }

  // ── the egg the main game gets for a finished run (js/77 reads EGG_KINDS at paint time) ──
  try{
    if(typeof EGG_KINDS!=='undefined'){
      EGG_KINDS.ngp=EGG_KINDS.ngp||{label:'NEW GAME+ EGG',name:'NG+',title:'NEW GAME+ BUDDY',col:'#ffcf5a',need:2400,special:true,
        pal:['#ffd76a','#ff9f3d','#2a1408','#ffe9a8'],sounds:['kick','clap','hihat'],
        look:{name:'NOVA',body:'#ffcf5a',eye:'#2a1408',mouth:'#c04a12',stem:'#ffe9a8',tip:'#fff6d0',foot:'#ff9f3d',
          eyeSize:1.45,ant:1.5,fx:{sheen:['#fff3b0','#ffcf5a','#ff7b3d'],spark:'#ffe9a8',ring:'#ffb43a'}},trail:'gold'};
      EGG_KINDS.ngpp=EGG_KINDS.ngpp||{label:'NEW GAME++ EGG',name:'NG++',title:'NEW GAME++ BUDDY',col:'#8fd8ff',need:3000,special:true,
        pal:['#bfe9ff','#4fa8ff','#0a1a2a','#e8f7ff'],sounds:['snare','bell','shaker'],
        look:{name:'ECHO',body:'#8fd8ff',eye:'#0a1a2a',mouth:'#2f6fa8',stem:'#e8f7ff',tip:'#ffffff',foot:'#4fa8ff',
          eyeSize:1.5,ant:1.4,fx:{sheen:['#ffffff','#bfe9ff','#4fa8ff'],spark:'#ffffff',ring:'#7fc9ff'}},trail:'prism'};
    }
  }catch(e){}

  // ── test hook (the node is 1.2M gems: nobody can reach it while testing) ──
  window.__ngp={
    own(){unlockedSkills[NGP_NODE]=true;if(typeof skillTreeUnlocked!=='undefined')skillTreeUnlocked=true;
      if(typeof renderSkillTree==='function')renderSkillTree();paintCard();return true;},
    start:startRun,leave:leaveRun,
    state(){return{runFile,runKind,slot:activeSlot,pool:ngpPool.length,rewarded:ngpRewarded,goal:NGP_GOAL,aliens:typeof totalAliens==='number'?totalAliens:0};}
  };

  // ── CSS (cockpit card, HUD, confirm sheet) ──
  const css=document.createElement('style');css.textContent=`
#ngpBtn,#ngpRestart{width:100%;margin-top:6px;box-sizing:border-box;cursor:pointer;touch-action:manipulation;
  font-family:'Bebas Neue',sans-serif;letter-spacing:.14em;border-radius:12px;padding:.6rem .8rem;font-size:.9rem;transition:background .2s,border-color .2s,transform .1s;}
#ngpBtn{display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;
  border:1px solid #4a3a12;background:linear-gradient(180deg,#1a1405,#0d0a03);color:#ffd77a;}
#ngpBtn .ngp-sub{font-family:'Space Mono',monospace;font-size:.52rem;letter-spacing:.12em;color:#9a8a5a;}
#ngpBtn.ngp-new{border-color:#ffcf5a;box-shadow:0 0 0 1px rgba(255,207,90,.35),0 0 18px -6px rgba(255,207,90,.7);}
#ngpBtn.ngp-leave{border-color:#7fe8ff;background:linear-gradient(180deg,#03161c,#020b0f);color:#bfefff;}
#ngpRestart{border:1px solid #4a2a12;background:#120804;color:#ff9f6a;font-size:.7rem;padding:.35rem .6rem;}
#ngpConfirm{position:fixed;inset:0;z-index:9000;background:rgba(2,3,6,.82);display:flex;align-items:center;justify-content:center;padding:18px;}
#ngpConfirm .nc-box{max-width:340px;width:100%;background:#0c0d12;border:1px solid #3a2f14;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px;
  font-family:'Bebas Neue',sans-serif;letter-spacing:.1em;color:#ffe9a8;box-shadow:0 20px 60px rgba(0,0,0,.6);}
#ngpConfirm .nc-box b{font-size:1.1rem;color:#ffcf5a;}
#ngpConfirm .nc-box span{font-family:'Space Mono',monospace;font-size:.6rem;line-height:1.5;letter-spacing:.06em;color:#b9b09a;}
#ngpConfirm .nc-row{display:flex;gap:8px;margin-top:4px;}
#ngpConfirm button{flex:1;padding:.6rem;border-radius:10px;border:1px solid #4a3a12;background:#1a1405;color:#ffd77a;font-family:'Bebas Neue',sans-serif;letter-spacing:.12em;cursor:pointer;}
#ngpConfirm #ncNo{border-color:#333;background:#141414;color:#999;}
body.ngp-run #slotSubtitle{color:#ffcf5a;}
`;
  document.head.appendChild(css);
})();
