import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { CreatorPreview } from '../components/CreatorPreview'
import { getSupabase, isSupabaseConfigured, type UgcGameRow } from '../lib/supabase'
import { fetchMyUgcGames, invokeCreator, ugcRowToGame } from '../lib/ugc'
import { gameShareUrl, shareGame } from '../share'
import type { User } from '@supabase/supabase-js'

type ChatBubble = { role: 'user' | 'assistant'; content: string }

const WELCOME =
  "Describe the mini-game you want. I'll ask a few quick questions, then build a single-player HTML5 game for Gamescroll.\n\nLimits: no multiplayer, no backend, no saved progress."

export function CreatePage() {
  const configured = isSupabaseConfigured()
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [authMsg, setAuthMsg] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatBubble[]>([
    { role: 'assistant', content: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<UgcGameRow | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [myGames, setMyGames] = useState<UgcGameRow[]>([])
  const previewUrl = useMemo(() => {
    if (previewHtml) return URL.createObjectURL(new Blob([previewHtml], { type: 'text/html' }))
    if (draft?.html_url) return draft.html_url
    return null
  }, [previewHtml, draft?.html_url])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (previewHtml && previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewHtml, previewUrl])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    sb.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const refreshMine = useCallback(async () => {
    if (!user) {
      setMyGames([])
      return
    }
    setMyGames(await fetchMyUgcGames())
  }, [user])

  useEffect(() => {
    void refreshMine()
  }, [refreshMine])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, busy])

  const sendMagicLink = async (e: FormEvent) => {
    e.preventDefault()
    const sb = getSupabase()
    if (!sb) return
    setAuthMsg(null)
    const redirectTo = `${window.location.origin}/create`
    const { error: err } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })
    setAuthMsg(err ? err.message : 'Check your email for a magic link.')
  }

  const signOut = async () => {
    await getSupabase()?.auth.signOut()
    setDraft(null)
    setPreviewHtml(null)
  }

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy || !user) return
    setInput('')
    setError(null)
    const nextMessages: ChatBubble[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setBusy(true)
    const { data, error: err } = await invokeCreator<{
      reply: string
      phase: string
      game: UgcGameRow | null
      previewHtml?: string
      validationErrors?: string[]
    }>({
      action: 'chat',
      messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      gameId: draft?.id,
    })
    setBusy(false)
    if (err || !data) {
      setError(err || 'Creator request failed')
      return
    }
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: data.reply || '…' },
    ])
    if (data.game) {
      setDraft(data.game)
      void refreshMine()
    }
    if (data.previewHtml) setPreviewHtml(data.previewHtml)
    if (data.validationErrors?.length) {
      setError(data.validationErrors.join(' · '))
    }
  }

  const publish = async () => {
    if (!draft) return
    setBusy(true)
    setError(null)
    const { data, error: err } = await invokeCreator<{ game: UgcGameRow }>({
      action: 'publish',
      gameId: draft.id,
    })
    setBusy(false)
    if (err || !data?.game) {
      setError(err || 'Publish failed')
      return
    }
    setDraft(data.game)
    void refreshMine()
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `Published! Anyone with the link can play it. It joins the public feed after moderation.\n${gameShareUrl(data.game.slug)}`,
      },
    ])
  }

  const shareDraft = async () => {
    if (!draft) return
    await shareGame(ugcRowToGame(draft))
  }

  if (!configured) {
    return (
      <div className="create-page">
        <header className="create-top">
          <Link to="/" className="create-back">
            ← Feed
          </Link>
          <h1 className="create-brand">Game creator</h1>
        </header>
        <p className="create-setup">
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, run the
          migration in <code>supabase/migrations/</code>, and deploy the{' '}
          <code>creator</code> Edge Function.
        </p>
      </div>
    )
  }

  return (
    <div className="create-page">
      <header className="create-top">
        <Link to="/" className="create-back">
          ← Feed
        </Link>
        <div>
          <div className="create-eyebrow">play.thehappylab.com/create</div>
          <h1 className="create-brand">Game creator</h1>
        </div>
        {user ? (
          <button type="button" className="create-ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        ) : (
          <span className="create-ghost muted">Sign in to build</span>
        )}
      </header>

      {!user ? (
        <form className="create-auth" onSubmit={(e) => void sendMagicLink(e)}>
          <p>Sign in with a magic link to create and publish games.</p>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <button type="submit" className="create-primary">
            Send magic link
          </button>
          {authMsg && <p className="create-hint">{authMsg}</p>}
        </form>
      ) : (
        <div className="create-layout">
          <section className="create-chat" aria-label="Creator chat">
            <div className="create-limits">
              Single-player · no backend · no saved state
            </div>
            <div className="create-messages" ref={listRef}>
              {messages.map((m, i) => (
                <div key={`${i}-${m.role}`} className={`bubble ${m.role}`}>
                  {m.content}
                </div>
              ))}
              {busy && <div className="bubble assistant">Working…</div>}
            </div>
            {error && <p className="create-error">{error}</p>}
            <form className="create-composer" onSubmit={(e) => void send(e)}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your game or answer the question…"
                disabled={busy}
                aria-label="Message"
              />
              <button type="submit" className="create-primary" disabled={busy || !input.trim()}>
                Send
              </button>
            </form>
          </section>

          <section className="create-side" aria-label="Preview and publish">
            <div className="create-preview-frame">
              {previewUrl ? (
                <CreatorPreview
                  key={previewUrl}
                  title={draft?.title || 'Preview'}
                  src={previewUrl}
                />
              ) : (
                <div className="create-preview-empty">Preview appears after a game is built</div>
              )}
            </div>
            {draft && (
              <div className="create-actions">
                <div>
                  <strong>{draft.title}</strong>
                  <div className="create-hint">
                    Status: {draft.status}
                    {draft.status === 'published' || draft.status === 'approved'
                      ? ` · ${gameShareUrl(draft.slug)}`
                      : ''}
                  </div>
                </div>
                <div className="create-action-row">
                  {(draft.status === 'draft' || draft.status === 'rejected') && (
                    <button
                      type="button"
                      className="create-primary"
                      disabled={busy}
                      onClick={() => void publish()}
                    >
                      Publish
                    </button>
                  )}
                  {(draft.status === 'published' || draft.status === 'approved') && (
                    <>
                      <button type="button" className="create-ghost" onClick={() => void shareDraft()}>
                        Share
                      </button>
                      <Link className="create-ghost" to={`/?g=${encodeURIComponent(draft.slug)}`}>
                        Open in feed
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}

            {myGames.length > 0 && (
              <div className="create-mine">
                <h2>My games</h2>
                <ul>
                  {myGames.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(g)
                          setPreviewHtml(null)
                        }}
                      >
                        {g.title}
                      </button>
                      <span>{g.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
