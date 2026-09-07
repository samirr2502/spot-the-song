import { Link } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="app-header">
        <Link to="/" className="logo">Spot the Song</Link>
      </header>
      <main>{children}</main>
      <footer className="app-footer">
        Guess the song. Score points. Pass the phone or play online.
      </footer>
    </>
  )
}
