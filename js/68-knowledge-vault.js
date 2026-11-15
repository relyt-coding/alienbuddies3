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
// v0.2.159: a tab only exists once it's unlocked AND has something in it (no locked tabs, no "more to discover")
function vaultTabShown(id){return vaultTabOpen(id)&&(vaultEntries(id).some(e=>e.on())||vaultTipsIn(id).some(i=>i<vaultTipFar()));}
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
  ['l_points','basics','Watts & Multipliers','Every hit of a drum pad makes energy, counted in watts (W). 1,000 W is a kilowatt (kW), 1,000 kW is a megawatt (MW), then gigawatts (GW) and up. Multipliers stack by multiplying: a ×2 and a ×3 together make ×6, which is why small boosts add up fast.',()=>true],
  ['l_gems','basics','Alien Gems','Each alien buddy makes 1 Alien Gem every minute, even while you\'re busy doing something else. Gems are spent in the skill tree.',()=>_vBuddies(1)],
  ['l_tree','basics','The Skill Tree','The skill tree is a map of galaxies. Every node you unlock opens a new sound, feature or minigame, and many of them teach you a new music fact. You\'ll find those facts again here in the Vault.',()=>_vTree()],
  ['l_match','basics','Minigames','The Matching Game gives you permanent watt multipliers. The minigames in the Cockpit (Planet Hop, Worm Whack and more) boost your Alien Gems instead.',()=>_vBuddies(1)],
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
  ['808','The booming bass and drums of the Roland TR-808 drum machine (1980). Today "808" usually means a long, low bass note in hip-hop and trap.',()=>_vHas('planet_808')],
  ['Drum Machine','An electronic instrument that plays drum patterns you program step by step, like the sequencer in this game.',()=>_vHas('planet_808')],
  ['Woodwind','An instrument you blow into, where the sound starts at a reed or a sharp edge: flutes, clarinets, oboes, bassoons and saxophones.',()=>_vHas('planet_zephyr')],
  ['Reed','A thin strip of cane that vibrates when you blow past it. Clarinets and saxophones use one reed; oboes and bassoons use two.',()=>_vHas('planet_zephyr')],
  ['Vibrato','A gentle, regular wobble in pitch that makes a held note sound alive. Singers and wind players add it as the note goes on.',()=>_vHas('planet_zephyr')],
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
function vaultTabCanBuy(tab){if(!vaultTabOpen(tab))return false;const far=vaultTipFar();return vaultTipsIn(tab).some(i=>i<far&&!tipHave(i)&&score>=tipCost(i))||(score>=vaultEntryCost()&&vaultEntries(tab).some(e=>e.on()&&!vaultHasEntry(e)));}
// v0.2.149: lessons, facts and words cost points too. They show up (title only) once their feature is unlocked; buying one
// reveals it and adds a permanent ×1.05. The price climbs with every one you own (×1.35 each), so order doesn't matter.
// v0.2.161: tap a tip / lesson / word you own to fold it down to its title; tap again to open it (remembered in the save)
function vaultFolded(k){return vaultSeen.includes('c:'+k);}
function vaultFold(k){const i=vaultSeen.indexOf('c:'+k);if(i>=0)vaultSeen.splice(i,1);else vaultSeen.push('c:'+k);renderVault();if(typeof autoSave==='function')try{autoSave();}catch(e){}}
function vaultFoldable(node,k){node.classList.add('vb-fold');if(vaultFolded(k))node.classList.add('folded');node.addEventListener('click',()=>vaultFold(k));}
function vaultHasEntry(e){return vaultOwned.includes(e.id);}
function vaultNice(n){if(n<100)return Math.round(n);const p=Math.pow(10,Math.floor(Math.log10(n))-1);return Math.round(n/p)*p;}
function vaultEntryCost(){return vaultNice(250*Math.pow(1.35,vaultOwned.length));}
function vaultBuyEntry(e){
  const c=vaultEntryCost();if(vaultHasEntry(e)||score<c||!e.on())return false;
  score-=c;vaultOwned.push(e.id);vaultMult=Math.pow(1.05,vaultOwned.length);if(!vaultSeen.includes(e.id))vaultSeen.push(e.id);
  try{playSfxTierUnlock(Math.min(12,vaultOwned.length%12+1),0.3);}catch(err){}
  showToast((e.kind==='word'?'New word: ':'Unlocked: ')+e.title+' · ×1.05 tap boost');
  if(typeof renderUI==='function')renderUI();if(typeof autoSave==='function')autoSave();
  return true;
}
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
#vaultHelpBtn{flex-shrink:0;width:2.1rem;height:2.1rem;border-radius:50%;border:1px solid #4a4a2a;background:#14140a;color:#d8d860;font-family:'Bebas Neue',sans-serif;font-size:1.25rem;line-height:1;padding:0;cursor:pointer;position:absolute;right:1.1rem;top:50%;transform:translateY(-40%);}
#vaultHelp{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:1.2rem;}
#vaultHelp.on{display:flex;}
#vaultHelp .vhp{max-width:330px;background:#101016;border:1px solid #e0e055;border-radius:16px;padding:1.1rem 1.2rem;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.6);animation:vhpIn .3s cubic-bezier(.3,1.4,.5,1);}
#vaultHelp b{display:block;font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:.1em;color:#ffd23f;margin-bottom:.4rem;}
#vaultHelp p{color:#c8c8d4;font-size:.95rem;line-height:1.45;margin:.3rem 0;}
#vaultHelp em{font-style:normal;color:#e0e055;font-weight:700;}
#vaultHelp button{margin-top:.7rem;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.12em;background:#e0e055;color:#111;border:0;border-radius:10px;padding:.45rem 1.6rem;cursor:pointer;}
@keyframes vhpIn{from{opacity:0;transform:scale(.85);}to{opacity:1;transform:none;}}
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
.vb-fold{cursor:pointer;-webkit-tap-highlight-color:transparent;}
.vb-fold.folded p,.vb-fold.folded > span{display:none;}
.vb-fold h4::after,.vb-fold > b::after{content:'▾';font-size:.8em;opacity:.55;margin-left:.1rem;transition:transform .2s;}
.vb-fold.folded h4::after,.vb-fold.folded > b::after{display:inline-block;transform:rotate(-90deg);}
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
.vb-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem;}
.vb-closed h4,.vb-closed b{opacity:.85;}
.vb-closed .vb-buy{flex-shrink:0;}
.vb-locked{font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:.1em;color:#55556a;text-align:center;padding:.9rem;border:1px dashed #26262e;border-radius:12px;}
.vb-intro{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:.95rem;line-height:1.45;color:#8a8a9a;}
#vaultView{transform:translateX(-100%);background:#08080c;z-index:11;overflow:hidden;}
body.vault-open #vaultView{transform:translateX(0);}
body.vault-open #alienLayer{visibility:hidden;}   /* nothing floats over the reading */
body.desktop-mode #vaultView{display:none;}
#vaultView #vaultBox{border:none;border-radius:0;max-width:none;height:100%;animation:none;padding-top:env(safe-area-inset-top,0px);}
#vaultView #vaultBox>*{width:100%;max-width:640px;margin-left:auto;margin-right:auto;box-sizing:border-box;}
body.vault-open #soundboardBtn,body.vault-open #padEditToggleBtn,body.vault-open #partyBtn,body.vault-open #socialsBtn,body.vault-open #settingsOpenBtn{display:none!important;}
#tipsBtn{position:relative;}
#tipsBtn .vault-dot{position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:#ff4d6a;box-shadow:0 0 6px #ff4d6a;display:none;}
#tipsBtn.vault-new .vault-dot{display:block;}
`;document.head.appendChild(css);
  const m=document.createElement('div');m.id='vaultModal';
  m.innerHTML=`<div id="vaultBox">
    <div id="vaultHead"><button id="vaultClose">← BACK</button><div class="vh-mid"><div id="vaultTitle">KNOWLEDGE VAULT</div><div id="vaultSub"></div></div><button id="vaultHelpBtn" type="button" aria-label="How the Vault works">?</button></div>
    <div id="vaultTabs"></div><div id="vaultBody"></div></div>`;
  document.body.appendChild(m);
  const pg=document.createElement('div');pg.className='view';pg.id='vaultView';
  (document.getElementById('gameScreen')||document.body).appendChild(pg);
  m.addEventListener('click',e=>{if(e.target===m)closeVault();});
  document.getElementById('vaultClose').addEventListener('click',closeVault);
  addEventListener('keydown',e=>{if(e.code==='Escape'&&(m.classList.contains('open')||document.body.classList.contains('vault-open')))closeVault();});
  // the bunker button: TIPS → VAULT (with a dot while something new is waiting)
  const b=document.getElementById('tipsBtn');if(b){b.textContent='VAULT';const d=document.createElement('i');d.className='vault-dot';b.appendChild(d);}
})();

// Phone: the Vault is a swipe page (left of Best Buddy / the bunker). Computer: a window over the game.
function vaultIsPage(){return !document.body.classList.contains('desktop-mode');}
function vaultPlace(){
  const box=document.getElementById('vaultBox'),pg=document.getElementById('vaultView'),m=document.getElementById('vaultModal');if(!box)return;
  const want=vaultIsPage()?pg:m;if(want&&box.parentElement!==want)want.appendChild(box);
}
function vaultPrep(){
  vaultSig='';vaultPlace();
  if(vaultTab&&!vaultTabShown(vaultTab))vaultTab=null;
  if(!vaultTab){   // open on a tab with something to buy, else something new, else the basics
    const t=VAULT_TABS.find(t=>vaultTabShown(t.id)&&vaultTabCanBuy(t.id))||VAULT_TABS.find(t=>vaultTabShown(t.id)&&vaultTabHasNew(t.id))||VAULT_TABS.find(t=>vaultTabShown(t.id));vaultTab=t?t.id:'basics';}
}
// v0.2.159: how boosts work is a pop-up (the first time the Vault opens, then behind the ? button), not a line on every tab
function vaultHelp(force){
  if(!force&&vaultSeen.includes('__help'))return;
  if(!vaultSeen.includes('__help'))vaultSeen.push('__help');
  let h=document.getElementById('vaultHelp');
  if(!h){h=document.createElement('div');h.id='vaultHelp';
    h.innerHTML='<div class="vhp"><b>KNOWLEDGE VAULT</b><p>Every lesson, fact or music word you buy here is a permanent <em>×1.05</em> tap boost. Tips are bigger: <em>×1.5</em> each.</p><p>New pages show up as you unlock more of the game.</p><button type="button">GOT IT</button></div>';
    h.addEventListener('click',e=>{if(e.target===h||e.target.tagName==='BUTTON')h.classList.remove('on');});
    document.body.appendChild(h);}
  h.classList.add('on');if(typeof autoSave==='function')try{autoSave();}catch(e){}
}
document.addEventListener('click',e=>{if(e.target&&e.target.id==='vaultHelpBtn'){e.stopPropagation();vaultHelp(true);}});
function openVault(){
  if(vaultIsPage()&&typeof swipeNavGo==='function'){
    if(document.body.classList.contains('vault-open'))return;
    swipeNavGo(6,1);return;}            // slides in from the left, like swiping right
  vaultPrep();
  document.getElementById('vaultModal').classList.add('open');
  renderVault(true);
}
function openVaultPage(){vaultPrep();document.body.classList.add('vault-open');renderVault(true);}
function closeVaultPage(){
  if(!document.body.classList.contains('vault-open'))return;
  document.body.classList.remove('vault-open');vaultMarkSeen(vaultTab);updateVaultBtn();
  if(typeof autoSave==='function')autoSave();
}
function closeVault(){
  if(document.body.classList.contains('vault-open')){
    if(typeof swipeNavGo==='function')swipeNavGo(2,-1);else closeVaultPage();return;}   // BACK: slide over to the bunker
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
  // (only what's already discovered counts: nothing hints at what's still locked)
  const far=vaultTipFar();VAULT_TABS.forEach(t=>{if(!vaultTabOpen(t.id))return;vaultEntries(t.id).forEach(e=>{if(e.on())all++;});all+=vaultTipsIn(t.id).filter(i=>i<far).length;});
  return{have:vaultOwned.length+tipsOwned,all:Math.max(all,vaultOwned.length+tipsOwned)};
}
let vaultSig='';
function vaultSigNow(){const far=vaultTipFar();let k=tipsOwned+':'+far+':'+vaultOwned.length+':'+(score>=vaultEntryCost()?1:0)+':';for(let i=0;i<far;i++)k+=(score>=tipCost(i)?1:0);return k;}
function renderVault(scrollTab){
  vaultSig=vaultSigNow();
  const tabsEl=document.getElementById('vaultTabs'),body=document.getElementById('vaultBody');if(!tabsEl||!body)return;
  const c=vaultCounts();
  document.getElementById('vaultSub').textContent=c.have+' / '+c.all+' DISCOVERED';
  const far=vaultTipFar();
  // tabs
  tabsEl.innerHTML='';
  VAULT_TABS.forEach(t=>{
    if(!vaultTabShown(t.id))return;
    const b=document.createElement('button');b.type='button';b.className='vt-tab'+(t.id===vaultTab?' on':'');b.style.setProperty('--c',t.col);b.textContent=t.name;
    const any=vaultEntries(t.id).some(e=>e.on())||vaultTipsIn(t.id).some(i=>i<far);if(!any)b.classList.add('empty');
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
    shownTips.forEach(i=>{
      const card=el('div','vb-card vb-tip');card.style.setProperty('--c','#e0e055');
      const row=el('div','vb-row');row.appendChild(el('h4','',(tipHave(i)?'✓ ':'')+'TIP '+(i+1)));
      if(tipHave(i)){row.appendChild(el('div','vb-act','×1.5 ACTIVE'));card.appendChild(row);card.appendChild(el('p','',esc(tipText(i))));vaultFoldable(card,'tip'+i);}
      else{
        const cost=tipCost(i),can=score>=cost,bt=el('button','vb-buy'+(can?' can':''),fmtW(cost));bt.type='button';
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
  // LEARN cards / WORDS (each one costs points once its feature is unlocked)
  const entries=vaultEntries(tab.id),open=entries.filter(e=>e.on());locked+=entries.length-open.length;
  const ec=vaultEntryCost(),canE=score>=ec;
  const buyBtn=e=>{const bt=el('button','vb-buy'+(canE?' can':''),fmtW(ec));bt.type='button';
    if(canE)bt.addEventListener('click',ev=>{ev.stopPropagation();if(vaultBuyEntry(e))renderVault();});return bt;};
  const tag=e=>vaultIsNew(e)?' <span class="vb-tag">NEW</span>':'';
  if(tab.id==='words'){
    open.slice().sort((a,b)=>a.title.localeCompare(b.title)).forEach(e=>{
      const w=el('div','vb-word'+(vaultHasEntry(e)?'':' vb-closed'));
      if(vaultHasEntry(e)){w.appendChild(el('b','',esc(e.title)+tag(e)));w.appendChild(el('span','',esc(e.text)));vaultFoldable(w,e.id);}
      else{const r=el('div','vb-row');r.appendChild(el('b','',esc(e.title)+tag(e)));r.appendChild(buyBtn(e));w.appendChild(r);}
      body.appendChild(w);});
  }else{
    open.forEach(e=>{
      const own=vaultHasEntry(e),card=el('div','vb-card'+(own?'':' vb-closed'));card.style.setProperty('--c',col);
      const h=el('h4','',esc(e.title)+tag(e)+(e.src?' <span class="vb-src">· FROM THE '+e.src+'</span>':''));
      if(own){card.appendChild(h);card.appendChild(el('p','',esc(e.text)));vaultFoldable(card,e.id);}
      else{const r=el('div','vb-row');r.appendChild(h);r.appendChild(buyBtn(e));card.appendChild(r);}
      body.appendChild(card);});
  }
  if(!open.length&&!shownTips.length)body.appendChild(el('div','vb-locked','NOTHING HERE YET'));
  if(!scrollTab)body.scrollTop=keepY;
}
function updateVaultBtn(){
  const b=document.getElementById('tipsBtn');if(!b)return;
  b.classList.toggle('vault-new',document.body.classList.contains('game-active')&&vaultAnyNew());
}
setInterval(()=>{if(document.body.classList.contains('game-active'))updateVaultBtn();},2000);
// keep the open page's prices / buy buttons current
setInterval(()=>{const m=document.getElementById('vaultModal');if(((m&&m.classList.contains('open'))||document.body.classList.contains('vault-open'))&&vaultSigNow()!==vaultSig)renderVault();},700);
