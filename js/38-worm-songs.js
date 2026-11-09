
// ══════════════════════════════════════════════
//  WORM WHACK — the 30 songs and their charts
//  Every song is composed here from the game's own instruments (no audio files): a seeded composer
//  picks a style (drum groove) and percussion layers — pure beats, no melodies — then lays
//  out intro → verse/chorus sections (and a boss section on levels 10 / 20 / 30).
//  The chart (where and when worms pop up) is built from that same song, so worms land on the kicks,
//  snares and hats you hear.
// ══════════════════════════════════════════════
const WW_NAMES=[
  'Moon Dust Shuffle','Crater Hop','Low Gravity Groove','Lunar Lullabeat','Regolith Rock',
  'Tide of Tranquility','Orbit Bop','Worm Hole Wobble','Comet Tail Funk','Night Side Showdown',
  'Basalt Bounce','Starlight Skank','Ion Drift','Meteor Mambo','Dark Crater Drill',
  'Solar Flare Strut','Gravity Well Jam','Asteroid Belt Boogie','Rover Roll','Eclipse Engine',
  'Plasma Plaza','Ring Planet Rave','Quasar Quickstep','Dust Storm Drive','Nebula Nightline',
  'Pulsar Pulse','Cosmic Crunch','Event Horizon Hustle','Supernova Stomp','Tucana Wyrm King'
];
const WW_STYLES={
  // k = kick, s = snare/clap, h = hat ("x" hit, "o" softer)
  house:    {k:'x...x...x...x...',s:'....x.......x...',h:'..x...x...x...x.',sId:'clap',hId:'hihat',kId:'kick',bass:'basenote',bassR:'..x...x...x...x.',lead:['pluck','rs_keys'],pad:true},
  boombap:  {k:'x......x.x......',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',sId:'snare',hId:'hihat',kId:'kick',bass:'basenote',bassR:'x......x.x....x.',lead:['rs_keys','marimba'],pad:false},
  synthwave:{k:'x...x...x...x...',s:'....x.......x...',h:'oooooooooooooooo',sId:'snare',hId:'hihat',kId:'kick',bass:'basenote',bassR:'x.x.x.x.x.x.x.x.',lead:['rs_lead','bell'],pad:true},
  trap:     {k:'x.....x...x.....',s:'........x.......',h:'x.x.x.x.x.xxx.x.',sId:'clap',hId:'hihat',kId:'trapkick',bass:'sub',bassR:'x.....x...x.....',lead:['bell','pluck'],pad:true},
  funk:     {k:'x..x..x...x..x..',s:'....x..o....x...',h:'xoxoxoxoxoxoxoxo',sId:'snare',hId:'hihat',kId:'kick',bass:'basenote',bassR:'x..x..x.x.x..x.x',lead:['marimba','rs_lead'],pad:false},
  dub:      {k:'....x.......x...',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',sId:'rimshot',hId:'shaker',kId:'kick',bass:'sub',bassR:'x...x.x.....x.x.',lead:['stab','bell'],pad:false,offChord:true},
  // extra beats for Planet Hop
  breakbeat:{k:'x.........x.x...',s:'....x.......x..o',h:'x.x.x.x.x.x.x.x.',sId:'junglesnare',hId:'hihat',kId:'kick',bass:'basenote',bassR:'x.........x.x...',lead:['rs_lead','pluck'],pad:true},
  afro:     {k:'x..x....x..x....',s:'......x.......x.',h:'x.xxx.xxx.xxx.xx',sId:'rimshot',hId:'shaker',kId:'kick',bass:'basenote',bassR:'x..x..x...x..x..',lead:['marimba','pluck'],pad:false},
  twostep:  {k:'x.........x.....',s:'....x.......x...',h:'..x..x....x..x..',sId:'clap',hId:'hihat',kId:'kick',bass:'sub',bassR:'x.....x...x..x..',lead:['rs_keys','bell'],pad:true},
  halftime: {k:'x.....x.........',s:'........x.......',h:'x.x.x.x.x.x.x.x.',sId:'snare',hId:'hihat',kId:'trapkick',bass:'wobble',bassR:'x.......x.x.x...',lead:['rs_lead','stab'],pad:true},
  reggaeton:{k:'x...x...x...x...',s:'...x..x....x..x.',h:'x.x.x.x.x.x.x.x.',sId:'snare',hId:'hihat',kId:'kick',bass:'basenote',bassR:'x..x..x.x..x..x.',lead:['pluck','marimba'],pad:false},
  dnb:      {k:'x.........x.....',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',sId:'snare',hId:'hihat',kId:'kick',bass:'wobble',bassR:'x.......x.x.....',lead:['rs_lead','pluck'],pad:true},
};
// percussion layers per style: [sound, 16-step pattern, volume]; A = verses, B = added in choruses
const WW_PERC={
  house:    {A:[['shaker','oooooooooooooooo',.32]],B:[['rimshot','...x.......x..x.',.45],['clap','....x.......x...',.35]]},
  boombap:  {A:[['rimshot','..x.......x.....',.4]],B:[['shaker','x.x.x.x.x.x.x.x.',.3],['vinyl','x...............',.25]]},
  synthwave:{A:[['shaker','..x...x...x...x.',.3]],B:[['clap','....x.......x...',.4],['floortom','..............xx',.45]]},
  funk:     {A:[['rimshot','..x..x....x..x..',.35]],B:[['cowbell','x...x...x.x.x...',.35],['shaker','oxoxoxoxoxoxoxox',.25]]},
  dub:      {A:[['shaker','..x...x...x...x.',.3]],B:[['spaceperc','......x.........',.4],['floortom','x...........x...',.4]]},
  trap:     {A:[['rimshot','......x.......x.',.35]],B:[['shaker','oooooooooooooooo',.25],['clap','........x.......',.35]],boom:true},
  dnb:      {A:[['shaker','oooooooooooooooo',.3]],B:[['rimshot','..x.......x...x.',.4],['glitch','...............x',.3]],boom:true},
  breakbeat:{A:[['rimshot','.......x.....x..',.35]],B:[['cowbell','x.....x.....x...',.3],['shaker','x.x.x.x.x.x.x.x.',.28]]},
  afro:     {A:[['cowbell','x.x.xx.x.x.xx.x.',.3]],B:[['floortom','x.....x...x.....',.45],['clap','....x.......x...',.3]]},
  twostep:  {A:[['shaker','x.x.x.x.x.x.x.x.',.3]],B:[['rimshot','...x..x....x..x.',.4],['spaceperc','..........x.....',.35]],boom:true},
  halftime: {A:[['rimshot','....x.......x...',.35]],B:[['glitch','...........x....',.35],['shaker','oooooooooooooooo',.25]],boom:true},
  reggaeton:{A:[['shaker','x.x.x.x.x.x.x.x.',.3]],B:[['rimshot','x..x..x.x..x..x.',.35],['cowbell','x.......x.......',.3]]},
};
const WW_STYLE_ORDER=['house','boombap','synthwave','funk','dub','trap','house','synthwave','boombap','dnb'];
const WW_SCALES={minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],major:[0,2,4,5,7,9,11],mixo:[0,2,4,5,7,9,10],phryg:[0,1,3,5,7,8,10]};
const WW_PROGS=[[0,5,3,4],[0,3,4,0],[0,6,5,6],[0,4,5,3],[0,2,3,4],[5,3,0,4],[0,5,2,6],[3,4,0,0]];

function wwRng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// level settings (difficulty curve)
function wwLevel(lvl){
  const L=Math.max(1,Math.min(30,lvl));
  return{
    lvl:L,name:WW_NAMES[L-1],
    style:L===30?'dnb':L===20?'trap':L===10?'synthwave':WW_STYLE_ORDER[(L-1)%WW_STYLE_ORDER.length],
    bpm:Math.round(84+(L-1)*2.9+((L*7)%5-2)),
    craters:L<=6?4:L<=16?6:8,
    bodyBars:16+Math.floor(L/5)*4,
    density:2+(L-1)*.24,              // worms per bar (before section shaping)
    approach:Math.max(.57,1.15-(L-1)*.02), // seconds a worm takes to rise
    eighths:L>=6,sixteenths:L>=15,
    gold:L>=2,armor:L>=4,decoy:L>=7,hold:L>=9,chords:L>=12,
    boss:L%10===0,
    reward:Math.round((1.5+(L-1)*.05)*(L%10===0?1.25:1)*100)/100, // permanent points × for the first clear
  };
}

// ── compose a song: returns {bpm, step(sec), bars, events:[{t,kind,id,midi,dur,vel}], drumBars:[{k:[],s:[],h:[]}], sections:[]}
// (Planet Hop passes its own level settings `Pin` — same composer, its own seeds and styles)
function wwCompose(lvl,Pin){
  const P=Pin||wwLevel(lvl),R=wwRng(9173*(P.seed||lvl)+31),pick=a=>a[Math.floor(R()*a.length)];
  const st=WW_STYLES[P.style];
  const scaleName=pick(P.style==='house'||P.style==='funk'?['dorian','minor','mixo']:P.style==='synthwave'?['minor','major']:P.style==='dub'?['minor','dorian']:['minor','phryg','dorian']);
  const scale=WW_SCALES[scaleName];
  const root=36+Math.floor(R()*8);                  // C2..G2
  const progA=pick(WW_PROGS),progB=pick(WW_PROGS);
  const step=60/P.bpm/4,bar=step*16;
  const intro=1,outro=1,bars=intro+P.bodyBars+outro;
  const deg=(d,oct)=>root+12*(oct||0)+scale[((d%7)+7)%7]+12*Math.floor(d/7);
  const ev=[],drumBars=[],sections=[];
  const push=(t,kind,id,vel,midi,dur)=>ev.push({t,kind,id,vel,midi,dur});
  const pat=(str,s)=>str[s]==='x'?1:str[s]==='o'?.55:0;
  for(let b=0;b<bars;b++){
    const body=b-intro,isIntro=b<intro,isOutro=b>=bars-outro;
    const sec=isIntro?'intro':isOutro?'outro':(P.boss&&body>=P.bodyBars-8)?'boss':(Math.floor(body/8)%2===0?'A':'B');
    sections.push(sec);
    const t0=b*bar;
    const db={k:[],s:[],h:[]};
    const fill=(sec!=='intro'&&sec!=='outro'&&(body%8===7));
    for(let s=0;s<16;s++){
      const t=t0+s*step;
      let k=pat(st.k,s),sn=pat(st.s,s),h=pat(st.h,s);
      if(isIntro){sn=0;if(s%4)k=0;}
      if(isOutro){if(s>0){k=0;sn=0;h=0;}}
      if(fill&&s>=12){sn=s%2===0?.8:.5;h=0;}           // little snare fill into the next section
      if(P.style==='trap'&&sec!=='intro'&&body%4===3&&s>=12)h=.6; // hat rolls
      if(k){push(t,'drum',st.kId,.95*k);db.k.push(s);}
      if(sn){push(t,'drum',st.sId,.8*sn);db.s.push(s);}
      if(h){push(t,'drum',st.hId,(sec==='A'?.4:.5)*h);db.h.push(s);}
      if(sec==='boss'&&s%4===2)push(t,'drum','floortom',.55);
    }
    drumBars.push(db);
    if(isOutro){push(t0,'drum','spaceperc',.7);push(t0,'drum','downlift',.4);continue;}
    if(isIntro)continue;
    // percussion layers (all unpitched — the songs are pure beats): verses get the light layer,
    // choruses add the heavy one, the boss gets everything
    const lay=WW_PERC[P.style]||WW_PERC.house,layers=sec==='A'?lay.A:lay.A.concat(lay.B);
    layers.forEach(([id,str,v])=>{for(let s=0;s<16;s++){const x=pat(str,s);if(x&&!(fill&&s>=12))push(t0+s*step,'drum',id,v*x);}});
    // 808 boom under the kicks (one fixed note, so nothing can clash)
    if(lay.boom&&sec!=='A')db.k.forEach(s=>push(t0+s*step,'drum','sub',.5));
    // a crash-style accent on the first beat of every section
    if(body>0&&body%8===0)push(t0,'drum',sec==='boss'?'zap':'spaceperc',.55);
    // risers into choruses
    if(sec!=='intro'&&body%8===7&&b<bars-2)push(t0+8*step,'drum','riser',.45);
  }
  ev.sort((a,b)=>a.t-b.t);
  return{P,bpm:P.bpm,step,bar,bars,intro,events:ev,drumBars,sections,scaleName,root,style:P.style,length:bars*bar};
}

// ── chart: worms to whack, built from the song ──
// note: {t, c (crater), type:'normal'|'gold'|'armor'|'hold'|'decoy', dur (hold, s), boss}
// Designed like a rhythm-game chart rather than a random spray:
//  • HEAR IT, KNOW WHERE: kicks always pop on the bottom row, snares/claps on the top row,
//    hats on the middle / outer craters — so the beat tells you which pad before you see the worm.
//  • PHRASES: every 8-bar section is CALL (bars 1-2) → REPEAT (3-4) → MIRROR (5-6, left↔right) →
//    PAYOFF (7, golden worm) → RUN (8, a sweep across the top row on the snare fill).
//    The same section type always charts the same way, so choruses become muscle memory;
//    later choruses add notes on top of what you already know.
//  • TEACH: a level that debuts a worm type shows it in the same slot of every phrase.
//  • SILENCE = MINE: space mines only appear where no drum plays.
function wwChart(song){
  const P=song.P,n=P.craters,cols=n/2,st=song.step,BS=song.bar;
  const notes=[],busy=new Array(n).fill(-1e9);
  const free=(c,t)=>busy[c]<=t-P.approach-.04;
  const REG=n===4?{k:[2,3],s:[0,1],h:null}:n===6?{k:[3,5],s:[0,2],h:[1,4]}:{k:[5,6],s:[1,2],h:[0,4,3,7]};
  const mir=c=>{const row=c<cols?0:1,col=c%cols;return row*cols+(cols-1-col);};
  const gapMin=P.lvl<6?4:P.lvl<15?2:1;
  const deb=k=>({gold:2,armor:4,decoy:7,hold:9,chords:12}[k]===P.lvl);
  let ctr={k:0,s:0,h:0},lastC=0,holdUntil=-1;
  const craterFor=(inst)=>{
    if(inst==='h'&&!REG.h){const c=lastC<cols?lastC+cols:lastC-cols;return c;}   // 4 craters: hats flick to the other row
    const r=REG[inst],c=r[ctr[inst]%r.length];ctr[inst]++;return c;
  };
  const add=(t,c,type,dur,extra)=>{
    if(!free(c,t)){const alt=[mir(c),c<cols?c+cols:c-cols].find(x=>free(x,t));if(alt===undefined)return null;c=alt;}
    const o=Object.assign({t,c,type:type||'normal',dur:dur||0},extra||{});notes.push(o);lastC=c;
    busy[c]=t+(o.type==='hold'?o.dur:o.type==='armor'?Math.max(.36,4*st)+.18:.2);return o;
  };
  const instAt=(db,s)=>db.k.includes(s)?'k':db.s.includes(s)?'s':db.h.includes(s)?'h':null;
  // the motif for a section type: which steps of a 2-bar phrase get worms (top-N by musical weight,
  // so a denser version always contains the lighter one)
  const motifs={};
  const motif=(label,b0,want,salt)=>{
    const key=label+'|'+want;if(motifs[key])return motifs[key];
    const R=wwRng(5531*P.lvl+7+label.charCodeAt(0)*131+salt),out=[[],[]];
    for(let j=0;j<2;j++){
      const db=song.drumBars[Math.min(b0+j,song.bars-2)],cand=[];
      for(let s=0;s<16;s++){const q=s%4===0,e=s%2===0;
        if(!q&&!(e&&P.eighths)&&!P.sixteenths)continue;
        const inst=instAt(db,s);if(!inst)continue;
        let w=(inst==='k'?3:inst==='s'?3.2:1)+(q?1.2:0)+(s===0?2:0);if(!e)w*=.35;
        cand.push({s,w:w+wwRng(5531*P.lvl+salt+s*17+j*7+label.charCodeAt(0))()*1.4});}
      cand.sort((a,b)=>b.w-a.w);
      const pick=[];let six=0;
      for(const c of cand){if(pick.length>=want)break;if(c.s%2&&six>=2)continue;if(pick.every(p=>Math.abs(p-c.s)>=gapMin)){pick.push(c.s);if(c.s%2)six++;}}
      out[j]=pick.sort((a,b)=>a-b);
    }
    void R;return motifs[key]=out;
  };
  // find the 8-bar phrases
  const occ={};
  let b=song.intro;
  while(b<song.bars-1){
    const label=song.sections[b];
    if(label==='outro')break;
    let len=0;while(b+len<song.bars-1&&song.sections[b+len]===label&&len<8)len++;
    if(label==='boss'){bossPhrase(b,len);b+=len;continue;}
    occ[label]=(occ[label]||0)+1;
    const first=b===song.intro,isB=label!=='A'&&label!=='intro';
    const base=Math.max(1,Math.round(P.density*(isB?1.15:.85)));
    const want=Math.max(1,Math.round(base*(occ[label]>=2?1.15:1)));
    const M=motif(label,b,want,0),Mlite=motif(label,b,Math.max(1,Math.round(want*.55)),0);
    for(let i=0;i<len;i++){
      const bb=b+i,t0=bb*BS,db=song.drumBars[bb];
      ctr=(i%2===0)?{k:0,s:0,h:0}:ctr;                 // every 2-bar phrase starts from the same hand
      const isFill=i===7&&db.s.includes(12)&&db.s.includes(14);
      let steps=(i===7?M[1]:i===6?M[0]:M[i%2]);
      if(first&&i<2)steps=Mlite[i%2];                   // the very first phrase is a lighter preview
      if(isFill)steps=steps.filter(s=>s<12);
      const mirror=i===4||i===5;
      const placed=[];
      steps.forEach((s,idx)=>{
        if(!instAt(db,s))return;
        const t=t0+s*st;if(P.lvl<15&&t<holdUntil)return;
        let c=craterFor(instAt(db,s));if(mirror)c=mir(c);
        let type='normal',dur=0;
        if(P.armor&&s===0&&((i===0||i===2)&&(isB||deb('armor'))||(P.lvl>=14&&(i===4||i===0))))type='armor';
        if(P.hold&&i===6&&s===0&&(isB||deb('hold')||P.lvl>=15)){const beats=P.lvl>=20?2:1;dur=beats*4*st;if(t+dur<(song.bars-1)*BS){type='hold';holdUntil=t+dur;}else dur=0;}
        if(P.gold&&deb('gold')&&i===2&&idx===0)type='gold';
        const o=add(t,c,type,dur);if(o)placed.push(o);
        // chords: a crash on the downbeat — both kick craters at once
        if(o&&P.chords&&s===0&&(i===0||i===4)&&(isB||deb('chords'))&&type==='normal'){const c2=REG.k.find(x=>x!==o.c);if(c2!==undefined)add(t,c2,'normal');}
      });
      // payoff: the last worm of bar 7 is golden
      if(P.gold&&i===6&&placed.length){const g=placed.filter(o=>o.type==='normal').pop();if(g)g.type='gold';}
      // the run: a sweep across the top row on the snare fill
      if(isFill){const run=P.sixteenths?[12,13,14,15]:[12,14],row=[...Array(cols).keys()];
        run.forEach((s,k)=>{if(!db.s.includes(s))return;const c=row[k%row.length];add(t0+s*st,(occ[label]%2===0)?mir(c):c,'normal');});}
      // space mines sit in the silence — if you can't hear a drum, don't hit it
      if(P.decoy&&(i===4||i===5)&&(deb('decoy')||wwRng(P.lvl*977+bb)()<.45+P.lvl*.015)){
        const quiet=[2,6,10,14,3,7,11,15].filter(s=>!instAt(db,s)&&!notes.some(o=>Math.abs(o.t-(t0+s*st))<1.5*st));
        if(quiet.length){const s=quiet[0],t=t0+s*st,c=[...Array(n).keys()].find(x=>free(x,t)&&!notes.some(o=>o.c===x&&Math.abs(o.t-t)<.5));
          if(c!==undefined){notes.push({t,c,type:'decoy',dur:0});busy[c]=t+.3;}}}
    }
    b+=len;
  }
  // the Wyrm: four 2-bar phases — SWEEP round the ring, ROWS on kick/snare, COLUMNS side to side, FRENZY
  function bossPhrase(b0,len){
    const ring=n===4?[0,1,3,2]:n===6?[0,1,2,5,4,3]:[0,1,2,3,7,6,5,4];
    const per=P.lvl>=30?3:P.lvl>=20?2:1;let k=0;
    for(let i=0;i<len;i++){
      const t0=(b0+i)*BS,ph=Math.floor(i/2);
      const sub=(ph===3&&P.lvl>=20)?2:4;
      for(let s=0;s<16;s+=sub){const t=t0+s*st;let cs=[];
        if(ph===0){for(let j=0;j<=per&&j<2;j++)cs.push(ring[(k+j*ring.length/2)%ring.length]);k++;}
        else if(ph===1){const row=(s/4)%2===0?REG.k:REG.s;cs=row.slice(0,per+1);}
        else if(ph===2){const col=(s/4)%2===0?0:cols-1;cs=[col,col+cols].slice(0,Math.min(2,per+1));}
        else{cs=[ring[k++%ring.length]];if(per>=2&&s%8===0)cs.push(mir(cs[0]));}
        cs.forEach(c=>{if(free(c,t)){notes.push({t,c,type:'normal',boss:true,dur:0});busy[c]=t+.2;}});
      }
    }
    // the final blow: a golden chord on the last downbeat
    const tl=(b0+len-1)*BS+12*st;REG.k.forEach(c=>{if(free(c,tl)){notes.push({t:tl,c,type:'gold',boss:true,dur:0});busy[c]=tl+.2;}});
  }
  notes.sort((a,b)=>a.t-b.t);
  return notes;
}
