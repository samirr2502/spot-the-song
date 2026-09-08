import { useParams } from 'react-router-dom'
import { RoomSessionGate } from '../components/RoomSessionGate'
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

export function GamePlayPage() {
  const { code = '' } = useParams()

  return (
    <RoomSessionGate roomCode={code} loadingMessage="Syncing game…">
      <SpotifyPlaybackProvider>
        <GamePlayRouter />
      </SpotifyPlaybackProvider>
    </RoomSessionGate>
  )
}
