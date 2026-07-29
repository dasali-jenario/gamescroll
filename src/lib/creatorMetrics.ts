/**
 * Phase 0 creator baselines: classify UGC layout failures and aggregate
 * first-build / critique / iterate metrics from stored ugc_games rows + gate output.
 */

/** Taxonomy from Better Game Builder Phase 0. */
export type UgcFailureClass =
  | 'overlap'
  | 'cta_off_band'
  | 'idle_crash'
  | 'unresponsive_hit'
  | 'playfield_mismatch'
  | 'no_harvest'
  | 'other'
  | 'ok'

/** Success bar for later phases: share of first builds publishable without a layout-fix turn. */
export const FIRST_BUILD_LAYOUT_PASS_TARGET = 0.8

/** Event names for creator telemetry (Edge / client). */
export const CREATOR_TELEMETRY_EVENTS = {
  firstBuildCheck: 'creator_first_build_check',
  critique: 'creator_critique',
  publish: 'creator_publish',
  editMode: 'creator_edit_mode',
} as const

export type CreatorBriefSample = {
  editMode?: unknown
  critiqueIssues?: unknown
  layoutPlan?: unknown
  bodyJs?: unknown
  mechanic?: unknown
  buildPath?: unknown
}

export type CreatorGameSample = {
  slug: string
  status: string
  brief?: CreatorBriefSample | null
  conversation?: Array<{ role?: string; content?: string }> | null
  /** Optional live gate results when sampling offline. */
  checkOk?: boolean
  checkErrors?: string[]
  fidelityOk?: boolean
  fidelityErrors?: string[]
  missingHarvest?: boolean
  /** arcade | freeform — from brief.buildPath or mechanic */
  buildPath?: 'arcade' | 'freeform' | null
}

export type CreatorBaselineReport = {
  sampleSize: number
  failureCounts: Record<UgcFailureClass, number>
  firstBuildPassRate: number | null
  /** Layout pass among arcade-scaffold samples (target ≥80%). */
  arcadePassRate: number | null
  arcadeSampleSize: number
  /** Playable/geom pass among freeform samples (may be lower — expected). */
  freeformPassRate: number | null
  freeformSampleSize: number
  critiqueSkipRate: number | null
  meanUserTurnsUntilPublish: number | null
  patchRate: number | null
  fullRewriteRate: number | null
  missingHarvestRate: number | null
  targetFirstBuildPass: number
  meetsTarget: boolean | null
  /** Arcade cohort vs layout target (freeform excluded). */
  meetsArcadeTarget: boolean | null
}

const EMPTY_COUNTS = (): Record<UgcFailureClass, number> => ({
  overlap: 0,
  cta_off_band: 0,
  idle_crash: 0,
  unresponsive_hit: 0,
  playfield_mismatch: 0,
  no_harvest: 0,
  other: 0,
  ok: 0,
})

/** Map checkGame / smoke / fidelity error strings into Phase 0 failure classes. */
export function classifyGateErrors(errors: string[]): UgcFailureClass[] {
  if (!errors.length) return ['ok']
  const found = new Set<UgcFailureClass>()
  for (const raw of errors) {
    const e = raw.toLowerCase()
    if (
      e.includes('no layoutrects') ||
      e.includes('missing harvest') ||
      e.includes('no harvest') ||
      (e.includes('harvest:') && e.includes('no '))
    ) {
      found.add('no_harvest')
    } else if (e.includes('overlap')) found.add('overlap')
    else if (e.includes('cta') && (e.includes('lower third') || e.includes('band') || e.includes('off')))
      found.add('cta_off_band')
    else if (
      e.includes('idle draw') ||
      e.includes('before start') ||
      (e.includes('smoke') && e.includes('threw'))
    )
      found.add('idle_crash')
    else if (e.includes('pointer') || e.includes('hit target') || e.includes('unresponsive'))
      found.add('unresponsive_hit')
    else if (e.includes('layout fidelity') || e.includes('drifts') || e.includes('playfield'))
      found.add('playfield_mismatch')
    else found.add('other')
  }
  // Prefer specific classes over a co-occurring `other` from duplicate soft tags.
  if (found.size > 1) found.delete('other')
  return [...found]
}

export function isCritiqueSkipped(issues: string[] | unknown): boolean {
  if (!Array.isArray(issues)) return false
  return issues.some(
    (i) => typeof i === 'string' && i.toLowerCase().includes('critique skipped'),
  )
}

export function countUserChatTurns(
  conversation: Array<{ role?: string }> | null | undefined,
): number {
  if (!Array.isArray(conversation)) return 0
  return conversation.filter((m) => m?.role === 'user').length
}

export function editModeOf(brief: CreatorBriefSample | null | undefined): 'patch' | 'full' | null {
  const m = brief?.editMode
  if (m === 'patch' || m === 'full') return m
  return null
}

export function buildPathOf(sample: CreatorGameSample): 'arcade' | 'freeform' | null {
  if (sample.buildPath === 'arcade' || sample.buildPath === 'freeform') return sample.buildPath
  const bp = sample.brief?.buildPath
  if (bp === 'arcade' || bp === 'freeform') return bp
  const mech = sample.brief?.mechanic
  if (typeof mech === 'string') {
    const arcade = ['reaction', 'timing', 'dodge', 'drag', 'stack']
    return arcade.includes(mech) ? 'arcade' : 'freeform'
  }
  return null
}

