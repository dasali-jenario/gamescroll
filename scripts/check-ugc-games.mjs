#!/usr/bin/env node
/**
 * Background / CI check: smoke every approved user UGC game body in Supabase.
 *
 * Requires .env.local: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN
 * Usage: node scripts/check-ugc-games.mjs
 * Exit 1 if any game fails smoke (idle draw, letterbox, play).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')

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

function extractBodyFromHtml(html) {
  const marker = 'if (window.Juice) Juice.init'
  const i = html.indexOf(marker)
  if (i < 0) return null
  const afterInit = html.indexOf('\n', i)
  const end = html.search(
    /\n\s*(?:if \(typeof layout === 'function'\)|;?\(function \(\) \{\s*const __halt)/,
  )
  if (afterInit < 0 || end < 0 || end <= afterInit) return null
  return html.slice(afterInit + 1, end).trim()
}

if (!existsSync(envPath)) {
  console.error('Missing .env.local')
  process.exit(1)
}

const env = parseEnv(readFileSync(envPath, 'utf8'))
const projectRef = env.SUPABASE_PROJECT_REF
const accessToken = env.SUPABASE_ACCESS_TOKEN
if (!projectRef || !accessToken) {
  console.error('Need SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

// Load smoke via TypeScript strip-types
const smokeUrl = pathToFileURL(join(root, 'src/lib/gameSmoke.ts')).href
const { smokeGameBody } = await import(smokeUrl)

const { res, json, text } = await managementFetch(
  `/projects/${projectRef}/database/query`,
  accessToken,
  {
    method: 'POST',
    body: JSON.stringify({
      query: `
select slug, title, status, source, html_path, brief->>'bodyJs' as body_js
from public.ugc_games
where status = 'approved' and source = 'user'
order by updated_at desc
`,
    }),
  },
)
if (!res.ok) {
  console.error('Query failed:', text.slice(0, 500))
  process.exit(1)
}

const rows = Array.isArray(json) ? json : []
console.log(`[check-ugc] ${rows.length} approved user game(s)`)

const { res: keysRes, json: keysJson } = await managementFetch(
  `/projects/${projectRef}/api-keys`,
  accessToken,
)
const list = Array.isArray(keysJson) ? keysJson : keysJson?.api_keys || []
const serviceKey =
  list.find((k) => k.name === 'service_role')?.api_key ||
  list.find((k) => String(k.name).toLowerCase().includes('service'))?.api_key
const supabaseUrl =
  env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`

let failed = 0
for (const row of rows) {
  let body = row.body_js || ''
  if (!body && row.html_path && serviceKey) {
    const url = `${supabaseUrl}/storage/v1/object/ugc-games/${row.html_path}`
    const dl = await fetch(url, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    })
    if (dl.ok) {
      body = extractBodyFromHtml(await dl.text()) || ''
    }
  }
  if (!body) {
    console.error(`FAIL ${row.slug}: no bodyJs / HTML body`)
    failed += 1
    continue
  }
  const result = smokeGameBody(body)
  if (result.ok) {
    console.log(`OK   ${row.slug} (${row.title})`)
  } else {
    failed += 1
    console.error(`FAIL ${row.slug} (${row.title})`)
    for (const e of result.errors) console.error(`     - ${e}`)
  }
}

if (failed) {
  console.error(`[check-ugc] ${failed} failure(s)`)
  process.exit(1)
}
console.log('[check-ugc] all clear')
