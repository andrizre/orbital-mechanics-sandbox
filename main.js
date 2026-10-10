// Orbital Mechanics Sandbox — N-body gravity playground
// Physics: Velocity Verlet integration, softened Newtonian gravity.
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let DPR = Math.min(window.devicePixelRatio || 1, 2);

const G = 6000;           // gravitational constant (sim units)
const SOFT = 40;          // softening radius squared factor
const TRAIL_MAX = 500;

let bodies = [];
let paused = false;
let timeScale = 1;
let zoom = 1;
let camera = { x: 0, y: 0 };   // world coords at screen center
let dragMode = 'orbit';        // 'orbit' | 'slingshot' | 'body'
let showTrails = true;
let showVectors = false;
let collisions = true;
let totalCollisions = 0;

const rand = (a, b) => a + Math.random() * (b - a);

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * DPR;
  canvas.height = innerHeight * DPR;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
}
addEventListener('resize', resize);
resize();

function makeBody(x, y, vx, vy, mass, color, fixed = false) {
  return {
    x, y, vx, vy, ax: 0, ay: 0,
    mass,
    radius: Math.max(2.2, Math.cbrt(mass) * 1.6),
    color,
    fixed,
    trail: [],
    id: Math.random().toString(36).slice(2),
  };
}

function computeAccelerations() {
  for (const b of bodies) { b.ax = 0; b.ay = 0; }
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const r2 = dx * dx + dy * dy + SOFT;
      const r = Math.sqrt(r2);
      const f = G / (r2 * r); // G / r^3, multiplied by dx below
      a.ax += f * b.mass * dx; a.ay += f * b.mass * dy;
      b.ax -= f * a.mass * dx; b.ay -= f * a.mass * dy;
    }
  }
}

function step(dt) {
  // Velocity Verlet
  computeAccelerations();
  for (const b of bodies) {
    if (b.fixed) continue;
    b.vx += 0.5 * b.ax * dt;
    b.vy += 0.5 * b.ay * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  computeAccelerations();
  for (const b of bodies) {
    if (b.fixed) continue;
    b.vx += 0.5 * b.ax * dt;
    b.vy += 0.5 * b.ay * dt;
  }
  if (collisions) resolveCollisions();
  if (showTrails) {
    for (const b of bodies) {
      b.trail.push(b.x, b.y);
      if (b.trail.length > TRAIL_MAX * 2) b.trail.splice(0, b.trail.length - TRAIL_MAX * 2);
    }
  } else {
    for (const b of bodies) b.trail.length = 0;
  }
}

function resolveCollisions() {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < a.radius + b.radius) {
        // merge: conserve momentum
        const m = a.mass + b.mass;
        const merged = makeBody(
          (a.x * a.mass + b.x * b.mass) / m,
          (a.y * a.mass + b.y * b.mass) / m,
          (a.vx * a.mass + b.vx * b.mass) / m,
          (a.vy * a.mass + b.vy * b.mass) / m,
          m, a.mass >= b.mass ? a.color : b.color,
          a.fixed || b.fixed
        );
        bodies.splice(j, 1);
        bodies.splice(i, 1, merged);
        totalCollisions++;
        return; // restart scan
      }
    }
  }
}

// ---------- Camera ----------
function worldToScreen(x, y) {
  return [(x - camera.x) * zoom + innerWidth / 2, (y - camera.y) * zoom + innerHeight / 2];
}
function screenToWorld(sx, sy) {
  return [(sx - innerWidth / 2) / zoom + camera.x, (sy - innerHeight / 2) / zoom + camera.y];
}

// ---------- Presets ----------
function clearBodies() { bodies = []; totalCollisions = 0; }

function presetSunSystem() {
  clearBodies();
  const sun = makeBody(0, 0, 0, 0, 2000, '#ffd166', true);
  bodies.push(sun);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const r = 90 + i * 62;
    const v = Math.sqrt(G * sun.mass / r);
    const ang = rand(0, Math.PI * 2);
    const col = `hsl(${rand(160, 260)}, 80%, 65%)`;
    const b = makeBody(Math.cos(ang) * r, Math.sin(ang) * r,
      -Math.sin(ang) * v, Math.cos(ang) * v, rand(2, 20), col);
    bodies.push(b);
  }
  camera = { x: 0, y: 0 }; zoom = Math.min(innerWidth, innerHeight) / 900;
}

function presetBinary() {
  clearBodies();
  const m = 900, d = 180;
  const v = Math.sqrt(G * m / (2 * d)) * 0.98;
  bodies.push(makeBody(-d / 2, 0, 0, -v, m, '#ff9770', true));
  bodies.push(makeBody(d / 2, 0, 0, v, m, '#6ee7db', true));
  for (let i = 0; i < 14; i++) {
    const r = rand(280, 560), ang = rand(0, Math.PI * 2);
    const vv = Math.sqrt(G * (2 * m) / r);
    bodies.push(makeBody(Math.cos(ang) * r, Math.sin(ang) * r,
      -Math.sin(ang) * vv, Math.cos(ang) * vv, rand(1, 5), '#a3b18a'));
  }
  camera = { x: 0, y: 0 }; zoom = Math.min(innerWidth, innerHeight) / 1200;
}

