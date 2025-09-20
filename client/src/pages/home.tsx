import { NavLink } from "react-router-dom";
import Instructions from "../snippets/instructions";
import type { authProps } from '../interfaces/types'


const Home: React.FC<authProps> = ({ user, setCurrentUser, auth, setAuth }) => {
    const handleLogin = (setAuth: any, user: any, setUser: any) => {
        setAuth(true);
        setUser(user[0])
    }
    const handleLogout = (setAuth: any, setUser: any) => {
        setAuth(false);
        setUser({})
    }

    return (
        <div className="home">
            <h1>Spot the Song</h1>
            <div className="actions">
                {!auth && <button className="btn btn-secondary" onClick={()=>handleLogin(setAuth, user, setCurrentUser)}>Get Access</button>}

                {auth && <>
                    <NavLink to="/play"><button className="btn btn-primary">Play </button></NavLink>

                    <NavLink to="/order"><button className="btn btn-secondary">Order</button></NavLink>

                    <button className="btn btn-danger" onClick={() => handleLogout(setAuth, setCurrentUser)}>Logout</button>
                </>}

            </div>
            <Instructions />

        </div>
    )
}

export default Home