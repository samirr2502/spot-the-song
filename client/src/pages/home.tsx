import { NavLink } from "react-router-dom";
import Instructions from "../snippets/instructions";

function Home(){
    return (
        <div className="home">
        <h1>Spot the Song</h1>
        <div className="actions">
        <NavLink to="/play"><button className="btn btn-primary">Play </button></NavLink>
        <NavLink to="/order"><button className="btn btn-secondary">Order</button></NavLink>
        </div>
        
        <Instructions/>
        
        </div>
    )
}

export default Home