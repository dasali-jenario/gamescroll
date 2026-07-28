import type { Game } from '../games'

/**
 * Resolve community UGC + optional shared-slug pin for feed boot.
 * Community and share fetches run in parallel when both are needed.
 */
export async function resolveFeedBoot(opts: {
  preferGame: Game | null
  sharedParam: string | null
  fetchCommunity: () => Promise<Game[]>
  fetchShared: (slug: string) => Promise<Game | null>
}): Promise<{ community: Game[]; prefer: Game | null }> {
  const needShare = !opts.preferGame && Boolean(opts.sharedParam)
  const communityPromise = opts.fetchCommunity()
  const sharePromise = needShare
    ? opts.fetchShared(opts.sharedParam!)
    : Promise.resolve(null)

  const [community, shared] = await Promise.all([
    communityPromise,
    sharePromise,
  ])

  return {
    community,
    prefer: opts.preferGame ?? shared,
  }
}
