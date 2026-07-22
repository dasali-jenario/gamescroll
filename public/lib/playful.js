/**
 * Shared playful Canvas helpers for Gamescroll iframe games.
 * Loaded before each game body; use via global `PF`.
 */
;(function (global) {
  const PF = {
    t: 0,

    rr(ctx, x, y, w, h, r) {
      const rr = Math.min(r, w * 0.5, h * 0.5)
      ctx.beginPath()
      ctx.moveTo(x + rr, y)
      ctx.arcTo(x + w, y, x + w, y + h, rr)
      ctx.arcTo(x + w, y + h, x, y + h, rr)
      ctx.arcTo(x, y + h, x, y, rr)
      ctx.arcTo(x, y, x + w, y, rr)
      ctx.closePath()
    },

    sky(ctx, W, H, c0, c1, c2) {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, c0)
      g.addColorStop(c2 ? 0.55 : 1, c1)
      if (c2) g.addColorStop(1, c2)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    },

    dots(ctx, W, H, color, n, speed) {
      const sp = speed == null ? 1 : speed
      ctx.fillStyle = color
      for (let i = 0; i < (n || 18); i++) {
        const x = ((i * 97 + PF.t * (8 + (i % 5) * sp)) % (W + 40)) - 20
        const y = ((i * 53 + Math.sin(PF.t * 0.7 + i) * 20) % (H + 40))
        const a = 0.12 + (i % 5) * 0.04
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.arc(x, (y + H) % H, 2 + (i % 3), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    },

    blobs(ctx, W, H, color, n) {
      for (let i = 0; i < (n || 5); i++) {
        const x = ((i * 137 + PF.t * (6 + i)) % (W + 80)) - 40
        const y = H * (0.15 + (i % 4) * 0.2) + Math.sin(PF.t * 0.9 + i) * 24
        ctx.fillStyle = color
        ctx.globalAlpha = 0.08 + (i % 3) * 0.03
        ctx.beginPath()
        ctx.ellipse(x, y, 40 + i * 10, 18 + (i % 2) * 8, Math.sin(PF.t + i) * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    },

    soft(ctx, x, y, r, c0, c1) {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r)
      g.addColorStop(0, c0)
      g.addColorStop(1, c1 || c0)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.ellipse(x - r * 0.28, y - r * 0.32, r * 0.28, r * 0.18, -0.4, 0, Math.PI * 2)
      ctx.fill()
    },

    /** Cute character: body + eyes + smile. opts: lookX, lookY, squash, stretch, blush */
    buddy(ctx, x, y, r, c0, c1, opts) {
      opts = opts || {}
      const sq = opts.squash == null ? 1 : opts.squash
      const st = opts.stretch == null ? 1 : opts.stretch
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(sq, st)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath()
      ctx.ellipse(2, r * 0.95, r * 0.75, r * 0.28, 0, 0, Math.PI * 2)
      ctx.fill()
      const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r)
      g.addColorStop(0, c0)
      g.addColorStop(1, c1 || c0)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      if (opts.blush) {
        ctx.fillStyle = 'rgba(255,120,140,0.35)'
        ctx.beginPath()
        ctx.ellipse(-r * 0.45, r * 0.15, r * 0.18, r * 0.12, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(r * 0.45, r * 0.15, r * 0.18, r * 0.12, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      const lx = (opts.lookX || 0) * r * 0.12
      const ly = (opts.lookY || 0) * r * 0.1
      const er = r * 0.22
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(-r * 0.28, -r * 0.18, er, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(r * 0.28, -r * 0.18, er, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1b1b1b'
      ctx.beginPath()
      ctx.arc(-r * 0.28 + lx, -r * 0.18 + ly, er * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(r * 0.28 + lx, -r * 0.18 + ly, er * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(-r * 0.22 + lx, -r * 0.24 + ly, er * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(r * 0.34 + lx, -r * 0.24 + ly, er * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = Math.max(1.2, r * 0.08)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(0, r * 0.12, r * 0.28, 0.15, Math.PI - 0.15)
      ctx.stroke()
      ctx.restore()
    },

    block(ctx, x, y, w, h, c0, c1, radius) {
      const g = ctx.createLinearGradient(x, y, x, y + h)
      g.addColorStop(0, c0)
      g.addColorStop(1, c1 || c0)
      ctx.fillStyle = g
      PF.rr(ctx, x, y, w, h, radius == null ? 10 : radius)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      PF.rr(ctx, x + 4, y + 3, Math.max(4, w * 0.35), Math.max(3, h * 0.28), 6)
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      PF.rr(ctx, x + w * 0.55, y + h * 0.55, w * 0.35, h * 0.35, 6)
      ctx.fill()
    },

    spike(ctx, x, y, dir, color) {
      // dir: 'up'|'down'|'left'|'right'
      ctx.fillStyle = color || '#ffba08'
      ctx.beginPath()
      if (dir === 'up') {
        ctx.moveTo(x, y)
        ctx.lineTo(x - 11, y + 26)
        ctx.lineTo(x + 11, y + 26)
      } else if (dir === 'down') {
        ctx.moveTo(x, y)
        ctx.lineTo(x - 11, y - 26)
        ctx.lineTo(x + 11, y - 26)
      } else if (dir === 'left') {
        ctx.moveTo(x, y)
        ctx.lineTo(x + 22, y - 12)
        ctx.lineTo(x + 22, y + 12)
      } else {
        ctx.moveTo(x, y)
        ctx.lineTo(x - 22, y - 12)
        ctx.lineTo(x - 22, y + 12)
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      if (dir === 'up' || dir === 'down') ctx.ellipse(x - 3, y + (dir === 'up' ? 10 : -10), 3, 6, 0, 0, Math.PI * 2)
      else ctx.ellipse(x + (dir === 'left' ? 8 : -8), y - 3, 6, 3, 0, 0, Math.PI * 2)
      ctx.fill()
    },

    bob(amp, speed, phase) {
      return Math.sin(PF.t * (speed || 3) + (phase || 0)) * (amp || 4)
    },
  }

  global.PF = PF
})(typeof window !== 'undefined' ? window : globalThis)
