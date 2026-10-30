
// ══════════════════════════════════════════════
//  ALIEN GEMS + SKILL TREE
// ══════════════════════════════════════════════

// ── State ──
let alienGems = 0;
let skillTreeUnlocked = false;
let unlockedSkills = {}; // {skillId: true}
let gemInterval = null;
const GEM_UNLOCK_COST = 25; // costs 25 Alien Gems to Explore the Galaxies (was 50; originally 2.6e25 points)
const BASE_GEMS_PER_ALIEN_PER_MIN = 1;

// ── Key packs: every key is a major key + its relative minor (same notes). C major / A minor are free with the KEY hub.
// Packs go outward around the circle of fifths: the first ones change just one note from C major, the last ones change five.
// majors = relative-major roots (0 = C ... 11 = B)
const KEY_PACKS=[
  {majors:[7], label:'G / E min',            long:'G major and E minor',                     why:'1 sharp (F♯), just one note away from C major.'},
  {majors:[5], label:'F / D min',            long:'F major and D minor',                     why:'1 flat (B♭), just one note away from C major.'},
  {majors:[2], label:'D / B min',            long:'D major and B minor',                     why:'2 sharps (F♯, C♯).'},
  {majors:[10],label:'B♭ / G min',           long:'B♭ major and G minor',                    why:'2 flats (B♭, E♭).'},
  {majors:[9,4],label:'A / F♯ min · E / C♯ min',long:'A major, F♯ minor, E major and C♯ minor', why:'3 and 4 sharps: bright guitar keys.'},
  {majors:[3,8],label:'E♭ / C min · A♭ / F min',long:'E♭ major, C minor, A♭ major and F minor', why:'3 and 4 flats: warm, darker keys.'},
  {majors:[11,6],label:'B / G♯ min · F♯ / D♯ min',long:'B major, G♯ minor, F♯ major and D♯ minor',why:'5 and 6 sharps: the far side of the circle of fifths.'},
  {majors:[1], label:'D♭ / B♭ min',          long:'D♭ major and B♭ minor',                   why:'5 flats: the very last stop on the circle.'},
];
function musicHas(id){return !!(typeof unlockedSkills!=='undefined'&&unlockedSkills&&unlockedSkills[id]);}
// can this key be picked yet?
function keyUnlocked(root,minor){
  if(!musicHas('mt_key')||root==null)return false;
  const R=relMajorRoot(root,minor);
  if(R===0)return true;
  const i=KEY_PACKS.findIndex(p=>p.majors.includes(R));
  return i>=0&&musicHas('mt_keys'+(i+1));
}
function pianoRollLayers(){if(!musicHas('mt_piano'))return 0;let n=1;for(let L=2;L<=6;L++)if(musicHas('mt_piano'+L))n=L;return n;}

