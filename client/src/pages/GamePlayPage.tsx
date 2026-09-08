import { useRoom } from '../context/RoomContext'
import { AllInPlayPage } from './AllInPlayPage'
import { SingAlongPlayPage } from './SingAlongPlayPage'
import { TurnGuessPlayPage } from './TurnGuessPlayPage'

export function GamePlayPage() {
  const { room } = useRoom()

  if (room?.settings.playMode === 'turns' && room.settings.turnGame === 'guess') {
    return <TurnGuessPlayPage />
  }

  if (room?.settings.playMode === 'turns' && room.settings.turnGame === 'sing') {
    return <SingAlongPlayPage />
  }

  return <AllInPlayPage />
}
