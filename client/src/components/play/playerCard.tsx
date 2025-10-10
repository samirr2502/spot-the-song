

type PlayerCardProps = {
    player: any;
};

const PlayerCard = (props:PlayerCardProps) => {
    return (
        <div className="card player-card">
            <h3>{props.player!.name}</h3>
        </div>
    );
};

export default PlayerCard;