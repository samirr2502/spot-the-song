
import { useTestDataService } from "../../TestDataContext"
import SongPlayer from "./songPlayer";

interface CurrentPlayerProps {
    turn:any;
}

const CurrentPlayer=(props:CurrentPlayerProps)=>{
    const testDataService = useTestDataService();
    const player = testDataService.findPlayerById(props.turn?.current_player_id || 0);
    const game_stat = testDataService.findGameStatByGameIdPersonId(props.turn?.game_id ||0,props.turn?.current_player_id||0);

    // const game_songs = testDataService.findGameSongsByGameId(props.turn?.game_id || 0);
    const songs =  testDataService.findSongs()
        .filter(song => game_stat?.songs_ids.includes(song.song_id));
    console.log(songs)

    const game_song = testDataService.findGameSongById(props.turn?.game_song_id || 0);
    const song_to_match = testDataService.findSongById(game_song?.song_id || 0);
    const attempted_songs = [...songs, {song_id:song_to_match?.song_id,title:'____',artist:'____',year:0}].sort((a,b) =>  { return a.year > b.year ? -1 : 1}
);
    return(

        <div>
            <h2>Current Player</h2>
            <h3>{player!.name}</h3>
            <SongPlayer songId={song_to_match?.song_id} />
            {songs && songs.length > 0 ? (
                <div>
                    <h4>Songs to guess:</h4>
                    <ul>
                        {attempted_songs.map((song) => (
                            <li key={song?.song_id}>{song.title} by {song.artist} ({song.year})</li>
                                                    
                        
                        )) }
                    </ul>
                </div>
            ) : (
                <p>No songs available.</p>
            )}
        </div>
    )
}

export default CurrentPlayer