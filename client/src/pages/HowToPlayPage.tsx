import { Link } from 'react-router-dom'
import { HowToPlaySteps } from '../components/HowToPlaySteps'
import { SketchButton, SketchCard, SketchDivider } from '../components/sketch'
import { HOW_TO_PLAY_MODES, HOW_TO_PLAY_OVERVIEW } from '../lib/howToPlay'

export function HowToPlayPage() {
  return (
    <main className="page page--how-to">
      <header className="page-header">
        <h1 className="page-title page-title--sm">How to play</h1>
        <p className="page-subtitle">A multiplayer music party game on your phones</p>
      </header>

      <SketchCard tiltSeed="how-to-overview">
        <h2 className="how-to-section__title">The basics</h2>
        <ul className="how-to-list">
          {HOW_TO_PLAY_OVERVIEW.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </SketchCard>

      <SketchDivider label="game modes" />

      {HOW_TO_PLAY_MODES.map((mode) => (
        <SketchCard key={mode.id} tiltSeed={`how-to-${mode.id}`} className="how-to-section">
          <h2 className="how-to-section__title">{mode.title}</h2>
          <HowToPlaySteps mode={mode} />
        </SketchCard>
      ))}

      <Link to="/home">
        <SketchButton variant="ghost" fullWidth>
          Back home
        </SketchButton>
      </Link>
    </main>
  )
}
