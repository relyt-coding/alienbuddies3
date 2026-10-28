// ══════════════════════════════════════════════
//  MORE MENU — musical key lock + per-track reverb & echo
// ══════════════════════════════════════════════
(function(){
  const keyBtn=document.getElementById('vtbKeyBtn'),fxBtn=document.getElementById('vtbFxBtn');
  if(!keyBtn||!fxBtn)return;
  const $=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};
  const saveSoon=(()=>{let t=0;return()=>{clearTimeout(t);t=setTimeout(()=>{typeof autoSave==='function'&&autoSave();},400);};})();

  // ── KEY and EFFECTS buttons (each opens its own window; the button lights up while it is doing something) ──
  function paintMenu(){
    const kOn=typeof keyIsActive==='function'&&keyIsActive();
    keyBtn.classList.toggle('active',kOn);
    keyBtn.textContent=kOn?'KEY · '+keyLabel(seqKey,seqKeyMinor):'KEY';
    keyBtn.title=kOn?'Song key: '+keyLongName(seqKey,seqKeyMinor):'Song key';
    let fx=false;try{const r=musicHas('mt_reverb'),e=musicHas('mt_echo');fx=(seqLayers||[]).some((l,i)=>{const f=getTrackFx(i);return !!f&&((r&&f.rvbAmt>0)||(e&&f.echoMix>0));});}catch(e){}
    fxBtn.classList.toggle('active',fx);
  }
  window.closeMoreMenu=function(){}; // (kept so older calls don't break)
  window.refreshKeyFxButtons=paintMenu;
  keyBtn.addEventListener('click',e=>{e.stopPropagation();if(typeof closeViewMenu==='function')closeViewMenu();buildKey();km.open();});
  fxBtn.addEventListener('click',e=>{e.stopPropagation();if(typeof closeViewMenu==='function')closeViewMenu();buildFxList();fm.open();});
  setTimeout(paintMenu,0);setInterval(paintMenu,1500);

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
  // Columns follow the circle of fifths. Each column = a major key with its relative minor underneath (same notes).
  const FIFTHS=[0,7,2,9,4,11,6,1,8,3,10,5];
  function buildKey(){
    const b=km.box;b.innerHTML='';
    const hd=$('div','more-head');hd.appendChild($('div','more-title','🎼 SONG KEY'));
    const x=$('button','more-x','✕');x.addEventListener('click',km.close);hd.appendChild(x);b.appendChild(hd);
    b.appendChild($('div','more-sub','Melodic sounds (bass, synths, bells, marimba, drones…) follow the key so everything you write sounds right together. Drums are not changed. Each major key sits above its relative minor: they share the same notes.'));
    const grid=$('div','key-grid key-grid-pairs');
    FIFTHS.forEach(root=>{
      const col=$('div','key-pair');
      [[root,false],[(root+9)%12,true]].forEach(([r,minor])=>{
        const ok=keyUnlocked(r,minor),on=seqKey===r&&seqKeyMinor===minor;
        const bt=$('button','key-btn'+(minor?' key-min':'')+(on?' on':'')+(ok?'':' locked'),ok?keyLabel(r,minor):'🔒');
        bt.title=keyLongName(r,minor)+(ok?'':' (locked)');
        bt.addEventListener('click',()=>{
          if(!ok){
            const R=relMajorRoot(r,minor),i=KEY_PACKS.findIndex(p=>p.majors.includes(R));
            showToast('🔒 '+keyLongName(r,minor)+' unlocks with the "'+(i>=0?KEY_PACKS[i].label:'?')+'" key pack in the Galaxy');return;
          }
          setKey(r,minor);
        });
        col.appendChild(bt);
      });
      grid.appendChild(col);
    });
    b.appendChild(grid);
    const R=relMajorRoot(seqKey,seqKeyMinor);
    b.appendChild($('div','more-foot','Now in '+keyLongName(seqKey,seqKeyMinor)+'. '+(seqKeyMinor?'Its relative major is '+KEY_NAMES[R]+' major':'Its relative minor is '+KEY_MINOR_NAMES[(R+9)%12]+' minor')+': same notes, different home.'));
    const done=$('button','more-done','DONE');done.addEventListener('click',km.close);b.appendChild(done);
  }
  function setKey(root,minor){
    seqKey=root;seqKeyMinor=!!minor;buildKey();paintMenu();saveSoon();
    try{getCtx();playSound('basenote');setTimeout(()=>playSound('marimba'),180);}catch(e){}
  }

  // ── REVERB & ECHO modal ──
  const fm=makeModal('fxModal');
  let curTrack=-1;
  function trackName(i){const l=seqLayers[i];const s=l&&SOUND_MAP[l.soundId];return s?s.name:'TRACK '+(i+1);}
  function fxBadges(f){
    const w=$('div','fx-badges');
    if(musicHas('mt_reverb'))w.appendChild($('span','fx-badge'+(f&&f.rvbAmt>0?' on':''),'REVERB'));
    if(musicHas('mt_echo'))w.appendChild($('span','fx-badge'+(f&&f.echoMix>0?' on':''),'ECHO'));
    return w;
  }
  function buildFxList(){
    curTrack=-1;const b=fm.box;b.innerHTML='';
    const hd=$('div','more-head');hd.appendChild($('div','more-title','✨ '+fxTitle()));
    const x=$('button','more-x','✕');x.addEventListener('click',fm.close);hd.appendChild(x);b.appendChild(hd);
    b.appendChild($('div','more-sub','Pick a track to add '+fxTitle().toLowerCase().replace(' & ',' or ')+' to it.'));
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
  function fxTitle(){const r=musicHas('mt_reverb'),e=musicHas('mt_echo');return r&&e?'REVERB & ECHO':(r?'REVERB':'ECHO');}
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
    rs.appendChild(rClear);if(musicHas('mt_reverb'))body.appendChild(rs);

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
    es.appendChild(eClear);if(musicHas('mt_echo'))body.appendChild(es);

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
})();
