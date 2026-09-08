import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SketchButton,
  SketchCard,
  SketchCheckbox,
  SketchDivider,
  SketchInput,
  SketchModal,
  SketchRadio,
  SketchScore,
  SketchSongCard,
  SketchTimer,
} from '../components/sketch'

import { savePlayerName, getPlayerName } from '../lib/session'

export function LandingPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [showModal, setShowModal] = useState(false)

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
      <header className="page-header">
        <p className="page-eyebrow">multiplayer music party game</p>
        <h1 className="page-title">Spot the Song</h1>
        <p className="page-subtitle">sketched in a notebook, played on your phone</p>
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

      <SketchDivider label="sketch kit preview" />

      <section className="sketch-preview" aria-label="Sketch UI preview">
        <div className="sketch-preview__row">
          <SketchCheckbox label="Title" defaultChecked />
          <SketchCheckbox label="Artist" />
        </div>
        <div className="sketch-preview__row">
          <SketchRadio name="mode" label="All In" defaultChecked />
          <SketchRadio name="mode" label="Turns" />
        </div>
        <SketchTimer secondsRemaining={12} totalSeconds={30} label="Round" />
        <SketchScore label="Speed bonus" value={25} highlight />
        <SketchSongCard
          track={{
            title: 'Example Track',
            artist: 'The Sketch Band',
            album: 'Notebook Sessions',
            year: 1999,
          }}
        />
        <SketchButton variant="ghost" onClick={() => setShowModal(true)}>
          Open modal
        </SketchButton>
      </section>

      <SketchModal open={showModal} title="How it feels" onClose={() => setShowModal(false)}>
        <p>Rough edges, handwritten type, no glossy SaaS polish — just a party game drawn in pencil.</p>
      </SketchModal>
    </main>
  )
}
