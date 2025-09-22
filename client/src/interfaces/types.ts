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

    /*Change to a context later. just for testing right now */
    makingRequest?:boolean;
    setMakingRequest?:any
}