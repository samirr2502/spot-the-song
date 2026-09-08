import { type FormEvent, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { GuessFieldKey, SubmitAnswersPayload } from '@spot-the-song/shared'
import { RoundClipPlayer } from '../components/RoundClipPlayer'
import {
  SketchButton,
  SketchCard,
  SketchInput,
  SketchScore,
  SketchSongCard,
  SketchTimer,
} from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useCountdown } from '../hooks/useCountdown'
import { useRoomStatusRedirect } from '../hooks/useRoomNavigation'
import { formatFieldScoreLabel } from '../lib/revealFieldLabel'

const FIELD_LABELS: Record<GuessFieldKey, string> = {
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  year: 'Year',
}

export function AllInPlayPage() {
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const {
    room,
    session,
    isHost,
    roundResults,
    busy,
    error,
    submitAnswers,
    continueAfterResults,
    clearError,
  } = useRoom()

  useRoomStatusRedirect(code, ['playing', 'round-results'])

  const normalizedCode = code.toUpperCase()
  const inRoom = room?.code === normalizedCode && session?.roomCode === normalizedCode
  const round = room?.currentRound
  const endsAt = round?.endsAt
  const secondsRemaining = useCountdown(endsAt)
  const guessTimerTotal = room?.settings.guessTimerSeconds ?? 30

  const enabledFields = useMemo(() => {
    if (!room) return [] as GuessFieldKey[]
    return (['title', 'artist', 'album', 'year'] as const).filter((field) => room.settings.guessFields[field])
  }, [room])

  const [answers, setAnswers] = useState<SubmitAnswersPayload>({})
  const hasSubmitted =
    !!session && !!round?.submittedPlayerIds?.includes(session.playerId)
  const isAnswering = room?.status === 'playing' && round?.phase === 'answering'
  const isRoundResults = room?.status === 'round-results'
  const showIntro = room?.status === 'playing' && round?.phase === 'round-intro'

  const myResult = roundResults?.playerResults.find((entry) => entry.playerId === session?.playerId)

  function updateAnswer(field: GuessFieldKey, value: string) {
    setAnswers((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    clearError()
    const ok = await submitAnswers(answers)
    if (ok) {
      setAnswers({})
    }
  }

  async function handleContinue() {
    clearError()
    if (!room || !roundResults) return

    const isLastRound = roundResults.roundIndex >= room.settings.roundCount
    const ok = await continueAfterResults()
    if (!ok) return

    navigate(isLastRound ? `/room/${normalizedCode}/results` : `/room/${normalizedCode}/play`)
  }

  if (!inRoom || !room) {
    return (
      <main className="page">
        <SketchCard tiltSeed="play-loading">
          <p>Loading game…</p>
        </SketchCard>
      </main>
    )
  }

  if (isRoundResults && roundResults) {
    return (
      <main className="page page--play">
        <header className="page-header">
          <p className="page-eyebrow">round {roundResults.roundIndex} results</p>
          <h1 className="page-title page-title--sm">Reveal</h1>
        </header>

        <SketchSongCard track={roundResults.track} showSpotifyLink />

        {myResult ? (
          <SketchCard tiltSeed="my-score">
            <h2 className="lobby-players__title">Your points</h2>
            {myResult.fieldScores.map((entry) => (
              <SketchScore
                key={entry.field}
                label={formatFieldScoreLabel(entry.field, roundResults.track, entry.correct)}
                value={entry.points}
                highlight={entry.correct}
              />
            ))}
            <SketchScore
              label="Speed bonus"
              value={myResult.speedBonus}
              highlight={myResult.speedBonus > 0}
            />
            <p className="round-total">Round total: +{myResult.totalRoundPoints}</p>
          </SketchCard>
        ) : null}

        <SketchCard tiltSeed="leaderboard">
          <h2 className="lobby-players__title">Leaderboard</h2>
          <ol className="leaderboard-list">
            {roundResults.leaderboard.map((entry, index) => (
              <li key={entry.playerId} className="leaderboard-list__item">
                <span>{index + 1}. {entry.name}</span>
                <span>{entry.score}</span>
              </li>
            ))}
          </ol>
        </SketchCard>

        {error ? <p className="form-error">{error}</p> : null}

        {isHost ? (
          <SketchButton fullWidth disabled={busy} onClick={handleContinue}>
            {busy ? '…' : roundResults.roundIndex >= room.settings.roundCount ? 'Final scores' : 'Next round'}
          </SketchButton>
        ) : (
          <SketchCard tiltSeed="wait-results" className="lobby-wait-card">
            <p>Waiting for host to continue…</p>
          </SketchCard>
        )}
      </main>
    )
  }

  return (
    <main className="page page--play">
      <header className="page-header">
        <p className="page-eyebrow">
          round {round?.index ?? 0} of {room.settings.roundCount}
        </p>
        <h1 className="page-title page-title--sm">{showIntro ? 'Get ready…' : 'All In'}</h1>
      </header>

      <RoundClipPlayer
        isHost={isHost}
        phase={round?.phase}
        clipDurationSeconds={room.settings.clipDurationSeconds}
        endsAt={round?.endsAt ?? null}
        secondsRemaining={secondsRemaining}
      />

      {round?.phase === 'answering' ? (
        <SketchTimer
          secondsRemaining={secondsRemaining}
          totalSeconds={guessTimerTotal}
          label="Time left"
        />
      ) : null}

      {isAnswering && !hasSubmitted ? (
        <SketchCard tiltSeed="answers">
          <form className="setup-form" onSubmit={handleSubmit}>
            {enabledFields.map((field) => (
              <SketchInput
                key={field}
                label={FIELD_LABELS[field]}
                name={field}
                value={answers[field] ?? ''}
                onChange={(event) => updateAnswer(field, event.target.value)}
                autoComplete="off"
              />
            ))}
            {error ? <p className="form-error">{error}</p> : null}
            <SketchButton type="submit" fullWidth disabled={busy}>
              Submit answers
            </SketchButton>
          </form>
        </SketchCard>
      ) : null}

      {hasSubmitted && isAnswering ? (
        <SketchCard tiltSeed="submitted" className="lobby-wait-card">
          <p>Submitted — waiting for others…</p>
          <p className="lobby-players__status">
            {round?.submittedPlayerIds?.length ?? 0} / {room.players.filter((p) => p.connected).length} in
          </p>
        </SketchCard>
      ) : null}

      {showIntro ? (
        <SketchCard tiltSeed="intro" className="lobby-wait-card">
          <p>Clip starting…</p>
        </SketchCard>
      ) : null}
    </main>
  )
}
