export interface authProps {
    user:user;
    setCurrentUser?:any;
    auth?:boolean;
    setAuth?:any;
    makingRequest?:boolean
}

type user ={
    userName:string,
    totalPlaylists:number,
    songsInFavorites:number,
    playLists:playList[]
}
export type playList= {
    name:string;
    totalSongs:number;
    playlistLink?:string;

    /*Change to a context later. just for testing right now */
    makingRequest?:boolean;
    setMakingRequest?:any
}

export type sessions ={
    groupNumber:number
    sessions?:session[]
}
export type session = {
    id:number;
    user: string;
    active?:boolean
}
export type Player = {
    id: number;
    user: string;
    active: boolean;
}

export type PlayersProps ={
    players: Player[];
}