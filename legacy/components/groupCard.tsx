//Playlist cards 
import { useState } from 'react';
import type { authProps } from '../interfaces/types'
import PlaylistCard from './playlistCard';

const GroupCards: React.FC<authProps> = ({ user }) => {

    const userPlayLists = user.playLists;
    const [makingRequest, setMakingRequest] = useState(false)
    return (
        <div className="group-cards">
            {userPlayLists.map((item, index) => (
               <PlaylistCard key ={index} name ={item.name} totalSongs={item.totalSongs} playlistLink={item.playlistLink}
                                makingRequest={makingRequest} setMakingRequest={setMakingRequest}/>
            ))}
        </div>
    )
}

export default GroupCards