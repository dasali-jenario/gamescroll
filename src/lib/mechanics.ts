/** Mechanic families + skeletons for the UGC creator. Deno copy: supabase/functions/_shared/mechanics.ts */

export type MechanicFamily =
  | 'reaction'
  | 'timing'
  | 'dodge'
  | 'drag'
  | 'stack'
  | 'merge'
  | 'sort'
  | 'grid'
  | 'word'
  | 'custom'

const FAMILY_HINTS: { family: MechanicFamily; re: RegExp }[] = [
  // Puzzle families first — their prompts often contain arcade words too.
  {
    family: 'word',
    re: /\b(wordle|word\s*(guess|game|puzzle)|guess\s+the\s+word|five[- ]letter|5[- ]letter)\b/i,
  },
  {
    family: 'sort',
    re: /\b(water\s*sort|colou?r\s*sort|ball\s*sort|sort\s+(the\s+)?(colou?rs|tubes|liquids|balls)|pour|tubes?|flasks?|vials?)\b/i,
  },
  {
    family: 'merge',
    re: /\b(merge|merging|suika|watermelon\s*game|fuse|combine\s+(fruits?|balls?|orbs?|gems?|veggies?|vegetables?))\b/i,
  },
  {
    family: 'grid',
    re: /\b(memory|match(ing)?\s+(the\s+)?(pairs?|cards?)|pairs?\s+match|flip\s+(the\s+)?cards?|concentration)\b/i,
  },
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

  merge: `MECHANIC TEMPLATE — merge (official HTML5/JS canvas style, like Orb/Veggie Merge):
Physics drop-merge in a jar: drag to aim, release to drop. Same-tier pieces merge into the next tier.
Combo multiplier on quick chains → bump(pts) with popup; danger line at jar top → die() when held over it.
Tier table with colors/sprites; next-piece preview. PF.sky background, particles on merge.`,

  sort: `MECHANIC TEMPLATE — sort (official HTML5/JS canvas style, like Color Pour):
Tube-sort level puzzle: tap a tube to select, tap another to pour top color onto matching color or empty space.
Level won when every tube is mono-color or empty → level++ and setScore(level); scrambles get harder per level.
Animated pour with easing; give-up CTA in lower band. PF.sky background, comic outlines.`,

  grid: `MECHANIC TEMPLATE — grid (official HTML5/JS canvas style, like Memory Match):
Card/tile grid puzzle in the focal band: tap two cards to flip; matching pair stays open → bump(); mismatch flips back.
Clear the board → completion bonus scaled by moves, then next round. PF.sky + PF.block cards, symbol faces.`,

  word: `MECHANIC TEMPLATE — word (official HTML5/JS canvas style, like Wordle Mini):
Guess-the-word grid (6 rows × 5 letters) with an on-canvas keyboard in the lower band (canvas-drawn, hit-tested keys).
Green/yellow/grey letter feedback on submit; win → bump(rows remaining); out of rows → die() and reveal answer.
All UI drawn on canvas from layout rects — no DOM keyboard.`,

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
