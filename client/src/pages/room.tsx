import CurrentPlayer from "../components/play/currentPlayer"
import PlayerSongs from "../components/play/playerSongs"
import Players from "../components/play/players"
import { TbDoorExit } from "react-icons/tb";

import { useNavigate, useParams } from "react-router-dom"
import { useTestDataService } from "../TestDataContext"

const Room: React.FC<{}> = ( ) => {
    const navigate = useNavigate();
    const { groupNumber } = useParams<{ groupNumber: string }>();
    // const currentSessionGroup = sessionsGroups.find(session => session.groupNumber.toString() === groupNumber);
    const testDataService = useTestDataService();
    const room = testDataService.findRoomById(Number(groupNumber));
    const game = testDataService.findGameByRoomId(room!.room_id) || {game_id:0,playlist_id:0,status:'open'};
    const sessions = testDataService.findSessionByRoomId(room!.room_id ||0);
    const game_stats = sessions?.map(session => testDataService.findGameStatById(session!.game_stats_id || 0));
    const players = game_stats?.map(game_stat => testDataService.findPlayerById(game_stat!.player_id ||0));
    const turn = testDataService.findTurnByGameId(game.game_id || 0);

    const exitRoom = () => {
        navigate('/play');
    };
    return (

        <div className="room-page">
            <div className="group-header card-title">
                <h2>Room #{room?.room_id}</h2>
                <button className="btn btn-danger" onClick={() => exitRoom()}>Exit Room <TbDoorExit /></button>
            </div>
            <div className="room-sections">
                <div className="section-players"><Players players={players} /></div>
                <div className="card section-playerSongs"><PlayerSongs /></div>

                <div className="card section-current-player"> <CurrentPlayer turn = {turn} /></div>


            </div>
        </div>
    )
}
export default Room