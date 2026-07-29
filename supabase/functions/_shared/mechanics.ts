/** Deno copy of src/lib/mechanics.ts — keep in sync via `node scripts/sync-shared.mjs`. */

export type MechanicFamily =
  | 'reaction'
  | 'timing'
  | 'dodge'
  | 'drag'
  | 'stack'
  | 'custom'

const FAMILY_HINTS: { family: MechanicFamily; re: RegExp }[] = [
  { family: 'stack', re: /\b(stack|tower|place|drop.?block|align.?block)\b/i },
  { family: 'drag', re: /\b(drag|slide|catch|paddle|basket|move\s+(left|right)|follow\s+finger)\b/i },
  { family: 'dodge', re: /\b(dodge|avoid|swerve|lane|traffic|obstacle|miss\s+the)\b/i },
  { family: 'timing', re: /\b(timing|pulse|ring|beat|rhythm|perfect\s+moment|when\s+they\s+overlap)\b/i },
  {
    family: 'reaction',
    re: /\b(react|reaction|green\s+light|false\s+start|wait\s+then\s+tap|traffic\s+light|go\s+signal)\b/i,
  },
]

export function inferMechanic(text: string): MechanicFamily {
  for (const { family, re } of FAMILY_HINTS) {
    if (re.test(text)) return family
  }
  return 'custom'
}

export function inferMechanicFromMessages(
  messages: { role: string; content: string }[],
): MechanicFamily {
  const blob = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n')
  return inferMechanic(blob)
}

/** Short structural seeds — not full games; model must expand into complete bodyJs + layoutPlan. */
export const MECHANIC_TEMPLATES: Record<MechanicFamily, string> = {
  reaction: `MECHANIC TEMPLATE — reaction (official HTML5/JS canvas style):
State machine: idle → waiting → go → result|foul.
CTA button rect in lower third (band:cta). Focal signal in center band (band:focal). Title in title band.
On early tap during waiting → die()/foul. On tap during go → setScore(ms).
Must include: layout()+scorePos+diePos, PF.sky/blobs/dots + soft/block draw, getBoundingClientRect pointer map.`,

  timing: `MECHANIC TEMPLATE — timing (official HTML5/JS canvas style):
Tap-anywhere (or full-width hit zone). Focal expanding/shrinking target in center band (band:focal).
Success when input lands in a timing window → bump(); miss → die(). Optional short hint in hint band. No lower CTA required.
Must include: layout()+scorePos+diePos, PF.sky + soft/block rings, catalog feel.`,

  dodge: `MECHANIC TEMPLATE — dodge (official HTML5/JS canvas style):
Player in lower/mid band; hazards spawn above and move down (or lanes scroll).
Input: tap sides / left-right halves or drag. Collision → die(); near-miss or pass → bump().
Draw with PF.sky + PF.buddy player + PF.block hazards. Keep player clear of HUD. scorePos/diePos on player.`,

  drag: `MECHANIC TEMPLATE — drag (official HTML5/JS canvas style):
Player/catcher follows pointer X (mapped via getBoundingClientRect) along lower band (band:cta).
Items spawn in focal band and fall; good catch → bump(); bad → die(). Hint text in hint/title band only.
PF.sky + PF.buddy catcher + PF.soft items. scorePos/diePos on catcher.`,

  stack: `MECHANIC TEMPLATE — stack (official HTML5/JS canvas style):
Moving piece in focal/upper-mid band; stack grows upward from lower band.
Tap to place; overlap with previous piece shrinks width; too small → die(); success → bump() and spawn next.
PF.sky + PF.block pieces. scorePos/diePos on current piece.`,

  custom: `MECHANIC TEMPLATE — custom (official HTML5/JS canvas style):
Pick the closest of reaction/timing/dodge/drag/stack structure. Still require layout(), scorePos, diePos, PF.sky + PF helpers, safe bands, layoutPlan, and host contract — same quality as generate-games.mjs catalog games.`,
}

export function mechanicSeedMessage(family: MechanicFamily): string {
  // Prefer scaffold seed — see scaffoldSeedMessage in mechanicScaffolds.ts (Edge imports it).
  return [
    `Selected mechanic family: ${family}.`,
    'Use the GOLDEN SCAFFOLD path when provided: fill slots only; do not invent layout coordinates.',
    MECHANIC_TEMPLATES[family],
  ].join('\n')
}
