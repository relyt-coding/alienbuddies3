// ══════════════════════════════════════════════
//  "WHAT'S YOUR NAME?" (v0.2.191)
//  When an unnamed save file first reaches 25 J, a small card slides up from the bottom: "Oh, by the way… what's your
//  name?" Typing a name and tapping OK names the save slot (setSlotName, shown on the file select). It never pauses or
//  covers the pads' music (design rule: no pop-ups that break the music): it's a small card, and LATER / ✕ dismiss it.
//  It asks once per slot (localStorage ab2_nameAsked_N), so it never nags. The text box is only focused by the player's
//  own tap (iPhone shows the keyboard only for a focus inside a tap).
// ══════════════════════════════════════════════
(function(){
  const AT=250000;   // 25 J in internal units (0.1 mJ each)
  const key=()=>(typeof TEST_MODE!=='undefined'&&TEST_MODE?'ab2t_':'ab2_')+'nameAsked_'+activeSlot;
  const card=document.createElement('div');card.id='nameAsk';
  card.innerHTML='<button class="na-x" aria-label="Close">✕</button><div class="na-q">OH, BY THE WAY…<br><b>WHAT\'S YOUR NAME?</b></div><div class="na-row"><input id="naInput" maxlength="16" autocomplete="off" spellcheck="false" placeholder="YOUR NAME"><button id="naOk">OK</button></div><button class="na-later">LATER</button>';
  document.body.appendChild(card);
  const inp=card.querySelector('#naInput');
  function close(){card.classList.remove('on');try{inp.blur();}catch(e){}}
  function done(){const v=inp.value.trim().toUpperCase().slice(0,16);if(!v){inp.focus();return;}
    if(typeof setSlotName==='function')setSlotName(activeSlot,v);
    {const st=document.getElementById('slotSubtitle');if(st)st.textContent=v;}   // v0.2.204: the name under the title updates right away
    close();if(typeof showToast==='function')showToast('Nice to meet you, '+v+'!');}
  card.querySelector('#naOk').addEventListener('click',done);
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')done();});
  card.querySelector('.na-x').addEventListener('click',close);card.querySelector('.na-later').addEventListener('click',close);
  setInterval(()=>{
    if(card.classList.contains('on')||typeof activeSlot==='undefined'||activeSlot<0||!document.body.classList.contains('game-active'))return;
    if(typeof score!=='number'||score<AT||document.body.classList.contains('intro-run'))return;
    let asked=false;try{asked=!!localStorage.getItem(key());}catch(e){}
    if(asked||(typeof getSlotName==='function'&&getSlotName(activeSlot)))return;
    if(typeof overlayUp==='function'&&overlayUp())return;
    if(['store-open','bunker-open','vault-open','cockpit-open','race-open','egg-page-open'].some(c=>document.body.classList.contains(c)))return;   // only on the pads screen   // wait until nothing covers the pads
    try{localStorage.setItem(key(),'1');}catch(e){}
    inp.value='';card.classList.add('on');
  },1500);
})();
