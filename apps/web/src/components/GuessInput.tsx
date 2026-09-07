import { FormEvent, useState } from 'react'

type GuessInputProps = {
  disabled?: boolean
  onSubmit: (guess: string) => void
}

export default function GuessInput({ disabled, onSubmit }: GuessInputProps) {
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
        <label className="label" htmlFor="guess">Your guess</label>
        <input
          id="guess"
          className="input"
          value={guess}
          onChange={(event) => setGuess(event.target.value)}
          placeholder="Song title or artist"
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      <button className="btn btn-primary btn-block" type="submit" disabled={disabled || !guess.trim()}>
        Submit Guess
      </button>
    </form>
  )
}
