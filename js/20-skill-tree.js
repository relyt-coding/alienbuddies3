
// ══════════════════════════════════════════════
//  ALIEN GEMS + SKILL TREE
// ══════════════════════════════════════════════

// ── State ──
let alienGems = 0;
let skillTreeUnlocked = false;
let unlockedSkills = {}; // {skillId: true}
let gemInterval = null;
const GEM_UNLOCK_COST = 2e25;
const BASE_GEMS_PER_ALIEN_PER_MIN = 1;

// ── Skill Tree Data ──
// Layout: center at (0,0), branches go diagonally
// Each node: {id, icon, name, desc, cost, requires, x, y, branch, placeholder}
const SKILL_TREE_NODES = [
  // ── CENTER ──
  {id:'core', icon:'✦', name:'Tucana Core', desc:'The heart of the Tucana Galaxy. All four Quad Sun paths begin here.', cost:100, requires:[], x:0, y:0, branch:'center', mult:0},

  // ── QUAD SUN 1 — Planet Exploration (↖) ──
  {id:'sun_planets', icon:'☀', name:'Quad Sun I', desc:'The first of four Quad Suns. Opens the Planet Exploration path. Grants ×2 points.', cost:150, requires:['core'], x:-200, y:-200, branch:'planets', mult:2},

  // Planet Mantra
  {id:'planet_mantra', icon:'🌍', name:'Planet Mantra', desc:'First contact with Planet Mantra. Unlocks the Om continent and standard sounds. Grants ×1.5 points.', cost:300, requires:['sun_planets'], x:-340, y:-300, branch:'planets', mult:1.5},
  // Mantra continents
  {id:'cont_om', icon:'🔔', name:'Continent: Om', desc:'The spiritual heartland of Mantra. Enriches the standard drum kit with 4 new sounds. ×1.5 points.', cost:200, requires:['planet_mantra'], x:-420, y:-200, branch:'planets', mult:1.5,
    sounds:['om_bell','om_bowl','om_rim','om_shaker2']},
  {id:'cont_sohum', icon:'🥁', name:'Continent: So Hum', desc:'Lofi metallic instruments from the ancient forges of So Hum. 5 new sounds. ×1.5 points.', cost:200, requires:['planet_mantra'], x:-480, y:-320, branch:'planets', mult:1.5,
    sounds:['sh_metalclick','sh_tinpan','sh_steeldrum','sh_cymbal_lo','sh_chain']},
  {id:'cont_manas', icon:'🌀', name:'Continent: Manas', desc:'Abstract electronic pulses from the digital wastes of Manas. 5 new sounds. ×1.5 points.', cost:200, requires:['planet_mantra'], x:-520, y:-180, branch:'planets', mult:1.5,
    sounds:['mn_bitcrush','mn_glitchperc','mn_databend','mn_synthpop','mn_digitalsnare']},
  {id:'cont_floww', icon:'💧', name:'Continent: Floww', desc:'Water, marimba and soft bass from the ocean plains of Floww. 5 new sounds. ×1.5 points.', cost:200, requires:['planet_mantra'], x:-440, y:-430, branch:'planets', mult:1.5,
    sounds:['fw_waterdrip','fw_marimba2','fw_softbass','fw_wave','fw_woodblock']},

  // Sound nodes for Om
  {id:'snd_om_bell', icon:'🔔', name:'Om Bell', desc:'A pure resonant bell tone from the Om temples. ×1.5 points.', cost:50, requires:['cont_om'], x:-520, y:-120, branch:'planets', mult:1.5, soundUnlock:'om_bell'},
  {id:'snd_om_bowl', icon:'🎵', name:'Om Bowl', desc:'A singing bowl strike with long harmonic decay. ×1.5 points.', cost:50, requires:['cont_om'], x:-580, y:-170, branch:'planets', mult:1.5, soundUnlock:'om_bowl'},
  {id:'snd_om_rim', icon:'🥁', name:'Om Rim', desc:'A crisp rim knock on a ceremonial drum. ×1.5 points.', cost:50, requires:['cont_om'], x:-560, y:-60, branch:'planets', mult:1.5, soundUnlock:'om_rim'},
  {id:'snd_om_shaker2', icon:'🎶', name:'Om Shaker', desc:'A soft organic shaker from Om rituals. ×1.5 points.', cost:50, requires:['cont_om'], x:-630, y:-100, branch:'planets', mult:1.5, soundUnlock:'om_shaker2'},

  // Sound nodes for So Hum
  {id:'snd_sh_metalclick', icon:'⚙', name:'Metal Click', desc:'A sharp metallic click from So Hum forges. ×1.5 points.', cost:50, requires:['cont_sohum'], x:-570, y:-390, branch:'planets', mult:1.5, soundUnlock:'sh_metalclick'},
  {id:'snd_sh_tinpan', icon:'🥫', name:'Tin Pan', desc:'A hollow tin pan strike with buzzy overtones. ×1.5 points.', cost:50, requires:['cont_sohum'], x:-630, y:-340, branch:'planets', mult:1.5, soundUnlock:'sh_tinpan'},
  {id:'snd_sh_steeldrum', icon:'🎺', name:'Steel Drum', desc:'A warm steel drum tone from the So Hum markets. ×1.5 points.', cost:50, requires:['cont_sohum'], x:-680, y:-280, branch:'planets', mult:1.5, soundUnlock:'sh_steeldrum'},
  {id:'snd_sh_cymbal_lo', icon:'💿', name:'Lo Cymbal', desc:'A dark low cymbal wash, lofi and dusty. ×1.5 points.', cost:50, requires:['cont_sohum'], x:-660, y:-420, branch:'planets', mult:1.5, soundUnlock:'sh_cymbal_lo'},
  {id:'snd_sh_chain', icon:'⛓', name:'Chain Rattle', desc:'A metallic chain rattle with industrial character. ×1.5 points.', cost:50, requires:['cont_sohum'], x:-720, y:-360, branch:'planets', mult:1.5, soundUnlock:'sh_chain'},

  // Sound nodes for Manas
  {id:'snd_mn_bitcrush', icon:'💾', name:'Bit Crush', desc:'An 8-bit crunchy percussive hit. ×1.5 points.', cost:50, requires:['cont_manas'], x:-620, y:-140, branch:'planets', mult:1.5, soundUnlock:'mn_bitcrush'},
  {id:'snd_mn_glitchperc', icon:'📡', name:'Glitch Perc', desc:'A fragmented digital percussion burst. ×1.5 points.', cost:50, requires:['cont_manas'], x:-680, y:-190, branch:'planets', mult:1.5, soundUnlock:'mn_glitchperc'},
  {id:'snd_mn_databend', icon:'🖥', name:'Data Bend', desc:'A data-corrupted tone with alien texture. ×1.5 points.', cost:50, requires:['cont_manas'], x:-700, y:-110, branch:'planets', mult:1.5, soundUnlock:'mn_databend'},
  {id:'snd_mn_synthpop', icon:'🎹', name:'Synth Pop', desc:'A bright synthetic pop with punchy attack. ×1.5 points.', cost:50, requires:['cont_manas'], x:-650, y:-50, branch:'planets', mult:1.5, soundUnlock:'mn_synthpop'},
  {id:'snd_mn_digitalsnare', icon:'📟', name:'Digital Snare', desc:'A lo-fi digital snare crack. ×1.5 points.', cost:50, requires:['cont_manas'], x:-750, y:-160, branch:'planets', mult:1.5, soundUnlock:'mn_digitalsnare'},

  // Sound nodes for Floww
  {id:'snd_fw_waterdrip', icon:'💦', name:'Water Drip', desc:'A single water droplet with crystalline resonance. ×1.5 points.', cost:50, requires:['cont_floww'], x:-530, y:-510, branch:'planets', mult:1.5, soundUnlock:'fw_waterdrip'},
  {id:'snd_fw_marimba2', icon:'🪘', name:'Ocean Marimba', desc:'A soft watery marimba tone. ×1.5 points.', cost:50, requires:['cont_floww'], x:-590, y:-470, branch:'planets', mult:1.5, soundUnlock:'fw_marimba2'},
  {id:'snd_fw_softbass', icon:'🐋', name:'Soft Bass', desc:'A warm rounded bass note from deep Floww waters. ×1.5 points.', cost:50, requires:['cont_floww'], x:-650, y:-510, branch:'planets', mult:1.5, soundUnlock:'fw_softbass'},
  {id:'snd_fw_wave', icon:'🌊', name:'Wave Crash', desc:'A gentle wave crash with white noise tail. ×1.5 points.', cost:50, requires:['cont_floww'], x:-470, y:-550, branch:'planets', mult:1.5, soundUnlock:'fw_wave'},
  {id:'snd_fw_woodblock', icon:'🪵', name:'Wood Block', desc:'A hollow wooden block strike with warm tone. ×1.5 points.', cost:50, requires:['cont_floww'], x:-540, y:-570, branch:'planets', mult:1.5, soundUnlock:'fw_woodblock'},

  // Planet Hyphae (branches from Mantra)
  {id:'planet_hyphae', icon:'🍄', name:'Planet Hyphae', desc:'A mushroom-covered world of organic textures. Unlocks 6 continents of fungal sound. ×1.5 points.', cost:500, requires:['planet_mantra'], x:-600, y:-380, branch:'planets', mult:1.5},
  // Hyphae continents
  {id:'cont_enoki', icon:'🌿', name:'Continent: Enoki', desc:'Thin, high metallic taps and light woody clicks. Delicate and sparse. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-700, y:-460, branch:'planets', mult:1.5,
    sounds:['en_tinktap','en_woodtap','en_highping','en_lightrim','en_softclick']},
  {id:'cont_morel', icon:'🌑', name:'Continent: Morel', desc:'Deep hollow thuds and earthy low tones. Warm and organic. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-760, y:-420, branch:'planets', mult:1.5,
    sounds:['mo_earththud','mo_hollowboom','mo_deepmud','mo_lowknock','mo_caveboom']},
  {id:'cont_porcini', icon:'🟤', name:'Continent: Porcini', desc:'Rich mid-range woody percussion. Full-bodied and round. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-820, y:-380, branch:'planets', mult:1.5,
    sounds:['po_woodmid','po_roundbonk','po_treeknock','po_stump','po_logdrum']},
  {id:'cont_oyster', icon:'🦪', name:'Continent: Oyster', desc:'Smooth sliding tones and breathy textures. Airy and wet. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-680, y:-540, branch:'planets', mult:1.5,
    sounds:['oy_breathslide','oy_airblow','oy_wetslap','oy_softbend','oy_shimmer']},
  {id:'cont_reishi', icon:'🪬', name:'Continent: Reishi', desc:'Slow ceremonial gongs and deep drones. Meditative and long decay. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-780, y:-500, branch:'planets', mult:1.5,
    sounds:['re_gong','re_deepdrone','re_ceremony','re_lowbowl','re_resonance']},
  {id:'cont_bella', icon:'✨', name:'Continent: Bella', desc:'Bright snappy accents and quick woody snaps. Punchy and lively. 5 sounds. ×1.5 points.', cost:300, requires:['planet_hyphae'], x:-860, y:-460, branch:'planets', mult:1.5,
    sounds:['be_snap','be_woodsnap','be_brightpop','be_crackle','be_accent']},

  // Hyphae sound nodes (just a few representative ones — full set below)
  {id:'snd_en_tinktap', icon:'🌿', name:'Tink Tap', desc:'A delicate high metallic tap. ×1.5 points.', cost:80, requires:['cont_enoki'], x:-760, y:-540, branch:'planets', mult:1.5, soundUnlock:'en_tinktap'},
  {id:'snd_en_woodtap', icon:'🌿', name:'Wood Tap', desc:'A light woody click from Enoki forests. ×1.5 points.', cost:80, requires:['cont_enoki'], x:-820, y:-560, branch:'planets', mult:1.5, soundUnlock:'en_woodtap'},
  {id:'snd_en_highping', icon:'🌿', name:'High Ping', desc:'A bright metallic ping with quick decay. ×1.5 points.', cost:80, requires:['cont_enoki'], x:-700, y:-590, branch:'planets', mult:1.5, soundUnlock:'en_highping'},
  {id:'snd_en_lightrim', icon:'🌿', name:'Light Rim', desc:'A feather-light rim tap. ×1.5 points.', cost:80, requires:['cont_enoki'], x:-860, y:-520, branch:'planets', mult:1.5, soundUnlock:'en_lightrim'},
  {id:'snd_en_softclick', icon:'🌿', name:'Soft Click', desc:'A barely-there soft click. ×1.5 points.', cost:80, requires:['cont_enoki'], x:-780, y:-600, branch:'planets', mult:1.5, soundUnlock:'en_softclick'},

  {id:'snd_mo_earththud', icon:'🌑', name:'Earth Thud', desc:'A deep hollow earth thud. ×1.5 points.', cost:80, requires:['cont_morel'], x:-840, y:-460, branch:'planets', mult:1.5, soundUnlock:'mo_earththud'},
  {id:'snd_mo_hollowboom', icon:'🌑', name:'Hollow Boom', desc:'A cavernous boom from deep Morel earth. ×1.5 points.', cost:80, requires:['cont_morel'], x:-900, y:-440, branch:'planets', mult:1.5, soundUnlock:'mo_hollowboom'},
  {id:'snd_mo_deepmud', icon:'🌑', name:'Deep Mud', desc:'A thick low muddy thud. ×1.5 points.', cost:80, requires:['cont_morel'], x:-880, y:-390, branch:'planets', mult:1.5, soundUnlock:'mo_deepmud'},
  {id:'snd_mo_lowknock', icon:'🌑', name:'Low Knock', desc:'A heavy low wood knock. ×1.5 points.', cost:80, requires:['cont_morel'], x:-940, y:-420, branch:'planets', mult:1.5, soundUnlock:'mo_lowknock'},
  {id:'snd_mo_caveboom', icon:'🌑', name:'Cave Boom', desc:'A resonant cave boom with long decay. ×1.5 points.', cost:80, requires:['cont_morel'], x:-860, y:-500, branch:'planets', mult:1.5, soundUnlock:'mo_caveboom'},

  // Porcini sounds
  {id:'snd_po_woodmid', icon:'🟤', name:'Wood Mid', desc:'A full-bodied mid-range wood hit. ×1.5 points.', cost:80, requires:['cont_porcini'], x:-900, y:-340, branch:'planets', mult:1.5, soundUnlock:'po_woodmid'},
  {id:'snd_po_roundbonk', icon:'🟤', name:'Round Bonk', desc:'A round resonant bonk. ×1.5 points.', cost:80, requires:['cont_porcini'], x:-960, y:-360, branch:'planets', mult:1.5, soundUnlock:'po_roundbonk'},
  {id:'snd_po_treeknock', icon:'🟤', name:'Tree Knock', desc:'A hollow tree knock with bark resonance. ×1.5 points.', cost:80, requires:['cont_porcini'], x:-1000, y:-310, branch:'planets', mult:1.5, soundUnlock:'po_treeknock'},
  {id:'snd_po_stump', icon:'🟤', name:'Stump Hit', desc:'A heavy stump hit with warm thud. ×1.5 points.', cost:80, requires:['cont_porcini'], x:-940, y:-300, branch:'planets', mult:1.5, soundUnlock:'po_stump'},
  {id:'snd_po_logdrum', icon:'🟤', name:'Log Drum', desc:'A slap on a hollow log drum. ×1.5 points.', cost:80, requires:['cont_porcini'], x:-1000, y:-380, branch:'planets', mult:1.5, soundUnlock:'po_logdrum'},

  // Oyster sounds
  {id:'snd_oy_breathslide', icon:'🦪', name:'Breath Slide', desc:'A breathy sliding exhale. ×1.5 points.', cost:80, requires:['cont_oyster'], x:-740, y:-600, branch:'planets', mult:1.5, soundUnlock:'oy_breathslide'},
  {id:'snd_oy_airblow', icon:'🦪', name:'Air Blow', desc:'A soft air blow with wispy texture. ×1.5 points.', cost:80, requires:['cont_oyster'], x:-800, y:-620, branch:'planets', mult:1.5, soundUnlock:'oy_airblow'},
  {id:'snd_oy_wetslap', icon:'🦪', name:'Wet Slap', desc:'A wet percussive slap. ×1.5 points.', cost:80, requires:['cont_oyster'], x:-860, y:-600, branch:'planets', mult:1.5, soundUnlock:'oy_wetslap'},
  {id:'snd_oy_softbend', icon:'🦪', name:'Soft Bend', desc:'A gentle pitch bend with smooth decay. ×1.5 points.', cost:80, requires:['cont_oyster'], x:-680, y:-630, branch:'planets', mult:1.5, soundUnlock:'oy_softbend'},
  {id:'snd_oy_shimmer', icon:'🦪', name:'Shimmer', desc:'A shimmering high texture. ×1.5 points.', cost:80, requires:['cont_oyster'], x:-920, y:-560, branch:'planets', mult:1.5, soundUnlock:'oy_shimmer'},

  // Reishi sounds
  {id:'snd_re_gong', icon:'🪬', name:'Gong', desc:'A ceremonial gong strike with long sustain. ×1.5 points.', cost:80, requires:['cont_reishi'], x:-860, y:-560, branch:'planets', mult:1.5, soundUnlock:'re_gong'},
  {id:'snd_re_deepdrone', icon:'🪬', name:'Deep Drone', desc:'A low resonant drone from Reishi caves. ×1.5 points.', cost:80, requires:['cont_reishi'], x:-920, y:-540, branch:'planets', mult:1.5, soundUnlock:'re_deepdrone'},
  {id:'snd_re_ceremony', icon:'🪬', name:'Ceremony', desc:'A ritualistic ceremonial strike. ×1.5 points.', cost:80, requires:['cont_reishi'], x:-960, y:-500, branch:'planets', mult:1.5, soundUnlock:'re_ceremony'},
  {id:'snd_re_lowbowl', icon:'🪬', name:'Low Bowl', desc:'A deep singing bowl with slow decay. ×1.5 points.', cost:80, requires:['cont_reishi'], x:-820, y:-590, branch:'planets', mult:1.5, soundUnlock:'re_lowbowl'},
  {id:'snd_re_resonance', icon:'🪬', name:'Resonance', desc:'A pure resonant tone from Reishi crystals. ×1.5 points.', cost:80, requires:['cont_reishi'], x:-960, y:-560, branch:'planets', mult:1.5, soundUnlock:'re_resonance'},

  // Bella sounds
  {id:'snd_be_snap', icon:'✨', name:'Snap', desc:'A bright finger snap. ×1.5 points.', cost:80, requires:['cont_bella'], x:-920, y:-480, branch:'planets', mult:1.5, soundUnlock:'be_snap'},
  {id:'snd_be_woodsnap', icon:'✨', name:'Wood Snap', desc:'A crisp wood snap with quick attack. ×1.5 points.', cost:80, requires:['cont_bella'], x:-980, y:-460, branch:'planets', mult:1.5, soundUnlock:'be_woodsnap'},
  {id:'snd_be_brightpop', icon:'✨', name:'Bright Pop', desc:'A bright poppy accent hit. ×1.5 points.', cost:80, requires:['cont_bella'], x:-1000, y:-430, branch:'planets', mult:1.5, soundUnlock:'be_brightpop'},
  {id:'snd_be_crackle', icon:'✨', name:'Crackle', desc:'A snappy crackle with energy. ×1.5 points.', cost:80, requires:['cont_bella'], x:-960, y:-420, branch:'planets', mult:1.5, soundUnlock:'be_crackle'},
  {id:'snd_be_accent', icon:'✨', name:'Accent', desc:'A punchy accent note from Bella peaks. ×1.5 points.', cost:80, requires:['cont_bella'], x:-1020, y:-490, branch:'planets', mult:1.5, soundUnlock:'be_accent'},

  // Planet 3 — placeholder (branches from Hyphae)
  {id:'planet_3', icon:'🌑', name:'???', desc:'An unknown world detected at the edge of the Tucana system. Coming in a future update.', cost:1000, requires:['planet_hyphae'], x:-900, y:-600, branch:'planets', mult:1.5, placeholder:true},

  // ── QUAD SUN 2 — Point Optimization (↗) ──
  {id:'sun_points', icon:'☀', name:'Quad Sun II', desc:'The second Quad Sun. Opens the Point Optimization path. Grants ×2 points.', cost:150, requires:['core'], x:200, y:-200, branch:'points', mult:2},
  {id:'neural_tap_1', icon:'⚡', name:'Neural Tap I', desc:'Boosts base click value. Each tap is now worth 1.5× more points.', cost:200, requires:['sun_points'], x:340, y:-300, branch:'points', mult:1.5},
  {id:'neural_tap_2', icon:'⚡', name:'Neural Tap II', desc:'Deeper neural calibration. Base click value ×2.', cost:400, requires:['neural_tap_1'], x:480, y:-360, branch:'points', mult:1.5},
  {id:'synaptic_chain', icon:'🧠', name:'Synaptic Chain', desc:'Every 5th click fires a chain reaction worth 5× points.', cost:600, requires:['neural_tap_2'], x:580, y:-460, branch:'points', mult:1.5},
  {id:'quantum_strike', icon:'💥', name:'Quantum Strike', desc:'Quantum-entangled sequencer. Sequencer steps earn +50%.', cost:800, requires:['synaptic_chain'], x:680, y:-540, branch:'points', mult:1.5},
  {id:'singularity', icon:'🌟', name:'Singularity', desc:'The Tucana singularity opens. All point sources permanently ×2.', cost:1200, requires:['quantum_strike'], x:760, y:-620, branch:'points', mult:2},

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

// ── Gem rate calculation ──
function gemsPerMinute(){
  let rate = totalAliens * BASE_GEMS_PER_ALIEN_PER_MIN;
  if(unlockedSkills['gem_harvester_2']) rate *= 2;
  else if(unlockedSkills['gem_harvester_1']) rate *= 1.5;
  return rate;
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
    rateEl.textContent = `(${totalAliens} aliens × ${rate/totalAliens}💎/min = ${rate.toFixed(1)}/min)`;
  }
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
  return node.requires.every(r => !!unlockedSkills[r]); // the Tucana Core itself now has to be bought first (100 gems)
}

