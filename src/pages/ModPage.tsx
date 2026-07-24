import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured, type UgcGameRow } from '../lib/supabase'
import { fetchPublishedForModeration, invokeCreator, ugcRowToGame } from '../lib/ugc'

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
              </div>
              <iframe
                title={row.title}
                src={game.src}
                sandbox="allow-scripts"
                className="mod-frame"
              />
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
