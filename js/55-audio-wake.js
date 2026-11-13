// ══════════════════════════════════════════════
//  AUDIO WAKE-UP — sound comes back by itself after switching apps.
//  Phones pause a web page's audio when you leave the browser. iOS often leaves it 'interrupted' (or worse, says
//  it's 'running' while its clock is frozen), which used to mean silence until you refreshed the page.
//  Now, whenever you come back (and on your very next tap), the game:
//    1. resumes the audio, and plays a silent blip to unlock it again (iOS wants that inside a tap)
//    2. checks the audio clock is really moving; if it's stuck, it rebuilds the whole sound engine on a fresh
//       audio context (same steps as the WAV export uses to swap engines) and carries on: no refresh needed.
// ══════════════════════════════════════════════
(function(){
  let checking=false,lastWake=0;
  function blip(c){try{const b=c.createBuffer(1,1,c.sampleRate),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0);}catch(e){}}
  function rebuild(){
    const old=audioCtx;if(!old||_exporting)return;
    const hadAmb=ambStarted,wasParty=typeof partyMusicGain!=='undefined'&&!!partyMusicGain;
    try{if(typeof stopPartyMusic==='function')stopPartyMusic();}catch(e){}
    const clear=o=>{if(o)for(const k in o)delete o[k];};
    try{clear(_fxBuses);clear(_fxRevs);clear(_masterStages);_lim=null;_masterSig=null;}catch(e){}
    try{if(typeof _voxN!=='undefined')_voxN=null;}catch(e){}
    audioCtx=null;ambStarted=false;
    try{old.close();}catch(e){}
    const c=getCtx();blip(c);
    try{if(typeof applyMasterFx==='function')applyMasterFx();}catch(e){}
    try{if(hadAmb&&typeof startAmbience==='function')startAmbience();}catch(e){}
    try{if(wasParty&&typeof startPartyMusic==='function')startPartyMusic();}catch(e){}
    try{if(typeof voxRouteAll==='function')voxRouteAll();}catch(e){}
    window._audioRebuilds=(window._audioRebuilds||0)+1;
  }
  // is the audio clock actually ticking? (a frozen clock = silent, whatever state it claims)
  function verify(){
    if(checking||!audioCtx||document.hidden)return;checking=true;
    const c=audioCtx,t0=c.currentTime,w0=performance.now();
    setTimeout(()=>{checking=false;if(document.hidden||audioCtx!==c)return;
      const moved=c.currentTime-t0,wall=(performance.now()-w0)/1000;
      if(c.state==='closed'||(c.state==='running'&&moved<wall*.25)||(c.state!=='running'&&_userTapped))rebuild();},450);
  }
  let _userTapped=false;
  function wake(fromTap){
    if(!audioCtx||_exporting)return;const c=audioCtx;
    if(c.state!=='running'){try{const p=c.resume();if(p&&p.then)p.then(()=>{}).catch(()=>{});}catch(e){}}
    if(fromTap)blip(c);
    verify();
  }
  function onReturn(){if(document.hidden)return;lastWake=performance.now();_userTapped=false;wake(false);}
  document.addEventListener('visibilitychange',onReturn);
  window.addEventListener('pageshow',onReturn);
  window.addEventListener('focus',onReturn);
  // the first taps after coming back count as the "user gesture" iOS needs to start audio again
  const tap=()=>{if(!audioCtx)return;if(audioCtx.state!=='running'||performance.now()-lastWake<8000){_userTapped=true;wake(true);}};
  ['touchstart','pointerdown','keydown','mousedown'].forEach(n=>window.addEventListener(n,tap,{capture:true,passive:true}));
  window.audioWakeRebuild=rebuild;
})();
