import { Link, useLocation } from 'react-router-dom'
import { useSound } from '../context/SoundContext'
import OnboardingTooltip from './OnboardingTooltip'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { muted, toggleMuted } = useSound()
  const location = useLocation()

  return (
    <>
      <header className="app-header">
        <Link to="/" className="logo">
          Spot the Song
        </Link>
        <nav className="app-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Home
          </Link>
          <Link
            to="/how-to-play"
            className={location.pathname === '/how-to-play' ? 'active' : ''}
          >
            How to Play
          </Link>
          <button
            type="button"
            className={`mute-toggle ${muted ? 'mute-toggle--muted' : ''}`}
            onClick={toggleMuted}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="app-footer">Guess · Place · Win</footer>
      <OnboardingTooltip />
    </>
  )
}
