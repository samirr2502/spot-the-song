import { type FormEvent, useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { GuessFieldKey, VotePayload } from '@spot-the-song/shared'
import { mergeVotePayloadWithDefaults } from '@spot-the-song/shared'
import { RoundClipPlayer } from '../components/RoundClipPlayer'
import {
  SketchButton,
  SketchCard,
  SketchModal,
  SketchScore,
  SketchSongCard,
  SketchTimer,
} from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useCountdown } from '../hooks/useCountdown'
import { useDeadlineAutoSubmit } from '../hooks/useDeadlineAutoSubmit'
import { useRoomStatusRedirect } from '../hooks/useRoomNavigation'
import { formatFieldScoreLabel } from '../lib/revealFieldLabel'

const FIELD_LABELS: Record<GuessFieldKey, string> = {
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  year: 'Year',
}

const VOTING_SECONDS = 15

export function TurnGuessPlayPage() {
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const {
    room,
    session,
    isHost,
    roundResults,
    busy,
    error,
    submitVotes,
    turnGuessDone,
    continueAfterResults,
    clearError,
  } = useRoom()

  const [doneConfirmOpen, setDoneConfirmOpen] = useState(false)

  useRoomStatusRedirect(code, ['playing', 'round-results'])

  const normalizedCode = code.toUpperCase()
  const inRoom = room?.code === normalizedCode && session?.roomCode === normalizedCode
  const round = room?.currentRound
  const endsAt = round?.endsAt
  const secondsRemaining = useCountdown(endsAt)
  const clipDurationSeconds = room?.settings.clipDurationSeconds ?? 30
  const guessTimerSeconds = room?.settings.guessTimerSeconds ?? 0
  const totalGuessSeconds = clipDurationSeconds + guessTimerSeconds
  const clipSecondsRemaining = useCountdown(round?.clipEndsAt ?? null)
  const clipEndsAt = round?.clipEndsAt ?? null

  const enabledFields = useMemo(() => {
    if (!room) return [] as GuessFieldKey[]
    return (['title', 'artist', 'album', 'year'] as const).filter((field) => room.settings.guessFields[field])
  }, [room])

  const activePlayer = useMemo(() => {
    if (!room || !round?.activePlayerId) return null
    return room.players.find((player) => player.id === round.activePlayerId) ?? null
  }, [room, round?.activePlayerId])

  const isActivePlayer = !!session && session.playerId === round?.activePlayerId
  const hasSubmitted =
    !!session && !!round?.submittedPlayerIds?.includes(session.playerId)
  const isClipPlaying = room?.status === 'playing' && round?.phase === 'clip-playing'
  const isGuessing =
    room?.status === 'playing' && (round?.phase === 'playing' || round?.phase === 'clip-playing')
  const isVoting = room?.status === 'playing' && round?.phase === 'voting'
  const isRoundResults = room?.status === 'round-results'
  const showIntro = room?.status === 'playing' && round?.phase === 'round-intro'

  const [votes, setVotes] = useState<VotePayload>({})
  const votesRef = useRef(votes)
  votesRef.current = votes

  const voterCount = useMemo(() => {
    if (!room || !round?.activePlayerId) return 0
    return room.players.filter((player) => player.connected && player.id !== round.activePlayerId).length
  }, [room, round?.activePlayerId])

  const activeResult = roundResults?.playerResults.find(
    (entry) => entry.playerId === roundResults.activePlayerId,
  )

  function setVote(field: GuessFieldKey, value: boolean) {
    setVotes((current) => ({ ...current, [field]: value }))
  }

  function buildVotesWithDefaults(): VotePayload {
    if (!room) return {}
    return mergeVotePayloadWithDefaults(votesRef.current, room.settings.guessFields)
  }

  async function handleSubmitVotes(event: FormEvent) {
    event.preventDefault()
    clearError()

    const payload = buildVotesWithDefaults()
    const ok = await submitVotes(payload)
    if (ok) {
      setVotes({})
    }
  }

  const autoSubmitVotes = useCallback(async () => {
    if (!isVoting || isActivePlayer || hasSubmitted || !room) return
    clearError()
    const ok = await submitVotes(buildVotesWithDefaults())
    if (ok) {
      setVotes({})
    }
  }, [clearError, hasSubmitted, isActivePlayer, isVoting, room, submitVotes])

  useDeadlineAutoSubmit({
    enabled: isVoting && !isActivePlayer,
    endsAt,
    secondsRemaining,
    alreadyDone: hasSubmitted,
    triggerAtOrBelow: 1,
    onAutoSubmit: autoSubmitVotes,
  })

  async function handleConfirmDone() {
    clearError()
    const ok = await turnGuessDone()
    setDoneConfirmOpen(false)
    if (!ok) return
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
        <SketchCard tiltSeed="turn-play-loading">
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

        <SketchSongCard track={roundResults.track} showSpotifyLink jamHint />

        {activePlayer ? (
          <SketchCard tiltSeed="active-player-result">
            <p className="page-eyebrow">active player</p>
            <p className="turn-active-name">{activePlayer.name}</p>
          </SketchCard>
        ) : null}

        {roundResults.fieldOutcomes?.length ? (
          <SketchCard tiltSeed="vote-outcomes">
            <h2 className="lobby-players__title">Votes</h2>
            <ul className="vote-outcome-list">
              {roundResults.fieldOutcomes.map((outcome) => (
                <li
                  key={outcome.field}
                  className={`vote-outcome-list__item${outcome.accepted ? ' vote-outcome-list__item--accepted' : ''}`}
                >
                  <span>{FIELD_LABELS[outcome.field]}</span>
                  <span>
                    {outcome.yesVotes} yes / {outcome.noVotes} no —{' '}
                    {outcome.accepted ? 'Accepted' : 'Rejected'}
                  </span>
                </li>
              ))}
            </ul>
          </SketchCard>
        ) : null}

        {activeResult ? (
          <SketchCard tiltSeed="turn-round-score">
            <h2 className="lobby-players__title">Round points</h2>
            {activeResult.fieldScores.map((entry) => (
              <SketchScore
                key={entry.field}
                label={formatFieldScoreLabel(entry.field, entry.correct, entry.answer)}
                value={entry.points}
                highlight={entry.correct}
              />
            ))}
            <p className="round-total">Round total: +{activeResult.totalRoundPoints}</p>
          </SketchCard>
        ) : null}

        <SketchCard tiltSeed="turn-leaderboard">
          <h2 className="lobby-players__title">Leaderboard</h2>
          <ol className="leaderboard-list">
            {roundResults.leaderboard.map((entry, index) => (
              <li key={entry.playerId} className="leaderboard-list__item">
                <span>
                  {index + 1}. {entry.name}
                </span>
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
          <SketchCard tiltSeed="turn-wait-results" className="lobby-wait-card">
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
        <h1 className="page-title page-title--sm">
          {showIntro ? 'Get ready…' : isVoting ? 'Vote time' : 'Turn Guess'}
        </h1>
      </header>

      {activePlayer && !isActivePlayer ? (
        <SketchCard tiltSeed="active-announce" className="turn-active-banner">
          <p className="page-eyebrow">active player</p>
          <p className="turn-active-name">{activePlayer.name}</p>
        </SketchCard>
      ) : null}

      <RoundClipPlayer
        isHost={isHost}
        playbackMode={room.settings.playbackMode}
        phase={round?.phase}
        clipDurationSeconds={clipDurationSeconds}
        endsAt={clipEndsAt}
        secondsRemaining={isClipPlaying ? clipSecondsRemaining : clipDurationSeconds}
      />

      {isGuessing ? (
        <SketchTimer
          secondsRemaining={secondsRemaining}
          totalSeconds={totalGuessSeconds}
          label={
            guessTimerSeconds === 0
              ? 'Guess during the clip'
              : isClipPlaying
                ? 'Listen and guess while the clip plays'
                : 'Extra guess time'
          }
        />
      ) : null}

      {round?.phase === 'voting' ? (
        <SketchTimer
          secondsRemaining={secondsRemaining}
          totalSeconds={VOTING_SECONDS}
          label="Voting time"
        />
      ) : null}

      {showIntro ? (
        <SketchCard tiltSeed="turn-intro" className="lobby-wait-card">
          {isActivePlayer ? (
            <p>Your turn is starting — listen to the clip!</p>
          ) : (
            <p>{activePlayer?.name ?? 'Someone'} is up next…</p>
          )}
        </SketchCard>
      ) : null}

      {isGuessing && isActivePlayer ? (
        <SketchCard tiltSeed="turn-prompt">
          <h2 className="lobby-players__title">Say aloud:</h2>
          <ul className="how-to-list">
            {enabledFields.map((field) => (
              <li key={field}>{FIELD_LABELS[field]}</li>
            ))}
          </ul>
          {isClipPlaying ? (
            <p className="lobby-players__status">You can start guessing during the clip.</p>
          ) : null}
          <SketchButton type="button" fullWidth disabled={busy} onClick={() => setDoneConfirmOpen(true)}>
            Done guessing
          </SketchButton>
        </SketchCard>
      ) : null}

      {isGuessing && !isActivePlayer ? (
        <SketchCard tiltSeed="turn-wait-guess" className="lobby-wait-card">
          <p>{activePlayer?.name ?? 'Active player'} is guessing…</p>
        </SketchCard>
      ) : null}

      {isVoting && isActivePlayer ? (
        <SketchCard tiltSeed="turn-wait-vote" className="lobby-wait-card">
          <p>Waiting for votes…</p>
        </SketchCard>
      ) : null}

      {isVoting && !isActivePlayer && round?.challengeTrack ? (
        <SketchCard tiltSeed="turn-vote-reveal">
          <p className="page-eyebrow">the song</p>
          <SketchSongCard track={round.challengeTrack} compact />
        </SketchCard>
      ) : null}

      {isVoting && !isActivePlayer && !hasSubmitted ? (
        <SketchCard tiltSeed="turn-votes">
          <form className="setup-form" onSubmit={handleSubmitVotes}>
            <p className="page-subtitle">Did they get it right?</p>
            {enabledFields.map((field) => (
              <div key={field} className="vote-field">
                <p className="vote-field__label">{FIELD_LABELS[field]}</p>
                <div className="vote-field__buttons">
                  <SketchButton
                    type="button"
                    variant={votes[field] === true ? 'primary' : 'ghost'}
                    onClick={() => setVote(field, true)}
                  >
                    Yes
                  </SketchButton>
                  <SketchButton
                    type="button"
                    variant={votes[field] === false ? 'primary' : 'ghost'}
                    onClick={() => setVote(field, false)}
                  >
                    No
                  </SketchButton>
                </div>
              </div>
            ))}
            {error ? <p className="form-error">{error}</p> : null}
            <SketchButton type="submit" fullWidth disabled={busy}>
              Submit votes
            </SketchButton>
          </form>
        </SketchCard>
      ) : null}

      {isVoting && !isActivePlayer && hasSubmitted ? (
        <SketchCard tiltSeed="turn-voted" className="lobby-wait-card">
          <p>Votes submitted — waiting for others…</p>
          <p className="lobby-players__status">
            {round?.submittedPlayerIds?.length ?? 0} / {voterCount} voted
          </p>
        </SketchCard>
      ) : null}

      <SketchModal
        open={doneConfirmOpen}
        title="Done guessing?"
        onClose={() => setDoneConfirmOpen(false)}
      >
        <p className="connection-status__confirm-text">
          Move on to voting? You can&apos;t take back guesses once voting starts.
        </p>
        <div className="connection-status__confirm-actions">
          <SketchButton type="button" variant="ghost" fullWidth onClick={() => setDoneConfirmOpen(false)}>
            Keep guessing
          </SketchButton>
          <SketchButton type="button" fullWidth disabled={busy} onClick={() => void handleConfirmDone()}>
            {busy ? '…' : 'Start voting'}
          </SketchButton>
        </div>
      </SketchModal>
    </main>
  )
}
