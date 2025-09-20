
import type { authProps } from "../interfaces/types"
const ProfileInfo:React.FC<authProps>=({user})=>{
    return(
        <>
    {user &&
        <div className="card card-info">
             <h2 className="card-title">{user.userName}</h2>
            <div className="card-body">
                <span>Playlists#: {user.totalPlaylists}</span>
                <span>#Songs in Favorites{user.songsInFavotites}</span>
            </div>
            </div>}
            </>
    )
}
export default ProfileInfo