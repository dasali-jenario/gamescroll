#!/usr/bin/env node
/**
 * Configures Supabase for Gamescroll from .env.local via the CLI / APIs.
 *
 * Required in .env.local:
 *   SUPABASE_PROJECT_REF
 *   SUPABASE_DB_PASSWORD
 * Optional:
 *   OPENAI_API_KEY, OPENAI_MODEL
 *   SUPABASE_ACCESS_TOKEN (else ~/.supabase/access-token)
 *   SUPABASE_DB_URL (override connection string)
 *
 * Usage: node scripts/setup-supabase.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
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

function upsertEnv(path, updates) {
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const lines = existing.split(/\n/)
  const keys = new Set(Object.keys(updates))
  const next = []
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=/)
    if (m && keys.has(m[1])) {
      next.push(`${m[1]}=${updates[m[1]]}`)
      keys.delete(m[1])
    } else {
      next.push(line)
    }
  }
  while (next.length && next[next.length - 1] === '') next.pop()
  for (const k of keys) next.push(`${k}=${updates[k]}`)
  next.push('')
  writeFileSync(path, next.join('\n'))
}

function redact(text, secrets) {
  let out = String(text || '')
  for (const s of secrets) {
    if (s && s.length > 3) out = out.split(s).join('***')
  }
  return out
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      SUPABASE_INTERNAL_NO_TELEMETRY: '1',
      ...(opts.accessToken
        ? { SUPABASE_ACCESS_TOKEN: opts.accessToken }
        : {}),
      ...opts.env,
    },
    stdio: opts.inherit ? 'inherit' : 'pipe',
  })
  if (res.status !== 0 && !opts.allowFail) {
    const err = redact(
      (res.stderr || res.stdout || '').trim(),
      opts.secrets || [],
    )
    throw new Error(
      `${cmd} ${opts.safeArgs || args.filter((a) => !opts.secrets?.includes(a)).join(' ')} failed:\n${err.slice(0, 2000)}`,
    )
  }
  return res
}

function log(msg) {
  console.log(`[setup-supabase] ${msg}`)
}

function maskRef(ref) {
  if (!ref || ref.length < 8) return '****'
  return `${ref.slice(0, 4)}…${ref.slice(-4)}`
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
const dbPassword = env.SUPABASE_DB_PASSWORD
const secrets = [
  dbPassword,
  env.OPENAI_API_KEY,
  env.VITE_SUPABASE_ANON_KEY,
  env.SUPABASE_ACCESS_TOKEN,
].filter(Boolean)

if (!projectRef || !dbPassword) {
  console.error('Need SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD in .env.local')
  process.exit(1)
}

log(`Target project ${maskRef(projectRef)}`)

const accessToken =
  env.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  readAccessTokenFromHome()
if (!accessToken) {
  console.error(
    'No Supabase access token. Add SUPABASE_ACCESS_TOKEN to .env.local (or run supabase login).',
  )
  process.exit(1)
}

// Verify the logged-in account can see this project
{
  const { res, json, text } = await managementFetch('/projects', accessToken)
  if (!res.ok) {
    throw new Error(`Cannot list projects (${res.status}): ${text.slice(0, 400)}`)
  }
  const projects = Array.isArray(json) ? json : json?.projects || []
  const match = projects.find((p) => p.id === projectRef || p.ref === projectRef)
  if (!match) {
    log('WARNING: project ref is not visible to the current Supabase CLI account.')
    log(
      `Visible projects: ${projects.map((p) => `${p.name}(${maskRef(p.id || p.ref)})`).join(', ') || '(none)'}`,
    )
    log('If you created the project under another account, run: supabase login')
  } else {
    log(`Found project "${match.name}" (${match.status || 'unknown'})`)
  }
}

log('Applying migrations via Management SQL API…')
{
  const migrationPath = join(root, 'supabase/migrations/20260723120000_ugc_games.sql')
  const migrationSql = readFileSync(migrationPath, 'utf8')
  const { res, text } = await managementFetch(
    `/projects/${projectRef}/database/query`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ query: migrationSql }),
    },
  )
  if (!res.ok) {
    const already =
      /already exists/i.test(text) ||
      text.includes('42710') ||
      text.includes('42P07')
    if (already) {
      log('Schema already present — skipping migration')
    } else {
      throw new Error(
        `Migration SQL failed (${res.status}): ${redact(text, secrets).slice(0, 800)}`,
      )
    }
  } else {
    log('Migration applied (ugc_games, moderators, storage policies)')
  }
}

log('Fetching API keys via Management API…')
{
  const { res, json, text } = await managementFetch(
    `/projects/${projectRef}/api-keys`,
    accessToken,
  )
  if (!res.ok) {
    throw new Error(
      `api-keys failed (${res.status}): ${redact(text, secrets).slice(0, 500)}\n` +
        'The CLI account likely lacks access to this project. Re-login as the project owner.',
    )
  }
  const list = Array.isArray(json) ? json : json?.api_keys || []
  const anon =
    list.find((k) => k.name === 'anon')?.api_key ||
    list.find((k) => String(k.name).toLowerCase().includes('anon'))?.api_key
  if (!anon) {
    throw new Error(`Could not find anon key in response (${list.map((k) => k.name).join(',')})`)
  }
  const supabaseUrl = `https://${projectRef}.supabase.co`
  upsertEnv(envPath, {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: anon,
  })
  log('Wrote VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local')
}

log('Linking project (for functions deploy)…')
{
  const link = run(
    'supabase',
    ['link', '--project-ref', projectRef, '-p', dbPassword, '--yes'],
    { allowFail: true, secrets: [dbPassword, accessToken], accessToken },
  )
  if (link.status !== 0) {
    log(
      `link warning: ${redact(link.stderr || link.stdout || '', secrets).slice(0, 300)}`,
    )
    log('Continuing with --project-ref for deploy…')
  } else {
    log('Linked OK')
  }
}

{
  const secretArgs = [
    'secrets',
    'set',
    '--project-ref',
    projectRef,
    'PUBLIC_SITE_URL=https://play.thehappylab.com',
  ]
  if (env.OPENAI_API_KEY) {
    secretArgs.push(`OPENAI_API_KEY=${env.OPENAI_API_KEY}`)
    if (env.OPENAI_MODEL) secretArgs.push(`OPENAI_MODEL=${env.OPENAI_MODEL}`)
    log('Setting Edge secrets (PUBLIC_SITE_URL + OPENAI_API_KEY)…')
  } else {
    log('Setting Edge secrets (PUBLIC_SITE_URL only; add OPENAI_API_KEY to .env.local and re-run)')
  }
  run('supabase', secretArgs, {
    inherit: true,
    accessToken,
    secrets: [env.OPENAI_API_KEY, accessToken].filter(Boolean),
    safeArgs: 'secrets set --project-ref *** …',
  })
}

log('Deploying creator Edge Function…')
run(
  'supabase',
  ['functions', 'deploy', 'creator', '--project-ref', projectRef],
  { inherit: true, accessToken },
)

log('Configuring Auth redirect URLs…')
{
  const redirects = [
    'https://play.thehappylab.com/create',
    'http://localhost:5173/create',
    'http://127.0.0.1:5173/create',
  ]
  const { res, text } = await managementFetch(
    `/projects/${projectRef}/config/auth`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({
        site_url: 'https://play.thehappylab.com',
        uri_allow_list: redirects.join(','),
      }),
    },
  )
  if (!res.ok) {
    log(`Auth config warning (${res.status}): ${redact(text, secrets).slice(0, 300)}`)
  } else {
    log('Auth site_url + redirect allow list updated')
  }
}

log('Done.')
if (!env.OPENAI_API_KEY) {
  log('Missing OPENAI_API_KEY — game generation will fail until you add it and re-run this script.')
}
