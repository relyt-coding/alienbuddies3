
// ══════════════════════════════════════════════
//  SOLAR-SYSTEM SKILL TREE (prototype)
//  • The four Quad Suns orbit the Tucana Core on a glowing ring; every path stays exactly where it was
//    and starts from its "dock" on the ring.
//  • 3D view (default): the whole map is a tilted plate seen in perspective; nodes and labels stand up
//    and face you. The ◐ button in the header switches to the flat map (remembered).
// ══════════════════════════════════════════════
const ST_TILT = 55;      // how far the plate leans back (degrees)
const ST_PERSP = 1700;   // camera distance (px, in map units)
const ST_ORBIT_PERIOD = 120; // seconds for one full trip around the core
let _st3d = true;
try{ const v = localStorage.getItem('ab2_tree3d'); if(v === '0') _st3d = false; }catch(e){}
function stIs3D(){ return _st3d; }

(function(){
  const modal = document.getElementById('skillTreeModal');
  const inner = document.getElementById('skillTreeInner');
  if(!modal || !inner) return;

  // ── header toggle ──
  const hdr = document.getElementById('skillTreeHeader'), closeBtn = document.getElementById('skillTreeCloseBtn');
  const tgl = document.createElement('button');
  tgl.type = 'button'; tgl.id = 'stViewToggle';
  function paintToggle(){
    tgl.textContent = _st3d ? '◐ 3D' : '▭ FLAT';
    tgl.title = _st3d ? 'Switch to the flat map' : 'Switch to the 3D solar system';
    modal.classList.toggle('st-3d', _st3d);
  }
  tgl.addEventListener('click', ()=>{
    _st3d = !_st3d;
    try{ localStorage.setItem('ab2_tree3d', _st3d ? '1' : '0'); }catch(e){}
    paintToggle();
    if(typeof closeStDetail === 'function') closeStDetail();
    applyStTransform();
  });
  const cv = document.getElementById('skillTreeCanvas');
  if(cv) modal.insertBefore(tgl, cv.nextSibling); // floats bottom-left over the map
  else if(hdr && closeBtn) hdr.insertBefore(tgl, closeBtn);
  paintToggle();

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
  let raf = 0, tPaused = 0, offset = 0, last = performance.now();
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
    place(t);
    raf = requestAnimationFrame(loop);
  }
  function kick(){ if(!raf && modal.classList.contains('open')){ last = performance.now(); raf = requestAnimationFrame(loop); } }
  new MutationObserver(kick).observe(modal, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', kick);
  kick();
})();
