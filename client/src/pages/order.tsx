import GroupCards from "../components/groupCard"
import ProfileInfo from "../components/profileInfo"
import type { authProps } from "../interfaces/types"

const Order:React.FC<authProps>=( {user}) =>{
    return(
        <div className="order">
            <h1>Order your SPOT cards here!</h1>
            <ProfileInfo  user={user}/>
            <GroupCards user={user}/>
        </div>
    )
}
export default Order