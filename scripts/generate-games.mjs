/**
 * Generates all 30 Gamescroll HTML games with shared bridge + instant restart.
 * Run: node scripts/generate-games.mjs
 */
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/games')

const BRIDGE = `
    const GS = {
      paused: true,
      reported: false,
      post(type) { try { parent.postMessage({ type }, '*') } catch (e) {} },
      begin() {
        if (!GS.reported) { GS.reported = true; GS.post('gamescroll:playing') }
        GS.paused = false
        if (typeof onHostStart === 'function') onHostStart()
      },
      halt() {
        GS.paused = true
        if (typeof onHostPause === 'function') onHostPause()
      }
    }
    addEventListener('message', (e) => {
      const t = e.data && e.data.type
      if (t === 'gamescroll:start') GS.begin()
      if (t === 'gamescroll:pause') GS.halt()
    })
    // Forward committed vertical flings to the host so swiping between games
    // works even though this iframe captures all pointer events. Thresholds are
    // high (long + fast + steep) so in-game taps, drags and short swipes never
    // trigger navigation.
    ;(function () {
      let sx = 0, sy = 0, st = 0, tracking = false
      addEventListener('pointerdown', (e) => {
        sx = e.clientX; sy = e.clientY; st = performance.now(); tracking = true
      }, true)
      addEventListener('pointerup', (e) => {
        if (!tracking) return
        tracking = false
        const dx = Math.abs(e.clientX - sx)
        const dy = e.clientY - sy
        const dt = performance.now() - st
        const minDist = Math.max(140, innerHeight * 0.22)
        if (dt > 350 || Math.abs(dy) < minDist || Math.abs(dy) < dx * 2.2) return
        GS.post(dy < 0 ? 'gamescroll:swipe-next' : 'gamescroll:swipe-prev')
      }, true)
      addEventListener('pointercancel', () => { tracking = false }, true)
    })()
    GS.post('gamescroll:ready')
`

function wrap(title, bg, body, accent) {
  const juiceAccent = accent || '#ffffff'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
  <title>${title}</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: ${bg}; touch-action: none; }
    #stage { position: fixed; inset: 0; will-change: transform; }
    #stage canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
    #fx { pointer-events: none; z-index: 2; }
    .hud {
      position: fixed; top: 1rem; left: 0; right: 0; text-align: center; z-index: 3;
      font: 800 2rem "Segoe UI", sans-serif; color: #fff;
      text-shadow: 0 2px 10px rgba(0,0,0,.45); pointer-events: none;
      transform-origin: 50% 50%;
    }
    .float-score {
      position: fixed; z-index: 4; pointer-events: none;
      font: 800 1.15rem "Segoe UI", sans-serif; color: #fff;
      text-shadow: 0 2px 8px rgba(0,0,0,.5);
      transform: translate(-50%, 0);
    }
  </style>
</head>
<body>
  <div id="stage">
    <canvas id="c"></canvas>
    <canvas id="fx"></canvas>
  </div>
  <div class="hud" id="score">0</div>
  <script src="/lib/gsap.min.js"></script>
  <script src="/lib/proton.min.js"></script>
  <script src="/lib/juice.js"></script>
  <script>
${BRIDGE}
    const canvas = document.getElementById('c')
    const ctx = canvas.getContext('2d')
    const scoreEl = document.getElementById('score')
    const dpr = Math.min(devicePixelRatio || 1, 2)
    let W = 0, H = 0, score = 0, last = performance.now()
    function setScore(n) { score = Math.max(0, n|0); scoreEl.textContent = String(score) }
    function bump(n) {
      const amount = n || 1
      setScore(score + amount)
      if (window.Juice) Juice.onScore(amount)
    }
    function resize() {
      W = innerWidth; H = innerHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (window.Juice) Juice.resize()
    }
    addEventListener('resize', () => { resize(); if (typeof onResize === 'function') onResize() })
    resize()
    if (window.Juice) Juice.init({ accent: ${JSON.stringify(juiceAccent)} })
${body}
    if (typeof die === 'function') {
      const __die = die
      die = function () {
        if (window.Juice) Juice.onDie()
        __die()
      }
    }
    function loop(now) {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      if (!GS.paused && typeof tick === 'function') tick(dt)
      if (typeof draw === 'function') draw(now)
      if (window.Juice) Juice.update()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  </script>
</body>
</html>
`
}

const games = {
  pong: {
    title: 'Pocket Pong',
    bg: '#1b4332',
    body: `
    let px, pw, ball, vx, vy
    function reset() {
      pw = Math.min(140, W * 0.32); px = W * 0.5
      ball = { x: W * 0.5, y: H * 0.4, r: 10 }
      const a = -Math.PI * 0.75 + Math.random() * Math.PI * 0.5
      const sp = 280 + Math.random() * 60
      vx = Math.cos(a) * sp; vy = Math.abs(Math.sin(a) * sp)
      setScore(0)
    }
    function onHostStart() { reset() }
    function onResize() { if (!GS.paused) reset() }
    function die() { reset() }
    function tick(dt) {
      ball.x += vx * dt; ball.y += vy * dt
      if (ball.x < ball.r || ball.x > W - ball.r) { vx *= -1; ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x)) }
      if (ball.y < ball.r) { vy = Math.abs(vy); bump() }
      const py = H - 48
      if (ball.y + ball.r > py && ball.y - ball.r < py + 14 && Math.abs(ball.x - px) < pw * 0.5 + ball.r) {
        const hit = (ball.x - px) / (pw * 0.5)
        vx = hit * 320; vy = -Math.abs(vy) * 1.02
        ball.y = py - ball.r
        bump()
      }
      if (ball.y > H + 20) die()
    }
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#1b4332'); g.addColorStop(1, '#52b788')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#d8f3dc'; ctx.fillRect(px - pw * 0.5, H - 48, pw, 14)
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
      ctx.fillStyle = '#ffba08'; ctx.fill()
    }
    function move(x) { px = Math.max(pw * 0.5, Math.min(W - pw * 0.5, x)) }
    addEventListener('pointermove', e => { if (!GS.paused) move(e.clientX) })
    addEventListener('pointerdown', e => { if (!GS.paused) move(e.clientX) })
    reset()
