//Playlist card
import type { playList } from '../interfaces/types'
import { RiPlayListFill } from "react-icons/ri";
import { BsQrCodeScan, BsSpotify, BsMusicNote } from "react-icons/bs";

import { useState } from 'react';

const PlaylistCard: React.FC<playList> = ({ name, totalSongs }) => {

    const TruncatedText: React.FC<{ text: string; limit?: number }> = ({ text, limit = 20 }) => {
        const truncated = text.length > limit ? text.slice(0, limit) + "..." : text;

        return <p>{truncated}</p>;
    };


    const [menuOpen, setMenuOpen] = useState(false);

    return (

        <div className='card card-playlist'>
            <span className='card-playlist-icon'> <RiPlayListFill /></span>
            <div className={'card-playlist-main'}>
                <p className='card-playlist-info'>
                    <TruncatedText text={name} limit={17} />
                    (<BsMusicNote />{totalSongs})
                </p>

                <div className={`side-menu ${menuOpen ? "open" : ""}`}>
                    <div className='car-playlist-buttons'>

                        <button onClick={() => setMenuOpen(!menuOpen)} className="btn">
                            {menuOpen ? ">" : "<"}
                        </button>
                    </div>
                    <button className="btn"><BsQrCodeScan /></button>
                    <button className="btn" ><BsSpotify /> </button>
                </div>
            </div>

        </div>
    )
}

export default PlaylistCard