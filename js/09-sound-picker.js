
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

// (in the full-screen sequencer the list is built by buildMpListFull, so changing the filter there keeps working)
function setMpFilter(tag){mpFilter=tag;mpFiltersEl.querySelectorAll('.mp-chip').forEach(c=>c.classList.toggle('on',c.dataset.tag===tag||(tag==='all'&&!c.dataset.tag)));
  if(typeof mpFullLayer!=='undefined'&&mpFullLayer&&typeof buildMpListFull==='function')buildMpListFull();else buildMpList();}

// ── FILL: quick-start a beat. 1 / 2 / 3 / 4 fill every 4th step starting on that step (1 → 1, 5, 9, 13…), so each
//    number is one of the four 16th-note spots in every beat. ALL fills every step, CLEAR empties the track.
//    Pressing a lit 1–4 / ALL again takes those steps back out. (v0.2.174: back from the 1–8 spacing experiment) ──
const mpFillEl=document.getElementById('mpFill');
function mpLayer(){return mpTarget||(typeof mpFullLayer!=='undefined'?mpFullLayer:null);}
function mpFillIdx(k){const out=[];if(k==='clear')return out;for(let i=0;i<STEPS;i++)if(k==='all'||i%4===k)out.push(i);return out;}
function buildMpFill(){
  if(!mpFillEl)return;mpFillEl.innerHTML='';
  const L=mpLayer();if(!L){mpFillEl.style.display='none';return;}
  mpFillEl.style.display='';
  const snd=SOUND_MAP[L.soundId]||{name:'',color:'#a0a8ff'};
  const hd=document.createElement('div');hd.className='mp-fill-hd';hd.textContent='FILL WITH ';
  const sn=document.createElement('span');sn.textContent=snd.name;sn.style.color=snd.color;hd.appendChild(sn);
  const row=document.createElement('div');row.className='mp-fill-row mp-fill-grid';
  [[0,'1'],[1,'2'],[2,'3'],[3,'4'],['all','ALL'],['clear','CLEAR']].forEach(([k,lab])=>{
    const b=document.createElement('button');b.type='button';b.className='mp-fill-btn'+(k==='all'?' all':k==='clear'?' clear':'');b.textContent=lab;b.dataset.k=k;
    b.style.setProperty('--lc',snd.color);
    b.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();mpFill(k);});
    row.appendChild(b);
  });
  mpFillEl.appendChild(hd);mpFillEl.appendChild(row);paintMpFill();
}
function paintMpFill(){
  const L=mpLayer();if(!L||!mpFillEl)return;
  mpFillEl.querySelectorAll('.mp-fill-btn').forEach(b=>{const d=b.dataset.k,k=d==='all'||d==='clear'?d:+d;
    b.classList.toggle('on',k!=='clear'&&mpFillIdx(k).every(i=>L.steps[i]));});
}
function mpFill(k){
  const L=mpLayer();if(!L)return;
  // 1–4 / ALL: add those steps (or, if they're all on already, take them back out). CLEAR: everything off.
  const idx=k==='clear'?[...Array(STEPS).keys()]:mpFillIdx(k),full=k!=='clear'&&idx.every(i=>L.steps[i]),want=new Set(k==='clear'||full?[]:idx);let added=false;
  for(const i of idx){
    const on=want.has(i);if(!!L.steps[i]===on)continue;   // steps that stay on keep their level
    L.steps[i]=on;L.vols[i]=100;if(on)added=true;
    [L.stepEls[i],L.fullStepEls&&L.fullStepEls[i]].forEach(el=>{if(!el)return;
      el.classList.toggle('on',on);el.style.opacity=on?'1':'';
      if(on){el.classList.remove('mp-filled');void el.offsetWidth;el.classList.add('mp-filled');setTimeout(()=>el.classList.remove('mp-filled'),450);}});
  }
  if(added&&(typeof layerAudible!=='function'||layerAudible(L))){getCtx();playSound(L.soundId,undefined,undefined,seqLayers.indexOf(L));}
  paintMpFill();
  if(typeof autoSave==='function')autoSave();
}
// open just under the track's name, or above it if there isn't room below
function placeMiniPicker(rect){
  miniPicker.style.left=Math.max(4,Math.min(rect.left,window.innerWidth-miniPicker.offsetWidth-6))+'px';
  const h=miniPicker.offsetHeight;let top=rect.bottom+6;
  if(top+h>window.innerHeight-8)top=Math.max(8,Math.min(window.innerHeight-8-h,rect.top-6-h));
  miniPicker.style.top=top+'px';
}
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
        if(mpTargetDot.parentElement)mpTargetDot.parentElement.style.setProperty("--lc",snd.color);
        closeMiniPicker();
      }
    });
    mpListEl.appendChild(item);
  });
}
function openMiniPicker(layer,dot,name){
  mpTarget=layer;mpTargetDot=dot;mpTargetName=name;
  buildMpFill();buildMpList();placeMiniPicker(dot.getBoundingClientRect());miniPicker.classList.add('open');
}
function closeMiniPicker(){miniPicker.classList.remove('open');mpTarget=null;mpFullLayer=null;}
document.addEventListener('pointerdown',e=>{if(miniPicker.classList.contains('open')&&!miniPicker.contains(e.target))closeMiniPicker();});
