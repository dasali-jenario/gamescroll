import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  feedBridgeEntryCount,
  registerFeedBridge,
  resetFeedMessageHub,
} from './lib/feedMessageHub'

afterEach(() => {
  resetFeedMessageHub()
})

describe('feedMessageHub', () => {
  it('dispatches to the entry whose source matches event.source', () => {
    const sourceA = {} as Window
    const sourceB = {} as Window
    const handlerA = vi.fn()
    const handlerB = vi.fn()

    registerFeedBridge({
      getSource: () => sourceA,
      onMessage: handlerA,
    })
    registerFeedBridge({
      getSource: () => sourceB,
      onMessage: handlerB,
    })
    expect(feedBridgeEntryCount()).toBe(2)

    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'gamescroll:ready' }, source: sourceA }),
    )
    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerB).not.toHaveBeenCalled()
  })

  it('ignores messages with no matching source', () => {
    const handler = vi.fn()
    registerFeedBridge({
      getSource: () => ({}) as Window,
      onMessage: handler,
    })
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'gamescroll:ready' },
        source: {} as Window,
      }),
    )
    expect(handler).not.toHaveBeenCalled()
  })

  it('skips entries whose getSource is null (unloaded iframe)', () => {
    const live = {} as Window
    const deadHandler = vi.fn()
    const liveHandler = vi.fn()
    registerFeedBridge({
      getSource: () => null,
      onMessage: deadHandler,
    })
    registerFeedBridge({
      getSource: () => live,
      onMessage: liveHandler,
    })
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'gamescroll:score' }, source: live }),
    )
    expect(deadHandler).not.toHaveBeenCalled()
    expect(liveHandler).toHaveBeenCalledTimes(1)
  })

  it('only notifies the first matching registration', () => {
    const source = {} as Window
    const first = vi.fn()
    const second = vi.fn()
    registerFeedBridge({ getSource: () => source, onMessage: first })
    registerFeedBridge({ getSource: () => source, onMessage: second })
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'gamescroll:died' }, source }),
    )
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })

  it('unregisters and detaches when the last entry leaves', () => {
    const source = {} as Window
    const handler = vi.fn()
    const unregister = registerFeedBridge({
      getSource: () => source,
      onMessage: handler,
    })
    unregister()
    expect(feedBridgeEntryCount()).toBe(0)

    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'gamescroll:ready' }, source }),
    )
    expect(handler).not.toHaveBeenCalled()
  })

  it('keeps the host listener while any entry remains', () => {
    const sourceA = {} as Window
    const sourceB = {} as Window
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    const unregA = registerFeedBridge({
      getSource: () => sourceA,
      onMessage: handlerA,
    })
    registerFeedBridge({
      getSource: () => sourceB,
      onMessage: handlerB,
    })
    unregA()
    expect(feedBridgeEntryCount()).toBe(1)

    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'gamescroll:ready' }, source: sourceB }),
    )
    expect(handlerA).not.toHaveBeenCalled()
    expect(handlerB).toHaveBeenCalledTimes(1)
  })
})
