
import test from "node:test";
import { useTestDataService } from "../../TestDataContext"
import SongPlayer from "./songPlayer";

interface CurrentPlayerProps {
    turn:any;
}

const CurrentPlayer=(props:CurrentPlayerProps)=>{
    const testDataService = useTestDataService();
    const player = testDataService.findPlayerById(props.turn?.current_player_id || 0);
    const game_stat = testDataService.findGameStatById(props.turn?.current_game_stats_id || 0);
    const game_songs = testDataService.findGameSongsByGameId(props.turn?.game_id || 0);
    const songs =  testDataService.findSongs()
        .filter(song => game_songs?.some((gs:any) => gs.song_id === song.song_id));
    const song_to_match = testDataService.findSongById(props.turn?.game_song_id || 0);

    const attempted_songs = [...songs, song_to_match]
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
                            (song &&
                            <li key={song?.song_id}>{song.title} by {song.artist} ({song.year})</li>
                            ) ||                            
                            <li key={0}>____ by ____ (####)</li>
                        
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