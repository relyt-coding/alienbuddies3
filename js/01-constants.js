
// TEST MODE: alienbuddies.space/test (or ?test when opened locally). Separate saves + the 🧪 test panel (js/28-test-mode.js).
const TEST_MODE=/^\/test\/?$/i.test(location.pathname)||/[?&]test(=|&|$)/i.test(location.search);

// ══════════════════════════════════════════════
//  CONSTANTS & COLORS
// ══════════════════════════════════════════════
const COLORS=[
  {hex:'#e8ff00',rgb:'232,255,0'},{hex:'#ff3333',rgb:'255,51,51'},
  {hex:'#00aaff',rgb:'0,170,255'},{hex:'#00ff88',rgb:'0,255,136'},
  {hex:'#ff00cc',rgb:'255,0,204'},{hex:'#ff8800',rgb:'255,136,0'},
  {hex:'#00ffee',rgb:'0,255,238'},{hex:'#bb44ff',rgb:'187,68,255'},
  {hex:'#aaff00',rgb:'170,255,0'},{hex:'#ff66aa',rgb:'255,102,170'},
  {hex:'#ffcc00',rgb:'255,204,0'},{hex:'#00ffbb',rgb:'0,255,187'},
  {hex:'#ffffff',rgb:'255,255,255'},{hex:'#ff6644',rgb:'255,102,68'},
  {hex:'#44ffcc',rgb:'68,255,204'},
];
const DOTS=5;
const ALIEN_OUTLINE_COLORS=['#00ff88','#ff44aa','#44aaff','#ffaa00','#aa44ff','#ff6644','#44ffee','#ffee44','#ff4466','#88ff44','#ff88cc','#44ccff','#ffcc44','#cc44ff','#ff8844'];
// Per-alien data: {name, color}
let alienData=[]; // grows with totalAliens
const ALIEN_TINTS=['hue-rotate(0deg)','hue-rotate(40deg)','hue-rotate(80deg)','hue-rotate(160deg)','hue-rotate(200deg)','hue-rotate(240deg)','hue-rotate(280deg)','hue-rotate(320deg)','hue-rotate(60deg) brightness(1.3)','hue-rotate(120deg) saturate(1.5)'];
const PARTY_COLORS=['#ff0044','#ff8800','#ffee00','#00ff88','#00ccff','#aa44ff','#ff00cc','#ffffff'];

function formatNum(n){n=Math.floor(n);const T=1e12;function sci(x){const e=Math.floor(Math.log10(x));return (x/Math.pow(10,e)).toFixed(3).replace(/\.?0+$/,'')+'e'+e;}return n<T?n.toLocaleString():sci(n);}
// ── v0.2.180: the score is ENERGY in JOULES (v0.2.162–179 showed it as watts). Energy is what you collect and spend; watts are
//   how fast it flows (1 W = 1 joule every second), so rates like the sequencer's earnings are joules per second.
//   The game's internal numbers did NOT change: 1 internal unit = 0.1 mJ (J_PER_UNIT), so one plain tap on a new save
//   makes 0.1 millijoules and every price keeps exactly the same ratio to a tap. Old saves need no conversion.
//   fmtJ(n)      → "2.5 kJ"    (prices, messages; 4 significant digits)
//   fmtJ(n,6)    → "520.526 J" (the big score: more digits so each tap visibly moves it)
//   jHtml(n)     → "2.5<small>kJ</small>" (shop price tags: big number, small unit)
//   fmtJps(n)    → "0.4 mJ/s"  (a rate in internal units per second)
const J_PER_UNIT=1e-4;
const J_UNITS=['mJ','J','kJ','MJ','GJ','TJ','PJ','EJ','ZJ','YJ','RJ','QJ'];   // J_UNITS[k] = 1000^(k-1) joules
function jParts(n,sig){n=Math.max(0,+n||0);sig=sig||4;
  const j=n*J_PER_UNIT;
  if(j<=0)return['0','mJ'];
  // v0.2.195: anything under 100 J stays in millijoules (5,000 mJ, not 5 J): bigger numbers feel better
  if(j<100){const m=j*1000;return[m>=1000?Math.floor(m).toLocaleString('en-US'):String(Math.round(m*100)/100),'mJ'];}
  const k=Math.max(0,Math.floor(Math.log10(j)/3)+1);
  if(k>=J_UNITS.length){const e=Math.floor(Math.log10(j));return[(j/Math.pow(10,e)).toFixed(2).replace(/\.?0+$/,'')+'e'+e,'J'];}
  let v=j/Math.pow(1000,k-1),t=v.toPrecision(sig);
  if(parseFloat(t)>=1000&&k+1<J_UNITS.length)return jParts(Math.pow(1000,k)/J_PER_UNIT,sig);   // 999.99 mJ → "1 J", not "1000 mJ"
  if(t.indexOf('e')>=0)t=String(Math.round(v));
  if(t.indexOf('.')>=0)t=String(Math.round(parseFloat(t)*100)/100);   // v0.2.193: never more than 2 decimals
  return[t,J_UNITS[k]];}
