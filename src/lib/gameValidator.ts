/** Static checks for UGC game bodies / full HTML before publish. */

export const REQUIRED_BRIDGE_SNIPPETS = [
  'gamescroll:ready',
  'gamescroll:start',
  'gamescroll:pause',
  'gamescroll:score',
  'gamescroll:died',
  'gamescroll:swipe-next',
  'gamescroll:swipe-prev',
  'onFail',
] as const

const FORBIDDEN_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bfetch\s*\(/, reason: 'network fetch is not allowed' },
  { re: /\bXMLHttpRequest\b/, reason: 'XMLHttpRequest is not allowed' },
  { re: /\bWebSocket\b/, reason: 'WebSocket / multiplayer is not allowed' },
  { re: /\bRTCPeerConnection\b/, reason: 'WebRTC / multiplayer is not allowed' },
  { re: /\bEventSource\b/, reason: 'EventSource is not allowed' },
  { re: /\bnavigator\.sendBeacon\b/, reason: 'sendBeacon is not allowed' },
  { re: /\blocalStorage\b/, reason: 'localStorage / saved state is not allowed' },
  { re: /\bsessionStorage\b/, reason: 'sessionStorage is not allowed' },
  { re: /\bindexedDB\b/i, reason: 'indexedDB / saved state is not allowed' },
  { re: /\bopenDatabase\b/, reason: 'WebSQL is not allowed' },
  { re: /\bdocument\.cookie\b/, reason: 'cookies are not allowed' },
  { re: /\bimportScripts\s*\(/, reason: 'importScripts is not allowed' },
  { re: /\bWorker\s*\(/, reason: 'Workers are not allowed' },
  { re: /\bSharedWorker\s*\(/, reason: 'SharedWorker is not allowed' },
  { re: /\beval\s*\(/, reason: 'eval is not allowed' },
  { re: /\bnew\s+Function\s*\(/, reason: 'Function constructor is not allowed' },
  { re: /\bimport\s*\(/, reason: 'dynamic import is not allowed' },
]

/** Effects the host shell already drives; calling them again double-fires or breaks the loop. */
const HOST_OWNED_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bJuice\.init\s*\(/, reason: 'Juice.init is host-owned — remove the call' },
  { re: /\bJuice\.resize\s*\(/, reason: 'Juice.resize is host-owned — remove the call' },
  { re: /\bJuice\.update\s*\(/, reason: 'Juice.update is host-owned — remove the call' },
  {
    re: /\bJuice\.onScore\s*\(/,
    reason: 'bump() already fires Juice.onScore — do not call it directly',
  },
  {
    re: /\bJuice\.onDie\s*\(/,
    reason: 'die() already fires Juice.onDie — do not call it directly',
  },
  { re: /\bPF\.t\s*(\+|-|\*|\/)?=(?!=)/, reason: 'PF.t is advanced by the host loop — do not assign it' },
]

export const MAX_HTML_BYTES = 350_000
export const MAX_BODY_BYTES = 120_000

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] }

function hasFn(body: string, name: string): boolean {
  return (
    new RegExp(`\\bfunction\\s+${name}\\b`).test(body) ||
    new RegExp(`\\b${name}\\s*=\\s*function\\b`).test(body) ||
    new RegExp(`\\b${name}\\s*=\\s*\\(`).test(body) ||
    new RegExp(`\\bconst\\s+${name}\\s*=`).test(body) ||
    new RegExp(`\\blet\\s+${name}\\s*=`).test(body)
  )
}

export function validateGameBody(body: string): ValidationResult {
  const errors: string[] = []
  if (!body.trim()) errors.push('game body is empty')
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
    errors.push(`game body exceeds ${MAX_BODY_BYTES} bytes`)
  }
  for (const { re, reason } of FORBIDDEN_PATTERNS) {
    if (re.test(body)) errors.push(reason)
  }
  for (const { re, reason } of HOST_OWNED_PATTERNS) {
    if (re.test(body)) errors.push(reason)
  }
  if (!hasFn(body, 'tick')) {
    errors.push('game body must define tick(dt)')
  }
  if (!hasFn(body, 'draw')) {
    errors.push('game body must define draw(now)')
  }
  if (!hasFn(body, 'die')) {
    errors.push('game body must define die()')
  }
  if (!hasFn(body, 'layout')) {
    errors.push('game body must define layout() and size UI from W/H')
  }
  if (!hasFn(body, 'onHostStart')) {
    errors.push('game body must define onHostStart()')
  }
  if (!hasFn(body, 'onResize')) {
    errors.push('game body must define onResize() (usually call layout())')
  }
  if (!/\blayout\s*\(/.test(body)) {
    errors.push('game body must call layout() (from onHostStart / onResize / reset)')
  }
  if (
    !/\.addEventListener\s*\(\s*['"]pointerdown['"]/.test(body) &&
    !/\.addEventListener\s*\(\s*['"]pointerup['"]/.test(body) &&
    !/\.addEventListener\s*\(\s*['"]touchstart['"]/.test(body) &&
    !/addEventListener\s*\(\s*['"]pointerdown['"]/.test(body)
  ) {
    errors.push('game body must register pointerdown/touch input on canvas or window')
  }
  if (/\bcreateElement\s*\(\s*['"]button['"]/.test(body) || /\b<button\b/i.test(body)) {
    errors.push('do not create HTML buttons — draw UI on the canvas and hit-test taps')
  }
  // Pointer position used without canvas mapping → wrong hit tests on scaled/letterboxed canvases.
  if (
    /\.clientX|\.clientY/.test(body) &&
    !/\bgetBoundingClientRect\s*\(/.test(body)
  ) {
    errors.push(
      'map pointer coords with getBoundingClientRect (clientX/Y alone is not enough)',
    )
  }
  return errors.length ? { ok: false, errors } : { ok: true }
}

export function validateWrappedHtml(html: string): ValidationResult {
  const errors: string[] = []
  if (new TextEncoder().encode(html).length > MAX_HTML_BYTES) {
    errors.push(`HTML exceeds ${MAX_HTML_BYTES} bytes`)
  }
  for (const snippet of REQUIRED_BRIDGE_SNIPPETS) {
    if (!html.includes(snippet)) {
      errors.push(`missing bridge contract: ${snippet}`)
    }
  }
  // Re-scan full document for forbidden APIs (body + accidental extras).
  for (const { re, reason } of FORBIDDEN_PATTERNS) {
    if (re.test(html)) errors.push(reason)
  }
  return errors.length ? { ok: false, errors } : { ok: true }
}
