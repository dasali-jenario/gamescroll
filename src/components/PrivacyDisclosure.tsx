import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'

const PROVIDER_URL = 'https://thehappylab.com/'
const PLAY_HOST = 'play.thehappylab.com'
const CONTACT_EMAIL = 'hello@thehappylab.com'

/** Nav-aligned info control that opens the privacy disclosure panel. */
export function PrivacyDisclosure() {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const panel =
    open &&
    createPortal(
      <div
        id="privacy-disclosure"
        className="privacy-disclosure"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false)
        }}
      >
        <div className="privacy-disclosure-panel">
          <header className="privacy-disclosure-head">
            <h2 id={titleId} className="privacy-disclosure-title">
              Privacy
            </h2>
            <button
              type="button"
              className="privacy-disclosure-close"
              aria-label="Close privacy information"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </header>

          <div className="privacy-disclosure-body">
            <p>
              Gamescroll is provided by{' '}
              <a href={PROVIDER_URL} target="_blank" rel="noopener noreferrer">
                The Happy Lab GmbH
              </a>{' '}
              and runs at {PLAY_HOST}.
            </p>

            <h3>What we store on your device</h3>
            <ul>
              <li>High scores and simple play preferences for games you use.</li>
              <li>
                An anonymous device id and visit markers used for product analytics
                (how the feed is used), not for advertising.
              </li>
              <li>
                If you sign in to create games, your session is stored so you stay
                logged in.
              </li>
            </ul>

            <h3>What we send to our servers</h3>
            <ul>
              <li>
                Sparse product events (for example swipes and feed health) tied to
                that anonymous id.
              </li>
              <li>
                Account and game data when you use Create or other signed-in
                features.
              </li>
            </ul>

            <h3>What we don’t do</h3>
            <p>
              We don’t use third-party advertising cookies or ad pixels on this
              app.
            </p>

            <h3>Contact</h3>
            <p>
              Questions:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              <br />
              Company:{' '}
              <a href={PROVIDER_URL} target="_blank" rel="noopener noreferrer">
                thehappylab.com
              </a>
            </p>
          </div>
        </div>
      </div>,
      document.body,
    )

  return (
    <>
      <button
        type="button"
        className="nav-btn privacy-info-btn"
        aria-label="Privacy and provider information"
        aria-expanded={open}
        aria-controls={open ? 'privacy-disclosure' : undefined}
        onClick={() => setOpen(true)}
      >
        <span className="privacy-info-glyph" aria-hidden="true">
          i
        </span>
      </button>
      {panel}
    </>
  )
}
