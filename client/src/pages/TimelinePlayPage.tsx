import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { describeInsertPosition } from '@spot-the-song/shared'
import { ClipPlayer } from '../components/ClipPlayer'
import { TimelineBoard } from '../components/TimelineBoard'
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

const FIELD_LABELS: Record<'title' | 'artist', string> = {
  title: 'Title',
  artist: 'Artist',
}

export function TimelinePlayPage() {
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const {
    room,
    session,
    isHost,
    roundResults,
    busy,
    error,
    placeCard,
    submitTimelineBonus,
    continueAfterResults,
    clearError,
  } = useRoom()

  useRoomStatusRedirect(code, ['playing', 'round-results'])

  const normalizedCode = code.toUpperCase()
  const inRoom = room?.code === normalizedCode && session?.roomCode === normalizedCode
  const round = room?.currentRound
  const endsAt = round?.endsAt
  const secondsRemaining = useCountdown(endsAt)
  const listenTimerTotal = room?.settings.clipDurationSeconds ?? 15
  const placementTimerTotal = room?.settings.guessTimerSeconds ?? 30

  const activePlayer = useMemo(() => {
    if (!room || !round?.activePlayerId) return null
    return room.players.find((player) => player.id === round.activePlayerId) ?? null
  }, [room, round?.activePlayerId])

  const isActivePlayer = !!session && session.playerId === round?.activePlayerId
  const isListening = room?.status === 'playing' && round?.phase === 'playing'
  const isPlacing = room?.status === 'playing' && round?.phase === 'answering'
  const isRoundResults = room?.status === 'round-results'
  const showIntro = room?.status === 'playing' && round?.phase === 'round-intro'

  const activeTimeline = useMemo(() => {
    if (!room || !round?.activePlayerId) return []
    return room.timelines?.[round.activePlayerId] ?? []
  }, [room, round?.activePlayerId])

  const myTimeline = useMemo(() => {
    if (!room || !session) return []
    return room.timelines?.[session.playerId] ?? []
  }, [room, session])

  const bonusFieldsEnabled = useMemo(() => {
    if (!room) return { title: false, artist: false }
    return {
      title: room.settings.guessFields.title,
      artist: room.settings.guessFields.artist,
    }
  }, [room])

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [placementLocked, setPlacementLocked] = useState(false)
  const [bonusAnswers, setBonusAnswers] = useState<{ title?: string; artist?: string }>({})
  const [bonusSubmitted, setBonusSubmitted] = useState(false)

  useEffect(() => {
    if (round?.phase === 'round-intro' || round?.phase === 'playing') {
      setSelectedIndex(null)
      setPlacementLocked(false)
      setBonusAnswers({})
      setBonusSubmitted(false)
    }
  }, [round?.index, round?.phase])

  const activeResult = roundResults?.playerResults.find(
    (entry) => entry.playerId === roundResults.activePlayerId,
  )

  const viewingTimeline = activeTimeline
  const viewingTitle = isActivePlayer
    ? 'Your timeline'
    : `${activePlayer?.name ?? 'Player'}'s timeline`

  async function handlePlaceCard() {
    clearError()
    if (selectedIndex === null) return

    const ok = await placeCard({ insertIndex: selectedIndex })
    if (ok) {
      setPlacementLocked(true)

      if (!bonusFieldsEnabled.title && !bonusFieldsEnabled.artist) {
        setSelectedIndex(null)
      }
    }
  }

  async function handleSubmitBonus() {
    clearError()
    const ok = await submitTimelineBonus(bonusAnswers)
    if (ok) {
      setBonusSubmitted(true)
      setBonusAnswers({})
    }
  }

  async function handleContinue() {
    clearError()
    if (!room || !roundResults) return

    const isLastRound = roundResults.roundIndex >= room.settings.roundCount
    const ok = await continueAfterResults()
    if (!ok) return

    setSelectedIndex(null)
    setPlacementLocked(false)
    setBonusSubmitted(false)
    navigate(isLastRound ? `/room/${normalizedCode}/results` : `/room/${normalizedCode}/play`)
  }

  if (!inRoom || !room) {
    return (
      <main className="page">
        <SketchCard tiltSeed="timeline-play-loading">
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

        <SketchSongCard track={roundResults.track} />

        {activePlayer ? (
          <SketchCard tiltSeed="timeline-active-result">
            <p className="page-eyebrow">active player</p>
            <p className="turn-active-name">{activePlayer.name}</p>
            <p className="lobby-players__status">
              {roundResults.placementCorrect
                ? `Correct — placed ${describeInsertPosition(
                    roundResults.insertIndex ?? 0,
                    Math.max(0, (room.timelines?.[roundResults.activePlayerId ?? '']?.length ?? 1) - 1),
                  )}`
                : 'Incorrect placement — card discarded'}
            </p>
          </SketchCard>
        ) : null}

        {activeResult ? (
          <SketchCard tiltSeed="timeline-round-score">
            <h2 className="lobby-players__title">Round points</h2>
            {activeResult.fieldScores.map((entry) => (
              <SketchScore
                key={entry.field}
                label={
                  entry.field === 'year'
                    ? 'Placement'
                    : FIELD_LABELS[entry.field as 'title' | 'artist'] ?? entry.field
                }
                value={entry.points}
                highlight={entry.correct}
              />
            ))}
            {activeResult.fieldScores.length === 0 ? (
              <p className="lobby-players__status">No points this round.</p>
            ) : null}
            <p className="round-total">Round total: +{activeResult.totalRoundPoints}</p>
          </SketchCard>
        ) : null}

        <TimelineBoard
          cards={room.timelines?.[roundResults.activePlayerId ?? ''] ?? activeTimeline}
          title={`${activePlayer?.name ?? 'Player'}'s timeline`}
        />

        <SketchCard tiltSeed="timeline-leaderboard">
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
          <SketchCard tiltSeed="timeline-wait-results" className="lobby-wait-card">
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
          {showIntro ? 'Get ready…' : isPlacing ? 'Place the card' : 'Timeline'}
        </h1>
      </header>

      {activePlayer ? (
        <SketchCard tiltSeed="timeline-active-banner" className="turn-active-banner">
          <p className="page-eyebrow">active player</p>
          <p className="turn-active-name">{activePlayer.name}</p>
        </SketchCard>
      ) : null}

      <ClipPlayer
        previewUrl={round?.roundTrack?.previewUrl}
        clipDurationSeconds={room.settings.clipDurationSeconds}
        playing={
          room.status === 'playing' &&
          (round?.phase === 'round-intro' || round?.phase === 'playing' || round?.phase === 'answering')
        }
      />

      {round?.phase === 'playing' ? (
        <SketchTimer
          secondsRemaining={secondsRemaining}
          totalSeconds={listenTimerTotal}
          label="Listen"
        />
      ) : null}

      {round?.phase === 'answering' ? (
        <SketchTimer
          secondsRemaining={secondsRemaining}
          totalSeconds={placementTimerTotal}
          label="Placement time"
        />
      ) : null}

      {showIntro ? (
        <SketchCard tiltSeed="timeline-intro" className="lobby-wait-card">
          {isActivePlayer ? (
            <p>Listen to the clip — you'll place it on your timeline next.</p>
          ) : (
            <p>{activePlayer?.name ?? 'Someone'} is up next…</p>
          )}
        </SketchCard>
      ) : null}

      {isListening && isActivePlayer ? (
        <SketchCard tiltSeed="timeline-listen" className="lobby-wait-card">
          <p>Listen closely — year hidden!</p>
        </SketchCard>
      ) : null}

      {isListening && !isActivePlayer ? (
        <SketchCard tiltSeed="timeline-watch-listen" className="lobby-wait-card">
          <p>{activePlayer?.name ?? 'Active player'} is listening…</p>
        </SketchCard>
      ) : null}

      {(isPlacing || isListening) && (isActivePlayer || !isActivePlayer) ? (
        <TimelineBoard
          cards={viewingTimeline}
          title={viewingTitle}
          interactive={isPlacing && isActivePlayer && !placementLocked}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          pendingCard={isPlacing && isActivePlayer && !placementLocked ? { hiddenYear: true } : null}
        />
      ) : null}

      {isPlacing && isActivePlayer && !placementLocked ? (
        <SketchButton fullWidth disabled={busy || selectedIndex === null} onClick={handlePlaceCard}>
          Place card
        </SketchButton>
      ) : null}

      {isPlacing && isActivePlayer && placementLocked && (bonusFieldsEnabled.title || bonusFieldsEnabled.artist) && !bonusSubmitted ? (
        <SketchCard tiltSeed="timeline-bonus">
          <h2 className="lobby-players__title">Bonus guesses</h2>
          {bonusFieldsEnabled.title ? (
            <SketchInput
              label={FIELD_LABELS.title}
              name="bonusTitle"
              value={bonusAnswers.title ?? ''}
              onChange={(event) =>
                setBonusAnswers((current) => ({ ...current, title: event.target.value }))
              }
              autoComplete="off"
            />
          ) : null}
          {bonusFieldsEnabled.artist ? (
            <SketchInput
              label={FIELD_LABELS.artist}
              name="bonusArtist"
              value={bonusAnswers.artist ?? ''}
              onChange={(event) =>
                setBonusAnswers((current) => ({ ...current, artist: event.target.value }))
              }
              autoComplete="off"
            />
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <SketchButton fullWidth disabled={busy} onClick={handleSubmitBonus}>
            Submit bonus guesses
          </SketchButton>
        </SketchCard>
      ) : null}

      {isPlacing && isActivePlayer && placementLocked && bonusSubmitted ? (
        <SketchCard tiltSeed="timeline-wait-reveal" className="lobby-wait-card">
          <p>Waiting for reveal…</p>
        </SketchCard>
      ) : null}

      {isPlacing && isActivePlayer && placementLocked && !bonusFieldsEnabled.title && !bonusFieldsEnabled.artist ? (
        <SketchCard tiltSeed="timeline-wait-reveal" className="lobby-wait-card">
          <p>Placement locked — waiting for reveal…</p>
        </SketchCard>
      ) : null}

      {isPlacing && !isActivePlayer ? (
        <SketchCard tiltSeed="timeline-watch-place" className="lobby-wait-card">
          <p>{activePlayer?.name ?? 'Active player'} is placing the card…</p>
        </SketchCard>
      ) : null}

      {!isActivePlayer && myTimeline.length > 0 && session ? (
        <TimelineBoard cards={myTimeline} title="Your timeline" />
      ) : null}
    </main>
  )
}
