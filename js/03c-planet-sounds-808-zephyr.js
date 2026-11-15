// ══════════════════════════════════════════════
//  PLANET SOUNDS III (v0.2.155) — Planet 808 (drum machine) and Planet Zephyr (woodwinds)
//  Unlocked in the skill tree's Planet Atlas, after Alloy. Each continent is one category of sound.
//  • 808: built the way the real machine makes its sounds — kicks and toms are sine waves whose pitch drops, claps
//    are bursts of filtered noise fired a few times in a row, hi-hats are six square waves at clashing pitches,
//    the cowbell is two square waves (about 540 and 800 Hz).
//  • Zephyr: woodwinds are a tone plus breath. Flutes are nearly pure (with a breathy "chiff" at the start),
//    clarinets use only odd harmonics (their tube is closed at the reed end), double reeds and saxophones get
//    nasal resonances, and the vibrato blooms in after the note starts, the way players do it.
//  Melodic ones follow the KEY and play in the piano roll (PITCHED_SOUNDS at the bottom).
// ══════════════════════════════════════════════
(function(){
  if(typeof PLANET_SOUND_DEFS==='undefined')return;

  // ── synth kit (the same building blocks as js/03b) ──
  function bus(rv){const c=getCtx(),g=c.createGain();g.connect(drumMasterGain);
    if(rv&&rvbNode){const s=c.createGain();s.gain.value=rv;g.connect(s);s.connect(rvbNode);}return g;}
  function mode(t,to,f,a,d,k,type){const c=getCtx(),o=c.createOscillator(),g=c.createGain();k=k||.002;if(type)o.type=type;o.frequency.value=f;o.connect(g);g.connect(to);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+k);g.gain.exponentialRampToValueAtTime(.0005,t+k+d);o.start(t);o.stop(t+k+d+.02);return o;}
  function burst(t,to,type,fc,q,a,d,k){const c=getCtx(),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();k=k||0;
    s.buffer=noiseBuf(d+k+.01);f.type=type;f.frequency.value=fc;f.Q.value=q;s.connect(f);f.connect(g);g.connect(to);
    if(k){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+k);}else g.gain.setValueAtTime(a,t);
    g.gain.exponentialRampToValueAtTime(.001,t+k+d);s.start(t);s.stop(t+k+d+.01);}
  // a pitch that drops into place (808 kicks, toms, congas)
  function drop(t,to,f0,f1,glide,a,d,type){const c=getCtx(),o=c.createOscillator(),g=c.createGain();if(type)o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+glide);o.connect(g);g.connect(to);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.002);g.gain.exponentialRampToValueAtTime(.0005,t+d);o.start(t);o.stop(t+d+.02);return o;}

  // ── 808 pieces ──
  // the long 808 bass: a sine that settles onto its note, a touch of saturation so it's heard on small speakers
  function eoBass(t,G,f,dec,from,glide,drive,lp){const c=getCtx(),o=bus(.06),x=c.createOscillator(),sh=c.createWaveShaper(),f2=c.createBiquadFilter(),g=c.createGain();
    x.frequency.setValueAtTime(from||f*1.25,t);x.frequency.exponentialRampToValueAtTime(f,t+(glide||.04));
    sh.curve=distCurve(drive||1.4);f2.type='lowpass';f2.frequency.value=lp||2400;x.connect(sh);sh.connect(f2);f2.connect(g);g.connect(o);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.8*G,t+.003);g.gain.exponentialRampToValueAtTime(.0005,t+dec);x.start(t);x.stop(t+dec+.03);}
  // hi-hats / cymbals: six square waves at clashing pitches → band-pass → high-pass, like the original circuit
  const METAL=[205.3,304.4,369.6,522.7,540,800];
  function eoMetal(t,G,dec,hp,lvl,rv){const c=getCtx(),o=bus(rv||.08),bp=c.createBiquadFilter(),h=c.createBiquadFilter(),g=c.createGain();
    bp.type='bandpass';bp.frequency.value=9000;bp.Q.value=.8;h.type='highpass';h.frequency.value=hp||7000;bp.connect(h);h.connect(g);g.connect(o);
    METAL.forEach(f=>{const x=c.createOscillator();x.type='square';x.frequency.value=f;x.connect(bp);x.start(t);x.stop(t+dec+.03);});
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime((lvl||.5)*G,t+.001);g.gain.exponentialRampToValueAtTime(.0005,t+dec);}
  // the 808 clap: three quick slaps a few milliseconds apart, then a short noisy tail
  function eoClap(t,G,tail,rv){const o=bus(rv||.15);[0,.011,.023].forEach((d,i)=>burst(t+d,o,'bandpass',1150,1.6,(i===2?2.2:1.6)*G,.012));burst(t+.033,o,'bandpass',1100,1.3,1.45*G,tail||.2);}

  // ── woodwind voice ──
  // o: wave ('sine' | 'triangle' | 'sawtooth' | 'square' | 'odd' = clarinet-style odd harmonics, oddPow to soften),
  //    lp = low-pass, form = [[freq, Q, gain], …] nasal resonances, breath (+ bq = breath filter as a multiple of the note),
  //    chiff = the puff at the start, vib (cents) / vibRate / vibDelay, a = attack, dur, sus, bend (cents to slide up from),
  //    h2 = a little 2nd harmonic, drive = reedy edge, growl = sax growl, lvl, rv
  const _waves={};
  function oddWave(c,pow){const k=pow||1;if(_waves[k]&&_waves[k].c===c)return _waves[k].w;const n=24,re=new Float32Array(n),im=new Float32Array(n);for(let i=1;i<n;i+=2)im[i]=1/Math.pow(i,k);
    const w=c.createPeriodicWave(re,im);_waves[k]={c,w};return w;}
  function wind(t,f,o){
    const c=getCtx(),G=o.G==null?1:o.G,out=bus(o.rv==null?.3:o.rv),dur=o.dur||1,a=o.a||.05,end=t+dur;
    const x=c.createOscillator();if(o.wave==='odd')x.setPeriodicWave(oddWave(c,o.oddPow));else x.type=o.wave||'sine';
    if(o.bend){x.frequency.setValueAtTime(f*Math.pow(2,o.bend/1200),t);x.frequency.exponentialRampToValueAtTime(f,t+(o.bendT||.12));}else x.frequency.value=f;
    const l=c.createOscillator(),lg=c.createGain(),vd=o.vibDelay==null?.22:o.vibDelay;l.frequency.value=o.vibRate||5.2;
    lg.gain.setValueAtTime(0,t);lg.gain.setValueAtTime(0,t+vd);lg.gain.linearRampToValueAtTime(o.vib==null?12:o.vib,t+vd+.3);l.connect(lg);lg.connect(x.detune);
    const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=o.lp||7000;lp.Q.value=.6;x.connect(lp);
    let src=lp;
    if(o.drive){const sh=c.createWaveShaper();sh.curve=distCurve(o.drive);lp.connect(sh);src=sh;}
    const env=c.createGain(),mix=c.createGain();mix.gain.value=o.form?(o.direct==null?.45:o.direct):1;src.connect(mix);mix.connect(env);
    if(o.form)o.form.forEach(([ff,q,gg])=>{const b=c.createBiquadFilter(),bg=c.createGain();b.type='bandpass';b.frequency.value=ff;b.Q.value=q;bg.gain.value=gg;src.connect(b);b.connect(bg);bg.connect(env);});
    const nodes=[x,l];
    if(o.h2){const x2=c.createOscillator(),g2=c.createGain();x2.frequency.value=f*2;g2.gain.value=o.h2;lg.connect(x2.detune);x2.connect(g2);g2.connect(env);nodes.push(x2);}
    if(o.growl){const am=c.createOscillator(),ag=c.createGain(),gg=c.createGain();am.frequency.value=29;ag.gain.value=.45;gg.gain.value=.55;am.connect(ag);ag.connect(gg.gain);env.connect(gg);gg.connect(out);nodes.push(am);}
    else env.connect(out);
    const pk=(o.lvl||.36)*G*1.55,sus=o.sus==null?.8:o.sus;
    env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(pk,t+a);env.gain.linearRampToValueAtTime(pk*sus,t+a+.12);
    env.gain.setValueAtTime(pk*sus,Math.max(t+a+.13,end-(o.rel||.28)));env.gain.exponentialRampToValueAtTime(.0005,end);
    nodes.forEach(n=>{n.start(t);n.stop(end+.03);});
    if(o.breath)burst(t,out,'bandpass',f*(o.bq||2),o.bQ||1.1,o.breath*G,dur-.06,Math.min(.08,a));
    if(o.chiff)burst(t,out,'bandpass',f*(o.chiffAt||3),2.2,o.chiff*G,.045);
  }
  // a quick ornament (grace note) before the main note: whistles, bansuri
  function grace(t,f,f0,o){wind(t,f0,Object.assign({},o,{dur:.07,a:.008,rel:.03,vib:0,breath:0}));wind(t+.06,f,o);}

  const S=[
  // ═════════ PLANET 808 ═════════
  // ── SUBQUAKE: 808 subs and kicks ──
  {id:'eo_kick',name:'Boom Kick',planet:'808',continent:'subquake',color:'#ff5a7a',
   fn:(t,gv)=>{const G=gv??1,o=bus(.05);drop(t,o,165,48,.09,.85*G,.75);burst(t,o,'lowpass',2200,.7,.28*G,.012);}},
  {id:'eo_sub',name:'Long 808',planet:'808',continent:'subquake',color:'#ff3a6a',
   fn:(t,gv)=>{eoBass(t,(gv??1),55,1.9,68,.035,1.5);}},
  {id:'eo_glide',name:'808 Glide',planet:'808',continent:'subquake',color:'#ff4a8a',
   fn:(t,gv)=>{eoBass(t,(gv??1),55,1.5,82.41,.28,1.5);}},
  {id:'eo_dist',name:'Distorted 808',planet:'808',continent:'subquake',color:'#ff2a4a',
   fn:(t,gv)=>{eoBass(t,(gv??1)*.75,55,1.3,72,.03,6,1500);}},
  {id:'eo_punch',name:'Punch Kick',planet:'808',continent:'subquake',color:'#ff7a8a',
   fn:(t,gv)=>{const G=gv??1,o=bus(.05);drop(t,o,240,58,.045,.78*G,.3);burst(t,o,'bandpass',3200,1,.35*G,.008);}},
  // ── CLAPTRAP: snares and claps ──
  {id:'eo_snare',name:'808 Snare',planet:'808',continent:'claptrap',color:'#ffb05a',
   fn:(t,gv)=>{const G=gv??1,o=bus(.12);mode(t,o,180,.42*G,.11);mode(t,o,330,.26*G,.07);burst(t,o,'highpass',1800,.7,.5*G,.18);}},
  {id:'eo_clap',name:'808 Clap',planet:'808',continent:'claptrap',color:'#ffc06a',
   fn:(t,gv)=>{eoClap(t,gv??1,.2);}},
  {id:'eo_rim',name:'Rimshot',planet:'808',continent:'claptrap',color:'#ffd07a',
   fn:(t,gv)=>{const G=gv??1,o=bus(.08);burst(t,o,'bandpass',1700,5,.9*G,.025);mode(t,o,480,.3*G,.03);mode(t,o,1720,.18*G,.02);}},
  {id:'eo_snap',name:'Finger Snap',planet:'808',continent:'claptrap',color:'#ffe08a',
   fn:(t,gv)=>{const G=gv??1,o=bus(.2);burst(t,o,'highpass',2500,.8,.9*G,.03);mode(t,o,1900,.12*G,.025);}},
  {id:'eo_bigclap',name:'Stadium Clap',planet:'808',continent:'claptrap',color:'#ffa04a',
   fn:(t,gv)=>{eoClap(t,(gv??1)*1.1,.38,.7);}},
  // ── HATSTACK: hi-hats and cymbals ──
  {id:'eo_chh',name:'Closed Hat',planet:'808',continent:'hatstack',color:'#7affd0',
   fn:(t,gv)=>{eoMetal(t,gv??1,.05,7200,.55);}},
  {id:'eo_ohh',name:'Open Hat',planet:'808',continent:'hatstack',color:'#5af0c0',
   fn:(t,gv)=>{eoMetal(t,gv??1,.4,6800,.42);}},
  {id:'eo_roll',name:'Hat Roll',planet:'808',continent:'hatstack',color:'#9affe0',
   fn:(t,gv)=>{const G=gv??1;for(let i=0;i<6;i++)eoMetal(t+i*.042,G*(.55+.13*i),.035,7400+i*150,.55);}},
  {id:'eo_pedal',name:'Pedal Hat',planet:'808',continent:'hatstack',color:'#6ae8c8',
   fn:(t,gv)=>{const G=gv??1;eoMetal(t,G*.9,.03,6000,.6);burst(t,bus(.05),'bandpass',1200,1.5,.12*G,.02);}},
  {id:'eo_cymbal',name:'808 Cymbal',planet:'808',continent:'hatstack',color:'#4ad8b0',
   fn:(t,gv)=>{eoMetal(t,gv??1,1.4,5200,.35,.25);}},
  // ── TOMTOM: toms and congas ──
  {id:'eo_tomlo',name:'Low Tom',planet:'808',continent:'tomtom',color:'#a07aff',
   fn:(t,gv)=>{const G=gv??1,o=bus(.12);drop(t,o,122,85,.11,.75*G,.55);burst(t,o,'lowpass',900,.7,.12*G,.02);}},
  {id:'eo_tommid',name:'Mid Tom',planet:'808',continent:'tomtom',color:'#b08aff',
   fn:(t,gv)=>{const G=gv??1,o=bus(.12);drop(t,o,175,125,.1,.7*G,.45);burst(t,o,'lowpass',1200,.7,.12*G,.02);}},
  {id:'eo_tomhi',name:'High Tom',planet:'808',continent:'tomtom',color:'#c09aff',
   fn:(t,gv)=>{const G=gv??1,o=bus(.12);drop(t,o,250,180,.09,.65*G,.35);burst(t,o,'lowpass',1600,.7,.12*G,.018);}},
  {id:'eo_congahi',name:'High Conga',planet:'808',continent:'tomtom',color:'#d0aaff',
   fn:(t,gv)=>{const G=gv??1,o=bus(.12);drop(t,o,410,345,.03,.6*G,.18);}},
  {id:'eo_congalo',name:'Low Conga',planet:'808',continent:'tomtom',color:'#9068f0',
   fn:(t,gv)=>{const G=gv??1,o=bus(.12);drop(t,o,290,240,.035,.65*G,.24);}},
  // ── COWBELLA: cowbell, claves, maracas and blips ──
  {id:'eo_cowbell',name:'808 Cowbell',planet:'808',continent:'cowbella',color:'#ffe05a',
   fn:(t,gv)=>{const c=getCtx(),G=gv??1,o=bus(.12),bp=c.createBiquadFilter(),g=c.createGain();bp.type='bandpass';bp.frequency.value=850;bp.Q.value=1.4;bp.connect(g);g.connect(o);
     [540,800].forEach(f=>{const x=c.createOscillator();x.type='square';x.frequency.value=f;x.connect(bp);x.start(t);x.stop(t+.42);});
     g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*G,t+.002);g.gain.exponentialRampToValueAtTime(.16*G,t+.05);g.gain.exponentialRampToValueAtTime(.0005,t+.4);}},
  {id:'eo_clave',name:'808 Clave',planet:'808',continent:'cowbella',color:'#fff07a',
   fn:(t,gv)=>{const G=gv??1;mode(t,bus(.15),2500,.5*G,.045);}},
  {id:'eo_maracas',name:'Maracas',planet:'808',continent:'cowbella',color:'#f8e8a0',
   fn:(t,gv)=>{const G=gv??1;burst(t,bus(.1),'highpass',6000,.7,.6*G,.045);}},
  {id:'eo_zap',name:'Laser Zap',planet:'808',continent:'cowbella',color:'#ffd040',
   fn:(t,gv)=>{const G=gv??1,o=bus(.2);drop(t,o,1600,90,.16,.4*G,.22,'triangle');}},
  {id:'eo_blip',name:'Blip',planet:'808',continent:'cowbella',color:'#ffe890',
   fn:(t,gv)=>{const c=getCtx(),G=gv??1,o=bus(.25),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=3000;f.connect(o);mode(t,f,1046.5,.45*G,.09,.002,'square');}},

  // ═════════ PLANET ZEPHYR (woodwinds) ═════════
  // ── FLUTERRA: flutes (no reed: air splits on an edge) ──
  {id:'zp_flute',name:'Concert Flute',planet:'zephyr',continent:'fluterra',color:'#bfe8ff',
   fn:(t,gv)=>wind(t,523.25,{G:gv??1,wave:'sine',h2:.1,breath:.1,bq:2.2,chiff:.12,vib:14,a:.06,dur:1.1,lvl:.4})},
  {id:'zp_piccolo',name:'Piccolo',planet:'zephyr',continent:'fluterra',color:'#d8f2ff',
   fn:(t,gv)=>wind(t,1046.5,{G:gv??1,wave:'sine',h2:.05,breath:.07,bq:1.6,chiff:.1,chiffAt:2,vib:12,vibRate:5.8,a:.04,dur:.85,lvl:.26})},
  {id:'zp_altoflute',name:'Alto Flute',planet:'zephyr',continent:'fluterra',color:'#a8d8f8',
   fn:(t,gv)=>wind(t,392,{G:gv??1,wave:'sine',h2:.14,breath:.16,bq:2.6,chiff:.1,vib:12,vibRate:4.8,a:.08,dur:1.25,lvl:.42})},
  {id:'zp_recorder',name:'Recorder',planet:'zephyr',continent:'fluterra',color:'#e8f4ff',
   fn:(t,gv)=>wind(t,587.33,{G:gv??1,wave:'triangle',lp:2600,breath:.04,chiff:.2,chiffAt:4,vib:5,a:.03,dur:.9,lvl:.32})},
  {id:'zp_whistle',name:'Tin Whistle',planet:'zephyr',continent:'fluterra',color:'#c8f0ff',
   fn:(t,gv)=>grace(t,1174.66,1318.51,{G:gv??1,wave:'sine',h2:.06,breath:.06,bq:1.8,chiff:.1,chiffAt:2,vib:16,vibRate:6,a:.02,dur:.8,lvl:.24})},
  // ── CLARION: clarinets (one reed, odd harmonics) ──
  {id:'zp_clarinet',name:'Clarinet',planet:'zephyr',continent:'clarion',color:'#8ab8ff',
   fn:(t,gv)=>wind(t,293.66,{G:gv??1,wave:'odd',oddPow:1.25,lp:2400,breath:.03,bq:4,vib:6,a:.05,dur:1.1,lvl:.36})},
  {id:'zp_bassclar',name:'Bass Clarinet',planet:'zephyr',continent:'clarion',color:'#6a98e8',
   fn:(t,gv)=>wind(t,97.99,{G:gv??1,wave:'odd',oddPow:1.1,lp:1100,breath:.03,bq:8,vib:4,a:.06,dur:1.3,lvl:.38,rv:.2})},
  {id:'zp_chalumeau',name:'Low Clarinet',planet:'zephyr',continent:'clarion',color:'#7aa8f0',
   fn:(t,gv)=>wind(t,164.81,{G:gv??1,wave:'odd',oddPow:1.35,lp:900,breath:.03,bq:6,vib:5,a:.06,dur:1.2,lvl:.45})},
  {id:'zp_ebclar',name:'Little Clarinet',planet:'zephyr',continent:'clarion',color:'#9ac8ff',
   fn:(t,gv)=>wind(t,783.99,{G:gv??1,wave:'odd',oddPow:1.3,lp:4200,breath:.03,bq:3,vib:8,a:.035,dur:.9,lvl:.24})},
  {id:'zp_trill',name:'Clarinet Trill',planet:'zephyr',continent:'clarion',color:'#a8d0ff',
   fn:(t,gv)=>{const G=gv??1;for(let i=0;i<10;i++)wind(t+i*.065,i%2?587.33:523.25,{G:G*.9,wave:'odd',oddPow:1.25,lp:3000,vib:0,a:.012,rel:.03,sus:1,dur:.075,lvl:.28,rv:.25});}},
  // ── REEDWOOD: double reeds (two reeds buzzing together: a nasal, singing tone) ──
  {id:'zp_oboe',name:'Oboe',planet:'zephyr',continent:'reedwood',color:'#f0c88a',
   fn:(t,gv)=>wind(t,440,{G:gv??1,wave:'sawtooth',lp:4500,form:[[1400,4,1.1],[3000,4,.6]],direct:.25,breath:.02,vib:9,vibRate:5.4,a:.04,dur:1.05,lvl:.42})},
  {id:'zp_cor',name:'English Horn',planet:'zephyr',continent:'reedwood',color:'#e0b070',
   fn:(t,gv)=>wind(t,329.63,{G:gv??1,wave:'sawtooth',lp:3200,form:[[1000,3.5,1.1],[2300,4,.45]],direct:.3,breath:.02,vib:8,vibRate:5,a:.06,dur:1.2,lvl:.42})},
  {id:'zp_bassoon',name:'Bassoon',planet:'zephyr',continent:'reedwood',color:'#c89458',
   fn:(t,gv)=>wind(t,116.54,{G:gv??1,wave:'sawtooth',lp:1500,form:[[480,3,1.2],[1200,3,.4]],direct:.35,breath:.02,vib:5,a:.06,dur:1.2,lvl:.4})},
  {id:'zp_contra',name:'Contrabassoon',planet:'zephyr',continent:'reedwood',color:'#a87840',
   fn:(t,gv)=>wind(t,58.27,{G:gv??1,wave:'sawtooth',lp:800,form:[[260,2.5,1.2],[700,3,.4]],direct:.4,vib:3,a:.08,dur:1.4,lvl:.38,rv:.15})},
  {id:'zp_duduk',name:'Duduk',planet:'zephyr',continent:'reedwood',color:'#d8a060',
   fn:(t,gv)=>wind(t,293.66,{G:gv??1,wave:'sawtooth',lp:1800,form:[[900,3,1.2],[1900,4,.35]],direct:.3,breath:.05,bq:3,vib:16,vibRate:4.2,vibDelay:.35,a:.18,bend:-60,bendT:.25,dur:1.6,lvl:.36,rv:.45})},
  // ── SAXONY: saxophones (brass body, reed voice) ──
  {id:'zp_sopsax',name:'Soprano Sax',planet:'zephyr',continent:'saxony',color:'#ffd27a',
   fn:(t,gv)=>wind(t,466.16,{G:gv??1,wave:'sawtooth',lp:3600,form:[[1800,3,.8],[3200,4,.4]],direct:.45,drive:1.6,breath:.03,vib:12,vibRate:5.6,a:.04,bend:-40,bendT:.06,dur:1,lvl:.24})},
  {id:'zp_altosax',name:'Alto Sax',planet:'zephyr',continent:'saxony',color:'#f8c060',
   fn:(t,gv)=>wind(t,311.13,{G:gv??1,wave:'sawtooth',lp:3000,form:[[1300,3,.9],[2600,4,.4]],direct:.45,drive:1.8,breath:.035,vib:13,vibRate:5.2,a:.05,bend:-50,bendT:.07,dur:1.1,lvl:.38})},
  {id:'zp_tenorsax',name:'Tenor Sax',planet:'zephyr',continent:'saxony',color:'#e8aa48',
   fn:(t,gv)=>wind(t,233.08,{G:gv??1,wave:'sawtooth',lp:2400,form:[[900,3,1],[2200,4,.35]],direct:.45,drive:2,breath:.04,vib:12,vibRate:5,a:.05,bend:-55,bendT:.08,dur:1.2,lvl:.4})},
  {id:'zp_barisax',name:'Baritone Sax',planet:'zephyr',continent:'saxony',color:'#d09038',
   fn:(t,gv)=>wind(t,155.56,{G:gv??1,wave:'sawtooth',lp:1700,form:[[600,3,1.1],[1500,4,.35]],direct:.5,drive:2.2,breath:.035,vib:9,a:.05,dur:1.2,lvl:.34})},
  {id:'zp_growl',name:'Sax Growl',planet:'zephyr',continent:'saxony',color:'#ffb040',
   fn:(t,gv)=>wind(t,233.08,{G:gv??1,wave:'sawtooth',lp:2600,form:[[900,3,1],[2200,4,.4]],direct:.5,drive:4,growl:1,breath:.05,vib:0,a:.04,bend:-120,bendT:.1,dur:.9,lvl:.32})},
  // ── WINDLANDS: winds from around the world ──
  {id:'zp_shaku',name:'Shakuhachi',planet:'zephyr',continent:'windlands',color:'#a0e8c0',
   fn:(t,gv)=>wind(t,293.66,{G:gv??1,wave:'sine',h2:.12,breath:.3,bq:2.4,bQ:.9,chiff:.18,vib:22,vibRate:4,vibDelay:.4,a:.1,bend:-100,bendT:.3,dur:1.6,lvl:.36,rv:.5})},
  {id:'zp_ocarina',name:'Ocarina',planet:'zephyr',continent:'windlands',color:'#e8d0a0',
   fn:(t,gv)=>wind(t,523.25,{G:gv??1,wave:'sine',breath:.04,bq:2,chiff:.06,vib:8,vibRate:5.5,a:.05,dur:1,lvl:.28})},
  {id:'zp_bansuri',name:'Bansuri',planet:'zephyr',continent:'windlands',color:'#c8f0a8',
   fn:(t,gv)=>grace(t,440,493.88,{G:gv??1,wave:'sine',h2:.1,breath:.16,bq:2.3,chiff:.08,vib:18,vibRate:5,vibDelay:.3,a:.06,dur:1.3,lvl:.38,rv:.45})},
  {id:'zp_bagpipe',name:'Bagpipes',planet:'zephyr',continent:'windlands',color:'#b8a070',
   fn:(t,gv)=>{const G=(gv??1)*1.8,o={G,wave:'sawtooth',lp:2000,form:[[1200,3,.9]],direct:.5,vib:0,a:.08,dur:1.6,lvl:.16,rv:.3};
     wind(t,440,Object.assign({},o,{lvl:.2}));wind(t,220,Object.assign({},o,{lp:900,lvl:.15}));wind(t,110,Object.assign({},o,{lp:600,lvl:.18}));}},
  {id:'zp_hulusi',name:'Hulusi',planet:'zephyr',continent:'windlands',color:'#a8d8a0',
   fn:(t,gv)=>wind(t,392,{G:gv??1,wave:'odd',oddPow:1.6,lp:1800,breath:.05,bq:3,vib:14,vibRate:5,a:.07,dur:1.2,lvl:.36})},
  ];
  S.forEach(s=>PLANET_SOUND_DEFS.push(s));

  // melodic ones follow the KEY (roll:1 = playable in the piano roll / on Buddy Keys)
  if(typeof PITCHED_SOUNDS!=='undefined'){
    const N=(f,roll)=>roll?{f,r:'note',roll:1}:{f,r:'note'},B=(f,roll)=>roll?{f,r:'bass',roll:1}:{f,r:'bass'};
    Object.assign(PITCHED_SOUNDS,{
      eo_sub:B(55,1),eo_glide:B(55),eo_dist:B(55,1),eo_tomlo:N(85),eo_tommid:N(125),eo_tomhi:N(180),eo_congahi:N(345),eo_congalo:N(240),eo_blip:N(1046.5,1),
      zp_flute:N(523.25,1),zp_piccolo:N(1046.5,1),zp_altoflute:N(392,1),zp_recorder:N(587.33,1),zp_whistle:N(1174.66,1),
      zp_clarinet:N(293.66,1),zp_bassclar:B(97.99,1),zp_chalumeau:N(164.81,1),zp_ebclar:N(783.99,1),zp_trill:N(523.25),
      zp_oboe:N(440,1),zp_cor:N(329.63,1),zp_bassoon:N(116.54,1),zp_contra:B(58.27,1),zp_duduk:N(293.66,1),
      zp_sopsax:N(466.16,1),zp_altosax:N(311.13,1),zp_tenorsax:N(233.08,1),zp_barisax:N(155.56,1),zp_growl:N(233.08),
      zp_shaku:N(293.66,1),zp_ocarina:N(523.25,1),zp_bansuri:N(440,1),zp_bagpipe:N(440),zp_hulusi:N(392,1),
    });
  }
})();
