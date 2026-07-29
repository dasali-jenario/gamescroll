import type { LayoutRect } from '../lib/layoutPlan'

type Props = {
  plan: LayoutRect[]
  visible: boolean
}

const BAND_COLOR: Record<string, string> = {
  hud: 'rgba(80,80,100,0.55)',
  title: 'rgba(70,120,200,0.5)',
  focal: 'rgba(46,196,182,0.45)',
  hint: 'rgba(180,180,100,0.45)',
  cta: 'rgba(231,111,81,0.5)',
  other: 'rgba(120,120,140,0.4)',
}

/** Debug overlay of layoutPlan fractions on the creator preview frame. */
export function LayoutPlanOverlay({ plan, visible }: Props) {
  if (!visible || !plan.length) return null
  return (
    <div className="create-plan-overlay" aria-hidden>
      {plan.map((r) => (
        <div
          key={r.id}
          className="create-plan-rect"
          style={{
            left: `${r.x * 100}%`,
            top: `${r.y * 100}%`,
            width: `${r.w * 100}%`,
            height: `${r.h * 100}%`,
            background: BAND_COLOR[r.band] || BAND_COLOR.other,
          }}
          title={`${r.id} (${r.band})`}
        >
          <span>{r.id}</span>
        </div>
      ))}
    </div>
  )
}
