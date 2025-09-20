import { NavLink } from "react-router-dom";

function Home(){
    return (
        <div className="home">
        <h1>Spot the Song</h1>

        <NavLink to="/pay">Play</NavLink>
        <NavLink to="/order">Order</NavLink>

        </div>
    )
}

export default Home