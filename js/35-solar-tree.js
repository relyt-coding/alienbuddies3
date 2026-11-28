// ══════════════════════════════════════════════
//  SOLAR-SYSTEM SKILL TREE (the real one, v0.2.179: grown from the tilted-plate prototype)
//
//  THE CAMERA. The galaxy lies on a flat disc in space and a camera looks down at it. The camera has a
//  TARGET (the spot on the disc that sits at the "anchor", a little below the middle of the screen), a
//  YAW (which way it faces round the disc), a TILT (how far it leans back) and a ZOOM. Things near the
//  camera look bigger, far things smaller, wherever you fly: the vanishing point is the screen, not the core.
//    • one finger / mouse drag  = fly over the map (the ground follows your finger)
//    • pinch / wheel / slider   = zoom
//    • two-finger twist, right-drag (or shift-drag), Q / E = turn round the spot you're looking at
//    • right-drag up / down     = tilt (computer only)
//    • the compass (bottom left) points north; tap it to face north again
//  stPanX / stPanY / stScale (js/20) stay the single source of truth, with their flat meaning: the map point
//  under the anchor is ((ax − stPanX) / stScale, (ay − stPanY) / stScale). So the ◐ button swaps between the
//  3D camera and the flat map without losing your place, and old code that sets the pan still works.
//
//  THE BODIES. The Tucana Core is a star, the four Quad Suns are suns in their branch colours that glide
//  round it on a ring, planets are lit spheres in their own colours (two have rings) and continents are
//  tinted worlds that keep their icon. Everything else stays a station bubble. Bodies you can't buy yet
//  are dimmed; the "?" silhouettes are untouched.
//
//  THE SKY. Three layers of stars drift at different speeds as you fly and turn (parallax), and a haze
//  fades the far edge of the disc into space.
//
//  Cheap on purpose (an iPhone 7 has to run it): no WebGL, no canvas per frame, no blur. The browser does the
//  3D with CSS transforms; turning the camera is one style change on the map plus one custom property that
//  every bubble uses to keep facing you.
// ══════════════════════════════════════════════
const ST_TILT = 52;          // default lean (degrees)
const ST_TILT_MIN = 24, ST_TILT_MAX = 66;
const ST_ANCHOR_Y = .58;     // the camera's target sits this far down the map window
const ST_PERSP = 1700;       // (kept for old callers; the camera distance is stPersp() now)
const ST_ORBIT_PERIOD = 120; // seconds for one full trip of the suns around the core
let _st3d = true;
try{ const v = localStorage.getItem('ab2_tree3d'); if(v === '0') _st3d = false; }catch(e){}
let stYaw = 0, stTilt = ST_TILT;
function stIs3D(){ return _st3d; }
function stPersp(h){ return Math.max(700, Math.min(1500, h * 1.3)); }
// the point on screen (inside the map window) that the camera turns and zooms around
function stAnchor(canvas){
  const W = canvas.clientWidth, H = canvas.clientHeight;
  return { x: W / 2, y: H * (_st3d ? ST_ANCHOR_Y : .5) };
}
// a drag of (dx, dy) screen px → how far the pan has to move so the ground under the anchor follows it
function stScreenToPan(dx, dy){
  if(!_st3d) return { x: dx, y: dy };
  const y = stYaw * Math.PI / 180, vy = dy / Math.cos(stTilt * Math.PI / 180);
  return { x: dx * Math.cos(y) + vy * Math.sin(y), y: -dx * Math.sin(y) + vy * Math.cos(y) };
}
function stTurn(dYaw, dTilt){
  stYaw = ((stYaw + dYaw + 540) % 360) - 180;
  stTilt = Math.max(ST_TILT_MIN, Math.min(ST_TILT_MAX, stTilt + (dTilt || 0)));
}

