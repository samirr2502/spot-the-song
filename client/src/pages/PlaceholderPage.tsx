import { Link } from 'react-router-dom'
import { SketchButton, SketchCard } from '../components/sketch'

type PlaceholderPageProps = {
  title: string
  phase: string
}

export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <main className="page">
      <SketchCard tiltSeed={title}>
        <h1 className="page-title page-title--sm">{title}</h1>
        <p className="placeholder-note">Coming in {phase}.</p>
        <p className="placeholder-note">See docs/IMPLEMENTATION_PLAN.md for scope.</p>
      </SketchCard>
      <Link to="/home">
        <SketchButton variant="ghost" fullWidth>
          Back home
        </SketchButton>
      </Link>
    </main>
  )
}
