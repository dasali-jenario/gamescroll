/** Deno copy of src/lib/gameSmoke.ts — keep in sync via `node scripts/sync-shared.mjs`. */

export type SmokeResult = { ok: true } | { ok: false; errors: string[] }

type ApiFns = {
  tick?: (dt: number) => void
  draw?: (now: number) => void
  die?: () => void
  onHostStart?: () => void
  onResize?: () => void
  layout?: () => void
}

function stubCtx() {
  const noop = () => {}
  return new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'canvas') return { width: 390, height: 844 }
        if (prop === 'getTransform') {
          return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
        }
        if (prop === 'measureText') {
          return (text: string) => ({ width: String(text).length * 10 })
        }
        return noop
      },
    },
  )
}

function stubCanvas() {
  const listeners: Record<string, Array<(e: unknown) => void>> = {}
  return {
    width: 390,
    height: 844,
    style: {},
    getContext: () => stubCtx(),
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 390,
      height: 844,
      right: 390,
      bottom: 844,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      ;(listeners[type] ||= []).push(fn)
    },
    removeEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners[type] = (listeners[type] || []).filter((f) => f !== fn)
    },
    dispatchEvent: () => true,
    __listeners: listeners,
  }
}

/**
 * Load bodyJs in a fake Gamescroll host and exercise the real boot order:
 * load → host layout() → idle draw (browse, still paused) → onHostStart → tick/draw/pointer.
 * Catches ReferenceError / TypeError before upload — including blank-screen bugs where
 * draw assumes onHostStart already ran.
 */
