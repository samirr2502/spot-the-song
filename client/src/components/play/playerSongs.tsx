
import playerSongs from '../../_resources/test_data/playData/playerSongs.json'
interface Props {
    // Define any props if needed
}
const PlayerSongs= (props:Props) => {
    
    return (
        <div className="player-songs">
            <h2>{} Songs</h2>
            {/* PlayerSongs component */}
        </div>
    );
};

export default PlayerSongs;