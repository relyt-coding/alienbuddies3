// ══════════════════════════════════════════════
//  SETTINGS → VIEW: one button that opens its own panel with the same switches as the VIEW button by the
//  sequencer (trackers, sequencer, drum pads / buddy keys, step counts and their options), so players who go
//  looking in Settings find them. Every row just presses the matching row of the real VIEW menu, so both always
//  agree. Shown once the sequencer (and so the VIEW button) is unlocked.
// ══════════════════════════════════════════════
(function(){
  const $=id=>document.getElementById(id);
  const panel=$('settingsPanel'),row=$('settingsViewRow'),btn=$('settingsViewBtn'),sum=$('settingsViewSummary'),list=$('settingsViewList'),menu=$('viewMenu');
  if(!panel||!row||!btn||!list||!menu)return;
  const unlocked=()=>typeof drum!=='undefined'&&drum.seqTracks>0;
  const labelOf=src=>{const t=src.lastChild;return(t?t.textContent:'').trim();};
  // the settings row: just the button, plus a line saying what's showing now
  function paintRow(){
    const on=unlocked();row.style.display=on?'':'none';if(!on)return;
    if(typeof refreshViewMenu==='function')refreshViewMenu();
    const shown=[...menu.querySelectorAll('[data-vm]')].filter(r=>r.classList.contains('on')).map(r=>{
      if(r.getAttribute('data-vm')!=='pads')return labelOf(r);
      const k=menu.querySelector('[data-pk="keys"]');return k&&k.style.display!=='none'&&k.classList.contains('on')?'BUDDY KEYS':'DRUM PADS';});
    if(sum)sum.textContent=shown.length?shown.join(' · '):'NOTHING SHOWING';
  }
  // the panel: a big, tappable copy of every row of the VIEW menu, in the same order
  function paintList(){
    if(typeof refreshViewMenu==='function')refreshViewMenu();
    list.innerHTML='';
    [...menu.children].forEach(src=>{
      if(src.classList.contains('vm-sep')){const s=document.createElement('div');s.className='svs-sep';list.appendChild(s);return;}
      if(!src.classList.contains('vm-row')||src.style.display==='none')return;
      const sub=src.classList.contains('vm-sub'),on=src.classList.contains('on');
      const b=document.createElement('button');b.type='button';
      b.className='svs-row'+(sub?' sub':'')+(on?' on':'')+(src.classList.contains('dim')?' dim':'');
      b.innerHTML='<span class="svs-check"></span><span class="svs-label"></span>';
      b.firstChild.textContent=on?(sub?'●':'✓'):'';b.lastChild.textContent=labelOf(src);
      b.addEventListener('click',e=>{e.stopPropagation();src.click();paintList();paintRow();});
      list.appendChild(b);
    });
  }
  function openSheet(){paintList();panel.classList.add('view-open');const sh=$('settingsViewSheet');if(sh)sh.scrollTop=0;}
  function closeSheet(){panel.classList.remove('view-open');paintRow();}
  btn.addEventListener('click',e=>{e.stopPropagation();openSheet();});
  const back=$('settingsViewBack');if(back)back.addEventListener('click',e=>{e.stopPropagation();closeSheet();});
  // opening Settings always starts on the main page; closing it closes the panel too
  new MutationObserver(()=>{if(panel.classList.contains('open'))paintRow();else if(panel.classList.contains('view-open'))panel.classList.remove('view-open');})
    .observe(panel,{attributes:true,attributeFilter:['class']});
  window.paintSettingsView=()=>{paintRow();if(panel.classList.contains('view-open'))paintList();};
})();
