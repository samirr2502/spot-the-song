import { FormEvent, useState } from 'react'

type GuessInputProps = {
  disabled?: boolean
  alreadyGuessed?: boolean
  onSubmit: (guess: string) => void
  compact?: boolean
}

export default function GuessInput({
  disabled,
  alreadyGuessed = false,
  onSubmit,
  compact = false,
}: GuessInputProps) {
  const [guess, setGuess] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!guess.trim()) return
    onSubmit(guess.trim())
    setGuess('')
  }

  return (
    <form
      className={['guess-section', compact ? 'guess-section--compact' : ''].filter(Boolean).join(' ')}
      onSubmit={handleSubmit}
    >
      <div className="field">
        <label className="label" htmlFor="guess">
          {compact ? 'Guess for +1 coin' : 'Name the song (optional, +1 coin)'}
        </label>
        <div className={compact ? 'guess-section__row' : undefined}>
          <input
            id="guess"
            className="input"
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            placeholder={compact ? 'Title or artist' : 'Song title or artist — close spelling counts'}
            disabled={disabled || alreadyGuessed}
            autoComplete="off"
          />
          {!alreadyGuessed && compact && (
            <button
              className="btn btn-secondary"
              type="submit"
              disabled={disabled || !guess.trim()}
            >
              Guess
            </button>
          )}
        </div>
      </div>
      {alreadyGuessed ? (
        <p className="muted guess-section__status">Guess submitted.</p>
      ) : (
        !compact && (
          <button className="btn btn-secondary btn-block" type="submit" disabled={disabled || !guess.trim()}>
            Submit Guess
          </button>
        )
      )}
    </form>
  )
}