/**
 * Aggregate Phase 0 baselines from a sample of ugc_games (+ optional live checks).
 * firstBuildPassRate uses checkOk when present; otherwise null.
 * Arcade vs freeform rates are split so freeform variety does not dilute the layout target.
 */
export function summarizeCreatorBaseline(rows: CreatorGameSample[]): CreatorBaselineReport {
  const failureCounts = EMPTY_COUNTS()
  let checked = 0
  let checkPassed = 0
  let critiqueKnown = 0
  let critiqueSkipped = 0
  let publishedTurns: number[] = []
  let editKnown = 0
  let patchCount = 0
  let fullCount = 0
  let harvestKnown = 0
  let harvestMissing = 0
  let arcadeChecked = 0
  let arcadePassed = 0
  let freeformChecked = 0
  let freeformPassed = 0

  for (const row of rows) {
    const errors = [
      ...(row.checkErrors || []),
      ...(row.fidelityErrors || []),
    ]
    if (row.missingHarvest) errors.push('no harvest')

    const path = buildPathOf(row)
    let rowPassed = false

    if (row.checkOk !== undefined || errors.length || row.fidelityOk !== undefined) {
      checked += 1
      const hardFail =
        row.checkOk === false ||
        (row.fidelityOk === false && !row.missingHarvest)
      const classes = classifyGateErrors(
        hardFail || row.missingHarvest
          ? errors.length
            ? errors
            : ['other failure']
          : [],
      )
      // First-build pass ≈ checkGame/smoke ok and no geometric drift.
      // Missing harvest is tracked separately (Phase 0 soft).
      if (!hardFail && row.checkOk !== false) {
        checkPassed += 1
        failureCounts.ok += 1
        rowPassed = true
      }
      if (hardFail || row.missingHarvest) {
        for (const c of classes) {
          if (c !== 'ok') failureCounts[c] += 1
        }
        if (hardFail && classes.every((c) => c === 'ok')) {
          failureCounts.other += 1
        }
      }

      if (path === 'arcade') {
        arcadeChecked += 1
        if (rowPassed) arcadePassed += 1
      } else if (path === 'freeform') {
        freeformChecked += 1
        if (rowPassed) freeformPassed += 1
      }
    }

    const issues = row.brief?.critiqueIssues
    if (Array.isArray(issues)) {
      critiqueKnown += 1
      if (isCritiqueSkipped(issues)) critiqueSkipped += 1
    }

    const mode = editModeOf(row.brief)
    if (mode) {
      editKnown += 1
      if (mode === 'patch') patchCount += 1
      else fullCount += 1
    }

    if (row.missingHarvest !== undefined) {
      harvestKnown += 1
      if (row.missingHarvest) harvestMissing += 1
    }

    if (row.status === 'published' || row.status === 'approved') {
      publishedTurns.push(countUserChatTurns(row.conversation))
    }
  }

  const rate = (n: number, d: number) => (d > 0 ? n / d : null)
  const firstBuildPassRate = rate(checkPassed, checked)
  const arcadePassRate = rate(arcadePassed, arcadeChecked)
  const freeformPassRate = rate(freeformPassed, freeformChecked)
  const meanUserTurnsUntilPublish =
    publishedTurns.length > 0
      ? publishedTurns.reduce((a, b) => a + b, 0) / publishedTurns.length
      : null

  return {
    sampleSize: rows.length,
    failureCounts,
    firstBuildPassRate,
    arcadePassRate,
    arcadeSampleSize: arcadeChecked,
    freeformPassRate,
    freeformSampleSize: freeformChecked,
    critiqueSkipRate: rate(critiqueSkipped, critiqueKnown),
    meanUserTurnsUntilPublish,
    patchRate: rate(patchCount, editKnown),
    fullRewriteRate: rate(fullCount, editKnown),
    missingHarvestRate: rate(harvestMissing, harvestKnown),
    targetFirstBuildPass: FIRST_BUILD_LAYOUT_PASS_TARGET,
    meetsTarget:
      firstBuildPassRate == null ? null : firstBuildPassRate >= FIRST_BUILD_LAYOUT_PASS_TARGET,
    meetsArcadeTarget:
      arcadePassRate == null ? null : arcadePassRate >= FIRST_BUILD_LAYOUT_PASS_TARGET,
  }
}

/** Props shape for creator_first_build_check telemetry. */
export function firstBuildCheckProps(input: {
  ok: boolean
  errors?: string[]
  critiqueSkipped?: boolean
  editMode?: 'patch' | 'full'
  mechanic?: string
  buildPath?: 'arcade' | 'freeform'
}): Record<string, unknown> {
  const classes = classifyGateErrors(input.ok ? [] : input.errors || ['other'])
  return {
    ok: input.ok,
    failure_classes: classes,
    critique_skipped: Boolean(input.critiqueSkipped),
    edit_mode: input.editMode || null,
    mechanic: input.mechanic || null,
    build_path: input.buildPath || null,
  }
}
