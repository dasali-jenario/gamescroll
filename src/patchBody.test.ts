import { describe, expect, it } from 'vitest'
import { applyBodyPatches, parseBodyPatches } from './lib/patchBody'

const body = `function layout(){
  btn.w = 200
  btn.y = H * 0.74
}
function draw(){ ctx.fillStyle = '#123' }
`

describe('patchBody', () => {
  it('applies a unique search/replace edit', () => {
    const res = applyBodyPatches(body, [{ find: 'btn.w = 200', replace: 'btn.w = 260' }])
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.body).toContain('btn.w = 260')
      expect(res.body).toContain("ctx.fillStyle = '#123'")
      expect(res.applied).toBe(1)
    }
  })

  it('rejects a find that does not match', () => {
    const res = applyBodyPatches(body, [{ find: 'btn.w = 999', replace: 'btn.w = 260' }])
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors[0]).toContain('did not match')
  })

  it('rejects ambiguous matches unless all is set', () => {
    const dupe = 'let a = 1\nlet b = 1\n'
    const ambiguous = applyBodyPatches(dupe, [{ find: '= 1', replace: '= 2' }])
    expect(ambiguous.ok).toBe(false)

    const all = applyBodyPatches(dupe, [{ find: '= 1', replace: '= 2', all: true }])
    expect(all.ok).toBe(true)
    if (all.ok) expect(all.body).toBe('let a = 2\nlet b = 2\n')
  })

  it('parses only well-formed patches', () => {
    const parsed = parseBodyPatches([
      { find: 'a', replace: 'b' },
      { find: '   ', replace: 'x' },
      { replace: 'no find' },
      'nope',
    ])
    expect(parsed).toEqual([{ find: 'a', replace: 'b', all: false }])
  })
})
