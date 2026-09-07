import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="stack">
      <h1 className="page-title">Spot the Song</h1>
      <p className="page-subtitle">
        Shuffle albums, take turns guessing songs, and track scores — on one device or across phones.
      </p>

      <div className="row" style={{ justifyContent: 'center' }}>
        <Link to="/local/setup" className="card mode-card" style={{ flex: '1 1 260px', maxWidth: 360 }}>
          <h2>Local Game</h2>
          <p>Pass-and-play on a single device. Great for game night.</p>
        </Link>
        <Link to="/online/create" className="card mode-card" style={{ flex: '1 1 260px', maxWidth: 360 }}>
          <h2>Online Game</h2>
          <p>Each player joins on their phone. Songs sync on every turn.</p>
        </Link>
      </div>

      <p className="centered muted">
        Already have a code? <Link to="/online/join">Join a room</Link>
      </p>
    </div>
  )
}
