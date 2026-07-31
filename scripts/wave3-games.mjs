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
    tip: 'Tap moles before they duck. Miss −3.',
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
      setScore(9)
      spawn()
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function missMole() {
      setScore(score - 3)
      if (score <= 0) {
        setScore(0)
        running = false
        die()
        return true
      }
      return false
    }
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
      if (hideT <= 0) {
        if (active >= 0) {
          if (missMole()) return
        }
        spawn()
      }
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
    const BEST_KEY = 'gs_reactflash_best_ms'
    let phase = 'wait', waitT = 0, goAt = 0, resultT = 0, lastMs = 0, bestMs = 0
    function loadBest() {
      try {
        const n = parseInt(localStorage.getItem(BEST_KEY) || '0', 10)
        return Number.isFinite(n) && n > 0 ? n : 0
      } catch (e) { return 0 }
    }
    function saveBest(ms) {
      try { localStorage.setItem(BEST_KEY, String(ms)) } catch (e) {}
    }
    function reportBest(ms) {
      setScore(ms)
      try { parent.postMessage({ type: 'gamescroll:score', score: ms }, '*') } catch (e) {}
    }
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
      bestMs = loadBest() || bestMs
      setScore(bestMs)
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
      ctx.fillText(bestMs > 0 ? ('Best ' + bestMs + ' ms') : 'Lower time is better', W * 0.5, H * 0.62)
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
      if (!bestMs || lastMs < bestMs) {
        bestMs = lastMs
        saveBest(bestMs)
      }
      reportBest(lastMs)
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
    let turn = 1, exploding = false, boomQ = [], boomT = 0, moves = 0
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
      moves = 0
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
      // Both sides must have placed once — otherwise the first tap
      // looks like a wipeout (CPU has no cells yet) and ends the round.
      if (moves < 2) return false
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
      moves++
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

  mathrush: {
    title: 'Math Rush',
    tip: 'Tap the right answer. 20 seconds!',
    bg: '#0b2420',
    accent: '#5eead4',
    body: `
    const ROUND = 20
    let timeLeft = ROUND, running = false, prompt = '', answer = 0
    let choices = [], pads = [], flashI = -1, flashT = 0, flashOk = false
    let qBox = { x: 0, y: 0, w: 0, h: 0 }
    function randInt(a, b) { return a + ((Math.random() * (b - a + 1)) | 0) }
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t
      }
      return arr
    }
    function makeQuestion() {
      const kind = (Math.random() * 3) | 0
      let a, b, ans, text
      if (kind === 0) {
        a = randInt(1, 12); b = randInt(1, 12); ans = a + b; text = a + ' + ' + b
      } else if (kind === 1) {
        a = randInt(5, 20); b = randInt(1, a); ans = a - b; text = a + ' − ' + b
      } else {
        a = randInt(2, 9); b = randInt(2, 9); ans = a * b; text = a + ' × ' + b
      }
      const set = new Set([ans])
      while (set.size < 4) {
        const delta = randInt(1, 6) * (Math.random() < 0.5 ? -1 : 1)
        const wrong = ans + delta
        if (wrong !== ans && wrong >= 0) set.add(wrong)
      }
      prompt = text
      answer = ans
      choices = shuffle(Array.from(set))
      layoutPads()
    }
    function layoutPads() {
      const gap = 12
      const side = Math.min(W - 36, H * 0.42)
      const padW = (side - gap) * 0.5
      const padH = Math.min(padW * 0.72, H * 0.14)
      const ox = (W - side) * 0.5
      const oy = H * 0.48
      qBox = { x: ox, y: H * 0.22, w: side, h: Math.min(H * 0.16, 88) }
      pads = []
      for (let i = 0; i < 4; i++) {
        const c = i % 2, r = (i / 2) | 0
        pads.push({
          i,
          x: ox + c * (padW + gap),
          y: oy + r * (padH + gap),
          w: padW,
          h: padH,
          v: choices[i],
        })
      }
    }
    function layout() { layoutPads() }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, H * 0.4] }
    function scorePos() { return diePos() }
    function reset() {
      timeLeft = ROUND
      running = true
      flashI = -1
      flashT = 0
      flashOk = false
      setScore(0)
      makeQuestion()
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      if (flashT > 0) {
        flashT -= dt
        if (flashT <= 0) {
          flashI = -1
          if (flashOk) makeQuestion()
          else if (!running) die()
        }
      }
      if (!running || GS.paused) return
      timeLeft -= dt
      if (timeLeft <= 0) {
        timeLeft = 0
        running = false
        die()
      }
    }
    function padAt(e) {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      for (const p of pads) {
        if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p
      }
      return null
    }
    function draw() {
      PF.sky(ctx, W, H, '#041512', '#0b2420', '#134e4a')
      PF.dots(ctx, W, H, '#5eead4', 14, 0.35)
      PF.block(ctx, qBox.x, qBox.y, qBox.w, qBox.h, '#115e59', '#0f766e', 18)
      ctx.fillStyle = '#ecfdf5'
      ctx.font = '800 ' + Math.floor(Math.min(W, H) * 0.09) + 'px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(prompt, W * 0.5, qBox.y + qBox.h * 0.5)
      for (const p of pads) {
        const lit = flashI === p.i
        const c0 = lit ? (flashOk ? '#5eead4' : '#fb7185') : '#1a3a36'
        const c1 = lit ? (flashOk ? '#14b8a6' : '#e11d48') : '#0f2926'
        PF.block(ctx, p.x, p.y, p.w, p.h, c0, c1, 16)
        ctx.fillStyle = '#fff'
        ctx.font = '800 ' + Math.floor(Math.min(p.w, p.h) * 0.42) + 'px "Segoe UI", sans-serif'
        ctx.fillText(String(p.v), p.x + p.w * 0.5, p.y + p.h * 0.52)
      }
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = timeLeft < 5 ? '#fb7185' : 'rgba(255,255,255,0.75)'
      ctx.font = '700 14px "Segoe UI", sans-serif'
      ctx.fillText('Time ' + Math.ceil(timeLeft), 14, 28)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || !running || flashT > 0) return
      const p = padAt(e)
      if (!p) return
      flashI = p.i
      flashT = 0.22
      if (p.v === answer) {
        flashOk = true
        bump()
        if (window.Juice) Juice.burst(p.x + p.w * 0.5, p.y + p.h * 0.5)
      } else {
        flashOk = false
        running = false
        if (window.Juice) Juice.burst(W * 0.5, H * 0.4)
      }
    })
    reset()
`,
  },

  // Mechanics adapted from insertcoin Drop Stack / Orb Merge (MIT) — see THIRD_PARTY_NOTICES.
  // Piece radius is 2× Orb Merge (tierR uses ×3 vs orbmerge ×1.5).
  veggiemerge: {
    title: 'Veggie Merge',
    tip: 'Drop veggies. Merge matches into bigger ones!',
    bg: '#1a2e14',
    accent: '#a3e635',
    body: `
    const TIERS = [
      { r: 13, kind: 'tomato', color: '#ef4444', shade: '#991b1b', accent: '#fecaca', score: 1 },
      { r: 17, kind: 'radish', color: '#fb7185', shade: '#9f1239', accent: '#fff1f2', score: 3 },
      { r: 22, kind: 'carrot', color: '#f97316', shade: '#c2410c', accent: '#ffedd5', score: 6 },
      { r: 28, kind: 'onion', color: '#e9d5ff', shade: '#7e22ce', accent: '#faf5ff', score: 10 },
      { r: 35, kind: 'potato', color: '#d4a574', shade: '#8b5e34', accent: '#f5e6d3', score: 15 },
      { r: 44, kind: 'cabbage', color: '#86efac', shade: '#15803d', accent: '#dcfce7', score: 21 },
      { r: 54, kind: 'corn', color: '#facc15', shade: '#a16207', accent: '#fef9c3', score: 28 },
      { r: 66, kind: 'eggplant', color: '#a855f7', shade: '#6b21a8', accent: '#f3e8ff', score: 36 },
      { r: 80, kind: 'pumpkin', color: '#fb923c', shade: '#c2410c', accent: '#ffedd5', score: 55 },
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
      jarL = W * 0.05
      jarR = W * 0.95
      jarBottom = H * 0.92
      dangerY = H * 0.18
      dropY = H * 0.1
      holdX = W * 0.5
    }
    function onResize() { layout() }
    // Orb Merge uses ×1.5; veggies are 2× that size.
    function tierR(t) { return TIERS[t].r * S * 3 }
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
          size: (3 + Math.random() * 4) * S,
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
        popup(mx, my - 20 * S, 'FEAST!')
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
          const a = orbs[i]
          if (!a || a.merging) continue
          for (let j = i + 1; j < orbs.length; j++) {
            const b = orbs[j]
            if (!b || b.merging) continue
            const ra = tierR(a.tier), rb = tierR(b.tier)
            let dx = b.x - a.x, dy = b.y - a.y
            let dist = Math.hypot(dx, dy) || 0.0001
            const min = ra + rb
            if (dist >= min) continue
            if (a.tier === b.tier) {
              if (performance.now() - a.born > 60 && performance.now() - b.born > 60) {
                mergePair(a, b)
              }
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
      // 2× orbs jitter harder in the stack than Orb Merge — requiring near-zero |vy|
      // meant overflow never stayed "settled" long enough to trip game over.
      // Count anything whose top is past the line and not still plunging downward.
      let over = false
      for (const o of orbs) {
        if (o.merging) continue
        if (performance.now() - o.born < 600) continue
        const top = o.y - tierR(o.tier)
        if (top < dangerY && o.vy < 120 * S) { over = true; break }
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
    function leaf(x, y, s, rot) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot || 0)
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(s * 0.55, -s * 0.35, s * 0.9, 0)
      ctx.quadraticCurveTo(s * 0.55, s * 0.35, 0, 0)
      ctx.fill()
      ctx.strokeStyle = '#166534'
      ctx.lineWidth = Math.max(1, s * 0.1)
      ctx.beginPath(); ctx.moveTo(s * 0.1, 0); ctx.lineTo(s * 0.7, 0); ctx.stroke()
      ctx.restore()
    }
    function bodyGrad(t, r) {
      const g = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.06, 0, 0, r)
      g.addColorStop(0, t.accent)
      g.addColorStop(0.42, t.color)
      g.addColorStop(1, t.shade)
      return g
    }
    function roundBody(r, t) {
      // Soft squircle-ish circle (slightly rounded square feel via slight flatten)
      ctx.fillStyle = bodyGrad(t, r)
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'
      ctx.lineWidth = Math.max(1.5, r * 0.06)
      ctx.stroke()
      // Gloss
      ctx.fillStyle = 'rgba(255,255,255,0.42)'
      ctx.beginPath()
      ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.32, r * 0.2, -0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.beginPath()
      ctx.ellipse(r * 0.22, r * 0.2, r * 0.18, r * 0.12, 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
    function cheek(r, color) {
      ctx.fillStyle = color || 'rgba(255,120,140,0.35)'
      ctx.beginPath(); ctx.ellipse(-r * 0.38, r * 0.12, r * 0.14, r * 0.1, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(r * 0.38, r * 0.12, r * 0.14, r * 0.1, 0, 0, Math.PI * 2); ctx.fill()
    }
    function cuteFace(r) {
      ctx.fillStyle = '#1a1025'
      const er = Math.max(1.5, r * 0.09)
      ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.05, er, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.05, er, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(-r * 0.19, -r * 0.08, er * 0.35, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.08, er * 0.35, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#1a1025'
      ctx.lineWidth = Math.max(1.2, r * 0.05)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(0, r * 0.12, r * 0.18, 0.15, Math.PI - 0.15)
      ctx.stroke()
    }
    function drawVeggie(x, y, tier, ang) {
      const t = TIERS[tier], r = tierR(tier), kind = t.kind
      ctx.save()
      ctx.translate(x, y)
      if (ang) ctx.rotate(ang)
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.92, r * 0.78, r * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      roundBody(r, t)
      if (kind === 'tomato') {
        ctx.fillStyle = '#166534'
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.72, r * 0.32, r * 0.16, 0, 0, Math.PI * 2)
        ctx.fill()
        leaf(-r * 0.2, -r * 0.78, r * 0.45, -0.9)
        leaf(r * 0.12, -r * 0.8, r * 0.4, -0.2)
        leaf(r * 0.28, -r * 0.72, r * 0.35, 0.7)
        cheek(r)
        cuteFace(r)
      } else if (kind === 'radish') {
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.beginPath()
        ctx.ellipse(0, r * 0.42, r * 0.62, r * 0.38, 0, 0, Math.PI * 2)
        ctx.fill()
        leaf(-r * 0.18, -r * 0.78, r * 0.48, -1.0)
        leaf(r * 0.2, -r * 0.76, r * 0.42, 0.35)
        cheek(r, 'rgba(255,90,120,0.4)')
        cuteFace(r)
      } else if (kind === 'carrot') {
        // Round carrot orb with concentric rings + leaf tuft
        ctx.strokeStyle = 'rgba(194,65,12,0.35)'
        ctx.lineWidth = Math.max(1.2, r * 0.05)
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath()
          ctx.arc(0, r * 0.05, r * (0.35 + i * 0.18), 0.2, Math.PI - 0.2)
          ctx.stroke()
        }
        leaf(-r * 0.15, -r * 0.78, r * 0.5, -1.1)
        leaf(0.05 * r, -r * 0.88, r * 0.42, -0.4)
        leaf(r * 0.22, -r * 0.74, r * 0.4, 0.55)
        cheek(r, 'rgba(255,160,80,0.35)')
        cuteFace(r)
      } else if (kind === 'onion') {
        ctx.strokeStyle = 'rgba(126,34,206,0.28)'
        ctx.lineWidth = Math.max(1.5, r * 0.055)
        ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = '#86efac'
        ctx.beginPath()
        ctx.moveTo(-r * 0.12, -r * 0.7)
        ctx.quadraticCurveTo(0, -r * 1.05, r * 0.12, -r * 0.7)
        ctx.quadraticCurveTo(0, -r * 0.78, -r * 0.12, -r * 0.7)
        ctx.fill()
        cheek(r, 'rgba(200,140,255,0.35)')
        cuteFace(r)
      } else if (kind === 'potato') {
        ctx.fillStyle = 'rgba(139,94,52,0.45)'
        for (const spot of [[-0.35, -0.2], [0.28, 0.05], [0.08, -0.38], [-0.12, 0.32], [0.4, -0.28]]) {
          ctx.beginPath()
          ctx.arc(spot[0] * r, spot[1] * r, r * (0.06 + Math.abs(spot[0]) * 0.04), 0, Math.PI * 2)
          ctx.fill()
        }
        cheek(r, 'rgba(210,150,100,0.4)')
        cuteFace(r)
      } else if (kind === 'cabbage') {
        ctx.strokeStyle = 'rgba(21,128,61,0.35)'
        ctx.lineWidth = Math.max(1.5, r * 0.05)
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2
          ctx.beginPath()
          ctx.ellipse(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18, r * 0.55, r * 0.42, a, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.2, r * 0.35, 0, Math.PI * 2); ctx.fill()
        cheek(r, 'rgba(120,220,150,0.35)')
        cuteFace(r)
      } else if (kind === 'corn') {
        // Round corn cob face with kernel grid
        ctx.fillStyle = 'rgba(161,98,7,0.28)'
        const step = r * 0.28
        for (let row = -2; row <= 2; row++) {
          for (let col = -2; col <= 2; col++) {
            if (row * row + col * col > 5.5) continue
            ctx.beginPath()
            ctx.arc(col * step * 0.85, row * step * 0.75, r * 0.1, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        leaf(-r * 0.55, -r * 0.35, r * 0.55, -2.2)
        leaf(r * 0.55, -r * 0.3, r * 0.5, -0.9)
        cheek(r, 'rgba(255,200,80,0.4)')
        cuteFace(r)
      } else if (kind === 'eggplant') {
        ctx.fillStyle = '#166534'
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.72, r * 0.38, r * 0.2, 0, 0, Math.PI * 2)
        ctx.fill()
        leaf(-r * 0.25, -r * 0.82, r * 0.4, -1.0)
        leaf(r * 0.22, -r * 0.78, r * 0.35, 0.4)
        // Soft highlight crescent
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.lineWidth = Math.max(2, r * 0.08)
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.7, -0.4, 0.9)
        ctx.stroke()
        cheek(r, 'rgba(200,120,255,0.35)')
        cuteFace(r)
      } else {
        // pumpkin — round with ribs + stem
        ctx.strokeStyle = 'rgba(194,65,12,0.4)'
        ctx.lineWidth = Math.max(2, r * 0.055)
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath()
          ctx.moveTo(i * r * 0.32, -r * 0.82)
          ctx.quadraticCurveTo(i * r * 0.4, 0, i * r * 0.32, r * 0.82)
          ctx.stroke()
        }
        ctx.fillStyle = '#166534'
        PF.rr(ctx, -r * 0.12, -r * 0.98, r * 0.24, r * 0.28, Math.max(3, r * 0.08))
        ctx.fill()
        leaf(-r * 0.32, -r * 0.82, r * 0.42, -1.0)
        leaf(r * 0.28, -r * 0.78, r * 0.36, 0.5)
        cheek(r, 'rgba(255,150,80,0.35)')
        cuteFace(r)
      }
      ctx.restore()
    }
    function draw() {
      PF.sky(ctx, W, H, '#0f1f0c', '#1a2e14', '#2d4a1f')
      PF.dots(ctx, W, H, '#a3e635', 16, 0.3)
      PF.blobs(ctx, W, H, '#4ade80', 3)
      // crate / garden bed
      ctx.fillStyle = 'rgba(92, 64, 40, 0.45)'
      ctx.fillRect(jarL - 6 * S, jarBottom, jarR - jarL + 12 * S, H - jarBottom)
      ctx.strokeStyle = 'rgba(180, 120, 60, 0.7)'
      ctx.lineWidth = 5 * S
      ctx.beginPath()
      ctx.moveTo(jarL, dangerY)
      ctx.lineTo(jarL, jarBottom)
      ctx.lineTo(jarR, jarBottom)
      ctx.lineTo(jarR, dangerY)
      ctx.stroke()
      const dangerPulse = dangerSince > 0 ? 0.45 + 0.35 * Math.sin(performance.now() / 120) : 0.28
      ctx.strokeStyle = 'rgba(255,80,80,' + dangerPulse + ')'
      ctx.setLineDash([8 * S, 6 * S])
      ctx.beginPath(); ctx.moveTo(jarL, dangerY); ctx.lineTo(jarR, dangerY); ctx.stroke()
      ctx.setLineDash([])
      const nr = tierR(queue[0]) * 0.45
      drawVeggie(jarR - 22 * S - nr, dangerY * 0.42, queue[0], 0)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '700 ' + Math.round(11 * S) + 'px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('NEXT', jarR - 22 * S - nr, dangerY * 0.42 - nr - 8 * S)
      ctx.textAlign = 'left'
      for (const o of orbs) drawVeggie(o.x, o.y, o.tier, o.vx * 0.01)
      if (!GS.paused && canDrop) {
        clampHoldX()
        ctx.globalAlpha = 0.9
        drawVeggie(holdX, dropY, holdTier, 0)
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
        ctx.fillStyle = '#bef264'
        ctx.font = '800 ' + Math.round(16 * S) + 'px "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(p.text, p.x, p.y - u * 36 * S)
      }
      ctx.textAlign = 'left'
      ctx.globalAlpha = 1
      if (flash > 0) {
        ctx.fillStyle = 'rgba(163,230,53,' + (flash * 0.35) + ')'
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

  doodletd: {
    title: 'Doodle Defense',
    tip: 'Place Pencil, Marker, or Ink Blot. Stop the scribbles!',
    bg: '#c9b896',
    accent: '#2c2416',
    body: `
    const KINDS = [
      { id: 'pencil', name: 'Pencil', cost: 40, range: 118, dmg: 9, rate: 0.32, splash: 0, color: '#3d5a80' },
      { id: 'marker', name: 'Marker', cost: 75, range: 140, dmg: 26, rate: 0.72, splash: 0, color: '#c1121f' },
      { id: 'blot', name: 'Blot', cost: 110, range: 105, dmg: 16, rate: 1.05, splash: 58, color: '#6a4c93' },
    ]
    let path = [], pads = [], towers = [], enemies = [], shots = [], puffs = []
    let gold = 0, lives = 0, wave = 0, sel = 0, spawnLeft = 0, spawnCd = 0, between = 0
    let barH = 0, ink = '#2c2416'
    function wob(i, amp) { return Math.sin(i * 2.17) * amp + Math.cos(i * 1.31) * amp * 0.4 }
    function layout() {
      barH = Math.max(72, Math.min(H * 0.14, 110))
      const top = H * 0.11
      const bot = H - barH - 18
      const mid = W * 0.5
      path = [
        { x: mid * 0.35, y: top },
        { x: mid * 0.75 + wob(1, 8), y: top + (bot - top) * 0.18 },
        { x: mid * 0.28 + wob(2, 10), y: top + (bot - top) * 0.36 },
        { x: mid * 0.78 + wob(3, 8), y: top + (bot - top) * 0.54 },
        { x: mid * 0.32 + wob(4, 10), y: top + (bot - top) * 0.72 },
        { x: mid * 0.55, y: bot },
      ]
      const padNorm = [
        [0.14, 0.24], [0.86, 0.24], [0.16, 0.38], [0.84, 0.38],
        [0.14, 0.52], [0.86, 0.52], [0.18, 0.66], [0.82, 0.66],
        [0.50, 0.32], [0.50, 0.48], [0.50, 0.62],
      ]
      pads = padNorm.map((p, i) => ({
        x: W * p[0] + wob(i + 9, 4),
        y: Math.min(bot - 10, Math.max(top + 10, H * p[1])) + wob(i + 3, 3),
        r: Math.min(W, H) * 0.038,
        tower: null,
      }))
      // Keep pads off the path
      for (const pad of pads) {
        for (let i = 0; i < path.length - 1; i++) {
          const a = path[i], b = path[i + 1]
          const dx = b.x - a.x, dy = b.y - a.y
          const len2 = dx * dx + dy * dy || 1
          let t = ((pad.x - a.x) * dx + (pad.y - a.y) * dy) / len2
          t = Math.max(0, Math.min(1, t))
          const px = a.x + dx * t, py = a.y + dy * t
          const d = Math.hypot(pad.x - px, pad.y - py)
          if (d < 36) {
            const nx = (pad.x - px) / (d || 1), ny = (pad.y - py) / (d || 1)
            pad.x += nx * (40 - d)
            pad.y += ny * (40 - d)
          }
        }
      }
    }
    function onResize() {
      const old = towers.slice()
      layout()
      towers = []
      for (const t of old) {
        let best = null, bd = 1e9
        for (const p of pads) {
          if (p.tower) continue
          const d = Math.hypot(p.x - t.x, p.y - t.y)
          if (d < bd) { bd = d; best = p }
        }
        if (best && bd < 80) {
          best.tower = t
          t.x = best.x; t.y = best.y
          towers.push(t)
        }
      }
    }
    function reset() {
      layout()
      towers = []; enemies = []; shots = []; puffs = []
      for (const p of pads) p.tower = null
      gold = 100; lives = 8; wave = 0; sel = 0
      spawnLeft = 0; spawnCd = 0; between = 1.2
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function diePos() { return [path[path.length - 1].x, path[path.length - 1].y] }
    function scorePos() { return [W * 0.5, H * 0.2] }
    function pathLen() {
      let L = 0
      for (let i = 0; i < path.length - 1; i++) L += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y)
      return L
    }
    function posOnPath(dist) {
      let left = dist
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1]
        const seg = Math.hypot(b.x - a.x, b.y - a.y)
        if (left <= seg) {
          const t = left / (seg || 1)
          return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
        }
        left -= seg
      }
      const last = path[path.length - 1]
      return { x: last.x, y: last.y }
    }
    function startWave() {
      wave++
      spawnLeft = 5 + wave * 2
      spawnCd = 0.35
      between = 0
    }
    function spawnEnemy() {
      const roll = Math.random()
      let kind = 'scribble', hp = 28 + wave * 10, spd = 52 + wave * 2.5, r = 11, col = '#2c2416'
      if (wave >= 3 && roll < 0.28) { kind = 'squiggle'; hp = 18 + wave * 7; spd = 88 + wave * 3; r = 9; col = '#1d3557' }
      if (wave >= 5 && roll < 0.18) { kind = 'blob'; hp = 70 + wave * 18; spd = 34 + wave; r = 16; col = '#6d4c41' }
      enemies.push({ kind, hp, max: hp, spd, r, col, dist: 0, hit: 0 })
    }
    function addPuff(x, y, c, n) {
      for (let i = 0; i < (n || 6); i++) {
        puffs.push({
          x, y,
          vx: (Math.random() - 0.5) * 90,
          vy: (Math.random() - 0.5) * 90,
          life: 0.35 + Math.random() * 0.25,
          max: 0.5,
          c,
          s: 2 + Math.random() * 4,
        })
      }
    }
    function hurt(e, dmg) {
      e.hp -= dmg
      e.hit = 0.12
      if (e.hp <= 0) {
        const i = enemies.indexOf(e)
        if (i >= 0) enemies.splice(i, 1)
        gold += 8 + Math.floor(wave * 0.6)
        bump()
        addPuff(e.x, e.y, e.col, 10)
      }
    }
    function tick(dt) {
      if (lives <= 0) return
      if (spawnLeft > 0) {
        spawnCd -= dt
        if (spawnCd <= 0) {
          spawnEnemy()
          spawnLeft--
          spawnCd = Math.max(0.28, 0.85 - wave * 0.03)
        }
      } else if (enemies.length === 0) {
        between += dt
        if (between >= 1.6) startWave()
      }
      const total = pathLen()
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        e.dist += e.spd * dt
        if (e.hit > 0) e.hit -= dt
        const p = posOnPath(e.dist)
        e.x = p.x; e.y = p.y
        if (e.dist >= total) {
          enemies.splice(i, 1)
          lives--
          addPuff(p.x, p.y, '#c1121f', 8)
          if (lives <= 0) { die(); return }
        }
      }
      for (const t of towers) {
        t.cd -= dt
        if (t.cd > 0) continue
        const k = KINDS[t.kind]
        let best = null, bd = k.range
        for (const e of enemies) {
          const d = Math.hypot(e.x - t.x, e.y - t.y)
          if (d < bd) { bd = d; best = e }
        }
        if (!best) continue
        t.cd = k.rate
        t.angle = Math.atan2(best.y - t.y, best.x - t.x)
        shots.push({
          x: t.x, y: t.y, tx: best.x, ty: best.y,
          target: best, kind: t.kind, speed: 420,
          splash: k.splash, dmg: k.dmg, color: k.color, life: 1.2,
        })
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]
        const aim = s.target && enemies.indexOf(s.target) >= 0
          ? s.target
          : { x: s.tx, y: s.ty }
        const dx = aim.x - s.x, dy = aim.y - s.y
        const d = Math.hypot(dx, dy) || 1
        const step = s.speed * dt
        if (d <= step + 6) {
          if (s.splash > 0) {
            for (const e of enemies.slice()) {
              if (Math.hypot(e.x - aim.x, e.y - aim.y) <= s.splash) hurt(e, s.dmg)
            }
            addPuff(aim.x, aim.y, s.color, 14)
          } else if (s.target && enemies.indexOf(s.target) >= 0) {
            hurt(s.target, s.dmg)
            addPuff(aim.x, aim.y, s.color, 5)
          }
          shots.splice(i, 1)
        } else {
          s.x += (dx / d) * step
          s.y += (dy / d) * step
          s.life -= dt
          if (s.life <= 0) shots.splice(i, 1)
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i]
        p.life -= dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.life <= 0) puffs.splice(i, 1)
      }
    }
    function sketchLine(a, b, w) {
      ctx.beginPath()
      ctx.moveTo(a.x + wob(a.x * 0.05, 1.2), a.y + wob(a.y * 0.05, 1.2))
      const mx = (a.x + b.x) * 0.5 + wob((a.x + b.x) * 0.02, 6)
      const my = (a.y + b.y) * 0.5 + wob((a.y + b.y) * 0.02, 5)
      ctx.quadraticCurveTo(mx, my, b.x + wob(b.x * 0.05, 1.2), b.y + wob(b.y * 0.05, 1.2))
      ctx.strokeStyle = ink
      ctx.lineWidth = w
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      // pencil ghost double-stroke
      ctx.globalAlpha = 0.25
      ctx.lineWidth = w * 0.55
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    function sketchCircle(x, y, r, fill) {
      ctx.beginPath()
      const n = 14
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2
        const rr = r * (0.92 + 0.08 * Math.sin(i * 2.3 + x * 0.01))
        const px = x + Math.cos(a) * rr + wob(i + x, 0.8)
        const py = y + Math.sin(a) * rr + wob(i + y, 0.8)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      if (fill) { ctx.fillStyle = fill; ctx.fill() }
      ctx.strokeStyle = ink
      ctx.lineWidth = 2.2
      ctx.stroke()
    }
    function drawTower(t) {
      const k = KINDS[t.kind]
      sketchCircle(t.x, t.y, 16, 'rgba(255,255,255,0.55)')
      ctx.save()
      ctx.translate(t.x, t.y)
      ctx.rotate(t.angle || -0.4)
      if (t.kind === 0) {
        // pencil
        ctx.strokeStyle = k.color
        ctx.fillStyle = '#f4d35e'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-4, 14); ctx.lineTo(-4, -10); ctx.lineTo(0, -18); ctx.lineTo(4, -10); ctx.lineTo(4, 14)
        ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#e9c46a'
        ctx.fillRect(-4, 6, 8, 6)
        ctx.fillStyle = ink
        ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(0, -17); ctx.lineTo(3, -10); ctx.fill()
      } else if (t.kind === 1) {
        // marker
        ctx.fillStyle = k.color
        ctx.strokeStyle = ink
        ctx.lineWidth = 2
        PF.rr(ctx, -6, -16, 12, 28, 3)
        ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#222'
        ctx.fillRect(-4, -18, 8, 5)
      } else {
        // ink blot
        ctx.fillStyle = k.color
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          const rr = 11 + 4 * Math.sin(i * 2.7)
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.closePath(); ctx.fill()
        ctx.globalAlpha = 1
        ctx.strokeStyle = ink
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.restore()
    }
    function drawEnemy(e) {
      ctx.save()
      ctx.translate(e.x, e.y)
      if (e.hit > 0) ctx.globalAlpha = 0.55
      ctx.strokeStyle = e.col
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      if (e.kind === 'squiggle') {
        ctx.moveTo(-e.r, 0)
        for (let i = 0; i <= 8; i++) {
          const x = -e.r + (i / 8) * e.r * 2
          const y = Math.sin(i * 1.6 + PF.t * 8) * e.r * 0.55
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      } else if (e.kind === 'blob') {
        sketchCircle(0, 0, e.r, 'rgba(109,76,65,0.35)')
      } else {
        // scribble ball of loops
        ctx.beginPath()
        for (let i = 0; i < 18; i++) {
          const a = i * 0.9 + PF.t * 3
          const rr = e.r * (0.4 + (i % 3) * 0.25)
          const px = Math.cos(a) * rr, py = Math.sin(a * 1.3) * rr
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
      // hp tick
      const hw = e.r * 1.6, ratio = Math.max(0, e.hp / e.max)
      ctx.globalAlpha = 1
      ctx.strokeStyle = ink
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(-hw, -e.r - 8); ctx.lineTo(hw, -e.r - 8); ctx.stroke()
      ctx.strokeStyle = '#c1121f'
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(-hw, -e.r - 8); ctx.lineTo(-hw + hw * 2 * ratio, -e.r - 8); ctx.stroke()
      ctx.restore()
    }
    function draw() {
      // paper
      PF.sky(ctx, W, H, '#efe6d4', '#e8dcc4', '#d9cbb0')
      // ruled lines
      ctx.strokeStyle = 'rgba(90, 140, 200, 0.22)'
      ctx.lineWidth = 1
      const lineGap = 22
      for (let y = 40; y < H - barH; y += lineGap) {
        ctx.beginPath()
        ctx.moveTo(16, y + wob(y, 0.6))
        ctx.lineTo(W - 16, y + wob(y + 3, 0.6))
        ctx.stroke()
      }
      // margin
      ctx.strokeStyle = 'rgba(200, 80, 80, 0.28)'
      ctx.beginPath()
      ctx.moveTo(W * 0.08, 20)
      ctx.lineTo(W * 0.08 + wob(2, 3), H - barH - 8)
      ctx.stroke()
      // coffee ring doodle
      ctx.strokeStyle = 'rgba(120, 80, 40, 0.12)'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(W * 0.82, H * 0.16, 28, 0.2, Math.PI * 1.7)
      ctx.stroke()
      // path
      ctx.setLineDash([7, 6])
      for (let i = 0; i < path.length - 1; i++) sketchLine(path[i], path[i + 1], 3.2)
      ctx.setLineDash([])
      // start / end labels
      ctx.fillStyle = ink
      ctx.font = '700 12px "Comic Sans MS", "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('IN', path[0].x, path[0].y - 14)
      ctx.fillText('OUT', path[path.length - 1].x, path[path.length - 1].y + 18)
      // pads
      for (const p of pads) {
        if (p.tower) continue
        ctx.globalAlpha = 0.55
        sketchCircle(p.x, p.y, p.r, 'rgba(255,255,255,0.4)')
        ctx.globalAlpha = 1
        ctx.fillStyle = 'rgba(44,36,22,0.35)'
        ctx.font = '700 11px "Segoe UI", sans-serif'
        ctx.fillText('+', p.x, p.y + 4)
      }
      // range ghost for selected kind over empty pads when affordable
      const kSel = KINDS[sel]
      if (gold >= kSel.cost) {
        ctx.strokeStyle = kSel.color
        ctx.globalAlpha = 0.12
        ctx.lineWidth = 2
        for (const p of pads) {
          if (p.tower) continue
          ctx.beginPath(); ctx.arc(p.x, p.y, kSel.range, 0, Math.PI * 2); ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      for (const t of towers) drawTower(t)
      for (const e of enemies) drawEnemy(e)
      for (const s of shots) {
        ctx.fillStyle = s.color
        ctx.strokeStyle = ink
        ctx.lineWidth = 1.5
        ctx.beginPath()
        if (s.kind === 2) {
          ctx.arc(s.x, s.y, 6, 0, Math.PI * 2)
        } else {
          ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2)
        }
        ctx.fill(); ctx.stroke()
      }
      for (const p of puffs) {
        ctx.globalAlpha = Math.max(0, p.life / p.max)
        ctx.fillStyle = p.c
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      // HUD ink strip
      ctx.fillStyle = ink
      ctx.font = '700 15px "Comic Sans MS", "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('♥ ' + lives + '   ✎ ' + gold + 'g   wave ' + Math.max(1, wave), 14, 28)
      // toolbar
      ctx.fillStyle = 'rgba(44,36,22,0.08)'
      ctx.fillRect(0, H - barH, W, barH)
      ctx.strokeStyle = ink
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(8, H - barH + 2)
      ctx.lineTo(W - 8, H - barH + wob(5, 2))
      ctx.stroke()
      const slotW = W / 3
      for (let i = 0; i < 3; i++) {
        const k = KINDS[i]
        const cx = slotW * (i + 0.5)
        const cy = H - barH * 0.52
        const on = sel === i
        if (on) {
          ctx.strokeStyle = k.color
          ctx.lineWidth = 3
          sketchCircle(cx, cy - 6, 28, 'rgba(255,255,255,0.5)')
        }
        // mini icon
        const fake = { x: cx, y: cy - 8, kind: i, angle: -0.5 }
        drawTower(fake)
        ctx.fillStyle = gold >= k.cost ? ink : 'rgba(44,36,22,0.35)'
        ctx.font = '700 12px "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(k.name + ' ' + k.cost + 'g', cx, H - 12)
      }
      ctx.textAlign = 'left'
    }
    function pointer(e) {
      if (GS.paused || lives <= 0) return
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      if (y >= H - barH) {
        sel = Math.min(2, Math.max(0, (x / W * 3) | 0))
        return
      }
      let best = null, bd = 36
      for (const p of pads) {
        const d = Math.hypot(p.x - x, p.y - y)
        if (d < bd) { bd = d; best = p }
      }
      if (!best || best.tower) return
      const k = KINDS[sel]
      if (gold < k.cost) return
      gold -= k.cost
      const t = { x: best.x, y: best.y, kind: sel, cd: 0.15, angle: -0.5 }
      best.tower = t
      towers.push(t)
      addPuff(t.x, t.y, k.color, 8)
    }
    addEventListener('pointerdown', pointer)
    reset()
`,
  },

  storymole: {
    title: 'Storybook Moles',
    tip: 'Whack 10 moles. Average ms is your score!',
    bg: '#8ecae6',
    accent: '#e76f51',
    body: `
    const NEED = 10
    let holes = [], active = -1, hideT = 0, gapT = 0, hits = 0
    let running = false, done = false, startAt = 0, avgMs = 0
    let ox = 0, oy = 0, cell = 0, gap = 14, cols = 3, rows = 3
    let pop = 0, sparkles = []
    function layout() {
      const pad = 20
      const side = Math.min(W - pad * 2, H * 0.56)
      gap = Math.max(10, side * 0.04)
      cell = (side - gap * (cols - 1)) / cols
      ox = (W - side) * 0.5
      oy = H * 0.26
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
    function diePos() {
      if (active >= 0) {
        const h = holes[active]
        return [h.x + h.w * 0.5, h.y + h.h * 0.45]
      }
      return [W * 0.5, oy + cell * 1.5]
    }
    function scorePos() { return diePos() }
    function spawn() {
      let next = (Math.random() * holes.length) | 0
      if (holes.length > 1 && next === active) next = (next + 1 + ((Math.random() * (holes.length - 1)) | 0)) % holes.length
      active = next
      // Stay long enough to be fair; slightly snappier as you near 10
      hideT = Math.max(0.55, 1.15 - hits * 0.04)
      gapT = 0
      pop = 1
      if (!startAt) startAt = performance.now()
    }
    function reset() {
      layout()
      active = -1
      hideT = 0
      gapT = 0.35
      hits = 0
      running = true
      done = false
      startAt = 0
      avgMs = 0
      sparkles = []
      pop = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function finish() {
      if (done || !running) return
      done = true
      running = false
      active = -1
      avgMs = Math.max(1, Math.round((performance.now() - startAt) / NEED))
      setScore(avgMs)
      try { parent.postMessage({ type: 'gamescroll:score', score: avgMs }, '*') } catch (e) {}
      die()
    }
    function tick(dt) {
      if (!running || GS.paused || done) return
      if (pop > 0) pop = Math.max(0, pop - dt * 4)
      for (const s of sparkles) s.life -= dt
      sparkles = sparkles.filter(s => s.life > 0)
      if (gapT > 0) {
        gapT -= dt
        if (gapT <= 0) spawn()
        return
      }
      hideT -= dt
      if (hideT <= 0 && active >= 0) {
        active = -1
        gapT = 0.18 + Math.random() * 0.12
      }
    }
    function flower(x, y, r, petal, center) {
      ctx.save()
      ctx.translate(x, y)
      for (let i = 0; i < 5; i++) {
        const a = i * (Math.PI * 2 / 5) - 0.4
        ctx.fillStyle = petal
        ctx.beginPath()
        ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, r * 0.28, a, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = center
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    function drawMole(cx, cy, r, squash) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1 + (1 - squash) * 0.15, squash)
      // soft shadow in hole
      ctx.fillStyle = 'rgba(60, 40, 30, 0.2)'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.85, r * 0.7, r * 0.22, 0, 0, Math.PI * 2)
      ctx.fill()
      PF.buddy(ctx, 0, 0, r, '#c4a484', '#8d6e4c', {
        lookY: -0.25, blush: true, stretch: 1.05,
      })
      // little snout
      ctx.fillStyle = '#f1d6c0'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.22, r * 0.28, r * 0.18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#5c4030'
      ctx.beginPath()
      ctx.arc(0, r * 0.18, r * 0.08, 0, Math.PI * 2)
      ctx.fill()
      // whiskers
      ctx.strokeStyle = 'rgba(60,40,30,0.45)'
      ctx.lineWidth = Math.max(1, r * 0.06)
      ctx.beginPath()
      ctx.moveTo(-r * 0.15, r * 0.22); ctx.lineTo(-r * 0.55, r * 0.12)
      ctx.moveTo(-r * 0.15, r * 0.28); ctx.lineTo(-r * 0.55, r * 0.32)
      ctx.moveTo(r * 0.15, r * 0.22); ctx.lineTo(r * 0.55, r * 0.12)
      ctx.moveTo(r * 0.15, r * 0.28); ctx.lineTo(r * 0.55, r * 0.32)
      ctx.stroke()
      ctx.restore()
    }
    function draw() {
      // storybook sky wash
      PF.sky(ctx, W, H, '#bde0fe', '#8ecae6', '#fef6e4')
      // soft cloud blobs
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 0.28 + 0.08) * W + Math.sin(PF.t * 0.15 + i) * 8)
        const cy = H * (0.08 + (i % 2) * 0.05)
        ctx.beginPath()
        ctx.ellipse(cx, cy, 36 + i * 6, 16 + (i % 2) * 4, 0, 0, Math.PI * 2)
        ctx.ellipse(cx - 22, cy + 4, 22, 12, 0, 0, Math.PI * 2)
        ctx.ellipse(cx + 24, cy + 2, 20, 11, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      // rolling hills
      ctx.fillStyle = '#95d5b2'
      ctx.beginPath()
      ctx.moveTo(0, H * 0.42)
      ctx.quadraticCurveTo(W * 0.25, H * 0.34, W * 0.5, H * 0.4)
      ctx.quadraticCurveTo(W * 0.75, H * 0.46, W, H * 0.38)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.fill()
      ctx.fillStyle = '#74c69d'
      ctx.beginPath()
      ctx.moveTo(0, H * 0.55)
      ctx.quadraticCurveTo(W * 0.3, H * 0.48, W * 0.55, H * 0.56)
      ctx.quadraticCurveTo(W * 0.8, H * 0.62, W, H * 0.52)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.fill()
      // meadow flowers
      flower(W * 0.12, H * 0.48, 10, '#f4a261', '#ffe66d')
      flower(W * 0.88, H * 0.5, 9, '#ef476f', '#ffe66d')
      flower(W * 0.22, H * 0.72, 8, '#ffd6a5', '#e76f51')
      flower(W * 0.78, H * 0.7, 11, '#90be6d', '#ffe66d')
      // title banner
      ctx.fillStyle = 'rgba(254, 246, 228, 0.85)'
      PF.rr(ctx, W * 0.14, H * 0.06, W * 0.72, Math.max(36, H * 0.07), 14)
      ctx.fill()
      ctx.strokeStyle = 'rgba(231, 111, 81, 0.45)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#3d405b'
      ctx.font = '700 ' + Math.floor(Math.min(22, W * 0.045)) + 'px "Georgia", "Palatino Linotype", serif'
      ctx.textAlign = 'center'
      ctx.fillText('Ten little moles!', W * 0.5, H * 0.06 + Math.max(24, H * 0.045))
      for (let i = 0; i < holes.length; i++) {
        const h = holes[i]
        const cx = h.x + h.w * 0.5
        const cy = h.y + h.h * 0.62
        // grassy mound
        ctx.fillStyle = '#40916c'
        ctx.beginPath()
        ctx.ellipse(cx, cy + h.h * 0.08, h.w * 0.42, h.h * 0.18, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#2d6a4f'
        ctx.beginPath()
        ctx.ellipse(cx, cy + h.h * 0.05, h.w * 0.28, h.h * 0.1, 0, 0, Math.PI * 2)
        ctx.fill()
        // hole
        ctx.fillStyle = '#1b4332'
        ctx.beginPath()
        ctx.ellipse(cx, cy, h.w * 0.26, h.h * 0.12, 0, 0, Math.PI * 2)
        ctx.fill()
        if (i === active) {
          const sq = 0.75 + (1 - pop) * 0.25
          drawMole(cx, cy - h.h * 0.12, h.w * 0.22, sq)
        }
      }
      for (const s of sparkles) {
        ctx.globalAlpha = Math.max(0, s.life / s.max)
        ctx.fillStyle = s.c
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      // progress + live average
      ctx.textAlign = 'left'
      ctx.fillStyle = '#3d405b'
      ctx.font = '700 15px "Georgia", "Palatino Linotype", serif'
      const live = hits > 0 && startAt
        ? Math.round((performance.now() - startAt) / Math.max(1, hits))
        : 0
      ctx.fillText(hits + ' / ' + NEED, 14, 28)
      if (live > 0) {
        ctx.fillStyle = 'rgba(61,64,91,0.75)'
        ctx.fillText('avg ' + live + ' ms', 14, 48)
      }
      ctx.textAlign = 'left'
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || !running || done || active < 0) return
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const h = holes[active]
      const cx = h.x + h.w * 0.5
      const cy = h.y + h.h * 0.5
      if (Math.hypot(x - cx, y - cy) > h.w * 0.48) return
      hits++
      if (window.Juice) Juice.burst(cx, cy - h.h * 0.1)
      for (let i = 0; i < 8; i++) {
        sparkles.push({
          x: cx + (Math.random() - 0.5) * 30,
          y: cy + (Math.random() - 0.5) * 24,
          r: 2 + Math.random() * 3,
          life: 0.35 + Math.random() * 0.2,
          max: 0.5,
          c: i % 2 ? '#ffe66d' : '#ef476f',
        })
      }
      active = -1
      if (hits >= NEED) {
        finish()
        return
      }
      gapT = 0.12
    })
    reset()
`,
  },
}
