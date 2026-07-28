/**
 * Generates all Gamescroll HTML games with shared bridge, and emits
 * `src/generated/officialCatalog.ts` (id/title/tip/accent) for the host feed.
 * Fail mode is host-controlled via gamescroll:start { onFail: 'replay'|'gameover' }.
 * Run: node scripts/generate-games.mjs
 * Check: node scripts/generate-games.mjs --check
 */
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/games')

const BRIDGE = `
    const GS = {
      paused: true,
      reported: false,
      onFail: 'replay',
      post(type, extra) {
        try { parent.postMessage(Object.assign({ type }, extra || {}), '*') } catch (e) {}
      },
      begin(msg) {
        const fail = msg && msg.onFail
        if (fail === 'gameover' || fail === 'replay') GS.onFail = fail
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
      if (t === 'gamescroll:start') GS.begin(e.data)
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
    if (typeof layout === 'function') {
      try { layout() } catch (e) { console.error('[gamescroll] layout()', e) }
    }
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
        if (GS.paused) return
        reportScore()
        if (window.Juice) {
          const pos = typeof diePos === 'function' ? diePos() : null
          if (pos) Juice.onDie(pos[0], pos[1])
          else Juice.onDie()
        }
        if (GS.onFail === 'gameover') {
          GS.post('gamescroll:died', { score })
          GS.halt()
          return
        }
        __die()
      }
    }
    function loop(now) {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      try {
        if (window.PF) PF.t += dt
        if (!GS.paused && typeof tick === 'function') tick(dt)
        if (typeof draw === 'function') draw(now)
        if (window.Juice) Juice.update()
      } catch (err) {
        console.error('[gamescroll]', err)
      }
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
    tip: 'Drag to keep the ball bouncing',
    bg: '#1b4332',
    body: `
    let px, pw, ball, vx, vy
    let padSquash = 1, ballSquish = 1
    const padY = () => H - 110
    function diePos() { return [px, padY() + 7] }
    function scorePos() { return ball ? [ball.x, ball.y] : [px, padY() + 7] }
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
      const py = padY()
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
      const py = padY()
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
    tip: 'Tap to stay airborne',
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
    tip: 'Tap to switch lanes',
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
    tip: 'Tap to drop the moving block',
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
      dir = Math.random() < 0.5 ? 1 : -1
      const w = prev.w
      cur = {
        x: dir > 0 ? w * 0.5 : W - w * 0.5,
        w,
        y: Math.max(80, prev.y - 34),
        moving: true,
      }
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
      const minX = cur.w * 0.5, maxX = W - cur.w * 0.5
      if (cur.x < minX) { cur.x = minX; dir = 1 }
      else if (cur.x > maxX) { cur.x = maxX; dir = -1 }
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

  ski: {
    title: 'Endless Ski',
    tip: 'Slide to dodge trees',
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
    tip: 'Tap to flip floor and ceiling',
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
    tip: 'Pop bubbles, avoid hearts',
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
    function drawHeart(x, y, r) {
      ctx.save()
      ctx.translate(x, y)
      const s = r / 16
      ctx.scale(s, s)
      ctx.beginPath()
      ctx.moveTo(0, 6)
      ctx.bezierCurveTo(0, 0, -12, -2, -12, -8)
      ctx.bezierCurveTo(-12, -14, -4, -16, 0, -10)
      ctx.bezierCurveTo(4, -16, 12, -14, 12, -8)
      ctx.bezierCurveTo(12, -2, 0, 0, 0, 6)
      ctx.closePath()
      ctx.fillStyle = '#ff6b8a'
      ctx.shadowColor = 'rgba(255,107,138,0.55)'
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.restore()
    }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        bubbles.push({
          x: 40 + Math.random() * (W - 80),
          y: H + 20,
          r: 18 + Math.random() * 16,
          v: 70 + Math.random() * 50,
          hue: Math.random(),
          heart: Math.random() < 0.22,
        })
        spawn = 0.45 + Math.random() * 0.35
      }
      for (const b of bubbles) b.y -= b.v * dt
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]
        if (b.y + b.r < 0) {
          if (b.heart) { bubbles.splice(i, 1); continue }
          lastPop = [b.x, 0]; die(); return
        }
      }
    }
    function draw() {
      PF.sky(ctx, W, H, '#023e8a', '#0077b6', '#90e0ef')
      PF.dots(ctx, W, H, '#caf0f8', 18, 1)
      PF.blobs(ctx, W, H, '#48cae4', 5)
      for (const b of bubbles) {
        if (b.heart) drawHeart(b.x, b.y, b.r)
        else {
          const c = BCOLORS[Math.floor(b.hue * BCOLORS.length) % BCOLORS.length]
          PF.buddy(ctx, b.x, b.y, b.r, c[0], c[1], { lookY: -0.4, blush: true })
        }
      }
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]
        if (Math.hypot(e.clientX - b.x, e.clientY - b.y) < b.r + 8) {
          lastPop = [b.x, b.y]
          bubbles.splice(i, 1)
          if (b.heart) {
            setScore(Math.floor(score / 2))
            if (window.Juice) Juice.onDie(b.x, b.y)
          } else bump()
          return
        }
      }
    })
    reset()
