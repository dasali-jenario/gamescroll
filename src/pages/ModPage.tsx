import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { driveGameBody, smokeGameBody } from '../lib/gameSmoke'
import { checkBodyLayoutFidelity } from '../lib/layoutFidelity'
import { parseLayoutPlan } from '../lib/layoutPlan'
import { getSupabase, isSupabaseConfigured, type UgcGameRow } from '../lib/supabase'
import { usePlayableFrameSrc } from '../lib/usePlayableFrameSrc'
import { fetchPublishedForModeration, invokeCreator, ugcRowToGame } from '../lib/ugc'

type GateSummary = {
  buildPath: string
  mechanic: string
  editMode: string | null
  critiqueIssues: string[]
  errors: string[]
  warnings: string[]
  checked: boolean
}

/** Live gate re-run from the stored brief so mods approve with full context. */
function summarizeBrief(brief: Record<string, unknown> | null): GateSummary {
  const buildPath = typeof brief?.buildPath === 'string' ? brief.buildPath : 'unknown'
  const mechanic = typeof brief?.mechanic === 'string' ? brief.mechanic : 'unknown'
  const editMode = typeof brief?.editMode === 'string' ? brief.editMode : null
  const critiqueIssues = Array.isArray(brief?.critiqueIssues)
    ? (brief?.critiqueIssues as unknown[]).filter(
        (i): i is string => typeof i === 'string',
      )
    : []
  const bodyJs = typeof brief?.bodyJs === 'string' ? brief.bodyJs : ''
  const errors: string[] = []
  const warnings: string[] = []
  if (!bodyJs.trim()) {
    return {
      buildPath,
      mechanic,
      editMode,
      critiqueIssues,
      errors,
      warnings: ['no bodyJs stored — legacy draft, judge by preview'],
      checked: false,
    }
  }
  const smoke = smokeGameBody(bodyJs)
  if (!smoke.ok) errors.push(...smoke.errors)
  const play = driveGameBody(bodyJs, { seconds: 4 })
  if (!play.ok) errors.push(...play.errors)
  const plan = parseLayoutPlan(brief?.layoutPlan)
  if (plan.length) {
    const fidelity = checkBodyLayoutFidelity(bodyJs, plan)
    if (!fidelity.ok) {
      if (fidelity.missingHarvest) warnings.push('no layout harvest (legacy soft)')
      else errors.push(...fidelity.errors)
    }
  } else {
    warnings.push('no layoutPlan stored')
  }
  return { buildPath, mechanic, editMode, critiqueIssues, errors, warnings, checked: true }
}

function ModGateInfo({ brief }: { brief: Record<string, unknown> | null }) {
  const gate = useMemo(() => summarizeBrief(brief), [brief])
  const status = !gate.checked
    ? 'not checked'
    : gate.errors.length
      ? `${gate.errors.length} issue${gate.errors.length === 1 ? '' : 's'}`
      : 'pass'
  return (
    <div className="mod-gate">
      <span
        className={
          !gate.checked
            ? 'mod-gate-badge mod-gate-unknown'
            : gate.errors.length
              ? 'mod-gate-badge mod-gate-fail'
              : 'mod-gate-badge mod-gate-ok'
        }
      >
        gate: {status}
      </span>
      <span className="create-hint">
        {gate.buildPath} · {gate.mechanic}
        {gate.editMode ? ` · ${gate.editMode} edit` : ''}
      </span>
      {gate.errors.map((e) => (
        <span key={e} className="mod-gate-error">
          {e}
        </span>
      ))}
      {gate.warnings.map((w) => (
        <span key={w} className="create-hint">
          {w}
        </span>
      ))}
      {gate.critiqueIssues.length > 0 && (
        <details className="mod-gate-critique">
          <summary>critique notes ({gate.critiqueIssues.length})</summary>
          {gate.critiqueIssues.map((i) => (
            <span key={i}>{i}</span>
          ))}
        </details>
      )}
    </div>
  )
}

/** Load iframe only when the card is near the viewport or the mod expands it. */
function ModPreview({ src, title }: { src: string; title: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const enabled = nearViewport || expanded
  const frameSrc = usePlayableFrameSrc(src, enabled)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        setNearViewport(Boolean(entry?.isIntersecting))
      },
      { rootMargin: '240px 0px', threshold: 0.01 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="mod-preview">
      {enabled && frameSrc ? (
        <iframe
          title={title}
          src={frameSrc}
          sandbox="allow-scripts"
          className="mod-frame"
        />
      ) : (
        <button
          type="button"
          className="mod-frame-placeholder"
          onClick={() => setExpanded(true)}
        >
          Load preview
        </button>
      )}
      <button
        type="button"
        className="create-ghost mod-preview-toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Release preview' : 'Pin preview'}
      </button>
    </div>
  )
}

export function ModPage() {
  const [rows, setRows] = useState<UgcGameRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    const sb = getSupabase()
    if (!sb || !isSupabaseConfigured()) {
      setAllowed(false)
      return
    }
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) {
      setAllowed(false)
      setError('Sign in at /create first, then open /mod.')
      return
    }
    const { data: mod } = await sb
      .from('moderators')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!mod) {
      setAllowed(false)
      setError('Your account is not on the moderators list.')
      return
    }
    setAllowed(true)
    setRows(await fetchPublishedForModeration())
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const moderate = async (gameId: string, status: 'approved' | 'rejected') => {
    setBusyId(gameId)
    setError(null)
    const { error: err } = await invokeCreator({
      action: 'moderate',
      gameId,
      status,
      note: status === 'rejected' ? 'Does not meet Gamescroll guidelines' : undefined,
    })
    setBusyId(null)
    if (err) {
      setError(err)
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== gameId))
  }

  return (
    <div className="create-page mod-page">
      <header className="create-top">
        <Link to="/" className="create-back">
          ← Feed
        </Link>
        <h1 className="create-brand">Moderate UGC</h1>
        <Link to="/create" className="create-ghost">
          Creator
        </Link>
      </header>

      {error && <p className="create-error">{error}</p>}
      {allowed && rows.length === 0 && (
        <p className="create-hint">No published games waiting for review.</p>
      )}

      <ul className="mod-list">
        {rows.map((row) => {
          const game = ugcRowToGame(row)
          return (
            <li key={row.id} className="mod-card">
              <div className="mod-meta">
                <strong>{row.title}</strong>
                <span>{row.tip}</span>
                <span className="create-hint">slug: {row.slug}</span>
                <ModGateInfo brief={row.brief ?? null} />
              </div>
              <ModPreview src={game.src} title={row.title} />
              <div className="create-action-row">
                <button
                  type="button"
                  className="create-primary"
                  disabled={busyId === row.id}
                  onClick={() => void moderate(row.id, 'approved')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="create-ghost"
                  disabled={busyId === row.id}
                  onClick={() => void moderate(row.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
