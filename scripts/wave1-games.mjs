/**
 * Mechanics adapted from apratico/insertcoin (MIT) — see THIRD_PARTY_NOTICES.
 * Wave 1 official GameScroll bodies (portrait feed arcade).
 */
export const wave1Games = {
  taprotate: {
    title: 'Tap Rotate',
    tip: 'Tap to shoot. Hold to spin.',
    bg: '#0b0b1f',
    accent: '#ff3d68',
    body: `
    let aim = -Math.PI * 0.5, holding = false, bullets = [], enemies = [], spawn = 0.6
    let px = 0, py = 0, flash = 0, shake = 0
    function layout() {
      px = W * 0.5
      py = H * 0.86
    }
    function onResize() { layout() }
    function diePos() { return [px, py] }
    function scorePos() { return bullets[0] ? [bullets[0].x, bullets[0].y] : [px, py] }
    function reset() {
      layout()
      aim = -Math.PI * 0.5
      holding = false
      bullets = []
      enemies = []
      spawn = 0.5
      flash = 0
      shake = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function fire() {
      const sp = Math.min(W, H) * 1.15
      bullets.push({
        x: px, y: py - 18,
        vx: Math.cos(aim) * sp,
        vy: Math.sin(aim) * sp,
        r: 5,
      })
    }
    function tick(dt) {
      if (holding) aim += dt * 3.4
      flash = Math.max(0, flash - dt)
      shake = Math.max(0, shake - dt)
      for (const b of bullets) {
        b.x += b.vx * dt
        b.y += b.vy * dt
      }
      bullets = bullets.filter(b => b.y > -20 && b.x > -20 && b.x < W + 20)
      spawn -= dt
      if (spawn <= 0) {
        enemies.push({
          x: 24 + Math.random() * (W - 48),
          y: -20,
          r: 14 + Math.random() * 8,
          vy: 70 + Math.random() * 55 + score * 1.2,
          hue: Math.random(),
        })
        spawn = Math.max(0.28, 0.85 - score * 0.012)
      }
      for (const e of enemies) e.y += e.vy * dt
      for (const e of enemies) {
        for (const b of bullets) {
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
            e.dead = true
            b.dead = true
            bump()
            flash = 0.12
            if (window.Juice) Juice.burst(e.x, e.y)
          }
        }
      }
      bullets = bullets.filter(b => !b.dead)
      enemies = enemies.filter(e => {
        if (e.dead) return false
        if (e.y - e.r > H - 8) { die(); return false }
        return true
      })
    }
    function draw() {
      const ox = (Math.random() - 0.5) * shake * 10
      const oy = (Math.random() - 0.5) * shake * 10
      ctx.save()
      ctx.translate(ox, oy)
      PF.sky(ctx, W, H, '#050510', '#0b0b1f', '#1a1040')
      PF.dots(ctx, W, H, '#ff3d68', 18, 0.7)
      PF.blobs(ctx, W, H, '#2a1850', 3)
      for (const e of enemies) {
        PF.buddy(ctx, e.x, e.y, e.r, '#ff6b8a', '#ff3d68', {
          lookY: 0.5, blush: true,
        })
      }
      for (const b of bullets) {
        ctx.fillStyle = '#ffe08a'
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      }
      const len = 42
      ctx.strokeStyle = '#ff3d68'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + Math.cos(aim) * len, py + Math.sin(aim) * len)
      ctx.stroke()
      PF.block(ctx, px - 22, py - 10, 44, 22, '#e8e8ff', '#7a7ab8', 10)
      if (flash > 0) {
        ctx.fillStyle = 'rgba(255,61,104,' + (flash * 0.35) + ')'
        ctx.fillRect(0, 0, W, H)
      }
      ctx.restore()
    }
    addEventListener('pointerdown', () => {
      if (GS.paused) return
      holding = true
    })
    addEventListener('pointerup', () => {
      if (GS.paused) return
      if (holding) fire()
      holding = false
    })
    addEventListener('pointercancel', () => { holding = false })
    reset()
`,
  },

  hueblaster: {
    title: 'Hue Blaster',
    tip: 'Shoot matching colors only.',
    bg: '#0a0a2a',
    accent: '#22ffaa',
    body: `
    const COLS = ['#22ffaa', '#ff3d68', '#66a3ff']
    let hue = 0, bullets = [], enemies = [], spawn = 0.55, px = 0, py = 0, cd = 0
    function layout() { px = W * 0.5; py = H * 0.88 }
    function onResize() { layout() }
    function diePos() { return [px, py] }
    function scorePos() { return [px, py - 40] }
    function reset() {
      layout()
      hue = 0
      bullets = []
      enemies = []
      spawn = 0.5
      cd = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function fire() {
      if (cd > 0) return
      cd = 0.18
      bullets.push({
        x: px, y: py - 16,
        vy: -Math.min(W, H) * 1.2,
        r: 6,
        hue: hue,
      })
      hue = (hue + 1) % 3
    }
    function tick(dt) {
      cd = Math.max(0, cd - dt)
      for (const b of bullets) b.y += b.vy * dt
      bullets = bullets.filter(b => b.y > -30)
      spawn -= dt
      if (spawn <= 0) {
        enemies.push({
          x: 28 + Math.random() * (W - 56),
          y: -24,
          r: 16,
          vy: 75 + Math.random() * 50 + score * 1.4,
          hue: (Math.random() * 3) | 0,
        })
        spawn = Math.max(0.32, 0.8 - score * 0.01)
      }
      for (const e of enemies) e.y += e.vy * dt
      for (const e of enemies) {
        for (const b of bullets) {
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
            b.dead = true
            if (e.hue === b.hue) {
              e.dead = true
              bump()
              if (window.Juice) Juice.burst(e.x, e.y)
            } else {
              die()
              return
            }
          }
        }
      }
      bullets = bullets.filter(b => !b.dead)
      enemies = enemies.filter(e => {
        if (e.dead) return false
        if (e.y - e.r > H - 10) { die(); return false }
        return true
      })
    }
    function draw() {
      PF.sky(ctx, W, H, '#05051a', '#0a0a2a', '#1a2050')
      PF.dots(ctx, W, H, '#22ffaa', 14, 0.6)
      for (const e of enemies) {
        PF.buddy(ctx, e.x, e.y, e.r, COLS[e.hue], '#111', {
          lookY: 0.4, blush: false,
        })
      }
      for (const b of bullets) {
        ctx.fillStyle = COLS[b.hue]
        ctx.shadowColor = COLS[b.hue]
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
      PF.block(ctx, px - 26, py - 12, 52, 24, COLS[hue], '#222', 12)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '700 12px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('TAP', px, py + 36)
      ctx.textAlign = 'left'
    }
    addEventListener('pointerdown', () => { if (!GS.paused) fire() })
    reset()
`,
  },

  oneshot: {
    title: 'One Shot',
    tip: 'One bullet. Bank off walls.',
    bg: '#0a1210',
    accent: '#ffd166',
    body: `
    let cannonX = 0, cannonY = 0, aimX = 0, aimY = 0, dragging = false
    let bullet = null, targets = [], wave = 1, bouncing = false
    function layout() {
      cannonX = W * 0.5
      cannonY = H * 0.9
    }
    function onResize() { layout() }
    function diePos() { return bullet ? [bullet.x, bullet.y] : [cannonX, cannonY] }
    function scorePos() { return diePos() }
    function spawnTargets() {
      targets = []
      const n = 3 + Math.min(6, wave)
      for (let i = 0; i < n; i++) {
        targets.push({
          x: 40 + Math.random() * (W - 80),
          y: 60 + Math.random() * (H * 0.45),
          r: 14 + Math.random() * 6,
          alive: true,
        })
      }
    }
    function reset() {
      layout()
      aimX = cannonX
      aimY = cannonY - 80
      dragging = false
      bullet = null
      bouncing = false
      wave = 1
      spawnTargets()
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function fire() {
      if (bullet || bouncing) return
      const dx = aimX - cannonX
      const dy = aimY - cannonY
      const len = Math.hypot(dx, dy) || 1
      const sp = Math.min(W, H) * 1.05
      bullet = {
        x: cannonX, y: cannonY - 10,
        vx: (dx / len) * sp,
        vy: (dy / len) * sp,
        r: 7,
        life: 4.5,
      }
      bouncing = true
    }
    function nextWave() {
      bump(5)
      wave++
      bullet = null
      bouncing = false
      spawnTargets()
      if (window.Juice) Juice.shake(0.6)
    }
    function tick(dt) {
      if (!bullet) return
      bullet.life -= dt
      bullet.x += bullet.vx * dt
      bullet.y += bullet.vy * dt
      if (bullet.x < bullet.r) { bullet.x = bullet.r; bullet.vx = Math.abs(bullet.vx) }
      if (bullet.x > W - bullet.r) { bullet.x = W - bullet.r; bullet.vx = -Math.abs(bullet.vx) }
      if (bullet.y < bullet.r) { bullet.y = bullet.r; bullet.vy = Math.abs(bullet.vy) }
      if (bullet.y > H - bullet.r) { bullet.y = H - bullet.r; bullet.vy = -Math.abs(bullet.vy) * 0.92 }
      for (const t of targets) {
        if (!t.alive) continue
        if (Math.hypot(t.x - bullet.x, t.y - bullet.y) < t.r + bullet.r) {
          t.alive = false
          bump()
          if (window.Juice) Juice.burst(t.x, t.y)
        }
      }
      const left = targets.filter(t => t.alive).length
      if (left === 0) {
        nextWave()
        return
      }
      if (bullet.life <= 0) die()
    }
    function draw() {
      PF.sky(ctx, W, H, '#04120e', '#0a1210', '#163828')
      PF.dots(ctx, W, H, '#ffd166', 12, 0.5)
      PF.blobs(ctx, W, H, '#1a4030', 3)
      for (const t of targets) {
        if (!t.alive) continue
        PF.buddy(ctx, t.x, t.y, t.r, '#ffd166', '#c9a227', { blush: true })
      }
      if (bullet) {
        ctx.fillStyle = '#fff6c2'
        ctx.shadowColor = '#ffd166'
        ctx.shadowBlur = 14
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        ctx.strokeStyle = 'rgba(255,209,102,0.45)'
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.moveTo(cannonX, cannonY)
        ctx.lineTo(aimX, aimY)
        ctx.stroke()
        ctx.setLineDash([])
      }
      PF.block(ctx, cannonX - 20, cannonY - 12, 40, 24, '#ffe8a0', '#9a7a20', 8)
    }
    function ptr(e) {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || bullet) return
      dragging = true
      const p = ptr(e)
      aimX = p.x
      aimY = Math.min(cannonY - 20, p.y)
    })
    addEventListener('pointermove', e => {
      if (GS.paused || !dragging || bullet) return
      const p = ptr(e)
      aimX = p.x
      aimY = Math.min(cannonY - 20, p.y)
    })
    addEventListener('pointerup', () => {
      if (GS.paused) return
      if (dragging && !bullet) fire()
      dragging = false
    })
    reset()
`,
  },

  chainblast: {
    title: 'Chain Blast',
    tip: 'Tap a bubble to start a chain.',
    bg: '#160814',
    accent: '#ff6600',
    body: `
    const COLS = ['#ff6600', '#ff2d78', '#ffd166', '#66a3ff', '#22ffaa']
    let bubbles = [], chaining = false, queue = [], settle = 0, crowded = false
    function layout() {}
    function onResize() { layout() }
    function diePos() {
      const b = bubbles[0]
      return b ? [b.x, b.y] : [W * 0.5, H * 0.5]
    }
    function scorePos() { return diePos() }
    function fillField() {
      bubbles = []
      const n = 14 + ((Math.random() * 6) | 0)
      for (let i = 0; i < n; i++) {
        bubbles.push({
          x: 30 + Math.random() * (W - 60),
          y: 80 + Math.random() * (H * 0.7),
          r: 18 + Math.random() * 10,
          c: (Math.random() * COLS.length) | 0,
          vx: (Math.random() - 0.5) * 28,
          vy: (Math.random() - 0.5) * 28,
          pop: 0,
        })
      }
      crowded = bubbles.length >= 16
    }
    function reset() {
      layout()
      chaining = false
      queue = []
      settle = 0
      fillField()
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function startChain(i) {
      if (chaining || GS.paused) return
      chaining = true
      queue = [i]
      bubbles[i].pop = 0.01
      settle = 0
    }
    function tick(dt) {
      for (const b of bubbles) {
        if (b.pop > 0) continue
        b.x += b.vx * dt
        b.y += b.vy * dt
        if (b.x < b.r || b.x > W - b.r) b.vx *= -1
        if (b.y < 50 + b.r || b.y > H - 40 - b.r) b.vy *= -1
        b.x = Math.max(b.r, Math.min(W - b.r, b.x))
        b.y = Math.max(50 + b.r, Math.min(H - 40 - b.r, b.y))
      }
      if (!chaining) return
      if (queue.length) {
        const i = queue.shift()
        const src = bubbles[i]
        if (!src || src.gone) return
        const chainR = src.r * 2.4
        src.gone = true
        bump()
        if (window.Juice) Juice.burst(src.x, src.y)
        for (let j = 0; j < bubbles.length; j++) {
          const o = bubbles[j]
          if (o.gone || o.pop > 0) continue
          if (o.c !== src.c) continue
          if (Math.hypot(o.x - src.x, o.y - src.y) <= chainR) {
            o.pop = 0.01
            queue.push(j)
          }
        }
      } else {
        settle += dt
        if (settle > 0.25) {
          const cleared = bubbles.filter(b => b.gone).length
          bubbles = bubbles.filter(b => !b.gone)
          chaining = false
          if (crowded && cleared < 3) {
            die()
            return
          }
          if (bubbles.length < 5) fillField()
          crowded = bubbles.length >= 16
        }
      }
    }
    function draw() {
      PF.sky(ctx, W, H, '#0a0408', '#160814', '#3a1028')
      PF.blobs(ctx, W, H, '#2a0a20', 4)
      PF.dots(ctx, W, H, '#ff6600', 10, 0.4)
      for (const b of bubbles) {
        if (b.gone) continue
        const a = b.pop > 0 ? 0.45 : 1
        ctx.globalAlpha = a
        ctx.fillStyle = COLS[b.c]
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.beginPath()
        ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.28, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || chaining) return
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      let best = -1, bestD = 1e9
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]
        if (b.gone) continue
        const d = Math.hypot(b.x - x, b.y - y)
        if (d < b.r + 8 && d < bestD) { best = i; bestD = d }
      }
      if (best >= 0) startChain(best)
    })
    reset()
`,
  },

  popshot: {
    title: 'Pop Shot',
    tip: 'Aim and pop three-of-a-kind.',
    bg: '#001133',
    accent: '#00ccff',
    body: `
    const COLS = ['#00ccff', '#ff2d78', '#ffd166', '#7cff6b']
    let grid = [], cols = 7, rows = 8, cell = 0, ox = 0, oy = 0
    let aimX = 0, shot = null, nextC = 0, creep = 0, dangerY = 0
    function layout() {
      cell = Math.min(W / (cols + 0.5), H * 0.055)
      ox = (W - cols * cell) * 0.5 + cell * 0.5
      oy = H * 0.12
      dangerY = H * 0.72
      aimX = W * 0.5
    }
    function onResize() { layout() }
    function diePos() { return [aimX, H * 0.9] }
    function scorePos() { return shot ? [shot.x, shot.y] : diePos() }
    function cellAt(c, r) { return { x: ox + c * cell, y: oy + r * cell * 0.92 } }
    function nbr(c, r) {
      const o = r % 2
      return [[c - 1, r], [c + 1, r], [c - 1 + o, r - 1], [c + o, r - 1], [c - 1 + o, r + 1], [c + o, r + 1]]
    }
    function refill() {
      grid = []
      for (let r = 0; r < 5; r++) {
        const row = []
        for (let c = 0; c < cols; c++) row.push((Math.random() * COLS.length) | 0)
        grid.push(row)
      }
      for (let r = 5; r < rows; r++) grid.push(Array(cols).fill(-1))
      nextC = (Math.random() * COLS.length) | 0
      creep = 0
    }
    function reset() { layout(); shot = null; refill(); setScore(0) }
    function onHostStart() { reset() }
    function die() { reset() }
    function popMatches(sc, sr) {
      const color = grid[sr][sc]
      if (color < 0) return 0
      const stack = [[sc, sr]], seen = {}, group = []
      seen[sc + ',' + sr] = true
      while (stack.length) {
        const p = stack.pop()
        group.push(p)
        for (const n of nbr(p[0], p[1])) {
          const nc = n[0], nr = n[1], key = nc + ',' + nr
          if (nr < 0 || nr >= grid.length || nc < 0 || nc >= cols || seen[key]) continue
          if (grid[nr][nc] !== color) continue
          seen[key] = true
          stack.push([nc, nr])
        }
      }
      if (group.length < 3) return 0
      for (const g of group) grid[g[1]][g[0]] = -1
      bump(group.length)
      return group.length
    }
    function placeable(c, r) {
      if (r === 0) return true
      for (const n of nbr(c, r)) {
        const nc = n[0], nr = n[1]
        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < cols && grid[nr][nc] >= 0) return true
      }
      return false
    }
    function snapShot(hitC, hitR) {
      let best = null, bestD = 1e9
      const consider = (c, r) => {
        if (r < 0 || r >= grid.length || c < 0 || c >= cols) return
        if (grid[r][c] >= 0 || !placeable(c, r)) return
        const p = cellAt(c, r)
        const d = Math.hypot(p.x - shot.x, p.y - shot.y)
        if (d < bestD) { best = [c, r]; bestD = d }
      }
      // Prefer empty neighbors of the bubble we hit (stable after wall banks).
      if (hitC != null && hitR != null) {
        for (const n of nbr(hitC, hitR)) consider(n[0], n[1])
      }
      if (!best) {
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < cols; c++) consider(c, r)
        }
      }
      if (!best) {
        // Nowhere to stick — keep the shot in play instead of vanishing.
        if (shot.vy < 0) shot.vy = Math.abs(shot.vy)
        shot.y = Math.max(shot.y, oy)
        return
      }
      grid[best[1]][best[0]] = shot.c
      if (popMatches(best[0], best[1]) && window.Juice) Juice.burst(shot.x, shot.y)
      shot = null
      nextC = (Math.random() * COLS.length) | 0
    }
    function lowestY() {
      let max = 0
      for (let r = 0; r < grid.length; r++)
        for (let c = 0; c < cols; c++)
          if (grid[r][c] >= 0) max = Math.max(max, cellAt(c, r).y + cell * 0.45)
      return max
    }
    function tick(dt) {
      creep += dt
      if (creep > 7.5) {
        creep = 0
        grid.unshift(Array.from({ length: cols }, () => (Math.random() * COLS.length) | 0))
        if (grid.length > rows + 2) grid.pop()
      }
      if (lowestY() >= dangerY) die()
      if (!shot) return
      shot.x += shot.vx * dt
      shot.y += shot.vy * dt
      const margin = cell * 0.45
      if (shot.x < margin) { shot.x = margin; shot.vx = Math.abs(shot.vx) }
      if (shot.x > W - margin) { shot.x = W - margin; shot.vx = -Math.abs(shot.vx) }
      // Ceiling: stick to nearest open slot (no distance cutoff — fixes wall-bank misses).
      if (shot.y < oy - cell * 0.2) { snapShot(); return }
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] < 0) continue
          const p = cellAt(c, r)
          if (Math.hypot(p.x - shot.x, p.y - shot.y) < cell * 0.78) {
            snapShot(c, r)
            return
          }
        }
      }
      if (shot.y > H + cell) shot = null
    }
    function draw() {
      PF.sky(ctx, W, H, '#000820', '#001133', '#003366')
      PF.dots(ctx, W, H, '#00ccff', 16, 0.55)
      ctx.strokeStyle = 'rgba(255,80,80,0.55)'
      ctx.setLineDash([6, 6])
      ctx.beginPath(); ctx.moveTo(20, dangerY); ctx.lineTo(W - 20, dangerY); ctx.stroke()
      ctx.setLineDash([])
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] < 0) continue
          const p = cellAt(c, r)
          ctx.fillStyle = COLS[grid[r][c]]
          ctx.beginPath(); ctx.arc(p.x, p.y, cell * 0.42, 0, Math.PI * 2); ctx.fill()
        }
      }
      const by = H * 0.9
      if (!shot) {
        ctx.strokeStyle = 'rgba(0,204,255,0.4)'
        ctx.beginPath(); ctx.moveTo(W * 0.5, by); ctx.lineTo(aimX, by - 120); ctx.stroke()
      } else {
        ctx.fillStyle = COLS[shot.c]
        ctx.beginPath(); ctx.arc(shot.x, shot.y, cell * 0.4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = COLS[nextC]
      ctx.beginPath(); ctx.arc(W * 0.5, by, cell * 0.4, 0, Math.PI * 2); ctx.fill()
    }
    function ptr(e) {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    addEventListener('pointermove', e => { if (!GS.paused && !shot) aimX = ptr(e).x })
    addEventListener('pointerdown', e => {
      if (GS.paused || shot) return
      aimX = ptr(e).x
      const dx = aimX - W * 0.5, dy = -120, len = Math.hypot(dx, dy) || 1
      const sp = Math.min(W, H) * 1.1
      shot = { x: W * 0.5, y: H * 0.9, vx: (dx / len) * sp, vy: (dy / len) * sp, c: nextC }
    })
    reset()
`,
  },

  cryptrun: {
    title: 'Crypt Run',
    tip: 'Tap to jump. Double-tap in air.',
    bg: '#14041a',
    accent: '#ff5722',
    body: `
    let px = 0, py = 0, vy = 0, onGround = true, jumps = 0
    let obstacles = [], spawn = 0.7, distAcc = 0, groundY = 0
    function layout() {
      px = W * 0.28
      groundY = H * 0.78
      py = groundY
    }
    function onResize() { layout() }
    function diePos() { return [px, py] }
    function scorePos() { return [px, py - 20] }
    function reset() {
      layout()
      vy = 0
      onGround = true
      jumps = 0
      obstacles = []
      spawn = 0.6
      distAcc = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function jump() {
      if (GS.paused) return
      if (onGround || jumps < 2) {
        vy = -Math.min(W, H) * 0.95
        onGround = false
        jumps++
      }
    }
    function tick(dt) {
      const g = Math.min(W, H) * 2.6
      vy += g * dt
      py += vy * dt
      if (py >= groundY) {
        py = groundY
        vy = 0
        onGround = true
        jumps = 0
      }
      const speed = 180 + score * 3
      spawn -= dt
      if (spawn <= 0) {
        // Keep a jumpable gap that scales with scroll speed (single + double jump).
        const minDist = Math.max(W * 0.55, 200)
        const last = obstacles.length ? obstacles[obstacles.length - 1] : null
        if (last && last.x > W + 30 - minDist) {
          spawn = 0.08
        } else {
          const maxH = Math.min(W, H) * 0.14
          const h = 22 + Math.random() * maxH
          obstacles.push({
            x: W + 30,
            y: groundY - h,
            w: 20 + Math.random() * 14,
            h: h,
          })
          spawn = minDist / speed + 0.25 + Math.random() * 0.45
        }
      }
      for (const o of obstacles) o.x -= speed * dt
      obstacles = obstacles.filter(o => {
        if (o.x + o.w < -10) return false
        const pr = 14
        if (px + pr > o.x && px - pr < o.x + o.w && py + pr > o.y && py - pr < o.y + o.h) die()
        return true
      })
      distAcc += dt
      if (distAcc > 0.55) {
        distAcc = 0
        bump()
      }
    }
    function draw() {
      PF.sky(ctx, W, H, '#080210', '#14041a', '#3a1530')
      PF.blobs(ctx, W, H, '#2a0a28', 4)
      PF.dots(ctx, W, H, '#ff5722', 12, 0.5)
      PF.block(ctx, 0, groundY + 14, W, H - groundY, '#1a0a22', '#0c0614', 0)
      for (const o of obstacles) {
        PF.block(ctx, o.x, o.y, o.w, o.h, '#ff8a65', '#ff5722', 6)
      }
      PF.buddy(ctx, px, py - 4, 15, '#ffe0d0', '#ffab91', {
        lookX: 0.6, lookY: onGround ? 0.2 : -0.4, blush: true,
      })
    }
    addEventListener('pointerdown', () => jump())
    reset()
`,
  },

  starvoid: {
    title: 'Star Void',
    tip: 'Drag to move. Survive the swarm.',
    bg: '#060318',
    accent: '#ff3366',
    body: `
    let sx = 0, sy = 0, bullets = [], enemies = [], spawn = 0.4, fireCd = 0
    function layout() {
      sx = W * 0.5
      sy = H * 0.78
    }
    function onResize() { layout() }
    function diePos() { return [sx, sy] }
    function scorePos() { return [sx, sy - 30] }
    function reset() {
      layout()
      bullets = []
      enemies = []
      spawn = 0.35
      fireCd = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      fireCd -= dt
      if (fireCd <= 0) {
        fireCd = 0.16
        bullets.push({ x: sx, y: sy - 12, vy: -Math.min(W, H) * 1.35, r: 4 })
      }
      for (const b of bullets) b.y += b.vy * dt
      bullets = bullets.filter(b => b.y > -20)
      spawn -= dt
      if (spawn <= 0) {
        enemies.push({
          x: 20 + Math.random() * (W - 40),
          y: -20,
          vx: (Math.random() - 0.5) * 60,
          vy: 70 + Math.random() * 80 + score * 1.5,
          r: 12 + Math.random() * 8,
        })
        spawn = Math.max(0.18, 0.55 - score * 0.008)
      }
      for (const e of enemies) {
        e.x += e.vx * dt
        e.y += e.vy * dt
        if (e.x < e.r || e.x > W - e.r) e.vx *= -1
      }
      for (const e of enemies) {
        for (const b of bullets) {
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
            e.dead = true
            b.dead = true
            bump()
            if (window.Juice) Juice.burst(e.x, e.y)
          }
        }
        if (Math.hypot(e.x - sx, e.y - sy) < e.r + 14) die()
      }
      bullets = bullets.filter(b => !b.dead)
      enemies = enemies.filter(e => !e.dead && e.y < H + 40)
    }
    function draw() {
      PF.sky(ctx, W, H, '#02010c', '#060318', '#1a0840')
      PF.dots(ctx, W, H, '#ff3366', 22, 0.8)
      for (const e of enemies) {
        PF.buddy(ctx, e.x, e.y, e.r, '#ff6688', '#ff3366', { lookY: 0.5 })
      }
      for (const b of bullets) {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      }
      PF.buddy(ctx, sx, sy, 14, '#cce0ff', '#88aaff', {
        lookY: -0.5, blush: true,
      })
    }
    function move(e) {
      if (GS.paused) return
      const r = canvas.getBoundingClientRect()
      sx = Math.max(20, Math.min(W - 20, e.clientX - r.left))
      sy = Math.max(H * 0.55, Math.min(H * 0.9, e.clientY - r.top))
    }
    addEventListener('pointerdown', move)
    addEventListener('pointermove', move)
    reset()
`,
  },

  pegdrop: {
    title: 'Peg Drop',
    tip: 'Aim and drop through the pegs.',
    bg: '#16082a',
    accent: '#ff44ff',
    body: `
    let pegs = [], slots = [], ball = null, aimX = 0, ballsLeft = 10, dropping = false
    let dropY = 0, slotY = 0
    function layout() {
      dropY = H * 0.08
      slotY = H * 0.9
      aimX = W * 0.5
      pegs = []
      const rows = 9, cols = 7
      const gapX = W / (cols + 1)
      const gapY = (slotY - dropY - 40) / (rows + 1)
      for (let r = 0; r < rows; r++) {
        const n = cols - (r % 2)
        const off = r % 2 ? gapX * 0.5 : 0
        for (let c = 0; c < n; c++) {
          pegs.push({
            x: gapX + off + c * gapX,
            y: dropY + 36 + r * gapY,
            r: 5,
          })
        }
      }
      const counts = slots.map(s => s.count || 0)
      slots = []
      const mults = [0.5, 1, 2, 5, 2, 1, 0.5]
      const sw = W / mults.length
      for (let i = 0; i < mults.length; i++) {
        slots.push({ x: i * sw, w: sw, mult: mults[i], count: counts[i] || 0 })
      }
    }
    function onResize() { layout() }
    function diePos() { return ball ? [ball.x, ball.y] : [aimX, dropY] }
    function scorePos() { return diePos() }
    function reset() {
      slots = []
      layout()
      for (const sl of slots) sl.count = 0
      ball = null
      dropping = false
      ballsLeft = 10
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function drop() {
      if (GS.paused || dropping || ballsLeft <= 0) return
      dropping = true
      ballsLeft--
      ball = {
        x: aimX, y: dropY + 10,
        vx: (Math.random() - 0.5) * 40,
        vy: 40,
        r: 8,
      }
    }
    function tick(dt) {
      if (!ball) return
      const g = 900
      const sub = Math.max(1, Math.min(4, Math.ceil(dt / 0.012)))
      const h = dt / sub
      for (let s = 0; s < sub; s++) {
        ball.vy += g * h
        ball.x += ball.vx * h
        ball.y += ball.vy * h
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.7 }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.7 }
        for (const p of pegs) {
          const dx = ball.x - p.x
          const dy = ball.y - p.y
          const dist = Math.hypot(dx, dy) || 0.001
          const min = ball.r + p.r
          if (dist < min) {
            const nx = dx / dist, ny = dy / dist
            ball.x = p.x + nx * min
            ball.y = p.y + ny * min
            const vn = ball.vx * nx + ball.vy * ny
            if (vn < 0) {
              ball.vx -= 1.55 * vn * nx
              ball.vy -= 1.55 * vn * ny
            }
            ball.vx += (Math.random() - 0.5) * 30
          }
        }
      }
      if (ball.y >= slotY - ball.r) {
        let hit = slots[0]
        for (const sl of slots) {
          if (ball.x >= sl.x && ball.x < sl.x + sl.w) hit = sl
        }
        hit.count = (hit.count || 0) + 1
        const pts = Math.floor(10 * hit.mult)
        if (pts > 0) bump(pts)
        if (window.Juice) Juice.burst(ball.x, ball.y)
        ball = null
        dropping = false
        if (ballsLeft <= 0) die()
      }
    }
    function draw() {
      PF.sky(ctx, W, H, '#0a0418', '#16082a', '#3a1060')
      PF.dots(ctx, W, H, '#ff44ff', 14, 0.5)
      for (const p of pegs) {
        ctx.fillStyle = '#e0b0ff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const sl of slots) {
        const hot = sl.mult >= 5
        PF.block(ctx, sl.x + 2, slotY, sl.w - 4, H - slotY, hot ? '#ff44ff' : '#4a2080', '#2a1040', 4)
        ctx.fillStyle = '#fff'
        ctx.font = '700 11px "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('x' + sl.mult, sl.x + sl.w * 0.5, slotY + 16)
        if (sl.count > 0) {
          ctx.fillStyle = '#ffe066'
          ctx.font = '800 14px "Segoe UI", sans-serif'
          ctx.fillText(String(sl.count), sl.x + sl.w * 0.5, slotY + 34)
        }
      }
      ctx.textAlign = 'left'
      if (!dropping) {
        ctx.strokeStyle = 'rgba(255,68,255,0.5)'
        ctx.beginPath()
        ctx.moveTo(aimX, dropY)
        ctx.lineTo(aimX, dropY + 28)
        ctx.stroke()
      }
      if (ball) {
        ctx.fillStyle = '#ffe066'
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '700 13px "Segoe UI", sans-serif'
      ctx.fillText('Balls ' + ballsLeft, 12, 28)
    }
    addEventListener('pointermove', e => {
      if (GS.paused || dropping) return
      const r = canvas.getBoundingClientRect()
      aimX = Math.max(16, Math.min(W - 16, e.clientX - r.left))
    })
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      const r = canvas.getBoundingClientRect()
      aimX = Math.max(16, Math.min(W - 16, e.clientX - r.left))
      drop()
    })
    reset()
`,
  },

  neondash: {
    title: 'Neon Dash',
    tip: 'Tap jump. Swipe down to slide.',
    bg: '#1a0a2e',
    accent: '#ff2d78',
    body: `
    let px = 0, py = 0, vy = 0, onGround = true, jumps = 0, sliding = 0
    let obstacles = [], spawn = 0.65, distAcc = 0, groundY = 0
    let sx0 = 0, sy0 = 0, tracking = false
    function layout() {
      px = W * 0.26
      groundY = H * 0.78
      py = groundY
    }
    function onResize() { layout() }
    function diePos() { return [px, py] }
    function scorePos() { return [px, py - 20] }
    function reset() {
      layout()
      vy = 0
      onGround = true
      jumps = 0
      sliding = 0
      obstacles = []
      spawn = 0.55
      distAcc = 0
      tracking = false
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function jump() {
      if (sliding > 0) return
      if (onGround || jumps < 2) {
        vy = -Math.min(W, H) * 0.92
        onGround = false
        jumps++
      }
    }
    function slide() {
      if (!onGround) return
      sliding = 0.55
    }
    function tick(dt) {
      sliding = Math.max(0, sliding - dt)
      const g = Math.min(W, H) * 2.5
      if (sliding <= 0) {
        vy += g * dt
        py += vy * dt
      } else {
        py = groundY
        vy = 0
      }
      if (py >= groundY) {
        py = groundY
        vy = 0
        onGround = true
        jumps = 0
      }
      const speed = 200 + score * 3.5
      spawn -= dt
      if (spawn <= 0) {
        const kind = Math.random() < 0.45 ? 'bar' : 'block'
        if (kind === 'bar') {
          obstacles.push({
            kind: 'bar',
            x: W + 40,
            y: groundY - 52,
            w: 70 + Math.random() * 40,
            h: 14,
          })
        } else {
          const h = 30 + Math.random() * 34
          obstacles.push({
            kind: 'block',
            x: W + 30,
            y: groundY - h,
            w: 24 + Math.random() * 16,
            h: h,
          })
        }
        spawn = 0.7 + Math.random() * 0.5
      }
      for (const o of obstacles) o.x -= speed * dt
      const prx = 14
      const pry = sliding > 0 ? 8 : 14
      const pTop = py - (sliding > 0 ? 4 : 14)
      obstacles = obstacles.filter(o => {
        if (o.x + o.w < -20) return false
        if (px + prx > o.x && px - prx < o.x + o.w && pTop + pry * 2 > o.y && pTop < o.y + o.h) {
          if (o.kind === 'bar' && sliding > 0) return true
          die()
        }
        return true
      })
      distAcc += dt
      if (distAcc > 0.5) { distAcc = 0; bump() }
    }
    function draw() {
      PF.sky(ctx, W, H, '#0c0418', '#1a0a2e', '#3a1050')
      PF.dots(ctx, W, H, '#ff2d78', 16, 0.65)
      PF.block(ctx, 0, groundY + 12, W, H - groundY, '#12061e', '#080310', 0)
      ctx.strokeStyle = 'rgba(255,45,120,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, groundY + 4)
      ctx.lineTo(W, groundY + 4)
      ctx.stroke()
      for (const o of obstacles) {
        if (o.kind === 'bar') {
          PF.block(ctx, o.x, o.y, o.w, o.h, '#66f0ff', '#00aacc', 6)
        } else {
          PF.block(ctx, o.x, o.y, o.w, o.h, '#ff6b9a', '#ff2d78', 6)
        }
      }
      const r = sliding > 0 ? 10 : 14
      PF.buddy(ctx, px, py - (sliding > 0 ? 2 : 4), r, '#ffd0e0', '#ff8fb0', {
        lookX: 0.7,
        lookY: sliding > 0 ? 0.5 : (onGround ? 0.1 : -0.4),
        squash: sliding > 0 ? 0.55 : 1,
        stretch: sliding > 0 ? 1.35 : 1,
        blush: true,
      })
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      tracking = true
      sx0 = e.clientX
      sy0 = e.clientY
    })
    addEventListener('pointerup', e => {
      if (GS.paused || !tracking) return
      tracking = false
      const dx = e.clientX - sx0
      const dy = e.clientY - sy0
      if (dy > 48 && Math.abs(dy) > Math.abs(dx) * 1.1) slide()
      else jump()
    })
    addEventListener('pointercancel', () => { tracking = false })
    reset()
`,
  },

  nighttreads: {
    title: 'Night Treads',
    tip: 'Drag to aim. Hold the line.',
    bg: '#04050f',
    accent: '#ffd166',
    body: `
    let tx = 0, ty = 0, aim = -Math.PI * 0.5, bullets = [], zombies = [], spawn = 0.7
    let fireCd = 0, holding = false
    function layout() {
      tx = W * 0.5
      ty = H * 0.88
    }
    function onResize() { layout() }
    function diePos() { return [tx, ty] }
    function scorePos() { return bullets[0] ? [bullets[0].x, bullets[0].y] : [tx, ty] }
    function reset() {
      layout()
      aim = -Math.PI * 0.5
      bullets = []
      zombies = []
      spawn = 0.55
      fireCd = 0
      holding = false
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function fire() {
      if (fireCd > 0) return
      fireCd = 0.22
      const sp = Math.min(W, H) * 1.2
      bullets.push({
        x: tx, y: ty - 16,
        vx: Math.cos(aim) * sp,
        vy: Math.sin(aim) * sp,
        r: 5,
      })
    }
    function tick(dt) {
      fireCd = Math.max(0, fireCd - dt)
      if (holding) fire()
      for (const b of bullets) {
        b.x += b.vx * dt
        b.y += b.vy * dt
      }
      bullets = bullets.filter(b => b.y > -30 && b.x > -30 && b.x < W + 30)
      spawn -= dt
      if (spawn <= 0) {
        zombies.push({
          x: 24 + Math.random() * (W - 48),
          y: -24,
          r: 15 + Math.random() * 6,
          vy: 55 + Math.random() * 45 + score * 1.3,
          hp: 1 + ((score / 12) | 0),
        })
        spawn = Math.max(0.28, 0.75 - score * 0.01)
      }
      for (const z of zombies) {
        const dx = tx - z.x
        z.x += dx * dt * 0.35
        z.y += z.vy * dt
      }
      for (const z of zombies) {
        for (const b of bullets) {
          if (Math.hypot(z.x - b.x, z.y - b.y) < z.r + b.r) {
            b.dead = true
            z.hp--
            if (z.hp <= 0) {
              z.dead = true
              bump()
              if (window.Juice) Juice.burst(z.x, z.y)
            }
          }
        }
        if (Math.hypot(z.x - tx, z.y - ty) < z.r + 18) die()
      }
      bullets = bullets.filter(b => !b.dead)
      zombies = zombies.filter(z => !z.dead && z.y < H + 40)
    }
    function draw() {
      PF.sky(ctx, W, H, '#020208', '#04050f', '#12182a')
      PF.dots(ctx, W, H, '#ffd166', 14, 0.45)
      PF.blobs(ctx, W, H, '#1a2030', 3)
      for (const z of zombies) {
        PF.buddy(ctx, z.x, z.y, z.r, '#8fbc8f', '#3d5c3d', {
          lookY: 0.6, blush: false,
        })
      }
      for (const b of bullets) {
        ctx.fillStyle = '#ffd166'
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      }
      const len = 36
      ctx.strokeStyle = '#ffd166'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx + Math.cos(aim) * len, ty + Math.sin(aim) * len)
      ctx.stroke()
      PF.block(ctx, tx - 28, ty - 14, 56, 28, '#c0c8d8', '#5a6578', 8)
      PF.block(ctx, tx - 34, ty + 6, 68, 16, '#4a5568', '#2a3038', 6)
    }
    function aimAt(e) {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      aim = Math.atan2(y - ty, x - tx)
      if (aim > -0.15) aim = -0.15
      if (aim < -Math.PI + 0.15) aim = -Math.PI + 0.15
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      holding = true
      aimAt(e)
      fire()
    })
    addEventListener('pointermove', e => {
      if (GS.paused) return
      aimAt(e)
    })
    addEventListener('pointerup', () => { holding = false })
    addEventListener('pointercancel', () => { holding = false })
    reset()
`,
  },
}