function fmtJ(n,sig){const p=jParts(n,sig);return p[0]+' '+p[1];}
// The game's Bebas Neue font has no lowercase, so "mJ" would show as "MJ" (megajoules!). Anything on screen uses the HTML
// versions below, which draw the unit symbol in Space Mono (class "ju") so mJ / kJ / MJ keep their real case.
function jHtml(n,sig){const p=jParts(n,sig);return p[0]+'<small class="ju">'+p[1]+'</small>';}
function fmtJh(n,sig){const p=jParts(n,sig);return p[0]+' <span class="ju">'+p[1]+'</span>';}
function fmtJpsH(n,sig){const p=jParts(n,sig||3);return p[0]+' <span class="ju">'+p[1]+'/s</span>';}
function fmtJps(n,sig){return fmtJ(n,sig||3)+'/s';}
// the score itself: MILLIJOULES and JOULES spelled out (so new players learn the word), then kJ, MJ, GJ … from 1 kJ up
// v0.2.193: the score stays in a unit until it reaches 10,000 of it (5,874 MILLIJOULES, not 5.8742 JOULES), with at most 2 decimals
function scoreParts(n){n=Math.max(0,Math.floor(n||0));const j=n*J_PER_UNIT;
  if(j<=0)return['0','MILLIJOULES'];
  let k=0;while(k+1<J_UNITS.length&&j/Math.pow(1000,k-1)>=(k===0?10000:10000))k++;   // mJ until 10 J (v0.2.201), then each unit until 10,000 of it
  const v=j/Math.pow(1000,k-1);if(v>=10000)return jParts(n,6);   // past QJ: scientific
  const t=v>=1000?Math.floor(v).toLocaleString('en-US'):String(Math.floor(v*100+1e-9)/100);
  if(k===0)return[t,t==='1'?'MILLIJOULE':'MILLIJOULES'];
  if(k===1)return[t,t==='1'?'JOULE':'JOULES'];
  return[t,J_UNITS[k]];}
function fmtScore(n){const p=scoreParts(n);return p[0]+' '+p[1];}
function scoreHtml(n){const p=scoreParts(n);return p[0]+' '+(/^[A-Z]+$/.test(p[1])?p[1]:'<span class="ju">'+p[1]+'</span>');}
// the exact energy in joules (the small line under the score once it's in kJ and up)
function fmtJoulesExact(n){n=Math.max(0,Math.floor(n||0));const v=n*J_PER_UNIT;return v.toLocaleString('en-US',{maximumFractionDigits:n<1e12?2:0})+(v===1?' joule':' joules');}
// old names (v0.2.162–179), kept so nothing that still calls them breaks
const fmtW=fmtJ,wHtml=jHtml,wParts=jParts;
function formatSci(n){n=Math.floor(n);if(n===0)return '0';const e=Math.floor(Math.log10(Math.max(1,n)));return (n/Math.pow(10,e)).toFixed(3).replace(/\.?0+$/,'')+'e'+e;}
function formatFull(n){n=Math.floor(n);return n.toLocaleString();}
function formatStore(n){n=Math.floor(n);const T=1e12;function sci(x){const e=Math.floor(Math.log10(x));return (x/Math.pow(10,e)).toFixed(2).replace(/\.?0+$/,'')+'E'+e;}if(n<T){if(n>=1e9)return(n/1e9).toFixed(2).replace(/\.?0+$/,'')+'B';if(n>=1e6)return(n/1e6).toFixed(2).replace(/\.?0+$/,'')+'M';if(n>=1e3)return(n/1e3).toFixed(0)+'K';return n.toLocaleString();}return sci(n);}
function formatRate(n){if(n<1e15){return n<1000?(Math.round(n*100)/100).toString():Math.floor(n).toLocaleString();}const e=Math.floor(Math.log10(n));return (n/Math.pow(10,e)).toFixed(2)+'E'+e;}
function formatMult(n){if(n<100000)return n.toLocaleString(undefined,{maximumFractionDigits:2});/* v0.2.193: 2 decimals at most */const e=Math.floor(Math.log10(n));return (n/Math.pow(10,e)).toFixed(2)+'E'+e;}

