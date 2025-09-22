import type { sessions } from "../interfaces/types"
import CurrentPlayer from "../components/play/currentPlayer"


const Room: React.FC<sessions> = ({groupNumber}) => {
    return (
        <div>
            <div className="group-header">Room #{groupNumber}</div>
            <div className="room-sections">
                <div className="section-current-player"> <CurrentPlayer/></div>

                <div className="section-playerSongs"></div>
                <div className="section-players"></div>

            </div>
        </div>
    )
}
export default Room