(function(){
  const modal = document.getElementById('skillTreeModal');
  const inner = document.getElementById('skillTreeInner');
  const cv = document.getElementById('skillTreeCanvas');
  if(!modal || !inner || !cv) return;

  // ── sky: three star layers + a haze over the far edge ──
  const sky = document.createElement('div'); sky.className = 'st-sky';
  const layers = [];
  function starTile(n, maxR, alpha, seed){
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); let s = seed;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const tints = ['255,255,255', '190,210,255', '255,236,200', '200,255,240'];
    for(let i = 0; i < n; i++){
      const x = r() * 256, y = r() * 256, rad = .4 + r() * maxR, a = alpha * (.35 + .65 * r());
      g.fillStyle = 'rgba(' + tints[(r() * tints.length) | 0] + ',' + a.toFixed(2) + ')';
      g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
    }
    return c.toDataURL('image/png');
  }
  [[70, .7, .55, 7], [34, 1.0, .8, 91], [12, 1.5, 1, 733]].forEach((o, i) => {
    const d = document.createElement('i');
    try{ d.style.backgroundImage = 'url(' + starTile(o[0], o[1], o[2], o[3]) + ')'; }catch(e){}
    sky.appendChild(d); layers.push(d);
  });
  cv.insertBefore(sky, inner);
  // the ground: everything that lies flat on the disc (links, orbit rings, glows) lives in its own layer UNDER the bubbles.
  // The bubbles stand up through the disc to face you, so if both shared one 3D space the links would be drawn across
  // the lower half of every bubble and its name. Two layers with the same camera = the ground is always behind.
  const ground = document.createElement('div'); ground.id = 'skillTreeGround';
  cv.insertBefore(ground, inner);
  window.stSplitGround = function(){
    ground.innerHTML = '';
    const flat = inner.querySelectorAll('.st-nebula,.st-halo,.st-orbit,.st-dock,.st-links,.st-line');
    for(let i = 0; i < flat.length; i++) ground.appendChild(flat[i]);
    ground.style.transform = inner.style.transform;
  };
  const haze = document.createElement('div'); haze.className = 'st-haze'; cv.appendChild(haze);

  // ── buttons: ◐ 3D / ▭ FLAT, and the compass ──
  const hdr = document.getElementById('skillTreeHeader'), closeBtn = document.getElementById('skillTreeCloseBtn');
  const tgl = document.createElement('button');
  tgl.type = 'button'; tgl.id = 'stViewToggle';
  const comp = document.createElement('button');
  comp.type = 'button'; comp.id = 'stCompass'; comp.setAttribute('aria-label', 'Face north');
  comp.title = 'Tap to face north. Turn the view: two-finger twist, right-drag, or Q / E';
  comp.innerHTML = '<span class="stc-needle"></span><span class="stc-n">N</span>';
  function paintToggle(){
    tgl.textContent = _st3d ? '◐ 3D' : '▭ FLAT';
    tgl.title = _st3d ? 'Switch to the flat map' : 'Switch to the 3D solar system';
    modal.classList.toggle('st-3d', _st3d);
  }
  tgl.addEventListener('click', ()=>{
    // keep the same spot of the map under the middle of the window when the anchor moves
    const H = cv.clientHeight, before = H * (_st3d ? ST_ANCHOR_Y : .5);
    _st3d = !_st3d;
    stPanY += H * (_st3d ? ST_ANCHOR_Y : .5) - before;
    try{ localStorage.setItem('ab2_tree3d', _st3d ? '1' : '0'); }catch(e){}
    paintToggle();
    if(typeof closeStDetail === 'function') closeStDetail();
    applyStTransform();
  });
  modal.insertBefore(tgl, cv.nextSibling); // floats bottom-left over the map
  modal.insertBefore(comp, tgl.nextSibling);
  paintToggle();

  // ── the camera ──
  let lastPersp = '', lastBB = '';
  window.stApply3D = function(){
    if(!_st3d){
      if(lastPersp){ cv.style.perspective = ''; cv.style.perspectiveOrigin = ''; lastPersp = ''; }
      ground.style.transform = 'translate(' + stPanX + 'px,' + stPanY + 'px) scale(' + stScale + ')';
      return false;
    }
    const W = cv.clientWidth, H = cv.clientHeight, ax = W / 2, ay = H * ST_ANCHOR_Y, s = stScale;
    const pk = Math.round(stPersp(H)) + '|' + Math.round(ax) + '|' + Math.round(ay);
    if(pk !== lastPersp){
      lastPersp = pk;
      cv.style.perspective = Math.round(stPersp(H)) + 'px';
      cv.style.perspectiveOrigin = Math.round(ax) + 'px ' + Math.round(ay) + 'px';
    }
    const tx = (ax - stPanX) / s, ty = (ay - stPanY) / s;
    ground.style.transform = inner.style.transform = 'translate(' + ax.toFixed(1) + 'px,' + ay.toFixed(1) + 'px) rotateX(' + stTilt.toFixed(2) + 'deg) rotateZ(' + stYaw.toFixed(2) +
      'deg) scale3d(' + s.toFixed(4) + ',' + s.toFixed(4) + ',' + s.toFixed(4) + ') translate(' + (-tx).toFixed(1) + 'px,' + (-ty).toFixed(1) + 'px)';
    // every bubble and label undoes the camera's turn so it faces you: rotateZ(−yaw) rotateX(−tilt) as one axis + angle
    const hz = -stYaw * Math.PI / 360, hx = -stTilt * Math.PI / 360;
    const qw = Math.cos(hz) * Math.cos(hx), qx = Math.cos(hz) * Math.sin(hx), qy = Math.sin(hz) * Math.sin(hx), qz = Math.sin(hz) * Math.cos(hx);
    const sn = Math.sqrt(Math.max(0, 1 - qw * qw));
    const bb = sn < 1e-4 ? '0 0 1 0deg' : (qx / sn).toFixed(4) + ' ' + (qy / sn).toFixed(4) + ' ' + (qz / sn).toFixed(4) + ' ' + (2 * Math.acos(Math.max(-1, Math.min(1, qw))) * 180 / Math.PI).toFixed(2) + 'deg';
    if(bb !== lastBB){ lastBB = bb; modal.style.setProperty('--st-bb', bb); comp.firstChild.style.transform = 'rotate(' + stYaw.toFixed(1) + 'deg)'; comp.classList.toggle('off', Math.abs(stYaw) < .5 && Math.abs(stTilt - ST_TILT) < .5); }
    // stars: nearer layers slide further
    const wrap = v => ((v % 256) + 256) % 256;
    for(let i = 0; i < layers.length; i++){
      const f = [.02, .045, .08][i], g = [2.2, 4, 6.5][i];
      layers[i].style.transform = 'translate3d(' + wrap(stPanX * f - stYaw * g).toFixed(1) + 'px,' + wrap(stPanY * f * .6).toFixed(1) + 'px,0)';
    }
    return true;
  };

  // glide the camera (used by the compass and the opening swoop)
  let camRaf = 0;
  function camGlide(to, ms, done){
    cancelAnimationFrame(camRaf);
    const from = { yaw: stYaw, tilt: stTilt, scale: stScale }, t0 = performance.now();
    const a = stAnchor(cv), tx = (a.x - stPanX) / stScale, ty = (a.y - stPanY) / stScale;   // the target stays put
    (function step(now){
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      stYaw = from.yaw + (to.yaw - from.yaw) * e; stTilt = from.tilt + (to.tilt - from.tilt) * e;
      if(to.scale){ stScale = from.scale + (to.scale - from.scale) * e; stPanX = a.x - tx * stScale; stPanY = a.y - ty * stScale; }
      applyStTransform();
      if(k < 1 && modal.classList.contains('open')) camRaf = requestAnimationFrame(step);
      else { stYaw = to.yaw; stTilt = to.tilt; applyStTransform(); if(done) done(); }
    })(t0);
  }
  window.stCamStop = () => cancelAnimationFrame(camRaf);
  comp.addEventListener('click', ()=> camGlide({ yaw: 0, tilt: ST_TILT }, 450));
  // opening: the camera starts high and turned, and swoops down into place
  window.stCamIntro = function(){
    if(!_st3d) return;
    let calm = false; try{ calm = matchMedia('(prefers-reduced-motion:reduce)').matches; }catch(e){}
    if(calm || document.documentElement.classList.contains('legacy-safari')){ stYaw = 0; stTilt = ST_TILT; applyStTransform(); return; }
    const a = stAnchor(cv), tx = (a.x - stPanX) / stScale, ty = (a.y - stPanY) / stScale, end = stScale;
    stYaw = -32; stTilt = ST_TILT_MIN + 4; stScale = end * .72; stPanX = a.x - tx * stScale; stPanY = a.y - ty * stScale;
    applyStTransform();
    camGlide({ yaw: 0, tilt: ST_TILT, scale: end }, 1000);
  };
  // computer: right-drag (or shift-drag) turns and tilts, Q / E turn
  cv.addEventListener('contextmenu', e => { if(_st3d) e.preventDefault(); });
  window.addEventListener('keydown', e => {
    if(!_st3d || !modal.classList.contains('open')) return;
    const tg = e.target && e.target.tagName; if(tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
    if(e.key === 'q' || e.key === 'Q'){ window.stCamStop(); stTurn(-6); applyStTransform(); }
    else if(e.key === 'e' || e.key === 'E'){ window.stCamStop(); stTurn(6); applyStTransform(); }
  });
  window.addEventListener('resize', ()=>{ if(modal.classList.contains('open')){ if(typeof stClampPan==='function') stClampPan(); applyStTransform(); } });

  // ── ground: faint orbit rings round the core, drawn into the link layer (no extra layers to composite) ──
  window.stDrawGround = function(svg){
    const NS = 'http://www.w3.org/2000/svg';
    [470, 700].forEach((r, i) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', 0); c.setAttribute('cy', 0); c.setAttribute('r', r); c.setAttribute('class', 'st-ground' + (i ? ' far' : ''));
      svg.insertBefore(c, svg.firstChild);
    });
  };

  // ── bodies: stars, suns, planets and continents get a lit sphere instead of a flat bubble ──
  // planet colours: lite (sunlit side) · base · dark (night side) · atm (rim glow) · bands (stripe angle, 0 = none) · ring
  const PLANET_LOOK = {
    planet_mantra: { lite: '#8ff0f6', base: '#1b8fa0', dark: '#04202e', atm: '#7ff0e6', band: 0 },
    planet_hyphae: { lite: '#f0a4e4', base: '#8a3aa8', dark: '#170820', atm: '#ff9ad5', band: 28 },
    planet_timbra: { lite: '#cfe08a', base: '#5f8a3a', dark: '#141a06', atm: '#bfff8a', band: 0 },
    planet_alloy:  { lite: '#eef4fb', base: '#7c8aa0', dark: '#10151e', atm: '#9fe6ff', band: -14, ring: 1 },
    planet_808:    { lite: '#ffc27a', base: '#e0482c', dark: '#240604', atm: '#ff8a4a', band: 8 },
    planet_zephyr: { lite: '#e4f6ff', base: '#4f9ad0', dark: '#081c30', atm: '#d8f4ff', band: -22, ring: 1 },
    planet_next:   { lite: '#6a6f86', base: '#2a2d3e', dark: '#05060c', atm: '#555a78', band: 0 },
  };
  function rgb(hex){ const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, k){ const A = rgb(a), B = rgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')'; }
  function alpha(a, k){ return 'rgba(' + rgb(a).join(',') + ',' + k + ')'; }
  const planetOf = {};   // continent id → its planet
  window.stDressNode = function(el, node, state){
    if(state !== 'unlocked' && state !== 'available') return;
    const id = node.id, S = el.style;
    if(id === 'core'){
      el.classList.add('st-body', 'st-star');
    } else if(/^sun_/.test(id)){
      const c = (typeof BRANCH_COLORS !== 'undefined' && BRANCH_COLORS[node.branch]) || '#ffcc55';
      el.classList.add('st-body', 'st-sun');
      S.setProperty('--c', c); S.setProperty('--cl', mix(c, '#ffffff', .62)); S.setProperty('--cd', mix(c, '#200800', .55)); S.setProperty('--cg', alpha(c, .34));
    } else if(/^planet_/.test(id)){
      const L = PLANET_LOOK[id] || PLANET_LOOK.planet_next;
      el.classList.add('st-body', 'st-planet'); if(L.ring) el.classList.add('ringed'); if(L.band) el.classList.add('banded');
      S.setProperty('--lite', L.lite); S.setProperty('--base', L.base); S.setProperty('--dark', L.dark); S.setProperty('--atm', alpha(L.atm, .55));
      S.setProperty('--band', L.band + 'deg'); S.setProperty('--b1', alpha(L.lite, .0)); S.setProperty('--b2', alpha(L.dark, .34)); S.setProperty('--ringc', alpha(L.atm, .7));
    } else if(/^cont_/.test(id)){
      let p = planetOf[id];
      if(p === undefined){ p = planetOf[id] = (node.requires || []).find(r => /^planet_/.test(r)) || ''; }
      const L = PLANET_LOOK[p]; if(!L) return;
      el.classList.add('st-body', 'st-world');
      S.setProperty('--lite', mix(L.base, L.lite, .35)); S.setProperty('--base', mix(L.base, L.dark, .45)); S.setProperty('--dark', L.dark); S.setProperty('--atm', alpha(L.atm, .5));
    }
  };

  // ── orbit ring + docks ──
  let suns = []; // {el, home angle, radius, hx, hy}
  window.stDrawOrbit = function(el){
    const homes = SKILL_TREE_NODES.filter(n => /^sun_/.test(n.id));
    if(!homes.length) return;
    const R = Math.round(Math.hypot(homes[0].x, homes[0].y));
    const ring = document.createElement('div');
    ring.className = 'st-orbit';
    ring.style.cssText = `left:${-R}px;top:${-R}px;width:${R*2}px;height:${R*2}px;`;
    el.appendChild(ring);
    homes.forEach(n => {
      const d = document.createElement('div');
      d.className = 'st-dock';
      d.style.cssText = `left:${n.x}px;top:${n.y}px;border-color:${BRANCH_COLORS[n.branch] || '#335'};`;
      el.appendChild(d);
    });
  };
  window.stOrbitRefresh = function(){
    suns = [...inner.querySelectorAll('.st-node[data-sun]')].map(el => {
      const n = SKILL_MAP[el.dataset.sun];
      return { el, n, a0: Math.atan2(n.y, n.x), R: Math.hypot(n.x, n.y) };
    });
    place(performance.now());
  };

  // ── animation: suns glide round the ring (paused while a sun's info bubble is open, so it stays put) ──
  let raf = 0, offset = 0, last = performance.now();
  function place(t){
    const dt = Math.min(100, t - last); last = t;
    const pop = document.getElementById('stDetailPop');
    const holding = pop && pop.classList.contains('open') && typeof _stDetailNode !== 'undefined' && _stDetailNode && /^sun_/.test(_stDetailNode);
    if(!holding) offset += dt / 1000 * (Math.PI * 2 / ST_ORBIT_PERIOD);
    suns.forEach(s => {
      const a = s.a0 + offset;
      const dx = Math.cos(a) * s.R - s.n.x, dy = Math.sin(a) * s.R - s.n.y;
      s.el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    });
  }
  function loop(t){
    raf = 0;
    if(!modal.classList.contains('open') || document.hidden){ return; }
    try{ place(t); }catch(e){}   // v0.2.245: one bad frame must never stop the orbit or throw every frame
    raf = requestAnimationFrame(loop);
  }
  function kick(){ if(!raf && modal.classList.contains('open')){ last = performance.now(); raf = requestAnimationFrame(loop); } }
  new MutationObserver(kick).observe(modal, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', kick);
  kick();
})();