// ── Buy skill ──
function buySkill(id){
  const node = SKILL_MAP[id];
  if(!node || unlockedSkills[id]) return;
  if(!skillAvailable(id)) { showToast('Unlock the required skills first!'); return; }
  if(Math.floor(alienGems) < node.cost) { showToast('Not enough Alien Gems!'); return; }
  if(node.placeholder && id !== 'memory_boost') { showToast('🔒 Coming in a future update!'); return; }
  alienGems -= node.cost;
  unlockedSkills[id] = true;
  // Unlock sound if this node grants one
  if(node.soundUnlock) unlockPlanetSound(node.soundUnlock);
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
const SKILL_TREE_COST_STR = '2E25 PTS';
function updateSkillTreeBtn(){
  const btn = document.getElementById('skillTreeUnlockBtn');
  const costEl = document.getElementById('skillTreeUnlockCost');
  if(!btn) return;
  if(skillTreeUnlocked){
    btn.className = 'unlocked';
    btn.querySelector('span').textContent = '🌌 SKILL TREE';
    if(costEl) costEl.textContent = 'OPEN →';
  } else {
    const canAfford = score >= GEM_UNLOCK_COST;
    btn.className = canAfford ? 'can-afford' : '';
    if(costEl) costEl.textContent = `UNLOCK — ${SKILL_TREE_COST_STR}`;
  }
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
    stScale = 1;
    applyStTransform();
  }
}
function closeSkillTree(){
  const modal = document.getElementById('skillTreeModal');
  if(modal) modal.classList.remove('open');
  closeStDetail();
}

