import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LobbyCollectionCard } from '../components/lobby/LobbyCollectionCard'
import { LobbyCollectionEditModal } from '../components/lobby/LobbyCollectionEditModal'
import { LobbyConfigBlock } from '../components/lobby/LobbyConfigBlock'
import { LobbyGameSettingsEditModal } from '../components/lobby/LobbyGameSettingsEditModal'
import { LobbyModeEditModal } from '../components/lobby/LobbyModeEditModal'
import { RoomSessionGate } from '../components/RoomSessionGate'
import { SketchAvatar, SketchButton, SketchCard, SketchDivider } from '../components/sketch'
import { useRoom } from '../context/RoomContext'
import { getCollectionLabel, getCollectionSubtitle, getGameModeLabel, getGameSettingsSummary } from '../lib/gameModeLabel'
import { buildJoinUrl } from '../lib/session'
import { roomPathForStatus } from '../hooks/useRoomNavigation'
import type { GameSettings } from '@spot-the-song/shared'

function LobbyContent() {
  const navigate = useNavigate()
  const { code = '' } = useParams()
  const {
    room,
    session,
    isHost,
    error,
    busy,
    startGame,
    leaveRoom,
    updateLobby,
    clearError,
  } = useRoom()

  const [modeModalOpen, setModeModalOpen] = useState(false)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)

  const normalizedCode = code.toUpperCase()
  const joinUrl = buildJoinUrl(normalizedCode)

  useEffect(() => {
    if (!room || room.code !== normalizedCode) return
    if (room.status !== 'lobby') {
      navigate(roomPathForStatus(room.code, room.status), { replace: true })
    }
  }, [room, normalizedCode, navigate])

  async function handleStart() {
    clearError()
    const ok = await startGame()
    if (ok) {
      navigate(`/room/${normalizedCode}/how-to-play`)
    }
  }

  async function handleLeave() {
    await leaveRoom()
    navigate('/home')
  }

  async function handleSaveMode(settings: GameSettings) {
    clearError()
    const ok = await updateLobby(settings)
    if (ok) {
      setModeModalOpen(false)
    }
  }

  async function handleSaveCollection(spotifyUrl: string) {
    clearError()
    const ok = await updateLobby(room!.settings, spotifyUrl)
    if (ok) {
      setCollectionModalOpen(false)
    }
  }

  async function handleSaveSettings(settings: GameSettings) {
    clearError()
    const ok = await updateLobby(settings)
    if (ok) {
      setSettingsModalOpen(false)
    }
  }

  if (!room || !session) return null

  const modeLabel = getGameModeLabel(room.settings)
  const collectionLabel = getCollectionLabel(room)
  const collectionSubtitle = getCollectionSubtitle(room.trackPoolSize)
  const settingsSummary = getGameSettingsSummary(room.settings)
  const anyModalOpen = modeModalOpen || collectionModalOpen || settingsModalOpen

  return (
    <main className="page page--lobby page--fade-in">
      <header className="page-header page-header--lobby">
        <h1 className="page-title page-title--sm">Lobby</h1>
      </header>

      <section className="lobby-config" aria-label="Game setup">
        <div className="lobby-config__row">
          <LobbyConfigBlock
            sectionLabel="Game"
            value={modeLabel}
            canEdit={isHost}
            onEdit={() => setModeModalOpen(true)}
          />
          <LobbyConfigBlock
            sectionLabel="Game settings"
            value={settingsSummary}
            canEdit={isHost}
            onEdit={() => setSettingsModalOpen(true)}
          />
        </div>
        <LobbyCollectionCard
          title={collectionLabel}
          subtitle={collectionSubtitle}
          tiltSeed={room.playlistName ?? room.code}
          canEdit={isHost}
          onEdit={() => setCollectionModalOpen(true)}
        />
      </section>

      <SketchCard className="lobby-code-card" tiltSeed={room.code}>
        <p className="lobby-code-card__label">Room code</p>
        <p className="lobby-code-card__code">{room.code}</p>
        <div className="lobby-code-card__qr" aria-label={`QR code to join room ${room.code}`}>
          <QRCodeSVG value={joinUrl} size={168} bgColor="transparent" fgColor="#2d2d2d" level="M" />
        </div>
        <p className="lobby-code-card__hint">Friends can scan or enter the code</p>
      </SketchCard>

      <section className="lobby-players" aria-label="Players in lobby">
        <h2 className="lobby-players__title">Players ({room.players.length})</h2>
        <ul className="lobby-players__list">
          {room.players.map((player) => (
            <li key={player.id} className="lobby-players__item">
              <SketchAvatar name={player.name} isHost={player.isHost} />
              <div className="lobby-players__meta">
                <span className="lobby-players__name">
                  {player.name}
                  {player.id === session?.playerId ? ' (you)' : ''}
                </span>
                <span className="lobby-players__status">
                  {player.isHost ? 'host · ' : ''}
                  {player.connected ? 'online' : 'reconnecting…'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error && !anyModalOpen ? <p className="form-error">{error}</p> : null}

      {isHost ? (
        <SketchButton fullWidth disabled={busy} onClick={handleStart}>
          {busy ? 'Starting…' : 'Start game'}
        </SketchButton>
      ) : (
        <SketchCard tiltSeed="wait" className="lobby-wait-card">
          <p>Waiting for the host to start…</p>
        </SketchCard>
      )}

      <SketchDivider />

      <SketchButton variant="ghost" fullWidth disabled={busy} onClick={handleLeave}>
        Leave lobby
      </SketchButton>

      <LobbyModeEditModal
        open={modeModalOpen}
        currentSettings={room.settings}
        busy={busy}
        error={modeModalOpen ? error : null}
        onClose={() => {
          setModeModalOpen(false)
          clearError()
        }}
        onSave={handleSaveMode}
      />

      <LobbyCollectionEditModal
        open={collectionModalOpen}
        settings={room.settings}
        busy={busy}
        error={collectionModalOpen ? error : null}
        onClose={() => {
          setCollectionModalOpen(false)
          clearError()
        }}
        onSave={handleSaveCollection}
      />

      <LobbyGameSettingsEditModal
        open={settingsModalOpen}
        settings={room.settings}
        busy={busy}
        error={settingsModalOpen ? error : null}
        onClose={() => {
          setSettingsModalOpen(false)
          clearError()
        }}
        onSave={handleSaveSettings}
      />
    </main>
  )
}

export function LobbyPage() {
  const { code = '' } = useParams()

  return (
    <RoomSessionGate roomCode={code} loadingMessage="Syncing lobby…">
      <LobbyContent />
    </RoomSessionGate>
  )
}
