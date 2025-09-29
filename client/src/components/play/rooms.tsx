import RoomCard from "./roomCard"
import { useState } from "react"
import Popup from "../../snippets/popupLayout"
import instructions from "../../_resources/instructions.json"
import { useTestDataService } from "../../TestDataContext"
const Rooms: React.FC<{}> = ()=>{
    const [open, setOpen] = useState(false);
    const testDataService = useTestDataService();
    const rooms = testDataService.findRooms();
    const handleCreateRoom = () => {
        // Logic to create a new room
        console.log('Creating a new room');
    }
return(
    <div className="rooms-page">
        <div className="rooms-header">
           <h2> Rooms Available</h2>
           <div className="rooms-buttons">
            <button className="btn btn-primary" onClick={() => handleCreateRoom()}>Create Room</button>
            <button className="btn btn-secondary"onClick={() => setOpen(true)}>Instructions</button>
            <Popup isOpen={open} onClose={() => setOpen(false)}>

                            <h2>Instructions</h2>
                            {instructions[1].steps.map((item, index) => (
                                <div key={index}>
                                    <h3>{item.title}</h3>
                                    <span className='instruction-img'><img src={`${item.imgPath}`} /></span>
                                </div>
                            ))}
                            <button className="btn btn-danger" onClick={() => setOpen(false)}>Close</button>

            </Popup>
           </div>
        </div>
        <div className="group-cards">
            
            {rooms.map((item, index)=>(
                <RoomCard key= {index} groupNumber={item.room_id} />
            ))}
        </div>
    </div>
)
}
export default Rooms