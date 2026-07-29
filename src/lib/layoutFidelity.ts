/**
 * Geometric layout fidelity: compare a layoutPlan to harvested runtime rects.
 * Phase 0 metric / check:ugc gate. Phase 1 will require harvest from scaffolds.
 */
import type { LayoutRect } from './layoutPlan'

export const LAYOUT_FIDELITY_EPS = 0.04
export const LAYOUT_REF_W = 390
export const LAYOUT_REF_H = 844

export type HarvestedRect = {
  id: string
  /** Absolute px on the smoke/playfield canvas */
  x: number
  y: number
  w: number
  h: number
}

export type HarvestResult =
  | { ok: true; rects: HarvestedRect[]; source: string }
  | { ok: false; errors: string[]; rects: HarvestedRect[]; source: null }

export type FidelityResult =
  | { ok: true; compared: number; source: string | null }
  | {
      ok: false
      errors: string[]
      compared: number
      source: string | null
      /** true when body exposes no harvest graph — Phase 0 reports, Phase 1 fails */
      missingHarvest: boolean
    }

function isPlainRect(v: unknown): v is { x: number; y: number; w: number; h: number } {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return [o.x, o.y, o.w, o.h].every((n) => typeof n === 'number' && Number.isFinite(n))
}

/** Pull named {x,y,w,h} entries from a conventional object graph. */
export function collectRectsFromGraph(
  graph: unknown,
  ids: string[],
): HarvestedRect[] {
  if (!graph || typeof graph !== 'object') return []
  const root = graph as Record<string, unknown>
  const out: HarvestedRect[] = []
  for (const id of ids) {
    const direct = root[id]
    if (isPlainRect(direct)) {
      out.push({ id, x: direct.x, y: direct.y, w: direct.w, h: direct.h })
      continue
    }
    // Nested: L.cta, layoutRects.title, etc. already covered by root[id].
  }
  return out
}

/**
 * Compare plan fractions to harvested px rects on a reference playfield.
 * Tolerance defaults to LAYOUT_FIDELITY_EPS of W/H.
 */
export function compareLayoutFidelity(
  plan: LayoutRect[],
  harvested: HarvestedRect[],
  opts?: { eps?: number; W?: number; H?: number },
): { ok: true; compared: number } | { ok: false; errors: string[]; compared: number } {
  const eps = opts?.eps ?? LAYOUT_FIDELITY_EPS
  const W = opts?.W ?? LAYOUT_REF_W
  const H = opts?.H ?? LAYOUT_REF_H
  const byId = new Map(harvested.map((r) => [r.id, r]))
  const errors: string[] = []
  let compared = 0

  for (const p of plan) {
    const h = byId.get(p.id)
    if (!h) {
      errors.push(`layout fidelity: missing harvested rect "${p.id}"`)
      continue
    }
    compared += 1
    const fx = h.x / W
    const fy = h.y / H
    const fw = h.w / W
    const fh = h.h / H
    const drifts: string[] = []
    if (Math.abs(fx - p.x) > eps) drifts.push(`x (plan ${p.x.toFixed(3)} vs ${fx.toFixed(3)})`)
    if (Math.abs(fy - p.y) > eps) drifts.push(`y (plan ${p.y.toFixed(3)} vs ${fy.toFixed(3)})`)
    if (Math.abs(fw - p.w) > eps) drifts.push(`w (plan ${p.w.toFixed(3)} vs ${fw.toFixed(3)})`)
    if (Math.abs(fh - p.h) > eps) drifts.push(`h (plan ${p.h.toFixed(3)} vs ${fh.toFixed(3)})`)
    if (drifts.length) {
      errors.push(`layout fidelity: "${p.id}" drifts ${drifts.join(', ')} (ε=${eps})`)
    }
  }

  return errors.length ? { ok: false, errors, compared } : { ok: true, compared }
}

type ApiHarvest = {
  layout?: () => void
  layoutRectsFn?: () => unknown
  layoutRectsObj?: unknown
  L?: unknown
  rects?: unknown
}

/**
 * Load bodyJs in the same fake host as smoke, call layout(), then harvest
 * named rects from layoutRects() / layoutRects / L / rects.
 */
