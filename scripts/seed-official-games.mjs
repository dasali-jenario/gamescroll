#!/usr/bin/env node
/**
 * Applies the ugc_source migration + seeds official catalog rows, then uploads
 * public/games/<id>.html into the ugc-games Storage bucket as official/<id>.html.
 *
 * Required in .env.local:
 *   SUPABASE_PROJECT_REF
 *   SUPABASE_ACCESS_TOKEN
 *
 * Usage: node scripts/seed-official-games.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

function redact(text, secrets) {
  let out = String(text || '')
  for (const s of secrets) {
    if (s && s.length > 3) out = out.split(s).join('***')
  }
  return out
}

function log(msg) {
  console.log(`[seed-official] ${msg}`)
}

function readAccessTokenFromHome() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN
  const tokenPath = join(process.env.HOME || '', '.supabase', 'access-token')
  if (existsSync(tokenPath)) return readFileSync(tokenPath, 'utf8').trim()
  return null
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

if (!existsSync(envPath)) {
  console.error('Missing .env.local')
  process.exit(1)
}

const env = parseEnv(readFileSync(envPath, 'utf8'))
const projectRef = env.SUPABASE_PROJECT_REF
const secrets = [
  env.SUPABASE_DB_PASSWORD,
  env.OPENAI_API_KEY,
  env.VITE_SUPABASE_ANON_KEY,
  env.SUPABASE_ACCESS_TOKEN,
].filter(Boolean)

if (!projectRef) {
  console.error('Need SUPABASE_PROJECT_REF in .env.local')
  process.exit(1)
}

const accessToken =
  env.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  readAccessTokenFromHome()
if (!accessToken) {
  console.error('No Supabase access token')
  process.exit(1)
}

const migrationPath = join(
  root,
  'supabase/migrations/20260727130000_ugc_games_source.sql',
)
log('Applying source + official seed migration…')
{
  const sql = readFileSync(migrationPath, 'utf8')
  const { res, text } = await managementFetch(
    `/projects/${projectRef}/database/query`,
    accessToken,
    { method: 'POST', body: JSON.stringify({ query: sql }) },
  )
  if (!res.ok) {
    throw new Error(
      `Migration failed (${res.status}): ${redact(text, secrets).slice(0, 1200)}`,
    )
  }
  log('Migration + row seed OK')
}

log('Fetching service role key…')
let serviceKey = null
{
  const { res, json, text } = await managementFetch(
    `/projects/${projectRef}/api-keys`,
    accessToken,
  )
  if (!res.ok) {
    throw new Error(
      `api-keys failed (${res.status}): ${redact(text, secrets).slice(0, 500)}`,
    )
  }
  const list = Array.isArray(json) ? json : json?.api_keys || []
  serviceKey =
    list.find((k) => k.name === 'service_role')?.api_key ||
    list.find((k) => String(k.name).toLowerCase().includes('service'))?.api_key
  if (!serviceKey) {
    throw new Error(
      `Could not find service_role key (${list.map((k) => k.name).join(',')})`,
    )
  }
  secrets.push(serviceKey)
}

const supabaseUrl =
  env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`
const gamesDir = join(root, 'public/games')
const files = readdirSync(gamesDir).filter((f) => f.endsWith('.html'))
log(`Uploading ${files.length} official HTML files to Storage…`)

let uploaded = 0
for (const file of files) {
  const id = file.replace(/\.html$/, '')
  const path = `official/${id}.html`
  const body = readFileSync(join(gamesDir, file))
  const url = `${supabaseUrl}/storage/v1/object/ugc-games/${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'text/html; charset=utf-8',
      'x-upsert': 'true',
    },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `Upload ${path} failed (${res.status}): ${redact(text, secrets).slice(0, 400)}`,
    )
  }
  uploaded += 1
}

log(`Uploaded ${uploaded} files`)

// Point html_url at the public play endpoint for each official slug
log('Setting html_url on official rows…')
{
  const sql = `
update public.ugc_games
set html_url = '${supabaseUrl}/functions/v1/ugc-play?slug=' || slug,
    updated_at = now()
where source = 'official';
`
  const { res, text } = await managementFetch(
    `/projects/${projectRef}/database/query`,
    accessToken,
    { method: 'POST', body: JSON.stringify({ query: sql }) },
  )
  if (!res.ok) {
    throw new Error(
      `html_url update failed (${res.status}): ${redact(text, secrets).slice(0, 800)}`,
    )
  }
}

{
  const { res, json, text } = await managementFetch(
    `/projects/${projectRef}/database/query`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        query: `select source, count(*)::int as n from public.ugc_games group by source order by source`,
      }),
    },
  )
  if (!res.ok) {
    log(`Count check warning: ${redact(text, secrets).slice(0, 300)}`)
  } else {
    log(`Counts: ${JSON.stringify(json)}`)
  }
}

log('Done.')
