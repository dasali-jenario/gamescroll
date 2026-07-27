/** Brief chrome teaching that the feed is vertically swipeable. */
export function SwipeCue() {
  return (
    <div
      className="swipe-cue"
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
