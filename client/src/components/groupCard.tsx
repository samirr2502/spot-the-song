//Playlist cards 
import type { authProps } from '../interfaces/types'
import PlaylistCard from './playlistCard';

const GroupCards: React.FC<authProps> = ({ user }) => {

    const userPlayLists = user.playLists;
    return (
        <div className="groupCards">
            {userPlayLists.map((item) => (
               <PlaylistCard name ={item.name} totalSongs={item.totalSongs}/>
            ))}
        </div>
    )
}

export default GroupCards