`,
  },

  flappy: {
    title: 'Flappy Dot',
    bg: '#2d6a4f',
    body: `
    let y, v, pipes, gap = 130
    const bx = () => W * 0.3
    function reset() {
      y = H * 0.45; v = 0; pipes = [{ x: W + 40, gapY: H * 0.4, passed: false }]; setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      v += 20 * dt; y += v
      if (y < 20 || y > H - 20) die()
      for (const p of pipes) p.x -= 150 * dt
      if (pipes[0] && pipes[0].x < -70) pipes.shift()
      if (pipes.length && pipes[pipes.length - 1].x < W * 0.45) {
        pipes.push({ x: W + 40, gapY: H * (0.25 + Math.random() * 0.4), passed: false })
      }
      for (const p of pipes) {
        const inX = bx() + 14 > p.x && bx() - 14 < p.x + 54
        const inGap = y > p.gapY && y < p.gapY + gap
        if (inX && !inGap) die()
        if (!p.passed && p.x + 54 < bx()) { p.passed = true; bump() }
      }
    }
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#1b4332'); g.addColorStop(1, '#95d5b2')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      for (const p of pipes) {
        ctx.fillStyle = '#d8f3dc'
        ctx.fillRect(p.x, 0, 54, p.gapY)
        ctx.fillRect(p.x, p.gapY + gap, 54, H - p.gapY - gap)
      }
      ctx.fillStyle = '#ffba08'
      ctx.beginPath(); ctx.arc(bx(), y, 14, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', () => { if (!GS.paused) v = -7.4 })
    reset()
`,
  },

  lanes: {
    title: 'Lane Switch',
    bg: '#1d3557',
    body: `
    const LANES = [0.28, 0.72]
    let lane = 0, blocks = [], spawn = 0, py
    function reset() { lane = 0; blocks = []; spawn = 0.5; setScore(0); py = H * 0.78 }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        blocks.push({ lane: Math.random() < 0.5 ? 0 : 1, y: -40, h: 50 + Math.random() * 30 })
        spawn = 0.7 + Math.random() * 0.5
      }
      const speed = 260 + score * 4
      for (const b of blocks) b.y += speed * dt
      blocks = blocks.filter(b => {
        if (b.y > H + 60) { bump(); return false }
        return true
      })
      const px = W * LANES[lane]
      for (const b of blocks) {
        if (b.lane === lane && Math.abs(b.y + b.h * 0.5 - py) < b.h * 0.5 + 18) die()
      }
    }
    function draw() {
      ctx.fillStyle = '#1d3557'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(W * 0.5 - 2, 0, 4, H)
      for (const b of blocks) {
        ctx.fillStyle = '#e63946'
        ctx.fillRect(W * LANES[b.lane] - 28, b.y, 56, b.h)
      }
      ctx.fillStyle = '#a8dadc'
      ctx.beginPath(); ctx.arc(W * LANES[lane], py, 18, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', () => { if (!GS.paused) lane = 1 - lane })
    reset()
`,
  },

  stack: {
    title: 'Falling Stack',
    bg: '#7b2d26',
    body: `
    let pieces = [], cur, dir = 1, speed = 180, baseW
    function reset() {
      baseW = Math.min(200, W * 0.55)
      pieces = [{ x: W * 0.5, w: baseW, y: H - 40 }]
      spawn(); setScore(0); speed = 180
    }
    function spawn() {
      const prev = pieces[pieces.length - 1]
      cur = { x: 40, w: prev.w, y: Math.max(80, prev.y - 34), moving: true }
      dir = Math.random() < 0.5 ? 1 : -1
      if (dir < 0) cur.x = W - 40
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function place() {
      if (!cur || !cur.moving) return
      const prev = pieces[pieces.length - 1]
      const left = Math.max(cur.x - cur.w * 0.5, prev.x - prev.w * 0.5)
      const right = Math.min(cur.x + cur.w * 0.5, prev.x + prev.w * 0.5)
      const w = right - left
      if (w < 16) { die(); return }
      cur = { x: (left + right) * 0.5, w, y: cur.y, moving: false }
      pieces.push(cur)
      bump()
      if (pieces.length > 12) {
        const shift = pieces[1].y - pieces[0].y
        pieces.shift()
        for (const p of pieces) p.y += shift
      }
      speed = Math.min(320, speed + 6)
      spawn()
    }
    function tick(dt) {
      if (!cur || !cur.moving) return
      cur.x += dir * speed * dt
      if (cur.x < cur.w * 0.5 || cur.x > W - cur.w * 0.5) dir *= -1
    }
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#7b2d26'); g.addColorStop(1, '#e09f3e')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      for (const p of pieces) {
        ctx.fillStyle = '#f4d35e'
        ctx.fillRect(p.x - p.w * 0.5, p.y, p.w, 28)
      }
      if (cur) {
        ctx.fillStyle = '#fff'
        ctx.fillRect(cur.x - cur.w * 0.5, cur.y, cur.w, 28)
      }
    }
    addEventListener('pointerdown', () => { if (!GS.paused) place() })
    reset()
`,
  },

  orbit: {
    title: 'Orbit Jump',
    bg: '#22223b',
    body: `
    let planets = [], idx = 0, ang = 0, flying = null
    function makePlanets() {
      planets = []
      let x = W * 0.35, y = H * 0.55
      for (let i = 0; i < 8; i++) {
        planets.push({ x, y, r: 28 + Math.random() * 10 })
        x += 90 + Math.random() * 50
        y = H * (0.35 + Math.random() * 0.35)
      }
    }
    function reset() { makePlanets(); idx = 0; ang = 0; flying = null; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function jump() {
      if (flying || GS.paused) return
      const p = planets[idx], n = planets[idx + 1]
      if (!n) { makePlanets(); idx = 0; bump(2); return }
      flying = { x: p.x + Math.cos(ang) * (p.r + 10), y: p.y + Math.sin(ang) * (p.r + 10),
        tx: n.x, ty: n.y, t: 0 }
    }
    function tick(dt) {
      if (flying) {
        flying.t += dt * 2.2
        const t = Math.min(1, flying.t)
        const x = flying.x + (flying.tx - flying.x) * t
        const y = flying.y + (flying.ty - flying.y) * t - Math.sin(t * Math.PI) * 40
        if (t >= 1) {
          const n = planets[idx + 1]
          const d = Math.hypot(x - n.x, y - n.y)
          if (d < n.r + 14) { idx++; bump(); flying = null; ang = 0 }
          else die()
        } else { flying.cx = x; flying.cy = y }
        return
      }
      ang += dt * 2.4
    }
    function draw() {
      ctx.fillStyle = '#22223b'; ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < planets.length; i++) {
        const p = planets[i]
        ctx.fillStyle = i === idx ? '#9a8c98' : '#4a4e69'
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
      }
      let dx, dy
      if (flying) { dx = flying.cx; dy = flying.cy }
      else {
        const p = planets[idx]
        dx = p.x + Math.cos(ang) * (p.r + 10)
        dy = p.y + Math.sin(ang) * (p.r + 10)
      }
      ctx.fillStyle = '#f2e9e4'
      ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', jump)
    reset()
`,
  },

  ski: {
    title: 'Endless Ski',
    bg: '#457b9d',
    body: `
    let x, trees = [], spawn = 0
    function reset() { x = 0.5; trees = []; spawn = 0.2; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        trees.push({ x: 0.1 + Math.random() * 0.8, y: -30, kind: Math.random() < 0.7 ? 't' : 'r' })
        spawn = 0.28 + Math.random() * 0.25
      }
      const speed = 320 + score * 3
      for (const t of trees) t.y += speed * dt
      trees = trees.filter(t => {
        if (t.y > H + 40) { bump(); return false }
        const px = x * W, py = H * 0.72
        if (Math.hypot(t.x * W - px, t.y - py) < 22) die()
        return true
      })
    }
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#a8dadc'); g.addColorStop(1, '#457b9d')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      for (const t of trees) {
        if (t.kind === 't') {
          ctx.fillStyle = '#1d3557'
          ctx.beginPath(); ctx.moveTo(t.x * W, t.y - 22)
          ctx.lineTo(t.x * W - 14, t.y + 12); ctx.lineTo(t.x * W + 14, t.y + 12); ctx.fill()
        } else {
          ctx.fillStyle = '#6c757d'
          ctx.beginPath(); ctx.arc(t.x * W, t.y, 12, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.fillStyle = '#e63946'
      ctx.beginPath(); ctx.arc(x * W, H * 0.72, 12, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointermove', e => { if (!GS.paused) x = Math.max(0.08, Math.min(0.92, e.clientX / W)) })
    addEventListener('pointerdown', e => { if (!GS.paused) x = Math.max(0.08, Math.min(0.92, e.clientX / W)) })
    reset()
`,
  },

  gravity: {
    title: 'Gravity Flip',
    bg: '#3d405b',
    body: `
    let onCeil = false, obstacles = [], spawn = 0, y
    function reset() { onCeil = false; obstacles = []; spawn = 0.4; setScore(0); y = H - 60 }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      const target = onCeil ? 60 : H - 60
      y += (target - y) * Math.min(1, dt * 14)
      spawn -= dt
      if (spawn <= 0) {
        const ceil = Math.random() < 0.5
        obstacles.push({ x: W + 40, w: 36, h: 70 + Math.random() * 40, ceil })
        spawn = 0.85 + Math.random() * 0.4
      }
      for (const o of obstacles) o.x -= (220 + score * 3) * dt
      obstacles = obstacles.filter(o => {
        if (o.x < -50) { bump(); return false }
        const py = y
        const oy = o.ceil ? 40 : H - 40 - o.h
        if (o.x < W * 0.22 + 16 && o.x + o.w > W * 0.22 - 16) {
          if (py > oy && py < oy + o.h) die()
        }
        return true
      })
    }
    function draw() {
      ctx.fillStyle = '#3d405b'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#81b29a'
      ctx.fillRect(0, 0, W, 36); ctx.fillRect(0, H - 36, W, 36)
      for (const o of obstacles) {
        ctx.fillStyle = '#e07a5f'
        ctx.fillRect(o.x, o.ceil ? 36 : H - 36 - o.h, o.w, o.h)
      }
      ctx.fillStyle = '#f2cc8f'
      ctx.beginPath(); ctx.arc(W * 0.22, y, 14, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', () => { if (!GS.paused) onCeil = !onCeil })
    reset()
`,
  },

  bubbles: {
    title: 'Bubble Pressure',
    bg: '#0077b6',
    body: `
    let bubbles = [], spawn = 0
    function reset() { bubbles = []; spawn = 0.1; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        bubbles.push({ x: 40 + Math.random() * (W - 80), y: H + 20, r: 18 + Math.random() * 16, v: 70 + Math.random() * 50 })
        spawn = 0.45 + Math.random() * 0.35
      }
      for (const b of bubbles) b.y -= b.v * dt
      for (const b of bubbles) if (b.y + b.r < 0) { die(); return }
    }
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#023e8a'); g.addColorStop(1, '#90e0ef')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      for (const b of bubbles) {
        ctx.strokeStyle = '#caf0f8'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = 'rgba(202,240,248,0.25)'; ctx.fill()
      }
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]
        if (Math.hypot(e.clientX - b.x, e.clientY - b.y) < b.r + 8) {
          bubbles.splice(i, 1); bump(); return
        }
      }
    })
    reset()
