/** Mechanic families + skeletons for the UGC creator. Deno copy: supabase/functions/_shared/mechanics.ts */

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
  reaction: `MECHANIC TEMPLATE — reaction:
State machine: idle → waiting → go → result|foul.
CTA button rect in lower third (band:cta). Focal signal in center band (band:focal). Title in title band.
On early tap during waiting → die()/foul. On tap during go → setScore(ms). layout()+getBoundingClientRect required.`,

  timing: `MECHANIC TEMPLATE — timing:
Tap-anywhere (or full-width hit zone). Focal expanding/shrinking target in center band (band:focal).
Success when input lands in a timing window → bump(); miss → die(). Optional short hint in hint band. No lower CTA required.`,

  dodge: `MECHANIC TEMPLATE — dodge:
Player in lower/mid band; hazards spawn above and move down (or lanes scroll).
Input: tap sides / tilt proxy via left/right halves or drag. Collision → die(); near-miss or pass → bump().
Keep player rect (band:cta or focal) clear of HUD.`,

  drag: `MECHANIC TEMPLATE — drag:
Player/catcher follows pointer X (mapped via getBoundingClientRect) along lower band (band:cta).
Items spawn in focal band and fall; good catch → bump(); bad → die(). Hint text in hint/title band only.`,

  stack: `MECHANIC TEMPLATE — stack:
Moving piece in focal/upper-mid band; stack grows upward from lower band.
Tap to place; overlap with previous piece shrinks width; too small → die(); success → bump() and spawn next.
Primary input can be full-width tap (no big CTA) or a lower CTA.`,

  custom: `MECHANIC TEMPLATE — custom:
Pick the closest of reaction/timing/dodge/drag/stack structure. Still require layout(), safe bands, layoutPlan, and host contract.`,
}

export function mechanicSeedMessage(family: MechanicFamily): string {
  return [
    `Selected mechanic family: ${family}.`,
    'Use this template as the structural seed for bodyJs + layoutPlan (adapt visuals freely):',
    MECHANIC_TEMPLATES[family],
  ].join('\n')
}
