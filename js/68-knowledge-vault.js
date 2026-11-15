// ══════════════════════════════════════════════
//  KNOWLEDGE VAULT (v0.2.147) — the bunker's old TIPS button, grown into the game's learning centre.
//
//  • Tabs for each part of the game (and of music). Each tab holds:
//      TIPS   – the old buyable tips (same prices, same ×1.5 tap multiplier, bought in any order), now sorted by topic
//      LEARN  – short lessons that unlock as you play (a pad, the sequencer, a skill-tree node…)
//      WORDS  – a music glossary that grows with you (the seed of a vocabulary quiz later)
//  • Every skill-tree node that has a fun fact files it in the right tab automatically when you unlock the node,
//    so new content only has to be written once (in the tree) to show up here.
//  • Things you haven't read yet get a NEW tag; the VAULT button gets a dot until you've seen them.
//  • Locked entries are never named (no spoilers): a tab just says how many more there are to discover.
// ══════════════════════════════════════════════
const VAULT_TABS=[
  {id:'basics', name:'GAME BASICS',  col:'#cccc44'},
  {id:'buddies',name:'ALIEN BUDDIES',col:'#00ff88'},
  {id:'pads',   name:'DRUM PADS',    col:'#a0a8ff'},
  {id:'seq',    name:'SEQUENCER',    col:'#ff9a3c'},
  {id:'piano',  name:'PIANO ROLL',   col:'#ff6bd6',req:'sun_minigames'},
  {id:'sounds', name:'SOUNDS & INSTRUMENTS',col:'#5ad1ff',req:'sun_planets'},
  {id:'fx',     name:'EFFECTS & MIXING',col:'#b48cff',req:'sun_points'},
  {id:'vocals', name:'VOCALS',       col:'#ff7a7a',req:'sun_aliens'},
  {id:'words',  name:'MUSIC WORDS',  col:'#ffd23f',req:'core'},
];
// v0.2.148: five tabs open with the skill tree's centre: the Tucana Core and each Quad Sun opens one
const VAULT_REQ_NAME={core:'the Tucana Core',sun_planets:'Quad Sun I (Planet Atlas)',sun_points:'Quad Sun II (Musical Toolkit)',sun_minigames:'Quad Sun III (Minigame Nexus)',sun_aliens:'Quad Sun IV (Alien Evolution)'};
function vaultTabOpen(id){const t=VAULT_TABS.find(t=>t.id===id);return !!t&&(!t.req||(typeof unlockedSkills!=='undefined'&&!!unlockedSkills[t.req])||false);}
function vaultTipLocked(i){return !vaultTabOpen(VAULT_TIP_TAB[i]);}
// which tab each buyable tip lives in (index = tip number − 1)
const VAULT_TIP_TAB=['buddies','pads','pads','seq','seq','buddies','seq','seq','piano','sounds'];

// ── unlock checks ──
const _vHas=id=>typeof unlockedSkills!=='undefined'&&!!unlockedSkills[id];
const _vPads=n=>typeof drum!=='undefined'&&drum.pads>=n;
const _vSeq=()=>typeof drum!=='undefined'&&drum.seqTracks>=1;
const _vBuddies=n=>typeof totalAliens!=='undefined'&&totalAliens>=(n||1);
const _vTree=()=>typeof skillTreeUnlocked!=='undefined'&&!!skillTreeUnlocked;
const _vKeys=()=>typeof shop!=='undefined'&&(shop.keysLevel||0)>0;
const _vPiano=()=>_vHas('mt_piano')||_vKeys();

