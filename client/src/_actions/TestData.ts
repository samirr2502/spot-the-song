"use strict";

import usersData from '../_resources/test_data/user/users.json';
import playersData from '../_resources/test_data/player/players.json';
import roomsData from '../_resources/test_data/game/rooms.json';
import gamesData from '../_resources/test_data/game/games.json';
import turnsData from '../_resources/test_data/game/turns.json';
import game_songsData from '../_resources/test_data/game/game_songs.json';
import sessionsData from '../_resources/test_data/user/websocket_sessions.json';
import gameStatsData from '../_resources/test_data/player/gameStats.json';
import playlistsData from '../_resources/test_data/songs/playlists.json';
import songsData from '../_resources/test_data/songs/songs.json';

export class TestData{

    //Rooms
    findRooms= () =>{
        return roomsData;
    }
    findRoomById= (room_id: number) =>{
        return roomsData.find((room: { room_id: number; }) => room.room_id === room_id);
    }
    //Games
    findGames= () =>{
        return gamesData;
    }
    findGameByRoomId= (room_id: number) =>{
        return gamesData.find((game: { room_id: number; }) => game.room_id === room_id);
    }
    //Turns
    findTurns= () =>{
        return turnsData;
    }
    findTurnByGameId= (game_id: number) =>{
        return turnsData.find((turn: { game_id: number; }) => turn.game_id === game_id);
    }
    //Game Songs
    findGameSongs= () =>{
        return game_songsData;
    }
    findGameSongsByGameId= (game_id: number) =>{
        return game_songsData.filter((game_song: { game_id: number; }) => game_song.game_id === game_id);
    }
    //Songs
    findSongs= () =>{
        return songsData;
    }
    findSongById= (id: number) =>{
        return songsData.find((song: { song_id: number; }) => song.song_id === id);
    }
    //Users
    findUsers= () =>{
        return usersData;  
    }
    findUserById= (id: number) =>{
        return usersData.find((user: { user_id: number; }) => user.user_id === id);
    }
    //Players
    findPlayers= () =>{
        return playersData;
    }
    findPlayerById= (id: number) =>{
        return playersData.find((player: { player_id: number; }) => player.player_id === id);
    }

    //Sessions
    findSessions= () =>{
        return sessionsData;
    }
    findSessionByRoomId= (room_id: number) =>{
        return sessionsData.filter((session: { room_id: number; }) => session.room_id === room_id);
    }
    //Game Stats
    findGameStats= () =>{
        return gameStatsData;
    }
    findGameStatById= (id: number) =>{
        return gameStatsData.find((gameStat: { game_stat_id: number; }) => gameStat.game_stat_id === id);
    }
    //Playlists 
    findPlaylists= () =>{
        return playlistsData;
    }
    findPlaylistById= (id: number) =>{
        return playlistsData.find((playlist: { playlist_id: number; }) => playlist.playlist_id === id);
    }

}