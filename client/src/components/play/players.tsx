import React from 'react';

interface Player {
    id: number;
    user: string;
    active: boolean;
}

interface PlayersProps {
    players: Player[];
}

const Players: React.FC<PlayersProps> = ({ players }) => {
    return (
        <div>
            <h2>Players</h2>
            <ul>
                {players.map(player => (
                    <li key={player.id}>
                        {player.user} 
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Players;