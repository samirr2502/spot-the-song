import React from 'react';
import type { PlayersProps} from '../../interfaces/types';
import PlayerCard from './playerCard';


const Players: React.FC<PlayersProps> = ({ players }) => {
    return (
        <div>
            <h2>Players</h2>
            <div className="players-list">
                {players.map(player => (
                        <PlayerCard key={player.id} player={player} />
                ))}
                </div>
        </div>
    );
};

export default Players;