/**
 * Gamescroll juice — GSAP tweens + Proton particles for iframe minigames.
 * Expects globals: gsap, Proton. Call Juice.init() after canvas/HUD exist.
 */
;(function (global) {
  const offset = { x: 0, y: 0 }

  const Juice = {
    ready: false,
    accent: '#ffffff',
    offset: offset,
  }

  let stage = null
  let scoreEl = null
  let fx = null
  let proton = null
  let emitter = null
  let shaking = false

  function resolveProton() {
    const P = global.Proton
    if (!P) return null
    return typeof P === 'function' ? P : P.default || null
  }

  function makeEmitter(P) {
    const e = new P.Emitter()
    e.rate = new P.Rate(new P.Span(14, 22), 0.01)
    e.addInitialize(new P.Mass(1))
    e.addInitialize(new P.Radius(2, 5))
    e.addInitialize(new P.Life(0.35, 0.7))
    e.addInitialize(new P.V(new P.Span(1.2, 3.2), new P.Span(0, 360), 'polar'))
    e.addBehaviour(new P.Alpha(1, 0))
    e.addBehaviour(new P.Scale(1, 0.15))
    e.addBehaviour(new P.G(2.4))
    e.damping = 0.012
    return e
  }

  function applyShake() {
    if (!stage) return
    stage.style.transform =
      offset.x || offset.y
        ? 'translate(' + offset.x + 'px,' + offset.y + 'px)'
        : ''
  }

  /** Prefer a bright particle tint so bursts read on dark game backgrounds. */
  function particleColor(preferred) {
    if (!preferred || preferred.charAt(0) !== '#' || preferred.length < 7) {
      return '#ffd166'
    }
    const r = parseInt(preferred.slice(1, 3), 16)
    const g = parseInt(preferred.slice(3, 5), 16)
    const b = parseInt(preferred.slice(5, 7), 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '#ffd166'
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return lum > 0.42 ? preferred : '#ffd166'
  }

  Juice.init = function init(opts) {
    opts = opts || {}
    stage = opts.stage || document.getElementById('stage')
    scoreEl = opts.scoreEl || document.getElementById('score')
    fx = opts.fx || document.getElementById('fx')
    Juice.accent = opts.accent || '#ffffff'

    const P = resolveProton()
    if (P && fx) {
      try {
        proton = new P()
        emitter = makeEmitter(P)
        proton.addEmitter(emitter)
        proton.addRenderer(new P.CanvasRenderer(fx))
      } catch (err) {
        console.warn('Juice: Proton init failed', err)
        proton = null
        emitter = null
      }
    }

    Juice.ready = true
    Juice.resize()
  }

  Juice.resize = function resize() {
    if (!fx) return
    // 1× buffer: Proton draws in CSS pixels; avoid DPR transforms fighting clearRect.
    const w = Math.max(1, global.innerWidth || 1)
    const h = Math.max(1, global.innerHeight || 1)
    fx.width = w
    fx.height = h
    fx.style.width = w + 'px'
    fx.style.height = h + 'px'
    if (proton) {
      for (const r of proton.renderers || []) {
        if (typeof r.resize === 'function') r.resize(w, h)
      }
    }
  }

  Juice.burst = function burst(x, y, color, count) {
    if (!emitter || !proton) return
    const P = resolveProton()
    const c = particleColor(color || Juice.accent)
    const n = count || 18
    emitter.p.x = x
    emitter.p.y = y
    emitter.removeAllBehaviours()
    emitter.addBehaviour(new P.Alpha(1, 0))
    emitter.addBehaviour(new P.Scale(1, 0.1))
    emitter.addBehaviour(new P.Color(c))
    emitter.addBehaviour(new P.G(2.6))
    emitter.rate = new P.Rate(new P.Span(Math.max(8, n - 4), n + 4), 0.01)
    emitter.emit('once')
  }

  Juice.shake = function shake(intensity) {
    intensity = intensity == null ? 1 : intensity
    if (!stage || !global.gsap) return
    const amp = 5 * intensity
    shaking = true
    global.gsap.killTweensOf(offset)
    const tl = global.gsap.timeline({
      onUpdate: applyShake,
      onComplete: function () {
        offset.x = 0
        offset.y = 0
        shaking = false
        applyShake()
      },
    })
    tl.to(offset, { x: amp, y: -amp * 0.6, duration: 0.04, ease: 'none' })
      .to(offset, { x: -amp * 0.85, y: amp * 0.5, duration: 0.05, ease: 'none' })
      .to(offset, { x: amp * 0.55, y: -amp * 0.35, duration: 0.05, ease: 'none' })
      .to(offset, { x: -amp * 0.3, y: amp * 0.2, duration: 0.06, ease: 'none' })
      .to(offset, { x: 0, y: 0, duration: 0.08, ease: 'power1.out' })
  }

  Juice.popScore = function popScore(amount) {
    if (!scoreEl || !global.gsap) return
    const n = amount || 1
    const el = document.createElement('div')
    el.className = 'float-score'
    el.textContent = '+' + n
    document.body.appendChild(el)

    const rect = scoreEl.getBoundingClientRect()
    el.style.left = rect.left + rect.width * 0.5 + (Math.random() * 24 - 12) + 'px'
    el.style.top = rect.bottom + 4 + 'px'

    global.gsap.fromTo(
      el,
      { opacity: 0, y: 8, scale: 0.6 },
      {
        opacity: 1,
        y: -36,
        scale: 1.15,
        duration: 0.55,
        ease: 'power2.out',
        onComplete: function () {
          global.gsap.to(el, {
            opacity: 0,
            y: '-=18',
            duration: 0.25,
            onComplete: function () {
              el.remove()
            },
          })
        },
      },
    )

    global.gsap.fromTo(
      scoreEl,
      { scale: 1 },
      {
        scale: 1.18,
        duration: 0.12,
        yoyo: true,
        repeat: 1,
        ease: 'power1.out',
        transformOrigin: '50% 50%',
      },
    )
  }

  Juice.onScore = function onScore(amount, x, y) {
    const ax = x != null ? x : (global.innerWidth || 0) * 0.5
    const ay = y != null ? y : (global.innerHeight || 0) * 0.42
    Juice.burst(ax, ay, Juice.accent, 16 + Math.min(10, (amount || 1) * 2))
    Juice.popScore(amount)
    if ((amount || 1) >= 2) Juice.shake(0.45)
  }

  Juice.onDie = function onDie(x, y) {
    const ax = x != null ? x : (global.innerWidth || 0) * 0.5
    const ay = y != null ? y : (global.innerHeight || 0) * 0.5
    Juice.burst(ax, ay, '#ffffff', 28)
    Juice.shake(1.15)
  }

  Juice.update = function update() {
    if (proton) proton.update()
    if (shaking) applyShake()
  }

  global.Juice = Juice
})(typeof window !== 'undefined' ? window : globalThis)
