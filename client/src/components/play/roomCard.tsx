import type { sessions } from "../../interfaces/types"
    import { useNavigate } from 'react-router-dom';

const RoomCard: React.FC<sessions>=({groupNumber})=>{
    const navigate = useNavigate();
    const useNavigateToRoom = () => {
        navigate(`/room/${groupNumber}`);
    };

    return(
        <div className="card card-room"onClick={()=>(useNavigateToRoom())} >
            <span>#{groupNumber}</span>
            
        </div>
    )
}
 export default RoomCard