`,
  },

  road: {
    title: 'Stay on the Road',
    tip: 'Drag to stay on the winding road',
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
    tip: 'Tap the balloon to keep it up',
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
    tip: 'Tap to match the next gate',
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
    tip: 'Tilt sideways between platforms',
    bg: '#2a9d8f',
    body: `
    let x, y, v, plats = [], cam = 0
    const JUMP = -540
    const GAP_MIN = 55
    const GAP_MAX = 95
    function spawnPlat(py) {
      const maxX = Math.max(40, W - 110)
      return { x: 30 + Math.random() * maxX, y: py, w: 55 + Math.random() * 35 }
    }
    function ensurePlats() {
      // Drop platforms that fell below the viewport (behind the player).
      plats = plats.filter(p => p.y < cam + H + 60)
      // Keep a full screen of platforms ready above the camera.
      let top = plats.length ? Math.min(...plats.map(p => p.y)) : y
      while (top > cam - H) {
        top -= GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)
        plats.push(spawnPlat(top))
      }
    }
    function reset() {
      x = W * 0.5; y = H * 0.7; v = JUMP; cam = 0; plats = []
      for (let i = 0; i < 12; i++) plats.push(spawnPlat(H - i * 70))
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      v += 900 * dt
      const prevY = y
      y += v * dt
      if (y - cam > H - 40) die()
      if (y < cam + H * 0.35) cam = y - H * 0.35
      for (const p of plats) {
        if (v > 0 && prevY < p.y && y >= p.y && x > p.x && x < p.x + p.w) {
          y = p.y
          v = JUMP
          bump()
        }
      }
      ensurePlats()
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
    tip: 'Drag through the moving tunnel',
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

  pulse: {
    title: 'Perfect Pulse',
    tip: 'Tap when the rings overlap',
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
    tip: 'Swipe to turn toward dots',
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
    tip: 'Tap to hop across lanes',
    bg: '#6c584c',
    body: `
    let row = 0, lanes = [], player = { c: 2, r: 0 }, cols = 5
    function spawnDelay() {
      const t = Math.min(1, score / 40)
      const lo = 16 - t * 14.4
      const hi = 32 - t * 28.8
      return lo + Math.random() * (hi - lo)
    }
    function reset() {
      setScore(0)
      lanes = []; player = { c: 2, r: 0 }
      for (let i = 0; i < 12; i++) {
        const kind = i === 0 ? 'safe' : (['road', 'river', 'rail'][i % 3])
        lanes.push({ kind, cars: [], t: spawnDelay() })
      }
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
          L.t = spawnDelay()
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
        lanes.push({ kind: ['road', 'river', 'rail'][Math.floor(Math.random() * 3)], cars: [], t: spawnDelay() })
        lanes.shift(); player.r--
      }
    })
    reset()
`,
  },

  catch: {
    title: 'Catch or Dodge',
    tip: 'Catch friends, dodge threats',
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
    tip: 'Steer along the narrow ridge',
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
    tip: 'Tap to bounce between walls',
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
    tip: 'Hold to swim up through coral, release to dive',
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
    tip: 'Tap to reverse the spin',
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
    tip: 'Tilt to keep the ball on',
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
    tip: 'Tap to match the next hole',
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
    tip: 'Drag sideways under the rain',
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
    tip: 'Tap to reverse polarity',
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

  breakout: {
    title: 'Mini Breakout',
    tip: 'Bounce through endless bricks',
    bg: '#e9c46a',
    body: `
    let px, pw, ball, bricks = []
    const padY = () => H - 110
    function buildBricks() {
      bricks = []
      for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) {
        bricks.push({ x: 20 + c * ((W - 40) / 8), y: 80 + r * 28, w: (W - 40) / 8 - 6, h: 18, alive: true })
      }
    }
    function diePos() { return [px, padY() + 6] }
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
      const py = padY()
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
      PF.block(ctx, px - pw * 0.5, padY(), pw, 12, '#ffe8a1', '#e9c46a', 6)
      PF.soft(ctx, ball.x, ball.y, ball.r + 3, 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.15)')
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill()
    }
    addEventListener('pointermove', e => { if (!GS.paused) px = Math.max(pw * 0.5, Math.min(W - pw * 0.5, e.clientX)) })
    addEventListener('pointerdown', e => { if (!GS.paused) px = Math.max(pw * 0.5, Math.min(W - pw * 0.5, e.clientX)) })
    reset()
`,
  },

  slicer: {
    title: 'Shape Slicer',
    tip: 'Draw a line to split the shape 50/50',
    bg: '#7b2cbf',
    accent: '#ff6d00',
    body: `
    const PALETTES = [
      { a: '#4cc9f0', b: '#4361ee', card: '#fff6e8', ink: '#1d3557' },
      { a: '#ff6d00', b: '#ff006e', card: '#fff0f3', ink: '#3c096c' },
      { a: '#80ed99', b: '#06d6a0', card: '#f0fff4', ink: '#1b4332' },
      { a: '#ffd166', b: '#f77f00', card: '#fff9e6', ink: '#7f5539' },
      { a: '#c77dff', b: '#7b2cbf', card: '#f8f0ff', ink: '#240046' },
      { a: '#48cae4', b: '#0077b6', card: '#e8f7ff', ink: '#023e8a' },
    ]
    let poly = [], palette = PALETTES[0], phase = 'aim'
    let drag = null, cut = null, pieceA = null, pieceB = null
    let pctA = 50, pctB = 50, lastPts = 0, missFlash = 0
    let btn = { x: 0, y: 0, w: 0, h: 0 }

    function side(a, b, p) {
      return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
    }
    function segHit(a, b, p, q) {
      const d1 = side(a, b, p), d2 = side(a, b, q)
      if (d1 === 0 && d2 === 0) return null
      if (d1 * d2 > 0) return null
      const t = d1 / (d1 - d2)
      return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }
    }
    function clipPoly(src, a, b, keepPos) {
      const out = []
      for (let i = 0; i < src.length; i++) {
        const cur = src[i], prev = src[(i + src.length - 1) % src.length]
        const curIn = keepPos ? side(a, b, cur) >= -1e-6 : side(a, b, cur) <= 1e-6
        const prevIn = keepPos ? side(a, b, prev) >= -1e-6 : side(a, b, prev) <= 1e-6
        if (curIn !== prevIn) {
          const hit = segHit(a, b, prev, cur)
          if (hit) out.push(hit)
        }
        if (curIn) out.push(cur)
      }
      return out
    }
    function polyArea(pts) {
      if (!pts || pts.length < 3) return 0
      let s = 0
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length]
        s += p.x * q.y - q.x * p.y
      }
      return Math.abs(s) * 0.5
    }
    function centroid(pts) {
      let x = 0, y = 0
      for (const p of pts) { x += p.x; y += p.y }
      return { x: x / pts.length, y: y / pts.length }
    }
    function fillPoly(pts, color) {
      if (!pts || pts.length < 3) return
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    }
    function strokePoly(pts, color, width) {
      if (!pts || pts.length < 3) return
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.stroke()
    }
    function roundRectPath(x, y, w, h, r) {
      const rr = Math.min(r, w * 0.5, h * 0.5)
      ctx.beginPath()
      ctx.moveTo(x + rr, y)
      ctx.arcTo(x + w, y, x + w, y + h, rr)
      ctx.arcTo(x + w, y + h, x, y + h, rr)
      ctx.arcTo(x, y + h, x, y, rr)
      ctx.arcTo(x, y, x + w, y, rr)
      ctx.closePath()
    }
    function makeShape() {
      const n = 3 + Math.floor(Math.random() * 5)
      const cx = W * 0.5, cy = H * 0.42
      const base = Math.min(W, H) * (0.2 + Math.random() * 0.07)
      const rot = Math.random() * Math.PI * 2
      const pts = []
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2
        const rr = base * (0.72 + Math.random() * 0.38)
        pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.92 })
      }
      return pts
    }
    function nextRound(keepScore) {
      palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]
      poly = makeShape()
      phase = 'aim'
      drag = null
      cut = null
      pieceA = pieceB = null
      pctA = pctB = 50
      lastPts = 0
      if (!keepScore) setScore(0)
    }
    function diePos() { return [W * 0.5, H * 0.42] }
    function scorePos() { return [W * 0.5, H * 0.42] }
    function reset() { nextRound(false) }
    function onHostStart() { reset() }
    function die() { reset() }
    function onResize() {
      if (phase === 'aim' || phase === 'drawing') poly = makeShape()
    }
    function evaluateCut(a, b) {
      const len = Math.hypot(b.x - a.x, b.y - a.y)
      if (len < 28) { missFlash = 0.45; return }
      const A = clipPoly(poly, a, b, true)
      const B = clipPoly(poly, a, b, false)
      const areaA = polyArea(A), areaB = polyArea(B), total = areaA + areaB
      if (A.length < 3 || B.length < 3 || total < 40) { missFlash = 0.55; return }
      pieceA = A; pieceB = B
      pctA = Math.round((areaA / total) * 100)
      pctB = 100 - pctA
      const err = Math.abs(50 - pctA)
      lastPts = Math.max(0, Math.round(120 - err * 4))
      cut = { a, b }
      phase = 'result'
      if (lastPts > 0) bump(lastPts)
      else if (window.Juice) Juice.onDie(W * 0.5, H * 0.42)
    }
    function hitNewShape(x, y) {
      return phase === 'result' && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h
    }
    function tick(dt) {
      if (missFlash > 0) missFlash = Math.max(0, missFlash - dt)
    }
    function draw() {
      PF.sky(ctx, W, H, '#240046', '#7b2cbf', '#ff006e')
      PF.blobs(ctx, W, H, '#ffd166', 7)
      PF.dots(ctx, W, H, '#ffffff', 18, 0.35)

      const cardX = W * 0.06, cardW = W * 0.88
      const cardY = H * 0.14, cardH = H * 0.52
      roundRectPath(cardX, cardY, cardW, cardH, 28)
      ctx.fillStyle = palette.card
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      roundRectPath(cardX + 3, cardY + 3, cardW - 6, 18, 12)
      ctx.fill()

      // Target chip
      const chipY = H * 0.045
      roundRectPath(W * 0.08, chipY, W * 0.84, 52, 16)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fill()
      ctx.fillStyle = '#4361ee'
      roundRectPath(W * 0.1, chipY + 10, 32, 32, 10)
      ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(W * 0.1 + 16, chipY + 26, 8, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.arc(W * 0.1 + 16, chipY + 26, 3, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill()
      ctx.fillStyle = '#6c757d'
      ctx.font = '700 10px "Segoe UI", sans-serif'
      ctx.fillText('TARGET RATIO', W * 0.1 + 44, chipY + 20)
      ctx.fillStyle = palette.ink
      ctx.font = '800 16px "Segoe UI", sans-serif'
      ctx.fillText('50 : 50 Split', W * 0.1 + 44, chipY + 40)

      if (phase === 'result' && pieceA && pieceB) {
        fillPoly(pieceA, palette.a)
        fillPoly(pieceB, palette.b)
        strokePoly(pieceA, 'rgba(255,255,255,0.85)', 3)
        strokePoly(pieceB, 'rgba(255,255,255,0.85)', 3)
        if (cut) {
          ctx.strokeStyle = '#1a1612'
          ctx.lineWidth = 3
          ctx.setLineDash([8, 6])
          ctx.beginPath(); ctx.moveTo(cut.a.x, cut.a.y); ctx.lineTo(cut.b.x, cut.b.y); ctx.stroke()
          ctx.setLineDash([])
        }
        const ca = centroid(pieceA), cb = centroid(pieceB)
        ctx.font = '800 22px "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 4
        ctx.strokeText(pctA + '%', ca.x, ca.y + 8)
        ctx.fillText(pctA + '%', ca.x, ca.y + 8)
        ctx.strokeText(pctB + '%', cb.x, cb.y + 8)
        ctx.fillText(pctB + '%', cb.x, cb.y + 8)
        ctx.textAlign = 'left'
      } else {
        fillPoly(poly, palette.a)
        strokePoly(poly, 'rgba(255,255,255,0.9)', 4)
        if (drag) {
          ctx.strokeStyle = missFlash > 0 ? '#ff006e' : '#1a1612'
          ctx.lineWidth = 4
          ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(drag.a.x, drag.a.y); ctx.lineTo(drag.b.x, drag.b.y); ctx.stroke()
          ctx.fillStyle = '#ff006e'
          ctx.beginPath(); ctx.arc(drag.a.x, drag.a.y, 6, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.arc(drag.b.x, drag.b.y, 6, 0, Math.PI * 2); ctx.fill()
        }
      }

      // Bottom panel
      const panelY = H * 0.72, panelH = H * 0.22
      roundRectPath(W * 0.06, panelY, W * 0.88, panelH, 24)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fill()
      ctx.fillStyle = '#ff006e'
      ctx.beginPath(); ctx.arc(W * 0.5, panelY + 28, 18, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(W * 0.5 - 6, panelY + 24); ctx.lineTo(W * 0.5 + 2, panelY + 28); ctx.lineTo(W * 0.5 - 6, panelY + 32)
      ctx.moveTo(W * 0.5 - 2, panelY + 22); ctx.lineTo(W * 0.5 + 7, panelY + 28); ctx.lineTo(W * 0.5 - 2, panelY + 34)
      ctx.stroke()

      ctx.textAlign = 'center'
      if (phase === 'result') {
        ctx.fillStyle = palette.ink
        ctx.font = '800 18px "Segoe UI", sans-serif'
        ctx.fillText(pctA + '%  ·  ' + pctB + '%', W * 0.5, panelY + 62)
        ctx.fillStyle = lastPts > 0 ? '#06d6a0' : '#e63946'
        ctx.font = '700 13px "Segoe UI", sans-serif'
        ctx.fillText(lastPts > 0 ? ('+' + lastPts + ' points') : 'Too uneven — try again', W * 0.5, panelY + 82)
        btn.w = Math.min(220, W * 0.55); btn.h = 44
        btn.x = (W - btn.w) * 0.5; btn.y = panelY + panelH - 58
        roundRectPath(btn.x, btn.y, btn.w, btn.h, 14)
        ctx.fillStyle = '#ff6d00'
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = '800 15px "Segoe UI", sans-serif'
        ctx.fillText('New shape', W * 0.5, btn.y + 28)
      } else {
        ctx.fillStyle = palette.ink
        ctx.font = '800 17px "Segoe UI", sans-serif'
        ctx.fillText('Draw a line to slice', W * 0.5, panelY + 64)
        ctx.fillStyle = '#6c757d'
        ctx.font = '600 12px "Segoe UI", sans-serif'
        ctx.fillText('Cut as close to 50 / 50 as you can', W * 0.5, panelY + 86)
      }
      ctx.textAlign = 'left'
      if (missFlash > 0) {
        ctx.fillStyle = 'rgba(255,0,110,' + (missFlash * 0.25) + ')'
        ctx.fillRect(0, 0, W, H)
      }
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      if (hitNewShape(e.clientX, e.clientY)) {
        nextRound(true)
        return
      }
      if (phase === 'result') return
      drag = { a: { x: e.clientX, y: e.clientY }, b: { x: e.clientX, y: e.clientY } }
      phase = 'drawing'
    })
    addEventListener('pointermove', e => {
      if (GS.paused || !drag || phase !== 'drawing') return
      drag.b = { x: e.clientX, y: e.clientY }
    })
    addEventListener('pointerup', e => {
      if (GS.paused || !drag || phase !== 'drawing') return
      drag.b = { x: e.clientX, y: e.clientY }
      const a = drag.a, b = drag.b
      drag = null
      evaluateCut(a, b)
      if (phase !== 'result') phase = 'aim'
    })
    addEventListener('pointercancel', () => {
      if (phase === 'drawing') { drag = null; phase = 'aim' }
    })
    reset()
`,
  },

  // Mechanics adapted from insertcoin Drop Stack (MIT) — see THIRD_PARTY_NOTICES.
  orbmerge: {
    title: 'Orb Merge',
    tip: 'Drag to aim, release to drop. Merge matches.',
    bg: '#0a1026',
    accent: '#ffcc33',
    body: `
    const TIERS = [
      { r: 13, color: '#ff5177', shade: '#a8123b', accent: '#ffccdc', score: 1 },
      { r: 17, color: '#ff8aa1', shade: '#b04560', accent: '#ffd5df', score: 3 },
      { r: 22, color: '#a266ff', shade: '#5a20b8', accent: '#e0c8ff', score: 6 },
      { r: 28, color: '#6ddc5a', shade: '#2a7a1a', accent: '#d7ffce', score: 10 },
      { r: 35, color: '#ff9f3a', shade: '#b35c00', accent: '#ffdaa8', score: 15 },
      { r: 44, color: '#ff4444', shade: '#8b1010', accent: '#ffc4c4', score: 21 },
      { r: 54, color: '#e7e23a', shade: '#a89918', accent: '#fff7a6', score: 28 },
      { r: 66, color: '#ffb59a', shade: '#c96a43', accent: '#fff0e6', score: 36 },
      { r: 80, color: '#ffe066', shade: '#a07c00', accent: '#fff7bf', score: 45 },
      { r: 96, color: '#7ed957', shade: '#2f6a1d', accent: '#d5ffbe', score: 55 },
      { r: 116, color: '#3cb371', shade: '#18522e', accent: '#bfe8cc', score: 120 },
    ]
    const MAX_TIER = TIERS.length - 1
    const DANGER_MS = 2500
    const DROP_COOLDOWN = 0.42
    let S = 1, jarL = 0, jarR = 0, jarBottom = 0, dangerY = 0, dropY = 0
    let orbs = [], nextId = 1, holdTier = 0, queue = [], holdX = 0
    let canDrop = true, dropCd = 0, dangerSince = 0, lastMergeAt = 0, combo = 0
    let particles = [], popups = [], flash = 0

    function layout() {
      S = Math.min(W, H) / 640
      jarL = W * 0.08
      jarR = W * 0.92
      jarBottom = H * 0.92
      dangerY = H * 0.17
      dropY = H * 0.11
      holdX = W * 0.5
    }
    function onResize() { layout() }
    function tierR(t) { return TIERS[t].r * S }
    function randDropTier() {
      const r = Math.random()
      if (r < 0.42) return 0
      if (r < 0.72) return 1
      if (r < 0.90) return 2
      if (r < 0.98) return 3
      return 4
    }
    function refillQueue() {
      queue = []
      for (let i = 0; i < 2; i++) queue.push(randDropTier())
      holdTier = queue.shift()
      queue.push(randDropTier())
    }
    function diePos() {
      if (orbs.length) {
        let worst = orbs[0]
        for (const o of orbs) if (o.y - tierR(o.tier) < worst.y - tierR(worst.tier)) worst = o
        return [worst.x, worst.y]
      }
      return [W * 0.5, dangerY]
    }
    function scorePos() { return diePos() }
    function reset() {
      layout()
      orbs = []
      nextId = 1
      canDrop = true
      dropCd = 0
      dangerSince = 0
      lastMergeAt = 0
      combo = 0
      particles = []
      popups = []
      flash = 0
      refillQueue()
      holdX = W * 0.5
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function clampHoldX() {
      const r = tierR(holdTier)
      holdX = Math.max(jarL + r + 2, Math.min(jarR - r - 2, holdX))
    }
    function addOrb(x, y, tier, vx, vy) {
      orbs.push({
        id: nextId++, x, y,
        vx: vx || 0, vy: vy || 0,
        tier, merging: false, born: performance.now(),
      })
    }
    function burst(x, y, tier) {
      const t = TIERS[tier]
      const n = 6 + tier
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = (60 + tier * 10) * S * (0.5 + Math.random())
        particles.push({
          x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20 * S,
          life: 0, max: 0.35 + Math.random() * 0.35,
          color: i % 2 ? t.accent : t.color,
          size: (2 + Math.random() * 3) * S,
        })
      }
      if (window.Juice) Juice.burst(x, y)
    }
    function popup(x, y, text) {
      popups.push({ x, y, text, life: 0, max: 0.85 })
    }
    function mergePair(a, b) {
      if (a.merging || b.merging || a.tier !== b.tier) return
      a.merging = b.merging = true
      const tier = a.tier
      const now = performance.now()
      if (now - lastMergeAt < 700) combo++
      else combo = 1
      lastMergeAt = now
      const mult = combo >= 5 ? 3 : combo >= 3 ? 2 : combo >= 2 ? 1.5 : 1
      const pts = Math.round(TIERS[tier].score * mult)
      const mx = (a.x + b.x) * 0.5, my = (a.y + b.y) * 0.5
      const vx = (a.vx + b.vx) * 0.25, vy = (a.vy + b.vy) * 0.25
      burst(mx, my, tier)
      popup(mx, my, mult > 1 ? ('+' + pts + ' x' + mult) : ('+' + pts))
      bump(pts)
      orbs = orbs.filter(o => o.id !== a.id && o.id !== b.id)
      if (tier < MAX_TIER) addOrb(mx, my, tier + 1, vx, vy)
      else {
        bump(500)
        flash = 1
        if (window.Juice) Juice.shake(1.2)
        burst(mx, my, MAX_TIER)
        popup(mx, my - 20 * S, 'MAX!')
      }
    }
    function resolvePhysics(dt) {
      const g = 1400 * S
      const sub = Math.max(1, Math.min(4, Math.ceil(dt / 0.012)))
      const h = dt / sub
      for (let s = 0; s < sub; s++) {
        for (const o of orbs) {
          if (o.merging) continue
          o.vy += g * h
          o.vx *= Math.pow(0.992, h * 60)
          o.x += o.vx * h
          o.y += o.vy * h
          const r = tierR(o.tier)
          if (o.x - r < jarL) { o.x = jarL + r; o.vx = Math.abs(o.vx) * 0.25 }
          if (o.x + r > jarR) { o.x = jarR - r; o.vx = -Math.abs(o.vx) * 0.25 }
          if (o.y + r > jarBottom) {
            o.y = jarBottom - r
            o.vy = -Math.abs(o.vy) * 0.18
            o.vx *= 0.85
            if (Math.abs(o.vy) < 40 * S) o.vy = 0
          }
        }
        for (let i = 0; i < orbs.length; i++) {
          for (let j = i + 1; j < orbs.length; j++) {
            const a = orbs[i], b = orbs[j]
            if (a.merging || b.merging) continue
            const ra = tierR(a.tier), rb = tierR(b.tier)
            let dx = b.x - a.x, dy = b.y - a.y
            let dist = Math.hypot(dx, dy) || 0.0001
            const min = ra + rb
            if (dist >= min) continue
            if (a.tier === b.tier && dist < min * 0.98 && performance.now() - a.born > 120 && performance.now() - b.born > 120) {
              mergePair(a, b)
              continue
            }
            const overlap = min - dist
            const nx = dx / dist, ny = dy / dist
            const ma = ra * ra, mb = rb * rb, inv = 1 / (ma + mb)
            a.x -= nx * overlap * mb * inv
            a.y -= ny * overlap * mb * inv
            b.x += nx * overlap * ma * inv
            b.y += ny * overlap * ma * inv
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy
            const vn = rvx * nx + rvy * ny
            if (vn < 0) {
              const e = 0.22
              const jn = -(1 + e) * vn / (1 / ma + 1 / mb)
              a.vx -= (jn / ma) * nx; a.vy -= (jn / ma) * ny
              b.vx += (jn / mb) * nx; b.vy += (jn / mb) * ny
            }
          }
        }
      }
    }
    function checkDanger(dt) {
      let over = false
      for (const o of orbs) {
        if (o.merging) continue
        if (performance.now() - o.born < 600) continue
        if (o.y - tierR(o.tier) < dangerY && Math.abs(o.vy) < 50 * S) { over = true; break }
      }
      if (over) {
        dangerSince += dt
        if (dangerSince >= DANGER_MS / 1000) die()
      } else dangerSince = 0
    }
    function tick(dt) {
      const t = Math.min(0.033, dt)
      if (dropCd > 0) {
        dropCd -= t
        if (dropCd <= 0) canDrop = true
      }
      resolvePhysics(t)
      checkDanger(t)
      for (const p of particles) {
        p.life += t; p.x += p.vx * t; p.y += p.vy * t; p.vy += 400 * S * t
      }
      particles = particles.filter(p => p.life < p.max)
      for (const p of popups) p.life += t
      popups = popups.filter(p => p.life < p.max)
      if (flash > 0) flash = Math.max(0, flash - t * 1.8)
    }
    function drawOrb(x, y, tier, ang) {
      const t = TIERS[tier], r = tierR(tier)
      ctx.save()
      ctx.translate(x, y)
      if (ang) ctx.rotate(ang)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.88, r * 0.82, r * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r)
      g.addColorStop(0, t.accent)
      g.addColorStop(0.45, t.color)
      g.addColorStop(1, t.shade)
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath(); ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.28, r * 0.18, -0.4, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
    function draw() {
      PF.sky(ctx, W, H, '#060918', '#0a1026', '#1a2744')
      PF.dots(ctx, W, H, '#7ec8ff', 18, 0.35)
      // jar
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 4 * S
      ctx.beginPath()
      ctx.moveTo(jarL, dangerY)
      ctx.lineTo(jarL, jarBottom)
      ctx.lineTo(jarR, jarBottom)
      ctx.lineTo(jarR, dangerY)
      ctx.stroke()
      // danger line
      const dangerPulse = dangerSince > 0 ? 0.45 + 0.35 * Math.sin(performance.now() / 120) : 0.28
      ctx.strokeStyle = 'rgba(255,80,80,' + dangerPulse + ')'
      ctx.setLineDash([8 * S, 6 * S])
      ctx.beginPath(); ctx.moveTo(jarL, dangerY); ctx.lineTo(jarR, dangerY); ctx.stroke()
      ctx.setLineDash([])
      // next preview
      const nr = tierR(queue[0]) * 0.55
      drawOrb(jarR - 18 * S - nr, dangerY * 0.45, queue[0], 0)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = '700 ' + Math.round(11 * S) + 'px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('NEXT', jarR - 18 * S - nr, dangerY * 0.45 - nr - 8 * S)
      ctx.textAlign = 'left'
      for (const o of orbs) drawOrb(o.x, o.y, o.tier, o.vx * 0.01)
      if (!GS.paused && canDrop) {
        clampHoldX()
        ctx.globalAlpha = 0.9
        drawOrb(holdX, dropY, holdTier, 0)
        ctx.globalAlpha = 0.25
        ctx.strokeStyle = '#fff'
        ctx.setLineDash([4 * S, 4 * S])
        ctx.beginPath(); ctx.moveTo(holdX, dropY + tierR(holdTier)); ctx.lineTo(holdX, jarBottom); ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      }
      for (const p of particles) {
        const a = 1 - p.life / p.max
        ctx.globalAlpha = a
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      for (const p of popups) {
        const u = p.life / p.max
        ctx.globalAlpha = 1 - u
        ctx.fillStyle = '#ffee55'
        ctx.font = '800 ' + Math.round(16 * S) + 'px "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(p.text, p.x, p.y - u * 36 * S)
      }
      ctx.textAlign = 'left'
      ctx.globalAlpha = 1
      if (flash > 0) {
        ctx.fillStyle = 'rgba(120,255,180,' + (flash * 0.35) + ')'
        ctx.fillRect(0, 0, W, H)
      }
    }
    function aimAt(x) {
      holdX = x
      clampHoldX()
    }
    function tryDrop() {
      if (GS.paused || !canDrop) return
      clampHoldX()
      addOrb(holdX, dropY + tierR(holdTier), holdTier, 0, 40 * S)
      holdTier = queue.shift()
      queue.push(randDropTier())
      canDrop = false
      dropCd = DROP_COOLDOWN
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      aimAt(e.clientX)
    })
    addEventListener('pointermove', e => {
      if (GS.paused) return
      aimAt(e.clientX)
    })
    addEventListener('pointerup', e => {
      if (GS.paused) return
      aimAt(e.clientX)
      tryDrop()
    })
    reset()
`,
  },
})

