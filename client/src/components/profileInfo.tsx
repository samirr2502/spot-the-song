import type { authProps } from "../interfaces/types"
import GroupCards from "../components/groupCard"

const ProfileInfo:React.FC<authProps>=({user})=>{
    return(
        <>
    {user &&
        <div className="">
             <h2 className="card-title">{user.userName}</h2>
            <div className="card-body">
                <span>Playlists#: {user.totalPlaylists}</span>
                <span>#Songs in Favorites{user.songsInFavotites}</span>
                <GroupCards user={user}/>
            </div>
            </div>}
            </>
    )
}
export default ProfileInfo