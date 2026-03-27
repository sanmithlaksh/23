import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { saveProgress } from '../supabase';
import { showFlash } from '../components/Flash';
import ProgressTrack from '../components/ProgressTrack';

const CELL = 36;
const LERP_SPEED = 0.14;

const VISION_GRACE_S  = 45;
const VISION_SHRINK_S = 60;
const BOT_STEP_MS_EASY = 550;
const BOT_STEP_MS_HARD = 450;
const CHECKPOINT_EVERY = 15;
const DEV_DISABLE_DARKNESS = false;

// ── Seeded maze generator ─────────────────────────────────────────────────────
function generateMaze(cols, rows) {
  let seed = 1337;
  function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      r, c, walls: { N: true, S: true, E: true, W: true },
      visited: false, explored: false,
      isCheckpointP1: false, isCheckpointP2: false,
    }))
  );
  const stack = [cells[0][0]];
  cells[0][0].visited = true;
  function unvisited(r, c) {
    const ns = [];
    if (r > 0       && !cells[r-1][c].visited) ns.push({ r:r-1, c,   dir:'N', opp:'S' });
    if (r < rows-1  && !cells[r+1][c].visited) ns.push({ r:r+1, c,   dir:'S', opp:'N' });
    if (c > 0       && !cells[r][c-1].visited) ns.push({ r,   c:c-1, dir:'W', opp:'E' });
    if (c < cols-1  && !cells[r][c+1].visited) ns.push({ r,   c:c+1, dir:'E', opp:'W' });
    return ns;
  }
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const ns  = unvisited(cur.r, cur.c);
    if (ns.length) {
      const next = ns[Math.floor(random() * ns.length)];
      cells[cur.r][cur.c].walls[next.dir] = false;
      cells[next.r][next.c].walls[next.opp] = false;
      cells[next.r][next.c].visited = true;
      stack.push(cells[next.r][next.c]);
    } else { stack.pop(); }
  }
  cells[0][0].explored = true;
  return cells;
}

// ── BFS for hunter pathfinding ────────────────────────────────────────────────
function bfsPath(cells, rows, cols, from, to) {
  if (from.r === to.r && from.c === to.c) return [];
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const prev    = Array.from({ length: rows }, () => Array(cols).fill(null));
  const queue   = [from];
  visited[from.r][from.c] = true;
  const dirs = [
    { dr:-1, dc:0, wall:'N' }, { dr:1, dc:0, wall:'S' },
    { dr:0, dc:-1, wall:'W' }, { dr:0, dc:1, wall:'E' },
  ];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.r === to.r && cur.c === to.c) {
      const path = []; let node = cur;
      while (prev[node.r][node.c]) { path.unshift(node); node = prev[node.r][node.c]; }
      return path;
    }
    for (const d of dirs) {
      const nr = cur.r + d.dr, nc = cur.c + d.dc;
      if (nr<0||nr>=rows||nc<0||nc>=cols) continue;
      if (visited[nr][nc]) continue;
      if (cells[cur.r][cur.c].walls[d.wall]) continue;
      visited[nr][nc] = true; prev[nr][nc] = cur; queue.push({ r:nr, c:nc });
    }
  }
  return [];
}

