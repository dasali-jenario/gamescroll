#!/usr/bin/env node
/**
 * Hotfix Race Start Lights UGC: personal best (lowest ms) + drop F1 branding.
 *
 * Usage: node --experimental-strip-types scripts/fix-race-start-lights.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { wrapGameHtml } from '../src/lib/gameWrap.ts'
import { smokeGameBody } from '../src/lib/gameSmoke.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')
const SLUG = 'race-start-reaction-3be720bf'
const TITLE = 'Race Start Lights'
const TIP = 'Wait for the greens, then tap fast!'
const NEW_PATH = `${SLUG}/v6-race-start-lights.html`

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

async function managementFetch(path, token, init = {}) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* ignore */
  }
  return { res, text, json }
}

export const FIXED_BODY = `
    const BEST_KEY = 'gs_race_start_lights_best_ms'
    let phase = 'idle' // idle | sequence | hold | go | result | foul
    let seqLit = 0
    let seqTimer = 0
    let holdLeft = 0
    let reactAt = 0
    let lastMs = 0
    let bestMs = 0
    const btn = { x: 0, y: 0, w: 0, h: 0 }
    const gantry = { x: 0, y: 0, w: 0, h: 0, r: 0, gapX: 0, gapY: 0 }
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
    function layout() {
      const s = Math.min(W, H)
      gantry.r = Math.max(14, Math.min(28, s * 0.055))
      gantry.gapX = gantry.r * 2.55
      gantry.gapY = gantry.r * 2.55
      gantry.w = gantry.gapX * 4 + gantry.r * 3.4
      gantry.h = gantry.gapY + gantry.r * 3.6
      gantry.x = (W - gantry.w) / 2
      gantry.y = H * 0.34
      btn.w = Math.min(300, Math.max(210, W * 0.7))
      btn.h = Math.max(52, Math.min(66, H * 0.07))
      btn.x = (W - btn.w) / 2
      btn.y = Math.min(H * 0.78, gantry.y + gantry.h + H * 0.16)
    }
    function onResize() { layout() }
    function diePos() { return [W * 0.5, gantry.y + gantry.h * 0.55] }
    function scorePos() { return [W * 0.5, H * 0.1] }
    function reset() {
      phase = 'idle'
      seqLit = 0
      seqTimer = 0
      holdLeft = 0
      reactAt = 0
      lastMs = 0
      bestMs = loadBest() || bestMs
      setScore(bestMs)
      layout()
    }
    function onHostStart() { reset() }
    function die() { phase = 'foul'; holdLeft = 1.35 }
    function hitBtn(x, y) {
      return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h
    }
    function startSequence() {
      phase = 'sequence'
      seqLit = 0
      seqTimer = 0
      // Light 1 on immediately, then +1 each second
      seqLit = 1
      seqTimer = 1
    }
    function tick(dt) {
      if (GS.paused) return
      if (phase === 'sequence') {
        seqTimer -= dt
        if (seqTimer <= 0) {
          if (seqLit < 5) {
            seqLit += 1
            seqTimer = 1
          }
          if (seqLit >= 5) {
            phase = 'hold'
            holdLeft = 0.2 + Math.random() * 2.8
          }
        }
      } else if (phase === 'hold') {
        holdLeft -= dt
        if (holdLeft <= 0) {
          phase = 'go'
          reactAt = performance.now()
        }
      } else if (phase === 'foul') {
        holdLeft -= dt
        if (holdLeft <= 0) reset()
      }
    }
    function rr(x, y, w, h, rad) {
      const r = Math.min(rad, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }
    function drawLamp(cx, cy, r, on, hot, mid, off, glow) {
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2)
      ctx.fillStyle = '#0a0b0e'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2)
      ctx.fillStyle = on ? '#3a404c' : '#262b34'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = on ? mid : off
      if (on) {
        ctx.shadowColor = glow
        ctx.shadowBlur = r * 1.7
      }
      ctx.fill()
      ctx.shadowBlur = 0
      if (on) {
        ctx.beginPath()
        ctx.arc(cx - r * 0.08, cy - r * 0.1, r * 0.55, 0, Math.PI * 2)
        ctx.fillStyle = hot
        ctx.globalAlpha = 0.9
        ctx.fill()
        ctx.globalAlpha = 1
      } else {
        ctx.beginPath()
        ctx.arc(cx + r * 0.08, cy + r * 0.12, r * 0.72, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fill()
      }
      ctx.beginPath()
      ctx.ellipse(cx - r * 0.28, cy - r * 0.32, r * 0.34, r * 0.18, -0.5, 0, Math.PI * 2)
      ctx.fillStyle = on ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)'
      ctx.fill()
    }
    function lampCenter(i, row) {
      const cx = gantry.x + gantry.r * 1.7 + i * gantry.gapX
      const cy = gantry.y + gantry.r * 1.7 + row * gantry.gapY
      return [cx, cy]
    }
    function drawGantry() {
      const pad = gantry.r * 0.55
      const hx = gantry.x - pad
      const hy = gantry.y - pad
      const hw = gantry.w + pad * 2
      const hh = gantry.h + pad * 2
      const poleW = Math.max(8, gantry.r * 0.35)
      rr(hx + hw * 0.08, hy + hh - 2, poleW, Math.max(20, btn.y - (hy + hh) - 8), poleW * 0.2)
      ctx.fillStyle = '#2a303a'
      ctx.fill()
      rr(hx + hw * 0.92 - poleW, hy + hh - 2, poleW, Math.max(20, btn.y - (hy + hh) - 8), poleW * 0.2)
      ctx.fillStyle = '#2a303a'
      ctx.fill()
      rr(hx + 4, hy + 6, hw, hh, gantry.r * 0.35)
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fill()
      rr(hx, hy, hw, hh, gantry.r * 0.35)
      ctx.fillStyle = '#1a1e26'
      ctx.fill()
      ctx.save()
      rr(hx, hy, hw, hh, gantry.r * 0.35)
      ctx.clip()
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      ctx.fillRect(hx, hy, hw, hh * 0.22)
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.fillRect(hx, hy + hh * 0.55, hw, hh * 0.45)
      ctx.restore()
      rr(hx, hy, hw, hh, gantry.r * 0.35)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = Math.max(1.5, gantry.r * 0.08)
      ctx.stroke()
      rr(hx + hw * 0.2, hy - gantry.r * 0.35, hw * 0.6, gantry.r * 0.42, gantry.r * 0.12)
      ctx.fillStyle = '#11141a'
      ctx.fill()

      const redOnCount = (phase === 'sequence' || phase === 'hold') ? seqLit
        : (phase === 'go' || phase === 'result') ? 0
        : (phase === 'foul') ? seqLit
        : 0
      const greenOn = phase === 'go' || phase === 'result'
      const pulse = phase === 'go' ? 1 + Math.sin(PF.t * 14) * 0.03 : 1

      for (let i = 0; i < 5; i++) {
        const [cx, cy] = lampCenter(i, 0)
        drawLamp(cx, cy, gantry.r, i < redOnCount, '#ff8585', '#e10600', '#3a1212', '#ff1a1a')
      }
      for (let i = 0; i < 5; i++) {
        const [cx, cy] = lampCenter(i, 1)
        drawLamp(cx, cy, gantry.r * pulse, greenOn, '#b8ffb8', '#00c853', '#0f2a16', '#39e639')
      }
    }
    function draw() {
      if (!btn.w) layout()
      PF.sky(ctx, W, H, '#0a0c10', '#12161e', '#1a2030')
      PF.blobs(ctx, W, H, '#1e2430', 3)
      drawGantry()
      const msgY = (gantry.y + gantry.h + btn.y) * 0.5
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '700 ' + Math.round(Math.min(W, H) * 0.04) + 'px "Segoe UI", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      let msg = ''
      if (phase === 'idle') msg = 'Tap START'
      else if (phase === 'sequence') msg = 'Lights…'
      else if (phase === 'hold') msg = 'Ready…'
      else if (phase === 'go') msg = 'GO!'
      else if (phase === 'foul') msg = 'Jump start!'
      else if (phase === 'result') msg = lastMs + ' ms'
      ctx.fillText(msg, W / 2, msgY)
      ctx.font = '700 ' + Math.round(Math.min(W, H) * 0.028) + 'px "Segoe UI", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.72)'
      ctx.fillText(
        bestMs > 0 ? ('My best ' + bestMs + ' ms') : 'Lower time is better',
        W / 2,
        msgY + Math.min(W, H) * 0.045
      )
      let label = ''
      if (phase === 'idle') label = 'START'
      else if (phase === 'go') label = 'TAP!'
      else if (phase === 'result' || phase === 'foul') label = 'RESTART'
      if (label) {
        PF.block(ctx, btn.x, btn.y, btn.w, btn.h, '#2a3140', '#3d4658', btn.h * 0.44)
        ctx.fillStyle = '#fff'
        ctx.font = '700 ' + Math.round(btn.h * 0.42) + 'px "Segoe UI", sans-serif'
        ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h * 0.52)
      }
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }
    addEventListener('pointerdown', (e) => {
      if (GS.paused) return
      const r = canvas.getBoundingClientRect()
      const x = (e.clientX - r.left) * (W / r.width)
      const y = (e.clientY - r.top) * (H / r.height)
      if (phase === 'idle' && hitBtn(x, y)) {
        startSequence()
        return
      }
      if (phase === 'sequence' || phase === 'hold') {
        die()
        return
      }
      if (phase === 'go') {
        lastMs = Math.max(1, Math.round(performance.now() - reactAt))
        if (!bestMs || lastMs < bestMs) {
          bestMs = lastMs
          saveBest(bestMs)
        }
        reportBest(lastMs)
        if (window.Juice) Juice.burst(W * 0.5, gantry.y + gantry.h * 0.7)
        phase = 'result'
        return
      }
      if ((phase === 'result' || phase === 'foul') && hitBtn(x, y)) reset()
    })
    reset()
`

