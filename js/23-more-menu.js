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
    let fx=false;try{fx=typeof window._fxAnyActive==='function'&&window._fxAnyActive();}catch(e){}
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

  // ── EFFECTS modal: pick a channel (track / piano roll layer / master), then tweak its effects ──
  const fm=makeModal('fxModal');
  const openSecs=new Set(); // which sections are expanded (remembered while the game is open)
  const isVox=ch=>typeof FX_VOX_BASE!=='undefined'&&ch>=FX_VOX_BASE&&ch<FX_VOX_BASE+VOX_MAX_LAYERS;
  const voxN=()=>typeof voxLayerCount==='function'?voxLayerCount():0;
  function chName(ch){
    if(ch===FX_MASTER)return 'MASTER';
    if(isVox(ch))return voxLayerName(ch-FX_VOX_BASE);
    if(ch>=FX_ROLL_BASE){const L=(typeof pianoRoll!=='undefined'&&pianoRoll.layers[ch-FX_ROLL_BASE])||null;const s=L&&L.soundId&&SOUND_MAP[L.soundId];return 'ROLL '+(ch-FX_ROLL_BASE+1)+'  ·  '+(s?s.name:'—');}
    const l=seqLayers[ch];const s=l&&SOUND_MAP[l.soundId];return (ch+1)+'  ·  '+(s?s.name:'—');
  }
  function chColor(ch){
    if(ch===FX_MASTER)return '#ffcc00';
    if(isVox(ch))return VOX_LANE_COLORS[ch-FX_VOX_BASE];
    let id=null;
    if(ch>=FX_ROLL_BASE){const L=(typeof pianoRoll!=='undefined'&&pianoRoll.layers[ch-FX_ROLL_BASE])||null;id=L&&L.soundId;}else{const l=seqLayers[ch];id=l&&l.soundId;}
    const s=id&&SOUND_MAP[id];return s?s.color:'#888';
  }
  // short names of the effects that are on (for the badges in the list)
  function activeNames(ch){
    const f=fxEffective(getTrackFx(ch,false),ch);if(!f)return [];
    const n=[];
    if(f.rvbAmt>0)n.push('REVERB');if(f.echoMix>0)n.push(f.echoPing?'PING-PONG':'ECHO');if(f.filtOn)n.push('FILTER');
    if(f.distAmt>0)n.push('DIST');if(f.crushAmt>0)n.push('CRUSH');if(f.chorusMix>0)n.push('CHORUS');if(f.flangerMix>0)n.push('FLANGER');
    if(f.phaserMix>0)n.push('PHASER');if(f.tremDepth>0)n.push('TREM');if(eqActive(f))n.push('EQ');if(f.compAmt>0)n.push('COMP');
    if(f.pan!==0||f.panAuto>0)n.push('PAN');if(f.scAmt>0)n.push('SIDECHAIN');
    return n;
  }
  function anyChannelActive(){
    const chs=[];(seqLayers||[]).forEach((l,i)=>chs.push(i));
    const rn=(typeof pianoRollLayers==='function')?pianoRollLayers():0;for(let i=0;i<rn;i++)chs.push(FX_ROLL_BASE+i);chs.push(FX_MASTER);
    for(let i=0;i<voxN();i++)chs.push(FX_VOX_BASE+i);
    return chs.some(ch=>fxIsActive(fxEffective(getTrackFx(ch,false),ch)));
  }
  window.openFxChannel=ch=>{if(typeof closeViewMenu==='function')closeViewMenu();buildFxDetail(ch);fm.open();};
  window._fxAnyActive=anyChannelActive;
  function listRow(ch,list){
    const row=$('button','fx-row'+(activeNames(ch).length?' active':''));
    const dot=$('span','fx-dot');dot.style.background=chColor(ch);
    const nm=$('span','fx-name',chName(ch));nm.style.color=chColor(ch);
    const bw=$('div','fx-badges');const an=activeNames(ch);
    an.slice(0,3).forEach(t=>bw.appendChild($('span','fx-badge on',t)));if(an.length>3)bw.appendChild($('span','fx-badge on','+'+(an.length-3)));
    row.appendChild(dot);row.appendChild(nm);row.appendChild(bw);row.appendChild($('span','fx-go','›'));
    row.addEventListener('click',()=>buildFxDetail(ch));
    list.appendChild(row);
  }
  function buildFxList(){
    const b=fm.box;b.innerHTML='';
    const hd=$('div','more-head');hd.appendChild($('div','more-title','✨ EFFECTS'));
    const x=$('button','more-x','✕');x.addEventListener('click',fm.close);hd.appendChild(x);b.appendChild(hd);
    b.appendChild($('div','more-sub','Pick a track, piano roll layer'+(voxN()?', vocal layer':'')+((musicHas('mt_eq')||musicHas('mt_compression'))?' or the MASTER (whole song)':'')+' to add effects to it.'));
    const list=$('div','fx-list');
    if(seqLayers.length){list.appendChild($('div','fx-group','SEQUENCER TRACKS'));seqLayers.forEach((l,i)=>listRow(i,list));}
    const rn=(typeof pianoRollLayers==='function')?pianoRollLayers():0;
    if(rn){list.appendChild($('div','fx-group','PIANO ROLL'));for(let i=0;i<rn;i++){if(typeof rollLayer==='function')rollLayer(i);listRow(FX_ROLL_BASE+i,list);}}
    if(voxN()){list.appendChild($('div','fx-group','VOCALS'));for(let i=0;i<voxN();i++)listRow(FX_VOX_BASE+i,list);}
    if(musicHas('mt_eq')||musicHas('mt_compression')){list.appendChild($('div','fx-group','MASTERING'));listRow(FX_MASTER,list);}
    if(!list.children.length)b.appendChild($('div','more-foot','No tracks yet — buy a sequencer track in the shop first.'));
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
  const pct=v=>Math.round(v)+'%';
  const near=(a,b,e)=>Math.abs(a-b)<(e||.02);
  // cutoff slider is on a log scale: 0..100 → 40 Hz..18 kHz
  const toHz=v=>Math.round(40*Math.pow(18000/40,v/100)),fromHz=h=>Math.round(Math.log(h/40)/Math.log(18000/40)*100);
  const fmtHz=v=>{const h=toHz(v);return h>=1000?(h/1000).toFixed(1)+' kHz':h+' Hz';};

  function buildFxDetail(ch){
    const b=fm.box;b.innerHTML='';
    const f=getTrackFx(ch,true);
    const isMaster=ch===FX_MASTER;
    const hd=$('div','more-head');
    const back=$('button','more-back','‹ ALL');back.addEventListener('click',buildFxList);hd.appendChild(back);
    const t=$('div','more-title',chName(ch));t.style.color=chColor(ch);hd.appendChild(t);
    const x=$('button','more-x','✕');x.addEventListener('click',fm.close);hd.appendChild(x);b.appendChild(hd);
    if(isMaster)b.appendChild($('div','more-sub','Mastering effects work on the whole song at once.'));
    const body=$('div','fx-body');b.appendChild(body);
    const preview=()=>{try{getCtx();
      if(isMaster){playSound('kick');setTimeout(()=>playSound('snare'),260);setTimeout(()=>playSound('marimba'),520);return;}
      if(isVox(ch)){voxAudition(ch-FX_VOX_BASE);return;}
      if(ch>=FX_ROLL_BASE){const L=pianoRoll.layers[ch-FX_ROLL_BASE];if(L&&L.soundId)playRollNote(L.soundId,Math.round(rollBaseMidi(L.soundId)),0,.5,1,ch-FX_ROLL_BASE);return;}
      playSound(seqLayers[ch].soundId,1,undefined,ch);}catch(e){}};
    const changed=(doPreview)=>{saveSoon();
      if(isMaster&&typeof applyMasterFx==='function')applyMasterFx();
      else if(_fxBuses[ch]){const e=fxEffective(f,ch);if(fxIsActive(e))getFxBus(ch,e);}
      if(isVox(ch)&&typeof voxRouteAll==='function'){voxRouteAll();if(typeof voxOpen!=='undefined'&&voxOpen)voxRender();} // takes that are already playing switch over straight away
      paintAll();if(doPreview)preview();};
    const painters=[];
    const paintAll=()=>painters.forEach(p=>p());

    // collapsible section: header shows ON/OFF; body has chips, sliders and a clear button
    function section(key,title,isOn,clear,fill){
      const sec=$('div','fx-sec fx-coll');
      const head=$('button','fx-sec-head');
      const ttl=$('span','fx-sec-title',title);const st=$('span','fx-sec-state');const car=$('span','fx-sec-caret','▾');
      head.appendChild(ttl);head.appendChild(st);head.appendChild(car);sec.appendChild(head);
      const inner=$('div','fx-sec-body');sec.appendChild(inner);
      const k=ch+':'+key;if(isOn())openSecs.add(k);
      const setOpen=o=>{sec.classList.toggle('open',o);if(o)openSecs.add(k);else openSecs.delete(k);};
      setOpen(openSecs.has(k));
      head.addEventListener('click',()=>setOpen(!sec.classList.contains('open')));
      fill(inner);
      if(clear){const cl=$('button','fx-clear','CLEAR '+title);cl.addEventListener('click',()=>{clear();rebuild();changed(false);});inner.appendChild(cl);painters.push(()=>{cl.disabled=!isOn();});}
      painters.push(()=>{const on=isOn();st.textContent=on?'ON':'OFF';st.classList.toggle('on',on);});
      return sec;
    }
    // chips: [label, apply(), isOn()]
    function chips(inner,label,list){
      if(label){const l=$('div','fx-sl-label');l.appendChild($('span',null,label));inner.appendChild(l);}
      const w=$('div','fx-chips');
      list.forEach(([lbl,apply,isOn,pv])=>{const c=$('button','fx-chip',lbl);c.addEventListener('click',()=>{apply();syncSliders();changed(pv!==false);});w.appendChild(c);painters.push(()=>c.classList.toggle('on',!!isOn()));});
      inner.appendChild(w);
    }
    const sliders=[];
    function sl(inner,label,min,max,get,set,fmt){const s=slider(label,min,max,get(),fmt,v=>{set(v);changed(false);});s._get=get;sliders.push(s);inner.appendChild(s);return s;}
    function syncSliders(){sliders.forEach(s=>s.setVal(s._get()));}
    function rebuild(){syncSliders();paintAll();}
    const groups={};
    function group(name){if(!groups[name]){groups[name]=$('div','fx-group',name);body.appendChild(groups[name]);}}
    const has=id=>musicHas(id)&&(!isMaster||['mt_eq','mt_compression'].includes(id));

    // ── SPACE ──
    if(has('mt_reverb')||has('mt_echo'))group('SPACE');
    if(has('mt_reverb'))body.appendChild(section('rvb','REVERB',()=>f.rvbAmt>0,()=>{f.rvbAmt=0;},inner=>{
      chips(inner,null,[['OFF',()=>{f.rvbAmt=0;},()=>f.rvbAmt<=0,false]].concat(Object.keys(FX_REVERBS).map(k=>[FX_REVERBS[k].label,()=>{f.rvbType=k;f.rvbAmt=FX_REVERBS[k].amt;},()=>f.rvbAmt>0&&f.rvbType===k])));
      sl(inner,'AMOUNT',0,100,()=>Math.round(f.rvbAmt*100),v=>{f.rvbAmt=v/100;},pct);
    }));
    if(has('mt_echo'))body.appendChild(section('echo','ECHO',()=>f.echoMix>0,()=>{f.echoMix=0;},inner=>{
      chips(inner,null,[['OFF',()=>{f.echoMix=0;},()=>f.echoMix<=0,false]].concat(Object.keys(FX_ECHOS).map(k=>{const p=FX_ECHOS[k];return [p.label,()=>{f.echoDiv=p.div;f.echoFb=p.fb;f.echoMix=p.mix;},()=>f.echoMix>0&&near(f.echoDiv,p.div,.01)&&near(f.echoFb,p.fb)&&near(f.echoMix,p.mix)];})));
      sl(inner,'MIX',0,100,()=>Math.round(f.echoMix*100),v=>{f.echoMix=v/100;},pct);
      sl(inner,'REPEATS',0,90,()=>Math.round(f.echoFb*100),v=>{f.echoFb=v/100;},pct);
      chips(inner,'TIME',DIVS.map(([d,l])=>[l,()=>{f.echoDiv=d;},()=>near(f.echoDiv,d,.01),f.echoMix>0]));
      if(musicHas('mt_pingpong'))chips(inner,'STEREO',[['MONO',()=>{f.echoPing=false;},()=>!f.echoPing],['🏓 PING-PONG',()=>{f.echoPing=true;if(f.echoMix<=0)f.echoMix=.35;},()=>f.echoPing]]);
    }));

    // ── TONE ──
    if(['mt_filter','mt_distortion','mt_bitcrusher','mt_eq'].some(has))group('TONE');
    if(has('mt_eq'))body.appendChild(section('eq','EQ',()=>eqActive(f),()=>{f.eqOn=false;f.eqLow=f.eqMid=f.eqHigh=0;},inner=>{
      const pre=(lo,mi,hi)=>()=>{f.eqOn=true;f.eqLow=lo;f.eqMid=mi;f.eqHigh=hi;};
      const isP=(lo,mi,hi)=>()=>eqActive(f)&&f.eqLow===lo&&f.eqMid===mi&&f.eqHigh===hi;
      chips(inner,null,[['FLAT',()=>{f.eqOn=false;f.eqLow=f.eqMid=f.eqHigh=0;},()=>!eqActive(f),false],['BASS BOOST',pre(6,0,-1),isP(6,0,-1)],['BRIGHT',pre(-1,0,6),isP(-1,0,6)],['SCOOP',pre(4,-6,4),isP(4,-6,4)],['THIN',pre(-12,2,2),isP(-12,2,2)]]);
      const db=v=>(v>0?'+':'')+v+' dB';
      sl(inner,'LOW',-12,12,()=>f.eqLow,v=>{f.eqOn=true;f.eqLow=v;},db);
      sl(inner,'MID',-12,12,()=>f.eqMid,v=>{f.eqOn=true;f.eqMid=v;},db);
      sl(inner,'HIGH',-12,12,()=>f.eqHigh,v=>{f.eqOn=true;f.eqHigh=v;},db);
    }));
    if(has('mt_filter'))body.appendChild(section('filt','FILTER',()=>f.filtOn,()=>{f.filtOn=false;},inner=>{
      const ty=(t,hz)=>()=>{f.filtOn=true;if(f.filtType!==t){f.filtType=t;f.filtFreq=hz;}};
      chips(inner,null,[['OFF',()=>{f.filtOn=false;},()=>!f.filtOn,false],['LOW-PASS',ty('lowpass',700),()=>f.filtOn&&f.filtType==='lowpass'],['HIGH-PASS',ty('highpass',900),()=>f.filtOn&&f.filtType==='highpass'],['BAND-PASS',ty('bandpass',1200),()=>f.filtOn&&f.filtType==='bandpass']]);
      sl(inner,'CUTOFF',0,100,()=>fromHz(f.filtFreq),v=>{f.filtOn=true;f.filtFreq=toHz(v);},fmtHz);
      sl(inner,'RESONANCE',0,100,()=>Math.round((f.filtRes-.5)/14.5*100),v=>{f.filtRes=.5+v/100*14.5;},pct);
    }));
    if(has('mt_distortion'))body.appendChild(section('dist','DISTORTION',()=>f.distAmt>0,()=>{f.distAmt=0;},inner=>{
      chips(inner,null,[['OFF',()=>{f.distAmt=0;},()=>f.distAmt<=0,false],['WARM',()=>{f.distAmt=.25;},()=>near(f.distAmt,.25)],['CRUNCH',()=>{f.distAmt=.55;},()=>near(f.distAmt,.55)],['FUZZ',()=>{f.distAmt=.9;},()=>near(f.distAmt,.9)]]);
      sl(inner,'DRIVE',0,100,()=>Math.round(f.distAmt*100),v=>{f.distAmt=v/100;},pct);
    }));
    if(has('mt_bitcrusher'))body.appendChild(section('crush','BITCRUSH',()=>f.crushAmt>0,()=>{f.crushAmt=0;},inner=>{
      chips(inner,null,[['OFF',()=>{f.crushAmt=0;},()=>f.crushAmt<=0,false],['LO-FI',()=>{f.crushAmt=.3;},()=>near(f.crushAmt,.3)],['8-BIT',()=>{f.crushAmt=.6;},()=>near(f.crushAmt,.6)],['DESTROYED',()=>{f.crushAmt=.95;},()=>near(f.crushAmt,.95)]]);
      sl(inner,'CRUSH',0,100,()=>Math.round(f.crushAmt*100),v=>{f.crushAmt=v/100;},v=>v<=0?'OFF':Math.max(2,Math.round(12-v/100*10))+' BITS');
    }));

    // ── MOTION ──
    if(['mt_chorus','mt_flanger','mt_phaser','mt_tremolo'].some(has))group('MOTION');
    const rate=v=>(v/100).toFixed(2)+' Hz';
    if(has('mt_chorus'))body.appendChild(section('chorus','CHORUS',()=>f.chorusMix>0,()=>{f.chorusMix=0;},inner=>{
      const p=(m,r)=>()=>{f.chorusMix=m;f.chorusRate=r;},q=(m,r)=>()=>near(f.chorusMix,m)&&near(f.chorusRate,r);
      chips(inner,null,[['OFF',()=>{f.chorusMix=0;},()=>f.chorusMix<=0,false],['SUBTLE',p(.3,.6),q(.3,.6)],['WIDE',p(.6,.9),q(.6,.9)],['DREAMY',p(.85,.35),q(.85,.35)]]);
      sl(inner,'MIX',0,100,()=>Math.round(f.chorusMix*100),v=>{f.chorusMix=v/100;},pct);
      sl(inner,'SPEED',10,300,()=>Math.round(f.chorusRate*100),v=>{f.chorusRate=v/100;},rate);
    }));
    if(has('mt_flanger'))body.appendChild(section('flanger','FLANGER',()=>f.flangerMix>0,()=>{f.flangerMix=0;},inner=>{
      const p=(m,r,fb)=>()=>{f.flangerMix=m;f.flangerRate=r;f.flangerFb=fb;},q=(m,r,fb)=>()=>near(f.flangerMix,m)&&near(f.flangerRate,r)&&near(f.flangerFb,fb);
      chips(inner,null,[['OFF',()=>{f.flangerMix=0;},()=>f.flangerMix<=0,false],['SLOW JET',p(.6,.12,.7),q(.6,.12,.7)],['FAST',p(.5,.8,.5),q(.5,.8,.5)],['METAL',p(.7,.3,.88),q(.7,.3,.88)]]);
      sl(inner,'MIX',0,100,()=>Math.round(f.flangerMix*100),v=>{f.flangerMix=v/100;},pct);
      sl(inner,'SPEED',5,200,()=>Math.round(f.flangerRate*100),v=>{f.flangerRate=v/100;},rate);
      sl(inner,'FEEDBACK',0,90,()=>Math.round(f.flangerFb*100),v=>{f.flangerFb=v/100;},pct);
    }));
    if(has('mt_phaser'))body.appendChild(section('phaser','PHASER',()=>f.phaserMix>0,()=>{f.phaserMix=0;},inner=>{
      const p=(m,r)=>()=>{f.phaserMix=m;f.phaserRate=r;},q=(m,r)=>()=>near(f.phaserMix,m)&&near(f.phaserRate,r);
      chips(inner,null,[['OFF',()=>{f.phaserMix=0;},()=>f.phaserMix<=0,false],['SLOW',p(.6,.2),q(.6,.2)],['SWIRL',p(.75,.6),q(.75,.6)],['FAST',p(.6,2),q(.6,2)]]);
      sl(inner,'MIX',0,100,()=>Math.round(f.phaserMix*100),v=>{f.phaserMix=v/100;},pct);
      sl(inner,'SPEED',5,400,()=>Math.round(f.phaserRate*100),v=>{f.phaserRate=v/100;},rate);
    }));
    if(has('mt_tremolo'))body.appendChild(section('trem','TREMOLO',()=>f.tremDepth>0,()=>{f.tremDepth=0;},inner=>{
      const p=(d,s)=>()=>{f.tremDiv=d;f.tremShape=s;if(f.tremDepth<=0)f.tremDepth=.6;},q=(d,s)=>()=>f.tremDepth>0&&near(f.tremDiv,d,.01)&&f.tremShape===s;
      chips(inner,'PULSE',[['OFF',()=>{f.tremDepth=0;},()=>f.tremDepth<=0,false],['1/2',p(2,'sine'),q(2,'sine')],['1/4',p(1,'sine'),q(1,'sine')],['1/8',p(.5,'sine'),q(.5,'sine')],['1/16',p(.25,'sine'),q(.25,'sine')],['CHOP',p(.5,'square'),q(.5,'square')]]);
      sl(inner,'DEPTH',0,100,()=>Math.round(f.tremDepth*100),v=>{f.tremDepth=v/100;},pct);
    }));

    // ── MIX ──
    if(['mt_compression','mt_panning','mt_sidechain'].some(has))group(isMaster?'DYNAMICS':'MIX');
    if(has('mt_compression'))body.appendChild(section('comp','COMPRESSION',()=>f.compAmt>0,()=>{f.compAmt=0;},inner=>{
      chips(inner,null,[['OFF',()=>{f.compAmt=0;},()=>f.compAmt<=0,false],['GENTLE',()=>{f.compAmt=.3;},()=>near(f.compAmt,.3)],['PUNCHY',()=>{f.compAmt=.6;},()=>near(f.compAmt,.6)],['SQUASH',()=>{f.compAmt=.95;},()=>near(f.compAmt,.95)]]);
      sl(inner,'AMOUNT',0,100,()=>Math.round(f.compAmt*100),v=>{f.compAmt=v/100;},pct);
    }));
    if(has('mt_panning'))body.appendChild(section('pan','PAN',()=>f.pan!==0||f.panAuto>0,()=>{f.pan=0;f.panAuto=0;},inner=>{
      const lr=v=>v===0?'CENTER':(v<0?'L ':'R ')+Math.abs(v);
      sl(inner,'POSITION',-100,100,()=>Math.round(f.pan*100),v=>{f.pan=v/100;},lr);
      const p=d=>()=>{f.panDiv=d;if(f.panAuto<=0)f.panAuto=.8;},q=d=>()=>f.panAuto>0&&near(f.panDiv,d,.01);
      chips(inner,'AUTO-PAN',[['OFF',()=>{f.panAuto=0;},()=>f.panAuto<=0,false],['1 BAR',p(4),q(4)],['1/2',p(2),q(2)],['1/4',p(1),q(1)]]);
      sl(inner,'AUTO DEPTH',0,100,()=>Math.round(f.panAuto*100),v=>{f.panAuto=v/100;},pct);
    }));
    if(has('mt_sidechain'))body.appendChild(section('sc','SIDECHAIN',()=>f.scAmt>0,()=>{f.scAmt=0;},inner=>{
      inner.appendChild($('div','fx-note','Ducks every time a KICK, TRAP KICK or THUD plays (on the pads or in the sequencer).'));
      chips(inner,null,[['OFF',()=>{f.scAmt=0;},()=>f.scAmt<=0,false],['LIGHT',()=>{f.scAmt=.35;},()=>near(f.scAmt,.35)],['PUMP',()=>{f.scAmt=.65;},()=>near(f.scAmt,.65)],['HARD',()=>{f.scAmt=.9;},()=>near(f.scAmt,.9)]]);
      sl(inner,'AMOUNT',0,95,()=>Math.round(f.scAmt*100),v=>{f.scAmt=v/100;},pct);
      chips(inner,'RELEASE',[['SHORT',()=>{f.scRel=.25;},()=>near(f.scRel,.25)],['MEDIUM',()=>{f.scRel=.5;},()=>near(f.scRel,.5)],['LONG',()=>{f.scRel=1;},()=>near(f.scRel,1)]]);
    }));

    paintAll();
    const foot=$('div','fx-foot');
    const pv=$('button','more-done','▶ PREVIEW');pv.addEventListener('click',preview);foot.appendChild(pv);
    const bk=$('button','more-done alt','DONE');bk.addEventListener('click',fm.close);foot.appendChild(bk);
    b.appendChild(foot);
  }
})();
