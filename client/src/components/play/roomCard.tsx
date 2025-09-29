import type { sessions } from "../../interfaces/types"
import { useNavigate } from 'react-router-dom';
import { TbDoorEnter } from "react-icons/tb";
import { useState } from "react";
import { useTestDataService } from "../../TestDataContext"
interface RoomCardProps {
    groupNumber: number;
}
function RoomCard(props: RoomCardProps) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const testDataService = useTestDataService();
    const room = testDataService.findRoomById(props.groupNumber);
    const game = testDataService.findGameByRoomId(room!.room_id) || {game_id:0,playlist_id:0,status:'open'};
    const playlist =testDataService.findPlaylistById(game.playlist_id);
    const handleDeleteGroup = () => {
        // Logic to delete the group
        console.log(`Deleting group #${room?.room_id}`);
    }
    const useNavigateToRoom = () => {
        navigate(`/room/${room?.room_id}`);
    };

    return (
        <div className="card card-room" >
            <span className='card-room-icon'>R{room?.room_id}</span>
            <div className={'card-room-main'}>

                <span className="card-room-info">Playlist: {playlist?.playlist_id} - Status: {game?.status} </span>
                <div className={`side-menu ${menuOpen ? "open" : ""}`}>

                        <button onClick={() => setMenuOpen(!menuOpen)} className="btn btn-secondary">
                            {menuOpen ? ">" : "<"}
                        </button>

                    <button className="btn btn-primary" onClick={() => (useNavigateToRoom())}><TbDoorEnter /></button>

                    <button className="btn btn-danger" onClick={() => (handleDeleteGroup())}>-</button>
                    

                </div>
            </div>

        </div>
    )
}
export default RoomCard