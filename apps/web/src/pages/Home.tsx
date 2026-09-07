import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="home-hero">
      <h1 className="home-hero__title">Spot the Song</h1>
      <p className="home-hero__subtitle">Guess the track. Build the timeline. Beat your friends.</p>

      <div className="mode-cards">
        <Link to="/local/setup" className="mode-card-v2 card">
          <svg className="mode-card-v2__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <line x1="12" y1="18" x2="12" y2="18.01" />
          </svg>
          <h2>Local Game</h2>
          <p>Pass-and-play on one device</p>
        </Link>
        <Link to="/online/create" className="mode-card-v2 card">
          <svg className="mode-card-v2__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h2>Online Game</h2>
          <p>Each player on their phone</p>
        </Link>
      </div>

      <div className="home-links">
        <Link to="/how-to-play" className="btn btn-ghost">
          How to play
        </Link>
        <span className="muted"> · </span>
        <Link to="/online/join">Join with code</Link>
      </div>
    </div>
  )
}