`,
  },

  helix: {
    title: 'Helix Drop',
    bg: '#6a4c93',
    body: `
    let rot = 0, ballY, ballV, segs = [], dangerous
    function rebuild() {
      segs = []
      for (let i = 0; i < 18; i++) {
        const gap = Math.random() * Math.PI * 0.6
        segs.push({ y: 120 + i * 48, gap, bad: Math.random() < 0.35 })
      }
    }
    function reset() { rot = 0; ballY = 80; ballV = 0; rebuild(); setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      ballV += 180 * dt; ballY += ballV * dt
      const cx = W * 0.5
      for (const s of segs) {
        if (Math.abs(ballY - s.y) < 10) {
          let a = (rot + Math.atan2(0, 1) + Math.PI * 2) % (Math.PI * 2)
          // ball is at center x, angle of contact uses fixed side — simplify: ball falls in center column
          const ballAng = (rot) % (Math.PI * 2)
          const inGap = ((ballAng - s.gap + Math.PI * 2) % (Math.PI * 2)) < 1.1
          if (!inGap) {
            if (s.bad) die()
            else { ballV = -220; ballY = s.y - 12; bump() }
          }
        }
      }
      if (ballY > H - 40) { ballY = 80; ballV = 0; rebuild(); bump(2) }
    }
    function draw() {
      ctx.fillStyle = '#6a4c93'; ctx.fillRect(0, 0, W, H)
      const cx = W * 0.5, R = Math.min(W * 0.38, 140)
      for (const s of segs) {
        ctx.strokeStyle = s.bad ? '#ef476f' : '#ffd166'
        ctx.lineWidth = 10
        ctx.beginPath()
        ctx.arc(cx, s.y, R, rot + s.gap + 1.1, rot + s.gap + Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(cx, ballY, 10, 0, Math.PI * 2); ctx.fill()
    }
    let dragging = false, lastX = 0
    addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX })
    addEventListener('pointerup', () => { dragging = false })
    addEventListener('pointermove', e => {
      if (!dragging || GS.paused) return
      rot += (e.clientX - lastX) * 0.02
      lastX = e.clientX
    })
    reset()
