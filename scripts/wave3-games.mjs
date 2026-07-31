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
    function leaf(x, y, s, rot) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot || 0)
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.ellipse(0, 0, s * 0.55, s * 0.28, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#166534'
      ctx.lineWidth = Math.max(1, s * 0.08)
      ctx.beginPath(); ctx.moveTo(-s * 0.4, 0); ctx.lineTo(s * 0.4, 0); ctx.stroke()
      ctx.restore()
    }
    function bodyGrad(t, r) {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.08, 0, 0, r)
      g.addColorStop(0, t.accent)
      g.addColorStop(0.5, t.color)
      g.addColorStop(1, t.shade)
      return g
    }
    function drawVeggie(x, y, tier, ang) {
      const t = TIERS[tier], r = tierR(tier), kind = t.kind
      ctx.save()
      ctx.translate(x, y)
      if (ang) ctx.rotate(ang)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.88, r * 0.82, r * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      if (kind === 'carrot') {
        ctx.fillStyle = bodyGrad(t, r)
        ctx.beginPath()
        ctx.moveTo(0, -r * 0.95)
        ctx.lineTo(r * 0.55, -r * 0.2)
        ctx.lineTo(r * 0.28, r * 0.95)
        ctx.lineTo(-r * 0.28, r * 0.95)
        ctx.lineTo(-r * 0.55, -r * 0.2)
        ctx.closePath()
        ctx.fill()
        leaf(0, -r * 0.95, r * 0.7, -0.5)
        leaf(0, -r * 1.05, r * 0.55, 0.2)
        leaf(0, -r * 0.9, r * 0.5, 0.7)
      } else if (kind === 'corn') {
        ctx.fillStyle = bodyGrad(t, r)
        ctx.beginPath()
        ctx.ellipse(0, 0, r * 0.55, r, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        for (let row = -3; row <= 3; row++) {
          for (let col = -1; col <= 1; col++) {
            ctx.beginPath()
            ctx.arc(col * r * 0.28, row * r * 0.22, r * 0.1, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        leaf(-r * 0.45, -r * 0.2, r * 0.7, -1.1)
        leaf(r * 0.45, -r * 0.15, r * 0.65, 1.1)
      } else if (kind === 'eggplant') {
        ctx.fillStyle = bodyGrad(t, r)
        ctx.beginPath()
        ctx.ellipse(0, r * 0.1, r * 0.72, r * 0.92, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#166534'
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.75, r * 0.35, r * 0.22, 0, 0, Math.PI * 2)
        ctx.fill()
        leaf(0, -r * 0.95, r * 0.45, 0.3)
      } else if (kind === 'pumpkin') {
        ctx.fillStyle = bodyGrad(t, r)
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = t.shade
        ctx.lineWidth = Math.max(2, r * 0.06)
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath()
          ctx.moveTo(i * r * 0.28, -r * 0.85)
          ctx.quadraticCurveTo(i * r * 0.35, 0, i * r * 0.28, r * 0.85)
          ctx.stroke()
        }
        ctx.fillStyle = '#166534'
        PF.rr(ctx, -r * 0.12, -r * 1.05, r * 0.24, r * 0.28, 4)
        ctx.fill()
        leaf(-r * 0.35, -r * 0.9, r * 0.4, -0.8)
      } else if (kind === 'cabbage') {
        ctx.fillStyle = t.shade
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = bodyGrad(t, r)
        ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.1, r * 0.78, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill()
      } else if (kind === 'onion') {
        ctx.fillStyle = bodyGrad(t, r)
        ctx.beginPath()
        ctx.ellipse(0, r * 0.08, r * 0.85, r * 0.9, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(126,34,206,0.35)'
        ctx.lineWidth = Math.max(1.5, r * 0.05)
        ctx.beginPath(); ctx.ellipse(0, r * 0.08, r * 0.55, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = '#86efac'
        ctx.beginPath()
        ctx.moveTo(-r * 0.15, -r * 0.75)
        ctx.lineTo(0, -r * 1.15)
        ctx.lineTo(r * 0.15, -r * 0.75)
        ctx.fill()
      } else if (kind === 'potato') {
        ctx.fillStyle = bodyGrad(t, r)
        ctx.beginPath()
        ctx.ellipse(0, 0, r * 1.05, r * 0.78, 0.35, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = t.shade
        for (const spot of [[-0.35, -0.15], [0.25, 0.1], [0.05, -0.35], [-0.1, 0.3]]) {
          ctx.beginPath()
          ctx.arc(spot[0] * r, spot[1] * r, r * 0.08, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (kind === 'radish') {
        ctx.fillStyle = bodyGrad(t, r)
        ctx.beginPath()
        ctx.ellipse(0, r * 0.15, r * 0.75, r * 0.85, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.beginPath()
        ctx.ellipse(0, r * 0.55, r * 0.55, r * 0.35, 0, 0, Math.PI * 2)
        ctx.fill()
        leaf(-r * 0.2, -r * 0.85, r * 0.55, -0.6)
        leaf(r * 0.15, -r * 0.9, r * 0.5, 0.5)
      } else {
        // tomato (default)
        ctx.fillStyle = bodyGrad(t, r)
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#166534'
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.7, r * 0.28, r * 0.16, 0, 0, Math.PI * 2)
        ctx.fill()
        leaf(-r * 0.25, -r * 0.85, r * 0.4, -0.7)
        leaf(r * 0.2, -r * 0.8, r * 0.35, 0.6)
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.beginPath(); ctx.ellipse(-r * 0.28, -r * 0.25, r * 0.22, r * 0.14, -0.4, 0, Math.PI * 2); ctx.fill()
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
}
