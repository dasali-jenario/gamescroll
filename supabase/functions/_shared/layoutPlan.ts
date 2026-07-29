/** Deno copy of src/lib/layoutPlan.ts — keep in sync via `node scripts/sync-shared.mjs`. */

export type LayoutBand = 'hud' | 'title' | 'focal' | 'hint' | 'cta' | 'other'

export type LayoutRect = {
  id: string
  /** Fraction of W (0–1) */
  x: number
  /** Fraction of H (0–1) */
  y: number
  /** Fraction of W (0–1) */
  w: number
  /** Fraction of H (0–1) */
  h: number
  band: LayoutBand
}

export type LayoutPlanResult =
  | { ok: true; plan: LayoutRect[] }
  | { ok: false; errors: string[]; plan: LayoutRect[] }

/** Pixel rect produced by layoutFromPlan (plus original band). */
export type PlanPixelRect = {
  x: number
  y: number
  w: number
  h: number
  band: LayoutBand
}

const BANDS = new Set<LayoutBand>(['hud', 'title', 'focal', 'hint', 'cta', 'other'])

const REF_W = 390
const REF_H = 844
/** Minimum gap between non-overlapping UI groups (px on reference frame). */
const MIN_GAP_PX = 12

/**
 * Authoritative plan → pixel rects keyed by id.
 * Injected on GS in the wrap shell / smoke host as GS.layoutFromPlan(plan, W, H).
 */
export function layoutFromPlan(
  plan: LayoutRect[],
  W: number,
  H: number,
): Record<string, PlanPixelRect> {
  const out: Record<string, PlanPixelRect> = {}
  for (const r of plan) {
    out[r.id] = {
      x: r.x * W,
      y: r.y * H,
      w: r.w * W,
      h: r.h * H,
      band: r.band,
    }
  }
  return out
}

/** Runtime snippet assigned onto GS in wrap / smoke / harvest. */
export const LAYOUT_FROM_PLAN_JS = `function(plan, w, h) {
  var out = {}, ww = w != null ? w : 0, hh = h != null ? h : 0, i, r
  if (!Array.isArray(plan)) return out
  for (i = 0; i < plan.length; i++) {
    r = plan[i]
    if (!r || typeof r.id !== 'string') continue
    out[r.id] = {
      x: Number(r.x) * ww,
      y: Number(r.y) * hh,
      w: Number(r.w) * ww,
      h: Number(r.h) * hh,
      band: r.band || 'other'
    }
  }
  return out
}`

export function parseLayoutPlan(raw: unknown): LayoutRect[] {
  if (!Array.isArray(raw)) return []
  const out: LayoutRect[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id.trim() : ''
    const x = Number(o.x)
    const y = Number(o.y)
    const w = Number(o.w)
    const h = Number(o.h)
    const band = (typeof o.band === 'string' ? o.band : 'other') as LayoutBand
    if (!id || ![x, y, w, h].every((n) => Number.isFinite(n))) continue
    out.push({
      id: id.slice(0, 40),
      x,
      y,
      w,
      h,
      band: BANDS.has(band) ? band : 'other',
    })
  }
  return out
}

function tooClose(a: LayoutRect, b: LayoutRect, gapX: number, gapY: number): boolean {
  return !(
    a.x + a.w + gapX <= b.x ||
    b.x + b.w + gapX <= a.x ||
    a.y + a.h + gapY <= b.y ||
    b.y + b.h + gapY <= a.y
  )
}

/** Validate fractional layout plan against portrait safe areas + non-overlap. */
export function validateLayoutPlan(raw: unknown): LayoutPlanResult {
  const plan = parseLayoutPlan(raw)
  const errors: string[] = []
  if (plan.length === 0) {
    return {
      ok: false,
      errors: ['layoutPlan is required (array of {id,x,y,w,h,band} in 0–1 fractions of W/H)'],
      plan,
    }
  }

  const gapX = MIN_GAP_PX / REF_W
  const gapY = MIN_GAP_PX / REF_H

  for (const r of plan) {
    if (r.w <= 0 || r.h <= 0) errors.push(`layoutPlan "${r.id}" has non-positive size`)
    if (r.x < 0 || r.y < 0 || r.x + r.w > 1.02 || r.y + r.h > 1.02) {
      errors.push(`layoutPlan "${r.id}" escapes the 0–1 playfield`)
    }
    if (r.band === 'cta') {
      const cy = r.y + r.h / 2
      if (cy < 0.62 || cy > 0.9) {
        errors.push(`layoutPlan CTA "${r.id}" should sit in the lower third (center y ≈ 0.68–0.82)`)
      }
      if (r.h * REF_H < 48) {
        errors.push(`layoutPlan CTA "${r.id}" hit target is shorter than 48px`)
      }
    }
    if (r.band === 'focal') {
      const cy = r.y + r.h / 2
      if (cy < 0.22 || cy > 0.65) {
        errors.push(`layoutPlan focal "${r.id}" should sit in the center band (y ≈ 0.28–0.58)`)
      }
    }
    if (r.band !== 'hud' && r.y < 0.08 && r.h > 0.04) {
      errors.push(`layoutPlan "${r.id}" sits under the in-game score HUD (keep y ≳ 0.10)`)
    }
    if (r.band === 'cta' || r.band === 'focal') {
      if (r.x < 0.02 || r.x + r.w > 0.98) {
        errors.push(`layoutPlan "${r.id}" should keep ≥2% side margin from the playfield edge`)
      }
    }
  }

  for (let i = 0; i < plan.length; i++) {
    for (let j = i + 1; j < plan.length; j++) {
      const a = plan[i]
      const b = plan[j]
      // Allow nested/contained pairs only if one is marked hud (rare); otherwise require gap.
      if (tooClose(a, b, gapX, gapY)) {
        errors.push(`layoutPlan "${a.id}" overlaps "${b.id}" (need ≥${MIN_GAP_PX}px gap)`)
      }
    }
  }

  return errors.length ? { ok: false, errors, plan } : { ok: true, plan }
}