export function harvestLayoutRects(
  bodyJs: string,
  planIds: string[],
  opts?: { W?: number; H?: number },
): HarvestResult {
  const W = opts?.W ?? LAYOUT_REF_W
  const H = opts?.H ?? LAYOUT_REF_H
  if (!bodyJs.trim()) {
    return { ok: false, errors: ['harvest: game body is empty'], rects: [], source: null }
  }
  if (!planIds.length) {
    return { ok: false, errors: ['harvest: no plan ids'], rects: [], source: null }
  }

  const canvas = {
    width: W,
    height: H,
    style: {},
    getContext: () => ({}),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  const noopProxy = (extra: Record<string, unknown> = {}) =>
    new Proxy(extra, {
      get: (target, prop) => (prop in target ? target[prop as string] : () => {}),
      set: (target, prop, value) => {
        target[prop as string] = value
        return true
      },
    })

  let api: ApiHarvest = {}
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
        layout: typeof layout === 'function' ? layout : undefined,
        layoutRectsFn: typeof layoutRects === 'function' ? layoutRects : undefined,
        layoutRectsObj: typeof layoutRects === 'object' && layoutRects ? layoutRects : undefined,
        L: typeof L !== 'undefined' ? L : undefined,
        rects: typeof rects !== 'undefined' ? rects : undefined,
      };
      `,
    )
    const GS = {
      paused: true,
      reported: false,
      onFail: 'replay',
      post: () => {},
      begin: () => {},
      halt: () => {},
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
    api = loader(
      canvas,
      {},
      GS,
      noopProxy(),
      noopProxy({ t: 0 }),
      () => {},
      () => {},
      () => {},
    ) as ApiHarvest
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, errors: [`harvest load failed: ${msg}`], rects: [], source: null }
  }

  try {
    api.layout?.()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, errors: [`harvest layout() threw: ${msg}`], rects: [], source: null }
  }

  const tryGraph = (source: string, graph: unknown): HarvestResult | null => {
    let g = graph
    if (typeof graph === 'function') {
      try {
        g = (graph as () => unknown)()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { ok: false, errors: [`harvest ${source}() threw: ${msg}`], rects: [], source: null }
      }
    }
    const rects = collectRectsFromGraph(g, planIds)
    if (rects.length === 0) return null
    return { ok: true, rects, source }
  }

  if (api.layoutRectsFn) {
    const hit = tryGraph('layoutRects', api.layoutRectsFn)
    if (hit) return hit
  }
  for (const [source, graph] of [
    ['layoutRects', api.layoutRectsObj],
    ['L', api.L],
    ['rects', api.rects],
  ] as const) {
    if (graph == null) continue
    const hit = tryGraph(source, graph)
    if (hit) return hit
  }

  return {
    ok: false,
    errors: [
      'harvest: no layoutRects()/layoutRects/L/rects graph with plan ids (Phase 0 soft; Phase 1 requires harvest)',
    ],
    rects: [],
    source: null,
  }
}

/**
 * Full fidelity check: harvest + compare.
 * When harvest is missing, returns ok:false with missingHarvest:true (caller decides soft vs hard).
 */
export function checkBodyLayoutFidelity(
  bodyJs: string,
  plan: LayoutRect[],
  opts?: { eps?: number; W?: number; H?: number; requireHarvest?: boolean },
): FidelityResult {
  const ids = plan.map((p) => p.id)
  const harvest = harvestLayoutRects(bodyJs, ids, { W: opts?.W, H: opts?.H })
  if (!harvest.ok) {
    const missingHarvest = harvest.errors.some((e) => e.includes('no layoutRects'))
    if (missingHarvest && opts?.requireHarvest === false) {
      return { ok: true, compared: 0, source: null }
    }
    return {
      ok: false,
      errors: harvest.errors,
      compared: 0,
      source: null,
      missingHarvest,
    }
  }
  const cmp = compareLayoutFidelity(plan, harvest.rects, opts)
  if (!cmp.ok) {
    return {
      ok: false,
      errors: cmp.errors,
      compared: cmp.compared,
      source: harvest.source,
      missingHarvest: false,
    }
  }
  return { ok: true, compared: cmp.compared, source: harvest.source }
}
