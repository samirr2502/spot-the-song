export interface authProps {
    user:user;
    setCurrentUser?:any;
    auth?:boolean;
    setAuth?:any;
}

type user ={
    userName:string,
    totalPlaylists:number,
    songsInFavorites:number,
    playLists:playList[]
}
export type playList= {
    name:string,
    totalSongs:number
}