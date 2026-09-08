import { useRoom } from '../context/RoomContext'
import { AllInPlayPage } from './AllInPlayPage'
import { TurnGuessPlayPage } from './TurnGuessPlayPage'

export function GamePlayPage() {
  const { room } = useRoom()

  if (room?.settings.playMode === 'turns' && room.settings.turnGame === 'guess') {
    return <TurnGuessPlayPage />
  }

  return <AllInPlayPage />
}