// ── Musical Toolkit nodes (built here so the positions can be laid out along the branch) ──
// The branch runs up and to the right from Tuning Fork. ax/ay = one step along the branch, px/py = sideways.
const MUSIC_TREE_NODES=(function(){
  const ax=Math.SQRT1_2,ay=-Math.SQRT1_2,px=Math.SQRT1_2,py=Math.SQRT1_2;
  const along=(o,d)=>({x:Math.round(o.x+ax*d),y:Math.round(o.y+ay*d)});
  const side=(o,d)=>({x:Math.round(o.x+px*d),y:Math.round(o.y+py*d)});
  const polar=(o,deg,r)=>({x:Math.round(o.x+Math.cos(deg*Math.PI/180)*r),y:Math.round(o.y+Math.sin(deg*Math.PI/180)*r)});
  // angle measured from the branch: 0 = sideways (+), 90 = forward along the branch, 180 = sideways (−), 270 = back
  const rel=(o,deg,r)=>{const a=deg*Math.PI/180,c=Math.cos(a)*r,sn=Math.sin(a)*r;return{x:Math.round(o.x+px*c+ax*sn),y:Math.round(o.y+py*c+ay*sn)};};
  const N=[];
  const hub=(id,icon,name,desc,fact,cost,req,pos,extra)=>{N.push(Object.assign({id,icon,name,desc,fact,cost,requires:[req],x:pos.x,y:pos.y,branch:'points',mult:0,gemMult:1.5,hub:true},extra||{}));return pos;};
  const br=(id,icon,name,desc,cost,req,pos,extra)=>{N.push(Object.assign({id,icon,name,desc,cost,requires:[req],x:pos.x,y:pos.y,branch:'points',mult:0,gemMult:1.2},extra||{}));return pos;};
  const fork={x:340,y:-300};

  // EFFECTS — Reverb / Echo (+ Ping-Pong) on one side, a chain of sound-shaping effects on the other
  const fx=hub('mt_effects','🌀','Effects','Opens the world of audio effects. Unlock Reverb, Echo and a whole chain of sound-shaping effects from here. Effects work on sequencer tracks and piano roll layers. ×1.5 Alien Gems, ×1.5 points.',
    'Effects (FX) change a sound after it is made. Reverb and echo are "time-based" effects: they add copies of the sound that arrive a little later, so it feels like it is happening in a real space.',
    600,'neural_tap_1',along(fork,520),{mult:1.5});
  br('mt_reverb','🏛','Reverb','Unlocks REVERB in the EFFECTS window: room, hall and cathedral spaces. ×1.2 Alien Gems.',400,'mt_effects',rel(fx,205,185),
    {fact:'Reverb is the wash of thousands of tiny reflections bouncing off walls. A cathedral can ring for 5+ seconds.'});
  const echo=br('mt_echo','📣','Echo','Unlocks ECHO in the EFFECTS window: repeats that lock to the beat. ×1.2 Alien Gems.',400,'mt_effects',rel(fx,150,185),
    {fact:'Echo (also called delay) repeats a sound in time with the beat. Dub producers in 1970s Jamaica turned it into an instrument of its own.'});
  br('mt_pingpong','🏓','Ping-Pong','Adds PING-PONG to Echo: each repeat bounces between the left and right speaker. ×1.2 Alien Gems.',800,'mt_echo',rel(echo,165,140),
    {fact:'Ping-pong delay bounces each echo between the left and right speakers. It sounds best on headphones.'});
  const FX_CHAIN=[
    ['mt_filter','🎚','Filter','Unlocks FILTER: low-pass, high-pass and band-pass with a cutoff knob. ×1.2 Alien Gems.',700,
      'A low-pass filter lets low sounds through and cuts the highs. Slowly opening one up is the classic way DJs build tension before a drop.'],
    ['mt_distortion','🔥','Distortion','Unlocks DISTORTION: grit and crunch, great on bass and kicks. ×1.2 Alien Gems.',900,
      'Distorted guitar started with damaged amps and torn speakers in the 1950s. Players loved the sound, so pedals were built to do it on purpose.'],
    ['mt_chorus','🌊','Chorus','Unlocks CHORUS: makes one sound feel wide, like several playing at once. ×1.2 Alien Gems.',1200,
      'Chorus copies a sound and wobbles the copy\'s timing a tiny bit. Roland\'s Juno synths had it built in, and it became part of their famous 80s sound.'],
    ['mt_bitcrusher','👾','Bitcrusher','Unlocks BITCRUSH: crunchy 8-bit, lo-fi video game sound. ×1.2 Alien Gems.',1600,
      'Bit depth is how many steps a sound wave can use. The E-mu SP-1200 sampler only had 12 bits, which is a big part of classic 90s hip-hop grit.'],
    ['mt_flanger','✈','Flanger','Unlocks FLANGER: a sweeping jet-plane whoosh. ×1.2 Alien Gems.',2200,
      'Flanging was first made with two tape machines: pressing a finger on the rim (the flange) of one reel slowed it down for a sweeping whoosh.'],
    ['mt_phaser','🌀','Phaser','Unlocks PHASER: a swirly, spacey sweep. ×1.2 Alien Gems.',3000,
      'Phasers took off in the 1970s. The swooshing sweep on funk guitar and space-rock keyboards is very often a phaser.'],
    ['mt_tremolo','〰','Tremolo','Unlocks TREMOLO: the volume pulses in time with the beat. ×1.2 Alien Gems.',4000,
      'Tremolo is a volume wobble. Lots of guitar amps from the 1950s and 60s had it built in.'],
  ];
  let fprev='mt_effects',fpos=rel(fx,15,185);
  FX_CHAIN.forEach(([id,icon,name,desc,cost,fact],i)=>{
    if(i>0)fpos=along(side(fpos,128),i%2?-42:42);
    br(id,icon,name,desc,cost,fprev,fpos,{fact});
    fprev=id;
  });

  // KEY
  const key=hub('mt_key','🎼','Key','Unlocks the KEY button. Melodic sounds (bass, synths, bells, marimba…) now play in key: C major. Unlock more keys from here. ×1.5 Alien Gems, ×1.5 points.',
    'A key is the set of notes a song is built from. Every major key has a "relative minor" that uses the exact same 7 notes: C major and A minor share every note, they just feel at home on a different one.',
    1800,'mt_effects',along(fx,400),{mult:1.5});
  // 8 key packs, closest keys first (each pack = major keys + their relative minors, by how many notes they share with C major)
  KEY_PACKS.forEach((pk,i)=>{
    const ang=[5,185,35,215,65,245,95,275][i];
    br('mt_keys'+(i+1),'🎹',pk.label,'Unlocks '+pk.long+'. '+pk.why+' ×1.2 Alien Gems.',500+i*100,'mt_key',polar(key,ang,210));
  });

  // PIANO ROLL
  const pr=hub('mt_piano','🎹','Piano Roll','Unlocks the ROLL button: write melodies and chords with real notes on a grid that lines up with the sequencer steps. Comes with 4 instruments that hold for the whole note (Synth Bass, Keys, Warm Pad, Lead). Up to 7 notes at once. ×1.5 Alien Gems.',
    'The name comes from player pianos: they read songs from long rolls of paper with holes punched in them, one hole per note. Music software still draws notes the same way.',
    5400,'mt_key',along(key,480));
  let prev='mt_piano',pos=pr;
  for(let L=2;L<=6;L++){
    pos=side(pos,L===2?160:115);
    br('mt_piano'+L,'🎼','Roll Layer '+L,'Adds piano roll layer '+L+': one more instrument with its own melody. The ROLL button then asks which layer to show. ×1.2 Alien Gems.',1500+(L-2)*500,prev,pos,
      {fact:L===2?'A melody needs something under it: most songs layer a bassline, chords and a lead, each on its own instrument.':undefined});
    prev='mt_piano'+L;
  }

  // GROOVE
  const gr=hub('mt_groove','🥁','Groove','Tightens the sequencer: sequencer steps earn +50%. Unlock Velocity and longer loops (32 / 64 steps) from here. ×1.5 Alien Gems, ×1.5 points.',
    'Groove is the feel that makes music move: tiny differences in timing and loudness between notes. Two drummers can play the same pattern and sound totally different because of it.',
    16200,'mt_piano',along(pr,420),{mult:1.5,seqBoost:1.5});
  br('mt_velocity','📶','Velocity','Unlocks the VELOCITY button: set how hard each step and each piano roll note hits. ×1.2 Alien Gems.',6000,'mt_groove',side(gr,-170),
    {fact:'Velocity comes from MIDI keyboards: it measures how fast a key is pressed, which is why harder hits play louder.'});
  // 32 / 64 STEPS (longer loops come later, once the player has the basics)
  const s32=br('mt_steps32','🔢','32 Steps','Doubles the sequencer loop to 32 steps (2 bars). Switch lengths with the STEPS button. ×1.2 Alien Gems.',8000,'mt_groove',side(gr,170),
    {fact:'One sequencer step is a 16th note, so 16 steps make one bar of 4/4 time. 32 steps = 2 bars.'});
  br('mt_steps64','🔢','64 Steps','Four bars in one loop: 64 steps. ×1.2 Alien Gems.',12000,'mt_steps32',rel(s32,280,150),
    {fact:'Most dance music is built in 4, 8 and 16 bar phrases. 64 steps is a full 4-bar phrase.'});

  // MASTERING — mixing tools for each track, plus EQ / compression on the whole song (the MASTER channel)
  const ms=hub('mt_mastering','💽','Mastering','Opens the mixing and mastering tools: EQ, Compression, Panning and Sidechain. EQ and Compression also work on the MASTER channel (the whole song). ×1.5 Alien Gems, ×1.5 points.',
    'Mixing is balancing every track against the others. Mastering is the final polish on the whole song, so it sounds good everywhere, from phone speakers to club systems.',
    24000,'mt_steps32',side(s32,380),{mult:1.5});
  br('mt_eq','📊','EQ','Unlocks EQ: turn the lows, mids and highs of a track (or the whole song) up or down. ×1.2 Alien Gems.',9000,'mt_mastering',rel(ms,-60,210),
    {fact:'EQ (equalization) turns certain frequencies up or down. Cutting a little low end from everything except the kick and bass is one of the oldest mixing tricks.'});
  br('mt_compression','🗜','Compression','Unlocks COMPRESSION: evens out loud and quiet moments so a track sits steady and punchy. ×1.2 Alien Gems.',10000,'mt_mastering',rel(ms,-15,210),
    {fact:'A compressor turns down the loudest moments so quiet and loud parts sit closer together. Almost every song on the radio uses it.'});
  br('mt_panning','↔','Panning','Unlocks PAN and AUTO-PAN: place a track left or right, or let it bounce between the speakers. ×1.2 Alien Gems.',11000,'mt_mastering',rel(ms,30,210),
    {fact:'Panning places a sound between the left and right speakers. Some early stereo mixes put the whole band on one side and the singer on the other.'});
  br('mt_sidechain','💓','Sidechain','Unlocks SIDECHAIN: a track ducks out of the way every time a kick hits, for that pumping dance-music feel. ×1.2 Alien Gems.',12000,'mt_mastering',rel(ms,75,210),
    {fact:'Sidechain makes other sounds duck every time the kick hits, creating the "pumping" feel of dance music. Stardust\'s "Music Sounds Better With You" (1998) made it famous.'});

  // ARRANGEMENT
  const ar=hub('mt_arrangement','🎬','Arrangement','The art of building a whole track out of patterns. Unlock Arrangement and Song mode from here. ×1.5 Alien Gems, ×2 points.',
    'Arrangement is deciding what plays when: intro, verse, chorus, drop, outro. Most pop songs reuse only a handful of patterns, just in a smart order.',
    48600,'mt_groove',along(gr,420),{mult:2});
  const am=br('mt_arrange','🧩','Arrangement Mode','Unlocks the PAT / ARR switch: chain saved patterns into an arrangement. ×1.2 Alien Gems.',15000,'mt_arrangement',side(ar,170),
    {fact:'Producers often loop one 8-bar section for hours, then build the full arrangement once the loop feels right.'});
  br('mt_song','💿','Song Mode','Unlocks SONG mode: line up whole arrangements into a song. ×1.2 Alien Gems.',20000,'mt_arrange',side(am,130),
    {fact:'A typical pop song is about 3 minutes long, which at 100 BPM is roughly 75 bars.'});

  // VOCALS — record your own voice on layers, then arrange the takes on the song timeline
  const vx=hub('mt_vocals','🎤','Vocals','Unlocks the VOX button: record your voice with your phone\'s or computer\'s mic (or one you plug in) on 2 vocal layers. Drag, trim, split and copy takes anywhere on the song. Every layer has its own effects rack, and vocal effects (Autotune, Voice Changer, Harmonizer, Vocoder) unlock from here. ×1.5 Alien Gems, ×1.5 points.',
    'Multitrack recording puts every part on its own track, so each one can be redone or changed later. Guitarist Les Paul pioneered it in the 1940s and 50s, stacking his guitar and Mary Ford\'s voice again and again on modified tape machines.',
    64800,'mt_arrangement',along(ar,430),{mult:1.5});
  const v4=br('mt_vox4','🎙','Backing Vocals','2 more vocal layers (4 in total): harmonies, ad-libs and doubles. ×1.2 Alien Gems.',18000,'mt_vocals',side(vx,170),
    {fact:'Double-tracking means singing the same part twice on two tracks: the tiny differences make a voice sound bigger. The Beatles did it so often that Abbey Road engineers invented ADT (artificial double tracking) in 1966 to fake it.'});
  const v7=br('mt_vox7','🎶','Vocal Stack','3 more vocal layers (7 in total). ×1.2 Alien Gems.',24000,'mt_vox4',side(v4,130),
    {fact:'Stacking means recording the same line many times and layering the takes. Big pop choruses often hide 10 or more vocal takes behind the lead.'});
  br('mt_vox10','👥','Choir','3 more vocal layers (10 in total): enough to be your own choir. ×1.2 Alien Gems.',32000,'mt_vox7',side(v7,130),
    {fact:'A classic choir has four parts: soprano, alto, tenor and bass (SATB). With 10 layers you can sing all four and still double them.'});
  // MULTIPLE TAKES → MICROFADE EDITS (recording tools, after Vocals)
  br('mt_takes','🔁','Multiple Takes','Unlocks LOOP recording and take folders: record a part again and again, then pick your best take with ◀ ▶. ×1.2 Alien Gems.',26000,'mt_vocals',rel(vx,30,330),
    {fact:'Comping (from "compiling") means recording several takes and stitching the best moments together. Most lead vocals you hear are comped from many passes.'});
  br('mt_fades','◢','Microfade Edits','Unlocks FADE IN / FADE OUT on every take (every cut already gets a click-free 2 ms fade). ×1.2 Alien Gems.',30000,'mt_takes',rel(vx,38,480),
    {fact:'Cutting audio in the middle of a wave makes a click. Engineers add tiny fades of a few milliseconds to every edit so nobody hears the joins.'});
  // VOCAL CHOPS (the next big section: slice takes into playable sounds)
  const ch=hub('mt_chops','✂','Vocal Chops','Unlocks ✂ CHOP: slice any vocal take into chops that play on your drum pads and sequencer tracks, like any other sound. Chop bank: 8 slots. ×1.5 Alien Gems, ×1.5 points.',
    'Chopping means slicing a recording into short pieces and playing them back in a new order. Vocal chops are all over house, hip-hop and future bass.',
    80000,'mt_vocals',along(vx,470),{mult:1.5});
  br('mt_chopauto','✨','Auto Slice','Adds ✨ AUTO to the chop editor: it cuts exactly where each syllable starts. ×1.2 Alien Gems.',26000,'mt_chops',rel(ch,20,190),
    {fact:'A transient is the sharp start of a sound, like a consonant or a drum hit. Samplers look for them to cut a recording right where each syllable begins.'});
  br('mt_choptricks','⏪','Chop Tricks','Unlocks REVERSE, PITCH and CHOKE for each chop in the chop bank. ×1.2 Alien Gems.',30000,'mt_chops',rel(ch,160,190),
    {fact:'Backwards vocals are an old studio trick: The Beatles ended "Rain" (1966) with a vocal played in reverse.'});
  br('mt_chopkeys','🎹','Chop Keys','Chops with a clear note become piano roll instruments, and they follow the song KEY like other melodic sounds. ×1.2 Alien Gems.',40000,'mt_chops',rel(ch,65,200),
    {fact:'Playing one recorded sound across a whole keyboard is how early samplers like the Fairlight CMI turned a single voice into a choir.'});
  br('mt_chopbank','🗃','Bigger Chop Bank','The chop bank grows from 8 to 24 slots. ×1.2 Alien Gems.',34000,'mt_chops',rel(ch,115,200),
    {fact:'Akai\'s MPC samplers put 16 pads under your fingers, and that 4×4 grid became the classic way to play chops.'});
  // MIDI KEYBOARD (Piano Roll upgrade)
  br('mt_midi','🎛','MIDI Keyboard','Plug in a MIDI keyboard: play the piano roll\'s instruments with velocity and the sustain pedal, and record straight into the roll while the sequencer plays. Works in Chrome / Edge (computers) and Chrome on Android. ×1.2 Alien Gems.',3000,'mt_piano',side(pr,-170),
    {fact:'MIDI (1983) lets instruments from any brand talk to each other. The same 5-pin standard still works today, now mostly over USB.'});
  // AUTOMATION (late upgrade off Effects)
  br('mt_automation','📈','Automation','Unlocks the AUTO button: draw how volume, filter, reverb, echo and pan change over the song on any track, roll layer, vocal layer or the master. ×1.2 Alien Gems.',150000,'mt_effects',rel(fx,300,230),
    {fact:'Automation lets settings move by themselves during a song, like a filter slowly opening before the drop. Big mixing desks of the late 1970s added motorized faders that could replay every move.'});

  // VOCAL EFFECTS (other side of the Vocals hub)
  const at=br('mt_autotune','🎯','Autotune','Unlocks AUTOTUNE for vocal layers: snaps your singing to the notes of the song key. Slow it down to sound natural, or set it to instant for the robotic pop sound. ×1.2 Alien Gems.',22000,'mt_vocals',side(vx,-170),
    {fact:'Auto-Tune was invented by Andy Hildebrand, an engineer who used the same math to read oil-field seismic data. Cher\'s "Believe" (1998) made its instant, robotic setting famous.'});
  br('mt_harmonizer','🎼','Harmonizer','Unlocks HARMONIZER: adds a second voice singing a 3rd, 5th or octave away, always in key. ×1.2 Alien Gems.',30000,'mt_autotune',side(at,-130),
    {fact:'Eventide\'s H910 Harmonizer (1975) was one of the first digital pitch shifters. Studios used it to thicken voices and to make new harmonies from a single take.'});
  br('mt_voicefx','👽','Voice Changer','Unlocks the VOICE CHANGER: Alien, Chipmunk, Giant and Robot voices, or set the pitch and "throat size" yourself. ×1.2 Alien Gems.',20000,'mt_vocals',rel(vx,60,190),
    {fact:'Formants are the resonances of your throat and mouth: they make a voice sound like you. Shift them up and a voice sounds tiny, shift them down and it sounds huge, even at the same pitch.'});
  br('mt_vocoder','🤖','Vocoder','Unlocks the VOCODER: your voice shapes a synth, so it sings the notes of a piano roll layer (or a drone in the song key). ×1.2 Alien Gems.',36000,'mt_vocals',rel(vx,120,190),
    {fact:'The vocoder was invented at Bell Labs in the 1930s by Homer Dudley, to squeeze speech down phone lines. Decades later, bands like Kraftwerk made it sing.'});
  return N;
})();

