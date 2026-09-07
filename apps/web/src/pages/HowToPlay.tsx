function IconAlbums() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconListen() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function IconGuess() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconTimeline() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="4" height="16" rx="1" />
      <rect x="10" y="8" width="4" height="12" rx="1" />
      <rect x="17" y="6" width="4" height="14" rx="1" />
    </svg>
  )
}

function IconChallenge() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16h4v4" />
    </svg>
  )
}

function IconReveal() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

const STEPS = [
  {
    icon: IconAlbums,
    title: 'Set up',
    text: 'Add albums or join a room with a code.',
  },
  {
    icon: IconListen,
    title: 'Listen',
    text: 'Hear a short clip from a mystery song.',
  },
  {
    icon: IconGuess,
    title: 'Guess',
    text: 'Name the song to earn a coin.',
  },
  {
    icon: IconTimeline,
    title: 'Place',
    text: 'Drag the card into your timeline by release year.',
  },
  {
    icon: IconChallenge,
    title: 'Challenge',
    text: 'Spend 1 coin if you think someone placed wrong.',
  },
  {
    icon: IconReveal,
    title: 'Reveal',
    text: 'Flip the year — correct placement wins the card.',
  },
]

export default function HowToPlay() {
  return (
    <div className="stack how-to-play">
      <h1 className="page-title">How to Play</h1>

      <div className="how-to-steps">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          return (
            <article key={step.title} className="how-to-step card">
              <div className="how-to-step__icon">
                <Icon />
              </div>
              <span className="how-to-step__number">{index + 1}</span>
              <h2 className="how-to-step__title">{step.title}</h2>
              <p className="how-to-step__text">{step.text}</p>
            </article>
          )
        })}
      </div>

      <div className="how-to-tips card-panel">
        <h3 className="card-title">Quick tips</h3>
        <ul className="how-to-tips-list">
          <li>Starter cards show full info — they anchor your timeline.</li>
          <li>Wrong placement with no challenge sends the card to discard.</li>
          <li>First to build the best timeline wins.</li>
        </ul>
      </div>
    </div>
  )
}
