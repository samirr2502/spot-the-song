import type { sessions } from "../../interfaces/types"

const RoomCard: React.FC<sessions>=({groupNumber})=>{
   

    return(
        <div className="card card-room">
            <span>#{groupNumber}</span>
            
        </div>
    )
}
 export default RoomCard