// ── Skill Tree Data ──
// Layout: center at (0,0), branches go diagonally
// Each node: {id, icon, name, desc, cost, requires, x, y, branch, placeholder}
const SKILL_TREE_NODES = [
  // ── CENTER ──
  {id:'core', icon:'✦', name:'Tucana Core', desc:'The heart of the Tucana Galaxy. All four Quad Sun paths begin here.', cost:50, requires:[], x:0, y:0, branch:'center', mult:0},

  // ── QUAD SUN 1 — Planet Exploration (↖) ──
  {id:'sun_planets', icon:'☀', name:'Quad Sun I', desc:'The first of four Quad Suns. Opens the Planet Exploration path. Grants ×2 points.', cost:150, requires:['core'], x:-200, y:-200, branch:'planets', mult:2},

  // Planet Mantra
  {id:'planet_mantra', icon:'🌍', name:'Planet Mantra', desc:'First contact with Planet Mantra. Unlocks the Om continent and standard sounds. Grants ×1.5 points.', cost:300, requires:['sun_planets'], x:-260, y:-540, branch:'planets', mult:1.5},
  // Mantra continents
  {id:'cont_om', icon:'🔔', name:'Continent: Om', desc:'The spiritual heartland of Mantra. Enriches the standard drum kit with 4 new sounds. ×1.5 points.', cost:200, requires:['planet_mantra'], x:-475, y:-830, branch:'planets', mult:1.5,
    sounds:['om_bell','om_bowl','om_rim','om_shaker2']},
  {id:'cont_sohum', icon:'🥁', name:'Continent: So Hum', desc:'Lofi metallic instruments from the ancient forges of So Hum. 5 new sounds. ×1.5 points.', cost:200, requires:['planet_mantra'], x:-360, y:-830, branch:'planets', mult:1.5,
    sounds:['sh_metalclick','sh_tinpan','sh_steeldrum','sh_cymbal_lo','sh_chain']},
  {id:'cont_manas', icon:'🌀', name:'Continent: Manas', desc:'Abstract electronic pulses from the digital wastes of Manas. 5 new sounds. ×1.5 points.', cost:200, requires:['planet_mantra'], x:-160, y:-830, branch:'planets', mult:1.5,
    sounds:['mn_bitcrush','mn_glitchperc','mn_databend','mn_synthpop','mn_digitalsnare']},
  {id:'cont_floww', icon:'💧', name:'Continent: Floww', desc:'Water, marimba and soft bass from the ocean plains of Floww. 5 new sounds. ×1.5 points.', cost:200, requires:['planet_mantra'], x:-45, y:-830, branch:'planets', mult:1.5,
    sounds:['fw_waterdrip','fw_marimba2','fw_softbass','fw_wave','fw_woodblock']},

  // Sound nodes for Om
  {id:'snd_om_bell', icon:'🔔', name:'Om Bell', desc:'A pure resonant bell tone from the Om temples. ×1.5 points.', cost:50, requires:['cont_om'], x:-495, y:-925, branch:'planets', mult:1.5, soundUnlock:'om_bell'},
  {id:'snd_om_bowl', icon:'🎵', name:'Om Bowl', desc:'A singing bowl strike with long harmonic decay. ×1.5 points.', cost:50, requires:['snd_om_bell'], x:-455, y:-1020, branch:'planets', mult:1.5, soundUnlock:'om_bowl'},
  {id:'snd_om_rim', icon:'🥁', name:'Om Rim', desc:'A crisp rim knock on a ceremonial drum. ×1.5 points.', cost:50, requires:['snd_om_bowl'], x:-495, y:-1115, branch:'planets', mult:1.5, soundUnlock:'om_rim'},
  {id:'snd_om_shaker2', icon:'🎶', name:'Om Shaker', desc:'A soft organic shaker from Om rituals. ×1.5 points.', cost:50, requires:['snd_om_rim'], x:-455, y:-1210, branch:'planets', mult:1.5, soundUnlock:'om_shaker2'},

  // Sound nodes for So Hum
  {id:'snd_sh_metalclick', icon:'⚙', name:'Metal Click', desc:'A sharp metallic click from So Hum forges. ×1.5 points.', cost:50, requires:['cont_sohum'], x:-380, y:-925, branch:'planets', mult:1.5, soundUnlock:'sh_metalclick'},
  {id:'snd_sh_tinpan', icon:'🥫', name:'Tin Pan', desc:'A hollow tin pan strike with buzzy overtones. ×1.5 points.', cost:50, requires:['snd_sh_metalclick'], x:-340, y:-1020, branch:'planets', mult:1.5, soundUnlock:'sh_tinpan'},
  {id:'snd_sh_steeldrum', icon:'🎺', name:'Steel Drum', desc:'A warm steel drum tone from the So Hum markets. ×1.5 points.', cost:50, requires:['snd_sh_cymbal_lo'], x:-380, y:-1305, branch:'planets', mult:1.5, soundUnlock:'sh_steeldrum'},
  {id:'snd_sh_cymbal_lo', icon:'💿', name:'Lo Cymbal', desc:'A dark low cymbal wash, lofi and dusty. ×1.5 points.', cost:50, requires:['snd_sh_chain'], x:-340, y:-1210, branch:'planets', mult:1.5, soundUnlock:'sh_cymbal_lo'},
  {id:'snd_sh_chain', icon:'⛓', name:'Chain Rattle', desc:'A metallic chain rattle with industrial character. ×1.5 points.', cost:50, requires:['snd_sh_tinpan'], x:-380, y:-1115, branch:'planets', mult:1.5, soundUnlock:'sh_chain'},

  // Sound nodes for Manas
  {id:'snd_mn_bitcrush', icon:'💾', name:'Bit Crush', desc:'An 8-bit crunchy percussive hit. ×1.5 points.', cost:50, requires:['cont_manas'], x:-180, y:-925, branch:'planets', mult:1.5, soundUnlock:'mn_bitcrush'},
  {id:'snd_mn_glitchperc', icon:'📡', name:'Glitch Perc', desc:'A fragmented digital percussion burst. ×1.5 points.', cost:50, requires:['snd_mn_bitcrush'], x:-140, y:-1020, branch:'planets', mult:1.5, soundUnlock:'mn_glitchperc'},
  {id:'snd_mn_databend', icon:'🖥', name:'Data Bend', desc:'A data-corrupted tone with alien texture. ×1.5 points.', cost:50, requires:['snd_mn_glitchperc'], x:-180, y:-1115, branch:'planets', mult:1.5, soundUnlock:'mn_databend'},
  {id:'snd_mn_synthpop', icon:'🎹', name:'Synth Pop', desc:'A bright synthetic pop with punchy attack. ×1.5 points.', cost:50, requires:['snd_mn_digitalsnare'], x:-180, y:-1305, branch:'planets', mult:1.5, soundUnlock:'mn_synthpop'},
  {id:'snd_mn_digitalsnare', icon:'📟', name:'Digital Snare', desc:'A lo-fi digital snare crack. ×1.5 points.', cost:50, requires:['snd_mn_databend'], x:-140, y:-1210, branch:'planets', mult:1.5, soundUnlock:'mn_digitalsnare'},

  // Sound nodes for Floww
  {id:'snd_fw_waterdrip', icon:'💦', name:'Water Drip', desc:'A single water droplet with crystalline resonance. ×1.5 points.', cost:50, requires:['cont_floww'], x:-65, y:-925, branch:'planets', mult:1.5, soundUnlock:'fw_waterdrip'},
  {id:'snd_fw_marimba2', icon:'🪘', name:'Ocean Marimba', desc:'A soft watery marimba tone. ×1.5 points.', cost:50, requires:['snd_fw_wave'], x:-65, y:-1115, branch:'planets', mult:1.5, soundUnlock:'fw_marimba2'},
  {id:'snd_fw_softbass', icon:'🐋', name:'Soft Bass', desc:'A warm rounded bass note from deep Floww waters. ×1.5 points.', cost:50, requires:['snd_fw_woodblock'], x:-65, y:-1305, branch:'planets', mult:1.5, soundUnlock:'fw_softbass'},
  {id:'snd_fw_wave', icon:'🌊', name:'Wave Crash', desc:'A gentle wave crash with white noise tail. ×1.5 points.', cost:50, requires:['snd_fw_waterdrip'], x:-25, y:-1020, branch:'planets', mult:1.5, soundUnlock:'fw_wave'},
  {id:'snd_fw_woodblock', icon:'🪵', name:'Wood Block', desc:'A hollow wooden block strike with warm tone. ×1.5 points.', cost:50, requires:['snd_fw_marimba2'], x:-25, y:-1210, branch:'planets', mult:1.5, soundUnlock:'fw_woodblock'},

  // Planet Hyphae (branches from Mantra)
  {id:'planet_hyphae', icon:'🍄', name:'Planet Hyphae', desc:'A mushroom-covered world of organic textures. Unlocks 6 continents of fungal sound. ×1.5 points.', cost:500, requires:['sun_planets'], x:-570, y:-330, branch:'planets', mult:1.5},
  // Hyphae continents
  {id:'cont_enoki', icon:'🌿', name:'Continent: Enoki', desc:'Thin, high metallic taps and light woody clicks. Delicate and sparse. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-860, y:-230, branch:'planets', mult:1.5,
    sounds:['en_tinktap','en_woodtap','en_highping','en_lightrim','en_softclick']},
  {id:'cont_morel', icon:'🌑', name:'Continent: Morel', desc:'Deep hollow thuds and earthy low tones. Warm and organic. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-860, y:-115, branch:'planets', mult:1.5,
    sounds:['mo_earththud','mo_hollowboom','mo_deepmud','mo_lowknock','mo_caveboom']},
  {id:'cont_porcini', icon:'🟤', name:'Continent: Porcini', desc:'Rich mid-range woody percussion. Full-bodied and round. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-860, y:0, branch:'planets', mult:1.5,
    sounds:['po_woodmid','po_roundbonk','po_treeknock','po_stump','po_logdrum']},
  {id:'cont_oyster', icon:'🦪', name:'Continent: Oyster', desc:'Smooth sliding tones and breathy textures. Airy and wet. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-860, y:-430, branch:'planets', mult:1.5,
    sounds:['oy_breathslide','oy_airblow','oy_wetslap','oy_softbend','oy_shimmer']},
  {id:'cont_reishi', icon:'🪬', name:'Continent: Reishi', desc:'Slow ceremonial gongs and deep drones. Meditative and long decay. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-860, y:-545, branch:'planets', mult:1.5,
    sounds:['re_gong','re_deepdrone','re_ceremony','re_lowbowl','re_resonance']},
  {id:'cont_bella', icon:'✨', name:'Continent: Bella', desc:'Bright snappy accents and quick woody snaps. Punchy and lively. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-860, y:-660, branch:'planets', mult:1.5,
    sounds:['be_snap','be_woodsnap','be_brightpop','be_crackle','be_accent']},

  // Hyphae sound nodes (just a few representative ones — full set below)
  {id:'snd_en_tinktap', icon:'🌿', name:'Tink Tap', desc:'A delicate high metallic tap. ×1.5 points.', cost:80, requires:['cont_enoki'], x:-955, y:-250, branch:'planets', mult:1.5, soundUnlock:'en_tinktap'},
  {id:'snd_en_woodtap', icon:'🌿', name:'Wood Tap', desc:'A light woody click from Enoki forests. ×1.5 points.', cost:80, requires:['snd_en_lightrim'], x:-1240, y:-210, branch:'planets', mult:1.5, soundUnlock:'en_woodtap'},
  {id:'snd_en_highping', icon:'🌿', name:'High Ping', desc:'A bright metallic ping with quick decay. ×1.5 points.', cost:80, requires:['snd_en_tinktap'], x:-1050, y:-210, branch:'planets', mult:1.5, soundUnlock:'en_highping'},
  {id:'snd_en_lightrim', icon:'🌿', name:'Light Rim', desc:'A feather-light rim tap. ×1.5 points.', cost:80, requires:['snd_en_highping'], x:-1145, y:-250, branch:'planets', mult:1.5, soundUnlock:'en_lightrim'},
  {id:'snd_en_softclick', icon:'🌿', name:'Soft Click', desc:'A barely-there soft click. ×1.5 points.', cost:80, requires:['snd_en_woodtap'], x:-1335, y:-250, branch:'planets', mult:1.5, soundUnlock:'en_softclick'},

  {id:'snd_mo_earththud', icon:'🌑', name:'Earth Thud', desc:'A deep hollow earth thud. ×1.5 points.', cost:80, requires:['cont_morel'], x:-955, y:-135, branch:'planets', mult:1.5, soundUnlock:'mo_earththud'},
  {id:'snd_mo_hollowboom', icon:'🌑', name:'Hollow Boom', desc:'A cavernous boom from deep Morel earth. ×1.5 points.', cost:80, requires:['snd_mo_deepmud'], x:-1145, y:-135, branch:'planets', mult:1.5, soundUnlock:'mo_hollowboom'},
  {id:'snd_mo_deepmud', icon:'🌑', name:'Deep Mud', desc:'A thick low muddy thud. ×1.5 points.', cost:80, requires:['snd_mo_earththud'], x:-1050, y:-95, branch:'planets', mult:1.5, soundUnlock:'mo_deepmud'},
  {id:'snd_mo_lowknock', icon:'🌑', name:'Low Knock', desc:'A heavy low wood knock. ×1.5 points.', cost:80, requires:['snd_mo_caveboom'], x:-1335, y:-135, branch:'planets', mult:1.5, soundUnlock:'mo_lowknock'},
  {id:'snd_mo_caveboom', icon:'🌑', name:'Cave Boom', desc:'A resonant cave boom with long decay. ×1.5 points.', cost:80, requires:['snd_mo_hollowboom'], x:-1240, y:-95, branch:'planets', mult:1.5, soundUnlock:'mo_caveboom'},

  // Porcini sounds
  {id:'snd_po_woodmid', icon:'🟤', name:'Wood Mid', desc:'A full-bodied mid-range wood hit. ×1.5 points.', cost:80, requires:['cont_porcini'], x:-955, y:-20, branch:'planets', mult:1.5, soundUnlock:'po_woodmid'},
  {id:'snd_po_roundbonk', icon:'🟤', name:'Round Bonk', desc:'A round resonant bonk. ×1.5 points.', cost:80, requires:['snd_po_treeknock'], x:-1145, y:-20, branch:'planets', mult:1.5, soundUnlock:'po_roundbonk'},
  {id:'snd_po_treeknock', icon:'🟤', name:'Tree Knock', desc:'A hollow tree knock with bark resonance. ×1.5 points.', cost:80, requires:['snd_po_woodmid'], x:-1050, y:20, branch:'planets', mult:1.5, soundUnlock:'po_treeknock'},
  {id:'snd_po_stump', icon:'🟤', name:'Stump Hit', desc:'A heavy stump hit with warm thud. ×1.5 points.', cost:80, requires:['snd_po_roundbonk'], x:-1240, y:20, branch:'planets', mult:1.5, soundUnlock:'po_stump'},
  {id:'snd_po_logdrum', icon:'🟤', name:'Log Drum', desc:'A slap on a hollow log drum. ×1.5 points.', cost:80, requires:['snd_po_stump'], x:-1335, y:-20, branch:'planets', mult:1.5, soundUnlock:'po_logdrum'},

  // Oyster sounds
  {id:'snd_oy_breathslide', icon:'🦪', name:'Breath Slide', desc:'A breathy sliding exhale. ×1.5 points.', cost:80, requires:['cont_oyster'], x:-955, y:-450, branch:'planets', mult:1.5, soundUnlock:'oy_breathslide'},
  {id:'snd_oy_airblow', icon:'🦪', name:'Air Blow', desc:'A soft air blow with wispy texture. ×1.5 points.', cost:80, requires:['snd_oy_breathslide'], x:-1050, y:-410, branch:'planets', mult:1.5, soundUnlock:'oy_airblow'},
  {id:'snd_oy_wetslap', icon:'🦪', name:'Wet Slap', desc:'A wet percussive slap. ×1.5 points.', cost:80, requires:['snd_oy_shimmer'], x:-1335, y:-450, branch:'planets', mult:1.5, soundUnlock:'oy_wetslap'},
  {id:'snd_oy_softbend', icon:'🦪', name:'Soft Bend', desc:'A gentle pitch bend with smooth decay. ×1.5 points.', cost:80, requires:['snd_oy_airblow'], x:-1145, y:-450, branch:'planets', mult:1.5, soundUnlock:'oy_softbend'},
  {id:'snd_oy_shimmer', icon:'🦪', name:'Shimmer', desc:'A shimmering high texture. ×1.5 points.', cost:80, requires:['snd_oy_softbend'], x:-1240, y:-410, branch:'planets', mult:1.5, soundUnlock:'oy_shimmer'},

  // Reishi sounds
  {id:'snd_re_gong', icon:'🪬', name:'Gong', desc:'A ceremonial gong strike with long sustain. ×1.5 points.', cost:80, requires:['cont_reishi'], x:-955, y:-565, branch:'planets', mult:1.5, soundUnlock:'re_gong'},
  {id:'snd_re_deepdrone', icon:'🪬', name:'Deep Drone', desc:'A low resonant drone from Reishi caves. ×1.5 points.', cost:80, requires:['snd_re_lowbowl'], x:-1240, y:-525, branch:'planets', mult:1.5, soundUnlock:'re_deepdrone'},
  {id:'snd_re_ceremony', icon:'🪬', name:'Ceremony', desc:'A ritualistic ceremonial strike. ×1.5 points.', cost:80, requires:['snd_re_deepdrone'], x:-1335, y:-565, branch:'planets', mult:1.5, soundUnlock:'re_ceremony'},
  {id:'snd_re_lowbowl', icon:'🪬', name:'Low Bowl', desc:'A deep singing bowl with slow decay. ×1.5 points.', cost:80, requires:['snd_re_resonance'], x:-1145, y:-565, branch:'planets', mult:1.5, soundUnlock:'re_lowbowl'},
  {id:'snd_re_resonance', icon:'🪬', name:'Resonance', desc:'A pure resonant tone from Reishi crystals. ×1.5 points.', cost:80, requires:['snd_re_gong'], x:-1050, y:-525, branch:'planets', mult:1.5, soundUnlock:'re_resonance'},

  // Bella sounds
  {id:'snd_be_snap', icon:'✨', name:'Snap', desc:'A bright finger snap. ×1.5 points.', cost:80, requires:['cont_bella'], x:-955, y:-680, branch:'planets', mult:1.5, soundUnlock:'be_snap'},
  {id:'snd_be_woodsnap', icon:'✨', name:'Wood Snap', desc:'A crisp wood snap with quick attack. ×1.5 points.', cost:80, requires:['snd_be_snap'], x:-1050, y:-640, branch:'planets', mult:1.5, soundUnlock:'be_woodsnap'},
  {id:'snd_be_brightpop', icon:'✨', name:'Bright Pop', desc:'A bright poppy accent hit. ×1.5 points.', cost:80, requires:['snd_be_crackle'], x:-1240, y:-640, branch:'planets', mult:1.5, soundUnlock:'be_brightpop'},
  {id:'snd_be_crackle', icon:'✨', name:'Crackle', desc:'A snappy crackle with energy. ×1.5 points.', cost:80, requires:['snd_be_woodsnap'], x:-1145, y:-680, branch:'planets', mult:1.5, soundUnlock:'be_crackle'},
  {id:'snd_be_accent', icon:'✨', name:'Accent', desc:'A punchy accent note from Bella peaks. ×1.5 points.', cost:80, requires:['snd_be_brightpop'], x:-1335, y:-680, branch:'planets', mult:1.5, soundUnlock:'be_accent'},

  // Planet 3 — placeholder (branches from Hyphae, far left)
  {id:'planet_3', icon:'🌑', name:'???', desc:'An unknown world detected at the edge of the Tucana system. Coming in a future update.', cost:1000, requires:['planet_hyphae'], x:-1530, y:-330, branch:'planets', mult:1.5, placeholder:true},
  // Planet 4 — placeholder (branches from Mantra)
  {id:'planet_4', icon:'🌑', name:'???', desc:'An unknown world detected at the edge of the Tucana system. Coming in a future update.', cost:1000, requires:['planet_mantra'], x:-260, y:-1480, branch:'planets', mult:1.5, placeholder:true},

  // ── QUAD SUN 2 — Musical Toolkit (↗) ──
  {id:'sun_points', icon:'☀', name:'Quad Sun II', desc:'The second Quad Sun. Opens the Musical Toolkit path: tools and features to make your music better. Grants ×2 points.', cost:150, requires:['core'], x:200, y:-200, branch:'points', mult:2},
  {id:'neural_tap_1', icon:'🎼', name:'Tuning Fork', desc:'The first tool in your Musical Toolkit. Every point source earns ×1.5.', cost:200, requires:['sun_points'], x:340, y:-300, branch:'points', mult:1.5},
  // ── Musical Toolkit (v0.2.90): each big HUB opens a new idea, and its small branches unlock the actual features.
  //    Hubs: ×1.5 Alien Gems + a music fact. Branches: ×1.2 Alien Gems. Sequencer features stay hidden until bought.
  ...MUSIC_TREE_NODES,

  // ── QUAD SUN 3 — Minigames (↙) ──
  {id:'sun_minigames', icon:'☀', name:'Quad Sun III', desc:'The third Quad Sun. Opens the Minigame Nexus path. Grants ×2 points.', cost:150, requires:['core'], x:-200, y:200, branch:'minigames', mult:2},
  {id:'memory_boost', icon:'🃏', name:'Memory Boost', desc:'Enhances cognitive resonance. Adds 2 extra levels to the Matching Game. ×1.5 points.', cost:250, requires:['sun_minigames'], x:-340, y:300, branch:'minigames', mult:1.5, placeholder:true},
  {id:'alien_target', icon:'🎯', name:'Alien Target', desc:'Coming soon — a new tap-target minigame.', cost:500, requires:['memory_boost'], x:-480, y:360, branch:'minigames', mult:1.5, placeholder:true},
  {id:'chaos_mode', icon:'🎲', name:'Chaos Mode', desc:'Coming soon — random bonus event minigame.', cost:750, requires:['alien_target'], x:-580, y:460, branch:'minigames', mult:1.5, placeholder:true},
  {id:'grand_tournament', icon:'🏆', name:'Grand Tournament', desc:'Coming soon — weekly challenge mode.', cost:1000, requires:['chaos_mode'], x:-680, y:540, branch:'minigames', mult:1.5, placeholder:true},

  // ── QUAD SUN 4 — Alien Evolution (↘) ──
  {id:'sun_aliens', icon:'☀', name:'Quad Sun IV', desc:'The fourth Quad Sun. Opens the Alien Evolution path. Grants ×2 points.', cost:150, requires:['core'], x:200, y:200, branch:'aliens', mult:2},
  {id:'gem_harvester_1', icon:'💎', name:'Gem Harvester I', desc:'Gem rate ×1.5 per alien per minute.', cost:200, requires:['sun_aliens'], x:340, y:300, branch:'aliens', mult:1.5},
  {id:'gem_harvester_2', icon:'💎', name:'Gem Harvester II', desc:'Gem rate ×2 per alien per minute.', cost:400, requires:['gem_harvester_1'], x:480, y:360, branch:'aliens', mult:1.5},
  {id:'alien_awakening', icon:'👽', name:'Alien Awakening', desc:'Bouncers glow and leave energy trails.', cost:350, requires:['gem_harvester_1'], x:560, y:280, branch:'aliens', mult:1.5},
  {id:'dna_splice', icon:'🧬', name:'DNA Splice', desc:'Aliens occasionally double-tap automatically.', cost:600, requires:['alien_awakening'], x:680, y:380, branch:'aliens', mult:1.5},
  {id:'ascension', icon:'🌠', name:'Ascension', desc:'All alien effects ×3 and your egg begins to incubate.', cost:900, requires:['dna_splice'], x:760, y:460, branch:'aliens', mult:1.5},
];
const SKILL_MAP = {};
SKILL_TREE_NODES.forEach(n => SKILL_MAP[n.id] = n);

