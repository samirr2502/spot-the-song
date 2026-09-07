import type { Song } from '@spot-the-song/game-engine'

const AUDIO_BASE = 'https://www.soundhelix.com/examples/mp3'

export const SEED_SONGS: Song[] = [
  {
    id: 'seed_1',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: 'Divide',
    audioUrl: `${AUDIO_BASE}/SoundHelix-Song-1.mp3`,
  },
  {
    id: 'seed_2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    audioUrl: `${AUDIO_BASE}/SoundHelix-Song-2.mp3`,
  },
  {
    id: 'seed_3',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    audioUrl: `${AUDIO_BASE}/SoundHelix-Song-3.mp3`,
  },
  {
    id: 'seed_4',
    title: 'Bad Guy',
    artist: 'Billie Eilish',
    album: 'When We All Fall Asleep',
    audioUrl: `${AUDIO_BASE}/SoundHelix-Song-4.mp3`,
  },
  {
    id: 'seed_5',
    title: 'Uptown Funk',
    artist: 'Bruno Mars',
    album: 'Uptown Special',
    audioUrl: `${AUDIO_BASE}/SoundHelix-Song-5.mp3`,
  },
  {
    id: 'seed_6',
    title: 'Rolling in the Deep',
    artist: 'Adele',
    album: '21',
    audioUrl: `${AUDIO_BASE}/SoundHelix-Song-6.mp3`,
  },
]

export const SEED_ALBUMS = [
  { name: 'Pop Hits', songs: SEED_SONGS.slice(0, 3) },
  { name: 'Party Mix', songs: SEED_SONGS.slice(3) },
]
