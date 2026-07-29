#!/usr/bin/env node
/**
 * Phase 0 baseline: sample recent user UGC drafts/published/approved rows,
 * run smoke + layout fidelity, classify failures, print creator metrics.
 *
 * Requires .env.local: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN
 * Usage: node --experimental-strip-types scripts/baseline-ugc-layout.mjs [--limit=40]
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 40) || 40)

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

const smokeUrl = pathToFileURL(join(root, 'src/lib/gameSmoke.ts')).href
const fidelityUrl = pathToFileURL(join(root, 'src/lib/layoutFidelity.ts')).href
const metricsUrl = pathToFileURL(join(root, 'src/lib/creatorMetrics.ts')).href
const { smokeGameBody } = await import(smokeUrl)
const { checkBodyLayoutFidelity } = await import(fidelityUrl)
const { summarizeCreatorBaseline, classifyGateErrors } = await import(metricsUrl)

const { res, json, text } = await managementFetch(
  `/projects/${projectRef}/database/query`,
  accessToken,
  {
    method: 'POST',
    body: JSON.stringify({
      query: `
select slug, title, status, source,
       brief, conversation,
       brief->>'bodyJs' as body_js,
       brief->'layoutPlan' as layout_plan
from public.ugc_games
where source = 'user'
  and status in ('draft', 'published', 'approved')
order by updated_at desc
limit ${limit}
`,
    }),
  },
)
if (!res.ok) {
  console.error('Query failed:', text.slice(0, 500))
  process.exit(1)
}

const rows = Array.isArray(json) ? json : []
console.log(`[baseline-ugc] sampling ${rows.length} user game(s) (limit=${limit})`)

const { res: keysRes, json: keysJson } = await managementFetch(
  `/projects/${projectRef}/api-keys`,
  accessToken,
)
void keysRes
const list = Array.isArray(keysJson) ? keysJson : keysJson?.api_keys || []
const serviceKey =
  list.find((k) => k.name === 'service_role')?.api_key ||
  list.find((k) => String(k.name).toLowerCase().includes('service'))?.api_key
const supabaseUrl =
  env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`

const samples = []
for (const row of rows) {
  let body = row.body_js || ''
  let brief = row.brief
  if (typeof brief === 'string') {
    try {
      brief = JSON.parse(brief)
    } catch {
      brief = null
    }
  }
  if (!body && brief?.bodyJs) body = brief.bodyJs
  if (!body && row.html_path && serviceKey) {
    const url = `${supabaseUrl}/storage/v1/object/ugc-games/${row.html_path}`
    const dl = await fetch(url, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    })
    if (dl.ok) body = extractBodyFromHtml(await dl.text()) || ''
  }

  const plan = parsePlan(row.layout_plan ?? brief?.layoutPlan)
  const smoke = body ? smokeGameBody(body) : { ok: false, errors: ['no bodyJs'] }
  const fidelity =
    body && plan.length
      ? checkBodyLayoutFidelity(body, plan)
      : {
          ok: false,
          errors: plan.length ? ['no bodyJs'] : ['no layoutPlan'],
          compared: 0,
          source: null,
          missingHarvest: true,
        }

  const checkErrors = smoke.ok ? [] : smoke.errors
  const fidelityErrors = fidelity.ok ? [] : fidelity.errors || []
  const missingHarvest = Boolean(!fidelity.ok && fidelity.missingHarvest)

  samples.push({
    slug: row.slug,
    status: row.status,
    brief,
    conversation: row.conversation,
    checkOk: smoke.ok,
    checkErrors,
    fidelityOk: fidelity.ok,
    fidelityErrors,
    missingHarvest,
  })

  const classes = classifyGateErrors([
    ...checkErrors,
    ...fidelityErrors,
    ...(missingHarvest ? ['no harvest'] : []),
  ])
  const tag = smoke.ok && (fidelity.ok || missingHarvest) ? 'SOFT' : smoke.ok ? 'FAIL' : 'FAIL'
  const pathHint =
    brief?.buildPath ||
    (['reaction', 'timing', 'dodge', 'drag', 'stack'].includes(brief?.mechanic)
      ? 'arcade'
      : brief?.mechanic
        ? 'freeform'
        : '?')
  console.log(
    `${tag} ${row.slug} [${row.status}] path=${pathHint} classes=${classes.join(',')}` +
      (missingHarvest ? ' (no harvest)' : ''),
  )
}

const report = summarizeCreatorBaseline(samples)
console.log('\n[baseline-ugc] report')
console.log(JSON.stringify(report, null, 2))
console.log(
  `\nOverall first-build pass ≥ ${report.targetFirstBuildPass * 100}% → ` +
    (report.meetsTarget == null
      ? 'n/a'
      : report.meetsTarget
        ? 'MET'
        : 'NOT MET'),
)
console.log(
  `Arcade layout pass (n=${report.arcadeSampleSize}) ≥ ${report.targetFirstBuildPass * 100}% → ` +
    (report.meetsArcadeTarget == null
      ? 'n/a'
      : report.meetsArcadeTarget
        ? 'MET'
        : 'NOT MET'),
)
console.log(
  `Freeform playable pass (n=${report.freeformSampleSize}) → ` +
    (report.freeformPassRate == null
      ? 'n/a'
      : `${Math.round(report.freeformPassRate * 100)}% (informational; may need more turns)`),
)
