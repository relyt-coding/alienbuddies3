
// ══════════════════════════════════════════════
//  PLANET HOP — levels, physics and the solvability bot
//  Everything is measured in BEATS: the alien runs one beat of distance per beat of music, so a jump
//  pressed on the beat clears an obstacle placed half a beat later. A normal jump lasts exactly 1 beat,
//  low gravity makes it 2, and a BOUNCE pad launches you exactly onto the next pad.
//  Each level is built from a library of rhythm patterns, then a perfect-play bot runs it with the same
//  physics the game uses; stardust is laid along the bot's path (so it rewards on-beat play) and any
//  pattern the bot can't survive would be caught by the tests.
// ══════════════════════════════════════════════
const PH_G=8,PH_V0=4,PH_DT=1/240;
const PH_NAMES=['First Steps on Luna','Crater Skipper','Moonbeam Bounce','Lunar Leap','Comet Over Luna',
  'Glacia Glide','Frostbite Funk','Ice Spire Hop','Aurora Drift','Frozen Comet Escape',
  'Magmora Dash','Lava Lamp Groove','Ember Leap','Volcano Two-Step','Supernova Sprint'];
const PH_STYLES=['house','reggaeton','afro','twostep','breakbeat','synthwave','funk','afro','twostep','halftime','breakbeat','reggaeton','dnb','twostep','dnb'];
const PH_PLANETS=[{name:'LUNA',ground:['#9a9aa8','#5b5b68'],pit:'#07070c',spike:'#c9ccd6',block:'#7c7c8c',sky:['#05061a','#1a1240'],glow:'#a0a8ff'},
                  {name:'GLACIA',ground:['#bfe6ff','#5b8fb8'],pit:'#06142a',spike:'#e8fbff',block:'#8cc4e8',sky:['#020c1c','#0b3a52'],glow:'#7fe8ff'},
                  {name:'MAGMORA',ground:['#6a3a2a','#2a1410'],pit:'#ff5a1a',spike:'#ffb066',block:'#4a2a20',sky:['#120404','#3a0a14'],glow:'#ff7a33'}];

function phLevel(L){
  L=Math.max(1,Math.min(15,L));
  return{lvl:L,seed:500+L*13,name:PH_NAMES[L-1],style:PH_STYLES[L-1],
    bpm:Math.round(88+(L-1)*4.3),bodyBars:12+L,boss:L%5===0,planet:L<=5?0:L<=10?1:2,
    reward:Math.round((1.6+(L-1)*.1)*(L%5===0?1.25:1)*100)/100};
}

// ── patterns (positions in beats relative to the pattern start; acts = what perfect play presses) ──
function phPatterns(){
  const S=(s,w,h)=>({k:'spike',s,w:w||.42,h:h||.55}),PIT=(a,b)=>({k:'pit',a,b}),BL=(a,b,h,fl)=>({k:'block',a,b,h,fl:!!fl});
  return{
    // flat stretches: no obstacles, just stardust arcs to hop for on the beat (skipping them never kills you, it costs stars)
    rest:   {len:4,from:1,make:(R,L)=>{
      const v=[[[0,'j'],[2,'j']],                       // two big hops on beats 1 and 3
               [[0,'j'],[1,'j'],[2,'j']],               // three quick hops
               [[0,'j'],[1.5,'j']],                     // hop, then an off-beat hop
               [[1,'j'],[3,'j']]];                      // hops on the backbeat (2 and 4)
      if(L>=3)v.push([[0,'j'],[.5,'j'],[2,'j']],        // double jump up to the high dust, then a hop
                     [[0,'j'],[.5,'j'],[2,'j'],[2.5,'j']]); // two double jumps
      return{o:[],a:v[Math.floor(R()*v.length)]};}},
    spike1: {len:4,from:1,make:R=>R()<.5?{o:[S(.5)],a:[[0,'j']]}:{o:[S(.5),S(2.5)],a:[[0,'j'],[2,'j']]}},
    gap1:   {len:4,from:1,make:R=>R()<.5?{o:[PIT(.3,.7)],a:[[0,'j']]}:{o:[PIT(.3,.7),PIT(2.3,2.7)],a:[[0,'j'],[2,'j']]}},
    block:  {len:4,from:2,make:()=>({o:[BL(.5,2.2,.8)],a:[[0,'j']]})},
    gap2:   {len:4,from:3,make:()=>({o:[PIT(.3,1.7)],a:[[0,'j'],[1,'j']]})},
    bounce2:{len:8,from:4,make:()=>({o:[PIT(.3,6.6),{k:'pad',s:1,w:.5,next:3},{k:'pad',s:3,w:.5,next:5},{k:'pad',s:5,w:.5,next:7}],a:[[0,'j'],[1,'b'],[3,'b'],[5,'b']]})},
    blockUp:{len:4,from:5,make:()=>({o:[BL(.5,1.6,.8),BL(1.5,3.0,1.6)],a:[[0,'j'],[1,'j']]})},
    lowgrav:{len:8,from:6,make:()=>({o:[{k:'zone',a:0,b:8,g:4},S(1,.45,.6),S(3,.45,.6),S(5,.45,.6)],a:[[0,'j'],[2,'j'],[4,'j']]})},
    bounce1:{len:8,from:7,make:()=>({o:[PIT(.3,6.6),...[1,2,3,4,5,6].map(s=>({k:'pad',s,w:.5,next:s+1}))],a:[[0,'j'],[1,'b'],[2,'b'],[3,'b'],[4,'b'],[5,'b'],[6,'b']]})},
    float:  {len:4,from:8,make:()=>({o:[PIT(.3,3.6),BL(.55,2.2,.8,true),BL(2.6,3.3,.8,true)],a:[[0,'j'],[2,'j']]})},
    spikeQ: {len:4,from:9,make:()=>({o:[S(.5),S(1.5),S(2.5)],a:[[0,'j'],[1,'j'],[2,'j']]})},
    gapMix: {len:4,from:9,make:()=>({o:[PIT(.3,1.7),S(2.5)],a:[[0,'j'],[1,'j'],[2,'j']]})},
    dspike: {len:4,from:11,make:()=>({o:[S(.5,.42,.5),S(.82,.42,.5),S(1.14,.42,.5)],a:[[0,'j'],[.5,'j']]})},
  };
}

