import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const ONBOARDING_KEY = 'sts-onboarding-done'

const SLIDES = [
  {
    title: 'Listen & guess',
    text: 'Hear a clip, name the song, earn coins.',
  },
  {
    title: 'Build your timeline',
    text: 'Place cards in order by release year.',
  },
  {
    title: 'Challenge & reveal',
    text: 'Call out wrong placements, then flip the year.',
  },
]

export default function OnboardingTooltip() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isPlayRoute = location.pathname.startsWith('/local/play') ||
    location.pathname.startsWith('/online/play')

  const [visible, setVisible] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(ONBOARDING_KEY) !== 'true'
  })
  const [slide, setSlide] = useState(0)

  if (!visible || !isHome || isPlayRoute) return null

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setVisible(false)
  }

  function next() {
    if (slide < SLIDES.length - 1) {
      setSlide(slide + 1)
    } else {
      dismiss()
    }
  }

  const current = SLIDES[slide]

  return (
    <div className="onboarding-overlay" role="dialog" aria-label="Quick tutorial">
      <div className="onboarding-card">
        <div className="onboarding-dots">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot ${i === slide ? 'onboarding-dot--active' : ''}`}
            />
          ))}
        </div>
        <h2>{current.title}</h2>
        <p>{current.text}</p>
        <div className="row" style={{ justifyContent: 'center', gap: 'var(--space-sm)' }}>
          <button type="button" className="btn btn-ghost" onClick={dismiss}>
            Skip
          </button>
          <button type="button" className="btn btn-primary" onClick={next}>
            {slide < SLIDES.length - 1 ? 'Next' : 'Got it'}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-xs)' }}>
          <Link to="/how-to-play" onClick={dismiss}>
            Full rules
          </Link>
        </p>
      </div>
    </div>
  )
}