// ── LEARN cards: [id, tab, title, text, unlocked?] ──
const VAULT_LEARN=[
  // GAME BASICS
  ['l_points','basics','Points & Multipliers','Every hit of a drum pad earns points. Multipliers stack by multiplying: a ×2 and a ×3 together make ×6, which is why small boosts add up fast.',()=>true],
  ['l_gems','basics','Alien Gems','Each alien buddy makes 1 Alien Gem every minute, even while you\'re busy doing something else. Gems are spent in the skill tree.',()=>_vBuddies(1)],
  ['l_tree','basics','The Skill Tree','The skill tree is a map of galaxies. Every node you unlock opens a new sound, feature or minigame, and many of them teach you a new music fact. You\'ll find those facts again here in the Vault.',()=>_vTree()],
  ['l_match','basics','Minigames','The Matching Game gives you permanent point multipliers. The minigames in the Cockpit (Planet Hop, Worm Whack and more) boost your Alien Gems instead.',()=>_vBuddies(1)],
  // ALIEN BUDDIES
  ['l_hatch','buddies','Hatching','Every alien buddy hatches from an egg, and no two games hatch them in the same order. Every 10th buddy comes from a special egg.',()=>_vBuddies(1)],
  ['l_bunker','buddies','The Bunker','The bunker is your buddies\' home: 100 buddies fit in each bunker. Tap any buddy to see it up close and give it a name.',()=>_vBuddies(1)],
  ['l_designer','buddies','Buddy Designer','With the Buddy Designer you can change your buddies\' colours: body, eyes, antennae and shoes.',()=>_vHas('buddy_designer')],
  // DRUM PADS
  ['l_kit','pads','The Drum Kit','Most beats are built from three drums. The KICK is the low thump you feel in your chest, the SNARE is the sharp crack, and the HI-HAT is the light tick that keeps time between them.',()=>_vPads(2)],
  ['l_backbeat','pads','The Backbeat','Count "1, 2, 3, 4" along with a song. In most pop, rock and hip-hop the kick lands on 1 and 3 and the snare on 2 and 4. That snare on 2 and 4 is called the backbeat, and it\'s what makes you want to nod your head.',()=>_vPads(3)],
  ['l_editpads','pads','Edit Pads','EDIT PADS lets you set how many pads are on screen, change each pad\'s sound and volume, and (on a computer) bind keyboard keys to the pads so you can play them like an instrument.',()=>true],
  ['l_finger','pads','Finger Drumming','Finger drummers play beats on pads like these with their fingertips. Try using two fingers: one for the kick, one for the snare, and keep a steady pulse going.',()=>_vPads(4)],
  // SEQUENCER
  ['l_stepseq','seq','The Step Sequencer','A step sequencer plays a loop of steps over and over. Light up a step and that sound plays when the beat reaches it. Drum machines like the Roland TR-808 (1980) worked exactly like this.',()=>_vSeq()],
  ['l_16','seq','16 Steps = 1 Bar','The 16 steps make one bar (or measure) of music in 4/4 time: 4 beats, each split into 4 sixteenth notes. Steps 1, 5, 9 and 13 are the four beats you\'d tap your foot to.',()=>_vSeq()],
  ['l_bpm','seq','Tempo & BPM','Tempo is how fast music goes, measured in BPM (beats per minute). 60 BPM is one beat per second. Hip-hop often sits around 85–95 BPM, house music around 120–128, drum & bass around 170.',()=>_vSeq()],
  ['l_loop','seq','Loops & Patterns','A pattern is a short loop of music. Songs are built by repeating patterns and changing them from section to section, so the music feels familiar and still keeps moving.',()=>_vSeq()],
  // PIANO ROLL
  ['l_notes','piano','The 12 Notes','Western music uses 12 different notes: C, C♯, D, D♯, E, F, F♯, G, G♯, A, A♯ and B. After B the pattern starts again at the next C, higher up.',()=>_vPiano()],
  ['l_octave','piano','Octaves','An octave is the jump from one note to the next note with the same name, like C to the next C. The higher note vibrates exactly twice as fast, which is why the two sound so alike.',()=>_vPiano()],
  ['l_melody','piano','Melody, Bass & Chords','The melody is the part you sing along to. The bassline sits low and holds the song up. Chords are three or more notes played together that colour the mood: happy, sad, tense or dreamy.',()=>_vPiano()],
  // SOUNDS & INSTRUMENTS
  ['l_sound','sounds','What Is Sound?','Sound is vibration travelling through the air. The faster something vibrates, the higher the pitch. Pitch is measured in hertz (Hz): the A that orchestras tune to vibrates 440 times every second.',()=>true],
  ['l_families','sounds','Instrument Families','Instruments are grouped by how they make sound: PERCUSSION (hit or shaken), STRINGS (plucked or bowed), WOODWINDS and BRASS (blown), KEYBOARDS, and ELECTRONIC sounds made by synthesizers and samplers.',()=>_vPads(2)],
  ['l_timbre','sounds','Timbre','Timbre (say "TAM-ber") is the colour of a sound: why a piano and a flute playing the very same note still sound different. It comes from the mix of quieter, higher tones (overtones) hiding inside every note.',()=>_vPads(3)],
  ['l_planets','sounds','Planet Sounds','Each planet in the galaxy has its own family of sounds, many based on real instruments from around the world. Unlock continents in the skill tree to collect them.',()=>_vTree()],
];

