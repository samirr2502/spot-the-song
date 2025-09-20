//Playlist cards 
import playlists from '../_resources/playlists.json'
import type { authProps } from '../interfaces/types'

const GroupCards: React.FC<authProps>=({user}) =>{

    const userPlayLists = playlists.filter((item)=>(item.userName === user.userName))
    return(
        <div className="groupCards">
            {userPlayLists.map((item, index)=>(
                <div className='card card-button' key ={index}>
                    <h2 className='card-tite'>{item.playListName}</h2>
                    {item.songs.map((song, index)=>(
                        <li key ={index}>{song.name}, {song.artist}, {song.year}</li>
                    ))}
                </div>
            ))}
        </div>
    )
}

export default GroupCards