`,
  },

  road: {
    title: 'Stay on the Road',
    bg: '#264653',
    body: `
    let carX = 0.5, road = [], t = 0
    function reset() {
      carX = 0.5; t = 0; road = []
      for (let i = 0; i < 24; i++) road.push({ c: 0.5, w: 0.42 })
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      t += dt
      const speed = 10 + score * 0.05
      const shift = speed * dt
      // scroll road by fractional rows
      road.scroll = (road.scroll || 0) + shift
      while (road.scroll >= 1) {
        road.scroll -= 1
        road.pop()
        const prev = road[0]
        const nc = Math.max(0.22, Math.min(0.78, prev.c + (Math.random() - 0.5) * 0.12))
        road.unshift({ c: nc, w: Math.max(0.22, 0.42 - score * 0.002) })
        bump()
      }
      const near = road[Math.floor(road.length * 0.72)]
      if (Math.abs(carX - near.c) > near.w * 0.5 - 0.02) die()
    }
    function draw() {
      ctx.fillStyle = '#2a9d8f'; ctx.fillRect(0, 0, W, H)
      const rowH = H / (road.length - 1)
      for (let i = 0; i < road.length - 1; i++) {
        const a = road[i], b = road[i + 1]
        const y0 = i * rowH, y1 = (i + 1) * rowH
        ctx.fillStyle = '#264653'
        ctx.beginPath()
        ctx.moveTo((a.c - a.w * 0.5) * W, y0)
        ctx.lineTo((a.c + a.w * 0.5) * W, y0)
        ctx.lineTo((b.c + b.w * 0.5) * W, y1)
        ctx.lineTo((b.c - b.w * 0.5) * W, y1)
        ctx.closePath(); ctx.fill()
      }
      ctx.fillStyle = '#e9c46a'
      ctx.fillRect(carX * W - 12, H * 0.72 - 18, 24, 36)
    }
    addEventListener('pointermove', e => { if (!GS.paused) carX = Math.max(0.05, Math.min(0.95, e.clientX / W)) })
    addEventListener('pointerdown', e => { if (!GS.paused) carX = Math.max(0.05, Math.min(0.95, e.clientX / W)) })
    reset()