// ── MUSIC WORDS: [term, definition, unlocked?] ──
const VAULT_WORDS=[
  ['Beat','The steady pulse of music: the thing you tap your foot to.',()=>true],
  ['Rhythm','The pattern of long and short sounds and silences in time.',()=>true],
  ['Pitch','How high or low a sound is.',()=>true],
  ['Volume','How loud or quiet a sound is. Musicians call changes in volume dynamics.',()=>true],
  ['Kick','The bass drum: the lowest, deepest drum in a kit.',()=>_vPads(2)],
  ['Snare','A drum with metal wires underneath that give it a sharp, crackling snap.',()=>_vPads(3)],
  ['Hi-hat','Two cymbals on a stand that click together. Usually plays the fast, steady part of a beat.',()=>_vPads(3)],
  ['Percussion','Instruments you hit, shake or scrape to make a sound.',()=>_vPads(2)],
  ['Tempo','How fast or slow a piece of music is.',()=>_vSeq()],
  ['BPM','Beats per minute: the number that measures tempo.',()=>_vSeq()],
  ['Bar (Measure)','A small group of beats. In 4/4 time, each bar has 4 beats.',()=>_vSeq()],
  ['Time Signature','The two numbers at the start of music (like 4/4): how many beats are in each bar, and which note gets one beat.',()=>_vSeq()],
  ['Step','One slot in a step sequencer. In a 16-step bar, each step is a sixteenth note.',()=>_vSeq()],
  ['Loop','A piece of music that repeats over and over without a gap.',()=>_vSeq()],
  ['Pattern','A short loop of notes or drum hits that can be reused and combined into songs.',()=>_vSeq()],
  ['Groove','The feel that makes music move, from small changes in timing and loudness.',()=>_vHas('mt_groove')],
  ['Velocity','How hard a note is played, which decides how loud it sounds.',()=>_vHas('mt_velocity')],
  ['Note','A single sound with a pitch. Notes are named with the letters A to G.',()=>_vPiano()],
  ['Octave','The distance from one note to the next note with the same name.',()=>_vPiano()],
  ['Melody','A line of single notes that makes a tune.',()=>_vPiano()],
  ['Bassline','The lowest melody in a song, usually played by a bass instrument.',()=>_vPiano()],
  ['Chord','Three or more notes played at the same time.',()=>_vPiano()],
  ['Harmony','Different notes sounding together, like chords or backing vocals.',()=>_vPiano()],
  ['Key','The family of notes a song is built from, named after its home note (like C major).',()=>_vHas('mt_key')],
  ['Scale','The notes of a key lined up in order, from low to high.',()=>_vHas('mt_key')],
  ['Timbre','The colour or character of a sound, which makes instruments sound different from each other.',()=>_vPads(3)],
  ['Sample','A recorded sound that can be played back, chopped up or played on pads or keys.',()=>_vPads(4)],
  ['Synthesizer','An electronic instrument that creates sound from scratch with electricity.',()=>_vPads(4)],
  ['Effect (FX)','Something that changes a sound after it\'s made, like reverb or echo.',()=>_vHas('mt_effects')],
  ['Reverb','The echoey wash of sound bouncing around a room.',()=>_vHas('mt_reverb')],
  ['Delay (Echo)','Copies of a sound repeated a little later, often in time with the beat.',()=>_vHas('mt_echo')],
  ['Mixing','Balancing the volume, tone and position of every track so they sound good together.',()=>_vHas('mt_mastering')],
  ['Arrangement','Deciding which parts play when: intro, verse, chorus, bridge, outro.',()=>_vHas('mt_arrangement')],
  ['DAW','Digital Audio Workstation: software for recording, building and mixing music. This game is slowly turning into one!',()=>_vSeq()],
];