function applyStTransform(){
  const inner = document.getElementById('skillTreeInner');
  if(inner) inner.style.transform = `translate(${stPanX}px,${stPanY}px) scale(${stScale})`;
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
    {text:'🪐 PLANET ATLAS', x:-320, y:-80, color:BRANCH_COLORS.planets},
    {text:'⚡ POINT AMP', x:200, y:-80, color:BRANCH_COLORS.points},
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
      (isUnlocked ? ' unlocked' : '') +
      (isAvailable ? ' available' : '') +
      (isSilhouette ? ' silhouette' : '') +
      (!isUnlocked && !isAvailable && !isSilhouette && !isCenter ? ' locked' : '');
    const r = isCenter ? 36 : 27;
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
    costEl.innerHTML = `💎 ${node.cost}`;

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
  const canAfford = Math.floor(alienGems) >= node.cost;
  const isPlaceholder = node.placeholder;

  document.getElementById('stDetailIcon').textContent = node.icon;
  document.getElementById('stDetailName').textContent = node.name;
  document.getElementById('stDetailDesc').textContent = node.desc;
  document.getElementById('stDetailCost').textContent = isUnlocked ? '✓ UNLOCKED' : `💎 ${node.cost} GEMS`;

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
    buyBtn.textContent = `NEED ${node.cost - Math.floor(alienGems)} MORE GEMS`;
    buyBtn.className = '';
    buyBtn.disabled = true;
  } else {
    buyBtn.textContent = `UNLOCK — 💎 ${node.cost}`;
    buyBtn.className = '';
    buyBtn.disabled = false;
  }

  const pop = document.getElementById('stDetailPop');
  pop.classList.add('open');

  // Position near node
  const canvas = document.getElementById('skillTreeCanvas');
  const cr = canvas ? canvas.getBoundingClientRect() : {left:0,top:0,width:window.innerWidth,height:window.innerHeight};
  // Map node coords to screen
  const sx = cr.left + stPanX + node.x * stScale;
  const sy = cr.top + stPanY + node.y * stScale;
  const pw = 340, ph = 320;
  let left = sx - pw/2;
  let top = sy + 50;
  if(left < 8) left = 8;
  if(left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  if(top + ph > window.innerHeight - 8) top = sy - ph - 50;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}
function closeStDetail(){
  document.getElementById('stDetailPop').classList.remove('open');
  _stDetailNode = null;
}

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
        stScale = Math.min(2, Math.max(0.4, stScale * delta));
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
    const newScale = Math.min(2.5, Math.max(0.3, stScale * delta));
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
  if(score < GEM_UNLOCK_COST){ showToast('Not enough points to unlock the Skill Tree!'); return; }
  score -= GEM_UNLOCK_COST;
  skillTreeUnlocked = true;
  renderUI();
  autoSave();
  updateSkillTreeBtn();
  showToast('🌌 Skill Tree unlocked! Find it at the top of the Shop.');
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


// ── "Earn while tab hidden" toggle ──
(function(){
  const t=document.getElementById('settingsEarnHidden');
  if(!t)return;
  t.checked=v5Settings.earnHidden!==false;
  t.addEventListener('change',()=>{
    v5Settings.earnHidden=t.checked;saveV5Settings();
    showToast(t.checked?'🌙 Earning continues while this tab is hidden':'🌙 Earning pauses while this tab is hidden');
  });
})();