`,
  },
}

// Continue with games 11-30 in the same file - append below
Object.assign(games, {
  balloon: {
    title: 'Balloon Tap',
    bg: '#e76f51',
    body: `
    let bx, by, bv, spikes = [], spawn = 0
    function reset() { bx = W * 0.5; by = H * 0.55; bv = 0; spikes = []; spawn = 0.3; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      bv += 140 * dt; by += bv * dt
      if (by > H - 30 || by < 30) die()
      spawn -= dt
      if (spawn <= 0) {
        spikes.push({ x: W + 20, y: 40 + Math.random() * (H - 80), up: Math.random() < 0.5 })
        spawn = 0.7 + Math.random() * 0.4
      }
      for (const s of spikes) s.x -= 160 * dt
      spikes = spikes.filter(s => {
        if (s.x < -20) { bump(); return false }
        if (Math.hypot(s.x - bx, s.y - by) < 22) die()
        return true
      })
    }
    function draw() {
      ctx.fillStyle = '#264653'; ctx.fillRect(0, 0, W, H)
      for (const s of spikes) {
        ctx.fillStyle = '#e9c46a'
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x - 10, s.y + (s.up ? -24 : 24))
        ctx.lineTo(s.x + 10, s.y + (s.up ? -24 : 24))
        ctx.fill()
      }
      ctx.fillStyle = '#e76f51'
      ctx.beginPath(); ctx.ellipse(bx, by, 18, 24, 0, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', () => { if (!GS.paused) bv = -220 })
    reset()
`,
  },

  colour: {
    title: 'Colour Gate',
    bg: '#9b2226',
    body: `
    const COLORS = ['#e9c46a', '#2a9d8f', '#e76f51']
    let color = 0, gates = [], spawn = 0, ballY
    function reset() { color = 0; gates = []; spawn = 0.5; ballY = H * 0.7; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        gates.push({ y: -40, c: Math.floor(Math.random() * 3) })
        spawn = 1.1
      }
      for (const g of gates) g.y += 180 * dt
      gates = gates.filter(g => {
        if (g.y > ballY - 10 && g.y < ballY + 10) {
          if (g.c !== color) die()
          else bump()
          return false
        }
        return g.y < H + 40
      })
    }
    function draw() {
      ctx.fillStyle = '#9b2226'; ctx.fillRect(0, 0, W, H)
      for (const g of gates) {
        ctx.fillStyle = COLORS[g.c]
        ctx.fillRect(W * 0.15, g.y, W * 0.7, 18)
      }
      ctx.fillStyle = COLORS[color]
      ctx.beginPath(); ctx.arc(W * 0.5, ballY, 16, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', () => { if (!GS.paused) color = (color + 1) % 3 })
    reset()
`,
  },

  doodle: {
    title: 'Endless Doodle Jump',
    bg: '#2a9d8f',
    body: `
    let x, y, v, plats = [], cam = 0
    function reset() {
      x = W * 0.5; y = H * 0.7; v = -420; cam = 0; plats = []
      for (let i = 0; i < 10; i++) plats.push({ x: 40 + Math.random() * (W - 120), y: H - i * 90, w: 70 })
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      v += 900 * dt; y += v * dt
      if (y - cam > H - 40) die()
      if (y < cam + H * 0.35) cam = y - H * 0.35
      for (const p of plats) {
        if (v > 0 && y < p.y && y + v * dt >= p.y && x > p.x && x < p.x + p.w) {
          v = -420; bump()
        }
      }
      plats = plats.filter(p => p.y > cam - 40)
      while (plats.length < 10) {
        const top = Math.min(...plats.map(p => p.y))
        plats.push({ x: 30 + Math.random() * (W - 110), y: top - 80 - Math.random() * 40, w: 60 + Math.random() * 30 })
      }
    }
    function draw() {
      ctx.fillStyle = '#264653'; ctx.fillRect(0, 0, W, H)
      for (const p of plats) {
        ctx.fillStyle = '#e9c46a'
        ctx.fillRect(p.x, p.y - cam, p.w, 12)
      }
      ctx.fillStyle = '#e76f51'
      ctx.beginPath(); ctx.arc(x, y - cam, 14, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointermove', e => { if (!GS.paused) x = e.clientX })
    addEventListener('pointerdown', e => { if (!GS.paused) x = e.clientX })
    reset()
`,
  },

  tunnel: {
    title: 'Tunnel Drift',
    bg: '#023e8a',
    body: `
    let x = 0.5, walls = [], t = 0
    function reset() {
      x = 0.5; t = 0; walls = []
      for (let i = 0; i < 40; i++) walls.push({ c: 0.5, w: 0.55 })
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      t += dt
      walls.scroll = (walls.scroll || 0) + (12 + score * 0.04) * dt
      while (walls.scroll >= 1) {
        walls.scroll -= 1; walls.pop()
        const prev = walls[0]
        walls.unshift({
          c: Math.max(0.25, Math.min(0.75, prev.c + Math.sin(t * 2) * 0.04 + (Math.random() - 0.5) * 0.05)),
          w: Math.max(0.28, 0.55 - score * 0.003)
        })
        bump()
      }
      const row = walls[Math.floor(walls.length * 0.65)]
      if (Math.abs(x - row.c) > row.w * 0.5 - 0.03) die()
    }
    function draw() {
      ctx.fillStyle = '#03045e'; ctx.fillRect(0, 0, W, H)
      const rowH = H / (walls.length - 1)
      ctx.fillStyle = '#0077b6'
      for (let i = 0; i < walls.length - 1; i++) {
        const a = walls[i], b = walls[i + 1]
        const y0 = i * rowH, y1 = (i + 1) * rowH
        ctx.beginPath()
        ctx.moveTo(0, y0); ctx.lineTo((a.c - a.w * 0.5) * W, y0)
        ctx.lineTo((b.c - b.w * 0.5) * W, y1); ctx.lineTo(0, y1); ctx.fill()
        ctx.beginPath()
        ctx.moveTo(W, y0); ctx.lineTo((a.c + a.w * 0.5) * W, y0)
        ctx.lineTo((b.c + b.w * 0.5) * W, y1); ctx.lineTo(W, y1); ctx.fill()
      }
      ctx.fillStyle = '#caf0f8'
      ctx.beginPath(); ctx.arc(x * W, H * 0.65, 10, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointermove', e => { if (!GS.paused) x = e.clientX / W })
    addEventListener('pointerdown', e => { if (!GS.paused) x = e.clientX / W })
    reset()
`,
  },

  shield: {
    title: 'Shield the Core',
    bg: '#4a4e69',
    body: `
    let ang = 0, shots = [], spawn = 0
    function reset() { ang = 0; shots = []; spawn = 0.4; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        shots.push({ a: Math.random() * Math.PI * 2, r: Math.max(W, H) * 0.6, v: 140 + score * 2 })
        spawn = 0.55 + Math.random() * 0.35
      }
      const cx = W * 0.5, cy = H * 0.5
      for (const s of shots) s.r -= s.v * dt
      shots = shots.filter(s => {
        if (s.r < 28) {
          const da = Math.abs(Math.atan2(Math.sin(s.a - ang), Math.cos(s.a - ang)))
          if (da < 0.55) { bump(); return false }
          die(); return false
        }
        return true
      })
    }
    function draw() {
      ctx.fillStyle = '#22223b'; ctx.fillRect(0, 0, W, H)
      const cx = W * 0.5, cy = H * 0.5
      ctx.fillStyle = '#9a8c98'
      ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#f2e9e4'; ctx.lineWidth = 8
      ctx.beginPath(); ctx.arc(cx, cy, 40, ang - 0.5, ang + 0.5); ctx.stroke()
      for (const s of shots) {
        ctx.fillStyle = '#ef476f'
        ctx.beginPath()
        ctx.arc(cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r, 8, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    addEventListener('pointermove', e => {
      if (GS.paused) return
      ang = Math.atan2(e.clientY - H * 0.5, e.clientX - W * 0.5)
    })
    reset()
`,
  },

  pulse: {
    title: 'Perfect Pulse',
    bg: '#5e548e',
    body: `
    let rings = [], spawn = 0, flash = 0
    function reset() { rings = []; spawn = 0.2; flash = 0; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      flash = Math.max(0, flash - dt)
      spawn -= dt
      if (spawn <= 0) { rings.push({ r: Math.max(W, H) * 0.55 }); spawn = 1.35 }
      for (const r of rings) r.r -= 120 * dt
      rings = rings.filter(r => {
        if (r.r < 28) { die(); return false }
        return true
      })
    }
    function draw() {
      ctx.fillStyle = flash > 0 ? '#9f86c0' : '#231942'; ctx.fillRect(0, 0, W, H)
      const cx = W * 0.5, cy = H * 0.5
      ctx.strokeStyle = '#e0aaff'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.stroke()
      for (const r of rings) {
        ctx.beginPath(); ctx.arc(cx, cy, r.r, 0, Math.PI * 2); ctx.stroke()
      }
    }
    addEventListener('pointerdown', () => {
      if (GS.paused || !rings.length) return
      const r = rings[0]
      if (Math.abs(r.r - 36) < 18) { rings.shift(); bump(); flash = 0.15 }
      else die()
    })
    reset()
`,
  },

  snake: {
    title: 'Snake Lite',
    bg: '#386641',
    body: `
    let body, dir, next, food, acc = 0
    const CS = 20
    function reset() {
      const cx = Math.floor(W / CS / 2), cy = Math.floor(H / CS / 2)
      body = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }]
      dir = { x: 1, y: 0 }; next = { x: 1, y: 0 }; placeFood(); setScore(0); acc = 0
    }
    function placeFood() {
      food = { x: 2 + Math.floor(Math.random() * (W / CS - 4)), y: 2 + Math.floor(Math.random() * (H / CS - 4)) }
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      acc += dt
      const step = Math.max(0.09, 0.16 - score * 0.002)
      while (acc >= step) {
        acc -= step
        dir = next
        const h = { x: body[0].x + dir.x, y: body[0].y + dir.y }
        if (h.x < 0 || h.y < 0 || h.x >= W / CS || h.y >= H / CS) { die(); return }
        if (body.some(p => p.x === h.x && p.y === h.y)) { die(); return }
        body.unshift(h)
        if (h.x === food.x && h.y === food.y) { bump(); placeFood() }
        else body.pop()
      }
    }
    function draw() {
      ctx.fillStyle = '#14213d'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#fca311'
      ctx.fillRect(food.x * CS, food.y * CS, CS - 2, CS - 2)
      ctx.fillStyle = '#2a9d8f'
      for (const p of body) ctx.fillRect(p.x * CS, p.y * CS, CS - 2, CS - 2)
    }
    let sx, sy
    addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY })
    addEventListener('pointerup', e => {
      if (GS.paused) return
      const dx = e.clientX - sx, dy = e.clientY - sy
      if (Math.abs(dx) > Math.abs(dy)) next = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 }
      else next = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 }
      if (next.x === -dir.x && next.y === -dir.y) next = dir
    })
    reset()
`,
  },

  cross: {
    title: 'Cross Forever',
    bg: '#6c584c',
    body: `
    let row = 0, lanes = [], player = { c: 2, r: 0 }, cols = 5
    function reset() {
      lanes = []; player = { c: 2, r: 0 }
      for (let i = 0; i < 12; i++) {
        const kind = i === 0 ? 'safe' : (['road', 'river', 'rail'][i % 3])
        lanes.push({ kind, cars: [], t: Math.random() })
      }
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      for (let i = 1; i < lanes.length; i++) {
        const L = lanes[i]
        L.t -= dt
        if (L.t <= 0) {
          L.cars.push({ c: Math.random() < 0.5 ? -1 : cols, dir: Math.random() < 0.5 ? 1 : -1, x: Math.random() < 0.5 ? -1 : cols })
          L.cars[L.cars.length - 1].x = L.cars[L.cars.length - 1].dir > 0 ? -1 : cols
          L.t = 0.8 + Math.random() * 0.8
        }
        for (const c of L.cars) c.x += c.dir * (2 + score * 0.05) * dt
        L.cars = L.cars.filter(c => c.x > -2 && c.x < cols + 2)
        if (player.r === i) {
          for (const c of L.cars) if (Math.abs(c.x - player.c) < 0.7) die()
        }
      }
    }
    function draw() {
      const rowH = H / lanes.length
      for (let i = 0; i < lanes.length; i++) {
        const L = lanes[i]
        ctx.fillStyle = L.kind === 'safe' ? '#a98467' : L.kind === 'river' ? '#4cc9f0' : L.kind === 'rail' ? '#495057' : '#343a40'
        ctx.fillRect(0, H - (i + 1) * rowH, W, rowH)
        for (const c of L.cars) {
          ctx.fillStyle = L.kind === 'river' ? '#0077b6' : '#ef476f'
          ctx.fillRect((c.x / cols) * W, H - (i + 1) * rowH + 8, W / cols - 8, rowH - 16)
        }
      }
      ctx.fillStyle = '#ffd166'
      ctx.fillRect((player.c / cols) * W + 6, H - (player.r + 1) * rowH + 10, W / cols - 12, rowH - 20)
    }
    addEventListener('pointerdown', () => {
      if (GS.paused) return
      player.r++
      bump()
      if (player.r >= lanes.length - 2) {
        lanes.push({ kind: ['road', 'river', 'rail'][Math.floor(Math.random() * 3)], cars: [], t: 0.5 })
        lanes.shift(); player.r--
      }
    })
    reset()
`,
  },

  catch: {
    title: 'Catch or Dodge',
    bg: '#3c096c',
    body: `
    let bx, items = [], spawn = 0
    function reset() { bx = W * 0.5; items = []; spawn = 0.2; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        items.push({ x: 40 + Math.random() * (W - 80), y: -20, good: Math.random() < 0.65, v: 180 + Math.random() * 80 })
        spawn = 0.4 + Math.random() * 0.3
      }
      for (const it of items) it.y += it.v * dt
      items = items.filter(it => {
        if (it.y > H - 70 && Math.abs(it.x - bx) < 40) {
          if (it.good) bump(); else die()
          return false
        }
        return it.y < H + 30
      })
    }
    function draw() {
      ctx.fillStyle = '#240046'; ctx.fillRect(0, 0, W, H)
      for (const it of items) {
        ctx.fillStyle = it.good ? '#80ed99' : '#ef476f'
        ctx.beginPath(); ctx.arc(it.x, it.y, 12, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#c77dff'
      ctx.fillRect(bx - 36, H - 58, 72, 18)
    }
    addEventListener('pointermove', e => { if (!GS.paused) bx = e.clientX })
    addEventListener('pointerdown', e => { if (!GS.paused) bx = e.clientX })
    reset()
`,
  },

  ridge: {
    title: 'Rolling Ridge',
    bg: '#582f0e',
    body: `
    let x = 0.5, path = [], scroll = 0
    function reset() {
      x = 0.5; path = []; scroll = 0
      for (let i = 0; i < 30; i++) path.push(0.5)
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      scroll += (8 + score * 0.05) * dt
      while (scroll >= 1) {
        scroll -= 1; path.pop()
        const prev = path[0]
        path.unshift(Math.max(0.2, Math.min(0.8, prev + (Math.random() - 0.5) * 0.1)))
        bump()
      }
      const c = path[Math.floor(path.length * 0.7)]
      if (Math.abs(x - c) > 0.12) die()
    }
    function draw() {
      ctx.fillStyle = '#283618'; ctx.fillRect(0, 0, W, H)
      const rowH = H / (path.length - 1)
      ctx.strokeStyle = '#dda15e'; ctx.lineWidth = 18; ctx.lineJoin = 'round'
      ctx.beginPath()
      for (let i = 0; i < path.length; i++) {
        const px = path[i] * W, py = i * rowH
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.fillStyle = '#bc6c25'
      ctx.beginPath(); ctx.arc(x * W, H * 0.7, 12, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointermove', e => { if (!GS.paused) x = e.clientX / W })
    addEventListener('pointerdown', e => { if (!GS.paused) x = e.clientX / W })
    reset()
`,
  },
})

Object.assign(games, {
  wall: {
    title: 'Wall Bounce',
    bg: '#bc4749',
    body: `
    let side = -1, y, v, spikes = [], spawn = 0, x
    function reset() { side = -1; y = H * 0.5; v = 0; x = 40; spikes = []; spawn = 0.3; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      const target = side < 0 ? 40 : W - 40
      x += (target - x) * Math.min(1, dt * 10)
      v += (Math.sin(performance.now() / 400) * 40) * dt
      y += v * dt
      if (y < 40 || y > H - 40) v *= -1
      spawn -= dt
      if (spawn <= 0) {
        spikes.push({ side: Math.random() < 0.5 ? -1 : 1, y: 60 + Math.random() * (H - 120) })
        spawn = 0.6 + Math.random() * 0.4
      }
      // move spikes toward center then despawn — actually fixed on walls
      spikes = spikes.filter(s => {
        // scroll spikes down
        s.y += 120 * dt
        if (s.y > H + 20) { bump(); return false }
        if (s.side === side && Math.abs(s.y - y) < 24 && Math.abs(x - (s.side < 0 ? 40 : W - 40)) < 30) die()
        return true
      })
    }
    function draw() {
      ctx.fillStyle = '#6a040f'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#370617'; ctx.fillRect(0, 0, 28, H); ctx.fillRect(W - 28, 0, 28, H)
      for (const s of spikes) {
        ctx.fillStyle = '#ffba08'
        const sx = s.side < 0 ? 28 : W - 28
        ctx.beginPath()
        ctx.moveTo(sx, s.y)
        ctx.lineTo(sx + (s.side < 0 ? 22 : -22), s.y - 12)
        ctx.lineTo(sx + (s.side < 0 ? 22 : -22), s.y + 12)
        ctx.fill()
      }
      ctx.fillStyle = '#f8f9fa'
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', () => { if (!GS.paused) side *= -1 })
    reset()
`,
  },

  fish: {
    title: 'Tiny Fish',
    bg: '#0077b6',
    body: `
    let y, holding = false, rocks = [], spawn = 0
    function reset() { y = H * 0.5; rocks = []; spawn = 0.2; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      y += (holding ? -160 : 160) * dt
      if (y < 20 || y > H - 20) die()
      spawn -= dt
      if (spawn <= 0) {
        rocks.push({ x: W + 30, y: 40 + Math.random() * (H - 80), r: 16 + Math.random() * 20 })
        spawn = 0.5 + Math.random() * 0.35
      }
      for (const r of rocks) r.x -= 170 * dt
      rocks = rocks.filter(r => {
        if (r.x < -40) { bump(); return false }
        if (Math.hypot(r.x - W * 0.28, r.y - y) < r.r + 12) die()
        return true
      })
    }
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#023e8a'); g.addColorStop(1, '#48cae4')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      for (const r of rocks) {
        ctx.fillStyle = '#2d6a4f'
        ctx.beginPath(); ctx.ellipse(r.x, r.y, 10, r.r, 0, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#ffba08'
      ctx.beginPath(); ctx.ellipse(W * 0.28, y, 16, 10, 0, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', () => { holding = true })
    addEventListener('pointerup', () => { holding = false })
    addEventListener('pointercancel', () => { holding = false })
    reset()
`,
  },

  dance: {
    title: 'Two-Dot Dance',
    bg: '#7209b7',
    body: `
    let ang = 0, dir = 1, gaps = [], spawn = 0
    function reset() { ang = 0; dir = 1; gaps = []; spawn = 0.5; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      ang += dir * 2.8 * dt
      spawn -= dt
      if (spawn <= 0) {
        gaps.push({ y: -30, open: ang + Math.PI * 0.5, w: 0.9 })
        spawn = 1.0
      }
      for (const g of gaps) g.y += 160 * dt
      const cx = W * 0.5, cy = H * 0.55, R = 50
      const d1 = { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R }
      const d2 = { x: cx + Math.cos(ang + Math.PI) * R, y: cy + Math.sin(ang + Math.PI) * R }
      gaps = gaps.filter(g => {
        if (g.y > H * 0.55 - 8 && g.y < H * 0.55 + 8) {
          // bar with gap — simplified: horizontal bar with opening around open angle projected
          const ok = Math.abs(Math.sin(ang - g.open)) > 0.55
          if (!ok) die()
          else bump()
          return false
        }
        return g.y < H + 40
      })
    }
    function draw() {
      ctx.fillStyle = '#3a0ca3'; ctx.fillRect(0, 0, W, H)
      const cx = W * 0.5, cy = H * 0.55, R = 50
      for (const g of gaps) {
        ctx.fillStyle = '#f72585'
        ctx.fillRect(40, g.y, W - 80, 14)
        ctx.fillStyle = '#3a0ca3'
        const gx = cx + Math.cos(g.open) * 40
        ctx.clearRect?.(0,0,0,0)
        ctx.fillRect(gx - 36, g.y - 1, 72, 16)
      }
      ctx.fillStyle = '#4cc9f0'
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 12, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#b5179e'
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang + Math.PI) * R, cy + Math.sin(ang + Math.PI) * R, 12, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', () => { if (!GS.paused) dir *= -1 })
    reset()
`,
  },

  balance: {
    title: 'Keep It Balanced',
    bg: '#b08968',
    body: `
    let tilt = 0, ball = 0, noise = 0
    function reset() { tilt = 0; ball = 0; noise = 0; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      noise += (Math.random() - 0.5) * dt * (0.8 + score * 0.02)
      noise *= 0.98
      ball += (tilt * 2.2 + noise) * 60 * dt
      if (Math.abs(ball) > 110) die()
      bump(0); // no auto bump
      scoreAcc = (scoreAcc || 0) + dt
      if (scoreAcc > 0.5) { scoreAcc = 0; bump() }
    }
    function draw() {
      ctx.fillStyle = '#ddb892'; ctx.fillRect(0, 0, W, H)
      const cx = W * 0.5, cy = H * 0.55
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt)
      ctx.fillStyle = '#7f5539'; ctx.fillRect(-120, -8, 240, 16)
      ctx.fillStyle = '#e6ccb2'
      ctx.beginPath(); ctx.arc(ball, -20, 14, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
    addEventListener('pointermove', e => { if (!GS.paused) tilt = (e.clientX / W - 0.5) * 0.9 })
    addEventListener('pointerdown', e => { if (!GS.paused) tilt = (e.clientX / W - 0.5) * 0.9 })
    let scoreAcc = 0
    reset()
`,
  },

  shapes: {
    title: 'Shape Squeeze',
    bg: '#d62828',
    body: `
    const SHAPES = ['circle', 'square', 'tri']
    let shape = 0, gates = [], spawn = 0
    function reset() { shape = 0; gates = []; spawn = 0.4; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        gates.push({ y: -50, s: Math.floor(Math.random() * 3) })
        spawn = 1.15
      }
      for (const g of gates) g.y += 170 * dt
      const py = H * 0.7
      gates = gates.filter(g => {
        if (g.y > py - 12 && g.y < py + 12) {
          if (g.s !== shape) die(); else bump()
          return false
        }
        return g.y < H + 40
      })
    }
    function drawShape(kind, x, y, r, fill) {
      ctx.fillStyle = fill
      ctx.beginPath()
      if (kind === 0) ctx.arc(x, y, r, 0, Math.PI * 2)
      else if (kind === 1) ctx.rect(x - r, y - r, r * 2, r * 2)
      else { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath() }
      ctx.fill()
    }
    function draw() {
      ctx.fillStyle = '#003049'; ctx.fillRect(0, 0, W, H)
      for (const g of gates) {
        ctx.fillStyle = '#fcbf49'
        ctx.fillRect(0, g.y, W, 24)
        ctx.globalCompositeOperation = 'destination-out'
        drawShape(g.s, W * 0.5, g.y + 12, 22, '#000')
        ctx.globalCompositeOperation = 'source-over'
      }
      drawShape(shape, W * 0.5, H * 0.7, 16, '#f77f00')
    }
    addEventListener('pointerdown', () => { if (!GS.paused) shape = (shape + 1) % 3 })
    reset()
`,
  },

  rain: {
    title: 'Rain Dodger',
    bg: '#415a77',
    body: `
    let x = 0.5, drops = [], spawn = 0
    function reset() { x = 0.5; drops = []; spawn = 0.05; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        drops.push({ x: Math.random(), y: -10, v: 220 + Math.random() * 120 })
        spawn = 0.08 + Math.random() * 0.08
      }
      for (const d of drops) d.y += d.v * dt
      drops = drops.filter(d => {
        if (d.y > H * 0.82 && Math.abs(d.x - x) < 0.045) { die(); return false }
        if (d.y > H + 20) { bump(); return false }
        return true
      })
    }
    function draw() {
      ctx.fillStyle = '#1b263b'; ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = '#778da9'; ctx.lineWidth = 2
      for (const d of drops) {
        ctx.beginPath(); ctx.moveTo(d.x * W, d.y); ctx.lineTo(d.x * W, d.y + 14); ctx.stroke()
      }
      ctx.fillStyle = '#e0e1dd'
      ctx.beginPath(); ctx.arc(x * W, H * 0.82, 12, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointermove', e => { if (!GS.paused) x = e.clientX / W })
    addEventListener('pointerdown', e => { if (!GS.paused) x = e.clientX / W })
    reset()
`,
  },

  magnet: {
    title: 'Magnet Flip',
    bg: '#9d4edd',
    body: `
    let y, pol = 1, hazards = [], spawn = 0
    function reset() { y = H * 0.5; pol = 1; hazards = []; spawn = 0.3; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      const target = pol > 0 ? 50 : H - 50
      y += (target - y) * Math.min(1, dt * 3)
      spawn -= dt
      if (spawn <= 0) {
        hazards.push({ x: W + 20, y: 80 + Math.random() * (H - 160), h: 50 + Math.random() * 40 })
        spawn = 0.7 + Math.random() * 0.4
      }
      for (const h of hazards) h.x -= 180 * dt
      hazards = hazards.filter(h => {
        if (h.x < -30) { bump(); return false }
        if (h.x < W * 0.3 + 14 && h.x + 24 > W * 0.3 - 14 && y > h.y && y < h.y + h.h) die()
        return true
      })
    }
    function draw() {
      ctx.fillStyle = '#240046'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#ff6d00'; ctx.fillRect(0, 0, W, 36)
      ctx.fillStyle = '#3a0ca3'; ctx.fillRect(0, H - 36, W, 36)
      for (const h of hazards) {
        ctx.fillStyle = '#e0aaff'; ctx.fillRect(h.x, h.y, 24, h.h)
      }
      ctx.fillStyle = pol > 0 ? '#ff6d00' : '#4cc9f0'
      ctx.beginPath(); ctx.arc(W * 0.3, y, 12, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointerdown', () => { if (!GS.paused) pol *= -1 })
    reset()
`,
  },

  comet: {
    title: 'Comet Tail',
    bg: '#3a0ca3',
    body: `
    let x, y, trail = [], t = 0
    function reset() { x = W * 0.5; y = H * 0.5; trail = []; t = 0; setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      t += dt
      trail.unshift({ x, y })
      const max = Math.min(80, 25 + score)
      if (trail.length > max) trail.pop()
      for (let i = 12; i < trail.length; i++) {
        if (Math.hypot(trail[i].x - x, trail[i].y - y) < 10) { die(); return }
      }
      if (x < 10 || y < 10 || x > W - 10 || y > H - 10) die()
      scoreAcc = (scoreAcc || 0) + dt
      if (scoreAcc > 0.4) { scoreAcc = 0; bump() }
    }
    function draw() {
      ctx.fillStyle = '#10002b'; ctx.fillRect(0, 0, W, H)
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i], a = 1 - i / trail.length
        ctx.fillStyle = \`rgba(76,201,240,\${a * 0.8})\`
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 + a * 4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#f72585'
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointermove', e => { if (!GS.paused) { x = e.clientX; y = e.clientY } })
    addEventListener('pointerdown', e => { if (!GS.paused) { x = e.clientX; y = e.clientY } })
    let scoreAcc = 0
    reset()
`,
  },

  light: {
    title: 'Light Chaser',
    bg: '#f4a261',
    body: `
    let px, py, target, dark = 0.35, spawnAt = 0
    function place() {
      target = { x: 60 + Math.random() * (W - 120), y: 80 + Math.random() * (H - 160) }
    }
    function reset() { px = W * 0.5; py = H * 0.5; dark = 0.35; place(); setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      dark += dt * 0.015
      const limit = Math.min(W, H) * (0.55 - Math.min(0.35, dark * 0.4))
      if (Math.hypot(px - W * 0.5, py - H * 0.5) > limit) die()
      if (Math.hypot(px - target.x, py - target.y) < 22) { bump(); place(); dark = Math.max(0.2, dark - 0.05) }
    }
    function draw() {
      ctx.fillStyle = '#264653'; ctx.fillRect(0, 0, W, H)
      const limit = Math.min(W, H) * (0.55 - Math.min(0.35, dark * 0.4))
      ctx.fillStyle = '#000'
      ctx.beginPath(); ctx.rect(0, 0, W, H)
      ctx.arc(W * 0.5, H * 0.5, limit, 0, Math.PI * 2, true); ctx.fill('evenodd')
      ctx.fillStyle = '#e9c46a'
      ctx.beginPath(); ctx.arc(target.x, target.y, 14, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#f4a261'
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointermove', e => { if (!GS.paused) { px = e.clientX; py = e.clientY } })
    addEventListener('pointerdown', e => { if (!GS.paused) { px = e.clientX; py = e.clientY } })
    reset()
`,
  },

  breakout: {
    title: 'Mini Breakout',
    bg: '#e9c46a',
    body: `
    let px, pw, ball, bricks = []
    function buildBricks() {
      bricks = []
      for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) {
        bricks.push({ x: 20 + c * ((W - 40) / 8), y: 80 + r * 28, w: (W - 40) / 8 - 6, h: 18, alive: true })
      }
    }
    function reset() {
      pw = Math.min(120, W * 0.28); px = W * 0.5
      ball = { x: W * 0.5, y: H * 0.6, vx: 160, vy: -220, r: 8 }
      buildBricks(); setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      ball.x += ball.vx * dt; ball.y += ball.vy * dt
      if (ball.x < ball.r || ball.x > W - ball.r) ball.vx *= -1
      if (ball.y < ball.r) ball.vy = Math.abs(ball.vy)
      const py = H - 50
      if (ball.y + ball.r > py && Math.abs(ball.x - px) < pw * 0.5 + ball.r && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy); ball.vx = (ball.x - px) * 6
      }
      if (ball.y > H + 20) die()
      for (const b of bricks) {
        if (!b.alive) continue
        if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
          b.alive = false; ball.vy *= -1; bump()
        }
      }
      if (bricks.every(b => !b.alive)) buildBricks()
    }
    function draw() {
      ctx.fillStyle = '#264653'; ctx.fillRect(0, 0, W, H)
      for (const b of bricks) if (b.alive) {
        ctx.fillStyle = '#e76f51'; ctx.fillRect(b.x, b.y, b.w, b.h)
      }
      ctx.fillStyle = '#e9c46a'; ctx.fillRect(px - pw * 0.5, H - 50, pw, 12)
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointermove', e => { if (!GS.paused) px = Math.max(pw * 0.5, Math.min(W - pw * 0.5, e.clientX)) })
    addEventListener('pointerdown', e => { if (!GS.paused) px = Math.max(pw * 0.5, Math.min(W - pw * 0.5, e.clientX)) })
    reset()
`,
  },
})

const obsolete = ['aim.html', 'dodge.html', 'flap.html', 'react.html']
for (const f of obsolete) {
  const p = join(OUT, f)
  if (existsSync(p)) unlinkSync(p)
}

for (const [id, g] of Object.entries(games)) {
  writeFileSync(join(OUT, `${id}.html`), wrap(g.title, g.bg, g.body, g.accent || g.bg))
  console.log('wrote', id)
}
console.log('Done:', Object.keys(games).length, 'games')
