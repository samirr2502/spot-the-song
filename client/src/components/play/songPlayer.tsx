import { useState, useRef, useEffect } from "react";
import { useTestDataService } from "../../TestDataContext"


interface SongPlayerProps {
    songId?: number;
}

const SongPlayer = (props: SongPlayerProps) => {
    const testDataService = useTestDataService();
    const song = testDataService.findSongById(props.songId || 0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(new Audio(song?.file_path || ''));
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Update progress as song plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress(audio.currentTime);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
    };
  }, []);
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };
   const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };
    const playPause = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div style={{ maxWidth: 400, margin: "1rem", padding: "1rem", border: "1px solid #ccc", borderRadius: 8 }}>
      <h3>{song?.song_id || "Unknown Song"}</h3>
      <audio ref={audioRef} src={song?.file_path || ""} preload="auto" />

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>{formatTime(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={progress}
          onChange={handleSeek}
          style={{ flexGrow: 1 }}
        />
        <span>{formatTime(duration)}</span>
      </div>

      {/* Play/Pause button */}
      <button onClick={playPause} style={{ marginTop: "0.5rem" }}>
        {isPlaying ? "Pause" : "Play"}
      </button>
        </div>
    );
}

export default SongPlayer