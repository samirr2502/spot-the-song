import { useCallback, useEffect, useReducer, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { GameState } from '@spot-the-song/game-engine'
import {
  gameReducer,
  isTimerExpired,
  startGame,
} from '@spot-the-song/game-engine'
import GamePlayView from '../components/game/GamePlayView'
import { useSound } from '../context/SoundContext'
import { usePlacementDrag } from '../hooks/usePlacementDrag'
import { useRevealSequence } from '../hooks/useRevealSequence'

export default function LocalPlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialGame = (location.state as { game?: GameState } | null)?.game
  const { audioUnlocked, unlockAudio, play } = useSound()

  const [now, setNow] = useState(Date.now())
  const [selectedInsertIndex, setSelectedInsertIndex] = useState<number | null>(null)
  const [game, dispatch] = useReducer(
    gameReducer,
    initialGame,
    (lobbyGame) => (lobbyGame ? startGame(lobbyGame) : null as unknown as GameState),
  )

  const hasGuessed = game?.currentTurn?.guess !== undefined
  const { revealStage } = useRevealSequence(game, hasGuessed ?? false, play)

  const handlePlace = useCallback((insertIndex: number) => {
    setSelectedInsertIndex(insertIndex)
  }, [])

  const { isDragging, dragSource, pointer, hoverInsertIndex, hoverDropZone, startHeroDrag, startTimelineDrag } =
    usePlacementDrag(handlePlace)

  useEffect(() => {
    if (!initialGame) {
      navigate('/local/setup', { replace: true })
    }
  }, [initialGame, navigate])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!game || game.phase !== 'playing') return
    if (isTimerExpired(game, now)) {
      dispatch({ type: 'TIMEOUT' })
    }
  }, [game, now])

  useEffect(() => {
    setSelectedInsertIndex(null)
  }, [game?.phase, game?.currentTurn?.currentSongId])

  if (!game) return null

  function confirmPlacement() {
    if (selectedInsertIndex === null) return
    play('placeCard', { vibrate: true })
    dispatch({ type: 'SUBMIT_PLACEMENT', insertIndex: selectedInsertIndex })
  }

  function handleReplayAudio() {
    const audio = document.querySelector('audio')
    if (audio) {
      audio.currentTime = 0
      void audio.play()
    }
  }

  return (
    <GamePlayView
      game={game}
      mode="local"
      now={now}
      audioUnlocked={audioUnlocked}
      onAudioUnlock={unlockAudio}
      revealStage={revealStage}
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
        onGuess: (guess) => dispatch({ type: 'SUBMIT_GUESS', guess }),
        onConfirmPlacement: confirmPlacement,
        onChallenge: (playerId) => dispatch({ type: 'SUBMIT_CHALLENGE', challengerId: playerId }),
        onReveal: () => dispatch({ type: 'REVEAL_CLAIM' }),
        onAdvance: () => dispatch({ type: 'ADVANCE_TURN' }),
      }}
    />
  )
}
