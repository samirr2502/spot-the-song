import React from 'react';
import type { Player } from '../../interfaces/types';

type PlayerCardProps = {
    player: Player;
};

const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
    return (
        <div className="card player-card">
            <h3>{player.user}</h3>
        </div>
    );
};

export default PlayerCard;