// ══════════════════════════════════════════════
//  DNA SPLICE (v0.2.186)
//  Node 'dna_splice' (after the Egg Incubator) adds a DNA SPLICE button under the bunker's lamps. Pick two parents
//  (any bunker buddy or any racer), pay Alien Gems, and get a brand-new egg in the WAITING EGGS tray (js/77).
//   • Genes: each of the six colours (body, eyes, mouth, antennae, tips, feet) comes from ONE parent at random (50/50);
//     12% of the time two different colours BLEND into a new one. Antenna length and eye size come from one parent.
//     A special parent's shine (fx: sheen / ring / sparkles, the Light buddy's glass + halo) passes on 35% of the time.
//     The splice screen shows the two choices for every gene, then which one the egg got: it teaches inheritance.
//   • Parents are NOT used up (they're your bunker buddies / racers). Splicing the same pair again rolls new genes.
//   • Price: 1,500 💎 × 1.5 per splice already made (spliceCount, js/02).
//   • Harder splices take longer and more power: generation = 1 + the highest parent generation (bunker buddies,
//     the Founder and the Light buddy are generation 0). need = 1500 s × 1.5^(gen-1) of full heat (25 min for gen 1),
//     power = 1 + 0.5 × (gen-1) lamps' worth of draw (js/77 tick reads egg.power).
//  The egg carries its own look / pal / label / name / gen / need / power / parents; js/77 incKindOf() lays them over
//  EGG_KINDS.splice, and the racer keeps look / gen / parents when it hatches.
// ══════════════════════════════════════════════
const SPLICE_GENES=[['body','BODY'],['eye','EYES'],['mouth','MOUTH'],['stem','ANTENNAE'],['tip','TIPS'],['foot','FEET']];
function spliceCost(n){return Math.round(1500*Math.pow(1.5,n==null?spliceCount:n));}
(function(){
  const $=id=>document.getElementById(id),TAU=Math.PI*2;
  const has=()=>typeof unlockedSkills!=='undefined'&&!!unlockedSkills.dna_splice;
  const save=()=>{if(typeof autoSave==='function')autoSave();};
  const toast=m=>{if(typeof showToast==='function')showToast(m);};

  // ── parents: {t:'b',i} = bunker buddy i, {t:'r',id} = racer ──
  const racerOf=p=>incRacers.find(r=>r.id===p.id);
  function specOf(p){if(p.t==='b')return buddyLookSpec(p.i);const r=racerOf(p);return r?Object.assign({},incKindOf(r).look):{};}
  function nameOf(p){if(p.t==='b'){const a=alienData[p.i];return (a&&a.name)||('BUDDY #'+(p.i+1));}const r=racerOf(p);return r?(r.name||'RACER'):'?';}
  function genOf(p){if(p.t==='b')return 0;const r=racerOf(p);return r?(r.gen|0):0;}
  function valid(p){return !!p&&(p.t==='b'?p.i>=0&&p.i<totalAliens:!!racerOf(p));}
  function same(a,b){return a&&b&&a.t===b.t&&(a.t==='b'?a.i===b.i:a.id===b.id);}
  function drawParent(cv,p,px){const d=Math.min(2,devicePixelRatio||1),w=px,h=px*.85;cv.width=Math.round(w*d);cv.height=Math.round(h*d);cv.style.width=w+'px';cv.style.height=h+'px';
    const g=cv.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);if(!p)return;
    try{if(p.t==='b')drawBuddy(g,w/2,h*.56,w*.68,{view:'turn',angle:18,idx:p.i,lite:px<60,antenna:1,t:1});
      else drawBuddy(g,w/2,h*.56,w*.68,{view:'turn',angle:18,look:makeBuddyLook(specOf(p)),lite:px<60,antenna:1,t:1,A:null});}catch(e){}}

  // ── genes ──
  const h2r=h=>{h=String(h||'#888').replace('#','');if(h.length===3)h=h.replace(/./g,'$&$&');const n=parseInt(h,16)||0;return[n>>16&255,n>>8&255,n&255];};
  const r2h=(r,g,b)=>'#'+[r,g,b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
  const blend=(a,b)=>{const A=h2r(a),B=h2r(b);return r2h((A[0]+B[0])/2,(A[1]+B[1])/2,(A[2]+B[2])/2);};
  const pick=(a,b)=>Math.random()<.5?a:b;
  function makeChild(A,B){
    const spec={},genes={};
    SPLICE_GENES.forEach(([k])=>{const a=A[k]||'#888888',b=B[k]||'#888888';
      if(a.toLowerCase()===b.toLowerCase()){spec[k]=a;genes[k]='both';return;}
      const r=Math.random();if(r<.12){spec[k]=blend(a,b);genes[k]='blend';}else if(r<.56){spec[k]=a;genes[k]='a';}else{spec[k]=b;genes[k]='b';}});
    spec.ant=pick(A.ant||1.35,B.ant||1.35);spec.eyeSize=pick(A.eyeSize||1,B.eyeSize||1);
    const fx=[A.fx,B.fx].filter(Boolean);if(fx.length&&Math.random()<.35){spec.fx=JSON.parse(JSON.stringify(fx[Math.floor(Math.random()*fx.length)]));genes.fx=1;}
    return{spec,genes};
  }
  const SYL=['ZO','KI','LU','MA','BE','NI','TA','RO','VEX','QUA','PIX','MO','ZU','LI','KO','RA'];
  function childName(a,b){const c=s=>String(s).toUpperCase().replace(/[^A-Z]/g,'');const A=c(a),B=c(b);
    if(!/^BUDDY/.test(String(a).toUpperCase())&&!/^BUDDY/.test(String(b).toUpperCase())&&A.length>=3&&B.length>=3)return (A.slice(0,Math.ceil(A.length/2))+B.slice(Math.floor(B.length/2))).slice(0,10);
    return SYL[Math.floor(Math.random()*SYL.length)]+SYL[Math.floor(Math.random()*SYL.length)];}
  const short=s=>{s=String(s).toUpperCase();return s.length>7?s.slice(0,6)+'.':s;};

  // ── the DNA SPLICE button under the lamps ──
  const btn=document.createElement('button');btn.id='spliceBtn';btn.className='inc-splice-btn';btn.innerHTML='<span class="dna-ico"></span>DNA SPLICE';btn.style.display='none';
  const area=$('eggArea');if(area)area.appendChild(btn);
  btn.addEventListener('click',()=>openSplice());
  setInterval(()=>{btn.style.display=has()?'':'none';},700);

  // ── the splice screen ──
  const v=document.createElement('div');v.id='spliceView';
  v.innerHTML=`<div class="sv-box"><div class="sv-hdr"><button id="svBack">BACK</button><div class="sv-title">DNA SPLICE</div><div style="width:3.6rem"></div></div>
    <div class="sv-parents"><button class="sv-par" data-p="0"><canvas></canvas><b>PICK A BUDDY</b></button><canvas id="svHelix"></canvas><button class="sv-par" data-p="1"><canvas></canvas><b>PICK A BUDDY</b></button></div>
    <div class="sv-genes" id="svGenes"></div><div class="sv-note" id="svNote"></div><button id="svGo" class="sv-go"></button></div>`;
  document.body.appendChild(v);
  const P=[null,null];let result=null,raf=0,eggFlash=0;
  function openSplice(){if(!has())return;result=null;if(!valid(P[0]))P[0]=null;if(!valid(P[1]))P[1]=null;paint();v.classList.add('on');document.body.classList.add('splice-open');cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}
  function closeSplice(){v.classList.remove('on');document.body.classList.remove('splice-open');cancelAnimationFrame(raf);}
  $('svBack').addEventListener('click',closeSplice);
  v.querySelectorAll('.sv-par').forEach(b=>b.addEventListener('click',()=>openPicker(+b.dataset.p)));
  function paint(){
    v.querySelectorAll('.sv-par').forEach((b,k)=>{const p=P[k],cv=b.querySelector('canvas');drawParent(cv,p,Math.min(110,innerWidth*.26));b.querySelector('b').textContent=p?nameOf(p):'PICK A BUDDY';b.classList.toggle('set',!!p);});
    const gl=$('svGenes');gl.innerHTML='';gl.classList.toggle('done',!!result);
    const A=P[0]&&specOf(P[0]),B=P[1]&&specOf(P[1]);
    SPLICE_GENES.forEach(([k,label])=>{const row=document.createElement('div');row.className='sv-gene';
      const chip=(col,on,tag)=>`<i class="sv-chip${on?' on':''}" style="background:${col||'#222'}">${tag||''}</i>`;
      const got=result&&result.genes[k];
      let html=`<span>${label}</span>`+chip(A&&A[k],got==='a'||got==='both')+`<em>OR</em>`+chip(B&&B[k],got==='b'||got==='both');
      if(got==='blend')html+=`<em>→</em>`+chip(result.spec[k],true,'')+`<small>BLEND!</small>`;
      row.innerHTML=html;gl.appendChild(row);});
    const ready=P[0]&&P[1],gen=ready?Math.max(genOf(P[0]),genOf(P[1]))+1:1,cost=spliceCost();
    const mins=Math.round(1500*Math.pow(1.5,gen-1)/60),pw=1+.5*(gen-1);
    $('svNote').innerHTML=result?`<b style="color:${incKindOf({look:result.spec}).col}">${result.name}'S EGG</b> IS WAITING IN YOUR BUNKER`+(result.genes.fx?' · IT CAUGHT A SPECIAL SHINE!':''):
      (ready?`EACH COLOUR COMES FROM ONE PARENT · SOMETIMES TWO BLEND<br>GENERATION ${gen} · ~${mins} MIN OF HEAT`+(pw>1?` · ×${pw} POWER`:''):'PICK TWO PARENTS');
    const go=$('svGo');go.innerHTML=(result?'SPLICE AGAIN · ':'SPLICE · ')+'💎 '+fmtGems(cost);go.disabled=!ready;go.classList.toggle('cant',!ready||alienGems<cost);
    if(typeof refreshAlienGems==='function')try{refreshAlienGems(go);}catch(e){}
  }
  $('svGo').addEventListener('click',()=>{
    if(!P[0]||!P[1])return;const cost=spliceCost();
    if(alienGems<cost){toast('Not enough Alien Gems yet.');return;}
    alienGems-=cost;spliceCount++;
    const A=specOf(P[0]),B=specOf(P[1]),{spec,genes}=makeChild(A,B),gen=Math.max(genOf(P[0]),genOf(P[1]))+1,na=nameOf(P[0]),nb=nameOf(P[1]),name=childName(na,nb);
    const egg=incNewEgg('splice');
    Object.assign(egg,{look:spec,pal:[spec.body,spec.tip,spec.eye,spec.foot],label:short(na)+' × '+short(nb),name,gen,need:Math.round(1500*Math.pow(1.5,gen-1)),power:1+.5*(gen-1),special:!!spec.fx,parents:[na,nb]});
    if(typeof incAddEgg==='function')incAddEgg(egg);else{incEggs.push(egg);save();}
    result={spec,genes,name,egg};eggFlash=performance.now();
    try{if(typeof playSfxTierUnlock==='function')playSfxTierUnlock(5,.7);}catch(e){}
    save();paint();
  });
  // the helix between the parents (their body colours), turning into the new egg for a moment after a splice
  function frame(now){raf=requestAnimationFrame(frame);const cv=$('svHelix'),W=Math.round(Math.min(90,innerWidth*.2)),H=Math.round(W*1.5),d=Math.min(2,devicePixelRatio||1);
    if(cv.width!==W*d){cv.width=W*d;cv.height=H*d;cv.style.width=W+'px';cv.style.height=H+'px';}
    const g=cv.getContext('2d'),t=now/1000;g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,W,H);
    const ca=P[0]?specOf(P[0]).body:'#2a6a4a',cb=P[1]?specOf(P[1]).body:'#2a6a4a',sp=result&&now-eggFlash<2600;
    const N=14;for(let i=0;i<N;i++){const y=H*.08+i*(H*.84/(N-1)),ph=t*2.2+i*.55,x1=W/2+Math.sin(ph)*W*.32,x2=W/2-Math.sin(ph)*W*.32,front=Math.cos(ph)>0;
      g.globalAlpha=sp?.25:.9;g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=1.5;g.beginPath();g.moveTo(x1,y);g.lineTo(x2,y);g.stroke();
      g.fillStyle=front?ca:cb;g.beginPath();g.arc(x1,y,3.2,0,TAU);g.fill();g.fillStyle=front?cb:ca;g.beginPath();g.arc(x2,y,3.2,0,TAU);g.fill();}
    g.globalAlpha=1;
    if(sp){const k=Math.min(1,(now-eggFlash)/400);g.save();g.translate(W/2,H/2);g.scale(k,k);try{paintBuddyEgg(g,0,0,W*.28,W*.36,t,!!result.egg.special,0,result.egg.pal,1);}catch(e){}g.restore();}}

  // ── the parent picker: racers first, then every bunker buddy ──
  const pk=document.createElement('div');pk.id='splicePick';
  pk.innerHTML='<div class="sp-box"><div class="sv-hdr"><div class="sv-title" style="font-size:1.05rem">PICK A PARENT</div><button id="spClose">CLOSE</button></div><div class="sp-grid" id="spGrid"></div></div>';
  document.body.appendChild(pk);
  $('spClose').addEventListener('click',()=>pk.classList.remove('on'));
  pk.addEventListener('click',e=>{if(e.target===pk)pk.classList.remove('on');});
  function openPicker(slot){const gr=$('spGrid');gr.innerHTML='';const other=P[1-slot],list=[];
    incRacers.forEach(r=>list.push({t:'r',id:r.id}));for(let i=0;i<totalAliens;i++)list.push({t:'b',i});
    list.forEach((p,n)=>{const c=document.createElement('button');c.className='sp-cell'+(p.t==='r'?' racer':'');if(same(p,other))c.disabled=true;
      const cv=document.createElement('canvas');c.appendChild(cv);const s=document.createElement('small');s.textContent=nameOf(p);c.appendChild(s);
      c.addEventListener('click',()=>{P[slot]=p;result=null;pk.classList.remove('on');paint();});gr.appendChild(c);
      // draw in small batches so a full bunker opens instantly
      setTimeout(()=>drawParent(cv,p,52),Math.floor(n/12)*16);});
    pk.classList.add('on');}

  window.__splice={P,openSplice,makeChild,childName};
})();
