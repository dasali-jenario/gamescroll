type Props = {
  dimmed?: boolean
}

/** Always-on chrome teaching that the feed is vertically swipeable. */
export function SwipeCue({ dimmed = false }: Props) {
  return (
    <div
      className={`swipe-cue${dimmed ? ' is-dimmed' : ''}`}
      aria-hidden="true"
    >
      <span className="swipe-cue-chevron" />
      <span className="swipe-cue-label">Swipe</span>
      <span className="swipe-cue-sub">Next game</span>
    </div>
  )
}
