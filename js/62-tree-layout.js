// ══════════════════════════════════════════════
//  ORGANIC SKILL-TREE LAYOUT (v0.2.138)
//  The node lists (js/20-skill-tree.js, js/53-puzzles.js) give every node a rough "intent" position.
//  This file grows the final map from them, so nothing sits on a ruler-straight line or a grid:
//   • a trail keeps its overall direction but sways and arcs as it goes (long ones meander like a river);
//     side branches keep their angle to the trail they grow from, so the map still reads the same way;
//   • very long trails (the 25 accessory puzzles) coil up like a snail shell instead of running off the map;
//   • every planet is its own little solar system: continents ring it like moons and their sounds trail
//     off as curling arms that all swirl the same way;
//   • a seeded wobble on every angle and length: random-looking, but the same on every device and every visit;
//   • a relax pass then nudges apart anything that would overlap (labels included).
//  It also tells the renderer how to draw each link as a smooth curve (stLinkPath), and paints the
//  glow behind the parts of the galaxy you've explored (stDrawDecor).
//  Node ids never change here, only x / y, so saves are untouched.
// ══════════════════════════════════════════════
(function(){
  if(typeof SKILL_TREE_NODES==='undefined'||typeof SKILL_MAP==='undefined')return;
  const D=Math.PI/180;

  // ── seeded noise: the same numbers for the same id, forever ──
  function hash(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h;}
  function rnd(id,k){let h=hash(id+':'+k);h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;return (h>>>0)/4294967296;}
  const sgn=(id,k)=>rnd(id,k)*2-1;
  const ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
  const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
  const isFixed=id=>id==='core'||/^sun_/.test(id);
  // the 3D view tilts the map back, so up/down distances look ~half as long as left/right ones:
  // steps that run up or down are made longer to match (and the relax pass wants more room above / below)
  const TALL=.65,TALL_RY=1.45,tall=(h,L)=>1+TALL*Math.sin(h)*Math.sin(h)*Math.max(0,Math.min(1,(300-L)/140));   // (long hub-to-hub roads have room already)

  // each planet system: where it sits, the arc its continents are spread over (fan, degrees: 0 = right, -90 = up),
  // moon distance, step between sounds, which way its arms swirl (+1 clockwise) and how sharply (pitch).
  // The arcs are picked so the arms sweep out into open space, away from the neighbouring planets and branches.
  const PLANETS={
    planet_mantra:{x:-140,y:-900,fan:[-185,-55],rc:220,step:104,swirl:1,pitch:38},
    planet_hyphae:{x:-1020,y:-430,fan:[-220,-30],rc:230,step:100,swirl:-1,pitch:40},
    planet_timbra:{x:-1880,y:-1180,fan:[-280,-100],rc:235,step:106,swirl:1,pitch:32},
    planet_alloy:{x:-900,y:-2080,fan:[-165,25],rc:235,step:104,swirl:-1,pitch:38},
    planet_next:{x:-40,y:-2700},
  };

  // a few trails are turned a little (degrees, + = clockwise) so neighbouring branches don't tangle
  const TURN={mg_cockpit:-24};

  let laidOut=false;
  const parentOf={},kids={},cont={},contOf={};   // cont[p] = the child that carries p's trail on; contOf[c] = p
  function build(){
    const NODES=SKILL_TREE_NODES;
    NODES.forEach(n=>{const p=n.requires&&n.requires[0];if(p&&SKILL_MAP[p]){parentOf[n.id]=p;(kids[p]=kids[p]||[]).push(n.id);}});
    const O={};NODES.forEach(n=>O[n.id]={x:n.x,y:n.y});   // intent positions
    const oHead=id=>{const p=parentOf[id];return p?ang(O[p],O[id]):Math.atan2(O[id].y,O[id].x);};
    // which child continues each trail: an only child always does; otherwise the child that heads (nearly) straight on
    NODES.forEach(n=>{
      const ks=kids[n.id];if(!ks||isFixed(n.id)||PLANETS[n.id])return;   // (a planet's moons are laid out below)
      let best=null,bd=1e9;
      ks.forEach(k=>{const r=Math.abs(wrap(ang(O[n.id],O[k])-oHead(n.id)));if(r<bd){bd=r;best=k;}});
      if(ks.length===1||bd<35*D){cont[n.id]=best;contOf[best]=n.id;}
    });
    const P={},H={};   // new positions and the heading each node arrived on
    P.core={x:0,y:0};H.core=0;
    NODES.forEach(n=>{if(/^sun_/.test(n.id)){P[n.id]={x:n.x,y:n.y};H[n.id]=Math.atan2(n.y,n.x);}});

    // ── planets: little solar systems ──
    const planetDone={};
    Object.keys(PLANETS).forEach(pid=>{
      const cfg=PLANETS[pid];if(!SKILL_MAP[pid])return;
      P[pid]={x:cfg.x,y:cfg.y};H[pid]=parentOf[pid]&&P[parentOf[pid]]?ang(P[parentOf[pid]],P[pid]):-Math.PI/2;planetDone[pid]=1;
      const cs=(kids[pid]||[]).filter(k=>!PLANETS[k]);if(!cfg.fan||!cs.length)return;
      // the continents fan out round the planet; leave a gap where the road to the next planet leaves
      const lo=cfg.fan[0],hi=cfg.fan[1],mid=(lo+hi)/2;
      const gaps=(kids[pid]||[]).filter(k=>PLANETS[k]).map(k=>wrap(Math.atan2(PLANETS[k].y-cfg.y,PLANETS[k].x-cfg.x)-mid*D)/D+mid).filter(g=>g>lo&&g<hi);
      const nSlot=cs.length+gaps.length;let slots=[];for(let i=0;i<nSlot;i++)slots.push(nSlot>1?lo+i/(nSlot-1)*(hi-lo):mid);
      gaps.forEach(g=>{let bi=0;slots.forEach((v,i)=>{if(Math.abs(v-g)<Math.abs(slots[bi]-g))bi=i;});slots.splice(bi,1);});
      cs.forEach((cid,i)=>{
        const a=(slots[i]+sgn(cid,'a')*5)*D;
        const r=cfg.rc*(i%2?1.14:.95)+sgn(cid,'r')*14;
        P[cid]={x:cfg.x+Math.cos(a)*r,y:cfg.y+Math.sin(a)*r};H[cid]=a;planetDone[cid]=1;
        // the continent's sounds: a spiral arm. It keeps a steady angle (its pitch) to the line from the planet,
        // so it sweeps outward and round like an arm of a spiral galaxy. Every arm has its own temper: some run
        // nearly straight out, some curl round tight, and a few sway like a vine.
        const pitch=(cfg.pitch+(rnd(cid,'k')-.5)*30)*D,wav=rnd(cid,'w')<.35?8:0,ph=rnd(cid,'p')*6.3;
        let prev=cid,cur=cont[cid],j=0;
        while(cur){
          const th=Math.atan2(P[prev].y-cfg.y,P[prev].x-cfg.x);
          const h=th+cfg.swirl*pitch+(sgn(cur,'h')*5+wav*Math.sin(j*1.4+ph))*D;j++;
          const L=cfg.step*(1+.07*sgn(cur,'len'))*tall(h,cfg.step);
          P[cur]={x:P[prev].x+Math.cos(h)*L,y:P[prev].y+Math.sin(h)*L};H[cur]=h;planetDone[cur]=1;
          prev=cur;cur=cont[cur];
        }
      });
    });

    // ── everything else grows out from the suns, one trail at a time ──
    function trail(c){const t=[c];let x=cont[c];while(x){t.push(x);x=cont[x];}return t;}
    function layTrail(p,t){
      const last=t[t.length-1],n=t.length;
      const rel0=wrap(ang(O[p],O[last])-oHead(p));     // the trail's overall angle to the path it grows from
      if(n>=15)return coil(p,t,H[p]+wrap(ang(O[p],O[t[0]])-oHead(p))+sgn(t[0],'j')*6*D);
      const Hd=H[p]+rel0+sgn(t[0],'j')*(n>1?7:10)*D+(TURN[t[0]]||0)*D;
      const arc=(n>1?(16+22*rnd(t[0],'arc')):0)*(rnd(t[0],'side')<.5?-1:1)*D;   // a gentle overall bend…
      const A=(n<=3?0:n<=7?9:20)*D,per=6+4*rnd(t[0],'per'),ph=rnd(t[0],'ph')*Math.PI*2;   // …plus a sway on longer trails
      let prev=p;
      t.forEach((id,i)=>{
        const h=Hd+arc*((n>1?i/(n-1):.5)-.5)+A*Math.sin(Math.PI*2*i/per+ph);
        const L0=Math.hypot(O[id].x-O[prev].x,O[id].y-O[prev].y),L=L0*(1+.07*sgn(id,'len'))*tall(h,L0);
        P[id]={x:P[prev].x+Math.cos(h)*L,y:P[prev].y+Math.sin(h)*L};H[id]=h;prev=id;
      });
    }
    // a long trail coils inward like a snail shell: the first node sits on the rim, the last one near the middle
    function coil(p,t,Hd){
      const L0=Math.hypot(O[t[0]].x-O[p].x,O[t[0]].y-O[p].y);
      P[t[0]]={x:P[p].x+Math.cos(Hd)*L0,y:P[p].y+Math.sin(Hd)*L0};H[t[0]]=Hd;
      const step=124,gap=150,SY=1.32,b=gap/(Math.PI*2),rEnd=125,S=(t.length-1)*step,Rout=Math.sqrt(2*b*S+rEnd*rEnd);
      const C={x:P[t[0]].x+Math.cos(Hd)*Rout,y:P[t[0]].y+Math.sin(Hd)*Rout*SY},dir=rnd(t[0],'coil')<.5?-1:1;
      let th=Hd+Math.PI,turned=0,prev=t[0];
      for(let i=1;i<t.length;i++){
        const r=Math.max(rEnd*.8,Rout-b*turned),dth=step*(1+.06*sgn(t[i],'len'))/r;turned+=dth;th+=dir*dth;
        const rr=Math.max(rEnd*.8,Rout-b*turned)+sgn(t[i],'r')*9;
        P[t[i]]={x:C.x+Math.cos(th)*rr,y:C.y+Math.sin(th)*rr*SY};H[t[i]]=ang(P[prev],P[t[i]]);prev=t[i];
      }
    }
    const queue=NODES.filter(n=>/^sun_/.test(n.id)).map(n=>n.id);
    const seen={};
    while(queue.length){
      const p=queue.shift();if(seen[p])continue;seen[p]=1;
      (kids[p]||[]).forEach(k=>{
        if(planetDone[k]){queue.push(k);return;}
        if(contOf[k]===p){queue.push(k);return;}   // already placed as part of p's trail
        if(!P[p])return;
        const t=trail(k);layTrail(p,t);t.forEach(id=>queue.push(id));
      });
    }
    NODES.forEach(n=>{if(!P[n.id])P[n.id]={x:n.x,y:n.y};});   // anything unreachable keeps its spot
    relax(P);
    NODES.forEach(n=>{n.x=Math.round(P[n.id].x);n.y=Math.round(P[n.id].y);});
  }

  // ── relax: push apart anything that overlaps; springs keep links near their length and nodes near their spot ──
  // Each node is an ellipse round its circle + the label and price hanging under it (label width guessed from its length).
  function box(id){
    const n=SKILL_MAP[id],r=id==='core'?36:n&&n.hub?42:27,chars=String(n&&n.name||'').length;
    let w=chars*7.4+8,lines=1;if(w>124){lines=2;w=124;}
    const h=r*2+4+lines*17+18;
    return{rx:Math.max(r+6,w/2),ry:h/2*TALL_RY,oy:h/2-r};
  }
  function relax(P){
    const ids=Object.keys(P),T={},B={};ids.forEach(id=>{T[id]={x:P[id].x,y:P[id].y};B[id]=box(id);});
    const links=[];ids.forEach(id=>{const p=parentOf[id];if(p&&P[p]&&!(p==='core'&&/^sun_/.test(id)))links.push([p,id,Math.hypot(P[id].x-P[p].x,P[id].y-P[p].y)]);});
    const ORB=Math.hypot(200,200),CELL=170;
    for(let it=0;it<140;it++){
      const mv={};ids.forEach(id=>mv[id]={x:0,y:0});
      const grid=new Map();ids.forEach(id=>{const k=Math.floor(P[id].x/CELL)+','+Math.floor(P[id].y/CELL);let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(id);});
      ids.forEach(a=>{
        const pa=P[a],ra=B[a],gx=Math.floor(pa.x/CELL),gy=Math.floor(pa.y/CELL);
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
          const l=grid.get((gx+dx)+','+(gy+dy));if(!l)continue;
          l.forEach(b=>{
            if(b<=a||parentOf[a]===b||parentOf[b]===a)return;   // linked pairs keep their own spacing (pushing them makes trails buckle into zig-zags)
            const pb=P[b],rb=B[b],ox=pb.x-pa.x,oy=(pb.y+rb.oy)-(pa.y+ra.oy),sx=ra.rx+rb.rx+8,sy=ra.ry+rb.ry+8;
            const q=Math.hypot(ox/sx,oy/sy);if(q>=1)return;
            let ex,ey;
            if(q<.04){const r=rnd(a+b,'sep')*Math.PI*2;ex=Math.cos(r)*sx*.5;ey=Math.sin(r)*sy*.5;}
            else{const k=Math.min(1.5,1/q-1)*.5;ex=ox*k;ey=oy*k;}
            const fa=isFixed(a)?0:1,fb=isFixed(b)?0:1,tot=fa+fb;if(!tot)return;
            mv[a].x-=ex*2*fa/tot;mv[a].y-=ey*2*fa/tot;mv[b].x+=ex*2*fb/tot;mv[b].y+=ey*2*fb/tot;
          });
        }
      });
      links.forEach(([p,c,L])=>{
        const dx=P[c].x-P[p].x,dy=P[c].y-P[p].y,d=Math.hypot(dx,dy)||1,f=(d-L)/d*.12;
        const fp=isFixed(p)?0:1,fc=isFixed(c)?0:1,tot=fp+fc;if(!tot)return;
        mv[p].x+=dx*f*fp/tot;mv[p].y+=dy*f*fp/tot;mv[c].x-=dx*f*fc/tot;mv[c].y-=dy*f*fc/tot;
      });
      ids.forEach(id=>{
        if(isFixed(id))return;
        const m=mv[id];m.x+=(T[id].x-P[id].x)*.03;m.y+=(T[id].y-P[id].y)*.03;
        const ml=Math.hypot(m.x,m.y);if(ml>40){m.x*=40/ml;m.y*=40/ml;}
        P[id].x+=m.x;P[id].y+=m.y;
        const r=Math.hypot(P[id].x,P[id].y);if(r<ORB+110){const k=(ORB+110)/(r||1);P[id].x*=k;P[id].y*=k;}   // stay clear of the suns' orbit
      });
    }
  }

  window.stLayoutEnsure=function(){if(laidOut)return;laidOut=true;try{build();}catch(e){console.warn('tree layout',e);}};
  // grow it in a quiet moment after start-up, so opening the map never waits for it
  setTimeout(()=>{if(typeof requestIdleCallback==='function')requestIdleCallback(window.stLayoutEnsure,{timeout:3000});else window.stLayoutEnsure();},2500);

  // ── links: smooth curves. Along a trail the curve flows through each node (no corners);
  //    a side branch leaves its parent in a soft arc that bends a little one way or the other ──
  function unit(x,y){const l=Math.hypot(x,y)||1;return{x:x/l,y:y/l};}
  function rot(v,a){const c=Math.cos(a),s=Math.sin(a);return{x:v.x*c-v.y*s,y:v.x*s+v.y*c};}
  window.stLinkPath=function(pid,cid){
    const p=SKILL_MAP[pid],c=SKILL_MAP[cid];if(!p||!c)return '';
    const dx=c.x-p.x,dy=c.y-p.y,L=Math.hypot(dx,dy),d=unit(dx,dy),bend=(rnd(cid,'bend')<.5?-1:1)*(9+9*rnd(cid,'bm'))*D;
    let t0,t1;
    const pp=contOf[pid]&&SKILL_MAP[contOf[pid]];
    if(contOf[cid]===pid&&pp){const a=unit(p.x-pp.x,p.y-pp.y);t0=unit(a.x+d.x,a.y+d.y);}else t0=rot(d,bend);
    const cc=cont[cid]&&SKILL_MAP[cont[cid]];
    if(cc&&contOf[cid]===pid){const b=unit(cc.x-c.x,cc.y-c.y);t1=unit(d.x+b.x,d.y+b.y);}
    else if(cc){const b=unit(cc.x-c.x,cc.y-c.y);t1=unit(rot(d,-bend).x+b.x*.6,rot(d,-bend).y+b.y*.6);}
    else t1=rot(d,-bend);
    const k=L*.36,f=v=>v.toFixed(1);
    return `M${f(p.x)} ${f(p.y)}C${f(p.x+t0.x*k)} ${f(p.y+t0.y*k)} ${f(c.x-t1.x*k)} ${f(c.y-t1.y*k)} ${f(c.x)} ${f(c.y)}`;
  };

  // ── decor: a soft nebula glows around every explored planet, hub and sun; explored planets get an orbit ring ──
  window.stDrawDecor=function(inner,stateOf){
    const frag=document.createDocumentFragment();
    SKILL_TREE_NODES.forEach(n=>{
      const st=stateOf(n.id);if(st!=='unlocked'&&!(st==='available'&&/^planet_/.test(n.id)))return;
      const col=(typeof BRANCH_COLORS!=='undefined'&&BRANCH_COLORS[n.branch])||'#44aaff';
      const big=/^planet_/.test(n.id)&&PLANETS[n.id]&&PLANETS[n.id].rc;
      if(st==='unlocked'){
        const R=big?640:n.hub?430:/^sun_/.test(n.id)?300:n.id==='core'?360:0;
        if(R){const g=document.createElement('div');g.className='st-nebula';
          g.style.cssText=`left:${n.x-R}px;top:${n.y-R}px;width:${R*2}px;height:${R*2}px;background:radial-gradient(circle,${col}22 0%,${col}10 38%,transparent 70%);`;frag.appendChild(g);}
      }
      if(big){
        const cs=(kids[n.id]||[]).map(k=>SKILL_MAP[k]).filter(k=>k&&!/^planet_/.test(k.id));
        if(cs.length){const R=cs.reduce((s,k)=>s+Math.hypot(k.x-n.x,k.y-n.y),0)/cs.length;
          const ring=document.createElement('div');ring.className='st-halo'+(st==='unlocked'?' on':'');
          ring.style.cssText=`left:${n.x-R}px;top:${n.y-R}px;width:${R*2}px;height:${R*2}px;border-color:${col}55;`;frag.appendChild(ring);}
      }
    });
    inner.appendChild(frag);
  };
})();
