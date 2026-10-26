// ══════════════════════════════════════════════
//  MORE MENU — musical key lock + per-track reverb & echo
// ══════════════════════════════════════════════
(function(){
  const moreBtn=document.getElementById('vtbMoreBtn');
  if(!moreBtn)return;
  const $=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};
  const saveSoon=(()=>{let t=0;return()=>{clearTimeout(t);t=setTimeout(()=>{typeof autoSave==='function'&&autoSave();},400);};})();

  // ── MORE popup menu ──
  const menu=$('div');menu.id='moreMenu';menu.style.display='none';
  const rowKey=$('button','vm-row');rowKey.type='button';
  const rowFx=$('button','vm-row');rowFx.type='button';
  menu.appendChild(rowKey);menu.appendChild(rowFx);
  document.body.appendChild(menu);
  function keyLabel(){return seqKey==null?'OFF':KEY_NAMES[seqKey]+' MAJOR';}
  function paintMenu(){rowKey.textContent='🎼  KEY: '+keyLabel();rowFx.textContent='✨  REVERB & ECHO';}
  function closeMenu(){menu.style.display='none';}
  window.closeMoreMenu=closeMenu;
  function openMenu(){
    paintMenu();menu.style.display='flex';
    const r=moreBtn.getBoundingClientRect();
    menu.style.left=Math.max(8,Math.min(r.left,innerWidth-menu.offsetWidth-8))+'px';
    const top=r.top-menu.offsetHeight-6;menu.style.top=(top>8?top:r.bottom+6)+'px';
  }
  moreBtn.addEventListener('click',e=>{e.stopPropagation();if(typeof closeViewMenu==='function')closeViewMenu();menu.style.display==='flex'?closeMenu():openMenu();});
  menu.addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',closeMenu);
  addEventListener('resize',closeMenu);

  // ── generic modal shell ──
  function makeModal(id){
    const m=$('div','more-modal');m.id=id;
    const box=$('div','more-box');m.appendChild(box);
    m.addEventListener('click',e=>{if(e.target===m)m.style.display='none';});
    document.body.appendChild(m);
    return {m,box,open(){m.style.display='flex';},close(){m.style.display='none';}};
  }

  // ── KEY modal ──
  const km=makeModal('keyModal');
  function buildKey(){
    const b=km.box;b.innerHTML='';
    const hd=$('div','more-head');hd.appendChild($('div','more-title','🎼 MUSICAL KEY'));
    const x=$('button','more-x','✕');x.addEventListener('click',km.close);hd.appendChild(x);b.appendChild(hd);
    b.appendChild($('div','more-sub','Pitched sounds (bass, synths, bells, marimba, drones…) retune to the nearest note of the key you pick, so every pattern stays in key. Drums are not changed.'));
    const grid=$('div','key-grid');
    const off=$('button','key-btn key-off'+(seqKey==null?' on':''),'OFF');
    off.addEventListener('click',()=>setKey(null));grid.appendChild(off);
    KEY_NAMES.forEach((n,i)=>{
      const bt=$('button','key-btn'+(seqKey===i?' on':''),n);
      bt.addEventListener('click',()=>setKey(i));grid.appendChild(bt);
    });
    b.appendChild(grid);
    b.appendChild($('div','more-foot',seqKey==null?'Key lock is off — sounds play as designed.':'Locked to '+KEY_NAMES[seqKey]+' major.'));
    const done=$('button','more-done','DONE');done.addEventListener('click',km.close);b.appendChild(done);
  }
  function setKey(i){
    seqKey=i;buildKey();paintMenu();saveSoon();
    try{getCtx();playSound('bell');setTimeout(()=>playSound('marimba'),180);}catch(e){}
  }
  rowKey.addEventListener('click',()=>{closeMenu();buildKey();km.open();});

  // ── REVERB & ECHO modal ──
  const fm=makeModal('fxModal');
  let curTrack=-1;
  function trackName(i){const l=seqLayers[i];const s=l&&SOUND_MAP[l.soundId];return s?s.name:'TRACK '+(i+1);}
  function fxBadges(f){
    const w=$('div','fx-badges');
    const r=$('span','fx-badge'+(f&&f.rvbAmt>0?' on':''),'REVERB');
    const e=$('span','fx-badge'+(f&&f.echoMix>0?' on':''),'ECHO');
    w.appendChild(r);w.appendChild(e);return w;
  }
  function buildFxList(){
    curTrack=-1;const b=fm.box;b.innerHTML='';
    const hd=$('div','more-head');hd.appendChild($('div','more-title','✨ REVERB & ECHO'));
    const x=$('button','more-x','✕');x.addEventListener('click',fm.close);hd.appendChild(x);b.appendChild(hd);
    b.appendChild($('div','more-sub','Pick a track to add reverb or echo to it.'));
    if(!seqLayers.length){b.appendChild($('div','more-foot','No tracks yet — buy a sequencer track in the shop first.'));return;}
    const list=$('div','fx-list');
    seqLayers.forEach((l,i)=>{
      const s=SOUND_MAP[l.soundId];const f=getTrackFx(i,false);
      const row=$('button','fx-row'+(fxIsActive(f)?' active':''));
      const dot=$('span','fx-dot');dot.style.background=s?s.color:'#888';
      const nm=$('span','fx-name',(i+1)+'  ·  '+(s?s.name:'—'));nm.style.color=s?s.color:'#aaa';
      row.appendChild(dot);row.appendChild(nm);row.appendChild(fxBadges(f));
      row.appendChild($('span','fx-go','›'));
      row.addEventListener('click',()=>buildFxDetail(i));
      list.appendChild(row);
    });
    b.appendChild(list);
    const done=$('button','more-done','DONE');done.addEventListener('click',fm.close);b.appendChild(done);
  }
  const DIVS=[[.25,'1/16'],[.5,'1/8'],[.75,'DOT 1/8'],[1,'1/4'],[2,'1/2']];
  function slider(label,min,max,val,fmt,onInput){
    const w=$('div','fx-slider');
    const lab=$('div','fx-sl-label');const nm=$('span',null,label);const vv=$('span','fx-sl-val',fmt(val));lab.appendChild(nm);lab.appendChild(vv);
    const inp=document.createElement('input');inp.type='range';inp.min=min;inp.max=max;inp.value=val;
    inp.addEventListener('input',()=>{const v=+inp.value;vv.textContent=fmt(v);onInput(v);});
    w.appendChild(lab);w.appendChild(inp);
    w.setVal=v=>{inp.value=v;vv.textContent=fmt(v);};
    return w;
  }
  function buildFxDetail(i){
    curTrack=i;const b=fm.box;b.innerHTML='';
    const f=getTrackFx(i,true);
    const hd=$('div','more-head');
    const back=$('button','more-back','‹ TRACKS');back.addEventListener('click',buildFxList);hd.appendChild(back);
    const t=$('div','more-title',(i+1)+' · '+trackName(i));const s=seqLayers[i]&&SOUND_MAP[seqLayers[i].soundId];if(s)t.style.color=s.color;hd.appendChild(t);
    const x=$('button','more-x','✕');x.addEventListener('click',fm.close);hd.appendChild(x);b.appendChild(hd);
    const body=$('div','fx-body');b.appendChild(body);
    const preview=()=>{try{getCtx();playSound(seqLayers[i].soundId,1,undefined,i);}catch(e){}};
    const changed=(doPreview)=>{saveSoon();if(doPreview)preview();};

    // — REVERB —
    const rs=$('div','fx-sec');rs.appendChild($('div','fx-sec-title','REVERB'));
    const rchips=$('div','fx-chips');
    const rBtns={};
    const rOff=$('button','fx-chip','OFF');rBtns.off=rOff;rchips.appendChild(rOff);
    Object.keys(FX_REVERBS).forEach(k=>{const c=$('button','fx-chip',FX_REVERBS[k].label);rBtns[k]=c;rchips.appendChild(c);c.addEventListener('click',()=>{f.rvbType=k;f.rvbAmt=FX_REVERBS[k].amt;rAmt.setVal(Math.round(f.rvbAmt*100));paint();changed(true);});});
    rOff.addEventListener('click',()=>{f.rvbAmt=0;rAmt.setVal(0);paint();changed(false);});
    rs.appendChild(rchips);
    const rAmt=slider('AMOUNT',0,100,Math.round(f.rvbAmt*100),v=>v+'%',v=>{f.rvbAmt=v/100;paint();changed(false);});
    rs.appendChild(rAmt);
    const rClear=$('button','fx-clear','CLEAR REVERB');rClear.addEventListener('click',()=>{f.rvbAmt=0;rAmt.setVal(0);paint();changed(false);});
    rs.appendChild(rClear);body.appendChild(rs);

    // — ECHO —
    const es=$('div','fx-sec');es.appendChild($('div','fx-sec-title','ECHO'));
    const echips=$('div','fx-chips');const eBtns={};
    const eOff=$('button','fx-chip','OFF');eBtns.off=eOff;echips.appendChild(eOff);
    Object.keys(FX_ECHOS).forEach(k=>{const c=$('button','fx-chip',FX_ECHOS[k].label);eBtns[k]=c;echips.appendChild(c);c.addEventListener('click',()=>{const p=FX_ECHOS[k];f.echoDiv=p.div;f.echoFb=p.fb;f.echoMix=p.mix;eMix.setVal(Math.round(f.echoMix*100));eFb.setVal(Math.round(f.echoFb*100));paint();changed(true);});});
    eOff.addEventListener('click',()=>{f.echoMix=0;eMix.setVal(0);paint();changed(false);});
    es.appendChild(echips);
    const eMix=slider('MIX',0,100,Math.round(f.echoMix*100),v=>v+'%',v=>{f.echoMix=v/100;paint();changed(false);});
    const eFb=slider('REPEATS',0,90,Math.round(f.echoFb*100),v=>v+'%',v=>{f.echoFb=v/100;paint();changed(false);});
    es.appendChild(eMix);es.appendChild(eFb);
    const tl=$('div','fx-sl-label');tl.appendChild($('span',null,'TIME'));es.appendChild(tl);
    const tchips=$('div','fx-chips');const tBtns=[];
    DIVS.forEach(([d,l])=>{const c=$('button','fx-chip',l);tBtns.push([d,c]);tchips.appendChild(c);c.addEventListener('click',()=>{f.echoDiv=d;paint();changed(f.echoMix>0);});});
    es.appendChild(tchips);
    const eClear=$('button','fx-clear','CLEAR ECHO');eClear.addEventListener('click',()=>{f.echoMix=0;eMix.setVal(0);paint();changed(false);});
    es.appendChild(eClear);body.appendChild(es);

    function paint(){
      Object.keys(rBtns).forEach(k=>rBtns[k].classList.toggle('on',k==='off'?f.rvbAmt<=0:(f.rvbAmt>0&&f.rvbType===k)));
      Object.keys(eBtns).forEach(k=>{
        let on;if(k==='off')on=f.echoMix<=0;else{const p=FX_ECHOS[k];on=f.echoMix>0&&Math.abs(f.echoDiv-p.div)<.01&&Math.abs(f.echoFb-p.fb)<.02&&Math.abs(f.echoMix-p.mix)<.02;}
        eBtns[k].classList.toggle('on',on);
      });
      tBtns.forEach(([d,c])=>c.classList.toggle('on',Math.abs(f.echoDiv-d)<.01));
      rClear.disabled=f.rvbAmt<=0;eClear.disabled=f.echoMix<=0;
    }
    paint();
    const foot=$('div','fx-foot');
    const pv=$('button','more-done','▶ PREVIEW');pv.addEventListener('click',preview);foot.appendChild(pv);
    const bk=$('button','more-done alt','DONE');bk.addEventListener('click',fm.close);foot.appendChild(bk);
    b.appendChild(foot);
  }
  rowFx.addEventListener('click',()=>{closeMenu();buildFxList();fm.open();});
})();
