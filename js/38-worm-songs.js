
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
function wwChart(song){
  const P=song.P,R=wwRng(5531*P.lvl+7),n=P.craters;
  const notes=[],busy=new Array(n).fill(-1e9); // busy[c] = time the crater is free again
  const cols=n===4?2:n===6?3:4;
  let fam='walk',famLeft=0,cur=Math.floor(R()*n),dir=1,lastC=-1;
  const gapMin=P.lvl<6?4:P.lvl<15?2:1;
  const free=(c,t,from)=>busy[c]<=t-(from||P.approach)-.04;
  const nextCrater=()=>{
    if(famLeft<=0){fam=['walk','pingpong','zigzag','mirror','random','walk','column'][Math.floor(R()*7)];famLeft=4+Math.floor(R()*6);dir=R()<.5?1:-1;}
    famLeft--;
    let c;
    if(fam==='walk')c=(cur+dir+n)%n;
    else if(fam==='pingpong')c=(lastC===cur)?(cur+1)%n:cur;
    else if(fam==='zigzag'){const col=(Math.floor(cur%cols)+1)%cols,row=cur<cols?1:0;c=row*cols+col;}
    else if(fam==='mirror')c=n-1-cur;
    else if(fam==='column'){c=cur<cols?cur+cols:cur-cols;}
    else{c=Math.floor(R()*n);if(c===cur)c=(c+1)%n;}
    lastC=cur;cur=c;return c;
  };
  let holdUntil=-1;
  for(let b=song.intro;b<song.bars-1;b++){
    const sec=song.sections[b],db=song.drumBars[b],t0=b*song.bar;
    if(sec==='boss'){
      // the Wyrm: every beat it bursts out of several craters at once
      const per=P.lvl>=30?3:P.lvl>=20?(b%2?3:2):2;
      for(let s=0;s<16;s+=(P.lvl>=30&&b%2?2:4)){
        const t=t0+s*song.step;const cs=[];
        let tries=0;while(cs.length<per&&tries<30){const c=Math.floor(R()*n);tries++;if(!cs.includes(c)&&free(c,t))cs.push(c);}
        cs.forEach(c=>{notes.push({t,c,type:'normal',boss:true});busy[c]=t+.2;});
      }
      continue;
    }
    let want=P.density*(sec==='A'?.85:1.15)*(.85+R()*.3);
    if(b===song.intro)want*=.6;
    want=Math.max(1,Math.round(want));
    const cand=[];
    for(let s=0;s<16;s++){
      const q=s%4===0,e=s%2===0;
      if(!q&&!(e&&P.eighths)&&!(P.sixteenths))continue;
      let w=(db.k.includes(s)?3:0)+(db.s.includes(s)?3:0)+(db.h.includes(s)?1:0)+(q?1.2:0);
      if(!w)continue;
      if(!e)w*=.35; // sixteenths are rare spice
      cand.push({s,w:w+R()*1.6});
    }
    cand.sort((a,b)=>b.w-a.w);
    const picked=[];
    for(const c of cand){if(picked.length>=want)break;if(picked.every(p=>Math.abs(p-c.s)>=gapMin))picked.push(c.s);}
    picked.sort((a,b)=>a-b);
    let sixteenthsUsed=0;
    for(const s of picked){
      if(s%2&&++sixteenthsUsed>2)continue;
      const t=t0+s*song.step;
      if(P.lvl<15&&t<holdUntil)continue;
      let c=nextCrater();
      if(!free(c,t)){const opts=[...Array(n).keys()].filter(x=>free(x,t));if(!opts.length)continue;c=opts[Math.floor(R()*opts.length)];cur=c;}
      let type='normal',dur=0;const r=R();
      if(P.hold&&s%4===0&&r<.05+(P.lvl-9)*.004){
        const beats=1+Math.floor(R()*(P.lvl>=20?3:2));dur=beats*4*song.step;
        if(t+dur<(song.bars-1)*song.bar){type='hold';holdUntil=t+dur;}else dur=0;
      }else if(P.armor&&r<.05+P.lvl*.004)type='armor';
      else if(P.gold&&r>.94)type='gold';
      const note={t,c,type,dur};
      notes.push(note);
      busy[c]=t+(type==='hold'?dur:type==='armor'?Math.max(.36,4*song.step)+.18:.2);
      // chords: a second worm at the same moment on strong beats
      if(P.chords&&type==='normal'&&s%8===0&&R()<Math.min(.3,(P.lvl-11)*.025)){
        const c2=[(c+cols)%n,n-1-c,(c+1)%n].find(x=>x!==c&&free(x,t));
        if(c2!==undefined){notes.push({t,c:c2,type:'normal',dur:0});busy[c2]=t+.2;}
      }
    }
    // decoys: space mines you should NOT hit
    if(P.decoy&&R()<.25+P.lvl*.02){
      const s=[2,6,10,14][Math.floor(R()*4)],t=t0+s*song.step;
      const opts=[...Array(n).keys()].filter(x=>free(x,t)&&!notes.some(o=>o.c===x&&Math.abs(o.t-t)<.5));
      if(opts.length){const c=opts[Math.floor(R()*opts.length)];notes.push({t,c,type:'decoy',dur:0});busy[c]=t+.3;}
    }
  }
  notes.sort((a,b)=>a.t-b.t);
  return notes;
}
