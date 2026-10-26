
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
function formatSci(n){n=Math.floor(n);if(n===0)return '0';const e=Math.floor(Math.log10(Math.max(1,n)));return (n/Math.pow(10,e)).toFixed(3).replace(/\.?0+$/,'')+'e'+e;}
function formatFull(n){n=Math.floor(n);return n.toLocaleString();}
function formatStore(n){n=Math.floor(n);const T=1e12;function sci(x){const e=Math.floor(Math.log10(x));return (x/Math.pow(10,e)).toFixed(2).replace(/\.?0+$/,'')+'E'+e;}if(n<T){if(n>=1e9)return(n/1e9).toFixed(2).replace(/\.?0+$/,'')+'B';if(n>=1e6)return(n/1e6).toFixed(2).replace(/\.?0+$/,'')+'M';if(n>=1e3)return(n/1e3).toFixed(0)+'K';return n.toLocaleString();}return sci(n);}
function formatRate(n){if(n<1e15){return n<1000?(Math.round(n*100)/100).toString():Math.floor(n).toLocaleString();}const e=Math.floor(Math.log10(n));return (n/Math.pow(10,e)).toFixed(2)+'E'+e;}
function formatMult(n){if(n<100000)return n.toLocaleString(undefined,{maximumSignificantDigits:5});const e=Math.floor(Math.log10(n));return (n/Math.pow(10,e)).toFixed(2)+'E'+e;}

// ══════════════════════════════════════════════
//  UPGRADE DEFS
// ══════════════════════════════════════════════
// Unlock prices over 5 million are 30% pricier (a longer grind for the big unlocks); cheap early unlocks are untouched.
function bump30(c){return c>5e6?Math.round(c*1.3):c;}
const GAME_VERSION='0.2.59'; // bump on every delivered build (shown in Settings and on the home screen)
const BASE_CPS=5;
const UNLOCK_COST=bump30(60000000);
const ALIEN_POWER_UNLOCK_COST=bump30(600000000);

// 0.2: the Auto Clicker is now the sequencer (metronome). These two one-time upgrades switch a tracker's dot rows from the ×3 pattern to the ×4 pattern.
// Cost of the next dot-base upgrade (n = how many have been bought already): 100M, 100M, then x1000 each (100B, 100T, 100Qa ...). Max ×10.
const DOT_MAX_LEVEL=6; // level 6 = ×10
// Endgame dot upgrades. Each card (DRUMPAD / SEQUENCER) first has to be unlocked for 1B, then upgraded.
// Upgrade prices (n = upgrades already bought; each tracker pays separately): ×4 5B, then x1000 per level.
const DOT_UNLOCK_COST=bump30(1e9);
// Longer sequencer loops (bought after the first track): level 1 = 32 steps, level 2 = 64 steps
const SEQ_STEP_COSTS=[1e7,1e10];
const DOT_COSTS=[5e10,5e14,5e18,5e22,5e26,5e30,5e34]; // v0.2.30: x10,000 per level (was x1000), starting 10x higher
function dotUpgradeCost(n){return DOT_COSTS[Math.min(n,DOT_COSTS.length-1)];}
function alienCost(n){
  if(n===0)return 1000;       // alien 1: 1,000
  if(n===1)return 100000;     // alien 2: 100,000
  if(n===2)return 1000000;    // alien 3: 1,000,000
  if(n===3)return 2500000;    // alien 4: 2,500,000
  // alien 5+ — existing growth curve starting from 10M
  let c=10000000;
  for(let i=3;i<n;i++){
    let m=12+i*3;
    if(i>=2)m*=0.6;
    if(i>=19)m*=0.6;
    c=Math.round(c*m);
  }
  return bump30(c);
}
function alienBoostUpgradeCost(lvl){if(lvl===0)return 60000000;let c=60000000;for(let i=1;i<=lvl;i++){c=Math.round(c*(100+i*40));if(i>=2)c=Math.round(c*3);}return c;}
function alienBoostUpgradeAt(lvl){const cost=alienBoostUpgradeCost(lvl);const perAlien=(1.1+(lvl+1)*0.3).toFixed(1);const perAlienNext=(1.1+(lvl+2)*0.3).toFixed(1);return{effectMain:`ALIEN POWER ×${perAlienNext}/ALIEN`,effectSub:`Per-alien base: ×${perAlien} → ×${perAlienNext}`,cost};}
function multiClickUpgradeCost(lvl){if(lvl===0)return 15000000;let c=15000000;for(let i=1;i<=lvl;i++){c=Math.round(c*(100+i*40));if(i>=2)c=Math.round(c*3);}return c;}
function multiClickUpgradeAt(lvl){const clicks=lvl+2;return{effectMain:`${clicks}× CLICKS`,effectSub:`Each tap counts as ${clicks} clicks`,cost:multiClickUpgradeCost(lvl)};}

// Pad button costs: 1 free, 2=5 (kick), 3=2.5K (snare), 4=25K, 5=2.5M ...
const PAD_COSTS=[0,10,2500,25000,2500000,9000000000,60000000000,450000000000].map(bump30); // pad 2 (kick) is just 10 pts so players find the drum pad fast
const PAD_DEFAULT_SOUNDS=['hihat','kick','snare',null,null,null,null,null]; // null = no sound, must buy from library

// Sound library unlocks: first = 5M, each ×25
const EXTRA_SOUNDS_ORDER=[
  'trapkick','clap','rimshot','shaker','floortom','sub','chord','spaceperc','lead',
  'basenote','bassslide','pad','arp','wobble','stab','pluck','bell','cowbell',
  'riser','downlift','glitch','junglesnare','choir','vinyl','zap','marimba','thud',
];
function soundLibCost(idx){
  // idx 0 = 5,000, idx 1 = 50,000, idx 2 = 500,000, each ×10 after
  let c=5000;
  for(let i=0;i<idx;i++) c*=10;
  return bump30(c);
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
  if(tracks===1)return bump30(25000000);
  if(tracks===2)return bump30(250000000);
  return bump30(seqTrackCostOld(tracks));
}
const MAX_SEQ_TRACKS=6;
