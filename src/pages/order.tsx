import { NavLink } from "react-router-dom"

import ProfileInfo from "../components/profileInfo"
import type { authProps } from "../interfaces/types"

const Order: React.FC<authProps> = ({ auth, user }) => {
    return (
        <div className="order">
            {auth &&
                <> <h1>Order your SPOT cards here!</h1>
                    <ProfileInfo user={user} />

                </>}
            {!auth &&
                <NavLink to="/"><button className="btn btn-primary">Home</button></NavLink>}
        </div>
    )
}
export default Order