import type { authProps } from "../interfaces/types"
import GroupCards from "../components/groupCard"

const ProfileInfo: React.FC<authProps> = ({ user }) => {
    return (
        <div className="order-groups">
            {user &&
                <div className="profile-info">
                    <div className="profile-header">
                        <h2 className="">{user.userName}'s Playlists</h2>
                        <p> Don't see your playlists?</p>
                        <button className="btn btn-success">Refresh</button>
                    </div>
                    <div className="card-body">
                        <GroupCards user={user} />
                    </div>
                </div>
            }
            <div className="profile-info">
                    <div className="profile-header">
                        <h2 className="">Community Playlists</h2>
                        <p> Don't see any playlists?</p>
                        <button className="btn btn-success">Refresh</button>
                    </div>
                    <div className="card-body">
                        <span>Total playlists: </span><br />
                        <span>Total songs in Favorites: </span>
                        <GroupCards user={user} />
                    </div>
                </div>
        </div>
    )
}
export default ProfileInfo