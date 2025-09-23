import CurrentPlayer from "../components/play/currentPlayer"
import PlayerSongs from "../components/play/playerSongs"
import sessionsGroups from '../_resources/sessionGroups.json'
import Players from "../components/play/players"
import { useNavigate, useParams } from "react-router-dom"

const Room: React.FC<{}> = ( ) => {
    const navigate = useNavigate();
    const { groupNumber } = useParams<{ groupNumber: string }>();
    const currentSessionGroup = sessionsGroups.find(session => session.groupNumber.toString() === groupNumber);
    const exitRoom = () => {
        navigate('/play');
    };
    return (

        <div className="room-page">
            <div className="group-header card-title">
                <h2>Room #{groupNumber}</h2>
                <button className="btn btn-danger" onClick={() => exitRoom()}>Exit Room</button>
            </div>
            <div className="room-sections">
                <div className="section-players"><Players players={currentSessionGroup!.sessions} /></div>
                <div className="section-playerSongs"><PlayerSongs /></div>

                <div className="section-current-player"> <CurrentPlayer /></div>


            </div>
        </div>
    )
}
export default Room