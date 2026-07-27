type Props = {
  dimmed?: boolean
}

/** Always-on chrome teaching that the feed is vertically swipeable. */
export function SwipeCue({ dimmed = false }: Props) {
  return (
    <div
      className={`swipe-cue${dimmed ? ' is-dimmed' : ''}`}
      role="status"
      aria-label="Swipe up for the next game"
    >
      <span className="swipe-cue-chevron" aria-hidden="true" />
      <span className="swipe-cue-copy">
        <span className="swipe-cue-label">Swipe</span>
        <span className="swipe-cue-sub">for the next game</span>
      </span>
    </div>
  )
}
