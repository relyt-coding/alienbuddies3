// ══════════════════════════════════════════════
//  AUTOMATION — draw how a knob changes over the song (late-game upgrade off Effects)
// ══════════════════════════════════════════════
// Lanes: {ch, param, pts:[{p (song step), v (0..1)}]}. The song timeline is the same one VOX uses (PAT loops the beat
// for as long as the automation runs; ARR / SONG are the arrangement / song). The sequencer clock calls autoStep for
// every step and schedules a straight line to the next step's value on the audio clock, so moves are smooth.
// Params live on the channel's effects bus (a channel with automation always gets one): volume, filter, reverb send,
// echo send, pan. MASTER: volume. When playback stops every automated knob goes back to its normal setting.
let automation={lanes:[]};
let autoOpen=false,autoCh=0,autoParam='vol',autoSnap=1,autoPps=0;
const AUTO_PARAMS={
  vol:{label:'VOLUME',need:null,def:.8,fmt:v=>Math.round(v/.8*100)+'%',top:'125%',bot:'0%'},
  filt:{label:'FILTER',need:'mt_filter',def:1,fmt:v=>{const h=Math.round(40*Math.pow(450,v));return h>=1000?(h/1000).toFixed(1)+' kHz':h+' Hz';},top:'18 kHz',bot:'40 Hz'},
  rvb:{label:'REVERB',need:'mt_reverb',def:0,fmt:v=>Math.round(v*100)+'%',top:'100%',bot:'0%'},
  echo:{label:'ECHO',need:'mt_echo',def:0,fmt:v=>Math.round(v*100)+'%',top:'100%',bot:'0%'},
  pan:{label:'PAN',need:'mt_panning',def:.5,fmt:v=>{const p=Math.round((v*2-1)*100);return p===0?'CENTER':(p<0?'L ':'R ')+Math.abs(p);},top:'RIGHT',bot:'LEFT'},
};
function autoOwned(){return typeof musicHas==='function'&&musicHas('mt_automation');}
function autoSanitize(a){
  const out={lanes:[]};
  (a&&Array.isArray(a.lanes)?a.lanes:[]).forEach(L=>{
    if(!L||!AUTO_PARAMS[L.param]||!(L.ch>=0&&L.ch<FX_VOX_BASE+VOX_MAX_LAYERS))return;
    const pts=(Array.isArray(L.pts)?L.pts:[]).filter(p=>p&&isFinite(p.p)&&isFinite(p.v)).map(p=>({p:Math.max(0,+p.p),v:Math.max(0,Math.min(1,+p.v))})).sort((a,b)=>a.p-b.p).slice(0,400);
    if(pts.length)out.lanes.push({ch:L.ch|0,param:L.param,pts});
  });
  return out;
}
function automationSave(){return autoSanitize(automation);} // (not autoSave: that's the game's save)
function automationLoad(a){autoResetParams();automation=autoSanitize(a);if(autoOpen)autoRender();}
function autoLane(ch,param,create){let L=automation.lanes.find(x=>x.ch===ch&&x.param===param);if(!L&&create){L={ch,param,pts:[]};automation.lanes.push(L);}return L||null;}
function autoActiveLanes(){if(!autoOwned())return[];return automation.lanes.filter(L=>L.pts.length&&(!AUTO_PARAMS[L.param].need||musicHas(AUTO_PARAMS[L.param].need)));}
// which params of a channel are automated (used by the effects engine to give it a bus)
function autoChannelParams(ch){const o={};let any=false;autoActiveLanes().forEach(L=>{if(L.ch===ch){o[L.param]=true;any=true;}});return any?o:null;}
function autoHasLanes(){return autoActiveLanes().length>0;}
function autoLastPos(){let e=0;autoActiveLanes().forEach(L=>{e=Math.max(e,L.pts[L.pts.length-1].p);});return e;}
function autoValueAt(L,p){
  const P=L.pts;if(!P.length)return null;
  if(p<=P[0].p)return P[0].v;if(p>=P[P.length-1].p)return P[P.length-1].v;
  let i=1;while(i<P.length&&P[i].p<p)i++;const a=P[i-1],b=P[i];return a.v+(b.v-a.v)*(p-a.p)/Math.max(1e-6,b.p-a.p);
}
// the AudioParam a lane drives, and how 0..1 maps onto it
function autoTarget(ch,param){
  if(ch===FX_MASTER)return param==='vol'&&drumMasterReal?{p:drumMasterReal.gain,map:v=>v*1.25}:null;
  const b=fxBusFor(ch);if(!b)return null;
  if(param==='vol')return{p:b.post.gain,map:v=>v*1.25};
  if(param==='filt'){const s=b.stages.filt;return s?{p:s.b.frequency,map:v=>40*Math.pow(450,v)}:null;}
  if(param==='rvb')return{p:b.rSend.gain,map:v=>v*.9};
  if(param==='echo')return{p:b.eSend.gain,map:v=>v*.9};
  if(param==='pan')return b.pan?{p:b.pan.pan,map:v=>v*2-1}:null;
  return null;
}
let _autoTouched=false;
// called by the sequencer clock for every step (from voxStep), with the song position
function autoStep(pos,at,quiet){
  if(quiet)return;
  const lanes=autoActiveLanes();if(!lanes.length)return;
  const sd=voxSd();
  lanes.forEach(L=>{
    const T=autoTarget(L.ch,L.param);if(!T)return;
    try{T.p.setValueAtTime(T.map(autoValueAt(L,pos)),at);T.p.linearRampToValueAtTime(T.map(autoValueAt(L,pos+1)),at+sd);}catch(e){}
  });
  _autoTouched=true;
}
// stopped: put every automated knob back to its normal setting
function autoResetParams(){
  if(!_autoTouched||!audioCtx)return;_autoTouched=false;
  const now=audioCtx.currentTime;
  automation.lanes.forEach(L=>{
    const T=autoTarget(L.ch,L.param);if(!T)return;
    try{T.p.cancelScheduledValues(now);}catch(e){}
    let v;
    if(L.ch===FX_MASTER){v=1;}
    else{const f=fxEffective(getTrackFx(L.ch,false),L.ch)||FX_DEFAULTS;
      v=L.param==='vol'?1:L.param==='filt'?Math.max(40,Math.min(18000,f.filtFreq)):L.param==='rvb'?Math.min(1,f.rvbAmt)*.9:L.param==='echo'?Math.min(1,f.echoMix)*.9:Math.max(-1,Math.min(1,f.pan));}
    try{T.p.setValueAtTime(v,now);}catch(e){}
  });
}
// WAV export: the whole song's automation, scheduled on the offline context
function autoRenderOffline(totalSteps,lead){
  const lanes=autoActiveLanes();if(!lanes.length)return;
  const sd=voxSd();
  lanes.forEach(L=>{const T=autoTarget(L.ch,L.param);if(!T)return;
    T.p.setValueAtTime(T.map(autoValueAt(L,0)),lead);
    for(let s=1;s<=totalSteps;s++)T.p.linearRampToValueAtTime(T.map(autoValueAt(L,s)),lead+s*sd);});
}

