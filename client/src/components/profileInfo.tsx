import type { authProps } from "../interfaces/types"
import GroupCards from "../components/groupCard"
import { useState } from "react";
import Popup from "../snippets/popupLayout";
import instructions from "../_resources/instructions.json";
const ProfileInfo: React.FC<authProps> = ({ user }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="order-groups">
            {user &&
                <div className="profile-info">
                    <div className="profile-header">
                        <h2 className="">{user.userName}'s Playlists</h2>
                        <p> Don't see your playlists?  <span className="btn-link btn-link-primary" >Refresh</span>
                        </p>
                        <button className="btn btn-info" onClick={() => setOpen(true)}>Instructions</button>
                        <Popup isOpen={open} onClose={() => setOpen(false)}>

                            <h2>Instructions</h2>
                            {instructions[0].steps.map((item, index) => (
                                <div key={index}>
                                    <h3>{item.title}</h3>
                                    <span className='instruction-img'><img src={`${item.imgPath}`} /></span>
                                </div>
                            ))}
                            <button className="btn btn-danger" onClick={() => setOpen(false)}>Close</button>

                        </Popup>
                    </div>
                    <div className="card-body">
                        <GroupCards user={user} />
                    </div>
                </div>
            }

        </div>
    )
}
export default ProfileInfo