// Branch colors
const BRANCH_COLORS = {
  center: '#44aaff',
  planets: '#aa66ff',
  points:  '#ffcc00',
  minigames: '#ff6644',
  aliens: '#44eebb',
};

// ── Prices ──
// Musical Toolkit nodes get pricier as you go: every music node you own makes the remaining ones ×1.2.
// That matches the ×1.2 gem bonus each branch node gives, so later unlocks keep taking real time instead of
// snowballing (simulated with 10 aliens: Effects ~30 min, Key ~6 h, Piano Roll ~17 h, whole branch ~3 days).
const MUSIC_COST_GROWTH=1.2;
function musicOwnedCount(){let n=0;for(const k in unlockedSkills)if(unlockedSkills[k]&&k.startsWith('mt_'))n++;return n;}
function _round2(v){if(v<100)return Math.round(v);const p=Math.pow(10,Math.floor(Math.log10(v))-1);return Math.round(v/p)*p;}
function skillCost(node){
  if(typeof node==='string')node=SKILL_MAP[node];
  if(!node)return Infinity;
  if(!node.id.startsWith('mt_'))return node.cost;
  return _round2(node.cost*Math.pow(MUSIC_COST_GROWTH,musicOwnedCount()));
}
function fmtGems(v){return v<100000?Math.round(v).toLocaleString():formatStore(v);}