// ══════════════════════════════════════════════
//  UI (AUTO button → full-screen lane editor)
// ══════════════════════════════════════════════
const _ax=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;};
const seqAutoBtn=_ax('button','seq-mode-pill','AUTO');seqAutoBtn.id='seqAutoBtn';
seqAutoBtn.style.cssText='border:1px solid #2a2a4a;border-radius:4px;padding:.12rem .4rem;display:none;';
(function(){const r=document.getElementById('seqVoxBtn')||document.getElementById('seqRollBtn');if(r&&r.parentNode)r.parentNode.insertBefore(seqAutoBtn,r.nextSibling);})();
const autoView=_ax('div','vox-view auto-view');autoView.id='autoView';
(function(){const a=document.getElementById('seqArea'),pv=document.getElementById('seqPatternView');if(a)a.insertBefore(autoView,pv||null);})();
const autoBar=_ax('div','vox-bar'),autoLanesBar=_ax('div','vox-selbar'),autoScroll=_ax('div','auto-scroll'),autoFoot=_ax('div','vox-foot');
autoView.appendChild(autoBar);autoView.appendChild(autoLanesBar);autoView.appendChild(autoScroll);autoView.appendChild(autoFoot);
const autoAxis=_ax('div','auto-axis'),autoTl=_ax('div','vox-tl auto-tl');autoScroll.appendChild(autoAxis);autoScroll.appendChild(autoTl);
const autoInner=_ax('div','vox-inner');autoTl.appendChild(autoInner);
const autoRuler=_ax('div','vox-ruler'),autoArea=_ax('div','auto-area'),autoPh=_ax('div','vox-ph'),autoFlag=_ax('div','vox-flag'),autoEnd=_ax('div','vox-end');
[autoRuler,autoArea,autoEnd,autoFlag,autoPh].forEach(e=>autoInner.appendChild(e));
const SVGNS='http://www.w3.org/2000/svg';
const autoSvg=document.createElementNS(SVGNS,'svg');autoSvg.setAttribute('class','auto-svg');autoArea.appendChild(autoSvg);
const autoFootTxt=_ax('span','vox-foot-txt');autoFoot.appendChild(autoFootTxt);
function autoZoom(){return autoPps||(IS_DESKTOP?6:4);}
function autoChannels(){
  const out=[];
  seqLayers.forEach((l,i)=>{const s=SOUND_MAP[l.soundId];out.push([i,'TRACK '+(i+1)+' · '+(s?s.name:'—'),s?s.color:'#888']);});
  const rn=typeof pianoRollLayers==='function'?pianoRollLayers():0;
  for(let i=0;i<rn;i++){const L=pianoRoll.layers[i],s=L&&L.soundId&&SOUND_MAP[L.soundId];out.push([FX_ROLL_BASE+i,'ROLL '+(i+1)+' · '+(s?s.name:'—'),s?s.color:'#888']);}
  const vn=typeof voxLayerCount==='function'?voxLayerCount():0;
  for(let i=0;i<vn;i++)out.push([FX_VOX_BASE+i,voxLayerName(i),VOX_LANE_COLORS[i]]);
  out.push([FX_MASTER,'MASTER (whole song)','#ffcc00']);
  return out;
}
function autoParamsFor(ch){return Object.keys(AUTO_PARAMS).filter(k=>(ch===FX_MASTER?k==='vol':true)&&(!AUTO_PARAMS[k].need||musicHas(AUTO_PARAMS[k].need)));}
function autoShow(on){
  on=!!on&&autoOwned();
  if(on===autoOpen){if(on)autoRender();return;}
  if(on){if(typeof voxOpen!=='undefined'&&voxOpen)voxShow(false);if(typeof rollView!=='undefined'&&rollView>=0)showRoll(-1);}
  autoOpen=on;
  document.body.classList.toggle('auto-on',on);document.body.classList.toggle('vox-full',on);
  seqAutoBtn.classList.toggle('active',on);
  if(seqPlaying)stopSeq();
  if(on){if(!autoChannels().some(c=>c[0]===autoCh))autoCh=FX_MASTER;if(!autoParamsFor(autoCh).includes(autoParam))autoParam='vol';autoRender();autoLoop();
    requestAnimationFrame(()=>{autoTl.scrollLeft=Math.max(0,vocals.start*autoZoom()-40);});}
}
seqAutoBtn.addEventListener('click',e=>{e.stopPropagation();getCtx();autoShow(!autoOpen);});
if(typeof voxShow==='function'){const _v=voxShow;voxShow=function(on){if(on&&autoOpen)autoShow(false);return _v.apply(this,arguments);};}
if(typeof showRoll==='function'){const _r=showRoll;showRoll=function(i){if(i>=0&&autoOpen)autoShow(false);return _r.apply(this,arguments);};}
addEventListener('resize',()=>{if(autoOpen)autoRender();});
function autoChip(t,cls,tip,fn){const b=_ax('button','roll-chip'+(cls?' '+cls:''),t);if(tip)b.title=tip;b.addEventListener('click',e=>{e.stopPropagation();fn();});return b;}
function autoBuildBar(){
  autoBar.innerHTML='';
  autoBar.appendChild(_ax('span','vox-title auto-title','📈 AUTOMATION'));
  const sel=document.createElement('select');sel.className='roll-select';
  autoChannels().forEach(([ch,nm,col])=>{const o=document.createElement('option');o.value=ch;o.textContent=nm+(automation.lanes.some(L=>L.ch===ch&&L.pts.length)?'  ●':'');sel.appendChild(o);});
  sel.value=String(autoCh);
  const cc=(autoChannels().find(c=>c[0]===autoCh)||[])[2];if(cc){sel.style.color=cc;sel.style.borderColor=cc;}
  sel.addEventListener('change',()=>{autoCh=+sel.value;if(!autoParamsFor(autoCh).includes(autoParam))autoParam='vol';autoRender();});
  autoBar.appendChild(sel);
  const pw=_ax('div','roll-snaps');
  autoParamsFor(autoCh).forEach(k=>{const has=!!(autoLane(autoCh,k)||{pts:[]}).pts.length;
    pw.appendChild(autoChip(AUTO_PARAMS[k].label+(has?' ●':''),autoParam===k?'on':'','Automate '+AUTO_PARAMS[k].label.toLowerCase(),()=>{autoParam=k;autoRender();}));});
  autoBar.appendChild(pw);
  const sn=_ax('div','roll-snaps');sn.appendChild(_ax('span','roll-snap-lbl','SNAP'));
  [[0,'OFF'],[1,'1/16'],[4,'BEAT'],[16,'BAR']].forEach(([v,t])=>sn.appendChild(autoChip(t,autoSnap===v?'on':'','',()=>{autoSnap=v;autoBuildBar();})));
  autoBar.appendChild(sn);
  const zm=_ax('div','roll-snaps');zm.appendChild(autoChip('−','','Zoom out (↓)',()=>autoSetZoom(autoZoom()/1.5)));zm.appendChild(autoChip('+','','Zoom in (↑)',()=>autoSetZoom(autoZoom()*1.5)));autoBar.appendChild(zm);
  autoBar.appendChild(autoChip('CLEAR','muted','Remove this lane\'s points',()=>{const L=autoLane(autoCh,autoParam);if(!L||!L.pts.length)return;if(!confirm('Clear the '+AUTO_PARAMS[autoParam].label+' automation on this channel?'))return;
    autoResetParams();automation.lanes=automation.lanes.filter(x=>x!==L);autoRender();autoSaveSoon();}));
  autoBar.appendChild(autoChip('✕','roll-back','Back to the sequencer',()=>autoShow(false)));
  // every lane that has points, to jump between them
  autoLanesBar.innerHTML='';
  const used=automation.lanes.filter(L=>L.pts.length);
  if(!used.length){autoLanesBar.classList.add('empty');autoLanesBar.appendChild(_ax('span','vox-sel-hint','Lanes you draw show up here'));}
  else{autoLanesBar.classList.remove('empty');used.forEach(L=>{const c=autoChannels().find(x=>x[0]===L.ch);if(!c)return;
    const b=autoChip(c[1].split(' · ')[0]+' · '+AUTO_PARAMS[L.param].label,(L.ch===autoCh&&L.param===autoParam)?'on':'','',()=>{autoCh=L.ch;autoParam=L.param;autoRender();});b.style.color=c[2];autoLanesBar.appendChild(b);});}
}
function autoSetZoom(z){const sc=autoTl,mid=(sc.scrollLeft+sc.clientWidth/2)/autoZoom();autoPps=Math.max(.5,Math.min(32,z));autoRender();sc.scrollLeft=Math.max(0,mid*autoZoom()-sc.clientWidth/2);}
function autoArrowTarget(){if(!autoOpen)return null;return{zoom:k=>autoSetZoom(autoZoom()*k),scroll:px=>{autoTl.scrollLeft+=px;_autoFollowT=performance.now();},bar:()=>16*autoZoom()};}
function autoTlSteps(){let e=Math.max(typeof voxSongLen==='function'?voxSongLen():STEPS,autoLastPos(),vocals.start+16)+64;e=Math.max(e,(autoTl.clientWidth||0)/autoZoom());return Math.ceil(e/16)*16;}
function autoRender(){
  if(!autoOpen)return;
  autoBuildBar();
  const pps=autoZoom(),steps=autoTlSteps(),W=Math.round(steps*pps);
  autoInner.style.width=W+'px';
  autoRuler.innerHTML='';const barPx=16*pps,every=barPx>=28?1:barPx>=10?4:barPx>=4?8:16;
  for(let b=0;b*16<steps;b+=every){const t=_ax('span','vox-bar-n',String(b+1));t.style.left=(b*barPx)+'px';autoRuler.appendChild(t);}
  const beat=4*pps>=9;
  autoArea.style.backgroundImage='linear-gradient(90deg,#2a2a48 1px,transparent 1px)'+(beat?',linear-gradient(90deg,#16162a 1px,transparent 1px)':'')+',linear-gradient(0deg,transparent 49.5%,#1e1e36 49.5%,#1e1e36 50.5%,transparent 50.5%)';
  autoArea.style.backgroundSize=(barPx*every)+'px 100%'+(beat?','+(4*pps)+'px 100%':'')+',100% 100%';
  const P=AUTO_PARAMS[autoParam];
  autoAxis.innerHTML='';autoAxis.appendChild(_ax('span','auto-ax-top',P.top));autoAxis.appendChild(_ax('span','auto-ax-bot',P.bot));
  autoFlag.style.left=(vocals.start*pps)+'px';
  const end=seqMode==='pattern'?0:voxSongLen();autoEnd.style.display=end>0?'':'none';autoEnd.style.left=(end*pps)+'px';autoEnd.dataset.lbl='END';
  autoDraw();
  const L=autoLane(autoCh,autoParam);
  autoFootTxt.textContent=(L&&L.pts.length)?(IS_DESKTOP?'Click':'Tap')+' to add a point, drag a point to move it, '+(IS_DESKTOP?'click':'tap')+' a point to remove it. ▶ plays from the green flag (tap the ruler to move it).'
    :'Draw how '+P.label+' changes over the song: '+(IS_DESKTOP?'click':'tap')+' to add points. Before the first point and after the last, it stays at that value.';
}
function autoXY(p,v){const h=autoArea.clientHeight||200;return[p*autoZoom(),(1-v)*(h-16)+8];}
function autoDraw(){
  const L=autoLane(autoCh,autoParam),h=autoArea.clientHeight||200,W=parseFloat(autoInner.style.width)||1000;
  autoSvg.setAttribute('width',W);autoSvg.setAttribute('height',h);autoSvg.innerHTML='';
  const col=(autoChannels().find(c=>c[0]===autoCh)||[])[2]||'#a0a8ff';
  if(!L||!L.pts.length){const ln=document.createElementNS(SVGNS,'line');const y=autoXY(0,AUTO_PARAMS[autoParam].def)[1];
    ln.setAttribute('x1',0);ln.setAttribute('x2',W);ln.setAttribute('y1',y);ln.setAttribute('y2',y);ln.setAttribute('class','auto-def');autoSvg.appendChild(ln);return;}
  const pts=L.pts.map(p=>autoXY(p.p,p.v));
  const d='M0,'+pts[0][1]+' '+pts.map(q=>'L'+q[0]+','+q[1]).join(' ')+' L'+W+','+pts[pts.length-1][1];
  const fill=document.createElementNS(SVGNS,'path');fill.setAttribute('d',d+' L'+W+','+h+' L0,'+h+' Z');fill.setAttribute('class','auto-fill');fill.style.fill=col;autoSvg.appendChild(fill);
  const path=document.createElementNS(SVGNS,'path');path.setAttribute('d',d);path.setAttribute('class','auto-line');path.style.stroke=col;autoSvg.appendChild(path);
  L.pts.forEach((p,i)=>{const[x,y]=pts[i];const c=document.createElementNS(SVGNS,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',IS_DESKTOP?6:9);c.setAttribute('class','auto-pt');c.style.fill=col;c.dataset.i=i;autoSvg.appendChild(c);
    const t=document.createElementNS(SVGNS,'title');t.textContent=AUTO_PARAMS[autoParam].fmt(p.v);c.appendChild(t);});
}
let _ad=null,_autoFollowT=0;
const autoSaveSoon=(()=>{let t=0;return()=>{clearTimeout(t);t=setTimeout(()=>{autoSave();},400);};})();
function autoPosFrom(e){const r=autoArea.getBoundingClientRect(),h=autoArea.clientHeight||200;
  let p=(e.clientX-r.left)/autoZoom();p=autoSnap?Math.round(p/autoSnap)*autoSnap:Math.round(p*4)/4;
  return{p:Math.max(0,p),v:Math.max(0,Math.min(1,1-((e.clientY-r.top)-8)/(h-16)))};}
autoArea.addEventListener('pointerdown',e=>{
  const pt=e.target.closest&&e.target.closest('.auto-pt');
  if(pt){e.preventDefault();e.stopPropagation();const L=autoLane(autoCh,autoParam);_ad={kind:'move',L,i:+pt.dataset.i,x0:e.clientX,y0:e.clientY,moved:false,id:e.pointerId};try{autoArea.setPointerCapture(e.pointerId);}catch(err){}return;}
  _ad={kind:'tap',x0:e.clientX,y0:e.clientY,t0:Date.now(),id:e.pointerId};
});
autoArea.addEventListener('pointermove',e=>{
  const d=_ad;if(!d||d.kind!=='move'||e.pointerId!==d.id)return;
  if(!d.moved&&Math.abs(e.clientX-d.x0)<4&&Math.abs(e.clientY-d.y0)<4)return;d.moved=true;
  const q=autoPosFrom(e),P=d.L.pts;P[d.i].p=q.p;P[d.i].v=q.v;
  const c=autoSvg.querySelector('circle[data-i="'+d.i+'"]');if(c){const[x,y]=autoXY(q.p,q.v);c.setAttribute('cx',x);c.setAttribute('cy',y);}
  autoFootTxt.textContent=AUTO_PARAMS[autoParam].label+': '+AUTO_PARAMS[autoParam].fmt(q.v)+' at bar '+(Math.floor(q.p/16)+1);
});
function autoEndPtr(e){
  const d=_ad;if(!d||e.pointerId!==d.id)return;_ad=null;
  const small=Math.abs(e.clientX-d.x0)<10&&Math.abs(e.clientY-d.y0)<10;
  if(d.kind==='tap'){if(e.type==='pointercancel'||!small||Date.now()-d.t0>600)return;
    const q=autoPosFrom(e),L=autoLane(autoCh,autoParam,true);L.pts=L.pts.filter(p=>Math.abs(p.p-q.p)>1e-6);L.pts.push(q);L.pts.sort((a,b)=>a.p-b.p);autoRender();autoSaveSoon();return;}
  if(d.kind==='move'){
    if(!d.moved&&e.type!=='pointercancel'){d.L.pts.splice(d.i,1);if(!d.L.pts.length){autoResetParams();automation.lanes=automation.lanes.filter(x=>x!==d.L);}}
    else d.L.pts.sort((a,b)=>a.p-b.p);
    autoRender();autoSaveSoon();
  }
}
autoArea.addEventListener('pointerup',autoEndPtr);autoArea.addEventListener('pointercancel',autoEndPtr);
autoRuler.addEventListener('click',e=>{const r=autoInner.getBoundingClientRect();if(typeof voxSetFlag==='function'){voxSetFlag((e.clientX-r.left)/autoZoom());autoRender();}});
autoTl.addEventListener('scroll',()=>{_autoFollowT=performance.now();},{passive:true});
let _autoRaf=0;
function autoLoop(){
  if(_autoRaf)return;
  const tick=()=>{_autoRaf=0;if(!autoOpen)return;const c=audioCtx;
    if(seqPlaying&&_voxAnchor&&c){const p=_voxAnchor.pos+Math.max(0,Math.min(1.5,(c.currentTime-_voxAnchor.at)/voxSd()));autoPh.style.display='';autoPh.style.transform='translateX('+(p*autoZoom())+'px)';
      const x=p*autoZoom();if(performance.now()-_autoFollowT>2500&&(x<autoTl.scrollLeft||x>autoTl.scrollLeft+autoTl.clientWidth-30)){autoTl.scrollLeft=Math.max(0,x-60);_autoFollowT=performance.now()-2400;}}
    else autoPh.style.display='none';
    _autoRaf=requestAnimationFrame(tick);};
  _autoRaf=requestAnimationFrame(tick);
}
function refreshAutoUI(){seqAutoBtn.style.display=autoOwned()?'':'none';if(!autoOwned()&&autoOpen)autoShow(false);else if(autoOpen)autoRender();}
refreshAutoUI();
