#!/usr/bin/env node
/**
 * Background / CI check: smoke + layout fidelity for approved user UGC in Supabase.
 *
 * Requires .env.local: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN
 * Usage: node scripts/check-ugc-games.mjs
 * Exit 1 if any game fails smoke, or fails layout fidelity when a harvest graph exists.
 * Missing harvest is reported (Phase 0 soft) but does not fail the run yet — Phase 1 hardens this.
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

// Load smoke + fidelity via TypeScript strip-types
const smokeUrl = pathToFileURL(join(root, 'src/lib/gameSmoke.ts')).href
const fidelityUrl = pathToFileURL(join(root, 'src/lib/layoutFidelity.ts')).href
const { smokeGameBody } = await import(smokeUrl)
const { checkBodyLayoutFidelity } = await import(fidelityUrl)

function parsePlan(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw)
      return Array.isArray(j) ? j : []
    } catch {
      return []
    }
  }
  return []
}

const { res, json, text } = await managementFetch(
  `/projects/${projectRef}/database/query`,
  accessToken,
  {
    method: 'POST',
    body: JSON.stringify({
      query: `
select slug, title, status, source, html_path,
       brief->>'bodyJs' as body_js,
       brief->'layoutPlan' as layout_plan
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
let missingHarvest = 0
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
  if (!result.ok) {
    failed += 1
    console.error(`FAIL ${row.slug} (${row.title})`)
    for (const e of result.errors) console.error(`     - ${e}`)
    continue
  }

  const plan = parsePlan(row.layout_plan)
  if (!plan.length) {
    missingHarvest += 1
    console.log(`OK   ${row.slug} (${row.title}) [no layoutPlan — fidelity skipped]`)
    continue
  }
  const fidelity = checkBodyLayoutFidelity(body, plan)
  if (fidelity.ok) {
    console.log(
      `OK   ${row.slug} (${row.title}) [fidelity ${fidelity.compared} via ${fidelity.source}]`,
    )
    continue
  }
  if (!fidelity.ok && fidelity.missingHarvest) {
    missingHarvest += 1
    console.log(`WARN ${row.slug} (${row.title}) [no harvest graph — Phase 0 soft]`)
    continue
  }
  failed += 1
  console.error(`FAIL ${row.slug} (${row.title}) [layout fidelity]`)
  for (const e of fidelity.errors || []) console.error(`     - ${e}`)
}

if (missingHarvest) {
  console.log(`[check-ugc] ${missingHarvest} game(s) without harvest/plan (Phase 0 soft)`)
}
if (failed) {
  console.error(`[check-ugc] ${failed} failure(s)`)
  process.exit(1)
}
console.log('[check-ugc] all clear')