// ── Gem rate calculation ──
function gemsPerMinute(){
  let rate = totalAliens * BASE_GEMS_PER_ALIEN_PER_MIN;
  if(unlockedSkills['gem_harvester_2']) rate *= 2;
  else if(unlockedSkills['gem_harvester_1']) rate *= 1.5;
  rate *= skillGemMultiplier();
  return rate;
}
// Musical Toolkit hubs (×1.5) and branches (×1.2) multiply the gem rate
function skillGemMultiplier(){
  let m=1;
  SKILL_TREE_NODES.forEach(n=>{if(n.gemMult&&unlockedSkills[n.id])m*=n.gemMult;});
  return m;
}

// ── Gem interval ──
function startGemInterval(){
  if(gemInterval) clearInterval(gemInterval);
  // Tick every 5 seconds, award proportional gems
  gemInterval = setInterval(()=>{
    if(totalAliens <= 0) return;
    const perTick = gemsPerMinute() / 12; // 60s / 5s = 12 ticks per minute
    alienGems += perTick;
    updateGemDisplays();
    autoSave();
  }, 5000);
}

function fmtGemRate(v){return v>=1000?Math.round(v).toLocaleString():String(Math.round(v*100)/100);}
function updateGemDisplays(){
  const disp = Math.floor(alienGems);
  const el1 = document.getElementById('gemCountBunker');
  const el2 = document.getElementById('gemCountTree');
  if(el1) el1.textContent = disp.toLocaleString();
  if(el2) el2.textContent = disp.toLocaleString();
  // Show rate display
  const rate = gemsPerMinute();
  const rateEl = document.getElementById('gemRateDisplay');
  if(rateEl && totalAliens > 0){
    rateEl.textContent = `(${totalAliens} aliens × ${fmtGemRate(rate/totalAliens)}💎/min = ${fmtGemRate(rate)}/min)`;
  }
  // Shop header copy of the gem info (under the balance)
  const sc=document.getElementById('gemCountShop'),sr=document.getElementById('gemRateShop'),sw=document.getElementById('gemInfoShop');
  if(sc)sc.textContent=disp.toLocaleString();
  if(sr&&totalAliens>0)sr.textContent=`(${totalAliens} aliens × ${fmtGemRate(rate/totalAliens)}💎/min = ${fmtGemRate(rate)}/min)`;
  if(sw)sw.style.display=totalAliens>0?'flex':'none';
  if(typeof updateSkillTreeBtn==='function')updateSkillTreeBtn();
  // Show gem counter in bunker once player has any aliens
  const bc = document.getElementById('gemCounterBunker');
  if(bc) bc.style.display = totalAliens > 0 ? 'flex' : 'none';
}

// ── Skill effects ──
function applySkillEffects(){
  // Neural Tap I/II — boost clicksPerTap via multiplier stored on shop
  // Synaptic Chain — handled in doTap
  // Quantum Strike — handled in seqStepMultiplier()
  // Singularity — handled in totalMultiplier
  // Alien Awakening — visual handled in spawnBouncer
}

// ── Check if skill can be unlocked ──
function skillAvailable(id){
  const node = SKILL_MAP[id];
  if(!node) return false;
  if(unlockedSkills[id]) return false;
  return node.requires.every(r => !!unlockedSkills[r]); // the Tucana Core itself now has to be bought first (50 gems)
}

// ── Buy skill ──
function buySkill(id){
  const node = SKILL_MAP[id];
  if(!node || unlockedSkills[id]) return;
  if(!skillAvailable(id)) { showToast('Unlock the required skills first!'); return; }
  const price = skillCost(node);
  if(Math.floor(alienGems) < price) { showToast('Not enough Alien Gems!'); return; }
  if(node.placeholder && id !== 'memory_boost') { showToast('🔒 Coming in a future update!'); return; }
  alienGems -= price;
  unlockedSkills[id] = true;
  // Unlock sound if this node grants one
  if(node.soundUnlock) unlockPlanetSound(node.soundUnlock);
  // Musical Toolkit: show the newly unlocked sequencer feature
  if(typeof applyMusicUnlocks==='function') applyMusicUnlocks(id);
  // quantum_strike is read live by seqStepMultiplier(), nothing to restart
  applySkillEffects();
  updateGemDisplays();
  renderSkillTree();
  updateSkillTreeBtn();
  renderUI();
  autoSave();
  showToast(`✨ ${node.name} unlocked!`);
}

// ── Skill Tree Button render ──
const SKILL_TREE_COST_STR = '25 💎';
function updateSkillTreeBtn(){
  const btn = document.getElementById('skillTreeUnlockBtn');
  const costEl = document.getElementById('skillTreeUnlockCost');
  if(!btn) return;
  if(skillTreeUnlocked){
    btn.className = 'unlocked';
    btn.querySelector('span').textContent = '🌌 EXPLORE THE GALAXIES';
    if(costEl) costEl.textContent = 'OPEN →';
  } else {
    const canAfford = Math.floor(alienGems) >= GEM_UNLOCK_COST;
    btn.className = canAfford ? 'can-afford' : '';
    if(costEl) costEl.textContent = `UNLOCK — ${SKILL_TREE_COST_STR}`;
  }  if(typeof window.refreshPageDots==='function') window.refreshPageDots();
}

// ── Skill Tree Modal ──
let stPanX = 0, stPanY = 0, stScale = 1;
let stDragging = false, stLastX = 0, stLastY = 0;
let stPinchDist = 0;