function presetCluster() {
  clearBodies();
  const M = 1400;
  bodies.push(makeBody(0, 0, 0, 0, M, '#ffd166', true));
  for (let i = 0; i < 70; i++) {
    const r = Math.pow(Math.random(), 0.5) * 420 + 30;
    const ang = rand(0, Math.PI * 2);
    const v = Math.sqrt(G * M / r) * rand(0.55, 1.0);
    const dir = Math.random() < 0.5 ? 1 : -1;
    bodies.push(makeBody(Math.cos(ang) * r, Math.sin(ang) * r,
      -Math.sin(ang) * v * dir, Math.cos(ang) * v * dir, rand(1, 8),
      `hsl(${rand(0, 360)}, 75%, 65%)`));
  }
  camera = { x: 0, y: 0 }; zoom = Math.min(innerWidth, innerHeight) / 1000;
}

function presetFigure8() {
  // Chenciner–Montgomery figure-eight three-body orbit (equal masses)
  clearBodies();
  // normalized solution coords, scaled
  const s = 320, vs = s * 0.36;
  const p = [
    [0.97000436, -0.24308753, 0.4662036850, 0.4323657300],
    [0.97000436, -0.24308753, 0.4662036850, 0.4323657300],
    [-1, 0, -0.93240737, -0.86473146],
  ];
  const pos = [[p[0][0], p[0][1]], [p[1][0] * -1, p[1][1] * -1], [p[2][0], p[2][1]]];
  // standard initial state: two bodies share one position mirrored
  const init = [
    [0.97000436, -0.24308753, 0.4662036850, 0.4323657300],
    [-0.97000436, 0.24308753, 0.4662036850, 0.4323657300],
    [0, 0, -0.93240737, -0.86473146],
  ];
  const colors = ['#ff9770', '#6ee7db', '#ffd166'];
  for (let i = 0; i < 3; i++) {
    const m = 300;
    bodies.push(makeBody(init[i][0] * s, init[i][1] * s,
      init[i][2] * vs * 2, init[i][3] * vs * 2, m, colors[i]));
  }
  camera = { x: 0, y: 0 }; zoom = Math.min(innerWidth, innerHeight) / 1100;
}

function presetChaos() {
  clearBodies();
  for (let i = 0; i < 5; i++) {
    bodies.push(makeBody(rand(-300, 300), rand(-300, 300),
      rand(-40, 40), rand(-40, 40), rand(150, 400),
      `hsl(${rand(0, 360)}, 80%, 62%)`));
  }
  camera = { x: 0, y: 0 }; zoom = Math.min(innerWidth, innerHeight) / 900;
}

// ---------- Input ----------
let dragging = false;
let dragStart = null;
let dragCurrent = null;
let panning = false;
let panLast = null;
let spaceHeld = false;

canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 1 || e.button === 2 || spaceHeld) {
    panning = true; panLast = { x: e.clientX, y: e.clientY };
    return;
  }
  dragging = true;
  dragStart = screenToWorld(e.clientX, e.clientY);
  dragCurrent = dragStart;
});
canvas.addEventListener('pointermove', (e) => {
  if (panning) {
    camera.x -= (e.clientX - panLast.x) / zoom;
    camera.y -= (e.clientY - panLast.y) / zoom;
    panLast = { x: e.clientX, y: e.clientY };
  } else if (dragging) {
    dragCurrent = screenToWorld(e.clientX, e.clientY);
  }
});
addEventListener('pointerup', (e) => {
  if (panning) { panning = false; return; }
  if (!dragging) return;
  dragging = false;
  const [x, y] = dragStart;
  if (dragMode === 'body') {
    bodies.push(makeBody(x, y, 0, 0, 120, `hsl(${rand(0, 360)}, 80%, 62%)`));
  } else {
    const [tx, ty] = dragCurrent;
    const dx = tx - x, dy = ty - y;
    const [px, py] = screenToWorld(e.clientX, e.clientY);
    const vx = (px - x) * 0.9, vy = (py - y) * 0.9;
    const mass = dragMode === 'slingshot' ? 25 : 60;
    const col = dragMode === 'slingshot' ? '#f472b6' : '#7dd3fc';
    bodies.push(makeBody(x, y, vx, vy, mass, col));
  }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [wx, wy] = screenToWorld(e.clientX, e.clientY);
  zoom *= e.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoom = Math.max(0.05, Math.min(8, zoom));
  // keep point under cursor fixed
  const [sx, sy] = worldToScreen(wx, wy);
  camera.x += (e.clientX - sx) / zoom;
  camera.y += (e.clientY - sy) / zoom;
}, { passive: false });