// ── Particles ─────────────────────────────────────────────────────────────────
function createParticle(x, y, hue = null) {
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 1.8 + 0.4;
  return {
    x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
    life: 1, decay: Math.random()*0.03+0.02, r: Math.random()*2+1,
    hue: hue ?? (Math.random() > 0.6 ? 'gold' : 'blue'),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Round2Screen({ audio }) {
  const { config, diff, team, collectFragment, setScreen, getElapsedNow } = useGame();

  const COLS = Math.max(31, diff?.mazeSize?.[0] || 31);
  const ROWS = Math.max(21, diff?.mazeSize?.[1] || 21);
  const EXIT_C = Math.floor(COLS / 2);
  const EXIT_R = Math.floor(ROWS / 2);
  const BASE_VIS    = diff?.visibility || 6;
  const BOT_STEP_MS = diff?.visibility <= 2 ? BOT_STEP_MS_HARD : BOT_STEP_MS_EASY;

  const mazeRef    = useRef(null);
  const mmRef      = useRef(null);
  const cellsRef   = useRef(null);
  const rafRef     = useRef(null);
  const flickerRef = useRef(0);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // P1 (Blue) — Bottom Right — Arrows
  const p1GridPos  = useRef({ r: ROWS-1, c: COLS-1 });
  const p1PixelPos = useRef({ x: (COLS-1)*CELL+CELL/2, y: (ROWS-1)*CELL+CELL/2 });
  const p1TargetPos = useRef({ x: (COLS-1)*CELL+CELL/2, y: (ROWS-1)*CELL+CELL/2 });
  const p1Trail    = useRef([]);
  const p1StepsRef = useRef(0);
  const p1CheckStepConfig = useRef(0);
  const p1Checkpoint = useRef({ r: ROWS-1, c: COLS-1 });
  const p1Done     = useRef(false);

  // P2 (Green) — Top Left — WASD
  const p2GridPos  = useRef({ r: 0, c: 0 });
  const p2PixelPos = useRef({ x: CELL/2, y: CELL/2 });
  const p2TargetPos = useRef({ x: CELL/2, y: CELL/2 });
  const p2Trail    = useRef([]);
  const p2StepsRef = useRef(0);
  const p2CheckStepConfig = useRef(0);
  const p2Checkpoint = useRef({ r: 0, c: 0 });
  const p2Done     = useRef(false);

  const particles  = useRef([]);
  const roundDone  = useRef(false);
  const mazeStartRef = useRef(Date.now());
  const visRef     = useRef(BASE_VIS);

  // H1 (Red) — Top Right
  const h1GridPos  = useRef({ r: 0, c: COLS-1 });
  const h1PixelPos = useRef({ x: (COLS-1)*CELL+CELL/2, y: CELL/2 });
  const h1TargetPos = useRef({ x: (COLS-1)*CELL+CELL/2, y: CELL/2 });
  const h1Trail    = useRef([]);

  // H2 (Blue) — Bottom Left
  const h2GridPos  = useRef({ r: ROWS-1, c: 0 });
  const h2PixelPos = useRef({ x: CELL/2, y: (ROWS-1)*CELL+CELL/2 });
  const h2TargetPos = useRef({ x: CELL/2, y: (ROWS-1)*CELL+CELL/2 });
  const h2Trail    = useRef([]);

  const botStepTimer   = useRef(Date.now());
  const caughtFlashRef = useRef(0);

  const [p1Steps,   setP1Steps]   = useState(0);
  const [p2Steps,   setP2Steps]   = useState(0);
  const [deaths,    setDeaths]    = useState(0);
  const [done,      setDone]      = useState(false);
  const [revealed,  setRevealed]  = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    cellsRef.current = generateMaze(COLS, ROWS);
    cellsRef.current[p1Checkpoint.current.r][p1Checkpoint.current.c].isCheckpointP1 = true;
    cellsRef.current[p2Checkpoint.current.r][p2Checkpoint.current.c].isCheckpointP2 = true;
    cellsRef.current[ROWS-1][COLS-1].explored = true;
    cellsRef.current[0][0].explored = true;
    mazeStartRef.current = Date.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line

  function loop() {
    flickerRef.current = (flickerRef.current + 1) % 240;
    const now = Date.now();
    const elapsed = (now - mazeStartRef.current) / 1000;
    if (elapsed > VISION_GRACE_S) {
      const sp = Math.min(1, (elapsed - VISION_GRACE_S) / VISION_SHRINK_S);
      visRef.current = Math.max(1, BASE_VIS - sp * (BASE_VIS - 1));
    } else {
      visRef.current = BASE_VIS;
    }
    if (DEV_DISABLE_DARKNESS) visRef.current = 1000;

    if (!roundDone.current && now - botStepTimer.current >= BOT_STEP_MS) {
      botStepTimer.current = now; moveHunters();
    }

    if (!roundDone.current) {
      ['h1','h2'].forEach(h => {
        const pixRef  = h === 'h1' ? h1PixelPos  : h2PixelPos;
        const tgtRef  = h === 'h1' ? h1TargetPos : h2TargetPos;
        const trlRef  = h === 'h1' ? h1Trail     : h2Trail;
        pixRef.current.x += (tgtRef.current.x - pixRef.current.x) * 0.18;
        pixRef.current.y += (tgtRef.current.y - pixRef.current.y) * 0.18;
        trlRef.current.push({ x: pixRef.current.x, y: pixRef.current.y });
        if (trlRef.current.length > 20) trlRef.current.shift();
      });
    }
    if (!p1Done.current) {
      p1PixelPos.current.x += (p1TargetPos.current.x - p1PixelPos.current.x) * LERP_SPEED;
      p1PixelPos.current.y += (p1TargetPos.current.y - p1PixelPos.current.y) * LERP_SPEED;
      p1Trail.current.push({ x: p1PixelPos.current.x, y: p1PixelPos.current.y });
      if (p1Trail.current.length > 28) p1Trail.current.shift();
    }
    if (!p2Done.current) {
      p2PixelPos.current.x += (p2TargetPos.current.x - p2PixelPos.current.x) * LERP_SPEED;
      p2PixelPos.current.y += (p2TargetPos.current.y - p2PixelPos.current.y) * LERP_SPEED;
      p2Trail.current.push({ x: p2PixelPos.current.x, y: p2PixelPos.current.y });
      if (p2Trail.current.length > 28) p2Trail.current.shift();
    }
    particles.current = particles.current
      .map(p => ({ ...p, x:p.x+p.vx, y:p.y+p.vy, life:p.life-p.decay, vy:p.vy+0.04 }))
      .filter(p => p.life > 0);
    if (caughtFlashRef.current > 0) caughtFlashRef.current--;
    drawMaze(); drawMinimap();
    rafRef.current = requestAnimationFrame(loop);
  }

  function moveHunters() {
    const cells = cellsRef.current; if (!cells) return;
    checkCatch();
    if (!p1Done.current) {
      const path = bfsPath(cells, ROWS, COLS, h1GridPos.current, p1GridPos.current);
      if (path.length) { h1GridPos.current = { r:path[0].r, c:path[0].c }; h1TargetPos.current = { x:path[0].c*CELL+CELL/2, y:path[0].r*CELL+CELL/2 }; }
    }
    if (!p2Done.current) {
      const path = bfsPath(cells, ROWS, COLS, h2GridPos.current, p2GridPos.current);
      if (path.length) { h2GridPos.current = { r:path[0].r, c:path[0].c }; h2TargetPos.current = { x:path[0].c*CELL+CELL/2, y:path[0].r*CELL+CELL/2 }; }
    }
    checkCatch();
  }

  function checkCatch() {
    const h1=h1GridPos.current, h2=h2GridPos.current, p1=p1GridPos.current, p2=p2GridPos.current;
    if (!p1Done.current && ((h1.r===p1.r&&h1.c===p1.c)||(h2.r===p1.r&&h2.c===p1.c))) handleCatch('P1');
    if (!p2Done.current && ((h1.r===p2.r&&h1.c===p2.c)||(h2.r===p2.r&&h2.c===p2.c))) handleCatch('P2');
  }

  function handleCatch(playerType) {
    caughtFlashRef.current = 20; audio?.playAlarm?.(); setDeaths(d => d+1);
    const isP1 = playerType === 'P1';
    const cp = isP1 ? p1Checkpoint.current : p2Checkpoint.current;
    const px = cp.c*CELL+CELL/2, py = cp.r*CELL+CELL/2;
    if (isP1) { p1GridPos.current={...cp}; p1PixelPos.current={x:px,y:py}; p1TargetPos.current={x:px,y:py}; p1Trail.current=[]; }
    else      { p2GridPos.current={...cp}; p2PixelPos.current={x:px,y:py}; p2TargetPos.current={x:px,y:py}; p2Trail.current=[]; }
    showFlash(`⚠ Player ${isP1?1:2} CAUGHT! Respawning at checkpoint…`, 'error', 2000);
  }

  function tryCheckpoint(playerType, r, c) {
    const isP1 = playerType === 'P1';
    const stepsRef = isP1 ? p1StepsRef : p2StepsRef;
    const checkRef = isP1 ? p1CheckStepConfig : p2CheckStepConfig;
    const cpRef    = isP1 ? p1Checkpoint : p2Checkpoint;
    const flagKey  = isP1 ? 'isCheckpointP1' : 'isCheckpointP2';
    if (stepsRef.current - checkRef.current >= CHECKPOINT_EVERY) {
      checkRef.current = stepsRef.current;
      const old = cpRef.current;
      if (cellsRef.current?.[old.r]?.[old.c]) cellsRef.current[old.r][old.c][flagKey] = false;
      cpRef.current = { r, c };
      if (cellsRef.current?.[r]?.[c]) cellsRef.current[r][c][flagKey] = true;
      showFlash(`⬡ Player ${isP1?1:2} Checkpoint saved`, 'info', 1000);
    }
  }

  function drawMaze() {
    const canvas = mazeRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const C = CELL, W = COLS*C, H = ROWS*C;
    const cells = cellsRef.current; if (!cells) return;
    const {r:p1r,c:p1c} = p1GridPos.current, {x:p1x,y:p1y} = p1PixelPos.current;
    const {r:p2r,c:p2c} = p2GridPos.current, {x:p2x,y:p2y} = p2PixelPos.current;
    const flicker = flickerRef.current, VIS = visRef.current;

    ctx.fillStyle='#030308'; ctx.fillRect(0,0,W,H);
    if (caughtFlashRef.current > 0) {
      ctx.fillStyle=`rgba(200,0,0,${(caughtFlashRef.current/45)*0.45})`; ctx.fillRect(0,0,W,H);
    }
    const addGlow = (px,py,r,g,b) => {
      const gr=ctx.createRadialGradient(px,py,0,px,py,VIS*C*1.1);
      gr.addColorStop(0,`rgba(${r},${g},${b},0.15)`); gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
    };
    if (!p1Done.current) addGlow(p1x,p1y,30,60,150);
    if (!p2Done.current) addGlow(p2x,p2y,30,150,60);

    cells.forEach((row,r)=>row.forEach((cell,c)=>{
      let dist=1000;
      if (!p1Done.current) dist=Math.min(dist,Math.sqrt((r-p1r)**2+(c-p1c)**2));
      if (!p2Done.current) dist=Math.min(dist,Math.sqrt((r-p2r)**2+(c-p2c)**2));
      if (dist>VIS+0.5&&!roundDone.current&&!DEV_DISABLE_DARKNESS) return;
      const raw=(roundDone.current||DEV_DISABLE_DARKNESS)?1:Math.max(0,1-dist/(VIS+1.8));
      const op=raw*raw*(3-2*raw);
      const x=c*C,y=r*C,isExit=(r===EXIT_R&&c===EXIT_C);
      const pulse=0.5+0.5*Math.sin(flicker*0.07);
      if (isExit) ctx.fillStyle=`rgba(180,${180+pulse*60},40,${op*(0.35+pulse*0.1)})`;
      else if (cell.isCheckpointP1) ctx.fillStyle=`rgba(30,60,180,${op*0.25})`;
      else if (cell.isCheckpointP2) ctx.fillStyle=`rgba(30,180,60,${op*0.25})`;
      else ctx.fillStyle=`rgba(12,12,28,${op*0.15})`;
      ctx.fillRect(x,y,C,C);
      const wa=op*0.85;
      const wc1=isExit?`rgba(220,180,80,${wa})`:`rgba(160,120,35,${wa})`;
      const wc2=isExit?`rgba(100,80,40,${wa*.5})`:`rgba(80,60,15,${wa*.4})`;
      ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=3;
      const dw=(x1,y1,x2,y2)=>{
        const g=ctx.createLinearGradient(x1,y1,x2,y2);
        g.addColorStop(0,wc1);g.addColorStop(0.5,wc2);g.addColorStop(1,wc1);
        ctx.strokeStyle=g; ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      };
      if(cell.walls.N)dw(x+1,y,x+C-1,y);
      if(cell.walls.S)dw(x+1,y+C,x+C-1,y+C);
      if(cell.walls.W)dw(x,y+1,x,y+C-1);
      if(cell.walls.E)dw(x+C,y+1,x+C,y+C-1);
      if(isExit){
        ctx.fillStyle=`rgba(${200+pulse*50},${200+pulse*50},100,${op*(0.8+pulse*0.2)})`;
        ctx.font=`bold ${11+pulse*2}px 'Cinzel',serif`;
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.shadowColor='rgba(255,255,100,0.8)';ctx.shadowBlur=8+pulse*8;
        ctx.fillText('EXIT',x+C/2,y+C/2);ctx.shadowBlur=0;
      }
      if(cell.isCheckpointP1&&!(r===p1r&&c===p1c)){
        ctx.fillStyle=`rgba(60,120,255,${op*0.7})`;ctx.font='14px serif';
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⬡',x+C/2,y+C/2);
      }
      if(cell.isCheckpointP2&&!(r===p2r&&c===p2c)){
        ctx.fillStyle=`rgba(60,255,120,${op*0.7})`;ctx.font='14px serif';
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⬡',x+C/2,y+C/2);
      }
    }));

    // Vision shrink bar
    const elp=(Date.now()-mazeStartRef.current)/1000;
    if(elp>VISION_GRACE_S&&!DEV_DISABLE_DARKNESS){
      const pct=Math.min(1,(elp-VISION_GRACE_S)/VISION_SHRINK_S);
      ctx.fillStyle='rgba(200,100,30,0.7)'; ctx.fillRect(0,0,W*(1-pct),4);
    }

    const drawTrail=(arr,col)=>{
      for(let i=1;i<arr.length;i++){
        const a=(i/arr.length)*0.45, rad=2+(i/arr.length)*4;
        const g=ctx.createRadialGradient(arr[i].x,arr[i].y,0,arr[i].x,arr[i].y,rad);
        g.addColorStop(0,col(a));g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(arr[i].x,arr[i].y,rad,0,Math.PI*2);ctx.fill();
      }
    };
    if(!p1Done.current) drawTrail(p1Trail.current,a=>`rgba(80,160,255,${a})`);
    if(!p2Done.current) drawTrail(p2Trail.current,a=>`rgba(80,255,120,${a})`);
    if(!roundDone.current){
      drawTrail(h1Trail.current,a=>`rgba(255,40,40,${a})`);
      drawTrail(h2Trail.current,a=>`rgba(40,160,255,${a})`);
    }

    const drawPlayer=(px,py,cc,gc)=>{
      const orbR=CELL/2.8;
      const cg=ctx.createRadialGradient(px,py,0,px,py,orbR*0.5);
      cg.addColorStop(0,'rgba(255,255,255,1)');cg.addColorStop(1,cc);
      ctx.fillStyle=cg;ctx.shadowColor=cc;ctx.shadowBlur=18;
      ctx.beginPath();ctx.arc(px,py,orbR*0.5,0,Math.PI*2);ctx.fill();
      const hg=ctx.createRadialGradient(px,py,orbR*0.4,px,py,orbR*1.6);
      hg.addColorStop(0,gc);hg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=hg;ctx.shadowBlur=0;
      ctx.beginPath();ctx.arc(px,py,orbR*1.6,0,Math.PI*2);ctx.fill();
    };
    if(!p1Done.current) drawPlayer(p1x,p1y,'rgba(80,160,255,0.9)','rgba(40,80,255,0.3)');
    if(!p2Done.current) drawPlayer(p2x,p2y,'rgba(80,255,120,0.9)','rgba(40,255,80,0.3)');

    const drawHunter=(hx,hy,isRed)=>{
      const orbR=CELL/2.8,pulse=0.5+0.5*Math.sin(flicker*0.18);
      const cg=ctx.createRadialGradient(hx,hy,0,hx,hy,orbR*0.5);
      cg.addColorStop(0,'rgba(255,255,200,1)');
      cg.addColorStop(1,isRed?'rgba(255,60,30,0.95)':'rgba(30,120,255,0.95)');
      ctx.fillStyle=cg;ctx.shadowColor=isRed?'rgba(255,40,40,1)':'rgba(40,160,255,1)';ctx.shadowBlur=22;
      ctx.beginPath();ctx.arc(hx,hy,orbR*0.5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=isRed?`rgba(255,60,40,${0.4+pulse*0.5})`:`rgba(40,160,255,${0.4+pulse*0.5})`;
      ctx.lineWidth=1.5;ctx.shadowColor=isRed?'rgba(255,40,40,0.8)':'rgba(40,160,255,0.8)';ctx.shadowBlur=10;
      ctx.beginPath();ctx.arc(hx,hy,orbR*(1.2+pulse*0.4),0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
    };
    if(!roundDone.current){
      drawHunter(h1PixelPos.current.x,h1PixelPos.current.y,true);
      drawHunter(h2PixelPos.current.x,h2PixelPos.current.y,false);
    }

    particles.current.forEach(p=>{
      const color=p.hue==='gold'?`rgba(255,200,60,${p.life*0.8})`:p.hue==='red'?`rgba(255,80,40,${p.life*0.8})`:p.hue==='green'?`rgba(80,255,120,${p.life*0.8})`:`rgba(80,160,255,${p.life*0.8})`;
      const g2=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*2);
      g2.addColorStop(0,color);g2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g2;ctx.beginPath();ctx.arc(p.x,p.y,p.r*2,0,Math.PI*2);ctx.fill();
    });
  }

  function drawMinimap() {
    const canvas=mmRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d');
    const MC=isFullscreen?6:4, cells=cellsRef.current; if(!cells) return;
    if(canvas.width!==COLS*MC){canvas.width=COLS*MC;canvas.height=ROWS*MC;canvas.style.width=`${COLS*MC}px`;canvas.style.height=`${ROWS*MC}px`;}
    ctx.fillStyle='rgba(3,3,12,1)';ctx.fillRect(0,0,COLS*MC,ROWS*MC);
    cells.forEach((row,r)=>row.forEach((cell,c)=>{
      const x=c*MC,y=r*MC;
      const isExit=(r===EXIT_R&&c===EXIT_C);
      const isP1=!p1Done.current&&r===p1GridPos.current.r&&c===p1GridPos.current.c;
      const isP2=!p2Done.current&&r===p2GridPos.current.r&&c===p2GridPos.current.c;
      const isH1=!roundDone.current&&r===h1GridPos.current.r&&c===h1GridPos.current.c;
      const isH2=!roundDone.current&&r===h2GridPos.current.r&&c===h2GridPos.current.c;
      if(isP1)ctx.fillStyle='rgba(80,160,255,1)';
      else if(isP2)ctx.fillStyle='rgba(80,255,120,1)';
      else if(isH1)ctx.fillStyle='rgba(255,50,30,1)';
      else if(isH2)ctx.fillStyle='rgba(30,120,255,1)';
      else if(isExit)ctx.fillStyle='rgba(200,200,50,0.85)';
      else ctx.fillStyle=cell.explored?'rgba(90,70,25,0.7)':'rgba(30,20,10,0.4)';
      ctx.fillRect(x+1,y+1,MC-2,MC-2);
      ctx.strokeStyle=cell.explored?'rgba(50,40,15,0.9)':'rgba(20,15,5,0.3)';ctx.lineWidth=0.5;
      if(cell.walls.N){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+MC,y);ctx.stroke();}
      if(cell.walls.S){ctx.beginPath();ctx.moveTo(x,y+MC);ctx.lineTo(x+MC,y+MC);ctx.stroke();}
      if(cell.walls.W){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+MC);ctx.stroke();}
      if(cell.walls.E){ctx.beginPath();ctx.moveTo(x+MC,y);ctx.lineTo(x+MC,y+MC);ctx.stroke();}
    }));
  }

  function move(playerType, dr, dc) {
    if(roundDone.current) return;
    const isP1=playerType==='P1';
    if(isP1&&p1Done.current) return;
    if(!isP1&&p2Done.current) return;
    const cells=cellsRef.current;
    const gp=isP1?p1GridPos.current:p2GridPos.current;
    const {r,c}=gp;
    const dirMap={'-10':'N','10':'S','0-1':'W','01':'E'};
    const dir=dirMap[`${dr}${dc}`];
    if(!dir||cells[r][c].walls[dir]){
      const px=isP1?p1PixelPos.current.x:p2PixelPos.current.x;
      const py=isP1?p1PixelPos.current.y:p2PixelPos.current.y;
      for(let i=0;i<6;i++) particles.current.push(createParticle(px+dc*CELL*0.6,py+dr*CELL*0.6,isP1?'blue':'green'));
      audio?.playClick?.(); return;
    }
    const nr=r+dr,nc=c+dc;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS) return;
    if(isP1){p1GridPos.current={r:nr,c:nc};p1TargetPos.current={x:nc*CELL+CELL/2,y:nr*CELL+CELL/2};p1StepsRef.current++;setP1Steps(p1StepsRef.current);}
    else{p2GridPos.current={r:nr,c:nc};p2TargetPos.current={x:nc*CELL+CELL/2,y:nr*CELL+CELL/2};p2StepsRef.current++;setP2Steps(p2StepsRef.current);}
    cells[nr][nc].explored=true; audio?.playClick?.();
    const px=isP1?p1PixelPos.current.x:p2PixelPos.current.x;
    const py=isP1?p1PixelPos.current.y:p2PixelPos.current.y;
    for(let i=0;i<3;i++) particles.current.push(createParticle(px,py,isP1?'blue':'green'));
    checkCatch(); tryCheckpoint(playerType,nr,nc);
    if(nr===EXIT_R&&nc===EXIT_C){
      if(isP1)p1Done.current=true; else p2Done.current=true;
      for(let i=0;i<40;i++) particles.current.push(createParticle(px,py,'gold'));
      if(p1Done.current&&p2Done.current) mazeComplete();
    }
  }

  async function mazeComplete() {
    roundDone.current=true; setDone(true);
    collectFragment(1, config.fragments[1]);
    audio?.playSuccess?.();
    showFlash(`Fragment 2 unlocked: ${config.fragments[1]}`,'info',4000);
    setCelebrate(true);
    setTimeout(()=>{ setRevealed(true); if(isFullscreen) setIsFullscreen(false); },600);
    if(team) await saveProgress(team.id,{currentRound:3,fragment2:config.fragments[1],mazeStepsP1:p1StepsRef.current,mazeStepsP2:p2StepsRef.current,elapsedSeconds:getElapsedNow?getElapsedNow():undefined});
  }

  const moveRef=useRef(null); moveRef.current=move;
  const keyMapRef=useRef(null);
  useEffect(()=>{
    keyMapRef.current={
      p1:{ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]},
      p2:{w:[-1,0],W:[-1,0],s:[1,0],S:[1,0],a:[0,-1],A:[0,-1],d:[0,1],D:[0,1]},
    };
    const handler=e=>{
      if(!keyMapRef.current) return;
      const p1d=keyMapRef.current.p1[e.key]; if(p1d){e.preventDefault();moveRef.current('P1',...p1d);return;}
      const p2d=keyMapRef.current.p2[e.key]; if(p2d){e.preventDefault();moveRef.current('P2',...p2d);}
    };
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  },[]); // eslint-disable-line

  const W=COLS*CELL,H=ROWS*CELL;
  const displayW=Math.min(W,600), displayH=displayW*H/W;
  const canvasStyle=isFullscreen?{width:'100%',height:'100%',objectFit:'contain'}:{width:displayW,height:displayH};
  const visPercent=Math.round((visRef.current/BASE_VIS)*100);

  const containerClass=isFullscreen?'fullscreen-maze-container':'screen screen-padded maze-screen-entry';
  const panelClass=isFullscreen?'fullscreen-maze-panel':'panel panel-lg';
  const fsContStyle=isFullscreen?{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'#020205',zIndex:9999,display:'flex',flexDirection:'row',padding:'1rem',boxSizing:'border-box'}:{};
  const fsSideStyle=isFullscreen?{width:'240px',background:'rgba(10,10,20,0.8)',padding:'1rem',borderRight:'1px solid var(--gold-dim)',display:'flex',flexDirection:'column',height:'100%',flexShrink:0}:{};
  const fsMainStyle=isFullscreen?{flexGrow:1,display:'flex',justifyContent:'center',alignItems:'center',padding:'1rem',height:'100%',overflow:'hidden'}:{};

  return (
    <div className={containerClass} style={fsContStyle}>
      {isFullscreen && (
        <div style={fsSideStyle}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <h2 style={{fontSize:'1.2rem',margin:0,color:'var(--gold)'}}>MAP</h2>
            <button className="btn btn-sm" onClick={()=>setIsFullscreen(false)}>Exit</button>
          </div>
          <div style={{background:'#000',border:'1px solid #333',padding:'0.5rem',marginBottom:'1.5rem',alignSelf:'center'}}>
            <canvas ref={mmRef} id="minimap" />
          </div>
          <div style={{flexGrow:1}}>
            <h3 style={{fontSize:'0.9rem',marginBottom:'0.8rem',color:'#888'}}>CONTROLS</h3>
            <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem'}}>
              <div style={{flex:1,border:'1px solid rgba(80,160,255,0.4)',padding:'0.5rem',background:'rgba(20,40,80,0.3)',borderRadius:'4px'}}>
                <div style={{color:'#50a0ff',fontSize:'0.85rem',fontWeight:'bold',marginBottom:'0.5rem'}}>P1 (BLUE)</div>
                <div style={{fontSize:'1rem',color:'#ccc',letterSpacing:'2px'}}>ARROWS</div>
                <div style={{fontSize:'0.65rem',color:'#888',fontStyle:'italic',marginTop:'0.2rem'}}>Up, Down, Left, Right</div>
                <div style={{fontSize:'0.7rem',color:'#555',marginTop:'0.5rem'}}>Steps: {p1Steps}</div>
              </div>
              <div style={{flex:1,border:'1px solid rgba(80,255,120,0.4)',padding:'0.5rem',background:'rgba(20,60,30,0.3)',borderRadius:'4px'}}>
                <div style={{color:'var(--green)',fontSize:'0.85rem',fontWeight:'bold',marginBottom:'0.5rem'}}>P2 (GREEN)</div>
                <div style={{fontSize:'1rem',color:'#ccc',letterSpacing:'2px'}}>W A S D</div>
                <div style={{fontSize:'0.65rem',color:'#888',fontStyle:'italic',marginTop:'0.2rem'}}>W: Up, S: Down, A: Left, D: Right</div>
                <div style={{fontSize:'0.7rem',color:'#555',marginTop:'0.5rem'}}>Steps: {p2Steps}</div>
              </div>
            </div>
            <div className="divider" style={{margin:'1rem 0'}} />
            <div style={{fontSize:'0.8rem',color:'#999',lineHeight:1.6}}>
              Goal: Navigate both players to the <b>EXIT</b> in the exact center.<br /><br />
              <span style={{color:'var(--red)'}}>Red Hunter</span> chases P1 (Blue).<br />
              <span style={{color:'#28a0ff'}}>Blue Hunter</span> chases P2 (Green).<br /><br />
              Vision shrinks over time.
            </div>
          </div>
          <div style={{marginTop:'auto'}}>
            <div style={{fontSize:'0.72rem',color:'#555',margin:'0.5rem 0 0.2rem'}}>Total Deaths</div>
            <div style={{fontFamily:'Cinzel,serif',fontSize:'1.2rem',color:deaths>0?'var(--red)':'#444'}}>{deaths}</div>
          </div>
        </div>
      )}

      <div className={panelClass} style={fsMainStyle}>
        {!isFullscreen && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h2>⬡ SECURITY LAYER II</h2>
                <p className="subtitle">Co-op Dark Maze <span className={`diff-badge ${config.difficulty}`}>{config.difficulty}</span></p>
              </div>
              <button className="btn btn-outline" onClick={()=>setIsFullscreen(true)}>⛶ Full Screen</button>
            </div>
            <ProgressTrack current={2} />
            <div className="voice-box">
              <div className="voice-speaker">⬡ Vault AI — CO-OP PROTOCOL</div>
              Two players required. Reach the central EXIT.
              <span style={{color:'var(--red)'}}> Avoid Hunters.</span>
            </div>
          </>
        )}

        <div style={{display:'flex',gap:'2rem',alignItems:'flex-start',justifyContent:'center',flexWrap:'wrap',marginTop:isFullscreen?'0':'1rem',height:isFullscreen?'100%':'auto',width:'100%'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',height:isFullscreen?'100%':'auto',width:isFullscreen?'100%':'auto'}}>
            {!isFullscreen && (
              <div style={{fontSize:'0.62rem',letterSpacing:'0.15em',color:'#444',textTransform:'uppercase',marginBottom:'0.5rem',textAlign:'center'}}>
                P2: WASD &nbsp;|&nbsp; P1: Arrows
              </div>
            )}
            <div className="maze-wrap" style={{height:isFullscreen?'100%':'auto',width:isFullscreen?'100%':'auto',display:'flex',justifyContent:'center'}}>
              <canvas ref={mazeRef} id="maze-canvas" width={W} height={H} style={canvasStyle} />
              {!isFullscreen && <canvas ref={mmRef} id="minimap" width={COLS*4} height={ROWS*4} style={{width:COLS*4,height:ROWS*4}} />}
            </div>
          </div>

          {!isFullscreen && (
            <div style={{minWidth:155}}>
              <h3 style={{fontSize:'0.8rem',marginBottom:'0.8rem'}}>Steps</h3>
              <div style={{display:'flex',gap:'1rem',marginBottom:'0.8rem'}}>
                <div>
                  <div style={{fontSize:'0.65rem',color:'var(--green)'}}>P2 (WASD)</div>
                  <div style={{fontFamily:'Cinzel,serif',fontSize:'1.1rem'}}>{p2Steps}</div>
                </div>
                <div>
                  <div style={{fontSize:'0.65rem',color:'#50a0ff'}}>P1 (Arrows)</div>
                  <div style={{fontFamily:'Cinzel,serif',fontSize:'1.1rem'}}>{p1Steps}</div>
                </div>
              </div>
              <div className="divider" style={{margin:'0.8rem 0'}} />
              <div style={{fontSize:'0.72rem',color:'#555',margin:'0.6rem 0 0.2rem'}}>Deaths</div>
              <div style={{fontFamily:'Cinzel,serif',fontSize:'1.1rem',color:deaths>0?'var(--red)':'#444'}}>{deaths}</div>
              <div style={{fontSize:'0.72rem',color:'#555',margin:'0.6rem 0 0.2rem'}}>Vision</div>
              <div className="maze-vis-bar">
                <div className="maze-vis-fill" style={{width:`${visPercent}%`,background:visPercent>60?'var(--gold)':visPercent>30?'#c85':'var(--red)'}} />
              </div>
              <div style={{marginTop:'1rem',fontSize:'0.7rem',color:'#888'}}>Exit is at exactly the center.</div>
              {done && <div style={{fontSize:'0.8rem',color:'var(--green)',marginTop:'0.6rem',animation:'fadeUp 0.4s ease'}}>✓ Co-op Firewall bypassed!</div>}
            </div>
          )}
        </div>

        {celebrate && !isFullscreen && (
          <div className={`maze-celebrate ${revealed?'maze-celebrate--in':''}`}>
            {revealed && (
              <>
                <div className="frag-reveal">
                  <div className="frag-label">⬡ Vault Fragment 2 Acquired</div>
                  <div className="frag-value">{config.fragments[1]}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <button className="btn btn-primary" onClick={()=>setScreen('r3')}>
                    ADVANCE TO LAYER III →
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