// skill-tree facts → tabs
function vaultTabForNode(n){
  const id=n.id||'';
  if(id.startsWith('cont_')||n.branch==='planets')return 'sounds';
  if(/^mt_(vocals|vox|takes|fades|chop|autotune|harmonizer|voicefx|vocoder)/.test(id))return 'vocals';
  if(/^mt_(key|piano|midi)/.test(id))return 'piano';
  if(/^mt_(groove|velocity|arrangement)/.test(id))return 'seq';
  if(n.branch==='aliens')return 'buddies';
  if(n.branch==='minigames'||n.branch==='center')return 'basics';
  return 'fx';
}
function vaultTreeFacts(){
  if(typeof SKILL_TREE_NODES==='undefined')return [];
  return SKILL_TREE_NODES.filter(n=>n.fact).map(n=>({id:'s_'+n.id,tab:vaultTabForNode(n),title:n.name.replace(/^Continent:\s*/,''),text:n.fact,on:()=>_vHas(n.id),src:'SKILL TREE'}));
}

// every entry in a tab: {kind:'tip'|'learn'|'word', id, title, text, on}
function vaultEntries(tab){
  const out=[];
  if(tab==='words'){VAULT_WORDS.forEach(([t,d,on])=>out.push({kind:'word',id:'w_'+t,title:t,text:d,on}));return out;}
  VAULT_LEARN.forEach(([id,tb,title,text,on])=>{if(tb===tab)out.push({kind:'learn',id,title,text,on});});
  vaultTreeFacts().forEach(f=>{if(f.tab===tab)out.push(Object.assign({kind:'learn'},f));});
  return out;
}
function vaultTipsIn(tab){const r=[];for(let i=0;i<MAX_TIPS;i++)if(VAULT_TIP_TAB[i]===tab)r.push(i);return r;}
// tips can be bought in any order: everything up to the furthest one you own or can afford, plus one more, is visible
function vaultTipFar(){let far=2;for(let i=0;i<MAX_TIPS;i++)if(tipHave(i)||score>=tipCost(i))far=Math.max(far,i+1);return Math.min(MAX_TIPS,far+1);}
function vaultIsNew(e){return e.on()&&!vaultSeen.includes(e.id);}
function vaultTabHasNew(tab){return vaultTabOpen(tab)&&vaultEntries(tab).some(vaultIsNew);}
function vaultTabCanBuy(tab){if(!vaultTabOpen(tab))return false;const far=vaultTipFar();return vaultTipsIn(tab).some(i=>i<far&&!tipHave(i)&&score>=tipCost(i));}
function vaultAnyNew(){return VAULT_TABS.some(t=>vaultTabHasNew(t.id));}

