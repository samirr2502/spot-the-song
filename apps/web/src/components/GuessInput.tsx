import { FormEvent, useState } from 'react'

type GuessInputProps = {
  disabled?: boolean
  alreadyGuessed?: boolean
  onSubmit: (guess: string) => void
}

export default function GuessInput({ disabled, alreadyGuessed = false, onSubmit }: GuessInputProps) {
  const [guess, setGuess] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!guess.trim()) return
    onSubmit(guess.trim())
    setGuess('')
  }

  return (
    <form className="guess-section" onSubmit={handleSubmit}>
      <div className="field">
        <label className="label" htmlFor="guess">Name the song (optional, +1 coin)</label>
        <input
          id="guess"
          className="input"
          value={guess}
          onChange={(event) => setGuess(event.target.value)}
          placeholder="Song title or artist — close spelling counts"
          disabled={disabled || alreadyGuessed}
          autoComplete="off"
        />
      </div>
      {alreadyGuessed ? (
        <p className="muted">Guess submitted for this turn.</p>
      ) : (
        <button className="btn btn-secondary btn-block" type="submit" disabled={disabled || !guess.trim()}>
          Submit Guess
        </button>
      )}
    </form>
  )
}