// ══════════════════════════════════════════════
//  UPGRADE DEFS
// ══════════════════════════════════════════════
// Unlock prices over 5 million are 30% pricier (a longer grind for the big unlocks); cheap early unlocks are untouched.
function bump30(c){return c>5e6?Math.round(c*1.3):c;}
// v0.2.194 STORE SALE: dot rows climb in ×2s now (were ×3s), so early income is lower; everything in the store costs half to keep the
// start moving. Applied to the unlock constants below and, at the end of this file, to every store price function.
// (Not to the drum pads and the first three buddies, which were hand-set, nor to the late grind items priced off alienCost(98).)
const SHOP_SALE=.5;
// ── Progress discount (the skill tree no longer boosts points) ──
// Point prices get cheaper as you collect aliens, by the same amount the old skill-tree point bonuses used to add at that
// stage (measured with the test-mode bot: none until alien 24, about ×10^8 by alien 50, ×10^13 by 60, ×10^14 at 79).
// So the alien pace stays where it was. Table: [aliens owned, log10 of the discount], straight lines in between.
const PROGRESS_DISCOUNT=[[23,0],[27,.9],[31,1.2],[35,2.8],[40,4],[45,6],[50,8.2],[55,11.4],[60,13.4],[65,13.8],[70,13.9],[79,14.4]];
function progressDiscount(a){
  if(a==null)a=typeof totalAliens==='number'?totalAliens:0;
  const T=PROGRESS_DISCOUNT;if(a<=T[0][0])return 1;
  let L=T[T.length-1][1];
  for(let i=1;i<T.length;i++)if(a<=T[i][0]){const[a0,l0]=T[i-1],[a1,l1]=T[i];L=l0+(l1-l0)*(a-a0)/(a1-a0);break;}
  return Math.pow(10,L);
}
// v0.2.136: aliens get their own discount curve (log10 per alien count, from ALIEN_L0), tuned so every alien from #47 on
// is a 10–40 min wait for an active player instead of a 20-minute burst (#50–66) followed by multi-hour walls.
// Upgrades keep the smooth PROGRESS_DISCOUNT above, so tuning one no longer knocks the other around.
let ALIEN_L0=46,ALIEN_L=[6.92,7.22,6.86,8.16,9.02,9.06,8.38,6.72,7.7,8.89,7.65,8.63,8.69,9.9,8.97,9.51,10.69,11.92,10.56,11.54,12.73,12.95,12.51,13.56,13.68,14.71,14.11,14.34,15.57,16.69,13.71,13.1,13.97,15.15,13.67,14.85,15.9,16.42,15.54,16.72,16.74,17.9,17.3,17.35,18.7,19.71,18.18,19.22,20.6,20.45,19.99,20.31,21.05,22.23,22.83];
function alienDiscount(n){
  if(!ALIEN_L||n<ALIEN_L0)return progressDiscount(n);
  const i=n-ALIEN_L0,k=ALIEN_L.length-1;
  return Math.pow(10,i<=k?ALIEN_L[i]:ALIEN_L[k]+(ALIEN_L[k]-ALIEN_L[k-1])*(i-k));
}
const _disc=c=>{const d=progressDiscount();return d>1?Math.max(1,Math.round(c/d)):c;};
const GAME_VERSION='0.2.250'; // bump on every delivered build (shown in Settings and on the home screen)
const BASE_CPS=5;
const UNLOCK_COST=Math.round((bump30(60000000))*SHOP_SALE);
const ALIEN_POWER_UNLOCK_COST=Math.round((bump30(600000000))*SHOP_SALE);

