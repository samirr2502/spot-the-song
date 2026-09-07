import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { GameState } from '@spot-the-song/game-engine'
import { isTimerExpired } from '@spot-the-song/game-engine'
import GamePlayView from '../components/game/GamePlayView'
import { useSound } from '../context/SoundContext'
import { usePlacementDrag } from '../hooks/usePlacementDrag'
import { useRevealSequence } from '../hooks/useRevealSequence'
import {
  advanceOnlineTurn,
  fetchRoomState,
  collectRevealedSongIds,
  mapRoomStateToGame,
  mapSongsToLookup,
  revealOnlineClaim,
  submitOnlineChallenge,
  submitOnlineGuess,
  submitOnlinePlacement,
  subscribeToRoom,
} from '../lib/onlineGame'
import { getPlayerSessionId } from '../lib/supabase'

export default function OnlinePlay() {
  const { roomId = '' } = useParams()
  const playerId = getPlayerSessionId()
  const [now, setNow] = useState(Date.now())
  const [gameView, setGameView] = useState<GameState | null>(null)
  const [songLookup, setSongLookup] = useState<ReturnType<typeof mapSongsToLookup>>({})
  const [turnId, setTurnId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInsertIndex, setSelectedInsertIndex] = useState<number | null>(null)
  const timeoutSubmittedRef = useRef(false)

  const { audioUnlocked, unlockAudio, play } = useSound()
  const hasGuessed = gameView?.currentTurn?.guess !== undefined
  const { revealStage } = useRevealSequence(gameView, hasGuessed ?? false, play)

  const loadState = useCallback(async () => {
    if (!roomId) return
    try {
      const state = await fetchRoomState(roomId)
      const revealedIds = collectRevealedSongIds(
        state.timelineCards,
        state.room.phase,
        state.currentTurn,
      )
      const lookup = mapSongsToLookup(state.songs, state.albums, revealedIds)

      setGameView(mapRoomStateToGame(state))
      setSongLookup(lookup)
      setTurnId(state.currentTurn?.id ?? null)
      setIsHost(state.room.host_player_id === playerId)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game')
    }
  }, [playerId, roomId])

  const { isDragging, dragSource, pointer, hoverInsertIndex, hoverDropZone, startHeroDrag, startTimelineDrag } =
    usePlacementDrag(setSelectedInsertIndex)

  useEffect(() => {
    void loadState()

    let reloadTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleReload = () => {
      window.clearTimeout(reloadTimer)
      reloadTimer = window.setTimeout(() => {
        void loadState()
      }, 300)
    }

    const unsubscribe = subscribeToRoom(roomId, scheduleReload)
    return () => {
      window.clearTimeout(reloadTimer)
      unsubscribe()
    }
  }, [loadState, roomId])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    timeoutSubmittedRef.current = false
    setSelectedInsertIndex(null)
  }, [turnId, gameView?.phase])

  const currentSong = useMemo(() => {
    if (!gameView?.currentTurn) return undefined
    return songLookup[gameView.currentTurn.currentSongId]
  }, [gameView, songLookup])

  const handleGuess = useCallback(
    async (guess: string) => {
      if (!gameView?.currentTurn || !roomId || !turnId) return

      try {
        await submitOnlineGuess(
          roomId,
          turnId,
          gameView.currentTurn.activePlayerId,
          guess,
        )
        await loadState()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit guess')
      }
    },
    [gameView, loadState, roomId, turnId],
  )

  useEffect(() => {
    if (!gameView || gameView.phase !== 'playing') return
    if (gameView.currentTurn?.activePlayerId !== playerId) return
    if (!isTimerExpired(gameView, now)) return
    if (timeoutSubmittedRef.current) return

    timeoutSubmittedRef.current = true
    const board = gameView.boards[playerId]
    if (!roomId || !turnId || !board) return

    void submitOnlinePlacement(
      roomId,
      turnId,
      playerId,
      selectedInsertIndex ?? board.cards.length,
    )
      .then(() => loadState())
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to auto-place card')
      })
  }, [gameView, loadState, now, playerId, roomId, selectedInsertIndex, turnId])

  async function handlePlacement() {
    if (!roomId || !turnId || !gameView?.currentTurn || selectedInsertIndex === null) return
    try {
      play('placeCard', { vibrate: true })
      await submitOnlinePlacement(
        roomId,
        turnId,
        gameView.currentTurn.activePlayerId,
        selectedInsertIndex,
      )
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place card')
    }
  }

  async function handleChallenge(challengerId: string) {
    if (!roomId || !turnId) return
    try {
      await submitOnlineChallenge(roomId, turnId, challengerId)
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to challenge')
    }
  }

  async function handleRevealClaim() {
    if (!roomId || !turnId) return
    try {
      await revealOnlineClaim(roomId, turnId)
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal claim')
    }
  }

  async function handleAdvance() {
    if (!roomId) return
    try {
      await advanceOnlineTurn(roomId, playerId)
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance turn')
    }
  }

  function handleReplayAudio() {
    const audio = document.querySelector('audio')
    if (audio) {
      audio.currentTime = 0
      void audio.play()
    }
  }

  if (!gameView) {
    return <p className="muted centered">Loading game…</p>
  }

  const isMyTurn = gameView.currentTurn?.activePlayerId === playerId

  return (
    <GamePlayView
      game={gameView}
      mode="online"
      now={now}
      audioUnlocked={audioUnlocked}
      onAudioUnlock={unlockAudio}
      revealStage={revealStage}
      error={error}
      isMyTurn={isMyTurn}
      isHost={isHost}
      localPlayerId={playerId}
      currentSong={currentSong}
      selectedInsertIndex={selectedInsertIndex}
      onSelectInsertIndex={setSelectedInsertIndex}
      isDragging={isDragging}
      dragSource={dragSource}
      pointer={pointer}
      hoverInsertIndex={hoverInsertIndex}
      hoverDropZone={hoverDropZone}
      startHeroDrag={startHeroDrag}
      startTimelineDrag={startTimelineDrag}
      onReplayAudio={handleReplayAudio}
      actions={{
        onGuess: handleGuess,
        onConfirmPlacement: handlePlacement,
        onChallenge: handleChallenge,
        onReveal: handleRevealClaim,
        onAdvance: handleAdvance,
      }}
    />
  )
}