/** ASCII wireframe for critique / logs (reference 39×20 cells). */
export function layoutPlanAscii(plan: LayoutRect[], cols = 39, rows = 20): string {
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'))
  const marks = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const legend: string[] = []
  plan.forEach((r, i) => {
    const mark = marks[i % marks.length]
    legend.push(`${mark}=${r.id}(${r.band})`)
    const x0 = Math.max(0, Math.min(cols - 1, Math.floor(r.x * cols)))
    const y0 = Math.max(0, Math.min(rows - 1, Math.floor(r.y * rows)))
    const x1 = Math.max(x0, Math.min(cols - 1, Math.floor((r.x + r.w) * cols) - 1))
    const y1 = Math.max(y0, Math.min(rows - 1, Math.floor((r.y + r.h) * rows) - 1))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        grid[y][x] = mark
      }
    }
  })
  return [
    `layout wireframe ${cols}x${rows} (top=HUD):`,
    ...grid.map((row) => row.join('')),
    legend.join(' · '),
  ].join('\n')
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
    }
  }
  return (c ^ 0xffffffff) >>> 0
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const len = u32be(data.length)
  const body = new Uint8Array(typeBytes.length + data.length)
  body.set(typeBytes, 0)
  body.set(data, typeBytes.length)
  const crc = u32be(crc32(body))
  const out = new Uint8Array(4 + body.length + 4)
  out.set(len, 0)
  out.set(body, 4)
  out.set(crc, 4 + body.length)
  return out
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  await writer.write(data)
  await writer.close()
  const reader = cs.readable.getReader()
  const parts: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) parts.push(value)
  }
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

const BAND_RGB: Record<LayoutBand, [number, number, number]> = {
  hud: [40, 40, 50],
  title: [70, 120, 200],
  focal: [46, 196, 182],
  hint: [180, 180, 100],
  cta: [231, 111, 81],
  other: [120, 120, 140],
}

/**
 * Tiny RGB PNG preview of the layout plan for vision QA (Edge-friendly, no Playwright).
 */
export async function renderLayoutPreviewPng(
  plan: LayoutRect[],
  width = 195,
  height = 422,
): Promise<Uint8Array> {
  const raw = new Uint8Array((width * 3 + 1) * height)
  const bg = [26, 27, 38]
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3
      raw[i] = bg[0]
      raw[i + 1] = bg[1]
      raw[i + 2] = bg[2]
    }
  }
  // Safe-area guides
  const top = Math.floor(0.12 * height)
  const bot = Math.floor(0.9 * height)
  for (let x = 0; x < width; x++) {
    for (const y of [top, bot]) {
      const i = y * (width * 3 + 1) + 1 + x * 3
      raw[i] = 60
      raw[i + 1] = 60
      raw[i + 2] = 80
    }
  }
  for (const r of plan) {
    const [cr, cg, cb] = BAND_RGB[r.band] || BAND_RGB.other
    const x0 = Math.max(0, Math.floor(r.x * width))
    const y0 = Math.max(0, Math.floor(r.y * height))
    const x1 = Math.min(width - 1, Math.floor((r.x + r.w) * width))
    const y1 = Math.min(height - 1, Math.floor((r.y + r.h) * height))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * (width * 3 + 1) + 1 + x * 3
        const edge = x === x0 || x === x1 || y === y0 || y === y1
        raw[i] = edge ? 255 : cr
        raw[i + 1] = edge ? 255 : cg
        raw[i + 2] = edge ? 255 : cb
      }
    }
  }
  const compressed = await deflate(raw)
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = new Uint8Array(13)
  ihdr.set(u32be(width), 0)
  ihdr.set(u32be(height), 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const parts = [
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', new Uint8Array()),
  ]
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  // btoa available in browsers + Deno
  return btoa(s)
}