// ── build a level: song + objects + perfect actions + stardust ──
// songIn (optional) = a YOUR BEATS song; L then picks which obstacles are in play (EASY 3 · NORMAL 8 · HARD 13)
function phBuild(L,songIn){
  const P=songIn?songIn.P:phLevel(L),song=songIn||wwCompose(0,P),R=wwRng(P.seed*7+1),PAT=phPatterns();
  const end=(song.bars-1)*4,bossS=P.boss?(song.intro+P.bodyBars-8)*4:Infinity;
  const pool=Object.keys(PAT).filter(n=>PAT[n].from<=L&&n!=='rest');
  const fresh=pool.filter(n=>PAT[n].from===L);           // patterns that debut on this level show up for sure
  const restP=Math.max(.08,.5-(L-1)*.04);
  const objs=[],acts=[];let k=4,seg=0;
  while(k<end-4){
    const boss=k>=bossS;
    let name;
    if(!boss&&fresh.length&&(seg===1||seg===4||seg===8))name=fresh[seg%fresh.length];
    else if(!boss&&R()<restP)name='rest';
    else name=pool[Math.floor(R()*pool.length)];
    if(k+PAT[name].len>end-4)name='rest';
    const m=PAT[name].make(R,L);
    m.o.forEach(o=>{const c=Object.assign({},o);['s','a','b','next'].forEach(f=>{if(c[f]!=null)c[f]+=k;});if(boss&&c.k==='spike')c.meteor=true;objs.push(c);});
    m.a.forEach(([t,w])=>acts.push({t:k+t,w}));
    k+=PAT[name].len;seg++;
  }
  const lv={P,song,end,bossS,objs,acts,dust:[]};
  lv.pits=objs.filter(o=>o.k==='pit');lv.blocks=objs.filter(o=>o.k==='block');lv.spikes=objs.filter(o=>o.k==='spike');
  lv.pads=objs.filter(o=>o.k==='pad');lv.zones=objs.filter(o=>o.k==='zone');
  // run the perfect bot and lay stardust on its path
  const bot=phRunBot(lv,true);
  lv.botOk=bot.ok;lv.botDeath=bot.death;
  lv.dust=bot.path.filter(p=>p.air).filter((p,i,a)=>i===0||p.s-a[i-1].s>=.24).map(p=>({s:p.s,h:p.h+.5}));
  return lv;
}

