import { NavLink } from "react-router-dom"
import type { authProps } from "../interfaces/types"


const Header: React.FC<authProps> = ({ auth }) => {
    return (
        <header>
            <span className="logo">
                SPOT
            </span>
            <NavLink to='/'>
                Home
            </NavLink>
            {auth &&
                <>
                    <NavLink to='/play'>
                        Play
                    </NavLink>
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