// ── the page ──
let vaultTab=null;
(function(){
  const css=document.createElement('style');css.textContent=`
#vaultModal{position:fixed;inset:0;z-index:225;background:rgba(0,0,0,.9);display:none;align-items:flex-end;justify-content:center;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}
#vaultModal.open{display:flex;}
#vaultBox{background:#08080c;border:1px solid #2a2a1a;border-radius:20px 20px 0 0;width:100%;max-width:640px;height:92vh;height:92dvh;display:flex;flex-direction:column;animation:slideUp .2s cubic-bezier(.34,1.1,.64,1);overflow:hidden;}
body.desktop-mode #vaultModal{align-items:center;}
body.desktop-mode #vaultBox{border-radius:20px;height:86vh;}
#vaultHead{position:relative;display:flex;align-items:center;justify-content:center;padding:1rem 1.1rem .6rem;flex-shrink:0;min-height:3.4rem;}
#vaultHead .vh-mid{display:flex;flex-direction:column;align-items:center;gap:.15rem;text-align:center;padding:0 5.4rem;}
#vaultTitle{font-family:'Bebas Neue',sans-serif;font-size:clamp(1.15rem,5.2vw,1.6rem);letter-spacing:.12em;color:#ffd23f;line-height:1;white-space:nowrap;}
#vaultSub{font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:.1em;color:#8a8a6a;white-space:nowrap;}
#vaultClose{position:absolute;left:1.1rem;top:50%;transform:translateY(-35%);white-space:nowrap;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.1em;padding:.4rem .9rem;border-radius:8px;border:1px solid #3a3a1a;background:#0d0d02;color:#aaaa33;cursor:pointer;touch-action:manipulation;}
#vaultTabs{display:flex;gap:.45rem;overflow-x:auto;padding:.3rem 1.1rem .7rem;flex-shrink:0;scrollbar-width:none;-webkit-overflow-scrolling:touch;border-bottom:1px solid #1a1a12;touch-action:pan-x;}
#vaultTabs::-webkit-scrollbar{display:none;}
.vt-tab{position:relative;flex-shrink:0;font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:.1em;padding:.42rem .85rem;border-radius:20px;border:1px solid #26262e;background:#101016;color:#777;cursor:pointer;touch-action:manipulation;white-space:nowrap;}
.vt-tab.on{color:#08080c;border-color:var(--c);background:var(--c);}
.vt-tab.empty{opacity:.45;}
.vt-tab .vt-dot{position:absolute;top:2px;right:4px;width:8px;height:8px;border-radius:50%;background:#ff4d6a;box-shadow:0 0 6px #ff4d6a;}
.vt-tab.buy .vt-dot{background:#e8ff00;box-shadow:0 0 6px #e8ff00;}
#vaultBody{flex:1;overflow-y:auto;padding:.9rem 1.1rem 2.5rem;display:flex;flex-direction:column;gap:.7rem;touch-action:pan-y;-webkit-overflow-scrolling:touch;}
.vb-sec{font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:.16em;color:#666;margin:.3rem 0 -.2rem;}
.vb-card{border:1px solid #1e1e26;background:#0e0e14;border-radius:12px;padding:.8rem .95rem;display:flex;flex-direction:column;gap:.35rem;}
.vb-card h4{margin:0;font-family:'Bebas Neue',sans-serif;font-weight:400;font-size:1.25rem;letter-spacing:.08em;color:var(--c);display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
.vb-card p{margin:0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:1rem;line-height:1.5;color:#c9c9d4;}
.vb-tag{font-size:.8rem;letter-spacing:.12em;padding:.05rem .45rem;border-radius:6px;background:#ff4d6a;color:#fff;}
.vb-src{font-size:.8rem;letter-spacing:.12em;color:#666;}
.vb-tip{border-color:#3a3a1a;background:#0d0d04;}
.vb-tip .vb-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem;}
.vb-tip .vb-act{font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:.1em;color:#44aa55;}
.vb-buy{font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:.1em;padding:.35rem .9rem;border-radius:7px;border:1px solid #2a2a1a;background:transparent;color:#555;cursor:default;touch-action:manipulation;}
.vb-buy.can{border-color:#aaaa33;background:#1a1a04;color:#e0e055;cursor:pointer;animation:tipsGlow 1.4s ease-in-out infinite;}
.vb-word{display:flex;flex-direction:column;gap:.15rem;border-bottom:1px solid #18181f;padding:.55rem .2rem .65rem;}
.vb-word b{font-family:'Bebas Neue',sans-serif;font-weight:400;font-size:1.25rem;letter-spacing:.08em;color:#ffd23f;display:flex;align-items:center;gap:.5rem;}
.vb-word span{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:1rem;line-height:1.45;color:#c9c9d4;}
.vb-word .vb-tag{font-family:'Bebas Neue',sans-serif;font-size:.8rem;line-height:1.3;color:#fff;letter-spacing:.12em;}
.vt-tab.locked{opacity:.55;border-style:dashed;}
.vt-tab.locked.on{opacity:1;background:#101016;color:var(--c);border-style:dashed;}
.vb-lockbox{margin-top:1.2rem;border:1px dashed var(--c);border-radius:14px;padding:1.6rem 1.2rem;display:flex;flex-direction:column;gap:.6rem;align-items:center;text-align:center;}
.vb-lockbox b{font-family:'Bebas Neue',sans-serif;font-weight:400;font-size:1.5rem;letter-spacing:.12em;color:var(--c);}
.vb-lockbox span{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:1rem;line-height:1.5;color:#a9a9b8;}
.vb-locked{font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:.1em;color:#55556a;text-align:center;padding:.9rem;border:1px dashed #26262e;border-radius:12px;}
.vb-intro{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:.95rem;line-height:1.45;color:#8a8a9a;}
#tipsBtn{position:relative;}
#tipsBtn .vault-dot{position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:#ff4d6a;box-shadow:0 0 6px #ff4d6a;display:none;}
#tipsBtn.vault-new .vault-dot{display:block;}
`;document.head.appendChild(css);
  const m=document.createElement('div');m.id='vaultModal';
  m.innerHTML=`<div id="vaultBox">
    <div id="vaultHead"><button id="vaultClose">← BACK</button><div class="vh-mid"><div id="vaultTitle">KNOWLEDGE VAULT</div><div id="vaultSub"></div></div></div>
    <div id="vaultTabs"></div><div id="vaultBody"></div></div>`;
  document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m)closeVault();});
  document.getElementById('vaultClose').addEventListener('click',closeVault);
  addEventListener('keydown',e=>{if(e.code==='Escape'&&m.classList.contains('open'))closeVault();});
  // the bunker button: TIPS → VAULT (with a dot while something new is waiting)
  const b=document.getElementById('tipsBtn');if(b){b.textContent='VAULT';const d=document.createElement('i');d.className='vault-dot';b.appendChild(d);}
})();

