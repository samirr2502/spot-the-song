import { useParams } from 'react-router-dom'
import { RoomSessionGate } from '../components/RoomSessionGate'
import { HostClipProvider } from '../context/HostClipContext'
import { SpotifyPlaybackProvider } from '../context/SpotifyPlaybackContext'
import { useRoom } from '../context/RoomContext'
import { AllInPlayPage } from './AllInPlayPage'
import { SingAlongPlayPage } from './SingAlongPlayPage'
import { TimelinePlayPage } from './TimelinePlayPage'
import { TurnGuessPlayPage } from './TurnGuessPlayPage'

function GamePlayRouter() {
  const { room } = useRoom()

  if (room?.settings.playMode === 'turns' && room.settings.turnGame === 'guess') {
    return <TurnGuessPlayPage />
  }

  if (room?.settings.playMode === 'turns' && room.settings.turnGame === 'sing') {
    return <SingAlongPlayPage />
  }

  if (room?.settings.playMode === 'turns' && room.settings.turnGame === 'timeline') {
    return <TimelinePlayPage />
  }

  return <AllInPlayPage />
}

function GamePlayShell() {
  const { room } = useRoom()
  const useFullPlayback = room?.settings.playbackMode === 'spotify-full'

  if (useFullPlayback) {
    return (
      <SpotifyPlaybackProvider>
        <GamePlayRouter />
      </SpotifyPlaybackProvider>
    )
  }

  return <GamePlayRouter />
}

export function GamePlayPage() {
  const { code = '' } = useParams()

  return (
    <RoomSessionGate roomCode={code} loadingMessage="Syncing game…">
      <HostClipProvider>
        <GamePlayShell />
      </HostClipProvider>
    </RoomSessionGate>
  )
}
