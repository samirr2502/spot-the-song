import type { HowToPlayMode } from '../lib/howToPlay'

type HowToPlayStepsProps = {
  mode: HowToPlayMode
  showTagline?: boolean
}

export function HowToPlaySteps({ mode, showTagline = true }: HowToPlayStepsProps) {
  return (
    <>
      {showTagline ? <p className="how-to-tagline">{mode.tagline}</p> : null}
      <ul className="how-to-list">
        {mode.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </>
  )
}
