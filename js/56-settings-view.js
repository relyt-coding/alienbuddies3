// ══════════════════════════════════════════════
//  SETTINGS → VIEW: the same switches as the VIEW button by the sequencer (trackers, sequencer, drum pads,
//  step counts), so players who go looking in Settings find them. Each chip just presses the matching row of the
//  real VIEW menu, so both always agree. Shown once the sequencer (and so the VIEW button) is unlocked.
// ══════════════════════════════════════════════
(function(){
  const row=document.getElementById('settingsViewRow'),box=document.getElementById('settingsViewChips'),menu=document.getElementById('viewMenu');
  if(!row||!box||!menu)return;
  const CH=[['vm','tiers','TRACKERS'],['vm','seq','SEQUENCER'],['vm','pads','DRUM PADS'],['sc','toggle','STEP COUNTS']];
  function paint(){
    const on=typeof drum!=='undefined'&&drum.seqTracks>0;row.style.display=on?'':'none';if(!on)return;
    if(typeof refreshViewMenu==='function')refreshViewMenu();
    box.innerHTML='';
    CH.forEach(([kind,key,label])=>{const src=menu.querySelector('[data-'+kind+'="'+key+'"]');if(!src)return;
      const b=document.createElement('button');b.type='button';b.className='sv-chip'+(src.classList.contains('on')?' on':'');b.textContent=(src.classList.contains('on')?'✓ ':'')+label;
      b.addEventListener('click',e=>{e.stopPropagation();src.click();paint();});box.appendChild(b);});
  }
  new MutationObserver(()=>{if(document.getElementById('settingsPanel').classList.contains('open'))paint();}).observe(document.getElementById('settingsPanel'),{attributes:true,attributeFilter:['class']});
  window.paintSettingsView=paint;
})();
