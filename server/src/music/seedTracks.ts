import type { Track } from '@spot-the-song/shared'

function seedTrack(
  id: string,
  title: string,
  artist: string,
  album: string,
  year: number,
  spotifyTrackId: string,
  durationMs = 180_000,
): Track {
  return {
    id,
    title,
    artist,
    album,
    year,
    artworkUrl: null,
    spotifyUri: `spotify:track:${spotifyTrackId}`,
    spotifyUrl: `https://open.spotify.com/track/${spotifyTrackId}`,
    durationMs,
  }
}

/** Demo pool — metadata for guessing; playback uses host Spotify in Phase 8+. */
export const SEED_TRACKS: Track[] = [
  seedTrack('track_billie_jean', 'Billie Jean', 'Michael Jackson', 'Thriller', 1982, '5ChkMS8OtdzJeqyybCcKRD'),
  seedTrack('track_smells_like', 'Smells Like Teen Spirit', 'Nirvana', 'Nevermind', 1991, '4CeeEOM32j9cM7rSR5wg6o'),
  seedTrack('track_rolling_in', 'Rolling in the Deep', 'Adele', '21', 2010, '4Mu4LABrE6KeXIdT9245G1'),
  seedTrack('track_uptown_funk', 'Uptown Funk', 'Mark Ronson', 'Uptown Special', 2014, '32OlwWuMpZ6b0aN2RZOeMS'),
  seedTrack('track_blinding_lights', 'Blinding Lights', 'The Weeknd', 'After Hours', 2019, '0QHEn5EwHeCFEf2Yxc4TJ8'),
  seedTrack('track_hotel_california', 'Hotel California', 'Eagles', 'Hotel California', 1976, '40riOy7x9W7GXjyGp4pjAv'),
  seedTrack('track_shape_of_you', 'Shape of You', 'Ed Sheeran', '÷ (Divide)', 2017, '7qiZfU4dY1lWllzX7mPBI3'),
  seedTrack('track_bohemian', 'Bohemian Rhapsody', 'Queen', 'A Night at the Opera', 1975, '4u7EnebtmKWzUH418cfAUc'),
  seedTrack('track_bad_guy', 'bad guy', 'Billie Eilish', 'WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?', 2019, '2VxeLyX6546UidCuDDGY9W'),
  seedTrack('track_wonderwall', 'Wonderwall', 'Oasis', "(What's the Story) Morning Glory?", 1995, '5qqabFtlUEdC6C0Meach0w'),
  seedTrack('track_crazy_in_love', 'Crazy in Love', 'Beyoncé', 'Dangerously in Love', 2003, '5IVuqXILoxVWvWEPm82Jxr'),
  seedTrack('track_purple_rain', 'Purple Rain', 'Prince', 'Purple Rain', 1984, '54X78diSLoUDSKivH0sJkj'),
]
