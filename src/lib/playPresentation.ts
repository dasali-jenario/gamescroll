/**
 * Host playfield presentation contract.
 * Games must letterbox symmetrically; the dark scroll rail is only a pre-play hint.
 */

/** Side gutters around the playable iframe while playing (CSS length). */
export const PLAY_INSET_SIDE = '0.5rem'

/** Dark onboarding rail class — must not reserve playfield width after first play. */
export const RAIL_HINT_CLASS = 'swipe-rail--hint'

export type PlayInsets = {
  left: string
  right: string
}

/** True when left/right host gutters match (no rail-skewed playfield). */
export function playInsetsAreSymmetric(insets: PlayInsets): boolean {
  return insets.left === insets.right && insets.left.length > 0
}

/** Dark scroll rail: only before the first game starts. */
export function shouldShowRailHint(opts: {
  railHintVisible: boolean
  playingKey: string | null
}): boolean {
  return opts.railHintVisible && opts.playingKey == null
}

/** Invisible edge capture while a game is actively playable. */
export function shouldShowSilentSwipeRail(opts: {
  playingKey: string | null
  gameOver: boolean
  introRunning: boolean
}): boolean {
  return !!opts.playingKey && !opts.gameOver && !opts.introRunning
}

export type PlayfieldChrome = {
  viewportWidth: number
  viewportHeight: number
  /** Top chrome height in CSS px (approx). */
  topPx: number
  /** Bottom nav height in CSS px (approx). */
  bottomPx: number
  /** Each side gutter in CSS px. */
  sidePx: number
}

/** Letterboxed playfield size after host chrome insets (always applied to `.stage`). */
export function playfieldSize(chrome: PlayfieldChrome): {
  width: number
  height: number
  aspectRatio: number
} {
  const width = Math.max(0, chrome.viewportWidth - chrome.sidePx * 2)
  const height = Math.max(
    0,
    chrome.viewportHeight - chrome.topPx - chrome.bottomPx,
  )
  return {
    width,
    height,
    aspectRatio: width > 0 ? height / width : 0,
  }
}

/** Feed games present as portrait (taller than wide) on phone-class viewports. */
export function isPortraitPlayfield(size: {
  width: number
  height: number
}): boolean {
  return size.width > 0 && size.height > size.width
}
