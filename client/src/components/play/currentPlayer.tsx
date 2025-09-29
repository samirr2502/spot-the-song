
import { useState } from "react";
import { useTestDataService } from "../../TestDataContext"
import SongPlayer from "./songPlayer";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SongListItem from "./songListItem";
import type { DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";

interface CurrentPlayerProps {
    turn: any;
}

const CurrentPlayer = (props: CurrentPlayerProps) => {
    const testDataService = useTestDataService();
    const player = testDataService.findPlayerById(props.turn?.current_player_id || 0);
    const game_stat = testDataService.findGameStatByGameIdPersonId(props.turn?.game_id || 0, props.turn?.current_player_id || 0);

    // const game_songs = testDataService.findGameSongsByGameId(props.turn?.game_id || 0);
    const songs = testDataService.findSongs()
        .filter(song => game_stat?.songs_ids.includes(song.id));
    console.log(songs)

    const game_song = testDataService.findGameSongById(props.turn?.game_song_id || 0);
    const song_to_match = testDataService.findSongById(game_song?.song_id || 0);
    const [attempted_songs, setAttemptedSongs] = useState([...songs, { id: song_to_match!.id, title: '____', artist: '____', year: 0 }].sort((a, b) => { return a.year > b.year ? -1 : 1 })
    );
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const getSongPos = (id: UniqueIdentifier) => attempted_songs.findIndex((song) => song.id === id);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id === over!.id) return;

        setAttemptedSongs((songs) => {
            const originalPos = getSongPos(active.id);
            const newPos = getSongPos(over!.id);

            return arrayMove(songs, originalPos, newPos);
        });
    }
    return (

        <div>
            <h2>Current Player {player!.name}</h2>
                            <SongPlayer songId={song_to_match?.id} />

            <div className="guess-group">
                {songs && songs.length > 0 ? (
                    <div>
                        <h4>Order the songs:</h4>
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
                            <div>
                                <SortableContext items={attempted_songs}

                                >
                                    {attempted_songs.map((song) => (
                                        <SongListItem key={song.id} id={song.id} title={song.title} artist={song.artist} year={song.year} />

                                    ))}
                                </SortableContext>
                            </div>
                        </DndContext>
                    </div>
                ) : (
                    <p>No songs available.</p>
                )}
                <div className="guess-group">
      
        <div>
          <h4>Guess the Title</h4>
          <ul>
            <li>option1</li>
            <li>option2</li>
            <li>option4</li>
            <li>option4</li>
          </ul>
        </div>
          <div>
          <h4> Guess the Artist </h4>
          <ul>
            <li>option1</li>
            <li>option2</li>
            <li>option4</li>
            <li>option4</li>
          </ul>
        </div>
      </div>

            </div>
        </div>
    )
}

export default CurrentPlayer