const obsolete = ['aim.html', 'dodge.html', 'flap.html', 'react.html', 'orbit.html', 'light.html', 'helix.html', 'shield.html']

const CATALOG_OUT = join(__dirname, '../src/generated/officialCatalog.ts')
const checkOnly = process.argv.includes('--check')

function buildOfficialCatalog() {
  return Object.entries(games).map(([id, g]) => {
    if (!g.title || !g.tip || !g.bg) {
      throw new Error(`catalog entry "${id}" needs title, tip, and bg`)
    }
    return {
      id,
      title: g.title,
      tip: g.tip,
      accent: g.accent || g.bg,
    }
  })
}

function renderOfficialCatalogTs(entries) {
  const body = entries
    .map(
      (e) =>
        `  {\n    id: ${JSON.stringify(e.id)},\n    title: ${JSON.stringify(e.title)},\n    tip: ${JSON.stringify(e.tip)},\n    accent: ${JSON.stringify(e.accent)},\n  }`,
    )
    .join(',\n')
  return `/** Generated by \`node scripts/generate-games.mjs\` — do not edit by hand. */\n\nexport type OfficialCatalogEntry = {\n  id: string\n  title: string\n  tip: string\n  accent: string\n}\n\nexport const officialCatalog: OfficialCatalogEntry[] = [\n${body},\n]\n`
}

const catalogTs = renderOfficialCatalogTs(buildOfficialCatalog())

if (checkOnly) {
  if (!existsSync(CATALOG_OUT)) {
    console.error('[generate-games] missing', CATALOG_OUT)
    process.exit(1)
  }
  const current = readFileSync(CATALOG_OUT, 'utf8')
  if (current !== catalogTs) {
    console.error(
      '[generate-games] src/generated/officialCatalog.ts is out of date — run: node scripts/generate-games.mjs',
    )
    process.exit(1)
  }
  console.log('[generate-games] officialCatalog.ts ok')
  process.exit(0)
}

for (const f of obsolete) {
  const p = join(OUT, f)
  if (existsSync(p)) unlinkSync(p)
}

for (const [id, g] of Object.entries(games)) {
  writeFileSync(join(OUT, `${id}.html`), wrap(g.title, g.bg, g.body, g.accent || g.bg))
  console.log('wrote', id)
}

mkdirSync(dirname(CATALOG_OUT), { recursive: true })
writeFileSync(CATALOG_OUT, catalogTs)
console.log('wrote', CATALOG_OUT)
console.log('Done:', Object.keys(games).length, 'games')
