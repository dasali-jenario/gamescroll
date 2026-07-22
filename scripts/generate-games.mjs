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
  <script src="/lib/playful.js"></script>
  <script>
${BRIDGE}
    const canvas = document.getElementById('c')
    const ctx = canvas.getContext('2d')
    const scoreEl = document.getElementById('score')
    const dpr = Math.min(devicePixelRatio || 1, 2)
    let W = 0, H = 0, score = 0, last = performance.now()
    function setScore(n) { score = Math.max(0, n|0); scoreEl.textContent = String(score) }
    function reportScore() {
      if (score > 0) {
        try { parent.postMessage({ type: 'gamescroll:score', score }, '*') } catch (e) {}
      }
    }
    function bump(n) {
      const amount = n || 1
      setScore(score + amount)
      if (window.Juice) {
        const pos = typeof scorePos === 'function' ? scorePos() : null
        if (pos) Juice.onScore(amount, pos[0], pos[1])
        else Juice.onScore(amount)
      }
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
    ;(function () {
      const __halt = GS.halt
      GS.halt = function () {
        reportScore()
        __halt()
      }
    })()
    if (typeof die === 'function') {
      const __die = die
      die = function () {
        reportScore()
        if (window.Juice) {
          const pos = typeof diePos === 'function' ? diePos() : null
          if (pos) Juice.onDie(pos[0], pos[1])
          else Juice.onDie()
        }
        __die()
      }
    }
    function loop(now) {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      if (window.PF) PF.t += dt
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
    let padSquash = 1, ballSquish = 1
    function diePos() { return [px, H - 41] }
    function scorePos() { return ball ? [ball.x, ball.y] : [px, H - 41] }
    function reset() {
      pw = Math.min(140, W * 0.32); px = W * 0.5
      ball = { x: W * 0.5, y: H * 0.4, r: 10 }
      const a = -Math.PI * 0.75 + Math.random() * Math.PI * 0.5
      const sp = 280 + Math.random() * 60
      vx = Math.cos(a) * sp; vy = Math.abs(Math.sin(a) * sp)
      padSquash = 1; ballSquish = 1
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
        padSquash = 1.35; ballSquish = 1.3
      }
      if (ball.y > H + 20) die()
      padSquash += (1 - padSquash) * Math.min(1, dt * 8)
      ballSquish += (1 - ballSquish) * Math.min(1, dt * 8)
    }
    function draw() {
      PF.sky(ctx, W, H, '#134e33', '#2d8659', '#74c69d')
      PF.blobs(ctx, W, H, '#40916c', 5)
      PF.dots(ctx, W, H, '#d8f3dc', 16, 0.8)
      const py = H - 48
      PF.block(ctx, px - pw * 0.5, py, pw, 14 * padSquash, '#eafff3', '#95d5b2', 8)
      PF.buddy(ctx, ball.x, ball.y, ball.r + 4, '#ffd60a', '#ffba08', {
        lookX: vx / 300, lookY: vy > 0 ? 0.6 : -0.6, squash: ballSquish, stretch: 1 / ballSquish, blush: true
      })
    }
    function move(x) { px = Math.max(pw * 0.5, Math.min(W - pw * 0.5, x)) }
    addEventListener('pointermove', e => { if (!GS.paused) move(e.clientX) })
    addEventListener('pointerdown', e => { if (!GS.paused) move(e.clientX) })
    reset()
`,
  },

  flappy: {
    title: 'Flappy',
    bg: '#2d6a4f',
    body: `
    let y, v, pipes, gap = 130
    let clouds = [], hills = [], groundX = 0, hillX = 0, cloudX = 0
    let flapT = 0, wing = 0, squash = 1, stretch = 1
    const SCROLL = 150, GROUND_H = 72, PIPE_W = 54, BIRD_R = 14
    const bx = () => W * 0.3
    function diePos() { return [bx(), y] }
    function scorePos() { return [bx(), y] }
    function seedWorld() {
      clouds = []
      for (let i = 0; i < 6; i++) {
        clouds.push({
          x: Math.random() * W * 1.4,
          y: H * (0.08 + Math.random() * 0.32),
          s: 0.55 + Math.random() * 0.9,
          a: 0.35 + Math.random() * 0.35,
        })
      }
      hills = []
      for (let i = 0; i < 5; i++) {
        hills.push({
          x: i * W * 0.45 + Math.random() * 40,
          w: W * (0.4 + Math.random() * 0.35),
          h: H * (0.12 + Math.random() * 0.14),
          shade: i % 2 === 0 ? '#40916c' : '#52b788',
        })
      }
      groundX = 0; hillX = 0; cloudX = 0
    }
    function reset() {
      y = H * 0.45; v = 0
      pipes = [{ x: W + 40, gapY: H * 0.4, passed: false }]
      flapT = 0; wing = 0; squash = 1; stretch = 1
      seedWorld(); setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function flap() {
      if (GS.paused) return
      v = -7.4
      flapT = 0.28
      squash = 1.28
      stretch = 0.72
    }
    function tick(dt) {
      v += 20 * dt; y += v
      const floorY = H - GROUND_H - 8
      if (y < 20 || y > floorY) die()
      for (const p of pipes) p.x -= SCROLL * dt
      if (pipes[0] && pipes[0].x < -70) pipes.shift()
      if (pipes.length && pipes[pipes.length - 1].x < W * 0.45) {
        pipes.push({ x: W + 40, gapY: H * (0.25 + Math.random() * 0.35), passed: false })
      }
      for (const p of pipes) {
        const inX = bx() + BIRD_R > p.x && bx() - BIRD_R < p.x + PIPE_W
        const inGap = y > p.gapY && y < p.gapY + gap
        if (inX && !inGap) die()
        if (!p.passed && p.x + PIPE_W < bx()) { p.passed = true; bump() }
      }
      groundX = (groundX + SCROLL * dt) % 48
      hillX = (hillX + SCROLL * 0.35 * dt) % (W * 0.45)
      cloudX += SCROLL * 0.12 * dt
      if (flapT > 0) {
        flapT -= dt
        wing = Math.sin(flapT * 42) * 0.85
      } else {
        wing += (Math.max(-0.35, Math.min(0.55, v * 0.06)) - wing) * Math.min(1, dt * 8)
      }
      squash += (1 - squash) * Math.min(1, dt * 10)
      stretch += (1 - stretch) * Math.min(1, dt * 10)
    }
    function roundRect(x, y0, w, h, r) {
      const rr = Math.min(r, w * 0.5, h * 0.5)
      ctx.beginPath()
      ctx.moveTo(x + rr, y0)
      ctx.arcTo(x + w, y0, x + w, y0 + h, rr)
      ctx.arcTo(x + w, y0 + h, x, y0 + h, rr)
      ctx.arcTo(x, y0 + h, x, y0, rr)
      ctx.arcTo(x, y0, x + w, y0, rr)
      ctx.closePath()
    }
    function drawCloud(c, ox) {
      const x = ((c.x - ox) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.2
      const y0 = c.y, s = c.s
      ctx.fillStyle = 'rgba(255,255,255,' + c.a + ')'
      ctx.beginPath(); ctx.ellipse(x, y0, 28 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(x - 22 * s, y0 + 4, 18 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(x + 24 * s, y0 + 2, 20 * s, 13 * s, 0, 0, Math.PI * 2); ctx.fill()
    }
    function drawPipe(p) {
      const x = p.x, topH = p.gapY, botY = p.gapY + gap, botH = H - GROUND_H - botY
      const cap = 18, lip = 10
      // top shaft
      const tg = ctx.createLinearGradient(x, 0, x + PIPE_W, 0)
      tg.addColorStop(0, '#1b4332'); tg.addColorStop(0.22, '#2d6a4f')
      tg.addColorStop(0.55, '#52b788'); tg.addColorStop(0.78, '#40916c'); tg.addColorStop(1, '#1b4332')
      ctx.fillStyle = tg
      ctx.fillRect(x + 2, 0, PIPE_W - 4, Math.max(0, topH - cap))
      // top cap
      roundRect(x - lip * 0.5, topH - cap, PIPE_W + lip, cap, 6)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(x + 8, 0, 6, Math.max(0, topH - 4))
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(x + PIPE_W - 10, 0, 5, Math.max(0, topH - 4))
      // bottom shaft
      ctx.fillStyle = tg
      if (botH > 0) ctx.fillRect(x + 2, botY + cap, PIPE_W - 4, Math.max(0, botH - cap))
      roundRect(x - lip * 0.5, botY, PIPE_W + lip, cap, 6)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      if (botH > 0) ctx.fillRect(x + 8, botY + 4, 6, Math.max(0, botH - 4))
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      if (botH > 0) ctx.fillRect(x + PIPE_W - 10, botY + 4, 5, Math.max(0, botH - 4))
      // rim lines
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x - lip * 0.5, topH - 1); ctx.lineTo(x + PIPE_W + lip * 0.5, topH - 1); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x - lip * 0.5, botY + 1); ctx.lineTo(x + PIPE_W + lip * 0.5, botY + 1); ctx.stroke()
    }
    function drawGround() {
      const gy = H - GROUND_H
      const dirt = ctx.createLinearGradient(0, gy, 0, H)
      dirt.addColorStop(0, '#d8a048'); dirt.addColorStop(0.35, '#b08968'); dirt.addColorStop(1, '#7f5539')
      ctx.fillStyle = dirt; ctx.fillRect(0, gy, W, GROUND_H)
      ctx.fillStyle = '#74c69d'
      ctx.fillRect(0, gy, W, 14)
      ctx.fillStyle = '#40916c'
      for (let i = -1; i < W / 24 + 2; i++) {
        const gx = i * 24 - groundX
        ctx.beginPath()
        ctx.moveTo(gx, gy + 14)
        ctx.lineTo(gx + 12, gy + 2)
        ctx.lineTo(gx + 24, gy + 14)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      for (let i = -1; i < W / 48 + 2; i++) {
        ctx.fillRect(i * 48 - groundX * 0.5, gy + 28, 22, 8)
      }
    }
    function drawBird() {
      const x = bx(), ang = Math.max(-0.65, Math.min(1.15, Math.atan2(v, SCROLL * 0.55)))
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(ang)
      ctx.scale(squash, stretch)
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath(); ctx.ellipse(2, 16, 12, 4, 0, 0, Math.PI * 2); ctx.fill()
      // body
      const body = ctx.createRadialGradient(-4, -4, 2, 0, 0, 16)
      body.addColorStop(0, '#ffe066'); body.addColorStop(0.55, '#ffba08'); body.addColorStop(1, '#e85d04')
      ctx.fillStyle = body
      ctx.beginPath(); ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2); ctx.fill()
      // belly
      ctx.fillStyle = '#fff3bf'
      ctx.beginPath(); ctx.ellipse(1, 4, 9, 6, 0, 0, Math.PI * 2); ctx.fill()
      // wing
      ctx.save()
      ctx.translate(-2, 1)
      ctx.rotate(wing)
      ctx.fillStyle = '#f48c06'
      ctx.beginPath(); ctx.ellipse(-2, 0, 9, 5.5, -0.2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ffba08'
      ctx.beginPath(); ctx.ellipse(-1, -1, 5, 3, -0.2, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      // beak
      ctx.fillStyle = '#f77f00'
      ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(22, 1); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#e85d04'
      ctx.beginPath(); ctx.moveTo(12, 1); ctx.lineTo(20, 2); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill()
      // eye
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.ellipse(6, -4, 4.2, 4.5, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#1b1b1b'
      ctx.beginPath(); ctx.arc(7.2, -3.5, 1.8, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(7.8, -4.2, 0.7, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
    function draw() {
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#4cc9f0'); sky.addColorStop(0.45, '#90e0ef'); sky.addColorStop(1, '#b7e4c7')
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
      for (const c of clouds) drawCloud(c, cloudX)
      const baseY = H - GROUND_H - 8
      for (const h of hills) {
        const hx = ((h.x - hillX) % (W * 2.2) + W * 2.2) % (W * 2.2) - W * 0.3
        ctx.fillStyle = h.shade
        ctx.beginPath()
        ctx.moveTo(hx, baseY)
        ctx.quadraticCurveTo(hx + h.w * 0.5, baseY - h.h, hx + h.w, baseY)
        ctx.closePath(); ctx.fill()
      }
      for (const p of pipes) drawPipe(p)
      drawGround()
      drawBird()
    }
    addEventListener('pointerdown', flap)
    reset()
`,
  },

  lanes: {
    title: 'Lane Switch',
    bg: '#1d3557',
    body: `
    const LANES = [0.28, 0.72]
    let lane = 0, blocks = [], spawn = 0, py
    let laneX = 0, squash = 1, stretch = 1
    function diePos() { return [laneX, py] }
    function scorePos() { return [laneX, py] }
    function reset() {
      lane = 0; blocks = []; spawn = 0.5; setScore(0); py = H * 0.78
      laneX = W * LANES[0]; squash = 1; stretch = 1
    }
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
      laneX += (px - laneX) * Math.min(1, dt * 16)
      squash += (1 - squash) * Math.min(1, dt * 10)
      stretch += (1 - stretch) * Math.min(1, dt * 10)
    }
    function draw() {
      PF.sky(ctx, W, H, '#0d1b2a', '#1d3557', '#457b9d')
      PF.blobs(ctx, W, H, '#457b9d', 5)
      PF.dots(ctx, W, H, '#a8dadc', 16, 0.8)
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.fillRect(W * 0.5 - 2, 0, 4, H)
      for (const b of blocks) {
        PF.block(ctx, W * LANES[b.lane] - 28, b.y, 56, b.h, '#ff8fa3', '#e63946', 12)
      }
      const bob = PF.bob(4, 5, 0)
      PF.buddy(ctx, laneX, py + bob, 20, '#a8dadc', '#48cae4', { lookY: -0.3, squash, stretch, blush: true })
    }
    addEventListener('pointerdown', () => { if (!GS.paused) { lane = 1 - lane; squash = 0.75; stretch = 1.25 } })
    reset()
`,
  },

  stack: {
    title: 'Falling Stack',
    bg: '#7b2d26',
    body: `
    let pieces = [], cur, dir = 1, speed = 180, baseW
    let wobble = 0
    function diePos() { return cur ? [cur.x, cur.y] : [W * 0.5, H * 0.5] }
    function scorePos() { return cur ? [cur.x, cur.y] : [W * 0.5, H * 0.5] }
    function reset() {
      baseW = Math.min(200, W * 0.55)
      pieces = [{ x: W * 0.5, w: baseW, y: H - 40 }]
      spawn(); setScore(0); speed = 180; wobble = 0
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
      wobble = 1
      if (pieces.length > 12) {
        const shift = pieces[1].y - pieces[0].y
        pieces.shift()
        for (const p of pieces) p.y += shift
      }
      speed = Math.min(320, speed + 6)
      spawn()
    }
    function tick(dt) {
      if (wobble > 0) wobble = Math.max(0, wobble - dt * 3)
      if (!cur || !cur.moving) return
      cur.x += dir * speed * dt
      if (cur.x < cur.w * 0.5 || cur.x > W - cur.w * 0.5) dir *= -1
    }
    function draw() {
      PF.sky(ctx, W, H, '#3d1f14', '#7b2d26', '#e09f3e')
      PF.blobs(ctx, W, H, '#e09f3e', 4)
      PF.dots(ctx, W, H, '#ffe8a3', 14, 0.6)
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i]
        const wob = i === pieces.length - 1 ? wobble : 0
        PF.block(ctx, p.x - p.w * 0.5, p.y - wob * 4, p.w, 28 + wob * 4, '#ffe066', '#f4d35e', 8)
      }
      if (cur) {
        PF.block(ctx, cur.x - cur.w * 0.5, cur.y, cur.w, 28, '#ffffff', '#e9ecef', 8)
        const er = Math.min(5, cur.w * 0.12)
        ctx.fillStyle = '#1b1b1b'
        ctx.beginPath(); ctx.arc(cur.x - cur.w * 0.18, cur.y + 14, er, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(cur.x + cur.w * 0.18, cur.y + 14, er, 0, Math.PI * 2); ctx.fill()
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
    let landScale = 1
    const PCOLORS = ['#f2a6b3', '#a6d8f2', '#c7f2a6', '#f2d9a6', '#c9a6f2']
    function diePos() { return flying ? [flying.cx != null ? flying.cx : flying.x, flying.cy != null ? flying.cy : flying.y] : [W * 0.5, H * 0.5] }
    function scorePos() { const p = planets[idx]; return p ? [p.x, p.y] : [W * 0.5, H * 0.5] }
    function makePlanets() {
      planets = []
      let x = W * 0.35, y = H * 0.55
      for (let i = 0; i < 8; i++) {
        planets.push({ x, y, r: 28 + Math.random() * 10 })
        x += 90 + Math.random() * 50
        y = H * (0.35 + Math.random() * 0.35)
      }
    }
    function reset() { makePlanets(); idx = 0; ang = 0; flying = null; landScale = 1; setScore(0) }
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
          if (d < n.r + 14) { idx++; bump(); flying = null; ang = 0; landScale = 1.4 }
          else die()
        } else { flying.cx = x; flying.cy = y }
        return
      }
      ang += dt * 2.4
      landScale += (1 - landScale) * Math.min(1, dt * 8)
    }
    function draw() {
      PF.sky(ctx, W, H, '#10102a', '#22223b', '#4a4e69')
      PF.dots(ctx, W, H, '#ffffff', 26, 1.2)
      PF.blobs(ctx, W, H, '#9a8c98', 4)
      for (let i = 0; i < planets.length; i++) {
        const p = planets[i]
        const c = PCOLORS[i % PCOLORS.length]
        PF.soft(ctx, p.x, p.y, p.r, i === idx ? '#ffffff' : c, i === idx ? c : '#4a4e69')
      }
      let dx, dy
      if (flying) { dx = flying.cx != null ? flying.cx : flying.x; dy = flying.cy != null ? flying.cy : flying.y }
      else {
        const p = planets[idx]
        dx = p.x + Math.cos(ang) * (p.r + 10)
        dy = p.y + Math.sin(ang) * (p.r + 10)
      }
      PF.buddy(ctx, dx, dy, 10 * landScale, '#fff3b0', '#f2e9e4', { lookX: Math.cos(ang), lookY: Math.sin(ang), blush: true })
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
    let lean = 0
    function diePos() { return [x * W, H * 0.72] }
    function scorePos() { return [x * W, H * 0.72] }
    function reset() { x = 0.5; trees = []; spawn = 0.2; setScore(0); lean = 0 }
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
      lean += ((x - 0.5) * 1.4 - lean) * Math.min(1, dt * 8)
    }
    function draw() {
      PF.sky(ctx, W, H, '#caf0f8', '#a8dadc', '#457b9d')
      PF.blobs(ctx, W, H, '#ffffff', 5)
      PF.dots(ctx, W, H, '#ffffff', 20, 0.5)
      for (const t of trees) {
        if (t.kind === 't') {
          PF.block(ctx, t.x * W - 4, t.y - 6, 8, 20, '#7f5539', '#4a2c14', 3)
          ctx.fillStyle = '#2d6a4f'
          ctx.beginPath(); ctx.moveTo(t.x * W, t.y - 34)
          ctx.lineTo(t.x * W - 16, t.y - 4); ctx.lineTo(t.x * W + 16, t.y - 4); ctx.closePath(); ctx.fill()
          ctx.fillStyle = '#40916c'
          ctx.beginPath(); ctx.moveTo(t.x * W, t.y - 22)
          ctx.lineTo(t.x * W - 12, t.y + 8); ctx.lineTo(t.x * W + 12, t.y + 8); ctx.closePath(); ctx.fill()
        } else {
          PF.soft(ctx, t.x * W, t.y, 12, '#e9ecef', '#adb5bd')
        }
      }
      PF.buddy(ctx, x * W, H * 0.72, 16, '#ff8fa3', '#e63946', {
        lookX: lean, lookY: -0.2, squash: 1 - Math.abs(lean) * 0.06, stretch: 1 + Math.abs(lean) * 0.06, blush: true
      })
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
    let flip = 0
    function diePos() { return [W * 0.22, y] }
    function scorePos() { return [W * 0.22, y] }
    function reset() { onCeil = false; obstacles = []; spawn = 0.4; setScore(0); y = H - 60; flip = 0 }
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
      if (flip > 0) flip -= dt * 3
    }
    function draw() {
      PF.sky(ctx, W, H, '#20233d', '#3d405b', '#5c6291')
      PF.dots(ctx, W, H, '#f2cc8f', 16, 1)
      PF.blobs(ctx, W, H, '#81b29a', 4)
      PF.block(ctx, 0, 0, W, 36, '#a3d9c9', '#81b29a', 0)
      PF.block(ctx, 0, H - 36, W, 36, '#81b29a', '#5f9482', 0)
      for (const o of obstacles) {
        const oy = o.ceil ? 36 : H - 36 - o.h
        PF.block(ctx, o.x, oy, o.w, o.h, '#f2957a', '#e07a5f', 8)
        const tipY = o.ceil ? oy + o.h : oy
        PF.spike(ctx, o.x + o.w * 0.5, tipY, o.ceil ? 'down' : 'up', '#ffba08')
      }
      PF.buddy(ctx, W * 0.22, y, 15, '#ffe8b0', '#f2cc8f', {
        lookY: onCeil ? 1 : -1, squash: 1 + flip * 0.3, stretch: 1 - flip * 0.2, blush: true
      })
    }
    addEventListener('pointerdown', () => { if (!GS.paused) { onCeil = !onCeil; flip = 1 } })
    reset()
`,
  },

  bubbles: {
    title: 'Bubble Pressure',
    bg: '#0077b6',
    body: `
    let bubbles = [], spawn = 0
    let lastPop = null
    const BCOLORS = [['#ffd6e8', '#ff8fa3'], ['#caf0f8', '#48cae4'], ['#d0f4de', '#74c69d'], ['#fff3b0', '#ffca3a']]
    function diePos() { return lastPop || [W * 0.5, H * 0.5] }
    function scorePos() { return lastPop || [W * 0.5, H * 0.5] }
    function reset() { bubbles = []; spawn = 0.1; setScore(0); lastPop = null }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        bubbles.push({ x: 40 + Math.random() * (W - 80), y: H + 20, r: 18 + Math.random() * 16, v: 70 + Math.random() * 50, hue: Math.random() })
        spawn = 0.45 + Math.random() * 0.35
      }
      for (const b of bubbles) b.y -= b.v * dt
      for (const b of bubbles) if (b.y + b.r < 0) { lastPop = [b.x, 0]; die(); return }
    }
    function draw() {
      PF.sky(ctx, W, H, '#023e8a', '#0077b6', '#90e0ef')
      PF.dots(ctx, W, H, '#caf0f8', 18, 1)
      PF.blobs(ctx, W, H, '#48cae4', 5)
      for (const b of bubbles) {
        const c = BCOLORS[Math.floor(b.hue * BCOLORS.length) % BCOLORS.length]
        PF.buddy(ctx, b.x, b.y, b.r, c[0], c[1], { lookY: -0.4, blush: true })
      }
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]
        if (Math.hypot(e.clientX - b.x, e.clientY - b.y) < b.r + 8) {
          lastPop = [b.x, b.y]
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
    function diePos() { return [W * 0.5, ballY] }
    function scorePos() { return [W * 0.5, ballY] }
    function draw() {
      PF.sky(ctx, W, H, '#38215e', '#6a4c93', '#a084ca')
      PF.dots(ctx, W, H, '#ffffff', 22, 1)
      PF.blobs(ctx, W, H, '#c9a8ff', 5)
      const cx = W * 0.5, R = Math.min(W * 0.38, 140)
      for (const s of segs) {
        ctx.save()
        ctx.strokeStyle = s.bad ? '#ef476f' : '#ffd166'
        ctx.lineWidth = 12
        ctx.lineCap = 'round'
        ctx.shadowColor = s.bad ? 'rgba(239,71,111,0.55)' : 'rgba(255,209,102,0.55)'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(cx, s.y, R, rot + s.gap + 1.1, rot + s.gap + Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      const sq = 1 + Math.max(-0.22, Math.min(0.22, ballV * 0.0007))
      PF.buddy(ctx, cx, ballY, 13, '#ffffff', '#ffe6a7', {
        squash: 1 / Math.max(0.7, sq), stretch: sq,
        lookY: Math.max(-1, Math.min(1, ballV * 0.01)), blush: true,
      })
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
    function diePos() { return [carX * W, H * 0.72] }
    function scorePos() { return [carX * W, H * 0.72] }
    function draw() {
      PF.sky(ctx, W, H, '#0b3d3a', '#2a9d8f', '#57cc99')
      PF.dots(ctx, W, H, '#ffffff', 16, 0.7)
      const rowH = H / (road.length - 1)
      for (let i = 0; i < road.length - 1; i++) {
        const a = road[i], b = road[i + 1]
        const y0 = i * rowH, y1 = (i + 1) * rowH
        const g = ctx.createLinearGradient(0, y0, 0, y1)
        g.addColorStop(0, '#264653'); g.addColorStop(1, '#2f5d63')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo((a.c - a.w * 0.5) * W, y0)
        ctx.lineTo((a.c + a.w * 0.5) * W, y0)
        ctx.lineTo((b.c + b.w * 0.5) * W, y1)
        ctx.lineTo((b.c - b.w * 0.5) * W, y1)
        ctx.closePath(); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(a.c * W, y0); ctx.lineTo(b.c * W, y1)
        ctx.stroke()
      }
      PF.buddy(ctx, carX * W, H * 0.72, 20, '#e9c46a', '#f4a261', { lookY: -0.3, blush: true })
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
    function diePos() { return [bx, by] }
    function scorePos() { return [bx, by] }
    function draw() {
      PF.sky(ctx, W, H, '#7a2e1d', '#e76f51', '#f4a261')
      PF.dots(ctx, W, H, '#ffe8d6', 18, 0.8)
      PF.blobs(ctx, W, H, '#ffffff', 4)
      for (const s of spikes) {
        PF.spike(ctx, s.x, s.y, s.up ? 'down' : 'up', '#e9c46a')
      }
      const sq = 1 + Math.max(-0.16, Math.min(0.16, -bv * 0.0011))
      PF.buddy(ctx, bx, by, 20, '#f8a7a0', '#e76f51', {
        stretch: sq, squash: 1 / Math.max(0.75, sq),
        lookY: bv > 0 ? 0.4 : -0.4, blush: true,
      })
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(bx, by + 22); ctx.lineTo(bx, by + 34); ctx.stroke()
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
    function diePos() { return [W * 0.5, ballY] }
    function scorePos() { return [W * 0.5, ballY] }
    function draw() {
      PF.sky(ctx, W, H, '#5c1113', '#9b2226', '#c1444a')
      PF.dots(ctx, W, H, '#ffd8a8', 16, 0.7)
      for (const g of gates) {
        PF.block(ctx, W * 0.15, g.y, W * 0.7, 18, COLORS[g.c], COLORS[g.c], 8)
      }
      PF.buddy(ctx, W * 0.5, ballY, 18, COLORS[color], COLORS[color], { blush: true })
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
    function diePos() { return [x, y - cam] }
    function scorePos() { return [x, y - cam] }
    function draw() {
      PF.sky(ctx, W, H, '#0b4a43', '#2a9d8f', '#7ae0b0')
      PF.dots(ctx, W, H, '#ffffff', 20, 1)
      for (const p of plats) {
        PF.block(ctx, p.x, p.y - cam, p.w, 12, '#f4d35e', '#e9c46a', 6)
      }
      const sq = 1 + Math.max(-0.2, Math.min(0.2, -v * 0.00045))
      PF.buddy(ctx, x, y - cam, 16, '#f4a261', '#e76f51', {
        stretch: sq, squash: 1 / Math.max(0.75, sq),
        lookY: v > 0 ? 0.3 : -0.3, blush: true,
      })
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
    function diePos() { return [x * W, H * 0.65] }
    function scorePos() { return [x * W, H * 0.65] }
    function draw() {
      PF.sky(ctx, W, H, '#020a35', '#023e8a', '#0077b6')
      PF.dots(ctx, W, H, '#caf0f8', 24, 1.2)
      const rowH = H / (walls.length - 1)
      for (let i = 0; i < walls.length - 1; i++) {
        const a = walls[i], b = walls[i + 1]
        const y0 = i * rowH, y1 = (i + 1) * rowH
        const g = ctx.createLinearGradient(0, y0, 0, y1)
        g.addColorStop(0, '#0077b6'); g.addColorStop(1, '#0096c7')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(0, y0); ctx.lineTo((a.c - a.w * 0.5) * W, y0)
        ctx.lineTo((b.c - b.w * 0.5) * W, y1); ctx.lineTo(0, y1); ctx.fill()
        ctx.beginPath()
        ctx.moveTo(W, y0); ctx.lineTo((a.c + a.w * 0.5) * W, y0)
        ctx.lineTo((b.c + b.w * 0.5) * W, y1); ctx.lineTo(W, y1); ctx.fill()
      }
      PF.buddy(ctx, x * W, H * 0.65, 14, '#caf0f8', '#90e0ef', { lookX: Math.sin(PF.t * 2) * 0.3, blush: true })
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
    function diePos() { return [W * 0.5, H * 0.5] }
    function scorePos() { return [W * 0.5, H * 0.5] }
    function draw() {
      PF.sky(ctx, W, H, '#1c1e3a', '#4a4e69', '#6b7099')
      PF.dots(ctx, W, H, '#ffffff', 26, 1.4)
      const cx = W * 0.5, cy = H * 0.5
      PF.buddy(ctx, cx, cy, 24, '#c9c3d9', '#9a8c98', { blush: true })
      ctx.save()
      ctx.strokeStyle = '#f2e9e4'
      ctx.lineWidth = 9
      ctx.shadowColor = 'rgba(242,233,228,0.6)'
      ctx.shadowBlur = 10
      ctx.beginPath(); ctx.arc(cx, cy, 42, ang - 0.5, ang + 0.5); ctx.stroke()
      ctx.restore()
      for (const s of shots) {
        PF.soft(ctx, cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r, 9, '#ff8fa3', '#ef476f')
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
    function diePos() { return [W * 0.5, H * 0.5] }
    function scorePos() { return [W * 0.5, H * 0.5] }
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
      PF.sky(ctx, W, H, '#3a2a5e', '#5e548e', flash > 0 ? '#9f86c0' : '#231942')
      PF.dots(ctx, W, H, '#e0aaff', 22, 0.7)
      const cx = W * 0.5, cy = H * 0.5
      const near = rings[0] ? Math.max(0, 1 - Math.abs(rings[0].r - 36) / 60) : 0
      ctx.strokeStyle = '#e0aaff'; ctx.lineWidth = 3
      for (const r of rings) {
        ctx.globalAlpha = Math.max(0.25, Math.min(1, (Math.max(W, H) * 0.55 - r.r) / 80))
        ctx.beginPath(); ctx.arc(cx, cy, r.r, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.globalAlpha = 1
      PF.buddy(ctx, cx, cy, 34 + near * 6, flash > 0 ? '#ffd6ff' : '#c8b6ff', '#7b5ea7', {
        squash: 1 + flash * 0.3, stretch: 1 - flash * 0.2, blush: flash > 0,
      })
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
      PF.sky(ctx, W, H, '#0b1330', '#14213d', '#1b2a4a')
      PF.dots(ctx, W, H, '#48cae4', 16, 0.5)
      const half = CS * 0.5
      PF.soft(ctx, food.x * CS + half, food.y * CS + half, half + 4, '#ffd166', '#fca311')
      for (let i = body.length - 1; i >= 1; i--) {
        const p = body[i]
        PF.block(ctx, p.x * CS + 1, p.y * CS + 1, CS - 2, CS - 2, '#40916c', '#2a9d8f', 6)
      }
      const h = body[0]
      PF.buddy(ctx, h.x * CS + half, h.y * CS + half, half + 2, '#52b788', '#2a9d8f', { lookX: dir.x, lookY: dir.y })
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
          L.t = 1.6 + Math.random() * 1.6
        }
        for (const c of L.cars) c.x += c.dir * (2 + score * 0.05) * dt
        L.cars = L.cars.filter(c => c.x > -2 && c.x < cols + 2)
        if (player.r === i) {
          for (const c of L.cars) if (Math.abs(c.x - player.c) < 0.7) die()
        }
      }
    }
    function diePos() {
      const rowH = H / lanes.length
      return [(player.c / cols) * W + (W / cols) * 0.5, H - (player.r + 1) * rowH + rowH * 0.5]
    }
    function scorePos() { return diePos() }
    function draw() {
      const rowH = H / lanes.length
      for (let i = 0; i < lanes.length; i++) {
        const L = lanes[i]
        ctx.fillStyle = L.kind === 'safe' ? '#a98467' : L.kind === 'river' ? '#4cc9f0' : L.kind === 'rail' ? '#495057' : '#343a40'
        ctx.fillRect(0, H - (i + 1) * rowH, W, rowH)
        for (const c of L.cars) {
          const cw = W / cols - 8, ch = rowH - 16
          if (L.kind === 'river') PF.block(ctx, (c.x / cols) * W, H - (i + 1) * rowH + 8, cw, ch, '#48cae4', '#0077b6', 8)
          else PF.block(ctx, (c.x / cols) * W, H - (i + 1) * rowH + 8, cw, ch, '#ff8fa3', '#ef476f', 6)
        }
      }
      PF.dots(ctx, W, H, '#ffffff', 14, 0.4)
      const [px, py] = diePos()
      PF.buddy(ctx, px, py, Math.min(W / cols, rowH) * 0.32, '#ffe066', '#ffba08')
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
    function diePos() { return [bx, H - 58] }
    function scorePos() { return [bx, H - 58] }
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
      PF.sky(ctx, W, H, '#240046', '#3c096c', '#5a189a')
      PF.blobs(ctx, W, H, '#c77dff', 5)
      PF.dots(ctx, W, H, '#e0aaff', 18, 0.6)
      for (const it of items) {
        if (it.good) PF.soft(ctx, it.x, it.y, 13, '#b9fbc0', '#38b000')
        else PF.soft(ctx, it.x, it.y, 13, '#ffb3c1', '#ef476f')
      }
      PF.buddy(ctx, bx, H - 58, 26, '#e0aaff', '#9d4edd', { lookY: -0.4 })
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
    function diePos() { return [x * W, H * 0.7] }
    function scorePos() { return [x * W, H * 0.7] }
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
      PF.sky(ctx, W, H, '#3a1f0a', '#582f0e', '#7f4f24')
      PF.dots(ctx, W, H, '#dda15e', 16, 0.5)
      const rowH = H / (path.length - 1)
      ctx.strokeStyle = '#dda15e'; ctx.lineWidth = 20; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 0; i < path.length; i++) {
        const px = path[i] * W, py = i * rowH
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 6
      ctx.stroke()
      const target = path[Math.floor(path.length * 0.7)]
      PF.buddy(ctx, x * W, H * 0.7, 15, '#ffd6a5', '#bc6c25', { lookX: (target - x) * 4 })
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
    function diePos() { return [x, y] }
    function scorePos() { return [x, y] }
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
      PF.sky(ctx, W, H, '#6a040f', '#9d0208', '#bc4749')
      PF.dots(ctx, W, H, '#ffba08', 14, 0.6)
      PF.block(ctx, 0, 0, 28, H, '#370617', '#5a0210', 0)
      PF.block(ctx, W - 28, 0, 28, H, '#370617', '#5a0210', 0)
      for (const s of spikes) {
        const tipX = s.side < 0 ? 50 : W - 50
        PF.spike(ctx, tipX, s.y, s.side < 0 ? 'right' : 'left', '#ffba08')
      }
      PF.buddy(ctx, x, y, 14, '#fff3b0', '#f8f9fa', { lookX: side })
    }
    addEventListener('pointerdown', () => { if (!GS.paused) side *= -1 })
    reset()
`,
  },

  fish: {
    title: 'Tiny Fish',
    bg: '#0077b6',
    body: `
    let y, v = 0, holding = false, rocks = [], spawn = 0
    let bubbles = [], kelp = [], rays = [], sandX = 0, kelpX = 0, rayT = 0
    let fin = 0, squash = 1, stretch = 1, pulse = 0, tAcc = 0
    const SCROLL = 170, SAND_H = 64, FISH_RX = 16, FISH_RY = 10
    const fx = () => W * 0.28
    function diePos() { return [fx(), y] }
    function scorePos() { return [fx(), y] }
    function seedWorld() {
      kelp = []
      for (let i = 0; i < 8; i++) {
        kelp.push({
          x: i * W * 0.28 + Math.random() * 40,
          h: H * (0.22 + Math.random() * 0.28),
          w: 10 + Math.random() * 10,
          sway: Math.random() * Math.PI * 2,
          shade: i % 2 === 0 ? '#1b4332' : '#2d6a4f',
        })
      }
      rays = []
      for (let i = 0; i < 5; i++) {
        rays.push({
          x: Math.random() * W,
          w: 28 + Math.random() * 40,
          a: 0.04 + Math.random() * 0.06,
          speed: 12 + Math.random() * 18,
        })
      }
      bubbles = []
      for (let i = 0; i < 14; i++) {
        bubbles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 1.5 + Math.random() * 3.5,
          vy: 18 + Math.random() * 36,
          drift: (Math.random() - 0.5) * 20,
          a: 0.2 + Math.random() * 0.35,
        })
      }
      sandX = 0; kelpX = 0; rayT = 0
    }
    function reset() {
      y = H * 0.5; v = 0; holding = false
      rocks = []; spawn = 0.35
      fin = 0; squash = 1; stretch = 1; pulse = 0; tAcc = 0
      seedWorld(); setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function startHold() {
      if (GS.paused) return
      holding = true
      squash = 1.22
      stretch = 0.78
      pulse = 0.22
    }
    function endHold() { holding = false }
    function tick(dt) {
      tAcc += dt
      const target = holding ? -175 : 175
      v += (target - v) * Math.min(1, dt * 6)
      y += v * dt
      const floorY = H - SAND_H - 6
      if (y < 18 || y > floorY) die()
      spawn -= dt
      if (spawn <= 0) {
        const kind = Math.random()
        rocks.push({
          x: W + 40,
          y: 50 + Math.random() * (floorY - 90),
          r: 15 + Math.random() * 22,
          kind: kind < 0.45 ? 'coral' : kind < 0.75 ? 'rock' : 'anemone',
          spin: Math.random() * Math.PI * 2,
          hue: Math.random(),
        })
        spawn = 0.48 + Math.random() * 0.38
      }
      for (const r of rocks) {
        r.x -= SCROLL * dt
        r.spin += dt * 0.4
      }
      rocks = rocks.filter(r => {
        if (r.x < -50) { bump(); return false }
        const hitR = r.kind === 'anemone' ? r.r * 0.72 : r.r * 0.85
        if (Math.hypot(r.x - fx(), r.y - y) < hitR + 11) die()
        return true
      })
      sandX = (sandX + SCROLL * dt) % 40
      kelpX = (kelpX + SCROLL * 0.28 * dt) % (W * 0.28)
      rayT += dt
      for (const b of bubbles) {
        b.y -= b.vy * dt
        b.x += Math.sin(tAcc * 2 + b.y * 0.02) * b.drift * dt
        if (b.y < -10) {
          b.y = H + 10
          b.x = Math.random() * W
        }
      }
      if (holding && pulse <= 0 && Math.random() < dt * 4) {
        pulse = 0.12
      }
      if (pulse > 0) pulse -= dt
      const flapSpeed = holding ? 14 : 5
      fin += (Math.sin(tAcc * flapSpeed) * (holding ? 0.7 : 0.35) - fin) * Math.min(1, dt * 12)
      squash += (1 - squash) * Math.min(1, dt * 9)
      stretch += (1 - stretch) * Math.min(1, dt * 9)
    }
    function drawSand() {
      const gy = H - SAND_H
      const floor = ctx.createLinearGradient(0, gy - 20, 0, H)
      floor.addColorStop(0, 'rgba(2,62,138,0)')
      floor.addColorStop(0.35, '#0077b6')
      floor.addColorStop(0.7, '#c9a227')
      floor.addColorStop(1, '#8b5e34')
      ctx.fillStyle = floor
      ctx.fillRect(0, gy - 20, W, SAND_H + 20)
      ctx.fillStyle = '#e9c46a'
      ctx.beginPath()
      ctx.moveTo(0, gy + 8)
      for (let i = -1; i < W / 40 + 3; i++) {
        const sx = i * 40 - sandX
        ctx.quadraticCurveTo(sx + 20, gy - 4 - (i % 3) * 3, sx + 40, gy + 8)
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      for (let i = -1; i < W / 28 + 2; i++) {
        ctx.beginPath()
        ctx.arc(i * 28 - sandX * 0.6, gy + 18 + (i % 4) * 6, 2 + (i % 3), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    function drawKelp() {
      const baseY = H - SAND_H + 4
      for (const k of kelp) {
        const kx = ((k.x - kelpX) % (W * 2.4) + W * 2.4) % (W * 2.4) - W * 0.3
        const sway = Math.sin(tAcc * 1.4 + k.sway) * 18
        ctx.strokeStyle = k.shade
        ctx.lineWidth = k.w
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(kx, baseY)
        ctx.quadraticCurveTo(kx + sway * 0.4, baseY - k.h * 0.45, kx + sway, baseY - k.h)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(82,183,136,0.45)'
        ctx.lineWidth = k.w * 0.35
        ctx.beginPath()
        ctx.moveTo(kx - 2, baseY)
        ctx.quadraticCurveTo(kx + sway * 0.4 - 2, baseY - k.h * 0.45, kx + sway - 2, baseY - k.h)
        ctx.stroke()
      }
    }
    function drawRays() {
      for (const r of rays) {
        const rx = ((r.x + rayT * r.speed) % (W + 80)) - 40
        ctx.fillStyle = 'rgba(202,240,248,' + r.a + ')'
        ctx.beginPath()
        ctx.moveTo(rx, 0)
        ctx.lineTo(rx + r.w, 0)
        ctx.lineTo(rx + r.w * 1.6, H * 0.7)
        ctx.lineTo(rx - r.w * 0.3, H * 0.7)
        ctx.closePath(); ctx.fill()
      }
    }
    function drawBubbles() {
      for (const b of bubbles) {
        ctx.strokeStyle = 'rgba(255,255,255,' + b.a + ')'
        ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,' + (b.a * 0.35) + ')'
        ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2); ctx.fill()
      }
    }
    function drawRock(r) {
      ctx.save()
      ctx.translate(r.x, r.y)
      if (r.kind === 'coral') {
        const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, r.r)
        g.addColorStop(0, '#ff85a1'); g.addColorStop(0.45, '#e63946'); g.addColorStop(1, '#9d0208')
        ctx.fillStyle = g
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + r.spin * 0.2
          const br = r.r * (0.45 + (i % 2) * 0.2)
          ctx.beginPath()
          ctx.ellipse(Math.cos(a) * r.r * 0.35, Math.sin(a) * r.r * 0.35, br * 0.55, br, a, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.beginPath(); ctx.ellipse(-r.r * 0.2, -r.r * 0.25, r.r * 0.25, r.r * 0.18, -0.4, 0, Math.PI * 2); ctx.fill()
      } else if (r.kind === 'anemone') {
        const petals = 7
        for (let i = 0; i < petals; i++) {
          const a = (i / petals) * Math.PI * 2 + Math.sin(tAcc * 3 + i) * 0.15
          const len = r.r * (0.9 + Math.sin(tAcc * 4 + i) * 0.08)
          ctx.strokeStyle = r.hue > 0.5 ? '#c77dff' : '#ff6d00'
          ctx.lineWidth = 4
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.quadraticCurveTo(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5, Math.cos(a) * len, Math.sin(a) * len)
          ctx.stroke()
        }
        ctx.fillStyle = '#ffba08'
        ctx.beginPath(); ctx.arc(0, 0, r.r * 0.28, 0, Math.PI * 2); ctx.fill()
      } else {
        const g = ctx.createRadialGradient(-r.r * 0.3, -r.r * 0.35, 2, 0, 0, r.r)
        g.addColorStop(0, '#95d5b2'); g.addColorStop(0.4, '#40916c'); g.addColorStop(1, '#1b4332')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.ellipse(0, 0, r.r * 0.72, r.r, -0.2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.beginPath(); ctx.ellipse(r.r * 0.15, r.r * 0.1, r.r * 0.35, r.r * 0.45, 0.3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.beginPath(); ctx.ellipse(-r.r * 0.25, -r.r * 0.3, r.r * 0.22, r.r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
    }
    function drawFish() {
      const ang = Math.max(-0.55, Math.min(0.7, v * 0.0035))
      ctx.save()
      ctx.translate(fx(), y)
      ctx.rotate(ang)
      ctx.scale(squash, stretch)
      // soft shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath(); ctx.ellipse(2, 14, 14, 5, 0, 0, Math.PI * 2); ctx.fill()
      // tail
      ctx.save()
      ctx.translate(-14, 0)
      ctx.rotate(fin * 0.55)
      const tail = ctx.createLinearGradient(-12, 0, 0, 0)
      tail.addColorStop(0, '#f48c06'); tail.addColorStop(1, '#ffba08')
      ctx.fillStyle = tail
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(-6, -12 - fin * 4, -16, -8)
      ctx.quadraticCurveTo(-10, 0, -16, 8)
      ctx.quadraticCurveTo(-6, 12 + fin * 4, 0, 0)
      ctx.fill()
      ctx.restore()
      // body
      const body = ctx.createRadialGradient(-3, -4, 2, 0, 0, 18)
      body.addColorStop(0, '#ffe066'); body.addColorStop(0.5, '#ffba08'); body.addColorStop(1, '#e85d04')
      ctx.fillStyle = body
      ctx.beginPath(); ctx.ellipse(0, 0, FISH_RX, FISH_RY, 0, 0, Math.PI * 2); ctx.fill()
      // belly stripe
      ctx.fillStyle = 'rgba(255,243,191,0.85)'
      ctx.beginPath(); ctx.ellipse(2, 3, 10, 5, 0, 0, Math.PI * 2); ctx.fill()
      // dorsal fin
      ctx.fillStyle = '#f48c06'
      ctx.beginPath()
      ctx.moveTo(-2, -FISH_RY + 1)
      ctx.quadraticCurveTo(2, -FISH_RY - 10 - fin * 2, 8, -FISH_RY + 2)
      ctx.quadraticCurveTo(2, -FISH_RY - 2, -2, -FISH_RY + 1)
      ctx.fill()
      // pectoral fin
      ctx.save()
      ctx.translate(2, 2)
      ctx.rotate(0.4 + fin * 0.8)
      ctx.fillStyle = '#fb8500'
      ctx.beginPath(); ctx.ellipse(0, 4, 7, 3.5, 0.2, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      // eye
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.ellipse(8, -3, 4.2, 4.4, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#1b1b1b'
      ctx.beginPath(); ctx.arc(9.2, -2.6, 1.9, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(9.8, -3.4, 0.7, 0, Math.PI * 2); ctx.fill()
      // smile / gill hint
      ctx.strokeStyle = 'rgba(232,93,4,0.55)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(6, 2, 4, 0.15, 1.1); ctx.stroke()
      // nose highlight
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath(); ctx.ellipse(11, -1, 2.2, 1.4, 0.2, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
    function drawCaustics() {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 6; i++) {
        const cx = ((i * W * 0.22 + tAcc * (8 + i * 3)) % (W + 60)) - 30
        const cy = H * (0.15 + (i % 3) * 0.18) + Math.sin(tAcc * 1.2 + i) * 18
        ctx.fillStyle = 'rgba(144,224,239,0.045)'
        ctx.beginPath()
        ctx.ellipse(cx, cy, 50 + i * 8, 18 + (i % 2) * 8, Math.sin(tAcc + i) * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#012a4a'); g.addColorStop(0.35, '#014f86'); g.addColorStop(0.7, '#0077b6'); g.addColorStop(1, '#00b4d8')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      drawRays()
      drawCaustics()
      drawKelp()
      for (const r of rocks) drawRock(r)
      drawSand()
      drawBubbles()
      drawFish()
    }
    addEventListener('pointerdown', startHold)
    addEventListener('pointerup', endHold)
    addEventListener('pointercancel', endHold)
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
      PF.sky(ctx, W, H, '#240046', '#3a0ca3', '#560bad')
      PF.blobs(ctx, W, H, '#7209b7', 5)
      PF.dots(ctx, W, H, '#f72585', 16, 0.6)
      const cx = W * 0.5, cy = H * 0.55, R = 50
      for (const g of gaps) {
        PF.block(ctx, 40, g.y, W - 80, 14, '#ff5c8a', '#f72585', 6)
        const gx = cx + Math.cos(g.open) * 40
        ctx.clearRect(gx - 36, g.y - 2, 72, 18)
      }
      PF.buddy(ctx, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 13, '#7bdff2', '#4cc9f0')
      PF.buddy(ctx, cx + Math.cos(ang + Math.PI) * R, cy + Math.sin(ang + Math.PI) * R, 13, '#ff8fe0', '#b5179e')
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
    function ballWorldPos() {
      const cx = W * 0.5, cy = H * 0.55, lx = ball, ly = -20
      return [cx + lx * Math.cos(tilt) - ly * Math.sin(tilt), cy + lx * Math.sin(tilt) + ly * Math.cos(tilt)]
    }
    function diePos() { return ballWorldPos() }
    function scorePos() { return ballWorldPos() }
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
      PF.sky(ctx, W, H, '#7f5539', '#b08968', '#ddb892')
      PF.dots(ctx, W, H, '#ffe8d6', 14, 0.4)
      const cx = W * 0.5, cy = H * 0.55
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt)
      PF.block(ctx, -120, -8, 240, 16, '#9c6644', '#7f5539', 8)
      ctx.restore()
      const [bxw, byw] = ballWorldPos()
      PF.buddy(ctx, bxw, byw, 15, '#ffe8d6', '#e6ccb2', { lookX: tilt * 3 })
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
      PF.sky(ctx, W, H, '#001d3d', '#003049', '#00243b')
      PF.dots(ctx, W, H, '#fcbf49', 16, 0.5)
      for (const g of gates) {
        PF.block(ctx, 0, g.y, W, 24, '#ffd166', '#fcbf49', 4)
        ctx.globalCompositeOperation = 'destination-out'
        drawShape(g.s, W * 0.5, g.y + 12, 22, '#000')
        ctx.globalCompositeOperation = 'source-over'
      }
      PF.soft(ctx, W * 0.5, H * 0.7, 26, 'rgba(247,127,0,0.35)', 'rgba(247,127,0,0)')
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
    function diePos() { return [x * W, H * 0.82] }
    function scorePos() { return [x * W, H * 0.82] }
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
      PF.sky(ctx, W, H, '#0d1b2a', '#1b263b', '#415a77')
      PF.blobs(ctx, W, H, '#778da9', 4)
      ctx.strokeStyle = '#a3b8cc'; ctx.lineWidth = 2
      for (const d of drops) {
        ctx.beginPath(); ctx.moveTo(d.x * W, d.y); ctx.lineTo(d.x * W, d.y + 14); ctx.stroke()
      }
      PF.buddy(ctx, x * W, H * 0.82, 15, '#e0e1dd', '#a9b4c2', { lookY: 0.3 })
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
    function diePos() { return [W * 0.3, y] }
    function scorePos() { return [W * 0.3, y] }
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
      PF.sky(ctx, W, H, '#240046', '#3c096c', '#5a189a')
      PF.dots(ctx, W, H, '#e0aaff', 16, 0.5)
      PF.block(ctx, 0, 0, W, 36, '#ff8500', '#ff6d00', 0)
      PF.block(ctx, 0, H - 36, W, 36, '#4361ee', '#3a0ca3', 0)
      for (const h of hazards) PF.block(ctx, h.x, h.y, 24, h.h, '#e0aaff', '#c77dff', 6)
      PF.buddy(ctx, W * 0.3, y, 14, pol > 0 ? '#ffb703' : '#48cae4', pol > 0 ? '#ff6d00' : '#4cc9f0', { lookY: pol })
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
    function diePos() { return [x, y] }
    function scorePos() { return [x, y] }
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
      PF.sky(ctx, W, H, '#10002b', '#240046', '#3a0ca3')
      PF.dots(ctx, W, H, '#4cc9f0', 20, 0.7)
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i], a = 1 - i / trail.length
        ctx.fillStyle = 'rgba(76,201,240,' + (a * 0.8) + ')'
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 + a * 4, 0, Math.PI * 2); ctx.fill()
      }
      PF.buddy(ctx, x, y, 13, '#ff8fa3', '#f72585')
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
    function diePos() { return [px, py] }
    function scorePos() { return [target.x, target.y] }
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
      PF.sky(ctx, W, H, '#1b1030', '#264653', '#2a9d8f')
      PF.dots(ctx, W, H, '#ffffff', 30, 0.3)
      const limit = Math.min(W, H) * (0.55 - Math.min(0.35, dark * 0.4))
      ctx.fillStyle = '#05070d'
      ctx.beginPath(); ctx.rect(0, 0, W, H)
      ctx.arc(W * 0.5, H * 0.5, limit, 0, Math.PI * 2, true); ctx.fill('evenodd')
      PF.soft(ctx, target.x, target.y, 18, '#ffe066', '#e9c46a')
      PF.buddy(ctx, px, py, 13, '#ffd6a5', '#f4a261')
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
    function diePos() { return [px, H - 44] }
    function scorePos() { return [ball.x, ball.y] }
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
      PF.sky(ctx, W, H, '#7f5539', '#e9c46a', '#f4a261')
      PF.dots(ctx, W, H, '#ffffff', 14, 0.4)
      for (const b of bricks) if (b.alive) {
        PF.block(ctx, b.x, b.y, b.w, b.h, '#ff9770', '#e76f51', 5)
      }
      PF.block(ctx, px - pw * 0.5, H - 50, pw, 12, '#ffe8a1', '#e9c46a', 6)
      PF.soft(ctx, ball.x, ball.y, ball.r + 3, 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.15)')
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