async function main() {
  if (!existsSync(envPath)) {
    console.error('Missing .env.local')
    process.exit(1)
  }
  const smoke = smokeGameBody(FIXED_BODY)
  if (!smoke.ok) {
    console.error('smoke failed', smoke.errors)
    process.exit(1)
  }
  console.log('smoke OK')

  const env = parseEnv(readFileSync(envPath, 'utf8'))
  const projectRef = env.SUPABASE_PROJECT_REF
  const accessToken = env.SUPABASE_ACCESS_TOKEN
  if (!projectRef || !accessToken) {
    console.error('Need SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN')
    process.exit(1)
  }

  const { res, json } = await managementFetch(
    `/projects/${projectRef}/api-keys`,
    accessToken,
  )
  if (!res.ok) {
    console.error('api-keys failed', res.status, json || '')
    process.exit(1)
  }
  const list = Array.isArray(json) ? json : json?.api_keys || []
  const serviceKey = list.find((k) => k.name === 'service_role')?.api_key
  if (!serviceKey) {
    console.error('no service_role key', list.map((k) => k.name))
    process.exit(1)
  }

  const supabaseUrl = env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: row, error } = await admin
    .from('ugc_games')
    .select('id, slug, title, tip, accent, html_path, brief')
    .eq('slug', SLUG)
    .maybeSingle()
  if (error || !row) throw new Error(error?.message || 'row missing')

  const html = wrapGameHtml({
    title: TITLE,
    bg: (row.brief && row.brief.bg) || '#181b22',
    body: FIXED_BODY,
    accent: row.accent || '#39e639',
    libBase: 'https://play.thehappylab.com',
  })

  const { error: upErr } = await admin.storage
    .from('ugc-games')
    .upload(NEW_PATH, new Blob([html], { type: 'text/html;charset=utf-8' }), {
      upsert: true,
      contentType: 'text/html;charset=utf-8',
    })
  if (upErr) throw new Error(upErr.message)

  const brief = {
    ...(row.brief || {}),
    bodyJs: FIXED_BODY,
    bg: (row.brief && row.brief.bg) || '#181b22',
  }
  const { error: updErr } = await admin
    .from('ugc_games')
    .update({
      title: TITLE,
      tip: TIP,
      brief,
      html_path: NEW_PATH,
      html_url:
        supabaseUrl +
        '/functions/v1/ugc-play?slug=' +
        encodeURIComponent(SLUG),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
  if (updErr) throw new Error(updErr.message)

  writeFileSync('/tmp/race-start-lights-new.html', html)
  const play = await fetch(
    supabaseUrl +
      '/functions/v1/ugc-play?slug=' +
      encodeURIComponent(SLUG) +
      '&v=' +
      Date.now(),
  )
  const text = await play.text()
  console.log('play', play.status, 'len', text.length)
  console.log(
    'title',
    text.includes('<title>Race Start Lights</title>'),
    'my best',
    text.includes('My best'),
    'F1 tip gone from HTML title',
    !text.includes('F1'),
  )
  console.log('Updated', SLUG, '→', TITLE, NEW_PATH)
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirect) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
