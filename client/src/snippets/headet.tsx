import { NavLink } from "react-router-dom"
function Header() {
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
            <NavLink to='/order'>
                Order
            </NavLink>
            <NavLink to='/about'>
                About
            </NavLink>
        </header>
    )
}

export default Header