import type { MusicTrack } from './MusicTypes';

/** Original Toodle loops. Add a permitted file under public/audio/music and one entry here. */
export const LOCAL_TRACKS: MusicTrack[] = [
  {
    id: 'night-window',
    title: 'Night Window',
    artist: 'Toodle Originals',
    source: 'Original',
    audioUrl: '/audio/music/night-window.wav',
    duration: 14,
    energy: 'calm',
    mood: 'chill',
  },
  {
    id: 'pink-room',
    title: 'Pink Room',
    artist: 'Toodle Originals',
    source: 'Original',
    audioUrl: '/audio/music/pink-room.wav',
    duration: 14,
    energy: 'normal',
    mood: 'happy',
  },
  {
    id: 'cyan-stairs',
    title: 'Cyan Stairs',
    artist: 'Toodle Originals',
    source: 'Original',
    audioUrl: '/audio/music/cyan-stairs.wav',
    duration: 14,
    energy: 'energetic',
    mood: 'energetic',
  },
  {
    id: 'soft-exit',
    title: 'Soft Exit',
    artist: 'Toodle Originals',
    source: 'Original',
    audioUrl: '/audio/music/soft-exit.wav',
    duration: 14,
    energy: 'calm',
    mood: 'sad',
  },
];