const KEYS = {
  'Digit1': presetSunSystem, 'Digit2': presetBinary, 'Digit3': presetCluster,
  'Digit4': presetFigure8, 'Digit5': presetChaos,
};
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') { spaceHeld = true; e.preventDefault(); return; }
  if (KEYS[e.code]) KEYS[e.code]();
  if (e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'c' || e.key === 'C') { clearBodies(); }
  if (e.key === 't' || e.key === 'T') { showTrails = !showTrails; ui.trails.checked = showTrails; }
  if (e.key === 'v' || e.key === 'V') { showVectors = !showVectors; ui.vectors.checked = showVectors; }
  if (e.key === 'f' || e.key === 'F') { camera = { x: 0, y: 0 }; }
});
addEventListener('keyup', (e) => { if (e.code === 'Space') spaceHeld = false; });

// ---------- UI ----------
const ui = {
  trails: document.getElementById('trails'),
  vectors: document.getElementById('vectors'),
  collisions: document.getElementById('collisions'),
  pause: document.getElementById('pauseBtn'),
  speed: document.getElementById('speed'),
  mode: document.getElementById('mode'),
  bodyCount: document.getElementById('bodyCount'),
  fps: document.getElementById('fps'),
  collCount: document.getElementById('collCount'),
};

function togglePause() {
  paused = !paused;
  ui.pause.textContent = paused ? '▶ Resume' : '⏸ Pause';
}
ui.pause.onclick = togglePause;
document.getElementById('clearBtn').onclick = () => clearBodies();
document.getElementById('resetView').onclick = () => { camera = { x: 0, y: 0 }; zoom = Math.min(innerWidth, innerHeight) / 1000; };
ui.trails.onchange = e => showTrails = e.target.checked;
ui.vectors.onchange = e => showVectors = e.target.checked;
ui.collisions.onchange = e => collisions = e.target.checked;
ui.speed.oninput = e => timeScale = parseFloat(e.target.value);
ui.mode.onchange = e => dragMode = e.target.value;

// ---------- Render ----------
let simTime = 0;
const FIXED_DT = 1 / 120;

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // starfield background
  ctx.fillStyle = '#070912';
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  // trails
  if (showTrails) {
    for (const b of bodies) {
      if (b.trail.length < 4) continue;
      ctx.beginPath();
      const [sx, sy] = worldToScreen(b.trail[0], b.trail[1]);
      ctx.moveTo(sx, sy);
      for (let i = 2; i < b.trail.length; i += 2) {
        const [x, y] = worldToScreen(b.trail[i], b.trail[i + 1]);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = b.color + '55';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // drag preview
  if (dragging) {
    const [x1, y1] = worldToScreen(dragStart[0], dragStart[1]);
    const [x2, y2] = worldToScreen(dragCurrent[0], dragCurrent[1]);
    ctx.strokeStyle = '#ffffff88';
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x2, y2, 4, 0, 7); ctx.fillStyle = '#ffffff88'; ctx.fill();
  }

  // bodies
  for (const b of bodies) {
    const [x, y] = worldToScreen(b.x, b.y);
    const r = Math.max(1.5, b.radius * zoom);
    if (x < -50 || x > innerWidth + 50 || y < -50 || y > innerHeight + 50) continue;
    // glow
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    grad.addColorStop(0, b.color + '66');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill();
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (b.fixed) {
      ctx.strokeStyle = '#ffffff44';
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 7); ctx.stroke();
    }
    if (showVectors) {
      const k = 0.35;
      ctx.strokeStyle = '#8ef';
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + b.vx * k * zoom, y + b.vy * k * zoom); ctx.stroke();
      const am = Math.hypot(b.ax, b.ay) || 1;
      ctx.strokeStyle = '#f96';
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + b.ax / am * 30, y + b.ay / am * 30); ctx.stroke();
    }
  }

  // HUD
  ui.bodyCount.textContent = bodies.length;
  ui.collCount.textContent = totalCollisions;
}

// ---------- Main loop ----------
let last = performance.now();
let acc = 0;
let fpsCounter = 0, fpsTime = 0;

function loop(now) {
  const rawDt = Math.min((now - last) / 1000, 0.05);
  last = now;
  fpsCounter++; fpsTime += rawDt;
  if (fpsTime > 0.5) { ui.fps.textContent = Math.round(fpsCounter / fpsTime); fpsCounter = 0; fpsTime = 0; }

  if (!paused) {
    acc += rawDt * timeScale;
    // clamp steps to avoid runaway
    let steps = 0;
    while (acc >= FIXED_DT && steps < 240) {
      step(FIXED_DT);
      acc -= FIXED_DT;
      steps++;
      simTime += FIXED_DT;
    }
    if (acc > 1) acc = 0;
  }
  draw();
  requestAnimationFrame(loop);
}

presetSunSystem();
requestAnimationFrame(loop);
