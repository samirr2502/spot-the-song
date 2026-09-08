import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SketchButton, SketchCard, SketchInput } from '../components/sketch'

import { savePlayerName, getPlayerName } from '../lib/session'

export function LandingPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')

  useEffect(() => {
    const saved = getPlayerName()
    if (saved) setName(saved)
  }, [])

  function handleContinue() {
    const trimmed = name.trim()
    if (!trimmed) return
    savePlayerName(trimmed)
    navigate('/home')
  }

  return (
    <main className="page page--landing">
      <header className="page-header page-header--landing">
        <p className="page-eyebrow">multiplayer music party game</p>
        <h1 className="page-title">Spot the Song</h1>
      </header>

      <SketchCard className="landing-card" tiltSeed="landing">
        <SketchInput
          label="Your name"
          name="playerName"
          placeholder="e.g. Sam"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleContinue()
          }}
          autoComplete="nickname"
          autoFocus
        />
        <SketchButton fullWidth onClick={handleContinue} disabled={!name.trim()}>
          Continue
        </SketchButton>
      </SketchCard>
    </main>
  )
}