// ── physics (shared by the game and the bot) ──
function phNewState(){return{s:0,h:0,vy:0,grounded:true,air:1,onPad:null,padT:0,bufJ:-9,bufB:-9,dead:null,flip:0,landT:-9,padsDropped:new Set(),bounces:0};}
function phZoneG(lv,s){for(const z of lv.zones)if(s>=z.a&&s<z.b)return z.g;return PH_G;}
function phInPit(lv,s){for(const p of lv.pits)if(s>p.a&&s<p.b)return true;return false;}
// highest surface at s that is at or below height h (null = nothing to stand on: a pit)
function phSupport(lv,S,s,h){
  // the ground only holds you if you're not already below it (dropping into a pit means the far edge is a wall)
  let top=(phInPit(lv,s)||h<-.05)?null:0,pad=null;
  for(const b of lv.blocks)if(s>=b.a&&s<=b.b&&b.h<=h+1e-6&&(top===null||b.h>top))top=b.h;
  for(const p of lv.pads)if(!S.padsDropped.has(p)&&Math.abs(s-p.s)<=p.w/2&&0<=h+1e-6&&(top===null||0>=top)){top=0;pad=p;}
  return{top,pad};
}
function phJump(lv,S){
  if(S.dead)return;
  if(S.grounded){S.vy=PH_V0;S.grounded=false;S.onPad=null;S.air=1;return 'jump';}
  // about to land? buffer it as a normal jump instead of spending the double jump
  // (when the double jump is already used, a press up to ~1/3 beat early still counts — no wasted taps)
  if(S.vy<0){const sp=phSupport(lv,S,S.s,S.h);if(sp.top!==null){const g=phZoneG(lv,S.s),d=S.h-sp.top,tl=(S.vy+Math.sqrt(S.vy*S.vy+2*g*Math.max(0,d)))/g;
    if(tl<(S.air>0?.12:.34)){S.bufJ=S.s;return 'buffer';}}}
  if(S.air>0){S.vy=PH_V0;S.air=0;S.flip=1;return 'double';}
  return null;
}
function phBounce(lv,S){
  if(S.dead)return;
  if(S.grounded&&S.onPad){
    const g=phZoneG(lv,S.s),T=Math.max(.6,Math.min(3.2,S.onPad.next-S.s));
    S.vy=g*T/2;S.grounded=false;S.padsDropped.add(S.onPad);S.onPad=null;S.air=1;S.bounces++;return 'bounce';
  }
  if(!S.grounded){S.bufB=S.s;return 'buffer';}
  return null;
}
function phStep(lv,S,dt){
  if(S.dead)return;
  const g=phZoneG(lv,S.s);
  S.s+=dt;S.flip=Math.max(0,S.flip-dt*2.2);
  if(S.grounded){
    const sp=phSupport(lv,S,S.s,S.h+1e-4);
    if(sp.top===null||sp.top<S.h-1e-3){S.grounded=false;S.onPad=null;S.vy=0;}      // walked off an edge
    else if(S.onPad&&S.s-S.padT>.28){S.padsDropped.add(S.onPad);S.onPad=null;S.grounded=false;S.vy=-.5;} // pad gives way
  }
  if(!S.grounded){
    const ph=S.h;S.vy-=g*dt;S.h+=S.vy*dt;
    if(S.vy<=0){
      const sp=phSupport(lv,S,S.s,ph+1e-4);
      if(sp.top!==null&&S.h<=sp.top){
        S.h=sp.top;S.vy=0;S.grounded=true;S.air=1;S.landT=S.s;
        if(sp.pad){S.onPad=sp.pad;S.padT=S.s;}
        if(S.s-S.bufB<.2&&S.onPad){S.bufB=-9;phBounce(lv,S);}
        else if(S.s-S.bufJ<.36){S.bufJ=-9;phJump(lv,S);}
      }
    }
  }
  // hazards
  for(const b of lv.blocks)if(S.s>=b.a&&S.s<=b.b&&S.h<b.h-.12&&S.h>(b.fl?b.h-.35:-9)){S.dead='block';return;}
  for(const sp of lv.spikes){const d=Math.abs(S.s-sp.s),half=sp.w/2+.05;if(d<half&&S.h<sp.h*(1-d/half)*.85){S.dead='spike';return;}}
  if(S.h<-1.2||(S.h<-.08&&!phInPit(lv,S.s)))S.dead='fall'; // fell in, or slammed into the pit's far wall
}
function phRunBot(lv,record){
  const S=phNewState(),path=[];let ai=0,nextRec=0;
  while(S.s<lv.end&&!S.dead){
    while(ai<lv.acts.length&&S.s>=lv.acts[ai].t){const a=lv.acts[ai++];if(a.w==='j')phJump(lv,S);else phBounce(lv,S);}
    phStep(lv,S,PH_DT);
    if(record&&S.s>=nextRec){path.push({s:S.s,h:S.h,air:!S.grounded&&S.h>.2});nextRec+=.25;}
  }
  return{ok:!S.dead,death:S.dead?{why:S.dead,at:+S.s.toFixed(2)}:null,path};
}
