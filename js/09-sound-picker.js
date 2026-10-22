
// ══════════════════════════════════════════════
//  MINI SOUND PICKER (sequencer)
// ══════════════════════════════════════════════
let mpTarget=null,mpTargetDot=null,mpTargetName=null,mpFilter='all';
const miniPicker=document.getElementById('miniPicker');
const mpFiltersEl=document.getElementById('mpFilters');
const mpListEl=document.getElementById('mpList');

const mpAllChip=document.createElement('div');mpAllChip.className='mp-chip on';mpAllChip.textContent='ALL';
mpAllChip.addEventListener('click',()=>setMpFilter('all'));mpFiltersEl.appendChild(mpAllChip);
TAGS.forEach(tag=>{const ch=document.createElement('div');ch.className='mp-chip';ch.textContent=tag.toUpperCase();ch.dataset.tag=tag;ch.addEventListener('click',()=>setMpFilter(tag));mpFiltersEl.appendChild(ch);});

function setMpFilter(tag){mpFilter=tag;mpFiltersEl.querySelectorAll('.mp-chip').forEach(c=>c.classList.toggle('on',c.dataset.tag===tag||(tag==='all'&&!c.dataset.tag)));buildMpList();}
function buildMpList(){
  mpListEl.innerHTML='';
  const avail=unlockedSounds().map(id=>SOUND_MAP[id]).filter(Boolean);
  const shown=mpFilter==='all'?avail:avail.filter(s=>s.tag===mpFilter);
  shown.forEach(snd=>{
    const item=document.createElement('div');item.className='mp-item'+(mpTarget&&mpTarget.soundId===snd.id?' active':'');
    const dot=document.createElement('div');dot.className='mp-dot';dot.style.background=snd.color;
    const nm=document.createElement('div');nm.className='mp-name';nm.style.color=snd.color;nm.textContent=snd.name;
    const hear=document.createElement('div');hear.className='mp-hear';hear.textContent='▶';
    hear.addEventListener('pointerdown',e=>{e.stopPropagation();getCtx();playSound(snd.id);});
    item.appendChild(dot);item.appendChild(nm);item.appendChild(hear);
    item.addEventListener('pointerdown',e=>{
      if(e.target===hear)return;
      getCtx();playSound(snd.id);
      if(mpTarget){
        // Assigning to a sequencer layer
        mpTarget.soundId=snd.id;
        mpTargetDot.style.background=snd.color;
        mpTargetName.style.color=snd.color;mpTargetName.textContent=snd.name;
        mpTarget.stepEls.forEach(s=>s.style.setProperty('--lc',snd.color));
        closeMiniPicker();
      }
    });
    mpListEl.appendChild(item);
  });
}
function openMiniPicker(layer,dot,name){
  mpTarget=layer;mpTargetDot=dot;mpTargetName=name;
  const rect=dot.getBoundingClientRect();
  miniPicker.style.top=(rect.bottom+6)+'px';
  miniPicker.style.left=Math.min(rect.left,window.innerWidth-210)+'px';
  buildMpList();miniPicker.classList.add('open');
}
function closeMiniPicker(){miniPicker.classList.remove('open');mpTarget=null;mpFullLayer=null;}
document.addEventListener('pointerdown',e=>{if(miniPicker.classList.contains('open')&&!miniPicker.contains(e.target))closeMiniPicker();});
