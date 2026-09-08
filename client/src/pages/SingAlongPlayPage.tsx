import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MAX_RATING, MIN_RATING, resolveRatingOrDefault } from '@spot-the-song/shared'
import {
  SketchButton,
  SketchCard,
  SketchScore,
  SketchSongCard,
  SketchTimer,
} from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { useCountdown } from '../hooks/useCountdown'
import { useDeadlineAutoSubmit } from '../hooks/useDeadlineAutoSubmit'
import { useRoomStatusRedirect } from '../hooks/useRoomNavigation'

const RATING_SECONDS = 20

const RATING_OPTIONS = Array.from(
  { length: MAX_RATING - MIN_RATING + 1 },
  (_, index) => MIN_RATING + index,
)

export function SingAlongPlayPage() {
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const {
    room,
    session,
    isHost,
    roundResults,
    busy,
    error,
    submitRating,
    hostStartRating,
    continueAfterResults,
    clearError,
  } = useRoom()

  useRoomStatusRedirect(code, ['playing', 'round-results'])

  const normalizedCode = code.toUpperCase()
  const inRoom = room?.code === normalizedCode && session?.roomCode === normalizedCode
  const round = room?.currentRound
  const endsAt = round?.endsAt
  const secondsRemaining = useCountdown(endsAt)
  const singTimerTotal = room?.settings.singTimerSeconds ?? 45

  const activePlayer = useMemo(() => {
    if (!room || !round?.activePlayerId) return null
    return room.players.find((player) => player.id === round.activePlayerId) ?? null
  }, [room, round?.activePlayerId])

  const isActivePlayer = !!session && session.playerId === round?.activePlayerId
  const hasSubmitted =
    !!session && !!round?.submittedPlayerIds?.includes(session.playerId)
  const isPerforming = room?.status === 'playing' && round?.phase === 'playing'
  const isRating = room?.status === 'playing' && round?.phase === 'rating'
  const isRoundResults = room?.status === 'round-results'
  const showIntro = room?.status === 'playing' && round?.phase === 'round-intro'

  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const selectedRatingRef = useRef(selectedRating)
  selectedRatingRef.current = selectedRating

  const raterCount = useMemo(() => {
    if (!room || !round?.activePlayerId) return 0
    return room.players.filter((player) => player.connected && player.id !== round.activePlayerId).length
  }, [room, round?.activePlayerId])

  const activeResult = roundResults?.playerResults.find(
    (entry) => entry.playerId === roundResults.activePlayerId,
  )

  const handleStartRating = useCallback(async () => {
    clearError()
    await hostStartRating()
  }, [clearError, hostStartRating])

  useDeadlineAutoSubmit({
    enabled: isPerforming && isHost && singTimerTotal > 0,
    endsAt,
    secondsRemaining,
    alreadyDone: false,
    onAutoSubmit: handleStartRating,
  })

  async function handleSubmitRating() {
    clearError()
    const rating = resolveRatingOrDefault(selectedRating)
    const ok = await submitRating({ rating })
    if (ok) {
      setSelectedRating(null)
    }
  }

  const autoSubmitRating = useCallback(async () => {
    if (!isRating || isActivePlayer || hasSubmitted) return
    clearError()
    const rating = resolveRatingOrDefault(selectedRatingRef.current)
    const ok = await submitRating({ rating })
    if (ok) {
      setSelectedRating(null)
    }
  }, [clearError, hasSubmitted, isActivePlayer, isRating, submitRating])

  useDeadlineAutoSubmit({
    enabled: isRating && !isActivePlayer,
    endsAt,
    secondsRemaining,
    alreadyDone: hasSubmitted,
    triggerAtOrBelow: 1,
    onAutoSubmit: autoSubmitRating,
  })

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
        <SketchCard tiltSeed="sing-play-loading">
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
          <SketchCard tiltSeed="sing-active-result">
            <p className="page-eyebrow">performer</p>
            <p className="turn-active-name">{activePlayer.name}</p>
          </SketchCard>
        ) : null}

        {roundResults.averageRating !== undefined ? (
          <SketchCard tiltSeed="sing-average">
            <h2 className="lobby-players__title">Audience score</h2>
            <p className="sing-average__value">{roundResults.averageRating.toFixed(1)} / 10</p>
            <p className="lobby-players__status">
              from {roundResults.ratingCount ?? 0} rating{(roundResults.ratingCount ?? 0) === 1 ? '' : 's'}
            </p>
          </SketchCard>
        ) : null}

        {activeResult ? (
          <SketchCard tiltSeed="sing-round-score">
            <SketchScore label="Round points" value={activeResult.totalRoundPoints} highlight />
          </SketchCard>
        ) : null}

        <SketchCard tiltSeed="sing-leaderboard">
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
          <SketchCard tiltSeed="sing-wait-results" className="lobby-wait-card">
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
          {showIntro ? 'Get ready…' : isRating ? 'Rate the performance' : 'Sing Along'}
        </h1>
      </header>

      {activePlayer && !isActivePlayer ? (
        <SketchCard tiltSeed="sing-active-banner" className="turn-active-banner">
          <p className="page-eyebrow">performer</p>
          <p className="turn-active-name">{activePlayer.name}</p>
        </SketchCard>
      ) : null}

      {isPerforming && singTimerTotal > 0 ? (
        <SketchTimer
          secondsRemaining={secondsRemaining}
          totalSeconds={singTimerTotal}
          label="Performance time"
        />
      ) : null}

      {round?.phase === 'rating' ? (
        <SketchTimer
          secondsRemaining={secondsRemaining}
          totalSeconds={RATING_SECONDS}
          label="Rating time"
        />
      ) : null}

      {showIntro ? (
        <SketchCard tiltSeed="sing-intro" className="lobby-wait-card">
          {isActivePlayer ? (
            <p>Your performance is starting — get ready!</p>
          ) : (
            <p>{activePlayer?.name ?? 'Someone'} is up next…</p>
          )}
        </SketchCard>
      ) : null}

      {isPerforming && isActivePlayer ? (
        <SketchCard tiltSeed="sing-prompt" className="sing-prompt">
          <p className="page-eyebrow">your turn</p>
          <p className="sing-prompt__cta">
            Open the song in Spotify and sing — don&apos;t peek at the title until voting is over!
          </p>
          {round?.performerSpotifyUrl ? (
            <SketchButton
              type="button"
              fullWidth
              onClick={() => window.open(round.performerSpotifyUrl, '_blank', 'noopener,noreferrer')}
            >
              Open in Spotify ↗
            </SketchButton>
          ) : (
            <p className="clip-player__hint">No Spotify link for this track.</p>
          )}
        </SketchCard>
      ) : null}

      {isPerforming && !isActivePlayer ? (
        <SketchCard tiltSeed="sing-wait-perform" className="lobby-wait-card">
          <p>{activePlayer?.name ?? 'Performer'} is singing…</p>
        </SketchCard>
      ) : null}

      {isPerforming && isHost ? (
        <>
          {error ? <p className="form-error">{error}</p> : null}
          <SketchButton fullWidth disabled={busy} onClick={() => void handleStartRating()}>
            {busy ? '…' : 'Start voting'}
          </SketchButton>
        </>
      ) : null}

      {isRating && isActivePlayer ? (
        <SketchCard tiltSeed="sing-wait-rating" className="lobby-wait-card">
          <p>Waiting for ratings…</p>
        </SketchCard>
      ) : null}

      {isRating && !isActivePlayer && round?.challengeTrack ? (
        <SketchCard tiltSeed="sing-rating-reveal">
          <p className="page-eyebrow">the song</p>
          <SketchSongCard track={round.challengeTrack} compact />
        </SketchCard>
      ) : null}

      {isRating && !isActivePlayer && !hasSubmitted ? (
        <SketchCard tiltSeed="sing-rating">
          <p className="page-subtitle">How was that performance?</p>
          <div className="rating-grid">
            {RATING_OPTIONS.map((value) => (
              <SketchButton
                key={value}
                type="button"
                variant={selectedRating === value ? 'primary' : 'ghost'}
                onClick={() => setSelectedRating(value)}
              >
                {value}
              </SketchButton>
            ))}
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <SketchButton fullWidth disabled={busy} onClick={handleSubmitRating}>
            Submit rating
          </SketchButton>
        </SketchCard>
      ) : null}

      {isRating && !isActivePlayer && hasSubmitted ? (
        <SketchCard tiltSeed="sing-rated" className="lobby-wait-card">
          <p>Rating submitted — waiting for others…</p>
          <p className="lobby-players__status">
            {round?.submittedPlayerIds?.length ?? 0} / {raterCount} rated
          </p>
        </SketchCard>
      ) : null}
    </main>
  )
}
