import type { sessions } from "../../interfaces/types"
import { useNavigate } from 'react-router-dom';
import { TbDoorEnter } from "react-icons/tb";
import { useState } from "react";

const RoomCard: React.FC<sessions> = ({ groupNumber }) => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const handleDeleteGroup = () => {
        // Logic to delete the group
        console.log(`Deleting group #${groupNumber}`);
    }
    const useNavigateToRoom = () => {
        navigate(`/room/${groupNumber}`);
    };

    return (
        <div className="card card-room" >
            <span className='card-room-icon'>R{groupNumber}</span>
            <div className={'card-room-main'}>

                <span className="card-room-info"> Playlist Not Selected</span>
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