// 0.2: the Auto Clicker is now the sequencer (metronome). These two one-time upgrades switch a tracker's dot rows from the ×3 pattern to the ×4 pattern.
// Cost of the next dot-base upgrade (n = how many have been bought already): 100M, 100M, then x1000 each (100B, 100T, 100Qa ...). Max ×10.
const DOT_MAX_LEVEL=6; // level 6 = ×10
// Endgame dot upgrades. Each card (DRUMPAD / SEQUENCER) first has to be unlocked for 1B, then upgraded.
// Upgrade prices (n = upgrades already bought; each tracker pays separately): ×4 5B, then x1000 per level.
const DOT_UNLOCK_COST=Math.round((bump30(1e9))*SHOP_SALE);
// Longer sequencer loops (bought after the first track): level 1 = 32 steps, level 2 = 64 steps
// (32 / 64 steps are skill-tree nodes now: mt_steps32 / mt_steps64)
const DOT_COSTS=[5e10,5e17,5e24,5e31,5e38,5e45,5e52]; // v0.2.80: first upgrade unchanged, every level after is x10,000,000 (was x10,000)
// v0.2.80: TIER 3 — Sequencer Multi-Click (costs more than the dot upgrades, and more to unlock)
const SEQ_MC_UNLOCK_COST=Math.round((1e12)*SHOP_SALE);
const SEQ_MC_MAX_LEVEL=6; // level 6 = 8 clicks per step
// v0.2.92: Tier 2, the dot multipliers and Tier 3 cost +75% per level, stacking (1st level ×1.75, 2nd ×3.06, 3rd ×5.36…)
// so buys stop landing back to back. (One-time unlock gates keep their price.)
function _p75(lvl){return Math.pow(1.75,Math.max(0,lvl)+1);}
function seqMultiClickCost(lvl){return Math.round(_disc(5e12*Math.pow(1e8,lvl))*_p75(lvl));}
function seqMultiClickUpgradeAt(lvl){const clicks=lvl+2;return{effectMain:`${clicks}× CLICKS`,effectSub:`Each sequencer step counts as ${clicks} clicks`,cost:seqMultiClickCost(lvl)};}
function dotUpgradeCost(n){return Math.round(_disc(DOT_COSTS[Math.min(n,DOT_COSTS.length-1)])*_p75(n));}
function alienCost(n){
  if(n>98)return alienCost(98)*Math.pow(1.12,n-98);   // v0.2.188 extra bunkers: buddy 100+ costs 12% more each (the old curve hits Infinity near #180)
  if(n===0)return 250;        // alien 1: 25 mJ (v0.2.193; its egg rolls in at 10 mJ, js/66)
  if(n===1)return 500;        // alien 2: 50 mJ (the corner egg after the first hatch, js/83)
  if(n===2)return 1000;       // alien 3: 100 mJ (v0.2.212: no two 50 mJ eggs back to back; 25 → 50 → 100 mJ)
  // v0.2.214: buddies 4–6 bridge the old wall (100 mJ → 125 J) with ×5 steps: 0.5 J / 2.5 J / 12.5 J after the Fusebox sale,
  //   then the old curve carries on from buddy 7 (= the old buddy 4), three buddies later than before
  if(n===3)return 10000;
  if(n===4)return 50000;
  if(n===5)return 250000;
  return _alienCurve(n-3);
}
function _alienCurve(n){
  if(n===3)return 2500000;    // (old alien 4: 2,500,000 = 125 J on sale)
  // the original growth curve starting from 10M
  let c=10000000;
  for(let i=3;i<n;i++){
    let m=12+i*3;
    if(i>=2)m*=0.6;
    if(i>=19)m*=0.6;
    c=Math.round(c*m);
  }
  // v0.2.92 second-half balance: every alien after #20 costs an extra ×1.5 on top of the curve above
  // (simulated: early game unchanged; waits between matching levels after level 5 go from ~0 to ~5-50 min)
  const d=alienDiscount(n);
  return Math.max(1,Math.round(bump30(c)*(n>20?Math.pow(1.5,n-20):1)/d));
}
// Alien Power: each level makes EVERY alien worth more, so it snowballs with alien count. Levels after 4 cost ×1000 extra each.
function alienBoostUpgradeCost(lvl){return Math.round(_alienBoostBase(lvl)*_p75(lvl));}
// v0.2.136: past level AP_SOFT each level only costs ×AP_LATE_R more (it was ~×1,000,000 a level, which made Alien Power
// the cheapest thing in the shop yet hours away — a wall in front of every alien after #70)
let AP_SOFT=16,AP_LATE_R=1e5;
function _alienBoostBase(lvl){if(lvl===0)return _disc(60000000);const k=Math.min(lvl,AP_SOFT);let c=60000000;for(let i=1;i<=k;i++){c=Math.round(c*(100+i*40));if(i>=2)c=Math.round(c*3);}if(k>4)c*=Math.pow(1000,k-4);if(lvl>k)c*=Math.pow(AP_LATE_R,lvl-k);return _disc(c);}
function alienBoostUpgradeAt(lvl){const cost=alienBoostUpgradeCost(lvl);const perAlien=(1.1+(lvl+1)*0.3).toFixed(1);const perAlienNext=(1.1+(lvl+2)*0.3).toFixed(1);return{effectMain:`ALIEN POWER ×${perAlienNext}/ALIEN`,effectSub:`Per-alien base: ×${perAlien} → ×${perAlienNext}`,cost};}
// Multi-Click: levels after 5 cost ×100 extra each
function multiClickUpgradeCost(lvl){return Math.round(_multiClickBase(lvl)*_p75(lvl));}
// v0.2.136: past level MC_SOFT each level is only ×MC_LATE_R more — a late level adds ~4% income, so a ×300,000 price made it a pure wall
let MC_SOFT=20,MC_LATE_R=1000;
function _multiClickBase(lvl){if(lvl===0)return _disc(15000000);const k=Math.min(lvl,MC_SOFT);let c=15000000;for(let i=1;i<=k;i++){c=Math.round(c*(100+i*40));if(i>=2)c=Math.round(c*3);}if(k>5)c*=Math.pow(100,k-5);if(lvl>k)c*=Math.pow(MC_LATE_R,lvl-k);return _disc(c);}
function multiClickUpgradeAt(lvl){const clicks=lvl+2;return{effectMain:`${clicks}× CLICKS`,effectSub:`Each tap counts as ${clicks} clicks`,cost:multiClickUpgradeCost(lvl)};}

