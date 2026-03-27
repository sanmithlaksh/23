import { useEffect, useRef } from 'react';

export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    let raf;

    const mouse = { x: 0.5, y: 0.5 };
    const smooth = { x: 0.5, y: 0.5 };
    let ripples = [];
    let nebulae = [];
    let stars = [];
    let orbs = [];
    let nodes = [];
    let shootingStars = [];
    let time = 0;

    function resize() {
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
      init();
    }

    function init() {
      const W = c.width, H = c.height;

      // Deep background stars — many, tiny, barely moving
      stars = Array.from({ length: 300 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 0.9 + 0.2,
        o: Math.random() * 0.55 + 0.05,
        ds: (Math.random() - 0.5) * 0.008,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.08,
        depth: Math.random() * 0.4 + 0.05,
      }));

      // Nebula clouds — large soft blobs that drift slowly
      nebulae = Array.from({ length: 6 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        rx: 180 + Math.random() * 280,
        ry: 120 + Math.random() * 200,
        o: Math.random() * 0.06 + 0.02,
        hue: [42, 200, 270, 320, 180][Math.floor(Math.random() * 5)],
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.07,
        rot: Math.random() * Math.PI * 2,
        drot: (Math.random() - 0.5) * 0.001,
      }));

      // Mid-layer glowing orbs
      orbs = Array.from({ length: 22 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 2.2 + 1.0,
        o: Math.random() * 0.4 + 0.08,
        ds: (Math.random() - 0.5) * 0.015,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.35,
        hue: [42, 200, 270, 45, 190][Math.floor(Math.random() * 5)],
        depth: Math.random() * 0.55 + 0.25,
        pulse: Math.random() * Math.PI * 2,
      }));

      // Interactive node web
      const count = Math.min(80, Math.floor(W * H / 12000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        r: Math.random() * 1.8 + 0.5,
        o: Math.random() * 0.3 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      }));
    }

    // ── Events ──────────────────────────────────────────────
    function onMove(e) {
      mouse.x = (e.clientX || e.touches?.[0]?.clientX || 0) / c.width;
      mouse.y = (e.clientY || e.touches?.[0]?.clientY || 0) / c.height;
    }
    function onClick(e) {
      for (let i = 0; i < 3; i++) {
        ripples.push({
          x: e.clientX, y: e.clientY,
          r: 0, maxR: 100 + Math.random() * 120 + i * 40,
          o: 0.6 - i * 0.15,
          speed: 3.5 + Math.random() * 2 - i * 0.5,
          hue: 42 + Math.random() * 20,
        });
      }
      // Spawn a shooting star on click too
      spawnShootingStar(e.clientX, e.clientY);
    }
    function spawnShootingStar(ox, oy) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 10;
      shootingStars.push({
        x: ox || Math.random() * c.width,
        y: oy || Math.random() * c.height * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 2,
        len: 60 + Math.random() * 80,
        o: 1,
        life: 1,
      });
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('click', onClick);

    // Periodically spawn shooting stars
    const shootInterval = setInterval(() => {
      if (Math.random() < 0.6) spawnShootingStar();
    }, 2200);

    // ── Draw ─────────────────────────────────────────────────
    function draw() {
      const W = c.width, H = c.height;
      time += 0.012;

      smooth.x += (mouse.x - smooth.x) * 0.08;
      smooth.y += (mouse.y - smooth.y) * 0.08;
      const mx = smooth.x * W, my = smooth.y * H;

      // ── Deep space base ──────────────────────────────────
      ctx.fillStyle = '#03020d';
      ctx.fillRect(0, 0, W, H);

      // ── Nebulae ──────────────────────────────────────────
      nebulae.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.rot += n.drot;
        if (n.x < -n.rx) n.x = W + n.rx;
        if (n.x > W + n.rx) n.x = -n.rx;
        if (n.y < -n.ry) n.y = H + n.ry;
        if (n.y > H + n.ry) n.y = -n.ry;
        // Parallax
        const px = (smooth.x - 0.5) * 30;
        const py = (smooth.y - 0.5) * 20;
        ctx.save();
        ctx.translate(n.x + px, n.y + py);
        ctx.rotate(n.rot);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
        grad.addColorStop(0, `hsla(${n.hue},65%,55%,${n.o})`);
        grad.addColorStop(0.4, `hsla(${n.hue},55%,40%,${n.o * 0.5})`);
        grad.addColorStop(1, `hsla(${n.hue},40%,25%,0)`);
        ctx.scale(1, n.ry / n.rx);
        ctx.beginPath();
        ctx.arc(0, 0, n.rx, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      // ── Stars ────────────────────────────────────────────
      stars.forEach(s => {
        const px = (smooth.x - 0.5) * s.depth * 60;
        const py = (smooth.y - 0.5) * s.depth * 40;
        s.x += s.vx; s.y += s.vy;
        s.o += s.ds;
        if (s.o < 0.04 || s.o > 0.65) s.ds *= -1;
        if (s.x < -5) s.x = W + 5;
        if (s.x > W + 5) s.x = -5;
        if (s.y < -5) s.y = H + 5;
        if (s.y > H + 5) s.y = -5;
        // Star cross glint for brighter stars
        if (s.r > 0.85) {
          ctx.strokeStyle = `rgba(220,205,170,${s.o * 0.5})`;
          ctx.lineWidth = 0.5;
          const gx = s.x + px, gy = s.y + py;
          ctx.beginPath(); ctx.moveTo(gx - s.r * 2.5, gy); ctx.lineTo(gx + s.r * 2.5, gy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(gx, gy - s.r * 2.5); ctx.lineTo(gx, gy + s.r * 2.5); ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(s.x + px, s.y + py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,205,170,${s.o})`;
        ctx.fill();
      });

      // ── Shooting stars ───────────────────────────────────
      shootingStars = shootingStars.filter(s => s.life > 0);
      shootingStars.forEach(s => {
        s.x += s.vx; s.y += s.vy;
        s.life -= 0.025;
        s.o = s.life;
        const tail = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 5, s.y - s.vy * 5);
        tail.addColorStop(0, `rgba(240,220,160,${s.o * 0.95})`);
        tail.addColorStop(1, 'rgba(240,220,160,0)');
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * (s.len / 8), s.y - s.vy * (s.len / 8));
        ctx.strokeStyle = tail;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // ── Glowing orbs ─────────────────────────────────────
      orbs.forEach(o => {
        const px = (smooth.x - 0.5) * o.depth * 90;
        const py = (smooth.y - 0.5) * o.depth * 60;
        o.x += o.vx; o.y += o.vy;
        o.o += o.ds;
        o.pulse += 0.04;
        if (o.o < 0.05 || o.o > 0.5) o.ds *= -1;
        if (o.x < -30) o.x = W + 30;
        if (o.x > W + 30) o.x = -30;
        if (o.y < -30) o.y = H + 30;
        if (o.y > H + 30) o.y = -30;
        const pulseFactor = 1 + Math.sin(o.pulse) * 0.2;
        const gx = o.x + px, gy = o.y + py;
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, o.r * 5 * pulseFactor);
        grad.addColorStop(0, `hsla(${o.hue},80%,75%,${o.o})`);
        grad.addColorStop(0.3, `hsla(${o.hue},70%,55%,${o.o * 0.5})`);
        grad.addColorStop(1, `hsla(${o.hue},60%,40%,0)`);
        ctx.beginPath();
        ctx.arc(gx, gy, o.r * 5 * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
      });

      // ── Scan lines — subtle CRT feel ─────────────────────
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
      }

      // ── Node web ─────────────────────────────────────────
      const CONNECT = 140, REPEL = 110;
      nodes.forEach(n => {
        n.pulse += 0.05;
        const dx = n.x - mx, dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL && dist > 0) {
          const force = ((REPEL - dist) / REPEL) * 3.5;
          n.vx += (dx / dist) * force * 0.5;
          n.vy += (dy / dist) * force * 0.5;
        }
        // Slight attraction toward center to keep nodes on screen
        n.vx += (W * 0.5 - n.x) * 0.00005;
        n.vy += (H * 0.5 - n.y) * 0.00005;
        n.vx *= 0.984; n.vy *= 0.984;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) { n.x = 0; n.vx *= -1; }
        if (n.x > W) { n.x = W; n.vx *= -1; }
        if (n.y < 0) { n.y = 0; n.vy *= -1; }
        if (n.y > H) { n.y = H; n.vy *= -1; }
      });
      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT) {
            const alpha = (1 - d / CONNECT) * 0.22;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(201,168,76,${alpha})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      // Node dots with pulse
      nodes.forEach(n => {
        const dx = n.x - mx, dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const boost = dist < REPEL ? (1 - dist / REPEL) * 0.45 : 0;
        const pulse = 1 + Math.sin(n.pulse) * 0.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, (n.r + boost * 2) * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,76,${Math.min(n.o + boost, 0.8)})`;
        ctx.fill();
      });

      // ── Cursor aura ──────────────────────────────────────
      const aura = ctx.createRadialGradient(mx, my, 0, mx, my, 130);
      aura.addColorStop(0, 'rgba(201,168,76,0.08)');
      aura.addColorStop(0.5, 'rgba(100,60,200,0.03)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(mx, my, 130, 0, Math.PI * 2);
      ctx.fillStyle = aura; ctx.fill();

      // ── Ripples ──────────────────────────────────────────
      ripples = ripples.filter(rp => rp.o > 0.008);
      ripples.forEach(rp => {
        rp.r += rp.speed * 1.4;
        rp.speed *= 0.975;
        rp.o *= 0.91;
        // Outer ring
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${rp.hue},70%,60%,${rp.o})`;
        ctx.lineWidth = 1.2; ctx.stroke();
        // Inner ring
        if (rp.r > 25) {
          ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r * 0.6, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${rp.hue},60%,50%,${rp.o * 0.4})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
        // Tiny center flash on first frame
        if (rp.r < 12) {
          ctx.beginPath(); ctx.arc(rp.x, rp.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${rp.hue},80%,75%,${rp.o})`;
          ctx.fill();
        }
      });

      // ── Slow ambient vignette pulse ───────────────────────
      const vignette = ctx.createRadialGradient(W/2, H/2, H * 0.3, W/2, H/2, H * 0.85);
      const vPulse = 0.18 + Math.sin(time * 0.4) * 0.04;
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, `rgba(2,1,10,${vPulse})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(shootInterval);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', width:'100%', height:'100%' }}
    />
  );
}
