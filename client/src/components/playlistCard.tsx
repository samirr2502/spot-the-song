//Playlist card
import type { playList } from '../interfaces/types'
import { RiPlayListFill } from "react-icons/ri";
import { BsQrCodeScan, BsSpotify, BsMusicNote, BsDownload } from "react-icons/bs";

import generateQRCode from '../_actions/genertateQRCode';
import { useState } from 'react';

const PlaylistCard: React.FC<playList> = ({ name, totalSongs, makingRequest, setMakingRequest }) => {

    const TruncatedText: React.FC<{ text: string; limit?: number }> = ({ text, limit = 20 }) => {
        const truncated = text.length > limit ? text.slice(0, limit) + "..." : text;

        return <p>{truncated}</p>;
    };


    const [menuOpen, setMenuOpen] = useState(false);
    const [completedQRCodeGen, setCompletedQRCodeGen] = useState(false)
    const [loading, setLoading] = useState(false)
    const handleGenerateQRCode = async () => {
        setLoading(true)
        setMakingRequest(true)
        await generateQRCode(2000);
        setLoading(false)
        setMakingRequest(false)

        setCompletedQRCodeGen(true)
    }
    const handleDownload = async () => {
        setLoading(true)
        setMakingRequest(true)

        await generateQRCode(2000);
        setMakingRequest(false)

        setLoading(false)

        setCompletedQRCodeGen(false)
    }
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

                        <button onClick={() => setMenuOpen(!menuOpen)} className="btn btn-secondary">
                            {menuOpen ? ">" : "<"}
                        </button>
                    </div>

                    {loading || makingRequest? 
                    (<button className='btn btn-disabled' disabled>...</button>) :
                        (
                            !completedQRCodeGen ?
                                <button className="btn btn-secondary" onClick={() => (handleGenerateQRCode())}><BsQrCodeScan /></button>
                                :
                                <button className="btn btn-success" onClick={() => (handleDownload())}><BsDownload /></button>
                        )
                    }
                    <button className="btn btn-secondary" ><BsSpotify /> </button>
                </div>
            </div>

        </div>
    )
}

export default PlaylistCard