export function smokeGameBody(bodyJs: string): SmokeResult {
  const errors: string[] = []
  if (!bodyJs.trim()) return { ok: false, errors: ['game body is empty'] }

  const canvas = stubCanvas()
  const ctx = stubCtx()
  const GS: {
    paused: boolean
    reported: boolean
    onFail: 'replay'
    post: () => void
    begin: () => void
    halt: () => void
    layoutFromPlan: (
      plan: Array<{ id: string; x: number; y: number; w: number; h: number; band?: string }>,
      w?: number,
      h?: number,
    ) => Record<string, { x: number; y: number; w: number; h: number; band: string }>
  } = {
    paused: true,
    reported: false,
    onFail: 'replay',
    post: () => {},
    begin: () => {},
    halt: () => {
      GS.paused = true
    },
    layoutFromPlan(plan, w = 390, h = 844) {
      const out: Record<string, { x: number; y: number; w: number; h: number; band: string }> =
        {}
      if (!Array.isArray(plan)) return out
      for (const r of plan) {
        if (!r || typeof r.id !== 'string') continue
        out[r.id] = {
          x: Number(r.x) * w,
          y: Number(r.y) * h,
          w: Number(r.w) * w,
          h: Number(r.h) * h,
          band: r.band || 'other',
        }
      }
      return out
    },
  }
  // Proxy stubs so any Juice/PF helper the body reaches for resolves to a no-op.
  const noopProxy = (extra: Record<string, unknown> = {}) =>
    new Proxy(extra, {
      get: (target, prop) => (prop in target ? target[prop as string] : () => {}),
      set: (target, prop, value) => {
        target[prop as string] = value
        return true
      },
    })
  const Juice = noopProxy()
  const PF = noopProxy({ t: 0 })

  let score = 0
  const setScore = (n: number) => {
    score = Math.max(0, n | 0)
  }
  const bump = (n?: number) => {
    setScore(score + (n || 1))
  }

  const addEventListener = (
    type: string,
    fn: EventListenerOrEventListenerObject,
  ) => {
    // no-op global listeners in smoke (pointer handlers register fine)
    void type
    void fn
  }

  let api: ApiFns = {}
  try {
    // Host bindings match wrap.ts free variables. new Function is intentional here
    // (game bodies themselves are forbidden from using it).
    const loader = new Function(
      'canvas',
      'ctx',
      'GS',
      'Juice',
      'PF',
      'setScore',
      'bump',
      'addEventListener',
      `
      let W = 390, H = 844, score = 0;
      ${bodyJs}
      return {
        tick: typeof tick === 'function' ? tick : undefined,
        draw: typeof draw === 'function' ? draw : undefined,
        die: typeof die === 'function' ? die : undefined,
        onHostStart: typeof onHostStart === 'function' ? onHostStart : undefined,
        onResize: typeof onResize === 'function' ? onResize : undefined,
        layout: typeof layout === 'function' ? layout : undefined,
      };
      `,
    )
    api = loader(
      canvas,
      ctx,
      GS,
      Juice,
      PF,
      setScore,
      bump,
      addEventListener,
    ) as ApiFns
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack =
      err instanceof Error && err.stack
        ? err.stack.split('\n').slice(0, 4).join(' | ')
        : ''
    return {
      ok: false,
      errors: [
        stack
          ? `smoke load failed: ${msg} :: ${stack}`
          : `smoke load failed: ${msg}`,
      ],
    }
  }

  if (!api.tick) errors.push('smoke: tick is not defined after load')
  if (!api.draw) errors.push('smoke: draw is not defined after load')
  if (!api.die) errors.push('smoke: die is not defined after load')
  if (!api.onHostStart) errors.push('smoke: onHostStart is not defined after load')
  if (!api.layout) errors.push('smoke: layout is not defined after load')
  if (errors.length) return { ok: false, errors }

  // Host wrap calls layout() once after the body evaluates (browse preview).
  try {
    api.layout!()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`smoke host layout() threw: ${msg}`)
  }

  // Critical: feed paints while GS.paused — before gamescroll:start / onHostStart.
  try {
    api.draw!(0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`smoke idle draw (before start) threw: ${msg}`)
  }

  try {
    GS.paused = false
    api.onHostStart!()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`smoke onHostStart threw: ${msg}`)
  }
  try {
    api.layout!()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`smoke layout threw: ${msg}`)
  }
  try {
    if (api.onResize) api.onResize()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`smoke onResize threw: ${msg}`)
  }
  try {
    api.tick!(0.016)
    GS.paused = true
    api.tick!(0.016)
    GS.paused = false
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`smoke tick threw: ${msg}`)
  }
  try {
    api.draw!(typeof performance !== 'undefined' ? performance.now() : 16)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`smoke draw threw: ${msg}`)
  }

  // Fire a synthetic pointerdown if the body registered one on canvas.
  try {
    const downs = canvas.__listeners.pointerdown || []
    for (const fn of downs) {
      fn({
        clientX: 195,
        clientY: 700,
        pointerId: 1,
        preventDefault: () => {},
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`smoke pointerdown threw: ${msg}`)
  }

  // Letterboxed / short playfields (host chrome insets) must still paint.
  // Matches taller portrait frame: top bar + bottom nav, no top action band.
  try {
    const short = new Function(
      'canvas',
      'ctx',
      'GS',
      'Juice',
      'PF',
      'setScore',
      'bump',
      'addEventListener',
      `
      let W = 320, H = 560, score = 0;
      ${bodyJs}
      if (typeof layout === 'function') layout();
      if (typeof draw === 'function') draw(0);
      if (typeof onHostStart === 'function') { GS.paused = false; onHostStart(); }
      if (typeof draw === 'function') draw(1);
      return true;
      `,
    )
    short(
      canvas,
      ctx,
      { ...GS, paused: true },
      Juice,
      PF,
      setScore,
      bump,
      addEventListener,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`smoke letterboxed playfield threw: ${msg}`)
  }

  return errors.length ? { ok: false, errors } : { ok: true }
}

export type PlayabilityResult =
  | { ok: true; scored: boolean }
  | { ok: false; errors: string[]; scored: boolean }

type DriveApi = ApiFns & { layoutRectsFn?: () => unknown }

function isDriveRect(v: unknown): v is { x: number; y: number; w: number; h: number } {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return [o.x, o.y, o.w, o.h].every((n) => typeof n === 'number' && Number.isFinite(n))
}

/**
 * Drive a body like a player: start the run, tick for a few simulated seconds,
 * sweep pointer taps across harvested layout rects + a playfield grid, then
 * verify the die() fail path recovers. Catches mid-game crashes and broken
 * input/fail handlers that the idle smoke cannot see.
 *
 * `scored` reports whether the random-input run moved the score — diagnostic
 * only (puzzle games rarely score under random taps), NOT a hard failure.
 */
export function driveGameBody(
  bodyJs: string,
  opts?: { seconds?: number; W?: number; H?: number },
): PlayabilityResult {
  const errors: string[] = []
  if (!bodyJs.trim()) return { ok: false, errors: ['playability: game body is empty'], scored: false }
  const W = opts?.W ?? 390
  const H = opts?.H ?? 844
  const seconds = Math.max(1, Math.min(20, opts?.seconds ?? 8))

  const canvas = stubCanvas()
  canvas.width = W
  canvas.height = H
  const baseRect = {
    left: 0,
    top: 0,
    width: W,
    height: H,
    right: W,
    bottom: H,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }
  canvas.getBoundingClientRect = () => baseRect
  const ctx = stubCtx()
  const GS = {
    paused: true,
    reported: false,
    onFail: 'replay' as const,
    post: () => {},
    begin: () => {},
    halt: () => {
      GS.paused = true
    },
    layoutFromPlan(
      plan: Array<{ id: string; x: number; y: number; w: number; h: number; band?: string }>,
      w = W,
      h = H,
    ) {
      const out: Record<string, { x: number; y: number; w: number; h: number; band: string }> =
        {}
      if (!Array.isArray(plan)) return out
      for (const r of plan) {
        if (!r || typeof r.id !== 'string') continue
        out[r.id] = {
          x: Number(r.x) * w,
          y: Number(r.y) * h,
          w: Number(r.w) * w,
          h: Number(r.h) * h,
          band: r.band || 'other',
        }
      }
      return out
    },
  }
  const noopProxy = (extra: Record<string, unknown> = {}) =>
    new Proxy(extra, {
      get: (target, prop) => (prop in target ? target[prop as string] : () => {}),
      set: (target, prop, value) => {
        target[prop as string] = value
        return true
      },
    })
  const Juice = noopProxy()
  const PF = noopProxy({ t: 0 })

  let score = 0
  let maxScore = 0
  const setScore = (n: number) => {
    score = Math.max(0, n | 0)
    maxScore = Math.max(maxScore, score)
  }
  const bump = (n?: number) => {
    setScore(score + (n || 1))
  }

  // Capture window-level listeners too — official-style bodies register globally.
  const addEventListener = (type: string, fn: (e: unknown) => void) => {
    ;(canvas.__listeners[type] ||= []).push(fn)
  }

  let api: DriveApi = {}
  try {
    const loader = new Function(
      'canvas',
      'ctx',
      'GS',
      'Juice',
      'PF',
      'setScore',
      'bump',
      'addEventListener',
      `
      let W = ${W}, H = ${H}, score = 0;
      ${bodyJs}
      return {
        tick: typeof tick === 'function' ? tick : undefined,
        draw: typeof draw === 'function' ? draw : undefined,
        die: typeof die === 'function' ? die : undefined,
        onHostStart: typeof onHostStart === 'function' ? onHostStart : undefined,
        onResize: typeof onResize === 'function' ? onResize : undefined,
        layout: typeof layout === 'function' ? layout : undefined,
        layoutRectsFn: typeof layoutRects === 'function' ? layoutRects : undefined,
      };
      `,
    )
    api = loader(canvas, ctx, GS, Juice, PF, setScore, bump, addEventListener) as DriveApi
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, errors: [`playability load failed: ${msg}`], scored: false }
  }

  if (!api.tick || !api.draw || !api.die || !api.onHostStart || !api.layout) {
    return {
      ok: false,
      errors: ['playability: body is missing tick/draw/die/onHostStart/layout'],
      scored: false,
    }
  }

  // Tap targets: harvested rect centers first, then a coarse playfield sweep.
  const targets: Array<{ x: number; y: number }> = []
  const pushRectCenters = () => {
    if (!api.layoutRectsFn) return
    try {
      const graph = api.layoutRectsFn()
      if (graph && typeof graph === 'object') {
        for (const v of Object.values(graph as Record<string, unknown>)) {
          if (isDriveRect(v)) targets.push({ x: v.x + v.w / 2, y: v.y + v.h / 2 })
        }
      }
    } catch {
      /* rect harvest is best-effort here; fidelity gate reports it properly */
    }
  }
  const fire = (type: string, x: number, y: number, buttons: number) => {
    const fns = canvas.__listeners[type] || []
    for (const fn of fns) {
      fn({
        clientX: x,
        clientY: y,
        pointerId: 1,
        buttons,
        preventDefault: () => {},
      })
    }
  }
  const tap = (x: number, y: number) => {
    fire('pointerdown', x, y, 1)
    fire('pointermove', x + 8, y + 4, 1)
    fire('pointerup', x + 8, y + 4, 0)
  }

  try {
    api.layout()
    api.draw(0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`playability idle layout/draw threw: ${msg}`)
  }
  try {
    GS.paused = false
    api.onHostStart()
    api.layout()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`playability onHostStart threw: ${msg}`)
  }
  if (errors.length) return { ok: false, errors, scored: maxScore > 0 }

  pushRectCenters()
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      targets.push({ x: W * ((gx + 0.5) / 5), y: H * ((gy + 0.5) / 8) })
    }
  }

  const frames = Math.round(seconds * 60)
  const dt = 1 / 60
  let targetIdx = 0
  try {
    for (let f = 0; f < frames; f++) {
      const pf = PF as { t: number }
      pf.t += dt
      api.tick(dt)
      if (f % 6 === 0 && targets.length) {
        const t = targets[targetIdx % targets.length]
        targetIdx += 1
        tap(t.x, t.y)
      }
      if (f % 10 === 0) api.draw(f * 16)
      if (f === Math.floor(frames / 2) && api.onResize) api.onResize()
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`playability driven run threw: ${msg}`)
  }

  // Fail path must recover: die() then keep ticking/painting (host replay flow).
  try {
    api.die()
    api.tick(dt)
    api.draw(frames * 16)
    tap(W / 2, H * 0.75)
    api.tick(dt)
    api.draw(frames * 16 + 16)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`playability die()/recovery threw: ${msg}`)
  }

  return errors.length
    ? { ok: false, errors, scored: maxScore > 0 }
    : { ok: true, scored: maxScore > 0 }
}
