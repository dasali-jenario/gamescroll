/**
 * Mechanics adapted from apratico/insertcoin (MIT) — see THIRD_PARTY_NOTICES.
 * Wave 2 official GameScroll bodies (portrait feed puzzles).
 */
export const wave2Games = {
  tilemerge: {
    title: 'Tile Merge',
    tip: 'Swipe to slide. Merge equals.',
    bg: '#1a1a2e',
    accent: '#e94560',
    body: `
    let grid = [], ox = 0, oy = 0, cell = 0, gap = 8, lock = 0
    let sx = 0, sy = 0, dragging = false
    const N = 4
    const COLORS = {
      0: '#2a2a40', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
      32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
      512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
    }
    function layout() {
      const pad = 18
      const side = Math.min(W - pad * 2, H * 0.62)
      cell = (side - gap * (N + 1)) / N
      ox = (W - side) * 0.5
      oy = H * 0.22
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, oy + cell * 2] }
    function scorePos() { return diePos() }
    function emptyCells() {
      const out = []
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) out.push([r, c])
      return out
    }
    function spawn() {
      const e = emptyCells()
      if (!e.length) return
      const [r, c] = e[(Math.random() * e.length) | 0]
      grid[r][c] = Math.random() < 0.9 ? 2 : 4
    }
    function slideRow(row) {
      const vals = row.filter(v => v)
      let gained = 0
      const out = []
      for (let i = 0; i < vals.length; i++) {
        if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
          const m = vals[i] * 2
          out.push(m)
          gained += m
          i++
        } else out.push(vals[i])
      }
      while (out.length < N) out.push(0)
      return { row: out, gained }
    }
    function rotate(g) {
      const n = Array.from({ length: N }, () => Array(N).fill(0))
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) n[c][N - 1 - r] = g[r][c]
      return n
    }
    function move(dir) {
      // 0 L, 1 U, 2 R, 3 D — clockwise turns so the target edge becomes left
      const turns = [0, 3, 2, 1][dir]
      let g = grid.map(r => r.slice())
      for (let i = 0; i < turns; i++) g = rotate(g)
      let gained = 0, changed = false
      for (let r = 0; r < N; r++) {
        const before = g[r].join(',')
        const res = slideRow(g[r])
        g[r] = res.row
        gained += res.gained
        if (g[r].join(',') !== before) changed = true
      }
      for (let i = 0; i < (4 - turns) % 4; i++) g = rotate(g)
      if (!changed) return false
      grid = g
      if (gained) bump(gained)
      spawn()
      if (!canMove()) die()
      return true
    }
    function canMove() {
      if (emptyCells().length) return true
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = grid[r][c]
        if (c + 1 < N && grid[r][c + 1] === v) return true
        if (r + 1 < N && grid[r + 1][c] === v) return true
      }
      return false
    }
    function reset() {
      layout()
      grid = Array.from({ length: N }, () => Array(N).fill(0))
      lock = 0
      setScore(0)
      spawn(); spawn()
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) { lock = Math.max(0, lock - dt) }
    function draw() {
      PF.sky(ctx, W, H, '#0f0f1a', '#1a1a2e', '#2d2d44')
      PF.dots(ctx, W, H, '#e94560', 12, 0.4)
      const side = cell * N + gap * (N + 1)
      PF.block(ctx, ox, oy, side, side, '#16162a', '#0c0c18', 14)
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = grid[r][c]
        const x = ox + gap + c * (cell + gap)
        const y = oy + gap + r * (cell + gap)
        PF.block(ctx, x, y, cell, cell, COLORS[v] || '#3c3a32', '#222', 8)
        if (v) {
          // Dark on cream/gold tiles; white on orange — classic 2048 contrast.
          ctx.fillStyle = (v <= 4 || v >= 128) ? '#1a1a2e' : '#ffffff'
          ctx.font = '800 ' + Math.floor(cell * (v >= 1000 ? 0.32 : 0.4)) + 'px "Segoe UI", sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(v), x + cell * 0.5, y + cell * 0.52)
        }
      }
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }
    function trySwipe(dx, dy) {
      if (GS.paused || lock > 0) return
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return
      lock = 0.12
      if (Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 0 : 2)
      else move(dy < 0 ? 1 : 3)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      dragging = true
      sx = e.clientX; sy = e.clientY
    })
    addEventListener('pointerup', e => {
      if (!dragging) return
      dragging = false
      trySwipe(e.clientX - sx, e.clientY - sy)
    })
    addEventListener('pointercancel', () => { dragging = false })
    addEventListener('keydown', e => {
      if (GS.paused || lock > 0) return
      const map = { ArrowLeft: 0, a: 0, ArrowUp: 1, w: 1, ArrowRight: 2, d: 2, ArrowDown: 3, s: 3 }
      if (map[e.key] == null) return
      lock = 0.12
      move(map[e.key])
    })
    reset()
`,
  },

  minesweep: {
    title: 'Mine Sweep',
    tip: 'Tap dig. Long-press to flag.',
    bg: '#1b2838',
    accent: '#66c0f4',
    body: `
    let cols = 9, rows = 9, mines = 10
    let board = [], revealed = [], flagged = [], ox = 0, oy = 0, cell = 0
    let ready = false, boom = false, won = false, holdT = 0, holdCell = null, pressId = 0
    function layout() {
      const pad = 16
      cell = Math.floor(Math.min((W - pad * 2) / cols, (H * 0.7) / rows))
      ox = (W - cell * cols) * 0.5
      oy = H * 0.18
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, oy + cell * rows * 0.5] }
    function scorePos() { return diePos() }
    function idx(r, c) { return r * cols + c }
    function neighbors(r, c) {
      const out = []
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue
        const rr = r + dr, cc = c + dc
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push([rr, cc])
      }
      return out
    }
    function placeMines(sr, sc) {
      board = Array(rows * cols).fill(0)
      let left = mines
      while (left > 0) {
        const r = (Math.random() * rows) | 0
        const c = (Math.random() * cols) | 0
        if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1) continue
        const i = idx(r, c)
        if (board[i] === -1) continue
        board[i] = -1
        left--
      }
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (board[idx(r, c)] === -1) continue
        board[idx(r, c)] = neighbors(r, c).filter(([rr, cc]) => board[idx(rr, cc)] === -1).length
      }
      ready = true
    }
    function flood(r, c) {
      const stack = [[r, c]]
      while (stack.length) {
        const [rr, cc] = stack.pop()
        const i = idx(rr, cc)
        if (revealed[i] || flagged[i]) continue
        revealed[i] = true
        if (board[i] === 0) {
          for (const n of neighbors(rr, cc)) stack.push(n)
        }
      }
    }
    function checkWin() {
      let hidden = 0
      for (let i = 0; i < board.length; i++) if (!revealed[i]) hidden++
      if (hidden === mines) {
        won = true
        bump(250)
        if (window.Juice) Juice.burst(W * 0.5, oy + cell * rows * 0.5)
        die()
      }
    }
    function reset() {
      layout()
      board = Array(rows * cols).fill(0)
      revealed = Array(rows * cols).fill(false)
      flagged = Array(rows * cols).fill(false)
      ready = false; boom = false; won = false
      holdT = 0; holdCell = null
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      if (!holdCell || GS.paused) return
      holdT += dt
      if (holdT >= 0.45) {
        const [r, c] = holdCell
        const i = idx(r, c)
        if (!revealed[i]) {
          flagged[i] = !flagged[i]
          if (window.Juice) Juice.burst(ox + (c + 0.5) * cell, oy + (r + 0.5) * cell)
        }
        holdCell = null
        holdT = 0
        pressId++
      }
    }
    function cellAt(e) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const c = Math.floor((x - ox) / cell)
      const r = Math.floor((y - oy) / cell)
      if (r < 0 || c < 0 || r >= rows || c >= cols) return null
      return [r, c]
    }
    function dig(r, c) {
      if (flagged[idx(r, c)]) return
      if (!ready) placeMines(r, c)
      const i = idx(r, c)
      if (revealed[i]) return
      if (board[i] === -1) {
        boom = true
        revealed[i] = true
        die()
        return
      }
      flood(r, c)
      bump(1)
      checkWin()
    }
    function draw() {
      PF.sky(ctx, W, H, '#0b1520', '#1b2838', '#2a475e')
      PF.dots(ctx, W, H, '#66c0f4', 14, 0.35)
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = idx(r, c)
        const x = ox + c * cell, y = oy + r * cell
        if (revealed[i]) {
          PF.block(ctx, x + 1, y + 1, cell - 2, cell - 2, '#c7d5e0', '#8b9bb4', 4)
          if (board[i] === -1) {
            ctx.fillStyle = '#e74c3c'
            ctx.beginPath()
            ctx.arc(x + cell * 0.5, y + cell * 0.5, cell * 0.22, 0, Math.PI * 2)
            ctx.fill()
          } else if (board[i] > 0) {
            const colsN = ['#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c', '#34495e', '#e67e22']
            ctx.fillStyle = colsN[board[i] - 1]
            ctx.font = '800 ' + Math.floor(cell * 0.45) + 'px "Segoe UI", sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(String(board[i]), x + cell * 0.5, y + cell * 0.52)
          }
        } else {
          PF.block(ctx, x + 1, y + 1, cell - 2, cell - 2, '#4a6a8a', '#2a475e', 4)
          if (flagged[i]) {
            ctx.fillStyle = '#e74c3c'
            ctx.font = '800 ' + Math.floor(cell * 0.4) + 'px "Segoe UI", sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('▲', x + cell * 0.5, y + cell * 0.52)
          }
        }
      }
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '700 13px "Segoe UI", sans-serif'
      ctx.fillText('Flags ' + flagged.filter(Boolean).length + '/' + mines, 14, 28)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || boom || won) return
      const cellHit = cellAt(e)
      if (!cellHit) return
      holdCell = cellHit
      holdT = 0
      pressId++
      const my = pressId
      // short tap digs on pointerup if hold didn't flag
      const up = (ev) => {
        removeEventListener('pointerup', up)
        removeEventListener('pointercancel', up)
        if (my !== pressId) return
        if (holdCell) {
          dig(holdCell[0], holdCell[1])
          holdCell = null
          holdT = 0
        }
      }
      addEventListener('pointerup', up)
      addEventListener('pointercancel', up)
    })
    reset()
`,
  },

  memmatch: {
    title: 'Memory Match',
    tip: 'Tap two cards. Match the pairs.',
    bg: '#2d1b4e',
    accent: '#ff6bcb',
    body: `
    let cols = 4, rows = 4, cards = [], ox = 0, oy = 0, cw = 0, ch = 0, gap = 8
    let open = [], lock = 0, matched = 0, moves = 0
    const FACES = [
      { c: '#ff6bcb', s: '◆' }, { c: '#6bcbff', s: '●' }, { c: '#ffe66d', s: '★' }, { c: '#95e1a3', s: '▲' },
      { c: '#ff8e72', s: '■' }, { c: '#c9a0ff', s: '✚' }, { c: '#7bed9f', s: '◉' }, { c: '#70a1ff', s: '✦' },
    ]
    function layout() {
      const pad = 16
      const side = Math.min(W - pad * 2, H * 0.7)
      gap = 8
      cw = (side - gap * (cols + 1)) / cols
      ch = (side - gap * (rows + 1)) / rows
      ox = (W - (cw * cols + gap * (cols + 1))) * 0.5
      oy = H * 0.16
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, oy + ch * 2] }
    function scorePos() { return diePos() }
    function shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0
        const t = a[i]; a[i] = a[j]; a[j] = t
      }
      return a
    }
    function reset() {
      layout()
      const deck = []
      for (let i = 0; i < 8; i++) {
        deck.push({ face: i, open: false, done: false })
        deck.push({ face: i, open: false, done: false })
      }
      cards = shuffle(deck)
      open = []; lock = 0; matched = 0; moves = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      if (lock <= 0) return
      lock -= dt
      if (lock > 0) return
      for (const i of open) {
        if (!cards[i].done) cards[i].open = false
      }
      open = []
    }
    function cardAt(e) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      for (let i = 0; i < cards.length; i++) {
        const r = (i / cols) | 0, c = i % cols
        const cx = ox + gap + c * (cw + gap)
        const cy = oy + gap + r * (ch + gap)
        if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) return i
      }
      return -1
    }
    function draw() {
      PF.sky(ctx, W, H, '#1a0f2e', '#2d1b4e', '#4a2c7a')
      PF.dots(ctx, W, H, '#ff6bcb', 16, 0.4)
      for (let i = 0; i < cards.length; i++) {
        const r = (i / cols) | 0, c = i % cols
        const x = ox + gap + c * (cw + gap)
        const y = oy + gap + r * (ch + gap)
        const card = cards[i]
        if (card.done || card.open) {
          const f = FACES[card.face]
          PF.block(ctx, x, y, cw, ch, f.c, '#222', 10)
          ctx.fillStyle = '#fff'
          ctx.font = '800 ' + Math.floor(Math.min(cw, ch) * 0.42) + 'px "Segoe UI", sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(f.s, x + cw * 0.5, y + ch * 0.52)
        } else {
          PF.block(ctx, x, y, cw, ch, '#5a3d8a', '#3a2460', 10)
          ctx.fillStyle = 'rgba(255,255,255,0.35)'
          ctx.font = '800 ' + Math.floor(Math.min(cw, ch) * 0.35) + 'px "Segoe UI", sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('?', x + cw * 0.5, y + ch * 0.52)
        }
      }
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || lock > 0) return
      const i = cardAt(e)
      if (i < 0) return
      const card = cards[i]
      if (card.open || card.done) return
      card.open = true
      open.push(i)
      if (open.length < 2) return
      moves++
      const a = cards[open[0]], b = cards[open[1]]
      if (a.face === b.face) {
        a.done = b.done = true
        matched++
        bump(10)
        if (window.Juice) Juice.burst(W * 0.5, oy + ch * 2)
        open = []
        if (matched >= 8) {
          bump(Math.max(20, 120 - moves * 2))
          die()
        }
      } else {
        lock = 0.7
      }
    })
    reset()
`,
  },

  slide15: {
    title: 'Slide Fifteen',
    tip: 'Tap a tile beside the gap.',
    bg: '#0f3460',
    accent: '#e94560',
    body: `
    let tiles = [], ox = 0, oy = 0, cell = 0, gap = 6, empty = 15, moves = 0
    const N = 4
    function layout() {
      const pad = 18
      const side = Math.min(W - pad * 2, H * 0.62)
      cell = (side - gap * (N + 1)) / N
      ox = (W - side) * 0.5
      oy = H * 0.2
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, oy + cell * 2] }
    function scorePos() { return diePos() }
    function solved() {
      for (let i = 0; i < 15; i++) if (tiles[i] !== i + 1) return false
      return tiles[15] === 0
    }
    function scramble() {
      tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]
      empty = 15
      for (let i = 0; i < 100; i++) {
        const er = (empty / N) | 0, ec = empty % N
        const opts = []
        if (er > 0) opts.push(empty - N)
        if (er < N - 1) opts.push(empty + N)
        if (ec > 0) opts.push(empty - 1)
        if (ec < N - 1) opts.push(empty + 1)
        const j = opts[(Math.random() * opts.length) | 0]
        tiles[empty] = tiles[j]
        tiles[j] = 0
        empty = j
      }
    }
    function reset() {
      layout()
      scramble()
      moves = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick() {}
    function draw() {
      PF.sky(ctx, W, H, '#071428', '#0f3460', '#1a5276')
      PF.dots(ctx, W, H, '#e94560', 12, 0.35)
      const side = cell * N + gap * (N + 1)
      PF.block(ctx, ox, oy, side, side, '#0a2744', '#061828', 12)
      for (let i = 0; i < 16; i++) {
        const v = tiles[i]
        if (!v) continue
        const r = (i / N) | 0, c = i % N
        const x = ox + gap + c * (cell + gap)
        const y = oy + gap + r * (cell + gap)
        PF.block(ctx, x, y, cell, cell, '#e94560', '#a12a40', 10)
        ctx.fillStyle = '#fff'
        ctx.font = '800 ' + Math.floor(cell * 0.4) + 'px "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(v), x + cell * 0.5, y + cell * 0.52)
      }
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '700 13px "Segoe UI", sans-serif'
      ctx.fillText('Moves ' + moves, 14, 28)
    }
    function tryMove(i) {
      const er = (empty / N) | 0, ec = empty % N
      const r = (i / N) | 0, c = i % N
      if (Math.abs(er - r) + Math.abs(ec - c) !== 1) return
      tiles[empty] = tiles[i]
      tiles[i] = 0
      empty = i
      moves++
      bump(1)
      if (solved()) {
        bump(Math.max(30, 200 - moves))
        if (window.Juice) Juice.burst(W * 0.5, oy + cell * 2)
        die()
      }
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      for (let i = 0; i < 16; i++) {
        if (!tiles[i]) continue
        const r = (i / N) | 0, c = i % N
        const tx = ox + gap + c * (cell + gap)
        const ty = oy + gap + r * (cell + gap)
        if (x >= tx && x <= tx + cell && y >= ty && y <= ty + cell) {
          tryMove(i)
          return
        }
      }
    })
    reset()
`,
  },

  gemcascade: {
    title: 'Gem Cascade',
    tip: 'Swap neighbors. Match 3+. Beat the clock.',
    bg: '#1a0a2e',
    accent: '#ff44aa',
    body: `
    let N = 8, grid = [], ox = 0, oy = 0, cell = 0, gap = 3
    let sel = null, busy = false, timeLeft = 60, cascade = 0
    const COLORS = ['#ff4455', '#44aaff', '#ffcc33', '#44dd88', '#cc66ff', '#ff8844']
    function layout() {
      const pad = 14
      const side = Math.min(W - pad * 2, H * 0.68)
      cell = (side - gap * (N + 1)) / N
      ox = (W - side) * 0.5
      oy = H * 0.14
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, oy + cell * 4] }
    function scorePos() { return diePos() }
    function randGem() { return (Math.random() * COLORS.length) | 0 }
    function fillNoMatches() {
      grid = Array.from({ length: N }, () => Array(N).fill(0))
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        let g, guard = 0
        do {
          g = randGem()
          guard++
        } while (guard < 20 && (
          (c >= 2 && grid[r][c - 1] === g && grid[r][c - 2] === g) ||
          (r >= 2 && grid[r - 1][c] === g && grid[r - 2][c] === g)
        ))
        grid[r][c] = g
      }
    }
    function findMatches() {
      const mark = Array.from({ length: N }, () => Array(N).fill(false))
      let any = false
      for (let r = 0; r < N; r++) {
        let run = 1
        for (let c = 1; c <= N; c++) {
          if (c < N && grid[r][c] === grid[r][c - 1]) run++
          else {
            if (run >= 3) { any = true; for (let k = 0; k < run; k++) mark[r][c - 1 - k] = true }
            run = 1
          }
        }
      }
      for (let c = 0; c < N; c++) {
        let run = 1
        for (let r = 1; r <= N; r++) {
          if (r < N && grid[r][c] === grid[r - 1][c]) run++
          else {
            if (run >= 3) { any = true; for (let k = 0; k < run; k++) mark[r - 1 - k][c] = true }
            run = 1
          }
        }
      }
      return { mark, any }
    }
    function gravity() {
      for (let c = 0; c < N; c++) {
        let write = N - 1
        for (let r = N - 1; r >= 0; r--) {
          if (grid[r][c] >= 0) {
            grid[write][c] = grid[r][c]
            if (write !== r) grid[r][c] = -1
            write--
          }
        }
        for (let r = write; r >= 0; r--) grid[r][c] = randGem()
      }
    }
    function resolve() {
      cascade = 0
      for (;;) {
        const { mark, any } = findMatches()
        if (!any) break
        cascade++
        let n = 0
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (mark[r][c]) {
          grid[r][c] = -1
          n++
        }
        const mult = cascade === 1 ? 1 : cascade === 2 ? 1.5 : cascade >= 3 ? 2 : 1
        bump(Math.floor(n * 12 * mult))
        if (window.Juice) Juice.burst(W * 0.5, oy + cell * 4)
        gravity()
      }
    }
    function swap(a, b) {
      const t = grid[a[0]][a[1]]
      grid[a[0]][a[1]] = grid[b[0]][b[1]]
      grid[b[0]][b[1]] = t
    }
    function adjacent(a, b) {
      return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1
    }
    function reset() {
      layout()
      fillNoMatches()
      sel = null
      busy = false
      timeLeft = 60
      cascade = 0
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick(dt) {
      if (GS.paused) return
      timeLeft -= dt
      if (timeLeft <= 0) {
        timeLeft = 0
        die()
      }
    }
    function cellAt(e) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const c = Math.floor((x - ox - gap) / (cell + gap))
      const r = Math.floor((y - oy - gap) / (cell + gap))
      if (r < 0 || c < 0 || r >= N || c >= N) return null
      return [r, c]
    }
    function draw() {
      PF.sky(ctx, W, H, '#0c0418', '#1a0a2e', '#3a1060')
      PF.dots(ctx, W, H, '#ff44aa', 14, 0.4)
      const side = cell * N + gap * (N + 1)
      PF.block(ctx, ox, oy, side, side, '#12061f', '#080310', 10)
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g = grid[r][c]
        if (g < 0) continue
        const x = ox + gap + c * (cell + gap)
        const y = oy + gap + r * (cell + gap)
        const selected = sel && sel[0] === r && sel[1] === c
        const rad = selected ? 14 : 8
        ctx.fillStyle = COLORS[g]
        PF.rr(ctx, x, y, cell, cell, rad)
        ctx.fill()
        if (selected) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          PF.rr(ctx, x + 2, y + 2, cell - 4, cell - 4, Math.max(4, rad - 2))
          ctx.stroke()
        }
      }
      ctx.fillStyle = timeLeft < 10 ? '#ff6688' : 'rgba(255,255,255,0.75)'
      ctx.font = '700 14px "Segoe UI", sans-serif'
      ctx.fillText('Time ' + Math.ceil(timeLeft), 14, 28)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused || busy || timeLeft <= 0) return
      const hit = cellAt(e)
      if (!hit) return
      if (!sel) { sel = hit; return }
      if (sel[0] === hit[0] && sel[1] === hit[1]) { sel = null; return }
      if (!adjacent(sel, hit)) { sel = hit; return }
      busy = true
      swap(sel, hit)
      const { any } = findMatches()
      if (!any) {
        swap(sel, hit)
        sel = null
        busy = false
        return
      }
      sel = null
      resolve()
      busy = false
    })
    reset()
`,
  },

  colorflow: {
    title: 'Color Pour',
    tip: 'Tap a tube, then another to pour.',
    bg: '#102a43',
    accent: '#f0b429',
    body: `
    let tubes = [], ox = 0, oy = 0, tw = 0, th = 0, gap = 12, rowGap = 24, cap = 4
    let sel = -1, level = 1, moves = 0
    const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22']
    function layout() {
      const n = tubes.length || 6
      const cols = Math.min(5, n)
      const rows = Math.ceil(n / cols)
      const topSafe = Math.max(64, H * 0.12)
      const bottomSafe = Math.max(28, H * 0.06)
      const availH = Math.max(120, H - topSafe - bottomSafe)
      gap = Math.max(10, Math.min(18, W * 0.035))
      rowGap = Math.max(18, Math.min(28, availH * 0.04))
      const rowBudget = (availH - (rows - 1) * rowGap) / rows
      tw = Math.min(78, (W - 36 - gap * (cols - 1)) / cols)
      th = Math.min(rowBudget, tw * 4.6)
      const totalW = cols * tw + (cols - 1) * gap
      const totalH = rows * th + (rows - 1) * rowGap
      ox = (W - totalW) * 0.5
      oy = topSafe + Math.max(0, (availH - totalH) * 0.5)
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, oy + th * 0.5] }
    function scorePos() { return diePos() }
    function makeLevel(lv) {
      const colors = Math.min(6, 3 + ((lv - 1) / 2 | 0))
      const empties = 2
      const n = colors + empties
      const solved = []
      for (let i = 0; i < colors; i++) solved.push(Array(cap).fill(i))
      for (let i = 0; i < empties; i++) solved.push([])
      // Scramble with reverse pours that ignore color match so tubes mix
      // different colors (still solvable: every state is reachable from solved).
      tubes = solved.map(t => t.slice())
      const scramble = 60 + lv * 14
      for (let s = 0; s < scramble; s++) {
        const from = (Math.random() * n) | 0
        const to = (Math.random() * n) | 0
        if (from === to || !tubes[from].length || tubes[to].length >= cap) continue
        // Avoid trivially undoing a completed mono tube into an empty one.
        if (
          tubes[to].length === 0 &&
          tubes[from].length === cap &&
          tubes[from].every(c => c === tubes[from][0])
        ) continue
        tubes[to].push(tubes[from].pop())
      }
      if (tubes.every(t => !t.length || (t.length === cap && t.every(c => c === t[0])))) {
        // Rare: still sorted — force one mixed pour.
        for (let a = 0; a < n; a++) {
          if (!tubes[a].length) continue
          for (let b = 0; b < n; b++) {
            if (a === b || tubes[b].length >= cap) continue
            if (!tubes[b].length || tubes[b][tubes[b].length - 1] !== tubes[a][tubes[a].length - 1]) {
              tubes[b].push(tubes[a].pop())
              return
            }
          }
        }
      }
    }
    function canPour(a, b) {
      if (a < 0 || b < 0 || a === b) return false
      const A = tubes[a], B = tubes[b]
      if (!A.length || B.length >= cap) return false
      const color = A[A.length - 1]
      if (B.length && B[B.length - 1] !== color) return false
      return true
    }
    function pour(a, b) {
      const color = tubes[a][tubes[a].length - 1]
      let n = 0
      while (
        tubes[a].length &&
        tubes[a][tubes[a].length - 1] === color &&
        tubes[b].length < cap
      ) {
        tubes[b].push(tubes[a].pop())
        n++
      }
      return n
    }
    function isWon() {
      return tubes.every(t => !t.length || (t.length === cap && t.every(c => c === t[0])))
    }
    function reset() {
      makeLevel(level)
      layout()
      sel = -1
      moves = 0
      setScore(Math.max(0, (level - 1) * 100))
    }
    function onHostStart() { level = 1; reset() }
    function die() { level = 1; reset() }
    function tick() {}
    function tubeAt(e) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const cols = Math.min(5, tubes.length)
      for (let i = 0; i < tubes.length; i++) {
        const r = (i / cols) | 0, c = i % cols
        const tx = ox + c * (tw + gap)
        const ty = oy + r * (th + rowGap)
        if (x >= tx && x <= tx + tw && y >= ty && y <= ty + th) return i
      }
      return -1
    }
    function draw() {
      PF.sky(ctx, W, H, '#0a1929', '#102a43', '#243b53')
      PF.dots(ctx, W, H, '#f0b429', 12, 0.35)
      const cols = Math.min(5, tubes.length)
      for (let i = 0; i < tubes.length; i++) {
        const r = (i / cols) | 0, c = i % cols
        const x = ox + c * (tw + gap)
        const y = oy + r * (th + rowGap)
        ctx.strokeStyle = sel === i ? '#f0b429' : 'rgba(255,255,255,0.55)'
        ctx.lineWidth = sel === i ? 3 : 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + th)
        ctx.quadraticCurveTo(x + tw * 0.5, y + th + 8, x + tw, y + th)
        ctx.lineTo(x + tw, y)
        ctx.stroke()
        const unit = (th - 10) / cap
        for (let k = 0; k < tubes[i].length; k++) {
          const color = COLORS[tubes[i][k]]
          const by = y + th - 6 - (k + 1) * unit
          PF.block(ctx, x + 4, by, tw - 8, unit - 2, color, '#111', 4)
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = '700 13px "Segoe UI", sans-serif'
      ctx.fillText('Level ' + level, 14, 28)
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      const i = tubeAt(e)
      if (i < 0) { sel = -1; return }
      if (sel < 0) { sel = i; return }
      if (sel === i) { sel = -1; return }
      if (!canPour(sel, i)) { sel = i; return }
      pour(sel, i)
      moves++
      bump(1)
      sel = -1
      if (isWon()) {
        bump(Math.max(20, 100 - moves * 2))
        if (window.Juice) Juice.burst(W * 0.5, oy + th * 0.5)
        level++
        reset()
      }
    })
    reset()
`,
  },

  blockfit: {
    title: 'Block Fit',
    tip: 'Drag pieces onto the grid. Clear lines.',
    bg: '#111827',
    accent: '#60a5fa',
    body: `
    let N = 8, grid = [], ox = 0, oy = 0, cell = 0, gap = 2
    let tray = [], drag = null, ghost = null
    // Bright fills on dark board — each shape family gets its own hue.
    const PALETTE = [
      ['#38bdf8', '#0284c7'],
      ['#f472b6', '#db2777'],
      ['#a3e635', '#4d7c0f'],
      ['#fbbf24', '#b45309'],
      ['#c084fc', '#7e22ce'],
      ['#2dd4bf', '#0f766e'],
      ['#fb7185', '#be123c'],
      ['#818cf8', '#4338ca'],
      ['#fdba74', '#c2410c'],
      ['#4ade80', '#15803d'],
      ['#f9a8d4', '#be185d'],
      ['#67e8f9', '#0e7490'],
      ['#fde047', '#a16207'],
      ['#e879f9', '#a21caf'],
      ['#86efac', '#166534'],
    ]
    const SHAPES = [
      [[1]],
      [[1,1]],
      [[1,1,1]],
      [[1,1,1,1]],
      [[1],[1]],
      [[1],[1],[1]],
      [[1,1],[1,1]],
      [[1,1,0],[0,1,1]],
      [[0,1,1],[1,1,0]],
      [[1,0],[1,1]],
      [[0,1],[1,1]],
      [[1,1,1],[0,1,0]],
      [[1,1],[1,0]],
      [[1,1,1],[1,0,0]],
      [[1,1,1],[0,0,1]],
    ]
    function layout() {
      const pad = 14
      const side = Math.min(W - pad * 2, H * 0.52)
      cell = (side - gap * (N + 1)) / N
      ox = (W - side) * 0.5
      oy = H * 0.1
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, oy + cell * 4] }
    function scorePos() { return diePos() }
    function shapeSize(s) {
      return { h: s.cells.length, w: Math.max(...s.cells.map(r => r.length)) }
    }
    function randShape() {
      const color = (Math.random() * SHAPES.length) | 0
      return { cells: SHAPES[color].map(r => r.slice()), color }
    }
    function refillTray() {
      if (tray.every(t => !t)) tray = [randShape(), randShape(), randShape()]
    }
    function canPlace(shape, gr, gc) {
      const { h, w } = shapeSize(shape)
      if (gr < 0 || gc < 0 || gr + h > N || gc + w > N) return false
      for (let r = 0; r < h; r++) for (let c = 0; c < (shape.cells[r].length); c++) {
        if (shape.cells[r][c] && grid[gr + r][gc + c]) return false
      }
      return true
    }
    function hasAnyPlacement() {
      for (const shape of tray) {
        if (!shape) continue
        const { h, w } = shapeSize(shape)
        for (let r = 0; r <= N - h; r++) for (let c = 0; c <= N - w; c++) {
          if (canPlace(shape, r, c)) return true
        }
      }
      return false
    }
    function clearLines() {
      const rows = [], cols = []
      for (let r = 0; r < N; r++) if (grid[r].every(Boolean)) rows.push(r)
      for (let c = 0; c < N; c++) {
        let full = true
        for (let r = 0; r < N; r++) if (!grid[r][c]) { full = false; break }
        if (full) cols.push(c)
      }
      for (const r of rows) for (let c = 0; c < N; c++) grid[r][c] = 0
      for (const c of cols) for (let r = 0; r < N; r++) grid[r][c] = 0
      const n = rows.length + cols.length
      if (n) bump(n === 1 ? 50 : n === 2 ? 120 : n * 80)
      return n
    }
    function place(shape, gr, gc) {
      const { h } = shapeSize(shape)
      const tone = (shape.color % PALETTE.length) + 1
      let cells = 0
      for (let r = 0; r < h; r++) for (let c = 0; c < shape.cells[r].length; c++) {
        if (!shape.cells[r][c]) continue
        grid[gr + r][gc + c] = tone
        cells++
      }
      bump(cells * 5)
      clearLines()
      if (window.Juice) Juice.burst(ox + (gc + 1) * cell, oy + (gr + 1) * cell)
    }
    function reset() {
      layout()
      grid = Array.from({ length: N }, () => Array(N).fill(0))
      tray = [randShape(), randShape(), randShape()]
      drag = null
      ghost = null
      setScore(0)
    }
    function onHostStart() { reset() }
    function die() { reset() }
    function tick() {}
    function trayY() { return oy + cell * N + gap * (N + 1) + 28 }
    function traySlot(i) {
      const slotW = Math.min(100, W * 0.28)
      const total = slotW * 3 + 16 * 2
      const x0 = (W - total) * 0.5
      return { x: x0 + i * (slotW + 16), y: trayY(), w: slotW, h: slotW }
    }
    function pointerCell(e) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const c = Math.floor((x - ox - gap) / (cell + gap))
      const r = Math.floor((y - oy - gap) / (cell + gap))
      return { r, c, x, y }
    }
    function colorsFor(shape) {
      return PALETTE[shape.color % PALETTE.length]
    }
    function drawShape(shape, x, y, s, alpha) {
      const [fill, stroke] = colorsFor(shape)
      ctx.globalAlpha = alpha == null ? 1 : alpha
      for (let r = 0; r < shape.cells.length; r++) for (let c = 0; c < shape.cells[r].length; c++) {
        if (!shape.cells[r][c]) continue
        PF.block(ctx, x + c * s, y + r * s, s - 2, s - 2, fill, stroke, 6)
      }
      ctx.globalAlpha = 1
    }
    function draw() {
      PF.sky(ctx, W, H, '#030712', '#111827', '#1f2937')
      PF.dots(ctx, W, H, '#94a3b8', 12, 0.25)
      const side = cell * N + gap * (N + 1)
      PF.block(ctx, ox, oy, side, side, '#0b1220', '#05080f', 10)
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const x = ox + gap + c * (cell + gap)
        const y = oy + gap + r * (cell + gap)
        const v = grid[r][c]
        if (v) {
          const [fill, stroke] = PALETTE[(v - 1) % PALETTE.length]
          PF.block(ctx, x, y, cell, cell, fill, stroke, 5)
        } else {
          PF.block(ctx, x, y, cell, cell, '#1f2937', '#0f172a', 5)
        }
      }
      if (ghost && ghost.ok) {
        drawShape(ghost.shape, ox + gap + ghost.c * (cell + gap), oy + gap + ghost.r * (cell + gap), cell + gap, 0.45)
      }
      for (let i = 0; i < 3; i++) {
        const slot = traySlot(i)
        PF.block(ctx, slot.x, slot.y, slot.w, slot.h, '#1f2937', '#0b1220', 10)
        if (tray[i] && !(drag && drag.slot === i)) {
          const { h, w } = shapeSize(tray[i])
          const s = Math.min((slot.w - 16) / w, (slot.h - 16) / h)
          drawShape(tray[i], slot.x + (slot.w - w * s) * 0.5, slot.y + (slot.h - h * s) * 0.5, s)
        }
      }
      if (drag) {
        const s = cell * 0.9
        const { h, w } = shapeSize(drag.shape)
        drawShape(drag.shape, drag.x - w * s * 0.5, drag.y - h * s * 0.5, s, 0.9)
      }
    }
    addEventListener('pointerdown', e => {
      if (GS.paused) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      for (let i = 0; i < 3; i++) {
        if (!tray[i]) continue
        const slot = traySlot(i)
        if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) {
          drag = { slot: i, shape: tray[i], x, y }
          ghost = null
          return
        }
      }
    })
    addEventListener('pointermove', e => {
      if (!drag || GS.paused) return
      const p = pointerCell(e)
      drag.x = p.x; drag.y = p.y
      const { h, w } = shapeSize(drag.shape)
      const gr = p.r - ((h - 1) / 2 | 0)
      const gc = p.c - ((w - 1) / 2 | 0)
      ghost = { r: gr, c: gc, shape: drag.shape, ok: canPlace(drag.shape, gr, gc) }
    })
    function endDrag(e) {
      if (!drag) return
      const p = pointerCell(e)
      const { h, w } = shapeSize(drag.shape)
      const gr = p.r - ((h - 1) / 2 | 0)
      const gc = p.c - ((w - 1) / 2 | 0)
      if (canPlace(drag.shape, gr, gc)) {
        place(drag.shape, gr, gc)
        tray[drag.slot] = null
        refillTray()
        if (!hasAnyPlacement()) die()
      }
      drag = null
      ghost = null
    }
    addEventListener('pointerup', endDrag)
    addEventListener('pointercancel', () => { drag = null; ghost = null })
    reset()
`,
  },
}
