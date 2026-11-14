// ══════════════════════════════════════════════
//  PLANET SOUNDS II — Planet Timbra (wood) and Planet Alloy (steel)
//  Unlocked in the skill tree (Planet Atlas). Each continent is one family of instruments.
//  Struck instruments are built from their real partials (a marimba bar rings at about 1×, 4× and 10× its note,
//  a steel pan at 1×, 2× and 3×, a metal pipe at 1×, 2.76×, 5.40×…), so they sound like the real thing and
//  follow the KEY / piano roll like the other melodic sounds (see PITCHED_SOUNDS at the bottom).
// ══════════════════════════════════════════════
(function(){
  if(typeof PLANET_SOUND_DEFS==='undefined')return;

  // ── a little synth kit ──
  // Everything reads drumMasterGain / rvbNode at the moment the sound plays: the effects rack and the piano roll swap them.
  function bus(rv){const c=getCtx(),g=c.createGain();g.connect(drumMasterGain);
    if(rv&&rvbNode){const s=c.createGain();s.gain.value=rv;g.connect(s);s.connect(rvbNode);}return g;}
  // one ringing partial: f Hz, peak a, d = seconds to fade away, k = attack time
  function mode(t,to,f,a,d,k,type){const c=getCtx(),o=c.createOscillator(),g=c.createGain();k=k||.002;if(type)o.type=type;o.frequency.value=f;o.connect(g);g.connect(to);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+k);g.gain.exponentialRampToValueAtTime(.0005,t+k+d);o.start(t);o.stop(t+k+d+.02);return o;}
  // a filtered noise burst: mallet clicks, scrapes, jingles, breath, hiss (k = optional fade-in)
  function burst(t,to,type,fc,q,a,d,k){const c=getCtx(),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();k=k||0;
    s.buffer=noiseBuf(d+k+.01);f.type=type;f.frequency.value=fc;f.Q.value=q;s.connect(f);f.connect(g);g.connect(to);
    if(k){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+k);}else g.gain.setValueAtTime(a,t);
    g.gain.exponentialRampToValueAtTime(.001,t+k+d);s.start(t);s.stop(t+k+d+.01);}
  // a struck bar / pan / bell: parts = [[ratio, amp, decay], …]
  function strike(t,to,f,parts,G,k){parts.forEach(p=>mode(t,to,f*p[0],p[1]*G,p[2],k));}
  // a pitch that drops into place (bamboo tubes, drums, kettle gongs)
  function drop(t,to,f0,f1,glide,a,d){const c=getCtx(),o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+glide);o.connect(g);g.connect(to);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.003);g.gain.exponentialRampToValueAtTime(.0005,t+d);o.start(t);o.stop(t+d+.02);}
  // steel pan: the note plus its octave and twelfth (pan tuners tune those too); the octave blooms a moment after the hit
  function steelpan(t,G,f,dec,bright,rv){const o=bus(rv);
    mode(t,o,f,.42*G,dec,.004);mode(t,o,f*2.003,.2*G*bright,dec*.6,.018);mode(t,o,f*3.006,.08*G*bright,dec*.35,.01);mode(t,o,f*4.02,.03*G*bright,.12,.003);
    burst(t,o,'lowpass',1400,.7,.07*G,.012);}
  const pick=a=>a[Math.floor(Math.random()*a.length)];

  const S=[
  // ═════════ PLANET TIMBRA (wood) ═════════
  // ── ROSEWOOD: mallet instruments ──
  {id:'rw_marimba',name:'Warm Marimba',planet:'timbra',continent:'rosewood',color:'#e8977a',
   fn:(t,gv)=>{const G=gv??1,o=bus(.22);strike(t,o,261.63,[[1,.62,1.1],[3.93,.13,.24],[9.2,.035,.07]],G,.003);burst(t,o,'lowpass',1100,.7,.1*G,.025);}},
  {id:'rw_xylo',name:'Xylophone',planet:'timbra',continent:'rosewood',color:'#f2b48a',
   fn:(t,gv)=>{const G=gv??1,o=bus(.2);strike(t,o,783.99,[[1,.45,.5],[3,.17,.14],[6.1,.05,.05]],G,.0015);burst(t,o,'bandpass',3600,1.2,.16*G,.01);}},
  {id:'rw_balafon',name:'Balafon',planet:'timbra',continent:'rosewood',color:'#dca468',
   fn:(t,gv)=>{const c=getCtx(),G=gv??1,o=bus(.18);strike(t,o,329.63,[[1,.5,.75],[4,.1,.2]],G,.003);
     // the gourd under each bar has a thin membrane that buzzes along with the note
     const b=c.createOscillator(),sh=c.createWaveShaper(),bf=c.createBiquadFilter(),bg=c.createGain();b.type='sawtooth';b.frequency.value=329.63;sh.curve=distCurve(4);
     bf.type='bandpass';bf.frequency.value=1800;bf.Q.value=1.2;b.connect(sh);sh.connect(bf);bf.connect(bg);bg.connect(o);
     bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(.07*G,t+.01);bg.gain.exponentialRampToValueAtTime(.001,t+.35);b.start(t);b.stop(t+.37);
     burst(t,o,'lowpass',1400,.7,.1*G,.02);}},
  {id:'rw_bass',name:'Bass Marimba',planet:'timbra',continent:'rosewood',color:'#c0715a',
   fn:(t,gv)=>{const G=(gv??1)*0.85,o=bus(.12);strike(t,o,87.31,[[1,.75,1.3],[4,.16,.3],[10,.03,.06]],G,.004);burst(t,o,'lowpass',500,.7,.18*G,.03);}},
  {id:'rw_roll',name:'Marimba Roll',planet:'timbra',continent:'rosewood',color:'#f0aa80',
   fn:(t,gv)=>{const G=(gv??1)*1.4,o=bus(.25),n=8;for(let i=0;i<n;i++){const e=Math.sin((i+.6)/n*Math.PI)*(i%2?.8:1);strike(t+i*.07,o,392,[[1,.36*e,.4],[3.93,.07*e,.1]],G,.004);}}},

  // ── BAMBOO ──
  {id:'bm_tick',name:'Bamboo Tick',planet:'timbra',continent:'bamboo',color:'#c8e08a',
   fn:(t,gv)=>{const G=(gv??1)*2.5,o=bus(.15);burst(t,o,'bandpass',1350,14,1.6*G,.06);burst(t,o,'bandpass',3150,10,.5*G,.035);mode(t,o,1350,.12*G,.05,.001);}},
  {id:'bm_angklung',name:'Angklung',planet:'timbra',continent:'bamboo',color:'#d8ea9a',
   fn:(t,gv)=>{const G=(gv??1)*1.5,o=bus(.22);for(let i=0;i<9;i++){const st=t+i*.056,e=(i<2?.6+i*.2:1)*Math.pow(.8,Math.max(0,i-1));
     strike(st,o,523.25,[[1,.28*e,.16],[2,.16*e,.12],[3.02,.04*e,.05]],G,.002);burst(st,o,'bandpass',2600,3,.05*G*e,.012);}}},
  {id:'bm_stamp',name:'Stamp Tube',planet:'timbra',continent:'bamboo',color:'#b0c870',
   fn:(t,gv)=>{const G=gv??1,o=bus(.15);drop(t,o,245,196,.03,.62*G,.42);mode(t,o,196*2.6,.08*G,.08);burst(t,o,'lowpass',380,.8,.35*G,.05);}},
  {id:'bm_chimes',name:'Bamboo Chimes',planet:'timbra',continent:'bamboo',color:'#e2f2b4',
   fn:(t,gv)=>{const G=(gv??1)*1.8,o=bus(.3),P=[740,880,988,1175,1319];[0,.08,.17,.23,.36,.5].forEach((d,i)=>{const st=t+d+Math.random()*.03,e=(1-i*.1)*(.7+Math.random()*.3);
     strike(st,o,pick(P),[[1,.2*e,.14],[2.4,.06*e,.05]],G,.001);burst(st,o,'bandpass',2600,2,.1*G*e,.012);});}},
  {id:'bm_rain',name:'Rain Stick',planet:'timbra',continent:'bamboo',color:'#a8d4a0',
   fn:(t,gv)=>{const c=getCtx(),G=(gv??1)*1.5,o=bus(.2),dur=1.6,sr=c.sampleRate,L=Math.round(sr*dur),b=c.createBuffer(1,L,sr),d=b.getChannelData(0);
     // hundreds of tiny pebbles falling through the tube: busy at first, thinning out as they settle
     for(let k=0;k<420;k++){const p=Math.pow(Math.random(),1.7),i0=Math.floor(p*(L-80)),a=(.3+Math.random()*.7)*(1-p*.6);for(let j=0;j<40;j++)d[i0+j]+=(Math.random()*2-1)*a*Math.exp(-j/7);}
     const s=c.createBufferSource(),h=c.createBiquadFilter(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;h.type='highpass';h.frequency.value=1400;f.type='bandpass';f.frequency.value=4200;f.Q.value=.8;
     s.connect(h);h.connect(f);f.connect(g);g.connect(o);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55*G,t+.12);g.gain.setValueAtTime(.55*G,t+1.1);g.gain.linearRampToValueAtTime(0,t+dur);s.start(t);s.stop(t+dur);}},

  // ── OAK: big wooden drums ──
  {id:'ok_slit',name:'Slit Drum',planet:'timbra',continent:'oak',color:'#c89464',
   fn:(t,gv)=>{const G=gv??1,o=bus(.2);strike(t,o,220,[[1,.6,.6],[2.32,.13,.2],[3.6,.04,.07]],G,.004);burst(t,o,'lowpass',800,.7,.14*G,.025);}},
  {id:'ok_cajonbass',name:'Cajón Bass',planet:'timbra',continent:'oak',color:'#a8724a',
   fn:(t,gv)=>{const G=gv??1,o=bus(.06);drop(t,o,125,62,.08,.8*G,.34);mode(t,o,182,.16*G,.12);burst(t,o,'lowpass',320,.7,.3*G,.04);}},
  {id:'ok_cajonslap',name:'Cajón Slap',planet:'timbra',continent:'oak',color:'#d4a472',
   fn:(t,gv)=>{const G=gv??1,o=bus(.12);mode(t,o,330,.3*G,.08,.001,'triangle');burst(t,o,'bandpass',3200,.8,.55*G,.17);burst(t,o,'highpass',6000,.7,.2*G,.05);}},
  {id:'ok_temple',name:'Temple Block',planet:'timbra',continent:'oak',color:'#e2b474',
   fn:(t,gv)=>{const G=gv??1,o=bus(.18);strike(t,o,587.33,[[1,.5,.14],[2.47,.16,.05]],G,.0015);burst(t,o,'bandpass',2100,1.5,.18*G,.008);}},
  {id:'ok_thump',name:'Oak Thump',planet:'timbra',continent:'oak',color:'#9c6444',
   fn:(t,gv)=>{const G=gv??1,o=bus(0);drop(t,o,150,48,.12,.9*G,.38);mode(t,o,285,.22*G,.06,.001,'triangle');burst(t,o,'lowpass',1500,.7,.25*G,.015);}},

  // ── EBONY: little hand percussion ──
  {id:'eb_claves',name:'Claves',planet:'timbra',continent:'ebony',color:'#ecca9a',
   fn:(t,gv)=>{const G=gv??1,o=bus(.15);strike(t,o,2480,[[1,.42,.1],[2.71,.05,.03]],G,.0008);burst(t,o,'highpass',5000,.7,.12*G,.006);}},
  {id:'eb_castanets',name:'Castanets',planet:'timbra',continent:'ebony',color:'#d4b28a',
   fn:(t,gv)=>{const G=(gv??1)*1.6,o=bus(.1);[[0,1],[.026,.7],[.05,.85]].forEach(([d,e])=>{burst(t+d,o,'bandpass',2900,3,.9*G*e,.022);mode(t+d,o,1950,.1*G*e,.03,.0008);});}},
  {id:'eb_guiro',name:'Güiro',planet:'timbra',continent:'ebony',color:'#ccaa7a',
   fn:(t,gv)=>{const G=(gv??1)*2,o=bus(.08);let d=0;for(let i=0;i<15;i++){const e=Math.sin((i+1)/16*Math.PI)*.8+.2;burst(t+d,o,'bandpass',2500+i*40,2.5,.75*G*e,.014);d+=.019-i*.0005;}}},
  {id:'eb_slap',name:'Slapstick',planet:'timbra',continent:'ebony',color:'#f2daaa',
   fn:(t,gv)=>{const G=(gv??1)*0.75,o=bus(.2);burst(t,o,'highpass',1600,.7,.8*G,.07);burst(t,o,'bandpass',1150,2,.5*G,.045);mode(t,o,920,.15*G,.03,.0008);}},
  {id:'eb_tok',name:'Wood Tok',planet:'timbra',continent:'ebony',color:'#e2c292',
   fn:(t,gv)=>{const G=gv??1,o=bus(.15);strike(t,o,1567.98,[[1,.45,.075],[2.8,.1,.025]],G,.0008);burst(t,o,'bandpass',3500,1.5,.12*G,.006);}},

  // ── CEDAR: wooden winds and drones ──
  {id:'cd_flute',name:'Cedar Flute',planet:'timbra',continent:'cedar',color:'#f2ba7a',
   fn:(t,gv)=>{const c=getCtx(),G=gv??1,o=bus(.3),x=c.createOscillator(),x2=c.createOscillator(),l=c.createOscillator(),lg=c.createGain(),g=c.createGain(),g2=c.createGain();
     x.frequency.value=392;x2.type='triangle';x2.frequency.value=784;l.frequency.value=5;   // a gentle vibrato that grows into the note
     lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(14,t+.4);l.connect(lg);lg.connect(x.detune);lg.connect(x2.detune);
     x.connect(g);x2.connect(g2);g2.gain.value=.12;g2.connect(g);g.connect(o);
     g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.42*G,t+.07);g.gain.setValueAtTime(.42*G,t+.45);g.gain.exponentialRampToValueAtTime(.0005,t+.95);
     [x,x2,l].forEach(n=>{n.start(t);n.stop(t+.97);});burst(t,o,'bandpass',800,2.5,.12*G,.75,.06);}},
  {id:'cd_panpipe',name:'Pan Pipe',planet:'timbra',continent:'cedar',color:'#eac282',
   fn:(t,gv)=>{const G=gv??1,o=bus(.32);mode(t,o,523.25,.4*G,.75,.035);mode(t,o,1046.5,.05*G,.4,.03);burst(t,o,'bandpass',1700,2,.25*G,.06,.004);burst(t,o,'bandpass',1046,4,.08*G,.5,.05);}},
  {id:'cd_didge',name:'Didgeridoo',planet:'timbra',continent:'cedar',color:'#c88a52',
   fn:(t,gv)=>{const c=getCtx(),G=gv??1,o=bus(.1),x=c.createOscillator(),lp=c.createBiquadFilter(),f1=c.createBiquadFilter(),f2=c.createBiquadFilter(),dr=c.createGain(),g=c.createGain();
     x.type='sawtooth';x.frequency.value=73.42;lp.type='lowpass';lp.frequency.value=1800;
     f1.type='bandpass';f1.Q.value=4;f1.frequency.setValueAtTime(380,t);f1.frequency.linearRampToValueAtTime(950,t+.45);f1.frequency.linearRampToValueAtTime(420,t+1.05);   // the "wow" of the player's mouth
     f2.type='bandpass';f2.Q.value=3;f2.frequency.value=1600;dr.gain.value=.35;
     x.connect(lp);lp.connect(dr);dr.connect(g);lp.connect(f1);f1.connect(g);lp.connect(f2);f2.connect(g);g.connect(o);
     g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.7*G,t+.06);g.gain.setValueAtTime(.7*G,t+.8);g.gain.exponentialRampToValueAtTime(.0005,t+1.15);x.start(t);x.stop(t+1.17);}},
  {id:'cd_owl',name:'Owl Hoot',planet:'timbra',continent:'cedar',color:'#dcaa72',
   fn:(t,gv)=>{const c=getCtx(),G=gv??1,o=bus(.3);[[0,.16,1],[.26,.3,.85]].forEach(([d,len,e])=>{const x=c.createOscillator(),g=c.createGain(),st=t+d;
     x.frequency.setValueAtTime(410,st);x.frequency.linearRampToValueAtTime(440,st+len*.3);x.frequency.exponentialRampToValueAtTime(370,st+len);x.connect(g);g.connect(o);
     g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(.4*G*e,st+.04);g.gain.setValueAtTime(.4*G*e,st+len*.6);g.gain.exponentialRampToValueAtTime(.0005,st+len+.08);x.start(st);x.stop(st+len+.1);
     burst(st,o,'bandpass',900,3,.06*G*e,len,.03);});}},
  {id:'cd_creak',name:'Wood Creak',planet:'timbra',continent:'cedar',color:'#b8926a',
   fn:(t,gv)=>{const G=(gv??1)*8,o=bus(.15);let d=0;for(let i=0;i<26;i++){const p=i/25,e=Math.sin(p*Math.PI)*.85+.15;burst(t+d,o,'bandpass',650+p*250,7,.9*G*e,.018);burst(t+d,o,'bandpass',1500,5,.3*G*e,.012);d+=.022+.02*Math.sin(p*Math.PI*1.3);}}},

  // ═════════ PLANET ALLOY (steel) ═════════
  // ── CHROME: steel pans, high to low ──
  {id:'cr_tenor',name:'Tenor Pan',planet:'alloy',continent:'chrome',color:'#a8dcff',fn:(t,gv)=>steelpan(t,gv??1,523.25,1.0,1,.25)},
  {id:'cr_double',name:'Double Second',planet:'alloy',continent:'chrome',color:'#94ccf4',fn:(t,gv)=>steelpan(t,gv??1,349.23,1.15,1,.25)},
  {id:'cr_guitar',name:'Guitar Pan',planet:'alloy',continent:'chrome',color:'#86bfea',fn:(t,gv)=>steelpan(t,gv??1,220,1.25,1.1,.2)},
  {id:'cr_cello',name:'Cello Pan',planet:'alloy',continent:'chrome',color:'#78b0de',fn:(t,gv)=>steelpan(t,gv??1,146.83,1.35,1.25,.18)},
  {id:'cr_bass',name:'Bass Pan',planet:'alloy',continent:'chrome',color:'#6aa0d0',fn:(t,gv)=>steelpan(t,gv??1,73.42,1.4,1.6,.1)},

  // ── COBALT: bells and chimes ──
  {id:'cb_tubular',name:'Tubular Bell',planet:'alloy',continent:'cobalt',color:'#8ea4ff',
   fn:(t,gv)=>{const G=gv??1,o=bus(.3);strike(t,o,293.66,[[1,.3,3.2],[2.01,.2,2.5],[3.02,.16,1.8],[4.13,.1,1.1],[5.43,.07,.7]],G,.002);burst(t,o,'bandpass',3200,1,.08*G,.01);}},
  {id:'cb_glock',name:'Glockenspiel',planet:'alloy',continent:'cobalt',color:'#b0c0ff',
   fn:(t,gv)=>{const G=gv??1,o=bus(.25);strike(t,o,1046.5,[[1,.36,1.3],[2.76,.1,.35],[5.4,.04,.12]],G,.001);burst(t,o,'highpass',5000,.7,.08*G,.006);}},
  {id:'cb_musicbox',name:'Music Box',planet:'alloy',continent:'cobalt',color:'#c4ccff',
   fn:(t,gv)=>{const G=gv??1,o=bus(.3);strike(t,o,783.99,[[1,.36,1.2],[6.27,.05,.14]],G,.001);burst(t,o,'bandpass',6500,3,.15*G,.005);}},
  {id:'cb_triangle',name:'Triangle',planet:'alloy',continent:'cobalt',color:'#d4dcff',
   fn:(t,gv)=>{const G=gv??1,o=bus(.25);strike(t,o,1180,[[1,.1,1.7],[1.72,.09,1.5],[2.43,.08,1.3],[3.12,.07,1.1],[4.58,.06,.9],[6.3,.04,.7]],G,.001);burst(t,o,'highpass',7000,.7,.12*G,.01);}},
  {id:'cb_windchime',name:'Wind Chimes',planet:'alloy',continent:'cobalt',color:'#a0b4ff',
   fn:(t,gv)=>{const G=(gv??1)*1.3,o=bus(.35),P=[1175,1319,1568,1760,2093];for(let i=0;i<7;i++){const st=t+Math.random()*1.0,e=.55+Math.random()*.45;strike(st,o,pick(P),[[1,.14*e,1.4],[2.76,.04*e,.4]],G,.001);}}},

  // ── TITAN: the forge ──
  {id:'ti_anvil',name:'Anvil',planet:'alloy',continent:'titan',color:'#c4ccd8',
   fn:(t,gv)=>{const G=gv??1,o=bus(.2);strike(t,o,980,[[1,.26,.9],[2.31,.17,.55],[3.13,.11,.35],[4.6,.07,.2]],G,.0008);burst(t,o,'bandpass',4000,1,.35*G,.03);mode(t,o,160,.25*G,.05);}},
  {id:'ti_barrel',name:'Oil Barrel',planet:'alloy',continent:'titan',color:'#8e98a8',
   fn:(t,gv)=>{const G=gv??1,o=bus(.15);drop(t,o,95,55,.1,.75*G,.45);strike(t,o,1,[[237,.12,.6],[389,.08,.45],[611,.05,.3]],G,.002);burst(t,o,'lowpass',900,.7,.2*G,.05);}},
  {id:'ti_pipe',name:'Pipe Clang',planet:'alloy',continent:'titan',color:'#b4bccc',
   fn:(t,gv)=>{const G=gv??1,o=bus(.25);strike(t,o,523.25,[[1,.28,1.1],[2.756,.18,.65],[5.404,.09,.35],[8.933,.04,.18]],G,.001);burst(t,o,'bandpass',3500,1,.1*G,.01);}},
  {id:'ti_steam',name:'Steam Snare',planet:'alloy',continent:'titan',color:'#d8e0ea',
   fn:(t,gv)=>{const G=gv??1,o=bus(.15);drop(t,o,230,180,.05,.35*G,.1);burst(t,o,'bandpass',1800,.6,.45*G,.12);burst(t,o,'highpass',4500,.7,.25*G,.35,.01);}},
  {id:'ti_spring',name:'Spring Boing',planet:'alloy',continent:'titan',color:'#a8b4c8',
   fn:(t,gv)=>{const c=getCtx(),G=gv??1,o=bus(.2),x=c.createOscillator(),l=c.createOscillator(),lg=c.createGain(),g=c.createGain();
     x.frequency.value=330;l.frequency.value=22;lg.gain.setValueAtTime(120,t);lg.gain.exponentialRampToValueAtTime(1,t+.5);l.connect(lg);lg.connect(x.frequency);   // the wobble settles down
     x.connect(g);g.connect(o);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.4*G,t+.003);g.gain.exponentialRampToValueAtTime(.0005,t+.6);x.start(t);l.start(t);x.stop(t+.62);l.stop(t+.62);
     mode(t,o,660,.06*G,.3,.002,'triangle');}},

  // ── NICKEL: little metal percussion ──
  {id:'ni_kalimba',name:'Kalimba',planet:'alloy',continent:'nickel',color:'#dce8f0',
   fn:(t,gv)=>{const G=gv??1,o=bus(.25);strike(t,o,659.25,[[1,.48,1],[6.2,.05,.1]],G,.001);burst(t,o,'bandpass',3000,1,.08*G,.005);}},
  {id:'ni_agogo',name:'Agogo Bell',planet:'alloy',continent:'nickel',color:'#c8dce8',
   fn:(t,gv)=>{const G=gv??1,o=bus(.15);strike(t,o,880,[[1,.34,.35],[2.08,.14,.18],[2.92,.08,.12],[4.1,.04,.08]],G,.0008);burst(t,o,'highpass',5000,.7,.1*G,.006);}},
  {id:'ni_spoons',name:'Spoons',planet:'alloy',continent:'nickel',color:'#e4eef4',
   fn:(t,gv)=>{const G=(gv??1)*1.8,o=bus(.1);[[0,1],[.045,.75]].forEach(([d,e])=>{burst(t+d,o,'bandpass',4200,4,.8*G*e,.025);mode(t+d,o,2650,.1*G*e,.04,.0008);mode(t+d,o,3900,.06*G*e,.03,.0008);});}},
  {id:'ni_tamb',name:'Tambourine',planet:'alloy',continent:'nickel',color:'#f0f4f8',
   fn:(t,gv)=>{const G=gv??1,o=bus(.15);[[0,1],[.07,.55]].forEach(([d,e])=>{[[6500,5],[8800,6],[11000,5]].forEach(([f,q])=>burst(t+d,o,'bandpass',f,q,.9*G*e,.22));});burst(t,o,'lowpass',900,.7,.25*G,.05);}},
  {id:'ni_ride',name:'Ride Ping',planet:'alloy',continent:'nickel',color:'#d0dce4',
   fn:(t,gv)=>{const c=getCtx(),G=(gv??1)*2,o=bus(.2),m=c.createGain(),hp=c.createBiquadFilter(),bp=c.createBiquadFilter(),g=c.createGain();
     hp.type='highpass';hp.frequency.value=3000;bp.type='bandpass';bp.frequency.value=5200;bp.Q.value=1;m.gain.value=.25;m.connect(hp);hp.connect(bp);bp.connect(g);g.connect(o);
     [205.3,304.4,369.6,522.7,540,800].forEach(f=>{const x=c.createOscillator();x.type='square';x.frequency.value=f*2;x.connect(m);x.start(t);x.stop(t+1.55);});   // six square waves, like a classic drum machine cymbal
     g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*G,t+.002);g.gain.exponentialRampToValueAtTime(.12*G,t+.06);g.gain.exponentialRampToValueAtTime(.0005,t+1.5);
     mode(t,o,4200,.06*G,.25,.001);}},

  // ── BRONZE: gamelan and gongs ──
  {id:'bz_gangsa',name:'Gangsa',planet:'alloy',continent:'bronze',color:'#e8b060',
   fn:(t,gv)=>{const G=gv??1,o=bus(.3);[1,1.012].forEach((r,i)=>strike(t,o,587.33*r,[[1,.26,1.5],[2.72,.07,.4],[4.95,.025,.15]],G*(i?.8:1),.001));burst(t,o,'bandpass',2500,1,.1*G,.006);}},
  {id:'bz_bonang',name:'Bonang',planet:'alloy',continent:'bronze',color:'#dca458',
   fn:(t,gv)=>{const G=gv??1,o=bus(.25);drop(t,o,400,392,.04,.4*G,1);strike(t,o,392,[[2,.08,.3],[3.02,.035,.15]],G,.002);burst(t,o,'lowpass',500,.7,.15*G,.02);}},
  {id:'bz_saron',name:'Saron',planet:'alloy',continent:'bronze',color:'#f0bc70',
   fn:(t,gv)=>{const G=gv??1,o=bus(.25);[1,1.008].forEach((r,i)=>strike(t,o,293.66*r,[[1,.3,1],[2.65,.08,.3],[4.9,.025,.1]],G*(i?.7:1),.001));burst(t,o,'bandpass',3000,1,.12*G,.006);}},
  {id:'bz_kempul',name:'Kempul',planet:'alloy',continent:'bronze',color:'#c89048',
   fn:(t,gv)=>{const G=gv??1,o=bus(.3);strike(t,o,110,[[1,.42,2.6],[1.004,.22,2.4],[2,.13,1.5],[2.98,.07,.9],[4.1,.03,.5]],G,.012);mode(t,o,70,.2*G,.15);}},
  {id:'bz_gong',name:'Big Gong',planet:'alloy',continent:'bronze',color:'#b88040',
   fn:(t,gv)=>{const G=(gv??1)*0.8,o=bus(.3);strike(t,o,55,[[1,.48,4],[1.006,.24,3.6],[2,.16,2.8],[2.52,.06,1.8],[3.92,.04,1.2],[5.3,.02,.8]],G,.02);mode(t,o,72,.28*G,.25);
     burst(t,o,'bandpass',900,3,.05*G,1.8,.4);}},   // the shimmer that blooms after a big gong is hit
  ];
  S.forEach(s=>PLANET_SOUND_DEFS.push(s));

  // melodic ones follow the KEY (and the roll:1 ones can be played in the piano roll / on Buddy Keys)
  if(typeof PITCHED_SOUNDS!=='undefined'){
    const N=(f,roll)=>roll?{f,r:'note',roll:1}:{f,r:'note'},B=(f,roll)=>roll?{f,r:'bass',roll:1}:{f,r:'bass'};
    Object.assign(PITCHED_SOUNDS,{
      rw_marimba:N(261.63,1),rw_xylo:N(783.99,1),rw_balafon:N(329.63,1),rw_bass:B(87.31,1),rw_roll:N(392,1),
      bm_angklung:N(523.25,1),bm_stamp:N(196,1),ok_slit:N(220,1),ok_temple:N(587.33,1),eb_tok:N(1567.98),
      cd_flute:N(392,1),cd_panpipe:N(523.25,1),cd_didge:B(73.42,1),
      cr_tenor:N(523.25,1),cr_double:N(349.23,1),cr_guitar:N(220,1),cr_cello:N(146.83,1),cr_bass:B(73.42,1),
      cb_tubular:N(293.66,1),cb_glock:N(1046.5,1),cb_musicbox:N(783.99,1),ti_pipe:N(523.25),
      ni_kalimba:N(659.25,1),ni_agogo:N(880),
      bz_gangsa:N(587.33,1),bz_bonang:N(392,1),bz_saron:N(293.66,1),bz_kempul:N(110),bz_gong:B(55),
    });
  }
})();