// Pad button costs: 1 free, 2=5 (kick), 3=100 (snare), 4=3K, 5=2.5M ...
const DRUM_TRACKER_COST=10;    // v0.2.192: ACTIVATE for the drum pad dot tracker = 1 mJ (was 2.5 mJ)
const SEQ_TRACKER_COST=Math.round((2.5e5)*SHOP_SALE);   // ACTIVATE for the sequencer's dot tracker (v0.2.175: 250,000 W)
const PAD_COSTS=[0,5,10,25,750,25000,250000,2500000].map(bump30); // v0.2.192: pads 2–4 cost 0.5 / 1 / 2.5 mJ; v0.2.215: pad 5 = 75 mJ (after the first buddy, so its sound is ready to fill it); v0.2.202: pads 6–8 = 2.5 / 25 / 250 J (were 1.17 MJ and up)
const PAD_DEFAULT_SOUNDS=['hihat','kick','snare',null,null,null,null,null]; // null = no sound, must buy from library

// Sound library unlocks: first = 5M, each ×25
const EXTRA_SOUNDS_ORDER=[
  'clap','rimshot','shaker','floortom','sub','chord','spaceperc','lead',
  'basenote','bassslide','pad','arp','wobble','stab','pluck','bell','cowbell',
  'riser','downlift','glitch','junglesnare','choir','vinyl','zap','marimba','thud',
];
function soundLibCost(idx){
  if(idx===2)return 80000;   // v0.2.191: the shaker (3rd sound) is 8 J
  // idx 0 = 5,000, idx 1 = 50,000, idx 2 = 500,000, each ×10 after
  let c=5000;
  for(let i=0;i<idx;i++) c*=10;
  if(idx<20)c/=2;   // the first 20 instruments are half price: lots of new sounds to play with early on
  if(idx>=2&&idx<20)c*=.55;   // v0.2.175: unlocks 3–20 a further 45% cheaper: more to unlock, sooner
  return _disc(bump30(c));
}

// Sequencer tracks: track 1 = 100K, track 2 = 25M, track 3 = 250M, tracks 4-6 keep the old (very large) curve
function seqTrackCostOld(tracks){
  const mults=[10,10,10,20,30,40];
  let c=25000000;
  for(let i=0;i<tracks;i++){
    c=Math.round(c*(mults[i]||40));
    if(i>=1)c=Math.round(c*1000); // 1000x more expensive after 2 tracks
  }
  return c;
}
function seqTrackCost(tracks){
  if(tracks===0)return 100000;
  if(tracks===1)return 250000;   // v0.2.175: track 2 = 250,000 W
  if(tracks===2)return _disc(bump30(250000000));
  return _disc(bump30(seqTrackCostOld(tracks)));
}
const MAX_SEQ_TRACKS=6;

// v0.2.194 STORE SALE (see SHOP_SALE above): every store price function costs half. alienCost keeps the hand-set first three
// buddies; buddies past 99 are priced from alienCost(98), which is already on sale, so they aren't halved twice.
(function(){
  const w=(name,keep)=>{const f=window[name];if(typeof f!=='function')return;window[name]=function(n){const c=f.apply(this,arguments);return keep&&keep(n)?c:Math.max(1,Math.round(c*SHOP_SALE));};};
  w('alienCost',n=>n<3||n>98);w('soundLibCost');w('seqTrackCost');w('alienBoostUpgradeCost');w('multiClickUpgradeCost');w('dotUpgradeCost');w('seqMultiClickCost');
})();
