import RoomCard from "./roomCard"
import sessionGroups from '../../_resources/sessions.json'


const Rooms: React.FC<{}> = ()=>{
return(
    <div className="play-groups">
        <div className="group-header">
            Rooms Available
        </div>
        <div className="group-cards">
            {sessionGroups.map((item, index)=>(
                <RoomCard key= {index} groupNumber={item.groupNumber} />
            ))}
        </div>
    </div>
)
}
export default Rooms