function openVault(){
  vaultSig='';
  if(vaultTab&&!vaultTabOpen(vaultTab))vaultTab=null;
  if(!vaultTab){   // open on a tab with something to buy, else something new, else the basics
    const t=VAULT_TABS.find(t=>vaultTabCanBuy(t.id))||VAULT_TABS.find(t=>vaultTabHasNew(t.id));vaultTab=t?t.id:'basics';}
  document.getElementById('vaultModal').classList.add('open');
  renderVault(true);
}
function closeVault(){
  document.getElementById('vaultModal').classList.remove('open');
  vaultMarkSeen(vaultTab);updateVaultBtn();
  if(typeof autoSave==='function')autoSave();
}
function vaultMarkSeen(tab){
  if(!tab||!vaultTabOpen(tab))return;let ch=false;
  vaultEntries(tab).forEach(e=>{if(e.on()&&!vaultSeen.includes(e.id)){vaultSeen.push(e.id);ch=true;}});
  return ch;
}
function vaultCounts(){
  let have=0,all=0;
  VAULT_TABS.forEach(t=>vaultEntries(t.id).forEach(e=>{all++;if(e.on())have++;}));
  return{have:have+tipsOwned,all:all+MAX_TIPS};
}
let vaultSig='';
function vaultSigNow(){const far=vaultTipFar();let k=tipsOwned+':'+far+':';for(let i=0;i<far;i++)k+=(score>=tipCost(i)?1:0);return k;}
function renderVault(scrollTab){
  vaultSig=vaultSigNow();
  const tabsEl=document.getElementById('vaultTabs'),body=document.getElementById('vaultBody');if(!tabsEl||!body)return;
  const c=vaultCounts();
  document.getElementById('vaultSub').textContent=c.have+' / '+c.all+' DISCOVERED';
  const far=vaultTipFar();
  // tabs
  tabsEl.innerHTML='';
  VAULT_TABS.forEach(t=>{
    const b=document.createElement('button');b.type='button';b.className='vt-tab'+(t.id===vaultTab?' on':'');b.style.setProperty('--c',t.col);b.textContent=t.name;
    const any=vaultEntries(t.id).some(e=>e.on())||vaultTipsIn(t.id).some(i=>i<far);if(!any)b.classList.add('empty');
    if(!vaultTabOpen(t.id)){b.classList.add('locked');b.textContent='🔒 '+t.name;}
    const buy=vaultTabCanBuy(t.id),nw=t.id!==vaultTab&&vaultTabHasNew(t.id);
    if(buy||nw){const d=document.createElement('i');d.className='vt-dot';b.appendChild(d);if(buy)b.classList.add('buy');}
    b.addEventListener('click',()=>{if(vaultTab===t.id)return;vaultMarkSeen(vaultTab);vaultTab=t.id;renderVault(true);body.scrollTop=0;});
    tabsEl.appendChild(b);
  });
  const on=tabsEl.querySelector('.vt-tab.on');
  if(on&&scrollTab){const L=on.offsetLeft-(tabsEl.clientWidth-on.offsetWidth)/2;try{tabsEl.scrollTo({left:Math.max(0,L),behavior:'smooth'});}catch(e){tabsEl.scrollLeft=Math.max(0,L);}}
  // body
  const tab=VAULT_TABS.find(t=>t.id===vaultTab)||VAULT_TABS[0],col=tab.col;
  const keepY=body.scrollTop;body.innerHTML='';
  const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
  const esc=s=>String(s).replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
  if(!vaultTabOpen(tab.id)){
    const box=el('div','vb-lockbox');box.style.setProperty('--c',col);
    box.innerHTML='<b>🔒 '+esc(tab.name)+'</b><span>Unlock '+esc(VAULT_REQ_NAME[tab.req]||'it')+' in the skill tree to open this part of the Vault.</span>';
    body.appendChild(box);if(!scrollTab)body.scrollTop=keepY;return;}
  let locked=0;
  // TIPS in this tab
  const tips=vaultTipsIn(tab.id);
  const shownTips=tips.filter(i=>i<far);locked+=tips.length-shownTips.length;
  if(shownTips.length){
    body.appendChild(el('div','vb-sec','TIPS · EACH ONE IS A PERMANENT ×1.5 TAP BOOST'));
    shownTips.forEach(i=>{
      const card=el('div','vb-card vb-tip');card.style.setProperty('--c','#e0e055');
      const row=el('div','vb-row');row.appendChild(el('h4','',(tipHave(i)?'✓ ':'')+'TIP '+(i+1)));
      if(tipHave(i)){row.appendChild(el('div','vb-act','×1.5 ACTIVE'));card.appendChild(row);card.appendChild(el('p','',esc(tipText(i))));}
      else{
        const cost=tipCost(i),can=score>=cost,bt=el('button','vb-buy'+(can?' can':''),formatStore(cost)+' PTS');bt.type='button';
        if(can)bt.addEventListener('click',()=>{
          if(!buyTip(i))return;
          showToast('Tip unlocked: your Tap Multiplier increased by ×1.5!');
          try{playSfxTierUnlock(tipsOwned,0.4);}catch(e){}
          updateTipsLabel();renderUI();autoSave();renderVault();
        });
        row.appendChild(bt);card.appendChild(row);
      }
      body.appendChild(card);
    });
  }
  // LEARN cards / WORDS
  const entries=vaultEntries(tab.id),open=entries.filter(e=>e.on());locked+=entries.length-open.length;
  if(tab.id==='words'){
    if(open.length)body.appendChild(el('div','vb-intro','Music words you\'ve discovered so far. More appear as you unlock new pads, the sequencer and skill-tree nodes.'));
    open.slice().sort((a,b)=>a.title.localeCompare(b.title)).forEach(e=>{
      const w=el('div','vb-word');w.appendChild(el('b','',esc(e.title)+(vaultIsNew(e)?' <span class="vb-tag">NEW</span>':'')));w.appendChild(el('span','',esc(e.text)));body.appendChild(w);});
  }else if(open.length){
    body.appendChild(el('div','vb-sec','LEARN'));
    open.forEach(e=>{
      const card=el('div','vb-card');card.style.setProperty('--c',col);
      card.appendChild(el('h4','',esc(e.title)+(vaultIsNew(e)?' <span class="vb-tag">NEW</span>':'')+(e.src?' <span class="vb-src">· FROM THE '+e.src+'</span>':'')));
      card.appendChild(el('p','',esc(e.text)));body.appendChild(card);});
  }
  if(locked)body.appendChild(el('div','vb-locked','🔒 '+locked+' MORE TO DISCOVER IN THIS TAB · KEEP PLAYING'));
  if(!open.length&&!shownTips.length&&!locked)body.appendChild(el('div','vb-locked','NOTHING HERE YET'));
  if(!scrollTab)body.scrollTop=keepY;
}
function updateVaultBtn(){
  const b=document.getElementById('tipsBtn');if(!b)return;
  b.classList.toggle('vault-new',document.body.classList.contains('game-active')&&vaultAnyNew());
}
setInterval(()=>{if(document.body.classList.contains('game-active'))updateVaultBtn();},2000);
// keep the open page's prices / buy buttons current
setInterval(()=>{const m=document.getElementById('vaultModal');if(m&&m.classList.contains('open')&&vaultSigNow()!==vaultSig)renderVault();},700);
