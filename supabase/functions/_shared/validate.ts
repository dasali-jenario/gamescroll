/** Deno copy of src/lib/gameValidator.ts — keep in sync. */

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

export const MAX_HTML_BYTES = 350_000
export const MAX_BODY_BYTES = 120_000

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] }

export function validateGameBody(body: string): ValidationResult {
  const errors: string[] = []
  if (!body.trim()) errors.push('game body is empty')
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
    errors.push(`game body exceeds ${MAX_BODY_BYTES} bytes`)
  }
  for (const { re, reason } of FORBIDDEN_PATTERNS) {
    if (re.test(body)) errors.push(reason)
  }
  if (!/\bfunction\s+tick\b/.test(body) && !/\btick\s*=\s*function\b/.test(body)) {
    errors.push('game body must define tick(dt)')
  }
  if (!/\bfunction\s+draw\b/.test(body) && !/\bdraw\s*=\s*function\b/.test(body)) {
    errors.push('game body must define draw(now)')
  }
  if (!/\bfunction\s+die\b/.test(body) && !/\bdie\s*=\s*function\b/.test(body)) {
    errors.push('game body must define die()')
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
  for (const { re, reason } of FORBIDDEN_PATTERNS) {
    if (re.test(html)) errors.push(reason)
  }
  return errors.length ? { ok: false, errors } : { ok: true }
}
