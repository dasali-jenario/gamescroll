/**
 * Wave 3 official GameScroll bodies.
 * Simon + Whack-a-Mole adapted from Sai-Uttej-R/GameBox (MIT).
 * Remaining micro-games are original GameScroll jam-style ports (see THIRD_PARTY_NOTICES).
 */
export const wave3Games = {
  simonseq: {
    title: 'Simon Sequence',
    tip: 'Watch the pattern. Repeat it.',
    bg: '#0d0221',
    accent: '#ff2e63',
    body: `
    let pads = [], seq = [], input = [], phase = 'idle', flash = -1, flashT = 0
    let playI = 0, playT = 0, level = 0, lock = false
    const COLS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a']
    function layout() {
      const side = Math.min(W * 0.78, H * 0.48)
      const gap = 10
      const pad = (side - gap) * 0.5
      const ox = (W - side) * 0.5
      const oy = H * 0.28
      pads = [
        { i: 0, x: ox, y: oy, w: pad, h: pad },
        { i: 1, x: ox + pad + gap, y: oy, w: pad, h: pad },
        { i: 2, x: ox, y: oy + pad + gap, w: pad, h: pad },
        { i: 3, x: ox + pad + gap, y: oy + pad + gap, w: pad, h: pad },
      ]
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, H * 0.5] }
    function scorePos() { return diePos() }
    function reset() {
      layout()
      seq = []; input = []; phase = 'idle'; flash = -1; flashT = 0
      playI = 0; playT = 0; level = 0; lock = false
      setScore(0)
    }
    function onHostStart() { reset(); nextStep() }
    function die() { reset(); nextStep() }
    function nextStep() {
      input = []
      seq.push((Math.random() * 4) | 0)
      level = seq.length
      setScore(Math.max(0, level - 1))
      phase = 'playback'
      playI = 0
      playT = 0.4
      lock = true
      flash = -1
    }
    function tick(dt) {
      if (flashT > 0) {
        flashT -= dt
        if (flashT <= 0) flash = -1
      }
      if (phase === 'gap') {
        playT -= dt
        if (playT <= 0) nextStep()
        return
      }
      if (phase !== 'playback') return
      playT -= dt
      if (playT > 0) return
      if (playI >= seq.length) {
        phase = 'input'
        lock = false
        return
      }
      flash = seq[playI]
      flashT = 0.32
      playI++
      playT = 0.55
    }
    function padAt(e) {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      for (const p of pads) {
        if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p.i
      }
      return -1
    }
    function draw() {
      PF.sky(ctx, W, H, '#05010f', '#0d0221', '#240046')
      PF.dots(ctx, W, H, '#ff2e63', 14, 0.35)
      for (const p of pads) {
        const lit = flash === p.i
        PF.block(ctx, p.x, p.y, p.w, p.h, lit ? '#ffffff' : COLS[p.i], '#111', 16)
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = '700 14px "Segoe UI", sans-serif'
      const label = phase === 'playback' || phase === 'gap' ? 'Watch' : 'Your turn · Lv ' + level
      ctx.fillText(label, 14, 28)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || lock || phase !== 'input') return
      const i = padAt(e)
      if (i < 0) return
      flash = i
      flashT = 0.18
      input.push(i)
      const step = input.length - 1
      if (input[step] !== seq[step]) {
        if (window.Juice) Juice.burst(W * 0.5, H * 0.5)
        die()
        return
      }
      bump(1)
      if (input.length === seq.length) {
        lock = true
        phase = 'gap'
        playT = 0.65
      }
    })
    reset()
`,
  },

  molewhack: {
    title: 'Mole Whack',
    tip: 'Tap moles before they duck.',
    bg: '#1b4332',
    accent: '#f4a261',
    body: `
    let holes = [], active = -1, hideT = 0, timeLeft = 30, running = false
    let ox = 0, oy = 0, cell = 0, gap = 12, cols = 3, rows = 3
    function layout() {
      const pad = 18
      const side = Math.min(W - pad * 2, H * 0.58)
      gap = 12
      cell = (side - gap * (cols - 1)) / cols
      ox = (W - side) * 0.5
      oy = H * 0.2
      holes = []
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        holes.push({
          x: ox + c * (cell + gap),
          y: oy + r * (cell + gap),
          w: cell, h: cell,
        })
      }
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, oy + cell * 1.5] }
    function scorePos() { return diePos() }
    function spawn() {
      active = (Math.random() * holes.length) | 0
      hideT = Math.max(0.35, 0.95 - score * 0.012)
    }
    function reset() {
      layout()
      active = -1
      hideT = 0
      timeLeft = 30
      running = true
      setScore(0)
      spawn()
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      if (!running || GS.paused) return
      timeLeft -= dt
      if (timeLeft <= 0) {
        timeLeft = 0
        running = false
        die()
        return
      }
      hideT -= dt
      if (hideT <= 0) spawn()
    }
    function draw() {
      PF.sky(ctx, W, H, '#081c15', '#1b4332', '#2d6a4f')
      PF.dots(ctx, W, H, '#95d5b2', 12, 0.3)
      for (let i = 0; i < holes.length; i++) {
        const h = holes[i]
        PF.block(ctx, h.x, h.y, h.w, h.h, '#081c15', '#052015', 999)
        ctx.fillStyle = '#40916c'
        ctx.beginPath()
        ctx.ellipse(h.x + h.w * 0.5, h.y + h.h * 0.72, h.w * 0.34, h.h * 0.12, 0, 0, Math.PI * 2)
        ctx.fill()
        if (i === active) {
          PF.buddy(ctx, h.x + h.w * 0.5, h.y + h.h * 0.48, h.w * 0.22, '#f4a261', '#e76f51', {
            lookY: -0.2, blush: true,
          })
        }
      }
      ctx.fillStyle = timeLeft < 8 ? '#ff6688' : 'rgba(255,255,255,0.75)'
      ctx.font = '700 14px "Segoe UI", sans-serif'
      ctx.fillText('Time ' + Math.ceil(timeLeft), 14, 28)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || !running || active < 0) return
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const h = holes[active]
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
        bump()
        if (window.Juice) Juice.burst(h.x + h.w * 0.5, h.y + h.h * 0.45)
        active = -1
        hideT = 0.12
      }
    })
    reset()
`,
  },

  reactflash: {
    title: 'React Flash',
    tip: 'Wait for green. Tap fast. No early taps.',
    bg: '#111827',
    accent: '#34d399',
    body: `
    let phase = 'wait', waitT = 0, goAt = 0, resultT = 0, lastMs = 0
    function layout() {}
    function onResize() { layout() }
    function diePos() { return [W * 0.5, H * 0.5] }
    function scorePos() { return diePos() }
    function arm() {
      phase = 'wait'
      waitT = 0.8 + Math.random() * 2.4
      goAt = 0
      resultT = 0
    }
    function reset() {
      layout()
      setScore(0)
      arm()
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      if (GS.paused) return
      if (phase === 'wait') {
        waitT -= dt
        if (waitT <= 0) {
          phase = 'go'
          goAt = performance.now()
        }
      } else if (phase === 'result' || phase === 'fail') {
        resultT -= dt
        if (resultT <= 0) arm()
      }
    }
    function draw() {
      const bg0 = phase === 'go' ? '#064e3b' : phase === 'fail' ? '#450a0a' : '#030712'
      const bg1 = phase === 'go' ? '#34d399' : phase === 'fail' ? '#ef4444' : '#111827'
      PF.sky(ctx, W, H, bg0, bg1, phase === 'go' ? '#a7f3d0' : '#1f2937')
      ctx.fillStyle = '#fff'
      ctx.font = '800 ' + Math.floor(Math.min(W, H) * 0.08) + 'px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      let msg = 'Wait…'
      if (phase === 'go') msg = 'TAP!'
      if (phase === 'result') msg = lastMs + ' ms'
      if (phase === 'fail') msg = 'Too soon'
      ctx.fillText(msg, W * 0.5, H * 0.48)
      ctx.font = '700 14px "Segoe UI", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText('Best streak via score', W * 0.5, H * 0.62)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }
    addEventListener('pointerdown', () => {
      if (GS.paused) return
      if (phase === 'wait') {
        phase = 'fail'
        resultT = 0.9
        return
      }
      if (phase !== 'go') return
      lastMs = Math.max(1, Math.round(performance.now() - goAt))
      const pts = Math.max(1, Math.floor((450 - lastMs) / 8))
      bump(pts)
      if (window.Juice) Juice.burst(W * 0.5, H * 0.5)
      phase = 'result'
      resultT = 0.85
    })
    reset()
`,
  },

  mashmeter: {
    title: 'Mash Meter',
    tip: 'Tap as fast as you can for 8 seconds.',
    bg: '#1e1b4b',
    accent: '#a78bfa',
    body: `
    let timeLeft = 8, running = false, pulses = []
    function layout() {}
    function onResize() { layout() }
    function diePos() { return [W * 0.5, H * 0.55] }
    function scorePos() { return diePos() }
    function reset() {
      layout()
      timeLeft = 8
      running = true
      pulses = []
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      if (!running || GS.paused) return
      timeLeft -= dt
      pulses = pulses.filter(p => { p.t -= dt; return p.t > 0 })
      if (timeLeft <= 0) {
        timeLeft = 0
        running = false
        die()
      }
    }
    function draw() {
      PF.sky(ctx, W, H, '#0f0a1f', '#1e1b4b', '#312e81')
      PF.dots(ctx, W, H, '#a78bfa', 16, 0.45)
      const meterW = W * 0.7
      const meterH = 28
      const mx = (W - meterW) * 0.5
      const my = H * 0.38
      PF.block(ctx, mx, my, meterW, meterH, '#312e81', '#1e1b4b', 14)
      const fill = Math.min(1, score / 80)
      PF.block(ctx, mx + 3, my + 3, (meterW - 6) * fill, meterH - 6, '#a78bfa', '#7c3aed', 12)
      for (const p of pulses) {
        ctx.globalAlpha = Math.max(0, p.t)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(W * 0.5, H * 0.62, 40 + (1 - p.t) * 50, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      PF.buddy(ctx, W * 0.5, H * 0.62, 26, '#c4b5fd', '#8b5cf6', { stretch: 1 + fill * 0.2, blush: true })
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = '700 14px "Segoe UI", sans-serif'
      ctx.fillText('Time ' + timeLeft.toFixed(1), 14, 28)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || !running) return
      bump()
      const r = canvas.getBoundingClientRect()
      pulses.push({ t: 0.35, x: e.clientX - r.left, y: e.clientY - r.top })
    })
    reset()
`,
  },

  targetdrop: {
    title: 'Target Drop',
    tip: 'Tap falling targets. Miss three and you lose.',
    bg: '#0c1445',
    accent: '#f72585',
    body: `
    let targets = [], spawn = 0.4, misses = 0
    function layout() {}
    function onResize() { layout() }
    function diePos() { return [W * 0.5, H * 0.5] }
    function scorePos() { return targets[0] ? [targets[0].x, targets[0].y] : diePos() }
    function reset() {
      layout()
      targets = []
      spawn = 0.35
      misses = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      spawn -= dt
      if (spawn <= 0) {
        targets.push({
          x: 30 + Math.random() * (W - 60),
          y: -20,
          r: 18 + Math.random() * 10,
          vy: 140 + Math.random() * 90 + score * 2.2,
          hue: Math.random(),
        })
        spawn = Math.max(0.22, 0.7 - score * 0.01)
      }
      for (const t of targets) t.y += t.vy * dt
      const kept = []
      for (const t of targets) {
        if (t.y - t.r > H) {
          misses++
          if (misses >= 3) { die(); return }
        } else if (!t.dead) kept.push(t)
      }
      targets = kept
    }
    function draw() {
      PF.sky(ctx, W, H, '#050816', '#0c1445', '#1b3a6b')
      PF.dots(ctx, W, H, '#f72585', 14, 0.4)
      for (const t of targets) {
        const c = 'hsl(' + ((t.hue * 360) | 0) + ' 85% 60%)'
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(t.x, t.y, t.r * 0.45, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = '700 13px "Segoe UI", sans-serif'
      ctx.fillText('Misses ' + misses + '/3', 14, 28)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      for (const t of targets) {
        if (t.dead) continue
        if (Math.hypot(t.x - x, t.y - y) <= t.r + 8) {
          t.dead = true
          bump()
          if (window.Juice) Juice.burst(t.x, t.y)
          return
        }
      }
    })
    reset()
`,
  },

  orbchain: {
    title: 'Orb Chain',
    tip: 'Tap your cells. Fill to explode and take the board.',
    bg: '#0a0a2a',
    accent: '#22ddff',
    body: `
    let cols = 5, rows = 7, board = [], ox = 0, oy = 0, cell = 0, gap = 4
    let turn = 1, exploding = false, boomQ = [], boomT = 0
    function layout() {
      const pad = 14
      const sideW = W - pad * 2
      const sideH = H * 0.72
      cell = Math.min((sideW - gap * (cols - 1)) / cols, (sideH - gap * (rows - 1)) / rows)
      ox = (W - (cell * cols + gap * (cols - 1))) * 0.5
      oy = H * 0.14
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, oy + cell * 3] }
    function scorePos() { return diePos() }
    function cap(i) {
      const c = i % cols, r = (i / cols) | 0
      let e = 0
      if (c === 0 || c === cols - 1) e++
      if (r === 0 || r === rows - 1) e++
      if (e >= 2) return 2
      if (e === 1) return 3
      return 4
    }
    function neighbors(i) {
      const c = i % cols, r = (i / cols) | 0, out = []
      if (r > 0) out.push(i - cols)
      if (r < rows - 1) out.push(i + cols)
      if (c > 0) out.push(i - 1)
      if (c < cols - 1) out.push(i + 1)
      return out
    }
    function reset() {
      layout()
      board = Array.from({ length: cols * rows }, () => ({ owner: 0, orbs: 0 }))
      turn = 1
      exploding = false
      boomQ = []
      boomT = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function countOwner(o) {
      let n = 0
      for (const c of board) if (c.owner === o) n += c.orbs
      return n
    }
    function checkWin() {
      const p1 = board.some(c => c.owner === 1)
      const p2 = board.some(c => c.owner === 2)
      if (p1 && !p2) {
        bump(50)
        die()
        return true
      }
      if (p2 && !p1) {
        die()
        return true
      }
      return false
    }
    function enqueueUnstable() {
      for (let i = 0; i < board.length; i++) {
        if (board[i].orbs >= cap(i)) boomQ.push(i)
      }
    }
    function stepBoom() {
      if (!boomQ.length) {
        exploding = false
        if (checkWin()) return
        if (turn === 2) aiMove()
        return
      }
      const uniq = [...new Set(boomQ)]
      boomQ = []
      for (const i of uniq) {
        const cellB = board[i]
        if (cellB.orbs < cap(i)) continue
        const owner = cellB.owner
        cellB.orbs -= cap(i)
        if (cellB.orbs <= 0) { cellB.orbs = 0; cellB.owner = 0 }
        for (const n of neighbors(i)) {
          board[n].owner = owner
          board[n].orbs++
          if (board[n].orbs >= cap(n)) boomQ.push(n)
        }
        if (owner === 1) bump(1)
      }
      boomT = 0.16
    }
    function place(i, owner) {
      const c = board[i]
      if (c.owner && c.owner !== owner) return false
      c.owner = owner
      c.orbs++
      exploding = true
      boomQ = []
      enqueueUnstable()
      boomT = 0.05
      turn = owner === 1 ? 2 : 1
      return true
    }
    function aiMove() {
      const opts = []
      for (let i = 0; i < board.length; i++) {
        if (!board[i].owner || board[i].owner === 2) opts.push(i)
      }
      if (!opts.length) return
      // prefer near-capacity own cells, else random empty
      opts.sort((a, b) => {
        const sa = board[a].owner === 2 ? board[a].orbs / cap(a) : 0
        const sb = board[b].owner === 2 ? board[b].orbs / cap(b) : 0
        return sb - sa
      })
      const pick = opts[(Math.random() * Math.min(3, opts.length)) | 0]
      place(pick, 2)
    }
    function tick(dt) {
      if (!exploding) return
      boomT -= dt
      if (boomT <= 0) stepBoom()
    }
    function draw() {
      PF.sky(ctx, W, H, '#040414', '#0a0a2a', '#151545')
      PF.dots(ctx, W, H, '#22ddff', 12, 0.3)
      for (let i = 0; i < board.length; i++) {
        const c = i % cols, r = (i / cols) | 0
        const x = ox + c * (cell + gap)
        const y = oy + r * (cell + gap)
        PF.block(ctx, x, y, cell, cell, '#12122a', '#080818', 8)
        const b = board[i]
        if (!b.orbs) continue
        const col = b.owner === 1 ? '#22ddff' : '#ff3344'
        for (let k = 0; k < b.orbs; k++) {
          const ang = (k / Math.max(1, b.orbs)) * Math.PI * 2
          const rr = b.orbs === 1 ? 0 : cell * 0.18
          ctx.fillStyle = col
          ctx.beginPath()
          ctx.arc(x + cell * 0.5 + Math.cos(ang) * rr, y + cell * 0.5 + Math.sin(ang) * rr, cell * 0.12, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = '700 13px "Segoe UI", sans-serif'
      ctx.fillText(exploding ? 'Chain…' : (turn === 1 ? 'Your turn' : 'CPU…'), 14, 28)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || exploding || turn !== 1) return
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const c = Math.floor((x - ox) / (cell + gap))
      const row = Math.floor((y - oy) / (cell + gap))
      if (c < 0 || row < 0 || c >= cols || row >= rows) return
      const i = row * cols + c
      if (board[i].owner === 2) return
      place(i, 1)
    })
    reset()
`,
  },

  skewkeep: {
    title: 'Skew Keep',
    tip: 'Tap left/right to keep the bar level.',
    bg: '#1a120b',
    accent: '#fb923c',
    body: `
    let angle = 0, angVel = 0, alive = true, cx = 0, cy = 0, len = 0, acc = 0
    function layout() {
      cx = W * 0.5
      cy = H * 0.55
      len = Math.min(W * 0.36, 120)
    }
    function onResize() { layout() }
    function diePos() { return [cx, cy] }
    function scorePos() { return diePos() }
    function reset() {
      layout()
      angle = (Math.random() - 0.5) * 0.2
      angVel = (Math.random() - 0.5) * 0.4
      alive = true
      acc = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      if (!alive) return
      angVel += Math.sin(angle) * 2.8 * dt
      angVel += (Math.random() - 0.5) * 0.35 * dt
      angle += angVel * dt
      acc += dt
      while (acc >= 0.2) {
        acc -= 0.2
        bump()
      }
      if (Math.abs(angle) > 0.85) {
        alive = false
        die()
      }
    }
    function draw() {
      PF.sky(ctx, W, H, '#0c0805', '#1a120b', '#3d2a1a')
      PF.dots(ctx, W, H, '#fb923c', 12, 0.3)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)
      PF.block(ctx, -len, -10, len * 2, 20, '#fb923c', '#c2410c', 10)
      PF.buddy(ctx, 0, -28, 16, '#fdba74', '#ea580c', {
        lookX: Math.max(-0.5, Math.min(0.5, angle * 2)), blush: true,
      })
      ctx.restore()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillRect(0, H * 0.82, W * 0.5, H * 0.18)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(W * 0.5, H * 0.82, W * 0.5, H * 0.18)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '700 13px "Segoe UI", sans-serif'
      ctx.fillText('LEFT          RIGHT', 14, H * 0.9)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || !alive) return
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      angVel += x < W * 0.5 ? -1.8 : 1.8
    })
    reset()
`,
  },
}