function openSkillTree(){
  const modal = document.getElementById('skillTreeModal');
  if(!modal) return;
  modal.classList.add('open');
  updateGemDisplays();
  renderSkillTree();
  // Center the tree
  const canvas = document.getElementById('skillTreeCanvas');
  if(canvas){
    stPanX = canvas.clientWidth / 2;
    stPanY = canvas.clientHeight / 2;
    // desktop: start at a zoom that matches the window scale
    stScale = (typeof IS_DESKTOP!=='undefined'&&IS_DESKTOP)?Math.max(.8,Math.min(1.35,parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ds'))||1)):1;
    applyStTransform();
  }
}
function closeSkillTree(){
  const modal = document.getElementById('skillTreeModal');
  if(modal) modal.classList.remove('open');
  closeStDetail();
}

const ST_MIN_SCALE = 0.3, ST_MAX_SCALE = 2.5;
function applyStTransform(){
  const inner = document.getElementById('skillTreeInner');
  if(inner) inner.style.transform = `translate(${stPanX}px,${stPanY}px) scale(${stScale})`;
  const sl = document.getElementById('stZoomSlider');
  if(sl){ // slider position is on a log scale so each notch feels like the same amount of zoom
    const v = Math.log(stScale/ST_MIN_SCALE)/Math.log(ST_MAX_SCALE/ST_MIN_SCALE)*100;
    sl.value = String(Math.round(Math.min(100,Math.max(0,v))));
  }
}
// zoom around the middle of the map (used by the slider, the +/- buttons and the keyboard)
function stZoomTo(newScale){
  const canvas = document.getElementById('skillTreeCanvas'); if(!canvas) return;
  newScale = Math.min(ST_MAX_SCALE, Math.max(ST_MIN_SCALE, newScale));
  const mx = canvas.clientWidth/2, my = canvas.clientHeight/2;
  stPanX = mx - (mx - stPanX) * (newScale / stScale);
  stPanY = my - (my - stPanY) * (newScale / stScale);
  stScale = newScale;
  applyStTransform();
}

// ── Draw connector line between two nodes ──
function drawLine(inner, x1, y1, x2, y2, active){
  const dx = x2-x1, dy = y2-y1;
  const len = Math.sqrt(dx*dx+dy*dy);
  const angle = Math.atan2(dy, dx) * 180/Math.PI;
  const line = document.createElement('div');
  line.className = 'st-line' + (active?' active':'');
  line.style.cssText = `left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${angle}deg);`;
  inner.appendChild(line);
}

// ── Render the tree ──
function renderSkillTree(){
  const inner = document.getElementById('skillTreeInner');
  if(!inner) return;
  inner.innerHTML = '';

  // Draw branch labels
  const branchLabels = [
    {text:'🪐 PLANET ATLAS', x:-250, y:-330, color:BRANCH_COLORS.planets},
    {text:'🎵 MUSICAL TOOLKIT', x:200, y:-80, color:BRANCH_COLORS.points},
    {text:'🃏 MINIGAMES', x:-340, y:60, color:BRANCH_COLORS.minigames},
    {text:'👽 ALIEN EVO', x:200, y:60, color:BRANCH_COLORS.aliens},
  ];
  branchLabels.forEach(bl=>{
    const lbl = document.createElement('div');
    lbl.className = 'st-branch-label';
    lbl.style.cssText = `left:${bl.x}px;top:${bl.y}px;color:${bl.color};transform:translateX(-50%);`;
    lbl.textContent = bl.text;
    inner.appendChild(lbl);
  });

  // Draw connector lines first (behind nodes)
  SKILL_TREE_NODES.forEach(node=>{
    node.requires.forEach(reqId=>{
      const req = SKILL_MAP[reqId];
      if(!req) return;
      const active = unlockedSkills[node.id] || unlockedSkills[reqId];
      // Line from center of req node to center of this node
      drawLine(inner, req.x, req.y, node.x, node.y, active);
    });
  });

  // Determine visibility state for each node
  // unlocked → available → silhouette (1 step past available) → hidden
  const availableIds = new Set(
    SKILL_TREE_NODES.filter(n => !unlockedSkills[n.id] && skillAvailable(n.id)).map(n=>n.id)
  );
  const silhouetteIds = new Set(
    SKILL_TREE_NODES.filter(n =>
      !unlockedSkills[n.id] && !availableIds.has(n.id) && n.id!=='core' &&
      n.requires.some(r => availableIds.has(r) || unlockedSkills[r])
    ).map(n=>n.id)
  );

  // Draw nodes
  SKILL_TREE_NODES.forEach(node=>{
    const isCenter = node.id === 'core';
    const isUnlocked = !!unlockedSkills[node.id];
    const isAvailable = availableIds.has(node.id);
    const isSilhouette = !isCenter && !isUnlocked && !isAvailable && silhouetteIds.has(node.id);
    // Skip nodes that are too far away
    if(!isCenter && !isUnlocked && !isAvailable && !isSilhouette) return;

    const el = document.createElement('div');
    el.className = 'st-node' +
      (isCenter ? ' center' : '') +
      (node.hub ? ' hub' : '') +
      (isUnlocked ? ' unlocked' : '') +
      (isAvailable ? ' available' : '') +
      (isSilhouette ? ' silhouette' : '') +
      (!isUnlocked && !isAvailable && !isSilhouette && !isCenter ? ' locked' : '');
    const isHub = !!node.hub;
    const r = isCenter ? 36 : isHub ? 42 : 27;
    el.style.cssText = `left:${node.x - r}px;top:${node.y - r}px;`;

    const circle = document.createElement('div');
    circle.className = 'st-node-circle';
    if(isUnlocked) circle.style.borderColor = '#44eebb';
    else if(isSilhouette) circle.style.borderColor = '#0a0a0f';
    else circle.style.borderColor = BRANCH_COLORS[node.branch] || '#333';
    // Silhouette shows ? instead of icon
    circle.textContent = isSilhouette ? '?' : node.icon;

    const check = document.createElement('div');
    check.className = 'st-node-check';
    check.textContent = '✓';
    circle.appendChild(check);

    const label = document.createElement('div');
    label.className = 'st-node-label';
    // Silhouette hides name
    label.textContent = isSilhouette ? '???' : node.name;

    const costEl = document.createElement('div');
    costEl.className = 'st-node-cost';
    costEl.innerHTML = `💎 ${fmtGems(skillCost(node))}`;

    el.appendChild(circle);
    el.appendChild(label);
    if(!isSilhouette) el.appendChild(costEl); // (hidden by CSS once unlocked)

    el.addEventListener('click', e=>{
      e.stopPropagation();
      if(isSilhouette) return; // silhouettes aren't clickable
      openStDetail(node.id, el);
    });

    inner.appendChild(el);
  });
}

// ── Node detail popup ──
let _stDetailNode = null;
function openStDetail(id, fromEl){
  const node = SKILL_MAP[id];
  if(!node) return;
  const isUnlocked = !!unlockedSkills[id];
  const isAvailable = !isUnlocked && skillAvailable(id);
  // Don't open for silhouette/hidden nodes
  if(!isUnlocked && !isAvailable) return;
  _stDetailNode = id;
  const price = skillCost(node);
  const canAfford = Math.floor(alienGems) >= price;
  const isPlaceholder = node.placeholder;

  document.getElementById('stDetailIcon').textContent = node.icon;
  document.getElementById('stDetailName').textContent = node.name;
  document.getElementById('stDetailDesc').textContent = node.desc;
  const factEl = document.getElementById('stDetailFact');
  if(factEl){
    factEl.style.display = node.fact ? '' : 'none';
    factEl.innerHTML = '';
    if(node.fact){
      const h = document.createElement('div'); h.className = 'st-fact-head'; h.textContent = node.hub ? '💡 MUSIC 101' : '💡 DID YOU KNOW?';
      const t = document.createElement('div'); t.className = 'st-fact-text'; t.textContent = node.fact;
      factEl.appendChild(h); factEl.appendChild(t);
    }
  }
  document.getElementById('stDetailCost').textContent = isUnlocked ? '✓ UNLOCKED' : `💎 ${fmtGems(price)} GEMS`;

  const buyBtn = document.getElementById('stDetailBuyBtn');
  if(isUnlocked){
    buyBtn.textContent = '✓ UNLOCKED';
    buyBtn.className = 'owned';
    buyBtn.disabled = true;
  } else if(isPlaceholder && id !== 'memory_boost'){
    buyBtn.textContent = '🔒 COMING SOON';
    buyBtn.className = '';
    buyBtn.disabled = true;
  } else if(!isAvailable){
    buyBtn.textContent = '🔒 LOCKED';
    buyBtn.className = '';
    buyBtn.disabled = true;
  } else if(!canAfford){
    buyBtn.textContent = `NEED ${fmtGems(price - Math.floor(alienGems))} MORE GEMS`;
    buyBtn.className = '';
    buyBtn.disabled = true;
  } else {
    buyBtn.textContent = `UNLOCK — 💎 ${fmtGems(price)}`;
    buyBtn.className = '';
    buyBtn.disabled = false;
  }

  const pop = document.getElementById('stDetailPop');
  pop.classList.add('open');

  // Position next to the node, always fully on screen (uses the popup's real size)
  const canvas = document.getElementById('skillTreeCanvas');
  const cr = canvas ? canvas.getBoundingClientRect() : {left:0,top:0,width:window.innerWidth,height:window.innerHeight};
  const sx = cr.left + stPanX + node.x * stScale;
  const sy = cr.top + stPanY + node.y * stScale;
  const nodeR = (node.id==='core' ? 36 : node.hub ? 42 : 27) * stScale;
  const vw = window.innerWidth, vh = window.innerHeight, M = 8;
  pop.style.maxHeight = (vh - M*2) + 'px';
  pop.style.overflowY = 'auto';
  pop.style.left = '0px'; pop.style.top = '0px';
  const pw = Math.min(pop.offsetWidth, vw - M*2), ph = Math.min(pop.offsetHeight, vh - M*2);
  const gap = 14, labelH = 34 * stScale; // room for the node's name + price under the bubble
  const clampX = x => Math.max(M, Math.min(vw - pw - M, x));
  const clampY = y => Math.max(M, Math.min(vh - ph - M, y));
  let left, top;
  const below = sy + nodeR + labelH + gap, above = sy - nodeR - gap - ph;
  if(below + ph <= vh - M){ left = clampX(sx - pw/2); top = below; }
  else if(above >= M){ left = clampX(sx - pw/2); top = above; }
  else if(sx + nodeR + gap + pw <= vw - M){ left = sx + nodeR + gap; top = clampY(sy - ph/2); }
  else if(sx - nodeR - gap - pw >= M){ left = sx - nodeR - gap - pw; top = clampY(sy - ph/2); }
  else {
    // no room anywhere (phones): slide the map so the bubble sits just above the popup at the bottom of the screen
    const wantSy = vh - M - ph - gap - labelH - nodeR;
    const topLimit = cr.top + nodeR + 4;
    if(wantSy >= topLimit){ stPanY += wantSy - sy; applyStTransform(); left = clampX(sx - pw/2); top = vh - M - ph; }
    else { left = clampX((vw - pw)/2); top = clampY((vh - ph)/2); } // tiny screens: centre it
  }
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}
function closeStDetail(){
  document.getElementById('stDetailPop').classList.remove('open');
  _stDetailNode = null;
}

// ── Zoom slider + arrow-key panning ──
(function(){
  const sl = document.getElementById('stZoomSlider');
  sl && sl.addEventListener('input', ()=>{
    stZoomTo(ST_MIN_SCALE * Math.pow(ST_MAX_SCALE/ST_MIN_SCALE, (+sl.value)/100));
  });
  const zin = document.getElementById('stZoomIn'), zout = document.getElementById('stZoomOut');
  zin && zin.addEventListener('click', ()=>stZoomTo(stScale*1.25));
  zout && zout.addEventListener('click', ()=>stZoomTo(stScale/1.25));
  // arrow keys glide the map (hold to keep moving); + / - zoom
  const held = {};
  let raf = 0, lastT = 0;
  function treeOpen(){ const m = document.getElementById('skillTreeModal'); return !!(m && m.classList.contains('open')); }
  function step(t){
    raf = 0;
    if(!treeOpen()){ for(const k in held) delete held[k]; return; }
    const dt = Math.min(48, t - lastT || 16); lastT = t;
    const sp = 0.7 * dt; // px per frame-ms
    let moved = false;
    if(held.ArrowLeft){ stPanX += sp; moved = true; }
    if(held.ArrowRight){ stPanX -= sp; moved = true; }
    if(held.ArrowUp){ stPanY += sp; moved = true; }
    if(held.ArrowDown){ stPanY -= sp; moved = true; }
    if(moved) applyStTransform();
    if(Object.keys(held).length) raf = requestAnimationFrame(step);
  }
  window.addEventListener('keydown', e=>{
    if(!treeOpen()) return;
    const tg = e.target && e.target.tagName;
    if(tg === 'INPUT' && e.target.type !== 'range') return;
    if(tg === 'TEXTAREA' || tg === 'SELECT') return;
    if(e.key.startsWith('Arrow')){
      e.preventDefault(); e.stopPropagation();
      held[e.key] = true;
      if(!raf){ lastT = performance.now(); raf = requestAnimationFrame(step); }
    } else if(e.key === '+' || e.key === '='){ e.preventDefault(); stZoomTo(stScale*1.15); }
    else if(e.key === '-' || e.key === '_'){ e.preventDefault(); stZoomTo(stScale/1.15); }
    else if(e.key === 'Escape'){ closeSkillTree(); }
  }, true);
  window.addEventListener('keyup', e=>{ delete held[e.key]; });
  window.addEventListener('blur', ()=>{ for(const k in held) delete held[k]; });
})();

// ── Pan/drag the canvas ──
function initSkillTreePan(){
  const canvas = document.getElementById('skillTreeCanvas');
  if(!canvas) return;

  // Mouse drag
  canvas.addEventListener('mousedown', e=>{
    if(e.target.closest('.st-node')) return;
    stDragging = true; stLastX = e.clientX; stLastY = e.clientY;
    canvas.classList.add('dragging');
  });
  window.addEventListener('mousemove', e=>{
    if(!stDragging) return;
    stPanX += e.clientX - stLastX;
    stPanY += e.clientY - stLastY;
    stLastX = e.clientX; stLastY = e.clientY;
    applyStTransform();
  });
  window.addEventListener('mouseup', ()=>{ stDragging = false; canvas.classList.remove('dragging'); });

  // Touch drag (1 finger) and pinch (2 fingers)
  canvas.addEventListener('touchstart', e=>{
    if(e.touches.length === 1 && !e.target.closest('.st-node')){
      stDragging = true;
      stLastX = e.touches[0].clientX; stLastY = e.touches[0].clientY;
    }
    if(e.touches.length === 2){
      stDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      stPinchDist = Math.sqrt(dx*dx+dy*dy);
    }
  },{passive:true});
  canvas.addEventListener('touchmove', e=>{
    if(e.touches.length === 1 && stDragging){
      stPanX += e.touches[0].clientX - stLastX;
      stPanY += e.touches[0].clientY - stLastY;
      stLastX = e.touches[0].clientX; stLastY = e.touches[0].clientY;
      applyStTransform();
    }
    if(e.touches.length === 2){
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if(stPinchDist > 0){
        const delta = dist / stPinchDist;
        stScale = Math.min(ST_MAX_SCALE, Math.max(ST_MIN_SCALE, stScale * delta));
        applyStTransform();
      }
      stPinchDist = dist;
    }
  },{passive:true});
  canvas.addEventListener('touchend', ()=>{ stDragging = false; stPinchDist = 0; },{passive:true});

  // Scroll wheel zoom (desktop)
  canvas.addEventListener('wheel', e=>{
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    // Zoom toward cursor position
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const newScale = Math.min(ST_MAX_SCALE, Math.max(ST_MIN_SCALE, stScale * delta));
    // Adjust pan so zoom centres on cursor
    stPanX = mx - (mx - stPanX) * (newScale / stScale);
    stPanY = my - (my - stPanY) * (newScale / stScale);
    stScale = newScale;
    applyStTransform();
  }, {passive: false});

  // Close detail on canvas click (not on node)
  canvas.addEventListener('click', e=>{
    if(!e.target.closest('.st-node') && !e.target.closest('#stDetailPop')) closeStDetail();
  });
}

// ── Wire buttons ──
document.getElementById('skillTreeUnlockBtn')&&document.getElementById('skillTreeUnlockBtn').addEventListener('click',()=>{
  if(skillTreeUnlocked){ openSkillTree(); return; }
  if(Math.floor(alienGems) < GEM_UNLOCK_COST){ showToast('Need 25 💎 Alien Gems to Explore the Galaxies!'); return; }
  alienGems -= GEM_UNLOCK_COST;
  updateGemDisplays();
  skillTreeUnlocked = true;
  renderUI();
  autoSave();
  updateSkillTreeBtn();
  showToast('🌌 Explore the Galaxies unlocked! Find it at the top of the Shop.');
  openSkillTree();
});
document.getElementById('skillTreeCloseBtn')&&document.getElementById('skillTreeCloseBtn').addEventListener('click', closeSkillTree);
document.getElementById('stDetailBuyBtn')&&document.getElementById('stDetailBuyBtn').addEventListener('click',()=>{ if(_stDetailNode) buySkill(_stDetailNode); closeStDetail(); });
const _stDetailClose = document.getElementById('stDetailClose');
if(_stDetailClose){
  _stDetailClose.onclick = closeStDetail;
  _stDetailClose.ontouchend = (e)=>{ e.preventDefault(); closeStDetail(); };
}

// Init pan
initSkillTreePan();

// ── Hook into renderUI for skill tree button state ──
const _stOrigRenderUI = renderUI;

// ── Apply skill tree multipliers to game systems ──
// Injected into existing functions via checks

// ── Level Adjust Mode ──
let levelAdjMode=false;
let _velLayer=null,_velStep=-1,_velBtn=null;

function setLevelAdjMode(on){
  levelAdjMode=on;
  const b=document.getElementById('seqLevelAdjBtn');
  const bf=document.getElementById('seqFullLevelAdjBtn');
  if(b){b.classList.toggle('active',on);b.style.borderColor=on?'#a0a8ff':'#2a2a4a';b.style.color=on?'#a0a8ff':'';}
  if(bf){bf.classList.toggle('active',on);bf.style.borderColor=on?'#a0a8ff':'#2a2a4a';bf.style.color=on?'#a0a8ff':'';}
  if(!on)closeVelPopover();
}

function openVelPopover(layer,si,btn){
  _velLayer=layer;_velStep=si;_velBtn=btn;
  const vol=layer.vols[si]||100;
  const slider=document.getElementById('velSlider');
  const valEl=document.getElementById('velValue');
  if(slider)slider.value=vol;
  if(valEl)valEl.textContent=vol;
  // Position near the button
  const pop=document.getElementById('velPopover');
  if(!pop)return;
  const r=btn.getBoundingClientRect();
  const pw=168,ph=110;
  let left=r.left+(r.width/2)-(pw/2);
  let top=r.top-ph-8;
  if(top<8)top=r.bottom+8;
  if(left<8)left=8;
  if(left+pw>window.innerWidth-8)left=window.innerWidth-pw-8;
  pop.style.left=left+'px';
  pop.style.top=top+'px';
  pop.style.display='flex';
}

function closeVelPopover(){
  const pop=document.getElementById('velPopover');
  if(pop)pop.style.display='none';
  _velLayer=null;_velStep=-1;_velBtn=null;
}

const _velSlider=document.getElementById('velSlider');
const _velValue=document.getElementById('velValue');
const _velConfirm=document.getElementById('velConfirm');

_velSlider&&_velSlider.addEventListener('input',()=>{if(_velValue)_velValue.textContent=_velSlider.value;});

_velConfirm&&_velConfirm.addEventListener('click',()=>{
  if(!_velLayer||_velStep<0)return;
  const v=parseInt(_velSlider.value)||100;
  _velLayer.vols[_velStep]=v;
  const opacity=String(0.3+0.7*(v/100));
  if(_velBtn){_velBtn.style.opacity=opacity;}
  if(_velLayer.fullStepEls[_velStep])_velLayer.fullStepEls[_velStep].style.opacity=opacity;
  if(_velLayer.stepEls[_velStep])_velLayer.stepEls[_velStep].style.opacity=opacity;
  closeVelPopover();
  autoSave();
});

// Close popover on outside click
document.addEventListener('pointerdown',e=>{
  const pop=document.getElementById('velPopover');
  if(pop&&pop.style.display!=='none'&&!pop.contains(e.target))closeVelPopover();
},{capture:true,passive:true});

const _lvlBtn=document.getElementById('seqLevelAdjBtn');
const _lvlBtnFull=document.getElementById('seqFullLevelAdjBtn');
_lvlBtn&&_lvlBtn.addEventListener('click',()=>setLevelAdjMode(!levelAdjMode));
_lvlBtnFull&&_lvlBtnFull.addEventListener('click',()=>setLevelAdjMode(!levelAdjMode));
// Reset level adj mode when closing full modal

// ── Reset Sequencer ──
function openSeqResetModal(){
  closeSettings();
  document.getElementById('seqResetModal').style.display='flex';
}
function closeSeqResetModal(){
  document.getElementById('seqResetModal').style.display='none';
}

function clearCurrentNotes(){
  if(typeof clearRollLayers==='function')clearRollLayers('all');
  // Clear all steps in all current editor layers
  seqLayers.forEach(layer=>{
    layer.steps.fill(false);
    layer.stepEls.forEach(el=>el.classList.remove('on'));
    layer.fullStepEls&&layer.fullStepEls.forEach(el=>el.classList.remove('on'));
  });
  closeSeqResetModal();
  showToast('🎛 Current pattern cleared');
  autoSave();
}

function clearSavedPatternsAndArrangements(){
  savedPatterns=[];
  savedArrangements=[];
  songSlots=[];
  arrangement=[];
  buildPatLibrary&&buildPatLibrary();
  buildArrGrid&&buildArrGrid();
  closeSeqResetModal();
  showToast('🎛 Patterns, arrangements & songs cleared');
  autoSave();
}

function fullSeqReset(){
  if(typeof pianoRoll!=='undefined'){pianoRoll={layers:[]};if(typeof refreshRollUI==='function')refreshRollUI();}
  if(typeof voxLoad==='function')voxLoad(null); // vocal takes go too (the audio is cleaned up next time the game loads)
  if(typeof automationLoad==='function')automationLoad(null);
  // Clear current notes
  seqLayers.forEach(layer=>{
    layer.steps.fill(false);
    layer.stepEls.forEach(el=>el.classList.remove('on'));
    layer.fullStepEls&&layer.fullStepEls.forEach(el=>el.classList.remove('on'));
  });
  // Clear saved
  savedPatterns=[];savedArrangements=[];songSlots=[];arrangement=[];
  // Reset BPM
  seqBpm=100;updateBpmDisplay();
  if(seqPlaying){stopSeq();startSeq();}
  // Restore default sounds on pads
  for(let i=0;i<padSounds.length;i++) padSounds[i]=i<drum.pads?(PAD_DEFAULT_SOUNDS[i]||null):null;
  rebuildPadGrid();
  // Rebuild sequencer with default first layer
  if(drum.seqTracks>0){
    seqLayersContainer.innerHTML='';seqLayers=[];
    addSeqLayer('hihat');
    ensureAllTracks();
    updateSeqAddBtn();
  }
  closeSeqResetModal();
  showToast('🎛 Sequencer fully reset to defaults');
  autoSave();
}

document.getElementById('settingsSeqResetBtn')&&document.getElementById('settingsSeqResetBtn').addEventListener('click',openSeqResetModal);
document.getElementById('seqResetSteps')&&document.getElementById('seqResetSteps').addEventListener('click',()=>{if(confirm('Clear all current notes in the pattern editor?'))clearCurrentNotes();});
document.getElementById('seqResetPatterns')&&document.getElementById('seqResetPatterns').addEventListener('click',()=>{if(confirm('Delete all saved patterns, arrangements and songs? This cannot be undone.'))clearSavedPatternsAndArrangements();});
document.getElementById('seqResetFull')&&document.getElementById('seqResetFull').addEventListener('click',()=>{if(confirm('Full sequencer reset? Clears all notes, patterns, arrangements, resets BPM and pad sounds. Cannot be undone.'))fullSeqReset();});
document.getElementById('seqResetCancel')&&document.getElementById('seqResetCancel').addEventListener('click',closeSeqResetModal);
document.getElementById('seqResetModal')&&document.getElementById('seqResetModal').addEventListener('click',e=>{if(e.target===document.getElementById('seqResetModal'))closeSeqResetModal();});
document.getElementById('settingsPanel')&&document.getElementById('settingsPanel').addEventListener('click',function(e){
  if(e.target===this) closeSettings();
});

// Settings open button (the new bottom-left button)
document.getElementById('settingsOpenBtn')&&document.getElementById('settingsOpenBtn').addEventListener('click',openSettings);
document.getElementById('settingsOpenBtn')&&document.getElementById('settingsOpenBtn').addEventListener('touchend',function(e){e.preventDefault();openSettings();});

// Patch the existing particle spawn to respect settings
const _origSpawnParticle = typeof spawnParticle==='function' ? spawnParticle : null;
// We'll patch via the doTap path — intercept at CSS level with a body class
function applyParticleSetting(){
  document.body.classList.toggle('no-particles', !v5Settings.particles);
}

// Patch spawnParticle calls via CSS: hide particles when disabled
// Add the CSS rule dynamically
(function(){
  const style=document.createElement('style');
  style.textContent='body.no-particles .particle{display:none!important;}';
  document.head.appendChild(style);
})();

// ── Init sequence ──
(function initV5(){
  loadV5Settings();
  applyParticleSetting();
  applyDesktopMode();

  // After layout settles, position collapse buttons
  requestAnimationFrame(()=>{
    repositionCollapseButtons();
    // Watch for sidebar transitions to reposition
    ['storeView','bunkerView'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.addEventListener('transitionend', repositionCollapseButtons);
    });
  });

  // Re-check on resize (e.g. user resizes browser window)
  window.addEventListener('resize',()=>{
    repositionCollapseButtons();
  });
})();

// ── Egg Reward ──
const eggRewardClose=document.getElementById('eggRewardClose');
eggRewardClose&&eggRewardClose.addEventListener('click',()=>{
  const m=document.getElementById('eggRewardModal');
  if(m)m.style.display='none';
  hasReceivedEgg=true;
  buildIncubatorGrid();
  updateIncubatorVisibility();
  autoSave();
  showToast('🥚 Egg added to your Incubator in the Bunker!');
});
// Close on backdrop tap
const eggModal=document.getElementById('eggRewardModal');
eggModal&&eggModal.addEventListener('click',e=>{if(e.target===eggModal){/* don't close on backdrop — force them to click Claim */}});

// ── Contextual Hints ──
function checkContextualHints(){
  if(activeSlot<0)return;
  // Only show one at a time; check in priority order
  if(score>=750000&&!shownHints.tips){
    shownHints.tips=true;autoSave();
    showHintModal('💡',"Click on 'TIPS' in the Bunker to read helpful hints and earn Point Multipliers!");
    return;
  }
  if(score>=4000000&&!shownHints.matchingIntro&&matchLevelsCompleted<0){
    shownHints.matchingIntro=true;autoSave();
    showHintModal('🃏','Play the Matching Game in the Bunker to gain Point Multipliers!');
    return;
  }
  if(totalAliens>=6&&matchLevelsCompleted<0&&!shownHints.matchingGame){
    shownHints.matchingGame=true;autoSave();
    showHintModal('🃏','Play the Matching Game in the Bunker to gain Point Multipliers!');
    return;
  }
}

let _hintCanDismiss=false;
let _hintDismissTimer=null;

function showHintModal(emoji,text){
  const el=document.getElementById('hintModal');
  const em=document.getElementById('hintModalIcon');
  const tx=document.getElementById('hintModalText');
  const btn=document.getElementById('hintModalClose');
  if(!el)return;
  if(em)em.textContent=emoji;
  if(tx)tx.textContent=text;
  el.style.display='flex';
  // Lock dismiss briefly (0.5s) so a stray tap can't skip it, but speedrunners aren't held up
  _hintCanDismiss=false;
  if(btn){btn.style.opacity='.35';btn.style.pointerEvents='none';}
  if(_hintDismissTimer)clearTimeout(_hintDismissTimer);
  _hintDismissTimer=setTimeout(()=>{
    _hintCanDismiss=true;
    if(btn){btn.style.opacity='';btn.style.pointerEvents='';}
  },500);
}

function closeHintModal(){
  if(!_hintCanDismiss)return;
  document.getElementById('hintModal').style.display='none';
}

const _hintDismiss=document.getElementById('hintModalClose');
if(_hintDismiss){
  _hintDismiss.addEventListener('click',closeHintModal);
  _hintDismiss.addEventListener('touchend',e=>{e.preventDefault();closeHintModal();});
}
const _hintModalEl=document.getElementById('hintModal');
if(_hintModalEl){
  _hintModalEl.addEventListener('click',e=>{if(e.target===_hintModalEl)closeHintModal();});
}

// Mark tips as seen when tips button clicked
const _tipsBtnHint=document.getElementById('tipsBtn');
if(_tipsBtnHint){_tipsBtnHint.addEventListener('click',()=>{shownHints.tips=true;},{capture:true,passive:true});}

// Mark matching as seen when matching game opens
const _matchBtnHint=document.getElementById('matchingBtn');
if(_matchBtnHint){_matchBtnHint.addEventListener('click',()=>{shownHints.matchingIntro=true;shownHints.matchingGame=true;},{capture:true,passive:true});}


// ── Version + layout mode (Settings) ──
(function(){
  const ver=document.getElementById('settingsVersion');if(ver)ver.textContent='v'+GAME_VERSION;
  const hv=document.getElementById('homeVersion');if(hv)hv.textContent='v'+GAME_VERSION;
  const sel=document.getElementById('settingsLayoutSel'),info=document.getElementById('settingsLayoutInfo');
  if(!sel)return;
  function paint(){
    sel.value=v5Settings.layoutMode||'auto';
    if(info)info.textContent='NOW: '+(IS_DESKTOP?'DESKTOP':'MOBILE')+' · WINDOW '+innerWidth+'PX';
  }
  paint();
  sel.addEventListener('change',()=>{
    v5Settings.layoutMode=sel.value;saveV5Settings();
    recheckDesktopMode();paint();
    showToast('Layout: '+sel.value.toUpperCase()+' → now '+(IS_DESKTOP?'desktop':'mobile'));
  });
  window._paintLayoutSetting=paint; // called whenever Settings opens
})();

// ── "More than 10 aliens on screen" setting ──
(function(){
  const t=document.getElementById('settingsMoreAliens');
  const row=document.getElementById('settingsAlienLimitRow');
  const inp=document.getElementById('settingsAlienLimit');
  if(!t||!inp)return;
  const clamp=v=>Math.max(1,Math.min(100,Math.round(+v)||10));
  function paint(){t.checked=!!v5Settings.moreAliens;row.style.display=t.checked?'flex':'none';inp.value=v5Settings.bouncerLimit||20;}
  function apply(){
    if(bouncerPicks&&bouncerPicks.length>bouncerMax())bouncerPicks=bouncerPicks.slice(0,bouncerMax());
    syncBouncers(false);if(typeof autoSave==='function')autoSave();
  }
  paint();
  t.addEventListener('change',()=>{
    if(t.checked){
      if(!confirm('Warning: showing more than 10 alien buddies at once might affect game performance. Turn it on?')){t.checked=false;return;}
      v5Settings.moreAliens=true;v5Settings.bouncerLimit=v5Settings.bouncerLimit||20;
    }else v5Settings.moreAliens=false;
    saveV5Settings();paint();apply();
  });
  function setLimit(v){v5Settings.bouncerLimit=clamp(v);saveV5Settings();inp.value=v5Settings.bouncerLimit;apply();}
  inp.addEventListener('change',()=>setLimit(inp.value));
  // mouse wheel over the number (or its − / + buttons) changes it
  inp.parentElement.addEventListener('wheel',e=>{e.preventDefault();setLimit((v5Settings.bouncerLimit||20)+(e.deltaY<0?1:-1));},{passive:false});
  document.getElementById('settingsAlienMinus').addEventListener('click',()=>setLimit((v5Settings.bouncerLimit||20)-1));
  document.getElementById('settingsAlienPlus').addEventListener('click',()=>setLimit((v5Settings.bouncerLimit||20)+1));
})();

// ── "Earn while tab hidden" toggle ──
(function(){
  const t=document.getElementById('settingsEarnHidden');
  if(!t)return;
  t.checked=true;
  t.addEventListener('change',()=>{
    v5Settings.earnHidden=t.checked;saveV5Settings();
    showToast(t.checked?'🌙 Earning continues while this tab is hidden':'🌙 Earning pauses while this tab is hidden');
  });
})();
