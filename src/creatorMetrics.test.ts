import { describe, expect, it } from 'vitest'
import {
  CREATOR_TELEMETRY_EVENTS,
  FIRST_BUILD_LAYOUT_PASS_TARGET,
  buildPathOf,
  classifyGateErrors,
  countUserChatTurns,
  editModeOf,
  firstBuildCheckProps,
  isCritiqueSkipped,
  summarizeCreatorBaseline,
} from './lib/creatorMetrics'

describe('creatorMetrics', () => {
  it('classifies gate error strings into Phase 0 taxonomy', () => {
    expect(classifyGateErrors([])).toEqual(['ok'])
    expect(
      classifyGateErrors(['layoutPlan "a" overlaps "b" (need ≥12px gap)']),
    ).toEqual(['overlap'])
    expect(
      classifyGateErrors([
        'layoutPlan CTA "start" should sit in the lower third (center y ≈ 0.68–0.82)',
      ]),
    ).toEqual(['cta_off_band'])
    expect(
      classifyGateErrors(['smoke idle draw (before start) threw: Cannot read properties']),
    ).toEqual(['idle_crash'])
    expect(
      classifyGateErrors(['layout fidelity: "start" drifts y (plan 0.720 vs 0.200) (ε=0.04)']),
    ).toEqual(['playfield_mismatch'])
    expect(
      classifyGateErrors([
        'harvest: no layoutRects()/layoutRects/L/rects graph with plan ids',
        'no harvest',
      ]),
    ).toEqual(['no_harvest'])
  })

  it('detects critique skips and edit modes', () => {
    expect(isCritiqueSkipped(['critique skipped: time budget'])).toBe(true)
    expect(isCritiqueSkipped(['button too small'])).toBe(false)
    expect(editModeOf({ editMode: 'patch' })).toBe('patch')
    expect(editModeOf({ editMode: 'full' })).toBe('full')
    expect(editModeOf({})).toBe(null)
  })

  it('counts user turns until publish', () => {
    expect(
      countUserChatTurns([
        { role: 'user' },
        { role: 'assistant' },
        { role: 'user' },
        { role: 'assistant' },
      ]),
    ).toBe(2)
  })

  it('summarizes baseline rates against the 80% first-build target', () => {
    const report = summarizeCreatorBaseline([
      {
        slug: 'a',
        status: 'approved',
        checkOk: true,
        fidelityOk: true,
        missingHarvest: false,
        brief: {
          editMode: 'full',
          critiqueIssues: ['critique skipped: time budget'],
          mechanic: 'reaction',
          buildPath: 'arcade',
        },
        conversation: [{ role: 'user' }, { role: 'assistant' }],
      },
      {
        slug: 'b',
        status: 'draft',
        checkOk: false,
        checkErrors: ['layoutPlan "x" overlaps "y"'],
        missingHarvest: true,
        brief: { editMode: 'patch', critiqueIssues: [], mechanic: 'custom', buildPath: 'freeform' },
        conversation: [{ role: 'user' }, { role: 'user' }, { role: 'assistant' }],
      },
      {
        slug: 'c',
        status: 'published',
        checkOk: true,
        fidelityOk: true,
        missingHarvest: false,
        brief: { editMode: 'full', critiqueIssues: ['ok'], mechanic: 'custom', buildPath: 'freeform' },
        conversation: [
          { role: 'user' },
          { role: 'assistant' },
          { role: 'user' },
          { role: 'assistant' },
        ],
      },
    ])

    expect(report.sampleSize).toBe(3)
    expect(report.targetFirstBuildPass).toBe(FIRST_BUILD_LAYOUT_PASS_TARGET)
    // Row b fails smoke (overlap) — 2/3 first-build pass; missing harvest counted separately.
    expect(report.firstBuildPassRate).toBeCloseTo(2 / 3)
    expect(report.meetsTarget).toBe(false)
    expect(report.arcadePassRate).toBe(1)
    expect(report.arcadeSampleSize).toBe(1)
    expect(report.meetsArcadeTarget).toBe(true)
    expect(report.freeformPassRate).toBeCloseTo(0.5)
    expect(report.freeformSampleSize).toBe(2)
    expect(report.critiqueSkipRate).toBeCloseTo(1 / 3)
    expect(report.patchRate).toBeCloseTo(1 / 3)
    expect(report.fullRewriteRate).toBeCloseTo(2 / 3)
    expect(report.missingHarvestRate).toBeCloseTo(1 / 3)
    expect(report.failureCounts.overlap).toBe(1)
    expect(report.failureCounts.no_harvest).toBe(1)
    expect(report.failureCounts.ok).toBe(2)
    expect(report.meanUserTurnsUntilPublish).toBeCloseTo(1.5)
  })

  it('infers buildPath from mechanic when brief.buildPath missing', () => {
    expect(buildPathOf({ slug: 'x', status: 'draft', brief: { mechanic: 'dodge' } })).toBe(
      'arcade',
    )
    expect(buildPathOf({ slug: 'y', status: 'draft', brief: { mechanic: 'custom' } })).toBe(
      'freeform',
    )
  })

  it('builds first-build telemetry props', () => {
    expect(CREATOR_TELEMETRY_EVENTS.firstBuildCheck).toBe('creator_first_build_check')
    const props = firstBuildCheckProps({
      ok: false,
      errors: ['layoutPlan "a" overlaps "b"'],
      critiqueSkipped: true,
      editMode: 'full',
      mechanic: 'reaction',
      buildPath: 'arcade',
    })
    expect(props.ok).toBe(false)
    expect(props.build_path).toBe('arcade')
    expect(props.failure_classes).toEqual(['overlap'])
    expect(props.critique_skipped).toBe(true)
    expect(props.mechanic).toBe('reaction')
  })
})
