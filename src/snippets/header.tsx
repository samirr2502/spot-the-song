import { NavLink } from "react-router-dom"
import type { authProps } from "../interfaces/types"


const Header: React.FC<authProps> = ({ user, auth }) => {
    return (
        <header>
            <span className="logo">
                SPOT
            </span>
            <NavLink to='/'>
                Home
            </NavLink>

            <NavLink to='/play'>
                Play
            </NavLink>
            {auth &&user &&
                <>
                    <NavLink to='/order'>
                        Order
                    </NavLink>
                </>
            }

            <NavLink to='/about'>
                About
            </NavLink>
        </header>
    )
}

export default Header