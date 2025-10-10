// import type { PlayersProps} from '../../interfaces/types';
import PlayerCard from './playerCard';

interface PlayersProps {
    players: any[];
}
const Players = (props:PlayersProps) => {
    return (
        <div>
            <h2>Players</h2>
            <div className="players-list">
                {props.players.map((player )=> (
                        <PlayerCard key={player.player_id} player={player} />
                ))}
                </div>
        </div>
    );
};

export default Players;